// Reenvia as capas locais (scratch/covers) para os artigos da Wise em produção, casando pelo título.
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.MCP_KEY;
const URL_ = `https://news.grupomercatta.com.br/api/mcp?key=${KEY}`;

const src = fs.readFileSync('scratch/sync_covers.mjs', 'utf8');
const P = eval(src.slice(src.indexOf('const P = [') + 10, src.indexOf('];', src.indexOf('const P = [')) + 1));
const clean = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function mcp(name, args) {
  const r = await fetch(URL_, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } }),
    signal: AbortSignal.timeout(120000),
  }).then((x) => x.json());
  if (r?.error || r?.result?.isError) throw new Error(r?.result?.content?.[0]?.text || JSON.stringify(r.error));
  return JSON.parse(r.result.content[0].text);
}

const list = (await mcp('list_articles', { status: 'all', limit: 200 })).articles;
const files = fs.readdirSync('scratch/covers').filter((f) => !f.startsWith('.'));
const done = new Set();
const missing = [];

for (const [full, short] of P) {
  const art = list.find((a) => clean(a.title) === clean(full));
  if (!art) continue;
  const file = files.find((f) => clean(path.parse(f).name.replace(/\s*\(\d+\)$/, '')) === clean(short));
  if (!file) { missing.push(`#${art.id} ${art.title}`); continue; }
  const b64 = fs.readFileSync(path.join('scratch/covers', file)).toString('base64');
  await mcp('edit_article', { id: art.id, cover_base64: `data:image/jpeg;base64,${b64}` });
  done.add(art.id);
  console.log(`OK #${art.id} ← ${file}`);
}
for (const a of list) if (!done.has(a.id) && !missing.some((m) => m.startsWith(`#${a.id} `))) missing.push(`#${a.id} ${a.title}`);
console.log(`\nAtualizadas: ${done.size}. Sem capa local (${missing.length}):\n${missing.join('\n')}`);

