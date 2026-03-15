(() => {
  const STORAGE_KEY = 'site_lang_pref_v1';
  const SUPPORTED_LANGS = ['zh-Hans', 'zh-Hant', 'en'];

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

  const COMMON_TRANSLATIONS = [
    {
      selector: '.navbar-nav a[href="index.html"]',
      values: { 'zh-Hans': '八字排盘', 'zh-Hant': '八字排盤', en: 'Bazi Chart' },
    },
    {
      selector: '.navbar-nav a[href="hepan.html"]',
      values: { 'zh-Hans': '合盘分析', 'zh-Hant': '合盤分析', en: 'Compatibility' },
    },
    {
      selector: '.navbar-nav a[href="qiming.html"]',
      values: { 'zh-Hans': '起名服务', 'zh-Hant': '起名服務', en: 'Naming' },
    },
    {
      selector: '.navbar-nav a[href="zhanbu.html"]',
      values: { 'zh-Hans': '占卜咨询', 'zh-Hant': '占卜諮詢', en: 'Divination' },
    },
    {
      selector: '.navbar-nav a[href="fengshui.html"]',
      values: { 'zh-Hans': '风水调理', 'zh-Hant': '風水調理', en: 'Feng Shui' },
    },
  ];

  const PAGE_TRANSLATIONS = {
    'index.html': [
      {
        selector: '.hero-badge span:last-child',
        values: {
          'zh-Hans': '专业命理解读 · 深度分析报告',
          'zh-Hant': '專業命理解讀 · 深度分析報告',
          en: 'Professional Destiny Reading · In-depth Report',
        },
      },
      {
        selector: '.hero-title',
        html: {
          'zh-Hans': '探索您的人生<br>命理密码',
          'zh-Hant': '探索您的人生<br>命理密碼',
          en: 'Unlock Your Life<br>Destiny Code',
        },
      },
      {
        selector: '.hero-subtitle',
        values: {
          'zh-Hans': '以专业八字命理为核心，深度拆解先天格局、用神喜忌与未来运势节奏，帮助你看清趋势、把握时机。',
          'zh-Hant': '以專業八字命理為核心，深度拆解先天格局、用神喜忌與未來運勢節奏，幫助你看清趨勢、把握時機。',
          en: 'Built on professional Bazi methodology to decode your natal structure, useful elements, and future timing for clearer decisions.',
        },
      },
      {
        selector: '.form-title',
        values: {
          'zh-Hans': '输入您的生辰',
          'zh-Hant': '輸入您的生辰',
          en: 'Enter Birth Details',
        },
      },
      {
        selector: '.form-subtitle',
        values: {
          'zh-Hans': '获取免费八字排盘与基础解读',
          'zh-Hant': '獲取免費八字排盤與基礎解讀',
          en: 'Get a free Bazi chart and basic reading',
        },
      },
      {
        selector: '#paid-btn',
        values: {
          'zh-Hans': '立即解锁完整命理报告',
          'zh-Hant': '立即解鎖完整命理報告',
          en: 'Unlock Full Destiny Report',
        },
      },
      {
        selector: '.pay-card-title',
        values: {
          'zh-Hans': '解锁完整深度命理报告',
          'zh-Hant': '解鎖完整深度命理報告',
          en: 'Unlock Full In-depth Report',
        },
      },
    ],
    'hepan.html': [
      {
        selector: '.page-tag',
        values: {
          'zh-Hans': 'Compatibility Analysis',
          'zh-Hant': 'Compatibility Analysis',
          en: 'Compatibility Analysis',
        },
      },
      {
        selector: '.page-title',
        values: {
          'zh-Hans': '合盘配对',
          'zh-Hant': '合盤配對',
          en: 'Compatibility Match',
        },
      },
      {
        selector: '.page-subtitle',
        values: {
          'zh-Hans': '输入双方生辰八字，深度分析两人命理契合度',
          'zh-Hant': '輸入雙方生辰八字，深度分析兩人命理契合度',
          en: 'Enter both birth charts for an in-depth compatibility analysis',
        },
      },
      {
        selector: '#hepan-pay-entry-btn',
        values: {
          'zh-Hans': '立即付费解锁合盘报告',
          'zh-Hant': '立即付費解鎖合盤報告',
          en: 'Pay to Unlock Compatibility Report',
        },
      },
      {
        selector: '#hepan-pay-btn',
        values: {
          'zh-Hans': '立即解锁合盘报告',
          'zh-Hant': '立即解鎖合盤報告',
          en: 'Unlock Compatibility Report',
        },
      },
      {
        selector: '.pay-marketing-copy',
        values: {
          'zh-Hans': '完整版合盘报告（约 4000+）将按 10 大项逐条展开：日主关系、五行互补、婚姻宫、婚姻星、性格契合、财运配合、感情隐患、子女缘分、大运走势、综合评价。不是空泛套话，而是可执行的关系决策参考。',
          'zh-Hant': '完整版合盤報告（約 4000+）將按 10 大項逐條展開：日主關係、五行互補、婚姻宮、婚姻星、性格契合、財運配合、感情隱患、子女緣分、大運走勢、綜合評價。不是空泛套話，而是可執行的關係決策參考。',
          en: 'The full compatibility report (4,000+ words) covers 10 dimensions: Day Master relation, five-element complementarity, marriage palace, marriage stars, personality fit, wealth synergy, emotional risks, children affinity, luck-cycle trend, and final verdict.',
        },
      },
      {
        selector: '.pay-card-title',
        values: {
          'zh-Hans': '解锁完整合盘报告',
          'zh-Hant': '解鎖完整合盤報告',
          en: 'Unlock Full Compatibility Report',
        },
      },
    ],
    'result.html': [
      {
        selector: '.mk-card-title',
        values: {
          'zh-Hans': '出生信息',
          'zh-Hant': '出生信息',
          en: 'Birth Information',
        },
      },
      {
        selector: '#paid-btn',
        values: {
          'zh-Hans': '立即解锁完整命理报告',
          'zh-Hant': '立即解鎖完整命理報告',
          en: 'Unlock Full Destiny Report',
        },
      },
    ],
  };

  function pageName() {
    const path = window.location.pathname.split('/').pop();
    return path || 'index.html';
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
    if (select) return select;

    select = document.createElement('select');
    select.id = 'site-lang-select';
    select.className = 'navbar-lang-select';
    select.innerHTML = `
      <option value="zh-Hans">简体中文</option>
      <option value="zh-Hant">繁體中文</option>
      <option value="en">English</option>
    `;
    right.appendChild(select);
    return select;
  }

  function applyEntries(entries, lang) {
    entries.forEach((entry) => {
      const nodes = document.querySelectorAll(entry.selector);
      if (!nodes.length) return;
      nodes.forEach((node) => {
        if (entry.html && entry.html[lang]) {
          node.innerHTML = entry.html[lang];
          return;
        }
        if (entry.values && entry.values[lang]) {
          node.textContent = entry.values[lang];
        }
      });
    });
  }

  function applyLanguage(lang) {
    const normalized = SUPPORTED_LANGS.includes(lang) ? lang : 'zh-Hans';
    localStorage.setItem(STORAGE_KEY, normalized);

    document.documentElement.setAttribute(
      'lang',
      normalized === 'en' ? 'en' : (normalized === 'zh-Hant' ? 'zh-Hant' : 'zh-CN'),
    );

    const currentPage = pageName();
    if (TITLES[currentPage] && TITLES[currentPage][normalized]) {
      document.title = TITLES[currentPage][normalized];
    }

    applyEntries(COMMON_TRANSLATIONS, normalized);
    const pageEntries = PAGE_TRANSLATIONS[currentPage] || [];
    applyEntries(pageEntries, normalized);
  }

  function bootstrapLang() {
    const select = ensureLangSelect();
    if (!select) return;

    const savedLang = localStorage.getItem(STORAGE_KEY) || 'zh-Hans';
    select.value = SUPPORTED_LANGS.includes(savedLang) ? savedLang : 'zh-Hans';

    applyLanguage(select.value);
    select.addEventListener('change', () => {
      applyLanguage(select.value);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapLang);
  } else {
    bootstrapLang();
  }
})();
