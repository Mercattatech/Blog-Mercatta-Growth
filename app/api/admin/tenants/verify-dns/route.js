import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/guard.js';
import { verifyDomainDNS, updateTenant, getTenantByDomain } from '@/lib/tenant.js';

export async function POST(req) {
  const user = await requireUser({ admin: true });
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { domain, tenantId } = await req.json().catch(() => ({}));
  if (!domain) return NextResponse.json({ error: 'Domínio não informado' }, { status: 400 });

  try {
    const result = await verifyDomainDNS(domain);
    if (result.verified && tenantId) {
      await updateTenant(tenantId, { domain_verified: true });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ verified: false, error: err.message }, { status: 500 });
  }
}
