import fs from 'node:fs';
import path from 'node:path';
import {
  HIDDEN_STEMS,
  STEM_ELEMENT,
  analyzeAnnualInteractions,
  analyzeNatalInteractions,
  assessDayMasterStrength,
  balancingElementGuidance,
  charElement,
  elementProfile,
  shenShaForChart,
  tenGod,
  tenGodEnglish,
  timingAssessment,
  tombStorageContacts,
  traditionalReferenceProfile,
  weightedTenGodProfile,
} from '../supabase/functions/_shared/bazi-rules.mjs';
import { ENGLISH_BAZI_REPORT_SECTIONS } from '../supabase/functions/_shared/english-report-structure.mjs';
import { jsonrepair } from '../tmp/jsonrepair-runtime/node_modules/jsonrepair/lib/esm/index.js';

const root = path.resolve(import.meta.dirname, '..');
const snapshotPath = path.join(root, 'output/pdf/report-snapshot-new.json');
const contentPath = path.join(root, 'tmp/pdfs/bazi-bilingual-case-content.json');
const usagePath = path.join(root, 'output/pdf/tengyunzi-bazi-bilingual-case-usage.json');
fs.mkdirSync(path.dirname(contentPath), { recursive: true });

const required = ['RUNAPI_BASE_URL', 'RUNAPI_API_KEY', 'RUNAPI_BAZI_ANALYSIS_MODEL', 'RUNAPI_ENGLISH_WRITER_MODEL', 'RUNAPI_ROUTINE_QA_MODEL', 'RUNAPI_ADVANCED_QA_MODEL'];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required`);
const baseUrl = process.env.RUNAPI_BASE_URL.replace(/\/+$/, '');
const apiKey = process.env.RUNAPI_API_KEY;
const calls = [];

function extractJson(text) {
  const normalized = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(normalized);
  } catch {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('Model did not return a JSON object');
    return JSON.parse(jsonrepair(normalized.slice(start, end + 1)));
  }
}

async function complete({ stage, model, system, prompt, maxTokens, reasoningEffort, thinking, json = true }) {
  const rawPath = path.join(root, `tmp/pdfs/runapi-${stage}-raw.json`);
  const reusableStage = stage.startsWith('english_bilingual_writing_') || stage.startsWith('english_bilingual_repair_');
  if (process.env.REUSE_SUCCESSFUL_STAGES === '1' && reusableStage && fs.existsSync(rawPath)) {
    const cached = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    const cachedContent = cached?.choices?.[0]?.message?.content || '';
    if (String(cachedContent).trim()) {
      calls.push({
        stage,
        model: cached.model || model,
        elapsed_ms: Number(cached?.usage?.latency_checkpoint?.total_duration_ms || 0),
        usage: cached.usage || {},
        cost: cached.cost ?? cached?.usage?.cost ?? null,
        id: cached.id || null,
        reused_from_successful_call: true,
      });
      return { json: json ? extractJson(cachedContent) : null, text: cachedContent };
    }
  }
  const body = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  };
  if (reasoningEffort) body.reasoning_effort = reasoningEffort;
  if (typeof thinking === 'boolean') body.thinking = { type: thinking ? 'enabled' : 'disabled' };
  if (json) body.response_format = { type: 'json_object' };
  const startedAt = Date.now();
  let response;
  let data;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    data = await response.json().catch(() => ({}));
    if (response.ok) break;
    if (![500, 502, 503, 504, 524].includes(response.status) || attempt === 3) {
      throw new Error(`${stage} failed (${response.status}): ${JSON.stringify(data).slice(0, 800)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
  fs.writeFileSync(rawPath, JSON.stringify(data, null, 2));
  const content = data?.choices?.[0]?.message?.content || '';
  const usage = data.usage || {};
  calls.push({
    stage,
    model,
    elapsed_ms: Date.now() - startedAt,
    usage,
    cost: data.cost ?? usage.cost ?? usage.total_cost ?? null,
    id: data.id || null,
  });
  if (json && !String(content).trim()) {
    throw new Error(`${stage} returned empty content; usage=${JSON.stringify(usage)}; message_keys=${Object.keys(data?.choices?.[0]?.message || {}).join(',')}`);
  }
  return { json: json ? extractJson(content) : null, text: content };
}

