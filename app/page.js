import { HomePage } from '@/components/HomePage';

export const revalidate = 60;

export const metadata = {
  title: { absolute: 'Blog Braziw — Tudo sobre Francês' },
  alternates: { canonical: '/' },
};

export default function Page() {
  return <HomePage page={1} />;
}
