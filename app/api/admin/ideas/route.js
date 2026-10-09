import { query } from '@/lib/db.js';
import { aiConfigured, generateIdeas } from '@/lib/ai.js';
import { json, route } from '@/lib/api.js';

export const maxDuration = 60;

export const GET = route(async ({ req, user }) => {
  const url = new URL(req.url);
  const reqTenant = url.searchParams.get('tenantId');
  const isSuper = user.role === 'superadmin';

  let tenantId = user.tenant_id;
  if (isSuper && reqTenant) {
    tenantId = Number(reqTenant);
  }

  const tenantFilter = tenantId ? `AND (i.tenant_id = ${Number(tenantId)} OR i.tenant_id IS NULL)` : '';
  const rows = await query(`SELECT i.*, p.slug AS post_slug FROM ideas i LEFT JOIN posts p ON p.id = i.post_id
    WHERE i.status <> 'rejected' ${tenantFilter} ORDER BY i.id DESC LIMIT 100`);
  return json({ ideas: rows, ai: aiConfigured() });
}, { admin: true });

/** Gera novas ideias com a IA, com base no treinamento do blog da empresa. */
export const POST = route(async ({ req, user }) => {
  const bodyData = await req.json().catch(() => ({}));
  const isSuper = user.role === 'superadmin';
  const tenantId = (isSuper && bodyData.tenantId) ? Number(bodyData.tenantId) : (user.tenant_id || 1);

  const ideas = await generateIdeas({ tenantId });
  const saved = [];
  for (const i of ideas) {
    // eslint-disable-next-line no-await-in-loop
    const row = (await query(
      `INSERT INTO ideas (tenant_id, title, focus_keyword, angle, category_slug, search_intent, outline, reasoning, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) RETURNING *`,
      [tenantId, String(i.title).slice(0, 200), i.focus_keyword || null, i.angle || null, i.category_slug, i.search_intent || null,
        JSON.stringify(i.outline || []), i.reasoning || null, user.id]))[0];
    saved.push(row);
  }
  return json({ ideas: saved });
}, { admin: true });
