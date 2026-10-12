import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import opentype from 'opentype.js';
import { COVER_PRESETS, getPresetById, getRandomPresetUrl } from './coverPresets.js';
import { storeBuffer } from './storage.js';
import { suggestCoverWithAI } from './ai.js';
import { getTraining } from './settings.js';

// Realistic organic paper tear paths
function generateRealisticTornPath(width = 1200, baseY = 55, isTop = true) {
  const points = [];
  const segments = 40;
  const dx = width / segments;

  for (let i = 0; i <= segments; i++) {
    const x = i * dx;
    const noise = Math.sin(i * 0.45) * 8 + Math.cos(i * 1.3) * 6 + Math.sin(i * 2.8) * 3 + ((i * 7) % 5);
    const y = isTop ? (baseY + noise) : (baseY - noise);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  if (isTop) {
    return `M 0,0 L ${width},0 L ${width},${points[points.length - 1].split(',')[1]} ` +
      points.reverse().map((p) => `L ${p}`).join(' ') + ` L 0,0 Z`;
  }
  return `M 0,675 L ${width},675 L ${width},${points[points.length - 1].split(',')[1]} ` +
    points.reverse().map((p) => `L ${p}`).join(' ') + ` L 0,675 Z`;
}

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Pilha de fontes compatível com o servidor (librsvg/fontconfig). As fontes Liberation/DejaVu/Noto
// são instaladas no Dockerfile; sem fontes no sistema o texto vira quadradinhos (tofu).
// Aspas simples dentro do atributo são seguras porque o atributo usa aspas duplas.
const COVER_FONT_STACK = "'Liberation Sans', 'DejaVu Sans', 'Noto Sans', Arial, Helvetica, 'Helvetica Neue', sans-serif";

// Fonte embutida no projeto: o texto é convertido em <path> vetorial, sem depender de
// fontes instaladas no servidor (evita os quadradinhos "tofu" no Docker/Alpine).
let coverFontPromise = null;
function loadCoverFont() {
  if (!coverFontPromise) {
    coverFontPromise = (async () => {
      const candidates = [
        path.join(process.cwd(), 'public', 'fonts', 'Montserrat-ExtraBold.ttf'),
        path.join(process.cwd(), 'lib', 'fonts', 'Montserrat-ExtraBold.ttf'),
      ];
      for (const p of candidates) {
        try {
          const buf = await fs.readFile(/*turbopackIgnore: true*/ p);
          return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
        } catch {
          continue;
        }
      }
      console.warn('[covers] fonte embutida não encontrada; usando <text> do sistema.');
      return null;
    })();
  }
  return coverFontPromise;
}

/**
 * Gera o SVG de uma linha de texto. Com a fonte embutida, devolve <path> vetorial
 * (reduzindo o tamanho automaticamente se ultrapassar maxWidth). Sem ela, usa <text>.
 */
function svgTextLine(font, text, { x, y, size, fill, opacity = 1, letterSpacing = 0, anchor = 'start', maxWidth = 0 }) {
  const str = String(text || '');
  if (!str) return '';
  if (!font) {
    return `<text x="${x}" y="${y}" font-family="${COVER_FONT_STACK}" font-weight="bold" font-size="${size}" fill="${fill}" fill-opacity="${opacity}" letter-spacing="${letterSpacing}" text-anchor="${anchor}">${escapeXml(str)}</text>`;
  }
  const glyphs = font.stringToGlyphs(str);
  const measure = (s) => {
    const scale = s / font.unitsPerEm;
    let w = 0;
    glyphs.forEach((g, i) => {
      w += (g.advanceWidth || 0) * scale;
      if (i < glyphs.length - 1) w += font.getKerningValue(g, glyphs[i + 1]) * scale + letterSpacing;
    });
    return w;
  };
  let fontSize = size;
  let width = measure(fontSize);
  if (maxWidth && width > maxWidth) {
    fontSize = Math.max(18, (fontSize * maxWidth) / width);
    width = measure(fontSize);
  }
  const scale = fontSize / font.unitsPerEm;
  let cx = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  let d = '';
  glyphs.forEach((g, i) => {
    d += g.getPath(cx, y, fontSize).toPathData(2);
    cx += (g.advanceWidth || 0) * scale;
    if (i < glyphs.length - 1) cx += font.getKerningValue(g, glyphs[i + 1]) * scale + letterSpacing;
  });
  return `<path d="${d}" fill="${fill}" fill-opacity="${opacity}" />`;
}

function wrapText(text, maxCharsPerLine = 22) {
  const words = (text || '').trim().split(/\s+/);
  if (!words.length || !words[0]) return [];
  const lines = [];
  let current = '';

  for (const w of words) {
    if (!current) {
      current = w;
    } else if ((current + ' ' + w).length <= maxCharsPerLine) {
      current += ' ' + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3); // no máximo 3 linhas
}

async function resolveImageBase64(imageUrl) {
  if (!imageUrl) return null;
  try {
    let rawBuf = null;
    if (imageUrl.startsWith('data:image')) {
      const b64 = imageUrl.split(',')[1];
      rawBuf = Buffer.from(b64, 'base64');
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const res = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000),
      }).catch(() => null);
      if (res && res.ok) {
        rawBuf = Buffer.from(await res.arrayBuffer());
      }
    } else {
      // Arquivo local em public, uploads ou .data
      const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
      const candidates = [
        path.join(process.cwd(), 'public', cleanPath),
        path.join(process.cwd(), '.data', cleanPath),
        path.join('/tmp', cleanPath),
      ];
      for (const p of candidates) {
        try {
          rawBuf = await fs.readFile(/*turbopackIgnore: true*/ p);
          if (rawBuf?.length) break;
        } catch {
          continue;
        }
      }
    }
    if (!rawBuf || !rawBuf.length) return null;

    // Normaliza QUALQUER formato de imagem recebido para PNG de alta definição
    const pngBuf = await sharp(rawBuf)
      .resize(146, 65, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return pngBuf.toString('base64');
  } catch (err) {
    console.warn('[covers] failed to resolve logo image:', imageUrl, err.message);
    return null;
  }
}

