import { requireUser } from '@/lib/guard.js';
import { listTenants } from '@/lib/tenant.js';
import { TenantsManager } from './TenantsManager.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Gestão de Empresas e Domínios — Mercatta SaaS',
};

export default async function TenantsPage() {
  await requireUser({ superadmin: true });
  const tenants = await listTenants();
  return <TenantsManager initialTenants={tenants} />;
}
