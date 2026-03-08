// js/hepan.js

const SUPABASE_URL  = 'https://rcyssrsnalefzhzsvswm.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';

// ── 农历/阳历切换 ─────────────────────────────────────────────────
['man', 'woman'].forEach(prefix => {
  const accent = prefix === 'man' ? 'blue' : 'rose';
  document.querySelectorAll(`input[name=${prefix}-caltype]`).forEach(radio => {
    radio.addEventListener('change', () => {
      const isLunar = radio.value === 'lunar';
      document.getElementById(`${prefix}-leap-group`).style.display = isLunar ? 'block' : 'none';
      document.getElementById(`${prefix}-lbl-solar`).classList.toggle('active', !isLunar);
      document.getElementById(`${prefix}-lbl-solar`).classList.toggle(accent, !isLunar);
      document.getElementById(`${prefix}-lbl-lunar`).classList.toggle('active', isLunar);
      document.getElementById(`${prefix}-lbl-lunar`).classList.toggle(accent, isLunar);
    });
  });
});

// ── 收集某人的八字数据 ────────────────────────────────────────────
function collectPerson(prefix) {
  let year  = parseInt(document.getElementById(`${prefix}-year`).value);
  let month = parseInt(document.getElementById(`${prefix}-month`).value);
  let day   = parseInt(document.getElementById(`${prefix}-day`).value);
  let hour  = parseInt(document.getElementById(`${prefix}-hour`).value);
  const caltype = document.querySelector(`input[name=${prefix}-caltype]:checked`).value;

  if (caltype === 'lunar') {
    const isLeap = document.getElementById(`${prefix}-is-leap`).checked;
    try {
      const solar = isLeap
        ? Lunar.fromYmd(year, -month, day).getSolar()
        : Lunar.fromYmd(year, month, day).getSolar();
      year  = solar.getYear();
      month = solar.getMonth();
      day   = solar.getDay();
    } catch {
      alert(`${prefix === 'man' ? '男方' : '女方'}农历日期转换失败，请检查输入`);
      return null;
    }
  }
  return { year, month, day, hour };
}

// ── 渲染迷你四柱 ──────────────────────────────────────────────────
function renderMiniPillars(containerId, bazi) {
  const el = document.getElementById(containerId);
  const pillars = [
    { lbl:'年', tg: bazi.year.tg,  dz: bazi.year.dz  },
    { lbl:'月', tg: bazi.month.tg, dz: bazi.month.dz },
    { lbl:'日', tg: bazi.day.tg,   dz: bazi.day.dz   },
    { lbl:'时', tg: bazi.hour.tg,  dz: bazi.hour.dz  },
  ];
  el.innerHTML = pillars.map(p => `
    <div class="mini-pillar">
      <div class="mini-pillar-lbl">${p.lbl}</div>
      <div class="mini-tg">${p.tg}</div>
      <div class="mini-dz">${p.dz}</div>
    </div>
  `).join('');
}

// ── 计算快速合缘指标（纯本地，不调AI）────────────────────────────
function calcCompatTags(manBazi, womanBazi) {
  const tags = [];

  const mDay  = manBazi.day.tg;
  const wDay  = womanBazi.day.tg;
  const mDz   = manBazi.day.dz;
  const wDz   = womanBazi.day.dz;

  // 天干五合
  const STEM_HE = {'甲己':'合土','乙庚':'合金','丙辛':'合水','丁壬':'合木','戊癸':'合火'};
  const stemKey  = mDay + wDay;
  const stemKey2 = wDay + mDay;
  if (STEM_HE[stemKey])  tags.push({ text:`日干${mDay}${wDay}天合·${STEM_HE[stemKey]}`, cls:'good' });
  else if (STEM_HE[stemKey2]) tags.push({ text:`日干${wDay}${mDay}天合·${STEM_HE[stemKey2]}`, cls:'good' });

  // 日支六合
  const BR_SIX = {'子丑':'合土','寅亥':'合木','卯戌':'合火','辰酉':'合金','巳申':'合水','午未':'合火'};
  const dzKey  = mDz + wDz;
  const dzKey2 = wDz + mDz;
  if (BR_SIX[dzKey])  tags.push({ text:`日支${mDz}${wDz}六合`, cls:'good' });
  else if (BR_SIX[dzKey2]) tags.push({ text:`日支${wDz}${mDz}六合`, cls:'good' });

  // 日支三合
  const BR_SAN = [['寅','午','戌'],['巳','酉','丑'],['申','子','辰'],['亥','卯','未']];
  for (const [a,b,c] of BR_SAN) {
    if ([mDz,wDz].every(d => [a,b,c].includes(d))) {
      tags.push({ text:`日支${mDz}${wDz}三合`, cls:'good' });
    }
  }

  // 日支六冲
  const BR_CHONG = new Set(['子午','丑未','寅申','卯酉','辰戌','巳亥']);
  if (BR_CHONG.has(dzKey) || BR_CHONG.has(dzKey2)) tags.push({ text:`日支${mDz}${wDz}相冲`, cls:'bad' });

  // 日支相刑（子卯、寅巳申、丑未戌）
  const bothDz = new Set([mDz, wDz]);
  if (bothDz.has('子') && bothDz.has('卯'))  tags.push({ text:'子卯相刑', cls:'warn' });
  if (['寅','巳','申'].filter(d => bothDz.has(d)).length >= 2) tags.push({ text:'寅巳申相刑', cls:'warn' });
  if (['丑','未','戌'].filter(d => bothDz.has(d)).length >= 2) tags.push({ text:'丑未戌相刑', cls:'warn' });

  // 日支相害
  const BR_HAI = new Set(['子未','未子','丑午','午丑','寅巳','巳寅','卯辰','辰卯','申亥','亥申','酉戌','戌酉']);
  if (BR_HAI.has(dzKey)) tags.push({ text:`日支${mDz}${wDz}相害`, cls:'warn' });

  // 五行互补（简单判断：男女日主五行相生）
  const WX_SHENG = {'木':'火','火':'土','土':'金','金':'水','水':'木'};
  const TG_WX = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
  const mWx = TG_WX[mDay], wWx = TG_WX[wDay];
  if (mWx && wWx) {
    if (WX_SHENG[mWx] === wWx) tags.push({ text:`男${mWx}生女${wWx}·相生`, cls:'good' });
    else if (WX_SHENG[wWx] === mWx) tags.push({ text:`女${wWx}生男${mWx}·相生`, cls:'good' });
    else if (mWx === wWx) tags.push({ text:`日主同气${mWx}·比和`, cls:'good' });
  }

  // 若无任何关系
  if (!tags.length) tags.push({ text:'命局缘分平和', cls:'warn' });

  return tags;
}

