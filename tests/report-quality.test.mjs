import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  REPORT_CONFIDENCE,
  confidenceForSection,
  deduplicateReportSections,
  splitReportSentences,
} from '../supabase/functions/_shared/report-quality.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('all 13 standard chapters have an explicit confidence tier', () => {
  assert.equal(Object.keys(REPORT_CONFIDENCE).length, 13);
  for (let number = 1; number <= 13; number += 1) {
    const confidence = confidenceForSection(number);
    assert.match(confidence.level, /^(CALCULATED|SUPPORTED|CONTEXTUAL)$/);
    assert.ok(confidence.label);
    assert.ok(confidence.note);
  }
  assert.equal(confidenceForSection(1).level, 'SUPPORTED');
  assert.equal(confidenceForSection(7).level, 'CONTEXTUAL');
  assert.equal(confidenceForSection(13).level, 'SUPPORTED');
});

test('report deduplication removes repeated long claims across chapters', () => {
  const repeated = 'The Month Branch sets the seasonal climate, while visible roots and hidden stems determine how securely the Day Master can receive support.';
  const input = [
    `Section 1: Four Pillars and Day Master\n${repeated} This short statement stays.`,
    `Section 2: Seasonal Qi and Day Master Strength\n${repeated} The seasonal conclusion is explained here.`,
    'Section 3: Five Elements and Hidden Stems\nMetal is visible while Water appears only in hidden stems.',
  ].join('\n\n');
  const result = deduplicateReportSections(input);
  assert.equal(result.removed.length, 1);
  assert.equal(result.text.match(/The Month Branch sets/g)?.length, 1);
  assert.match(result.text, /This short statement stays/);
  assert.match(result.text, /Section 1:/);
  assert.match(result.text, /Section 2:/);
  assert.match(result.text, /Section 3:/);
});

test('report deduplication also preserves internal canonical section markers', () => {
  const repeated = 'Canonical evidence is stated once so later timing chapters do not repeat the same long structural claim without adding new information.';
  const result = deduplicateReportSections(`第1段：First\n${repeated}\n\n第2段：Second\n${repeated}`);
  assert.equal(result.removed.length, 1);
  assert.match(result.text, /第1段：First/);
  assert.match(result.text, /第2段：Second/);
});

test('deduplication preserves similar calculated claims with different pillar evidence', () => {
  const month = '驿马 (Travel Horse) at the month Branch 申, derived from the Day Pillar; it traditionally marks movement, travel, relocation, or changing operational conditions.';
  const hour = '驿马 (Travel Horse) at the hour Branch 申, derived from the Day Pillar; it traditionally marks movement, travel, relocation, or changing operational conditions.';
  const result = deduplicateReportSections(`Section 7: Shen Sha\n${month} ${hour}`);
  assert.equal(result.removed.length, 0);
  assert.match(result.text, /month Branch 申/);
  assert.match(result.text, /hour Branch 申/);
});

test('deduplication preserves decimal values inside calculated evidence', () => {
  const result = deduplicateReportSections('Section 2: Strength\nSupport is 3.78, while pressure is 6.42. This remains a supported structural reading.');
  assert.match(result.text, /3\.78/);
  assert.match(result.text, /6\.42/);
  assert.doesNotMatch(result.text, /3\. 78|6\. 42/);
});

test('shared report sentence splitting keeps decimal evidence in one sentence', () => {
  const result = splitReportSentences('Support is 3.78, while pressure is 6.42. The chart is weak but supported.');
  assert.deepEqual(result, [
    'Support is 3.78, while pressure is 6.42.',
    ' The chart is weak but supported.',
  ]);
});

test('frontend exposes the same confidence levels and standard chapter count', () => {
  const source = fs.readFileSync(path.join(root, 'public', 'js', 'tengyunzi-report.js'), 'utf8');
  for (let number = 1; number <= 13; number += 1) {
    assert.match(source, new RegExp(`\\b${number}: \\['${confidenceForSection(number).level}'`));
  }
  assert.match(source, /Reading depth/);
  assert.match(source, /Confidence labels distinguish calculated facts/);
});
