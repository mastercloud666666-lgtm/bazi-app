#!/usr/bin/env node
// Reports PayPal orders the buyer approved but that were never captured.
//
// A PayPal order created with intent CAPTURE is only authorised when the buyer
// approves it; the money moves when capture is called, and that call comes from the
// return page. Every lost return trip (closed tab, dropped connection, app switch)
// leaves an approved order that will never be charged unless something sweeps for it.
//
// This runs in report-only mode by default. Settling means charging people who are
// not at the keyboard, so it stays a deliberate act: pass RECONCILE_APPLY=true (or
// --apply) to actually capture.
import fs from 'node:fs/promises';

const DEFAULT_OUTPUT_PATH = 'reconcile-report.json';
const DEFAULT_TIMEOUT_MS = Number(process.env.RECONCILE_TIMEOUT_MS || 60000);

function asString(value) {
  return String(value == null ? '' : value).trim();
}

async function postJson(url, body, headers, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
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

function summarise(results) {
  const byState = {};
  for (const row of results) {
    const state = asString(row.state) || 'unknown';
    byState[state] = (byState[state] || 0) + 1;
  }
  return byState;
}

async function run() {
  const supabaseUrl = asString(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const supabaseAnon = asString(process.env.SUPABASE_ANON);
  const adminToken = asString(process.env.ADMIN_DASHBOARD_TOKEN);
  const outputPath = asString(process.env.RECONCILE_OUTPUT_PATH) || DEFAULT_OUTPUT_PATH;
  const lookbackDays = Number(process.env.RECONCILE_LOOKBACK_DAYS || 7);
  const limit = Number(process.env.RECONCILE_LIMIT || 100);
  const apply = process.argv.includes('--apply') || asString(process.env.RECONCILE_APPLY) === 'true';

  const missing = [
    !supabaseUrl && 'SUPABASE_URL',
    !supabaseAnon && 'SUPABASE_ANON',
    !adminToken && 'ADMIN_DASHBOARD_TOKEN',
  ].filter(Boolean);
  if (missing.length) {
    console.error(`reconcile: missing required env: ${missing.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const { response, data, text } = await postJson(
    `${supabaseUrl}/functions/v1/paypal`,
    { action: 'reconcile', dry_run: !apply, lookback_days: lookbackDays, limit },
    {
      apikey: supabaseAnon,
      Authorization: `Bearer ${supabaseAnon}`,
      'x-admin-token': adminToken,
    },
  );

  if (!response.ok || !data?.ok) {
    console.error(`reconcile: request failed (${response.status})`, data || text);
    process.exitCode = 1;
    return;
  }

  const results = Array.isArray(data.results) ? data.results : [];
  const byState = summarise(results);
  const actionable = results.filter((row) => row.state === 'would_settle' || row.state === 'settled');
  const failures = results.filter((row) => row.state === 'settle_failed' || row.state === 'lookup_failed');

  const report = {
    generated_at_utc: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry_run',
    lookback_days: data.lookback_days ?? lookbackDays,
    scanned: data.scanned ?? results.length,
    by_state: byState,
    actionable,
    failures,
    results,
  };
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const summary = [
    `PayPal reconcile (${report.mode})`,
    `scanned=${report.scanned}`,
    `actionable=${actionable.length}`,
    `failures=${failures.length}`,
    Object.entries(byState).map(([k, v]) => `${k}:${v}`).join(' '),
  ].join(' | ');
  console.log(summary);

  const webhook = asString(process.env.RECONCILE_NOTIFY_WEBHOOK);
  // Only ping when there is something a human should act on.
  if (webhook && (actionable.length > 0 || failures.length > 0)) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgtype: 'text', text: { content: summary } }),
      });
    } catch (err) {
      console.warn('reconcile notify webhook failed:', err);
    }
  }

  // Approved-but-uncaptured orders are money left on the table, not a broken build:
  // surface them loudly, but only fail the job when the sweep itself misbehaved.
  if (failures.length > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error('reconcile fatal:', err);
  process.exitCode = 1;
});
