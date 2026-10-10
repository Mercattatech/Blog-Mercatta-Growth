import { query } from './db.js';
import { getTraining } from './settings.js';
import { stripHtml, trunc } from './content.js';
import { VISIBLE } from './posts.js';

const CANDIDATE_MODELS = () => {
  const custom = process.env.GEMINI_MODEL;
  if (custom) return [custom, 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
  return ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
};

export const aiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

async function gemini({ system, prompt, schema, temperature = 0.8, maxOutputTokens = 16384 }) {
  if (!aiConfigured()) {
    const e = new Error('A chave da IA não está configurada. Defina GEMINI_API_KEY nas variáveis de ambiente.');
    e.status = 503; throw e;
  }
  const models = CANDIDATE_MODELS();
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens, responseMimeType: 'application/json', responseSchema: schema },
  };
  let lastErr;
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
          body: JSON.stringify(body),
        });
        // eslint-disable-next-line no-await-in-loop
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
          try {
            return JSON.parse(text);
          } catch {
            lastErr = new Error('A IA devolveu uma resposta em formato inválido. Tentando novamente...');
            continue;
          }
        }
        const errMsg = data?.error?.message || `Falha ao falar com a IA (HTTP ${res.status}).`;
        lastErr = new Error(errMsg);
        lastErr.status = res.status === 429 ? 429 : 502;
        // If high demand (503/429) or model deprecated/not available (404), fall through to next candidate model
        if (
          res.status === 503 ||
          res.status === 429 ||
          res.status === 404 ||
          errMsg.includes('high demand') ||
          errMsg.includes('not available') ||
          errMsg.includes('temporarily')
        ) {
          break; // break attempt loop to try next model in CANDIDATE_MODELS
        }
        if (res.status < 500) break;
      } catch (netErr) {
        lastErr = netErr;
      }
    }
  }
  throw lastErr;
}

const S = (description) => ({ type: 'STRING', description });
const ARR = (items) => ({ type: 'ARRAY', items });

function trainingBlock(t) {
  return `## TREINAMENTO DO BLOG (siga rigorosamente)
- Objetivo do blog: ${t.objective}
- Público-alvo: ${t.audience}
- Tom de voz: ${t.tone}
- Idioma: ${t.language}
- Temas do blog: ${t.themes}
- Temas e práticas PROIBIDOS: ${t.forbidden}
- Palavras-chave prioritárias do negócio: ${t.keywords}
- Regras de estilo: ${t.style_rules}
- Chamada para ação (CTA): ${t.cta}
- Fatos da marca: ${t.brand_facts}
${t.extra ? `- Instruções extras: ${t.extra}` : ''}`;
}

async function existingTitles(limit = 200, tenantId = null) {
  const params = [limit];
  let filter = '';
  if (tenantId) {
    params.push(tenantId);
    filter = `AND (p.tenant_id = $${params.length} OR p.tenant_id IS NULL)`;
  }
  const rows = await query(`SELECT p.title FROM posts p WHERE (${VISIBLE} OR p.status IN ('draft','pending')) ${filter} ORDER BY p.publish_at DESC NULLS LAST LIMIT $1`, params);
  return rows.map((r) => r.title);
}

/* ------------------------------------------------------------ ideias */

