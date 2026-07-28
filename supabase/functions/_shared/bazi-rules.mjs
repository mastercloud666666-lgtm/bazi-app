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

// Supplied Tengyunzi teaching references. These are symbolic correspondences, not
// verified biography, medical diagnosis, or guaranteed-event rules.
export const PILLAR_SYMBOLISM = Object.freeze({
  year: Object.freeze({
    stem: Object.freeze({
      family: ['father', 'paternal lineage'],
      social: ['family origin'],
      body: ['head'],
    }),
    branch: Object.freeze({
      family: ['mother', 'maternal lineage'],
      social: ['ancestral environment'],
      body: ['arms'],
    }),
    palace: Object.freeze(['ancestral palace', 'family origin']),
  }),
  month: Object.freeze({
    stem: Object.freeze({
      family: ['father', 'older siblings'],
      social: ['senior peers', 'older-brother-like contacts'],
      body: ['chest'],
    }),
    branch: Object.freeze({
      family: ['mother', 'younger siblings'],
      social: ['peer network', 'sibling-like contacts'],
      body: ['abdomen'],
    }),
    palace: Object.freeze(['parents palace', 'siblings palace', 'social-relations palace']),
  }),
  day: Object.freeze({
    stem: Object.freeze({
      family: ['self'],
      social: ['self'],
      body: ['lower abdomen'],
    }),
    branch: Object.freeze({
      family: ['spouse', "spouse's family"],
      social: ['intimate partnership'],
      body: ['buttocks'],
    }),
    palace: Object.freeze(['spouse palace', 'partnership palace']),
  }),
  hour: Object.freeze({
    stem: Object.freeze({
      family: ['eldest or first child'],
      social: ['later-life projects'],
      body: ['thighs'],
    }),
    branch: Object.freeze({
      family: ['later children'],
      social: ['legacy and descendants'],
      body: ['calves'],
    }),
    palace: Object.freeze(['children palace', 'legacy palace']),
  }),
});

export const TEN_GOD_SYMBOLISM = Object.freeze({
  Resource: Object.freeze({
    tenGods: ['正印', '偏印'],
    function: ['supports the Day Master', 'channels Officer pressure', 'can restrain Output'],
    utility: ['source of support', 'protection', 'learning and credentials'],
    kinship: ['mother', 'elders', 'maternal or extended-family figures'],
    people: ['elders', 'teachers', 'mentors'],
    matters: ['culture', 'education', 'status credentials', 'documents', 'authority seals'],
    body: ['hair', 'skin'],
    places: ['schools', 'hospitals', 'academic institutions'],
  }),
  Wealth: Object.freeze({
    tenGods: ['正财', '偏财'],
    function: ['is controlled by the Day Master', 'can drain an under-supported Day Master', 'can restrain Resource'],
    utility: ['means of livelihood', 'managed resources', 'possessions and exchange'],
    kinship: ['father', 'wife or partner in some traditional male-chart schools'],
    people: ['subordinates', 'workers', 'service providers'],
    matters: ['money', 'property', 'trade', 'managed assets'],
    body: ['essence and blood', 'breathing function'],
    places: ['business premises', 'banks', 'exchanges'],
  }),
  Officer: Object.freeze({
    tenGods: ['正官', '七杀'],
    function: ['controls the Day Master', 'creates standards and pressure', 'can produce Resource'],
    utility: ['identity and position', 'duty', 'constraint and institutional authority'],
    kinship: ['husband or partner in some traditional female-chart schools', 'children in some lineage-specific rules'],
    people: ['leaders', 'officials', 'teachers', 'enforcement figures'],
    matters: ['office', 'rank', 'law', 'discipline', 'illness symbolism'],
    body: ['injury symbolism', 'illness symbolism'],
    places: ['government institutions', 'courts', 'prisons'],
  }),
  Companion: Object.freeze({
    tenGods: ['比肩', '劫财'],
    function: ['shares the Day Master element', 'supports agency', 'competes for Wealth'],
    utility: ['help and alliance when favorable', 'competition and resource-sharing when unfavorable'],
    kinship: ['brothers', 'sisters'],
    people: ['friends', 'peers', 'partners', 'competitors'],
    matters: ['cooperation', 'competition', 'mutual help', 'shared resources'],
    body: ['hands', 'feet', 'limbs'],
    places: ['sports grounds', 'competitive venues', 'team environments'],
  }),
  Output: Object.freeze({
    tenGods: ['伤官', '食神'],
    function: ['is produced by the Day Master', 'expresses skill and ideas', 'can restrain Officer'],
    utility: ['expression', 'spiritual or creative pursuit', 'work products and reputation'],
    kinship: ['children', 'students', 'younger generations'],
    people: ['students', 'juniors', 'apprentices'],
    matters: ['expression', 'enjoyment', 'performance', 'creative work'],
    body: ['mouth', 'tongue', 'bodily openings'],
    places: ['entertainment venues', 'markets', 'performance spaces'],
  }),
});

