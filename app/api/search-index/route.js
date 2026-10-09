import { getSearchIndex } from '@/lib/posts';
import { getCurrentTenant } from '@/lib/currentTenant';
import { getTenantBySlug } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const tenantSlug = url.searchParams.get('tenant');
    let tenantId = null;
    if (tenantSlug) {
      const t = await getTenantBySlug(tenantSlug);
      if (t) tenantId = t.id;
    }
    if (!tenantId) {
      const { tenant } = await getCurrentTenant();
      if (tenant) tenantId = tenant.id;
    }
    const data = await getSearchIndex(tenantId).catch(() => []);
    return Response.json(data);
  } catch (e) {
    return Response.json([]);
  }
}

