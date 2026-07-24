import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeAnnualInteractions,
  analyzeNatalInteractions,
  assessDayMasterStrength,
  balancingElementGuidance,
  charPolarity,
  elementProfile,
  hiddenStemWeights,
  luckDirection,
  shenShaForChart,
  tenGod,
  tenGodElementRoles,
  timingPosture,
  weightedTenGodProfile,
} from '../supabase/functions/_shared/bazi-rules.mjs';

const NATAL_1994 = {
  year: { stem: '甲', branch: '戌' },
  month: { stem: '壬', branch: '申' },
  day: { stem: '甲', branch: '戌' },
  hour: { stem: '壬', branch: '申' },
};

function types(interactions) {
  return new Set(interactions.map((item) => item.type));
}

test('stem and branch polarity identifies 壬 and 申 as Yang', () => {
  assert.equal(charPolarity('壬'), 'yang');
  assert.equal(charPolarity('申'), 'yang');
  assert.equal(charPolarity('癸'), 'yin');
  assert.equal(charPolarity('酉'), 'yin');
});

test('甲 Day Master maps Water to Resource, Metal to Officer, and Fire to Output', () => {
  assert.equal(tenGod('甲', '壬'), '偏印');
  assert.equal(tenGod('甲', '庚'), '七杀');
  assert.equal(tenGod('甲', '丙'), '食神');
  assert.deepEqual(tenGodElementRoles('wood'), {
    wood: 'Companion', fire: 'Output', earth: 'Wealth', metal: 'Officer', water: 'Resource',
  });
});

test('weighted Ten-God percentages total 100 and use consistent pillar weights', () => {
  const profile = weightedTenGodProfile(NATAL_1994);
  assert.equal(profile.reduce((sum, item) => sum + item.percentage, 0), 100);
  const indirectResource = profile.find((item) => item.name === '偏印');
  assert.equal(indirectResource.visible, 2.25);
  assert.ok(indirectResource.hidden > 0);
  assert.equal(profile.find((item) => item.name === '劫财').english, 'Rob Wealth');
});

test('hidden-stem weights sum to one inside every canonical branch', () => {
  for (const branch of ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']) {
    const weights = hiddenStemWeights(branch);
    assert.ok(Math.abs(weights.reduce((sum, value) => sum + value, 0) - 1) < 1e-9, branch);
  }
  assert.deepEqual(hiddenStemWeights('子'), [1]);
  assert.deepEqual(hiddenStemWeights('午'), [0.7, 0.3]);
  assert.deepEqual(hiddenStemWeights('申'), [0.6, 0.3, 0.1]);
});

test('visible Fire zero remains distinct from hidden Fire in both 戌 branches', () => {
  const profile = elementProfile(NATAL_1994);
  assert.equal(profile.visible.fire, 0);
  assert.ok(profile.hidden.fire > 0);
  assert.equal(profile.presence.fire, 'hidden_only');
});

test('Day Master strength is chart-specific rather than a fixed label', () => {
  const sample = assessDayMasterStrength(NATAL_1994);
  assert.equal(sample.classification, 'weak');
  assert.equal(sample.label, 'weak but supported');
  assert.deepEqual(sample.rootBranches, []);

  const strongWood = assessDayMasterStrength({
    year: { stem: '壬', branch: '亥' }, month: { stem: '癸', branch: '亥' },
    day: { stem: '甲', branch: '寅' }, hour: { stem: '乙', branch: '卯' },
  });
  assert.equal(strongWood.classification, 'strong');
  assert.ok(strongWood.rootBranches.includes('寅'));

});

test('balancing guidance changes with the assessed Day Master strength', () => {
  const weak = balancingElementGuidance('wood', { classification: 'weak' });
  assert.deepEqual(weak.favorable.sort(), ['water', 'wood']);
  assert.deepEqual(weak.caution.sort(), ['earth', 'metal']);
  assert.deepEqual(weak.conditional, ['fire']);

  const strong = balancingElementGuidance('wood', { classification: 'strong' });
  assert.deepEqual(strong.favorable.sort(), ['earth', 'fire', 'metal']);
  assert.deepEqual(strong.caution.sort(), ['water', 'wood']);
});

