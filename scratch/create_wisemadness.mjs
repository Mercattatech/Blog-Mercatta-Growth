// Cria os 50 artigos aprovados no blog da Wise Madness via MCP (sequencial, com retry e log).
import fs from 'node:fs';

const KEY = process.env.MCP_KEY || 'mcp_302d8e616e5e68bdbd6d55db992791d0';
const URL_ = `https://news.grupomercatta.com.br/api/mcp?key=${KEY}`;
const LOG = new URL('./wisemadness_results.json', import.meta.url);

const P = [
  ['Wise Madness: a história da instituição que transforma vidas em Bauru desde 2006', 'ong em bauru', 'destaques'],
  ['Missão, visão e valores da Associação Wise Madness', 'associação wise madness', 'destaques'],
  ['Como funciona uma OSC: entenda o trabalho da Wise Madness', 'o que é osc', 'noticias'],
  ['Transparência: como a Wise Madness aplica cada doação recebida', 'transparência ong', 'destaques'],
  ['Os bairros onde a Wise Madness atua e por que estar perto faz diferença', 'projeto social periferia bauru', 'noticias'],
  ['Um dia na Wise Madness: a rotina das crianças no contraturno', 'rotina contraturno escolar', 'novidades'],
  ['O que é o Serviço de Convivência e Fortalecimento de Vínculos (SCFV)', 'serviço de convivência e fortalecimento de vínculos', 'noticias'],
  ['Contraturno escolar: benefícios para crianças e adolescentes', 'benefícios do contraturno escolar', 'noticias'],
  ['Como as atividades lúdicas ajudam no desenvolvimento infantil', 'atividades lúdicas desenvolvimento infantil', 'noticias'],
  ['Esporte como ferramenta de inclusão social', 'esporte e inclusão social', 'noticias'],
  ['A importância da família no desenvolvimento de crianças em vulnerabilidade', 'família e vulnerabilidade social', 'noticias'],
  ['Como inscrever uma criança em projetos sociais em Bauru', 'projeto social para crianças bauru', 'novidades'],
  ['O que é acolhimento institucional e quando ele acontece', 'acolhimento institucional', 'noticias'],
  ['Casa de acolhimento: como é a rotina e o cuidado com cada criança', 'casa de acolhimento', 'noticias'],
  ['ECA: os direitos de crianças e adolescentes acolhidos', 'direitos da criança acolhida eca', 'noticias'],
  ['Reintegração familiar: o objetivo principal do acolhimento', 'reintegração familiar', 'noticias'],
  ['Adoção x acolhimento: entenda a diferença', 'diferença entre adoção e acolhimento', 'noticias'],
  ['Como ajudar crianças em casas de acolhimento', 'como ajudar casa de acolhimento', 'novidades'],
  ['Impactar com Arte: o projeto cultural da Wise Madness', 'projeto impactar com arte', 'destaques'],
  ['Breaking nas periferias: dança que transforma jovens', 'breaking projeto social', 'novidades'],
  ['Street dance para crianças: benefícios físicos e emocionais', 'street dance para crianças', 'noticias'],
  ['Percussão como ferramenta educativa e de disciplina', 'oficina de percussão', 'noticias'],
  ['Malabares e artes circenses: concentração, coordenação e confiança', 'oficina de malabares', 'noticias'],
  ['MC e rima: a palavra como forma de expressão para jovens', 'oficina de mc rima', 'noticias'],
  ['Dança contemporânea em projetos sociais', 'dança contemporânea projeto social', 'noticias'],
  ['Wise Way: a história das danças urbanas na Wise Madness', 'wise way dança urbana', 'destaques'],
  ['Espetáculos nas escolas públicas: arte que circula pela cidade', 'espetáculos escolas públicas', 'novidades'],
  ['Cultura hip hop: história, pilares e impacto social', 'cultura hip hop impacto social', 'noticias'],
  ['Oficinas culturais gratuitas em Bauru: como participar', 'oficinas culturais gratuitas bauru', 'novidades'],
  ['Como doar para a Wise Madness: guia completo', 'como doar para ong', 'destaques'],
  ['Doação recorrente: por que pequenas contribuições mensais fazem diferença', 'doação recorrente', 'noticias'],
  ['Como destinar parte do Imposto de Renda para projetos de crianças (FIA/CMDCA)', 'destinar imposto de renda fia', 'noticias'],
  ['Lei Rouanet: como empresas podem patrocinar projetos culturais sociais', 'lei rouanet patrocínio empresa', 'noticias'],
  ['Responsabilidade social empresarial: como sua empresa pode apoiar', 'responsabilidade social empresarial', 'noticias'],
  ['Voluntariado: como ser voluntário em uma ONG em Bauru', 'ser voluntário em bauru', 'novidades'],
  ['Doação de itens: o que uma instituição social realmente precisa', 'o que doar para ong', 'noticias'],
  ['Prêmio Responsabilidade Social Wise Madness: reconhecendo quem transforma', 'prêmio responsabilidade social bauru', 'destaques'],
  ['ESG na prática: o “S” do social e o papel das OSCs', 'esg social', 'noticias'],
  ['Campanhas de arrecadação: como participar e divulgar', 'campanha de arrecadação ong', 'novidades'],
  ['Vulnerabilidade social: o que é e como afeta crianças', 'vulnerabilidade social infantil', 'noticias'],
  ['Evasão escolar: como projetos sociais ajudam a combater', 'evasão escolar projetos sociais', 'noticias'],
  ['Primeiro emprego: preparando jovens para o mercado de trabalho', 'primeiro emprego jovem', 'noticias'],
  ['Saúde mental de crianças e adolescentes: sinais e cuidados', 'saúde mental infantojuvenil', 'noticias'],
  ['O papel da arte na autoestima de jovens da periferia', 'arte e autoestima', 'noticias'],
  ['Educação socioemocional: o que é e por que importa', 'educação socioemocional', 'noticias'],
  ['Como projetos sociais ajudam a prevenir a violência', 'prevenção da violência juventude', 'noticias'],
  ['Mobilidade e inclusão: por que o transporte importa para projetos sociais', 'transporte projeto social', 'noticias'],
  ['Dia das Crianças solidário: ideias para ajudar', 'dia das crianças solidário', 'novidades'],
  ['Natal solidário: como fazer a diferença para crianças atendidas', 'natal solidário', 'novidades'],
  ['Histórias de transformação: o impacto de um projeto social na vida de um jovem', 'histórias de transformação social', 'destaques'],
];

