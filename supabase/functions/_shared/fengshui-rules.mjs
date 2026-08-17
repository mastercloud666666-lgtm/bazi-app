const ELEMENTS = Object.freeze(['wood', 'fire', 'earth', 'metal', 'water']);

const GENERATES = Object.freeze({
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
});

const CONTROLS = Object.freeze({
  wood: 'earth',
  fire: 'metal',
  earth: 'water',
  metal: 'wood',
  water: 'fire',
});

export const DIRECTION_PROFILE = Object.freeze({
  north: Object.freeze({
    key: 'north', short: 'N', label: 'North', chinese: '北',
    trigram: 'kan', trigramChinese: '坎', element: 'water',
    familyRole: 'middle_son',
  }),
  northeast: Object.freeze({
    key: 'northeast', short: 'NE', label: 'Northeast', chinese: '东北',
    trigram: 'gen', trigramChinese: '艮', element: 'earth',
    familyRole: 'youngest_son',
  }),
  east: Object.freeze({
    key: 'east', short: 'E', label: 'East', chinese: '东',
    trigram: 'zhen', trigramChinese: '震', element: 'wood',
    familyRole: 'eldest_son',
  }),
  southeast: Object.freeze({
    key: 'southeast', short: 'SE', label: 'Southeast', chinese: '东南',
    trigram: 'xun', trigramChinese: '巽', element: 'wood',
    familyRole: 'eldest_daughter',
  }),
  south: Object.freeze({
    key: 'south', short: 'S', label: 'South', chinese: '南',
    trigram: 'li', trigramChinese: '离', element: 'fire',
    familyRole: 'middle_daughter',
  }),
  southwest: Object.freeze({
    key: 'southwest', short: 'SW', label: 'Southwest', chinese: '西南',
    trigram: 'kun', trigramChinese: '坤', element: 'earth',
    familyRole: 'mother',
  }),
  west: Object.freeze({
    key: 'west', short: 'W', label: 'West', chinese: '西',
    trigram: 'dui', trigramChinese: '兑', element: 'metal',
    familyRole: 'youngest_daughter',
  }),
  northwest: Object.freeze({
    key: 'northwest', short: 'NW', label: 'Northwest', chinese: '西北',
    trigram: 'qian', trigramChinese: '乾', element: 'metal',
    familyRole: 'father_or_married_man',
  }),
  center: Object.freeze({
    key: 'center', short: 'C', label: 'Center', chinese: '中宫',
    trigram: 'center', trigramChinese: '中宫', element: 'earth',
    familyRole: '',
  }),
});

const DIRECTION_ALIASES = Object.freeze({
  n: 'north', north: 'north', 北: 'north', 正北: 'north',
  ne: 'northeast', northeast: 'northeast', 东北: 'northeast',
  e: 'east', east: 'east', 东: 'east', 正东: 'east',
  se: 'southeast', southeast: 'southeast', 东南: 'southeast',
  s: 'south', south: 'south', 南: 'south', 正南: 'south',
  sw: 'southwest', southwest: 'southwest', 西南: 'southwest',
  w: 'west', west: 'west', 西: 'west', 正西: 'west',
  nw: 'northwest', northwest: 'northwest', 西北: 'northwest',
  c: 'center', center: 'center', centre: 'center', 中宫: 'center',
});

const OPPOSITE_DIRECTION = Object.freeze({
  north: 'south',
  northeast: 'southwest',
  east: 'west',
  southeast: 'northwest',
  south: 'north',
  southwest: 'northeast',
  west: 'east',
  northwest: 'southeast',
});

const CARDINAL_DIRECTION_FOR_ELEMENT = Object.freeze({
  wood: 'east',
  fire: 'south',
  earth: 'southwest',
  metal: 'west',
  water: 'north',
});

export const RELATION_PROFILE = Object.freeze({
  companion: Object.freeze({
    key: 'companion', label: 'Companion pattern', chinese: '比劫局',
  }),
  output: Object.freeze({
    key: 'output', label: 'Output pattern', chinese: '食伤局',
  }),
  wealth: Object.freeze({
    key: 'wealth', label: 'Wealth pattern', chinese: '财局',
  }),
  officer: Object.freeze({
    key: 'officer', label: 'Officer / Seven Killings pattern', chinese: '官杀局',
  }),
  resource: Object.freeze({
    key: 'resource', label: 'Resource pattern', chinese: '印局',
  }),
});

const PERSON_ROLE_TO_TRIGRAM = Object.freeze({
  father: 'qian',
  married_man: 'qian',
  husband: 'qian',
  eldest_son: 'zhen',
  middle_son: 'kan',
  youngest_son: 'gen',
  mother: 'kun',
  married_woman: 'kun',
  wife: 'kun',
  eldest_daughter: 'xun',
  middle_daughter: 'li',
  youngest_daughter: 'dui',
});

