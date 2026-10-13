import { query, queryOne } from './db.js';
import { getTenantById, getTenantBySlug } from './tenant.js';
import { savePost, adminGetPost, adminListPosts, deletePost, restorePost, permanentDeletePost } from './posts.js';
import { generateIdeas, writeArticle, suggestCoverWithAI } from './ai.js';
import { renderPostCover } from './covers.js';
import { COVER_PRESETS } from './coverPresets.js';
import { getTraining } from './settings.js';
import { generateScheduledBatch } from './scheduler.js';

/**
 * Autentica uma requisição MCP usando a mcp_api_key do tenant
 */
export async function authenticateMcpRequest(authHeaderOrKey) {
  if (!authHeaderOrKey) return null;
  const token = authHeaderOrKey.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const tenant = await queryOne('SELECT * FROM tenants WHERE mcp_api_key = $1', [token]);
  return tenant || null;
}

/**
 * Lista de ferramentas expostas pelo protocolo MCP
 */
export const MCP_TOOLS = [
  {
    name: 'list_articles',
    description: 'Lista artigos do blog com filtros por status, categoria, busca e paginação.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Status: "all", "published", "scheduled", "draft", "trash"' },
        category_slug: { type: 'string', description: 'Filtrar por categoria específica' },
        q: { type: 'string', description: 'Termo de busca no título ou conteúdo' },
        limit: { type: 'number', description: 'Limite de itens (padrão 20)' },
        offset: { type: 'number', description: 'Offset para paginação' },
      },
    },
  },
  {
    name: 'get_article',
    description: 'Obtém todos os detalhes de um artigo específico pelo ID ou Slug.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID do artigo' },
        slug: { type: 'string', description: 'Slug do artigo' },
      },
      required: [],
    },
  },
  {
    name: 'create_article',
    description: 'Cria um novo artigo no blog com opção de redação por IA, geração automática de capa com logo e agendamento.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título do artigo (obrigatório se não usar IA)' },
        content: { type: 'string', description: 'Conteúdo em HTML limpo' },
        excerpt: { type: 'string', description: 'Resumo do artigo' },
        category_slug: { type: 'string', description: 'Slug da categoria (destaques, noticias, novidades, lancamentos)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags do artigo' },
        focus_keyword: { type: 'string', description: 'Palavra-chave principal de SEO' },
        generate_with_ai: { type: 'boolean', description: 'Se true, a IA escreve o artigo completo baseado no treinamento do cliente' },
        angle: { type: 'string', description: 'Ângulo/briefing com fatos reais para orientar a IA' },
        search_intent: { type: 'string', description: 'Intenção de busca do leitor' },
        outline: { type: 'array', items: { type: 'string' }, description: 'Estrutura sugerida de H2' },
        with_auto_cover: { type: 'boolean', description: 'Se true, cria automaticamente uma capa personalizada com o logo do cliente' },
        publish_at: { type: 'string', description: 'Data/hora de publicação ISO-8601 (permite agendamento futuro)' },
        status: { type: 'string', description: '"published" ou "draft" (padrão "published")' },
      },
    },
  },
  {
    name: 'edit_article',
    description: 'Edita um artigo existente (título, conteúdo, capa, tags, status, datas).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID do artigo a ser editado' },
        title: { type: 'string' },
        content: { type: 'string' },
        excerpt: { type: 'string' },
        status: { type: 'string' },
        publish_at: { type: 'string' },
        category_slug: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_article',
    description: 'Exclui um artigo (envia para lixeira ou exclusão permanente).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID do artigo' },
        permanent: { type: 'boolean', description: 'Se true, apaga definitivamente do banco. Se false, move para lixeira.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_most_read',
    description: 'Retorna o ranking dos artigos mais lidos e com maior engajamento no blog.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Quantidade de artigos no ranking (padrão 10)' },
      },
    },
  },
  {
    name: 'get_analytics',
    description: 'Painel analítico do gestor: métricas de leitura, curva de visualizações dos últimos 30 dias e performance por categoria.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Período em dias para a curva (padrão 30)' },
      },
    },
  },
  {
    name: 'suggest_strategic_topics',
    description: 'Como gestor de conteúdo, analisa o blog e propõe temas estratégicos de alta conversão para preencher gaps de conteúdo.',
    inputSchema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Quantidade de sugestões (padrão 5)' },
      },
    },
  },
  {
    name: 'audit_seo_health',
    description: 'Audita a saúde do blog: identifica artigos sem meta description, títulos fracos, falta de capa ou problemas de SEO.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'trigger_schedule_batch',
    description: 'Dispara a geração de um lote de artigos agendados automaticamente com IA e capas personalizadas.',
    inputSchema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Quantidade de artigos (ex: 4, 8, 12)' },
        frequency_days: { type: 'number', description: 'Frequência de postagem a cada X dias' },
        start_date: { type: 'string', description: 'Data do primeiro post (YYYY-MM-DD)' },
        category_slug: { type: 'string', description: 'Categoria opcional' },
      },
    },
  },
];

