// Ponto de recarga de veículo elétrico — ABNT NBR 17019:2022 (lida com a
// NBR 5410). Dimensionamento do circuito exclusivo de cada ponto de conexão
// (mesmo motor da skill de elétrica), DR exigido, DPS, verificação da carga
// adicional no padrão de entrada (7.1.101) e lista de materiais.

const E = require('../../../eletrica/scripts/lib/calculo');
const T = require('../../../eletrica/scripts/lib/tabelas');

const FOLGA = 1.1;
const RENDIMENTO_DC = 0.95; // carregador CC: potência de entrada = saída / rendimento

function correntePorPonto(p, c) {
  const kw = Number(p.potencia_kw) || 0;
  const fases = Number(p.fases) || 1;
  const pIn = (p.modo === 'modo4_dc' ? kw / RENDIMENTO_DC : kw) * 1000;
  if (fases === 3) return { ligacao: 'FFF', va: pIn, tensao: c.vff };
  // monofásico: em 220/380 V liga F-N (220 V); em 127/220 V liga F-F (220 V)
  return c.vfn >= 200 ? { ligacao: 'FN', va: pIn, tensao: c.vfn } : { ligacao: 'FF', va: pIn, tensao: c.vff };
}

function tipoDr(p) {
  if (p.modo === 'modo4_dc') return { exigido: false, tipo: '—', texto: 'Ponto em CC (modo 4): proteção interna da estação conforme IEC 61851-23 (5.1.1.3 aplica-se a pontos em CA)' };
  if (p.modo === 'modo3_ac' && !p.rdc_dd_incorporado) return { exigido: true, tipo: 'B', texto: 'DR tipo B 30 mA (ou tipo A/F + RDC-DD IEC 62955) — 6.3.3.2.102' };
  return { exigido: true, tipo: 'A', texto: p.modo === 'modo3_ac' ? 'DR tipo A 30 mA — detecção de CC (6 mA) incorporada no carregador (6.3.3.2.102)' : 'DR tipo A 30 mA — 6.3.3.2.101 (tipo AC não permitido)' };
}

function calcular(dados) {
  const inst = dados.instalacao || {};
  const c = E.config({ instalacao: { isolacao: 'EPR', metodo: 'B1', agrupamento: 1, ...inst } });
  const pontos = (dados.pontos || []).filter(p => Number(p.potencia_kw) > 0);
  if (!pontos.length) throw new Error('Informe ao menos um ponto de recarga com potência.');
  const circuitos = pontos.map((p, i) => {
    const corr = correntePorPonto(p, c);
    const circ = { id: p.id || `VE${i + 1}`, descricao: p.descricao || `Ponto de recarga ${i + 1}`, tipo: 'tue', ligacao: corr.ligacao, potencia_va: corr.va, comprimento_m: Number(p.comprimento_m) || c.comprimentoPadrao, agrupamento: p.agrupamento || inst.agrupamento || 1 };
    const d = E.dimensionarCircuito(circ, c, { minimo: 2.5, limiteQueda: c.quedaTerminal });
    return { ...d, ponto: p, dr: tipoDr(p), ip: p.ao_tempo ? 'IPX4 / IP4X (ao tempo) e IK08' : 'IK08' };
  });

  // Distribuição: FD = 1, salvo controle de recarga (4.2.1.1.103)
  const somaVa = circuitos.reduce((s, x) => s + Number(x.potencia_va), 0);
  const controle = !!inst.controle_recarga && Number(inst.limite_controle_a) > 0;
  const tri = c.sistema === 'trifasico';
  const vAlim = tri ? Math.sqrt(3) * c.vff : (c.vfn >= 200 ? c.vfn : c.vff);
  let iDistrib = somaVa / vAlim;
  if (controle) iDistrib = Math.min(iDistrib, Number(inst.limite_controle_a));

  // Carga adicional no padrão de entrada (7.1.101)
  const inGeral = Number(inst.disjuntor_geral_existente_a) || null;
  const demandaExistenteKva = Number(inst.demanda_existente_kva) || 0;
  const iExistente = demandaExistenteKva * 1000 / vAlim;
  const iTotal = iExistente + iDistrib;
  const capacidade = inGeral ? { inGeral, iExistente, iNovo: iDistrib, iTotal, atende: iTotal <= inGeral } : null;

  let alimentador = null;
  if (circuitos.length > 1 || inst.quadro_recarga_dedicado) {
    const circ = { id: 'ALIM-VE', descricao: 'Alimentador do quadro de recarga', tipo: 'alimentador', ligacao: tri ? 'FFF' : (c.vfn >= 200 ? 'FN' : 'FF'), potencia_va: iDistrib * vAlim, comprimento_m: c.comprimentoAlimentador, agrupamento: 1 };
    alimentador = E.dimensionarCircuito(circ, c, { minimo: 2.5, limiteQueda: c.quedaAlimentador });
  }

  const publico = !!inst.uso_publico;
  const dps = { obrigatorio: publico, qtd: (tri ? 3 : c.vfn >= 200 ? 1 : 2) + 1, uc: c.vfn * 1.1 <= 175 ? 175 : 275 };
  const materiais = listaMateriais(circuitos, alimentador, dps, inst);
  const avisos = [];
  if (capacidade && !capacidade.atende) avisos.push(`A corrente total prevista (${capacidade.iTotal.toFixed(1)} A) excede o disjuntor geral existente (${inGeral} A): solicitar aumento de carga à distribuidora ou usar controle de recarga.`);
  if (!capacidade) avisos.push('Informe o disjuntor geral e a demanda existente para verificar se a carga adicional cabe no padrão de entrada (NBR 17019, 7.1.101). [CONFERIR]');
  if (c.esquema === 'TN-C') avisos.push('Esquema TN-C não é permitido nos circuitos de recarga: separar PE e N (4.2.2.2.1.101).');
  return { config: c, inst, circuitos, somaVa, iDistrib, controle, capacidade, alimentador, dps, publico, materiais, avisos };
}

