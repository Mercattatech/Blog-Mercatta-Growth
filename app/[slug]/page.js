import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { Card, CtaBanner, Cover, Pill, Sidebar, bgStyle } from '@/components/Parts';
import { getAdjacent, getPostBySlug, getRelated } from '@/lib/posts';
import { MAIN_SITE, extractToc, fdate, isoDay, siteUrl, trunc } from '@/lib/content';
import { getCurrentTenant } from '@/lib/currentTenant';
import { getTenantById } from '@/lib/tenant';
import { getUser } from '@/lib/auth';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { tenant } = await getCurrentTenant();
  const user = await getUser().catch(() => null);
  const isStaff = !!(user && (user.role === 'admin' || user.role === 'superadmin'));
  const post = await getPostBySlug(slug, tenant?.id, isStaff).catch(() => null);
  if (!post) return {};
  const desc = post.seo_description || post.excerpt;
  const siteName = post.tenant_name || tenant?.site_title || tenant?.name || 'Blog';
  const icon = post.tenant_favicon_url || tenant?.favicon_url || post.tenant_logo_url || tenant?.logo_url || '/img/logo.png';
  return {
    title: post.seo_title || post.title,
    description: trunc(desc, 160),
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
    alternates: { canonical: `/${post.slug}/` },
    openGraph: {
      type: 'article',
      title: post.seo_title || post.title,
      description: trunc(desc, 200),
      url: `/${post.slug}/`,
      publishedTime: post.publish_at ? new Date(post.publish_at).toISOString() : new Date().toISOString(),
      modifiedTime: post.updated_at ? new Date(post.updated_at).toISOString() : new Date().toISOString(),
      images: post.cover_url ? [post.cover_url] : undefined,
      locale: 'pt_BR',
      siteName,
    },
    twitter: { card: 'summary_large_image' },
    keywords: [post.focus_keyword, ...(post.secondary_keywords || []), ...(post.tags || [])].filter(Boolean),
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const { tenant } = await getCurrentTenant();
  const user = await getUser().catch(() => null);
  const isStaff = !!(user && (user.role === 'admin' || user.role === 'superadmin'));

  const post = await getPostBySlug(slug, tenant?.id, isStaff);
  if (!post) notFound();

  // Resolve o tenant real do artigo se for diferente do host
  let effectiveTenant = tenant;
  if (post.tenant_id && (!effectiveTenant || effectiveTenant.id !== post.tenant_id)) {
    const postTenant = await getTenantById(post.tenant_id);
    if (postTenant) effectiveTenant = postTenant;
  }

  const [related, adj] = await Promise.all([
    getRelated(post, 3, effectiveTenant?.id),
    getAdjacent(post, effectiveTenant?.id),
  ]);

  const toc = extractToc(post.content);
  const showToc = toc.filter((t) => t.level === '2').length >= 3 || toc.length >= 4;
  const url = `${siteUrl()}/${post.slug}/`;
  const cat = post.cat;
  const isBraziw = effectiveTenant?.slug === 'braziw';
  const author = post.author_id ? post.author_name : (isBraziw ? 'Equipe Braziw' : (effectiveTenant?.name || 'Redação'));
  const faq = (post.faq || []).filter((f) => f.q && f.a);
  const shareText = encodeURIComponent(post.title);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.seo_description || post.excerpt,
      datePublished: post.publish_at ? new Date(post.publish_at).toISOString() : new Date().toISOString(),
      dateModified: post.updated_at ? new Date(post.updated_at).toISOString() : new Date().toISOString(),
      inLanguage: 'pt-BR',
      mainEntityOfPage: url,
      wordCount: post.word_count,
      keywords: [post.focus_keyword, ...(post.secondary_keywords || [])].filter(Boolean).join(', ') || undefined,
      articleSection: cat?.name,
      image: post.cover_url ? [post.cover_url.startsWith('http') ? post.cover_url : `${siteUrl()}${post.cover_url}`] : undefined,
      author: { '@type': post.author_id ? 'Person' : 'Organization', name: author, url: siteUrl() },
      publisher: { '@type': 'Organization', name: effectiveTenant?.name || 'Blog', url: siteUrl() },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${siteUrl()}/` },
        ...(cat ? [{ '@type': 'ListItem', position: 2, name: cat.name, item: `${siteUrl()}/categoria/${cat.slug}/` }] : []),
        { '@type': 'ListItem', position: cat ? 3 : 2, name: post.title, item: url },
      ],
    },
    ...(faq.length ? [{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    }] : []),
  ];

  const tenantSlug = effectiveTenant?.slug;
  const tenantQuery = (tenantSlug && tenantSlug !== 'braziw') ? `?tenant=${tenantSlug}` : '';
  const homeHref = `/${tenantQuery}`;
  const catHref = (cSlug) => `/categoria/${cSlug}/${tenantQuery}`;

  return (
    <Shell active={cat?.slug} tenant={effectiveTenant}>
      <article className="post">
        <header className="post-hero">
          <div className="container post-hero-inner">
            <nav className="breadcrumb" aria-label="Você está em">
              <a href={homeHref}>Início</a><span>/</span>{cat && <a href={catHref(cat.slug)}>{cat.name}</a>}
            </nav>
            <Pill cat={cat} glass tenant={effectiveTenant} />
            <h1>{post.title}</h1>
            <div className="meta meta-light meta-lg">
              <span className="avatar">{(author || 'B').charAt(0).toUpperCase()}</span>
              <span>Por <strong>{author}</strong></span><span className="dot" />
              <time dateTime={isoDay(post.publish_at)}>{fdate(post.publish_at)}</time><span className="dot" />
              <span>{post.minutes} min de leitura</span>
            </div>
          </div>
        </header>
        <div className="container layout layout-post">
          <main id="conteudo" className="main-col">
            <figure className="post-cover fit" style={bgStyle(post)}>
              <Cover post={post} small={false} eager tenant={effectiveTenant} />
            </figure>
            {showToc && (
              <details className="toc" open>
                <summary>Neste artigo</summary>
                <ol>{toc.map((t) => <li key={t.id} className={`toc-${t.level}`}><a href={`#${t.id}`}>{t.text}</a></li>)}</ol>
              </details>
            )}
            <div className="prose" id="prose" dangerouslySetInnerHTML={{ __html: post.content }} />
            {faq.length > 0 && (
              <section className="faq" aria-labelledby="faq-title">
                <h2 id="faq-title">Perguntas frequentes</h2>
                {faq.map((f, i) => (
                  <details key={i} className="faq-item" open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>
                ))}
              </section>
            )}
            {(post.tags || []).length > 0 && (
              <div className="tags">{post.tags.map((t) => <a key={t} className="tag" href={`/busca/?q=${encodeURIComponent(t)}${tenantQuery ? `&tenant=${tenantSlug}` : ''}`}>#{t}</a>)}</div>
            )}
            <div className="share" aria-label="Compartilhar">
              <span>Compartilhar</span>
              <a className="sh sh-wa" href={`https://wa.me/?text=${shareText}%20${url}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a className="sh sh-fb" href={`https://www.facebook.com/sharer/sharer.php?u=${url}`} target="_blank" rel="noopener noreferrer">Facebook</a>
              <a className="sh sh-x" href={`https://twitter.com/intent/tweet?url=${url}&text=${shareText}`} target="_blank" rel="noopener noreferrer">X</a>
              <button className="sh sh-copy" type="button" data-copy={url}>Copiar link</button>
            </div>
            <div className="post-nav">
              {adj.older && <a className="pn pn-prev" href={`/${adj.older.slug}/${tenantQuery}`}><small>← Anterior</small><strong>{trunc(adj.older.title, 80)}</strong></a>}
              {adj.newer && <a className="pn pn-next" href={`/${adj.newer.slug}/${tenantQuery}`}><small>Próximo →</small><strong>{trunc(adj.newer.title, 80)}</strong></a>}
            </div>
            {isBraziw && <CtaBanner />}
            <section className="related">
              <div className="section-head"><h2>Continue lendo</h2></div>
              <div className="grid grid-3">{related.map((p, i) => <Card key={p.id} post={p} delay={i * 90} tenant={effectiveTenant} />)}</div>
            </section>
          </main>
          <Sidebar excludeId={post.id} tenantId={effectiveTenant?.id} tenant={effectiveTenant} />
        </div>
      </article>
      {jsonLd.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />)}
      <script dangerouslySetInnerHTML={{ __html: `fetch('/api/track-view/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:${post.id},tenantId:${effectiveTenant?.id || 'null'}})}).catch(()=>{});` }} />
    </Shell>
  );
}
