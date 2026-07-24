// PayPal 收款（海外）：create 下单 + capture 捕获后标记已付并触发报告生成。
// 复用 orders 表（订单行由前端 ensureOrderSnapshot 预先写入）。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  getRequestOrigin,
  isAllowedOrigin,
  isAllowedRequestOrigin,
  resolveAllowedOrigins,
} from '../_shared/security.ts';
import {
  authenticateAdminRequest,
  recordAdminAudit,
} from '../_shared/admin-auth.ts';
import { grantMembership } from '../_shared/membership.ts';
import { reportPriceForBirth, resolveReportPricing, experimentVisitorFromBirth } from '../_shared/report-pricing.ts';

// 会员订阅美元定价（PayPal 自动续订）
const MEMBERSHIP_USD: Record<string, string> = { monthly: '9.90', yearly: '69.00' };

const PP_ENV = (Deno.env.get('PAYPAL_ENV') || 'live').toLowerCase();
const PP_BASE = PP_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

// 海外美元定价（按需调整）。consult 暂不开放（无 WhatsApp/Telegram 交付渠道）。
const USD_PRICE: Record<string, string> = {
  basic: '3.99', pro: '9.99', vip: '16.99', pdf: '3.99', zhanbu: '9.99', hepan: '29.00',
  english_report: '9.99',
  personal_reading: '99.00',
  core_chart: '49.00', reading: '135.00', forecast: '88.00', forecast_core: '128.00', bundle: '169.00',
};
const OVERSEAS_DISABLED = new Set(['consult']);
const TENGYUNZI_MANUAL_OPTIONS = new Set(['personal_reading', 'core_chart', 'reading', 'forecast', 'forecast_core', 'bundle']);

function asString(v: unknown): string { return typeof v === 'string' ? v.trim() : ''; }
function parseBirth(v: unknown): Record<string, any> {
  if (!v) return {};
  if (typeof v === 'object' && !Array.isArray(v)) return v as Record<string, any>;
  if (typeof v !== 'string') return {};
  try { const p = JSON.parse(v); return p && typeof p === 'object' && !Array.isArray(p) ? p : {}; } catch { return {}; }
}

function isTengyunziManualBirth(birth: Record<string, any>): boolean {
  return asString(birth?.product_family).toLowerCase() === 'tengyunzi_manual';
}

function isTengyunziAiBirth(birth: Record<string, any>): boolean {
  return asString(birth?.product_family).toLowerCase() === 'tengyunzi_ai';
}

function isDailyAlmanacBirth(birth: Record<string, any>): boolean {
  return ['daily_almanac', 'monthly_bazi'].includes(asString(birth?.product_family).toLowerCase())
    || ['daily_almanac', 'monthly_bazi'].includes(asString(birth?.membership?.product).toLowerCase());
}

