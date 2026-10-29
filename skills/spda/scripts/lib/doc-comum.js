// Trechos comuns aos documentos: identificação, normas e assinatura.
// Identificação, normas e assinatura são os da base comum das skills
// (_comum/documentos.js) — aqui eram cópia literal. Fica o que é do SPDA: a
// lista de normas e o código do documento ("HM-SPDA").

const D = require('../../../_comum/documentos');

const enderecoCompleto = (cli) => D.endereco(cli);
const blocoIdentificacao = (dados, extras = []) => D.identificacao(dados, extras);

const NORMAS = [
  ['ABNT NBR 5419-1:2026', 'Princípios gerais'],
  ['ABNT NBR 5419-2:2026', 'Gerenciamento de risco'],
  ['ABNT NBR 5419-3:2026', 'Danos físicos a estruturas e perigos à vida'],
  ['ABNT NBR 5419-4:2026', 'Sistemas elétricos e eletrônicos internos na estrutura'],
  ['ABNT NBR 15749:2009', 'Medição de resistência de aterramento (informativa)'],
  ['ABNT NBR 5410:2004 (versão corrigida 2008)', 'Instalações elétricas de baixa tensão'],
];

const blocoNormas = (lista = NORMAS) => D.normas(lista);
const blocoAssinatura = (dados) => D.assinatura(dados);

function identificacaoDocumento(dados, sigla) {
  const meta = dados.meta || {};
  const n = (dados.inspecao || {}).documento_n || meta.documento_n || 'HM-SPDA';
  return `${n}${sigla ? `-${sigla}` : ''} / ${meta.revisao ? String(meta.revisao).split(' ')[0] : 'R00'}`;
}

module.exports = { blocoIdentificacao, blocoNormas, blocoAssinatura, identificacaoDocumento, enderecoCompleto, NORMAS };
