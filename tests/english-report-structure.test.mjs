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

test('standard English report has 13 unique sequential chapters', () => {
  assert.equal(ENGLISH_BAZI_REPORT_SECTION_COUNT, 13);
  assert.deepEqual(ENGLISH_BAZI_REPORT_SECTIONS.map((section) => section.number), Array.from({ length: 13 }, (_, index) => index + 1));
  assert.equal(new Set(ENGLISH_BAZI_REPORT_SECTIONS.map((section) => section.title)).size, 13);
  assert.equal(englishBaziBlueprint().split('\n').length, 13);
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

test('customer-facing report flow consistently presents a connected BaZi book', () => {
  const files = ['index.html', 'tengyunzi-report.html', 'tengyunzi-readings.html', 'tengyunzi-whats-inside.html', 'tengyunzi-about.html', 'tengyunzi-account.html'];
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, 'public', file), 'utf8');
    assert.match(html, /(?:Life Pattern|Destiny) Book/i, file);
  }
  const whatsInside = fs.readFileSync(path.join(root, 'public', 'tengyunzi-whats-inside.html'), 'utf8');
  assert.match(whatsInside, /13 connected chapters/i);
  assert.match(whatsInside, /same governing pattern|carry that verdict/i);
});

test('sales pages describe the verified PDF size and reading time consistently', () => {
  const files = ['tengyunzi-report.html', 'tengyunzi-readings.html', 'tengyunzi-whats-inside.html'];
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, 'public', file), 'utf8');
    assert.match(html, /30-page/i, file);
    assert.match(html, /7,000\+ words/i, file);
    assert.match(html, /35-45 min/i, file);
  }
});

test('report generator maps Ten Gods and Shen Sha to the new canonical chapters', () => {
  const source = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze', 'index.ts'), 'utf8');
  assert.match(source, /Section 3 must explicitly analyze the supplied Ten-God profile/);
  assert.match(source, /symbolic stars may appear only as secondary evidence in Sections 5-6/);
  assert.doesNotMatch(source, /Section 7 must cover the supplied symbolic stars/);
});

test('AI prompt generates one cohesive Life Pattern Book rather than isolated essays', () => {
  const source = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze', 'index.ts'), 'utf8');
  assert.match(source, /one governing natal thesis/i);
  assert.match(source, /one continuous book/i);
  assert.match(source, /thirteen isolated essays/i);
  assert.match(source, /Sections 1-4 establish it; Sections 5-10 apply it to life domains; Sections 11-13 show/i);
});

