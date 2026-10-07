import { query, queryOne } from './db.js';

export const DEFAULT_TRAINING = {
  objective:
    'Atrair e educar pessoas interessadas na França, na cultura francófona e no aprendizado do idioma francês, gerando tráfego orgânico qualificado para a Braziw — Idiomas e Intercâmbios — e conduzindo o leitor a conhecer os cursos e intercâmbios.',
  audience:
    'Brasileiros de 18 a 55 anos que estudam ou querem estudar francês, planejam viajar, estudar ou morar na França, ou simplesmente são fascinados pela cultura francesa.',
  tone:
    'Acolhedor, inspirador e didático, em português do Brasil. Frases curtas, exemplos práticos, curiosidades e palavras em francês sempre traduzidas.',
  language: 'pt-BR',
  themes:
    'Cultura e costumes franceses; gastronomia; história; arte, moda e literatura; dicas para aprender francês; vocabulário e expressões; diferenças França x Brasil; vida e intercâmbio na França; francofonia.',
  forbidden:
    'Política partidária, temas adultos, apostas, promessas milagrosas (ex.: "fluência em 30 dias"), conselhos médicos, jurídicos ou financeiros, estatísticas ou citações sem fonte confiável, comparações depreciativas entre povos.',
  keywords:
    'aprender francês, curso de francês, intercâmbio na França, cultura francesa, expressões em francês, vocabulário em francês',
  style_rules:
    'Use títulos H2/H3 descritivos. Parágrafos de até 4 linhas. Listas quando fizer sentido. Traga exemplos de frases em francês com tradução. Evite clichês e exageros. Nunca invente fatos, datas, números, citações ou links.',
  cta:
    'Encerrar com um convite natural para conhecer a Braziw (https://braziw.com.br) e seus cursos de idiomas e intercâmbios, sem tom agressivo de venda.',
  brand_facts:
    'A Braziw — Idiomas e Intercâmbios — atua há mais de 25 anos conectando brasileiros ao mundo por meio de idiomas e intercâmbios. O blog se chama "Tudo sobre Francês".',
  article_length: 1200,
  ideas_count: 8,
  reference_post_ids: [],
  extra: '',
};

export async function getSetting(key, fallback = null) {
  const row = await queryOne('SELECT value FROM settings WHERE key = $1', [key]);
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)]);
}

export async function getTraining() {
  return { ...DEFAULT_TRAINING, ...(await getSetting('ai_training', {})) };
}

export async function saveTraining(input) {
  const t = { ...DEFAULT_TRAINING };
  const str = (k, max = 4000) => { if (typeof input[k] === 'string') t[k] = input[k].trim().slice(0, max); };
  ['objective', 'audience', 'tone', 'themes', 'forbidden', 'keywords', 'style_rules', 'cta', 'brand_facts', 'extra'].forEach((k) => str(k));
  t.language = String(input.language || 'pt-BR').slice(0, 10);
  t.article_length = Math.min(3000, Math.max(500, Number(input.article_length) || 1200));
  t.ideas_count = Math.min(15, Math.max(3, Number(input.ideas_count) || 8));
  t.reference_post_ids = Array.isArray(input.reference_post_ids) ? input.reference_post_ids.map(Number).filter(Boolean).slice(0, 5) : [];
  await setSetting('ai_training', t);
  return t;
}
