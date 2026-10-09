import { requireUser } from '@/lib/guard.js';
import { query } from '@/lib/db.js';
import { ensureTenantCategories } from '@/lib/posts.js';
import { getTenantById, getDefaultTenant } from '@/lib/tenant.js';
import CategoriesManager from '@/components/admin/CategoriesManager.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Gerenciar Categorias — Painel',
};

export default async function CategoriesPage() {
  const user = await requireUser();
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

  const tenant = tenantId ? await getTenantById(tenantId) : await getDefaultTenant();

  return (
    <CategoriesManager
      initialCategories={JSON.parse(JSON.stringify(rows || []))}
      tenant={JSON.parse(JSON.stringify(tenant || {}))}
    />
  );
}
