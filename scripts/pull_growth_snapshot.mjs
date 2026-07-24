#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_BASE_URL = 'https://tengyunzi.com';
const DEFAULT_APP_JS_PATH = 'public/js/app.js';
const DEFAULT_OUTPUT_PATH = 'data/growth_snapshot.json';
const DEFAULT_TIMEOUT_MS = Number(process.env.GROWTH_PULL_TIMEOUT_MS || 30000);
const BOT_UA_RE = /(bot|spider|crawler|headless|python-requests|curl|wget|httpclient|scrapy)/i;

function nowIso() {
  return new Date().toISOString();
}

function normalizeBaseUrl(raw) {
  return String(raw || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
}

function asString(value) {
  return String(value == null ? '' : value).trim();
}

function hasText(value) {
  return asString(value).length > 0;
}

function toMillis(value) {
  const ms = Date.parse(asString(value));
  return Number.isFinite(ms) ? ms : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function ratioPct(num, den) {
  if (!den) return 0;
  return Number(((Number(num || 0) / Number(den || 0)) * 100).toFixed(2));
}

function parseSupabaseConfigFromAppJs(appJsText) {
  const urlMatch = appJsText.match(/const\s+SUPABASE_URL\s*=\s*'([^']+)'/);
  const anonMatch = appJsText.match(/const\s+SUPABASE_ANON\s*=\s*'([^']+)'/);
  return {
    supabaseUrl: urlMatch?.[1] || '',
    supabaseAnon: anonMatch?.[1] || '',
  };
}

async function fetchJson(url, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { response, text, data };
  } finally {
    clearTimeout(timeout);
  }
}

function parseEnvValue(raw) {
  let value = String(raw || '').trim();
  if (!value) return '';
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value.replace(/\\n/g, '\n');
}

async function loadEnvFiles(files) {
  for (const rel of files) {
    const abs = path.resolve(rel);
    let content = '';
    try {
      content = await fs.readFile(abs, 'utf8');
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      const value = parseEnvValue(m[2]);
      if (process.env[key] == null || process.env[key] === '') {
        process.env[key] = value;
      }
    }
  }
}

