import { Shell } from '@/components/Shell';
import { Sidebar } from '@/components/Parts';

export const metadata = { title: 'Buscar', robots: { index: false, follow: true }, alternates: { canonical: '/busca/' } };

export default function Page() {
  return (
    <Shell>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">🔎 Busca</span>
          <h1 id="searchTitle">Buscar no blog</h1>
          <form action="/busca/" method="get" className="big-search" role="search">
            <input type="search" name="q" id="pageSearch" placeholder="Digite um assunto…" />
            <button className="btn btn-accent" type="submit">Buscar</button>
          </form>
        </div>
      </section>
      <main id="conteudo" className="container layout">
        <div className="main-col"><p className="muted" id="searchCount" /><div className="grid" id="searchGrid" /></div>
        <Sidebar />
      </main>
    </Shell>
  );
}
