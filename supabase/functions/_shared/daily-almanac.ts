import lunarPackage from 'npm:lunar-javascript@1.7.7';

const { Solar } = lunarPackage as Record<string, any>;

export type AlmanacProfileInput = {
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_hour: number;
  gender?: string;
  language?: string;
};

export type AlmanacData = {
  date: string;
  display_date: string;
  weekday: string;
  lunar_date: string;
  year_ganzhi: string;
  month_ganzhi: string;
  day_ganzhi: string;
  day_stem: string;
  day_branch: string;
  day_element: string;
  zodiac: string;
  solar_term: string;
  yi: string[];
  ji: string[];
  clash: string;
  sha: string;
  wealth_direction: string;
  joy_direction: string;
  officer: string;
  tian_shen: string;
  tian_shen_luck: string;
  theme: string;
};

export type PersonalNote = {
  birth_day_stem: string;
  birth_element: string;
  birth_zodiac: string;
  relation: string;
  headline: string;
  guidance: string;
  focus: string;
  caution: string;
  zodiac_clash: boolean;
};

const STEM_ELEMENT: Record<string, string> = {
  '甲': 'Wood', '乙': 'Wood',
  '丙': 'Fire', '丁': 'Fire',
  '戊': 'Earth', '己': 'Earth',
  '庚': 'Metal', '辛': 'Metal',
  '壬': 'Water', '癸': 'Water',
};

const ELEMENT_CN: Record<string, string> = {
  Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水',
};

const GENERATES: Record<string, string> = {
  Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood',
};

const CONTROLS: Record<string, string> = {
  Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood',
};

const ELEMENT_THEME: Record<string, Record<string, string>> = {
  en: {
    Wood: 'Growth with direction', Fire: 'Visibility with restraint', Earth: 'Stability and follow-through',
    Metal: 'Standards and discernment', Water: 'Reflection and adaptability',
  },
  'zh-Hans': {
    Wood: '生长与方向', Fire: '表达与分寸', Earth: '稳定与落实', Metal: '边界与判断', Water: '观察与应变',
  },
  'zh-Hant': {
    Wood: '生長與方向', Fire: '表達與分寸', Earth: '穩定與落實', Metal: '邊界與判斷', Water: '觀察與應變',
  },
};

const ZODIAC_EN: Record<string, string> = {
  '鼠': 'Rat', '牛': 'Ox', '虎': 'Tiger', '兔': 'Rabbit', '龙': 'Dragon', '龍': 'Dragon', '蛇': 'Snake',
  '马': 'Horse', '馬': 'Horse', '羊': 'Goat', '猴': 'Monkey', '鸡': 'Rooster', '雞': 'Rooster',
  '狗': 'Dog', '猪': 'Pig', '豬': 'Pig',
};

const ACTIVITY_EN: Record<string, string> = {
  '祭祀': 'reflection and gratitude', '祈福': 'intention-setting', '求嗣': 'family planning', '开光': 'dedication rituals',
  '出行': 'travel', '解除': 'clearing obstacles', '入学': 'study and learning', '理发': 'personal care', '沐浴': 'rest and renewal',
  '会亲友': 'meeting trusted people', '求医': 'seeking professional care', '治病': 'following a care plan', '针灸': 'therapeutic care',
  '嫁娶': 'relationship commitments', '订盟': 'formal agreements', '纳采': 'relationship planning', '问名': 'important introductions',
  '交易': 'transactions', '立券': 'contracts', '纳财': 'financial organization', '开市': 'business openings', '开仓': 'inventory planning',
  '安床': 'home routines', '入宅': 'moving home', '移徙': 'relocation', '修造': 'repairs and renovation', '动土': 'groundwork',
  '上梁': 'major construction steps', '竖柱': 'structural work', '安门': 'home improvements', '拆卸': 'removal work', '破土': 'starting site work',
  '栽种': 'planting and cultivation', '纳畜': 'animal care', '牧养': 'ongoing care', '捕捉': 'focused pursuit', '畋猎': 'outdoor fieldwork',
  '赴任': 'starting official duties', '求职': 'career outreach', '上官': 'assuming responsibility', '词讼': 'legal action', '诉讼': 'legal action',
  '求财': 'financial planning', '置产': 'property decisions', '造车器': 'equipment work', '作灶': 'kitchen work', '掘井': 'infrastructure work',
  '安葬': 'memorial arrangements', '启钻': 'memorial arrangements', '除服': 'closing a mourning period', '成服': 'memorial observance',
  '扫舍': 'cleaning and reset', '塞穴': 'closing loose ends', '补垣': 'repairs', '平治道涂': 'maintenance work',
  '裁衣': 'clothing and presentation', '冠笄': 'personal milestones', '纳婿': 'family commitments', '酬神': 'gratitude practices',
  '无': 'keep the day simple', '诸事不宜': 'avoid major commitments', '余事勿取': 'keep plans light',
};

