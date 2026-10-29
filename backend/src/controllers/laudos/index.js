// Projetos e laudos por disciplina (hub Obras → "Projetos por disciplina" e
// "Laudos"). O cálculo e os documentos vêm da skill da disciplina
// (utils/disciplinasLaudo.js) — o mesmo motor que o Claude Code usa, então
// tela e skill sempre batem.
//
// Versão 2.1: cada registro de laudos_projetos é OU um projeto OU um laudo
// (coluna `tipo`). O projeto gera só os documentos de projeto, os desenhos, as
// entregas e o orçamento de execução; o laudo gera só os documentos de laudo e
// o orçamento de inspeção/correção (classificação em
// skills/_comum/tipos-documento.js). Laudo nunca nasce de análise de projeto:
// /laudos/de-analise cria um PROJETO.
//
// Antes um arquivo só (laudosController.js, ~900 linhas); agora uma parte por
// assunto, e este índice junta tudo para as rotas (routes/index.js → laudoCtrl.x):
//   crud.js      — disciplinas, modelos e o cadastro (listar, criar, salvar, excluir)
//   fotos.js     — fotos da inspeção
//   desenhos.js  — arquitetura, planta DXF e unifilar
//   entregas.js  — cálculo, documentos, entregas do projeto e a pasta
//   orcamento.js — orçamento → proposta
//   comum.js     — o que as partes usam em comum
const { disciplinas, modelo, listar, buscarUm, criar, criarDeAnalise, atualizar, remover } = require('./crud');
const { enviarFotos, verFoto, removerFoto, prepararFotos } = require('./fotos');
const { enviarArquitetura, verArquitetura, gerarPlantaDxf, gerarUnifilarQet } = require('./desenhos');
const { calcular, documento, salvarDocumentos, catalogoEntregas, gerarEntrega, pasta, abrirPasta } = require('./entregas');
const { gerarOrcamento } = require('./orcamento');

module.exports = {
  paraTestes: { prepararFotos }, // testes/seguranca.test.js
  disciplinas, modelo, listar, buscarUm, criar, criarDeAnalise, atualizar, remover, calcular, documento,
  enviarArquitetura, verArquitetura, gerarPlantaDxf, gerarUnifilarQet,
  enviarFotos, verFoto, removerFoto, gerarOrcamento, salvarDocumentos, pasta, abrirPasta,
  catalogoEntregas, gerarEntrega,
};
