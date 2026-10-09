import { Shell } from '@/components/Shell';
import { Card, CtaBanner, Pagination, Pill, Sidebar, Cover, bgStyle } from '@/components/Parts';
import { countVisible, getCategories, getStats, listVisible } from '@/lib/posts';
import { CAT_ICONS, PER_PAGE, fdate, isoDay, siteUrl, trunc, MAIN_SITE } from '@/lib/content';
import { getCurrentTenant } from '@/lib/currentTenant';

export async function HomePage({ page = 1, tenant: passedTenant = null }) {
  const current = passedTenant || (await getCurrentTenant()).tenant;
  const tenant = current || { id: 1, name: 'Braziw', site_title: 'Blog Braziw', site_tagline: 'Tudo sobre Francês' };

  const [feature, ...rest] = await listVisible({ limit: 3, offset: 0, tenantId: tenant.id }).catch(() => []);
  const side2 = rest.slice(0, 2);
  const totalPosts = await countVisible(null, tenant.id).catch(() => 0);
  const totalPages = Math.max(1, Math.ceil(totalPosts / PER_PAGE));
  const posts = await listVisible({ limit: PER_PAGE, offset: (page - 1) * PER_PAGE, tenantId: tenant.id }).catch(() => []);
  const [cats, stats] = await Promise.all([
    getCategories(tenant.id).catch(() => []),
    getStats(tenant.id).catch(() => null),
  ]);
  const since = stats?.since ? new Date(stats.since).getUTCFullYear() : '';

  const isBraziw = tenant.slug === 'braziw';

  let theme = {};
  if (tenant.theme_config) {
    try {
      theme = typeof tenant.theme_config === 'string' ? JSON.parse(tenant.theme_config) : tenant.theme_config;
    } catch {
      theme = {};
    }
  }

  const heroEyebrow = theme.hero_eyebrow_text || theme.hero_eyebrow || (isBraziw ? '🇫🇷 Blog da Braziw' : (tenant.slug === 'wisemadness' ? '✦ WISEMADNESS' : `✦ ${tenant.name}`));
  const rawHeroTitle = theme.hero_title_text !== undefined
    ? theme.hero_title_text
    : (tenant.slug === 'wisemadness' ? 'Juntos, transformamos vidas e construímos um futuro melhor' : (theme.hero_title && !theme.hero_title.startsWith('#') ? theme.hero_title : (isBraziw ? 'Tudo sobre' : (tenant.site_title || tenant.name))));
  const rawHeroHighlight = theme.hero_highlight_text !== undefined
    ? theme.hero_highlight_text
    : (tenant.slug === 'wisemadness' ? 'Aqui o amor acontece' : (isBraziw ? 'Francês' : (tenant.site_tagline || 'Artigos e Dicas')));

  const heroTitle = isBraziw && !theme.hero_title_text && !theme.hero_title
    ? <>Tudo sobre <span className="grad">Francês</span>, cultura e a vida na França</>
    : (
      <>
        {rawHeroTitle}
        {rawHeroHighlight ? (
          <>
            {rawHeroTitle && !rawHeroTitle.trim().endsWith('—') && !rawHeroTitle.trim().endsWith('-') ? ' — ' : ' '}
            <span className="grad">{rawHeroHighlight}</span>
          </>
        ) : null}
      </>
    );

  const heroSubtitle = theme.hero_subtitle_text !== undefined
    ? theme.hero_subtitle_text
    : (theme.hero_subtitle && !theme.hero_subtitle.startsWith('#') ? theme.hero_subtitle : (tenant.site_description || 'Artigos, novidades e informações exclusivas para você.'));
  const heroBtnText = theme.hero_btn_text || 'Explorar artigos';
  const heroBtnSearchText = theme.hero_btn_search_text || 'Buscar no blog';

  return (
    <Shell active="home" tenant={tenant}>
      {page === 1 && (
        <>
          <section className="hero">
            <div className="hero-bg" aria-hidden="true"><i className="blob b1" /><i className="blob b2" /><i className="blob b3" /><div className="grid-lines" /></div>
            <div className="container hero-inner">
              <div className="hero-copy reveal">
                <span className="eyebrow">{heroEyebrow}</span>
                <h1>{heroTitle}</h1>
                <p>{heroSubtitle}</p>
                <div className="hero-cta">
                  <a className="btn btn-accent btn-lg" href="#artigos">{heroBtnText}</a>
                  <button className="btn btn-ghost btn-lg" type="button" id="heroSearch">{heroBtnSearchText}</button>
                </div>
                <div className="stats">
                  <div><strong>{stats?.posts ?? 0}</strong><span>artigos</span></div>
                  <div><strong>{cats.length}</strong><span>categorias</span></div>
                  {since ? <div><strong>{since}</strong><span>no ar desde</span></div> : null}
                </div>
              </div>
              <div className="hero-feature">
                {feature ? (
                  <>
                    <article className="feature reveal" style={{ '--d': '120ms' }}>
                      <a className="feature-media fit" style={bgStyle(feature)} href={`/${feature.slug}/`} tabIndex={-1} aria-hidden="true"><Cover post={feature} small={false} eager tenant={tenant} /></a>
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
                          <a className="hm-media fit" style={bgStyle(p)} href={`/${p.slug}/`} tabIndex={-1} aria-hidden="true"><Cover post={p} tenant={tenant} /></a>
                          <div>
                            <Pill cat={p.cat} glass />
                            <h3><a href={`/${p.slug}/`}>{trunc(p.title, 90)}</a></h3>
                            <div className="meta meta-light"><time dateTime={isoDay(p.publish_at)}>{fdate(p.publish_at, true)}</time><span className="dot" /><span>{p.minutes} min</span></div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{
                    padding: '3rem 2rem',
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '280px'
                  }}>
                    <span style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✨</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#f8fafc' }}>
                      {tenant.name}
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9375rem', maxWidth: '380px', margin: '0 auto 1.25rem', lineHeight: '1.5' }}>
                      {tenant.site_tagline || 'Blog inteligente no ar.'} Em breve os primeiros artigos serão publicados aqui.
                    </p>
                    <a href="/admin/login/" className="btn btn-accent btn-sm">
                      Acessar Painel de Redação →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </section>
          {cats.length > 0 && (
            <div className="container">
              <nav className="chips" aria-label="Categorias">
                {cats.map((c) => {
                  const tenantQuery = (tenant?.slug && tenant.slug !== 'braziw' && tenant.slug !== 'mercatta') ? `?tenant=${tenant.slug}` : '';
                  return <a key={c.slug} className="chip" href={`/categoria/${c.slug}/${tenantQuery}`}>{CAT_ICONS[c.slug] || '✦'} {c.name} <b>{c.count}</b></a>;
                })}
              </nav>
            </div>
          )}
        </>
      )}
      <main id="conteudo" className="container layout">
        <div className="main-col">
          <div className="section-head" id="artigos">
            <h2>{page === 1 ? 'Últimos artigos' : `Artigos — página ${page}`}</h2>
            <span className="muted">{stats?.posts ?? 0} publicações</span>
          </div>
          {posts.length > 0 ? (
            <div className="grid">{posts.map((p, i) => <Card key={p.id} post={p} delay={(i % 3) * 90} tenant={tenant} />)}</div>
          ) : (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
              <h3>Nenhum artigo publicado ainda</h3>
              <p style={{ color: '#94a3b8' }}>Este blog está pronto para receber suas publicações geradas por IA ou escritas pela equipe.</p>
            </div>
          )}
          <Pagination base="/" page={page} total={totalPages} />
          {page === 1 && isBraziw && <CtaBanner />}
        </div>
        <Sidebar tenantId={tenant.id} tenant={tenant} />
      </main>
      {page === 1 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'Blog', name: tenant.site_title || tenant.name, url: `${siteUrl()}/`, inLanguage: 'pt-BR',
          publisher: { '@type': 'Organization', name: tenant.name, url: siteUrl() },
        }) }} />
      )}
    </Shell>
  );
}
