// Auditoria de imagens em produção (todas as empresas): capas, logos e favicons.
const BASE = 'https://news.grupomercatta.com.br';
const H = { 'Content-Type': 'application/json', Origin: BASE };

export async function login() {
  const r = await fetch(`${BASE}/api/auth/login/`, { method: 'POST', headers: H, body: JSON.stringify({ email: 'admin@grupomercatta.com.br', password: process.env.ADMIN_PW }) });
  const c = r.headers.get('set-cookie')?.match(/braziw_session=[^;]+/)?.[0];
  if (!c) throw new Error('login falhou (defina ADMIN_PW=...)');
  return c;
}
export async function api(cookie, path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, { ...opts, headers: { ...H, Cookie: cookie, ...(opts.headers || {}) } });
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { throw new Error(`${r.status} ${txt.slice(0, 200)}`); }
}
const abs = (u) => (u.startsWith('http') ? u : BASE + u);
export async function alive(u) {
  if (!u) return false;
  try { return (await fetch(abs(u), { method: 'HEAD', signal: AbortSignal.timeout(15000) })).ok; } catch { return false; }
}

export async function audit() {
  const cookie = await login();
  const { tenants = [] } = await api(cookie, '/api/admin/tenants/');
  const report = [];
  for (const t of tenants) {
    const posts = [];
    for (let page = 1; ; page++) {
      const r = await api(cookie, `/api/admin/posts/?tenant_id=${t.id}&page=${page}`);
      posts.push(...(r.rows || r.posts || []));
      if (page >= (r.pages || 1)) break;
    }
    const broken = [];
    for (const p of posts) {
      if (p.status === 'trash' || p.deleted_at) continue;
      if (!(await alive(p.cover_url))) broken.push({ id: p.id, title: p.title, cover: p.cover_url || null, status: p.status });
    }
    report.push({
      tenant: { id: t.id, slug: t.slug, name: t.name },
      logo: { url: t.logo_url, ok: t.logo_url ? await alive(t.logo_url) : null },
      favicon: { url: t.favicon_url, ok: t.favicon_url ? await alive(t.favicon_url) : null },
      posts: posts.length,
      broken,
    });
  }
  return { cookie, report };
}

if (process.argv[1]?.endsWith("audit_images.mjs")) {
  const { report } = await audit();
  for (const r of report) {
    console.log(`\n== ${r.tenant.name} (${r.tenant.slug}, id ${r.tenant.id}) — ${r.posts} artigos`);
    console.log(`   logo: ${r.logo.url || '-'} ${r.logo.ok === false ? '❌' : r.logo.ok ? '✅' : ''}`);
    console.log(`   favicon: ${r.favicon.url || '-'} ${r.favicon.ok === false ? '❌' : r.favicon.ok ? '✅' : ''}`);
    console.log(`   capas quebradas: ${r.broken.length}`);
    for (const b of r.broken) console.log(`     #${b.id} [${b.status}] ${b.title} -> ${b.cover}`);
  }
}
