import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import {
  BRANCHES as RULE_BRANCHES,
  ELEMENTS as RULE_ELEMENTS,
  HIDDEN_STEMS as RULE_HIDDEN_STEMS,
  STEMS as RULE_STEMS,
  TEN_GODS as RULE_TEN_GODS,
  analyzeAnnualInteractions,
  assessDayMasterStrength,
  balancingElementGuidance,
  charElement as canonicalCharElement,
  elementProfile,
  luckDirection,
  shenShaForChart,
  tenGod as canonicalTenGod,
  timingPosture,
  weightedTenGodProfile,
} from '../../supabase/functions/_shared/bazi-rules.mjs';
import {
  ENGLISH_BAZI_REPORT_SECTION_COUNT,
  ENGLISH_BAZI_REPORT_SECTIONS,
  ENGLISH_BAZI_REPORT_READING_MINUTES,
  ENGLISH_BAZI_REPORT_WORD_RANGE,
} from '../../supabase/functions/_shared/english-report-structure.mjs';
import {
  confidenceForSection,
  deduplicateReportSections,
  splitReportSentences,
} from '../../supabase/functions/_shared/report-quality.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'output', 'pdf');
const REPORT_ID = process.env.REPORT_ID || '90d104b2-bb45-4e9b-960b-b9843cfe671a';
const OUTPUT_BASENAME = process.env.OUTPUT_BASENAME || 'tengyunzi-standard-bazi-report-v4';

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')];
    }));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function splitSections(text) {
  return String(text || '')
    .split(/(?=^Section\s+\d+\s*:)/gim)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [heading, ...lines] = chunk.split(/\r?\n/);
      const match = heading.match(/^Section\s+(\d+)\s*:\s*(.+)$/i);
      return {
        number: Number(match?.[1] || 0),
        title: match?.[2]?.trim() || heading,
        body: lines.join('\n').trim(),
      };
    });
}

function paragraphs(text) {
  const blocks = String(text || '').split(/\n{2,}/).map((value) => value.trim()).filter(Boolean);
  return blocks.map((block) => `<p>${escapeHtml(block)}</p>`).join('');
}

function sectionGroup(number) {
  if (number <= 4) return ['CHART FOUNDATION', 'Structure'];
  if (number <= 7) return ['CHART STRUCTURE', 'Evidence'];
  if (number <= 11) return ['LIFE TOPICS', 'Application'];
  return ['TIMING', 'Da Yun & Liu Nian'];
}

function sectionVisual(number) {
  if (number === 3) return '<div class="chart chart-wide" id="section-elements"></div>';
  return '';
}

const STEMS = RULE_STEMS;
const BRANCHES = RULE_BRANCHES;
const ELEMENT_ORDER = RULE_ELEMENTS;
const STEM_ELEMENT = Object.fromEntries(STEMS.map((stem, index) => [stem, ELEMENT_ORDER[Math.floor(index / 2)]]));
const BRANCH_ELEMENT = Object.fromEntries(['water', 'earth', 'wood', 'wood', 'earth', 'fire', 'fire', 'earth', 'metal', 'metal', 'earth', 'water'].map((element, index) => [BRANCHES[index], element]));
const HIDDEN_STEMS = RULE_HIDDEN_STEMS;
const TEN_GODS = RULE_TEN_GODS.map(({ name, english, meaning }) => [name, english, meaning]);
const SHEN_SHA_META = {
  天乙贵人: ['Heavenly Nobleman', 'Support tends to appear through capable people, timely guidance, and trusted networks.'],
  文昌贵人: ['Scholar Star', 'Favors learning, language, organization, and turning complex material into a clear form.'],
  禄神: ['Prosperity Star', 'Connects competence with dependable provision, practical self-reliance, and repeatable value.'],
  羊刃: ['Blade Star', 'Adds force, resolve, and a low tolerance for hesitation; it works best with deliberate pacing.'],
  桃花: ['Peach Blossom', 'Highlights social presence, aesthetic sensitivity, attraction, and the need for clean relational boundaries.'],
  驿马: ['Travel Horse', 'Adds momentum through movement, changing environments, travel, or roles that resist stagnation.'],
  华盖: ['Canopy Star', 'Supports specialist depth, solitude, aesthetics, and the ability to work beyond conventional opinion.'],
  将星: ['General Star', 'Emphasizes coordination, responsibility, command, and the instinct to organize people or resources.'],
  红鸾: ['Marriage Star', 'Adds relational receptivity and sensitivity to meaningful partnership, without fixing an event or date.'],
  天喜: ['Joy Star', 'Highlights openness to connection, celebration, and emotionally affirmative social exchange.'],
};

function charElement(char) {
  return canonicalCharElement(char);
}

function tenGod(dayStem, otherStem) {
  return canonicalTenGod(dayStem, otherStem);
}

