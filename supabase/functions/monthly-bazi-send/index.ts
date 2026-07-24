import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { localDateParts } from '../_shared/daily-almanac.ts';
import {
  buildMonthlyBaziForecast,
  monthlyBaziSubject,
  renderMonthlyBaziEmail,
  type MonthlyBaziForecast,
} from '../_shared/monthly-bazi.ts';

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

function forecastText(forecast: MonthlyBaziForecast, manageUrl: string, supportEmail: string): string {
  const areas = forecast.areas.map((area) => (
    `${area.label} | ${area.signal} ${area.score}/100\n${area.headline}\n${area.guidance}`
  )).join('\n\n');
  const interactions = forecast.interactions.length
    ? forecast.interactions.slice(0, 6).map((item) => `${item.kind}: ${item.source} ${item.branches} ${item.target}. ${item.guidance}`).join('\n')
    : 'No major Clash, Harm, Break, or Punishment is dominant in the tested branch relationships.';
  return `${monthlyBaziSubject(forecast)}\n\n${forecast.headline}\n${forecast.strategy}\n\nMonth score: ${forecast.score}/100\nPosture: ${forecast.posture}\nPace: ${forecast.pace}\n\nCHART BASIS\nDay Master: ${forecast.day_master} | ${forecast.day_master_element}\nChart tendency: ${forecast.chart_tendency}\nSupportive/useful elements: ${forecast.supportive_elements.join(', ')}\nElements to handle carefully: ${forecast.caution_elements.join(', ')}\n${forecast.confidence_note}\n\nANNUAL AND MONTHLY INTERACTIONS\nAnnual pillar: ${forecast.year_pillar}\nMonthly pillar: ${forecast.month_pillar}\n${forecast.interaction_summary}\n${interactions}\n\nFOUR LIFE AREAS\n${areas}\n\n${forecast.disclaimer}\n\nManage forecast: ${manageUrl}\nSupport: ${supportEmail}`;
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
  const maxProfiles = privileged ? Math.min(Math.max(Number(body.limit) || 800, 1), 2500) : 800;
  const resendKey = asString(Deno.env.get('RESEND_API_KEY'), 5000);
  const fromEmail = asString(Deno.env.get('NEWSLETTER_FROM_EMAIL') || Deno.env.get('DAILY_ALMANAC_FROM_EMAIL'), 320);
  const replyTo = asString(Deno.env.get('NEWSLETTER_REPLY_TO'), 320) || 'hello@tengyunzi.com';
  const now = body.now && privileged ? new Date(asString(body.now, 80)) : new Date();
  if (Number.isNaN(now.getTime())) return json({ error: 'invalid_now' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let profileQuery = admin.from('daily_almanac_profiles').select('*').eq('enabled', true).limit(maxProfiles);
  if (onlyEmail) profileQuery = profileQuery.eq('email', onlyEmail);
  const { data: profileRows, error: profileError } = await profileQuery;
  if (profileError) return json({ error: 'monthly_profiles_load_failed', details: profileError.message }, 500);
  const profiles = Array.isArray(profileRows) ? profileRows : [];
  if (!profiles.length) return json({ ok: true, profiles: 0, due: 0, sent: 0, failed: 0 });

  const userIds = profiles.map((profile) => profile.user_id);
  const emails = profiles.map((profile) => asString(profile.email, 320).toLowerCase());
  const [{ data: membershipRows, error: membershipError }, { data: subscriberRows, error: subscriberError }] = await Promise.all([
    admin.from('memberships').select('user_id,status,expires_at').in('user_id', userIds),
    admin.from('newsletter_subscribers').select('email_normalized,status').in('email_normalized', emails),
  ]);
  if (membershipError) return json({ error: 'monthly_memberships_load_failed', details: membershipError.message }, 500);
  if (subscriberError) return json({ error: 'monthly_subscribers_load_failed', details: subscriberError.message }, 500);

  const activeMembers = new Set((membershipRows || [])
    .filter((membership) => membership.expires_at && new Date(membership.expires_at).getTime() > Date.now() && membership.status !== 'expired')
    .map((membership) => membership.user_id));
  const blockedEmails = new Set((subscriberRows || [])
    .filter((subscriber) => ['bounced', 'complained'].includes(subscriber.status))
    .map((subscriber) => subscriber.email_normalized));

  const due = profiles.flatMap((profile) => {
    const email = asString(profile.email, 320).toLowerCase();
    if (!activeMembers.has(profile.user_id) || blockedEmails.has(email)) return [];
    let local;
    try {
      local = localDateParts(now, profile.timezone || 'Asia/Taipei');
    } catch {
      return [];
    }
    if (!force && local.hour !== Number(profile.delivery_hour ?? 7)) return [];
    const forecast = buildMonthlyBaziForecast(
      profile,
      new Date(Date.UTC(local.year, local.month - 1, local.day, 12)),
    );
    if (!force && profile.last_sent_solar_month === forecast.solar_month_key) return [];
    return [{ profile, local, forecast }];
  });

  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      profiles: profiles.length,
      due: due.length,
      previews: due.slice(0, 10).map(({ profile, forecast }) => ({
        email: profile.email,
        subject: monthlyBaziSubject(forecast),
        forecast,
      })),
    });
  }

  if (!due.length) return json({ ok: true, profiles: profiles.length, due: 0, sent: 0, failed: 0 });
  if (!resendKey || !fromEmail) return json({ error: 'monthly_bazi_email_provider_not_configured', due: due.length }, 503);

  const nowIso = new Date().toISOString();
  const { error: queueError } = await admin.from('monthly_bazi_deliveries').upsert(
    due.map(({ profile, forecast }) => ({
      user_id: profile.user_id,
      email: profile.email,
      solar_month_key: forecast.solar_month_key,
      timezone: profile.timezone || 'Asia/Taipei',
      language: profile.language || 'en',
      status: 'queued',
      updated_at: nowIso,
    })),
    { onConflict: 'user_id,solar_month_key', ignoreDuplicates: true },
  );
  if (queueError) return json({ error: 'monthly_bazi_queue_failed', details: queueError.message }, 500);

  const dueByKey = new Map(due.map((item) => [`${item.profile.user_id}|${item.forecast.solar_month_key}`, item]));
  const monthKeys = [...new Set(due.map((item) => item.forecast.solar_month_key))];
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await admin.from('monthly_bazi_deliveries').update({
    status: 'failed', error_message: 'Recovered an interrupted delivery attempt.', updated_at: nowIso,
  }).in('user_id', userIds).in('solar_month_key', monthKeys).eq('status', 'sending').lt('last_attempt_at', staleBefore);

  const { data: candidates, error: candidateError } = await admin
    .from('monthly_bazi_deliveries')
    .select('id,user_id,email,solar_month_key,status,attempt_count')
    .in('user_id', userIds)
    .in('solar_month_key', monthKeys)
    .in('status', ['queued', 'failed'])
    .lt('attempt_count', 3);
  if (candidateError) return json({ error: 'monthly_bazi_candidates_failed', details: candidateError.message }, 500);

  const claimResults = await Promise.all((candidates || [])
    .filter((row) => dueByKey.has(`${row.user_id}|${row.solar_month_key}`))
    .map((row) => {
      const attemptCount = Number(row.attempt_count || 0);
      return admin.from('monthly_bazi_deliveries').update({
        status: 'sending',
        attempt_count: attemptCount + 1,
        last_attempt_at: nowIso,
        error_message: null,
        updated_at: nowIso,
      }).eq('id', row.id).eq('attempt_count', attemptCount).in('status', ['queued', 'failed'])
        .select('id,user_id,email,solar_month_key').maybeSingle();
    }));
  const claimed = claimResults.flatMap((result) => result.data ? [result.data] : []);
  const manageUrl = 'https://www.tengyunzi.com/tengyunzi-newsletter.html#monthly';

  let sent = 0;
  let failed = 0;
  for (const batch of chunk(claimed, 100)) {
    const prepared: Array<{ delivery: JsonRecord; forecast: MonthlyBaziForecast; subject: string; message: JsonRecord }> = [];
    for (const delivery of batch) {
      const item = dueByKey.get(`${delivery.user_id}|${delivery.solar_month_key}`);
      if (!item) continue;
      const subject = monthlyBaziSubject(item.forecast);
      const message: JsonRecord = {
        from: fromEmail,
        to: [item.profile.email],
        subject,
        html: renderMonthlyBaziEmail({ forecast: item.forecast, manageUrl, supportEmail: replyTo }),
        text: forecastText(item.forecast, manageUrl, replyTo),
      };
      if (replyTo) message.reply_to = replyTo;
      prepared.push({ delivery, forecast: item.forecast, subject, message });
    }

    try {
      const providerRows = await sendBatch(prepared.map((item) => item.message), resendKey);
      const sentAt = new Date().toISOString();
      await Promise.all(prepared.map(async (item, index) => {
        await admin.from('monthly_bazi_deliveries').update({
          status: 'sent',
          subject: item.subject,
          provider_message_id: asString(providerRows[index]?.id, 240) || null,
          forecast_data: item.forecast,
          sent_at: sentAt,
          last_event_at: sentAt,
          updated_at: sentAt,
        }).eq('id', item.delivery.id);
        await admin.from('daily_almanac_profiles').update({
          last_sent_solar_month: item.forecast.solar_month_key,
          updated_at: sentAt,
        }).eq('user_id', item.delivery.user_id);
      }));
      sent += prepared.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failedAt = new Date().toISOString();
      await admin.from('monthly_bazi_deliveries').update({
        status: 'failed', error_message: message.slice(0, 1000), last_event_at: failedAt, updated_at: failedAt,
      }).in('id', prepared.map((item) => item.delivery.id));
      failed += prepared.length;
    }
  }

  return json({
    ok: failed === 0,
    profiles: profiles.length,
    due: due.length,
    queued: claimed.length,
    sent,
    failed,
    skipped: Math.max(0, due.length - claimed.length),
  }, failed ? 207 : 200);
});
