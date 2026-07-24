export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'];

export const STEM_ELEMENT = Object.fromEntries(STEMS.map((stem, index) => [stem, ELEMENTS[Math.floor(index / 2)]]));
export const STEM_POLARITY = Object.fromEntries(STEMS.map((stem, index) => [stem, index % 2 === 0 ? 'yang' : 'yin']));
export const BRANCH_ELEMENT = Object.fromEntries(
  ['water', 'earth', 'wood', 'wood', 'earth', 'fire', 'fire', 'earth', 'metal', 'metal', 'earth', 'water']
    .map((element, index) => [BRANCHES[index], element]),
);
export const BRANCH_POLARITY = Object.fromEntries(BRANCHES.map((branch, index) => [branch, index % 2 === 0 ? 'yang' : 'yin']));

export const HIDDEN_STEMS = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};

export const TEN_GODS = [
  { name: '比肩', english: 'Friend', meaning: 'Identity and self-direction' },
  { name: '劫财', english: 'Rob Wealth', meaning: 'Competition, alliances, and shared resources' },
  { name: '食神', english: 'Eating God', meaning: 'Gentle expression and craft' },
  { name: '伤官', english: 'Hurting Officer', meaning: 'Originality and challenge' },
  { name: '偏财', english: 'Indirect Wealth', meaning: 'Opportunity and flexible exchange' },
  { name: '正财', english: 'Direct Wealth', meaning: 'Steady resources and stewardship' },
  { name: '七杀', english: 'Seven Killings', meaning: 'Pressure, courage, and decisive action' },
  { name: '正官', english: 'Direct Officer', meaning: 'Standards, duty, and legitimate authority' },
  { name: '偏印', english: 'Indirect Resource', meaning: 'Pattern recognition and intuition' },
  { name: '正印', english: 'Direct Resource', meaning: 'Learning, support, and restoration' },
];

export const SHEN_SHA_ENGLISH = Object.freeze({
  天乙贵人: 'Heavenly Nobleman', 文昌贵人: 'Scholar Star', 禄神: 'Prosperity Star', 羊刃: 'Blade Star',
  桃花: 'Peach Blossom', 驿马: 'Travel Horse', 华盖: 'Canopy Star', 将星: 'General Star',
  红鸾: 'Marriage Star', 天喜: 'Joy Star',
});