function safeParseJson(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function parseBirthInput(value) {
  return asObject(safeParseJson(value));
}

function parseTracking(birth) {
  return asObject(birth.tracking);
}

function detectService(birth, tradeNo = '') {
  const explicit = asString(birth.order_service || birth.service).toLowerCase();
  if (explicit === 'bazi' || explicit === 'hepan' || explicit === 'pdf') return explicit;
  const optionId = asString(birth.payment_option_id || birth.payment_option?.id).toLowerCase();
  if (optionId === 'pdf') return 'pdf';
  if (asString(tradeNo).toLowerCase().startsWith('hepan-')) return 'hepan';
  return 'bazi';
}

function isBotVisit(meta) {
  if (meta.is_bot === true || String(meta.is_bot).toLowerCase() === 'true') return true;
  const device = asString(meta.device).toLowerCase();
  if (device === 'bot') return true;
  const ua = asString(meta.ua || meta.user_agent);
  return BOT_UA_RE.test(ua);
}

function isTesterVisit(meta) {
  if (meta.is_tester === true || String(meta.is_tester).toLowerCase() === 'true') return true;
  return hasText(meta.tester_id);
}

function isOwnerVisit(meta) {
  if (meta.is_owner_device === true || String(meta.is_owner_device).toLowerCase() === 'true') return true;
  return asString(meta.visit_type).toLowerCase() === 'owner';
}

function computeTrafficDashboard(rows, hours, sinceIso) {
  const ipSet = new Set();
  const visitorSet = new Set();
  const pageAgg = new Map();
  const sourceMediumAgg = new Map();
  const utmSourceAgg = new Map();
  const utmCampaignAgg = new Map();
  let testerVisits = 0;
  let ownerVisits = 0;
  let botVisits = 0;
  let normalVisits = 0;

  for (const row of rows) {
    const meta = asObject(row.meta);
    const ipMasked = asString(meta.ip_masked || 'unknown') || 'unknown';
    const visitorId = asString(meta.visitor_id || row.identifier || '');
    const pagePath = asString(meta.page_path || '/') || '/';
    const pageTitle = asString(meta.page_title || '');
    const utmSource = asString(meta.utm_source || '');
    const utmMedium = asString(meta.utm_medium || '');
    const utmCampaign = asString(meta.utm_campaign || '');
    const sourceMedium = `${utmSource || '(none)'} / ${utmMedium || '(none)'}`;

    if (ipMasked && ipMasked !== 'unknown') ipSet.add(ipMasked);
    if (visitorId) visitorSet.add(visitorId);

    const tester = isTesterVisit(meta);
    const bot = isBotVisit(meta);
    const owner = isOwnerVisit(meta);

    if (tester) testerVisits += 1;
    else if (bot) botVisits += 1;
    else normalVisits += 1;
    if (owner) ownerVisits += 1;

    const pageCur = pageAgg.get(pagePath) || { count: 0, title: pageTitle || '', uniqueIp: new Set() };
    pageCur.count += 1;
    if (!pageCur.title && pageTitle) pageCur.title = pageTitle;
    if (ipMasked && ipMasked !== 'unknown') pageCur.uniqueIp.add(ipMasked);
    pageAgg.set(pagePath, pageCur);

    sourceMediumAgg.set(sourceMedium, Number(sourceMediumAgg.get(sourceMedium) || 0) + 1);
    if (utmSource) utmSourceAgg.set(utmSource, Number(utmSourceAgg.get(utmSource) || 0) + 1);
    if (utmCampaign) utmCampaignAgg.set(utmCampaign, Number(utmCampaignAgg.get(utmCampaign) || 0) + 1);
  }

  const topPages = Array.from(pageAgg.entries())
    .map(([page_path, info]) => ({
      page_path,
      page_title: info.title,
      count: info.count,
      unique_ip: info.uniqueIp.size,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
  const topSourceMedium = Array.from(sourceMediumAgg.entries())
    .map(([source_medium, count]) => ({ source_medium, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
  const topUtmSources = Array.from(utmSourceAgg.entries())
    .map(([utm_source, count]) => ({ utm_source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  const topUtmCampaigns = Array.from(utmCampaignAgg.entries())
    .map(([utm_campaign, count]) => ({ utm_campaign, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    ok: true,
    hours,
    since: sinceIso,
    scanned_rows: rows.length,
    summary: {
      total_visits: rows.length,
      unique_ip: ipSet.size,
      unique_visitor: visitorSet.size,
      tester_visits: testerVisits,
      owner_visits: ownerVisits,
      bot_visits: botVisits,
      normal_visits: normalVisits,
    },
    top_pages: topPages,
    top_source_medium: topSourceMedium,
    top_utm_sources: topUtmSources,
    top_utm_campaigns: topUtmCampaigns,
  };
}

function computeFunnelDashboard(rows, days, sinceIso, sinceMs) {
  const summary = {
    total_orders: 0,
    payment_created: 0,
    paid: 0,
    verified: 0,
    delivered: 0,
  };
  const conversion = {
    order_to_payment_created: 0,
    payment_created_to_paid: 0,
    paid_to_verified: 0,
    verified_to_delivered: 0,
    order_to_delivered: 0,
    order_to_paid: 0,
  };
  const failures = [];
  const byService = {
    bazi: { total: 0, paid: 0, delivered: 0 },
    hepan: { total: 0, paid: 0, delivered: 0 },
    pdf: { total: 0, paid: 0, delivered: 0 },
  };

  for (const row of rows) {
    const tradeNo = asString(row.trade_no);
    if (!tradeNo) continue;
    const createdAt = asString(row.created_at);
    const createdMs = toMillis(createdAt);
    if (!createdMs || createdMs < sinceMs) continue;

    const birth = parseBirthInput(row.birth_input);
    const tracking = parseTracking(birth);
    const service = detectService(birth, tradeNo);
    const paid = Boolean(row.paid);
    const hasAnalysis = hasText(row.analysis);
    const paymentCreated = Boolean(toMillis(tracking.payment_created_at)) || paid;
    const paymentVerified = Boolean(toMillis(tracking.payment_verified_at)) || paid;
    const delivered = service === 'pdf'
      ? Boolean(toMillis(tracking.pdf_download_clicked_at))
      : hasAnalysis || Boolean(toMillis(tracking.report_viewed_at));

    summary.total_orders += 1;
    if (paymentCreated) summary.payment_created += 1;
    if (paid) summary.paid += 1;
    if (paymentVerified) summary.verified += 1;
    if (delivered) summary.delivered += 1;

    if (!byService[service]) byService[service] = { total: 0, paid: 0, delivered: 0 };
    byService[service].total += 1;
    if (paid) byService[service].paid += 1;
    if (delivered) byService[service].delivered += 1;

    const ageMinutes = Math.floor((Date.now() - createdMs) / 60000);
    let issue = '';
    if (paymentCreated && !paid && ageMinutes >= 10) issue = 'payment_not_completed';
    else if (paid && !paymentVerified && ageMinutes >= 2) issue = 'paid_not_verified';
    else if (paid && paymentVerified && !delivered && ageMinutes >= 5) {
      issue = service === 'pdf' ? 'paid_not_downloaded' : 'paid_not_delivered';
    }
    if (issue) {
      failures.push({
        trade_no: tradeNo,
        created_at: createdAt,
        service,
        paid,
        has_analysis: hasAnalysis,
        issue,
        age_minutes: ageMinutes,
      });
    }
  }

  failures.sort((a, b) => Number(b.age_minutes || 0) - Number(a.age_minutes || 0));

  conversion.order_to_payment_created = ratioPct(summary.payment_created, summary.total_orders);
  conversion.payment_created_to_paid = ratioPct(summary.paid, summary.payment_created);
  conversion.paid_to_verified = ratioPct(summary.verified, summary.paid);
  conversion.verified_to_delivered = ratioPct(summary.delivered, summary.verified);
  conversion.order_to_delivered = ratioPct(summary.delivered, summary.total_orders);
  conversion.order_to_paid = ratioPct(summary.paid, summary.total_orders);

  return {
    ok: true,
    days,
    since: sinceIso,
    scanned_rows: rows.length,
    summary,
    conversion,
    by_service: byService,
    failures: failures.slice(0, 80),
  };
}

async function queryVisitRows({ supabaseUrl, authKey, sinceIso, limit }) {
  const url = new URL(`${supabaseUrl}/rest/v1/api_abuse_logs`);
  url.searchParams.set('select', 'created_at,scope,event,identifier,meta');
  url.searchParams.set('scope', 'eq.site_visit');
  url.searchParams.set('event', 'eq.page_view');
  url.searchParams.set('created_at', `gte.${sinceIso}`);
  url.searchParams.set('order', 'created_at.desc');
  url.searchParams.set('limit', String(limit));

  const { response, text, data } = await fetchJson(url.toString(), {
    method: 'GET',
    headers: {
      apikey: authKey,
      Authorization: `Bearer ${authKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`postgrest_site_visits_failed(${response.status}): ${text.slice(0, 200)}`);
  }
  return Array.isArray(data) ? data : [];
}

async function queryOrderRows({ supabaseUrl, authKey, sinceIso, limit }) {
  const url = new URL(`${supabaseUrl}/rest/v1/orders`);
  url.searchParams.set('select', 'trade_no,paid,analysis,created_at,birth_input');
  url.searchParams.set('created_at', `gte.${sinceIso}`);
  url.searchParams.set('order', 'created_at.desc');
  url.searchParams.set('limit', String(limit));

  const { response, text, data } = await fetchJson(url.toString(), {
    method: 'GET',
    headers: {
      apikey: authKey,
      Authorization: `Bearer ${authKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`postgrest_orders_failed(${response.status}): ${text.slice(0, 200)}`);
  }
  return Array.isArray(data) ? data : [];
}

function scoreByTarget(actual, target) {
  const t = Number(target || 0);
  if (!t || t <= 0) return 100;
  return clamp((Number(actual || 0) / t) * 100, 0, 120);
}

function readNumberEnv(name, fallback) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) ? raw : fallback;
}

function buildFinalScore(metrics) {
  const targets = {
    visits_24h: readNumberEnv('TARGET_VISITS_24H', 300),
    orders_7d: readNumberEnv('TARGET_ORDERS_7D', 30),
    paid_rate_pct: readNumberEnv('TARGET_PAID_RATE_PCT', 40),
    delivered_rate_pct: readNumberEnv('TARGET_DELIVERED_RATE_PCT', 30),
  };

  const visitScore = scoreByTarget(metrics.visits_24h, targets.visits_24h);
  const leadScore = scoreByTarget(metrics.orders_7d, targets.orders_7d);
  const paidScore = scoreByTarget(metrics.order_to_paid_pct, targets.paid_rate_pct);
  const deliveredScore = scoreByTarget(metrics.order_to_delivered_pct, targets.delivered_rate_pct);

  const botPenalty = clamp(metrics.bot_visit_ratio_pct * 0.6, 0, 35);
  const failurePenalty = clamp(metrics.unresolved_failures_7d * 2, 0, 25);
  const complianceScore = clamp(100 - botPenalty - failurePenalty, 0, 100);

  const weighted = (
    visitScore * 0.2 +
    leadScore * 0.2 +
    paidScore * 0.2 +
    deliveredScore * 0.2 +
    complianceScore * 0.2
  );

  return {
    final_score: Number(weighted.toFixed(2)),
    sub_scores: {
      visit: Number(visitScore.toFixed(2)),
      leads: Number(leadScore.toFixed(2)),
      paid_conversion: Number(paidScore.toFixed(2)),
      delivered_conversion: Number(deliveredScore.toFixed(2)),
      compliance: Number(complianceScore.toFixed(2)),
    },
    targets,
    penalties: {
      bot_penalty: Number(botPenalty.toFixed(2)),
      unresolved_failure_penalty: Number(failurePenalty.toFixed(2)),
    },
  };
}

function decidePolicy(finalScore, botRatioPct) {
  if (botRatioPct > 30) {
    return {
      policy: 'pause_risky_channels',
      reason: 'bot_ratio_too_high',
    };
  }
  if (finalScore >= 80) {
    return {
      policy: 'scale_up',
      reason: 'high_performance',
    };
  }
  if (finalScore >= 60) {
    return {
      policy: 'keep_and_micro_optimize',
      reason: 'stable_performance',
    };
  }
  if (finalScore >= 40) {
    return {
      policy: 'reduce_frequency_and_rewrite',
      reason: 'below_target',
    };
  }
  return {
    policy: 'pause_and_diagnose',
    reason: 'low_performance',
  };
}

async function callAdminTool({ toolUrl, anonKey, adminToken, baseUrl, action, payload }) {
  const body = { action, ...(payload || {}) };
  const { response, text, data } = await fetchJson(toolUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      'x-admin-token': adminToken,
      Origin: baseUrl,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`admin_orders_${action}_failed(${response.status}): ${text.slice(0, 200)}`);
  }
  if (!data || data.ok !== true) {
    throw new Error(`admin_orders_${action}_invalid_response`);
  }
  return data;
}

async function run() {
  await loadEnvFiles(['.env.local', '.env']);

  const baseUrl = normalizeBaseUrl(process.env.BASE_URL);
  const appJsPath = process.env.APP_JS_PATH || DEFAULT_APP_JS_PATH;
  const outputPath = process.env.GROWTH_OUTPUT_PATH || DEFAULT_OUTPUT_PATH;
  const adminToken = String(process.env.ADMIN_DASHBOARD_TOKEN || '').trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  let supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
  let supabaseAnon = String(process.env.SUPABASE_ANON || '').trim();
  if (!supabaseUrl || !supabaseAnon) {
    const appJsText = await fs.readFile(appJsPath, 'utf8');
    const parsed = parseSupabaseConfigFromAppJs(appJsText);
    supabaseUrl = supabaseUrl || parsed.supabaseUrl;
    supabaseAnon = supabaseAnon || parsed.supabaseAnon;
  }

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL (env or app.js)');
  }
  if (!supabaseAnon) {
    throw new Error('Missing SUPABASE_ANON (env or app.js)');
  }

  const hours24 = clamp(readNumberEnv('TRAFFIC_WINDOW_HOURS', 24), 1, 720);
  const hours7d = clamp(readNumberEnv('TRAFFIC_WINDOW_HOURS_7D', 168), 1, 720);
  const funnelDays = clamp(readNumberEnv('FUNNEL_WINDOW_DAYS', 7), 1, 30);
  const maxVisitRows = clamp(readNumberEnv('MAX_VISIT_ROWS', 8000), 500, 20000);
  const maxOrderRows = clamp(readNumberEnv('MAX_ORDER_ROWS', 3000), 200, 10000);

  let traffic24h;
  let traffic7d;
  let funnel;
  let sourceMode = '';

  if (adminToken) {
    if (!supabaseAnon) {
      throw new Error('ADMIN_DASHBOARD_TOKEN is set but SUPABASE_ANON is missing');
    }
    const toolUrl = `${supabaseUrl}/functions/v1/admin-orders`;
    traffic24h = await callAdminTool({
      toolUrl,
      anonKey: supabaseAnon,
      adminToken,
      baseUrl,
      action: 'site_visit_dashboard',
      payload: { hours: hours24, limit: maxVisitRows },
    });
    traffic7d = await callAdminTool({
      toolUrl,
      anonKey: supabaseAnon,
      adminToken,
      baseUrl,
      action: 'site_visit_dashboard',
      payload: { hours: hours7d, limit: maxVisitRows },
    });
    funnel = await callAdminTool({
      toolUrl,
      anonKey: supabaseAnon,
      adminToken,
      baseUrl,
      action: 'funnel',
      payload: { days: funnelDays, max_rows: maxOrderRows },
    });
    sourceMode = 'admin_orders_function';
  } else {
    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for direct database reads');
    }
    const since24Iso = new Date(Date.now() - hours24 * 60 * 60 * 1000).toISOString();
    const since7dIso = new Date(Date.now() - hours7d * 60 * 60 * 1000).toISOString();
    const sinceFunnelMs = Date.now() - funnelDays * 24 * 60 * 60 * 1000;
    const sinceFunnelIso = new Date(sinceFunnelMs).toISOString();

    const rows24 = await queryVisitRows({
      supabaseUrl,
      authKey: serviceRoleKey,
      sinceIso: since24Iso,
      limit: maxVisitRows,
    });
    const rows7d = await queryVisitRows({
      supabaseUrl,
      authKey: serviceRoleKey,
      sinceIso: since7dIso,
      limit: maxVisitRows,
    });
    const orderRows = await queryOrderRows({
      supabaseUrl,
      authKey: serviceRoleKey,
      sinceIso: sinceFunnelIso,
      limit: maxOrderRows,
    });

    traffic24h = computeTrafficDashboard(rows24, hours24, since24Iso);
    traffic7d = computeTrafficDashboard(rows7d, hours7d, since7dIso);
    funnel = computeFunnelDashboard(orderRows, funnelDays, sinceFunnelIso, sinceFunnelMs);
    sourceMode = 'service_role_postgrest';
  }

  const summary24 = traffic24h.summary || {};
  const summary7d = traffic7d.summary || {};
  const funnelSummary = funnel.summary || {};
  const conversion = funnel.conversion || {};
  const failures = Array.isArray(funnel.failures) ? funnel.failures : [];

  const metrics = {
    visits_24h: Number(summary24.total_visits || 0),
    unique_visitors_24h: Number(summary24.unique_visitor || 0),
    visits_7d: Number(summary7d.total_visits || 0),
    unique_visitors_7d: Number(summary7d.unique_visitor || 0),
    bot_visit_ratio_pct: ratioPct(summary24.bot_visits || 0, summary24.total_visits || 0),
    orders_7d: Number(funnelSummary.total_orders || 0),
    paid_orders_7d: Number(funnelSummary.paid || 0),
    delivered_orders_7d: Number(funnelSummary.delivered || 0),
    order_to_paid_pct: Number(conversion.order_to_paid || 0),
    order_to_delivered_pct: Number(conversion.order_to_delivered || 0),
    unresolved_failures_7d: failures.length,
  };

  const score = buildFinalScore(metrics);
  const policy = decidePolicy(score.final_score, metrics.bot_visit_ratio_pct);

  const output = {
    generated_at_utc: nowIso(),
    windows: {
      traffic_hours_24: hours24,
      traffic_hours_7d: hours7d,
      funnel_days: funnelDays,
    },
    metrics,
    score,
    policy,
    raw: {
      source_mode: sourceMode,
      traffic_24h: traffic24h,
      traffic_7d: traffic7d,
      funnel,
    },
  };

  const outAbs = path.resolve(outputPath);
  await fs.mkdir(path.dirname(outAbs), { recursive: true });
  await fs.writeFile(outAbs, JSON.stringify(output, null, 2), 'utf8');

  console.log(`Wrote growth snapshot: ${outAbs}`);
  console.log(`Source mode: ${sourceMode}`);
  console.log(`Final score: ${score.final_score} | Policy: ${policy.policy}`);
}

run().catch((err) => {
  console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
