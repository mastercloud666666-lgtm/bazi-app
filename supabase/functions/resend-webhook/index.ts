import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type JsonRecord = Record<string, unknown>;

const EVENT_STATUS: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.failed': 'failed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.suppressed': 'suppressed',
};

function asString(value: unknown, max = 1000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifyWebhook(rawBody: string, headers: Headers, secret: string): Promise<boolean> {
  const messageId = asString(headers.get('svix-id'), 240);
  const timestamp = asString(headers.get('svix-timestamp'), 40);
  const signatureHeader = asString(headers.get('svix-signature'), 2000);
  if (!messageId || !timestamp || !signatureHeader || !secret) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;

  const keyBytes = decodeBase64(secret.replace(/^whsec_/, ''));
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signedPayload = `${messageId}.${timestamp}.${rawBody}`;
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = encodeBase64(new Uint8Array(signature));
  const candidates = signatureHeader
    .split(/\s+/)
    .map((item) => item.split(',').slice(1).join(','))
    .filter(Boolean);
  return candidates.some((candidate) => timingSafeEqual(candidate, expected));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseUrl = asString(Deno.env.get('SUPABASE_URL'), 500);
  const serviceRoleKey = asString(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), 3000);
  const webhookSecret = asString(Deno.env.get('RESEND_WEBHOOK_SECRET'), 3000);
  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    return json({ error: 'resend_webhook_not_configured' }, 503);
  }

  const rawBody = await req.text();
  if (!(await verifyWebhook(rawBody, req.headers, webhookSecret))) {
    return json({ error: 'invalid_webhook_signature' }, 400);
  }

  const eventId = asString(req.headers.get('svix-id'), 240);
  const payload = JSON.parse(rawBody) as JsonRecord;
  const eventType = asString(payload.type, 80).toLowerCase();
  const data = payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data as JsonRecord
    : {};
  const emailId = asString(data.email_id, 240);
  const recipients = Array.isArray(data.to)
    ? data.to.map((value) => asString(value, 320).toLowerCase()).filter(Boolean)
    : [];
  const recipient = recipients[0] || '';
  const eventCreatedAt = asString(payload.created_at, 80) || new Date().toISOString();
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: existing } = await supabase
    .from('resend_webhook_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (existing) return json({ ok: true, duplicate: true });

  const deliveryStatus = EVENT_STATUS[eventType];
  if (deliveryStatus && emailId) {
    const update: JsonRecord = {
      status: deliveryStatus,
      last_event_at: eventCreatedAt,
      updated_at: new Date().toISOString(),
    };
    if (deliveryStatus === 'delivered') update.delivered_at = eventCreatedAt;
    const { error: deliveryError } = await supabase
      .from('newsletter_deliveries')
      .update(update)
      .eq('provider_message_id', emailId);
    if (deliveryError) return json({ error: 'delivery_event_update_failed' }, 500);

    const { error: dailyDeliveryError } = await supabase
      .from('daily_almanac_deliveries')
      .update(update)
      .eq('provider_message_id', emailId);
    if (dailyDeliveryError) return json({ error: 'daily_delivery_event_update_failed' }, 500);

    const { error: freeDailyDeliveryError } = await supabase
      .from('free_daily_almanac_deliveries')
      .update(update)
      .eq('provider_message_id', emailId);
    if (freeDailyDeliveryError) return json({ error: 'free_daily_delivery_event_update_failed' }, 500);

    const { error: monthlyDeliveryError } = await supabase
      .from('monthly_bazi_deliveries')
      .update(update)
      .eq('provider_message_id', emailId);
    if (monthlyDeliveryError) return json({ error: 'monthly_delivery_event_update_failed' }, 500);
  }

  if (recipient && ['email.bounced', 'email.complained', 'email.suppressed'].includes(eventType)) {
    const subscriberStatus = eventType === 'email.complained' ? 'complained' : 'bounced';
    const { error: subscriberError } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: subscriberStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('email_normalized', recipient);
    if (subscriberError) return json({ error: 'subscriber_event_update_failed' }, 500);
  }

  const { error: eventError } = await supabase.from('resend_webhook_events').insert({
    id: eventId,
    event_type: eventType || 'unknown',
    email_id: emailId || null,
    recipient: recipient || null,
    event_created_at: eventCreatedAt,
    payload,
  });
  if (eventError && eventError.code !== '23505') {
    return json({ error: 'webhook_event_log_failed' }, 500);
  }

  return json({ ok: true });
});
