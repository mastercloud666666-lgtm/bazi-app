// supabase/functions/analyze/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier,
  consumeRateLimit,
  corsHeaders,
  extractClientIp,
  isAllowedRequestOrigin,
  isLikelyAutomatedUa,
  maskIp,
  recordAbuseLog,
  resolveAllowedOrigins,
  tooManyRequestsResponse,
} from '../_shared/security.ts';
import {
  analyzeAnnualInteractions,
  analyzeNatalInteractions,
  assessClassicalSpecialPattern,
  assessDayMasterStrength,
  balancingElementGuidance,
  charPolarity,
  elementProfile as canonicalElementProfile,
  luckDirection as canonicalLuckDirection,
  shenShaForChart,
  tenGod,
  tenGodEnglish,
  timingAssessment,
  timingPosture,
  tombStorageContacts,
  traditionalReferenceProfile,
  weightedTenGodProfile,
} from '../_shared/bazi-rules.mjs';
import {
  ENGLISH_BAZI_REPORT_SECTION_COUNT,
  ENGLISH_BAZI_REPORT_SECTIONS,
  ENGLISH_BAZI_REPORT_WORD_RANGE,
  englishBaziBlueprint,
} from '../_shared/english-report-structure.mjs';
import { deduplicateReportSections } from '../_shared/report-quality.mjs';
import { resolveModelRole } from '../_shared/model-roles.mjs';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS_FREE = 8;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS_PAID = 24;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS_PER_TRADE = 10;

function readEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(String(Deno.env.get(name) || '').trim());
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(Math.floor(raw), min), max);
}

function chineseDigitsToNumber(input: string): number {
  const raw = String(input || '').trim();
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);

  const digitMap: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };

  let total = 0;
  let current = 0;
  for (const ch of raw) {
    if (ch === '百') {
      total += (current || 1) * 100;
      current = 0;
    } else if (ch === '十') {
      total += (current || 1) * 10;
      current = 0;
    } else if (ch in digitMap) {
      current = digitMap[ch];
    }
  }
  return total + current;
}

function parseSectionNumber(raw: string): number {
  const input = String(raw || '').trim();
  if (!input) return 0;
  if (/^\d+$/.test(input)) return Number(input);

  const map: Record<string, number> = {
    零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
  };
  if (input === '十') return 10;
  const tenPos = input.indexOf('十');
  if (tenPos >= 0) {
    const left = input.slice(0, tenPos);
    const right = input.slice(tenPos + 1);
    const leftNum = left ? (map[left] ?? 0) : 1;
    const rightNum = right ? (map[right] ?? 0) : 0;
    return leftNum * 10 + rightNum;
  }
  return map[input] ?? 0;
}

function normalizeSectionMarkers(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/(?:^|\s+)(?:Section|section)\s*(\d{1,2})\s*[:：]\s*/g, '\n第$1段：')
    .replace(/(?:^|\s+)第\s*([0-9一二三四五六七八九十零〇两]{1,4})\s*段\s*[:：]\s*/g, '\n第$1段：')
    .trim();
}

function localizeBaziSectionMarkers(text: string, lang: unknown): string {
  if (lang !== 'en') return text;
  return String(text || '').replace(
    /第([0-9一二三四五六七八九十零〇两]{1,4})段：/g,
    (_match, rawNumber: string) => `Section ${parseSectionNumber(rawNumber)}: `,
  );
}

function countReportSections(text: string): number {
  const normalized = normalizeSectionMarkers(text);
  if (!normalized) return 0;
  const pattern = /第([0-9一二三四五六七八九十零〇两]{1,4})段：/g;
  let maxSection = 0;
  let match: RegExpExecArray | null = null;
  while ((match = pattern.exec(normalized))) {
    const numeric = parseSectionNumber(match[1] || '');
    if (Number.isFinite(numeric) && numeric > maxSection) maxSection = numeric;
  }
  return maxSection;
}

function buildSectionRangeConstraint(sectionStart: number, sectionEnd: number): string {
  return `\n\n范围约束：只输出第${sectionStart}段到第${sectionEnd}段。必须从“第${sectionStart}段：”开始，写完“第${sectionEnd}段：”后立即结束。不得重复，不得预告，不得总结范围外内容。若字数紧张，可适度压缩单段，但绝不能跳段。`;
}

function clipBaziReportByTier(text: string, maxSection: number): string {
  const normalized = normalizeSectionMarkers(text);
  if (!normalized) return '';
  const lines = normalized.split('\n');
  const result: string[] = [];
  let currentSection = 0;
  let foundAnySection = false;
  for (const rawLine of lines) {
    const line = String(rawLine || '');
    const marker = line.match(/^\s*第([0-9一二三四五六七八九十零〇两]{1,4})段：/);
    if (marker) {
      foundAnySection = true;
      currentSection = parseSectionNumber(marker[1] || '');
    }
    if (!foundAnySection || (currentSection > 0 && currentSection <= maxSection)) {
      result.push(line);
    }
  }
  return result.join('\n').trim();
}

function getVipRangeMaxTokens(sectionStart: number, sectionEnd: number): number {
  const count = Math.max(1, sectionEnd - sectionStart + 1);
  return Math.min(7000, 1400 + count * 560);
}

const BAZI_SECTION_BLUEPRINT_24 = `
Master section blueprint for paid BAZI personality report（这是一份基于传统五行文化的性格分析报告，聚焦帮助对方了解自己；不做命运预测、吉凶判断、具体年份运势或改运，全程以性格特质与自我认知为核心）:
第1段：五行核心力量（最主导你性格的五行力量）
第2段：五行平衡结构（性格中的张力与平衡点）
第3段：十神结构与性格底层驱动力（必须点名主要十神、所在位置、强弱层次及具体行为含义）
第4段：天赋与优势画像
第5段：适合的工作风格（性格适配的工作方式与发展路径，不预测具体时间）
第6段：价值创造方式（你更擅长用哪种方式创造价值）
第7段：适合的领域方向（最能发挥你优势的领域类型）
第8段：独立与协作倾向
第9段：情感相处倾向
第10段：关系相处说明书
第11段：情感中的自我模式（你在亲密关系里容易重复的模式）
第12段：原生家庭影响
第13段：家庭角色倾向
第14段：人际互动风格
第15段：神煞结构与特质符号解读（必须逐项使用权威数据中列出的神煞、所在柱和判定来源，不得自行增加）
第16段：内在张力结构（地支关系反映的性格协调与冲突面）
第17段：性格中的空缺感（从空亡视角看内心课题）
第18段：资源与安全感倾向（你对资源与安全感的态度，不预测财富多寡）
第19段：成长阶段的性格侧重（不同人生阶段被放大的性格面，描述性格倾向而非预测事件）
第20段：成长节奏参考（不同阶段的自我侧重与成长课题，不做逐年运势预测）
第21段：需要留意的性格盲点（容易消耗你的行为模式与思维惯性）
第22段：性格成长的关键课题
第23段：自我提升建议（从工作方式、生活习惯、人际选择给出实用建议，不涉及改运）
第24段：人生核心课题总结
`;

const BAZI_STANDARD_BLUEPRINT_EN = `
Master section blueprint for the paid English BaZi Life Pattern Book. This is a cohesive traditional BaZi life reading, not a personality test, psychotherapy report, or collection of disconnected symbolic definitions.
${englishBaziBlueprint()}
`;

type BaziGroundTruth = {
  allowedGanzhi: string[];
  gender: string;
  hourKnown: boolean;
  elementRoles: Record<string, string>;
  stemCounts: Record<string, number>;
  branchCounts: Record<string, number>;
  elementPresence: Record<string, string>;
  luckDirection: 'Forward' | 'Reverse';
  luckBasis: string;
  startAge: number;
  luckPillars: Array<{ gz: string; age: number; year: number }>;
  currentYear: number;
  pillars: Record<string, { stem: string; branch: string }>;
  dayMasterStem: string;
  rootBranches: string[];
  strength: {
    classification: 'strong' | 'balanced' | 'weak' | 'unknown';
    label: string;
    ratio: number | null;
    supportScore: number;
    pressureScore: number;
    seasonRole: string;
    rootBranches: string[];
  };
  specialPattern: {
    pattern: string;
    label: string;
    qualified: boolean;
    classicalPriority: boolean;
    evidence: string[];
    disqualifiers: string[];
    elementGuidance: {
      favorable: string[];
      conditional: string[];
      caution: string[];
      stronglyUnfavorable: string[];
      explanation: string;
    } | null;
    classicalBasis: {
      work: string;
      chapter: string;
      verse: string;
      verseEnglish: string;
      application: string;
      sourceNoteEnglish: string;
      attributionStatus: string;
    } | null;
  };
};

const GANZHI_SOURCE = '[\u7532\u4e59\u4e19\u4e01\u620a\u5df1\u5e9a\u8f9b\u58ec\u7678][\u5b50\u4e11\u5bc5\u536f\u8fb0\u5df3\u5348\u672a\u7533\u9149\u620c\u4ea5]';
const STEM_ELEMENTS: Record<string, string> = {
  '\u7532': 'Wood', '\u4e59': 'Wood',
  '\u4e19': 'Fire', '\u4e01': 'Fire',
  '\u620a': 'Earth', '\u5df1': 'Earth',
  '\u5e9a': 'Metal', '\u8f9b': 'Metal',
  '\u58ec': 'Water', '\u7678': 'Water',
};
const BRANCH_ELEMENTS: Record<string, string> = {
  '\u5b50': 'Water', '\u4e11': 'Earth',
  '\u5bc5': 'Wood', '\u536f': 'Wood',
  '\u8fb0': 'Earth', '\u5df3': 'Fire',
  '\u5348': 'Fire', '\u672a': 'Earth',
  '\u7533': 'Metal', '\u9149': 'Metal',
  '\u620c': 'Earth', '\u4ea5': 'Water',
};
const ELEMENTS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
const BAZI_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BAZI_PILLAR_NAMES = ['year', 'month', 'day', 'hour'];
const HIDDEN_STEMS: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};
const TEN_GOD_ENGLISH: Record<string, string> = {
  比肩: 'Companion', 劫财: 'Rob Wealth', 食神: 'Eating God', 伤官: 'Hurting Officer',
  偏财: 'Indirect Wealth', 正财: 'Direct Wealth', 七杀: 'Seven Killings', 正官: 'Direct Officer',
  偏印: 'Indirect Resource', 正印: 'Direct Resource',
};
const SHEN_SHA_STANDARD_SCOPE: Record<string, string> = {
  天乙贵人: 'traditionally marks access to assistance, mediation, or timely support',
  文昌贵人: 'traditionally marks study, writing, examination, and document-related capacity',
  禄神: 'traditionally marks salary, office, rank, or material support connected with the Day Stem',
  羊刃: 'traditionally marks a concentrated same-element force that requires structural control',
  桃花: 'traditionally marks visibility, attraction, and social contact',
  驿马: 'traditionally marks movement, travel, relocation, or changing operational conditions',
  华盖: 'traditionally marks specialist study, art, religion, or work carried out with independence',
  将星: 'traditionally marks command, organization, and responsibility',
  红鸾: 'traditionally marks relationship or ceremonial activation',
  天喜: 'traditionally marks celebration, union, or favorable social occasions',
};
const PRODUCES: Record<string, string> = {
  Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood',
};
const CONTROLS: Record<string, string> = {
  Wood: 'Earth', Fire: 'Metal', Earth: 'Water', Metal: 'Wood', Water: 'Fire',
};

function tenGodName(dayStem: string, otherStem: string): string {
  const dayIndex = BAZI_STEMS.indexOf(dayStem);
  const otherIndex = BAZI_STEMS.indexOf(otherStem);
  if (dayIndex < 0 || otherIndex < 0) return '';
  const relation = (Math.floor(otherIndex / 2) - Math.floor(dayIndex / 2) + 5) % 5;
  const samePolarity = dayIndex % 2 === otherIndex % 2;
  if (relation === 0) return samePolarity ? '比肩' : '劫财';
  if (relation === 1) return samePolarity ? '食神' : '伤官';
  if (relation === 2) return samePolarity ? '偏财' : '正财';
  if (relation === 3) return samePolarity ? '七杀' : '正官';
  return samePolarity ? '偏印' : '正印';
}

function chartPillars(raw: unknown): Record<string, Record<string, unknown>> {
  const chart = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const source = chart.pillars && typeof chart.pillars === 'object' && !Array.isArray(chart.pillars)
    ? chart.pillars as Record<string, unknown>
    : {};
  return Object.fromEntries(BAZI_PILLAR_NAMES.map((name) => [name,
    source[name] && typeof source[name] === 'object' && !Array.isArray(source[name])
      ? source[name] as Record<string, unknown>
      : {},
  ]));
}

function formatEnglishTenGodFacts(raw: unknown, hourKnown: boolean): string {
  const pillars = chartPillars(raw);
  const dayStem = String(pillars.day?.stem || '').trim();
  if (!dayStem) return 'Ten-God structure: unavailable';
  const names = hourKnown ? BAZI_PILLAR_NAMES : BAZI_PILLAR_NAMES.slice(0, 3);
  const signatures: string[] = [];
  for (const name of names) {
    const stem = String(pillars[name]?.stem || '').trim();
    if (name !== 'day' && stem) {
      const god = tenGodName(dayStem, stem);
      if (god) {
        signatures.push(`${name} stem ${stem}=${TEN_GOD_ENGLISH[god]}`);
      }
    }
  }
  const canonicalPillars = Object.fromEntries(names.map((name) => [name, {
    stem: String(pillars[name]?.stem || ''),
    branch: String(pillars[name]?.branch || ''),
  }]));
  const ranked = weightedTenGodProfile(canonicalPillars)
    .filter((item: Record<string, unknown>) => Number(item.percentage || 0) > 0)
    .map((item: Record<string, unknown>) => `${item.english}=${item.percentage}% [visible ${Number(item.visible || 0).toFixed(2)}, hidden ${Number(item.hidden || 0).toFixed(2)}]`);
  const elements = canonicalElementProfile(canonicalPillars);
  const dayElement = STEM_ELEMENTS[dayStem] || '';
  const rootBranches = names
    .map((name) => String(pillars[name]?.branch || ''))
    .filter((branch) => (HIDDEN_STEMS[branch] || []).some((stem) => STEM_ELEMENTS[stem] === dayElement));
  const presence = Object.entries(elements.presence)
    .map(([element, state]) => `${element}=${String(state).replaceAll('_', ' ')}`)
    .join(', ');
  return [
    `Day Master stem: ${dayStem}`,
    `Visible Ten-God signatures: ${signatures.join('; ') || 'none outside the Day Master'}`,
    `Canonical weighted Ten-God profile: ${ranked.join(', ') || 'unavailable'}`,
    `Element presence check (visible versus hidden): ${presence}`,
    `Day Master rooting check: ${rootBranches.length ? `${dayStem} has same-element roots in ${[...new Set(rootBranches)].join(', ')}` : `${dayStem} has no same-element root in the supplied Earthly Branches`}`,
  ].join('\n');
}

function formatEnglishShenShaFacts(raw: unknown, hourKnown: boolean): string {
  const rows = shenShaForChart(chartPillars(raw), { hourKnown });
  if (!rows.length) return 'Canonical symbolic stars (Shen Sha): none of the supported major markers are present in the supplied pillars.';
  return `Canonical symbolic stars (Shen Sha):\n${rows.map((item) => `${item.pillar} pillar ${item.branch}: ${item.english}, derived from ${item.source}`).join('\n')}`;
}

function formatEnglishTraditionalReferenceFacts(raw: unknown, gender: string, hourKnown: boolean): string {
  const pillars = chartPillars(raw);
  const profile = traditionalReferenceProfile(pillars, { gender, hourKnown });
  const pillarRows = Object.entries(profile.pillarSymbolism).map(([name, value]: [string, any]) =>
    `${name} pillar: stem family symbols=${value.stem.family.join('/')}; branch family symbols=${value.branch.family.join('/')}; stem body=${value.stem.body.join('/')}; branch body=${value.branch.body.join('/')}; palace=${value.palace.join('/')}`,
  );
  const voidRows = profile.void.affected.map((item: Record<string, unknown>) =>
    `${item.pillar} branch ${item.branch} (${(item.roles as string[]).join('/') || 'unclassified role'})`,
  );
  const rooted = profile.exposureAndRooting
    .filter((item: Record<string, unknown>) => item.referenceMultiplier === '>2')
    .map((item: Record<string, unknown>) => item.element);
  const tenGodDomains = Object.entries(profile.tenGodSymbolism).map(([role, value]: [string, any]) =>
    `${role}: people=${value.people.join('/')}; matters=${value.matters.join('/')}; body=${value.body.join('/')}; places=${value.places.join('/')}`,
  );
  const fiveGhost = profile.fiveGhostWealth
    ? `month branch ${profile.fiveGhostWealth.monthBranch} uses target ${profile.fiveGhostWealth.targetBranch}; placements=${profile.fiveGhostWealth.placements.map((item: Record<string, unknown>) => item.pillar).join(', ') || 'none'}`
    : 'unavailable';
  const yuanChen = profile.yuanChen
    ? `target ${profile.yuanChen.branch}; basis=${profile.yuanChen.basis}; placements=${profile.yuanChen.placements.map((item: Record<string, unknown>) => item.pillar).join(', ') || 'none'}`
    : 'unavailable';
  const resourceOutput = profile.indirectResourceOvercomesEatingGod.present
    ? `symbolic contact detected (${profile.indirectResourceOvercomesEatingGod.sourceElement} over ${profile.indirectResourceOvercomesEatingGod.targetElement}); bodily or event prediction prohibited`
    : 'not detected';
  return `Supplied Tengyunzi symbolic-reference layer:
${pillarRows.join('\n')}
Day-Pillar Xun Kong: ${profile.void.voidBranches.join(' and ') || 'unavailable'}; affected placements: ${voidRows.join('; ') || 'none'}.
Elements both exposed and rooted under the supplied comparative reference: ${rooted.join(', ') || 'none'}.
Traditional Ten-God domain candidates:
${tenGodDomains.join('\n')}
Five Ghost Wealth auxiliary marker: ${fiveGhost}.
Yuan Chen auxiliary marker: ${yuanChen}.
Indirect Resource-over-Eating God reference: ${resourceOutput}.
These are symbolic reference candidates only. They are not verified biography, medical findings, or guaranteed events.`;
}

