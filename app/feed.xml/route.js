import { listVisible } from '@/lib/posts';
import { siteUrl, stripHtml } from '@/lib/content';

export const revalidate = 300;

const x = (s) => String(s || '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

export async function GET() {
  const base = siteUrl();
  const posts = await listVisible({ limit: 30 }).catch(() => []);
  const items = posts.map((p) => `<item><title>${x(p.title)}</title><link>${base}/${p.slug}/</link><guid isPermaLink="true">${base}/${p.slug}/</guid><pubDate>${new Date(p.publish_at).toUTCString()}</pubDate>${p.cat ? `<category>${x(p.cat.name)}</category>` : ''}<description>${x(stripHtml(p.excerpt))}</description></item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog Braziw — Tudo sobre Francês</title><link>${base}/</link><description>Curiosidades, cultura e dicas de francês da Braziw.</description><language>pt-BR</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
