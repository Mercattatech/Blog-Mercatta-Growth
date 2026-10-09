import { requireAdmin } from '@/lib/guard.js';
import { 
  getScheduleConfig, 
  saveScheduleConfig, 
  prepareBatchIdeas, 
  generateSingleScheduledArticle, 
  generateScheduledBatch 
} from '@/lib/scheduler.js';
import { query, queryOne } from '@/lib/db.js';
import { getTenantById } from '@/lib/tenant.js';

export async function GET(req) {
  try {
    const user = await requireAdmin();
    const url = new URL(req.url);
    const tenantId = user.role === 'superadmin' && url.searchParams.get('tenant_id')
      ? Number(url.searchParams.get('tenant_id'))
      : (user.tenant_id || 1);

    const config = await getScheduleConfig(tenantId);
    const tenant = await getTenantById(tenantId);
    
    // Lista artigos agendados futuros para este tenant
    const scheduledPosts = await query(`
      SELECT p.id, p.title, p.slug, p.publish_at, p.cover_thumb, p.cover_url, p.created_at,
             t.name AS tenant_name
      FROM posts p
      LEFT JOIN tenants t ON t.id = p.tenant_id
      WHERE (p.tenant_id = $1 OR p.tenant_id IS NULL)
        AND p.deleted_at IS NULL
        AND p.status = 'published'
        AND p.publish_at > now()
      ORDER BY p.publish_at ASC
      LIMIT 50
    `, [tenantId]);

    return Response.json({
      config,
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan_name: tenant.plan_name || 'Pro',
        monthly_price: tenant.monthly_price,
      } : null,
      scheduled: scheduledPosts,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(req) {
  try {
    const user = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const tenantId = user.role === 'superadmin' && body.tenant_id
      ? Number(body.tenant_id)
      : (user.tenant_id || 1);

    // 1. Preparação rápida do lote de ideias (Retorna a lista de artigos a serem gerados)
    if (body.action === 'prepare_batch') {
      const prepared = await prepareBatchIdeas({
        tenantId,
        count: body.articles_total || 4,
        frequencyDays: body.frequency_days || 3,
        startDate: body.start_date ? new Date(body.start_date) : new Date(),
        preferredTime: body.preferred_time || '09:00',
        categorySlug: body.category_slug || null,
      });
      return Response.json({ ok: true, total: prepared.total, items: prepared.items });
    }

    // 2. Geração individual e precisa de cada artigo (para atualização da barra de progresso)
    if (body.action === 'generate_single') {
      if (!body.idea || !body.pubDate) {
        return Response.json({ error: 'Parâmetros idea e pubDate são obrigatórios.' }, { status: 400 });
      }
      const article = await generateSingleScheduledArticle({
        tenantId,
        idea: body.idea,
        pubDate: body.pubDate,
        categorySlug: body.category_slug || null,
        user,
      });
      return Response.json({ ok: true, article, index: body.index, total: body.total });
    }

    // 3. Fallback legado em lote único
    if (body.action === 'generate') {
      const result = await generateScheduledBatch({
        tenantId,
        count: body.articles_total || 4,
        frequencyDays: body.frequency_days || 3,
        startDate: body.start_date ? new Date(body.start_date) : new Date(),
        preferredTime: body.preferred_time || '09:00',
        categorySlug: body.category_slug || null,
        user,
      });
      return Response.json(result);
    }

    // Atualização de plano simulado/solicitado pelo usuário
    if (body.action === 'upgrade_plan') {
      const targetPlan = body.plan_name || 'Enterprise';
      await query('UPDATE tenants SET plan_name = $1, updated_at = now() WHERE id = $2', [targetPlan, tenantId]);
      const updatedTenant = await getTenantById(tenantId);
      return Response.json({ ok: true, tenant: updatedTenant });
    }

    // 4. Salva as configurações de agendamento e modo contínuo
    const saved = await saveScheduleConfig({
      tenantId,
      status: body.status || 'active',
      articles_total: Number(body.articles_total) || 4,
      frequency_days: Number(body.frequency_days) || 3,
      start_date: body.start_date ? new Date(body.start_date) : new Date(),
      end_date: body.end_date ? new Date(body.end_date) : null,
      preferred_time: body.preferred_time || '09:00',
      category_slug: body.category_slug || null,
      is_continuous: !!body.is_continuous,
    });

    return Response.json({ ok: true, config: saved });
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 });
  }
}
