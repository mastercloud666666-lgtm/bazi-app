import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  isAllowedRequestOrigin,
  resolveAllowedOrigins,
} from '../_shared/security.ts';
import {
  authenticateAdminRequest,
  recordAdminAudit,
} from '../_shared/admin-auth.ts';
import { resolveReportPricing } from '../_shared/report-pricing.ts';

type JsonRecord = Record<string, unknown>;

const FREE_REPORTS_PER_DAY = 3;
let aiCapacityCache: { available: boolean; expiresAt: number } | null = null;

function asString(value: unknown, max = 4000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function numberInRange(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function validDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function tradeNo(): string {
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes).map((value) => value.toString(36)).join('').slice(0, 12);
  return `bazi-en-${Date.now()}-${random}`;
}

function reportTitle(input: JsonRecord): string {
  const year = Number(input.year || 0);
  const month = Number(input.month || 0);
  const day = Number(input.day || 0);
  return year && month && day
    ? `BaZi reading for ${new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}`
    : 'Your BaZi reading';
}

function validateBirth(raw: unknown): { input?: JsonRecord; error?: string } {
  const value = asRecord(raw);
  const year = numberInRange(value.year, 1900, 2100);
  const month = numberInRange(value.month, 1, 12);
  const day = numberInRange(value.day, 1, 31);
  const hour = numberInRange(value.hour, 0, 23);
  const gender = asString(value.gender, 20).toLowerCase();
  const baziStr = asString(value.bazi_str, 160);
  const dayunText = asString(value.dayun_text, 8000);
  const specialYearsText = asString(value.special_years_text, 16000);
  const startAge = numberInRange(value.start_age, 0, 20);

  if (year === null || month === null || day === null || hour === null || !validDate(year, month, day)) {
    return { error: 'invalid_birth_date' };
  }
  if (!['male', 'female'].includes(gender)) return { error: 'invalid_gender' };
  if (!baziStr || baziStr.length < 8) return { error: 'invalid_bazi_chart' };
  if (!dayunText || startAge === null) return { error: 'missing_timing_data' };

  return {
    input: {
      year,
      month,
      day,
      hour,
      hour_known: value.hour_known !== false,
      gender,
      birthplace: asString(value.birthplace, 180),
      timezone: asString(value.timezone, 80),
      bazi_str: baziStr,
      dayun_text: dayunText,
      special_years_text: specialYearsText || 'No major structural markers detected in the calculated range.',
      start_age: startAge,
      lang: 'en',
    },
  };
}

async function authenticatedUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const header = asString(req.headers.get('authorization'), 4000);
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

async function resolveAdminTestUser(
  supabase: ReturnType<typeof createClient>,
  adminSession: { id: string; username: string },
) {
  const email = `admin-test-${adminSession.id}@internal.tengyunzi.invalid`.toLowerCase();
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      system_account: true,
      purpose: 'administrator_ai_test',
      admin_username: adminSession.username,
    },
  });
  if (created?.user) return created.user;

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = usersData?.users?.find((candidate) => candidate.email?.toLowerCase() === email);
  if (existing) return existing;

  throw new Error(createError?.message || listError?.message || 'admin_test_user_unavailable');
}

async function runFreeAnalysis(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  origin: string;
  input: JsonRecord;
  chartData: JsonRecord;
}): Promise<string> {
  const response = await fetch(`${params.supabaseUrl}/functions/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.serviceRoleKey}`,
      apikey: params.serviceRoleKey,
      Origin: params.origin,
      'User-Agent': 'Mozilla/5.0 Tengyunzi-English-Report/1.0',
    },
    body: JSON.stringify({
      ...params.input,
      chart_data: params.chartData,
      service: 'bazi',
      free_only: true,
      stream: false,
      lang: 'en',
      internal_call: true,
    }),
  });
  const data = await response.json().catch(() => ({})) as JsonRecord;
  const analysis = asString(data.analysis, 100000);
  if (!response.ok || !analysis) {
    throw new Error(asString(data.error, 300) || asString(data.message, 300) || `analysis_failed_${response.status}`);
  }
  return analysis;
}

