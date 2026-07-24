import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  adminHasPermission,
  authenticateAdminRequest,
  recordAdminAudit,
} from '../_shared/admin-auth.ts';
import {
  buildDailyAlmanac,
  localDateParts,
} from '../_shared/daily-almanac.ts';
import { freeDailySubject, renderFreeDailyEmail } from '../_shared/free-daily-email.ts';
import {
  buildMonthlyBaziForecast,
  monthlyBaziSubject,
  renderMonthlyBaziEmail,
} from '../_shared/monthly-bazi.ts';
import { isAllowedOrigin as isSharedAllowedOrigin } from '../_shared/security.ts';

const DEFAULT_CORS_ORIGINS = [
  'https://tengyunzi.com',
  'https://www.tengyunzi.com',
];
const LOCAL_DEVELOPMENT_ORIGINS = ['http://127.0.0.1:8765', 'http://localhost:8765'];
const ALLOWED_STATUS = new Set(['subscribed', 'unsubscribed', 'bounced', 'complained']);
const SELECT_COLUMNS = [
  'id',
  'email',
  'name',
  'status',
  'source',
  'language',
  'page_path',
  'landing_url',
  'referrer',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'tags',
  'metadata',
  'consent_at',
  'subscribed_at',
  'unsubscribed_at',
  'last_seen_at',
  'created_at',
  'updated_at',
].join(',');

type JsonRecord = Record<string, unknown>;

function asString(value: unknown, max = 240): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function resolveAllowedOrigins(): string[] {
  const fromEnv = asString(Deno.env.get('ADMIN_DASHBOARD_ALLOWED_ORIGINS'), 1000)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set([
    ...(fromEnv.length ? fromEnv : DEFAULT_CORS_ORIGINS),
    ...LOCAL_DEVELOPMENT_ORIGINS,
  ]));
}

