import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier,
  corsHeaders,
  consumeRateLimit,
  extractClientIp,
  isAllowedRequestOrigin,
  isLikelyAutomatedUa,
  json as securityJson,
  maskIp,
  recordAbuseLog,
  resolveAllowedOrigins,
  tooManyRequestsResponse,
} from '../_shared/security.ts';

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 8;

function json(req: Request, body: unknown, status = 200, allowedOrigins = resolveAllowedOrigins()) {
  return securityJson(req, body, status, allowedOrigins);
}

function readEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const value = Number(String(Deno.env.get(name) || '').trim());
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function asString(value: unknown, max = 240): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function normalizeEmail(value: unknown): string {
  return asString(value, 320).toLowerCase();
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function sanitizeSource(value: unknown): string {
  const cleaned = asString(value, 64).toLowerCase().replace(/[^\w.-]/g, '');
  return cleaned || 'website';
}

function sanitizeLang(value: unknown): string {
  const lang = asString(value, 24);
  if (['zh-Hans', 'zh-Hant', 'en'].includes(lang)) return lang;
  return lang ? lang.replace(/[^\w-]/g, '').slice(0, 24) : '';
}

function sanitizeTags(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : [];
  return Array.from(new Set(
    raw
      .map((item) => asString(item, 48).toLowerCase().replace(/[^\w.-]/g, ''))
      .filter(Boolean),
  )).slice(0, 12);
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, unknown> = {};
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const key = rawKey.replace(/[^\w.-]/g, '').slice(0, 48);
    if (!key) continue;
    if (typeof rawValue === 'string') out[key] = rawValue.trim().slice(0, 320);
    else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) out[key] = rawValue;
    else if (typeof rawValue === 'boolean') out[key] = rawValue;
  }
  return out;
}

function sanitizeTimezone(value: unknown): string {
  const timezone = asString(value, 80) || 'Asia/Taipei';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return 'Asia/Taipei';
  }
}

