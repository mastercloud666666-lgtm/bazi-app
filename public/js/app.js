// js/app.js

const SUPABASE_URL  = 'https://rcyssrsnalefzhzsvswm.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
const PENDING_TRADE_KEY = 'bazi_pending_trade_no';
const PENDING_PAYMENT_OPTION_KEY = 'bazi_pending_payment_option_id';
const PENDING_BIRTH_INPUT_KEY = 'bazi_pending_birth_input';
const APP_BUILD = '20260314-grid-v30-unified-logic';
const PAYMENT_OPTIONS = [
  { id: 'basic', title: '入门版：三大核心解读', subtitle: '性格底盘 + 近期机会 + 情感方向（约1200字）｜正式价 39 元｜测试价 0.01 元', fee: '0.01' },
  { id: 'pro', title: '进阶版：八大维度深析', subtitle: '新增事业财运节奏、关键年份提醒与行动建议（约2800字）｜正式价 99 元｜测试价 0.01 元', fee: '0.01' },
  { id: 'vip', title: '尊享完整版：15大项全解', subtitle: '最全面 5000 字：命局 + 大运 + 流年 + 婚恋 + 健康一次看透｜正式价 199 元｜测试价 0.01 元', fee: '0.01' },
];
const DEFAULT_PAYMENT_OPTION = PAYMENT_OPTIONS[0];
const ONE_TIME_PAID_NOTICE = '\u672c\u6b21\u62a5\u544a\u662f\u4e00\u6b21\u6027\u670d\u52a1\uff0c\u8bf7\u81ea\u884c\u622a\u56fe\u4fdd\u5b58\uff0c\u9875\u9762\u5173\u95ed\u540e\u4e0d\u53ef\u518d\u6b21\u67e5\u770b\u3002';
const PAID_ONE_TIME_NOTICE_HTML = '<p style="margin-top:10px;color:#dc2626;font-weight:700;">' + ONE_TIME_PAID_NOTICE + '</p>';
window.__BAZI_APP_BUILD = APP_BUILD;
window.__BAZI_PAYMENT_OPTION_IDS = PAYMENT_OPTIONS.map((x) => x.id);
console.log('[bazi-app build]', APP_BUILD);

const CLIENT_ID_KEY = 'bazi_client_id';
const PENDING_TRADE_COOKIE = 'bazi_pending_trade_no';
const PENDING_PAYMENT_OPTION_COOKIE = 'bazi_pending_payment_option_id';
const CUSTOMER_SERVICE_IMAGE = 'images/kefu-wechat.png';
const CUSTOMER_SERVICE_TITLE = '微信客服';
const CUSTOMER_SERVICE_SUBTITLE = '长按识别二维码添加客服';
const PAYMENT_NON_REFUND_NOTICE = '免责条款：命理分析为虚拟服务，支付完成后不支持退款，请确认后再付款。';
const WECHAT_PAYMENT_CLOSE_NOTICE = '微信浏览器支付完成后，当前页面可能会自动关闭。请重新打开首页点击“继续上次订单”，或选择微信外浏览器完成支付。';

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

function getClientId() {
  let cid = safeGetLocalStorage(CLIENT_ID_KEY) || getCookie(CLIENT_ID_KEY);
  if (!cid) {
    cid = Math.random().toString(36).slice(2, 10);
  }
  safeSetLocalStorage(CLIENT_ID_KEY, cid);
  setCookie(CLIENT_ID_KEY, cid, 60 * 60 * 24 * 180);
  return cid;
}

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
    #kefu-image{width:100%;margin-top:12px;border-radius:10px;border:1px solid #dbe3ed;background:#fff}
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

  document.body.appendChild(openBtn);
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
    modal.classList.add('show');
  });
  modal.addEventListener('click', (evt) => {
    if (evt.target === modal) modal.classList.remove('show');
  });
  modal.querySelector('#kefu-close')?.addEventListener('click', () => {
    modal.classList.remove('show');
  });
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

