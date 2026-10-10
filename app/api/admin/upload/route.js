import crypto from 'node:crypto';
import sharp from 'sharp';
import { json, route } from '@/lib/api.js';
import { storeBuffer } from '@/lib/storage.js';

export const maxDuration = 30;
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

/** Recebe uma imagem, normaliza (JPEG, máx. 1400px, sem EXIF) e gera a miniatura de 640px. */
export const POST = route(async ({ req }) => {
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'Nenhum arquivo enviado.' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'A imagem deve ter no máximo 12 MB.' }, 400);
  if (!/^image\/(jpeg|jpg|png|webp|gif|avif)$/i.test(file.type)) {
    return json({ error: 'Envie uma imagem JPG, PNG, WebP, GIF ou AVIF.' }, 400);
  }

  const input = Buffer.from(await file.arrayBuffer());
  let main;
  let thumb;
  try {
    const base = sharp(input, { failOn: 'none' }).rotate();
    main = await base.clone().resize({ width: 1400, withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    thumb = await base.clone().resize({ width: 640, withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
  } catch (err) {
    console.error('[upload] Erro ao ler/redimensionar imagem:', err);
    return json({ error: 'Não foi possível ler ou processar essa imagem.' }, 400);
  }

  try {
    const id = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
    const url = await storeBuffer(`${id}.jpg`, main);
    const thumbUrl = await storeBuffer(`${id}-sm.jpg`, thumb);
    return json({ url, thumb: thumbUrl });
  } catch (err) {
    console.error('[upload] Erro ao gravar buffer no storage:', err);
    return json({ error: `Erro ao salvar arquivo: ${err.message}` }, 500);
  }
});
