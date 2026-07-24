// supabase/functions/order-intake/index.ts
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
function isAllowedRequestOrigin(req, allowedOrigins) {
  const requestOrigin = getRequestOrigin(req);
  if (!requestOrigin) return true;
  return allowedOrigins.includes(requestOrigin);
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
function json(req, body, status = 200, allowedOrigins = resolveAllowedOrigins()) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(req, allowedOrigins)
    }
  });
}
function extractClientIp(req) {
  const candidates = [
    asString(req.headers.get("cf-connecting-ip")),
    asString(req.headers.get("x-real-ip")),
    asString(req.headers.get("x-forwarded-for")).split(",")[0]?.trim() || "",
    asString(req.headers.get("x-client-ip"))
  ].filter(Boolean);
  const candidate = candidates[0] || "unknown";
  return candidate.slice(0, 80);
}
function maskIp(ip) {
  if (!ip || ip === "unknown") return "unknown";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
    return ip;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    return parts.length ? `${parts.slice(0, 3).join(":")}::` : ip;
  }
  return ip;
}
function isLikelyAutomatedUa(uaRaw) {
  const ua = asString(uaRaw).toLowerCase();
  if (!ua) return true;
  const knownCrawler = /(bot|spider|crawler|googlebot|bingbot|baiduspider|bytespider|petalbot|yandexbot|duckduckbot|sogou|slurp|ahrefsbot|semrushbot|mj12bot|dotbot|facebookexternalhit|ia_archiver)/i;
  const scriptClient = /(curl|wget|python-requests|aiohttp|httpclient|go-http-client|okhttp|java\/|libwww-perl|axios|postmanruntime|insomnia|node-fetch|undici|scrapy|playwright|puppeteer|selenium|headlesschrome|phantomjs)/i;
  if (knownCrawler.test(ua) || scriptClient.test(ua)) return true;
  return false;
}
async function sha256Hex(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function buildRateLimitIdentifier(req) {
  const salt = asString(Deno.env.get("SECURITY_RATE_LIMIT_SALT")) || "default-salt-change-me";
  const ip = extractClientIp(req);
  const ua = asString(req.headers.get("user-agent")).slice(0, 180);
  return sha256Hex(`${salt}|${ip}|${ua}`);
}
async function consumeRateLimit(supabase, params) {
  const nowMs = Date.now();
  const windowMs = Math.max(1, Number(params.windowSeconds || 60)) * 1e3;
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const windowEndMs = windowStartMs + windowMs;
  const windowStartIso = new Date(windowStartMs).toISOString();
  const windowEndIso = new Date(windowEndMs).toISOString();
  try {
    const { data, error } = await supabase.rpc("consume_api_rate_limit", {
      p_scope: params.scope,
      p_identifier: params.identifier,
      p_window_seconds: params.windowSeconds,
      p_limit: params.maxRequests
    });
    if (error) {
      const msg = String(error.message || "rate_limit_rpc_error");
      if (msg.includes("consume_api_rate_limit") && (msg.includes("does not exist") || msg.includes("not found"))) {
        return {
          allowed: true,
          currentCount: 0,
          retryAfterSeconds: 0,
          windowStart: "",
          windowEnd: "",
          disabled: true,
          reason: "rpc_missing"
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
      reason: "ok"
    };
  } catch (err) {
    try {
      const { data: existing } = await supabase.from("api_rate_limits").select("request_count").eq("scope", params.scope).eq("identifier", params.identifier).eq("window_start", windowStartIso).maybeSingle();
      let currentCount = Number(existing?.request_count || 0);
      if (!existing) {
        const { error: insertError } = await supabase.from("api_rate_limits").insert({
          scope: params.scope,
          identifier: params.identifier,
          window_start: windowStartIso,
          request_count: 1
        });
        if (insertError) {
          const { data: retryRow } = await supabase.from("api_rate_limits").select("request_count").eq("scope", params.scope).eq("identifier", params.identifier).eq("window_start", windowStartIso).maybeSingle();
          currentCount = Number(retryRow?.request_count || 1);
          await supabase.from("api_rate_limits").update({ request_count: currentCount + 1, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("scope", params.scope).eq("identifier", params.identifier).eq("window_start", windowStartIso);
          currentCount += 1;
        } else {
          currentCount = 1;
        }
      } else {
        currentCount += 1;
        await supabase.from("api_rate_limits").update({ request_count: currentCount, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("scope", params.scope).eq("identifier", params.identifier).eq("window_start", windowStartIso);
      }
      const retryAfter = Math.max(0, Math.ceil((windowEndMs - Date.now()) / 1e3));
      return {
        allowed: currentCount <= params.maxRequests,
        currentCount,
        retryAfterSeconds: retryAfter,
        windowStart: windowStartIso,
        windowEnd: windowEndIso,
        disabled: false,
        reason: "table_fallback"
      };
    } catch (fallbackErr) {
      console.warn("consumeRateLimit failed:", err, fallbackErr);
      return {
        allowed: true,
        currentCount: 0,
        retryAfterSeconds: 0,
        windowStart: "",
        windowEnd: "",
        disabled: true,
        reason: "fallback_allow"
      };
    }
  }
}
async function recordAbuseLog(supabase, payload) {
  try {
    await supabase.from("api_abuse_logs").insert({
      scope: payload.scope,
      identifier: payload.identifier,
      event: payload.event,
      meta: payload.meta || {}
    });
  } catch (err) {
    console.warn("recordAbuseLog failed:", err);
  }
}
function tooManyRequestsResponse(req, allowedOrigins, params) {
  const retryAfterSeconds = Math.max(1, Number(params.retryAfterSeconds || 60));
  return new Response(JSON.stringify({
    error: "too_many_requests",
    message: params.message || "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
    retry_after_seconds: retryAfterSeconds,
    scope: params.scope || "",
    current_count: Number(params.currentCount || 0)
  }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSeconds),
      ...corsHeaders(req, allowedOrigins)
    }
  });
}

// supabase/functions/order-intake/index.ts
var DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
var DEFAULT_RATE_LIMIT_MAX_REQUESTS = 5;
var PRODUCTS = /* @__PURE__ */ new Set([
  "Core Chart Report",
  "Full Personal Reading",
  "12-Month Forecast",
  "Forecast + Core Chart",
  "Reading + Forecast Bundle"
]);
var PRODUCT_CONFIG = {
  "Core Chart Report": { optionId: "core_chart", amount: "49.00" },
  "Full Personal Reading": { optionId: "reading", amount: "135.00" },
  "12-Month Forecast": { optionId: "forecast", amount: "88.00" },
  "Forecast + Core Chart": { optionId: "forecast_core", amount: "128.00" },
  "Reading + Forecast Bundle": { optionId: "bundle", amount: "188.00" }
};
function json2(req, body, status = 200, allowedOrigins = resolveAllowedOrigins()) {
  return json(req, body, status, allowedOrigins);
}
function asString2(value, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}
function readEnvNumber(name, fallback, min, max) {
  const value = Number(String(Deno.env.get(name) || "").trim());
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}
function normalizeEmail(value) {
  return asString2(value, 320).toLowerCase();
}
function isValidEmail(email) {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
function optionalInt(value, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
}
function sanitizeProduct(value) {
  const product = asString2(value, 80);
  return PRODUCTS.has(product) ? product : "Full Personal Reading";
}
function makeTradeNo() {
  const token = crypto.randomUUID().replaceAll("-", "").slice(0, 18);
  return `bazi-tzy-${Date.now()}-${token}`;
}
function sanitizeSource(value) {
  const cleaned = asString2(value, 64).toLowerCase().replace(/[^\w.-]/g, "");
  return cleaned || "paid-offer";
}
function sanitizeLang(value) {
  const lang = asString2(value, 24);
  if (["zh-Hans", "zh-Hant", "en"].includes(lang)) return lang;
  return lang ? lang.replace(/[^\w-]/g, "").slice(0, 24) : "en";
}
function sanitizeCalendar(value) {
  const calendar = asString2(value, 12).toLowerCase();
  if (calendar === "lunar") return "lunar";
  if (calendar === "unknown") return "unknown";
  return "solar";
}
function sanitizeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.replace(/[^\w.-]/g, "").slice(0, 48);
    if (!key) continue;
    if (typeof rawValue === "string") out[key] = rawValue.trim().slice(0, 320);
    else if (typeof rawValue === "number" && Number.isFinite(rawValue)) out[key] = rawValue;
    else if (typeof rawValue === "boolean") out[key] = rawValue;
  }
  return out;
}
Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders(req, allowedOrigins) });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders(req, allowedOrigins) });
  }
  if (!isAllowedRequestOrigin(req, allowedOrigins)) {
    return json2(req, { error: "origin_not_allowed" }, 403, allowedOrigins);
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (asString2(body?.website, 200)) {
      return json2(req, { ok: true, submitted: true }, 200, allowedOrigins);
    }
    const email = normalizeEmail(body?.email);
    const question = asString2(body?.question, 2400);
    if (!isValidEmail(email)) return json2(req, { error: "invalid_email" }, 400, allowedOrigins);
    if (question.length < 10) return json2(req, { error: "question_too_short" }, 400, allowedOrigins);
    const birthYear = optionalInt(body?.birth_year, 1900, 2100);
    const birthMonth = optionalInt(body?.birth_month, 1, 12);
    const birthDay = optionalInt(body?.birth_day, 1, 31);
    if (!birthYear || !birthMonth || !birthDay) {
      return json2(req, { error: "invalid_birth_date" }, 400, allowedOrigins);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json2(req, { error: "missing_supabase_env" }, 500, allowedOrigins);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const rateIdentifier = await buildRateLimitIdentifier(req);
    const rateWindowSeconds = readEnvNumber(
      "RATE_LIMIT_ORDER_INTAKE_WINDOW_SECONDS",
      DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      10,
      3600
    );
    const rateMaxRequests = readEnvNumber(
      "RATE_LIMIT_ORDER_INTAKE_MAX_REQUESTS",
      DEFAULT_RATE_LIMIT_MAX_REQUESTS,
      1,
      60
    );
    const rateResult = await consumeRateLimit(supabase, {
      scope: "order-intake",
      identifier: rateIdentifier,
      windowSeconds: rateWindowSeconds,
      maxRequests: rateMaxRequests
    });
    const userAgent = asString2(req.headers.get("user-agent"), 240);
    const clientIpMasked = maskIp(extractClientIp(req));
    if (!rateResult.allowed) {
      await recordAbuseLog(supabase, {
        scope: "order-intake",
        identifier: rateIdentifier,
        event: "rate_limited",
        meta: {
          ip_masked: clientIpMasked,
          current_count: rateResult.currentCount,
          max_requests: rateMaxRequests,
          window_seconds: rateWindowSeconds
        }
      });
      return tooManyRequestsResponse(req, allowedOrigins, {
        message: "Too many order intake attempts. Please try again later.",
        retryAfterSeconds: rateResult.retryAfterSeconds,
        scope: "order-intake",
        currentCount: rateResult.currentCount
      });
    }
    if (Deno.env.get("SECURITY_BLOCK_BOT_UA_ORDER_INTAKE") !== "0" && isLikelyAutomatedUa(userAgent)) {
      await recordAbuseLog(supabase, {
        scope: "order-intake",
        identifier: rateIdentifier,
        event: "blocked_bot_ua",
        meta: { ip_masked: clientIpMasked, ua: userAgent.slice(0, 160) }
      });
      return json2(req, { error: "blocked_bot_ua" }, 403, allowedOrigins);
    }
    const product = sanitizeProduct(body?.product);
    const productConfig = PRODUCT_CONFIG[product] || PRODUCT_CONFIG["Full Personal Reading"];
    const tradeNo = makeTradeNo();
    const intakeId = crypto.randomUUID();
    const name = asString2(body?.name, 120) || null;
    const birthHour = asString2(body?.birth_hour, 32) || null;
    const birthPlace = asString2(body?.birth_place, 180) || null;
    const gender = asString2(body?.gender, 40) || null;
    const calendarType = sanitizeCalendar(body?.calendar_type);
    const focusArea = asString2(body?.focus_area, 120) || null;
    const eventOne = asString2(body?.event_one, 500) || null;
    const eventTwo = asString2(body?.event_two, 500) || null;
    const language = sanitizeLang(body?.language);
    const payload = {
      id: intakeId,
      product,
      email,
      email_normalized: email,
      name,
      birth_year: birthYear,
      birth_month: birthMonth,
      birth_day: birthDay,
      birth_hour: birthHour,
      birth_place: birthPlace,
      gender,
      calendar_type: calendarType,
      focus_area: focusArea,
      question,
      event_one: eventOne,
      event_two: eventTwo,
      payment_status: "checkout_started",
      checkout_provider: "paypal",
      checkout_session_id: asString2(body?.checkout_session_id, 180) || null,
      order_reference: tradeNo,
      source: sanitizeSource(body?.source),
      language,
      page_path: asString2(body?.page_path, 240) || null,
      landing_url: asString2(body?.landing_url, 500) || null,
      referrer: asString2(body?.referrer, 500) || null,
      utm_source: asString2(body?.utm_source, 120) || null,
      utm_medium: asString2(body?.utm_medium, 120) || null,
      utm_campaign: asString2(body?.utm_campaign, 160) || null,
      metadata: {
        ...sanitizeMetadata(body?.metadata),
        payment_option_id: productConfig.optionId,
        amount: productConfig.amount,
        currency: "USD",
        ip_masked: clientIpMasked,
        user_agent: userAgent.slice(0, 180)
      },
      status: "needs_payment",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const orderBirthInput = {
      order_service: "pdf",
      product_family: "tengyunzi_manual",
      intake_id: intakeId,
      product,
      name,
      email,
      year: birthYear,
      month: birthMonth,
      day: birthDay,
      hour: birthHour,
      birth_place: birthPlace,
      gender,
      calendar_type: calendarType,
      focus_area: focusArea,
      question,
      event_one: eventOne,
      event_two: eventTwo,
      lang: language,
      payment_option_id: productConfig.optionId,
      payment_option: {
        id: productConfig.optionId,
        title: product,
        fee: productConfig.amount,
        currency: "USD"
      },
      consult_intake: {
        nickname: name || "",
        contact: email,
        birth_datetime: `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")} ${birthHour || "unknown"}`,
        gender: gender || "",
        birthplace: birthPlace || "",
        question: [
          question,
          eventOne ? `Event 1: ${eventOne}` : "",
          eventTwo ? `Event 2: ${eventTwo}` : ""
        ].filter(Boolean).join("\n"),
        preferred_time: "Email delivery within 72 hours",
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      tracking: {
        source: sanitizeSource(body?.source),
        intake_created_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    const { error: orderError } = await supabase.from("orders").insert({
      trade_no: tradeNo,
      birth_input: JSON.stringify(orderBirthInput),
      paid: false,
      analysis: null
    });
    if (orderError) {
      return json2(req, { error: "order_create_failed", details: orderError.message }, 500, allowedOrigins);
    }
    const { data, error } = await supabase.from("order_intakes").insert(payload).select("id,status,payment_status,created_at").maybeSingle();
    if (error) {
      await supabase.from("orders").delete().eq("trade_no", tradeNo).eq("paid", false);
      return json2(req, { error: "order_intake_insert_failed", details: error.message }, 500, allowedOrigins);
    }
    return json2(req, {
      ok: true,
      submitted: true,
      intake_id: data?.id || null,
      order_reference: tradeNo,
      payment_option_id: productConfig.optionId,
      amount: productConfig.amount,
      currency: "USD",
      status: data?.status || "needs_payment",
      payment_status: data?.payment_status || "checkout_started"
    }, 200, allowedOrigins);
  } catch (err) {
    return json2(req, { error: err instanceof Error ? err.message : String(err) }, 500, allowedOrigins);
  }
});