function elementRole(dayStem, element) {
  const dayElement = Math.floor(STEMS.indexOf(dayStem) / 2);
  const otherElement = ELEMENT_ORDER.indexOf(element);
  const relation = (otherElement - dayElement + 5) % 5;
  return ['Companion', 'Output', 'Wealth', 'Officer', 'Resource'][relation] || '';
}

function elementDisplay(element) {
  return element ? element[0].toUpperCase() + element.slice(1) : '';
}

function tenGodProfile(pillars) {
  return weightedTenGodProfile(pillars).map((item) => ({ ...item, score: item.percentage }));
}

function ganzhiForYear(year) {
  return `${STEMS[((year - 4) % 10 + 10) % 10]}${BRANCHES[((year - 4) % 12 + 12) % 12]}`;
}

function coloredGanzhi(gz, className = '') {
  return `<span class="colored-ganzhi ${className}"><i class="wx-${charElement(gz[0])}">${escapeHtml(gz[0])}</i><i class="wx-${charElement(gz[1])}">${escapeHtml(gz[1])}</i></span>`;
}

function tenGodTablePage(profile) {
  const rows = profile.map((item) => `<div class="ten-god-row">
    <div class="ten-god-name"><strong>${item.name}</strong><span>${item.english}</span></div>
    <div class="ten-god-meter">${item.score > 0 ? `<i class="wx-${item.element}" style="width:${item.score}%"></i>` : ''}</div>
    <b>${item.score}%</b>
    <small><span>${item.meaning}</span><em>Visible ${item.visible.toFixed(1)} · Hidden ${item.hidden.toFixed(1)}</em></small>
  </div>`).join('');
  return `<section class="pdf-page ten-gods-page" data-page>
    <div class="page-topline"><span>TEN-GOD PROFILE</span><span>STRUCTURAL EMPHASIS</span></div>
    <header><span>RELATIONAL ENERGIES</span><h2>How the chart's forces<br>relate to the Day Master</h2><p>This profile combines visible stems with weighted hidden stems. It describes structural emphasis, not a fixed share of life outcomes.</p></header>
    <div class="ten-god-table">${rows}</div>
    <div class="ten-god-note"><strong>Reading the scale</strong><p>Percentages use largest-remainder rounding and total exactly 100%. Visible counts come from non-Day stems; hidden scores use weighted branch roots. This is a technical distribution index for the natal chart.</p></div>
    <footer><span>TENGYUNZI / AI BAZI REPORT</span><span data-page-number></span></footer>
  </section>`;
}

function shenShaTablePage(profile) {
  const grouped = Object.values(profile.reduce((groups, item) => {
    const current = groups[item.name] || { ...item, placements: [], sources: [] };
    current.placements.push(`${item.pillar.toUpperCase()} ${item.branch}`);
    item.source.split(' + ').forEach((source) => {
      if (!current.sources.includes(source)) current.sources.push(source);
    });
    groups[item.name] = current;
    return groups;
  }, {}));
  const rows = grouped.length ? grouped.map((item) => `<tr>
    <td><strong>${item.name}</strong><span>${item.english}</span></td>
    <td><b>${item.placements.length} PLACEMENT${item.placements.length > 1 ? 'S' : ''}</b><span>${item.placements.join(' · ')}</span></td>
    <td>${item.sources.join(' + ')}</td>
    <td>${item.meaning}${item.placements.length > 1 ? ' Repetition increases emphasis across life contexts.' : ''}</td>
  </tr>`).join('') : '<tr><td colspan="4">No supported major symbolic-star markers are present in the supplied pillars.</td></tr>';
  return `<section class="pdf-page shen-sha-page" data-page>
    <div class="page-topline"><span>SYMBOLIC-STAR PROFILE</span><span>SECONDARY READING LENS</span></div>
    <header><span>神煞 / SHEN SHA</span><h2>Markers that add nuance,<br>not fixed outcomes</h2><p>Each marker is calculated from the natal stems and branches. It is interpreted as supporting context and never overrides the Day Master, Five Elements, or Ten-God structure.</p></header>
    <table class="shen-sha-table"><thead><tr><th>Marker</th><th>Location</th><th>Derived from</th><th>Practical interpretation</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="shen-sha-note"><strong>How to read this page</strong><p>A marker describes a recurring symbolic tendency. Repetition can strengthen emphasis, but no single Shen Sha guarantees an event, relationship, or outcome.</p></div>
    <footer><span>TENGYUNZI / AI BAZI REPORT</span><span data-page-number></span></footer>
  </section>`;
}

