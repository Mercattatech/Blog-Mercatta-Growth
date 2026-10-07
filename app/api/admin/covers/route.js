import { json, route } from '@/lib/api.js';
import { COVER_PRESETS } from '@/lib/coverPresets.js';
import { renderBraziwCover } from '@/lib/covers.js';
import { suggestCoverWithAI } from '@/lib/ai.js';

export const maxDuration = 60;

export const GET = route(async () => {
  return json({ presets: COVER_PRESETS });
});

export const POST = route(async ({ req }) => {
  const body = await req.json().catch(() => ({}));
  const { action = 'render' } = body;

  if (action === 'suggest') {
    const { title, excerpt, category_name } = body;
    if (!title) return json({ error: 'Título é obrigatório para sugestão de capa.' }, 400);
    const suggestion = await suggestCoverWithAI({ title, excerpt, category_name });
    return json({ suggestion, presets: COVER_PRESETS });
  }

  if (action === 'render') {
    const {
      bgSource = 'bistro',
      highlightText = '',
      mainText = '',
      template = 'classic_torn',
      badgePos = 'bottom-right',
    } = body;

    const result = await renderBraziwCover({
      bgSource,
      highlightText,
      mainText,
      template,
      badgePos,
    });

    return json({ ok: true, cover: result });
  }

  return json({ error: 'Ação inválida.' }, 400);
});