export async function generateIdeas({ count, tenantId = null } = {}) {
  const t = await getTraining(tenantId);
  const n = count || t.ideas_count;
  const titles = await existingTitles(200, tenantId);
  const rejParams = [];
  let rejFilter = '';
  if (tenantId) {
    rejParams.push(tenantId);
    rejFilter = `WHERE (tenant_id = $1 OR tenant_id IS NULL)`;
  }
  const rejected = (await query(`SELECT title FROM ideas ${rejFilter} ORDER BY id DESC LIMIT 60`, rejParams)).map((r) => r.title);
  const catParams = [];
  let catFilter = '';
  if (tenantId) {
    catParams.push(tenantId);
    catFilter = `WHERE (tenant_id = $1 OR tenant_id IS NULL)`;
  }
  const cats = (await query(`SELECT slug, name FROM categories ${catFilter} ORDER BY id`, catParams)).map((c) => `${c.slug} (${c.name})`);

  const system = `Você é um estrategista de conteúdo e especialista em SEO (Google Search Central, conteúdo útil e centrado em pessoas, E-E-A-T) e em otimização para buscadores com IA (Google AI Overviews, ChatGPT, Perplexity). Responda sempre em JSON válido.`;
  const prompt = `${trainingBlock(t)}

## TAREFA
Sugira ${n} NOVAS ideias de artigos para o blog, com alto potencial de busca orgânica no Brasil e alinhadas ao objetivo do blog.
Cada ideia deve:
- responder a uma dúvida ou intenção de busca real (informacional, "como", "o que é", "por que", "diferença entre", listas);
- ter uma palavra-chave principal específica (de preferência cauda longa, com 2 a 5 palavras);
- ter um ângulo único e útil, evitando conteúdo genérico;
- NÃO repetir nem se sobrepor aos artigos já publicados nem às ideias rejeitadas;
- variar entre as categorias disponíveis: ${cats.join(', ')}.

Títulos já existentes (não repetir):
${titles.map((x) => `- ${x}`).join('\n') || '(nenhum)'}

Ideias rejeitadas anteriormente (evite temas parecidos):
${rejected.map((x) => `- ${x}`).join('\n') || '(nenhuma)'}

Para "title" use um título claro de até 65 caracteres, sem clickbait enganoso.`;
  const schema = {
    type: 'OBJECT',
    properties: {
      ideas: ARR({
        type: 'OBJECT',
        properties: {
          title: S('Título sugerido do artigo (até 65 caracteres)'),
          focus_keyword: S('Palavra-chave principal'),
          angle: S('Ângulo/abordagem do artigo em 1 ou 2 frases'),
          category_slug: S('Slug de uma das categorias disponíveis'),
          search_intent: S('Intenção de busca: informacional, navegacional, comercial ou transacional, com a dúvida do leitor'),
          reasoning: S('Por que este tema tem potencial de ranquear e ajuda o negócio'),
          outline: ARR(S('Título de um H2 do artigo')),
        },
        required: ['title', 'focus_keyword', 'angle', 'category_slug', 'search_intent', 'reasoning', 'outline'],
      }),
    },
    required: ['ideas'],
  };
  const out = await gemini({ system, prompt, schema, temperature: 0.95, maxOutputTokens: 8192 });
  const valid = new Set((await query(`SELECT slug FROM categories ${catFilter}`, catParams)).map((c) => c.slug));
  return (out.ideas || []).filter((i) => i.title).slice(0, n).map((i) => ({
    ...i, category_slug: valid.has(i.category_slug) ? i.category_slug : null, outline: i.outline || [],
  }));
}

/* ------------------------------------------------------------ artigo */

