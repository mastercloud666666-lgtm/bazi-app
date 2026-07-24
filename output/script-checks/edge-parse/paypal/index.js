// supabase/functions/paypal/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// supabase/functions/_shared/security.ts
var DEFAULT_ALLOWED_ORIGINS = ["https://tengyunzi.com", "https://www.tengyunzi.com"];
function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function resolveAllowedOrigins(envKey = "SECURITY_ALLOWED_ORIGINS", fallback = DEFAULT_ALLOWED_ORIGINS) {
  const fromEnv = asString(Deno.env.get(envKey)).split(",").map((item) => item.trim()).filter(Boolean);
  return fromEnv.length ? fromEnv : fallback;
}
function originFromReferer(referer) {
  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}
function getRequestOrigin(req) {
  const origin = asString(req.headers.get("origin"));
  if (origin) return origin;
  const refererOrigin = originFromReferer(asString(req.headers.get("referer")));
  return refererOrigin;
}
function corsHeaders(req, allowedOrigins) {
  const requestOrigin = getRequestOrigin(req);
  const fallbackOrigin = allowedOrigins[0] || "*";
  const allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : fallbackOrigin;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

// supabase/functions/_shared/membership.ts
function asString2(value) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizeEmail(value) {
  const email = asString2(value).toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : "";
}
function trackingOf(birth) {
  const raw = birth.tracking;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? { ...raw } : {};
}
function membershipPlanOf(birth) {
  const plan = asString2(birth.plan || birth.membership?.plan).toLowerCase();
  return plan === "yearly" ? "yearly" : "monthly";
}
function membershipDays(plan) {
  return plan === "yearly" ? 365 : 30;
}
function membershipUserId(birth) {
  return asString2(birth.user_id || birth.membership?.user_id);
}
function membershipEmail(birth) {
  return normalizeEmail(birth.email || birth.login_email || birth.membership?.email);
}
async function grantMembership(supabase, birth, tradeNo, opts = {}) {
  const next = { ...birth };
  const tracking = trackingOf(next);
  const userId = membershipUserId(next);
  const email = membershipEmail(next);
  const plan = membershipPlanOf(next);
  const days = membershipDays(plan);
  if (!userId) throw new Error("membership_user_missing");
  if (asString2(tracking.membership_granted_at)) {
    return { birth: next, skipped: true, userId, email, plan, expiresAt: asString2(tracking.membership_expires_at) };
  }
  const { data: existing } = await supabase.from("memberships").select("expires_at").eq("user_id", userId).maybeSingle();
  const now = /* @__PURE__ */ new Date();
  const base = existing?.expires_at && new Date(existing.expires_at) > now ? new Date(existing.expires_at) : now;
  base.setUTCDate(base.getUTCDate() + days);
  const expiresAt = base.toISOString();
  const { error } = await supabase.from("memberships").upsert({
    user_id: userId,
    email,
    plan,
    source: opts.source || "cny_pass",
    auto_renew: opts.autoRenew ?? false,
    paypal_subscription_id: opts.paypalSubscriptionId || null,
    status: "active",
    expires_at: expiresAt,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }, { onConflict: "user_id" });
  if (error) throw new Error(`membership_upsert_failed:${error.message}`);
  tracking.membership_granted_at = (/* @__PURE__ */ new Date()).toISOString();
  tracking.membership_plan = plan;
  tracking.membership_expires_at = expiresAt;
  tracking.membership_trade_no = tradeNo;
  next.tracking = tracking;
  return { birth: next, skipped: false, userId, email, plan, expiresAt };
}

// supabase/functions/paypal/index.ts
var MEMBERSHIP_USD = { monthly: "9.90", yearly: "69.00" };
var PP_ENV = (Deno.env.get("PAYPAL_ENV") || "live").toLowerCase();
var PP_BASE = PP_ENV === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
var USD_PRICE = {
  basic: "3.99",
  pro: "9.99",
  vip: "16.99",
  pdf: "3.99",
  zhanbu: "9.99",
  hepan: "29.00",
  core_chart: "49.00",
  reading: "135.00",
  forecast: "88.00",
  forecast_core: "128.00",
  bundle: "188.00"
};
var OVERSEAS_DISABLED = /* @__PURE__ */ new Set(["consult"]);
var TENGYUNZI_MANUAL_OPTIONS = /* @__PURE__ */ new Set(["core_chart", "reading", "forecast", "forecast_core", "bundle"]);
function asString3(v) {
  return typeof v === "string" ? v.trim() : "";
}
function parseBirth(v) {
  if (!v) return {};
  if (typeof v === "object" && !Array.isArray(v)) return v;
  if (typeof v !== "string") return {};
  try {
    const p = JSON.parse(v);
    return p && typeof p === "object" && !Array.isArray(p) ? p : {};
  } catch {
    return {};
  }
}
function isTengyunziManualBirth(birth) {
  return asString3(birth?.product_family).toLowerCase() === "tengyunzi_manual";
}
function resolveOneTimePriceKey(service, optionId, birth = {}) {
  const normalizedService = asString3(service).toLowerCase();
  const normalizedOption = asString3(optionId).toLowerCase();
  if (normalizedService === "tengyunzi_manual" || isTengyunziManualBirth(birth) && TENGYUNZI_MANUAL_OPTIONS.has(normalizedOption)) {
    return TENGYUNZI_MANUAL_OPTIONS.has(normalizedOption) ? normalizedOption : "reading";
  }
  if (normalizedService === "zhanbu") return "zhanbu";
  if (normalizedService === "hepan") return "hepan";
  return normalizedOption || "basic";
}
async function ppToken() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");
  if (!id || !secret) throw new Error("paypal_not_configured");
  const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${id}:${secret}`),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.access_token) throw new Error("paypal_token_failed");
  return d.access_token;
}
Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  const CORS = corsHeaders(req, allowedOrigins);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  const rawBody = await req.text();
  let body = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    body = {};
  }
  const action = asString3(body.action);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );
  try {
    if (!action && asString3(body.event_type)) {
      const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
      if (!webhookId) return json({ error: "webhook_not_configured" }, 500);
      const token = await ppToken();
      const verifyRes = await fetch(`${PP_BASE}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_algo: req.headers.get("paypal-auth-algo"),
          cert_url: req.headers.get("paypal-cert-url"),
          transmission_id: req.headers.get("paypal-transmission-id"),
          transmission_sig: req.headers.get("paypal-transmission-sig"),
          transmission_time: req.headers.get("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody)
        })
      });
      const verify = await verifyRes.json().catch(() => ({}));
      if (verify.verification_status !== "SUCCESS") return json({ error: "invalid_signature" }, 400);
      const evt = asString3(body.event_type);
      const resource = body.resource || {};
      if (evt === "PAYMENT.SALE.COMPLETED") {
        const subId = asString3(resource.billing_agreement_id);
        if (!subId) return json({ ok: true, ignored: "no_subscription" });
        const { data: mem } = await supabase.from("memberships").select("*").eq("paypal_subscription_id", subId).maybeSingle();
        if (!mem) return json({ ok: true, ignored: "membership_not_found" });
        const days = mem.plan === "yearly" ? 365 : 30;
        const now = /* @__PURE__ */ new Date();
        const base = mem.expires_at && new Date(mem.expires_at) > now ? new Date(mem.expires_at) : now;
        base.setUTCDate(base.getUTCDate() + days);
        await supabase.from("memberships").update({
          expires_at: base.toISOString(),
          status: "active",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("user_id", mem.user_id);
        return json({ ok: true, extended_to: base.toISOString() });
      }
      if (evt === "BILLING.SUBSCRIPTION.CANCELLED" || evt === "BILLING.SUBSCRIPTION.EXPIRED" || evt === "BILLING.SUBSCRIPTION.SUSPENDED") {
        const subId = asString3(resource.id);
        if (subId) {
          await supabase.from("memberships").update({ auto_renew: false, status: "cancelled", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("paypal_subscription_id", subId);
        }
        return json({ ok: true, marked: "cancelled" });
      }
      return json({ ok: true, ignored: evt });
    }
    if (action === "create") {
      const tradeNo = asString3(body.trade_no);
      const optionId = asString3(body.option_id).toLowerCase();
      const service = asString3(body.service).toLowerCase() || "bazi";
      const origin = asString3(body.origin) || (allowedOrigins[0] || "https://www.tengyunzi.com");
      if (!tradeNo) return json({ error: "trade_no required" }, 400);
      if (OVERSEAS_DISABLED.has(optionId) || OVERSEAS_DISABLED.has(service)) {
        return json({ error: "option_unavailable_overseas", message: "\u8BE5\u670D\u52A1\u6682\u672A\u5BF9\u6D77\u5916\u5F00\u653E\u3002" }, 400);
      }
      const priceKey = resolveOneTimePriceKey(service, optionId);
      const amount = USD_PRICE[priceKey] || USD_PRICE.basic;
      const token = await ppToken();
      const retPage = service === "zhanbu" ? "zhanbu.html" : service === "tengyunzi_manual" ? "tengyunzi-order-success.html" : "result.html";
      const returnUrl = `${origin}/${retPage}?trade_no=${encodeURIComponent(tradeNo)}&pp=1`;
      const cancelUrl = `${origin}/${retPage}?trade_no=${encodeURIComponent(tradeNo)}&pp=cancel`;
      const res = await fetch(`${PP_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: { currency_code: "USD", value: amount },
            custom_id: tradeNo,
            description: `Yunzi report ${priceKey}`
          }],
          application_context: {
            brand_name: "Yunzi Culture",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: returnUrl,
            cancel_url: cancelUrl
          }
        })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.id) return json({ error: "paypal_create_failed", detail: d }, 502);
      const approve = (d.links || []).find((l) => l.rel === "approve");
      return json({ id: d.id, approve_url: approve?.href, amount });
    }
    if (action === "capture") {
      const ppOrderId = asString3(body.paypal_order_id);
      if (!ppOrderId) return json({ error: "paypal_order_id required" }, 400);
      const token = await ppToken();
      const res = await fetch(`${PP_BASE}/v2/checkout/orders/${ppOrderId}/capture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.status !== "COMPLETED") {
        return json({ error: "capture_failed", status: d.status || res.status, detail: d }, 402);
      }
      const pu = (d.purchase_units || [])[0] || {};
      const capture = (pu.payments?.captures || [])[0] || {};
      const tradeNo = asString3(pu.custom_id) || asString3(capture.custom_id) || asString3(body.trade_no);
      if (!tradeNo) return json({ error: "trade_no_missing" }, 400);
      const { data: order } = await supabase.from("orders").select("paid,birth_input").eq("trade_no", tradeNo).single();
      if (!order) return json({ error: "order_not_found" }, 404);
      const birth = parseBirth(order.birth_input);
      const optionId = asString3(birth?.payment_option?.id || birth?.payment_option_id).toLowerCase();
      const storedService = asString3(birth?.order_service).toLowerCase() || "bazi";
      const priceKey = resolveOneTimePriceKey(storedService, optionId, birth);
      const expectedAmount = USD_PRICE[priceKey];
      const capturedAmount = asString3(capture?.amount?.value);
      const capturedCurrency = asString3(capture?.amount?.currency_code).toUpperCase();
      if (!expectedAmount || capturedCurrency !== "USD" || Math.abs(Number(capturedAmount) - Number(expectedAmount)) > 1e-3) {
        return json({
          error: "captured_amount_mismatch",
          expected: { currency: "USD", value: expectedAmount || null },
          captured: { currency: capturedCurrency || null, value: capturedAmount || null }
        }, 402);
      }
      birth.tracking = { ...birth.tracking || {}, paypal_paid_at: (/* @__PURE__ */ new Date()).toISOString(), paypal_order_id: ppOrderId };
      await supabase.from("orders").update({ paid: true, birth_input: JSON.stringify(birth) }).eq("trade_no", tradeNo);
      const orderService = birth?.order_service === "hepan" ? "hepan" : birth?.order_service === "zhanbu" ? "zhanbu" : birth?.order_service === "pdf" || optionId === "pdf" ? "pdf" : birth?.order_service === "consult" || optionId === "consult" ? "consult" : "bazi";
      if (isTengyunziManualBirth(birth)) {
        await supabase.from("order_intakes").update({
          payment_status: "paid",
          status: "paid_ready",
          checkout_provider: "paypal",
          checkout_session_id: ppOrderId,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("order_reference", tradeNo);
        return json({
          ok: true,
          paid: true,
          service: "tengyunzi_manual",
          product: asString3(birth?.product || birth?.payment_option?.title),
          trade_no: tradeNo
        });
      }
      if (orderService === "pdf" || orderService === "consult" || orderService === "zhanbu") {
        return json({ ok: true, paid: true, service: orderService });
      }
      const analyzePayload = { trade_no: tradeNo, service: orderService, lang: birth?.lang };
      if (orderService === "hepan") {
        analyzePayload.man_bazi_str = birth.man_bazi_str;
        analyzePayload.woman_bazi_str = birth.woman_bazi_str;
        analyzePayload.man_dayun = birth.man_dayun;
        analyzePayload.woman_dayun = birth.woman_dayun;
        analyzePayload.current_year = Number(birth.current_year) || (/* @__PURE__ */ new Date()).getFullYear();
        analyzePayload.stream = false;
      } else {
        analyzePayload.free_only = false;
        analyzePayload.payment_option_id = birth?.payment_option?.id || "basic";
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
      const analyzeTask = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
        body: JSON.stringify(analyzePayload)
      }).catch((err) => console.error("paypal analyze trigger failed", tradeNo, err));
      try {
        globalThis.EdgeRuntime?.waitUntil?.(analyzeTask);
      } catch (_e) {
      }
      return json({ ok: true, paid: true, service: orderService });
    }
    if (action === "setup_plans") {
      const token = await ppToken();
      const prodRes = await fetch(`${PP_BASE}/v1/catalogs/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Yunzi Membership", description: "Yunzi Culture membership", type: "SERVICE", category: "SOFTWARE" })
      });
      const prod = await prodRes.json().catch(() => ({}));
      if (!prodRes.ok || !prod.id) return json({ error: "product_failed", detail: prod }, 502);
      const mkPlan = async (name, unit, price) => {
        const r = await fetch(`${PP_BASE}/v1/billing/plans`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: prod.id,
            name,
            status: "ACTIVE",
            billing_cycles: [{
              frequency: { interval_unit: unit, interval_count: 1 },
              tenure_type: "REGULAR",
              sequence: 1,
              total_cycles: 0,
              pricing_scheme: { fixed_price: { value: price, currency_code: "USD" } }
            }],
            payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: "CONTINUE", payment_failure_threshold: 1 }
          })
        });
        return await r.json().catch(() => ({}));
      };
      const monthly = await mkPlan("Yunzi Membership Monthly", "MONTH", MEMBERSHIP_USD.monthly);
      const yearly = await mkPlan("Yunzi Membership Yearly", "YEAR", MEMBERSHIP_USD.yearly);
      return json({ product_id: prod.id, monthly_plan_id: monthly.id, yearly_plan_id: yearly.id, monthly, yearly });
    }
    if (action === "create_subscription") {
      const tradeNo = asString3(body.trade_no);
      const plan = asString3(body.plan).toLowerCase() === "yearly" ? "yearly" : "monthly";
      const origin = asString3(body.origin) || (allowedOrigins[0] || "https://www.tengyunzi.com");
      if (!tradeNo) return json({ error: "trade_no required" }, 400);
      const planId = Deno.env.get(plan === "yearly" ? "PAYPAL_PLAN_YEARLY" : "PAYPAL_PLAN_MONTHLY");
      if (!planId) return json({ error: "plan_not_configured", message: "PayPal \u8BA2\u9605\u8BA1\u5212\u672A\u914D\u7F6E" }, 500);
      const token = await ppToken();
      const returnUrl = `${origin}/member.html?trade_no=${encodeURIComponent(tradeNo)}&pp_sub=1`;
      const cancelUrl = `${origin}/member.html?trade_no=${encodeURIComponent(tradeNo)}&pp_sub=cancel`;
      const res = await fetch(`${PP_BASE}/v1/billing/subscriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          custom_id: tradeNo,
          application_context: {
            brand_name: "Yunzi Culture",
            user_action: "SUBSCRIBE_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: returnUrl,
            cancel_url: cancelUrl
          }
        })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.id) return json({ error: "subscription_create_failed", detail: d }, 502);
      const approve = (d.links || []).find((l) => l.rel === "approve");
      return json({ subscription_id: d.id, approve_url: approve?.href, plan });
    }
    if (action === "verify_subscription") {
      const subId = asString3(body.subscription_id);
      const tradeNo = asString3(body.trade_no);
      if (!subId) return json({ error: "subscription_id required" }, 400);
      const token = await ppToken();
      const res = await fetch(`${PP_BASE}/v1/billing/subscriptions/${subId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sub = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: "subscription_fetch_failed", detail: sub }, 502);
      if (sub.status !== "ACTIVE" && sub.status !== "APPROVED") {
        return json({ ok: false, status: sub.status }, 200);
      }
      const lookupTradeNo = asString3(sub.custom_id) || tradeNo;
      if (!lookupTradeNo) return json({ error: "trade_no_missing" }, 400);
      const { data: order } = await supabase.from("orders").select("birth_input").eq("trade_no", lookupTradeNo).single();
      if (!order) return json({ error: "order_not_found" }, 404);
      const birth = parseBirth(order.birth_input);
      try {
        const grant = await grantMembership(supabase, birth, lookupTradeNo, {
          source: "paypal_sub",
          autoRenew: true,
          paypalSubscriptionId: subId
        });
        await supabase.from("orders").update({ paid: true, birth_input: JSON.stringify(grant.birth) }).eq("trade_no", lookupTradeNo);
        return json({ ok: true, plan: grant.plan, expires_at: grant.expiresAt });
      } catch (e) {
        return json({ error: "grant_failed", detail: String(e instanceof Error ? e.message : e) }, 500);
      }
    }
    return json({ error: "unknown_action" }, 400);
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
