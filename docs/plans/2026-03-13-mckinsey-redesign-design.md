# McKinsey 风格全站重设计 — 设计文档

**日期：** 2026-03-13
**状态：** 已审批，待执行

## 背景

index.html 已完成 McKinsey 风格重设计（白底、深蓝/蓝色配色、专业排版）。
其余页面仍使用旧暗色主题（style.css + Jura/IBM Plex Mono 字体），需统一更新。

## 架构方案（方案 B：共享 CSS）

### 文件变更

```
public/css/mckinsey-style.css  ← 从 index.html 提取所有共享样式（新增/扩展）
public/index.html              ← 改为 link 外部 CSS，去掉 inline <style>（或保持现状）
public/result.html             ← 完全重写 HTML + CSS
public/hepan.html              ← 完全重写 HTML + CSS
public/qiming.html             ← 重写
public/zhanbu.html             ← 重写
public/fengshui.html           ← 重写
public/payment-success.html    ← 更新为亮色主题
```

### mckinsey-style.css 包含

- CSS 变量（--primary, --accent, --bg-white, --text-dark 等）
- CSS Reset
- Navbar 组件（.navbar, .navbar-inner, .navbar-brand, .navbar-nav, .navbar-right）
- 按钮（.btn, .btn-primary, .btn-secondary）
- Form 组件（.form-group, .form-label, .form-input, .form-select, .form-toggle）
- Card 组件（.card, .card-header）
- Section 标题（.section-tag, .section-title, .section-subtitle）
- 响应式媒体查询（max-width: 768px）
- 动画工具类（fadeInUp）

## 各页面设计说明

### result.html（优先级最高）

**结构：**
- 顶部：Navbar（与 index.html 一致）
- 返回链接 + 出生信息摘要卡片
- 四柱八字卡片（白底、表格化展示）
- 五行分析卡片（五行进度条）
- 大运排盘卡片
- 特殊年份卡片（警告色调）
- 命理解读区（含付费 CTA）

**关键约束：**
- 保留所有 JS ID（#birth-info, #hour-tg, #day-tg, #month-tg, #year-tg, #wuxing-bars, #dayun-section, #special-years-section, #analysis-section, #analysis-locked, #analysis-loading, #analysis-content, #analysis-text, #pay-prompt, #pay-btn）
- 保留 `<script src="js/bazi.js">`, `<script src="js/config.js">`, `<script src="js/app.js">`

### hepan.html

**结构：**
- Navbar
- 页面标题区（合盘配对）
- 双人输入卡片（左乾蓝/右坤粉色区分）
- 提交按钮
- 结果区（保留所有 JS ID）

**关键约束：**
- 保留所有 JS 逻辑和 ID
- 保留 `<script src="js/bazi.js">` 和 `<script src="js/services.js">`

### qiming.html、zhanbu.html、fengshui.html

**结构：**
- Navbar
- 简洁页面标题
- 表单卡片（样式与 index.html 表单卡片一致）
- Loading 状态区
- 结果展示区

**关键约束：**
- 保留所有 inline JS 逻辑不变
- 保留所有 form ID 和 input ID

### payment-success.html

- 白底居中布局
- 保留成功勾号动画（scaleIn + drawCheck）
- 改用 McKinsey 配色（--accent 蓝色代替绿色按钮）
- 保留倒计时 JS 逻辑

## 设计系统参考（来自 index.html）

```css
:root {
  --primary: #0A2540;
  --accent: #0066CC;
  --accent-hover: #0052A3;
  --bg-white: #FFFFFF;
  --bg-light: #F8F9FA;
  --text-dark: #1A1A1A;
  --text-gray: #6C757D;
  --border: #DEE2E6;
  --font-zh: 'Noto Sans SC', 'PingFang SC', sans-serif;
}
```

字体：`Inter` + `Noto Sans SC`（Google Fonts）

## 执行顺序

1. 扩展 `mckinsey-style.css`（提取共享组件）
2. 重写 `result.html`
3. 重写 `hepan.html`
4. 重写 `qiming.html`、`zhanbu.html`、`fengshui.html`
5. 更新 `payment-success.html`
6. （可选）更新 `index.html` 改用外部 CSS
