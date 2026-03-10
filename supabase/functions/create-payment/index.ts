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

  try {
    const body = await req.json();
    const { trade_no, birth_input } = body;

    console.log('收到支付请求:', { trade_no, birth_input });

    // 获取原始请求的 origin
    const origin = req.headers.get('origin') || 'https://tengyunzi.com';

    // 直接返回一个模拟的支付成功响应
    const mockResult = {
      errcode: 0,
      errmsg: 'success!',
      url: `${origin}/result.html?trade_no=${trade_no}&paid=true`,
      url_qrcode: null,
      hash: 'mock_hash'
    };

    console.log('返回模拟结果:', mockResult);

    return new Response(JSON.stringify(mockResult), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('支付请求失败:', error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});