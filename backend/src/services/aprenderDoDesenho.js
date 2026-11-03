// O que uma leitura de DWG/DXF usa do que o sistema já sabe e o que ela ensina — o mesmo para a análise de projeto
// (services/compatibilizacaoAnalise.js) e para o treino com as obras já feitas (services/treinoAcervo.js):
//   conhecimento()           → { aprendidos, notasAprendidas, blocosAprendidos } para lerArquivoCad
//   registrarLeitura(r, arq, { disciplina }) → a legenda (símbolos explodidos), as notas de altura e os nomes de bloco
//                              da legenda viram aprendizado. Devolve quantas linhas cada um gravou. disciplina (treino com o
//                              acervo, 03/11/2026: "sempre por disciplinas"): a do arquivo, para a linha que não diz a sua.
// Tudo é sugestão: o que entra no orçamento continua sendo o que o engenheiro confere.
const simbolosAprendidos = require('./simbolosAprendidos');
const notasAprendidas = require('./notasAprendidas');
const blocosAprendidos = require('./blocosAprendidos');

async function conhecimento() {
  const [aprendidos, notas, blocos] = await Promise.all([simbolosAprendidos.carregar(), notasAprendidas.carregar(), blocosAprendidos.carregar()]);
  return { aprendidos, notasAprendidas: notas, blocosAprendidos: blocos };
}

async function registrarLeitura(r, arquivo, { disciplina = null } = {}) {
  const a = r?.aprendizado || {};
  const legenda = disciplina ? (a.legenda || []).map(l => (l.disciplina ? l : { ...l, disciplina })) : a.legenda;
  const [simbolos, notas, blocos] = await Promise.all([
    legenda?.length ? simbolosAprendidos.registrar(legenda, arquivo).catch(() => 0) : 0,
    a.notas?.length ? notasAprendidas.registrar(a.notas, a.escritorio, arquivo).catch(() => 0) : 0,
    a.blocos?.length ? blocosAprendidos.registrar(a.blocos, a.escritorio, arquivo, undefined, disciplina).catch(() => 0) : 0,
  ]);
  return { simbolos, notas, blocos };
}

module.exports = { conhecimento, registrarLeitura };
