import { revalidatePath } from 'next/cache';
import { emptyTrash } from '@/lib/posts.js';
import { json, route } from '@/lib/api.js';

export const DELETE = route(async ({ req, user }) => {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId');
  const result = await emptyTrash(user, tenantId ? Number(tenantId) : null);
  revalidatePath('/', 'layout');
  return json({ ok: true, ...result });
}, { admin: true });
