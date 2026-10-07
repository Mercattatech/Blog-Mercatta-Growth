import { CategoryPage, categoryMetadata } from '@/components/CategoryPage';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return categoryMetadata(slug, 1);
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <CategoryPage slug={slug} page={1} />;
}
