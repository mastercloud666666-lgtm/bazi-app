// js/app.js

const SUPABASE_URL  = 'https://rcyssrsnalefzhzsvswm.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
const DISCLAIMER = '\n\n以上内容为传统文化推演，仅供参考，请理性看待，切勿迷信。';
const PENDING_TRADE_KEY = 'bazi_pending_trade_no';
const PENDING_PAYMENT_OPTION_KEY = 'bazi_pending_payment_option_id';
const PENDING_BIRTH_INPUT_KEY = 'bazi_pending_birth_input';
const PDF_PENDING_TRADE_KEY = 'bazi_pdf_pending_trade_no';
const INVITE_CODE_KEY = 'bazi_invite_code_v1';
const INVITE_CODE_COOKIE = 'bazi_invite_code_v1';
const KOC_ATTRIBUTION_KEY = 'bazi_koc_attr_v1';
const KOC_ATTRIBUTION_COOKIE = 'bazi_koc_attr_v1';
const KOC_ATTRIBUTION_TTL_SECONDS = 60 * 60 * 24 * 30;
const KOC_PLACEHOLDER_IDS = new Set(['koc_id', 'content_id', 'koc_code', 'kocid', 'contentid', 'code', 'id', 'name', 'ref', 'koc', 'content']);
const APP_BUILD = '20260329-langsync-v1';
const PAYMENT_AB_KEY = 'bazi_payment_ab_v1';
const PAYMENT_AB_TRACK_KEY = 'bazi_payment_ab_track_v1';
const PAYMENT_UNPAID_REMINDER_MS = 5 * 60 * 1000;
const PAYMENT_PANEL_STATE_PREFIX = 'bazi_payment_panel_state_v1_';
const REPORT_SHARE_CARD_ID = 'paid-report-share-card';
const SUPPORT_ORDER_FOCUS_KEY = 'bazi_support_focus_trade_no';
const PAYMENT_OPTIONS = [
  {
    id: 'basic',
    title: '初级版：8大核心维度',
    subtitle: '聚焦命主底盘、天赋与现实决策（约3000字）｜正式价 128 元｜当前活动价 19 元',
    fee: '19',
  },
  {
    id: 'pro',
    title: '进阶版：16大实战维度',
    subtitle: '覆盖事业、财运、婚恋、人际与运势节奏（约5000字）｜正式价 258 元｜当前活动价 49 元',
    fee: '49',
  },
  {
    id: 'vip',
    title: '尊享完整版：24维全景深度报告',
    subtitle: '24个维度系统拆解命局与未来节奏（约7000-9000字）｜正式价 398 元｜当前活动价 99 元',
    fee: '99',
  },
];
const DEFAULT_PAYMENT_OPTION = PAYMENT_OPTIONS[0];
const PDF_PRODUCT = {
  id: 'pdf',
  title: '《八字命理合集》PDF',
  subtitle: '439页系统整理八字核心知识与实用思路，付款后可直接下载（正式价 39.9 元｜冲量底价 19.9 元）',
  fee: '19.9',
  downloadPath: '/downloads/yunzi-bazi-guide.pdf',
  storageBucket: 'paid-docs',
  storagePath: 'pdfs/yunzi-bazi-guide.pdf',
  signedTtlSeconds: 600,
  fileName: '云子文化-八字命理合集.pdf',
};
const CONSULT_PRODUCT = {
  id: 'consult',
  title: '专属研究员1对1咨询',
  promoFee: '499',
  formalFee: '699',
};
const CONSULT_PAYMENT_OPTION = {
  id: CONSULT_PRODUCT.id,
  title: CONSULT_PRODUCT.title,
  subtitle: '1对1专属研究员深度咨询（1小时语音或电话交付），支付成功后可自动校验订单并完成预约。',
  fee: CONSULT_PRODUCT.promoFee,
};
const ONE_TIME_PAID_NOTICE = '\u672c\u6b21\u62a5\u544a\u662f\u4e00\u6b21\u6027\u670d\u52a1\uff0c\u8bf7\u81ea\u884c\u622a\u56fe\u4fdd\u5b58\uff0c\u9875\u9762\u5173\u95ed\u540e\u4e0d\u53ef\u518d\u6b21\u67e5\u770b\u3002';
// 已有「保存到我的记录」，报告可重复查看，去掉「一次性、关闭不可再看」提示
const PAID_ONE_TIME_NOTICE_HTML = '';
window.__BAZI_APP_BUILD = APP_BUILD;
window.__BAZI_PAYMENT_OPTION_IDS = [...PAYMENT_OPTIONS.map((x) => x.id), PDF_PRODUCT.id, CONSULT_PRODUCT.id];
console.log('[bazi-app build]', APP_BUILD);

const CLIENT_ID_KEY = 'bazi_client_id';
const PENDING_TRADE_COOKIE = 'bazi_pending_trade_no';
const PENDING_PAYMENT_OPTION_COOKIE = 'bazi_pending_payment_option_id';
const PDF_PENDING_TRADE_COOKIE = 'bazi_pdf_pending_trade_no';
const EVENT_TRACK_ONCE_PREFIX = 'bazi_event_once_';
const ORDER_RECOVERY_PAGE = 'order-recovery.html';
const SITE_LANG_KEY = 'site_lang_pref_v2';
const SITE_VISITOR_ID_KEY = 'site_visitor_id_v1';
const SITE_VISIT_SESSION_FLAG_PREFIX = 'site_visit_sent_';
const SITE_TESTER_ID_KEY = 'site_tester_id_v1';
const UI_TEXT = {
  'zh-Hans': {
    orderRecoveryEntryTitle: '支付后页面关闭？可从订单找回中心继续',
    orderRecoveryEntryHint: '输入订单号即可校验支付状态，并一键回到报告或下载页面。',
    orderRecoveryEntryBtn: '打开订单找回中心',
    inviteCodeLabel: '邀请码 / 老客优惠码（可选）',
    inviteCodePlaceholder: '输入邀请码可自动抵扣（示例：OLDVIP）',
    inviteCodeHint: '若你是老客或来自合作渠道，可输入邀请码后再选择档位支付。',
    pendingRecoverBtn: '订单找回中心',
    pendingResumePaidTitle: '检测到已支付订单，可继续查看报告',
    pendingResumeUnpaidTitle: '检测到未支付订单，请先继续支付',
    pendingResumePaidBtn: '继续查看报告',
    pendingResumeUnpaidBtn: '继续支付',
    pendingResumeUnpaidHint: '未支付订单不会立即生成报告，请先完成支付再查看结果。',
    mobileRecoveryBtn: '订单找回中心',
    progressUnpaidTitle: '该订单尚未支付',
    progressUnpaidDesc: '为避免长时间卡在生成界面，请先继续支付，支付成功后再生成报告。',
    progressUnpaidPay: '去订单找回中心继续支付',
    progressUnpaidReload: '我已支付，刷新校验',
    progressUnpaidNoHang: '未支付订单已停止自动重试，避免页面长时间等待。',
    progressStageWaiting: '等待支付确认',
    progressStagePaidVerified: '支付已确认，准备生成',
    progressStageGenerating: '深度报告生成中',
    progressStageRetry: '网络波动，自动重试中',
    progressStageReady: '报告已就绪，即将展示',
    progressStepOrder: '订单创建',
    progressStepVerify: '支付核验',
    progressStepGenerate: '报告生成',
    progressStepShow: '结果展示',
    progressElapsed: '已等待 {sec} 秒',
    progressDefaultNote: '系统正在自动校验支付与报告状态，请勿关闭页面。',
    progressDirectDefault: '已确认支付，正在优先直连生成完整报告（通常 20-60 秒）…',
    progressInitialWait: '系统正在校验支付状态，确认后会自动继续生成完整报告。',
    progressInitialPaid: '支付已确认，正在为你建立报告生成通道。',
    progressSwitchGenerate: '支付已确认，正在切换至报告生成流程。',
    progressReadyOpen: '报告已生成完成，正在打开结果。',
    progressPaidStart: '支付已确认，正在启动深度报告生成。',
    progressPaidGenerating: '已确认支付，正在直连生成完整报告，请稍候…',
    progressPaidPreparing: '支付已确认，系统正在准备生成完整报告。',
    progressKeepOpen: '报告正在逐段生成，请保持页面打开。',
    progressWaitGateway: '正在等待支付网关确认状态。',
    progressRetryPaid: '支付状态已补确认，正在启动报告生成。',
    progressRetryNetwork: '网络波动，系统已自动重试，请稍候。',
    progressTimeoutTitle: '生成时间较长，请选择下一步',
    progressTimeoutDesc: '你可继续等待，或去订单找回中心手动校验支付并恢复报告。',
    progressTimeoutRefresh: '刷新重试',
    progressTimeoutWait: '继续等待',
    progressTimeoutRecovery: '打开订单找回中心',
  },
  'zh-Hant': {
    orderRecoveryEntryTitle: '支付後頁面關閉？可從訂單找回中心繼續',
    orderRecoveryEntryHint: '輸入訂單號即可校驗支付狀態，並一鍵回到報告或下載頁面。',
    orderRecoveryEntryBtn: '打開訂單找回中心',
    inviteCodeLabel: '邀請碼 / 老客優惠碼（可選）',
    inviteCodePlaceholder: '輸入邀請碼可自動折抵（示例：OLDVIP）',
    inviteCodeHint: '若你是老客或來自合作渠道，建議先輸入邀請碼再選擇檔位支付。',
    pendingRecoverBtn: '訂單找回中心',
    pendingResumePaidTitle: '檢測到已支付訂單，可繼續查看報告',
    pendingResumeUnpaidTitle: '檢測到未支付訂單，請先繼續支付',
    pendingResumePaidBtn: '繼續查看報告',
    pendingResumeUnpaidBtn: '繼續支付',
    pendingResumeUnpaidHint: '未支付訂單不會立即生成報告，請先完成支付再查看結果。',
    mobileRecoveryBtn: '訂單找回中心',
    progressUnpaidTitle: '該訂單尚未支付',
    progressUnpaidDesc: '為避免長時間卡在生成頁面，請先繼續支付，支付成功後再生成報告。',
    progressUnpaidPay: '去訂單找回中心繼續支付',
    progressUnpaidReload: '我已支付，刷新校驗',
    progressUnpaidNoHang: '未支付訂單已停止自動重試，避免頁面長時間等待。',
    progressStageWaiting: '等待支付確認',
    progressStagePaidVerified: '支付已確認，準備生成',
    progressStageGenerating: '深度報告生成中',
    progressStageRetry: '網絡波動，自動重試中',
    progressStageReady: '報告已就緒，即將展示',
    progressStepOrder: '訂單創建',
    progressStepVerify: '支付校驗',
    progressStepGenerate: '報告生成',
    progressStepShow: '結果展示',
    progressElapsed: '已等待 {sec} 秒',
    progressDefaultNote: '系統正在自動校驗支付與報告狀態，請勿關閉頁面。',
    progressDirectDefault: '已確認支付，正在優先直連生成完整報告（通常 20-60 秒）…',
    progressInitialWait: '系統正在校驗支付狀態，確認後會自動繼續生成完整報告。',
    progressInitialPaid: '支付已確認，正在為你建立報告生成通道。',
    progressSwitchGenerate: '支付已確認，正在切換至報告生成流程。',
    progressReadyOpen: '報告已生成完成，正在打開結果。',
    progressPaidStart: '支付已確認，正在啟動深度報告生成。',
    progressPaidGenerating: '已確認支付，正在直連生成完整報告，請稍候…',
    progressPaidPreparing: '支付已確認，系統正在準備生成完整報告。',
    progressKeepOpen: '報告正在逐段生成，請保持頁面打開。',
    progressWaitGateway: '正在等待支付網關確認狀態。',
    progressRetryPaid: '支付狀態已補確認，正在啟動報告生成。',
    progressRetryNetwork: '網絡波動，系統已自動重試，請稍候。',
    progressTimeoutTitle: '生成時間較長，請選擇下一步',
    progressTimeoutDesc: '你可繼續等待，或到訂單找回中心手動校驗支付並恢復報告。',
    progressTimeoutRefresh: '刷新重試',
    progressTimeoutWait: '繼續等待',
    progressTimeoutRecovery: '打開訂單找回中心',
  },
  en: {
    orderRecoveryEntryTitle: 'Page closed after payment? Continue from Order Recovery Center',
    orderRecoveryEntryHint: 'Enter your order number to verify payment and jump back to report/download.',
    orderRecoveryEntryBtn: 'Open Order Recovery Center',
    inviteCodeLabel: 'Invite Code / Returning User Code (Optional)',
    inviteCodePlaceholder: 'Enter code for possible discount (e.g., OLDVIP)',
    inviteCodeHint: 'If you are a returning user or from a partner channel, enter the code before choosing a tier.',
    pendingRecoverBtn: 'Order Recovery Center',
    pendingResumePaidTitle: 'Paid order detected. Continue to your report.',
    pendingResumeUnpaidTitle: 'Unpaid order detected. Please continue payment first.',
    pendingResumePaidBtn: 'Continue To Report',
    pendingResumeUnpaidBtn: 'Continue Payment',
    pendingResumeUnpaidHint: 'Unpaid orders cannot generate reports yet. Please finish payment first.',
    mobileRecoveryBtn: 'Order Recovery Center',
    progressUnpaidTitle: 'This Order Is Not Paid Yet',
    progressUnpaidDesc: 'To avoid long waiting on generation, please continue payment first, then return to generate your report.',
    progressUnpaidPay: 'Continue Payment In Recovery Center',
    progressUnpaidReload: 'I Have Paid, Refresh Status',
    progressUnpaidNoHang: 'Auto retry has been stopped for unpaid orders to avoid page freezing.',
    progressStageWaiting: 'Waiting For Payment Confirmation',
    progressStagePaidVerified: 'Payment Confirmed, Preparing Report',
    progressStageGenerating: 'Generating Full Report',
    progressStageRetry: 'Network Retry In Progress',
    progressStageReady: 'Report Ready',
    progressStepOrder: 'Order Created',
    progressStepVerify: 'Payment Verified',
    progressStepGenerate: 'Report Generation',
    progressStepShow: 'Show Result',
    progressElapsed: 'Elapsed {sec}s',
    progressDefaultNote: 'Checking payment and report status automatically. Please keep this page open.',
    progressDirectDefault: 'Payment confirmed, starting direct report generation (usually 20-60s)...',
    progressInitialWait: 'We are verifying your payment status. Once confirmed, full report generation will start automatically.',
    progressInitialPaid: 'Payment confirmed. Preparing generation channel.',
    progressSwitchGenerate: 'Payment confirmed, switching to report generation.',
    progressReadyOpen: 'Report completed. Opening result now...',
    progressPaidStart: 'Payment confirmed. Starting deep report generation.',
    progressPaidGenerating: 'Payment confirmed, generating full report now...',
    progressPaidPreparing: 'Payment confirmed. Report generation is preparing.',
    progressKeepOpen: 'Report is being generated section by section. Please keep this page open.',
    progressWaitGateway: 'Waiting for payment gateway confirmation.',
    progressRetryPaid: 'Payment confirmed via retry. Starting report generation.',
    progressRetryNetwork: 'Network is unstable. Auto retry in progress.',
    progressTimeoutTitle: 'Generation taking longer than expected',
    progressTimeoutDesc: 'You can keep waiting, or use Order Recovery Center to verify payment and restore manually.',
    progressTimeoutRefresh: 'Refresh',
    progressTimeoutWait: 'Keep Waiting',
    progressTimeoutRecovery: 'Order Recovery Center',
  },
};
const CUSTOMER_SERVICE_IMAGE = 'images/kefu-wechat.png?v=20260324b';
const CUSTOMER_SERVICE_LINK = 'https://work.weixin.qq.com/kfid/kfc17c4322c21cc15c1';
const CUSTOMER_SERVICE_TITLE = '微信客服';
const CUSTOMER_SERVICE_SUBTITLE = '长按识别二维码添加客服';
const PAYMENT_NON_REFUND_NOTICE = '免责条款：命理分析为虚拟服务，支付完成后不支持退款，请确认后再付款。';
const PDF_NON_REFUND_NOTICE = '免责条款：PDF为虚拟知识文档，支付完成后不支持退款，请确认后再付款。';
const CONSULT_NON_REFUND_NOTICE = '免责条款：1对1咨询为虚拟服务，支付完成后不支持退款，请确认后再付款。';
const CONSULT_DELIVERY_NOTICE = '交付方式：专属研究员 1 小时语音或电话咨询交付。';
const WECHAT_PAYMENT_CLOSE_NOTICE = '微信浏览器支付完成后，当前页面可能会自动关闭。请重新打开首页点击“继续上次订单”，或选择微信外浏览器完成支付。';

function getUiLang() {
  let saved = '';
  try {
    saved = localStorage.getItem(SITE_LANG_KEY) || '';
  } catch {}
  if (saved === 'en' || saved === 'zh-Hans' || saved === 'zh-Hant') return saved;

  const htmlLang = String(document?.documentElement?.getAttribute('lang') || '').toLowerCase();
  if (htmlLang.includes('zh-hant') || htmlLang.includes('zh-tw') || htmlLang.includes('zh-hk')) return 'zh-Hant';
  if (htmlLang.startsWith('en')) return 'en';

  return 'zh-Hans';
}

function tUi(key, vars = {}) {
  const lang = getUiLang();
  const raw = UI_TEXT?.[lang]?.[key] ?? UI_TEXT?.['zh-Hans']?.[key] ?? key;
  return String(raw).replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ''));
}

function safeGetLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function safeRemoveLocalStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function getPaymentPanelStateKey(tradeNo) {
  const id = String(tradeNo || '').trim();
  if (!id) return '';
  return `${PAYMENT_PANEL_STATE_PREFIX}${id}`;
}

function readPaymentPanelState(tradeNo) {
  const key = getPaymentPanelStateKey(tradeNo);
  if (!key) return {};
  const raw = safeGetLocalStorage(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function updatePaymentPanelState(tradeNo, patch = {}) {
  const key = getPaymentPanelStateKey(tradeNo);
  if (!key) return {};
  const next = {
    ...readPaymentPanelState(tradeNo),
    ...(patch && typeof patch === 'object' ? patch : {}),
    updated_at: new Date().toISOString(),
  };
  safeSetLocalStorage(key, JSON.stringify(next));
  return next;
}

function clearPaymentPanelState(tradeNo) {
  const key = getPaymentPanelStateKey(tradeNo);
  if (!key) return;
  safeRemoveLocalStorage(key);
}

function getSiteVisitorId() {
  const existing = safeGetLocalStorage(SITE_VISITOR_ID_KEY);
  if (existing) return existing;
  const next = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  safeSetLocalStorage(SITE_VISITOR_ID_KEY, next);
  return next;
}

function sanitizeTesterId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

function resolveTesterIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const fromTester = sanitizeTesterId(params.get('tester') || '');
    const fromTesterId = sanitizeTesterId(params.get('tester_id') || '');
    const fromDebug = sanitizeTesterId(params.get('debug_tester') || '');
    return fromTester || fromTesterId || fromDebug || '';
  } catch {
    return '';
  }
}

function getSiteTesterId() {
  const fromUrl = resolveTesterIdFromUrl();
  if (fromUrl) {
    safeSetLocalStorage(SITE_TESTER_ID_KEY, fromUrl);
    return fromUrl;
  }
  return sanitizeTesterId(safeGetLocalStorage(SITE_TESTER_ID_KEY) || '');
}

function trackSiteVisitOnce() {
  try {
    const path = String(window.location.pathname || '/');
    const key = `${SITE_VISIT_SESSION_FLAG_PREFIX}${path}`;
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');

    const testerId = getSiteTesterId();
    const visitParams = new URLSearchParams(window.location.search || '');
    const payload = {
      action: 'site_visit_track',
      page_path: path,
      page_title: String(document.title || '').slice(0, 120),
      lang: getUiLang(),
      referrer: String(document.referrer || '').slice(0, 260),
      visitor_id: getSiteVisitorId(),
      user_agent: String(navigator.userAgent || '').slice(0, 240),
      tester_id: testerId,
      is_tester: !!testerId,
      entry_url: String(window.location.href || '').slice(0, 320),
      utm_source: String(visitParams.get('utm_source') || visitParams.get('channel') || visitParams.get('src') || '').slice(0, 64),
      utm_medium: String(visitParams.get('utm_medium') || '').slice(0, 64),
      utm_campaign: String(visitParams.get('utm_campaign') || '').slice(0, 100),
      utm_content: String(visitParams.get('utm_content') || visitParams.get('content_id') || '').slice(0, 100),
    };

    fetch(`${SUPABASE_URL}/functions/v1/admin-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

function setCookie(name, value, maxAgeSeconds = 2592000) {
  const encoded = encodeURIComponent(String(value || ''));
  document.cookie = `${name}=${encoded}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

function getCookie(name) {
  const key = `${name}=`;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    if (part.startsWith(key)) return decodeURIComponent(part.slice(key.length));
  }
  return '';
}

function clearCookie(name) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function normalizeKocId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 48);
}

function normalizeKocText(value, maxLen = 64) {
  return String(value || '')
    .trim()
    .replace(/[\r\n\t]/g, ' ')
    .slice(0, maxLen);
}

function parseJsonObject(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeKocSnapshot(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  let koc_id = normalizeKocId(source.koc_id || source.kocId || source.ref || '');
  let parent_koc_id = normalizeKocId(source.parent_koc_id || source.parentKocId || source.parent || source.pkoc || '');
  let channel = normalizeKocId(source.channel || source.src || '');
  let content_id = normalizeKocId(source.content_id || source.contentId || source.cid || '');
  let koc_code = normalizeKocText(source.koc_code || source.kocCode || source.code || '', 64);
  const codeAsId = normalizeKocId(koc_code);

  if (KOC_PLACEHOLDER_IDS.has(koc_id)) koc_id = '';
  if (KOC_PLACEHOLDER_IDS.has(parent_koc_id)) parent_koc_id = '';
  if (KOC_PLACEHOLDER_IDS.has(channel)) channel = '';
  if (KOC_PLACEHOLDER_IDS.has(content_id)) content_id = '';
  if (KOC_PLACEHOLDER_IDS.has(codeAsId)) koc_code = '';
  if (!koc_id && codeAsId && !KOC_PLACEHOLDER_IDS.has(codeAsId)) {
    koc_id = codeAsId;
  }
  if (parent_koc_id && parent_koc_id === koc_id) {
    parent_koc_id = '';
  }

  const first_touch_at = normalizeKocText(source.first_touch_at || source.firstTouchAt || '', 40);
  const last_touch_at = normalizeKocText(source.last_touch_at || source.lastTouchAt || '', 40);
  const first_landing_path = normalizeKocText(source.first_landing_path || source.firstLandingPath || '', 180);
  const last_landing_path = normalizeKocText(source.last_landing_path || source.lastLandingPath || '', 180);
  const entry_url = normalizeKocText(source.entry_url || source.entryUrl || '', 320);

  if (!koc_id && !koc_code) return null;
  return {
    koc_id,
    parent_koc_id,
    channel,
    content_id,
    koc_code,
    first_touch_at,
    last_touch_at,
    first_landing_path,
    last_landing_path,
    entry_url,
  };
}

function readKocSnapshot() {
  const local = normalizeKocSnapshot(parseJsonObject(safeGetLocalStorage(KOC_ATTRIBUTION_KEY) || ''));
  if (local) return local;
  const cookieValue = getCookie(KOC_ATTRIBUTION_COOKIE);
  return normalizeKocSnapshot(parseJsonObject(cookieValue || ''));
}

function persistKocSnapshot(snapshot) {
  if (!snapshot) return;
  const payload = JSON.stringify(snapshot);
  safeSetLocalStorage(KOC_ATTRIBUTION_KEY, payload);
  setCookie(KOC_ATTRIBUTION_COOKIE, payload, KOC_ATTRIBUTION_TTL_SECONDS);
}

function parseKocFromUrl() {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search || '');
  const hashParams = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
  const read = (key) => urlParams.get(key) || hashParams.get(key) || '';

  const candidate = normalizeKocSnapshot({
    koc_id: read('koc_id') || read('ref') || read('koc'),
    parent_koc_id: read('parent_koc_id') || read('parent_koc') || read('parent') || read('parent_id') || read('pkoc'),
    channel: read('channel') || read('utm_source') || read('src'),
    content_id: read('content_id') || read('content') || read('utm_content'),
    koc_code: read('koc_code') || read('code'),
    entry_url: `${window.location.pathname || '/'}${window.location.search || ''}`,
  });

  return candidate;
}

function captureKocFromUrl() {
  const incoming = parseKocFromUrl();
  if (!incoming) return readKocSnapshot();

  const existing = readKocSnapshot();
  const nowIso = new Date().toISOString();
  const merged = normalizeKocSnapshot({
    ...(existing || {}),
    ...incoming,
    first_touch_at: existing?.first_touch_at || nowIso,
    last_touch_at: nowIso,
    first_landing_path: existing?.first_landing_path || (window.location.pathname || '/'),
    last_landing_path: window.location.pathname || '/',
    entry_url: incoming.entry_url || existing?.entry_url || '',
  });

  if (merged) persistKocSnapshot(merged);
  return merged;
}

function getKocSnapshot() {
  return readKocSnapshot();
}

function buildKocFieldsForBirthInput() {
  const snapshot = getKocSnapshot();
  if (!snapshot) return {};
  const fields = {};
  if (snapshot.koc_id) fields.koc_id = snapshot.koc_id;
  if (snapshot.parent_koc_id) fields.koc_parent_id = snapshot.parent_koc_id;
  if (snapshot.channel) fields.koc_channel = snapshot.channel;
  if (snapshot.content_id) fields.koc_content_id = snapshot.content_id;
  if (snapshot.koc_code) fields.koc_code = snapshot.koc_code;
  return fields;
}

function buildOrderTrackingSeed(service, paymentOptionId) {
  const tracking = {
    client_id: getClientId(),
    attribution_model: 'last_click_30d',
    service: String(service || ''),
    payment_option_id: String(paymentOptionId || ''),
    payment_ab_variant: getPaymentAbVariant(),
    order_created_client_at: new Date().toISOString(),
  };
  const inviteCode = getInviteCode();
  if (inviteCode) tracking.invite_code = inviteCode;
  const snapshot = getKocSnapshot();
  if (!snapshot) return tracking;
  if (snapshot.koc_id) tracking.koc_id = snapshot.koc_id;
  if (snapshot.parent_koc_id) tracking.koc_parent_id = snapshot.parent_koc_id;
  if (snapshot.channel) tracking.koc_channel = snapshot.channel;
  if (snapshot.content_id) tracking.koc_content_id = snapshot.content_id;
  if (snapshot.koc_code) tracking.koc_code = snapshot.koc_code;
  if (snapshot.first_touch_at) tracking.koc_first_touch_at = snapshot.first_touch_at;
  if (snapshot.last_touch_at) tracking.koc_last_touch_at = snapshot.last_touch_at;
  if (snapshot.first_landing_path) tracking.koc_first_landing_path = snapshot.first_landing_path;
  if (snapshot.last_landing_path) tracking.koc_last_landing_path = snapshot.last_landing_path;
  if (snapshot.entry_url) tracking.koc_entry_url = snapshot.entry_url;
  return tracking;
}

function withKocEventMeta(meta = {}) {
  const snapshot = getKocSnapshot();
  const next = {
    ...meta,
    payment_ab_variant: getPaymentAbVariant(),
  };
  if (!snapshot) return next;
  if (snapshot.koc_id) next.koc_id = snapshot.koc_id;
  if (snapshot.parent_koc_id) next.koc_parent_id = snapshot.parent_koc_id;
  if (snapshot.channel) next.koc_channel = snapshot.channel;
  if (snapshot.content_id) next.koc_content_id = snapshot.content_id;
  return next;
}

function normalizeInviteCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);
}

function setInviteCode(code) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) {
    safeRemoveLocalStorage(INVITE_CODE_KEY);
    clearCookie(INVITE_CODE_COOKIE);
    return '';
  }
  safeSetLocalStorage(INVITE_CODE_KEY, normalized);
  setCookie(INVITE_CODE_COOKIE, normalized, 60 * 60 * 24 * 30);
  return normalized;
}

function getInviteCode() {
  const local = normalizeInviteCode(safeGetLocalStorage(INVITE_CODE_KEY) || '');
  if (local) return local;
  const cookie = normalizeInviteCode(getCookie(INVITE_CODE_COOKIE) || '');
  if (!cookie) return '';
  safeSetLocalStorage(INVITE_CODE_KEY, cookie);
  return cookie;
}

function captureInviteCodeFromUrl() {
  try {
    const query = new URLSearchParams(window.location.search || '');
    const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    const read = (key) => query.get(key) || hash.get(key) || '';
    const incoming = normalizeInviteCode(
      read('invite_code')
      || read('invite')
      || read('coupon')
      || read('promo_code'),
    );
    if (!incoming) return getInviteCode();
    return setInviteCode(incoming);
  } catch {
    return getInviteCode();
  }
}

function getClientId() {
  let cid = safeGetLocalStorage(CLIENT_ID_KEY) || getCookie(CLIENT_ID_KEY);
  if (!cid) {
    cid = Math.random().toString(36).slice(2, 10);
  }
  safeSetLocalStorage(CLIENT_ID_KEY, cid);
  setCookie(CLIENT_ID_KEY, cid, 60 * 60 * 24 * 180);
  return cid;
}

