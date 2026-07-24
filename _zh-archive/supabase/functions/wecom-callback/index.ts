// supabase/functions/wecom-callback/index.ts
// 企业微信接收消息服务器URL验证
// 文档：https://developer.work.weixin.qq.com/document/path/90930

import { encodeHex } from 'https://deno.land/std@0.177.0/encoding/hex.ts';

// SHA1 哈希
async function sha1(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return encodeHex(new Uint8Array(hashBuffer));
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = Deno.env.get('WECHAT_CALLBACK_TOKEN') || '';

  // GET: 企业微信验证URL
  if (req.method === 'GET') {
    const msg_signature = url.searchParams.get('msg_signature') || '';
    const timestamp     = url.searchParams.get('timestamp') || '';
    const nonce         = url.searchParams.get('nonce') || '';
    const echostr       = url.searchParams.get('echostr') || '';

    // 验证签名：sort([token, timestamp, nonce]) → sha1
    const arr = [token, timestamp, nonce].sort();
    const signature = await sha1(arr.join(''));

    if (signature === msg_signature) {
      // 验证通过，返回 echostr（明文模式）或解密后的内容（加密模式）
      return new Response(echostr, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    } else {
      return new Response('signature mismatch', { status: 403 });
    }
  }

  // POST: 接收消息（暂时只返回成功，后续可扩展）
  if (req.method === 'POST') {
    return new Response('success', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return new Response('ok', { status: 200 });
});
