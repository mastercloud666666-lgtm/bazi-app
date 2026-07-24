import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  getRequestOrigin,
  isAllowedRequestOrigin,
  json as securityJson,
  resolveAllowedOrigins,
} from '../_shared/security.ts';
import {
  AlmanacProfileInput,
  localDateParts,
} from '../_shared/daily-almanac.ts';
import { buildMonthlyBaziForecast } from '../_shared/monthly-bazi.ts';

type JsonRecord = Record<string, any>;

const ALLOWED_LANGUAGES = new Set(['en', 'zh-Hans', 'zh-Hant']);
const ALLOWED_GENDERS = new Set(['female', 'male', 'unspecified']);

function json(req: Request, body: unknown, status = 200, allowedOrigins = resolveAllowedOrigins()) {
  return securityJson(req, body, status, allowedOrigins);
}

function asString(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function asInteger(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function validDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function validTimezone(value: string): boolean {
  if (!value || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function profileInput(body: JsonRecord): AlmanacProfileInput & {
  gender: string;
  timezone: string;
  language: string;
  delivery_hour: number;
} {
  const birthYear = asInteger(body.birth_year);
  const birthMonth = asInteger(body.birth_month);
  const birthDay = asInteger(body.birth_day);
  const birthHour = asInteger(body.birth_hour, -1);
  const gender = ALLOWED_GENDERS.has(asString(body.gender, 24)) ? asString(body.gender, 24) : 'unspecified';
  const language = ALLOWED_LANGUAGES.has(asString(body.language, 24)) ? asString(body.language, 24) : 'en';
  const timezone = asString(body.timezone, 80) || 'Asia/Taipei';
  const deliveryHour = asInteger(body.delivery_hour, 7);

  if (birthYear < 1900 || birthYear > 2100 || !validDate(birthYear, birthMonth, birthDay)) {
    throw new Error('invalid_birth_date');
  }
  if (birthHour < -1 || birthHour > 23) throw new Error('invalid_birth_hour');
  if (!validTimezone(timezone)) throw new Error('invalid_timezone');
  if (deliveryHour < 0 || deliveryHour > 23) throw new Error('invalid_delivery_hour');

  return {
    birth_year: birthYear,
    birth_month: birthMonth,
    birth_day: birthDay,
    birth_hour: birthHour,
    gender,
    timezone,
    language,
    delivery_hour: deliveryHour,
  };
}

function parseBirth(value: unknown): JsonRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as JsonRecord;
  try {
    const parsed = JSON.parse(String(value || '{}'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function authenticatedUser(req: Request, admin: ReturnType<typeof createClient>) {
  const authorization = asString(req.headers.get('authorization'), 5000);
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function membershipState(admin: ReturnType<typeof createClient>, userId: string) {
  const { data } = await admin
    .from('memberships')
    .select('plan,status,expires_at,auto_renew,paypal_subscription_id')
    .eq('user_id', userId)
    .maybeSingle();
  const active = Boolean(data?.expires_at && new Date(data.expires_at).getTime() > Date.now() && data.status !== 'expired');
  return {
    active,
    plan: data?.plan || null,
    status: data?.status || null,
    expires_at: data?.expires_at || null,
    auto_renew: Boolean(data?.auto_renew),
    paypal_subscription_id: data?.paypal_subscription_id || null,
  };
}

async function linkNewsletterSubscriber(
  admin: ReturnType<typeof createClient>,
  userId: string,
  email: string,
  language: string,
) {
  const normalized = email.toLowerCase();
  const { data: existing } = await admin
    .from('newsletter_subscribers')
    .select('tags,metadata,free_daily_enabled')
    .eq('email_normalized', normalized)
    .maybeSingle();
  const tags = Array.from(new Set([
    ...(Array.isArray(existing?.tags) ? existing.tags : []),
    'personal-monthly-bazi',
    'paid-membership',
  ]));
  const now = new Date().toISOString();
  await admin.from('newsletter_subscribers')
    .update({ user_id: null, updated_at: now })
    .eq('user_id', userId)
    .neq('email_normalized', normalized);
  await admin.from('newsletter_subscribers').upsert({
    user_id: userId,
    email,
    email_normalized: normalized,
    status: 'subscribed',
    source: 'monthly-bazi-membership',
    language,
    page_path: '/tengyunzi-newsletter.html',
    tags,
    free_daily_enabled: existing?.free_daily_enabled === true,
    metadata: {
      ...(existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
      paid_monthly_bazi: true,
    },
    consent_at: now,
    subscribed_at: now,
    unsubscribed_at: null,
    last_seen_at: now,
    updated_at: now,
  }, { onConflict: 'email_normalized' });
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders(req, allowedOrigins) });
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405, allowedOrigins);
  if (!isAllowedRequestOrigin(req, allowedOrigins)) return json(req, { error: 'origin_not_allowed' }, 403, allowedOrigins);

  const body = await req.json().catch(() => ({})) as JsonRecord;
  const action = asString(body.action, 60).toLowerCase();
  const supabaseUrl = asString(Deno.env.get('SUPABASE_URL'), 500);
  const serviceRoleKey = asString(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), 5000);
  const anonKey = asString(Deno.env.get('SUPABASE_ANON_KEY'), 5000);
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return json(req, { error: 'missing_supabase_env' }, 500, allowedOrigins);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (action === 'preview') {
      const language = ALLOWED_LANGUAGES.has(asString(body.language, 24)) ? asString(body.language, 24) : 'en';
      const timezone = validTimezone(asString(body.timezone, 80)) ? asString(body.timezone, 80) : 'Asia/Taipei';
      const local = localDateParts(new Date(), timezone);
      let forecast = null;
      if (body.birth_year && body.birth_month && body.birth_day) {
        const parsed = profileInput({ ...body, timezone, language });
        forecast = buildMonthlyBaziForecast(parsed, new Date(Date.UTC(local.year, local.month - 1, local.day, 12)));
      }
      return json(req, { ok: true, forecast }, 200, allowedOrigins);
    }

    const user = await authenticatedUser(req, admin);
    if (!user?.id || !user.email) return json(req, { error: 'authentication_required' }, 401, allowedOrigins);
    const email = user.email.toLowerCase();

    if (action === 'get') {
      const [{ data: profile }, membership, { data: latestDelivery }] = await Promise.all([
        admin.from('daily_almanac_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        membershipState(admin, user.id),
        admin.from('monthly_bazi_deliveries')
          .select('solar_month_key,status,sent_at,delivered_at,subject')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return json(req, { ok: true, email, profile: profile || null, membership, latest_delivery: latestDelivery || null }, 200, allowedOrigins);
    }

    if (action === 'save') {
      const parsed = profileInput(body);
      const now = new Date().toISOString();
      const { data: profile, error } = await admin.from('daily_almanac_profiles').upsert({
        user_id: user.id,
        email,
        ...parsed,
        enabled: body.enabled !== false,
        consent_at: now,
        updated_at: now,
      }, { onConflict: 'user_id' }).select('*').single();
      if (error) return json(req, { error: 'profile_save_failed', details: error.message }, 500, allowedOrigins);
      await linkNewsletterSubscriber(admin, user.id, email, parsed.language);
      const membership = await membershipState(admin, user.id);
      return json(req, { ok: true, profile, membership }, 200, allowedOrigins);
    }

    if (action === 'pause' || action === 'resume') {
      if (action === 'resume') {
        const membership = await membershipState(admin, user.id);
        if (!membership.active) return json(req, { error: 'active_membership_required' }, 403, allowedOrigins);
      }
      const { data: profile, error } = await admin.from('daily_almanac_profiles')
        .update({ enabled: action === 'resume', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select('*')
        .maybeSingle();
      if (error || !profile) return json(req, { error: 'profile_not_found' }, 404, allowedOrigins);
      return json(req, { ok: true, profile }, 200, allowedOrigins);
    }

    if (action === 'create_checkout') {
      const plan = asString(body.plan, 20).toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
      const { data: profile } = await admin.from('daily_almanac_profiles').select('language').eq('user_id', user.id).maybeSingle();
      if (!profile) return json(req, { error: 'profile_required' }, 400, allowedOrigins);
      const tradeNo = `bazi-mem-${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}-${Date.now()}`;
      const birth = {
        order_service: 'membership',
        product_family: 'monthly_bazi',
        product: 'Tengyunzi Personal Monthly BaZi Forecast',
        plan,
        user_id: user.id,
        email,
        lang: profile.language || 'en',
        membership: { product: 'monthly_bazi', plan, user_id: user.id, email },
      };
      const { error: orderError } = await admin.from('orders').insert({
        trade_no: tradeNo,
        birth_input: JSON.stringify(birth),
        paid: false,
      });
      if (orderError) return json(req, { error: 'membership_order_failed', details: orderError.message }, 500, allowedOrigins);

      const origin = getRequestOrigin(req) || 'https://www.tengyunzi.com';
      const paypalResponse = await fetch(`${supabaseUrl}/functions/v1/paypal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Origin: origin,
        },
        body: JSON.stringify({
          action: 'create_subscription',
          trade_no: tradeNo,
          plan,
          origin,
          return_path: 'tengyunzi-newsletter.html',
        }),
      });
      const paypal = await paypalResponse.json().catch(() => ({}));
      if (!paypalResponse.ok || !paypal.approve_url) {
        return json(req, { error: paypal.error || 'subscription_create_failed', details: paypal.detail || null }, 502, allowedOrigins);
      }
      return json(req, {
        ok: true,
        trade_no: tradeNo,
        subscription_id: paypal.subscription_id,
        approve_url: paypal.approve_url,
        plan,
      }, 200, allowedOrigins);
    }

    if (action === 'verify_subscription') {
      const tradeNo = asString(body.trade_no, 120);
      const subscriptionId = asString(body.subscription_id, 160);
      if (!tradeNo || !subscriptionId) return json(req, { error: 'subscription_details_required' }, 400, allowedOrigins);
      const { data: order } = await admin.from('orders').select('birth_input').eq('trade_no', tradeNo).maybeSingle();
      const birth = parseBirth(order?.birth_input);
      if (!order || asString(birth.user_id, 100) !== user.id || !['monthly_bazi', 'daily_almanac'].includes(asString(birth.product_family, 40))) {
        return json(req, { error: 'subscription_order_not_found' }, 404, allowedOrigins);
      }
      const origin = getRequestOrigin(req) || 'https://www.tengyunzi.com';
      const paypalResponse = await fetch(`${supabaseUrl}/functions/v1/paypal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Origin: origin,
        },
        body: JSON.stringify({ action: 'verify_subscription', subscription_id: subscriptionId, trade_no: tradeNo }),
      });
      const paypal = await paypalResponse.json().catch(() => ({}));
      if (!paypalResponse.ok || !paypal.ok) return json(req, { error: paypal.error || 'subscription_verify_failed', status: paypal.status || null }, 502, allowedOrigins);
      await admin.from('daily_almanac_profiles').update({ enabled: true, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      const profile = await admin.from('daily_almanac_profiles').select('language').eq('user_id', user.id).maybeSingle();
      await linkNewsletterSubscriber(admin, user.id, email, profile.data?.language || 'en');
      return json(req, { ok: true, membership: await membershipState(admin, user.id) }, 200, allowedOrigins);
    }

    return json(req, { error: 'unknown_action' }, 400, allowedOrigins);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.startsWith('invalid_') ? 400 : 500;
    return json(req, { error: message }, status, allowedOrigins);
  }
});
