import { query, queryOne } from '@/lib/db.js';
import { createSession, hashPassword, validatePassword, verifyPassword } from '@/lib/auth.js';
import { body, json, route } from '@/lib/api.js';

/** Perfil: alterar nome e/ou senha (a troca de senha exige a senha atual e encerra as outras sessões). */
export const PUT = route(async ({ req, user }) => {
  const b = await body(req);
  const name = String(b.name || user.name).trim().slice(0, 80) || user.name;
  if (b.new_password) {
    const err = validatePassword(b.new_password);
    if (err) return json({ error: err }, 400);
    const row = await queryOne('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    if (!(await verifyPassword(String(b.current_password || ''), row.password_hash))) return json({ error: 'A senha atual está incorreta.' }, 400);
    const updated = await queryOne(
      'UPDATE users SET name = $2, password_hash = $3, token_version = token_version + 1 WHERE id = $1 RETURNING id, role, token_version',
      [user.id, name, await hashPassword(b.new_password)]);
    await createSession(updated);
  } else {
    await query('UPDATE users SET name = $2 WHERE id = $1', [user.id, name]);
  }
  return json({ ok: true });
});