const loaded = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const report = Array.isArray(loaded) ? loaded[0] : loaded;
const input = report.birth_input;
const pillars = report.chart_data.pillars;
const dayStem = pillars.day.stem;
const dayElement = charElement(dayStem);
const strength = assessDayMasterStrength(pillars, { hourKnown: input.hour_known !== false });
const guidance = balancingElementGuidance(dayElement, strength);
const luck = String(input.dayun_text || '').split('|').map((item) => {
  const match = item.trim().match(/^(\S+) from age (\d+) \((\d+)\)$/);
  return match ? { gz: match[1], age: Number(match[2]), year: Number(match[3]) } : null;
}).filter(Boolean);
const ganzhiForYear = (year) => {
  const stems = '甲乙丙丁戊己庚辛壬癸';
  const branches = '子丑寅卯辰巳午未申酉戌亥';
  return `${stems[((year - 4) % 10 + 10) % 10]}${branches[((year - 4) % 12 + 12) % 12]}`;
};
const annual = Array.from({ length: 5 }, (_, offset) => 2026 + offset).map((year) => {
  const gz = ganzhiForYear(year);
  const activeLuck = luck.find((item) => item.year <= year && item.year + 9 >= year);
  const interactions = analyzeAnnualInteractions({ annualGz: gz, natalPillars: pillars, luckGz: activeLuck?.gz || '', hourKnown: true });
  const assessment = timingAssessment(interactions, { ...guidance, annualElement: charElement(gz[0]) });
  const tombStorage = tombStorageContacts({ incomingBranch: gz[1], natalPillars: pillars, hourKnown: true });
  return { year, gz, active_luck: activeLuck || null, interactions, tomb_storage_contacts: tombStorage, assessment, transition_date_status: luck.some((item) => item.year === year) ? 'year supplied; exact date not supplied' : 'not a supplied boundary year' };
});
const chartFacts = {
  schema: 'tengyunzi.chart_facts.v1',
  immutable: true,
  birth_input: input,
  pillars,
  day_master: { stem: dayStem, element: dayElement, polarity: 'yang' },
  hidden_stems: Object.fromEntries(Object.entries(pillars).map(([name, pillar]) => [name, HIDDEN_STEMS[pillar.branch] || []])),
  visible_elements: elementProfile(pillars),
  weighted_ten_gods: weightedTenGodProfile(pillars),
  strength,
  balancing_guidance: guidance,
  natal_interactions: analyzeNatalInteractions(pillars),
  shen_sha: shenShaForChart(pillars),
  traditional_references: traditionalReferenceProfile(pillars, { gender: input.gender, hourKnown: input.hour_known !== false }),
  luck_pillars: luck,
  annual_2026_2030: annual,
  fixed_rules: {
    officer_functions: ['Direct Officer', 'Seven Killings'],
    annual_labels_are_locked: true,
    exact_luck_transition_date_is_not_supplied: true,
    chinese_allowed_in_final: 'temporary bilingual review edition',
  },
};

const cachedAnalystPath = path.join(root, 'tmp/pdfs/runapi-bazi_analysis-raw.json');
const cachedAnalyst = process.env.REUSE_BAZI_ANALYSIS === '1' && fs.existsSync(cachedAnalystPath)
  ? JSON.parse(fs.readFileSync(cachedAnalystPath, 'utf8'))
  : null;