function hashTextToInt(text) {
  const input = String(text || '');
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getPaymentAbVariant() {
  const cached = String(safeGetLocalStorage(PAYMENT_AB_KEY) || '').toUpperCase();
  if (cached === 'A' || cached === 'B') return cached;
  const seed = `${getClientId()}-${getSiteVisitorId()}`;
  const variant = (hashTextToInt(seed) % 2 === 0) ? 'A' : 'B';
  safeSetLocalStorage(PAYMENT_AB_KEY, variant);
  return variant;
}

function getPaymentAbCopySet() {
  const variant = getPaymentAbVariant();
  if (variant === 'B') {
    return {
      variant,
      modalTitle: '选择支付方案（限时活动）',
      modalSub: '越晚看清，越可能错过关键窗口。现在锁定报告更稳妥。',
      optionMeta: {
        basic: {
          tag: '先看底盘',
          desc: '先看清你的底层驱动力、天赋优势和现实选择方向，低成本建立判断框架（约3000字）。',
          point: '8大核心维度：用神喜忌 / 五行扶抑 / 性格驱动力 / 天赋能力 / 事业财运 / 赚钱方式 / 行业黄金期 / 创业副业适配',
          cta: '先解锁入门版',
        },
        pro: {
          tag: '最受欢迎',
          desc: '覆盖事业、婚恋、家庭、人际与运势主线，适合希望一次看全关键问题的用户（约5000字）。',
          point: '16大实战维度：在8大基础上新增感情婚姻、婚恋相处、隐患深剖、原生家庭、子女缘分、人际贵人、神煞、地支刑冲合会',
          cta: '解锁进阶版（推荐）',
        },
        vip: {
          tag: '完整版',
          desc: '完整覆盖24个维度，增加风险预警、关键转折点、改运策略与人生课题总结（约7000-9000字）。',
          point: '24维全景报告 + 7000-9000字：命局参考 × 事业财运 × 婚恋家庭 × 大运流年 × 决策策略',
          cta: '解锁至尊完整版',
        },
      },
    };
  }
  return {
    variant,
    modalTitle: '请选择支付选项',
    modalSub: '已准备好你的生辰信息，选择后将跳转支付。',
    optionMeta: {
      basic: {
        tag: '低门槛先看清',
        desc: '先用8大核心维度看清命盘底层结构，快速建立可执行判断（约3000字）。',
        point: '8大核心：用神喜忌 / 五行扶抑 / 性格驱动力 / 天赋优势 / 事业财运 / 赚钱方式 / 行业黄金期 / 创业副业适配',
        cta: '立即解锁入门版',
      },
      pro: {
        tag: '最受欢迎',
        desc: '覆盖16个高频决策维度，兼顾深度与效率，适合多数用户（约5000字）。',
        point: '16大维度：在8大核心基础上，增加感情婚姻、婚恋说明书、隐患深剖、原生家庭、子女缘分、贵人模式、神煞、地支刑冲合会',
        cta: '立即解锁进阶版',
      },
      vip: {
        tag: '全局判断',
        desc: '24维完整版 + 7000-9000字，从命局到底层课题给出完整策略。',
        point: '24维全景：新增风险预警、关键转折点、改运补运、人生核心课题总结',
        cta: '立即解锁尊享版',
      },
    },
  };
}

captureInviteCodeFromUrl();
captureKocFromUrl();
trackSiteVisitOnce();

function setPendingTradeNo(tradeNo) {
  safeSetLocalStorage(PENDING_TRADE_KEY, tradeNo);
  setCookie(PENDING_TRADE_COOKIE, tradeNo, 60 * 60 * 24 * 30);
}

function getPendingTradeNo() {
  return safeGetLocalStorage(PENDING_TRADE_KEY) || getCookie(PENDING_TRADE_COOKIE);
}

function clearPendingTradeNo() {
  safeRemoveLocalStorage(PENDING_TRADE_KEY);
  clearCookie(PENDING_TRADE_COOKIE);
  clearPendingBirthInput();
}

function setPendingPaymentOptionId(optionId) {
  if (!optionId) return;
  safeSetLocalStorage(PENDING_PAYMENT_OPTION_KEY, optionId);
  setCookie(PENDING_PAYMENT_OPTION_COOKIE, optionId, 60 * 60 * 24 * 30);
}

function getPendingPaymentOptionId() {
  return safeGetLocalStorage(PENDING_PAYMENT_OPTION_KEY) || getCookie(PENDING_PAYMENT_OPTION_COOKIE) || '';
}

function clearPendingPaymentOptionId() {
  safeRemoveLocalStorage(PENDING_PAYMENT_OPTION_KEY);
  clearCookie(PENDING_PAYMENT_OPTION_COOKIE);
}

function setPendingPdfTradeNo(tradeNo) {
  if (!tradeNo) return;
  safeSetLocalStorage(PDF_PENDING_TRADE_KEY, tradeNo);
  setCookie(PDF_PENDING_TRADE_COOKIE, tradeNo, 60 * 60 * 24 * 30);
}

function getPendingPdfTradeNo() {
  return safeGetLocalStorage(PDF_PENDING_TRADE_KEY) || getCookie(PDF_PENDING_TRADE_COOKIE) || '';
}

function clearPendingPdfTradeNo() {
  safeRemoveLocalStorage(PDF_PENDING_TRADE_KEY);
  clearCookie(PDF_PENDING_TRADE_COOKIE);
}

function setPendingBirthInput(tradeNo, birthInput) {
  if (!tradeNo || !birthInput) return;
  const payload = {
    trade_no: tradeNo,
    birth_input: { ...birthInput },
    saved_at: Date.now(),
  };
  safeSetLocalStorage(PENDING_BIRTH_INPUT_KEY, JSON.stringify(payload));
}

function getPendingBirthInput(tradeNo = '') {
  const raw = safeGetLocalStorage(PENDING_BIRTH_INPUT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (tradeNo && parsed.trade_no && parsed.trade_no !== tradeNo) return null;
    const birth = parsed.birth_input;
    if (!birth || typeof birth !== 'object') return null;
    return birth;
  } catch {
    return null;
  }
}

function clearPendingBirthInput(tradeNo = '') {
  if (!tradeNo) {
    safeRemoveLocalStorage(PENDING_BIRTH_INPUT_KEY);
    return;
  }
  const current = getPendingBirthInput(tradeNo);
  if (current) safeRemoveLocalStorage(PENDING_BIRTH_INPUT_KEY);
}

function buildResultUrl(tradeNo, birthInput = null) {
  const params = new URLSearchParams();
  if (tradeNo) params.set('trade_no', tradeNo);
  params.set('paid', 'true');
  if (isConsultOptionId(birthInput?.payment_option?.id) || String(birthInput?.order_service || '').trim().toLowerCase() === 'consult') {
    params.set('consult', '1');
  }

  if (birthInput && typeof birthInput === 'object') {
    const y = Number(birthInput.year);
    const m = Number(birthInput.month);
    const d = Number(birthInput.day);
    const h = Number(birthInput.hour);
    const inputH = Number.isFinite(Number(birthInput.inputHour)) ? Number(birthInput.inputHour) : h;
    if (Number.isFinite(y)) params.set('year', String(y));
    if (Number.isFinite(m)) params.set('month', String(m));
    if (Number.isFinite(d)) params.set('day', String(d));
    if (Number.isFinite(h)) params.set('hour', String(h));
    if (Number.isFinite(inputH)) params.set('inputHour', String(inputH));
    if (birthInput.gender) params.set('gender', String(birthInput.gender));
    if (birthInput.birthplace) params.set('birthplace', String(birthInput.birthplace));
    if (birthInput.lon) params.set('lon', String(birthInput.lon));
  }

  return `result.html?${params.toString()}`;
}

function buildOrderRecoveryUrl(tradeNo = '') {
  const trade = String(tradeNo || '').trim();
  return trade ? `${ORDER_RECOVERY_PAGE}?trade_no=${encodeURIComponent(trade)}` : ORDER_RECOVERY_PAGE;
}

function ensureOrderRecoveryEntry(formEl) {
  if (!formEl || document.getElementById('order-recovery-entry')) return;
  // 仅在确有待支付/待找回订单时显示，冷访客首屏保持干净、零支付焦虑
  if (!getPendingTradeNo()) return;

  const panel = document.createElement('div');
  panel.id = 'order-recovery-entry';
  panel.style.cssText = [
    'margin:0 0 12px',
    'padding:12px',
    'border:1px solid #C7DDFB',
    'border-radius:10px',
    'background:#F8FBFF',
  ].join(';');

  const title = document.createElement('div');
  title.id = 'order-recovery-entry-title';
  title.style.cssText = 'font-size:14px;color:#1E3A8A;font-weight:700;margin-bottom:6px;';
  title.textContent = tUi('orderRecoveryEntryTitle');

  const hint = document.createElement('div');
  hint.id = 'order-recovery-entry-hint';
  hint.style.cssText = 'font-size:12px;color:#475569;line-height:1.6;margin-bottom:8px;';
  hint.textContent = tUi('orderRecoveryEntryHint');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'order-recovery-entry-btn';
  btn.style.cssText = 'padding:8px 12px;border:0;border-radius:8px;background:#1d4ed8;color:#fff;cursor:pointer;font-size:13px;font-weight:600;';
  btn.textContent = tUi('orderRecoveryEntryBtn');
  btn.addEventListener('click', () => {
    window.location.href = buildOrderRecoveryUrl(getPendingTradeNo());
  });

  panel.appendChild(title);
  panel.appendChild(hint);
  panel.appendChild(btn);
  formEl.prepend(panel);
}

function initCustomerServiceWidget() {
  const canShowOnPage = !!document.getElementById('bazi-form') || !!document.getElementById('bazi-table-section');
  if (!canShowOnPage || document.getElementById('kefu-float-btn')) return;

  const style = document.createElement('style');
  style.id = 'kefu-widget-style';
  style.textContent = `
    #kefu-float-btn{position:fixed;right:16px;bottom:88px;z-index:9998;background:#0b5cc9;color:#fff;border:none;border-radius:999px;padding:10px 14px;font-size:13px;font-weight:600;box-shadow:0 8px 22px rgba(10,37,64,.28);cursor:pointer}
    #kefu-modal{position:fixed;inset:0;background:rgba(10,37,64,.46);z-index:10020;display:none;align-items:center;justify-content:center;padding:16px}
    #kefu-modal.show{display:flex}
    #kefu-card{width:min(92vw,360px);background:#fff;border-radius:14px;border:1px solid #e5e7eb;padding:14px}
    #kefu-title{font-size:18px;font-weight:700;color:#0f172a}
    #kefu-sub{font-size:13px;color:#64748b;margin-top:4px}
    #kefu-image{width:100%;max-height:62vh;object-fit:contain;margin-top:12px;border-radius:10px;border:1px solid #dbe3ed;background:#fff}
    #kefu-close{margin-top:12px;width:100%;padding:10px 12px;border:none;border-radius:8px;background:#111827;color:#fff;font-weight:600;cursor:pointer}
    @media (min-width:768px){#kefu-float-btn{bottom:26px}}
  `;
  document.head.appendChild(style);

  const openBtn = document.createElement('button');
  openBtn.id = 'kefu-float-btn';
  openBtn.type = 'button';
  openBtn.textContent = '客服微信';

  const modal = document.createElement('div');
  modal.id = 'kefu-modal';
  modal.innerHTML = `
    <div id="kefu-card">
      <div id="kefu-title">${CUSTOMER_SERVICE_TITLE}</div>
      <div id="kefu-sub">${CUSTOMER_SERVICE_SUBTITLE}</div>
      <img id="kefu-image" src="${CUSTOMER_SERVICE_IMAGE}" alt="微信客服二维码">
      <button id="kefu-close" type="button">关闭</button>
    </div>
  `;

  // 浮动「客服微信」按钮已并入右下角 AI 对话框头部的「微信」入口，避免两个浮标重叠
  // document.body.appendChild(openBtn);
  document.body.appendChild(modal);

  const img = modal.querySelector('#kefu-image');
  if (img) {
    img.addEventListener('error', () => {
      img.alt = '客服图片加载失败';
      img.style.display = 'none';
      const hint = document.createElement('div');
      hint.style.cssText = 'margin-top:12px;padding:10px;border:1px dashed #cbd5e1;border-radius:8px;color:#64748b;font-size:13px;';
      hint.textContent = '客服微信图片暂未配置，请稍后重试。';
      img.parentElement?.insertBefore(hint, document.getElementById('kefu-close'));
    }, { once: true });
  }

  openBtn.addEventListener('click', () => {
    openCustomerServiceEntry();
  });
  modal.addEventListener('click', (evt) => {
    if (evt.target === modal) modal.classList.remove('show');
  });
  modal.querySelector('#kefu-close')?.addEventListener('click', () => {
    modal.classList.remove('show');
  });
}

function openCustomerServiceModal() {
  if (!document.getElementById('kefu-modal')) {
    initCustomerServiceWidget();
  }
  const modal = document.getElementById('kefu-modal');
  if (modal) {
    modal.classList.add('show');
    return;
  }
  alert('\u5ba2\u670d\u7a97\u53e3\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u540e\u91cd\u8bd5\u3002');
}

function openCustomerServiceLink() {
  const url = String(CUSTOMER_SERVICE_LINK || '').trim();
  if (!url) return false;
  try {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) {
      try {
        opened.opener = null;
      } catch {}
      return true;
    }
  } catch {}
  try {
    window.location.href = url;
    return true;
  } catch {}
  return false;
}

function openCustomerServiceEntry() {
  if (openCustomerServiceLink()) return;
  openCustomerServiceModal();
}

function isConsultOptionId(optionId) {
  return String(optionId || '').trim().toLowerCase() === CONSULT_PRODUCT.id;
}

function normalizeConsultGender(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('\u7537') || raw === 'male' || raw === 'm' || raw === 'man') return 'male';
  if (raw.includes('\u5973') || raw === 'female' || raw === 'f' || raw === 'woman') return 'female';
  return '';
}

function isValidConsultNickname(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return /[A-Za-z\u4e00-\u9fff]/.test(raw);
}

function isValidConsultPhone(value) {
  const raw = String(value || '').trim();
  return /^\d{11}$/.test(raw);
}

function formatBirthDateTimeFromBirth(birth = {}) {
  const y = Number(birth?.year);
  const m = Number(birth?.month);
  const d = Number(birth?.day);
  const h = Number(birth?.hour);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d) || !Number.isFinite(h)) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:00`;
}

async function saveConsultIntake(tradeNo, intake = {}) {
  const id = String(tradeNo || '').trim();
  if (!id) throw new Error('\u7f3a\u5c11\u8ba2\u5355\u53f7');

  const payload = {
    nickname: String(intake?.nickname || '').trim().slice(0, 64),
    contact: String(intake?.contact || '').trim().slice(0, 120),
    birth_datetime: String(intake?.birth_datetime || '').trim().slice(0, 64),
    gender: normalizeConsultGender(intake?.gender || ''),
    birthplace: String(intake?.birthplace || '').trim().slice(0, 120),
    question: String(intake?.question || '').trim().slice(0, 2000),
    preferred_time: String(intake?.preferred_time || '').trim().slice(0, 500),
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-consult-intake`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trade_no: id,
      intake: payload,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    const message = String(data?.message || data?.error || `HTTP ${response.status}`).trim();
    throw new Error(message || 'submit_consult_intake_failed');
  }

  const nextIntake = data?.consult_intake && typeof data.consult_intake === 'object' && !Array.isArray(data.consult_intake)
    ? data.consult_intake
    : payload;
  return nextIntake;
}

function getConsultIntakeCopy() {
  const lang = getUiLang();
  if (lang === 'en') {
    return {
      title: '1-on-1 Consultation Confirmed',
      desc: 'To help our consultant prepare in advance, please submit your profile and preference below.',
      orderNo: 'Order No:',
      formTitle: 'Consultation Intake Form',
      nicknameLabel: 'How should we address you?',
      nicknamePlaceholder: 'e.g. Ms. Zhang / Mr. Li',
      contactLabel: 'Mobile number (required)',
      contactPlaceholder: '11-digit mobile number',
      birthDatetimeLabel: 'Birth date & time',
      birthDatetimePlaceholder: 'e.g. 1992-08-16 09:00',
      genderLabel: 'Gender',
      genderPlaceholder: 'Optional',
      genderMale: 'Male',
      genderFemale: 'Female',
      birthplaceLabel: 'Birthplace',
      birthplacePlaceholder: 'City / Province / Country',
      questionLabel: 'Your key questions',
      questionPlaceholder: 'Describe what you want to focus on in this consultation.',
      preferredTimeLabel: 'Preferred time slots',
      preferredTimePlaceholder: 'e.g. Weekdays after 20:00',
      submitBtn: 'Submit Consultation Info',
      submitLoading: 'Submitting...',
      openKefuBtn: 'Open WeChat Service QR',
      recoveryBtn: 'Order Recovery Center',
      savedAtPrefix: 'Saved at: ',
      errNoOrder: 'Order number missing. Please re-open from Order Recovery Center.',
      errNicknameRequired: 'Please enter your preferred name.',
      errNicknameInvalid: 'Name must contain letters or Chinese characters.',
      errContactRequired: 'Please enter your mobile number.',
      errContactInvalid: 'Mobile number must be exactly 11 digits.',
      errQuestionRequired: 'Please enter your question description.',
      savingText: 'Saving your consultation info...',
      savedText: 'Saved successfully. Our team will contact you based on your preferred time.',
      saveFailPrefix: 'Save failed: ',
    };
  }
  if (lang === 'zh-Hant') {
    return {
      title: '\u5c08\u5c6c\u547d\u7406\u5e2b 1 \u5c0d 1 \u9810\u7d04\u5df2\u6210\u529f',
      desc: '\u70ba\u4e86\u8b93\u547d\u7406\u5e2b\u63d0\u524d\u6e96\u5099\uff0c\u8acb\u5148\u88dc\u5145\u4ee5\u4e0b\u9810\u7d04\u8cc7\u8a0a\u3002',
      orderNo: '\u8a02\u55ae\u865f\uff1a',
      formTitle: '\u9810\u7d04\u8cc7\u8a0a\u63d0\u4ea4',
      nicknameLabel: '\u7a31\u547c',
      nicknamePlaceholder: '\u4f8b\uff1a\u5f35\u5973\u58eb / \u674e\u5148\u751f',
      contactLabel: '\u624b\u6a5f\u865f\uff08\u5fc5\u586b\uff09',
      contactPlaceholder: '\u8acb\u8f38\u5165 11 \u4f4d\u624b\u6a5f\u865f',
      birthDatetimeLabel: '\u51fa\u751f\u5e74\u6708\u65e5\u6642\u9593',
      birthDatetimePlaceholder: '\u4f8b\uff1a1992-08-16 09:00',
      genderLabel: '\u6027\u5225',
      genderPlaceholder: '\u53ef\u9078',
      genderMale: '\u7537',
      genderFemale: '\u5973',
      birthplaceLabel: '\u51fa\u751f\u5730',
      birthplacePlaceholder: '\u8acb\u586b\u5beb\u7701 / \u5e02 / \u570b\u5bb6',
      questionLabel: '\u554f\u984c\u63cf\u8ff0',
      questionPlaceholder: '\u8acb\u63cf\u8ff0\u4f60\u60f3\u91cd\u9ede\u8a62\u554f\u7684\u554f\u984c\u3002',
      preferredTimeLabel: '\u9810\u7d04\u6642\u9593\u504f\u597d',
      preferredTimePlaceholder: '\u4f8b\uff1a\u5de5\u4f5c\u65e5 20:00 \u5f8c',
      submitBtn: '\u63d0\u4ea4\u9810\u7d04\u8cc7\u8a0a',
      submitLoading: '\u63d0\u4ea4\u4e2d...',
      openKefuBtn: '\u6253\u958b\u5ba2\u670d\u5fae\u4fe1\u4e8c\u7dad\u78bc',
      recoveryBtn: '\u8a02\u55ae\u627e\u56de\u4e2d\u5fc3',
      savedAtPrefix: '\u5df2\u4fdd\u5b58\u6642\u9593\uff1a',
      errNoOrder: '\u7f3a\u5c11\u8a02\u55ae\u865f\uff0c\u8acb\u5f9e\u8a02\u55ae\u627e\u56de\u4e2d\u5fc3\u91cd\u65b0\u9032\u5165\u3002',
      errNicknameRequired: '\u8acb\u586b\u5beb\u7a31\u547c\u3002',
      errNicknameInvalid: '\u7a31\u547c\u4e0d\u80fd\u53ea\u6709\u6578\u5b57\u6216\u7b26\u865f\uff0c\u8acb\u586b\u5beb\u771f\u5be6\u7a31\u547c\u3002',
      errContactRequired: '\u8acb\u586b\u5beb\u624b\u6a5f\u865f\u3002',
      errContactInvalid: '\u624b\u6a5f\u865f\u683c\u5f0f\u932f\u8aa4\uff0c\u8acb\u8f38\u5165 11 \u4f4d\u6578\u5b57\u3002',
      errQuestionRequired: '\u8acb\u586b\u5beb\u554f\u984c\u63cf\u8ff0\uff0c\u65b9\u4fbf\u547d\u7406\u5e2b\u6e96\u5099\u3002',
      savingText: '\u6b63\u5728\u4fdd\u5b58\u9810\u7d04\u8cc7\u8a0a...',
      savedText: '\u9810\u7d04\u8cc7\u8a0a\u5df2\u4fdd\u5b58\uff0c\u5ba2\u670d\u5c07\u4f9d\u4f60\u586b\u5beb\u7684\u6642\u9593\u806f\u7e6b\u3002',
      saveFailPrefix: '\u4fdd\u5b58\u5931\u6557\uff1a',
    };
  }
  return {
    title: '\u4e13\u5c5e\u547d\u7406\u5e08 1 \u5bf9 1 \u9884\u7ea6\u5df2\u6210\u529f',
    desc: '\u4e3a\u4e86\u8ba9\u547d\u7406\u5e08\u63d0\u524d\u5907\u8bfe\uff0c\u8bf7\u5148\u8865\u5145\u4ee5\u4e0b\u9884\u7ea6\u4fe1\u606f\u3002',
    orderNo: '\u8ba2\u5355\u53f7\uff1a',
    formTitle: '\u9884\u7ea6\u4fe1\u606f\u63d0\u4ea4',
    nicknameLabel: '\u79f0\u547c',
    nicknamePlaceholder: '\u4f8b\uff1a\u5f20\u5973\u58eb / \u674e\u5148\u751f',
    contactLabel: '\u624b\u673a\u53f7\uff08\u5fc5\u586b\uff09',
    contactPlaceholder: '\u8bf7\u8f93\u5165 11 \u4f4d\u624b\u673a\u53f7',
    birthDatetimeLabel: '\u51fa\u751f\u5e74\u6708\u65e5\u65f6\u95f4',
    birthDatetimePlaceholder: '\u4f8b\uff1a1992-08-16 09:00',
    genderLabel: '\u6027\u522b',
    genderPlaceholder: '\u53ef\u9009',
    genderMale: '\u7537',
    genderFemale: '\u5973',
    birthplaceLabel: '\u51fa\u751f\u5730',
    birthplacePlaceholder: '\u8bf7\u586b\u5199\u7701 / \u5e02 / \u56fd\u5bb6',
    questionLabel: '\u95ee\u9898\u63cf\u8ff0',
    questionPlaceholder: '\u8bf7\u63cf\u8ff0\u4f60\u60f3\u91cd\u70b9\u54a8\u8be2\u7684\u95ee\u9898\u3002',
    preferredTimeLabel: '\u9884\u7ea6\u65f6\u95f4\u504f\u597d',
    preferredTimePlaceholder: '\u4f8b\uff1a\u5de5\u4f5c\u65e5 20:00 \u540e',
    submitBtn: '\u63d0\u4ea4\u9884\u7ea6\u4fe1\u606f',
    submitLoading: '\u63d0\u4ea4\u4e2d...',
    openKefuBtn: '\u6253\u5f00\u5ba2\u670d\u5fae\u4fe1\u4e8c\u7ef4\u7801',
    recoveryBtn: '\u8ba2\u5355\u627e\u56de\u4e2d\u5fc3',
    savedAtPrefix: '\u5df2\u4fdd\u5b58\u65f6\u95f4\uff1a',
    errNoOrder: '\u7f3a\u5c11\u8ba2\u5355\u53f7\uff0c\u8bf7\u4ece\u8ba2\u5355\u627e\u56de\u4e2d\u5fc3\u91cd\u65b0\u8fdb\u5165\u3002',
    errNicknameRequired: '\u8bf7\u586b\u5199\u79f0\u547c\u3002',
    errNicknameInvalid: '\u79f0\u547c\u4e0d\u80fd\u53ea\u6709\u6570\u5b57\u6216\u7b26\u53f7\uff0c\u8bf7\u586b\u5199\u771f\u5b9e\u79f0\u547c\u3002',
    errContactRequired: '\u8bf7\u586b\u5199\u624b\u673a\u53f7\u3002',
    errContactInvalid: '\u624b\u673a\u53f7\u683c\u5f0f\u9519\u8bef\uff0c\u8bf7\u8f93\u5165 11 \u4f4d\u6570\u5b57\u3002',
    errQuestionRequired: '\u8bf7\u586b\u5199\u95ee\u9898\u63cf\u8ff0\uff0c\u65b9\u4fbf\u547d\u7406\u5e08\u51c6\u5907\u3002',
    savingText: '\u6b63\u5728\u4fdd\u5b58\u9884\u7ea6\u4fe1\u606f...',
    savedText: '\u9884\u7ea6\u4fe1\u606f\u5df2\u4fdd\u5b58\uff0c\u5ba2\u670d\u5c06\u6309\u4f60\u586b\u5199\u7684\u504f\u597d\u65f6\u95f4\u8054\u7cfb\u4f60\u3002',
    saveFailPrefix: '\u4fdd\u5b58\u5931\u8d25\uff1a',
  };
}

function renderConsultPaidSuccess(tradeNo = '') {
  const copy = getConsultIntakeCopy();
  const analysisLocked = document.getElementById('analysis-locked');
  const payPrompt = document.getElementById('pay-prompt');
  const analysisContent = document.getElementById('analysis-content');
  const analysisLoading = document.getElementById('analysis-loading');
  const safeTradeNo = String(tradeNo || '').trim();

  if (analysisLocked) analysisLocked.style.display = 'none';
  if (payPrompt) payPrompt.style.display = 'none';
  if (analysisContent) analysisContent.style.display = 'none';
  if (!analysisLoading) return;

  analysisLoading.style.display = 'block';
  analysisLoading.innerHTML = `
    <div style="border:1px solid #bfdbfe;background:#f8fbff;border-radius:12px;padding:14px;">
      <div style="font-size:16px;font-weight:700;color:#0f172a;">${copy.title}</div>
      <p style="margin-top:8px;font-size:13px;color:#334155;line-height:1.8;">
        ${copy.desc}
      </p>
      <div style="margin-top:8px;font-size:12px;color:#64748b;word-break:break-all;">
        ${copy.orderNo}${escapeHtml(safeTradeNo || '-')}
      </div>

      <div style="margin-top:12px;border:1px solid #dbeafe;background:#fff;border-radius:10px;padding:12px;">
        <div style="font-size:14px;font-weight:700;color:#0f172a;">${copy.formTitle}</div>
        <div style="display:grid;gap:8px;margin-top:10px;">
          <label style="font-size:12px;color:#334155;">${copy.nicknameLabel}</label>
          <input id="consult-nickname" type="text" placeholder="${copy.nicknamePlaceholder}" style="height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px;font-size:13px;">
          <label style="font-size:12px;color:#334155;">${copy.contactLabel}</label>
          <input id="consult-contact" type="tel" inputmode="numeric" maxlength="11" placeholder="${copy.contactPlaceholder}" style="height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px;font-size:13px;">
          <label style="font-size:12px;color:#334155;">${copy.birthDatetimeLabel}</label>
          <input id="consult-birth-datetime" type="text" placeholder="${copy.birthDatetimePlaceholder}" style="height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px;font-size:13px;">
          <label style="font-size:12px;color:#334155;">${copy.genderLabel}</label>
          <select id="consult-gender" style="height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px;font-size:13px;background:#fff;">
            <option value="">${copy.genderPlaceholder}</option>
            <option value="male">${copy.genderMale}</option>
            <option value="female">${copy.genderFemale}</option>
          </select>
          <label style="font-size:12px;color:#334155;">${copy.birthplaceLabel}</label>
          <input id="consult-birthplace" type="text" placeholder="${copy.birthplacePlaceholder}" style="height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px;font-size:13px;">
          <label style="font-size:12px;color:#334155;">${copy.questionLabel}</label>
          <textarea id="consult-question" placeholder="${copy.questionPlaceholder}" style="min-height:86px;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font-size:13px;line-height:1.7;resize:vertical;"></textarea>
          <label style="font-size:12px;color:#334155;">${copy.preferredTimeLabel}</label>
          <textarea id="consult-preferred-time" placeholder="${copy.preferredTimePlaceholder}" style="min-height:68px;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font-size:13px;line-height:1.7;resize:vertical;"></textarea>
          <button id="consult-submit-btn" type="button" style="height:40px;border:none;border-radius:8px;background:#1d4ed8;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">${copy.submitBtn}</button>
          <div id="consult-submit-status" style="font-size:12px;color:#475569;line-height:1.7;"></div>
        </div>
      </div>

      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <button id="consult-open-kefu-btn" type="button" style="padding:10px 14px;border:none;border-radius:8px;background:#0b1f44;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">
          ${copy.openKefuBtn}
        </button>
        <a href="${buildOrderRecoveryUrl(safeTradeNo)}" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:8px;background:#1d4ed8;color:#fff;text-decoration:none;font-size:13px;">
          ${copy.recoveryBtn}
        </a>
      </div>
    </div>
  `;

  const openBtn = document.getElementById('consult-open-kefu-btn');
  if (openBtn) {
  openBtn.addEventListener('click', () => openCustomerServiceEntry());
  }

  const nicknameEl = document.getElementById('consult-nickname');
  const contactEl = document.getElementById('consult-contact');
  const birthDtEl = document.getElementById('consult-birth-datetime');
  const genderEl = document.getElementById('consult-gender');
  const birthplaceEl = document.getElementById('consult-birthplace');
  const questionEl = document.getElementById('consult-question');
  const preferredTimeEl = document.getElementById('consult-preferred-time');
  const submitBtn = document.getElementById('consult-submit-btn');
  const statusEl = document.getElementById('consult-submit-status');

  if (contactEl) {
    contactEl.addEventListener('input', () => {
      contactEl.value = String(contactEl.value || '').replace(/\D+/g, '').slice(0, 11);
    });
  }

  const setStatus = (msg, ok = false) => {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.style.color = ok ? '#166534' : '#475569';
  };

  const prefill = async () => {
    if (!safeTradeNo) return;
    const order = await fetchOrderByTradeNo(safeTradeNo);
    const birth = parseBirthInputSafe(order?.birth_input);
    const intake = birth?.consult_intake && typeof birth.consult_intake === 'object' && !Array.isArray(birth.consult_intake)
      ? birth.consult_intake
      : {};

    if (nicknameEl) nicknameEl.value = String(intake.nickname || '').trim();
    if (contactEl) contactEl.value = String(intake.contact || '').trim();
    if (birthDtEl) {
      birthDtEl.value = String(intake.birth_datetime || '').trim() || formatBirthDateTimeFromBirth(birth);
    }
    const genderVal = normalizeConsultGender(intake.gender || birth?.gender || '');
    if (genderEl && genderVal) genderEl.value = genderVal;
    if (birthplaceEl) birthplaceEl.value = String(intake.birthplace || birth?.birthplace || '').trim();
    if (questionEl) questionEl.value = String(intake.question || '').trim();
    if (preferredTimeEl) preferredTimeEl.value = String(intake.preferred_time || '').trim();

    if (String(intake.updated_at || '').trim()) {
      setStatus(`${copy.savedAtPrefix}${String(intake.updated_at).replace('T', ' ').slice(0, 19)}`, true);
    }
  };

  prefill().catch((err) => {
    console.warn('consult intake prefill failed:', err);
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (!safeTradeNo) {
        setStatus(copy.errNoOrder);
        return;
      }
      const payload = {
        nickname: String(nicknameEl?.value || '').trim(),
        contact: String(contactEl?.value || '').trim(),
        birth_datetime: String(birthDtEl?.value || '').trim(),
        gender: normalizeConsultGender(genderEl?.value || ''),
        birthplace: String(birthplaceEl?.value || '').trim(),
        question: String(questionEl?.value || '').trim(),
        preferred_time: String(preferredTimeEl?.value || '').trim(),
      };

      if (!payload.nickname) {
        setStatus(copy.errNicknameRequired);
        nicknameEl?.focus();
        return;
      }
      if (!isValidConsultNickname(payload.nickname)) {
        setStatus(copy.errNicknameInvalid);
        nicknameEl?.focus();
        return;
      }
      if (!payload.contact) {
        setStatus(copy.errContactRequired);
        contactEl?.focus();
        return;
      }
      if (!isValidConsultPhone(payload.contact)) {
        setStatus(copy.errContactInvalid);
        contactEl?.focus();
        return;
      }
      if (!payload.question) {
        setStatus(copy.errQuestionRequired);
        questionEl?.focus();
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = copy.submitLoading;
        setStatus(copy.savingText);
        await saveConsultIntake(safeTradeNo, payload);
        try {
          localStorage.setItem(SUPPORT_ORDER_FOCUS_KEY, safeTradeNo);
        } catch {}
        setStatus(copy.savedText, true);
      } catch (err) {
        console.error('save consult intake failed:', err);
        setStatus(`${copy.saveFailPrefix}${err instanceof Error ? err.message : String(err)}`);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = copy.submitBtn;
      }
    });
  }

  if (safeTradeNo) clearPaymentPanelState(safeTradeNo);
  clearPendingTradeNo();
  clearPendingPaymentOptionId();
}

