// js/hepan.js

const SUPABASE_URL  = 'https://rcyssrsnalefzhzsvswm.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';

// ── 农历/阳历切换 ─────────────────────────────────────────────────
['man', 'woman'].forEach(prefix => {
  const accent = prefix === 'man' ? 'blue' : 'rose';
  document.querySelectorAll(`input[name=${prefix}-caltype]`).forEach(radio => {
    radio.addEventListener('change', () => {
      const isLunar = radio.value === 'lunar';
      document.getElementById(`${prefix}-leap-group`).style.display = isLunar ? 'block' : 'none';
      document.getElementById(`${prefix}-lbl-solar`).classList.toggle('active', !isLunar);
      document.getElementById(`${prefix}-lbl-solar`).classList.toggle(accent, !isLunar);
      document.getElementById(`${prefix}-lbl-lunar`).classList.toggle('active', isLunar);
      document.getElementById(`${prefix}-lbl-lunar`).classList.toggle(accent, isLunar);
    });
  });
});

// ── 收集某人的八字数据 ────────────────────────────────────────────
function collectPerson(prefix) {
  let year  = parseInt(document.getElementById(`${prefix}-year`).value);
  let month = parseInt(document.getElementById(`${prefix}-month`).value);
  let day   = parseInt(document.getElementById(`${prefix}-day`).value);
  let hour  = parseInt(document.getElementById(`${prefix}-hour`).value);
  const caltype = document.querySelector(`input[name=${prefix}-caltype]:checked`).value;

  if (caltype === 'lunar') {
    const isLeap = document.getElementById(`${prefix}-is-leap`).checked;
    try {
      const solar = isLeap
        ? Lunar.fromYmd(year, -month, day).getSolar()
        : Lunar.fromYmd(year, month, day).getSolar();
      year  = solar.getYear();
      month = solar.getMonth();
      day   = solar.getDay();
    } catch {
      alert(`${prefix === 'man' ? '男方' : '女方'}农历日期转换失败，请检查输入`);
      return null;
    }
  }
  return { year, month, day, hour };
}

// ── 渲染迷你四柱 ──────────────────────────────────────────────────
function renderMiniPillars(containerId, bazi) {
  const el = document.getElementById(containerId);
  const pillars = [
    { lbl:'年', tg: bazi.year.tg,  dz: bazi.year.dz  },
    { lbl:'月', tg: bazi.month.tg, dz: bazi.month.dz },
    { lbl:'日', tg: bazi.day.tg,   dz: bazi.day.dz   },
    { lbl:'时', tg: bazi.hour.tg,  dz: bazi.hour.dz  },
  ];
  el.innerHTML = pillars.map(p => `
    <div class="mini-pillar">
      <div class="mini-pillar-lbl">${p.lbl}</div>
      <div class="mini-tg">${p.tg}</div>
      <div class="mini-dz">${p.dz}</div>
    </div>
  `).join('');
}

