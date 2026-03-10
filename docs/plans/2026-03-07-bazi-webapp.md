# 八字算命网站 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个付费八字算命网站，用户输入生辰八字后免费查看基础排盘，付费后获取 Claude AI 深度命理解读。

**Architecture:** 纯静态前端（HTML/CSS/JS）直接托管，无需构建工具。Supabase Edge Functions 处理后端逻辑（Claude API 调用 + 支付验证）。虎皮椒收款，用户付款后回调解锁 AI 解读。

**Tech Stack:** HTML5, CSS3, Vanilla JS, Supabase (PostgreSQL + Edge Functions Deno), Claude API (claude-sonnet-4-6), 虎皮椒支付

---

## 文件结构总览

```
bazi-app/
├── public/
│   ├── index.html          # 首页：输入生辰
│   └── result.html         # 结果页：八字排盘 + 付费解读
├── css/
│   └── style.css           # 全站样式
├── js/
│   ├── bazi.js             # 八字计算核心逻辑
│   └── app.js              # 页面交互 + API 调用
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql    # orders 表
│   └── functions/
│       ├── analyze/
│       │   └── index.ts    # Claude API 分析
│       └── payment-callback/
│           └── index.ts    # 虎皮椒回调验签
└── docs/plans/
    └── 2026-03-07-bazi-webapp.md
```

---

### Task 1: 数据库 migrations

**Files:**
- Create: `supabase/migrations/001_init.sql`

**Step 1: 写 SQL**

```sql
-- supabase/migrations/001_init.sql
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  trade_no text unique not null,       -- 虎皮椒订单号
  birth_input text not null,           -- 用户输入的生辰（JSON）
  paid boolean default false,
  analysis text,                        -- Claude 分析结果（付费后写入）
  created_at timestamptz default now()
);

-- 允许前端匿名查询自己的订单（按 trade_no）
alter table orders enable row level security;
create policy "anyone can read own order" on orders
  for select using (true);
create policy "edge functions can insert" on orders
  for insert with check (true);
create policy "edge functions can update" on orders
  for update using (true);
```

**Step 2: 在 Supabase Dashboard 执行**

打开 Supabase 项目 → SQL Editor → 粘贴上面 SQL → Run

**Step 3: 确认表已建好**

在 Table Editor 里看到 `orders` 表即完成。

---

### Task 2: 八字计算核心逻辑

**Files:**
- Create: `js/bazi.js`

**Step 1: 了解算法**

八字四柱：
- 年柱：天干 = `(year - 4) % 10`，地支 = `(year - 4) % 12`
- 月柱：按节气月（用节气对应月支，天干由年干五虎遁月法推算）
- 日柱：用儒略日数公式推算，参考基准日
- 时柱：地支按每2小时一时辰，天干由日干五鼠遁时法推算

**Step 2: 写 bazi.js**

