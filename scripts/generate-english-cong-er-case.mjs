import fs from 'node:fs';
import path from 'node:path';
import { jsonrepair } from '../tmp/jsonrepair-runtime/node_modules/jsonrepair/lib/esm/index.js';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'output/text/tengyunzi-bazi-chinese-text-1988-08-21-v2-cong-er.txt');
const contentPath = path.join(root, 'tmp/pdfs/tengyunzi-cong-er-english-content.json');
const usagePath = path.join(root, 'output/pdf/tengyunzi-cong-er-english-usage.json');
fs.mkdirSync(path.dirname(contentPath), { recursive: true });
fs.mkdirSync(path.dirname(usagePath), { recursive: true });

for (const name of ['RUNAPI_BASE_URL', 'RUNAPI_API_KEY', 'RUNAPI_ENGLISH_WRITER_MODEL', 'RUNAPI_ROUTINE_QA_MODEL']) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

const baseUrl = process.env.RUNAPI_BASE_URL.replace(/\/+$/, '');
const apiKey = process.env.RUNAPI_API_KEY;
const calls = [];

const titleMap = new Map([
  [1, 'Chart Structure and General Verdict'],
  [2, 'Day Master, Pattern, and Favorable Elements'],
  [3, 'Five Elements, Ten Gods, and Energy Structure'],
  [4, 'Stem-Branch Relations, Repetition, and Void'],
  [5, 'Temperament, Capability, and Life Direction'],
  [6, 'Family and Kinship'],
  [7, 'Career and Best Modes of Development'],
  [8, 'Wealth Structure and Financial Path'],
  [9, 'Marriage and Intimate Relationships'],
  [10, 'Traditional Five-Element Body Correspondences'],
  [11, 'Ten-Year Luck Cycles'],
  [12, 'Annual Reading: 2026-2030'],
  [13, 'Final Synthesis'],
]);

const numeralMap = new Map([
  ['一', 1], ['二', 2], ['三', 3], ['四', 4], ['五', 5], ['六', 6], ['七', 7],
  ['八', 8], ['九', 9], ['十', 10], ['十一', 11], ['十二', 12], ['十三', 13],
]);

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

async function complete({ stage, model, system, prompt, maxTokens, thinking }) {
  const rawPath = path.join(root, `tmp/pdfs/runapi-${stage}-raw.json`);
  if (process.env.REUSE_SUCCESSFUL_STAGES === '1' && fs.existsSync(rawPath)) {
    const cached = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    const cachedContent = cached?.choices?.[0]?.message?.content || '';
    if (String(cachedContent).trim()) {
      calls.push({
        stage,
        model: cached.model || model,
        elapsed_ms: Number(cached?.usage?.latency_checkpoint?.total_duration_ms || 0),
        usage: cached.usage || {},
        cost: cached.cost ?? cached?.usage?.cost ?? cached?.usage?.total_cost ?? null,
        id: cached.id || null,
        reused_from_successful_call: true,
      });
      return extractJson(cachedContent);
    }
  }
  const body = {
    model,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  };
  if (typeof thinking === 'boolean') body.thinking = { type: thinking ? 'enabled' : 'disabled' };
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
  if (!String(content).trim()) throw new Error(`${stage} returned empty content`);
  calls.push({
    stage,
    model: data.model || model,
    elapsed_ms: Date.now() - startedAt,
    usage: data.usage || {},
    cost: data.cost ?? data?.usage?.cost ?? data?.usage?.total_cost ?? null,
    id: data.id || null,
  });
  return extractJson(content);
}

const source = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');
const headingRegex = /^(一|二|三|四|五|六|七|八|九|十|十一|十二|十三)、([^\n]+)$/gm;
const matches = [...source.matchAll(headingRegex)];
const sections = [];
for (let index = 0; index < matches.length; index += 1) {
  const match = matches[index];
  const number = numeralMap.get(match[1]);
  const start = match.index + match[0].length;
  const end = index + 1 < matches.length ? matches[index + 1].index : source.indexOf('\n终审结论', start);
  sections.push({
    number,
    source_title: match[2].trim(),
    title: titleMap.get(number),
    source: source.slice(start, end > start ? end : source.length).trim(),
  });
}
if (sections.length !== 13) throw new Error(`Expected 13 source chapters, found ${sections.length}`);

