import lunarPackage from 'npm:lunar-javascript@1.7.7';

const { Solar } = lunarPackage as Record<string, any>;

export type MonthlyBaziProfile = {
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_hour: number;
  gender?: string;
  timezone?: string;
  language?: string;
};

export type BaziPillar = {
  label: string;
  ganzhi: string;
  stem: string;
  branch: string;
  stem_element: string;
  branch_element: string;
};

export type BaziInteraction = {
  kind: 'Clash' | 'Harm' | 'Break' | 'Punishment' | 'Self-punishment';
  source: string;
  target: string;
  branches: string;
  weight: number;
  guidance: string;
};

export type ForecastArea = {
  key: 'career' | 'wealth' | 'relationships' | 'wellbeing';
  label: string;
  score: number;
  signal: 'Supportive' | 'Mixed' | 'Cautious';
  headline: string;
  guidance: string;
};

export type MonthlyBaziForecast = {
  generated_for: string;
  solar_month_key: string;
  period_label: string;
  year_pillar: string;
  month_pillar: string;
  natal_pillars: BaziPillar[];
  day_master: string;
  day_master_element: string;
  chart_tendency: 'strong' | 'balanced' | 'weak';
  confidence: 'standard' | 'reduced';
  confidence_note: string;
  element_balance: Record<string, number>;
  supportive_elements: string[];
  caution_elements: string[];
  month_elements: string[];
  interactions: BaziInteraction[];
  interaction_summary: string;
  score: number;
  posture: 'Advance' | 'Build steadily' | 'Consolidate' | 'Protect and review';
  pace: 'Decisive' | 'Stable' | 'Conservative';
  headline: string;
  strategy: string;
  areas: ForecastArea[];
  priorities: string[];
  cautions: string[];
  disclaimer: string;
};

const STEM_ELEMENT: Record<string, string> = {
  '甲': 'Wood', '乙': 'Wood',
  '丙': 'Fire', '丁': 'Fire',
  '戊': 'Earth', '己': 'Earth',
  '庚': 'Metal', '辛': 'Metal',
  '壬': 'Water', '癸': 'Water',
};

const BRANCH_ELEMENT: Record<string, string> = {
  '寅': 'Wood', '卯': 'Wood',
  '巳': 'Fire', '午': 'Fire',
  '辰': 'Earth', '戌': 'Earth', '丑': 'Earth', '未': 'Earth',
  '申': 'Metal', '酉': 'Metal',
  '亥': 'Water', '子': 'Water',
};

const GENERATES: Record<string, string> = {
  Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood',
};

const CONTROLS: Record<string, string> = {
  Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood',
};

