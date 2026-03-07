// js/bazi.js

const TIANGAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DIZHI   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const WUXING  = {
  '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土',
  '己':'土','庚':'金','辛':'金','壬':'水','癸':'水',
  '子':'水','丑':'土','寅':'木','卯':'木','辰':'土',
  '巳':'火','午':'火','未':'土','申':'金','酉':'金',
  '戌':'土','亥':'水'
};

// 节气月份对应地支（寅月=1月节，依次类推）
// 节气数据：[month, day] 近似值（实际应查万年历，此处用近似）
const JIEQI = [
  null,           // index 0 unused
  [2, 4],         // 立春 寅月开始
  [3, 6],         // 惊蛰 卯月
  [4, 5],         // 清明 辰月
  [5, 6],         // 立夏 巳月
  [6, 6],         // 芒种 午月
  [7, 7],         // 小暑 未月
  [8, 7],         // 立秋 申月
  [9, 8],         // 白露 酉月
  [10, 8],        // 寒露 戌月
  [11, 7],        // 立冬 亥月
  [12, 7],        // 大雪 子月
  [1, 6],         // 小寒 丑月（次年）
];

// 五虎遁年起月法：年干索引 -> 寅月天干索引
const NIANGAN_TO_YINMONTH = {0:2, 1:4, 2:6, 3:8, 4:0, 5:2, 6:4, 7:6, 8:8, 9:0};

// 五鼠遁日起时法：日干索引 -> 子时天干索引
const RIGAN_TO_ZISHI = {0:0, 1:2, 2:4, 3:6, 4:8, 5:0, 6:2, 7:4, 8:6, 9:8};

/**
 * 计算年柱
 */
function getYearPillar(year) {
  const tgIdx = ((year - 4) % 10 + 10) % 10;
  const dzIdx = ((year - 4) % 12 + 12) % 12;
  return { tg: TIANGAN[tgIdx], dz: DIZHI[dzIdx], tgIdx, dzIdx };
}

/**
 * 计算月柱（按节气）
 */
function getMonthPillar(year, month, day, yearTgIdx) {
  // 确定月支索引（寅=2, 卯=3, ... 丑=1）
  let lunarMonthOffset = month - 2; // 寅月对应公历2月立春后
  // 检查是否过了当月节气
  const jieqiOfMonth = JIEQI[month === 1 ? 12 : month];
  if (jieqiOfMonth && day < jieqiOfMonth[1]) {
    lunarMonthOffset -= 1;
  }
  const monthDzIdx = ((lunarMonthOffset % 12) + 12) % 12 + 2;
  const finalDzIdx = monthDzIdx % 12;

  // 月天干：五虎遁月
  const yinMonthTgIdx = NIANGAN_TO_YINMONTH[yearTgIdx % 10];
  const tgIdx = (yinMonthTgIdx + finalDzIdx - 2 + 20) % 10;

  return { tg: TIANGAN[tgIdx], dz: DIZHI[finalDzIdx], tgIdx, dzIdx: finalDzIdx };
}

/**
 * 计算日柱（儒略日算法）
 */
function getDayPillar(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y
    + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // 基准：2000-01-07 日柱 甲子（jdn=2451551, tg=0, dz=0）
  const BASE_JDN = 2451551;
  const diff = jdn - BASE_JDN;
  const tgIdx = ((diff % 10) + 10) % 10;
  const dzIdx = ((diff % 12) + 12) % 12;
  return { tg: TIANGAN[tgIdx], dz: DIZHI[dzIdx], tgIdx, dzIdx };
}

/**
 * 计算时柱
 */
function getHourPillar(hour, dayTgIdx) {
  // 时支：子时=0（23-1时）, 丑时=1（1-3时）...
  const dzIdx = Math.floor((hour + 1) / 2) % 12;
  const ziShiTgIdx = RIGAN_TO_ZISHI[dayTgIdx % 10];
  const tgIdx = (ziShiTgIdx + dzIdx) % 10;
  return { tg: TIANGAN[tgIdx], dz: DIZHI[dzIdx], tgIdx, dzIdx };
}

/**
 * 五行统计
 */
function getWuxingCount(pillars) {
  const count = { 木:0, 火:0, 土:0, 金:0, 水:0 };
  pillars.forEach(p => {
    count[WUXING[p.tg]]++;
    count[WUXING[p.dz]]++;
  });
  return count;
}

/**
 * 主函数：输入生日，返回八字
 * @param {number} year
 * @param {number} month  1-12
 * @param {number} day
 * @param {number} hour   0-23
 * @returns {{ year, month, day, hour, wuxing }}
 */
function calculateBazi(year, month, day, hour) {
  const yearPillar  = getYearPillar(year);
  const monthPillar = getMonthPillar(year, month, day, yearPillar.tgIdx);
  const dayPillar   = getDayPillar(year, month, day);
  const hourPillar  = getHourPillar(hour, dayPillar.tgIdx);
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const wuxing = getWuxingCount(pillars);
  return { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar, wuxing };
}

