// supabase/functions/analyze/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const body = await req.json();
    const { trade_no, service = 'bazi' } = body;

    let prompt = '';

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

    } else {
      // 八字
      const { year, month, day, hour, gender, bazi_str,
              dayun_text, special_years_text, start_age, free_only } = body;
      const currentYear = new Date().getFullYear();

      if (free_only) {
        prompt = `客户${gender}命，八字：${bazi_str}。

请根据日主天干五行和八字格局，分析这位客户的性格特点。要求：
1. 先用一句话说明日主和格局（如"你是丙火日主，身强，偏印格"）
2. 再说2-3个具体的性格特点，每个特点单独一段，结合格局和日柱来说，用具体的例子或表现方式描述
3. 最后一段说一个需要注意的性格短板

用口语，用"你"称呼对方，不写标题符号，不写诗，不引用古文，直接从分析开始，说完就结束。`;
      } else {
      prompt = `客户生辰：${year}年${month}月${day}日${hour}时，${gender}命，八字：${bazi_str}，当前年份：${currentYear}年。

以下大运和特殊年份数据已由专业软件算好，请直接用这些数据分析，不要自己重新推算：

起运年龄：${start_age}岁
大运排列：${dayun_text}

特殊流年（天克地冲、岁运并临）：
${special_years_text}

请按以下顺序逐段分析，每段之间空一行，用大白话，用"你"称呼对方：

第一段：日主强弱。说日主天干五行，身强还是身弱，原因。

第二段：格局判断。判断普通格局或特殊格局（从格、专旺格等），特殊格局要说清楚名称和特点。

第三段：用神喜忌。根据格局给出喜用神和忌神，特殊格局按特殊格局喜忌来。

第四段：性格特点。结合日主和格局说两三个具体特点。

第五段：事业财运。具体方向、适合行业、哪个阶段有利。

第六段：感情婚姻。婚期早晚、感情模式、配偶特征。

第七段：健康注意。根据五行薄弱点说容易出问题的部位。

第八段：大运分析。用上面给出的大运数据，分析当前大运和接下来两三步大运的吉凶和重点，每步大运说两三句。

第九段：特殊年份提醒。根据上面给出的特殊流年数据，逐年说明为什么要注意、要注意什么事。如果没有特殊年份就说"未来几年运势平稳，无明显冲克"。

绝对禁止：任何位置写诗或引用古文、使用Markdown符号（#*_等）、写祝福语收尾、自己重新推算大运流年（用提供的数据）。
直接从分析内容开始，说完第九段就结束。`;
      } // end if free_only else
    } // end else bazi

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: '你是一位经验丰富的民间命理师。只输出纯文字，不用任何Markdown格式，不写诗，不引用古文，不说套话，直接用口语和"你"称呼对方说结论。'
          },
          { role: 'user', content: prompt }
        ],
      }),
    });
    const dsData = await dsRes.json();
    const rawAnalysis = dsData.choices?.[0]?.message?.content || '';

    // 过滤Markdown格式和DeepSeek版权声明
    let analysis = rawAnalysis
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
      .replace(/^\s*[-–—>]\s*/gm, '')
      .replace(/由\s*DeepSeek\s*生成.*$/gis, '')
      .replace(/Powered by DeepSeek.*$/gis, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // 去掉开头和结尾的诗句
    const isPoemLine = (line: string) => {
      const t = line.trim();
      if (!t || t.includes('你') || t.length < 4) return false;
      // 含"；"的对仗句、四字以内短句含古文意象、押韵特征
      return t.includes('；') ||
        /^[\u4e00-\u9fa5]{4,8}[，。][\u4e00-\u9fa5]{4,8}[，。！]?$/.test(t) ||
        /[鳞韵潜翠玉辉渊云霞风雷龙凤].{0,6}[；，。]/.test(t);
    };

    const lines = analysis.split('\n');

    // 去开头诗句
    while (lines.length && isPoemLine(lines[0])) lines.shift();

    // 去结尾诗句（连续检查末尾非空行）
    while (lines.length) {
      const last = lines[lines.length - 1].trim();
      if (!last) { lines.pop(); continue; }
      if (isPoemLine(last)) { lines.pop(); continue; }
      break;
    }

    analysis = lines.join('\n').trim();

    // 有 trade_no 时才写数据库（付费流程用），免费模式跳过
    if (trade_no) {
      await supabase.from('orders').update({ analysis }).eq('trade_no', trade_no);
    }

    return new Response(JSON.stringify({ ok: true, analysis }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
