import { query, queryOne } from './db.js';
import { CAT_ORDER, norm, prepareContent, readingMinutes, slugify, stripHtml, trunc, wordCount } from './content.js';

const CATS = `COALESCE((SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name) ORDER BY pc.position)
  FROM post_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.post_id = p.id), '[]'::json) AS cats`;
const LIST_COLS = 'p.id, p.slug, p.title, p.excerpt, p.cover_url, p.cover_thumb, p.cover_alt, p.publish_at, p.word_count, p.tags, p.status';
// Visível no site: publicado e com a data/hora de publicação já alcançada (permite agendamento).
export const VISIBLE = "p.status = 'published' AND p.publish_at <= now()";

function shape(row) {
  if (!row) return row;
  const cats = row.cats || [];
  return { ...row, cats, cat: cats[0] || null, minutes: readingMinutes(row.word_count) };
}

export async function listVisible({ limit = 12, offset = 0, categorySlug = null } = {}) {
  const params = [limit, offset];
  let join = '', where = VISIBLE;
  if (categorySlug) {
    params.push(categorySlug);
    join = 'JOIN post_categories pcf ON pcf.post_id = p.id JOIN categories cf ON cf.id = pcf.category_id';
    where += ' AND cf.slug = $3';
  }
  const rows = await query(
    `SELECT ${LIST_COLS}, ${CATS} FROM posts p ${join} WHERE ${where} ORDER BY p.publish_at DESC, p.id DESC LIMIT $1 OFFSET $2`, params);
  return rows.map(shape);
}

export async function countVisible(categorySlug = null) {
  if (categorySlug) {
    const r = await queryOne(
      `SELECT count(*)::int AS n FROM posts p JOIN post_categories pc ON pc.post_id = p.id JOIN categories c ON c.id = pc.category_id
       WHERE ${VISIBLE} AND c.slug = $1`, [categorySlug]);
    return r.n;
  }
  return (await queryOne(`SELECT count(*)::int AS n FROM posts p WHERE ${VISIBLE}`)).n;
}

export async function getPostBySlug(slug) {
  const row = await queryOne(`SELECT p.*, ${CATS} FROM posts p WHERE p.slug = $1 AND ${VISIBLE}`, [slug]);
  return shape(row);
}

export async function getRelated(post, n = 3) {
  const ids = (post.cats || []).map((c) => c.id);
  let rows = [];
  if (ids.length) {
    rows = await query(
      `SELECT ${LIST_COLS}, ${CATS} FROM posts p WHERE ${VISIBLE} AND p.id <> $1
       AND EXISTS (SELECT 1 FROM post_categories x WHERE x.post_id = p.id AND x.category_id = ANY($2::int[]))
       ORDER BY abs(extract(epoch FROM (p.publish_at - $3::timestamptz))) ASC LIMIT $4`,
      [post.id, ids, post.publish_at, n]);
  }
  if (rows.length < n) {
    const more = await query(
      `SELECT ${LIST_COLS}, ${CATS} FROM posts p WHERE ${VISIBLE} AND p.id <> ALL($1::int[]) ORDER BY p.publish_at DESC LIMIT $2`,
      [[post.id, ...rows.map((r) => r.id)], n - rows.length]);
    rows = rows.concat(more);
  }
  return rows.map(shape);
}

export async function getAdjacent(post) {
  const older = await queryOne(
    `SELECT p.slug, p.title FROM posts p WHERE ${VISIBLE} AND p.publish_at < $1 ORDER BY p.publish_at DESC LIMIT 1`, [post.publish_at]);
  const newer = await queryOne(
    `SELECT p.slug, p.title FROM posts p WHERE ${VISIBLE} AND p.publish_at > $1 ORDER BY p.publish_at ASC LIMIT 1`, [post.publish_at]);
  return { older, newer };
}

export async function getRecent(n = 5, excludeId = 0) {
  const rows = await query(
    `SELECT ${LIST_COLS}, ${CATS} FROM posts p WHERE ${VISIBLE} AND p.id <> $1 ORDER BY p.publish_at DESC LIMIT $2`, [excludeId, n]);
  return rows.map(shape);
}

export async function getCategories() {
  const rows = await query(
    `SELECT c.id, c.slug, c.name,
       (SELECT count(*)::int FROM post_categories pc JOIN posts p ON p.id = pc.post_id WHERE pc.category_id = c.id AND ${VISIBLE}) AS count
     FROM categories c`);
  return rows.filter((c) => c.count > 0)
    .sort((a, b) => (CAT_ORDER.indexOf(a.slug) + 1 || 99) - (CAT_ORDER.indexOf(b.slug) + 1 || 99) || a.name.localeCompare(b.name));
}