function relationSummary(interactions) {
  if (!interactions.length) return 'No major supported contact';
  return interactions.slice(0, 4).map((item) => {
    const source = item.scope === 'luck' && item.pillar === 'luck'
      ? 'active Luck Pillar'
      : item.pillar ? `${item.scope} ${item.pillar}` : item.scope;
    const contact = String(item.target || '').includes(String(item.source || ''))
      ? item.target
      : `${item.source}-${item.target}`;
    return `${item.label} (${contact}; ${source})`;
  }).join(' · ');
}

function timingPage(input, luck, pillars, currentYear) {
  const foundCurrentIndex = luck.findIndex((item) => item.year <= currentYear && item.year + 9 >= currentYear);
  const currentIndex = foundCurrentIndex >= 0 ? foundCurrentIndex : 0;
  const dayStem = pillars.day?.stem;
  const dayElement = charElement(dayStem);
  const strength = assessDayMasterStrength(pillars, { hourKnown: input.hour_known !== false });
  const guidance = balancingElementGuidance(dayElement, strength);
  const direction = luckDirection(pillars.year?.stem, input.gender);
  const cycles = luck.map((item, index) => {
    const gods = `${tenGod(dayStem, item.gz[0])} / ${tenGod(dayStem, (HIDDEN_STEMS[item.gz[1]] || [])[0])}`;
    return `<div class="cycle ${index === currentIndex ? 'is-current' : ''}">
      <span class="cycle-state">${index === currentIndex ? 'CURRENT' : `AGE ${item.age}-${item.age + 9}`}</span>
      ${coloredGanzhi(item.gz)}
      <strong>${item.year}-${item.year + 9}</strong>
      <small>${gods}</small>
    </div>`;
  }).join('');
  const years = Array.from({ length: 5 }, (_, offset) => currentYear + offset).map((year) => {
    const gz = ganzhiForYear(year);
    const cycleChange = luck.some((item) => item.year === year);
    const activeLuck = luck.find((item) => item.year <= year && item.year + 9 >= year);
    const interactions = analyzeAnnualInteractions({
      annualGz: gz,
      natalPillars: pillars,
      luckGz: activeLuck?.gz || '',
      hourKnown: input.hour_known !== false,
    });
    const stemGod = tenGod(dayStem, gz[0]);
    const strategy = timingPosture(interactions, TEN_GODS.find(([name]) => name === stemGod)?.[1] || stemGod, {
      ...guidance,
      annualElement: charElement(gz[0]),
    });
    return `<div class="annual-year ${year === currentYear ? 'is-now' : ''}">
      <span>${year}${cycleChange ? ' / NEW CYCLE' : ''}</span><b class="strategy strategy-${strategy.toLowerCase()}">${strategy}</b>
      ${coloredGanzhi(gz, 'small')}
      <small>${stemGod} / ${tenGod(dayStem, (HIDDEN_STEMS[gz[1]] || [])[0])}</small>
      <em>${escapeHtml(relationSummary(interactions))}</em>
    </div>`;
  }).join('');
  return `<article class="pdf-page timing-atlas" data-page>
    <div class="page-topline"><span>TIMING / DA YUN & LIU NIAN</span><span>CALCULATED CYCLES</span></div>
    <header><span>THE TIMING ATLAS</span><h2>Ten-year Luck Pillars<br>and annual contacts</h2><p>Direction: <strong>${direction.direction}</strong>. Basis: ${escapeHtml(direction.basis)}. Starting age: ${escapeHtml(input.start_age ?? 'not supplied')}. Each annual contact below names its source in the natal chart or active Luck Pillar.</p></header>
    <section class="cycle-section"><h3>Luck Pillars (Da Yun)</h3><div class="cycle-grid">${cycles}</div></section>
    <section class="annual-section"><div><h3>Five-year annual view (Liu Nian)</h3><p>The planning posture is derived from the annual Ten God and supported stem-branch contacts. It is not a guarantee of events.</p><div class="strategy-key"><span>ADVANCE</span><span>STEADY</span><span>DEFEND</span></div></div><div class="annual-grid">${years}</div></section>
    <footer><span>TENGYUNZI / AI BAZI REPORT</span><span data-page-number></span></footer>
  </article>`;
}

