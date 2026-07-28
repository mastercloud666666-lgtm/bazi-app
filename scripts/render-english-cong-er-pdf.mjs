import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'tmp/pdfs/tengyunzi-cong-er-english-content.json');
const htmlPath = path.join(root, 'output/pdf/tengyunzi-bazi-destiny-book-1988-08-21-english-inkwash.html');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]));
const inline = (value) => esc(value).replace(/\*([^*]+)\*/g, '<em>$1</em>');
const words = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

const inkLandscape = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 430">
<defs>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcecf2" stop-opacity=".05"/><stop offset=".38" stop-color="#a9c9d8" stop-opacity=".35"/><stop offset="1" stop-color="#4e7e99" stop-opacity=".28"/></linearGradient>
  <linearGradient id="deep" x1="0" y1="0" x2="1" y2=".15"><stop offset="0" stop-color="#2a5d79" stop-opacity=".08"/><stop offset=".5" stop-color="#356d8b" stop-opacity=".34"/><stop offset="1" stop-color="#8bb1c3" stop-opacity=".05"/></linearGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="13"/></filter>
  <filter id="ink"><feTurbulence type="fractalNoise" baseFrequency=".009 .025" numOctaves="2" seed="19" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="13" xChannelSelector="R" yChannelSelector="B"/></filter>
</defs>
<path d="M0 225 C165 198 290 234 430 215 C579 195 694 234 830 214 C974 193 1084 226 1200 203 L1200 430 L0 430Z" fill="url(#sea)" opacity=".72" filter="url(#soft)"/>
<path d="M0 285 C154 253 289 299 443 276 C576 257 713 301 856 278 C999 255 1095 290 1200 269" fill="none" stroke="url(#deep)" stroke-width="24" stroke-linecap="round" opacity=".65" filter="url(#ink)"/>
<path d="M0 327 C132 300 249 341 383 319 C525 296 658 342 799 318 C946 294 1071 332 1200 310" fill="none" stroke="#4d809b" stroke-width="13" stroke-linecap="round" opacity=".24" filter="url(#ink)"/>
<path d="M0 368 C155 344 289 384 430 361 C574 337 708 383 850 360 C990 337 1090 369 1200 348" fill="none" stroke="#315f7b" stroke-width="5" stroke-linecap="round" opacity=".22" filter="url(#ink)"/>
<g fill="none" stroke="#5d8da5" stroke-width="2" opacity=".3">
  <path d="M0 246 C147 237 260 254 389 244 C528 233 645 253 775 243 C920 231 1061 252 1200 239"/>
  <path d="M34 305 C174 296 301 314 432 302 M549 308 C690 296 838 315 975 301 M1024 307 C1089 301 1146 301 1200 294"/>
  <path d="M0 347 C173 337 314 354 463 342 C602 331 742 353 884 340 C1010 330 1111 349 1200 339"/>
  <path d="M63 393 C201 384 319 401 456 390 M639 397 C790 383 951 404 1126 388"/>
</g>
<path d="M0 206 C175 183 304 217 455 199 C608 181 736 216 877 198 C1017 180 1116 203 1200 188" fill="none" stroke="#9abecf" stroke-width="31" opacity=".18" filter="url(#soft)"/>
<path d="M0 352 C181 319 330 369 483 343 C632 318 772 365 925 339 C1050 318 1135 340 1200 327 L1200 430 L0 430Z" fill="#d8e9f0" opacity=".43" filter="url(#soft)"/>
</svg>`);
const upperMist = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 520">
<defs>
  <radialGradient id="b"><stop offset="0" stop-color="#83adbf" stop-opacity=".22"/><stop offset=".58" stop-color="#bcd4df" stop-opacity=".1"/><stop offset="1" stop-color="#edf6f9" stop-opacity="0"/></radialGradient>
  <filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="wash"><feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="22"/></filter>
</defs>
<ellipse cx="523" cy="104" rx="188" ry="103" fill="url(#b)" filter="url(#wash)"/>
<ellipse cx="640" cy="258" rx="244" ry="78" fill="#9dbfce" opacity=".1" filter="url(#blur)"/>
<path d="M338 281 C430 262 511 287 598 269 C635 261 668 260 700 254" fill="none" stroke="#5c8ea7" stroke-width="5" opacity=".1" filter="url(#wash)"/>
<path d="M425 309 C493 298 560 316 626 303 C653 297 678 296 700 293" fill="none" stroke="#6f9daf" stroke-width="3" opacity=".1"/>
</svg>`);

