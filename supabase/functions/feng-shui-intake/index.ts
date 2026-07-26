import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier,
  corsHeaders,
  consumeRateLimit,
  isAllowedRequestOrigin,
  json,
  resolveAllowedOrigins,
  tooManyRequestsResponse,
} from '../_shared/security.ts';

const PRODUCT = 'Tengyunzi Manual Feng Shui Review';
const OPTION_ID = 'feng_shui';
const AMOUNT = '149.00';
const BUCKET = 'feng-shui-intakes';
const MAX_FILES = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

function text(form: FormData, key: string, max = 2000): string {
  return String(form.get(key) || '').trim().slice(0, max);
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

function safeFilename(value: string): string {
  const cleaned = value.normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 100) || 'floor-plan';
}

function tradeNo(): string {
  return `fs-tzy-${Date.now()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 18)}`;
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders(req, allowedOrigins) });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders(req, allowedOrigins) });
  if (!isAllowedRequestOrigin(req, allowedOrigins)) return json(req, { error: 'origin_not_allowed' }, 403, allowedOrigins);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json(req, { error: 'missing_supabase_env' }, 500, allowedOrigins);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const rate = await consumeRateLimit(supabase, {
    scope: 'feng-shui-intake',
    identifier: await buildRateLimitIdentifier(req),
    windowSeconds: 300,
    maxRequests: 3,
  });
  if (!rate.allowed) {
    return tooManyRequestsResponse(req, allowedOrigins, {
      message: 'Too many Feng Shui intake attempts. Please try again later.',
      retryAfterSeconds: rate.retryAfterSeconds,
      scope: 'feng-shui-intake',
      currentCount: rate.currentCount,
    });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json(req, { error: 'multipart_form_required' }, 400, allowedOrigins);
  }

  if (text(form, 'website', 200)) return json(req, { ok: true, submitted: true }, 200, allowedOrigins);

  const name = text(form, 'name', 120);
  const email = text(form, 'email', 320).toLowerCase();
  const propertyType = text(form, 'property_type', 80);
  const addressRegion = text(form, 'address_region', 180);
  const facingDirection = text(form, 'facing_direction', 120);
  const compassMethod = text(form, 'compass_method', 120);
  const totalArea = Number(text(form, 'total_area', 20));
  const areaUnit = text(form, 'area_unit', 12) === 'sqft' ? 'sq ft' : 'm²';
  const occupants = text(form, 'occupants', 500);
  const propertyContext = text(form, 'property_context', 1200);
  const goals = form.getAll('goals').map((item) => String(item).trim()).filter(Boolean).slice(0, 8);
  const question = text(form, 'question', 2400);

  if (!name) return json(req, { error: 'name_required' }, 400, allowedOrigins);
  if (!validEmail(email)) return json(req, { error: 'invalid_email' }, 400, allowedOrigins);
  if (!propertyType || !addressRegion || !facingDirection) {
    return json(req, { error: 'property_details_required' }, 400, allowedOrigins);
  }
  if (!Number.isFinite(totalArea) || totalArea <= 0 || totalArea > 1000000) {
    return json(req, { error: 'invalid_total_area' }, 400, allowedOrigins);
  }
  if (!goals.length) return json(req, { error: 'at_least_one_goal_required' }, 400, allowedOrigins);
  if (question.length < 20) return json(req, { error: 'question_too_short' }, 400, allowedOrigins);

  const files = form.getAll('floor_plans').filter((item): item is File => item instanceof File && item.size > 0);
  if (!files.length) return json(req, { error: 'floor_plan_required' }, 400, allowedOrigins);
  if (files.length > MAX_FILES) return json(req, { error: 'too_many_floor_plan_files' }, 400, allowedOrigins);
  if (files.some((file) => file.size > MAX_FILE_BYTES)) return json(req, { error: 'floor_plan_file_too_large' }, 400, allowedOrigins);
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    return json(req, { error: 'floor_plan_files_too_large' }, 400, allowedOrigins);
  }
  if (files.some((file) => !ALLOWED_TYPES.has(file.type))) {
    return json(req, { error: 'unsupported_floor_plan_format' }, 400, allowedOrigins);
  }

  const intakeId = crypto.randomUUID();
  const orderReference = tradeNo();
  const uploaded: Array<{ bucket: string; path: string; name: string; size: number; type: string }> = [];

  try {
    for (const file of files) {
      const objectPath = `${intakeId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw new Error(`floor_plan_upload_failed:${error.message}`);
      uploaded.push({ bucket: BUCKET, path: objectPath, name: file.name.slice(0, 180), size: file.size, type: file.type });
    }

    const metadata = {
      payment_option_id: OPTION_ID,
      product_slug: 'manual_feng_shui_review',
      delivery_method: 'tengyunzi_feng_shui_72h',
      amount: AMOUNT,
      currency: 'USD',
      property_type: propertyType,
      address_region: addressRegion,
      facing_direction: facingDirection,
      compass_method: compassMethod,
      total_area: totalArea,
      area_unit: areaUnit,
      occupants,
      property_context: propertyContext,
      goals,
      floor_plan_files: uploaded,
    };

    const orderBirthInput = {
      order_service: 'consult',
      product_family: 'tengyunzi_manual',
      delivery_method: 'tengyunzi_feng_shui_72h',
      intake_id: intakeId,
      product: PRODUCT,
      name,
      email,
      focus_area: goals.join(', '),
      question,
      lang: 'en',
      payment_option_id: OPTION_ID,
      payment_option: { id: OPTION_ID, title: PRODUCT, fee: AMOUNT, currency: 'USD' },
      feng_shui_intake: metadata,
      consult_intake: {
        nickname: name,
        contact: email,
        question: `${question}\nGoals: ${goals.join(', ')}\nFacing: ${facingDirection}\nArea: ${totalArea} ${areaUnit}`,
        preferred_time: 'Email delivery within 72 hours',
        updated_at: new Date().toISOString(),
      },
    };

    const { error: orderError } = await supabase.from('orders').insert({
      trade_no: orderReference,
      birth_input: JSON.stringify(orderBirthInput),
      paid: false,
      analysis: null,
    });
    if (orderError) throw new Error(`order_create_failed:${orderError.message}`);

    const { error: intakeError } = await supabase.from('order_intakes').insert({
      id: intakeId,
      product: PRODUCT,
      email,
      email_normalized: email,
      name,
      focus_area: goals.join(', '),
      question,
      payment_status: 'checkout_started',
      checkout_provider: 'paypal',
      order_reference: orderReference,
      source: 'feng-shui-page',
      language: 'en',
      page_path: '/tengyunzi-feng-shui.html',
      metadata,
      status: 'needs_payment',
      updated_at: new Date().toISOString(),
    });
    if (intakeError) {
      await supabase.from('orders').delete().eq('trade_no', orderReference).eq('paid', false);
      throw new Error(`order_intake_insert_failed:${intakeError.message}`);
    }

    return json(req, {
      ok: true,
      intake_id: intakeId,
      order_reference: orderReference,
      payment_option_id: OPTION_ID,
      amount: AMOUNT,
      currency: 'USD',
    }, 200, allowedOrigins);
  } catch (error) {
    if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded.map((item) => item.path));
    return json(req, { error: error instanceof Error ? error.message : String(error) }, 500, allowedOrigins);
  }
});
