import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
};

/**
 * Endpoint para servir uploads dinâmicos (capas geradas e manuais)
 * em produção Next.js / Docker sem depender do servidor de arquivos estáticos.
 */
export async function GET(req, ctx) {
  const params = ctx?.params ? await ctx.params : {};
  const rawSegments = params.file || [];
  const segments = (Array.isArray(rawSegments) ? rawSegments : [rawSegments]).filter(Boolean);

  if (!segments.length) {
    return new NextResponse('Arquivo não informado', { status: 404 });
  }

  // Previne Directory Traversal
  const safeName = segments.map((s) => s.replace(/(\.\.[\/\\]|\.\.)/g, '')).join(path.sep);
  const ext = path.extname(safeName).toLowerCase();
  const mime = MIME_MAP[ext] || 'application/octet-stream';

  const candidates = [
    process.env.UPLOAD_DIR ? path.join(process.env.UPLOAD_DIR, safeName) : null,
    path.join(process.cwd(), 'public', 'uploads', safeName),
    path.join(process.cwd(), '.data', 'uploads', safeName),
    path.join('/tmp', 'uploads', safeName),
    path.join(process.cwd(), 'public', safeName),
  ].filter(Boolean);

  for (const filePath of candidates) {
    try {
      const buffer = await fs.readFile(filePath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(buffer.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      continue;
    }
  }

  return new NextResponse('Arquivo não encontrado', { status: 404 });
}
