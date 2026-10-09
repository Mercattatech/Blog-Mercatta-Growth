import { requireAdmin } from '@/lib/guard.js';
import { getTenantById } from '@/lib/tenant.js';
import McpManager from '@/components/admin/McpManager.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conexão MCP (IA Externa) — Painel' };

export default async function McpPage() {
  const user = await requireAdmin();
  const tenantId = user.tenant_id || 1;
  const tenant = await getTenantById(tenantId);

  return <McpManager tenant={tenant} />;
}
