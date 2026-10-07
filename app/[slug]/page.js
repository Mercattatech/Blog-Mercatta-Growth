import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { Card, CtaBanner, Cover, Pill, Sidebar, bgStyle } from '@/components/Parts';
import { getAdjacent, getPostBySlug, getRelated } from '@/lib/posts';
import { MAIN_SITE, extractToc, fdate, isoDay, siteUrl, trunc } from '@/lib/content';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug).catch(() => null);
  if (!post) return {};
  const desc = post.seo_description || post.excerpt;
  return {
    title: post.seo_title || post.title,
    description: trunc(desc, 160),
    alternates: { canonical: `/${post.slug}/` },
    openGraph: {
      type: 'article', title: post.seo_title || post.title, description: trunc(desc, 200), url: `/${post.slug}/`,
      publishedTime: new Date(post.publish_at).toISOString(), modifiedTime: new Date(post.updated_at).toISOString(),
      images: post.cover_url ? [post.cover_url] : undefined, locale: 'pt_BR', siteName: 'Blog Braziw',
    },
    twitter: { card: 'summary_large_image' },
    keywords: [post.focus_keyword, ...(post.secondary_keywords || []), ...(post.tags || [])].filter(Boolean),
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const [related, adj] = await Promise.all([getRelated(post, 3), getAdjacent(post)]);
  const toc = extractToc(post.content);
  const showToc = toc.filter((t) => t.level === '2').length >= 3 || toc.length >= 4;
  const url = `${siteUrl()}/${post.slug}/`;
  const cat = post.cat;
  const author = post.author_id ? post.author_name : 'Equipe Braziw';
  const faq = (post.faq || []).filter((f) => f.q && f.a);
  const shareText = encodeURIComponent(post.title);

  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.seo_description || post.excerpt,
      datePublished: new Date(post.publish_at).toISOString(), dateModified: new Date(post.updated_at).toISOString(), inLanguage: 'pt-BR',
      mainEntityOfPage: url, wordCount: post.word_count,
      keywords: [post.focus_keyword, ...(post.secondary_keywords || [])].filter(Boolean).join(', ') || undefined,
      articleSection: cat?.name,
      image: post.cover_url ? [post.cover_url.startsWith('http') ? post.cover_url : `${siteUrl()}${post.cover_url}`] : undefined,
      author: { '@type': post.author_id ? 'Person' : 'Organization', name: author, url: MAIN_SITE },
      publisher: { '@type': 'Organization', name: 'Braziw', url: MAIN_SITE, logo: { '@type': 'ImageObject', url: `${siteUrl()}/img/braziw-lg.png` } },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${siteUrl()}/` },
        ...(cat ? [{ '@type': 'ListItem', position: 2, name: cat.name, item: `${siteUrl()}/categoria/${cat.slug}/` }] : []),
        { '@type': 'ListItem', position: cat ? 3 : 2, name: post.title, item: url },
      ],
    },
    ...(faq.length ? [{
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    }] : []),
  ];

  return (
    <Shell active={cat?.slug}>
      <article className="post">
        <header className="post-hero">
          <div className="container post-hero-inner">
            <nav className="breadcrumb" aria-label="Você está em">
              <a href="/">Início</a><span>/</span>{cat && <a href={`/categoria/${cat.slug}/`}>{cat.name}</a>}
            </nav>
            <Pill cat={cat} glass />
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
            {(post.cover_url || post.cover_thumb) && (
              <figure className="post-cover fit" style={bgStyle(post)}><Cover post={post} small={false} eager /></figure>
            )}
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
              <div className="tags">{post.tags.map((t) => <a key={t} className="tag" href={`/busca/?q=${encodeURIComponent(t)}`}>#{t}</a>)}</div>
            )}
            <div className="share" aria-label="Compartilhar">
              <span>Compartilhar</span>
              <a className="sh sh-wa" href={`https://wa.me/?text=${shareText}%20${url}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a className="sh sh-fb" href={`https://www.facebook.com/sharer/sharer.php?u=${url}`} target="_blank" rel="noopener noreferrer">Facebook</a>
              <a className="sh sh-x" href={`https://twitter.com/intent/tweet?url=${url}&text=${shareText}`} target="_blank" rel="noopener noreferrer">X</a>
              <button className="sh sh-copy" type="button" data-copy={url}>Copiar link</button>
            </div>
            <div className="post-nav">
              {adj.older && <a className="pn pn-prev" href={`/${adj.older.slug}/`}><small>← Anterior</small><strong>{trunc(adj.older.title, 80)}</strong></a>}
              {adj.newer && <a className="pn pn-next" href={`/${adj.newer.slug}/`}><small>Próximo →</small><strong>{trunc(adj.newer.title, 80)}</strong></a>}
            </div>
            <CtaBanner />
            <section className="related">
              <div className="section-head"><h2>Continue lendo</h2></div>
              <div className="grid grid-3">{related.map((p, i) => <Card key={p.id} post={p} delay={i * 90} />)}</div>
            </section>
          </main>
          <Sidebar excludeId={post.id} />
        </div>
      </article>
      {jsonLd.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />)}
    </Shell>
  );
}
