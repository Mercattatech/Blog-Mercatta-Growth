import { requireUser } from '@/lib/guard.js';
import { getAllCategories } from '@/lib/posts.js';
import { siteUrl } from '@/lib/content.js';
import PostEditor from '@/components/admin/PostEditor.js';

export const metadata = { title: 'Novo artigo' };

export default async function NewPost() {
  const user = await requireUser();
  const categories = await getAllCategories();
  return <PostEditor initial={{}} categories={categories} role={user.role} siteUrl={siteUrl()} />;
}