async function runPaidAnalysis(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  origin: string;
  tradeNo: string;
  input: JsonRecord;
  chartData: JsonRecord;
}): Promise<string> {
  const response = await fetch(`${params.supabaseUrl}/functions/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.serviceRoleKey}`,
      apikey: params.serviceRoleKey,
      Origin: params.origin,
      'User-Agent': 'Mozilla/5.0 Tengyunzi-Admin-Test/1.0',
    },
    body: JSON.stringify({
      ...params.input,
      chart_data: params.chartData,
      trade_no: params.tradeNo,
      service: 'bazi',
      free_only: false,
      payment_option_id: 'english_report',
      stream: false,
      lang: 'en',
      internal_call: true,
    }),
  });
  const data = await response.json().catch(() => ({})) as JsonRecord;
  const analysis = asString(data.analysis, 100000);
  if (!response.ok || !analysis) {
    throw new Error(asString(data.error, 300) || asString(data.message, 300) || `analysis_failed_${response.status}`);
  }
  return analysis;
}

async function hasAiCapacity(): Promise<boolean> {
  if (aiCapacityCache && aiCapacityCache.expiresAt > Date.now()) return aiCapacityCache.available;

  const deepSeekKey = asString(Deno.env.get('DEEPSEEK_API_KEY'), 4000);
  if (deepSeekKey) {
    try {
      const response = await fetch('https://api.deepseek.com/user/balance', {
        headers: { Authorization: `Bearer ${deepSeekKey}` },
        signal: AbortSignal.timeout(8000),
      });
      const data = await response.json().catch(() => ({})) as JsonRecord;
      if (response.ok && data.is_available === true) {
        aiCapacityCache = { available: true, expiresAt: Date.now() + 5 * 60 * 1000 };
        return true;
      }
    } catch (error) {}
  }

  const claudeKey = asString(Deno.env.get('CLAUDE_API_KEY'), 4000);
  if (claudeKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: asString(Deno.env.get('CLAUDE_MODEL'), 120) || 'claude-sonnet-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Reply OK.' }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        aiCapacityCache = { available: true, expiresAt: Date.now() + 5 * 60 * 1000 };
        return true;
      }
    } catch (error) {}
  }

  aiCapacityCache = { available: false, expiresAt: Date.now() + 60 * 1000 };
  return false;
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  const headers = corsHeaders(req, allowedOrigins);
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!isAllowedRequestOrigin(req, allowedOrigins)) return json({ error: 'origin_not_allowed' }, 403);

  const body = await req.json().catch(() => ({})) as JsonRecord;
  const action = asString(body.action, 40).toLowerCase();
  if (action === 'status') {
    const available = await hasAiCapacity();
    return json({ ok: true, ai_available: available });
  }

  const supabaseUrl = asString(Deno.env.get('SUPABASE_URL'), 500);
  const serviceRoleKey = asString(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), 4000);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'missing_server_configuration' }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminSession = action === 'create_admin_test'
    ? await authenticateAdminRequest(req, supabase, 'ai_test')
    : null;
  if (action === 'create_admin_test' && !adminSession) {
    return json({ error: 'admin_test_not_authorized' }, 403);
  }

  let user = await authenticatedUser(req, supabase);
  if (action === 'create_admin_test' && !user && adminSession) {
    try {
      user = await resolveAdminTestUser(supabase, adminSession);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return json({ error: 'admin_test_user_unavailable', details: message }, 500);
    }
  }
  if (!user?.id || !user.email) return json({ error: 'authentication_required' }, 401);

  try {
    if (action === 'list') {
      const limit = Math.min(Math.max(Number(body.limit || 40), 1), 100);
      const { data, error } = await supabase
        .from('english_ai_reports')
        .select('id,trade_no,access_type,status,birth_input,chart_data,result_text,error_message,amount,currency,paypal_order_id,is_test,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return json({ error: 'report_list_failed', details: error.message }, 500);
      return json({ ok: true, reports: data || [] });
    }

    if (action === 'get') {
      const id = asString(body.id, 80);
      const requestedTradeNo = asString(body.trade_no, 180);
      if (!id && !requestedTradeNo) return json({ error: 'report_identifier_required' }, 400);
      let query = supabase
        .from('english_ai_reports')
        .select('id,trade_no,access_type,status,birth_input,chart_data,result_text,error_message,amount,currency,paypal_order_id,is_test,created_at,updated_at')
        .eq('user_id', user.id);
      query = id ? query.eq('id', id) : query.eq('trade_no', requestedTradeNo);
      const { data, error } = await query.maybeSingle();
      if (error) return json({ error: 'report_query_failed', details: error.message }, 500);
      if (!data) return json({ error: 'report_not_found' }, 404);
      return json({ ok: true, report: data });
    }

    if (action !== 'create_free' && action !== 'create_paid' && action !== 'create_admin_test') {
      return json({ error: 'unsupported_action' }, 400);
    }

    const validated = validateBirth(body.birth_input);
    if (!validated.input) return json({ error: validated.error || 'invalid_birth_input' }, 400);
    const chartData = asRecord(body.chart_data);
    const experimentInput = asRecord(body.price_experiment);
    const pricing = action === 'create_paid' ? resolveReportPricing(experimentInput.visitor_id) : null;
    if (action === 'create_paid' && !pricing) return json({ error: 'pricing_assignment_required' }, 400);
    const paidAmount = Number(pricing?.ai_price || 0);
    const email = user.email.toLowerCase();

    if (!(await hasAiCapacity())) {
      return json({
        error: 'report_service_temporarily_unavailable',
        message: 'AI reports are temporarily paused while generation capacity is restored.',
      }, 503);
    }

    if (action === 'create_admin_test') {
      if (!adminSession) return json({ error: 'admin_test_not_authorized' }, 403);
      const nextTradeNo = `${tradeNo()}-test`;
      const reportId = crypto.randomUUID();
      const testBirth: JsonRecord = {
        ...validated.input,
        chart_data: chartData,
        product_family: 'tengyunzi_ai',
        product: 'Complete BaZi Reading',
        user_id: user.id,
        email,
        report_id: reportId,
        lang: 'en',
        payment_option_id: 'english_report',
        admin_test: true,
        admin_username: adminSession.username,
      };
      const { error: orderError } = await supabase.from('orders').insert({
        trade_no: nextTradeNo,
        birth_input: JSON.stringify(testBirth),
        paid: true,
        analysis: null,
      });
      if (orderError) return json({ error: 'admin_test_order_failed', details: orderError.message }, 500);

      const { data: report, error: reportError } = await supabase
        .from('english_ai_reports')
        .insert({
          id: reportId,
          user_id: user.id,
          email,
          trade_no: nextTradeNo,
          access_type: 'paid',
          status: 'generating',
          birth_input: validated.input,
          chart_data: chartData,
          amount: 0,
          currency: 'USD',
          is_test: true,
        })
        .select('id,trade_no,access_type,status,birth_input,chart_data,amount,currency,is_test,created_at')
        .single();
      if (reportError || !report) {
        await supabase.from('orders').delete().eq('trade_no', nextTradeNo);
        return json({ error: 'admin_test_report_failed', details: reportError?.message }, 500);
      }

      try {
        const analysis = await runPaidAnalysis({
          supabaseUrl,
          serviceRoleKey,
          origin: allowedOrigins[0] || 'https://www.tengyunzi.com',
          tradeNo: nextTradeNo,
          input: validated.input,
          chartData,
        });
        const writeResults = await Promise.all([
          supabase.from('orders').update({ analysis }).eq('trade_no', nextTradeNo),
          supabase.from('english_ai_reports').update({
            status: 'ready',
            result_text: analysis,
            error_message: null,
          }).eq('id', reportId).eq('user_id', user.id),
          supabase.from('user_records').insert({
            user_id: user.id,
            email,
            type: 'bazi',
            title: `Administrator test: ${reportTitle(validated.input)}`,
            category: 'admin_test_english_report',
            meta: { report_id: reportId, access_type: 'paid', is_test: true },
            result_text: analysis,
            trade_no: nextTradeNo,
          }),
        ]);
        const writeError = writeResults.find((result) => result.error)?.error;
        if (writeError) throw new Error(`admin_test_persistence_failed: ${writeError.message}`);
        await recordAdminAudit(supabase, req, adminSession, 'admin_ai_report_tested', {
          target_type: 'english_ai_report',
          target_id: reportId,
          metadata: { user_id: user.id, email, trade_no: nextTradeNo },
        });
        return json({
          ok: true,
          report: {
            ...report,
            status: 'ready',
            result_text: analysis,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await supabase.from('english_ai_reports').update({
          status: 'failed',
          error_message: message.slice(0, 500),
        }).eq('id', reportId).eq('user_id', user.id);
        return json({ error: 'report_generation_failed', details: message, report_id: reportId }, 502);
      }
    }

    if (action === 'create_free') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from('english_ai_reports')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('access_type', 'free')
        .gte('created_at', since);
      if (countError) return json({ error: 'free_limit_check_failed' }, 500);
      if (Number(count || 0) >= FREE_REPORTS_PER_DAY) {
        return json({ error: 'free_daily_limit_reached', limit: FREE_REPORTS_PER_DAY }, 429);
      }

      const { data: report, error: insertError } = await supabase
        .from('english_ai_reports')
        .insert({
          user_id: user.id,
          email,
          access_type: 'free',
          status: 'generating',
          birth_input: validated.input,
          chart_data: chartData,
          amount: 0,
          currency: 'USD',
        })
        .select('id,created_at')
        .single();
      if (insertError || !report) return json({ error: 'report_create_failed', details: insertError?.message }, 500);

      try {
        const analysis = await runFreeAnalysis({
          supabaseUrl,
          serviceRoleKey,
          origin: allowedOrigins[0] || 'https://www.tengyunzi.com',
          input: validated.input,
          chartData,
        });
        const { error: updateError } = await supabase
          .from('english_ai_reports')
          .update({ status: 'ready', result_text: analysis, error_message: null })
          .eq('id', report.id)
          .eq('user_id', user.id);
        if (updateError) throw new Error(updateError.message);

        await supabase.from('user_records').insert({
          user_id: user.id,
          email,
          type: 'bazi',
          title: reportTitle(validated.input),
          category: 'free_english_report',
          meta: { report_id: report.id, access_type: 'free', ...validated.input },
          result_text: analysis,
        });

        return json({
          ok: true,
          report: {
            id: report.id,
            access_type: 'free',
            status: 'ready',
            birth_input: validated.input,
            chart_data: chartData,
            result_text: analysis,
            amount: 0,
            currency: 'USD',
            created_at: report.created_at,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await supabase
          .from('english_ai_reports')
          .update({ status: 'failed', error_message: message.slice(0, 500) })
          .eq('id', report.id);
        return json({ error: 'report_generation_failed', details: message, report_id: report.id }, 502);
      }
    }

    const nextTradeNo = tradeNo();
    const reportId = crypto.randomUUID();
    const orderBirthInput: JsonRecord = {
      ...validated.input,
      chart_data: chartData,
      order_service: 'bazi',
      product_family: 'tengyunzi_ai',
      product: 'Complete BaZi Reading',
      user_id: user.id,
      email,
      report_id: reportId,
      lang: 'en',
      payment_option_id: 'english_report',
      payment_option: {
        id: 'english_report',
        title: 'Complete BaZi Reading',
        fee: pricing!.ai_price,
        currency: 'USD',
      },
      price_experiment: pricing,
      tracking: { report_created_at: new Date().toISOString(), source: 'tengyunzi-english-report' },
    };

    const { error: orderError } = await supabase.from('orders').insert({
      trade_no: nextTradeNo,
      birth_input: JSON.stringify(orderBirthInput),
      paid: false,
      analysis: null,
    });
    if (orderError) return json({ error: 'order_create_failed', details: orderError.message }, 500);

    const { data: report, error: reportError } = await supabase
      .from('english_ai_reports')
      .insert({
        id: reportId,
        user_id: user.id,
        email,
        trade_no: nextTradeNo,
        access_type: 'paid',
        status: 'awaiting_payment',
        birth_input: validated.input,
        chart_data: chartData,
        amount: paidAmount,
        currency: 'USD',
      })
      .select('id,trade_no,access_type,status,amount,currency,created_at')
      .single();
    if (reportError || !report) {
      await supabase.from('orders').delete().eq('trade_no', nextTradeNo).eq('paid', false);
      return json({ error: 'report_create_failed', details: reportError?.message }, 500);
    }

    await supabase.from('report_price_experiment_events').insert({
      ...pricing,
      event_type: 'order_created',
      product: 'ai_report',
      trade_no: nextTradeNo,
      page_path: '/tengyunzi-report.html',
      metadata: { report_id: reportId },
    });

    return json({ ok: true, report, payment_option_id: 'english_report' });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
