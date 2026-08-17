import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeBedPlacement,
  analyzeFunctionalSpaces,
  analyzeRolePosition,
  analyzeRoomMicroPattern,
  analyzeStructuralPalaces,
  analyzeWholeHouse,
  buildFengShuiAudit,
  deriveHouseholdRoles,
  fiveElementRelation,
  residenceHexagram,
  resolveRoomOrientation,
  toEnglishDeliveryAudit,
} from '../supabase/functions/_shared/fengshui-rules.mjs';

test('five-element room roles use the sitting side as the Day-Master reference', () => {
  assert.equal(fiveElementRelation('water', 'fire').key, 'wealth');
  assert.equal(fiveElementRelation('fire', 'water').key, 'officer');
  assert.equal(fiveElementRelation('water', 'wood').key, 'output');
  assert.equal(fiveElementRelation('metal', 'water').key, 'output');
  assert.equal(fiveElementRelation('water', 'metal').key, 'resource');
  assert.equal(fiveElementRelation('wood', 'wood').key, 'companion');
});

test('bedroom orientation uses bedhead first', () => {
  assert.deepEqual(resolveRoomOrientation({
    bedHead: 'north',
    bedFoot: 'south',
    mainWindow: 'east',
    door: 'west',
  }), {
    sitting: 'north',
    facing: 'south',
    basis: 'bed',
    basisDetail: 'The wall behind the bedhead is the sitting side; the bed-foot direction is the facing side.',
  });
});

test('room without bed uses the largest window, then the door', () => {
  assert.equal(resolveRoomOrientation({
    windows: [
      { direction: 'east', area: 2 },
      { direction: 'south', area: 5 },
    ],
    door: 'west',
  }).facing, 'south');
  assert.deepEqual(resolveRoomOrientation({ door: 'east' }), {
    sitting: 'west',
    facing: 'east',
    basis: 'door',
    basisDetail: 'With no bed or window, the door direction is the facing side and its opposite is the sitting side.',
  });
});

test('north-sitting south-facing bedroom is a Wealth pattern', () => {
  const result = analyzeRoomMicroPattern({
    id: 'master',
    name: 'Master bedroom',
    bedHead: 'north',
    bedFoot: 'south',
    door: 'northwest',
  });
  assert.equal(result.relation.key, 'wealth');
  assert.equal(result.sitting.element, 'water');
  assert.equal(result.facing.element, 'fire');
});

test('study example is Officer pattern and prescribes West or North energy point', () => {
  const result = analyzeRoomMicroPattern({
    id: 'study',
    name: 'Study',
    windows: [{ direction: 'north', area: 6 }],
    door: 'southwest',
  });
  assert.equal(result.orientation.sitting, 'south');
  assert.equal(result.relation.key, 'officer');
  assert.equal(result.energyPoints[0].relationToSitting, 'output');
  assert.equal(result.adjustment.type, 'energy_point');
  assert.deepEqual(
    result.adjustment.directions.map((item) => item.direction),
    ['west', 'north'],
  );
});

test('bed placement keeps physical checks separate from personalized natal direction', () => {
  const result = analyzeBedPlacement({
    bedHead: 'west',
    bedHeadSupport: 'window',
    bedFootTarget: 'toilet_door',
    bedHeadBacksOnto: 'stove',
    overheadBeam: true,
    directAirflowAtHead: true,
    bedAxisDegrees: 270,
  });
  assert.equal(result.applicable, true);
  assert.equal(result.status, 'physical_adjustment_required');
  assert.equal(result.physicalIssues.length, 5);
  assert.equal(result.personalizedFootDirection.status, 'requires_verified_natal_chart');
  assert.equal(result.compassBoundaryCheck.status, 'manual_boundary_check_required');
  assert.equal(result.adjustment.type, 'bed_reposition');
});

