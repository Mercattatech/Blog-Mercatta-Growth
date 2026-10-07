import { query, queryOne } from '@/lib/db.js';
import { createSession, hashPassword, sha256, validatePassword } from '@/lib/auth.js';
import { body, json, route } from '@/lib/api.js';

const find = (token) => queryOne(
  `SELECT r.id, r.user_id, u.name, u.email, u.active FROM password_resets r JOIN users u ON u.id = r.user_id
   WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.expires_at > now()`, [sha256(String(token || ''))]);

/** Valida o link (usado pela página para mostrar o formulário ou o aviso de link expirado). */
export const GET = route(async ({ req }) => {
  const token = new URL(req.url).searchParams.get('token');
  const r = token ? await find(token) : null;
  if (!r || !r.active) return json({ valid: false });
  return json({ valid: true, email: r.email, name: r.name });
}, { auth: false });

export const POST = route(async ({ req }) => {
  const { token, password } = await body(req);
  const err = validatePassword(password);
  if (err) return json({ error: err }, 400);
  const r = token ? await find(token) : null;
  if (!r || !r.active) return json({ error: 'Link inválido ou expirado. Peça um novo.' }, 400);

  const hash = await hashPassword(password);
  // token_version+1 encerra todas as sessões antigas desse usuário
  const user = await queryOne(
    `UPDATE users SET password_hash = $2, token_version = token_version + 1, failed_attempts = 0, locked_until = NULL, last_login = now()
     WHERE id = $1 RETURNING id, role, token_version`, [r.user_id, hash]);
  await query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [r.user_id]);
  await createSession(user);
  return json({ ok: true });
}, { auth: false });