const classicalParagraph = [
  '*Di Tian Sui Chan Wei* (*Subtle Exposition of the Dripping Heavenly Essence*) preserves the following rule in its chapter on compliant configurations: ',
  '"Once outside the gate, only the child is seen; when the child forms the current, it establishes the household. In Follow-the-Child, do not judge by whether the self is strong or weak; what matters is that the child in turn produces its own child." ',
  'In BaZi terminology, the "child" is Output, and the child\'s own child is Wealth. The rule therefore requires Output to command the season and form a coherent current, with Wealth receiving what Output produces. ',
  '*Di Tian Sui* (*Dripping Heavenly Essence*) is traditionally attributed to the otherwise obscure Song-dynasty figure Jing Tu; its exact composition year is uncertain. The received early commentary is traditionally attributed to Liu Ji (1311-1375), a scholar, strategist, writer, and founding statesman of the Ming dynasty. *Di Tian Sui Chan Wei* is the expanded Qing-dynasty exposition prepared during the Daoguang reign (1821-1850) by Ren Tieqiao, a scholar and professional practitioner of Chinese fate calculation, commonly dated 1773-1840. ',
  'Applied here, 庚 Output commands the 申 month, two 庚 stems are exposed, three 申 branches consolidate Metal, 壬 and 癸 Wealth receive Metal, Fire Resource is absent, and the lone hidden 乙 Officer is too weak to redirect the structure. The Follow-the-Child pattern is therefore established.',
].join('');

const lockedFacts = {
  birth: 'August 21, 1988, 16:00 (申 hour)',
  sex: 'Male',
  four_pillars: '戊辰 year, 庚申 month, 戊申 day, 庚申 hour',
  day_master: '戊 Yang Earth',
  pattern: 'Follow-the-Child pattern (Cong Er)',
  favorable: 'Metal first; Water second',
  unfavorable: 'Fire/Resource first; Wood/Officer and Seven Killings second',
  earth: 'conditional: moist Earth may store Water and produce Metal; dry Earth may bury Metal and obstruct Water',
  element_energy: { Metal: 58.3, Earth: 23.4, Water: 14.7, Wood: 3.5, Fire: 0 },
  annual: {
    '2026 丙午': 'Unfavorable',
    '2027 丁未': 'Moderately Unfavorable',
    '2028 戊申': 'Favorable',
    '2029 己酉': 'Favorable',
    '2030 庚戌': 'Neutral',
  },
};

const chunks = [[1, 4], [5, 9], [10, 13]];
const translated = [];
for (const [first, last] of chunks) {
  const selected = sections.filter((section) => section.number >= first && section.number <= last)
    .map((section) => {
      let chapterSource = section.source;
      if (section.number === 2) {
        chapterSource = chapterSource.replace(/【古籍依据与成格复核】[\s\S]*?(?=\n喜忌分明：)/, '');
      }
      chapterSource = chapterSource
        .replace(/不再重复古籍原文。?/g, '')
        .replace(/不再复述古籍。?/g, '')
        .replace(/格局复核结论仍与第二章一致：/g, '格局复核结论：');
      return { number: section.number, required_title: section.title, chinese_source: chapterSource };
    });
  const payload = await complete({
    stage: `cong_er_english_${first}_${last}`,
    model: process.env.RUNAPI_ENGLISH_WRITER_MODEL,
    maxTokens: 15000,
    system: [
      'You are the senior English editor for a premium traditional BaZi destiny book.',
      'Translate faithfully and decisively. Do not recalculate the chart and do not soften categorical favorable/unfavorable judgments.',
      'Return valid JSON only.',
    ].join(' '),
    prompt: `Translate chapters ${first}-${last} into polished commercial English.

LOCKED FACTS:
${JSON.stringify(lockedFacts)}

SOURCE CHAPTERS:
${JSON.stringify(selected)}

Return exactly:
{
  "chapters": [
    {
      "number": 1,
      "title": "the exact required_title",
      "finding": "one direct, evidence-based chapter verdict",
      "paragraphs": ["complete translated paragraph", "..."]
    }
  ]
}

Rules:
1. Preserve every material chart judgment, structural reason, career/wealth/relationship conclusion, Luck-Pillar judgment, and annual rating. Do not turn this into an abstract summary.
2. This is traditional Chinese astrology, not psychology and not science. Use precise BaZi terms such as Day Master, Eating God, Hurting Officer, Output, Wealth, Resource, Direct Officer, and Seven Killings.
3. Translate 从儿格 consistently as "Follow-the-Child pattern (Cong Er)" on first use and "Follow-the-Child pattern" thereafter.
4. State favorable and unfavorable elements explicitly: Metal and Water are favorable; Fire/Resource is the first unfavorable influence; Wood/Officer and Seven Killings is the second. Earth is conditional by moisture and function.
5. Never replace those judgments with vague phrases such as support, pressure, available, potentially useful, resilience, alignment, or balance.
6. Do not add reflective questions, coaching exercises, lifestyle routines, generic self-help, or invented events.
7. Preserve the traditional body-correspondence disclaimer. Do not diagnose illness. Clearly separate pattern favorability from bodily balance.
8. The final customer copy must be English only. Chinese characters are permitted only inside genuine Stem-Branch tokens from the sexagenary cycle, including the Four Pillars and Luck/annual Ganzhi. Do not print Chinese book titles or a Chinese classical quotation.
9. Remove editorial meta-language about "not repeating the quotation" or "as already stated." Do not repeat any classical source, quotation, attribution, or book provenance; chapter 2 receives that material separately.
10. Do not omit numerical percentages, dates, ages, ratings, interactions, or evidence from the source.
11. Use ASCII hyphens in dates and numeric ranges.
12. Each chapter must appear once, in numeric order, with the exact required English title.`,
  });
  translated.push(...(Array.isArray(payload.chapters) ? payload.chapters : []));
}

