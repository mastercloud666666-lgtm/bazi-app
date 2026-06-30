// supabase/functions/payment-callback/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendOrderNotify } from '../_shared/order-notify.ts';
import { grantCopyAgentCredits, isCopyAgentOrder } from '../_shared/copy-agent.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function parseBirthInput(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, any>
      : {};
  } catch {
    return {};
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function applyTrackingEvent(
  birth: Record<string, any>,
  event: string,
  meta: Record<string, unknown> = {},
): Record<string, any> {
  const next = { ...birth };
  const tracking = next.tracking && typeof next.tracking === 'object' && !Array.isArray(next.tracking)
    ? { ...next.tracking as Record<string, any> }
    : {};
  const events = Array.isArray(tracking.events) ? [...tracking.events] : [];
  const now = new Date().toISOString();

  if (event === 'payment_paid' && !tracking.payment_paid_at) {
    tracking.payment_paid_at = now;
  }
  tracking.last_event = event;
  tracking.last_event_at = now;
  events.push({ event, at: now, meta });
  tracking.events = events.slice(-30);
  next.tracking = tracking;
  return next;
}

function attachGatewayTracking(
  birth: Record<string, any>,
  gatewayMeta: Record<string, unknown>,
): Record<string, any> {
  const next = { ...birth };
  const tracking = next.tracking && typeof next.tracking === 'object' && !Array.isArray(next.tracking)
    ? { ...next.tracking as Record<string, any> }
    : {};

  const setIfText = (key: string, value: unknown) => {
    const text = asString(value);
    if (text) tracking[key] = text;
  };

  setIfText('gateway_transaction_id', gatewayMeta.gateway_transaction_id);
  setIfText('gateway_open_order_id', gatewayMeta.gateway_open_order_id);
  setIfText('gateway_trade_order_id', gatewayMeta.gateway_trade_order_id);
  setIfText('gateway_appid', gatewayMeta.gateway_appid);
  setIfText('gateway_plugins', gatewayMeta.gateway_plugins);
  setIfText('gateway_total_fee', gatewayMeta.gateway_total_fee);
  setIfText('gateway_status', gatewayMeta.gateway_status);
  tracking.gateway_source = 'payment-callback';

  next.tracking = tracking;
  return next;
}

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
    const [aa, bb, cc, dd] = [a, b, c, d];
    a = md5ff(a,b,c,d,M[i+0],7,-680876936);   b = md5ff(d,a,b,c,M[i+1],12,-389564586);
    c = md5ff(c,d,a,b,M[i+2],17,606105819);   d = md5ff(b,c,d,a,M[i+3],22,-1044525330);
    a = md5ff(a,b,c,d,M[i+4],7,-176418897);   b = md5ff(d,a,b,c,M[i+5],12,1200080426);
    c = md5ff(c,d,a,b,M[i+6],17,-1473231341); d = md5ff(b,c,d,a,M[i+7],22,-45705983);
    a = md5ff(a,b,c,d,M[i+8],7,1770035416);   b = md5ff(d,a,b,c,M[i+9],12,-1958414417);
    c = md5ff(c,d,a,b,M[i+10],17,-42063);     d = md5ff(b,c,d,a,M[i+11],22,-1990404162);
    a = md5ff(a,b,c,d,M[i+12],7,1804603682);  b = md5ff(d,a,b,c,M[i+13],12,-40341101);
    c = md5ff(c,d,a,b,M[i+14],17,-1502002290);d = md5ff(b,c,d,a,M[i+15],22,1236535329);
    a = md5gg(a,b,c,d,M[i+1],5,-165796510);   b = md5gg(d,a,b,c,M[i+6],9,-1069501632);
    c = md5gg(c,d,a,b,M[i+11],14,643717713);  d = md5gg(b,c,d,a,M[i+0],20,-373897302);
    a = md5gg(a,b,c,d,M[i+5],5,-701558691);   b = md5gg(d,a,b,c,M[i+10],9,38016083);
    c = md5gg(c,d,a,b,M[i+15],14,-660478335); d = md5gg(b,c,d,a,M[i+4],20,-405537848);
    a = md5gg(a,b,c,d,M[i+9],5,568446438);    b = md5gg(d,a,b,c,M[i+14],9,-1019803690);
    c = md5gg(c,d,a,b,M[i+3],14,-187363961);  d = md5gg(b,c,d,a,M[i+8],20,1163531501);
    a = md5gg(a,b,c,d,M[i+13],5,-1444681467); b = md5gg(d,a,b,c,M[i+2],9,-51403784);
    c = md5gg(c,d,a,b,M[i+7],14,1735328473);  d = md5gg(b,c,d,a,M[i+12],20,-1926607734);
    a = md5hh(a,b,c,d,M[i+5],4,-378558);      b = md5hh(d,a,b,c,M[i+8],11,-2022574463);
    c = md5hh(c,d,a,b,M[i+11],16,1839030562); d = md5hh(b,c,d,a,M[i+14],23,-35309556);
    a = md5hh(a,b,c,d,M[i+1],4,-1530992060);  b = md5hh(d,a,b,c,M[i+4],11,1272893353);
    c = md5hh(c,d,a,b,M[i+7],16,-155497632);  d = md5hh(b,c,d,a,M[i+10],23,-1094730640);
    a = md5hh(a,b,c,d,M[i+13],4,681279174);   b = md5hh(d,a,b,c,M[i+0],11,-358537222);
    c = md5hh(c,d,a,b,M[i+3],16,-722521979);  d = md5hh(b,c,d,a,M[i+6],23,76029189);
    a = md5hh(a,b,c,d,M[i+9],4,-640364487);   b = md5hh(d,a,b,c,M[i+12],11,-421815835);
    c = md5hh(c,d,a,b,M[i+15],16,530742520);  d = md5hh(b,c,d,a,M[i+2],23,-995338651);
    a = md5ii(a,b,c,d,M[i+0],6,-198630844);   b = md5ii(d,a,b,c,M[i+7],10,1126891415);
    c = md5ii(c,d,a,b,M[i+14],15,-1416354905);d = md5ii(b,c,d,a,M[i+5],21,-57434055);
    a = md5ii(a,b,c,d,M[i+12],6,1700485571);  b = md5ii(d,a,b,c,M[i+3],10,-1894986606);
    c = md5ii(c,d,a,b,M[i+10],15,-1051523);   d = md5ii(b,c,d,a,M[i+1],21,-2054922799);
    a = md5ii(a,b,c,d,M[i+8],6,1873313359);   b = md5ii(d,a,b,c,M[i+15],10,-30611744);
    c = md5ii(c,d,a,b,M[i+6],15,-1560198380); d = md5ii(b,c,d,a,M[i+13],21,1309151649);
    a = md5ii(a,b,c,d,M[i+4],6,-145523070);   b = md5ii(d,a,b,c,M[i+11],10,-1120210379);
    c = md5ii(c,d,a,b,M[i+2],15,718787259);   d = md5ii(b,c,d,a,M[i+9],21,-343485551);
    a = safeAdd(a, aa); b = safeAdd(b, bb);
    c = safeAdd(c, cc); d = safeAdd(d, dd);
  }

  const result = [a, b, c, d];
  return result.map(n => {
    const hex = (n >>> 0).toString(16).padStart(8, '0');
    // reverse byte order
    return hex.match(/../g)!.reverse().join('');
  }).join('');
}

