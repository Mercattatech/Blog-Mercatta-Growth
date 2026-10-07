import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from './auth.js';

const current = cache(getUser);

/** Exige login em páginas do painel (e papel de admin quando pedido). */
export async function requireUser({ admin = false } = {}) {
  const user = await current();
  if (!user) redirect('/admin/login/');
  if (admin && user.role !== 'admin') redirect('/admin/');
  return user;
}

export const optionalUser = () => current();
