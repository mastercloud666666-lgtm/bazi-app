import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier,
  consumeRateLimit,
  corsHeaders,
  extractClientIp,
  isAllowedRequestOrigin,
  json,
  maskIp,
  recordAbuseLog,
  resolveAllowedOrigins,
  tooManyRequestsResponse,
} from '../_shared/security.ts';

const PAYMENT_OPTION_MAP: Record<'basic' | 'pro' | 'vip' | 'pdf', { title: string; total_fee: string }> = {
  basic: { title: 'Basic Bazi Report', total_fee: '0.01' },
  pro: { title: 'Advanced Bazi Report', total_fee: '0.01' },
  vip: { title: 'Premium Full Bazi Report', total_fee: '0.01' },
  pdf: { title: 'Bazi PDF Document', total_fee: '0.01' },
};

const DEFAULT_PRIMARY_API_BASE = 'https://api.xunhupay.com';
const DEFAULT_BACKUP_API_BASE = 'https://api.dpweixin.com';
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 18;

function normalizeApiBase(base: string | undefined, fallback: string) {
  const value = (base || fallback).trim();
  return value.replace(/\/+$/, '');
}

function readEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const value = Number(Deno.env.get(name));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function validateTradeNo(value: string): boolean {
  return /^bazi-[a-z0-9_-]{4,120}$/i.test(value);
}

function normalizePaymentOptionId(value: unknown, fallback: 'basic' | 'pro' | 'vip' | 'pdf' | '' = 'basic'): 'basic' | 'pro' | 'vip' | 'pdf' | '' {
  const id = String(value || '').trim();
  if (id === 'pro') return 'pro';
  if (id === 'vip') return 'vip';
  if (id === 'basic') return 'basic';
  if (id === 'pdf') return 'pdf';
  return fallback;
}

function parseBirthInput(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function applyTrackingEvent(
  birth: Record<string, unknown>,
  event: string,
  meta: Record<string, unknown> = {},
): Record<string, unknown> {
  const next = { ...birth } as Record<string, any>;
  const tracking = next.tracking && typeof next.tracking === 'object' && !Array.isArray(next.tracking)
    ? { ...(next.tracking as Record<string, unknown>) }
    : {};
  const events = Array.isArray((tracking as Record<string, unknown>).events)
    ? [...((tracking as Record<string, unknown>).events as unknown[])]
    : [];
  const now = new Date().toISOString();

  const milestoneMap: Record<string, string> = {
    payment_created: 'payment_created_at',
  };
  const milestoneKey = milestoneMap[event];
  if (milestoneKey && !(tracking as Record<string, unknown>)[milestoneKey]) {
    (tracking as Record<string, unknown>)[milestoneKey] = now;
  }
  (tracking as Record<string, unknown>).last_event = event;
  (tracking as Record<string, unknown>).last_event_at = now;

  events.push({ event, at: now, meta });
  (tracking as Record<string, unknown>).events = events.slice(-30);
  next.tracking = tracking;
  return next;
}

function resolveReturnOrigin(req: Request, fallbackOrigin: string): string {
  const allowlist = (Deno.env.get('PAY_RETURN_ALLOWLIST') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins = allowlist.length ? allowlist : [fallbackOrigin];

  const reqOrigin = (req.headers.get('origin') || '').trim();
  if (reqOrigin && allowedOrigins.includes(reqOrigin)) {
    return reqOrigin;
  }

  const referer = (req.headers.get('referer') || '').trim();
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.includes(refererOrigin)) return refererOrigin;
    } catch {
      // ignore malformed referer
    }
  }

  return fallbackOrigin;
}

function resolveReturnPath(value: unknown): '/result.html' | '/hepan.html' | '/index.html' {
  const path = String(value || '').trim();
  if (path === '/hepan.html') return '/hepan.html';
  if (path === '/index.html') return '/index.html';
  return '/result.html';
}