const PERSON_ROLE_PROFILE = Object.freeze({
  father: Object.freeze({
    label: 'Father', expectedDirection: 'northwest',
    domains: Object.freeze(['family authority', 'responsibility', 'marriage', 'career leadership']),
  }),
  married_man: Object.freeze({
    label: 'Married man', expectedDirection: 'northwest',
    domains: Object.freeze(['family authority', 'responsibility', 'marriage', 'career leadership']),
  }),
  husband: Object.freeze({
    label: 'Husband', expectedDirection: 'northwest',
    domains: Object.freeze(['family authority', 'responsibility', 'marriage', 'career leadership']),
  }),
  eldest_son: Object.freeze({
    label: 'Eldest son', expectedDirection: 'east',
    domains: Object.freeze(['initiative', 'growth', 'family responsibility', 'career development']),
  }),
  middle_son: Object.freeze({
    label: 'Middle son', expectedDirection: 'north',
    domains: Object.freeze(['adaptability', 'family position', 'responsibility', 'work direction']),
  }),
  youngest_son: Object.freeze({
    label: 'Youngest son', expectedDirection: 'northeast',
    domains: Object.freeze(['learning', 'independence', 'family position', 'future direction']),
  }),
  mother: Object.freeze({
    label: 'Mother', expectedDirection: 'southwest',
    domains: Object.freeze(['household authority', 'responsibility', 'marriage', 'family coordination']),
  }),
  married_woman: Object.freeze({
    label: 'Married woman', expectedDirection: 'southwest',
    domains: Object.freeze(['household authority', 'responsibility', 'marriage', 'family coordination']),
  }),
  wife: Object.freeze({
    label: 'Wife', expectedDirection: 'southwest',
    domains: Object.freeze(['household authority', 'responsibility', 'marriage', 'family coordination']),
  }),
  eldest_daughter: Object.freeze({
    label: 'Eldest daughter', expectedDirection: 'southeast',
    domains: Object.freeze(['growth', 'communication', 'family responsibility', 'career development']),
  }),
  middle_daughter: Object.freeze({
    label: 'Middle daughter', expectedDirection: 'south',
    domains: Object.freeze(['visibility', 'expression', 'family position', 'social development']),
  }),
  youngest_daughter: Object.freeze({
    label: 'Youngest daughter', expectedDirection: 'west',
    domains: Object.freeze(['expression', 'relationships', 'family position', 'future development']),
  }),
});

export const DESTINY_TIMING_GEOGRAPHY_FRAMEWORK = Object.freeze({
  label: 'Destiny, Timing, and Geography',
  layers: Object.freeze([
    Object.freeze({
      key: 'destiny',
      label: 'Destiny',
      conclusion: 'Birth establishes the resident\u2019s baseline conditions and latent tendencies.',
    }),
    Object.freeze({
      key: 'timing',
      label: 'Timing',
      conclusion: 'Conditions unfold through time together with the resident\u2019s choices and actions.',
    }),
    Object.freeze({
      key: 'geography',
      label: 'Geography',
      conclusion: 'The long-term residential environment can strengthen or weaken an existing tendency.',
    }),
  ]),
  mechanism: Object.freeze([
    'Residential position changes the person\u2019s repeated spatial experience.',
    'Repeated experience influences feelings and thought patterns.',
    'Repeated thoughts influence habits and choices.',
    'Habits and choices influence life outcomes over time.',
  ]),
  judgmentSequence: Object.freeze([
    'Confirm observable floor-plan facts and the whole-floor Tai Ji center.',
    'Identify the long-term resident and the actual palace used by that person.',
    'Decide whether household role and residential position are aligned.',
    'Place the person trigram above the room-palace trigram and apply only an approved hexagram verdict.',
    'Cross-check the conclusion against observable authority, responsibility, relationship, and work patterns.',
  ]),
  adjustmentScope: Object.freeze([
    'room assignment',
    'household responsibility',
    'relationship boundaries',
    'behaviour and personal choice',
  ]),
  boundary: 'The residence does not replace natal conditions, timing, or personal choice, and it does not guarantee a fixed outcome.',
});

export const PERSONAL_BED_PLACEMENT_METHOD = Object.freeze({
  label: 'Personal bed-placement sequence',
  sequence: Object.freeze([
    'Choose the bedroom by its whole-home palace and the long-term resident\u2019s household role.',
    'Use the resident\u2019s verified natal Zi Wei chart to select an applicable auspicious or resolving star for the bed-foot direction.',
    'Check that the bed axis does not sit on a compass-palace boundary.',
  ]),
  physicalChecks: Object.freeze([
    'bedhead supported by a solid wall rather than a window, glass, or light partition',
    'bed-foot not directly aligned with the bedroom door or toilet door',
    'bedhead wall not shared directly with a toilet, shower, or stove when another wall is available',
    'no structural beam directly above the bed',
    'no persistent strong airflow directed at the head',
  ]),
  requirement: 'A personalized bed-foot direction requires a verified birth time and natal Zi Wei chart; it cannot be generated from the floor plan alone.',
});

const SPACE_FUNCTION_PROFILE = Object.freeze({
  kitchen: Object.freeze({
    label: 'Kitchen',
    symbolism: Object.freeze(['knife', 'fire', 'cutting']),
    conclusion: 'A kitchen carries knife, fire, and cutting symbolism.',
  }),
  living_room: Object.freeze({
    label: 'Living room',
    symbolism: Object.freeze(['guests', 'external exchange', 'household social activity']),
    conclusion: 'A living room represents guests, external exchange, and household social activity.',
  }),
  toilet: Object.freeze({
    label: 'Toilet',
    symbolism: Object.freeze(['discharge', 'waste', 'disputes', 'legal friction']),
    conclusion: 'A toilet carries discharge and waste symbolism and is traditionally associated with disputes or legal friction.',
  }),
});

const TRIGRAM_CHINESE = Object.freeze({
  qian: '乾', dui: '兑', li: '离', zhen: '震',
  xun: '巽', kan: '坎', gen: '艮', kun: '坤',
});

