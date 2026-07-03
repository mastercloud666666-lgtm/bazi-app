// PayPal 收款（海外）：create 下单 + capture 捕获后标记已付并触发报告生成。
// 复用 orders 表（订单行由前端 ensureOrderSnapshot 预先写入）。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, resolveAllowedOrigins } from '../_shared/security.ts';
import { grantMembership } from '../_shared/membership.ts';

// 会员订阅美元定价（PayPal 自动续订）
const MEMBERSHIP_USD: Record<string, string> = { monthly: '9.90', yearly: '69.00' };

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

  const rawBody = await req.text();
  let body: Record<string, any> = {};
  try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { body = {}; }
  const action = asString(body.action);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // ===== PayPal 订阅 Webhook（续订自动延长会员）=====
    if (!action && asString(body.event_type)) {
      const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
      if (!webhookId) return json({ error: 'webhook_not_configured' }, 500);
      const token = await ppToken();
      const verifyRes = await fetch(`${PP_BASE}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_algo: req.headers.get('paypal-auth-algo'),
          cert_url: req.headers.get('paypal-cert-url'),
          transmission_id: req.headers.get('paypal-transmission-id'),
          transmission_sig: req.headers.get('paypal-transmission-sig'),
          transmission_time: req.headers.get('paypal-transmission-time'),
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody),
        }),
      });
      const verify = await verifyRes.json().catch(() => ({}));
      if (verify.verification_status !== 'SUCCESS') return json({ error: 'invalid_signature' }, 400);

      const evt = asString(body.event_type);
      const resource = body.resource || {};
      // 续订成功（每期扣费）
      if (evt === 'PAYMENT.SALE.COMPLETED') {
        const subId = asString(resource.billing_agreement_id);
        if (!subId) return json({ ok: true, ignored: 'no_subscription' });
        const { data: mem } = await supabase.from('memberships').select('*').eq('paypal_subscription_id', subId).maybeSingle();
        if (!mem) return json({ ok: true, ignored: 'membership_not_found' });
        const days = mem.plan === 'yearly' ? 365 : 30;
        const now = new Date();
        const base = mem.expires_at && new Date(mem.expires_at) > now ? new Date(mem.expires_at) : now;
        base.setUTCDate(base.getUTCDate() + days);
        await supabase.from('memberships').update({
          expires_at: base.toISOString(), status: 'active', updated_at: new Date().toISOString(),
        }).eq('user_id', mem.user_id);
        return json({ ok: true, extended_to: base.toISOString() });
      }
      // 订阅取消/过期：标记状态（到期后自然失效，不立即断）
      if (evt === 'BILLING.SUBSCRIPTION.CANCELLED' || evt === 'BILLING.SUBSCRIPTION.EXPIRED' || evt === 'BILLING.SUBSCRIPTION.SUSPENDED') {
        const subId = asString(resource.id);
        if (subId) {
          await supabase.from('memberships').update({ auto_renew: false, status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('paypal_subscription_id', subId);
        }
        return json({ ok: true, marked: 'cancelled' });
      }
      return json({ ok: true, ignored: evt });
    }

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

    // 一次性创建会员产品 + 月/年订阅计划，返回 plan_id（不敏感，可存 env）。跑一次即可。
    if (action === 'setup_plans') {
      const token = await ppToken();
      const prodRes = await fetch(`${PP_BASE}/v1/catalogs/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Yunzi Membership', description: 'Yunzi Culture membership', type: 'SERVICE', category: 'SOFTWARE' }),
      });
      const prod = await prodRes.json().catch(() => ({}));
      if (!prodRes.ok || !prod.id) return json({ error: 'product_failed', detail: prod }, 502);

      const mkPlan = async (name: string, unit: 'MONTH' | 'YEAR', price: string) => {
        const r = await fetch(`${PP_BASE}/v1/billing/plans`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: prod.id, name, status: 'ACTIVE',
            billing_cycles: [{
              frequency: { interval_unit: unit, interval_count: 1 },
              tenure_type: 'REGULAR', sequence: 1, total_cycles: 0,
              pricing_scheme: { fixed_price: { value: price, currency_code: 'USD' } },
            }],
            payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: 'CONTINUE', payment_failure_threshold: 1 },
          }),
        });
        return await r.json().catch(() => ({}));
      };
      const monthly = await mkPlan('Yunzi Membership Monthly', 'MONTH', MEMBERSHIP_USD.monthly);
      const yearly = await mkPlan('Yunzi Membership Yearly', 'YEAR', MEMBERSHIP_USD.yearly);
      return json({ product_id: prod.id, monthly_plan_id: monthly.id, yearly_plan_id: yearly.id, monthly, yearly });
    }

    // 创建 PayPal 订阅（自动续订），返回 approve_url
    if (action === 'create_subscription') {
      const tradeNo = asString(body.trade_no);
      const plan = asString(body.plan).toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
      const origin = asString(body.origin) || (allowedOrigins[0] || 'https://www.tengyunzi.com');
      if (!tradeNo) return json({ error: 'trade_no required' }, 400);
      const planId = Deno.env.get(plan === 'yearly' ? 'PAYPAL_PLAN_YEARLY' : 'PAYPAL_PLAN_MONTHLY');
      if (!planId) return json({ error: 'plan_not_configured', message: 'PayPal 订阅计划未配置' }, 500);

      const token = await ppToken();
      const returnUrl = `${origin}/member.html?trade_no=${encodeURIComponent(tradeNo)}&pp_sub=1`;
      const cancelUrl = `${origin}/member.html?trade_no=${encodeURIComponent(tradeNo)}&pp_sub=cancel`;
      const res = await fetch(`${PP_BASE}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          custom_id: tradeNo,
          application_context: {
            brand_name: 'Yunzi Culture', user_action: 'SUBSCRIBE_NOW',
            shipping_preference: 'NO_SHIPPING', return_url: returnUrl, cancel_url: cancelUrl,
          },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.id) return json({ error: 'subscription_create_failed', detail: d }, 502);
      const approve = (d.links || []).find((l: any) => l.rel === 'approve');
      return json({ subscription_id: d.id, approve_url: approve?.href, plan });
    }

    // 订阅审批回跳后核验并发放会员（首期）
    if (action === 'verify_subscription') {
      const subId = asString(body.subscription_id);
      const tradeNo = asString(body.trade_no);
      if (!subId) return json({ error: 'subscription_id required' }, 400);
      const token = await ppToken();
      const res = await fetch(`${PP_BASE}/v1/billing/subscriptions/${subId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sub = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: 'subscription_fetch_failed', detail: sub }, 502);
      if (sub.status !== 'ACTIVE' && sub.status !== 'APPROVED') {
        return json({ ok: false, status: sub.status }, 200);
      }
      const lookupTradeNo = asString(sub.custom_id) || tradeNo;
      if (!lookupTradeNo) return json({ error: 'trade_no_missing' }, 400);
      const { data: order } = await supabase.from('orders').select('birth_input').eq('trade_no', lookupTradeNo).single();
      if (!order) return json({ error: 'order_not_found' }, 404);
      const birth = parseBirth(order.birth_input);
      try {
        const grant = await grantMembership(supabase, birth, lookupTradeNo, {
          source: 'paypal_sub', autoRenew: true, paypalSubscriptionId: subId,
        });
        await supabase.from('orders').update({ paid: true, birth_input: JSON.stringify(grant.birth) }).eq('trade_no', lookupTradeNo);
        return json({ ok: true, plan: grant.plan, expires_at: grant.expiresAt });
      } catch (e) {
        return json({ error: 'grant_failed', detail: String(e instanceof Error ? e.message : e) }, 500);
      }
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