const results = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : {};

async function call(args) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name: 'create_article', arguments: args } }),
    signal: AbortSignal.timeout(300000),
  });
  const json = await res.json();
  const text = json?.result?.content?.[0]?.text || JSON.stringify(json);
  if (json?.result?.isError || json?.error) throw new Error(text.slice(0, 300));
  return JSON.parse(text);
}

for (let i = 0; i < P.length; i++) {
  const [title, kw, cat] = P[i];
  if (results[i]?.ok) continue;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t0 = Date.now();
    try {
      const out = await call({ title, focus_keyword: kw, category_slug: cat, generate_with_ai: true, with_auto_cover: true, status: 'published' });
      results[i] = { ok: true, title, article: out.article, secs: Math.round((Date.now() - t0) / 1000) };
      console.log(`[${i + 1}/50] OK ${out.article?.id} ${out.article?.title} (${results[i].secs}s)`);
      break;
    } catch (e) {
      results[i] = { ok: false, title, error: e.message };
      console.log(`[${i + 1}/50] ERRO tentativa ${attempt}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 15000 * attempt));
    }
  }
  fs.writeFileSync(LOG, JSON.stringify(results, null, 2));
}
const ok = Object.values(results).filter((r) => r.ok).length;
console.log(`FINAL: ${ok}/50 criados`);
