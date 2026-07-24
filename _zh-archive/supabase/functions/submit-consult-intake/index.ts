import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier,
  consumeRateLimit,
  corsHeaders,
  extractClientIp,
  isAllowedRequestOrigin,
  json as securityJson,
  maskIp,
  recordAbuseLog,
  resolveAllowedOrigins,
  tooManyRequestsResponse,
} from '../_shared/security.ts';

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 20;

function json(req: Request, body: unknown, status = 200, allowedOrigins = resolveAllowedOrigins()) {
  return securityJson(req, body, status, allowedOrigins);
}

function validateTradeNo(value: string): boolean {
  return /^(bazi|hepan)-[a-z0-9_-]{4,140}$/i.test(value);
}

function validateConsultNickname(value: string): boolean {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return /[A-Za-z\u4e00-\u9fff]/.test(raw);
}

function validateConsultPhone(value: string): boolean {
  return /^\d{11}$/.test(String(value || '').trim());
}

function readEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const value = Number(String(Deno.env.get(name) || '').trim());
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function parseBirthInput(value: unknown): Record<string, any> {
  let current: unknown = value;
  for (let i = 0; i < 3; i += 1) {
    if (!current) return {};
    if (typeof current === 'object' && !Array.isArray(current)) {
      return current as Record<string, any>;
    }
    if (typeof current === 'string') {
      try {
        current = JSON.parse(current);
        continue;
      } catch {
        return {};
      }
    }
    return {};
  }
  return {};
}

function normalizeGender(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'male' || raw === 'm' || raw.includes('男')) return 'male';
  if (raw === 'female' || raw === 'f' || raw.includes('女')) return 'female';
  return '';
}

function sanitizeIntake(value: unknown) {
  const src = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    nickname: String(src.nickname || '').trim().slice(0, 64),
    contact: String(src.contact || '').trim().slice(0, 120),
    birth_datetime: String(src.birth_datetime || '').trim().slice(0, 64),
    gender: normalizeGender(src.gender),
    birthplace: String(src.birthplace || '').trim().slice(0, 120),
    question: String(src.question || '').trim().slice(0, 2000),
    preferred_time: String(src.preferred_time || '').trim().slice(0, 500),
  };
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
    return json(req, {
      error: 'origin_not_allowed',
      message: '非法来源请求已被拒绝。',
    }, 403, allowedOrigins);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const tradeNo = String(body?.trade_no || '').trim();
    if (!tradeNo || !validateTradeNo(tradeNo)) {
      return json(req, { error: 'invalid_trade_no', message: '订单号格式错误。' }, 400, allowedOrigins);
    }

    const intake = sanitizeIntake(body?.intake);
    if (!intake.nickname) {
      return json(req, { error: 'missing_nickname', message: '称呼为必填项。' }, 400, allowedOrigins);
    }
    if (!validateConsultNickname(intake.nickname)) {
      return json(req, { error: 'invalid_nickname', message: '称呼不能只包含数字或符号。' }, 400, allowedOrigins);
    }
    if (!intake.contact) {
      return json(req, { error: 'missing_contact', message: '联系方式为必填项。' }, 400, allowedOrigins);
    }
    if (!validateConsultPhone(intake.contact)) {
      return json(req, { error: 'invalid_contact', message: '手机号格式错误，请输入 11 位数字。' }, 400, allowedOrigins);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { error: 'missing_supabase_env' }, 500, allowedOrigins);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const rateWindowSeconds = readEnvNumber('RATE_LIMIT_CONSULT_INTAKE_WINDOW_SECONDS', DEFAULT_RATE_LIMIT_WINDOW_SECONDS, 10, 3600);
    const rateMaxRequests = readEnvNumber('RATE_LIMIT_CONSULT_INTAKE_MAX_REQUESTS', DEFAULT_RATE_LIMIT_MAX_REQUESTS, 2, 200);
    const rateIdentifier = await buildRateLimitIdentifier(req);
    const rateResult = await consumeRateLimit(supabase, {
      scope: 'submit-consult-intake',
      identifier: rateIdentifier,
      windowSeconds: rateWindowSeconds,
      maxRequests: rateMaxRequests,
    });
    if (!rateResult.allowed) {
      await recordAbuseLog(supabase, {
        scope: 'submit-consult-intake',
        identifier: rateIdentifier,
        event: 'rate_limited',
        meta: {
          ip_masked: maskIp(extractClientIp(req)),
          current_count: rateResult.currentCount,
          max_requests: rateMaxRequests,
          window_seconds: rateWindowSeconds,
        },
      });
      return tooManyRequestsResponse(req, allowedOrigins, {
        message: '提交过于频繁，请稍后重试。',
        retryAfterSeconds: rateResult.retryAfterSeconds,
        scope: 'submit-consult-intake',
        currentCount: rateResult.currentCount,
      });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('trade_no,birth_input')
      .eq('trade_no', tradeNo)
      .maybeSingle();
    if (orderError) {
      return json(req, { error: 'order_query_failed', details: orderError.message }, 500, allowedOrigins);
    }
    if (!order) {
      return json(req, { error: 'order_not_found', message: '未找到订单。' }, 404, allowedOrigins);
    }

    const birth = parseBirthInput(order.birth_input);
    const existingIntake = birth?.consult_intake && typeof birth.consult_intake === 'object' && !Array.isArray(birth.consult_intake)
      ? birth.consult_intake as Record<string, any>
      : {};
    const nowIso = new Date().toISOString();
    const nextIntake = {
      ...existingIntake,
      ...intake,
      updated_at: nowIso,
    };

    const tracking = birth?.tracking && typeof birth.tracking === 'object' && !Array.isArray(birth.tracking)
      ? { ...birth.tracking as Record<string, any> }
      : {};
    const events = Array.isArray(tracking.events) ? [...tracking.events] : [];
    if (!tracking.consult_intake_submitted_at) {
      tracking.consult_intake_submitted_at = nowIso;
    }
    tracking.consult_intake_updated_at = nowIso;
    tracking.consult_intake_version = Number(tracking.consult_intake_version || 0) + 1;
    tracking.last_event = 'consult_intake_submitted';
    tracking.last_event_at = nowIso;
    events.push({ event: 'consult_intake_submitted', at: nowIso });
    tracking.events = events.slice(-40);

    const nextBirth = {
      ...birth,
      order_service: 'consult',
      payment_option: {
        ...(birth?.payment_option && typeof birth.payment_option === 'object' ? birth.payment_option : {}),
        id: 'consult',
      },
      consult_intake: nextIntake,
      tracking,
    };

    const { error: updateError } = await supabase
      .from('orders')
      .update({ birth_input: JSON.stringify(nextBirth) })
      .eq('trade_no', tradeNo);
    if (updateError) {
      return json(req, { error: 'order_update_failed', details: updateError.message }, 500, allowedOrigins);
    }

    return json(req, {
      ok: true,
      trade_no: tradeNo,
      consult_intake: nextIntake,
    }, 200, allowedOrigins);
  } catch (err) {
    return json(req, {
      error: 'submit_consult_intake_failed',
      details: err instanceof Error ? err.message : String(err),
      message: '预约信息保存失败，请稍后重试。',
    }, 500, allowedOrigins);
  }
});