```javascript
// js/bazi.js

const TIANGAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DIZHI   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const WUXING  = {
  '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土',
  '己':'土','庚':'金','辛':'金','壬':'水','癸':'水',
  '子':'水','丑':'土','寅':'木','卯':'木','辰':'土',
  '巳':'火','午':'火','未':'土','申':'金','酉':'金',
  '戌':'土','亥':'水'
};

// 节气月份对应地支（寅月=1月节，依次类推）
// 节气数据：[month, day] 近似值（实际应查万年历，此处用近似）
const JIEQI = [
  null,           // index 0 unused
  [2, 4],         // 立春 寅月开始
  [3, 6],         // 惊蛰 卯月
  [4, 5],         // 清明 辰月
  [5, 6],         // 立夏 巳月
  [6, 6],         // 芒种 午月
  [7, 7],         // 小暑 未月
  [8, 7],         // 立秋 申月
  [9, 8],         // 白露 酉月
  [10, 8],        // 寒露 戌月
  [11, 7],        // 立冬 亥月
  [12, 7],        // 大雪 子月
  [1, 6],         // 小寒 丑月（次年）
];

// 五虎遁年起月法：年干 -> 寅月天干索引
const NIUGAN_TO_YINMONTH = {0:2, 1:4, 2:6, 3:8, 4:0, 5:2, 6:4, 7:6, 8:8, 9:0};

// 五鼠遁日起时法：日干 -> 子时天干索引
const RIGAN_TO_ZISHI = {0:0, 1:2, 2:4, 3:6, 4:8, 5:0, 6:2, 7:4, 8:6, 9:8};

/**
 * 计算年柱
 */
function getYearPillar(year) {
  const tgIdx = ((year - 4) % 10 + 10) % 10;
  const dzIdx = ((year - 4) % 12 + 12) % 12;
  return { tg: TIANGAN[tgIdx], dz: DIZHI[dzIdx], tgIdx, dzIdx };
}

/**
 * 计算月柱（按节气）
 */
function getMonthPillar(year, month, day, yearTgIdx) {
  // 确定月支索引（寅=0, 卯=1, ... 丑=11）
  let lunarMonthOffset = month - 2; // 寅月对应公历2月立春后
  // 检查是否过了当月节气
  const jieqiOfMonth = JIEQI[month === 1 ? 12 : month];
  if (jieqiOfMonth && day < jieqiOfMonth[1]) {
    lunarMonthOffset -= 1;
  }
  const dzIdx = ((lunarMonthOffset % 12) + 12) % 12 + 2; // 寅=2
  const monthDzIdx = dzIdx % 12;

  // 月天干：五虎遁月
  const yinMonthTgIdx = NIUGAN_TO_YINMONTH[yearTgIdx % 10];
  const tgIdx = (yinMonthTgIdx + monthDzIdx - 2 + 12) % 10;

  return { tg: TIANGAN[(tgIdx + 10) % 10], dz: DIZHI[monthDzIdx], tgIdx: (tgIdx+10)%10, dzIdx: monthDzIdx };
}

/**
 * 计算日柱（儒略日算法）
 */
function getDayPillar(year, month, day) {
  // 儒略日数
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y
    + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // 基准：2000-01-07 日柱 甲子（jdn=2451551, tg=0, dz=0）
  const BASE_JDN = 2451551;
  const diff = jdn - BASE_JDN;
  const tgIdx = ((diff % 10) + 10) % 10;
  const dzIdx = ((diff % 12) + 12) % 12;
  return { tg: TIANGAN[tgIdx], dz: DIZHI[dzIdx], tgIdx, dzIdx };
}

/**
 * 计算时柱
 */
function getHourPillar(hour, dayTgIdx) {
  // 时支：子时=0, 丑时=1 ...（每2小时）
  const dzIdx = Math.floor((hour + 1) / 2) % 12;
  const ziShiTgIdx = RIGAN_TO_ZISHI[dayTgIdx % 10];
  const tgIdx = (ziShiTgIdx + dzIdx) % 10;
  return { tg: TIANGAN[tgIdx], dz: DIZHI[dzIdx], tgIdx, dzIdx };
}

/**
 * 五行统计
 */
function getWuxingCount(pillars) {
  const count = { 木:0, 火:0, 土:0, 金:0, 水:0 };
  pillars.forEach(p => {
    count[WUXING[p.tg]]++;
    count[WUXING[p.dz]]++;
  });
  return count;
}

/**
 * 主函数：输入生日，返回八字
 * @param {number} year
 * @param {number} month  1-12
 * @param {number} day
 * @param {number} hour   0-23
 * @returns {{ year, month, day, hour, wuxing }}
 */
function calculateBazi(year, month, day, hour) {
  const yearPillar  = getYearPillar(year);
  const monthPillar = getMonthPillar(year, month, day, yearPillar.tgIdx);
  const dayPillar   = getDayPillar(year, month, day);
  const hourPillar  = getHourPillar(hour, dayPillar.tgIdx);
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const wuxing = getWuxingCount(pillars);
  return { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar, wuxing };
}

// 导出（浏览器全局）
window.BaziCalc = { calculateBazi, WUXING, TIANGAN, DIZHI };
```

**Step 3: 手动验证**