// ── 计算快速合缘指标（纯本地，不调AI）────────────────────────────
function calcCompatTags(manBazi, womanBazi) {
  const tags = [];

  const mDay  = manBazi.day.tg;
  const wDay  = womanBazi.day.tg;
  const mDz   = manBazi.day.dz;
  const wDz   = womanBazi.day.dz;

  // 天干五合
  const STEM_HE = {'甲己':'合土','乙庚':'合金','丙辛':'合水','丁壬':'合木','戊癸':'合火'};
  const stemKey  = mDay + wDay;
  const stemKey2 = wDay + mDay;
  if (STEM_HE[stemKey])  tags.push({ text:`日干${mDay}${wDay}天合·${STEM_HE[stemKey]}`, cls:'good' });
  else if (STEM_HE[stemKey2]) tags.push({ text:`日干${wDay}${mDay}天合·${STEM_HE[stemKey2]}`, cls:'good' });

  // 日支六合
  const BR_SIX = {'子丑':'合土','寅亥':'合木','卯戌':'合火','辰酉':'合金','巳申':'合水','午未':'合火'};
  const dzKey  = mDz + wDz;
  const dzKey2 = wDz + mDz;
  if (BR_SIX[dzKey])  tags.push({ text:`日支${mDz}${wDz}六合`, cls:'good' });
  else if (BR_SIX[dzKey2]) tags.push({ text:`日支${wDz}${mDz}六合`, cls:'good' });

  // 日支三合
  const BR_SAN = [['寅','午','戌'],['巳','酉','丑'],['申','子','辰'],['亥','卯','未']];
  for (const [a,b,c] of BR_SAN) {
    if ([mDz,wDz].every(d => [a,b,c].includes(d))) {
      tags.push({ text:`日支${mDz}${wDz}三合`, cls:'good' });
    }
  }

  // 日支六冲
  const BR_CHONG = new Set(['子午','丑未','寅申','卯酉','辰戌','巳亥']);
  if (BR_CHONG.has(dzKey) || BR_CHONG.has(dzKey2)) tags.push({ text:`日支${mDz}${wDz}相冲`, cls:'bad' });

  // 日支相刑（子卯、寅巳申、丑未戌）
  const bothDz = new Set([mDz, wDz]);
  if (bothDz.has('子') && bothDz.has('卯'))  tags.push({ text:'子卯相刑', cls:'warn' });
  if (['寅','巳','申'].filter(d => bothDz.has(d)).length >= 2) tags.push({ text:'寅巳申相刑', cls:'warn' });
  if (['丑','未','戌'].filter(d => bothDz.has(d)).length >= 2) tags.push({ text:'丑未戌相刑', cls:'warn' });

  // 日支相害
  const BR_HAI = new Set(['子未','未子','丑午','午丑','寅巳','巳寅','卯辰','辰卯','申亥','亥申','酉戌','戌酉']);
  if (BR_HAI.has(dzKey)) tags.push({ text:`日支${mDz}${wDz}相害`, cls:'warn' });

  // 五行互补（简单判断：男女日主五行相生）
  const WX_SHENG = {'木':'火','火':'土','土':'金','金':'水','水':'木'};
  const TG_WX = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
  const mWx = TG_WX[mDay], wWx = TG_WX[wDay];
  if (mWx && wWx) {
    if (WX_SHENG[mWx] === wWx) tags.push({ text:`男${mWx}生女${wWx}·相生`, cls:'good' });
    else if (WX_SHENG[wWx] === mWx) tags.push({ text:`女${wWx}生男${mWx}·相生`, cls:'good' });
    else if (mWx === wWx) tags.push({ text:`日主同气${mWx}·比和`, cls:'good' });
  }

  // 若无任何关系
  if (!tags.length) tags.push({ text:'命局缘分平和', cls:'warn' });

  return tags;
}

// ── 表单提交 ──────────────────────────────────────────────────────
const form = document.getElementById('hepan-form');
let _manBazi = null, _womanBazi = null, _manData = null, _womanData = null;
const payEntryBtn = document.getElementById('hepan-pay-entry-btn');
const payBtn = document.getElementById('hepan-pay-btn');

const HEPAN_PAYMENT_OPTION = { id: 'vip', title: '\u5408\u76d8\u5b8c\u6574\u62a5\u544a', fee: '0.01' };
const HEPAN_PENDING_TRADE_KEY = 'hepan_pending_trade_no';
const HEPAN_ORDER_CACHE_PREFIX = 'hepan_order_';

function getClientId() {
  const key = 'hepan_client_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2, 12);
    localStorage.setItem(key, id);
  }
  return id;
}

function setPendingTradeNo(tradeNo) {
  localStorage.setItem(HEPAN_PENDING_TRADE_KEY, tradeNo);
}

function getPendingTradeNo() {
  return localStorage.getItem(HEPAN_PENDING_TRADE_KEY) || '';
}

function clearPendingTradeNo() {
  localStorage.removeItem(HEPAN_PENDING_TRADE_KEY);
}

function cacheOrderPayload(tradeNo, payload) {
  localStorage.setItem(`${HEPAN_ORDER_CACHE_PREFIX}${tradeNo}`, JSON.stringify(payload));
}

