import { json, route } from '@/lib/api.js';
import { query, queryOne } from '@/lib/db.js';
import { ensureTenantCategories } from '@/lib/posts.js';

const slugify = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

export const GET = route(async ({ user }) => {
  const tenantId = user.tenant_id;
  if (tenantId) {
    await ensureTenantCategories(tenantId);
  }

  const rows = await query(`
    SELECT 
      c.id,
      c.slug,
      c.name,
      c.tenant_id,
      (
        SELECT count(*)::int 
        FROM post_categories pc 
        JOIN posts p ON p.id = pc.post_id 
        WHERE pc.category_id = c.id
      ) AS posts_count
    FROM categories c
    WHERE c.tenant_id = $1 OR ($1 IS NULL AND (c.tenant_id IS NULL OR c.tenant_id = 1))
    ORDER BY c.name ASC
  `, [tenantId || null]);

  return json({ categories: rows });
});

export const POST = route(async ({ req, user }) => {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return json({ error: 'O nome da categoria é obrigatório.' }, 400);
  }

  const slug = slugify(body.slug || name);
  if (!slug) {
    return json({ error: 'Slug inválido.' }, 400);
  }

  const tenantId = user.tenant_id || null;

  // Verifica se slug já existe para este tenant
  const existing = await queryOne(
    'SELECT id FROM categories WHERE slug = $1 AND (tenant_id = $2 OR ($2 IS NULL AND tenant_id IS NULL))',
    [slug, tenantId]
  );
  if (existing) {
    return json({ error: 'Já existe uma categoria com este slug.' }, 400);
  }

  const created = await queryOne(
    'INSERT INTO categories (tenant_id, slug, name) VALUES ($1, $2, $3) RETURNING id, slug, name, tenant_id',
    [tenantId, slug, name]
  );

  return json({ ok: true, category: created }, 201);
});
