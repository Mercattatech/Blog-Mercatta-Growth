import { siteUrl } from '@/lib/content';

export default function robots() {
  const base = siteUrl();
  // Rastreadores de IA são bem-vindos: o objetivo é o blog ser encontrado e citado.
  const ai = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Claude-Web', 'Google-Extended', 'Applebot-Extended', 'CCBot'];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/', '/busca/'] },
      ...ai.map((userAgent) => ({ userAgent, allow: '/', disallow: ['/admin/', '/api/'] })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