test('Luck Pillar direction follows Yang-male/Yin-female forward rule', () => {
  assert.deepEqual(luckDirection('甲', 'female'), {
    forward: false,
    direction: 'Reverse',
    basis: 'Female birth in a Yang-stem year',
  });
  assert.equal(luckDirection('甲', 'male').direction, 'Forward');
  assert.equal(luckDirection('乙', 'female').direction, 'Forward');
  assert.equal(luckDirection('乙', 'male').direction, 'Reverse');
});

test('canonical Shen Sha preserves every supported natal placement', () => {
  const stars = shenShaForChart(NATAL_1994);
  assert.deepEqual(
    stars.map((item) => `${item.name}:${item.pillar}:${item.branch}`).sort(),
    ['华盖:day:戌', '华盖:year:戌', '驿马:hour:申', '驿马:month:申'].sort(),
  );
  assert.equal(stars.every((item) => item.source === 'Day Pillar + Year Pillar'), true);
});

test('same branch does not impersonate two members of a relation pair', () => {
  const interactions = analyzeAnnualInteractions({ annualGz: '戊申', natalPillars: NATAL_1994 });
  const found = types(interactions);
  assert.equal(found.has('six_combine'), false);
  assert.equal(found.has('six_clash'), false);
  assert.equal(found.has('six_harm'), false);
  assert.equal(found.has('six_break'), false);
  assert.equal(found.has('branch_repeat'), true);
});

test('six combine, clash, harm, and break require exact distinct pairs', () => {
  const cases = [
    ['甲子', '己丑', 'six_combine'],
    ['甲子', '己午', 'six_clash'],
    ['甲子', '己未', 'six_harm'],
    ['甲子', '己酉', 'six_break'],
  ];
  for (const [annualGz, natalGz, expected] of cases) {
    const interactions = analyzeAnnualInteractions({
      annualGz,
      natalPillars: { year: { stem: natalGz[0], branch: natalGz[1] } },
      hourKnown: false,
    });
    assert.equal(types(interactions).has(expected), true, `${annualGz} vs ${natalGz} should contain ${expected}`);
  }
});

test('all Six Combines use the standard associated element', () => {
  const cases = [
    ['甲子', '乙丑', 'earth'], ['甲寅', '乙亥', 'wood'], ['甲卯', '乙戌', 'fire'],
    ['甲辰', '乙酉', 'metal'], ['甲巳', '乙申', 'water'], ['甲午', '乙未', 'earth'],
  ];
  for (const [annualGz, natalGz, expectedElement] of cases) {
    const combine = analyzeAnnualInteractions({
      annualGz,
      natalPillars: { year: { stem: natalGz[0], branch: natalGz[1] } },
      hourKnown: false,
    }).find((item) => item.type === 'six_combine');
    assert.equal(combine?.resultingElement, expectedElement, `${annualGz}/${natalGz}`);
  }
});

test('punishment and self-punishment are distinguished', () => {
  const ziMao = analyzeAnnualInteractions({ annualGz: '甲子', natalPillars: { year: { stem: '乙', branch: '卯' } }, hourKnown: false });
  const group = analyzeAnnualInteractions({ annualGz: '甲寅', natalPillars: { year: { stem: '乙', branch: '巳' } }, hourKnown: false });
  const self = analyzeAnnualInteractions({ annualGz: '甲午', natalPillars: { year: { stem: '乙', branch: '午' } }, hourKnown: false });
  assert.equal(types(ziMao).has('punishment'), true);
  assert.equal(types(group).has('punishment'), true);
  assert.equal(types(self).has('self_punishment'), true);
});

