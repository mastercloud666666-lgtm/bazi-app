// supabase/functions/analyze/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { trade_no, year, month, day, hour, gender, bazi_str } = await req.json();

    const currentYear = new Date().getFullYear();
    const prompt = `客户生辰：${year}年${month}月${day}日${hour}时，${gender}命，八字：${bazi_str}，当前年份：${currentYear}年。

请按以下顺序逐段分析，每段之间空一行，用大白话，用"你"称呼对方：

第一段：日主强弱。说清楚日主天干属什么五行，身强还是身弱，原因是什么。

第二段：格局判断。先判断是普通格局还是特殊格局。如果是从格（从财、从官、从杀、从儿、从旺等），要明确说出是什么从格，并解释这种格局的特点和喜忌与普通格局完全相反。如果是专旺格、一行得气格等也要指出。

第三段：用神与喜忌。根据格局给出具体喜用神和忌神，是特殊格局的话按特殊格局的喜忌来，不要按普通格局套。

第四段：性格特点。结合日主和格局说两三个具体特点，不要泛泛而谈。

第五段：事业财运。给出具体方向和适合行业，说清楚哪个年龄段或哪类运势有利。

第六段：感情婚姻。说婚期早晚、感情模式，以及配偶的特征。

第七段：健康注意。根据五行薄弱点说容易出问题的部位。

第八段：大运分析。从当前大运开始，往后推两到三个大运，每个大运说吉凶和重点事项。

第九段：流年提醒。在${currentYear}年到${currentYear + 5}年中，找出天克地冲年（流年天干地支与日柱或年柱形成天克地冲）、岁运并临年（流年与大运同气或形成特殊组合），点出具体年份，解释为什么这年要注意，要注意什么事。

绝对禁止：开头写诗或引用古文名句、使用任何Markdown符号（#*_等）、写"综上所述"、写"根据您的八字"、写"AI"。
直接从"你这个八字…"或"你的日主…"开始说正文。`;

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 2048,
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

    // 去掉开头的诗句（第一行若不含"你"字且含有"；""、"等古文标点则判定为诗句删掉）
    const lines = analysis.split('\n');
    if (lines.length > 1) {
      const firstLine = lines[0].trim();
      const looksLikePoem = !firstLine.includes('你') &&
        (firstLine.includes('；') || firstLine.includes('，') && firstLine.includes('。') ||
         /[金木水火土][鳞韵潜翠玉]/.test(firstLine));
      if (looksLikePoem) {
        analysis = lines.slice(1).join('\n').trim();
      }
    }

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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
