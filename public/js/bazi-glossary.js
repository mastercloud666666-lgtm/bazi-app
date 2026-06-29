/* 命局细盘交互：悬停发光 + 释义气泡。释义为原创命理科普，仅供传统文化参考。
   作用于 .bzg-table / .bazi-table，悬停(或手机点按)任意一项即出解释。 */
(function () {
  // —— 术语释义 ——
  const TERM = {
    // 天干
    甲: '阳木·参天大树：进取、正直、有担当，偏固执。',
    乙: '阴木·花草藤蔓：柔韧、善变通、重情，韧性强。',
    丙: '阳火·太阳：热情、光明、外放，有感染力。',
    丁: '阴火·灯烛：温暖、细腻、专注，内秀。',
    戊: '阳土·高山大地：稳重、厚道、可靠，能包容。',
    己: '阴土·田园之土：务实、细致、能蓄养，略多虑。',
    庚: '阳金·刀剑钢铁：果断、刚毅、讲义气，偏锋利。',
    辛: '阴金·珠玉首饰：精致、敏锐、爱美，自尊强。',
    壬: '阳水·江河大海：聪明、有格局、能容纳，善谋。',
    癸: '阴水·雨露溪流：细腻、灵活、富想象，偏敏感。',
    // 地支
    子: '鼠·阳水，藏癸。智慧灵动，子时夜半。',
    丑: '牛·阴土，藏己癸辛。勤恳能忍，金水之库。',
    寅: '虎·阳木，藏甲丙戊。进取有冲劲，木火之始。',
    卯: '兔·阴木，藏乙。温和细致，生发之气。',
    辰: '龙·阳土，藏戊乙癸。多才善变，水之库。',
    巳: '蛇·阴火，藏丙戊庚。精明内敛，火金相生。',
    午: '马·阳火，藏丁己。热烈奔放，火势最旺。',
    未: '羊·阴土，藏己丁乙。温厚念旧，木之库。',
    申: '猴·阳金，藏庚壬戊。机敏利落，金水之源。',
    酉: '鸡·阴金，藏辛。精细爱美，金气最纯。',
    戌: '狗·阳土，藏戊辛丁。忠诚守成，火之库。',
    亥: '猪·阴水，藏壬甲。豁达有福，水势最旺。',
    // 十神
    比肩: '与日主同类同性：自我、兄弟同辈、竞争与合作。',
    劫财: '与日主同类异性：合伙人脉，也主破耗、争夺。',
    食神: '日主所生(同性)：才华、口福、表达，温和的输出。',
    伤官: '日主所生(异性)：创造力、个性、锋芒，聪明易任性。',
    偏财: '日主所克(同性)：流动的钱财、机会、人缘、父亲。',
    正财: '日主所克(异性)：稳定收入、踏实积累、妻子。',
    七杀: '克日主(同性)：压力、魄力、权威、行动力。',
    正官: '克日主(异性)：责任、地位、自律、名声、丈夫。',
    偏印: '生日主(同性)：偏门智慧、直觉、独立思考，亦主孤。',
    正印: '生日主(异性)：学识、母亲、贵人、庇护与安全感。',
    日主: '代表你自己的那个天干，整张命盘以它为中心。',
    比劫: '比肩或劫财，代表自我与同辈的力量。',
    // 十二长生
    长生: '十二长生·如初生：起步、生机勃勃的状态。',
    沐浴: '十二长生·如幼时洗浴：不稳定、易动摇。',
    冠带: '十二长生·如成年加冠：渐成形、走向成熟。',
    临官: '十二长生·如出仕为官：力量渐强、临近巅峰。',
    帝旺: '十二长生·鼎盛之时：力量最旺、最强的状态。',
    衰: '十二长生·盛极而衰：由强转弱的转折。',
    病: '十二长生·如染病：力量衰弱、需调养。',
    死: '十二长生·生机将尽：最弱的状态之一。',
    墓: '十二长生·入库收藏：收敛、入库、蓄积。',
    绝: '十二长生·气息断绝：极弱、转换的临界。',
    胎: '十二长生·如受胎：新一轮的孕育与开始。',
    养: '十二长生·如养育：休养、积蓄、待发。',
    // 神煞
    天乙贵人: '最尊贵的吉神：一生多得贵人相助、逢凶化吉。',
    太极贵人: '主聪慧、好玄学：对学术、命理、宗教有缘。',
    文昌贵人: '主聪明好学：利读书、考试、文采。',
    天德贵人: '主逢凶化吉、心地良善、多福荫。',
    月德贵人: '主慈善有福、得长辈与贵人庇护。',
    禄神: '主衣禄福气：自身能力带来的稳定供养。',
    羊刃: '刚烈之气：魄力强但易冲动，双刃剑。',
    桃花: '主人缘、异性缘、魅力(又称咸池)。',
    驿马: '主走动、变迁、出行、外出发展。',
    华盖: '主才艺、孤高、好独处，与宗教玄学有缘。',
    将星: '主领导力、权威：能聚众、担大任。',
    红鸾: '主婚姻喜庆、感情缘分。',
    天喜: '主喜庆、人缘、乐观。',
    孤辰: '主孤独、独立，感情上略显疏离。',
    寡宿: '主孤寡、自处，宜修身养性。',
    劫煞: '主外来的变动、破耗，需防意外。',
    灾煞: '主血光、灾厄之类的提醒，宜谨慎。',
    亡神: '主内敛、心机、谋略，亦主耗损。',
  };
  // —— 行标签释义 ——
  const ROW = {
    主星: '各柱天干对日主的十神，反映你与外界的核心关系。',
    天干: '四柱上方的字，代表显露在外的力量与人事。',
    地支: '四柱下方的字，代表根基、内在与所处环境。',
    藏干: '地支里暗藏的天干，是内在隐含的力量。',
    副星: '藏干对日主的十神，反映隐藏的潜在影响。',
    五行: '该柱天干/地支所属的五行属性。',
    星运: '各柱天干在本柱地支的十二长生，看其旺衰。',
    自坐: '日主坐在各柱地支上的十二长生状态。',
    纳音: '六十甲子配五行的古法，每柱一个纳音五行别称。',
    空亡: '旬中所缺的两个地支；逢空亡的柱力量易虚。',
    神煞: '命中的吉凶星曜标记，辅助参看人生际遇。',
  };

  function lookup(raw) {
    if (!raw) return null;
    let k = raw.trim().replace(/[（(][^）)]*[）)]/g, '').trim(); // 去掉"(日)"等来源后缀
    return TERM[k] ? { title: k, text: TERM[k] } : (ROW[k] ? { title: k, text: ROW[k] } : null);
  }

  // —— 注入样式 ——
  const css = document.createElement('style');
  css.textContent = `
    .bzg-table td, .bzg-table th, .bazi-table .tiangan, .bazi-table .dizhi { transition: box-shadow .15s ease, background .15s ease; }
    .bzg-hot { cursor: help; }
    .bzg-glow {
      background: rgba(47,143,143,.12) !important;
      box-shadow: 0 0 0 1px rgba(47,143,143,.55), 0 0 14px rgba(47,143,143,.45);
      border-radius: 6px;
    }
    #bzg-tip {
      position: fixed; z-index: 99999; max-width: 270px;
      background: #102233; color: #f3f1ea;
      border: 1px solid rgba(120,180,175,.55);
      border-radius: 10px; padding: 10px 12px;
      font-size: 13px; line-height: 1.65; letter-spacing: .01em;
      box-shadow: 0 10px 30px -8px rgba(0,0,0,.5), 0 0 0 1px rgba(0,0,0,.2);
      pointer-events: none; opacity: 0; transform: translateY(4px);
      transition: opacity .14s ease, transform .14s ease;
    }
    #bzg-tip.show { opacity: 1; transform: translateY(0); }
    #bzg-tip .bzg-tip-title { font-weight: 700; color: #8fd0c8; margin-bottom: 3px; font-size: 14px; }
    @media (prefers-reduced-motion: reduce) {
      .bzg-table td, .bzg-table th, .bazi-table .tiangan, .bazi-table .dizhi, #bzg-tip { transition: none; }
    }
  `;
  document.head.appendChild(css);

  const tip = document.createElement('div');
  tip.id = 'bzg-tip';
  tip.innerHTML = '<div class="bzg-tip-title"></div><div class="bzg-tip-body"></div>';
  document.body.appendChild(tip);
  const tipTitle = tip.querySelector('.bzg-tip-title');
  const tipBody = tip.querySelector('.bzg-tip-body');
  let glowEl = null;

  function inChart(el) {
    return el && el.closest && el.closest('.bzg-table, .bazi-table, #bazi-detail-grid');
  }
  function leafText(el) {
    // 只对"叶子"元素或行标签取词，避免整格误匹配
    if (!el) return '';
    if (el.tagName === 'TH') return el.textContent;
    if (el.children && el.children.length === 0) return el.textContent;
    return '';
  }
  function showTip(el, info, x, y) {
    tipTitle.textContent = info.title;
    tipBody.textContent = info.text;
    tip.classList.add('show');
    const pad = 14, w = 280, h = tip.offsetHeight || 80;
    let left = x + pad, top = y + pad;
    if (left + w > window.innerWidth) left = x - w - pad;
    if (top + h > window.innerHeight) top = y - h - pad;
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, top) + 'px';
    if (glowEl && glowEl !== el) glowEl.classList.remove('bzg-glow');
    el.classList.add('bzg-glow'); glowEl = el;
  }
  function hideTip() {
    tip.classList.remove('show');
    if (glowEl) { glowEl.classList.remove('bzg-glow'); glowEl = null; }
  }

  document.addEventListener('mouseover', (e) => {
    if (!inChart(e.target)) return;
    const info = lookup(leafText(e.target));
    if (info) showTip(e.target, info, e.clientX, e.clientY);
  });
  document.addEventListener('mouseout', (e) => {
    if (glowEl && (e.target === glowEl)) hideTip();
  });
  // 手机：点按显示，点别处隐藏
  document.addEventListener('touchstart', (e) => {
    const t = e.target;
    if (inChart(t)) {
      const info = lookup(leafText(t));
      if (info) { const r = t.getBoundingClientRect(); showTip(t, info, r.left + r.width / 2, r.top); return; }
    }
    hideTip();
  }, { passive: true });
})();