translated.sort((a, b) => Number(a.number) - Number(b.number));
if (translated.length !== 13 || translated.some((chapter, index) => Number(chapter.number) !== index + 1)) {
  throw new Error(`English writer returned invalid chapter set: ${translated.map((chapter) => chapter.number).join(',')}`);
}
translated[1].paragraphs.splice(2, 0, classicalParagraph);

const replaceForbiddenChinese = (value) => {
  if (typeof value === 'string') {
    return value
      .replaceAll('文昌贵人', 'Wenchang Nobleman')
      .replaceAll('文昌', 'Wenchang')
      .replaceAll('比肩', 'Companion')
      .replaceAll('伏吟', 'pillar repetition')
      .replaceAll('合化', 'completed transformation')
      .replaceAll('空亡', 'Void')
      .replaceAll('日柱', 'Day Pillar')
      .replaceAll('三合', 'three-combination')
      .replaceAll('三会', 'Three-Meeting')
      .replaceAll('六合', 'six-combination')
      .replaceAll('华盖', 'Huagai')
      .replaceAll('華蓋', 'Huagai')
      .replaceAll('月令', 'month command')
      .replaceAll('月', 'month')
      .replaceAll('時', 'hour')
      .replaceAll('害', 'harm')
      .replaceAll('三', 'three')
      .replaceAll('合', 'combination')
      .replaceAll('令', 'command')
      .replaceAll('multiple Wenchang (Wenchang) academic/noble influences', 'multiple Wenchang Scholar indications')
      .replaceAll('Output further receiving Output', 'Output produces Wealth')
      .replaceAll('printed positions', 'official positions')
      .replaceAll('andpillar', 'and pillar')
      .replaceAll('bypillar', 'by pillar')
      .replaceAll('bycompleted', 'by completed')
      .replaceAll('monthcommand', 'month command')
      .replaceAll('hour庚', 'hour 庚')
      .replaceAll('three申', 'three 申')
      .replaceAll('triple庚申 structure', 'two exposed 庚 stems and three 申 branches')
      .replaceAll('子未harm', '子未 harm')
      .replaceAll('six-combination (six-combination)', 'six-combination')
      .replace(/[–—]/g, '-');
  }
  if (Array.isArray(value)) return value.map(replaceForbiddenChinese);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceForbiddenChinese(item)]));
  }
  return value;
};

for (let index = 0; index < translated.length; index += 1) {
  translated[index] = replaceForbiddenChinese(translated[index]);
}

const content = {
  generated_at: new Date().toISOString(),
  title: 'Your BaZi Destiny Book',
  subtitle: 'A Classical Four Pillars Reading',
  edition: 'Personal English Edition',
  person: {
    birth: 'August 21, 1988 · 16:00',
    sex: 'Male',
    chart: '戊辰 · 庚申 · 戊申 · 庚申',
    day_master: '戊 Yang Earth',
  },
  executive_verdict: {
    pattern: 'Follow-the-Child pattern (Cong Er)',
    thesis: 'Output commands the season and produces Wealth. The chart succeeds by following Metal into Water, not by restoring the Day Master through Resource.',
    favorable: 'Metal first; Water second',
    unfavorable: 'Fire/Resource first; Wood/Officer and Seven Killings second',
    earth: 'Conditional: moist Earth may assist Metal and Water; dry Earth may obstruct both.',
  },
  element_energy: lockedFacts.element_energy,
  annual: lockedFacts.annual,
  chapters: translated,
  final_verdict: [
    'Pattern: Follow-the-Child. Eating God commands the month, two 庚 stems are exposed, three 申 branches form the dominant current, and no Fire Resource breaks the configuration.',
    'Favorable: Metal and Water. Unfavorable: Fire/Resource first, then Wood/Officer and Seven Killings.',
    'Earth is conditional and must be judged by moisture and function: moist Earth may produce Metal and store Water, while dry Earth may bury Metal and obstruct Water.',
  ],
  disclaimer: 'This book presents a traditional BaZi interpretation. It is not a scientific prediction, medical diagnosis, legal opinion, or financial guarantee.',
};

