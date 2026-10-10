import dns from 'node:dns/promises';
import { query, queryOne } from './db.js';
import { setSetting } from './settings.js';

export const MERCATTA_DOMAIN = process.env.MERCATTA_DOMAIN || 'grupomercatta.com.br';
export const DEFAULT_CNAME_TARGET = process.env.CNAME_TARGET || 'cname.grupomercatta.com.br';

export async function listTenants() {
  const rows = await query(`
    SELECT 
      t.*,
      (SELECT count(*)::int FROM posts p WHERE p.tenant_id = t.id) AS posts_count,
      (SELECT count(*)::int FROM posts p WHERE p.tenant_id = t.id AND p.status = 'published' AND p.publish_at <= now()) AS published_count,
      (SELECT count(*)::int FROM posts p WHERE p.tenant_id = t.id AND p.ai_generated = true) AS ai_posts_count,
      (SELECT count(*)::int FROM users u WHERE u.tenant_id = t.id) AS users_count
    FROM tenants t
    ORDER BY t.created_at DESC
  `);
  return rows;
}

export async function getTenantById(id) {
  if (!id) return null;
  return queryOne('SELECT * FROM tenants WHERE id = $1', [Number(id)]);
}

export async function getTenantBySlug(slug) {
  if (!slug) return null;
  return queryOne('SELECT * FROM tenants WHERE lower(slug) = lower($1)', [slug.trim()]);
}

export async function getTenantByDomain(domain) {
  if (!domain) return null;
  const clean = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '').split(':')[0];
  return queryOne('SELECT * FROM tenants WHERE lower(custom_domain) = $1 OR lower(subdomain) = $2', [clean, clean.split('.')[0]]);
}

export async function getDefaultTenant() {
  const braziw = await getTenantBySlug('braziw');
  if (braziw) return braziw;
  const first = await queryOne("SELECT * FROM tenants WHERE slug <> 'mercatta' ORDER BY id ASC LIMIT 1");
  return first;
}

export async function getMercattaHubTenant() {
  const mercatta = await getTenantBySlug('mercatta');
  if (mercatta) return mercatta;
  return {
    id: 0,
    slug: 'mercatta',
    name: 'Grupo Mercatta',
    site_title: 'Mercatta Growth — Blogs Corporativos Inteligentes',
    site_tagline: 'SaaS Multi-Tenant de Blogs com IA',
    primary_color: '#0f172a',
    accent_color: '#3b82f6',
  };
}

/**
 * Resolve o Tenant a partir do Host da requisição
 * Suporta:
 * 1. Domínio customizado: blog.braziw.com.br
 * 2. Subdomínio: cliente.grupomercatta.com.br
 * 3. Domínio Central Mercatta: grupomercatta.com.br ou www.grupomercatta.com.br
 * 4. Localhost: suporta subdomínios locais (braziw.localhost:3100) ou fallback amigável
 */