function formatEnglishAnnualInteractionFacts(
  raw: unknown,
  dayunText: string,
  currentYear: number,
  hourKnown: boolean,
): string {
  const pillars = chartPillars(raw);
  const luck = String(dayunText || '').split('|').map((item) => {
    const match = item.trim().match(/^(\S+) from age (\d+) \((\d+)\)$/);
    return match ? { gz: match[1], year: Number(match[3]) } : null;
  }).filter(Boolean) as Array<{ gz: string; year: number }>;
  const rows = Array.from({ length: 5 }, (_, offset) => currentYear + offset).map((year) => {
    const annualGz = ganzhiForYear(year);
    const active = luck.find((item) => item.year <= year && item.year + 9 >= year);
    const relations = analyzeAnnualInteractions({
      annualGz,
      natalPillars: pillars,
      luckGz: active?.gz || '',
      hourKnown,
    });
    const tombContacts = tombStorageContacts({ incomingBranch: annualGz[1], natalPillars: pillars, hourKnown });
    const evidence = relations.length
      ? relations.map((item: Record<string, unknown>) => {
        const transformation = item.transformation && typeof item.transformation === 'object'
          ? ' [associated element only; transformation not proven]'
          : '';
        return `${item.label} ${item.source}-${item.target} [${item.scope}${item.pillar ? ` ${item.pillar}` : ''}]${transformation}`;
      }).join('; ')
      : 'no supported major contact';
    const tombEvidence = tombContacts.length
      ? `; tomb-storage contacts: ${tombContacts.map((item: Record<string, unknown>) => `${item.incomingBranch}-${item.tombBranch} ${item.contactType} [contact only]`).join(', ')}`
      : '';
    return `${year} ${annualGz}; active Luck Pillar ${active?.gz || 'not supplied'}; ${evidence}${tombEvidence}`;
  });
  return `Canonical annual interactions for the next five years:\n${rows.join('\n')}`;
}

function tenGodElementRoles(dayMasterElement: string): Record<string, string> {
  if (!ELEMENTS.includes(dayMasterElement)) return {};
  const roles: Record<string, string> = {};
  for (const element of ELEMENTS) {
    if (element === dayMasterElement) roles[element] = 'Companion';
    else if (PRODUCES[dayMasterElement] === element) roles[element] = 'Output';
    else if (CONTROLS[dayMasterElement] === element) roles[element] = 'Wealth';
    else if (CONTROLS[element] === dayMasterElement) roles[element] = 'Officer';
    else if (PRODUCES[element] === dayMasterElement) roles[element] = 'Resource';
  }
  return roles;
}

function chartDayMasterElement(raw: unknown): string {
  const chart = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const pillars = chart.pillars && typeof chart.pillars === 'object' && !Array.isArray(chart.pillars)
    ? chart.pillars as Record<string, unknown>
    : {};
  const day = pillars.day && typeof pillars.day === 'object' && !Array.isArray(pillars.day)
    ? pillars.day as Record<string, unknown>
    : {};
  return STEM_ELEMENTS[String(day.stem || '').trim()] || '';
}

function chartPositionElementCounts(raw: unknown, hourKnown: boolean): {
  stemCounts: Record<string, number>;
  branchCounts: Record<string, number>;
} {
  const chart = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const pillars = chart.pillars && typeof chart.pillars === 'object' && !Array.isArray(chart.pillars)
    ? chart.pillars as Record<string, unknown>
    : {};
  const stemCounts = Object.fromEntries(ELEMENTS.map((element) => [element, 0]));
  const branchCounts = Object.fromEntries(ELEMENTS.map((element) => [element, 0]));
  const names = hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day'];
  for (const name of names) {
    const pillar = pillars[name] && typeof pillars[name] === 'object' && !Array.isArray(pillars[name])
      ? pillars[name] as Record<string, unknown>
      : {};
    const stemElement = STEM_ELEMENTS[String(pillar.stem || '').trim()];
    const branchElement = BRANCH_ELEMENTS[String(pillar.branch || '').trim()];
    if (stemElement) stemCounts[stemElement] += 1;
    if (branchElement) branchCounts[branchElement] += 1;
  }
  return { stemCounts, branchCounts };
}

function ganzhiForYear(year: number): string {
  const stems = ['\u7532', '\u4e59', '\u4e19', '\u4e01', '\u620a', '\u5df1', '\u5e9a', '\u8f9b', '\u58ec', '\u7678'];
  const branches = ['\u5b50', '\u4e11', '\u5bc5', '\u536f', '\u8fb0', '\u5df3', '\u5348', '\u672a', '\u7533', '\u9149', '\u620c', '\u4ea5'];
  const offset = ((year - 1984) % 60 + 60) % 60;
  return `${stems[offset % 10]}${branches[offset % 12]}`;
}

function collectGanzhi(...values: unknown[]): string[] {
  const found = new Set<string>();
  for (const value of values) {
    const matches = String(value || '').match(new RegExp(GANZHI_SOURCE, 'g')) || [];
    matches.forEach((item) => found.add(item));
  }
  return Array.from(found);
}

function formatEnglishChartFacts(raw: unknown, hourKnown: boolean): string {
  const chart = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const pillars = chart.pillars && typeof chart.pillars === 'object' && !Array.isArray(chart.pillars)
    ? chart.pillars as Record<string, unknown>
    : {};
  const elements = chart.elements && typeof chart.elements === 'object' && !Array.isArray(chart.elements)
    ? chart.elements as Record<string, unknown>
    : {};
  const pillarValue = (name: string) => {
    const value = pillars[name] && typeof pillars[name] === 'object' && !Array.isArray(pillars[name])
      ? pillars[name] as Record<string, unknown>
      : {};
    const stem = String(value.stem || '').trim();
    const branch = String(value.branch || '').trim();
    return stem && branch
      ? `${stem}${branch} [${stem}=${STEM_ELEMENTS[stem] || 'unknown'}, ${branch}=${BRANCH_ELEMENTS[branch] || 'unknown'}]`
      : 'unknown';
  };
  const count = (name: string) => {
    const value = Number(elements[name]);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  };
  const dayMasterElement = chartDayMasterElement(raw);
  const roles = tenGodElementRoles(dayMasterElement);
  const positionCounts = chartPositionElementCounts(raw, hourKnown);
  const formattedCounts = (counts: Record<string, number>) => ELEMENTS
    .map((element) => `${element}=${counts[element] || 0}`)
    .join(', ');
  return [
    `Year Pillar: ${pillarValue('year')}`,
    `Month Pillar: ${pillarValue('month')}`,
    `Day Pillar: ${pillarValue('day')}`,
    `Hour Pillar: ${hourKnown ? pillarValue('hour') : 'unknown'}`,
    `Visible Five-Element counts: Wood=${count('wood')}, Fire=${count('fire')}, Earth=${count('earth')}, Metal=${count('metal')}, Water=${count('water')}`,
    `Visible stem counts by element: ${formattedCounts(positionCounts.stemCounts)}`,
    `Visible branch counts by element: ${formattedCounts(positionCounts.branchCounts)}`,
    'The combined Five-Element counts are not stem-only or branch-only counts. Never relabel a combined total as a number of stems or branches.',
    `Day Master element: ${dayMasterElement || 'unknown'}`,
    `Canonical Ten-God element roles: Companion=${Object.keys(roles).find((key) => roles[key] === 'Companion') || 'unknown'}, Output=${Object.keys(roles).find((key) => roles[key] === 'Output') || 'unknown'}, Wealth=${Object.keys(roles).find((key) => roles[key] === 'Wealth') || 'unknown'}, Officer=${Object.keys(roles).find((key) => roles[key] === 'Officer') || 'unknown'}, Resource=${Object.keys(roles).find((key) => roles[key] === 'Resource') || 'unknown'}`,
  ].join('\n');
}

function englishCount(value: string): number | null {
  const normalized = String(value || '').trim().toLowerCase();
  const named: Record<string, number> = {
    no: 0, zero: 0, one: 1, two: 2, three: 3, four: 4,
  };
  if (normalized in named) return named[normalized];
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return null;
}

function findPositionCountViolations(text: string, truth: BaziGroundTruth): string[] {
  const violations = new Set<string>();
  const pattern = /\b(no|zero|one|two|three|four|\d+)\s+(Wood|Fire|Earth|Metal|Water)\s+(stems?|branches?)\b/gi;
  let match: RegExpExecArray | null = null;
  while ((match = pattern.exec(text))) {
    const claimed = englishCount(match[1]);
    const element = `${match[2].slice(0, 1).toUpperCase()}${match[2].slice(1).toLowerCase()}`;
    const position = match[3].toLowerCase().startsWith('stem') ? 'stem' : 'branch';
    const actual = position === 'stem' ? truth.stemCounts[element] : truth.branchCounts[element];
    if (claimed !== null && actual !== undefined && claimed !== actual) {
      violations.add(`${claimed} ${element} ${position}s claimed; canonical count is ${actual}`);
    }
  }

  const sharedPattern = /\b(no|zero|one|two|three|four|\d+)\s+(Wood|Fire|Earth|Metal|Water)\s+stems?\s+(?:and|or)\s+branches?\b/gi;
  while ((match = sharedPattern.exec(text))) {
    const claimed = englishCount(match[1]);
    const element = `${match[2].slice(0, 1).toUpperCase()}${match[2].slice(1).toLowerCase()}`;
    const actual = truth.branchCounts[element];
    if (claimed !== null && actual !== undefined && claimed !== actual) {
      violations.add(`${claimed} ${element} branches claimed; canonical count is ${actual}`);
    }
  }
  return Array.from(violations);
}

function findTenGodClassificationViolations(text: string, truth: BaziGroundTruth): string[] {
  const violations = new Set<string>();
  const rolePattern = '(Companion|Output|Wealth|Officer|Resource)';
  const classificationVerb = '(?:is|acts as|functions as|serves as|represents|as)';
  const explicitElementPattern = new RegExp(`\\b(Wood|Fire|Earth|Metal|Water)\\b\\s+(?:element\\s+)?${classificationVerb}\\s+(?:your\\s+|the\\s+)?(?:Direct\\s+|Indirect\\s+)?${rolePattern}\\b`, 'gi');
  let match: RegExpExecArray | null = null;
  while ((match = explicitElementPattern.exec(text))) {
    const element = `${match[1].slice(0, 1).toUpperCase()}${match[1].slice(1).toLowerCase()}`;
    const role = `${match[2].slice(0, 1).toUpperCase()}${match[2].slice(1).toLowerCase()}`;
    if (truth.elementRoles[element] && truth.elementRoles[element] !== role) {
      violations.add(`${element} cannot be classified as ${role}; it is ${truth.elementRoles[element]}`);
    }
  }

  const ganzhiRolePattern = new RegExp(`(${GANZHI_SOURCE})[^.\\n]{0,70}\\b${classificationVerb}\\s+(?:your\\s+|the\\s+|a\\s+)?(?:Direct\\s+|Indirect\\s+)?${rolePattern}\\b`, 'gi');
  while ((match = ganzhiRolePattern.exec(text))) {
    const token = match[1];
    const element = STEM_ELEMENTS[token[0]] || '';
    const role = `${match[2].slice(0, 1).toUpperCase()}${match[2].slice(1).toLowerCase()}`;
    if (element && truth.elementRoles[element] && truth.elementRoles[element] !== role) {
      violations.add(`${token} (${element}) cannot be classified as ${role}; it is ${truth.elementRoles[element]}`);
    }
  }
  return Array.from(violations);
}

