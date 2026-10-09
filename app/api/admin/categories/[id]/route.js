import { json, route } from '@/lib/api.js';
import { query, queryOne } from '@/lib/db.js';

const slugify = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

export const PATCH = route(async ({ req, user, params }) => {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return json({ error: 'O nome da categoria é obrigatório.' }, 400);

  const slug = slugify(body.slug || name);
  const tenantId = user.tenant_id || null;

  // Verifica se categoria pertence ao tenant
  const existing = await queryOne(
    'SELECT * FROM categories WHERE id = $1 AND (tenant_id = $2 OR ($2 IS NULL AND tenant_id IS NULL))',
    [Number(id), tenantId]
  );
  if (!existing) return json({ error: 'Categoria não encontrada.' }, 404);

  // Verifica se outro registro já usa esse slug
  const conflict = await queryOne(
    'SELECT id FROM categories WHERE slug = $1 AND id <> $2 AND (tenant_id = $3 OR ($3 IS NULL AND tenant_id IS NULL))',
    [slug, Number(id), tenantId]
  );
  if (conflict) return json({ error: 'Já existe uma categoria com este slug.' }, 400);

  const updated = await queryOne(
    'UPDATE categories SET name = $1, slug = $2 WHERE id = $3 RETURNING id, slug, name, tenant_id',
    [name, slug, Number(id)]
  );

  return json({ ok: true, category: updated });
});

export const DELETE = route(async ({ user, params }) => {
  const { id } = params;
  const tenantId = user.tenant_id || null;

  const existing = await queryOne(
    'SELECT * FROM categories WHERE id = $1 AND (tenant_id = $2 OR ($2 IS NULL AND tenant_id IS NULL))',
    [Number(id), tenantId]
  );
  if (!existing) return json({ error: 'Categoria não encontrada.' }, 404);

  // Remove associações em post_categories
  await query('DELETE FROM post_categories WHERE category_id = $1', [Number(id)]);
  // Remove a categoria
  await query('DELETE FROM categories WHERE id = $1', [Number(id)]);

  return json({ ok: true, deleted: true });
});
