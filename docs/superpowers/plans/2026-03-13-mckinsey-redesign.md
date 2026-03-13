# McKinsey 风格全站重设计 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 bazi app 全部页面统一为 McKinsey 风格（白底、深蓝/蓝色配色、Noto Sans SC），替换旧暗色 style.css 主题。

**Architecture:** 方案 B（共享 CSS）。将 index.html 的设计系统提取到 `public/css/mckinsey-style.css`，所有页面共用此文件，各页面仅保留少量页面独有样式。所有 JavaScript 逻辑和 HTML ID 完整保留。

**Tech Stack:** 纯 HTML + CSS（无构建工具），Google Fonts（Inter + Noto Sans SC），SVG 图标

---

## File Map

| 操作 | 文件 | 说明 |
|------|------|------|
| 扩展 | `public/css/mckinsey-style.css` | 提取共享组件：navbar、btn、form、card、util |
| 重写 | `public/result.html` | 结果页面，保留所有 JS ID |
| 重写 | `public/hepan.html` | 合盘页，保留所有 JS ID |
| 重写 | `public/qiming.html` | 起名页 |
| 重写 | `public/zhanbu.html` | 占卜页 |
| 重写 | `public/fengshui.html` | 风水页 |
| 更新 | `public/payment-success.html` | 支付成功页，改为亮色主题 |

---

## Chunk 1: 共享 CSS 文件

### Task 1: 扩展 mckinsey-style.css

**Files:**
- Modify: `public/css/mckinsey-style.css`

将 index.html 的 `:root`（18行）到响应式媒体查询结束（行 ~850）的通用 CSS 提取出来。需要包含的组件：

1. `:root` 变量
2. Reset（`*`, `html`, `body`）
3. `.navbar` 及其子元素
4. `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-full`（新增：width:100% 全宽按钮变体）
5. `.form-group`, `.form-label`, `.form-row`, `.form-input`, `.form-select`, `.form-toggle`, `.form-toggle-label`, `.form-toggle-input`, `.form-gender`, `.form-gender-label`, `.form-gender-input`, `.form-geo-hint`, `.form-submit`
6. `.section-tag`, `.section-title`, `.section-subtitle`, `.section-header`
7. `.feature-card`, `.feature-icon`, `.feature-title`, `.feature-desc`（备用）
8. 动画 `@keyframes fadeInUp`, `@keyframes fadeInRight`
9. 响应式 `@media (max-width: 768px)` 中涉及 navbar 和 form 的部分

**不需要**提取到共享文件的（index.html 独有）：
- `.hero`, `.hero-inner`, `.hero-form-card`（index.html 专用布局）
- `.features`, `.stats`, `.footer`（index.html 专用 section）

- [ ] **Step 1: 写入 mckinsey-style.css**

用以下内容替换（覆盖）`public/css/mckinsey-style.css` 的全部内容：

