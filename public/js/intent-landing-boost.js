(function () {
  const VERSION = '20260511-intent-v1';

  const CONFIG = {
    '/bazi-caiyun.html': {
      key: 'caiyun',
      eyebrow: '财运决策专题',
      title: '先看清你的来财模式，再决定怎么赚钱',
      subtitle: '很多人不是不努力，而是用错赚钱方式、踩错年份。先免费排盘看基础判断，再按需解锁财运窗口、破财风险和行动顺序。',
      primary: '免费排盘，看我的财运底盘',
      secondary: '先看报告样张',
      problem: ['收入一直卡住，不知道该换工作、做副业还是创业', '赚到钱但留不住，担心破财年份和现金流风险', '想知道未来三年哪一年更适合主动放大收入'],
      preview: ['免费先看：命盘结构、用神喜忌、当前运势判断', '付费后看：财富高峰期、赚钱方式、破财年份、行业黄金期', '适合：跳槽涨薪、副业启动、创业投入、投资买房前'],
      sampleTitle: '财运报告会拆成这 3 层',
      samples: [
        ['来财模式', '正财 / 偏财 / 食伤生财，看你适合稳定收入、项目收入还是经营收入。'],
        ['年份窗口', '未来三年哪些年份适合冲，哪些年份要保现金流，避免在低胜率年份重仓。'],
        ['风险预警', '破财、合伙、投资、借贷、冲库开库等节点提前标记。'],
      ],
      proof: '价格展示与实付一致，支付成功后通常 20-60 秒生成，订单支持找回。',
      utm: 'caiyun_report',
    },
    '/bazi-shiye.html': {
      key: 'shiye',
      eyebrow: '事业决策专题',
      title: '事业卡住时，先判断赛道和年份，不要只靠硬扛',
      subtitle: '同样的能力，放在错的岗位和年份里会变成内耗。先免费排盘看职业底盘，再决定跳槽、转行、升职或创业。',
      primary: '免费排盘，看我的事业窗口',
      secondary: '查看事业报告样张',
      problem: ['工作多年没有突破，不确定是方向错还是时间未到', '想跳槽、转行、考公或创业，但担心一步走错', '明明很努力，却总在关键节点被阻力拖住'],
      preview: ['免费先看：命盘结构、能力偏向、当前阶段判断', '付费后看：行业适配、跳槽窗口、贵人模式、未来三年节奏', '适合：职业转型、升职谈薪、创业前、换城市发展前'],
      sampleTitle: '事业报告重点看这 3 件事',
      samples: [
        ['赛道匹配', '判断你更适合稳定组织、专业深耕、管理路线还是经营型路径。'],
        ['变动时机', '看什么时候适合跳槽、转行、换城市，什么时候应该先蓄力。'],
        ['行动顺序', '先补能力、先换平台、先做副业验证，避免盲目裸辞。'],
      ],
      proof: '先看基础判断，再决定是否解锁；适合正在做职业选择的人。',
      utm: 'career_report',
    },
    '/bazi-hunyin.html': {
      key: 'hunyin',
      eyebrow: '婚恋关系专题',
      title: '感情反复拉扯时，先看关系结构，再决定推进还是止损',
      subtitle: '关系问题最怕只凭情绪做决定。先免费排盘看你的婚恋模式，再看关键年份、隐患预警和相处说明书。',
      primary: '免费排盘，看我的婚恋模式',
      secondary: '查看婚恋报告样张',
      problem: ['关系反复内耗，不知道该继续、等待还是退出', '准备结婚或复合，想先看长期稳定度', '总遇到烂桃花，想知道问题是时机、对象还是自身模式'],
      preview: ['免费先看：感情模式、婚恋倾向、当前阶段判断', '付费后看：婚姻趋势、相处说明书、隐患预警、关键年份', '适合：恋爱推进、复合判断、婚前确认、婚后关系修复'],
      sampleTitle: '婚恋报告会给你这些判断',
      samples: [
        ['关系模式', '看你容易被什么人吸引，也容易在哪些互动里消耗。'],
        ['推进窗口', '哪些年份适合确定关系、结婚、修复，哪些年份容易冷战反复。'],
        ['风险提醒', '隐患预警包含二婚、出轨、长期消耗点和止损边界。'],
      ],
      proof: '报告为决策参考，不替代现实沟通；重点是降低反复试错成本。',
      utm: 'relationship_report',
    },
    '/liunian-yunshi.html': {
      key: 'liunian',
      eyebrow: '2026 流年专题',
      title: '今年该冲还是该守？先看你的 2026 个人流年节奏',
      subtitle: '流年不是泛泛生肖运势，而是把你的命盘和当年节奏叠加，拆出事业、财运、感情与风险月份。',
      primary: '免费排盘，看我的 2026 节奏',
      secondary: '查看流年报告样张',
      problem: ['今年想换工作、创业、买房或结婚，但不确定时机', '感觉机会和压力同时出现，不知道先处理哪一块', '想提前避开高风险月份，把关键动作放在更顺的窗口'],
      preview: ['免费先看：命盘结构、当前阶段、今年基础判断', '付费后看：未来三步大运、后五年逐年建议、2026 风险窗口', '适合：年度规划、季度行动安排、重大决策前'],
      sampleTitle: '流年报告不是生肖运势，而是个人节奏表',
      samples: [
        ['全年主线', '先判断 2026 是进攻年、调整年、修复年，还是机会与压力并存。'],
        ['月份节奏', '把行动放在更顺的窗口，把高风险月份用于防守和复盘。'],
        ['逐年建议', '结合未来三步大运和后五年趋势，避免只看一年。'],
      ],
      proof: '适合做年度计划前查看；先免费排盘，再决定是否解锁完整版。',
      utm: 'liunian_report',
    },
  };

  function currentPath() {
    return String(window.location.pathname || '/').replace(/\/+$/, '') || '/';
  }

  function buildHomeUrl(cfg, content) {
    const params = new URLSearchParams({
      intent: cfg.key,
      utm_source: 'intent_page',
      utm_medium: content || 'hero_cta',
      utm_campaign: cfg.utm,
    });
    return '/index.html?' + params.toString() + '#form-section';
  }

  function injectStyle() {
    if (document.getElementById('intent-landing-boost-style')) return;
    const style = document.createElement('style');
    style.id = 'intent-landing-boost-style';
    style.textContent = `
      .intent-hero{position:relative;overflow:hidden;margin:2px 0 26px;padding:26px;border-radius:24px;background:linear-gradient(135deg,#071a32 0%,#0f3563 54%,#1d4ed8 100%);color:#fff;box-shadow:0 24px 70px rgba(10,37,64,.22);}
      .intent-hero:before{content:"";position:absolute;inset:-40% -20% auto auto;width:300px;height:300px;border-radius:999px;background:rgba(255,255,255,.14);filter:blur(4px);}
      .intent-hero>*{position:relative;z-index:1;}
      .intent-eyebrow{display:inline-flex;align-items:center;padding:6px 11px;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:rgba(255,255,255,.12);font-size:12px;font-weight:800;letter-spacing:.5px;}
      .intent-hero h2{margin:14px 0 8px;color:#fff;font-size:34px;line-height:1.22;}
      .intent-hero p{margin:0;color:rgba(255,255,255,.84);font-size:15px;line-height:1.8;}
      .intent-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;}
      .intent-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 17px;border-radius:12px;text-decoration:none;font-weight:900;font-size:14px;}
      .intent-btn.primary{background:#fff;color:#0a2540;}
      .intent-btn.secondary{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.12);color:#fff;}
      .intent-trust{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:16px;}
      .intent-trust span{border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.1);padding:9px 10px;font-size:12px;font-weight:800;text-align:center;}
      .intent-offer{margin:0 0 24px;padding:18px;border:1px solid #bfdbfe;border-radius:20px;background:linear-gradient(180deg,#f8fbff 0%,#fff 100%);}
      .intent-offer h2{margin:0 0 6px;font-size:24px;color:#0a2540;}
      .intent-offer p{color:#475569;}
      .intent-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:13px;}
      .intent-card{border:1px solid #dbeafe;border-radius:16px;background:#fff;padding:13px;}
      .intent-card strong{display:block;color:#0f172a;font-size:15px;margin-bottom:5px;}
      .intent-card span{display:block;color:#475569;font-size:13px;line-height:1.65;}
      .intent-split{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;}
      .intent-panel{border-radius:16px;padding:14px;border:1px solid #dbeafe;background:#fff;}
      .intent-panel.is-warning{border-color:#fed7aa;background:#fff7ed;}
      .intent-panel h3{margin:0 0 8px;color:#0a2540;font-size:17px;}
      .intent-panel ul{margin:0 0 0 18px;padding:0;}
      .intent-panel li{margin:5px 0;color:#334155;font-size:13px;line-height:1.7;}
      .intent-proof{margin-top:12px;border:1px solid #bbf7d0;background:#f0fdf4;color:#14532d;border-radius:14px;padding:11px 12px;font-size:13px;font-weight:800;}
      .intent-sticky{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9998;width:min(860px,calc(100vw - 24px));display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid #bfdbfe;border-radius:16px;background:rgba(255,255,255,.96);box-shadow:0 16px 40px rgba(15,23,42,.18);backdrop-filter:blur(10px);}
      .intent-sticky span{color:#0a2540;font-size:13px;font-weight:900;}
      .intent-sticky a{flex:0 0 auto;text-decoration:none;background:#0a2540;color:#fff;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:900;}
      @media (max-width:720px){.intent-hero{padding:20px;border-radius:20px}.intent-hero h2{font-size:27px}.intent-grid,.intent-trust,.intent-split{grid-template-columns:1fr}.intent-sticky{left:12px;right:12px;bottom:10px;transform:none;width:auto}.intent-sticky span{font-size:12px}.intent-sticky a{padding:9px 10px;}}
    `;
    document.head.appendChild(style);
  }

  function render(cfg) {
    const main = document.querySelector('main.wrap') || document.querySelector('main');
    if (!main || document.getElementById('intent-hero')) return;
    injectStyle();

    const hero = document.createElement('section');
    hero.id = 'intent-hero';
    hero.className = 'intent-hero';
    hero.innerHTML = `
      <div class="intent-eyebrow">${cfg.eyebrow}</div>
      <h2>${cfg.title}</h2>
      <p>${cfg.subtitle}</p>
      <div class="intent-actions">
        <a class="intent-btn primary" href="${buildHomeUrl(cfg, 'hero_primary')}">${cfg.primary}</a>
        <a class="intent-btn secondary" href="#intent-offer">${cfg.secondary}</a>
      </div>
      <div class="intent-trust">
        <span>先免费排盘</span>
        <span>20-60 秒交付</span>
        <span>订单可找回</span>
      </div>
    `;
    main.insertBefore(hero, main.firstElementChild || null);

    const offer = document.createElement('section');
    offer.id = 'intent-offer';
    offer.className = 'intent-offer';
    offer.innerHTML = `
      <h2>${cfg.sampleTitle}</h2>
      <p>用户最担心“付费后不知道拿到什么”。这里先把报告结构讲清楚，再让你决定是否继续。</p>
      <div class="intent-grid">
        ${cfg.samples.map((item) => `<div class="intent-card"><strong>${item[0]}</strong><span>${item[1]}</span></div>`).join('')}
      </div>
      <div class="intent-split">
        <div class="intent-panel is-warning">
          <h3>你可能正在卡住</h3>
          <ul>${cfg.problem.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
        <div class="intent-panel">
          <h3>你会先得到什么</h3>
          <ul>${cfg.preview.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="intent-proof">${cfg.proof}</div>
      <div class="intent-actions">
        <a class="intent-btn primary" href="${buildHomeUrl(cfg, 'offer_primary')}">${cfg.primary}</a>
        <a class="intent-btn secondary" href="/contact.html">先看客服与商户信息</a>
      </div>
    `;
    const firstCta = main.querySelector('.cta');
    if (firstCta) {
      main.insertBefore(offer, firstCta);
    } else {
      main.appendChild(offer);
    }

    const sticky = document.createElement('div');
    sticky.className = 'intent-sticky';
    sticky.innerHTML = `<span>${cfg.eyebrow}：先免费排盘，再决定是否解锁</span><a href="${buildHomeUrl(cfg, 'sticky_cta')}">${cfg.primary}</a>`;
    document.body.appendChild(sticky);
  }

  function init() {
    const cfg = CONFIG[currentPath()];
    if (!cfg) return;
    render(cfg);
    window.__TENGYUNZI_INTENT_LANDING_BUILD = VERSION;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
