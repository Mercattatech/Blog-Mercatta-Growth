import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { Card, Pagination, Sidebar } from '@/components/Parts';
import { countVisible, getAllCategories, listVisible } from '@/lib/posts';
import { CAT_ICONS, PER_PAGE } from '@/lib/content';
import { getCurrentTenant } from '@/lib/currentTenant';

export async function CategoryPage({ slug, page = 1 }) {
  const { tenant } = await getCurrentTenant();
  const cats = await getAllCategories(tenant?.id);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) notFound();
  const total = await countVisible(slug, tenant?.id);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (page > pages || page < 1) notFound();
  const posts = await listVisible({ limit: PER_PAGE, offset: (page - 1) * PER_PAGE, categorySlug: slug, tenantId: tenant?.id });
  const tenantSlug = tenant?.slug;
  const tenantQuery = (tenantSlug && tenantSlug !== 'braziw') ? `?tenant=${tenantSlug}` : '';
  const homeHref = `/${tenantQuery}`;

  return (
    <Shell active={slug} tenant={tenant}>
      <section className="page-hero">
        <div className="container">
          <nav className="breadcrumb" aria-label="Você está em"><a href={homeHref}>Início</a><span>/</span><span>Categorias</span></nav>
          <span className="eyebrow">{CAT_ICONS[slug] || '✦'} Categoria</span>
          <h1>{cat.name}</h1>
          <p>{total} artigos publicados</p>
        </div>
      </section>
      <main id="conteudo" className="container layout">
        <div className="main-col">
          <div className="grid">{posts.map((p, i) => <Card key={p.id} post={p} delay={(i % 3) * 90} tenant={tenant} />)}</div>
          <Pagination base={`/categoria/${slug}/`} page={page} total={pages} tenant={tenant} />
        </div>
        <Sidebar tenantId={tenant?.id} tenant={tenant} />
      </main>
    </Shell>
  );
}

export async function categoryMetadata(slug, page = 1) {
  const { tenant } = await getCurrentTenant();
  const cats = await getAllCategories(tenant?.id);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return {};
  const canonical = page === 1 ? `/categoria/${slug}/` : `/categoria/${slug}/pagina/${page}/`;
  const icon = tenant?.favicon_url || tenant?.logo_url || '/img/logo.png';
  return {
    title: page === 1 ? cat.name : `${cat.name} — página ${page}`,
    description: `Artigos da categoria ${cat.name} no blog ${tenant?.name || 'Oficial'}.`,
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
    alternates: { canonical },
  };
}
