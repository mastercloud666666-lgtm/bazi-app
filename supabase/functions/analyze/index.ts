// supabase/functions/analyze/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier,
  consumeRateLimit,
  corsHeaders,
  extractClientIp,
  isAllowedRequestOrigin,
  isLikelyAutomatedUa,
  maskIp,
  recordAbuseLog,
  resolveAllowedOrigins,
  tooManyRequestsResponse,
} from '../_shared/security.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS_FREE = 8;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS_PAID = 24;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS_PER_TRADE = 10;

function readEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(String(Deno.env.get(name) || '').trim());
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(Math.floor(raw), min), max);
}

function chineseDigitsToNumber(input: string): number {
  const raw = String(input || '').trim();
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);

  const digitMap: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };

  let total = 0;
  let current = 0;
  for (const ch of raw) {
    if (ch === '百') {
      total += (current || 1) * 100;
      current = 0;
    } else if (ch === '十') {
      total += (current || 1) * 10;
      current = 0;
    } else if (ch in digitMap) {
      current = digitMap[ch];
    }
  }
  return total + current;
}

function parseSectionNumber(raw: string): number {
  const input = String(raw || '').trim();
  if (!input) return 0;
  if (/^\d+$/.test(input)) return Number(input);

  const map: Record<string, number> = {
    零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
  };
  if (input === '十') return 10;
  const tenPos = input.indexOf('十');
  if (tenPos >= 0) {
    const left = input.slice(0, tenPos);
    const right = input.slice(tenPos + 1);
    const leftNum = left ? (map[left] ?? 0) : 1;
    const rightNum = right ? (map[right] ?? 0) : 0;
    return leftNum * 10 + rightNum;
  }
  return map[input] ?? 0;
}

function normalizeSectionMarkers(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/(^|\n)\s*(?:Section|section)\s*(\d{1,2})\s*[:：]/g, '$1第$2段：')
    .replace(/(^|\n)\s*第\s*([0-9一二三四五六七八九十零〇两]{1,4})\s*段\s*[:：]/g, '$1第$2段：');
}

function countReportSections(text: string): number {
  const normalized = normalizeSectionMarkers(text);
  if (!normalized) return 0;
  const pattern = /第([0-9一二三四五六七八九十零〇两]{1,4})段：/g;
  let maxSection = 0;
  let match: RegExpExecArray | null = null;
  while ((match = pattern.exec(normalized))) {
    const numeric = parseSectionNumber(match[1] || '');
    if (Number.isFinite(numeric) && numeric > maxSection) maxSection = numeric;
  }
  return maxSection;
}

function buildSectionRangeConstraint(sectionStart: number, sectionEnd: number): string {
  return `\n\n范围约束：只输出第${sectionStart}段到第${sectionEnd}段。必须从“第${sectionStart}段：”开始，写完“第${sectionEnd}段：”后立即结束。不得重复，不得预告，不得总结范围外内容。若字数紧张，可适度压缩单段，但绝不能跳段。`;
}

function clipBaziReportByTier(text: string, maxSection: number): string {
  const normalized = normalizeSectionMarkers(text);
  if (!normalized) return '';
  const lines = normalized.split('\n');
  const result: string[] = [];
  let currentSection = 0;
  let foundAnySection = false;
  for (const rawLine of lines) {
    const line = String(rawLine || '');
    const marker = line.match(/^\s*第([0-9一二三四五六七八九十零〇两]{1,4})段：/);
    if (marker) {
      foundAnySection = true;
      currentSection = parseSectionNumber(marker[1] || '');
    }
    if (!foundAnySection || (currentSection > 0 && currentSection <= maxSection)) {
      result.push(line);
    }
  }
  return result.join('\n').trim();
}

function getVipRangeMaxTokens(sectionStart: number, sectionEnd: number): number {
  const count = Math.max(1, sectionEnd - sectionStart + 1);
  return Math.min(7000, 1400 + count * 560);
}

