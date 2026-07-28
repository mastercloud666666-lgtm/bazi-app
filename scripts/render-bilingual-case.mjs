import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'tmp/pdfs/bazi-bilingual-case-content.json'), 'utf8'));
const usage = JSON.parse(fs.readFileSync(path.join(root, 'output/pdf/tengyunzi-bazi-bilingual-case-usage.json'), 'utf8'));
const output = path.join(root, 'output/pdf/tengyunzi-bazi-destiny-book-bilingual-inkwash-v12.html');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const content = source.report_content;
const facts = source.chart_facts;
const inkLandscape = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420">
<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eff7fb" stop-opacity="0"/><stop offset="1" stop-color="#a9cada" stop-opacity=".72"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="10"/></filter></defs>
<path d="M0 330 C90 285 130 302 210 230 C280 166 325 220 388 175 C454 128 480 185 545 230 C604 272 644 202 701 160 C760 117 810 177 864 218 C926 265 974 184 1040 137 C1092 100 1143 172 1200 205 L1200 420 L0 420Z" fill="#8eb2c5" opacity=".22" filter="url(#b)"/>
<path d="M0 365 C112 320 175 336 255 278 C330 224 377 282 443 242 C515 198 561 254 631 294 C703 335 751 273 823 231 C895 189 946 248 1014 277 C1083 306 1136 251 1200 218 L1200 420 L0 420Z" fill="url(#w)"/>
<path d="M72 334 C140 315 174 255 221 229 C244 217 258 240 272 260 C286 280 302 296 331 310" fill="none" stroke="#4f7e98" stroke-width="5" opacity=".28"/>
<path d="M870 280 C916 248 948 188 995 165 C1030 148 1048 188 1069 214 C1091 242 1114 253 1151 259" fill="none" stroke="#315f7b" stroke-width="6" opacity=".25"/>
<g fill="none" stroke="#315f7b" stroke-width="4" opacity=".32"><path d="M892 92q22-18 45 0q23-18 47 0"/><path d="M970 62q18-14 36 0q18-14 37 0"/></g>
</svg>`);
const craneSeal = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
<circle cx="90" cy="90" r="66" fill="none" stroke="#a8463e" stroke-width="4" opacity=".75"/>
<path d="M48 113 C69 96 72 67 98 53 C89 76 103 92 126 103 C103 101 90 110 79 133 C77 114 66 108 48 113Z" fill="none" stroke="#a8463e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);

const rates = {
  'gpt-5.1-2025-11-13': { ratio: 0.25, completion: 8 },
  'claude-sonnet-4-6': { ratio: 0.9, completion: 5 },
  'deepseek-v4-flash': { ratio: 0.057143, completion: 2 },
};
const auditedCalls = usage.calls.map((call) => {
  const rate = rates[call.model];
  const input = Number(call.usage.prompt_tokens || 0);
  const outputTokens = Number(call.usage.completion_tokens || 0);
  const cost = rate ? (input * rate.ratio + outputTokens * rate.ratio * rate.completion) / 500000 : null;
  return { ...call, input, outputTokens, cost };
});
const auditedCost = auditedCalls.reduce((sum, call) => sum + (call.cost || 0), 0);
const costAuditPath = path.join(root, 'output/pdf/tengyunzi-bazi-bilingual-case-cost-audit.json');
fs.writeFileSync(costAuditPath, JSON.stringify({
  generated_at: new Date().toISOString(),
  pricing_basis: 'RunAPI default group; cost=(input*model_ratio + output*model_ratio*completion_ratio)/500000',
  calls: auditedCalls.map(({ stage, model, input, outputTokens, cost }) => ({ stage, model, input_tokens: input, output_tokens: outputTokens, calculated_cost_usd: cost })),
  successful_chain: {
    input_tokens: usage.totals.prompt_tokens,
    output_tokens: usage.totals.completion_tokens,
    total_tokens: usage.totals.total_tokens,
    calculated_cost_usd: auditedCost,
  },
}, null, 2));

const paragraphHtml = (items) => (Array.isArray(items) ? items : [items]).filter(Boolean).map((item) => `<p>${esc(item)}</p>`).join('');
const bilingualSection = (section) => {
  const density = JSON.stringify(section).length > 4000 ? ' extra-dense' : JSON.stringify(section).length > 3000 ? ' dense' : '';
  return `
  <article class="page section-page${density}">
    <div class="top"><span>CHAPTER ${String(section.number).padStart(2, '0')}</span><span>中英对照审阅版</span></div>
    <header><div><small>${String(section.number).padStart(2, '0')} / LIFE PATTERN</small><h2>${esc(section.title_en)}</h2></div><h3>${esc(section.title_zh)}</h3></header>
    <div class="finding">
      <div><b>CHAPTER FINDING</b><p>${esc(section.finding_en)}</p></div>
      <div lang="zh-CN"><b>本章结论</b><p>${esc(section.finding_zh)}</p></div>
    </div>
    <div class="bilingual">
      <section><label>ENGLISH</label>${paragraphHtml(section.body_en)}</section>
      <section lang="zh-CN"><label>中文</label>${paragraphHtml(section.body_zh)}</section>
    </div>
    ${(section.questions_en?.length || section.practical_step_en) ? `<div class="application">
      <div><b>QUESTIONS / 核对问题</b><p>${esc((section.questions_en || []).join(' · '))}</p><p lang="zh-CN">${esc((section.questions_zh || []).join(' · '))}</p></div>
      <div><b>PRACTICAL STEP / 实际建议</b><p>${esc(section.practical_step_en || '')}</p><p lang="zh-CN">${esc(section.practical_step_zh || '')}</p></div>
    </div>` : ''}
    <footer><span>TENGYUNZI / BAZI LIFE PATTERN BOOK</span><span>${String(section.number + 5).padStart(2, '0')}</span></footer>
  </article>`;
};

const annualRows = facts.annual_2026_2030.map((row) => `<tr><td>${row.year}<br><strong>${esc(row.gz)}</strong></td><td>${esc(row.assessment.decisionPosture)}</td><td>S${row.assessment.supportScore} / P${row.assessment.pressureScore} / C${row.assessment.changeScore}</td><td>${esc(row.assessment.postureReason)}</td></tr>`).join('');
const tenGodRows = facts.weighted_ten_gods.filter((item) => item.percentage > 0).map((item) => `<tr><td>${esc(item.english)}</td><td>${item.percentage}%</td><td>${Number(item.visible).toFixed(2)}</td><td>${Number(item.hidden).toFixed(2)}</td></tr>`).join('');
const usageRows = auditedCalls.map((call) => `<tr><td>${esc(call.stage)}</td><td>${esc(call.model)}</td><td>${call.input.toLocaleString()}</td><td>${call.outputTokens.toLocaleString()}</td><td>${call.cost == null ? 'n/a' : `$${call.cost.toFixed(4)}`}</td></tr>`).join('');
const references = facts.traditional_references;
const voidRows = references.void.affected.map((item) => `<li><strong>${esc(item.pillar.toUpperCase())} ${esc(item.branch)}</strong><span>${esc(item.roles.join(' / '))}</span></li>`).join('');
const rootedRows = references.exposureAndRooting.filter((item) => item.referenceMultiplier === '>2').map((item) => `<li><strong>${esc(item.element.toUpperCase())}</strong><span>Exposed and rooted · reference ${esc(item.referenceMultiplier)}</span></li>`).join('');
const interactionRows = facts.natal_interactions.slice(0, 8).map((item) => `<tr><td>${esc(item.label)}</td><td>${esc(item.source)}-${esc(item.target)}</td><td>${item.transformation ? 'Contact only' : 'Recorded contact'}</td><td>${esc(item.energyReference?.magnitude || 'contextual')}</td></tr>`).join('');
const auxiliaryRows = [
  references.fiveGhostWealth ? `Five Ghost Wealth: ${references.fiveGhostWealth.monthBranch} → ${references.fiveGhostWealth.targetBranch}` : '',
  references.yuanChen ? `Yuan Chen: ${references.yuanChen.branch}` : '',
  references.indirectResourceOvercomesEatingGod.present ? 'Indirect Resource / Eating God tension: symbolic contact only' : 'Indirect Resource / Eating God tension: not detected',
].filter(Boolean);

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Tengyunzi Bilingual BaZi Case</title>
<style>
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#dce7ef;color:#102f49;font-family:Arial,"PingFang SC","Noto Sans CJK SC",sans-serif}.page{position:relative;width:210mm;height:297mm;margin:0 auto;background:#f8fbfd;padding:18mm;page-break-after:always;overflow:hidden}.top{display:flex;justify-content:space-between;padding-bottom:5mm;border-bottom:1px solid #bed3e2;color:#1679b8;font-size:7pt;font-weight:800;letter-spacing:.06em}footer{position:absolute;left:18mm;right:18mm;bottom:12mm;display:flex;justify-content:space-between;color:#54758d;font-size:7pt;font-weight:700}.cover{background:#0e304a;color:white}.cover .brand{font-weight:800;letter-spacing:.2em}.cover-main{position:absolute;left:18mm;right:18mm;top:65mm}.cover h1{font-family:Georgia,"Songti SC",serif;font-size:37pt;line-height:1.08;margin:5mm 0;color:white}.cover h2{font-family:"Songti SC",serif;font-size:21pt;margin:0 0 8mm;color:#8fd1f4}.cover p{max-width:145mm;color:#d9e8f1;font-size:12pt;line-height:1.6}.cover-meta{position:absolute;left:18mm;right:18mm;bottom:35mm;display:grid;grid-template-columns:repeat(3,1fr);gap:8mm;padding-top:6mm;border-top:1px solid #54758d}.cover-meta b{display:block;color:#8fd1f4;font-size:7pt;margin-bottom:2mm}.cover-meta span{font-size:10pt;line-height:1.55}.overview h2,.data-page h2,.audit h2{font:700 28pt Georgia,"Songti SC",serif;margin:12mm 0 3mm}.overview .synopsis{display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin:8mm 0 10mm;font-size:10.5pt;line-height:1.6}.pillars{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:8mm}.pillar{border:1px solid #bed3e2;text-align:center;background:white}.pillar b{display:block;padding:3mm;background:#e6f2f9;color:#54758d;font-size:7pt}.pillar strong{display:block;padding:6mm 0;font:700 27pt Georgia,"Songti SC",serif}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:8mm}.fact{padding:5mm;background:#e6f2f9}.fact b{display:block;color:#1679b8;font-size:7pt;margin-bottom:2mm}.fact span{font-size:10pt;line-height:1.4}.data-grid{display:grid;grid-template-columns:1fr 1fr;gap:9mm;margin-top:10mm}.card{background:white;border-top:3px solid #1679b8;padding:6mm}.card h3{margin:0 0 4mm;font:700 15pt Georgia,"Songti SC",serif}.card p{font-size:9pt;line-height:1.55}.page table{width:100%;border-collapse:collapse;background:white;font-size:8pt}.page th,.page td{padding:2.5mm;border-bottom:1px solid #d6e4ed;text-align:left;vertical-align:top}.page th{background:#e6f2f9;color:#1679b8;font-size:7pt}.section-page header{display:grid;grid-template-columns:1.1fr .9fr;gap:10mm;align-items:end;margin:10mm 0 6mm}.section-page header small{color:#1679b8;font-weight:800}.section-page h2{font:700 24pt/1.12 Georgia,serif;margin:2mm 0 0}.section-page h3{font:700 17pt/1.25 "Songti SC",serif;margin:0;color:#365d78}.finding{display:grid;grid-template-columns:1fr 1fr;background:#0e304a;color:white}.finding>div{padding:5mm 6mm;border-right:1px solid #54758d}.finding>div:last-child{border:0}.finding b{color:#8fd1f4;font-size:6.5pt}.finding p{font:700 10pt/1.45 Georgia,"Songti SC",serif;margin:2mm 0 0}.bilingual{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:7mm}.bilingual section{font-size:7.2pt;line-height:1.48}.bilingual section+section{padding-left:8mm;border-left:1px solid #bed3e2;font-size:7.5pt;line-height:1.62}.bilingual label{display:block;color:#1679b8;font-size:6.5pt;font-weight:800;margin-bottom:3mm}.bilingual p{margin:0 0 3mm}.application{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:5mm;padding-top:4mm;border-top:2px solid #b48b3e}.application b{font-size:6.5pt}.application p{font-size:6.5pt;line-height:1.35;margin:1.5mm 0}.audit table{margin-top:8mm}.audit .total{margin-top:7mm;padding:6mm;background:#0e304a;color:white;font-size:12pt}.note{margin-top:5mm;color:#54758d;font-size:8pt;line-height:1.5}.closing{background:#0e304a;color:white}.closing-main{position:absolute;left:18mm;right:18mm;top:90mm}.closing h2{font:700 35pt/1.15 Georgia,serif;margin:5mm 0}.closing p{font-size:12pt;color:#d9e8f1}.closing footer{color:#8fd1f4}
.section-page.dense header{margin:7mm 0 4mm}.section-page.dense h2{font-size:21pt}.section-page.dense h3{font-size:15pt}.section-page.dense .finding>div{padding:3.5mm 5mm}.section-page.dense .finding p{font-size:8.7pt;line-height:1.35}.section-page.dense .bilingual{margin-top:4mm;gap:6mm}.section-page.dense .bilingual section{font-size:6.25pt;line-height:1.34}.section-page.dense .bilingual section+section{padding-left:6mm;font-size:6.5pt;line-height:1.45}.section-page.dense .bilingual p{margin-bottom:2mm}.section-page.dense .application{margin-top:3mm;padding-top:2.5mm;gap:5mm}.section-page.dense .application p{font-size:5.7pt;line-height:1.25;margin:1mm 0}
.section-page.extra-dense header{margin:5mm 0 3mm}.section-page.extra-dense h2{font-size:19pt}.section-page.extra-dense h3{font-size:14pt}.section-page.extra-dense .finding>div{padding:3mm 4mm}.section-page.extra-dense .finding p{font-size:7.8pt;line-height:1.28}.section-page.extra-dense .bilingual{margin-top:3mm;gap:5mm}.section-page.extra-dense .bilingual section{font-size:5.7pt;line-height:1.28}.section-page.extra-dense .bilingual section+section{padding-left:5mm;font-size:5.9pt;line-height:1.38}.section-page.extra-dense .bilingual p{margin-bottom:1.5mm}.section-page.extra-dense .application{margin-top:2mm;padding-top:2mm}.section-page.extra-dense .application p{font-size:5.2pt;line-height:1.18}
/* V12 blue ink-wash system, derived from the author's delivered client books. */
body{background:#cbdce6;color:#183b53;font-family:"Avenir Next",Arial,"PingFang SC","Noto Sans CJK SC",sans-serif}
.page{background-color:#f9fcfd;background-image:linear-gradient(90deg,rgba(77,126,153,.04),transparent 12%,transparent 88%,rgba(77,126,153,.04));padding:16mm 18mm 19mm;border:0;isolation:isolate}
.page:before{content:"";position:absolute;z-index:-1;left:0;right:0;bottom:0;height:72mm;background:url("data:image/svg+xml,${inkLandscape}") bottom center/cover no-repeat;opacity:.9}
.page:after{content:"";position:absolute;z-index:5;inset:5mm;border:1px solid rgba(49,95,123,.48);outline:1px solid rgba(49,95,123,.14);outline-offset:-2.2mm;pointer-events:none}
.top{padding:0 4mm 4mm;border-bottom:1px solid rgba(83,128,151,.42);color:#315f7b;font-family:Georgia,"Songti SC",serif;font-weight:700;letter-spacing:.12em}
footer{left:22mm;right:22mm;bottom:9mm;color:#426c84;font-family:Georgia,"Songti SC",serif;font-weight:600;letter-spacing:.05em}
.cover{background:#f8fbfc;color:#183b53}
.cover:before{height:125mm;opacity:1}
.cover:after{border-color:#315f7b}
.cover .top{color:#315f7b}
.cover-main{top:57mm;left:28mm;right:28mm;padding-left:10mm;border-left:2px solid #315f7b}
.cover-main:after{content:"";position:absolute;right:4mm;top:-6mm;width:30mm;height:30mm;background:url("data:image/svg+xml,${craneSeal}") center/contain no-repeat;opacity:.85}
.cover h1{max-width:145mm;color:#173e58;font:700 34pt/1.08 Georgia,"Songti SC",serif;letter-spacing:.01em}
.cover h2{color:#47758e;font:600 20pt/1.25 "Songti SC","Noto Serif CJK SC",serif}
.cover p{color:#46687d;font-size:10.5pt}
.cover-meta{left:28mm;right:28mm;bottom:34mm;border-top:1px solid rgba(49,95,123,.42)}
.cover-meta b{color:#315f7b}.cover-meta span{color:#244c65}
.overview h2,.data-page h2,.audit h2{color:#173e58;font:700 25pt/1.18 Georgia,"Songti SC",serif}
.overview .synopsis{font-family:Georgia,"Songti SC",serif;color:#294f68}
.pillar{border:1px solid rgba(49,95,123,.35);background:rgba(255,255,255,.77);box-shadow:0 5px 18px rgba(38,77,101,.06)}
.pillar b{background:rgba(213,232,241,.62);color:#315f7b}
.pillar strong{color:#173e58}
.fact,.card{background:rgba(255,255,255,.78);border:1px solid rgba(67,111,136,.18);box-shadow:0 6px 20px rgba(38,77,101,.06)}
.card{border-top:3px solid #477c99}
.fact b,.page th{color:#315f7b}
.page table{background:rgba(255,255,255,.82)}
.page th{background:rgba(213,232,241,.72)}
.page th,.page td{border-bottom-color:rgba(70,112,137,.18)}
.section-page header{position:relative;border-left:3px solid #477c99;padding-left:6mm}
.section-page header:after{content:"";position:absolute;right:0;bottom:0;width:23mm;height:23mm;background:url("data:image/svg+xml,${craneSeal}") center/contain no-repeat;opacity:.32}
.section-page header small{color:#477c99}
.section-page h2{color:#173e58;font-family:Georgia,"Songti SC",serif}
.section-page h3{color:#47758e;font:600 14pt/1.28 "Songti SC","Noto Serif CJK SC",serif;padding-right:20mm}
.finding{background:linear-gradient(110deg,#244f69,#3d718d);box-shadow:0 8px 20px rgba(31,70,94,.11)}
.finding>div{border-right-color:rgba(210,231,240,.36)}
.finding b{color:#d9edf5}
.finding p{font-family:Georgia,"Songti SC",serif}
.bilingual{background:rgba(255,255,255,.38);padding:4mm 5mm 1mm}
.bilingual section+section{border-left-color:rgba(77,126,153,.34)}
.bilingual label{color:#477c99;letter-spacing:.1em}
.application{border-top:1px solid #9b7b42;background:rgba(248,244,231,.52);padding:3mm 4mm 2mm}
.application b{color:#765c31}
.rule-grid{display:grid;grid-template-columns:1fr 1fr;gap:7mm;margin-top:7mm}
.rule-panel{background:rgba(255,255,255,.82);border:1px solid rgba(67,111,136,.22);border-top:3px solid #477c99;padding:5mm}
.rule-panel h3{margin:0 0 3mm;color:#173e58;font:700 12pt/1.25 Georgia,"Songti SC",serif}
.rule-panel ul{list-style:none;margin:0;padding:0}.rule-panel li{display:flex;justify-content:space-between;gap:4mm;padding:2.2mm 0;border-bottom:1px solid rgba(67,111,136,.14);font-size:7.5pt}.rule-panel li span{text-align:right;color:#567386}
.rule-note{margin-top:5mm;padding:4mm 5mm;border-left:3px solid #a8463e;background:rgba(255,255,255,.68);font-size:8pt;line-height:1.5;color:#45677c}
.audit .total{background:#315f7b}
.closing{background:#f8fbfc;color:#183b53}
.closing:before{height:150mm}
.closing .top,.closing footer{color:#315f7b}
.closing-main{top:84mm;padding-left:10mm;border-left:2px solid #315f7b}
.closing h2{color:#173e58}
.closing p{color:#47758e}
.section-page.dense .bilingual section{font-size:6.45pt;line-height:1.38}.section-page.dense .bilingual section+section{font-size:6.7pt;line-height:1.5}
.section-page.extra-dense .bilingual section{font-size:6pt;line-height:1.32}.section-page.extra-dense .bilingual section+section{font-size:6.2pt;line-height:1.42}
.section-page.dense h3,.section-page.extra-dense h3{font-size:13pt;line-height:1.25}
.section-page.extra-dense .application p{font-size:5.5pt;line-height:1.22}
</style></head><body>
<section class="page cover"><div class="top"><span class="brand">TENGYUNZI</span><span>BILINGUAL REVIEW EDITION</span></div><div class="cover-main"><small>PERSONAL FOUR PILLARS READING / 个人四柱审阅本</small><h1>${esc(content.book_title_en)}</h1><h2>${esc(content.book_title_zh)}</h2><p>${esc(content.subtitle_en)}<br><span lang="zh-CN">${esc(content.subtitle_zh)}</span></p></div><div class="cover-meta"><div><b>BIRTH / 出生</b><span>August 16, 1994<br>1994年8月16日 16:00</span></div><div><b>CHART / 四柱</b><span>${esc(facts.birth_input.bazi_str)}</span></div><div><b>PROFILE / 资料</b><span>Female · Asia/Taipei<br>出生地未提供</span></div></div><footer><span>TENGYUNZI</span><span>01</span></footer></section>
<section class="page overview"><div class="top"><span>NATAL MODEL</span><span>命盘总览</span></div><h2>One chart, read in two languages.</h2><div class="synopsis"><p>${esc(content.synopsis_en)}</p><p lang="zh-CN">${esc(content.synopsis_zh)}</p></div><div class="pillars">${['year','month','day','hour'].map((name)=>`<div class="pillar"><b>${name.toUpperCase()}</b><strong>${facts.pillars[name].stem}<br>${facts.pillars[name].branch}</strong></div>`).join('')}</div><div class="facts"><div class="fact"><b>DAY MASTER / 日主</b><span>${facts.day_master.stem} · Yang Wood</span></div><div class="fact"><b>STRENGTH / 强弱</b><span>${esc(facts.strength.label)}</span></div><div class="fact"><b>TIME BASIS / 时间口径</b><span>Exact Luck transition date not supplied<br>未提供精确换运日期</span></div></div><footer><span>TENGYUNZI / BILINGUAL CASE</span><span>02</span></footer></section>
<section class="page data-page"><div class="top"><span>CALCULATED DATA</span><span>程序计算数据</span></div><h2>Visible elements and weighted Ten Gods</h2><div class="data-grid"><div class="card"><h3>Visible Element Count / 可见五行</h3>${Object.entries(facts.visible_elements.visible).map(([key,value])=>`<p><b>${key.toUpperCase()}</b> · ${value}</p>`).join('')}</div><div class="card"><h3>Weighted Ten Gods / 十神权重</h3><table><thead><tr><th>Function</th><th>%</th><th>Visible</th><th>Hidden</th></tr></thead><tbody>${tenGodRows}</tbody></table></div></div><p class="note">Pillar weights and hidden-stem splits are calculated by the rule engine. The language models cannot modify these values.<br>柱位权重与藏干比例由规则引擎计算，语言模型无权修改。</p><footer><span>TENGYUNZI / BILINGUAL CASE</span><span>03</span></footer></section>
<section class="page data-page"><div class="top"><span>TRADITIONAL RULE LAYER</span><span>新增命理规则层</span></div><h2>Contacts, void, roots, and symbolic domains</h2><div class="rule-grid"><div class="rule-panel"><h3>Day-Pillar Xun Kong / 日柱空亡</h3><p class="note">${esc(references.void.dayPillar)} → ${esc(references.void.voidBranches.join(' / '))}</p><ul>${voidRows || '<li><span>No natal placement affected</span></li>'}</ul></div><div class="rule-panel"><h3>Exposed and Rooted / 透干通根</h3><ul>${rootedRows || '<li><span>No element meets both tests</span></li>'}</ul><p class="note">${esc(auxiliaryRows.join(' · '))}</p></div></div><table style="margin-top:7mm"><thead><tr><th>Contact</th><th>Evidence</th><th>Status</th><th>Relative magnitude</th></tr></thead><tbody>${interactionRows}</tbody></table><div class="rule-note">A relationship contact is not automatically a completed transformation. Relative multipliers are Tengyunzi teaching weights, not physical measurements. Void, Yuan Chen, Five Ghost Wealth, body correspondences, and severe traditional imagery remain secondary and cannot independently establish biography, illness, legal trouble, injury, or extreme outcomes.<br><span lang="zh-CN">合局关系不等于已经合化。倍数属于腾云子体系的相对权重；空亡、元辰、五鬼运财、身体对应及灾象只能辅助判断，不能单独断定具体事件或极端后果。</span></div><footer><span>TENGYUNZI / RULE FOUNDATION</span><span>04</span></footer></section>
<section class="page data-page"><div class="top"><span>SHARED TIMING OBJECT</span><span>统一流年对象</span></div><h2>2026-2030: support, pressure, change, and posture</h2><table><thead><tr><th>Year</th><th>Locked posture</th><th>Scores</th><th>Why this posture</th></tr></thead><tbody>${annualRows}</tbody></table><p class="note">The decision posture is produced once by the fixed decision function and copied to every page. GPT explains the evidence but does not choose a different label.<br>年度标签由固定决策函数唯一生成，GPT只解释证据，不能另行改写标签。</p><footer><span>TENGYUNZI / BILINGUAL CASE</span><span>05</span></footer></section>
${content.sections.map(bilingualSection).join('')}
<section class="page audit"><div class="top"><span>GENERATION AUDIT</span><span>生成审计</span></div><h2>Models, tokens, and calculated cost</h2><table><thead><tr><th>Stage</th><th>Model</th><th>Input</th><th>Output</th><th>Cost</th></tr></thead><tbody>${usageRows}</tbody></table><div class="total">Successful production chain: ${usage.totals.total_tokens.toLocaleString()} tokens · $${auditedCost.toFixed(4)} USD</div><p class="note">Cost is calculated from RunAPI's current default-group model ratios: cost = (input × model ratio + output × model ratio × completion ratio) / 500,000. Failed setup attempts are reported separately outside this PDF because they did not contribute to this final content.</p><footer><span>TENGYUNZI / GENERATION AUDIT</span><span>21</span></footer></section>
<section class="page closing"><div class="top"><span>TENGYUNZI</span><span>BILINGUAL REVIEW EDITION</span></div><div class="closing-main"><small>END OF REVIEW</small><h2>One natal chart.<br>A changing flow of time.</h2><p>Keep the calculated facts fixed. Revisit interpretation when the timing context changes.</p></div><footer><span>tengyunzi.com</span><span>22</span></footer></section>
</body></html>`;
fs.writeFileSync(output, html);
console.log(JSON.stringify({ output, costAuditPath, pages: 22, successfulTokens: usage.totals.total_tokens, auditedCost }, null, 2));
