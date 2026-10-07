import { ResetForm } from '@/components/admin/AuthForms.js';

export const metadata = { title: 'Nova senha', referrer: 'no-referrer' };

export default async function ResetPage({ searchParams }) {
  const sp = await searchParams;
  return <ResetForm token={typeof sp?.token === 'string' ? sp.token : ''} />;
}
