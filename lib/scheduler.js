import { query, queryOne } from './db.js';
import { getTraining } from './settings.js';
import { getTenantById } from './tenant.js';
import { generateIdeas, writeArticle } from './ai.js';
import { generateAutoCoverForPost } from './covers.js';
import { savePost } from './posts.js';
import { COVER_PRESETS } from './coverPresets.js';

/**
 * Retorna as configurações de agendamento automático do tenant
 */
export async function getScheduleConfig(tenantId) {
  if (!tenantId) return null;
  const row = await queryOne('SELECT * FROM post_schedules WHERE tenant_id = $1 ORDER BY id DESC LIMIT 1', [tenantId]);
  return row || null;
}

/**
 * Salva ou atualiza a regra de agendamento do tenant
 */
export async function saveScheduleConfig({
  tenantId,
  status = 'active',
  articles_total = 4,
  frequency_days = 3,
  start_date = new Date(),
  end_date = null,
  preferred_time = '09:00',
  category_slug = null,
  is_continuous = false,
}) {
  const existing = await getScheduleConfig(tenantId);
  if (existing) {
    return queryOne(`
      UPDATE post_schedules
      SET status = $1, articles_total = $2, frequency_days = $3, start_date = $4,
          end_date = $5, preferred_time = $6, category_slug = $7, is_continuous = $8, updated_at = now()
      WHERE id = $9 RETURNING *
    `, [status, articles_total, frequency_days, start_date, end_date, preferred_time, category_slug, !!is_continuous, existing.id]);
  }
  return queryOne(`
    INSERT INTO post_schedules (
      tenant_id, status, articles_total, frequency_days, start_date, end_date, preferred_time, category_slug, is_continuous
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [tenantId, status, articles_total, frequency_days, start_date, end_date, preferred_time, category_slug, !!is_continuous]);
}

/**
 * Prepara a lista de ideias e datas de publicação para um lote de artigos agendados.
 * Rápido e não consome geração completa de artigos.
 */
export async function prepareBatchIdeas({
  tenantId,
  count = 4,
  frequencyDays = 3,
  startDate = new Date(),
  preferredTime = '09:00',
  categorySlug = null,
}) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error('Empresa cliente não encontrada.');

  const totalCount = Math.max(1, Math.min(Number(count) || 4, 30));
  const freqDays = Math.max(1, Number(frequencyDays) || 3);

  // 1. Gera ideias inéditas para a quantidade desejada
  const ideas = await generateIdeas({ count: totalCount + 2, tenantId });
  if (!ideas.length) throw new Error('A IA não conseguiu gerar ideias inéditas no momento.');

  const startMoment = new Date(startDate);
  const [prefHour, prefMin] = (preferredTime || '09:00').split(':').map((n) => parseInt(n, 10) || 0);

  const selectedIdeas = ideas.slice(0, totalCount);
  const items = selectedIdeas.map((idea, i) => {
    if (categorySlug) idea.category_slug = categorySlug;
    const pubDate = new Date(startMoment);
    pubDate.setDate(pubDate.getDate() + (i * freqDays));
    pubDate.setHours(prefHour, prefMin, 0, 0);

    return {
      index: i + 1,
      total: totalCount,
      idea,
      pubDate: pubDate.toISOString(),
      title: idea.title,
      category_slug: idea.category_slug || categorySlug || 'noticias',
    };
  });

  return {
    total: items.length,
    items,
  };
}

/**
 * Gera um único artigo agendado a partir de uma ideia preparada,
 * com capa oficial da marca e salvamento no banco de dados.
 */
export async function generateSingleScheduledArticle({
  tenantId,
  idea,
  pubDate,
  categorySlug = null,
  user = null,
}) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error('Empresa cliente não encontrada.');

  if (categorySlug) idea.category_slug = categorySlug;

  // 1. Redige o artigo completo com base no treinamento do tenant
  const article = await writeArticle(idea, tenantId);

  // 2. Gera capa temática exclusiva com o logotipo do cliente
  let cover = null;
  try {
    cover = await generateAutoCoverForPost({
      title: article.title,
      excerpt: article.excerpt,
      categorySlug: article.category_slug,
      focusKeyword: article.focus_keyword,
      tenant,
    });
  } catch (err) {
    console.warn('[scheduler] Falha na geração da capa automática:', err.message);
  }

  const coverUrl = cover?.url || COVER_PRESETS[0].url;
  const coverThumb = cover?.thumb || COVER_PRESETS[0].thumb || coverUrl;

  // 3. Salva o post no banco com status 'published' e publish_at no futuro (Agendado)
  const postPayload = {
    tenant_id: tenantId,
    title: article.title,
    slug: article.slug,
    content: article.content_html,
    excerpt: article.excerpt,
    tags: article.tags || [],
    focus_keyword: article.focus_keyword || '',
    secondary_keywords: article.secondary_keywords || [],
    seo_title: article.seo_title || article.title,
    seo_description: article.meta_description || article.excerpt,
    faq: article.faq || [],
    cover_url: coverUrl,
    cover_thumb: coverThumb,
    cover_alt: article.cover_alt || article.title,
    category_slug: article.category_slug || categorySlug || 'noticias',
    publish_at: new Date(pubDate).toISOString(),
    action: 'publish', // status published + publish_at futuro = scheduled
  };

  const dummyUser = user || { id: null, role: 'admin', tenant_id: tenantId };
  const saved = await savePost(postPayload, dummyUser);

  await query('UPDATE post_schedules SET articles_generated = articles_generated + 1, last_run_at = now() WHERE tenant_id = $1', [tenantId]);

  return {
    id: saved.id,
    title: saved.title,
    slug: saved.slug,
    publish_at: new Date(pubDate).toISOString(),
    cover_url: coverUrl,
    cover_thumb: coverThumb,
    status: 'scheduled',
  };
}

/**
 * Gera um lote completo de artigos agendados (utilizado pelo MCP ou chamadas diretas).
 */
export async function generateScheduledBatch({
  tenantId,
  count = 4,
  frequencyDays = 3,
  startDate = new Date(),
  preferredTime = '09:00',
  categorySlug = null,
  user = null,
}) {
  const prepared = await prepareBatchIdeas({
    tenantId,
    count,
    frequencyDays,
    startDate,
    preferredTime,
    categorySlug,
  });

  const createdArticles = [];
  for (const item of prepared.items) {
    const created = await generateSingleScheduledArticle({
      tenantId,
      idea: item.idea,
      pubDate: item.pubDate,
      categorySlug,
      user,
    });
    createdArticles.push(created);
  }

  // Atualiza métricas na tabela post_schedules
  await saveScheduleConfig({
    tenantId,
    articles_total: Number(count) || 4,
    frequency_days: Number(frequencyDays) || 3,
    start_date: startDate,
    preferred_time: preferredTime,
    category_slug: categorySlug,
  });

  return {
    success: true,
    total: createdArticles.length,
    articles: createdArticles,
  };
}
