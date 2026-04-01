// js/bazi-quant-engine.js
// 八字量化投资引擎 - 依赖 bazi.js (BaziCalc)

(function(global) {

  const { TIANGAN, DIZHI, WUXING, calculateBazi, calculateDaYun, RIGAN_TO_ZISHI } = global.BaziCalc;

  // ── 五行生克 ──────────────────────────────────────────────────────

  const WX_ORDER = ['木','火','土','金','水'];

  function wxIdx(wx) { return WX_ORDER.indexOf(wx); }
  function wxGenerates(a, b) { return (wxIdx(a) + 1) % 5 === wxIdx(b); } // a生b
  function wxControls(a, b) { return (wxIdx(a) + 2) % 5 === wxIdx(b); }  // a克b

  // 阴阳：天干 甲丙戊庚壬=阳(偶数索引), 乙丁己辛癸=阴
  // 地支 子寅辰午申戌=阳, 丑卯巳未酉亥=阴
  const DIZHI_YANG = [true,false,true,false,true,false,true,false,true,false,true,false]; // 子丑寅...

  function isYang(char) {
    const tgIdx = TIANGAN.indexOf(char);
    if (tgIdx >= 0) return tgIdx % 2 === 0;
    const dzIdx = DIZHI.indexOf(char);
    if (dzIdx >= 0) return DIZHI_YANG[dzIdx];
    return true;
  }

  // ── 十神 ──────────────────────────────────────────────────────────

  const SHISHEN_NAMES = {
    比肩: '比肩', 劫财: '劫财',
    食神: '食神', 伤官: '伤官',
    正财: '正财', 偏财: '偏财',
    正官: '正官', 七杀: '七杀',
    正印: '正印', 偏印: '偏印',
  };

  function getShiShen(dayTg, char) {
    const dayWx  = WUXING[dayTg];
    const charWx = WUXING[char];
    if (!charWx) return '—';

    const dayY  = isYang(dayTg);
    const charY = isYang(char);
    const same  = dayY === charY;

    if (charWx === dayWx)              return same ? '比肩' : '劫财';
    if (wxGenerates(dayWx, charWx))    return same ? '食神' : '伤官';
    if (wxControls(dayWx, charWx))     return same ? '偏财' : '正财';
    if (wxControls(charWx, dayWx))     return same ? '七杀' : '正官';
    if (wxGenerates(charWx, dayWx))    return same ? '偏印' : '正印';
    return '—';
  }

  // ── 命局强弱评分 ──────────────────────────────────────────────────

  /*
   * 计分规则：
   * - 月令：比劫 OR 印星 → 40分
   * - 其余位置：只有比劫 → 按权重计分；印星不计分
   */
  const PILLAR_WEIGHTS = {
    year_tg: 8, year_dz: 4,
    month_tg: 12, month_dz: 40,   // 月令
    day_dz: 12,
    hour_tg: 12, hour_dz: 12,
  };

  function calcStrengthScore(bazi) {
    const dayTg = bazi.day.tg;
    let score = 0;

    const entries = [
      { char: bazi.year.tg,   key: 'year_tg'   },
      { char: bazi.year.dz,   key: 'year_dz'   },
      { char: bazi.month.tg,  key: 'month_tg'  },
      { char: bazi.month.dz,  key: 'month_dz'  },
      { char: bazi.day.dz,    key: 'day_dz'    },
      { char: bazi.hour.tg,   key: 'hour_tg'   },
      { char: bazi.hour.dz,   key: 'hour_dz'   },
    ];

    for (const { char, key } of entries) {
      const ss = getShiShen(dayTg, char);
      const w  = PILLAR_WEIGHTS[key];
      if (key === 'month_dz') {
        // 月令：比劫 OR 印星 均计40分
        if (['比肩','劫财','正印','偏印'].includes(ss)) score += w;
      } else {
        // 其余：只有比劫计分
        if (['比肩','劫财'].includes(ss)) score += w;
      }
    }
    return score;
  }

  // ── 喜用神 ────────────────────────────────────────────────────────

  function getXiYong(score, dayTg) {
    const dayWx = WUXING[dayTg];
    const idx = wxIdx(dayWx);
    // 生我 (印) 和 同我 (比劫) 的五行
    const yinWx  = WX_ORDER[(idx + 4) % 5]; // 生我者
    const biWx   = dayWx;                    // 同我者
    // 我克 (财) 和 克我 (官杀) 的五行
    const caiWx  = WX_ORDER[(idx + 2) % 5]; // 我克
    const guanWx = WX_ORDER[(idx + 3) % 5]; // 克我

    if (score > 60) {
      return {
        strength: '身强',
        label: `得分 ${score}，日主旺盛`,
        xiYongWx: [caiWx, guanWx],
        jiShen: [yinWx, biWx],
        investStyle: '可主动取财',
        detail: `喜用：${caiWx}（财）、${guanWx}（官杀）`,
      };
    } else if (score < 40) {
      return {
        strength: '身弱',
        label: `得分 ${score}，日主偏弱`,
        xiYongWx: [yinWx, biWx],
        jiShen: [caiWx, guanWx],
        investStyle: '需借力，适合稳健',
        detail: `喜用：${yinWx}（印）、${biWx}（比劫）`,
      };
    } else {
      return {
        strength: '中和',
        label: `得分 ${score}，日主中和`,
        xiYongWx: [caiWx, guanWx, yinWx],
        jiShen: [],
        investStyle: '均衡配置',
        detail: `中和命格，以月令喜忌为参考`,
      };
    }
  }

  // ── 财星分析 ──────────────────────────────────────────────────────

  function analyzeCaiXing(bazi) {
    const dayTg = bazi.day.tg;
    const chars = [
      bazi.year.tg, bazi.year.dz,
      bazi.month.tg, bazi.month.dz,
      bazi.day.dz,
      bazi.hour.tg, bazi.hour.dz,
    ];

    let zhengCai = 0, pianCai = 0;
    for (const c of chars) {
      const ss = getShiShen(dayTg, c);
      if (ss === '正财') zhengCai++;
      if (ss === '偏财') pianCai++;
    }

    let style, holdPeriod, stockType;
    if (zhengCai === 0 && pianCai === 0) {
      style = '无财星，看官杀';
      holdPeriod = '长线为主';
      stockType = '高股息防御型';
    } else if (zhengCai > pianCai) {
      style = `正财为主（正财×${zhengCai} 偏财×${pianCai}）`;
      holdPeriod = '长线持有';
      stockType = '高股息 / 价值股';
    } else if (pianCai > zhengCai) {
      style = `偏财为主（偏财×${pianCai} 正财×${zhengCai}）`;
      holdPeriod = '中短线博弈';
      stockType = '成长股 / 周期股';
    } else {
      style = `正偏财均衡（各×${zhengCai}）`;
      holdPeriod = '核心+卫星组合';
      stockType = '价值股底仓 + 成长股卫星';
    }

    return { zhengCai, pianCai, style, holdPeriod, stockType };
  }

  // ── 当前大运 ──────────────────────────────────────────────────────

  function getCurrentDaYun(dayuns, birthYear) {
    const currentAge = new Date().getFullYear() - birthYear;
    for (let i = 0; i < dayuns.length; i++) {
      const nextStart = dayuns[i+1] ? dayuns[i+1].ageStart : 999;
      if (currentAge >= dayuns[i].ageStart && currentAge < nextStart) {
        return { ...dayuns[i], remainYears: nextStart - currentAge };
      }
    }
    return null;
  }

  // ── 今日流年/流月/流日 ────────────────────────────────────────────

  function getTodayPillars() {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;
    const day   = now.getDate();

    const liuNian = { tg: TIANGAN[((year-4)%10+10)%10], dz: DIZHI[((year-4)%12+12)%12] };

    // 流月（月柱）
    const yearTgIdx = ((year-4)%10+10)%10;
    const NIANGAN_TO_YINMONTH = {0:2,1:4,2:6,3:8,4:0,5:2,6:4,7:6,8:8,9:0};
    const JIEQI_DAY = [6,4,6,5,6,6,7,7,8,8,7,7]; // 各月节气近似日
    let lunarOff = month - 2;
    if (day < JIEQI_DAY[month-1]) lunarOff--;
    const monthDzIdx = (((lunarOff % 12) + 12) % 12 + 2) % 12;
    const yinTgIdx   = NIANGAN_TO_YINMONTH[yearTgIdx % 10];
    const monthTgIdx = (yinTgIdx + monthDzIdx - 2 + 20) % 10;
    const liuYue = { tg: TIANGAN[monthTgIdx], dz: DIZHI[monthDzIdx] };

    // 流日
    const a   = Math.floor((14 - month) / 12);
    const y2  = year + 4800 - a;
    const m2  = month + 12*a - 3;
    const jdn = day + Math.floor((153*m2+2)/5) + 365*y2
              + Math.floor(y2/4) - Math.floor(y2/100) + Math.floor(y2/400) - 32045;
    const BASE = 2451551;
    const diff = jdn - BASE;
    const liuRi = {
      tg: TIANGAN[((diff%10)+10)%10],
      dz: DIZHI[((diff%12)+12)%12],
      tgIdx: ((diff%10)+10)%10
    };

    return { liuNian, liuYue, liuRi, today: `${year}年${month}月${day}日` };
  }

  // ── 流时天干（日上起时法）─────────────────────────────────────────
  // 巳时=09:30-11:00, 午时=11:00-13:00, 未时=13:00-15:00

  function getTimeStems(dayTgIdx) {
    const RIGAN_TO_ZISHI = {0:0,1:2,2:4,3:6,4:8,5:0,6:2,7:4,8:6,9:8};
    const ziIdx = RIGAN_TO_ZISHI[dayTgIdx % 10];
    return {
      si:  TIANGAN[(ziIdx + 5) % 10],  // 巳时（第6时辰）
      wu:  TIANGAN[(ziIdx + 6) % 10],  // 午时
      wei: TIANGAN[(ziIdx + 7) % 10],  // 未时
    };
  }

  // ── 单字喜忌评判 ──────────────────────────────────────────────────

  function evalChar(char, dayTg, xiYongWx, jiShenWx) {
    const ss = getShiShen(dayTg, char);
    const wx = WUXING[char];
    const isXi = xiYongWx.includes(wx);
    const isJi = jiShenWx.includes(wx);
    return {
      char, ss, wx,
      signal: isXi ? '喜用' : (isJi ? '忌神' : '中性'),
      score:  isXi ? 10 : (isJi ? -10 : 0),
    };
  }

  // ── 综合时机评分 ──────────────────────────────────────────────────

  function calcTimingScore(dayuns, birthYear, dayTg, xiYongWx, jiShenWx, birthData) {
    const pillars = getTodayPillars();
    const curDaYun = getCurrentDaYun(dayuns, birthYear);
    const timeStems = getTimeStems(pillars.liuRi.tgIdx);

    function periodScore(tg, dz) {
      const t = evalChar(tg, dayTg, xiYongWx, jiShenWx);
      const d = evalChar(dz, dayTg, xiYongWx, jiShenWx);
      return { tg: t, dz: d, net: t.score + d.score };
    }

    const dyScore = curDaYun
      ? periodScore(TIANGAN[curDaYun.tgIdx], DIZHI[curDaYun.dzIdx])
      : { tg: { score:0,signal:'—' }, dz: { score:0,signal:'—' }, net: 0 };

    const lnScore  = periodScore(pillars.liuNian.tg, pillars.liuNian.dz);
    const lyScore  = periodScore(pillars.liuYue.tg,  pillars.liuYue.dz);
    const lrScore  = periodScore(pillars.liuRi.tg,   pillars.liuRi.dz);

    // 流时：只评天干（地支有触发才参考，此处只用天干）
    const siEval  = evalChar(timeStems.si,  dayTg, xiYongWx, jiShenWx);
    const wuEval  = evalChar(timeStems.wu,  dayTg, xiYongWx, jiShenWx);
    const weiEval = evalChar(timeStems.wei, dayTg, xiYongWx, jiShenWx);

    // 归一化：每周期净分范围 -20~+20 → 0~100
    function normalize(net) { return Math.round(((net + 20) / 40) * 100); }

    const dyNorm  = normalize(dyScore.net);
    const lnNorm  = normalize(lnScore.net);
    const lyNorm  = normalize(lyScore.net);
    const lrNorm  = normalize(lrScore.net);
    const siNorm  = normalize(siEval.score  * 2); // 单字×2 对齐双字
    const wuNorm  = normalize(wuEval.score  * 2);
    const weiNorm = normalize(weiEval.score * 2);

    const composite = Math.round(
      dyNorm  * 0.35 +
      lnNorm  * 0.45 +
      lyNorm  * 0.15 +
      lrNorm  * 0.04 +
      ((siNorm + wuNorm + weiNorm) / 3) * 0.01
    );

    return {
      pillars, curDaYun, timeStems,
      dyScore, lnScore, lyScore, lrScore,
      siEval, wuEval, weiEval,
      composite,
      action: composite >= 70 ? '建仓/加仓'
            : composite >= 50 ? '轻仓观望'
            : composite >= 30 ? '持仓不动'
            : '减仓/清仓',
    };
  }

  // ── 行业推荐 ──────────────────────────────────────────────────────

  const INDUSTRY_MAP = {
    '木': {
      阳: ['农林牧渔（种植/林/牧）', '纺织服装', '轻工制造', '医药生物（制药/中药）', '电力设备（光伏/风电/储能）'],
      阴: ['医疗服务/CXO', '环保服务'],
    },
    '火': {
      阳: ['煤炭', '石油石化（上游开采）', '公用事业（电力/燃气）'],
      阴: ['计算机软件/AI/云计算', '传媒/游戏/内容'],
    },
    '土': {
      阳: ['食品饮料（白酒/食品）', '基础化工', '建筑材料', '建筑装饰（施工）', '房地产（开发）'],
      阴: ['社会服务（酒店/餐饮）', '物业管理'],
    },
    '金': {
      阳: ['钢铁', '有色金属', '机械设备', '家用电器', '电子（芯片/元器件）', '国防军工'],
      阴: ['银行', '保险', '证券（非银金融）'],
    },
    '水': {
      阳: ['交通运输（港口/航运）', '渔业/水产'],
      阴: ['商贸零售', '通信运营商', '美容护理'],
    },
  };

  function getIndustryRec(xiYongWx, dayTg) {
    const dayYang = isYang(dayTg);
    const recs = [];
    for (const wx of xiYongWx) {
      const map = INDUSTRY_MAP[wx];
      if (!map) continue;
      // 日主阳 → 偏向阳性行业，阴 → 偏向阴性行业
      const primary   = dayYang ? map['阳'] : map['阴'];
      const secondary = dayYang ? map['阴'] : map['阳'];
      recs.push({
        wx,
        primary:   { label: dayYang ? '阳（有实体）' : '阴（无实体）', list: primary },
        secondary: { label: dayYang ? '阴（无实体）' : '阳（有实体）', list: secondary },
      });
    }
    return recs;
  }

  // ── 清仓信号检测 ──────────────────────────────────────────────────

  function checkExitSignal(timing, strengthScore, dayTg) {
    const { lnScore } = timing;
    const { tg: lnTg, dz: lnDz } = timing.pillars.liuNian;
    const dayTgSS_ln_tg = getShiShen(dayTg, lnTg);
    const dayTgSS_ln_dz = getShiShen(dayTg, lnDz);

    const signals = [];

    if (strengthScore > 60) {
      // 身强：遇比肩劫财 → 清仓
      if (['比肩','劫财'].includes(dayTgSS_ln_tg) || ['比肩','劫财'].includes(dayTgSS_ln_dz)) {
        signals.push({ level: '清仓', reason: `身强遇比肩/劫财（流年${lnTg}${lnDz}），财运被劫，建议清仓锁利` });
      }
    } else if (strengthScore < 40) {
      // 身弱：遇食伤官杀 → 清仓/减仓
      if (['食神','伤官'].includes(dayTgSS_ln_tg) || ['食神','伤官'].includes(dayTgSS_ln_dz)) {
        signals.push({ level: '减仓', reason: `身弱遇食伤（流年${lnTg}${lnDz}），泄气，建议减仓50%` });
      }
      if (['正官','七杀'].includes(dayTgSS_ln_tg) || ['正官','七杀'].includes(dayTgSS_ln_dz)) {
        signals.push({ level: '清仓', reason: `身弱遇官杀（流年${lnTg}${lnDz}），受克，建议清仓` });
      }
    }

    return signals;
  }

  // ── 全量分析入口 ──────────────────────────────────────────────────

  function fullAnalysis(year, month, day, hour, gender) {
    const bazi     = calculateBazi(year, month, day, hour);
    const dayTg    = bazi.day.tg;
    const { forward, startAge, dayuns } = calculateDaYun(
      bazi.year, bazi.month, gender, year, month, day
    );

    const score    = calcStrengthScore(bazi);
    const xiYong   = getXiYong(score, dayTg);
    const caiXing  = analyzeCaiXing(bazi);
    const timing   = calcTimingScore(dayuns, year, dayTg, xiYong.xiYongWx, xiYong.jiShen);
    const indRec   = getIndustryRec(xiYong.xiYongWx, dayTg);
    const exitSigs = checkExitSignal(timing, score, dayTg);
    const curDaYun = getCurrentDaYun(dayuns, year);

    // 十神标注（用于展示）
    const pillarsWithSS = {
      year:  { ...bazi.year,  ss: getShiShen(dayTg, bazi.year.tg),  ssDz: getShiShen(dayTg, bazi.year.dz)  },
      month: { ...bazi.month, ss: getShiShen(dayTg, bazi.month.tg), ssDz: getShiShen(dayTg, bazi.month.dz) },
      day:   { ...bazi.day,   ss: '日主',                            ssDz: getShiShen(dayTg, bazi.day.dz)   },
      hour:  { ...bazi.hour,  ss: getShiShen(dayTg, bazi.hour.tg),  ssDz: getShiShen(dayTg, bazi.hour.dz)  },
    };

    return {
      bazi, dayTg, dayYang: isYang(dayTg),
      pillarsWithSS,
      score, xiYong, caiXing,
      dayuns, startAge, forward, curDaYun,
      timing, indRec, exitSigs,
    };
  }

  // ── 格式化推送消息（用于企业微信）────────────────────────────────

  function formatPushMessage(result, name) {
    const { timing, xiYong, caiXing, dayTg, score } = result;
    const { pillars, curDaYun, timeStems, composite, action } = timing;
    const { liuNian, liuYue, liuRi, today } = pillars;
    const { siEval, wuEval, weiEval } = timing;

    const signalIcon = (s) => s === '喜用' ? '✅' : s === '忌神' ? '❌' : '➖';

    const lines = [
      `【八字量化信号】${today}`,
      ``,
      `日主：${dayTg}（${WUXING[dayTg]}）${xiYong.strength}`,
      `喜用：${xiYong.xiYongWx.join('、')} | ${caiXing.stockType}`,
      ``,
      `▸ 大运：${curDaYun ? curDaYun.gz : '—'}`,
      `▸ 流年：${liuNian.tg}${liuNian.dz} ${signalIcon(timing.lnScore.tg.signal)}${timing.lnScore.tg.ss}/${timing.lnScore.dz.ss}`,
      `▸ 流月：${liuYue.tg}${liuYue.dz} ${signalIcon(timing.lyScore.tg.signal)}`,
      `▸ 今日：${liuRi.tg}${liuRi.dz} ${signalIcon(timing.lrScore.tg.signal)}`,
      ``,
      `盘中时段`,
      `上午 ${timeStems.si} ${signalIcon(siEval.signal)} ${siEval.ss}`,
      `午时 ${timeStems.wu} ${signalIcon(wuEval.signal)} ${wuEval.ss}`,
      `下午 ${timeStems.wei} ${signalIcon(weiEval.signal)} ${weiEval.ss}`,
      ``,
      `综合评分：${composite}分 → ${action}`,
    ];

    if (result.exitSigs && result.exitSigs.length > 0) {
      lines.push(``, `⚠️ ${result.exitSigs[0].reason}`);
    }

    return lines.join('\n');
  }

  // ── 导出 ──────────────────────────────────────────────────────────

  global.BaziQuant = {
    fullAnalysis,
    getShiShen,
    calcStrengthScore,
    getXiYong,
    analyzeCaiXing,
    getTodayPillars,
    getTimeStems,
    calcTimingScore,
    getIndustryRec,
    checkExitSignal,
    getCurrentDaYun,
    formatPushMessage,
    INDUSTRY_MAP,
    WX_ORDER,
  };

})(window);
