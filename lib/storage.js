import path from 'node:path';
import fs from 'node:fs/promises';

let cachedUploadDir = null;

export async function getUploadDir() {
  if (cachedUploadDir) return cachedUploadDir;

  const candidates = [
    process.env.UPLOAD_DIR,
    path.join(process.cwd(), 'public', 'uploads'),
    path.join(process.cwd(), '.data', 'uploads'),
    path.join('/tmp', 'uploads'),
  ].filter(Boolean);

  for (const dir of candidates) {
    try {
      await fs.mkdir(dir, { recursive: true });
      const testFile = path.join(dir, `.writable-test-${Date.now()}`);
      await fs.writeFile(testFile, 'ok');
      await fs.unlink(testFile);
      cachedUploadDir = dir;
      return dir;
    } catch (e) {
      // Tenta o próximo candidato se não tiver permissão de escrita
      continue;
    }
  }

  const fallback = path.join('/tmp', 'uploads');
  await fs.mkdir(fallback, { recursive: true });
  cachedUploadDir = fallback;
  return fallback;
}

export async function storeBuffer(name, buffer, contentType = 'image/jpeg') {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const r = await put(`uploads/${name}`, buffer, { access: 'public', contentType, addRandomSuffix: false });
    return r.url;
  }
  if (process.env.VERCEL) {
    const e = new Error('Armazenamento de imagens não configurado (BLOB_READ_WRITE_TOKEN).');
    e.status = 503;
    throw e;
  }
  const dir = await getUploadDir();
  await fs.writeFile(/*turbopackIgnore: true*/ path.join(dir, name), buffer);
  return `/uploads/${name}`;
}