function sectionEvidence(number, context) {
  const { dayStem, dayElement, topGods, dominantElements, hiddenOnlyElements, currentLuck, monthBranch, direction } = context;
  if (number === 1) return `Day Master: ${dayStem}, a ${elementDisplay(dayElement)} Heavenly Stem. Day Pillar and Day Master are kept distinct.`;
  if (number === 2) return `Month Branch: ${monthBranch || 'not supplied'}; strength is read through season, roots, support, drains, and controls.`;
  if (number === 3) return `Visible leaders: ${dominantElements.join(' + ') || 'none'}. Hidden-only elements: ${hiddenOnlyElements.join(' + ') || 'none'}.`;
  if (number === 4) return `Canonical weighted Ten-God leaders: ${topGods.join(', ')}. Visible and hidden sources are listed separately.`;
  if (number === 5) return 'Useful and unfavorable elements must follow the stated strength and balancing logic; they are not inferred from a simple missing-element count.';
  if (number === 6) return 'Only exact supported stem and branch relations are reported; repeats are not treated as two-member combinations.';
  if (number === 7) return 'Canonical Shen Sha only, grouped by marker and shown with every natal placement on the Shen Sha table.';
  if (number >= 8 && number <= 11) return `${dayStem} ${elementDisplay(dayElement)} Day Master, interpreted through Ten Gods, the Day Branch, and relevant natal interactions.`;
  if (number === 12) return `Luck direction: ${direction.direction}. Basis: ${direction.basis}.`;
  if (number >= 13 && number <= 15) return `Current Luck Pillar: ${currentLuck || 'not supplied'}; annual contacts are shown with their natal or Luck-Pillar source.`;
  return `${dayStem} ${elementDisplay(dayElement)} Day Master; leading Ten-God functions: ${topGods.slice(0, 2).join(' and ')}.`;
}

function sectionPage(section, context) {
  const [group, theme] = sectionGroup(section.number);
  const sentences = splitReportSentences(section.body);
  const lead = sentences.slice(0, 2).join(' ');
  const remainder = sentences.slice(2);
  const body = [];
  for (let index = 0; index < remainder.length; index += 3) body.push(remainder.slice(index, index + 3).join(' '));
  const density = section.body.length > 1900 ? ' extra-dense' : section.body.length > 1450 ? ' dense' : '';
  const confidence = confidenceForSection(section.number);
  return `<article class="pdf-page section-page${density}" id="section-${section.number}" data-page>
    <div class="page-topline"><span>${group}</span><span>CONFIDENCE / ${confidence.level}</span></div>
    <div class="section-layout">
      <aside class="section-index"><span>${String(section.number).padStart(2, '0')}</span><small>${theme}</small></aside>
      <div class="section-content">
        <h2>${escapeHtml(section.title)}</h2>
        ${sectionVisual(section.number)}
        <div class="core-insight"><span>CORE INTERPRETATION</span><p>${escapeHtml(lead)}</p></div>
        <div class="chart-basis"><strong>Chart basis</strong><span>${escapeHtml(sectionEvidence(section.number, context))}</span></div>
        <div class="section-copy">${body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div>
        <div class="practice-panel confidence-${confidence.level.toLowerCase()}"><div><strong>${escapeHtml(confidence.label)}</strong><span>${escapeHtml(confidence.note)}</span></div><div><strong>Interpretation boundary</strong><p>Calculated facts are separated from interpretation. No single symbol is proof of a fixed event.</p></div></div>
      </div>
    </div>
    <footer><span>TENGYUNZI / AI BAZI REPORT</span><span data-page-number></span></footer>
  </article>`;
}

function pillarCard(label, pillar, subtitle) {
  const stem = pillar?.stem || '?';
  const branch = pillar?.branch || '?';
  return `<div class="pillar-card">
    <span>${label}</span>
    <strong class="wx-${charElement(stem)}">${escapeHtml(stem)}</strong>
    <strong class="wx-${charElement(branch)}">${escapeHtml(branch)}</strong>
    <small>${subtitle}</small>
  </div>`;
}

function parseLuck(text) {
  return String(text || '').split('|').map((item) => item.trim()).filter(Boolean).map((item) => {
    const match = item.match(/^(\S+) from age (\d+) \((\d+)\)$/);
    return match ? { gz: match[1], age: Number(match[2]), year: Number(match[3]) } : null;
  }).filter(Boolean);
}

async function loadReport() {
  const env = { ...readEnv(path.join(ROOT, '.env.local')), ...process.env };
  const snapshot = env.REPORT_SNAPSHOT ? path.resolve(env.REPORT_SNAPSHOT) : '';
  if (snapshot && fs.existsSync(snapshot)) {
    const parsed = JSON.parse(fs.readFileSync(snapshot, 'utf8'));
    const report = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!report?.id) throw new Error(`Report snapshot ${snapshot} is invalid`);
    return report;
  }
  const base = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in .env.local');
  const query = `${base}/rest/v1/english_ai_reports?id=eq.${encodeURIComponent(REPORT_ID)}&select=id,birth_input,chart_data,result_text,created_at`;
  const response = await fetch(query, { headers: { apikey: key, authorization: `Bearer ${key}` } });
  const rows = await response.json();
  if (!response.ok || !rows?.[0]) throw new Error(`Report ${REPORT_ID} could not be loaded`);
  return rows[0];
}

