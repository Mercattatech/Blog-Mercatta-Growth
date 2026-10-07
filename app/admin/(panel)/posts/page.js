import Link from 'next/link';
import { requireUser } from '@/lib/guard.js';
import { adminCounts, adminListPosts } from '@/lib/posts.js';
import { PostsTable } from '@/components/admin/PostsTable.js';
import { Icon } from '@/components/admin/ui.js';

export const metadata = { title: 'Artigos' };

const TABS = [['', 'Todos'], ['draft', 'Rascunhos'], ['pending', 'Aguardando aprovação'], ['scheduled', 'Agendados'], ['published', 'Publicados']];

export default async function PostsPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const status = TABS.some(([k]) => k === sp?.status) ? sp.status : '';
  const q = String(sp?.q || '').slice(0, 100);
  const page = Math.max(1, Number(sp?.page) || 1);
  const limit = 20;
  const [{ total, rows }, counts] = await Promise.all([
    adminListPosts({ user, status, q, limit, offset: (page - 1) * limit }),
    adminCounts(user),
  ]);
  const pages = Math.max(1, Math.ceil(total / limit));
  const href = (o) => { const p = new URLSearchParams({ ...(status && { status }), ...(q && { q }), ...o }); [...p].forEach(([k, v]) => !v && p.delete(k)); const s = p.toString(); return `/admin/posts/${s ? `?${s}` : ''}`; };
  const n = { '': counts.draft + counts.pending + counts.scheduled + counts.published, draft: counts.draft, pending: counts.pending, scheduled: counts.scheduled, published: counts.published };

  return (
    <>
      <div className="adm-head">
        <div><h2>Artigos</h2><p>{total} {total === 1 ? 'artigo' : 'artigos'}{q ? ` para “${q}”` : ''}</p></div>
        <Link className="a-btn primary" href="/admin/posts/new/"><Icon name="plus" size={17} />Novo artigo</Link>
      </div>
      <div className="a-tabs">
        {TABS.map(([k, label]) => <Link key={k} href={href({ status: k, page: '' })} className={`a-tab${status === k ? ' is-active' : ''}`}>{label} <small>({n[k]})</small></Link>)}
      </div>
      <form className="a-row" style={{ marginBottom: 16 }} action="/admin/posts/" method="get">
        {status && <input type="hidden" name="status" value={status} />}
        <input className="a-input" style={{ maxWidth: 380 }} type="search" name="q" defaultValue={q} placeholder="Buscar por título ou endereço…" aria-label="Buscar artigos" />
        <button className="a-btn ghost">Buscar</button>
        {q && <Link className="a-btn ghost" href={href({ q: '', page: '' })}>Limpar</Link>}
      </form>
      <div className="a-card" style={{ padding: 0, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div className="a-empty"><div className="big">📝</div><p>Nenhum artigo encontrado.</p><Link className="a-btn primary" href="/admin/posts/new/">Escrever o primeiro</Link></div>
        ) : <PostsTable rows={rows} />}
      </div>
      {pages > 1 && (
        <div className="a-pager">
          {page > 1 && <Link className="a-btn ghost sm" href={href({ page: String(page - 1) })}>← Anterior</Link>}
          <span className="a-btn sm" style={{ pointerEvents: 'none' }}>Página {page} de {pages}</span>
          {page < pages && <Link className="a-btn ghost sm" href={href({ page: String(page + 1) })}>Próxima →</Link>}
        </div>
      )}
    </>
  );
}