```css
/* ══════════════════════════════════════════
   McKINSEY DESIGN SYSTEM — Shared Components
   ══════════════════════════════════════════ */

/* ── VARIABLES ─────────────────────────── */
:root {
  --primary: #0A2540;
  --primary-light: #1E3A5F;
  --accent: #0066CC;
  --accent-hover: #0052A3;
  --bg-white: #FFFFFF;
  --bg-light: #F8F9FA;
  --bg-gray: #E9ECEF;
  --text-dark: #1A1A1A;
  --text-gray: #6C757D;
  --text-light: #ADB5BD;
  --border: #DEE2E6;
  --shadow: rgba(0, 0, 0, 0.1);
  --shadow-hover: rgba(0, 0, 0, 0.15);
  --font-main: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-zh: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-serif: 'Noto Serif SC', serif;
}

/* ── RESET ──────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-zh);
  background: var(--bg-white);
  color: var(--text-dark);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── NAVBAR ─────────────────────────────── */
.navbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  background: var(--bg-white);
  border-bottom: 1px solid var(--border);
  z-index: 1000;
  transition: box-shadow 0.3s ease;
}

.navbar.scrolled {
  box-shadow: 0 2px 20px var(--shadow);
}

.navbar-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.navbar-brand-logo {
  width: 40px; height: 40px;
  background: var(--primary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.navbar-brand-text {
  display: flex;
  flex-direction: column;
}

.navbar-brand-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary);
  line-height: 1;
  letter-spacing: 2px;
}

.navbar-brand-en {
  font-size: 11px;
  color: var(--text-gray);
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-top: 2px;
}

.navbar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.navbar-nav a {
  padding: 8px 16px;
  color: var(--text-dark);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.navbar-nav a:hover,
.navbar-nav a.active {
  background: var(--bg-light);
  color: var(--accent);
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.navbar-lang {
  font-size: 13px;
  color: var(--text-gray);
  cursor: pointer;
  transition: color 0.2s;
}

.navbar-lang:hover { color: var(--accent); }

/* ── BUTTONS ────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 32px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  font-family: var(--font-zh);
}

.btn-primary {
  background: var(--accent);
  color: white;
  box-shadow: 0 4px 14px rgba(0, 102, 204, 0.3);
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 102, 204, 0.4);
}

.btn-secondary {
  background: white;
  color: var(--primary);
  border: 2px solid var(--border);
}

.btn-secondary:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.btn-full { width: 100%; }

/* ── FORM COMPONENTS ────────────────────── */
.form-section {
  padding-top: 72px; /* offset for fixed navbar */
}

.form-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 40px var(--shadow);
  border: 1px solid var(--border);
}

.form-header { margin-bottom: 32px; }

.form-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 8px;
}

.form-subtitle {
  font-size: 14px;
  color: var(--text-gray);
}

.form-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.form-toggle-label {
  flex: 1;
  padding: 10px 16px;
  background: var(--bg-light);
  border: 2px solid var(--border);
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-gray);
  cursor: pointer;
  transition: all 0.2s;
}

.form-toggle-label:hover { border-color: var(--accent); color: var(--accent); }

.form-toggle-label.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.form-toggle-input { display: none; }

.form-group { margin-bottom: 20px; }

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-hint {
  font-weight: 400;
  color: var(--text-light);
  text-transform: none;
  letter-spacing: 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  font-family: var(--font-zh);
  border: 2px solid var(--border);
  border-radius: 8px;
  color: var(--text-dark);
  transition: all 0.2s;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-input::placeholder { color: var(--text-light); }

.form-select {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  font-family: var(--font-zh);
  border: 2px solid var(--border);
  border-radius: 8px;
  color: var(--text-dark);
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  font-family: var(--font-zh);
  border: 2px solid var(--border);
  border-radius: 8px;
  color: var(--text-dark);
  background: white;
  resize: vertical;
  min-height: 100px;
  transition: all 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-gender {
  display: flex;
  gap: 16px;
}

.form-gender-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: var(--text-dark);
  cursor: pointer;
}

.form-gender-input {
  width: 18px; height: 18px;
  accent-color: var(--accent);
}

.form-hint {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 6px;
}

.form-submit {
  width: 100%;
  padding: 14px;
  background: var(--accent);
  color: white;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
  font-family: var(--font-zh);
}

.form-submit:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 102, 204, 0.3);
}

/* ── PAGE LAYOUT ────────────────────────── */
.page-wrapper {
  min-height: 100vh;
  padding-top: 72px;
}

.page-inner {
  max-width: 800px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.page-inner-wide {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

/* ── PAGE HEADER ────────────────────────── */
.page-header {
  margin-bottom: 40px;
}

.page-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1.2;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 16px;
  color: var(--text-gray);
  line-height: 1.6;
}

/* ── CARD ───────────────────────────────── */
.mk-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px var(--shadow);
}

.mk-card-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.mk-card-dot {
  width: 8px; height: 8px;
  background: var(--accent);
  border-radius: 50%;
  flex-shrink: 0;
}

.mk-card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.mk-card-body {
  padding: 24px;
}

/* ── SECTION HEADER ─────────────────────── */
.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 16px;
  letter-spacing: -0.5px;
}

.section-subtitle {
  font-size: 16px;
  color: var(--text-gray);
  max-width: 600px;
  margin: 0 auto;
}

/* ── BACK LINK ──────────────────────────── */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 32px;
  transition: gap 0.2s;
}

.back-link:hover { gap: 10px; }

/* ── LOADING STATE ──────────────────────── */
.loading-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 40px 24px;
  text-align: center;
  display: none;
}

.loading-spinner {
  display: inline-block;
  width: 32px; height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  font-size: 15px;
  color: var(--text-gray);
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── ANALYSIS TEXT ──────────────────────── */
.analysis-text {
  font-size: 15px;
  color: var(--text-dark);
  line-height: 1.9;
}

.analysis-text h1, .analysis-text h2, .analysis-text h3 {
  font-weight: 700;
  color: var(--primary);
  margin: 20px 0 10px;
}

.analysis-text h2 { font-size: 18px; }
.analysis-text h3 { font-size: 16px; }

.analysis-text p { margin-bottom: 12px; }

.analysis-text ul, .analysis-text ol {
  padding-left: 20px;
  margin-bottom: 12px;
}

.analysis-text li { margin-bottom: 6px; }

/* ── PAY CTA ────────────────────────────── */
.pay-card {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  border-radius: 12px;
  padding: 32px;
  color: white;
  margin-top: 8px;
}

.pay-card-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}

.pay-card-sub {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 24px;
  line-height: 1.6;
}

.pay-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 28px;
}

.pay-features span {
  font-size: 13px;
  opacity: 0.85;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.pay-features .span-full {
  grid-column: 1 / -1;
}

.pay-btn {
  display: block;
  width: 100%;
  padding: 16px;
  background: var(--accent);
  color: white;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-zh);
  text-align: center;
}

.pay-btn:hover {
  background: #0052A3;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 102, 204, 0.5);
}

/* ── ANIMATIONS ─────────────────────────── */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(30px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* ── RESPONSIVE ─────────────────────────── */
@media (max-width: 768px) {
  .navbar-inner { padding: 0 16px; height: 64px; }
  .navbar-nav { display: none; }
  .page-inner, .page-inner-wide { padding: 32px 16px 60px; }
  .page-title { font-size: 28px; }
  .form-card { padding: 24px; }
  .form-row { grid-template-columns: 1fr; gap: 12px; }
  .form-row-2 { grid-template-columns: 1fr; gap: 12px; }
  .pay-features { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: 验证文件已写入**

```bash
wc -l public/css/mckinsey-style.css
```

预期：约 320+ 行

- [ ] **Step 3: Commit**

```bash
git add public/css/mckinsey-style.css
git commit -m "feat: 创建共享 McKinsey CSS 设计系统"
```

---

## Chunk 2: result.html 重写

### Task 2: 重写 result.html

**Files:**
- Modify: `public/result.html`
- 保留 JS: `js/bazi.js`, `js/config.js`, `js/app.js`

**关键约束（必须保留的 ID）：**
`#birth-info`, `#hour-tg`, `#day-tg`, `#month-tg`, `#year-tg`, `#wuxing-bars`, `#pillar-relations`, `#dayun-section`, `#special-years-section`, `#analysis-section`, `#analysis-locked`, `#analysis-loading`, `#analysis-content`, `#analysis-text`, `#pay-prompt`, `#pay-btn`

- [ ] **Step 1: 重写 result.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>八字排盘结果 · 云子命理</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="https://www.tengyunzi.com/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&family=Noto+Serif+SC:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/mckinsey-style.css">
  <style>
    /* 四柱表格 */
    .bazi-table {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 8px;
    }

    .pillar {
      text-align: center;
      padding: 16px 8px;
      background: var(--bg-light);
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .pillar-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-gray);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 12px;
    }

    .tiangan {
      font-size: 28px;
      font-weight: 700;
      color: var(--primary);
      line-height: 1;
      margin-bottom: 8px;
      font-family: var(--font-serif);
    }

    .dizhi {
      font-size: 24px;
      font-weight: 600;
      color: var(--accent);
      font-family: var(--font-serif);
    }

    /* 出生信息 */
    .birth-info {
      font-size: 15px;
      color: var(--text-gray);
      line-height: 1.8;
    }

    /* 五行进度条 */
    .wuxing-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* 大运 */
    #dayun-section {
      overflow-x: auto;
    }

    /* 特殊年份警告色 */
    .mk-card.warning-card .mk-card-header {
      background: #FFF5F5;
      border-bottom-color: #FED7D7;
    }

    .mk-card.warning-card .mk-card-dot {
      background: #E53E3E;
    }

    .mk-card.warning-card .mk-card-title {
      color: #C53030;
    }

    /* 命理解读（付费区） */
    #analysis-section .mk-card-body {
      padding: 0;
    }

    .price-desc {
      font-size: 14px;
      color: var(--text-gray);
      padding: 24px;
    }
  </style>