const HEXAGRAM_NAMES = Object.freeze({
  qian: Object.freeze({
    qian: '乾为天', dui: '天泽履', li: '天火同人', zhen: '天雷无妄',
    xun: '天风姤', kan: '天水讼', gen: '天山遁', kun: '天地否',
  }),
  dui: Object.freeze({
    qian: '泽天夬', dui: '兑为泽', li: '泽火革', zhen: '泽雷随',
    xun: '泽风大过', kan: '泽水困', gen: '泽山咸', kun: '泽地萃',
  }),
  li: Object.freeze({
    qian: '火天大有', dui: '火泽睽', li: '离为火', zhen: '火雷噬嗑',
    xun: '火风鼎', kan: '火水未济', gen: '火山旅', kun: '火地晋',
  }),
  zhen: Object.freeze({
    qian: '雷天大壮', dui: '雷泽归妹', li: '雷火丰', zhen: '震为雷',
    xun: '雷风恒', kan: '雷水解', gen: '雷山小过', kun: '雷地豫',
  }),
  xun: Object.freeze({
    qian: '风天小畜', dui: '风泽中孚', li: '风火家人', zhen: '风雷益',
    xun: '巽为风', kan: '风水涣', gen: '风山渐', kun: '风地观',
  }),
  kan: Object.freeze({
    qian: '水天需', dui: '水泽节', li: '水火既济', zhen: '水雷屯',
    xun: '水风井', kan: '坎为水', gen: '水山蹇', kun: '水地比',
  }),
  gen: Object.freeze({
    qian: '山天大畜', dui: '山泽损', li: '山火贲', zhen: '山雷颐',
    xun: '山风蛊', kan: '山水蒙', gen: '艮为山', kun: '山地剥',
  }),
  kun: Object.freeze({
    qian: '地天泰', dui: '地泽临', li: '地火明夷', zhen: '地雷复',
    xun: '地风升', kan: '地水师', gen: '地山谦', kun: '坤为地',
  }),
});

const RESIDENCE_VERDICTS = Object.freeze({
  天风姤: Object.freeze({
    label: 'Heaven over Wind — Gou',
    judgment: '女壮，勿用取女。',
    conclusions: Object.freeze([
      'External contact with the opposite sex and romantic attention increase.',
      'The relationship center can move outward when home does not provide enough comfort.',
      'Marriage boundaries and third-party risk require direct management.',
    ]),
    adjustmentType: 'manual_service',
  }),
  地风升: Object.freeze({
    label: 'Earth over Wind — Sheng',
    judgment: '元亨，用见大人，勿恤，南征吉。',
    conclusions: Object.freeze([
      'Career, income, and the ability to take charge rise for the wife.',
      'The wife becomes stronger and competition inside the marriage increases.',
      'Both partners can become absorbed in separate work, reducing warmth at home.',
      'Traditional practice gives extra attention near the seventh year of long residence.',
    ]),
    adjustmentType: 'manual_service',
  }),
  雷地豫: Object.freeze({
    label: 'Thunder over Earth — Yu',
    judgment: '利建侯行师。',
    conclusions: Object.freeze([
      'The eldest son occupies the mother palace and tends toward support, execution, and household responsibility.',
      'Traditional adult-life reading: marriage may be later than peers, with a partner who is older or has prior marital history.',
      'Work favors capable support and execution, with a promotion image when responsibility is handled well.',
      'Distance from extended family may increase.',
    ]),
    adjustmentType: 'manual_service',
  }),
});

const STRUCTURAL_ASSOCIATIONS = Object.freeze({
  northwest: Object.freeze({
    people: Object.freeze(['father', 'husband', 'married man']),
    affairs: Object.freeze(['authority', 'leadership', 'career support', 'male head of household']),
    body: Object.freeze(['head', 'lungs', 'bones']),
  }),
  east: Object.freeze({
    people: Object.freeze(['eldest son']),
    affairs: Object.freeze(['growth', 'initiative', 'eldest-son role']),
    body: Object.freeze(['traditional liver, gallbladder, eyes, and sinew correspondence']),
  }),
});

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePersonRole(value) {
  return cleanString(value).toLowerCase().replace(/[\s-]+/g, '_');
}

function cleanNonNegativeInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function normalizeDirection(value) {
  const raw = cleanString(value).toLowerCase().replace(/[\s_-]+/g, '');
  return DIRECTION_ALIASES[raw] || '';
}

export function oppositeDirection(value) {
  return OPPOSITE_DIRECTION[normalizeDirection(value)] || '';
}

export function elementForDirection(value) {
  const direction = normalizeDirection(value);
  return DIRECTION_PROFILE[direction]?.element || '';
}

export function fiveElementRelation(referenceElement, targetElement) {
  const reference = cleanString(referenceElement).toLowerCase();
  const target = cleanString(targetElement).toLowerCase();
  if (!ELEMENTS.includes(reference) || !ELEMENTS.includes(target)) return null;
  if (reference === target) return RELATION_PROFILE.companion;
  if (GENERATES[reference] === target) return RELATION_PROFILE.output;
  if (CONTROLS[reference] === target) return RELATION_PROFILE.wealth;
  if (CONTROLS[target] === reference) return RELATION_PROFILE.officer;
  if (GENERATES[target] === reference) return RELATION_PROFILE.resource;
  return null;
}

function selectLargestOpening(openings) {
  if (!Array.isArray(openings)) return null;
  return openings
    .map((item, index) => ({
      direction: normalizeDirection(item?.direction),
      area: Number(item?.area) > 0 ? Number(item.area) : 0,
      index,
    }))
    .filter((item) => item.direction && item.direction !== 'center')
    .sort((left, right) => right.area - left.area || left.index - right.index)[0] || null;
}

