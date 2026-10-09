import { getTraining, saveTraining } from '@/lib/settings.js';
import { query } from '@/lib/db.js';
import { aiConfigured } from '@/lib/ai.js';
import { body, json, route } from '@/lib/api.js';

export const GET = route(async ({ user }) => {
  const tenantId = user.tenant_id || 1;
  const training = await getTraining(tenantId);
  const refs = training.reference_post_ids.length
    ? await query('SELECT id, title FROM posts WHERE id = ANY($1::int[])', [training.reference_post_ids]) : [];
  return json({ training, refs, ai: aiConfigured(), model: process.env.GEMINI_MODEL || 'gemini-flash-latest' });
}, { admin: true });

export const PUT = route(async ({ req, user }) => {
  const tenantId = user.tenant_id || 1;
  const t = await saveTraining(await body(req), tenantId);
  return json({ training: t });
}, { admin: true });
