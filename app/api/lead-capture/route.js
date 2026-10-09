import { processLeadCapture } from '@/lib/whatsappFlow.js';
import { getCurrentTenant } from '@/lib/currentTenant.js';
import { getTenantBySlug } from '@/lib/tenant.js';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let tenantId = body.tenantId || body.tenant_id;

    if (!tenantId && body.tenant_slug) {
      const t = await getTenantBySlug(body.tenant_slug);
      if (t) tenantId = t.id;
    }

    if (!tenantId) {
      const { tenant } = await getCurrentTenant();
      if (tenant) tenantId = tenant.id;
    }

    if (!tenantId) {
      return Response.json({ error: 'Tenant não identificado.' }, { status: 400 });
    }

    const result = await processLeadCapture({
      tenantId: Number(tenantId),
      name: body.name,
      phone: body.phone,
      email: body.email,
      answers: body.answers || {},
      sourceUrl: body.sourceUrl || '',
    });

    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
