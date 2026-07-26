import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier,
  corsHeaders,
  consumeRateLimit,
  isAllowedRequestOrigin,
  json,
  resolveAllowedOrigins,
  tooManyRequestsResponse,
} from '../_shared/security.ts';

const OPTION_ID = 'zhanbu';
const AMOUNT = '9.99';
const PRODUCT = 'Tengyunzi I Ching Decision Reading';
const CATEGORIES = new Set([
  'Decision and direction',
  'Career and work',
  'Business and collaboration',
  'Relationship and communication',
  'Study, travel, or relocation',
  'Other',
]);

function asString(value: unknown, max = 1600): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseBirth(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function tradeNo(): string {
  return `zhanbu-${Date.now()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 22)}`;
}

function castValues(birth: Record<string, unknown>): number[] {
  const cast = birth.decision_cast;
  if (!cast || typeof cast !== 'object' || Array.isArray(cast)) return [];
  const values = (cast as Record<string, unknown>).values;
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => Number(value))
    .filter((value, index) => Number.isInteger(value) && value >= 1 && value <= (index === 2 ? 6 : 8))
    .slice(0, 3);
}

function cryptoNumber(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const sample = new Uint32Array(1);
  do crypto.getRandomValues(sample); while (sample[0] >= limit);
  return (sample[0] % max) + 1;
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders(req, allowedOrigins) });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders(req, allowedOrigins) });
  if (!isAllowedRequestOrigin(req, allowedOrigins)) return json(req, { error: 'origin_not_allowed' }, 403, allowedOrigins);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json(req, { error: 'missing_supabase_env' }, 500, allowedOrigins);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'json_body_required' }, 400, allowedOrigins);
  }

  const action = asString(body.action, 40) || 'create';
  const rate = await consumeRateLimit(supabase, {
    scope: `decision-intake:${action}`,
    identifier: await buildRateLimitIdentifier(req),
    windowSeconds: 300,
    maxRequests: action === 'create' ? 5 : 40,
  });
  if (!rate.allowed) {
    return tooManyRequestsResponse(req, allowedOrigins, {
      message: 'Too many decision-reading requests. Please try again later.',
      retryAfterSeconds: rate.retryAfterSeconds,
      scope: `decision-intake:${action}`,
      currentCount: rate.currentCount,
    });
  }

  if (action === 'create') {
    if (asString(body.website, 200)) return json(req, { ok: true }, 200, allowedOrigins);
    const category = asString(body.category, 80);
    const question = asString(body.question, 1200);
    if (!CATEGORIES.has(category)) return json(req, { error: 'invalid_category' }, 400, allowedOrigins);
    if (question.length < 20) return json(req, { error: 'question_too_short' }, 400, allowedOrigins);

    const orderReference = tradeNo();
    const now = new Date().toISOString();
    const birthInput = {
      order_service: 'zhanbu',
      product_family: 'tengyunzi_decision',
      product: PRODUCT,
      category,
      question,
      method: 'gaodao',
      lang: 'en',
      payment_option_id: OPTION_ID,
      payment_option: { id: OPTION_ID, title: PRODUCT, fee: AMOUNT, currency: 'USD' },
      decision_cast: { values: [], created_at: now, updated_at: now },
    };
    const { error } = await supabase.from('orders').insert({
      trade_no: orderReference,
      birth_input: JSON.stringify(birthInput),
      paid: false,
      analysis: null,
    });
    if (error) return json(req, { error: 'order_create_failed', details: error.message }, 500, allowedOrigins);
    return json(req, {
      ok: true,
      trade_no: orderReference,
      option_id: OPTION_ID,
      amount: AMOUNT,
      currency: 'USD',
    }, 200, allowedOrigins);
  }

  const orderReference = asString(body.trade_no, 180);
  if (!/^zhanbu-[a-z0-9-]{20,160}$/i.test(orderReference)) {
    return json(req, { error: 'invalid_trade_no' }, 400, allowedOrigins);
  }

  if (action === 'status') {
    const { data } = await supabase
      .from('orders')
      .select('paid,birth_input,analysis')
      .eq('trade_no', orderReference)
      .maybeSingle();
    if (!data) return json(req, { error: 'order_not_found' }, 404, allowedOrigins);
    const birth = parseBirth(data.birth_input);
    if (asString(birth.order_service, 40) !== 'zhanbu') return json(req, { error: 'invalid_order_service' }, 400, allowedOrigins);
    return json(req, {
      ok: true,
      paid: data.paid === true,
      category: asString(birth.category, 80),
      question: asString(birth.question, 1200),
      values: castValues(birth),
      interpretation_ready: Boolean(data.analysis),
      analysis: data.paid === true ? asString(data.analysis, 30000) : '',
    }, 200, allowedOrigins);
  }

  if (action === 'cast') {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data } = await supabase
        .from('orders')
        .select('paid,birth_input')
        .eq('trade_no', orderReference)
        .maybeSingle();
      if (!data) return json(req, { error: 'order_not_found' }, 404, allowedOrigins);
      if (data.paid !== true) return json(req, { error: 'payment_required' }, 402, allowedOrigins);
      const birth = parseBirth(data.birth_input);
      if (asString(birth.order_service, 40) !== 'zhanbu') return json(req, { error: 'invalid_order_service' }, 400, allowedOrigins);
      const values = castValues(birth);
      if (values.length >= 3) return json(req, { ok: true, values, complete: true }, 200, allowedOrigins);

      const next = cryptoNumber(values.length === 2 ? 6 : 8);
      const nextValues = [...values, next];
      const decisionCast = birth.decision_cast && typeof birth.decision_cast === 'object' && !Array.isArray(birth.decision_cast)
        ? birth.decision_cast as Record<string, unknown>
        : {};
      const nextBirth = {
        ...birth,
        decision_cast: {
          ...decisionCast,
          values: nextValues,
          updated_at: new Date().toISOString(),
        },
      };
      const { data: updated } = await supabase
        .from('orders')
        .update({ birth_input: JSON.stringify(nextBirth) })
        .eq('trade_no', orderReference)
        .eq('paid', true)
        .eq('birth_input', data.birth_input)
        .select('trade_no')
        .maybeSingle();
      if (updated) {
        return json(req, {
          ok: true,
          value: next,
          index: nextValues.length - 1,
          values: nextValues,
          complete: nextValues.length === 3,
        }, 200, allowedOrigins);
      }
    }
    return json(req, { error: 'cast_conflict_retry' }, 409, allowedOrigins);
  }

  return json(req, { error: 'unsupported_action' }, 400, allowedOrigins);
});
