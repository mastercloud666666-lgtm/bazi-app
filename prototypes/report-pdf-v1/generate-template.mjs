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
  assessClassicalSpecialPattern,
  assessDayMasterStrength,
  balancingElementGuidance,
  charElement as canonicalCharElement,
  elementProfile,
  luckDirection,
  shenShaForChart,
  tenGod as canonicalTenGod,
  timingAssessment,
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
const OUTPUT_BASENAME = process.env.OUTPUT_BASENAME || 'tengyunzi-bazi-life-pattern-book-v11';

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

function decodeHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function reportTextFromRenderedHtml(file) {
  const html = fs.readFileSync(file, 'utf8');
  const sections = [...html.matchAll(/<article class="pdf-page section-page[^"]*" id="section-(\d+)"[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<div class="core-insight">[\s\S]*?<p>([\s\S]*?)<\/p><\/div>[\s\S]*?<div class="section-copy">([\s\S]*?)<\/div>\s*<div class="practice-panel/g)]
    .map((match) => {
      const body = [...match[4].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((paragraph) => decodeHtml(paragraph[1]));
      return `Section ${Number(match[1])}: ${decodeHtml(match[2])}\n${[decodeHtml(match[3]), ...body].join(' ')}`;
    });
  if (sections.length !== ENGLISH_BAZI_REPORT_SECTION_COUNT) {
    throw new Error(`Rendered HTML source must contain ${ENGLISH_BAZI_REPORT_SECTION_COUNT} report chapters; found ${sections.length}`);
  }
  return sections.join('\n\n');
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
  if (number <= 10) return ['LIFE DOMAINS', 'Traditional reading'];
  if (number <= 12) return ['TIMING', 'Da Yun & Liu Nian'];
  return ['FINAL VERDICT', 'Synthesis'];
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
const CUSTOMER_TERM_REPLACEMENTS = new Map([
  ...TEN_GODS.map(([name, english]) => [name, english]),
  ...Object.entries(SHEN_SHA_META).map(([name, [english]]) => [name, english]),
]);
const ALLOWED_GANZHI_CHARACTERS = new Set([...STEMS, ...BRANCHES]);

function customerEnglishOnly(value) {
  let output = String(value || '');
  for (const [source, replacement] of CUSTOMER_TERM_REPLACEMENTS) {
    output = output.replaceAll(source, replacement);
    output = output.replaceAll(`${replacement} (${replacement})`, replacement);
  }
  return output
    .replace(/[\u3400-\u9fff]+/g, (sequence) => (
      [...sequence].every((character) => ALLOWED_GANZHI_CHARACTERS.has(character)) ? sequence : ''
    ))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/\bluck\s+luck\b/gi, 'Luck Pillar')
    .replace(/ +([,.;:])/g, '$1');
}

function charElement(char) {
  return canonicalCharElement(char);
}

function tenGod(dayStem, otherStem) {
  return canonicalTenGod(dayStem, otherStem);
}

