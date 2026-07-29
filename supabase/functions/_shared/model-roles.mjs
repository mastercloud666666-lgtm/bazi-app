export const MODEL_ROLES = Object.freeze({
  baziAnalysis: Object.freeze({
    env: 'RUNAPI_BAZI_ANALYSIS_MODEL',
    preferred: 'gpt-5.1',
    fallback: 'gpt-5',
    reasoningEffort: 'high',
  }),
  classicsInterpreter: Object.freeze({
    env: 'RUNAPI_CLASSICS_MODEL',
    preferred: 'qwen3-235b-a22b',
    fallback: 'qwen3-32b',
    optional: true,
  }),
  englishWriter: Object.freeze({
    env: 'RUNAPI_ENGLISH_WRITER_MODEL',
    preferred: 'claude-sonnet-4-5-20250929',
  }),
  routineQA: Object.freeze({
    env: 'RUNAPI_ROUTINE_QA_MODEL',
    preferred: 'deepseek-v4-flash',
    thinking: false,
  }),
  advancedQA: Object.freeze({
    env: 'RUNAPI_ADVANCED_QA_MODEL',
    preferred: 'deepseek-v4-pro',
    thinking: true,
    optional: true,
  }),
  fengshuiVision: Object.freeze({
    env: 'RUNAPI_FENGSHUI_VISION_MODEL',
    preferred: 'gpt-5.1',
    fallback: 'gpt-5',
    reasoningEffort: 'high',
  }),
});

export function resolveModelRole(role, readEnv = () => '') {
  const config = MODEL_ROLES[role];
  if (!config) throw new Error(`unknown_model_role_${role}`);
  return {
    ...config,
    model: String(readEnv(config.env) || config.preferred).trim(),
  };
}

export function standardPaidReportRoles() {
  return ['baziAnalysis', 'englishWriter', 'routineQA'];
}