function sanitizeDeliveryHour(value: unknown): number {
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 7;
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(left: string, right: string): boolean {
  if (!left || left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}

async function verifyUnsubscribeToken(token: string, secret: string): Promise<{ email: string; subscriber_id: string; scope: string } | null> {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  let binary = '';
  for (const byte of new Uint8Array(signed)) binary += String.fromCharCode(byte);
  const expected = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  if (!timingSafeEqual(signature, expected)) return null;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    const email = normalizeEmail(decoded?.email);
    const subscriberId = asString(decoded?.subscriber_id, 80);
    const scope = asString(decoded?.scope, 40).toLowerCase();
    return isValidEmail(email) && subscriberId ? { email, subscriber_id: subscriberId, scope } : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(req, allowedOrigins) });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders(req, allowedOrigins) });
  }

  if (!isAllowedRequestOrigin(req, allowedOrigins)) {
    return json(req, { error: 'origin_not_allowed' }, 403, allowedOrigins);
  }

  try {
    const body = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { error: 'missing_supabase_env' }, 500, allowedOrigins);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (asString(body?.action, 40).toLowerCase() === 'unsubscribe') {
      const token = asString(body?.token, 4000);
      const secret = asString(Deno.env.get('NEWSLETTER_UNSUBSCRIBE_SECRET'), 4000) || serviceRoleKey;
      const identity = await verifyUnsubscribeToken(token, secret);
      if (!identity) return json(req, { error: 'invalid_unsubscribe_token' }, 400, allowedOrigins);
      const now = new Date().toISOString();
      const update = identity.scope === 'free_daily'
        ? { free_daily_enabled: false, updated_at: now }
        : { status: 'unsubscribed', free_daily_enabled: false, unsubscribed_at: now, updated_at: now };
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .update(update)
        .eq('id', identity.subscriber_id)
        .eq('email_normalized', identity.email)
        .select('id,status')
        .maybeSingle();
      if (error || !data) return json(req, { error: 'unsubscribe_failed' }, 500, allowedOrigins);
      return json(req, { ok: true, unsubscribed: true, scope: identity.scope || 'all' }, 200, allowedOrigins);
    }

    // Honeypot: pretend success so automated submissions do not learn anything useful.
    if (asString(body?.website, 200)) {
      return json(req, { ok: true, subscribed: true }, 200, allowedOrigins);
    }

    const email = normalizeEmail(body?.email);
    if (!isValidEmail(email)) {
      return json(req, { error: 'invalid_email' }, 400, allowedOrigins);
    }

    const rateIdentifier = await buildRateLimitIdentifier(req);
    const rateWindowSeconds = readEnvNumber(
      'RATE_LIMIT_NEWSLETTER_WINDOW_SECONDS',
      DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      10,
      3600,
    );
    const rateMaxRequests = readEnvNumber(
      'RATE_LIMIT_NEWSLETTER_MAX_REQUESTS',
      DEFAULT_RATE_LIMIT_MAX_REQUESTS,
      1,
      100,
    );
    const rateResult = await consumeRateLimit(supabase, {
      scope: 'newsletter-subscribe',
      identifier: rateIdentifier,
      windowSeconds: rateWindowSeconds,
      maxRequests: rateMaxRequests,
    });

    const userAgent = asString(req.headers.get('user-agent'), 240);
    const clientIpMasked = maskIp(extractClientIp(req));

    if (!rateResult.allowed) {
      await recordAbuseLog(supabase, {
        scope: 'newsletter-subscribe',
        identifier: rateIdentifier,
        event: 'rate_limited',
        meta: {
          ip_masked: clientIpMasked,
          current_count: rateResult.currentCount,
          max_requests: rateMaxRequests,
          window_seconds: rateWindowSeconds,
        },
      });
      return tooManyRequestsResponse(req, allowedOrigins, {
        message: 'Too many signup attempts. Please try again later.',
        retryAfterSeconds: rateResult.retryAfterSeconds,
        scope: 'newsletter-subscribe',
        currentCount: rateResult.currentCount,
      });
    }

    if (Deno.env.get('SECURITY_BLOCK_BOT_UA_NEWSLETTER') !== '0' && isLikelyAutomatedUa(userAgent)) {
      await recordAbuseLog(supabase, {
        scope: 'newsletter-subscribe',
        identifier: rateIdentifier,
        event: 'blocked_bot_ua',
        meta: { ip_masked: clientIpMasked, ua: userAgent.slice(0, 160) },
      });
      return json(req, { error: 'blocked_bot_ua' }, 403, allowedOrigins);
    }

    const now = new Date().toISOString();
    const tags = sanitizeTags(body?.tags);
    const metadata = sanitizeMetadata(body?.metadata);
    const payload = {
      email,
      email_normalized: email,
      name: asString(body?.name, 120) || null,
      status: 'subscribed',
      source: sanitizeSource(body?.source),
      language: sanitizeLang(body?.language) || null,
      page_path: asString(body?.page_path, 240) || null,
      landing_url: asString(body?.landing_url, 500) || null,
      referrer: asString(body?.referrer, 500) || null,
      utm_source: asString(body?.utm_source, 120) || null,
      utm_medium: asString(body?.utm_medium, 120) || null,
      utm_campaign: asString(body?.utm_campaign, 160) || null,
      tags,
      metadata,
      free_daily_enabled: body?.free_daily_enabled !== false,
      timezone: sanitizeTimezone(body?.timezone || metadata.timezone),
      delivery_hour: sanitizeDeliveryHour(body?.delivery_hour ?? metadata.delivery_hour),
      consent_at: now,
      subscribed_at: now,
      unsubscribed_at: null,
      last_seen_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .upsert(payload, { onConflict: 'email_normalized' })
      .select('id,email,status,subscribed_at')
      .maybeSingle();

    if (error) {
      return json(req, { error: 'newsletter_insert_failed', details: error.message }, 500, allowedOrigins);
    }

    return json(req, {
      ok: true,
      subscribed: true,
      subscriber_id: data?.id || null,
      status: data?.status || 'subscribed',
    }, 200, allowedOrigins);
  } catch (err) {
    return json(req, { error: err instanceof Error ? err.message : String(err) }, 500, allowedOrigins);
  }
});