export const FIVE_ELEMENT_CORRESPONDENCES = Object.freeze({
  wood: Object.freeze({
    organ: 'liver', bowel: 'gallbladder', season: 'spring', emotion: 'anger',
    senseOrgan: 'eyes', taste: 'sour', tissue: 'tendons',
    traditionalFunctions: ['coursing and discharge', 'stores blood'],
    fluids: ['tears'],
  }),
  fire: Object.freeze({
    organ: 'heart', bowel: 'small intestine', season: 'summer', emotion: 'joy',
    senseOrgan: 'tongue', taste: 'bitter', tissue: 'vessels',
    traditionalFunctions: ['governs blood and vessels', 'houses spirit'],
    fluids: ['sweat'],
  }),
  earth: Object.freeze({
    organ: 'spleen', bowel: 'stomach', season: 'late summer', emotion: 'pensiveness',
    senseOrgan: 'mouth', taste: 'sweet', tissue: 'flesh',
    traditionalFunctions: ['transformation and transportation', 'raises the clear', 'contains blood'],
    fluids: ['saliva'],
  }),
  metal: Object.freeze({
    organ: 'lungs', bowel: 'large intestine', season: 'autumn', emotion: 'grief',
    senseOrgan: 'nose', taste: 'pungent', tissue: 'skin and body hair',
    traditionalFunctions: ['governs qi and respiration', 'diffuses and descends', 'regulates water passages'],
    fluids: ['nasal mucus'],
  }),
  water: Object.freeze({
    organ: 'kidneys', bowel: 'bladder', season: 'winter', emotion: 'fear',
    senseOrgan: 'ears', taste: 'salty', tissue: 'bones',
    traditionalFunctions: ['stores essence', 'governs growth and reproduction', 'governs water'],
    fluids: ['spittle'],
  }),
});

export const VOID_ROLE_ASSOCIATIONS = Object.freeze({
  Companion: Object.freeze({
    domains: ['siblings', 'friends', 'colleagues', 'peers', 'partnership support', 'hands and feet symbolism'],
    traditionalReading: 'connection, support, or collaboration may be less available or less durable',
  }),
  Output: Object.freeze({
    domains: ['children', 'subordinates', 'students', 'apprentices', 'expression and projects'],
    traditionalReading: 'continuity, expression, or generational connection may feel less direct',
  }),
  Resource: Object.freeze({
    domains: ['mother', 'elders', 'education', 'applications', 'contracts', 'documents and credentials'],
    traditionalReading: 'support, approval, or documentation may be delayed, returned, or less tangible',
  }),
  Wealth: Object.freeze({
    domains: ['father', 'money', 'assets', 'resource retention', 'wife symbolism in some male-chart schools'],
    traditionalReading: 'resources may circulate without accumulating or require stronger retention systems',
  }),
  Officer: Object.freeze({
    domains: ['position', 'institutional authority', 'career title', 'husband symbolism in some female-chart schools', 'children symbolism in some male-chart schools'],
    traditionalReading: 'formal recognition, role stability, or institutional support may be reduced or delayed',
  }),
});

export const TENGYUNZI_ENERGY_SCALE = Object.freeze({
  exposedFromBranch: Object.freeze({ multiplier: '>2', condition: 'a branch element is exposed through a matching Heavenly Stem' }),
  rootedStem: Object.freeze({ multiplier: '>2', condition: 'a Heavenly Stem has a matching root in an Earthly Branch' }),
  three_harmony: Object.freeze({ withStemCatalyst: 15, withoutStemCatalyst: Object.freeze([7, 8]) }),
  half_harmony: Object.freeze({ withStemCatalyst: 10, withoutStemCatalyst: 5 }),
  six_combine: Object.freeze({ withStemCatalyst: 10, withoutStemCatalyst: 5 }),
  three_meeting: Object.freeze({ withStemCatalyst: 20, withoutStemCatalyst: 10 }),
  punishment_chou_wei_xu: Object.freeze({ withStemCatalyst: 15, withoutStemCatalyst: Object.freeze([7, 8]) }),
  punishment_yin_si_shen: Object.freeze({ withStemCatalyst: 10, withoutStemCatalyst: 5 }),
  self_punishment: Object.freeze({ withStemCatalyst: 10, withoutStemCatalyst: 5 }),
  tomb_clash: Object.freeze({ withStemCatalyst: 10, withoutStemCatalyst: 5 }),
});

export const ENERGY_MAGNITUDE_BANDS = Object.freeze([
  Object.freeze({ min: 1, max: 3, label: 'small' }),
  Object.freeze({ min: 3, max: 7, label: 'medium' }),
  Object.freeze({ min: 10, max: 15, label: 'large' }),
  Object.freeze({ min: 20, max: Infinity, label: 'extreme' }),
]);