const analyst = cachedAnalyst
  ? (() => {
    const content = cachedAnalyst?.choices?.[0]?.message?.content || '';
    calls.push({
      stage: 'bazi_analysis',
      model: cachedAnalyst.model || process.env.RUNAPI_BAZI_ANALYSIS_MODEL,
      elapsed_ms: Number(cachedAnalyst?.usage?.latency_checkpoint?.total_duration_ms || 0),
      usage: cachedAnalyst.usage || {},
      cost: cachedAnalyst.cost ?? cachedAnalyst?.usage?.cost ?? null,
      id: cachedAnalyst.id || null,
      reused_from_successful_call: true,
    });
    return { json: extractJson(content), text: content };
  })()
  : await complete({
    stage: 'bazi_analysis',
    model: process.env.RUNAPI_BAZI_ANALYSIS_MODEL,
    reasoningEffort: 'high',
    maxTokens: 30000,
    system: 'You are the structural BaZi analyst. Use only the immutable chart facts. Return valid JSON. Never recalculate or modify supplied facts.',
    prompt: `Produce a coherent evidence chain for a commercial BaZi Life Pattern Book.

CHART FACTS:
${JSON.stringify(chartFacts)}

Return JSON with:
{
  "natal_thesis": "...",
  "strength_and_balance": {"judgment":"...","evidence":[],"limits":[]},
  "career": {"findings":[],"possible_expressions":[],"questions":[],"practical_step":"..."},
  "wealth": {"findings":[],"possible_expressions":[],"questions":[],"practical_step":"..."},
  "relationships": {"findings":[],"possible_expressions":[],"questions":[],"practical_step":"..."},
  "health_correspondence": {"findings":[],"limits":[]},
  "luck_pillars": [{"gz":"...","analysis":"..."}],
  "annual": [{"year":2026,"locked_posture":"...","reason":"...","practical_strategy":"..."}],
  "confidence_map": {}
}
The locked annual posture must be copied exactly from chart_facts. Do not invent an exact Luck-Pillar transition date.`,
  });

