import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { query, queryOne } from './db.js';

export const COOKIE = 'braziw_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias
export const MIN_PASSWORD = 10;

function secret() {
  const s = process.env.AUTH_SECRET
    || process.env.SUPABASE_JWT_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.POSTGRES_PASSWORD
    || 'braziw-blog-default-secret-production-2026-safe-fallback';
  return new TextEncoder().encode(s);
}

export const hashPassword = (pw) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw, hash) => (hash ? bcrypt.compare(pw, hash) : Promise.resolve(false));

export function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD) return `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use letras e números na senha.';
  return null;
}

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('hex');

export async function createSession(user) {
  const token = await new SignJWT({ role: user.role, tv: user.token_version })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const store = await cookies();
  const h = await headers().catch(() => null);
  const proto = h?.get('x-forwarded-proto') || '';
  // Se o usuário acessar via HTTP, não força secure: true para evitar que navegadores descartem o cookie
  const isSecure = proto === 'https' || (process.env.NODE_ENV === 'production' && proto !== 'http');
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function setImpersonatedTenant(tenantId) {
  const store = await cookies();
  store.set('mercatta_impersonate_tenant', String(tenantId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 horas
  });
}

export async function clearImpersonatedTenant() {
  const store = await cookies();
  store.set('mercatta_impersonate_tenant', '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Usuário logado (ou null). Valida assinatura, usuário ativo e versão do token (logout global ao trocar senha). */
export async function getUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = await queryOne(
      'SELECT id, tenant_id, name, email, role, active, token_version FROM users WHERE id = $1', [Number(payload.sub)]);
    if (!user || !user.active || user.token_version !== payload.tv) return null;

    // Suporte Super Admin: impersonação direta de tenant sem senha
    const isSuper = user.role === 'superadmin'
      || (user.role === 'admin' && (user.email === 'admin@grupomercatta.com.br' || user.tenant_id === 1));

    const impersonateTenantId = store.get('mercatta_impersonate_tenant')?.value;
    if (isSuper && impersonateTenantId) {
      const impId = Number(impersonateTenantId);
      const targetTenant = await queryOne(
        'SELECT id, slug, name, custom_domain, status, plan_name, primary_color, accent_color, button_color, bg_color, logo_url FROM tenants WHERE id = $1',
        [impId]
      );
      if (targetTenant) {
        user.original_tenant_id = user.tenant_id;
        user.tenant_id = targetTenant.id;
        user.tenant = targetTenant;
        user.is_impersonating = true;
        return user;
      }
    }

    if (user.tenant_id) {
      const tenant = await queryOne('SELECT id, slug, name, custom_domain, status, plan_name, primary_color, accent_color, button_color, bg_color, logo_url FROM tenants WHERE id = $1', [user.tenant_id]);
      user.tenant = tenant || null;
    }
    return user;
  } catch {
    return null;
  }
}

/** Proteção básica contra CSRF: requisições mutáveis só da mesma origem. */
export async function sameOrigin() {
  const h = await headers().catch(() => null);
  if (!h) return true;
  const origin = h.get('origin');
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const host = h.get('host');
    const fwdHost = h.get('x-forwarded-host');
    return originHost === host || (fwdHost && originHost === fwdHost);
  } catch {
    return false;
  }
}

export async function createResetToken(userId, hours = 1) {
  const token = newToken();
  await query('DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL', [userId]);
  await query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + ($3 || ' hours')::interval)`,
    [userId, sha256(token), String(hours)]);
  return token;
}
