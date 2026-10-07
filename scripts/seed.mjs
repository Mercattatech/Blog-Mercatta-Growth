// Popula o banco com os artigos atuais do blog e cria o administrador inicial.
//
// Uso:
//   node --env-file=.env.local scripts/seed.mjs
//   node --env-file=.env.local scripts/seed.mjs --admin-link   (gera novo link de definição de senha do admin)
//
// Variáveis: DATABASE_URL (produção), ADMIN_EMAIL, ADMIN_NAME, SITE_URL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { query, queryOne, dbKind } from '../lib/db.js';
import { stripHtml, wordCount } from '../lib/content.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(here, 'seed-data.json'), 'utf-8'));
const withTz = (s) => new Date(`${s.slice(0, 19)}-03:00`);

console.log(`Banco: ${await dbKind()}`);

for (const c of data.categories) {
  await query('INSERT INTO categories (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING', [c.slug, c.name]);
}

let inserted = 0;
for (const p of data.posts) {
  const exists = await queryOne('SELECT id FROM posts WHERE legacy_id = $1', [p.legacy_id]);
  if (exists) continue;
  const r = await queryOne(
    `INSERT INTO posts (legacy_id, slug, title, excerpt, content, word_count, cover_url, cover_thumb, tags, status, publish_at, published_at,
       author_name, created_at, updated_at, seo_title, seo_description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'published',$10,$10,$11,$10,$12,$13,$14) RETURNING id`,
    [p.legacy_id, p.slug, p.title, p.excerpt, p.content, wordCount(p.content), p.cover || null, p.cover_thumb || null,
      JSON.stringify(p.tags || []), withTz(p.date), p.author || 'Equipe Braziw', withTz(p.modified),
      p.title.slice(0, 60), p.excerpt.slice(0, 158)]);
  for (let i = 0; i < p.categories.length; i++) {
    await query(
      'INSERT INTO post_categories (post_id, category_id, position) SELECT $1, id, $3 FROM categories WHERE slug = $2 ON CONFLICT DO NOTHING',
      [r.id, p.categories[i], i]);
  }
  inserted++;
}
console.log(`Artigos novos importados: ${inserted} (total no arquivo: ${data.posts.length})`);

// Administrador inicial: sem senha; gera link de criação de senha.
const email = (process.env.ADMIN_EMAIL || 'admin@braziw.com.br').toLowerCase();
const name = process.env.ADMIN_NAME || 'Administrador';
let admin = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
const forceLink = process.argv.includes('--admin-link');
if (!admin) {
  admin = await queryOne("INSERT INTO users (name, email, role) VALUES ($1, $2, 'admin') RETURNING *", [name, email]);
  console.log(`Administrador criado: ${email}`);
}
if (!admin.password_hash || forceLink) {
  const token = crypto.randomBytes(32).toString('hex');
  await query('DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL', [admin.id]);
  await query(
    "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '48 hours')",
    [admin.id, crypto.createHash('sha256').update(token).digest('hex')]);
  const base = (process.env.SITE_URL || 'http://localhost:3100').replace(/\/$/, '');
  console.log(`\nDefina a senha do administrador (${email}) em até 48h:\n${base}/admin/reset/?token=${token}\n`);
} else {
  console.log(`Administrador ${email} já possui senha. Use --admin-link para gerar um novo link.`);
}
process.exit(0);
