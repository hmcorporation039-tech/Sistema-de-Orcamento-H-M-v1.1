// Ponto de recarga de veículo elétrico — ABNT NBR 17019:2022 (lida com a
// NBR 5410). Dimensionamento do circuito exclusivo de cada ponto de conexão
// (mesmo motor da skill de elétrica), DR exigido, DPS, verificação da carga
// adicional no padrão de entrada (7.1.101) e lista de materiais.
//
// Carregadores monofásicos NÃO se somam como carga trifásica equilibrada: cada
// ponto entra numa fase (informada ou distribuída automaticamente) e a
// distribuição, o alimentador e o padrão de entrada são verificados pela
// corrente da fase mais carregada (NBR 5410, 5.3.4: Ib ≤ In ≤ Iz por condutor).

const E = require('../../../eletrica/scripts/lib/calculo');
const T = require('../../../eletrica/scripts/lib/tabelas');
const { ucDps } = require('../../../_comum/dps');

const FOLGA = 1.1;
const RENDIMENTO_DC = 0.95; // carregador CC: potência de entrada = saída / rendimento

function correntePorPonto(p, c) {
  const kw = Number(p.potencia_kw) || 0;
  const fases = Number(p.fases) || 1;
  const pIn = (p.modo === 'modo4_dc' ? kw / RENDIMENTO_DC : kw) * 1000;
  if (fases === 3) return { ligacao: 'FFF', va: pIn, tensao: c.vff };
  // monofásico: em 220/380 V liga F-N (220 V); em 127/220 V liga F-F (220 V) se houver 2ª fase
  if (c.vfn >= 200 || c.sistema === 'monofasico') return { ligacao: 'FN', va: pIn, tensao: c.vfn };
  return { ligacao: 'FF', va: pIn, tensao: c.vff };
}

const FASES_DO_SISTEMA = { trifasico: ['A', 'B', 'C'], bifasico: ['A', 'B'], monofasico: ['A'] };

