// supabase/functions/bazi-daily-signal/index.ts
// 企业微信推送：支持内部成员(userid) 和 外部联系人(external_userid)
import { corsHeaders, resolveAllowedOrigins } from '../_shared/security.ts';

const WECHAT_API_BASE = 'https://qyapi.weixin.qq.com/cgi-bin';

async function getAccessToken(corpid: string, corpsecret: string): Promise<string> {
  const url = `${WECHAT_API_BASE}/gettoken?corpid=${corpid}&corpsecret=${corpsecret}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WeChat token request failed: ${res.status}`);
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(`WeChat token error ${data.errcode}: ${data.errmsg}`);
  return data.access_token as string;
}

// 内部成员消息
async function sendInternalMessage(
  accessToken: string, toUser: string, agentId: string, content: string
): Promise<void> {
  const url = `${WECHAT_API_BASE}/message/send?access_token=${accessToken}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ touser: toUser, msgtype: 'text', agentid: agentId, text: { content }, safe: 0 }),
  });
  if (!res.ok) throw new Error(`WeChat internal send failed: ${res.status}`);
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(`WeChat send error ${data.errcode}: ${data.errmsg}`);
}

// 外部联系人消息
async function sendExternalMessage(
  accessToken: string, externalUserid: string, senderUserid: string, content: string
): Promise<void> {
  const url = `${WECHAT_API_BASE}/externalcontact/message/send?access_token=${accessToken}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: senderUserid,
      external_userid: [externalUserid],
      msgtype: 'text',
      text: { content },
    }),
  });
  if (!res.ok) throw new Error(`WeChat external send failed: ${res.status}`);
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(`WeChat external send error ${data.errcode}: ${data.errmsg}`);
}

function isExternalUserid(userid: string): boolean {
  return userid.startsWith('wo') || userid.startsWith('wm');
}

Deno.serve(async (req: Request) => {
  const allowedOrigins = resolveAllowedOrigins();

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(req, allowedOrigins) });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(req, allowedOrigins), 'Content-Type': 'application/json' },
    });
  }

  try {
    const corpid       = Deno.env.get('WECHAT_CORPID');
    const corpsecret   = Deno.env.get('WECHAT_CORPSECRET');
    const agentId      = Deno.env.get('WECHAT_AGENTID');
    const senderUserId = Deno.env.get('WECHAT_SENDER_USERID') || 'TengBaiJia';

    if (!corpid || !corpsecret || !agentId) {
      return new Response(JSON.stringify({ error: '企业微信配置缺失' }), {
        status: 500,
        headers: { ...corsHeaders(req, allowedOrigins), 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { userid, message, name } = body as { userid?: string; message?: string; name?: string };

    if (!userid || !message) {
      return new Response(JSON.stringify({ error: '缺少 userid 或 message' }), {
        status: 400,
        headers: { ...corsHeaders(req, allowedOrigins), 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getAccessToken(corpid, corpsecret);
    const finalMessage = name
      ? `【八字量化·今日信号】\n您好，${name}！\n\n${message}`
      : `【八字量化·今日信号】\n\n${message}`;

    const external = isExternalUserid(userid);
    if (external) {
      await sendExternalMessage(accessToken, userid, senderUserId, finalMessage);
    } else {
      await sendInternalMessage(accessToken, userid, agentId, finalMessage);
    }

    return new Response(
      JSON.stringify({ ok: true, type: external ? '外部联系人' : '内部成员', sent_to: userid }),
      { status: 200, headers: { ...corsHeaders(req, allowedOrigins), 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[bazi-daily-signal]', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders(req, allowedOrigins), 'Content-Type': 'application/json' },
    });
  }
});