async function copyTextSafe(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  return false;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomerServiceWidget, { once: true });
} else {
  initCustomerServiceWidget();
}

function isWeChatBrowser() {
  return /MicroMessenger/i.test(navigator.userAgent || '');
}

function parseJsonIfString(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function parseBirthInputSafe(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getAbsolutePdfUrl(downloadPath = PDF_PRODUCT.downloadPath) {
  const path = String(downloadPath || PDF_PRODUCT.downloadPath || '').trim();
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}

function resolvePdfDownloadUrl(downloadUrl = '', downloadPath = PDF_PRODUCT.downloadPath) {
  const direct = String(downloadUrl || '').trim();
  if (direct) return direct;
  return getAbsolutePdfUrl(downloadPath);
}

async function fetchOrderByTradeNo(tradeNo) {
  if (!tradeNo) return null;
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?trade_no=eq.${encodeURIComponent(tradeNo)}&select=trade_no,paid,analysis,birth_input&limit=1`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) ? (rows[0] || null) : null;
  } catch (err) {
    console.warn('fetch order failed:', err);
    return null;
  }
}

async function trackOrderEvent(tradeNo, event, meta = {}) {
  const id = String(tradeNo || '').trim();
  const evt = String(event || '').trim();
  if (!id || !evt) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/track-order-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        trade_no: id,
        event: evt,
        meta: meta && typeof meta === 'object' ? meta : {},
      }),
      keepalive: true,
    });
  } catch (err) {
    console.warn('track order event failed:', evt, id, err);
  }
}

function trackOrderEventOnce(tradeNo, event, meta = {}) {
  const id = String(tradeNo || '').trim();
  const evt = String(event || '').trim();
  if (!id || !evt) return;
  const key = `${EVENT_TRACK_ONCE_PREFIX}${evt}_${id}`;
  const done = safeGetLocalStorage(key);
  if (done) return;
  safeSetLocalStorage(key, String(Date.now()));
  trackOrderEvent(id, evt, meta);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyPdfOrderWithPolling(tradeNo, options = {}) {
  if (!tradeNo) return { paid: false, isPdfOrder: false };
  const attempts = Math.max(1, Number(options.attempts || 1));
  const intervalMs = Math.max(300, Number(options.intervalMs || 1800));
  const quiet = options.quiet !== false;

  for (let i = 0; i < attempts; i++) {
    const reconcileResult = await reconcilePaymentStatus(tradeNo, { quiet });
    const paidByReconcile = Boolean(reconcileResult?.paid) || String(reconcileResult?.status || '').toUpperCase() === 'OD';
    if (paidByReconcile && (reconcileResult?.pdf_ready || reconcileResult?.pdf_download_path)) {
      trackOrderEventOnce(tradeNo, 'payment_verified', { source: 'pdf_reconcile' });
      return {
        paid: true,
        isPdfOrder: true,
        downloadUrl: resolvePdfDownloadUrl(reconcileResult?.pdf_download_url, reconcileResult?.pdf_download_path),
        downloadTtlSeconds: Number(reconcileResult?.pdf_download_expires_in || 0),
        downloadPath: String(reconcileResult?.pdf_download_path || PDF_PRODUCT.downloadPath),
      };
    }

    const order = await fetchOrderByTradeNo(tradeNo);
    const birth = parseBirthInputSafe(order?.birth_input);
    const isPdfOrder = birth?.order_service === 'pdf' || birth?.payment_option?.id === PDF_PRODUCT.id;
    if (!isPdfOrder) return { paid: false, isPdfOrder: false };

    if (order?.paid) {
      trackOrderEventOnce(tradeNo, 'payment_verified', { source: 'pdf_order_row' });
      return {
        paid: true,
        isPdfOrder: true,
        downloadUrl: resolvePdfDownloadUrl('', birth?.pdf_download_path || PDF_PRODUCT.downloadPath),
        downloadTtlSeconds: 0,
        downloadPath: String(birth?.pdf_download_path || PDF_PRODUCT.downloadPath),
      };
    }

    if (i < attempts - 1) await sleep(intervalMs);
  }

  return { paid: false, isPdfOrder: true };
}

function normalizeWeChatJsapiPayload(result) {
  const candidates = [
    result?.wx_jsapi,
    result?.wechat_jsapi,
    result?.jsapi,
    result?.pay_info,
    result?.data?.wx_jsapi,
    result?.data?.wechat_jsapi,
    result?.data?.jsapi,
    result?.data?.pay_info,
    result?.data,
    result,
  ].map(parseJsonIfString);

  let source = null;
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      source = candidate;
      break;
    }
  }
  if (!source) return null;

  const appId = source.appId || source.appid;
  const timeStampRaw = source.timeStamp || source.timestamp;
  const nonceStr = source.nonceStr || source.noncestr;
  const pkg = source.package || source.pkg;
  const signType = source.signType || source.signtype || 'MD5';
  const paySign = source.paySign || source.paysign || source.sign;

  if (!appId || !timeStampRaw || !nonceStr || !pkg || !paySign) {
    return null;
  }

  return {
    appId: String(appId),
    timeStamp: String(timeStampRaw),
    nonceStr: String(nonceStr),
    package: String(pkg),
    signType: String(signType),
    paySign: String(paySign),
  };
}

function shouldShowPaymentDebug() {
  if (window.__BAZI_PAY_DEBUG === true) return true;
  try {
    const p = new URLSearchParams(location.search || '');
    if (p.get('pay_debug') === '1') return true;
  } catch {}
  return false;
}

function renderPaymentDebugInfo(mountEl, result, jsapiPayload) {
  if (!mountEl || !shouldShowPaymentDebug()) return;

  const oldPanel = mountEl.querySelector('#payment-debug-panel');
  if (oldPanel) oldPanel.remove();

  const gateway = result?.gateway_meta || {};
  const requiredKeys = ['appId', 'timeStamp', 'nonceStr', 'package', 'paySign'];
  const missing = requiredKeys.filter((key) => !jsapiPayload || !jsapiPayload[key]);
  const jsapiStatus = missing.length
    ? `JSAPI 参数缺失：${missing.join(', ')}`
    : 'JSAPI 参数完整，可直接微信内唤起支付';

  const panel = document.createElement('div');
  panel.id = 'payment-debug-panel';
  panel.style.cssText = 'margin-top:12px;padding:10px 12px;border:1px dashed #f59e0b;background:#fffbeb;border-radius:8px;font-size:12px;color:#7c2d12;line-height:1.6;';

  const title = document.createElement('div');
  title.style.cssText = 'font-weight:700;margin-bottom:6px;';
  title.textContent = '支付调试信息（测试模式）';
  panel.appendChild(title);

  const lines = [
    `网关优先: ${gateway.preferred_api_base || '-'}`,
    `网关实际: ${gateway.selected_api_base || '-'}`,
    `是否回退: ${gateway.fallback_used ? '是' : '否'}`,
    jsapiStatus,
  ];

  for (const text of lines) {
    const line = document.createElement('div');
    line.textContent = text;
    panel.appendChild(line);
  }

  mountEl.appendChild(panel);
}

function invokeWeChatJsapiPay(jsapiPayload, tradeNo, successUrl = '') {
  return new Promise((resolve, reject) => {
    if (!isWeChatBrowser()) {
      reject(new Error('not_wechat_browser'));
      return;
    }

    let settled = false;
    let timer = null;
    const finish = (fn, payload) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      fn(payload);
    };

    const resultUrl = successUrl || buildResultUrl(tradeNo, getPendingBirthInput(tradeNo));
    const invoke = () => {
      if (!window.WeixinJSBridge || typeof window.WeixinJSBridge.invoke !== 'function') {
        finish(reject, new Error('wx_bridge_unavailable'));
        return;
      }
      window.WeixinJSBridge.invoke('getBrandWCPayRequest', jsapiPayload, (res) => {
        const msg = String(res?.err_msg || '').toLowerCase();
        if (msg.includes('ok')) {
          window.location.href = resultUrl;
          finish(resolve, true);
          return;
        }
        if (msg.includes('cancel')) {
          finish(reject, new Error('wxpay_cancel'));
          return;
        }
        const detail = res?.err_desc || res?.err_msg || 'wxpay_failed';
        finish(reject, new Error(String(detail)));
      });
    };

    if (typeof window.WeixinJSBridge === 'undefined') {
      const onReady = () => {
        document.removeEventListener('WeixinJSBridgeReady', onReady);
        invoke();
      };
      document.addEventListener('WeixinJSBridgeReady', onReady);
      timer = setTimeout(() => {
        finish(reject, new Error('wx_bridge_timeout'));
      }, 5000);
      return;
    }

    invoke();
  });
}

async function reconcilePaymentStatus(tradeNo, options = {}) {
  if (!tradeNo) return null;
  const { quiet = false } = options;
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/reconcile-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({ trade_no: tradeNo }),
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      if (!quiet) console.warn('reconcile-payment failed:', response.status, data);
      return data;
    }
    if (!quiet) console.log('reconcile-payment result:', data);
    return data;
  } catch (err) {
    if (!quiet) console.warn('reconcile-payment error:', err);
    return null;
  }
}

function showMobilePayPanel(payUrl, tradeNo, mountEl, options = {}) {
  const resultUrl = buildResultUrl(tradeNo, getPendingBirthInput(tradeNo));
  const successUrl = String(options?.successUrl || resultUrl || '').trim() || resultUrl;
  const doneLabel = String(options?.doneLabel || '\u6211\u5df2\u5b8c\u6210\u652f\u4ed8\uff0c\u67e5\u770b\u62a5\u544a').trim() || '\u6211\u5df2\u5b8c\u6210\u652f\u4ed8\uff0c\u67e5\u770b\u62a5\u544a';
  const customTip = String(options?.customTip || '').trim();
  const nonRefundNotice = String(options?.nonRefundNotice || PAYMENT_NON_REFUND_NOTICE).trim() || PAYMENT_NON_REFUND_NOTICE;
  const disableWeChatInApp = Boolean(options?.disableWeChatInApp);
  const wechatPayWarning = String(
    options?.wechatPayWarning
      || '\u8bf7\u52ff\u5728\u5fae\u4fe1\u6d4f\u89c8\u5668\u5185\u76f4\u63a5\u652f\u4ed8\uff0c\u907f\u514d\u652f\u4ed8\u540e\u8ba2\u5355\u6821\u9a8c\u5931\u8d25\u3002\u5efa\u8bae\u590d\u5236\u94fe\u63a5\u5230\u7cfb\u7edf\u6d4f\u89c8\u5668\u5b8c\u6210\u652f\u4ed8\u3002'
  ).trim();
  const isWeChat = isWeChatBrowser();
  const uiLang = getUiLang();

  const I18N = {
    en: {
      noticeTitle: 'Payment Notice (Please Read)',
      step3: 'After payment, if the page closes, reopen home and tap "Continue Previous Order", or use "Copy Link & Pay in Browser".',
      openPay: isWeChat ? 'Copy Link & Pay in Browser (Recommended)' : 'Open Payment Page',
      copyPay: 'Copy Payment Link',
      riskOpen: 'Open inside WeChat (May Close Page)',
      copiedTip: 'Payment link copied. Please open it in your system browser and finish payment.',
      manualCopyPrompt: 'Copy this payment link manually:',
      popupBlocked: 'Could not open payment page automatically. Please copy the payment link and open it manually.',
      verifying: 'Verifying payment...',
      defaultTipWechat: 'If WeChat closes this page, reopen homepage and tap "Continue Previous Order".',
      defaultTipMobile: 'Complete payment in a new tab. Keep this page open for report recovery.',
      browserOpenHint: 'Tip: tap the top-right menu and choose "Open in Browser" before paying.',
      followupTitle: 'No confirmation yet? Try these two quick actions',
      followupDesc: 'If already paid, tap verify now. If not, open Order Recovery Center to continue safely.',
      followupVerify: 'Verify Payment Now',
      followupRecovery: 'Open Recovery Center',
      followupPending: 'Automatic reminder appears in',
    },
    'zh-Hans': {
      noticeTitle: '\u652f\u4ed8\u987b\u77e5\uff08\u8bf7\u5148\u9605\u8bfb\uff09',
      step3: '\u652f\u4ed8\u5b8c\u6210\u540e\u8bf7\u91cd\u65b0\u6253\u5f00\u9996\u9875\uff0c\u70b9\u51fb\u201c\u7ee7\u7eed\u4e0a\u6b21\u8ba2\u5355\u201d\uff1b\u6216\u76f4\u63a5\u9009\u62e9\u201c\u590d\u5236\u94fe\u63a5\u5e76\u53bb\u6d4f\u89c8\u5668\u652f\u4ed8\uff08\u63a8\u8350\uff09\u201d\u3002',
      openPay: isWeChat ? '\u590d\u5236\u94fe\u63a5\u5e76\u53bb\u6d4f\u89c8\u5668\u652f\u4ed8\uff08\u63a8\u8350\uff09' : '\u6253\u5f00\u652f\u4ed8\u9875\u9762',
      copyPay: '\u590d\u5236\u652f\u4ed8\u94fe\u63a5',
      riskOpen: '\u4ecd\u5728\u5fae\u4fe1\u5185\u6253\u5f00\uff08\u53ef\u80fd\u5173\u95ed\uff09',
      copiedTip: '\u652f\u4ed8\u94fe\u63a5\u5df2\u590d\u5236\uff0c\u8bf7\u5207\u6362\u5230\u7cfb\u7edf\u6d4f\u89c8\u5668\u6253\u5f00\u5e76\u5b8c\u6210\u652f\u4ed8\u3002',
      manualCopyPrompt: '\u8bf7\u624b\u52a8\u590d\u5236\u652f\u4ed8\u94fe\u63a5\uff1a',
      popupBlocked: '\u672a\u80fd\u81ea\u52a8\u6253\u5f00\u652f\u4ed8\u9875\uff0c\u8bf7\u5148\u590d\u5236\u652f\u4ed8\u94fe\u63a5\u518d\u6253\u5f00\u3002',
      verifying: '\u6b63\u5728\u6821\u9a8c\u652f\u4ed8...',
      defaultTipWechat: '\u5982\u9875\u9762\u88ab\u5173\u95ed\uff0c\u91cd\u65b0\u6253\u5f00\u9996\u9875\u540e\u70b9\u51fb\u201c\u7ee7\u7eed\u4e0a\u6b21\u8ba2\u5355\u201d\u3002',
      defaultTipMobile: '\u624b\u673a\u652f\u4ed8\u8bf7\u5728\u65b0\u7a97\u53e3\u5b8c\u6210\uff0c\u5f53\u524d\u9875\u9762\u5c06\u4fdd\u7559\u7528\u4e8e\u7ee7\u7eed\u67e5\u770b\u62a5\u544a\u3002',
      browserOpenHint: '\u64cd\u4f5c\u63d0\u793a\uff1a\u8bf7\u70b9\u51fb\u53f3\u4e0a\u89d2\u201c\u00b7\u00b7\u00b7\u201d\uff0c\u9009\u62e9\u201c\u5728\u6d4f\u89c8\u5668\u6253\u5f00\u201d\u540e\u518d\u5b8c\u6210\u652f\u4ed8\u3002',
      followupTitle: '\u8d85\u8fc7 5 \u5206\u949f\u4ecd\u672a\u786e\u8ba4\uff1f\u8bf7\u5c1d\u8bd5\u4e0b\u65b9\u64cd\u4f5c',
      followupDesc: '\u82e5\u5df2\u652f\u4ed8\uff0c\u8bf7\u70b9\u201c\u7acb\u5373\u6821\u9a8c\u201d\uff1b\u82e5\u672a\u5b8c\u6210\uff0c\u8bf7\u8fdb\u5165\u201c\u8ba2\u5355\u627e\u56de\u4e2d\u5fc3\u201d\u7ee7\u7eed\u3002',
      followupVerify: '\u7acb\u5373\u6821\u9a8c',
      followupRecovery: '\u8ba2\u5355\u627e\u56de\u4e2d\u5fc3',
      followupPending: '\u5c06\u5728\u4ee5\u4e0b\u65f6\u95f4\u540e\u81ea\u52a8\u63d0\u9192\uff1a',
    },
    'zh-Hant': {
      noticeTitle: '\u652f\u4ed8\u9808\u77e5\uff08\u8acb\u5148\u95b1\u8b80\uff09',
      step3: '\u652f\u4ed8\u5b8c\u6210\u5f8c\u8acb\u91cd\u65b0\u6253\u958b\u9996\u9801\uff0c\u9ede\u64ca\u300c\u7e7c\u7e8c\u4e0a\u6b21\u8a02\u55ae\u300d\uff1b\u6216\u76f4\u63a5\u9078\u64c7\u300c\u8907\u88fd\u9023\u7d50\u4e26\u53bb\u700f\u89bd\u5668\u652f\u4ed8\uff08\u63a8\u85a6\uff09\u300d\u3002',
      openPay: isWeChat ? '\u8907\u88fd\u9023\u7d50\u4e26\u53bb\u700f\u89bd\u5668\u652f\u4ed8\uff08\u63a8\u85a6\uff09' : '\u6253\u958b\u652f\u4ed8\u9801\u9762',
      copyPay: '\u8907\u88fd\u652f\u4ed8\u9023\u7d50',
      riskOpen: '\u4ecd\u5728\u5fae\u4fe1\u5167\u6253\u958b\uff08\u53ef\u80fd\u95dc\u9589\uff09',
      copiedTip: '\u652f\u4ed8\u9023\u7d50\u5df2\u8907\u88fd\uff0c\u8acb\u5207\u63db\u81f3\u7cfb\u7d71\u700f\u89bd\u5668\u6253\u958b\u4e26\u5b8c\u6210\u652f\u4ed8\u3002',
      manualCopyPrompt: '\u8acb\u624b\u52d5\u8907\u88fd\u652f\u4ed8\u9023\u7d50\uff1a',
      popupBlocked: '\u672a\u80fd\u81ea\u52d5\u6253\u958b\u652f\u4ed8\u9801\uff0c\u8acb\u5148\u8907\u88fd\u9023\u7d50\u518d\u6253\u958b\u3002',
      verifying: '\u6b63\u5728\u6821\u9a57\u652f\u4ed8...',
      defaultTipWechat: '\u5982\u9801\u9762\u88ab\u95dc\u9589\uff0c\u8acb\u91cd\u65b0\u6253\u958b\u9996\u9801\u5f8c\u9ede\u64ca\u300c\u7e7c\u7e8c\u4e0a\u6b21\u8a02\u55ae\u300d\u3002',
      defaultTipMobile: '\u624b\u6a5f\u652f\u4ed8\u8acb\u5728\u65b0\u8996\u7a97\u5b8c\u6210\uff0c\u7576\u524d\u9801\u9762\u6703\u4fdd\u7559\u4ee5\u4fbf\u7e7c\u7e8c\u67e5\u770b\u5831\u544a\u3002',
      browserOpenHint: '\u64cd\u4f5c\u63d0\u793a\uff1a\u8acb\u9ede\u64ca\u53f3\u4e0a\u89d2\u300c\u00b7\u00b7\u00b7\u300d\uff0c\u9078\u64c7\u300c\u5728\u700f\u89bd\u5668\u6253\u958b\u300d\u5f8c\u518d\u5b8c\u6210\u652f\u4ed8\u3002',
      followupTitle: '\u8d85\u904e 5 \u5206\u9418\u4ecd\u672a\u78ba\u8a8d\uff1f\u8acb\u5617\u8a66\u4e0b\u65b9\u64cd\u4f5c',
      followupDesc: '\u82e5\u5df2\u652f\u4ed8\uff0c\u8acb\u9ede\u300c\u7acb\u5373\u6821\u9a57\u300d\uff1b\u82e5\u672a\u5b8c\u6210\uff0c\u8acb\u9032\u5165\u300c\u8a02\u55ae\u627e\u56de\u4e2d\u5fc3\u300d\u7e7c\u7e8c\u3002',
      followupVerify: '\u7acb\u5373\u6821\u9a57',
      followupRecovery: '\u8a02\u55ae\u627e\u56de\u4e2d\u5fc3',
      followupPending: '\u5c07\u5728\u4ee5\u4e0b\u6642\u9593\u5f8c\u81ea\u52d5\u63d0\u9192\uff1a',
    },
  };

  const textSet = I18N[uiLang] || I18N['zh-Hans'];
  const step2Text = String(
    options?.step2Text
      || (isWeChat && disableWeChatInApp
        ? wechatPayWarning
        : (uiLang === 'en'
          ? 'On WeChat browser, the payment page may auto-close after payment.'
          : (uiLang === 'zh-Hant'
            ? '\u5fae\u4fe1\u700f\u89bd\u5668\u652f\u4ed8\u5f8c\u9801\u9762\u53ef\u80fd\u81ea\u52d5\u95dc\u9589\uff08\u5fae\u4fe1\u6a5f\u5236\uff09\u3002'
            : '\u5fae\u4fe1\u6d4f\u89c8\u5668\u652f\u4ed8\u540e\u9875\u9762\u53ef\u80fd\u81ea\u52a8\u5173\u95ed\uff08\u5fae\u4fe1\u673a\u5236\uff09\u3002')))
  ).trim();
  const wechatOpenInBrowserHint = (isWeChat && disableWeChatInApp)
    ? `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:#fff;color:#92400e;font-size:12px;line-height:1.6;border:1px solid #fed7aa;">${textSet.browserOpenHint}</div>`
    : '';

  const stateBefore = readPaymentPanelState(tradeNo);
  const openedAtMs = Date.parse(String(stateBefore?.opened_at || '')) || Date.now();
  updatePaymentPanelState(tradeNo, {
    opened_at: stateBefore?.opened_at || new Date(openedAtMs).toISOString(),
    last_panel_shown_at: new Date().toISOString(),
  });
  const elapsedMs = Math.max(0, Date.now() - openedAtMs);
  const followupShouldShowNow = elapsedMs >= PAYMENT_UNPAID_REMINDER_MS;
  const followupRemainMs = Math.max(0, PAYMENT_UNPAID_REMINDER_MS - elapsedMs);

  const debugAnchorHtml = shouldShowPaymentDebug() ? '<div id="mobile-payment-debug-anchor"></div>' : '';
  const panelHtml = `
    <div style="margin-top:2px;padding:10px 12px;border-radius:10px;border:1px solid #fed7aa;background:#fff7ed;color:#7c2d12;font-size:13px;line-height:1.6;">
      <div style="font-weight:700;color:#9a3412;">${textSet.noticeTitle}</div>
      <div style="margin-top:6px;">1. ${nonRefundNotice}</div>
      <div style="margin-top:4px;">2. ${step2Text}</div>
      <div style="margin-top:4px;">3. ${textSet.step3}</div>
      ${wechatOpenInBrowserHint}
    </div>
    <div style="margin-top:12px;display:grid;gap:10px;">
      <button id="mobile-open-pay-btn" type="button" style="padding:12px 14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">${textSet.openPay}</button>
      <button id="mobile-copy-pay-btn" type="button" style="padding:12px 14px;background:#fff;color:#1f2937;border:1px solid #d1d5db;border-radius:8px;font-weight:600;cursor:pointer;">${textSet.copyPay}</button>
      ${(isWeChat && !disableWeChatInApp) ? `<button id="mobile-open-pay-risk-btn" type="button" style="padding:12px 14px;background:#f59e0b;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">${textSet.riskOpen}</button>` : ''}
      <button id="mobile-paid-back-btn" type="button" style="padding:12px 14px;background:#111827;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">${doneLabel}</button>
      <button id="mobile-recovery-center-btn" type="button" style="padding:11px 14px;background:#eef2ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:8px;font-weight:600;cursor:pointer;">${tUi('mobileRecoveryBtn')}</button>
    </div>
    <p style="margin-top:10px;color:#6b7280;font-size:13px;">${customTip || (isWeChat ? textSet.defaultTipWechat : textSet.defaultTipMobile)}</p>
    <div id="mobile-unpaid-reminder" style="margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid #fcd34d;background:#fffbeb;display:${followupShouldShowNow ? 'block' : 'none'};">
      <div style="font-size:13px;font-weight:700;color:#92400e;">${textSet.followupTitle}</div>
      <div style="margin-top:6px;font-size:12px;line-height:1.65;color:#78350f;">${textSet.followupDesc}</div>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
        <button id="mobile-followup-verify-btn" type="button" style="padding:8px 10px;border:none;border-radius:8px;background:#1d4ed8;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">${textSet.followupVerify}</button>
        <button id="mobile-followup-recovery-btn" type="button" style="padding:8px 10px;border:1px solid #f59e0b;border-radius:8px;background:#fff;color:#92400e;font-size:12px;font-weight:700;cursor:pointer;">${textSet.followupRecovery}</button>
      </div>
    </div>
    <div id="mobile-unpaid-countdown" style="margin-top:8px;font-size:12px;color:#b45309;display:${followupShouldShowNow ? 'none' : 'block'};"></div>
    ${debugAnchorHtml}
  `;

  if (mountEl) {
    mountEl.style.display = 'block';
    mountEl.innerHTML = panelHtml;
  } else {
    let overlay = document.getElementById('mobile-pay-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mobile-pay-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,37,64,0.45);z-index:10000;padding:18px;display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = `
        <div style="width:min(92vw,420px);background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px;">
          ${panelHtml}
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (evt) => {
        if (evt.target === overlay) overlay.remove();
      });
    } else {
      overlay.style.display = 'flex';
      overlay.innerHTML = `
        <div style="width:min(92vw,420px);background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px;">
          ${panelHtml}
        </div>
      `;
    }
  }

  const showFollowup = () => {
    const followupBox = document.getElementById('mobile-unpaid-reminder');
    const followupCountdown = document.getElementById('mobile-unpaid-countdown');
    if (followupBox) followupBox.style.display = 'block';
    if (followupCountdown) followupCountdown.style.display = 'none';
    updatePaymentPanelState(tradeNo, { followup_shown_at: new Date().toISOString() });
    trackOrderEventOnce(tradeNo, 'payment_followup_shown', withKocEventMeta({
      in_wechat: isWeChat,
      elapsed_sec: Math.max(0, Math.floor((Date.now() - openedAtMs) / 1000)),
    }));
  };

  const followupCountdown = document.getElementById('mobile-unpaid-countdown');
  if (followupShouldShowNow) {
    showFollowup();
  } else if (followupCountdown) {
    const renderCountdown = (remainMs) => {
      const sec = Math.max(0, Math.ceil(remainMs / 1000));
      followupCountdown.textContent = `${textSet.followupPending} ${sec}s`;
    };
    renderCountdown(followupRemainMs);
    const timerStart = Date.now();
    const timer = window.setInterval(() => {
      const remain = followupRemainMs - (Date.now() - timerStart);
      if (remain <= 0) {
        window.clearInterval(timer);
        showFollowup();
        return;
      }
      renderCountdown(remain);
    }, 1000);
  }

  const openPayBtn = document.getElementById('mobile-open-pay-btn');
  if (openPayBtn) {
    openPayBtn.addEventListener('click', async () => {
      trackOrderEvent(tradeNo, 'payment_page_opened', withKocEventMeta({
        in_wechat: isWeChat,
        method: isWeChat ? 'copy_to_browser' : 'open_new_tab',
      }));
      if (isWeChat) {
        const ok = await copyTextSafe(payUrl);
        if (ok) {
          alert(textSet.copiedTip);
        } else {
          prompt(textSet.manualCopyPrompt, payUrl);
        }
        return;
      }

      const win = window.open(payUrl, '_blank');
      if (!win) {
        alert(textSet.popupBlocked);
      }
    });
  }

  const copyPayBtn = document.getElementById('mobile-copy-pay-btn');
  if (copyPayBtn) {
    copyPayBtn.addEventListener('click', async () => {
      trackOrderEvent(tradeNo, 'payment_link_copied', withKocEventMeta({
        in_wechat: isWeChat,
      }));
      const ok = await copyTextSafe(payUrl);
      if (ok) {
        alert(textSet.copiedTip);
      } else {
        prompt(textSet.manualCopyPrompt, payUrl);
      }
    });
  }

  const doneBtn = document.getElementById('mobile-paid-back-btn');
  if (doneBtn) {
    doneBtn.addEventListener('click', async () => {
      trackOrderEvent(tradeNo, 'payment_verify_clicked', withKocEventMeta({ source: 'mobile_panel' }));
      doneBtn.disabled = true;
      doneBtn.textContent = textSet.verifying;
      await reconcilePaymentStatus(tradeNo, { quiet: true });
      clearPaymentPanelState(tradeNo);
      window.location.href = successUrl;
    });
  }

  const recoveryBtn = document.getElementById('mobile-recovery-center-btn');
  if (recoveryBtn) {
    recoveryBtn.addEventListener('click', () => {
      window.location.href = buildOrderRecoveryUrl(tradeNo);
    });
  }

  const followupVerifyBtn = document.getElementById('mobile-followup-verify-btn');
  if (followupVerifyBtn && doneBtn) {
    followupVerifyBtn.addEventListener('click', () => doneBtn.click());
  }

  const followupRecoveryBtn = document.getElementById('mobile-followup-recovery-btn');
  if (followupRecoveryBtn) {
    followupRecoveryBtn.addEventListener('click', () => {
      window.location.href = buildOrderRecoveryUrl(tradeNo);
    });
  }

  const riskOpenBtn = document.getElementById('mobile-open-pay-risk-btn');
  if (riskOpenBtn) {
    riskOpenBtn.addEventListener('click', () => {
      window.location.href = payUrl;
    });
  }

  return document.getElementById('mobile-payment-debug-anchor') || mountEl || null;
}

function ensurePdfPurchaseUI() {
  return null; // PDF 合集已下架，不再展示购买入口
  const payCard = document.querySelector('.pay-card');
  if (!payCard) return null;

  let section = document.getElementById('pdf-sale-section');
  if (!section) {
    section = document.createElement('div');
    section.id = 'pdf-sale-section';
    section.style.cssText = [
      'margin-top:16px',
      'padding:14px',
      'border:1px solid #dbeafe',
      'border-radius:12px',
      'background:#f8fbff',
    ].join(';');
    section.innerHTML = `
      <div id="pdf-sale-title" style="font-size:18px;font-weight:700;color:#0a2540;line-height:1.5;">《八字命理合集》PDF｜439页系统内容，反复查阅</div>
      <p id="pdf-sale-sub" style="margin:8px 0 0;color:#334155;font-size:14px;line-height:1.8;">全书 439 页，覆盖八字核心知识与实用分析思路，不只看结论，更帮你建立判断框架。</p>
      <div style="margin-top:8px;color:#1f2937;font-size:13px;line-height:1.8;">
        <div id="pdf-sale-bullet-1">• 小白友好：核心逻辑讲清楚，一看就懂</div>
        <div id="pdf-sale-bullet-2">• 决策参考：看清关键年份节奏，少走弯路</div>
        <div id="pdf-sale-bullet-3">• 可反复查阅：支付后直接下载保存</div>
      </div>
      <button type="button" id="pdf-pay-btn" class="form-submit" style="margin-top:12px;">19.9元解锁八字命理合集PDF（原价39.9元）</button>
      <p id="pdf-sale-nonrefund" style="margin:8px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">虚拟知识文档，支付后不支持退款，请确认后购买。</p>
      <div id="pdf-pay-feedback" style="margin-top:10px;display:none;"></div>
      <div id="pdf-download-box" style="margin-top:10px;display:none;"></div>
      <div id="pdf-resume-box" style="margin-top:10px;display:none;"></div>
    `;
    payCard.insertAdjacentElement('afterend', section);
  }

  return {
    section,
    button: section.querySelector('#pdf-pay-btn'),
    feedback: section.querySelector('#pdf-pay-feedback'),
    downloadBox: section.querySelector('#pdf-download-box'),
    resumeBox: section.querySelector('#pdf-resume-box'),
  };
}

function clearPdfSearchParams() {
  try {
    const url = new URL(window.location.href);
    const keys = ['pdf_paid', 'paid', 'trade_no', 'trade_order_id'];
    let changed = false;
    keys.forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    });
    if (!changed) return;
    const query = url.searchParams.toString();
    const target = `${url.pathname}${query ? `?${query}` : ''}${url.hash || ''}`;
    window.history.replaceState({}, '', target);
  } catch {}
}