export async function resolveTenantFromHost(host, searchTenant = null) {
  if (!host) return { isHub: true, tenant: await getMercattaHubTenant() };
  
  const cleanHost = host.toLowerCase().trim().split(':')[0];

  // 1. Se houver parâmetro ou override explícito de tenant (ex: ?tenant=braziw ou ?tenant=wisemadness)
  if (searchTenant) {
    const s = String(searchTenant).toLowerCase().trim();
    if (s === 'mercatta' || s === 'hub') {
      return { isHub: true, tenant: await getMercattaHubTenant() };
    }
    const tenant = await getTenantBySlug(s);
    if (tenant) return { isHub: false, tenant };
  }

  // 2. Checa se é exatamente o domínio central da Mercatta
  if (cleanHost === MERCATTA_DOMAIN || cleanHost === `www.${MERCATTA_DOMAIN}`) {
    return { isHub: true, tenant: await getMercattaHubTenant() };
  }

  // 3. Checa se é subdomínio da Mercatta: cliente.grupomercatta.com.br
  if (cleanHost.endsWith(`.${MERCATTA_DOMAIN}`)) {
    const sub = cleanHost.replace(`.${MERCATTA_DOMAIN}`, '');
    if (sub === 'app' || sub === 'admin' || sub === 'hub') {
      return { isHub: true, tenant: await getMercattaHubTenant() };
    }
    const tenant = await queryOne('SELECT * FROM tenants WHERE lower(subdomain) = $1', [sub]);
    if (tenant) return { isHub: false, tenant };
  }

  // 4. Checa por Domínio Customizado (ex: blog.braziw.com.br, blog.wisemedness.com.br)
  const byCustomDomain = await queryOne('SELECT * FROM tenants WHERE lower(custom_domain) = $1', [cleanHost]);
  if (byCustomDomain) {
    return { isHub: false, tenant: byCustomDomain };
  }

  // 5. Desenvolvimento Local (localhost / 127.0.0.1) ou Staging/Preview (*.sslip.io, *.nip.io, IP direto)
  const isPreviewOrLocal = cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1') || cleanHost.includes('sslip.io') || cleanHost.includes('nip.io') || /^\d+\.\d+\.\d+\.\d+$/.test(cleanHost);
  if (isPreviewOrLocal) {
    // 5a. Subdomínio local/preview: ex: wisemadness.localhost ou wisemadness.187.77.32.119.sslip.io
    const parts = cleanHost.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127' && !/^\d+$/.test(parts[0])) {
      const sub = parts[0];
      if (sub === 'mercatta' || sub === 'hub') {
        return { isHub: true, tenant: await getMercattaHubTenant() };
      }
      const tenant = await queryOne('SELECT * FROM tenants WHERE lower(slug) = $1 OR lower(subdomain) = $1', [sub]);
      if (tenant) return { isHub: false, tenant };
    }

    // 5b. Padrão local / preview: carrega o tenant padrão (Braziw)
    const defaultTenant = await getDefaultTenant();
    if (defaultTenant) {
      return { isHub: false, tenant: defaultTenant };
    }
  }

  // Fallback final
  return { isHub: true, tenant: await getMercattaHubTenant() };
}

/**
 * Criação ou atualização idempotente de uma empresa cliente no SaaS
 */
