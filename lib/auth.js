import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { query, queryOne } from './db.js';

export const COOKIE = 'braziw_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias
export const MIN_PASSWORD = 10;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET não configurado.');
    return new TextEncoder().encode('dev-only-secret-change-me-dev-only-secret');
  }
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
  store.set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Usuário logado (ou null). Valida assinatura, usuário ativo e versão do token (logout global ao trocar senha). */
export async function getUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = await queryOne(
      'SELECT id, name, email, role, active, token_version FROM users WHERE id = $1', [Number(payload.sub)]);
    if (!user || !user.active || user.token_version !== payload.tv) return null;
    return user;
  } catch {
    return null;
  }
}

/** Proteção básica contra CSRF: requisições mutáveis só da mesma origem. */
export async function sameOrigin() {
  const h = await headers();
  const origin = h.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === h.get('host'); } catch { return false; }
}

export async function createResetToken(userId, hours = 1) {
  const token = newToken();
  await query('DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL', [userId]);
  await query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + ($3 || ' hours')::interval)`,
    [userId, sha256(token), String(hours)]);
  return token;
}