const TIAN_YI_BRANCHES = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'], 乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'], 壬: ['卯', '巳'], 癸: ['卯', '巳'], 辛: ['寅', '午'],
};
const WEN_CHANG_BRANCH = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
const LU_SHEN_BRANCH = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
const YANG_REN_BRANCH = { 甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' };
const HONG_LUAN_BY_BRANCH = { 子: '卯', 丑: '寅', 寅: '丑', 卯: '子', 辰: '亥', 巳: '戌', 午: '酉', 未: '申', 申: '未', 酉: '午', 戌: '巳', 亥: '辰' };
const TIAN_XI_BY_BRANCH = { 子: '酉', 丑: '申', 寅: '未', 卯: '午', 辰: '巳', 巳: '辰', 午: '卯', 未: '寅', 申: '丑', 酉: '子', 戌: '亥', 亥: '戌' };
const SHEN_SHA_GROUPS = [
  { branches: ['申', '子', '辰'], peach: '酉', yima: '寅', huagai: '辰', jiangxing: '子' },
  { branches: ['寅', '午', '戌'], peach: '卯', yima: '申', huagai: '戌', jiangxing: '午' },
  { branches: ['亥', '卯', '未'], peach: '子', yima: '巳', huagai: '未', jiangxing: '卯' },
  { branches: ['巳', '酉', '丑'], peach: '午', yima: '亥', huagai: '丑', jiangxing: '酉' },
];

export const PILLAR_WEIGHTS = { year: 0.85, month: 1.35, day: 1, hour: 0.9 };
export const HIDDEN_STEM_WEIGHTS = [0.6, 0.3, 0.1];

export function hiddenStemWeights(branch) {
  const count = (HIDDEN_STEMS[branch] || []).length;
  if (count === 1) return [1];
  if (count === 2) return [0.7, 0.3];
  if (count === 3) return [...HIDDEN_STEM_WEIGHTS];
  return [];
}

export function charElement(char) {
  return STEM_ELEMENT[char] || BRANCH_ELEMENT[char] || '';
}

export function charPolarity(char) {
  return STEM_POLARITY[char] || BRANCH_POLARITY[char] || '';
}

export function tenGod(dayStem, otherStem) {
  const dayIndex = STEMS.indexOf(dayStem);
  const otherIndex = STEMS.indexOf(otherStem);
  if (dayIndex < 0 || otherIndex < 0) return '';
  const relation = (Math.floor(otherIndex / 2) - Math.floor(dayIndex / 2) + 5) % 5;
  const samePolarity = dayIndex % 2 === otherIndex % 2;
  if (relation === 0) return samePolarity ? '比肩' : '劫财';
  if (relation === 1) return samePolarity ? '食神' : '伤官';
  if (relation === 2) return samePolarity ? '偏财' : '正财';
  if (relation === 3) return samePolarity ? '七杀' : '正官';
  return samePolarity ? '偏印' : '正印';
}

export function tenGodEnglish(name) {
  return TEN_GODS.find((item) => item.name === name)?.english || name || '';
}

export function tenGodElementRoles(dayMasterElement) {
  const dayIndex = ELEMENTS.indexOf(String(dayMasterElement || '').toLowerCase());
  if (dayIndex < 0) return {};
  return Object.fromEntries(ELEMENTS.map((element, index) => {
    const relation = (index - dayIndex + 5) % 5;
    return [element, ['Companion', 'Output', 'Wealth', 'Officer', 'Resource'][relation]];
  }));
}

export function shenShaForChart(pillars, options = {}) {
  const hourKnown = options.hourKnown !== false;
  const yearStem = String(pillars?.year?.stem || '');
  const yearBranch = String(pillars?.year?.branch || '');
  const dayStem = String(pillars?.day?.stem || '');
  const dayBranch = String(pillars?.day?.branch || '');
  const refs = [
    { stem: dayStem, branch: dayBranch, source: 'Day Pillar' },
    { stem: yearStem, branch: yearBranch, source: 'Year Pillar' },
  ];
  const names = hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day'];
  const results = [];
  const add = (pillar, branch, name, source) => {
    const existing = results.find((item) => item.pillar === pillar && item.name === name);
    if (existing) {
      const sources = existing.source.split(' + ');
      if (!sources.includes(source)) existing.source = [...sources, source].join(' + ');
      return;
    }
    results.push({ pillar, branch, name, english: SHEN_SHA_ENGLISH[name] || name, source });
  };

  for (const pillar of names) {
    const branch = String(pillars?.[pillar]?.branch || '');
    for (const ref of refs) {
      if ((TIAN_YI_BRANCHES[ref.stem] || []).includes(branch)) add(pillar, branch, '天乙贵人', ref.source);
      if (WEN_CHANG_BRANCH[ref.stem] === branch) add(pillar, branch, '文昌贵人', ref.source);
      if (LU_SHEN_BRANCH[ref.stem] === branch) add(pillar, branch, '禄神', ref.source);
      if (YANG_REN_BRANCH[ref.stem] === branch) add(pillar, branch, '羊刃', ref.source);
      const group = SHEN_SHA_GROUPS.find((item) => item.branches.includes(ref.branch));
      if (group?.peach === branch) add(pillar, branch, '桃花', ref.source);
      if (group?.yima === branch) add(pillar, branch, '驿马', ref.source);
      if (group?.huagai === branch) add(pillar, branch, '华盖', ref.source);
      if (group?.jiangxing === branch) add(pillar, branch, '将星', ref.source);
    }
    if (HONG_LUAN_BY_BRANCH[yearBranch] === branch) add(pillar, branch, '红鸾', 'Year Branch');
    if (TIAN_XI_BY_BRANCH[yearBranch] === branch) add(pillar, branch, '天喜', 'Year Branch');
  }
  return results;
}

function largestRemainder(values, target = 100) {
  const floors = values.map((value) => Math.floor(value));
  let remainder = target - floors.reduce((sum, value) => sum + value, 0);
  values
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .forEach(({ index }) => {
      if (remainder > 0) {
        floors[index] += 1;
        remainder -= 1;
      }
    });
  return floors;
}

export function weightedTenGodProfile(pillars, options = {}) {
  const hourKnown = options.hourKnown !== false;
  const dayStem = pillars?.day?.stem || '';
  const scores = Object.fromEntries(TEN_GODS.map(({ name }) => [name, 0]));
  const visibleScores = Object.fromEntries(TEN_GODS.map(({ name }) => [name, 0]));
  const hiddenScores = Object.fromEntries(TEN_GODS.map(({ name }) => [name, 0]));
  const names = hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day'];

  for (const key of names) {
    const pillar = pillars?.[key] || {};
    const pillarWeight = PILLAR_WEIGHTS[key];
    if (key !== 'day' && pillar.stem) {
      const god = tenGod(dayStem, pillar.stem);
      if (god) {
        scores[god] += pillarWeight;
        visibleScores[god] += pillarWeight;
      }
    }
    const branchWeights = hiddenStemWeights(pillar.branch);
    (HIDDEN_STEMS[pillar.branch] || []).forEach((stem, index) => {
      const god = tenGod(dayStem, stem);
      if (!god) return;
      const score = pillarWeight * branchWeights[index];
      scores[god] += score;
      hiddenScores[god] += score;
    });
  }

  const total = Object.values(scores).reduce((sum, value) => sum + value, 0) || 1;
  const exact = TEN_GODS.map(({ name }) => (scores[name] / total) * 100);
  const percentages = largestRemainder(exact);
  return TEN_GODS.map((item, index) => ({
    ...item,
    element: charElement(STEMS.find((stem) => tenGod(dayStem, stem) === item.name)),
    rawScore: scores[item.name],
    visible: visibleScores[item.name],
    hidden: hiddenScores[item.name],
    exactPercentage: exact[index],
    percentage: percentages[index],
  })).sort((a, b) => b.percentage - a.percentage || b.rawScore - a.rawScore);
}

export function elementProfile(pillars, options = {}) {
  const hourKnown = options.hourKnown !== false;
  const names = hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day'];
  const stems = Object.fromEntries(ELEMENTS.map((element) => [element, 0]));
  const branches = Object.fromEntries(ELEMENTS.map((element) => [element, 0]));
  const hidden = Object.fromEntries(ELEMENTS.map((element) => [element, 0]));
  for (const key of names) {
    const pillar = pillars?.[key] || {};
    if (STEM_ELEMENT[pillar.stem]) stems[STEM_ELEMENT[pillar.stem]] += 1;
    if (BRANCH_ELEMENT[pillar.branch]) branches[BRANCH_ELEMENT[pillar.branch]] += 1;
    const branchWeights = hiddenStemWeights(pillar.branch);
    (HIDDEN_STEMS[pillar.branch] || []).forEach((stem, index) => {
      hidden[STEM_ELEMENT[stem]] += PILLAR_WEIGHTS[key] * branchWeights[index];
    });
  }
  const visible = Object.fromEntries(ELEMENTS.map((element) => [element, stems[element] + branches[element]]));
  const presence = Object.fromEntries(ELEMENTS.map((element) => [element,
    visible[element] > 0 ? 'visible' : hidden[element] > 0 ? 'hidden_only' : 'not_present',
  ]));
  return { stems, branches, visible, hidden, presence };
}

export function assessDayMasterStrength(pillars, options = {}) {
  const hourKnown = options.hourKnown !== false;
  const names = hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day'];
  const dayStem = String(pillars?.day?.stem || '');
  const dayElement = STEM_ELEMENT[dayStem] || '';
  const roles = tenGodElementRoles(dayElement);
  if (!dayElement || !Object.keys(roles).length) {
    return {
      classification: 'unknown', label: 'unavailable', ratio: null,
      supportScore: 0, pressureScore: 0, seasonRole: '', rootBranches: [],
    };
  }

  let supportScore = 0;
  let pressureScore = 0;
  const rootBranches = [];
  const scoreRole = (role, score) => {
    if (role === 'Companion' || role === 'Resource') supportScore += score;
    else if (role) pressureScore += score;
  };

  const monthElement = BRANCH_ELEMENT[pillars?.month?.branch] || '';
  const seasonRole = roles[monthElement] || '';
  scoreRole(seasonRole, 3);

  for (const key of names) {
    const pillar = pillars?.[key] || {};
    const pillarWeight = PILLAR_WEIGHTS[key];
    if (key !== 'day' && STEM_ELEMENT[pillar.stem]) {
      scoreRole(roles[STEM_ELEMENT[pillar.stem]], pillarWeight);
    }
    const hidden = HIDDEN_STEMS[pillar.branch] || [];
    const weights = hiddenStemWeights(pillar.branch);
    hidden.forEach((stem, index) => {
      const score = pillarWeight * weights[index];
      scoreRole(roles[STEM_ELEMENT[stem]], score);
      if (STEM_ELEMENT[stem] === dayElement) {
        rootBranches.push(pillar.branch);
        supportScore += score * 0.75;
      }
    });
  }

  const total = supportScore + pressureScore;
  const ratio = total > 0 ? supportScore / total : 0.5;
  const classification = ratio >= 0.62 ? 'strong' : ratio <= 0.44 ? 'weak' : 'balanced';
  const uniqueRoots = [...new Set(rootBranches)];
  const label = classification === 'weak'
    ? (supportScore > 0 ? 'weak but supported' : 'weak and unsupported')
    : classification === 'strong'
      ? 'strong'
      : 'comparatively balanced';
  return {
    classification,
    label,
    ratio,
    supportScore,
    pressureScore,
    seasonRole,
    rootBranches: uniqueRoots,
  };
}

export function balancingElementGuidance(dayMasterElement, strengthAssessment) {
  const roles = tenGodElementRoles(dayMasterElement);
  const byRoles = (...wanted) => Object.entries(roles)
    .filter(([, role]) => wanted.includes(role))
    .map(([element]) => element);
  const classification = strengthAssessment?.classification || 'unknown';
  if (classification === 'weak') {
    return {
      favorable: byRoles('Resource', 'Companion'),
      caution: byRoles('Wealth', 'Officer'),
      conditional: byRoles('Output'),
    };
  }
  if (classification === 'strong') {
    return {
      favorable: byRoles('Output', 'Wealth', 'Officer'),
      caution: byRoles('Resource', 'Companion'),
      conditional: [],
    };
  }
  return { favorable: [], caution: [], conditional: [...ELEMENTS] };
}

export function luckDirection(yearStem, gender) {
  const normalized = String(gender || '').trim().toLowerCase();
  const isMale = ['男', 'male', 'm', 'man'].includes(normalized);
  const isFemale = ['女', 'female', 'f', 'woman'].includes(normalized);
  const polarity = STEM_POLARITY[yearStem] || '';
  if ((!isMale && !isFemale) || !polarity) return { forward: null, direction: 'Unknown', basis: 'Gender or year-stem polarity is unavailable.' };
  const forward = (isMale && polarity === 'yang') || (isFemale && polarity === 'yin');
  const genderLabel = isMale ? 'Male' : 'Female';
  const polarityLabel = polarity === 'yang' ? 'Yang' : 'Yin';
  return {
    forward,
    direction: forward ? 'Forward' : 'Reverse',
    basis: `${genderLabel} birth in a ${polarityLabel}-stem year`,
  };
}

const RELATION_PAIRS = {
  six_combine: [
    ['子', '丑', 'earth'], ['寅', '亥', 'wood'], ['卯', '戌', 'fire'],
    ['辰', '酉', 'metal'], ['巳', '申', 'water'], ['午', '未', 'earth'],
  ],
  six_clash: [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']],
  six_harm: [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']],
  six_break: [['子', '酉'], ['丑', '辰'], ['寅', '亥'], ['卯', '午'], ['巳', '申'], ['未', '戌']],
  stem_combine: [
    ['甲', '己', 'earth'], ['乙', '庚', 'metal'], ['丙', '辛', 'water'],
    ['丁', '壬', 'wood'], ['戊', '癸', 'fire'],
  ],
  stem_clash: [['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸']],
};
const THREE_HARMONY = [
  ['寅', '午', '戌', 'fire'], ['巳', '酉', '丑', 'metal'],
  ['申', '子', '辰', 'water'], ['亥', '卯', '未', 'wood'],
];
const THREE_MEETING = [
  ['寅', '卯', '辰', 'wood'], ['巳', '午', '未', 'fire'],
  ['申', '酉', '戌', 'metal'], ['亥', '子', '丑', 'water'],
];
const PUNISHMENT_GROUPS = [['寅', '巳', '申'], ['丑', '未', '戌']];
const SELF_PUNISHMENT = new Set(['辰', '午', '酉', '亥']);

function pairMatch(pair, a, b) {
  return (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0]);
}

function findPair(type, a, b) {
  return RELATION_PAIRS[type].find((pair) => pairMatch(pair, a, b));
}

function relation(type, label, scope, source, target, extra = {}) {
  return { type, label, scope, source, target, ...extra };
}

function pillarEntries(pillars, hourKnown = true) {
  return (hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day'])
    .map((name) => ({ name, ...(pillars?.[name] || {}) }))
    .filter((pillar) => pillar.stem && pillar.branch);
}

export function analyzeNatalInteractions(pillars, options = {}) {
  const entries = pillarEntries(pillars, options.hourKnown !== false);
  const results = [];

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex];
      const right = entries[rightIndex];
      const stemCombine = findPair('stem_combine', left.stem, right.stem);
      const stemClash = findPair('stem_clash', left.stem, right.stem);
      const branchCombine = findPair('six_combine', left.branch, right.branch);
      const evidence = { pillars: [left.name, right.name] };

      if (stemCombine) results.push(relation('stem_combine', 'Stem combine', 'natal', left.stem, right.stem, { ...evidence, resultingElement: stemCombine[2] }));
      if (stemClash) results.push(relation('stem_clash', 'Stem clash', 'natal', left.stem, right.stem, evidence));
      if (branchCombine) results.push(relation('six_combine', 'Six combine', 'natal', left.branch, right.branch, { ...evidence, resultingElement: branchCombine[2] }));
      if (findPair('six_clash', left.branch, right.branch)) results.push(relation('six_clash', 'Six clash', 'natal', left.branch, right.branch, evidence));
      if (findPair('six_harm', left.branch, right.branch)) results.push(relation('six_harm', 'Six harm', 'natal', left.branch, right.branch, evidence));
      if (findPair('six_break', left.branch, right.branch)) results.push(relation('six_break', 'Six break', 'natal', left.branch, right.branch, evidence));
      if (left.stem === right.stem) results.push(relation('stem_repeat', 'Stem repeat', 'natal', left.stem, right.stem, evidence));
      if (left.branch === right.branch) {
        results.push(relation('branch_repeat', 'Branch repeat', 'natal', left.branch, right.branch, evidence));
        if (SELF_PUNISHMENT.has(left.branch)) results.push(relation('self_punishment', 'Self-punishment', 'natal', left.branch, right.branch, evidence));
      }
      if (`${left.stem}${left.branch}` === `${right.stem}${right.branch}`) {
        results.push(relation('fu_yin', 'Fu Yin', 'natal', `${left.stem}${left.branch}`, `${right.stem}${right.branch}`, evidence));
      }
      if (stemClash && findPair('six_clash', left.branch, right.branch)) {
        results.push(relation('fan_yin', 'Fan Yin', 'natal', `${left.stem}${left.branch}`, `${right.stem}${right.branch}`, evidence));
      }
      if ((left.branch === '子' && right.branch === '卯') || (left.branch === '卯' && right.branch === '子')) {
        results.push(relation('punishment', 'Zi-Mao punishment', 'natal', left.branch, right.branch, evidence));
      }
      const punishmentGroup = PUNISHMENT_GROUPS.find((group) => left.branch !== right.branch && group.includes(left.branch) && group.includes(right.branch));
      if (punishmentGroup) results.push(relation('punishment', 'Three-branch punishment contact', 'natal', left.branch, right.branch, { ...evidence, group: punishmentGroup.join('') }));
    }
  }

  const uniqueBranches = [...new Set(entries.map((entry) => entry.branch))];
  for (const [a, b, c, element] of THREE_HARMONY) {
    const present = [a, b, c].filter((branch) => uniqueBranches.includes(branch));
    if (present.length === 3) results.push(relation('three_harmony', 'Three Harmony', 'natal', present[0], present.join(''), { resultingElement: element }));
    else if (present.length === 2 && present.includes(b)) results.push(relation('half_harmony', 'Half Harmony', 'natal', present[0], present.join(''), { resultingElement: element }));
    else if (present.length === 2) results.push(relation('arch_harmony', 'Arch Harmony', 'natal', present[0], present.join(''), { resultingElement: element }));
  }
  for (const [a, b, c, element] of THREE_MEETING) {
    const present = [a, b, c].filter((branch) => uniqueBranches.includes(branch));
    if (present.length === 3) results.push(relation('three_meeting', 'Three Meeting', 'natal', present[0], present.join(''), { resultingElement: element }));
  }

  const key = (item) => [item.type, item.source, item.target, (item.pillars || []).join(','), item.resultingElement || ''].join('|');
  return [...new Map(results.map((item) => [key(item), item])).values()];
}

