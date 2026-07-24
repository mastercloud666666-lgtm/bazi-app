import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateAdminRequest, recordAdminAudit } from '../_shared/admin-auth.ts';
import { corsHeaders, isAllowedRequestOrigin, resolveAllowedOrigins } from '../_shared/security.ts';

type JsonRecord = Record<string, unknown>;
type PdfAttachment = { filename: string; content: string };

const MAX_FILE_BASE64 = 8_400_000;
const MAX_TOTAL_BASE64 = 14_000_000;

const PRODUCT_PROFILES: Record<string, {
  expectedFiles: number;
  subject: string;
  heading: string;
  description: string;
}> = {
  'Tengyunzi Personal Reading': {
    expectedFiles: 1,
    subject: 'Your Tengyunzi Personal BaZi Reading',
    heading: 'Your personal BaZi reading is ready',
    description: 'Your personally prepared Tengyunzi BaZi reading is attached as a PDF.',
  },
  'Tengyunzi 12-Month Forecast': {
    expectedFiles: 1,
    subject: 'Your Tengyunzi 12-Month BaZi Forecast',
    heading: 'Your 12-month BaZi forecast is ready',
    description: 'Your one-time 12-month forecast is attached as a PDF, with annual strategy and month-by-month timing based on your chart.',
  },
  'Tengyunzi Reading + Annual Forecast Bundle': {
    expectedFiles: 2,
    subject: 'Your Tengyunzi Reading and 12-Month Forecast',
    heading: 'Your two Tengyunzi reports are ready',
    description: 'Your personal BaZi reading and your one-time 12-month forecast are attached as two separate PDFs.',
  },
};

