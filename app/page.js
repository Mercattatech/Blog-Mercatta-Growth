import { HomePage } from '@/components/HomePage';
import { MercattaHubLanding } from '@/components/MercattaHubLanding';
import { getCurrentTenant } from '@/lib/currentTenant';
import { listTenants } from '@/lib/tenant';
import { getUser } from '@/lib/auth';

export const revalidate = 0;

export async function generateMetadata() {
  const { isHub, tenant } = await getCurrentTenant();
  if (isHub) {
    return {
      title: 'Grupo Mercatta — Blogs Inteligentes para Empresas (SaaS Multi-Tenant)',
      description: 'Tenha um blog corporativo de alta performance no seu próprio domínio com artigos gerados por Inteligência Artificial (Google Gemini) e SEO otimizado.',
      icons: { icon: '/img/logo.png', shortcut: '/img/logo.png', apple: '/img/logo.png' }
    };
  }
  const favicon = tenant?.favicon_url || tenant?.logo_url || '/img/logo.png';
  return {
    title: { absolute: `${tenant?.site_title || tenant?.name || 'Blog'} — ${tenant?.site_tagline || 'Artigos e Dicas'}` },
    description: tenant?.site_description || 'Artigos, novidades e informações exclusivas.',
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
  };
}

export default async function Page() {
  const { isHub, tenant } = await getCurrentTenant();

  if (isHub) {
    const tenants = await listTenants().catch(() => []);
    const user = await getUser().catch(() => null);
    return <MercattaHubLanding tenants={tenants} user={user} />;
  }

  return <HomePage page={1} tenant={tenant} />;
}
