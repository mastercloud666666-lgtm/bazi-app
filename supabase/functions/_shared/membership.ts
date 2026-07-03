// 订阅会员发放：支付成功后按 plan 给对应用户续时长（月卡=30天/年卡=365天）
export type JsonRecord = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: unknown): string {
  const email = asString(value).toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : '';
}

function trackingOf(birth: JsonRecord): JsonRecord {
  const raw = birth.tracking;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as JsonRecord) } : {};
}

export function isMembershipOrder(birth: JsonRecord, optionId = ''): boolean {
  const service = asString(birth.order_service).toLowerCase();
  const option = asString(optionId).toLowerCase();
  return service === 'membership' || option === 'membership_monthly' || option === 'membership_yearly';
}

export function membershipPlanOf(birth: JsonRecord): 'monthly' | 'yearly' {
  const plan = asString(birth.plan || (birth.membership as JsonRecord | undefined)?.plan).toLowerCase();
  return plan === 'yearly' ? 'yearly' : 'monthly';
}

export function membershipDays(plan: 'monthly' | 'yearly'): number {
  return plan === 'yearly' ? 365 : 30;
}

export function membershipUserId(birth: JsonRecord): string {
  return asString(birth.user_id || (birth.membership as JsonRecord | undefined)?.user_id);
}

export function membershipEmail(birth: JsonRecord): string {
  return normalizeEmail(birth.email || birth.login_email || (birth.membership as JsonRecord | undefined)?.email);
}

/** 续时长：以 max(now, 现有到期) 为基准往后加 days，写入 memberships（service role 调用）。幂等按订单。 */
export async function grantMembership(
  supabase: any,
  birth: JsonRecord,
  tradeNo: string,
  opts: { source?: string; autoRenew?: boolean; paypalSubscriptionId?: string } = {},
): Promise<{ birth: JsonRecord; skipped: boolean; userId: string; email: string; plan: string; expiresAt: string }> {
  const next: JsonRecord = { ...birth };
  const tracking = trackingOf(next);
  const userId = membershipUserId(next);
  const email = membershipEmail(next);
  const plan = membershipPlanOf(next);
  const days = membershipDays(plan);

  if (!userId) throw new Error('membership_user_missing');

  if (asString(tracking.membership_granted_at)) {
    return { birth: next, skipped: true, userId, email, plan, expiresAt: asString(tracking.membership_expires_at) };
  }

  const { data: existing } = await supabase
    .from('memberships').select('expires_at').eq('user_id', userId).maybeSingle();

  const now = new Date();
  const base = existing?.expires_at && new Date(existing.expires_at) > now ? new Date(existing.expires_at) : now;
  base.setUTCDate(base.getUTCDate() + days);
  const expiresAt = base.toISOString();

  const { error } = await supabase.from('memberships').upsert({
    user_id: userId,
    email,
    plan,
    source: opts.source || 'cny_pass',
    auto_renew: opts.autoRenew ?? false,
    paypal_subscription_id: opts.paypalSubscriptionId || null,
    status: 'active',
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw new Error(`membership_upsert_failed:${error.message}`);

  tracking.membership_granted_at = new Date().toISOString();
  tracking.membership_plan = plan;
  tracking.membership_expires_at = expiresAt;
  tracking.membership_trade_no = tradeNo;
  next.tracking = tracking;

  return { birth: next, skipped: false, userId, email, plan, expiresAt };
}
