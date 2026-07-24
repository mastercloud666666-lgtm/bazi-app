import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier,
  consumeRateLimit,
  corsHeaders,
  extractClientIp,
  isAllowedRequestOrigin,
  isLikelyAutomatedUa,
  json,
  maskIp,
  recordAbuseLog,
  resolveAllowedOrigins,
  tooManyRequestsResponse,
} from '../_shared/security.ts';
import { sendOrderNotify } from '../_shared/order-notify.ts';

type PaymentOptionId = 'basic' | 'pro' | 'vip' | 'pdf' | 'consult' | 'copy_agent_100';
type OrderService = 'bazi' | 'hepan' | 'pdf' | 'consult' | 'copy_agent' | 'zhanbu' | 'membership';

const PAYMENT_OPTION_MAP: Record<PaymentOptionId, { title: string; total_fee: string }> = {
  basic: { title: 'Bazi Starter Report', total_fee: '19' },
  pro: { title: 'Bazi Advanced Report', total_fee: '49' },
  vip: { title: 'Bazi Premium Full Report', total_fee: '99' },
  pdf: { title: 'Bazi PDF Document', total_fee: '19' },
  consult: { title: '1v1 Destiny Consultation', total_fee: '499' },
  copy_agent_100: { title: 'Copy Agent 100 Credits', total_fee: '10' },
};
const PRICE_LOCKED_PAYMENT_OPTION_IDS = new Set(['basic', 'pro', 'vip', 'copy_agent_100']);
const FIRST_VISIT_DISCOUNT_OPTION_IDS = new Set(['basic', 'pro', 'vip']);
const FIRST_VISIT_DISCOUNT_ID = 'FIRST3D_20OFF';
const FIRST_VISIT_DISCOUNT_RATE = 0.8;
const FIRST_VISIT_DISCOUNT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const HEPAN_PAYMENT_CONFIG = { title: 'Compatibility Analysis Report', total_fee: '199' } as const;
const ZHANBU_PAYMENT_CONFIG = { title: '周易六十四卦占卜解卦', total_fee: '69' } as const;
const MEMBERSHIP_PLAN_CONFIG = {
  monthly: { title: '云子会员·月卡', total_fee: '49' },
  yearly: { title: '云子会员·年卡', total_fee: '398' },
} as const;

const DEFAULT_PRIMARY_API_BASE = 'https://api.xunhupay.com';
const DEFAULT_BACKUP_API_BASE = 'https://api.dpweixin.com';
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 18;
const DEFAULT_TRADE_RATE_LIMIT_MAX_REQUESTS = 8;
const DEFAULT_MIN_PAY_AMOUNT = 0.01;

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

