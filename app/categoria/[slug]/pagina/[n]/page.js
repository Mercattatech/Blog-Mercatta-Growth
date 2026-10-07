import { notFound } from 'next/navigation';
import { CategoryPage, categoryMetadata } from '@/components/CategoryPage';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug, n } = await params;
  return categoryMetadata(slug, Number(n));
}

export default async function Page({ params }) {
  const { slug, n } = await params;
  const page = Number(n);
  if (!Number.isInteger(page) || page < 2) notFound();
  return <CategoryPage slug={slug} page={page} />;
}