// Pure JS MD5 implementation (Web Crypto API does not support MD5)
function md5(input: string): string {
  const str = unescape(encodeURIComponent(input));
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);

  function safeAdd(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num: number, cnt: number) {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  const nBytes = bytes.length;
  const nWords = (((nBytes + 8) >>> 6) + 1) * 16;
  const words = new Int32Array(nWords);
  for (let i = 0; i < nBytes; i++) {
    words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }
  words[nBytes >> 2] |= 0x80 << ((nBytes % 4) * 8);
  words[nWords - 2] = nBytes * 8;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < nWords; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    a = md5ff(a, b, c, d, words[i + 0], 7, -680876936);
    d = md5ff(d, a, b, c, words[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, words[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, words[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, words[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, words[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, words[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, words[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, words[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, words[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, words[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, words[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, words[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, words[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, words[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, words[i + 15], 22, 1236535329);
    a = md5gg(a, b, c, d, words[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, words[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, words[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, words[i + 0], 20, -373897302);
    a = md5gg(a, b, c, d, words[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, words[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, words[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, words[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, words[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, words[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, words[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, words[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, words[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, words[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, words[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, words[i + 12], 20, -1926607734);
    a = md5hh(a, b, c, d, words[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, words[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, words[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, words[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, words[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, words[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, words[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, words[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, words[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, words[i + 0], 11, -358537222);
    c = md5hh(c, d, a, b, words[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, words[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, words[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, words[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, words[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, words[i + 2], 23, -995338651);
    a = md5ii(a, b, c, d, words[i + 0], 6, -198630844);
    d = md5ii(d, a, b, c, words[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, words[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, words[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, words[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, words[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, words[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, words[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, words[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, words[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, words[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, words[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, words[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, words[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, words[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, words[i + 9], 21, -343485551);

    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }

  const hash = [a, b, c, d];
  const output = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    output[i] = (hash[i >> 2] >>> ((i % 4) * 8)) & 0xff;
  }
  let hex = '';
  for (let i = 0; i < 16; i++) {
    hex += output[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function jsonResponse(req: Request, body: unknown, status = 200, allowedOrigins = resolveAllowedOrigins()) {
  return json(req, body, status, allowedOrigins);
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(req, allowedOrigins) });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders(req, allowedOrigins) });
  }

  if (!isAllowedRequestOrigin(req, allowedOrigins)) {
    return jsonResponse(req, {
      error: 'origin_not_allowed',
      message: '非法来源请求已被拒绝。',
    }, 403, allowedOrigins);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const tradeNo = String(body?.trade_no || '').trim();
    const requestedPaymentOptionId = normalizePaymentOptionId(body?.payment_option_id, 'basic') as 'basic' | 'pro' | 'vip' | 'pdf';
    const clientEnv = body?.client_env && typeof body.client_env === 'object' ? body.client_env : {};

    if (!tradeNo || !validateTradeNo(tradeNo)) {
      return jsonResponse(req, {
        error: 'Invalid request',
        details: 'trade_no is invalid',
      }, 400, allowedOrigins);
    }

    const appSecret = Deno.env.get('HUPI_APPSECRET');
    const appId = Deno.env.get('HUPI_APPID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!appSecret || !appId || !supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables');
      return jsonResponse(req, {
        error: 'Server configuration error',
        details: 'Missing required environment variables',
      }, 500, allowedOrigins);
    }

    // Security: only existing unpaid orders can create payment URL.
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const rateWindowSeconds = readEnvNumber('RATE_LIMIT_CREATE_PAYMENT_WINDOW_SECONDS', DEFAULT_RATE_LIMIT_WINDOW_SECONDS, 10, 3600);
    const rateMaxRequests = readEnvNumber('RATE_LIMIT_CREATE_PAYMENT_MAX_REQUESTS', DEFAULT_RATE_LIMIT_MAX_REQUESTS, 2, 500);
    const rateIdentifier = await buildRateLimitIdentifier(req);
    const rateResult = await consumeRateLimit(supabase, {
      scope: 'create-payment',
      identifier: rateIdentifier,
      windowSeconds: rateWindowSeconds,
      maxRequests: rateMaxRequests,
    });
    const clientIp = extractClientIp(req);
    const maskedIp = maskIp(clientIp);

    if (!rateResult.allowed) {
      await recordAbuseLog(supabase, {
        scope: 'create-payment',
        identifier: rateIdentifier,
        event: 'rate_limited',
        meta: {
          ip_masked: maskedIp,
          current_count: rateResult.currentCount,
          max_requests: rateMaxRequests,
          window_seconds: rateWindowSeconds,
        },
      });
      return tooManyRequestsResponse(req, allowedOrigins, {
        message: '支付请求过于频繁，请稍后再试。',
        retryAfterSeconds: rateResult.retryAfterSeconds,
        scope: 'create-payment',
        currentCount: rateResult.currentCount,
      });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('paid,birth_input')
      .eq('trade_no', tradeNo)
      .maybeSingle();

    if (orderError) {
      return jsonResponse(req, {
        error: 'Order query failed',
        details: orderError.message,
      }, 500, allowedOrigins);
    }
    if (!order) return jsonResponse(req, { error: 'Order not found' }, 404, allowedOrigins);
    if (order.paid) return jsonResponse(req, { error: 'Order already paid' }, 409, allowedOrigins);

    // Lock payment option to the one stored in order if present.
    const birth = parseBirthInput(order.birth_input);
    const paymentOptionObj = parseBirthInput(birth.payment_option);
    const lockedPaymentOptionId = normalizePaymentOptionId(paymentOptionObj.id, '') as '' | 'basic' | 'pro' | 'vip' | 'pdf';
    const paymentOptionId = lockedPaymentOptionId || requestedPaymentOptionId;
    const optionConfig = PAYMENT_OPTION_MAP[paymentOptionId];

    const userAgent = String(clientEnv?.user_agent || req.headers.get('user-agent') || '');
    const isWeChatClient = Boolean(clientEnv?.is_wechat) || /MicroMessenger/i.test(userAgent);
    const forceBackupOnWeChat = Deno.env.get('HUPI_FORCE_BACKUP_WECHAT') !== '0';
    const primaryApiBase = normalizeApiBase(Deno.env.get('HUPI_API_BASE'), DEFAULT_PRIMARY_API_BASE);
    const backupApiBase = normalizeApiBase(Deno.env.get('HUPI_BACKUP_API_BASE'), DEFAULT_BACKUP_API_BASE);
    const preferredApiBase = isWeChatClient && forceBackupOnWeChat ? backupApiBase : primaryApiBase;
    const candidateApiBases = [preferredApiBase];
    if (preferredApiBase !== primaryApiBase) candidateApiBases.push(primaryApiBase);

    const gatewayMeta = {
      is_wechat: isWeChatClient,
      used_backup: preferredApiBase === backupApiBase,
      preferred_api_base: preferredApiBase,
      attempted_api_bases: candidateApiBases,
      payment_option_id: paymentOptionId,
    };

    const nonceStr = Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);
    const fallbackOrigin = Deno.env.get('PAY_RETURN_ORIGIN') || 'https://tengyunzi.com';
    const returnOrigin = resolveReturnOrigin(req, fallbackOrigin);
    const notifyUrl = `${supabaseUrl}/functions/v1/payment-callback`;
    const returnPath = resolveReturnPath(body?.return_path);
    const returnUrl = `${returnOrigin}${returnPath}?trade_no=${encodeURIComponent(tradeNo)}&paid=true`;

    const payParams: Record<string, string | number> = {
      version: '1.1',
      appid: appId,
      trade_order_id: tradeNo,
      total_fee: optionConfig.total_fee,
      title: optionConfig.title,
      time: Math.floor(Date.now() / 1000),
      notify_url: notifyUrl,
      return_url: returnUrl,
      nonce_str: nonceStr,
    };

    // Only allow pay type from server env, never trust client override.
    const wechatPayType = Deno.env.get('HUPI_WECHAT_PAY_TYPE')?.trim();
    if (isWeChatClient && wechatPayType) payParams.type = wechatPayType;

    const sortedKeys = Object.keys(payParams).sort();
    const signString = sortedKeys.map((k) => `${k}=${payParams[k]}`).join('&') + appSecret;
    const hash = md5(signString);

    let response: Response | null = null;
    let responseText = '';
    let selectedApiBase = '';
    let transportError = '';

    for (const apiBase of candidateApiBases) {
      const endpoint = `${apiBase}/payment/do.html`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ ...payParams, hash }),
        });
        const text = await res.text();
        selectedApiBase = apiBase;

        if (res.ok) {
          response = res;
          responseText = text;
          break;
        }

        console.error('Payment API non-OK response', { endpoint, status: res.status });
        response = res;
        responseText = text;
      } catch (err) {
        transportError = err instanceof Error ? err.message : String(err);
        console.error('Payment API transport error', { endpoint, transportError });
      }
    }

    const gatewayMetaWithRuntime = {
      ...gatewayMeta,
      wechat_pay_type: isWeChatClient ? (wechatPayType || null) : null,
      selected_api_base: selectedApiBase || null,
      fallback_used: selectedApiBase ? selectedApiBase !== preferredApiBase : false,
      return_origin: returnOrigin,
      return_path: returnPath,
    };

    if (!response) {
      return jsonResponse(req, {
        error: 'Payment API unavailable',
        details: transportError || 'no_response',
        gateway_meta: gatewayMetaWithRuntime,
      }, 500, allowedOrigins);
    }

    if (!response.ok) {
      return jsonResponse(req, {
        error: 'Payment API error',
        status: response.status,
        response: responseText,
        gateway_meta: gatewayMetaWithRuntime,
      }, 500, allowedOrigins);
    }

    let parsed: unknown = {};
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = {};
    }
    const result = (parsed && typeof parsed === 'object')
      ? { ...(parsed as Record<string, unknown>), gateway_meta: gatewayMetaWithRuntime }
      : { errcode: 500, errmsg: 'Invalid payment response', gateway_meta: gatewayMetaWithRuntime };

    try {
      if ((result as Record<string, unknown>)?.errcode === 0) {
        const trackedBirth = applyTrackingEvent(birth, 'payment_created', {
          option_id: paymentOptionId,
          api_base: selectedApiBase || preferredApiBase,
          is_wechat: isWeChatClient,
        });
        await supabase
          .from('orders')
          .update({ birth_input: JSON.stringify(trackedBirth) })
          .eq('trade_no', tradeNo);
      }
    } catch (trackErr) {
      console.warn('create-payment tracking update failed', trackErr);
    }

    return jsonResponse(req, result, 200, allowedOrigins);
  } catch (error) {
    console.error('create-payment error', error);
    return jsonResponse(req, {
      error: error instanceof Error ? error.message : String(error),
    }, 500, allowedOrigins);
  }
});
