// Camada de banco de dados.
// - Produção (Vercel): Postgres via DATABASE_URL (Neon / Vercel Postgres).
// - Desenvolvimento local sem DATABASE_URL: PGlite (Postgres embutido) em ./.data/pglite
import path from 'node:path';
import fs from 'node:fs';

const g = globalThis;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
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
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  legacy_id INT UNIQUE,
  slug TEXT UNIQUE NOT NULL,
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
CREATE TABLE IF NOT EXISTS post_categories (
  post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, category_id)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ideas (
  id SERIAL PRIMARY KEY,
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
`;

export function getPostgresConnectionString() {
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
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  for (const [key, val] of Object.entries(process.env)) {
    if (typeof val === 'string' && (key.endsWith('POSTGRES_URL') || key.endsWith('DATABASE_URL'))) {
      if (val.startsWith('postgres://') || val.startsWith('postgresql://')) {
        return val.trim();
      }
    }
  }
  for (const [key, val] of Object.entries(process.env)) {
    if (typeof val === 'string' && (val.startsWith('postgres://') || val.startsWith('postgresql://'))) {
      return val.trim();
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

    const isLocal = (poolConfig.host || '').includes('localhost') || (poolConfig.host || '').includes('127.0.0.1');
    if (!isLocal) {
      // Desativa checagem estrita de certificados intermediários para Supabase/Neon
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

function getDb() {
  if (!g.__braziwDb) {
    g.__braziwDb = connect().then(async (db) => {
      await db.exec(SCHEMA);
      try {
        const { autoSeedIfEmpty } = await import('./seed.js');
        await autoSeedIfEmpty(db);
      } catch (err) {
        console.error('Erro ao verificar auto-seed:', err);
      }
      return db;
    }).catch((e) => { g.__braziwDb = null; throw e; });
  }
  return g.__braziwDb;
}

/** Executa uma query parametrizada ($1, $2…) e devolve as linhas. */
export async function query(text, params = []) {
  const db = await getDb();
  return db.query(text, params);
}

export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] || null;
}

export async function dbKind() {
  return (await getDb()).kind;
}
