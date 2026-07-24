import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, isAllowedRequestOrigin, resolveAllowedOrigins } from '../_shared/security.ts';
import { resolveReportPricing } from '../_shared/report-pricing.ts';

function asString(value: unknown, max = 300): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  const headers = corsHeaders(req, allowedOrigins);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!isAllowedRequestOrigin(req, allowedOrigins)) return json({ error: 'origin_not_allowed' }, 403);

  const body = await req.json().catch(() => ({}));
  const pricing = resolveReportPricing(body.visitor_id);
  if (!pricing) return json({ error: 'visitor_id_required' }, 400);
  const action = asString(body.action, 30).toLowerCase();
  if (action === 'resolve') return json({ ok: true, pricing });
  if (action !== 'event') return json({ error: 'unsupported_action' }, 400);

  const eventType = asString(body.event_type, 30).toLowerCase();
  const product = asString(body.product, 40).toLowerCase();
  if (!['exposure', 'checkout'].includes(eventType)) return json({ error: 'invalid_event_type' }, 400);
  if (!['ai_report', 'personal_reading'].includes(product)) return json({ error: 'invalid_product' }, 400);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const row = {
    ...pricing,
    event_type: eventType,
    product,
    page_path: asString(body.page_path, 240) || null,
    metadata: { referrer: asString(body.referrer, 300) },
  };
  const { error } = await supabase.from('report_price_experiment_events').insert(row);
  if (error && !(eventType === 'exposure' && error.code === '23505')) return json({ error: 'event_store_failed' }, 500);
  return json({ ok: true, pricing });
});
