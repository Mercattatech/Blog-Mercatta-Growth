import { destroySession } from '@/lib/auth.js';
import { json, route } from '@/lib/api.js';

export const POST = route(async () => {
  await destroySession();
  return json({ ok: true });
}, { auth: false });
