import { headers, cookies } from 'next/headers';
import { resolveTenantFromHost, getMercattaHubTenant, getTenantById } from './tenant.js';
import { getUser } from './auth.js';

export async function getCurrentTenant() {
  try {
    const h = await headers();
    const c = await cookies();
    const host = h.get('x-tenant-host') || h.get('host') || 'localhost:3100';
    const override = h.get('x-tenant-override') || null;

    // 1. Override explícito por header
    if (override) {
      return await resolveTenantFromHost(host, override);
    }

    // 2. Cookie de impersonação de tenant (Super Admin ou troca de empresa)
    const impId = c.get('mercatta_impersonate_tenant')?.value;
    if (impId) {
      const impTenant = await getTenantById(Number(impId));
      if (impTenant) return { isHub: false, tenant: impTenant };
    }

    // 3. Usuário logado em ambiente de desenvolvimento local (localhost)
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      const user = await getUser();
      if (user?.tenant_id) {
        const userTenant = user.tenant || await getTenantById(user.tenant_id);
        if (userTenant) return { isHub: false, tenant: userTenant };
      }
    }

    // 4. Resolução padrão por Host
    return await resolveTenantFromHost(host, null);
  } catch (err) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('Dynamic server usage')) {
      throw err;
    }
    return { isHub: true, tenant: await getMercattaHubTenant() };
  }
}
