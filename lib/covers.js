import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { COVER_PRESETS } from './coverPresets.js';
import { storeBuffer } from './storage.js';

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

function wrapText(text, maxCharsPerLine = 28) {
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
  return lines.slice(0, 3); // max 3 lines
}

let cachedLogoBase64 = null;
async function getLogoBase64() {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const p = path.join(process.cwd(), 'public', 'img', 'logo.png');
    const b = await fs.readFile(p);
    cachedLogoBase64 = b.toString('base64');
    return cachedLogoBase64;
  } catch {
    return '';
  }
}

/**
 * Renderiza uma capa completa no padrão visual do Blog Braziw
 */
export async function renderBraziwCover({
  bgSource,
  highlightText = '',
  mainText = '',
  template = 'classic_torn',
  badgePos = 'bottom-right',
}) {
  const width = 1200;
  const height = 675;

  // 1. Resolve imagem de fundo (Preset, URL, ou Buffer)
  let bgBuffer;
  const preset = COVER_PRESETS.find((p) => p.id === bgSource || p.url === bgSource);
  const targetUrl = preset ? preset.url : (typeof bgSource === 'string' && bgSource.startsWith('http') ? bgSource : null);

  if (targetUrl) {
    const res = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Falha ao carregar a imagem de fundo (${res.status})`);
    bgBuffer = Buffer.from(await res.arrayBuffer());
  } else if (Buffer.isBuffer(bgSource)) {
    bgBuffer = bgSource;
  } else if (typeof bgSource === 'string' && bgSource.startsWith('data:image')) {
    const base64Data = bgSource.split(',')[1];
    bgBuffer = Buffer.from(base64Data, 'base64');
  } else {
    // Default fallback: bistrô em Paris
    const fallbackRes = await fetch(COVER_PRESETS[0].url);
    bgBuffer = Buffer.from(await fallbackRes.arrayBuffer());
  }

  // 2. Prepara textos
  const cleanHighlight = (highlightText || '').trim().toUpperCase();
  const cleanMain = (mainText || '').trim().toUpperCase();
  const mainLines = wrapText(cleanMain, 24);

  // 3. Monta elementos SVG
  const topBlue = generateRealisticTornPath(width, 48, true);
  const topWhite = generateRealisticTornPath(width, 53, true);
  const bottomRed = generateRealisticTornPath(width, 625, false);
  const bottomWhite = generateRealisticTornPath(width, 620, false);
  const logoBase64 = await getLogoBase64();

  const badgeTransform = badgePos === 'top-left'
    ? 'translate(115, 115)'
    : 'translate(1095, 580)';

  // Calcula posicionamento vertical para centralizar bem o texto
  const totalLines = (cleanHighlight ? 1 : 0) + mainLines.length;
  const startY = totalLines === 1 ? 340 : totalLines === 2 ? 310 : totalLines === 3 ? 270 : 230;

  let currentY = startY;
  const textSvgParts = [];

  if (cleanHighlight) {
    textSvgParts.push(`
      <text x="65" y="${currentY}" font-size="56" fill="#fdb813" letter-spacing="1.5">
        ${escapeXml(cleanHighlight)}
      </text>
    `);
    currentY += 70;
  }

  for (const line of mainLines) {
    textSvgParts.push(`
      <text x="65" y="${currentY}" font-size="48" fill="#ffffff" letter-spacing="0.8">
        ${escapeXml(line)}
      </text>
    `);
    currentY += 62;
  }

  const svgOverlay = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Gradiente escuro para legibilidade máxima do texto à esquerda -->
      <linearGradient id="vignette" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#05102a" stop-opacity="0.94" />
        <stop offset="35%" stop-color="#07173e" stop-opacity="0.82" />
        <stop offset="65%" stop-color="#0a1a44" stop-opacity="0.32" />
        <stop offset="100%" stop-color="#0a1a44" stop-opacity="0.0" />
      </linearGradient>
      <filter id="tornShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.45" />
      </filter>
      <filter id="badgeShadow">
        <feDropShadow dx="-2" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.4" />
      </filter>
      <filter id="textGlow">
        <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.85" />
      </filter>
    </defs>

    <!-- Vinheta de alto contraste -->
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#vignette)" />

    <!-- Rasgos de papel (Tricolore) -->
    <path d="${topWhite}" fill="#ffffff" opacity="0.9" />
    <path d="${topBlue}" fill="#0055a5" filter="url(#tornShadow)" />
    <path d="${bottomWhite}" fill="#ffffff" opacity="0.9" />
    <path d="${bottomRed}" fill="#ed2939" filter="url(#tornShadow)" />

    <!-- Selo circular com logotipo Braziw -->
    <g transform="${badgeTransform}" filter="url(#badgeShadow)">
      <circle cx="0" cy="0" r="82" fill="#ffffff" />
      ${logoBase64 ? `<image href="data:image/png;base64,${logoBase64}" x="-55" y="-50" width="110" height="100" preserveAspectRatio="xMidYMid meet" />` : ''}
    </g>

    <!-- Tipografia oficial com sombra reforçada -->
    <g font-family="Impact, 'Arial Black', Outfit, sans-serif" font-weight="900" filter="url(#textGlow)" text-anchor="start">
      ${textSvgParts.join('')}
    </g>
  </svg>
  `;

  // 4. Composita com Sharp
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

  // 5. Salva no storage (Local ou Vercel Blob)
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
  };
}
