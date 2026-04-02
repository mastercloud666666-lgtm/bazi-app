#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const SITE_BASE = process.env.SITE_BASE_URL || 'https://tengyunzi.com';
const SNAPSHOT_PATH = process.env.GROWTH_SNAPSHOT_PATH || 'data/growth_snapshot.json';
const OUTPUT_DIR = process.env.DISTRIBUTION_OUTPUT_DIR || 'data/distribution';
const WEBHOOK_URL = String(process.env.GROWTH_DISTRIBUTION_WEBHOOK || '').trim();
const WEBHOOK_TIMEOUT_MS = Number(process.env.GROWTH_DISTRIBUTION_WEBHOOK_TIMEOUT_MS || 20000);

const LANDING_PAGES = [
  {
    id: 'hunyin',
    path: '/bazi-hunyin.html',
    topic: '感情和婚姻',
    hook: '感情反复、关系不稳，很多时候不是你不努力，而是节奏没踩对。',
    cta: '先看你当下感情节奏和关键窗口，再做决定。',
    tags: ['#八字', '#感情运势', '#婚姻', '#命理解读'],
  },
  {
    id: 'shiye',
    path: '/bazi-shiye.html',
    topic: '事业和工作',
    hook: '想换工作、升职、转型，先判断你处在冲刺期还是修整期。',
    cta: '先看事业盘，避免高成本试错。',
    tags: ['#八字', '#事业运', '#职场', '#命理'],
  },
  {
    id: 'caiyun',
    path: '/bazi-caiyun.html',
    topic: '财运和收入',
    hook: '同样努力，有人进账快有人一直卡住，关键在策略和时机。',
    cta: '先看你的财运结构，再决定是开源还是稳守。',
    tags: ['#八字', '#财运', '#副业', '#命理分析'],
  },
  {
    id: 'hepan',
    path: '/hepan.html',
    topic: '关系合盘',
    hook: '两个人合不合，不只看感觉，也要看长期相处结构。',
    cta: '先看合盘稳定度，再决定关系投入。',
    tags: ['#合盘', '#八字合婚', '#感情', '#关系'],
  },
];

function nowIso() {
  return new Date().toISOString();
}

function formatDateKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatTimeKey(date = new Date()) {
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}${mm}`;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function urlWithUtm(basePath, source, campaign, contentId) {
  const url = new URL(basePath, SITE_BASE);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', contentId);
  return url.toString();
}

function pickLandingPage(score, policy) {
  const seed = new Date().getUTCHours();
  if (policy === 'pause_risky_channels') {
    return LANDING_PAGES.find((x) => x.id === 'hunyin') || LANDING_PAGES[0];
  }
  if (score >= 80) {
    return LANDING_PAGES.find((x) => x.id === 'hepan') || LANDING_PAGES[0];
  }
  if (score >= 60) {
    return LANDING_PAGES[seed % LANDING_PAGES.length];
  }
  return LANDING_PAGES.find((x) => x.id === 'shiye') || LANDING_PAGES[0];
}

function buildXhsPost(page, link, metrics) {
  const body = [
    `${page.hook}`,
    '',
    '我这段时间看了很多案例，最常见的问题不是“要不要做”，而是：',
    '1) 什么时候做胜率更高',
    '2) 该先做哪一步风险更低',
    '3) 哪些信号说明要先稳住',
    '',
    `${page.cta}`,
    `入口：${link}`,
    '',
    ...page.tags,
  ].join('\n');
  return {
    platform: 'xiaohongshu',
    title: `这类${page.topic}问题，先看时机再行动`,
    body,
    char_count: body.length,
    call_to_action: '点击链接先做免费测算',
    expected_metric: metrics,
  };
}

function buildWechatPost(page, link, metrics) {
  const body = [
    `最近很多人问我${page.topic}，我给一个通用建议：`,
    '先判断节奏，再做决定。',
    '',
    `你可以先看这个入口：${link}`,
    '先有框架，再行动，通常更稳。',
  ].join('\n');
  return {
    platform: 'wechat',
    title: `${page.topic}先看节奏`,
    body,
    char_count: body.length,
    call_to_action: '点击链接查看个人节奏',
    expected_metric: metrics,
  };
}

function buildWeiboPost(page, link, metrics) {
  const body = `很多${page.topic}问题，本质是“时机+顺序”。先判断周期，再行动，能少走弯路。入口：${link} ${page.tags.slice(0, 3).join(' ')}`;
  return {
    platform: 'weibo',
    title: `${page.topic}决策提醒`,
    body,
    char_count: body.length,
    call_to_action: '打开链接先看测算',
    expected_metric: metrics,
  };
}

function buildActionPlan(score, policy, botRatio) {
  if (policy === 'pause_risky_channels') {
    return [
      '暂停高风险渠道自动发布，改为人工审核后发布。',
      '本轮仅发教育型内容，不做强促销话术。',
      '检查异常流量来源，清理疑似机器流量入口。',
    ];
  }
  if (score >= 80) {
    return [
      '保留当前高表现选题，增加同主题变体内容。',
      '将高转化落地页在下个时段重复投放1次。',
      '保持UTM一致，便于对比素材效果。',
    ];
  }
  if (score >= 60) {
    return [
      '维持当前发布频次，每轮只调整1个变量（标题或开头钩子）。',
      '优先投放最近7天有过转化的主题。',
      '对低互动文案做A/B版本备份。',
    ];
  }
  return [
    '降频并重写文案开头，减少泛流量词。',
    '优先发布高意图主题，避免过宽泛内容。',
    `当前风险提示：bot比率${botRatio.toFixed(2)}%，请先控制噪音流量。`,
  ];
}

function markdownReport(pack) {
  const lines = [];
  lines.push('# Content Distribution Pack');
  lines.push('');
  lines.push(`- Generated: ${pack.generated_at_utc}`);
  lines.push(`- Policy: ${pack.policy}`);
  lines.push(`- Score: ${pack.score}`);
  lines.push(`- Landing page: ${pack.landing_page.path}`);
  lines.push('');
  lines.push('## Actions');
  for (const item of pack.action_plan) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Posts');
  for (const post of pack.posts) {
    lines.push(`### ${post.platform}`);
    lines.push(`- Title: ${post.title}`);
    lines.push(`- CTA: ${post.call_to_action}`);
    lines.push(`- Chars: ${post.char_count}`);
    lines.push('```text');
    lines.push(post.body);
    lines.push('```');
    lines.push('');
  }
  return lines.join('\n');
}

