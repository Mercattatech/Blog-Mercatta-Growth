import { json } from '@/lib/api.js';
import { query, dbKind, getPostgresConnectionString } from '@/lib/db.js';
import { autoSeedIfEmpty } from '@/lib/seed.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const conn = getPostgresConnectionString();
  const envKeys = Object.keys(process.env).filter((k) =>
    k.includes('POSTGRES') || k.includes('DATABASE') || k.includes('STORAGE') || k.includes('SUPABASE')
  );

  let postsCount = 0;
  let categoriesCount = 0;
  let usersCount = 0;
  let adminExists = false;
  let dbError = null;
  let autoSeeded = false;

  try {
    const pRes = await query('SELECT count(*) as c FROM posts');
    postsCount = Number(pRes[0]?.c || 0);

    const cRes = await query('SELECT count(*) as c FROM categories');
    categoriesCount = Number(cRes[0]?.c || 0);

    // Se estiver vazio, popula automaticamente e limpa o cache da home
    if (postsCount === 0) {
      autoSeeded = await autoSeedIfEmpty({ query });
      try {
        const { revalidatePath } = await import('next/cache');
        revalidatePath('/', 'layout');
      } catch {}
      const pRes2 = await query('SELECT count(*) as c FROM posts');
      postsCount = Number(pRes2[0]?.c || 0);
      const cRes2 = await query('SELECT count(*) as c FROM categories');
      categoriesCount = Number(cRes2[0]?.c || 0);
    }

    const { ensureAdminUser } = await import('@/lib/seed.js');
    await ensureAdminUser({ query });

    const uRes = await query('SELECT count(*) as c FROM users');
    usersCount = Number(uRes[0]?.c || 0);

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@braziw.com.br').toLowerCase().trim();
    const adminCheck = await query('SELECT id FROM users WHERE lower(email) = $1', [adminEmail]);
    adminExists = adminCheck.length > 0;
  } catch (err) {
    dbError = err.message;
  }

  return json({
    ok: !dbError && postsCount > 0,
    posts_count: postsCount,
    categories_count: categoriesCount,
    users_count: usersCount,
    admin_exists: adminExists,
    has_auth_secret: Boolean(process.env.AUTH_SECRET || process.env.SUPABASE_JWT_SECRET),
    auto_seeded: autoSeeded,
    db_kind: await dbKind().catch(() => 'unknown'),
    has_postgres_env: Boolean(conn),
    detected_db_env_keys: envKeys,
    error: dbError,
  });
}
