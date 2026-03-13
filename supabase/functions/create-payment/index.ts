// CORS 头配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

const PAYMENT_OPTION_MAP: Record<string, { title: string; total_fee: string }> = {
  basic: { title: '\u5355\u6b21\u6df1\u5ea6\u89e3\u8bfb', total_fee: '0.01' },
  pro: { title: '\u4e09\u6b21\u89e3\u8bfb\u5957\u9910', total_fee: '0.01' },
  vip: { title: '\u6708\u5ea6\u4f1a\u5458', total_fee: '0.01' },
};

// 纯 JS MD5 实现（Web Crypto API 不支持 MD5）
function md5(input: string): string {
  const str = unescape(encodeURIComponent(input));
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);

  function safeAdd(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num: number, cnt: number) {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  // Convert bytes to 32-bit words
  const nBytes = bytes.length;
  const nWords = (((nBytes + 8) >>> 6) + 1) * 16;
  const M = new Int32Array(nWords);
  for (let i = 0; i < nBytes; i++) {
    M[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }
  M[nBytes >> 2] |= 0x80 << ((nBytes % 4) * 8);
  M[nWords - 2] = nBytes * 8;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < nWords; i += 16) {
    const olda = a, oldb = b, oldc = c, oldd = d;
    a = md5ff(a, b, c, d, M[i + 0], 7, -680876936);
    d = md5ff(d, a, b, c, M[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, M[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, M[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, M[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, M[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, M[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, M[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, M[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, M[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, M[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, M[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, M[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, M[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, M[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, M[i + 15], 22, 1236535329);
    a = md5gg(a, b, c, d, M[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, M[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, M[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, M[i + 0], 20, -373897302);
    a = md5gg(a, b, c, d, M[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, M[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, M[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, M[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, M[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, M[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, M[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, M[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, M[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, M[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, M[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, M[i + 12], 20, -1926607734);
    a = md5hh(a, b, c, d, M[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, M[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, M[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, M[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, M[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, M[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, M[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, M[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, M[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, M[i + 0], 11, -358537222);
    c = md5hh(c, d, a, b, M[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, M[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, M[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, M[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, M[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, M[i + 2], 23, -995338651);
    a = md5ii(a, b, c, d, M[i + 0], 6, -198630844);
    d = md5ii(d, a, b, c, M[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, M[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, M[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, M[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, M[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, M[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, M[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, M[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, M[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, M[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, M[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, M[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, M[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, M[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, M[i + 9], 21, -343485551);
    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }
  const hash = [a, b, c, d];
  const output = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    output[i] = (hash[i >> 2] >>> ((i % 4) * 8)) & 0xff;
  }
  let hex = '';
  for (let i = 0; i < 16; i++) {
    hex += output[i].toString(16).padStart(2, '0');
  }
  return hex;
}

Deno.serve(async (req) => {
  // CORS 预检处理
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { trade_no, birth_input, payment_option_id } = body;
    if (!trade_no) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        details: 'trade_no is required',
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    const appSecret = Deno.env.get('HUPI_APPSECRET');
    const appId = Deno.env.get('HUPI_APPID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    // 检查环境变量
    if (!appSecret || !appId || !supabaseUrl) {
      console.error('Missing environment variables:', {
        hasAppSecret: !!appSecret,
        hasAppId: !!appId,
        hasSupabaseUrl: !!supabaseUrl
      });
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    const nonceStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const fallbackOrigin = Deno.env.get('PAY_RETURN_ORIGIN') || 'https://tengyunzi.com';
    const originHeader = req.headers.get('origin');
    const refererHeader = req.headers.get('referer');
    let returnOrigin = fallbackOrigin;
    if (originHeader) {
      returnOrigin = originHeader;
    } else if (refererHeader) {
      try {
        returnOrigin = new URL(refererHeader).origin;
      } catch {
        returnOrigin = fallbackOrigin;
      }
    }

    const optionConfig = PAYMENT_OPTION_MAP[payment_option_id] || PAYMENT_OPTION_MAP.basic;

    const payParams = {
      version: '1.1',
      appid: appId,
      trade_order_id: trade_no,
      total_fee: optionConfig.total_fee,
      title: optionConfig.title,
      time: Math.floor(Date.now() / 1000),
      notify_url: `${supabaseUrl}/functions/v1/payment-callback`,
      return_url: `${returnOrigin}/payment-success.html?trade_no=${encodeURIComponent(trade_no)}#trade_no=${encodeURIComponent(trade_no)}`,
      nonce_str: nonceStr,
    };

    const sortedKeys = Object.keys(payParams).sort();
    const signString = sortedKeys.map(k => `${k}=${payParams[k]}`).join('&') + appSecret;
    const hash = md5(signString);

    // 发起POST请求获取支付URL
    const response = await fetch('https://api.xunhupay.com/payment/do.html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ ...payParams, hash }),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Payment API error:', response.status, responseText);
      return new Response(JSON.stringify({ 
        error: 'Payment API error',
        status: response.status,
        response: responseText
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    const result = JSON.parse(responseText);

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});