async function postWebhook(payload) {
  if (!WEBHOOK_URL) {
    return { enabled: false, sent: false };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    return {
      enabled: true,
      sent: res.ok,
      status: res.status,
      response_preview: String(text || '').slice(0, 240),
    };
  } catch (err) {
    return {
      enabled: true,
      sent: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const snapshotText = await fs.readFile(SNAPSHOT_PATH, 'utf8').catch(() => '');
  const snapshot = safeParseJson(snapshotText);
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error(`Missing or invalid growth snapshot: ${SNAPSHOT_PATH}`);
  }

  const score = Number(snapshot?.score?.final_score || 0);
  const policy = String(snapshot?.policy?.policy || 'keep_and_micro_optimize');
  const metrics = snapshot?.metrics || {};
  const botRatio = Number(metrics.bot_visit_ratio_pct || 0);
  const campaign = `growth_${formatDateKey()}`;
  const page = pickLandingPage(score, policy);

  const xhsLink = urlWithUtm(page.path, 'xiaohongshu', campaign, `${page.id}_xhs`);
  const wechatLink = urlWithUtm(page.path, 'wechat', campaign, `${page.id}_wechat`);
  const weiboLink = urlWithUtm(page.path, 'weibo', campaign, `${page.id}_weibo`);

  const expectedMetric = {
    target_clicks_24h: score >= 80 ? 60 : score >= 60 ? 40 : 25,
    target_leads_24h: score >= 80 ? 8 : score >= 60 ? 5 : 3,
  };

  const pack = {
    generated_at_utc: nowIso(),
    score,
    policy,
    source_mode: String(snapshot?.raw?.source_mode || ''),
    landing_page: page,
    links: {
      xiaohongshu: xhsLink,
      wechat: wechatLink,
      weibo: weiboLink,
    },
    action_plan: buildActionPlan(score, policy, botRatio),
    posts: [
      buildXhsPost(page, xhsLink, expectedMetric),
      buildWechatPost(page, wechatLink, expectedMetric),
      buildWeiboPost(page, weiboLink, expectedMetric),
    ],
  };

  const dateKey = formatDateKey();
  const timeKey = formatTimeKey();
  const outDir = path.resolve(OUTPUT_DIR);
  await fs.mkdir(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `distribution_pack_${dateKey}_${timeKey}.json`);
  const mdPath = path.join(outDir, `distribution_pack_${dateKey}_${timeKey}.md`);
  const latestJsonPath = path.join(outDir, 'latest.json');
  const latestMdPath = path.join(outDir, 'latest.md');

  await fs.writeFile(jsonPath, JSON.stringify(pack, null, 2), 'utf8');
  await fs.writeFile(mdPath, markdownReport(pack), 'utf8');
  await fs.writeFile(latestJsonPath, JSON.stringify(pack, null, 2), 'utf8');
  await fs.writeFile(latestMdPath, markdownReport(pack), 'utf8');

  const webhookResult = await postWebhook(pack);
  const runtime = {
    generated_at_utc: pack.generated_at_utc,
    pack_json: jsonPath,
    pack_md: mdPath,
    latest_json: latestJsonPath,
    latest_md: latestMdPath,
    webhook: webhookResult,
  };
  await fs.writeFile(path.join(outDir, 'runtime.json'), JSON.stringify(runtime, null, 2), 'utf8');

  console.log(`Wrote distribution pack: ${jsonPath}`);
  console.log(`Policy: ${policy} | Score: ${score}`);
  if (webhookResult.enabled) {
    console.log(`Webhook sent: ${webhookResult.sent} (status=${webhookResult.status || 0})`);
  } else {
    console.log('Webhook skipped (GROWTH_DISTRIBUTION_WEBHOOK is empty).');
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
