import { notFound } from 'next/navigation';
import { HomePage } from '@/components/HomePage';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { n } = await params;
  return { title: `Artigos — página ${n}`, alternates: { canonical: `/pagina/${n}/` } };
}

export default async function Page({ params }) {
  const { n } = await params;
  const page = Number(n);
  if (!Number.isInteger(page) || page < 2) notFound();
  return <HomePage page={page} />;
}
