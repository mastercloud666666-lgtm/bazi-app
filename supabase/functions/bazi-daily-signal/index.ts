// supabase/functions/bazi-daily-signal/index.ts
// 企业微信推送：接收八字量化信号并推送给指定用户
import { corsHeaders } from '../_shared/security.ts';

const WECHAT_API_BASE = 'https://qyapi.weixin.qq.com/cgi-bin';

async function getAccessToken(corpid: string, corpsecret: string): Promise<string> {
  const url = `${WECHAT_API_BASE}/gettoken?corpid=${corpid}&corpsecret=${corpsecret}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WeChat token request failed: ${res.status}`);
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(`WeChat token error ${data.errcode}: ${data.errmsg}`);
  return data.access_token as string;
}

async function sendTextMessage(
  accessToken: string,
  toUser: string,
  agentId: string,
  content: string
): Promise<void> {
  const url = `${WECHAT_API_BASE}/message/send?access_token=${accessToken}`;
  const body = {
    touser: toUser,
    msgtype: 'text',
    agentid: agentId,
    text: { content },
    safe: 0,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`WeChat send request failed: ${res.status}`);
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(`WeChat send error ${data.errcode}: ${data.errmsg}`);
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const corpid = Deno.env.get('WECHAT_CORPID');
    const corpsecret = Deno.env.get('WECHAT_CORPSECRET');
    const agentId = Deno.env.get('WECHAT_AGENTID');

    if (!corpid || !corpsecret || !agentId) {
      return new Response(JSON.stringify({ error: '企业微信配置缺失，请检查环境变量' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { userid, message, name } = body as {
      userid?: string;
      message?: string;
      name?: string;
    };

    if (!userid || !message) {
      return new Response(JSON.stringify({ error: '缺少 userid 或 message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get access token
    const accessToken = await getAccessToken(corpid, corpsecret);

    // Format final message with name greeting if provided
    const finalMessage = name
      ? `【八字量化·今日信号】\n您好，${name}！\n\n${message}`
      : `【八字量化·今日信号】\n\n${message}`;

    // Send message
    await sendTextMessage(accessToken, userid, agentId, finalMessage);

    return new Response(
      JSON.stringify({ ok: true, sent_to: userid, preview: finalMessage.slice(0, 60) + '…' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[bazi-daily-signal] Error:', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
