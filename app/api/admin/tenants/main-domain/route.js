import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/guard.js';
import { getMainNewsTenant, setMainNewsTenant } from '@/lib/tenant.js';

export async function GET() {
  const user = await requireUser({ superadmin: true });
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const mainTenant = await getMainNewsTenant();
  return NextResponse.json({ ok: true, mainTenant });
}

export async function POST(req) {
  const user = await requireUser({ superadmin: true });
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { tenant_id } = body;
  if (!tenant_id) return NextResponse.json({ error: 'tenant_id é obrigatório.' }, { status: 400 });

  try {
    const updated = await setMainNewsTenant(Number(tenant_id));
    return NextResponse.json({ ok: true, mainTenant: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
