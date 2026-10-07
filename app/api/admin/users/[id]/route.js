import { query, queryOne } from '@/lib/db.js';
import { sendInvite } from '@/lib/invite.js';
import { mailConfigured } from '@/lib/mail.js';
import { httpError } from '@/lib/posts.js';
import { body, json, route } from '@/lib/api.js';

async function otherActiveAdmins(exceptId) {
  return (await queryOne("SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND active AND id <> $1", [exceptId])).n;
}

/** Altera papel/ativo/nome, ou reenvia o link de senha (action: "invite"). */
export const PATCH = route(async ({ req, user, params }) => {
  const id = Number(params.id);
  const target = await queryOne('SELECT * FROM users WHERE id = $1', [id]);
  if (!target) throw httpError(404, 'Usuário não encontrado.');
  const b = await body(req);

  if (b.action === 'invite') {
    const link = await sendInvite(req, target);
    return json({ ok: true, link: mailConfigured() ? undefined : link });
  }
  const role = b.role === 'admin' || b.role === 'author' ? b.role : target.role;
  const active = typeof b.active === 'boolean' ? b.active : target.active;
  const name = String(b.name || target.name).trim().slice(0, 80) || target.name;

  if (id === user.id && (role !== 'admin' || !active)) throw httpError(400, 'Você não pode remover seu próprio acesso de administrador.');
  if (target.role === 'admin' && (role !== 'admin' || !active) && (await otherActiveAdmins(id)) === 0) throw httpError(400, 'Mantenha ao menos um administrador ativo.');

  // desativar ou trocar de papel encerra as sessões desse usuário
  const bump = !active || role !== target.role;
  const row = await queryOne(
    `UPDATE users SET name = $2, role = $3, active = $4, token_version = token_version + $5 WHERE id = $1 RETURNING id, name, email, role, active`,
    [id, name, role, active, bump ? 1 : 0]);
  return json({ user: row });
}, { admin: true });

export const DELETE = route(async ({ user, params }) => {
  const id = Number(params.id);
  if (id === user.id) throw httpError(400, 'Você não pode excluir a si mesmo.');
  const target = await queryOne('SELECT role, active FROM users WHERE id = $1', [id]);
  if (!target) throw httpError(404, 'Usuário não encontrado.');
  if (target.role === 'admin' && target.active && (await otherActiveAdmins(id)) === 0) throw httpError(400, 'Mantenha ao menos um administrador ativo.');
  await query('DELETE FROM users WHERE id = $1', [id]); // artigos ficam (author_id → NULL)
  return json({ ok: true });
}, { admin: true });