function showPdfDownloadBox(tradeNo, downloadOptions = {}) {
  const ui = ensurePdfPurchaseUI();
  if (!ui || !ui.downloadBox) return;
  const opts = (downloadOptions && typeof downloadOptions === 'object')
    ? downloadOptions
    : { downloadPath: downloadOptions };
  const url = resolvePdfDownloadUrl(opts.downloadUrl, opts.downloadPath || PDF_PRODUCT.downloadPath);
  const ttlSeconds = Math.max(0, Number(opts.downloadTtlSeconds || 0));
  const ttlHint = ttlSeconds > 0
    ? `<div style="margin-top:6px;font-size:12px;color:#92400e;">下载链接有效期约 ${Math.ceil(ttlSeconds / 60)} 分钟。若链接失效，请点击“我已完成支付，下载PDF”重新获取。</div>`
    : '';
  const orderText = tradeNo ? `<div style="margin-top:6px;font-size:12px;color:#64748b;">订单号：${tradeNo}</div>` : '';

  if (ui.feedback) {
    ui.feedback.style.display = 'none';
    ui.feedback.innerHTML = '';
  }
  if (ui.resumeBox) {
    ui.resumeBox.style.display = 'none';
    ui.resumeBox.innerHTML = '';
  }

  ui.downloadBox.style.display = 'block';
  ui.downloadBox.innerHTML = `
    <div style="padding:12px;border:1px solid #86efac;border-radius:10px;background:#f0fdf4;">
      <div style="font-size:15px;font-weight:700;color:#166534;">支付校验成功，可下载《八字命理合集》PDF</div>
      <div style="margin-top:6px;font-size:13px;color:#365314;">请尽快下载并保存到本地，避免链接过期。</div>
      ${ttlHint}
      ${orderText}
      <div style="margin-top:10px;display:grid;gap:8px;">
        <a id="pdf-download-link-btn" href="${url}" target="_blank" rel="noopener noreferrer" download="${PDF_PRODUCT.fileName}" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 12px;border-radius:8px;background:#166534;color:#fff;text-decoration:none;font-weight:600;">下载《八字命理合集》PDF</a>
        <button id="pdf-copy-link-btn" type="button" style="padding:10px 12px;border:1px solid #bbf7d0;border-radius:8px;background:#fff;color:#166534;font-weight:600;cursor:pointer;">复制下载链接</button>
      </div>
    </div>
  `;

  const downloadBtn = ui.downloadBox.querySelector('#pdf-download-link-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      trackOrderEventOnce(tradeNo, 'pdf_download_clicked');
    });
  }

  const copyBtn = ui.downloadBox.querySelector('#pdf-copy-link-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const ok = await copyTextSafe(url);
      if (ok) {
        alert('下载链接已复制。');
      } else {
        prompt('请手动复制下载链接：', url);
      }
    });
  }

  clearPendingPdfTradeNo();
  clearPdfSearchParams();
}

async function tryResumePdfOrder(tradeNo, options = {}) {
  if (!tradeNo) return false;

  const ui = ensurePdfPurchaseUI();
  if (!ui) return false;

  const aggressive = Boolean(options?.aggressive);
  const verifyResult = await verifyPdfOrderWithPolling(tradeNo, {
    attempts: aggressive ? 14 : 1,
    intervalMs: 1800,
    quiet: true,
  });
  if (verifyResult?.paid) {
    showPdfDownloadBox(tradeNo, {
      downloadUrl: verifyResult?.downloadUrl || '',
      downloadPath: verifyResult?.downloadPath || PDF_PRODUCT.downloadPath,
      downloadTtlSeconds: verifyResult?.downloadTtlSeconds || 0,
    });
    return true;
  }
  if (!verifyResult?.isPdfOrder) return false;

  if (ui.resumeBox) {
    ui.resumeBox.style.display = 'block';
    ui.resumeBox.innerHTML = `
      <div style="padding:10px 12px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1e3a8a;font-size:13px;line-height:1.6;">
        检测到未完成的 PDF 订单。若你已完成支付，请点下方按钮主动校验并下载。
        <div style="margin-top:8px;font-size:12px;color:#475569;">订单号：${tradeNo}</div>
        <button id="pdf-resume-verify-btn" type="button" style="margin-top:10px;width:100%;padding:10px 12px;border:none;border-radius:8px;background:#1d4ed8;color:#fff;font-weight:600;cursor:pointer;">我已完成支付，立即校验并下载PDF</button>
        <div id="pdf-resume-verify-msg" style="margin-top:8px;font-size:12px;color:#475569;"></div>
      </div>
    `;

    const verifyBtn = ui.resumeBox.querySelector('#pdf-resume-verify-btn');
    const verifyMsg = ui.resumeBox.querySelector('#pdf-resume-verify-msg');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', async () => {
        verifyBtn.disabled = true;
        verifyBtn.textContent = '正在校验支付状态...';
        if (verifyMsg) verifyMsg.textContent = '支付网关同步可能有延迟，正在重试校验（约10-30秒）...';

        const retryResult = await verifyPdfOrderWithPolling(tradeNo, {
          attempts: 18,
          intervalMs: 1800,
          quiet: true,
        });

        if (retryResult?.paid) {
          showPdfDownloadBox(tradeNo, {
            downloadUrl: retryResult?.downloadUrl || '',
            downloadPath: retryResult?.downloadPath || PDF_PRODUCT.downloadPath,
            downloadTtlSeconds: retryResult?.downloadTtlSeconds || 0,
          });
          return;
        }

        verifyBtn.disabled = false;
        verifyBtn.textContent = '我已完成支付，立即校验并下载PDF';
        if (verifyMsg) verifyMsg.textContent = '暂未检测到支付成功，请稍后再点一次；若仍失败请联系客服并提供订单号。';
      });
    }
  }
  return false;
}

async function startPdfPayment() {
  const ui = ensurePdfPurchaseUI();
  if (!ui || !ui.button) return;

  const button = ui.button;
  const feedback = ui.feedback;
  const defaultText = button.dataset.defaultText || button.textContent || '19.9元解锁八字命理合集PDF（原价39.9元）';
  button.dataset.defaultText = defaultText;

  const setFeedback = (html) => {
    if (!feedback) return;
    feedback.style.display = 'block';
    feedback.innerHTML = html;
  };

  button.disabled = true;
  button.textContent = '正在创建支付订单...';
  if (ui.downloadBox) {
    ui.downloadBox.style.display = 'none';
    ui.downloadBox.innerHTML = '';
  }

  const tradeNo = `bazi-${getClientId()}-${Date.now()}-pdf`;
  setPendingPdfTradeNo(tradeNo);

  const pdfBirthInput = {
    order_service: 'pdf',
    product_id: PDF_PRODUCT.id,
    product_title: PDF_PRODUCT.title,
    payment_ab_variant: getPaymentAbVariant(),
    payment_option: {
      id: PDF_PRODUCT.id,
      title: PDF_PRODUCT.title,
      fee: PDF_PRODUCT.fee,
    },
    pdf_download_path: PDF_PRODUCT.downloadPath,
    pdf_storage_bucket: PDF_PRODUCT.storageBucket,
    pdf_storage_path: PDF_PRODUCT.storagePath,
    tracking: buildOrderTrackingSeed('pdf', PDF_PRODUCT.id),
    ...buildKocFieldsForBirthInput(),
  };

  try {
    const createOrderResp = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        trade_no: tradeNo,
        birth_input: JSON.stringify(pdfBirthInput),
      }),
    });
    if (!createOrderResp.ok) {
      const detail = await createOrderResp.text().catch(() => '');
      throw new Error(`create_order_failed:${createOrderResp.status}:${detail}`);
    }
    trackOrderEventOnce(tradeNo, 'order_created', withKocEventMeta({
      service: 'pdf',
      payment_option_id: PDF_PRODUCT.id,
    }));

    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const isWeChat = isWeChatBrowser();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        trade_no: tradeNo,
        payment_option_id: PDF_PRODUCT.id,
        payment_option_title: PDF_PRODUCT.title,
        total_fee: PDF_PRODUCT.fee,
        return_path: '/payment-fallback.html',
        birth_input: pdfBirthInput,
        client_env: {
          user_agent: ua,
          is_mobile: isMobile,
          is_wechat: isWeChat,
          payment_ab_variant: getPaymentAbVariant(),
          koc: getKocSnapshot() || null,
        },
      }),
    });

    const result = await response.json();
    if (result?.errcode !== 0) {
      throw new Error(result?.errmsg || 'create_payment_failed');
    }

    const payUrl = result?.url || result?.url_qrcode || '';
    const jsapiPayload = normalizeWeChatJsapiPayload(result);
    trackOrderEventOnce(tradeNo, 'payment_created', withKocEventMeta({
      service: 'pdf',
      payment_option_id: PDF_PRODUCT.id,
      api_base: result?.gateway_meta?.selected_api_base || '',
    }));
    const successUrl = `${window.location.origin}/index.html?pdf_paid=1&trade_no=${encodeURIComponent(tradeNo)}`;

    setFeedback('<p class="price-desc">订单已创建，请完成支付后下载《八字命理合集》PDF。</p>');

    if (!payUrl) {
      throw new Error('payment_url_missing');
    }

    const debugMount = showMobilePayPanel(payUrl, tradeNo, feedback || null, {
      successUrl,
      doneLabel: '我已完成支付，下载PDF',
      nonRefundNotice: PDF_NON_REFUND_NOTICE,
      disableWeChatInApp: true,
      wechatPayWarning: '请勿在微信浏览器内直接支付，避免支付后订单校验失败。请复制链接到系统浏览器完成支付。',
      step2Text: '请全程在系统浏览器完成支付，不要切回微信内置浏览器，避免订单校验失败。',
      customTip: '请使用系统浏览器完成支付。支付成功后返回本页，点击“我已完成支付，下载PDF”即可领取《八字命理合集》PDF。',
    });
    renderPaymentDebugInfo(debugMount, result, jsapiPayload);
  } catch (err) {
    console.error('start pdf payment failed:', err);
    clearPendingPdfTradeNo();
    setFeedback('<p class="price-desc">创建支付失败，请稍后重试。</p>');
  } finally {
    button.disabled = false;
    button.textContent = defaultText;
  }
}

function initPdfSale() {
  const ui = ensurePdfPurchaseUI();
  if (!ui || !ui.button) return;

  if (!ui.button.dataset.bound) {
    ui.button.dataset.bound = '1';
    ui.button.addEventListener('click', () => {
      startPdfPayment();
    });
  }

  const search = new URLSearchParams(window.location.search || '');
  const fromUrl = search.get('trade_no') || search.get('trade_order_id') || '';
  const fromPaidReturn = search.get('pdf_paid') === '1' || search.get('paid') === 'true';
  const pendingTradeNo = fromUrl || getPendingPdfTradeNo();
  if (!pendingTradeNo) return;
  setPendingPdfTradeNo(pendingTradeNo);
  tryResumePdfOrder(pendingTradeNo, { aggressive: fromPaidReturn });
}

function pickPaymentOption() {
  return new Promise(resolve => {
    const abCopy = getPaymentAbCopySet();
    safeSetLocalStorage(PAYMENT_AB_TRACK_KEY, JSON.stringify({
      variant: abCopy.variant,
      viewed_at: new Date().toISOString(),
      page: window.location.pathname || '/',
    }));

    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(10,37,64,0.48)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:9999',
      'padding:20px',
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'width:min(96vw,980px)',
      'max-height:90vh',
      'overflow:auto',
      'background:#fff',
      'border-radius:14px',
      'border:1px solid #DEE2E6',
      'box-shadow:0 16px 44px rgba(0,0,0,0.18)',
      'padding:18px',
      'font-family:inherit',
    ].join(';');

    const title = document.createElement('h3');
    title.textContent = abCopy.modalTitle;
    title.style.cssText = 'margin:0 0 6px;font-size:18px;color:#0A2540;';

    const subtitle = document.createElement('p');
    subtitle.textContent = abCopy.modalSub;
    subtitle.style.cssText = 'margin:0 0 14px;font-size:13px;color:#6C757D;';

    const notice = document.createElement('div');
    notice.style.cssText = [
      'margin:0 0 14px',
      'padding:10px 12px',
      'border-radius:10px',
      'border:1px solid #fecaca',
      'background:#fef2f2',
      'color:#b91c1c',
      'font-size:13px',
      'line-height:1.6',
    ].join(';');
    notice.innerHTML = `
      <div style="font-weight:700;">${PAYMENT_NON_REFUND_NOTICE}</div>
      <div style="margin-top:4px;">${WECHAT_PAYMENT_CLOSE_NOTICE}</div>
    `;

    const inviteLabel = tUi('inviteCodeLabel') || '邀请码 / 老客优惠码（可选）';
    const invitePlaceholder = tUi('inviteCodePlaceholder') || '输入邀请码可自动抵扣';
    const inviteHint = tUi('inviteCodeHint') || '如你是老客或来自合作渠道，建议先输入邀请码。';
    const inviteInitial = getInviteCode();

    const inviteWrap = document.createElement('div');
    inviteWrap.style.cssText = [
      'margin:0 0 14px',
      'padding:10px 12px',
      'border-radius:10px',
      'border:1px solid #dbeafe',
      'background:#f8fbff',
    ].join(';');
    inviteWrap.innerHTML = `
      <label for="pay-invite-code-input" style="display:block;font-size:13px;font-weight:700;color:#1e3a8a;">${inviteLabel}</label>
      <input id="pay-invite-code-input" type="text" maxlength="32" placeholder="${invitePlaceholder}" value="${inviteInitial}" style="margin-top:6px;width:100%;padding:10px 12px;border:1px solid #bfdbfe;border-radius:8px;font-size:13px;color:#0a2540;box-sizing:border-box;" />
      <div style="margin-top:6px;font-size:12px;color:#475569;line-height:1.6;">${inviteHint}</div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .bazi-pay-grid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:12px;
      }
      .bazi-pay-option{
        width:100%;
        text-align:left;
        border-radius:12px;
        border:1px solid #d9e2ef;
        background:#fff;
        padding:14px;
        cursor:pointer;
        display:flex;
        flex-direction:column;
        gap:8px;
        min-height:228px;
        transition:all .18s ease;
      }
      .bazi-pay-option:hover{
        transform:translateY(-1px);
        box-shadow:0 10px 26px rgba(15,23,42,.14);
      }
      .bazi-pay-option .opt-top{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
      }
      .bazi-pay-option .opt-name{
        font-size:16px;
        font-weight:700;
        color:#0a2540;
      }
      .bazi-pay-option .opt-tag{
        font-size:11px;
        line-height:1;
        padding:4px 8px;
        border-radius:999px;
        border:1px solid transparent;
        white-space:nowrap;
      }
      .bazi-pay-option .opt-desc{
        font-size:13px;
        line-height:1.5;
        color:#334155;
        min-height:38px;
      }
      .bazi-pay-option .opt-point{
        font-size:12px;
        line-height:1.6;
        color:#475569;
      }
      .bazi-pay-option .opt-price{
        margin-top:auto;
        padding-top:4px;
        font-size:13px;
        display:flex;
        align-items:center;
        gap:8px;
      }
      .bazi-pay-option .opt-price-formal{
        color:#94a3b8;
        text-decoration:line-through;
      }
      .bazi-pay-option .opt-price-sale{
        color:#dc2626;
        font-weight:700;
      }
      .bazi-pay-option .opt-cta{
        margin-top:8px;
        border-radius:10px;
        padding:9px 10px;
        text-align:center;
        font-size:13px;
        font-weight:700;
      }
      .bazi-pay-option.basic{
        border-color:#d9e2ef;
        background:#fff;
      }
      .bazi-pay-option.basic .opt-tag{
        background:#f1f5f9;
        color:#334155;
        border-color:#cbd5e1;
      }
      .bazi-pay-option.basic .opt-cta{
        background:#e2e8f0;
        color:#0f172a;
      }
      .bazi-pay-option.pro{
        border-color:#2563eb;
        background:linear-gradient(180deg,#eff6ff 0%,#ffffff 70%);
        box-shadow:0 10px 28px rgba(37,99,235,.18);
      }
      .bazi-pay-option.pro .opt-tag{
        background:#1d4ed8;
        color:#fff;
      }
      .bazi-pay-option.pro .opt-cta{
        background:#2563eb;
        color:#fff;
      }
      .bazi-pay-option.vip{
        border-color:#f59e0b;
        background:linear-gradient(180deg,#fffbeb 0%,#ffffff 72%);
      }
      .bazi-pay-option.vip .opt-tag{
        background:#f59e0b;
        color:#fff;
      }
      .bazi-pay-option.vip .opt-cta{
        background:#f59e0b;
        color:#fff;
      }
      @media (max-width: 900px){
        .bazi-pay-grid{
          grid-template-columns:1fr;
        }
        .bazi-pay-option{
          min-height:auto;
        }
      }
    `;

    const list = document.createElement('div');
    list.className = 'bazi-pay-grid';

    const optionDisplay = {
      basic: {
        name: '入门版',
        tag: abCopy.optionMeta.basic.tag,
        desc: abCopy.optionMeta.basic.desc,
        point: abCopy.optionMeta.basic.point,
        formal: '128',
        sale: '99',
        cta: abCopy.optionMeta.basic.cta,
        variant: 'basic',
      },
      pro: {
        name: '进阶版',
        tag: abCopy.optionMeta.pro.tag,
        desc: abCopy.optionMeta.pro.desc,
        point: abCopy.optionMeta.pro.point,
        formal: '258',
        sale: '199',
        cta: abCopy.optionMeta.pro.cta,
        variant: 'pro',
      },
      vip: {
        name: '尊享完整版',
        tag: abCopy.optionMeta.vip.tag,
        desc: abCopy.optionMeta.vip.desc,
        point: abCopy.optionMeta.vip.point,
        formal: '398',
        sale: '299',
        cta: abCopy.optionMeta.vip.cta,
        variant: 'vip',
      },
    };

    const orderedOptionIds = ['basic', 'pro', 'vip'];
    const orderedOptions = orderedOptionIds
      .map((id) => PAYMENT_OPTIONS.find((x) => x.id === id))
      .filter(Boolean);
    const extraOptions = PAYMENT_OPTIONS.filter((x) => !orderedOptionIds.includes(x.id));
    const finalOptions = [...orderedOptions, ...extraOptions];

    finalOptions.forEach((opt) => {
      const meta = optionDisplay[opt.id] || {
        name: opt.title,
        tag: '可选',
        desc: opt.subtitle || '',
        point: '',
        formal: '--',
        sale: opt.fee,
        cta: '立即解锁',
        variant: 'basic',
      };
      // 显示价强制等于真实扣款价(PAYMENT_OPTIONS.fee)，避免弹窗显示与实际扣款/结果页不一致
      meta.sale = opt.fee;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `bazi-pay-option ${meta.variant}`;
      btn.innerHTML = `
        <div class="opt-top">
          <div class="opt-name">${meta.name}</div>
          <span class="opt-tag">${meta.tag}</span>
        </div>
        <div class="opt-desc">${meta.desc}</div>
        ${meta.point ? `<div class="opt-point">${meta.point}</div>` : ''}
        <div class="opt-price">
          <span class="opt-price-formal">正式价 ¥${meta.formal}</span>
          <span class="opt-price-sale">当前活动价 ¥${meta.sale}</span>
        </div>
        <div class="opt-cta">${meta.cta}</div>
      `;
      btn.addEventListener('click', () => {
        const inviteInput = card.querySelector('#pay-invite-code-input');
        const inviteCode = setInviteCode(inviteInput ? inviteInput.value : '');
        cleanup();
        resolve({ ...opt, invite_code: inviteCode || '' });
      });
      list.appendChild(btn);
    });

    const customWrap = document.createElement('div');
    customWrap.style.cssText = [
      'margin-top:4px',
      'padding:12px',
      'border-radius:10px',
      'border:1px dashed #93C5FD',
      'background:#F0F7FF',
    ].join(';');

    const customTitle = document.createElement('div');
    customTitle.textContent = `${CONSULT_PRODUCT.title}（原价¥${CONSULT_PRODUCT.formalFee}｜优惠价¥${CONSULT_PRODUCT.promoFee}）`;
    customTitle.style.cssText = 'font-size:14px;font-weight:700;color:#0A2540;';

    const customSub = document.createElement('div');
    customSub.textContent = '适合希望获得更细致、个性化指导的用户：专属研究员1对1深度沟通，付款后自动校验订单并进入咨询预约流程（1小时语音或电话交付）。';
    customSub.style.cssText = 'margin-top:6px;font-size:12px;line-height:1.6;color:#334155;';

    const customNotice = document.createElement('div');
    customNotice.textContent = `${CONSULT_NON_REFUND_NOTICE} ${CONSULT_DELIVERY_NOTICE}`;
    customNotice.style.cssText = 'margin-top:8px;font-size:12px;line-height:1.7;color:#b45309;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 10px;';

    const customBtn = document.createElement('button');
    customBtn.type = 'button';
    customBtn.textContent = `立即支付1对1咨询（优惠价¥${CONSULT_PRODUCT.promoFee}）`;
    customBtn.style.cssText = [
      'margin-top:10px',
      'width:100%',
      'padding:10px 12px',
      'border:none',
      'border-radius:8px',
      'background:#0A2540',
      'color:#fff',
      'font-size:13px',
      'font-weight:600',
      'cursor:pointer',
    ].join(';');
    customBtn.addEventListener('click', () => {
      const inviteInput = card.querySelector('#pay-invite-code-input');
      const inviteCode = setInviteCode(inviteInput ? inviteInput.value : '');
      cleanup();
      resolve({ ...CONSULT_PAYMENT_OPTION, invite_code: inviteCode || '' });
    });

    const customContactBtn = document.createElement('button');
    customContactBtn.type = 'button';
    customContactBtn.textContent = '打开企业微信客服';
    customContactBtn.style.cssText = [
      'margin-top:8px',
      'width:100%',
      'padding:10px 12px',
      'border:1px solid #bfdbfe',
      'border-radius:8px',
      'background:#fff',
      'color:#1e3a8a',
      'font-size:12px',
      'font-weight:600',
      'cursor:pointer',
    ].join(';');
    customContactBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
      setTimeout(() => openCustomerServiceEntry(), 0);
    });
    customWrap.appendChild(customTitle);
    customWrap.appendChild(customSub);
    customWrap.appendChild(customNotice);
    customWrap.appendChild(customBtn);
    customWrap.appendChild(customContactBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = [
      'margin-top:12px',
      'width:100%',
      'padding:11px 12px',
      'border-radius:10px',
      'border:1px solid #DEE2E6',
      'background:#fff',
      'color:#6C757D',
      'font-size:14px',
      'cursor:pointer',
    ].join(';');
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    function cleanup() {
      document.removeEventListener('keydown', onEsc);
      overlay.remove();
    }

    function onEsc(evt) {
      if (evt.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    }

    overlay.addEventListener('click', (evt) => {
      if (evt.target === overlay) {
        cleanup();
        resolve(null);
      }
    });

    document.addEventListener('keydown', onEsc);
    card.appendChild(style);
    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(notice);
    card.appendChild(inviteWrap);
    card.appendChild(list);
    card.appendChild(customWrap);
    card.appendChild(cancelBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}

// ── 真太阳时计算 ──────────────────────────────────────────────────
// 均时差（Spencer 公式），返回分钟数
function equationOfTime(year, month, day) {
  const start = new Date(year, 0, 0);
  const now   = new Date(year, month - 1, day);
  const doy   = Math.floor((now - start) / 86400000); // 年积日
  const B  = (360 / 365) * (doy - 81) * Math.PI / 180;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

// 经度修正（分钟）：(经度 - 当地标准经线) * 4
// 标准经线 = UTC偏移 * 15
function longitudeCorrection(longitude, utcOffset) {
  return (longitude - utcOffset * 15) * 4;
}

// 出生地经纬度缓存
let geoCache = null;

// Nominatim 地理编码（防抖）
let geoTimer = null;
function scheduleGeocode(place) {
  clearTimeout(geoTimer);
  if (!place) { geoCache = null; document.getElementById('geo-hint').textContent = ''; return; }
  document.getElementById('geo-hint').className = 'geo-hint';
  document.getElementById('geo-hint').textContent = '正在查询...';
  geoTimer = setTimeout(() => geocode(place), 800);
}

async function geocode(place) {
  const hint = document.getElementById('geo-hint');
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'zh-CN,zh' } }
    );
    const data = await res.json();
    if (!data.length) { hint.className = 'geo-hint err'; hint.textContent = '未找到该地点'; geoCache = null; return; }
    const lon = parseFloat(data[0].lon);
    const lat = parseFloat(data[0].lat);
    geoCache = { lon, lat, display: data[0].display_name.split(',')[0] };
    hint.className = 'geo-hint ok';
    hint.textContent = `${geoCache.display}　经度 ${lon.toFixed(2)}°（真太阳时将在提交时自动校正）`;
  } catch {
    hint.className = 'geo-hint err';
    hint.textContent = '地点查询失败，将跳过真太阳时校正';
    geoCache = null;
  }
}