/**
 * Mapeia palavras-chave e tópicos para termos de busca fotográfica de alta relevância
 */
function buildSearchKeywords({ title = '', focusKeyword = '', categorySlug = '', customCoverPrompt = '' }) {
  const text = `${title} ${focusKeyword} ${categorySlug} ${customCoverPrompt}`.toLowerCase();

  let baseQuery = '';
  if (/carro|ve[ií]culo|frota|loca[cç][aã]o|rent|autom[oó]vel|transporte|motorista|aluguel/.test(text)) {
    baseQuery = 'commercial vehicle fleet car rental modern transportation';
  } else if (/idioma|ingl[eê]s|franc[eê]s|espanhol|aula|escola|interc[aâ]mbio|curso|aluno|professor/.test(text)) {
    baseQuery = 'students learning classroom language school teacher conversation';
  } else if (/advocac|jur[ií]dic|direito|lei|tribut[aá]ri|compliance|processo|advogad/.test(text)) {
    baseQuery = 'corporate legal office attorney law firm boardroom meeting';
  } else if (/sa[uú]de|m[eé]dic|cl[ií]nica|hospital|paciente|doutor|terapia|bem-estar/.test(text)) {
    baseQuery = 'medical clinic healthcare doctor patient consultation modern hospital';
  } else if (/esg|sustentab|meio ambiente|verde|energia|solar|recicla|ecol[oó]gic/.test(text)) {
    baseQuery = 'sustainability renewable energy solar clean green technology corporate esg';
  } else if (/finan[cç]|invest|dinheiro|cont[aá]bil|economia|lucro|banco|cr[eé]dito/.test(text)) {
    baseQuery = 'financial analytics corporate finance investment bank market economy';
  } else if (/intelig[eê]ncia artificial|ia|tecnolog|software|saas|nuvem|ciber|dados|algoritmo/.test(text)) {
    baseQuery = 'modern technology artificial intelligence software cloud servers data';
  } else if (/marketing|venda|seo|conte[uú]do|lead|tr[aá]fego|growth|an[uú]ncio/.test(text)) {
    baseQuery = 'business marketing digital agency strategy creative boardroom';
  } else if (/lideran[cç]a|gest[aã]o|equipe|carreira|rh|empresa|executiv|trabalho/.test(text)) {
    baseQuery = 'corporate leadership business team meeting executive boardroom collaboration';
  } else if (/restaurante|caf[eé]|comida|gourmet|gastronomia|culin[aá]ria/.test(text)) {
    baseQuery = 'modern artisan coffee gourmet restaurant hospitality dining';
  } else if (/im[oó]vel|imobili[aá]r|constru[cç][aã]o|arquitetura|casa|apartamento/.test(text)) {
    baseQuery = 'modern architecture luxury building real estate interior';
  } else {
    const cleanFk = focusKeyword.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    if (cleanFk && cleanFk.length > 3) {
      baseQuery = cleanFk;
    } else {
      const titleWords = title
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 4)
        .join(' ');
      baseQuery = titleWords || 'corporate business innovation';
    }
  }

  return `${baseQuery} professional editorial photography -cartoon -illustration -drawing -clipart -anime`;
}