// Retained for source fidelity only. These claims must never be emitted as a
// diagnosis, sentence of death, imprisonment prediction, self-harm claim, or
// guaranteed event. Customer reports may use only the neutral category name.
export const RESTRICTED_TRADITIONAL_SEVERITY_ASSOCIATIONS = Object.freeze({
  seven_killings_attacks_self: Object.freeze({
    small: ['authority friction'], medium: ['illness symbolism'],
    large: ['confinement or legal symbolism'], extreme: ['mortality symbolism'],
  }),
  hurting_officer_attacks_officer: Object.freeze({
    small: ['verbal dispute'], medium: ['open conflict'],
    large: ['legal dispute symbolism'], extreme: ['self-injury symbolism'],
  }),
  indirect_resource_overcomes_eating_god: Object.freeze({
    small: ['low mood or self-talk symbolism'], medium: ['sleep or psychological-distress symbolism'],
    large: ['self-harm symbolism'], extreme: ['harm-to-self-or-others symbolism'],
  }),
  rob_wealth_attacks_wealth: Object.freeze({
    small: ['minor resource loss'], medium: ['major resource loss'],
    large: ['major loss and family-strain symbolism'], extreme: ['severe loss and spouse-or-father strain symbolism'],
  }),
  calamity_or_confinement: Object.freeze({
    small: ['illness symbolism'], medium: ['confinement symbolism'],
    large: ['injury and confinement symbolism'], extreme: ['mortality symbolism'],
  }),
  blood_blade: Object.freeze({
    small: ['minor injury symbolism'], medium: ['significant bleeding-event symbolism'],
    large: ['disability symbolism'], extreme: ['mortality symbolism'],
  }),
});

export const INDIRECT_RESOURCE_OVERCOMES_OUTPUT = Object.freeze({
  metal_over_wood: Object.freeze(['limb-injury symbolism']),
  wood_over_earth: Object.freeze(['abdominal-procedure or bleeding symbolism']),
  earth_over_water: Object.freeze(['sudden external-injury symbolism']),
  water_over_fire: Object.freeze(['water danger', 'sexual-health symbolism', 'food-poisoning symbolism']),
  fire_over_metal: Object.freeze(['fracture', 'burn', 'skin-condition symbolism']),
});

export const TOMB_STORAGE_BRANCHES = Object.freeze(['辰', '戌', '丑', '未']);
export const TOMB_STORAGE_CONTACTS = Object.freeze({
  辰: Object.freeze({ clash: '戌', harm: '卯', break: '丑', combine: '酉' }),
  戌: Object.freeze({ clash: '辰', harm: '酉', break: '未', combine: '卯' }),
  丑: Object.freeze({ clash: '未', harm: '午', break: '辰', combine: '子' }),
  未: Object.freeze({ clash: '丑', harm: '子', break: '戌', combine: '午' }),
});

export const FIVE_GHOST_WEALTH_BY_MONTH_BRANCH = Object.freeze({
  子: '辰', 丑: '巳', 寅: '午', 卯: '未', 辰: '申', 巳: '酉',
  午: '戌', 未: '亥', 申: '子', 酉: '丑', 戌: '寅', 亥: '卯',
});

// The supplied image describes 午未 as Fire, while the canonical Six-Combine
// association used by this engine is Earth. Preserve the lineage variant without
// silently replacing the canonical calculation.
export const SIX_COMBINE_SCHOOL_VARIANTS = Object.freeze({
  午未: Object.freeze(['fire']),
});

export const YUAN_CHEN_BY_YEAR_BRANCH = Object.freeze({
  子: Object.freeze({ yinMaleYangFemale: '巳', yangMaleYinFemale: '未' }),
  丑: Object.freeze({ yinMaleYangFemale: '午', yangMaleYinFemale: '申' }),
  寅: Object.freeze({ yinMaleYangFemale: '未', yangMaleYinFemale: '酉' }),
  卯: Object.freeze({ yinMaleYangFemale: '申', yangMaleYinFemale: '戌' }),
  辰: Object.freeze({ yinMaleYangFemale: '酉', yangMaleYinFemale: '亥' }),
  巳: Object.freeze({ yinMaleYangFemale: '戌', yangMaleYinFemale: '子' }),
  午: Object.freeze({ yinMaleYangFemale: '亥', yangMaleYinFemale: '丑' }),
  未: Object.freeze({ yinMaleYangFemale: '子', yangMaleYinFemale: '寅' }),
  申: Object.freeze({ yinMaleYangFemale: '丑', yangMaleYinFemale: '卯' }),
  酉: Object.freeze({ yinMaleYangFemale: '寅', yangMaleYinFemale: '辰' }),
  戌: Object.freeze({ yinMaleYangFemale: '卯', yangMaleYinFemale: '巳' }),
  亥: Object.freeze({ yinMaleYangFemale: '辰', yangMaleYinFemale: '午' }),
});

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

export const LU_POSITION_MEANINGS = Object.freeze({
  year: 'Traditional emphasis on family resources, early environment, and inherited support.',
  month: 'Traditional emphasis on resources and opportunity during education or early career.',
  day: 'Traditional emphasis on personally managed resources and middle-life livelihood.',
  hour: 'Traditional emphasis on later-life resources, projects, children, or legacy.',
});

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