在浏览器控制台运行：
```javascript
BaziCalc.calculateBazi(1988, 9, 16, 10)
// 预期：戊辰年 壬戌月（约） 甲午日 戊午时（近似）
```

---

### Task 3: 首页 HTML

**Files:**
- Create: `public/index.html`

**Step 1: 写 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>八字命理 - 免费排盘 AI 深度解读</title>
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>八字命理</h1>
      <p class="subtitle">输入生辰，免费排盘，AI 深度解读</p>
    </header>

    <main>
      <form id="bazi-form" class="form-card">
        <div class="form-group">
          <label>出生年份</label>
          <input type="number" id="year" min="1900" max="2100" placeholder="例：1990" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>月</label>
            <select id="month" required>
              <option value="">月</option>
              <option value="1">1月</option><option value="2">2月</option>
              <option value="3">3月</option><option value="4">4月</option>
              <option value="5">5月</option><option value="6">6月</option>
              <option value="7">7月</option><option value="8">8月</option>
              <option value="9">9月</option><option value="10">10月</option>
              <option value="11">11月</option><option value="12">12月</option>
            </select>
          </div>
          <div class="form-group">
            <label>日</label>
            <input type="number" id="day" min="1" max="31" placeholder="日" required>
          </div>
          <div class="form-group">
            <label>时辰</label>
            <select id="hour" required>
              <option value="">时辰</option>
              <option value="23">子时 23-01</option>
              <option value="1">丑时 01-03</option>
              <option value="3">寅时 03-05</option>
              <option value="5">卯时 05-07</option>
              <option value="7">辰时 07-09</option>
              <option value="9">巳时 09-11</option>
              <option value="11">午时 11-13</option>
              <option value="13">未时 13-15</option>
              <option value="15">申时 15-17</option>
              <option value="17">酉时 17-19</option>
              <option value="19">戌时 19-21</option>
              <option value="21">亥时 21-23</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>性别</label>
          <div class="radio-group">
            <label><input type="radio" name="gender" value="男" required> 男</label>
            <label><input type="radio" name="gender" value="女"> 女</label>
          </div>
        </div>
        <button type="submit" class="btn-primary">免费排盘</button>
      </form>
    </main>
  </div>

  <script src="../js/bazi.js"></script>
  <script src="../js/app.js"></script>
</body>
</html>
```

---

### Task 4: 结果页 HTML

**Files:**
- Create: `public/result.html`

**Step 1: 写 result.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>八字排盘结果</title>
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <div class="container">
    <header>
      <a href="index.html" class="back-link">← 重新排盘</a>
      <h1>八字排盘</h1>
    </header>

    <main>
      <!-- 四柱表格 -->
      <section class="card" id="bazi-table-section">
        <h2>四柱八字</h2>
        <div class="bazi-table">
          <div class="pillar">
            <div class="pillar-label">时柱</div>
            <div class="tiangan" id="hour-tg"></div>
            <div class="dizhi"   id="hour-dz"></div>
          </div>
          <div class="pillar">
            <div class="pillar-label">日柱</div>
            <div class="tiangan" id="day-tg"></div>
            <div class="dizhi"   id="day-dz"></div>
          </div>
          <div class="pillar">
            <div class="pillar-label">月柱</div>
            <div class="tiangan" id="month-tg"></div>
            <div class="dizhi"   id="month-dz"></div>
          </div>
          <div class="pillar">
            <div class="pillar-label">年柱</div>
            <div class="tiangan" id="year-tg"></div>
            <div class="dizhi"   id="year-dz"></div>
          </div>
        </div>
      </section>

      <!-- 五行统计 -->
      <section class="card">
        <h2>五行分析</h2>
        <div class="wuxing-bars" id="wuxing-bars"></div>
      </section>

      <!-- 付费 AI 解读区 -->
      <section class="card card-premium" id="analysis-section">
        <h2>AI 深度命理解读</h2>
        <div id="analysis-locked">
          <p class="price-desc">由 Claude AI 为您分析日主强弱、用神喜忌、性格财运</p>
          <p class="price">¥9.9</p>
          <button class="btn-primary" id="pay-btn">立即解锁</button>
        </div>
        <div id="analysis-content" style="display:none">
          <div id="analysis-text" class="analysis-text"></div>
        </div>
        <div id="analysis-loading" style="display:none">
          <p>AI 正在分析中...</p>
        </div>
      </section>
    </main>
  </div>

  <script src="../js/bazi.js"></script>
  <script src="../js/app.js"></script>
</body>
</html>
```

