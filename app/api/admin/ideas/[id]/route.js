import { query, queryOne } from '@/lib/db.js';
import { body, json, route } from '@/lib/api.js';
import { httpError } from '@/lib/posts.js';

const str = (v, max) => String(v ?? '').trim().slice(0, max);

/** Edita a ideia (título, palavra-chave, ângulo, categoria) ou a rejeita. */
export const PATCH = route(async ({ req, params }) => {
  const id = Number(params.id);
  const idea = await queryOne('SELECT * FROM ideas WHERE id = $1', [id]);
  if (!idea) throw httpError(404, 'Ideia não encontrada.');
  const b = await body(req);
  if (b.status === 'rejected') {
    await query("UPDATE ideas SET status = 'rejected' WHERE id = $1", [id]);
    return json({ ok: true });
  }
  const row = await queryOne(
    `UPDATE ideas SET title = $2, focus_keyword = $3, angle = $4, category_slug = $5 WHERE id = $1 RETURNING *`,
    [id, str(b.title, 200) || idea.title, str(b.focus_keyword, 120) || idea.focus_keyword,
      b.angle !== undefined ? str(b.angle, 1000) : idea.angle, b.category_slug !== undefined ? str(b.category_slug, 80) || null : idea.category_slug]);
  return json({ idea: row });
}, { admin: true });

export const DELETE = route(async ({ params }) => {
  await query('DELETE FROM ideas WHERE id = $1', [Number(params.id)]);
  return json({ ok: true });
}, { admin: true });