</head>
<body>
  <!-- Navbar -->
  <nav class="navbar" id="navbar">
    <div class="navbar-inner">
      <a href="index.html" class="navbar-brand">
        <div class="navbar-brand-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="navbar-brand-text">
          <span class="navbar-brand-name">云子命理</span>
          <span class="navbar-brand-en">Yunzi</span>
        </div>
      </a>
      <div class="navbar-nav">
        <a href="index.html" class="active">八字排盘</a>
        <a href="hepan.html">合盘分析</a>
        <a href="qiming.html">起名服务</a>
        <a href="zhanbu.html">占卜咨询</a>
        <a href="fengshui.html">风水调理</a>
      </div>
      <div class="navbar-right">
        <span class="navbar-lang">EN</span>
      </div>
    </div>
  </nav>

  <div class="page-wrapper">
    <div class="page-inner">

      <a href="index.html" class="back-link">← 重新排盘</a>

      <!-- 出生信息 -->
      <div class="mk-card" id="birth-info-section">
        <div class="mk-card-header">
          <div class="mk-card-dot"></div>
          <span class="mk-card-title">出生信息</span>
        </div>
        <div class="mk-card-body">
          <div id="birth-info" class="birth-info"></div>
        </div>
      </div>

      <!-- 四柱八字 -->
      <div class="mk-card" id="bazi-table-section">
        <div class="mk-card-header">
          <div class="mk-card-dot"></div>
          <span class="mk-card-title">四 柱 八 字</span>
        </div>
        <div class="mk-card-body">
          <div class="bazi-table">
            <div class="pillar">
              <div class="pillar-label">时柱</div>
              <div class="tiangan" id="hour-tg"></div>
              <div class="dizhi" id="hour-dz"></div>
            </div>
            <div class="pillar">
              <div class="pillar-label">日柱</div>
              <div class="tiangan" id="day-tg"></div>
              <div class="dizhi" id="day-dz"></div>
            </div>
            <div class="pillar">
              <div class="pillar-label">月柱</div>
              <div class="tiangan" id="month-tg"></div>
              <div class="dizhi" id="month-dz"></div>
            </div>
            <div class="pillar">
              <div class="pillar-label">年柱</div>
              <div class="tiangan" id="year-tg"></div>
              <div class="dizhi" id="year-dz"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 五行分析 -->
      <div class="mk-card">
        <div class="mk-card-header">
          <div class="mk-card-dot"></div>
          <span class="mk-card-title">五 行 分 析</span>
        </div>
        <div class="mk-card-body">
          <div class="wuxing-bars" id="wuxing-bars"></div>
          <div id="pillar-relations" style="margin-top:16px; color:var(--text-gray); font-size:14px; line-height:1.8;"></div>
        </div>
      </div>

      <!-- 大运 -->
      <div class="mk-card">
        <div class="mk-card-header">
          <div class="mk-card-dot"></div>
          <span class="mk-card-title">大 运 排 盘</span>
        </div>
        <div class="mk-card-body">
          <div id="dayun-section"></div>
        </div>
      </div>

      <!-- 特殊年份 -->
      <div class="mk-card warning-card">
        <div class="mk-card-header">
          <div class="mk-card-dot"></div>
          <span class="mk-card-title">天 克 地 冲 · 岁 运 并 临</span>
        </div>
        <div class="mk-card-body">
          <div id="special-years-section"></div>
        </div>
      </div>

      <!-- 命理解读（付费） -->
      <div class="mk-card" id="analysis-section">
        <div class="mk-card-header">
          <div class="mk-card-dot"></div>
          <span class="mk-card-title">资 深 命 理 师 解 读</span>
        </div>
        <div class="mk-card-body">

          <div id="analysis-locked" style="display:none">
            <p class="price-desc">由资深命理师为您分析日主强弱、用神喜忌、性格财运</p>
          </div>

          <div id="analysis-loading" style="display:none">
            <div class="loading-card" style="display:block">
              <div class="loading-spinner"></div>
              <p class="loading-text">命理师正在为您解读，请稍候…</p>
            </div>
          </div>

          <div id="analysis-content" style="display:none">
            <div id="analysis-text" class="analysis-text"></div>
          </div>

          <div id="pay-prompt" style="display:none">
            <div class="pay-card">
              <p class="pay-card-title">解锁深度命理报告</p>
              <p class="pay-card-sub">以上仅为入门性格预览，完整报告涵盖 15 大维度 · 深度解析约 5000 字</p>
              <div class="pay-features">
                <span>▸ 用神喜忌 · 五行扶抑精解</span>
                <span>▸ 事业财运 · 适合行业与黄金期</span>
                <span>▸ 感情婚姻 · 配偶特征与感情走势</span>
                <span>▸ 二婚出轨 · 感情隐患深度剖析</span>
                <span>▸ 健康注意 · 五行薄弱对应身体</span>
                <span>▸ 神煞分析 · 贵人文昌驿马桃花</span>
                <span>▸ 子女缘分 · 数量时机与亲子关系</span>
                <span>▸ 地支刑冲 · 六合六冲三合三会</span>
                <span>▸ 空亡分析 · 日柱年柱旬空填实</span>
                <span>▸ 财库分析 · 辰戌丑未开库时机</span>
                <span>▸ 大运详解 · 当前及未来三步大运</span>
                <span>▸ 特殊流年 · 冲克应对逐年建议</span>
                <span class="span-full">▸ 后五年逐年流年 · 事业财运 × 感情健康 × 家宅运势，精准到年</span>
              </div>
              <button id="pay-btn" class="pay-btn">立即解锁完整命理报告</button>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>

  <script src="js/bazi.js"></script>
  <script src="js/config.js"></script>
  <script src="js/app.js"></script>
  <script>
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: 验证所有 JS ID 存在**

```bash
grep -o 'id="[^"]*"' public/result.html | sort
```

预期输出包含：`id="birth-info"`, `id="hour-tg"`, `id="day-tg"`, `id="month-tg"`, `id="year-tg"`, `id="wuxing-bars"`, `id="pillar-relations"`, `id="dayun-section"`, `id="special-years-section"`, `id="analysis-section"`, `id="analysis-locked"`, `id="analysis-loading"`, `id="analysis-content"`, `id="analysis-text"`, `id="pay-prompt"`, `id="pay-btn"`

- [ ] **Step 3: Commit**

```bash
git add public/result.html
git commit -m "feat: 重写 result.html 为 McKinsey 风格"
```

---

## Chunk 3: hepan.html 重写

### Task 3: 重写 hepan.html

**Files:**
- Modify: `public/hepan.html`
- 保留 JS: `js/bazi.js`, `js/services.js` + 页面内 inline JS

**关键约束（必须保留的 HTML 结构，供 JS 读取）：**
- Form ID: `#hepan-form`（或原有 form ID）
- 男方输入：`#m-year`, `#m-month`, `#m-day`, `#m-hour`, `#m-caltype-solar`, `#m-caltype-lunar`, `#m-is-leap`
- 女方输入：`#f-year`, `#f-month`, `#f-day`, `#f-hour`, `#f-caltype-solar`, `#f-caltype-lunar`, `#f-is-leap`
- 结果区：`#result-section`, `#result-text`
- Loading: `#result-loading`

> 注意：先执行 Task 3.0 确认 hepan.html 中实际的 JS ID 列表，再写 HTML

- [ ] **Step 0: 确认 hepan.html 中所有 JS 相关 ID**

```bash
grep -o 'id="[^"]*"\|getElementById\|querySelector' public/hepan.html | head -50
```

