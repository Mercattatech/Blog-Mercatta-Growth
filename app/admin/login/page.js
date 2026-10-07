import { redirect } from 'next/navigation';
import { optionalUser } from '@/lib/guard.js';
import { LoginForm } from '@/components/admin/AuthForms.js';

export const metadata = { title: 'Entrar' };

export default async function LoginPage() {
  if (await optionalUser()) redirect('/admin/');
  return <LoginForm />;
}