Deno.serve(async (req) => {
  const body = await req.text();
  const params = new URLSearchParams(body);
  const data = Object.fromEntries(params.entries());

  // 验签（迅虎支付 MD5 签名）
  const appSecret = Deno.env.get('HUPI_APPSECRET')!;
  const { sign, ...rest } = data;
  const sortedStr = Object.keys(rest).sort()
    .map(k => `${k}=${rest[k]}`).join('&') + appSecret;

  const expectedSign = md5(sortedStr);
  if (expectedSign !== sign) {
    return new Response('sign error', { status: 400 });
  }

  // 迅虎支付回调参数：trade_order_id, status (OD=已支付)
  const trade_order_id = data.trade_order_id || data.trade_no;
  const status = data.status;

  if (status !== 'OD') {
    return new Response('not paid', { status: 200 });
  }

  // 查询订单并标记已支付
  const { data: order } = await supabase
    .from('orders').select('paid,birth_input').eq('trade_no', trade_order_id).single();

  if (!order) {
    return new Response('order not found', { status: 404 });
  }

  const gatewayMeta = {
    gateway_status: status,
    gateway_trade_order_id: trade_order_id,
    gateway_transaction_id: asString(data.transaction_id),
    gateway_open_order_id: asString(data.open_order_id),
    gateway_total_fee: asString(data.total_fee),
    gateway_appid: asString(data.appid),
    gateway_plugins: asString(data.plugins),
  };
  const trackedBirth = applyTrackingEvent(parseBirthInput(order.birth_input), 'payment_paid', {
    source: 'payment-callback',
    ...gatewayMeta,
  });
  const trackedBirthWithGateway = attachGatewayTracking(trackedBirth, gatewayMeta);
  await supabase
    .from('orders')
    .update({ paid: true, birth_input: JSON.stringify(trackedBirthWithGateway) })
    .eq('trade_no', trade_order_id);

  console.log(`Order ${trade_order_id} marked as paid, triggering analysis...`);

  // 异步触发 AI 分析（不等待结果，但添加错误处理）
  let birth = trackedBirthWithGateway;
  const optionId = asString(birth?.payment_option?.id).toLowerCase();
  const orderService = birth?.order_service === 'hepan'
    ? 'hepan'
    : (birth?.order_service === 'zhanbu'
      ? 'zhanbu'
      : (birth?.order_service === 'pdf' || optionId === 'pdf'
        ? 'pdf'
        : (birth?.order_service === 'consult' || optionId === 'consult'
          ? 'consult'
          : (isCopyAgentOrder(birth, optionId) ? 'copy_agent' : 'bazi'))));

  if (orderService === 'copy_agent') {
    try {
      const grant = await grantCopyAgentCredits(birth, trade_order_id);
      birth = grant.birth;
      await supabase
        .from('orders')
        .update({ paid: true, birth_input: JSON.stringify(birth) })
        .eq('trade_no', trade_order_id);
      await sendOrderNotify('copy_agent_credited', {
        trade_no: trade_order_id,
        service: orderService,
        payment_option_id: optionId || 'copy_agent_100',
        total_fee: asString(data.total_fee),
        status: grant.skipped ? 'SKIPPED_ALREADY_GRANTED' : 'CREDITED',
        source: 'payment-callback',
        note: `${grant.email} +${grant.credits} until ${grant.paidUntil}`,
      });
      return new Response('success', { status: 200 });
    } catch (err) {
      const failedBirth = {
        ...birth,
        tracking: {
          ...(birth.tracking && typeof birth.tracking === 'object' && !Array.isArray(birth.tracking) ? birth.tracking : {}),
          copy_agent_grant_error: err instanceof Error ? err.message : String(err),
          copy_agent_grant_error_at: new Date().toISOString(),
        },
      };
      await supabase
        .from('orders')
        .update({ paid: true, birth_input: JSON.stringify(failedBirth) })
        .eq('trade_no', trade_order_id);
      console.error(`Copy Agent credit grant failed for ${trade_order_id}:`, err);
      return new Response('copy agent grant failed', { status: 500 });
    }
  }

  await sendOrderNotify('payment_paid', {
    trade_no: trade_order_id,
    service: orderService,
    payment_option_id: optionId || '-',
    total_fee: asString(data.total_fee),
    status: 'OD',
    source: 'payment-callback',
    note: asString(data.transaction_id),
  });

  if (orderService === 'pdf' || orderService === 'consult' || orderService === 'zhanbu') {
    console.log(`${orderService.toUpperCase()} order ${trade_order_id} paid, skip analyze trigger`);
    return new Response('success', { status: 200 });
  }

  const analyzePayload: Record<string, unknown> = {
    trade_no: trade_order_id,
    service: orderService,
    lang: birth?.lang,
  };

  if (orderService === 'hepan') {
    analyzePayload.man_bazi_str = birth.man_bazi_str;
    analyzePayload.woman_bazi_str = birth.woman_bazi_str;
    analyzePayload.man_dayun = birth.man_dayun;
    analyzePayload.woman_dayun = birth.woman_dayun;
    analyzePayload.current_year = Number(birth.current_year) || new Date().getFullYear();
    analyzePayload.stream = false;
  } else {
    analyzePayload.free_only = false;
    analyzePayload.payment_option_id = birth?.payment_option?.id || 'basic';
    analyzePayload.year = birth.year;
    analyzePayload.month = birth.month;
    analyzePayload.day = birth.day;
    analyzePayload.hour = birth.hour;
    analyzePayload.gender = birth.gender;
    analyzePayload.bazi_str = birth.bazi_str;
    analyzePayload.dayun_text = birth.dayun_text;
    analyzePayload.special_years_text = birth.special_years_text;
    analyzePayload.start_age = birth.start_age;
  }

  // 异步触发 AI 分析：用 EdgeRuntime.waitUntil 让 worker 在返回响应后继续存活，
  // 直到 analyze 调用 DeepSeek 生成并写回报告（耗时约 30-70s）。
  // 否则未 await 的 fetch 会在本函数 return 时被运行时回收，
  // 导致已支付订单的报告永远不生成（paid_not_delivered）。
  const analyzeTask = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
    },
    body: JSON.stringify(analyzePayload),
  }).catch(err => {
    console.error(`Failed to trigger analysis for order ${trade_order_id}:`, err);
    // 分析失败不影响支付状态，用户可以手动刷新页面获取结果
  });
  try {
    (globalThis as any).EdgeRuntime?.waitUntil?.(analyzeTask);
  } catch (err) {
    console.error(`waitUntil unavailable for order ${trade_order_id}:`, err);
  }

  console.log(`Analysis triggered for order ${trade_order_id}`);
  return new Response('success', { status: 200 });
});