然后查看 hepan.html 的 JS 部分（行 480-534）：

```bash
sed -n '480,534p' public/hepan.html
```

- [ ] **Step 1: 重写 hepan.html（基于 Step 0 确认的 ID）**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>合盘配对 · 云子命理</title>
  <meta name="description" content="八字合盘配对分析，输入双方生辰八字，从五行相生相克、日支合缘、婚姻星等10大维度深度解读两人缘分。">
  <meta property="og:title" content="合盘配对 · 云子命理">
  <meta property="og:url" content="https://www.tengyunzi.com/hepan.html">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://www.tengyunzi.com/hepan.html">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&family=Noto+Serif+SC:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/mckinsey-style.css">
  <style>
    /* 双人卡片 */
    .persons-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    .person-card {
      background: white;
      border-radius: 12px;
      border: 2px solid var(--border);
      overflow: hidden;
    }

    .person-card.male { border-color: #BFDBFE; }
    .person-card.female { border-color: #FBCFE8; }

    .person-card-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .person-card.male .person-card-header { background: #EFF6FF; }
    .person-card.female .person-card-header { background: #FDF2F8; }

    .person-dot {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .person-card.male .person-dot { background: #3B82F6; }
    .person-card.female .person-dot { background: #EC4899; }

    .person-label {
      font-size: 15px;
      font-weight: 700;
    }

    .person-card.male .person-label { color: #1D4ED8; }
    .person-card.female .person-label { color: #BE185D; }

    .person-card-body {
      padding: 20px;
    }

    @media (max-width: 768px) {
      .persons-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <!-- Navbar -->
  <nav class="navbar" id="navbar">
    <div class="navbar-inner">
      <a href="index.html" class="navbar-brand">
        <div class="navbar-brand-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="navbar-brand-text">
          <span class="navbar-brand-name">云子命理</span>
          <span class="navbar-brand-en">Yunzi</span>
        </div>
      </a>
      <div class="navbar-nav">
        <a href="index.html">八字排盘</a>
        <a href="hepan.html" class="active">合盘分析</a>
        <a href="qiming.html">起名服务</a>
        <a href="zhanbu.html">占卜咨询</a>
        <a href="fengshui.html">风水调理</a>
      </div>
      <div class="navbar-right">
        <span class="navbar-lang">EN</span>
      </div>
    </div>
  </nav>

  <div class="page-wrapper">
    <div class="page-inner">

      <div class="page-header">
        <span class="page-tag">Compatibility Analysis</span>
        <h1 class="page-title">合盘配对</h1>
        <p class="page-subtitle">输入双方生辰八字，深度分析两人命理契合度</p>
      </div>

      <form id="hepan-form">
        <div class="persons-grid">
          <!-- 乾（男方）-->
          <div class="person-card male">
            <div class="person-card-header">
              <div class="person-dot">乾</div>
              <span class="person-label">男方</span>
            </div>
            <div class="person-card-body">
              <div class="form-toggle" style="margin-bottom:16px;">
                <label class="form-toggle-label active" id="m-lbl-solar">
                  <input type="radio" name="m-caltype" value="solar" checked class="form-toggle-input" id="m-caltype-solar">
                  阳历
                </label>
                <label class="form-toggle-label" id="m-lbl-lunar">
                  <input type="radio" name="m-caltype" value="lunar" class="form-toggle-input" id="m-caltype-lunar">
                  农历
                </label>
              </div>
              <div class="form-group">
                <label class="form-label">出生年份</label>
                <input type="number" id="m-year" min="1900" max="2100" placeholder="例：1990" class="form-input" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">月</label>
                  <select id="m-month" class="form-select" required>
                    <option value="">月份</option>
                    <option value="1">一月</option><option value="2">二月</option>
                    <option value="3">三月</option><option value="4">四月</option>
                    <option value="5">五月</option><option value="6">六月</option>
                    <option value="7">七月</option><option value="8">八月</option>
                    <option value="9">九月</option><option value="10">十月</option>
                    <option value="11">十一月</option><option value="12">十二月</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">日</label>
                  <input type="number" id="m-day" min="1" max="31" placeholder="日期" class="form-input" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">时辰</label>
                <select id="m-hour" class="form-select" required>
                  <option value="">选择时辰</option>
                  <option value="23">子时 23:00-01:00</option>
                  <option value="1">丑时 01:00-03:00</option>
                  <option value="3">寅时 03:00-05:00</option>
                  <option value="5">卯时 05:00-07:00</option>
                  <option value="7">辰时 07:00-09:00</option>
                  <option value="9">巳时 09:00-11:00</option>
                  <option value="11">午时 11:00-13:00</option>
                  <option value="13">未时 13:00-15:00</option>
                  <option value="15">申时 15:00-17:00</option>
                  <option value="17">酉时 17:00-19:00</option>
                  <option value="19">戌时 19:00-21:00</option>
                  <option value="21">亥时 21:00-23:00</option>
                </select>
              </div>
              <div class="form-group" id="m-leap-group" style="display:none;">
                <label class="form-gender-label">
                  <input type="checkbox" id="m-is-leap" class="form-gender-input">
                  闰月
                </label>
              </div>
            </div>
          </div>

          <!-- 坤（女方）-->
          <div class="person-card female">
            <div class="person-card-header">
              <div class="person-dot">坤</div>
              <span class="person-label">女方</span>
            </div>
            <div class="person-card-body">
              <div class="form-toggle" style="margin-bottom:16px;">
                <label class="form-toggle-label active" id="f-lbl-solar">
                  <input type="radio" name="f-caltype" value="solar" checked class="form-toggle-input" id="f-caltype-solar">
                  阳历
                </label>
                <label class="form-toggle-label" id="f-lbl-lunar">
                  <input type="radio" name="f-caltype" value="lunar" class="form-toggle-input" id="f-caltype-lunar">
                  农历
                </label>
              </div>
              <div class="form-group">
                <label class="form-label">出生年份</label>
                <input type="number" id="f-year" min="1900" max="2100" placeholder="例：1992" class="form-input" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">月</label>
                  <select id="f-month" class="form-select" required>
                    <option value="">月份</option>
                    <option value="1">一月</option><option value="2">二月</option>
                    <option value="3">三月</option><option value="4">四月</option>
                    <option value="5">五月</option><option value="6">六月</option>
                    <option value="7">七月</option><option value="8">八月</option>
                    <option value="9">九月</option><option value="10">十月</option>
                    <option value="11">十一月</option><option value="12">十二月</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">日</label>
                  <input type="number" id="f-day" min="1" max="31" placeholder="日期" class="form-input" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">时辰</label>
                <select id="f-hour" class="form-select" required>
                  <option value="">选择时辰</option>
                  <option value="23">子时 23:00-01:00</option>
                  <option value="1">丑时 01:00-03:00</option>
                  <option value="3">寅时 03:00-05:00</option>
                  <option value="5">卯时 05:00-07:00</option>
                  <option value="7">辰时 07:00-09:00</option>
                  <option value="9">巳时 09:00-11:00</option>
                  <option value="11">午时 11:00-13:00</option>
                  <option value="13">未时 13:00-15:00</option>
                  <option value="15">申时 15:00-17:00</option>
                  <option value="17">酉时 17:00-19:00</option>
                  <option value="19">戌时 19:00-21:00</option>
                  <option value="21">亥时 21:00-23:00</option>
                </select>
              </div>
              <div class="form-group" id="f-leap-group" style="display:none;">
                <label class="form-gender-label">
                  <input type="checkbox" id="f-is-leap" class="form-gender-input">
                  闰月
                </label>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" class="form-submit">开始合盘分析</button>
      </form>

      <!-- Loading -->
      <div id="result-loading" class="loading-card" style="margin-top:24px;">
        <div class="loading-spinner"></div>
        <p class="loading-text">命理师正在分析双方命盘，请稍候…</p>
      </div>

      <!-- Result -->
      <div id="result-section" style="display:none; margin-top:24px;">
        <div class="mk-card">
          <div class="mk-card-header">
            <div class="mk-card-dot"></div>
            <span class="mk-card-title">合盘分析结果</span>
          </div>
          <div class="mk-card-body">
            <div id="result-text" class="analysis-text"></div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <script src="js/bazi.js"></script>
  <script src="js/services.js"></script>
  <script>
    // Navbar scroll
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    });

    // 阳历/农历切换
    ['m', 'f'].forEach(prefix => {
      const lblSolar = document.getElementById(`${prefix}-lbl-solar`);
      const lblLunar = document.getElementById(`${prefix}-lbl-lunar`);
      const leapGroup = document.getElementById(`${prefix}-leap-group`);
      document.querySelectorAll(`input[name="${prefix}-caltype"]`).forEach(input => {
        input.addEventListener('change', e => {
          if (e.target.value === 'solar') {
            lblSolar.classList.add('active');
            lblLunar.classList.remove('active');
            leapGroup.style.display = 'none';
          } else {
            lblLunar.classList.add('active');
            lblSolar.classList.remove('active');
            leapGroup.style.display = 'block';
          }
        });
      });
    });
  </script>
  <!-- 保留原 hepan.html 的 form submit 逻辑（原文件第 480 行起） -->
  <!-- PRESERVE_ORIGINAL_JS_FROM_HEPAN -->
</body>
</html>
```

> **重要提示：** `<!-- PRESERVE_ORIGINAL_JS_FROM_HEPAN -->` 这个注释是占位符。在实际写入时，需要将原 hepan.html 中 form submit 事件处理代码（大约从原文件 480 行到末尾）完整保留在这里。先执行 Step 0 确认原始 JS 后再写入最终文件。

- [ ] **Step 2: Commit**

```bash
git add public/hepan.html
git commit -m "feat: 重写 hepan.html 为 McKinsey 风格"
```

---

## Chunk 4: 服务页面（起名、占卜、风水）

### Task 4: 重写 qiming.html

**Files:** `public/qiming.html`（保留全部 inline JS）

- [ ] **Step 1: 重写 qiming.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>八字起名 · 云子命理</title>
  <meta name="description" content="根据生辰八字五行喜忌，为宝宝或成人起名改名，结合命理精准补充用神，好名字改变人生运势。">
  <meta property="og:title" content="八字起名 · 云子命理">
  <meta property="og:url" content="https://www.tengyunzi.com/qiming.html">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://www.tengyunzi.com/qiming.html">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/mckinsey-style.css">
</head>
<body>
  <nav class="navbar" id="navbar">
    <div class="navbar-inner">
      <a href="index.html" class="navbar-brand">
        <div class="navbar-brand-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="navbar-brand-text">
          <span class="navbar-brand-name">云子命理</span>
          <span class="navbar-brand-en">Yunzi</span>
        </div>
      </a>
      <div class="navbar-nav">
        <a href="index.html">八字排盘</a>
        <a href="hepan.html">合盘分析</a>
        <a href="qiming.html" class="active">起名服务</a>
        <a href="zhanbu.html">占卜咨询</a>
        <a href="fengshui.html">风水调理</a>
      </div>
      <div class="navbar-right"><span class="navbar-lang">EN</span></div>
    </div>
  </nav>

  <div class="page-wrapper">
    <div class="page-inner" style="max-width:600px;">

      <div class="page-header">
        <span class="page-tag">Name Generation</span>
        <h1 class="page-title">起 名</h1>
        <p class="page-subtitle">结合八字五行，为你推荐好名字</p>
      </div>

      <form id="qiming-form" class="form-card">
        <div class="form-group">
          <label class="form-label">姓氏</label>
          <input type="text" id="surname" placeholder="例：王" maxlength="3" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label">出生年份</label>
          <input type="number" id="year" min="1900" max="2100" placeholder="例：2024" class="form-input" required>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">月</label>
            <select id="month" class="form-select" required>
              <option value="">— 月 —</option>
              <option value="1">1月</option><option value="2">2月</option>
              <option value="3">3月</option><option value="4">4月</option>
              <option value="5">5月</option><option value="6">6月</option>
              <option value="7">7月</option><option value="8">8月</option>
              <option value="9">9月</option><option value="10">10月</option>
              <option value="11">11月</option><option value="12">12月</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">日</label>
            <input type="number" id="day" min="1" max="31" placeholder="— 日 —" class="form-input" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">性别</label>
          <div class="form-gender">
            <label class="form-gender-label">
              <input type="radio" name="gender" value="男" class="form-gender-input" required> 男
            </label>
            <label class="form-gender-label">
              <input type="radio" name="gender" value="女" class="form-gender-input"> 女
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">期望寓意 <span class="label-hint">· 可选</span></label>
          <input type="text" id="hope" placeholder="例：聪明伶俐、事业有成、温柔大方" class="form-input">
        </div>
        <button type="submit" class="form-submit">生成名字</button>
      </form>

      <div id="result-loading" class="loading-card" style="margin-top:24px;">
        <div class="loading-spinner"></div>
        <p class="loading-text">命理师正在为你推算合适的名字，请稍候…</p>
      </div>

      <div id="result-section" style="display:none; margin-top:24px;">
        <div class="mk-card">
          <div class="mk-card-header">
            <div class="mk-card-dot"></div>
            <span class="mk-card-title">推 荐 名 字</span>
          </div>
          <div class="mk-card-body">
            <div id="result-text" class="analysis-text"></div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <script src="js/bazi.js"></script>
  <script src="js/services.js"></script>
  <script>
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    });

    document.getElementById('qiming-form').addEventListener('submit', async e => {
      e.preventDefault();
      const surname = document.getElementById('surname').value.trim();
      const year    = parseInt(document.getElementById('year').value);
      const month   = parseInt(document.getElementById('month').value);
      const day     = parseInt(document.getElementById('day').value);
      const gender  = document.querySelector('input[name=gender]:checked').value;
      const hope    = document.getElementById('hope').value.trim();

      const bazi = BaziCalc.calculateBazi(year, month, day, 12);
      const wx = bazi.wuxing;
      const wuxingShort = Object.entries(wx).map(([k,v]) => `${k}${v}`).join(' ');

      showLoading();
      try {
        const text = await callAnalyze({
          service: 'qiming',
          surname, birth_year: year, birth_month: month, birth_day: day,
          gender, wuxing_short: wuxingShort, hope,
        });
        showResult(text);
      } catch {
        showError('获取失败，请刷新重试');
      }
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/qiming.html
git commit -m "feat: 重写 qiming.html 为 McKinsey 风格"
```

---

### Task 5: 重写 zhanbu.html

**Files:** `public/zhanbu.html`（保留全部 inline JS + 方法切换逻辑）

- [ ] **Step 1: 重写 zhanbu.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>在线占卜 · 云子命理</title>
  <meta name="description" content="梅花易数、六爻、塔罗在线占卜，解答感情、事业、财运疑问，传统命理与现代结合。">
  <meta property="og:title" content="在线占卜 · 云子命理">
  <meta property="og:url" content="https://www.tengyunzi.com/zhanbu.html">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://www.tengyunzi.com/zhanbu.html">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/mckinsey-style.css">
  <style>
    .method-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .method-card {
      padding: 16px;
      border: 2px solid var(--border);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
      display: block;
    }

    .method-card input[type=radio] { display: none; }

    .method-card:hover {
      border-color: var(--accent);
    }

    .method-card.active {
      border-color: var(--accent);
      background: #EFF6FF;
    }

    .method-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 6px;
    }

    .method-card.active .method-name { color: var(--accent); }

    .method-desc {
      font-size: 12px;
      color: var(--text-gray);
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .method-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <nav class="navbar" id="navbar">
    <div class="navbar-inner">
      <a href="index.html" class="navbar-brand">
        <div class="navbar-brand-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="navbar-brand-text">
          <span class="navbar-brand-name">云子命理</span>
          <span class="navbar-brand-en">Yunzi</span>
        </div>
      </a>
      <div class="navbar-nav">
        <a href="index.html">八字排盘</a>
        <a href="hepan.html">合盘分析</a>
        <a href="qiming.html">起名服务</a>
        <a href="zhanbu.html" class="active">占卜咨询</a>
        <a href="fengshui.html">风水调理</a>
      </div>
      <div class="navbar-right"><span class="navbar-lang">EN</span></div>
    </div>
  </nav>

  <div class="page-wrapper">
    <div class="page-inner" style="max-width:700px;">

      <div class="page-header">
        <span class="page-tag">Divination</span>
        <h1 class="page-title">占 卜</h1>
        <p class="page-subtitle">多种方式，为你解惑</p>
      </div>

      <form id="zhanbu-form" class="form-card">

        <div class="form-group">
          <label class="form-label">选择占卜方式</label>
          <div class="method-grid">
            <label class="method-card active" id="card-meihua">
              <input type="radio" name="method" value="meihua" checked>
              <div class="method-name">梅花易数</div>
              <div class="method-desc">以数起卦，万物皆可成卦象，随机取数即可占问，适合任何事项</div>
            </label>
            <label class="method-card" id="card-liuyao">
              <input type="radio" name="method" value="liuyao">
              <div class="method-name">六爻</div>
              <div class="method-desc">以铜钱摇卦，六爻层层深入，卦象详细，可问人事吉凶走向</div>
            </label>
            <label class="method-card" id="card-daliuren">
              <input type="radio" name="method" value="daliuren">
              <div class="method-name">大六壬</div>
              <div class="method-desc">古代官方占术，以起课时间推四课三传，精准预测重大事件和时间节点</div>
            </label>
            <label class="method-card" id="card-xiaoliuren">
              <input type="radio" name="method" value="xiaoliuren">
              <div class="method-name">小六壬</div>
              <div class="method-desc">民间最常用，以月日时三数起六将，简便快捷</div>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">你想问什么</label>
          <textarea id="question" class="form-textarea" rows="3"
            placeholder="例：我今年事业发展如何？这次合作能否成功？" required></textarea>
        </div>

        <div id="input-numbers" class="form-group">
          <label class="form-label">起卦数字 <span class="label-hint">· 随心输入 1–999，不填则随机</span></label>
          <div class="form-row">
            <div class="form-group">
              <input type="number" id="num1" min="1" max="999" placeholder="数字一" class="form-input">
            </div>
            <div class="form-group">
              <input type="number" id="num2" min="1" max="999" placeholder="数字二" class="form-input">
            </div>
            <div class="form-group">
              <input type="number" id="num3" min="1" max="999" placeholder="数字三" class="form-input">
            </div>
          </div>
        </div>

        <div id="input-time" class="form-group" style="display:none">
          <label class="form-label">起课时间 <span class="label-hint">· 默认当前时间</span></label>
          <div class="form-row">
            <div class="form-group">
              <input type="number" id="ke-month" min="1" max="12" placeholder="月" class="form-input">
            </div>
            <div class="form-group">
              <input type="number" id="ke-day" min="1" max="31" placeholder="日" class="form-input">
            </div>
            <div class="form-group">
              <select id="ke-hour" class="form-select">
                <option value="">时辰</option>
                <option value="子">子时 23-01</option>
                <option value="丑">丑时 01-03</option>
                <option value="寅">寅时 03-05</option>
                <option value="卯">卯时 05-07</option>
                <option value="辰">辰时 07-09</option>
                <option value="巳">巳时 09-11</option>
                <option value="午">午时 11-13</option>
                <option value="未">未时 13-15</option>
                <option value="申">申时 15-17</option>
                <option value="酉">酉时 17-19</option>
                <option value="戌">戌时 19-21</option>
                <option value="亥">亥时 21-23</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" class="form-submit">开始占卜</button>
      </form>

      <div id="result-loading" class="loading-card" style="margin-top:24px;">
        <div class="loading-spinner"></div>
        <p class="loading-text">正在为你起卦解读，请稍候…</p>
      </div>

      <div id="result-section" style="display:none; margin-top:24px;">
        <div class="mk-card">
          <div class="mk-card-header">
            <div class="mk-card-dot"></div>
            <span class="mk-card-title">卦 象 解 读</span>
          </div>
          <div class="mk-card-body">
            <div id="result-text" class="analysis-text"></div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <script src="js/services.js"></script>
  <script>
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    });

    // 方法切换
    document.querySelectorAll('input[name=method]').forEach(r => {
      r.addEventListener('change', () => {
        document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
        r.closest('.method-card').classList.add('active');
        const needTime = r.value === 'daliuren' || r.value === 'xiaoliuren';
        document.getElementById('input-numbers').style.display = needTime ? 'none' : 'block';
        document.getElementById('input-time').style.display    = needTime ? 'block' : 'none';
      });
    });

    // 默认填入当前时间
    const now = new Date();
    document.getElementById('ke-month').value = now.getMonth() + 1;
    document.getElementById('ke-day').value   = now.getDate();
    const hourNames = ['子','丑','丑','寅','寅','卯','卯','辰','辰','巳','巳','午','午','未','未','申','申','酉','酉','戌','戌','亥','亥','子'];
    const keHourSel = document.getElementById('ke-hour');
    Array.from(keHourSel.options).forEach(o => {
      if (o.value === hourNames[now.getHours()]) keHourSel.value = o.value;
    });

    document.getElementById('zhanbu-form').addEventListener('submit', async e => {
      e.preventDefault();
      const method   = document.querySelector('input[name=method]:checked').value;
      const question = document.getElementById('question').value.trim();
      let payload = { service: 'zhanbu', method, question };

      if (method === 'daliuren' || method === 'xiaoliuren') {
        payload.ke_month = document.getElementById('ke-month').value || now.getMonth() + 1;
        payload.ke_day   = document.getElementById('ke-day').value   || now.getDate();
        payload.ke_hour  = document.getElementById('ke-hour').value  || hourNames[now.getHours()];
      } else {
        payload.number1 = document.getElementById('num1').value || Math.floor(Math.random()*999+1);
        payload.number2 = document.getElementById('num2').value || Math.floor(Math.random()*999+1);
        payload.number3 = document.getElementById('num3').value || Math.floor(Math.random()*999+1);
      }

      showLoading();
      try {
        const text = await callAnalyze(payload);
        showResult(text);
      } catch {
        showError('获取失败，请刷新重试');
      }
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/zhanbu.html
git commit -m "feat: 重写 zhanbu.html 为 McKinsey 风格"
```

---

### Task 6: 重写 fengshui.html

**Files:** `public/fengshui.html`（保留全部 inline JS + 图片上传逻辑）

- [ ] **Step 1: 重写 fengshui.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>风水布局 · 云子命理</title>
  <meta name="description" content="家居风水、办公室风水布局分析，结合八字命理个性化调整，趋吉避凶改善运势。">
  <meta property="og:title" content="风水布局 · 云子命理">
  <meta property="og:url" content="https://www.tengyunzi.com/fengshui.html">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://www.tengyunzi.com/fengshui.html">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/mckinsey-style.css">
  <style>
    .upload-area {
      border: 2px dashed var(--border);
      border-radius: 10px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--bg-light);
    }

    .upload-area:hover, .upload-area.drag-over {
      border-color: var(--accent);
      background: #EFF6FF;
    }

    .upload-icon {
      font-size: 36px;
      margin-bottom: 8px;
    }

    .upload-placeholder p {
      font-size: 14px;
      color: var(--text-gray);
    }

    .upload-hint {
      font-size: 12px;
      color: var(--text-light);
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <nav class="navbar" id="navbar">
    <div class="navbar-inner">
      <a href="index.html" class="navbar-brand">
        <div class="navbar-brand-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="navbar-brand-text">
          <span class="navbar-brand-name">云子命理</span>
          <span class="navbar-brand-en">Yunzi</span>
        </div>
      </a>
      <div class="navbar-nav">
        <a href="index.html">八字排盘</a>
        <a href="hepan.html">合盘分析</a>
        <a href="qiming.html">起名服务</a>
        <a href="zhanbu.html">占卜咨询</a>
        <a href="fengshui.html" class="active">风水调理</a>
      </div>
      <div class="navbar-right"><span class="navbar-lang">EN</span></div>
    </div>
  </nav>

  <div class="page-wrapper">
    <div class="page-inner" style="max-width:640px;">

      <div class="page-header">
        <span class="page-tag">Feng Shui</span>
        <h1 class="page-title">風 水</h1>
        <p class="page-subtitle">住宅 · 办公，趋吉避凶</p>
      </div>

      <form id="fengshui-form" class="form-card">

        <div class="form-group">
          <label class="form-label">地点类型</label>
          <div class="form-gender">
            <label class="form-gender-label">
              <input type="radio" name="loctype" value="住宅" checked class="form-gender-input"> 住宅
            </label>
            <label class="form-gender-label">
              <input type="radio" name="loctype" value="办公室" class="form-gender-input"> 办公室
            </label>
            <label class="form-gender-label">
              <input type="radio" name="loctype" value="店铺" class="form-gender-input"> 店铺
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">主要关切</label>
          <div class="form-gender" style="flex-wrap:wrap; gap:12px;">
            <label class="form-gender-label">
              <input type="radio" name="concern" value="财运" checked class="form-gender-input"> 财运
            </label>
            <label class="form-gender-label">
              <input type="radio" name="concern" value="健康" class="form-gender-input"> 健康
            </label>
            <label class="form-gender-label">
              <input type="radio" name="concern" value="感情" class="form-gender-input"> 感情
            </label>
            <label class="form-gender-label">
              <input type="radio" name="concern" value="事业" class="form-gender-input"> 事业
            </label>
            <label class="form-gender-label">
              <input type="radio" name="concern" value="整体运势" class="form-gender-input"> 整体运势
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">描述你的空间情况</label>
          <textarea id="description" class="form-textarea" rows="5"
            placeholder="例：我家是东南朝向，门对着厕所，客厅正中有柱子，卧室在西北角，入门见到的是餐桌…请尽量详细描述" required></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">户型图 <span class="label-hint">· 可选，上传平面图辅助分析</span></label>
          <div class="upload-area" id="upload-area">
            <input type="file" id="floor-plan" accept="image/*" style="display:none">
            <div id="upload-placeholder" class="upload-placeholder">
              <div class="upload-icon">🏠</div>
              <p>点击上传户型图</p>
              <p class="upload-hint">支持 JPG、PNG、GIF，建议 10 MB 以内</p>
            </div>
            <img id="floor-plan-preview" style="display:none; max-width:100%; border-radius:8px;">
          </div>
        </div>

        <button type="submit" class="form-submit">获取风水建议</button>
      </form>

      <div id="result-loading" class="loading-card" style="margin-top:24px;">
        <div class="loading-spinner"></div>
        <p class="loading-text">风水师正在为你分析格局，请稍候…</p>
      </div>

      <div id="result-section" style="display:none; margin-top:24px;">
        <div class="mk-card">
          <div class="mk-card-header">
            <div class="mk-card-dot"></div>
            <span class="mk-card-title">风 水 分 析</span>
          </div>
          <div class="mk-card-body">
            <div id="result-text" class="analysis-text"></div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <script src="js/services.js"></script>
  <script>
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    });

    // 图片上传交互（完整保留原逻辑）
    const uploadArea  = document.getElementById('upload-area');
    const fileInput   = document.getElementById('floor-plan');
    const preview     = document.getElementById('floor-plan-preview');
    const placeholder = document.getElementById('upload-placeholder');

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

    let compressedBase64 = null;

    function handleFile(file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1024;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else       { w = Math.round(w * MAX / h); h = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          preview.src = compressedBase64;
          preview.style.display = 'block';
          placeholder.style.display = 'none';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }

    document.getElementById('fengshui-form').addEventListener('submit', async e => {
      e.preventDefault();
      const location    = document.querySelector('input[name=loctype]:checked').value;
      const concern     = document.querySelector('input[name=concern]:checked').value;
      const description = document.getElementById('description').value.trim();

      showLoading();
      try {
        const payload = { service: 'fengshui', location, concern, description };
        if (compressedBase64) payload.image_base64 = compressedBase64;
        const text = await callAnalyze(payload);
        showResult(text);
      } catch {
        showError('获取失败，请刷新重试');
      }
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/fengshui.html
git commit -m "feat: 重写 fengshui.html 为 McKinsey 风格"
```

---

## Chunk 5: payment-success.html 更新

### Task 7: 更新 payment-success.html

**Files:** `public/payment-success.html`（保留完整 JS 逻辑）

- [ ] **Step 1: 更新 payment-success.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>支付成功 · 云子命理</title>
  <meta name="robots" content="noindex">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --primary: #0A2540;
      --accent: #0066CC;
      --bg-white: #FFFFFF;
      --bg-light: #F8F9FA;
      --border: #DEE2E6;
      --text-dark: #1A1A1A;
      --text-gray: #6C757D;
      --font-zh: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    }

    body {
      font-family: var(--font-zh);
      background: var(--bg-light);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: var(--text-dark);
    }

    .container {
      max-width: 400px;
      width: 100%;
      text-align: center;
      background: var(--bg-white);
      border-radius: 16px;
      padding: 48px 32px;
      border: 1px solid var(--border);
      box-shadow: 0 8px 40px rgba(0,0,0,0.08);
    }

    .icon {
      width: 80px; height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
      animation: scaleIn 0.5s ease-out;
    }

    .icon svg {
      width: 40px; height: 40px;
      stroke: white; stroke-width: 3; fill: none;
      stroke-linecap: round; stroke-linejoin: round;
      animation: drawCheck 0.6s ease-out 0.3s both;
    }

    @keyframes scaleIn {
      from { transform: scale(0); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }

    @keyframes drawCheck {
      from { stroke-dasharray: 50; stroke-dashoffset: 50; }
      to   { stroke-dashoffset: 0; }
    }

    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--primary);
    }

    p {
      font-size: 14px;
      color: var(--text-gray);
      line-height: 1.8;
      margin-bottom: 8px;
    }

    .loading {
      display: inline-block;
      width: 20px; height: 20px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
      margin-right: 8px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .btn {
      display: inline-block;
      padding: 12px 32px;
      background: var(--accent);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      margin-top: 24px;
      transition: all 0.2s ease;
      border: none;
      cursor: pointer;
      font-family: var(--font-zh);
    }

    .btn:hover {
      background: #0052A3;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 102, 204, 0.3);
    }

    .btn-secondary {
      background: transparent;
      border: 2px solid var(--border);
      color: var(--text-gray);
      margin-top: 12px;
    }

    .btn-secondary:hover {
      border-color: var(--accent);
      color: var(--accent);
      background: transparent;
      box-shadow: none;
    }

    .hidden { display: none; }

    .countdown {
      font-size: 12px;
      color: var(--text-gray);
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>

    <h1>支付成功</h1>

    <div id="loading">
      <p><span class="loading"></span>正在为您生成命理报告…</p>
      <p class="countdown"><span id="countdown">5</span> 秒后自动跳转</p>
    </div>

    <div id="success" class="hidden">
      <p>命理报告已生成完成！</p>
      <button onclick="goToResult()" class="btn">查看命理报告</button>
    </div>

    <div id="error" class="hidden">
      <p>报告生成时间较长，请稍后查看</p>
      <button onclick="goToResult()" class="btn">前往查看</button>
      <button onclick="location.reload()" class="btn btn-secondary">刷新页面</button>
    </div>
  </div>

  <script>
    const params = new URLSearchParams(location.search);
    const tradeNo = params.get('trade_no');

    if (!tradeNo) {
      document.getElementById('loading').innerHTML = '<p>参数错误，请重新发起支付</p>';
    } else {
      let countdown = 5;
      const countdownEl = document.getElementById('countdown');

      const timer = setInterval(() => {
        countdown--;
        if (countdownEl) countdownEl.textContent = countdown;
        if (countdown <= 0) {
          clearInterval(timer);
          goToResult();
        }
      }, 1000);

      function goToResult() {
        window.location.href = `result.html?trade_no=${tradeNo}`;
      }

      window.goToResult = goToResult;
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/payment-success.html
git commit -m "feat: 更新 payment-success.html 为亮色 McKinsey 风格"
```

---

## Chunk 6: 完成 hepan.html 的 JS 集成

### Task 8: 从原始 hepan.html 提取并集成 form submit JS

> 这一步需要读取原始 hepan.html 的 JS 逻辑并集成到新文件中。

- [ ] **Step 1: 读取原始 hepan.html 的 form submit 逻辑**

```bash
sed -n '450,534p' public/hepan.html
```

- [ ] **Step 2: 将提取的 JS 集成到新 hepan.html（替换 PRESERVE_ORIGINAL_JS_FROM_HEPAN 占位符）**

将 Step 1 中读取的 form submit 事件处理代码，插入到 hepan.html 末尾 `</body>` 前。

- [ ] **Step 3: Commit**

```bash
git add public/hepan.html
git commit -m "fix: 集成 hepan.html 原始 form submit JS 逻辑"
```

---

## 最终验证

- [ ] **验证所有页面不再引用旧 style.css**

```bash
grep -l "style.css" public/*.html
```

预期：无输出（所有旧引用已被替换）

- [ ] **验证所有页面引用 mckinsey-style.css**

```bash
grep -l "mckinsey-style.css" public/*.html
```

预期：列出所有改造过的页面

- [ ] **验证 result.html 的关键 JS ID 完整**

```bash
for id in "birth-info" "hour-tg" "day-tg" "month-tg" "year-tg" "wuxing-bars" "dayun-section" "special-years-section" "analysis-section" "pay-btn"; do
  grep -q "id=\"$id\"" public/result.html && echo "✓ $id" || echo "✗ MISSING: $id"
done
```

预期：所有 ID 输出 ✓