export async function writeArticle(idea, tenantId = null) {
  const effectiveTenantId = tenantId || idea.tenant_id || null;
  const t = await getTraining(effectiveTenantId);
  const titles = await existingTitles(150, effectiveTenantId);
  const intParams = [];
  let intFilter = '';
  if (effectiveTenantId) {
    intParams.push(effectiveTenantId);
    intFilter = `AND (p.tenant_id = $${intParams.length} OR p.tenant_id IS NULL)`;
  }
  const internal = (await query(
    `SELECT p.slug, p.title FROM posts p WHERE ${VISIBLE} ${intFilter} ORDER BY p.publish_at DESC LIMIT 120`, intParams)).map((r) => `- /${r.slug}/ — ${r.title}`);
  const catParams = [];
  let catFilter = '';
  if (effectiveTenantId) {
    catParams.push(effectiveTenantId);
    catFilter = `WHERE (tenant_id = $1 OR tenant_id IS NULL)`;
  }
  const cats = (await query(`SELECT slug, name FROM categories ${catFilter} ORDER BY id`, catParams)).map((c) => `${c.slug} (${c.name})`);

  let references = '';
  if (t.reference_post_ids?.length) {
    const refs = await query('SELECT title, content FROM posts WHERE id = ANY($1::int[])', [t.reference_post_ids]);
    references = `\n## ARTIGOS DE REFERÊNCIA DE ESTILO (imite voz e estrutura, NÃO copie trechos)\n` +
      refs.map((r) => `### ${r.title}\n${trunc(stripHtml(r.content), 1800)}`).join('\n\n');
  }

  const system = `Você é um redator sênior e especialista em SEO. Escreve artigos 100% originais, precisos e úteis, seguindo as diretrizes do Google Search Central para conteúdo útil, confiável e centrado em pessoas (E-E-A-T), e otimiza o texto para ser encontrado e citado por mecanismos de IA (Google AI Overviews, ChatGPT, Perplexity, Gemini). Responda sempre em JSON válido.`;

  const prompt = `${trainingBlock(t)}
${references}

## PAUTA APROVADA
- Título sugerido: ${idea.title}
- Palavra-chave principal: ${idea.focus_keyword || ''}
- Ângulo: ${idea.angle || ''}
- Intenção de busca: ${idea.search_intent || ''}
- Categoria: ${idea.category_slug || ''}
- Estrutura sugerida (H2): ${(idea.outline || []).join(' | ')}

## REQUISITOS DO ARTIGO (Google + SEO + busca por IA)
1. Tamanho: cerca de ${t.article_length} palavras no conteúdo (pode variar ±15%).
2. NÃO inclua <h1> (o título da página já é o H1). Use <h2> e <h3> com hierarquia correta, e coloque a palavra-chave principal (ou variação natural) em pelo menos um H2.
3. Comece com um bloco de resposta rápida: <div class="quick-answer"><p><strong>Resposta rápida:</strong> …</p></div> com 40 a 60 palavras que respondam diretamente à dúvida principal. Depois, uma introdução curta e envolvente que contenha a palavra-chave nas primeiras 100 palavras.
4. Escreva em parágrafos curtos (até 4 linhas), com listas <ul>/<ol> e, quando útil, uma tabela, para facilitar a leitura e a extração por buscadores e IAs. Use definições claras e entidades específicas (lugares, nomes, termos em francês com tradução).
5. Demonstre experiência e autoridade de forma honesta: conhecimento prático, exemplos, dicas aplicáveis. NUNCA invente fatos, estatísticas, datas, citações, nomes ou URLs. Se não tiver certeza, escreva de forma geral ou omita.
6. Linkagem interna: inclua de 2 a 4 links internos naturais, usando APENAS caminhos desta lista (formato <a href="/slug/">texto âncora descritivo</a>), escolhendo artigos realmente relacionados:
${internal.join('\n') || '(nenhum)'}
7. Não inclua links externos nem imagens no HTML.
8. Termine com uma conclusão útil e a CTA conforme o treinamento (link para https://braziw.com.br pode ser incluído com <a href="https://braziw.com.br">).
9. Inclua um FAQ separado (campo "faq") com 4 a 6 perguntas reais que as pessoas fazem, respostas diretas de 30 a 70 palavras, SEM repetir o conteúdo literalmente. O FAQ NÃO deve estar duplicado dentro de content_html.
10. Metadados: seo_title com até 60 caracteres iniciando (quando natural) pela palavra-chave; meta_description entre 140 e 158 caracteres, com benefício claro e convite à leitura; slug curto em kebab-case sem acentos; excerpt de 150 a 200 caracteres para os cards do blog; 4 a 8 tags; 3 a 6 palavras-chave secundárias.
11. HTML permitido em content_html: h2, h3, h4, p, ul, ol, li, strong, em, blockquote, a, table (thead/tbody/tr/th/td), hr, div.quick-answer. Sem estilos inline, sem scripts, sem classes além de quick-answer.
12. Categoria: escolha UM slug desta lista: ${cats.join(', ')}.
13. Evite repetir o tema destes artigos já existentes (não duplique conteúdo):
${titles.slice(0, 80).map((x) => `- ${x}`).join('\n')}

Escreva o artigo completo agora.`;

  const schema = {
    type: 'OBJECT',
    properties: {
      title: S('Título final do artigo (H1), até 70 caracteres'),
      seo_title: S('Title tag, até 60 caracteres'),
      meta_description: S('Meta description, 140 a 158 caracteres'),
      slug: S('Slug em kebab-case sem acentos'),
      focus_keyword: S('Palavra-chave principal'),
      secondary_keywords: ARR(S('Palavra-chave secundária')),
      excerpt: S('Resumo de 150 a 200 caracteres'),
      category_slug: S('Slug da categoria'),
      tags: ARR(S('Tag')),
      content_html: S('Corpo do artigo em HTML limpo, sem H1'),
      faq: ARR({ type: 'OBJECT', properties: { q: S('Pergunta'), a: S('Resposta direta') }, required: ['q', 'a'] }),
      cover_alt: S('Texto alternativo sugerido para a imagem de capa'),
      cover_prompt: S('Descrição curta de uma boa imagem de capa para este artigo'),
    },
    required: ['title', 'seo_title', 'meta_description', 'slug', 'focus_keyword', 'excerpt', 'category_slug', 'tags', 'content_html', 'faq'],
  };
  return gemini({ system, prompt, schema, temperature: 0.7, maxOutputTokens: 24000 });
}

