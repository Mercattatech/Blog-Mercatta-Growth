import { revalidatePath } from 'next/cache';
import { adminGetPost, deletePost, httpError, savePost } from '@/lib/posts.js';
import { body, json, route } from '@/lib/api.js';

export const GET = route(async ({ user, params }) => {
  const post = await adminGetPost(Number(params.id), user);
  if (!post) throw httpError(404, 'Artigo não encontrado.');
  return json(post);
});

export const PUT = route(async ({ req, user, params }) => {
  const res = await savePost(await body(req), user, Number(params.id));
  revalidatePath('/', 'layout');
  return json(res);
});

export const DELETE = route(async ({ user, params }) => {
  await deletePost(Number(params.id), user);
  revalidatePath('/', 'layout');
  return json({ ok: true });
});
