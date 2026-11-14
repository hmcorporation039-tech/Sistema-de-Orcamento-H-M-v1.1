// Diagrama unifilar do quadro (QElectroTech .qet, formato 0.100 — abre na
// versão estável usada pelos projetistas e nas mais novas) a partir do
// resultado do cálculo da skill de elétrica. O gerador e os símbolos oficiais
// ficam em ./qet (validados abrindo e exportando no QElectroTech 0.100 e 0.200).
const { ProjetoQet } = require('./qet/qet.mjs');
const { gerarUnifilarQD } = require('./qet/unifilar-qd.mjs');
const { gerarUnifilarSE } = require('./qet/unifilar-se.mjs');

// verificar() devolve a lista de erros (mesmas regras de carga do QElectroTech)
function validado(projeto) {
  const xml = projeto.toXml();
  const erros = projeto.verificar(xml) || [];
  if (erros.length) throw new Error(`Unifilar inválido para o QElectroTech:\n - ${erros.join('\n - ')}`);
  return xml;
}

// adaptadores do resultado das skills (elétrica e industrial) → dados do gerador
const { dadosUnifilar, dadosUnifilarIndustrial } = require('./unifilarDados');

// Devolve o XML do projeto .qet (1 ou mais folhas: 6 circuitos por folha)
function gerarUnifilarEletrica(res, opcoes = {}) {
  const projeto = gerarUnifilarQD(dadosUnifilar(res, opcoes));
  return { xml: validado(projeto), folhas: projeto.folios.length };
}

// Elétrica industrial: um projeto com o QGBT e cada CCM/quadro (folhas em
// sequência), pelo adaptador dadosUnifilarIndustrial (./unifilarDados.js; antes na skill)
function gerarUnifilarIndustrial(res) {
  const quadros = ['QGBT', ...(res.calc.unifilar?.quadros || []).map(q => q.ref)];
  let projeto = null;
  for (const quadro of quadros) {
    const d = dadosUnifilarIndustrial(res, { quadro });
    if (!d.circuitos?.length) continue;
    // saída de motor ("M-01 50 cv Y-Δ") com o símbolo de motor
    d.circuitos = d.circuitos.map(c => (/\bcv\b|^M-\d/i.test(c.descricao || '') ? { ...c, tipo: 'motor' } : c));
    projeto = gerarUnifilarQD(d, projeto ? { projeto } : {});
  }
  if (!projeto) throw new Error('Nenhum quadro com circuitos para o unifilar.');
  return { xml: validado(projeto), folhas: projeto.folios.length, quadros };
}

// Média tensão (subestação): do ponto de entrega ao QGBT a partir de
// calc.unifilar da skill media-tensao (1 folha; mais de 8 saídas continuam por setas vai/vem)
function gerarUnifilarMT(res) {
  const projeto = gerarUnifilarSE(res);
  return { xml: validado(projeto), folhas: projeto.folios.length };
}

// disciplina → gerador de unifilar
const UNIFILARES = { eletrica: gerarUnifilarEletrica, eletrica_industrial: gerarUnifilarIndustrial, media_tensao: gerarUnifilarMT };

module.exports = { dadosUnifilar, gerarUnifilarEletrica, gerarUnifilarIndustrial, gerarUnifilarMT, UNIFILARES, ProjetoQet };
