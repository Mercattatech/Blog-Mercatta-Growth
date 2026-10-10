import { query, queryOne } from './db.js';

export const DEFAULT_TRAINING = {
  objective:
    'Atrair e educar pessoas interessadas no nosso segmento, gerando tráfego orgânico qualificado para a nossa empresa e conduzindo o leitor a conhecer nossos serviços.',
  audience:
    'Pessoas e empresas que buscam soluções práticas, novidades, dicas e produtos do nosso setor no Brasil.',
  tone:
    'Acolhedor, inspirador, confiável e didático, em português do Brasil. Frases curtas, exemplos práticos e explicações claras.',
  language: 'pt-BR',
  themes:
    'Dicas práticas, guias passo a passo, tendências do mercado, soluções comuns e novidades.',
  forbidden:
    'Política partidária, promessas milagrosas (ex.: "resultado em 24 horas"), informações falsas, estatísticas ou citações sem fonte confiável.',
  keywords:
    'guia, dicas, como funciona, serviços, soluções',
  style_rules:
    'Use títulos H2/H3 descritivos. Parágrafos de até 4 linhas. Listas quando fizer sentido. Evite clichês e exageros. Nunca invente fatos, datas, números, citações ou links.',
  cta:
    'Encerrar com um convite natural para conhecer a nossa empresa e entrar em contato com nossa equipe.',
  brand_facts:
    'Empresa consolidada e referência em qualidade e atendimento no seu segmento.',
  cover_prompt:
    'Fotografia profissional de alta qualidade editorial, iluminação suave e natural, contexto realista do segmento da empresa, pessoas reais em ambientes acolhedores e modernos. Sem ilustrações 3D, sem desenhos infantis, sem textos sobrepostos na foto.',
  article_length: 1200,
  ideas_count: 8,
  reference_post_ids: [],
  extra: '',
};

export async function getSetting(key, fallback = null, tenantId = null) {
  let row;
  if (tenantId) {
    row = await queryOne('SELECT value FROM settings WHERE key = $1 AND tenant_id = $2', [key, tenantId]);
    if (row) return row.value;
  }
  row = await queryOne('SELECT value FROM settings WHERE key = $1 AND (tenant_id = $2 OR tenant_id IS NULL) ORDER BY tenant_id DESC NULLS LAST LIMIT 1', [key, tenantId || null]);
  return row ? row.value : fallback;
}

export async function setSetting(key, value, tenantId = null) {
  if (tenantId) {
    const existing = await queryOne('SELECT 1 FROM settings WHERE key = $1 AND tenant_id = $2', [key, tenantId]);
    if (existing) {
      await query('UPDATE settings SET value = $1::jsonb, updated_at = now() WHERE key = $2 AND tenant_id = $3', [JSON.stringify(value), key, tenantId]);
    } else {
      await query('INSERT INTO settings (tenant_id, key, value, updated_at) VALUES ($1, $2, $3::jsonb, now())', [tenantId, key, JSON.stringify(value)]);
    }
  } else {
    await query(
      `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)]);
  }
}

export async function getTraining(tenantId = null) {
  let tenantFallback = DEFAULT_TRAINING;
  if (tenantId) {
    const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenant) {
      tenantFallback = {
        ...DEFAULT_TRAINING,
        objective: `Atrair e educar pessoas interessadas no segmento de ${tenant.name}, gerando autoridade e tráfego orgânico para ${tenant.name}.`,
        cta: `Encerrar com um convite amigável para conhecer o site de ${tenant.name} e falar conosco.`,
        brand_facts: `${tenant.name} — ${tenant.site_tagline || 'Referência no segmento'}.`,
        keywords: `${tenant.name}, soluções, como fazer, guia`,
      };
    }
  }
  return { ...tenantFallback, ...(await getSetting('ai_training', {}, tenantId)) };
}

export async function saveTraining(input, tenantId = null) {
  const current = await getTraining(tenantId);
  const t = { ...current };
  const str = (k, max = 4000) => { if (typeof input[k] === 'string') t[k] = input[k].trim().slice(0, max); };
  ['objective', 'audience', 'tone', 'themes', 'forbidden', 'keywords', 'style_rules', 'cta', 'brand_facts', 'extra'].forEach((k) => str(k));
  t.language = String(input.language || 'pt-BR').slice(0, 10);
  t.article_length = Math.min(3000, Math.max(500, Number(input.article_length) || 1200));
  t.ideas_count = Math.min(15, Math.max(3, Number(input.ideas_count) || 8));
  t.reference_post_ids = Array.isArray(input.reference_post_ids) ? input.reference_post_ids.map(Number).filter(Boolean).slice(0, 5) : [];
  await setSetting('ai_training', t, tenantId);
  return t;
}
