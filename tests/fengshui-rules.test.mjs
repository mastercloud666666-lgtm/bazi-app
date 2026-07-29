import test from 'node:test';
import assert from 'node:assert/strict';
import {
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

test('known person-over-palace combinations return the approved residence hexagrams', () => {
  assert.equal(residenceHexagram('husband', 'southeast').name, '天风姤');
  assert.equal(residenceHexagram('wife', 'southeast').name, '地风升');
  assert.equal(residenceHexagram('eldest_son', 'southwest').name, '雷地豫');
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
