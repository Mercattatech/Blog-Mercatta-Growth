import { query, queryOne } from '@/lib/db.js';
import { sendInvite } from '@/lib/invite.js';
import { mailConfigured } from '@/lib/mail.js';
import { hashPassword, validatePassword } from '@/lib/auth.js';
import { body, isEmail, json, route } from '@/lib/api.js';

export const GET = route(async () => {
  const users = await query(`SELECT u.id, u.name, u.email, u.role, u.active, u.last_login, u.created_at, u.password_hash IS NOT NULL AS has_password,
    (SELECT count(*)::int FROM posts p WHERE p.author_id = u.id) AS posts FROM users u ORDER BY u.id`);
  return json({ users, smtp: mailConfigured() });
}, { admin: true });

/** Cria um usuário manualmente com senha OU gera um convite caso a senha não seja fornecida. */
export const POST = route(async ({ req }) => {
  const { name, email, password, role } = await body(req);
  if (!String(name || '').trim()) return json({ error: 'Informe o nome.' }, 400);
  if (!isEmail(email)) return json({ error: 'E-mail inválido.' }, 400);
  if (await queryOne('SELECT 1 AS x FROM users WHERE lower(email) = lower($1)', [email.trim()])) {
    return json({ error: 'Já existe um usuário com este e-mail.' }, 409);
  }

  let hash = null;
  if (password && typeof password === 'string' && password.trim()) {
    const err = validatePassword(password);
    if (err) return json({ error: err }, 400);
    hash = await hashPassword(password);
  }

  const user = await queryOne(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, lower($2), $3, $4) RETURNING id, name, email, role',
    [String(name).trim().slice(0, 80), email.trim(), hash, role === 'admin' ? 'admin' : 'author']
  );

  let link = undefined;
  if (!hash) {
    link = await sendInvite(req, user);
  }

  return json({
    user,
    created_with_password: Boolean(hash),
    link: mailConfigured() ? undefined : link,
  }, 201);
}, { admin: true });
