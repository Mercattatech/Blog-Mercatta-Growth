import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/guard.js';
import { getTenantById, updateTenant, getDefaultTenant } from '@/lib/tenant.js';

export async function GET() {
  const user = await requireUser({ admin: true });
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  let tenantId = user.tenant_id;
  if (!tenantId) {
    const def = await getDefaultTenant();
    tenantId = def?.id;
  }

  const tenant = await getTenantById(tenantId);
  return NextResponse.json({ tenant });
}

export async function PATCH(req) {
  const user = await requireUser({ admin: true });
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const isSuper = user.role === 'superadmin' || user.email === 'admin@grupomercatta.com.br';
  let tenantId = (isSuper && body.tenant_id) ? Number(body.tenant_id) : user.tenant_id;
  if (!tenantId) {
    const def = await getDefaultTenant();
    tenantId = def?.id;
  }
  if (!tenantId) return NextResponse.json({ error: 'Nenhum blog associado' }, { status: 400 });
  try {
    const updated = await updateTenant(tenantId, {
      site_title: body.site_title,
      site_tagline: body.site_tagline,
      site_description: body.site_description,
      primary_color: body.primary_color,
      accent_color: body.accent_color,
      button_color: body.button_color,
      button_text_color: body.button_text_color,
      bg_color: body.bg_color,
      hero_bg_color: body.hero_bg_color,
      logo_url: body.logo_url,
      favicon_url: body.favicon_url,
      theme_config: body.theme_config,
      whatsapp: body.whatsapp,
      contact_email: body.contact_email,
    });
    return NextResponse.json({ ok: true, tenant: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
