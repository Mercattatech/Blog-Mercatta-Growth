import { query, queryOne } from '@/lib/db.js';
import { writeArticle } from '@/lib/ai.js';
import { httpError, savePost } from '@/lib/posts.js';
import { json, route } from '@/lib/api.js';

export const maxDuration = 120;

/**
 * Aprova a ideia: a IA escreve o artigo completo (padrões Google + SEO + busca por IA) e ele é salvo
 * como RASCUNHO para o administrador revisar e ajustar tudo no editor antes de publicar.
 */
export const POST = route(async ({ user, params }) => {
  const id = Number(params.id);
  const idea = await queryOne('SELECT * FROM ideas WHERE id = $1', [id]);
  if (!idea) throw httpError(404, 'Ideia não encontrada.');
  if (idea.status === 'written' && idea.post_id) throw httpError(409, 'Esta ideia já virou um artigo.');

  await query("UPDATE ideas SET status = 'writing', error = NULL WHERE id = $1", [id]);
  try {
    const a = await writeArticle(idea);
    const category = a.category_slug || idea.category_slug;
    const post = await savePost({
      title: a.title || idea.title,
      slug: a.slug,
      excerpt: a.excerpt,
      content: a.content_html,
      seo_title: a.seo_title,
      seo_description: a.meta_description,
      focus_keyword: a.focus_keyword || idea.focus_keyword,
      secondary_keywords: a.secondary_keywords,
      tags: a.tags,
      faq: a.faq,
      cover_alt: a.cover_alt,
      category_slugs: category ? [category] : [],
      ai_generated: true,
      action: 'draft',
    }, user);
    await query("UPDATE ideas SET status = 'written', post_id = $2 WHERE id = $1", [id, post.id]);
    return json({ ok: true, post_id: post.id, cover_prompt: a.cover_prompt || '' });
  } catch (e) {
    await query("UPDATE ideas SET status = 'failed', error = $2 WHERE id = $1", [id, String(e.message).slice(0, 500)]);
    throw e;
  }
}, { admin: true });
