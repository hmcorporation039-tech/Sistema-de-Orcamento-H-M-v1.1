// Notas fiscais de serviço (versão 2.4) — models/migracoes/2.0-22-notas-fiscais.js.
// Rascunho (cliente + serviço + valores), duplicar ("clonador": a cópia volta
// a rascunho para trocar cliente, valores, datas e descrição), PDF com o papel
// timbrado, XML, envio por e-mail ao tomador, registro de cancelamento e
// importação dos XML já emitidos (utils/nfseXml.js).
// Emissão direta na API nacional (certificado A1) = etapa 2; até lá a nota é
// emitida no nfse.gov.br e o XML importado aqui transforma o rascunho em nota.
//
// Antes um arquivo só (notasFiscaisController.js, ~840 linhas); agora uma parte por
// assunto, e este índice junta tudo para as rotas (routes/v2/notasFiscais.js → ctrl.x):
//   cadastro.js     — lista, detalhe e o rascunho (criar, editar, apagar, duplicar, a partir da proposta)
//   cancelamento.js — cancelar direto na Receita ou registrar o cancelamento feito no portal
//   documentos.js   — PDF, pré-visualização HTML, XML e e-mail ao tomador
//   importacao.js   — importação dos XML já emitidos
//   atestado.js     — atestado de capacidade técnica (prévia, Word, e-mail)
//   vinculos.js     — proposta ligada à nota e os Pix que a quitaram
//   comum.js        — o que as partes usam em comum (campos, cálculo do ISS, validação, leitura da nota)
// O nome antigo (controllers/notasFiscaisController.js) continua valendo: só reexporta este índice
// (testes e scripts/importar-notas-sysb1.js).
const { calcularTotais } = require('./comum');
const { listar, obter, criar, atualizar, remover, duplicar, criarDeProposta } = require('./cadastro');
const { configCancelamento, cancelar } = require('./cancelamento');
const { pdf, previewHtml, xml, enviarEmail } = require('./documentos');
const { importar, importarConteudos } = require('./importacao');
const { previaAtestado, atestadoDocx, notasCandidatas, enviarAtestado } = require('./atestado');
const { propostasCandidatas, vincularProposta, recebimentosCandidatos, ligarRecebimento } = require('./vinculos');

module.exports = {
  notasCandidatas, enviarAtestado, criarDeProposta, recebimentosCandidatos, ligarRecebimento,
  listar, obter, criar, atualizar, remover, duplicar, cancelar, configCancelamento, pdf, previewHtml, xml, enviarEmail, importar,
  previaAtestado, atestadoDocx, propostasCandidatas, vincularProposta,
  // testes e scripts
  importarConteudos, calcularTotais,
};
