import { query } from '@/lib/db.js';
import { aiConfigured, generateIdeas } from '@/lib/ai.js';
import { json, route } from '@/lib/api.js';

export const maxDuration = 60;

export const GET = route(async () => {
  const rows = await query(`SELECT i.*, p.slug AS post_slug FROM ideas i LEFT JOIN posts p ON p.id = i.post_id
    WHERE i.status <> 'rejected' ORDER BY i.id DESC LIMIT 100`);
  return json({ ideas: rows, ai: aiConfigured() });
}, { admin: true });

/** Gera novas ideias com a IA, com base no treinamento do blog. */
export const POST = route(async ({ user }) => {
  const ideas = await generateIdeas();
  const saved = [];
  for (const i of ideas) {
    // eslint-disable-next-line no-await-in-loop
    const row = (await query(
      `INSERT INTO ideas (title, focus_keyword, angle, category_slug, search_intent, outline, reasoning, created_by)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8) RETURNING *`,
      [String(i.title).slice(0, 200), i.focus_keyword || null, i.angle || null, i.category_slug, i.search_intent || null,
        JSON.stringify(i.outline || []), i.reasoning || null, user.id]))[0];
    saved.push(row);
  }
  return json({ ideas: saved });
}, { admin: true });
