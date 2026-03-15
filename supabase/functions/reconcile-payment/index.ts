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

const DEFAULT_PRIMARY_API_BASE = 'https://api.xunhupay.com';
const DEFAULT_BACKUP_API_BASE = 'https://api.dpweixin.com';
const DEFAULT_PDF_PATH = '/downloads/yunzi-bazi-guide.pdf';
const DEFAULT_PDF_STORAGE_BUCKET = 'paid-docs';
const DEFAULT_PDF_STORAGE_PATH = 'pdfs/yunzi-bazi-guide.pdf';
const DEFAULT_PDF_SIGNED_TTL_SECONDS = 600;
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 36;

function normalizeApiBase(base: string | undefined, fallback: string) {
  const value = (base || fallback).trim();
  return value.replace(/\/+$/, '');
}

function parseBirthInput(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const value = Number(asString(Deno.env.get(name)));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function normalizeStoragePath(value: unknown): string {
  const path = asString(value).replace(/^\/+/, '');
  if (!path) return DEFAULT_PDF_STORAGE_PATH;
  if (/^https?:\/\//i.test(path)) return DEFAULT_PDF_STORAGE_PATH;
  if (/^downloads\//i.test(path)) return DEFAULT_PDF_STORAGE_PATH;
  return path;
}

function getPdfSignedTtlSeconds(): number {
  const fromEnv = Number(asString(Deno.env.get('PDF_SIGNED_URL_TTL_SECONDS')));
  if (!Number.isFinite(fromEnv)) return DEFAULT_PDF_SIGNED_TTL_SECONDS;
  return Math.min(Math.max(Math.floor(fromEnv), 120), 3600);
}

async function createPdfSignedUrl(
  supabase: any,
  supabaseUrl: string,
  birth: Record<string, any>,
): Promise<{ url: string | null; expiresIn: number; bucket: string; objectPath: string; }> {
  const bucket = asString(birth?.pdf_storage_bucket) || asString(Deno.env.get('PDF_STORAGE_BUCKET')) || DEFAULT_PDF_STORAGE_BUCKET;
  const objectPath = normalizeStoragePath(
    birth?.pdf_storage_path || birth?.pdf_storage_object || birth?.pdf_download_path || DEFAULT_PDF_PATH,
  );
  const expiresIn = getPdfSignedTtlSeconds();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, expiresIn);
  if (error || !data?.signedUrl) return { url: null, expiresIn, bucket, objectPath };
  const signed = String(data.signedUrl || '').trim();
  const absolute = /^https?:\/\//i.test(signed) ? signed : `${supabaseUrl}${signed}`;
  return { url: absolute, expiresIn, bucket, objectPath };
}

function applyTrackingEvent(
  birth: Record<string, any>,
  event: string,
  meta: Record<string, unknown> = {},
): Record<string, any> {
  const next = { ...birth };
  const tracking = next.tracking && typeof next.tracking === 'object' && !Array.isArray(next.tracking)
    ? { ...next.tracking as Record<string, any> }
    : {};
  const events = Array.isArray(tracking.events) ? [...tracking.events] : [];
  const now = new Date().toISOString();

  if (event === 'payment_verified' && !tracking.payment_verified_at) {
    tracking.payment_verified_at = now;
  }
  tracking.last_event = event;
  tracking.last_event_at = now;
  events.push({ event, at: now, meta });
  tracking.events = events.slice(-30);
  next.tracking = tracking;
  return next;
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
  const M = new Int32Array(nWords);
  for (let i = 0; i < nBytes; i++) {
    M[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }
  M[nBytes >> 2] |= 0x80 << ((nBytes % 4) * 8);
  M[nWords - 2] = nBytes * 8;

  let a = 1732584193; let b = -271733879; let c = -1732584194; let d = 271733878;
  for (let i = 0; i < nWords; i += 16) {
    const olda = a; const oldb = b; const oldc = c; const oldd = d;
    a = md5ff(a, b, c, d, M[i + 0], 7, -680876936);
    d = md5ff(d, a, b, c, M[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, M[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, M[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, M[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, M[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, M[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, M[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, M[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, M[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, M[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, M[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, M[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, M[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, M[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, M[i + 15], 22, 1236535329);
    a = md5gg(a, b, c, d, M[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, M[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, M[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, M[i + 0], 20, -373897302);
    a = md5gg(a, b, c, d, M[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, M[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, M[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, M[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, M[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, M[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, M[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, M[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, M[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, M[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, M[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, M[i + 12], 20, -1926607734);
    a = md5hh(a, b, c, d, M[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, M[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, M[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, M[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, M[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, M[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, M[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, M[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, M[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, M[i + 0], 11, -358537222);
    c = md5hh(c, d, a, b, M[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, M[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, M[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, M[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, M[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, M[i + 2], 23, -995338651);
    a = md5ii(a, b, c, d, M[i + 0], 6, -198630844);
    d = md5ii(d, a, b, c, M[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, M[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, M[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, M[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, M[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, M[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, M[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, M[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, M[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, M[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, M[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, M[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, M[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, M[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, M[i + 9], 21, -343485551);
    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }

  const hash = [a, b, c, d];
  const output = new Uint8Array(16);
  for (let i = 0; i < 16; i++) output[i] = (hash[i >> 2] >>> ((i % 4) * 8)) & 0xff;
  let hex = '';
  for (let i = 0; i < 16; i++) hex += output[i].toString(16).padStart(2, '0');
  return hex;
}

async function triggerAnalyzeIfNeeded(order: { analysis: string | null; birth_input: string | null }, tradeNo: string) {
  if (order.analysis) return false;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return false;

  const birth: Record<string, any> = parseBirthInput(order.birth_input);
  if (birth?.order_service === 'pdf') return false;

  fetch(`${supabaseUrl}/functions/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      trade_no: tradeNo,
      service: 'bazi',
      free_only: false,
      payment_option_id: birth?.payment_option?.id || 'basic',
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      gender: birth.gender,
      bazi_str: birth.bazi_str,
      dayun_text: birth.dayun_text,
      special_years_text: birth.special_years_text,
      start_age: birth.start_age,
    }),
  }).catch((err) => {
    console.error('trigger analyze failed:', err);
  });

  return true;
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
    if (!tradeNo) {
      return jsonResponse(req, { error: 'trade_no is required' }, 400, allowedOrigins);
    }

    const appId = Deno.env.get('HUPI_APPID');
    const appSecret = Deno.env.get('HUPI_APPSECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!appId || !appSecret || !supabaseUrl || !serviceKey) {
      return jsonResponse(req, { error: 'Missing required environment variables' }, 500, allowedOrigins);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const rateWindowSeconds = readEnvNumber('RATE_LIMIT_RECONCILE_WINDOW_SECONDS', DEFAULT_RATE_LIMIT_WINDOW_SECONDS, 10, 3600);
    const rateMaxRequests = readEnvNumber('RATE_LIMIT_RECONCILE_MAX_REQUESTS', DEFAULT_RATE_LIMIT_MAX_REQUESTS, 2, 1000);
    const rateIdentifier = await buildRateLimitIdentifier(req);
    const rateResult = await consumeRateLimit(supabase, {
      scope: 'reconcile-payment',
      identifier: rateIdentifier,
      windowSeconds: rateWindowSeconds,
      maxRequests: rateMaxRequests,
    });
    if (!rateResult.allowed) {
      await recordAbuseLog(supabase, {
        scope: 'reconcile-payment',
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
        message: '订单校验请求过于频繁，请稍后再试。',
        retryAfterSeconds: rateResult.retryAfterSeconds,
        scope: 'reconcile-payment',
        currentCount: rateResult.currentCount,
      });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('paid,analysis,birth_input')
      .eq('trade_no', tradeNo)
      .maybeSingle();

    if (orderError || !order) {
      return jsonResponse(req, { error: 'order_not_found', details: orderError?.message || null }, 404, allowedOrigins);
    }

    const birth = parseBirthInput(order.birth_input);
    const isPdfOrder = birth?.order_service === 'pdf';
    const pdfDownloadPath = String(birth?.pdf_download_path || DEFAULT_PDF_PATH);

    if (order.paid && (order.analysis || isPdfOrder)) {
      let signedPdf: { url: string | null; expiresIn: number; bucket: string; objectPath: string } | null = null;
      if (isPdfOrder) {
        signedPdf = await createPdfSignedUrl(supabase, supabaseUrl, birth);
      }

      try {
        const trackedBirth = applyTrackingEvent(birth, 'payment_verified', { source: 'order-cache' });
        await supabase
          .from('orders')
          .update({ birth_input: JSON.stringify(trackedBirth) })
          .eq('trade_no', tradeNo);
      } catch (trackErr) {
        console.warn('reconcile cache tracking failed:', trackErr);
      }

      return jsonResponse(req, {
        errcode: 0,
        status: 'OD',
        paid: true,
        analysis_exists: true,
        analysis_triggered: false,
        pdf_ready: isPdfOrder,
        pdf_download_path: isPdfOrder ? pdfDownloadPath : null,
        pdf_download_url: isPdfOrder ? signedPdf?.url || null : null,
        pdf_download_expires_in: isPdfOrder ? signedPdf?.expiresIn || null : null,
        pdf_download_bucket: isPdfOrder ? signedPdf?.bucket || null : null,
        pdf_download_object_path: isPdfOrder ? signedPdf?.objectPath || null : null,
        source: 'order-cache',
      }, 200, allowedOrigins);
    }

    const primaryApiBase = normalizeApiBase(Deno.env.get('HUPI_API_BASE'), DEFAULT_PRIMARY_API_BASE);
    const backupApiBase = normalizeApiBase(Deno.env.get('HUPI_BACKUP_API_BASE'), DEFAULT_BACKUP_API_BASE);
    const candidateApiBases = [primaryApiBase];
    if (backupApiBase !== primaryApiBase) candidateApiBases.push(backupApiBase);

    const nonceStr = Math.random().toString(36).slice(2, 12);
    const payParams: Record<string, string | number> = {
      appid: appId,
      out_trade_order: tradeNo,
      time: Math.floor(Date.now() / 1000),
      nonce_str: nonceStr,
    };
    const sortedKeys = Object.keys(payParams).sort();
    const signString = sortedKeys.map((k) => `${k}=${payParams[k]}`).join('&') + appSecret;
    const hash = md5(signString);

    let selectedApiBase: string | null = null;
    let queryResult: Record<string, unknown> | null = null;
    let lastError: string | null = null;

    for (const apiBase of candidateApiBases) {
      const endpoint = `${apiBase}/payment/query.html`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ ...payParams, hash }),
        });
        const text = await res.text();
        const parsed = JSON.parse(text);
        if (res.ok && parsed && typeof parsed === 'object' && parsed.errcode === 0) {
          selectedApiBase = apiBase;
          queryResult = parsed;
          break;
        }
        lastError = `non-ok response from ${endpoint}: ${text}`;
      } catch (err) {
        lastError = `${endpoint}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    if (!queryResult) {
      return jsonResponse(req, {
        error: 'query_payment_status_failed',
        details: lastError,
        gateway_meta: {
          attempted_api_bases: candidateApiBases,
          selected_api_base: selectedApiBase,
        },
      }, 502, allowedOrigins);
    }

    const status = String((queryResult as any)?.data?.status || '');
    if (status !== 'OD') {
      return jsonResponse(req, {
        errcode: 0,
        status,
        paid: false,
        analysis_exists: !!order.analysis,
        analysis_triggered: false,
        pdf_ready: false,
        pdf_download_path: null,
        pdf_download_url: null,
        pdf_download_expires_in: null,
        gateway_meta: {
          attempted_api_bases: candidateApiBases,
          selected_api_base: selectedApiBase,
        },
      }, 200, allowedOrigins);
    }

    const trackedBirth = applyTrackingEvent(birth, 'payment_verified', {
      source: 'reconcile-payment',
      api_base: selectedApiBase || '',
    });
    await supabase
      .from('orders')
      .update({ paid: true, birth_input: JSON.stringify(trackedBirth) })
      .eq('trade_no', tradeNo);

    const analysisTriggered = await triggerAnalyzeIfNeeded(order, tradeNo);
    const signedPdf = isPdfOrder ? await createPdfSignedUrl(supabase, supabaseUrl, trackedBirth) : null;

    return jsonResponse(req, {
      errcode: 0,
      status: 'OD',
      paid: true,
      analysis_exists: !!order.analysis,
      analysis_triggered: analysisTriggered,
      pdf_ready: isPdfOrder,
      pdf_download_path: isPdfOrder ? pdfDownloadPath : null,
      pdf_download_url: isPdfOrder ? signedPdf?.url || null : null,
      pdf_download_expires_in: isPdfOrder ? signedPdf?.expiresIn || null : null,
      pdf_download_bucket: isPdfOrder ? signedPdf?.bucket || null : null,
      pdf_download_object_path: isPdfOrder ? signedPdf?.objectPath || null : null,
      gateway_meta: {
        attempted_api_bases: candidateApiBases,
        selected_api_base: selectedApiBase,
      },
    }, 200, allowedOrigins);
  } catch (error) {
    return jsonResponse(req, {
      error: error instanceof Error ? error.message : String(error),
    }, 500, allowedOrigins);
  }
});
