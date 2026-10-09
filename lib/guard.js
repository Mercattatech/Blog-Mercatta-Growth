import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from './auth.js';

const current = cache(getUser);

/** Exige login em páginas do painel (e papel de admin ou superadmin quando pedido). */
export async function requireUser({ admin = false, superadmin = false } = {}) {
  const user = await current();
  if (!user) redirect('/admin/login/');
  const isSuper = user.role === 'superadmin'
    || (user.role === 'admin' && (user.email === 'admin@grupomercatta.com.br' || user.tenant_id === 1 || user.tenant?.slug === 'mercatta'));
  if (superadmin && !isSuper) redirect('/admin/');
  if (admin && user.role !== 'admin' && !isSuper) redirect('/admin/');
  return user;
}

export async function requireAdmin() {
  return requireUser({ admin: true });
}

export async function requireSuperAdmin() {
  return requireUser({ superadmin: true });
}

export const optionalUser = () => current();