// ── 首页逻辑 ──────────────────────────────────────────────────────
const form = document.getElementById('bazi-form');
if (form) {
  ensureOrderRecoveryEntry(form);
  // 阳历/农历切换
  document.querySelectorAll('input[name=caltype]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isLunar = radio.value === 'lunar';
      document.getElementById('leap-group').style.display = isLunar ? 'block' : 'none';
      document.getElementById('lbl-solar').classList.toggle('active', !isLunar);
      document.getElementById('lbl-lunar').classList.toggle('active', isLunar);
    });
  });

  // 出生地输入时触发地理编码
  document.getElementById('birthplace').addEventListener('input', e => {
    scheduleGeocode(e.target.value.trim());
  });

  const resumeFromPendingTrade = async () => {
    let pendingTradeNo = getPendingTradeNo();
    const clientId = getClientId();

    if (!pendingTradeNo && clientId) {
      try {
        const pattern = `bazi-${clientId}-*`;
        const recentRes = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?trade_no=like.${pattern}&select=trade_no,paid,analysis,birth_input&order=trade_no.desc&limit=5`,
          { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
        );
        if (recentRes.ok) {
          const recentRows = await recentRes.json();
          const recentOrder = Array.isArray(recentRows)
            ? (recentRows.find((row) => {
              const birth = parseBirthInputSafe(row?.birth_input);
              if (birth?.order_service === 'pdf') return false;
              const paid = !!row?.paid;
              const hasAnalysis = !!String(row?.analysis || '').trim();
              return !paid || !hasAnalysis;
            }) || null)
            : null;
          if (recentOrder?.trade_no) {
            pendingTradeNo = recentOrder.trade_no;
            setPendingTradeNo(pendingTradeNo);
          }
        }
      } catch (err) {
        console.warn('recover latest trade by client id failed:', err);
      }
    }

    if (!pendingTradeNo) return;

    const renderPendingPanel = (paid = false) => {
      if (document.getElementById('pending-trade-resume')) return;
      const resultUrl = buildResultUrl(pendingTradeNo, getPendingBirthInput(pendingTradeNo));
      const recoveryUrl = buildOrderRecoveryUrl(pendingTradeNo);
      const resumeUrl = paid ? resultUrl : recoveryUrl;

      const panel = document.createElement('div');
      panel.id = 'pending-trade-resume';
      panel.style.cssText = [
        'margin:0 0 12px',
        'padding:12px',
        'border:1px solid #BFDBFE',
        'border-radius:10px',
        'background:#EFF6FF',
      ].join(';');

      const title = document.createElement('div');
      title.style.cssText = 'font-size:14px;color:#1E3A8A;font-weight:700;margin-bottom:8px;';
      title.textContent = paid ? tUi('pendingResumePaidTitle') : tUi('pendingResumeUnpaidTitle');

      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:12px;color:#334155;line-height:1.6;margin:0 0 8px;';
      hint.textContent = paid ? '' : tUi('pendingResumeUnpaidHint');

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

      const resumeBtn = document.createElement('button');
      resumeBtn.type = 'button';
      resumeBtn.style.cssText = 'padding:8px 12px;border:0;border-radius:8px;background:#2563EB;color:#fff;cursor:pointer;font-size:13px;';
      resumeBtn.textContent = paid ? tUi('pendingResumePaidBtn') : tUi('pendingResumeUnpaidBtn');
      resumeBtn.addEventListener('click', () => {
        window.location.href = resumeUrl;
      });

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.style.cssText = 'padding:8px 12px;border:1px solid #93C5FD;border-radius:8px;background:#fff;color:#1E3A8A;cursor:pointer;font-size:13px;';
      clearBtn.textContent = '清除这条订单';
      clearBtn.addEventListener('click', () => {
        clearPendingTradeNo();
        clearPendingPaymentOptionId();
        panel.remove();
      });

      const recoverBtn = document.createElement('button');
      recoverBtn.type = 'button';
      recoverBtn.style.cssText = 'padding:8px 12px;border:1px solid #93C5FD;border-radius:8px;background:#f8fbff;color:#1E3A8A;cursor:pointer;font-size:13px;';
      recoverBtn.textContent = tUi('pendingRecoverBtn');
      recoverBtn.addEventListener('click', () => {
        window.location.href = buildOrderRecoveryUrl(pendingTradeNo);
      });

      row.appendChild(resumeBtn);
      row.appendChild(clearBtn);
      row.appendChild(recoverBtn);
      panel.appendChild(title);
      if (!paid) panel.appendChild(hint);
      panel.appendChild(row);
      form.prepend(panel);
    };

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?trade_no=eq.${encodeURIComponent(pendingTradeNo)}&select=paid,analysis,birth_input`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      if (!res.ok) {
        renderPendingPanel(false);
        return;
      }
      const rows = await res.json();
      const order = Array.isArray(rows) ? rows[0] : null;
      if (!order) {
        renderPendingPanel(false);
        return;
      }
      const birth = parseBirthInputSafe(order.birth_input);
      if (birth?.order_service === 'pdf') {
        clearPendingTradeNo();
        clearPendingPaymentOptionId();
        return;
      }
      const hasAnalysis = !!String(order?.analysis || '').trim();
      if (order.paid && hasAnalysis) {
        clearPendingTradeNo();
        clearPendingPaymentOptionId();
        return;
      }

      renderPendingPanel(!!order.paid);
    } catch (err) {
      console.warn('pending trade recover failed:', err);
      renderPendingPanel(false);
    }
  };

  resumeFromPendingTrade();
  initPdfSale();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let year   = parseInt(document.getElementById('year').value);
    let month  = parseInt(document.getElementById('month').value);
    let day    = parseInt(document.getElementById('day').value);
    let hour   = parseInt(document.getElementById('hour').value);
    const gender     = document.querySelector('input[name=gender]:checked').value;
    const birthplace = document.getElementById('birthplace').value.trim();
    const caltype    = document.querySelector('input[name=caltype]:checked').value;

    // 农历转阳历
    if (caltype === 'lunar') {
      const isLeap = document.getElementById('is-leap').checked;
      try {
        const solar = isLeap
          ? Lunar.fromYmd(year, -month, day).getSolar()
          : Lunar.fromYmd(year, month, day).getSolar();
        year  = solar.getYear();
        month = solar.getMonth();
        day   = solar.getDay();
      } catch {
        alert('农历日期转换失败，请检查输入是否正确');
        return;
      }
    }

    // 真太阳时校正
    let solarHour = hour;
    let tzOffset  = 8; // 默认北京时间
    let lonUsed   = null;
    if (geoCache) {
      lonUsed  = geoCache.lon;
      tzOffset = Math.round(lonUsed / 15);  // 近似时区
      const eqtMin  = equationOfTime(year, month, day);
      const lonMin  = longitudeCorrection(lonUsed, tzOffset);
      const totalMin = eqtMin + lonMin;
      // 将分钟偏移加到出生时间
      const birthMin = hour * 60 + totalMin;
      solarHour = ((Math.floor(birthMin / 60) % 24) + 24) % 24;
    }

    const params = new URLSearchParams({
      year, month, day,
      hour: solarHour,         // 真太阳时校正后的时辰
      inputHour: hour,         // 原始输入时辰（供结果页显示）
      gender, birthplace,
      lon: lonUsed !== null ? lonUsed.toFixed(2) : '',
      paid: 'false',           // 标记为免费模式
    });
    window.location.href = `result.html?${params}`;
  });

  // 付费按钮点击事件（兜底：旧版首页没有 paid-btn 时自动注入）
  let paidBtn = document.getElementById('paid-btn');
  if (!paidBtn) {
    const submitBtn = form.querySelector('.form-submit');
    if (submitBtn && submitBtn.parentElement) {
      paidBtn = document.createElement('button');
      paidBtn.type = 'button';
      paidBtn.id = 'paid-btn';
      paidBtn.className = 'form-submit';
      paidBtn.textContent = '立即解锁完整分析报告';
      paidBtn.dataset.defaultText = paidBtn.textContent;
      paidBtn.style.marginTop = '12px';
      submitBtn.insertAdjacentElement('afterend', paidBtn);
    }
  }

  if (paidBtn) {
    if (!paidBtn.dataset.defaultText) {
      paidBtn.dataset.defaultText = paidBtn.textContent.trim();
    }

    let consultPayBtn = document.getElementById('consult-pay-btn');
    if (!consultPayBtn && paidBtn.parentElement) {
      consultPayBtn = document.createElement('button');
      consultPayBtn.type = 'button';
      consultPayBtn.id = 'consult-pay-btn';
      consultPayBtn.className = 'form-submit';
      consultPayBtn.textContent = `1\u5bf91\u54a8\u8be2\u4e13\u7528\u652f\u4ed8\uff08\u4f18\u60e0\u4ef7\u00a5${CONSULT_PRODUCT.promoFee}\uff09`;
      consultPayBtn.style.marginTop = '10px';
      consultPayBtn.style.background = '#0b1f44';
      consultPayBtn.style.borderColor = '#0b1f44';
      paidBtn.insertAdjacentElement('afterend', consultPayBtn);
    }
    if (consultPayBtn && !consultPayBtn.dataset.defaultText) {
      consultPayBtn.dataset.defaultText = consultPayBtn.textContent.trim();
    }

    let consultNotice = document.getElementById('consult-pay-notice');
    if (!consultNotice && consultPayBtn && consultPayBtn.parentElement) {
      consultNotice = document.createElement('p');
      consultNotice.id = 'consult-pay-notice';
      consultNotice.style.cssText = 'margin-top:8px;font-size:12px;line-height:1.75;color:#b45309;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 10px;';
      consultPayBtn.insertAdjacentElement('afterend', consultNotice);
    }
    if (consultNotice) {
      consultNotice.textContent = `${CONSULT_NON_REFUND_NOTICE} ${CONSULT_DELIVERY_NOTICE}`;
    }

    // 首页只保留「免费排盘解读」——付费/咨询选项移到出结果后(result.html 已有完整升级)。
    // 先让冷访客动手排盘、看到价值，再谈钱，避免首屏价格焦虑劝退。
    const heroPayCard = (paidBtn.closest && paidBtn.closest('.pay-card')) || paidBtn;
    if (heroPayCard) heroPayCard.style.display = 'none';
    if (consultPayBtn) consultPayBtn.style.display = 'none';
    if (consultNotice) consultNotice.style.display = 'none';

    const collectBirthAndBazi = () => {
      const yearEl = document.getElementById('year');
      const monthEl = document.getElementById('month');
      const dayEl = document.getElementById('day');
      const hourEl = document.getElementById('hour');
      const genderEl = document.querySelector('input[name=gender]:checked');

      if (!yearEl.value || !monthEl.value || !dayEl.value || !hourEl.value || !genderEl) {
        alert('\u8bf7\u586b\u5199\u5b8c\u6574\u7684\u751f\u8fb0\u4fe1\u606f');
        return null;
      }

      let year = parseInt(yearEl.value);
      let month = parseInt(monthEl.value);
      let day = parseInt(dayEl.value);
      let hour = parseInt(hourEl.value);
      const gender = genderEl.value;
      const birthplace = document.getElementById('birthplace').value.trim();
      const caltype = document.querySelector('input[name=caltype]:checked').value;

      if (caltype === 'lunar') {
        const isLeap = document.getElementById('is-leap').checked;
        try {
          const solar = isLeap
            ? Lunar.fromYmd(year, -month, day).getSolar()
            : Lunar.fromYmd(year, month, day).getSolar();
          year = solar.getYear();
          month = solar.getMonth();
          day = solar.getDay();
        } catch {
          alert('\u519c\u5386\u65e5\u671f\u8f6c\u6362\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u8f93\u5165\u662f\u5426\u6b63\u786e');
          return null;
        }
      }

      let solarHour = hour;
      if (geoCache) {
        const lonUsed = geoCache.lon;
        const tzOffset = Math.round(lonUsed / 15);
        const eqtMin = equationOfTime(year, month, day);
        const lonMin = longitudeCorrection(lonUsed, tzOffset);
        const totalMin = eqtMin + lonMin;
        const birthMin = hour * 60 + totalMin;
        solarHour = ((Math.floor(birthMin / 60) % 24) + 24) % 24;
      }

      const bazi = BaziCalc.calculateBazi(year, month, day, solarHour);
      return {
        birthData: { year, month, day, hour: solarHour, gender, birthplace },
        bazi,
      };
    };

    paidBtn.addEventListener('click', async () => {
      const parsed = collectBirthAndBazi();
      if (!parsed) return;

      const selectedOption = await pickPaymentOption();
      if (!selectedOption) return;

      paidBtn.disabled = true;
      paidBtn.textContent = '\u6b63\u5728\u8df3\u8f6c...';

      try {
        await startPayment(parsed.birthData, parsed.bazi, selectedOption);
      } catch (err) {
        console.error('\u652f\u4ed8\u8df3\u8f6c\u5931\u8d25:', err);
        alert('\u8df3\u8f6c\u652f\u4ed8\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u91cd\u8bd5');
        paidBtn.disabled = false;
        paidBtn.textContent = paidBtn.dataset.defaultText || '\u7acb\u5373\u89e3\u9501\u5b8c\u6574\u547d\u7406\u62a5\u544a';
      }
    });

    if (consultPayBtn) {
      consultPayBtn.addEventListener('click', async () => {
        const parsed = collectBirthAndBazi();
        if (!parsed) return;

        consultPayBtn.disabled = true;
        consultPayBtn.textContent = '\u6b63\u5728\u8df3\u8f6c...';

        try {
          await startPayment(parsed.birthData, parsed.bazi, CONSULT_PAYMENT_OPTION);
        } catch (err) {
          console.error('\u54a8\u8be2\u652f\u4ed8\u8df3\u8f6c\u5931\u8d25:', err);
          alert('\u54a8\u8be2\u652f\u4ed8\u8df3\u8f6c\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u91cd\u8bd5');
          consultPayBtn.disabled = false;
          consultPayBtn.textContent = consultPayBtn.dataset.defaultText || `1\u5bf91\u54a8\u8be2\u4e13\u7528\u652f\u4ed8\uff08\u4f18\u60e0\u4ef7\u00a5${CONSULT_PRODUCT.promoFee}\uff09`;
        }
      });
    }

  }
}

// ── 结果页逻辑 ────────────────────────────────────────────────────
const STEM_INDEX_MAP = {
  '\u7532': 0, '\u4e59': 1, '\u4e19': 2, '\u4e01': 3, '\u620a': 4,
  '\u5df1': 5, '\u5e9a': 6, '\u8f9b': 7, '\u58ec': 8, '\u7678': 9,
};
const STEM_ELEMENT_INDEX = {
  '\u7532': 0, '\u4e59': 0, '\u4e19': 1, '\u4e01': 1, '\u620a': 2,
  '\u5df1': 2, '\u5e9a': 3, '\u8f9b': 3, '\u58ec': 4, '\u7678': 4,
};
const BRANCH_ELEMENT_INDEX = {
  '\u5b50': 4, '\u4e11': 2, '\u5bc5': 0, '\u536f': 0, '\u8fb0': 2, '\u5df3': 1,
  '\u5348': 1, '\u672a': 2, '\u7533': 3, '\u9149': 3, '\u620c': 2, '\u4ea5': 4,
};
const HIDDEN_STEMS_MAP = {
  '\u5b50': ['\u7678'],
  '\u4e11': ['\u5df1', '\u7678', '\u8f9b'],
  '\u5bc5': ['\u7532', '\u4e19', '\u620a'],
  '\u536f': ['\u4e59'],
  '\u8fb0': ['\u620a', '\u4e59', '\u7678'],
  '\u5df3': ['\u4e19', '\u620a', '\u5e9a'],
  '\u5348': ['\u4e01', '\u5df1'],
  '\u672a': ['\u5df1', '\u4e01', '\u4e59'],
  '\u7533': ['\u5e9a', '\u58ec', '\u620a'],
  '\u9149': ['\u8f9b'],
  '\u620c': ['\u620a', '\u8f9b', '\u4e01'],
  '\u4ea5': ['\u58ec', '\u7532'],
};
const ELEMENT_LABELS = ['\u6728', '\u706b', '\u571f', '\u91d1', '\u6c34'];
const ELEMENT_CLASSES = ['wx-wood', 'wx-fire', 'wx-earth', 'wx-metal', 'wx-water'];
const TEN_GOD_SAME = ['\u6bd4\u80a9', '\u98df\u795e', '\u504f\u8d22', '\u4e03\u6740', '\u504f\u5370'];
const TEN_GOD_DIFF = ['\u52ab\u8d22', '\u4f24\u5b98', '\u6b63\u8d22', '\u6b63\u5b98', '\u6b63\u5370'];
const GRID_PILLARS = [
  { key: 'year', label: '\u5e74\u67f1' },
  { key: 'month', label: '\u6708\u67f1' },
  { key: 'day', label: '\u65e5\u67f1' },
  { key: 'hour', label: '\u65f6\u67f1' },
];
const KONG_WANG_BY_XUN = ['\u620c\u4ea5', '\u7533\u9149', '\u5348\u672a', '\u8fb0\u5df3', '\u5bc5\u536f', '\u5b50\u4e11'];
const TIAN_YI_BRANCHES = {
  '\u7532': ['\u4e11', '\u672a'], '\u620a': ['\u4e11', '\u672a'], '\u5e9a': ['\u4e11', '\u672a'],
  '\u4e59': ['\u5b50', '\u7533'], '\u5df1': ['\u5b50', '\u7533'],
  '\u4e19': ['\u4ea5', '\u9149'], '\u4e01': ['\u4ea5', '\u9149'],
  '\u58ec': ['\u536f', '\u5df3'], '\u7678': ['\u536f', '\u5df3'],
  '\u8f9b': ['\u5bc5', '\u5348'],
};
const WEN_CHANG_BRANCH = {
  '\u7532': '\u5df3', '\u4e59': '\u5348', '\u4e19': '\u7533', '\u4e01': '\u9149', '\u620a': '\u7533',
  '\u5df1': '\u9149', '\u5e9a': '\u4ea5', '\u8f9b': '\u5b50', '\u58ec': '\u5bc5', '\u7678': '\u536f',
};
const LU_SHEN_BRANCH = {
  '\u7532': '\u5bc5', '\u4e59': '\u536f', '\u4e19': '\u5df3', '\u4e01': '\u5348', '\u620a': '\u5df3',
  '\u5df1': '\u5348', '\u5e9a': '\u7533', '\u8f9b': '\u9149', '\u58ec': '\u4ea5', '\u7678': '\u5b50',
};
const YANG_REN_BRANCH = {
  '\u7532': '\u536f', '\u4e59': '\u8fb0', '\u4e19': '\u5348', '\u4e01': '\u672a', '\u620a': '\u5348',
  '\u5df1': '\u672a', '\u5e9a': '\u9149', '\u8f9b': '\u620c', '\u58ec': '\u5b50', '\u7678': '\u4e11',
};
const HONG_LUAN_BY_BRANCH = {
  '\u5b50': '\u536f', '\u4e11': '\u5bc5', '\u5bc5': '\u4e11', '\u536f': '\u5b50', '\u8fb0': '\u4ea5', '\u5df3': '\u620c',
  '\u5348': '\u9149', '\u672a': '\u7533', '\u7533': '\u672a', '\u9149': '\u5348', '\u620c': '\u5df3', '\u4ea5': '\u8fb0',
};
const TIAN_XI_BY_BRANCH = {
  '\u5b50': '\u9149', '\u4e11': '\u7533', '\u5bc5': '\u672a', '\u536f': '\u5348', '\u8fb0': '\u5df3', '\u5df3': '\u8fb0',
  '\u5348': '\u536f', '\u672a': '\u5bc5', '\u7533': '\u4e11', '\u9149': '\u5b50', '\u620c': '\u4ea5', '\u4ea5': '\u620c',
};
const GU_CHEN_GUA_SU_GROUPS = [
  { branches: ['\u4ea5', '\u5b50', '\u4e11'], gu: '\u5bc5', gua: '\u620c' },
  { branches: ['\u5bc5', '\u536f', '\u8fb0'], gu: '\u5df3', gua: '\u4e11' },
  { branches: ['\u5df3', '\u5348', '\u672a'], gu: '\u7533', gua: '\u8fb0' },
  { branches: ['\u7533', '\u9149', '\u620c'], gu: '\u4ea5', gua: '\u672a' },
];
const TAI_JI_BRANCHES_BY_STEM = {
  '\u7532': ['\u5b50', '\u5348'], '\u4e59': ['\u5b50', '\u5348'],
  '\u4e19': ['\u536f', '\u9149'], '\u4e01': ['\u536f', '\u9149'],
  '\u620a': ['\u8fb0', '\u620c', '\u4e11', '\u672a'], '\u5df1': ['\u8fb0', '\u620c', '\u4e11', '\u672a'],
  '\u5e9a': ['\u5bc5', '\u4ea5'], '\u8f9b': ['\u5bc5', '\u4ea5'],
  '\u58ec': ['\u5df3', '\u7533'], '\u7678': ['\u5df3', '\u7533'],
};
const TIAN_DE_STEM_BY_MONTH_BRANCH = {
  '\u5bc5': '\u4e01', '\u536f': '\u7533', '\u8fb0': '\u58ec', '\u5df3': '\u8f9b',
  '\u5348': '\u4ea5', '\u672a': '\u7532', '\u7533': '\u7678', '\u9149': '\u5bc5',
  '\u620c': '\u4e19', '\u4ea5': '\u4e59', '\u5b50': '\u5df3', '\u4e11': '\u5e9a',
};
const BRANCH_GROUPS = [
  { branches: ['\u7533', '\u5b50', '\u8fb0'], peach: '\u9149', yima: '\u5bc5', huagai: '\u8fb0', jiangxing: '\u5b50', jiesha: '\u5df3', zhaisha: '\u5348', wangshen: '\u4ea5' },
  { branches: ['\u5bc5', '\u5348', '\u620c'], peach: '\u536f', yima: '\u7533', huagai: '\u620c', jiangxing: '\u5348', jiesha: '\u4ea5', zhaisha: '\u5b50', wangshen: '\u5df3' },
  { branches: ['\u4ea5', '\u536f', '\u672a'], peach: '\u5b50', yima: '\u5df3', huagai: '\u672a', jiangxing: '\u536f', jiesha: '\u7533', zhaisha: '\u9149', wangshen: '\u5bc5' },
  { branches: ['\u5df3', '\u9149', '\u4e11'], peach: '\u5348', yima: '\u4ea5', huagai: '\u4e11', jiangxing: '\u9149', jiesha: '\u5bc5', zhaisha: '\u536f', wangshen: '\u7533' },
];

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTenGod(dayStem, otherStem) {
  const dayElement = STEM_ELEMENT_INDEX[dayStem];
  const otherElement = STEM_ELEMENT_INDEX[otherStem];
  const dayIdx = STEM_INDEX_MAP[dayStem];
  const otherIdx = STEM_INDEX_MAP[otherStem];
  if (dayElement === undefined || otherElement === undefined || dayIdx === undefined || otherIdx === undefined) {
    return '--';
  }

  let relationIdx = 0;
  if (otherElement === dayElement) relationIdx = 0;
  else if (otherElement === (dayElement + 1) % 5) relationIdx = 1;
  else if (otherElement === (dayElement + 2) % 5) relationIdx = 2;
  else if (otherElement === (dayElement + 3) % 5) relationIdx = 3;
  else relationIdx = 4;

  const samePolarity = (dayIdx % 2) === (otherIdx % 2);
  return samePolarity ? TEN_GOD_SAME[relationIdx] : TEN_GOD_DIFF[relationIdx];
}

function renderColorToken(char, classSuffix = '') {
  const elementIdx = STEM_ELEMENT_INDEX[char] !== undefined
    ? STEM_ELEMENT_INDEX[char]
    : BRANCH_ELEMENT_INDEX[char];
  const cls = elementIdx !== undefined ? ELEMENT_CLASSES[elementIdx] : '';
  return `<span class="bzg-token ${classSuffix} ${cls}">${escapeHtml(char)}</span>`;
}

function renderStackLines(items, mapFn) {
  if (!items || !items.length) return '--';
  return `<div class="bzg-stack">${items.map((item) => `<span>${mapFn(item)}</span>`).join('')}</div>`;
}

function getSexagenaryIndex(tg, dz) {
  const tgIdx = STEM_INDEX_MAP[tg];
  const dzIdx = (window.BaziCalc?.DIZHI || []).indexOf(dz);
  if (tgIdx === undefined || dzIdx < 0) return -1;
  for (let i = 0; i < 60; i++) {
    if (i % 10 === tgIdx && i % 12 === dzIdx) return i;
  }
  return -1;
}

function getKongWangByPillar(pillar) {
  const idx = getSexagenaryIndex(pillar.tg, pillar.dz);
  if (idx < 0) return '--';
  return KONG_WANG_BY_XUN[Math.floor(idx / 10)] || '--';
}

function resolveBranchGroup(branch) {
  return BRANCH_GROUPS.find((group) => group.branches.includes(branch)) || null;
}

function resolveGuChenGroup(branch) {
  return GU_CHEN_GUA_SU_GROUPS.find((group) => group.branches.includes(branch)) || null;
}

function getYueDeStemByMonthBranch(monthBranch) {
  const group = resolveBranchGroup(monthBranch);
  if (!group) return '';
  if (group.branches.includes('\u5bc5')) return '\u4e19';
  if (group.branches.includes('\u7533')) return '\u58ec';
  if (group.branches.includes('\u4ea5')) return '\u7532';
  return '\u5e9a';
}

function pushMark(marks, name, source) {
  marks.push(`${name}(${source})`);
}

function collectShenShaForPillar(targetPillar, ctx) {
  const marks = [];
  const targetBranch = targetPillar.dz;
  const targetStem = targetPillar.tg;

  ctx.refs.forEach((ref) => {
    const tianYi = TIAN_YI_BRANCHES[ref.stem] || [];
    if (tianYi.includes(targetBranch)) pushMark(marks, '\u5929\u4e59\u8d35\u4eba', ref.label);

    if (WEN_CHANG_BRANCH[ref.stem] === targetBranch) pushMark(marks, '\u6587\u660c\u8d35\u4eba', ref.label);
    if (LU_SHEN_BRANCH[ref.stem] === targetBranch) pushMark(marks, '\u7984\u795e', ref.label);
    if (YANG_REN_BRANCH[ref.stem] === targetBranch) pushMark(marks, '\u7f8a\u5203', ref.label);

    const taiJiBranches = TAI_JI_BRANCHES_BY_STEM[ref.stem] || [];
    if (taiJiBranches.includes(targetBranch)) pushMark(marks, '\u592a\u6781\u8d35\u4eba', ref.label);

    const group = resolveBranchGroup(ref.branch);
    if (group) {
      if (group.peach === targetBranch) pushMark(marks, '\u6843\u82b1', ref.label);
      if (group.yima === targetBranch) pushMark(marks, '\u9a7f\u9a6c', ref.label);
      if (group.huagai === targetBranch) pushMark(marks, '\u534e\u76d6', ref.label);
      if (group.jiangxing === targetBranch) pushMark(marks, '\u5c06\u661f', ref.label);
      if (group.jiesha === targetBranch) pushMark(marks, '\u52ab\u715e', ref.label);
      if (group.zhaisha === targetBranch) pushMark(marks, '\u707e\u715e', ref.label);
      if (group.wangshen === targetBranch) pushMark(marks, '\u4ea1\u795e', ref.label);
    }
  });

  if (HONG_LUAN_BY_BRANCH[ctx.yearBranch] === targetBranch) pushMark(marks, '\u7ea2\u9e3e', '\u5e74\u652f');
  if (TIAN_XI_BY_BRANCH[ctx.yearBranch] === targetBranch) pushMark(marks, '\u5929\u559c', '\u5e74\u652f');

  const guChenGroup = resolveGuChenGroup(ctx.yearBranch);
  if (guChenGroup) {
    if (guChenGroup.gu === targetBranch) pushMark(marks, '\u5b64\u8fb0', '\u5e74\u652f');
    if (guChenGroup.gua === targetBranch) pushMark(marks, '\u5be1\u5bbf', '\u5e74\u652f');
  }

  const tianDeStem = TIAN_DE_STEM_BY_MONTH_BRANCH[ctx.monthBranch];
  const yueDeStem = getYueDeStemByMonthBranch(ctx.monthBranch);
  if (tianDeStem && tianDeStem === targetStem) pushMark(marks, '\u5929\u5fb7\u8d35\u4eba', '\u6708\u4ee4');
  if (yueDeStem && yueDeStem === targetStem) pushMark(marks, '\u6708\u5fb7\u8d35\u4eba', '\u6708\u4ee4');

  return marks;
}

function getShenShaList(targetPillar, ctx) {
  const all = [];
  collectShenShaForPillar(targetPillar, ctx).forEach((name) => {
    if (!all.includes(name)) all.push(name);
  });
  return all;
}

// \u2500\u2500 \u7eb3\u97f3 / \u5341\u4e8c\u957f\u751f(\u661f\u8fd0) / \u80ce\u5143\u547d\u5bab\u8eab\u5bab \u2014\u2014 \u516c\u57df\u547d\u7406\u7b97\u6cd5 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const NAYIN_PAIRS = ['\u6d77\u4e2d\u91d1','\u7089\u4e2d\u706b','\u5927\u6797\u6728','\u8def\u65c1\u571f','\u5251\u950b\u91d1','\u5c71\u5934\u706b','\u6da7\u4e0b\u6c34','\u57ce\u5934\u571f','\u767d\u8721\u91d1','\u6768\u67f3\u6728','\u6cc9\u4e2d\u6c34','\u5c4b\u4e0a\u571f','\u9739\u96f3\u706b','\u677e\u67cf\u6728','\u957f\u6d41\u6c34','\u7802\u4e2d\u91d1','\u5c71\u4e0b\u706b','\u5e73\u5730\u6728','\u58c1\u4e0a\u571f','\u91d1\u7b94\u91d1','\u8986\u706f\u706b','\u5929\u6cb3\u6c34','\u5927\u9a7f\u571f','\u91f5\u948f\u91d1','\u6851\u67d8\u6728','\u5927\u6eaa\u6c34','\u6c99\u4e2d\u571f','\u5929\u4e0a\u706b','\u77f3\u69b4\u6728','\u5927\u6d77\u6c34'];
function getNaYin(tg, dz) {
  const idx = getSexagenaryIndex(tg, dz);
  return idx < 0 ? '--' : (NAYIN_PAIRS[Math.floor(idx / 2)] || '--');
}

