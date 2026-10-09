import { requireAdmin } from '@/lib/guard.js';
import { getTenantById } from '@/lib/tenant.js';
import SeoTagsManager from '@/components/admin/SeoTagsManager.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'SEO, Google & Tags — Painel' };

export default async function SeoTagsPage() {
  const user = await requireAdmin();
  const tenantId = user.tenant_id || 1;
  const tenant = await getTenantById(tenantId);

  return (
    <SeoTagsManager
      initialData={{
        gtm_id: tenant?.gtm_id || '',
        ga_id: tenant?.ga_id || '',
        custom_head_scripts: tenant?.custom_head_scripts || '',
        custom_body_scripts: tenant?.custom_body_scripts || '',
        google_service_account_json: tenant?.google_service_account_json || '',
        google_search_console_property: tenant?.google_search_console_property || '',
        google_auto_index: tenant?.google_auto_index ?? true,
        last_google_indexing_at: tenant?.last_google_indexing_at,
      }}
    />
  );
}
