import { json, route } from '@/lib/api.js';
import { autoSeedIfEmpty } from '@/lib/seed.js';
import { query } from '@/lib/db.js';

export const maxDuration = 120;

export const POST = route(async ({ user }) => {
  if (user?.role !== 'admin') {
    return json({ error: 'Apenas administradores podem executar esta ação.' }, 403);
  }

  // Permite forçar recarga caso solicitado
  const db = { query };
  const seeded = await autoSeedIfEmpty(db);
  const countRes = await query('SELECT count(*) as c FROM posts');
  const total = Number(countRes[0]?.c || 0);

  return json({
    ok: true,
    seeded,
    total_posts: total,
    message: seeded
      ? `Banco de dados populado com sucesso (${total} artigos)!`
      : `O banco já continha dados (${total} artigos existentes).`,
  });
});
