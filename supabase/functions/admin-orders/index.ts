import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier as buildSharedRateLimitIdentifier,
  consumeRateLimit as consumeSharedRateLimit,
  isLikelyAutomatedUa as isLikelyAutomatedUaShared,
  recordAbuseLog as recordSharedAbuseLog,
  tooManyRequestsResponse as sharedTooManyRequestsResponse,
} from '../_shared/security.ts';

const ALLOWED_PAYMENT_OPTION_IDS = new Set(['basic', 'pro', 'vip', 'pdf', 'consult']);
const DEFAULT_CORS_ORIGINS = ['https://tengyunzi.com', 'https://www.tengyunzi.com'];
const DEFAULT_SITE_ORIGIN = 'https://tengyunzi.com';
const DEFAULT_PDF_PATH = 'downloads/yunzi-bazi-guide.pdf';
const DEFAULT_PDF_STORAGE_BUCKET = 'paid-docs';
const DEFAULT_PDF_STORAGE_PATH = 'pdfs/yunzi-bazi-guide.pdf';
const DEFAULT_PDF_SIGNED_TTL_SECONDS = 600;
const MAX_KOC_BUILDER_ROWS = 1200;
const DEFAULT_KOC_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const GEO_IP_LOOKUP_TIMEOUT_MS = 1200;
const GEO_IP_LOOKUP_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const KOC_TIER_2_THRESHOLD = 1500;
const KOC_TIER_3_THRESHOLD = 6000;
const PLATFORM_FEE_RATE = 0.02;
const SITE_VISIT_RATE_LIMIT_WINDOW_SECONDS = 60;
const SITE_VISIT_RATE_LIMIT_MAX_REQUESTS = 60;
const DEFAULT_OWNER_TESTER_IDS = ['guoyuan'];
const DEFAULT_OWNER_DEVICE_UA_FINGERPRINTS = [
  'micromessenger/8.0.69(0x18004539)',
  'mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/146.0.0.0 safari/537.36',
];
// 佣金计算公式：
// commission = 实际成交金额 * 对应档位佣金比例
// 档位按历史累计成交额（永久累计）自动升级：
// tier1: < 1500, tier2: >= 1500, tier3: >= 6000
const KOC_AUTO_RATES = {
  tier1: 0.40,
  tier2: 0.45,
  tier3: 0.50,
} as const;
const KOC_CONSULT_RATES = {
  tier1: 0.20,
  tier2: 0.22,
  tier3: 0.25,
} as const;
const CONSULT_PROMO_FEE = 999;
const CONSULT_FORMAL_FEE = 1999;
const ALLOWED_KOC_SETTLEMENT_STATUS = new Set(['pending', 'approved', 'paid', 'disputed', 'invalid']);
const ALLOWED_KOC_SETTLEMENT_ROLES = new Set(['direct', 'parent']);
const KOC_PLACEHOLDER_IDS = new Set([
  'koc_id',
  'parent_koc_id',
  'content_id',
  'koc_code',
  'kocid',
  'contentid',
  'code',
  'id',
  'name',
  'ref',
  'koc',
  'content',
]);
const GEO_IP_CACHE = new Map<string, { expires_at: number; country: string; province: string; city: string }>();

type JsonRecord = Record<string, unknown>;
type SettlementRole = 'direct' | 'parent';
type KocTierId = 'tier1' | 'tier2' | 'tier3';
type OrderPricing = {
  original_amount: number;
  final_amount: number;
  final_source: 'gateway_total_fee' | 'tracking_total_fee_final' | 'option_fee';
  discount_applied: boolean;
  discount_amount: number;
  invite_code: string;
};
type KocCommissionProfile = {
  tier_id: KocTierId;
  tier_name: string;
  rate: number;
  cumulative_paid_before: number;
  formula_type: 'auto' | 'consult';
};
type KocCommissionBuildResult = {
  profileMap: Map<string, KocCommissionProfile>;
  cumulativePaidByKoc: Map<string, number>;
};
type SettlementPrepareResult =
  | { ok: true; nextBirth: JsonRecord; nextSettlement: JsonRecord; role: SettlementRole; }
  | { ok: false; reason: string; role: SettlementRole; };

function resolveAllowedOrigins(): string[] {
  const fromEnv = (Deno.env.get('ADMIN_DASHBOARD_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_CORS_ORIGINS;
}

function corsHeaders(req: Request): Record<string, string> {
  const allowedOrigins = resolveAllowedOrigins();
  const reqOrigin = (req.headers.get('origin') || '').trim();
  const allowOrigin = reqOrigin && allowedOrigins.includes(reqOrigin) ? reqOrigin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-admin-token, x-koc-token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(req),
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function normalizePartnerId(value: unknown): string {
  return asString(value).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 64);
}

function isPlaceholderPartnerId(value: unknown): boolean {
  const normalized = normalizePartnerId(value);
  if (!normalized) return false;
  return KOC_PLACEHOLDER_IDS.has(normalized);
}

function sanitizePartnerId(value: unknown): string {
  const normalized = normalizePartnerId(value);
  if (!normalized || KOC_PLACEHOLDER_IDS.has(normalized)) return '';
  return normalized;
}

function sanitizeTesterId(value: unknown): string {
  const raw = asString(value).toLowerCase();
  if (!raw) return '';
  return raw.replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const raw = asString(value).toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'y';
}

function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  const normalized = String(text || '').replace(/-/g, '+').replace(/_/g, '/');
  if (!normalized) return null;
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  try {
    const binary = atob(padded);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) arr[i] = binary.charCodeAt(i);
    return arr;
  } catch {
    return null;
  }
}

function decodeJsonBase64Url<T = JsonRecord>(text: string): T | null {
  const bytes = fromBase64Url(text);
  if (!bytes) return null;
  try {
    const raw = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as T : null;
  } catch {
    return null;
  }
}

async function hmacSha256Base64Url(secret: string, payload: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

function getKocSessionSecret(): string {
  const explicit = asString(Deno.env.get('KOC_DASHBOARD_JWT_SECRET'));
  if (explicit) return explicit;
  const adminToken = asString(Deno.env.get('ADMIN_DASHBOARD_TOKEN'));
  if (adminToken) return adminToken;
  const serviceKey = asString(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  return serviceKey || 'koc-session-secret';
}

function getKocSessionTtlSeconds(): number {
  const env = Number(asString(Deno.env.get('KOC_DASHBOARD_SESSION_TTL_SECONDS')));
  if (!Number.isFinite(env)) return DEFAULT_KOC_SESSION_TTL_SECONDS;
  return Math.min(Math.max(Math.floor(env), 1800), 60 * 60 * 24 * 30);
}

type KocAccount = {
  koc_id: string;
  password: string;
  parent_koc_id?: string;
  name?: string;
  active: boolean;
};

type KocSession = {
  koc_id: string;
  name: string;
  iat: number;
  exp: number;
};

function parseKocAccounts(): Record<string, KocAccount> {
  const raw = asString(Deno.env.get('KOC_DASHBOARD_ACCOUNTS'));
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  const out: Record<string, KocAccount> = {};
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const row = item && typeof item === 'object' ? item as JsonRecord : {};
      const kocId = normalizePartnerId(row.koc_id || row.id || row.kocId);
      const password = asString(row.password || row.pass || row.code);
      if (!kocId || !password) continue;
      out[kocId] = {
        koc_id: kocId,
        password,
        parent_koc_id: normalizePartnerId(row.parent_koc_id || row.parentKocId || row.parent || ''),
        name: asString(row.name || row.display_name),
        active: row.active !== false,
      };
    }
    return out;
  }

  if (!parsed || typeof parsed !== 'object') return out;
  const obj = parsed as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    const row = value && typeof value === 'object' ? value as JsonRecord : {};
    const kocId = normalizePartnerId(row.koc_id || key);
    const password = asString(row.password || row.pass || row.code);
    if (!kocId || !password) continue;
    out[kocId] = {
      koc_id: kocId,
      password,
      parent_koc_id: normalizePartnerId(row.parent_koc_id || row.parentKocId || row.parent || ''),
      name: asString(row.name || row.display_name || key),
      active: row.active !== false,
    };
  }
  return out;
}

async function createKocSessionToken(session: KocSession): Promise<string> {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(session)));
  const signature = await hmacSha256Base64Url(getKocSessionSecret(), payload);
  return `${payload}.${signature}`;
}

async function verifyKocSessionToken(token: string): Promise<KocSession | null> {
  const text = asString(token);
  if (!text) return null;
  const [payload, signature] = text.split('.');
  if (!payload || !signature) return null;

  const expected = await hmacSha256Base64Url(getKocSessionSecret(), payload);
  if (!timingSafeEqual(signature, expected)) return null;

  const decoded = decodeJsonBase64Url<KocSession>(payload);
  if (!decoded) return null;
  const now = Math.floor(Date.now() / 1000);
  const exp = Number(decoded.exp || 0);
  const kocId = normalizePartnerId(decoded.koc_id);
  if (!kocId || !Number.isFinite(exp) || exp <= now) return null;
  return {
    koc_id: kocId,
    name: asString(decoded.name),
    iat: Number(decoded.iat || 0),
    exp,
  };
}

function getAdminToken(req: Request): string {
  return (req.headers.get('x-admin-token') || '').trim();
}

function getInternalAuthHeader(req: Request, fallbackToken: string): string {
  const forwarded = asString(req.headers.get('authorization'));
  if (/^Bearer\s+\S+$/i.test(forwarded)) return forwarded;
  return `Bearer ${fallbackToken}`;
}

function validateTradeNo(tradeNo: string): boolean {
  return /^(bazi|hepan)-[a-z0-9_-]{4,140}$/i.test(tradeNo);
}

function normalizePaymentOptionId(value: unknown, fallback = 'basic'): string {
  const id = String(value || '').trim();
  if (id && ALLOWED_PAYMENT_OPTION_IDS.has(id)) return id;
  return fallback;
}