// ── 大运计算 ──────────────────────────────────────────────────────

// 各月节气（节，非中气）近似日期 [月, 日]
const JIEQI_DATES = [
  [1,6],[2,4],[3,6],[4,5],[5,6],[6,6],
  [7,7],[8,7],[9,8],[10,8],[11,7],[12,7]
];

function getJieqiDate(year, month) {
  const [m, d] = JIEQI_DATES[((month - 1) % 12 + 12) % 12];
  let y = year;
  if (month > 12) { y += Math.floor((month - 1) / 12); }
  if (month < 1)  { y += Math.floor((month - 1) / 12); }
  return new Date(y, m - 1, d);
}

function daysBetween(d1, d2) {
  return Math.round(Math.abs(d2 - d1) / 86400000);
}

/**
 * 计算大运
 * @returns {{ startAge, dayuns: [{gz, tgIdx, dzIdx, ageStart, yearStart}] }}
 */
function calculateDaYun(yearPillar, monthPillar, gender, birthYear, birthMonth, birthDay) {
  // 阳男阴女顺行，阴男阳女逆行
  const yearTgYang = yearPillar.tgIdx % 2 === 0;
  const isMale     = gender === '男';
  const forward    = (isMale && yearTgYang) || (!isMale && !yearTgYang);

  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
  let days;

  if (forward) {
    // 顺推：找出生后第一个节气
    let m = birthMonth, y = birthYear;
    let jDate = getJieqiDate(y, m);
    if (jDate <= birthDate) { m++; if (m > 12) { m = 1; y++; } jDate = getJieqiDate(y, m); }
    days = daysBetween(birthDate, jDate);
  } else {
    // 逆推：找出生前第一个节气
    let m = birthMonth, y = birthYear;
    let jDate = getJieqiDate(y, m);
    if (jDate >= birthDate) { m--; if (m < 1) { m = 12; y--; } jDate = getJieqiDate(y, m); }
    days = daysBetween(jDate, birthDate);
  }

  const startAge = Math.round(days / 3);

  const dayuns = [];
  let tgIdx = monthPillar.tgIdx;
  let dzIdx = monthPillar.dzIdx;

  for (let i = 0; i < 8; i++) {
    if (forward) { tgIdx = (tgIdx + 1) % 10; dzIdx = (dzIdx + 1) % 12; }
    else         { tgIdx = (tgIdx - 1 + 10) % 10; dzIdx = (dzIdx - 1 + 12) % 12; }
    dayuns.push({
      gz: TIANGAN[tgIdx] + DIZHI[dzIdx],
      tgIdx, dzIdx,
      ageStart: startAge + i * 10,
      yearStart: birthYear + startAge + i * 10,
    });
  }

  return { forward, startAge, dayuns };
}

/**
 * 计算未来N年的特殊流年
 * 天克地冲：流年天干与日柱天干相差6位，且流年地支与日柱地支相差6位
 * 岁运并临：流年干支与当前大运干支完全相同（两个字都一样）
 */
function calcSpecialYears(bazi, dayuns, birthYear, currentYear, n) {
  const special = [];

  for (let y = currentYear; y < currentYear + n; y++) {
    const lyTgIdx = ((y - 4) % 10 + 10) % 10;
    const lyDzIdx = ((y - 4) % 12 + 12) % 12;
    const lyGz    = TIANGAN[lyTgIdx] + DIZHI[lyDzIdx];
    const reasons = [];

    // 天克地冲：流年 vs 日柱，天干差6 + 地支差6
    const tgClash = Math.abs(lyTgIdx - bazi.day.tgIdx) === 6;
    const dzClash = Math.abs(lyDzIdx - bazi.day.dzIdx) === 6;
    if (tgClash && dzClash) {
      reasons.push(`天克地冲：流年${lyGz}与日柱${bazi.day.tg}${bazi.day.dz}天干相冲、地支相冲`);
    }

    // 找该年所在大运（按年龄）
    const ageInYear = y - birthYear;
    let curDayun = null;
    for (let i = 0; i < dayuns.length; i++) {
      const nextStart = dayuns[i + 1] ? dayuns[i + 1].ageStart : 999;
      if (ageInYear >= dayuns[i].ageStart && ageInYear < nextStart) {
        curDayun = dayuns[i]; break;
      }
    }

    // 岁运并临：流年干支 = 大运干支（完全相同）
    if (curDayun && lyTgIdx === curDayun.tgIdx && lyDzIdx === curDayun.dzIdx) {
      reasons.push(`岁运并临：流年${lyGz}与大运${curDayun.gz}干支完全相同，力量加倍`);
    }

    if (reasons.length) {
      special.push({ year: y, gz: lyGz, dayun: curDayun ? curDayun.gz : '', reasons });
    }
  }
  return special;
}

// 导出（浏览器全局）
window.BaziCalc = { calculateBazi, calculateDaYun, calcSpecialYears, WUXING, TIANGAN, DIZHI };
