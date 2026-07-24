export type JsonRecord = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: unknown): string {
  const email = asString(value).toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : '';
}

function readNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(Deno.env.get(name));
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(Math.floor(raw), min), max);
}

function dateAfterDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function trackingOf(birth: JsonRecord): JsonRecord {
  const raw = birth.tracking;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? { ...raw as JsonRecord }
    : {};
}

export function isCopyAgentOrder(birth: JsonRecord, optionId = ''): boolean {
  const service = asString(birth.order_service).toLowerCase();
  const option = asString(optionId || (birth.payment_option as JsonRecord | undefined)?.id || birth.payment_option_id).toLowerCase();
  return service === 'copy_agent' || option === 'copy_agent_100';
}

export function getCopyAgentEmail(birth: JsonRecord): string {
  const copyAgent = birth.copy_agent && typeof birth.copy_agent === 'object' && !Array.isArray(birth.copy_agent)
    ? birth.copy_agent as JsonRecord
    : {};
  return normalizeEmail(
    copyAgent.email
      || birth.agent_email
      || birth.email
      || birth.login_email,
  );
}

export async function grantCopyAgentCredits(
  birth: JsonRecord,
  tradeNo: string,
): Promise<{ birth: JsonRecord; granted: boolean; email: string; credits: number; paidUntil: string; skipped: boolean }> {
  const next: JsonRecord = { ...birth };
  const tracking = trackingOf(next);
  const email = getCopyAgentEmail(next);
  if (!email) throw new Error('copy_agent_email_missing');

  const credits = readNumber('COPY_AGENT_RECHARGE_CREDITS', 100, 1, 100000);
  const paidDays = readNumber('COPY_AGENT_PAID_DAYS', 30, 1, 3660);
  const paidUntil = dateAfterDays(paidDays);

  if (asString(tracking.copy_agent_granted_at)) {
    return { birth: next, granted: false, email, credits, paidUntil: asString(tracking.copy_agent_paid_until) || paidUntil, skipped: true };
  }

  const apiUrl = asString(Deno.env.get('COPY_AGENT_ADMIN_API_URL')) || 'https://agent.tengyunzi.com/api/admin/user';
  const adminToken = asString(Deno.env.get('COPY_AGENT_ADMIN_TOKEN'));
  if (!adminToken) throw new Error('copy_agent_admin_token_missing');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
    },
    body: JSON.stringify({
      email,
      add_credits: credits,
      plan: 'paid',
      status: 'active',
      paid_until: paidUntil,
      notes: `微信支付自动充值：${tradeNo}，10元=${credits}额度`,
    }),
  });
  const text = await response.text().catch(() => '');
  if (!response.ok) {
    throw new Error(`copy_agent_admin_update_failed:${response.status}:${text.slice(0, 160)}`);
  }

  tracking.copy_agent_granted_at = new Date().toISOString();
  tracking.copy_agent_email = email;
  tracking.copy_agent_credits = credits;
  tracking.copy_agent_paid_until = paidUntil;
  tracking.copy_agent_trade_no = tradeNo;
  next.tracking = tracking;
  next.copy_agent = {
    ...(next.copy_agent && typeof next.copy_agent === 'object' && !Array.isArray(next.copy_agent) ? next.copy_agent as JsonRecord : {}),
    email,
    credits,
    paid_until: paidUntil,
  };

  return { birth: next, granted: true, email, credits, paidUntil, skipped: false };
}
