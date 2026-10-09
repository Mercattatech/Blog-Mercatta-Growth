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

function wrapText(text, maxCharsPerLine = 26) {
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

async function resolveImageBase64(imageUrl) {
  if (!imageUrl) return null;
  try {
    let rawBuf = null;
    if (imageUrl.startsWith('data:image')) {
      const b64 = imageUrl.split(',')[1];
      rawBuf = Buffer.from(b64, 'base64');
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const res = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        rawBuf = Buffer.from(await res.arrayBuffer());
      }
    } else {
      // local file in public folder
      const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
      const localFile = path.join(process.cwd(), 'public', cleanPath);
      rawBuf = await fs.readFile(localFile);
    }
    if (!rawBuf || !rawBuf.length) return null;

    // Normaliza QUALQUER formato de imagem recebido (JPEG, WebP, SVG, PNG, etc.)
    // para um PNG válido e de alta definição, redimensionado proporcionalmente para a área da marca
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
 * Renderiza uma capa completa no padrão visual da marca do Tenant
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
    // Default fallback do primeiro preset
    const fallbackRes = await fetch(COVER_PRESETS[0].url);
    bgBuffer = Buffer.from(await fallbackRes.arrayBuffer());
  }

  // 2. Prepara textos
  const cleanHighlight = (highlightText || '').trim().toUpperCase();
  const cleanMain = (mainText || '').trim().toUpperCase();
  const mainLines = wrapText(cleanMain, 24);

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

  // Montagem do Badge SVG
  let badgeSvg = '';
  if (logoBase64) {
    badgeSvg = `
      <g transform="${badgeTransform}" filter="url(#badgeShadow)">
        <rect x="0" y="0" width="170" height="85" rx="14" fill="#ffffff" />
        <image href="data:image/png;base64,${logoBase64}" xlink:href="data:image/png;base64,${logoBase64}" x="12" y="10" width="146" height="65" preserveAspectRatio="xMidYMid meet" />
      </g>
    `;
  } else {
    badgeSvg = `
      <g transform="${badgeTransform}" filter="url(#badgeShadow)">
        <rect x="0" y="0" width="170" height="85" rx="14" fill="#ffffff" />
        <rect x="8" y="8" width="154" height="69" rx="10" fill="${escapeXml(primaryColor)}" />
        <text x="85" y="44" font-family="'Outfit', 'Inter', sans-serif" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle" letter-spacing="1">
          ${escapeXml(initials)}
        </text>
        <text x="85" y="62" font-family="'Outfit', 'Inter', sans-serif" font-weight="700" font-size="11" fill="${escapeXml(accentColor)}" text-anchor="middle" letter-spacing="0.5">
          ${escapeXml(brandName.slice(0, 16).toUpperCase())}
        </text>
      </g>
    `;
  }

  // Layout tipográfico
  const totalLines = (cleanHighlight ? 1 : 0) + mainLines.length;
  const startY = totalLines === 1 ? 340 : totalLines === 2 ? 300 : totalLines === 3 ? 260 : 220;

  let currentY = startY;
  const textSvgParts = [];

  // Linha de destaque
  if (cleanHighlight) {
    textSvgParts.push(`
      <text x="75" y="${currentY}" font-size="52" fill="${escapeXml(accentColor)}" letter-spacing="1.5">
        ${escapeXml(cleanHighlight)}
      </text>
    `);
    currentY += 72;
  }

  // Linhas principais
  for (const line of mainLines) {
    textSvgParts.push(`
      <text x="75" y="${currentY}" font-size="46" fill="#ffffff" letter-spacing="0.8">
        ${escapeXml(line)}
      </text>
    `);
    currentY += 60;
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
      <path d="${topTorn}" fill="${escapeXml(primaryColor)}" filter="url(#tornShadow)" />
      <path d="${bottomWhite}" fill="#ffffff" opacity="0.9" />
      <path d="${bottomTorn}" fill="${escapeXml(accentColor)}" filter="url(#tornShadow)" />
    `;
  } else if (template === 'glass') {
    // Estilo Glassmorphism Minimalista
    const boxHeight = (totalLines * 66) + 70;
    const boxY = Math.max(80, startY - 70);
    templateDecorations = `
      <!-- Card translúcido tipo vidro fosco -->
      <g filter="url(#tornShadow)">
        <rect x="50" y="${boxY}" width="820" height="${boxHeight}" rx="20" fill="#080f22" fill-opacity="0.82" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
        <rect x="50" y="${boxY}" width="8" height="${boxHeight}" rx="4" fill="${escapeXml(accentColor)}" />
      </g>
    `;
  } else {
    // Padrão: modern (Moderno SaaS / Corporativo)
    templateDecorations = `
      <!-- Barra sutil superior em degradê da marca -->
      <rect x="0" y="0" width="${width}" height="6" fill="url(#brandTopGrad)" />
      
      <!-- Detalhe decorativo vertical à esquerda do texto -->
      <rect x="55" y="${startY - 42}" width="6" height="${(totalLines * 62) + 20}" rx="3" fill="${escapeXml(accentColor)}" />

      <!-- Linha sutil inferior -->
      <rect x="0" y="670" width="${width}" height="5" fill="${escapeXml(accentColor)}" />
    `;
  }

  const svgOverlay = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <!-- Gradiente escuro para legibilidade máxima do texto à esquerda -->
      <linearGradient id="vignette" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#030712" stop-opacity="0.95" />
        <stop offset="35%" stop-color="#0b1329" stop-opacity="0.85" />
        <stop offset="68%" stop-color="#0f172a" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#0f172a" stop-opacity="0.05" />
      </linearGradient>

      <!-- Gradiente superior com cores do cliente -->
      <linearGradient id="brandTopGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${escapeXml(primaryColor)}" />
        <stop offset="60%" stop-color="${escapeXml(accentColor)}" />
        <stop offset="100%" stop-color="${escapeXml(primaryColor)}" />
      </linearGradient>

      <filter id="tornShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.45" />
      </filter>
      <filter id="badgeShadow">
        <feDropShadow dx="-2" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.45" />
      </filter>
      <filter id="textGlow">
        <feDropShadow dx="2" dy="3" stdDeviation="5" flood-color="#000" flood-opacity="0.95" />
      </filter>
    </defs>

    <!-- Vinheta de alto contraste -->
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#vignette)" />

    <!-- Decorações do Template Escolhido -->
    ${templateDecorations}

    <!-- Selo com Logotipo Oficial do Cliente -->
    ${badgeSvg}

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
    template,
  };
}

// Mantém compatibilidade com chamadas legadas
export const renderBraziwCover = renderPostCover;
