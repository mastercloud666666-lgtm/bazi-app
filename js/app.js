// js/app.js

const SUPABASE_URL  = 'https://rcyssrsnalefzhzsvswm.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
const HUPI_APPID    = '__HUPI_APPID__';

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
    });
    window.location.href = `result.html?${params}`;
  });
}

// ── 结果页逻辑 ────────────────────────────────────────────────────
if (document.getElementById('bazi-table-section')) {
  const p          = new URLSearchParams(location.search);
  const year       = parseInt(p.get('year'));
  const month      = parseInt(p.get('month'));
  const day        = parseInt(p.get('day'));
  const hour       = parseInt(p.get('hour'));       // 真太阳时校正后
  const inputHour  = parseInt(p.get('inputHour')); // 原始输入
  const gender     = p.get('gender');
  const birthplace = p.get('birthplace') || '';
  const lon        = p.get('lon') || '';

  // 渲染出生信息摘要
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

  // 计算大运和特殊流年
  const daYunData  = BaziCalc.calculateDaYun(bazi.year, bazi.month, gender, year, month, day);
  const currentYear = new Date().getFullYear();
  const specialYears = BaziCalc.calcSpecialYears(bazi, daYunData.dayuns, year, currentYear, 10);

  // 渲染大运表格
  renderDaYun(daYunData, currentYear, year);

  // 渲染特殊年份
  renderSpecialYears(specialYears);

  // 检查 localStorage 缓存
  const cacheKey = `bazi_${year}_${month}_${day}_${hour}_${gender}`;
  const cached   = localStorage.getItem(cacheKey);
  if (cached) {
    showAnalysis(cached);
  } else {
    // 自动触发分析（免费模式）
    autoAnalyze({ year, month, day, hour, gender, birthplace }, bazi, daYunData, specialYears);
  }

  // 付款按钮（付费模式预留）
  const payBtn = document.getElementById('pay-btn');
  if (payBtn) {
    payBtn.addEventListener('click', () => startPayment({ year, month, day, hour, gender }, bazi));
  }

  // 检查 URL 中是否有回调参数（支付成功后跳回）
  const tradeNo = p.get('trade_no');
  if (tradeNo) {
    pollForAnalysis(tradeNo, cacheKey);
  }
}

// ── 支付 ──────────────────────────────────────────────────────────
async function startPayment(birthData, bazi) {
  const tradeNo = 'bazi_' + Date.now();
  const baziStr = `${bazi.year.tg}${bazi.year.dz}年 ${bazi.month.tg}${bazi.month.dz}月 ${bazi.day.tg}${bazi.day.dz}日 ${bazi.hour.tg}${bazi.hour.dz}时`;

  // 先在 Supabase 插入订单记录
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
      birth_input: JSON.stringify({ ...birthData, bazi_str: baziStr }),
    }),
  });

  const callbackUrl = location.href.split('?')[0]
    + '?' + new URLSearchParams({ ...birthData, trade_no: tradeNo });

  // 跳转虎皮椒收款页
  const params = new URLSearchParams({
    appid:      HUPI_APPID,
    title:      '八字AI深度解读',
    total_fee:  '9.9',
    trade_no:   tradeNo,
    notify_url: `${SUPABASE_URL}/functions/v1/payment-callback`,
    return_url: callbackUrl,
    time:       Math.floor(Date.now() / 1000),
  });
  window.location.href = `https://pay.hupijiao.com/api/pay/index?${params}`;
}

// ── 轮询等待分析结果 ──────────────────────────────────────────────
async function pollForAnalysis(tradeNo, cacheKey) {
  document.getElementById('analysis-locked').style.display  = 'none';
  document.getElementById('analysis-loading').style.display = 'block';

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?trade_no=eq.${tradeNo}&select=paid,analysis`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }}
    );
    const [order] = await res.json();
    if (order?.paid && order?.analysis) {
      localStorage.setItem(cacheKey, order.analysis);
      showAnalysis(order.analysis);
      return;
    }
  }
  document.getElementById('analysis-loading').innerHTML = '<p>查询超时，请刷新页面重试</p>';
}

function showAnalysis(text) {
  document.getElementById('analysis-locked').style.display  = 'none';
  document.getElementById('analysis-loading').style.display = 'none';
  document.getElementById('analysis-content').style.display = 'block';
  document.getElementById('analysis-text').textContent = text;
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
function renderSpecialYears(specialYears) {
  const el = document.getElementById('special-years-section');
  if (!el) return;
  if (!specialYears.length) {
    el.innerHTML = '<p class="price-desc">未来10年内无天克地冲或岁运并临年份</p>';
    return;
  }
  let html = '';
  specialYears.forEach(s => {
    html += `<div class="special-year-item">
      <span class="special-year-tag">${s.year}年 ${s.gz}</span>
      ${s.reasons.map(r => `<span class="special-year-reason">${r}</span>`).join('')}
    </div>`;
  });
  el.innerHTML = html;
}

// ── 免费自动分析 ───────────────────────────────────────────────────
async function autoAnalyze(birthData, bazi, daYunData, specialYears) {
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
      ? specialYears.map(s => `${s.year}年${s.gz}：${s.reasons.join('；')}`).join('\n')
      : '未来8年内无明显天克地冲或岁运并临年份';

    const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        year: birthData.year, month: birthData.month,
        day: birthData.day, hour: birthData.hour,
        gender: birthData.gender,
        birthplace: birthData.birthplace || '',
        bazi_str: baziStr,
        dayun_text: dayunText,
        special_years_text: specialText,
        start_age: daYunData.startAge,
      }),
    });
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
      if (loading) loading.innerHTML = '<p>解读获取失败，请刷新重试</p>';
    }
  } catch {
    if (loading) loading.innerHTML = '<p>网络错误，请刷新重试</p>';
  }
}
