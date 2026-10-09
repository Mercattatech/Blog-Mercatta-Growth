import { revalidatePath } from 'next/cache';
import { restorePost } from '@/lib/posts.js';
import { json, route } from '@/lib/api.js';

export const POST = route(async ({ user, params }) => {
  const restored = await restorePost(Number(params.id), user);
  revalidatePath('/', 'layout');
  return json({ ok: true, post: restored });
}, { admin: true });
