import { Shell } from '@/components/Shell';
import { Card, CtaBanner, Pagination, Pill, Sidebar, Cover, bgStyle } from '@/components/Parts';
import { countVisible, getCategories, getStats, listVisible } from '@/lib/posts';
import { CAT_ICONS, PER_PAGE, fdate, isoDay, siteUrl, trunc, MAIN_SITE } from '@/lib/content';

export async function HomePage({ page = 1 }) {
  const [feature, ...rest] = await listVisible({ limit: 3, offset: 0 }).catch(() => []);
  const side2 = rest.slice(0, 2);
  const totalAfterHero = Math.max(0, (await countVisible().catch(() => 0)) - 3);
  const totalPages = Math.max(1, Math.ceil(totalAfterHero / PER_PAGE));
  const posts = await listVisible({ limit: PER_PAGE, offset: 3 + (page - 1) * PER_PAGE }).catch(() => []);
  const [cats, stats] = await Promise.all([getCategories().catch(() => []), getStats().catch(() => null)]);
  const since = stats?.since ? new Date(stats.since).getUTCFullYear() : '';

  return (
    <Shell active="home">
      {page === 1 && feature && (
        <>
          <section className="hero">
            <div className="hero-bg" aria-hidden="true"><i className="blob b1" /><i className="blob b2" /><i className="blob b3" /><div className="grid-lines" /></div>
            <div className="container hero-inner">
              <div className="hero-copy reveal">
                <span className="eyebrow">🇫🇷 Blog da Braziw</span>
                <h1>Tudo sobre <span className="grad">Francês</span>, cultura e a vida na França</h1>
                <p>Curiosidades, dicas de idioma e histórias que aproximam você da língua e do jeito francês de viver.</p>
                <div className="hero-cta">
                  <a className="btn btn-accent btn-lg" href="#artigos">Explorar artigos</a>
                  <button className="btn btn-ghost btn-lg" type="button" id="heroSearch">Buscar no blog</button>
                </div>
                <div className="stats">
                  <div><strong>{stats?.posts ?? ''}</strong><span>artigos</span></div>
                  <div><strong>{cats.length}</strong><span>categorias</span></div>
                  <div><strong>{since}</strong><span>no ar desde</span></div>
                </div>
              </div>
              <div className="hero-feature">
                <article className="feature reveal" style={{ '--d': '120ms' }}>
                  <a className="feature-media fit" style={bgStyle(feature)} href={`/${feature.slug}/`} tabIndex={-1} aria-hidden="true"><Cover post={feature} small={false} eager /></a>
                  <div className="feature-body">
                    <span className="badge-new">Destaque</span><Pill cat={feature.cat} glass />
                    <h2><a href={`/${feature.slug}/`}>{feature.title}</a></h2>
                    <p>{trunc(feature.excerpt, 140)}</p>
                    <div className="meta meta-light"><time dateTime={isoDay(feature.publish_at)}>{fdate(feature.publish_at)}</time><span className="dot" /><span>{feature.minutes} min de leitura</span></div>
                  </div>
                </article>
                <div className="hero-minis">
                  {side2.map((p, i) => (
                    <article key={p.id} className="hero-mini reveal" style={{ '--d': `${(i + 1) * 120}ms` }}>
                      <a className="hm-media fit" style={bgStyle(p)} href={`/${p.slug}/`} tabIndex={-1} aria-hidden="true"><Cover post={p} /></a>
                      <div>
                        <Pill cat={p.cat} glass />
                        <h3><a href={`/${p.slug}/`}>{trunc(p.title, 90)}</a></h3>
                        <div className="meta meta-light"><time dateTime={isoDay(p.publish_at)}>{fdate(p.publish_at, true)}</time><span className="dot" /><span>{p.minutes} min</span></div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <div className="container">
            <nav className="chips" aria-label="Categorias">
              {cats.map((c) => <a key={c.slug} className="chip" href={`/categoria/${c.slug}/`}>{CAT_ICONS[c.slug] || ''} {c.name} <b>{c.count}</b></a>)}
            </nav>
          </div>
        </>
      )}
      <main id="conteudo" className="container layout">
        <div className="main-col">
          <div className="section-head" id="artigos">
            <h2>{page === 1 ? 'Últimos artigos' : `Artigos — página ${page}`}</h2>
            <span className="muted">{stats?.posts ?? 0} publicações</span>
          </div>
          <div className="grid">{posts.map((p, i) => <Card key={p.id} post={p} delay={(i % 3) * 90} />)}</div>
          <Pagination base="/" page={page} total={totalPages} />
          {page === 1 && <CtaBanner />}
        </div>
        <Sidebar />
      </main>
      {page === 1 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'Blog', name: 'Blog Braziw', url: `${siteUrl()}/`, inLanguage: 'pt-BR',
          publisher: { '@type': 'Organization', name: 'Braziw', url: MAIN_SITE, logo: { '@type': 'ImageObject', url: `${siteUrl()}/img/braziw-lg.png` } },
        }) }} />
      )}
    </Shell>
  );
}