test('paid report generation uses the current DeepSeek Pro model with a configurable fast stream model', () => {
  const source = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze', 'index.ts'), 'utf8');
  assert.match(source, /DEEPSEEK_MODEL'\) \|\| 'deepseek-v4-pro'/);
  assert.match(source, /DEEPSEEK_STREAM_MODEL'\) \|\| 'deepseek-v4-flash'/);
  assert.doesNotMatch(source, /model:\s*'deepseek-chat'/);
});

test('Officer aggregation and Ten-God visibility use exact categories', () => {
  const backend = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze', 'index.ts'), 'utf8');
  assert.match(backend, /pct\('七杀'\) \+ pct\('正官'\)/);
  assert.match(backend, /visible && hidden \? 'visible and hidden'/);

  const pdf = fs.readFileSync(path.join(root, 'prototypes', 'report-pdf-v1', 'generate-template.mjs'), 'utf8');
  assert.match(pdf, /\['Direct Officer', 'Seven Killings'\]\.includes/);
  assert.doesNotMatch(pdf, /\/Officer\|Seven Killings\/\.test/);
});

test('PDF annual evidence uses explicit favorable-to-unfavorable ratings', () => {
  const pdf = fs.readFileSync(path.join(root, 'prototypes', 'report-pdf-v1', 'generate-template.mjs'), 'utf8');
  assert.doesNotMatch(pdf, /interactions\.slice\(0,\s*4\)/);
  for (const label of ['FAVORABLE', 'MODERATELY FAVORABLE', 'NEUTRAL', 'MODERATELY UNFAVORABLE', 'UNFAVORABLE']) {
    assert.match(pdf, new RegExp(label));
  }
  assert.doesNotMatch(pdf, /SUPPORTED ADVANCE|SELECTIVE ADVANCE|HOLD &amp; PROTECT/);
});

test('English report API uses the Destiny Book product identity', () => {
  const source = fs.readFileSync(path.join(root, 'supabase', 'functions', 'english-report', 'index.ts'), 'utf8');
  assert.match(source, /BaZi Destiny Book for/);
  assert.match(source, /product: 'BaZi Destiny Book'/);
  assert.match(source, /title: 'BaZi Destiny Book'/);
  assert.doesNotMatch(source, /product: 'Complete BaZi Reading'/);
});

test('customer-visible report output permits Chinese only for calculated Ganzhi', () => {
  const promptSource = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze', 'index.ts'), 'utf8');
  assert.match(promptSource, /only Chinese characters permitted are necessary Heavenly Stem and Earthly Branch characters in calculated Ganzhi/i);

  const pdfSource = fs.readFileSync(path.join(root, 'prototypes', 'report-pdf-v1', 'generate-template.mjs'), 'utf8');
  for (const forbiddenLabel of ['命书 /', '>命<', '命局总论', '命式提要', '主导十神', '当前大运', '取用方向', '五行气势', '目录 /', '体例 /']) {
    assert.doesNotMatch(pdfSource, new RegExp(forbiddenLabel));
  }
  assert.match(pdfSource, /ALLOWED_GANZHI_CHARACTERS/);
  assert.match(pdfSource, /customerEnglishOnly/);
});

test('customer-facing report sample describes a traditional Destiny Book rather than psychology', () => {
  const html = fs.readFileSync(path.join(root, 'public', 'tengyunzi-report-sample.html'), 'utf8');
  const visibleSample = html.split('<div class="sample-chapters" hidden')[0];
  assert.match(visibleSample, /Destiny Book follows traditional BaZi reading order/i);
  assert.match(visibleSample, /one governing verdict/i);
  assert.match(visibleSample, /explicit favorable-to-unfavorable rating/i);
  assert.doesNotMatch(visibleSample, /personality test|self-development|family imprint|inner child/i);
});

test('Chinese case generator locks Cong Er priority and blocks known low-level errors', () => {
  const source = fs.readFileSync(path.join(root, 'scripts', 'generate-chinese-text-case.mjs'), 'utf8');
  assert.match(source, /本命为从儿格，喜金水/);
  assert.match(source, /金克木/);
  assert.match(source, /卯只藏乙，对戊土为正官/);
  assert.match(source, /辰只藏戊乙癸/);
  assert.match(source, /申亥只按六害写/);
  assert.match(source, /古籍只允许逐字引用已提供的《滴天髓阐微·顺局》四句原文/);
  assert.match(source, /健康章节必须依据程序给出的五行权重/);

  const reportPath = path.join(root, 'output', 'text', 'tengyunzi-bazi-chinese-text-1988-08-21-v2-cong-er.txt');
  if (fs.existsSync(reportPath)) {
    const report = fs.readFileSync(reportPath, 'utf8');
    assert.match(report, /日主：戊土，从儿格，喜金水，忌火木/);
    assert.doesNotMatch(report, /甲木克庚金|木克金|卯木偏官|辰中所藏庚|申亥暗合|偏火印/);
    assert.equal((report.match(/一出门来只见儿/g) || []).length, 1);
    assert.equal((report.match(/《滴天髓阐微·顺局》/g) || []).length, 1);
    assert.match(report, /金58\.3%，土23\.4%，水14\.7%，木3\.5%，火0%/);
    assert.match(report, /金过多为首，木极少且受金克次之，火缺失再次/);
  }
});

test('English Cong Er source note explains provenance once at first classical mention', () => {
  const rules = fs.readFileSync(path.join(root, 'supabase', 'functions', '_shared', 'bazi-rules.mjs'), 'utf8');
  const backend = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze', 'index.ts'), 'utf8');
  assert.match(rules, /traditionally attributed to the otherwise obscure Song-dynasty figure Jing Tu/);
  assert.match(rules, /Liu Ji \(1311–1375\).*founding statesman of the Ming dynasty/);
  assert.match(rules, /Daoguang reign \(1821–1850\).*Ren Tieqiao/);
  assert.match(rules, /original composition date and Jing Tu biography are not securely documented/);
  assert.match(backend, /Reserve the first mention of a classical book for Section 2/);
  assert.match(backend, /do not repeat either later/);
});

test('English health section connects weighted excess and deficiency to traditional correspondences', () => {
  const backend = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze', 'index.ts'), 'utf8');
  assert.match(backend, /This report's stated Ten-God weighting method gives the following relative Five-Element shares/);
  assert.match(backend, /Traditional BaZi treats both excess and deficiency as imbalance markers/);
  assert.match(backend, /controls \$\{controlTarget\[highest\.element\]\}/);
  assert.match(backend, /Chart favorability and bodily balance are separate judgments/);
  assert.match(backend, /it does not diagnose symptoms, disease, constitution, or a future health event/);
});