const CHANGSHENG_START_BRANCH = { '\u7532':'\u4ea5','\u4e59':'\u5348','\u4e19':'\u5bc5','\u4e01':'\u9149','\u620a':'\u5bc5','\u5df1':'\u9149','\u5e9a':'\u5df3','\u8f9b':'\u5b50','\u58ec':'\u7533','\u7678':'\u536f' };
const CHANGSHENG_STATES = ['\u957f\u751f','\u6c90\u6d74','\u51a0\u5e26','\u4e34\u5b98','\u5e1d\u65fa','\u8870','\u75c5','\u6b7b','\u5893','\u7edd','\u80ce','\u517b'];
const YANG_STEMS_SET = ['\u7532','\u4e19','\u620a','\u5e9a','\u58ec'];
function getChangSheng(tg, dz) {
  const DZ = (window.BaziCalc && window.BaziCalc.DIZHI) || [];
  const start = DZ.indexOf(CHANGSHENG_START_BRANCH[tg]);
  const cur = DZ.indexOf(dz);
  if (start < 0 || cur < 0) return '--';
  const fwd = YANG_STEMS_SET.includes(tg);
  const steps = fwd ? ((cur - start) + 12) % 12 : ((start - cur) + 12) % 12;
  return CHANGSHENG_STATES[steps];
}

function buildShenShaCtx(bazi) {
  return {
    refs: [
      { stem: bazi.day.tg, branch: bazi.day.dz, label: '\u65e5' },
      { stem: bazi.year.tg, branch: bazi.year.dz, label: '\u5e74' },
    ],
    yearBranch: bazi.year.dz,
    monthBranch: bazi.month.dz,
  };
}

function getTaiYuan(bazi) {
  const TG = (window.BaziCalc && window.BaziCalc.TIANGAN) || [];
  const DZ = (window.BaziCalc && window.BaziCalc.DIZHI) || [];
  const mTg = STEM_INDEX_MAP[bazi.month.tg];
  const mDz = DZ.indexOf(bazi.month.dz);
  if (mTg === undefined || mDz < 0) return '--';
  return TG[(mTg + 1) % 10] + DZ[(mDz + 3) % 12];
}

function yinMonthStemIdx(yearTg) {
  const y = STEM_INDEX_MAP[yearTg];
  return y === undefined ? 2 : ((y % 5) * 2 + 2) % 10; // \u4e94\u864e\u9041: \u5e74\u5e72\u2192\u5bc5\u6708\u5929\u5e72
}
function gongByOrd(bazi, ord) {
  const TG = (window.BaziCalc && window.BaziCalc.TIANGAN) || [];
  const DZ = (window.BaziCalc && window.BaziCalc.DIZHI) || [];
  const yinIdx = DZ.indexOf('\u5bc5');
  const dz = DZ[(yinIdx + (ord - 1)) % 12];
  const tg = TG[(yinMonthStemIdx(bazi.year.tg) + (ord - 1)) % 10];
  return tg + dz;
}
function getMingGong(bazi) {
  const DZ = (window.BaziCalc && window.BaziCalc.DIZHI) || [];
  const yinIdx = DZ.indexOf('\u5bc5');
  const mOrd = ((DZ.indexOf(bazi.month.dz) - yinIdx) + 12) % 12 + 1;
  const hOrd = ((DZ.indexOf(bazi.hour.dz) - yinIdx) + 12) % 12 + 1;
  const sum = mOrd + hOrd;
  const g = sum <= 14 ? (14 - sum) : (26 - sum);
  return gongByOrd(bazi, g === 0 ? 12 : g);
}
function getShenGong(bazi) {
  const DZ = (window.BaziCalc && window.BaziCalc.DIZHI) || [];
  const yinIdx = DZ.indexOf('\u5bc5');
  const mOrd = ((DZ.indexOf(bazi.month.dz) - yinIdx) + 12) % 12 + 1;
  const hOrd = ((DZ.indexOf(bazi.hour.dz) - yinIdx) + 12) % 12 + 1;
  let s = (mOrd + hOrd) % 12; if (s === 0) s = 12;
  return gongByOrd(bazi, s);
}

function renderBaziDetailGrid(bazi) {
  const titleEl = document.getElementById('bazi-detail-title');
  if (titleEl) titleEl.textContent = '\u547d\u5c40\u7ec6\u76d8\uff08\u8868\u683c\u7248\uff09';

  const gridEl = document.getElementById('bazi-detail-grid');
  if (!gridEl || !bazi) return;

  const columns = GRID_PILLARS.map((item) => bazi[item.key]);
  const dayStem = bazi.day.tg;
  const hiddenStemsColumns = columns.map((pillar) => HIDDEN_STEMS_MAP[pillar.dz] || []);
  const shenShaCtx = buildShenShaCtx(bazi);

  const rows = [
    {
      label: '\u4e3b\u661f',
      cells: columns.map((pillar, idx) => idx === 2 ? '\u65e5\u4e3b' : getTenGod(dayStem, pillar.tg)),
    },
    {
      label: '\u5929\u5e72',
      cells: columns.map((pillar) => renderColorToken(pillar.tg)),
    },
    {
      label: '\u5730\u652f',
      cells: columns.map((pillar) => renderColorToken(pillar.dz, 'bzg-branch')),
    },
    {
      label: '\u85cf\u5e72',
      cells: hiddenStemsColumns.map((stems) => renderStackLines(stems, (s) => renderColorToken(s, 'bzg-sub'))),
    },
    {
      label: '\u526f\u661f',
      cells: hiddenStemsColumns.map((stems, idx) =>
        renderStackLines(stems, (s) => {
          const tg = idx === 2 && s === dayStem ? '\u6bd4\u80a9' : getTenGod(dayStem, s);
          return `<span class="bzg-sub-label">${escapeHtml(tg)}</span>`;
        })
      ),
    },
    {
      label: '\u4e94\u884c',
      cells: columns.map((pillar) => {
        const tgWx = ELEMENT_LABELS[STEM_ELEMENT_INDEX[pillar.tg]] || '--';
        const dzWx = ELEMENT_LABELS[BRANCH_ELEMENT_INDEX[pillar.dz]] || '--';
        return `${tgWx} / ${dzWx}`;
      }),
    },
    {
      label: '\u661f\u8fd0',  // \u5404\u67f1\u5929\u5e72\u5728\u672c\u67f1\u5730\u652f\u7684\u5341\u4e8c\u957f\u751f
      cells: columns.map((pillar) => getChangSheng(pillar.tg, pillar.dz)),
    },
    {
      label: '\u81ea\u5750',  // \u65e5\u4e3b\u5728\u5404\u67f1\u5730\u652f\u7684\u5341\u4e8c\u957f\u751f
      cells: columns.map((pillar) => getChangSheng(dayStem, pillar.dz)),
    },
    {
      label: '\u7eb3\u97f3',
      cells: columns.map((pillar) => getNaYin(pillar.tg, pillar.dz)),
    },
    {
      label: '\u7a7a\u4ea1',
      cells: columns.map((pillar) => getKongWangByPillar(pillar)),
    },
    {
      label: '\u795e\u715e',
      cells: columns.map((pillar) => {
        const list = getShenShaList(pillar, shenShaCtx);
        return list.length
          ? renderStackLines(list, (s) => `<span class="bzg-shensha">${escapeHtml(s)}</span>`)
          : '\u2014';
      }),
    },
  ];

  let html = '<table class="bzg-table"><thead><tr><th>\u9879\u76ee</th>';
  GRID_PILLARS.forEach((item) => {
    html += `<th>${escapeHtml(item.label)}</th>`;
  });
  html += '</tr></thead><tbody>';

  rows.forEach((row) => {
    html += `<tr><th>${escapeHtml(row.label)}</th>`;
    row.cells.forEach((cell) => {
      html += `<td>${cell}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  html += `<div style="margin-top:14px;padding-top:12px;border-top:1px solid #e8edf3;font-size:13px;color:#475569;line-height:1.9;">`
    + `胎元 <b style="color:#0A2540;">${escapeHtml(getTaiYuan(bazi))}</b>`
    + `　·　命宫 <b style="color:#0A2540;">${escapeHtml(getMingGong(bazi))}</b>`
    + `　·　身宫 <b style="color:#0A2540;">${escapeHtml(getShenGong(bazi))}</b>`
    + `</div>`;
  gridEl.innerHTML = html;
}


(async () => {
  if (document.getElementById('bazi-table-section')) {
  const p          = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
  const consultModeByQuery = p.get('consult') === '1' || hashParams.get('consult') === '1';
  let year, month, day, hour, inputHour, gender, birthplace, lon;
  if (consultModeByQuery) {
    setPendingPaymentOptionId(CONSULT_PRODUCT.id);
  }

  const applyBirthInput = (birth) => {
    if (!birth || typeof birth !== 'object') return false;
    year = Number(birth.year);
    month = Number(birth.month);
    day = Number(birth.day);
    hour = Number(birth.hour);
    inputHour = Number.isFinite(Number(birth.inputHour)) ? Number(birth.inputHour) : Number(birth.hour);
    gender = birth.gender;
    birthplace = birth.birthplace || '';
    lon = birth.lon || '';
    const optionId = birth?.payment_option?.id;
    if (optionId) setPendingPaymentOptionId(optionId);
    return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) && Number.isFinite(hour) && !!gender;
  };

  // 优先从 trade_no 恢复订单
  const urlTradeNo = p.get('trade_no')
    || p.get('trade_order_id')
    || hashParams.get('trade_no')
    || hashParams.get('trade_order_id');
  // 免费排盘(URL 直接带生辰且非付费回调)不继承浏览器里残留的旧待支付订单号，
  // 否则会被误判为"未支付订单"而挡掉免费解读的自动生成。
  const isFreshFreeReading = !!p.get('year') && p.get('paid') !== 'true';
  const tradeNo = urlTradeNo || (isFreshFreeReading ? '' : getPendingTradeNo());
  if (tradeNo) setPendingTradeNo(tradeNo);
  if (tradeNo && !p.get('year')) {
    // 从 orders 表拉取 birth_input（多次重试）
    let order = null;
    for (let i = 0; i < 6; i++) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?trade_no=eq.${encodeURIComponent(tradeNo)}&select=birth_input`,
          { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }}
        );
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows[0]) {
            order = rows[0];
            break;
          }
        }
      } catch (err) {
        console.warn('restore birth_input failed:', err);
      }
      if (i < 5) await new Promise((r) => setTimeout(r, 800));
    }

    let restored = false;
    if (order && order.birth_input) {
      try {
        const rawBirth = typeof order.birth_input === 'string' ? JSON.parse(order.birth_input) : order.birth_input;
        restored = applyBirthInput(rawBirth);
      } catch (err) {
        console.warn('parse birth_input failed:', err);
      }
    }

    // 表查不到时，使用本地支付快照兜底（微信内页面关闭后最关键）
    if (!restored) {
      const pendingBirth = getPendingBirthInput(tradeNo);
      if (pendingBirth) {
        restored = applyBirthInput(pendingBirth);
      }
    }
  } else {
    // URL 直接带参
    year       = parseInt(p.get('year'));
    month      = parseInt(p.get('month'));
    day        = parseInt(p.get('day'));
    hour       = parseInt(p.get('hour'));
    inputHour  = parseInt(p.get('inputHour'));
    gender     = p.get('gender');
    birthplace = p.get('birthplace') || '';
    lon        = p.get('lon') || '';
  }

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hour) || !gender) {
    const locked = document.getElementById('analysis-locked');
    const payPrompt = document.getElementById('pay-prompt');
    const content = document.getElementById('analysis-content');
    const loading = document.getElementById('analysis-loading');
    if (locked) locked.style.display = 'none';
    if (payPrompt) payPrompt.style.display = 'none';
    if (content) content.style.display = 'none';
    if (loading) {
      loading.style.display = 'block';
      if (tradeNo) {
        loading.innerHTML = `
          <p class="price-desc">未能自动恢复该订单的出生信息，请返回首页点击“继续上次订单”。</p>
          <p style="margin-top:8px;color:#6B7280;font-size:13px;">订单号：${tradeNo}</p>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            <a href="index.html" style="display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none;font-size:13px;">返回首页继续订单</a>
            <a href="${buildOrderRecoveryUrl(tradeNo)}" style="display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:8px;background:#0b1f44;color:#fff;text-decoration:none;font-size:13px;">打开订单找回中心</a>
            <button id="retry-restore-btn" type="button" style="padding:8px 12px;border:1px solid #93c5fd;border-radius:8px;background:#fff;color:#1E3A8A;font-size:13px;cursor:pointer;">重试恢复</button>
          </div>
        `;
        const retryBtn = document.getElementById('retry-restore-btn');
        if (retryBtn) retryBtn.addEventListener('click', () => location.reload());
      } else {
        loading.innerHTML = '<p class="price-desc">参数不完整，请返回首页重新排盘。</p>';
      }
    }
    return;
  }

  const hourLabels = {23:'子',1:'丑',3:'寅',5:'卯',7:'辰',9:'巳',11:'午',13:'未',15:'申',17:'酉',19:'戌',21:'亥'};
  const birthInfo = document.getElementById('birth-info');
  if (birthInfo) {
    let info = `${year}年${month}月${day}日 ${hourLabels[inputHour] || inputHour + '时'}　${gender}`;
    if (birthplace) info += `　${birthplace}`;
    if (lon) {
      const adjusted = hour !== inputHour ? `（真太阳时校正 → ${hourLabels[hour] || hour + '时'}）` : '';
      info += `　经度${parseFloat(lon).toFixed(1)}°${adjusted}`;
    }
    birthInfo.textContent = info;
  }

  // 计算八字
  const bazi = BaziCalc.calculateBazi(year, month, day, hour);

  // 渲染四柱
  document.getElementById('year-tg').textContent  = bazi.year.tg;
  document.getElementById('year-dz').textContent  = bazi.year.dz;
  document.getElementById('month-tg').textContent = bazi.month.tg;
  document.getElementById('month-dz').textContent = bazi.month.dz;
  document.getElementById('day-tg').textContent   = bazi.day.tg;
  document.getElementById('day-dz').textContent   = bazi.day.dz;
  document.getElementById('hour-tg').textContent  = bazi.hour.tg;
  document.getElementById('hour-dz').textContent  = bazi.hour.dz;
  renderBaziDetailGrid(bazi);

  // 渲染五行
  const maxCount = Math.max(...Object.values(bazi.wuxing), 1);
  const wuxingContainer = document.getElementById('wuxing-bars');
  ['木','火','土','金','水'].forEach(wx => {
    const count = bazi.wuxing[wx] || 0;
    const pct   = (count / (maxCount * 1.2)) * 100;
    wuxingContainer.innerHTML += `
      <div class="wuxing-row">
        <span class="wuxing-name">${wx}</span>
        <div class="wuxing-bar-bg">
          <div class="wuxing-bar wx-${wx}" style="width:${pct}%"></div>
        </div>
        <span class="wuxing-count">${count}</span>
      </div>`;
  });

  // 渲染命局干支关系
  renderPillarRelations(bazi);

  // 计算大运和特殊流年
  const daYunData  = BaziCalc.calculateDaYun(bazi.year, bazi.month, gender, year, month, day);
  const currentYear = new Date().getFullYear();
  // 从起运年到最后一步大运结束（覆盖全生命周期）
  const lastDayun  = daYunData.dayuns[daYunData.dayuns.length - 1];
  const lifeEndYear = year + lastDayun.ageStart + 10;
  const lifeStartYear = year + daYunData.startAge;
  const specialYears = BaziCalc.calcSpecialYears(bazi, daYunData.dayuns, year, lifeStartYear, lifeEndYear);

  // 渲染大运表格
  renderDaYun(daYunData, currentYear, year);

  // 渲染特殊年份
  renderSpecialYears(specialYears, currentYear);

  // 检查是否为付费模式
  const paidFlag = p.get('paid') === 'true';
  const isPaidMode = paidFlag && Boolean(tradeNo || getPendingTradeNo());

  // 检查 localStorage 缓存（先查完整版，再查免费版）
  const cacheKey     = `bazi_${year}_${month}_${day}_${hour}_${gender}`;
  const fullCacheKey = `bazi_full_${year}_${month}_${day}_${hour}_${gender}`;
  const cachedFull   = localStorage.getItem(fullCacheKey);
  const cached       = localStorage.getItem(cacheKey);

  // 仅在付费模式/支付回调时优先显示完整版缓存，避免免费模式误读为付费完整版
  if ((isPaidMode || tradeNo) && cachedFull) {
    clearPendingTradeNo();
    clearPendingPaymentOptionId();
    showAnalysis(cachedFull, true);
    return;
  } else if (cached && !tradeNo) {
    // 如果有免费版缓存且不是支付回调，显示免费版
    showAnalysis(cached);
  } else if (!isPaidMode && !tradeNo) {
    // 非付费模式且不是支付回调：自动触发分析（免费模式）
    autoAnalyze({ year, month, day, hour, gender, birthplace }, bazi, daYunData, specialYears);
  } else if (isPaidMode) {
    // 付费模式：显示付费提示
    const locked = document.getElementById('analysis-locked');
    if (locked) locked.style.display = 'block';
  }

  // 付款按钮（跳转虎皮椒支付）
  const payBtn = document.getElementById('pay-btn');
  if (payBtn) {
    if (!payBtn.dataset.defaultText) {
      payBtn.dataset.defaultText = payBtn.textContent.trim();
    }
    payBtn.addEventListener('click', async () => {
      const selectedOption = await pickPaymentOption();
      if (!selectedOption) return;
      payBtn.disabled = true;
      payBtn.textContent = '正在跳转...';
      startPayment({ year, month, day, hour, gender, birthplace }, bazi, selectedOption);
    });
  }

  // 海外 PayPal 支付按钮（USD）
  const ppPayBtn = document.getElementById('paypal-pay-btn');
  if (ppPayBtn) {
    ppPayBtn.addEventListener('click', async () => {
      const selectedOption = await pickPaymentOption();
      if (!selectedOption) return;
      ppPayBtn.disabled = true;
      ppPayBtn.textContent = 'Redirecting to PayPal…';
      startPayment({ year, month, day, hour, gender, birthplace }, bazi, selectedOption, 'paypal');
    });
  }

  // 检查 URL 中是否有回调参数（支付成功后跳回）
  if (tradeNo) {
    const analysisLocked = document.getElementById('analysis-locked');
    const payPrompt = document.getElementById('pay-prompt');
    const analysisContent = document.getElementById('analysis-content');
    const analysisLoading = document.getElementById('analysis-loading');
    if (analysisLocked) analysisLocked.style.display = 'none';
    if (payPrompt) payPrompt.style.display = 'none';
    if (analysisContent) analysisContent.style.display = 'none';
    if (analysisLoading) analysisLoading.style.display = 'block';

    // PayPal 返回：先捕获付款再走后续解锁
    try {
      const _q = new URLSearchParams(location.search);
      if (_q.get('pp') === '1' && _q.get('token')) {
        if (analysisLoading) analysisLoading.innerHTML = '<p class="price-desc">正在确认 PayPal 付款，请稍候…</p>';
        await fetch(`${SUPABASE_URL}/functions/v1/paypal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON}` },
          body: JSON.stringify({ action: 'capture', paypal_order_id: _q.get('token'), trade_no: tradeNo }),
        });
      }
    } catch (ppErr) { console.warn('paypal capture on return failed:', ppErr); }

    let orderSnapshot = null;
    let snapshotOptionId = '';
    let reconcilePaidFromUnpaidCheck = false;
    try {
      const snapRes = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?trade_no=eq.${encodeURIComponent(tradeNo)}&select=paid,analysis,birth_input&limit=1`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } },
      );
      if (snapRes.ok) {
        const snapRows = await snapRes.json();
        orderSnapshot = Array.isArray(snapRows) ? (snapRows[0] || null) : null;
        const snapBirth = parseBirthInputSafe(orderSnapshot?.birth_input);
        const snapOptionId = snapBirth?.payment_option?.id;
        if (snapOptionId) {
          setPendingPaymentOptionId(snapOptionId);
          snapshotOptionId = String(snapOptionId || '').trim().toLowerCase();
        }
      }
    } catch (snapErr) {
      console.warn('result order snapshot failed:', snapErr);
    }
    if (!snapshotOptionId) {
      snapshotOptionId = String(getPendingPaymentOptionId() || '').trim().toLowerCase();
    }

    if (orderSnapshot && !orderSnapshot.paid && !orderSnapshot.analysis) {
      const reconcileData = await reconcilePaymentStatus(tradeNo, { quiet: true });
      const reconcilePaid = Boolean(reconcileData?.paid) || String(reconcileData?.status || '').toUpperCase() === 'OD';
      reconcilePaidFromUnpaidCheck = reconcilePaid;
      if (!reconcilePaid) {
        if (analysisLoading) {
          analysisLoading.innerHTML = `
            <div style="border:1px solid #fecaca;background:#fff7ed;border-radius:12px;padding:12px;">
              <div style="font-size:15px;font-weight:700;color:#9a3412;">${tUi('progressUnpaidTitle')}</div>
              <p style="margin-top:8px;font-size:13px;color:#7c2d12;line-height:1.7;">${tUi('progressUnpaidDesc')}</p>
              <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                <a href="${buildOrderRecoveryUrl(tradeNo)}" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;">${tUi('progressUnpaidPay')}</a>
                <button id="unpaid-refresh-btn" type="button" style="padding:10px 14px;background:#fff;color:#1e3a8a;border:1px solid #93c5fd;border-radius:8px;cursor:pointer;font-size:13px;">${tUi('progressUnpaidReload')}</button>
              </div>
              <p style="margin-top:8px;font-size:12px;color:#9a3412;">${tUi('progressUnpaidNoHang')}</p>
            </div>
          `;
          const unpaidRefreshBtn = document.getElementById('unpaid-refresh-btn');
          if (unpaidRefreshBtn) {
            unpaidRefreshBtn.addEventListener('click', () => location.reload());
          }
        }
        return;
      }
    }

    if (isConsultOptionId(snapshotOptionId) && (orderSnapshot?.paid || reconcilePaidFromUnpaidCheck)) {
      renderConsultPaidSuccess(tradeNo);
      return;
    }

    if (analysisLoading) {
      analysisLoading.innerHTML = '<p class="price-desc">\u652f\u4ed8\u6210\u529f\uff0c\u6b63\u5728\u751f\u6210\u6df1\u5ea6\u547d\u7406\u62a5\u544a\uff0c\u8bf7\u7a0d\u5019\u2026</p>' + PAID_ONE_TIME_NOTICE_HTML;
    }

    pollForAnalysis(
      tradeNo,
      cacheKey,
      { year, month, day, hour, gender, birthplace },
      bazi,
      daYunData,
      specialYears
    );
  }
  }
})();
// ── 支付 ──────────────────────────────────────────────────────────
async function startPayment(birthData, bazi, paymentOption, gateway = 'hupijiao') {
  const chosenOption = paymentOption || DEFAULT_PAYMENT_OPTION;
  const orderService = isConsultOptionId(chosenOption?.id) ? 'consult' : 'bazi';
  const inviteCode = setInviteCode(chosenOption?.invite_code || getInviteCode() || '');
  console.log('开始支付流程...', birthData, bazi, chosenOption);

  const resetPayButtons = () => {
    const ids = ['pay-btn', 'paid-btn', 'consult-pay-btn'];
    ids.forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = false;
      btn.textContent = btn.dataset.defaultText || '立即解锁完整分析报告';
    });
  };

  // 立即显示加载提示
  const payPrompt = document.getElementById('pay-prompt');
  const lockedSection = document.getElementById('analysis-locked');
  const loadingSection = document.getElementById('analysis-loading');
  const contentSection = document.getElementById('analysis-content');
  
  if (payPrompt) payPrompt.style.display = 'none';
  if (lockedSection) lockedSection.style.display = 'none';
  if (contentSection) contentSection.style.display = 'none';
  if (loadingSection) {
    loadingSection.style.display = 'block';
    loadingSection.innerHTML = `<p class="price-desc">正在创建${chosenOption.title}支付订单，请稍候…</p>`;
  }

  const tradeNo = `bazi-${getClientId()}-${Date.now()}`;
  setPendingTradeNo(tradeNo);
  setPendingPaymentOptionId(chosenOption.id);
  setPendingBirthInput(tradeNo, birthData);
  const baziStr = `${bazi.year.tg}${bazi.year.dz}年 ${bazi.month.tg}${bazi.month.dz}月 ${bazi.day.tg}${bazi.day.dz}日 ${bazi.hour.tg}${bazi.hour.dz}时`;

  console.log('订单号:', tradeNo);

  // 计算大运和特殊年份
  const daYunData = BaziCalc.calculateDaYun(bazi.year, bazi.month, birthData.gender, birthData.year, birthData.month, birthData.day);
  const currentYear = new Date().getFullYear();
  const lastDayun = daYunData.dayuns[daYunData.dayuns.length - 1];
  const lifeEndYear = birthData.year + lastDayun.ageStart + 10;
  const lifeStartYear = birthData.year + daYunData.startAge;
  const specialYears = BaziCalc.calcSpecialYears(bazi, daYunData.dayuns, birthData.year, lifeStartYear, lifeEndYear);

  // 格式化大运文本
  const dayunText = daYunData.dayuns.map(d => `${d.gz}（${d.ageStart}岁起，${d.yearStart}年）`).join('、');

  // 格式化特殊年份文本
  let specialYearsText = '';
  if (specialYears && specialYears.length > 0) {
    specialYearsText = specialYears.map(s => {
      const phase = s.year < currentYear ? '已过' : s.year === currentYear ? '今年' : '未来';
      return `${s.year}年${s.gz}（${phase}）：${s.reasons.join('；')}`;
    }).join('\n');
  } else {
    specialYearsText = '一生中无明显天克地冲或岁运并临年份';
  }

  // 更新加载提示
  if (loadingSection) {
    loadingSection.innerHTML = '<p class="price-desc">正在跳转支付页面…</p>';
  }

  const buildOrderBirthInput = (compact = false) => {
    const base = {
      ...birthData,
      bazi_str: baziStr,
      payment_ab_variant: getPaymentAbVariant(),
      start_age: daYunData.startAge,
      order_service: orderService,
      payment_option: chosenOption,
      invite_code: inviteCode || undefined,
      tracking: buildOrderTrackingSeed(orderService, chosenOption.id),
      ...buildKocFieldsForBirthInput(),
    };
    if (compact) return base;
    return {
      ...base,
      dayun_text: dayunText,
      special_years_text: specialYearsText,
    };
  };

  const insertOrderSnapshot = async (compact = false) => {
    const orderPayload = {
      trade_no: tradeNo,
      birth_input: JSON.stringify(buildOrderBirthInput(compact)),
    };
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(orderPayload),
    });
    if (resp.ok) return { ok: true, compact, reused: false };

    const raw = await resp.text().catch(() => '');
    const lower = String(raw || '').toLowerCase();
    const conflict = resp.status === 409 || lower.includes('duplicate key') || lower.includes('orders_trade_no_key');
    if (conflict) {
      const existing = await fetchOrderByTradeNo(tradeNo);
      if (existing && String(existing.trade_no || '') === tradeNo) {
        return { ok: true, compact, reused: true };
      }
    }

    throw new Error(`order_insert_failed_${compact ? 'compact' : 'full'}_${resp.status}:${raw || resp.statusText || 'unknown'}`);
  };

  const ensureOrderSnapshot = async () => {
    let lastErr = null;
    for (let i = 0; i < 3; i++) {
      try {
        await insertOrderSnapshot(false);
        return;
      } catch (err) {
        lastErr = err;
        const msg = String(err instanceof Error ? err.message : err || '').toLowerCase();
        const shouldCompactFallback =
          msg.includes('too_large')
          || msg.includes('row-level security')
          || msg.includes('payload')
          || msg.includes('request entity too large')
          || msg.includes('413');
        if (shouldCompactFallback) {
          await insertOrderSnapshot(true);
          return;
        }
        if (i < 2) await sleep(320 * (i + 1));
      }
    }
    throw lastErr || new Error('order_insert_failed_unknown');
  };

  let orderSnapshotReady = false;
  try {
    await ensureOrderSnapshot();
    orderSnapshotReady = true;
    console.log('\u8ba2\u5355\u5feb\u7167\u521b\u5efa/\u66f4\u65b0\u6210\u529f');
    trackOrderEventOnce(tradeNo, 'order_created', withKocEventMeta({
      service: orderService,
      payment_option_id: chosenOption.id,
    }));
  } catch (err) {
    console.warn('\u8ba2\u5355\u5feb\u7167\u521b\u5efa\u5931\u8d25\uff0c\u6539\u7531\u540e\u7aef\u515c\u5e95\u521b\u5355:', err);
    trackOrderEventOnce(tradeNo, 'order_create_failed_frontend', withKocEventMeta({
      service: orderService,
      payment_option_id: chosenOption.id,
      reason: String(err?.message || err || '').slice(0, 120),
    }));
    if (loadingSection) {
      loadingSection.innerHTML = '<p class="price-desc">\u7f51\u7edc\u6ce2\u52a8\uff0c\u6b63\u5728\u7ee7\u7eed\u751f\u6210\u652f\u4ed8\u94fe\u63a5\uff08\u540e\u7aef\u5c06\u81ea\u52a8\u8865\u5efa\u8ba2\u5355\uff09...</p>';
    }
  }

  // 海外 PayPal 支付：订单行已写入，直接创建 PayPal 订单并跳转
  if (gateway === 'paypal') {
    try {
      const ppRes = await fetch(`${SUPABASE_URL}/functions/v1/paypal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({ action: 'create', trade_no: tradeNo, option_id: chosenOption.id, service: orderService, origin: location.origin }),
      });
      const ppData = await ppRes.json().catch(() => ({}));
      if (ppRes.ok && ppData.approve_url) { window.location.href = ppData.approve_url; return; }
      console.warn('paypal create failed', ppData);
      if (loadingSection) loadingSection.innerHTML = '<p class="price-desc">PayPal 下单失败，请重试或改用其他支付方式。</p>';
    } catch (e) {
      console.error('paypal create error', e);
      if (loadingSection) loadingSection.innerHTML = '<p class="price-desc">PayPal 暂时不可用，请稍后重试。</p>';
    }
    resetPayButtons();
    return;
  }

  console.log('调用后端代理创建支付...');
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isWeChat = isWeChatBrowser();

  // 调用后端代理创建支付
  try {
    const createPaymentPayload = {
      trade_no: tradeNo,
      birth_input: { ...birthData, bazi_str: baziStr, order_service: orderService, payment_option: chosenOption },
      payment_option_id: chosenOption.id,
      payment_option_title: chosenOption.title,
      total_fee: chosenOption.fee,
      invite_code: inviteCode || undefined,
      return_path: '/payment-fallback.html',
      client_env: {
        user_agent: ua,
        is_mobile: isMobile,
        is_wechat: isWeChat,
        payment_ab_variant: getPaymentAbVariant(),
        koc: getKocSnapshot() || null,
      },
    };

    const requestCreatePayment = async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify(createPaymentPayload),
      });
      const raw = await response.text();
      let result = null;
      try {
        result = raw ? JSON.parse(raw) : null;
      } catch {
        result = { raw };
      }
      return { response, result, raw };
    };

    const getPaymentErrorMessage = (result, response, raw = '') => {
      const msg =
        result?.errmsg
        || result?.error
        || result?.message
        || result?.details
        || (typeof result?.msg === 'string' ? result.msg : '')
        || '';
      if (msg) return String(msg);
      if (response && !response.ok) return `HTTP ${response.status}`;
      if (raw) return String(raw).slice(0, 120);
      return '支付网关暂时不可用';
    };

    let { response, result, raw } = await requestCreatePayment();
    const errorText = `${getPaymentErrorMessage(result, response, raw)} ${raw || ''}`.toLowerCase();
    if ((!response.ok || result?.errcode !== 0) && errorText.includes('order not found')) {
      // Order may be eventually consistent; retry after optional snapshot sync.
      try {
        await ensureOrderSnapshot();
      } catch (snapshotErr) {
        console.warn('order not found\uff1a\u8865\u5355\u91cd\u8bd5\u5931\u8d25\uff0c\u6539\u4e3a\u76f4\u63a5\u91cd\u8bd5 create-payment:', snapshotErr);
      }
      await sleep(450);
      ({ response, result, raw } = await requestCreatePayment());
    }

    console.log('支付API返回:', result);

    if (response.ok && result?.errcode === 0) {
      const payUrl = result.url || result.url_qrcode || '';
      const jsapiPayload = normalizeWeChatJsapiPayload(result);
      const discountInfo = result?.discount_info && typeof result.discount_info === 'object' ? result.discount_info : null;
      trackOrderEventOnce(tradeNo, 'payment_created', withKocEventMeta({
        service: orderService,
        payment_option_id: chosenOption.id,
        api_base: result?.gateway_meta?.selected_api_base || '',
        invite_code: discountInfo?.invite_code || inviteCode || '',
        discount_applied: Boolean(discountInfo?.discount_applied),
        total_fee_final: discountInfo?.total_fee_final || '',
      }));
      console.log('支付信息:', {
        payUrl,
        hasJsapiPayload: !!jsapiPayload,
        gateway: result?.gateway_meta || null,
        discount: discountInfo,
      });
      if (loadingSection) {
        const finalAmount = discountInfo?.total_fee_final ? `¥${discountInfo.total_fee_final}` : '';
        const originAmount = discountInfo?.total_fee_original ? `¥${discountInfo.total_fee_original}` : '';
        const discountNotice = discountInfo?.discount_applied
          ? `<p class="price-desc" style="color:#166534;">已应用优惠码 ${discountInfo.invite_code || ''}：${originAmount} → <strong>${finalAmount}</strong></p>`
          : ((discountInfo?.invite_code || inviteCode)
            ? `<p class="price-desc" style="color:#92400e;">优惠码 ${discountInfo?.invite_code || inviteCode} 未命中活动规则，当前按原价支付。</p>`
            : '');
        if (discountNotice) {
          loadingSection.innerHTML = discountNotice + loadingSection.innerHTML;
        }
        renderPaymentDebugInfo(loadingSection, result, jsapiPayload);
      }

      if (isWeChat && jsapiPayload) {
        if (loadingSection) {
          loadingSection.innerHTML = '<p class="price-desc">正在唤起微信支付…</p>';
        }
        try {
          await invokeWeChatJsapiPay(jsapiPayload, tradeNo);
          return;
        } catch (wxErr) {
          console.warn('微信JSAPI支付唤起失败，回退到链接支付:', wxErr);
          if (loadingSection) {
            loadingSection.innerHTML = '<p class="price-desc">微信支付唤起失败，已切换链接支付方式，请继续完成支付…</p>';
          }
          if (payUrl) {
            const debugMount = showMobilePayPanel(payUrl, tradeNo, loadingSection || null);
            renderPaymentDebugInfo(debugMount, result, jsapiPayload);
            return;
          }
          throw wxErr;
        }
      }

      if (!payUrl) {
        throw new Error('payment_url_missing');
      }

      if (isMobile) {
        const debugMount = showMobilePayPanel(payUrl, tradeNo, loadingSection || null);
        renderPaymentDebugInfo(debugMount, result, jsapiPayload);
        return;
      }

      window.location.href = payUrl;
    } else {
      const errMsg = getPaymentErrorMessage(result, response, raw);
      console.error('支付API错误:', errMsg, result);
      if (loadingSection) {
        renderPaymentDebugInfo(loadingSection, result, null);
      }
      alert(`支付请求失败：${errMsg}`);
      clearPendingTradeNo();
      clearPendingPaymentOptionId();
      resetPayButtons();
    }
  } catch (err) {
    console.error('支付请求失败:', err);
    alert('支付请求失败，请稍后重试');
    clearPendingTradeNo();
    clearPendingPaymentOptionId();
    resetPayButtons();
  }
}

