import { requireUser } from '@/lib/guard.js';
import { listTenants, getMainNewsTenant } from '@/lib/tenant.js';
import { TenantsManager } from './TenantsManager.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Gestão de Empresas e Domínios — Mercatta SaaS',
};

export default async function TenantsPage() {
  await requireUser({ superadmin: true });
  const tenants = await listTenants();
  const mainNewsTenant = await getMainNewsTenant();
  return <TenantsManager initialTenants={tenants} initialMainTenantId={mainNewsTenant?.id || null} />;
}
