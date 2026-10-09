import { NextResponse } from 'next/server';
import { getUser, sameOrigin } from './auth.js';

export const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Envolve um handler de API do painel: valida mesma origem (CSRF) em métodos mutáveis,
 * exige login (e papel de admin quando pedido) e converte erros em JSON amigável.
 */
export function route(handler, { admin = false, auth = true } = {}) {
  return async (req, ctx) => {
    try {
      if (req.method !== 'GET' && !(await sameOrigin())) return json({ error: 'Origem inválida.' }, 403);
      let user = null;
      if (auth) {
        user = await getUser();
        if (!user) return json({ error: 'Sessão expirada. Entre novamente.' }, 401);
        if (admin && user.role !== 'admin' && user.role !== 'superadmin') return json({ error: 'Apenas administradores.' }, 403);
      }
      const params = ctx?.params ? await ctx.params : {};
      return await handler({ req, user, params });
    } catch (e) {
      const status = e.status || 500;
      console.error('[api error]', e);
      return json({ error: e.message || 'Erro interno. Tente novamente.' }, status);
    }
  };
}

export async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

export const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 200;