/* ------------------------------------------------------------ sugestão de capa */

export async function suggestCoverWithAI({ title, excerpt, category_name, tenant = {}, customCoverPrompt = '' }) {
  const brandName = tenant?.name || 'Mercatta Growth';
  const brandTagline = tenant?.site_tagline || tenant?.site_title || 'Blog Corporativo de Alta Autoridade';

  const userDirective = customCoverPrompt?.trim()
    ? `\n\nDIRETRIZES VISUAIS PERSONALIZADAS DEFINIDAS PELO USUÁRIO PARA AS CAPAS:
"""
${customCoverPrompt.trim()}
"""
Você DEVE respeitar rigorosamente essas preferências visuais (estilo, ambiente, iluminação, nicho, estética e atmosfera) ao formular o image_prompt e escolher o preset_id.`
    : '';

  const system = `Você é um diretor de arte e designer gráfico especializado em capas de alta conversão para blogs corporativos e portais de conteúdo da marca "${brandName}" (${brandTagline}).
As capas do blog seguem um padrão visual premium de alto impacto:
1. Linha 1 (highlight_text): 2 a 4 palavras de forte impacto em MAIÚSCULAS (termo-chave, gatilho ou foco principal). Exemplos reais: "INTELIGÊNCIA ARTIFICIAL", "CRESCIMENTO ACELERADO", "ESTRATÉGIA B2B", "LIDERANÇA MODERNA".
2. Linha 2 (main_text): O complemento do título em MAIÚSCULAS, direto, comercial e sofisticado, com até 48 caracteres.
3. preset_id: Escolha o tema de imagem de fundo mais adequado ao nicho do artigo entre: "tech_innovation", "modern_workspace", "corporate_leadership", "urban_growth", "ai_network", "abstract_luxury", "finance_analytics", "minimalist_studio", "nature_sustainability", "retail_commerce", "lifestyle_culture", "bistro_coffee".
4. image_prompt: Crie um prompt descritivo em INGLÊS otimizado para gerar uma fotografia de fundo impecável por IA (8k resolution, editorial photography, no text, no watermark, professional studio lighting) alinhado ao tema do artigo e às diretrizes visuais do usuário.
5. cover_alt: Texto alternativo em português para acessibilidade e SEO do Google, mencionando a marca "${brandName}".${userDirective}
Responda em JSON válido.`;

  const prompt = `Artigo da empresa "${brandName}":
- Título: ${title || ''}
- Resumo: ${excerpt || ''}
- Categoria: ${category_name || ''}
${customCoverPrompt ? `Prompt visual do usuário: ${customCoverPrompt}` : ''}

Gere os textos ideais, selecione o preset de fundo e gere o prompt descritivo em inglês para a imagem de capa.`;

  const schema = {
    type: 'OBJECT',
    properties: {
      highlight_text: S('2 a 4 palavras impactantes em MAIÚSCULAS para a linha de destaque'),
      main_text: S('Complemento do título em MAIÚSCULAS para as linhas principais'),
      preset_id: S('ID do preset: tech_innovation, modern_workspace, corporate_leadership, urban_growth, ai_network, abstract_luxury, finance_analytics, minimalist_studio, nature_sustainability, retail_commerce, lifestyle_culture ou bistro_coffee'),
      image_prompt: S('Prompt detalhado em inglês para imagem fotográfica de fundo por IA, sem texto, sem logos, hiper-realista, 8k'),
      cover_alt: S('Texto alternativo SEO em português'),
    },
    required: ['highlight_text', 'main_text', 'preset_id', 'cover_alt'],
  };

  return gemini({ system, prompt, schema, temperature: 0.6, maxOutputTokens: 1024 });
}

