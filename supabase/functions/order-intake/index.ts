import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier,
  corsHeaders,
  consumeRateLimit,
  extractClientIp,
  isAllowedRequestOrigin,
  isLikelyAutomatedUa,
  isSuspiciouslyFastSubmission,
  json as securityJson,
  maskIp,
  recordAbuseLog,
  readMinFormMillis,
  resolveAllowedOrigins,
  tooManyRequestsResponse,
} from '../_shared/security.ts';
import { resolveReportPricing } from '../_shared/report-pricing.ts';
import { resolveTrueSolarTime } from '../_shared/true-solar-time.ts';

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 5;

const PRODUCTS = new Set([
  'Tengyunzi Personal Reading',
  'Tengyunzi 12-Month Forecast',
  'Tengyunzi Reading + Annual Forecast Bundle',
]);

const PRODUCT_CONFIG: Record<string, { optionId: string; amount: string | null; deliveryMethod: string; productSlug: string }> = {
  'Tengyunzi Personal Reading': {
    optionId: 'personal_reading',
    amount: null,
    deliveryMethod: 'tengyunzi_personal_72h',
    productSlug: 'personal_reading',
  },
  'Tengyunzi 12-Month Forecast': {
    optionId: 'forecast',
    amount: '88.00',
    deliveryMethod: 'tengyunzi_annual_forecast_72h',
    productSlug: 'annual_forecast',
  },
  'Tengyunzi Reading + Annual Forecast Bundle': {
    optionId: 'bundle',
    amount: '169.00',
    deliveryMethod: 'tengyunzi_bundle_72h',
    productSlug: 'reading_forecast_bundle',
  },
};

function json(req: Request, body: unknown, status = 200, allowedOrigins = resolveAllowedOrigins()) {
  return securityJson(req, body, status, allowedOrigins);
}

