// Quadro do PRÉDIO = quadro do caderno de fabricação (fase 2 do roteiro — 3D interativo).
// O 3D do prédio gerado pelo formulário da elétrica predial mostra o quadro de
// distribuição; ao clicar nele abre-se o quadro em 3D com a porta, os disjuntores e as
// alavancas. Para ser o MESMO quadro do caderno (as mesmas TAGs, os mesmos grupos de DR,
// o mesmo arranjo nas fileiras), ele sai daqui: a elétrica importada pela skill quadros
// (./importar.js → deEletrica) e a cena do quadro (./modelo3d.js → montarCena).
//
// quadroDoPredio(dadosEletrica, { tag }) → { quadro, cena } — quadro: o item de
// instalacao.quadros do modelo único (geral Q0, DR1…, Q1…); cena: a do visualizador de
// quadro (tipo 'quadro'). Erro sobe para quem chama (o 3D segue com o quadro da elétrica).
const { deEletrica } = require('./importar');
const Q = require('./index');
const { montarCena } = require('./modelo3d');

function quadroDoPredio(dadosEletrica, { tag } = {}) {
  const imp = deEletrica(JSON.parse(JSON.stringify(dadosEletrica)), tag ? { tag } : {});
  const q = Q.processar(imp.dados);
  const quadro = q.instalacao.quadros[0];
  const cena = montarCena(q.calc, imp.dados);
  // a página do prédio já tem as premissas; a do quadro guarda as dela
  return { quadro: { tag: quadro.tag, descricao: quadro.descricao, geral: quadro.geral, drs: quadro.drs, disjuntores: quadro.disjuntores }, cena };
}

module.exports = { quadroDoPredio };