function corsHeaders(req: Request): Record<string, string> {
  const allowedOrigins = resolveAllowedOrigins();
  const reqOrigin = asString(req.headers.get('origin'));
  const allowOrigin = reqOrigin && (isSharedAllowedOrigin(reqOrigin, allowedOrigins) || reqOrigin === 'null')
    ? reqOrigin
    : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, apikey, x-admin-token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(req),
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function readInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

function normalizeStatus(value: unknown): string {
  const status = asString(value, 32).toLowerCase();
  return ALLOWED_STATUS.has(status) ? status : '';
}

function sanitizeFilter(value: unknown, max = 80): string {
  return asString(value, max).replace(/[^\w./:@?&=%#-]/g, '').slice(0, max);
}

function topCounts(rows: JsonRecord[], field: string, max = 8) {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const key = asString(row[field], 120) || '(empty)';
    map[key] = Number(map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, max);
}

function applyFilters(query: any, body: JsonRecord) {
  const status = asString(body.status, 32).toLowerCase();
  const source = sanitizeFilter(body.source, 80);
  const language = sanitizeFilter(body.language, 24);
  const utmSource = sanitizeFilter(body.utm_source, 120);
  const search = asString(body.search, 120).toLowerCase();
  const days = readInt(body.days, 0, 0, 3650);

  if (status && status !== 'all' && ALLOWED_STATUS.has(status)) {
    query = query.eq('status', status);
  }
  if (source && source !== 'all') query = query.eq('source', source);
  if (language && language !== 'all') query = query.eq('language', language);
  if (utmSource && utmSource !== 'all') query = query.eq('utm_source', utmSource);
  if (search) query = query.ilike('email_normalized', `%${search.replace(/[%_]/g, '')}%`);
  if (days > 0) {
    query = query.gte('subscribed_at', new Date(Date.now() - days * 86400000).toISOString());
  }

  return query;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function unsubscribeToken(email: string, subscriberId: string, secret: string, scope = ''): Promise<string> {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({
    email: email.toLowerCase(),
    subscriber_id: subscriberId,
    ...(scope ? { scope } : {}),
  })));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

function newsletterHtml(subject: string, preheader: string, bodyText: string, unsubscribeUrl: string): string {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 18px;line-height:1.75;color:#17324d;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!doctype html><html><body style="margin:0;background:#edf4f9;font-family:Arial,'Noto Sans',sans-serif;color:#17324d;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf4f9;"><tr><td align="center" style="padding:28px 14px 40px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:660px;background:#ffffff;border:1px solid #c8d9e7;border-top:5px solid #1f7ab8;">
        <tr><td style="padding:27px 32px 22px;border-bottom:1px solid #dfe9f1;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td style="font-family:Georgia,serif;font-size:21px;font-weight:700;color:#102e49;">Tengyunzi</td>
            <td align="right" style="font-size:11px;font-weight:700;color:#2e6d9e;text-transform:uppercase;">Tengyunzi update</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:34px 32px 12px;">
          <div style="font-size:12px;font-weight:700;color:#2e6d9e;text-transform:uppercase;margin-bottom:13px;">BaZi for self-knowledge</div>
          <h1 style="font-family:Georgia,'Noto Serif',serif;font-size:34px;line-height:1.18;margin:0;color:#102e49;">${escapeHtml(subject)}</h1>
        </td></tr>
        <tr><td style="padding:14px 32px 8px;font-size:16px;line-height:1.75;">${paragraphs}</td></tr>
        <tr><td style="padding:10px 32px 34px;">
          <a href="https://www.tengyunzi.com/tengyunzi-calculator.html#top" style="display:inline-block;background:#1f7ab8;color:#ffffff;text-decoration:none;padding:13px 19px;font-size:14px;font-weight:700;border-radius:6px;">Explore your BaZi chart</a>
          <p style="margin:28px 0 0;line-height:1.7;color:#526b82;">Until next time,<br><strong style="color:#17324d;">Tengyunzi</strong></p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f7fafc;border-top:1px solid #dfe9f1;font-size:12px;line-height:1.65;color:#6a8094;">
          Tengyunzi emails are educational and reflective. They do not promise outcomes or replace professional advice.<br><br>
          Shenyang Haoxue Culture Media Co., Ltd. &nbsp;|&nbsp; <a style="color:#2e6d9e;" href="https://www.tengyunzi.com/">tengyunzi.com</a><br>
          You received this because you subscribed to Tengyunzi emails. <a style="color:#2e6d9e;" href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a>.
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

async function sendResendBatch(messages: JsonRecord[], apiKey: string): Promise<JsonRecord> {
  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json().catch(() => ({})) as JsonRecord;
  if (!response.ok) throw new Error(asString(data.message || data.error, 500) || `resend_failed_${response.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders(req) });
  }

  try {
    const supabaseUrl = asString(Deno.env.get('SUPABASE_URL'), 500);
    const serviceRoleKey = asString(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), 2000);
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { error: 'missing_supabase_env' }, 500);
    }

    const body = await req.json().catch(() => ({})) as JsonRecord;
    const action = asString(body.action, 40) || 'overview';
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const emailProviderConfigured = Boolean(
      asString(Deno.env.get('RESEND_API_KEY'), 4000)
      && asString(Deno.env.get('NEWSLETTER_FROM_EMAIL'), 320),
    );
    const adminSession = await authenticateAdminRequest(req, supabase);
    if (!adminSession) return json(req, { error: 'unauthorized' }, 401);
    const sendActions = new Set(['create_campaign', 'send_test', 'send_campaign', 'send_commercial_review']);
    const requiredPermission = sendActions.has(action) ? 'newsletter_send' : 'newsletter_read';
    if (!adminHasPermission(adminSession, requiredPermission)) {
      return json(req, { error: 'forbidden' }, 403);
    }

    if (action === 'overview') {
      const days = readInt(body.days, 30, 1, 3650);
      const sinceIso = new Date(Date.now() - days * 86400000).toISOString();

      const { count: totalCount, error: totalError } = await supabase
        .from('newsletter_subscribers')
        .select('id', { count: 'exact', head: true });
      if (totalError) return json(req, { error: 'total_count_failed', details: totalError.message }, 500);

      const { count: activeCount, error: activeError } = await supabase
        .from('newsletter_subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'subscribed');
      if (activeError) return json(req, { error: 'active_count_failed', details: activeError.message }, 500);

      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('status,source,language,utm_source,utm_medium,utm_campaign,page_path,subscribed_at,created_at')
        .gte('subscribed_at', sinceIso)
        .order('subscribed_at', { ascending: false })
        .limit(10000);
      if (error) return json(req, { error: 'overview_query_failed', details: error.message }, 500);

      const rows = Array.isArray(data) ? data as JsonRecord[] : [];
      return json(req, {
        ok: true,
        days,
        summary: {
          total: Number(totalCount || 0),
          active: Number(activeCount || 0),
          recent: rows.length,
          unsubscribed_recent: rows.filter((row) => row.status === 'unsubscribed').length,
        },
        status: topCounts(rows, 'status', 8),
        sources: topCounts(rows, 'source', 10),
        languages: topCounts(rows, 'language', 8),
        utm_sources: topCounts(rows, 'utm_source', 10),
        pages: topCounts(rows, 'page_path', 10),
      });
    }

    if (action === 'list' || action === 'export') {
      const limit = readInt(body.limit, action === 'export' ? 5000 : 80, 1, action === 'export' ? 5000 : 300);
      const offset = readInt(body.offset, 0, 0, 100000);
      let query = supabase
        .from('newsletter_subscribers')
        .select(SELECT_COLUMNS, { count: 'exact' });
      query = applyFilters(query, body)
        .order('subscribed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) return json(req, { error: `${action}_failed`, details: error.message }, 500);
      return json(req, {
        ok: true,
        rows: data || [],
        count: Number(count || 0),
        offset,
        limit,
      });
    }

    if (action === 'update_status') {
      const id = asString(body.id, 80);
      const email = asString(body.email, 320).toLowerCase();
      const status = normalizeStatus(body.status);
      if (!status) return json(req, { error: 'invalid_status' }, 400);
      if (!id && !email) return json(req, { error: 'missing_subscriber_identifier' }, 400);

      const now = new Date().toISOString();
      const payload: JsonRecord = {
        status,
        updated_at: now,
      };
      if (status === 'unsubscribed') payload.unsubscribed_at = now;
      if (status === 'subscribed') {
        payload.unsubscribed_at = null;
        payload.last_seen_at = now;
      }

      let query = supabase
        .from('newsletter_subscribers')
        .update(payload)
        .select('id,email,status,updated_at,unsubscribed_at')
        .limit(1);
      query = id ? query.eq('id', id) : query.eq('email_normalized', email);

      const { data, error } = await query;
      if (error) return json(req, { error: 'status_update_failed', details: error.message }, 500);
      return json(req, { ok: true, subscriber: Array.isArray(data) ? data[0] || null : null });
    }

    if (action === 'campaigns') {
      const limit = readInt(body.limit, 40, 1, 100);
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .select('id,subject,preheader,body_text,status,recipients_total,recipients_sent,recipients_failed,provider,error_message,started_at,completed_at,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return json(req, { error: 'campaign_list_failed', details: error.message }, 500);
      return json(req, {
        ok: true,
        rows: data || [],
        provider: 'resend',
        provider_configured: emailProviderConfigured,
      });
    }

    if (action === 'create_campaign') {
      const subject = asString(body.subject, 180);
      const preheader = asString(body.preheader, 240);
      const bodyText = asString(body.body_text, 30000);
      if (subject.length < 3 || bodyText.length < 20) {
        return json(req, { error: 'campaign_subject_and_body_required' }, 400);
      }
      const { data: campaign, error } = await supabase
        .from('newsletter_campaigns')
        .insert({
          subject,
          preheader,
          body_text: bodyText,
          status: 'draft',
          created_by: adminSession.legacy ? null : adminSession.id,
        })
        .select('id,subject,preheader,body_text,status,created_at')
        .single();
      if (error || !campaign) return json(req, { error: 'campaign_create_failed', details: error?.message }, 500);
      await recordAdminAudit(supabase, req, adminSession, 'newsletter_campaign_created', {
        target_type: 'newsletter_campaign',
        target_id: campaign.id,
        metadata: { subject },
      });
      return json(req, { ok: true, campaign });
    }

    if (action === 'send_test') {
      const resendKey = asString(Deno.env.get('RESEND_API_KEY'), 4000);
      const from = asString(Deno.env.get('NEWSLETTER_FROM_EMAIL'), 320);
      if (!resendKey || !from) return json(req, { error: 'newsletter_email_provider_not_configured' }, 503);
      const email = asString(body.email || body.test_email, 320).toLowerCase();
      const subject = asString(body.subject, 180);
      const preheader = asString(body.preheader, 240);
      const bodyText = asString(body.body_text, 30000);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || subject.length < 3 || bodyText.length < 20) {
        return json(req, { error: 'valid_test_email_subject_and_body_required' }, 400);
      }
      const replyTo = asString(Deno.env.get('NEWSLETTER_REPLY_TO'), 320);
      const message: JsonRecord = {
        from,
        to: [email],
        subject: `[TEST] ${subject}`,
        html: newsletterHtml(subject, preheader, bodyText, 'https://www.tengyunzi.com/tengyunzi-newsletter.html'),
        text: `${bodyText}\n\nTengyunzi\nBaZi for self-knowledge`,
      };
      if (replyTo) message.reply_to = replyTo;
      await sendResendBatch([message], resendKey);
      await recordAdminAudit(supabase, req, adminSession, 'newsletter_test_sent', {
        target_type: 'email',
        target_id: email,
        metadata: { subject },
      });
      return json(req, { ok: true });
    }

    if (action === 'send_commercial_review') {
      const resendKey = asString(Deno.env.get('RESEND_API_KEY'), 4000);
      const newsletterFrom = asString(Deno.env.get('NEWSLETTER_FROM_EMAIL'), 320);
      const dailyFrom = asString(Deno.env.get('DAILY_ALMANAC_FROM_EMAIL') || newsletterFrom, 320);
      const replyTo = asString(Deno.env.get('NEWSLETTER_REPLY_TO'), 320);
      const recipient = asString(body.email, 320).toLowerCase();
      if (!resendKey || !newsletterFrom || !dailyFrom) {
        return json(req, { error: 'newsletter_email_provider_not_configured' }, 503);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipient)) {
        return json(req, { error: 'valid_review_email_required' }, 400);
      }

      const nowIso = new Date().toISOString();
      const { data: subscriber, error: subscriberError } = await supabase
        .from('newsletter_subscribers')
        .upsert({
          email: recipient,
          email_normalized: recipient,
          status: 'subscribed',
          source: 'admin-commercial-review',
          language: 'en',
          tags: ['free-daily-almanac', 'commercial-review'],
          metadata: { commercial_review: true, birth_date: '1988-08-21', birth_hour: 'unknown' },
          free_daily_enabled: true,
          timezone: 'Asia/Taipei',
          delivery_hour: 7,
          consent_at: nowIso,
          subscribed_at: nowIso,
          unsubscribed_at: null,
          last_seen_at: nowIso,
          updated_at: nowIso,
        }, { onConflict: 'email_normalized' })
        .select('id')
        .single();
      if (subscriberError || !subscriber) {
        return json(req, { error: 'review_subscriber_save_failed', details: subscriberError?.message }, 500);
      }

      const unsubscribeSecret = asString(Deno.env.get('NEWSLETTER_UNSUBSCRIBE_SECRET'), 5000) || serviceRoleKey;
      const token = await unsubscribeToken(recipient, subscriber.id, unsubscribeSecret, 'free_daily');
      const unsubscribeUrl = `https://www.tengyunzi.com/tengyunzi-newsletter.html?unsubscribe=${encodeURIComponent(token)}`;
      const local = localDateParts(new Date(), 'Asia/Taipei');
      const almanac = buildDailyAlmanac(new Date(Date.UTC(local.year, local.month - 1, local.day, 12)), 'en');
      const profile = {
        birth_year: 1988,
        birth_month: 8,
        birth_day: 21,
        birth_hour: -1,
        gender: 'unspecified',
        language: 'en',
      };
      const forecast = buildMonthlyBaziForecast(profile, new Date(Date.UTC(local.year, local.month - 1, local.day, 12)));
      const freeSubject = freeDailySubject(almanac);
      const paidSubject = monthlyBaziSubject(forecast);
      const manageUrl = 'https://www.tengyunzi.com/tengyunzi-newsletter.html#monthly';
      const freeText = `${freeSubject}\n\n${almanac.theme}\n\nLunar date: ${almanac.lunar_date}\nDate pillars: ${almanac.year_ganzhi} / ${almanac.month_ganzhi} / ${almanac.day_ganzhi}\nSolar term: ${almanac.solar_term || 'None today'}\nDay clash: ${almanac.clash}${almanac.sha ? ` / ${almanac.sha}` : ''}\nWealth direction: ${almanac.wealth_direction}\nJoy direction: ${almanac.joy_direction}\n\nSupportive activities: ${almanac.yi.slice(0, 4).join(', ')}\nKeep measured: ${almanac.ji.slice(0, 4).join(', ')}\n\nStop free daily emails: ${unsubscribeUrl}`;
      const paidText = `${paidSubject}\n\n${forecast.headline}\n${forecast.strategy}\n\nMonth score: ${forecast.score}/100\nPosture: ${forecast.posture}\nPace: ${forecast.pace}\n\nDay Master: ${forecast.day_master} | ${forecast.day_master_element}\nSupportive/useful elements: ${forecast.supportive_elements.join(', ')}\nHandle carefully: ${forecast.caution_elements.join(', ')}\n${forecast.confidence_note}\n\n${forecast.interaction_summary}\n\n${forecast.areas.map((area) => `${area.label} | ${area.signal} ${area.score}/100\n${area.headline}\n${area.guidance}`).join('\n\n')}\n\n${forecast.disclaimer}\n\nManage membership: ${manageUrl}`;
      const messages: JsonRecord[] = [
        {
          from: dailyFrom,
          to: [recipient],
          subject: freeSubject,
          html: renderFreeDailyEmail({ almanac, unsubscribeUrl, supportEmail: replyTo || 'hello@tengyunzi.com' }),
          text: freeText,
          headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
        },
        {
          from: newsletterFrom,
          to: [recipient],
          subject: paidSubject,
          html: renderMonthlyBaziEmail({ forecast, manageUrl, supportEmail: replyTo || 'hello@tengyunzi.com' }),
          text: paidText,
        },
      ];
      if (replyTo) messages.forEach((message) => { message.reply_to = replyTo; });

      const provider = await sendResendBatch(messages, resendKey);
      await recordAdminAudit(supabase, req, adminSession, 'commercial_email_review_sent', {
        target_type: 'email',
        target_id: recipient,
        metadata: {
          messages: 2,
          free_subject: freeSubject,
          paid_subject: paidSubject,
          birth_date: '1988-08-21',
          birth_hour: 'unknown',
        },
      });
      return json(req, { ok: true, recipient, free_subject: freeSubject, paid_subject: paidSubject, provider, forecast });
    }

    if (action === 'send_campaign') {
      const resendKey = asString(Deno.env.get('RESEND_API_KEY'), 4000);
      const from = asString(Deno.env.get('NEWSLETTER_FROM_EMAIL'), 320);
      if (!resendKey || !from) return json(req, { error: 'newsletter_email_provider_not_configured' }, 503);
      const campaignId = asString(body.campaign_id, 80);
      if (!campaignId) return json(req, { error: 'campaign_id_required' }, 400);
      const { data: campaign, error: campaignError } = await supabase
        .from('newsletter_campaigns')
        .select('id,subject,preheader,body_text,status,recipients_total,recipients_sent,recipients_failed')
        .eq('id', campaignId)
        .maybeSingle();
      if (campaignError || !campaign) return json(req, { error: 'campaign_not_found' }, 404);
      if (campaign.status === 'sent') return json(req, { ok: true, done: true, campaign });
      if (campaign.status === 'cancelled') return json(req, { error: 'campaign_cancelled' }, 409);

      const { count: deliveryCount, error: deliveryCountError } = await supabase
        .from('newsletter_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);
      if (deliveryCountError) return json(req, { error: 'campaign_delivery_count_failed', details: deliveryCountError.message }, 500);

      if (Number(deliveryCount || 0) === 0) {
        const { data: subscribers, error: subscriberError } = await supabase
          .from('newsletter_subscribers')
          .select('id,email')
          .eq('status', 'subscribed')
          .order('subscribed_at', { ascending: true })
          .limit(5000);
        if (subscriberError) return json(req, { error: 'campaign_audience_failed', details: subscriberError.message }, 500);
        const audience = Array.isArray(subscribers) ? subscribers : [];
        for (let offset = 0; offset < audience.length; offset += 500) {
          const rows = audience.slice(offset, offset + 500).map((subscriber) => ({
            campaign_id: campaignId,
            subscriber_id: subscriber.id,
            email: asString(subscriber.email, 320).toLowerCase(),
            status: 'queued',
          }));
          if (!rows.length) continue;
          const { error: insertError } = await supabase.from('newsletter_deliveries').insert(rows);
          if (insertError) return json(req, { error: 'campaign_delivery_create_failed', details: insertError.message }, 500);
        }
        await supabase.from('newsletter_campaigns').update({
          status: audience.length ? 'sending' : 'sent',
          recipients_total: audience.length,
          provider: 'resend',
          started_at: new Date().toISOString(),
          completed_at: audience.length ? null : new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        }).eq('id', campaignId);
        if (!audience.length) return json(req, { ok: true, done: true, sent: 0, remaining: 0 });
      }

      const batchSize = readInt(body.batch_size, 100, 1, 100);
      const { data: queuedRows, error: queuedError } = await supabase
        .from('newsletter_deliveries')
        .select('id,subscriber_id,email')
        .eq('campaign_id', campaignId)
        .eq('status', 'queued')
        .order('id', { ascending: true })
        .limit(batchSize);
      if (queuedError) return json(req, { error: 'campaign_queue_failed', details: queuedError.message }, 500);
      const queued = Array.isArray(queuedRows) ? queuedRows : [];
      if (!queued.length) {
        await supabase.from('newsletter_campaigns').update({
          status: 'sent',
          completed_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        }).eq('id', campaignId);
        return json(req, { ok: true, done: true, sent: Number(campaign.recipients_sent || 0), remaining: 0 });
      }

      const unsubscribeSecret = asString(Deno.env.get('NEWSLETTER_UNSUBSCRIBE_SECRET'), 4000) || serviceRoleKey;
      const siteOrigin = (asString(Deno.env.get('NEWSLETTER_SITE_ORIGIN'), 320) || 'https://www.tengyunzi.com').replace(/\/+$/, '');
      const replyTo = asString(Deno.env.get('NEWSLETTER_REPLY_TO'), 320);
      const messages: JsonRecord[] = [];
      for (const delivery of queued) {
        const token = await unsubscribeToken(delivery.email, delivery.subscriber_id, unsubscribeSecret);
        const unsubscribeUrl = `${siteOrigin}/tengyunzi-newsletter.html?unsubscribe=${encodeURIComponent(token)}`;
        const message: JsonRecord = {
          from,
          to: [delivery.email],
          subject: campaign.subject,
          html: newsletterHtml(campaign.subject, campaign.preheader || '', campaign.body_text, unsubscribeUrl),
          text: `${campaign.body_text}\n\nUnsubscribe: ${unsubscribeUrl}`,
          headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
        };
        if (replyTo) message.reply_to = replyTo;
        messages.push(message);
      }

      let resendResult: JsonRecord = {};
      try {
        resendResult = await sendResendBatch(messages, resendKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await supabase.from('newsletter_campaigns').update({
          status: 'failed',
          error_message: message.slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq('id', campaignId);
        return json(req, { error: 'newsletter_send_failed', details: message }, 502);
      }

      const sentAt = new Date().toISOString();
      const providerRows = Array.isArray(resendResult.data) ? resendResult.data as JsonRecord[] : [];
      const deliveryUpdates = queued.map((delivery, index) => supabase
        .from('newsletter_deliveries')
        .update({
          status: 'sent',
          provider_message_id: asString(providerRows[index]?.id, 240) || null,
          sent_at: sentAt,
          last_event_at: sentAt,
          updated_at: sentAt,
        })
        .eq('id', delivery.id));
      const updateResults = await Promise.all(deliveryUpdates);
      const deliveryUpdateError = updateResults.find((result) => result.error)?.error;
      if (deliveryUpdateError) {
        await supabase.from('newsletter_campaigns').update({
          status: 'failed',
          error_message: deliveryUpdateError.message.slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq('id', campaignId);
        return json(req, { error: 'newsletter_delivery_tracking_failed', details: deliveryUpdateError.message }, 500);
      }
      const { count: remainingCount } = await supabase
        .from('newsletter_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('status', 'queued');
      const { count: sentCount } = await supabase
        .from('newsletter_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('status', 'sent');
      const done = Number(remainingCount || 0) === 0;
      await supabase.from('newsletter_campaigns').update({
        status: done ? 'sent' : 'sending',
        recipients_sent: Number(sentCount || 0),
        completed_at: done ? new Date().toISOString() : null,
        error_message: null,
        updated_at: new Date().toISOString(),
      }).eq('id', campaignId);
      await recordAdminAudit(supabase, req, adminSession, 'newsletter_campaign_batch_sent', {
        target_type: 'newsletter_campaign',
        target_id: campaignId,
        metadata: { batch_sent: queued.length, sent_total: Number(sentCount || 0), remaining: Number(remainingCount || 0) },
      });
      return json(req, {
        ok: true,
        done,
        batch_sent: queued.length,
        sent: Number(sentCount || 0),
        remaining: Number(remainingCount || 0),
      });
    }

    return json(req, { error: 'unknown_action' }, 400);
  } catch (err) {
    return json(req, { error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
