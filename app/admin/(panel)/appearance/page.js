import { requireUser } from '@/lib/guard.js';
import { getTenantById, getDefaultTenant, listTenants, getTenantBySlug } from '@/lib/tenant.js';
import { AppearanceForm } from './AppearanceForm.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Personalizar Cores & Aparência do Blog — Painel',
};

export default async function AppearancePage({ searchParams }) {
  const user = await requireUser({ admin: true });
  const sp = await searchParams;

  const isSuper = user.role === 'superadmin' || user.email === 'admin@grupomercatta.com.br';

  let tenant = null;
  if (isSuper && sp?.tenant_id) {
    tenant = await getTenantById(Number(sp.tenant_id));
  } else if (isSuper && sp?.tenant) {
    tenant = await getTenantBySlug(sp.tenant);
  } else if (user.tenant_id) {
    tenant = await getTenantById(user.tenant_id);
  }

  if (!tenant) {
    tenant = await getDefaultTenant();
  }

  const allTenants = isSuper ? await listTenants().catch(() => []) : [];

  return (
    <AppearanceForm
      initialTenant={JSON.parse(JSON.stringify(tenant || {}))}
      allTenants={JSON.parse(JSON.stringify(allTenants || []))}
      isSuperAdmin={isSuper}
    />
  );
}
