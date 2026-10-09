import crypto from 'node:crypto';
import { requireAdmin } from '@/lib/guard.js';
import { updateTenant, getTenantById } from '@/lib/tenant.js';

export async function POST(req) {
  try {
    const user = await requireAdmin();
    const tenantId = user.tenant_id || 1;
    const newKey = `mcp_${crypto.randomBytes(18).toString('hex')}`;
    const updated = await updateTenant(tenantId, { mcp_api_key: newKey });
    return Response.json({ ok: true, mcp_api_key: updated.mcp_api_key });
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 });
  }
}
