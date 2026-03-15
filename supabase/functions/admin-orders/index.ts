import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_PAYMENT_OPTION_IDS = new Set(['basic', 'pro', 'vip', 'pdf']);
const DEFAULT_CORS_ORIGINS = ['https://tengyunzi.com', 'https://www.tengyunzi.com'];

type JsonRecord = Record<string, unknown>;

function resolveAllowedOrigins(): string[] {
  const fromEnv = (Deno.env.get('ADMIN_DASHBOARD_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_CORS_ORIGINS;
}

function corsHeaders(req: Request): Record<string, string> {
  const allowedOrigins = resolveAllowedOrigins();
  const reqOrigin = (req.headers.get('origin') || '').trim();
  const allowOrigin = reqOrigin && allowedOrigins.includes(reqOrigin) ? reqOrigin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-admin-token',
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

function getAdminToken(req: Request): string {
  return (req.headers.get('x-admin-token') || '').trim();
}

function validateTradeNo(tradeNo: string): boolean {
  return /^bazi-[a-z0-9_-]{4,120}$/i.test(tradeNo);
}

function normalizePaymentOptionId(value: unknown, fallback = 'basic'): string {
  const id = String(value || '').trim();
  if (id && ALLOWED_PAYMENT_OPTION_IDS.has(id)) return id;
  return fallback;
}

function parseBirthInput(value: unknown): JsonRecord {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as JsonRecord;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonRecord : {};
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({} as JsonRecord));
    const expectedAdminToken = (Deno.env.get('ADMIN_DASHBOARD_TOKEN') || '').trim();
    if (!expectedAdminToken) return json(req, { error: 'missing_admin_token_env' }, 500);

    const providedToken = getAdminToken(req);
    if (!providedToken || !timingSafeEqual(providedToken, expectedAdminToken)) {
      return json(req, { error: 'unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return json(req, { error: 'missing_supabase_env' }, 500);
    const supabase = createClient(supabaseUrl, serviceKey);

    const action = String((body as JsonRecord).action || '').trim();
    if (!action) return json(req, { error: 'action_required' }, 400);

    if (action === 'list') {
      const limit = Math.min(Math.max(Number((body as JsonRecord).limit || 50), 1), 100);
      const { data, error } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return json(req, { error: 'list_failed', details: error.message }, 500);
      return json(req, { ok: true, orders: data || [] });
    }

    if (action === 'verify') {
      const tradeNo = String((body as JsonRecord).trade_no || '').trim();
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);

      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (!anonKey) return json(req, { error: 'missing_anon_key' }, 500);

      const reconcileRes = await fetch(`${supabaseUrl}/functions/v1/reconcile-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ trade_no: tradeNo }),
      });
      const reconcileData = await reconcileRes.json().catch(() => ({}));
      if (!reconcileRes.ok) {
        return json(req, {
          error: 'verify_failed',
          status: reconcileRes.status,
          details: reconcileData,
        }, 502);
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (orderError) return json(req, { error: 'order_query_failed', details: orderError.message }, 500);
      if (!order) return json(req, { error: 'order_not_found' }, 404);

      return json(req, {
        ok: true,
        trade_no: tradeNo,
        paid: !!order.paid,
        analysis_exists: !!String(order.analysis || '').trim(),
        analysis_triggered: !!reconcileData?.analysis_triggered,
        reconcile: reconcileData,
        order,
      });
    }

    if (action === 'create_order') {
      const birthInput = (body as JsonRecord).birth_input;
      const rawTradeNo = String((body as JsonRecord).trade_no || '').trim();
      const tradeNo = rawTradeNo || `bazi-manual-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);
      if (!birthInput || typeof birthInput !== 'object' || Array.isArray(birthInput)) {
        return json(req, { error: 'invalid_birth_input' }, 400);
      }

      const birthInputStr = JSON.stringify(birthInput);
      if (birthInputStr.length < 2 || birthInputStr.length > 20000) {
        return json(req, { error: 'birth_input_too_large' }, 400);
      }

      const { error } = await supabase.from('orders').insert({
        trade_no: tradeNo,
        paid: false,
        analysis: null,
        birth_input: birthInputStr,
      });
      if (error) return json(req, { error: 'create_order_failed', details: error.message }, 500);
      return json(req, { ok: true, trade_no: tradeNo });
    }

    if (action === 'create_payment') {
      const tradeNo = String((body as JsonRecord).trade_no || '').trim();
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('trade_no,paid,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (orderError) return json(req, { error: 'order_query_failed', details: orderError.message }, 500);
      if (!order) return json(req, { error: 'order_not_found' }, 404);
      if (order.paid) return json(req, { error: 'order_already_paid' }, 409);

      const requestedOptionId = normalizePaymentOptionId((body as JsonRecord).payment_option_id, 'basic');
      const birth = parseBirthInput(order.birth_input);
      const paymentOption = parseBirthInput(birth.payment_option);
      const lockedOptionId = normalizePaymentOptionId(paymentOption.id, '');
      const paymentOptionId = lockedOptionId || requestedOptionId;

      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (!anonKey) return json(req, { error: 'missing_anon_key' }, 500);

      const createRes = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          trade_no: tradeNo,
          payment_option_id: paymentOptionId,
          client_env: (body as JsonRecord).client_env || {},
        }),
      });
      const data = await createRes.json().catch(() => ({}));
      if (!createRes.ok || data?.errcode !== 0) {
        return json(req, {
          error: 'create_payment_failed',
          status: createRes.status,
          details: data,
        }, 502);
      }

      return json(req, { ok: true, ...data });
    }

    return json(req, { error: 'unsupported_action' }, 400);
  } catch (err) {
    return json(req, { error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
