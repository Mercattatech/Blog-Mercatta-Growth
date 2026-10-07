// Verificador de SEO (puro, roda no navegador e no servidor).
// Baseado nas boas práticas do Google Search Central (conteúdo útil, títulos e meta descriptions claros,
// estrutura semântica, links internos) + otimização para buscadores com IA (resposta direta, FAQ, entidades).

const strip = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function analyzeSeo(p) {
  const checks = [];
  const add = (id, label, ok, weight, tip, level) => checks.push({ id, label, ok, weight, tip, level: ok ? 'good' : (level || 'bad') });

  const html = p.content || '';
  const text = strip(html);
  const words = text ? text.split(' ').length : 0;
  const kw = norm(p.focus_keyword).trim();
  const title = p.seo_title || p.title || '';
  const desc = p.seo_description || '';
  const slug = norm(p.slug || '');
  const firstWords = norm(text.split(' ').slice(0, 100).join(' '));
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => norm(strip(m[1])));
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const internal = links.filter((h) => h.startsWith('/') || h.includes('braziw.com.br'));
  const external = links.filter((h) => /^https?:\/\//.test(h) && !h.includes('braziw.com.br'));
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1]).split(' ').length);
  const longP = paragraphs.filter((n) => n > 110).length;

  add('kw', 'Palavra-chave principal definida', !!kw, 10, 'Defina a palavra-chave foco do artigo.');
  add('title-len', `Título SEO entre 30 e 60 caracteres (${title.length})`, title.length >= 30 && title.length <= 60, 10, 'Títulos entre 30 e 60 caracteres evitam corte nos resultados do Google.');
  add('title-kw', 'Palavra-chave no título SEO', !!kw && norm(title).includes(kw), 10, 'Inclua a palavra-chave no título, de preferência no início.');
  add('desc-len', `Meta description entre 120 e 160 caracteres (${desc.length})`, desc.length >= 120 && desc.length <= 160, 10, 'Escreva um resumo atrativo de 120–160 caracteres.');
  add('desc-kw', 'Palavra-chave na meta description', !!kw && norm(desc).includes(kw), 5, 'Use a palavra-chave naturalmente na descrição.');
  add('slug', 'URL (slug) curta e com a palavra-chave', !!slug && slug.length <= 75 && (!kw || slug.includes(kw.replace(/\s+/g, '-'))), 5, 'Use uma URL curta contendo a palavra-chave.', 'warn');
  add('intro-kw', 'Palavra-chave nas primeiras 100 palavras', !!kw && firstWords.includes(kw), 8, 'Mencione a palavra-chave logo na introdução.');
  add('h2-kw', 'Palavra-chave em algum subtítulo (H2)', !!kw && h2s.some((h) => h.includes(kw)), 5, 'Use a palavra-chave ou variação em um H2.', 'warn');
  add('len', `Conteúdo com profundidade (${words} palavras)`, words >= 800, 10, 'Artigos completos (800+ palavras) tendem a ranquear melhor, desde que úteis.', words >= 500 ? 'warn' : 'bad');
  add('h2-count', 'Pelo menos 3 subtítulos (H2) bem distribuídos', h2s.length >= 3, 6, 'Divida o texto em seções com H2 para facilitar a leitura e a indexação.');
  add('density', 'Densidade da palavra-chave natural (0,3% a 2,5%)', (() => {
    if (!kw || !words) return false;
    const n = norm(text).split(kw).length - 1;
    const d = (n * kw.split(' ').length) / words * 100;
    return d >= 0.3 && d <= 2.5;
  })(), 4, 'Evite repetir a palavra-chave em excesso (keyword stuffing).', 'warn');
  add('internal', 'Pelo menos 2 links internos', internal.length >= 2, 5, 'Linke outros artigos do blog e a Braziw.', 'warn');
  add('external', 'Link para fonte externa confiável', external.length >= 1, 3, 'Links para fontes de autoridade reforçam a credibilidade.', 'warn');
  add('img-alt', 'Imagens com texto alternativo', imgs.every((i) => /alt="[^"]+"/.test(i)), 3, 'Todas as imagens precisam de alt descritivo.', 'warn');
  add('cover', 'Imagem de capa definida', !!p.cover_url, 4, 'Adicione uma capa; ela aparece no Google Discover e nas redes sociais.');
  add('cover-alt', 'Texto alternativo da capa', !!(p.cover_alt || '').trim(), 2, 'Descreva a capa para acessibilidade e SEO de imagens.', 'warn');
  add('paras', 'Parágrafos curtos e escaneáveis', longP === 0, 3, `${longP} parágrafo(s) muito longo(s). Prefira blocos de até 4 linhas.`, 'warn');
  add('quick', 'Resposta rápida logo no início (boa para IA e snippet)', /quick-answer|resposta r[aá]pida/i.test(html), 3, 'Abra com um resumo direto de 40–60 palavras respondendo à dúvida principal.', 'warn');
  add('faq', 'Perguntas frequentes (FAQ) com 3+ itens', (p.faq || []).filter((f) => f.q && f.a).length >= 3, 4, 'FAQ ajuda a aparecer em respostas de IA e pode gerar rich results.', 'warn');
  add('excerpt', 'Resumo (excerpt) preenchido', (p.excerpt || '').trim().length >= 50, 2, 'O resumo aparece nos cards do blog.', 'warn');

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  return { score: Math.round((got / total) * 100), checks, words };
}
