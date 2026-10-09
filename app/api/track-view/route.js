import { query } from '@/lib/db.js';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { postId, tenantId } = await req.json().catch(() => ({}));
    if (!postId) return Response.json({ ok: false }, { status: 400 });

    const pId = Number(postId);
    const tId = tenantId ? Number(tenantId) : null;

    // Incrementa views_count geral do post
    await query('UPDATE posts SET views_count = coalesce(views_count, 0) + 1 WHERE id = $1', [pId]);

    // Registra na tabela diária para curvas de crescimento e analytics
    await query(`
      INSERT INTO post_views_daily (post_id, tenant_id, view_date, views_count)
      VALUES ($1, $2, CURRENT_DATE, 1)
      ON CONFLICT (post_id, view_date)
      DO UPDATE SET views_count = post_views_daily.views_count + 1
    `, [pId, tId]);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