export function symbolicRoleForTenGod(name) {
  return Object.entries(TEN_GOD_SYMBOLISM)
    .find(([, value]) => value.tenGods.includes(name))?.[0] || '';
}

export function pillarSymbolism(pillarName) {
  return PILLAR_SYMBOLISM[pillarName] || null;
}

export function voidBranchesForPillar(gz) {
  const stem = String(gz || '')[0] || '';
  const branch = String(gz || '')[1] || '';
  const cycleIndex = Array.from({ length: 60 }, (_, index) => ({
    index,
    stem: STEMS[index % 10],
    branch: BRANCHES[index % 12],
  })).find((item) => item.stem === stem && item.branch === branch)?.index;
  if (!Number.isInteger(cycleIndex)) return [];
  const xunStart = Math.floor(cycleIndex / 10) * 10;
  const used = new Set(Array.from({ length: 10 }, (_, offset) => BRANCHES[(xunStart + offset) % 12]));
  return BRANCHES.filter((item) => !used.has(item));
}

export function voidAnalysis(pillars, options = {}) {
  const hourKnown = options.hourKnown !== false;
  const dayStem = String(pillars?.day?.stem || '');
  const dayBranch = String(pillars?.day?.branch || '');
  const voidBranches = voidBranchesForPillar(`${dayStem}${dayBranch}`);
  const names = hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day'];
  const affected = names.flatMap((pillar) => {
    const branch = String(pillars?.[pillar]?.branch || '');
    if (!voidBranches.includes(branch)) return [];
    const gods = [...new Set((HIDDEN_STEMS[branch] || []).map((stem) => tenGod(dayStem, stem)).filter(Boolean))];
    const roles = [...new Set(gods.map(symbolicRoleForTenGod).filter(Boolean))];
    return [{
      pillar,
      branch,
      tenGods: gods,
      roles,
      symbolism: roles.map((role) => ({
        role,
        ...VOID_ROLE_ASSOCIATIONS[role],
      })),
    }];
  });
  return {
    basis: 'Day Pillar Xun Kong',
    dayPillar: `${dayStem}${dayBranch}`,
    voidBranches,
    affected,
    interpretation: 'Traditional void indicates reduced visibility, availability, or durability; it does not mean literal nonexistence or guarantee loss.',
  };
}

export function indirectResourceOvercomesEatingGodProfile(pillars, options = {}) {
  const hourKnown = options.hourKnown !== false;
  const dayStem = String(pillars?.day?.stem || '');
  const entries = pillarEntries(pillars, hourKnown);
  const occurrences = entries.flatMap((entry) => {
    const visible = entry.name !== 'day' && entry.stem
      ? [{ pillar: entry.name, layer: 'visible', stem: entry.stem, tenGod: tenGod(dayStem, entry.stem) }]
      : [];
    const hidden = (HIDDEN_STEMS[entry.branch] || []).map((stem) => ({
      pillar: entry.name,
      layer: 'hidden',
      stem,
      tenGod: tenGod(dayStem, stem),
    }));
    return [...visible, ...hidden];
  });
  const indirectResource = occurrences.filter((item) => item.tenGod === '偏印');
  const eatingGod = occurrences.filter((item) => item.tenGod === '食神');
  if (!indirectResource.length || !eatingGod.length) {
    return {
      present: false,
      status: 'not_detected',
      indirectResource,
      eatingGod,
      restrictedAssociations: [],
    };
  }
  const sourceElement = charElement(indirectResource[0].stem);
  const targetElement = charElement(eatingGod[0].stem);
  const key = `${sourceElement}_over_${targetElement}`;
  return {
    present: true,
    status: 'symbolic_contact_only',
    indirectResource,
    eatingGod,
    sourceElement,
    targetElement,
    restrictedAssociations: INDIRECT_RESOURCE_OVERCOMES_OUTPUT[key] || [],
    interpretation: 'The supplied school treats simultaneous Indirect Resource and Eating God as a possible Resource-over-Output tension. Presence alone does not establish bodily harm or an event.',
    customerVisiblePredictionAllowed: false,
  };
}

export function relationEnergyReference(type, options = {}) {
  let key = type;
  if (type === 'punishment') {
    const group = String(options.group || '');
    key = group === '丑未戌' ? 'punishment_chou_wei_xu'
      : group === '寅巳申' ? 'punishment_yin_si_shen'
        : '';
  }
  if (type === 'six_clash' && ['辰戌', '戌辰', '丑未', '未丑'].includes(String(options.pair || ''))) {
    key = 'tomb_clash';
  }
  const rule = TENGYUNZI_ENERGY_SCALE[key];
  if (!rule) return null;
  const raw = options.hasStemCatalyst ? rule.withStemCatalyst : rule.withoutStemCatalyst;
  const range = Array.isArray(raw) ? raw : [raw, raw];
  const representative = range.reduce((sum, value) => sum + value, 0) / range.length;
  return {
    method: 'Tengyunzi relative teaching scale',
    hasStemCatalyst: Boolean(options.hasStemCatalyst),
    relativeMultiplier: raw,
    magnitude: energyMagnitude(representative),
    disclaimer: 'A comparative symbolic scale, not a physical measurement and not proof that transformation has completed.',
  };
}

