// Análise de Projeto (PDF, DWG e DXF recebidos do cliente → ambientes, pontos,
// achados de compatibilização, serviços e materiais) — rotas em
// routes/index.js (projCtrl.x) e routes/v2/pacotesProjeto.js.
//
// Antes um arquivo só (projetosController.js, ~650 linhas); agora uma parte por
// assunto, e este índice junta tudo para as rotas:
//   analises.js  — listar, abrir, analisar, salvar, excluir, relatório PDF e pasta
//   pacotes.js   — pacote de arquivos (pasta/ZIP) e DXF da compatibilização
//   orcamento.js — "Gerar orçamento" → proposta
//   mapaCad.js   — mapa do CAD: o engenheiro confere os tipos lidos do desenho (item 3 do plano)
//   comum.js     — o que as partes usam em comum
const { listar, buscarUma, analisar, atualizar, remover, gerarRelatorio, pasta, abrirPasta } = require('./analises');
const { receberPacote, analisarPacote, descartarPacote, compatibilizacaoDxf } = require('./pacotes');
const { gerarOrcamento } = require('./orcamento');
const mapaCad = require('./mapaCad');

module.exports = {
  listar, buscarUma, analisar, atualizar, remover, gerarRelatorio, gerarOrcamento, pasta, abrirPasta,
  receberPacote, analisarPacote, descartarPacote, compatibilizacaoDxf,
  lerMapaCad: mapaCad.ler, salvarMapaCad: mapaCad.salvar, reprocessarMapaCad: mapaCad.reprocessar,
};
