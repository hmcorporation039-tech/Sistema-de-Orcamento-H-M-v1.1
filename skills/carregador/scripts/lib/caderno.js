// Caderno de fabricação e montagem do QUADRO DE RECARGA (QDVE, PDF) — os circuitos de recarga
// do cálculo da skill (um disjuntor exclusivo e um DR por ponto, tipo A ou B conforme o
// carregador — NBR 17019, 6.3.3.2.101/102 —, o DPS da função comum com Uc pela Tabela 49 da NBR
// 5410 e, quando houver, a medição) viram o quadro da skill de quadros, pelo módulo comum
// _comum/fabricacao/cadernoPainel.js (invólucro, arranjo, pente/barramento, N/PE, bornes,
// plaquetas, materiais da caixa aos parafusos, lista de materiais com preço e ensaios de rotina
// da NBR IEC 61439). As proteções são as MESMAS do memorial: disjuntor e seção do cálculo; o DR
// de cada ponto é um interruptor DR exclusivo (grupo DR-<ponto>) com o tipo do cálculo.
//
// Medição (opcional — o formulário não tem o campo; vem do JSON): instalacao.medicao =
//   'por_ponto' (medidor de energia por ponto, rateio do condomínio), 'geral' (multimedidor na
//   entrada do quadro) ou 'ambas'; o controle de recarga (gestão de carga) também pede a medição
//   geral do alimentador.

const P = require('../../../_comum/fabricacao/cadernoPainel');
const { fmtNum } = require('../../../_comum/docx-base');

const num = fmtNum;
const TAG = 'QDVE';

const NORMAS = [
  { codigo: 'ABNT NBR 17019:2022', titulo: 'Instalações elétricas de BT — requisitos para instalações em locais especiais — alimentação de veículos elétricos', aplicacao: 'Circuito exclusivo por ponto (6.3.4.101), DR de 30 mA por ponto e tipo do DR conforme o carregador (5.1.1.3; 6.3.3.2.101 e 6.3.3.2.102), DPS (5.4.2.1.101), proibição do TN-C nos circuitos de recarga.' },
  { codigo: 'ABNT NBR NM 61008 / IEC 62423 / IEC 62955', titulo: 'Interruptores DR; DR tipo F e B; RDC-DD (detecção de CC 6 mA)', aplicacao: 'Interruptor DR de cada ponto: tipo A (com RDC-DD no carregador) ou tipo B (ou A/F + RDC-DD) — conforme a ficha do carregador.' },
  { codigo: 'IEC 61851-1', titulo: 'Sistema de recarga condutiva de veículos elétricos', aplicacao: 'Modos de recarga e proteções próprias da estação (o quadro não substitui as proteções internas do carregador).' },
];

function medicaoDe(dados) {
  const inst = dados.instalacao || {};
  const m = String(inst.medicao || '').toLowerCase();
  return {
    porPonto: m === 'por_ponto' || m === 'ambas' || (dados.pontos || []).some(p => p && p.medicao === true),
    geral: m === 'geral' || m === 'ambas' || !!inst.controle_recarga,
  };
}

const LIG = { FN: 'FN', FF: 'FF', FFF: 'FFF', FFFN: 'FFFN' };

function montarQuadro(res, med) {
  const { calc, dados } = res;
  const c = calc.config;
  const circuitos = calc.circuitos.map(x => ({
    n: x.id, descricao: `Recarga ${x.id} — ${x.descricao}`, tipo: 'tue', ligacao: LIG[x.ligacao] || 'FN', fases: (x.fases || '').replace(/[^ABC]/g, ''),
    potencia_w: Math.round(x.potencia_w || x.potencia_va * (x.fp || 0.92)), fp: x.fp || null, ib_a: Math.round(x.ib * 100) / 100,
    disjuntor_a: x.disjuntor, curva: 'C', icu_ka: null,
    dr: x.dr.exigido ? 'idr' : '', dr_grupo: x.dr.exigido ? `DR-${x.id}` : '', dr_ma: 30, dr_tipo: x.dr.exigido ? x.dr.tipo : '',
    secao_mm2: x.secao, local_dr: !!x.dr.exigido,
  }));
  const drs = calc.circuitos.filter(x => x.dr.exigido).map(x => ({ id: `DR-${x.id}`, tipo: x.dr.tipo, idn_ma: 30 }));
  return P.dadosDoQuadro(dados, {
    quadro: {
      tag: TAG, descricao: 'Quadro de recarga de veículos elétricos', tipo: 'distribuicao',
      sistema: c.sistema, tensao_ff: c.vff, tensao_fn: c.vfn, esquema: c.esquema,
      disjuntor_geral_a: calc.alimentador ? calc.alimentador.disjuntor : null,
      dps_classe: (calc.dps.especificacao && calc.dps.especificacao.classe) || 'II', multimedidor: med.geral,
      local: (dados.pontos || []).some(p => p && p.ao_tempo) ? 'externo_exposto' : 'interno_publico', montagem: 'sobrepor',
    },
    circuitos, drs,
  });
}

