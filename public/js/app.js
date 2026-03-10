// js/app.js

const SUPABASE_URL  = 'https://rcyssrsnalefzhzsvswm.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';

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
      paid: 'false',           // 标记为免费模式
    });
    window.location.href = `result.html?${params}`;
  });

  // 付费按钮点击事件
  const paidBtn = document.getElementById('paid-btn');
  if (paidBtn) {
    paidBtn.addEventListener('click', () => {
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

      // 直接跳转支付
      paidBtn.disabled = true;
      paidBtn.textContent = '正在跳转...';
      startPayment({ year, month, day, hour: solarHour, gender, birthplace }, bazi);
    });
  }
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
  if (cachedFull) {
    showAnalysis(cachedFull, true);
  } else if (cached) {
    showAnalysis(cached);
  } else if (!isPaidMode) {
    // 非付费模式：自动触发分析（免费模式）
    autoAnalyze({ year, month, day, hour, gender, birthplace }, bazi, daYunData, specialYears);
  } else {
    // 付费模式：显示付费提示
    const locked = document.getElementById('analysis-locked');
    if (locked) locked.style.display = 'block';
  }

  // 付款按钮（跳转虎皮椒支付）
  const payBtn = document.getElementById('pay-btn');
  if (payBtn) {
    payBtn.addEventListener('click', () => {
      payBtn.disabled = true;
      payBtn.textContent = '正在跳转...';
      startPayment({ year, month, day, hour, gender, birthplace }, bazi);
    });
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
        birth_input: JSON.stringify({ ...birthData, bazi_str: baziStr }),
      }),
    });
  } catch (err) {
    console.error('订单创建失败，继续跳转支付:', err);
  }

  const callbackUrl = location.href.split('?')[0]
    + '?' + new URLSearchParams({ ...birthData, trade_no: tradeNo, paid: 'true' });

  // 跳转迅虎支付收款页（调试模式：0.01元）
  const params = new URLSearchParams({
    appid:      HUPI_APPID,
    title:      '八字AI深度解读',
    total_fee:  '0.01', // 调试模式设置为 0.01 元
    trade_no:   tradeNo,
    notify_url: `${SUPABASE_URL}/functions/v1/payment-callback`,
    return_url: callbackUrl,
    time:       Math.floor(Date.now() / 1000),
  });
  window.location.href = `https://api.xunhupay.com/payment/do.html?${params}`;
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

const DISCLAIMER = '\n\n以上内容为传统文化推演，仅供参考，请理性看待，切勿迷信。';

function showAnalysis(text, hidePay = false) {
  document.getElementById('analysis-locked').style.display  = 'none';
  document.getElementById('analysis-loading').style.display = 'none';
  document.getElementById('analysis-content').style.display = 'block';
  document.getElementById('analysis-text').textContent = text + DISCLAIMER;
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
async function fullAnalyze(birthData, bazi, daYunData, specialYears) {
  const currentYear = new Date().getFullYear();
  const loading = document.getElementById('analysis-loading');
  const content = document.getElementById('analysis-content');
  const payPrompt = document.getElementById('pay-prompt');
  if (content) content.style.display = 'none';
  if (payPrompt) payPrompt.style.display = 'none';
  if (loading) loading.style.display = 'block';

  const baziStr = `${bazi.year.tg}${bazi.year.dz}年 ${bazi.month.tg}${bazi.month.dz}月 ${bazi.day.tg}${bazi.day.dz}日 ${bazi.hour.tg}${bazi.hour.dz}时`;
  const fullCacheKey = `bazi_full_${birthData.year}_${birthData.month}_${birthData.day}_${birthData.hour}_${birthData.gender}`;
  const dayunText = daYunData.dayuns.map(d => `${d.gz}（${d.ageStart}岁起，${d.yearStart}年）`).join('、');
  const specialText = specialYears.length
    ? specialYears.map(s => `${s.year}年${s.gz}（${s.year < currentYear ? '已过' : s.year === currentYear ? '今年' : '未来'}）：${s.reasons.join('；')}`).join('\n')
    : '一生中无明显天克地冲或岁运并临年份';

  const analysisText = document.getElementById('analysis-text');

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
      body: JSON.stringify({
        year: birthData.year, month: birthData.month, day: birthData.day, hour: birthData.hour,
        gender: birthData.gender, birthplace: birthData.birthplace || '',
        bazi_str: baziStr, dayun_text: dayunText, special_years_text: specialText,
        start_age: daYunData.startAge,
      }),
    });

    if (!res.ok || !res.body) {
      if (loading) loading.innerHTML = '<p>解读获取失败，请刷新重试</p>';
      return;
    }

    // 切换到流式显示
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
    if (analysisText) analysisText.textContent = '';

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
            if (analysisText) analysisText.textContent = fullText;
          }
        } catch {}
      }
    }

    if (fullText) {
      const cleaned = fullText
        .replace(/#{1,6}\s*/g, '').replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
        .replace(/^\s*[-–—>]\s*/gm, '').replace(/由\s*DeepSeek\s*生成.*$/gis, '')
        .replace(/Powered by DeepSeek.*$/gis, '').replace(/\n{3,}/g, '\n\n').trim();
      localStorage.setItem(fullCacheKey, cleaned);
      showAnalysis(cleaned, true);
    } else {
      if (loading) { loading.style.display = 'block'; loading.innerHTML = '<p>解读获取失败，请刷新重试</p>'; }
      if (content) content.style.display = 'none';
    }
  } catch (err) {
    if (loading) loading.innerHTML = `<p>网络错误：${err?.message || err}，请刷新重试</p>`;
  }
}

// ── 免费自动分析 ───────────────────────────────────────────────────
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
        free_only: true,
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
  } catch (err) {
    if (loading) loading.innerHTML = `<p>网络错误：${err?.message || err}，请刷新重试</p>`;
  }
}