async function buildDocument(report) {
  const input = report.birth_input || {};
  const chart = report.chart_data || {};
  const qualityPass = deduplicateReportSections(report.result_text);
  const sections = splitSections(qualityPass.text);
  if (sections.length !== ENGLISH_BAZI_REPORT_SECTION_COUNT) throw new Error(`Expected ${ENGLISH_BAZI_REPORT_SECTION_COUNT} sections, received ${sections.length}`);
  for (const expected of ENGLISH_BAZI_REPORT_SECTIONS) {
    const actual = sections.find((section) => section.number === expected.number);
    if (!actual || actual.title !== expected.title) throw new Error(`Section ${expected.number} must be titled "${expected.title}"`);
  }
  const pillars = chart.pillars || {};
  const canonicalElements = elementProfile(pillars);
  const elements = canonicalElements.visible;
  const luck = parseLuck(input.dayun_text);
  const tenGodEnergy = tenGodProfile(pillars);
  const shenShaEnergy = shenShaForChart(pillars, { hourKnown: input.hour_known !== false }).map((item) => ({
    ...item,
    meaning: (SHEN_SHA_META[item.name] || [item.english, 'A secondary symbolic marker used only as supporting context.'])[1],
  }));
  const dayStem = pillars.day?.stem || '';
  const dayElement = charElement(dayStem);
  const strength = assessDayMasterStrength(pillars, { hourKnown: input.hour_known !== false });
  const guidance = balancingElementGuidance(dayElement, strength);
  const rankedElements = Object.entries(elements).sort((a, b) => Number(b[1]) - Number(a[1]));
  const visibleElements = rankedElements.filter(([, value]) => Number(value) > 0).map(([element]) => elementDisplay(element));
  const hiddenOnlyElements = ELEMENT_ORDER.filter((element) => canonicalElements.presence[element] === 'hidden_only').map(elementDisplay);
  const quietElements = ELEMENT_ORDER.filter((element) => canonicalElements.presence[element] === 'not_present').map(elementDisplay);
  const dominantElements = rankedElements.filter(([, value]) => Number(value) === Number(rankedElements[0]?.[1] || 0)).map(([element]) => elementDisplay(element));
  const profileTitle = dominantElements.length <= 2
    ? `A concentrated ${dominantElements.join('-')} profile`
    : `A broad ${dominantElements.length}-element profile`;
  const overviewTitle = `${elementDisplay(dayElement)} at the center.<br>${dominantElements.length > 2 ? 'Four forces in dialogue.' : `${dominantElements.join(' and ')} in motion.`}`;
  const overviewText = `The visible stems and branches emphasize ${visibleElements.join(', ') || 'no countable elements'}. ${hiddenOnlyElements.length ? `${hiddenOnlyElements.join(' and ')} ${hiddenOnlyElements.length === 1 ? 'appears' : 'appear'} only in hidden stems. ` : ''}${quietElements.length ? `${quietElements.join(' and ')} ${quietElements.length === 1 ? 'is' : 'are'} not present in the supplied pillars.` : 'Every element is present either visibly or in hidden stems.'}`;
  const posture = strength.classification === 'weak' ? 'SUPPORT' : strength.classification === 'strong' ? 'CHANNEL' : 'REGULATE';
  const postureNote = strength.classification === 'weak'
    ? 'Reinforce before loading'
    : strength.classification === 'strong'
      ? 'Channel available force'
      : 'Balance through season';
  const elementLegend = ELEMENT_ORDER.map((element) => {
    const role = elementRole(dayStem, element);
    const meanings = {
      Companion: 'Identity, peers, continuity', Output: 'Expression, craft, production', Wealth: 'Resources, exchange, stewardship', Officer: 'Direction, standards, authority', Resource: 'Learning, support, replenishment',
    };
    return `<div><i class="${element}"></i><strong>${elementDisplay(element)} / ${role}</strong><span>${meanings[role]}</span></div>`;
  }).join('');
  const generated = new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const birthDate = new Date(Date.UTC(input.year, input.month - 1, input.day)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const toc = sections.map((section) => {
    const [group] = sectionGroup(section.number);
    return `<li><span>${String(section.number).padStart(2, '0')}</span><a href="#section-${section.number}"><strong>${escapeHtml(section.title)}</strong><small>${group}</small></a></li>`;
  }).join('');
  const currentYear = new Date(report.created_at || Date.now()).getUTCFullYear();
  const currentLuck = luck.find((item) => item.year <= currentYear && item.year + 9 >= currentYear);
  const dayElementRoots = Object.values(pillars)
    .map((pillar) => pillar?.branch || '')
    .filter((branch) => (HIDDEN_STEMS[branch] || []).some((stem) => charElement(stem) === dayElement));
  const currentGanzhi = ganzhiForYear(currentYear);
  const currentInteractions = analyzeAnnualInteractions({
    annualGz: currentGanzhi,
    natalPillars: pillars,
    luckGz: currentLuck?.gz || '',
    hourKnown: input.hour_known !== false,
  });
  const currentStemGod = tenGod(dayStem, currentGanzhi[0]);
  const currentPosture = timingPosture(currentInteractions, TEN_GODS.find(([name]) => name === currentStemGod)?.[1] || currentStemGod, {
    ...guidance,
    annualElement: charElement(currentGanzhi[0]),
  });
  const sectionContext = {
    dayStem,
    dayElement,
    dominantElements,
    quietElements,
    hiddenOnlyElements,
    monthBranch: pillars.month?.branch || '',
    direction: luckDirection(pillars.year?.stem, input.gender),
    currentLuck: currentLuck ? `${currentLuck.gz} (${currentLuck.year}-${currentLuck.year + 9})` : '',
    topGods: tenGodEnergy.slice(0, 3).map((item) => `${item.english} ${item.score}%`),
  };
  const reportCode = String(report.id || '').slice(0, 8).toUpperCase();
  const secureReportUrl = `https://www.tengyunzi.com/tengyunzi-report.html?report=${encodeURIComponent(report.id)}#report-output`;
  const qrDataUrl = await QRCode.toDataURL(secureReportUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 360,
    color: { dark: '#0b2943', light: '#ffffff' },
  });

  const data = JSON.stringify({ elements, luck }).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tengyunzi Standard BaZi Report ${escapeHtml(reportCode)} - V4</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Serif:wght@600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>${fs.readFileSync(path.join(import.meta.dirname, 'template.css'), 'utf8')}</style>
</head>
<body>
  <main class="report-book">
    <section class="pdf-page cover" data-page>
      <div class="cover-mark">TZ</div>
      <div class="cover-title">
        <span>STANDARD AI BAZI REPORT</span>
        <h1>Your Four Pillars<br>Interpretation</h1>
        <p>A traditional BaZi reading of chart structure, Ten Gods, useful elements, life topics, Luck Pillars, and annual timing.</p>
      </div>
      <div class="cover-orbit" aria-hidden="true"><i></i><i></i><i></i><strong>命</strong></div>
      <dl class="cover-meta">
        <div><dt>Birth profile</dt><dd>${escapeHtml(birthDate)}</dd></div>
        <div><dt>Chart</dt><dd>${escapeHtml(input.bazi_str)}</dd></div>
        <div><dt>Report ID</dt><dd>${escapeHtml(reportCode)} · V4<br>${escapeHtml(generated)}</dd></div>
      </dl>
      <footer><span>TENGYUNZI</span><span>CONFIDENTIAL AI-GENERATED REPORT</span></footer>
    </section>

    <section class="pdf-page overview" data-page>
      <div class="page-topline"><span>EXECUTIVE VIEW</span><span>STANDARD EDITION</span></div>
      <header class="overview-head"><div><span>THE CHART AT A GLANCE</span><h2>${overviewTitle}</h2></div><p>${escapeHtml(overviewText)}</p></header>
      <div class="overview-grid">
        <div class="pillars-panel">
          <h3>Four Pillars</h3>
          <div class="pillar-row">
            ${pillarCard('YEAR', pillars.year, `${pillars.year?.stem || '?'}${pillars.year?.branch || '?'}`)}
            ${pillarCard('MONTH', pillars.month, `${pillars.month?.stem || '?'}${pillars.month?.branch || '?'}`)}
            ${pillarCard('DAY', pillars.day, 'Day Master')}
            ${pillarCard('HOUR', pillars.hour, input.hour_known === false ? 'Unknown' : 'Birth hour')}
          </div>
          <p class="unknown-note">${input.hour_known === false
            ? 'The birth hour was not provided. The reading uses the verified Year, Month, and Day pillars and does not invent an Hour Pillar.'
            : `The recorded birth time is ${String(input.hour).padStart(2, '0')}:00. All four pillars are included in this reading.`}</p>
        </div>
        <div class="signal-panel four-up">
          <div><span>DAY MASTER</span><strong class="wx-${dayElement}">${escapeHtml(dayStem)}</strong><small>${STEMS.indexOf(dayStem) % 2 === 0 ? 'Yang' : 'Yin'} ${elementDisplay(dayElement)}</small></div>
          <div><span>LEADING FUNCTION</span><strong>${escapeHtml(tenGodEnergy[0]?.name || '-')}</strong><small>${escapeHtml(tenGodEnergy[0]?.english || '')} · ${tenGodEnergy[0]?.score || 0}%</small></div>
          <div><span>CURRENT CYCLE</span><strong>${escapeHtml(currentLuck?.gz || '甲子')}</strong><small>${currentLuck ? `${currentLuck.year}-${currentLuck.year + 9}` : 'Timing not supplied'}</small></div>
          <div><span>CORE POSTURE</span><strong>${posture}</strong><small>${postureNote}</small></div>
        </div>
        <div class="executive-priorities">
          <div><span>01 / FOUNDATION</span><strong>${escapeHtml(dayStem)} ${escapeHtml(elementDisplay(dayElement))} in ${escapeHtml(pillars.month?.branch || '?')} season</strong><p>${dayElementRoots.length ? `Rooted in ${[...new Set(dayElementRoots)].join(', ')}; strength is checked against season and support.` : 'No same-element branch root; support must be read from the remaining stems and branches.'}</p></div>
          <div><span>02 / STRUCTURE</span><strong>${escapeHtml(tenGodEnergy[0]?.english || 'Ten-God structure')} leads at ${tenGodEnergy[0]?.score || 0}%</strong><p>Calculated from visible non-Day stems and weighted hidden stems, then interpreted with the full chart.</p></div>
          <div><span>03 / TIMING</span><strong>${currentYear} ${escapeHtml(currentGanzhi)} · ${escapeHtml(currentPosture)}</strong><p>Planning posture uses the active Luck Pillar and supported annual contacts; it is not an event guarantee.</p></div>
        </div>
        <div class="confidence-key"><span><b>CALCULATED</b> direct chart or timing data</span><span><b>SUPPORTED</b> structural interpretation</span><span><b>CONTEXTUAL</b> compare with lived circumstances</span></div>
      </div>
      <footer><span>TENGYUNZI / AI BAZI REPORT</span><span data-page-number></span></footer>
    </section>

    <section class="pdf-page energy-page" data-page>
      <div class="page-topline"><span>ELEMENTAL PROFILE</span><span>STANDARD EDITION</span></div>
      <header><span>FIVE ELEMENT ENERGY</span><h2>${profileTitle}</h2><p>The chart counts visible stems and branches only. Zero does not mean an element is absent from life; it means that function is not visibly emphasized in the natal pillars used here.</p></header>
      <div class="energy-layout">
        <div class="chart radar-chart" id="element-radar"></div>
        <div class="chart bars-chart" id="element-bars"></div>
      </div>
      <div class="energy-legend">${elementLegend}</div>
      <footer><span>TENGYUNZI / AI BAZI REPORT</span><span data-page-number></span></footer>
    </section>

    ${tenGodTablePage(tenGodEnergy)}

    ${shenShaTablePage(shenShaEnergy)}

    <section class="pdf-page contents" data-page>
      <div class="page-topline"><span>READING MAP</span><span>STANDARD BAZI INTERPRETATION</span></div>
      <header><h2>What this report covers</h2><p>${ENGLISH_BAZI_REPORT_SECTION_COUNT} evidence-led chapters, moving from the natal chart to life topics, Luck Pillars, and annual timing.</p></header>
      <ol>${toc}</ol>
      <footer><span>TENGYUNZI / AI BAZI REPORT</span><span data-page-number></span></footer>
    </section>

    ${sections.flatMap((section) => section.number === 13
      ? [timingPage(input, luck, pillars, currentYear), sectionPage(section, sectionContext)]
      : [sectionPage(section, sectionContext)]).join('\n')}

    <section class="pdf-page methodology" data-page>
      <div class="page-topline"><span>METHOD & LIMITS</span><span>STANDARD EDITION</span></div>
      <div class="method-layout">
        <div><h2>Calculation basis<br>and reading limits</h2><p>This report was generated by Tengyunzi's AI interpretation system from calculated chart data. It is not represented as a report written personally by Tengyunzi.</p><p>The report follows standard BaZi order: season and Day Master strength first, then Five Elements, Ten Gods, chart structure, life topics, and timing. Interpretation remains conditional rather than a guarantee of events. ${input.hour_known === false
          ? 'Because the birth hour is unknown, no Hour Pillar conclusions are included.'
          : `The recorded birth time of ${String(input.hour).padStart(2, '0')}:00 is included, so the Hour Pillar is part of the structural analysis.`}</p></div>
        <dl>
          <div><dt>01</dt><dd><strong>Birth input</strong><span>Gregorian civil date · ${escapeHtml(input.timezone || 'timezone not supplied')} · ${input.birthplace ? escapeHtml(input.birthplace) : 'birthplace not supplied'}</span></dd></div>
          <div><dt>02</dt><dd><strong>Chart source</strong><span>Four Pillars and Luck Pillars supplied by the Tengyunzi calculation engine; solar-time correction is not applied without birthplace data.</span></dd></div>
          <div><dt>03</dt><dd><strong>Ten-God weighting</strong><span>Visible non-Day stems weight 1.0. Hidden branch stems use 60/30/10 weighting, adjusted by pillar position.</span></dd></div>
          <div><dt>04</dt><dd><strong>Shen Sha scope</strong><span>Supported canonical markers only. They remain secondary to Day Master, Five Elements, and Ten-God structure.</span></dd></div>
        </dl>
      </div>
      <div class="disclaimer"><strong>Important</strong><p>This report is for educational and reflective purposes. It is not medical, legal, financial, or mental-health advice, and it does not guarantee future events.</p></div>
      <footer><span>TENGYUNZI / AI BAZI REPORT</span><span data-page-number></span></footer>
    </section>

    <section class="pdf-page closing" data-page>
      <div class="closing-mark">TZ</div>
      <div class="closing-copy"><span>REPORT COMPLETE</span><h2>Chart evidence.<br>Traditional interpretation.</h2><p>Keep this report with your birth data and revisit the timing sections when the active Luck Pillar or calendar year changes.</p></div>
      <div class="closing-access">
        <img src="${qrDataUrl}" alt="QR code to open this report securely on mobile">
        <div><strong>Continue securely on your phone</strong><p>Scan to open this report in My Readings. Sign-in with the report account is required.</p><a href="${escapeHtml(secureReportUrl)}">Open mobile reading</a></div>
      </div>
      <nav class="closing-next" aria-label="Next steps"><a href="https://www.tengyunzi.com/tengyunzi-readings.html">Personal reading</a><a href="https://www.tengyunzi.com/tengyunzi-annual-forecast.html">Monthly timing</a><a href="https://www.tengyunzi.com/tengyunzi-newsletter.html">Free daily almanac</a></nav>
      <footer><span>hello@tengyunzi.com</span><span>tengyunzi.com</span></footer>
    </section>
  </main>
  <script>
    window.__REPORT_DATA__ = ${data};
    document.querySelectorAll('[data-page]').forEach((page, index) => {
      page.querySelector('[data-page-number]')?.replaceChildren(String(index + 1).padStart(2, '0'));
    });
    const palette = { wood:'#398064', fire:'#c65d4b', earth:'#aa823f', metal:'#73839a', water:'#2478b5', ink:'#0b2943', grid:'#dce8f1' };
    const labels = ['Wood','Fire','Earth','Metal','Water'];
    const values = labels.map((key) => Number(window.__REPORT_DATA__.elements[key.toLowerCase()] || 0));
    function mountChart(id, option) {
      const node = document.getElementById(id);
      if (!node || !window.echarts) return;
      const chart = echarts.init(node, null, { renderer:'svg' });
      chart.setOption(option);
    }
    mountChart('element-radar', {
      animation:false,
      radar:{ indicator:labels.map((name)=>({name,max:4})), radius:'63%', splitNumber:4, axisName:{color:palette.ink,fontFamily:'Noto Sans',fontWeight:700,fontSize:12}, splitLine:{lineStyle:{color:palette.grid}}, splitArea:{areaStyle:{color:['#fbfdff','#f4f8fb']}}, axisLine:{lineStyle:{color:palette.grid}} },
      series:[{type:'radar',symbol:'circle',symbolSize:7,data:[{value:values,areaStyle:{color:'rgba(36,120,181,.18)'},lineStyle:{color:palette.water,width:3},itemStyle:{color:palette.water}}]}]
    });
    mountChart('element-bars', {
      animation:false, grid:{left:72,right:28,top:22,bottom:32}, xAxis:{type:'value',min:0,max:4,interval:1,axisLabel:{color:'#5d7183'},splitLine:{lineStyle:{color:palette.grid}},axisLine:{show:false},axisTick:{show:false}}, yAxis:{type:'category',data:labels,axisLabel:{color:palette.ink,fontWeight:700},axisLine:{show:false},axisTick:{show:false}}, series:[{type:'bar',data:values.map((value,index)=>({value,itemStyle:{color:[palette.wood,palette.fire,palette.earth,palette.metal,palette.water][index]}})),barWidth:18,label:{show:true,position:'right',color:palette.ink,fontWeight:800}}]
    });
    mountChart('section-elements', {
      animation:false, grid:{left:80,right:28,top:18,bottom:24}, xAxis:{type:'value',max:4,splitLine:{lineStyle:{color:palette.grid}},axisLabel:{show:false},axisLine:{show:false},axisTick:{show:false}}, yAxis:{type:'category',data:labels,axisLabel:{color:palette.ink,fontWeight:700},axisLine:{show:false},axisTick:{show:false}}, series:[{type:'bar',data:values,barWidth:13,itemStyle:{color:palette.water,borderRadius:[0,3,3,0]},label:{show:true,position:'right',color:palette.ink,fontWeight:800}}]
    });
  </script>
</body>
</html>`;
}

const report = await loadReport();
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const output = path.join(OUTPUT_DIR, `${OUTPUT_BASENAME}.html`);
fs.writeFileSync(output, await buildDocument(report), 'utf8');
console.log(JSON.stringify({ output, reportId: report.id, sections: splitSections(report.result_text).length }, null, 2));