// Fase de cada ponto: a informada (se coerente com a ligação) ou a menos carregada.
// Devolve a corrente de recarga por fase (soma das Ib dos pontos de cada fase).
function distribuirFases(circuitos, sistema) {
  const fases = FASES_DO_SISTEMA[sistema] || FASES_DO_SISTEMA.trifasico;
  const corrente = Object.fromEntries(fases.map(f => [f, 0]));
  const nDe = (lig) => (lig === 'FFF' ? 3 : lig === 'FF' ? 2 : 1);
  const valida = (x) => {
    const f = [...new Set(String(x.ponto.fase || '').toUpperCase().replace(/[^ABC]/g, ''))].sort().join('');
    return f.length === nDe(x.ligacao) && [...f].every(y => fases.includes(y)) ? f : null;
  };
  const somar = (x, f) => { x.fases = f; for (const y of f) corrente[y] += x.ib; };
  for (const x of circuitos) { const f = valida(x); if (f) somar(x, f); }
  for (const x of [...circuitos].filter(y => !y.fases).sort((a, b) => b.ib - a.ib)) {
    const n = Math.min(nDe(x.ligacao), fases.length);
    const escolha = [...fases].sort((a, b) => corrente[a] - corrente[b] || a.localeCompare(b)).slice(0, n).sort().join('');
    somar(x, escolha);
  }
  return corrente;
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
    if (corr.ligacao === 'FFF' && c.sistema !== 'trifasico') throw new Error(`Ponto ${p.id || i + 1}: carregador trifásico em sistema ${c.sistema} — informe o sistema trifásico ou um carregador monofásico.`);
    const circ = { id: p.id || `VE${i + 1}`, descricao: p.descricao || `Ponto de recarga ${i + 1}`, tipo: 'tue', ligacao: corr.ligacao, potencia_va: corr.va, comprimento_m: Number(p.comprimento_m) || c.comprimentoPadrao, agrupamento: p.agrupamento || inst.agrupamento || 1 };
    const d = E.dimensionarCircuito(circ, c, { minimo: 2.5, limiteQueda: c.quedaTerminal });
    return { ...d, ponto: p, dr: tipoDr(p), ip: p.ao_tempo ? 'IPX4 / IP4X (ao tempo) e IK08' : 'IK08' };
  });

  // Distribuição: FD = 1, salvo controle de recarga (4.2.1.1.103) — corrente POR FASE
  const somaVa = circuitos.reduce((s, x) => s + Number(x.potencia_va), 0);
  const controle = !!inst.controle_recarga && Number(inst.limite_controle_a) > 0;
  const tri = c.sistema === 'trifasico';
  const fasesSistema = FASES_DO_SISTEMA[c.sistema] || FASES_DO_SISTEMA.trifasico;
  const correnteFase = distribuirFases(circuitos, c.sistema);
  // controle de recarga: limita a corrente de recarga em cada fase
  const correnteFaseDistrib = Object.fromEntries(Object.entries(correnteFase).map(([f, i]) => [f, controle ? Math.min(i, Number(inst.limite_controle_a)) : i]));
  const [faseCritica, iDistrib] = Object.entries(correnteFaseDistrib).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

  // Carga adicional no padrão de entrada (7.1.101): demanda existente suposta equilibrada
  // nas fases do padrão (S / (nº de fases · Vfn)) + recarga na fase mais carregada
  const inGeral = Number(inst.disjuntor_geral_existente_a) || null;
  const demandaExistenteKva = Number(inst.demanda_existente_kva) || 0;
  const iExistente = demandaExistenteKva * 1000 / (fasesSistema.length * c.vfn);
  const totalFase = Object.fromEntries(fasesSistema.map(f => [f, iExistente + correnteFaseDistrib[f]]));
  const [faseTotal, iTotal] = Object.entries(totalFase).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const capacidade = inGeral ? { inGeral, iExistente, iNovo: correnteFaseDistrib[faseTotal], iTotal, fase: faseTotal, porFase: totalFase, atende: iTotal <= inGeral } : null;

  let alimentador = null;
  if (circuitos.length > 1 || inst.quadro_recarga_dedicado) {
    // Ib = fase mais carregada; disjuntor ≥ Ib e ≥ o maior disjuntor a jusante (seletividade)
    const maiorJusante = Math.max(...circuitos.map(x => x.disjuntor));
    const inAlim = Math.max(T.DISJUNTORES.find(d => d >= iDistrib) || maiorJusante, maiorJusante);
    // queda: só pontos 3F → fórmula trifásica; só F-F → F-F; com F-N → laço fase + neutro
    // na corrente da fase mais carregada (limite superior, |In| ≤ maior corrente de fase)
    const ligs = new Set(circuitos.map(x => x.ligacao));
    const ligQueda = ligs.size === 1 && ligs.has('FFF') ? 'FFF' : ligs.size === 1 && ligs.has('FF') ? 'FF' : 'FN';
    const vQ = ligQueda === 'FFF' ? Math.sqrt(3) * c.vff : ligQueda === 'FF' ? c.vff : c.vfn;
    const circ = { id: 'ALIM-VE', descricao: 'Alimentador do quadro de recarga', tipo: 'alimentador', ligacao: ligQueda, potencia_va: iDistrib * vQ, comprimento_m: c.comprimentoAlimentador, agrupamento: 1, disjuntor: inAlim, carregados: fasesSistema.length >= 2 ? 3 : 2 };
    const d = E.dimensionarCircuito(circ, c, { minimo: 2.5, limiteQueda: c.quedaAlimentador });
    const ligAlim = tri ? 'FFF' : fasesSistema.length === 2 ? 'FF' : 'FN';
    const comNeutro = !(ligs.size === 1 && (ligs.has('FFF') || ligs.has('FF')));
    alimentador = { ...d, ligacao: ligAlim, polos: fasesSistema.length, secaoNeutro: comNeutro ? d.secao : null, maiorJusante, criterio: inAlim > (T.DISJUNTORES.find(x => x >= iDistrib) || 0) ? `${d.criterio} · disjuntor ≥ maior a jusante (${maiorJusante} A)` : d.criterio, avisos: d.avisos.filter(a => !/menor que a corrente de projeto/.test(a)) };
  }

  const publico = !!inst.uso_publico;
  const uc = ucDps({ vfn: c.vfn, vff: c.vff, esquema: c.esquema }); // Tabela 49 — função comum
  const dps = { obrigatorio: publico, qtd: (tri ? 3 : fasesSistema.length === 1 || c.vfn >= 200 ? 1 : 2) + 1, uc: uc.uc, texto: uc.texto };
  const materiais = listaMateriais(circuitos, alimentador, dps, inst);
  const avisos = [];
  if (capacidade && !capacidade.atende) avisos.push(`A corrente prevista na fase ${capacidade.fase} (${capacidade.iExistente.toFixed(1)} A existentes + ${capacidade.iNovo.toFixed(1)} A de recarga = ${capacidade.iTotal.toFixed(1)} A) excede o disjuntor geral existente (${inGeral} A): solicitar aumento de carga à distribuidora, redistribuir as fases ou usar controle de recarga.`);
  if (fasesSistema.length > 1 && Math.max(...Object.values(correnteFase)) > 0) {
    const vals = Object.values(correnteFase);
    if (Math.max(...vals) - Math.min(...vals) > 0.2 * Math.max(...vals)) avisos.push(`Recarga desequilibrada entre as fases (${Object.entries(correnteFase).map(([f, i]) => `${f} ${i.toFixed(1)} A`).join(' · ')}): a distribuição e o padrão foram verificados pela fase ${faseCritica}. Confirme no projeto a fase de cada ponto (coluna "Fase").`);
  }
  if (c.sistema === 'monofasico' && c.vfn < 200) avisos.push(`Sistema monofásico de ${c.vfn} V: carregadores de VE são, em geral, para 220–240 V — confirmar a tensão de entrada na ficha técnica. [CONFERIR]`);
  if (alimentador) avisos.push(...alimentador.avisos);
  if (!capacidade) avisos.push('Informe o disjuntor geral e a demanda existente para verificar se a carga adicional cabe no padrão de entrada (NBR 17019, 7.1.101). [CONFERIR]');
  if (c.esquema === 'TN-C') avisos.push('Esquema TN-C não é permitido nos circuitos de recarga: separar PE e N (4.2.2.2.1.101).');
  return { config: c, inst, circuitos, somaVa, correnteFase, correnteFaseDistrib, faseCritica, iDistrib, controle, capacidade, alimentador, dps, publico, materiais, avisos };
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
  add('DPS', `DPS classe II Uc ≥ ${dps.uc} V, In ≥ 20 kA${dps.obrigatorio ? '' : ' (recomendado)'}`, 'un', dps.qtd, 'NBR 17019, 5.4.2.1.101; NBR 5410, 6.3.5.2.4 e Tabela 49');
  if (circuitos.some(x => x.ponto.protecao_impacto)) add('PROT', 'Proteção mecânica contra impacto (batente/defensa) junto ao carregador', 'un', circuitos.filter(x => x.ponto.protecao_impacto).length, 'NBR 17019, 6.1.3.2.103.2');
  if (inst.uso_publico) add('SIN', 'Placa de sinalização de vaga com recarga de veículo elétrico', 'un', circuitos.length, 'NBR 17019, 6.5.102.1');
  return itens.filter(i => i.quantidade > 0);
}

module.exports = { calcular, correntePorPonto, tipoDr, distribuirFases };
