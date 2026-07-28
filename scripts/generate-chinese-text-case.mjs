import fs from 'node:fs';
import path from 'node:path';
import {
  HIDDEN_STEMS,
  analyzeAnnualInteractions,
  analyzeNatalInteractions,
  assessClassicalSpecialPattern,
  assessDayMasterStrength,
  charElement,
  elementProfile,
  shenShaForChart,
  tenGod,
  tombStorageContacts,
  traditionalReferenceProfile,
  weightedTenGodProfile,
} from '../supabase/functions/_shared/bazi-rules.mjs';
import { jsonrepair } from '../tmp/jsonrepair-runtime/node_modules/jsonrepair/lib/esm/index.js';

const root = path.resolve(import.meta.dirname, '..');
const snapshotPath = path.join(root, 'output/text/case-1988-08-21-input.json');
const outputDir = path.join(root, 'output/text');
const rawDir = path.join(root, 'tmp/chinese-text-case-1988-08-21-cong-er');
const reportPath = path.join(outputDir, 'tengyunzi-bazi-chinese-text-1988-08-21-v2-cong-er.txt');
const auditPath = path.join(outputDir, 'tengyunzi-bazi-chinese-text-1988-08-21-v2-cong-er-usage.json');
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(rawDir, { recursive: true });

for (const name of ['RUNAPI_BASE_URL', 'RUNAPI_API_KEY']) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

const baseUrl = process.env.RUNAPI_BASE_URL.replace(/\/+$/, '');
const apiKey = process.env.RUNAPI_API_KEY;
const gptModel = process.env.RUNAPI_CHINESE_REPORT_MODEL || 'gpt-5.5';
const qwenModel = process.env.RUNAPI_CLASSICS_MODEL || 'qwen3-235b-a22b';
const calls = [];
for (const file of fs.readdirSync(rawDir).filter((name) => name.endsWith('-failed-raw.json'))) {
  const failed = JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf8'));
  const usage = failed.usage || {};
  calls.push({
    stage: file.replace(/-failed-raw\.json$/, ''),
    model: failed.model || 'unknown',
    id: failed.id || null,
    elapsed_ms: Number(usage?.latency_checkpoint?.total_duration_ms || 0),
    usage,
    cost: failed.cost ?? usage.cost ?? usage.total_cost ?? null,
    failed: true,
  });
}

function extractJson(text) {
  const normalized = String(text || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(normalized);
  } catch {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('模型未返回 JSON 对象');
    return JSON.parse(jsonrepair(normalized.slice(start, end + 1)));
  }
}