const DIRECTION_EN: Record<string, string> = {
  '东': 'East', '東': 'East', '南': 'South', '西': 'West', '北': 'North',
  '东北': 'Northeast', '東北': 'Northeast', '东南': 'Southeast', '東南': 'Southeast',
  '西北': 'Northwest', '西南': 'Southwest', '中': 'Center',
};

function invoke(target: any, name: string, fallback: any = ''): any {
  try {
    return typeof target?.[name] === 'function' ? target[name]() : fallback;
  } catch {
    return fallback;
  }
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function cleanLanguage(value: string | undefined): 'en' | 'zh-Hans' | 'zh-Hant' {
  return value === 'zh-Hans' || value === 'zh-Hant' ? value : 'en';
}

function zodiacLabel(value: string, language: string): string {
  if (language === 'en') return ZODIAC_EN[value] || value || 'Unknown';
  if (language === 'zh-Hant') return value.replace(/龙/g, '龍').replace(/马/g, '馬').replace(/鸡/g, '雞').replace(/猪/g, '豬');
  return value.replace(/龍/g, '龙').replace(/馬/g, '马').replace(/雞/g, '鸡').replace(/豬/g, '猪');
}

function directionLabel(value: string, language: string): string {
  if (language !== 'en') return value || '未标明';
  return DIRECTION_EN[value] || value || 'Not specified';
}

function activityLabels(values: string[], language: string): string[] {
  const unique = [...new Set(values)].slice(0, 6);
  if (language !== 'en') return unique;
  const translated = unique.map((item) => ACTIVITY_EN[item]).filter(Boolean);
  return translated.length ? translated : ['keep plans measured'];
}

function dateParts(date: Date): { year: number; month: number; day: number } {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function localDateParts(now: Date, timezone: string): { year: number; month: number; day: number; hour: number; date: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  return { year, month, day, hour, date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

export function buildDailyAlmanac(date: Date, languageRaw = 'en'): AlmanacData {
  const language = cleanLanguage(languageRaw);
  const { year, month, day } = dateParts(date);
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();
  const dayStem = String(invoke(lunar, 'getDayGan', '') || invoke(lunar, 'getDayGanExact2', ''));
  const dayElement = STEM_ELEMENT[dayStem] || 'Earth';
  const dateValue = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const displayDate = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', {
    timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);
  const weekday = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', {
    timeZone: 'UTC', weekday: 'long',
  }).format(date);
  const rawZodiac = String(invoke(lunar, 'getYearShengXiao', ''));

  return {
    date: dateValue,
    display_date: displayDate,
    weekday,
    lunar_date: String(invoke(lunar, 'toString', '')),
    year_ganzhi: String(invoke(lunar, 'getYearInGanZhiByLiChun', '') || invoke(lunar, 'getYearInGanZhi', '')),
    month_ganzhi: String(invoke(lunar, 'getMonthInGanZhi', '')),
    day_ganzhi: String(invoke(lunar, 'getDayInGanZhi', '')),
    day_stem: dayStem,
    day_branch: String(invoke(lunar, 'getDayZhi', '')),
    day_element: language === 'en' ? dayElement : ELEMENT_CN[dayElement],
    zodiac: zodiacLabel(rawZodiac, language),
    solar_term: String(invoke(lunar, 'getJieQi', '')),
    yi: activityLabels(asArray(invoke(lunar, 'getDayYi', [])), language),
    ji: activityLabels(asArray(invoke(lunar, 'getDayJi', [])), language),
    clash: zodiacLabel(String(invoke(lunar, 'getDayChongShengXiao', '')), language),
    sha: directionLabel(String(invoke(lunar, 'getDaySha', '')), language),
    wealth_direction: directionLabel(String(invoke(lunar, 'getDayPositionCaiDesc', '')), language),
    joy_direction: directionLabel(String(invoke(lunar, 'getDayPositionXiDesc', '')), language),
    officer: String(invoke(lunar, 'getZhiXing', '')),
    tian_shen: String(invoke(lunar, 'getDayTianShen', '')),
    tian_shen_luck: String(invoke(lunar, 'getDayTianShenLuck', '')),
    theme: ELEMENT_THEME[language][dayElement],
  };
}

function relationOf(birthElement: string, dayElement: string): string {
  if (birthElement === dayElement) return 'echo';
  if (GENERATES[dayElement] === birthElement) return 'support';
  if (GENERATES[birthElement] === dayElement) return 'output';
  if (CONTROLS[dayElement] === birthElement) return 'pressure';
  if (CONTROLS[birthElement] === dayElement) return 'resource';
  return 'neutral';
}

export function buildPersonalNote(profile: AlmanacProfileInput, almanac: AlmanacData): PersonalNote {
  const language = cleanLanguage(profile.language);
  const birthHour = Number(profile.birth_hour) >= 0 ? Number(profile.birth_hour) : 12;
  const birthSolar = Solar.fromYmdHms(
    Number(profile.birth_year), Number(profile.birth_month), Number(profile.birth_day), birthHour, 0, 0,
  );
  const birthLunar = birthSolar.getLunar();
  const birthDayStem = String(invoke(birthLunar, 'getDayGanExact2', '') || invoke(birthLunar, 'getDayGan', ''));
  const birthElement = STEM_ELEMENT[birthDayStem] || 'Earth';
  const birthZodiacRaw = String(invoke(birthLunar, 'getYearShengXiao', ''));
  const dayElementEn = STEM_ELEMENT[almanac.day_stem] || 'Earth';
  const relation = relationOf(birthElement, dayElementEn);
  const zodiacClash = Boolean(birthZodiacRaw && zodiacLabel(birthZodiacRaw, language) === almanac.clash);

  const EN: Record<string, [string, string, string, string]> = {
    echo: ['Your natural element is amplified today.', 'Use familiar strengths deliberately rather than automatically.', 'Choose one priority and deepen it.', 'Watch repetition, stubbornness, or overconfidence.'],
    support: ['The day can feel more supportive than demanding.', 'Receive information, help, and recovery before pushing for output.', 'Learning, preparation, and asking a precise question.', 'Do not confuse support with a guarantee.'],
    output: ['Today favors expression and visible progress.', 'Turn what you know into a draft, conversation, or concrete next step.', 'Writing, presenting, making, and completing.', 'Avoid scattering your attention across too many outputs.'],
    pressure: ['The day may feel structured or demanding.', 'Reduce unnecessary commitments and respond to facts before emotion.', 'Boundaries, sequencing, and calm execution.', 'Avoid forcing a decision simply to end uncertainty.'],
    resource: ['Ownership and practical choices come into focus.', 'Use the day to organize resources, terms, and responsibilities.', 'Money boundaries, negotiation, and useful administration.', 'Separate opportunity from urgency.'],
    neutral: ['Use the day as context, not a command.', 'Notice what becomes easier and what asks for more patience.', 'One measured action based on present evidence.', 'Avoid reading ordinary friction as a fixed prediction.'],
  };
  const ZH_HANS: Record<string, [string, string, string, string]> = {
    echo: ['今天与你的本命元素同气。', '有利于发挥熟悉优势，但要避免惯性用力。', '选一件重要的事做深。', '留意固执、重复和过度自信。'],
    support: ['今天更偏向获得支持与补充。', '先接收信息、帮助与恢复，再追求产出。', '学习、准备和提出清楚的问题。', '支持不等于结果保证。'],
    output: ['今天适合表达与推进可见成果。', '把想法变成草稿、对话或一个具体步骤。', '写作、发布、沟通与完成。', '避免同时铺开太多事情。'],
    pressure: ['今天可能更有规则感或压力感。', '减少不必要承诺，先看事实再回应情绪。', '边界、排序与稳步执行。', '不要为了结束不确定而强行决定。'],
    resource: ['今天更容易关注资源与掌控感。', '适合整理预算、条件、责任和现实安排。', '金钱边界、协商与行政整理。', '把机会感与紧迫感分开。'],
    neutral: ['把今天当作参考，而不是命令。', '观察什么更顺、什么需要更多耐心。', '依据现实证据做一个适度行动。', '不要把日常阻力解释成固定预言。'],
  };
  const ZH_HANT: Record<string, [string, string, string, string]> = {
    echo: ['今天與你的本命元素同氣。', '有利於發揮熟悉優勢，但要避免慣性用力。', '選一件重要的事做深。', '留意固執、重複和過度自信。'],
    support: ['今天更偏向獲得支持與補充。', '先接收資訊、幫助與恢復，再追求產出。', '學習、準備和提出清楚的問題。', '支持不等於結果保證。'],
    output: ['今天適合表達與推進可見成果。', '把想法變成草稿、對話或一個具體步驟。', '寫作、發布、溝通與完成。', '避免同時鋪開太多事情。'],
    pressure: ['今天可能更有規則感或壓力感。', '減少不必要承諾，先看事實再回應情緒。', '邊界、排序與穩步執行。', '不要為了結束不確定而強行決定。'],
    resource: ['今天更容易關注資源與掌控感。', '適合整理預算、條件、責任和現實安排。', '金錢邊界、協商與行政整理。', '把機會感與緊迫感分開。'],
    neutral: ['把今天當作參考，而不是命令。', '觀察什麼更順、什麼需要更多耐心。', '依據現實證據做一個適度行動。', '不要把日常阻力解釋成固定預言。'],
  };
  const copy = language === 'en' ? EN[relation] : (language === 'zh-Hant' ? ZH_HANT[relation] : ZH_HANS[relation]);
  const clashSuffix = zodiacClash
    ? (language === 'en'
      ? ' Your birth-year animal is the day clash, so leave extra room around travel, timing, and reactive conversations.'
      : (language === 'zh-Hant'
        ? ' 你的出生生肖逢今日相沖，出行、時間安排與容易起反應的對話宜多留餘地。'
        : ' 你的出生生肖逢今日相冲，出行、时间安排与容易起反应的对话宜多留余地。'))
    : '';

  return {
    birth_day_stem: birthDayStem,
    birth_element: language === 'en' ? birthElement : ELEMENT_CN[birthElement],
    birth_zodiac: zodiacLabel(birthZodiacRaw, language),
    relation,
    headline: copy[0],
    guidance: `${copy[1]}${clashSuffix}`,
    focus: copy[2],
    caution: copy[3],
    zodiac_clash: zodiacClash,
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
}

function activityList(items: string[]): string {
  return items.slice(0, 4).map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`).join('');
}

export function dailyAlmanacSubject(almanac: AlmanacData, languageRaw = 'en'): string {
  const language = cleanLanguage(languageRaw);
  if (language === 'zh-Hans') return `滕云子每日黄历｜${almanac.display_date} · ${almanac.day_ganzhi}日`;
  if (language === 'zh-Hant') return `滕雲子每日黃曆｜${almanac.display_date} · ${almanac.day_ganzhi}日`;
  return `Your Daily Almanac | ${almanac.display_date} · ${almanac.day_ganzhi} Day`;
}

export function renderDailyAlmanacEmail(params: {
  almanac: AlmanacData;
  personal: PersonalNote;
  language: string;
  manageUrl: string;
  unsubscribeUrl: string;
}): string {
  const { almanac, personal } = params;
  const language = cleanLanguage(params.language);
  const isEn = language === 'en';
  const labels = isEn ? {
    brand: 'Tengyunzi Daily Almanac', today: "Today's calendar", personal: 'Your personal timing note',
    focus: 'Use the day for', caution: 'Move carefully around', yi: 'Supportive activities', ji: 'Keep measured',
    lunar: 'Lunar date', pillars: 'Date pillars', term: 'Solar term', clash: 'Day clash', wealth: 'Wealth direction', joy: 'Joy direction',
    none: 'None today', manage: 'Manage daily reminders', unsubscribe: 'Unsubscribe from Tengyunzi emails',
    disclaimer: 'Use this as a reflective planning prompt, not a guarantee or substitute for professional advice.',
  } : {
    brand: language === 'zh-Hant' ? '滕雲子每日黃曆' : '滕云子每日黄历',
    today: language === 'zh-Hant' ? '今日曆法' : '今日历法',
    personal: language === 'zh-Hant' ? '你的個人節奏提醒' : '你的个人节奏提醒',
    focus: language === 'zh-Hant' ? '今日可用於' : '今日可用于',
    caution: language === 'zh-Hant' ? '今日需留意' : '今日需留意',
    yi: '宜', ji: '忌', lunar: '農曆', pillars: '年月日柱', term: '節氣', clash: '日沖', wealth: '財神方位', joy: '喜神方位',
    none: '今日無', manage: language === 'zh-Hant' ? '管理每日提醒' : '管理每日提醒',
    unsubscribe: language === 'zh-Hant' ? '退訂滕雲子郵件' : '退订滕云子邮件',
    disclaimer: language === 'zh-Hant'
      ? '請把內容作為自我觀察與規劃參考，不是結果保證，也不能替代專業建議。'
      : '请把内容作为自我观察与规划参考，不是结果保证，也不能替代专业建议。',
  };

  return `<!doctype html><html><body style="margin:0;background:#f2f7fb;font-family:Arial,'Noto Sans',sans-serif;color:#17324d;">
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(personal.headline)} ${escapeHtml(almanac.theme)}</div>
    <div style="max-width:660px;margin:0 auto;padding:28px 16px 40px;">
      <div style="background:#ffffff;border:1px solid #c9d8e6;border-top:5px solid #1f7ab8;">
        <div style="padding:28px 28px 22px;border-bottom:1px solid #dfe9f1;">
          <div style="font-size:13px;font-weight:700;color:#1f7ab8;margin-bottom:12px;">${escapeHtml(labels.brand)}</div>
          <h1 style="font-family:Georgia,'Noto Serif',serif;font-size:32px;line-height:1.18;margin:0;color:#102e49;">${escapeHtml(almanac.display_date)}</h1>
          <p style="margin:10px 0 0;color:#526b82;line-height:1.6;">${escapeHtml(almanac.weekday)} · ${escapeHtml(almanac.day_ganzhi)} · ${escapeHtml(almanac.theme)}</p>
        </div>
        <div style="padding:26px 28px;border-bottom:1px solid #dfe9f1;">
          <h2 style="font-family:Georgia,'Noto Serif',serif;font-size:22px;margin:0 0 12px;color:#102e49;">${escapeHtml(labels.personal)}</h2>
          <p style="font-size:18px;font-weight:700;line-height:1.5;margin:0 0 10px;color:#0f4c81;">${escapeHtml(personal.headline)}</p>
          <p style="line-height:1.75;margin:0;color:#36566f;">${escapeHtml(personal.guidance)}</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:18px;">
            <tr><td style="width:42%;padding:10px 12px;background:#eef6fc;font-weight:700;color:#0f4c81;">${escapeHtml(labels.focus)}</td><td style="padding:10px 12px;background:#f8fbfe;">${escapeHtml(personal.focus)}</td></tr>
            <tr><td style="padding:10px 12px;background:#eef6fc;font-weight:700;color:#0f4c81;">${escapeHtml(labels.caution)}</td><td style="padding:10px 12px;background:#f8fbfe;">${escapeHtml(personal.caution)}</td></tr>
          </table>
        </div>
        <div style="padding:26px 28px;border-bottom:1px solid #dfe9f1;">
          <h2 style="font-family:Georgia,'Noto Serif',serif;font-size:22px;margin:0 0 18px;color:#102e49;">${escapeHtml(labels.today)}</h2>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5;">
            <tr><td style="padding:9px 0;color:#6a8094;width:38%;">${escapeHtml(labels.lunar)}</td><td style="padding:9px 0;font-weight:700;">${escapeHtml(almanac.lunar_date)}</td></tr>
            <tr><td style="padding:9px 0;color:#6a8094;">${escapeHtml(labels.pillars)}</td><td style="padding:9px 0;font-weight:700;">${escapeHtml(`${almanac.year_ganzhi} · ${almanac.month_ganzhi} · ${almanac.day_ganzhi}`)}</td></tr>
            <tr><td style="padding:9px 0;color:#6a8094;">${escapeHtml(labels.term)}</td><td style="padding:9px 0;font-weight:700;">${escapeHtml(almanac.solar_term || labels.none)}</td></tr>
            <tr><td style="padding:9px 0;color:#6a8094;">${escapeHtml(labels.clash)}</td><td style="padding:9px 0;font-weight:700;">${escapeHtml(`${almanac.clash}${almanac.sha ? ` · ${almanac.sha}` : ''}`)}</td></tr>
            <tr><td style="padding:9px 0;color:#6a8094;">${escapeHtml(labels.wealth)}</td><td style="padding:9px 0;font-weight:700;">${escapeHtml(almanac.wealth_direction)}</td></tr>
            <tr><td style="padding:9px 0;color:#6a8094;">${escapeHtml(labels.joy)}</td><td style="padding:9px 0;font-weight:700;">${escapeHtml(almanac.joy_direction)}</td></tr>
          </table>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
          <div style="padding:24px 28px;border-right:1px solid #dfe9f1;">
            <h3 style="font-size:16px;margin:0 0 12px;color:#3c8660;">${escapeHtml(labels.yi)}</h3>
            <ul style="padding-left:18px;margin:0;line-height:1.55;color:#36566f;">${activityList(almanac.yi)}</ul>
          </div>
          <div style="padding:24px 28px;">
            <h3 style="font-size:16px;margin:0 0 12px;color:#bd604d;">${escapeHtml(labels.ji)}</h3>
            <ul style="padding-left:18px;margin:0;line-height:1.55;color:#36566f;">${activityList(almanac.ji)}</ul>
          </div>
        </div>
      </div>
      <p style="font-size:12px;line-height:1.65;color:#6a8094;text-align:center;margin:18px 16px 0;">${escapeHtml(labels.disclaimer)}</p>
      <p style="font-size:12px;line-height:1.65;text-align:center;margin:10px 0 0;"><a style="color:#2e6d9e;" href="${escapeHtml(params.manageUrl)}">${escapeHtml(labels.manage)}</a> · <a style="color:#2e6d9e;" href="${escapeHtml(params.unsubscribeUrl)}">${escapeHtml(labels.unsubscribe)}</a></p>
    </div>
  </body></html>`;
}
