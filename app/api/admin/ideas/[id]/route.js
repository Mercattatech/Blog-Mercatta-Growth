import { query, queryOne } from '@/lib/db.js';
import { body, json, route } from '@/lib/api.js';
import { httpError } from '@/lib/posts.js';

const str = (v, max) => String(v ?? '').trim().slice(0, max);

/** Garante que a ideia pertence à empresa do usuário (Super Admin fora de impersonação acessa todas). */
async function loadIdea(id, user) {
  const idea = await queryOne('SELECT * FROM ideas WHERE id = $1', [id]);
  if (!idea) throw httpError(404, 'Ideia não encontrada.');
  if (user.role !== 'superadmin' && user.tenant_id && idea.tenant_id && idea.tenant_id !== user.tenant_id) {
    throw httpError(404, 'Ideia não encontrada.');
  }
  return idea;
}

/** Edita a ideia (título, palavra-chave, ângulo, categoria), envia para a lixeira ou restaura. */
export const PATCH = route(async ({ req, user, params }) => {
  const id = Number(params.id);
  const idea = await loadIdea(id, user);
  const b = await body(req);
  if (b.status === 'rejected') {
    await query("UPDATE ideas SET status = 'rejected' WHERE id = $1", [id]);
    return json({ ok: true });
  }
  if (b.status === 'suggested') {
    // Restaurar da lixeira (ideias que já viraram artigo voltam como 'written')
    const row = await queryOne(
      "UPDATE ideas SET status = CASE WHEN post_id IS NOT NULL THEN 'written' ELSE 'suggested' END, error = NULL WHERE id = $1 RETURNING *",
      [id]
    );
    return json({ ok: true, idea: row });
  }
  const row = await queryOne(
    `UPDATE ideas SET title = $2, focus_keyword = $3, angle = $4, category_slug = $5 WHERE id = $1 RETURNING *`,
    [id, str(b.title, 200) || idea.title, str(b.focus_keyword, 120) || idea.focus_keyword,
      b.angle !== undefined ? str(b.angle, 1000) : idea.angle, b.category_slug !== undefined ? str(b.category_slug, 80) || null : idea.category_slug]);
  return json({ idea: row });
}, { admin: true });

/** Exclui definitivamente (usado na Lixeira). */
export const DELETE = route(async ({ user, params }) => {
  const id = Number(params.id);
  await loadIdea(id, user);
  await query('DELETE FROM ideas WHERE id = $1', [id]);
  return json({ ok: true });
}, { admin: true });
