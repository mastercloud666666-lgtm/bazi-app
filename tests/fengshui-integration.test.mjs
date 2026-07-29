import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('public Feng Shui delivery surface is English-only', () => {
  const page = read('public/tengyunzi-feng-shui.html');
  const client = read('public/js/tengyunzi-feng-shui.js');
  assert.doesNotMatch(page, /[\u3400-\u9fff]/);
  assert.doesNotMatch(client, /[\u3400-\u9fff]/);
  assert.match(page, /Print \/ Save PDF/);
});

test('the existing Feng Shui page contains both manual and rule-based services', () => {
  const page = read('public/tengyunzi-feng-shui.html');
  assert.match(page, /id="order"/);
  assert.match(page, /id="audit"/);
  assert.match(page, /data-feng-shui-order/);
  assert.match(page, /id="fengshui-audit-form"/);
  assert.match(read('public/sitemap.xml'), /tengyunzi-feng-shui\.html/);
  const redirects = read('vercel.json');
  assert.match(redirects, /fengshui/);
  assert.match(redirects, /jiaju-fengshui/);
  assert.match(redirects, /tengyunzi-feng-shui\.html/);
});

test('Feng Shui endpoint keeps vision extraction separate from rule judgment', () => {
  const endpoint = read('supabase/functions/fengshui-audit/index.ts');
  assert.match(endpoint, /Do not perform Feng Shui interpretation/);
  assert.match(endpoint, /buildFengShuiAudit\(layoutFacts\)/);
  assert.match(endpoint, /resolveModelRole\('fengshuiVision'/);
  assert.match(endpoint, /toEnglishDeliveryAudit/);
});

test('legacy analyze service cannot produce the retired free-form Feng Shui report', () => {
  const legacy = read('supabase/functions/analyze/index.ts');
  assert.match(legacy, /fengshui_endpoint_moved/);
  assert.doesNotMatch(legacy, /deepseek-vl2/);
});

test('client submits confirmed orientation and household context to the dedicated endpoint', () => {
  const client = read('public/js/tengyunzi-feng-shui.js');
  assert.match(client, /functions\/v1\/fengshui-audit/);
  assert.match(client, /northEdge/);
  assert.match(client, /wholeHouseFacing/);
  assert.match(client, /marriedMen/);
  assert.match(client, /assignmentNotes/);
});
