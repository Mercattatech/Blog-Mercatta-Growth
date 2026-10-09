import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/guard.js';
import { adminGetPost, getAllCategories } from '@/lib/posts.js';
import { siteUrl } from '@/lib/content.js';
import { getTenantById, getDefaultTenant } from '@/lib/tenant.js';
import PostEditor from '@/components/admin/PostEditor.js';

export const metadata = { title: 'Editar artigo' };

export default async function EditPost({ params }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const post = await adminGetPost(Number(id), user);
  if (!post) notFound();
  const categories = await getAllCategories(user.tenant_id);
  const tenant = user.tenant || (user.tenant_id ? await getTenantById(user.tenant_id) : await getDefaultTenant());
  // serializa datas/JSON para o componente de cliente
  return (
    <PostEditor
      initial={JSON.parse(JSON.stringify(post))}
      categories={categories}
      role={user.role}
      siteUrl={siteUrl()}
      tenant={JSON.parse(JSON.stringify(tenant || {}))}
    />
  );
}
