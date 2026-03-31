#!/usr/bin/env node
import fs from 'node:fs/promises';

const DEFAULT_BASE_URL = 'https://tengyunzi.com';
const DEFAULT_TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 25000);

function nowIso() {
  return new Date().toISOString();
}

function normalizeBaseUrl(raw) {
  const value = String(raw || DEFAULT_BASE_URL).trim();
  return value.replace(/\/+$/, '');
}

function parseSupabaseConfigFromAppJs(appJsText) {
  const urlMatch = appJsText.match(/const\s+SUPABASE_URL\s*=\s*'([^']+)'/);
  const anonMatch = appJsText.match(/const\s+SUPABASE_ANON\s*=\s*'([^']+)'/);
  return {
    supabaseUrl: urlMatch?.[1] || '',
    supabaseAnon: anonMatch?.[1] || '',
  };
}

async function fetchText(url, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const { response, text } = await fetchText(url, init, timeoutMs);
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { response, text, data };
}

function buildAuthHeaders(anonKey, extra = {}) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    ...extra,
  };
}

function looksLikeDuplicateOrder(status, bodyText) {
  const lower = String(bodyText || '').toLowerCase();
  return status === 409 || lower.includes('duplicate key') || lower.includes('orders_trade_no_key');
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function buildBaziBirthInput(optionId, optionTitle, fee) {
  return {
    year: 1990,
    month: 1,
    day: 1,
    hour: 0,
    gender: 'male',
    birthplace: 'beijing',
    bazi_str: '庚午年 庚寅月 戊申日 庚申时',
    dayun_text: '甲子(ageStart:36,yearStart:2024)',
    special_years_text: '2026 丙午 (current): check cadence',
    start_age: 6,
    order_service: 'bazi',
    payment_option: { id: optionId, title: optionTitle, fee: String(fee) },
    payment_option_id: optionId,
    healthcheck: true,
    healthcheck_at: nowIso(),
  };
}

function buildPdfBirthInput() {
  return {
    order_service: 'pdf',
    payment_option: { id: 'pdf', title: 'Bazi PDF Document', fee: '19.9' },
    payment_option_id: 'pdf',
    healthcheck: true,
    healthcheck_at: nowIso(),
  };
}

function buildHepanBirthInput() {
  return {
    order_service: 'hepan',
    payment_option: { id: 'vip', title: '合盘测算报告', fee: '199' },
    payment_option_id: 'vip',
    man_bazi_str: '戊辰 庚申 戊申 庚申',
    woman_bazi_str: '己卯 丙寅 癸丑 壬子',
    man_dayun: '甲子(36,2024)',
    woman_dayun: '癸卯(30,2022)',
    current_year: new Date().getFullYear(),
    healthcheck: true,
    healthcheck_at: nowIso(),
  };
}

async function ensureOrderExists({ supabaseUrl, supabaseAnon, tradeNo, birthInput }) {
  const payload = {
    trade_no: tradeNo,
    birth_input: JSON.stringify(birthInput),
  };
  const { response, text } = await fetchText(`${supabaseUrl}/rest/v1/orders`, {
    method: 'POST',
    headers: buildAuthHeaders(supabaseAnon, {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    }),
    body: JSON.stringify(payload),
  });
  if (response.ok) return { created: true };
  if (looksLikeDuplicateOrder(response.status, text)) return { created: false };
  throw new Error(`order_insert_failed(${response.status}): ${text || response.statusText}`);
}

async function createPaymentAndValidate({
  supabaseUrl,
  supabaseAnon,
  tradeNo,
  paymentOptionId,
  paymentOptionTitle,
  totalFee,
  birthInput,
  isWeChat = false,
  checkName,
  checks,
}) {
  const defaultMobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1';
  const wechatMobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.69 NetType/WIFI Language/zh_CN';
  const payload = {
    trade_no: tradeNo,
    payment_option_id: paymentOptionId,
    payment_option_title: paymentOptionTitle,
    total_fee: String(totalFee),
    birth_input: birthInput,
    return_path: '/payment-fallback.html',
    client_env: {
      user_agent: isWeChat ? wechatMobileUa : defaultMobileUa,
      is_mobile: true,
      is_wechat: isWeChat,
    },
  };
  const { response, text, data } = await fetchJson(`${supabaseUrl}/functions/v1/create-payment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseAnon}`,
      'Content-Type': 'application/json',
      Origin: DEFAULT_BASE_URL,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    checks.push({
      name: checkName,
      ok: false,
      detail: `http_${response.status}: ${text.slice(0, 240)}`,
    });
    return;
  }

  const errcode = Number(data?.errcode ?? -1);
  const payUrl = String(data?.url || data?.url_qrcode || '').trim();
  if (errcode !== 0 || !payUrl) {
    checks.push({
      name: checkName,
      ok: false,
      detail: `errcode=${errcode}, errmsg=${String(data?.errmsg || text).slice(0, 180)}`,
    });
    return;
  }

  checks.push({
    name: checkName,
    ok: true,
    detail: `ok, gateway=${String(data?.gateway_meta?.selected_api_base || 'unknown')}`,
  });
}

async function run() {
  const startAt = nowIso();
  const checks = [];

  const baseUrl = normalizeBaseUrl(process.env.BASE_URL);
  const localAppJsPath = process.env.APP_JS_PATH || 'public/js/app.js';
  let supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
  let supabaseAnon = String(process.env.SUPABASE_ANON || '').trim();

  if (!supabaseUrl || !supabaseAnon) {
    const appJs = await fs.readFile(localAppJsPath, 'utf8');
    const parsed = parseSupabaseConfigFromAppJs(appJs);
    supabaseUrl = supabaseUrl || parsed.supabaseUrl;
    supabaseAnon = supabaseAnon || parsed.supabaseAnon;
  }

  if (!supabaseUrl || !supabaseAnon) {
    throw new Error('Missing SUPABASE_URL/SUPABASE_ANON (env or public/js/app.js)');
  }

  const pageChecks = [
    {
      path: '/',
      name: '首页可访问 + 核心按钮展示',
      needles: ['免费排盘解读', '立即解锁完整命理报告'],
    },
    {
      path: '/hepan.html',
      name: '合盘页可访问 + 合盘支付入口',
      needles: ['合盘配对', '立即解锁合盘报告'],
    },
    {
      path: '/blog/',
      name: '命理知识页可访问',
      needles: ['BLOG', '命理'],
    },
    {
      path: '/order-recovery.html',
      name: '订单找回页可访问',
      needles: ['订单', '找回'],
    },
  ];

  for (const item of pageChecks) {
    try {
      const { response, text } = await fetchText(`${baseUrl}${item.path}`);
      const hasNeedles = item.needles.every((needle) => text.includes(needle));
      checks.push({
        name: item.name,
        ok: response.ok && hasNeedles,
        detail: response.ok
          ? (hasNeedles ? 'ok' : `missing_text: ${item.needles.filter((n) => !text.includes(n)).join(', ')}`)
          : `http_${response.status}`,
      });
    } catch (err) {
      checks.push({ name: item.name, ok: false, detail: String(err.message || err) });
    }
  }

  try {
    const analyzePayload = {
      year: 1990,
      month: 1,
      day: 1,
      hour: 0,
      gender: 'male',
      birthplace: 'beijing',
      bazi_str: '庚午年 庚寅月 戊申日 庚申时',
      dayun_text: '甲子(ageStart:36,yearStart:2024)',
      special_years_text: '2026 丙午 (current): check cadence',
      start_age: 6,
      free_only: true,
      stream: false,
      service: 'bazi',
    };
    const { response, text, data } = await fetchJson(`${supabaseUrl}/functions/v1/analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnon}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analyzePayload),
    }, 60000);

    const analysis = String(data?.analysis || '');
    const ok = response.ok && analysis.length >= 150 && /第\s*1\s*段|第1段|Section 1/i.test(analysis);
    checks.push({
      name: '免费报告生成（analyze）',
      ok,
      detail: response.ok ? `analysis_len=${analysis.length}` : `http_${response.status}: ${text.slice(0, 160)}`,
    });
  } catch (err) {
    checks.push({ name: '免费报告生成（analyze）', ok: false, detail: String(err.message || err) });
  }

  const paymentCases = [
    {
      key: 'basic',
      tradeNo: 'bazi-health-basic',
      optionId: 'basic',
      title: 'Bazi Starter Report',
      fee: '99',
      birthInput: buildBaziBirthInput('basic', 'Bazi Starter Report', '99'),
      isWeChat: false,
      name: '支付按钮-入门版（create-payment）',
    },
    {
      key: 'pro',
      tradeNo: 'bazi-health-pro',
      optionId: 'pro',
      title: 'Bazi Advanced Report',
      fee: '199',
      birthInput: buildBaziBirthInput('pro', 'Bazi Advanced Report', '199'),
      isWeChat: false,
      name: '支付按钮-进阶版（create-payment）',
    },
    {
      key: 'vip',
      tradeNo: 'bazi-health-vip',
      optionId: 'vip',
      title: 'Bazi Premium Full Report',
      fee: '299',
      birthInput: buildBaziBirthInput('vip', 'Bazi Premium Full Report', '299'),
      isWeChat: false,
      name: '支付按钮-完整版（create-payment）',
    },
    {
      key: 'consult',
      tradeNo: 'bazi-health-consult',
      optionId: 'consult',
      title: '1v1 Destiny Consultation',
      fee: '499',
      birthInput: buildBaziBirthInput('consult', '1v1 Destiny Consultation', '499'),
      isWeChat: false,
      name: '支付按钮-1对1咨询（create-payment）',
    },
    {
      key: 'pdf',
      tradeNo: 'bazi-health-pdf',
      optionId: 'pdf',
      title: 'Bazi PDF Document',
      fee: '19.9',
      birthInput: buildPdfBirthInput(),
      isWeChat: false,
      name: '支付按钮-PDF（create-payment）',
    },
    {
      key: 'hepan',
      tradeNo: 'bazi-health-hepan',
      optionId: 'vip',
      title: '合盘测算报告',
      fee: '199',
      birthInput: buildHepanBirthInput(),
      isWeChat: false,
      name: '支付按钮-合盘（create-payment）',
    },
    {
      key: 'wx-fallback',
      tradeNo: `bazi-health-wx-${randomSuffix()}`,
      optionId: 'basic',
      title: 'Bazi Starter Report',
      fee: '99',
      birthInput: buildBaziBirthInput('basic', 'Bazi Starter Report', '99'),
      isWeChat: true,
      name: '微信环境支付兜底（create-payment）',
    },
  ];

  for (const item of paymentCases) {
    try {
      await ensureOrderExists({
        supabaseUrl,
        supabaseAnon,
        tradeNo: item.tradeNo,
        birthInput: item.birthInput,
      });
      await createPaymentAndValidate({
        supabaseUrl,
        supabaseAnon,
        tradeNo: item.tradeNo,
        paymentOptionId: item.optionId,
        paymentOptionTitle: item.title,
        totalFee: item.fee,
        birthInput: item.birthInput,
        isWeChat: item.isWeChat,
        checkName: item.name,
        checks,
      });
    } catch (err) {
      checks.push({ name: item.name, ok: false, detail: String(err.message || err) });
    }
  }

  const paidProbeTradeNo = String(process.env.HEALTHCHECK_PAID_TRADE_NO || '').trim();
  if (paidProbeTradeNo) {
    try {
      const { response, text, data } = await fetchJson(`${supabaseUrl}/functions/v1/analyze`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnon}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trade_no: paidProbeTradeNo,
          service: 'bazi',
          free_only: false,
          stream: false,
        }),
      }, 70000);
      const analysis = String(data?.analysis || '');
      const ok = response.ok && analysis.length >= 400;
      checks.push({
        name: '付费报告生成（可选探针）',
        ok,
        detail: response.ok ? `analysis_len=${analysis.length}, trade_no=${paidProbeTradeNo}` : `http_${response.status}: ${text.slice(0, 180)}`,
      });
    } catch (err) {
      checks.push({ name: '付费报告生成（可选探针）', ok: false, detail: String(err.message || err) });
    }
  } else {
    checks.push({
      name: '付费报告生成（可选探针）',
      ok: true,
      detail: 'skipped: set HEALTHCHECK_PAID_TRADE_NO to enable full paid-generation probe',
    });
  }

  const failed = checks.filter((x) => !x.ok);
  const passed = checks.length - failed.length;
  const report = {
    started_at: startAt,
    finished_at: nowIso(),
    base_url: baseUrl,
    checks_total: checks.length,
    checks_passed: passed,
    checks_failed: failed.length,
    checks,
  };

  await fs.writeFile('healthcheck-report.json', JSON.stringify(report, null, 2), 'utf8');

  const title = failed.length === 0 ? '✅ 云子命理每日巡检通过' : '❌ 云子命理每日巡检失败';
  const failedLines = failed.slice(0, 8).map((f) => `- ${f.name}: ${f.detail}`).join('\n');
  const summary = `${title}\n时间: ${report.finished_at}\n通过: ${passed}/${checks.length}\n${failedLines || '- all checks passed'}`;
  console.log(summary);

  const webhook = String(process.env.HEALTHCHECK_NOTIFY_WEBHOOK || '').trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'text',
          text: { content: summary },
        }),
      });
    } catch (err) {
      console.warn('notify webhook failed:', err);
    }
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('healthcheck fatal:', err);
  process.exitCode = 1;
});
