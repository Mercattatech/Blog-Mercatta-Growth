import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import { stripHtml, wordCount } from './content.js';

const require = createRequire(import.meta.url);
let seedData;
try {
  seedData = require('../scripts/seed-data.json');
} catch {
  seedData = { categories: [], posts: [] };
}

const withTz = (s) => new Date(`${s.slice(0, 19)}-03:00`);

/**
 * Garante a criação dos tenants iniciais (Mercatta e Braziw) e migra registros
 * legados órfãos para o tenant Braziw sem perder nada.
 */
export async function migrateTenants(db) {
  try {
    const tenantMigrations = [
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS button_color TEXT',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS button_text_color TEXT',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bg_color TEXT',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hero_bg_color TEXT',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS favicon_url TEXT',
      'ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ',
    ];
    for (const sql of tenantMigrations) {
      await db.query(sql).catch(() => {});
    }

    // 1. Cria o Tenant Grupo Mercatta (Hub / Super Admin)
    let mercatta = (await db.query("SELECT id FROM tenants WHERE slug = 'mercatta'"))[0];
    if (!mercatta) {
      const res = await db.query(`
        INSERT INTO tenants (
          slug, name, custom_domain, subdomain, status, plan_name, monthly_price,
          site_title, site_tagline, site_description, primary_color, accent_color,
          cname_target, ai_posts_limit_month, created_at, updated_at
        ) VALUES (
          'mercatta', 'Grupo Mercatta', 'grupomercatta.com.br', 'app', 'active', 'Enterprise', 0,
          'Mercatta Growth — Blogs Corporativos Inteligentes', 'Plataforma SaaS Multi-Tenant com IA',
          'SaaS corporativo para criação e gestão de blogs inteligentes no seu próprio domínio.',
          '#0f172a', '#3b82f6', 'cname.grupomercatta.com.br', 9999, now(), now()
        ) RETURNING id
      `);
      mercatta = res[0];
      console.log('[tenant] Tenant Grupo Mercatta criado com sucesso (ID:', mercatta.id, ')');
    }

    // 2. Cria o Tenant Braziw (primeiro cliente / tenant padrão dos 184 artigos)
    let braziw = (await db.query("SELECT id FROM tenants WHERE slug = 'braziw'"))[0];
    if (!braziw) {
      const res = await db.query(`
        INSERT INTO tenants (
          slug, name, custom_domain, subdomain, status, plan_name, monthly_price,
          site_title, site_tagline, site_description, primary_color, accent_color,
          logo_url, cname_target, ai_posts_limit_month, created_at, updated_at
        ) VALUES (
          'braziw', 'Braziw — Idiomas e Intercâmbios', 'blog.braziw.com.br', 'braziw', 'active', 'Pro', 497.00,
          'Blog Braziw', 'Tudo sobre Francês',
          'O blog da Braziw com curiosidades sobre a França, dicas de francês, cultura europeia e muito mais para quem quer aprender o idioma.',
          '#0a1a44', '#e50914', '/img/logo.png', 'cname.grupomercatta.com.br', 50, now(), now()
        ) RETURNING id
      `);
      braziw = res[0];
      console.log('[tenant] Tenant Braziw criado com sucesso (ID:', braziw.id, ')');
    }

    const braziwId = braziw.id;

    // 2b. Cria o Tenant Wise Madness se não existir
    let wisemadness = (await db.query("SELECT id FROM tenants WHERE slug = 'wisemadness' OR slug = 'wisemadness-projeto-social'"))[0];
    if (!wisemadness) {
      await db.query(`
        INSERT INTO tenants (
          slug, name, custom_domain, subdomain, status, plan_name, monthly_price,
          site_title, site_tagline, site_description, primary_color, accent_color,
          button_color, button_text_color, bg_color, hero_bg_color,
          logo_url, whatsapp, ai_posts_limit_month, created_at, updated_at
        ) VALUES (
          'wisemadness', 'wisemadness', 'blog.wisemedness.com.br', 'wisemadness', 'active', 'Starter', 297.00,
          'Juntos, transformamos vidas e construímos um futuro melhor — Aqui o amor acontece',
          'Aqui o amor acontece',
          'Blog inteligente da wisemadness',
          '#ff0a23', '#003edb',
          '#080807', '#ffffff', '#b4c81e', '#b4c81e',
          'https://storage.sitevero.com/cms-production/ed56bfa9-6eca-4a60-8be4-4f0eb861d98d/1786552132618_WhatsApp_Image_2026-08-12_at_13_28_29.jpeg',
          '1432087400', 30, now(), now()
        )
      `).catch(() => {});
    }

    // 3. Atualiza posts, categorias, settings, ideias e usuários antigos sem tenant_id para o tenant Braziw
    await db.query('UPDATE posts SET tenant_id = $1 WHERE tenant_id IS NULL', [braziwId]);
    await db.query('UPDATE categories SET tenant_id = $1 WHERE tenant_id IS NULL', [braziwId]);
    await db.query('UPDATE ideas SET tenant_id = $1 WHERE tenant_id IS NULL', [braziwId]);
    await db.query('UPDATE settings SET tenant_id = $1 WHERE tenant_id IS NULL', [braziwId]);
    await db.query("UPDATE users SET tenant_id = $1 WHERE tenant_id IS NULL AND role <> 'superadmin'", [braziwId]);

    // 3b. Garante categorias padrão para a Mercatta
    if (mercatta?.id) {
      const defaultCats = [
        { slug: 'noticias', name: 'Notícias' },
        { slug: 'novidades', name: 'Novidades' },
        { slug: 'lancamentos', name: 'Lançamentos' },
        { slug: 'destaques', name: 'Destaques' },
      ];
      for (const c of defaultCats) {
        await db.query('INSERT INTO categories (tenant_id, slug, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [mercatta.id, c.slug, c.name]).catch(() => {});
      }
    }

    // 4. Cria Super Admin do Grupo Mercatta se não existir
    await ensureSuperAdmin(db, mercatta.id);

  } catch (err) {
    console.error('[tenant] Erro na migração de tenants:', err);
  }
}

/**
 * Garante o usuário Super Administrador do Grupo Mercatta
 */
export async function ensureSuperAdmin(db, mercattaTenantId) {
  try {
    const superEmail = (process.env.SUPERADMIN_EMAIL || 'admin@grupomercatta.com.br').toLowerCase().trim();
    const superName = process.env.SUPERADMIN_NAME || 'Mercatta Super Admin';
    const check = await db.query('SELECT id FROM users WHERE lower(email) = $1', [superEmail]);

    if (!check.length) {
      const hash = await bcrypt.hash('Mercatta2026!', 10);
      await db.query(
        "INSERT INTO users (name, email, password_hash, role, tenant_id) VALUES ($1, $2, $3, 'admin', $4)",
        [superName, superEmail, hash, mercattaTenantId || null]
      );
      console.log(`[admin] Administrador da Mercatta criado: ${superEmail}`);
    } else {
      await db.query("UPDATE users SET role = 'admin' WHERE lower(email) = $1", [superEmail]);
    }
  } catch (err) {
    console.error('[superadmin] Erro ao verificar super admin:', err);
  }
}

/**
 * Se o banco de dados estiver vazio, popula automaticamente todos os 184 artigos,
 * categorias e cria o usuário administrador inicial.
 */
export async function autoSeedIfEmpty(db) {
  try {
    const res = await db.query('SELECT count(*) as c FROM posts');
    const count = Number(res[0]?.c || 0);
    if (count > 0) {
      await migrateTenants(db);
      return false;
    }

    console.log('[seed] Banco de dados vazio detectado. Populando artigos iniciais...');

    // Garante criação dos tenants primeiro
    await migrateTenants(db);
    const braziwTenant = (await db.query("SELECT id FROM tenants WHERE slug = 'braziw'"))[0];
    const tenantId = braziwTenant?.id || null;

    // 1. Categorias
    for (const c of seedData.categories || []) {
      await db.query(
        'INSERT INTO categories (tenant_id, slug, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [tenantId, c.slug, c.name]
      );
    }

    // 2. Artigos
    for (const p of seedData.posts || []) {
      const exists = await db.query('SELECT id FROM posts WHERE legacy_id = $1 OR slug = $2', [p.legacy_id, p.slug]);
      if (exists.length > 0) continue;

      const dateVal = p.date ? withTz(p.date) : new Date();
      const modVal = p.modified ? withTz(p.modified) : dateVal;

      const r = await db.query(
        `INSERT INTO posts (tenant_id, legacy_id, slug, title, excerpt, content, word_count, cover_url, cover_thumb, tags, status, publish_at, published_at,
           author_name, created_at, updated_at, seo_title, seo_description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,'published',$11,$11,$12,$11,$13,$14,$15) RETURNING id`,
        [
          tenantId,
          p.legacy_id,
          p.slug,
          p.title,
          p.excerpt || '',
          p.content || '',
          wordCount(p.content || ''),
          p.cover || null,
          p.cover_thumb || null,
          JSON.stringify(p.tags || []),
          dateVal,
          p.author || 'Equipe Braziw',
          modVal,
          (p.title || '').slice(0, 60),
          (p.excerpt || '').slice(0, 158),
        ]
      );

      const postId = r[0]?.id;
      if (postId && p.categories?.length) {
        for (let i = 0; i < p.categories.length; i++) {
          await db.query(
            'INSERT INTO post_categories (post_id, category_id, position) SELECT $1, id, $3 FROM categories WHERE slug = $2 ON CONFLICT DO NOTHING',
            [postId, p.categories[i], i]
          );
        }
      }
    }

    // 3. Usuário Administrador
    await ensureAdminUser(db);

    console.log('[seed] Banco de dados populado com sucesso (184 artigos)!');
    return true;
  } catch (err) {
    console.error('[seed] Erro durante o auto-seed do banco:', err);
    return false;
  }
}

/**
 * Garante que a conta de administrador exista no banco.
 */
export async function ensureAdminUser(db) {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@braziw.com.br').toLowerCase().trim();
    const adminName = process.env.ADMIN_NAME || 'Administrador Braziw';
    const adminCheck = await db.query('SELECT id, password_hash FROM users WHERE lower(email) = $1', [adminEmail]);

    const braziwTenant = (await db.query("SELECT id FROM tenants WHERE slug = 'braziw'"))[0];
    const tenantId = braziwTenant?.id || null;

    if (!adminCheck.length) {
      const hash = await bcrypt.hash('TesteAdmin2026x', 10);
      await db.query(
        "INSERT INTO users (name, email, password_hash, role, tenant_id) VALUES ($1, $2, $3, 'admin', $4)",
        [adminName, adminEmail, hash, tenantId]
      );
      console.log(`[seed] Administrador criado: ${adminEmail}`);
      return true;
    } else if (tenantId) {
      await db.query('UPDATE users SET tenant_id = $1 WHERE id = $2 AND tenant_id IS NULL', [tenantId, adminCheck[0].id]);
    }
    return false;
  } catch (err) {
    console.error('[seed] Erro ao verificar/criar administrador:', err);
    return false;
  }
}