async function complete({
  stage,
  model,
  system,
  prompt,
  maxTokens,
  reasoningEffort,
  thinking,
}) {
  const rawPath = path.join(rawDir, `${stage}-raw.json`);
  if (process.env.REUSE_SUCCESSFUL_STAGES === '1' && fs.existsSync(rawPath)) {
    const cached = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    const cachedContent = cached?.choices?.[0]?.message?.content || '';
    if (String(cachedContent).trim()) {
      const usage = cached.usage || {};
      calls.push({
        stage,
        model: cached.model || model,
        id: cached.id || null,
        elapsed_ms: Number(cached?.usage?.latency_checkpoint?.total_duration_ms || 0),
        usage,
        cost: cached.cost ?? usage.cost ?? usage.total_cost ?? null,
        reused: true,
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
  if (reasoningEffort) body.reasoning_effort = reasoningEffort;
  if (typeof thinking === 'boolean') {
    body.thinking = { type: thinking ? 'enabled' : 'disabled' };
  }

  const startedAt = Date.now();
  let response;
  let data;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      continue;
    }
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
  const usage = data.usage || {};
  calls.push({
    stage,
    model: data.model || model,
    id: data.id || null,
    elapsed_ms: Date.now() - startedAt,
    usage,
    cost: data.cost ?? usage.cost ?? usage.total_cost ?? null,
  });
  return extractJson(content);
}

function ganzhiForYear(year) {
  const stems = '甲乙丙丁戊己庚辛壬癸';
  const branches = '子丑寅卯辰巳午未申酉戌亥';
  return `${stems[((year - 4) % 10 + 10) % 10]}${branches[((year - 4) % 12 + 12) % 12]}`;
}

function parseLuck(text) {
  return String(text || '').split('|').map((item) => {
    const match = item.trim().match(/^(\S+) from age (\d+) \((\d+)\)$/);
    return match ? { gz: match[1], age: Number(match[2]), year: Number(match[3]) } : null;
  }).filter(Boolean);
}

function incomingPillarFacts(gz, natalPillars, luckGz = '') {
  const interactions = analyzeAnnualInteractions({
    annualGz: gz,
    natalPillars,
    luckGz,
    hourKnown: true,
  });
  return {
    gz,
    stem_ten_god: tenGod(natalPillars.day.stem, gz[0]),
    branch_hidden_stems: HIDDEN_STEMS[gz[1]] || [],
    branch_hidden_ten_gods: (HIDDEN_STEMS[gz[1]] || [])
      .map((stem) => ({ stem, ten_god: tenGod(natalPillars.day.stem, stem) })),
    interactions,
    tomb_storage_contacts: tombStorageContacts({
      incomingBranch: gz[1],
      natalPillars,
      hourKnown: true,
    }),
  };
}

function safeRead(relativePath, limit = 12000) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return '';
  return fs.readFileSync(absolutePath, 'utf8').slice(0, limit);
}

const loaded = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const sourceReport = Array.isArray(loaded) ? loaded[0] : loaded;
const input = sourceReport.birth_input;
const pillars = sourceReport.chart_data.pillars;
const luckPillars = parseLuck(input.dayun_text);
const dayStem = pillars.day.stem;
const dayElement = charElement(dayStem);
const strength = assessDayMasterStrength(pillars, { hourKnown: input.hour_known !== false });
const specialPattern = assessClassicalSpecialPattern(pillars, { hourKnown: input.hour_known !== false });
const weightedProfile = weightedTenGodProfile(pillars, { hourKnown: input.hour_known !== false });
const elementLabels = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
const weightedElementEnergy = Object.entries(elementLabels).map(([element, label]) => {
  const percentage = weightedProfile
    .filter((item) => item.element === element)
    .reduce((sum, item) => sum + Number(item.exactPercentage || 0), 0);
  const level = percentage === 0
    ? '缺失'
    : percentage < 5
      ? '极少'
      : percentage < 15
        ? '偏少'
        : percentage <= 35
          ? '中等'
          : '明显偏多';
  return { element: label, percentage: Number(percentage.toFixed(1)), level };
});

if (
  input.year !== 1988
  || input.month !== 8
  || input.day !== 21
  || input.hour !== 16
  || input.gender !== 'male'
  || input.bazi_str !== '戊辰 / 庚申 / 戊申 / 庚申'
) {
  throw new Error('原案例出生资料或四柱与锁定值不一致，停止生成');
}

const explicitVerdict = {
  strength: '不按普通身强身弱取用',
  pattern: '从儿格（《滴天髓》顺局）。戊土生申月，食神在提纲；月、时两庚透干，三申以庚为本气，食神成势；原局全无火印破局，木官仅辰中微藏；三申藏壬、辰藏癸，形成食伤生财的“儿又得儿”。年干戊及支中戊根不否定从儿，因为比劫仍顺生金食伤。',
  favorable_elements: [
    {
      element: '金',
      ten_gods: ['食神', '伤官'],
      chart_presence: '两庚透干，月、日、时三申皆以庚为本气',
      effect: '金是从儿格所从之神，是第一喜用；顺其食伤旺势，不再按泄身为忌',
    },
    {
      element: '水',
      ten_gods: ['偏财', '正财'],
      chart_presence: '三申藏壬偏财，辰藏癸正财，财星有源但未透',
      effect: '水承接金气，完成食伤生财，是“吾儿又得儿”，为第二喜用且是从儿格成就的关键',
    },
  ],
  unfavorable_elements: [
    {
      element: '火',
      ten_gods: ['偏印', '正印'],
      chart_presence: '原局明暗均无火',
      effect: '印星克食伤，逆转从儿之势，是第一忌神，也是主要破格之物',
    },
    {
      element: '木',
      ten_gods: ['七杀', '正官'],
      chart_presence: '仅辰中藏乙正官，原局不透且力微',
      effect: '官杀与食伤相战，又泄财回克日主，是第二忌神',
    },
    {
      element: '土',
      ten_gods: ['比肩', '劫财'],
      chart_presence: '年干、日干两戊透，辰与三申均藏戊',
      effect: '土为条件性五行：适量湿土可生金、蓄水，不破从儿；燥土过重则埋金夺水，转为不利，不能笼统列作喜神',
    },
  ],
  locked_summary: '从儿格喜金水，金为所从之神，水为“儿又得儿”；火印为第一忌神，木官杀为第二忌神，土须分湿燥与能否继续生金蓄水。',
};

const annual = Array.from({ length: 5 }, (_, offset) => 2026 + offset).map((year) => {
  const gz = ganzhiForYear(year);
  const activeLuck = luckPillars.find((item) => item.year <= year && year <= item.year + 9) || null;
  return {
    year,
    active_luck: activeLuck,
    ...incomingPillarFacts(gz, pillars, activeLuck?.gz || ''),
  };
});

const luckAnalysisFacts = luckPillars.map((item) => ({
  ...item,
  ...incomingPillarFacts(item.gz, pillars, ''),
}));

const facts = {
  immutable: true,
  birth: {
    date: '1988年8月21日',
    time: '申时（按16时起盘）',
    gender: '男',
    timezone: 'Asia/Shanghai',
    birthplace_status: '未提供，未作真太阳时校正',
  },
  pillars: {
    year: '戊辰',
    month: '庚申',
    day: '戊申',
    hour: '庚申',
  },
  day_master: '戊土',
  hidden_stems: Object.fromEntries(
    Object.entries(pillars).map(([name, pillar]) => [
      name,
      (HIDDEN_STEMS[pillar.branch] || []).map((stem) => ({
        stem,
        ten_god: tenGod(dayStem, stem),
      })),
    ]),
  ),
  strength_calculation: strength,
  classical_special_pattern: specialPattern,
  explicit_verdict: explicitVerdict,
  visible_elements: elementProfile(pillars),
  weighted_ten_gods: weightedProfile,
  weighted_five_element_energy: {
    method: '报告内部十神加权法；用于比较本盘五行相对占比，不是物理能量测量',
    totals: weightedElementEnergy,
  },
  natal_interactions: analyzeNatalInteractions(pillars),
  shen_sha: shenShaForChart(pillars),
  traditional_references: traditionalReferenceProfile(pillars, {
    gender: input.gender,
    hourKnown: true,
  }),
  luck_direction: '顺行',
  luck_start_age: 7,
  luck_pillars: luckAnalysisFacts,
  annual_2026_2030: annual,
  hard_boundaries: [
    '不得重新排盘、修改四柱、修改大运起始年份或修改喜忌。',
    '格局判断必须先执行从格、专旺、化气等特殊格局筛选，再执行普通身强身弱扶抑。此盘已锁定为从儿格，不得退回“身弱喜印比”。',
    '《滴天髓》“从儿不管身强弱”。年干戊、日干戊及支中戊根不能单独作为破从理由；比劫仍可顺生庚金食伤。',
    '喜金水，忌火木。火印克食伤，为第一破格忌神；木官杀与食伤相战，为第二忌神。土只作条件性判断：湿土生金蓄水可顺局，燥土埋金夺水则逆局。',
    '原局火在天干、地支和藏干中均不出现，必须写成“全局无火”，不得写成火有暗根。',
    '日柱旬空为寅卯，原局四支没有寅卯，因此原局无落空支，不得写三申空亡。',
    '原局月柱与时柱庚申伏吟；年干戊与日干戊重复，但年柱戊辰与日柱戊申不是伏吟。',
    '原局没有已经完成的三合局、三会局、六合化局或天干合化，不得自行宣称成化。',
    '原局辰与申只有申子辰水局的两支，缺子，只能写拱水条件，不得写已经成水局。',
    '2026丙午与甲子大运构成子午冲；丙偏印、午中丁正印均为从儿格第一忌神，并冲财星子，统一定为凶。',
    '2027丁未与甲子大运构成子未害；丁正印破食伤顺局，未中又藏丁印、乙官，统一定为偏凶。',
    '甲子大运子到位后，原局辰、申与大运子已经凑齐申子辰三支；2028流年申不是补齐缺支，而是重复加强金生水。2028戊申统一定为吉。',
    '2029己酉：酉与原局辰有辰酉六合金，酉又加强食伤所从之神；虽有子酉破，整体统一定为吉。不得虚构申酉戌三会。',
    '2030庚戌：庚食神透出为喜，戌为燥土并冲辰、藏丁印，喜忌并见，统一定为平。不得写成申酉戌三会。',
    '健康依据五行相对权重写偏多、偏少与传统身体关注：金58.3%明显偏多，土23.4%中等，水14.7%偏少，木3.5%极少，火0%缺失。必须说明金旺制木，使木对应系统成为次级关注点。',
    '健康象意与格局喜忌分开：喜金水不表示金水越多医学上越好；火为格局忌神也不表示火对应器官一定不好；不得用“缺火”推导补火建议。',
    '健康只写传统对应、相对偏枯与需要留意的系统，不作疾病诊断，不写必然患病。',
    '不得预测死亡、自伤、必然离婚、必然流产、必然官非或确定疾病。',
  ],
};

const lessonExcerpts = [
  safeRead('tmp/pdfs/reference-text/lessons/第十课正印与枭神.txt', 9000),
  safeRead('tmp/pdfs/reference-text/lessons/第十一课看八字的思路.txt', 9000),
  safeRead('tmp/pdfs/reference-text/lessons/第二十七课调候.txt', 8000),
  safeRead('tmp/pdfs/reference-text/lessons/第十四课干支组合.txt', 9000),
  safeRead('tmp/pdfs/reference-text/lessons/第五课生克制化的动态博弈（上）.txt', 7000),
  safeRead('tmp/pdfs/reference-text/lessons/第六课生克制化的动态博弈（下）.txt', 7000),
].filter(Boolean).join('\n\n---\n\n');

const deliverySamples = [
  safeRead('tmp/pdfs/reference-text/储婕命理报告.txt', 8000),
  safeRead('tmp/pdfs/reference-text/史景宇命理报告.txt', 10000),
  safeRead('tmp/pdfs/reference-text/周勃舒命理报告.txt', 10000),
  safeRead('tmp/pdfs/reference-text/小海心命书.txt', 10000),
].filter(Boolean).join('\n\n---\n\n');

const classicalCongErDoctrine = {
  source: '《滴天髓阐微》顺局',
  verse: '一出门来只见儿，吾儿成气构门闾；从儿不管身强弱，只要吾儿又得儿。',
  original_note: '戊己日遇申酉戌成西方气，不论日主强弱，而又看金能生水气，转成生育之意。',
  ren_tie_qiao_principles: [
    '月建逢食伤，食伤在提纲，是“构门闾”。',
    '四柱虽有比劫，仍可去生助食伤，不能只因日主有根便否定从儿。',
    '局中要有财，食伤生财，才是“吾儿又得儿”。',
    '从儿格最忌印运，次忌官运。',
    '土须看能否继续生金蓄水；燥土过重而夺水、埋金时反为病。',
  ],
};

const classics = await complete({
  stage: 'qwen_classics_review',
  model: qwenModel,
  thinking: false,
  maxTokens: 6000,
  system: `你是八字古法资料校核员，不负责排盘，也不负责最终定喜忌。
只能根据给定命盘事实和用户提供的课程资料整理古法原则。
禁止凭记忆杜撰古籍原文、书名、作者、页码或引文。
若资料没有给出可核对的古籍原句，只能写“古法原则”，不得加引号伪装引用。
输出有效 JSON。`,
  prompt: `请为最终中文命书整理可用的古法论证。

锁定命盘事实：
${JSON.stringify(facts)}

用户课程资料摘录：
${lessonExcerpts}

已核对的古籍原文与原则：
${JSON.stringify(classicalCongErDoctrine)}

返回：
{
  "格局校核": {
    "结论": "...",
    "证据链": ["..."],
    "不可越界": ["..."]
  },
  "喜忌校核": [
    {"五行":"金","十神":"食伤","结论":"喜","古法原则":"顺其所从之气","本命对应":"庚申食神当令成势"},
    {"五行":"水","十神":"财","结论":"喜","古法原则":"吾儿又得儿","本命对应":"申藏壬、辰藏癸，食伤生财"},
    {"五行":"火","十神":"印","结论":"忌","古法原则":"从儿最忌印运","本命对应":"原局无火，见火则逆克旺金、破坏顺局"}
  ],
  "伏吟空亡校核": ["..."],
  "事业财运婚恋的十神落点": {
    "事业": ["..."],
    "财运": ["..."],
    "婚恋": ["..."]
  },
  "大运流年判断规则": ["..."],
  "可写入报告的古法原则": ["..."],
  "禁止写成的断语": ["..."]
}

必须接受锁定结论：本命为从儿格，喜金水，火印为第一忌神，木官杀为第二忌神，土分湿燥与是否顺生金水。不得退回“身弱喜火土”，不得把火写成喜神。`,
});

const styleRules = {
  source_characteristics_to_keep: [
    '先写明确结论，再写命盘证据。',
    '把五行落到十神，再把十神落到事业、钱财、关系和岁运中的具体象意。',
    '每一结论都指出由哪个天干、地支、藏干、宫位或合冲刑破害得出。',
    '大运流年写清楚来的是哪一个五行、哪一个十神、触发原局哪一组关系，以及最终吉凶。',
  ],
  defects_to_remove: [
    '不得照搬参考报告中的绝对化疾病、生育、死亡、离婚或官非断语。',
    '不得出现“问题清单”“实践步骤”“反思问题”“行动建议”固定模块。',
    '不得使用“支撑、承压、变化强度、选择性推进、保持节奏”等项目管理黑话。',
    '不得写“可能有利也可能不利”“视情况而定”“不同流派各有说法”来回避结论。',
    '不得把人格心理测试当作命理分析主体。',
    '不得为了凑字数在不同章节重复同一段喜忌说明。',
  ],
  tone: '像有经验的命理师写给付费客户的命书：明确、连贯、有据、有主次，不故弄玄虚。',
};

const requiredSections = [
  '一、命盘与总论',
  '二、日主旺衰、格局与喜忌',
  '三、五行十神与能量结构',
  '四、原局干支关系、伏吟与空亡',
  '五、性情、能力与人生取向',
  '六、六亲与家庭关系',
  '七、事业与适合的发展方式',
  '八、财运与求财方式',
  '九、婚恋与伴侣关系',
  '十、健康五行象意',
  '十一、大运总论',
  '十二、2026年至2030年流年详断',
  '十三、命局总结',
];

const compactNatalFacts = {
  immutable: facts.immutable,
  birth: facts.birth,
  pillars: facts.pillars,
  day_master: facts.day_master,
  hidden_stems: facts.hidden_stems,
  strength_calculation: facts.strength_calculation,
  explicit_verdict: facts.explicit_verdict,
  visible_elements: facts.visible_elements,
  weighted_ten_gods: facts.weighted_ten_gods,
  natal_interactions: facts.natal_interactions,
  shen_sha: facts.shen_sha,
  traditional_references: {
    void: facts.traditional_references.void,
    exposureAndRooting: facts.traditional_references.exposureAndRooting,
    pillarSymbolism: facts.traditional_references.pillarSymbolism,
    safeguards: facts.traditional_references.safeguards,
  },
  luck_direction: facts.luck_direction,
  luck_start_age: facts.luck_start_age,
  hard_boundaries: facts.hard_boundaries,
};

const draftChunks = [];
const sectionChunks = [
  requiredSections.slice(0, 5),
  requiredSections.slice(5, 10),
  requiredSections.slice(10),
];
for (let chunkIndex = 0; chunkIndex < sectionChunks.length; chunkIndex += 1) {
  const chunkSections = sectionChunks[chunkIndex];
  const factsForChunk = chunkIndex === 2
    ? {
      ...compactNatalFacts,
      luck_pillars: facts.luck_pillars,
      annual_2026_2030: facts.annual_2026_2030,
    }
    : compactNatalFacts;
  draftChunks.push(await complete({
    stage: `gpt_chinese_report_draft_${chunkIndex + 1}`,
    model: gptModel,
    reasoningEffort: 'medium',
    maxTokens: 30000,
    system: `你是滕云子命书的首席命理分析师和中文主笔。
你必须以程序提供的不可变命盘事实为唯一排盘依据。
你负责作出明确的传统命理判断，不写心理测试，不写现代管理咨询，不写模棱两可的安慰话。
你不能改盘、补盘、把藏干写成透干、把接触写成合化、把半合或拱合写成完整三合。
最终输出必须是纯中文、有效 JSON。`,
    prompt: `为该案例撰写一份可直接交给客户审阅的纯中文文字版命书。本次只写指定章节，不得越界写其他章节。

不可变命盘事实：
${JSON.stringify(factsForChunk)}

千问整理的古法校核：
${JSON.stringify(classics)}

写作风格规则：
${JSON.stringify(styleRules)}

用户本人交付报告的参考文本已经由编辑归纳为上述写作风格规则；参考报告的核心是先下结论、再列命盘证据、再落十神象意。

本次必须严格按以下章节顺序，只写这些章节：
${JSON.stringify(chunkSections)}

核心硬性要求：
1. 第一章开头直接下结论：本命不按普通身弱格取用，而按《滴天髓》顺局取从儿格。戊土生申月，食神在提纲；两庚透、三申成势，全局无火印破局，三申藏壬、辰藏癸，食伤生财。此处不得提前重复古籍原句。
2. 只在第二章单列一次“古籍依据与成格复核”，准确写出《滴天髓阐微》顺局四句原文，并逐条对应月令、透干、三申、财星、无印、微官。全书其他章节只能写“依据前述顺局原则”，不得再次出现完整或截短引文，不得再次重复书名、章节名和出处说明。
3. 明确写喜金水：金为所从之食伤，水为财星，是“儿又得儿”。明确写火印为第一忌神、木官杀为第二忌神。土不得笼统判喜，必须分湿土生金蓄水与燥土埋金夺水。
4. 普通旺衰计算只可作为底层数据，不得用“身偏弱所以喜印比”覆盖从儿格。年干戊、日干戊及三申藏戊不能单独作为破从理由。
5. 事业、财运、婚恋必须给明确判断，每个判断至少列出两条原局证据，不能靠泛泛建议代替。
6. 大运逐步写完辛酉、壬戌、癸亥、甲子、乙丑、丙寅、丁卯、戊辰。每步包含：干支十神、喜忌、触发关系、总体吉凶。总体评级固定为：辛酉吉、壬戌偏吉、癸亥吉、甲子偏吉、乙丑平、丙寅凶、丁卯凶、戊辰平。可以有主次，但不能只写“有利也有压力”。
7. 流年逐年写2026丙午、2027丁未、2028戊申、2029己酉、2030庚戌。评级固定为：2026凶、2027偏凶、2028吉、2029吉、2030平。每年先给评级，再给从儿格证据。
8. 2028年必须指出在甲子大运中，原局辰、申与大运子、流年申凑齐申子辰水局条件，财星水势显著增强；不得把财旺直接等同于发财。
9. 2029年只可写辰酉六合金与子酉破，不得写申酉戌三会；2030年只可写辰戌冲与甲庚冲，不得写三会。
10. 不写风水物品、颜色、数字、食物等未经用户此次要求的化解内容。
11. 不写任何反问句、客户自测题、实践步骤或每日行动。
12. 不使用“也许、或许、大概、可能是、视情况、可用、候选、暂定、支撑、承压、姿态、选择性推进”等模糊或管理咨询词。
13. 允许使用“容易、倾向、应注意”表达传统象意边界；不能把疾病、生育、婚姻、官非、死亡写成必然事件。
14. 各章节不得复制粘贴同一段话。每章约500至900个汉字，内容密度优先，不为篇幅灌水。
15. 五行生克不得写反：金克木，不得写“甲木克庚金”或“木克金”；甲庚只能写甲庚冲、庚金制甲或食神制杀。卯只藏乙，对戊土为正官，不得写偏官；辰只藏戊乙癸，不得写辰藏庚。
16. 合、冲、刑、害与合化必须分开。申亥只按六害写，不加“暗合”；辰酉只写六合金的关系接触，除非程序明确确认化金，不得写“六合成金”；戊癸只写合火接触且本局无火势承接，不得断化。
17. 古籍只允许逐字引用已提供的《滴天髓阐微·顺局》四句原文，而且全书只出现一次。其他内容必须标作“任氏注释要点”并用转述，不得给未经提供的句子加引号，不得拼接伪造古文。
18. 健康章节必须依据程序给出的五行权重，明确列出每一行的百分比、偏多/适中/偏少/缺失及传统身体对应。过多与过少均视为传统失衡关注点，并说明相克链条，例如金过旺会进一步制约木。格局喜忌与身体五行偏枯必须分开：某五行为忌不等于其对应器官医学上一定不好，某五行缺失也不等于应主动补该五行。不得诊断具体疾病或断某年必然发病，结尾保留正规医学检查免责声明。

返回 JSON：
{
  "书名": "八字命书",
  "基本资料": ["..."],
  "章节": [
    {"标题":"指定章节的原样标题","正文":["完整段落1","完整段落2"]}
  ]
}
只返回上述 JSON。本次不得输出“终审结论”。`,
  }));
}

const draft = {
  书名: draftChunks[0]?.书名 || '八字命书',
  基本资料: draftChunks[0]?.基本资料 || [
    '出生：1988年8月21日申时（按16时起盘）',
    '性别：男',
    '四柱：戊辰　庚申　戊申　庚申',
    '说明：未提供出生地与具体分钟，未作真太阳时校正；起运时间按申时中点估算。',
  ],
  章节: draftChunks.flatMap((chunk) => Array.isArray(chunk.章节) ? chunk.章节 : []),
  终审结论: [
    '本命按《滴天髓》顺局取从儿格：食神在提纲，两庚透、三申成势，无火印破局，金又生支中壬癸财星。',
    '喜金水；火印为第一忌神，木官杀为第二忌神。土须分湿燥及能否继续生金蓄水。',
  ],
};

const qaNatal = await complete({
  stage: 'gpt_chinese_report_qa_natal',
  model: gptModel,
  reasoningEffort: 'medium',
  maxTokens: 14000,
  system: `你是八字命书终审员。逐字核对原局事实、十神、藏干、旺衰、喜忌、刑冲合害、六亲、事业、财运、婚恋与健康象意。
只找错误，不润色，不迎合作者。输出有效 JSON。`,
  prompt: `不可变事实：
${JSON.stringify(compactNatalFacts)}

古法校核：
${JSON.stringify(classics)}

待审文字（第一至第十章）：
${JSON.stringify({
  ...draft,
  章节: draft.章节.filter((section) => requiredSections.slice(0, 10).includes(section.标题)),
})}

逐项检查：
- 四柱、出生资料、藏干、十神映射是否完全正确；
- 是否把透干、通根、藏干混淆；
- 是否把接触、半合、拱合、六合误写成完成合化；
- 是否始终以从儿格为最高优先级，并保持喜金水、忌火木、土分湿燥；
- 是否严格遵守金克木，未写成“木克金/甲木克庚金”；甲为七杀、乙与卯中乙为正官；辰藏干只能是戊乙癸；
- 是否仅逐字引用所提供的《滴天髓阐微·顺局》四句，其他古法内容均为无引号转述；
- 事业、财运、婚恋结论是否都有原局证据；
- 是否出现空洞模板、心理学话术、反思问题、行动建议、管理咨询词、模糊喜忌；
- 是否出现无依据的具体经历，或疾病、生育、婚姻、官非、生死的必然断言；
- 是否有章节缺失、重复段落、前后矛盾。

返回：
{
  "通过": false,
  "问题": [
    {"级别":"严重或一般","章节":"...","原文":"...","错误":"...","应改为":"..."}
  ],
  "缺失内容": ["..."],
  "确定无误的关键结论": ["..."]
}
只有完全没有事实错误和严重表达问题时才可写“通过”:true。`,
});

const qaTiming = await complete({
  stage: 'gpt_chinese_report_qa_timing',
  model: gptModel,
  reasoningEffort: 'medium',
  maxTokens: 14000,
  system: `你是八字命书岁运终审员。逐字核对大运、流年干支、十神、喜忌和所有触发关系。
只找错误，不润色，不迎合作者。输出有效 JSON。`,
  prompt: `不可变原局与岁运事实：
${JSON.stringify({
  ...compactNatalFacts,
  luck_pillars: facts.luck_pillars,
  annual_2026_2030: facts.annual_2026_2030,
})}

古法校核：
${JSON.stringify(classics)}

待审文字（第十一至第十三章）：
${JSON.stringify({
  ...draft,
  章节: draft.章节.filter((section) => requiredSections.slice(10).includes(section.标题)),
})}

逐项检查：
- 八步大运干支、十神、喜忌、触发关系是否正确；
- 2026至2030每年干支、十神、当时大运、触发关系是否正确；
- 2026必须核对甲子大运中的子午冲；
- 2027必须核对甲子大运中的子未害；
- 2028必须核对原局辰申、大运子与流年申形成的申子辰水局条件；
- 2029只能写辰酉六合金及子酉破，不得虚构申酉戌三会；
- 2030必须写辰戌冲及甲庚冲，不得虚构申酉戌三会；
- 任何合化都必须区分“出现相合”与“已经化成”；
- 申亥不得擅加暗合；辰酉不得直接写已化金；必须遵守金克木，甲庚写干冲与庚金制甲，不得写甲木克庚金；
- 卯藏乙为正官，不得写偏官；辰藏戊乙癸，不得写辰藏庚；
- 每一步必须给出明确主结论，不能使用项目管理词或模糊喜忌；
- 不得出现无依据的具体经历，或疾病、生育、婚姻、官非、生死的必然断言；
- 第十三章是否与前十二章的格局和喜忌一致。

返回：
{
  "通过": false,
  "问题": [
    {"级别":"严重或一般","章节":"...","原文":"...","错误":"...","应改为":"..."}
  ],
  "缺失内容": ["..."],
  "确定无误的关键结论": ["..."]
}
只有完全没有事实错误和严重表达问题时才可写“通过”:true。`,
});

const qa = {
  通过: qaNatal.通过 === true && qaTiming.通过 === true,
  问题: [
    ...(Array.isArray(qaNatal.问题) ? qaNatal.问题 : []),
    ...(Array.isArray(qaTiming.问题) ? qaTiming.问题 : []),
  ],
  缺失内容: [
    ...(Array.isArray(qaNatal.缺失内容) ? qaNatal.缺失内容 : []),
    ...(Array.isArray(qaTiming.缺失内容) ? qaTiming.缺失内容 : []),
  ],
  确定无误的关键结论: [
    ...(Array.isArray(qaNatal.确定无误的关键结论) ? qaNatal.确定无误的关键结论 : []),
    ...(Array.isArray(qaTiming.确定无误的关键结论) ? qaTiming.确定无误的关键结论 : []),
  ],
  分项: { 原局与主题: qaNatal, 岁运: qaTiming },
};

let finalReport = draft;
if (qa.通过 !== true || (Array.isArray(qa.问题) && qa.问题.length)) {
  const lockedRepairDirectives = [
    '戊土见丙为偏印、见丁为正印；见戊为比肩、见己为劫财；见庚为食神、见辛为伤官；见壬为偏财、见癸为正财；见甲为七杀、见乙为正官。',
    '本命按《滴天髓》顺局取从儿格。不得写成普通身弱格、不得喜印比、不得把金水判忌。',
    '原局全局无火；两庚透干、三申本气庚，食神成势；三申藏壬、辰藏癸，食伤生财。年干戊及支中戊根不破从。',
    '喜金水；火印为第一忌神，木官杀为第二忌神。土只作条件性判断：湿土生金蓄水可顺局，燥土埋金夺水则逆局。',
    '原局月柱与时柱庚申伏吟。年柱戊辰与日柱戊申不是伏吟；日柱旬空寅卯，原局没有空亡落支。',
    '原局辰申只是申子辰的两支，未见子时不得写完整水局。甲子大运到位后，才具备申子辰三合水局的结构条件。',
    '大运总体结论统一为：辛酉吉、壬戌偏吉、癸亥吉、甲子偏吉、乙丑平、丙寅凶、丁卯凶、戊辰平。',
    '2026丙午年统一定为凶：丙午印星火破从，午又冲甲子大运财星子。',
    '2027丁未年统一定为偏凶：丁正印破食伤，未中再藏丁印与乙官，并有子未害。',
    '2028戊申年统一定为吉：申金食神喜用再临，戊土继续生金；甲子大运中原局申辰与子已凑齐三支，流年申为重复加强。',
    '2029己酉年统一定为吉：酉伤官为从儿所从之神，辰酉合金加强喜神；子酉破为减分项但不改总体。',
    '2030庚戌年统一定为平：庚食神为喜，戌为燥土、冲辰且藏丁印，喜忌并见。',
    '2029年不得写申酉戌三会，因无戌；2030年不得写申酉戌三会，因无酉。',
    '五行必须写作金克木。甲庚关系写甲庚冲、庚金制甲或食神制杀，绝对不得写“甲木克庚金”“木克金”。',
    '卯只藏乙，对戊土为正官；辰只藏戊乙癸。不得写卯为偏官、不得写辰藏庚。',
    '申亥只写六害，不加暗合；辰酉只写六合金的关系接触，不得擅断已经化金。',
    '古籍直接引文只允许使用已提供的《滴天髓阐微·顺局》四句，其他内容一律用无引号转述。',
    '健康只列传统五行身体对应与医学免责声明，不作症状、疾病、体质或岁运健康预测。',
    '终审意见若与以上指令或基础五行生克矛盾，以上指令优先。',
  ];
  const repairChunks = [];
  for (let chunkIndex = 0; chunkIndex < sectionChunks.length; chunkIndex += 1) {
    const chunkHeadings = new Set(sectionChunks[chunkIndex]);
    const chunkDraft = (draft.章节 || []).filter((section) => chunkHeadings.has(section.标题));
    const chunkIssues = (qa.问题 || []).filter((issue) => (
      chunkDraft.some((section) => String(issue.章节 || '').includes(section.标题))
      || String(issue.章节 || '').includes('全篇')
      || String(issue.章节 || '').includes('大运')
      || String(issue.章节 || '').includes('流年')
    ));
    const factsForRepair = chunkIndex === 2
      ? {
        ...compactNatalFacts,
        luck_pillars: facts.luck_pillars,
        annual_2026_2030: facts.annual_2026_2030,
      }
      : compactNatalFacts;
    repairChunks.push(await complete({
      stage: `gpt_chinese_report_repair_${chunkIndex + 1}`,
      model: gptModel,
      reasoningEffort: 'medium',
      maxTokens: chunkIndex === 2 ? 18000 : 16000,
      system: `你是滕云子命书的终稿修订师。只依据不可变事实和终审问题修复指定章节。
不得借修订之名增加新事实。必须保留明确喜忌和直接判断。输出纯中文有效 JSON。`,
      prompt: `不可变事实：
${JSON.stringify(factsForRepair)}

人工锁定的修订指令：
${JSON.stringify(lockedRepairDirectives)}

本次指定章节原稿：
${JSON.stringify(chunkDraft)}

与本次章节有关的终审问题：
${JSON.stringify(chunkIssues)}

请输出修复后的指定章节，标题和数量一个都不能少：
${JSON.stringify(sectionChunks[chunkIndex])}

保持格式：
{
  "章节": [
    {"标题":"指定章节的原样标题","正文":["完整段落1","完整段落2"]}
  ]
}
不得输出修订说明。`,
    }));
  }
  finalReport = {
    ...draft,
    章节: repairChunks.flatMap((chunk) => Array.isArray(chunk.章节) ? chunk.章节 : []),
  };
}

const headings = new Set((finalReport.章节 || []).map((section) => section.标题));
const missingHeadings = requiredSections.filter((heading) => !headings.has(heading));
if (missingHeadings.length) {
  throw new Error(`终稿缺少章节：${missingHeadings.join('、')}`);
}

const rendered = [
  finalReport.书名 || '八字命书',
  '',
  ...(finalReport.基本资料 || []),
  '',
  ...(finalReport.章节 || []).flatMap((section) => [
    section.标题,
    '',
    ...(section.正文 || []),
    '',
  ]),
  '终审结论',
  '',
  ...(finalReport.终审结论 || []),
  '',
].join('\n');

const forbidden = [
  /QUESTIONS?/i,
  /PRACTICAL STEP/i,
  /SELECTIVE ADVANCE/i,
  /HOLD & PROTECT/i,
  /Support Level/i,
  /Pressure Level/i,
  /反思问题/,
  /实践步骤/,
  /选择性推进/,
  /支撑水平/,
  /承压水平/,
];
const forbiddenHits = forbidden.filter((pattern) => pattern.test(rendered)).map(String);
if (forbiddenHits.length) throw new Error(`终稿仍含禁用模板词：${forbiddenHits.join(', ')}`);
for (const requiredText of ['从儿格', '喜金水', '火印为第一忌神', '2028', '申子辰']) {
  if (!rendered.includes(requiredText)) throw new Error(`终稿缺少锁定内容：${requiredText}`);
}
const classicalQuoteCount = (rendered.match(/一出门来只见儿/g) || []).length;
const classicalSourceCount = (rendered.match(/《滴天髓阐微·顺局》/g) || []).length;
if (classicalQuoteCount !== 1 || classicalSourceCount !== 1) {
  throw new Error(`古籍引用次数不合格：原文${classicalQuoteCount}次，完整出处${classicalSourceCount}次；两者都必须且只能出现一次`);
}
for (const requiredEnergyText of ['金58.3%', '土23.4%', '水14.7%', '木3.5%', '火0%']) {
  if (!rendered.includes(requiredEnergyText)) throw new Error(`健康章节缺少五行权重：${requiredEnergyText}`);
}
if (!rendered.includes('金又克木') && !rendered.includes('金旺制木')) {
  throw new Error('健康章节缺少旺金制木的生克链条');
}

fs.writeFileSync(reportPath, rendered);

const totals = calls.reduce((sum, call) => {
  const usage = call.usage || {};
  sum.prompt_tokens += Number(usage.prompt_tokens || usage.input_tokens || 0);
  sum.completion_tokens += Number(usage.completion_tokens || usage.output_tokens || 0);
  sum.total_tokens += Number(usage.total_tokens || 0);
  if (typeof call.cost === 'number') sum.reported_cost += call.cost;
  else sum.all_costs_reported = false;
  return sum;
}, {
  prompt_tokens: 0,
  completion_tokens: 0,
  total_tokens: 0,
  reported_cost: 0,
  all_costs_reported: true,
});

fs.writeFileSync(auditPath, JSON.stringify({
  generated_at: new Date().toISOString(),
  report_path: reportPath,
  qwen_model: qwenModel,
  gpt_model: gptModel,
  qa,
  calls,
  totals,
}, null, 2));

console.log(JSON.stringify({
  reportPath,
  auditPath,
  qa_passed_without_repair: qa.通过 === true && (!Array.isArray(qa.问题) || qa.问题.length === 0),
  calls: calls.map(({ stage, model, usage, cost, elapsed_ms }) => ({
    stage,
    model,
    usage,
    cost,
    elapsed_ms,
  })),
  totals,
}, null, 2));
