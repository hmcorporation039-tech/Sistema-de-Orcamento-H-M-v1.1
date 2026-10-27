// Projeto × laudo (versão 2.1 — pedido do usuário de 27/10/2026): cada
// registro de disciplina do sistema é OU um projeto OU um laudo. Análise de
// projeto não gera laudo; laudo é pedido quando necessário.
//
// Este arquivo é o ÚNICO lugar que diz a que tipo de registro pertence cada
// documento das skills, cada desenho da base de CAD e cada modo de orçamento:
//   'projeto' — só no projeto (memorial, planilhas de cálculo/materiais, planta, unifilar)
//   'laudo'   — só no laudo (laudo/relatório de inspeção, checklist, medições)
//   'ambos'   — nos dois
// O backend (utils/disciplinasLaudo.js) anota a lista de cada disciplina com
// isto e a tela mostra só o que serve ao registro aberto. O teste
// _comum/teste-tipos-documento.js FALHA se uma skill tiver documento ou modo
// de orçamento sem classificação aqui — skill nova precisa entrar nesta lista.

const DOCUMENTOS = {
  memorial: 'projeto',   // memorial descritivo e de cálculo / especificações
  planilha: 'projeto',   // quadro de cargas, planilha de cálculo, lista de pontos e materiais
  materiais: 'projeto',  // SPDA: planilha de materiais (quantitativo da execução) e risco
  laudo: 'laudo',        // laudo de inspeção / relatório de vistoria, certificação, comissionamento ou teste
  relatorio: 'laudo',    // relatório de medição e comissionamento (iluminação, antena)
  checklist: 'laudo',    // checklist de campo da inspeção
  medicoes: 'laudo',     // SPDA: planilha de medições (continuidade, aterramento)
  risco: 'ambos',        // SPDA: análise de risco da NBR 5419-2 — exigida no projeto e no laudo
};

// Exceções por disciplina ({ [chave da skill]: { [tipo]: uso } }) — nenhuma hoje
const POR_DISCIPLINA = {};

// Desenhos gerados pela base de CAD (skills/_comum/cad), fora da lista de documentos das skills
const DESENHOS = {
  planta: 'projeto',     // planta baixa com os pontos (DXF)
  unifilar: 'projeto',   // diagrama unifilar (QElectroTech .qet)
};

// Modos de orçamento das skills: execução vai com o projeto; inspeção (com a
// correção das não conformidades) vai com o laudo
const MODOS = {
  execucao: 'projeto',
  automacao: 'projeto',  // pressurização: automação / adequação do painel
  inspecao: 'laudo',
  vistoria: 'laudo',
  certificacao: 'laudo',
  diagnostico: 'laudo',
};

const USOS = ['projeto', 'laudo', 'ambos'];
const TIPOS_REGISTRO = ['projeto', 'laudo'];

function usoDoDocumento(disciplina, tipo) {
  const exc = POR_DISCIPLINA[disciplina] || {};
  return exc[tipo] || DOCUMENTOS[tipo] || DESENHOS[tipo] || null;
}

function usoDoModo(disciplina, modo) {
  const exc = POR_DISCIPLINA[disciplina] || {};
  return exc[`modo:${modo}`] || MODOS[modo] || null;
}

// O documento/modo de uso `uso` serve ao registro do tipo `tipoRegistro`?
function serve(uso, tipoRegistro) {
  return uso === 'ambos' || uso === tipoRegistro;
}

// Lista do contrato da skill → mesma lista com `uso` em cada item
function classificarSkill(skill) {
  const documentos = (skill.documentos || []).map(d => ({ ...d, uso: usoDoDocumento(skill.chave, d.tipo) }));
  const modosOrcamento = (skill.modosOrcamento || []).map(m => ({ ...m, uso: usoDoModo(skill.chave, m.modo) }));
  const semClassificacao = [
    ...documentos.filter(d => !USOS.includes(d.uso)).map(d => `documento "${d.tipo}" (${d.rotulo})`),
    ...modosOrcamento.filter(m => !USOS.includes(m.uso)).map(m => `modo de orçamento "${m.modo}" (${m.rotulo})`),
  ];
  return { documentos, modosOrcamento, semClassificacao };
}

const documentosDoRegistro = (skill, tipoRegistro) =>
  classificarSkill(skill).documentos.filter(d => serve(d.uso, tipoRegistro));
const modosDoRegistro = (skill, tipoRegistro) =>
  classificarSkill(skill).modosOrcamento.filter(m => serve(m.uso, tipoRegistro));

module.exports = {
  DOCUMENTOS, DESENHOS, MODOS, POR_DISCIPLINA, USOS, TIPOS_REGISTRO,
  usoDoDocumento, usoDoModo, serve, classificarSkill, documentosDoRegistro, modosDoRegistro,
};