const INTERACTION_PAIRS: Array<{ kind: BaziInteraction['kind']; pairs: string[]; weight: number }> = [
  { kind: 'Clash', pairs: ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'], weight: 14 },
  { kind: 'Harm', pairs: ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'], weight: 10 },
  { kind: 'Break', pairs: ['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌'], weight: 8 },
  { kind: 'Punishment', pairs: ['子卯', '寅巳', '巳申', '申寅', '丑戌', '戌未', '未丑'], weight: 12 },
];

const SELF_PUNISHMENT = new Set(['辰', '午', '酉', '亥']);

function invoke(target: any, name: string, fallback = ''): any {
  try {
    return typeof target?.[name] === 'function' ? target[name]() : fallback;
  } catch {
    return fallback;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

function inverseGenerate(element: string): string {
  return Object.keys(GENERATES).find((key) => GENERATES[key] === element) || element;
}

function inverseControl(element: string): string {
  return Object.keys(CONTROLS).find((key) => CONTROLS[key] === element) || element;
}

function elementRole(dayMasterElement: string, element: string): string {
  if (element === dayMasterElement) return 'Companion';
  if (GENERATES[dayMasterElement] === element) return 'Output';
  if (CONTROLS[dayMasterElement] === element) return 'Wealth';
  if (CONTROLS[element] === dayMasterElement) return 'Authority';
  if (GENERATES[element] === dayMasterElement) return 'Resource';
  return 'Neutral';
}

function splitGanzhi(value: unknown): { ganzhi: string; stem: string; branch: string } {
  const ganzhi = String(value || '').trim();
  return { ganzhi, stem: ganzhi.slice(0, 1), branch: ganzhi.slice(1, 2) };
}

function pillar(label: string, ganzhiValue: unknown): BaziPillar {
  const value = splitGanzhi(ganzhiValue);
  return {
    label,
    ...value,
    stem_element: STEM_ELEMENT[value.stem] || 'Earth',
    branch_element: BRANCH_ELEMENT[value.branch] || 'Earth',
  };
}

function natalPillars(profile: MonthlyBaziProfile): BaziPillar[] {
  const knownHour = Number(profile.birth_hour) >= 0;
  const hour = knownHour ? Number(profile.birth_hour) : 12;
  const lunar = Solar.fromYmdHms(
    Number(profile.birth_year), Number(profile.birth_month), Number(profile.birth_day), hour, 0, 0,
  ).getLunar();
  const pillars = [
    pillar('Year', invoke(lunar, 'getYearInGanZhiByLiChun', '') || invoke(lunar, 'getYearInGanZhiExact', '') || invoke(lunar, 'getYearInGanZhi', '')),
    pillar('Month', invoke(lunar, 'getMonthInGanZhiExact', '') || invoke(lunar, 'getMonthInGanZhi', '')),
    pillar('Day', invoke(lunar, 'getDayInGanZhiExact2', '') || invoke(lunar, 'getDayInGanZhi', '')),
  ];
  if (knownHour) pillars.push(pillar('Hour', invoke(lunar, 'getTimeInGanZhi', '')));
  return pillars;
}

function periodPillars(date: Date): { year: BaziPillar; month: BaziPillar } {
  const lunar = Solar.fromYmdHms(
    date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 12, 0, 0,
  ).getLunar();
  return {
    year: pillar('Annual', invoke(lunar, 'getYearInGanZhiByLiChun', '') || invoke(lunar, 'getYearInGanZhiExact', '') || invoke(lunar, 'getYearInGanZhi', '')),
    month: pillar('Monthly', invoke(lunar, 'getMonthInGanZhiExact', '') || invoke(lunar, 'getMonthInGanZhi', '')),
  };
}

function elementBalance(pillars: BaziPillar[]): Record<string, number> {
  const balance: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const item of pillars) {
    balance[item.stem_element] += 1;
    balance[item.branch_element] += item.label === 'Month' ? 1.75 : 1;
  }
  return Object.fromEntries(Object.entries(balance).map(([key, value]) => [key, Number(value.toFixed(2))]));
}

function chartSupport(dayMasterElement: string, balance: Record<string, number>) {
  const resource = inverseGenerate(dayMasterElement);
  const total = Object.values(balance).reduce((sum, value) => sum + value, 0) || 1;
  const supportRatio = ((balance[dayMasterElement] || 0) + (balance[resource] || 0)) / total;
  const tendency = supportRatio > 0.56 ? 'strong' : supportRatio < 0.42 ? 'weak' : 'balanced';
  if (tendency === 'weak') {
    return {
      tendency,
      supportive: [resource, dayMasterElement],
      caution: [GENERATES[dayMasterElement], CONTROLS[dayMasterElement], inverseControl(dayMasterElement)],
    };
  }
  if (tendency === 'strong') {
    return {
      tendency,
      supportive: [GENERATES[dayMasterElement], CONTROLS[dayMasterElement], inverseControl(dayMasterElement)],
      caution: [dayMasterElement, resource],
    };
  }
  const sorted = Object.entries(balance).sort((a, b) => a[1] - b[1]);
  return {
    tendency,
    supportive: sorted.slice(0, 2).map(([element]) => element),
    caution: sorted.slice(-2).reverse().map(([element]) => element),
  };
}

function pairMatches(left: string, right: string, pair: string): boolean {
  return (pair[0] === left && pair[1] === right) || (pair[0] === right && pair[1] === left);
}

function interactionGuidance(kind: BaziInteraction['kind']): string {
  const guidance: Record<BaziInteraction['kind'], string> = {
    Clash: 'Expect movement or competing priorities. Keep plans adjustable and verify timing before committing.',
    Harm: 'Watch indirect friction, assumptions, and unspoken expectations. Use explicit communication.',
    Break: 'Small disruptions can expose weak links. Repair process and agreements before expanding.',
    Punishment: 'Pressure can become self-reinforcing. Slow repetitive reactions and choose a measured response.',
    'Self-punishment': 'Avoid overthinking or repeating the same pressure pattern. Build recovery into the schedule.',
  };
  return guidance[kind];
}

function detectPairInteractions(source: BaziPillar, target: BaziPillar, multiplier = 1): BaziInteraction[] {
  if (!source.branch || !target.branch) return [];
  const found: BaziInteraction[] = [];
  if (source.branch === target.branch && SELF_PUNISHMENT.has(source.branch)) {
    found.push({
      kind: 'Self-punishment',
      source: source.label,
      target: target.label,
      branches: `${source.branch}-${target.branch}`,
      weight: Math.round(8 * multiplier),
      guidance: interactionGuidance('Self-punishment'),
    });
  }
  for (const group of INTERACTION_PAIRS) {
    if (!group.pairs.some((pair) => pairMatches(source.branch, target.branch, pair))) continue;
    found.push({
      kind: group.kind,
      source: source.label,
      target: target.label,
      branches: `${source.branch}-${target.branch}`,
      weight: Math.round(group.weight * multiplier),
      guidance: interactionGuidance(group.kind),
    });
  }
  return found;
}

function interactionsFor(natal: BaziPillar[], annual: BaziPillar, monthly: BaziPillar): BaziInteraction[] {
  const found: BaziInteraction[] = [];
  for (const item of natal) {
    found.push(...detectPairInteractions(monthly, item, item.label === 'Day' || item.label === 'Month' ? 1.2 : 1));
    found.push(...detectPairInteractions(annual, item, 0.72));
  }
  found.push(...detectPairInteractions(monthly, annual, 0.65));
  return found
    .sort((a, b) => b.weight - a.weight)
    .filter((item, index, list) => list.findIndex((other) => (
      other.kind === item.kind && other.source === item.source && other.target === item.target
    )) === index)
    .slice(0, 10);
}

function scoreArea(
  key: ForecastArea['key'],
  overall: number,
  monthRole: string,
  interactions: BaziInteraction[],
): ForecastArea {
  const dayPressure = interactions.filter((item) => item.target === 'Day').reduce((sum, item) => sum + item.weight, 0);
  const monthPressure = interactions.filter((item) => item.target === 'Month').reduce((sum, item) => sum + item.weight, 0);
  let score = overall;
  if (key === 'career') score += ({ Authority: 9, Output: 7, Resource: 4, Wealth: 3 } as Record<string, number>)[monthRole] || 0;
  if (key === 'wealth') score += ({ Wealth: 11, Output: 6, Authority: 2 } as Record<string, number>)[monthRole] || 0;
  if (key === 'relationships') score += ({ Companion: 5, Resource: 3, Output: 2 } as Record<string, number>)[monthRole] || 0;
  if (key === 'wellbeing') score += ({ Resource: 8, Companion: 3 } as Record<string, number>)[monthRole] || 0;
  if (key === 'career') score -= Math.min(monthPressure * 0.32, 13);
  if (key === 'wealth') score -= Math.min(monthPressure * 0.2, 8);
  if (key === 'relationships') score -= Math.min(dayPressure * 0.45, 16);
  if (key === 'wellbeing') score -= Math.min((dayPressure + monthPressure) * 0.28, 17);
  score = clamp(score, 25, 86);
  const signal: ForecastArea['signal'] = score >= 62 ? 'Supportive' : score >= 45 ? 'Mixed' : 'Cautious';

  const copy: Record<ForecastArea['key'], Record<ForecastArea['signal'], [string, string]>> = {
    career: {
      Supportive: ['Make useful work visible', 'Prioritize one concrete deliverable, ask for clear ownership, and use evidence when presenting an idea.'],
      Mixed: ['Progress through structure', 'Advance the work that already has context. Clarify scope before accepting new responsibility.'],
      Cautious: ['Protect focus and authority', 'Keep commitments narrow, document decisions, and avoid reacting to every request as if it were urgent.'],
    },
    wealth: {
      Supportive: ['Use opportunity with rules', 'Negotiate terms, review pricing, and direct resources toward work with a measurable return.'],
      Mixed: ['Prefer disciplined allocation', 'Separate genuine opportunity from urgency. Keep a margin for timing changes and hidden costs.'],
      Cautious: ['Preserve cash and optionality', 'Delay speculative commitments, verify contracts, and favor reversible financial decisions.'],
    },
    relationships: {
      Supportive: ['Name intentions clearly', 'Direct conversation is more useful than guessing. Make room for warmth without promising more than you can sustain.'],
      Mixed: ['Slow the interpretation gap', 'Check assumptions, ask one more question, and avoid turning temporary friction into a permanent conclusion.'],
      Cautious: ['Reduce reactive conversations', 'Choose timing carefully, keep boundaries clear, and revisit difficult topics after emotional intensity falls.'],
    },
    wellbeing: {
      Supportive: ['Build strength through rhythm', 'Protect sleep, regular meals, movement, and focused recovery so stronger momentum remains sustainable.'],
      Mixed: ['Treat energy as a budget', 'Alternate effort with recovery and notice where pressure is becoming repetitive rather than productive.'],
      Cautious: ['Recovery is part of the plan', 'Reduce overload, keep routines simple, and seek qualified care for any health concern rather than relying on a forecast.'],
    },
  };
  const labels: Record<ForecastArea['key'], string> = {
    career: 'Career', wealth: 'Wealth', relationships: 'Relationships', wellbeing: 'Health & wellbeing',
  };
  return { key, label: labels[key], score, signal, headline: copy[key][signal][0], guidance: copy[key][signal][1] };
}

export function buildMonthlyBaziForecast(profile: MonthlyBaziProfile, date: Date): MonthlyBaziForecast {
  const natal = natalPillars(profile);
  const period = periodPillars(date);
  const day = natal.find((item) => item.label === 'Day') || natal[2];
  const dayMasterElement = day?.stem_element || 'Earth';
  const balance = elementBalance(natal);
  const support = chartSupport(dayMasterElement, balance);
  const interactions = interactionsFor(natal, period.year, period.month);
  const periodElements = Array.from(new Set([
    period.month.stem_element, period.month.branch_element,
    period.year.stem_element, period.year.branch_element,
  ]));
  let score = 55;
  const monthlyElements = [period.month.stem_element, period.month.branch_element];
  const annualElements = [period.year.stem_element, period.year.branch_element];
  score += monthlyElements.reduce((sum, element) => sum + (support.supportive.includes(element) ? 9 : 0), 0);
  score -= monthlyElements.reduce((sum, element) => sum + (support.caution.includes(element) ? 7 : 0), 0);
  score += annualElements.reduce((sum, element) => sum + (support.supportive.includes(element) ? 4 : 0), 0);
  score -= annualElements.reduce((sum, element) => sum + (support.caution.includes(element) ? 3 : 0), 0);
  score -= Math.min(interactions.reduce((sum, item) => sum + item.weight, 0) * 0.42, 28);
  score = clamp(score, 25, 84);

  const posture: MonthlyBaziForecast['posture'] = score >= 68
    ? 'Advance'
    : score >= 54
      ? 'Build steadily'
      : score >= 42
        ? 'Consolidate'
        : 'Protect and review';
  const pace: MonthlyBaziForecast['pace'] = posture === 'Advance'
    ? 'Decisive'
    : posture === 'Build steadily'
      ? 'Stable'
      : 'Conservative';
  const monthRole = elementRole(dayMasterElement, period.month.stem_element);
  const areas = (['career', 'wealth', 'relationships', 'wellbeing'] as ForecastArea['key'][])
    .map((key) => scoreArea(key, score, monthRole, interactions));

  const monthName = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(date);
  const interactionSummary = interactions.length
    ? `${interactions.length} notable branch interaction${interactions.length === 1 ? '' : 's'} appear across the natal chart, annual pillar, and monthly pillar. Treat them as pressure points to manage, not fixed events.`
    : 'No major Clash, Harm, Break, or Punishment is dominant in the tested branch relationships. Keep decisions evidence-based rather than assuming the month is automatically easy.';
  const strategy: Record<MonthlyBaziForecast['posture'], string> = {
    Advance: 'Move the highest-value plan forward with clear limits. Favor decisive execution over scattered expansion.',
    'Build steadily': 'Use steady momentum: sequence the work, review terms, and increase commitment only after feedback is visible.',
    Consolidate: 'Strengthen what already exists. Repair weak processes, protect cash and attention, and avoid unnecessary escalation.',
    'Protect and review': 'Choose conservative pacing. Reduce exposure, keep plans reversible, and delay major commitments until the signal is clearer.',
  };

  return {
    generated_for: date.toISOString().slice(0, 10),
    solar_month_key: `${period.year.ganzhi}-${period.month.ganzhi}`,
    period_label: `${period.month.ganzhi} solar month | ${monthName}`,
    year_pillar: period.year.ganzhi,
    month_pillar: period.month.ganzhi,
    natal_pillars: natal,
    day_master: day?.stem || '',
    day_master_element: dayMasterElement,
    chart_tendency: support.tendency as MonthlyBaziForecast['chart_tendency'],
    confidence: Number(profile.birth_hour) >= 0 ? 'standard' : 'reduced',
    confidence_note: Number(profile.birth_hour) >= 0
      ? 'Birth hour included. The forecast uses all four natal pillars.'
      : 'Birth hour is unknown. The forecast uses the year, month, and day pillars, so hour-sensitive conclusions are intentionally omitted.',
    element_balance: balance,
    supportive_elements: Array.from(new Set(support.supportive)),
    caution_elements: Array.from(new Set(support.caution)),
    month_elements: periodElements,
    interactions,
    interaction_summary: interactionSummary,
    score,
    posture,
    pace,
    headline: `${posture}: ${pace.toLowerCase()} pacing for the ${period.month.ganzhi} month`,
    strategy: strategy[posture],
    areas,
    priorities: areas.filter((area) => area.score >= 54).slice(0, 2).map((area) => `${area.label}: ${area.headline}`),
    cautions: areas.filter((area) => area.score < 54).slice(0, 2).map((area) => `${area.label}: ${area.headline}`),
    disclaimer: 'This BaZi forecast is an educational planning aid. It does not guarantee outcomes and is not medical, legal, investment, or other professional advice.',
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
}

function signalColor(signal: ForecastArea['signal']): string {
  if (signal === 'Supportive') return '#2f7653';
  if (signal === 'Cautious') return '#a34b3d';
  return '#8a6a20';
}

export function monthlyBaziSubject(forecast: MonthlyBaziForecast): string {
  return `Your Monthly BaZi Forecast | ${forecast.posture} | ${forecast.period_label}`;
}

export function renderMonthlyBaziEmail(params: {
  forecast: MonthlyBaziForecast;
  manageUrl: string;
  supportEmail?: string;
}): string {
  const forecast = params.forecast;
  const interactionRows = forecast.interactions.length
    ? forecast.interactions.slice(0, 6).map((item) => `<tr>
        <td style="padding:10px 12px;border-top:1px solid #dfe9f1;font-weight:700;color:#17324d;">${escapeHtml(item.kind)}</td>
        <td style="padding:10px 12px;border-top:1px solid #dfe9f1;color:#526b82;">${escapeHtml(`${item.source} ${item.branches} ${item.target}`)}</td>
        <td style="padding:10px 12px;border-top:1px solid #dfe9f1;color:#36566f;">${escapeHtml(item.guidance)}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" style="padding:14px 12px;border-top:1px solid #dfe9f1;color:#526b82;">No major Clash, Harm, Break, or Punishment is dominant in the tested branch relationships.</td></tr>';
  const areaRows = forecast.areas.map((area) => `<tr>
      <td style="padding:16px 12px;border-top:1px solid #dfe9f1;width:24%;"><strong style="color:#17324d;">${escapeHtml(area.label)}</strong><br><span style="font-size:12px;color:${signalColor(area.signal)};font-weight:700;">${escapeHtml(`${area.signal} | ${area.score}/100`)}</span></td>
      <td style="padding:16px 12px;border-top:1px solid #dfe9f1;"><strong style="display:block;margin-bottom:5px;color:#0f4c81;">${escapeHtml(area.headline)}</strong><span style="color:#36566f;line-height:1.6;">${escapeHtml(area.guidance)}</span></td>
    </tr>`).join('');
  const supportEmail = params.supportEmail || 'hello@tengyunzi.com';

  return `<!doctype html><html><body style="margin:0;background:#edf4f9;font-family:Arial,'Noto Sans',sans-serif;color:#17324d;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(forecast.strategy)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf4f9;"><tr><td align="center" style="padding:28px 14px 40px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:700px;background:#ffffff;border:1px solid #c8d9e7;border-top:5px solid #1f7ab8;">
        <tr><td style="padding:26px 30px 22px;border-bottom:1px solid #dfe9f1;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#102e49;">Tengyunzi</td>
            <td align="right" style="font-size:11px;font-weight:700;color:#2e6d9e;text-transform:uppercase;">Personal monthly forecast</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px 30px 26px;border-bottom:1px solid #dfe9f1;">
          <div style="font-size:12px;font-weight:700;color:#2e6d9e;text-transform:uppercase;margin-bottom:12px;">${escapeHtml(forecast.period_label)}</div>
          <h1 style="font-family:Georgia,'Noto Serif',serif;font-size:34px;line-height:1.18;margin:0;color:#102e49;">${escapeHtml(forecast.headline)}</h1>
          <p style="font-size:17px;line-height:1.72;margin:16px 0 0;color:#36566f;">${escapeHtml(forecast.strategy)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;background:#eef6fc;border:1px solid #d4e4f0;"><tr>
            <td style="padding:15px 14px;text-align:center;"><span style="display:block;font-size:11px;color:#6a8094;">MONTH SCORE</span><strong style="font-size:22px;color:#0f4c81;">${forecast.score}/100</strong></td>
            <td style="padding:15px 14px;text-align:center;border-left:1px solid #d4e4f0;"><span style="display:block;font-size:11px;color:#6a8094;">POSTURE</span><strong style="font-size:16px;color:#0f4c81;">${escapeHtml(forecast.posture)}</strong></td>
            <td style="padding:15px 14px;text-align:center;border-left:1px solid #d4e4f0;"><span style="display:block;font-size:11px;color:#6a8094;">PACE</span><strong style="font-size:16px;color:#0f4c81;">${escapeHtml(forecast.pace)}</strong></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:26px 30px;border-bottom:1px solid #dfe9f1;">
          <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 14px;color:#102e49;">Chart basis</h2>
          <p style="margin:0 0 10px;line-height:1.7;color:#36566f;">Day Master: <strong>${escapeHtml(`${forecast.day_master} | ${forecast.day_master_element}`)}</strong>. Chart tendency: <strong>${escapeHtml(forecast.chart_tendency)}</strong>.</p>
          <p style="margin:0 0 10px;line-height:1.7;color:#36566f;">Supportive/useful elements: <strong>${escapeHtml(forecast.supportive_elements.join(', '))}</strong>. Elements to handle carefully: <strong>${escapeHtml(forecast.caution_elements.join(', '))}</strong>.</p>
          <p style="margin:0;line-height:1.65;color:#6a8094;font-size:13px;">${escapeHtml(forecast.confidence_note)}</p>
        </td></tr>
        <tr><td style="padding:26px 30px;border-bottom:1px solid #dfe9f1;">
          <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 8px;color:#102e49;">Annual and monthly interactions</h2>
          <p style="margin:0 0 16px;line-height:1.65;color:#526b82;">Annual pillar ${escapeHtml(forecast.year_pillar)} | Monthly pillar ${escapeHtml(forecast.month_pillar)}. ${escapeHtml(forecast.interaction_summary)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:13px;border-bottom:1px solid #dfe9f1;">${interactionRows}</table>
        </td></tr>
        <tr><td style="padding:26px 30px;border-bottom:1px solid #dfe9f1;">
          <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 10px;color:#102e49;">Four life areas</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;border-bottom:1px solid #dfe9f1;">${areaRows}</table>
        </td></tr>
        <tr><td style="padding:25px 30px 30px;">
          <p style="margin:0 0 18px;line-height:1.7;color:#526b82;">${escapeHtml(forecast.disclaimer)}</p>
          <a href="${escapeHtml(params.manageUrl)}" style="display:inline-block;background:#1f7ab8;color:#ffffff;text-decoration:none;padding:13px 18px;font-size:14px;font-weight:700;border-radius:6px;">Manage monthly forecast</a>
        </td></tr>
        <tr><td style="padding:20px 30px;background:#f7fafc;border-top:1px solid #dfe9f1;font-size:12px;line-height:1.65;color:#6a8094;">
          Questions about your membership? Email <a href="mailto:${escapeHtml(supportEmail)}" style="color:#2e6d9e;">${escapeHtml(supportEmail)}</a>.<br>
          Shenyang Haoxue Culture Media Co., Ltd. | <a href="https://www.tengyunzi.com/" style="color:#2e6d9e;">tengyunzi.com</a>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}
