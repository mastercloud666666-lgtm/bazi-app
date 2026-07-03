type NotifyPayload = Record<string, unknown>;

function text(value: unknown, max = 180): string {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  return raw.length > max ? `${raw.slice(0, max)}...` : raw;
}

function nowText(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', ' UTC');
}

function normalizeWebhookUrl(): string {
  const raw = text(Deno.env.get('OPS_NOTIFY_WEBHOOK_URL'), 600);
  if (!raw) return '';
  if (!/^https?:\/\//i.test(raw)) return '';
  return raw;
}

function isNotifyEnabled(): boolean {
  return text(Deno.env.get('OPS_NOTIFY_ENABLED') || '1') !== '0';
}

function buildMessage(event: string, payload: NotifyPayload): string {
  const tradeNo = text(payload.trade_no || payload.tradeNo || '-', 80);
  const service = text(payload.service || '-', 40).toUpperCase() || '-';
  const optionId = text(payload.payment_option_id || payload.paymentOptionId || '-', 40);
  const amount = text(payload.total_fee || payload.amount || '-', 40);
  const status = text(payload.status || '-', 40);
  const source = text(payload.source || '-', 60);
  const note = text(payload.note || '', 240);

  const lines = [
    `【云子命理支付提醒】${event}`,
    `时间：${nowText()}`,
    `订单号：${tradeNo}`,
    `服务：${service}`,
    `档位：${optionId}`,
    `金额：${amount}`,
    `状态：${status}`,
    `来源：${source}`,
  ];
  if (note) lines.push(`备注：${note}`);
  return lines.join('\n');
}

export async function sendOrderNotify(event: string, payload: NotifyPayload = {}): Promise<void> {
  if (!isNotifyEnabled()) return;
  const webhookUrl = normalizeWebhookUrl();
  if (!webhookUrl) return;

  const body = {
    msgtype: 'text',
    text: {
      content: buildMessage(event, payload),
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn('sendOrderNotify non-200:', res.status, errText.slice(0, 160));
    }
  } catch (err) {
    console.warn('sendOrderNotify failed:', err);
  } finally {
    clearTimeout(timer);
  }
}

