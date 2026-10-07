import { query, queryOne } from '@/lib/db.js';
import { sendInvite } from '@/lib/invite.js';
import { mailConfigured } from '@/lib/mail.js';
import { body, isEmail, json, route } from '@/lib/api.js';

export const GET = route(async () => {
  const users = await query(`SELECT u.id, u.name, u.email, u.role, u.active, u.last_login, u.created_at, u.password_hash IS NOT NULL AS has_password,
    (SELECT count(*)::int FROM posts p WHERE p.author_id = u.id) AS posts FROM users u ORDER BY u.id`);
  return json({ users, smtp: mailConfigured() });
}, { admin: true });

/** Cria um usuário sem senha e envia um convite com link para ele mesmo definir a senha (válido por 48 h). */
export const POST = route(async ({ req }) => {
  const { name, email, role } = await body(req);
  if (!String(name || '').trim()) return json({ error: 'Informe o nome.' }, 400);
  if (!isEmail(email)) return json({ error: 'E-mail inválido.' }, 400);
  if (await queryOne('SELECT 1 AS x FROM users WHERE lower(email) = lower($1)', [email.trim()])) return json({ error: 'Já existe um usuário com este e-mail.' }, 409);
  const user = await queryOne('INSERT INTO users (name, email, role) VALUES ($1, lower($2), $3) RETURNING id, name, email, role',
    [String(name).trim().slice(0, 80), email.trim(), role === 'admin' ? 'admin' : 'author']);
  const link = await sendInvite(req, user);
  return json({ user, link: mailConfigured() ? undefined : link }, 201);
}, { admin: true });