function asString(value: unknown, max = 4000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function json(body: unknown, status = 200, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function normalizeFilename(value: unknown, fallback: string): string {
  const filename = asString(value, 160).replace(/[^a-zA-Z0-9._-]/g, '-');
  const base = filename || fallback;
  const withExtension = /\.pdf$/i.test(base) ? base : `${base}.pdf`;
  return withExtension || fallback;
}

function parseAttachments(body: JsonRecord, fallbackFilename: string): PdfAttachment[] {
  const rawAttachments = Array.isArray(body.attachments)
    ? body.attachments
    : [{ filename: body.filename, pdf_base64: body.pdf_base64 }];
  return rawAttachments.map((raw, index) => {
    const item = asRecord(raw);
    const content = asString(item.pdf_base64, MAX_FILE_BASE64 + 1)
      .replace(/^data:application\/pdf;base64,/i, '');
    if (!content || content.length < 1000 || !/^JVBER/i.test(content)) {
      throw new Error('valid_pdf_attachment_required');
    }
    if (content.length > MAX_FILE_BASE64) throw new Error('pdf_attachment_too_large');
    return {
      filename: normalizeFilename(item.filename, `${fallbackFilename}-${index + 1}.pdf`),
      content,
    };
  });
}

function buildDeliveryEmail(input: {
  product: string;
  name: string;
  birthDate: string;
  orderReference: string;
  filenames: string[];
  replyTo: string;
}) {
  const profile = PRODUCT_PROFILES[input.product] || PRODUCT_PROFILES['Tengyunzi Personal Reading'];
  const greeting = input.name ? `Hello ${input.name},` : 'Hello,';
  const birthLine = input.birthDate ? ` This delivery is for the birth date ${input.birthDate}.` : '';
  const fileList = input.filenames.map((filename) => `<li style="margin:0 0 8px;">${escapeHtml(filename)}</li>`).join('');
  const textFiles = input.filenames.map((filename) => `- ${filename}`).join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f4f8fb;font-family:Arial,sans-serif;color:#17364f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f8fb;padding:28px 12px;"><tr><td align="center">
      <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #c9d8e6;border-top:4px solid #2478b5;">
        <tr><td style="padding:30px 36px 12px;color:#2478b5;font-size:14px;font-weight:700;">TENGYUNZI</td></tr>
        <tr><td style="padding:8px 36px 12px;font-family:Georgia,serif;color:#0b2943;font-size:30px;line-height:1.2;font-weight:700;">${escapeHtml(profile.heading)}</td></tr>
        <tr><td style="padding:8px 36px 26px;font-size:16px;line-height:1.75;">
          <p style="margin:0 0 16px;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 16px;">${escapeHtml(profile.description + birthLine)}</p>
          <p style="margin:0 0 8px;font-weight:700;">Attached files</p>
          <ul style="margin:0 0 18px;padding-left:20px;">${fileList}</ul>
          <p style="margin:0 0 16px;">Keep this email and the attached files for your records. The PDFs can be downloaded directly from this message.</p>
          <p style="margin:0;color:#526b82;">Order reference: ${escapeHtml(input.orderReference || input.product)}</p>
        </td></tr>
        <tr><td style="padding:22px 36px;background:#eaf4fb;font-size:14px;line-height:1.65;color:#365a74;">Questions about your delivery? Reply to this email or contact <a href="mailto:${escapeHtml(input.replyTo)}" style="color:#0f5f95;">${escapeHtml(input.replyTo)}</a>.</td></tr>
        <tr><td style="padding:22px 36px;font-size:12px;line-height:1.65;color:#6a8094;">Tengyunzi readings are educational and reflective. They do not guarantee outcomes or replace medical, legal, financial, or mental-health advice.</td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
  const text = `${profile.heading}\n\n${greeting}\n\n${profile.description}${birthLine}\n\nAttached files:\n${textFiles}\n\nOrder reference: ${input.orderReference || input.product}\n\nQuestions: ${input.replyTo}\n\nTengyunzi readings are educational and reflective and do not replace professional advice.`;
  return { subject: profile.subject, html, text };
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  const headers = corsHeaders(req, allowedOrigins);
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, headers);
  if (!isAllowedRequestOrigin(req, allowedOrigins)) return json({ error: 'origin_not_allowed' }, 403, headers);

  const supabaseUrl = asString(Deno.env.get('SUPABASE_URL'), 500);
  const serviceRoleKey = asString(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), 5000);
  const resendKey = asString(Deno.env.get('RESEND_API_KEY'), 5000);
  const from = asString(Deno.env.get('PERSONAL_READING_FROM_EMAIL') || Deno.env.get('NEWSLETTER_FROM_EMAIL'), 320);
  const replyTo = asString(Deno.env.get('NEWSLETTER_REPLY_TO'), 320) || 'hello@tengyunzi.com';
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'missing_server_configuration' }, 500, headers);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const admin = await authenticateAdminRequest(req, supabase, 'reports_manage');
  if (!admin) return json({ error: 'unauthorized' }, 401, headers);

  const body = await req.json().catch(() => ({})) as JsonRecord;
  const action = asString(body.action, 40);
  if (action !== 'send_pdf') return json({ error: 'unsupported_action' }, 400, headers);
  if (!resendKey || !from) return json({ error: 'report_email_provider_not_configured' }, 503, headers);

  const intakeId = asString(body.intake_id, 80);
  const reportId = asString(body.report_id, 80);
  let email = asString(body.email, 320).toLowerCase();
  let name = '';
  let product = 'Tengyunzi Personal Reading';
  let birthDate = asString(body.birth_date, 40);
  let orderReference = reportId;
  let intake: JsonRecord | null = null;

  if (intakeId) {
    if (!/^[0-9a-f-]{36}$/i.test(intakeId)) return json({ error: 'invalid_intake_id' }, 400, headers);
    const { data, error } = await supabase
      .from('order_intakes')
      .select('id,email,name,product,payment_status,status,order_reference,birth_year,birth_month,birth_day,metadata')
      .eq('id', intakeId)
      .maybeSingle();
    if (error || !data) return json({ error: 'manual_order_not_found' }, 404, headers);
    if (asString(data.payment_status).toLowerCase() !== 'paid') {
      return json({ error: 'manual_order_payment_not_completed' }, 409, headers);
    }
    intake = data as JsonRecord;
    email = asString(data.email, 320).toLowerCase();
    name = asString(data.name, 160);
    product = asString(data.product, 120) || product;
    orderReference = asString(data.order_reference, 180) || intakeId;
    birthDate = [data.birth_year, data.birth_month, data.birth_day].filter(Boolean).join('-');
  } else if (!/^[0-9a-f-]{36}$/i.test(reportId)) {
    return json({ error: 'valid_report_id_required' }, 400, headers);
  }

  if (!validEmail(email)) return json({ error: 'valid_recipient_required' }, 400, headers);

  let attachments: PdfAttachment[];
  try {
    attachments = parseAttachments(body, intakeId ? 'tengyunzi-report' : 'tengyunzi-personal-bazi-reading');
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'valid_pdf_attachment_required' }, 400, headers);
  }
  if (attachments.reduce((total, item) => total + item.content.length, 0) > MAX_TOTAL_BASE64) {
    return json({ error: 'pdf_attachments_too_large' }, 400, headers);
  }
  const profile = PRODUCT_PROFILES[product] || PRODUCT_PROFILES['Tengyunzi Personal Reading'];
  if (attachments.length !== profile.expectedFiles) {
    return json({ error: 'incorrect_attachment_count', expected: profile.expectedFiles }, 400, headers);
  }

  const filenames = attachments.map((item) => item.filename);
  const emailContent = buildDeliveryEmail({ product, name, birthDate, orderReference, filenames, replyTo });
  const message: JsonRecord = {
    from,
    to: [email],
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    attachments,
  };
  if (replyTo) message.reply_to = replyTo;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(45000),
  });
  const provider = await response.json().catch(() => ({})) as JsonRecord;
  if (!response.ok) return json({ error: 'report_email_send_failed', details: provider }, 502, headers);

  const providerId = asString(provider.id, 160);
  if (intake && intakeId) {
    const now = new Date().toISOString();
    const previousMetadata = asRecord(intake.metadata);
    const previousDelivery = asRecord(previousMetadata.manual_delivery || previousMetadata.personal_delivery);
    const manualDelivery: JsonRecord = {
      ...previousDelivery,
      delivery_method: 'email_attachment',
      delivered_at: now,
      customer_notified_at: now,
      provider_message_id: providerId,
      filenames,
      attachment_count: filenames.length,
      notification_error: null,
      updated_by: admin.username,
      updated_at: now,
    };
    const nextMetadata = {
      ...previousMetadata,
      manual_delivery: manualDelivery,
      personal_delivery: manualDelivery,
    };
    const { error: updateError } = await supabase
      .from('order_intakes')
      .update({ status: 'delivered', metadata: nextMetadata, updated_at: now })
      .eq('id', intakeId);
    if (updateError) {
      return json({ error: 'delivery_sent_but_order_update_failed', details: updateError.message, provider_id: providerId }, 207, headers);
    }
    await recordAdminAudit(supabase, req, admin, 'manual_product_pdf_delivered', {
      target_type: 'order_intake',
      target_id: intakeId,
      metadata: { email, product, filenames, provider_id: providerId },
    });
  } else {
    await recordAdminAudit(supabase, req, admin, 'english_report_pdf_delivered', {
      target_type: 'english_ai_report',
      target_id: reportId,
      metadata: { email, filenames, provider_id: providerId },
    });
  }

  return json({ ok: true, email, product, filenames, provider_id: providerId }, 200, headers);
});
