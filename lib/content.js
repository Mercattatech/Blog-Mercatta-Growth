import sanitizeHtml from 'sanitize-html';

export const SITE_NAME = 'Blog Braziw';
export const TAGLINE = 'Tudo sobre Francês';
export const MAIN_SITE = 'https://braziw.com.br';
export const PER_PAGE = 12;

export const CAT_ICONS = {
  curiosidade: '✨', 'curiosidades-da-europa': '🗼', 'dicas-de-frances': '💬',
  'sobre-o-idioma-frances': '📖', uncategorized: '🌍', 'dating-tips': '🥐',
};
export const CAT_ORDER = ['curiosidade', 'curiosidades-da-europa', 'sobre-o-idioma-frances', 'dicas-de-frances', 'dating-tips', 'uncategorized'];

export function siteUrl() {
  return (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3100')).replace(/\/$/, '');
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function fdate(value, short = false) {
  const d = new Date(value);
  // exibe sempre no fuso de Brasília
  const parts = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const day = get('day'), month = get('month'), year = get('year');
  if (short) return `${String(day).padStart(2, '0')} ${MONTHS[month - 1].slice(0, 3)} ${year}`;
  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}

export function isoDay(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export function slugify(s) {
  return String(s || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#8217;|&#039;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"').replace(/&hellip;/g, '…').replace(/\s+/g, ' ').trim();
}

export function trunc(s, n) {
  s = String(s || '');
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, '').replace(/[ ,.;:\-–]+$/, '') + '…';
}

export const wordCount = (html) => { const t = stripHtml(html); return t ? t.split(' ').length : 0; };
export const readingMinutes = (words) => Math.max(1, Math.ceil((words || 0) / 200));

const ALLOWED = {
  allowedTags: ['h2', 'h3', 'h4', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub', 'code', 'pre', 'div', 'details', 'summary'],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    h2: ['id'], h3: ['id'], h4: ['id'],
    div: ['class'], figure: ['class'],
    td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'],
  },
  allowedClasses: { div: ['callout', 'quick-answer', 'table-wrap'], figure: ['wp-block-image'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  transformTags: {
    h1: 'h2',
    b: 'strong',
    a: (tag, attribs) => {
      const href = attribs.href || '';
      const external = /^https?:\/\//i.test(href) && !href.includes('braziw.com.br');
      return { tagName: 'a', attribs: { ...attribs, ...(external ? { rel: 'noopener noreferrer', target: '_blank' } : { rel: attribs.rel }) } };
    },
  },
};

/** Limpa o HTML do editor/IA (anti-XSS), adiciona ids nos títulos e devolve também o sumário. */
export function prepareContent(html) {
  let clean = sanitizeHtml(String(html || ''), ALLOWED);
  clean = clean.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/g, '');
  const used = new Set();
  clean = clean.replace(/<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/g, (m, lvl, attrs, inner) => {
    const text = stripHtml(inner);
    if (!text) return m;
    let id = slugify(text).slice(0, 60) || 'secao';
    const base = id; let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    return `<h${lvl}${attrs.replace(/\sid="[^"]*"/, '')} id="${id}">${inner}</h${lvl}>`;
  });
  return clean.trim();
}

export function extractToc(html) {
  const toc = [];
  String(html || '').replace(/<h([23])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g, (m, lvl, id, inner) => {
    toc.push({ level: lvl, id, text: trunc(stripHtml(inner), 80) });
    return m;
  });
  return toc;
}

export function norm(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