const writerChunks = [];
for (let start = 1; start <= 15; start += 5) {
  const end = start + 4;
  const requiredSections = ENGLISH_BAZI_REPORT_SECTIONS.filter((section) => section.number >= start && section.number <= end);
  const stage = `english_bilingual_writing_${start}_${end}`;
  const cachedWriterPath = path.join(root, `tmp/pdfs/runapi-${stage}-raw.json`);
  if (process.env.REUSE_WRITER_CHUNKS === '1' && fs.existsSync(cachedWriterPath)) {
    const cached = JSON.parse(fs.readFileSync(cachedWriterPath, 'utf8'));
    const content = cached?.choices?.[0]?.message?.content || '';
    calls.push({
      stage,
      model: cached.model || process.env.RUNAPI_ENGLISH_WRITER_MODEL,
      elapsed_ms: Number(cached?.usage?.latency_checkpoint?.total_duration_ms || 0),
      usage: cached.usage || {},
      cost: cached.cost ?? cached?.usage?.cost ?? null,
      id: cached.id || null,
      reused_from_successful_call: true,
    });
    writerChunks.push({ json: extractJson(content), text: content });
    continue;
  }
  writerChunks.push(await complete({
    stage,
    model: process.env.RUNAPI_ENGLISH_WRITER_MODEL,
    maxTokens: 7000,
    system: 'You are Tengyunzi editorial writer. Write natural premium English and faithful Simplified Chinese. Return valid JSON only. Do not calculate BaZi.',
    prompt: `Create chapters ${start}-${end} of a temporary bilingual review edition of a BaZi Life Pattern Book.

IMMUTABLE CHART FACTS:
${JSON.stringify(chartFacts)}

CONFIRMED STRUCTURAL ANALYSIS:
${JSON.stringify(analyst.json)}

Required chapters:
${JSON.stringify(requiredSections)}

Return:
{
  "book_title_en":"Your BaZi Life Pattern Book",
  "book_title_zh":"你的八字人生结构书",
  "subtitle_en":"...",
  "subtitle_zh":"...",
  "synopsis_en":"...",
  "synopsis_zh":"...",
  "sections":[
    {"number":1,"title_en":"exact required English title","title_zh":"...","finding_en":"...","finding_zh":"...","body_en":["paragraph", "..."],"body_zh":["paragraph","..."],"questions_en":[],"questions_zh":[],"practical_step_en":"...","practical_step_zh":"..."}
  ]
}
Write only chapters ${start}-${end} in order. Each English chapter should be about 110-160 words, with a faithful Chinese counterpart. Use the annual labels exactly. Do not add Chinese destiny fatalism, scientific claims, diagnoses, guaranteed events, invented classical quotations, or an exact Luck-Pillar transition date.`,
  }));
}
const writer = {
  json: {
    book_title_en: writerChunks[0].json.book_title_en || 'Your BaZi Life Pattern Book',
    book_title_zh: writerChunks[0].json.book_title_zh || '你的八字人生结构书',
    subtitle_en: writerChunks[0].json.subtitle_en || '',
    subtitle_zh: writerChunks[0].json.subtitle_zh || '',
    synopsis_en: writerChunks[0].json.synopsis_en || '',
    synopsis_zh: writerChunks[0].json.synopsis_zh || '',
    sections: writerChunks.flatMap((chunk) => Array.isArray(chunk.json.sections) ? chunk.json.sections : []).sort((a, b) => a.number - b.number),
  },
};
const presentSectionNumbers = new Set(writer.json.sections.map((section) => Number(section.number)));
const missingSections = ENGLISH_BAZI_REPORT_SECTIONS.filter((section) => !presentSectionNumbers.has(section.number));
for (const requiredSection of missingSections) {
  const stage = `english_bilingual_repair_${requiredSection.number}`;
  const compactFacts = {
    birth_input: chartFacts.birth_input,
    pillars: chartFacts.pillars,
    day_master: chartFacts.day_master,
    strength: chartFacts.strength,
    balancing_guidance: chartFacts.balancing_guidance,
    weighted_ten_gods: chartFacts.weighted_ten_gods,
    natal_interactions: chartFacts.natal_interactions,
    shen_sha: chartFacts.shen_sha,
    luck_pillars: chartFacts.luck_pillars,
    annual_2026_2030: chartFacts.annual_2026_2030,
    traditional_references: {
      void: chartFacts.traditional_references.void,
      exposureAndRooting: chartFacts.traditional_references.exposureAndRooting,
      fiveGhostWealth: chartFacts.traditional_references.fiveGhostWealth,
      yuanChen: chartFacts.traditional_references.yuanChen,
      safeguards: chartFacts.traditional_references.safeguards,
    },
  };
  const compactAnalysis = {
    natal_thesis: analyst.json.natal_thesis,
    strength_and_balance: analyst.json.strength_and_balance,
    career: requiredSection.number === 8 ? analyst.json.career : undefined,
    wealth: requiredSection.number === 9 ? analyst.json.wealth : undefined,
    relationships: requiredSection.number === 10 ? analyst.json.relationships : undefined,
    health_correspondence: requiredSection.number === 11 ? analyst.json.health_correspondence : undefined,
    luck_pillars: requiredSection.number >= 12 ? analyst.json.luck_pillars : undefined,
    annual: requiredSection.number >= 14 ? analyst.json.annual : undefined,
  };
  const repaired = await complete({
    stage,
    model: process.env.RUNAPI_ENGLISH_WRITER_MODEL,
    maxTokens: 2800,
    system: 'You are Tengyunzi editorial writer. Write natural premium English and faithful Simplified Chinese. Return valid JSON only. Do not calculate BaZi.',
    prompt: `Create only chapter ${requiredSection.number} of a temporary bilingual BaZi Life Pattern Book.

IMMUTABLE CHART FACTS:
${JSON.stringify(compactFacts)}

CONFIRMED STRUCTURAL ANALYSIS:
${JSON.stringify(compactAnalysis)}

REQUIRED CHAPTER:
${JSON.stringify(requiredSection)}

Return {"sections":[{"number":${requiredSection.number},"title_en":"${requiredSection.title}","title_zh":"...","finding_en":"...","finding_zh":"...","body_en":["..."],"body_zh":["..."],"questions_en":[],"questions_zh":[],"practical_step_en":"...","practical_step_zh":"..."}]}.
Write 110-160 English words plus a faithful Chinese counterpart. Copy all calculated facts and locked annual labels exactly. Do not invent an exact Luck-Pillar transition date.`,
  });
  writer.json.sections.push(...(Array.isArray(repaired.json.sections) ? repaired.json.sections : []));
}
writer.json.sections.sort((a, b) => a.number - b.number);
if (writer.json.sections.length !== 15 || writer.json.sections.some((section, index) => Number(section.number) !== index + 1)) {
  throw new Error(`bilingual_writer_missing_sections_after_repair: ${writer.json.sections.map((section) => section.number).join(',')}`);
}

