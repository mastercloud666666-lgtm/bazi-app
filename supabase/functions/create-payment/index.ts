import { md5 } from 'https://deno.land/std@0.208.0/crypto/mod.ts';

Deno.serve(async (req) => {
  // CORS 预检处理
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.json();
  const { trade_no, birth_input } = body;

  const appSecret = Deno.env.get('HUPI_APPSECRET');
  const appId = Deno.env.get('HUPI_APPID');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  const nonceStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const origin = req.headers.get('origin') || 'https://tengyunzi.com';

  const payParams = {
    version: '1.1',
    appid: appId,
    trade_order_id: trade_no,
    total_fee: '0.01',
    title: '八字AI深度解读',
    time: Math.floor(Date.now() / 1000),
    notify_url: `${supabaseUrl}/functions/v1/payment-callback`,
    return_url: `${origin}/result.html?trade_no=${trade_no}`,
    nonce_str: nonceStr,
  };

  const sortedKeys = Object.keys(payParams).sort();
  const signString = sortedKeys.map(k => `${k}=${payParams[k]}`).join('&') + appSecret;
  const hash = await md5(signString);

  // 发起POST请求获取支付URL
  const response = await fetch('https://api.xunhupay.com/payment/do.html', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ ...payParams, hash }),
  });

  const responseText = await response.text();
  const result = JSON.parse(responseText);

  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});