export async function getAllCategories() {
  const rows = await query('SELECT id, slug, name FROM categories');
  return rows.sort((a, b) => (CAT_ORDER.indexOf(a.slug) + 1 || 99) - (CAT_ORDER.indexOf(b.slug) + 1 || 99) || a.name.localeCompare(b.name));
}

export async function getTopTags(n = 18) {
  const rows = await query(
    `SELECT t.tag, count(*)::int AS n FROM posts p, jsonb_array_elements_text(p.tags) AS t(tag)
     WHERE ${VISIBLE} GROUP BY t.tag ORDER BY n DESC, t.tag ASC LIMIT $1`, [n]);
  return rows.map((r) => r.tag);
}

export async function getStats() {
  return queryOne(`SELECT count(*)::int AS posts, min(p.publish_at) AS since FROM posts p WHERE ${VISIBLE}`);
}

let searchCache = { at: 0, data: null };
export async function getSearchIndex() {
  if (searchCache.data && Date.now() - searchCache.at < 60_000) return searchCache.data;
  const rows = await query(
    `SELECT ${LIST_COLS}, p.content, ${CATS} FROM posts p WHERE ${VISIBLE} ORDER BY p.publish_at DESC`);
  const data = rows.map((r) => {
    const cats = r.cats || [];
    return {
      t: r.title, u: `/${r.slug}/`, c: cats[0]?.name || '', d: new Date(r.publish_at).toISOString().slice(0, 10),
      e: trunc(r.excerpt, 130), i: r.cover_thumb || r.cover_url || '',
      k: norm([r.title, (r.tags || []).join(' '), cats.map((c) => c.name).join(' '), stripHtml(r.content).slice(0, 3000)].join(' ')),
    };
  });
  searchCache = { at: Date.now(), data };
  return data;
}

export function resetSearchCache() { searchCache = { at: 0, data: null }; }

/* ---------------------------------------------------------------- admin */

