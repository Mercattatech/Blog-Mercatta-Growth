import { requireAdmin } from '@/lib/guard.js';
import { getTenantById, updateTenant } from '@/lib/tenant.js';
import { submitAllArticlesToGoogle } from '@/lib/googleSearch.js';

export async function GET(req) {
  try {
    const user = await requireAdmin();
    const tenantId = user.tenant_id || 1;
    const tenant = await getTenantById(tenantId);

    return Response.json({
      gtm_id: tenant.gtm_id || '',
      ga_id: tenant.ga_id || '',
      custom_head_scripts: tenant.custom_head_scripts || '',
      custom_body_scripts: tenant.custom_body_scripts || '',
      google_service_account_json: tenant.google_service_account_json || '',
      google_search_console_property: tenant.google_search_console_property || '',
      google_auto_index: tenant.google_auto_index ?? true,
      last_google_indexing_at: tenant.last_google_indexing_at,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(req) {
  try {
    const user = await requireAdmin();
    const tenantId = user.tenant_id || 1;
    const body = await req.json().catch(() => ({}));

    if (body.action === 'index_all') {
      const result = await submitAllArticlesToGoogle(tenantId);
      return Response.json(result);
    }

    const updated = await updateTenant(tenantId, {
      gtm_id: body.gtm_id,
      ga_id: body.ga_id,
      custom_head_scripts: body.custom_head_scripts,
      custom_body_scripts: body.custom_body_scripts,
      google_service_account_json: body.google_service_account_json,
      google_search_console_property: body.google_search_console_property,
      google_auto_index: body.google_auto_index,
    });

    return Response.json({ ok: true, tenant: updated });
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 });
  }
}
