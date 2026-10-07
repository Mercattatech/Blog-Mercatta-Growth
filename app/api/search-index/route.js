import { getSearchIndex } from '@/lib/posts';

export const revalidate = 60;

export async function GET() {
  const data = await getSearchIndex().catch(() => []);
  return Response.json(data, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