test('only son is fixed as eldest son', () => {
  assert.deepEqual(deriveHouseholdRoles({
    marriedMen: 1,
    marriedWomen: 1,
    sons: 1,
    daughters: 0,
  }), ['married_man', 'mother', 'eldest_son']);
});

test('Northwest kitchen affects married male only on the same floor', () => {
  const result = analyzeStructuralPalaces({
    occupants: [
      { id: 'husband', role: 'married_man', married: true, floor: 2 },
      { id: 'grandfather', role: 'father', married: true, floor: 1 },
      { id: 'son', role: 'eldest_son', married: false, floor: 1 },
    ],
    facilities: [{ type: 'kitchen', sector: 'northwest', floor: 1 }],
  });
  const issue = result.issues[0];
  assert.equal(issue.code, 'fire_burns_heaven_gate');
  assert.deepEqual(issue.affectedOccupants, ['grandfather']);
  assert.equal(issue.adjustment.type, 'manual_service');
});

test('East toilet affects an only son while sink is never classified as toilet', () => {
  const result = analyzeStructuralPalaces({
    household: { marriedMen: 1, marriedWomen: 1, sons: 1 },
    floor: 1,
    facilities: [
      { type: 'toilet', sector: 'east', floor: 1 },
      { type: 'sink', sector: 'center', floor: 1 },
    ],
  });
  const issue = result.issues.find((item) => item.code === 'east_toilet_affects_eldest_son');
  assert.equal(issue.status, 'active');
  assert.ok(result.favorable.some((item) => item.code === 'sink_is_not_toilet'));
});

test('North kitchen and toilet are retained as a favorable service zone', () => {
  const result = analyzeStructuralPalaces({
    facilities: [
      { type: 'kitchen', sector: 'north' },
      { type: 'toilet', sector: 'north' },
    ],
  });
  assert.equal(result.favorable.filter((item) => item.code === 'north_service_zone_supported').length, 2);
});

test('functional space symbolism is combined with the actual whole-home palace', () => {
  const findings = analyzeFunctionalSpaces({
    rooms: [{ id: 'living', roomType: 'living_room', sector: 'southwest' }],
    facilities: [
      { id: 'kitchen', type: 'kitchen', sector: 'south' },
      { id: 'toilet', type: 'toilet', sector: 'west' },
    ],
  });
  const living = findings.find((item) => item.type === 'living_room');
  const kitchen = findings.find((item) => item.type === 'kitchen');
  const toilet = findings.find((item) => item.type === 'toilet');
  assert.equal(living.status, 'favorable_placement');
  assert.match(living.conclusions.join(' '), /suitable placement/i);
  assert.deepEqual(kitchen.symbolism, ['knife', 'fire', 'cutting']);
  assert.ok(toilet.symbolism.includes('legal friction'));
});

test('known person-over-palace combinations return the approved residence hexagrams', () => {
  assert.equal(residenceHexagram('husband', 'southeast').name, '天风姤');
  assert.equal(residenceHexagram('wife', 'southeast').name, '地风升');
  assert.equal(residenceHexagram('eldest_son', 'southwest').name, '雷地豫');
});

test('household roles are checked against their assigned residential palaces', () => {
  const husband = analyzeRolePosition('husband', 'northwest');
  const wife = analyzeRolePosition('wife', 'southwest');
  const onlySon = analyzeRolePosition('eldest_son', 'east');
  assert.equal(husband.status, 'role_position_aligned');
  assert.equal(wife.status, 'role_position_aligned');
  assert.equal(onlySon.status, 'role_position_aligned');
  assert.equal(husband.adjustment.type, 'keep');
});

test('role-position mismatch names the correct palace and affected domains', () => {
  const result = analyzeRolePosition('eldest_son', 'southwest');
  assert.equal(result.status, 'role_position_mismatch');
  assert.equal(result.actualPalace, 'Southwest');
  assert.equal(result.expectedPalace, 'East');
  assert.ok(result.reviewDomains.includes('family responsibility'));
  assert.equal(result.adjustment.type, 'manual_service');
  assert.match(result.adjustment.conclusion, /East sector/);
});

