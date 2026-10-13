import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.MCP_KEY || 'mcp_302d8e616e5e68bdbd6d55db992791d0';
const URL_ = `https://news.grupomercatta.com.br/api/mcp?key=${KEY}`;

const P = [
  ["Wise Madness: a história da instituição que transforma vidas em Bauru desde 2006", "História Wise Madness"],
  ["Missão, visão e valores da Associação Wise Madness", "Missão, Visão e Valores"],
  ["Como funciona uma OSC: entenda o trabalho da Wise Madness", "Como Funciona uma OSC"],
  ["Transparência: como a Wise Madness aplica cada doação recebida", "Transparência em Foco"],
  ["Os bairros onde a Wise Madness atua e por que estar perto faz diferença", "Atuação nas Periferias"],
  ["Um dia na Wise Madness: a rotina das crianças no contraturno", "Um Dia no Contraturno"],
  ["O que é o Serviço de Convivência e Fortalecimento de Vínculos (SCFV)", "Fortalecimento de Vínculos"],
  ["Contraturno escolar: benefícios para crianças e adolescentes", "Contraturno Escolar"],
  ["Como as atividades lúdicas ajudam no desenvolvimento infantil", "Atividades Lúdicas"],
  ["Esporte como ferramenta de inclusão social", "Esporte e Inclusão"],
  ["A importância da família no desenvolvimento de crianças em vulnerabilidade", "A Força da Família"],
  ["Como inscrever uma criança em projetos sociais em Bauru", "Inscrições e Vagas"],
  ["O que é acolhimento institucional e quando ele acontece", "Acolhimento Institucional"],
  ["Casa de acolhimento: como é a rotina e o cuidado com cada criança", "Casa de Acolhimento"],
  ["ECA: os direitos de crianças e adolescentes acolhidos", "Direitos pelo ECA"],
  ["Reintegração familiar: o objetivo principal do acolhimento", "Reintegração Familiar"],
  ["Adoção x acolhimento: entenda a diferença", "Adoção x Acolhimento"],
  ["Como ajudar crianças em casas de acolhimento", "Apoio ao Acolhimento"],
  ["Impactar com Arte: o projeto cultural da Wise Madness", "Impactar com Arte"],
  ["Breaking nas periferias: dança que transforma jovens", "Breaking nas Periferias"],
  ["Street dance para crianças: benefícios físicos e emocionais", "Street Dance Infantil"],
  ["Percussão como ferramenta educativa e de disciplina", "Oficina de Percussão"],
  ["Malabares e artes circenses: concentração, coordenação e confiança", "Artes Circenses"],
  ["MC e rima: a palavra como forma de expressão para jovens", "Voz e Expressão"],
  ["Dança contemporânea em projetos sociais", "Dança Contemporânea"],
  ["Wise Way: a história das danças urbanas na Wise Madness", "Projeto Wise Way"],
  ["Espetáculos nas escolas públicas: arte que circula pela cidade", "Arte nas Escolas"],
  ["Cultura hip hop: história, pilares e impacto social", "Cultura Hip Hop"],
  ["Oficinas culturais gratuitas em Bauru: como participar", "Oficinas Gratuitas"],
  ["Como doar para a Wise Madness: guia completo", "Como Doar"],
  ["Doação recorrente: por que pequenas contribuições mensais fazem diferença", "Doação Recorrente"],
  ["Como destinar parte do Imposto de Renda para projetos de crianças (FIA/CMDCA)", "Destinação do IR"],
  ["Lei Rouanet: como empresas podem patrocinar projetos culturais sociais", "Lei Rouanet"],
  ["Responsabilidade social empresarial: como sua empresa pode apoiar", "Parcerias Empresariais"],
  ["Voluntariado: como ser voluntário em uma ONG em Bauru", "Seja Voluntário"],
  ["Doação de itens: o que uma instituição social realmente precisa", "Doação de Itens"],
  ["Prêmio Responsabilidade Social Wise Madness: reconhecendo quem transforma", "Prêmio Responsabilidade Social"],
  ["ESG na prática: o “S” do social e o papel das OSCs", "O “S” do ESG"],
  ["Campanhas de arrecadação: como participar e divulgar", "Campanhas do Ano"],
  ["Vulnerabilidade social: o que é e como afeta crianças", "Vulnerabilidade Social"],
  ["Evasão escolar: como projetos sociais ajudam a combater", "Combate à Evasão"],
  ["Primeiro emprego: preparando jovens para o mercado de trabalho", "Primeiro Emprego"],
  ["Saúde mental de crianças e adolescentes: sinais e cuidados", "Saúde Mental Infantil"],
  ["O papel da arte na autoestima de jovens da periferia", "Arte e Autoestima"],
  ["Educação socioemocional: o que é e por que importa", "Educação Socioemocional"],
  ["Como projetos sociais ajudam a prevenir a violência", "Prevenção da Violência"],
  ["Mobilidade e inclusão: por que o transporte importa para projetos sociais", "Mobilidade e Acesso"],
  ["Dia das Crianças solidário: ideias para ajudar", "Dia das Crianças Solidário"],
  ["Natal solidário: como fazer a diferença para crianças atendidas", "Natal Solidário"],
  ["Histórias de transformação: o impacto de um projeto social na vida de um jovem", "Histórias Reais"],
];

function clean(s) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function callMcp(toolName, args) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await res.json();
  if (data?.result?.isError || data?.error) {
    throw new Error(data?.result?.content?.[0]?.text || JSON.stringify(data));
  }
  return data?.result?.content?.[0]?.text;
}

async function main() {
  const results = JSON.parse(fs.readFileSync('scratch/wisemadness_results.json', 'utf8'));
  const coversDir = 'scratch/covers';
  const files = fs.readdirSync(coversDir).filter((f) => !f.startsWith('.'));

  console.log(`Verificando capas em ${coversDir}... (${files.length} arquivos baixados)`);

  let updatedCount = 0;
  for (let i = 0; i < P.length; i++) {
    const [fullTitle, shortTitle] = P[i];
    const post = results[i]?.article;
    if (!post?.id) {
      console.log(`[Pauta ${i + 1}] Post id não encontrado nos resultados.`);
      continue;
    }

    const sClean = clean(shortTitle);
    const matchedFile = files.find((f) => {
      const fClean = clean(path.parse(f).name.replace(/\s*\(\d+\)$/, ''));
      return fClean === sClean;
    });

    if (!matchedFile) {
      continue;
    }

    const filePath = path.join(coversDir, matchedFile);
    console.log(`[Item ${i + 1}/50] Atualizando capa do Post #${post.id} ("${shortTitle}") via ${matchedFile}...`);
    try {
      const fileBuf = fs.readFileSync(filePath);
      const base64 = fileBuf.toString('base64');
      const res = await callMcp('edit_article', {
        id: post.id,
        cover_base64: `data:image/jpeg;base64,${base64}`,
      });
      console.log(`  -> OK: Post #${post.id} capa atualizada com sucesso!`);
      updatedCount++;
    } catch (err) {
      console.error(`  -> ERRO ao atualizar Post #${post.id}:`, err.message);
    }
  }

  console.log(`\n=== FINALIZADO: ${updatedCount} capas atualizadas no blog ===`);
}

main().catch(console.error);
