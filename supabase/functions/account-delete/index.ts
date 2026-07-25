// Self-service account deletion.
//
// Required by App Store Review Guideline 5.1.1(v): any app that lets a user
// create an account must let them delete it from inside the app. The web
// account page is the same surface a WKWebView build would ship, so this is the
// endpoint behind that button.
//
// Deletion map (why each step exists):
//   auth.users delete CASCADES to  english_ai_reports, user_records,
//     memberships, daily_almanac_profiles, daily_almanac_deliveries,
//     monthly_bazi_deliveries
//   newsletter_subscribers.user_id is ON DELETE SET NULL, so that row (and the
//     email on it) survives the auth delete -- we remove it explicitly, which
//     in turn cascades free_daily_almanac_deliveries via subscriber_id
//   order_intakes / contact_submissions are keyed by email with no FK. These are
//     commercial and support records we keep for accounting and dispute history,
//     so they are anonymized in place rather than dropped.
//   orders carries no email or user_id column, so there is nothing to match on.
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

const RATE_LIMIT_WINDOW_SECONDS = 3600;
const RATE_LIMIT_MAX_REQUESTS = 8;
const CONFIRM_PHRASE = 'DELETE';
const ANONYMIZED_EMAIL = 'deleted-account@tengyunzi.invalid';

function json(req: Request, body: unknown, status = 200, allowedOrigins = resolveAllowedOrigins()) {
  const response = securityJson(req, body, status, allowedOrigins);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function bearerToken(req: Request): string {
  const header = String(req.headers.get('authorization') || '').trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, { error: 'missing_server_configuration' }, 500, allowedOrigins);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rateIdentifier = await buildRateLimitIdentifier(req);
  const rate = await consumeRateLimit(supabase, {
    scope: 'account-delete',
    identifier: rateIdentifier,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
  });
  if (!rate.allowed) {
    await recordAbuseLog(supabase, {
      scope: 'account-delete',
      identifier: rateIdentifier,
      event: 'rate_limited',
      meta: { ip: maskIp(extractClientIp(req)), current_count: rate.currentCount },
    });
    return tooManyRequestsResponse(req, allowedOrigins, {
      retryAfterSeconds: rate.retryAfterSeconds,
      scope: 'account-delete',
      currentCount: rate.currentCount,
    });
  }

  const token = bearerToken(req);
  if (!token) {
    return json(req, { error: 'authentication_required' }, 401, allowedOrigins);
  }
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.id) {
    return json(req, { error: 'authentication_required' }, 401, allowedOrigins);
  }

  const payload = await req.json().catch(() => ({})) as Record<string, unknown>;
  // A typed confirmation makes an accidental or replayed POST a no-op; the UI
  // asks the user to type it before enabling the button.
  if (String(payload.confirm || '').trim().toUpperCase() !== CONFIRM_PHRASE) {
    return json(req, { error: 'confirmation_required', confirm_phrase: CONFIRM_PHRASE }, 400, allowedOrigins);
  }

  const email = String(user.email || '').trim().toLowerCase();
  const summary: Record<string, number> = {};

  try {
    if (email) {
      // Removing the subscriber row cascades free_daily_almanac_deliveries.
      const { data: subscribers, error: subscriberError } = await supabase
        .from('newsletter_subscribers')
        .delete()
        .eq('email_normalized', email)
        .select('id');
      if (subscriberError) throw new Error(`newsletter_subscribers: ${subscriberError.message}`);
      summary.newsletter_subscribers_deleted = subscribers?.length || 0;

      const { data: intakes, error: intakeError } = await supabase
        .from('order_intakes')
        .update({
          email: ANONYMIZED_EMAIL,
          email_normalized: ANONYMIZED_EMAIL,
          name: null,
          birth_place: null,
          focus_area: null,
          question: null,
          event_one: null,
          event_two: null,
          landing_url: null,
          referrer: null,
        })
        .eq('email_normalized', email)
        .select('id');
      if (intakeError) throw new Error(`order_intakes: ${intakeError.message}`);
      summary.order_intakes_anonymized = intakes?.length || 0;

      const { data: contacts, error: contactError } = await supabase
        .from('contact_submissions')
        .update({
          name: 'Deleted account',
          email: ANONYMIZED_EMAIL,
          email_normalized: ANONYMIZED_EMAIL,
          message: '[removed at user request]',
          landing_url: null,
          referrer: null,
        })
        .eq('email_normalized', email)
        .select('id');
      if (contactError) throw new Error(`contact_submissions: ${contactError.message}`);
      summary.contact_submissions_anonymized = contacts?.length || 0;
    }

    // Last, because everything above is keyed by the email on the auth row.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) throw new Error(`auth_user: ${deleteError.message}`);

    await supabase.from('account_deletion_log').insert({
      deleted_user_id: user.id,
      email_sha256: email ? await sha256Hex(email) : '',
      purge_summary: summary,
      requested_from: String(req.headers.get('origin') || '').slice(0, 200),
    });

    return json(req, { ok: true, deleted: true, summary }, 200, allowedOrigins);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('account-delete failed:', message);
    // Partial failure is possible: some tables may already be purged while the
    // auth row survives. Surfacing that lets support finish the job, and the
    // user can safely retry -- every step above is idempotent.
    return json(req, { error: 'account_deletion_failed', details: message, summary }, 500, allowedOrigins);
  }
});