function invokeWeChatJsapiPay(jsapiPayload, tradeNo) {
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

    const resultUrl = buildResultUrl(tradeNo, getPendingBirthInput(tradeNo));
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

function showMobilePayPanel(payUrl, tradeNo, mountEl) {
  const resultUrl = buildResultUrl(tradeNo, getPendingBirthInput(tradeNo));
  const isWeChat = isWeChatBrowser();
  const debugAnchorHtml = shouldShowPaymentDebug() ? '<div id="mobile-payment-debug-anchor"></div>' : '';
  const panelHtml = `
    <div style="margin-top:2px;padding:10px 12px;border-radius:10px;border:1px solid #fed7aa;background:#fff7ed;color:#7c2d12;font-size:13px;line-height:1.6;">
      <div style="font-weight:700;color:#9a3412;">支付须知（请先阅读）</div>
      <div style="margin-top:6px;">1. ${PAYMENT_NON_REFUND_NOTICE}</div>
      <div style="margin-top:4px;">2. 微信浏览器支付后页面可能自动关闭（微信机制）。</div>
      <div style="margin-top:4px;">3. 支付完成后请重新打开首页，点击“继续上次订单”；或直接选择“复制链接并去浏览器支付（推荐）”。</div>
    </div>
    <div style="margin-top:12px;display:grid;gap:10px;">
      <button id="mobile-open-pay-btn" type="button" style="padding:12px 14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">${isWeChat ? '复制链接并去浏览器支付（推荐）' : '打开支付页面'}</button>
      <button id="mobile-copy-pay-btn" type="button" style="padding:12px 14px;background:#fff;color:#1f2937;border:1px solid #d1d5db;border-radius:8px;font-weight:600;cursor:pointer;">复制支付链接</button>
      ${isWeChat ? '<button id="mobile-open-pay-risk-btn" type="button" style="padding:12px 14px;background:#f59e0b;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">仍在微信内打开（可能关闭）</button>' : ''}
      <button id="mobile-paid-back-btn" type="button" style="padding:12px 14px;background:#111827;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">我已完成支付，查看报告</button>
    </div>
    <p style="margin-top:10px;color:#6b7280;font-size:13px;">${isWeChat ? '如页面被关闭，重新打开首页后点击“继续上次订单”。' : '手机支付请在新窗口完成，当前页面将保留用于继续查看报告。'}</p>
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

  const openPayBtn = document.getElementById('mobile-open-pay-btn');
  if (openPayBtn) {
    openPayBtn.addEventListener('click', async () => {
      if (isWeChat) {
        const ok = await copyTextSafe(payUrl);
        if (ok) {
          alert('支付链接已复制，请切换到系统浏览器打开并完成支付。');
        } else {
          prompt('请手动复制支付链接：', payUrl);
        }
        return;
      }

      const win = window.open(payUrl, '_blank');
      if (!win) {
        alert('未能自动打开支付页，请先复制支付链接再打开。');
      }
    });
  }

  const copyPayBtn = document.getElementById('mobile-copy-pay-btn');
  if (copyPayBtn) {
    copyPayBtn.addEventListener('click', async () => {
      const ok = await copyTextSafe(payUrl);
      if (ok) {
        alert('支付链接已复制，请在浏览器打开并完成支付。');
      } else {
        prompt('请手动复制支付链接：', payUrl);
      }
    });
  }

  const doneBtn = document.getElementById('mobile-paid-back-btn');
  if (doneBtn) {
    doneBtn.addEventListener('click', async () => {
      doneBtn.disabled = true;
      doneBtn.textContent = '正在核验支付...';
      await reconcilePaymentStatus(tradeNo, { quiet: true });
      window.location.href = resultUrl;
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

function pickPaymentOption() {
  return new Promise(resolve => {
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
      'width:min(92vw,420px)',
      'background:#fff',
      'border-radius:14px',
      'border:1px solid #DEE2E6',
      'box-shadow:0 16px 44px rgba(0,0,0,0.18)',
      'padding:18px',
      'font-family:inherit',
    ].join(';');

    const title = document.createElement('h3');
    title.textContent = '请选择支付选项';
    title.style.cssText = 'margin:0 0 6px;font-size:18px;color:#0A2540;';

    const subtitle = document.createElement('p');
    subtitle.textContent = '已准备好你的生辰信息，选择后将跳转支付。';
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

    const list = document.createElement('div');
    list.style.cssText = 'display:grid;gap:10px;';

    PAYMENT_OPTIONS.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `${opt.title} · ${opt.subtitle}`;
      btn.style.cssText = [
        'text-align:left',
        'padding:12px 14px',
        'border-radius:10px',
        'border:1px solid #DEE2E6',
        'background:#F8F9FA',
        'font-size:14px',
        'color:#1A1A1A',
        'cursor:pointer',
      ].join(';');
      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = '#0066CC';
        btn.style.background = '#EFF6FF';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = '#DEE2E6';
        btn.style.background = '#F8F9FA';
      });
      btn.addEventListener('click', () => {
        cleanup();
        resolve(opt);
      });
      list.appendChild(btn);
    });

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
    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(notice);
    card.appendChild(list);
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
          `${SUPABASE_URL}/rest/v1/orders?trade_no=like.${pattern}&select=trade_no,paid,analysis&order=trade_no.desc&limit=1`,
          { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
        );
        if (recentRes.ok) {
          const recentRows = await recentRes.json();
          const recentOrder = Array.isArray(recentRows) ? recentRows[0] : null;
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
      title.textContent = paid ? '检测到已支付订单，可继续查看报告' : '检测到上次订单，可继续恢复结果';

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

      const resumeBtn = document.createElement('button');
      resumeBtn.type = 'button';
      resumeBtn.style.cssText = 'padding:8px 12px;border:0;border-radius:8px;background:#2563EB;color:#fff;cursor:pointer;font-size:13px;';
      resumeBtn.textContent = paid ? '继续查看报告' : '继续上次订单';
      resumeBtn.addEventListener('click', () => {
        window.location.href = resultUrl;
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

      row.appendChild(resumeBtn);
      row.appendChild(clearBtn);
      panel.appendChild(title);
      panel.appendChild(row);
      form.prepend(panel);
    };

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?trade_no=eq.${encodeURIComponent(pendingTradeNo)}&select=paid,analysis`,
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

      const resultUrl = buildResultUrl(pendingTradeNo, getPendingBirthInput(pendingTradeNo));
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
      if (order.paid && isMobile) {
        window.location.href = resultUrl;
        return;
      }

      renderPendingPanel(!!order.paid);
    } catch (err) {
      console.warn('pending trade recover failed:', err);
      renderPendingPanel(false);
    }
  };

  resumeFromPendingTrade();

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
      paidBtn.textContent = '立即解锁完整命理报告';
      paidBtn.dataset.defaultText = paidBtn.textContent;
      paidBtn.style.marginTop = '12px';
      submitBtn.insertAdjacentElement('afterend', paidBtn);
    }
  }

  if (paidBtn) {
    if (!paidBtn.dataset.defaultText) {
      paidBtn.dataset.defaultText = paidBtn.textContent.trim();
    }
    paidBtn.addEventListener('click', async () => {
      // 验证表单
      const yearEl   = document.getElementById('year');
      const monthEl  = document.getElementById('month');
      const dayEl    = document.getElementById('day');
      const hourEl   = document.getElementById('hour');
      const genderEl = document.querySelector('input[name=gender]:checked');

      if (!yearEl.value || !monthEl.value || !dayEl.value || !hourEl.value || !genderEl) {
        alert('请填写完整的生辰信息');
        return;
      }

      let year   = parseInt(yearEl.value);
      let month  = parseInt(monthEl.value);
      let day    = parseInt(dayEl.value);
      let hour   = parseInt(hourEl.value);
      const gender     = genderEl.value;
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
      let lonUsed   = null;
      if (geoCache) {
        lonUsed = geoCache.lon;
        const tzOffset = Math.round(lonUsed / 15);
        const eqtMin   = equationOfTime(year, month, day);
        const lonMin   = longitudeCorrection(lonUsed, tzOffset);
        const totalMin = eqtMin + lonMin;
        const birthMin = hour * 60 + totalMin;
        solarHour = ((Math.floor(birthMin / 60) % 24) + 24) % 24;
      }

      // 计算八字数据
      const bazi = BaziCalc.calculateBazi(year, month, day, solarHour);

      const selectedOption = await pickPaymentOption();
      if (!selectedOption) return;

      // 跳转支付
      paidBtn.disabled = true;
      paidBtn.textContent = '正在跳转...';

      try {
        await startPayment({ year, month, day, hour: solarHour, gender, birthplace }, bazi, selectedOption);
      } catch (err) {
        console.error('支付跳转失败:', err);
        alert('跳转支付失败，请刷新页面重试');
        paidBtn.disabled = false;
        paidBtn.textContent = paidBtn.dataset.defaultText || '立即解锁完整命理报告';
      }
    });
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

function renderBaziDetailGrid(bazi) {
  const titleEl = document.getElementById('bazi-detail-title');
  if (titleEl) titleEl.textContent = '\u547d\u5c40\u7ec6\u76d8\uff08\u8868\u683c\u7248\uff09';

  const gridEl = document.getElementById('bazi-detail-grid');
  if (!gridEl || !bazi) return;

  const columns = GRID_PILLARS.map((item) => bazi[item.key]);
  const dayStem = bazi.day.tg;
  const hiddenStemsColumns = columns.map((pillar) => HIDDEN_STEMS_MAP[pillar.dz] || []);

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
      label: '\u7a7a\u4ea1',
      cells: columns.map((pillar) => getKongWangByPillar(pillar)),
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
  gridEl.innerHTML = html;
}


(async () => {
  if (document.getElementById('bazi-table-section')) {
  const p          = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
  let year, month, day, hour, inputHour, gender, birthplace, lon;

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
  const tradeNo = p.get('trade_no')
    || p.get('trade_order_id')
    || hashParams.get('trade_no')
    || hashParams.get('trade_order_id')
    || getPendingTradeNo();
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
  const isPaidMode = p.get('paid') === 'true';

  // 检查 localStorage 缓存（先查完整版，再查免费版）
  const cacheKey     = `bazi_${year}_${month}_${day}_${hour}_${gender}`;
  const fullCacheKey = `bazi_full_${year}_${month}_${day}_${hour}_${gender}`;
  const cachedFull   = localStorage.getItem(fullCacheKey);
  const cached       = localStorage.getItem(cacheKey);

  // 优先显示完整版缓存
  if (cachedFull) {
    clearPendingPaymentOptionId();
    showAnalysis(cachedFull, true);
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

  // 检查 URL 中是否有回调参数（支付成功后跳回）
  if (tradeNo) {
    // 立即显示加载提示，隐藏其他内容
    document.getElementById('analysis-locked').style.display = 'none';
    document.getElementById('pay-prompt').style.display = 'none';
    document.getElementById('analysis-content').style.display = 'none';
    document.getElementById('analysis-loading').style.display = 'block';
    document.getElementById('analysis-loading').innerHTML = '<p class="price-desc">\u652f\u4ed8\u6210\u529f\uff0c\u6b63\u5728\u751f\u6210\u6df1\u5ea6\u547d\u7406\u62a5\u544a\uff0c\u8bf7\u7a0d\u5019\u2026</p>' + PAID_ONE_TIME_NOTICE_HTML;
    
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
async function startPayment(birthData, bazi, paymentOption) {
  const chosenOption = paymentOption || DEFAULT_PAYMENT_OPTION;
  console.log('开始支付流程...', birthData, bazi, chosenOption);

  const resetPayButtons = () => {
    const ids = ['pay-btn', 'paid-btn'];
    ids.forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = false;
      btn.textContent = btn.dataset.defaultText || '立即解锁完整命理报告';
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

  // 先在 Supabase 插入订单记录（失败也不影响跳转）
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        trade_no: tradeNo,
        birth_input: JSON.stringify({
          ...birthData,
          bazi_str: baziStr,
          dayun_text: dayunText,
          special_years_text: specialYearsText,
          start_age: daYunData.startAge,
          payment_option: chosenOption,
        }),
      }),
    });
    console.log('订单创建成功');
  } catch (err) {
    console.error('订单创建失败，继续跳转支付:', err);
  }

  console.log('调用后端代理创建支付...');
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isWeChat = isWeChatBrowser();

  // 调用后端代理创建支付
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        trade_no: tradeNo,
        birth_input: { ...birthData, bazi_str: baziStr },
        payment_option_id: chosenOption.id,
        payment_option_title: chosenOption.title,
        total_fee: chosenOption.fee,
        client_env: {
          user_agent: ua,
          is_mobile: isMobile,
          is_wechat: isWeChat,
        },
      }),
    });

    const result = await response.json();
    console.log('支付API返回:', result);

    if (result.errcode === 0) {
      const payUrl = result.url || result.url_qrcode || '';
      const jsapiPayload = normalizeWeChatJsapiPayload(result);
      console.log('支付信息:', {
        payUrl,
        hasJsapiPayload: !!jsapiPayload,
        gateway: result?.gateway_meta || null,
      });
      if (loadingSection) {
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
      console.error('支付API错误:', result.errmsg);
      if (loadingSection) {
        renderPaymentDebugInfo(loadingSection, result, null);
      }
      alert(`支付请求失败：${result.errmsg}`);
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
  // 使用完整版缓存键
  const fullCacheKey = cacheKey.replace('bazi_', 'bazi_full_');
  const pollIntervalMs = 1000;
  const maxAttempts = 90; // 最长约 90 秒
  const reconcileIntervalMs = 7000;
  let lastReconcileTs = 0;
  let paidSeenCount = 0;
  let unpaidOrUnknownCount = 0;
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

  // 轮询等待生成完成
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise(r => setTimeout(r, pollIntervalMs));
      
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?trade_no=eq.${tradeNo}&select=paid,analysis,birth_input`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }}
      );
      
      const [order] = await res.json();
      const nowTs = Date.now();
      if (
        !streamFallbackTriggered
        && nowTs - lastReconcileTs >= reconcileIntervalMs
        && (!order?.paid || !order?.analysis)
      ) {
        lastReconcileTs = nowTs;
        await reconcilePaymentStatus(tradeNo, { quiet: true });
      }
      if (!resolvedPaymentOptionId && order?.birth_input) {
        try {
          const birth = JSON.parse(order.birth_input);
          resolvedPaymentOptionId = birth?.payment_option?.id || '';
          if (resolvedPaymentOptionId) {
            setPendingPaymentOptionId(resolvedPaymentOptionId);
          }
        } catch {}
      }
      
      if (order?.paid && order?.analysis) {
        // 保存到完整版缓存
        localStorage.setItem(fullCacheKey, order.analysis);
        clearPendingTradeNo();
        clearPendingPaymentOptionId();
        showAnalysis(order.analysis, true); // hidePay = true，隐藏付费提示
        return;
      }

      if (order?.paid && !order?.analysis) {
        paidSeenCount += 1;
        if (!streamFallbackTriggered && paidSeenCount >= 1 && resolvedBirthData && resolvedBazi && resolvedDaYunData && resolvedSpecialYears) {
          streamFallbackTriggered = true;
          document.getElementById('analysis-loading').innerHTML = '<p class="price-desc">\u5df2\u786e\u8ba4\u652f\u4ed8\uff0c\u6b63\u5728\u76f4\u63a5\u751f\u6210\u5b8c\u6574\u62a5\u544a\uff0c\u8bf7\u7a0d\u5019\u2026</p>' + PAID_ONE_TIME_NOTICE_HTML;
          await fullAnalyze(resolvedBirthData, resolvedBazi, resolvedDaYunData, resolvedSpecialYears, {
            tradeNo,
            paymentOptionId: resolvedPaymentOptionId,
          });
          return;
        }
      }

      if (!order?.analysis) {
        unpaidOrUnknownCount += 1;
        if (!streamFallbackTriggered && unpaidOrUnknownCount >= 20 && resolvedBirthData && resolvedBazi && resolvedDaYunData && resolvedSpecialYears) {
          streamFallbackTriggered = true;
          document.getElementById('analysis-loading').innerHTML = '<p class="price-desc">\u652f\u4ed8\u72b6\u6001\u786e\u8ba4\u8f83\u6162\uff0c\u6b63\u5728\u5148\u4e3a\u60a8\u751f\u6210\u5b8c\u6574\u62a5\u544a\uff0c\u8bf7\u7a0d\u5019\u2026</p>' + PAID_ONE_TIME_NOTICE_HTML;
          await fullAnalyze(resolvedBirthData, resolvedBazi, resolvedDaYunData, resolvedSpecialYears, {
            tradeNo,
            paymentOptionId: resolvedPaymentOptionId,
          });
          return;
        }
      }
      
      // 更新加载提示（每 8 次更新一次）
      if (i % 8 === 0 && i > 0) {
        const seconds = Math.ceil(((i + 1) * pollIntervalMs) / 1000);
        document.getElementById('analysis-loading').innerHTML = `<p class="price-desc">\u6b63\u5728\u751f\u6210\u6df1\u5ea6\u547d\u7406\u62a5\u544a\uff08\u5df2\u7b49\u5f85 ${seconds} \u79d2\uff0c\u901a\u5e38 30-90 \u79d2\u5b8c\u6210\uff09</p>` + PAID_ONE_TIME_NOTICE_HTML;
      }
    } catch (err) {
      console.error('轮询查询失败:', err);
      if (!streamFallbackTriggered && i % 8 === 0) {
        await reconcilePaymentStatus(tradeNo, { quiet: true });
      }
    }
  }
  
  // 超时处理
  document.getElementById('analysis-loading').innerHTML = `
    <p class="price-desc">报告生成时间较长，您可以：</p>
    <div style="margin-top:16px;">
      <button onclick="location.reload()" style="padding:10px 24px;background:#2563eb;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;">刷新页面</button>
      <button onclick="pollForAnalysis('${tradeNo}', '${cacheKey}')" style="padding:10px 24px;background:#4b5563;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;margin-left:12px;">继续等待</button>
    </div>
  `;
}

const DISCLAIMER = '\n\n以上内容为传统文化推演，仅供参考，请理性看待，切勿迷信。';

function normalizeReportLines(text) {
  if (!text) return '';
  return String(text)
    .replace(/\r\n?/g, '\n')
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

function showAnalysis(text, hidePay = false) {
  document.getElementById('analysis-locked').style.display  = 'none';
  document.getElementById('analysis-loading').style.display = 'none';
  document.getElementById('analysis-content').style.display = 'block';
  togglePaidOneTimeNotice(Boolean(hidePay));
  document.getElementById('analysis-text').textContent = normalizeReportLines(text) + DISCLAIMER;
  const payPrompt = document.getElementById('pay-prompt');
  if (payPrompt) payPrompt.style.display = hidePay ? 'none' : 'block';
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
    safeSetLocalStorage(fullCacheKey, cleaned);
    clearPendingPaymentOptionId();
    showAnalysis(cleaned, true);
    return true;
  };

  const tryNonStreamFallback = async () => {
    try {
      if (loading) {
        loading.style.display = 'block';
        loading.innerHTML = '<p class="price-desc">支付已确认，正在切换备用通道生成完整报告，请稍候…</p>' + PAID_ONE_TIME_NOTICE_HTML;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({ ...basePayload, stream: false }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      return renderFinal(data?.analysis);
    } catch (err) {
      console.warn('non-stream fallback failed:', err);
      return false;
    }
  };

  try {
    const streamRes = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
      body: JSON.stringify({ ...basePayload, stream: true }),
    });

    const canUseStream = streamRes.ok && streamRes.body && typeof streamRes.body.getReader === 'function';
    if (!canUseStream) {
      const ok = await tryNonStreamFallback();
      if (!ok && loading) loading.innerHTML = '<p>报告生成失败，请刷新后重试。</p>';
      return;
    }

    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
    togglePaidOneTimeNotice(true);
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
        if (data === '[DONE]') break outer;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            if (analysisText) analysisText.textContent = fullText;
          }
        } catch {}
      }
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

  const lines = [
    '本次为免费版基础预览',
    `第1段：日主强弱。你是${dayStem}${dayBranch}日柱，综合判断为${strengthLabel}，命局以${patternName}倾向为主。建议：先稳后进。`,
    `第2段：格局判断与命主性格底盘。${patternProfile}按日柱看，${dayProfile.core}优势在于${dayProfile.adv}，短板在于${dayProfile.risk}。建议：${dayunHint}${specialHint}`,
  ];

  return lines.join('\n');
}

async function autoAnalyze(birthData, bazi, daYunData, specialYears) {
  const currentYear = new Date().getFullYear();
  const locked  = document.getElementById('analysis-locked');
  const loading = document.getElementById('analysis-loading');
  if (locked)  locked.style.display  = 'none';
  if (loading) loading.style.display = 'block';

  const baziStr = `${bazi.year.tg}${bazi.year.dz}年 ${bazi.month.tg}${bazi.month.dz}月 ${bazi.day.tg}${bazi.day.dz}日 ${bazi.hour.tg}${bazi.hour.dz}时`;
  const cacheKey = `bazi_${birthData.year}_${birthData.month}_${birthData.day}_${birthData.hour}_${birthData.gender}`;

  try {
    // 格式化大运文字
    const dayunText = daYunData.dayuns.map(d =>
      `${d.gz}（${d.ageStart}岁起，${d.yearStart}年）`
    ).join('、');

    // 格式化特殊年份文字
    const specialText = specialYears.length
      ? specialYears.map(s => `${s.year}年${s.gz}（${s.year < currentYear ? '已过' : s.year === currentYear ? '今年' : '未来'}）：${s.reasons.join('；')}`).join('\n')
      : '一生中无明显天克地冲或岁运并临年份';

    const payload = {
      year: birthData.year, month: birthData.month,
      day: birthData.day, hour: birthData.hour,
      gender: birthData.gender,
      birthplace: birthData.birthplace || '',
      bazi_str: baziStr,
      dayun_text: dayunText,
      special_years_text: specialText,
      start_age: daYunData.startAge,
      free_only: true,
    };

    let lastErr = null;
    let res = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) break;
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastErr = err;
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1200));
    }

    if (!res || !res.ok) {
      throw lastErr || new Error('free_analyze_failed');
    }
    const data = await res.json();
    if (data.analysis) {
      const cleaned = data.analysis
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
        .replace(/^\s*[-–—>]\s*/gm, '')
        .replace(/由\s*DeepSeek\s*生成.*$/gis, '')
        .replace(/Powered by DeepSeek.*$/gis, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      localStorage.setItem(cacheKey, cleaned);
      showAnalysis(cleaned);
    } else {
      showAnalysis(buildLocalFreeAnalysis(birthData, bazi, daYunData, specialYears, 'empty analysis'));
    }
  } catch (err) {
    console.warn('free analyze failed, use local fallback', err);
    showAnalysis(buildLocalFreeAnalysis(birthData, bazi, daYunData, specialYears, err?.message || err));
  }
}
