import { headers, cookies } from 'next/headers';
import { resolveTenantFromHost, getMercattaHubTenant, getTenantBySlug, MERCATTA_DOMAIN } from './tenant.js';

/**
 * Tenant das páginas PÚBLICAS do blog.
 * Ordem: ?tenant= / cookie de pré-visualização (validado no middleware) → domínio.
 * A empresa em que o Super Admin "entrou no painel" (impersonação) e o tenant do
 * usuário logado NÃO influenciam o blog público — eles valem só dentro do /admin.
 */
export async function getCurrentTenant() {
  try {
    const h = await headers();
    const c = await cookies();
    const host = h.get('x-tenant-host') || h.get('host') || 'localhost:3100';
    const override = h.get('x-tenant-override') || null;

    // 1. Override explícito (?tenant=slug ou cookie de navegação interna)
    if (override) {
      return await resolveTenantFromHost(host, override);
    }

    const cleanHost = host.toLowerCase().trim().split(':')[0];
    const isDirectHubDomain = cleanHost === MERCATTA_DOMAIN || cleanHost === `www.${MERCATTA_DOMAIN}` || cleanHost === `hub.${MERCATTA_DOMAIN}`;

    // 2. Cookie de navegação persistido (ignorado se o middleware o descartou)
    const devCookieTenant = h.get('x-tenant-cookie-cleared') ? null : c.get('mercatta_dev_tenant')?.value;
    if (devCookieTenant && !isDirectHubDomain) {
      const devTenant = await getTenantBySlug(devCookieTenant);
      if (devTenant) return { isHub: false, tenant: devTenant };
    }

    // 3. Resolução padrão por domínio
    return await resolveTenantFromHost(host, null);
  } catch (err) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('Dynamic server usage')) {
      throw err;
    }
    return { isHub: true, tenant: await getMercattaHubTenant() };
  }
}