---

### Task 5: CSS 样式

**Files:**
- Create: `css/style.css`

**Step 1: 写 style.css**

```css
/* css/style.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --gold: #c9a84c;
  --dark: #1a1a2e;
  --dark2: #16213e;
  --card: #0f3460;
  --text: #e0e0e0;
  --text-muted: #a0a0b0;
  --red: #e94560;
}

body {
  background: var(--dark);
  color: var(--text);
  font-family: 'Noto Serif SC', 'SimSun', serif;
  min-height: 100vh;
}

.container { max-width: 640px; margin: 0 auto; padding: 24px 16px; }

header { text-align: center; margin-bottom: 32px; }
header h1 { font-size: 2rem; color: var(--gold); letter-spacing: 4px; }
.subtitle { color: var(--text-muted); margin-top: 8px; }
.back-link { color: var(--gold); text-decoration: none; display: block; margin-bottom: 12px; }

.card, .form-card {
  background: var(--card);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  border: 1px solid rgba(201,168,76,0.2);
}
.card h2 { color: var(--gold); margin-bottom: 16px; font-size: 1.1rem; letter-spacing: 2px; }
.card-premium { border-color: var(--gold); }

/* Form */
.form-group { margin-bottom: 16px; }
.form-group label { display: block; color: var(--gold); margin-bottom: 6px; font-size: 0.9rem; }
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
input[type=number], select {
  width: 100%; padding: 10px 12px;
  background: var(--dark2); border: 1px solid rgba(201,168,76,0.3);
  border-radius: 8px; color: var(--text); font-size: 1rem;
}
.radio-group { display: flex; gap: 24px; padding-top: 4px; }
.radio-group label { color: var(--text); cursor: pointer; }

.btn-primary {
  width: 100%; padding: 14px;
  background: linear-gradient(135deg, var(--gold), #a07830);
  border: none; border-radius: 8px;
  color: #fff; font-size: 1.1rem; font-weight: bold;
  cursor: pointer; letter-spacing: 2px; margin-top: 8px;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.85; }

/* 四柱表格 */
.bazi-table { display: flex; justify-content: center; gap: 8px; }
.pillar {
  flex: 1; text-align: center;
  background: var(--dark2); border-radius: 8px; padding: 12px 4px;
  border: 1px solid rgba(201,168,76,0.2);
}
.pillar-label { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; }
.tiangan { font-size: 1.8rem; color: var(--gold); font-weight: bold; }
.dizhi   { font-size: 1.8rem; color: var(--text); margin-top: 4px; }

/* 五行 */
.wuxing-bars { display: flex; flex-direction: column; gap: 10px; }
.wuxing-row { display: flex; align-items: center; gap: 10px; }
.wuxing-name { width: 24px; text-align: center; font-size: 0.9rem; }
.wuxing-bar-bg { flex: 1; background: var(--dark2); border-radius: 4px; height: 18px; overflow: hidden; }
.wuxing-bar { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
.wuxing-count { width: 20px; text-align: right; font-size: 0.85rem; color: var(--text-muted); }
.wx-木 { background: #4caf50; } .wx-火 { background: #f44336; }
.wx-土 { background: #ff9800; } .wx-金 { background: #9e9e9e; }
.wx-水 { background: #2196f3; }

/* AI 解读 */
.price-desc { color: var(--text-muted); margin-bottom: 12px; line-height: 1.6; }
.price { font-size: 2rem; color: var(--red); font-weight: bold; margin-bottom: 16px; }
.analysis-text { line-height: 2; color: var(--text); white-space: pre-wrap; }
```

---

### Task 6: 前端 JS 交互逻辑

**Files:**
- Create: `js/app.js`

