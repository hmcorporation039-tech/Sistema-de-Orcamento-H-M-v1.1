// Trechos comuns aos documentos: identificação, normas e assinatura.

const B = require('../../../_comum/docx-base');

function enderecoCompleto(cli) {
  return [cli.endereco, [cli.cidade, cli.uf].filter(Boolean).join('/')].filter(Boolean).join(' — ');
}

function responsavelTexto(r) {
  const partes = [r.nome || '(preencher)', `CREA ${r.crea || '(preencher)'}`, `ART ${r.art || '(preencher)'}`];
  return partes.join('   ');
}

function blocoIdentificacao(dados, extras = []) {
  const { cliente = {}, obra = {}, responsavel = {}, meta = {} } = dados;
  return B.tabelaKV([
    ['Cliente', cliente.nome],
    ['Obra', obra.nome],
    ['Endereço', enderecoCompleto(cliente)],
    ['Responsável técnico', responsavelTexto(responsavel)],
    ['Data / revisão', `${B.fmtData(meta.data)} / ${meta.revisao || 'R00'}`],
    ...extras,
  ]);
}

const NORMAS = [
  ['ABNT NBR 5419-1:2026', 'Princípios gerais'],
  ['ABNT NBR 5419-2:2026', 'Gerenciamento de risco'],
  ['ABNT NBR 5419-3:2026', 'Danos físicos a estruturas e perigos à vida'],
  ['ABNT NBR 5419-4:2026', 'Sistemas elétricos e eletrônicos internos na estrutura'],
  ['ABNT NBR 15749:2009', 'Medição de resistência de aterramento (informativa)'],
  ['ABNT NBR 5410:2004 (versão corrigida 2008)', 'Instalações elétricas de baixa tensão'],
];

function blocoNormas(lista = NORMAS) {
  return [B.titulo('Normas e documentos de referência'), ...lista.map(([n, d]) => B.marcador(`${n} — ${d}`))];
}

function blocoAssinatura(dados) {
  const r = dados.responsavel || {};
  const cidade = (dados.cliente || {}).cidade || '';
  return [
    B.espaco(240),
    B.p(`${cidade}${cidade ? ', ' : ''}${B.fmtData((dados.meta || {}).data)}.`, { align: B.AlignmentType.LEFT }),
    B.espaco(480),
    B.p('______________________________________________', { align: B.AlignmentType.CENTER, after: 0 }),
    B.p(r.nome || 'Responsável técnico', { align: B.AlignmentType.CENTER, after: 0, bold: true }),
    B.p(`Engenheiro Eletricista — CREA ${r.crea || '(preencher)'} — ART nº ${r.art || '(preencher)'}`, { align: B.AlignmentType.CENTER, after: 0 }),
    B.p(r.empresa || 'H&M Engenharia e Tecnologia LTDA', { align: B.AlignmentType.CENTER }),
  ];
}

function identificacaoDocumento(dados, sigla) {
  const meta = dados.meta || {};
  const n = (dados.inspecao || {}).documento_n || meta.documento_n || 'HM-SPDA';
  return `${n}${sigla ? `-${sigla}` : ''} / ${meta.revisao ? String(meta.revisao).split(' ')[0] : 'R00'}`;
}

module.exports = { blocoIdentificacao, blocoNormas, blocoAssinatura, identificacaoDocumento, enderecoCompleto, NORMAS };
