import { requireUser } from '@/lib/guard.js';
import { query } from '@/lib/db.js';
import { getAllCategories } from '@/lib/posts.js';
import { aiConfigured } from '@/lib/ai.js';
import { listTenants } from '@/lib/tenant.js';
import IdeasManager from '@/components/admin/IdeasManager.js';

export const metadata = { title: 'Ideias com IA' };

export default async function IdeasPage() {
  const user = await requireUser({ admin: true });
  const isSuper = user.role === 'superadmin';
  const tenantFilter = user.tenant_id ? `AND (i.tenant_id = ${Number(user.tenant_id)} OR i.tenant_id IS NULL)` : '';
  const ideas = await query(`SELECT i.*, p.slug AS post_slug FROM ideas i LEFT JOIN posts p ON p.id = i.post_id WHERE i.status <> 'rejected' ${tenantFilter} ORDER BY i.id DESC LIMIT 100`);
  const categories = await getAllCategories();
  const tenants = isSuper ? await listTenants() : [];

  return (
    <IdeasManager
      initial={JSON.parse(JSON.stringify(ideas))}
      categories={categories}
      aiOn={aiConfigured()}
      isSuperAdmin={isSuper}
      tenants={tenants}
      userTenantId={user.tenant_id}
    />
  );
}