// ── 表单提交 ──────────────────────────────────────────────────────
const form = document.getElementById('hepan-form');
let _manBazi = null, _womanBazi = null, _manData = null, _womanData = null;

form.addEventListener('submit', e => {
  e.preventDefault();

  const manData   = collectPerson('man');
  const womanData = collectPerson('woman');
  if (!manData || !womanData) return;

  const manBazi   = BaziCalc.calculateBazi(manData.year, manData.month, manData.day, manData.hour);
  const womanBazi = BaziCalc.calculateBazi(womanData.year, womanData.month, womanData.day, womanData.hour);

  _manBazi   = manBazi;
  _womanBazi = womanBazi;
  _manData   = manData;
  _womanData = womanData;

  // 渲染八字概览
  renderMiniPillars('man-pillars',   manBazi);
  renderMiniPillars('woman-pillars', womanBazi);

  // 渲染快速合缘指标
  const tags = calcCompatTags(manBazi, womanBazi);
  document.getElementById('compat-tags').innerHTML = tags
    .map(t => `<span class="compat-tag ${t.cls}">${t.text}</span>`)
    .join('');

  // 显示结果区，隐藏表单
  document.getElementById('form-area').style.display   = 'none';
  document.getElementById('result-section').style.display = 'block';
  document.getElementById('pay-card').style.display    = 'block';
  document.getElementById('hepan-loading').style.display  = 'none';
  document.getElementById('hepan-content').style.display  = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── 付款按钮（测试阶段直接生成报告）─────────────────────────────
document.getElementById('hepan-pay-btn').addEventListener('click', async () => {
  const btn = document.getElementById('hepan-pay-btn');
  btn.disabled = true;
  btn.textContent = '生成中...';

  document.getElementById('pay-card').style.display   = 'none';
  document.getElementById('hepan-loading').style.display = 'block';

  await hepanAnalyze(_manBazi, _womanBazi, _manData, _womanData);
});

// ── 调用后端合盘分析 ──────────────────────────────────────────────
async function hepanAnalyze(manBazi, womanBazi, manData, womanData) {
  const manStr   = `${manBazi.year.tg}${manBazi.year.dz}年 ${manBazi.month.tg}${manBazi.month.dz}月 ${manBazi.day.tg}${manBazi.day.dz}日 ${manBazi.hour.tg}${manBazi.hour.dz}时`;
  const womanStr = `${womanBazi.year.tg}${womanBazi.year.dz}年 ${womanBazi.month.tg}${womanBazi.month.dz}月 ${womanBazi.day.tg}${womanBazi.day.dz}日 ${womanBazi.hour.tg}${womanBazi.hour.dz}时`;

  // 大运文字
  const manDaYun   = BaziCalc.calculateDaYun(manBazi.year,   manBazi.month,   '男', manData.year,   manData.month,   manData.day);
  const womanDaYun = BaziCalc.calculateDaYun(womanBazi.year, womanBazi.month, '女', womanData.year, womanData.month, womanData.day);
  const manDayunTxt   = manDaYun.dayuns.slice(0,6).map(d => `${d.gz}（${d.ageStart}岁，${d.yearStart}年）`).join('、');
  const womanDayunTxt = womanDaYun.dayuns.slice(0,6).map(d => `${d.gz}（${d.ageStart}岁，${d.yearStart}年）`).join('、');

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
      body: JSON.stringify({
        service: 'hepan',
        man_bazi_str:   manStr,
        woman_bazi_str: womanStr,
        man_dayun:      manDayunTxt,
        woman_dayun:    womanDayunTxt,
        current_year:   new Date().getFullYear(),
      }),
    });

    if (!res.ok || !res.body) {
      document.getElementById('hepan-loading').innerHTML = '<p>解读获取失败，请刷新重试</p>';
      return;
    }

    document.getElementById('hepan-loading').style.display = 'none';
    document.getElementById('hepan-content').style.display = 'block';
    const textEl = document.getElementById('hepan-text');
    textEl.textContent = '';

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '', buffer = '';

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break outer;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content || '';
          if (delta) { fullText += delta; textEl.textContent = fullText; }
        } catch {}
      }
    }

    if (!fullText) {
      document.getElementById('hepan-loading').style.display = 'block';
      document.getElementById('hepan-loading').innerHTML = '<p>解读获取失败，请刷新重试</p>';
      document.getElementById('hepan-content').style.display = 'none';
    }
  } catch (err) {
    document.getElementById('hepan-loading').innerHTML = `<p>网络错误：${err?.message || err}</p>`;
  }
}
