import { json, route } from '@/lib/api.js';
import { setImpersonatedTenant, clearImpersonatedTenant } from '@/lib/auth.js';
import { getTenantById } from '@/lib/tenant.js';

export const POST = route(async ({ req, user }) => {
  const isSuper = user.role === 'superadmin' || user.role === 'admin' || user.email === 'admin@grupomercatta.com.br';
  if (!isSuper) {
    return json({ error: 'Apenas administradores podem acessar painéis de clientes diretamente.' }, 403);
  }

  const { tenantId } = await req.json().catch(() => ({}));
  if (!tenantId) return json({ error: 'ID da empresa não informado.' }, 400);

  const tenant = await getTenantById(Number(tenantId));
  if (!tenant) return json({ error: 'Empresa não encontrada.' }, 404);

  await setImpersonatedTenant(tenant.id);
  return json({ ok: true, tenant, redirect: '/admin/' });
}, { admin: true });

export const DELETE = route(async ({ user }) => {
  const isSuper = user.role === 'superadmin' || user.role === 'admin' || user.email === 'admin@grupomercatta.com.br';
  if (!isSuper) {
    return json({ error: 'Não autorizado.' }, 403);
  }

  await clearImpersonatedTenant();
  return json({ ok: true, redirect: '/admin/tenants/' });
}, { admin: true });
