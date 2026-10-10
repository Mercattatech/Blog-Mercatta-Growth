// Camada de banco de dados.
// - Produção (Vercel): Postgres via DATABASE_URL (Neon / Vercel Postgres).
// - Desenvolvimento local sem DATABASE_URL: PGlite (Postgres embutido) em ./.data/pglite
import path from 'node:path';
import fs from 'node:fs';

const g = globalThis;

const SCHEMA = `
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INT,
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
  tenant_id INT,
  slug TEXT NOT NULL,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  tenant_id INT,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_visibility_idx ON posts (status, publish_at DESC);
CREATE INDEX IF NOT EXISTS posts_tenant_idx ON posts (tenant_id, status, publish_at DESC);
CREATE TABLE IF NOT EXISTS post_categories (
  post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, category_id)
);
CREATE TABLE IF NOT EXISTS settings (
  tenant_id INT,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ideas (
  id SERIAL PRIMARY KEY,
  tenant_id INT,
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
  tenant_id INT NOT NULL,
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
  tenant_id INT NOT NULL,
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
  tenant_id INT,
  view_date DATE NOT NULL DEFAULT CURRENT_DATE,
  views_count INT NOT NULL DEFAULT 1,
  UNIQUE(post_id, view_date)
);
-- Migrações seguras idempotentes para bancos pré-existentes
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS button_color TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS button_text_color TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bg_color TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hero_bg_color TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mcp_api_key TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gtm_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ga_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_head_scripts TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_body_scripts TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_service_account_json TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_search_console_property TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_auto_index BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_google_indexing_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_whatsapp_flow BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_flow_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE post_schedules ADD COLUMN IF NOT EXISTS cover_prompt TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tenant_id INT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tenant_id INT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS tenant_id INT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id INT;
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
CREATE UNIQUE INDEX IF NOT EXISTS settings_tenant_key_idx ON settings (COALESCE(tenant_id, 0), key);
CREATE UNIQUE INDEX IF NOT EXISTS categories_tenant_slug_idx ON categories (COALESCE(tenant_id, 0), slug);
`;