export async function createTenant({
  name,
  slug,
  custom_domain = '',
  subdomain = '',
  plan_name = 'Pro',
  monthly_price = 497.00,
  site_title = '',
  site_tagline = '',
  site_description = '',
  primary_color = '#2563eb',
  accent_color = '#1d4ed8',
  button_color = '#ffc92b',
  button_text_color = '#1a1400',
  bg_color = '#060d24',
  hero_bg_color = '#08153a',
  logo_url = '',
  favicon_url = '',
  contact_email = '',
  whatsapp = '',
  ai_posts_limit_month = 30,
  has_whatsapp_flow = false,
}) {
  const cleanSlug = String(slug || name || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  if (!cleanSlug) throw new Error('O slug da empresa é obrigatório.');
  if (!name) throw new Error('O nome da empresa é obrigatório.');

  const cleanCustomDomain = custom_domain ? custom_domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
  const cleanSubdomain = (subdomain || cleanSlug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  const existingSlug = await getTenantBySlug(cleanSlug);

  // Se já existe empresa com esse slug:
  if (existingSlug) {
    if (existingSlug.slug === 'mercatta' || existingSlug.slug === 'braziw') {
      throw new Error(`O slug "${cleanSlug}" é reservado para o sistema.`);
    }

    // Checa se possui artigos
    const postCount = await queryOne('SELECT count(*)::int AS count FROM posts WHERE tenant_id = $1', [existingSlug.id]);
    const hasPosts = Number(postCount?.count || 0) > 0;

    if (hasPosts) {
      throw new Error(`Já existe uma empresa cadastrada com o slug "${cleanSlug}" que possui publicações.`);
    }

    // Se é uma empresa sem publicações (ex: tentativa anterior incompleta ou rascunho), atualiza com os novos dados
    if (cleanCustomDomain) {
      const existingDomain = await queryOne('SELECT id FROM tenants WHERE lower(custom_domain) = $1 AND id <> $2', [cleanCustomDomain, existingSlug.id]);
      if (existingDomain) throw new Error(`O domínio "${cleanCustomDomain}" já está em uso por outra empresa.`);
    }

    const updated = await updateTenant(existingSlug.id, {
      name: name.trim(),
      custom_domain: cleanCustomDomain,
      subdomain: cleanSubdomain,
      plan_name,
      monthly_price: Number(monthly_price) || 0,
      site_title: site_title || name,
      site_tagline: site_tagline || 'Blog Oficial',
      site_description: site_description || `Blog inteligente da ${name}`,
      primary_color: primary_color || '#2563eb',
      accent_color: accent_color || '#1d4ed8',
      button_color: button_color || '#ffc92b',
      button_text_color: button_text_color || '#1a1400',
      bg_color: bg_color || '#060d24',
      hero_bg_color: hero_bg_color || '#08153a',
      logo_url: logo_url || null,
      favicon_url: favicon_url || null,
      contact_email: contact_email || null,
      whatsapp: whatsapp || null,
      ai_posts_limit_month: Number(ai_posts_limit_month) || 30,
      has_whatsapp_flow: Boolean(has_whatsapp_flow),
      status: 'active',
    });

    // Garante categorias padrão: Notícias, Novidades, Lançamentos, Destaques
    for (const c of DEFAULT_TENANT_CATEGORIES) {
      // eslint-disable-next-line no-await-in-loop
      await query('INSERT INTO categories (tenant_id, slug, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [updated.id, c.slug, c.name]);
    }

    // Garante treinamento IA
    const initialTraining = {
      objective: `Gerar autoridade, educar clientes e atrair tráfego qualificado do Google para a empresa ${name}.`,
      audience: `Clientes em potencial e interessados nos produtos/serviços de ${name}.`,
      tone: 'Profissional, acolhedor e informativo, com foco em soluções práticas.',
      language: 'pt-BR',
      themes: `Artigos educativos, tendências do setor, guias passo a passo e novidades sobre ${name}.`,
      forbidden: 'Promessas milagrosas, ofensas, temas não relacionados ao nicho.',
      keywords: `${name}, guia, como fazer, soluções`,
      style_rules: 'Títulos H2/H3 claros, parágrafos objetivos, linguagem natural e foco na intenção do leitor.',
      cta: `Conheça mais sobre a ${name} e entre em contato conosco.`,
      brand_facts: `A ${name} é referência no seu segmento de atuação.`,
      article_length: 1200,
      ideas_count: 8,
      reference_post_ids: [],
      extra: '',
    };
    await setSetting('ai_training', initialTraining, updated.id);

    return updated;
  }

  // Novo registro
  if (cleanCustomDomain) {
    const existingDomain = await queryOne('SELECT id FROM tenants WHERE lower(custom_domain) = $1', [cleanCustomDomain]);
    if (existingDomain) throw new Error(`O domínio "${cleanCustomDomain}" já está em uso por outra empresa.`);
  }

  let row;
  try {
    row = await queryOne(`
      INSERT INTO tenants (
        name, slug, custom_domain, subdomain, plan_name, monthly_price,
        site_title, site_tagline, site_description, primary_color, accent_color,
        button_color, button_text_color, bg_color, hero_bg_color,
        logo_url, favicon_url, contact_email, whatsapp, ai_posts_limit_month, cname_target,
        has_whatsapp_flow, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21,
        $22, 'active', now(), now()
      ) RETURNING *
    `, [
      name.trim(),
      cleanSlug,
      cleanCustomDomain || null,
      cleanSubdomain || null,
      plan_name,
      Number(monthly_price) || 0,
      site_title || name,
      site_tagline || 'Blog Oficial',
      site_description || `Blog inteligente da ${name}`,
      primary_color || '#2563eb',
      accent_color || '#1d4ed8',
      button_color || '#ffc92b',
      button_text_color || '#1a1400',
      bg_color || '#060d24',
      hero_bg_color || '#08153a',
      logo_url || null,
      favicon_url || null,
      contact_email || null,
      whatsapp || null,
      Number(ai_posts_limit_month) || 30,
      DEFAULT_CNAME_TARGET,
      Boolean(has_whatsapp_flow),
    ]);

    // Cria categorias padrão para o novo tenant: Notícias, Novidades, Lançamentos, Destaques
    for (const c of DEFAULT_TENANT_CATEGORIES) {
      // eslint-disable-next-line no-await-in-loop
      await query('INSERT INTO categories (tenant_id, slug, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [row.id, c.slug, c.name]);
    }

    // Cria configuração inicial de treinamento de IA para a empresa
    const initialTraining = {
      objective: `Gerar autoridade, educar clientes e atrair tráfego qualificado do Google para a empresa ${name}.`,
      audience: `Clientes em potencial e interessados nos produtos/serviços de ${name}.`,
      tone: 'Profissional, acolhedor e informativo, com foco em soluções práticas.',
      language: 'pt-BR',
      themes: `Artigos educativos, tendências do setor, guias passo a passo e novidades sobre ${name}.`,
      forbidden: 'Promessas milagrosas, ofensas, temas não relacionados ao nicho.',
      keywords: `${name}, guia, como fazer, soluções`,
      style_rules: 'Títulos H2/H3 claros, parágrafos objetivos, linguagem natural e foco na intenção do leitor.',
      cta: `Conheça mais sobre a ${name} e entre em contato conosco.`,
      brand_facts: `A ${name} é referência no seu segmento de atuação.`,
      article_length: 1200,
      ideas_count: 8,
      reference_post_ids: [],
      extra: '',
    };
    await setSetting('ai_training', initialTraining, row.id);

    return row;
  } catch (err) {
    if (row?.id) {
      await query('DELETE FROM tenants WHERE id = $1', [row.id]).catch(() => {});
    }
    throw err;
  }
}

/**
 * Atualização dos dados de um tenant
 */
export async function updateTenant(id, data) {
  const existing = await getTenantById(id);
  if (!existing) throw new Error('Empresa não encontrada.');

  const fields = [];
  const values = [];

  const add = (col, val) => {
    values.push(val);
    fields.push(`${col} = $${values.length}`);
  };

  if (data.name !== undefined) add('name', String(data.name).trim());
  if (data.custom_domain !== undefined) {
    const cd = data.custom_domain ? String(data.custom_domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
    if (cd) {
      const existingDomain = await queryOne('SELECT id FROM tenants WHERE lower(custom_domain) = $1 AND id <> $2', [cd, id]);
      if (existingDomain) throw new Error(`O domínio "${cd}" já está em uso por outra empresa.`);
    }
    add('custom_domain', cd || null);
  }
  if (data.subdomain !== undefined) {
    const sub = data.subdomain ? String(data.subdomain).trim().toLowerCase() : null;
    if (sub) {
      const existingSub = await queryOne('SELECT id FROM tenants WHERE lower(subdomain) = $1 AND id <> $2', [sub, id]);
      if (existingSub) throw new Error(`O subdomínio "${sub}" já está em uso por outra empresa.`);
    }
    add('subdomain', sub || null);
  }
  if (data.status !== undefined) add('status', data.status);
  if (data.plan_name !== undefined) add('plan_name', data.plan_name);
  if (data.monthly_price !== undefined) add('monthly_price', Number(data.monthly_price) || 0);
  if (data.site_title !== undefined) add('site_title', data.site_title);
  if (data.site_tagline !== undefined) add('site_tagline', data.site_tagline);
  if (data.site_description !== undefined) add('site_description', data.site_description);
  if (data.primary_color !== undefined) add('primary_color', data.primary_color);
  if (data.accent_color !== undefined) add('accent_color', data.accent_color);
  if (data.button_color !== undefined) add('button_color', data.button_color ? String(data.button_color).trim() : null);
  if (data.button_text_color !== undefined) add('button_text_color', data.button_text_color ? String(data.button_text_color).trim() : null);
  if (data.bg_color !== undefined) add('bg_color', data.bg_color ? String(data.bg_color).trim() : null);
  if (data.hero_bg_color !== undefined) add('hero_bg_color', data.hero_bg_color ? String(data.hero_bg_color).trim() : null);
  if (data.logo_url !== undefined) add('logo_url', data.logo_url ? String(data.logo_url).trim() : null);
  if (data.favicon_url !== undefined) add('favicon_url', data.favicon_url ? String(data.favicon_url).trim() : null);
  if (data.contact_email !== undefined) add('contact_email', data.contact_email);
  if (data.whatsapp !== undefined) add('whatsapp', data.whatsapp);
  if (data.instagram !== undefined) add('instagram', data.instagram);
  if (data.linkedin !== undefined) add('linkedin', data.linkedin);
  if (data.theme_config !== undefined) add('theme_config', typeof data.theme_config === 'string' ? data.theme_config : JSON.stringify(data.theme_config || {}));
  if (data.domain_verified !== undefined) add('domain_verified', Boolean(data.domain_verified));
  if (data.mcp_api_key !== undefined) add('mcp_api_key', data.mcp_api_key ? String(data.mcp_api_key).trim() : null);
  if (data.gtm_id !== undefined) add('gtm_id', data.gtm_id ? String(data.gtm_id).trim() : null);
  if (data.ga_id !== undefined) add('ga_id', data.ga_id ? String(data.ga_id).trim() : null);
  if (data.custom_head_scripts !== undefined) add('custom_head_scripts', data.custom_head_scripts || null);
  if (data.custom_body_scripts !== undefined) add('custom_body_scripts', data.custom_body_scripts || null);
  if (data.google_service_account_json !== undefined) add('google_service_account_json', data.google_service_account_json || null);
  if (data.google_search_console_property !== undefined) add('google_search_console_property', data.google_search_console_property ? String(data.google_search_console_property).trim() : null);
  if (data.google_auto_index !== undefined) add('google_auto_index', Boolean(data.google_auto_index));
  if (data.last_google_indexing_at !== undefined) add('last_google_indexing_at', data.last_google_indexing_at);
  if (data.has_whatsapp_flow !== undefined) add('has_whatsapp_flow', Boolean(data.has_whatsapp_flow));
  if (data.whatsapp_flow_config !== undefined) add('whatsapp_flow_config', typeof data.whatsapp_flow_config === 'string' ? data.whatsapp_flow_config : JSON.stringify(data.whatsapp_flow_config || {}));
  if (data.webhook_url !== undefined) add('webhook_url', data.webhook_url ? String(data.webhook_url).trim() : null);

  if (!fields.length) return existing;

  add('updated_at', new Date());
  values.push(id);

  return queryOne(`
    UPDATE tenants SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *
  `, values);
}

/**
 * Remove uma empresa (e todos os seus dados em cascata)
 */
export async function deleteTenant(id) {
  const existing = await getTenantById(id);
  if (!existing) throw new Error('Empresa não encontrada.');
  if (existing.slug === 'mercatta' || existing.slug === 'braziw') {
    throw new Error('Esta empresa padrão do sistema não pode ser removida.');
  }
  // Exclui dependências em cascata
  await query('DELETE FROM post_categories WHERE post_id IN (SELECT id FROM posts WHERE tenant_id = $1)', [id]);
  await query('DELETE FROM posts WHERE tenant_id = $1', [id]);
  await query('DELETE FROM ideas WHERE tenant_id = $1', [id]);
  await query('DELETE FROM categories WHERE tenant_id = $1', [id]);
  await query('DELETE FROM settings WHERE tenant_id = $1', [id]);
  await query("DELETE FROM users WHERE tenant_id = $1 AND role <> 'superadmin'", [id]);
  await query('DELETE FROM tenants WHERE id = $1', [id]);
  return existing;
}

/**
 * Diagnóstico de DNS em tempo real para o domínio da empresa
 */
export async function verifyDomainDNS(domain) {
  if (!domain) return { verified: false, error: 'Domínio não informado' };
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').split(':')[0];
  try {
    const cnames = await dns.resolveCname(clean);
    const expected = DEFAULT_CNAME_TARGET.toLowerCase();
    const hasTarget = cnames.some((c) => c.toLowerCase().includes('mercatta') || c.toLowerCase().includes('vercel') || c.toLowerCase().includes(expected));
    return {
      verified: hasTarget || cnames.length > 0,
      cnames,
      targetExpected: DEFAULT_CNAME_TARGET,
      rawMatches: hasTarget,
    };
  } catch (err) {
    return {
      verified: false,
      error: err.code === 'ENODATA' ? 'Nenhum registro CNAME encontrado para este domínio.' : err.message,
      targetExpected: DEFAULT_CNAME_TARGET,
    };
  }
}
