import { json, route } from '@/lib/api.js';
import { generateDirectArticle, aiConfigured } from '@/lib/ai.js';
import { savePost } from '@/lib/posts.js';
import { getDefaultTenant, getTenantById } from '@/lib/tenant.js';
import { generateAutoCoverForPost } from '@/lib/covers.js';

export const maxDuration = 120;

export const POST = route(async ({ req, user }) => {
  if (!aiConfigured()) {
    return json({ error: 'A chave da IA (GEMINI_API_KEY) não está configurada.' }, 400);
  }

  const body = await req.json().catch(() => ({}));
  const { topic, category_slug, publishImmediate, cover_prompt } = body;

  const isSuper = user.role === 'superadmin';
  let targetTenantId = (isSuper && body.tenantId) ? Number(body.tenantId) : user.tenant_id;
  if (!targetTenantId) {
    const def = await getDefaultTenant();
    targetTenantId = def?.id || 1;
  }

  try {
    const tenant = (await getTenantById(targetTenantId)) || (await getDefaultTenant());

    const { article, idea } = await generateDirectArticle({
      topic: topic || '',
      categorySlug: category_slug || null,
      tenantId: targetTenantId,
    });

    const category = article.category_slug || idea.category_slug;
    const finalTitle = article.title || idea.title;

    // Gera automaticamente capa oficial da marca
    let cover = null;
    try {
      cover = await generateAutoCoverForPost({
        title: finalTitle,
        excerpt: article.excerpt || '',
        categorySlug: category,
        focusKeyword: article.focus_keyword || idea.focus_keyword,
        tenant,
        customCoverPrompt: cover_prompt || undefined,
      });
    } catch (e) {
      console.warn('[instant-article] Não foi possível gerar capa automática:', e);
    }

    const post = await savePost({
      title: finalTitle,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content_html,
      seo_title: article.seo_title,
      seo_description: article.meta_description,
      focus_keyword: article.focus_keyword || idea.focus_keyword,
      secondary_keywords: article.secondary_keywords || [],
      tags: article.tags || [],
      faq: article.faq || [],
      cover_url: cover?.url || null,
      cover_thumb: cover?.thumb || null,
      cover_alt: cover?.alt || article.cover_alt || finalTitle,
      category_slugs: category ? [category] : [],
      ai_generated: true,
      tenant_id: targetTenantId,
      action: publishImmediate ? 'publish' : 'draft',
    }, user);

    return json({
      ok: true,
      post_id: post.id,
      post,
      cover_url: cover?.url || null,
      cover_thumb: cover?.thumb || null,
      cover_prompt: article.cover_prompt || '',
      title: post.title,
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}, { admin: true });
