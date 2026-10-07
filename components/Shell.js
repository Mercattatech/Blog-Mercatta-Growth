import Script from 'next/script';
import { getCategories } from '@/lib/posts';
import { CAT_ICONS, MAIN_SITE, TAGLINE, SITE_NAME } from '@/lib/content';

export async function Shell({ active = '', children }) {
  let cats = [];
  try { cats = await getCategories(); } catch { /* banco indisponível no build */ }
  return (
    <>
      <a className="skip" href="#conteudo">Pular para o conteúdo</a>
      <div className="progress" id="progress" aria-hidden="true" />
      <header className="site-header" id="header">
        <div className="container header-inner">
          <a className="brand" href="/" aria-label={`${SITE_NAME} — página inicial`}>
            <img src="/img/logo.png" alt="bra'ziw — Idiomas e Intercâmbios" width="66" height="49" />
            <span className="brand-text"><strong>Blog</strong><small>{TAGLINE}</small></span>
          </a>
          <nav className="main-nav" id="nav" aria-label="Principal">
            <a href="/" className={`nav-link${active === 'home' ? ' is-active' : ''}`}>Início</a>
            {cats.map((c) => (
              <a key={c.slug} href={`/categoria/${c.slug}/`} className={`nav-link${active === c.slug ? ' is-active' : ''}`}>{c.name}</a>
            ))}
          </nav>
          <div className="header-actions">
            <button className="icon-btn" id="searchOpen" aria-label="Buscar (Ctrl+K)" title="Buscar" type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </button>
            <button className="icon-btn" id="themeToggle" aria-label="Alternar tema escuro" title="Alternar tema" type="button">
              <svg className="i-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
              <svg className="i-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            </button>
            <a className="btn btn-accent btn-sm hide-sm" href={MAIN_SITE} target="_blank" rel="noopener">Conheça a Braziw</a>
            <button className="icon-btn menu-btn" id="menuToggle" aria-label="Abrir menu" aria-expanded="false" type="button"><span /><span /><span /></button>
          </div>
        </div>
      </header>
      <div className="search-overlay" id="searchOverlay" role="dialog" aria-modal="true" aria-label="Buscar no blog" hidden>
        <div className="search-box">
          <form action="/busca/" method="get" className="search-form" role="search">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" name="q" id="searchInput" placeholder="Buscar artigos, ex.: gastronomia, Paris, verbos…" autoComplete="off" />
            <kbd>Esc</kbd>
          </form>
          <div className="search-results" id="searchResults" />
        </div>
      </div>
      {children}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <a className="brand brand-light" href="/"><img src="/img/logo.png" alt="bra'ziw" width="66" height="49" /><span className="brand-text"><strong>Blog</strong><small>{TAGLINE}</small></span></a>
            <p>Cultura, curiosidades e dicas para quem ama a França e quer aprender francês de verdade. Um conteúdo da Braziw — Idiomas e Intercâmbios.</p>
          </div>
          <div>
            <h3>Categorias</h3>
            <ul>{cats.map((c) => <li key={c.slug}><a href={`/categoria/${c.slug}/`}>{c.name}</a></li>)}</ul>
          </div>
          <div>
            <h3>Explore</h3>
            <ul>
              <li><a href="/">Últimos artigos</a></li>
              <li><a href="/busca/">Buscar no blog</a></li>
              <li><a href={MAIN_SITE} target="_blank" rel="noopener">Site da Braziw</a></li>
              <li><a href="/feed.xml">Feed RSS</a></li>
              <li><a href="/sitemap.xml">Mapa do site</a></li>
            </ul>
          </div>
          <div className="footer-cta">
            <h3>Quer falar francês?</h3>
            <p>Conheça nossos cursos e intercâmbios e dê o próximo passo.</p>
            <a className="btn btn-accent" href={MAIN_SITE} target="_blank" rel="noopener">Fale com a Braziw</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Braziw — Idiomas e Intercâmbios. Todos os direitos reservados.</span>
          <a href="#topo" id="toTop" className="to-top">Voltar ao topo ↑</a>
        </div>
      </footer>
      <Script src="/main.js" strategy="afterInteractive" />
    </>
  );
}

export { CAT_ICONS };
