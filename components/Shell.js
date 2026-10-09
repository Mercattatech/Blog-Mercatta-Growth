import Script from 'next/script';
import { getCategories } from '@/lib/posts';
import { CAT_ICONS, MAIN_SITE } from '@/lib/content';
import { getCurrentTenant } from '@/lib/currentTenant';
import WhatsAppFlowWidget from '@/components/WhatsAppFlowWidget';

export async function Shell({ active = '', tenant: passedTenant = null, children }) {
  const current = passedTenant || (await getCurrentTenant()).tenant;
  const tenant = current || {
    id: 1,
    name: 'Braziw — Idiomas e Intercâmbios',
    site_title: 'Blog Braziw',
    site_tagline: 'Tudo sobre Francês',
    logo_url: '/img/logo.png',
    primary_color: '#0a1a44',
    accent_color: '#e50914',
    site_description: 'Cultura, curiosidades e dicas para quem ama a França e quer aprender francês de verdade.',
    status: 'active',
  };

  // Se a empresa estiver com plano suspenso (inadimplência ou pausa)
  if (tenant.status === 'suspended') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'Inter, sans-serif',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '500px', background: '#1e293b', padding: '3rem 2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>Blog Temporariamente Indisponível</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            O acesso a este blog está pausado temporariamente. Se você é o responsável pela <strong>{tenant.name}</strong>, entre em contato com o Grupo Mercatta para regularização.
          </p>
          <a
            href="https://grupomercatta.com.br"
            style={{
              display: 'inline-block',
              background: '#3b82f6',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            Falar com Suporte Mercatta
          </a>
        </div>
      </div>
    );
  }

  let cats = [];
  try {
    cats = await getCategories(tenant.id);
  } catch {
    /* fallback se banco estiver ocupado */
  }

  let theme = {};
  if (tenant.theme_config) {
    try {
      theme = typeof tenant.theme_config === 'string' ? JSON.parse(tenant.theme_config) : tenant.theme_config;
    } catch {
      theme = {};
    }
  }

  const siteTitle = theme.header_title_text || (theme.header_title && !theme.header_title.startsWith('#') ? theme.header_title : null) || (tenant.slug === 'wisemadness' ? 'WiseMadness' : (tenant.site_title || tenant.name));
  const tagline = theme.header_tagline_text !== undefined ? theme.header_tagline_text : (theme.header_tagline !== undefined && !theme.header_tagline.startsWith('#') ? theme.header_tagline : (tenant.site_tagline || 'Blog Oficial'));
  const logoUrl = tenant.logo_url || (tenant.slug === 'braziw' ? '/img/logo.png' : null);
  const contactHref = tenant.whatsapp
    ? `https://wa.me/${tenant.whatsapp.replace(/\D/g, '')}`
    : (tenant.slug === 'braziw' ? MAIN_SITE : (tenant.contact_email ? `mailto:${tenant.contact_email}` : '#'));
  const contactLabel = theme.header_contact_text || (tenant.slug === 'braziw' ? 'Conheça a Braziw' : 'Fale Conosco');
  const description = tenant.site_description || `Artigos e novidades oficiais da ${tenant.name}.`;

  function getContrastColor(hexColor) {
    if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
    const c = hexColor.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 145 ? '#111827' : '#ffffff';
  }

  const btnColor = tenant.button_color || '#ffc92b';
  const btnTextColor = tenant.button_text_color || getContrastColor(btnColor);
  const bgColor = tenant.bg_color || null;
  const heroBg = tenant.hero_bg_color || tenant.bg_color || null;

  const bgIsDark = bgColor ? (getContrastColor(bgColor) === '#ffffff') : false;

  const primaryCol = theme.primary_color || tenant.primary_color || '#2563eb';
  const accentCol = theme.accent_color || tenant.accent_color || '#1d4ed8';
  const btnCol = theme.btn_primary_bg || btnColor;
  const btnTextCol = theme.btn_primary_text || btnTextColor;
  const hlColor = theme.hero_highlight || '#ffc92b';

  const customStyle = {
    '--color-primary': primaryCol,
    '--color-accent': accentCol,
    // Header
    '--header-bg': theme.header_bg || (bgColor && bgIsDark ? 'rgba(8, 17, 44, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
    '--header-border': theme.header_border || (bgIsDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
    '--header-text': theme.header_text || (bgColor && bgIsDark ? '#e9eefc' : primaryCol),
    '--header-subtext': theme.header_subtext || theme.header_text || '#64748b',
    '--header-nav-color': theme.header_nav_color || '#5b6788',
    '--header-nav-active': theme.header_nav_active || primaryCol,
    '--header-icon-color': theme.header_icon_color || (bgIsDark ? '#e9eefc' : '#0f172a'),
    '--btn-header-bg': theme.btn_header_bg || theme.btn_primary_bg || btnCol,
    '--btn-header-text': theme.btn_header_text || theme.btn_primary_text || btnTextCol,

    // Hero Section
    '--hero-bg': theme.hero_bg || (heroBg ? (heroBg.includes('gradient') ? heroBg : `linear-gradient(160deg, ${heroBg} 0%, ${primaryCol} 100%)`) : undefined),
    '--hero-blob-1': theme.hero_blob_1 || primaryCol,
    '--hero-blob-2': theme.hero_blob_2 || accentCol,
    '--hero-blob-3': theme.hero_blob_3 || '#10b981',
    '--hero-tag-bg': theme.hero_tag_bg || 'rgba(255, 255, 255, 0.15)',
    '--hero-tag-text': theme.hero_tag_text || '#ffffff',
    '--hero-tag-border': theme.hero_tag_border || 'rgba(255, 255, 255, 0.22)',
    '--hero-title-color': theme.hero_title || '#ffffff',
    '--hero-highlight-color': hlColor,
    '--hero-highlight-grad': `linear-gradient(100deg, ${hlColor}, ${theme.hero_highlight_2 || '#ffe58a'} 50%, ${hlColor})`,
    '--hero-subtitle-color': theme.hero_subtitle || 'rgba(255, 255, 255, 0.85)',
    '--hero-stats-number': theme.hero_stats_number || hlColor,
    '--hero-stats-label': theme.hero_stats_label || 'rgba(255, 255, 255, 0.7)',

    // Buttons
    '--btn-primary-bg': theme.btn_primary_bg || btnCol,
    '--btn-primary-color': theme.btn_primary_text || btnTextCol,
    '--btn-accent-bg': theme.btn_primary_bg || btnCol,
    '--btn-accent-color': theme.btn_primary_text || btnTextCol,
    '--btn-accent-shadow': `0 8px 22px -8px ${btnCol}aa`,
    '--btn-accent-shadow-hover': `0 14px 30px -8px ${btnCol}dd`,
    '--btn-secondary-bg': theme.btn_secondary_bg || 'rgba(255, 255, 255, 0.12)',
    '--btn-secondary-color': theme.btn_secondary_text || '#ffffff',
    '--btn-secondary-border': theme.btn_secondary_border || 'rgba(255, 255, 255, 0.3)',

    // Featured Card in Hero
    '--feature-card-bg': theme.feature_card_bg || theme.card_bg || (bgIsDark ? '#0d1838' : '#081229'),
    '--feature-card-border': theme.feature_card_border || 'rgba(255, 255, 255, 0.1)',
    '--feature-title-color': theme.feature_title || theme.card_title || '#ffffff',
    '--feature-text-color': theme.feature_text || theme.card_text || 'rgba(255, 255, 255, 0.78)',
    '--feature-meta-color': theme.feature_meta || theme.card_meta || 'rgba(255, 255, 255, 0.75)',
    '--badge-bg': theme.badge_bg || '#ffc92b',
    '--badge-text': theme.badge_text || '#000000',

    // Mini Cards in Hero
    '--hero-mini-bg': theme.hero_mini_bg || 'rgba(255, 255, 255, 0.09)',
    '--hero-mini-border': theme.hero_mini_border || 'rgba(255, 255, 255, 0.16)',
    '--hero-mini-title': theme.hero_mini_title || '#ffffff',
    '--hero-mini-meta': theme.hero_mini_meta || 'rgba(255, 255, 255, 0.75)',

    // Chips / Categories
    '--chips-bar-bg': theme.chips_bar_bg || (bgIsDark ? '#0d1838' : '#ffffff'),
    '--chips-bar-border': theme.chips_bar_border || (bgIsDark ? '#1c2a56' : '#e1e7f3'),
    '--chip-bg': theme.chip_bg || (bgIsDark ? '#121f47' : '#eef2fa'),
    '--chip-text': theme.chip_text || (bgIsDark ? '#e9eefc' : '#0f172a'),
    '--chip-count-bg': theme.chip_count_bg || (bgIsDark ? '#0d1838' : '#ffffff'),
    '--chip-count-text': theme.chip_count_text || (bgIsDark ? '#9aa9cf' : '#5b6788'),

    // Grid Post Cards
    '--section-title-color': theme.section_title_color || (bgIsDark ? '#ffffff' : '#0f172a'),
    '--card-bg': theme.card_bg || (bgIsDark ? '#0d1838' : '#ffffff'),
    '--card-border': theme.card_border || (bgIsDark ? '#1c2a56' : '#e1e7f3'),
    '--card-title-color': theme.card_title || (bgIsDark ? '#ffffff' : '#0f172a'),
    '--card-text-color': theme.card_text || (bgIsDark ? '#94a3b8' : '#475569'),
    '--card-meta-color': theme.card_meta || (bgIsDark ? '#64748b' : '#64748b'),
    '--card-pill-bg': theme.card_pill_bg || `color-mix(in srgb, ${primaryCol} 12%, transparent)`,
    '--card-pill-text': theme.card_pill_text || primaryCol,

    // Body & Footer
    '--footer-bg': theme.footer_bg || '#08112c',
    '--footer-text': theme.footer_text || '#94a3b8',
    '--footer-title': theme.footer_title || '#ffffff',

    ...(theme.body_bg || bgColor ? {
      '--bg': theme.body_bg || bgColor,
      ...(bgIsDark ? {
        '--text': theme.body_text || '#e9eefc',
        '--surface': theme.card_bg || '#0d1838',
        '--surface-2': '#121f47',
        '--line': '#1c2a56',
      } : {
        '--text': theme.body_text || '#0f1b3d',
        '--surface': theme.card_bg || '#ffffff',
        '--surface-2': '#eef2fa',
        '--line': '#e1e7f3',
      }),
    } : {
      ...(theme.body_text ? { '--text': theme.body_text } : {}),
    }),
  };

  const faviconUrl = tenant.favicon_url || tenant.logo_url || (tenant.slug === 'braziw' ? '/img/logo.png' : null);

  const tenantQuery = (tenant?.slug && tenant.slug !== 'braziw' && tenant.slug !== 'mercatta') ? `?tenant=${tenant.slug}` : '';
  const homeHref = `/${tenantQuery}`;
  const catHref = (cSlug) => `/categoria/${cSlug}/${tenantQuery}`;
  const searchHref = `/busca/${tenantQuery}`;

  let flowConfig = null;
  if (tenant.has_whatsapp_flow && tenant.whatsapp_flow_config) {
    try {
      flowConfig = typeof tenant.whatsapp_flow_config === 'string'
        ? JSON.parse(tenant.whatsapp_flow_config)
        : tenant.whatsapp_flow_config;
    } catch {
      flowConfig = null;
    }
  }

  return (
    <div style={customStyle} className="tenant-shell">
      {/* Google Tag Manager & Google Analytics 4 */}
      {tenant.gtm_id && (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${tenant.gtm_id}');`,
          }}
        />
      )}
      {tenant.gtm_id && (
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${tenant.gtm_id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
          }}
        />
      )}
      {tenant.ga_id && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${tenant.ga_id}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${tenant.ga_id}');`,
            }}
          />
        </>
      )}
      {tenant.custom_head_scripts && (
        <div dangerouslySetInnerHTML={{ __html: tenant.custom_head_scripts }} />
      )}
      {tenant.custom_body_scripts && (
        <div dangerouslySetInnerHTML={{ __html: tenant.custom_body_scripts }} />
      )}

      {faviconUrl && (
        <>
          <link rel="icon" href={faviconUrl} />
          <link rel="shortcut icon" href={faviconUrl} />
          <link rel="apple-touch-icon" href={faviconUrl} />
        </>
      )}
      <a className="skip" href="#conteudo">Pular para o conteúdo</a>
      <div className="progress" id="progress" aria-hidden="true" />
      <header className="site-header" id="header">
        <div className="container header-inner">
          <a className="brand" href={homeHref} aria-label={`${siteTitle} — página inicial`}>
            {logoUrl ? (
              <img src={logoUrl} alt={tenant.name} width="56" height="42" style={{ objectFit: 'contain' }} />
            ) : (
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 8,
                background: tenant.primary_color || '#2563eb',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.25rem'
              }}>
                {tenant.name.slice(0, 1)}
              </div>
            )}
            <span className="brand-text"><strong>{siteTitle}</strong><small>{tagline}</small></span>
          </a>
          <nav className="main-nav" id="nav" aria-label="Principal">
            <a href={homeHref} className={`nav-link${active === 'home' ? ' is-active' : ''}`}>Início</a>
            {cats.map((c) => (
              <a key={c.slug} href={catHref(c.slug)} className={`nav-link${active === c.slug ? ' is-active' : ''}`}>{c.name}</a>
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
            <a className="btn btn-accent btn-sm hide-sm" href={contactHref} target="_blank" rel="noopener">{contactLabel}</a>
            <button className="icon-btn menu-btn" id="menuToggle" aria-label="Abrir menu" aria-expanded="false" type="button"><span /><span /><span /></button>
          </div>
        </div>
      </header>
      <div className="search-overlay" id="searchOverlay" role="dialog" aria-modal="true" aria-label="Buscar no blog" hidden>
        <div className="search-box">
          <form action="/busca/" method="get" className="search-form" role="search">
            {tenantQuery && <input type="hidden" name="tenant" value={tenant.slug} />}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" name="q" id="searchInput" placeholder="Buscar artigos…" autoComplete="off" />
            <kbd>Esc</kbd>
          </form>
          <div className="search-results" id="searchResults" />
        </div>
      </div>
      {children}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <a className="brand brand-light" href={homeHref}>
              {logoUrl ? <img src={logoUrl} alt={tenant.name} width="56" height="42" style={{ objectFit: 'contain' }} /> : null}
              <span className="brand-text"><strong>{siteTitle}</strong><small>{tagline}</small></span>
            </a>
            <p>{description}</p>
          </div>
          <div>
            <h3>Categorias</h3>
            <ul>{cats.map((c) => <li key={c.slug}><a href={catHref(c.slug)}>{c.name}</a></li>)}</ul>
          </div>
          <div>
            <h3>Explore</h3>
            <ul>
              <li><a href={homeHref}>Últimos artigos</a></li>
              <li><a href={searchHref}>Buscar no blog</a></li>
              <li><a href="/feed.xml">Feed RSS</a></li>
              <li><a href="/sitemap.xml">Mapa do site</a></li>
            </ul>
          </div>
          <div className="footer-cta">
            <h3>{tenant.site_tagline || 'Conecte-se conosco'}</h3>
            <p>Acesse nossos serviços e conheça as novidades.</p>
            <a className="btn btn-accent" href={contactHref} target="_blank" rel="noopener">{contactLabel}</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} {tenant.name}. Todos os direitos reservados.</span>
          <a href="#topo" id="toTop" className="to-top">Voltar ao topo ↑</a>
        </div>
      </footer>
      {flowConfig && flowConfig.active && (
        <WhatsAppFlowWidget tenant={tenant} flowConfig={flowConfig} />
      )}
      <Script src="/main.js" strategy="afterInteractive" />
    </div>
  );
}

export { CAT_ICONS };
