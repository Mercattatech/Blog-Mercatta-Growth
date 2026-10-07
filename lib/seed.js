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
 * Se o banco de dados estiver vazio, popula automaticamente todos os 184 artigos,
 * categorias e cria o usuário administrador inicial.
 */
export async function autoSeedIfEmpty(db) {
  try {
    const res = await db.query('SELECT count(*) as c FROM posts');
    const count = Number(res[0]?.c || 0);
    if (count > 0) return false;

    console.log('[seed] Banco de dados vazio detectado. Populando artigos iniciais...');

    // 1. Categorias
    for (const c of seedData.categories || []) {
      await db.query(
        'INSERT INTO categories (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING',
        [c.slug, c.name]
      );
    }

    // 2. Artigos
    for (const p of seedData.posts || []) {
      const exists = await db.query('SELECT id FROM posts WHERE legacy_id = $1 OR slug = $2', [p.legacy_id, p.slug]);
      if (exists.length > 0) continue;

      const dateVal = p.date ? withTz(p.date) : new Date();
      const modVal = p.modified ? withTz(p.modified) : dateVal;

      const r = await db.query(
        `INSERT INTO posts (legacy_id, slug, title, excerpt, content, word_count, cover_url, cover_thumb, tags, status, publish_at, published_at,
           author_name, created_at, updated_at, seo_title, seo_description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'published',$10,$10,$11,$10,$12,$13,$14) RETURNING id`,
        [
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
    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/', 'layout');
    } catch {}
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
    const adminName = process.env.ADMIN_NAME || 'Administrador';
    const adminCheck = await db.query('SELECT id, password_hash FROM users WHERE lower(email) = $1', [adminEmail]);

    if (!adminCheck.length) {
      const hash = await bcrypt.hash('TesteAdmin2026x', 10);
      await db.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
        [adminName, adminEmail, hash]
      );
      console.log(`[seed] Administrador criado: ${adminEmail}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('[seed] Erro ao verificar/criar administrador:', err);
    return false;
  }
}
