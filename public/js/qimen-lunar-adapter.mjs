const STEM_MAP = Object.freeze({
  '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu',
  '己': 'Ji', '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui',
});

const BRANCH_MAP = Object.freeze({
  '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si',
  '午': 'Wu', '未': 'Wei', '申': 'Shen', '酉': 'You', '戌': 'Xu', '亥': 'Hai',
});

const SOLAR_TERM_MAP = Object.freeze({
  '冬至': 'winter-solstice',
  '小寒': 'minor-cold',
  '大寒': 'major-cold',
  '立春': 'start-of-spring',
  '雨水': 'rain-water',
  '惊蛰': 'awakening-of-insects',
  '驚蟄': 'awakening-of-insects',
  '春分': 'spring-equinox',
  '清明': 'pure-brightness',
  '谷雨': 'grain-rain',
  '穀雨': 'grain-rain',
  '立夏': 'start-of-summer',
  '小满': 'grain-buds',
  '小滿': 'grain-buds',
  '芒种': 'grain-in-ear',
  '芒種': 'grain-in-ear',
  '夏至': 'summer-solstice',
  '小暑': 'minor-heat',
  '大暑': 'major-heat',
  '立秋': 'start-of-autumn',
  '处暑': 'limit-of-heat',
  '處暑': 'limit-of-heat',
  '白露': 'white-dew',
  '秋分': 'autumn-equinox',
  '寒露': 'cold-dew',
  '霜降': 'frost-descent',
  '立冬': 'start-of-winter',
  '小雪': 'minor-snow',
  '大雪': 'major-snow',
});

function parsePillar(value) {
  if (typeof value !== 'string' || value.length < 2) throw new Error('The calendar library returned an invalid pillar.');
  const stem = STEM_MAP[value[0]];
  const branch = BRANCH_MAP[value[1]];
  if (!stem || !branch) throw new Error('The calendar library returned an unsupported stem or branch.');
  return { stem, branch };
}

function buildCalendarFacts(SolarConstructor, input) {
  if (!SolarConstructor?.fromYmdHms) throw new Error('The precision calendar library is not available.');
  const year = Number(input?.year);
  const month = Number(input?.month);
  const day = Number(input?.day);
  const hour = Number(input?.hour);
  const minute = Number(input?.minute ?? 0);
  if (![year, month, day, hour, minute].every(Number.isFinite)) throw new Error('Enter a complete date and time.');

  const solar = SolarConstructor.fromYmdHms(year, month, day, hour, minute, 0);
  if (
    solar.getYear() !== year
    || solar.getMonth() !== month
    || solar.getDay() !== day
    || solar.getHour() !== hour
    || solar.getMinute() !== minute
  ) {
    throw new Error('The date or time is outside the supported calendar range.');
  }

  const lunar = solar.getLunar();
  const previousTerm = lunar.getPrevJieQi(false);
  if (!previousTerm) throw new Error('The preceding solar-term boundary could not be calculated.');
  const solarTermId = SOLAR_TERM_MAP[previousTerm.getName()];
  if (!solarTermId) throw new Error('The current solar term is not mapped for this chart method.');
  const daysSinceSolarTerm = solar.getJulianDay() - previousTerm.getSolar().getJulianDay();

  return {
    civilDateTime: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    yearPillar: parsePillar(lunar.getYearInGanZhiExact()),
    monthPillar: parsePillar(lunar.getMonthInGanZhiExact()),
    dayPillar: parsePillar(lunar.getDayInGanZhiExact()),
    timePillar: parsePillar(lunar.getTimeInGanZhi()),
    solarTermId,
    solarTermBoundary: previousTerm.getSolar().toYmdHms(),
    daysSinceSolarTerm,
  };
}

export { BRANCH_MAP, SOLAR_TERM_MAP, STEM_MAP, buildCalendarFacts, parsePillar };
