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

    const prompt = `你是一位有三十年经验的民间命理师，说话直接、亲切，像老朋友聊天一样。

客户生辰：${year}年${month}月${day}日${hour}时，${gender}命
八字：${bazi_str}

请用口语给这位客户分析八字，按下面八个方面来说，每个方面说两三句话：
日主强弱、格局、用神喜忌、性格、事业财运、感情婚姻、健康、人生建议。

要求：
- 直接说结论，不要铺垫，不要解释什么是八字
- 用"你"称呼对方
- 不要用任何标题符号、星号、井号、加粗等格式
- 不要写诗、不要引经据典
- 不要出现"根据您的八字""综上所述""AI"等字眼
- 每个方面之间空一行，自然过渡`;

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const dsData = await dsRes.json();
    const analysis = dsData.choices?.[0]?.message?.content || '';

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