export function energyMagnitude(value) {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0) return 'unknown';
  const found = ENERGY_MAGNITUDE_BANDS.find((band) => score >= band.min && score <= band.max);
  if (found) return found.label;
  if (score > 7 && score < 10) return 'medium-high';
  if (score > 15 && score < 20) return 'very large';
  return score === 0 ? 'none' : 'unknown';
}

export function fiveGhostWealthMarker(monthBranch) {
  const target = FIVE_GHOST_WEALTH_BY_MONTH_BRANCH[String(monthBranch || '')] || '';
  return target ? {
    monthBranch: String(monthBranch),
    targetBranch: target,
    name: 'Five Ghost Wealth marker',
    interpretation: 'A lineage-specific auxiliary marker for opportunistic or windfall-style exchange, traditionally paired with caution around disputes and unreliable counterparties.',
    evidenceLevel: 'auxiliary',
  } : null;
}

export function yuanChenMarker(yearStem, yearBranch, gender) {
  const table = YUAN_CHEN_BY_YEAR_BRANCH[String(yearBranch || '')];
  const polarity = STEM_POLARITY[String(yearStem || '')] || '';
  const normalized = String(gender || '').trim().toLowerCase();
  const male = ['男', 'male', 'm', 'man'].includes(normalized);
  const female = ['女', 'female', 'f', 'woman'].includes(normalized);
  if (!table || !polarity || (!male && !female)) return null;
  const yangMaleYinFemale = (male && polarity === 'yang') || (female && polarity === 'yin');
  return {
    name: 'Yuan Chen',
    english: 'Yuan Chen / Great Depletion marker',
    branch: yangMaleYinFemale ? table.yangMaleYinFemale : table.yinMaleYangFemale,
    basis: yangMaleYinFemale ? 'Yang-year male or Yin-year female table' : 'Yin-year male or Yang-year female table',
    evidenceLevel: 'auxiliary',
    interpretation: 'A lineage-specific depletion or complication marker; it cannot independently establish loss, illness, or an event.',
  };
}

export function traditionalReferenceProfile(pillars, options = {}) {
  const hourKnown = options.hourKnown !== false;
  const entries = pillarEntries(pillars, hourKnown);
  const fiveGhost = fiveGhostWealthMarker(pillars?.month?.branch);
  const fiveGhostPlacements = fiveGhost
    ? entries.filter((entry) => entry.branch === fiveGhost.targetBranch)
      .map((entry) => ({ pillar: entry.name, branch: entry.branch }))
    : [];
  const yuanChen = yuanChenMarker(pillars?.year?.stem, pillars?.year?.branch, options.gender);
  const yuanChenPlacements = yuanChen
    ? entries.filter((entry) => entry.branch === yuanChen.branch)
      .map((entry) => ({ pillar: entry.name, branch: entry.branch }))
    : [];
  return {
    methodology: 'Tengyunzi supplied-reference layer',
    pillarSymbolism: Object.fromEntries(entries.map((entry) => [entry.name, PILLAR_SYMBOLISM[entry.name]])),
    void: voidAnalysis(pillars, { hourKnown }),
    exposureAndRooting: exposureAndRootingProfile(pillars, { hourKnown }),
    tenGodSymbolism: TEN_GOD_SYMBOLISM,
    indirectResourceOvercomesEatingGod: indirectResourceOvercomesEatingGodProfile(pillars, { hourKnown }),
    fiveGhostWealth: fiveGhost ? { ...fiveGhost, placements: fiveGhostPlacements } : null,
    yuanChen: yuanChen ? { ...yuanChen, placements: yuanChenPlacements } : null,
    fiveElementCorrespondences: FIVE_ELEMENT_CORRESPONDENCES,
    safeguards: {
      symbolicNotBiographicalFact: true,
      noMedicalDiagnosis: true,
      noGuaranteedEvents: true,
      noDeathOrSelfHarmPrediction: true,
      restrictedSeverityAssociationsCustomerVisible: false,
    },
  };
}

