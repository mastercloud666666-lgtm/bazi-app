export const DEFAULT_ALLOWED_ORIGINS = ['https://tengyunzi.com', 'https://www.tengyunzi.com'];

export const LOCAL_DEVELOPMENT_ORIGINS = ['http://127.0.0.1:8765', 'http://localhost:8765'];

const TRUSTED_VERCEL_PREVIEW_ORIGINS = [
  /^https:\/\/bazi-[a-z0-9]{5,40}-mastercloud666666-lgtms-projects\.vercel\.app$/i,
];

export type JsonRecord = Record<string, unknown>;

export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveAllowedOrigins(envKey = 'SECURITY_ALLOWED_ORIGINS', fallback = DEFAULT_ALLOWED_ORIGINS): string[] {
  const fromEnv = asString(Deno.env.get(envKey))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([...(fromEnv.length ? fromEnv : fallback), ...LOCAL_DEVELOPMENT_ORIGINS])];
}

function originFromReferer(referer: string): string {
  try {
    return new URL(referer).origin;
  } catch {
    return '';
  }
}

export function getRequestOrigin(req: Request): string {
  const origin = asString(req.headers.get('origin'));
  if (origin) return origin;
  const refererOrigin = originFromReferer(asString(req.headers.get('referer')));
  return refererOrigin;
}

export function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes(origin)
    || TRUSTED_VERCEL_PREVIEW_ORIGINS.some((pattern) => pattern.test(origin));
}

export function isAllowedRequestOrigin(req: Request, allowedOrigins: string[]): boolean {
  const requestOrigin = getRequestOrigin(req);
  if (!requestOrigin) return true;
  return isAllowedOrigin(requestOrigin, allowedOrigins);
}

export function corsHeaders(req: Request, allowedOrigins: string[]) {
  const requestOrigin = getRequestOrigin(req);
  const fallbackOrigin = allowedOrigins[0] || '*';
  const allowOrigin = requestOrigin && isAllowedOrigin(requestOrigin, allowedOrigins)
    ? requestOrigin
    : fallbackOrigin;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, X-Requested-With, x-admin-token, x-admin-bootstrap',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200, allowedOrigins = resolveAllowedOrigins()) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(req, allowedOrigins),
    },
  });
}

export function extractClientIp(req: Request): string {
  const candidates = [
    asString(req.headers.get('cf-connecting-ip')),
    asString(req.headers.get('x-real-ip')),
    asString(req.headers.get('x-forwarded-for')).split(',')[0]?.trim() || '',
    asString(req.headers.get('x-client-ip')),
  ].filter(Boolean);

  const candidate = candidates[0] || 'unknown';
  return candidate.slice(0, 80);
}

export function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
    return ip;
  }
  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean);
    return parts.length ? `${parts.slice(0, 3).join(':')}::` : ip;
  }
  return ip;
}

