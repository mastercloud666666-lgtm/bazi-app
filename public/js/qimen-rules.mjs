const PALACES = Object.freeze([
  { index: 0, number: 4, key: 'xun', trigram: 'Xun', direction: 'Southeast', element: 'Wood' },
  { index: 1, number: 9, key: 'li', trigram: 'Li', direction: 'South', element: 'Fire' },
  { index: 2, number: 2, key: 'kun', trigram: 'Kun', direction: 'Southwest', element: 'Earth' },
  { index: 3, number: 3, key: 'zhen', trigram: 'Zhen', direction: 'East', element: 'Wood' },
  { index: 4, number: 5, key: 'center', trigram: 'Center', direction: 'Center', element: 'Earth' },
  { index: 5, number: 7, key: 'dui', trigram: 'Dui', direction: 'West', element: 'Metal' },
  { index: 6, number: 8, key: 'gen', trigram: 'Gen', direction: 'Northeast', element: 'Earth' },
  { index: 7, number: 1, key: 'kan', trigram: 'Kan', direction: 'North', element: 'Water' },
  { index: 8, number: 6, key: 'qian', trigram: 'Qian', direction: 'Northwest', element: 'Metal' },
]);

const PALACE_INDEX_BY_NUMBER = Object.freeze(
  Object.fromEntries(PALACES.map((palace) => [palace.number, palace.index])),
);

const STEMS = Object.freeze(['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui']);
const BRANCHES = Object.freeze(['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai']);
const EARTH_STEM_SEQUENCE = Object.freeze(['Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui', 'Ding', 'Bing', 'Yi']);
const CLOCKWISE_PATH = Object.freeze([0, 1, 2, 5, 8, 7, 6, 3]);
const COUNTER_CLOCKWISE_PATH = Object.freeze([0, 3, 6, 7, 8, 5, 2, 1]);
const DOOR_YANG_PATH = Object.freeze([7, 2, 3, 0, 4, 8, 5, 6, 1]);
const DOOR_YIN_PATH = Object.freeze([7, 1, 6, 5, 8, 4, 0, 3, 2]);
const CENTER_SUBSTITUTE = 2;

const TERM_CONFIG = Object.freeze({
  'winter-solstice': { name: 'Winter Solstice', isYang: true, ju: [1, 7, 4] },
  'minor-cold': { name: 'Minor Cold', isYang: true, ju: [2, 8, 5] },
  'major-cold': { name: 'Major Cold', isYang: true, ju: [3, 9, 6] },
  'start-of-spring': { name: 'Start of Spring', isYang: true, ju: [8, 5, 2] },
  'rain-water': { name: 'Rain Water', isYang: true, ju: [9, 6, 3] },
  'awakening-of-insects': { name: 'Awakening of Insects', isYang: true, ju: [1, 7, 4] },
  'spring-equinox': { name: 'Spring Equinox', isYang: true, ju: [3, 9, 6] },
  'pure-brightness': { name: 'Pure Brightness', isYang: true, ju: [4, 1, 7] },
  'grain-rain': { name: 'Grain Rain', isYang: true, ju: [5, 2, 8] },
  'start-of-summer': { name: 'Start of Summer', isYang: true, ju: [4, 1, 7] },
  'grain-buds': { name: 'Grain Buds', isYang: true, ju: [5, 2, 8] },
  'grain-in-ear': { name: 'Grain in Ear', isYang: true, ju: [6, 3, 9] },
  'summer-solstice': { name: 'Summer Solstice', isYang: false, ju: [9, 3, 6] },
  'minor-heat': { name: 'Minor Heat', isYang: false, ju: [8, 2, 5] },
  'major-heat': { name: 'Major Heat', isYang: false, ju: [7, 1, 4] },
  'start-of-autumn': { name: 'Start of Autumn', isYang: false, ju: [2, 5, 8] },
  'limit-of-heat': { name: 'Limit of Heat', isYang: false, ju: [1, 4, 7] },
  'white-dew': { name: 'White Dew', isYang: false, ju: [9, 3, 6] },
  'autumn-equinox': { name: 'Autumn Equinox', isYang: false, ju: [7, 1, 4] },
  'cold-dew': { name: 'Cold Dew', isYang: false, ju: [6, 9, 3] },
  'frost-descent': { name: 'Frost Descent', isYang: false, ju: [5, 8, 2] },
  'start-of-winter': { name: 'Start of Winter', isYang: false, ju: [6, 9, 3] },
  'minor-snow': { name: 'Minor Snow', isYang: false, ju: [5, 8, 2] },
  'major-snow': { name: 'Major Snow', isYang: false, ju: [4, 7, 1] },
});

