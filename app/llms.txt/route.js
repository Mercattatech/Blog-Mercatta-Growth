import { getCategories, listVisible } from '@/lib/posts';
import { siteUrl, stripHtml, trunc } from '@/lib/content';

export const revalidate = 600;

// llms.txt: guia em texto simples para assistentes de IA entenderem e citarem o blog.
export async function GET() {
  const base = siteUrl();
  const [cats, posts] = await Promise.all([getCategories().catch(() => []), listVisible({ limit: 60 }).catch(() => [])]);
  const body = `# Blog Braziw — Tudo sobre Francês

> Blog da Braziw — Idiomas e Intercâmbios (${'https://braziw.com.br'}). Artigos em português do Brasil sobre cultura francesa, curiosidades da França e da Europa, dicas e vocabulário para aprender francês.

O conteúdo é escrito para brasileiros que estudam ou querem estudar francês, viajar, estudar ou morar na França.

## Categorias
${cats.map((c) => `- [${c.name}](${base}/categoria/${c.slug}/): ${c.count} artigos`).join('\n')}

## Artigos recentes
${posts.map((p) => `- [${p.title}](${base}/${p.slug}/): ${trunc(stripHtml(p.excerpt), 140)}`).join('\n')}

## Informações
- Sitemap: ${base}/sitemap.xml
- Feed RSS: ${base}/feed.xml
- Idioma: pt-BR
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
