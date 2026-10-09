import { json, route } from '@/lib/api.js';
import { refineTrainingField, aiConfigured } from '@/lib/ai.js';
import { getTenantById } from '@/lib/tenant.js';

export const maxDuration = 45;

export const POST = route(async ({ req, user }) => {
  if (!aiConfigured()) {
    return json({ error: 'A chave da IA (GEMINI_API_KEY) não está configurada.' }, 400);
  }

  const { fieldKey, fieldLabel, currentValue, currentTraining } = await req.json().catch(() => ({}));
  if (!fieldKey) return json({ error: 'Identificador do campo obrigatório.' }, 400);

  const tenant = user.tenant_id ? await getTenantById(user.tenant_id) : null;
  const brandName = tenant?.name || tenant?.site_title || 'Blog Corporativo';

  const refined = await refineTrainingField({
    fieldKey,
    fieldLabel: fieldLabel || fieldKey,
    currentValue,
    brandName,
    currentTraining: currentTraining || {},
  });

  return json({ ok: true, refined });
}, { admin: true });
