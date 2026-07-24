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
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 6;

function json(req: Request, body: unknown, status = 200, allowedOrigins = resolveAllowedOrigins()) {
  return securityJson(req, body, status, allowedOrigins);
}

function asString(value: unknown, max = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function readEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const value = Number(String(Deno.env.get(name) || '').trim());
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
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
  return cleaned || 'contact-page';
}

function sanitizeLang(value: unknown): string {
  const lang = asString(value, 24);
  if (['zh-Hans', 'zh-Hant', 'en'].includes(lang)) return lang;
  return lang ? lang.replace(/[^\w-]/g, '').slice(0, 24) : '';
}

function sanitizeTopic(value: unknown): string {
  const topic = asString(value, 120);
  return topic || 'General question';
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

    // Honeypot: accept silently so automated submissions do not get a useful signal.
    if (asString(body?.website, 200)) {
      return json(req, { ok: true, submitted: true }, 200, allowedOrigins);
    }

    const name = asString(body?.name, 120);
    const email = normalizeEmail(body?.email);
    const message = asString(body?.message, 3000);
    if (!name) return json(req, { error: 'missing_name' }, 400, allowedOrigins);
    if (!isValidEmail(email)) return json(req, { error: 'invalid_email' }, 400, allowedOrigins);
    if (message.length < 10) return json(req, { error: 'message_too_short' }, 400, allowedOrigins);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { error: 'missing_supabase_env' }, 500, allowedOrigins);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const rateIdentifier = await buildRateLimitIdentifier(req);
    const rateWindowSeconds = readEnvNumber(
      'RATE_LIMIT_CONTACT_WINDOW_SECONDS',
      DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      10,
      3600,
    );
    const rateMaxRequests = readEnvNumber(
      'RATE_LIMIT_CONTACT_MAX_REQUESTS',
      DEFAULT_RATE_LIMIT_MAX_REQUESTS,
      1,
      80,
    );
    const rateResult = await consumeRateLimit(supabase, {
      scope: 'contact-submit',
      identifier: rateIdentifier,
      windowSeconds: rateWindowSeconds,
      maxRequests: rateMaxRequests,
    });

    const userAgent = asString(req.headers.get('user-agent'), 240);
    const clientIpMasked = maskIp(extractClientIp(req));

    if (!rateResult.allowed) {
      await recordAbuseLog(supabase, {
        scope: 'contact-submit',
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
        message: 'Too many contact attempts. Please try again later.',
        retryAfterSeconds: rateResult.retryAfterSeconds,
        scope: 'contact-submit',
        currentCount: rateResult.currentCount,
      });
    }

    if (Deno.env.get('SECURITY_BLOCK_BOT_UA_CONTACT') !== '0' && isLikelyAutomatedUa(userAgent)) {
      await recordAbuseLog(supabase, {
        scope: 'contact-submit',
        identifier: rateIdentifier,
        event: 'blocked_bot_ua',
        meta: { ip_masked: clientIpMasked, ua: userAgent.slice(0, 160) },
      });
      return json(req, { error: 'blocked_bot_ua' }, 403, allowedOrigins);
    }

    const payload = {
      name,
      email,
      email_normalized: email,
      topic: sanitizeTopic(body?.topic),
      message,
      source: sanitizeSource(body?.source),
      language: sanitizeLang(body?.language) || null,
      page_path: asString(body?.page_path, 240) || null,
      landing_url: asString(body?.landing_url, 500) || null,
      referrer: asString(body?.referrer, 500) || null,
      utm_source: asString(body?.utm_source, 120) || null,
      utm_medium: asString(body?.utm_medium, 120) || null,
      utm_campaign: asString(body?.utm_campaign, 160) || null,
      metadata: sanitizeMetadata(body?.metadata),
      status: 'new',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('contact_submissions')
      .insert(payload)
      .select('id,status,created_at')
      .maybeSingle();

    if (error) {
      return json(req, { error: 'contact_insert_failed', details: error.message }, 500, allowedOrigins);
    }

    return json(req, {
      ok: true,
      submitted: true,
      submission_id: data?.id || null,
      status: data?.status || 'new',
    }, 200, allowedOrigins);
  } catch (err) {
    return json(req, { error: err instanceof Error ? err.message : String(err) }, 500, allowedOrigins);
  }
});