function secaoPontos(calc, med) {
  return {
    titulo: 'Pontos de recarga — proteções por ponto (NBR 17019)', paisagem: true,
    paragrafos: [
      'Cada ponto tem circuito exclusivo com disjuntor próprio e interruptor DR de 30 mA exclusivo (as mesmas proteções do memorial). O tipo do DR segue o carregador: tipo A quando a ficha técnica declara a detecção de corrente contínua de 6 mA (RDC-DD) incorporada; tipo B (ou A/F + RDC-DD) sem ela. Modo 4 (CC): proteção interna da estação.',
      calc.alimentador ? `Alimentador do quadro: ${calc.alimentador.polos}P ${calc.alimentador.disjuntor} A, ${num(calc.alimentador.secao)} mm² (fase mais carregada ${calc.faseCritica}: ${num(calc.iDistrib, 1)} A).` : 'Sem alimentador dedicado no cálculo (um ponto, ligado ao quadro existente): o disjuntor geral do QDVE foi dimensionado pela skill de quadros. [CONFERIR com o quadro de origem]',
    ],
    tabela: {
      colunas: ['Ponto', 'Descrição', 'Modo / kW', 'Ligação / fase', 'Ib (A)', 'Disjuntor', 'Seção (mm²)', 'DR', 'Medição'],
      linhas: calc.circuitos.map(x => [x.id, x.descricao, `${x.ponto.modo} / ${num(x.ponto.potencia_kw, 1)}`, `${x.ligacao}${x.fases ? ` (${x.fases})` : ''}`, num(x.ib, 1), `${x.polos}P ${x.disjuntor} A C`, num(x.secao), x.dr.exigido ? `30 mA tipo ${x.dr.tipo}` : '—', med.porPonto ? 'medidor próprio' : '—']),
      proporcoes: [0.5, 1.8, 0.9, 0.8, 0.5, 0.8, 0.6, 0.9, 0.8],
    },
    marcadores: [calc.dps.especificacao ? `DPS: ${calc.dps.texto}${calc.dps.obrigatorio ? ' — obrigatório (local com afluência de público)' : ' — recomendado'}.` : null, ...calc.circuitos.map(x => `${x.id}: ${x.dr.texto}`)].filter(Boolean),
  };
}

function montarCaderno(res) {
  const { calc, dados } = res;
  const med = medicaoDe(dados);
  const dq = montarQuadro(res, med);
  const medidores = med.porPonto ? calc.circuitos.map(x => ({
    codigo: 'MED-VE', grupo: 'Medição', descricao: `Medidor de energia ${x.ligacao === 'FFF' ? 'trifásico' : 'monofásico'} para trilho DIN, ${x.disjuntor} A, com saída de pulso/RS-485 — ponto ${x.id} [CONFERIR certificação para rateio/faturamento]`, unidade: 'un', quantidade: 1,
  })) : [];
  const { caderno } = P.cadernoDoQuadro(dq, {
    sigla: 'CAD-QDVE', normas: NORMAS,
    subtitulo: `${TAG} — quadro de recarga: ${calc.circuitos.length} ponto(s), DR ${[...new Set(calc.circuitos.filter(x => x.dr.exigido).map(x => `tipo ${x.dr.tipo}`))].join(' e ') || '—'}, DPS classe ${(calc.dps.especificacao && calc.dps.especificacao.classe) || 'II'}${med.geral ? ', medição geral' : ''}${med.porPonto ? ', medição por ponto' : ''}`,
    caracteristicas: [['Pontos de recarga', String(calc.circuitos.length)], ['Medição', [med.geral ? 'multimedidor na entrada' : '', med.porPonto ? 'medidor por ponto' : ''].filter(Boolean).join(' + ') || 'sem medição no quadro']],
    secoes: [secaoPontos(calc, med)],
    materiaisExtras: medidores,
    componentes: medidores.map((m, i) => ({ tag: `PM${i + 1}`, descricao: m.descricao, fabricante: '—', referencia: '—', medidas: '4 módulos DIN (típico) [CONFERIR]', quantidade: 1, unidade: 'un', local: 'Trilho DIN, ao lado do DR do ponto (espaço da reserva do quadro) [CONFERIR]', fonte: 'medida típica [CONFERIR]' })),
    verificacoes: [
      ...calc.circuitos.filter(x => x.dr.exigido).map(x => ({ item: `DR do ponto ${x.id}`, criterio: `Interruptor DR 30 mA tipo ${x.dr.tipo} conforme o carregador; teste pelo botão e com instrumento (corrente e tempo de atuação) registrados`, norma: 'NBR 17019, 5.1.1.3 e 6.3.3.2; NBR 5410, 7.3' })),
      { item: 'Circuitos exclusivos', criterio: 'Um disjuntor por ponto, sem outra carga no circuito; identificação do ponto (vaga) na plaqueta de cada disjuntor/DR', norma: 'NBR 17019, 6.3.4.101' },
      { item: 'Esquema de aterramento', criterio: 'PE e N separados em todos os circuitos de recarga (TN-C não permitido); continuidade do PE até cada ponto', norma: 'NBR 17019' },
      ...(med.porPonto || med.geral ? [{ item: 'Medição', criterio: 'Medidores ligados na fase do ponto (por ponto) e/ou TC/multimedidor na entrada; leitura conferida com carga de teste', norma: 'projeto [CONFERIR]' }] : []),
    ],
    avisos: [
      ...(!dados.instalacao || !dados.instalacao.medicao ? ['Medição: o formulário da skill não tem o campo — informe instalacao.medicao ("por_ponto", "geral" ou "ambas") no JSON quando houver rateio por vaga ou gestão de carga. Sem o campo, só o controle de recarga liga a medição geral. [CONFERIR]'] : []),
      ...(med.porPonto ? ['Medidores por ponto entram na lista de materiais e nos componentes, mas não no arranjo do quadro: ocupam a reserva de trilho — conferir o espaço (≈ 4 módulos DIN cada) ou aumentar o invólucro. [CONFERIR]'] : []),
      'Carregadores (estações) são fornecidos à parte (ou pelo cliente) e não fazem parte do quadro.',
    ],
    precos: dados.precos_materiais || null,
  });
  return caderno;
}

const gerarCaderno = (res) => P.gerarPdf(montarCaderno(res));

module.exports = { montarCaderno, gerarCaderno, medicaoDe, montarQuadro };