function tenGodDisplay(dayStem, otherStem) {
  const name = tenGod(dayStem, otherStem);
  return TEN_GODS.find(([chinese]) => chinese === name)?.[1] || name;
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
    <div class="ten-god-name"><strong>${item.english}</strong></div>
    <div class="ten-god-meter">${item.score > 0 ? `<i class="wx-${item.element}" style="width:${item.score}%"></i>` : ''}</div>
    <b>${item.score}%</b>
    <small><span>${item.meaning}</span><em>Visible ${item.visible.toFixed(2)} · Hidden ${item.hidden.toFixed(2)}</em></small>
  </div>`).join('');
  return `<section class="pdf-page ten-gods-page" data-page>
    <div class="page-topline"><span>TEN-GOD MODEL</span><span>NATAL STRUCTURE</span></div>
    <header><span>DERIVED FUNCTIONAL DISTRIBUTION</span><h2>How the chart's forces<br>relate to the Day Master</h2><p>This profile combines visible stems with weighted hidden stems. It describes structural emphasis, not a fixed share of life outcomes.</p></header>
    <div class="ten-god-table">${rows}</div>
    <div class="ten-god-note"><strong>Reading the scale</strong><p>Percentages use largest-remainder rounding and total exactly 100%. Visible counts come from non-Day stems; hidden scores use weighted branch roots. This is a technical distribution index for the natal chart.</p></div>
    <footer><span>TENGYUNZI / BAZI LIFE PATTERN BOOK</span><span data-page-number></span></footer>
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
    <td><strong>${item.english}</strong></td>
    <td><b>${item.placements.length} PLACEMENT${item.placements.length > 1 ? 'S' : ''}</b><span>${item.placements.join(' · ')}</span></td>
    <td>${item.sources.join(' + ')}</td>
    <td>${item.meaning}${item.placements.length > 1 ? ' Repetition increases emphasis across life contexts.' : ''}</td>
  </tr>`).join('') : '<tr><td colspan="4">No supported major symbolic-star markers are present in the supplied pillars.</td></tr>';
  return `<section class="pdf-page shen-sha-page" data-page>
    <div class="page-topline"><span>SECONDARY MARKERS</span><span>SECONDARY NATAL EVIDENCE</span></div>
    <header><span>DERIVED LOOKUP MARKERS</span><h2>Markers that add nuance,<br>not fixed outcomes</h2><p>Each marker is calculated from the natal stems and branches. It is interpreted as supporting context and never overrides the Day Master, Five Elements, or Ten-God structure.</p></header>
    <table class="shen-sha-table"><thead><tr><th>Marker</th><th>Location</th><th>Derived from</th><th>Practical interpretation</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="shen-sha-note"><strong>How to read this page</strong><p>A marker describes a recurring symbolic tendency. Repetition can strengthen emphasis, but no single Shen Sha guarantees an event, relationship, or outcome.</p></div>
    <footer><span>TENGYUNZI / BAZI LIFE PATTERN BOOK</span><span data-page-number></span></footer>
  </section>`;
}

function relationSummary(interactions) {
  if (!interactions.length) return 'No major supported contact';
  const grouped = [...interactions.reduce((groups, item) => {
    const key = [item.type, item.scope, item.source, item.target, item.resultingElement || ''].join('|');
    const current = groups.get(key) || { ...item, locations: [] };
    const location = item.scope === 'luck' && item.pillar === 'luck'
      ? 'active Luck Pillar'
      : item.pillar ? `${item.scope} ${item.pillar}` : item.scope;
    if (!current.locations.includes(location)) current.locations.push(location);
    groups.set(key, current);
    return groups;
  }, new Map()).values()];
  return grouped.map((item) => {
    const contact = String(item.target || '').includes(String(item.source || ''))
      ? item.target
      : `${item.source}-${item.target}`;
    return `${item.label} (${contact}; ${item.locations.join(' + ')})`;
  }).join(' · ');
}

function timingPage(input, luck, pillars, currentYear) {
  const foundCurrentIndex = luck.findIndex((item) => item.year <= currentYear && item.year + 9 >= currentYear);
  const currentIndex = foundCurrentIndex >= 0 ? foundCurrentIndex : 0;
  const dayStem = pillars.day?.stem;
  const dayElement = charElement(dayStem);
  const strength = assessDayMasterStrength(pillars, { hourKnown: input.hour_known !== false });
  const specialPattern = assessClassicalSpecialPattern(pillars, { hourKnown: input.hour_known !== false });
  const guidance = balancingElementGuidance(dayElement, strength, specialPattern);
  const direction = luckDirection(pillars.year?.stem, input.gender);
  const cycles = luck.map((item, index) => {
    const gods = `${tenGodDisplay(dayStem, item.gz[0])} / ${tenGodDisplay(dayStem, (HIDDEN_STEMS[item.gz[1]] || [])[0])}`;
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
    const assessment = timingAssessment(interactions, {
      ...guidance,
      annualElement: charElement(gz[0]),
    });
    const strategy = assessment.supportScore >= assessment.pressureScore + 3
      ? 'FAVORABLE'
      : assessment.supportScore > assessment.pressureScore
        ? 'MODERATELY FAVORABLE'
        : assessment.pressureScore >= assessment.supportScore + 3
          ? 'UNFAVORABLE'
          : assessment.pressureScore > assessment.supportScore
            ? 'MODERATELY UNFAVORABLE'
            : 'NEUTRAL';
    return `<div class="annual-year ${year === currentYear ? 'is-now' : ''}">
      <span>${year}${cycleChange ? ' / TRANSITION YEAR' : ''}</span><b class="strategy">${strategy}</b>
      ${coloredGanzhi(gz, 'small')}
      <small>${tenGodDisplay(dayStem, gz[0])} / ${tenGodDisplay(dayStem, (HIDDEN_STEMS[gz[1]] || [])[0])}</small>
      <small class="posture-reason">Reason: ${escapeHtml(assessment.postureReason)}</small>
      <em>${escapeHtml(relationSummary(interactions))}</em>
    </div>`;
  }).join('');
  return `<article class="pdf-page timing-atlas timing-cycles" data-page>
    <div class="page-topline"><span>TIMING / DA YUN</span><span>CALCULATED CYCLES</span></div>
    <header><span>THE TIMING ATLAS</span><h2>Ten-year Luck Pillars<br>and annual contacts</h2><p>Direction: <strong>${direction.direction}</strong>. Basis: ${escapeHtml(direction.basis)}. Starting age: ${escapeHtml(input.start_age ?? 'not supplied')}. The exact transition date was not supplied, so a boundary year is provisional rather than treated as a confirmed January 1 change.</p></header>
    <section class="cycle-section"><h3>Luck Pillars (Da Yun)</h3><div class="cycle-grid">${cycles}</div></section>
    <footer><span>TENGYUNZI / BAZI LIFE PATTERN BOOK</span><span data-page-number></span></footer>
  </article>
  <article class="pdf-page timing-atlas timing-annual" data-page>
    <div class="page-topline"><span>TIMING / ANNUAL MODEL</span><span>ONE SHARED DATA SOURCE</span></div>
    <header><span>FIVE-YEAR ASSESSMENT</span><h2>Explicit annual<br>ratings</h2><p>Every rating follows the same governing pattern and favorable-element verdict used in Chapters 2, 11, and 12.</p></header>
    <section class="annual-section"><div><h3>Five-year annual cycle</h3><p>Each year is rated from Favorable through Unfavorable using the same canonical contacts.</p><div class="strategy-key"><span>FAVORABLE</span><span>MODERATELY FAVORABLE</span><span>NEUTRAL</span><span>MODERATELY UNFAVORABLE</span><span>UNFAVORABLE</span></div></div><div class="annual-grid">${years}</div></section>
    <footer><span>TENGYUNZI / BAZI LIFE PATTERN BOOK</span><span data-page-number></span></footer>
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
  const sourceParagraphs = section.body.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const leadSentences = splitReportSentences(sourceParagraphs[0] || section.body);
  const lead = leadSentences.slice(0, 2).join(' ');
  const preservedParagraphs = [leadSentences.slice(2).join(' '), ...sourceParagraphs.slice(1)].filter(Boolean);
  const body = [4, 8, 9, 10, 14, 15].includes(section.number)
    ? preservedParagraphs
    : (() => {
      const remainder = splitReportSentences(section.body).slice(2);
      const grouped = [];
      for (let index = 0; index < remainder.length; index += 3) grouped.push(remainder.slice(index, index + 3).join(' '));
      return grouped;
    })();
  const density = section.body.length > 1900 ? ' extra-dense' : section.body.length > 1450 ? ' dense' : '';
  const confidence = confidenceForSection(section.number);
  const topicPractice = {
    8: {
      questions: 'Which work gives enough preparation time? Where does responsibility exceed authority? What support makes demanding work sustainable?',
      step: 'Before accepting a larger role, write down its scope, decision rights, review standard, and support.',
    },
    9: {
      questions: 'Do opportunities arrive before capacity is ready? Which commitments cost more than they return? What work can be repeated without depletion?',
      step: 'Evaluate every opportunity with a carrying-cost line for time, recovery, administration, and obligations.',
    },
    10: {
      questions: 'Are expectations stated early? Is responsibility shared clearly? Do boundaries remain workable when pressure rises?',
      step: 'Discuss roles, time, money, and non-negotiable boundaries before making a lasting commitment.',
    },
  }[section.number];
  const practicePanel = topicPractice
    ? `<div class="practice-panel topic-practice"><div><strong>Questions to consider</strong><span>${escapeHtml(topicPractice.questions)}</span></div><div><strong>Practical step</strong><p>${escapeHtml(topicPractice.step)}</p></div></div>`
    : `<div class="practice-panel confidence-${confidence.level.toLowerCase()}"><div><strong>${escapeHtml(confidence.label)}</strong><span>${escapeHtml(confidence.note)}</span></div><div><strong>Interpretation boundary</strong><p>Calculated facts are separated from interpretation. No single symbol is proof of a fixed event.</p></div></div>`;
  return `<article class="pdf-page section-page${density}" id="section-${section.number}" data-page>
    <div class="page-topline"><span>${group}</span><span>READING BASIS / ${confidence.level}</span></div>
    <div class="section-layout">
      <aside class="section-index"><span>${String(section.number).padStart(2, '0')}</span><small>${theme}</small></aside>
      <div class="section-content">
        <h2>${escapeHtml(section.title)}</h2>
        ${sectionVisual(section.number)}
        <div class="core-insight"><span>CHAPTER FINDING</span><p>${escapeHtml(lead)}</p></div>
        <div class="chart-basis"><strong>Chart evidence</strong><span>${escapeHtml(sectionEvidence(section.number, context))}</span></div>
        <div class="section-copy">${body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div>
        ${practicePanel}
      </div>
    </div>
    <footer><span>TENGYUNZI / BAZI LIFE PATTERN BOOK</span><span data-page-number></span></footer>
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
    if (env.REPORT_HTML_SOURCE) {
      report.result_text = reportTextFromRenderedHtml(path.resolve(env.REPORT_HTML_SOURCE));
    }
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
  const qualityPass = deduplicateReportSections(customerEnglishOnly(report.result_text));
  let sections = splitSections(qualityPass.text);
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
  const profileTitle = hiddenOnlyElements.length === 1
    ? `Four elements are visible; ${hiddenOnlyElements[0]} remains hidden`
    : `${visibleElements.length} of the Five Elements are visible`;
  const overviewTitle = `${elementDisplay(dayElement)} at the center.<br>${dominantElements.length > 2 ? 'Four forces in dialogue.' : `${dominantElements.join(' and ')} in motion.`}`;
  const overviewText = `The visible stems and branches emphasize ${visibleElements.join(', ') || 'no countable elements'}. ${hiddenOnlyElements.length ? `${hiddenOnlyElements.join(' and ')} ${hiddenOnlyElements.length === 1 ? 'appears' : 'appear'} only in hidden stems. ` : ''}${quietElements.length ? `${quietElements.join(' and ')} ${quietElements.length === 1 ? 'is' : 'are'} not present in the supplied pillars.` : 'Every element is present either visibly or in hidden stems.'}`;
  const posture = strength.classification === 'weak' ? 'SUPPORT FIRST' : strength.classification === 'strong' ? 'CHANNEL STRENGTH' : 'SEEK BALANCE';
  const postureNote = strength.classification === 'weak'
    ? 'Favorable support before added demand'
    : strength.classification === 'strong'
      ? 'Use Output, Wealth, or Officer to direct force'
      : 'Read useful elements through season and structure';
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
  const currentAssessment = timingAssessment(currentInteractions, {
    ...guidance,
    annualElement: charElement(currentGanzhi[0]),
  });
  const currentPosture = currentAssessment.supportScore >= currentAssessment.pressureScore + 3
    ? 'Favorable'
    : currentAssessment.supportScore > currentAssessment.pressureScore
      ? 'Moderately Favorable'
      : currentAssessment.pressureScore >= currentAssessment.supportScore + 3
        ? 'Unfavorable'
        : currentAssessment.pressureScore > currentAssessment.supportScore
          ? 'Moderately Unfavorable'
          : 'Neutral';
  const pillarNames = input.hour_known === false ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'hour'];
  const hiddenGodLocations = (wanted) => pillarNames.flatMap((name) =>
    (HIDDEN_STEMS[pillars[name]?.branch] || []).map((stem) => ({
      name,
      branch: pillars[name]?.branch,
      stem,
      god: tenGodDisplay(dayStem, stem),
    })).filter((item) => wanted.includes(item.god))
  );
  const officerLocations = hiddenGodLocations(['Direct Officer', 'Seven Killings']);
  const directOfficerLocations = officerLocations.filter((item) => item.god === 'Direct Officer');
  const sevenKillingsLocations = officerLocations.filter((item) => item.god === 'Seven Killings');
  const wealthLocations = hiddenGodLocations(['Direct Wealth', 'Indirect Wealth']);
  const listLocations = (items, includeGod = true) => items.map((item) =>
    `${includeGod ? `${item.god} in ` : ''}the ${item.name} Branch ${item.branch} through hidden stem ${item.stem}`
  ).join('; ') || 'none';
  const compactLocations = (items) => {
    const groups = [...items.reduce((map, item) => {
      const key = `${item.branch}|${item.stem}`;
      const current = map.get(key) || { ...item, names: [] };
      current.names.push(item.name[0].toUpperCase() + item.name.slice(1));
      map.set(key, current);
      return map;
    }, new Map()).values()];
    return groups.map((item) => `${item.names.join(' and ')} branches ${item.branch} through hidden ${item.stem} ${elementDisplay(charElement(item.stem))}`).join('; ') || 'none';
  };
  const sourceDescription = (item) => item.visible > 0 && item.hidden > 0
    ? 'visible and hidden'
    : item.visible > 0 ? 'visible only' : 'hidden only';
  const canonicalTenGodBody = `The Ten Gods are calculated from the ${dayStem} Day Master. Visible and hidden sources are kept separate. The weighted profile is ${tenGodEnergy.filter((item) => item.score > 0).map((item) => `${item.english} ${item.score}%, ${sourceDescription(item)}`).join('; ')}.

Visible values use the full non-Day stem weight for their pillar. Hidden values use the canonical hidden stems and the stated branch split. Percentages use largest-remainder rounding and total 100%.

Companion describes same-element agency and peers. Output is produced by the Day Master. Wealth is controlled by the Day Master. Officer controls the Day Master. Resource produces the Day Master. These functional categories remain distinct even when their English names share a word.`;
  const resourcePct = tenGodEnergy.filter((item) => ['Direct Resource', 'Indirect Resource'].includes(item.english)).reduce((sum, item) => sum + item.score, 0);
  const officerPct = tenGodEnergy.filter((item) => ['Direct Officer', 'Seven Killings'].includes(item.english)).reduce((sum, item) => sum + item.score, 0);
  const canonicalCareerBody = `The Day Master is ${strength.label}. The weighted Ten-God model places Resource at ${resourcePct}% and Officer functions at ${officerPct}%. Seven Killings appears in the ${compactLocations(sevenKillingsLocations)}. Direct Officer appears in the ${compactLocations(directOfficerLocations)}.

Resource supports research, documentation, preparation, and the ability to turn complexity into a usable system. Officer functions add standards, responsibility, review, and pressure handling. This combination is most useful when responsibility is matched by sufficient learning time, clear authority, and dependable support.

Possible real-world expressions include specialist analysis, research, quality control, documentation, regulated work, or roles that translate rules into decisions. This is a traditional occupational indication, not a guaranteed title or employer.`;
  const canonicalWealthBody = `For the ${dayStem} Day Master, Earth is Wealth. The Day Master is ${strength.label}, so sustained Wealth activity should be evaluated against available Resource and Companion support. Canonical Wealth locations are ${listLocations(wealthLocations)}. Wealth is what the Day Master controls, and Earth Wealth generates Metal Officer.

The structure favors examining whether an opportunity can be carried repeatedly, not only whether it is attractive at first. Hidden Fire Output can generate Earth Wealth, but hidden Output is less externally available than a visible stem and should not be treated as guaranteed monetization.

Possible real-world expressions include noticing opportunities before operating capacity is ready, or accepting commitments whose maintenance cost exceeds their return. This does not establish income, profit, debt, or investment results.`;
  const spouseBranch = pillars.day?.branch || '';
  const spouseHidden = (HIDDEN_STEMS[spouseBranch] || []).map((stem) => `${stem} ${tenGodDisplay(dayStem, stem)}`).join(', ');
  const canonicalRelationshipBody = `Under the supplied female-chart convention, the partner-star functions are Direct Officer and Seven Killings. They are hidden rather than visible in the non-Day stems. Direct Officer appears in ${compactLocations(directOfficerLocations)}. Seven Killings appears in ${compactLocations(sevenKillingsLocations)}. The Spouse Palace is Branch ${spouseBranch}, with hidden stems ${spouseHidden || 'none recorded'}.

Hidden partner-star functions can make relationship themes less explicit at first, while repetition involving the Day Branch can increase emphasis on commitment, boundaries, stability, or family expectations. Useful observation focuses on how expectations are stated, how responsibility is shared, and whether boundaries remain workable under pressure.

Possible expressions include attraction to competence or decisiveness, but age difference, distance, relocation, and a partner's occupation are not established by this structure.`;
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
  <title>Tengyunzi BaZi Destiny Book ${escapeHtml(reportCode)} - V12</title>
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
        <span>BAZI LIFE PATTERN BOOK</span>
        <h1>Your BaZi<br>Destiny Book</h1>
        <p>A structured analysis generated from calculated chart data, traceable relationships, and defined timing rules.</p>
      </div>
      <div class="cover-orbit" aria-hidden="true"><i></i><i></i><i></i><strong>CHART</strong></div>
      <dl class="cover-meta">
        <div><dt>Birth profile</dt><dd>${escapeHtml(birthDate)}<br>${input.hour_known === false ? 'Time unknown' : `${String(input.hour).padStart(2, '0')}:00`} · ${escapeHtml(String(input.gender || 'Gender not supplied'))}<br>${escapeHtml(input.timezone || 'Time zone not supplied')}</dd></div>
        <div><dt>Chart</dt><dd>${escapeHtml(input.bazi_str)}</dd></div>
        <div><dt>Book number</dt><dd>${escapeHtml(reportCode)} · V11<br>${escapeHtml(generated)}</dd></div>
      </dl>
      <footer><span>TENGYUNZI</span><span>PERSONAL FOUR PILLARS READING</span></footer>
    </section>

    <section class="pdf-page overview" data-page>
      <div class="page-topline"><span>NATAL MODEL</span><span>PERSONAL EDITION</span></div>
      <header class="overview-head"><div><span>CALCULATED CHART SYNOPSIS</span><h2>${overviewTitle}</h2></div><p>${escapeHtml(overviewText)}</p></header>
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
            : `The recorded birth time is ${String(input.hour).padStart(2, '0')}:00. All four pillars are included. Birthplace: ${escapeHtml(input.birthplace || 'not provided')}. Solar-time correction: ${input.birthplace ? 'calculation input available' : 'not applied without birthplace data'}.`}</p>
        </div>
        <div class="signal-panel four-up">
          <div><span>DAY MASTER</span><strong class="wx-${dayElement}">${escapeHtml(dayStem)}</strong><small>${STEMS.indexOf(dayStem) % 2 === 0 ? 'Yang' : 'Yin'} ${elementDisplay(dayElement)}</small></div>
          <div><span>LEADING FUNCTION</span><strong>${escapeHtml(tenGodEnergy[0]?.english || '-')}</strong><small>${tenGodEnergy[0]?.score || 0}% weighted profile</small></div>
          <div><span>CURRENT CYCLE</span><strong>${escapeHtml(currentLuck?.gz || '甲子')}</strong><small>${currentLuck ? `${currentLuck.year}-${currentLuck.year + 9}` : 'Timing not supplied'}</small></div>
          <div><span>BALANCING DIRECTION</span><strong>${posture}</strong><small>${postureNote}</small></div>
        </div>
        <div class="executive-priorities">
          <div><span>01 / SEASON & DAY MASTER</span><strong>${escapeHtml(dayStem)} ${escapeHtml(elementDisplay(dayElement))} in ${escapeHtml(pillars.month?.branch || '?')} season</strong><p>${dayElementRoots.length ? `Rooted in ${[...new Set(dayElementRoots)].join(', ')}; strength is judged through season, roots, support, drains, and control.` : 'No same-element branch root; support is judged from the remaining stems and hidden roots.'}</p></div>
          <div><span>02 / STRUCTURAL MODEL</span><strong>${escapeHtml(tenGodEnergy[0]?.english || 'Ten-God structure')} leads at ${tenGodEnergy[0]?.score || 0}%</strong><p>Derived from visible stems and weighted hidden stems, then read within the complete natal structure.</p></div>
          <div><span>03 / TIMING MODEL</span><strong>${currentYear} ${escapeHtml(currentGanzhi)} · ${escapeHtml(currentPosture)}</strong><p>The annual reading compares the current year with the natal chart and active Luck Pillar; it does not stand alone.</p></div>
        </div>
        <div class="confidence-key"><span><b>CALCULATED</b> direct chart or timing data</span><span><b>SUPPORTED</b> structural interpretation</span><span><b>CONTEXTUAL</b> compare with lived circumstances</span></div>
      </div>
      <footer><span>TENGYUNZI / BAZI LIFE PATTERN BOOK</span><span data-page-number></span></footer>
    </section>

    <section class="pdf-page energy-page" data-page>
      <div class="page-topline"><span>FIVE-ELEMENT MODEL</span><span>NATAL DISTRIBUTION</span></div>
      <header><span>VISIBLE ELEMENT PROFILE</span><h2>${profileTitle}</h2><p>This page counts visible Heavenly Stems and Branch base elements. It is not the weighted Ten-God model. Hidden stems are examined separately in the written judgment.</p></header>
      <div class="energy-layout">
        <div class="chart radar-chart" id="element-radar"></div>
        <div class="chart bars-chart" id="element-bars"></div>
      </div>
      <div class="energy-legend">${elementLegend}</div>
      <footer><span>TENGYUNZI / BAZI LIFE PATTERN BOOK</span><span data-page-number></span></footer>
    </section>

    ${tenGodTablePage(tenGodEnergy)}

    ${shenShaTablePage(shenShaEnergy)}

    <section class="pdf-page contents" data-page>
      <div class="page-topline"><span>CONTENTS</span><span>STRUCTURED READING ORDER</span></div>
      <header><h2>The order of this Destiny Book</h2><p>${ENGLISH_BAZI_REPORT_SECTION_COUNT} connected chapters, moving from the governing pattern and explicit element verdict to life domains, Luck Cycles, and annual ratings.</p></header>
      <ol>${toc}</ol>
      <footer><span>TENGYUNZI / BAZI LIFE PATTERN BOOK</span><span data-page-number></span></footer>
    </section>

    ${sections.flatMap((section) => section.number === 11
      ? [timingPage(input, luck, pillars, currentYear), sectionPage(section, sectionContext)]
      : [sectionPage(section, sectionContext)]).join('\n')}

    <section class="pdf-page methodology" data-page>
      <div class="page-topline"><span>METHOD</span><span>CALCULATION & READING LIMITS</span></div>
      <div class="method-layout">
        <div><h2>Calculation basis<br>and reading limits</h2><p>This report was generated by Tengyunzi's AI interpretation system from calculated chart data. It is not represented as a report written personally by Tengyunzi.</p><p>The report follows standard BaZi order: season and Day Master strength first, then Five Elements, Ten Gods, chart structure, life topics, and timing. Interpretation remains conditional rather than a guarantee of events. ${input.hour_known === false
          ? 'Because the birth hour is unknown, no Hour Pillar conclusions are included.'
          : `The recorded birth time of ${String(input.hour).padStart(2, '0')}:00 is included, so the Hour Pillar is part of the structural analysis.`}</p></div>
        <dl>
          <div><dt>01</dt><dd><strong>Birth input</strong><span>Gregorian civil date · ${escapeHtml(input.timezone || 'timezone not supplied')} · ${input.birthplace ? escapeHtml(input.birthplace) : 'birthplace not supplied'}</span></dd></div>
          <div><dt>02</dt><dd><strong>Chart source</strong><span>Four Pillars and Luck Pillars supplied by the Tengyunzi calculation engine; solar-time correction is not applied without birthplace data.</span></dd></div>
          <div><dt>03</dt><dd><strong>Ten-God weighting</strong><span>Pillar weights: Year 0.85, Month 1.35, Day 1.00, Hour 0.90. Visible non-Day stems receive the full pillar weight. Hidden stems receive that pillar weight multiplied by 100% for a single hidden stem, 70/30 for two stems, or 60/30/10 for three stems. Displayed percentages use largest-remainder rounding to total 100%.</span></dd></div>
          <div><dt>04</dt><dd><strong>Shen Sha scope</strong><span>Supported canonical markers only. They remain secondary to Day Master, Five Elements, and Ten-God structure.</span></dd></div>
        </dl>
      </div>
      <div class="disclaimer"><strong>Important</strong><p>This report is for educational and reflective purposes. It is not medical, legal, financial, or mental-health advice, and it does not guarantee future events.</p></div>
      <footer><span>TENGYUNZI / BAZI LIFE PATTERN BOOK</span><span data-page-number></span></footer>
    </section>

    <section class="pdf-page closing" data-page>
      <div class="closing-mark">TZ</div>
      <div class="closing-copy"><span>END OF READING</span><h2>One natal chart.<br>A changing flow of time.</h2><p>Keep this Destiny Book with your verified birth data. Revisit the Da Yun and Liu Nian chapters when the active Luck Cycle or calendar year changes.</p></div>
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