const STARS = Object.freeze([
  {
    id: 'tian-fu', name: 'Tian Fu', label: 'Assistant Star', element: 'Wood', home: 0, nature: 'Favorable',
    meaning: 'Learning, planning, documentation, teaching, contracts, and orderly development.',
    direct: 'Supports study, careful preparation, professional advice, and work that depends on accuracy.',
    risk: 'Can become over-analysis, procedural delay, or dependence on approval when obstructed.',
  },
  {
    id: 'tian-ying', name: 'Tian Ying', label: 'Hero Star', element: 'Fire', home: 1, nature: 'Mixed',
    meaning: 'Visibility, reputation, images, culture, communication, heat, and rapid exposure.',
    direct: 'Favors presentation, publicity, recognition, design, and fast information exchange.',
    risk: 'Raises the chance of haste, controversy, overheating, or facts becoming public too quickly.',
  },
  {
    id: 'tian-rui', name: 'Tian Rui', label: 'Illness Star', element: 'Earth', home: 2, nature: 'Unfavorable',
    meaning: 'Illness, repair, mistakes, training, care work, land, and accumulated problems.',
    direct: 'Useful for diagnosis, maintenance, medical matters, learning from errors, and stabilising a weak process.',
    risk: 'Signals delay, fatigue, defects, repeated corrections, or a problem that has already accumulated.',
  },
  {
    id: 'tian-chong', name: 'Tian Chong', label: 'Impulse Star', element: 'Wood', home: 3, nature: 'Favorable',
    meaning: 'Speed, initiative, impact, movement, competition, vehicles, and decisive execution.',
    direct: 'Supports launching, acting quickly, breaking inertia, sport, and competitive movement.',
    risk: 'Can produce collision, impatience, force without preparation, or an action that moves too early.',
  },
  {
    id: 'tian-qin', name: 'Tian Qin', label: 'Center Star', element: 'Earth', home: 4, nature: 'Favorable',
    meaning: 'Central authority, coordination, balance, governance, and the point that holds the chart together.',
    direct: 'Supports mediation, central control, resource coordination, and decisions that affect the whole system.',
    risk: 'Can become centralised pressure, indecision, or responsibility that cannot be delegated.',
  },
  {
    id: 'tian-zhu', name: 'Tian Zhu', label: 'Pillar Star', element: 'Metal', home: 5, nature: 'Unfavorable',
    meaning: 'Speech, opposition, rules, damage, enforcement, performance, and structural pressure.',
    direct: 'Useful for debate, quality control, enforcement, correcting defects, and setting a hard boundary.',
    risk: 'Raises disputes, criticism, breakage, punitive action, or communication that turns confrontational.',
  },
  {
    id: 'tian-ren', name: 'Tian Ren', label: 'Responsibility Star', element: 'Earth', home: 6, nature: 'Favorable',
    meaning: 'Duty, property, continuity, reliability, farming, inheritance, and patient accumulation.',
    direct: 'Supports long-term work, property, steady management, recovery, and responsibilities that require endurance.',
    risk: 'Can feel slow, conservative, physically heavy, or burdened by obligations.',
  },
  {
    id: 'tian-peng', name: 'Tian Peng', label: 'Canopy Star', element: 'Water', home: 7, nature: 'Unfavorable',
    meaning: 'Risk, secrecy, desire, strategy, theft, speculation, water, and activity outside normal limits.',
    direct: 'Useful for intelligence, research, covert planning, negotiation under uncertainty, and competitive strategy.',
    risk: 'Raises deception, appetite without limit, legal exposure, loss, or dangerous risk-taking.',
  },
  {
    id: 'tian-xin', name: 'Tian Xin', label: 'Heart Star', element: 'Metal', home: 8, nature: 'Favorable',
    meaning: 'Judgment, medicine, leadership, precision, management, law, and technical skill.',
    direct: 'Supports diagnosis, executive decisions, legal or technical work, and precise intervention.',
    risk: 'Can become cold judgment, excessive control, or a decision made with too little human flexibility.',
  },
]);