// ── 轮询等待分析结果 ──────────────────────────────────────────────
async function pollForAnalysis(tradeNo, cacheKey, birthData, bazi, daYunData, specialYears) {
  const fullCacheKey = cacheKey.replace('bazi_', 'bazi_full_');
  const pollIntervalMs = 800;
  const maxAttempts = 150; // ~120s
  const reconcileIntervalMs = 2500;
  const startedAt = Date.now();
  let lastReconcileTs = 0;
  let paidSeenCount = 0;
  let streamFallbackTriggered = false;
  let resolvedPaymentOptionId = getPendingPaymentOptionId();

  if (birthData && bazi && daYunData && specialYears) {
    window.__lastPaidPollContext = { birthData, bazi, daYunData, specialYears, paymentOptionId: resolvedPaymentOptionId };
  }
  const pollContext = window.__lastPaidPollContext || {};
  const resolvedBirthData = birthData || pollContext.birthData;
  const resolvedBazi = bazi || pollContext.bazi;
  const resolvedDaYunData = daYunData || pollContext.daYunData;
  const resolvedSpecialYears = specialYears || pollContext.specialYears;
  if (!resolvedPaymentOptionId && pollContext.paymentOptionId) {
    resolvedPaymentOptionId = pollContext.paymentOptionId;
  }
  let consultOrderDetected = isConsultOptionId(resolvedPaymentOptionId);

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const renderPaidProgress = (stage = 'waiting_payment', note = '') => {
    const loadingEl = document.getElementById('analysis-loading');
    if (!loadingEl) return;
    loadingEl.style.display = 'block';

    const elapsedSec = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
    const stageMap = {
      waiting_payment: { percent: Math.min(32, 8 + Math.floor(elapsedSec * 0.9)), title: tUi('progressStageWaiting') },
      paid_verified: { percent: Math.min(55, 35 + Math.floor(elapsedSec * 0.4)), title: tUi('progressStagePaidVerified') },
      generating: { percent: Math.min(92, 45 + Math.floor(elapsedSec * 0.8)), title: tUi('progressStageGenerating') },
      network_retry: { percent: Math.min(88, 36 + Math.floor(elapsedSec * 0.5)), title: tUi('progressStageRetry') },
      ready: { percent: 100, title: tUi('progressStageReady') },
    };
    const current = stageMap[stage] || stageMap.waiting_payment;
    const progress = Math.max(5, Math.min(100, current.percent));

    const steps = [
      { label: tUi('progressStepOrder'), done: true, active: false },
      { label: tUi('progressStepVerify'), done: stage !== 'waiting_payment' && stage !== 'network_retry', active: stage === 'waiting_payment' || stage === 'network_retry' },
      { label: tUi('progressStepGenerate'), done: stage === 'ready', active: stage === 'paid_verified' || stage === 'generating' },
      { label: tUi('progressStepShow'), done: stage === 'ready', active: false },
    ];

    const stepHtml = steps.map((item) => {
      const dotColor = item.done ? '#16a34a' : item.active ? '#1d4ed8' : '#94a3b8';
      const textColor = item.done ? '#166534' : item.active ? '#1e3a8a' : '#64748b';
      return `<div style="display:flex;align-items:center;gap:8px;">
        <span style="width:8px;height:8px;border-radius:999px;background:${dotColor};display:inline-block;"></span>
        <span style="font-size:12px;color:${textColor};">${item.label}</span>
      </div>`;
    }).join('');

    loadingEl.innerHTML = `
      <div style="border:1px solid #dbeafe;background:#f8fbff;border-radius:12px;padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div style="font-size:14px;font-weight:700;color:#1e3a8a;">${current.title}</div>
          <div style="font-size:12px;color:#475569;">${tUi('progressElapsed', { sec: elapsedSec })}</div>
        </div>
        <div style="margin-top:8px;height:8px;background:#dbeafe;border-radius:999px;overflow:hidden;">
          <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,#2563eb,#1d4ed8);transition:width .35s ease;"></div>
        </div>
        <div style="display:grid;gap:4px;margin-top:10px;">
          ${stepHtml}
        </div>
        <p style="margin-top:8px;font-size:12px;color:#475569;line-height:1.6;">${escapeHtml(note || tUi('progressDefaultNote'))}</p>
      </div>
    ` + PAID_ONE_TIME_NOTICE_HTML;
  };

  const startDirectGenerate = async (loadingText = tUi('progressDirectDefault')) => {
    if (streamFallbackTriggered) return false;
    if (consultOrderDetected) {
      renderConsultPaidSuccess(tradeNo);
      return true;
    }
    if (!resolvedBirthData || !resolvedBazi || !resolvedDaYunData || !resolvedSpecialYears) return false;
    streamFallbackTriggered = true;
    trackOrderEventOnce(tradeNo, 'payment_verified', { source: 'poll_direct_generate' });
    renderPaidProgress('generating', loadingText);

    await fullAnalyze(resolvedBirthData, resolvedBazi, resolvedDaYunData, resolvedSpecialYears, {
      tradeNo,
      paymentOptionId: resolvedPaymentOptionId,
    });
    return true;
  };

  renderPaidProgress('waiting_payment', tUi('progressInitialWait'));

  try {
    const initialReconcile = await reconcilePaymentStatus(tradeNo, { quiet: true });
    const reconcilePaid = Boolean(initialReconcile?.paid) || String(initialReconcile?.status || '').toUpperCase() === 'OD';
    if (reconcilePaid) {
      renderPaidProgress('paid_verified', tUi('progressInitialPaid'));
      const started = await startDirectGenerate();
      if (started) return;
    }
  } catch {}

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?trade_no=eq.${encodeURIComponent(tradeNo)}&select=paid,analysis,birth_input&_=${Date.now()}`,
        {
          cache: 'no-store',
          headers: {
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${SUPABASE_ANON}`,
            'Cache-Control': 'no-cache',
          },
        },
      );

      const [order] = await res.json();
      const nowTs = Date.now();

      if (
        !streamFallbackTriggered
        && nowTs - lastReconcileTs >= reconcileIntervalMs
        && (!order?.paid || !order?.analysis)
      ) {
        lastReconcileTs = nowTs;
        const reconcileResult = await reconcilePaymentStatus(tradeNo, { quiet: true });
        const reconcilePaid = Boolean(reconcileResult?.paid) || String(reconcileResult?.status || '').toUpperCase() === 'OD';
        if (reconcilePaid) {
          renderPaidProgress('paid_verified', tUi('progressSwitchGenerate'));
          const started = await startDirectGenerate();
          if (started) return;
        }
      }

      if (!resolvedPaymentOptionId && order?.birth_input) {
        try {
          const birth = JSON.parse(order.birth_input);
          resolvedPaymentOptionId = birth?.payment_option?.id || '';
          if (resolvedPaymentOptionId) setPendingPaymentOptionId(resolvedPaymentOptionId);
          consultOrderDetected = isConsultOptionId(resolvedPaymentOptionId);
        } catch {}
      }

      if (consultOrderDetected && order?.paid) {
        renderConsultPaidSuccess(tradeNo);
        return;
      }

      if (order?.paid && order?.analysis) {
        localStorage.setItem(fullCacheKey, order.analysis);
        trackOrderEventOnce(tradeNo, 'payment_verified', { source: 'poll_paid_with_analysis' });
        renderPaidProgress('ready', tUi('progressReadyOpen'));
        clearPendingTradeNo();
        clearPendingPaymentOptionId();
        showAnalysis(order.analysis, true);
        return;
      }

      if (order?.paid && !order?.analysis) {
        paidSeenCount += 1;
        if (!streamFallbackTriggered && paidSeenCount >= 1) {
          renderPaidProgress('paid_verified', tUi('progressPaidStart'));
          const started = await startDirectGenerate(tUi('progressPaidGenerating'));
          if (started) return;
        }
        if (!streamFallbackTriggered) {
          renderPaidProgress('paid_verified', tUi('progressPaidPreparing'));
        } else if (i % 3 === 0) {
          renderPaidProgress('generating', tUi('progressKeepOpen'));
        }
      } else if (!streamFallbackTriggered && i % 3 === 0) {
        renderPaidProgress('waiting_payment', tUi('progressWaitGateway'));
      }
    } catch (err) {
      console.error('poll query failed:', err);
      if (!streamFallbackTriggered && i % 4 === 0) {
        const reconcileResult = await reconcilePaymentStatus(tradeNo, { quiet: true });
        const reconcilePaid = Boolean(reconcileResult?.paid) || String(reconcileResult?.status || '').toUpperCase() === 'OD';
        if (reconcilePaid) {
          renderPaidProgress('paid_verified', tUi('progressRetryPaid'));
          const started = await startDirectGenerate();
          if (started) return;
        }
      }
      if (i % 3 === 0) {
        renderPaidProgress('network_retry', tUi('progressRetryNetwork'));
      }
    }
  }

  const loadingEl = document.getElementById('analysis-loading');
  if (loadingEl) {
    loadingEl.innerHTML = `
      <div style="border:1px solid #dbeafe;background:#f8fbff;border-radius:12px;padding:12px;">
        <div style="font-size:14px;font-weight:700;color:#1e3a8a;">${tUi('progressTimeoutTitle')}</div>
        <p style="margin-top:6px;font-size:13px;color:#475569;line-height:1.7;">${tUi('progressTimeoutDesc')}</p>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="location.reload()" style="padding:10px 14px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;">${tUi('progressTimeoutRefresh')}</button>
          <button onclick="pollForAnalysis('${tradeNo}', '${cacheKey}')" style="padding:10px 14px;background:#475569;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;">${tUi('progressTimeoutWait')}</button>
          <a href="${buildOrderRecoveryUrl(tradeNo)}" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;background:#0b1f44;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;">${tUi('progressTimeoutRecovery')}</a>
        </div>
      </div>
    ` + PAID_ONE_TIME_NOTICE_HTML;
  }
}


function normalizeReportLines(text) {
  if (!text) return '';
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/(^|\n)\s*(?:Section|section)\s*(\d{1,2})\s*[:：]/g, '$1第$2段：')
    .replace(/第([一二三四五六七八九十百零\d]{1,3})段[：:]/g, '\n第$1段：')
    .replace(/^\n+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function togglePaidOneTimeNotice(visible) {
  const content = document.getElementById('analysis-content');
  if (!content) return;

  let notice = document.getElementById('paid-onetime-notice');
  if (!notice && visible) {
    notice = document.createElement('div');
    notice.id = 'paid-onetime-notice';
    notice.style.cssText = 'margin:0 0 14px;padding:10px 12px;border:1px solid #ef4444;border-radius:8px;background:#fff1f2;color:#dc2626;font-size:14px;font-weight:700;line-height:1.6;';
    notice.textContent = ONE_TIME_PAID_NOTICE;
    const analysisText = document.getElementById('analysis-text');
    if (analysisText && analysisText.parentNode === content) {
      content.insertBefore(notice, analysisText);
    } else {
      content.prepend(notice);
    }
  }

  if (notice) notice.style.display = visible ? 'block' : 'none';
}

function getShareCardCopySet() {
  const lang = getUiLang();
  if (lang === 'en') {
    return {
      title: 'Paid Report Ready',
      desc: 'You can copy the full report text or download the full report image.',
      copyBtn: 'Copy Full Report',
      imageBtn: 'Download Full Image',
      copied: 'Full report text copied.',
      copyFail: 'Copy failed. Please copy manually.',
      imageFail: 'Image generation failed. Please try again.',
      footer: 'YUNZI · Bazi Destiny Report',
      saveHint: 'This report is one-time view. Please save screenshot.',
      bulletPrefix: 'Highlights',
      shareSuffix: 'Open site: ',
      fileName: 'yunzi-report-full.png',
    };
  }
  if (lang === 'zh-Hant') {
    return {
      title: '\u4ed8\u8cbb\u5831\u544a\u5df2\u5c31\u7dd2',
      desc: '\u53ef\u8907\u88fd\u5168\u6587\u6216\u4e0b\u8f09\u5168\u6587\u9577\u5716\uff0c\u65b9\u4fbf\u4fdd\u5b58\u8207\u8f49\u767c\u3002',
      copyBtn: '\u8907\u88fd\u5168\u6587',
      imageBtn: '\u4e0b\u8f09\u5168\u6587\u9577\u5716',
      copied: '\u5df2\u8907\u88fd\u5831\u544a\u5168\u6587\u3002',
      copyFail: '\u8907\u88fd\u5931\u6557\uff0c\u8acb\u624b\u52d5\u8907\u88fd\u3002',
      imageFail: '\u751f\u6210\u5716\u7247\u5931\u6557\uff0c\u8acb\u91cd\u8a66\u3002',
      footer: 'YUNZI \u00b7 \u516b\u5b57\u547d\u7406\u5831\u544a',
      saveHint: '\u672c\u5831\u544a\u70ba\u4e00\u6b21\u6027\u670d\u52d9\uff0c\u8acb\u81ea\u884c\u622a\u5716\u4fdd\u5b58\u3002',
      bulletPrefix: '\u95dc\u9375\u8981\u9ede',
      shareSuffix: '\u7ad9\u9ede\uff1a',
      fileName: 'yunzi-report-full.png',
    };
  }
  return {
    title: '\u4ed8\u8d39\u62a5\u544a\u5df2\u5c31\u7eea',
    desc: '\u53ef\u590d\u5236\u5168\u6587\u6216\u4e0b\u8f7d\u5168\u6587\u957f\u56fe\uff0c\u65b9\u4fbf\u4fdd\u5b58\u4e0e\u8f6c\u53d1\u3002',
    copyBtn: '\u590d\u5236\u5168\u6587',
    imageBtn: '\u4e0b\u8f7d\u5168\u6587\u957f\u56fe',
    copied: '\u5df2\u590d\u5236\u62a5\u544a\u5168\u6587\u3002',
    copyFail: '\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236\u3002',
    imageFail: '\u751f\u6210\u56fe\u7247\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002',
    footer: 'YUNZI \u00b7 \u516b\u5b57\u547d\u7406\u62a5\u544a',
    saveHint: '\u672c\u6b21\u62a5\u544a\u4e3a\u4e00\u6b21\u6027\u670d\u52a1\uff0c\u8bf7\u81ea\u884c\u622a\u56fe\u4fdd\u5b58\u3002',
    bulletPrefix: '\u5173\u952e\u8981\u70b9',
    shareSuffix: '\u7f51\u7ad9\uff1a',
    fileName: 'yunzi-report-full.png',
  };
}

function buildReportShareHighlights(rawText) {
  const lines = String(rawText || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('\u4ee5\u4e0a\u5185\u5bb9\u4e3a\u4f20\u7edf\u6587\u5316\u63a8\u6f14'))
    .filter((line) => !line.includes('\u62a5\u544a\u662f\u4e00\u6b21\u6027\u670d\u52a1'));

  const picked = [];
  for (const line of lines) {
    const normalized = line.replace(/^\d+[.)]\s*/, '');
    if (!normalized) continue;
    picked.push(normalized);
    if (picked.length >= 4) break;
  }
  return picked;
}

function buildFullReportText(rawText) {
  const report = normalizeReportLines(rawText || '');
  if (!report) return DISCLAIMER.trim();
  return `${report}${DISCLAIMER}`.trim();
}

function wrapTextLines(ctx, text, maxWidth) {
  const lines = [];
  const paragraphs = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  paragraphs.forEach((paragraph, index) => {
    const content = String(paragraph || '').trim();
    if (!content) {
      lines.push('');
      return;
    }
    let current = '';
    for (const ch of content) {
      const test = current + ch;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    if (index !== paragraphs.length - 1) lines.push('');
  });
  return lines;
}

function renderTextInCanvas(ctx, text, x, y, maxWidth, lineHeight) {
  const content = String(text || '');
  if (!content) return y;
  let line = '';
  for (const ch of content) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function renderWrappedLines(ctx, lines, x, y, lineHeight, paragraphGap = 14) {
  let currentY = y;
  (lines || []).forEach((line) => {
    if (!line) {
      currentY += paragraphGap;
      return;
    }
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  });
  return currentY;
}

function ensurePaidReportShareCard(reportText, tradeNo) {
  const analysisContent = document.getElementById('analysis-content');
  const analysisTextEl = document.getElementById('analysis-text');
  if (!analysisContent || !analysisTextEl) return;

  let card = document.getElementById(REPORT_SHARE_CARD_ID);
  if (!card) {
    card = document.createElement('div');
    card.id = REPORT_SHARE_CARD_ID;
    card.style.cssText = [
      'margin:14px 0 0',
      'padding:12px',
      'border:1px solid #bfdbfe',
      'background:#eff6ff',
      'border-radius:10px',
    ].join(';');
    analysisTextEl.insertAdjacentElement('afterend', card);
  }

  const copySet = getShareCardCopySet();
  const highlights = buildReportShareHighlights(reportText);
  const fullReportText = buildFullReportText(reportText);
  const shareUrl = `${window.location.origin}/index.html`;
  const bulletsHtml = highlights.length
    ? highlights.map((line) => `<li style="margin-top:4px;">${line}</li>`).join('')
    : `<li style="margin-top:4px;">${copySet.saveHint}</li>`;
  const shareText = fullReportText;

  card.innerHTML = `
    <div style="font-size:15px;font-weight:700;color:#1e3a8a;">${copySet.title}</div>
    <div style="margin-top:4px;font-size:13px;color:#334155;line-height:1.6;">${copySet.desc}</div>
    <ul style="margin:8px 0 0 18px;padding:0;font-size:13px;color:#0f172a;line-height:1.7;">
      ${bulletsHtml}
    </ul>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
      <button id="report-share-copy-btn" type="button" style="padding:8px 10px;border:none;border-radius:8px;background:#1d4ed8;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">${copySet.copyBtn}</button>
      <button id="report-share-image-btn" type="button" style="padding:8px 10px;border:1px solid #2563eb;border-radius:8px;background:#fff;color:#1d4ed8;font-size:12px;font-weight:700;cursor:pointer;">${copySet.imageBtn}</button>
    </div>
  `;

  const copyBtn = card.querySelector('#report-share-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        const ok = await copyTextSafe(shareText);
        if (!ok) {
          alert(copySet.copyFail);
          return;
        }
        trackOrderEvent(tradeNo, 'report_share_clicked', withKocEventMeta({ action: 'copy_text' }));
        alert(copySet.copied);
      } catch {
        alert(copySet.copyFail);
      }
    });
  }

  const imageBtn = card.querySelector('#report-share-image-btn');
  if (imageBtn) {
    imageBtn.addEventListener('click', async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas_context_missing');

        const contentX = 70;
        const contentWidth = 940;
        const headerTop = 70;
        const bodyStartY = 280;
        const bodyLineHeight = 36;
        const footerHeight = 140;

        ctx.font = '400 28px "Microsoft YaHei", "PingFang SC", sans-serif';
        const wrappedReportLines = wrapTextLines(ctx, fullReportText, contentWidth);
        const estimatedBodyHeight = wrappedReportLines.reduce((sum, line) => sum + (line ? bodyLineHeight : 14), 0);
        canvas.height = Math.max(1680, Math.ceil(bodyStartY + estimatedBodyHeight + footerHeight));

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0b1f44');
        gradient.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

        const innerGradient = ctx.createLinearGradient(0, 40, 0, 240);
        innerGradient.addColorStop(0, '#0b1f44');
        innerGradient.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = innerGradient;
        ctx.fillRect(40, 40, canvas.width - 80, 220);

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 44px \"Microsoft YaHei\", \"PingFang SC\", sans-serif';
        ctx.fillText('YUNZI', contentX, headerTop + 40);
        ctx.font = '600 32px \"Microsoft YaHei\", \"PingFang SC\", sans-serif';
        ctx.fillText(copySet.title, contentX, headerTop + 100);
        ctx.font = '400 24px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillStyle = '#dbeafe';
        renderTextInCanvas(ctx, copySet.desc, contentX, headerTop + 150, contentWidth, 34);

        ctx.fillStyle = '#0f172a';
        ctx.font = '700 28px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillText(copySet.copyBtn, contentX, bodyStartY - 20);

        ctx.fillStyle = '#111827';
        ctx.font = '400 28px "Microsoft YaHei", "PingFang SC", sans-serif';
        const finalY = renderWrappedLines(ctx, wrappedReportLines, contentX, bodyStartY + 20, bodyLineHeight, 14);

        ctx.fillStyle = '#64748b';
        ctx.font = '400 22px "Microsoft YaHei", "PingFang SC", sans-serif';
        renderTextInCanvas(ctx, `${copySet.shareSuffix}${shareUrl}`, contentX, finalY + 30, contentWidth, 30);
        renderTextInCanvas(ctx, copySet.footer, contentX, canvas.height - 90, contentWidth, 30);

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = copySet.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();

        trackOrderEvent(tradeNo, 'report_share_clicked', withKocEventMeta({ action: 'download_image' }));
      } catch (err) {
        console.warn('report share image failed:', err);
        alert(copySet.imageFail);
      }
    });
  }
}

function showAnalysis(text, hidePay = false) {
  document.getElementById('analysis-locked').style.display  = 'none';
  document.getElementById('analysis-loading').style.display = 'none';
  document.getElementById('analysis-content').style.display = 'block';
  togglePaidOneTimeNotice(Boolean(hidePay));
  document.getElementById('analysis-text').textContent = normalizeReportLines(text) + DISCLAIMER;
  const payPrompt = document.getElementById('pay-prompt');
  if (payPrompt) payPrompt.style.display = hidePay ? 'none' : 'block';
  const shareCard = document.getElementById(REPORT_SHARE_CARD_ID);
  if (!hidePay && shareCard) {
    shareCard.remove();
  }

  if (hidePay) {
    const params = new URLSearchParams(window.location.search || '');
    const tradeNo = params.get('trade_no') || params.get('trade_order_id') || getPendingTradeNo();
    clearPendingTradeNo();
    clearPendingPaymentOptionId();
    try {
      const next = new URL(window.location.href);
      next.searchParams.delete('trade_no');
      next.searchParams.delete('trade_order_id');
      next.searchParams.delete('paid');
      const nextSearch = next.searchParams.toString();
      const cleanUrl = `${next.pathname}${nextSearch ? `?${nextSearch}` : ''}${next.hash || ''}`;
      window.history.replaceState({}, '', cleanUrl);
    } catch {}
    if (tradeNo) {
      clearPaymentPanelState(tradeNo);
      trackOrderEventOnce(tradeNo, 'report_viewed', { page: 'result' });
      ensurePaidReportShareCard(text, tradeNo);
    } else {
      ensurePaidReportShareCard(text, '');
    }
  }

  // Conversion boosters (free mode only)
  if (!hidePay) {
    initConversionBoosters();
  }
}

// ── 转化增强套件 ──────────────────────────────────────────────────
const FREE_DAILY_LIMIT = 3;
const FREE_COUNTER_KEY = 'bazi_free_daily_v1';

function getFreeUsageToday() {
  try {
    const raw = localStorage.getItem(FREE_COUNTER_KEY);
    const data = raw ? JSON.parse(raw) : { date: '', count: 0 };
    const today = new Date().toISOString().slice(0, 10);
    if (data.date !== today) return { date: today, count: 0 };
    return data;
  } catch { return { date: '', count: 0 }; }
}

function incrementFreeUsage() {
  const data = getFreeUsageToday();
  data.count += 1;
  try { localStorage.setItem(FREE_COUNTER_KEY, JSON.stringify(data)); } catch {}
  return data;
}

function showFreeLimitBadge() {
  const usage = incrementFreeUsage();
  const remaining = Math.max(0, FREE_DAILY_LIMIT - usage.count);
  const payPrompt = document.getElementById('pay-prompt');
  if (!payPrompt || payPrompt.style.display === 'none') return;

  const badge = document.createElement('div');
  badge.id = 'free-limit-badge';
  badge.style.cssText = 'text-align:center;margin-bottom:10px;font-size:13px;color:#64748b;';
  if (remaining <= 0) {
    badge.innerHTML = '<span style="color:#dc2626;font-weight:700;">今日免费次数已用完</span> · 解锁完整版不限次数';
  } else {
    badge.innerHTML = `今日剩余免费次数：<strong>${remaining}</strong> · 升级完整版不限次数`;
  }
  payPrompt.insertBefore(badge, payPrompt.firstChild);
}

function initConversionBoosters() {
  showFreeLimitBadge();
  scheduleAutoPaymentModal();
  initExitIntent();
  showActivityToast();
}

