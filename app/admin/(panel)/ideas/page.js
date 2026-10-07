import { requireUser } from '@/lib/guard.js';
import { query } from '@/lib/db.js';
import { getAllCategories } from '@/lib/posts.js';
import { aiConfigured } from '@/lib/ai.js';
import IdeasManager from '@/components/admin/IdeasManager.js';

export const metadata = { title: 'Ideias com IA' };

export default async function IdeasPage() {
  await requireUser({ admin: true });
  const ideas = await query(`SELECT i.*, p.slug AS post_slug FROM ideas i LEFT JOIN posts p ON p.id = i.post_id WHERE i.status <> 'rejected' ORDER BY i.id DESC LIMIT 100`);
  const categories = await getAllCategories();
  return <IdeasManager initial={JSON.parse(JSON.stringify(ideas))} categories={categories} aiOn={aiConfigured()} />;
}