function listaMateriais(circuitos, alimentador, dps, inst) {
  const itens = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => itens.push({ codigo, descricao, unidade, quantidade: Math.round(quantidade * 10) / 10, referencia });
  const cabos = {};
  for (const x of [...circuitos, ...(alimentador ? [alimentador] : [])]) {
    const L = x.comprimento * FOLGA;
    const fasesN = x.ligacao === 'FFF' ? 3 : x.ligacao === 'FF' ? 2 : 1;
    cabos[x.secao] = (cabos[x.secao] || 0) + L * fasesN;
    if (x.secaoNeutro) cabos[x.secaoNeutro] = (cabos[x.secaoNeutro] || 0) + L;
    cabos[x.secaoPE] = (cabos[x.secaoPE] || 0) + L;
  }
  Object.keys(cabos).map(Number).sort((a, b) => a - b)
    .forEach(s => add(`CAB-${String(s).replace('.', ',')}`, `Cabo de cobre flexível ${String(s).replace('.', ',')} mm² 0,6/1 kV EPR/XLPE 90 °C`, 'm', Math.ceil(cabos[s]), 'NBR 5410, 6.2; NBR 17019'));
  for (const x of circuitos) {
    add('DISJ', `Disjuntor ${x.polos === 3 ? '3P' : x.polos === 2 ? '2P' : '1P'} ${x.disjuntor} A curva C — circuito exclusivo ${x.id}`, 'un', 1, 'NBR 17019, 6.3.4.101');
    if (x.dr.exigido) add('DR', `DR ${x.ligacao === 'FFF' ? '4P' : '2P'} ${[25, 40, 63, 80, 100].find(v => v >= x.disjuntor) || 100} A 30 mA tipo ${x.dr.tipo} — ponto ${x.id}`, 'un', 1, 'NBR 17019, 5.1.1.3 e 6.3.3.2');
    add('SAVE', `Estação de recarga ${x.ponto.modo === 'modo4_dc' ? 'CC' : 'CA'} ${String(x.ponto.potencia_kw).replace('.', ',')} kW${x.ponto.modelo ? ` — ${x.ponto.modelo}` : ''} (IEC 61851)${x.ponto.fornecido_cliente ? ' — fornecida pelo cliente' : ''}`, 'un', x.ponto.fornecido_cliente ? 0 : 1, 'NBR 17019, 6.1.2.101');
    add('ELE', `Eletroduto ${inst.eletroduto || 'de aço galvanizado'} — circuito ${x.id}`, 'm', Math.ceil(x.comprimento), 'NBR 5410, 6.2.11');
  }
  if (alimentador) add('DISJ-G', `Disjuntor geral do quadro de recarga ${alimentador.polos}P ${alimentador.disjuntor} A`, 'un', 1, 'NBR 5410, 5.3.4');
  add('QD', `Quadro de proteção CA para ${circuitos.length} ponto(s) de recarga (disjuntores, DR e DPS)`, 'un', 1, 'NBR 17019');
  add('DPS', `DPS classe II Uc ≥ ${dps.uc} V, In ≥ 20 kA${dps.obrigatorio ? '' : ' (recomendado)'}`, 'un', dps.qtd, 'NBR 17019, 5.4.2.1.101; NBR 5410, Tabela 49');
  if (circuitos.some(x => x.ponto.protecao_impacto)) add('PROT', 'Proteção mecânica contra impacto (batente/defensa) junto ao carregador', 'un', circuitos.filter(x => x.ponto.protecao_impacto).length, 'NBR 17019, 6.1.3.2.103.2');
  if (inst.uso_publico) add('SIN', 'Placa de sinalização de vaga com recarga de veículo elétrico', 'un', circuitos.length, 'NBR 17019, 6.5.102.1');
  return itens.filter(i => i.quantidade > 0);
}

module.exports = { calcular, correntePorPonto, tipoDr };