// Auto-show payment modal after free analysis (8 seconds)
function scheduleAutoPaymentModal() {
  const tradeNo = new URLSearchParams(window.location.search).get('trade_no');
  if (tradeNo) return; // already in payment flow

  setTimeout(function() {
    const payBtn = document.getElementById('pay-btn');
    if (payBtn && payBtn.offsetParent !== null) {
      payBtn.style.animation = 'pulse 2s ease-in-out 3';
      payBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 8000);
}

// Exit intent: show last-chance discount when mouse leaves page
function initExitIntent() {
  if (window.__exitIntentInit) return; // 防重复绑定监听器
  window.__exitIntentInit = true;
  var fired = false;
  document.addEventListener('mouseleave', function(e) {
    if (fired) return;
    if (e.clientY > 0) return; // only when leaving via top edge
    var payPrompt = document.getElementById('pay-prompt');
    if (!payPrompt || payPrompt.style.display === 'none') return;
    fired = true;
    showExitOffer();
  });
  // Mobile: trigger on scroll to bottom
  var scrollFired = false;
  window.addEventListener('scroll', function() {
    if (scrollFired) return;
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
      scrollFired = true;
      var payPrompt = document.getElementById('pay-prompt');
      if (payPrompt && payPrompt.style.display !== 'none') {
        setTimeout(function() { showExitOffer(); }, 1500);
      }
    }
  });
}

function showExitOffer() {
  if (window.__exitOfferShown) return; // 本次会话只弹一次
  // 跨会话：看过一次后 7 天内不再弹
  try {
    var last = parseInt(localStorage.getItem('exit_offer_seen') || '0', 10);
    if (last && (Date.now() - last) < 7 * 24 * 60 * 60 * 1000) return;
    localStorage.setItem('exit_offer_seen', String(Date.now()));
  } catch (e) {}
  window.__exitOfferShown = true;
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = '<div style="background:#fff;border-radius:14px;padding:28px 24px;max-width:400px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3);">' +
    '<div style="font-size:40px;margin-bottom:8px;">⏳</div>' +
    '<h3 style="margin:0 0 8px;font-size:20px;color:#0A2540;">等一下！完整版限时优惠</h3>' +
    '<p style="font-size:14px;color:#64748b;margin-bottom:16px;">完整版报告覆盖24个维度，约8000字深度解读。现在锁定只需 ¥99（原价 ¥398）</p>' +
    '<button onclick="this.closest(\'div\').parentElement.remove();document.getElementById(\'pay-btn\').click();" style="background:#dc2626;color:#fff;border:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;width:100%;">立即解锁完整报告 →</button>' +
    '<p style="margin-top:10px;font-size:11px;color:#94a3b8;">限时活动价 ¥99，原价 ¥398</p>' +
    '<button onclick="this.closest(\'div\').parentElement.remove();" style="margin-top:8px;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:13px;">暂不需要，关闭</button>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

// Real-time activity toast
function showActivityToast() {
  var messages = [
    '刚刚有人解锁了完整版报告',
    '3分钟前一位用户查看了进阶版',
    '今日已有 18 人查看深度报告',
    '一位北京的用户刚完成完整版解读',
  ];
  var msg = messages[Math.floor(Math.random() * messages.length)];
  setTimeout(function() {
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:20px;left:20px;background:#0A2540;color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.2);animation:fadeInUp .4s ease;opacity:0;transform:translateY(10px);';
    toast.textContent = '🔥 ' + msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      toast.style.transition = 'all .4s ease';
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(function() { toast.remove(); }, 400);
    }, 4000);
  }, 3000);
}

// ── 渲染命局干支关系 ───────────────────────────────────────────────
function renderPillarRelations(bazi) {
  const el = document.getElementById('pillar-relations');
  if (!el) return;

  const stems   = [bazi.year.tg, bazi.month.tg, bazi.day.tg, bazi.hour.tg];
  const branches = [bazi.year.dz, bazi.month.dz, bazi.day.dz, bazi.hour.dz];
  const labels  = ['年','月','日','时'];

  const items = []; // { text, type: 'he'|'chong'|'xing'|'hai'|'po' }

  // 天干五合
  const STEM_HE = {'甲己':'合土','乙庚':'合金','丙辛':'合水','丁壬':'合木','戊癸':'合火'};
  for (let i = 0; i < 4; i++) for (let j = i+1; j < 4; j++) {
    const k = stems[i]+stems[j], k2 = stems[j]+stems[i];
    if (STEM_HE[k])  items.push({ text:`${labels[i]}${stems[i]}·${labels[j]}${stems[j]} 天干${STEM_HE[k]}`, type:'he' });
    else if (STEM_HE[k2]) items.push({ text:`${labels[j]}${stems[j]}·${labels[i]}${stems[i]} 天干${STEM_HE[k2]}`, type:'he' });
  }

  // 地支六合
  const BR_SIX = {'子丑':'合土','寅亥':'合木','卯戌':'合火','辰酉':'合金','巳申':'合水','午未':'合火'};
  // 地支六冲
  const BR_CHONG = new Set(['子午','丑未','寅申','卯酉','辰戌','巳亥']);
  // 地支三合局
  const BR_SAN = [['寅','午','戌','火'],['巳','酉','丑','金'],['申','子','辰','水'],['亥','卯','未','木']];
  // 地支三会局
  const BR_HUI = [['寅','卯','辰','木'],['巳','午','未','火'],['申','酉','戌','金'],['亥','子','丑','水']];
  // 地支三刑
  const BR_XING3A = new Set(['寅','巳','申']); // 寅巳申三刑
  const BR_XING3B = new Set(['丑','未','戌']); // 丑未戌三刑
  // 地支相破
  const BR_PO = new Set(['子酉','酉子','丑辰','辰丑','寅亥','亥寅','卯午','午卯','巳申','申巳','未戌','戌未']);
  // 地支相害
  const BR_HAI = new Set(['子未','未子','丑午','午丑','寅巳','巳寅','卯辰','辰卯','申亥','亥申','酉戌','戌酉']);

  for (let i = 0; i < 4; i++) for (let j = i+1; j < 4; j++) {
    const b1 = branches[i], b2 = branches[j];
    const k = b1+b2, k2 = b2+b1;
    // 六合
    if (BR_SIX[k])  items.push({ text:`${labels[i]}${b1}·${labels[j]}${b2} 六合（${BR_SIX[k]}）`, type:'he' });
    else if (BR_SIX[k2]) items.push({ text:`${labels[j]}${b2}·${labels[i]}${b1} 六合（${BR_SIX[k2]}）`, type:'he' });
    // 六冲
    if (BR_CHONG.has(k) || BR_CHONG.has(k2)) items.push({ text:`${labels[i]}${b1}·${labels[j]}${b2} 相冲`, type:'chong' });
    // 自刑
    if (b1 === b2 && ['午','辰','亥','酉'].includes(b1)) items.push({ text:`${b1}${b1} 自刑`, type:'xing' });
    // 相破
    if (BR_PO.has(k)) items.push({ text:`${labels[i]}${b1}·${labels[j]}${b2} 相破`, type:'po' });
    // 相害
    if (BR_HAI.has(k)) items.push({ text:`${labels[i]}${b1}·${labels[j]}${b2} 相害`, type:'hai' });
  }

  // 子卯相刑
  const haizi = branches.includes('子'), haomao = branches.includes('卯');
  if (haizi && haomao) items.push({ text:'子卯相刑', type:'xing' });

  // 寅巳申三刑
  if (['寅','巳','申'].every(b => branches.includes(b))) items.push({ text:'寅巳申 三刑', type:'xing' });
  // 丑未戌三刑
  if (['丑','未','戌'].every(b => branches.includes(b))) items.push({ text:'丑未戌 三刑', type:'xing' });

  // 三合局
  for (const [a,b,c,wx] of BR_SAN) {
    const got = [a,b,c].filter(x => branches.includes(x));
    if (got.length === 3) items.push({ text:`${a}${b}${c} 三合${wx}局`, type:'he' });
    else if (got.length === 2) items.push({ text:`${got.join('')} 半合${wx}局`, type:'he' });
  }

  // 三会局
  for (const [a,b,c,wx] of BR_HUI) {
    if ([a,b,c].every(x => branches.includes(x))) items.push({ text:`${a}${b}${c} 三会${wx}局`, type:'he' });
  }

  if (!items.length) {
    el.innerHTML = '<p style="color:#a0a0b0;font-size:0.85rem;margin-top:4px;">命局地支较纯，无明显刑冲合害</p>';
    return;
  }

  const colorMap = { he:'#4caf80', chong:'#e94560', xing:'#e08030', hai:'#c070c0', po:'#8090c0' };
  el.innerHTML = '<p style="color:#a0a0b0;font-size:0.8rem;margin-bottom:8px;">命局干支关系</p>'
    + items.map(it =>
        `<span style="display:inline-block;margin:3px 4px;padding:3px 8px;border-radius:4px;font-size:0.8rem;background:${colorMap[it.type]}22;border:1px solid ${colorMap[it.type]}66;color:${colorMap[it.type]}">${it.text}</span>`
      ).join('');
}

// ── 渲染大运表格 ───────────────────────────────────────────────────
function renderDaYun(daYunData, currentYear, birthYear) {
  const el = document.getElementById('dayun-section');
  if (!el) return;
  const currentAge = currentYear - birthYear;
  let html = `<p class="dayun-meta">${daYunData.forward ? '顺行' : '逆行'}，${daYunData.startAge}岁起运</p><div class="dayun-grid">`;
  daYunData.dayuns.forEach(d => {
    const isCurrent = currentAge >= d.ageStart && currentAge < d.ageStart + 10;
    html += `<div class="dayun-item${isCurrent ? ' current' : ''}">
      <div class="dayun-gz">${d.gz}</div>
      <div class="dayun-age">${d.ageStart}岁</div>
      <div class="dayun-year">${d.yearStart}年</div>
    </div>`;
  });
  html += '</div>';
  el.innerHTML = html;
}

// ── 渲染特殊年份 ───────────────────────────────────────────────────
function renderSpecialYears(specialYears, currentYear) {
  const el = document.getElementById('special-years-section');
  if (!el) return;
  if (!specialYears.length) {
    el.innerHTML = '<p class="price-desc">一生中无天克地冲或岁运并临年份</p>';
    return;
  }
  let html = '';
  specialYears.forEach(s => {
    const isPast    = s.year < currentYear;
    const isCurrent = s.year === currentYear;
    const label     = isPast ? '已过' : isCurrent ? '今年' : '';
    const tagClass  = isPast ? 'special-year-tag past' : isCurrent ? 'special-year-tag current-year' : 'special-year-tag';
    html += `<div class="special-year-item${isPast ? ' past' : ''}">
      <span class="${tagClass}">${s.year}年 ${s.gz}${label ? '（' + label + '）' : ''}</span>
      ${s.reasons.map(r => `<span class="special-year-reason">${r}</span>`).join('')}
    </div>`;
  });
  el.innerHTML = html;
}

// ── 完整分析（测试/付费解锁后调用）─────────────────────────────────
async function fullAnalyze(birthData, bazi, daYunData, specialYears, paidContext = {}) {
  const currentYear = new Date().getFullYear();
  const loading = document.getElementById('analysis-loading');
  const content = document.getElementById('analysis-content');
  const payPrompt = document.getElementById('pay-prompt');
  if (content) content.style.display = 'none';
  if (payPrompt) payPrompt.style.display = 'none';
  if (loading) loading.style.display = 'block';

  const baziStr = `${bazi.year.tg}${bazi.year.dz} ${bazi.month.tg}${bazi.month.dz} ${bazi.day.tg}${bazi.day.dz} ${bazi.hour.tg}${bazi.hour.dz}`;
  const fullCacheKey = `bazi_full_${birthData.year}_${birthData.month}_${birthData.day}_${birthData.hour}_${birthData.gender}`;
  const dayunText = daYunData.dayuns.map(d => `${d.gz}(${d.ageStart}-${d.yearStart})`).join(', ');
  const specialText = specialYears.length
    ? specialYears.map(s => `${s.year} ${s.gz} ${s.year < currentYear ? 'past' : s.year === currentYear ? 'current' : 'future'}: ${s.reasons.join('; ')}`).join('\\n')
    : 'none';

  const analysisText = document.getElementById('analysis-text');

  const basePayload = {
    year: birthData.year,
    month: birthData.month,
    day: birthData.day,
    hour: birthData.hour,
    gender: birthData.gender,
    birthplace: birthData.birthplace || '',
    bazi_str: baziStr,
    dayun_text: dayunText,
    special_years_text: specialText,
    start_age: daYunData.startAge,
  };
  if (paidContext?.tradeNo) basePayload.trade_no = paidContext.tradeNo;
  if (paidContext?.paymentOptionId) basePayload.payment_option_id = paidContext.paymentOptionId;

  const paidTier = (() => {
    const raw = String(paidContext?.paymentOptionId || '').toLowerCase();
    if (raw === 'vip' || raw === 'pro' || raw === 'basic') return raw;
    return 'basic';
  })();
  const tierRanges = paidTier === 'vip'
    ? [[1, 8], [9, 16], [17, 24]]
    : (paidTier === 'pro' ? [[1, 8], [9, 16]] : [[1, 8]]);

  const cleanAnalysisText = (raw) => {
    return String(raw || '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
      .replace(/^\s*[-*>]\s*/gm, '')
      .replace(/Powered by DeepSeek.*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const chineseDigitsToNumber = (raw) => {
    const text = String(raw || '').trim();
    if (!text) return 0;
    if (/^\d+$/.test(text)) return Number(text);
    const digitMap = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    let total = 0;
    let current = 0;
    for (const ch of text) {
      if (ch === '百') {
        total += (current || 1) * 100;
        current = 0;
      } else if (ch === '十') {
        total += (current || 1) * 10;
        current = 0;
      } else if (digitMap[ch] !== undefined) {
        current = digitMap[ch];
      }
    }
    return total + current;
  };

  const countReportSections = (raw) => {
    const text = String(raw || '');
    const regex = /Section\s*(\d{1,2})\s*:|第([一二三四五六七八九十百零\d]{1,3})段[：:]/g;
    let maxSection = 0;
    let match;
    while ((match = regex.exec(text))) {
      const current = match[1] ? Number(match[1]) : chineseDigitsToNumber(match[2] || '');
      if (Number.isFinite(current) && current > maxSection) maxSection = current;
    }
    return maxSection;
  };

  const joinAnalysisParts = (...parts) =>
    parts
      .map((part) => cleanAnalysisText(part))
      .filter(Boolean)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const renderFinal = (raw) => {
    const cleaned = cleanAnalysisText(raw);
    if (!cleaned) return false;
    safeSetLocalStorage(fullCacheKey, cleaned);
    clearPendingPaymentOptionId();
    showAnalysis(cleaned, true);
    return true;
  };

  const fetchNonStreamAnalysis = async (extraPayload = {}) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
      body: JSON.stringify({ ...basePayload, ...extraPayload, stream: false }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return cleanAnalysisText(data?.analysis);
  };

  const tryNonStreamFallback = async () => {
    try {
      if (loading) {
        loading.style.display = 'block';
        loading.innerHTML = '<p class="price-desc">支付已确认，正在切换备用通道分段生成报告，请稍候…</p>' + PAID_ONE_TIME_NOTICE_HTML;
      }
      let combined = '';
      for (const [start, end] of tierRanges) {
        const part = await fetchNonStreamAnalysis({ section_start: start, section_end: end });
        combined = joinAnalysisParts(combined, part);
      }

      const targetEnd = tierRanges[tierRanges.length - 1][1];
      const maxSection = countReportSections(combined);
      if (maxSection < targetEnd) {
        combined = joinAnalysisParts(
          combined,
          await fetchNonStreamAnalysis({ section_start: Math.max(1, maxSection + 1), section_end: targetEnd })
        );
      }

      return renderFinal(combined || (await fetchNonStreamAnalysis()));
    } catch (err) {
      console.warn('non-stream fallback failed:', err);
      return false;
    }
  };

  const streamSinglePart = async (extraPayload = {}, append = false) => {
    const streamRes = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
      body: JSON.stringify({ ...basePayload, ...extraPayload, stream: true }),
    });

    const canUseStream = streamRes.ok && streamRes.body && typeof streamRes.body.getReader === 'function';
    if (!canUseStream) return null;

    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
    togglePaidOneTimeNotice(true);
    if (analysisText && !append) analysisText.textContent = '';

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    const existingText = append && analysisText ? analysisText.textContent || '' : '';
    const renderedPrefix = append && existingText ? `${existingText.replace(/\s*$/, '')}\n\n` : '';
    let partText = '';
    let buffer = '';

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break outer;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content || '';
          if (delta) {
            partText += delta;
            if (analysisText) analysisText.textContent = renderedPrefix + partText;
          }
        } catch {}
      }
    }

    return cleanAnalysisText(partText);
  };

  try {
    let fullText = '';
    const streamParts = [];
    for (let i = 0; i < tierRanges.length; i += 1) {
      const [start, end] = tierRanges[i];
      const part = await streamSinglePart({ section_start: start, section_end: end }, i > 0);
      if (part == null) {
        const ok = await tryNonStreamFallback();
        if (!ok && loading) loading.innerHTML = '<p>报告生成失败，请刷新后重试。</p>';
        return;
      }
      streamParts.push(part);
    }

    fullText = joinAnalysisParts(...streamParts);
    const targetEnd = tierRanges[tierRanges.length - 1][1];
    const maxSection = countReportSections(fullText);
    if (maxSection < targetEnd) {
      fullText = joinAnalysisParts(
        fullText,
        await fetchNonStreamAnalysis({ section_start: Math.max(1, maxSection + 1), section_end: targetEnd })
      );
    }

    if (!renderFinal(fullText)) {
      const ok = await tryNonStreamFallback();
      if (!ok) {
        if (loading) {
          loading.style.display = 'block';
          loading.innerHTML = '<p>报告生成失败，请刷新后重试。</p>';
        }
        if (content) content.style.display = 'none';
      }
    }
  } catch (err) {
    const ok = await tryNonStreamFallback();
    if (!ok && loading) loading.innerHTML = `<p>网络异常：${err?.message || err}，请刷新重试。</p>`;
  }
}

function buildLocalFreeAnalysis(birthData, bazi, daYunData, specialYears, _reason = '') {
  const now = new Date().getFullYear();
  const dayStem = bazi?.day?.tg || '';
  const dayBranch = bazi?.day?.dz || '';
  const monthStem = bazi?.month?.tg || '';
  const monthBranch = bazi?.month?.dz || '';

  const dayElement = STEM_ELEMENT_INDEX[dayStem];
  const producerElement = dayElement === undefined ? undefined : (dayElement + 4) % 5;
  const controllerElement = dayElement === undefined ? undefined : (dayElement + 3) % 5;
  const leakElement = dayElement === undefined ? undefined : (dayElement + 1) % 5;
  const monthElement = BRANCH_ELEMENT_INDEX[monthBranch];

  let strengthScore = 0;
  if (dayElement !== undefined && monthElement !== undefined) {
    if (monthElement === dayElement) strengthScore += 2;
    else if (monthElement === producerElement) strengthScore += 2;
    else if (monthElement === controllerElement) strengthScore -= 2;
    else if (monthElement === leakElement) strengthScore -= 1;
  }

  const stemSupports = [bazi?.year?.tg, bazi?.month?.tg, bazi?.hour?.tg].filter(Boolean);
  stemSupports.forEach((tg) => {
    const e = STEM_ELEMENT_INDEX[tg];
    if (e === undefined || dayElement === undefined) return;
    if (e === dayElement || e === producerElement) strengthScore += 1;
    if (e === controllerElement) strengthScore -= 1;
  });

  const branchRoots = [bazi?.year?.dz, bazi?.month?.dz, bazi?.day?.dz, bazi?.hour?.dz].filter(Boolean);
  branchRoots.forEach((dz) => {
    const hidden = HIDDEN_STEMS_MAP[dz] || [];
    if (!hidden.length || dayElement === undefined) return;
    if (hidden.includes(dayStem)) {
      strengthScore += 2;
      return;
    }
    if (hidden.some((tg) => STEM_ELEMENT_INDEX[tg] === dayElement || STEM_ELEMENT_INDEX[tg] === producerElement)) {
      strengthScore += 1;
    }
  });

  let strengthLabel = '中和';
  if (strengthScore >= 6) strengthLabel = '身强';
  else if (strengthScore >= 3) strengthLabel = '偏强';
  else if (strengthScore <= -4) strengthLabel = '身弱';
  else if (strengthScore <= -1) strengthLabel = '偏弱';

  const monthGod = dayStem && monthStem ? getTenGod(dayStem, monthStem) : '--';
  const patternNameMap = {
    比肩: '比劫格', 劫财: '比劫格',
    食神: '食神格', 伤官: '伤官格',
    正财: '财格', 偏财: '财格',
    正官: '官格', 七杀: '杀格',
    正印: '印格', 偏印: '印格',
  };
  const patternName = patternNameMap[monthGod] || `${monthGod}主事`;

  const dayStemProfileMap = {
    甲: { core: '外在直接、有担当，内里重原则与成长，做事讲方向感。', adv: '执行果断、抗压和扛事能力强', risk: '容易过度硬扛，忽略节奏与协作' },
    乙: { core: '心思细腻、适应力强，重关系与长期价值，善于迂回达成目标。', adv: '沟通柔韧、持续推进能力好', risk: '关键时刻易犹豫，决断偏慢' },
    丙: { core: '表达外放、目标明确，喜欢掌控局面，做事讲效率和影响力。', adv: '号召力强、行动速度快', risk: '情绪上头时容易激进判断' },
    丁: { core: '观察细致、感知敏锐，擅长深度思考，注重品质与分寸。', adv: '洞察力强、判断细节准', risk: '容易内耗，担心过多影响执行' },
    戊: { core: '稳定务实、责任感重，重底层安全和可持续，做事偏长期主义。', adv: '抗风险能力强、稳扎稳打', risk: '在变化窗口中反应偏慢' },
    己: { core: '谨慎周全、重秩序和边界，善于统筹资源，注重现实收益。', adv: '规划能力强、落地性高', risk: '保守倾向明显，错失高弹性机会' },
    庚: { core: '逻辑直接、标准清晰，重结果与效率，遇事不拖泥带水。', adv: '决断力强、执行穿透力高', risk: '说话做事偏硬，易引发对立' },
    辛: { core: '审美与标准高，重精度与品质，擅长在复杂信息中抓关键。', adv: '专业度高、细节控制强', risk: '完美主义导致推进延迟' },
    壬: { core: '思路开阔、适应变化快，擅长整合资源与跨界协同。', adv: '机会嗅觉强、应变能力高', risk: '目标分散时易耗损主线' },
    癸: { core: '感知深、同理心强，擅长幕后判断与节奏拿捏，做事稳中求进。', adv: '风险识别能力强、稳定性好', risk: '容易想太多，行动延后' },
  };
  const dayProfile = dayStemProfileMap[dayStem] || { core: '性格主轴偏理性稳健，重结果与长期。', adv: '执行稳定', risk: '关键窗口决断偏慢' };

  const patternProfileMap = {
    比肩: '格局偏自主竞争型，做决策更依赖自我判断，适合有主导权的路径。',
    劫财: '格局偏外部资源驱动，机会来自人脉与协同，利项目推进但需防冲动决策。',
    食神: '格局偏输出与创造，适合内容、产品、专业服务类赛道，重长期口碑。',
    伤官: '格局偏表达与突破，创新能力强，适合高变化环境，但要控制节奏。',
    正财: '格局偏稳健经营，重现金流与确定性，适合长期积累型发展路线。',
    偏财: '格局偏机会捕捉，适合市场前线和资源整合，需严格控制风险敞口。',
    正官: '格局偏规则与责任，适合制度型组织和管理岗位，重信誉与稳定进阶。',
    七杀: '格局偏压力与竞争场，适合攻坚突破型岗位，宜以纪律换效率。',
    正印: '格局偏学习与系统能力，适合研究、顾问、战略型路线，重体系建设。',
    偏印: '格局偏洞察和独立思考，适合专业深耕与复杂问题拆解场景。',
  };
  const patternProfile = patternProfileMap[monthGod] || '格局信息显示你更适合“先判断趋势，再做动作”的策略型路径。';

  const dayuns = Array.isArray(daYunData?.dayuns) ? daYunData.dayuns : [];
  const currentDayun = dayuns.find((d) => now >= d.yearStart && now < d.yearStart + 10) || dayuns[0] || null;
  const nextDayun = dayuns.find((d) => d.yearStart > now) || null;
  const dayunHint = currentDayun
    ? `当前大运为「${currentDayun.gz}」（${currentDayun.yearStart}年起）${nextDayun ? `，下一步为「${nextDayun.gz}」（约${nextDayun.yearStart}年）` : ''}`
    : '当前处于大运切换观察期，宜稳中求进。';

  const nearbySpecial = (specialYears || []).filter((s) => s.year >= now && s.year <= now + 2).slice(0, 1);
  const specialHint = nearbySpecial.length
    ? `${nearbySpecial[0].year}年${nearbySpecial[0].gz}需重点关注节奏变化，重大事项建议分步推进。`
    : '近两年节奏总体可控，关键在于先定优先级再行动。';

  const preferredElementIdx = strengthScore >= 0
    ? (controllerElement ?? leakElement ?? dayElement)
    : (producerElement ?? dayElement);
  const avoidElementIdx = strengthScore >= 0
    ? (producerElement ?? dayElement)
    : (controllerElement ?? leakElement ?? dayElement);
  const preferredElement = preferredElementIdx === undefined ? '平衡五行' : `${ELEMENT_LABELS[preferredElementIdx]}为先`;
  const avoidElement = avoidElementIdx === undefined ? '失衡信号' : `忌${ELEMENT_LABELS[avoidElementIdx]}过旺`;

  const lines = [
    '本次为免费版基础预览',
    `第1段：日主强弱。你是${dayStem}${dayBranch}日柱，综合判断为${strengthLabel}，命局以${patternName}倾向为主。建议：先稳后进。`,
    `第2段：格局判断与命主性格底盘。${patternProfile}按日柱看，${dayProfile.core}优势在于${dayProfile.adv}，短板在于${dayProfile.risk}。建议：${dayunHint}${specialHint}`,
    `第3段：用神喜忌与行动建议。当前更适合以${preferredElement}的策略去发力，同时注意${avoidElement}导致的内耗与决策偏差。落地建议：先做一项可执行的小目标，连续执行4周，再根据反馈微调方向。`,
  ];

  return lines.join('\n');
}

async function autoAnalyze(birthData, bazi, daYunData, specialYears) {
  const currentYear = new Date().getFullYear();
  const locked = document.getElementById('analysis-locked');
  const loading = document.getElementById('analysis-loading');
  const content = document.getElementById('analysis-content');
  const analysisText = document.getElementById('analysis-text');
  const payPrompt = document.getElementById('pay-prompt');

  if (locked) locked.style.display = 'none';
  if (loading) loading.style.display = 'block';

  const baziStr = `${bazi.year.tg}${bazi.year.dz} ${bazi.month.tg}${bazi.month.dz} ${bazi.day.tg}${bazi.day.dz} ${bazi.hour.tg}${bazi.hour.dz}`;
  const cacheKey = `bazi_${birthData.year}_${birthData.month}_${birthData.day}_${birthData.hour}_${birthData.gender}`;
  const localPreview = buildLocalFreeAnalysis(birthData, bazi, daYunData, specialYears, 'local_preview');
  let previewTimer = null;
  const clearPreviewTimer = () => {
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
  };

  const cleanAnalysisText = (raw) => {
    return String(raw || '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
      .replace(/^\s*[-*>]\s*/gm, '')
      .replace(/Powered by DeepSeek.*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const renderFinal = (raw) => {
    const cleaned = cleanAnalysisText(raw);
    if (!cleaned) return false;
    clearPreviewTimer();
    localStorage.setItem(cacheKey, cleaned);
    showAnalysis(cleaned);
    return true;
  };

  try {
    previewTimer = setTimeout(() => {
      if (!analysisText?.textContent?.trim()) {
        showAnalysis(localPreview);
      }
    }, 2200);

    const dayunText = daYunData.dayuns
      .map((d) => `${d.gz}(ageStart:${d.ageStart},yearStart:${d.yearStart})`)
      .join(', ');

    const specialText = specialYears.length
      ? specialYears
          .map((s) => `${s.year} ${s.gz} (${s.year < currentYear ? 'past' : s.year === currentYear ? 'current' : 'future'}): ${s.reasons.join('; ')}`)
          .join('\n')
      : 'none';

    const basePayload = {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour,
      gender: birthData.gender,
      birthplace: birthData.birthplace || '',
      bazi_str: baziStr,
      dayun_text: dayunText,
      special_years_text: specialText,
      start_age: daYunData.startAge,
      free_only: true,
    };

    // 人机验证（Turnstile/滑块）：免费排盘也需通过，防 BOT 刷 AI
    try {
      const tsToken = await new Promise((resolve) => {
        if (!window.YZGate) return resolve('');
        if (YZGate.passed && YZGate.passed()) return resolve(YZGate.getToken ? YZGate.getToken() : '');
        YZGate.require(() => resolve(YZGate.getToken ? YZGate.getToken() : ''));
      });
      basePayload.turnstile_token = tsToken;
    } catch (e) {}

    const tryNonStreamFallback = async () => {
      let lastErr = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_ANON}`,
            },
            body: JSON.stringify({ ...basePayload, stream: false }),
          });

          if (!res.ok) {
            lastErr = new Error(`HTTP ${res.status}`);
          } else {
            const data = await res.json();
            if (renderFinal(data?.analysis)) return true;
            lastErr = new Error('empty analysis');
          }
        } catch (err) {
          lastErr = err;
        }

        if (attempt < 2) await new Promise((r) => setTimeout(r, 1200));
      }

      if (lastErr) console.warn('free non-stream fallback failed:', lastErr);
      return false;
    };

    const streamRes = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({ ...basePayload, stream: true }),
    });

    const streamContentType = String(streamRes.headers.get('content-type') || '').toLowerCase();
    const canUseStream =
      streamRes.ok &&
      streamRes.body &&
      typeof streamRes.body.getReader === 'function' &&
      streamContentType.includes('text/event-stream');

    if (!canUseStream) {
      const ok = await tryNonStreamFallback();
      if (!ok) throw new Error(`free_stream_unavailable_${streamRes.status || 'unknown'}`);
      return;
    }

    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
    if (payPrompt) payPrompt.style.display = 'block';
    togglePaidOneTimeNotice(false);
    if (analysisText) analysisText.textContent = '';

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data) continue;
        if (data === '[DONE]') break outer;

        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content || '';
          if (!delta) continue;
          fullText += delta;
          if (analysisText) analysisText.textContent = fullText;
        } catch {
          // ignore malformed chunks
        }
      }
    }

    if (!renderFinal(fullText)) {
      const ok = await tryNonStreamFallback();
      if (!ok) throw new Error('free_stream_empty_and_fallback_failed');
    }
  } catch (err) {
    clearPreviewTimer();
    console.warn('free analyze failed, use local fallback', err);
    showAnalysis(buildLocalFreeAnalysis(birthData, bazi, daYunData, specialYears, err?.message || err));
  }
}