function findGroundTruthViolations(text: string, truth: BaziGroundTruth | null): string[] {
  if (!truth) return [];
  const allowed = new Set(truth.allowedGanzhi);
  const unexpected = collectGanzhi(text).filter((item) => !allowed.has(item));
  const violations = unexpected.length
    ? [`unsupported Ganzhi: ${unexpected.join(', ')}`]
    : [];
  if (!truth.hourKnown) {
    const hourClaim = String(text || '').match(new RegExp(`Hour Pillar[^.\\n]{0,120}(${GANZHI_SOURCE})`, 'i'));
    if (hourClaim) violations.push(`invented Hour Pillar: ${hourClaim[1]}`);
  }
  violations.push(...findPositionCountViolations(text, truth));
  violations.push(...findTenGodClassificationViolations(text, truth));
  const dayPillarAsMaster = String(text || '').match(new RegExp(`(${GANZHI_SOURCE})\\s+(?:is\\s+the\\s+|as\\s+the\\s+)?Day Master`, 'i'));
  if (dayPillarAsMaster) violations.push(`${dayPillarAsMaster[1]} is a pillar, not a Day Master; use its first stem only`);
  const absentPattern = /\b(Wood|Fire|Earth|Metal|Water)\b\s+(?:is|are|remains?|appears?)\s+(?:entirely|completely|totally)?\s*(?:absent|missing|nonexistent)\b/gi;
  let absentMatch: RegExpExecArray | null = null;
  while ((absentMatch = absentPattern.exec(String(text || '')))) {
    const key = absentMatch[1].toLowerCase();
    if (truth.elementPresence[key] && truth.elementPresence[key] !== 'not_present') {
      violations.push(`${absentMatch[1]} cannot be called absent; canonical presence is ${truth.elementPresence[key]}`);
    }
  }
  const noVisiblePattern = /\b(?:no|without)\s+visible\s+(Wood|Fire|Earth|Metal|Water)\b/gi;
  let noVisibleMatch: RegExpExecArray | null = null;
  while ((noVisibleMatch = noVisiblePattern.exec(String(text || '')))) {
    const key = noVisibleMatch[1].toLowerCase();
    if (truth.elementPresence[key] === 'visible') {
      violations.push(`${noVisibleMatch[1]} cannot be called not visible; canonical presence is visible`);
    }
  }
  const polarityPattern = /([甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥])[^.\n]{0,24}\b(?:is|are|both are)\s+(Yin|Yang)\b/gi;
  let polarityMatch: RegExpExecArray | null = null;
  while ((polarityMatch = polarityPattern.exec(String(text || '')))) {
    const actual = charPolarity(polarityMatch[1]);
    if (actual && actual !== polarityMatch[2].toLowerCase()) {
      violations.push(`${polarityMatch[1]} is ${actual}, not ${polarityMatch[2].toLowerCase()}`);
    }
  }
  const oppositeDirection = truth.luckDirection === 'Forward' ? 'reverse' : 'forward';
  const directionClaim = new RegExp(`\\b(?:Luck Pillars?|Da Yun)\\b[^.\\n]{0,100}\\b${oppositeDirection}(?:\\s+direction)?\\b`, 'i');
  if (directionClaim.test(String(text || ''))) {
    violations.push(`Luck Pillar direction cannot be ${oppositeDirection}; canonical direction is ${truth.luckDirection}`);
  }
  if (/\b(?:Li Qiu|Li Dong|days?[^.\n]{0,40}(?:birth|solar term)|distance (?:to|from|between)[^.\n]{0,40}(?:next|previous|preceding|solar term))\b|[立冬立秋冬至夏至]/i.test(String(text || ''))) {
    violations.push('unsupported solar-term starting-age calculation detail; only the supplied starting age may be stated');
  }
  if (/\b(?:forward|reverse) direction[^.\n]{0,100}\b(?:means|indicates|shows|creates|suggests)[^.\n]{0,100}\b(?:personality|contracting|expanding|introvert|extrovert|life pattern|life approach)\b/i.test(String(text || ''))) {
    violations.push('Luck Pillar direction is a sequencing rule and cannot be interpreted as a personality or life-style trait');
  }

  const relationPattern = /\b(Wood|Fire|Earth|Metal|Water)\b\s+(?:(?:can|will|normally|traditionally|directly)\s+)?(produces|generates|nourishes|controls)\s+(?:the\s+)?\b(Wood|Fire|Earth|Metal|Water)\b/gi;
  let relationMatch: RegExpExecArray | null = null;
  while ((relationMatch = relationPattern.exec(String(text || '')))) {
    const source = `${relationMatch[1][0].toUpperCase()}${relationMatch[1].slice(1).toLowerCase()}`;
    const verb = relationMatch[2].toLowerCase();
    const target = `${relationMatch[3][0].toUpperCase()}${relationMatch[3].slice(1).toLowerCase()}`;
    const expected = verb === 'controls' ? CONTROLS[source] : PRODUCES[source];
    if (expected && target !== expected) {
      violations.push(`${source} does not ${verb} ${target}; the canonical target is ${expected}`);
    }
  }
  if (/\bFire\b[^.\n]{0,45}\b(?:helps?|makes?|lets?)\b[^.\n]{0,30}\bWood\b[^.\n]{0,20}\b(?:grow|flourish|strengthen)\b/i.test(String(text || ''))) {
    violations.push('Fire is Wood Output and must not be described as generating or strengthening Wood');
  }
  if (/\bEarth\b[^.\n]{0,45}\bdrains?\b[^.\n]{0,35}\bWood\b[^.\n]{0,35}\bcontrol/i.test(String(text || ''))) {
    violations.push('Wood controls Earth; Earth must not be described as draining Wood by controlling it');
  }

  const rootingPattern = new RegExp(`(?:Day Master|${truth.dayMasterStem})[^.\\n]{0,80}\\b(?:has roots?|is rooted|takes root)\\b[^.\\n]{0,80}([子丑寅卯辰巳午未申酉戌亥])`, 'gi');
  let rootingMatch: RegExpExecArray | null = null;
  while ((rootingMatch = rootingPattern.exec(String(text || '')))) {
    if (!truth.rootBranches.includes(rootingMatch[1])) {
      violations.push(`${truth.dayMasterStem} has no same-element root in ${rootingMatch[1]}`);
    }
  }
  if (/\b(?:cold extremities|adrenal|joint stiffness|respiratory sensitivity|digestive sluggishness|severe illness|blood disorder|hormonal imbalance)\b/i.test(String(text || ''))) {
    violations.push('medical or symptom prediction detected; health content must remain non-diagnostic traditional correspondence');
  }
  if (/\b(?:low energy|slow digestion|strain (?:the )?(?:liver|lungs?|kidneys?|heart)|diet (?:that|which)|warm,? cooked foods?|avoid overexertion|body(?:'s)? energy may tend|respiratory system)\b/i.test(String(text || ''))) {
    violations.push('personalized symptom, organ-strain, or dietary prediction detected; health content must remain non-diagnostic traditional correspondence');
  }
  if (/\brepeated branch(?:es)?\b[^.\n]{0,60}\b(?:is|are|forms?|creates?|counts? as)\b[^.\n]{0,20}\bFu Yin\b/i.test(String(text || ''))) {
    violations.push('Fu Yin requires an exact repeated whole pillar, not a repeated branch alone');
  }
  const selfPunishmentPattern = /([子丑寅卯辰巳午未申酉戌亥])\s*[-–—]\s*\1[^.\n]{0,120}\bself[- ]punish(?:ment|ing)?\b/gi;
  let selfPunishmentMatch: RegExpExecArray | null = null;
  while ((selfPunishmentMatch = selfPunishmentPattern.exec(String(text || '')))) {
    if (!['辰', '午', '酉', '亥'].includes(selfPunishmentMatch[1])) {
      violations.push(`${selfPunishmentMatch[1]}-${selfPunishmentMatch[1]} is repetition, not one of the canonical self-punishments 辰辰, 午午, 酉酉, or 亥亥`);
    }
  }
  const branchSelfPunishmentPattern = /([子丑寅卯辰巳午未申酉戌亥])[^.\n]{0,180}\bself[- ]punish(?:ment|ing)?\b/gi;
  while ((selfPunishmentMatch = branchSelfPunishmentPattern.exec(String(text || '')))) {
    if (!['辰', '午', '酉', '亥'].includes(selfPunishmentMatch[1])) {
      violations.push(`${selfPunishmentMatch[1]} cannot be associated with self-punishment; canonical self-punishment is limited to 辰, 午, 酉, and 亥 repeats`);
    }
  }
  return violations;
}

function findEnglishReportStructureViolations(
  text: string,
  sectionStart = 1,
  sectionEnd = ENGLISH_BAZI_REPORT_SECTION_COUNT,
  requireComplete = true,
): string[] {
  const normalized = normalizeSectionMarkers(text);
  const violations: string[] = [];
  const wordCount = normalized.trim().split(/\s+/).filter(Boolean).length;
  const expectedCount = sectionEnd - sectionStart + 1;
  if (requireComplete && countReportSections(normalized) !== sectionEnd) {
    violations.push(`expected English BaZi sections through Section ${sectionEnd}`);
  }
  if (requireComplete && (wordCount < ENGLISH_BAZI_REPORT_WORD_RANGE.min || wordCount > ENGLISH_BAZI_REPORT_WORD_RANGE.max)) {
    violations.push(`complete English report word count ${wordCount} is outside ${ENGLISH_BAZI_REPORT_WORD_RANGE.min}-${ENGLISH_BAZI_REPORT_WORD_RANGE.max}`);
  }
  if (!requireComplete && (wordCount < expectedCount * 250 || wordCount > expectedCount * 800)) {
    violations.push(`Section ${sectionStart}-${sectionEnd} word count ${wordCount} is outside ${expectedCount * 250}-${expectedCount * 800}`);
  }
  for (const section of ENGLISH_BAZI_REPORT_SECTIONS.filter((item) => item.number >= sectionStart && item.number <= sectionEnd)) {
    const escapedTitle = section.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`第${section.number}段：\\s*${escapedTitle}(?:\\s|$)`, 'i');
    if (!pattern.test(normalized)) violations.push(`Section ${section.number} title must be "${section.title}"`);
  }
  if (sectionStart <= 2 && sectionEnd >= 2) {
    const sectionTwo = normalized.match(/第2段：[\s\S]*?(?=第3段：|$)/)?.[0] || '';
    if (!/\bfavorable\b/i.test(sectionTwo) || !/\bunfavorable\b/i.test(sectionTwo)) {
      violations.push('Section 2 must state explicit favorable and unfavorable Five Elements');
    }
  }
  if (/inner child|family imprint|growth lesson|personality test|psychological profile|self-development|reflection question|practical step|schedule one daily window|coaching/i.test(normalized)) {
    violations.push('retired psychology/self-development framing detected');
  }
  if (/SUPPORTED ADVANCE|SELECTIVE ADVANCE|HOLD & PROTECT|support score|pressure score|decision posture/i.test(normalized)) {
    violations.push('retired support/pressure timing vocabulary detected');
  }
  return violations;
}

function normalizeElementPresenceClaims(text: string, truth: BaziGroundTruth | null): string {
  if (!truth) return text;
  let normalized = String(text || '');
  for (const [element, state] of Object.entries(truth.elementPresence)) {
    const label = `${element.slice(0, 1).toUpperCase()}${element.slice(1)}`;
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const directAbsence = new RegExp(`\\b${escaped}\\s+(?:is|are|remains?|appears?)\\s+(?:entirely|completely|totally)?\\s*(?:absent|missing|nonexistent)\\b`, 'gi');
    const absenceOf = new RegExp(`\\b(?:the\\s+)?(?:complete\\s+|total\\s+)?absence\\s+of\\s+${escaped}\\b`, 'gi');
    if (state === 'hidden_only') {
      normalized = normalized
        .replace(directAbsence, `${label} is not visible but is present in the hidden stems`)
        .replace(absenceOf, `${label}'s hidden-only presence`);
    } else if (state === 'visible') {
      normalized = normalized
        .replace(directAbsence, `${label} is visibly present`)
        .replace(absenceOf, `${label}'s visible presence`);
    }
  }
  return normalized;
}

function replaceEnglishHealthSection(text: string, truth: BaziGroundTruth | null): string {
  if (!truth) return text;
  const normalized = normalizeSectionMarkers(String(text || ''));
  const start = normalized.indexOf('第10段：');
  if (start < 0) return normalized;
  const end = normalized.indexOf('第11段：', start);
  const profile = weightedTenGodProfile(truth.pillars, { hourKnown: truth.hourKnown }) as Array<Record<string, unknown>>;
  const elementShares = ['wood', 'fire', 'earth', 'metal', 'water'].map((element) => {
    const percentage = profile
      .filter((item) => item.element === element)
      .reduce((sum, item) => sum + Number(item.exactPercentage || 0), 0);
    const level = percentage === 0
      ? 'absent'
      : percentage < 5
        ? 'very low'
        : percentage < 15
          ? 'low'
          : percentage <= 35
            ? 'moderate'
            : 'highly concentrated';
    return { element, label: capitalizeElement(element), percentage, level };
  });
  const shareText = elementShares
    .map((item) => `${item.label} ${item.percentage.toFixed(1)}% (${item.level})`)
    .join('; ');
  const highest = [...elementShares].sort((a, b) => b.percentage - a.percentage)[0];
  const controlTarget: Record<string, string> = {
    wood: 'Earth',
    fire: 'Metal',
    earth: 'Water',
    metal: 'Wood',
    water: 'Fire',
  };
  const correspondence: Record<string, string> = {
    Wood: 'liver, gallbladder, eyes, and tendons',
    Fire: 'heart, small intestine, tongue, and blood vessels',
    Earth: 'spleen, stomach, mouth, and muscles',
    Metal: 'lungs, large intestine, nose, skin, and body hair',
    Water: 'kidneys, bladder, ears, and bones',
  };
  const rankedAttention = [...elementShares]
    .sort((a, b) => Math.abs(b.percentage - 20) - Math.abs(a.percentage - 20))
    .map((item) => `${item.label} (${item.percentage.toFixed(1)}%): ${correspondence[item.label]}`)
    .join('; ');
  const healthSection = `第10段：Traditional Five-Element Body Correspondences
This report's stated Ten-God weighting method gives the following relative Five-Element shares: ${shareText}. These percentages compare functions inside this chart; they are not physical-energy or medical measurements. Traditional BaZi treats both excess and deficiency as imbalance markers. A concentrated element makes its own correspondence group a primary attention area and can further restrain the element it controls; a very low or absent element marks a second form of imbalance.

The traditional correspondence order for attention is ${rankedAttention}. ${highest.label} is the most concentrated element at ${highest.percentage.toFixed(1)}%; it traditionally corresponds to the ${correspondence[highest.label]}. ${highest.label} controls ${controlTarget[highest.element]}, so the ${controlTarget[highest.element]} correspondence group is also examined as the system receiving the strongest elemental restraint. This is the required connection between amount, the generation-control chain, and the body correspondence; it is more specific than merely listing which elements appear.

Chart favorability and bodily balance are separate judgments. A favorable element is not medically better in unlimited quantity, and an unfavorable or absent element does not prove that its associated organs are unhealthy or that the reader should add that element. The order above identifies traditional attention areas only; it does not diagnose symptoms, disease, constitution, or a future health event. Personal health decisions should be based on qualified medical assessment rather than a BaZi chart.`;
  return `${normalized.slice(0, start)}${healthSection}${end >= 0 ? `\n\n${normalized.slice(end)}` : ''}`.trim();
}

function replaceEnglishSection(text: string, number: number, title: string, body: string, preserveOriginal = false): string {
  const normalized = normalizeSectionMarkers(text);
  const startMarker = `第${number}段：`;
  const start = normalized.indexOf(startMarker);
  if (start < 0) return normalized;
  const next = normalized.indexOf(`第${number + 1}段：`, start + startMarker.length);
  const original = normalized.slice(start + startMarker.length, next >= 0 ? next : normalized.length)
    .replace(/^[^\n]*\n?/, '')
    .trim();
  const retained = preserveOriginal && original ? `\n\n${original}` : '';
  const section = `${startMarker}${title}\n${body.trim()}${retained}`;
  return `${normalized.slice(0, start)}${section}${next >= 0 ? `\n\n${normalized.slice(next)}` : ''}`.trim();
}

function capitalizeElement(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : 'Unknown';
}

function relationEvidence(item: Record<string, unknown>): string {
  const singleLocation = item.scope === 'luck' && item.pillar === 'luck'
    ? 'active Luck Pillar'
    : `${item.scope} ${item.pillar}`;
  const pillars = Array.isArray(item.pillars) ? ` (${item.pillars.join(' and ')} pillars)` : item.pillar ? ` (${singleLocation})` : '';
  const result = item.resultingElement ? `, associated with ${capitalizeElement(String(item.resultingElement))}` : '';
  const source = String(item.source || '');
  const target = String(item.target || '');
  const contact = target.length > 1 && target.includes(source) ? target : `${source}-${target}`;
  return `${item.label}: ${contact}${pillars}${result}`;
}

function replaceEnglishElementSection(text: string, truth: BaziGroundTruth): string {
  const profile = canonicalElementProfile(truth.pillars, { hourKnown: truth.hourKnown });
  const tenGodProfile = weightedTenGodProfile(truth.pillars, { hourKnown: truth.hourKnown }) as Array<Record<string, unknown>>;
  const names = truth.hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day'];
  const hiddenRows = names.map((name) => {
    const pillar = truth.pillars[name];
    const hidden = (HIDDEN_STEMS[pillar?.branch] || []).map((stem) => `${stem} ${STEM_ELEMENTS[stem]} (${tenGodEnglish(tenGod(truth.dayMasterStem, stem))})`);
    return `${name[0].toUpperCase()}${name.slice(1)} Branch ${pillar?.branch || '?'} contains ${hidden.join(', ') || 'no recorded hidden stems'}`;
  });
  const visible = Object.entries(profile.visible).map(([element, count]) => `${capitalizeElement(element)} ${count}`).join(', ');
  const hiddenOnly = Object.entries(profile.presence).filter(([, state]) => state === 'hidden_only').map(([element]) => capitalizeElement(element));
  const absent = Object.entries(profile.presence).filter(([, state]) => state === 'not_present').map(([element]) => capitalizeElement(element));
  const tenGodText = tenGodProfile
    .filter((item) => Number(item.percentage) > 0)
    .map((item) => {
      const visible = Number(item.visible) > 0;
      const hidden = Number(item.hidden) > 0;
      const source = visible && hidden ? 'visible and hidden' : visible ? 'visible only' : 'hidden only';
      return `${item.english} ${item.percentage}% (${source})`;
    })
    .join('; ');
  const body = `The visible pillar layer contains ${visible}. These counts combine Heavenly Stems with the base element of each Earthly Branch; they are not stem-only counts. ${hiddenOnly.length ? `${hiddenOnly.join(', ')} ${hiddenOnly.length === 1 ? 'appears' : 'appear'} only in hidden stems.` : 'No element is limited to hidden stems.'} ${absent.length ? `${absent.join(', ')} ${absent.length === 1 ? 'is' : 'are'} not represented in the supplied chart.` : 'Every Five-Element category is represented either visibly or in hidden stems.'}

The canonical hidden stems are fixed by branch: ${hiddenRows.join('; ')}. A hidden stem is part of the branch structure but is less exposed than a Heavenly Stem. It must not be counted as an additional visible pillar, and it must not be invented from the branch's base element.

The weighted Ten-God profile is ${tenGodText}. These percentages measure relative emphasis inside the stated weighting method; they do not assign a percentage of the person's life. The leading Ten Gods identify the chart's dominant traditional functions - Companion, Output, Wealth, Officer, or Resource - and the later life-domain chapters must derive their judgments from this same ranking.

Visible emphasis and hidden structure answer different questions. Visible counts show what is directly present in the four pillars. Hidden stems show the internal composition through which Ten Gods, rooting, and seasonal command are assessed. A hidden stem can contribute to a Ten-God weighting or provide a root without becoming a visible stem. This chapter therefore establishes the full Five-Element and Ten-God energy structure used throughout the rest of the book.`;
  return replaceEnglishSection(text, 3, 'Five Elements, Ten Gods, and Energy Structure', body, true);
}

function replaceEnglishChartFoundationSections(text: string, truth: BaziGroundTruth): string {
  const names = truth.hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day'];
  const pillarLabels: Record<string, string> = {
    year: 'ancestry, early environment, and the wider social field',
    month: 'seasonal command, work structure, and the chart climate',
    day: 'the Day Master and Spouse Palace',
    hour: 'later-stage projects, output, and descendants',
  };
  const pillars = names.map((name) => `${name[0].toUpperCase()}${name.slice(1)} ${truth.pillars[name].stem}${truth.pillars[name].branch}`).join('; ');
  const repeats = analyzeNatalInteractions(truth.pillars, { hourKnown: truth.hourKnown })
    .filter((item: Record<string, unknown>) => item.type === 'fu_yin') as Array<Record<string, unknown>>;
  const sectionOne = `The calculated Four Pillars are ${pillars}. The Day Master is the Day Stem ${truth.dayMasterStem}, a ${charPolarity(truth.dayMasterStem) === 'yang' ? 'Yang' : 'Yin'} ${STEM_ELEMENTS[truth.dayMasterStem]} stem. The two-character Day Pillar is ${truth.pillars.day.stem}${truth.pillars.day.branch}; it must not be substituted for the one-character Day Master.

In standard BaZi, each position provides a different frame: ${names.map((name) => `${name[0].toUpperCase()}${name.slice(1)} represents ${pillarLabels[name]}`).join('; ')}. These are traditional chart positions, not verified biographical facts. The Month Branch is given priority when evaluating seasonal qi, while the Day Stem remains the reference point for Ten-God relationships.

${repeats.length ? `The natal chart contains exact whole-pillar repeats: ${repeats.map((item) => `${item.source} across ${(item.pillars as string[]).join(' and ')}`).join('; ')}. These are calculated Fu Yin contacts and are analyzed in Section 4.` : 'No exact whole-pillar repeat is present in the supplied pillars.'} The governing structural verdict is ${truth.specialPattern.qualified ? truth.specialPattern.label : `${truth.strength.label} under the ordinary Day-Master method`}. All later career, wealth, relationship, health-correspondence, Luck-Cycle, and annual conclusions must follow this same verdict rather than restarting the chart from a different assumption.`;
  let output = replaceEnglishSection(text, 1, 'Chart Structure and General Verdict', sectionOne, true);

  const monthBranch = truth.pillars.month.branch;
  const monthElement = BRANCH_ELEMENTS[monthBranch] || 'Unknown';
  const dayElement = STEM_ELEMENTS[truth.dayMasterStem] || 'Unknown';
  const roots = truth.rootBranches.length ? [...new Set(truth.rootBranches)].join(', ') : 'none';
  const resourceElement = Object.keys(truth.elementRoles).find((element) => truth.elementRoles[element] === 'Resource') || 'Unknown';
  const officerElement = Object.keys(truth.elementRoles).find((element) => truth.elementRoles[element] === 'Officer') || 'Unknown';
  const outputElement = Object.keys(truth.elementRoles).find((element) => truth.elementRoles[element] === 'Output') || 'Unknown';
  const wealthElement = Object.keys(truth.elementRoles).find((element) => truth.elementRoles[element] === 'Wealth') || 'Unknown';
  const specialPriorityText = truth.specialPattern.qualified
    ? `The classical special-pattern detector takes priority here: ${truth.specialPattern.label}. Its evidence is ${truth.specialPattern.evidence.join('; ')} Ordinary weak-Day-Master balancing is recorded only as a subsidiary calculation and must not be used to replace the special-pattern verdict.`
    : 'No supplied classical special pattern qualifies, so the ordinary strength assessment remains the working structural method.';
  const sectionTwo = `Seasonal qi is read from the Month Branch ${monthBranch}, whose base element is ${monthElement}. This report does not infer a lunar month number from the Gregorian birth month. For the ${truth.dayMasterStem} ${dayElement} Day Master, ${officerElement} is Officer and controls the Day Master, ${resourceElement} is Resource and produces it, ${outputElement} is Output and is produced by it, and ${wealthElement} is Wealth and is controlled by it.

The rooting check finds same-element roots in: ${roots}. ${truth.rootBranches.length ? `The Day Master can take root through the listed branches because their canonical hidden stems contain ${dayElement}.` : `None of the supplied branches contains a canonical hidden ${dayElement} stem, so the Day Master has no same-element branch root.`} Rooting is only one part of strength. Visible Resource stems, hidden Resource, seasonal control, Output drains, and Wealth expenditure must also be compared.

For this chart, the ordinary strength calculation records support ${truth.strength.supportScore.toFixed(2)}, drain-and-control pressure ${truth.strength.pressureScore.toFixed(2)}, and a result of ${truth.strength.label}. ${specialPriorityText} This describes chart structure, not the person's character.`;
  output = replaceEnglishSection(output, 2, 'Day Master, Pattern, and Favorable Elements', sectionTwo);
  return output;
}

function replaceEnglishTenGodAndStructureSections(text: string, truth: BaziGroundTruth): string {
  const guidance = balancingElementGuidance(
    String(STEM_ELEMENTS[truth.dayMasterStem] || '').toLowerCase(),
    truth.strength,
    truth.specialPattern,
  );
  const favorable = guidance.favorable.map(capitalizeElement).join(' and ') || 'none';
  const unfavorable = guidance.caution.map(capitalizeElement).join(' and ') || 'none';
  const conditional = guidance.conditional.map(capitalizeElement).join(' and ') || 'none';
  const resource = Object.keys(truth.elementRoles).find((element) => truth.elementRoles[element] === 'Resource') || 'Unknown';
  const outputElement = Object.keys(truth.elementRoles).find((element) => truth.elementRoles[element] === 'Output') || 'Unknown';
  const wealth = Object.keys(truth.elementRoles).find((element) => truth.elementRoles[element] === 'Wealth') || 'Unknown';
  const officer = Object.keys(truth.elementRoles).find((element) => truth.elementRoles[element] === 'Officer') || 'Unknown';
  const companion = Object.keys(truth.elementRoles).find((element) => truth.elementRoles[element] === 'Companion') || 'Unknown';

  const body = truth.specialPattern.qualified && truth.specialPattern.classicalBasis && truth.specialPattern.elementGuidance
    ? `The governing pattern is ${truth.specialPattern.label}. This special-pattern judgment takes priority over the ordinary Day-Master result recorded in Section 1. The chart qualifies because ${truth.specialPattern.evidence.join('; ')} Day-Master roots are recorded as facts, but roots alone do not cancel a qualified Follow-the-Child pattern.

The classical basis is introduced once here. ${truth.specialPattern.classicalBasis.sourceNoteEnglish} ${truth.specialPattern.classicalBasis.attributionStatus} In its chapter on following structures, the rule is translated as: “${truth.specialPattern.classicalBasis.verseEnglish}” In this rule, ${outputElement} Output is the child and ${wealth} Wealth is what the child produces. The quotation and source note are not repeated later in the book.

The verdict is explicit. Favorable elements are ${favorable}. ${outputElement} is favorable because it carries the governing current away from the Day Master, and ${wealth} is favorable because Output produces Wealth and completes that current. Unfavorable elements are ${unfavorable}. ${resource} Resource is the strongest unfavorable element because it controls Output and reverses the structure; ${officer} Officer is unfavorable because it conflicts with Output and redirects Wealth. ${conditional} is conditional: ${companion} can feed Output, but excess Companion can obstruct the current or compete for Wealth. These element judgments govern every later chapter.`
    : `No supplied classical special pattern qualifies, so the ordinary strength method governs this chart. The ${STEM_ELEMENTS[truth.dayMasterStem]} Day Master is ${truth.strength.label}; the judgment uses the Month Branch, canonical roots, visible and hidden Resource, Output drains, Wealth expenditure, and Officer control together.

Under this stated method, the favorable elements are ${favorable}; the unfavorable elements are ${unfavorable}; and ${conditional} is conditional. Favorable means the element performs the balancing or regulating function required by this chart. Unfavorable means it reinforces the chart's existing imbalance or adds the wrong type of control or drain. Conditional means its result depends on quantity, position, season, and whether a valid transformation occurs.

This is the report's definite Yong-Shen and Xi-Ji verdict under its declared method, not a list of candidates. Other classical schools may prioritize seasonal regulation differently, but this book does not switch methods between chapters. Career, wealth, relationship, Luck-Cycle, and annual judgments below all follow the favorable and unfavorable elements stated here.`;
  return replaceEnglishSection(text, 2, 'Day Master, Pattern, and Favorable Elements', body);
}

function replaceEnglishNatalSection(text: string, truth: BaziGroundTruth): string {
  const contacts = analyzeNatalInteractions(truth.pillars, { hourKnown: truth.hourKnown }) as Array<Record<string, unknown>>;
  const evidence = contacts.length ? contacts.map(relationEvidence).join('; ') : 'No canonical stem or branch contacts are present among the supplied natal pillars.';
  const fuYin = contacts.filter((item) => item.type === 'fu_yin');
  const reference = traditionalReferenceProfile(truth.pillars, { gender: truth.gender, hourKnown: truth.hourKnown });
  const voidAffected = reference.void.affected.map((item: Record<string, unknown>) => `${item.pillar} Branch ${item.branch}`).join(', ') || 'none';
  const body = `Natal interaction analysis compares the supplied pillar stems and branches directly. The calculated contacts are: ${evidence}.

Repeated stems and repeated branches are recorded separately from combinations, clashes, harms, breaks, punishments, and meetings. ${fuYin.length ? `This chart contains ${fuYin.length} exact whole-pillar repeat${fuYin.length === 1 ? '' : 's'}, so Fu Yin is present: ${fuYin.map((item) => `${item.source} across ${(item.pillars as string[]).join(' and ')}`).join('; ')}.` : 'No exact whole-pillar repeat is present, so Fu Yin is not assigned.'} Fu Yin here means an exact same Ganzhi pillar occurs in two natal positions. It does not by itself prove a fixed event, biography, or outcome.

The Day Pillar belongs to a Xun whose Void branches are ${reference.void.voidBranches.join(' and ') || 'not available'}. Affected natal placements are ${voidAffected}. Void is a secondary traditional modifier of availability or durability; it does not erase a branch or prove loss.

Each combination is recorded as a contact unless the canonical calculation explicitly confirms transformation. Repetition, Fu Yin, clash, harm, break, punishment, meeting, and Void remain distinct. Their interpretation follows the governing pattern and favorable-element verdict established in Section 2.`;
  return replaceEnglishSection(text, 4, 'Stem-Branch Relations, Repetition, and Void', body);
}

function replaceEnglishLifeTopicSections(text: string, truth: BaziGroundTruth): string {
  const profile = weightedTenGodProfile(truth.pillars, { hourKnown: truth.hourKnown }) as Array<Record<string, unknown>>;
  const pct = (name: string) => Number(profile.find((item) => item.name === name)?.percentage || 0);
  const resourcePct = pct('偏印') + pct('正印');
  const officerPct = pct('七杀') + pct('正官');
  const outputPct = pct('食神') + pct('伤官');
  const wealthPct = pct('偏财') + pct('正财');
  const outputElement = Object.keys(truth.elementRoles).find((element) => truth.elementRoles[element] === 'Output') || 'Unknown';
  const wealthElement = Object.keys(truth.elementRoles).find((element) => truth.elementRoles[element] === 'Wealth') || 'Unknown';
  const guidance = balancingElementGuidance(String(STEM_ELEMENTS[truth.dayMasterStem] || '').toLowerCase(), truth.strength, truth.specialPattern);
  const favorable = guidance.favorable.map(capitalizeElement).join(' and ') || 'none';
  const unfavorable = guidance.caution.map(capitalizeElement).join(' and ') || 'none';
  let output = text;
  const careerBody = `Career judgment follows the governing ${truth.specialPattern.qualified ? truth.specialPattern.label : truth.strength.label} structure. The weighted Ten-God distribution contains Output ${outputPct}%, Wealth ${wealthPct}%, Officer ${officerPct}%, and Resource ${resourcePct}%. Favorable elements are ${favorable}; unfavorable elements are ${unfavorable}.

The most suitable work is the work that lets the favorable Ten-God functions operate. ${truth.specialPattern.qualified ? `${outputElement} Output favors creation, communication, production, technical delivery, design, teaching, or any role that turns ability into a visible result. ${wealthElement} Wealth favors commerce, pricing, transactions, resource allocation, client ownership, and converting output into revenue.` : `The exact occupational emphasis follows the favorable elements above and the strongest Ten Gods in the weighted profile.`} The unsuitable route is one dominated by the unfavorable elements, especially when it blocks the chart's governing current rather than merely adding a manageable duty.

These are explicit traditional career modes, not a promise of a particular title or employer. Industry names are secondary; the operating function matters more.`;
  output = replaceEnglishSection(output, 7, 'Career and Best Modes of Development', careerBody, true);

  const wealthLocations: string[] = [];
  for (const name of truth.hourKnown ? BAZI_PILLAR_NAMES : BAZI_PILLAR_NAMES.slice(0, 3)) {
    if (name !== 'day' && truth.elementRoles[STEM_ELEMENTS[truth.pillars[name].stem]] === 'Wealth') wealthLocations.push(`${name} stem ${truth.pillars[name].stem}`);
    for (const stem of HIDDEN_STEMS[truth.pillars[name].branch] || []) {
      const god = tenGod(truth.dayMasterStem, stem);
      if (god === '偏财' || god === '正财') wealthLocations.push(`${name} Branch ${truth.pillars[name].branch} hidden stem ${stem} ${tenGodEnglish(god)}`);
    }
  }
  const wealthBody = `For the ${truth.dayMasterStem} Day Master, ${wealthElement} is Wealth. Wealth accounts for ${wealthPct}% of the weighted Ten-God profile and appears at ${wealthLocations.join('; ') || 'no visible or canonical hidden Wealth position'}. Hidden Wealth is structurally present but is not described as a visible stem or guaranteed money.

The financial path follows the same element verdict: ${favorable} is favorable and ${unfavorable} is unfavorable. ${truth.specialPattern.qualified ? `The central route is ${outputElement} Output producing ${wealthElement} Wealth. Income is therefore most coherent when knowledge, skill, communication, products, or delivery are converted into transactions and retained value.` : `${outputElement} Output can generate ${wealthElement} Wealth, but whether that pathway helps depends on the ordinary strength verdict in Section 2.`}

Luck Cycles and annual years can activate this route through Wealth, Output, or direct natal contacts. They do not guarantee income, investment return, debt, inheritance, or business success.`;
  output = replaceEnglishSection(output, 8, 'Wealth Structure and Financial Path', wealthBody, true);

  const spouse = truth.pillars.day;
  const spouseHidden = (HIDDEN_STEMS[spouse.branch] || []).map((stem) => `${stem} ${tenGodEnglish(tenGod(truth.dayMasterStem, stem))}`).join(', ');
  const dayContacts = (analyzeNatalInteractions(truth.pillars, { hourKnown: truth.hourKnown }) as Array<Record<string, unknown>>)
    .filter((item) => Array.isArray(item.pillars) ? (item.pillars as string[]).includes('day') : item.pillar === 'day')
    .map(relationEvidence);
  const female = /^f|女/i.test(truth.gender);
  const male = /^m|男/i.test(truth.gender);
  const partnerGods = female ? ['正官', '七杀'] : male ? ['正财', '偏财'] : [];
  const partnerLabel = female ? 'Direct Officer and Seven Killings' : male ? 'Direct Wealth and Indirect Wealth' : 'the partner-star convention selected by gender';
  const partnerPct = partnerGods.reduce((sum, god) => sum + pct(god), 0);
  const relationshipBody = `For this ${female ? 'female' : male ? 'male' : 'unspecified-gender'} chart, the traditional partner stars are ${partnerLabel}, accounting for ${partnerPct}% of the weighted profile. The Spouse Palace is the Day Branch ${spouse.branch}; its canonical hidden stems are ${spouseHidden || 'none recorded'}.

The exact natal contacts involving the Day Pillar or Day Branch are ${dayContacts.join('; ') || 'no supported direct contact'}. The favorable elements are ${favorable}; the unfavorable elements are ${unfavorable}. A partner-star or Spouse-Palace activation is favorable only when it agrees with the governing element current and does not become favorable merely because it concerns relationship symbolism.

Relationship timing compares the partner stars and Spouse Palace with each Luck Cycle and annual year. Combination, clash, repeat, harm, break, or punishment means activation, not automatic marriage or separation.`;
  return replaceEnglishSection(output, 9, 'Marriage and Intimate Relationships', relationshipBody, true);
}

function replaceEnglishDirectionSection(text: string, truth: BaziGroundTruth): string {
  const first = truth.luckPillars[0];
  const body = `The Luck Pillars (Da Yun) are sequenced in ${truth.luckDirection.toLowerCase()} order. The calculation basis is ${truth.luckBasis.toLowerCase()}. This is the standard gender and Year-Stem polarity rule used to choose the order of the ten-year pillars.

The supplied starting age is ${truth.startAge}. ${first ? `The first Luck Pillar is ${first.gz}, beginning at age ${first.age} in ${first.year}.` : 'The first Luck Pillar was not supplied.'} The full supplied sequence is ${truth.luckPillars.map((item) => `${item.gz} from age ${item.age} (${item.year})`).join(' | ') || 'not available'}. These ages and start years are treated as calculated inputs and are not reconstructed in this report.

Direction controls sequence only. Reverse does not mean a backward life, delayed development, or a need to revisit the past; forward does not mean automatic expansion. Likewise, the starting age does not establish maturity, childhood character, or the timing of a life event. It simply anchors the ten-year intervals shown in the timing table. Ages should be read with their stated start years, especially around a cycle boundary. Interpretation begins only after each calculated Luck Pillar is compared with the natal chart's season, Day Master, Ten Gods, and exact stem-branch contacts.`;
  return replaceEnglishSection(text, 12, 'Luck Pillar Direction and Starting Age', body);
}

function explicitTimingRating(assessment: Record<string, unknown>): string {
  const support = Number(assessment.supportScore || 0);
  const pressure = Number(assessment.pressureScore || 0);
  if (support >= pressure + 3) return 'Favorable';
  if (support > pressure) return 'Moderately Favorable';
  if (pressure >= support + 3) return 'Unfavorable';
  if (pressure > support) return 'Moderately Unfavorable';
  return 'Neutral';
}

function annualRows(truth: BaziGroundTruth): Array<{ year: number; gz: string; luck: string; god: string; rating: string; elementVerdict: string; reason: string; contacts: string }> {
  const guidance = balancingElementGuidance(
    String(STEM_ELEMENTS[truth.dayMasterStem] || '').toLowerCase(),
    truth.strength,
    truth.specialPattern,
  );
  return Array.from({ length: 5 }, (_, offset) => truth.currentYear + offset).map((year) => {
    const gz = ganzhiForYear(year);
    const luck = truth.luckPillars.find((item) => item.year <= year && item.year + 9 >= year)?.gz || '';
    const interactions = analyzeAnnualInteractions({ annualGz: gz, natalPillars: truth.pillars, luckGz: luck, hourKnown: truth.hourKnown }) as Array<Record<string, unknown>>;
    const god = tenGodEnglish(tenGod(truth.dayMasterStem, gz[0]));
    const assessment = timingAssessment(interactions, {
      ...guidance,
      annualElement: String(STEM_ELEMENTS[gz[0]] || '').toLowerCase(),
    });
    const annualElement = String(STEM_ELEMENTS[gz[0]] || '').toLowerCase();
    const elementVerdict = guidance.favorable.includes(annualElement)
      ? 'favorable'
      : guidance.caution.includes(annualElement)
        ? 'unfavorable'
        : 'conditional';
    return {
      year,
      gz,
      luck,
      god,
      rating: explicitTimingRating(assessment),
      elementVerdict,
      reason: assessment.postureReason,
      contacts: interactions.length ? interactions.map(relationEvidence).join('; ') : 'no supported major stem-branch contact',
    };
  });
}

function replaceEnglishLuckPillarsSection(text: string, truth: BaziGroundTruth): string {
  const guidance = balancingElementGuidance(String(STEM_ELEMENTS[truth.dayMasterStem] || '').toLowerCase(), truth.strength, truth.specialPattern);
  const rows = truth.luckPillars.map((item) => {
    const stemGod = tenGodEnglish(tenGod(truth.dayMasterStem, item.gz[0]));
    const hidden = (HIDDEN_STEMS[item.gz[1]] || []).map((stem) => `${stem} ${tenGodEnglish(tenGod(truth.dayMasterStem, stem))}`).join(', ');
    const contacts = analyzeAnnualInteractions({ annualGz: item.gz, natalPillars: truth.pillars, hourKnown: truth.hourKnown }) as Array<Record<string, unknown>>;
    const structuralContacts = contacts.length ? contacts.map(relationEvidence).join('; ') : 'no supported major contact with the natal pillars';
    const assessment = timingAssessment(contacts, { ...guidance, annualElement: String(STEM_ELEMENTS[item.gz[0]] || '').toLowerCase() });
    return `${item.gz}, ages ${item.age}-${item.age + 9} (${item.year}-${item.year + 9}) — ${explicitTimingRating(assessment)}. The stem maps to ${stemGod || 'an unclassified Ten God'}; the branch contains ${hidden || 'no recorded hidden stems'}. Exact natal contacts: ${structuralContacts}. Reason: ${assessment.postureReason}`;
  });
  const current = truth.luckPillars.find((item) => item.year <= truth.currentYear && item.year + 9 >= truth.currentYear);
  const first = truth.luckPillars[0];
  const body = `The calculated Luck Cycles (Da Yun) run in ${truth.luckDirection.toLowerCase()} order under the supplied rule: ${truth.luckBasis}. The starting age is ${truth.startAge}. ${first ? `The first cycle is ${first.gz}, beginning at age ${first.age} in ${first.year}.` : ''} ${current ? `At the report date, the active cycle is ${current.gz}, covering ${current.year}-${current.year + 9}.` : 'No active cycle could be matched to the report year.'}

${rows.join('\n\n')}

A Luck Cycle changes timing but does not replace the natal structure. Each rating follows the same favorable and unfavorable elements declared in Section 2 plus the exact contacts listed above.`;
  return replaceEnglishSection(text, 11, 'Ten-Year Luck Cycles', body);
}

function replaceEnglishTimingSections(text: string, truth: BaziGroundTruth): string {
  const rows = annualRows(truth);
  const annualBody = rows.map((row) => `${row.year} ${row.gz} — ${row.rating}. The annual stem is ${row.god || 'an unclassified Ten God'} and its element is ${row.elementVerdict} for this chart. The active Luck Cycle is ${row.luck || 'not supplied'}. Exact contacts: ${row.contacts}. Reason: ${row.reason}`).join('\n\n');
  let output = replaceEnglishSection(text, 12, 'Annual Reading: Next Five Years', `${annualBody}\n\nThe ratings are traditional structural judgments, not guaranteed events. Each is tied to the same governing pattern and element verdict used throughout this book.`);
  const guidance = balancingElementGuidance(String(STEM_ELEMENTS[truth.dayMasterStem] || '').toLowerCase(), truth.strength, truth.specialPattern);
  const profile = weightedTenGodProfile(truth.pillars, { hourKnown: truth.hourKnown }) as Array<Record<string, unknown>>;
  const leaders = profile.filter((item) => Number(item.percentage) > 0).slice(0, 3).map((item) => `${item.english} ${item.percentage}%`).join(', ');
  const summaryBody = `The governing verdict is ${truth.specialPattern.qualified ? truth.specialPattern.label : truth.strength.label}. Favorable elements are ${guidance.favorable.map(capitalizeElement).join(' and ') || 'none'}; unfavorable elements are ${guidance.caution.map(capitalizeElement).join(' and ') || 'none'}; conditional elements are ${guidance.conditional.map(capitalizeElement).join(' and ') || 'none'}. The leading Ten-God functions are ${leaders || 'not available'}.

Career should use the favorable functions named in Section 7. Wealth follows the route defined in Section 8. Relationship judgment follows the partner star, Spouse Palace, and the same element verdict in Section 9. The body-correspondence chapter remains a Five-Element balance reading and does not convert chart favorability into a medical conclusion.

The Luck-Cycle and annual ratings in Sections 11 and 12 are the final timing verdicts for the supplied period. They do not override the natal pattern and do not guarantee a specific event.`;
  output = replaceEnglishSection(output, 13, 'Final Synthesis', summaryBody);
  return output;
}

function applyDeterministicEnglishSections(text: string, truth: BaziGroundTruth | null): string {
  if (!truth) return text;
  let output = replaceEnglishChartFoundationSections(text, truth);
  output = replaceEnglishElementSection(output, truth);
  output = replaceEnglishTenGodAndStructureSections(output, truth);
  output = replaceEnglishNatalSection(output, truth);
  output = replaceEnglishLifeTopicSections(output, truth);
  output = replaceEnglishHealthSection(output, truth);
  output = replaceEnglishLuckPillarsSection(output, truth);
  output = replaceEnglishTimingSections(output, truth);
  return output;
}

function groundTruthCorrection(violations: string[]): string {
  return `\n\nGROUND-TRUTH CORRECTION (MANDATORY): The previous draft was rejected for ${violations.join('; ')}. Regenerate this section range from scratch. Copy chart and timing facts only from the canonical data block. Keep combined element totals separate from stem counts and branch counts. Do not introduce any Ganzhi pair that is not explicitly listed there. Follow the supplied Five-Element generation and control cycles exactly. Use the supplied Day Master rooting check exactly. If the birth hour is unknown, do not infer an Hour Pillar. For Section 10, state all five weighted element shares, identify excess and deficiency, connect the leading excess to the element it controls, and keep the content within non-diagnostic traditional correspondences. Do not predict symptoms or disease. For Section 11, state only the supplied direction, its gender/polarity rule, the supplied starting age, and the explicit rating for each Luck Cycle.`;
}

function cleanAnalysisText(rawAnalysis: string): string {
  let analysis = String(rawAnalysis || '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/^\s*[-–—>]\s*/gm, '')
    .replace(/由\s*DeepSeek\s*生成.*$/gis, '')
    .replace(/Powered by DeepSeek.*$/gis, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  analysis = normalizeSectionMarkers(analysis);

  const isPoemLine = (line: string) => {
    const t = line.trim();
    if (!t || t.includes('你') || t.length < 4) return false;
    return t.includes('；') ||
      /^[\u4e00-\u9fa5]{4,8}[，。][\u4e00-\u9fa5]{4,8}[，。！？]?$/.test(t) ||
      /[风云雷龙凤星月玉霞鹤雁花霜雪].{0,6}[；，。]/.test(t);
  };

  const lines = analysis.split('\n');
  while (lines.length && isPoemLine(lines[0])) lines.shift();
  while (lines.length) {
    const last = lines[lines.length - 1].trim();
    if (!last) {
      lines.pop();
      continue;
    }
    if (isPoemLine(last)) {
      lines.pop();
      continue;
    }
    break;
  }

  return lines.join('\n').trim();
}

async function requestDeepSeekCompletion(prompt: string, maxTokens: number, systemMessage: string) {
  const deepSeekKey = String(Deno.env.get('DEEPSEEK_API_KEY') || '').trim();
  const deepSeekModel = String(Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-v4-pro').trim();
  let deepSeekFailure = 'deepseek_not_configured';

  if (deepSeekKey) {
    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepSeekKey}`,
      },
      body: JSON.stringify({
        model: deepSeekModel,
        max_tokens: maxTokens,
        reasoning_effort: 'high',
        thinking: { type: 'enabled' },
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
      }),
    });
    if (dsRes.ok) {
      const dsData = await dsRes.json();
      const rawAnalysis = dsData.choices?.[0]?.message?.content || '';
      return { analysis: cleanAnalysisText(rawAnalysis), provider: 'deepseek' };
    }
    const errorText = await dsRes.text();
    deepSeekFailure = `deepseek_nonstream_failed_${dsRes.status}: ${errorText}`;
    console.warn('DeepSeek unavailable, trying Claude fallback', dsRes.status);
  }

  try {
    return await requestClaudeCompletion(prompt, maxTokens, systemMessage);
  } catch (error) {
    const claudeFailure = error instanceof Error ? error.message : String(error);
    throw new Error(`${deepSeekFailure}; ${claudeFailure}`);
  }
}

async function requestRunApiRoleCompletion(
  role: 'baziAnalysis' | 'classicsInterpreter' | 'englishWriter' | 'routineQA' | 'advancedQA',
  prompt: string,
  maxTokens: number,
  systemMessage: string,
  jsonMode = false,
) {
  const apiKey = String(Deno.env.get('RUNAPI_API_KEY') || '').trim();
  if (!apiKey) throw new Error('runapi_not_configured');
  const baseUrl = String(Deno.env.get('RUNAPI_BASE_URL') || 'https://runapi.co/v1').replace(/\/+$/, '');
  const config = resolveModelRole(role, (name: string) => Deno.env.get(name) || '');
  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: prompt },
    ],
  };
  if (config.reasoningEffort) body.reasoning_effort = config.reasoningEffort;
  if (typeof config.thinking === 'boolean') body.thinking = { type: config.thinking ? 'enabled' : 'disabled' };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`runapi_${role}_failed_${response.status}: ${errorText.slice(0, 500)}`);
  }
  const data = await response.json();
  const content = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!content) throw new Error(`runapi_${role}_empty_response`);
  return { analysis: cleanAnalysisText(content), provider: `runapi:${config.model}`, model: config.model };
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const normalized = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(normalized);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      const parsed = JSON.parse(normalized.slice(start, end + 1));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch (_nestedError) {
      return null;
    }
  }
}

async function requestClaudeCompletion(prompt: string, maxTokens: number, systemMessage: string) {
  const apiKey = String(Deno.env.get('CLAUDE_API_KEY') || '').trim();
  if (!apiKey) throw new Error('claude_not_configured');
  const model = String(Deno.env.get('CLAUDE_MODEL') || 'claude-sonnet-4-20250514').trim();
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.max(256, maxTokens),
      temperature: 0,
      system: systemMessage,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`claude_nonstream_failed_${response.status}: ${errorText}`);
  }
  const data = await response.json();
  const rawAnalysis = Array.isArray(data?.content)
    ? data.content.filter((item: Record<string, unknown>) => item?.type === 'text').map((item: Record<string, unknown>) => String(item?.text || '')).join('\n')
    : '';
  if (!rawAnalysis.trim()) throw new Error('claude_empty_response');
  return { analysis: cleanAnalysisText(rawAnalysis), provider: 'claude' };
}

// Cloudflare Turnstile 人机验证。未配置 TURNSTILE_SECRET 时跳过（不阻断）。
async function verifyTurnstile(token: unknown): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET');
  if (!secret) return true; // 尚未配置密钥，放行
  // 每天每IP一次：前端 24h 内不再带 token，此时放行；靠限流+UA拦截兜底。仅当带了 token 才校验真伪。
  if (!token || typeof token !== 'string') return true;
  try {
    const form = new URLSearchParams();
    form.append('secret', secret);
    form.append('response', token);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: form,
    });
    const d = await r.json().catch(() => ({ success: false }));
    return !!d.success;
  } catch (_e) {
    return false;
  }
}

function buildSseResponseFromText(
  text: string,
  corsHeadersValue: Record<string, string>,
  normalizeMarkers = true,
): Response {
  const normalized = normalizeMarkers ? normalizeSectionMarkers(String(text || '')) : String(text || '');
  const encoder = new TextEncoder();
  const lines = normalized.split('\n');
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        const payload = JSON.stringify({ choices: [{ delta: { content: `${line}\n` } }] });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      ...corsHeadersValue,
    },
  });
}

async function generatePaidBaziTierReport(
  prompt: string,
  systemMessage: string,
  tier: 'basic' | 'pro' | 'vip',
  groundTruth: BaziGroundTruth | null = null,
  sectionCount = 24,
): Promise<string> {
  const targetEnd = sectionCount === ENGLISH_BAZI_REPORT_SECTION_COUNT
    ? (tier === 'basic' ? 5 : (tier === 'pro' ? 10 : sectionCount))
    : (tier === 'basic' ? 8 : (tier === 'pro' ? 16 : sectionCount));
  const chunkSize = sectionCount === ENGLISH_BAZI_REPORT_SECTION_COUNT ? 5 : 8;
  const ranges: Array<[number, number]> = [];
  for (let start = 1; start <= targetEnd; start += chunkSize) {
    ranges.push([start, Math.min(targetEnd, start + chunkSize - 1)]);
  }
  const tierTokenCap = tier === 'basic' ? 4200 : (tier === 'pro' ? 6200 : 7000);

  const generateRange = async (start: number, end: number, extra = ''): Promise<string> => {
    const rangePrompt = prompt + buildSectionRangeConstraint(start, end) + `\nFor this range, keep each section between 400 and 600 English words. Prefer chart evidence over repetition.` + extra;
    const tokenLimit = Math.min(getVipRangeMaxTokens(start, end), tierTokenCap);
    const runApiEnabled = Boolean(String(Deno.env.get('RUNAPI_API_KEY') || '').trim());
    let confirmedAnalysis: Record<string, unknown> | null = null;
    if (runApiEnabled) {
      const analyst = await requestRunApiRoleCompletion(
        'baziAnalysis',
        `${rangePrompt}

You are the structural BaZi analyst, not the final writer. Return JSON only with:
- natal_thesis
- calculated_evidence_used
- structural_judgments
- life_topic_findings
- timing_findings
- confidence_and_limits
Do not recalculate or alter any supplied pillar, Ten-God percentage, interaction, Luck-Pillar range, annual score, or decision label.`,
        Math.min(tokenLimit, 5200),
        'Analyze only from the supplied deterministic chart facts. Preserve every number and relation exactly. Return valid JSON.',
        true,
      );
      confirmedAnalysis = parseJsonObject(analyst.analysis);
      if (!confirmedAnalysis) throw new Error('runapi_baziAnalysis_invalid_json');
    }
    const writerPrompt = confirmedAnalysis
      ? `${rangePrompt}

CONFIRMED STRUCTURAL ANALYSIS JSON:
${JSON.stringify(confirmedAnalysis)}

Write the requested English report sections as one continuous Life Pattern Book. Use the confirmed analysis as interpretation evidence, but copy all calculated facts only from the original supplied chart data. Do not expose JSON or internal workflow labels.`
      : rangePrompt;
    let pass = runApiEnabled
      ? await requestRunApiRoleCompletion('englishWriter', writerPrompt, tokenLimit, systemMessage)
      : await requestDeepSeekCompletion(rangePrompt, tokenLimit, systemMessage);
    pass.analysis = normalizeElementPresenceClaims(pass.analysis, groundTruth);
    pass.analysis = applyDeterministicEnglishSections(pass.analysis, groundTruth);

    if (runApiEnabled) {
      const qaResponse = await requestRunApiRoleCompletion(
        'routineQA',
        `Audit the report range below against the supplied source constraints. Check only numeric consistency, missing evidence, terminology, duplicate wording, empty punctuation, section conflict, English grammar, and format. Do not rewrite the report and do not invent BaZi conclusions.

REPORT RANGE:
${pass.analysis}

Return JSON only: {"issues":[{"severity":"P0|P1|P2","location":"...","problem":"...","repair_rule":"..."}],"requires_advanced_review":false}.`,
        1800,
        'You are a deterministic report QA checker. Return valid JSON only.',
        true,
      );
      const qa = parseJsonObject(qaResponse.analysis);
      const issues = Array.isArray(qa?.issues) ? qa.issues : [];
      if (issues.length && qa?.requires_advanced_review === true) {
        const advanced = await requestRunApiRoleCompletion(
          'advancedQA',
          `Resolve only the listed cross-section logic conflicts. Return repair instructions as JSON; do not rewrite the report.

ISSUES:
${JSON.stringify(issues)}

REPORT:
${pass.analysis}`,
          1800,
          'Review BaZi evidence chains without changing deterministic chart facts. Return valid JSON only.',
          true,
        );
        const repair = parseJsonObject(advanced.analysis);
        pass = await requestRunApiRoleCompletion(
          'englishWriter',
          `${writerPrompt}

REPAIR INSTRUCTIONS:
${JSON.stringify(repair || { issues })}

Rewrite only the requested section range and preserve every calculated fact and shared annual label.`,
          tokenLimit,
          systemMessage,
        );
        pass.analysis = normalizeElementPresenceClaims(pass.analysis, groundTruth);
        pass.analysis = applyDeterministicEnglishSections(pass.analysis, groundTruth);
      } else if (issues.some((item: Record<string, unknown>) => item?.severity === 'P0')) {
        pass = await requestRunApiRoleCompletion(
          'englishWriter',
          `${writerPrompt}

ROUTINE QA REPAIRS:
${JSON.stringify(issues)}

Rewrite only the requested range. Repair these issues without changing deterministic chart facts.`,
          tokenLimit,
          systemMessage,
        );
        pass.analysis = normalizeElementPresenceClaims(pass.analysis, groundTruth);
        pass.analysis = applyDeterministicEnglishSections(pass.analysis, groundTruth);
      }
    }
    let violations = findGroundTruthViolations(pass.analysis, groundTruth);
    if (sectionCount === ENGLISH_BAZI_REPORT_SECTION_COUNT) {
      violations.push(...findEnglishReportStructureViolations(pass.analysis, start, end, false));
    }
    if (violations.length) {
      pass = runApiEnabled
        ? await requestRunApiRoleCompletion('englishWriter', writerPrompt + groundTruthCorrection(violations), tokenLimit, systemMessage)
        : await requestDeepSeekCompletion(rangePrompt + groundTruthCorrection(violations), tokenLimit, systemMessage);
      pass.analysis = normalizeElementPresenceClaims(pass.analysis, groundTruth);
      pass.analysis = applyDeterministicEnglishSections(pass.analysis, groundTruth);
      violations = findGroundTruthViolations(pass.analysis, groundTruth);
      if (sectionCount === ENGLISH_BAZI_REPORT_SECTION_COUNT) {
        violations.push(...findEnglishReportStructureViolations(pass.analysis, start, end, false));
      }
      if (violations.length) {
        pass = runApiEnabled
          ? await requestRunApiRoleCompletion(
            'englishWriter',
            writerPrompt + groundTruthCorrection(violations) + '\nThis is the final repair attempt. Remove every rejected claim rather than paraphrasing it.',
            tokenLimit,
            systemMessage,
          )
          : await requestDeepSeekCompletion(
            rangePrompt + groundTruthCorrection(violations) + '\nThis is the final repair attempt. Remove every rejected claim rather than paraphrasing it.',
            tokenLimit,
            systemMessage,
          );
        pass.analysis = normalizeElementPresenceClaims(pass.analysis, groundTruth);
        pass.analysis = applyDeterministicEnglishSections(pass.analysis, groundTruth);
        violations = findGroundTruthViolations(pass.analysis, groundTruth);
        if (sectionCount === ENGLISH_BAZI_REPORT_SECTION_COUNT) {
          violations.push(...findEnglishReportStructureViolations(pass.analysis, start, end, false));
        }
        if (violations.length) {
          throw new Error(`report_ground_truth_validation_failed: ${violations.join('; ')}`);
        }
      }
    }
    return pass.analysis;
  };

  const generatedParts = await Promise.all(ranges.map(async ([start, end]) => ({
    start,
    analysis: await generateRange(start, end),
  })));
  const parts = generatedParts
    .sort((left, right) => left.start - right.start)
    .map((item) => item.analysis)
    .filter(Boolean);

  let combined = parts.join('\n\n').trim();
  const maxSection = countReportSections(combined);
  if (maxSection < targetEnd) {
    const repairStart = Math.max(1, maxSection + 1);
    const repairAnalysis = await generateRange(
      repairStart,
      targetEnd,
      `\n\nREPAIR CONSTRAINT: Earlier text ends at Section ${repairStart - 1}. Write only Sections ${repairStart}-${targetEnd}; do not repeat earlier sections.`,
    );
    combined = [combined, repairAnalysis].filter(Boolean).join('\n\n').trim();
  }

  const normalizedCombined = normalizeSectionMarkers(combined);
  const deduplicated = sectionCount === ENGLISH_BAZI_REPORT_SECTION_COUNT
    ? deduplicateReportSections(normalizedCombined)
    : { text: normalizedCombined, removed: [] };
  if (deduplicated.removed.length) {
    console.info('english_report_deduplicated', { removed_sentences: deduplicated.removed.length });
  }
  const finalReport = clipBaziReportByTier(deduplicated.text, targetEnd);
  const finalViolations = findGroundTruthViolations(finalReport, groundTruth);
  if (sectionCount === ENGLISH_BAZI_REPORT_SECTION_COUNT && targetEnd === ENGLISH_BAZI_REPORT_SECTION_COUNT) {
    finalViolations.push(...findEnglishReportStructureViolations(finalReport));
  }
  if (finalViolations.length) {
    throw new Error(`report_ground_truth_validation_failed: ${finalViolations.join('; ')}`);
  }
  return finalReport;
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  const CORS = corsHeaders(req, allowedOrigins);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  if (!isAllowedRequestOrigin(req, allowedOrigins)) {
    return new Response(JSON.stringify({
      error: 'origin_not_allowed',
      message: '非法来源请求已被拒绝。',
    }), {
      status: 403,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { trade_no, service = 'bazi', free_only, payment_option_id, stream, section_start, section_end, member_token } = body;

    const rateScope = `analyze:${String(service || 'bazi')}:${free_only ? 'free' : 'paid'}`;
    const rateWindowSeconds = readEnvNumber('RATE_LIMIT_ANALYZE_WINDOW_SECONDS', DEFAULT_RATE_LIMIT_WINDOW_SECONDS, 10, 3600);
    const rateMaxRequests = free_only
      ? readEnvNumber('RATE_LIMIT_ANALYZE_MAX_REQUESTS_FREE', DEFAULT_RATE_LIMIT_MAX_REQUESTS_FREE, 1, 200)
      : readEnvNumber('RATE_LIMIT_ANALYZE_MAX_REQUESTS_PAID', DEFAULT_RATE_LIMIT_MAX_REQUESTS_PAID, 2, 500);
    const rateIdentifier = await buildRateLimitIdentifier(req);
    const rateResult = await consumeRateLimit(supabase, {
      scope: rateScope,
      identifier: rateIdentifier,
      windowSeconds: rateWindowSeconds,
      maxRequests: rateMaxRequests,
    });
    const clientIpMasked = maskIp(extractClientIp(req));
    const userAgent = String(req.headers.get('user-agent') || '').slice(0, 240);
    const shouldBlockBotUa = Deno.env.get('SECURITY_BLOCK_BOT_UA_SENSITIVE') !== '0';
    if (!rateResult.allowed) {
      await recordAbuseLog(supabase, {
        scope: rateScope,
        identifier: rateIdentifier,
        event: 'rate_limited',
        meta: {
          ip_masked: clientIpMasked,
          current_count: rateResult.currentCount,
          max_requests: rateMaxRequests,
          window_seconds: rateWindowSeconds,
          free_only: Boolean(free_only),
          service: String(service || 'bazi'),
        },
      });
      return tooManyRequestsResponse(req, allowedOrigins, {
        message: free_only
          ? '免费解读请求过于频繁，请稍后再试。'
          : '报告生成请求过于频繁，请稍后再试。',
        retryAfterSeconds: rateResult.retryAfterSeconds,
        scope: rateScope,
        currentCount: rateResult.currentCount,
      });
    }

    if (shouldBlockBotUa && isLikelyAutomatedUa(userAgent)) {
      await recordAbuseLog(supabase, {
        scope: rateScope,
        identifier: rateIdentifier,
        event: 'blocked_bot_ua',
        meta: {
          ip_masked: clientIpMasked,
          ua: userAgent.slice(0, 160),
          free_only: Boolean(free_only),
          service: String(service || 'bazi'),
        },
      });
      return new Response(JSON.stringify({
        error: 'blocked_bot_ua',
        message: 'Automated client is not allowed for report generation.',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const serviceRoleToken = String(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
    const requestToken = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const isTrustedInternalCall = Boolean(
      (body as Record<string, unknown>).internal_call === true &&
      serviceRoleToken &&
      requestToken === serviceRoleToken
    );

    // 免费排盘需通过人机验证；由受信任的报告编排函数发起时已经完成邮箱身份校验。
    if (service === 'bazi' && free_only === true && !isTrustedInternalCall) {
      const tsOk = await verifyTurnstile((body as Record<string, unknown>).turnstile_token);
      if (!tsOk) {
        return new Response(JSON.stringify({ error: 'turnstile_failed', message: '人机验证未通过，请重试。' }), {
          status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
    }

    const tradeNoSafe = String(trade_no || '').trim();
    if (tradeNoSafe && /^(bazi|hepan)-[a-z0-9_-]{4,140}$/i.test(tradeNoSafe)) {
      const perTradeMaxRequests = readEnvNumber('RATE_LIMIT_ANALYZE_MAX_REQUESTS_PER_TRADE', DEFAULT_RATE_LIMIT_MAX_REQUESTS_PER_TRADE, 2, 200);
      const perTradeResult = await consumeRateLimit(supabase, {
        scope: `${rateScope}:trade`,
        identifier: tradeNoSafe,
        windowSeconds: rateWindowSeconds,
        maxRequests: perTradeMaxRequests,
      });
      if (!perTradeResult.allowed) {
        await recordAbuseLog(supabase, {
          scope: `${rateScope}:trade`,
          identifier: tradeNoSafe,
          event: 'rate_limited_trade',
          meta: {
            ip_masked: clientIpMasked,
            current_count: perTradeResult.currentCount,
            max_requests: perTradeMaxRequests,
            window_seconds: rateWindowSeconds,
            free_only: Boolean(free_only),
            service: String(service || 'bazi'),
          },
        });
        return tooManyRequestsResponse(req, allowedOrigins, {
          message: 'This order is being generated too frequently. Please retry shortly.',
          retryAfterSeconds: perTradeResult.retryAfterSeconds,
          scope: `${rateScope}:trade`,
          currentCount: perTradeResult.currentCount,
        });
      }
    }

    let prompt = '';
    let maxTokens = free_only ? 600 : 8192;
    let baziGroundTruth: BaziGroundTruth | null = null;
    let resolvedPaymentOptionId = typeof payment_option_id === 'string' ? payment_option_id : '';
    const requestedSectionStart = Number.isInteger(section_start) ? Number(section_start) : Number.parseInt(String(section_start || ''), 10);
    const requestedSectionEnd = Number.isInteger(section_end) ? Number(section_end) : Number.parseInt(String(section_end || ''), 10);
    const hasSectionRange =
      Number.isFinite(requestedSectionStart) &&
      Number.isFinite(requestedSectionEnd) &&
      requestedSectionStart >= 1 &&
      requestedSectionEnd >= requestedSectionStart;
    let tradeOrder: { paid?: boolean; birth_input?: string | null } | null = null;
    let tradeBirth: Record<string, any> = {};

    if (trade_no) {
      const { data } = await supabase
        .from('orders')
        .select('paid,birth_input')
        .eq('trade_no', trade_no)
        .maybeSingle();
      tradeOrder = data || null;
      if (tradeOrder?.birth_input) {
        try {
          tradeBirth = JSON.parse(tradeOrder.birth_input);
          if (!resolvedPaymentOptionId) {
            resolvedPaymentOptionId = tradeBirth?.payment_option?.id || '';
          }
        } catch (_) {
          tradeBirth = {};
        }
      }
    }

    // 会员校验：活跃会员可免付生成完整报告/合盘
    let isActiveMember = false;
    if (!free_only && (service === 'bazi' || service === 'hepan') && member_token) {
      try {
        const { data: { user } } = await supabase.auth.getUser(String(member_token));
        if (user) {
          const { data: mem } = await supabase
            .from('memberships').select('expires_at').eq('user_id', user.id).maybeSingle();
          isActiveMember = !!(mem?.expires_at && new Date(mem.expires_at).getTime() > Date.now());
        }
      } catch (_e) { isActiveMember = false; }
    }
    // 会员默认给完整版（vip）
    if (isActiveMember && !resolvedPaymentOptionId) resolvedPaymentOptionId = 'vip';

    const requiresPaidOrder = ((service === 'bazi' && !free_only) || service === 'hepan') && !isActiveMember;
    if (requiresPaidOrder) {
      if (!trade_no) {
        return new Response(JSON.stringify({ error: 'trade_no is required for paid analyze' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
      if (!tradeOrder) {
        return new Response(JSON.stringify({ error: 'order not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
      if (!tradeOrder.paid) {
        return new Response(JSON.stringify({ error: 'order not paid' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
    }

    if (service === 'qiming') {
      const { surname, birth_year, birth_month, birth_day, gender, wuxing_short, hope } = body;
      prompt = `客户姓氏：${surname}，生辰：${birth_year}年${birth_month}月${birth_day}日，${gender}，五行：${wuxing_short}，期望寓意：${hope || '无特殊要求'}。

帮这位客户推荐3个名字，每个名字说：
1. 名字写法
2. 读音和声调
3. 字义解释
4. 为什么适合这个五行（补缺或加强）
5. 整体寓意

要求：用口语，像朋友在帮你取名字一样，不要写标题符号，每个名字之间空一行，直接从第一个名字开始说。`;

    } else if (service === 'zhanbu') {
      const tsOk = await verifyTurnstile((body as Record<string, unknown>).turnstile_token);
      if (!tsOk) {
        return new Response(JSON.stringify({ error: 'turnstile_failed', message: '人机验证未通过，请重试。' }), {
          status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
      const { question, method, category, number1, number2, number3, ke_month, ke_day, ke_hour } = body;

      if (method === 'gaodao') {
        // 周易六十四卦：摇卦三次 -> 上卦(1-8)、下卦(1-8)、动爻(1-6)
        const ri = (max: number) => Math.floor(Math.random() * max) + 1;
        const n1 = Number(number1) || ri(8);
        const n2 = Number(number2) || ri(8);
        const n3 = Number(number3) || ri(6);
        // 先天八卦数 1..8 -> [名, 自下而上三爻 bottom,mid,top]
        const TRI: Record<number, [string, number[]]> = {
          1: ['乾', [1, 1, 1]], 2: ['兑', [1, 1, 0]], 3: ['离', [1, 0, 1]], 4: ['震', [1, 0, 0]],
          5: ['巽', [0, 1, 1]], 6: ['坎', [0, 1, 0]], 7: ['艮', [0, 0, 1]], 8: ['坤', [0, 0, 0]],
        };
        const bitsToName = (b: number, m: number, t: number): string =>
          ({ 7: '乾', 6: '兑', 5: '离', 4: '震', 3: '巽', 2: '坎', 1: '艮', 0: '坤' } as Record<number, string>)[b * 4 + m * 2 + t];
        const NAME64: Record<string, Record<string, string>> = {
          乾: { 乾: '乾为天', 兑: '天泽履', 离: '天火同人', 震: '天雷无妄', 巽: '天风姤', 坎: '天水讼', 艮: '天山遁', 坤: '天地否' },
          兑: { 乾: '泽天夬', 兑: '兑为泽', 离: '泽火革', 震: '泽雷随', 巽: '泽风大过', 坎: '泽水困', 艮: '泽山咸', 坤: '泽地萃' },
          离: { 乾: '火天大有', 兑: '火泽睽', 离: '离为火', 震: '火雷噬嗑', 巽: '火风鼎', 坎: '火水未济', 艮: '火山旅', 坤: '火地晋' },
          震: { 乾: '雷天大壮', 兑: '雷泽归妹', 离: '雷火丰', 震: '震为雷', 巽: '雷风恒', 坎: '雷水解', 艮: '雷山小过', 坤: '雷地豫' },
          巽: { 乾: '风天小畜', 兑: '风泽中孚', 离: '风火家人', 震: '风雷益', 巽: '巽为风', 坎: '风水涣', 艮: '风山渐', 坤: '风地观' },
          坎: { 乾: '水天需', 兑: '水泽节', 离: '水火既济', 震: '水雷屯', 巽: '水风井', 坎: '坎为水', 艮: '水山蹇', 坤: '水地比' },
          艮: { 乾: '山天大畜', 兑: '山泽损', 离: '山火贲', 震: '山雷颐', 巽: '山风蛊', 坎: '山水蒙', 艮: '艮为山', 坤: '山地剥' },
          坤: { 乾: '地天泰', 兑: '地泽临', 离: '地火明夷', 震: '地雷复', 巽: '地风升', 坎: '地水师', 艮: '地山谦', 坤: '坤为地' },
        };
        const uNum = ((n1 - 1) % 8 + 8) % 8 + 1; // 上卦先天数 1-8
        const lNum = ((n2 - 1) % 8 + 8) % 8 + 1; // 下卦先天数 1-8
        const dong = ((n3 - 1) % 6 + 6) % 6 + 1; // 动爻 1-6
        const [uName, uBits] = TRI[uNum];
        const [lName, lBits] = TRI[lNum];
        // 本卦自下而上六爻：下卦(1-3) + 上卦(4-6)
        const lines = [lBits[0], lBits[1], lBits[2], uBits[0], uBits[1], uBits[2]];
        const benName = NAME64[uName][lName];
        // 之卦：翻动第 dong 爻
        const zLines = lines.slice();
        zLines[dong - 1] = zLines[dong - 1] ? 0 : 1;
        const zLowerName = bitsToName(zLines[0], zLines[1], zLines[2]);
        const zUpperName = bitsToName(zLines[3], zLines[4], zLines[5]);
        const zhiName = NAME64[zUpperName][zLowerName];

        const outLang = (body as Record<string, unknown>).lang;
        if (outLang === 'en') {
          prompt = `The querent's question concerns "${category || 'general'}".
Question: ${question}

Cast: upper trigram ${uName}, lower trigram ${lName}; the moving line is line ${dong} (counting from the bottom).
Original hexagram: ${benName}　Moving line: ${dong}　Resulting hexagram: ${zhiName}

Interpret this casting in the style of Takashima Ekidan (高岛易断), following the thread "starting situation → cause of change → outcome". Be thorough; at least 1500 words, in FOUR clearly separated sections. Write the ENTIRE answer in natural, fluent English.

CRITICAL: Your very first sentence must be the heading of Section 1 below. Do NOT write any greeting, small talk, or restatement of the question. Begin the interpretation directly. Keep hexagram names as their Chinese characters with a short English gloss in parentheses, e.g. ${benName} (gloss).

1. The Original Hexagram — ${benName} — the starting situation
First quote the original Classical Chinese judgment text (卦辞) of ${benName} in quotation marks, and if helpful the 彖传 / 大象传, then translate and explain it line by line in English. Analyse how the upper trigram ${uName} and lower trigram ${lName} relate (generating or opposing) and what situation the hexagram describes. In Takashima's image-based reasoning (he read the hexagram image against real affairs and pointed directly to advance/retreat and fortune), explain the querent's fundamental present situation. Develop this section fully.

2. The Moving Line — line ${dong} — why and how change arises
Quote the original line text (爻辞) of line ${dong} in quotation marks, then translate and explain it line by line. Analyse the position of this line (correct/incorrect place, centrality, its relations with the lines above and below) and explain why the change happens precisely here — this is the pivot from the starting situation to the outcome. This is the core of the reading.

3. The Resulting Hexagram — ${zhiName} — where things finally head
Quote and translate the judgment text of ${zhiName}; explain how the original hexagram becomes this one through the moving line, compare the two, and state the direction and final tendency of the matter (the outcome).

4. Judgment & Advice
Combining starting situation → cause → outcome, give a firm, direct judgment in Takashima's voice (can it succeed or not; advance or hold; when it is favourable), then give three or more practical pieces of advice.

Quote the Classical Chinese source texts accurately. End with one separate line: "This is a traditional I Ching interpretation for reference only; please view it rationally and decide for yourself."`;
        } else {
          prompt = `客户所占之事属「${category || '综合'}」类。
客户问事：${question}

【起卦】以数起卦：上卦${uName}、下卦${lName}，动爻为第${dong}爻（自下而上数）。
本卦：${benName}　　变爻：第${dong}爻　　之卦：${zhiName}

请以「高岛易断」之法，按「原始 → 原因 → 结果」的脉络，层层为客户深入解此卦。要求详尽透彻，全文不少于 2000 字，分成清楚的四段，每段都先引《周易》原文（用引号标出），再逐句白话讲透。

【开头要求】第一句必须直接就是「一、原卦（本卦「${benName}」）——事情的原始格局」这一段的内容，绝对不要任何开场白、寒暄、问候、复述客户问题，也不要出现「好的」「我明白了」「我这就用高岛易断的法子」「为你把卦象一层层剥开」这类客套话，开门见山直接解卦。

一、原卦（本卦「${benName}」）——事情的原始格局
先完整写出本卦「${benName}」的卦辞原文，如有助于说理可一并引《彖传》《大象传》之辞，原文务必准确并用引号标出；然后逐句白话解释卦辞之意。再详析上卦${uName}、下卦${lName}两象如何相处、相生还是相逆，卦德卦象在讲一种什么处境。结合高岛易断的断卦理路（高岛嘉右卫门善以卦象比附时势人事、由象数直指吉凶进退、并常引实际断例印证），说清这件事眼下的根本格局与现状，这是事情的「原始」状态。此段必须充分展开。

二、动爻（第${dong}爻）——变化为何而起、如何而变
先写出第${dong}爻的爻辞原文（引号标出），逐句白话解释。再分析这一爻的爻位（当位与否、得中与否、与上下爻的承乘比应关系），说明为什么此事的变化恰恰发生在这一爻上，它就是事情由「原始」走向「结果」的关键转折与原因。引高岛易断对动爻的断法思路，把这个变化的来龙去脉、推动力讲透，这是全卦的核心。

三、变卦（之卦「${zhiName}」）——事情最终走向的结果
写出之卦「${zhiName}」的卦辞原文（引号标出）并白话解释；说明本卦因第${dong}爻一动而变成之卦，前后两卦一对比，事态会朝什么方向演变、最终落到什么结果与倾向，这是事情的「结果」。

四、占断与建议
综合「原始格局 → 变化原因 → 最终结果」，以高岛易断那种笃定、直断的口吻给出明确占断（可成/不可成、宜进/宜守、利在何时），再给三条以上务实可行的建议。

通篇所引《周易》卦辞爻辞原文务必准确，白话解释要透彻，适当融入高岛易断的解卦风格与思路。四段递进清晰，像一位老易者当面断卦、层层推演，全文不少于 2000 字。最后单独一句收尾：以上为传统易学参考，请理性看待、自行决断。`;
          if (outLang === 'zh-Hant') {
            prompt += '\n\n請全程用繁體中文作答，並維持上述四段結構與引用原文、不少於 2000 字的要求。';
          }
        }

      } else if (method === 'daliuren') {
        prompt = `客户问事：${question}
起课时间：${ke_month}月${ke_day}日${ke_hour}时

请用大六壬为客户推算：
1. 四课三传（说出课名和传名）
2. 主课意象对这件事的指示
3. 三传（初传、中传、末传）分别说明事情的起因、经过、结果
4. 总体判断（成/不成，何时有结果）
5. 建议和注意事项

用口语，像研究员在面对面解读，不写标题符号，不引用古文，直接从分析开始说完就结束。`;

      } else if (method === 'xiaoliuren') {
        const hourMap: Record<string, number> = {
          子:1, 丑:2, 寅:3, 卯:4, 辰:5, 巳:6, 午:7, 未:8, 申:9, 酉:10, 戌:11, 亥:12
        };
        const sixStars = ['先锋', '小吉', '速喜', '赤口', '留连', '空亡'];
        const m = Number(ke_month) || new Date().getMonth() + 1;
        const d = Number(ke_day) || new Date().getDate();
        const hIdx = hourMap[ke_hour] ?? 1;
        const mainIdx = ((m - 1 + d - 1) % 6 + 6) % 6;
        const mainStar = sixStars[mainIdx];
        const subIdx = ((mainIdx + hIdx - 1) % 6 + 6) % 6;
        const subStar = sixStars[subIdx];
        prompt = `客户问事：${question}
起课时间：${m}月${d}日${ke_hour}时
小六壬推算：月起${sixStars[((m-1)%6+6)%6]}，日起${mainStar}，时落${subStar}

请用小六壬为客户解读：
1. 所起的将神是"${subStar}"，说明这个将神的吉凶含义
2. 针对客户问的具体事情说明指示
3. 结果判断（成/不成/待定，给个明确倾向）
4. 最佳行动建议

用口语，简洁直接，不写标题符号，不引用古文，说完建议就结束。`;

      } else {
        const nums = [number1, number2, number3].filter(Boolean);
        prompt = `客户想问的事：${question}
起卦方式：${method === 'meihua' ? '梅花易数' : '六爻'}
起卦数字：${nums.join('、') || '随机'}

请用${method === 'meihua' ? '梅花易数' : '六爻'}帮客户解这个问题：
1. 起什么卦（说卦名和主要象意）
2. 这个卦针对客户问题说明什么
3. 结果判断（好/中/差，说清楚）
4. 具体建议（做什么、避什么、何时有转机）

用口语，直接给结论，不写标题符号，不引用古文原文，说完建议就结束。`;
      }

    } else if (service === 'fengshui') {
      const { location, concern, description, image_base64 } = body;

      // 如果有户型图，先用视觉模型读图，再做环境布局分析
      let layoutDesc = '';
      if (image_base64) {
        try {
          const visionRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
            },
            body: JSON.stringify({
              model: 'deepseek-vl2',
              max_tokens: 800,
              messages: [{
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: image_base64 } },
                  { type: 'text', text: '这是一张户型图。请仔细描述：1. 图上标注的东南西北方向；2. 大门/入口在哪个方向；3. 各功能区（客厅、卧室、厨房、卫生间、阳台）的位置和朝向；4. 特殊格局（穿堂风、开门见灶/卫等）。只描述图上实际能看到的，不要推断。' }
                ],
              }],
            }),
          });
          const vd = await visionRes.json();
          layoutDesc = vd.choices?.[0]?.message?.content || '';
        } catch (_) { /* 视觉识别失败则仅凭文字分析 */ }
      }

      const layoutSection = layoutDesc
        ? `\n\n户型图识别结果（以此为准）：\n${layoutDesc}`
        : '';
      prompt = `客户情况：${description}${layoutSection}
地点：${location || '未说明'}
主要关切：${concern}

请从环境布局角度分析并给出实用建议：
1. 主要问题在哪里（具体说是哪个方位或格局，有户型图的按图说）
2. 对家运/事业/健康有什么影响
3. 具体改善方法（3-5条，说清楚怎么做）
4. 注意事项

用口语，像一个走访过的环境布局顾问在给你当面说，不写标题符号，实用为主，直接从分析开始。`;

    } else if (service === 'hepan') {
      let man_bazi_str = String(body?.man_bazi_str || '').trim();
      let woman_bazi_str = String(body?.woman_bazi_str || '').trim();
      let man_dayun = String(body?.man_dayun || '').trim();
      let woman_dayun = String(body?.woman_dayun || '').trim();
      let current_year = Number(body?.current_year) || new Date().getFullYear();

      if ((!man_bazi_str || !woman_bazi_str || !man_dayun || !woman_dayun) && tradeBirth) {
        man_bazi_str = man_bazi_str || String(tradeBirth?.man_bazi_str || '').trim();
        woman_bazi_str = woman_bazi_str || String(tradeBirth?.woman_bazi_str || '').trim();
        man_dayun = man_dayun || String(tradeBirth?.man_dayun || '').trim();
        woman_dayun = woman_dayun || String(tradeBirth?.woman_dayun || '').trim();
        current_year = Number(tradeBirth?.current_year) || current_year;
      }

      if (!man_bazi_str || !woman_bazi_str || !man_dayun || !woman_dayun) {
        return new Response(JSON.stringify({ error: 'hepan payload incomplete' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }

      maxTokens = 8192;
      prompt = `合盘分析，当前年份：${current_year}年。
男方八字：${man_bazi_str}
女方八字：${woman_bazi_str}
男方大运：${man_dayun}
女方大运：${woman_dayun}

请按以下十段逐一深度分析，每段之间空一行，用大白话，用"你们"或分别称"男方""女方"：

第一段：两人日主关系。分别说出男方和女方的日主天干和五行，然后判断两人日主之间的关系是相生（谁生谁）、相克（谁克谁）、比和（同五行）还是天干五合（甲己合土、乙庚合金、丙辛合水、丁壬合木、戊癸合火）。详细说明这种关系在两人相处中的具体表现——相生的感情滋养模式、相克的摩擦点在哪、比和的共鸣感与竞争性、天合的磁场吸引力。

第二段：五行互补分析。列出男方和女方各自的五行分布（木火土金水各有几个），找出各自的五行强项和弱项，然后重点分析两人五行上是否互补——对方强的五行是否恰好弥补了自己的弱项，或者两人弱项相同无法互补，甚至强项相同造成某五行过旺。结合现实说明这种五行配置对两人共同生活的影响（谁补谁、谁依赖谁、哪方面相互滋养最明显）。

第三段：日支合缘（婚姻宫关系）。日支代表配偶宫，男女日支的关系直接反映两人的缘分深浅。详细分析：男女日支之间是否有六合（子丑、寅亥、卯戌、辰酉、巳申、午未）、三合（寅午戌火、巳酉丑金、申子辰水、亥卯未木）、六冲（子午、丑未、寅申、卯酉、辰戌、巳亥）、相刑（子卯、寅巳申、丑未戌）或相害（子未、丑午、寅巳、卯辰、申亥、酉戌）。六合三合代表婚姻宫相融，缘分天注；六冲代表婚姻宫相冲，聚散无常；相刑相害代表相处有隐性矛盾消耗。对每种关系都要说清楚在婚姻中的具体表现。

第四段：婚姻星状态分析。男命以财星（正财）为配偶星，女命以官星（正官）为配偶星。分别判断：男方八字中财星的旺衰、是否透干、是否被合冲绊住；女方八字中官星的旺衰、是否透干、是否被合冲绊住。财星/官星旺透表示婚姻缘分深厚，感情来得早；被合或被冲则感情路多波折，或配偶星作用减弱。结合两人互为对方的配偶星，分析两人在对方命局中的"质量"——对方是否是你命中贵人，还是你命中的消耗。

第五段：感情性格契合度。根据两人各自的格局（日主强弱、月令格局）分析各自的感情性格——谁主动谁被动，谁浪漫谁理性，谁依赖感强谁独立感强，谁在感情中更易患得患失，谁更需要被认可。然后对照分析两人性格是否互补——互补的地方如何产生吸引力，相似的地方如何既产生共鸣又带来摩擦，最需要磨合的性格差异点在哪里。

第六段：财运互助与经济配合。分别分析男方和女方各自的财运模式（主动求财还是守财型，适合创业还是打工，财运的旺年大运）。然后重点分析两人在经济上是否能互相帮扶——两人的喜用神是否一致或相辅，还是各走各的路，还是一方财星旺时恰好是另一方的忌神。给出两人在财务管理和经济规划上的具体建议。

第七段：感情隐患与第三者风险。从两人命局分析各自是否有感情隐患：检查男方是否有正财在前偏财在后（易婚后出轨）、女方是否有正官在前七杀在后（易有婚外情），以及日支是否有暗合（配偶宫有隐秘感情线）。同时分析两人相处时，是否因为某方桃花旺或异性缘强而容易引起另一方的不安全感。对每个发现的隐患都要具体说，并给出应对或防范建议。

第八段：子女缘分合论。男方以官杀为子女星，女方以食伤为子女星。分别看两人子女星的旺衰状态，再综合判断两人相合后子女缘分如何。结合两人时柱（子女宫）状态，给出最适合生育的年龄段或大运时机，以及子女数量和性别的大致倾向。

第九段：大运配合与缘分旺衰节点。根据提供的男女双方大运数据，逐步分析未来几步大运中两人缘分的旺衰变化：哪步大运两人运势方向一致、感情顺遂；哪步大运一方走强一方走弱，容易失衡；哪些具体年份是两人感情的关键节点。特别指出当前这几年对这段感情的意义。

第十段：综合评价与合婚建议。给出一个综合合婚评价（如"性格匹配程度较高""缘分深但需磨合""相克明显需谨慎"，不用百分比打分），说清楚优势在哪里、挑战在哪里，最后给出3-5条实际可操作的建议：五行调整方向、相处模式建议、需要重点关注的年份。

绝对禁止：写诗引古文、使用Markdown符号（#*_等）、用百分比打分、说套话祝福。直接从第一段开始，说完第十段就结束，每段都要展开有内容，不能只说一两句话了事。`;

    } else {
      // 八字
      const { year, month, day, hour, hour_known, gender, bazi_str,
              dayun_text, special_years_text, start_age } = body;
      const currentYear = new Date().getFullYear();
      const hourContext = hour_known === false
        ? 'Birth hour is unknown. Noon was used only as a calculation placeholder. Treat the Hour Pillar as provisional, avoid strong Hour-Pillar conclusions, and state this limitation once.'
        : 'Birth hour was provided; the Hour Pillar may be interpreted normally.';
      const birthTimeText = hour_known === false ? 'unknown birth time' : `${hour}:00`;

      const wantsEnglish = (body as Record<string, unknown>).lang === 'en';
      const calendarYearFacts = Array.from({ length: 5 }, (_, index) => currentYear + index)
        .map((value) => `${value} ${ganzhiForYear(value)}`)
        .join(' | ');
      const chartFacts = formatEnglishChartFacts((body as Record<string, unknown>).chart_data, hour_known !== false);
      const tenGodFacts = formatEnglishTenGodFacts((body as Record<string, unknown>).chart_data, hour_known !== false);
      const shenShaFacts = formatEnglishShenShaFacts((body as Record<string, unknown>).chart_data, hour_known !== false);
      const traditionalReferenceFacts = formatEnglishTraditionalReferenceFacts(
        (body as Record<string, unknown>).chart_data,
        String(gender || ''),
        hour_known !== false,
      );
      const annualInteractionFacts = formatEnglishAnnualInteractionFacts(
        (body as Record<string, unknown>).chart_data,
        String(dayun_text || ''),
        currentYear,
        hour_known !== false,
      );
      const canonicalDirection = wantsEnglish
        ? canonicalLuckDirection(String(chartPillars((body as Record<string, unknown>).chart_data).year?.stem || ''), String(gender || ''))
        : null;
      const promptCanonicalPillars = chartPillars((body as Record<string, unknown>).chart_data);
      const promptSpecialPattern = wantsEnglish
        ? assessClassicalSpecialPattern(promptCanonicalPillars, { hourKnown: hour_known !== false })
        : null;
      const canonicalDataBlock = wantsEnglish ? `
NON-NEGOTIABLE CANONICAL DATA:
${chartFacts}
${tenGodFacts}
${shenShaFacts}
${traditionalReferenceFacts}
${annualInteractionFacts}
Luck Pillar direction: ${canonicalDirection?.direction}. Basis: ${canonicalDirection?.basis}.
Luck Pillar starting age: ${start_age}
Luck Pillars: ${dayun_text}
Structural markers: ${special_years_text}
Calendar-year Ganzhi reference: ${calendarYearFacts}
Classical special-pattern assessment: ${JSON.stringify(promptSpecialPattern)}

Data contract:
1. The canonical data above is authoritative. Never recalculate or replace the Four Pillars, Five-Element counts, Luck Pillars, ages, start years, or structural markers.
2. Copy timing labels, ages, and years exactly as supplied. Do not introduce a Luck Pillar or Ganzhi pair that is not listed in the canonical data.
3. Use only the supplied stems, branches, element counts, canonical hidden-stem Ten-God profile, and canonical symbolic stars. Do not invent hidden stems, Ten Gods, symbolic stars, element counts, or an Hour Pillar.
4. When the Hour Pillar is unknown, do not infer one and do not use it as evidence.
5. Keep combined element totals separate from stem counts and branch counts. Never describe a combined total as if every item were a stem or every item were a branch. In the supplied presence check, "visible" includes both pillar stems and the base element of an Earthly Branch; it is not limited to stems.
6. The Five-Element generation cycle is Wood -> Fire -> Earth -> Metal -> Water -> Wood. The control cycle is Wood -> Earth -> Water -> Fire -> Metal -> Wood. Follow these active relations exactly. Fire is Wood's Output; it does not generate Wood. Wood controls Earth; Earth does not control Wood.
7. Follow the supplied Day Master rooting check exactly. A Day Master has a root only where an Earthly Branch contains a hidden stem of the same element.
8. Section 3 must explicitly analyze the supplied Ten-God profile. Supported symbolic stars may appear only as secondary evidence in Sections 5-6, with pillar and source named; they must not become a standalone chapter.
9. If a requested conclusion is not supported by the canonical data, state a narrower conclusion instead of filling the gap.
10. In Section 10, print the relative share of Wood, Fire, Earth, Metal, and Water. Identify excess and deficiency and connect the leading excess to the element it controls. Keep chart favorability separate from bodily balance. Do not personalize symptoms, disease risk, diet, treatment, or medical outcomes.
11. The supplied Luck-Cycle direction and starting age are final. In Section 11, state the direction rule and supplied age, then give every cycle an explicit Favorable, Moderately Favorable, Neutral, Moderately Unfavorable, or Unfavorable rating. Do not explain a solar-term or day-count calculation or interpret direction as personality.
12. Classical special-pattern detection takes priority over ordinary strong/weak balancing. If classicalPriority=true, Section 2 must name the pattern, give its supplied classical basis once, and apply its explicit element guidance. Do not revert to ordinary weak-Day-Master balancing. When no special pattern qualifies, Section 2 must still state a definite favorable/unfavorable verdict under this report's declared method.
12a. Reserve the first mention of a classical book for Section 2. Include the English source note, historical period, approximate Common Era dates, authorship or attribution, and each commentator's role. Quote only the supplied English translation. Give the quotation and source note once; do not repeat either later.
13. In Sections 4, 11, and 12, use only supplied canonical interactions. Do not infer extra combinations, clashes, harms, breaks, punishments, meetings, Fu Yin, or Fan Yin. A repeated branch alone is not Fu Yin; Fu Yin requires an exact repeated whole pillar. Canonical self-punishment is limited to 辰辰, 午午, 酉酉, and 亥亥; repeated 戌 or 申 is not self-punishment.
14. A combine, Three Harmony, Half Harmony, Arch Harmony, or Three Meeting is a relationship contact unless the canonical data explicitly says transformation is complete. "Associated with Fire" does not mean "transformed into Fire." Never turn the supplied relative energy multipliers into scientific measurements or print them as guaranteed event severity.
15. Xun Kong, Five Ghost Wealth, Yuan Chen, Lu, body-position maps, family-position maps, and tomb-storage contacts are secondary lineage-specific symbols. They may refine an already-supported interpretation but may not establish biography, wealth, marriage, illness, injury, legal trouble, imprisonment, self-harm, or death.
16. The restricted severity and traditional medical correspondences are never customer predictions. Do not diagnose, personalize symptoms, forecast bodily events, or reproduce fatalistic source phrases.` : '';
      if (wantsEnglish) {
        const elementRoles = tenGodElementRoles(chartDayMasterElement((body as Record<string, unknown>).chart_data));
        const positionCounts = chartPositionElementCounts((body as Record<string, unknown>).chart_data, hour_known !== false);
        const canonicalPillars = chartPillars((body as Record<string, unknown>).chart_data);
        const elementPresence = canonicalElementProfile(canonicalPillars).presence;
        const dayMasterStem = String(canonicalPillars.day?.stem || '');
        const dayMasterElement = STEM_ELEMENTS[dayMasterStem] || '';
        const rootBranches = Object.values(canonicalPillars)
          .map((pillar) => String(pillar?.branch || ''))
          .filter((branch) => (HIDDEN_STEMS[branch] || []).some((stem) => STEM_ELEMENTS[stem] === dayMasterElement));
        const strength = assessDayMasterStrength(canonicalPillars, { hourKnown: hour_known !== false });
        const specialPattern = assessClassicalSpecialPattern(canonicalPillars, { hourKnown: hour_known !== false });
        const parsedLuckPillars = String(dayun_text || '').split('|').map((item) => {
          const match = item.trim().match(/^(\S+) from age (\d+) \((\d+)\)$/);
          return match ? { gz: match[1], age: Number(match[2]), year: Number(match[3]) } : null;
        }).filter(Boolean) as Array<{ gz: string; age: number; year: number }>;
        baziGroundTruth = {
          allowedGanzhi: collectGanzhi(bazi_str, dayun_text, special_years_text, calendarYearFacts),
          gender: String(gender || ''),
          hourKnown: hour_known !== false,
          elementRoles,
          stemCounts: positionCounts.stemCounts,
          branchCounts: positionCounts.branchCounts,
          elementPresence,
          luckDirection: canonicalDirection!.direction,
          luckBasis: canonicalDirection!.basis,
          startAge: Number(start_age),
          luckPillars: parsedLuckPillars,
          currentYear,
          pillars: canonicalPillars as Record<string, { stem: string; branch: string }>,
          dayMasterStem,
          rootBranches: [...new Set(rootBranches)],
          strength: strength as BaziGroundTruth['strength'],
          specialPattern,
        };
      }
      if (free_only) {
        prompt = wantsEnglish ? `Client birth information: ${year}-${month}-${day} at ${birthTimeText}. Gender: ${gender}. Four Pillars: ${bazi_str}. Current year: ${currentYear}.
Hour accuracy: ${hourContext}
${canonicalDataBlock}

Precomputed timing context:
Luck Pillar starting age: ${start_age}
Luck Pillars: ${dayun_text}
Structural markers: ${special_years_text}

Write a concise introductory BaZi reading in natural English. Explain traditional chart structure plainly; do not turn it into a personality test.

Output exactly three sections:
Section 1: Four Pillars and Day Master
Section 2: Seasonal Qi and Five-Element Structure
Section 3: Ten Gods and What the Full Reading Covers

Each section should be 120-180 words. Define technical terms on first use and distinguish calculated facts from interpretation. Use concrete everyday English. Do not use Markdown, bullets, tables, poetry, fear-based claims, medical diagnoses, guaranteed events, or luck remedies. End Section 3 with this exact sentence: "The complete reading continues with chart structure, useful elements, natal interactions, Shen Sha, career, wealth, relationships, health tendencies, Luck Pillars, and annual timing."`
        : `Client birth info: ${year}-${month}-${day} ${hour}:00, gender: ${gender}, bazi: ${bazi_str}, current year: ${currentYear}.

Precomputed data:
Start age: ${start_age}
Dayun: ${dayun_text}
Special years: ${special_years_text}

你是一位经验丰富的研究员，用传统五行文化帮人了解自己的性格。这是性格分析，不做命运预测、运势吉凶或改运。FREE 基础版只输出第1段和第2段，共两段。

第1段：日主强弱与性格轮廓（日主强弱结论、性格底色、你是一个怎样的人）。
第2段：天赋优势与适合的方向（综合五行结构，给出1-2条关于你的优势与适合方式的具体特点，不展开细节，留悬念）。

Requirements:
- 每段控制在150-250字，总字数严格控制在350-550汉字。
- 第2段结尾必须自然引导："想完整看清自己的性格特质、天赋优势与适合方向，可以看看完整版的24维深度性格分析。"
- 只输出中文纯文本，不用Markdown、不写诗、不引用古文。
- 不用称呼对方为"你"，直接用口语陈述结论。
- 全程只谈性格与自我认知，不谈未来运势、财运时机或吉凶。
- 不得输出第3段及以后的内容。`;
      } else {
      const nextFiveYears = Array.from({length: 5}, (_, i) => currentYear + i).join(wantsEnglish ? ', ' : '、') + (wantsEnglish ? '' : '年');
        prompt = wantsEnglish ? `Client birth information: ${year}-${month}-${day} at ${birthTimeText}. Gender: ${gender}. Four Pillars: ${bazi_str}. Current year: ${currentYear}.
Hour accuracy: ${hourContext}
${canonicalDataBlock}

Use the following precomputed timing context as supplied. Do not recalculate it:
Luck Pillar starting age: ${start_age}
Luck Pillars: ${dayun_text}
Structural markers: ${special_years_text}
Next five calendar years: ${nextFiveYears}

Writing principles:
1. Write a cohesive traditional BaZi Destiny Book. Do not frame it as psychology, coaching, therapy, self-development, or a glossary of isolated symbols.
2. In every section use this order: explicit verdict, exact chart evidence, traditional meaning, and the boundary of what that evidence can establish.
3. Name the exact stem, branch, hidden stem, Ten God, or interaction that supports each important conclusion. Never invent an unsupported relation.
4. Define a specialist term in plain English on first use while retaining its standard name, for example "Day Master", "Direct Wealth", or "Luck Pillar (Da Yun)".
5. Keep visible elements separate from hidden stems. "No visible Fire" must not become "Fire is absent" when Fire exists in hidden stems.
6. Day Master means the Day Stem only. A two-character Ganzhi such as 甲戌 is the Day Pillar, not the Day Master.
7. Treat Shen Sha as secondary evidence. It must never override season, Day Master strength, Ten Gods, or stem-branch structure.
8. Discuss career, wealth, relationships, health correspondences, and timing in traditional BaZi terms, but do not guarantee wealth, marriage, illness, accidents, or specific events. In health content, do not predict symptoms, organ strain, disease risk, diet, or treatment.
9. When discussing a Wood Day Master and Earth, say that Wood may expend energy controlling Earth. Never say Earth controls Wood or drains Wood by controlling it. Fire is Wood's Output and does not generate, nourish, or strengthen Wood.
10. Test special patterns before applying ordinary Day-Master balancing. Section 2 must name the governing pattern and state exactly which Five Elements are favorable, unfavorable, and conditional. Do not call them candidates, available, supportive, pressuring, or merely useful.
11. Treat the 13 chapters as one continuous book. Later chapters must follow the same pattern and favorable-element verdict without restarting the reading or repeating the classical quotation.
12. Give every Luck Cycle and annual year one explicit rating: Favorable, Moderately Favorable, Neutral, Moderately Unfavorable, or Unfavorable. Never print support scores, pressure scores, decision postures, Supported Advance, Selective Advance, or Hold & Protect.
13. Do not add reflection questions, practical-step boxes, generic routines, wellness coaching, or filler. Write fluent English prose without Markdown, poetry, repeated introductions, or a closing blessing.`
        : `客户生辰：${year}年${month}月${day}日${hour}时，${gender}命，八字：${bazi_str}，当前年份：${currentYear}年。

以下大运和特殊年份数据已由专业软件算好，请直接使用，不要自行重算：
起运年龄：${start_age}岁
大运排列：${dayun_text}
特殊流年：${special_years_text}
后五年：${nextFiveYears}

写作总原则：
1. 同一八字在不同档位的核心判断必须一致，尤其是日主强弱、格局、用神喜忌、事业主线、感情主线，不能前后矛盾。
2. 每一段都按“结论→依据→建议”展开，依据必须回扣到命盘干支、十神、大运或流年。
3. 语言必须具体，不要使用“可能、也许、大概、不排除”等模糊词。
4. 只输出中文纯文本，不要Markdown、不要诗词古文、不要空话套话。
5. 直接从分析开始，不写开场寒暄，不写收尾祝福。`;
      } // end if free_only else
    } // end else bazi

    // Bazi tiers use one unified framework, only output depth differs.
    if (service === 'bazi') {
      const englishBazi = (body as Record<string, unknown>).lang === 'en';
      const requestedTier = free_only ? 'free' : (resolvedPaymentOptionId || 'basic');
      const baziTier = requestedTier === 'english_report' ? 'vip' : requestedTier;
      const forceCanonicalAllSections = !free_only && !hasSectionRange && baziTier === 'vip';
      prompt += `

${englishBazi ? 'Output rule override for BaZi:' : 'Output rule override for BAZI:'}
${englishBazi ? 'Use this BaZi Destiny Book blueprint and keep the chapter order strictly.' : 'Use this exact section blueprint and keep section order strictly.'}
${englishBazi ? BAZI_STANDARD_BLUEPRINT_EN : BAZI_SECTION_BLUEPRINT_24}
${englishBazi ? 'Begin every section on a new line with “Section N:”. Do not use Markdown, bullets, tables, repeated introductions, or a closing blessing.' : '每一段必须以“第X段：”单独起行。\n禁止 Markdown、禁止列表符号、禁止表格、禁止重复开场、禁止收尾祝福语。'}
`;
      if (hasSectionRange) {
        if (baziTier === 'vip') {
          maxTokens = Math.min(maxTokens, getVipRangeMaxTokens(requestedSectionStart, requestedSectionEnd));
        }
        prompt += `

分段生成任务：
当前只需生成第${requestedSectionStart}段到第${requestedSectionEnd}段。
本次仅输出当前分段，不要输出分段外内容。`;
        prompt += buildSectionRangeConstraint(requestedSectionStart, requestedSectionEnd);
      } else if (forceCanonicalAllSections) {
        maxTokens = Math.min(maxTokens, 12000);
        prompt += englishBazi ? `

Complete-report constraints:
1. Write all ${ENGLISH_BAZI_REPORT_SECTION_COUNT} sections without skipping any section.
2. Target ${ENGLISH_BAZI_REPORT_WORD_RANGE.min.toLocaleString('en-US')}-${ENGLISH_BAZI_REPORT_WORD_RANGE.max.toLocaleString('en-US')} English words across the complete report.
3. Do not add psychology chapters or generic motivational filler. Spend the word count on chart evidence and traditional BaZi interpretation.
4. Before writing, determine the governing pattern under the special-pattern-first rule, then fix the exact favorable and unfavorable elements. Do not output this planning instruction.
5. Make that verdict visible through the prose: Sections 1-4 establish it; Sections 5-10 apply it to life domains; Sections 11-13 show how Da Yun and Liu Nian modify it.
6. The interpretation must remain internally consistent from beginning to end. Career, wealth, relationships, and timing cannot use mutually incompatible strength or useful-element assumptions.
7. Each later chapter must add new chart evidence or a new application. Do not restart with a generic definition, repeat the same conclusion merely to fill space, or write thirteen isolated essays.
8. Section titles must match the supplied blueprint exactly.` : `

统一基准约束（用于三档一致性）：
1. 必须完整写出第1段到第24段，不能跳段。
2. 全文总字数目标：7000-9000字。
3. 第1段到第8段累计目标：约3000字（供初级版截取）。
4. 第1段到第16段累计目标：约5000字（供进阶版截取）。
5. 同一八字三档口径必须一致，低档内容是高档内容的前置子集，不得出现前后结论冲突。`;
      } else if (baziTier === 'vip') {
        maxTokens = Math.min(maxTokens, 8192);
        prompt += englishBazi ? `

Tier constraint: Write all ${ENGLISH_BAZI_REPORT_SECTION_COUNT} sections. Target ${ENGLISH_BAZI_REPORT_WORD_RANGE.min.toLocaleString('en-US')}-${ENGLISH_BAZI_REPORT_WORD_RANGE.max.toLocaleString('en-US')} English words.` : `

档位约束：完整版必须完整输出第1段到第24段。总字数目标7000-9000字。`;
      } else if (baziTier === 'pro') {
        maxTokens = Math.min(maxTokens, 7200);
        prompt += englishBazi ? `

Tier constraint: Write only Sections 1-10. Do not output Section 11 or later. Target 3,000-4,200 English words.` : `

档位约束：进阶版只能输出第1段到第16段，不得输出第17段及以后。总字数目标4800-5600字（约5000字）。`;
      } else if (baziTier === 'basic') {
        maxTokens = Math.min(maxTokens, 5200);
        prompt += englishBazi ? `

Tier constraint: Write only Sections 1-5. Do not output Section 6 or later. Target 1,600-2,300 English words.` : `

档位约束：初级版只能输出第1段到第8段，不得输出第9段及以后。总字数目标2800-3400字（约3000字）。`;
      } else {
        maxTokens = Math.min(maxTokens, 2200);
        prompt += englishBazi ? `

Free-preview constraint: Write only Sections 1-3. Do not output Section 4 or later. Target 360-540 English words.` : `

档位约束：免费版只能输出第1段到第3段，不得输出第4段及以后。总字数目标900-1400字。`;
      }
    }

    const SYSTEM_MSG = `你是一位经验丰富的中国传统干支文化研究员，专注于用传统五行文化帮助人们「更了解自己的性格」。只输出纯文字，不用任何Markdown格式，不写诗，不引用古文，不说套话，直接用口语和"你"称呼对方说结论。

【核心定位——必须严格遵守】
这是一份「性格分析 / 自我认知」报告，不是命运预测。全程聚焦于性格特质、思维方式、天赋优势、行为模式、相处方式与自我成长。
绝对禁止以下内容：预测未来会发生什么、判断某年某岁的运势吉凶、断定财富多少或何时发财、预测婚姻何时到来或成败、预测健康疾病、以及任何"改运/补运/化解"建议。
所有落点都要回到「这说明你是一个怎样的人、你有什么特质、你适合怎样的方式、你可以如何更好地发挥或调整」。

【十神对应速查——必须严格遵守，不得搞错】
财星=日主所克：甲乙木日主→财星是土；丙丁火日主→财星是金；戊己土日主→财星是水；庚辛金日主→财星是木；壬癸水日主→财星是火。
官杀=克日主者：甲乙木日主→官杀是金；丙丁火日主→官杀是水；戊己土日主→官杀是木；庚辛金日主→官杀是火；壬癸水日主→官杀是土。
印星=生日主者：甲乙木日主→印是水；丙丁火日主→印是木；戊己土日主→印是火；庚辛金日主→印是土；壬癸水日主→印是金。
食伤=日主所生：甲乙木→食伤是火；丙丁火→食伤是土；戊己土→食伤是金；庚辛金→食伤是水；壬癸水→食伤是木。
阳日主遇阳同类=比肩，遇阴同类=劫财；遇阳财=偏财，遇阴财=正财；遇阳官杀=七杀，遇阴官杀=正官。阴日主规则相反。

【表达要求——必须给出确切、具体的性格结论，严禁模糊套话】
要把五行/十神/结构，翻译成具体的性格与行为特点，并说清原因。示例：
"你可能比较敏感"→必须说"你食伤旺，表达欲和感受力都强，容易注意到别人忽略的细节，也容易因为想太多而内耗"；
"你适合做生意"→必须说"你偏财透干且身强，擅长在灵活多变的环境里抓机会、整合资源，比按部就班的岗位更能发挥"；
"你人缘不错"→必须说"你正官配印，做事有分寸、让人放心，容易在需要信任的关系里被依赖"；
凡下判断，必须回扣到具体干支、十神或五行结构，并落到"所以你是个怎样的人 / 适合怎样的方式"，不得用"可能""也许""有一定概率"等虚词搪塞，也不得转成运势预测。`;

    const SYSTEM_MSG_EN = `You are an experienced practitioner and researcher of traditional BaZi (Four Pillars of Destiny). You write a cohesive BaZi Destiny Book, not a generic AI report.

Write for an English-speaking reader who may be new to BaZi. Preserve standard terminology, explain it briefly on first use, and show the chart evidence behind each conclusion. Do not convert BaZi into MBTI, psychology, coaching, therapy, or generic self-help. Do not guarantee specific events, wealth, marriage dates, illness, accidents, or prescribe charms and luck remedies.

Apply the Ten-God relationships correctly:
- Wealth is the element controlled by the Day Master: Wood controls Earth, Fire controls Metal, Earth controls Water, Metal controls Wood, and Water controls Fire.
- Officer and Seven Killings are the element that controls the Day Master.
- Resource is the element that produces the Day Master.
- Output is the element produced by the Day Master.
- Companion is the same element as the Day Master, with polarity distinguishing Companion and Rob Wealth.

Keep the interpretation inside standard BaZi categories. Every important conclusion must point back to a visible stem, branch, canonical hidden stem, Ten-God relationship, elemental balance, or supplied Luck-Pillar context. Explain the traditional structural meaning and its practical limit without converting it into a personality profile or generic self-help.

Build the entire book around one governing natal thesis. Test classical special patterns before ordinary Day-Master balancing. State the governing pattern and exact favorable, unfavorable, and conditional Five Elements in Section 2, then derive every later conclusion from that verdict. The book must read as one continuous interpretation rather than thirteen independent essays.

Structural verdicts must be direct. Biographical claims still remain traditional indications rather than verified facts. Never fill uncertainty with vague language. If a conclusion is supported, state it; if the canonical data cannot support it, omit it or state the exact limit.

Within each section, begin with the verdict, then state exact chart evidence, traditional meaning, and boundary. Keep terminology consistent: 比肩 is Companion, 劫财 is Rob Wealth, 食神 is Eating God, 伤官 is Hurting Officer, 偏财 is Indirect Wealth, 正财 is Direct Wealth, 七杀 is Seven Killings, 正官 is Direct Officer, 偏印 is Indirect Resource, and 正印 is Direct Resource.

Section 3 uses the canonical weighted Five-Element and Ten-God profiles. Shen Sha are secondary evidence inside Sections 5-6, never a standalone chapter. Section 10 gives exact element percentages and non-diagnostic correspondences. Sections 11-12 use only explicit Favorable-to-Unfavorable ratings; never expose support/pressure scores or decision-posture labels.

The only classical quotation permitted is the supplied English translation in Section 2, introduced once with the supplied provenance note. Do not repeat it. Write natural English plain text. The only Chinese characters permitted are necessary Heavenly Stem and Earthly Branch characters in calculated Ganzhi. Do not use Markdown, tables, poetry, reflection questions, practical-step boxes, generic routines, filler, or a ceremonial conclusion.`;

    // 按界面语言输出：en→英文，zh-Hant→繁体，其余保持简体
    const _outLang = (body as Record<string, unknown>).lang;
    const SYSTEM_MSG_L = _outLang === 'en'
      ? SYSTEM_MSG_EN
      : _outLang === 'zh-Hant'
      ? SYSTEM_MSG + '\n\n【語言】請全程改用繁體中文作答。'
      : SYSTEM_MSG;

    // 在 prompt 末尾再压一道语言强制（比 system message 更强势，覆盖上文大量中文指令）
    if (_outLang === 'en') {
      if (service === 'bazi') {
        prompt += '\n\n================ OUTPUT LANGUAGE: ENGLISH (HIGHEST PRIORITY) ================\nWrite the entire answer in fluent English. Use section markers exactly as Section 1:, Section 2:, and so on. The only Chinese permitted is raw Ganzhi or Four-Pillar characters such as 甲午, each with a short English gloss in parentheses on first use. Output no Chinese sentences.';
      } else {
        prompt += '\n\n================ OUTPUT LANGUAGE: ENGLISH (HIGHEST PRIORITY) ================\nRegardless of the Chinese wording above, write your ENTIRE answer in fluent English, including translating every section header into English. The only Chinese permitted is raw hexagram / pillar characters (e.g. 火地晋), each with a short English gloss in parentheses. Output ZERO Chinese sentences.';
      }
    } else if (_outLang === 'zh-Hant') {
      prompt += '\n\n【輸出語言】請全程改用繁體中文作答。';
    }


    // 合盘默认流式；八字在显式请求 stream=true 时：
    // - 付费且非分段请求：按档位走分段聚合，再以 SSE 回放，兼顾一致性与速度
    // - 其余情况：直连模型流式
    if (service === 'bazi' && stream === true && !free_only && !hasSectionRange) {
      const paidTier = (resolvedPaymentOptionId === 'english_report' ? 'vip' : (resolvedPaymentOptionId || 'basic')) as 'basic' | 'pro' | 'vip';
      const finalText = await generatePaidBaziTierReport(
        prompt,
        SYSTEM_MSG_L,
        paidTier,
        baziGroundTruth,
        _outLang === 'en' ? ENGLISH_BAZI_REPORT_SECTION_COUNT : 24,
      );
      return buildSseResponseFromText(localizeBaziSectionMarkers(finalText, _outLang), CORS, _outLang !== 'en');
    }

    if (service === 'zhanbu' && stream === true) {
      const savedDecisionReading = String(tradeOrder?.analysis || '').trim();
      if (savedDecisionReading) {
        return buildSseResponseFromText(savedDecisionReading, CORS, false);
      }
      const runApiKey = String(Deno.env.get('RUNAPI_API_KEY') || '').trim();
      const runApiModel = String(Deno.env.get('RUNAPI_DECISION_MODEL') || 'claude-sonnet-4-6').trim();
      const runApiBase = String(Deno.env.get('RUNAPI_BASE_URL') || 'https://runapi.co/v1').trim().replace(/\/+$/, '');
      if (!runApiKey) {
        return new Response(JSON.stringify({ error: 'decision_model_not_configured' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
      const decisionSystem = `You are Tengyunzi's English I Ching interpretation editor. Follow the supplied cast exactly and never change its upper trigram, lower trigram, moving line, original hexagram, or resulting hexagram. Write a coherent, thoughtful interpretation grounded in the traditional structure while remaining honest about uncertainty. Use the user's real question throughout the analysis. Do not claim certainty, guarantee outcomes, or replace medical, legal, financial, safety, or other qualified professional advice. Output English only, with no Chinese characters.`;
      const runApiResponse = await fetch(`${runApiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${runApiKey}`,
        },
        body: JSON.stringify({
          model: runApiModel,
          max_tokens: maxTokens,
          temperature: 0.2,
          stream: true,
          messages: [
            { role: 'system', content: decisionSystem },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!runApiResponse.ok || !runApiResponse.body) {
        const details = await runApiResponse.text();
        console.error('RunAPI decision model failed', runApiResponse.status, details.slice(0, 400));
        return new Response(JSON.stringify({ error: 'decision_model_unavailable' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
      const [clientStream, persistenceStream] = runApiResponse.body.tee();
      const persistDecisionReading = (async () => {
        const reader = persistenceStream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let full = '';
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const value = line.slice(6).trim();
            if (!value || value === '[DONE]') continue;
            try {
              full += JSON.parse(value).choices?.[0]?.delta?.content || '';
            } catch {
              // Ignore malformed provider heartbeat chunks.
            }
          }
        }
        if (full.trim() && trade_no) {
          await supabase.from('orders').update({ analysis: full.trim() }).eq('trade_no', trade_no).eq('paid', true);
        }
      })();
      try {
        (globalThis as any).EdgeRuntime?.waitUntil?.(persistDecisionReading);
      } catch {
        // The stream returned to the client remains usable even when waitUntil is unavailable.
      }
      return new Response(clientStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...CORS,
        },
      });
    }

    if ((service === 'hepan' && stream === true) || (service === 'bazi' && stream === true)) {
      const deepSeekStreamingModel = String(Deno.env.get('DEEPSEEK_STREAM_MODEL') || 'deepseek-v4-flash').trim();
      const dsStream = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
        },
        body: JSON.stringify({
          model: deepSeekStreamingModel,
          max_tokens: maxTokens,
          thinking: { type: 'disabled' },
          stream: true,
          messages: [
            { role: 'system', content: SYSTEM_MSG_L },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!dsStream.ok) {
        console.warn('DeepSeek streaming unavailable, using Claude non-stream fallback', dsStream.status);
        const fallback = await requestClaudeCompletion(prompt, maxTokens, SYSTEM_MSG_L);
        const localized = service === 'bazi'
          ? localizeBaziSectionMarkers(fallback.analysis, _outLang)
          : fallback.analysis;
        return buildSseResponseFromText(localized, CORS, _outLang !== 'en');
      }
      return new Response(dsStream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...CORS,
        },
      });
    }

    const isPaidBaziNoRange = service === 'bazi' && !free_only && !hasSectionRange;
    let analysis = '';

    if (isPaidBaziNoRange) {
      const paidTier = (resolvedPaymentOptionId === 'english_report' ? 'vip' : (resolvedPaymentOptionId || 'basic')) as 'basic' | 'pro' | 'vip';
      analysis = await generatePaidBaziTierReport(
        prompt,
        SYSTEM_MSG_L,
        paidTier,
        baziGroundTruth,
        _outLang === 'en' ? ENGLISH_BAZI_REPORT_SECTION_COUNT : 24,
      );
    } else {
      let singlePass = await requestDeepSeekCompletion(prompt, maxTokens, SYSTEM_MSG_L);
      let violations = findGroundTruthViolations(singlePass.analysis, baziGroundTruth);
      if (violations.length) {
        singlePass = await requestDeepSeekCompletion(
          prompt + groundTruthCorrection(violations),
          maxTokens,
          SYSTEM_MSG_L,
        );
        violations = findGroundTruthViolations(singlePass.analysis, baziGroundTruth);
        if (violations.length) {
          throw new Error(`report_ground_truth_validation_failed: ${violations.join('; ')}`);
        }
      }
      analysis = normalizeSectionMarkers(singlePass.analysis);
      if (service === 'bazi' && free_only) {
        analysis = clipBaziReportByTier(analysis, 3);
      }
    }

    if (service === 'bazi') {
      analysis = localizeBaziSectionMarkers(analysis, _outLang);
    }

    // 有 trade_no 时才写数据库（付费流程用），免费模式跳过
    if (trade_no && !hasSectionRange) {
      await supabase.from('orders').update({ analysis }).eq('trade_no', trade_no);
    }

    return new Response(JSON.stringify({ ok: true, analysis }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