test('three harmony, half harmony, and three meeting are evidence based', () => {
  const half = analyzeAnnualInteractions({ annualGz: '丙午', natalPillars: NATAL_1994 });
  assert.equal(half.some((item) => item.type === 'half_harmony' && item.resultingElement === 'fire'), true);

  const full = analyzeAnnualInteractions({
    annualGz: '丙午',
    natalPillars: { year: { stem: '甲', branch: '寅' }, day: { stem: '乙', branch: '戌' } },
    hourKnown: false,
  });
  assert.equal(full.some((item) => item.type === 'three_harmony' && item.resultingElement === 'fire'), true);

  const meeting = analyzeAnnualInteractions({
    annualGz: '丙午',
    natalPillars: { year: { stem: '甲', branch: '巳' }, day: { stem: '乙', branch: '未' } },
    hourKnown: false,
  });
  assert.equal(meeting.some((item) => item.type === 'three_meeting' && item.resultingElement === 'fire'), true);
});

test('Three-Harmony half combinations are distinguished from arch combinations', () => {
  const half = analyzeAnnualInteractions({
    annualGz: '丙午',
    natalPillars: { year: { stem: '甲', branch: '戌' } },
    hourKnown: false,
  });
  assert.equal(half.some((item) => item.type === 'half_harmony' && item.target === '午戌'), true);

  const arch = analyzeAnnualInteractions({
    annualGz: '戊辰',
    natalPillars: { year: { stem: '甲', branch: '申' } },
    hourKnown: false,
  });
  assert.equal(arch.some((item) => item.type === 'arch_harmony' && item.target === '申辰'), true);
  assert.equal(arch.some((item) => item.type === 'half_harmony'), false);
});

test('Fu Yin and Fan Yin require exact whole-pillar evidence', () => {
  const fu = analyzeAnnualInteractions({ annualGz: '甲戌', natalPillars: NATAL_1994 });
  assert.equal(types(fu).has('fu_yin'), true);
  const fan = analyzeAnnualInteractions({
    annualGz: '庚辰',
    natalPillars: { day: { stem: '甲', branch: '戌' } },
    hourKnown: false,
  });
  assert.equal(types(fan).has('fan_yin'), true);
});

test('natal interaction analysis distinguishes exact Fu Yin from ordinary repeats', () => {
  const interactions = analyzeNatalInteractions(NATAL_1994);
  const fuYin = interactions.filter((item) => item.type === 'fu_yin');
  assert.deepEqual(fuYin.map((item) => item.source).sort(), ['壬申', '甲戌']);
  assert.equal(fuYin.some((item) => item.pillars.join('/') === 'year/day'), true);
  assert.equal(fuYin.some((item) => item.pillars.join('/') === 'month/hour'), true);
  assert.equal(interactions.some((item) => item.type === 'self_punishment'), false);
  assert.equal(interactions.some((item) => item.type === 'six_clash'), false);
});

test('1994 sample annual contacts no longer show impossible four-way labels', () => {
  const y2028 = analyzeAnnualInteractions({ annualGz: '戊申', natalPillars: NATAL_1994, luckGz: '戊辰' });
  const y2030 = analyzeAnnualInteractions({ annualGz: '庚戌', natalPillars: NATAL_1994, luckGz: '戊辰' });
  assert.equal(y2028.some((item) => item.type === 'arch_harmony' && item.scope === 'luck'), true);
  assert.equal(types(y2028).has('six_clash'), false);
  assert.equal(y2030.some((item) => item.type === 'six_clash' && item.scope === 'luck'), true);
  assert.equal(y2030.some((item) => item.type === 'stem_clash' && item.scope === 'natal'), true);
  assert.equal(types(y2030).has('six_combine'), false);
  assert.equal(types(y2030).has('six_harm'), false);
  assert.equal(types(y2030).has('six_break'), false);
  assert.equal(timingPosture(y2030, 'Seven Killings'), 'DEFEND');
});

test('timing posture uses chart-specific favorable elements instead of treating every Wealth year as advance', () => {
  const guidance = balancingElementGuidance('wood', { classification: 'weak' });
  assert.equal(timingPosture([], 'Indirect Wealth', { ...guidance, annualElement: 'earth' }), 'STEADY');
  assert.equal(timingPosture([], 'Indirect Resource', { ...guidance, annualElement: 'water' }), 'ADVANCE');
});