function splitChapter(chapter) {
  const isHealth = chapter.number === 10;
  const firstLimit = isHealth ? 330 : chapter.number === 12 ? 640 : 520;
  const continuationLimit = 680;
  const pages = [];
  let current = [];
  let count = 0;
  let limit = firstLimit;
  for (const paragraph of chapter.paragraphs) {
    const paragraphWords = words(paragraph);
    if (current.length && count + paragraphWords > limit) {
      pages.push(current);
      current = [];
      count = 0;
      limit = continuationLimit;
    }
    current.push(paragraph);
    count += paragraphWords;
  }
  if (current.length) pages.push(current);
  return pages;
}

const chapterPages = source.chapters.flatMap((chapter) => splitChapter(chapter).map((paragraphs, index) => ({
  chapter,
  paragraphs,
  continuation: index > 0,
  part: index + 1,
  totalParts: splitChapter(chapter).length,
})));

const elementColors = {
  Metal: '#315f7b',
  Earth: '#8b795a',
  Water: '#1679b8',
  Wood: '#567e70',
  Fire: '#a8463e',
};
const elementBars = Object.entries(source.element_energy).map(([name, value]) => `
  <div class="energy-row">
    <div class="energy-name"><b>${name}</b><span>${value}%</span></div>
    <div class="energy-track"><i style="width:${Math.max(value, 1.5)}%;background:${elementColors[name]}"></i></div>
  </div>`).join('');

const annualCards = Object.entries(source.annual).map(([year, rating]) => {
  const tone = rating.includes('Unfavorable') ? 'unfavorable' : rating === 'Favorable' ? 'favorable' : 'neutral';
  return `<div class="annual-card ${tone}"><b>${inline(year)}</b><span>${esc(rating)}</span></div>`;
}).join('');

const chapterPageHtml = chapterPages.map(({ chapter, paragraphs, continuation, part, totalParts }) => {
  const finding = continuation ? '' : `<div class="finding"><b>CHAPTER VERDICT</b><p>${inline(chapter.finding)}</p></div>`;
  const health = chapter.number === 10 && !continuation ? `<div class="mini-energy">${elementBars}</div>` : '';
  const partLabel = totalParts > 1 ? ` · PART ${part} OF ${totalParts}` : '';
  return `<section class="page chapter-page ${continuation ? 'continuation' : ''}">
    <div class="top"><span>CHAPTER ${String(chapter.number).padStart(2, '0')}${partLabel}</span><span>CLASSICAL FOUR PILLARS READING</span></div>
    <header>
      <small>${String(chapter.number).padStart(2, '0')} / DESTINY STRUCTURE</small>
      <h2>${esc(chapter.title)}</h2>
    </header>
    ${finding}${health}
    <div class="prose">${paragraphs.map((paragraph) => `<p>${inline(paragraph)}</p>`).join('')}</div>
    <div class="page-footer"><span>TENGYUNZI / BAZI DESTINY BOOK</span><span class="page-number"></span></div>
  </section>`;
}).join('');