/**
 * Busca uma imagem de fundo de alta definição contextualizada com o artigo.
 * Garante que cada artigo receba uma imagem diferente através de um pool dinâmico e indexação por seed.
 */
export async function fetchContextualCoverImage({
  title = '',
  excerpt = '',
  categorySlug = '',
  focusKeyword = '',
  tenant = {},
  customCoverPrompt = '',
}) {
  const query = buildSearchKeywords({ title, focusKeyword, categorySlug, customCoverPrompt });

  // 1. Tenta buscar imagens de alta definição via DuckDuckGo Images
  try {
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (tokenRes.ok) {
      const html = await tokenRes.text();
      const vqdMatch = html.match(/vqd=([0-9-]+)/);
      if (vqdMatch && vqdMatch[1]) {
        const vqd = vqdMatch[1];
        const imgApiUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&o=json&p=1&s=0&u=bing&f=,,,type:photo,,&l=wt-wt`;

        const imgRes = await fetch(imgApiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (imgRes.ok) {
          const data = await imgRes.json().catch(() => null);
          const results = (data?.results || []).filter((r) => r.image && typeof r.image === 'string');

          if (results.length > 0) {
            // Gera um deslocamento baseado no título + timestamp para NUNCA repetir a mesma foto
            const seed = Math.abs(
              title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + Date.now() + crypto.randomInt(1, 1000)
            );
            const poolSize = Math.min(results.length, 25);
            const startIdx = seed % poolSize;

            // Testa até 4 candidatos da lista para achar uma imagem válida e rápida
            for (let i = 0; i < Math.min(4, results.length); i++) {
              const candidate = results[(startIdx + i) % results.length];
              if (!candidate?.image) continue;

              try {
                const imgFetch = await fetch(candidate.image, {
                  headers: { 'User-Agent': 'Mozilla/5.0' },
                  signal: AbortSignal.timeout(4500),
                });

                if (imgFetch.ok) {
                  const buf = Buffer.from(await imgFetch.arrayBuffer());
                  // Valida integridade do buffer com Sharp
                  if (buf && buf.length > 15000) {
                    const meta = await sharp(buf).metadata();
                    if (meta.width && meta.height && meta.width >= 500 && meta.height >= 280) {
                      return buf;
                    }
                  }
                }
              } catch {
                // Tenta próximo candidato
                continue;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[covers] Busca contextual online indisponível, usando biblioteca temática:', err.message);
  }

  // 2. Fallback temático refinado com presets diversificados da categoria
  const text = `${title} ${focusKeyword} ${categorySlug}`.toLowerCase();
  let matchedPresetId = 'tech_innovation';

  if (/carro|ve[ií]culo|frota|loca[cç][aã]o|rent/.test(text)) matchedPresetId = 'automotive_fleet';
  else if (/idioma|ingl[eê]s|franc[eê]s|escola|ensino/.test(text)) matchedPresetId = 'education_languages';
  else if (/advocac|jur[ií]dic|direito|tribut[aá]ri/.test(text)) matchedPresetId = 'consulting_legal';
  else if (/esg|sustentab|verde|energia/.test(text)) matchedPresetId = 'nature_sustainability';
  else if (/finan[cç]|invest|dinheiro|cont[aá]bil/.test(text)) matchedPresetId = 'finance_analytics';
  else if (/marketing|venda|com[eé]rcio|loja/.test(text)) matchedPresetId = 'retail_commerce';
  else if (/lideran[cç]a|gest[aã]o|rh|equipe/.test(text)) matchedPresetId = 'corporate_leadership';
  else if (/caf[eé]|ideia|cultura|estilo/.test(text)) matchedPresetId = 'bistro_coffee';
  else if (/crescimento|mercado|cidade/.test(text)) matchedPresetId = 'urban_growth';

  const randomSeed = crypto.randomInt(1, 100);
  return getRandomPresetUrl(matchedPresetId, randomSeed);
}

/**
 * Renderiza uma capa completa no padrão visual da marca do Tenant
 * Garantindo legibilidade, contraste e textos de impacto nítidos
 */
export async function renderPostCover({
  bgSource,
  highlightText = '',
  mainText = '',
  template = 'modern',
  badgePos = 'bottom-right',
  tenant = {},
}) {
  const width = 1200;
  const height = 675;

  // Cores dinâmicas da marca
  const primaryColor = tenant?.primary_color || '#0f172a';
  const accentColor = tenant?.accent_color || '#3b82f6';
  const brandName = tenant?.name || 'Mercatta Growth';

  // 1. Resolve imagem de fundo (Buffer, Preset ID, ou URL)
  let bgBuffer = null;

  if (Buffer.isBuffer(bgSource)) {
    try {
      const meta = await sharp(bgSource).metadata();
      if (meta.width && meta.height) {
        bgBuffer = bgSource;
      }
    } catch {
      bgBuffer = null;
    }
  } else if (typeof bgSource === 'string' && bgSource.startsWith('data:image')) {
    try {
      const base64Data = bgSource.split(',')[1];
      const buf = Buffer.from(base64Data, 'base64');
      const meta = await sharp(buf).metadata();
      if (meta.width && meta.height) bgBuffer = buf;
    } catch {
      bgBuffer = null;
    }
  } else {
    // É ID de preset ou URL HTTP
    const preset = COVER_PRESETS.find((p) => p.id === bgSource || p.url === bgSource);
    const targetUrl = preset ? preset.url : (typeof bgSource === 'string' && bgSource.startsWith('http') ? bgSource : null);

    if (targetUrl) {
      try {
        const res = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000),
        }).catch(() => null);
        if (res && res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const meta = await sharp(buf).metadata();
          if (meta.width && meta.height) bgBuffer = buf;
        }
      } catch (err) {
        console.warn('[covers] Falha ao carregar a imagem de fundo:', targetUrl, err.message);
      }
    }
  }

  // Fallback caso o fundo externo não tenha carregado: tenta o preset padrão ou alternativo
  if (!bgBuffer) {
    const fallbackUrls = [
      COVER_PRESETS[0]?.url,
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85',
    ];
    for (const fbUrl of fallbackUrls) {
      if (!fbUrl) continue;
      try {
        const fallbackRes = await fetch(fbUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(6000),
        }).catch(() => null);
        if (fallbackRes && fallbackRes.ok) {
          const buf = Buffer.from(await fallbackRes.arrayBuffer());
          const meta = await sharp(buf).metadata();
          if (meta.width && meta.height) {
            bgBuffer = buf;
            break;
          }
        }
      } catch {
        continue;
      }
    }
  }

  // Fallback definitivo: se não houver internet, gera um canvas gradiente radial impecável da marca
  if (!bgBuffer) {
    const svgBackdrop = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="mesh" cx="75%" cy="25%" r="75%">
            <stop offset="0%" stop-color="${escapeXml(accentColor)}" stop-opacity="0.65" />
            <stop offset="55%" stop-color="${escapeXml(primaryColor)}" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#020617" stop-opacity="1" />
          </radialGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#mesh)" />
      </svg>
    `;
    bgBuffer = await sharp(Buffer.from(svgBackdrop)).jpeg().toBuffer();
  }

  // 2. Prepara e garante os textos (NUNCA permite capa sem texto)
  let cleanHighlight = (highlightText || '').trim().toUpperCase();
  let cleanMain = (mainText || '').trim().toUpperCase();

  if (!cleanHighlight && !cleanMain) {
    cleanHighlight = (tenant?.name || 'MERCATTA').toUpperCase();
    cleanMain = 'ARTIGO EM DESTAQUE';
  } else if (!cleanHighlight && cleanMain) {
    const words = cleanMain.split(/\s+/);
    if (words.length > 2) {
      const splitIdx = Math.min(3, Math.max(1, Math.floor(words.length / 3)));
      cleanHighlight = words.slice(0, splitIdx).join(' ');
      cleanMain = words.slice(splitIdx).join(' ');
    } else {
      cleanHighlight = (tenant?.name || 'MERCATTA').toUpperCase();
    }
  } else if (cleanHighlight && !cleanMain) {
    cleanMain = cleanHighlight;
    cleanHighlight = (tenant?.name || 'MERCATTA').toUpperCase();
  }

  const mainLines = wrapText(cleanMain, 22);

  // 3. Resolve logo do cliente
  let logoBase64 = null;
  if (tenant?.logo_url) {
    logoBase64 = await resolveImageBase64(tenant.logo_url);
  }
  // Se for braziw e não tiver logo customizado, tenta o /img/logo.png
  if (!logoBase64 && tenant?.slug === 'braziw') {
    logoBase64 = await resolveImageBase64('/img/logo.png');
  }

  // Posição do Badge da Marca
  const isTopLeft = badgePos === 'top-left';
  const badgeX = isTopLeft ? 80 : 990;
  const badgeY = isTopLeft ? 40 : 540;
  const badgeTransform = `translate(${badgeX}, ${badgeY})`;

  // Iniciais da marca para fallback caso não tenha imagem de logo
  const initials = brandName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'M';
  const coverFont = await loadCoverFont();

  // Montagem do Badge SVG
  let badgeSvg = '';
  if (logoBase64) {
    badgeSvg = `
      <g transform="${badgeTransform}">
        <!-- Sombra do Badge -->
        <rect x="2" y="4" width="170" height="85" rx="14" fill="#000000" fill-opacity="0.4" />
        <rect x="0" y="0" width="170" height="85" rx="14" fill="#ffffff" />
        <image href="data:image/png;base64,${logoBase64}" xlink:href="data:image/png;base64,${logoBase64}" x="12" y="10" width="146" height="65" preserveAspectRatio="xMidYMid meet" />
      </g>
    `;
  } else {
    badgeSvg = `
      <g transform="${badgeTransform}">
        <rect x="2" y="4" width="170" height="85" rx="14" fill="#000000" fill-opacity="0.4" />
        <rect x="0" y="0" width="170" height="85" rx="14" fill="#ffffff" />
        <rect x="8" y="8" width="154" height="69" rx="10" fill="${escapeXml(primaryColor)}" />
        ${svgTextLine(coverFont, initials, { x: 85, y: 44, size: 24, fill: '#ffffff', letterSpacing: 1, anchor: 'middle', maxWidth: 140 })}
        ${svgTextLine(coverFont, brandName.slice(0, 16).toUpperCase(), { x: 85, y: 62, size: 11, fill: escapeXml(accentColor), letterSpacing: 0.5, anchor: 'middle', maxWidth: 140 })}
      </g>
    `;
  }

  // 4. Layout tipográfico refinado com sombra vetorial de alta definição
  const totalLines = (cleanHighlight ? 1 : 0) + mainLines.length;
  const startY = totalLines === 1 ? 340 : totalLines === 2 ? 300 : totalLines === 3 ? 255 : 210;

  // Ajuste proporcional do tamanho da fonte para não estourar em frases longas
  const hlFontSize = cleanHighlight.length > 26 ? 38 : cleanHighlight.length > 18 ? 44 : 50;
  const mainFontSize = mainLines.some((l) => l.length > 20) ? 40 : 46;

  let currentY = startY;
  const textSvgParts = [];

  // Largura máxima do texto (evita invadir o selo da marca / borda direita)
  const textMaxWidth = 1000;

  // Linha de destaque com cor de acento da marca + sombra vetorial preta
  if (cleanHighlight) {
    textSvgParts.push(
      svgTextLine(coverFont, cleanHighlight, { x: 77, y: currentY + 2, size: hlFontSize, fill: '#000000', opacity: 0.9, letterSpacing: 1.5, maxWidth: textMaxWidth }),
      svgTextLine(coverFont, cleanHighlight, { x: 75, y: currentY, size: hlFontSize, fill: escapeXml(accentColor), letterSpacing: 1.5, maxWidth: textMaxWidth }),
    );
    currentY += Math.round(hlFontSize * 1.35);
  }

  // Linhas principais brancas com sombra vetorial reforçada
  for (const line of mainLines) {
    textSvgParts.push(
      svgTextLine(coverFont, line, { x: 77, y: currentY + 2, size: mainFontSize, fill: '#000000', opacity: 0.9, letterSpacing: 0.8, maxWidth: textMaxWidth }),
      svgTextLine(coverFont, line, { x: 75, y: currentY, size: mainFontSize, fill: '#ffffff', letterSpacing: 0.8, maxWidth: textMaxWidth }),
    );
    currentY += Math.round(mainFontSize * 1.25);
  }

  // Elementos do Template selecionado
  let templateDecorations = '';

  if (template === 'editorial') {
    // Estilo Editorial Bold: Faixas diagonais angulares da marca
    templateDecorations = `
      <!-- Faixa angular superior -->
      <polygon points="0,0 480,0 380,48 0,48" fill="${escapeXml(primaryColor)}" opacity="0.95" />
      <polygon points="0,48 380,48 350,56 0,56" fill="${escapeXml(accentColor)}" />

      <!-- Faixa angular inferior -->
      <polygon points="0,675 1200,675 1200,655 0,665" fill="${escapeXml(accentColor)}" />
      <polygon points="0,675 750,675 680,620 0,620" fill="${escapeXml(primaryColor)}" opacity="0.95" />
      <polygon points="0,620 680,620 660,612 0,612" fill="${escapeXml(accentColor)}" />
    `;
  } else if (template === 'torn') {
    // Estilo Rasgo Orgânico com as cores da marca do cliente
    const topTorn = generateRealisticTornPath(width, 48, true);
    const topWhite = generateRealisticTornPath(width, 53, true);
    const bottomTorn = generateRealisticTornPath(width, 625, false);
    const bottomWhite = generateRealisticTornPath(width, 620, false);

    templateDecorations = `
      <path d="${topWhite}" fill="#ffffff" opacity="0.9" />
      <path d="${topTorn}" fill="${escapeXml(primaryColor)}" />
      <path d="${bottomWhite}" fill="#ffffff" opacity="0.9" />
      <path d="${bottomTorn}" fill="${escapeXml(accentColor)}" />
    `;
  } else if (template === 'glass') {
    // Estilo Glassmorphism Minimalista
    const boxHeight = (totalLines * 66) + 70;
    const boxY = Math.max(80, startY - 70);
    templateDecorations = `
      <rect x="52" y="${boxY + 4}" width="820" height="${boxHeight}" rx="20" fill="#000000" fill-opacity="0.5" />
      <rect x="50" y="${boxY}" width="820" height="${boxHeight}" rx="20" fill="#080f22" fill-opacity="0.84" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
      <rect x="50" y="${boxY}" width="8" height="${boxHeight}" rx="4" fill="${escapeXml(accentColor)}" />
    `;
  } else {
    // Padrão: modern (Moderno SaaS / Corporativo)
    const barHeight = (totalLines * 62) + 20;
    templateDecorations = `
      <!-- Barra superior em degradê da marca -->
      <rect x="0" y="0" width="${width}" height="6" fill="url(#brandTopGrad)" />
      
      <!-- Detalhe decorativo vertical à esquerda do texto -->
      <rect x="55" y="${startY - 42}" width="6" height="${barHeight}" rx="3" fill="${escapeXml(accentColor)}" />

      <!-- Linha sutil inferior -->
      <rect x="0" y="670" width="${width}" height="5" fill="${escapeXml(accentColor)}" />
    `;
  }

  const svgOverlay = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <!-- Gradiente escuro para legibilidade máxima do texto à esquerda -->
      <linearGradient id="vignette" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#020617" stop-opacity="0.96" />
        <stop offset="35%" stop-color="#0b1329" stop-opacity="0.88" />
        <stop offset="65%" stop-color="#0f172a" stop-opacity="0.45" />
        <stop offset="100%" stop-color="#0f172a" stop-opacity="0.08" />
      </linearGradient>

      <!-- Gradiente superior com cores do cliente -->
      <linearGradient id="brandTopGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${escapeXml(primaryColor)}" />
        <stop offset="60%" stop-color="${escapeXml(accentColor)}" />
        <stop offset="100%" stop-color="${escapeXml(primaryColor)}" />
      </linearGradient>
    </defs>

    <!-- Vinheta de alto contraste -->
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#vignette)" />

    <!-- Decorações do Template Escolhido -->
    ${templateDecorations}

    <!-- Selo com Logotipo Oficial do Cliente -->
    ${badgeSvg}

    <!-- Tipografia oficial com sombra vetorial pura e família de fontes universal -->
    <g font-family="${COVER_FONT_STACK}" font-weight="bold" text-anchor="start">
      ${textSvgParts.join('')}
    </g>
  </svg>
  `;

  // 5. Composita com Sharp
  const baseImg = sharp(bgBuffer, { failOn: 'none' }).rotate();
  const mainBuffer = await baseImg
    .clone()
    .resize(width, height, { fit: 'cover', position: 'center' })
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  const thumbBuffer = await sharp(mainBuffer)
    .resize(640, 360, { fit: 'cover' })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  // 6. Salva no storage (Local ou Vercel Blob)
  const id = `cover-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  const url = await storeBuffer(`${id}.jpg`, mainBuffer);
  const thumb = await storeBuffer(`${id}-sm.jpg`, thumbBuffer);

  return {
    url,
    thumb,
    highlight_text: cleanHighlight,
    main_text: cleanMain,
    width,
    height,
    template,
  };
}

/**
 * Gera automaticamente uma capa temática completa e oficial para um artigo
 * utilizando IA para sintetizar textos de impacto, busca contextual para imagem exclusiva
 * e renderização gráfica da marca do Tenant
 */
export async function generateAutoCoverForPost({
  title = '',
  excerpt = '',
  categorySlug = '',
  focusKeyword = '',
  tenant = {},
  customCoverPrompt = '',
}) {
  let highlight = (focusKeyword || tenant?.name || 'MERCATTA').toUpperCase();
  let main = (title || 'ARTIGO ESPECIAL').toUpperCase();
  let altText = `${title} - ${tenant?.name || 'Mercatta'}`;

  // Se não foi passado no parâmetro, busca do treinamento do tenant
  let effectivePrompt = customCoverPrompt;
  if (!effectivePrompt && tenant?.id) {
    try {
      const training = await getTraining(tenant.id);
      if (training?.cover_prompt) {
        effectivePrompt = training.cover_prompt;
      }
    } catch {
      // Ignora erro
    }
  }

  // 1. Tenta sintetizar textos de impacto com IA
  try {
    const coverPrompt = await suggestCoverWithAI({
      title,
      excerpt,
      category_name: categorySlug,
      tenant,
      customCoverPrompt: effectivePrompt,
    });
    if (coverPrompt?.highlight_text) highlight = String(coverPrompt.highlight_text).toUpperCase();
    if (coverPrompt?.main_text) main = String(coverPrompt.main_text).toUpperCase();
    if (coverPrompt?.cover_alt) altText = coverPrompt.cover_alt;
  } catch (err) {
    console.warn('[covers] suggestCoverWithAI falhou, usando heurística local:', err.message);
    const words = (title || '').trim().split(/\s+/);
    if (words.length > 2) {
      const splitIdx = Math.min(3, Math.max(1, Math.floor(words.length / 3)));
      highlight = words.slice(0, splitIdx).join(' ').toUpperCase();
      main = words.slice(splitIdx).join(' ').toUpperCase();
    }
  }

  // 2. Obtém imagem de fundo dinâmica, exclusiva e contextualizada para este artigo específico
  let backgroundSource = null;
  try {
    backgroundSource = await fetchContextualCoverImage({
      title,
      excerpt,
      categorySlug,
      focusKeyword,
      tenant,
      customCoverPrompt: effectivePrompt,
    });
  } catch (e) {
    console.warn('[covers] Falha ao obter imagem contextualizada:', e.message);
  }

  // 3. Renderiza a capa oficial com a marca, textos e logotipo (NUNCA retorna capa sem texto)
  const coverResult = await renderPostCover({
    bgSource: backgroundSource || 'tech_innovation',
    highlightText: highlight,
    mainText: main,
    template: 'modern',
    badgePos: 'bottom-right',
    tenant,
  });

  return {
    url: coverResult.url,
    thumb: coverResult.thumb,
    alt: altText,
  };
}

// Mantém compatibilidade com chamadas legadas
export const renderBraziwCover = renderPostCover;
