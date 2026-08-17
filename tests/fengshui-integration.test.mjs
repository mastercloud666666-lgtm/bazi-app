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
  assert.match(page, /US\$49\.90/);
  assert.match(page, /Pay &amp; Analyse · \$49\.90/);
  assert.match(page, /tengyunzi-feng-shui-whats-inside\.html#ai-report/);
  assert.match(page, /tengyunzi-feng-shui-whats-inside\.html#personal-review/);
  assert.match(read('public/sitemap.xml'), /tengyunzi-feng-shui\.html/);
  const redirects = read('vercel.json');
  assert.match(redirects, /fengshui/);
  assert.match(redirects, /jiaju-fengshui/);
  assert.match(redirects, /tengyunzi-feng-shui\.html/);
});

test('Feng Shui has an English-only report contents page for both service levels', () => {
  const page = read('public/tengyunzi-feng-shui-whats-inside.html');
  assert.doesNotMatch(page, /[\u3400-\u9fff]/);
  assert.match(page, /What's inside your floor-plan report/);
  assert.match(page, /Ten connected parts/);
  assert.match(page, /Whole-House Sitting and Facing/);
  assert.match(page, /Tai Ji Center and Eight-Sector Overlay/);
  assert.match(page, /Doors, Windows, and Energy Points/);
  assert.match(page, /Destiny, Geography, and Residence Hexagram/);
  assert.match(page, /US\$49\.90/);
  assert.match(page, /US\$149/);
  assert.match(page, /English online report with print-ready PDF view/);
  assert.match(page, /Personal English PDF by email within 72 hours/);
  assert.match(read('public/sitemap.xml'), /tengyunzi-feng-shui-whats-inside\.html/);
});

test('Feng Shui endpoint keeps vision extraction separate from rule judgment', () => {
  const endpoint = read('supabase/functions/fengshui-audit/index.ts');
  assert.match(endpoint, /Do not perform Feng Shui interpretation/);
  assert.match(endpoint, /buildFengShuiAudit\(layoutFacts\)/);
  assert.match(endpoint, /resolveModelRole\('fengshuiVision'/);
  assert.match(endpoint, /toEnglishDeliveryAudit/);
  assert.match(endpoint, /payment_required/);
  assert.match(endpoint, /action === 'create'/);
  assert.match(endpoint, /action === 'status'/);
  assert.match(endpoint, /action === 'analyze'/);
  assert.doesNotMatch(endpoint, /body\?\.layout_facts/);
  assert.match(endpoint, /long-term bedroom or principal-workroom assignments/);
  assert.match(endpoint, /bedHeadSupport/);
  assert.match(endpoint, /bedAxisDegrees/);
});

test('the ordinary residential report includes role-position logic outside Qi Men', () => {
  const rules = read('supabase/functions/_shared/fengshui-rules.mjs');
  const client = read('public/js/tengyunzi-feng-shui.js');
  assert.match(rules, /DESTINY_TIMING_GEOGRAPHY_FRAMEWORK/);
  assert.match(rules, /role_position_mismatch/);
  assert.match(rules, /Residential position changes/);
  assert.match(rules, /PERSONAL_BED_PLACEMENT_METHOD/);
  assert.match(rules, /SPACE_FUNCTION_PROFILE/);
  assert.match(rules, /knife, fire, and cutting symbolism/);
  assert.match(client, /Residence can strengthen or weaken an existing tendency/);
  assert.match(client, /Choose the room before choosing the bed-foot direction/);
  assert.doesNotMatch(rules, /qimen|Qi Men/i);
});

test('legacy analyze service cannot produce the retired free-form Feng Shui report', () => {
  const legacy = read('supabase/functions/analyze/index.ts');
  assert.match(legacy, /fengshui_endpoint_moved/);
  assert.doesNotMatch(legacy, /deepseek-vl2/);
});

test('client submits confirmed orientation and household context to the dedicated endpoint', () => {
  const client = read('public/js/tengyunzi-feng-shui.js');
  assert.match(client, /functions\/v1\/fengshui-audit/);
  assert.match(client, /functions\/v1\/paypal/);
  assert.match(client, /OPTION_ID = 'feng_shui_ai'/);
  assert.match(client, /PRICE = '\$49\.90'/);
  assert.match(client, /northEdge/);
  assert.match(client, /wholeHouseFacing/);
  assert.match(client, /marriedMen/);
  assert.match(client, /assignmentNotes/);
});

test('PayPal uses the server-authoritative Feng Shui AI price and returns to the Feng Shui page', () => {
  const paypal = read('supabase/functions/paypal/index.ts');
  assert.match(paypal, /feng_shui_ai: '49\.90'/);
  assert.match(paypal, /normalizedService === 'fengshui_ai'/);
  assert.match(paypal, /service === 'fengshui_ai' \? 'tengyunzi-feng-shui\.html'/);
  assert.match(paypal, /orderService === 'fengshui_ai'/);
});
