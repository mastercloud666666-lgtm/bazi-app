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

    const prompt = `客户生辰：${year}年${month}月${day}日${hour}时，${gender}命，八字：${bazi_str}

按顺序说以下八点，每点两三句话，每点之间空一行：
日主强弱、格局、用神喜忌、性格、事业财运、感情婚姻、健康、人生建议。

绝对禁止：写诗、引用古文、写标题、用符号格式、写"综上所述"、写"根据您的八字"。
直接从分析内容开始，用"你"称呼对方，说大白话。`;

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 1024,
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

    // 过滤所有Markdown格式和DeepSeek自动附加的版权声明
    const analysis = rawAnalysis
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
      .replace(/^\s*[-–—>]\s*/gm, '')
      .replace(/由\s*DeepSeek\s*生成.*$/gis, '')
      .replace(/Powered by DeepSeek.*$/gis, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

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