/**
 * Executa uma ferramenta do MCP em nome do Tenant autenticado
 */
export async function handleMcpToolCall(toolName, args = {}, tenant) {
  // Autor real da empresa (author_id possui FK para users; id 0 viola a constraint)
  const authorRow = await queryOne(
    "SELECT id FROM users WHERE tenant_id = $1 AND active = true ORDER BY (role = 'admin') DESC, id ASC LIMIT 1",
    [tenant.id],
  ).catch(() => null);
  const dummyUser = { id: authorRow?.id ?? null, role: 'admin', tenant_id: tenant.id, tenant };

  switch (toolName) {
    case 'list_articles': {
      const status = args.status === 'all' ? '' : (args.status || '');
      const limit = Math.min(100, Number(args.limit) || 20);
      const offset = Math.max(0, Number(args.offset) || 0);
      const result = await adminListPosts({
        user: dummyUser,
        status,
        q: args.q || '',
        limit,
        offset,
        tenantId: tenant.id,
      });
      return {
        total: result.total,
        count: result.rows.length,
        articles: result.rows.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p.display_status || p.status,
          publish_at: p.publish_at,
          category: p.cat?.name || 'Geral',
          views_count: p.views_count || 0,
          url: `/${p.slug}/`,
        })),
      };
    }

    case 'get_article': {
      let post;
      if (args.id) {
        post = await adminGetPost(Number(args.id), dummyUser);
      } else if (args.slug) {
        post = await queryOne('SELECT * FROM posts WHERE slug = $1 AND (tenant_id = $2 OR tenant_id IS NULL)', [args.slug, tenant.id]);
      }
      if (!post) throw new Error('Artigo não encontrado.');
      return { article: post };
    }

    case 'create_article': {
      let finalTitle = args.title;
      let finalContent = args.content || '';
      let finalExcerpt = args.excerpt || '';
      let finalSlug = args.slug || '';
      let finalTags = args.tags || [];
      let finalFaq = [];
      let finalSeoTitle = args.title;
      let finalSeoDesc = args.excerpt;
      let finalKeyword = args.focus_keyword || '';

      // Redação com IA se solicitado ou se o conteúdo estiver vazio
      if (args.generate_with_ai || !finalContent) {
        const idea = {
          title: args.title || 'Inovação e Crescimento Estratégico',
          focus_keyword: args.focus_keyword || tenant.name,
          category_slug: args.category_slug || 'noticias',
          angle: args.angle || '',
          search_intent: args.search_intent || '',
          outline: Array.isArray(args.outline) ? args.outline : [],
        };
        const written = await writeArticle(idea, tenant.id);
        finalTitle = written.title;
        finalContent = written.content_html;
        finalExcerpt = written.excerpt;
        finalSlug = written.slug;
        finalTags = written.tags || [];
        finalFaq = written.faq || [];
        finalSeoTitle = written.seo_title;
        finalSeoDesc = written.meta_description;
        finalKeyword = written.focus_keyword;
      }

      // Capa automática
      let coverUrl = null;
      let coverThumb = null;
      if (args.with_auto_cover !== false) {
        try {
          const coverPrompt = await suggestCoverWithAI({
            title: finalTitle,
            excerpt: finalExcerpt,
            category_name: args.category_slug,
            tenant,
          });
          const matchedPreset = COVER_PRESETS.find((p) => p.id === coverPrompt.preset_id) || COVER_PRESETS[0];
          const coverRes = await renderPostCover({
            bgSource: matchedPreset.id,
            highlightText: coverPrompt.highlight_text || tenant.name,
            mainText: coverPrompt.main_text || finalTitle,
            tenant,
          });
          coverUrl = coverRes.url;
          coverThumb = coverRes.thumb;
        } catch (e) {
          coverUrl = COVER_PRESETS[0].url;
        }
      }

      const postInput = {
        tenant_id: tenant.id,
        title: finalTitle,
        content: finalContent,
        excerpt: finalExcerpt,
        slug: finalSlug,
        tags: finalTags,
        faq: finalFaq,
        seo_title: finalSeoTitle,
        seo_description: finalSeoDesc,
        focus_keyword: finalKeyword,
        cover_url: coverUrl,
        cover_thumb: coverThumb,
        category_slug: args.category_slug || 'noticias',
        publish_at: args.publish_at || new Date().toISOString(),
        action: args.status === 'draft' ? 'draft' : 'publish',
      };

      const saved = await savePost(postInput, dummyUser);
      return {
        success: true,
        message: 'Artigo criado com sucesso!',
        article: {
          id: saved.id,
          title: saved.title,
          slug: saved.slug,
          status: saved.status,
          publish_at: saved.publish_at,
          url: `/${saved.slug}/`,
        },
      };
    }

    case 'edit_article': {
      const existing = await adminGetPost(Number(args.id), dummyUser);
      if (!existing) throw new Error('Artigo não encontrado para edição.');
      const updateData = {
        ...existing,
        title: args.title !== undefined ? args.title : existing.title,
        content: args.content !== undefined ? args.content : existing.content,
        excerpt: args.excerpt !== undefined ? args.excerpt : existing.excerpt,
        category_slug: args.category_slug !== undefined ? args.category_slug : existing.cat?.slug,
        tags: args.tags !== undefined ? args.tags : existing.tags,
        publish_at: args.publish_at !== undefined ? args.publish_at : existing.publish_at,
        action: args.status === 'draft' ? 'draft' : 'publish',
      };
      const updated = await savePost(updateData, dummyUser, existing.id);
      return { success: true, message: 'Artigo atualizado com sucesso.', article: updated };
    }

    case 'delete_article': {
      if (args.permanent) {
        await permanentDeletePost(Number(args.id), dummyUser);
        return { success: true, message: 'Artigo excluído permanentemente.' };
      }
      await deletePost(Number(args.id), dummyUser);
      return { success: true, message: 'Artigo movido para a lixeira.' };
    }

    case 'get_most_read': {
      const limit = Math.min(50, Number(args.limit) || 10);
      const rows = await query(`
        SELECT p.id, p.title, p.slug, p.views_count, p.publish_at, p.word_count,
               coalesce(min(c.name), 'Geral') AS category_name
        FROM posts p
        LEFT JOIN post_categories pc ON pc.post_id = p.id
        LEFT JOIN categories c ON c.id = pc.category_id
        WHERE (p.tenant_id = $1 OR p.tenant_id IS NULL)
          AND p.deleted_at IS NULL
          AND p.status = 'published'
        GROUP BY p.id
        ORDER BY p.views_count DESC, p.publish_at DESC
        LIMIT $2
      `, [tenant.id, limit]);

      return {
        ranking: rows.map((r, i) => ({
          rank: i + 1,
          id: r.id,
          title: r.title,
          slug: r.slug,
          views: r.views_count || 0,
          category: r.category_name || 'Geral',
          published_at: r.publish_at,
          estimated_reading_minutes: Math.ceil((r.word_count || 500) / 180),
          url: `/${r.slug}/`,
        })),
      };
    }

    case 'get_analytics': {
      const days = Math.min(90, Math.max(7, Number(args.days) || 30));
      
      // Curva de visualizações diárias
      const dailyCurve = await query(`
        SELECT view_date::text AS date, sum(views_count)::int AS views
        FROM post_views_daily
        WHERE (tenant_id = $1 OR tenant_id IS NULL)
          AND view_date >= CURRENT_DATE - ($2 || ' days')::interval
        GROUP BY view_date
        ORDER BY view_date ASC
      `, [tenant.id, days]);

      // Totais gerais
      const totals = await queryOne(`
        SELECT 
          coalesce(sum(views_count), 0)::int AS total_views,
          count(*)::int AS total_articles,
          count(*) FILTER (WHERE status = 'published' AND publish_at <= now())::int AS published_articles,
          count(*) FILTER (WHERE status = 'published' AND publish_at > now())::int AS scheduled_articles
        FROM posts
        WHERE (tenant_id = $1 OR tenant_id IS NULL) AND deleted_at IS NULL
      `, [tenant.id]);

      // Performance por categoria
      const catStats = await query(`
        SELECT c.name, count(p.id)::int AS count, coalesce(sum(p.views_count), 0)::int AS views
        FROM categories c
        LEFT JOIN post_categories pc ON pc.category_id = c.id
        LEFT JOIN posts p ON p.id = pc.post_id AND (p.tenant_id = $1 OR p.tenant_id IS NULL) AND p.deleted_at IS NULL
        WHERE (c.tenant_id = $1 OR c.tenant_id IS NULL)
        GROUP BY c.id, c.name
        ORDER BY views DESC
      `, [tenant.id]);

      return {
        period_days: days,
        summary: totals,
        daily_curve: dailyCurve,
        categories_breakdown: catStats,
      };
    }

    case 'suggest_strategic_topics': {
      const count = Math.min(10, Number(args.count) || 5);
      const ideas = await generateIdeas({ count, tenantId: tenant.id });
      return {
        strategic_suggestions: ideas.map((i) => ({
          title: i.title,
          focus_keyword: i.focus_keyword,
          category: i.category_slug,
          angle: i.angle,
          reasoning: i.reasoning,
          search_intent: i.search_intent,
        })),
      };
    }

    case 'audit_seo_health': {
      const posts = await query(`
        SELECT p.id, p.title, p.slug, p.seo_description, p.cover_url, p.focus_keyword,
               p.tags, p.word_count, p.status, p.publish_at
        FROM posts p
        WHERE (p.tenant_id = $1 OR p.tenant_id IS NULL) AND p.deleted_at IS NULL
        ORDER BY p.publish_at DESC
        LIMIT 100
      `, [tenant.id]);

      const issues = [];
      for (const p of posts) {
        if (!p.seo_description || p.seo_description.length < 80) {
          issues.push({ id: p.id, title: p.title, issue: 'Meta description ausente ou curta demais (< 80 caracteres)' });
        }
        if (!p.cover_url) {
          issues.push({ id: p.id, title: p.title, issue: 'Artigo sem imagem de capa oficial' });
        }
        if (!p.focus_keyword) {
          issues.push({ id: p.id, title: p.title, issue: 'Artigo sem palavra-chave de foco definida' });
        }
        if (p.word_count < 600) {
          issues.push({ id: p.id, title: p.title, issue: 'Conteúdo fino (< 600 palavras), risco de baixo ranqueamento' });
        }
      }

      const score = Math.max(20, Math.round(100 - (issues.length * 3)));
      return {
        health_score: `${score}/100`,
        status: score > 80 ? 'Excelente' : score > 60 ? 'Bom com melhorias' : 'Atenção requerida',
        total_analyzed: posts.length,
        issues_found: issues.length,
        detailed_issues: issues.slice(0, 20),
        recommendations: [
          'Garanta que todo artigo tenha entre 140 e 158 caracteres de meta description para maximizar o CTR no Google.',
          'Utilize a automação de capas com IA para manter uma identidade visual corporativa homogênea.',
          'Mantenha uma frequência constante através da rotina de agendamento automático.',
        ],
      };
    }

    case 'trigger_schedule_batch': {
      const count = Math.min(20, Math.max(1, Number(args.count) || 4));
      const freq = Math.max(1, Number(args.frequency_days) || 3);
      const res = await generateScheduledBatch({
        tenantId: tenant.id,
        count,
        frequencyDays: freq,
        startDate: args.start_date ? new Date(args.start_date) : new Date(),
        categorySlug: args.category_slug || null,
        user: dummyUser,
      });
      return res;
    }

    default:
      throw new Error(`Ferramenta desconhecida: "${toolName}".`);
  }
}