async function activateDailyAlmanac(
  supabase: ReturnType<typeof createClient>,
  birth: Record<string, any>,
) {
  if (!isDailyAlmanacBirth(birth)) return;
  const userId = asString(birth?.user_id || birth?.membership?.user_id);
  const email = asString(birth?.email || birth?.membership?.email).toLowerCase();
  if (!userId || !email) return;
  const now = new Date().toISOString();
  const { data: profile } = await supabase
    .from('daily_almanac_profiles')
    .update({ enabled: true, email, updated_at: now })
    .eq('user_id', userId)
    .select('language')
    .maybeSingle();
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('tags,metadata')
    .eq('email_normalized', email)
    .maybeSingle();
  await supabase.from('newsletter_subscribers')
    .update({ user_id: null, updated_at: now })
    .eq('user_id', userId)
    .neq('email_normalized', email);
  await supabase.from('newsletter_subscribers').upsert({
    user_id: userId,
    email,
    email_normalized: email,
    status: 'subscribed',
    source: 'monthly-bazi-membership',
    language: profile?.language || asString(birth?.lang) || 'en',
    page_path: '/tengyunzi-newsletter.html',
    tags: Array.from(new Set([
      ...(Array.isArray(existing?.tags) ? existing.tags : []),
      'personal-monthly-bazi',
      'paid-membership',
    ])),
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

function resolveOneTimePriceKey(service: string, optionId: string, birth: Record<string, any> = {}): string {
  const normalizedService = asString(service).toLowerCase();
  const normalizedOption = asString(optionId).toLowerCase();
  if (
    normalizedService === 'tengyunzi_manual'
    || (isTengyunziManualBirth(birth) && TENGYUNZI_MANUAL_OPTIONS.has(normalizedOption))
  ) {
    return TENGYUNZI_MANUAL_OPTIONS.has(normalizedOption) ? normalizedOption : 'personal_reading';
  }
  if (normalizedService === 'zhanbu') return 'zhanbu';
  if (normalizedService === 'hepan') return 'hepan';
  return normalizedOption || 'basic';
}

function resolveOneTimeAmount(priceKey: string, birth: Record<string, any>): string | undefined {
  if (priceKey === 'english_report') {
    const assigned = reportPriceForBirth(birth, 'ai_report');
    if (assigned) return assigned;
    const legacyFee = asString(birth?.payment_option?.fee);
    return legacyFee === '6.99' ? legacyFee : USD_PRICE.english_report;
  }
  if (priceKey === 'personal_reading') {
    const assigned = reportPriceForBirth(birth, 'personal_reading');
    if (assigned) return assigned;
    const legacyFee = asString(birth?.payment_option?.fee);
    return ['99', '99.00'].includes(legacyFee) ? '99.00' : USD_PRICE.personal_reading;
  }
  return USD_PRICE[priceKey];
}

async function recordPricingPaid(
  supabase: ReturnType<typeof createClient>,
  birth: Record<string, any>,
  tradeNo: string,
  product: 'ai_report' | 'personal_reading',
  revenue: string,
) {
  const pricing = resolveReportPricing(experimentVisitorFromBirth(birth));
  if (!pricing) return;
  await supabase.from('report_price_experiment_events').insert({
    ...pricing,
    event_type: 'paid',
    product,
    trade_no: tradeNo,
    revenue: Number(revenue),
    metadata: { source: 'paypal' },
  });
}

function resolveReturnOrigin(value: unknown, allowedOrigins: string[]): string {
  const requested = asString(value).replace(/\/+$/, '');
  if (requested && isAllowedOrigin(requested, allowedOrigins)) return requested;
  return (allowedOrigins[0] || 'https://www.tengyunzi.com').replace(/\/+$/, '');
}

function isProductionSiteOrigin(origin: string): boolean {
  return /^https:\/\/(?:www\.)?tengyunzi\.com$/i.test(origin);
}

async function generateAndStoreEnglishReport(
  supabase: ReturnType<typeof createClient>,
  tradeNo: string,
  birth: Record<string, any>,
  paypalOrderId: string,
  origin: string,
) {
  const reportId = asString(birth?.report_id);
  const userId = asString(birth?.user_id);
  const email = asString(birth?.email).toLowerCase();
  if (!reportId || !userId || !email) {
    console.error('english report linkage missing', tradeNo);
    return;
  }

  const { data: existing } = await supabase
    .from('english_ai_reports')
    .select('status')
    .eq('id', reportId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existing?.status === 'ready') return;

  await supabase
    .from('english_ai_reports')
    .update({ status: 'generating', paypal_order_id: paypalOrderId, error_message: null })
    .eq('id', reportId)
    .eq('user_id', userId);

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const analyzeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        Origin: origin,
        'User-Agent': 'Mozilla/5.0 Tengyunzi-PayPal-Report/1.0',
      },
      body: JSON.stringify({
        trade_no: tradeNo,
        service: 'bazi',
        free_only: false,
        payment_option_id: 'english_report',
        stream: false,
        lang: 'en',
        internal_call: true,
        year: birth.year,
        month: birth.month,
        day: birth.day,
        hour: birth.hour,
        hour_known: birth.hour_known,
        gender: birth.gender,
        bazi_str: birth.bazi_str,
        dayun_text: birth.dayun_text,
        special_years_text: birth.special_years_text,
        start_age: birth.start_age,
        chart_data: birth.chart_data,
      }),
    });
    const analysisData = await analyzeResponse.json().catch(() => ({}));
    const analysis = asString(analysisData?.analysis);
    if (!analyzeResponse.ok || !analysis) {
      throw new Error(asString(analysisData?.error) || `analysis_failed_${analyzeResponse.status}`);
    }

    const { error: reportError } = await supabase
      .from('english_ai_reports')
      .update({ status: 'ready', result_text: analysis, error_message: null, paypal_order_id: paypalOrderId })
      .eq('id', reportId)
      .eq('user_id', userId);
    if (reportError) throw new Error(reportError.message);

    const titleDate = [birth.year, birth.month, birth.day].filter(Boolean).join('-');
    await supabase.from('user_records').insert({
      user_id: userId,
      email,
      type: 'bazi',
      title: titleDate ? `Complete BaZi reading for ${titleDate}` : 'Complete BaZi reading',
      category: 'paid_english_report',
      meta: { report_id: reportId, access_type: 'paid', payment_amount: Number(resolveOneTimeAmount('english_report', birth) || 0), currency: 'USD' },
      result_text: analysis,
      trade_no: tradeNo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('english report generation failed', tradeNo, message);
    await supabase
      .from('english_ai_reports')
      .update({ status: 'failed', error_message: message.slice(0, 500), paypal_order_id: paypalOrderId })
      .eq('id', reportId)
      .eq('user_id', userId);
  }
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

  if (action && !isAllowedRequestOrigin(req, allowedOrigins)) {
    return json({ error: 'origin_not_allowed' }, 403);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    if (action === 'status') {
      await ppToken();
      return json({
        ok: true,
        configured: true,
        environment: PP_ENV === 'sandbox' ? 'sandbox' : 'live',
        production_checkout_enabled: PP_ENV !== 'sandbox',
      });
    }

    if (action && PP_ENV === 'sandbox' && isProductionSiteOrigin(getRequestOrigin(req))) {
      return json({
        error: 'paypal_live_not_configured',
        message: 'Checkout is temporarily unavailable while the live payment account is being configured.',
      }, 503);
    }

    if (action === 'admin_order_probe') {
      const adminSession = await authenticateAdminRequest(req, supabase, 'ai_test');
      if (!adminSession) return json({ error: 'admin_probe_not_authorized' }, 403);
      const token = await ppToken();
      const probeReference = `tengyunzi-live-probe-${Date.now()}`;
      const probeResponse = await fetch(`${PP_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: 'USD', value: USD_PRICE.english_report },
            custom_id: probeReference,
            description: 'Tengyunzi checkout readiness probe',
          }],
        }),
      });
      const probeData = await probeResponse.json().catch(() => ({}));
      if (!probeResponse.ok || !probeData.id) {
        return json({ error: 'paypal_probe_failed', details: probeData }, 502);
      }
      await recordAdminAudit(supabase, req, adminSession, 'paypal_checkout_probed', {
        target_type: 'paypal_order',
        target_id: asString(probeData.id),
        metadata: {
          environment: PP_ENV === 'sandbox' ? 'sandbox' : 'live',
          amount: USD_PRICE.english_report,
          currency: 'USD',
          captured: false,
        },
      });
      return json({
        ok: true,
        environment: PP_ENV === 'sandbox' ? 'sandbox' : 'live',
        order_id: probeData.id,
        status: probeData.status,
        amount: USD_PRICE.english_report,
        currency: 'USD',
        approved: false,
        captured: false,
      });
    }

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
      if (evt === 'PAYMENT.CAPTURE.COMPLETED') {
        const tradeNo = asString(resource.custom_id);
        if (!tradeNo) return json({ ok: true, ignored: 'capture_without_custom_id' });
        const { data: storedOrder, error: orderError } = await supabase
          .from('orders')
          .select('paid,birth_input')
          .eq('trade_no', tradeNo)
          .maybeSingle();
        if (orderError || !storedOrder) return json({ ok: true, ignored: 'capture_order_not_found' });
        if (storedOrder.paid) return json({ ok: true, duplicate: true, trade_no: tradeNo });

        const birth = parseBirth(storedOrder.birth_input);
        const optionId = asString(birth?.payment_option?.id || birth?.payment_option_id).toLowerCase();
        const storedService = asString(birth?.order_service).toLowerCase() || 'bazi';
        const priceKey = resolveOneTimePriceKey(storedService, optionId, birth);
        const expectedAmount = resolveOneTimeAmount(priceKey, birth);
        const capturedAmount = asString(resource?.amount?.value);
        const capturedCurrency = asString(resource?.amount?.currency_code).toUpperCase();
        if (
          !expectedAmount
          || capturedCurrency !== 'USD'
          || Math.abs(Number(capturedAmount) - Number(expectedAmount)) > 0.001
        ) {
          return json({
            error: 'webhook_captured_amount_mismatch',
            expected: { currency: 'USD', value: expectedAmount || null },
            captured: { currency: capturedCurrency || null, value: capturedAmount || null },
          }, 400);
        }

        const paypalOrderId = asString(resource?.supplementary_data?.related_ids?.order_id);
        birth.tracking = {
          ...(birth.tracking || {}),
          paypal_paid_at: new Date().toISOString(),
          paypal_order_id: paypalOrderId,
          paypal_capture_id: asString(resource.id),
          payment_source: 'paypal_webhook',
        };
        const { error: paidUpdateError } = await supabase
          .from('orders')
          .update({ paid: true, birth_input: JSON.stringify(birth) })
          .eq('trade_no', tradeNo)
          .eq('paid', false);
        if (paidUpdateError) return json({ error: 'webhook_paid_update_failed' }, 500);

        if (isTengyunziManualBirth(birth)) {
          await supabase
            .from('order_intakes')
            .update({
              payment_status: 'paid',
              status: 'paid_ready',
              checkout_provider: 'paypal',
              checkout_session_id: paypalOrderId || asString(resource.id),
              updated_at: new Date().toISOString(),
            })
            .eq('order_reference', tradeNo);
          if (optionId === 'personal_reading') {
            await recordPricingPaid(supabase, birth, tradeNo, 'personal_reading', expectedAmount);
          }
          return json({ ok: true, paid: true, service: 'tengyunzi_manual', trade_no: tradeNo });
        }

        if (isTengyunziAiBirth(birth)) {
          await recordPricingPaid(supabase, birth, tradeNo, 'ai_report', expectedAmount);
          const generationTask = generateAndStoreEnglishReport(
            supabase,
            tradeNo,
            birth,
            paypalOrderId || asString(resource.id),
            'https://www.tengyunzi.com',
          );
          try { (globalThis as any).EdgeRuntime?.waitUntil?.(generationTask); } catch (_error) {}
          return json({ ok: true, paid: true, service: 'tengyunzi_ai', status: 'generating', trade_no: tradeNo });
        }

        return json({ ok: true, paid: true, service: storedService, trade_no: tradeNo });
      }
      // 续订成功（每期扣费）
      if (evt === 'PAYMENT.SALE.COMPLETED') {
        const subId = asString(resource.billing_agreement_id);
        if (!subId) return json({ ok: true, ignored: 'no_subscription' });
        const { data: mem } = await supabase.from('memberships').select('*').eq('paypal_subscription_id', subId).maybeSingle();
        if (!mem) return json({ ok: true, ignored: 'membership_not_found' });
        const now = new Date();
        const currentExpiry = mem.expires_at ? new Date(mem.expires_at) : null;
        let nextExpiry: Date | null = null;

        const subscriptionResponse = await fetch(`${PP_BASE}/v1/billing/subscriptions/${encodeURIComponent(subId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (subscriptionResponse.ok) {
          const subscription = await subscriptionResponse.json().catch(() => ({}));
          const nextBillingTime = asString(subscription?.billing_info?.next_billing_time);
          const parsedNextBilling = nextBillingTime ? new Date(nextBillingTime) : null;
          if (parsedNextBilling && Number.isFinite(parsedNextBilling.getTime()) && parsedNextBilling > now) {
            nextExpiry = parsedNextBilling;
          }
        }

        // PayPal can retry the same sale event. Only extend locally when the stored
        // period is due and the subscription API did not provide its next bill date.
        if (!nextExpiry) {
          const renewalWindow = now.getTime() + 24 * 60 * 60 * 1000;
          if (!currentExpiry || currentExpiry.getTime() <= renewalWindow) {
            const days = mem.plan === 'yearly' ? 365 : 30;
            const base = currentExpiry && currentExpiry > now ? new Date(currentExpiry) : now;
            base.setUTCDate(base.getUTCDate() + days);
            nextExpiry = base;
          } else {
            nextExpiry = currentExpiry;
          }
        }

        await supabase.from('memberships').update({
          expires_at: nextExpiry.toISOString(), status: 'active', updated_at: new Date().toISOString(),
        }).eq('user_id', mem.user_id);
        return json({ ok: true, synced_to: nextExpiry.toISOString() });
      }
      if (evt === 'BILLING.SUBSCRIPTION.ACTIVATED') {
        const subId = asString(resource.id);
        const tradeNo = asString(resource.custom_id);
        if (!subId || !tradeNo) return json({ ok: true, ignored: 'subscription_activation_missing_link' });
        const { data: order } = await supabase.from('orders').select('birth_input').eq('trade_no', tradeNo).maybeSingle();
        if (!order) return json({ ok: true, ignored: 'subscription_activation_order_not_found' });
        const birth = parseBirth(order.birth_input);
        try {
          const grant = await grantMembership(supabase, birth, tradeNo, {
            source: 'paypal_sub', autoRenew: true, paypalSubscriptionId: subId,
          });
          await supabase.from('orders').update({ paid: true, birth_input: JSON.stringify(grant.birth) }).eq('trade_no', tradeNo);
          await activateDailyAlmanac(supabase, grant.birth);
          return json({ ok: true, activated: true, plan: grant.plan, expires_at: grant.expiresAt });
        } catch (error) {
          return json({
            error: 'subscription_activation_failed',
            detail: String(error instanceof Error ? error.message : error),
          }, 500);
        }
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
      if (!tradeNo) return json({ error: 'trade_no required' }, 400);

      const { data: storedOrder, error: orderError } = await supabase
        .from('orders')
        .select('paid,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (orderError || !storedOrder) return json({ error: 'order_not_found' }, 404);
      if (storedOrder.paid) return json({ error: 'order_already_paid' }, 409);

      const birth = parseBirth(storedOrder.birth_input);
      const requestedOptionId = asString(body.option_id).toLowerCase();
      const requestedService = asString(body.service).toLowerCase() || 'bazi';
      const optionId = asString(birth?.payment_option?.id || birth?.payment_option_id).toLowerCase()
        || requestedOptionId;
      const storedService = asString(birth?.order_service).toLowerCase() || requestedService;
      const service = isTengyunziManualBirth(birth) ? 'tengyunzi_manual' : storedService;
      const origin = resolveReturnOrigin(body.origin, allowedOrigins);
      if (OVERSEAS_DISABLED.has(optionId) || OVERSEAS_DISABLED.has(service)) {
        return json({ error: 'option_unavailable_overseas', message: 'This service is not available through the international checkout.' }, 400);
      }

      const priceKey = resolveOneTimePriceKey(service, optionId, birth);
      const amount = resolveOneTimeAmount(priceKey, birth);
      if (!amount) return json({ error: 'invalid_payment_option' }, 400);

      const token = await ppToken();
      const retPage = service === 'tengyunzi_manual'
        ? 'tengyunzi-order-success.html'
        : 'tengyunzi-report.html';
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
            description: `Tengyunzi report ${priceKey}`,
          }],
          application_context: {
            brand_name: 'Tengyunzi',
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
      const capture = (pu.payments?.captures || [])[0] || {};
      const tradeNo = asString(pu.custom_id) ||
        asString(capture.custom_id) || asString(body.trade_no);
      if (!tradeNo) return json({ error: 'trade_no_missing' }, 400);

      const { data: order } = await supabase
        .from('orders').select('paid,birth_input').eq('trade_no', tradeNo).single();
      if (!order) return json({ error: 'order_not_found' }, 404);

      const birth = parseBirth(order.birth_input);
      const optionId = asString(birth?.payment_option?.id || birth?.payment_option_id).toLowerCase();
      const storedService = asString(birth?.order_service).toLowerCase() || 'bazi';
      const priceKey = resolveOneTimePriceKey(storedService, optionId, birth);
      const expectedAmount = resolveOneTimeAmount(priceKey, birth);
      const capturedAmount = asString(capture?.amount?.value);
      const capturedCurrency = asString(capture?.amount?.currency_code).toUpperCase();
      if (
        !expectedAmount
        || capturedCurrency !== 'USD'
        || Math.abs(Number(capturedAmount) - Number(expectedAmount)) > 0.001
      ) {
        return json({
          error: 'captured_amount_mismatch',
          expected: { currency: 'USD', value: expectedAmount || null },
          captured: { currency: capturedCurrency || null, value: capturedAmount || null },
        }, 402);
      }

      birth.tracking = { ...(birth.tracking || {}), paypal_paid_at: new Date().toISOString(), paypal_order_id: ppOrderId };
      await supabase.from('orders').update({ paid: true, birth_input: JSON.stringify(birth) }).eq('trade_no', tradeNo);

      const orderService = birth?.order_service === 'hepan' ? 'hepan'
        : (birth?.order_service === 'zhanbu' ? 'zhanbu'
          : (birth?.order_service === 'pdf' || optionId === 'pdf' ? 'pdf'
            : (birth?.order_service === 'consult' || optionId === 'consult' ? 'consult' : 'bazi')));

      if (isTengyunziManualBirth(birth)) {
        await supabase
          .from('order_intakes')
          .update({
            payment_status: 'paid',
            status: 'paid_ready',
            checkout_provider: 'paypal',
            checkout_session_id: ppOrderId,
            updated_at: new Date().toISOString(),
          })
          .eq('order_reference', tradeNo);

        if (optionId === 'personal_reading') {
          await recordPricingPaid(supabase, birth, tradeNo, 'personal_reading', expectedAmount);
        }

        return json({
          ok: true,
          paid: true,
          service: 'tengyunzi_manual',
          product: asString(birth?.product || birth?.payment_option?.title),
          trade_no: tradeNo,
        });
      }

      if (isTengyunziAiBirth(birth)) {
        await recordPricingPaid(supabase, birth, tradeNo, 'ai_report', expectedAmount);
        const origin = resolveReturnOrigin(body.origin, allowedOrigins);
        const generationTask = generateAndStoreEnglishReport(supabase, tradeNo, birth, ppOrderId, origin);
        try { (globalThis as any).EdgeRuntime?.waitUntil?.(generationTask); } catch (_error) {}
        return json({
          ok: true,
          paid: true,
          service: 'tengyunzi_ai',
          status: 'generating',
          report_id: asString(birth?.report_id),
          trade_no: tradeNo,
        });
      }

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
      const origin = resolveReturnOrigin(body.origin, allowedOrigins);
      if (!tradeNo) return json({ error: 'trade_no required' }, 400);
      const planId = Deno.env.get(plan === 'yearly' ? 'PAYPAL_PLAN_YEARLY' : 'PAYPAL_PLAN_MONTHLY');
      if (!planId) return json({ error: 'plan_not_configured', message: 'PayPal 订阅计划未配置' }, 500);

      const { data: subscriptionOrder } = await supabase
        .from('orders')
        .select('birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (!subscriptionOrder) return json({ error: 'order_not_found' }, 404);
      const subscriptionBirth = parseBirth(subscriptionOrder.birth_input);
      const requestedReturnPath = asString(body.return_path).replace(/^\/+/, '');
      const returnPage = requestedReturnPath === 'tengyunzi-newsletter.html' && isDailyAlmanacBirth(subscriptionBirth)
        ? requestedReturnPath
        : (isDailyAlmanacBirth(subscriptionBirth) ? 'tengyunzi-newsletter.html' : 'tengyunzi-account.html');

      const token = await ppToken();
      const returnUrl = `${origin}/${returnPage}?trade_no=${encodeURIComponent(tradeNo)}&pp_sub=1`;
      const cancelUrl = `${origin}/${returnPage}?trade_no=${encodeURIComponent(tradeNo)}&pp_sub=cancel`;
      const res = await fetch(`${PP_BASE}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          custom_id: tradeNo,
          application_context: {
            brand_name: isDailyAlmanacBirth(subscriptionBirth) ? 'Tengyunzi Monthly BaZi Forecast' : 'Yunzi Culture',
            user_action: 'SUBSCRIBE_NOW',
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
        await activateDailyAlmanac(supabase, grant.birth);
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
