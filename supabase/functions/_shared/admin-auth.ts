type JsonRecord = Record<string, unknown>;

export type AdminSession = {
  id: string;
  username: string;
  display_name: string;
  permissions: string[];
  session_version: number;
  must_change_password: boolean;
  iat: number;
  exp: number;
  legacy?: boolean;
};

const PASSWORD_ITERATIONS = 600000;
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

function asString(value: unknown, max = 4000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodePayload<T>(value: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;
  } catch {
    return null;
  }
}

export function timingSafeEqual(left: string, right: string): boolean {
  if (!left || left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export function normalizeAdminUsername(value: unknown): string {
  return asString(value, 64).toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

async function hmac(value: string): Promise<string> {
  const secret = asString(Deno.env.get('ADMIN_DASHBOARD_SESSION_SECRET'), 4000)
    || asString(Deno.env.get('ADMIN_DASHBOARD_TOKEN'), 4000)
    || asString(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), 4000);
  if (!secret) throw new Error('missing_admin_session_secret');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function derivePasswordHash(password: string, salt: string, iterations: number): Promise<string> {
  const saltBytes = base64UrlToBytes(salt);
  const saltBuffer = saltBytes.buffer.slice(
    saltBytes.byteOffset,
    saltBytes.byteOffset + saltBytes.byteLength,
  ) as ArrayBuffer;
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBuffer,
      iterations,
    },
    passwordKey,
    256,
  );
  return bytesToBase64Url(new Uint8Array(bits));
}

export async function createPasswordCredentials(passwordRaw: unknown) {
  const password = asString(passwordRaw, 256);
  if (password.length < 6) throw new Error('password_too_short');
  const saltBytes = new Uint8Array(18);
  crypto.getRandomValues(saltBytes);
  const salt = bytesToBase64Url(saltBytes);
  return {
    password_salt: salt,
    password_hash: await derivePasswordHash(password, salt, PASSWORD_ITERATIONS),
    password_iterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyAdminPassword(passwordRaw: unknown, account: JsonRecord): Promise<boolean> {
  const password = asString(passwordRaw, 256);
  const salt = asString(account.password_salt, 200);
  const expected = asString(account.password_hash, 200);
  const iterations = Number(account.password_iterations || PASSWORD_ITERATIONS);
  if (!password || !salt || !expected || !Number.isInteger(iterations)) return false;
  const actual = await derivePasswordHash(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}

export async function createAdminSessionToken(account: JsonRecord): Promise<{ token: string; session: AdminSession; expires_in: number }> {
  const now = Math.floor(Date.now() / 1000);
  const configuredTtl = Number(Deno.env.get('ADMIN_DASHBOARD_SESSION_TTL_SECONDS') || ADMIN_SESSION_TTL_SECONDS);
  const expiresIn = Number.isFinite(configuredTtl)
    ? Math.min(Math.max(Math.floor(configuredTtl), 1800), 60 * 60 * 24 * 7)
    : ADMIN_SESSION_TTL_SECONDS;
  const session: AdminSession = {
    id: asString(account.id, 80),
    username: normalizeAdminUsername(account.username),
    display_name: asString(account.display_name, 120),
    permissions: Array.isArray(account.permissions) ? account.permissions.map((item) => asString(item, 80)).filter(Boolean) : [],
    session_version: Number(account.session_version || 1),
    must_change_password: account.must_change_password === true,
    iat: now,
    exp: now + expiresIn,
  };
  const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ typ: 'admin', ...session })));
  return { token: `${encoded}.${await hmac(encoded)}`, session, expires_in: expiresIn };
}

function fullLegacySession(): AdminSession {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: 'legacy-admin-token',
    username: 'legacy-admin',
    display_name: 'Legacy administrator',
    permissions: ['*'],
    session_version: 1,
    must_change_password: false,
    iat: now,
    exp: now + 300,
    legacy: true,
  };
}

export function adminHasPermission(session: AdminSession, permission: string): boolean {
  return session.permissions.includes('*') || session.permissions.includes(permission);
}

export async function authenticateAdminRequest(req: Request, supabase: any, permission = ''): Promise<AdminSession | null> {
  const provided = asString(req.headers.get('x-admin-token'), 8000);
  if (!provided) return null;

  const legacy = asString(Deno.env.get('ADMIN_DASHBOARD_TOKEN'), 8000);
  if (legacy && timingSafeEqual(provided, legacy)) return fullLegacySession();

  const [payload, signature] = provided.split('.');
  if (!payload || !signature || !timingSafeEqual(signature, await hmac(payload))) return null;
  const decoded = decodePayload<AdminSession & { typ?: string }>(payload);
  const now = Math.floor(Date.now() / 1000);
  if (!decoded || decoded.typ !== 'admin' || Number(decoded.exp || 0) <= now || !decoded.id) return null;

  const { data: account, error } = await supabase
    .from('admin_users')
    .select('id,username,display_name,permissions,active,must_change_password,session_version')
    .eq('id', decoded.id)
    .maybeSingle();
  if (error || !account?.active || Number(account.session_version || 0) !== Number(decoded.session_version || -1)) return null;

  const session: AdminSession = {
    id: asString(account.id, 80),
    username: normalizeAdminUsername(account.username),
    display_name: asString(account.display_name, 120),
    permissions: Array.isArray(account.permissions) ? account.permissions.map((item: unknown) => asString(item, 80)).filter(Boolean) : [],
    session_version: Number(account.session_version || 1),
    must_change_password: account.must_change_password === true,
    iat: Number(decoded.iat || 0),
    exp: Number(decoded.exp || 0),
  };
  if (permission && !adminHasPermission(session, permission)) return null;
  return session;
}

export function requestIp(req: Request): string {
  return (
    asString(req.headers.get('cf-connecting-ip'), 80)
    || asString(req.headers.get('x-real-ip'), 80)
    || asString(req.headers.get('x-forwarded-for'), 160).split(',')[0]?.trim()
    || 'unknown'
  ).slice(0, 80);
}

export async function recordAdminAudit(
  supabase: any,
  req: Request,
  session: AdminSession,
  action: string,
  details: { target_type?: string; target_id?: string; metadata?: JsonRecord } = {},
): Promise<void> {
  if (session.legacy) return;
  await supabase.from('admin_audit_logs').insert({
    admin_user_id: session.id,
    username: session.username,
    action: asString(action, 120),
    target_type: asString(details.target_type, 80) || null,
    target_id: asString(details.target_id, 180) || null,
    ip_address: requestIp(req),
    metadata: details.metadata || {},
  });
}