function parseBirthInput(value: unknown): JsonRecord {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as JsonRecord;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonRecord : {};
  } catch {
    return {};
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hasText(value: unknown): boolean {
  return asString(value).length > 0;
}

function parseTracking(birth: JsonRecord): JsonRecord {
  const tracking = birth.tracking;
  if (!tracking || typeof tracking !== 'object' || Array.isArray(tracking)) return {};
  return tracking as JsonRecord;
}

function toMillis(value: unknown): number {
  const text = asString(value);
  if (!text) return 0;
  const ts = Date.parse(text);
  return Number.isFinite(ts) ? ts : 0;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function readEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const value = Number(asString(Deno.env.get(name)));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function readEnvStringList(name: string, fallback: string[] = []): string[] {
  const raw = asString(Deno.env.get(name));
  const source = raw
    ? raw.split(',').map((item) => item.trim()).filter(Boolean)
    : fallback;
  return source;
}

const OWNER_TESTER_ID_SET = new Set(
  readEnvStringList('OWNER_TESTER_IDS', DEFAULT_OWNER_TESTER_IDS)
    .map((item) => sanitizeTesterId(item))
    .filter(Boolean),
);

const OWNER_DEVICE_UA_FINGERPRINTS = readEnvStringList(
  'OWNER_DEVICE_UA_FINGERPRINTS',
  DEFAULT_OWNER_DEVICE_UA_FINGERPRINTS,
)
  .map((item) => asString(item).toLowerCase())
  .filter(Boolean);

function detectOwnerDevice(testerIdRaw: unknown, uaRaw: unknown): boolean {
  const testerId = sanitizeTesterId(testerIdRaw);
  if (testerId && OWNER_TESTER_ID_SET.has(testerId)) return true;

  const ua = asString(uaRaw).toLowerCase();
  if (!ua) return false;
  return OWNER_DEVICE_UA_FINGERPRINTS.some((fingerprint) => ua.includes(fingerprint));
}

function toFixedAmount(value: number): number {
  return Number(value.toFixed(2));
}

function parsePaymentOption(birth: JsonRecord): JsonRecord {
  const option = birth.payment_option;
  if (!option || typeof option !== 'object' || Array.isArray(option)) return {};
  return option as JsonRecord;
}

function extractKocAttribution(birth: JsonRecord, tracking: JsonRecord) {
  const attrFromTracking = tracking.attribution && typeof tracking.attribution === 'object' && !Array.isArray(tracking.attribution)
    ? tracking.attribution as JsonRecord
    : {};
  const rawKocId = asString(
    birth.koc_id
    || tracking.koc_id
    || attrFromTracking.koc_id
    || attrFromTracking.ref,
  );
  const rawChannel = asString(
    birth.koc_channel
    || tracking.koc_channel
    || attrFromTracking.channel
    || attrFromTracking.src,
  );
  const rawContentId = asString(
    birth.koc_content_id
    || tracking.koc_content_id
    || attrFromTracking.content_id
    || attrFromTracking.content,
  );
  const rawParentKocId = asString(
    birth.koc_parent_id
    || tracking.koc_parent_id
    || attrFromTracking.parent_koc_id
    || attrFromTracking.parent
    || attrFromTracking.parent_id,
  );
  const rawKocCode = asString(
    birth.koc_code
    || tracking.koc_code
    || attrFromTracking.koc_code
    || attrFromTracking.code,
  ).slice(0, 64);

  const kocId = sanitizePartnerId(rawKocId);
  const channel = sanitizePartnerId(rawChannel);
  const contentId = sanitizePartnerId(rawContentId);
  let parentKocId = sanitizePartnerId(rawParentKocId);
  const kocCode = isPlaceholderPartnerId(rawKocCode) ? '' : rawKocCode;
  const fallbackIdFromCode = sanitizePartnerId(rawKocCode);
  const directKocId = kocId || fallbackIdFromCode;
  if (parentKocId && parentKocId === directKocId) parentKocId = '';
  const firstTouchAt = asString(tracking.koc_first_touch_at || attrFromTracking.first_touch_at);
  const lastTouchAt = asString(tracking.koc_last_touch_at || attrFromTracking.last_touch_at);
  return {
    koc_id: directKocId,
    parent_koc_id: parentKocId,
    channel,
    content_id: contentId,
    koc_code: kocCode,
    first_touch_at: firstTouchAt,
    last_touch_at: lastTouchAt,
  };
}

function resolveOrderPricing(birth: JsonRecord, tracking: JsonRecord): OrderPricing {
  const option = parsePaymentOption(birth);
  const optionFee = toNumber(option.fee);
  const gatewayFee = toNumber(tracking.gateway_total_fee);
  const trackedFinalFee = toNumber(tracking.total_fee_final);
  let finalAmount = 0;
  let finalSource: OrderPricing['final_source'] = 'option_fee';

  if (gatewayFee > 0) {
    finalAmount = toFixedAmount(gatewayFee);
    finalSource = 'gateway_total_fee';
  } else if (trackedFinalFee > 0) {
    finalAmount = toFixedAmount(trackedFinalFee);
    finalSource = 'tracking_total_fee_final';
  } else if (optionFee > 0) {
    finalAmount = toFixedAmount(optionFee);
    finalSource = 'option_fee';
  }

  const originalAmount = optionFee > 0 ? toFixedAmount(optionFee) : finalAmount;
  const explicitDiscount = toNumber(tracking.invite_discount_amount);
  const inferredDiscount = originalAmount > 0 && finalAmount > 0 && originalAmount > finalAmount
    ? toFixedAmount(originalAmount - finalAmount)
    : 0;
  const discountAmount = explicitDiscount > 0 ? toFixedAmount(explicitDiscount) : inferredDiscount;
  const discountApplied = toBoolean(tracking.invite_discount_applied) || discountAmount > 0;
  const inviteCode = asString(tracking.invite_code || birth.invite_code || '');

  return {
    original_amount: originalAmount,
    final_amount: finalAmount,
    final_source: finalSource,
    discount_applied: discountApplied,
    discount_amount: discountAmount,
    invite_code: inviteCode,
  };
}

function resolveOrderAmount(birth: JsonRecord, tracking: JsonRecord): number {
  const pricing = resolveOrderPricing(birth, tracking);
  if (pricing.final_amount > 0) return pricing.final_amount;

  const gatewayFee = toNumber(tracking.gateway_total_fee);
  if (gatewayFee > 0) return toFixedAmount(gatewayFee);

  const option = parsePaymentOption(birth);
  const optionFee = toNumber(option.fee);
  if (optionFee > 0) return toFixedAmount(optionFee);
  return 0;
}

function normalizeSettlementRole(value: unknown, fallback: SettlementRole = 'direct'): SettlementRole {
  // 二级KOC已停用：统一按 direct 角色结算
  const role = asString(value).toLowerCase();
  if (role === 'direct') return 'direct';
  return fallback === 'parent' ? 'direct' : 'direct';
}

function resolveKocTierByCumulative(cumulativePaidGmv: number): KocTierId {
  const amount = toNumber(cumulativePaidGmv);
  if (amount >= KOC_TIER_3_THRESHOLD) return 'tier3';
  if (amount >= KOC_TIER_2_THRESHOLD) return 'tier2';
  return 'tier1';
}

function getKocTierName(tier: KocTierId): string {
  if (tier === 'tier3') return '核心伙伴';
  if (tier === 'tier2') return '资深伙伴';
  return '内容伙伴';
}

function isConsultOrder(service: string, paymentOptionId: string, optionTitle = ''): boolean {
  const serviceKey = asString(service).toLowerCase();
  const optionKey = asString(paymentOptionId).toLowerCase();
  const titleKey = asString(optionTitle).toLowerCase();
  const joined = `${serviceKey}|${optionKey}|${titleKey}`;
  return /consult|advisor|1v1|1-to-1|one[-_ ]?to[-_ ]?one|专属咨询|一对一/.test(joined);
}

function resolveKocCommissionProfile(
  cumulativePaidBefore: number,
  service: string,
  paymentOptionId: string,
  optionTitle = '',
): KocCommissionProfile {
  const tier = resolveKocTierByCumulative(cumulativePaidBefore);
  const formulaType: 'auto' | 'consult' = isConsultOrder(service, paymentOptionId, optionTitle) ? 'consult' : 'auto';
  const rate = formulaType === 'consult' ? KOC_CONSULT_RATES[tier] : KOC_AUTO_RATES[tier];
  return {
    tier_id: tier,
    tier_name: getKocTierName(tier),
    rate,
    cumulative_paid_before: toFixedAmount(toNumber(cumulativePaidBefore)),
    formula_type: formulaType,
  };
}

function resolveCommissionAmount(orderAmount: number, profile?: Partial<KocCommissionProfile>): number {
  const amount = toNumber(orderAmount);
  if (amount <= 0) return 0;
  const rate = toNumber(profile?.rate);
  const safeRate = rate > 0 ? rate : KOC_AUTO_RATES.tier1;
  return toFixedAmount(amount * safeRate);
}

function buildKocTierProgress(cumulativePaidRaw: number) {
  const cumulativePaid = toFixedAmount(toNumber(cumulativePaidRaw));
  const tierId = resolveKocTierByCumulative(cumulativePaid);
  const tierName = getKocTierName(tierId);
  const autoRate = KOC_AUTO_RATES[tierId];
  const consultRate = KOC_CONSULT_RATES[tierId];

  let nextTierId: KocTierId | '' = '';
  let nextTierName = '';
  let nextThreshold = 0;
  let progressPct = 100;

  if (tierId === 'tier1') {
    nextTierId = 'tier2';
    nextTierName = getKocTierName('tier2');
    nextThreshold = KOC_TIER_2_THRESHOLD;
    progressPct = Math.min(100, (cumulativePaid / KOC_TIER_2_THRESHOLD) * 100);
  } else if (tierId === 'tier2') {
    nextTierId = 'tier3';
    nextTierName = getKocTierName('tier3');
    nextThreshold = KOC_TIER_3_THRESHOLD;
    const stageBase = KOC_TIER_2_THRESHOLD;
    const stageRange = Math.max(KOC_TIER_3_THRESHOLD - KOC_TIER_2_THRESHOLD, 1);
    progressPct = Math.min(100, ((cumulativePaid - stageBase) / stageRange) * 100);
  }

  const amountToNextTier = nextThreshold > 0
    ? toFixedAmount(Math.max(nextThreshold - cumulativePaid, 0))
    : 0;

  return {
    tier_id: tierId,
    tier_name: tierName,
    auto_rate: autoRate,
    consult_rate: consultRate,
    consult_promo_fee: CONSULT_PROMO_FEE,
    consult_formal_fee: CONSULT_FORMAL_FEE,
    cumulative_paid_gmv: cumulativePaid,
    next_tier_id: nextTierId,
    next_tier_name: nextTierName,
    next_tier_threshold: nextThreshold,
    amount_to_next_tier: amountToNextTier,
    tier_progress_pct: Number(progressPct.toFixed(2)),
  };
}

function parseKocSettlement(tracking: JsonRecord) {
  const settlement = tracking.koc_settlement;
  if (!settlement || typeof settlement !== 'object' || Array.isArray(settlement)) return {};
  return settlement as JsonRecord;
}

function parseKocSettlementItems(tracking: JsonRecord): JsonRecord {
  const items = tracking.koc_settlement_items;
  if (!items || typeof items !== 'object' || Array.isArray(items)) return {};
  return items as JsonRecord;
}

function parseKocSettlementByRole(tracking: JsonRecord, role: SettlementRole): JsonRecord {
  const items = parseKocSettlementItems(tracking);
  const roleItem = items[role];
  if (roleItem && typeof roleItem === 'object' && !Array.isArray(roleItem)) {
    return roleItem as JsonRecord;
  }
  if (role === 'direct') return parseKocSettlement(tracking);
  return {};
}

function getBeneficiaryKocIdByRole(attribution: JsonRecord, role: SettlementRole): string {
  if (role === 'parent') return '';
  return asString(attribution.koc_id);
}

async function buildKocCommissionProfileMap(
  supabase: any,
  targets: Array<{
    trade_no: string;
    koc_id: string;
    service: string;
    payment_option_id: string;
    payment_option_title: string;
  }>,
): Promise<KocCommissionBuildResult> {
  const profileMap = new Map<string, KocCommissionProfile>();
  const cumulativePaidByKoc = new Map<string, number>();
  if (!Array.isArray(targets) || !targets.length) return { profileMap, cumulativePaidByKoc };

  const targetByTrade = new Map<string, {
    koc_id: string;
    service: string;
    payment_option_id: string;
    payment_option_title: string;
  }>();
  const targetKocIds = new Set<string>();
  for (const target of targets) {
    const tradeNo = asString(target.trade_no);
    const kocId = asString(target.koc_id);
    if (!tradeNo || !kocId) continue;
    targetByTrade.set(tradeNo, {
      koc_id: kocId,
      service: asString(target.service),
      payment_option_id: asString(target.payment_option_id),
      payment_option_title: asString(target.payment_option_title),
    });
    targetKocIds.add(kocId);
  }
  if (!targetByTrade.size || !targetKocIds.size) return { profileMap, cumulativePaidByKoc };

  const { data, error } = await supabase
    .from('orders')
    .select('trade_no,paid,birth_input,created_at')
    .order('created_at', { ascending: true })
    .limit(30000);

  if (error) {
    console.error('buildKocCommissionProfileMap query failed:', error.message);
    return { profileMap, cumulativePaidByKoc };
  }
  const rows = Array.isArray(data) ? data : [];
  for (const row of rows) {
    const tradeNo = asString((row as JsonRecord).trade_no);
    if (!tradeNo) continue;
    const birth = parseBirthInput((row as JsonRecord).birth_input);
    const tracking = parseTracking(birth);
    const attribution = extractKocAttribution(birth, tracking);
    const directKocId = asString(attribution.koc_id);
    if (!directKocId || !targetKocIds.has(directKocId)) continue;

    const currentCumulative = toFixedAmount(toNumber(cumulativePaidByKoc.get(directKocId) || 0));
    if (targetByTrade.has(tradeNo) && !profileMap.has(tradeNo)) {
      const targetMeta = targetByTrade.get(tradeNo)!;
      profileMap.set(
        tradeNo,
        resolveKocCommissionProfile(
          currentCumulative,
          targetMeta.service,
          targetMeta.payment_option_id,
          targetMeta.payment_option_title,
        ),
      );
    }

    if (Boolean((row as JsonRecord).paid)) {
      const amount = resolveOrderAmount(birth, tracking);
      cumulativePaidByKoc.set(directKocId, toFixedAmount(currentCumulative + amount));
    }
  }

  // Fallback: if target order not found in timeline window, use current cumulative snapshot.
  targetByTrade.forEach((targetMeta, tradeNo) => {
    if (profileMap.has(tradeNo)) return;
    const currentCumulative = toFixedAmount(toNumber(cumulativePaidByKoc.get(targetMeta.koc_id) || 0));
    profileMap.set(
      tradeNo,
      resolveKocCommissionProfile(
        currentCumulative,
        targetMeta.service,
        targetMeta.payment_option_id,
        targetMeta.payment_option_title,
      ),
    );
  });

  return { profileMap, cumulativePaidByKoc };
}

function prepareKocSettlementPayload(
  order: JsonRecord,
  status: string,
  note: string,
  manualCommission: number,
  commissionProfile?: KocCommissionProfile,
  role: SettlementRole = 'direct',
): SettlementPrepareResult {
  const resolvedRole: SettlementRole = 'direct';
  const paid = Boolean(order.paid);
  if ((status === 'approved' || status === 'paid') && !paid) {
    return { ok: false, reason: 'order_not_paid', role: resolvedRole };
  }

  const birth = parseBirthInput(order.birth_input);
  const tracking = parseTracking(birth);
  const attribution = extractKocAttribution(birth, tracking);
  const beneficiaryKocId = getBeneficiaryKocIdByRole(attribution, resolvedRole);
  if (!beneficiaryKocId) {
    return { ok: false, reason: 'beneficiary_koc_missing', role: resolvedRole };
  }
  const existingSettlement = parseKocSettlementByRole(tracking, resolvedRole);
  const existingSettlementItems = parseKocSettlementItems(tracking);
  const nowIso = new Date().toISOString();
  const pricing = resolveOrderPricing(birth, tracking);
  const orderAmount = pricing.final_amount;
  const option = parsePaymentOption(birth);
  const service = detectService(birth);
  const paymentOptionId = normalizePaymentOptionId(option.id, service === 'hepan' ? 'vip' : 'basic');
  const defaultProfile = commissionProfile || resolveKocCommissionProfile(
    0,
    service,
    paymentOptionId,
    asString(option.title),
  );
  const defaultCommission = resolveCommissionAmount(orderAmount, defaultProfile);
  const resolvedCommission = manualCommission > 0
    ? toFixedAmount(manualCommission)
    : toFixedAmount(
      toNumber(existingSettlement.commission_amount) > 0
        ? toNumber(existingSettlement.commission_amount)
        : defaultCommission,
    );

  const nextSettlement: JsonRecord = {
    ...(existingSettlement || {}),
    role: resolvedRole,
    koc_id: beneficiaryKocId,
    status,
    note,
    updated_at: nowIso,
    commission_amount: resolvedCommission,
    commission_rate: defaultProfile.rate,
    tier_id: defaultProfile.tier_id,
    tier_name: defaultProfile.tier_name,
    cumulative_paid_before: defaultProfile.cumulative_paid_before,
    formula_type: defaultProfile.formula_type,
    amount_original: pricing.original_amount,
    amount_final: pricing.final_amount,
    amount_source: pricing.final_source,
    discount_applied: pricing.discount_applied,
    discount_amount: pricing.discount_amount,
    invite_code: pricing.invite_code || null,
    commission_formula: `commission = ${pricing.final_amount.toFixed(2)} * ${(defaultProfile.rate * 100).toFixed(2)}%`,
  };
  if (status === 'paid') {
    nextSettlement.paid_at = asString(existingSettlement.paid_at) || nowIso;
  }

  const nextTracking: JsonRecord = {
    ...(tracking || {}),
    koc_settlement_items: {
      ...(existingSettlementItems || {}),
      [resolvedRole]: nextSettlement,
    },
    koc_settlement: nextSettlement,
  };
  const nextBirth: JsonRecord = {
    ...(birth || {}),
    tracking: nextTracking,
  };
  return { ok: true, nextBirth, nextSettlement, role: resolvedRole };
}

async function applyKocSettlementUpdate(
  supabase: any,
  order: JsonRecord,
  tradeNo: string,
  status: string,
  note: string,
  manualCommission: number,
  commissionProfile?: KocCommissionProfile,
  role: SettlementRole = 'direct',
): Promise<{ ok: true; settlement: JsonRecord } | { ok: false; reason: string; details?: string }> {
  const prepared = prepareKocSettlementPayload(order, status, note, manualCommission, commissionProfile, role);
  if (!prepared.ok) return prepared;

  const { error: updateError } = await supabase
    .from('orders')
    .update({ birth_input: JSON.stringify(prepared.nextBirth) })
    .eq('trade_no', tradeNo);
  if (updateError) {
    return { ok: false, reason: 'order_update_failed', details: asString(updateError.message) };
  }

  return {
    ok: true,
    settlement: prepared.nextSettlement,
  };
}

function sanitizeKocBuilderPayload(input: unknown): JsonRecord {
  const src = asRecord(input);
  const rowsSrc = Array.isArray(src.rows) ? src.rows : [];
  const rows: JsonRecord[] = [];
  for (const item of rowsSrc.slice(0, MAX_KOC_BUILDER_ROWS)) {
    const row = asRecord(item);
    const kocId = normalizePartnerId(row.koc_id);
    if (!kocId) continue;
    let parentKocId = normalizePartnerId(row.parent_koc_id || row.parentKocId || row.parent);
    if (parentKocId === kocId) parentKocId = '';
    const contentId = normalizePartnerId(row.content_id);
    const kocCode = asString(row.koc_code).slice(0, 64);
    const name = asString(row.name).slice(0, 64) || kocId;
    const link = asString(row.link).slice(0, 800);
    if (!link) continue;
    rows.push({
      name,
      koc_id: kocId,
      parent_koc_id: parentKocId,
      content_id: contentId,
      koc_code: kocCode,
      link,
    });
  }
  return {
    base_url: asString(src.base_url).slice(0, 160) || DEFAULT_SITE_ORIGIN,
    landing_path: asString(src.landing_path).slice(0, 200) || '/',
    channel: normalizePartnerId(src.channel).slice(0, 64),
    input_text: asString(src.input_text).slice(0, 30000),
    rows,
  };
}

async function loadKocBuilderCloudConfig(supabase: any): Promise<JsonRecord> {
  const { data, error } = await supabase
    .from('api_abuse_logs')
    .select('created_at,identifier,meta')
    .eq('scope', 'koc_builder')
    .eq('event', 'snapshot')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`koc_builder_load_failed: ${asString(error.message) || 'unknown_error'}`);
  if (!data) {
    return {
      base_url: DEFAULT_SITE_ORIGIN,
      landing_path: '/',
      channel: '',
      input_text: '',
      rows: [],
      updated_at: '',
      updated_by: '',
    };
  }
  const meta = asRecord((data as JsonRecord).meta);
  const payload = sanitizeKocBuilderPayload(meta.config || meta);
  return {
    ...payload,
    updated_at: asString(meta.updated_at || (data as JsonRecord).created_at),
    updated_by: asString(meta.updated_by || (data as JsonRecord).identifier),
  };
}

async function saveKocBuilderCloudConfig(
  supabase: any,
  payload: unknown,
  updatedBy = 'admin',
): Promise<JsonRecord> {
  const config = sanitizeKocBuilderPayload(payload);
  const toSave: JsonRecord = {
    ...config,
    updated_at: new Date().toISOString(),
    updated_by: asString(updatedBy) || 'admin',
  };
  const { error } = await supabase
    .from('api_abuse_logs')
    .insert({
      scope: 'koc_builder',
      event: 'snapshot',
      identifier: asString(updatedBy) || 'admin',
      meta: {
        updated_at: toSave.updated_at,
        updated_by: toSave.updated_by,
        config,
      },
    });
  if (error) throw new Error(`koc_builder_save_failed: ${asString(error.message) || 'unknown_error'}`);
  return toSave;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function extractClientIp(req: Request): string {
  const candidates = [
    asString(req.headers.get('cf-connecting-ip')),
    asString(req.headers.get('x-real-ip')),
    asString(req.headers.get('x-forwarded-for')).split(',')[0]?.trim() || '',
    asString(req.headers.get('x-client-ip')),
  ].filter(Boolean);
  return (candidates[0] || 'unknown').slice(0, 80);
}

function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
    return ip;
  }
  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean);
    return parts.length ? `${parts.slice(0, 3).join(':')}::` : ip;
  }
  return ip;
}

