import { revalidatePath } from 'next/cache';
import { bulkDeletePosts } from '@/lib/posts.js';
import { json, route } from '@/lib/api.js';

export const POST = route(async ({ req, user }) => {
  const { ids, action = 'trash' } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length) {
    return json({ error: 'Nenhum artigo selecionado.' }, 400);
  }

  const result = await bulkDeletePosts(ids, user, action);
  revalidatePath('/', 'layout');
  return json({ ok: true, ...result });
}, { admin: true });