export function resolveRoomOrientation(room = {}) {
  const bedHead = normalizeDirection(room.bedHead || room.bed_head);
  const bedFoot = normalizeDirection(room.bedFoot || room.bed_foot);
  if (bedHead) {
    return {
      sitting: bedHead,
      facing: bedFoot || oppositeDirection(bedHead),
      basis: 'bed',
      basisDetail: 'The wall behind the bedhead is the sitting side; the bed-foot direction is the facing side.',
    };
  }

  const largestWindow = selectLargestOpening(room.windows);
  if (largestWindow) {
    return {
      sitting: oppositeDirection(largestWindow.direction),
      facing: largestWindow.direction,
      basis: 'largest_window',
      basisDetail: 'With no bed, the largest window is the facing side and its opposite is the sitting side.',
    };
  }

  const mainWindow = normalizeDirection(room.mainWindow || room.main_window);
  if (mainWindow) {
    return {
      sitting: oppositeDirection(mainWindow),
      facing: mainWindow,
      basis: 'largest_window',
      basisDetail: 'With no bed, the largest window is the facing side and its opposite is the sitting side.',
    };
  }

  const door = normalizeDirection(room.door || room.mainDoor || room.main_door);
  if (door) {
    return {
      sitting: oppositeDirection(door),
      facing: door,
      basis: 'door',
      basisDetail: 'With no bed or window, the door direction is the facing side and its opposite is the sitting side.',
    };
  }

  return {
    sitting: '',
    facing: '',
    basis: 'unresolved',
    basisDetail: 'A bedhead, largest-window direction, or door direction is required.',
  };
}

function normalizeEnergyPoints(room, orientation) {
  const points = [];
  const door = normalizeDirection(room.door || room.mainDoor || room.main_door);
  if (door && (orientation.basis !== 'door' || door !== orientation.facing)) {
    points.push({ type: 'door', direction: door, area: Number(room.doorArea || room.door_area) || 0 });
  }

  if (Array.isArray(room.windows)) {
    const largest = selectLargestOpening(room.windows);
    for (let index = 0; index < room.windows.length; index += 1) {
      const window = room.windows[index] || {};
      const direction = normalizeDirection(window.direction);
      if (!direction) continue;
      if (
        orientation.basis === 'largest_window'
        && largest
        && index === largest.index
      ) continue;
      points.push({ type: 'window', direction, area: Number(window.area) || 0 });
    }
  }

  if (Array.isArray(room.energyPoints || room.energy_points)) {
    for (const point of room.energyPoints || room.energy_points) {
      const direction = normalizeDirection(point?.direction);
      if (!direction) continue;
      points.push({
        type: cleanString(point?.type) || 'feature',
        direction,
        area: Number(point?.area) || 0,
      });
    }
  }

  return points.map((point) => ({
    ...point,
    element: elementForDirection(point.direction),
  }));
}

function relationStrengthensFacing(pointElement, facingElement) {
  return pointElement === facingElement || GENERATES[pointElement] === facingElement;
}

function supportingSeatDirections(sittingElement) {
  const resourceElement = ELEMENTS.find((element) => GENERATES[element] === sittingElement);
  return [sittingElement, resourceElement]
    .filter(Boolean)
    .map((element) => ({
      element,
      direction: CARDINAL_DIRECTION_FOR_ELEMENT[element],
    }));
}

function officerDrainDirections(pointElement, facingElement) {
  const drainOutput = GENERATES[pointElement];
  return [...new Set([drainOutput, facingElement])]
    .filter(Boolean)
    .map((element) => ({
      element,
      direction: CARDINAL_DIRECTION_FOR_ELEMENT[element],
    }));
}

export function analyzeBedPlacement(room = {}) {
  const bedHead = normalizeDirection(room.bedHead || room.bed_head);
  if (!bedHead) {
    return {
      applicable: false,
      status: 'no_bed_resolved',
      physicalIssues: [],
    };
  }

  const support = cleanString(room.bedHeadSupport || room.bed_head_support)
    .toLowerCase().replace(/[\s-]+/g, '_');
  const footTarget = cleanString(room.bedFootTarget || room.bed_foot_target)
    .toLowerCase().replace(/[\s-]+/g, '_');
  const backsOnto = cleanString(room.bedHeadBacksOnto || room.bed_head_backs_onto)
    .toLowerCase().replace(/[\s-]+/g, '_');
  const axisValue = Number(room.bedAxisDegrees ?? room.bed_axis_degrees);
  const bedAxisDegrees = Number.isFinite(axisValue)
    ? ((axisValue % 360) + 360) % 360
    : null;
  const physicalIssues = [];

  if (['window', 'glass', 'light_partition', 'partition'].includes(support)) {
    physicalIssues.push({
      code: 'bedhead_without_solid_wall',
      conclusion: 'The bedhead is not supported by a solid wall. Move it to a solid wall before refining its direction.',
    });
  }
  if (['door', 'toilet_door'].includes(footTarget)) {
    physicalIssues.push({
      code: 'bedfoot_directly_aligned_with_door',
      conclusion: `The bed-foot is directly aligned with the ${footTarget === 'toilet_door' ? 'toilet door' : 'bedroom door'}. Reposition the bed when the room allows.`,
    });
  }
  if (['toilet', 'shower', 'stove'].includes(backsOnto)) {
    physicalIssues.push({
      code: 'bedhead_shared_service_wall',
      conclusion: `The bedhead wall directly backs onto a ${backsOnto}. Use another solid wall when the room allows.`,
    });
  }
  if (room.overheadBeam === true || room.overhead_beam === true) {
    physicalIssues.push({
      code: 'beam_above_bed',
      conclusion: 'A structural beam is directly above the bed. Move the bed out from under it when possible.',
    });
  }
  if (room.directAirflowAtHead === true || room.direct_airflow_at_head === true) {
    physicalIssues.push({
      code: 'direct_airflow_at_bedhead',
      conclusion: 'Persistent strong airflow reaches the head position. Redirect the airflow or move the bed.',
    });
  }

  return {
    applicable: true,
    status: physicalIssues.length ? 'physical_adjustment_required' : 'physical_layout_retained',
    physicalIssues,
    personalizedFootDirection: {
      status: 'requires_verified_natal_chart',
      conclusion: PERSONAL_BED_PLACEMENT_METHOD.requirement,
    },
    compassBoundaryCheck: {
      status: bedAxisDegrees === null ? 'exact_bearing_required' : 'manual_boundary_check_required',
      bedAxisDegrees,
      conclusion: bedAxisDegrees === null
        ? 'Record the exact bed axis before checking whether it crosses a compass-palace boundary.'
        : 'The exact bed axis is recorded; check it against the selected school\u2019s compass-palace boundaries before final placement.',
    },
    adjustment: physicalIssues.length
      ? {
          type: 'bed_reposition',
          conclusion: 'Correct the stated physical bed conditions first, then calculate the personalized bed-foot direction from the resident\u2019s natal chart.',
        }
      : {
          type: 'personal_natal_review',
          conclusion: PERSONAL_BED_PLACEMENT_METHOD.requirement,
        },
  };
}

