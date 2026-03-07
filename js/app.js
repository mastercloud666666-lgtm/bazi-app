// js/app.js

const SUPABASE_URL  = '__SUPABASE_URL__';
const SUPABASE_ANON = '__SUPABASE_ANON_KEY__';
const HUPI_APPID    = '__HUPI_APPID__';

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

  form.addEventListener('submit', e => {
    e.preventDefault();
    let year   = parseInt(document.getElementById('year').value);
    let month  = parseInt(document.getElementById('month').value);
    let day    = parseInt(document.getElementById('day').value);
    const hour       = parseInt(document.getElementById('hour').value);
    const gender     = document.querySelector('input[name=gender]:checked').value;
    const birthplace = document.getElementById('birthplace').value;
    const caltype    = document.querySelector('input[name=caltype]:checked').value;

    if (caltype === 'lunar') {
      // 农历转阳历
      const isLeap = document.getElementById('is-leap').checked;
      try {
        const lunar = Lunar.fromYmd(year, month, day);
        // lunar-javascript: 闰月需用 LunarMonth.fromYm(y,m).isLeap()
        const solar = isLeap
          ? Lunar.fromYmd(year, -month, day).getSolar()  // 负数月表示闰月
          : lunar.getSolar();
        year  = solar.getYear();
        month = solar.getMonth();
        day   = solar.getDay();
      } catch (err) {
        alert('农历日期转换失败，请检查输入是否正确');
        return;
      }
    }

    const params = new URLSearchParams({ year, month, day, hour, gender, birthplace });
    window.location.href = `result.html?${params}`;
  });
}

// ── 结果页逻辑 ────────────────────────────────────────────────────
if (document.getElementById('bazi-table-section')) {
  const p          = new URLSearchParams(location.search);
  const year       = parseInt(p.get('year'));
  const month      = parseInt(p.get('month'));
  const day        = parseInt(p.get('day'));
  const hour       = parseInt(p.get('hour'));
  const gender     = p.get('gender');
  const birthplace = p.get('birthplace') || '';

  // 渲染出生信息摘要
  const hourLabels = {23:'子',1:'丑',3:'寅',5:'卯',7:'辰',9:'巳',11:'午',13:'未',15:'申',17:'酉',19:'戌',21:'亥'};
  const birthInfo = document.getElementById('birth-info');
  if (birthInfo) {
    birthInfo.textContent = `${year}年${month}月${day}日 ${hourLabels[hour] || ''}时　${gender}${birthplace ? '　' + birthplace : ''}`;
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

  // 检查是否已付费（localStorage 缓存）
  const cacheKey = `bazi_${year}_${month}_${day}_${hour}`;
  const cached   = localStorage.getItem(cacheKey);
  if (cached) {
    showAnalysis(cached);
  }

  // 付款按钮
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