const qa = await complete({
  stage: 'routine_qa',
  model: process.env.RUNAPI_ROUTINE_QA_MODEL,
  thinking: false,
  maxTokens: 3500,
  system: 'You are a deterministic bilingual report QA checker. Return valid JSON only. Do not rewrite conclusions.',
  prompt: `Compare the bilingual report content against immutable chart facts.

CHART FACTS:
${JSON.stringify(chartFacts)}

REPORT CONTENT:
${JSON.stringify(writer.json)}

Check numbers, Ten-God categories, visible versus hidden sources, every repeated annual relation, locked annual posture, missing sections, English-Chinese meaning mismatch, empty fields, duplicated template language, and grammar.
Return {"pass":true,"requires_advanced_review":false,"issues":[]}. Set pass=false when any P0 or P1 issue exists.`,
});

let advanced = null;
if (qa.json?.requires_advanced_review === true) {
  advanced = await complete({
    stage: 'advanced_qa',
    model: process.env.RUNAPI_ADVANCED_QA_MODEL,
    thinking: true,
    maxTokens: 3500,
    system: 'Review only complex cross-chapter BaZi evidence conflicts. Return repair instructions as JSON. Never alter immutable facts.',
    prompt: `CHART FACTS:\n${JSON.stringify(chartFacts)}\n\nANALYSIS:\n${JSON.stringify(analyst.json)}\n\nREPORT:\n${JSON.stringify(writer.json)}\n\nQA ISSUES:\n${JSON.stringify(qa.json)}`,
  });
}

const result = {
  generated_at: new Date().toISOString(),
  report_id: report.id,
  chart_facts: chartFacts,
  analysis: analyst.json,
  report_content: writer.json,
  qa: qa.json,
  advanced_qa: advanced?.json || null,
};
fs.writeFileSync(contentPath, JSON.stringify(result, null, 2));

const totals = calls.reduce((sum, call) => {
  sum.prompt_tokens += Number(call.usage.prompt_tokens || call.usage.input_tokens || 0);
  sum.completion_tokens += Number(call.usage.completion_tokens || call.usage.output_tokens || 0);
  sum.total_tokens += Number(call.usage.total_tokens || 0);
  if (typeof call.cost === 'number') sum.reported_cost += call.cost;
  else sum.all_costs_reported = false;
  return sum;
}, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, reported_cost: 0, all_costs_reported: true });
fs.writeFileSync(usagePath, JSON.stringify({ generated_at: result.generated_at, calls, totals }, null, 2));
console.log(JSON.stringify({ contentPath, usagePath, qa: qa.json, totals, calls: calls.map(({ stage, model, usage, cost, elapsed_ms }) => ({ stage, model, usage, cost, elapsed_ms })) }, null, 2));
