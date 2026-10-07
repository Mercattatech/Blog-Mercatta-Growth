import { getCategories, getRecent, getTopTags } from '@/lib/posts';
import { CAT_ICONS, MAIN_SITE, fdate, isoDay, trunc } from '@/lib/content';

export function Cover({ post, small = true, eager = false, className = '' }) {
  const src = small ? (post.cover_thumb || post.cover_url) : (post.cover_url || post.cover_thumb);
  if (!src) {
    return (
      <span className={`ph-cover ${className}`} aria-hidden="true">
        <img src="/img/logo.png" alt="" width="66" height="49" />
        <b>{trunc(post.title, 70)}</b>
      </span>
    );
  }
  return (
    <img src={src} alt={post.cover_alt || post.title} width={small ? 640 : 1100} height={small ? 360 : 619}
      loading={eager ? 'eager' : 'lazy'} decoding="async" className={className} />
  );
}

export const bgStyle = (post) => {
  const src = post.cover_thumb || post.cover_url;
  return src ? { '--bg': `url('${src}')` } : undefined;
};

export function Pill({ cat, glass = false }) {
  if (!cat) return null;
  return <a className={`pill pill-${cat.slug}${glass ? ' pill-glass' : ''}`} href={`/categoria/${cat.slug}/`}>{cat.name}</a>;
}

export function Card({ post, delay = 0 }) {
  return (
    <article className="card reveal" style={{ '--d': `${delay}ms`, ...(bgStyle(post) || {}) }}>
      <a className="card-media fit" style={bgStyle(post)} href={`/${post.slug}/`} tabIndex={-1} aria-hidden="true"><Cover post={post} /></a>
      <div className="card-body">
        <Pill cat={post.cat} />
        <h3 className="card-title"><a href={`/${post.slug}/`}>{post.title}</a></h3>
        <p className="card-excerpt">{trunc(post.excerpt, 130)}</p>
        <div className="meta">
          <time dateTime={isoDay(post.publish_at)}>{fdate(post.publish_at, true)}</time>
          <span className="dot" /><span>{post.minutes} min de leitura</span>
        </div>
      </div>
    </article>
  );
}

export function Pagination({ base, page, total }) {
  if (total <= 1) return null;
  const href = (n) => (n === 1 ? base : `${base}pagina/${n}/`);
  const shown = [...new Set([1, total, page, page - 1, page + 1, page - 2, page + 2])].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const items = [];
  if (page > 1) items.push(<a key="p" className="pg pg-nav" href={href(page - 1)} rel="prev">← Anterior</a>);
  let prev = 0;
  shown.forEach((n) => {
    if (n - prev > 1) items.push(<span key={`g${n}`} className="pg pg-gap">…</span>);
    items.push(<a key={n} className={`pg${n === page ? ' is-current' : ''}`} href={href(n)} aria-current={n === page ? 'page' : undefined}>{n}</a>);
    prev = n;
  });
  if (page < total) items.push(<a key="n" className="pg pg-nav" href={href(page + 1)} rel="next">Próxima →</a>);
  return <nav className="pagination" aria-label="Paginação">{items}</nav>;
}

export function CtaBanner() {
  return (
    <section className="cta-banner reveal">
      <div>
        <h2>Pronto para viver o francês na prática?</h2>
        <p>Aulas, certificações e intercâmbios para você ir além da curiosidade.</p>
      </div>
      <a className="btn btn-accent btn-lg" href={MAIN_SITE} target="_blank" rel="noopener">Quero saber mais</a>
    </section>
  );
}

export async function Sidebar({ excludeId = 0 }) {
  const [cats, recent, tags] = await Promise.all([getCategories(), getRecent(5, excludeId), getTopTags(18)]).catch(() => [[], [], []]);
  return (
    <aside className="sidebar" aria-label="Barra lateral">
      <section className="widget widget-search">
        <h2 className="widget-title">Buscar</h2>
        <form action="/busca/" method="get" role="search" className="side-search">
          <input type="search" name="q" placeholder="Buscar artigos…" aria-label="Buscar" />
          <button type="submit" aria-label="Buscar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></button>
        </form>
      </section>
      <section className="widget widget-about">
        <img src="/img/braziw-lg.png" alt="bra'ziw — Idiomas e Intercâmbios" width="120" height="114" />
        <h2 className="widget-title">Sobre a Braziw</h2>
        <p>Há mais de 25 anos conectando brasileiros ao mundo por meio de idiomas e intercâmbios.</p>
        <a className="btn btn-primary btn-block" href={MAIN_SITE} target="_blank" rel="noopener">Conheça a Braziw</a>
      </section>
      <section className="widget">
        <h2 className="widget-title">Categorias</h2>
        <ul className="cat-list">
          {cats.map((c) => (
            <li key={c.slug}><a href={`/categoria/${c.slug}/`}><span>{CAT_ICONS[c.slug] || '•'} {c.name}</span><b>{c.count}</b></a></li>
          ))}
        </ul>
      </section>
      <section className="widget">
        <h2 className="widget-title">Recentes</h2>
        <ul className="recent-list">
          {recent.map((p) => (
            <li key={p.id}><a href={`/${p.slug}/`}>
              <span className="thumb fit" style={bgStyle(p)}><Cover post={p} /></span>
              <span className="rt"><strong>{trunc(p.title, 72)}</strong><small>{fdate(p.publish_at, true)}</small></span>
            </a></li>
          ))}
        </ul>
      </section>
      <section className="widget">
        <h2 className="widget-title">Assuntos populares</h2>
        <div className="tag-cloud">{tags.map((t) => <a key={t} className="tag" href={`/busca/?q=${encodeURIComponent(t)}`}>{t}</a>)}</div>
      </section>
    </aside>
  );
}
