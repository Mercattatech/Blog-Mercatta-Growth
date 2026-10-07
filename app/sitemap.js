import { query } from '@/lib/db';
import { getAllCategories, VISIBLE } from '@/lib/posts';
import { siteUrl } from '@/lib/content';

export const revalidate = 300;

export default async function sitemap() {
  const base = siteUrl();
  try {
    const posts = await query(`SELECT p.slug, p.updated_at FROM posts p WHERE ${VISIBLE} ORDER BY p.publish_at DESC`);
    const cats = await getAllCategories();
    return [
      { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
      ...cats.map((c) => ({ url: `${base}/categoria/${c.slug}/`, changeFrequency: 'weekly', priority: 0.7 })),
      ...posts.map((p) => ({ url: `${base}/${p.slug}/`, lastModified: p.updated_at, changeFrequency: 'monthly', priority: 0.8 })),
    ];
  } catch {
    return [{ url: `${base}/` }];
  }
}