const BAZI_SECTION_BLUEPRINT_24 = `
Master section blueprint for paid BAZI report:
第1段：用神喜忌
第2段：五行扶抑精解
第3段：性格底层驱动力
第4段：天赋与优势能力画像
第5段：事业财运
第6段：赚钱方式拆解
第7段：适合行业与黄金期
第8段：创业 / 副业适配度
第9段：感情婚姻
第10段：婚恋相处说明书
第11段：二婚 / 出轨 / 感情隐患深剖
第12段：原生家庭影响
第13段：子女缘分
第14段：人际关系与贵人模式
第15段：神煞分析
第16段：地支刑冲合会
第17段：空亡分析
第18段：财库分析
第19段：大运详解
第20段：特殊流年 + 后五年逐年建议
第21段：风险预警模块
第22段：人生关键转折点
第23段：改运与补运策略
第24段：人生核心课题总结
`;

function cleanAnalysisText(rawAnalysis: string): string {
  let analysis = String(rawAnalysis || '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/^\s*[-–—>]\s*/gm, '')
    .replace(/由\s*DeepSeek\s*生成.*$/gis, '')
    .replace(/Powered by DeepSeek.*$/gis, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  analysis = normalizeSectionMarkers(analysis);

  const isPoemLine = (line: string) => {
    const t = line.trim();
    if (!t || t.includes('你') || t.length < 4) return false;
    return t.includes('；') ||
      /^[\u4e00-\u9fa5]{4,8}[，。][\u4e00-\u9fa5]{4,8}[，。！？]?$/.test(t) ||
      /[风云雷龙凤星月玉霞鹤雁花霜雪].{0,6}[；，。]/.test(t);
  };

  const lines = analysis.split('\n');
  while (lines.length && isPoemLine(lines[0])) lines.shift();
  while (lines.length) {
    const last = lines[lines.length - 1].trim();
    if (!last) {
      lines.pop();
      continue;
    }
    if (isPoemLine(last)) {
      lines.pop();
      continue;
    }
    break;
  }

  return lines.join('\n').trim();
}

async function requestDeepSeekCompletion(prompt: string, maxTokens: number, systemMessage: string) {
  const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: maxTokens,
      temperature: 0,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
    }),
  });
  if (!dsRes.ok) {
    const errorText = await dsRes.text();
    throw new Error(`deepseek_nonstream_failed_${dsRes.status}: ${errorText}`);
  }
  const dsData = await dsRes.json();
  const rawAnalysis = dsData.choices?.[0]?.message?.content || '';
  return { analysis: cleanAnalysisText(rawAnalysis) };
}

function buildSseResponseFromText(text: string, corsHeadersValue: Record<string, string>): Response {
  const normalized = normalizeSectionMarkers(String(text || ''));
  const encoder = new TextEncoder();
  const lines = normalized.split('\n');
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        const payload = JSON.stringify({ choices: [{ delta: { content: `${line}\n` } }] });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      ...corsHeadersValue,
    },
  });
}