const qaPayload = await complete({
  stage: 'cong_er_english_qa',
  model: process.env.RUNAPI_ROUTINE_QA_MODEL,
  thinking: false,
  maxTokens: 5000,
  system: 'You are a strict report QA checker. Return JSON only. Do not rewrite the report.',
  prompt: `Check this English BaZi report against the locked facts.

LOCKED FACTS:
${JSON.stringify(lockedFacts)}

REPORT:
${JSON.stringify(content)}

Check: pattern consistency, explicit favorable/unfavorable elements, all percentages, all 2026-2030 ratings, Four Pillars, Luck-Pillar ranges, duplicated classical quotation/provenance, forbidden Chinese outside genuine Ganzhi tokens, omissions, contradictions, vague coaching language, grammar, and medical overclaiming.
Return {"pass":true,"issues":[{"severity":"P0|P1|P2","chapter":1,"detail":"..."}]}. Set pass=false for any P0 or P1 issue.`,
});
content.qa = qaPayload;

const allowedChinese = new Set('甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥');
const chineseCharacters = JSON.stringify(content).match(/[\u3400-\u9fff]/g) || [];
const forbiddenChinese = [...new Set(chineseCharacters.filter((character) => !allowedChinese.has(character)))];
const allText = JSON.stringify(content);
const localChecks = {
  chapter_count: content.chapters.length === 13,
  forbidden_chinese: forbiddenChinese,
  classical_verse_count: (allText.match(/Once outside the gate, only the child is seen/g) || []).length,
  provenance_count: (allText.match(/traditionally attributed to the otherwise obscure Song-dynasty figure Jing Tu/g) || []).length,
  required_percentages_present: ['58.3', '23.4', '14.7', '3.5'].every((value) => allText.includes(value)),
  required_pattern_present: allText.includes('Follow-the-Child'),
};
if (!localChecks.chapter_count || forbiddenChinese.length || localChecks.classical_verse_count !== 1 || localChecks.provenance_count !== 1 || !localChecks.required_percentages_present || !localChecks.required_pattern_present) {
  throw new Error(`Local English QA failed: ${JSON.stringify(localChecks)}`);
}
if (qaPayload.pass !== true && (qaPayload.issues || []).some((issue) => ['P0', 'P1'].includes(issue.severity))) {
  throw new Error(`Model QA found blocking issues: ${JSON.stringify(qaPayload.issues)}`);
}

fs.writeFileSync(contentPath, JSON.stringify(content, null, 2));
const totals = calls.reduce((sum, call) => {
  const usage = call.usage || {};
  sum.prompt_tokens += Number(usage.prompt_tokens || usage.input_tokens || 0);
  sum.completion_tokens += Number(usage.completion_tokens || usage.output_tokens || 0);
  sum.total_tokens += Number(usage.total_tokens || 0);
  if (typeof call.cost === 'number') sum.reported_cost += call.cost;
  else sum.all_costs_reported = false;
  return sum;
}, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, reported_cost: 0, all_costs_reported: true });
const pricing = {
  'gpt-5.1-2025-11-13': { ratio: 0.25, completion_ratio: 8 },
  'deepseek-v4-flash': { ratio: 0.057143, completion_ratio: 2 },
};
const calculatedCostUsd = calls.reduce((sum, call) => {
  const rate = pricing[call.model];
  if (!rate) return sum;
  const input = Number(call.usage?.prompt_tokens || call.usage?.input_tokens || 0);
  const output = Number(call.usage?.completion_tokens || call.usage?.output_tokens || 0);
  return sum + ((input * rate.ratio) + (output * rate.ratio * rate.completion_ratio)) / 500000;
}, 0);
totals.calculated_cost_usd = calculatedCostUsd;
fs.writeFileSync(usagePath, JSON.stringify({
  generated_at: content.generated_at,
  pricing_basis: 'RunAPI default-group ratios used by the project cost audit; provider did not return a billed cost',
  calls,
  totals,
  local_checks: localChecks,
  model_qa: qaPayload,
}, null, 2));
console.log(JSON.stringify({ contentPath, usagePath, totals, localChecks, modelQa: qaPayload }, null, 2));