function readOrderPayload(tradeNo) {
  if (!tradeNo) return null;
  const raw = localStorage.getItem(`${HEPAN_ORDER_CACHE_PREFIX}${tradeNo}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearCachedOrderPayload(tradeNo) {
  if (!tradeNo) return;
  localStorage.removeItem(`${HEPAN_ORDER_CACHE_PREFIX}${tradeNo}`);
}

function ensurePayButtonDefaults() {
  [payEntryBtn, payBtn].forEach((btn) => {
    if (!btn) return;
    btn.dataset.defaultText = btn.textContent.trim();
  });
}

function resetPayButtons() {
  [payEntryBtn, payBtn].forEach((btn) => {
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = btn.dataset.defaultText || btn.textContent;
  });
}

function setProcessingState(message) {
  [payEntryBtn, payBtn].forEach((btn) => {
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = '\u6b63\u5728\u8df3\u8f6c...';
  });

  document.getElementById('result-section').style.display = 'block';
  document.getElementById('pay-card').style.display = 'none';
  document.getElementById('hepan-content').style.display = 'none';
  const loadingEl = document.getElementById('hepan-loading');
  loadingEl.style.display = 'block';
  loadingEl.innerHTML = `<p>${message}</p>`;
}

function showHepanError(message) {
  const loadingEl = document.getElementById('hepan-loading');
  loadingEl.style.display = 'block';
  loadingEl.innerHTML = `<p>${message}</p>`;
  document.getElementById('hepan-content').style.display = 'none';
  document.getElementById('pay-card').style.display = 'block';
  resetPayButtons();
}

function buildHepanPayload(manBazi, womanBazi, manData, womanData) {
  if (!manBazi || !womanBazi || !manData || !womanData) return null;

  const manStr = `${manBazi.year.tg}${manBazi.year.dz}\u5e74 ${manBazi.month.tg}${manBazi.month.dz}\u6708 ${manBazi.day.tg}${manBazi.day.dz}\u65e5 ${manBazi.hour.tg}${manBazi.hour.dz}\u65f6`;
  const womanStr = `${womanBazi.year.tg}${womanBazi.year.dz}\u5e74 ${womanBazi.month.tg}${womanBazi.month.dz}\u6708 ${womanBazi.day.tg}${womanBazi.day.dz}\u65e5 ${womanBazi.hour.tg}${womanBazi.hour.dz}\u65f6`;

  const manDaYun = BaziCalc.calculateDaYun(
    manBazi.year,
    manBazi.month,
    '\u7537',
    manData.year,
    manData.month,
    manData.day,
  );
  const womanDaYun = BaziCalc.calculateDaYun(
    womanBazi.year,
    womanBazi.month,
    '\u5973',
    womanData.year,
    womanData.month,
    womanData.day,
  );

  const manDayunTxt = manDaYun.dayuns
    .slice(0, 6)
    .map((d) => `${d.gz}\uff08${d.ageStart}\u5c81\uff0c${d.yearStart}\u5e74\uff09`)
    .join('\u3001');
  const womanDayunTxt = womanDaYun.dayuns
    .slice(0, 6)
    .map((d) => `${d.gz}\uff08${d.ageStart}\u5c81\uff0c${d.yearStart}\u5e74\uff09`)
    .join('\u3001');

  return {
    order_service: 'hepan',
    payment_option: HEPAN_PAYMENT_OPTION,
    current_year: new Date().getFullYear(),
    man_bazi_str: manStr,
    woman_bazi_str: womanStr,
    man_dayun: manDayunTxt,
    woman_dayun: womanDayunTxt,
    man_birth: manData,
    woman_birth: womanData,
  };
}

function hydratePreviewFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const manBirth = payload.man_birth;
  const womanBirth = payload.woman_birth;
  if (!manBirth || !womanBirth) return false;

  const hasMan =
    Number.isFinite(Number(manBirth.year)) &&
    Number.isFinite(Number(manBirth.month)) &&
    Number.isFinite(Number(manBirth.day)) &&
    Number.isFinite(Number(manBirth.hour));
  const hasWoman =
    Number.isFinite(Number(womanBirth.year)) &&
    Number.isFinite(Number(womanBirth.month)) &&
    Number.isFinite(Number(womanBirth.day)) &&
    Number.isFinite(Number(womanBirth.hour));
  if (!hasMan || !hasWoman) return false;

  const manData = {
    year: Number(manBirth.year),
    month: Number(manBirth.month),
    day: Number(manBirth.day),
    hour: Number(manBirth.hour),
  };
  const womanData = {
    year: Number(womanBirth.year),
    month: Number(womanBirth.month),
    day: Number(womanBirth.day),
    hour: Number(womanBirth.hour),
  };

  const manBazi = BaziCalc.calculateBazi(manData.year, manData.month, manData.day, manData.hour);
  const womanBazi = BaziCalc.calculateBazi(womanData.year, womanData.month, womanData.day, womanData.hour);

  _manBazi = manBazi;
  _womanBazi = womanBazi;
  _manData = manData;
  _womanData = womanData;

  renderMiniPillars('man-pillars', manBazi);
  renderMiniPillars('woman-pillars', womanBazi);
  const tags = calcCompatTags(manBazi, womanBazi);
  document.getElementById('compat-tags').innerHTML = tags
    .map((t) => `<span class="compat-tag ${t.cls}">${t.text}</span>`)
    .join('');

  return true;
}

function buildHepanPreview() {
  const manData = collectPerson('man');
  const womanData = collectPerson('woman');
  if (!manData || !womanData) return false;

  const manBazi = BaziCalc.calculateBazi(manData.year, manData.month, manData.day, manData.hour);
  const womanBazi = BaziCalc.calculateBazi(womanData.year, womanData.month, womanData.day, womanData.hour);

  _manBazi = manBazi;
  _womanBazi = womanBazi;
  _manData = manData;
  _womanData = womanData;

  renderMiniPillars('man-pillars', manBazi);
  renderMiniPillars('woman-pillars', womanBazi);

  const tags = calcCompatTags(manBazi, womanBazi);
  document.getElementById('compat-tags').innerHTML = tags
    .map((t) => `<span class="compat-tag ${t.cls}">${t.text}</span>`)
    .join('');

  if (form) form.style.display = 'none';
  document.getElementById('result-section').style.display = 'block';
  document.getElementById('pay-card').style.display = 'block';
  document.getElementById('hepan-loading').style.display = 'none';
  document.getElementById('hepan-content').style.display = 'none';

  return true;
}

function triggerPaidFlowFromForm() {
  if (!form.checkValidity()) {
    alert('\u8bf7\u5148\u5b8c\u6574\u586b\u5199\u53cc\u65b9\u51fa\u751f\u4fe1\u606f\uff08\u5e74/\u6708/\u65e5/\u65f6\uff09');
    form.reportValidity();
    return;
  }

  if (!buildHepanPreview()) return;
  startHepanPayment();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  triggerPaidFlowFromForm();
});

if (payEntryBtn) {
  payEntryBtn.addEventListener('click', triggerPaidFlowFromForm);
}

if (payBtn) {
  payBtn.addEventListener('click', () => {
    startHepanPayment();
  });
}

async function createHepanOrder(tradeNo, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      trade_no: tradeNo,
      birth_input: JSON.stringify(payload),
    }),
  });

  if (!res.ok) {
    throw new Error(`\u521b\u5efa\u8ba2\u5355\u5931\u8d25\uff08${res.status}\uff09`);
  }
}

async function createHepanPayment(tradeNo, payload) {
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isWeChat = /MicroMessenger/i.test(ua);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({
      trade_no: tradeNo,
      birth_input: payload,
      payment_option_id: HEPAN_PAYMENT_OPTION.id,
      payment_option_title: HEPAN_PAYMENT_OPTION.title,
      total_fee: HEPAN_PAYMENT_OPTION.fee,
      return_path: '/hepan.html',
      client_env: {
        user_agent: ua,
        is_mobile: isMobile,
        is_wechat: isWeChat,
      },
    }),
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok || result.errcode !== 0) {
    const msg = result?.errmsg || result?.error || `\u652f\u4ed8\u63a5\u53e3\u5f02\u5e38\uff08${res.status}\uff09`;
    throw new Error(String(msg));
  }

  const payUrl = result.url || result.url_qrcode || '';
  if (!payUrl) throw new Error('\u672a\u8fd4\u56de\u652f\u4ed8\u94fe\u63a5');
  return payUrl;
}

async function startHepanPayment() {
  if (!_manBazi || !_womanBazi || !_manData || !_womanData) {
    if (!buildHepanPreview()) return;
  }

  ensurePayButtonDefaults();
  setProcessingState('\u6b63\u5728\u521b\u5efa\u652f\u4ed8\u8ba2\u5355\uff0c\u8bf7\u7a0d\u5019...');

  const payload = buildHepanPayload(_manBazi, _womanBazi, _manData, _womanData);
  if (!payload) {
    showHepanError('\u547d\u76d8\u6570\u636e\u4e0d\u5b8c\u6574\uff0c\u8bf7\u91cd\u65b0\u8f93\u5165\u540e\u518d\u8bd5\u3002');
    return;
  }

  const tradeNo = `bazi-hepan-${getClientId()}-${Date.now()}`;
  setPendingTradeNo(tradeNo);
  cacheOrderPayload(tradeNo, payload);

  try {
    await createHepanOrder(tradeNo, payload);
    const payUrl = await createHepanPayment(tradeNo, payload);
    window.location.href = payUrl;
  } catch (err) {
    console.error('hepan payment error:', err);
    showHepanError(`\u652f\u4ed8\u53d1\u8d77\u5931\u8d25\uff1a${err?.message || err}`);
  }
}

function renderHepanAnalysis(analysisText) {
  document.getElementById('hepan-loading').style.display = 'none';
  document.getElementById('hepan-content').style.display = 'block';
  document.getElementById('pay-card').style.display = 'none';
  document.getElementById('hepan-text').textContent = analysisText || '';
}

async function triggerHepanAnalyzeByTradeNo(tradeNo, payloadFromOrder = null, streamMode = false) {
  const payload = payloadFromOrder || readOrderPayload(tradeNo) || {};
  const reqBody = {
    trade_no: tradeNo,
    service: 'hepan',
    man_bazi_str: payload.man_bazi_str,
    woman_bazi_str: payload.woman_bazi_str,
    man_dayun: payload.man_dayun,
    woman_dayun: payload.woman_dayun,
    current_year: payload.current_year || new Date().getFullYear(),
    stream: streamMode === true,
  };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify(reqBody),
  });

  if (streamMode) {
    if (!res.ok || !res.body) {
      let errMsg = `\u6d41\u5f0f\u5206\u6790\u8bf7\u6c42\u5931\u8d25\uff08${res.status}\uff09`;
      try {
        const errData = await res.json();
        errMsg = errData?.error || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    document.getElementById('hepan-loading').style.display = 'none';
    document.getElementById('hepan-content').style.display = 'block';
    document.getElementById('pay-card').style.display = 'none';
    const textEl = document.getElementById('hepan-text');
    textEl.textContent = '';

    const reader = res.body.getReader();
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
            textEl.textContent = fullText;
          }
        } catch (_) {}
      }
    }

    if (!fullText.trim()) {
      throw new Error('\u6d41\u5f0f\u751f\u6210\u672a\u8fd4\u56de\u5185\u5bb9');
    }

    // best effort: 把流式最终文本写回订单，方便刷新恢复
    fetch(`${SUPABASE_URL}/rest/v1/orders?trade_no=eq.${encodeURIComponent(tradeNo)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ analysis: fullText }),
    }).catch(() => {});

    return fullText;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `\u5206\u6790\u8bf7\u6c42\u5931\u8d25\uff08${res.status}\uff09`);
  }
  return data?.analysis || '';
}

