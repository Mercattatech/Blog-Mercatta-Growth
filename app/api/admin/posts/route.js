import { revalidatePath } from 'next/cache';
import { adminListPosts, savePost } from '@/lib/posts.js';
import { body, json, route } from '@/lib/api.js';

export const GET = route(async ({ req, user }) => {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const limit = 20;
  const out = await adminListPosts({ user, status: sp.get('status') || '', q: (sp.get('q') || '').trim().slice(0, 100), limit, offset: (page - 1) * limit });
  return json({ ...out, page, pages: Math.max(1, Math.ceil(out.total / limit)) });
});

export const POST = route(async ({ req, user }) => {
  const res = await savePost(await body(req), user);
  revalidatePath('/', 'layout');
  return json(res, 201);
});
