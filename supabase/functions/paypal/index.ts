// PayPal 收款（海外）：create 下单 + capture 捕获后标记已付并触发报告生成。
// 复用 orders 表（订单行由前端 ensureOrderSnapshot 预先写入）。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, resolveAllowedOrigins } from '../_shared/security.ts';

const PP_ENV = (Deno.env.get('PAYPAL_ENV') || 'live').toLowerCase();
const PP_BASE = PP_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

// 海外美元定价（按需调整）。consult 暂不开放（无 WhatsApp/Telegram 交付渠道）。
const USD_PRICE: Record<string, string> = {
  basic: '3.99', pro: '9.99', vip: '16.99', pdf: '3.99', zhanbu: '9.99', hepan: '29.00',
};
const OVERSEAS_DISABLED = new Set(['consult']);

function asString(v: unknown): string { return typeof v === 'string' ? v.trim() : ''; }
function parseBirth(v: unknown): Record<string, any> {
  if (!v) return {};
  if (typeof v === 'object' && !Array.isArray(v)) return v as Record<string, any>;
  if (typeof v !== 'string') return {};
  try { const p = JSON.parse(v); return p && typeof p === 'object' && !Array.isArray(p) ? p : {}; } catch { return {}; }
}

async function ppToken(): Promise<string> {
  const id = Deno.env.get('PAYPAL_CLIENT_ID');
  const secret = Deno.env.get('PAYPAL_SECRET');
  if (!id || !secret) throw new Error('paypal_not_configured');
  const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${id}:${secret}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.access_token) throw new Error('paypal_token_failed');
  return d.access_token;
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  const CORS = corsHeaders(req, allowedOrigins);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { body = {}; }
  const action = asString(body.action);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    if (action === 'create') {
      const tradeNo = asString(body.trade_no);
      const optionId = asString(body.option_id).toLowerCase();
      const service = asString(body.service).toLowerCase() || 'bazi';
      const origin = asString(body.origin) || (allowedOrigins[0] || 'https://www.tengyunzi.com');
      if (!tradeNo) return json({ error: 'trade_no required' }, 400);
      if (OVERSEAS_DISABLED.has(optionId) || OVERSEAS_DISABLED.has(service)) {
        return json({ error: 'option_unavailable_overseas', message: '该服务暂未对海外开放。' }, 400);
      }

      const priceKey = service === 'zhanbu' ? 'zhanbu' : (service === 'hepan' ? 'hepan' : (optionId || 'basic'));
      const amount = USD_PRICE[priceKey] || USD_PRICE.basic;

      const token = await ppToken();
      const retPage = service === 'zhanbu' ? 'zhanbu.html' : 'result.html';
      const returnUrl = `${origin}/${retPage}?trade_no=${encodeURIComponent(tradeNo)}&pp=1`;
      const cancelUrl = `${origin}/${retPage}?trade_no=${encodeURIComponent(tradeNo)}&pp=cancel`;
      const res = await fetch(`${PP_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: 'USD', value: amount },
            custom_id: tradeNo,
            description: `Yunzi report ${priceKey}`,
          }],
          application_context: {
            brand_name: 'Yunzi Culture',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.id) return json({ error: 'paypal_create_failed', detail: d }, 502);
      const approve = (d.links || []).find((l: any) => l.rel === 'approve');
      return json({ id: d.id, approve_url: approve?.href, amount });
    }

    if (action === 'capture') {
      const ppOrderId = asString(body.paypal_order_id);
      if (!ppOrderId) return json({ error: 'paypal_order_id required' }, 400);
      const token = await ppToken();
      const res = await fetch(`${PP_BASE}/v2/checkout/orders/${ppOrderId}/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.status !== 'COMPLETED') {
        return json({ error: 'capture_failed', status: d.status || res.status, detail: d }, 402);
      }
      const pu = (d.purchase_units || [])[0] || {};
      const tradeNo = asString(pu.custom_id) ||
        asString(((pu.payments?.captures || [])[0] || {}).custom_id) || asString(body.trade_no);
      if (!tradeNo) return json({ error: 'trade_no_missing' }, 400);

      const { data: order } = await supabase
        .from('orders').select('paid,birth_input').eq('trade_no', tradeNo).single();
      if (!order) return json({ error: 'order_not_found' }, 404);

      const birth = parseBirth(order.birth_input);
      birth.tracking = { ...(birth.tracking || {}), paypal_paid_at: new Date().toISOString(), paypal_order_id: ppOrderId };
      await supabase.from('orders').update({ paid: true, birth_input: JSON.stringify(birth) }).eq('trade_no', tradeNo);

      const optionId = asString(birth?.payment_option?.id).toLowerCase();
      const orderService = birth?.order_service === 'hepan' ? 'hepan'
        : (birth?.order_service === 'zhanbu' ? 'zhanbu'
          : (birth?.order_service === 'pdf' || optionId === 'pdf' ? 'pdf'
            : (birth?.order_service === 'consult' || optionId === 'consult' ? 'consult' : 'bazi')));

      // pdf/consult/zhanbu 无需在此生成报告（占卜的解读在用户摇卦时才生成）
      if (orderService === 'pdf' || orderService === 'consult' || orderService === 'zhanbu') {
        return json({ ok: true, paid: true, service: orderService });
      }

      const analyzePayload: Record<string, unknown> = { trade_no: tradeNo, service: orderService, lang: birth?.lang };
      if (orderService === 'hepan') {
        analyzePayload.man_bazi_str = birth.man_bazi_str;
        analyzePayload.woman_bazi_str = birth.woman_bazi_str;
        analyzePayload.man_dayun = birth.man_dayun;
        analyzePayload.woman_dayun = birth.woman_dayun;
        analyzePayload.current_year = Number(birth.current_year) || new Date().getFullYear();
        analyzePayload.stream = false;
      } else {
        analyzePayload.free_only = false;
        analyzePayload.payment_option_id = birth?.payment_option?.id || 'basic';
        analyzePayload.year = birth.year;
        analyzePayload.month = birth.month;
        analyzePayload.day = birth.day;
        analyzePayload.hour = birth.hour;
        analyzePayload.gender = birth.gender;
        analyzePayload.bazi_str = birth.bazi_str;
        analyzePayload.dayun_text = birth.dayun_text;
        analyzePayload.special_years_text = birth.special_years_text;
        analyzePayload.start_age = birth.start_age;
      }

      const analyzeTask = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
        body: JSON.stringify(analyzePayload),
      }).catch((err) => console.error('paypal analyze trigger failed', tradeNo, err));
      try { (globalThis as any).EdgeRuntime?.waitUntil?.(analyzeTask); } catch (_e) {}

      return json({ ok: true, paid: true, service: orderService });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
