import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildDailyAlmanac, localDateParts } from '../_shared/daily-almanac.ts';
import { freeDailySubject, renderFreeDailyEmail } from '../_shared/free-daily-email.ts';

type JsonRecord = Record<string, any>;

function asString(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

async function unsubscribeToken(email: string, subscriberId: string, secret: string): Promise<string> {
  const payloadJson = JSON.stringify({ email, subscriber_id: subscriberId, scope: 'free_daily' });
  const bytes = new TextEncoder().encode(payloadJson);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  let signatureBinary = '';
  for (const byte of new Uint8Array(signature)) signatureBinary += String.fromCharCode(byte);
  return `${payload}.${btoa(signatureBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`;
}

async function sendBatch(messages: JsonRecord[], apiKey: string): Promise<JsonRecord[]> {
  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(asString(data.message || data.error, 500) || `resend_failed_${response.status}`);
  return Array.isArray(data?.data) ? data.data : [];
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = asString(Deno.env.get('SUPABASE_URL'), 500);
  const serviceRoleKey = asString(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), 5000);
  const requestKey = asString(req.headers.get('apikey'), 5000);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'missing_supabase_env' }, 500);
  if (!requestKey) return json({ error: 'unauthorized_scheduler' }, 401);

  const privileged = requestKey === serviceRoleKey;
  const body = await req.json().catch(() => ({})) as JsonRecord;
  const dryRun = privileged && body.dry_run === true;
  const force = privileged && body.force === true;
  const onlyEmail = privileged ? asString(body.email, 320).toLowerCase() : '';
  const maxSubscribers = privileged ? Math.min(Math.max(Number(body.limit) || 1000, 1), 3000) : 1000;
  const resendKey = asString(Deno.env.get('RESEND_API_KEY'), 5000);
  const fromEmail = asString(Deno.env.get('DAILY_ALMANAC_FROM_EMAIL') || Deno.env.get('NEWSLETTER_FROM_EMAIL'), 320);
  const replyTo = asString(Deno.env.get('NEWSLETTER_REPLY_TO'), 320) || 'hello@tengyunzi.com';
  const now = body.now && privileged ? new Date(asString(body.now, 80)) : new Date();
  if (Number.isNaN(now.getTime())) return json({ error: 'invalid_now' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let subscriberQuery = admin
    .from('newsletter_subscribers')
    .select('id,email,email_normalized,status,language,timezone,delivery_hour,free_daily_enabled')
    .eq('status', 'subscribed')
    .eq('free_daily_enabled', true)
    .limit(maxSubscribers);
  if (onlyEmail) subscriberQuery = subscriberQuery.eq('email_normalized', onlyEmail);
  const { data: subscriberRows, error: subscriberError } = await subscriberQuery;
  if (subscriberError) return json({ error: 'free_daily_subscribers_load_failed', details: subscriberError.message }, 500);
  const subscribers = Array.isArray(subscriberRows) ? subscriberRows : [];

  const due = subscribers.flatMap((subscriber) => {
    let local;
    try {
      local = localDateParts(now, subscriber.timezone || 'Asia/Taipei');
    } catch {
      return [];
    }
    if (!force && local.hour !== Number(subscriber.delivery_hour ?? 7)) return [];
    return [{ subscriber, local }];
  });

  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      subscribers: subscribers.length,
      due: due.length,
      previews: due.slice(0, 10).map(({ subscriber, local }) => {
        const almanac = buildDailyAlmanac(new Date(Date.UTC(local.year, local.month - 1, local.day, 12)), 'en');
        return { email: subscriber.email, local_date: local.date, timezone: subscriber.timezone, subject: freeDailySubject(almanac), almanac };
      }),
    });
  }

  if (!due.length) return json({ ok: true, subscribers: subscribers.length, due: 0, sent: 0, failed: 0 });
  if (!resendKey || !fromEmail) return json({ error: 'free_daily_email_provider_not_configured', due: due.length }, 503);

  const nowIso = new Date().toISOString();
  const { error: queueError } = await admin.from('free_daily_almanac_deliveries').upsert(
    due.map(({ subscriber, local }) => ({
      subscriber_id: subscriber.id,
      email: subscriber.email,
      local_date: local.date,
      timezone: subscriber.timezone || 'Asia/Taipei',
      language: subscriber.language || 'en',
      status: 'queued',
      updated_at: nowIso,
    })),
    { onConflict: 'subscriber_id,local_date', ignoreDuplicates: true },
  );
  if (queueError) return json({ error: 'free_daily_queue_failed', details: queueError.message }, 500);

  const dueByKey = new Map(due.map((item) => [`${item.subscriber.id}|${item.local.date}`, item]));
  const subscriberIds = [...new Set(due.map((item) => item.subscriber.id))];
  const localDates = [...new Set(due.map((item) => item.local.date))];
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await admin.from('free_daily_almanac_deliveries').update({
    status: 'failed',
    error_message: 'Recovered an interrupted delivery attempt.',
    updated_at: nowIso,
  }).in('subscriber_id', subscriberIds).in('local_date', localDates).eq('status', 'sending').lt('last_attempt_at', staleBefore);

  const { data: candidates, error: candidateError } = await admin
    .from('free_daily_almanac_deliveries')
    .select('id,subscriber_id,email,local_date,status,attempt_count')
    .in('subscriber_id', subscriberIds)
    .in('local_date', localDates)
    .in('status', ['queued', 'failed'])
    .lt('attempt_count', 3);
  if (candidateError) return json({ error: 'free_daily_candidates_failed', details: candidateError.message }, 500);

  const claimResults = await Promise.all((candidates || [])
    .filter((row) => dueByKey.has(`${row.subscriber_id}|${row.local_date}`))
    .map((row) => {
      const attemptCount = Number(row.attempt_count || 0);
      return admin.from('free_daily_almanac_deliveries').update({
        status: 'sending',
        attempt_count: attemptCount + 1,
        last_attempt_at: nowIso,
        error_message: null,
        updated_at: nowIso,
      }).eq('id', row.id).eq('attempt_count', attemptCount).in('status', ['queued', 'failed'])
        .select('id,subscriber_id,email,local_date').maybeSingle();
    }));
  const claimed = claimResults.flatMap((result) => result.data ? [result.data] : []);
  const unsubscribeSecret = asString(Deno.env.get('NEWSLETTER_UNSUBSCRIBE_SECRET'), 5000) || serviceRoleKey;
  const siteOrigin = 'https://www.tengyunzi.com';

  let sent = 0;
  let failed = 0;
  for (const batch of chunk(claimed, 100)) {
    const prepared: Array<{ delivery: JsonRecord; subscriber: JsonRecord; almanac: JsonRecord; subject: string; message: JsonRecord }> = [];
    for (const delivery of batch) {
      const item = dueByKey.get(`${delivery.subscriber_id}|${delivery.local_date}`);
      if (!item) continue;
      const { subscriber, local } = item;
      const almanac = buildDailyAlmanac(new Date(Date.UTC(local.year, local.month - 1, local.day, 12)), 'en');
      const subject = freeDailySubject(almanac);
      const token = await unsubscribeToken(subscriber.email_normalized, subscriber.id, unsubscribeSecret);
      const unsubscribeUrl = `${siteOrigin}/tengyunzi-newsletter.html?unsubscribe=${encodeURIComponent(token)}`;
      const text = `${subject}\n\n${almanac.theme}\n\nLunar date: ${almanac.lunar_date}\nDate pillars: ${almanac.year_ganzhi} / ${almanac.month_ganzhi} / ${almanac.day_ganzhi}\nSolar term: ${almanac.solar_term || 'None today'}\nDay clash: ${almanac.clash}${almanac.sha ? ` / ${almanac.sha}` : ''}\nWealth direction: ${almanac.wealth_direction}\nJoy direction: ${almanac.joy_direction}\n\nSupportive activities: ${almanac.yi.slice(0, 4).join(', ')}\nKeep measured: ${almanac.ji.slice(0, 4).join(', ')}\n\nThis is an educational planning prompt, not a guarantee or professional advice.\n\nStop free daily emails: ${unsubscribeUrl}`;
      const message: JsonRecord = {
        from: fromEmail,
        to: [subscriber.email],
        subject,
        html: renderFreeDailyEmail({ almanac, unsubscribeUrl, supportEmail: replyTo }),
        text,
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
      };
      if (replyTo) message.reply_to = replyTo;
      prepared.push({ delivery, subscriber, almanac, subject, message });
    }

    try {
      const providerRows = await sendBatch(prepared.map((item) => item.message), resendKey);
      const sentAt = new Date().toISOString();
      await Promise.all(prepared.map(async (item, index) => {
        await admin.from('free_daily_almanac_deliveries').update({
          status: 'sent',
          subject: item.subject,
          provider_message_id: asString(providerRows[index]?.id, 240) || null,
          almanac_data: item.almanac,
          sent_at: sentAt,
          last_event_at: sentAt,
          updated_at: sentAt,
        }).eq('id', item.delivery.id);
        await admin.from('newsletter_subscribers').update({
          last_free_daily_date: item.delivery.local_date,
          updated_at: sentAt,
        }).eq('id', item.subscriber.id);
      }));
      sent += prepared.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failedAt = new Date().toISOString();
      await admin.from('free_daily_almanac_deliveries').update({
        status: 'failed', error_message: message.slice(0, 1000), last_event_at: failedAt, updated_at: failedAt,
      }).in('id', prepared.map((item) => item.delivery.id));
      failed += prepared.length;
    }
  }

  return json({
    ok: failed === 0,
    subscribers: subscribers.length,
    due: due.length,
    queued: claimed.length,
    sent,
    failed,
    skipped: Math.max(0, due.length - claimed.length),
  }, failed ? 207 : 200);
});