**Step 1: 写 app.js**

```javascript
// js/app.js

const SUPABASE_URL    = '__SUPABASE_URL__';
const SUPABASE_ANON   = '__SUPABASE_ANON_KEY__';
const HUPI_APPID      = '__HUPI_APPID__';

// ── 首页逻辑 ──────────────────────────────────────────────────────
const form = document.getElementById('bazi-form');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const year   = parseInt(document.getElementById('year').value);
    const month  = parseInt(document.getElementById('month').value);
    const day    = parseInt(document.getElementById('day').value);
    const hour   = parseInt(document.getElementById('hour').value);
    const gender = document.querySelector('input[name=gender]:checked').value;
    const params = new URLSearchParams({ year, month, day, hour, gender });
    window.location.href = `result.html?${params}`;
  });
}

// ── 结果页逻辑 ────────────────────────────────────────────────────
if (document.getElementById('bazi-table-section')) {
  const p = new URLSearchParams(location.search);
  const year   = parseInt(p.get('year'));
  const month  = parseInt(p.get('month'));
  const day    = parseInt(p.get('day'));
  const hour   = parseInt(p.get('hour'));
  const gender = p.get('gender');

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
    payBtn.addEventListener('click', () => startPayment({ year, month, day, hour, gender }));
  }

  // 检查 URL 中是否有回调参数（支付成功后跳回）
  const tradeNo = p.get('trade_no');
  if (tradeNo) {
    pollForAnalysis(tradeNo, cacheKey, { year, month, day, hour, gender });
  }
}

// ── 支付 ──────────────────────────────────────────────────────────
async function startPayment(birthData) {
  // 1. 先在 Supabase 建立订单
  const tradeNo = 'bazi_' + Date.now();
  const callbackUrl = location.href.split('?')[0]
    + `?${new URLSearchParams({ ...birthData, trade_no: tradeNo })}`;

  // 2. 跳转虎皮椒收款页（GET 方式）
  const params = new URLSearchParams({
    appid:     HUPI_APPID,
    title:     '八字AI深度解读',
    total_fee: '9.9',
    trade_no:  tradeNo,
    notify_url: `${SUPABASE_URL}/functions/v1/payment-callback`,
    return_url: callbackUrl,
    time:      Math.floor(Date.now() / 1000),
  });
  // 注：实际需要在后端生成 sign，此处先跳转展示流程
  window.location.href = `https://pay.hupijiao.com/api/pay/index?${params}`;
}