async function pollPaidHepanOrder(tradeNo) {
  let analyzeTriggered = false;
  let previewHydrated = false;

  for (let i = 0; i < 90; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?trade_no=eq.${encodeURIComponent(tradeNo)}&select=paid,analysis,birth_input`,
        {
          headers: {
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${SUPABASE_ANON}`,
          },
        },
      );
      const rows = await res.json().catch(() => []);
      const order = Array.isArray(rows) ? rows[0] : null;
      if (!order) continue;
      const payload = (() => {
        try {
          return order.birth_input ? JSON.parse(order.birth_input) : null;
        } catch {
          return null;
        }
      })();

      if (!previewHydrated) {
        const hydrated = hydratePreviewFromPayload(payload || readOrderPayload(tradeNo));
        previewHydrated = hydrated || previewHydrated;
      }

      if (order.analysis) {
        renderHepanAnalysis(order.analysis);
        clearPendingTradeNo();
        clearCachedOrderPayload(tradeNo);
        return;
      }

      if (!order.paid && i > 0 && i % 6 === 0) {
        fetch(`${SUPABASE_URL}/functions/v1/reconcile-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON}`,
          },
          body: JSON.stringify({ trade_no: tradeNo }),
        }).catch(() => {});
      }

      if (order.paid && !order.analysis && !analyzeTriggered) {
        analyzeTriggered = true;
        const loadingEl = document.getElementById('hepan-loading');
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = '<p>\u5df2\u786e\u8ba4\u652f\u4ed8\uff0c\u6b63\u5728\u6d41\u5f0f\u751f\u6210\u62a5\u544a...</p>';
        try {
          const analysis = await triggerHepanAnalyzeByTradeNo(tradeNo, payload, true);
          if (analysis) {
            renderHepanAnalysis(analysis);
            clearPendingTradeNo();
            clearCachedOrderPayload(tradeNo);
            return;
          }
        } catch (e) {
          console.warn('trigger hepan stream analyze failed:', e);
          try {
            const analysis = await triggerHepanAnalyzeByTradeNo(tradeNo, payload, false);
            if (analysis) {
              renderHepanAnalysis(analysis);
              clearPendingTradeNo();
              clearCachedOrderPayload(tradeNo);
              return;
            }
          } catch (e2) {
            console.warn('trigger hepan sync analyze failed:', e2);
          }
        }
      }
    } catch (err) {
      console.warn('poll hepan order failed:', err);
    }
  }

  showHepanError('\u652f\u4ed8\u5df2\u5b8c\u6210\uff0c\u4f46\u62a5\u544a\u4ecd\u5728\u751f\u6210\u4e2d\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002');
}