export function isLikelyAutomatedUa(uaRaw: string): boolean {
  const ua = asString(uaRaw).toLowerCase();
  if (!ua) return true;

  const knownCrawler = /(bot|spider|crawler|googlebot|bingbot|baiduspider|bytespider|petalbot|yandexbot|duckduckbot|sogou|slurp|ahrefsbot|semrushbot|mj12bot|dotbot|facebookexternalhit|ia_archiver)/i;
  const scriptClient = /(curl|wget|python-requests|aiohttp|httpclient|go-http-client|okhttp|java\/|libwww-perl|axios|postmanruntime|insomnia|node-fetch|undici|scrapy|playwright|puppeteer|selenium|headlesschrome|phantomjs)/i;

  if (knownCrawler.test(ua) || scriptClient.test(ua)) return true;
  return false;
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildRateLimitIdentifier(req: Request): Promise<string> {
  const salt = asString(Deno.env.get('SECURITY_RATE_LIMIT_SALT')) || 'default-salt-change-me';
  const ip = extractClientIp(req);
  const ua = asString(req.headers.get('user-agent')).slice(0, 180);
  return sha256Hex(`${salt}|${ip}|${ua}`);
}

export type RateLimitResult = {
  allowed: boolean;
  currentCount: number;
  retryAfterSeconds: number;
  windowStart: string;
  windowEnd: string;
  disabled: boolean;
  reason: string;
};

export async function consumeRateLimit(
  supabase: any,
  params: { scope: string; identifier: string; windowSeconds: number; maxRequests: number },
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const windowMs = Math.max(1, Number(params.windowSeconds || 60)) * 1000;
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const windowEndMs = windowStartMs + windowMs;
  const windowStartIso = new Date(windowStartMs).toISOString();
  const windowEndIso = new Date(windowEndMs).toISOString();

  try {
    const { data, error } = await supabase.rpc('consume_api_rate_limit', {
      p_scope: params.scope,
      p_identifier: params.identifier,
      p_window_seconds: params.windowSeconds,
      p_limit: params.maxRequests,
    });

    if (error) {
      const msg = String(error.message || 'rate_limit_rpc_error');
      if (msg.includes('consume_api_rate_limit') && (msg.includes('does not exist') || msg.includes('not found'))) {
        return {
          allowed: true,
          currentCount: 0,
          retryAfterSeconds: 0,
          windowStart: '',
          windowEnd: '',
          disabled: true,
          reason: 'rpc_missing',
        };
      }
      throw new Error(msg);
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      allowed: Boolean(row?.allowed),
      currentCount: Number(row?.current_count || 0),
      retryAfterSeconds: Number(row?.retry_after_seconds || 0),
      windowStart: asString(row?.window_start),
      windowEnd: asString(row?.window_end),
      disabled: false,
      reason: 'ok',
    };
  } catch (err) {
    // Fallback path when RPC is unavailable: best-effort table upsert.
    try {
      const { data: existing } = await supabase
        .from('api_rate_limits')
        .select('request_count')
        .eq('scope', params.scope)
        .eq('identifier', params.identifier)
        .eq('window_start', windowStartIso)
        .maybeSingle();

      let currentCount = Number(existing?.request_count || 0);
      if (!existing) {
        const { error: insertError } = await supabase
          .from('api_rate_limits')
          .insert({
            scope: params.scope,
            identifier: params.identifier,
            window_start: windowStartIso,
            request_count: 1,
          });
        if (insertError) {
          const { data: retryRow } = await supabase
            .from('api_rate_limits')
            .select('request_count')
            .eq('scope', params.scope)
            .eq('identifier', params.identifier)
            .eq('window_start', windowStartIso)
            .maybeSingle();
          currentCount = Number(retryRow?.request_count || 1);
          await supabase
            .from('api_rate_limits')
            .update({ request_count: currentCount + 1, updated_at: new Date().toISOString() })
            .eq('scope', params.scope)
            .eq('identifier', params.identifier)
            .eq('window_start', windowStartIso);
          currentCount += 1;
        } else {
          currentCount = 1;
        }
      } else {
        currentCount += 1;
        await supabase
          .from('api_rate_limits')
          .update({ request_count: currentCount, updated_at: new Date().toISOString() })
          .eq('scope', params.scope)
          .eq('identifier', params.identifier)
          .eq('window_start', windowStartIso);
      }

      const retryAfter = Math.max(0, Math.ceil((windowEndMs - Date.now()) / 1000));
      return {
        allowed: currentCount <= params.maxRequests,
        currentCount,
        retryAfterSeconds: retryAfter,
        windowStart: windowStartIso,
        windowEnd: windowEndIso,
        disabled: false,
        reason: 'table_fallback',
      };
    } catch (fallbackErr) {
      console.warn('consumeRateLimit failed:', err, fallbackErr);
      return {
        allowed: true,
        currentCount: 0,
        retryAfterSeconds: 0,
        windowStart: '',
        windowEnd: '',
        disabled: true,
        reason: 'fallback_allow',
      };
    }
  }
}

export async function recordAbuseLog(
  supabase: any,
  payload: { scope: string; identifier: string; event: string; meta?: Record<string, unknown> },
): Promise<void> {
  try {
    await supabase
      .from('api_abuse_logs')
      .insert({
        scope: payload.scope,
        identifier: payload.identifier,
        event: payload.event,
        meta: payload.meta || {},
      });
  } catch (err) {
    console.warn('recordAbuseLog failed:', err);
  }
}

export function tooManyRequestsResponse(
  req: Request,
  allowedOrigins: string[],
  params: { message?: string; retryAfterSeconds?: number; scope?: string; currentCount?: number },
) {
  const retryAfterSeconds = Math.max(1, Number(params.retryAfterSeconds || 60));
  return new Response(JSON.stringify({
    error: 'too_many_requests',
    message: params.message || '请求过于频繁，请稍后重试。',
    retry_after_seconds: retryAfterSeconds,
    scope: params.scope || '',
    current_count: Number(params.currentCount || 0),
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfterSeconds),
      ...corsHeaders(req, allowedOrigins),
    },
  });
}
