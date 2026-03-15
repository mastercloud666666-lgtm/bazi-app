import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

const ALLOWED_EVENTS = new Set([
  'order_created',
  'payment_created',
  'payment_page_opened',
  'payment_link_copied',
  'payment_verify_clicked',
  'payment_paid',
  'payment_verified',
  'report_viewed',
  'pdf_download_clicked',
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function validateTradeNo(value: string): boolean {
  return /^(bazi|hepan)-[a-z0-9_-]{4,140}$/i.test(value);
}

function parseBirthInput(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, any>
      : {};
  } catch {
    return {};
  }
}

function sanitizeMeta(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!k || k.length > 48) continue;
    const key = k.replace(/[^\w.-]/g, '').slice(0, 48);
    if (!key) continue;
    if (typeof v === 'string') out[key] = v.slice(0, 240);
    else if (typeof v === 'number' || typeof v === 'boolean') out[key] = v;
  }
  return out;
}

function applyTrackingEvent(birth: Record<string, any>, event: string, meta: Record<string, unknown>, atIso: string) {
  const next = { ...birth };
  const tracking = next.tracking && typeof next.tracking === 'object' && !Array.isArray(next.tracking)
    ? { ...next.tracking as Record<string, any> }
    : {};
  const eventCounts = tracking.event_counts && typeof tracking.event_counts === 'object' && !Array.isArray(tracking.event_counts)
    ? { ...tracking.event_counts as Record<string, number> }
    : {};
  const events = Array.isArray(tracking.events) ? [...tracking.events] : [];

  const milestoneMap: Record<string, string> = {
    order_created: 'order_created_at',
    payment_created: 'payment_created_at',
    payment_page_opened: 'payment_page_opened_at',
    payment_paid: 'payment_paid_at',
    payment_verified: 'payment_verified_at',
    report_viewed: 'report_viewed_at',
    pdf_download_clicked: 'pdf_download_clicked_at',
  };
  const milestoneKey = milestoneMap[event];
  if (milestoneKey && !tracking[milestoneKey]) {
    tracking[milestoneKey] = atIso;
  }

  tracking.last_event = event;
  tracking.last_event_at = atIso;
  eventCounts[event] = Number(eventCounts[event] || 0) + 1;
  tracking.event_counts = eventCounts;

  const eventItem: Record<string, unknown> = { event, at: atIso };
  if (Object.keys(meta).length) eventItem.meta = meta;
  events.push(eventItem);
  tracking.events = events.slice(-40);
  next.tracking = tracking;
  return next;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const tradeNo = String(body?.trade_no || '').trim();
    const event = String(body?.event || '').trim();
    if (!tradeNo || !validateTradeNo(tradeNo)) {
      return json({ error: 'invalid_trade_no' }, 400);
    }
    if (!event || !ALLOWED_EVENTS.has(event)) {
      return json({ error: 'invalid_event' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'missing_supabase_env' }, 500);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('birth_input')
      .eq('trade_no', tradeNo)
      .maybeSingle();
    if (orderError) {
      return json({ error: 'order_query_failed', details: orderError.message }, 500);
    }
    if (!order) {
      return json({ error: 'order_not_found' }, 404);
    }

    const meta = sanitizeMeta(body?.meta);
    const atIso = new Date().toISOString();
    const birth = parseBirthInput(order.birth_input);
    const nextBirth = applyTrackingEvent(birth, event, meta, atIso);

    const { error: updateError } = await supabase
      .from('orders')
      .update({ birth_input: JSON.stringify(nextBirth) })
      .eq('trade_no', tradeNo);
    if (updateError) {
      return json({ error: 'order_update_failed', details: updateError.message }, 500);
    }

    return json({ ok: true, trade_no: tradeNo, event, at: atIso });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