function detectDeviceType(uaRaw: string): 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown' {
  const ua = String(uaRaw || '').toLowerCase();
  if (!ua) return 'unknown';
  if (/(bot|spider|crawler|curl|wget|python-requests|headless)/i.test(ua)) return 'bot';
  if (/(ipad|tablet|kindle|playbook|silk)/i.test(ua)) return 'tablet';
  if (/(mobi|iphone|android|phone|harmonyos|miui|mobile)/i.test(ua)) return 'mobile';
  return 'desktop';
}

function readHeader(req: Request, names: string[]): string {
  for (const name of names) {
    const value = asString(req.headers.get(name));
    if (value) return value;
  }
  return '';
}

function normalizeGeoText(value: unknown, maxLen = 80): string {
  return asString(value).replace(/\s+/g, ' ').slice(0, maxLen);
}

function extractGeoLocation(req: Request): { country: string; province: string; city: string } {
  const country = normalizeGeoText(readHeader(req, [
    'x-vercel-ip-country-name',
    'x-vercel-ip-country',
    'cf-ipcountry',
    'x-country',
  ]));
  const province = normalizeGeoText(readHeader(req, [
    'x-vercel-ip-country-region',
    'x-vercel-ip-region',
    'cf-region',
    'cf-region-code',
    'x-region',
  ]));
  const city = normalizeGeoText(readHeader(req, [
    'x-vercel-ip-city',
    'cf-ipcity',
    'x-city',
  ]));

  return {
    country: country || 'unknown',
    province: province || 'unknown',
    city: city || 'unknown',
  };
}

function isUnknownGeo(value: unknown): boolean {
  return !asString(value) || asString(value).toLowerCase() === 'unknown';
}

function isPublicIp(ipRaw: string): boolean {
  const ip = asString(ipRaw).toLowerCase();
  if (!ip || ip === 'unknown') return false;
  if (ip.includes(':')) {
    if (ip === '::1') return false;
    if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return false;
    return true;
  }
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = m.slice(1).map((v) => Number(v));
  if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const [a, b] = octets;
  if (a === 10 || a === 127 || a === 0) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  return true;
}