export function tombStorageContacts({ incomingBranch, natalPillars, hourKnown = true }) {
  const branch = String(incomingBranch || '');
  if (!BRANCH_ELEMENT[branch]) return [];
  const entries = pillarEntries(natalPillars, hourKnown);
  const presentBranches = new Set([branch, ...entries.map((entry) => entry.branch)]);
  return entries.flatMap((entry) => {
    if (!TOMB_STORAGE_BRANCHES.includes(entry.branch)) return [];
    const rules = TOMB_STORAGE_CONTACTS[entry.branch];
    const contactType = Object.entries(rules).find(([, target]) => target === branch)?.[0] || '';
    const triplePunishment = ['丑', '未', '戌'].every((member) => presentBranches.has(member));
    if (!contactType && !triplePunishment) return [];
    return [{
      type: 'tomb_storage_contact',
      label: 'Tomb-storage activation contact',
      incomingBranch: branch,
      tombBranch: entry.branch,
      pillar: entry.name,
      contactType: triplePunishment && ['丑', '未', '戌'].includes(entry.branch) ? 'three_punishment' : contactType,
      status: 'contact_only',
      interpretation: 'The supplied school treats clash, harm, break, combine, or full 丑未戌 punishment as a possible opening contact. Whether stored qi is actually released requires full-chart strength and transformation review.',
    }];
  });
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
  return results.map((item) => item.name === '禄神'
    ? { ...item, positionMeaning: LU_POSITION_MEANINGS[item.pillar] || '' }
    : item);
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

export function exposureAndRootingProfile(pillars, options = {}) {
  const hourKnown = options.hourKnown !== false;
  const entries = pillarEntries(pillars, hourKnown);
  return ELEMENTS.map((element) => {
    const exposedStems = entries.filter((entry) => STEM_ELEMENT[entry.stem] === element)
      .map((entry) => ({ pillar: entry.name, stem: entry.stem }));
    const roots = entries.flatMap((entry) => (HIDDEN_STEMS[entry.branch] || [])
      .filter((stem) => STEM_ELEMENT[stem] === element)
      .map((stem) => ({ pillar: entry.name, branch: entry.branch, hiddenStem: stem })));
    return {
      element,
      exposedStems,
      roots,
      branchQiExposed: exposedStems.length > 0 && roots.length > 0,
      stemRooted: exposedStems.length > 0 && roots.length > 0,
      referenceMultiplier: exposedStems.length > 0 && roots.length > 0 ? '>2' : '1',
      method: 'Tengyunzi exposure-and-rooting reference',
    };
  });
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

/**
 * Detects classical special patterns before ordinary strong/weak balancing.
 *
 * The Cong Er (从儿 / Follow-the-Child) branch follows the 顺局 chapter of
 * Di Tian Sui Chan Wei:
 * - Output must command the Month Branch and form the dominant current.
 * - Wealth must be present so "the child produces its child" (食伤生财).
 * - Resource must not break the current; exposed Officer also counts against it.
 * - Companion roots do not by themselves disqualify Cong Er because Companion
 *   can continue to produce Output.
 *
 * This detector deliberately returns the evidence and failure conditions so a
 * model cannot silently fall back to ordinary weak-Day-Master balancing.
 */
export function assessClassicalSpecialPattern(pillars, options = {}) {
  const hourKnown = options.hourKnown !== false;
  const dayStem = String(pillars?.day?.stem || '');
  const dayElement = STEM_ELEMENT[dayStem] || '';
  const roles = tenGodElementRoles(dayElement);
  const monthElement = BRANCH_ELEMENT[pillars?.month?.branch] || '';
  if (!dayElement || !Object.keys(roles).length) {
    return {
      pattern: 'unknown',
      label: 'Unavailable',
      qualified: false,
      classicalPriority: false,
      evidence: [],
      disqualifiers: ['Day Master or Month Branch is unavailable.'],
    };
  }

  const roleElement = (wantedRole) => Object.entries(roles)
    .find(([, role]) => role === wantedRole)?.[0] || '';
  const outputElement = roleElement('Output');
  const wealthElement = roleElement('Wealth');
  const officerElement = roleElement('Officer');
  const resourceElement = roleElement('Resource');
  const companionElement = roleElement('Companion');
  const profile = weightedTenGodProfile(pillars, { hourKnown });
  const byNames = (...names) => profile
    .filter((item) => names.includes(item.name))
    .reduce((sum, item) => sum + Number(item.exactPercentage || 0), 0);
  const outputShare = byNames('食神', '伤官');
  const wealthShare = byNames('偏财', '正财');
  const officerShare = byNames('七杀', '正官');
  const resourceShare = byNames('偏印', '正印');
  const names = hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day'];
  const visibleRoleCount = (element) => names
    .filter((name) => name !== 'day')
    .filter((name) => STEM_ELEMENT[pillars?.[name]?.stem] === element).length;
  const hiddenRoleCount = (element) => names.reduce((sum, name) => sum
    + (HIDDEN_STEMS[pillars?.[name]?.branch] || [])
      .filter((stem) => STEM_ELEMENT[stem] === element).length, 0);

  const outputCommandsMonth = monthElement === outputElement;
  const outputDominant = outputShare >= 45;
  const outputExposed = visibleRoleCount(outputElement) > 0;
  const wealthPresent = visibleRoleCount(wealthElement) + hiddenRoleCount(wealthElement) > 0;
  const resourcePresent = visibleRoleCount(resourceElement) + hiddenRoleCount(resourceElement) > 0;
  const officerExposed = visibleRoleCount(officerElement) > 0;
  const officerMinorAndHidden = !officerExposed && officerShare <= 10;
  const qualified = outputCommandsMonth
    && outputDominant
    && outputExposed
    && wealthPresent
    && !resourcePresent
    && officerMinorAndHidden;

  const evidence = [
    outputCommandsMonth ? 'Output commands the Month Branch (食伤在提纲).' : '',
    outputDominant ? `Output is the dominant Ten-God current (${outputShare.toFixed(1)}%).` : '',
    outputExposed ? 'Output is exposed on a non-Day Heavenly Stem.' : '',
    wealthPresent ? `Wealth is present (${wealthShare.toFixed(1)}%), completing 食伤生财.` : '',
    !resourcePresent ? 'Resource is absent in both visible and hidden layers, so no 印星破局 is present.' : '',
    officerMinorAndHidden ? `Officer is hidden and minor (${officerShare.toFixed(1)}%), not an exposed counter-current.` : '',
  ].filter(Boolean);
  const disqualifiers = [
    !outputCommandsMonth ? 'Output does not command the Month Branch.' : '',
    !outputDominant ? 'Output does not dominate the chart current.' : '',
    !outputExposed ? 'Output is not exposed.' : '',
    !wealthPresent ? 'Wealth is absent, so “the child produces its child” is not completed.' : '',
    resourcePresent ? 'Resource is present and can overcome Output.' : '',
    officerExposed ? 'Officer is exposed and opposes the Output current.' : '',
    !officerMinorAndHidden && !officerExposed ? 'Hidden Officer is too strong to remain a minor impurity.' : '',
  ].filter(Boolean);

  return {
    pattern: qualified ? 'cong_er' : 'standard',
    label: qualified ? 'Cong Er / Follow-the-Child (从儿格、顺局)' : 'No qualifying special pattern detected',
    qualified,
    classicalPriority: qualified,
    dayMasterElement: dayElement,
    monthElement,
    roleElements: {
      companion: companionElement,
      output: outputElement,
      wealth: wealthElement,
      officer: officerElement,
      resource: resourceElement,
    },
    roleShares: {
      output: outputShare,
      wealth: wealthShare,
      officer: officerShare,
      resource: resourceShare,
    },
    evidence,
    disqualifiers,
    elementGuidance: qualified ? {
      favorable: [outputElement, wealthElement],
      conditional: [companionElement],
      caution: [officerElement],
      stronglyUnfavorable: [resourceElement],
      explanation: 'Follow the dominant Output → Wealth current. Resource reverses and attacks Output; Officer is the secondary counter-current. Companion is conditional because it can feed Output, but excessive dry Companion may bury Output or seize Wealth.',
    } : null,
    classicalBasis: qualified ? {
      work: '《滴天髓阐微》',
      chapter: '顺局',
      verse: '一出门来只见儿，吾儿成气构门闾；从儿不管身强弱，只要吾儿又得儿。',
      verseEnglish: 'Once outside the gate, only the child is seen; when the child forms the current, it establishes the household. In Follow-the-Child, do not judge by whether the self is strong or weak; what matters is that the child in turn produces its own child.',
      application: 'Month-command Output is the child; Wealth is the child of Output. Companion roots alone do not cancel the pattern when they continue to produce Output.',
      sourceNoteEnglish: 'Di Tian Sui (Dripping Heavenly Essence) is traditionally attributed to the otherwise obscure Song-dynasty figure Jing Tu; its exact composition year is uncertain. The received early commentary is traditionally attributed to Liu Ji (1311–1375), a scholar, strategist, writer, and founding statesman of the Ming dynasty. Di Tian Sui Chan Wei is the expanded Qing-dynasty exposition prepared during the Daoguang reign (1821–1850) by Ren Tieqiao, a scholar and professional practitioner of Chinese fate calculation, commonly dated 1773–1840.',
      attributionStatus: 'Traditional attribution; the original composition date and Jing Tu biography are not securely documented.',
    } : null,
  };
}

export function balancingElementGuidance(dayMasterElement, strengthAssessment, specialPattern = null) {
  if (specialPattern?.qualified && specialPattern?.elementGuidance) {
    return {
      favorable: [...specialPattern.elementGuidance.favorable],
      caution: [
        ...specialPattern.elementGuidance.caution,
        ...specialPattern.elementGuidance.stronglyUnfavorable,
      ],
      conditional: [...specialPattern.elementGuidance.conditional],
      pattern: specialPattern.pattern,
      basis: 'classical-special-pattern',
    };
  }
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

function decorateInteraction(item, stems) {
  const resultingElement = String(item.resultingElement || '');
  const hasStemCatalyst = Boolean(resultingElement)
    && stems.some((stem) => STEM_ELEMENT[stem] === resultingElement);
  const pair = `${item.source || ''}${item.target || ''}`;
  const energyReference = relationEnergyReference(item.type, {
    hasStemCatalyst,
    group: item.group,
    pair,
  });
  const transformation = resultingElement ? {
    status: 'contact_only',
    associatedElement: resultingElement,
    stemCatalystPresent: hasStemCatalyst,
    conditionsEvaluated: false,
    note: 'The relationship is present, but seasonal command, rooting, obstruction, competition, and break conditions have not been fully resolved; do not state that transformation completed.',
  } : undefined;
  const normalizedPair = [String(item.source || ''), String(item.target || '')].sort().join('');
  const schoolVariants = item.type === 'six_combine'
    ? SIX_COMBINE_SCHOOL_VARIANTS[normalizedPair] || []
    : [];
  return {
    ...item,
    ...(transformation ? { transformation } : {}),
    ...(schoolVariants.length ? {
      schoolVariants: schoolVariants.map((element) => ({
        associatedElement: element,
        source: 'supplied Tengyunzi image reference',
        canonicalElementRetained: resultingElement,
      })),
    } : {}),
    ...(energyReference ? { energyReference } : {}),
  };
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
  const unique = [...new Map(results.map((item) => [key(item), item])).values()];
  return unique.map((item) => decorateInteraction(item, entries.map((entry) => entry.stem)));
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
  const unique = [...new Map(results.map((item) => [key(item), item])).values()];
  return unique.map((item) => decorateInteraction(item, [annualStem, ...targets.map((target) => target.stem)]));
}

export function timingAssessment(interactions, options = {}) {
  const types = new Set(interactions.map((item) => item.type));
  const favorable = new Set(options.favorableElements || options.favorable || []);
  const conditional = new Set(options.conditionalElements || options.conditional || []);
  const annualElement = String(options.annualElement || '').toLowerCase();
  const favorableAnnual = Boolean(annualElement && favorable.has(annualElement));
  const conditionalAnnual = Boolean(annualElement && conditional.has(annualElement));
  const supportiveResult = interactions.some((item) =>
    ['three_harmony', 'three_meeting', 'six_combine', 'half_harmony'].includes(item.type)
      && favorable.has(String(item.resultingElement || '').toLowerCase()));
  const supportScore = (favorableAnnual ? 2 : conditionalAnnual ? 1 : 0) + (supportiveResult ? 1 : 0);
  const pressureScore = interactions.reduce((score, item) => score + (
    ['fan_yin', 'six_clash', 'punishment', 'self_punishment'].includes(item.type) ? 2
      : ['six_harm', 'six_break', 'stem_clash'].includes(item.type) ? 1
        : 0
  ), 0);
  const changeScore = interactions.reduce((score, item) => score + (
    ['three_harmony', 'three_meeting', 'six_combine', 'half_harmony', 'fan_yin', 'fu_yin', 'six_clash'].includes(item.type) ? 2
      : ['stem_combine', 'stem_clash', 'branch_repeat', 'stem_repeat', 'punishment', 'six_harm', 'six_break'].includes(item.type) ? 1
        : 0
  ), 0);
  const level = (score) => score >= 4 ? 'HIGH' : score >= 2 ? 'MEDIUM' : 'LOW';
  const decisionPosture = pressureScore >= 3
    ? supportScore > 0 ? 'SELECTIVE ADVANCE' : 'HOLD & PROTECT'
    : supportScore >= 2
      ? pressureScore > 0 ? 'SELECTIVE ADVANCE' : 'SUPPORTED ADVANCE'
      : supportScore > 0 ? 'SELECTIVE ADVANCE' : 'STEADY';
  const supportBasis = [
    favorableAnnual ? `the annual ${annualElement[0].toUpperCase()}${annualElement.slice(1)} element is a favorable support signal` : '',
    conditionalAnnual ? `the annual ${annualElement[0].toUpperCase()}${annualElement.slice(1)} element is a conditional support signal` : '',
    supportiveResult ? 'a combination resolves into a favorable element' : '',
  ].filter(Boolean).join(' and ');
  const postureReason = decisionPosture === 'SUPPORTED ADVANCE'
    ? 'Support is clear and material pressure is absent, so a defined plan can move forward.'
    : decisionPosture === 'SELECTIVE ADVANCE' && pressureScore >= 3
      ? `${supportBasis || 'At least one support signal remains'}, but pressure is high; use reversible steps, narrow scope, and explicit limits.`
      : decisionPosture === 'SELECTIVE ADVANCE'
        ? 'Support and pressure coexist; stage commitments and preserve reversal options.'
        : decisionPosture === 'HOLD & PROTECT'
          ? 'Pressure outweighs structural support; protect time, liquidity, and decision quality.'
          : 'Neither acceleration nor protection dominates; maintain pace and verify assumptions.';
  return {
    supportLevel: level(supportScore),
    pressureLevel: level(pressureScore),
    changeIntensity: level(changeScore),
    decisionPosture,
    confidence: interactions.length >= 2 ? 'MEDIUM' : 'LOW',
    supportScore,
    pressureScore,
    changeScore,
    postureReason,
    supportBasis: supportBasis || 'no favorable or conditional support signal is counted',
  };
}

export function timingPosture(interactions, stemGod = '', options = {}) {
  return timingAssessment(interactions, options).decisionPosture;
}