export function analyzeRoomMicroPattern(room = {}) {
  const orientation = resolveRoomOrientation(room);
  if (!orientation.sitting || !orientation.facing) {
    return {
      roomId: cleanString(room.id),
      name: cleanString(room.name) || 'Room',
      resolved: false,
      orientation,
      conclusion: 'Orientation could not be resolved.',
      adjustment: {
        type: 'manual_verification',
        directions: [],
        conclusion: 'Confirm the bedhead, largest window, or door direction before analysis.',
      },
    };
  }

  const sittingProfile = DIRECTION_PROFILE[orientation.sitting];
  const facingProfile = DIRECTION_PROFILE[orientation.facing];
  const relation = fiveElementRelation(sittingProfile.element, facingProfile.element);
  const energyPoints = normalizeEnergyPoints(room, orientation).map((point) => ({
    ...point,
    relationToSitting: fiveElementRelation(sittingProfile.element, point.element)?.key || '',
    strengthensFacing: relationStrengthensFacing(point.element, facingProfile.element),
  }));

  const drainingPoint = energyPoints.find((point) => point.relationToSitting === 'output');
  const strengthensFacing = energyPoints.filter((point) => point.strengthensFacing);
  let adjustment = {
    type: 'keep',
    directions: [],
    conclusion: 'The present room orientation and energy points can be retained.',
  };

  if (relation?.key === 'officer' && drainingPoint) {
    const directions = officerDrainDirections(drainingPoint.element, facingProfile.element);
    adjustment = {
      type: 'energy_point',
      directions,
      conclusion: `The ${drainingPoint.direction} ${drainingPoint.type} drains the sitting ${sittingProfile.element}. Add an energy point in ${directions.map((item) => item.direction).join(' or ')}.`,
      basis: 'officer_pattern_with_sitting_drain',
    };
  } else if (strengthensFacing.length > 0) {
    const directions = supportingSeatDirections(sittingProfile.element);
    adjustment = {
      type: 'energy_point',
      directions,
      conclusion: `The ${strengthensFacing.map((point) => `${point.direction} ${point.type}`).join(' and ')} strengthen the facing side. Reinforce the sitting side in ${directions.map((item) => item.direction).join(' or ')}.`,
      basis: 'facing_side_overstrengthened',
    };
  }

  return {
    roomId: cleanString(room.id),
    name: cleanString(room.name) || 'Room',
    sector: normalizeDirection(room.sector),
    occupantRoles: Array.isArray(room.occupantRoles || room.occupant_roles)
      ? [...new Set((room.occupantRoles || room.occupant_roles).map(cleanString).filter(Boolean))]
      : [],
    resolved: true,
    orientation,
    sitting: {
      direction: orientation.sitting,
      element: sittingProfile.element,
    },
    facing: {
      direction: orientation.facing,
      element: facingProfile.element,
    },
    relation,
    energyPoints,
    bedPlacement: analyzeBedPlacement(room),
    conclusion: `${sittingProfile.label} sitting and ${facingProfile.label} facing form a ${relation?.label || 'five-element pattern'}.`,
    adjustment,
  };
}

export function deriveHouseholdRoles(household = {}) {
  const roles = [];
  const marriedMen = cleanNonNegativeInteger(household.marriedMen ?? household.married_men);
  const marriedWomen = cleanNonNegativeInteger(household.marriedWomen ?? household.married_women);
  const sons = cleanNonNegativeInteger(household.sons);
  const daughters = cleanNonNegativeInteger(household.daughters);

  for (let index = 0; index < marriedMen; index += 1) roles.push('married_man');
  for (let index = 0; index < marriedWomen; index += 1) roles.push(index === 0 ? 'mother' : 'married_woman');

  if (sons >= 1) roles.push('eldest_son');
  if (sons >= 2) roles.push('middle_son');
  if (sons >= 3) roles.push('youngest_son');
  if (daughters >= 1) roles.push('eldest_daughter');
  if (daughters >= 2) roles.push('middle_daughter');
  if (daughters >= 3) roles.push('youngest_daughter');

  return roles;
}