async function lookupGeoByIp(ipRaw: string): Promise<{ country: string; province: string; city: string } | null> {
  const ip = asString(ipRaw);
  if (!isPublicIp(ip)) return null;

  const now = Date.now();
  if (GEO_IP_CACHE.size > 5000) {
    for (const [key, value] of GEO_IP_CACHE.entries()) {
      if (value.expires_at <= now) GEO_IP_CACHE.delete(key);
    }
    if (GEO_IP_CACHE.size > 5000) {
      let trimmed = 0;
      for (const key of GEO_IP_CACHE.keys()) {
        GEO_IP_CACHE.delete(key);
        trimmed += 1;
        if (trimmed >= 1000) break;
      }
    }
  }
  const cached = GEO_IP_CACHE.get(ip);
  if (cached && cached.expires_at > now) {
    return {
      country: cached.country,
      province: cached.province,
      city: cached.city,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEO_IP_LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'tengyunzi-site-visit/1.0' },
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null) as JsonRecord | null;
    if (!body || body.success === false) return null;

    const geo = {
      country: normalizeGeoText(body.country || body.country_code || 'unknown'),
      province: normalizeGeoText(body.region || body.region_code || 'unknown'),
      city: normalizeGeoText(body.city || 'unknown'),
    };
    const normalized = {
      country: geo.country || 'unknown',
      province: geo.province || 'unknown',
      city: geo.city || 'unknown',
    };
    GEO_IP_CACHE.set(ip, {
      ...normalized,
      expires_at: now + GEO_IP_LOOKUP_CACHE_TTL_MS,
    });
    return normalized;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveGeoLocation(req: Request, ipRaw: string): Promise<{ country: string; province: string; city: string }> {
  const fromHeaders = extractGeoLocation(req);
  if (!isUnknownGeo(fromHeaders.country) && !isUnknownGeo(fromHeaders.province) && !isUnknownGeo(fromHeaders.city)) {
    return fromHeaders;
  }

  const fromIpLookup = await lookupGeoByIp(ipRaw);
  if (!fromIpLookup) return fromHeaders;

  return {
    country: !isUnknownGeo(fromHeaders.country) ? fromHeaders.country : fromIpLookup.country,
    province: !isUnknownGeo(fromHeaders.province) ? fromHeaders.province : fromIpLookup.province,
    city: !isUnknownGeo(fromHeaders.city) ? fromHeaders.city : fromIpLookup.city,
  };
}

function detectService(birth: JsonRecord): 'pdf' | 'hepan' | 'bazi' {
  const service = asString(birth.order_service).toLowerCase();
  if (service === 'pdf') return 'pdf';
  if (service === 'hepan') return 'hepan';
  return 'bazi';
}

function isDelivered(service: 'pdf' | 'hepan' | 'bazi', hasAnalysis: boolean, tracking: JsonRecord): boolean {
  if (service === 'pdf') return Boolean(toMillis(tracking.pdf_download_clicked_at));
  return hasAnalysis || Boolean(toMillis(tracking.report_viewed_at));
}

async function buildSettlementOverviewData(
  supabase: any,
  options: {
    days: number;
    maxRows: number;
  },
) {
  const { days, maxRows } = options;
  const sinceMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  const sinceIso = new Date(sinceMs).toISOString();

  const { data, error } = await supabase
    .from('orders')
    .select('trade_no,paid,analysis,created_at,birth_input')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(maxRows);
  if (error) return { error: 'settlement_overview_query_failed', details: error.message };

  const rows = Array.isArray(data) ? data : [];
  const summary = {
    total_orders: 0,
    paid_orders: 0,
    unpaid_orders: 0,
    delivered_orders: 0,
    paid_not_delivered: 0,
    paid_gmv: 0,
    platform_fee_rate: PLATFORM_FEE_RATE,
    platform_fee_amount: 0,
    koc_commission_amount: 0,
    net_profit: 0,
    net_margin_rate: 0,
  };
  const byService: Record<string, { service: string; total_orders: number; paid_orders: number; delivered_orders: number; paid_gmv: number }> = {};
  const byTier: Record<string, { payment_option_id: string; total_orders: number; paid_orders: number; paid_gmv: number }> = {};
  const commissionTargets: Array<{
    trade_no: string;
    koc_id: string;
    service: string;
    payment_option_id: string;
    payment_option_title: string;
  }> = [];
  const paidAmountByTrade = new Map<string, number>();

  const ensureService = (service: string) => {
    if (!byService[service]) {
      byService[service] = {
        service,
        total_orders: 0,
        paid_orders: 0,
        delivered_orders: 0,
        paid_gmv: 0,
      };
    }
    return byService[service];
  };
  const ensureTier = (paymentOptionId: string) => {
    if (!byTier[paymentOptionId]) {
      byTier[paymentOptionId] = {
        payment_option_id: paymentOptionId,
        total_orders: 0,
        paid_orders: 0,
        paid_gmv: 0,
      };
    }
    return byTier[paymentOptionId];
  };

  for (const row of rows) {
    const birth = parseBirthInput((row as JsonRecord).birth_input);
    const tracking = parseTracking(birth);
    const attribution = extractKocAttribution(birth, tracking);
    const service = detectService(birth);
    const paymentOption = parsePaymentOption(birth);
    const paymentOptionId = normalizePaymentOptionId(paymentOption.id, service === 'hepan' ? 'vip' : 'basic');
    const paid = Boolean((row as JsonRecord).paid);
    const hasAnalysis = hasText((row as JsonRecord).analysis);
    const delivered = isDelivered(service, hasAnalysis, tracking);
    const amount = resolveOrderAmount(birth, tracking);
    const tradeNo = asString((row as JsonRecord).trade_no);

    summary.total_orders += 1;
    const serviceAgg = ensureService(service);
    const tierAgg = ensureTier(paymentOptionId);
    serviceAgg.total_orders += 1;
    tierAgg.total_orders += 1;

    if (paid) {
      summary.paid_orders += 1;
      summary.paid_gmv = toFixedAmount(summary.paid_gmv + amount);
      serviceAgg.paid_orders += 1;
      serviceAgg.paid_gmv = toFixedAmount(serviceAgg.paid_gmv + amount);
      tierAgg.paid_orders += 1;
      tierAgg.paid_gmv = toFixedAmount(tierAgg.paid_gmv + amount);
      if (tradeNo) {
        paidAmountByTrade.set(tradeNo, amount);
        const kocId = asString(attribution.koc_id);
        if (kocId) {
          commissionTargets.push({
            trade_no: tradeNo,
            koc_id: kocId,
            service,
            payment_option_id: paymentOptionId,
            payment_option_title: asString(paymentOption.title),
          });
        }
      }
    } else {
      summary.unpaid_orders += 1;
    }

    if (delivered) {
      summary.delivered_orders += 1;
      serviceAgg.delivered_orders += 1;
    }
    if (paid && !delivered) {
      summary.paid_not_delivered += 1;
    }
  }

  const conversion = {
    paid_rate: summary.total_orders > 0 ? toFixedAmount((summary.paid_orders / summary.total_orders) * 100) : 0,
    delivered_rate_from_paid: summary.paid_orders > 0 ? toFixedAmount((summary.delivered_orders / summary.paid_orders) * 100) : 0,
    delivered_rate_total: summary.total_orders > 0 ? toFixedAmount((summary.delivered_orders / summary.total_orders) * 100) : 0,
  };

  let kocCommissionTotal = 0;
  if (commissionTargets.length) {
    const { profileMap } = await buildKocCommissionProfileMap(supabase, commissionTargets);
    for (const target of commissionTargets) {
      const amount = toNumber(paidAmountByTrade.get(target.trade_no) || 0);
      if (amount <= 0) continue;
      const profile = profileMap.get(target.trade_no);
      kocCommissionTotal = toFixedAmount(kocCommissionTotal + resolveCommissionAmount(amount, profile));
    }
  }

  const platformFeeAmount = toFixedAmount(toNumber(summary.paid_gmv) * PLATFORM_FEE_RATE);
  const netProfit = toFixedAmount(toNumber(summary.paid_gmv) - platformFeeAmount - kocCommissionTotal);
  const netMarginRate = toNumber(summary.paid_gmv) > 0
    ? toFixedAmount((netProfit / toNumber(summary.paid_gmv)) * 100)
    : 0;

  summary.platform_fee_amount = platformFeeAmount;
  summary.koc_commission_amount = toFixedAmount(kocCommissionTotal);
  summary.net_profit = netProfit;
  summary.net_margin_rate = netMarginRate;
  const pricingFormulas = {
    paid_amount: 'paid_amount = gateway_total_fee || tracking.total_fee_final || payment_option.fee',
    discount: 'discount_amount = original_amount - paid_amount',
    commission: 'commission = paid_amount * tier_rate',
  };

  return {
    ok: true,
    days,
    since: sinceIso,
    scanned_rows: rows.length,
    summary: {
      ...summary,
      paid_gmv: toFixedAmount(summary.paid_gmv),
      platform_fee_rate: PLATFORM_FEE_RATE,
      platform_fee_amount: toFixedAmount(summary.platform_fee_amount),
      koc_commission_amount: toFixedAmount(summary.koc_commission_amount),
      net_profit: toFixedAmount(summary.net_profit),
      net_margin_rate: toFixedAmount(summary.net_margin_rate),
    },
    formulas: pricingFormulas,
    conversion,
    by_service: Object.values(byService).map((row) => ({
      ...row,
      paid_gmv: toFixedAmount(row.paid_gmv),
    })),
    by_tier: Object.values(byTier)
      .map((row) => ({
        ...row,
        paid_gmv: toFixedAmount(row.paid_gmv),
      }))
      .sort((a, b) => toNumber(b.paid_gmv) - toNumber(a.paid_gmv)),
  };
}

async function buildKocDashboardData(
  supabase: any,
  options: {
    days: number;
    maxRows: number;
    orderLimit: number;
    kocIdFilter: string;
    channelFilter: string;
    settlementFilter: string;
    roleFilter: SettlementRole | '';
  },
) {
  const { days, maxRows, orderLimit, kocIdFilter, channelFilter, settlementFilter } = options;
  const sinceMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  const sinceIso = new Date(sinceMs).toISOString();

  const { data, error } = await supabase
    .from('orders')
    .select('trade_no,paid,analysis,created_at,birth_input')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(maxRows);
  if (error) return { error: 'koc_query_failed', details: error.message };

  const rows = Array.isArray(data) ? data : [];
  const orderRows: JsonRecord[] = [];
  const byKocMap = new Map<string, Record<string, any>>();
  const candidateRows: Array<{
    trade_no: string;
    created_at: string;
    service: 'pdf' | 'hepan' | 'bazi';
    payment_option_id: string;
    payment_option_title: string;
    paid: boolean;
    delivered: boolean;
    has_analysis: boolean;
    total_fee: number;
    original_fee: number;
    discount_amount: number;
    discount_applied: boolean;
    invite_code: string;
    fee_source: OrderPricing['final_source'];
    koc_id: string;
    parent_koc_id: string;
    channel: string;
    content_id: string;
    koc_code: string;
    tracking: JsonRecord;
    result_url: string;
    resume_url: string;
  }> = [];
  const summary = {
    total_attributed_orders: 0,
    paid_orders: 0,
    delivered_orders: 0,
    paid_gmv: 0,
    commission_pending: 0,
    commission_paid: 0,
  };

  for (const row of rows) {
    const tradeNo = asString((row as JsonRecord).trade_no);
    if (!tradeNo) continue;
    const createdAt = asString((row as JsonRecord).created_at);
    const createdMs = toMillis(createdAt);
    if (!createdMs || createdMs < sinceMs) continue;

    const birth = parseBirthInput((row as JsonRecord).birth_input);
    const tracking = parseTracking(birth);
    const service = detectService(birth);
    const option = parsePaymentOption(birth);
    const paymentOptionId = normalizePaymentOptionId(option.id, service === 'hepan' ? 'vip' : 'basic');
    const paymentOptionTitle = asString(option.title);
    const attribution = extractKocAttribution(birth, tracking);
    const directKocId = asString(attribution.koc_id);
    const parentKocId = asString(attribution.parent_koc_id);
    const channel = asString(attribution.channel);
    const contentId = asString(attribution.content_id);
    const kocCode = asString(attribution.koc_code);
    if (!directKocId && !kocCode) continue;
    if (channelFilter && channel !== channelFilter) continue;

    const paid = Boolean((row as JsonRecord).paid);
    const hasAnalysis = hasText((row as JsonRecord).analysis);
    const delivered = isDelivered(service, hasAnalysis, tracking);
    const pricing = resolveOrderPricing(birth, tracking);
    const orderAmount = pricing.final_amount;
    const orderView = buildOrderViewPayload(row as JsonRecord, tradeNo);
    if (kocIdFilter && directKocId !== kocIdFilter) continue;

    candidateRows.push({
      trade_no: tradeNo,
      created_at: createdAt,
      service,
      payment_option_id: paymentOptionId,
      payment_option_title: paymentOptionTitle,
      paid,
      delivered,
      has_analysis: hasAnalysis,
      total_fee: orderAmount,
      original_fee: pricing.original_amount,
      discount_amount: pricing.discount_amount,
      discount_applied: pricing.discount_applied,
      invite_code: pricing.invite_code,
      fee_source: pricing.final_source,
      koc_id: directKocId,
      parent_koc_id: parentKocId,
      channel,
      content_id: contentId,
      koc_code: kocCode,
      tracking,
      result_url: orderView.result_url,
      resume_url: orderView.resume_url,
    });
  }

  const {
    profileMap: commissionProfileMap,
    cumulativePaidByKoc,
  } = await buildKocCommissionProfileMap(
    supabase,
    candidateRows.map((row) => ({
      trade_no: row.trade_no,
      koc_id: row.koc_id,
      service: row.service,
      payment_option_id: row.payment_option_id,
      payment_option_title: row.payment_option_title,
    })),
  );

  for (const row of candidateRows) {
    const settlement = parseKocSettlementByRole(row.tracking, 'direct');
    let settlementStatus = asString(settlement.status).toLowerCase();
    if (!settlementStatus) settlementStatus = row.paid ? 'pending' : 'unpaid';
    if (settlementFilter && settlementStatus !== settlementFilter) continue;

    const profile = commissionProfileMap.get(row.trade_no) || resolveKocCommissionProfile(
      0,
      row.service,
      row.payment_option_id,
      row.payment_option_title,
    );
    const manualCommission = toNumber(settlement.commission_amount);
    const commissionAmount = manualCommission > 0
      ? toFixedAmount(manualCommission)
      : resolveCommissionAmount(row.total_fee, profile);

    orderRows.push({
      trade_no: row.trade_no,
      created_at: row.created_at,
      service: row.service,
      payment_option_id: row.payment_option_id,
      paid: row.paid,
      delivered: row.delivered,
      has_analysis: row.has_analysis,
      total_fee: row.total_fee,
      original_fee: row.original_fee,
      discount_amount: row.discount_amount,
      discount_applied: row.discount_applied,
      invite_code: row.invite_code,
      fee_source: row.fee_source,
      commission_amount: commissionAmount,
      settlement_status: settlementStatus,
      settlement_note: asString(settlement.note),
      settlement_paid_at: asString(settlement.paid_at),
      settlement_updated_at: asString(settlement.updated_at),
      beneficiary_role: 'direct',
      beneficiary_koc_id: row.koc_id,
      koc_id: row.koc_id,
      parent_koc_id: row.parent_koc_id,
      channel: row.channel,
      content_id: row.content_id,
      koc_code: row.koc_code,
      result_url: row.result_url,
      resume_url: row.resume_url,
      tier_id: profile.tier_id,
      tier_name: profile.tier_name,
      commission_rate: profile.rate,
      cumulative_paid_before: profile.cumulative_paid_before,
      formula_type: profile.formula_type,
      commission_formula: `commission = ${row.total_fee.toFixed(2)} * ${(profile.rate * 100).toFixed(2)}%`,
    });

    summary.total_attributed_orders += 1;
    if (row.paid) {
      summary.paid_orders += 1;
      summary.paid_gmv = toFixedAmount(summary.paid_gmv + row.total_fee);
      if (settlementStatus === 'paid') {
        summary.commission_paid = toFixedAmount(summary.commission_paid + commissionAmount);
      } else if (settlementStatus !== 'invalid') {
        summary.commission_pending = toFixedAmount(summary.commission_pending + commissionAmount);
      }
    }
    if (row.delivered) summary.delivered_orders += 1;

    const kocKey = row.koc_id;
    const kocAgg = (byKocMap.get(kocKey) || {
      koc_id: row.koc_id,
      beneficiary_role: 'direct',
      direct_koc_id: row.koc_id,
      parent_koc_id: row.parent_koc_id,
      channel: row.channel,
      attributed_orders: 0,
      paid_orders: 0,
      delivered_orders: 0,
      paid_gmv: 0,
      commission_pending: 0,
      commission_paid: 0,
    }) as Record<string, any>;
    kocAgg.attributed_orders += 1;
    if (row.paid) {
      kocAgg.paid_orders += 1;
      kocAgg.paid_gmv = toFixedAmount(toNumber(kocAgg.paid_gmv) + row.total_fee);
      if (settlementStatus === 'paid') {
        kocAgg.commission_paid = toFixedAmount(toNumber(kocAgg.commission_paid) + commissionAmount);
      } else if (settlementStatus !== 'invalid') {
        kocAgg.commission_pending = toFixedAmount(toNumber(kocAgg.commission_pending) + commissionAmount);
      }
    }
    if (row.delivered) kocAgg.delivered_orders += 1;
    byKocMap.set(kocKey, kocAgg);
  }

  const byKoc = Array.from(byKocMap.values())
    .map((row) => ({
      ...row,
      ...buildKocTierProgress(toNumber(cumulativePaidByKoc.get(asString(row.koc_id)) || 0)),
    }))
    .sort((a, b) => toNumber(b.commission_pending) - toNumber(a.commission_pending));
  orderRows.sort((a, b) => toMillis(b.created_at) - toMillis(a.created_at));

  const growthTargetKocId = sanitizePartnerId(kocIdFilter);
  const growth = growthTargetKocId
    ? await buildKocMonthlyGrowthData(supabase, growthTargetKocId)
    : { koc_id: '', months: [] };

  return {
    ok: true,
    days,
    since: sinceIso,
    scanned_rows: rows.length,
    summary,
    by_koc: byKoc.slice(0, 200),
    orders: orderRows.slice(0, orderLimit),
    growth,
    formulas: {
      paid_amount: 'paid_amount = gateway_total_fee || tracking.total_fee_final || payment_option.fee',
      discount: 'discount_amount = original_amount - paid_amount',
      commission: 'commission = paid_amount * tier_rate',
    },
  };
}

function formatMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseMonthKey(monthKey: string): Date | null {
  const matched = /^(\d{4})-(\d{2})$/.exec(asString(monthKey));
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

function addMonthsUtc(source: Date, step = 1): Date {
  return new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + step, 1));
}