export function getPostgresConnectionString() {
  const sanitize = (s) => {
    if (typeof s !== 'string') return null;
    let t = s.trim();
    // Remove prefixo caso o usuário tenha colado 'DATABASE_URL=...' no campo de valor
    t = t.replace(/^(?:DATABASE_URL|POSTGRES_URL|STORAGE_URL|POSTGRESQL_URL)\s*=\s*/i, '');
    // Remove aspas simples ou duplas ao redor da URL
    t = t.replace(/^["'](.*)["']$/, '$1').trim();
    if (t.startsWith('postgres://') || t.startsWith('postgresql://')) return t;
    return t || null;
  };

  const direct = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.STORAGE_POSTGRES_URL,
    process.env.STORAGE_POSTGRES_PRISMA_URL,
    process.env.STORAGE_POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.STORAGE_URL,
  ];
  for (const c of direct) {
    const s = sanitize(c);
    if (s) return s;
  }
  for (const [key, val] of Object.entries(process.env)) {
    if (typeof val === 'string' && (key.endsWith('POSTGRES_URL') || key.endsWith('DATABASE_URL'))) {
      const s = sanitize(val);
      if (s) return s;
    }
  }
  for (const [key, val] of Object.entries(process.env)) {
    if (typeof val === 'string') {
      const s = sanitize(val);
      if (s && (s.startsWith('postgres://') || s.startsWith('postgresql://'))) return s;
    }
  }
  return null;
}

async function connect() {
  const connString = getPostgresConnectionString();
  if (connString || process.env.POSTGRES_HOST) {
    const { default: pg } = await import('pg');
    let poolConfig = { max: 3 };

    if (connString) {
      try {
        const u = new URL(connString);
        poolConfig = {
          user: decodeURIComponent(u.username || '') || process.env.POSTGRES_USER,
          password: decodeURIComponent(u.password || '') || process.env.POSTGRES_PASSWORD,
          host: u.hostname || process.env.POSTGRES_HOST,
          port: Number(u.port) || 5432,
          database: u.pathname.replace(/^\//, '') || process.env.POSTGRES_DATABASE,
          max: 3,
        };
      } catch {
        poolConfig = { connectionString: connString, max: 3 };
      }
    } else if (process.env.POSTGRES_HOST) {
      poolConfig = {
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        host: process.env.POSTGRES_HOST,
        port: 5432,
        database: process.env.POSTGRES_DATABASE,
        max: 3,
      };
    }

    const host = (poolConfig.host || '').toLowerCase();
    const hasSslDisable = (connString || '').toLowerCase().includes('sslmode=disable');
    const isPrivateOrLocal = host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      host.startsWith('192.168.') ||
      host.endsWith('.local') ||
      !host.includes('.'); // Nomes internos de containers Docker sem ponto (ex: 'keot...', 'postgres', 'db')

    if (hasSslDisable || isPrivateOrLocal) {
      delete poolConfig.ssl;
    } else {
      // Desativa checagem estrita de certificados intermediários para Supabase/Neon na nuvem
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    const pool = new pg.Pool(poolConfig);
    return {
      kind: 'pg',
      query: async (text, params = []) => (await pool.query(text, params)).rows,
      exec: async (sql) => { await pool.query(sql); },
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = path.join(process.cwd(), '.data', 'pglite');
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  try {
    const pidFile = path.join(dir, 'postmaster.pid');
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
  } catch {}
  const db = new PGlite(dir);
  await db.waitReady;
  return {
    kind: 'pglite',
    query: async (text, params = []) => (await db.query(text, params)).rows,
    exec: async (sql) => { await db.exec(sql); },
  };
}

const MIGRATIONS = [
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS button_color TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS button_text_color TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bg_color TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hero_bg_color TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS favicon_url TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mcp_api_key TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gtm_id TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ga_id TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_head_scripts TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_body_scripts TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_service_account_json TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_search_console_property TEXT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_auto_index BOOLEAN DEFAULT true',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_google_indexing_at TIMESTAMPTZ',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_whatsapp_flow BOOLEAN DEFAULT false',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_flow_config JSONB DEFAULT \'{}\'::jsonb',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS webhook_url TEXT',
  'ALTER TABLE post_schedules ADD COLUMN IF NOT EXISTS is_continuous BOOLEAN DEFAULT false',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INT',
  'ALTER TABLE posts ADD COLUMN IF NOT EXISTS tenant_id INT',
  'ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ',
  'ALTER TABLE posts ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0',
  'ALTER TABLE categories ADD COLUMN IF NOT EXISTS tenant_id INT',
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT \'{}\'::jsonb',
  'ALTER TABLE ideas ADD COLUMN IF NOT EXISTS tenant_id INT',
  'ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id INT',
  `CREATE TABLE IF NOT EXISTS post_schedules (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
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
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_url TEXT,
    webhook_sent BOOLEAN DEFAULT false,
    webhook_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS post_views_daily (
    id SERIAL PRIMARY KEY,
    post_id INT NOT NULL,
    tenant_id INT,
    view_date DATE NOT NULL DEFAULT CURRENT_DATE,
    views_count INT NOT NULL DEFAULT 1,
    UNIQUE(post_id, view_date)
  )`,
  // Gera mcp_api_key automática para tenants existentes que não possuam
  `UPDATE tenants SET mcp_api_key = 'mcp_' || substr(md5(random()::text || id::text || now()::text), 1, 32) WHERE mcp_api_key IS NULL`,
];

let migrationsRun = false;

function getDb() {
  if (!g.__braziwDb) {
    g.__braziwDb = connect().then(async (db) => {
      await db.exec(SCHEMA);
      for (const m of MIGRATIONS) {
        await db.query(m).catch(() => {});
      }
      migrationsRun = true;
      try {
        const { autoSeedIfEmpty, ensureAdminUser, migrateTenants } = await import('./seed.js');
        await autoSeedIfEmpty(db);
        await migrateTenants(db);
        await ensureAdminUser(db);
      } catch (err) {
        console.error('Erro ao verificar auto-seed / admin user:', err);
      }
      return db;
    }).catch((e) => { g.__braziwDb = null; throw e; });
  }
  return g.__braziwDb;
}

/** Executa uma query parametrizada ($1, $2…) e devolve as linhas. */
export async function query(text, params = []) {
  const db = await getDb();
  if (!migrationsRun) {
    for (const m of MIGRATIONS) {
      await db.query(m).catch(() => {});
    }
    migrationsRun = true;
  }
  return db.query(text, params);
}

export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] || null;
}

export async function dbKind() {
  return (await getDb()).kind;
}