const GATES = Object.freeze([
  {
    id: 'rest', name: 'Rest Gate', element: 'Water', home: 7, nature: 'Favorable',
    meaning: 'Rest, recovery, relationships, meetings, support, travel, and quiet negotiation.',
    favorable: 'Use for recovery, private discussion, relationship repair, research, and low-friction coordination.',
    unfavorable: 'Avoid passivity, delay, comfort-seeking, or assuming silence means agreement.',
  },
  {
    id: 'life', name: 'Life Gate', element: 'Earth', home: 6, nature: 'Favorable',
    meaning: 'Income, business, growth, property, vitality, production, and tangible resources.',
    favorable: 'Use for commercial activity, property, building resources, health recovery, and sustainable growth.',
    unfavorable: 'Avoid expanding costs or inventory faster than the underlying capacity can support.',
  },
  {
    id: 'harm', name: 'Harm Gate', element: 'Wood', home: 3, nature: 'Unfavorable',
    meaning: 'Injury, pressure, pursuit, debt collection, competition, vehicles, and direct confrontation.',
    favorable: 'Use for sport, enforcement, urgent pursuit, surgery, or work that requires force and precision.',
    unfavorable: 'Raises injury, conflict, blame, rushed movement, and damage caused by pushing too hard.',
  },
  {
    id: 'obstruction', name: 'Obstruction Gate', element: 'Wood', home: 0, nature: 'Neutral',
    meaning: 'Secrecy, technical work, barriers, privacy, investigation, planning, and restricted access.',
    favorable: 'Use for confidential work, research, cybersecurity, planning, concealment, and closing access.',
    unfavorable: 'Raises blockage, isolation, missing information, and progress hidden behind procedure.',
  },
  {
    id: 'view', name: 'View Gate', element: 'Fire', home: 1, nature: 'Neutral',
    meaning: 'Publicity, documents, media, beauty, examination, celebration, and what can be seen.',
    favorable: 'Use for marketing, presentation, publishing, examination, cultural work, and reputation management.',
    unfavorable: 'Raises vanity, information leaks, surface over substance, and public scrutiny.',
  },
  {
    id: 'death', name: 'Death Gate', element: 'Earth', home: 2, nature: 'Unfavorable',
    meaning: 'Ending, stillness, burial, closure, immobilisation, old matters, and irreversible limits.',
    favorable: 'Use for ending a harmful pattern, disposal, closure, archaeology, or work involving what is finished.',
    unfavorable: 'Raises stagnation, loss, blocked recovery, and decisions with little room to reverse.',
  },
  {
    id: 'alarm', name: 'Alarm Gate', element: 'Metal', home: 5, nature: 'Unfavorable',
    meaning: 'Shock, argument, litigation, speech, announcements, fear, and unexpected disturbance.',
    favorable: 'Use for warnings, advocacy, public speaking, legal notice, or drawing attention to a real problem.',
    unfavorable: 'Raises panic, disputes, rumours, legal friction, and communication that escalates quickly.',
  },
  {
    id: 'open', name: 'Open Gate', element: 'Metal', home: 8, nature: 'Favorable',
    meaning: 'Career, authority, access, opportunity, administration, travel, and formal institutions.',
    favorable: 'Use for applications, business openings, leadership, career moves, official procedures, and access.',
    unfavorable: 'Avoid assuming an open channel guarantees approval; authority and procedure still control the result.',
  },
]);

const SPIRITS = Object.freeze([
  { id: 'chief', name: 'Chief', nature: 'Favorable', meaning: 'Authority, protection, leadership, the primary issue, and the power to organise.' },
  { id: 'serpent', name: 'Soaring Serpent', nature: 'Unfavorable', meaning: 'Anxiety, illusion, entanglement, dreams, changing stories, and indirect complications.' },
  { id: 'great-yin', name: 'Great Yin', nature: 'Favorable', meaning: 'Confidential support, planning, hidden assistance, detail, and patient preparation.' },
  { id: 'six-harmony', name: 'Six Harmony', nature: 'Favorable', meaning: 'Cooperation, contracts, partnership, mediation, matchmaking, and coordinated interests.' },
  { id: 'white-tiger', name: 'White Tiger', nature: 'Unfavorable', meaning: 'Force, injury, surgery, conflict, enforcement, urgency, and visible damage.' },
  { id: 'black-tortoise', name: 'Black Tortoise', nature: 'Unfavorable', meaning: 'Secrecy, deception, theft, hidden motives, unclear records, and information risk.' },
  { id: 'nine-earth', name: 'Nine Earth', nature: 'Favorable', meaning: 'Stability, storage, patience, land, low position, and slow consolidation.' },
  { id: 'nine-heaven', name: 'Nine Heaven', nature: 'Favorable', meaning: 'Height, distance, ambition, expansion, visibility, speed, and large-scale movement.' },
]);

