import { Shell } from '@/components/Shell';
import { Sidebar } from '@/components/Parts';
import { getCurrentTenant } from '@/lib/currentTenant';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Buscar', robots: { index: false, follow: true }, alternates: { canonical: '/busca/' } };

export default async function Page() {
  const { tenant } = await getCurrentTenant();
  const tenantSlug = tenant?.slug;
  const isCustomTenant = tenantSlug && tenantSlug !== 'braziw' && tenantSlug !== 'mercatta';

  return (
    <Shell tenant={tenant}>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">🔎 Busca</span>
          <h1 id="searchTitle">Buscar no blog</h1>
          <form action="/busca/" method="get" className="big-search" role="search">
            {isCustomTenant && <input type="hidden" name="tenant" value={tenantSlug} />}
            <input type="search" name="q" id="pageSearch" placeholder="Digite um assunto…" />
            <button className="btn btn-accent" type="submit">Buscar</button>
          </form>
        </div>
      </section>
      <main id="conteudo" className="container layout">
        <div className="main-col"><p className="muted" id="searchCount" /><div className="grid" id="searchGrid" /></div>
        <Sidebar tenantId={tenant?.id} tenant={tenant} />
      </main>
    </Shell>
  );
}
