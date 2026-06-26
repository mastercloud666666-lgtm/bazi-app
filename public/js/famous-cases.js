/* 名人命例画廊 —— 复用本站排盘引擎(BaziCalc)给历史人物排盘，点开即见完整命盘。
   数据可在下方 FAMOUS_CASES 自由增删/修改。
   注意：year/month/day 为【公历】；hour 为出生时辰(0-23 整点)。
   历史人物时辰多有考据争议，时柱仅作示例，请按你的资料校正；年月日柱准确。
   选用宋代文人，呼应宋韵品牌。 */
(function () {
  const FAMOUS_CASES = [
    { name: '苏轼',   era: '北宋', role: '文学家',   gender: '男', y: 1037, m: 1,  d: 8,  h: 12 },
    { name: '李清照', era: '两宋', role: '词宗',     gender: '女', y: 1084, m: 3,  d: 13, h: 12 },
    { name: '王安石', era: '北宋', role: '改革家',   gender: '男', y: 1021, m: 12, d: 18, h: 12 },
    { name: '欧阳修', era: '北宋', role: '文坛领袖', gender: '男', y: 1007, m: 8,  d: 1,  h: 12 },
    { name: '朱熹',   era: '南宋', role: '理学宗师', gender: '男', y: 1130, m: 10, d: 18, h: 12 },
    { name: '辛弃疾', era: '南宋', role: '词人·名将', gender: '男', y: 1140, m: 5,  d: 28, h: 12 },
  ];

  function calcPillars(c) {
    try { return window.BaziCalc.calculateBazi(c.y, c.m, c.d, c.h); }
    catch (e) { return null; }
  }

  function caseLink(c) {
    const p = new URLSearchParams({
      year: c.y, month: c.m, day: c.d, hour: c.h, inputHour: c.h,
      gender: c.gender, birthplace: '', lon: '', paid: 'false',
      demo: '1', name: c.name,
    });
    return 'result.html?' + p.toString();
  }

  function render() {
    const grid = document.getElementById('famous-cases-grid');
    if (!grid) return;
    grid.innerHTML = FAMOUS_CASES.map((c) => {
      const b = calcPillars(c);
      const cols = b ? ['year', 'month', 'day', 'hour'].map((k) =>
        `<div class="fc-pillar"><span class="fc-tg">${b[k].tg}</span><span class="fc-dz">${b[k].dz}</span></div>`
      ).join('') : '';
      return `<a class="fc-card" href="${caseLink(c)}" aria-label="${c.name} 命盘">
        <div class="fc-top">
          <span class="fc-seal">${c.name.charAt(0)}</span>
          <span class="fc-meta">
            <span class="fc-name">${c.name}</span>
            <span class="fc-role">${c.era} · ${c.role}</span>
          </span>
        </div>
        <div class="fc-pillars">${cols}</div>
        <span class="fc-cta">查看命盘 →</span>
      </a>`;
    }).join('');
  }

  if (document.readyState !== 'loading') render();
  else document.addEventListener('DOMContentLoaded', render);
})();
