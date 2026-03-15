(() => {
  const STORAGE_KEY = 'site_lang_pref_v2';
  const LANGS = ['zh-Hans', 'zh-Hant', 'en'];

  const TITLES = {
    'index.html': {
      'zh-Hans': '云子命理 · 专业八字命理解读',
      'zh-Hant': '雲子命理 · 專業八字命理解讀',
      en: 'Yunzi Destiny · Professional Bazi Reading',
    },
    'hepan.html': {
      'zh-Hans': '合盘配对 · 云子命理',
      'zh-Hant': '合盤配對 · 雲子命理',
      en: 'Compatibility Analysis · Yunzi Destiny',
    },
    'result.html': {
      'zh-Hans': '八字排盘结果 · 云子命理',
      'zh-Hant': '八字排盤結果 · 雲子命理',
      en: 'Bazi Result · Yunzi Destiny',
    },
  };

  const COMMON_TEXT = {
    navHome: { 'zh-Hans': '八字排盘', 'zh-Hant': '八字排盤', en: 'Bazi Chart' },
    navHepan: { 'zh-Hans': '合盘分析', 'zh-Hant': '合盤分析', en: 'Compatibility' },
    navQiming: { 'zh-Hans': '起名服务', 'zh-Hant': '起名服務', en: 'Naming' },
    navZhanbu: { 'zh-Hans': '占卜咨询', 'zh-Hant': '占卜諮詢', en: 'Divination' },
    navFengshui: { 'zh-Hans': '风水调理', 'zh-Hant': '風水調理', en: 'Feng Shui' },
  };

  const INDEX_TEXT = {
    badge: {
      'zh-Hans': '专业命理解读 · 深度分析报告',
      'zh-Hant': '專業命理解讀 · 深度分析報告',
      en: 'Professional Destiny Reading · In-depth Report',
    },
    titleHtml: {
      'zh-Hans': '探索您的人生<br>命理密码',
      'zh-Hant': '探索您的人生<br>命理密碼',
      en: 'Unlock Your Life<br>Destiny Code',
    },
    subtitle: {
      'zh-Hans': '以专业八字命理为核心，深度拆解先天格局、用神喜忌与未来运势节奏，帮助你看清趋势、把握时机。',
      'zh-Hant': '以專業八字命理為核心，深度拆解先天格局、用神喜忌與未來運勢節奏，幫助你看清趨勢、把握時機。',
      en: 'Built on professional Bazi methodology to decode your natal structure, useful elements, and future timing for clearer decisions.',
    },
    formTitle: { 'zh-Hans': '输入您的生辰', 'zh-Hant': '輸入您的生辰', en: 'Enter Birth Details' },
    formSubtitle: {
      'zh-Hans': '获取免费的八字排盘与基础解读',
      'zh-Hant': '獲取免費的八字排盤與基礎解讀',
      en: 'Get a free Bazi chart and basic reading',
    },
    solar: { 'zh-Hans': '阳历', 'zh-Hant': '陽曆', en: 'Solar' },
    lunar: { 'zh-Hans': '农历', 'zh-Hant': '農曆', en: 'Lunar' },
    yearLabel: { 'zh-Hans': '出生年份', 'zh-Hant': '出生年份', en: 'Birth Year' },
    yearPlaceholder: { 'zh-Hans': '例如：1990', 'zh-Hant': '例如：1990', en: 'e.g. 1990' },
    monthLabel: { 'zh-Hans': '月份', 'zh-Hant': '月份', en: 'Month' },
    dayLabel: { 'zh-Hans': '日期', 'zh-Hant': '日期', en: 'Day' },
    dayPlaceholder: { 'zh-Hans': '日期', 'zh-Hant': '日期', en: 'Day' },
    hourLabel: { 'zh-Hans': '时辰', 'zh-Hant': '時辰', en: 'Hour' },
    genderLabel: { 'zh-Hans': '性别', 'zh-Hant': '性別', en: 'Gender' },
    male: { 'zh-Hans': '男命', 'zh-Hant': '男命', en: 'Male' },
    female: { 'zh-Hans': '女命', 'zh-Hant': '女命', en: 'Female' },
    birthplaceLabel: { 'zh-Hans': '出生地（可选）', 'zh-Hant': '出生地（可選）', en: 'Birthplace (Optional)' },
    birthplacePlaceholder: {
      'zh-Hans': '例如：北京 / 上海 / 广州',
      'zh-Hant': '例如：北京 / 上海 / 廣州',
      en: 'e.g. Beijing / Shanghai / Guangzhou',
    },
    geoHint: {
      'zh-Hans': '用于真太阳时校正，提高排盘精度',
      'zh-Hant': '用於真太陽時校正，提高排盤精度',
      en: 'Used for true-solar-time correction to improve chart accuracy',
    },
    freeBtn: { 'zh-Hans': '免费排盘解读', 'zh-Hant': '免費排盤解讀', en: 'Free Bazi Reading' },
    paidBtn: { 'zh-Hans': '立即解锁完整命理报告', 'zh-Hant': '立即解鎖完整命理報告', en: 'Unlock Full Destiny Report' },
    payTitle: { 'zh-Hans': '解锁完整深度命理报告', 'zh-Hant': '解鎖完整深度命理報告', en: 'Unlock Full In-depth Report' },
    paySub: {
      'zh-Hans': '免费版仅含基础排盘，完整报告涵盖 15 大维度 · 深度解析约 5000 字',
      'zh-Hant': '免費版僅含基礎排盤，完整報告涵蓋 15 大維度 · 深度解析約 5000 字',
      en: 'Free tier includes basics only. Full report covers 15 dimensions · around 5000 Chinese characters',
    },
    payFeatures: {
      'zh-Hans': [
        '▸ 用神喜忌 · 五行扶抑精解',
        '▸ 事业财运 · 适合行业与黄金期',
        '▸ 感情婚姻 · 配偶特征与感情走势',
        '▸ 二婚出轨 · 感情隐患深度剖析',
        '▸ 健康注意 · 五行薄弱对应身体',
        '▸ 神煞分析 · 贵人文昌驿马桃花',
        '▸ 子女缘分 · 数量时机与亲子关系',
        '▸ 地支刑冲 · 六合六冲三合三会',
        '▸ 空亡分析 · 日柱年柱旬空填实',
        '▸ 财库分析 · 辰戌丑未开库时机',
        '▸ 大运详解 · 当前及未来三步大运',
        '▸ 特殊流年 · 冲克应对逐年建议',
        '▸ 后五年逐年流年',
        '▸ 事业财运 × 感情健康 × 家宅运势，精准到年',
      ],
      'zh-Hant': [
        '▸ 用神喜忌 · 五行扶抑精解',
        '▸ 事業財運 · 適合行業與黃金期',
        '▸ 感情婚姻 · 配偶特徵與感情走勢',
        '▸ 二婚出軌 · 感情隱患深度剖析',
        '▸ 健康注意 · 五行薄弱對應身體',
        '▸ 神煞分析 · 貴人文昌驛馬桃花',
        '▸ 子女緣分 · 數量時機與親子關係',
        '▸ 地支刑沖 · 六合六沖三合三會',
        '▸ 空亡分析 · 日柱年柱旬空填實',
        '▸ 財庫分析 · 辰戌丑未開庫時機',
        '▸ 大運詳解 · 當前及未來三步大運',
        '▸ 特殊流年 · 沖剋應對逐年建議',
        '▸ 後五年逐年流年',
        '▸ 事業財運 × 感情健康 × 家宅運勢，精準到年',
      ],
      en: [
        '▸ Useful elements · five-element balancing',
        '▸ Career & wealth · suitable fields and timing',
        '▸ Relationship · partner profile and trend',
        '▸ Emotional risks · deep risk diagnosis',
        '▸ Health focus · weak elements and body mapping',
        '▸ ShenSha · nobleman, study, movement, romance stars',
        '▸ Children affinity · timing, quantity, parenting',
        '▸ Branch clashes · 六合/六冲/三合/三会',
        '▸ Void periods · kong-wang impact analysis',
        '▸ Wealth storage · timing to open wealth vault',
        '▸ Luck cycles · current + next three phases',
        '▸ Key years · yearly conflict response',
        '▸ Next five years outlook',
        '▸ Career × Relationship × Health × Home, year-level guidance',
      ],
    },
    monthOptions: {
      'zh-Hans': ['选择月份', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
      'zh-Hant': ['選擇月份', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
      en: ['Select month', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    hourOptions: {
      'zh-Hans': [
        '选择时辰', '子时 23:00-01:00', '丑时 01:00-03:00', '寅时 03:00-05:00', '卯时 05:00-07:00',
        '辰时 07:00-09:00', '巳时 09:00-11:00', '午时 11:00-13:00', '未时 13:00-15:00',
        '申时 15:00-17:00', '酉时 17:00-19:00', '戌时 19:00-21:00', '亥时 21:00-23:00',
      ],
      'zh-Hant': [
        '選擇時辰', '子時 23:00-01:00', '丑時 01:00-03:00', '寅時 03:00-05:00', '卯時 05:00-07:00',
        '辰時 07:00-09:00', '巳時 09:00-11:00', '午時 11:00-13:00', '未時 13:00-15:00',
        '申時 15:00-17:00', '酉時 17:00-19:00', '戌時 19:00-21:00', '亥時 21:00-23:00',
      ],
      en: [
        'Select hour', 'Zi 23:00-01:00', 'Chou 01:00-03:00', 'Yin 03:00-05:00', 'Mao 05:00-07:00',
        'Chen 07:00-09:00', 'Si 09:00-11:00', 'Wu 11:00-13:00', 'Wei 13:00-15:00',
        'Shen 15:00-17:00', 'You 17:00-19:00', 'Xu 19:00-21:00', 'Hai 21:00-23:00',
      ],
    },
  };

  const HEPAN_TEXT = {
    pageTag: { 'zh-Hans': 'Compatibility Analysis', 'zh-Hant': 'Compatibility Analysis', en: 'Compatibility Analysis' },
    title: { 'zh-Hans': '合盘配对', 'zh-Hant': '合盤配對', en: 'Compatibility Match' },
    subtitle: {
      'zh-Hans': '输入双方生辰八字，深度分析两人命理契合度',
      'zh-Hant': '輸入雙方生辰八字，深度分析兩人命理契合度',
      en: 'Enter both birth charts for an in-depth compatibility analysis',
    },
    male: { 'zh-Hans': '男方', 'zh-Hant': '男方', en: 'Male' },
    female: { 'zh-Hans': '女方', 'zh-Hant': '女方', en: 'Female' },
    maleChart: { 'zh-Hans': '男方八字', 'zh-Hant': '男方八字', en: 'Male Chart' },
    femaleChart: { 'zh-Hans': '女方八字', 'zh-Hant': '女方八字', en: 'Female Chart' },
    solar: { 'zh-Hans': '阳历', 'zh-Hant': '陽曆', en: 'Solar' },
    lunar: { 'zh-Hans': '农历', 'zh-Hant': '農曆', en: 'Lunar' },
    yearLabel: { 'zh-Hans': '出生年份', 'zh-Hant': '出生年份', en: 'Birth Year' },
    yearPlaceholderMan: { 'zh-Hans': '例：1990', 'zh-Hant': '例：1990', en: 'e.g. 1990' },
    yearPlaceholderWoman: { 'zh-Hans': '例：1992', 'zh-Hant': '例：1992', en: 'e.g. 1992' },
    monthLabel: { 'zh-Hans': '月', 'zh-Hant': '月', en: 'Month' },
    dayLabel: { 'zh-Hans': '日', 'zh-Hant': '日', en: 'Day' },
    dayPlaceholder: { 'zh-Hans': '日期', 'zh-Hant': '日期', en: 'Day' },
    hourLabel: { 'zh-Hans': '时辰', 'zh-Hant': '時辰', en: 'Hour' },
    payEntryBtn: { 'zh-Hans': '立即付费解锁合盘报告', 'zh-Hant': '立即付費解鎖合盤報告', en: 'Pay to Unlock Compatibility Report' },
    payBtn: { 'zh-Hans': '立即解锁合盘报告', 'zh-Hant': '立即解鎖合盤報告', en: 'Unlock Compatibility Report' },
    payTitle: { 'zh-Hans': '解锁完整合盘报告', 'zh-Hant': '解鎖完整合盤報告', en: 'Unlock Full Compatibility Report' },
    paySubHtml: {
      'zh-Hans': '以上为命理速览 · 完整合盘深度分析两命相合程度<br>涵盖 10 大维度 · 约 3000 字精准解读',
      'zh-Hant': '以上為命理速覽 · 完整合盤深度分析兩命相合程度<br>涵蓋 10 大維度 · 約 3000 字精準解讀',
      en: 'Above is a quick preview · Full report deeply analyzes your compatibility<br>Covers 10 dimensions · around 3000 Chinese characters',
    },
    payFeatures: {
      'zh-Hans': [
        '▸ 日主五行 · 相生相克关系',
        '▸ 五行互补 · 扶持与消耗',
        '▸ 日支合缘 · 六合冲克分析',
        '▸ 婚姻星状态 · 配偶宫判断',
        '▸ 财运互助 · 两人财路配合',
        '▸ 感情深浅 · 桃花与婚恋',
        '▸ 感情隐患 · 第三者风险',
        '▸ 子女缘分 · 数量与时机',
        '▸ 大运配合 · 缘分起伏节点',
        '▸ 综合评价与建议 · 五行调整方向',
      ],
      'zh-Hant': [
        '▸ 日主五行 · 相生相剋關係',
        '▸ 五行互補 · 扶持與消耗',
        '▸ 日支合緣 · 六合沖剋分析',
        '▸ 婚姻星狀態 · 配偶宮判斷',
        '▸ 財運互助 · 兩人財路配合',
        '▸ 感情深淺 · 桃花與婚戀',
        '▸ 感情隱患 · 第三者風險',
        '▸ 子女緣分 · 數量與時機',
        '▸ 大運配合 · 緣分起伏節點',
        '▸ 綜合評價與建議 · 五行調整方向',
      ],
      en: [
        '▸ Day Master relation · generating / controlling dynamics',
        '▸ Five-element complement · support vs. drain',
        '▸ Marriage palace bond · 六合 / clash analysis',
        '▸ Marriage stars · spouse-palace reading',
        '▸ Wealth synergy · financial cooperation',
        '▸ Emotional depth · attraction and love pattern',
        '▸ Hidden risks · third-party interference risk',
        '▸ Children affinity · timing and tendency',
        '▸ Luck-cycle sync · key turning points',
        '▸ Final verdict & advice · practical adjustment strategy',
      ],
    },
    marketingCopy: {
      'zh-Hans': '完整版合盘报告（约 4000+）将按 10 大项逐条展开：日主关系、五行互补、婚姻宫、婚姻星、性格契合、财运配合、感情隐患、子女缘分、大运走势、综合评价。不是空泛套话，而是可执行的关系决策参考。',
      'zh-Hant': '完整版合盤報告（約 4000+）將按 10 大項逐條展開：日主關係、五行互補、婚姻宮、婚姻星、性格契合、財運配合、感情隱患、子女緣分、大運走勢、綜合評價。不是空泛套話，而是可執行的關係決策參考。',
      en: 'The full compatibility report (4,000+ words) covers 10 dimensions: Day Master relation, five-element complementarity, marriage palace, marriage stars, personality fit, wealth synergy, emotional risks, children affinity, luck-cycle trend, and final verdict.',
    },
    monthOptions: INDEX_TEXT.monthOptions,
    hourOptions: INDEX_TEXT.hourOptions,
    resultTitle: { 'zh-Hans': '合盘分析', 'zh-Hant': '合盤分析', en: 'Compatibility Analysis' },
    loadingHtml: {
      'zh-Hans': '<div class="loading-spinner" style="margin: 0 auto 12px;"></div>命理师正在为您解读合盘，请稍候...',
      'zh-Hant': '<div class="loading-spinner" style="margin: 0 auto 12px;"></div>命理師正在為您解讀合盤，請稍候...',
      en: '<div class="loading-spinner" style="margin: 0 auto 12px;"></div>Analyzing compatibility, please wait...',
    },
  };

const RESULT_TEXT = {
    birthInfo: { 'zh-Hans': '出生信息', 'zh-Hant': '出生信息', en: 'Birth Information' },
    chartTitle: { 'zh-Hans': '命局细盘（表格版）', 'zh-Hant': '命局細盤（表格版）', en: 'Natal Chart (Table)' },
    analysisTitle: { 'zh-Hans': '资深命理师解读', 'zh-Hant': '資深命理師解讀', en: 'Expert Interpretation' },
  paidBtn: { 'zh-Hans': '立即解锁完整命理报告', 'zh-Hant': '立即解鎖完整命理報告', en: 'Unlock Full Destiny Report' },
  payBtn: { 'zh-Hans': '立即解锁完整命理报告', 'zh-Hant': '立即解鎖完整命理報告', en: 'Unlock Full Destiny Report' },
};

  function pageName() {
    const p = window.location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function pick(map, lang) {
    return map?.[lang] ?? map?.['zh-Hans'] ?? '';
  }

  function setText(selector, value) {
    if (!value) return;
    const nodes = document.querySelectorAll(selector);
    nodes.forEach((node) => {
      node.textContent = value;
      syncButtonDefault(node);
    });
  }

  function setHTML(selector, value) {
    if (!value) return;
    const nodes = document.querySelectorAll(selector);
    nodes.forEach((node) => {
      node.innerHTML = value;
      syncButtonDefault(node);
    });
  }

  function setPlaceholder(id, value) {
    const input = document.getElementById(id);
    if (input && value) input.setAttribute('placeholder', value);
  }

  function setGroupLabelByInputId(id, value) {
    if (!value) return;
    const input = document.getElementById(id);
    const label = input?.closest('.form-group')?.querySelector('.form-label');
    if (label) label.textContent = value;
  }

  function setToggleLabel(id, value) {
    if (!value) return;
    const label = document.getElementById(id);
    if (!label) return;
    const input = label.querySelector('input');
    if (!input) {
      label.textContent = value;
      return;
    }
    label.innerHTML = '';
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${value}`));
  }

  function setRadioLabelInContainer(containerSelector, index, value) {
    if (!value) return;
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const labels = container.querySelectorAll('.form-gender-label');
    const label = labels[index];
    if (!label) return;
    const input = label.querySelector('input');
    if (!input) {
      label.textContent = value;
      return;
    }
    label.innerHTML = '';
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${value}`));
  }

  function setOptions(selectId, labels) {
    if (!labels?.length) return;
    const select = document.getElementById(selectId);
    if (!select) return;
    const options = Array.from(select.options);
    options.forEach((opt, i) => {
      if (labels[i]) opt.textContent = labels[i];
    });
  }

  function setFeatureList(selector, labels) {
    if (!Array.isArray(labels)) return;
    const nodes = document.querySelectorAll(selector);
    nodes.forEach((node, i) => {
      if (labels[i]) node.textContent = labels[i];
    });
  }

  function syncButtonDefault(node) {
    if (!node) return;
    const tag = node.tagName?.toLowerCase();
    if (tag !== 'button' && !node.id?.includes('btn')) return;
    if (node.dataset) node.dataset.defaultText = node.textContent.trim();
  }

  function ensureLangStyle() {
    if (document.getElementById('site-lang-style')) return;
    const style = document.createElement('style');
    style.id = 'site-lang-style';
    style.textContent = `
      .navbar-lang-select {
        height: 32px;
        padding: 0 10px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: #fff;
        color: #334155;
        font-size: 12px;
        cursor: pointer;
      }
      .navbar-lang-select:focus {
        outline: none;
        border-color: #2563eb;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLangSelect() {
    ensureLangStyle();
    const right = document.querySelector('.navbar-right');
    if (!right) return null;

    const oldLabel = right.querySelector('.navbar-lang');
    if (oldLabel) oldLabel.style.display = 'none';

    let select = right.querySelector('#site-lang-select');
    if (!select) {
      select = document.createElement('select');
      select.id = 'site-lang-select';
      select.className = 'navbar-lang-select';
      select.innerHTML = `
        <option value="zh-Hans">简体中文</option>
        <option value="zh-Hant">繁體中文</option>
        <option value="en">English</option>
      `;
      right.appendChild(select);
    }
    return select;
  }

  function applyCommon(lang) {
    setText('.navbar-nav a[href="index.html"]', pick(COMMON_TEXT.navHome, lang));
    setText('.navbar-nav a[href="hepan.html"]', pick(COMMON_TEXT.navHepan, lang));
    setText('.navbar-nav a[href="qiming.html"]', pick(COMMON_TEXT.navQiming, lang));
    setText('.navbar-nav a[href="zhanbu.html"]', pick(COMMON_TEXT.navZhanbu, lang));
    setText('.navbar-nav a[href="fengshui.html"]', pick(COMMON_TEXT.navFengshui, lang));
  }

  function applyIndex(lang) {
    if (pageName() !== 'index.html') return;

    setText('.hero-badge span:last-child', pick(INDEX_TEXT.badge, lang));
    setHTML('.hero-title', pick(INDEX_TEXT.titleHtml, lang));
    setText('.hero-subtitle', pick(INDEX_TEXT.subtitle, lang));
    setText('.form-title', pick(INDEX_TEXT.formTitle, lang));
    setText('.form-subtitle', pick(INDEX_TEXT.formSubtitle, lang));

    setToggleLabel('lbl-solar', pick(INDEX_TEXT.solar, lang));
    setToggleLabel('lbl-lunar', pick(INDEX_TEXT.lunar, lang));
    setGroupLabelByInputId('year', pick(INDEX_TEXT.yearLabel, lang));
    setGroupLabelByInputId('month', pick(INDEX_TEXT.monthLabel, lang));
    setGroupLabelByInputId('day', pick(INDEX_TEXT.dayLabel, lang));
    setGroupLabelByInputId('hour', pick(INDEX_TEXT.hourLabel, lang));
    setPlaceholder('year', pick(INDEX_TEXT.yearPlaceholder, lang));
    setPlaceholder('day', pick(INDEX_TEXT.dayPlaceholder, lang));
    setOptions('month', pick(INDEX_TEXT.monthOptions, lang));
    setOptions('hour', pick(INDEX_TEXT.hourOptions, lang));

    const genderInput = document.querySelector('input[name="gender"]');
    const genderLabel = genderInput?.closest('.form-group')?.querySelector('.form-label');
    if (genderLabel) genderLabel.textContent = pick(INDEX_TEXT.genderLabel, lang);
    setRadioLabelInContainer('.form-gender', 0, pick(INDEX_TEXT.male, lang));
    setRadioLabelInContainer('.form-gender', 1, pick(INDEX_TEXT.female, lang));

    setGroupLabelByInputId('birthplace', pick(INDEX_TEXT.birthplaceLabel, lang));
    setPlaceholder('birthplace', pick(INDEX_TEXT.birthplacePlaceholder, lang));
    setText('#geo-hint', pick(INDEX_TEXT.geoHint, lang));

    setText('#bazi-form > button.form-submit[type="submit"]', pick(INDEX_TEXT.freeBtn, lang));
    setText('#paid-btn', pick(INDEX_TEXT.paidBtn, lang));
    setText('.hero-form-card .pay-card .pay-card-title', pick(INDEX_TEXT.payTitle, lang));
    setText('.hero-form-card .pay-card .pay-card-sub', pick(INDEX_TEXT.paySub, lang));
    setFeatureList('.hero-form-card .pay-features span', pick(INDEX_TEXT.payFeatures, lang));
  }

  function applyHepan(lang) {
    if (pageName() !== 'hepan.html') return;

    setText('.page-tag', pick(HEPAN_TEXT.pageTag, lang));
    setText('.page-title', pick(HEPAN_TEXT.title, lang));
    setText('.page-subtitle', pick(HEPAN_TEXT.subtitle, lang));

    setText('.person-card.male .person-label', pick(HEPAN_TEXT.male, lang));
    setText('.person-card.female .person-label', pick(HEPAN_TEXT.female, lang));
    setText('.bazi-overview .bazi-mini-card:nth-child(1) .mini-label', pick(HEPAN_TEXT.maleChart, lang));
    setText('.bazi-overview .bazi-mini-card:nth-child(2) .mini-label', pick(HEPAN_TEXT.femaleChart, lang));

    setToggleLabel('man-lbl-solar', pick(HEPAN_TEXT.solar, lang));
    setToggleLabel('man-lbl-lunar', pick(HEPAN_TEXT.lunar, lang));
    setToggleLabel('woman-lbl-solar', pick(HEPAN_TEXT.solar, lang));
    setToggleLabel('woman-lbl-lunar', pick(HEPAN_TEXT.lunar, lang));

    setGroupLabelByInputId('man-year', pick(HEPAN_TEXT.yearLabel, lang));
    setGroupLabelByInputId('woman-year', pick(HEPAN_TEXT.yearLabel, lang));
    setPlaceholder('man-year', pick(HEPAN_TEXT.yearPlaceholderMan, lang));
    setPlaceholder('woman-year', pick(HEPAN_TEXT.yearPlaceholderWoman, lang));

    setGroupLabelByInputId('man-month', pick(HEPAN_TEXT.monthLabel, lang));
    setGroupLabelByInputId('woman-month', pick(HEPAN_TEXT.monthLabel, lang));
    setOptions('man-month', pick(HEPAN_TEXT.monthOptions, lang));
    setOptions('woman-month', pick(HEPAN_TEXT.monthOptions, lang));

    setGroupLabelByInputId('man-day', pick(HEPAN_TEXT.dayLabel, lang));
    setGroupLabelByInputId('woman-day', pick(HEPAN_TEXT.dayLabel, lang));
    setPlaceholder('man-day', pick(HEPAN_TEXT.dayPlaceholder, lang));
    setPlaceholder('woman-day', pick(HEPAN_TEXT.dayPlaceholder, lang));

    setGroupLabelByInputId('man-hour', pick(HEPAN_TEXT.hourLabel, lang));
    setGroupLabelByInputId('woman-hour', pick(HEPAN_TEXT.hourLabel, lang));
    setOptions('man-hour', pick(HEPAN_TEXT.hourOptions, lang));
    setOptions('woman-hour', pick(HEPAN_TEXT.hourOptions, lang));

    setText('#hepan-pay-entry-btn', pick(HEPAN_TEXT.payEntryBtn, lang));
    setText('#hepan-pay-btn', pick(HEPAN_TEXT.payBtn, lang));
    setText('#pay-card .pay-card-title', pick(HEPAN_TEXT.payTitle, lang));
    setHTML('#pay-card .pay-card-sub', pick(HEPAN_TEXT.paySubHtml, lang));
    setFeatureList('#pay-card .pay-features span', pick(HEPAN_TEXT.payFeatures, lang));
    setText('#pay-card .pay-marketing-copy', pick(HEPAN_TEXT.marketingCopy, lang));
    setText('#hepan-content .mk-card-title', pick(HEPAN_TEXT.resultTitle, lang));
    const loadingEl = document.getElementById('hepan-loading');
    if (loadingEl && loadingEl.style.display !== 'none') {
      loadingEl.innerHTML = pick(HEPAN_TEXT.loadingHtml, lang);
    }
  }

  function applyResult(lang) {
    if (pageName() !== 'result.html') return;
    const titles = document.querySelectorAll('.mk-card-title');
    if (titles[0]) titles[0].textContent = pick(RESULT_TEXT.birthInfo, lang);
    if (titles[1]) titles[1].textContent = pick(RESULT_TEXT.chartTitle, lang);
    if (titles[2]) titles[2].textContent = pick(RESULT_TEXT.analysisTitle, lang);
    setText('#paid-btn', pick(RESULT_TEXT.paidBtn, lang));
    setText('#pay-btn', pick(RESULT_TEXT.payBtn, lang));
  }

  function applyLanguage(lang) {
    const normalized = LANGS.includes(lang) ? lang : 'zh-Hans';
    localStorage.setItem(STORAGE_KEY, normalized);

    document.documentElement.setAttribute(
      'lang',
      normalized === 'en' ? 'en' : (normalized === 'zh-Hant' ? 'zh-Hant' : 'zh-CN'),
    );

    const currentPage = pageName();
    const title = TITLES[currentPage] ? pick(TITLES[currentPage], normalized) : '';
    if (title) document.title = title;

    applyCommon(normalized);
    applyIndex(normalized);
    applyHepan(normalized);
    applyResult(normalized);
  }

  function boot() {
    const select = ensureLangSelect();
    if (!select) return;

    const saved = localStorage.getItem(STORAGE_KEY) || 'zh-Hans';
    select.value = LANGS.includes(saved) ? saved : 'zh-Hans';
    applyLanguage(select.value);
    select.addEventListener('change', () => applyLanguage(select.value));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