export async function adminListPosts({ user, status = '', q = '', limit = 20, offset = 0 }) {
  const params = [];
  const where = [];
  if (user.role !== 'admin') { params.push(user.id); where.push(`p.author_id = $${params.length}`); }
  if (status === 'scheduled') where.push("p.status = 'published' AND p.publish_at > now()");
  else if (status === 'published') where.push("p.status = 'published' AND p.publish_at <= now()");
  else if (status) { params.push(status); where.push(`p.status = $${params.length}`); }
  if (q) { params.push(`%${q}%`); where.push(`(p.title ILIKE $${params.length} OR p.slug ILIKE $${params.length})`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await queryOne(`SELECT count(*)::int AS n FROM posts p ${w}`, params)).n;
  const rows = await query(
    `SELECT p.id, p.slug, p.title, p.status, p.publish_at, p.updated_at, p.ai_generated, p.author_name, p.cover_thumb, p.cover_url,
       (CASE WHEN p.status = 'published' AND p.publish_at > now() THEN 'scheduled' WHEN p.status = 'published' THEN 'published' ELSE p.status END) AS display_status,
       ${CATS}
     FROM posts p ${w} ORDER BY p.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
  return { total, rows: rows.map(shape) };
}

export async function adminGetPost(id, user) {
  const row = await queryOne(`SELECT p.*, ${CATS} FROM posts p WHERE p.id = $1`, [id]);
  if (!row) return null;
  if (user.role !== 'admin' && row.author_id !== user.id) return null;
  return shape(row);
}

export async function adminCounts(user) {
  const own = user.role === 'admin' ? '' : `WHERE p.author_id = ${Number(user.id)}`;
  const r = await queryOne(`SELECT
      count(*) FILTER (WHERE p.status = 'draft')::int AS draft,
      count(*) FILTER (WHERE p.status = 'pending')::int AS pending,
      count(*) FILTER (WHERE p.status = 'published' AND p.publish_at <= now())::int AS published,
      count(*) FILTER (WHERE p.status = 'published' AND p.publish_at > now())::int AS scheduled
    FROM posts p ${own}`);
  return r;
}

async function uniqueSlug(base, ignoreId) {
  let slug = base || 'artigo'; let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await queryOne('SELECT 1 AS x FROM posts WHERE slug = $1 AND id <> $2', [slug, ignoreId || 0])) slug = `${base}-${n++}`;
  return slug;
}

const asArray = (v) => (Array.isArray(v) ? v : []);
const cleanStr = (v, max = 500) => String(v ?? '').trim().slice(0, max);

/**
 * Cria/atualiza um artigo aplicando as regras de permissão:
 *  - admin: qualquer ação (rascunho, enviar, publicar, agendar, despublicar);
 *  - autor: só rascunho e "enviar para aprovação" nos próprios artigos ainda não publicados.
 */
export async function savePost(input, user, id = null) {
  const isAdmin = user.role === 'admin';
  let existing = null;
  if (id) {
    existing = await queryOne('SELECT * FROM posts WHERE id = $1', [id]);
    if (!existing) throw httpError(404, 'Artigo não encontrado.');
    if (!isAdmin && (existing.author_id !== user.id || existing.status === 'published')) throw httpError(403, 'Você não pode editar este artigo.');
  }
  const title = cleanStr(input.title, 200);
  if (!title) throw httpError(400, 'Informe o título do artigo.');

  const content = prepareContent(input.content);
  const excerpt = cleanStr(input.excerpt, 400) || trunc(stripHtml(content), 170);
  const slug = await uniqueSlug(slugify(input.slug || title).slice(0, 90), id);
  const tags = asArray(input.tags).map((t) => cleanStr(t, 60)).filter(Boolean).slice(0, 15);
  const secondary = asArray(input.secondary_keywords).map((t) => cleanStr(t, 80)).filter(Boolean).slice(0, 10);
  const faq = asArray(input.faq).map((f) => ({ q: cleanStr(f?.q, 300), a: cleanStr(f?.a, 1200) })).filter((f) => f.q && f.a).slice(0, 12);
  let publishAt = input.publish_at ? new Date(input.publish_at) : null;
  if (publishAt && Number.isNaN(publishAt.getTime())) publishAt = null;

  const action = input.action || 'draft';
  let status = existing?.status || 'draft';
  let publishedAt = existing?.published_at || null;
  if (action === 'draft') status = existing?.status === 'published' ? 'published' : 'draft';
  else if (action === 'submit') status = 'pending';
  else if (action === 'unpublish') { if (!isAdmin) throw httpError(403, 'Apenas administradores.'); status = 'draft'; publishedAt = null; }
  else if (action === 'publish') {
    if (!isAdmin) throw httpError(403, 'Apenas administradores podem publicar.');
    status = 'published';
    if (!publishAt) publishAt = existing?.status === 'published' && existing.publish_at && new Date(existing.publish_at) <= new Date() ? existing.publish_at : new Date();
    publishedAt = publishAt;
  } else if (action === 'reject') {
    if (!isAdmin) throw httpError(403, 'Apenas administradores.');
    status = 'draft';
  } else throw httpError(400, 'Ação inválida.');
  if (status === 'published' && !publishAt) publishAt = existing?.publish_at || new Date();

  const values = [
    slug, title, excerpt, content, wordCount(content),
    cleanStr(input.cover_url, 600) || null, cleanStr(input.cover_thumb, 600) || null, cleanStr(input.cover_alt, 200) || null,
    JSON.stringify(tags), status, publishAt, publishedAt,
    cleanStr(input.seo_title, 120) || null, cleanStr(input.seo_description, 320) || null, cleanStr(input.focus_keyword, 100) || null,
    JSON.stringify(secondary), JSON.stringify(faq), Boolean(input.ai_generated ?? existing?.ai_generated),
  ];
  let postId = id;
  if (id) {
    await query(
      `UPDATE posts SET slug=$1, title=$2, excerpt=$3, content=$4, word_count=$5, cover_url=$6, cover_thumb=$7, cover_alt=$8,
        tags=$9::jsonb, status=$10, publish_at=$11, published_at=$12, seo_title=$13, seo_description=$14, focus_keyword=$15,
        secondary_keywords=$16::jsonb, faq=$17::jsonb, ai_generated=$18, updated_at=now() WHERE id=$19`, [...values, id]);
  } else {
    const r = await queryOne(
      `INSERT INTO posts (slug, title, excerpt, content, word_count, cover_url, cover_thumb, cover_alt, tags, status, publish_at, published_at,
        seo_title, seo_description, focus_keyword, secondary_keywords, faq, ai_generated, author_id, author_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19,$20) RETURNING id`,
      [...values, user.id, user.name]);
    postId = r.id;
  }

  // categorias (a primeira é a principal)
  const slugs = asArray(input.category_slugs).map(String);
  await query('DELETE FROM post_categories WHERE post_id = $1', [postId]);
  for (let i = 0; i < slugs.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    await query(
      `INSERT INTO post_categories (post_id, category_id, position) SELECT $1, id, $3 FROM categories WHERE slug = $2 ON CONFLICT DO NOTHING`,
      [postId, slugs[i], i]);
  }
  resetSearchCache();
  return { id: postId, slug, status };
}

export async function deletePost(id, user) {
  const existing = await queryOne('SELECT * FROM posts WHERE id = $1', [id]);
  if (!existing) throw httpError(404, 'Artigo não encontrado.');
  if (user.role !== 'admin' && (existing.author_id !== user.id || existing.status === 'published')) throw httpError(403, 'Sem permissão.');
  await query('DELETE FROM posts WHERE id = $1', [id]);
  resetSearchCache();
  return existing;
}

export function httpError(status, message) {
  const e = new Error(message); e.status = status; return e;
}