/* ------------------------------------------------------------ varinha mágica / aprimorar campo */

export async function refineTrainingField({ fieldKey, fieldLabel, currentValue, brandName = '', currentTraining = {} }) {
  const system = `Você é um diretor sênior de Marketing de Conteúdo, SEO e IA da plataforma Mercatta Growth.
Sua missão é pegar o texto inicial, anotações ou rascunho do usuário para o campo de treinamento "${fieldLabel}" (${fieldKey}) e REFORMULÁ-LO para ficar impecável, altamente estratégico e otimizado para guiar inteligências artificiais a gerarem os melhores artigos corporativos.

Contexto da Empresa: ${brandName || 'Empresa parceira'}
Objetivo geral: ${currentTraining.objective || 'Atrair clientes e gerar autoridade'}
Público-alvo: ${currentTraining.audience || 'Clientes em potencial'}

Regras:
1. Mantenha os desejos reais do usuário, elevando a qualidade técnica, profundidade e clareza.
2. Seja prático, direto e assertivo (sem enrolação ou placeholders como "[preencha aqui]").
3. Entregue um texto fluido pronto para colar diretamente no campo de treinamento.
4. Escreva em Português do Brasil com excelente redação.`;

  const prompt = `Texto atual fornecido pelo usuário:
"""
${currentValue || 'Sugira as melhores diretrizes estratégicas para este campo.'}
"""

Reformule este campo com maestria. Responda em JSON válido com a propriedade "refined".`;

  const schema = {
    type: 'OBJECT',
    properties: {
      refined: S('O texto aprimorado e reformulado profissionalmente para este campo.'),
    },
    required: ['refined'],
  };

  const out = await gemini({ system, prompt, schema, temperature: 0.7, maxOutputTokens: 2048 });
  return out?.refined || currentValue;
}

/* ------------------------------------------------------------ gerador instantâneo direto */

export async function generateDirectArticle({ topic = '', categorySlug = null, tenantId = null }) {
  const t = await getTraining(tenantId);
  let effectiveIdea;

  if (topic && topic.trim()) {
    const system = `Você é um estrategista sênior de conteúdo e SEO. Responda em JSON.`;
    const prompt = `${trainingBlock(t)}
O usuário solicitou um artigo com o tema/palavra-chave: "${topic.trim()}".
Estruture a pauta deste artigo definindo palavra-chave principal, ângulo único, intenção de busca do leitor e estrutura de tópicos H2.`;
    const schema = {
      type: 'OBJECT',
      properties: {
        title: S('Título atrativo e otimizado para SEO (até 65 caracteres)'),
        focus_keyword: S('Palavra-chave principal'),
        angle: S('Ângulo único de abordagem do artigo'),
        search_intent: S('Intenção de busca do leitor'),
        outline: ARR(S('Subtítulo H2')),
      },
      required: ['title', 'focus_keyword', 'angle', 'search_intent', 'outline'],
    };
    const structured = await gemini({ system, prompt, schema, temperature: 0.7, maxOutputTokens: 2048 });
    effectiveIdea = {
      title: structured.title || topic.trim(),
      focus_keyword: structured.focus_keyword || topic.trim(),
      angle: structured.angle || `Artigo completo sobre ${topic}`,
      category_slug: categorySlug || null,
      search_intent: structured.search_intent || 'informacional',
      outline: structured.outline || [],
      tenant_id: tenantId,
    };
  } else {
    const ideas = await generateIdeas({ count: 1, tenantId });
    if (!ideas.length) throw new Error('Não foi possível gerar pautas para esta empresa no momento.');
    effectiveIdea = ideas[0];
    if (categorySlug) effectiveIdea.category_slug = categorySlug;
  }

  const article = await writeArticle(effectiveIdea, tenantId);
  return { article, idea: effectiveIdea };
}