export function analyzeAnnualInteractions({ annualGz, natalPillars, luckGz = '', hourKnown = true }) {
  const annualStem = annualGz?.[0] || '';
  const annualBranch = annualGz?.[1] || '';
  if (!STEM_ELEMENT[annualStem] || !BRANCH_ELEMENT[annualBranch]) return [];
  const targets = pillarEntries(natalPillars, hourKnown).map((pillar) => ({ ...pillar, scope: 'natal' }));
  if (STEM_ELEMENT[luckGz?.[0]] && BRANCH_ELEMENT[luckGz?.[1]]) {
    targets.push({ name: 'luck', stem: luckGz[0], branch: luckGz[1], scope: 'luck' });
  }
  const results = [];

  for (const target of targets) {
    const stemCombine = findPair('stem_combine', annualStem, target.stem);
    const stemClash = findPair('stem_clash', annualStem, target.stem);
    const branchCombine = findPair('six_combine', annualBranch, target.branch);
    if (stemCombine) results.push(relation('stem_combine', 'Stem combine', target.scope, annualStem, target.stem, { pillar: target.name, resultingElement: stemCombine[2] }));
    if (stemClash) results.push(relation('stem_clash', 'Stem clash', target.scope, annualStem, target.stem, { pillar: target.name }));
    if (branchCombine) results.push(relation('six_combine', 'Six combine', target.scope, annualBranch, target.branch, { pillar: target.name, resultingElement: branchCombine[2] }));
    if (findPair('six_clash', annualBranch, target.branch)) results.push(relation('six_clash', 'Six clash', target.scope, annualBranch, target.branch, { pillar: target.name }));
    if (findPair('six_harm', annualBranch, target.branch)) results.push(relation('six_harm', 'Six harm', target.scope, annualBranch, target.branch, { pillar: target.name }));
    if (findPair('six_break', annualBranch, target.branch)) results.push(relation('six_break', 'Six break', target.scope, annualBranch, target.branch, { pillar: target.name }));
    if (annualBranch === target.branch) {
      results.push(relation('branch_repeat', 'Branch repeat', target.scope, annualBranch, target.branch, { pillar: target.name }));
      if (SELF_PUNISHMENT.has(annualBranch)) results.push(relation('self_punishment', 'Self-punishment', target.scope, annualBranch, target.branch, { pillar: target.name }));
    }
    if (annualStem === target.stem) results.push(relation('stem_repeat', 'Stem repeat', target.scope, annualStem, target.stem, { pillar: target.name }));
    if (annualGz === `${target.stem}${target.branch}`) results.push(relation('fu_yin', 'Fu Yin', target.scope, annualGz, `${target.stem}${target.branch}`, { pillar: target.name }));
    if (stemClash && findPair('six_clash', annualBranch, target.branch)) results.push(relation('fan_yin', 'Fan Yin', target.scope, annualGz, `${target.stem}${target.branch}`, { pillar: target.name }));
    if ((annualBranch === '子' && target.branch === '卯') || (annualBranch === '卯' && target.branch === '子')) {
      results.push(relation('punishment', 'Zi-Mao punishment', target.scope, annualBranch, target.branch, { pillar: target.name }));
    }
    const punishmentGroup = PUNISHMENT_GROUPS.find((group) => annualBranch !== target.branch && group.includes(annualBranch) && group.includes(target.branch));
    if (punishmentGroup) results.push(relation('punishment', 'Three-branch punishment contact', target.scope, annualBranch, target.branch, { pillar: target.name, group: punishmentGroup.join('') }));
  }

  const branchTargets = targets.map((target) => target.branch);
  for (const [a, b, c, element] of THREE_HARMONY) {
    const members = [a, b, c];
    if (!members.includes(annualBranch)) continue;
    const support = targets.filter((target) => members.includes(target.branch) && target.branch !== annualBranch);
    const present = [...new Set([annualBranch, ...branchTargets.filter((branch) => members.includes(branch))])];
    const orderedPresent = members.filter((branch) => present.includes(branch));
    const scopes = new Set(support.map((item) => item.scope));
    const scope = scopes.size > 1 ? 'natal+luck' : scopes.values().next().value || 'natal';
    const evidence = support.map((item) => ({ scope: item.scope, pillar: item.name, branch: item.branch }));
    if (present.length === 3) results.push(relation('three_harmony', 'Three Harmony', scope, annualBranch, orderedPresent.join(''), { resultingElement: element, evidence }));
    else if (present.length === 2 && present.includes(b)) results.push(relation('half_harmony', 'Half Harmony', scope, annualBranch, orderedPresent.join(''), { resultingElement: element, evidence }));
    else if (present.length === 2) results.push(relation('arch_harmony', 'Arch Harmony', scope, annualBranch, orderedPresent.join(''), { resultingElement: element, evidence }));
  }
  for (const [a, b, c, element] of THREE_MEETING) {
    const members = [a, b, c];
    if (!members.includes(annualBranch)) continue;
    const support = targets.filter((target) => members.includes(target.branch) && target.branch !== annualBranch);
    const present = [...new Set([annualBranch, ...branchTargets.filter((branch) => members.includes(branch))])];
    const orderedPresent = members.filter((branch) => present.includes(branch));
    const scopes = new Set(support.map((item) => item.scope));
    const scope = scopes.size > 1 ? 'natal+luck' : scopes.values().next().value || 'natal';
    const evidence = support.map((item) => ({ scope: item.scope, pillar: item.name, branch: item.branch }));
    if (present.length === 3) results.push(relation('three_meeting', 'Three Meeting', scope, annualBranch, orderedPresent.join(''), { resultingElement: element, evidence }));
  }

  const key = (item) => [item.type, item.scope, item.pillar || '', item.source, item.target, item.resultingElement || ''].join('|');
  return [...new Map(results.map((item) => [key(item), item])).values()];
}

export function timingPosture(interactions, stemGod = '', options = {}) {
  const types = new Set(interactions.map((item) => item.type));
  if (['fan_yin', 'six_clash', 'punishment', 'self_punishment', 'six_harm'].some((type) => types.has(type))) return 'DEFEND';
  const favorable = new Set(options.favorableElements || options.favorable || []);
  const annualElement = String(options.annualElement || '').toLowerCase();
  const supportiveResult = interactions.some((item) =>
    ['three_harmony', 'three_meeting', 'six_combine', 'half_harmony'].includes(item.type)
      && favorable.has(String(item.resultingElement || '').toLowerCase()));
  if ((annualElement && favorable.has(annualElement)) || supportiveResult) return 'ADVANCE';
  if (!favorable.size && ['three_harmony', 'three_meeting', 'six_combine', 'half_harmony'].some((type) => types.has(type))) return 'ADVANCE';
  return 'STEADY';
}
