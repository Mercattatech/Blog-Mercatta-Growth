import { query } from '@/lib/db.js';
import { json, route } from '@/lib/api.js';

/** Busca artigos publicados para escolher como referência de estilo no treinamento. */
export const GET = route(async ({ req }) => {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80);
  const rows = await query(
    `SELECT id, title FROM posts WHERE status = 'published' AND ($1 = '' OR title ILIKE '%' || $1 || '%') ORDER BY publish_at DESC LIMIT 12`, [q]);
  return json({ posts: rows });
}, { admin: true });
