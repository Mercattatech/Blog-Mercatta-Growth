import { requireUser } from '@/lib/guard.js';
import { getAllCategories } from '@/lib/posts.js';
import { siteUrl } from '@/lib/content.js';
import { getTenantById, getDefaultTenant } from '@/lib/tenant.js';
import PostEditor from '@/components/admin/PostEditor.js';

export const metadata = { title: 'Novo artigo' };

export default async function NewPost() {
  const user = await requireUser();
  const categories = await getAllCategories(user.tenant_id);
  const tenant = user.tenant || (user.tenant_id ? await getTenantById(user.tenant_id) : await getDefaultTenant());
  return (
    <PostEditor
      initial={{}}
      categories={categories}
      role={user.role}
      siteUrl={siteUrl()}
      tenant={JSON.parse(JSON.stringify(tenant || {}))}
    />
  );
}