async function buildKocMonthlyGrowthData(
  supabase: any,
  kocId: string,
) {
  const targetKocId = sanitizePartnerId(kocId);
  if (!targetKocId) {
    return {
      koc_id: '',
      months: [],
    };
  }

  const { data, error } = await supabase
    .from('orders')
    .select('paid,birth_input,created_at')
    .order('created_at', { ascending: true })
    .limit(30000);

  if (error) {
    console.error('buildKocMonthlyGrowthData query failed:', error.message);
    return {
      koc_id: targetKocId,
      months: [],
      error: 'growth_query_failed',
    };
  }

  const monthlyPaidMap = new Map<string, { paid_gmv: number; paid_orders: number }>();
  const rows = Array.isArray(data) ? data : [];
  for (const row of rows) {
    const birth = parseBirthInput((row as JsonRecord).birth_input);
    const tracking = parseTracking(birth);
    const attribution = extractKocAttribution(birth, tracking);
    if (asString(attribution.koc_id) !== targetKocId) continue;
    if (!Boolean((row as JsonRecord).paid)) continue;

    const createdAt = asString((row as JsonRecord).created_at);
    const createdMs = toMillis(createdAt);
    if (!createdMs) continue;
    const monthKey = formatMonthKey(new Date(createdMs));
    const amount = resolveOrderAmount(birth, tracking);
    const current = monthlyPaidMap.get(monthKey) || { paid_gmv: 0, paid_orders: 0 };
    current.paid_gmv = toFixedAmount(current.paid_gmv + amount);
    current.paid_orders += 1;
    monthlyPaidMap.set(monthKey, current);
  }

  const sortedMonths = Array.from(monthlyPaidMap.keys()).sort();
  if (!sortedMonths.length) {
    return {
      koc_id: targetKocId,
      months: [],
    };
  }

  const start = parseMonthKey(sortedMonths[0]);
  const end = parseMonthKey(sortedMonths[sortedMonths.length - 1]);
  if (!start || !end) {
    return {
      koc_id: targetKocId,
      months: [],
    };
  }

  const months: Array<Record<string, unknown>> = [];
  let cursor = start;
  let cumulative = 0;
  while (cursor.getTime() <= end.getTime()) {
    const monthKey = formatMonthKey(cursor);
    const current = monthlyPaidMap.get(monthKey) || { paid_gmv: 0, paid_orders: 0 };
    cumulative = toFixedAmount(cumulative + toNumber(current.paid_gmv));
    const tier = buildKocTierProgress(cumulative);
    months.push({
      month: monthKey,
      paid_gmv: toFixedAmount(current.paid_gmv),
      paid_orders: current.paid_orders,
      cumulative_paid_gmv: cumulative,
      tier_id: tier.tier_id,
      tier_name: tier.tier_name,
      auto_rate: tier.auto_rate,
      consult_rate: tier.consult_rate,
    });
    cursor = addMonthsUtc(cursor, 1);
  }

  const latest = months[months.length - 1] as Record<string, unknown>;
  return {
    koc_id: targetKocId,
    months,
    latest_tier_id: asString(latest.tier_id),
    latest_tier_name: asString(latest.tier_name),
    latest_cumulative_paid_gmv: toNumber(latest.cumulative_paid_gmv),
  };
}

function normalizeSiteOrigin(): string {
  const env = asString(Deno.env.get('PUBLIC_SITE_ORIGIN'));
  const base = env || DEFAULT_SITE_ORIGIN;
  return base.replace(/\/+$/, '');
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
  birth: JsonRecord,
): Promise<{ url: string | null; expires_in: number; bucket: string; object_path: string; }> {
  const bucket = asString(birth.pdf_storage_bucket) || asString(Deno.env.get('PDF_STORAGE_BUCKET')) || DEFAULT_PDF_STORAGE_BUCKET;
  const objectPath = normalizeStoragePath(
    birth.pdf_storage_path || birth.pdf_storage_object || birth.pdf_download_path || DEFAULT_PDF_PATH,
  );
  const expiresIn = getPdfSignedTtlSeconds();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, expiresIn);
  if (error || !data?.signedUrl) {
    return { url: null, expires_in: expiresIn, bucket, object_path: objectPath };
  }
  const signed = String(data.signedUrl || '').trim();
  const absolute = /^https?:\/\//i.test(signed) ? signed : `${supabaseUrl}${signed}`;
  return { url: absolute, expires_in: expiresIn, bucket, object_path: objectPath };
}

function buildResumeLinks(siteOrigin: string, tradeNo: string, service: 'pdf' | 'hepan' | 'bazi', birth: JsonRecord) {
  const encodedTradeNo = encodeURIComponent(tradeNo);
  const defaultResultUrl = `${siteOrigin}/result.html?trade_no=${encodedTradeNo}&paid=true`;
  const hepanResultUrl = `${siteOrigin}/hepan.html?trade_no=${encodedTradeNo}`;
  const pdfResumeUrl = `${siteOrigin}/index.html?pdf_paid=1&trade_no=${encodedTradeNo}`;
  const resultUrl = service === 'hepan' ? hepanResultUrl : defaultResultUrl;
  const resumeUrl = service === 'pdf' ? pdfResumeUrl : resultUrl;

  return {
    result_url: resultUrl,
    resume_url: resumeUrl,
    pdf_download_url: '',
  };
}

function buildOrderViewPayload(order: JsonRecord, tradeNo: string) {
  const birth = parseBirthInput(order.birth_input);
  const tracking = parseTracking(birth);
  const service = detectService(birth);
  const siteOrigin = normalizeSiteOrigin();
  const links = buildResumeLinks(siteOrigin, tradeNo, service, birth);
  const hasAnalysis = hasText(order.analysis);
  const paid = Boolean(order.paid);
  const deliveryState = !paid
    ? 'unpaid'
    : service === 'pdf'
      ? 'download_ready'
      : hasAnalysis
        ? 'report_ready'
        : 'report_generating';

  return {
    trade_no: tradeNo,
    created_at: asString(order.created_at),
    paid,
    analysis_exists: hasAnalysis,
    service,
    payment_option_id: normalizePaymentOptionId(parseBirthInput(birth.payment_option).id, 'basic'),
    delivery_state: deliveryState,
    result_url: links.result_url,
    resume_url: links.resume_url,
    download_url: links.pdf_download_url || null,
    gateway_status: asString(tracking.gateway_status),
    gateway_transaction_id: asString(tracking.gateway_transaction_id),
    gateway_open_order_id: asString(tracking.gateway_open_order_id),
    gateway_trade_order_id: asString(tracking.gateway_trade_order_id) || tradeNo,
    gateway_total_fee: asString(tracking.gateway_total_fee),
    gateway_appid: asString(tracking.gateway_appid),
    gateway_plugins: asString(tracking.gateway_plugins),
    gateway_source: asString(tracking.gateway_source),
    payment_paid_at: asString(tracking.payment_paid_at),
    payment_verified_at: asString(tracking.payment_verified_at),
    birth_input: birth,
  };
}

async function attachSignedPdfDownloadToView(
  supabase: any,
  supabaseUrl: string,
  view: JsonRecord,
): Promise<JsonRecord> {
  const service = asString(view.service);
  const paid = Boolean(view.paid);
  if (service !== 'pdf' || !paid) return view;

  const birth = parseBirthInput(view.birth_input);
  const signed = await createPdfSignedUrl(supabase, supabaseUrl, birth);
  if (signed.url) {
    view.download_url = signed.url;
    view.download_signed = true;
    view.download_expires_in = signed.expires_in;
  } else {
    const fallbackPath = asString(birth.pdf_download_path || DEFAULT_PDF_PATH).replace(/^\/+/, '');
    view.download_url = encodeURI(`${normalizeSiteOrigin()}/${fallbackPath}`);
    view.download_signed = false;
    view.download_expires_in = null;
  }
  view.download_bucket = signed.bucket;
  view.download_object_path = signed.object_path;
  return view;
}

