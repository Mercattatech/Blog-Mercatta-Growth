import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { json, route } from '@/lib/api.js';

export const maxDuration = 30;
const MAX_BYTES = 8 * 1024 * 1024;

import { storeBuffer } from '@/lib/storage.js';

/** Recebe uma imagem, normaliza (JPEG, máx. 1400px, sem EXIF) e gera a miniatura de 640px. */
export const POST = route(async ({ req }) => {
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'Nenhum arquivo enviado.' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'A imagem deve ter no máximo 8 MB.' }, 400);
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) return json({ error: 'Envie uma imagem JPG, PNG, WebP, GIF ou AVIF.' }, 400);

  const input = Buffer.from(await file.arrayBuffer());
  let main; let thumb;
  try {
    const base = sharp(input, { failOn: 'error' }).rotate();
    main = await base.clone().resize({ width: 1400, withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    thumb = await base.clone().resize({ width: 640, withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
  } catch {
    return json({ error: 'Não foi possível ler essa imagem.' }, 400);
  }
  const id = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  const url = await storeBuffer(`${id}.jpg`, main);
  const thumbUrl = await storeBuffer(`${id}-sm.jpg`, thumb);
  return json({ url, thumb: thumbUrl });
});