test('whole house south-facing with north sitting is a Wealth house', () => {
  const result = analyzeWholeHouse({ mainOpeningDirection: 'south' });
  assert.equal(result.sitting, 'north');
  assert.equal(result.relation.key, 'wealth');
});

test('structural issues never receive energy-point remedies', () => {
  const audit = buildFengShuiAudit({
    wholeHouseFacing: 'south',
    household: { marriedMen: 1, marriedWomen: 1, sons: 1 },
    facilities: [
      { type: 'kitchen', sector: 'northwest' },
      { type: 'toilet', sector: 'east' },
    ],
    missingCorners: ['northwest'],
  });
  assert.ok(audit.structuralIssues.length >= 3);
  assert.equal(audit.structuralIssues.every((issue) => issue.adjustment.type === 'manual_service'), true);
});

test('customer delivery audit removes Chinese hexagram names and classical text', () => {
  const audit = buildFengShuiAudit({
    rooms: [
      {
        id: 'couple',
        name: 'Couple bedroom',
        sector: 'southeast',
        bedHead: 'north',
        occupantRoles: ['husband', 'wife'],
      },
    ],
  });
  const delivery = toEnglishDeliveryAudit(audit);
  const serialized = JSON.stringify(delivery);
  assert.doesNotMatch(serialized, /[\u3400-\u9fff]/);
  assert.equal(delivery.residenceHexagrams[0].verdict.label, 'Heaven over Wind — Gou');
});

test('audit adds the Tian Ji residential framework and ranks role-position mismatch', () => {
  const audit = buildFengShuiAudit({
    rooms: [{
      id: 'son-room',
      name: 'Son bedroom',
      sector: 'southwest',
      occupantRoles: ['eldest_son'],
    }],
  });
  assert.equal(audit.destinyTimingGeography.label, 'Destiny, Timing, and Geography');
  assert.deepEqual(
    audit.destinyTimingGeography.layers.map((layer) => layer.key),
    ['destiny', 'timing', 'geography'],
  );
  assert.equal(audit.rolePositionFindings[0].status, 'role_position_mismatch');
  assert.ok(audit.priorities.some((item) => item.code === 'role_position_mismatch'));
  assert.match(audit.destinyTimingGeography.mechanism.join(' '), /habits and choices/i);
  assert.match(audit.destinyTimingGeography.judgmentSequence.join(' '), /person trigram/i);
  assert.match(audit.personalBedPlacementMethod.requirement, /natal Zi Wei chart/i);
});

test('physical bed issue is ranked before a room energy-point adjustment', () => {
  const audit = buildFengShuiAudit({
    rooms: [{
      id: 'study-bed',
      name: 'Study bedroom',
      sector: 'north',
      bedHead: 'south',
      bedFoot: 'north',
      door: 'southwest',
      bedHeadSupport: 'glass',
    }],
  });
  const bedPriority = audit.priorities.find((item) => item.type === 'bed_placement');
  const energyPriority = audit.priorities.find((item) => item.type === 'room_micro_pattern');
  assert.equal(bedPriority.priority, 75);
  assert.equal(energyPriority.priority, 70);
  assert.ok(audit.priorities.indexOf(bedPriority) < audit.priorities.indexOf(energyPriority));
});

test('unknown hexagram details stay English-only in customer delivery', () => {
  const audit = buildFengShuiAudit({
    rooms: [{
      id: 'father-room',
      name: 'Father bedroom',
      sector: 'northwest',
      occupantRoles: ['father'],
    }],
  });
  const delivery = toEnglishDeliveryAudit(audit);
  assert.doesNotMatch(JSON.stringify(delivery), /[\u3400-\u9fff]/);
  assert.equal(
    delivery.residenceHexagrams[0].verdict.label,
    'Traditional person-to-palace combination',
  );
});
