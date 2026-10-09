import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/guard.js';
import { updateTenant, deleteTenant, getTenantById } from '@/lib/tenant.js';

export async function GET(req, { params }) {
  const user = await requireUser({ superadmin: true });
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { id } = await params;
  const tenant = await getTenantById(id);
  if (!tenant) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  return NextResponse.json({ tenant });
}

export async function PATCH(req, { params }) {
  const user = await requireUser({ superadmin: true });
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const updated = await updateTenant(id, body);
    return NextResponse.json({ ok: true, tenant: updated });
  } catch (err) {
    console.error('PATCH tenant error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const user = await requireUser({ superadmin: true });
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { id } = await params;

  try {
    const deleted = await deleteTenant(id);
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