const ORIGINAL_STAR_BY_PALACE = Object.freeze([
  STARS[0], STARS[1], STARS[2], STARS[3], STARS[4], STARS[5], STARS[6], STARS[7], STARS[8],
]);
const ORIGINAL_GATE_BY_PALACE = Object.freeze([
  GATES[3], GATES[4], GATES[5], GATES[2], null, GATES[6], GATES[1], GATES[0], GATES[7],
]);
const GATE_SEQUENCE = Object.freeze(GATES);

const XUN_HEADS = Object.freeze([
  { pillar: { stem: 'Jia', branch: 'Zi' }, hiddenStem: 'Wu', voidBranches: ['Xu', 'Hai'] },
  { pillar: { stem: 'Jia', branch: 'Xu' }, hiddenStem: 'Ji', voidBranches: ['Shen', 'You'] },
  { pillar: { stem: 'Jia', branch: 'Shen' }, hiddenStem: 'Geng', voidBranches: ['Wu', 'Wei'] },
  { pillar: { stem: 'Jia', branch: 'Wu' }, hiddenStem: 'Xin', voidBranches: ['Chen', 'Si'] },
  { pillar: { stem: 'Jia', branch: 'Chen' }, hiddenStem: 'Ren', voidBranches: ['Yin', 'Mao'] },
  { pillar: { stem: 'Jia', branch: 'Yin' }, hiddenStem: 'Gui', voidBranches: ['Zi', 'Chou'] },
]);

const BRANCH_PALACE = Object.freeze({
  Zi: 7,
  Chou: 6,
  Yin: 6,
  Mao: 3,
  Chen: 0,
  Si: 0,
  Wu: 1,
  Wei: 2,
  Shen: 2,
  You: 5,
  Xu: 8,
  Hai: 8,
});

const INSTRUMENT_PUNISHMENT = Object.freeze({
  Wu: { palace: 3, name: 'Wu instrument punishment', basis: 'Jia Zi meets the Zi-Mao punishment in the Zhen palace.' },
  Ji: { palace: 2, name: 'Ji instrument punishment', basis: 'Jia Xu meets the Xu-Wei punishment in the Kun palace.' },
  Geng: { palace: 6, name: 'Geng instrument punishment', basis: 'Jia Shen meets the Shen-Yin punishment in the Gen palace.' },
  Xin: { palace: 1, name: 'Xin instrument punishment', basis: 'Jia Wu meets the Wu self-punishment in the Li palace.' },
  Ren: { palace: 0, name: 'Ren instrument punishment', basis: 'Jia Chen meets the Chen self-punishment in the Xun palace.' },
  Gui: { palace: 0, name: 'Gui instrument punishment', basis: 'Jia Yin meets the Yin-Si punishment in the Xun palace.' },
});

