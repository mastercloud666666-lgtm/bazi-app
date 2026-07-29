import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MODEL_ROLES,
  resolveModelRole,
  standardPaidReportRoles,
} from '../supabase/functions/_shared/model-roles.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('standard paid report separates analysis, writing, and routine QA', () => {
  assert.deepEqual(standardPaidReportRoles(), ['baziAnalysis', 'englishWriter', 'routineQA']);
  assert.equal(MODEL_ROLES.baziAnalysis.preferred, 'gpt-5.1');
  assert.equal(MODEL_ROLES.englishWriter.preferred, 'claude-sonnet-4-5-20250929');
  assert.equal(MODEL_ROLES.routineQA.preferred, 'deepseek-v4-flash');
  assert.equal(MODEL_ROLES.advancedQA.optional, true);
  assert.equal(MODEL_ROLES.classicsInterpreter.optional, true);
  assert.equal(MODEL_ROLES.fengshuiVision.preferred, 'gpt-5.1');
});

test('model roles can be overridden without changing source', () => {
  const resolved = resolveModelRole('baziAnalysis', (name) => name === 'RUNAPI_BAZI_ANALYSIS_MODEL' ? 'gpt-5.4' : '');
  assert.equal(resolved.model, 'gpt-5.4');
  assert.equal(resolved.reasoningEffort, 'high');
});

test('paid report orchestrator uses analysis, writing, routine QA, and conditional advanced QA roles', () => {
  const source = fs.readFileSync(path.join(root, 'supabase', 'functions', 'analyze', 'index.ts'), 'utf8');
  assert.match(source, /requestRunApiRoleCompletion\(\s*'baziAnalysis'/);
  assert.match(source, /requestRunApiRoleCompletion\('englishWriter'/);
  assert.match(source, /requestRunApiRoleCompletion\(\s*'routineQA'/);
  assert.match(source, /requires_advanced_review === true/);
  assert.match(source, /requestRunApiRoleCompletion\(\s*'advancedQA'/);
  assert.match(source, /Do not recalculate or alter any supplied pillar/);
});
