import { query, queryOne } from '@/lib/db.js';
import { writeArticle } from '@/lib/ai.js';
import { httpError, savePost } from '@/lib/posts.js';
import { json, route } from '@/lib/api.js';
import { getDefaultTenant, getTenantById } from '@/lib/tenant.js';
import { generateAutoCoverForPost } from '@/lib/covers.js';

export const maxDuration = 120;

/**
 * Aprova a ideia: a IA escreve o artigo completo (padrões Google + SEO + busca por IA) e ele é salvo
 * como RASCUNHO com capa oficial gerada para o administrador revisar e ajustar tudo no editor antes de publicar.
 */
export const POST = route(async ({ user, params }) => {
  const id = Number(params.id);
  const idea = await queryOne('SELECT * FROM ideas WHERE id = $1', [id]);
  if (!idea) throw httpError(404, 'Ideia não encontrada.');
  if (idea.status === 'written' && idea.post_id) throw httpError(409, 'Esta ideia já virou um artigo.');

  await query("UPDATE ideas SET status = 'writing', error = NULL WHERE id = $1", [id]);
  try {
    const tenantId = user.tenant_id || idea.tenant_id || 1;
    const tenant = (await getTenantById(tenantId)) || (await getDefaultTenant());
    const a = await writeArticle(idea, tenantId);
    const category = a.category_slug || idea.category_slug;
    const finalTitle = a.title || idea.title;

    // Gera automaticamente capa oficial da marca
    let cover = null;
    try {
      cover = await generateAutoCoverForPost({
        title: finalTitle,
        excerpt: a.excerpt || '',
        categorySlug: category,
        focusKeyword: a.focus_keyword || idea.focus_keyword,
        tenant,
      });
    } catch (e) {
      console.warn('[approve-idea] Não foi possível gerar capa automática:', e);
    }

    const post = await savePost({
      title: finalTitle,
      slug: a.slug,
      excerpt: a.excerpt,
      content: a.content_html,
      seo_title: a.seo_title,
      seo_description: a.meta_description,
      focus_keyword: a.focus_keyword || idea.focus_keyword,
      secondary_keywords: a.secondary_keywords,
      tags: a.tags,
      faq: a.faq,
      cover_url: cover?.url || null,
      cover_thumb: cover?.thumb || null,
      cover_alt: cover?.alt || a.cover_alt || finalTitle,
      category_slugs: category ? [category] : [],
      ai_generated: true,
      tenant_id: tenantId,
      action: 'draft',
    }, user);
    await query("UPDATE ideas SET status = 'written', post_id = $2 WHERE id = $1", [id, post.id]);
    return json({
      ok: true,
      post_id: post.id,
      cover_url: cover?.url || null,
      cover_thumb: cover?.thumb || null,
      cover_prompt: a.cover_prompt || '',
    });
  } catch (e) {
    await query("UPDATE ideas SET status = 'failed', error = $2 WHERE id = $1", [id, String(e.message).slice(0, 500)]);
    throw e;
  }
}, { admin: true });
