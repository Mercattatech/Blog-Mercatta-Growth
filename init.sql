-- ==============================================================================
-- MERCATTA GROWTH — SCRIPT DE INICIALIZAÇÃO COMPLETA DO BANCO POSTGRESQL
-- Executa todas as tabelas, índices, migrações e insere tenants e admins padrão.
-- ==============================================================================

-- 1. CRIAÇÃO DAS TABELAS PRINCIPAIS
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  custom_domain TEXT UNIQUE,
  subdomain TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  plan_name TEXT NOT NULL DEFAULT 'Pro',
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 497.00,
  site_title TEXT,
  site_tagline TEXT,
  site_description TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  accent_color TEXT DEFAULT '#1d4ed8',
  button_color TEXT DEFAULT '#ffc92b',
  button_text_color TEXT DEFAULT '#1a1400',
  bg_color TEXT DEFAULT '#060d24',
  hero_bg_color TEXT DEFAULT '#08153a',
  logo_url TEXT,
  favicon_url TEXT,
  contact_email TEXT,
  whatsapp TEXT,
  instagram TEXT,
  linkedin TEXT,
  cname_target TEXT DEFAULT 'cname.grupomercatta.com.br',
  domain_verified BOOLEAN DEFAULT false,
  ai_posts_limit_month INT DEFAULT 30,
  ai_posts_used_month INT DEFAULT 0,
  mcp_api_key TEXT,
  gtm_id TEXT,
  ga_id TEXT,
  custom_head_scripts TEXT,
  custom_body_scripts TEXT,
  google_service_account_json TEXT,
  google_search_console_property TEXT,
  google_auto_index BOOLEAN DEFAULT true,
  last_google_indexing_at TIMESTAMPTZ,
  has_whatsapp_flow BOOLEAN DEFAULT false,
  whatsapp_flow_config JSONB DEFAULT '{}'::jsonb,
  webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'author',
  active BOOLEAN NOT NULL DEFAULT true,
  token_version INT NOT NULL DEFAULT 0,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
  legacy_id INT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  word_count INT NOT NULL DEFAULT 0,
  cover_url TEXT,
  cover_thumb TEXT,
  cover_alt TEXT,
  tags JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  publish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  seo_title TEXT,
  seo_description TEXT,
  focus_keyword TEXT,
  secondary_keywords JSONB NOT NULL DEFAULT '[]',
  faq JSONB NOT NULL DEFAULT '[]',
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  views_count INT DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_categories (
  post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE IF NOT EXISTS settings (
  tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ideas (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  focus_keyword TEXT,
  angle TEXT,
  category_slug TEXT,
  search_intent TEXT,
  outline JSONB NOT NULL DEFAULT '[]',
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'suggested',
  error TEXT,
  post_id INT REFERENCES posts(id) ON DELETE SET NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_schedules (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  articles_total INT NOT NULL DEFAULT 4,
  articles_generated INT NOT NULL DEFAULT 0,
  frequency_days INT NOT NULL DEFAULT 3,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  preferred_time TEXT DEFAULT '09:00',
  category_slug TEXT,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_url TEXT,
  webhook_sent BOOLEAN DEFAULT false,
  webhook_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_views_daily (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL,
  tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
  view_date DATE NOT NULL DEFAULT CURRENT_DATE,
  views_count INT NOT NULL DEFAULT 1,
  UNIQUE(post_id, view_date)
);

-- 2. ÍNDICES DE PERFORMANCE E UNICIDADE
CREATE INDEX IF NOT EXISTS posts_visibility_idx ON posts (status, publish_at DESC);
CREATE INDEX IF NOT EXISTS posts_tenant_idx ON posts (tenant_id, status, publish_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS settings_tenant_key_idx ON settings (COALESCE(tenant_id, 0), key);
CREATE UNIQUE INDEX IF NOT EXISTS categories_tenant_slug_idx ON categories (COALESCE(tenant_id, 0), slug);

-- 3. DADOS INICIAIS: TENANTS (GRUPOMERCATTA, BRAZIW, WISEMADNESS)
INSERT INTO tenants (
  slug, name, custom_domain, subdomain, status, plan_name, monthly_price,
  site_title, site_tagline, site_description, primary_color, accent_color,
  cname_target, ai_posts_limit_month, created_at, updated_at
) VALUES (
  'mercatta', 'Grupo Mercatta', 'grupomercatta.com.br', 'app', 'active', 'Enterprise', 0,
  'Mercatta Growth — Blogs Corporativos Inteligentes', 'Plataforma SaaS Multi-Tenant com IA',
  'SaaS corporativo para criação e gestão de blogs inteligentes no seu próprio domínio.',
  '#0f172a', '#3b82f6', 'cname.grupomercatta.com.br', 9999, now(), now()
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO tenants (
  slug, name, custom_domain, subdomain, status, plan_name, monthly_price,
  site_title, site_tagline, site_description, primary_color, accent_color,
  button_color, button_text_color, bg_color, hero_bg_color,
  logo_url, cname_target, ai_posts_limit_month, created_at, updated_at
) VALUES (
  'braziw', 'Braziw — Idiomas e Intercâmbios', 'blog.braziw.com.br', 'braziw', 'active', 'Pro', 497.00,
  'Blog Braziw', 'Tudo sobre Francês',
  'O blog da Braziw com curiosidades sobre a França, dicas de francês, cultura europeia e muito mais.',
  '#0a1a44', '#e50914', '#ffc92b', '#1a1400', '#060d24', '#08153a',
  '/img/logo.png', 'cname.grupomercatta.com.br', 50, now(), now()
) ON CONFLICT (slug) DO NOTHING;

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
  '#ff0a23', '#003edb', '#080807', '#ffffff', '#b4c81e', '#b4c81e',
  'https://storage.sitevero.com/cms-production/ed56bfa9-6eca-4a60-8be4-4f0eb861d98d/1786552132618_WhatsApp_Image_2026-08-12_at_13_28_29.jpeg',
  '1432087400', 30, now(), now()
) ON CONFLICT (slug) DO NOTHING;

-- 4. DADOS INICIAIS: USUÁRIOS ADMINISTRADORES
-- Senha padrão para ambos: admin123
-- Hash Bcrypt de admin123: $2b$10$ZRKX.YZDHcC1QVfwwcYVMehh9/iL7RmuE1xsr7a/v2odekkDy6zF2

-- 4.1 Super Admin Mercatta (Acesso Geral)
INSERT INTO users (name, email, password_hash, role, tenant_id, active)
SELECT 'Mercatta Super Admin', 'admin@grupomercatta.com.br', '$2b$10$ZRKX.YZDHcC1QVfwwcYVMehh9/iL7RmuE1xsr7a/v2odekkDy6zF2', 'admin', t.id, true
FROM tenants t WHERE t.slug = 'mercatta'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin';

-- 4.2 Admin do Tenant Braziw
INSERT INTO users (name, email, password_hash, role, tenant_id, active)
SELECT 'Administrador Braziw', 'admin@braziw.com.br', '$2b$10$ZRKX.YZDHcC1QVfwwcYVMehh9/iL7RmuE1xsr7a/v2odekkDy6zF2', 'admin', t.id, true
FROM tenants t WHERE t.slug = 'braziw'
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin';

-- 5. CATEGORIAS PADRÃO PARA O TENANT BRAZIW
INSERT INTO categories (tenant_id, slug, name)
SELECT t.id, c.slug, c.name
FROM tenants t
CROSS JOIN (VALUES
  ('curiosidade', 'Curiosidade'),
  ('curiosidades-da-europa', 'Curiosidades da Europa'),
  ('sobre-o-idioma-frances', 'Sobre o Idioma Francês'),
  ('dicas-de-frances', 'Dicas de francês'),
  ('dating-tips', 'Estilo de Vida'),
  ('uncategorized', 'Geral')
) AS c(slug, name)
WHERE t.slug = 'braziw'
ON CONFLICT DO NOTHING;
