import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_PAYMENT_OPTION_IDS = new Set(['basic', 'pro', 'vip', 'pdf']);
const DEFAULT_CORS_ORIGINS = ['https://tengyunzi.com', 'https://www.tengyunzi.com'];
const DEFAULT_SITE_ORIGIN = 'https://tengyunzi.com';
const DEFAULT_PDF_PATH = 'downloads/八字命理合集.pdf';

type JsonRecord = Record<string, unknown>;

function resolveAllowedOrigins(): string[] {
  const fromEnv = (Deno.env.get('ADMIN_DASHBOARD_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_CORS_ORIGINS;
}

function corsHeaders(req: Request): Record<string, string> {
  const allowedOrigins = resolveAllowedOrigins();
  const reqOrigin = (req.headers.get('origin') || '').trim();
  const allowOrigin = reqOrigin && allowedOrigins.includes(reqOrigin) ? reqOrigin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-admin-token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(req),
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function getAdminToken(req: Request): string {
  return (req.headers.get('x-admin-token') || '').trim();
}

function getInternalAuthHeader(req: Request, fallbackToken: string): string {
  const forwarded = asString(req.headers.get('authorization'));
  if (/^Bearer\s+\S+$/i.test(forwarded)) return forwarded;
  return `Bearer ${fallbackToken}`;
}

function validateTradeNo(tradeNo: string): boolean {
  return /^(bazi|hepan)-[a-z0-9_-]{4,140}$/i.test(tradeNo);
}

function normalizePaymentOptionId(value: unknown, fallback = 'basic'): string {
  const id = String(value || '').trim();
  if (id && ALLOWED_PAYMENT_OPTION_IDS.has(id)) return id;
  return fallback;
}

function parseBirthInput(value: unknown): JsonRecord {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as JsonRecord;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonRecord : {};
  } catch {
    return {};
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hasText(value: unknown): boolean {
  return asString(value).length > 0;
}

function parseTracking(birth: JsonRecord): JsonRecord {
  const tracking = birth.tracking;
  if (!tracking || typeof tracking !== 'object' || Array.isArray(tracking)) return {};
  return tracking as JsonRecord;
}

function toMillis(value: unknown): number {
  const text = asString(value);
  if (!text) return 0;
  const ts = Date.parse(text);
  return Number.isFinite(ts) ? ts : 0;
}

function detectService(birth: JsonRecord): 'pdf' | 'hepan' | 'bazi' {
  const service = asString(birth.order_service).toLowerCase();
  if (service === 'pdf') return 'pdf';
  if (service === 'hepan') return 'hepan';
  return 'bazi';
}

function normalizeSiteOrigin(): string {
  const env = asString(Deno.env.get('PUBLIC_SITE_ORIGIN'));
  const base = env || DEFAULT_SITE_ORIGIN;
  return base.replace(/\/+$/, '');
}

function buildPdfDownloadUrl(siteOrigin: string, pathValue: unknown): string {
  const path = asString(pathValue) || DEFAULT_PDF_PATH;
  const normalizedPath = path.replace(/^\/+/, '');
  return encodeURI(`${siteOrigin}/${normalizedPath}`);
}

function buildResumeLinks(siteOrigin: string, tradeNo: string, service: 'pdf' | 'hepan' | 'bazi', birth: JsonRecord) {
  const encodedTradeNo = encodeURIComponent(tradeNo);
  const defaultResultUrl = `${siteOrigin}/result.html?trade_no=${encodedTradeNo}&paid=true`;
  const hepanResultUrl = `${siteOrigin}/hepan.html?trade_no=${encodedTradeNo}`;
  const pdfResumeUrl = `${siteOrigin}/index.html?pdf_paid=1&trade_no=${encodedTradeNo}`;
  const pdfDownloadUrl = buildPdfDownloadUrl(siteOrigin, birth.pdf_download_path);
  const resultUrl = service === 'hepan' ? hepanResultUrl : defaultResultUrl;
  const resumeUrl = service === 'pdf' ? pdfResumeUrl : resultUrl;

  return {
    result_url: resultUrl,
    resume_url: resumeUrl,
    pdf_download_url: service === 'pdf' ? pdfDownloadUrl : '',
  };
}

function buildOrderViewPayload(order: JsonRecord, tradeNo: string) {
  const birth = parseBirthInput(order.birth_input);
  const service = detectService(birth);
  const siteOrigin = normalizeSiteOrigin();
  const links = buildResumeLinks(siteOrigin, tradeNo, service, birth);
  const hasAnalysis = hasText(order.analysis);
  const paid = Boolean(order.paid);
  const deliveryState = !paid
    ? 'unpaid'
    : service === 'pdf'
      ? 'download_ready'
      : hasAnalysis
        ? 'report_ready'
        : 'report_generating';

  return {
    trade_no: tradeNo,
    created_at: asString(order.created_at),
    paid,
    analysis_exists: hasAnalysis,
    service,
    payment_option_id: normalizePaymentOptionId(parseBirthInput(birth.payment_option).id, 'basic'),
    delivery_state: deliveryState,
    result_url: links.result_url,
    resume_url: links.resume_url,
    download_url: links.pdf_download_url || null,
    birth_input: birth,
  };
}

async function triggerAnalyzeForPaidOrder(
  supabaseUrl: string,
  authHeader: string,
  tradeNo: string,
  service: 'pdf' | 'hepan' | 'bazi',
  birth: JsonRecord,
): Promise<boolean> {
  if (service === 'pdf') return false;

  const basePayload: JsonRecord = {
    trade_no: tradeNo,
    service: service === 'hepan' ? 'hepan' : 'bazi',
    free_only: false,
    payment_option_id: normalizePaymentOptionId(parseBirthInput(birth.payment_option).id, 'basic'),
  };

  if (service === 'hepan') {
    basePayload.man_bazi_str = birth.man_bazi_str;
    basePayload.woman_bazi_str = birth.woman_bazi_str;
    basePayload.man_dayun = birth.man_dayun;
    basePayload.woman_dayun = birth.woman_dayun;
    basePayload.current_year = birth.current_year;
  } else {
    basePayload.year = birth.year;
    basePayload.month = birth.month;
    basePayload.day = birth.day;
    basePayload.hour = birth.hour;
    basePayload.gender = birth.gender;
    basePayload.bazi_str = birth.bazi_str;
    basePayload.dayun_text = birth.dayun_text;
    basePayload.special_years_text = birth.special_years_text;
    basePayload.start_age = birth.start_age;
  }

  fetch(`${supabaseUrl}/functions/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(basePayload),
  }).catch((err) => {
    console.error('admin resend analyze trigger failed:', err);
  });

  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({} as JsonRecord));
    const expectedAdminToken = (Deno.env.get('ADMIN_DASHBOARD_TOKEN') || '').trim();
    if (!expectedAdminToken) return json(req, { error: 'missing_admin_token_env' }, 500);

    const providedToken = getAdminToken(req);
    if (!providedToken || !timingSafeEqual(providedToken, expectedAdminToken)) {
      return json(req, { error: 'unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return json(req, { error: 'missing_supabase_env' }, 500);
    const supabase = createClient(supabaseUrl, serviceKey);
    const internalAuthHeader = getInternalAuthHeader(req, serviceKey);

    const action = String((body as JsonRecord).action || '').trim();
    if (!action) return json(req, { error: 'action_required' }, 400);

    if (action === 'list') {
      const limit = Math.min(Math.max(Number((body as JsonRecord).limit || 50), 1), 100);
      const { data, error } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return json(req, { error: 'list_failed', details: error.message }, 500);
      return json(req, { ok: true, orders: data || [] });
    }

    if (action === 'verify') {
      const tradeNo = String((body as JsonRecord).trade_no || '').trim();
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);

      const reconcileRes = await fetch(`${supabaseUrl}/functions/v1/reconcile-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: internalAuthHeader,
        },
        body: JSON.stringify({ trade_no: tradeNo }),
      });
      const reconcileData = await reconcileRes.json().catch(() => ({}));
      if (!reconcileRes.ok) {
        return json(req, {
          error: 'verify_failed',
          status: reconcileRes.status,
          details: reconcileData,
        }, 502);
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (orderError) return json(req, { error: 'order_query_failed', details: orderError.message }, 500);
      if (!order) return json(req, { error: 'order_not_found' }, 404);

      return json(req, {
        ok: true,
        trade_no: tradeNo,
        paid: !!order.paid,
        analysis_exists: !!String(order.analysis || '').trim(),
        analysis_triggered: !!reconcileData?.analysis_triggered,
        reconcile: reconcileData,
        order,
      });
    }

    if (action === 'create_order') {
      const birthInput = (body as JsonRecord).birth_input;
      const rawTradeNo = String((body as JsonRecord).trade_no || '').trim();
      const tradeNo = rawTradeNo || `bazi-manual-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);
      if (!birthInput || typeof birthInput !== 'object' || Array.isArray(birthInput)) {
        return json(req, { error: 'invalid_birth_input' }, 400);
      }

      const birthInputStr = JSON.stringify(birthInput);
      if (birthInputStr.length < 2 || birthInputStr.length > 20000) {
        return json(req, { error: 'birth_input_too_large' }, 400);
      }

      const { error } = await supabase.from('orders').insert({
        trade_no: tradeNo,
        paid: false,
        analysis: null,
        birth_input: birthInputStr,
      });
      if (error) return json(req, { error: 'create_order_failed', details: error.message }, 500);
      return json(req, { ok: true, trade_no: tradeNo });
    }

    if (action === 'create_payment') {
      const tradeNo = String((body as JsonRecord).trade_no || '').trim();
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('trade_no,paid,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (orderError) return json(req, { error: 'order_query_failed', details: orderError.message }, 500);
      if (!order) return json(req, { error: 'order_not_found' }, 404);
      if (order.paid) return json(req, { error: 'order_already_paid' }, 409);

      const requestedOptionId = normalizePaymentOptionId((body as JsonRecord).payment_option_id, 'basic');
      const birth = parseBirthInput(order.birth_input);
      const paymentOption = parseBirthInput(birth.payment_option);
      const lockedOptionId = normalizePaymentOptionId(paymentOption.id, '');
      const paymentOptionId = lockedOptionId || requestedOptionId;

      const createRes = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: internalAuthHeader,
        },
        body: JSON.stringify({
          trade_no: tradeNo,
          payment_option_id: paymentOptionId,
          client_env: (body as JsonRecord).client_env || {},
        }),
      });
      const data = await createRes.json().catch(() => ({}));
      if (!createRes.ok || data?.errcode !== 0) {
        return json(req, {
          error: 'create_payment_failed',
          status: createRes.status,
          details: data,
        }, 502);
      }

      return json(req, { ok: true, ...data });
    }

    if (action === 'query_order') {
      const tradeNo = String((body as JsonRecord).trade_no || '').trim();
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (orderError) return json(req, { error: 'order_query_failed', details: orderError.message }, 500);
      if (!order) return json(req, { error: 'order_not_found' }, 404);

      const payload = buildOrderViewPayload(order as JsonRecord, tradeNo);
      return json(req, {
        ok: true,
        order: payload,
      });
    }

    if (action === 'resend_delivery') {
      const tradeNo = String((body as JsonRecord).trade_no || '').trim();
      if (!validateTradeNo(tradeNo)) return json(req, { error: 'invalid_trade_no' }, 400);

      let reconcileData: JsonRecord = {};
      let reconcileFailed = false;
      let reconcileStatus = 0;
      try {
        const reconcileRes = await fetch(`${supabaseUrl}/functions/v1/reconcile-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: internalAuthHeader,
          },
          body: JSON.stringify({ trade_no: tradeNo }),
        });
        reconcileStatus = reconcileRes.status;
        reconcileData = await reconcileRes.json().catch(() => ({} as JsonRecord));
        if (!reconcileRes.ok) reconcileFailed = true;
      } catch (err) {
        reconcileFailed = true;
        reconcileData = { error: err instanceof Error ? err.message : String(err) };
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .eq('trade_no', tradeNo)
        .maybeSingle();
      if (orderError) return json(req, { error: 'order_query_failed', details: orderError.message }, 500);
      if (!order) return json(req, { error: 'order_not_found' }, 404);

      const view = buildOrderViewPayload(order as JsonRecord, tradeNo);
      const birth = parseBirthInput((order as JsonRecord).birth_input);
      const service = detectService(birth);

      let analysisTriggered = Boolean(reconcileData.analysis_triggered);
      if (view.paid && !view.analysis_exists && service !== 'pdf') {
        analysisTriggered = await triggerAnalyzeForPaidOrder(supabaseUrl, internalAuthHeader, tradeNo, service, birth) || analysisTriggered;
      }

      const message = !view.paid
        ? '订单尚未支付，无法补发。请先完成支付。'
        : service === 'pdf'
          ? 'PDF下载链接已补发，可直接发给客户。'
          : view.analysis_exists
            ? '报告已就绪，可直接引导客户打开结果页。'
            : '已触发报告补发，请稍后再次查询或让客户点继续订单。';

      return json(req, {
        ok: true,
        trade_no: tradeNo,
        message,
        reconcile_failed: reconcileFailed,
        reconcile_status: reconcileStatus || null,
        analysis_triggered: analysisTriggered,
        reconcile: reconcileData,
        order: view,
      });
    }

    if (action === 'funnel') {
      const days = Math.min(Math.max(Number((body as JsonRecord).days || 7), 1), 30);
      const maxRows = Math.min(Math.max(Number((body as JsonRecord).max_rows || 1500), 100), 3000);
      const sinceMs = Date.now() - (days * 24 * 60 * 60 * 1000);
      const sinceIso = new Date(sinceMs).toISOString();

      const { data, error } = await supabase
        .from('orders')
        .select('trade_no,paid,analysis,created_at,birth_input')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(maxRows);
      if (error) return json(req, { error: 'funnel_query_failed', details: error.message }, 500);

      const rows = Array.isArray(data) ? data : [];
      const summary = {
        total_orders: 0,
        payment_created: 0,
        paid: 0,
        verified: 0,
        delivered: 0,
      };
      const byService: Record<string, { total: number; paid: number; delivered: number }> = {
        bazi: { total: 0, paid: 0, delivered: 0 },
        hepan: { total: 0, paid: 0, delivered: 0 },
        pdf: { total: 0, paid: 0, delivered: 0 },
      };
      const failures: Array<Record<string, unknown>> = [];

      for (const row of rows) {
        const tradeNo = asString((row as JsonRecord).trade_no);
        if (!tradeNo) continue;

        const createdAt = asString((row as JsonRecord).created_at);
        const createdMs = toMillis(createdAt);
        if (!createdMs || createdMs < sinceMs) continue;

        const birth = parseBirthInput((row as JsonRecord).birth_input);
        const tracking = parseTracking(birth);
        const service = detectService(birth);
        const paid = Boolean((row as JsonRecord).paid);
        const hasAnalysis = hasText((row as JsonRecord).analysis);

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

        byService[service].total += 1;
        if (paid) byService[service].paid += 1;
        if (delivered) byService[service].delivered += 1;

        const ageMinutes = Math.floor((Date.now() - createdMs) / 60000);
        let issue = '';
        if (paymentCreated && !paid && ageMinutes >= 10) {
          issue = 'payment_not_completed';
        } else if (paid && !paymentVerified && ageMinutes >= 2) {
          issue = 'paid_not_verified';
        } else if (paid && paymentVerified && !delivered && ageMinutes >= 5) {
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

      failures.sort((a, b) => Number((b as JsonRecord).age_minutes || 0) - Number((a as JsonRecord).age_minutes || 0));
      const failureRows = failures.slice(0, 80);

      const ratio = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);
      const conversion = {
        order_to_payment_created: ratio(summary.payment_created, summary.total_orders),
        payment_created_to_paid: ratio(summary.paid, summary.payment_created),
        paid_to_verified: ratio(summary.verified, summary.paid),
        verified_to_delivered: ratio(summary.delivered, summary.verified),
        order_to_delivered: ratio(summary.delivered, summary.total_orders),
      };

      return json(req, {
        ok: true,
        days,
        since: sinceIso,
        scanned_rows: rows.length,
        summary,
        conversion,
        by_service: byService,
        failures: failureRows,
      });
    }

    return json(req, { error: 'unsupported_action' }, 400);
  } catch (err) {
    return json(req, { error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