// ── 轮询等待分析结果 ──────────────────────────────────────────────
async function pollForAnalysis(tradeNo, cacheKey, birthData) {
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
```

**Step 2: 替换占位符**

`app.js` 里的 `__SUPABASE_URL__`、`__SUPABASE_ANON_KEY__`、`__HUPI_APPID__` 从 `.env.local` 读取，在 Task 9 统一替换。

---

### Task 7: Supabase Edge Function - analyze

**Files:**
- Create: `supabase/functions/analyze/index.ts`

**Step 1: 写 index.ts**

```typescript
// supabase/functions/analyze/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const anthropic = new Anthropic({ apiKey: Deno.env.get('CLAUDE_API_KEY')! });

Deno.serve(async (req) => {
  const { trade_no, year, month, day, hour, gender, bazi_str } = await req.json();

  const prompt = `你是一位精通四柱八字命理的命理师。请根据以下八字为用户做深度命理分析：

生辰：${year}年${month}月${day}日${hour}时，性别：${gender}
八字：${bazi_str}

请按以下结构分析（每部分2-3句）：
1. 日主分析（日主天干五行、旺衰）
2. 格局判断
3. 用神与喜忌
4. 性格特点
5. 事业财运
6. 感情婚姻
7. 健康注意
8. 人生建议

语言：简体中文，专业而易懂。`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const analysis = message.content[0].type === 'text' ? message.content[0].text : '';

  // 写入数据库
  await supabase.from('orders').update({ analysis }).eq('trade_no', trade_no);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

### Task 8: Supabase Edge Function - payment-callback

**Files:**
- Create: `supabase/functions/payment-callback/index.ts`

**Step 1: 写 index.ts**

```typescript
// supabase/functions/payment-callback/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const body = await req.text();
  const params = new URLSearchParams(body);
  const data = Object.fromEntries(params.entries());

  // 验签（虎皮椒 MD5 签名）
  const appSecret = Deno.env.get('HUPI_APPSECRET')!;
  const { sign, ...rest } = data;
  const sortedStr = Object.keys(rest).sort()
    .map(k => `${k}=${rest[k]}`).join('&') + appSecret;

  const md5 = (s: string) => {
    const enc = new TextEncoder();
    return crypto.subtle.digest('MD5', enc.encode(s))
      .then(buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join(''));
  };
  const expectedSign = await md5(sortedStr);
  if (expectedSign !== sign) {
    return new Response('sign error', { status: 400 });
  }

  const { trade_no, status } = data;
  if (status !== '1') {
    return new Response('not paid', { status: 200 });
  }

  // 更新订单为已支付
  const { data: order } = await supabase
    .from('orders').select('birth_input').eq('trade_no', trade_no).single();

  await supabase.from('orders').update({ paid: true }).eq('trade_no', trade_no);

  // 异步触发 AI 分析
  const birth = JSON.parse(order!.birth_input);
  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
    },
    body: JSON.stringify({ trade_no, ...birth }),
  });

  return new Response('success', { status: 200 });
});
```

---

### Task 9: 写入配置 & 本地测试

**Step 1: 把 .env.local 的值填入 app.js**

打开 `.env.local`，把实际值替换到 `js/app.js` 顶部三个常量：
- `SUPABASE_URL` → 填入 Supabase 项目 URL
- `SUPABASE_ANON_KEY` → 填入 anon key
- `HUPI_APPID` → 填入虎皮椒 appid

**Step 2: 用浏览器直接打开测试**

```bash
# 用 Python 起本地静态服务器
cd /c/Users/tgspc/bazi-app
python -m http.server 8080
```

打开 `http://localhost:8080/public/index.html`

**Step 3: 验证排盘**

- 输入 1990-01-15 午时 男 → 提交 → 检查四柱是否正确
- 检查五行条形图是否渲染

**Step 4: Commit**

```bash
cd /c/Users/tgspc/bazi-app
git add .
git commit -m "feat: complete frontend + supabase functions"
```

---

### Task 10: 部署 Supabase Functions

**Step 1: 安装 Supabase CLI（如未安装）**

```bash
npm install -g supabase
```

**Step 2: 登录并关联项目**

```bash
cd /c/Users/tgspc/bazi-app
supabase login
supabase link --project-ref <your-project-ref>
```

**Step 3: 设置环境变量**

```bash
supabase secrets set CLAUDE_API_KEY=<your-key>
supabase secrets set HUPI_APPSECRET=<your-secret>
supabase secrets set SUPABASE_ANON_KEY=<your-anon-key>
```

**Step 4: 部署 Functions**

```bash
supabase functions deploy analyze
supabase functions deploy payment-callback
```

**Step 5: 测试 analyze function**

```bash
curl -X POST https://<project>.supabase.co/functions/v1/analyze \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"trade_no":"test001","year":1990,"month":1,"day":15,"hour":11,"gender":"男","bazi_str":"己巳年 丁丑月 庚子日 午时"}'
```

---

### Task 11: 部署前端（可选）

**选项 A: Vercel（推荐）**

```bash
npm install -g vercel
cd /c/Users/tgspc/bazi-app
vercel --public
```

**选项 B: GitHub Pages**

在 GitHub 建仓库，把 `public/`、`css/`、`js/` 推上去，启用 Pages。

**注意：** `app.js` 里 Supabase URL 和 key 是明文在前端，anon key 是公开安全的，不要把 service role key 放前端。

---

## 完成标准

- [ ] `http://localhost:8080/public/index.html` 可输入生辰提交
- [ ] result.html 正确显示四柱八字和五行图
- [ ] 点击付款跳转虎皮椒
- [ ] 支付成功后轮询到 AI 解读并展示
