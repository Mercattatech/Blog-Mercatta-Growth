import { requireAdmin } from '@/lib/guard.js';
import { getTenantById, listTenants } from '@/lib/tenant.js';
import { getTenantFlowConfig } from '@/lib/whatsappFlow.js';
import { query } from '@/lib/db.js';
import WhatsAppFlowManager from '@/components/admin/WhatsAppFlowManager.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'WhatsApp Lead Flow — Painel' };

export default async function WhatsAppFlowPage({ searchParams }) {
  const user = await requireAdmin();
  const isSuper = user.role === 'superadmin';
  const resolvedSearchParams = await searchParams;

  let allTenants = [];
  let tenantId = user.tenant_id || 1;

  if (isSuper) {
    allTenants = await listTenants();
    if (resolvedSearchParams?.tenant_id) {
      tenantId = Number(resolvedSearchParams.tenant_id);
    } else if (allTenants.length > 0) {
      tenantId = allTenants[0].id;
    }
  }

  const tenant = await getTenantById(tenantId);
  const flowConfig = await getTenantFlowConfig(tenantId);
  const hasAccess = isSuper || Boolean(tenant?.has_whatsapp_flow);

  const leads = await query(`
    SELECT id, name, phone, email, answers, source_url, webhook_sent, webhook_response, created_at
    FROM leads
    WHERE tenant_id = $1
    ORDER BY created_at DESC
    LIMIT 100
  `, [tenantId]);

  return (
    <WhatsAppFlowManager
      user={user}
      isSuper={isSuper}
      tenants={allTenants}
      currentTenant={tenant}
      initialData={{
        has_access: hasAccess,
        config: flowConfig,
        leads,
        tenant_id: tenantId,
      }}
    />
  );
}