async function generatePaidBaziTierReport(
  prompt: string,
  systemMessage: string,
  tier: 'basic' | 'pro' | 'vip',
): Promise<string> {
  const targetEnd = tier === 'basic' ? 8 : (tier === 'pro' ? 16 : 24);
  const ranges: Array<[number, number]> = tier === 'basic'
    ? [[1, 8]]
    : (tier === 'pro' ? [[1, 8], [9, 16]] : [[1, 8], [9, 16], [17, 24]]);
  const tierTokenCap = tier === 'basic' ? 4200 : (tier === 'pro' ? 6200 : 7000);

  const parts: string[] = [];
  for (const [start, end] of ranges) {
    const pass = await requestDeepSeekCompletion(
      prompt + buildSectionRangeConstraint(start, end),
      Math.min(getVipRangeMaxTokens(start, end), tierTokenCap),
      systemMessage
    );
    if (pass.analysis) parts.push(pass.analysis);
  }

  let combined = parts.join('\n\n').trim();
  const maxSection = countReportSections(combined);
  if (maxSection < targetEnd) {
    const repairStart = Math.max(1, maxSection + 1);
    const repairPass = await requestDeepSeekCompletion(
      prompt +
        buildSectionRangeConstraint(repairStart, targetEnd) +
        `\n\n修复约束：前文已完成至第${repairStart - 1}段，只补写第${repairStart}段到第${targetEnd}段，不得重复前文。`,
      Math.min(getVipRangeMaxTokens(repairStart, targetEnd), tierTokenCap),
      systemMessage
    );
    combined = [combined, repairPass.analysis].filter(Boolean).join('\n\n').trim();
  }

  return clipBaziReportByTier(normalizeSectionMarkers(combined), targetEnd);
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  const CORS = corsHeaders(req, allowedOrigins);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  if (!isAllowedRequestOrigin(req, allowedOrigins)) {
    return new Response(JSON.stringify({
      error: 'origin_not_allowed',
      message: '非法来源请求已被拒绝。',
    }), {
      status: 403,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { trade_no, service = 'bazi', free_only, payment_option_id, stream, section_start, section_end } = body;

    const rateScope = `analyze:${String(service || 'bazi')}:${free_only ? 'free' : 'paid'}`;
    const rateWindowSeconds = readEnvNumber('RATE_LIMIT_ANALYZE_WINDOW_SECONDS', DEFAULT_RATE_LIMIT_WINDOW_SECONDS, 10, 3600);
    const rateMaxRequests = free_only
      ? readEnvNumber('RATE_LIMIT_ANALYZE_MAX_REQUESTS_FREE', DEFAULT_RATE_LIMIT_MAX_REQUESTS_FREE, 1, 200)
      : readEnvNumber('RATE_LIMIT_ANALYZE_MAX_REQUESTS_PAID', DEFAULT_RATE_LIMIT_MAX_REQUESTS_PAID, 2, 500);
    const rateIdentifier = await buildRateLimitIdentifier(req);
    const rateResult = await consumeRateLimit(supabase, {
      scope: rateScope,
      identifier: rateIdentifier,
      windowSeconds: rateWindowSeconds,
      maxRequests: rateMaxRequests,
    });
    const clientIpMasked = maskIp(extractClientIp(req));
    const userAgent = String(req.headers.get('user-agent') || '').slice(0, 240);
    const shouldBlockBotUa = Deno.env.get('SECURITY_BLOCK_BOT_UA_SENSITIVE') !== '0';
    if (!rateResult.allowed) {
      await recordAbuseLog(supabase, {
        scope: rateScope,
        identifier: rateIdentifier,
        event: 'rate_limited',
        meta: {
          ip_masked: clientIpMasked,
          current_count: rateResult.currentCount,
          max_requests: rateMaxRequests,
          window_seconds: rateWindowSeconds,
          free_only: Boolean(free_only),
          service: String(service || 'bazi'),
        },
      });
      return tooManyRequestsResponse(req, allowedOrigins, {
        message: free_only
          ? '免费解读请求过于频繁，请稍后再试。'
          : '报告生成请求过于频繁，请稍后再试。',
        retryAfterSeconds: rateResult.retryAfterSeconds,
        scope: rateScope,
        currentCount: rateResult.currentCount,
      });
    }

    if (shouldBlockBotUa && isLikelyAutomatedUa(userAgent)) {
      await recordAbuseLog(supabase, {
        scope: rateScope,
        identifier: rateIdentifier,
        event: 'blocked_bot_ua',
        meta: {
          ip_masked: clientIpMasked,
          ua: userAgent.slice(0, 160),
          free_only: Boolean(free_only),
          service: String(service || 'bazi'),
        },
      });
      return new Response(JSON.stringify({
        error: 'blocked_bot_ua',
        message: 'Automated client is not allowed for report generation.',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const tradeNoSafe = String(trade_no || '').trim();
    if (tradeNoSafe && /^(bazi|hepan)-[a-z0-9_-]{4,140}$/i.test(tradeNoSafe)) {
      const perTradeMaxRequests = readEnvNumber('RATE_LIMIT_ANALYZE_MAX_REQUESTS_PER_TRADE', DEFAULT_RATE_LIMIT_MAX_REQUESTS_PER_TRADE, 2, 200);
      const perTradeResult = await consumeRateLimit(supabase, {
        scope: `${rateScope}:trade`,
        identifier: tradeNoSafe,
        windowSeconds: rateWindowSeconds,
        maxRequests: perTradeMaxRequests,
      });
      if (!perTradeResult.allowed) {
        await recordAbuseLog(supabase, {
          scope: `${rateScope}:trade`,
          identifier: tradeNoSafe,
          event: 'rate_limited_trade',
          meta: {
            ip_masked: clientIpMasked,
            current_count: perTradeResult.currentCount,
            max_requests: perTradeMaxRequests,
            window_seconds: rateWindowSeconds,
            free_only: Boolean(free_only),
            service: String(service || 'bazi'),
          },
        });
        return tooManyRequestsResponse(req, allowedOrigins, {
          message: 'This order is being generated too frequently. Please retry shortly.',
          retryAfterSeconds: perTradeResult.retryAfterSeconds,
          scope: `${rateScope}:trade`,
          currentCount: perTradeResult.currentCount,
        });
      }
    }

    let prompt = '';
    let maxTokens = free_only ? 600 : 8192;
    let resolvedPaymentOptionId = typeof payment_option_id === 'string' ? payment_option_id : '';
    const requestedSectionStart = Number.isInteger(section_start) ? Number(section_start) : Number.parseInt(String(section_start || ''), 10);
    const requestedSectionEnd = Number.isInteger(section_end) ? Number(section_end) : Number.parseInt(String(section_end || ''), 10);
    const hasSectionRange =
      Number.isFinite(requestedSectionStart) &&
      Number.isFinite(requestedSectionEnd) &&
      requestedSectionStart >= 1 &&
      requestedSectionEnd >= requestedSectionStart;
    let tradeOrder: { paid?: boolean; birth_input?: string | null } | null = null;
    let tradeBirth: Record<string, any> = {};

    if (trade_no) {
      const { data } = await supabase
        .from('orders')
        .select('paid,birth_input')
        .eq('trade_no', trade_no)
        .maybeSingle();
      tradeOrder = data || null;
      if (tradeOrder?.birth_input) {
        try {
          tradeBirth = JSON.parse(tradeOrder.birth_input);
          if (!resolvedPaymentOptionId) {
            resolvedPaymentOptionId = tradeBirth?.payment_option?.id || '';
          }
        } catch (_) {
          tradeBirth = {};
        }
      }
    }

    const requiresPaidOrder = (service === 'bazi' && !free_only) || service === 'hepan';
    if (requiresPaidOrder) {
      if (!trade_no) {
        return new Response(JSON.stringify({ error: 'trade_no is required for paid analyze' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
      if (!tradeOrder) {
        return new Response(JSON.stringify({ error: 'order not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
      if (!tradeOrder.paid) {
        return new Response(JSON.stringify({ error: 'order not paid' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
    }

    if (service === 'qiming') {
      const { surname, birth_year, birth_month, birth_day, gender, wuxing_short, hope } = body;
      prompt = `客户姓氏：${surname}，生辰：${birth_year}年${birth_month}月${birth_day}日，${gender}，五行：${wuxing_short}，期望寓意：${hope || '无特殊要求'}。

帮这位客户推荐3个名字，每个名字说：
1. 名字写法
2. 读音和声调
3. 字义解释
4. 为什么适合这个五行（补缺或加强）
5. 整体寓意

要求：用口语，像朋友在帮你取名字一样，不要写标题符号，每个名字之间空一行，直接从第一个名字开始说。`;

    } else if (service === 'zhanbu') {
      const { question, method, number1, number2, number3, ke_month, ke_day, ke_hour } = body;

      if (method === 'daliuren') {
        prompt = `客户问事：${question}
起课时间：${ke_month}月${ke_day}日${ke_hour}时

请用大六壬为客户推算：
1. 四课三传（说出课名和传名）
2. 主课意象对这件事的指示
3. 三传（初传、中传、末传）分别说明事情的起因、经过、结果
4. 总体判断（成/不成，何时有结果）
5. 建议和注意事项

用口语，像资深命理师在面对面说，不写标题符号，不引用古文，直接从分析开始说完就结束。`;

      } else if (method === 'xiaoliuren') {
        const hourMap: Record<string, number> = {
          子:1, 丑:2, 寅:3, 卯:4, 辰:5, 巳:6, 午:7, 未:8, 申:9, 酉:10, 戌:11, 亥:12
        };
        const sixStars = ['先锋', '小吉', '速喜', '赤口', '留连', '空亡'];
        const m = Number(ke_month) || new Date().getMonth() + 1;
        const d = Number(ke_day) || new Date().getDate();
        const hIdx = hourMap[ke_hour] ?? 1;
        const mainIdx = ((m - 1 + d - 1) % 6 + 6) % 6;
        const mainStar = sixStars[mainIdx];
        const subIdx = ((mainIdx + hIdx - 1) % 6 + 6) % 6;
        const subStar = sixStars[subIdx];
        prompt = `客户问事：${question}
起课时间：${m}月${d}日${ke_hour}时
小六壬推算：月起${sixStars[((m-1)%6+6)%6]}，日起${mainStar}，时落${subStar}

请用小六壬为客户解读：
1. 所起的将神是"${subStar}"，说明这个将神的吉凶含义
2. 针对客户问的具体事情说明指示
3. 结果判断（成/不成/待定，给个明确倾向）
4. 最佳行动建议

用口语，简洁直接，不写标题符号，不引用古文，说完建议就结束。`;

      } else {
        const nums = [number1, number2, number3].filter(Boolean);
        prompt = `客户想问的事：${question}
起卦方式：${method === 'meihua' ? '梅花易数' : '六爻'}
起卦数字：${nums.join('、') || '随机'}

请用${method === 'meihua' ? '梅花易数' : '六爻'}帮客户解这个问题：
1. 起什么卦（说卦名和主要象意）
2. 这个卦针对客户问题说明什么
3. 结果判断（好/中/差，说清楚）
4. 具体建议（做什么、避什么、何时有转机）

用口语，直接给结论，不写标题符号，不引用古文原文，说完建议就结束。`;
      }

    } else if (service === 'fengshui') {
      const { location, concern, description, image_base64 } = body;

      // 如果有户型图，先用视觉模型读图，再做风水分析
      let layoutDesc = '';
      if (image_base64) {
        try {
          const visionRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
            },
            body: JSON.stringify({
              model: 'deepseek-vl2',
              max_tokens: 800,
              messages: [{
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: image_base64 } },
                  { type: 'text', text: '这是一张户型图。请仔细描述：1. 图上标注的东南西北方向；2. 大门/入口在哪个方向；3. 各功能区（客厅、卧室、厨房、卫生间、阳台）的位置和朝向；4. 特殊格局（穿堂风、开门见灶/卫等）。只描述图上实际能看到的，不要推断。' }
                ],
              }],
            }),
          });
          const vd = await visionRes.json();
          layoutDesc = vd.choices?.[0]?.message?.content || '';
        } catch (_) { /* 视觉识别失败则仅凭文字分析 */ }
      }

      const layoutSection = layoutDesc
        ? `\n\n户型图识别结果（以此为准）：\n${layoutDesc}`
        : '';
      prompt = `客户情况：${description}${layoutSection}
地点：${location || '未说明'}
主要关切：${concern}

请从风水角度分析并给出实用建议：
1. 主要问题在哪里（具体说是哪个方位或格局，有户型图的按图说）
2. 对家运/事业/健康有什么影响
3. 具体改善方法（3-5条，说清楚怎么做）
4. 注意事项

用口语，像一个走访过的风水师在给你当面说，不写标题符号，实用为主，直接从分析开始。`;

    } else if (service === 'hepan') {
      let man_bazi_str = String(body?.man_bazi_str || '').trim();
      let woman_bazi_str = String(body?.woman_bazi_str || '').trim();
      let man_dayun = String(body?.man_dayun || '').trim();
      let woman_dayun = String(body?.woman_dayun || '').trim();
      let current_year = Number(body?.current_year) || new Date().getFullYear();

      if ((!man_bazi_str || !woman_bazi_str || !man_dayun || !woman_dayun) && tradeBirth) {
        man_bazi_str = man_bazi_str || String(tradeBirth?.man_bazi_str || '').trim();
        woman_bazi_str = woman_bazi_str || String(tradeBirth?.woman_bazi_str || '').trim();
        man_dayun = man_dayun || String(tradeBirth?.man_dayun || '').trim();
        woman_dayun = woman_dayun || String(tradeBirth?.woman_dayun || '').trim();
        current_year = Number(tradeBirth?.current_year) || current_year;
      }

      if (!man_bazi_str || !woman_bazi_str || !man_dayun || !woman_dayun) {
        return new Response(JSON.stringify({ error: 'hepan payload incomplete' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }

      maxTokens = 8192;
      prompt = `合盘分析，当前年份：${current_year}年。
男方八字：${man_bazi_str}
女方八字：${woman_bazi_str}
男方大运：${man_dayun}
女方大运：${woman_dayun}

请按以下十段逐一深度分析，每段之间空一行，用大白话，用"你们"或分别称"男方""女方"：

第一段：两人日主关系。分别说出男方和女方的日主天干和五行，然后判断两人日主之间的关系是相生（谁生谁）、相克（谁克谁）、比和（同五行）还是天干五合（甲己合土、乙庚合金、丙辛合水、丁壬合木、戊癸合火）。详细说明这种关系在两人相处中的具体表现——相生的感情滋养模式、相克的摩擦点在哪、比和的共鸣感与竞争性、天合的磁场吸引力。

第二段：五行互补分析。列出男方和女方各自的五行分布（木火土金水各有几个），找出各自的五行强项和弱项，然后重点分析两人五行上是否互补——对方强的五行是否恰好弥补了自己的弱项，或者两人弱项相同无法互补，甚至强项相同造成某五行过旺。结合现实说明这种五行配置对两人共同生活的影响（谁补谁、谁依赖谁、哪方面相互滋养最明显）。

第三段：日支合缘（婚姻宫关系）。日支代表配偶宫，男女日支的关系直接反映两人的缘分深浅。详细分析：男女日支之间是否有六合（子丑、寅亥、卯戌、辰酉、巳申、午未）、三合（寅午戌火、巳酉丑金、申子辰水、亥卯未木）、六冲（子午、丑未、寅申、卯酉、辰戌、巳亥）、相刑（子卯、寅巳申、丑未戌）或相害（子未、丑午、寅巳、卯辰、申亥、酉戌）。六合三合代表婚姻宫相融，缘分天注；六冲代表婚姻宫相冲，聚散无常；相刑相害代表相处有隐性矛盾消耗。对每种关系都要说清楚在婚姻中的具体表现。

第四段：婚姻星状态分析。男命以财星（正财）为配偶星，女命以官星（正官）为配偶星。分别判断：男方八字中财星的旺衰、是否透干、是否被合冲绊住；女方八字中官星的旺衰、是否透干、是否被合冲绊住。财星/官星旺透表示婚姻缘分深厚，感情来得早；被合或被冲则感情路多波折，或配偶星作用减弱。结合两人互为对方的配偶星，分析两人在对方命局中的"质量"——对方是否是你命中贵人，还是你命中的消耗。

第五段：感情性格契合度。根据两人各自的格局（日主强弱、月令格局）分析各自的感情性格——谁主动谁被动，谁浪漫谁理性，谁依赖感强谁独立感强，谁在感情中更易患得患失，谁更需要被认可。然后对照分析两人性格是否互补——互补的地方如何产生吸引力，相似的地方如何既产生共鸣又带来摩擦，最需要磨合的性格差异点在哪里。

第六段：财运互助与经济配合。分别分析男方和女方各自的财运模式（主动求财还是守财型，适合创业还是打工，财运的旺年大运）。然后重点分析两人在经济上是否能互相帮扶——两人的喜用神是否一致或相辅，还是各走各的路，还是一方财星旺时恰好是另一方的忌神。给出两人在财务管理和经济规划上的具体建议。

第七段：感情隐患与第三者风险。从两人命局分析各自是否有感情隐患：检查男方是否有正财在前偏财在后（易婚后出轨）、女方是否有正官在前七杀在后（易有婚外情），以及日支是否有暗合（配偶宫有隐秘感情线）。同时分析两人相处时，是否因为某方桃花旺或异性缘强而容易引起另一方的不安全感。对每个发现的隐患都要具体说，并给出化解或防范建议。

第八段：子女缘分合论。男方以官杀为子女星，女方以食伤为子女星。分别看两人子女星的旺衰状态，再综合判断两人相合后子女缘分如何。结合两人时柱（子女宫）状态，给出最适合生育的年龄段或大运时机，以及子女数量和性别的大致倾向。

第九段：大运配合与缘分旺衰节点。根据提供的男女双方大运数据，逐步分析未来几步大运中两人缘分的旺衰变化：哪步大运两人运势方向一致、感情顺遂；哪步大运一方走强一方走弱，容易失衡；哪些具体年份是两人感情的关键节点。特别指出当前这几年对这段感情的意义。

第十段：综合评价与合婚建议。给出一个综合合婚评价（如"命理上相合程度较高""缘分深但需磨合""相克明显需谨慎"，不用百分比打分），说清楚优势在哪里、挑战在哪里，最后给出3-5条实际可操作的建议：五行调整方向、相处模式建议、需要重点关注的年份。

绝对禁止：写诗引古文、使用Markdown符号（#*_等）、用百分比打分、说套话祝福。直接从第一段开始，说完第十段就结束，每段都要展开有内容，不能只说一两句话了事。`;

    } else {
      // 八字
      const { year, month, day, hour, gender, bazi_str,
              dayun_text, special_years_text, start_age } = body;
      const currentYear = new Date().getFullYear();

      if (free_only) {
        prompt = `Client birth info: ${year}-${month}-${day} ${hour}:00, gender: ${gender}, bazi: ${bazi_str}, current year: ${currentYear}.

Precomputed data:
Start age: ${start_age}
Dayun: ${dayun_text}
Special years: ${special_years_text}

你是一位经验丰富的研究员。FREE 基础版只输出第1段和第2段，共两段。

第1段：日主强弱与性格轮廓（日主强弱结论、性格底色、适合的大方向）。
第2段：未来一年的关键趋势提醒（综合大运和流年，给出1-2条具体趋势参考，不展开细节，留悬念）。

Requirements:
- 每段控制在150-250字，总字数严格控制在350-550汉字。
- 第2段结尾必须自然引导："想完整看清未来十年的具体节奏、财运窗口和关键转折点，可以看看完整版的24维深度分析。"
- 只输出中文纯文本，不用Markdown、不写诗、不引用古文。
- 不用称呼对方为"你"，直接用口语陈述结论。
- 不得输出第3段及以后的内容。`;
      } else {
      const nextFiveYears = Array.from({length: 5}, (_, i) => currentYear + i).join('、') + '年';
      prompt = `客户生辰：${year}年${month}月${day}日${hour}时，${gender}命，八字：${bazi_str}，当前年份：${currentYear}年。

以下大运和特殊年份数据已由专业软件算好，请直接使用，不要自行重算：
起运年龄：${start_age}岁
大运排列：${dayun_text}
特殊流年：${special_years_text}
后五年：${nextFiveYears}

写作总原则：
1. 同一八字在不同档位的核心判断必须一致，尤其是日主强弱、格局、用神喜忌、事业主线、感情主线，不能前后矛盾。
2. 每一段都按“结论→依据→建议”展开，依据必须回扣到命盘干支、十神、大运或流年。
3. 语言必须具体，不要使用“可能、也许、大概、不排除”等模糊词。
4. 只输出中文纯文本，不要Markdown、不要诗词古文、不要空话套话。
5. 直接从分析开始，不写开场寒暄，不写收尾祝福。`;
      } // end if free_only else
    } // end else bazi

    // Bazi tiers use one unified framework, only output depth differs.
    if (service === 'bazi') {
      const baziTier = free_only ? 'free' : (resolvedPaymentOptionId || 'basic');
      const forceCanonicalAllSections = !free_only && !hasSectionRange && baziTier === 'vip';
      prompt += `

Output rule override for BAZI:
Use this exact section blueprint and keep section order strictly.
${BAZI_SECTION_BLUEPRINT_24}
每一段必须以“第X段：”单独起行。
禁止 Markdown、禁止列表符号、禁止表格、禁止重复开场、禁止收尾祝福语。
`;
      if (hasSectionRange) {
        if (baziTier === 'vip') {
          maxTokens = Math.min(maxTokens, getVipRangeMaxTokens(requestedSectionStart, requestedSectionEnd));
        }
        prompt += `

分段生成任务：
当前只需生成第${requestedSectionStart}段到第${requestedSectionEnd}段。
整份报告最终仍要满足24段完整结构与统一口径，但本次仅输出当前分段，不要输出分段外内容。`;
        prompt += buildSectionRangeConstraint(requestedSectionStart, requestedSectionEnd);
      } else if (forceCanonicalAllSections) {
        maxTokens = Math.min(maxTokens, 12000);
        prompt += `

统一基准约束（用于三档一致性）：
1. 必须完整写出第1段到第24段，不能跳段。
2. 全文总字数目标：7000-9000字。
3. 第1段到第8段累计目标：约3000字（供初级版截取）。
4. 第1段到第16段累计目标：约5000字（供进阶版截取）。
5. 同一八字三档口径必须一致，低档内容是高档内容的前置子集，不得出现前后结论冲突。`;
      } else if (baziTier === 'vip') {
        maxTokens = Math.min(maxTokens, 8192);
        prompt += `

档位约束：完整版必须完整输出第1段到第24段。总字数目标7000-9000字。`;
      } else if (baziTier === 'pro') {
        maxTokens = Math.min(maxTokens, 7200);
        prompt += `

档位约束：进阶版只能输出第1段到第16段，不得输出第17段及以后。总字数目标4800-5600字（约5000字）。`;
      } else if (baziTier === 'basic') {
        maxTokens = Math.min(maxTokens, 5200);
        prompt += `

档位约束：初级版只能输出第1段到第8段，不得输出第9段及以后。总字数目标2800-3400字（约3000字）。`;
      } else {
        maxTokens = Math.min(maxTokens, 2200);
        prompt += `

档位约束：免费版只能输出第1段到第3段，不得输出第4段及以后。总字数目标900-1400字。`;
      }
    }

    const SYSTEM_MSG = `你是一位经验丰富的民间命理师。只输出纯文字，不用任何Markdown格式，不写诗，不引用古文，不说套话，直接用口语和"你"称呼对方说结论。

【十神对应速查——必须严格遵守，不得搞错】
财星=日主所克：甲乙木日主→财星是土；丙丁火日主→财星是金；戊己土日主→财星是水；庚辛金日主→财星是木；壬癸水日主→财星是火。
官杀=克日主者：甲乙木日主→官杀是金；丙丁火日主→官杀是水；戊己土日主→官杀是木；庚辛金日主→官杀是火；壬癸水日主→官杀是土。
印星=生日主者：甲乙木日主→印是水；丙丁火日主→印是木；戊己土日主→印是火；庚辛金日主→印是土；壬癸水日主→印是金。
食伤=日主所生：甲乙木→食伤是火；丙丁火→食伤是土；戊己土→食伤是金；庚辛金→食伤是水；壬癸水→食伤是木。
阳日主遇阳同类=比肩，遇阴同类=劫财；遇阳财=偏财，遇阴财=正财；遇阳官杀=七杀，遇阴官杀=正官。阴日主规则相反。

【表达要求——必须给出确切结论，严禁模糊措辞】
以下类型的表达绝对禁止：
"婚姻可能来得不会太早/太晚"→必须说"感情在X岁左右才有实质进展"或"走到XX大运之前婚姻难以稳定，原因是财星/官星被X合住/被X冲"；
"财运可能不错"→必须说"XX大运财星透出，那段时间收入明显上升"；
"健康需要注意"→必须说"木弱→肝胆易出问题，火弱→心脏需留意"（说具体脏腑和原因）；
"感情路上可能有波折"→必须说"XX岁前感情容易反复，因为日支被X冲/正财被X合绊"；
凡做判断，必须给出具体年龄段、干支名称、五行原因，不得用"可能""也许""不会太X""有一定概率"等虚词搪塞。`;


    // 合盘默认流式；八字在显式请求 stream=true 时：
    // - 付费且非分段请求：按档位走分段聚合，再以 SSE 回放，兼顾一致性与速度
    // - 其余情况：直连模型流式
    if (service === 'bazi' && stream === true && !free_only && !hasSectionRange) {
      const paidTier = (resolvedPaymentOptionId || 'basic') as 'basic' | 'pro' | 'vip';
      const finalText = await generatePaidBaziTierReport(prompt, SYSTEM_MSG, paidTier);
      return buildSseResponseFromText(finalText, CORS);
    }

    if ((service === 'hepan' && stream === true) || (service === 'bazi' && stream === true)) {
      const dsStream = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          max_tokens: maxTokens,
          temperature: 0,
          stream: true,
          messages: [
            { role: 'system', content: SYSTEM_MSG },
            { role: 'user', content: prompt },
          ],
        }),
      });
      return new Response(dsStream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...CORS,
        },
      });
    }

    const isPaidBaziNoRange = service === 'bazi' && !free_only && !hasSectionRange;
    let analysis = '';

    if (isPaidBaziNoRange) {
      const paidTier = (resolvedPaymentOptionId || 'basic') as 'basic' | 'pro' | 'vip';
      analysis = await generatePaidBaziTierReport(prompt, SYSTEM_MSG, paidTier);
    } else {
      const singlePass = await requestDeepSeekCompletion(prompt, maxTokens, SYSTEM_MSG);
      analysis = normalizeSectionMarkers(singlePass.analysis);
      if (service === 'bazi' && free_only) {
        analysis = clipBaziReportByTier(analysis, 3);
      }
    }

    // 有 trade_no 时才写数据库（付费流程用），免费模式跳过
    if (trade_no && !hasSectionRange) {
      await supabase.from('orders').update({ analysis }).eq('trade_no', trade_no);
    }

    return new Response(JSON.stringify({ ok: true, analysis }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
