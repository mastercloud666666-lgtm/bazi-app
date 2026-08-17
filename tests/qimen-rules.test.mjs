import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { buildCalendarFacts } from '../public/js/qimen-lunar-adapter.mjs';
import {
  GATES,
  SPIRITS,
  STARS,
  buildStarGateCombinationLibrary,
  calculateQimenChart,
  detectDoorPressure,
  detectInstrumentPunishment,
} from '../public/js/qimen-rules.mjs';

const require = createRequire(import.meta.url);
const { Solar } = require('../public/js/lunar.js');
const root = path.resolve(import.meta.dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('calendar adapter derives precise Hour-School facts from the bundled calendar', () => {
  const facts = buildCalendarFacts(Solar, { year: 2024, month: 1, day: 15, hour: 10, minute: 0 });
  assert.equal(facts.solarTermId, 'minor-cold');
  assert.ok(facts.daysSinceSolarTerm > 9 && facts.daysSinceSolarTerm < 10);
  assert.deepEqual(facts.yearPillar, { stem: 'Gui', branch: 'Mao' });
  assert.deepEqual(facts.monthPillar, { stem: 'Yi', branch: 'Chou' });
  assert.deepEqual(facts.dayPillar, { stem: 'Wu', branch: 'Yin' });
  assert.deepEqual(facts.timePillar, { stem: 'Ding', branch: 'Si' });
});

test('2024-01-15 10:00 cross-check builds Yang Dun Ju 8 and all five chart layers', () => {
  const facts = buildCalendarFacts(Solar, { year: 2024, month: 1, day: 15, hour: 10, minute: 0 });
  const chart = calculateQimenChart(facts);

  assert.equal(chart.ju.termName, 'Minor Cold');
  assert.equal(chart.ju.yuanName, 'Middle Yuan');
  assert.equal(chart.ju.dunName, 'Yang Dun');
  assert.equal(chart.ju.juNumber, 8);
  assert.equal(chart.xun.head, 'Jia Yin');
  assert.equal(chart.xun.hiddenStem, 'Gui');
  assert.equal(chart.xun.flyStep, 3);
  assert.equal(chart.chief.star.name, 'Tian Fu');
  assert.equal(chart.envoy.gate.name, 'Obstruction Gate');

  assert.deepEqual(chart.palaces.map((palace) => palace.earthStem), ['Gui', 'Ji', 'Xin', 'Ren', 'Ding', 'Yi', 'Wu', 'Geng', 'Bing']);
  assert.deepEqual(chart.palaces.map((palace) => palace.heavenStem), ['Wu', 'Ren', 'Gui', 'Geng', 'Ding', 'Ji', 'Bing', 'Yi', 'Xin']);
  assert.deepEqual(chart.palaces.map((palace) => palace.star?.name), ['Tian Ren', 'Tian Chong', 'Tian Fu', 'Tian Peng', 'Tian Qin', 'Tian Ying', 'Tian Xin', 'Tian Zhu', 'Tian Rui']);
  assert.deepEqual(chart.palaces.map((palace) => palace.gate?.name || ''), ['Rest Gate', 'Life Gate', 'Harm Gate', 'Open Gate', '', 'Obstruction Gate', 'Alarm Gate', 'Death Gate', 'View Gate']);
  assert.deepEqual(chart.palaces.map((palace) => palace.spirit?.name || ''), ['Nine Earth', 'Nine Heaven', 'Chief', 'Black Tortoise', '', 'Soaring Serpent', 'White Tiger', 'Six Harmony', 'Great Yin']);
});

test('2024-07-15 10:00 cross-check builds Yin Dun Ju 2 with reverse earth and gate placement', () => {
  const facts = buildCalendarFacts(Solar, { year: 2024, month: 7, day: 15, hour: 10, minute: 0 });
  const chart = calculateQimenChart(facts);
  assert.equal(chart.ju.termName, 'Minor Heat');
  assert.equal(chart.ju.yuanName, 'Middle Yuan');
  assert.equal(chart.ju.dunName, 'Yin Dun');
  assert.equal(chart.ju.juNumber, 2);
  assert.equal(chart.xun.head, 'Jia Xu');
  assert.equal(chart.chief.star.name, 'Tian Peng');
  assert.equal(chart.envoy.gate.name, 'Rest Gate');
  assert.deepEqual(chart.palaces.map((palace) => palace.earthStem), ['Bing', 'Geng', 'Wu', 'Yi', 'Ding', 'Ren', 'Xin', 'Ji', 'Gui']);
  assert.deepEqual(chart.palaces.map((palace) => palace.heavenStem), ['Yi', 'Bing', 'Geng', 'Xin', 'Ding', 'Wu', 'Ji', 'Gui', 'Ren']);
  assert.deepEqual(chart.palaces.map((palace) => palace.star?.name), ['Tian Chong', 'Tian Fu', 'Tian Ying', 'Tian Ren', 'Tian Qin', 'Tian Rui', 'Tian Peng', 'Tian Xin', 'Tian Zhu']);
  assert.deepEqual(chart.palaces.map((palace) => palace.gate?.name || ''), ['Life Gate', 'Harm Gate', 'Obstruction Gate', 'Rest Gate', '', 'View Gate', 'Open Gate', 'Alarm Gate', 'Death Gate']);
});

test('symbol and combination framework covers every requested category', () => {
  assert.equal(STARS.length, 9);
  assert.equal(GATES.length, 8);
  assert.equal(SPIRITS.length, 8);
  for (const star of STARS) {
    assert.ok(star.meaning);
    assert.ok(star.direct);
    assert.ok(star.risk);
  }
  for (const gate of GATES) {
    assert.ok(gate.meaning);
    assert.ok(gate.favorable);
    assert.ok(gate.unfavorable);
  }
  const combinations = buildStarGateCombinationLibrary();
  assert.equal(combinations.length, 72);
  assert.equal(new Set(combinations.map((item) => item.id)).size, 72);
  assert.ok(combinations.every((item) => item.summary && item.elementReading && item.favorableUse && item.risk));
});

test('door pressure and six-instrument punishment checks are explicit', () => {
  const restGate = GATES.find((gate) => gate.id === 'rest');
  const southPalace = { trigram: 'Li', element: 'Fire' };
  assert.equal(detectDoorPressure(restGate, southPalace)?.code, 'door-pressure');
  for (const [stem, palace] of [['Wu', 3], ['Ji', 2], ['Geng', 6], ['Xin', 1], ['Ren', 0], ['Gui', 0]]) {
    assert.equal(detectInstrumentPunishment(stem, palace)?.code, 'instrument-punishment');
  }
  assert.equal(detectInstrumentPunishment('Geng', 5), null);
});

test('Feng Shui page exposes an English Qi Men chart surface and its modules', () => {
  const page = read('public/tengyunzi-feng-shui.html');
  const controller = read('public/js/tengyunzi-qimen.mjs');
  assert.match(page, /id="qimen"/);
  assert.match(page, /Build Hour-School Chart/);
  assert.match(page, /Chai Bu solar-term method/);
  assert.match(page, /72 Star-Gate combinations/);
  assert.match(page, /data-qimen-empty/);
  assert.match(page, /data-qimen-calendar/);
  assert.match(page, /August|data-qimen-calendar-month/);
  assert.match(page, /<span>Sun<\/span><span>Mon<\/span>/);
  assert.match(page, /data-qimen-calendar-clear>Clear/);
  assert.match(page, /data-qimen-calendar-today>Today/);
  assert.match(page, /placeholder="YYYY-MM-DD"/);
  assert.match(page, /placeholder="HH:MM"/);
  assert.doesNotMatch(page, /type="date"/);
  assert.doesNotMatch(page, /type="time"/);
  assert.match(page, /tengyunzi-qimen\.mjs/);
  assert.match(page, /lunar\.js/);
  assert.match(controller, /calculateQimenChart/);
  assert.match(controller, /emptyState\.hidden = true/);
  assert.doesNotMatch(page, /[\u3400-\u9fff]/);
  assert.doesNotMatch(controller, /[\u3400-\u9fff]/);
  assert.doesNotMatch(page, /[\u2013\u2014]/);
});