const ELEMENT_GENERATES = Object.freeze({ Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' });
const ELEMENT_CONTROLS = Object.freeze({ Wood: 'Earth', Fire: 'Metal', Earth: 'Water', Metal: 'Wood', Water: 'Fire' });

function rotateFrom(array, startIndex) {
  return [...array.slice(startIndex), ...array.slice(0, startIndex)];
}

function sequenceFrom(path, palaceIndex) {
  const normalized = palaceIndex === 4 ? CENTER_SUBSTITUTE : palaceIndex;
  const start = path.indexOf(normalized);
  if (start < 0) throw new Error(`Palace ${palaceIndex} is not present in the selected path.`);
  return rotateFrom(path, start);
}

function mapByPath(source, sourceIndex, targetIndex) {
  const getSequence = sequenceFrom(CLOCKWISE_PATH, sourceIndex);
  const putSequence = sequenceFrom(CLOCKWISE_PATH, targetIndex);
  const result = new Array(9).fill(null);
  getSequence.forEach((palaceIndex, order) => {
    result[putSequence[order]] = source[palaceIndex];
  });
  result[4] = source[4];
  return result;
}

function pillarIndex(pillar) {
  const stemIndex = STEMS.indexOf(pillar?.stem);
  const branchIndex = BRANCHES.indexOf(pillar?.branch);
  if (stemIndex < 0 || branchIndex < 0) return -1;
  for (let index = 0; index < 60; index += 1) {
    if (index % 10 === stemIndex && index % 12 === branchIndex) return index;
  }
  return -1;
}

function formatPillar(pillar) {
  return `${pillar.stem} ${pillar.branch}`;
}

function getXunContext(timePillar) {
  const index = pillarIndex(timePillar);
  if (index < 0) throw new Error('The hour pillar is not a valid sexagenary pair.');
  const xunIndex = Math.floor(index / 10);
  return { ...XUN_HEADS[xunIndex], flyStep: index % 10 };
}

function calculateJu(termId, daysSinceTerm) {
  const config = TERM_CONFIG[termId];
  if (!config) throw new Error('The solar term is not supported by the Hour-School chart.');
  const preciseDays = Number(daysSinceTerm);
  if (!Number.isFinite(preciseDays) || preciseDays < 0) throw new Error('Days since the solar-term boundary must be zero or greater.');
  const yuanIndex = Math.min(2, Math.floor(preciseDays / 5));
  return {
    termId,
    termName: config.name,
    isYang: config.isYang,
    dunName: config.isYang ? 'Yang Dun' : 'Yin Dun',
    yuanIndex,
    yuanName: ['Upper Yuan', 'Middle Yuan', 'Lower Yuan'][yuanIndex],
    juNumber: config.ju[yuanIndex],
    daysSinceTerm: preciseDays,
  };
}

function buildEarthPlate(isYang, juNumber) {
  const result = new Array(9).fill(null);
  EARTH_STEM_SEQUENCE.forEach((stem, offset) => {
    const palaceNumber = isYang
      ? ((juNumber - 1 + offset) % 9) + 1
      : ((juNumber - 1 - offset + 90) % 9) + 1;
    result[PALACE_INDEX_BY_NUMBER[palaceNumber]] = stem;
  });
  return result;
}

function buildDoors(isYang, valueGate, flyStep, hiddenStem, earthPlate) {
  const startIndex = earthPlate.indexOf(hiddenStem);
  const path = isYang ? DOOR_YANG_PATH : DOOR_YIN_PATH;
  const startInPath = path.indexOf(startIndex);
  if (startInPath < 0) throw new Error('The hidden stem was not found on the earth plate.');
  const valueTargetRaw = path[(startInPath + flyStep) % path.length];
  const valueTarget = valueTargetRaw === 4 ? CENTER_SUBSTITUTE : valueTargetRaw;
  const putSequence = sequenceFrom(CLOCKWISE_PATH, valueTarget);
  const valueIndex = GATE_SEQUENCE.findIndex((gate) => gate.id === valueGate.id);
  const gateOrder = rotateFrom(GATE_SEQUENCE, valueIndex);
  const result = new Array(9).fill(null);
  putSequence.forEach((palaceIndex, order) => {
    result[palaceIndex] = gateOrder[order];
  });
  return result;
}

function buildSpirits(isYang, effectiveTimeStem, earthPlate) {
  let start = earthPlate.indexOf(effectiveTimeStem);
  if (start === 4) start = CENTER_SUBSTITUTE;
  const path = isYang ? CLOCKWISE_PATH : COUNTER_CLOCKWISE_PATH;
  const putSequence = sequenceFrom(path, start);
  const result = new Array(9).fill(null);
  putSequence.forEach((palaceIndex, order) => {
    result[palaceIndex] = SPIRITS[order];
  });
  return result;
}

function getElementRelation(source, target) {
  if (!source || !target) return 'unknown';
  if (source === target) return 'same';
  if (ELEMENT_GENERATES[source] === target) return 'source-generates-target';
  if (ELEMENT_GENERATES[target] === source) return 'target-generates-source';
  if (ELEMENT_CONTROLS[source] === target) return 'source-controls-target';
  if (ELEMENT_CONTROLS[target] === source) return 'target-controls-source';
  return 'neutral';
}

function combinationText(star, gate) {
  const relation = getElementRelation(star.element, gate.element);
  const relationText = {
    same: `Both are ${star.element}, so the signal is concentrated and acts with less internal contradiction.`,
    'source-generates-target': `${star.name} generates the ${gate.element} of ${gate.name}, so the surrounding condition feeds the action channel.`,
    'target-generates-source': `${gate.name} generates the ${star.element} of ${star.name}, so the action spends resources to support the surrounding condition.`,
    'source-controls-target': `${star.name} controls the ${gate.element} of ${gate.name}, so the surrounding condition constrains how the action can proceed.`,
    'target-controls-source': `${gate.name} controls the ${star.element} of ${star.name}, so the chosen action can regulate the surrounding condition but requires active control.`,
    neutral: 'The star and gate do not form a direct generating or controlling relation.',
    unknown: 'The element relation cannot be calculated.',
  }[relation];
  return {
    id: `${star.id}__${gate.id}`,
    starId: star.id,
    gateId: gate.id,
    title: `${star.name} with ${gate.name}`,
    relation,
    summary: `${gate.name} sets the route of action: ${gate.meaning} ${star.name} sets the operating condition: ${star.meaning}`,
    elementReading: relationText,
    favorableUse: `${gate.favorable} Read this through ${star.name}: ${star.direct}`,
    risk: `${gate.unfavorable} Star-level risk: ${star.risk}`,
  };
}

function detectDoorPressure(gate, palace) {
  if (!gate || !palace || ELEMENT_CONTROLS[gate.element] !== palace.element) return null;
  return {
    code: 'door-pressure',
    label: 'Door pressure',
    severity: 'warning',
    detail: `${gate.name} is ${gate.element} and controls the ${palace.element} of ${palace.trigram} Palace. The gate's matter is present, but the route is forced and less stable.`,
  };
}

function detectInstrumentPunishment(heavenStem, palaceIndex) {
  const rule = INSTRUMENT_PUNISHMENT[heavenStem];
  if (!rule || rule.palace !== palaceIndex) return null;
  return {
    code: 'instrument-punishment',
    label: 'Instrument punishment',
    severity: 'critical',
    detail: `${rule.name}. ${rule.basis} Treat the indicated action as vulnerable to force, error, or self-created pressure.`,
  };
}

function getHorsePalace(branch) {
  if (['Shen', 'Zi', 'Chen'].includes(branch)) return BRANCH_PALACE.Yin;
  if (['Yin', 'Wu', 'Xu'].includes(branch)) return BRANCH_PALACE.Shen;
  if (['Si', 'You', 'Chou'].includes(branch)) return BRANCH_PALACE.Hai;
  if (['Hai', 'Mao', 'Wei'].includes(branch)) return BRANCH_PALACE.Si;
  return null;
}

function buildGlobalPatterns(stars, doors) {
  const starFuYin = stars.every((star, index) => star?.id === ORIGINAL_STAR_BY_PALACE[index]?.id);
  const doorFuYin = doors.every((gate, index) => gate?.id === ORIGINAL_GATE_BY_PALACE[index]?.id);
  return [
    ...(starFuYin ? [{ code: 'star-fu-yin', label: 'Star Fu Yin', detail: 'All Nine Stars remain in their home palaces. The situation tends to repeat, slow down, or stay fixed.' }] : []),
    ...(doorFuYin ? [{ code: 'door-fu-yin', label: 'Gate Fu Yin', detail: 'All Eight Gates remain in their home palaces. The route of action tends to repeat or resist rapid change.' }] : []),
  ];
}

function validateFacts(facts) {
  if (!facts || typeof facts !== 'object') throw new Error('Calendar facts are required.');
  ['yearPillar', 'monthPillar', 'dayPillar', 'timePillar'].forEach((key) => {
    if (pillarIndex(facts[key]) < 0) throw new Error(`${key} is not a valid sexagenary pillar.`);
  });
}

function calculateQimenChart(facts) {
  validateFacts(facts);
  const ju = calculateJu(facts.solarTermId, facts.daysSinceSolarTerm);
  const xun = getXunContext(facts.timePillar);
  const earthPlate = buildEarthPlate(ju.isYang, ju.juNumber);
  const effectiveTimeStem = facts.timePillar.stem === 'Jia' ? xun.hiddenStem : facts.timePillar.stem;
  const hiddenStemPalace = earthPlate.indexOf(xun.hiddenStem);
  const effectiveStemPalace = earthPlate.indexOf(effectiveTimeStem);
  if (hiddenStemPalace < 0 || effectiveStemPalace < 0) throw new Error('The hour stem cannot be located on the earth plate.');

  const chiefStar = ORIGINAL_STAR_BY_PALACE[hiddenStemPalace];
  const valueGateHome = hiddenStemPalace === 4 ? CENTER_SUBSTITUTE : hiddenStemPalace;
  const envoyGate = ORIGINAL_GATE_BY_PALACE[valueGateHome];
  const heavenPlate = mapByPath(earthPlate, hiddenStemPalace, effectiveStemPalace);
  const stars = mapByPath(ORIGINAL_STAR_BY_PALACE, chiefStar.home, effectiveStemPalace);
  const doors = buildDoors(ju.isYang, envoyGate, xun.flyStep, xun.hiddenStem, earthPlate);
  const spirits = buildSpirits(ju.isYang, effectiveTimeStem, earthPlate);
  const voidPalaces = new Set(xun.voidBranches.map((branch) => BRANCH_PALACE[branch]));
  const horsePalace = getHorsePalace(facts.timePillar.branch);

  const palaces = PALACES.map((palace, index) => {
    const gate = doors[index];
    const star = stars[index];
    const warnings = [
      detectDoorPressure(gate, palace),
      detectInstrumentPunishment(heavenPlate[index], index),
    ].filter(Boolean);
    const markers = [
      ...(voidPalaces.has(index) ? [{ code: 'hour-void', label: 'Hour void', detail: 'This palace carries the two empty branches of the hour xun. Results may be delayed, absent, hollow, or dependent on later activation.' }] : []),
      ...(horsePalace === index ? [{ code: 'travel-horse', label: 'Travel Horse', detail: 'This palace carries the hour Travel Horse. Movement, travel, relocation, urgency, or rapid change is activated here.' }] : []),
    ];
    return {
      ...palace,
      earthStem: earthPlate[index],
      heavenStem: heavenPlate[index],
      star,
      gate,
      spirit: spirits[index],
      warnings,
      markers,
      combination: star && gate ? combinationText(star, gate) : null,
    };
  });

  const chiefPalace = palaces.find((palace) => palace.star?.id === chiefStar.id)?.index ?? effectiveStemPalace;
  const envoyPalace = palaces.find((palace) => palace.gate?.id === envoyGate.id)?.index ?? null;
  return {
    method: {
      school: 'Hour-School Qi Men Dun Jia',
      juMethod: 'Chai Bu solar-term method',
      chartMethod: 'Rotating chart',
      centerConvention: 'Tian Qin is held at the center and referenced through Kun when a directional palace is required.',
      spiritConvention: 'Chief, Soaring Serpent, Great Yin, Six Harmony, White Tiger, Black Tortoise, Nine Earth, and Nine Heaven.',
      timeBasis: 'Entered local civil time without true-solar-time correction.',
    },
    input: {
      ...facts,
      pillars: {
        year: formatPillar(facts.yearPillar),
        month: formatPillar(facts.monthPillar),
        day: formatPillar(facts.dayPillar),
        time: formatPillar(facts.timePillar),
      },
    },
    ju,
    xun: {
      head: formatPillar(xun.pillar),
      hiddenStem: xun.hiddenStem,
      voidBranches: [...xun.voidBranches],
      flyStep: xun.flyStep,
    },
    chief: { star: chiefStar, palaceIndex: chiefPalace },
    envoy: { gate: envoyGate, palaceIndex: envoyPalace },
    palaces,
    patterns: buildGlobalPatterns(stars, doors),
  };
}

function buildStarGateCombinationLibrary() {
  return STARS.flatMap((star) => GATES.map((gate) => combinationText(star, gate)));
}

export {
  BRANCHES,
  GATES,
  PALACES,
  SPIRITS,
  STARS,
  STEMS,
  TERM_CONFIG,
  buildStarGateCombinationLibrary,
  calculateJu,
  calculateQimenChart,
  detectDoorPressure,
  detectInstrumentPunishment,
  formatPillar,
  getElementRelation,
  pillarIndex,
};