const contentsRows = source.chapters.map((chapter) => `
  <div class="contents-row"><b>${String(chapter.number).padStart(2, '0')}</b><span>${esc(chapter.title)}</span></div>`).join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(source.title)} - English Edition</title>
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#cbdce6;color:#183b53}
body{font-family:"Avenir Next",Avenir,Arial,"PingFang SC",sans-serif}
.page{position:relative;width:210mm;height:297mm;margin:0 auto;padding:16mm 19mm 20mm;background-color:#fbfdfe;background-image:url("data:image/svg+xml,${upperMist}"),linear-gradient(90deg,rgba(77,126,153,.038),transparent 13%,transparent 87%,rgba(77,126,153,.038));background-position:top right,center;background-repeat:no-repeat,no-repeat;background-size:104mm 77mm,auto;page-break-after:always;overflow:hidden;isolation:isolate}
.page:before{content:"";position:absolute;z-index:-1;left:0;right:0;bottom:0;height:74mm;background:url("data:image/svg+xml,${inkLandscape}") bottom center/cover no-repeat;opacity:.96}
.page:after{content:"";position:absolute;z-index:5;inset:5mm;border:1px solid rgba(49,95,123,.48);outline:1px solid rgba(49,95,123,.14);outline-offset:-2.2mm;pointer-events:none}
.top{display:flex;justify-content:space-between;padding:0 3mm 4mm;border-bottom:1px solid rgba(83,128,151,.42);color:#315f7b;font:700 6.7pt Georgia,serif;letter-spacing:.12em}
.page-footer{position:absolute;left:22mm;right:22mm;bottom:9mm;display:flex;justify-content:space-between;color:#426c84;font:600 6.8pt Georgia,serif;letter-spacing:.05em}
.cover{background:#f8fbfc}.cover:before{height:127mm;opacity:1}.cover:after{border-color:#315f7b}
.cover-main{position:absolute;left:28mm;right:28mm;top:55mm;padding-left:10mm;border-left:2px solid #315f7b}
.cover small,.chapter-page header small{color:#477c99;font-weight:800;letter-spacing:.11em}
.cover h1{max-width:145mm;margin:5mm 0 4mm;color:#173e58;font:700 34pt/1.08 Georgia,serif}
.cover h2{margin:0;color:#47758e;font:600 16pt/1.3 Georgia,serif}
.cover .line{width:40mm;margin:9mm 0 6mm;border-top:1px solid #8eaebe}
.cover p{max-width:135mm;color:#46687d;font:10.4pt/1.65 Georgia,serif}
.cover-meta{position:absolute;left:28mm;right:28mm;bottom:34mm;display:grid;grid-template-columns:1.05fr .8fr 1.15fr;gap:8mm;padding-top:6mm;border-top:1px solid rgba(49,95,123,.42)}
.cover-meta b{display:block;margin-bottom:2mm;color:#315f7b;font-size:6.5pt;letter-spacing:.1em}.cover-meta span{color:#244c65;font:9.5pt/1.55 Georgia,serif}
.overview h2,.data-page h2,.contents h2{margin:11mm 0 3mm;color:#173e58;font:700 25pt/1.18 Georgia,serif}
.lead{max-width:154mm;margin:0 0 8mm;color:#3f647a;font:10pt/1.6 Georgia,serif}
.pillars{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin:7mm 0}
.pillar{border:1px solid rgba(49,95,123,.35);text-align:center;background:rgba(255,255,255,.8);box-shadow:0 5px 18px rgba(38,77,101,.06)}
.pillar b{display:block;padding:3mm;background:rgba(213,232,241,.68);color:#315f7b;font-size:6.5pt;letter-spacing:.09em}
.pillar strong{display:block;padding:5mm 0;color:#173e58;font:700 24pt/1.04 Georgia,"PingFang SC",serif}
.verdict-grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:7mm}
.verdict-card{padding:5mm;background:rgba(255,255,255,.82);border:1px solid rgba(67,111,136,.2);box-shadow:0 6px 18px rgba(38,77,101,.05)}
.verdict-card.wide{grid-column:1/-1}.verdict-card b{display:block;margin-bottom:2mm;color:#477c99;font-size:6.5pt;letter-spacing:.09em}.verdict-card p{margin:0;font:9pt/1.5 Georgia,serif}
.data-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:9mm;margin-top:9mm}
.panel{padding:6mm;background:rgba(255,255,255,.82);border:1px solid rgba(67,111,136,.2);border-top:3px solid #477c99;box-shadow:0 6px 18px rgba(38,77,101,.05)}
.panel h3{margin:0 0 5mm;color:#173e58;font:700 14pt Georgia,serif}
.energy-row{margin:0 0 5mm}.energy-name{display:flex;justify-content:space-between;margin-bottom:1.5mm;font:8pt Georgia,serif}.energy-name span{color:#47758e}.energy-track{height:3.2mm;background:#e5eef3;border-radius:2mm;overflow:hidden}.energy-track i{display:block;height:100%;border-radius:2mm}
.rule-list{margin:0;padding:0;list-style:none}.rule-list li{padding:3.2mm 0;border-bottom:1px solid rgba(67,111,136,.16);font:8.4pt/1.4 Georgia,serif}.rule-list b{display:block;color:#315f7b;font-size:6.5pt;letter-spacing:.08em}
.annuals{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:5mm}.annual-card{display:flex;justify-content:space-between;padding:3.2mm 3.5mm;border-left:3px solid #718799;background:#f2f6f8;font:7.5pt Georgia,serif}.annual-card.favorable{border-left-color:#4f7e72}.annual-card.unfavorable{border-left-color:#a8463e}.annual-card.neutral{border-left-color:#8b795a}
.note{margin-top:6mm;padding:4mm 5mm;border-left:3px solid #9b7b42;background:rgba(248,244,231,.58);color:#4f6674;font:8pt/1.5 Georgia,serif}
.contents-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:11mm;margin-top:9mm}
.contents-row{display:grid;grid-template-columns:11mm 1fr;gap:3mm;padding:4mm 0;border-bottom:1px solid rgba(67,111,136,.2);break-inside:avoid}.contents-row b{color:#477c99;font:700 8pt Georgia,serif}.contents-row span{font:9pt/1.3 Georgia,serif}
.chapter-page header{position:relative;margin:8mm 0 5mm;padding-left:6mm;border-left:3px solid #477c99}
.chapter-page h2{max-width:145mm;margin:2mm 0 0;color:#173e58;font:700 22pt/1.14 Georgia,serif}
.chapter-page.continuation h2{font-size:18pt}
.finding{margin:0 0 5mm;padding:4.5mm 5mm;background:linear-gradient(110deg,#244f69,#3d718d);color:white;box-shadow:0 8px 20px rgba(31,70,94,.11)}
.finding b{display:block;color:#d9edf5;font-size:6.3pt;letter-spacing:.1em}.finding p{margin:1.5mm 0 0;font:700 8.7pt/1.45 Georgia,serif}
.prose{padding:0 1mm 0}.prose p{margin:0 0 3.2mm;color:#203f54;font:8.55pt/1.49 Georgia,"Times New Roman","PingFang SC",serif;text-align:justify;hyphens:auto}
.prose em{color:#173e58}
.mini-energy{display:grid;grid-template-columns:1fr 1fr;column-gap:7mm;padding:4mm 5mm 1mm;margin:0 0 5mm;background:rgba(255,255,255,.76);border:1px solid rgba(67,111,136,.2)}.mini-energy .energy-row{margin-bottom:3mm}.mini-energy .energy-track{height:2mm}
.closing{background:#f8fbfc}.closing:before{height:153mm}.closing-main{position:absolute;left:30mm;right:30mm;top:82mm;padding-left:10mm;border-left:2px solid #315f7b}.closing-main small{color:#477c99;font-weight:800;letter-spacing:.13em}.closing h2{margin:5mm 0;color:#173e58;font:700 34pt/1.12 Georgia,serif}.closing p{max-width:125mm;color:#47758e;font:11pt/1.6 Georgia,serif}
</style>
</head>
<body>
<section class="page cover">
  <div class="top"><span>TENGYUNZI</span><span>${esc(source.edition).toUpperCase()}</span></div>
  <div class="cover-main">
    <small>PERSONAL FOUR PILLARS READING</small>
    <h1>${esc(source.title)}</h1>
    <h2>${esc(source.subtitle)}</h2>
    <div class="line"></div>
    <p>A decisive classical reading of pattern, favorable and unfavorable elements, career, wealth, relationships, Luck Cycles, and the annual sequence from 2026 to 2030.</p>
  </div>
  <div class="cover-meta">
    <div><b>BIRTH</b><span>${esc(source.person.birth)}<br>${esc(source.person.sex)}</span></div>
    <div><b>DAY MASTER</b><span>${inline(source.person.day_master)}</span></div>
    <div><b>FOUR PILLARS</b><span>${inline(source.person.chart)}</span></div>
  </div>
  <div class="page-footer"><span>TENGYUNZI</span><span class="page-number"></span></div>
</section>

<section class="page overview">
  <div class="top"><span>NATAL STRUCTURE</span><span>LOCKED CHART VERDICT</span></div>
  <h2>The chart follows Output into Wealth.</h2>
  <p class="lead">${esc(source.executive_verdict.thesis)}</p>
  <div class="pillars">
    ${['YEAR 戊辰','MONTH 庚申','DAY 戊申','HOUR 庚申'].map((item) => {
      const [label, gz] = item.split(' ');
      return `<div class="pillar"><b>${label}</b><strong>${gz.slice(0,1)}<br>${gz.slice(1)}</strong></div>`;
    }).join('')}
  </div>
  <div class="verdict-grid">
    <div class="verdict-card wide"><b>PATTERN</b><p>${esc(source.executive_verdict.pattern)}</p></div>
    <div class="verdict-card"><b>FAVORABLE</b><p>${esc(source.executive_verdict.favorable)}</p></div>
    <div class="verdict-card"><b>UNFAVORABLE</b><p>${esc(source.executive_verdict.unfavorable)}</p></div>
    <div class="verdict-card wide"><b>EARTH</b><p>${esc(source.executive_verdict.earth)}</p></div>
  </div>
  <div class="note">This chart is not judged by the ordinary weak-Day-Master method. Restoring Fire Resource would suppress the Metal Output that establishes the pattern.</div>
  <div class="page-footer"><span>TENGYUNZI / NATAL STRUCTURE</span><span class="page-number"></span></div>
</section>

<section class="page data-page">
  <div class="top"><span>ENERGY PROFILE</span><span>FIVE ELEMENTS AND TIMING</span></div>
  <h2>Pattern favorability and bodily balance are separate.</h2>
  <p class="lead">Metal and Water are favorable to the Follow-the-Child pattern. That does not mean every bodily correspondence benefits from more Metal, or that absent Fire should automatically be added.</p>
  <div class="data-grid">
    <div class="panel"><h3>Relative Five-Element Energy</h3>${elementBars}</div>
    <div class="panel">
      <h3>Clear Reading Rules</h3>
      <ul class="rule-list">
        <li><b>METAL 58.3%</b>Dominant Output and the first favorable element.</li>
        <li><b>WATER 14.7%</b>Wealth and the second favorable element.</li>
        <li><b>FIRE 0%</b>Absent, yet still the first unfavorable influence as Resource.</li>
        <li><b>WOOD 3.5%</b>Very weak and the second unfavorable influence as Officer.</li>
        <li><b>EARTH 23.4%</b>Conditional by moisture and function.</li>
      </ul>
    </div>
  </div>
  <div class="annuals">${annualCards}</div>
  <div class="note">The percentages are relative values inside this chart, not scientific or medical measurements. The annual ratings are explicit pattern judgments, not guarantees of specific events.</div>
  <div class="page-footer"><span>TENGYUNZI / ENERGY PROFILE</span><span class="page-number"></span></div>
</section>

<section class="page contents">
  <div class="top"><span>CONTENTS</span><span>THIRTEEN-CHAPTER DESTINY BOOK</span></div>
  <h2>Inside this reading</h2>
  <p class="lead">The verdict is established first. Every later chapter follows the same pattern, favorable elements, and timing rules.</p>
  <div class="contents-grid">${contentsRows}</div>
  <div class="page-footer"><span>TENGYUNZI / CONTENTS</span><span class="page-number"></span></div>
</section>

${chapterPageHtml}

<section class="page closing">
  <div class="top"><span>TENGYUNZI</span><span>PERSONAL ENGLISH EDITION</span></div>
  <div class="closing-main">
    <small>FINAL VERDICT</small>
    <h2>Follow Metal.<br>Let Metal produce Water.</h2>
    <p>${esc(source.final_verdict.join(' '))}</p>
    <p>${esc(source.disclaimer)}</p>
  </div>
  <div class="page-footer"><span>TENGYUNZI</span><span class="page-number"></span></div>
</section>

<script>
document.querySelectorAll('.page-number').forEach((node, index) => {
  node.textContent = String(index + 1).padStart(2, '0');
});
</script>
</body>
</html>`;

fs.writeFileSync(htmlPath, html);
console.log(JSON.stringify({ htmlPath, pages: 5 + chapterPages.length, chapterPages: chapterPages.length }, null, 2));
