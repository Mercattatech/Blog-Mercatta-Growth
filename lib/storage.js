import path from 'node:path';
import fs from 'node:fs/promises';

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
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  return `/uploads/${name}`;
}