function showPaidLoadingState() {
  document.getElementById('result-section').style.display = 'block';
  if (form) form.style.display = 'none';
  document.getElementById('pay-card').style.display = 'none';
  document.getElementById('hepan-content').style.display = 'none';
  const loadingEl = document.getElementById('hepan-loading');
  loadingEl.style.display = 'block';
  loadingEl.innerHTML = '<p>\u5df2\u786e\u8ba4\u652f\u4ed8\uff0c\u6b63\u5728\u751f\u6210\u5408\u76d8\u62a5\u544a\uff0c\u8bf7\u7a0d\u5019...</p>';
}

function getTradeNoFromLocation() {
  const p = new URLSearchParams(window.location.search);
  let tradeNo = (p.get('trade_no') || '').trim();
  if (!tradeNo && window.location.hash) {
    const hp = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    tradeNo = (hp.get('trade_no') || '').trim();
  }
  return tradeNo;
}

async function resumeOrderIfNeeded() {
  const tradeNo = getTradeNoFromLocation() || getPendingTradeNo();
  if (!tradeNo) return;

  const cachedPayload = readOrderPayload(tradeNo);
  hydratePreviewFromPayload(cachedPayload);
  showPaidLoadingState();
  await pollPaidHepanOrder(tradeNo);
}

ensurePayButtonDefaults();
resumeOrderIfNeeded();
