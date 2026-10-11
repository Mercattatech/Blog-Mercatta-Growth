import { json, route } from '@/lib/api.js';
import { COVER_PRESETS } from '@/lib/coverPresets.js';
import { renderPostCover } from '@/lib/covers.js';
import { suggestCoverWithAI } from '@/lib/ai.js';
import { getTenantById, getDefaultTenant } from '@/lib/tenant.js';

export const maxDuration = 60;

async function resolveTenant(user) {
  if (user?.tenant) return user.tenant;
  if (user?.tenant_id) {
    const t = await getTenantById(user.tenant_id);
    if (t) return t;
  }
  return await getDefaultTenant();
}

export const GET = route(async ({ user }) => {
  const tenant = await resolveTenant(user);
  return json({ presets: COVER_PRESETS, tenant });
});

export const POST = route(async ({ req, user }) => {
  const body = await req.json().catch(() => ({}));
  const { action = 'render' } = body;
  const tenant = await resolveTenant(user);

  if (action === 'suggest') {
    const { title = '', excerpt = '', category_name = '' } = body;
    if (!title.trim()) return json({ error: 'Título é obrigatório para sugestão de capa.' }, 400);

    let suggestion = null;
    try {
      suggestion = await suggestCoverWithAI({ title, excerpt, category_name, tenant });
    } catch (err) {
      console.warn('[covers-api] suggestCoverWithAI indisponível, gerando sugestão local:', err.message);
      const words = title.trim().split(/\s+/);
      const splitIdx = Math.min(3, Math.max(1, Math.floor(words.length / 3)));
      suggestion = {
        highlight_text: words.slice(0, splitIdx).join(' ').toUpperCase(),
        main_text: words.slice(splitIdx).join(' ').toUpperCase() || title.toUpperCase(),
        preset_id: 'tech_innovation',
        cover_alt: `${title} - ${tenant?.name || 'Mercatta'}`,
      };
    }

    return json({ suggestion, presets: COVER_PRESETS, tenant });
  }

  if (action === 'render') {
    const {
      bgSource = 'tech_innovation',
      highlightText = '',
      mainText = '',
      template = 'modern',
      badgePos = 'bottom-right',
    } = body;

    const result = await renderPostCover({
      bgSource,
      highlightText,
      mainText,
      template,
      badgePos,
      tenant,
    });

    return json({ ok: true, cover: result });
  }

  return json({ error: 'Ação inválida.' }, 400);
});