function normalizedOccupants(input = {}) {
  if (Array.isArray(input.occupants)) {
    return input.occupants.map((occupant, index) => ({
      id: cleanString(occupant?.id) || `occupant-${index + 1}`,
      role: cleanString(occupant?.role),
      floor: Number(occupant?.floor) || 1,
      married: occupant?.married === true,
    })).filter((occupant) => occupant.role);
  }

  return deriveHouseholdRoles(input.household).map((role, index) => ({
    id: `occupant-${index + 1}`,
    role,
    floor: Number(input.floor) || 1,
    married: ['married_man', 'married_woman', 'mother'].includes(role),
  }));
}

function normalizedFacilities(input = {}) {
  const facilities = Array.isArray(input.facilities) ? input.facilities : [];
  return facilities.map((facility, index) => ({
    id: cleanString(facility?.id) || `facility-${index + 1}`,
    type: cleanString(facility?.type).toLowerCase(),
    sector: normalizeDirection(facility?.sector),
    floor: Number(facility?.floor) || Number(input.floor) || 1,
  })).filter((facility) => facility.type && facility.sector);
}

function normalizeSpaceFunction(value) {
  const normalized = cleanString(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (['bathroom', 'washroom', 'wc'].includes(normalized)) return 'toilet';
  if (['living', 'lounge', 'sitting_room'].includes(normalized)) return 'living_room';
  return SPACE_FUNCTION_PROFILE[normalized] ? normalized : '';
}

export function analyzeFunctionalSpaces(input = {}) {
  const spaces = [];
  const rooms = Array.isArray(input.rooms) ? input.rooms : [];
  for (const room of rooms) {
    const type = normalizeSpaceFunction(room?.roomType || room?.room_type || room?.type);
    const sector = normalizeDirection(room?.sector);
    if (!type || !sector) continue;
    spaces.push({
      id: cleanString(room?.id),
      name: cleanString(room?.name) || SPACE_FUNCTION_PROFILE[type].label,
      type,
      sector,
      floor: Number(room?.floor) || Number(input.floor) || 1,
    });
  }
  for (const facility of normalizedFacilities(input)) {
    const type = normalizeSpaceFunction(facility.type);
    if (!type) continue;
    spaces.push({
      id: facility.id,
      name: SPACE_FUNCTION_PROFILE[type].label,
      type,
      sector: facility.sector,
      floor: facility.floor,
    });
  }

  const seen = new Set();
  const findings = [];
  for (const space of spaces) {
    const key = `${space.floor}:${space.sector}:${space.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const profile = SPACE_FUNCTION_PROFILE[space.type];
    const palace = DIRECTION_PROFILE[space.sector];
    const palaceRole = cleanString(palace.familyRole).replaceAll('_', ' ') || 'whole-home center';
    const isSouthwestLivingRoom = space.type === 'living_room' && space.sector === 'southwest';
    const handledBySpecificRule = (
      (space.type === 'kitchen' && ['north', 'northwest'].includes(space.sector))
      || (space.type === 'toilet' && ['north', 'east'].includes(space.sector))
    );
    findings.push({
      code: `${space.type}_space_symbolism`,
      type: space.type,
      label: profile.label,
      sector: space.sector,
      floor: space.floor,
      symbolism: [...profile.symbolism],
      palaceRole,
      status: isSouthwestLivingRoom ? 'favorable_placement' : 'symbolic_layer_recorded',
      reportable: !handledBySpecificRule,
      conclusions: [
        profile.conclusion,
        `${palace.label} palace corresponds to ${palaceRole}; interpret the room function together with that household role.`,
        ...(isSouthwestLivingRoom
          ? ['A living room in Southwest Kun is a suitable placement and may be retained.']
          : []),
      ],
    });
  }
  return findings;
}

export function analyzeStructuralPalaces(input = {}) {
  const occupants = normalizedOccupants(input);
  const facilities = normalizedFacilities(input);
  const issues = [];
  const favorable = [];

  for (const facility of facilities) {
    if (facility.sector === 'northwest' && facility.type === 'kitchen') {
      const affected = occupants.filter((occupant) => (
        occupant.floor === facility.floor
        && (
          occupant.role === 'married_man'
          || occupant.role === 'father'
          || occupant.role === 'husband'
          || (occupant.married && !String(occupant.role).includes('woman'))
        )
      ));
      issues.push({
        code: 'fire_burns_heaven_gate',
        sector: 'northwest',
        facility: 'kitchen',
        floor: facility.floor,
        status: affected.length ? 'active' : 'not_activated_by_current_occupants',
        affectedOccupants: affected.map((occupant) => occupant.id),
        headline: 'Fire Burns the Heaven Gate',
        conclusions: affected.length
          ? [
              'A kitchen occupies the Northwest Qian palace.',
              'A married male living on this floor receives the palace effect.',
            ]
          : [
              'A kitchen occupies the Northwest Qian palace.',
              'No married male currently living on this floor activates the stated occupant rule.',
            ],
        associations: STRUCTURAL_ASSOCIATIONS.northwest,
        adjustment: {
          type: 'manual_service',
          conclusion: 'This is a whole-home structural issue. Seek a manual adjustment.',
        },
      });
    }

    if (facility.sector === 'east' && facility.type === 'toilet') {
      const affected = occupants.filter((occupant) => (
        occupant.floor === facility.floor && occupant.role === 'eldest_son'
      ));
      issues.push({
        code: 'east_toilet_affects_eldest_son',
        sector: 'east',
        facility: 'toilet',
        floor: facility.floor,
        status: affected.length ? 'active' : 'not_activated_by_current_occupants',
        affectedOccupants: affected.map((occupant) => occupant.id),
        headline: 'East Zhen palace is occupied by a toilet',
        conclusions: affected.length
          ? [
              'An only son is treated as the eldest son.',
              'The eldest-son role living on this floor receives the East Zhen palace effect.',
            ]
          : [
              'The East Zhen palace contains a toilet.',
              'No eldest-son role currently living on this floor receives the stated person-specific effect.',
            ],
        associations: STRUCTURAL_ASSOCIATIONS.east,
        adjustment: {
          type: 'manual_service',
          conclusion: 'This is a whole-home structural issue. Seek a manual adjustment.',
        },
      });
    }

    if (
      facility.sector === 'north'
      && ['kitchen', 'toilet'].includes(facility.type)
    ) {
      favorable.push({
        code: 'north_service_zone_supported',
        sector: 'north',
        facility: facility.type,
        conclusion: `A ${facility.type} may remain in the North service zone.`,
      });
    }

    if (facility.type === 'sink') {
      favorable.push({
        code: 'sink_is_not_toilet',
        sector: facility.sector,
        facility: 'sink',
        conclusion: 'A wash basin is a water point and is not classified as a toilet.',
      });
    }
  }

  const missingCorners = Array.isArray(input.missingCorners || input.missing_corners)
    ? input.missingCorners || input.missing_corners
    : [];
  for (const rawSector of missingCorners) {
    const sector = normalizeDirection(rawSector);
    if (!sector || sector === 'center') continue;
    const profile = DIRECTION_PROFILE[sector];
    issues.push({
      code: 'missing_corner',
      sector,
      headline: `${profile.label} palace is missing`,
      conclusions: [
        `The missing ${profile.label} sector corresponds to ${profile.familyRole || 'the palace role'}.`,
      ],
      associations: STRUCTURAL_ASSOCIATIONS[sector] || null,
      adjustment: {
        type: 'manual_service',
        conclusion: 'A missing corner is a building-form issue and cannot be resolved directly with an energy point. Seek a manual adjustment.',
      },
    });
  }

  return { occupants, facilities, issues, favorable };
}

export function analyzeRolePosition(personRole, palaceDirection) {
  const role = normalizePersonRole(personRole);
  const profile = PERSON_ROLE_PROFILE[role];
  const actualDirection = normalizeDirection(palaceDirection);
  const actualPalace = DIRECTION_PROFILE[actualDirection];
  if (!profile || !actualPalace || actualDirection === 'center') return null;

  const expectedPalace = DIRECTION_PROFILE[profile.expectedDirection];
  const aligned = actualDirection === profile.expectedDirection;
  const status = aligned ? 'role_position_aligned' : 'role_position_mismatch';
  const conclusions = aligned
    ? [
        `${profile.label} occupies the ${actualPalace.label} palace assigned to this household role.`,
        'Role and position are aligned. Long-term use supports clear standing and responsibility for this person in the household.',
      ]
    : [
        `${profile.label} occupies the ${actualPalace.label} palace, while this household role is assigned to the ${expectedPalace.label} palace.`,
        'Role and position do not align. The residential pattern weakens or redirects this person\u2019s assigned standing and responsibility in the household.',
        `Primary domains: ${profile.domains.join(', ')}.`,
      ];

  return {
    personRole: role,
    personLabel: profile.label,
    actualDirection,
    actualPalace: actualPalace.label,
    expectedDirection: profile.expectedDirection,
    expectedPalace: expectedPalace.label,
    status,
    label: aligned ? 'Role and position aligned' : 'Role-position mismatch',
    geographicEffect: aligned ? 'supports_assigned_role' : 'weakens_or_redirects_assigned_role',
    reviewDomains: [...profile.domains],
    conclusions,
    adjustment: aligned
      ? {
          type: 'keep',
          conclusion: 'The long-term room assignment may be retained.',
        }
      : {
          type: 'manual_service',
          conclusion: `Prefer long-term room use in the ${expectedPalace.label} sector. Also restore clear household responsibilities and relationship boundaries in the stated domains. If reassignment is impractical, seek a manual adjustment.`,
        },
  };
}

export function residenceHexagram(personRole, palaceDirection) {
  const role = normalizePersonRole(personRole);
  const personTrigram = PERSON_ROLE_TO_TRIGRAM[role];
  const palace = DIRECTION_PROFILE[normalizeDirection(palaceDirection)];
  const roomTrigram = palace?.trigram;
  if (!personTrigram || !roomTrigram || roomTrigram === 'center') return null;
  const name = HEXAGRAM_NAMES[personTrigram]?.[roomTrigram] || '';
  return {
    personRole: role,
    personTrigram,
    personTrigramChinese: TRIGRAM_CHINESE[personTrigram],
    palaceDirection: palace.key,
    roomTrigram,
    roomTrigramChinese: TRIGRAM_CHINESE[roomTrigram],
    name,
    rolePosition: analyzeRolePosition(role, palace.key),
    verdict: RESIDENCE_VERDICTS[name] || {
      label: 'Traditional person-to-palace combination',
      judgment: '',
      conclusions: [],
      adjustmentType: 'manual_review_if_needed',
    },
  };
}

export function analyzeResidenceAssignments(input = {}) {
  const rooms = Array.isArray(input.rooms) ? input.rooms : [];
  const results = [];
  for (const room of rooms) {
    const sector = normalizeDirection(room?.sector);
    const roles = Array.isArray(room?.occupantRoles || room?.occupant_roles)
      ? room.occupantRoles || room.occupant_roles
      : [];
    for (const role of roles) {
      const result = residenceHexagram(role, sector);
      if (!result) continue;
      results.push({
        roomId: cleanString(room?.id),
        roomName: cleanString(room?.name) || 'Room',
        ...result,
      });
    }
  }
  return results;
}

export function analyzeWholeHouse(input = {}) {
  const facing = normalizeDirection(
    input.wholeHouseFacing
      || input.whole_house_facing
      || input.mainOpeningDirection
      || input.main_opening_direction
  );
  const sitting = normalizeDirection(
    input.wholeHouseSitting
      || input.whole_house_sitting
  ) || oppositeDirection(facing);
  if (!sitting || !facing) {
    return {
      resolved: false,
      sitting: '',
      facing: '',
      conclusion: 'Confirm the main opening or whole-house facing direction.',
    };
  }
  const sittingProfile = DIRECTION_PROFILE[sitting];
  const facingProfile = DIRECTION_PROFILE[facing];
  const relation = fiveElementRelation(sittingProfile.element, facingProfile.element);
  return {
    resolved: true,
    sitting,
    facing,
    sittingElement: sittingProfile.element,
    facingElement: facingProfile.element,
    relation,
    conclusion: `${sittingProfile.label} sitting and ${facingProfile.label} facing form a ${relation?.label || 'five-element pattern'}.`,
  };
}

function priorityForIssue(issue) {
  if (issue.code === 'fire_burns_heaven_gate' && issue.status === 'active') return 100;
  if (issue.code === 'missing_corner') return 90;
  if (issue.code === 'east_toilet_affects_eldest_son' && issue.status === 'active') return 85;
  return 50;
}

export function buildFengShuiAudit(input = {}) {
  const wholeHouse = analyzeWholeHouse(input);
  const roomResults = (Array.isArray(input.rooms) ? input.rooms : [])
    .map((room) => analyzeRoomMicroPattern(room));
  const structural = analyzeStructuralPalaces(input);
  const residence = analyzeResidenceAssignments(input);
  const functionalSpaces = analyzeFunctionalSpaces(input);
  const priorities = [
    ...structural.issues.map((issue) => ({
      type: 'structural',
      priority: priorityForIssue(issue),
      code: issue.code,
      headline: issue.headline,
      adjustment: issue.adjustment,
    })),
    ...roomResults
      .filter((room) => room.adjustment?.type === 'energy_point')
      .map((room) => ({
        type: 'room_micro_pattern',
        priority: 70,
        code: 'room_energy_imbalance',
        headline: `${room.name}: ${room.relation?.label || 'room imbalance'}`,
        adjustment: room.adjustment,
      })),
    ...roomResults
      .filter((room) => room.bedPlacement?.physicalIssues?.length > 0)
      .map((room) => ({
        type: 'bed_placement',
        priority: 75,
        code: 'bed_physical_placement_issue',
        headline: `${room.name}: correct the physical bed placement`,
        adjustment: room.bedPlacement.adjustment,
      })),
    ...residence
      .filter((item) => item.rolePosition?.status === 'role_position_mismatch')
      .map((item) => ({
        type: 'role_position',
        priority: 65,
        code: 'role_position_mismatch',
        headline: `${item.rolePosition.personLabel} in ${item.rolePosition.actualPalace}: role-position mismatch`,
        adjustment: item.rolePosition.adjustment,
      })),
  ].sort((left, right) => right.priority - left.priority);

  return {
    schemaVersion: 'fengshui-audit-v1',
    scope: 'interior_residential',
    wholeHouse,
    roomMicroPatterns: roomResults,
    structuralIssues: structural.issues,
    favorableStructuralFindings: structural.favorable,
    functionalSpaceFindings: functionalSpaces,
    destinyTimingGeography: DESTINY_TIMING_GEOGRAPHY_FRAMEWORK,
    personalBedPlacementMethod: PERSONAL_BED_PLACEMENT_METHOD,
    residenceHexagrams: residence,
    rolePositionFindings: residence.map((item) => ({
      roomId: item.roomId,
      roomName: item.roomName,
      ...item.rolePosition,
    })),
    priorities,
    externalScopeNote: 'This report does not assess external Feng Shui. Request a manual service for the surrounding environment.',
    safetyNote: 'Body correspondences are traditional references and are not medical diagnoses.',
  };
}

export function toEnglishDeliveryAudit(audit = {}) {
  const englishRelation = (relation) => {
    if (!relation || typeof relation !== 'object') return relation;
    const { chinese: _chineseRelation, ...english } = relation;
    return english;
  };
  return {
    ...audit,
    wholeHouse: audit.wholeHouse && typeof audit.wholeHouse === 'object'
      ? { ...audit.wholeHouse, relation: englishRelation(audit.wholeHouse.relation) }
      : audit.wholeHouse,
    roomMicroPatterns: Array.isArray(audit.roomMicroPatterns)
      ? audit.roomMicroPatterns.map((room) => ({
          ...room,
          relation: englishRelation(room.relation),
        }))
      : [],
    residenceHexagrams: Array.isArray(audit.residenceHexagrams)
      ? audit.residenceHexagrams.map((item) => {
          const {
            name: _chineseHexagramName,
            personTrigramChinese: _personTrigramChinese,
            roomTrigramChinese: _roomTrigramChinese,
            verdict,
            ...englishItem
          } = item;
          const {
            judgment: _classicalChineseJudgment,
            ...englishVerdict
          } = verdict && typeof verdict === 'object' ? verdict : {};
          return {
            ...englishItem,
            verdict: englishVerdict,
          };
        })
      : [],
  };
}
