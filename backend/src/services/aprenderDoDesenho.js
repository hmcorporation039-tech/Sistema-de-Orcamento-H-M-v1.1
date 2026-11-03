// O que uma leitura de DWG/DXF usa do que o sistema já sabe e o que ela ensina — o mesmo para a análise de projeto
// (services/compatibilizacaoAnalise.js) e para o treino com as obras já feitas (services/treinoAcervo.js):
//   conhecimento()           → { aprendidos, notasAprendidas, blocosAprendidos } para lerArquivoCad
//   registrarLeitura(r, arq) → a legenda (símbolos explodidos), as notas de altura e os nomes de bloco da legenda
//                              viram aprendizado. Devolve quantas linhas cada um gravou.
// Tudo é sugestão: o que entra no orçamento continua sendo o que o engenheiro confere.
const simbolosAprendidos = require('./simbolosAprendidos');
const notasAprendidas = require('./notasAprendidas');
const blocosAprendidos = require('./blocosAprendidos');

async function conhecimento() {
  const [aprendidos, notas, blocos] = await Promise.all([simbolosAprendidos.carregar(), notasAprendidas.carregar(), blocosAprendidos.carregar()]);
  return { aprendidos, notasAprendidas: notas, blocosAprendidos: blocos };
}

async function registrarLeitura(r, arquivo) {
  const a = r?.aprendizado || {};
  const [simbolos, notas, blocos] = await Promise.all([
    a.legenda?.length ? simbolosAprendidos.registrar(a.legenda, arquivo).catch(() => 0) : 0,
    a.notas?.length ? notasAprendidas.registrar(a.notas, a.escritorio, arquivo).catch(() => 0) : 0,
    a.blocos?.length ? blocosAprendidos.registrar(a.blocos, a.escritorio, arquivo).catch(() => 0) : 0,
  ]);
  return { simbolos, notas, blocos };
}

module.exports = { conhecimento, registrarLeitura };
