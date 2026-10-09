import { revalidatePath } from 'next/cache';
import { permanentDeletePost } from '@/lib/posts.js';
import { json, route } from '@/lib/api.js';

export const DELETE = route(async ({ user, params }) => {
  const deleted = await permanentDeletePost(Number(params.id), user);
  revalidatePath('/', 'layout');
  return json({ ok: true, post: deleted });
}, { admin: true });
