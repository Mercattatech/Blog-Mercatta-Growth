import { query, queryOne } from '@/lib/db.js';
import { createSession, verifyPassword } from '@/lib/auth.js';
import { body, isEmail, json, route } from '@/lib/api.js';

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
// hash falso para manter o tempo de resposta igual quando o e-mail não existe
const DUMMY = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5bQ0q3Qy7a0Yw3o8y1kO9G6o2V9n0Aa';

export const POST = route(async ({ req }) => {
  const { email, password } = await body(req);
  const generic = () => json({ error: 'E-mail ou senha incorretos.' }, 401);
  if (!isEmail(email) || typeof password !== 'string' || !password) return generic();

  const user = await queryOne('SELECT * FROM users WHERE lower(email) = lower($1)', [email.trim()]);
  if (!user) { await verifyPassword(password, DUMMY); return generic(); }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const min = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    return json({ error: `Muitas tentativas. Tente novamente em ${min} min ou redefina sua senha.` }, 429);
  }
  const ok = user.active && (await verifyPassword(password, user.password_hash));
  if (!ok) {
    const fails = (user.failed_attempts || 0) + 1;
    if (fails >= MAX_FAILS) {
      await query(`UPDATE users SET failed_attempts = 0, locked_until = now() + ($2 || ' minutes')::interval WHERE id = $1`, [user.id, String(LOCK_MINUTES)]);
    } else {
      await query('UPDATE users SET failed_attempts = $2 WHERE id = $1', [user.id, fails]);
    }
    return generic();
  }
  await query('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = now() WHERE id = $1', [user.id]);
  await createSession(user);
  return json({ ok: true });
}, { auth: false });
