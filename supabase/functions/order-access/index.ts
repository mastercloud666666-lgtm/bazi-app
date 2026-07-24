import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier,
  consumeRateLimit,
  corsHeaders,
  extractClientIp,
  isAllowedRequestOrigin,
  json as securityJson,
  maskIp,
  recordAbuseLog,
  resolveAllowedOrigins,
  tooManyRequestsResponse,
} from '../_shared/security.ts';

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 180;

function json(req: Request, body: unknown, status = 200, allowedOrigins = resolveAllowedOrigins()) {
  const response = securityJson(req, body, status, allowedOrigins);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function readEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const value = Number(String(Deno.env.get(name) || '').trim());
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function validTradeNo(value: string): boolean {
  return /^(bazi|hepan)-[a-z0-9_-]{4,180}$/i.test(value);
}

function validClientId(value: string): boolean {
  return /^[a-z0-9]{6,32}$/i.test(value);
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(req, allowedOrigins) });
  }
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders(req, allowedOrigins) });
  }
  if (!isAllowedRequestOrigin(req, allowedOrigins)) {
    return json(req, { error: 'origin_not_allowed' }, 403, allowedOrigins);
  }

  try {
    const url = new URL(req.url);
    const tradeNo = String(url.searchParams.get('trade_no') || '').trim();
    const clientId = String(url.searchParams.get('client_id') || '').trim();
    if ((!tradeNo && !clientId) || (tradeNo && clientId)) {
      return json(req, { error: 'one_order_identifier_required' }, 400, allowedOrigins);
    }
    if (tradeNo && !validTradeNo(tradeNo)) {
      return json(req, { error: 'invalid_trade_no' }, 400, allowedOrigins);
    }
    if (clientId && !validClientId(clientId)) {
      return json(req, { error: 'invalid_client_id' }, 400, allowedOrigins);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { error: 'missing_server_configuration' }, 500, allowedOrigins);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rateWindowSeconds = readEnvNumber(
      'RATE_LIMIT_ORDER_ACCESS_WINDOW_SECONDS',
      DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      10,
      3600,
    );
    const rateMaxRequests = readEnvNumber(
      'RATE_LIMIT_ORDER_ACCESS_MAX_REQUESTS',
      DEFAULT_RATE_LIMIT_MAX_REQUESTS,
      10,
      1000,
    );
    const rateIdentifier = await buildRateLimitIdentifier(req);
    const rateResult = await consumeRateLimit(supabase, {
      scope: 'order-access',
      identifier: rateIdentifier,
      windowSeconds: rateWindowSeconds,
      maxRequests: rateMaxRequests,
    });
    if (!rateResult.allowed) {
      await recordAbuseLog(supabase, {
        scope: 'order-access',
        identifier: rateIdentifier,
        event: 'rate_limited',
        meta: {
          ip_masked: maskIp(extractClientIp(req)),
          current_count: rateResult.currentCount,
          max_requests: rateMaxRequests,
          window_seconds: rateWindowSeconds,
        },
      });
      return tooManyRequestsResponse(req, allowedOrigins, {
        message: 'Too many order checks. Please try again shortly.',
        retryAfterSeconds: rateResult.retryAfterSeconds,
        scope: 'order-access',
        currentCount: rateResult.currentCount,
      });
    }

    const columns = 'trade_no,paid,analysis,created_at,birth_input';
    if (tradeNo) {
      const { data, error } = await supabase
        .from('orders')
        .select(columns)
        .eq('trade_no', tradeNo)
        .limit(1);
      if (error) return json(req, { error: 'order_query_failed' }, 500, allowedOrigins);
      return json(req, data || [], 200, allowedOrigins);
    }

    const requestedLimit = Number(url.searchParams.get('limit') || 5);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 5, 1), 5);
    const { data, error } = await supabase
      .from('orders')
      .select(columns)
      .like('trade_no', `bazi-${clientId}-%`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return json(req, { error: 'order_query_failed' }, 500, allowedOrigins);
    return json(req, data || [], 200, allowedOrigins);
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : String(error) }, 500, allowedOrigins);
  }
});