async function triggerAnalyzeForPaidOrder(
  supabaseUrl: string,
  authHeader: string,
  tradeNo: string,
  service: 'pdf' | 'hepan' | 'bazi',
  birth: JsonRecord,
): Promise<boolean> {
  if (service === 'pdf') return false;

  const basePayload: JsonRecord = {
    trade_no: tradeNo,
    service: service === 'hepan' ? 'hepan' : 'bazi',
    free_only: false,
    payment_option_id: normalizePaymentOptionId(parseBirthInput(birth.payment_option).id, 'basic'),
  };

  if (service === 'hepan') {
    basePayload.man_bazi_str = birth.man_bazi_str;
    basePayload.woman_bazi_str = birth.woman_bazi_str;
    basePayload.man_dayun = birth.man_dayun;
    basePayload.woman_dayun = birth.woman_dayun;
    basePayload.current_year = birth.current_year;
  } else {
    basePayload.year = birth.year;
    basePayload.month = birth.month;
    basePayload.day = birth.day;
    basePayload.hour = birth.hour;
    basePayload.gender = birth.gender;
    basePayload.bazi_str = birth.bazi_str;
    basePayload.dayun_text = birth.dayun_text;
    basePayload.special_years_text = birth.special_years_text;
    basePayload.start_age = birth.start_age;
  }

  fetch(`${supabaseUrl}/functions/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(basePayload),
  }).catch((err) => {
    console.error('admin resend analyze trigger failed:', err);
  });

  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({} as JsonRecord));
    const action = String((body as JsonRecord).action || '').trim();
    if (!action) return json(req, { error: 'action_required' }, 400);

    if (action === 'koc_partner_login') {
      const kocId = normalizePartnerId((body as JsonRecord).koc_id);
      const password = asString((body as JsonRecord).password);
      if (!kocId || !password) return json(req, { error: 'koc_id_and_password_required' }, 400);

      const accounts = parseKocAccounts();
      const account = accounts[kocId];
      if (!account || account.active === false) return json(req, { error: 'invalid_credentials' }, 401);
      if (!timingSafeEqual(password, account.password)) return json(req, { error: 'invalid_credentials' }, 401);
      const displayName = account.name || kocId;

      const now = Math.floor(Date.now() / 1000);
      const ttl = getKocSessionTtlSeconds();
      const session: KocSession = {
        koc_id: kocId,
        name: displayName,
        iat: now,
        exp: now + ttl,
      };
      const token = await createKocSessionToken(session);
      return json(req, {
        ok: true,
        token,
        expires_in: ttl,
        koc_id: session.koc_id,
        name: session.name,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return json(req, { error: 'missing_supabase_env' }, 500);
    const supabase = createClient(supabaseUrl, serviceKey);

    if (action === 'site_visit_track') {
      const pagePath = asString((body as JsonRecord).page_path || (body as JsonRecord).page || '/').slice(0, 180) || '/';
      const pageTitle = asString((body as JsonRecord).page_title).slice(0, 120);
      const lang = asString((body as JsonRecord).lang).slice(0, 40);
      const referrer = asString((body as JsonRecord).referrer || req.headers.get('referer')).slice(0, 260);
      const entryUrl = asString((body as JsonRecord).entry_url).slice(0, 320);
      const utmSource = asString((body as JsonRecord).utm_source).slice(0, 80);
      const utmMedium = asString((body as JsonRecord).utm_medium).slice(0, 80);
      const utmCampaign = asString((body as JsonRecord).utm_campaign).slice(0, 120);
      const utmContent = asString((body as JsonRecord).utm_content).slice(0, 120);
      const visitorId = asString((body as JsonRecord).visitor_id).slice(0, 80);
      const ua = asString((body as JsonRecord).user_agent || req.headers.get('user-agent')).slice(0, 240);
      const clientIp = extractClientIp(req);
      const ipMasked = maskIp(clientIp);
      const testerId = sanitizeTesterId(
        (body as JsonRecord).tester_id
        || (body as JsonRecord).tester
        || (body as JsonRecord).debug_tester
        || '',
      );
      const isTester = testerId ? true : toBoolean((body as JsonRecord).is_tester);
      const isOwnerDevice = detectOwnerDevice(testerId, ua);
      const device = detectDeviceType(ua);
      const isBot = device === 'bot' || isLikelyAutomatedUaShared(ua);
      const visitType = isOwnerDevice ? 'owner' : (isTester ? 'tester' : (isBot ? 'bot' : 'normal'));
      const geo = await resolveGeoLocation(req, clientIp);
      const identifier = visitorId || `${ipMasked}|${ua.slice(0, 64)}` || `visit-${Date.now()}`;
      const visitRateWindowSeconds = readEnvNumber('RATE_LIMIT_SITE_VISIT_TRACK_WINDOW_SECONDS', SITE_VISIT_RATE_LIMIT_WINDOW_SECONDS, 10, 3600);
      const visitRateMaxRequests = readEnvNumber('RATE_LIMIT_SITE_VISIT_TRACK_MAX_REQUESTS', SITE_VISIT_RATE_LIMIT_MAX_REQUESTS, 5, 500);
      const visitRateIdentifier = await buildSharedRateLimitIdentifier(req);
      const visitRateResult = await consumeSharedRateLimit(supabase, {
        scope: 'site-visit-track',
        identifier: visitRateIdentifier,
        windowSeconds: visitRateWindowSeconds,
        maxRequests: visitRateMaxRequests,
      });
      if (!visitRateResult.allowed) {
        await recordSharedAbuseLog(supabase, {
          scope: 'site-visit-track',
          identifier: visitRateIdentifier,
          event: 'rate_limited',
          meta: {
            ip_masked: ipMasked,
            current_count: visitRateResult.currentCount,
            max_requests: visitRateMaxRequests,
            window_seconds: visitRateWindowSeconds,
            page_path: pagePath,
          },
        });
        return sharedTooManyRequestsResponse(req, resolveAllowedOrigins(), {
          message: 'visit tracking is too frequent',
          retryAfterSeconds: visitRateResult.retryAfterSeconds,
          scope: 'site-visit-track',
          currentCount: visitRateResult.currentCount,
        });
      }

      const { error } = await supabase
        .from('api_abuse_logs')
        .insert({
          scope: 'site_visit',
          identifier,
          event: 'page_view',
          meta: {
            ip_masked: ipMasked,
            device,
            page_path: pagePath,
            page_title: pageTitle,
            lang,
            referrer,
            entry_url: entryUrl,
            utm_source: utmSource,
            utm_medium: utmMedium,
            utm_campaign: utmCampaign,
            utm_content: utmContent,
            ua: ua.slice(0, 160),
            visitor_id: visitorId,
            tester_id: testerId,
            is_tester: isTester,
            is_owner_device: isOwnerDevice,
            visit_type: visitType,
            is_bot: isBot,
            country: geo.country,
            province: geo.province,
            city: geo.city,
          },
        });

      if (error) {
        return json(req, { error: 'visit_track_failed', details: error.message }, 500);
      }
      return json(req, { ok: true });
    }

    if (action === 'koc_partner_dashboard') {
      const kocToken = asString(req.headers.get('x-koc-token') || (body as JsonRecord).token);
      const session = await verifyKocSessionToken(kocToken);
      if (!session) return json(req, { error: 'invalid_or_expired_koc_token' }, 401);

      const days = Math.min(Math.max(Number((body as JsonRecord).days || 30), 1), 120);
      const maxRows = Math.min(Math.max(Number((body as JsonRecord).max_rows || 3000), 100), 5000);
      const orderLimit = Math.min(Math.max(Number((body as JsonRecord).order_limit || 300), 30), 500);
      const settlementFilter = asString((body as JsonRecord).settlement_status).toLowerCase();
      const roleFilterRaw = asString((body as JsonRecord).beneficiary_role || (body as JsonRecord).role).toLowerCase();
      const roleFilter = ALLOWED_KOC_SETTLEMENT_ROLES.has(roleFilterRaw) ? normalizeSettlementRole(roleFilterRaw) : '';
      const dashboardData = await buildKocDashboardData(supabase, {
        days,
        maxRows,
        orderLimit,
        kocIdFilter: session.koc_id,
        channelFilter: '',
        settlementFilter,
        roleFilter,
      });
      if ((dashboardData as JsonRecord).error) {
        return json(req, dashboardData, 500);
      }
      return json(req, {
        ...(dashboardData as JsonRecord),
        viewer: {
          koc_id: session.koc_id,
          name: session.name,
          exp: session.exp,
        },
      });
    }

    const expectedAdminToken = (Deno.env.get('ADMIN_DASHBOARD_TOKEN') || '').trim();
    if (!expectedAdminToken) return json(req, { error: 'missing_admin_token_env' }, 500);

    const providedToken = getAdminToken(req);
    if (!providedToken || !timingSafeEqual(providedToken, expectedAdminToken)) {
      return json(req, { error: 'unauthorized' }, 401);
    }

    const internalAuthHeader = getInternalAuthHeader(req, serviceKey);

    if (action === 'koc_accounts_status') {
      const accounts = parseKocAccounts();
      return json(req, {
        ok: true,
        count: Object.keys(accounts).length,
        koc_ids: Object.keys(accounts),
      });
    }

    if (action === 'koc_builder_get') {
      try {
        const config = await loadKocBuilderCloudConfig(supabase);
        return json(req, {
          ok: true,
          config,
        });
      } catch (err) {
        return json(req, {
          error: 'koc_builder_get_failed',
          details: err instanceof Error ? err.message : String(err),
        }, 500);
      }
    }

    if (action === 'koc_builder_set') {
      const payload = (body as JsonRecord).config ?? {};
      try {
        const config = await saveKocBuilderCloudConfig(supabase, payload, 'admin');
        return json(req, {
          ok: true,
          config,
          rows: Array.isArray(config.rows) ? config.rows.length : 0,
        });
      } catch (err) {
        return json(req, {
          error: 'koc_builder_set_failed',
          details: err instanceof Error ? err.message : String(err),
        }, 500);
      }
    }

    if (action === 'list') {
      const limit = Math.min(Math.max(Number((body as JsonRecord).limit || 50), 1), 100);
      const { data, error } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return json(req, { error: 'list_failed', details: error.message }, 500);
      return json(req, { ok: true, orders: data || [] });
    }

    if (action === 'verify') {
      const tradeNo = String((body as JsonRecord).trade_no || '').trim();
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);

      const reconcileRes = await fetch(`${supabaseUrl}/functions/v1/reconcile-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: internalAuthHeader,
        },
        body: JSON.stringify({ trade_no: tradeNo }),
      });
      const reconcileData = await reconcileRes.json().catch(() => ({}));
      if (!reconcileRes.ok) {
        return json(req, {
          error: 'verify_failed',
          status: reconcileRes.status,
          details: reconcileData,
        }, 502);
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (orderError) return json(req, { error: 'order_query_failed', details: orderError.message }, 500);
      if (!order) return json(req, { error: 'order_not_found' }, 404);

      return json(req, {
        ok: true,
        trade_no: tradeNo,
        paid: !!order.paid,
        analysis_exists: !!String(order.analysis || '').trim(),
        analysis_triggered: !!reconcileData?.analysis_triggered,
        reconcile: reconcileData,
        order,
      });
    }

    if (action === 'create_order') {
      const birthInput = (body as JsonRecord).birth_input;
      const rawTradeNo = String((body as JsonRecord).trade_no || '').trim();
      const tradeNo = rawTradeNo || `bazi-manual-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);
      if (!birthInput || typeof birthInput !== 'object' || Array.isArray(birthInput)) {
        return json(req, { error: 'invalid_birth_input' }, 400);
      }

      const birthInputStr = JSON.stringify(birthInput);
      if (birthInputStr.length < 2 || birthInputStr.length > 20000) {
        return json(req, { error: 'birth_input_too_large' }, 400);
      }

      const { error } = await supabase.from('orders').insert({
        trade_no: tradeNo,
        paid: false,
        analysis: null,
        birth_input: birthInputStr,
      });
      if (error) return json(req, { error: 'create_order_failed', details: error.message }, 500);
      return json(req, { ok: true, trade_no: tradeNo });
    }

    if (action === 'create_payment') {
      const tradeNo = String((body as JsonRecord).trade_no || '').trim();
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('trade_no,paid,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (orderError) return json(req, { error: 'order_query_failed', details: orderError.message }, 500);
      if (!order) return json(req, { error: 'order_not_found' }, 404);
      if (order.paid) return json(req, { error: 'order_already_paid' }, 409);

      const requestedOptionId = normalizePaymentOptionId((body as JsonRecord).payment_option_id, 'basic');
      const birth = parseBirthInput(order.birth_input);
      const paymentOption = parseBirthInput(birth.payment_option);
      const lockedOptionId = normalizePaymentOptionId(paymentOption.id, '');
      const paymentOptionId = lockedOptionId || requestedOptionId;

      const createRes = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: internalAuthHeader,
        },
        body: JSON.stringify({
          trade_no: tradeNo,
          payment_option_id: paymentOptionId,
          client_env: (body as JsonRecord).client_env || {},
        }),
      });
      const data = await createRes.json().catch(() => ({}));
      if (!createRes.ok || data?.errcode !== 0) {
        return json(req, {
          error: 'create_payment_failed',
          status: createRes.status,
          details: data,
        }, 502);
      }

      return json(req, { ok: true, ...data });
    }

    if (action === 'query_order') {
      const tradeNo = String((body as JsonRecord).trade_no || '').trim();
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (orderError) return json(req, { error: 'order_query_failed', details: orderError.message }, 500);
      if (!order) return json(req, { error: 'order_not_found' }, 404);

      const payload = await attachSignedPdfDownloadToView(
        supabase,
        supabaseUrl,
        buildOrderViewPayload(order as JsonRecord, tradeNo),
      );
      return json(req, {
        ok: true,
        order: payload,
      });
    }

    if (action === 'resend_delivery') {
      const tradeNo = String((body as JsonRecord).trade_no || '').trim();
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);

      let reconcileData: JsonRecord = {};
      let reconcileFailed = false;
      let reconcileStatus = 0;
      try {
        const reconcileRes = await fetch(`${supabaseUrl}/functions/v1/reconcile-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: internalAuthHeader,
          },
          body: JSON.stringify({ trade_no: tradeNo }),
        });
        reconcileStatus = reconcileRes.status;
        reconcileData = await reconcileRes.json().catch(() => ({} as JsonRecord));
        if (!reconcileRes.ok) reconcileFailed = true;
      } catch (err) {
        reconcileFailed = true;
        reconcileData = { error: err instanceof Error ? err.message : String(err) };
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (orderError) return json(req, { error: 'order_query_failed', details: orderError.message }, 500);
      if (!order) return json(req, { error: 'order_not_found' }, 404);

      const view = await attachSignedPdfDownloadToView(
        supabase,
        supabaseUrl,
        buildOrderViewPayload(order as JsonRecord, tradeNo),
      );
      const birth = parseBirthInput((order as JsonRecord).birth_input);
      const service = detectService(birth);

      let analysisTriggered = Boolean(reconcileData.analysis_triggered);
      if (view.paid && !view.analysis_exists && service !== 'pdf') {
        analysisTriggered = await triggerAnalyzeForPaidOrder(supabaseUrl, internalAuthHeader, tradeNo, service, birth) || analysisTriggered;
      }

      const message = !view.paid
        ? '订单未支付，请先完成支付后再补发。'
        : service === 'pdf'
          ? 'PDF 短时下载链接已刷新，可立即发送给客户。'
          : view.analysis_exists
            ? '报告已就绪，可直接引导客户打开结果页。'
            : '已重新触发报告生成，请稍后让客户点击“继续上次订单”。';

      return json(req, {
        ok: true,
        trade_no: tradeNo,
        message,
        reconcile_failed: reconcileFailed,
        reconcile_status: reconcileStatus || null,
        analysis_triggered: analysisTriggered,
        reconcile: reconcileData,
        order: view,
      });
    }

    if (action === 'funnel') {
      const days = Math.min(Math.max(Number((body as JsonRecord).days || 7), 1), 30);
      const maxRows = Math.min(Math.max(Number((body as JsonRecord).max_rows || 1500), 100), 3000);
      const sinceMs = Date.now() - (days * 24 * 60 * 60 * 1000);
      const sinceIso = new Date(sinceMs).toISOString();

      const { data, error } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(maxRows);
      if (error) return json(req, { error: 'funnel_query_failed', details: error.message }, 500);

      const rows = Array.isArray(data) ? data : [];
      const summary = {
        total_orders: 0,
        payment_created: 0,
        paid: 0,
        verified: 0,
        delivered: 0,
      };
      const byService: Record<string, { total: number; paid: number; delivered: number }> = {
        bazi: { total: 0, paid: 0, delivered: 0 },
        hepan: { total: 0, paid: 0, delivered: 0 },
        pdf: { total: 0, paid: 0, delivered: 0 },
      };
      const byAbVariant: Record<string, { total_orders: number; paid: number; delivered: number }> = {
        A: { total_orders: 0, paid: 0, delivered: 0 },
        B: { total_orders: 0, paid: 0, delivered: 0 },
      };
      const failures: Array<Record<string, unknown>> = [];
      let syntheticOrdersSkipped = 0;

      for (const row of rows) {
        const tradeNo = asString((row as JsonRecord).trade_no);
        if (!tradeNo) continue;
        if (/^bazi-health-/i.test(tradeNo)) {
          syntheticOrdersSkipped += 1;
          continue;
        }

        const createdAt = asString((row as JsonRecord).created_at);
        const createdMs = toMillis(createdAt);
        if (!createdMs || createdMs < sinceMs) continue;

        const birth = parseBirthInput((row as JsonRecord).birth_input);
        const tracking = parseTracking(birth);
        const service = detectService(birth);
        const paid = Boolean((row as JsonRecord).paid);
        const hasAnalysis = hasText((row as JsonRecord).analysis);
        const rawAbVariant = asString(
          tracking.payment_ab_variant || asString((birth as JsonRecord).payment_ab_variant),
        ).toUpperCase();
        const abVariant = rawAbVariant === 'B' ? 'B' : 'A';

        const paymentCreated = Boolean(toMillis(tracking.payment_created_at)) || paid;
        const paymentVerified = Boolean(toMillis(tracking.payment_verified_at)) || paid;
        const delivered = service === 'pdf'
          ? Boolean(toMillis(tracking.pdf_download_clicked_at))
          : hasAnalysis || Boolean(toMillis(tracking.report_viewed_at));

        summary.total_orders += 1;
        if (paymentCreated) summary.payment_created += 1;
        if (paid) summary.paid += 1;
        if (paymentVerified) summary.verified += 1;
        if (delivered) summary.delivered += 1;

        byService[service].total += 1;
        if (paid) byService[service].paid += 1;
        if (delivered) byService[service].delivered += 1;
        byAbVariant[abVariant].total_orders += 1;
        if (paid) byAbVariant[abVariant].paid += 1;
        if (delivered) byAbVariant[abVariant].delivered += 1;

        const ageMinutes = Math.floor((Date.now() - createdMs) / 60000);
        let issue = '';
        if (paymentCreated && !paid && ageMinutes >= 10) {
          issue = 'payment_not_completed';
        } else if (paid && !paymentVerified && ageMinutes >= 2) {
          issue = 'paid_not_verified';
        } else if (paid && paymentVerified && !delivered && ageMinutes >= 5) {
          issue = service === 'pdf' ? 'paid_not_downloaded' : 'paid_not_delivered';
        }

        if (issue) {
          failures.push({
            trade_no: tradeNo,
            created_at: createdAt,
            service,
            paid,
            has_analysis: hasAnalysis,
            issue,
            age_minutes: ageMinutes,
          });
        }
      }

      failures.sort((a, b) => Number((b as JsonRecord).age_minutes || 0) - Number((a as JsonRecord).age_minutes || 0));
      const failureRows = failures.slice(0, 80);

      const ratio = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);
      const conversion = {
        order_to_payment_created: ratio(summary.payment_created, summary.total_orders),
        payment_created_to_paid: ratio(summary.paid, summary.payment_created),
        paid_to_verified: ratio(summary.verified, summary.paid),
        verified_to_delivered: ratio(summary.delivered, summary.verified),
        order_to_delivered: ratio(summary.delivered, summary.total_orders),
      };
      const byAb = Object.entries(byAbVariant).map(([variant, item]) => ({
        variant,
        ...item,
        order_to_paid: ratio(item.paid, item.total_orders),
        order_to_delivered: ratio(item.delivered, item.total_orders),
      }));

      return json(req, {
        ok: true,
        days,
        since: sinceIso,
        scanned_rows: rows.length,
        synthetic_orders_skipped: syntheticOrdersSkipped,
        summary,
        conversion,
        by_service: byService,
        by_ab_variant: byAb,
        failures: failureRows,
      });
    }

    if (action === 'settlement_overview') {
      const days = Math.min(Math.max(Number((body as JsonRecord).days || 30), 1), 120);
      const maxRows = Math.min(Math.max(Number((body as JsonRecord).max_rows || 3000), 100), 5000);
      const overview = await buildSettlementOverviewData(supabase, {
        days,
        maxRows,
      });
      if ((overview as JsonRecord).error) {
        return json(req, overview, 500);
      }
      return json(req, overview);
    }

    if (action === 'koc_dashboard') {
      const days = Math.min(Math.max(Number((body as JsonRecord).days || 30), 1), 120);
      const maxRows = Math.min(Math.max(Number((body as JsonRecord).max_rows || 3000), 100), 5000);
      const orderLimit = Math.min(Math.max(Number((body as JsonRecord).order_limit || 400), 50), 1000);
      const kocIdFilter = asString((body as JsonRecord).koc_id).toLowerCase();
      const channelFilter = asString((body as JsonRecord).channel).toLowerCase();
      const settlementFilter = asString((body as JsonRecord).settlement_status).toLowerCase();
      const roleFilterRaw = asString((body as JsonRecord).beneficiary_role || (body as JsonRecord).role).toLowerCase();
      const roleFilter = ALLOWED_KOC_SETTLEMENT_ROLES.has(roleFilterRaw) ? normalizeSettlementRole(roleFilterRaw) : '';
      const dashboardData = await buildKocDashboardData(supabase, {
        days,
        maxRows,
        orderLimit,
        kocIdFilter,
        channelFilter,
        settlementFilter,
        roleFilter,
      });
      if ((dashboardData as JsonRecord).error) {
        return json(req, dashboardData, 500);
      }
      return json(req, dashboardData);
    }

    if (action === 'koc_settlement_update') {
      const tradeNo = asString((body as JsonRecord).trade_no);
      const status = asString((body as JsonRecord).status).toLowerCase();
      const role = normalizeSettlementRole((body as JsonRecord).role, 'direct');
      const note = asString((body as JsonRecord).note).slice(0, 240);
      const manualCommission = toNumber((body as JsonRecord).commission_amount);

      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);
      if (!ALLOWED_KOC_SETTLEMENT_STATUS.has(status)) {
        return json(req, { error: 'invalid_settlement_status' }, 400);
      }

      const { data: order, error: queryError } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (queryError) return json(req, { error: 'order_query_failed', details: queryError.message }, 500);
      if (!order) return json(req, { error: 'order_not_found' }, 404);
      const birth = parseBirthInput((order as JsonRecord).birth_input);
      const tracking = parseTracking(birth);
      const attribution = extractKocAttribution(birth, tracking);
      const directKocId = asString(attribution.koc_id);
      const service = detectService(birth);
      const paymentOption = parsePaymentOption(birth);
      const paymentOptionId = normalizePaymentOptionId(paymentOption.id, service === 'hepan' ? 'vip' : 'basic');
      const paymentOptionTitle = asString(paymentOption.title);
      const { profileMap: commissionProfileMap } = await buildKocCommissionProfileMap(supabase, [{
        trade_no: tradeNo,
        koc_id: directKocId,
        service,
        payment_option_id: paymentOptionId,
        payment_option_title: paymentOptionTitle,
      }]);
      const commissionProfile = commissionProfileMap.get(tradeNo);
      const applied = await applyKocSettlementUpdate(
        supabase,
        order as JsonRecord,
        tradeNo,
        status,
        note,
        manualCommission,
        commissionProfile,
        role,
      );
      if (!applied.ok) {
        if (applied.reason === 'order_not_paid') return json(req, { error: 'order_not_paid' }, 409);
        if (applied.reason === 'beneficiary_koc_missing') return json(req, { error: 'beneficiary_koc_missing' }, 409);
        return json(req, { error: applied.reason, details: applied.details || '' }, 500);
      }

      return json(req, {
        ok: true,
        trade_no: tradeNo,
        role,
        settlement: applied.settlement,
      });
    }

    if (action === 'koc_settlement_batch_update') {
      const status = asString((body as JsonRecord).status).toLowerCase();
      const role = normalizeSettlementRole((body as JsonRecord).role, 'direct');
      const note = asString((body as JsonRecord).note).slice(0, 240);
      const manualCommission = toNumber((body as JsonRecord).commission_amount);
      const rawTradeNos = Array.isArray((body as JsonRecord).trade_nos)
        ? ((body as JsonRecord).trade_nos as unknown[])
        : [];

      if (!ALLOWED_KOC_SETTLEMENT_STATUS.has(status)) {
        return json(req, { error: 'invalid_settlement_status' }, 400);
      }

      const tradeNos = Array.from(new Set(
        rawTradeNos
          .map((item) => asString(item))
          .map((item) => item.trim())
          .filter((item) => validateTradeNo(item)),
      )).slice(0, 300);
      if (!tradeNos.length) {
        return json(req, { error: 'invalid_trade_nos' }, 400);
      }

      const { data: orders, error: queryError } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .in('trade_no', tradeNos);
      if (queryError) return json(req, { error: 'order_query_failed', details: queryError.message }, 500);

      const orderList = Array.isArray(orders) ? orders as JsonRecord[] : [];
      const orderMap = new Map<string, JsonRecord>();
      const commissionTargets: Array<{
        trade_no: string;
        koc_id: string;
        service: string;
        payment_option_id: string;
        payment_option_title: string;
      }> = [];
      for (const row of orderList) {
        const tradeNo = asString((row as JsonRecord).trade_no);
        if (tradeNo) {
          orderMap.set(tradeNo, row as JsonRecord);
          const birth = parseBirthInput((row as JsonRecord).birth_input);
          const tracking = parseTracking(birth);
          const attribution = extractKocAttribution(birth, tracking);
          const directKocId = asString(attribution.koc_id);
          const service = detectService(birth);
          const paymentOption = parsePaymentOption(birth);
          const paymentOptionId = normalizePaymentOptionId(paymentOption.id, service === 'hepan' ? 'vip' : 'basic');
          commissionTargets.push({
            trade_no: tradeNo,
            koc_id: directKocId,
            service,
            payment_option_id: paymentOptionId,
            payment_option_title: asString(paymentOption.title),
          });
        }
      }
      const { profileMap: commissionProfileMap } = await buildKocCommissionProfileMap(supabase, commissionTargets);

      const notFound: string[] = [];
      const skippedUnpaid: string[] = [];
      const skippedNoBeneficiary: string[] = [];
      const failed: Array<{ trade_no: string; reason: string }> = [];
      const updated: string[] = [];

      for (const tradeNo of tradeNos) {
        const order = orderMap.get(tradeNo);
        if (!order) {
          notFound.push(tradeNo);
          continue;
        }
        const commissionProfile = commissionProfileMap.get(tradeNo);
        const applied = await applyKocSettlementUpdate(
          supabase,
          order,
          tradeNo,
          status,
          note,
          manualCommission,
          commissionProfile,
          role,
        );
        if (applied.ok) {
          updated.push(tradeNo);
          continue;
        }
        if (applied.reason === 'order_not_paid') {
          skippedUnpaid.push(tradeNo);
          continue;
        }
        if (applied.reason === 'beneficiary_koc_missing') {
          skippedNoBeneficiary.push(tradeNo);
          continue;
        }
        failed.push({
          trade_no: tradeNo,
          reason: applied.reason || 'order_update_failed',
        });
      }

      return json(req, {
        ok: true,
        status,
        role,
        requested: rawTradeNos.length,
        accepted: tradeNos.length,
        updated_count: updated.length,
        skipped_unpaid_count: skippedUnpaid.length,
        skipped_no_beneficiary_count: skippedNoBeneficiary.length,
        not_found_count: notFound.length,
        failed_count: failed.length,
        updated_trade_nos: updated.slice(0, 200),
        skipped_unpaid: skippedUnpaid.slice(0, 200),
        skipped_no_beneficiary: skippedNoBeneficiary.slice(0, 200),
        not_found: notFound.slice(0, 200),
        failed: failed.slice(0, 80),
      });
    }

    if (action === 'security_overview') {
      const hours = Math.min(Math.max(Number((body as JsonRecord).hours || 24), 1), 168);
      const sinceMs = Date.now() - (hours * 60 * 60 * 1000);
      const sinceIso = new Date(sinceMs).toISOString();

      const { data: abuseRows, error: abuseError } = await supabase
        .from('api_abuse_logs')
        .select('scope,event,created_at,meta')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(400);
      if (abuseError) {
        return json(req, { error: 'security_abuse_query_failed', details: abuseError.message }, 500);
      }

      const { data: rateRows, error: rateError } = await supabase
        .from('api_rate_limits')
        .select('scope,request_count,updated_at,window_start')
        .gte('updated_at', sinceIso)
        .order('updated_at', { ascending: false })
        .limit(1500);
      if (rateError) {
        return json(req, { error: 'security_rate_query_failed', details: rateError.message }, 500);
      }

      const abuseList = Array.isArray(abuseRows) ? abuseRows as JsonRecord[] : [];
      const rateList = Array.isArray(rateRows) ? rateRows as JsonRecord[] : [];

      const blockedByScope: Record<string, number> = {};
      for (const row of abuseList) {
        const scope = asString(row.scope) || 'unknown';
        blockedByScope[scope] = Number(blockedByScope[scope] || 0) + 1;
      }
      const blockedTopScopes = Object.entries(blockedByScope)
        .map(([scope, count]) => ({ scope, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const peakByScope: Record<string, number> = {};
      const sumByScope: Record<string, number> = {};
      const windowsByScope: Record<string, number> = {};
      for (const row of rateList) {
        const scope = asString(row.scope) || 'unknown';
        const count = Number(row.request_count || 0);
        peakByScope[scope] = Math.max(Number(peakByScope[scope] || 0), count);
        sumByScope[scope] = Number(sumByScope[scope] || 0) + count;
        windowsByScope[scope] = Number(windowsByScope[scope] || 0) + 1;
      }
      const trafficScopes = Object.keys(sumByScope)
        .map((scope) => ({
          scope,
          total_requests_in_windows: sumByScope[scope],
          sampled_windows: windowsByScope[scope],
          peak_window_requests: peakByScope[scope],
        }))
        .sort((a, b) => b.total_requests_in_windows - a.total_requests_in_windows)
        .slice(0, 12);

      const latestBlocked = abuseList.slice(0, 50).map((row) => ({
        scope: asString(row.scope) || 'unknown',
        event: asString(row.event) || 'unknown',
        created_at: asString(row.created_at),
        ip_masked: asString((row.meta as JsonRecord)?.ip_masked || ''),
        current_count: Number((row.meta as JsonRecord)?.current_count || 0),
      }));

      return json(req, {
        ok: true,
        hours,
        since: sinceIso,
        summary: {
          blocked_events: abuseList.length,
          sampled_rate_windows: rateList.length,
        },
        blocked_top_scopes: blockedTopScopes,
        traffic_top_scopes: trafficScopes,
        latest_blocked: latestBlocked,
      });
    }

    if (action === 'site_visit_dashboard') {
      const hours = Math.min(Math.max(Number((body as JsonRecord).hours || 24), 1), 720);
      const limit = Math.min(Math.max(Number((body as JsonRecord).limit || 4000), 200), 8000);
      const sinceMs = Date.now() - (hours * 60 * 60 * 1000);
      const sinceIso = new Date(sinceMs).toISOString();

      const { data, error } = await supabase
        .from('api_abuse_logs')
        .select('created_at,scope,event,identifier,meta')
        .eq('scope', 'site_visit')
        .eq('event', 'page_view')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) {
        return json(req, { error: 'site_visit_query_failed', details: error.message }, 500);
      }

      const rows = Array.isArray(data) ? data as JsonRecord[] : [];
      const ipSet = new Set<string>();
      const visitorSet = new Set<string>();
      const deviceMap: Record<string, number> = {};
      const pageMap: Record<string, { count: number; uniqueIp: Set<string>; title: string }> = {};
      const ipMap: Record<string, number> = {};
      const langMap: Record<string, number> = {};
      const utmSourceMap: Record<string, number> = {};
      const utmMediumMap: Record<string, number> = {};
      const utmCampaignMap: Record<string, number> = {};
      const utmSourceMediumMap: Record<string, number> = {};
      const testerIdSet = new Set<string>();
      let testerVisits = 0;
      let ownerVisits = 0;
      let botVisits = 0;
      let normalVisits = 0;
      const recent: Array<Record<string, unknown>> = [];

      for (const row of rows) {
        const meta = asRecord(row.meta);
        const ipMasked = asString(meta.ip_masked || 'unknown') || 'unknown';
        const device = asString(meta.device || 'unknown').toLowerCase() || 'unknown';
        const pagePath = asString(meta.page_path || '/') || '/';
        const pageTitle = asString(meta.page_title || '').slice(0, 120);
        const visitorId = asString(meta.visitor_id || row.identifier || '').slice(0, 80);
        const lang = asString(meta.lang || 'unknown').slice(0, 40) || 'unknown';
        const country = asString(meta.country || 'unknown').slice(0, 80) || 'unknown';
        const province = asString(meta.province || 'unknown').slice(0, 80) || 'unknown';
        const city = asString(meta.city || 'unknown').slice(0, 80) || 'unknown';
        const referrer = asString(meta.referrer || '').slice(0, 260);
        const utmSource = asString(meta.utm_source || '').slice(0, 80);
        const utmMedium = asString(meta.utm_medium || '').slice(0, 80);
        const utmCampaign = asString(meta.utm_campaign || '').slice(0, 120);
        const sourceMedium = `${utmSource || '(none)'} / ${utmMedium || '(none)'}`;
        const ua = asString(meta.ua || '').slice(0, 200);
        const testerId = sanitizeTesterId(meta.tester_id || '');
        const isTester = testerId ? true : toBoolean(meta.is_tester);
        const isBot = toBoolean(meta.is_bot) || device === 'bot' || isLikelyAutomatedUaShared(ua);
        const isOwnerDevice = toBoolean(meta.is_owner_device) || detectOwnerDevice(testerId, ua);
        const visitType = asString(meta.visit_type) || (isOwnerDevice ? 'owner' : (isTester ? 'tester' : (isBot ? 'bot' : 'normal')));
        const createdAt = asString(row.created_at);

        if (ipMasked && ipMasked !== 'unknown') ipSet.add(ipMasked);
        if (visitorId) visitorSet.add(visitorId);
        if (isTester) {
          testerVisits += 1;
          if (testerId) testerIdSet.add(testerId);
        } else if (isBot) {
          botVisits += 1;
        } else {
          normalVisits += 1;
        }
        if (isOwnerDevice) ownerVisits += 1;
        deviceMap[device] = Number(deviceMap[device] || 0) + 1;
        ipMap[ipMasked] = Number(ipMap[ipMasked] || 0) + 1;
        langMap[lang] = Number(langMap[lang] || 0) + 1;
        if (utmSource) utmSourceMap[utmSource] = Number(utmSourceMap[utmSource] || 0) + 1;
        if (utmMedium) utmMediumMap[utmMedium] = Number(utmMediumMap[utmMedium] || 0) + 1;
        if (utmCampaign) utmCampaignMap[utmCampaign] = Number(utmCampaignMap[utmCampaign] || 0) + 1;
        utmSourceMediumMap[sourceMedium] = Number(utmSourceMediumMap[sourceMedium] || 0) + 1;
        if (!pageMap[pagePath]) {
          pageMap[pagePath] = {
            count: 0,
            uniqueIp: new Set<string>(),
            title: pageTitle,
          };
        }
        pageMap[pagePath].count += 1;
        if (ipMasked && ipMasked !== 'unknown') pageMap[pagePath].uniqueIp.add(ipMasked);
        if (!pageMap[pagePath].title && pageTitle) pageMap[pagePath].title = pageTitle;

        if (recent.length < 80) {
          recent.push({
            created_at: createdAt,
            page_path: pagePath,
            page_title: pageTitle,
            ip_masked: ipMasked,
            device,
            visitor_id: visitorId,
            lang,
            country,
            province,
            city,
            referrer,
            utm_source: utmSource,
            utm_medium: utmMedium,
            utm_campaign: utmCampaign,
            ua,
            tester_id: testerId,
            is_tester: isTester,
            is_bot: isBot,
            is_owner_device: isOwnerDevice,
            visit_type: visitType,
          });
        }
      }

      const devices = Object.entries(deviceMap)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count);
      const topPages = Object.entries(pageMap)
        .map(([page_path, info]) => ({
          page_path,
          page_title: info.title || '',
          count: info.count,
          unique_ip: info.uniqueIp.size,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);
      const topIps = Object.entries(ipMap)
        .map(([ip_masked, count]) => ({ ip_masked, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);
      const topLangs = Object.entries(langMap)
        .map(([lang, count]) => ({ lang, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      const topUtmSources = Object.entries(utmSourceMap)
        .map(([utm_source, count]) => ({ utm_source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      const topUtmMediums = Object.entries(utmMediumMap)
        .map(([utm_medium, count]) => ({ utm_medium, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      const topUtmCampaigns = Object.entries(utmCampaignMap)
        .map(([utm_campaign, count]) => ({ utm_campaign, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      const topSourceMedium = Object.entries(utmSourceMediumMap)
        .map(([source_medium, count]) => ({ source_medium, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);

      return json(req, {
        ok: true,
        hours,
        since: sinceIso,
        scanned_rows: rows.length,
        summary: {
          total_visits: rows.length,
          unique_ip: ipSet.size,
          unique_visitor: visitorSet.size,
          tester_visits: testerVisits,
          owner_visits: ownerVisits,
          tester_ids: testerIdSet.size,
          bot_visits: botVisits,
          normal_visits: normalVisits,
          device_counts: deviceMap,
        },
        devices,
        top_pages: topPages,
        top_ips: topIps,
        top_langs: topLangs,
        top_utm_sources: topUtmSources,
        top_utm_mediums: topUtmMediums,
        top_utm_campaigns: topUtmCampaigns,
        top_source_medium: topSourceMedium,
        recent,
      });
    }

    if (action === 'cleanup_rate_limits') {
      const keepHours = Math.min(Math.max(Number((body as JsonRecord).keep_hours || 24), 1), 720);
      const { data, error } = await supabase.rpc('cleanup_api_rate_limits', {
        p_keep_hours: keepHours,
      });
      if (error) return json(req, { error: 'cleanup_rate_limits_failed', details: error.message }, 500);
      return json(req, {
        ok: true,
        keep_hours: keepHours,
        deleted_rows: Number(data || 0),
      });
    }

    if (action === 'clear_orders_data') {
      const confirmText = asString((body as JsonRecord).confirm_text);
      if (confirmText !== 'CLEAR_ORDERS_DATA') {
        return json(req, { error: 'confirm_text_mismatch' }, 400);
      }

      const { count: beforeCount, error: beforeError } = await supabase
        .from('orders')
        .select('trade_no', { count: 'exact', head: true });
      if (beforeError) return json(req, { error: 'orders_count_before_failed', details: beforeError.message }, 500);

      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .not('trade_no', 'is', null);
      if (deleteError) return json(req, { error: 'orders_delete_failed', details: deleteError.message }, 500);

      const { count: afterCount, error: afterError } = await supabase
        .from('orders')
        .select('trade_no', { count: 'exact', head: true });
      if (afterError) return json(req, { error: 'orders_count_after_failed', details: afterError.message }, 500);

      return json(req, {
        ok: true,
        before_count: Number(beforeCount || 0),
        after_count: Number(afterCount || 0),
        deleted_count: Math.max(0, Number(beforeCount || 0) - Number(afterCount || 0)),
      });
    }

    return json(req, { error: 'unsupported_action' }, 400);
  } catch (err) {
    return json(req, { error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
