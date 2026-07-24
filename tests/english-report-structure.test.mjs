import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ENGLISH_BAZI_REPORT_SECTION_COUNT,
  ENGLISH_BAZI_REPORT_SECTIONS,
  englishBaziBlueprint,
} from '../supabase/functions/_shared/english-report-structure.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('standard English report has 15 unique sequential chapters', () => {
  assert.equal(ENGLISH_BAZI_REPORT_SECTION_COUNT, 15);
  assert.deepEqual(ENGLISH_BAZI_REPORT_SECTIONS.map((section) => section.number), Array.from({ length: 15 }, (_, index) => index + 1));
  assert.equal(new Set(ENGLISH_BAZI_REPORT_SECTIONS.map((section) => section.title)).size, 15);
  assert.equal(englishBaziBlueprint().split('\n').length, 15);
});

test("What's Inside page matches every canonical report chapter", () => {
  const html = fs.readFileSync(path.join(root, 'public', 'tengyunzi-whats-inside.html'), 'utf8');
  for (const section of ENGLISH_BAZI_REPORT_SECTIONS) {
    assert.match(html, new RegExp(`<h2>${section.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h2>`));
  }
  assert.doesNotMatch(html, /24-part|Family Imprint|Growth Lessons|Self-Development/i);
});

test('primary sales pages no longer promise the retired 24-part product', () => {
  const files = ['index.html', 'tengyunzi-report.html', 'tengyunzi-readings.html', 'tengyunzi-whats-inside.html', 'tengyunzi-about.html', 'tengyunzi-account.html', 'delivery-policy.html'];
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, 'public', file), 'utf8');
    assert.doesNotMatch(html, /24-part|24 interpreted|all 24/i, file);
  }
});

test('primary report flow describes standard BaZi rather than a psychology product', () => {
  const files = ['index.html', 'tengyunzi-report.html', 'tengyunzi-about.html', 'tengyunzi-account.html'];
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, 'public', file), 'utf8');
    assert.doesNotMatch(html, /BaZi for self-knowledge|personality test|inner child|family imprint/i, file);
  }
});

test('sales pages describe the verified PDF size and reading time consistently', () => {
  const files = ['tengyunzi-report.html', 'tengyunzi-readings.html', 'tengyunzi-whats-inside.html'];
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, 'public', file), 'utf8');
    assert.match(html, /24-page PDF/i, file);
    assert.match(html, /6,000\+ words/i, file);
    assert.match(html, /30-35 min/i, file);
    assert.doesNotMatch(html, /6,000-7,000|30-40 min/i, file);
  }
});

test('report generator maps Ten Gods and Shen Sha to the canonical chapters', () => {
  const source = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze', 'index.ts'), 'utf8');
  assert.match(source, /Section 4 must explicitly analyze the supplied Ten-God profile/);
  assert.match(source, /Section 7 must cover the supplied symbolic stars/);
  assert.doesNotMatch(source, /Section 3 must explicitly analyze the supplied Ten-God profile/);
  assert.doesNotMatch(source, /Section 15 must cover the supplied symbolic stars/);
});

test('customer-facing report sample describes standard BaZi rather than psychology', () => {
  const html = fs.readFileSync(path.join(root, 'public', 'tengyunzi-report-sample.html'), 'utf8');
  const visibleSample = html.split('<div class="sample-chapters" hidden')[0];
  assert.match(visibleSample, /standard BaZi reading order/i);
  assert.match(visibleSample, /Direction is used only to sequence the Luck Pillars/i);
  assert.doesNotMatch(visibleSample, /personality test|self-development|family imprint|inner child/i);
});
