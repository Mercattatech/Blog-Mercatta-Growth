// Gera capas com IA (no servidor de produção) para os artigos com capa quebrada,
// salva cópia local em scratch/covers_backup/<slug>/<id>.jpg e atualiza o artigo.
// Também manda os artigos de teste 201 e 204 da Wise para a lixeira.
import fs from 'node:fs';
import path from 'node:path';
import { audit, api } from './audit_images.mjs';

const BASE = 'https://news.grupomercatta.com.br';
const TRASH = new Set([201, 204]);
const BACKUP = 'scratch/covers_backup';

async function mcp(key, name, args) {
  const r = await fetch(`${BASE}/api/mcp?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } }),
    signal: AbortSignal.timeout(180000),
  }).then((x) => x.json());
  if (r?.error || r?.result?.isError) throw new Error(r?.result?.content?.[0]?.text || JSON.stringify(r.error));
  return JSON.parse(r.result.content[0].text);
}

const { cookie, report } = await audit();
const { tenants } = await api(cookie, '/api/admin/tenants/');
let ok = 0; const fails = [];

for (const r of report) {
  const t = tenants.find((x) => x.id === r.tenant.id);
  if (!r.broken.length) continue;
  // Entra no painel da empresa (a renderização usa a marca/logo dela)
  const imp = await fetch(`${BASE}/api/admin/impersonate/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE, Cookie: cookie }, body: JSON.stringify({ tenantId: t.id }) });
  const impCookie = imp.headers.get('set-cookie')?.match(/mercatta_impersonate_tenant=[^;]+/)?.[0];
  const ck = `${cookie}; ${impCookie}`;
  fs.mkdirSync(path.join(BACKUP, t.slug), { recursive: true });

  for (const b of r.broken) {
    try {
      if (TRASH.has(b.id) && t.slug === 'wisemadness') {
        await mcp(t.mcp_api_key, 'delete_article', { id: b.id });
        console.log(`🗑  #${b.id} enviado para a lixeira`);
        continue;
      }
      const post = await api(ck, `/api/admin/posts/${b.id}/`);
      const sug = await api(ck, '/api/admin/covers/', { method: 'POST', body: JSON.stringify({ action: 'suggest', title: post.title, excerpt: post.excerpt || '', category_name: post.cat?.name || '' }) });
      const s = sug.suggestion || {};
      const ren = await api(ck, '/api/admin/covers/', { method: 'POST', body: JSON.stringify({ action: 'render', bgSource: s.preset_id || 'modern_workspace', highlightText: s.highlight_text || t.name, mainText: s.main_text || post.title }) });
      const cover = ren.cover;
      if (!cover?.url) throw new Error('render sem url: ' + JSON.stringify(ren).slice(0, 200));
      const img = Buffer.from(await (await fetch(cover.url.startsWith('http') ? cover.url : BASE + cover.url)).arrayBuffer());
      fs.writeFileSync(path.join(BACKUP, t.slug, `${b.id}.jpg`), img);
      await mcp(t.mcp_api_key, 'edit_article', { id: b.id, cover_url: cover.url, cover_thumb: cover.thumb || cover.url });
      ok++;
      console.log(`✅ ${t.slug} #${b.id} ${post.title}`);
    } catch (e) {
      fails.push(`${t.slug} #${b.id}: ${e.message}`);
      console.log(`❌ ${t.slug} #${b.id}: ${e.message}`);
    }
  }
  await fetch(`${BASE}/api/admin/impersonate/`, { method: 'DELETE', headers: { Origin: BASE, Cookie: ck } });
}
console.log(`\nCapas geradas: ${ok}. Falhas: ${fails.length}\n${fails.join('\n')}`);

