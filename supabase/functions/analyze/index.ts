// supabase/functions/analyze/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const anthropic = new Anthropic({ apiKey: Deno.env.get('CLAUDE_API_KEY')! });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  const { trade_no, year, month, day, hour, gender, bazi_str } = await req.json();

  const prompt = `你是一位精通四柱八字命理的命理师。请根据以下八字为用户做深度命理分析：

生辰：${year}年${month}月${day}日${hour}时，性别：${gender}
八字：${bazi_str}

请按以下结构分析（每部分2-3句）：
1. 日主分析（日主天干五行、旺衰）
2. 格局判断
3. 用神与喜忌
4. 性格特点
5. 事业财运
6. 感情婚姻
7. 健康注意
8. 人生建议

语言：简体中文，专业而易懂。`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const analysis = message.content[0].type === 'text' ? message.content[0].text : '';

  // 有 trade_no 时才写数据库（付费流程用），免费模式跳过
  if (trade_no) {
    await supabase.from('orders').update({ analysis }).eq('trade_no', trade_no);
  }

  return new Response(JSON.stringify({ ok: true, analysis }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