function normalizePaymentOptionId(value: unknown, fallback: PaymentOptionId | '' = 'basic'): PaymentOptionId | '' {
  const id = String(value || '').trim();
  if (id === 'pro') return 'pro';
  if (id === 'vip') return 'vip';
  if (id === 'basic') return 'basic';
  if (id === 'pdf') return 'pdf';
  if (id === 'consult') return 'consult';
  if (id === 'copy_agent_100') return 'copy_agent_100';
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

function normalizeInviteCode(value: unknown): string {
  const code = String(value || '').trim().toUpperCase();
  if (!code) return '';
  return /^[A-Z0-9_-]{2,32}$/.test(code) ? code : '';
}

function toMoneyNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function formatMoney(value: number): string {
  const cents = Math.round(value * 100);
  const normalized = cents / 100;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

type InviteRule = {
  fixedPrice?: number | null;
  amountOff?: number | null;
  percentOff?: number | null;
  optionPrices?: Record<string, number>;
  note?: string;
};

function parseInviteRules(raw: string): Record<string, InviteRule> {
  if (!raw) return {};
  const normalizeRawCandidates = (input: string): string[] => {
    const seed = String(input || '').trim();
    if (!seed) return [];
    const list = [seed];
    // Sometimes env is stored as quoted JSON string
    if (
      (seed.startsWith('"') && seed.endsWith('"'))
      || (seed.startsWith("'") && seed.endsWith("'"))
    ) {
      list.push(seed.slice(1, -1));
    }
    // Sometimes quotes are escaped in env like {\"A\":...}
    if (seed.includes('\\"')) {
      list.push(seed.replace(/\\"/g, '"'));
    }
    return Array.from(new Set(list.map((x) => x.trim()).filter(Boolean)));
  };

  let parsed: unknown = null;
  for (const candidate of normalizeRawCandidates(raw)) {
    try {
      parsed = JSON.parse(candidate);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) break;
    } catch {
      parsed = null;
    }
  }

  try {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, InviteRule> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const code = normalizeInviteCode(key);
      if (!code) continue;

      if (typeof value === 'number' || typeof value === 'string') {
        const fixed = toMoneyNumber(value);
        if (fixed && fixed > 0) out[code] = { fixedPrice: fixed };
        continue;
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const obj = value as Record<string, unknown>;

      const fixedPrice = toMoneyNumber(obj.fixed_price ?? obj.fixedPrice ?? obj.price ?? obj.fixed);
      const amountOff = toMoneyNumber(obj.amount_off ?? obj.amountOff ?? obj.off ?? obj.minus);
      const percentOff = toMoneyNumber(obj.percent_off ?? obj.percentOff ?? obj.discount_percent ?? obj.discountPercent ?? obj.percent);
      const optionPricesRaw = obj.option_prices ?? obj.optionPrices;
      const optionPrices: Record<string, number> = {};
      if (optionPricesRaw && typeof optionPricesRaw === 'object' && !Array.isArray(optionPricesRaw)) {
        for (const [pid, pval] of Object.entries(optionPricesRaw as Record<string, unknown>)) {
          const money = toMoneyNumber(pval);
          if (money && money > 0) optionPrices[String(pid)] = money;
        }
      }

      out[code] = {
        fixedPrice: fixedPrice && fixedPrice > 0 ? fixedPrice : null,
        amountOff: amountOff && amountOff > 0 ? amountOff : null,
        percentOff: percentOff && percentOff > 0 ? percentOff : null,
        optionPrices: Object.keys(optionPrices).length ? optionPrices : undefined,
        note: typeof obj.note === 'string' ? obj.note.slice(0, 80) : '',
      };
    }
    return out;
  } catch {
    return {};
  }
}

function resolveDiscountedPrice(params: {
  baseAmount: number;
  inviteCode: string;
  optionId: string;
}) {
  const rawRuleText = String(Deno.env.get('PAY_INVITE_CODE_MAP') || '').trim();
  const rules = parseInviteRules(rawRuleText);
  const rule = params.inviteCode ? rules[params.inviteCode] : null;
  if (!rule) {
    return {
      finalAmount: params.baseAmount,
      discountApplied: false,
      discountAmount: 0,
      inviteCode: params.inviteCode || '',
      discountRule: '',
      discountNote: '',
      rulesLoaded: Object.keys(rules).length,
      envRuleLen: rawRuleText.length,
    };
  }

  let finalAmount = params.baseAmount;
  let discountRule = '';
  if (rule.optionPrices?.[params.optionId]) {
    finalAmount = rule.optionPrices[params.optionId];
    discountRule = 'option_price';
  } else if (rule.fixedPrice && rule.fixedPrice > 0) {
    finalAmount = rule.fixedPrice;
    discountRule = 'fixed_price';
  } else if (rule.amountOff && rule.amountOff > 0) {
    finalAmount = params.baseAmount - rule.amountOff;
    discountRule = 'amount_off';
  } else if (rule.percentOff && rule.percentOff > 0) {
    finalAmount = params.baseAmount * (1 - rule.percentOff / 100);
    discountRule = 'percent_off';
  }

  finalAmount = Math.max(DEFAULT_MIN_PAY_AMOUNT, Math.min(params.baseAmount, Math.round(finalAmount * 100) / 100));
  const discountAmount = Math.max(0, Math.round((params.baseAmount - finalAmount) * 100) / 100);

  return {
    finalAmount,
    discountApplied: discountAmount > 0,
    discountAmount,
    inviteCode: params.inviteCode,
    discountRule,
    discountNote: rule.note || '',
    rulesLoaded: Object.keys(rules).length,
    envRuleLen: rawRuleText.length,
  };
}

function parseServerTimestampMs(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric < 100000000000 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveFirstVisitDiscount(params: {
  baseAmount: number;
  paymentOptionId: string;
  service: string;
  body: Record<string, unknown>;
  birth: Record<string, unknown>;
  clientEnv: Record<string, unknown>;
}) {
  const sources = [
    params.body?.visit_discount,
    params.birth?.visit_discount,
    (params.birth as Record<string, any>)?.tracking?.visit_discount,
    (params.clientEnv as Record<string, any>)?.visit_discount,
  ];
  let payload: Record<string, unknown> = {};
  for (const source of sources) {
    const candidate = parseBirthInput(source);
    if (Object.keys(candidate).length) {
      payload = candidate;
      break;
    }
  }

  const now = Date.now();
  const promoId = String(payload.id || payload.discount_id || '').trim();
  const firstSeenMs = parseServerTimestampMs(payload.first_seen_at || payload.firstSeenAt);
  const activatedAtMs = parseServerTimestampMs(payload.activated_at || payload.activatedAt);
  const expiresAtMs = firstSeenMs ? firstSeenMs + FIRST_VISIT_DISCOUNT_WINDOW_MS : 0;
  const allowedClockSkewMs = 5 * 60 * 1000;
  const invalid = (reason: string) => ({
    applied: false,
    finalAmount: params.baseAmount,
    discountAmount: 0,
    promoId,
    discountRule: '',
    discountNote: '',
    discountLabel: '',
    expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : '',
    invalidReason: reason,
  });

  if (params.service !== 'bazi') return invalid('service_not_eligible');
  if (!FIRST_VISIT_DISCOUNT_OPTION_IDS.has(params.paymentOptionId)) return invalid('option_not_eligible');
  if (promoId !== FIRST_VISIT_DISCOUNT_ID) return invalid('promo_id_mismatch');
  if (!firstSeenMs || !activatedAtMs) return invalid('missing_timestamp');
  if (firstSeenMs > now + allowedClockSkewMs) return invalid('first_seen_in_future');
  if (activatedAtMs < firstSeenMs - allowedClockSkewMs) return invalid('activated_before_first_seen');
  if (activatedAtMs > now + allowedClockSkewMs) return invalid('activated_in_future');
  if (activatedAtMs > expiresAtMs + allowedClockSkewMs) return invalid('activated_after_window');
  if (now > expiresAtMs + allowedClockSkewMs) return invalid('expired');

  const finalAmount = Math.max(
    DEFAULT_MIN_PAY_AMOUNT,
    Math.round(params.baseAmount * FIRST_VISIT_DISCOUNT_RATE * 100) / 100,
  );
  const discountAmount = Math.max(0, Math.round((params.baseAmount - finalAmount) * 100) / 100);
  return {
    applied: discountAmount > 0,
    finalAmount,
    discountAmount,
    promoId,
    discountRule: 'first_visit_3d_20off',
    discountNote: '首访3天内8折',
    discountLabel: '首访3天内8折',
    expiresAt: new Date(expiresAtMs).toISOString(),
    invalidReason: '',
  };
}

function detectOrderService(birth: Record<string, unknown>): OrderService {
  const service = String(birth?.order_service || '').trim().toLowerCase();
  if (service === 'hepan') return 'hepan';
  if (service === 'zhanbu') return 'zhanbu';
  if (service === 'membership') return 'membership';
  if (service === 'pdf') return 'pdf';
  if (service === 'consult') return 'consult';
  if (service === 'copy_agent') return 'copy_agent';
  const paymentOption = parseBirthInput(birth?.payment_option);
  const optionId = String(paymentOption.id || birth?.payment_option_id || '').trim().toLowerCase();
  if (optionId === 'copy_agent_100') return 'copy_agent';
  return 'bazi';
}

function inferOrderServiceFromOptionId(optionId: PaymentOptionId): OrderService {
  if (optionId === 'pdf') return 'pdf';
  if (optionId === 'consult') return 'consult';
  if (optionId === 'copy_agent_100') return 'copy_agent';
  return 'bazi';
}

function buildFallbackOrderBirthInput(rawInput: unknown, optionId: PaymentOptionId): Record<string, unknown> {
  const next = parseBirthInput(rawInput);
  if (!String(next.order_service || '').trim()) {
    next.order_service = inferOrderServiceFromOptionId(optionId);
  }
  const paymentOptionObj = parseBirthInput(next.payment_option);
  if (!String(paymentOptionObj.id || '').trim()) {
    const optionConfig = PAYMENT_OPTION_MAP[optionId];
    next.payment_option = {
      id: optionId,
      title: optionConfig?.title || 'Bazi Report',
      fee: optionConfig?.total_fee || String(DEFAULT_MIN_PAY_AMOUNT),
    };
  }
  if (!String(next.payment_option_id || '').trim()) {
    next.payment_option_id = optionId;
  }
  return next;
}

function isDuplicateTradeNoError(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || '').toLowerCase();
  return code === '23505' || msg.includes('duplicate key') || msg.includes('orders_trade_no_key');
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

function resolveReturnPath(value: unknown): '/payment-fallback.html' | '/result.html' | '/hepan.html' | '/index.html' | '/upgrade.html' | '/member.html' | '/zhanbu.html' {
  const path = String(value || '').trim();
  if (path === '/payment-fallback.html') return '/payment-fallback.html';
  if (path === '/hepan.html') return '/hepan.html';
  if (path === '/index.html') return '/index.html';
  if (path === '/result.html') return '/result.html';
  if (path === '/upgrade.html') return '/upgrade.html';
  if (path === '/member.html') return '/member.html';
  if (path === '/zhanbu.html') return '/zhanbu.html';
  return '/payment-fallback.html';
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
    const requestedPaymentOptionId = normalizePaymentOptionId(body?.payment_option_id, 'basic') as PaymentOptionId;
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
    const userAgent = String(clientEnv?.user_agent || req.headers.get('user-agent') || '').slice(0, 240);
    const shouldBlockBotUa = Deno.env.get('SECURITY_BLOCK_BOT_UA_SENSITIVE') !== '0';

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

    if (shouldBlockBotUa && isLikelyAutomatedUa(userAgent)) {
      await recordAbuseLog(supabase, {
        scope: 'create-payment',
        identifier: rateIdentifier,
        event: 'blocked_bot_ua',
        meta: {
          ip_masked: maskedIp,
          ua: userAgent.slice(0, 160),
        },
      });
      return jsonResponse(req, {
        error: 'blocked_bot_ua',
        details: 'Automated client is not allowed for payment creation',
      }, 403, allowedOrigins);
    }

    const tradeRateMaxRequests = readEnvNumber('RATE_LIMIT_CREATE_PAYMENT_TRADE_MAX_REQUESTS', DEFAULT_TRADE_RATE_LIMIT_MAX_REQUESTS, 2, 200);
    const tradeRateResult = await consumeRateLimit(supabase, {
      scope: 'create-payment-trade',
      identifier: tradeNo,
      windowSeconds: rateWindowSeconds,
      maxRequests: tradeRateMaxRequests,
    });
    if (!tradeRateResult.allowed) {
      await recordAbuseLog(supabase, {
        scope: 'create-payment-trade',
        identifier: tradeNo,
        event: 'rate_limited_trade',
        meta: {
          ip_masked: maskedIp,
          current_count: tradeRateResult.currentCount,
          max_requests: tradeRateMaxRequests,
          window_seconds: rateWindowSeconds,
        },
      });
      return tooManyRequestsResponse(req, allowedOrigins, {
        message: 'Payment request for this order is too frequent, please retry shortly.',
        retryAfterSeconds: tradeRateResult.retryAfterSeconds,
        scope: 'create-payment-trade',
        currentCount: tradeRateResult.currentCount,
      });
    }

    const queryOrder = async () => await supabase
      .from('orders')
      .select('paid,birth_input')
      .eq('trade_no', tradeNo)
      .maybeSingle();

    let { data: order, error: orderError } = await queryOrder();

    if (orderError) {
      return jsonResponse(req, {
        error: 'Order query failed',
        details: orderError.message,
      }, 500, allowedOrigins);
    }

    if (!order) {
      const fallbackBirthInput = buildFallbackOrderBirthInput(body?.birth_input, requestedPaymentOptionId);
      const { error: insertOrderError } = await supabase
        .from('orders')
        .insert({
          trade_no: tradeNo,
          birth_input: JSON.stringify(fallbackBirthInput),
        });
      if (insertOrderError && !isDuplicateTradeNoError(insertOrderError)) {
        return jsonResponse(req, {
          error: 'Order auto create failed',
          details: insertOrderError.message,
        }, 500, allowedOrigins);
      }

      const retried = await queryOrder();
      order = retried.data;
      orderError = retried.error;
      if (orderError) {
        return jsonResponse(req, {
          error: 'Order query failed after auto create',
          details: orderError.message,
        }, 500, allowedOrigins);
      }
    }

    if (!order) return jsonResponse(req, { error: 'Order not found' }, 404, allowedOrigins);
    if (order.paid) return jsonResponse(req, { error: 'Order already paid' }, 409, allowedOrigins);

    // Lock payment option to the one stored in order if present.
    const birth = parseBirthInput(order.birth_input);
    const paymentOptionObj = parseBirthInput(birth.payment_option);
    const lockedPaymentOptionId = normalizePaymentOptionId(paymentOptionObj.id, '') as '' | PaymentOptionId;
    const paymentOptionId = lockedPaymentOptionId || requestedPaymentOptionId;
    const service = detectOrderService(birth);
    const membershipPlan = String((birth as Record<string, unknown>)?.plan || '').trim().toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
    const optionConfig = service === 'hepan'
      ? HEPAN_PAYMENT_CONFIG
      : service === 'zhanbu'
      ? ZHANBU_PAYMENT_CONFIG
      : service === 'membership'
      ? MEMBERSHIP_PLAN_CONFIG[membershipPlan]
      : PAYMENT_OPTION_MAP[paymentOptionId];
    const discountOptionId = service === 'hepan' ? 'hepan' : paymentOptionId;
    const rawInviteCode = normalizeInviteCode(
      body?.invite_code
      || (birth as Record<string, unknown>)?.invite_code
      || ((birth as Record<string, any>)?.tracking?.invite_code),
    );
    const inviteCode = PRICE_LOCKED_PAYMENT_OPTION_IDS.has(paymentOptionId) ? '' : rawInviteCode;
    const baseAmount = toMoneyNumber(optionConfig.total_fee) || DEFAULT_MIN_PAY_AMOUNT;
    const inviteDiscountMeta = resolveDiscountedPrice({
      baseAmount,
      inviteCode,
      optionId: discountOptionId,
    });
    const visitDiscountMeta = resolveFirstVisitDiscount({
      baseAmount: inviteDiscountMeta.finalAmount,
      paymentOptionId,
      service,
      body: body as Record<string, unknown>,
      birth,
      clientEnv: clientEnv as Record<string, unknown>,
    });
    const finalAmount = (service === 'zhanbu' || service === 'membership')
      ? baseAmount  // 占卜/会员固定价，不参与任何优惠
      : (visitDiscountMeta.applied ? visitDiscountMeta.finalAmount : inviteDiscountMeta.finalAmount);
    const discountMeta = {
      ...inviteDiscountMeta,
      finalAmount,
      discountApplied: inviteDiscountMeta.discountApplied || visitDiscountMeta.applied,
      discountAmount: Math.max(0, Math.round((baseAmount - finalAmount) * 100) / 100),
      discountRule: visitDiscountMeta.applied ? visitDiscountMeta.discountRule : inviteDiscountMeta.discountRule,
      discountNote: visitDiscountMeta.applied ? visitDiscountMeta.discountNote : inviteDiscountMeta.discountNote,
      discountLabel: visitDiscountMeta.applied
        ? visitDiscountMeta.discountLabel
        : (inviteDiscountMeta.discountApplied ? '优惠码折扣' : ''),
      visitDiscountApplied: visitDiscountMeta.applied,
      visitDiscountId: visitDiscountMeta.applied ? visitDiscountMeta.promoId : '',
      visitDiscountExpiresAt: visitDiscountMeta.applied ? visitDiscountMeta.expiresAt : '',
      visitDiscountInvalidReason: visitDiscountMeta.applied ? '' : visitDiscountMeta.invalidReason,
    };
    const totalFee = formatMoney(discountMeta.finalAmount);

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
      invite_code: discountMeta.inviteCode || null,
      invite_discount_applied: inviteDiscountMeta.discountApplied,
      invite_discount_amount: inviteDiscountMeta.discountAmount,
      invite_rules_loaded: discountMeta.rulesLoaded || 0,
      invite_env_len: discountMeta.envRuleLen || 0,
      discount_applied: discountMeta.discountApplied,
      discount_amount: discountMeta.discountAmount,
      discount_label: discountMeta.discountLabel || null,
      visit_discount_applied: discountMeta.visitDiscountApplied,
      visit_discount_id: discountMeta.visitDiscountId || null,
      visit_discount_expires_at: discountMeta.visitDiscountExpiresAt || null,
      visit_discount_invalid_reason: discountMeta.visitDiscountInvalidReason || null,
      total_fee_original: formatMoney(baseAmount),
      total_fee_final: totalFee,
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
      total_fee: totalFee,
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
    let lastGatewayErrCode: number | null = null;
    let lastGatewayErrMsg = '';

    for (const apiBase of candidateApiBases) {
      const endpoint = `${apiBase}/payment/do.html`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ ...payParams, hash }),
        });
        const text = await res.text();

        if (!res.ok) {
          console.error('Payment API non-OK response', { endpoint, status: res.status });
          response = res;
          responseText = text;
          selectedApiBase = apiBase;
          continue;
        }

        response = res;
        responseText = text;
        selectedApiBase = apiBase;

        let parsedCandidate: Record<string, unknown> = {};
        try {
          const candidate = JSON.parse(text);
          if (candidate && typeof candidate === 'object') {
            parsedCandidate = candidate as Record<string, unknown>;
          }
        } catch {
          parsedCandidate = {};
        }

        const candidateErrCode = Number(parsedCandidate.errcode);
        const isSuccess = Number.isFinite(candidateErrCode) && candidateErrCode === 0;
        if (isSuccess) {
          break;
        }

        lastGatewayErrCode = Number.isFinite(candidateErrCode) ? candidateErrCode : null;
        lastGatewayErrMsg = String(parsedCandidate.errmsg || '');
        console.warn('Payment API returned non-zero errcode, trying next gateway if available', {
          endpoint,
          errcode: lastGatewayErrCode,
          errmsg: lastGatewayErrMsg,
        });
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
      invite_discount_rule: discountMeta.discountRule || null,
      invite_discount_note: discountMeta.discountNote || null,
      discount_rule: discountMeta.discountRule || null,
      discount_note: discountMeta.discountNote || null,
      gateway_last_errcode: lastGatewayErrCode,
      gateway_last_errmsg: lastGatewayErrMsg || null,
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
      ? {
        ...(parsed as Record<string, unknown>),
        gateway_meta: gatewayMetaWithRuntime,
        discount_info: {
          invite_code: discountMeta.inviteCode || null,
          discount_applied: discountMeta.discountApplied,
          discount_amount: discountMeta.discountAmount,
          discount_label: discountMeta.discountLabel || null,
          total_fee_original: formatMoney(baseAmount),
          total_fee_final: totalFee,
          discount_rule: discountMeta.discountRule || null,
          discount_note: discountMeta.discountNote || null,
          invite_discount_applied: inviteDiscountMeta.discountApplied,
          invite_discount_amount: inviteDiscountMeta.discountAmount,
          visit_discount_applied: discountMeta.visitDiscountApplied,
          visit_discount_id: discountMeta.visitDiscountId || null,
          visit_discount_expires_at: discountMeta.visitDiscountExpiresAt || null,
          visit_discount_invalid_reason: discountMeta.visitDiscountInvalidReason || null,
          rules_loaded: discountMeta.rulesLoaded || 0,
          env_rule_len: discountMeta.envRuleLen || 0,
        },
      }
      : {
        errcode: 500,
        errmsg: 'Invalid payment response',
        gateway_meta: gatewayMetaWithRuntime,
        discount_info: {
          invite_code: discountMeta.inviteCode || null,
          discount_applied: discountMeta.discountApplied,
          discount_amount: discountMeta.discountAmount,
          discount_label: discountMeta.discountLabel || null,
          total_fee_original: formatMoney(baseAmount),
          total_fee_final: totalFee,
          discount_rule: discountMeta.discountRule || null,
          discount_note: discountMeta.discountNote || null,
          invite_discount_applied: inviteDiscountMeta.discountApplied,
          invite_discount_amount: inviteDiscountMeta.discountAmount,
          visit_discount_applied: discountMeta.visitDiscountApplied,
          visit_discount_id: discountMeta.visitDiscountId || null,
          visit_discount_expires_at: discountMeta.visitDiscountExpiresAt || null,
          visit_discount_invalid_reason: discountMeta.visitDiscountInvalidReason || null,
          rules_loaded: discountMeta.rulesLoaded || 0,
          env_rule_len: discountMeta.envRuleLen || 0,
        },
      };

    try {
      if ((result as Record<string, unknown>)?.errcode === 0) {
        const trackedBirth = applyTrackingEvent(birth, 'payment_created', {
          option_id: paymentOptionId,
          api_base: selectedApiBase || preferredApiBase,
          is_wechat: isWeChatClient,
          invite_code: discountMeta.inviteCode || '',
          invite_discount_applied: inviteDiscountMeta.discountApplied,
          invite_discount_amount: inviteDiscountMeta.discountAmount,
          visit_discount_applied: discountMeta.visitDiscountApplied,
          visit_discount_id: discountMeta.visitDiscountId,
          discount_label: discountMeta.discountLabel,
          discount_amount: discountMeta.discountAmount,
          total_fee_final: totalFee,
        });
        await supabase
          .from('orders')
          .update({ birth_input: JSON.stringify(trackedBirth) })
          .eq('trade_no', tradeNo);

        await sendOrderNotify('payment_created', {
          trade_no: tradeNo,
          service,
          payment_option_id: paymentOptionId,
          total_fee: totalFee,
          status: 'UNPAID',
          source: 'create-payment',
          note: [
            selectedApiBase || preferredApiBase,
            inviteDiscountMeta.discountApplied ? `invite:${discountMeta.inviteCode}` : '',
            discountMeta.visitDiscountApplied ? `promo:${discountMeta.visitDiscountId}` : '',
          ].filter(Boolean).join(' | '),
        });
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