function asString(value: unknown, max = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function readEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const value = Number(String(Deno.env.get(name) || '').trim());
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function normalizeEmail(value: unknown): string {
  return asString(value, 320).toLowerCase();
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function optionalInt(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
}

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function sanitizeProduct(value: unknown): string {
  const product = asString(value, 80);
  return PRODUCTS.has(product) ? product : 'Tengyunzi Personal Reading';
}

function makeTradeNo(): string {
  const token = crypto.randomUUID().replaceAll('-', '').slice(0, 18);
  return `bazi-tzy-${Date.now()}-${token}`;
}

function sanitizeSource(value: unknown): string {
  const cleaned = asString(value, 64).toLowerCase().replace(/[^\w.-]/g, '');
  return cleaned || 'paid-offer';
}

function sanitizeLang(value: unknown): string {
  const lang = asString(value, 24);
  if (['zh-Hans', 'zh-Hant', 'en'].includes(lang)) return lang;
  return lang ? lang.replace(/[^\w-]/g, '').slice(0, 24) : 'en';
}

function sanitizeCalendar(value: unknown): 'solar' | 'lunar' | 'unknown' {
  const calendar = asString(value, 12).toLowerCase();
  if (calendar === 'lunar') return 'lunar';
  if (calendar === 'unknown') return 'unknown';
  return 'solar';
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, unknown> = {};
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const key = rawKey.replace(/[^\w.-]/g, '').slice(0, 48);
    if (!key) continue;
    if (typeof rawValue === 'string') out[key] = rawValue.trim().slice(0, 320);
    else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) out[key] = rawValue;
    else if (typeof rawValue === 'boolean') out[key] = rawValue;
  }
  return out;
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(req, allowedOrigins) });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders(req, allowedOrigins) });
  }

  if (!isAllowedRequestOrigin(req, allowedOrigins)) {
    return json(req, { error: 'origin_not_allowed' }, 403, allowedOrigins);
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot: accept silently so automated submissions do not get useful feedback.
    if (asString(body?.website, 200)) {
      return json(req, { ok: true, submitted: true }, 200, allowedOrigins);
    }

    // Same idea, for bots that skip hidden fields: this form asks for birth details and
    // a written question. Set MIN_FORM_MILLIS_ORDER_INTAKE=0 to disable.
    if (isSuspiciouslyFastSubmission(body?.form_elapsed_ms, readMinFormMillis('MIN_FORM_MILLIS_ORDER_INTAKE', 3000))) {
      return json(req, { ok: true, submitted: true }, 200, allowedOrigins);
    }

    const email = normalizeEmail(body?.email);
    const question = asString(body?.question, 2400);
    if (!isValidEmail(email)) return json(req, { error: 'invalid_email' }, 400, allowedOrigins);
    if (question.length < 10) return json(req, { error: 'question_too_short' }, 400, allowedOrigins);

    const birthYear = optionalInt(body?.birth_year, 1900, 2100);
    const birthMonth = optionalInt(body?.birth_month, 1, 12);
    const birthDay = optionalInt(body?.birth_day, 1, 31);
    if (!birthYear || !birthMonth || !birthDay || !isValidDate(birthYear, birthMonth, birthDay)) {
      return json(req, { error: 'invalid_birth_date' }, 400, allowedOrigins);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { error: 'missing_supabase_env' }, 500, allowedOrigins);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const rateIdentifier = await buildRateLimitIdentifier(req);
    const rateWindowSeconds = readEnvNumber(
      'RATE_LIMIT_ORDER_INTAKE_WINDOW_SECONDS',
      DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      10,
      3600,
    );
    const rateMaxRequests = readEnvNumber(
      'RATE_LIMIT_ORDER_INTAKE_MAX_REQUESTS',
      DEFAULT_RATE_LIMIT_MAX_REQUESTS,
      1,
      60,
    );
    const rateResult = await consumeRateLimit(supabase, {
      scope: 'order-intake',
      identifier: rateIdentifier,
      windowSeconds: rateWindowSeconds,
      maxRequests: rateMaxRequests,
    });

    const userAgent = asString(req.headers.get('user-agent'), 240);
    const clientIpMasked = maskIp(extractClientIp(req));

    if (!rateResult.allowed) {
      await recordAbuseLog(supabase, {
        scope: 'order-intake',
        identifier: rateIdentifier,
        event: 'rate_limited',
        meta: {
          ip_masked: clientIpMasked,
          current_count: rateResult.currentCount,
          max_requests: rateMaxRequests,
          window_seconds: rateWindowSeconds,
        },
      });
      return tooManyRequestsResponse(req, allowedOrigins, {
        message: 'Too many order intake attempts. Please try again later.',
        retryAfterSeconds: rateResult.retryAfterSeconds,
        scope: 'order-intake',
        currentCount: rateResult.currentCount,
      });
    }

    if (Deno.env.get('SECURITY_BLOCK_BOT_UA_ORDER_INTAKE') !== '0' && isLikelyAutomatedUa(userAgent)) {
      await recordAbuseLog(supabase, {
        scope: 'order-intake',
        identifier: rateIdentifier,
        event: 'blocked_bot_ua',
        meta: { ip_masked: clientIpMasked, ua: userAgent.slice(0, 160) },
      });
      return json(req, { error: 'blocked_bot_ua' }, 403, allowedOrigins);
    }

    const product = sanitizeProduct(body?.product);
    const productConfig = PRODUCT_CONFIG[product] || PRODUCT_CONFIG['Tengyunzi Personal Reading'];
    const pricingInput = body?.price_experiment && typeof body.price_experiment === 'object' && !Array.isArray(body.price_experiment)
      ? body.price_experiment as Record<string, unknown>
      : {};
    const pricing = resolveReportPricing(pricingInput.visitor_id);
    if (!pricing && productConfig.amount === null) {
      return json(req, { error: 'pricing_assignment_required' }, 400, allowedOrigins);
    }
    const amount = productConfig.amount || pricing?.manual_price || '99.00';
    const tradeNo = makeTradeNo();
    const intakeId = crypto.randomUUID();
    const name = asString(body?.name, 120) || null;
    const birthHour = asString(body?.birth_hour, 32) || null;
    const birthPlace = asString(body?.birth_place, 180) || null;
    const gender = asString(body?.gender, 40) || null;
    const calendarType = sanitizeCalendar(body?.calendar_type);
    const focusArea = asString(body?.focus_area, 120) || null;
    const eventOne = asString(body?.event_one, 500) || null;
    const eventTwo = asString(body?.event_two, 500) || null;
    const needsAnnualContext = product === 'Tengyunzi 12-Month Forecast'
      || product === 'Tengyunzi Reading + Annual Forecast Bundle';
    if (needsAnnualContext && !birthPlace) {
      return json(req, { error: 'birthplace_required_for_forecast' }, 400, allowedOrigins);
    }
    if (needsAnnualContext && (!eventOne || !eventTwo)) {
      return json(req, { error: 'two_events_required' }, 400, allowedOrigins);
    }
    if (needsAnnualContext && eventOne === eventTwo) {
      return json(req, { error: 'events_must_be_different' }, 400, allowedOrigins);
    }
    const language = sanitizeLang(body?.language);
    const trueSolarTime = await resolveTrueSolarTime({
      year: birthYear,
      month: birthMonth,
      day: birthDay,
      clock: birthHour,
      place: birthPlace,
    });
    const chartBirth = trueSolarTime.corrected_components || {
      year: birthYear,
      month: birthMonth,
      day: birthDay,
      hour: birthHour,
      minute: null,
    };

    const payload = {
      id: intakeId,
      product,
      email,
      email_normalized: email,
      name,
      birth_year: birthYear,
      birth_month: birthMonth,
      birth_day: birthDay,
      birth_hour: birthHour,
      birth_place: birthPlace,
      gender,
      calendar_type: calendarType,
      focus_area: focusArea,
      question,
      event_one: eventOne,
      event_two: eventTwo,
      payment_status: 'checkout_started',
      checkout_provider: 'paypal',
      checkout_session_id: asString(body?.checkout_session_id, 180) || null,
      order_reference: tradeNo,
      source: sanitizeSource(body?.source),
      language,
      page_path: asString(body?.page_path, 240) || null,
      landing_url: asString(body?.landing_url, 500) || null,
      referrer: asString(body?.referrer, 500) || null,
      utm_source: asString(body?.utm_source, 120) || null,
      utm_medium: asString(body?.utm_medium, 120) || null,
      utm_campaign: asString(body?.utm_campaign, 160) || null,
      metadata: {
        ...sanitizeMetadata(body?.metadata),
        payment_option_id: productConfig.optionId,
        product_slug: productConfig.productSlug,
        delivery_method: productConfig.deliveryMethod,
        true_solar_status: trueSolarTime.status,
        true_solar_time: trueSolarTime,
        amount,
        currency: 'USD',
        ip_masked: clientIpMasked,
        user_agent: userAgent.slice(0, 180),
      },
      status: 'needs_payment',
      updated_at: new Date().toISOString(),
    };

    const orderBirthInput = {
      order_service: 'consult',
      product_family: 'tengyunzi_manual',
      delivery_method: productConfig.deliveryMethod,
      intake_id: intakeId,
      product,
      name,
      email,
      year: chartBirth.year,
      month: chartBirth.month,
      day: chartBirth.day,
      hour: chartBirth.hour,
      minute: chartBirth.minute,
      chart_input_source: trueSolarTime.status === 'applied' ? 'true_solar_time' : 'local_clock_time',
      original_birth: {
        year: birthYear,
        month: birthMonth,
        day: birthDay,
        clock: birthHour,
        place: birthPlace,
      },
      true_solar_time: trueSolarTime,
      birth_place: birthPlace,
      gender,
      calendar_type: calendarType,
      focus_area: focusArea,
      question,
      event_one: eventOne,
      event_two: eventTwo,
      lang: language,
      payment_option_id: productConfig.optionId,
      payment_option: {
        id: productConfig.optionId,
        title: product,
        fee: amount,
        currency: 'USD',
      },
      price_experiment: pricing || null,
      consult_intake: {
        nickname: name || '',
        contact: email,
        birth_datetime: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')} ${birthHour || 'unknown'}`,
        true_solar_datetime: trueSolarTime.corrected_local_datetime || '',
        gender: gender || '',
        birthplace: birthPlace || '',
        question: [
          question,
          eventOne ? `Event 1: ${eventOne}` : '',
          eventTwo ? `Event 2: ${eventTwo}` : '',
        ].filter(Boolean).join('\n'),
        preferred_time: 'Email delivery within 72 hours',
        updated_at: new Date().toISOString(),
      },
      tracking: {
        source: sanitizeSource(body?.source),
        intake_created_at: new Date().toISOString(),
      },
    };

    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        trade_no: tradeNo,
        birth_input: JSON.stringify(orderBirthInput),
        paid: false,
        analysis: null,
      });

    if (orderError) {
      return json(req, { error: 'order_create_failed', details: orderError.message }, 500, allowedOrigins);
    }

    const { data, error } = await supabase
      .from('order_intakes')
      .insert(payload)
      .select('id,status,payment_status,created_at')
      .maybeSingle();

    if (error) {
      await supabase.from('orders').delete().eq('trade_no', tradeNo).eq('paid', false);
      return json(req, { error: 'order_intake_insert_failed', details: error.message }, 500, allowedOrigins);
    }

    if (productConfig.optionId === 'personal_reading' && pricing) {
      await supabase.from('report_price_experiment_events').insert({
        ...pricing,
        event_type: 'order_created',
        product: 'personal_reading',
        trade_no: tradeNo,
        page_path: payload.page_path,
        metadata: { intake_id: intakeId },
      });
    }

    return json(req, {
      ok: true,
      submitted: true,
      intake_id: data?.id || null,
      order_reference: tradeNo,
      payment_option_id: productConfig.optionId,
      amount,
      currency: 'USD',
      status: data?.status || 'needs_payment',
      payment_status: data?.payment_status || 'checkout_started',
    }, 200, allowedOrigins);
  } catch (err) {
    return json(req, { error: err instanceof Error ? err.message : String(err) }, 500, allowedOrigins);
  }
});
