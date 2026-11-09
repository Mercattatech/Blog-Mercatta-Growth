// Backup e restauração de TODAS as capas hospedadas em /uploads (todas as empresas).
//   node scratch/covers_backup_restore.mjs backup   -> baixa as capas vivas para scratch/covers_backup/<slug>/<id>.jpg
//   node scratch/covers_backup_restore.mjs restore  -> reenvia as capas quebradas a partir do backup local
import fs from 'node:fs';
import path from 'node:path';
import { login, api, alive } from './audit_images.mjs';

const BASE = 'https://news.grupomercatta.com.br';
const DIR = 'scratch/covers_backup';
const mode = process.argv[2] || 'backup';

async function mcp(key, name, args) {
  const r = await fetch(`${BASE}/api/mcp?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } }),
    signal: AbortSignal.timeout(120000),
  }).then((x) => x.json());
  if (r?.error || r?.result?.isError) throw new Error(r?.result?.content?.[0]?.text || JSON.stringify(r.error));
  return JSON.parse(r.result.content[0].text);
}

const cookie = await login();
const { tenants } = await api(cookie, '/api/admin/tenants/');
let saved = 0, restored = 0, missing = [];

for (const t of tenants) {
  fs.mkdirSync(path.join(DIR, t.slug), { recursive: true });
  const posts = [];
  for (let page = 1; ; page++) {
    const r = await api(cookie, `/api/admin/posts/?tenant_id=${t.id}&page=${page}`);
    posts.push(...(r.rows || []));
    if (page >= (r.pages || 1)) break;
  }
  for (const p of posts) {
    if (!p.cover_url || !p.cover_url.startsWith('/uploads/')) continue; // capas externas não somem
    const file = path.join(DIR, t.slug, `${p.id}.jpg`);
    const ok = await alive(p.cover_url);
    if (mode === 'backup' && ok) {
      fs.writeFileSync(file, Buffer.from(await (await fetch(BASE + p.cover_url)).arrayBuffer()));
      saved++;
    } else if (mode === 'restore' && !ok) {
      if (!fs.existsSync(file)) { missing.push(`${t.slug} #${p.id} ${p.title}`); continue; }
      await mcp(t.mcp_api_key, 'edit_article', { id: p.id, cover_base64: `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}` });
      restored++;
      console.log(`✅ ${t.slug} #${p.id}`);
    }
  }
}
console.log(mode === 'backup' ? `Backup: ${saved} capas salvas em ${DIR}` : `Restauradas: ${restored}. Sem backup: ${missing.length}\n${missing.join('\n')}`);

