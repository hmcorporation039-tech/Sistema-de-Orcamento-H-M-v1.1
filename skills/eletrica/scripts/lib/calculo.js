// Projeto de instalação elétrica de baixa tensão — ABNT NBR 5410:2004.
// Previsão de cargas (9.5.2), divisão em circuitos (9.5.3), dimensionamento
// de condutores (6.2.5 a 6.2.7), proteção (5.3.4, 5.1.3.2.2), quadro,
// demanda (fatores de concessionária, editáveis), seccionamento automático
// (5.1.2.2.4: Zs·Ia ≤ Uo), curto-circuito no quadro (5.3.5.5), DPS (Tabela 49)
// e lista de materiais.

const T = require('./tabelas');
const { ucDps } = require('../../../_comum/dps');

const FOLGA = 1.1; // +10 % de cabo para sobras, emendas e chegada no quadro
const arred = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;
// Icc presumida no ponto de entrega adotada quando a distribuidora não informa
// (mesma premissa da skill industrial) — só para a capacidade de interrupção [CONFERIR]
const ICC_ENTRADA_PADRAO_KA = 10;
// Folga mínima de queda (total − maior terminal) para o alimentador correr atrás:
// abaixo disso o problema é o circuito terminal, não o alimentador (critério de projeto H&M)
const FOLGA_QUEDA_MIN = 0.5;

function config(dados) {
  const i = dados.instalacao || {};
  return {
    vfn: Number(i.tensao_fn) || 127,
    vff: Number(i.tensao_ff) || 220,
    sistema: i.sistema || 'bifasico',
    esquema: i.esquema || 'TN-S',
    pontoEntrega: i.ponto_entrega || 'bt',
    // "" (campo vazio no formulário/CLI) não é 0 °C: vale o padrão de 30 °C
    temperatura: numeroOuNulo(i.temperatura) ?? 30,
    isolacao: i.isolacao || 'PVC',
    metodo: i.metodo || 'B1',
    fp: Number(i.fp) || 0.92,
    agrupamento: Number(i.agrupamento) || 3,
    comprimentoPadrao: Number(i.comprimento_medio_circuito_m) || 15,
    comprimentoAlimentador: Number(i.comprimento_alimentador_m) || 10,
    quedaTerminal: Number(i.queda_max_terminal_pct) || T.QUEDA.terminal,
    quedaAlimentador: Number(i.queda_max_alimentador_pct) || 1,
    limiteIluminacaoA: Number(i.limite_circuito_iluminacao_a) || 10,
    limiteTugA: Number(i.limite_circuito_tug_a) || 15,
    fdIlumTug: tabelaFd(i.fd_ilum_tug, 'ate_kw') || T.DEMANDA_ILUM_TUG_PADRAO,
    fdTue: tabelaFd(i.fd_tue, 'ate_qtd') || T.DEMANDA_TUE_PADRAO,
    // fator único definido pelo projetista (substitui a tabela por faixas)
    fdIlumTugFixo: numeroOuNulo(i.fd_ilum_tug_fixo),
    fdTueFixo: numeroOuNulo(i.fd_tue_fixo),
    // Icc presumida no ponto de entrega (kA), informada pela distribuidora — opcional
    iccEntradaKa: numeroOuNulo(i.icc_entrada_ka),
  };
}

// TUE de potência alta (> 4 kW) vai em F-F só onde a F-N é 127 V e existe a 2ª fase;
// em 220/380 V (DF) o chuveiro de 5,5 kW é F-N 220 V, e no monofásico não há F-F.
function ligacaoTue(potenciaW, c) {
  return Number(potenciaW) > 4000 && c.vfn < 200 && c.sistema !== 'monofasico' ? 'FF' : 'FN';
}

const numeroOuNulo = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

// faixas válidas do formulário, em ordem crescente (linha incompleta é ignorada)
function tabelaFd(linhas, chave) {
  const ok = (linhas || []).map(l => ({ [chave]: numeroOuNulo(l[chave]), fator: numeroOuNulo(l.fator) }))
    .filter(l => l[chave] != null && l.fator != null).sort((a, b) => a[chave] - b[chave]);
  return ok.length ? ok : null;
}

// ── 9.5.2 Previsão de cargas por ambiente ─────────────────────────────────

function iluminacaoMinima(area) {
  if (!area || area <= 6) return 100;
  return 100 + 60 * Math.floor((area - 6) / 4); // 9.5.2.1.2
}

function tomadasMinimas(amb) {
  const area = Number(amb.area_m2) || 0;
  const perim = Number(amb.perimetro_m) || 0;
  switch (amb.tipo) {
    case 'banheiro': return 1;                                   // 9.5.2.2.1 a)
    case 'cozinha':
    case 'area_servico': return Math.max(1, Math.ceil(perim / 3.5)); // b)
    case 'varanda': return 1;                                    // c)
    case 'sala':
    case 'dormitorio': return Math.max(1, Math.ceil(perim / 5));  // d)
    default:                                                     // e)
      if (area <= 6) return 1;
      return Math.max(1, Math.ceil(perim / 5));
  }
}

function preverCargas(dados) {
  // Equipamentos podem vir dentro do ambiente (ambiente.tues) ou na tabela
  // geral dados.tues com o nome do ambiente (formulário do sistema)
  const tuesGerais = dados.tues || [];
  const ambientes = (dados.ambientes || []).map(a => ({
    ...a, tues: [...(a.tues || []), ...tuesGerais.filter(t => (t.ambiente || '').trim() === (a.nome || '').trim())],
  }));
  const total600 = ambientes.filter(a => T.LOCAIS_600VA.includes(a.tipo))
    .reduce((s, a) => s + tomadasMinimas(a) + (Number(a.tugs_adicionais) || 0), 0);
  const ate600 = total600 > 6 ? 2 : 3; // 9.5.2.2.2 a)
  return ambientes.map(a => {
    const nTug = tomadasMinimas(a) + (Number(a.tugs_adicionais) || 0);
    const iluminacaoMin = iluminacaoMinima(Number(a.area_m2));
    const iluminacao = numeroOuNulo(a.iluminacao_va) ?? iluminacaoMin;
    const tugVaMin = T.LOCAIS_600VA.includes(a.tipo) ? Math.min(nTug, ate600) * 600 + Math.max(0, nTug - ate600) * 100 : nTug * 100;
    // o projetista pode adotar outra potência de tomadas (ex.: 200 VA por tomada de sala)
    const tugVa = numeroOuNulo(a.tug_va) ?? tugVaMin;
    const tues = (a.tues || []).filter(t => Number(t.potencia_w) > 0);
    return { ...a, iluminacaoMin, iluminacao, nTug, nTugMin: tomadasMinimas(a), tugVaMin, tugVa, tues };
  });
}

// ── 9.5.3 Divisão em circuitos (sugestão quando o usuário não informar) ───

function agrupar(itens, limiteVa) {
  const grupos = [];
  let atual = null;
  for (const it of itens) {
    if (!atual || atual.va + it.va > limiteVa) {
      atual = { va: 0, ambientes: [] };
      grupos.push(atual);
    }
    atual.va += it.va;
    atual.ambientes.push(it.nome);
  }
  return grupos;
}

function sugerirCircuitos(previsao, c) {
  const circuitos = [];
  const add = (tipo, descricao, va, ambientes, ligacao = 'FN') => circuitos.push({
    id: String(circuitos.length + 1), tipo, descricao, potencia_va: Math.round(va), ligacao, ambientes,
    comprimento_m: c.comprimentoPadrao, sugerido: true,
  });
  agrupar(previsao.map(a => ({ nome: a.nome, va: a.iluminacao })), c.limiteIluminacaoA * c.vfn)
    .forEach((g, i) => add('iluminacao', `Iluminação ${i + 1} — ${g.ambientes.join(', ')}`, g.va, g.ambientes));
  const cozinhas = previsao.filter(a => T.LOCAIS_COZINHA.includes(a.tipo) && a.tugVa > 0);
  const banheiros = previsao.filter(a => a.tipo === 'banheiro' && a.tugVa > 0);
  const gerais = previsao.filter(a => !T.LOCAIS_COZINHA.includes(a.tipo) && a.tipo !== 'banheiro' && a.tugVa > 0);
  const limiteTug = c.limiteTugA * c.vfn;
  agrupar(cozinhas.map(a => ({ nome: a.nome, va: a.tugVa })), limiteTug)
    .forEach((g, i) => add('tug', `Tomadas cozinha/serviço ${i + 1} — ${g.ambientes.join(', ')}`, g.va, g.ambientes));
  agrupar(banheiros.map(a => ({ nome: a.nome, va: a.tugVa })), limiteTug)
    .forEach((g, i) => add('tug', `Tomadas banheiros ${i + 1} — ${g.ambientes.join(', ')}`, g.va, g.ambientes));
  agrupar(gerais.map(a => ({ nome: a.nome, va: a.tugVa })), limiteTug)
    .forEach((g, i) => add('tug', `Tomadas de uso geral ${i + 1} — ${g.ambientes.join(', ')}`, g.va, g.ambientes));
  for (const a of previsao) {
    for (const t of a.tues) {
      const fp = Number(t.fp) || 1;
      add('tue', `${t.descricao || 'TUE'} — ${a.nome}`, Number(t.potencia_w) / fp, [a.nome], t.ligacao || ligacaoTue(t.potencia_w, c));
      circuitos[circuitos.length - 1].fp = fp;
    }
  }
  return circuitos;
}

// ── Dimensionamento de um circuito ─────────────────────────────────────────

function tensaoCircuito(ligacao, c) {
  return ligacao === 'FN' ? c.vfn : c.vff;
}

function dimensionarCircuito(circ, c, { minimo, limiteQueda }) {
  const ligacao = circ.ligacao || 'FN';
  const v = tensaoCircuito(ligacao, c);
  const va = Number(circ.potencia_va) || 0;
  const tri = ligacao === 'FFF';
  const ib = tri ? va / (Math.sqrt(3) * v) : va / v;
  const carregados = circ.carregados || (tri ? 3 : 2); // Tabela 46
  const metodo = circ.metodo || c.metodo;
  const fct = T.fatorTemperatura(c.temperatura, c.isolacao, metodo === 'D');
  const fca = T.fatorAgrupamento(circ.agrupamento ?? c.agrupamento);
  const L = Number(circ.comprimento_m) || c.comprimentoPadrao;
  const k = tri ? Math.sqrt(3) : 2;
  const smin = Math.max(minimo, Number(circ.secao_minima) || 0);
  // disjuntor e seção podem ser fixados pelo projetista: o cálculo confere e avisa
  const inFixo = numeroOuNulo(circ.disjuntor);
  const sFixa = numeroOuNulo(circ.secao);
  const inDisj = inFixo ?? T.DISJUNTORES.find(d => d >= ib);
  const avalia = (s) => {
    const izRef = T.capacidade(s, metodo, carregados, c.isolacao);
    if (izRef == null) return null;
    const iz = izRef * fct * fca;
    const queda = (k * T.RHO_COBRE * L * ib) / (s * v) * 100;
    return { secao: s, izRef, iz, queda, okCap: iz >= ib, okProt: inDisj != null && ib <= inDisj && inDisj <= iz, okQueda: queda <= limiteQueda, okMin: s >= smin };
  };
  const avisos = [];
  let escolha;
  const nome = `Circuito ${circ.id}${circ.descricao ? ` (${circ.descricao})` : ''}`;
  if (inFixo != null && inFixo < ib) avisos.push(`${nome}: disjuntor de ${inFixo} A menor que a corrente de projeto Ib = ${arred(ib, 1)} A (5.3.4).`);
  if (sFixa != null) {
    escolha = avalia(sFixa);
    if (!escolha) throw new Error(`${nome}: seção ${sFixa} mm² não existe na Tabela 36–39.`);
    escolha.criterio = 'adotada pelo projetista';
    if (!escolha.okMin) avisos.push(`${nome}: seção ${sFixa} mm² abaixo da mínima de ${smin} mm² (Tabela 47).`);
    if (!escolha.okProt) avisos.push(`${nome}: proteção não atende Ib ≤ In ≤ Iz (${arred(ib, 1)} ≤ ${inDisj} ≤ ${arred(escolha.iz, 1)} A) com ${sFixa} mm² (5.3.4).`);
    if (!escolha.okQueda) avisos.push(`${nome}: queda de tensão de ${arred(escolha.queda)} % acima do limite de ${arred(limiteQueda)} % (6.2.7).`);
  } else {
    for (const s of T.SECOES.filter(x => x >= smin)) {
      const a = avalia(s);
      if (a && a.okCap && a.okProt && a.okQueda) { escolha = a; break; }
    }
    if (!escolha) throw new Error(`${nome}: nenhuma seção atende — revise potência, comprimento, método ou o disjuntor escolhido.`);
    const sCap = T.SECOES.find(x => { const a = x >= smin && avalia(x); return a && a.okCap && a.okProt; });
    escolha.criterio = escolha.secao === smin && escolha.secao === sCap ? 'seção mínima (Tab. 47)'
      : escolha.secao === sCap ? (inFixo != null ? 'disjuntor adotado / capacidade' : 'capacidade de condução / proteção') : 'queda de tensão';
  }
  const neutro = ligacao === 'FF' ? null : (tri && escolha.secao > 25 && circ.neutro_reduzido ? T.NEUTRO_REDUZIDO[escolha.secao] : escolha.secao);
  const fp = numeroOuNulo(circ.fp) ?? c.fp;
  return {
    ...circ, ligacao, tensao: v, ib, carregados, metodo, fct, fca, comprimento: L, fp, potencia_w: va * fp,
    secaoMinima: smin, secao: escolha.secao, secaoNeutro: neutro, secaoPE: T.secaoPE(escolha.secao),
    izRef: escolha.izRef, iz: escolha.iz, disjuntor: inDisj, polos: tri ? 3 : ligacao === 'FF' ? 2 : 1,
    queda: escolha.queda, criterio: escolha.criterio, disjuntorFixo: inFixo != null, secaoFixa: sFixa != null, avisos,
  };
}

// ── Fases, demanda, alimentador ────────────────────────────────────────────

function balancearFases(circuitos, sistema) {
  const fases = sistema === 'trifasico' ? ['A', 'B', 'C'] : sistema === 'bifasico' ? ['A', 'B'] : ['A'];
  const carga = Object.fromEntries(fases.map(f => [f, 0]));
  // fases fixadas pelo projetista entram primeiro; o resto é balanceado em volta delas
  const fixas = (ci) => {
    const f = String(ci.fases_fixas || '').toUpperCase().replace(/[^ABC]/g, '');
    const n = ci.ligacao === 'FFF' ? 3 : ci.ligacao === 'FF' ? 2 : 1;
    return f.length === n && [...f].every(x => fases.includes(x)) ? [...new Set(f)].sort().join('') : null;
  };
  for (const ci of circuitos) {
    const f = fixas(ci);
    if (!f) continue;
    ci.fases = f;
    for (const x of f) carga[x] += (Number(ci.potencia_va) || 0) / f.length;
  }
  const ordenados = [...circuitos].filter(ci => !fixas(ci)).sort((a, b) => b.potencia_va - a.potencia_va);
  for (const ci of ordenados) {
    const va = Number(ci.potencia_va) || 0;
    if (ci.ligacao === 'FFF' && fases.length === 3) {
      fases.forEach(f => { carga[f] += va / 3; });
      ci.fases = 'ABC';
    } else if ((ci.ligacao === 'FF' || ci.ligacao === 'FFF') && fases.length >= 2) {
      const par = fases.length === 2 ? ['A', 'B'] : [['A', 'B'], ['B', 'C'], ['A', 'C']].sort((p, q) => (carga[p[0]] + carga[p[1]]) - (carga[q[0]] + carga[q[1]]))[0];
      par.forEach(f => { carga[f] += va / 2; });
      ci.fases = par.join('');
    } else {
      const f = fases.reduce((m, x) => (carga[x] < carga[m] ? x : m), fases[0]);
      carga[f] += va;
      ci.fases = f;
    }
  }
  const valores = Object.values(carga);
  const desequilibrio = valores.length > 1 ? (Math.max(...valores) - Math.min(...valores)) / Math.max(...valores) : 0;
  // corrente por fase: soma das correntes dos circuitos ligados a cada fase (F-N: P/Vfn; F-F: P/Vff
  // nas duas fases; 3F: P/(√3·Vff) nas três) — soma aritmética, lado da segurança
  const corrente = Object.fromEntries(fases.map(f => [f, 0]));
  for (const ci of circuitos) for (const f of new Set(String(ci.fases || ''))) if (corrente[f] != null) corrente[f] += Number(ci.ib) || 0;
  return { carga, corrente, desequilibrio };
}

function fatorTabela(tabela, valor, chave) {
  return (tabela.find(l => valor <= Number(l[chave])) || tabela[tabela.length - 1]).fator;
}

function demanda(circuitos, c) {
  const ilumTugVa = circuitos.filter(x => x.tipo !== 'tue').reduce((s, x) => s + Number(x.potencia_va), 0);
  const tues = circuitos.filter(x => x.tipo === 'tue');
  const tueVa = tues.reduce((s, x) => s + Number(x.potencia_va), 0);
  const ilumTugKw = ilumTugVa * c.fp / 1000;
  const fd1 = c.fdIlumTugFixo ?? fatorTabela(c.fdIlumTug, ilumTugKw, 'ate_kw');
  const fd2 = c.fdTueFixo ?? fatorTabela(c.fdTue, tues.length, 'ate_qtd');
  const dVa = ilumTugVa * fd1 + tueVa * fd2;
  return { instaladaVa: ilumTugVa + tueVa, ilumTugVa, tueVa, fdIlumTug: fd1, fdTue: fd2, nTue: tues.length, demandaVa: dVa, demandaKw: dVa * c.fp / 1000 };
}

// Alimentador: Ib = maior corrente de fase × FD (demanda ÷ instalada). Dividir a demanda
// total pelas fases supõe carga equilibrada e subdimensiona a fase mais carregada.
function alimentador(dem, fases, c, maiorQuedaTerminal) {
  const limiteTotal = c.pontoEntrega === 'trafo' ? T.QUEDA.total_trafo : T.QUEDA.total_bt;
  const folga = limiteTotal - maiorQuedaTerminal;
  const limite = folga < FOLGA_QUEDA_MIN ? c.quedaAlimentador : Math.min(c.quedaAlimentador, folga);
  const ligacao = c.sistema === 'trifasico' ? 'FFF' : c.sistema === 'bifasico' ? 'FF' : 'FN';
  const fd = dem.instaladaVa > 0 ? dem.demandaVa / dem.instaladaVa : 0;
  const iFaseMax = Math.max(0, ...Object.values(fases.corrente));
  const ib = iFaseMax * fd;
  // potência equivalente que dá Ib no motor de dimensionamento (3F: √3·Vff; 2F+N: Vff; F+N: Vfn)
  const vEq = ligacao === 'FFF' ? Math.sqrt(3) * c.vff : ligacao === 'FF' ? c.vff : c.vfn;
  const circ = { id: 'ALIM', descricao: 'Alimentador do quadro', tipo: 'alimentador', ligacao, potencia_va: ib * vEq, comprimento_m: c.comprimentoAlimentador, agrupamento: 1 };
  if (c.sistema === 'bifasico') circ.carregados = 3; // F-F-N: 3 condutores carregados (Tabela 46)
  const d = dimensionarCircuito(circ, c, { minimo: T.SECAO_MINIMA.alimentador, limiteQueda: limite });
  d.potencia_va = dem.demandaVa;
  d.fd = fd;
  d.iFaseMax = iFaseMax;
  d.limiteQueda = limite;
  d.folgaQuedaInsuficiente = folga < FOLGA_QUEDA_MIN;
  d.secaoNeutro = d.secao; // alimentador com neutro
  return d;
}

// ── Seccionamento automático (5.1.2.2.4) e curto-circuito no quadro (5.3.5.5) ──
// Icc máxima no quadro (capacidade de interrupção): fonte com a Icc da entrada (X/R = 1)
// + resistência de fase do alimentador a 20 °C. Laço de falta fase–PE (TN): fonte
// (2·Uo/Icc, só com a Icc informada) + alimentador + circuito, resistências a 70 °C
// (ρ = 0,0225), reatância dos cabos desprezada (seções pequenas). Ia = limite superior
// do disparo instantâneo da curva C (10·In) → seccionamento em menos de 0,1 s, abaixo
// dos tempos da Tabela 25.
function protecaoFalta(circuitos, alim, c) {
  const uo = c.vfn;
  const iccInformada = c.iccEntradaKa != null && c.iccEntradaKa > 0;
  const iccEntrada = (iccInformada ? c.iccEntradaKa : ICC_ENTRADA_PADRAO_KA) * 1000;
  const zq = uo / iccEntrada;
  const rAlim20 = T.RHO_COBRE_20 * alim.comprimento / alim.secao;
  const iccQuadro = uo / Math.hypot(zq / Math.SQRT2 + rAlim20, zq / Math.SQRT2);
  const icnKa = T.ICN_KA.find(k => k * 1000 >= iccQuadro) ?? null;
  const zFonteLaco = iccInformada ? 2 * uo / iccEntrada : 0;
  const zAlimLaco = T.RHO_COBRE * alim.comprimento * (1 / alim.secao + 1 / alim.secaoPE);
  const zMontante = zFonteLaco + zAlimLaco;
  const verificar = (x, zAntes) => {
    const porMetro = T.RHO_COBRE * (1 / x.secao + 1 / x.secaoPE);
    const zs = zAntes + porMetro * x.comprimento;
    const ia = T.CURVA_IA.C * x.disjuntor;
    const zsMax = uo / ia;
    const k = T.kCurto(c.isolacao, x.secao);
    return { zs, ia, zsMax, lMax: Math.max(0, (zsMax - zAntes) / porMetro), disjuntorSecciona: zs <= zsMax + 1e-12, k, k2s2: k * k * x.secao * x.secao };
  };
  for (const ci of circuitos) ci.falta = verificar(ci, zMontante);
  alim.falta = verificar(alim, zFonteLaco);
  return { iccInformada, iccEntradaKa: iccEntrada / 1000, iccQuadro, icnKa, zFonteLaco, zAlimLaco, zMontante, curva: 'C' };
}

// ── Materiais ──────────────────────────────────────────────────────────────

function materiais(circuitos, alim, quadro, previsao, c) {
  const cabos = {};
  const somaCabo = (s, m) => { cabos[s] = (cabos[s] || 0) + m; };
  for (const ci of [...circuitos, alim]) {
    const L = ci.comprimento * FOLGA;
    const fasesN = ci.ligacao === 'FFF' ? 3 : ci.ligacao === 'FF' ? 2 : 1;
    somaCabo(ci.secao, L * fasesN);
    if (ci.secaoNeutro) somaCabo(ci.secaoNeutro, L);
    somaCabo(ci.secaoPE, L);
  }
  const itens = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => itens.push({ codigo, descricao, unidade, quantidade: arred(quantidade, 1), referencia });
  const iso = c.isolacao === 'PVC' ? '450/750 V PVC' : '0,6/1 kV EPR/XLPE';
  Object.keys(cabos).map(Number).sort((a, b) => a - b).forEach(s => add(`CAB-${String(s).replace('.', ',')}`, `Cabo de cobre flexível ${String(s).replace('.', ',')} mm² ${iso}`, 'm', Math.ceil(cabos[s]), 'NBR 5410, 6.2'));
  const disj = {};
  for (const ci of circuitos) { const k = `${ci.polos}P ${ci.disjuntor} A`; disj[k] = (disj[k] || 0) + 1; }
  const icn = quadro.icnKa ? `, capacidade de interrupção ≥ ${String(quadro.icnKa).replace('.', ',')} kA` : '';
  Object.entries(disj).forEach(([k, q]) => add('DISJ', `Disjuntor termomagnético ${k} curva C (NBR NM 60898)${icn}`, 'un', q, 'NBR 5410, 5.3.4, 5.3.5.5.1 e 9.5.4'));
  add('DISJ-G', `Disjuntor geral ${alim.polos === 3 ? '3P' : alim.polos === 2 ? '2P' : '1P'} ${alim.disjuntor} A${icn}`, 'un', 1, 'NBR 5410, 5.3.4 e 5.3.5.5.1');
  const drs = {};
  for (const ci of circuitos.filter(x => x.dr)) {
    const corrente = [25, 40, 63, 80, 100].find(x => x >= ci.disjuntor) || 100;
    const k = `${ci.ligacao === 'FFF' ? '4P' : '2P'} ${corrente} A 30 mA`;
    drs[k] = (drs[k] || 0) + 1;
  }
  Object.entries(drs).forEach(([k, q]) => add('DR', `Interruptor diferencial residual (DR) ${k} tipo AC/A`, 'un', q, 'NBR 5410, 5.1.3.2.2'));
  add('DPS', `DPS classe II, Uc ≥ ${quadro.dpsUc} V, In ≥ 20 kA (8/20 µs)`, 'un', quadro.dpsQtd, 'NBR 5410, 6.3.5.2.4 e Tabela 49');
  add('QD', `Quadro de distribuição de embutir para ${quadro.modulos} módulos DIN, com barramentos de fase, neutro e terra`, 'un', 1, 'NBR 5410, 6.5.4.7 e Tabela 59');
  const nTug = previsao.reduce((s, a) => s + a.nTug, 0);
  const nTue = circuitos.filter(x => x.tipo === 'tue').length;
  const nAmb = previsao.length;
  add('TOM', 'Tomada 2P+T 10 A (padrão NBR 14136) com placa', 'un', nTug, 'NBR 5410, 9.5.2.2');
  if (nTue) add('TOM-E', 'Ponto de força para equipamento (TUE) — tomada 20 A ou conexão direta', 'un', nTue, 'NBR 5410, 9.5.3.1 e 9.5.2.3');
  add('INT', 'Interruptor simples com placa', 'un', nAmb, 'NBR 5410, 9.5.2.1.1');
  add('LUZ', 'Ponto de luz no teto (caixa octogonal + conexões)', 'un', nAmb, 'NBR 5410, 9.5.2.1.1');
  add('CX', 'Caixa de embutir 4×2"', 'un', nTug + nAmb, '—');
  const eletroduto = circuitos.reduce((s, x) => s + x.comprimento, 0) + alim.comprimento;
  add('ELE', 'Eletroduto corrugado/rígido PVC (estimativa pelo comprimento dos circuitos — conferir no projeto)', 'm', Math.ceil(eletroduto), 'NBR 5410, 6.2.11');
  return { itens, cabos };
}

// ── Cálculo completo ───────────────────────────────────────────────────────

function calcular(dados) {
  const c = config(dados);
  const previsao = preverCargas(dados);
  // potência em VA ou em W com o FP do circuito; "fases" do formulário = fases fixas
  const vaDe = (x) => numeroOuNulo(x.potencia_va) ?? (numeroOuNulo(x.potencia_w) != null ? x.potencia_w / (numeroOuNulo(x.fp) || c.fp) : null);
  const informados = (dados.circuitos || []).filter(x => vaDe(x) > 0);
  const base = informados.length
    ? informados.map((x, i) => ({
      ...x, id: x.id || String(i + 1), potencia_va: vaDe(x), fases_fixas: x.fases || null, fases: undefined,
      ambientes: Array.isArray(x.ambientes) ? x.ambientes : String(x.ambientes || '').split(/[,;]/).map(s => s.trim()).filter(Boolean),
    }))
    : sugerirCircuitos(previsao, c);
  const semAmbiente = (dados.tues || []).filter(t => !(dados.ambientes || []).some(a => (a.nome || '').trim() === (t.ambiente || '').trim()));
  if (semAmbiente.length) throw new Error(`Equipamento sem ambiente correspondente: ${semAmbiente.map(t => t.descricao || '?').join(', ')} — confira o nome do ambiente.`);
  if (!base.length) throw new Error('Informe os ambientes (com área e perímetro) ou os circuitos.');
  const tipoAmb = Object.fromEntries((dados.ambientes || []).map(a => [a.nome, a.tipo]));
  const circuitos = base.map(ci => {
    const minimo = ci.tipo === 'iluminacao' ? T.SECAO_MINIMA.iluminacao : T.SECAO_MINIMA.tug;
    const d = dimensionarCircuito(ci, c, { minimo, limiteQueda: c.quedaTerminal });
    const locais = (ci.ambientes || []).map(n => tipoAmb[n]).filter(Boolean);
    const exigeDr = locais.some(t => T.LOCAIS_DR.includes(t));
    d.dr = ci.dr === true || exigeDr;
    d.drObrigatorio = exigeDr;
    d.drMotivos = exigeDr ? ['local de 5.1.3.2.2'] : [];
    if (exigeDr && ci.dr === false) d.avisos.push(`Circuito ${ci.id}: atende local que exige DR 30 mA (5.1.3.2.2) — DR mantido.`);
    const nome = `Circuito ${ci.id}`;
    if (c.sistema === 'monofasico' && d.ligacao !== 'FN') d.avisos.push(`${nome}: ligação ${d.ligacao} não existe em sistema monofásico (F+N) — use F-N ou mude o sistema.`);
    if (c.sistema === 'bifasico' && d.ligacao === 'FFF') d.avisos.push(`${nome}: ligação trifásica em sistema bifásico (2F+N) — use F-F ou mude o sistema.`);
    return d;
  });
  const fases = balancearFases(circuitos, c.sistema);
  const dem = demanda(circuitos, c);
  const maiorQueda = Math.max(...circuitos.map(x => x.queda));
  const alim = alimentador(dem, fases, c, maiorQueda);
  const falta = protecaoFalta(circuitos, alim, c);
  const avisosFalta = [];
  for (const ci of circuitos) {
    if (c.esquema === 'TT') {
      // TT: o seccionamento automático é sempre por DR (5.1.2.2.4.3; RA·IΔn ≤ 50 V)
      if (!ci.dr) { ci.dr = true; ci.drObrigatorio = true; }
      ci.drMotivos.push('esquema TT (5.1.2.2.4.3)');
    } else if (!ci.falta.disjuntorSecciona) {
      const txt = `Circuito ${ci.id}: Zs = ${arred(ci.falta.zs, 2)} Ω > Uo/Ia = ${c.vfn}/${ci.falta.ia} = ${arred(ci.falta.zsMax, 2)} Ω — o disjuntor de ${ci.disjuntor} A curva C não garante o seccionamento automático (5.1.2.2.4.2; sem DR, comprimento máximo ${arred(ci.falta.lMax, 0)} m)`;
      if (!ci.dr) { ci.dr = true; ci.drObrigatorio = true; avisosFalta.push(`${txt}: DR 30 mA incluído (ou aumentar a seção / encurtar o circuito).`); } else avisosFalta.push(`${txt}: o seccionamento fica a cargo do DR 30 mA do circuito.`);
      ci.drMotivos.push('seccionamento automático (Zs·Ia > Uo)');
    }
  }
  if (c.esquema !== 'TT' && !alim.falta.disjuntorSecciona && falta.iccInformada) avisosFalta.push(`Alimentador: Zs = ${arred(alim.falta.zs, 3)} Ω > Uo/Ia = ${arred(alim.falta.zsMax, 3)} Ω com o disjuntor geral de ${alim.disjuntor} A curva C — rever a proteção do alimentador (5.1.2.2.4.2).`);
  if (falta.icnKa == null || falta.icnKa > 25) avisosFalta.push(`Icc presumida no quadro de ${arred(falta.iccQuadro / 1000, 1)} kA: acima da faixa da NBR NM 60898 — disjuntores IEC 60947-2 ou proteção de retaguarda (5.3.5.5.1).`);
  const polosCircuitos = circuitos.reduce((s, x) => s + x.polos, 0);
  const reserva = T.reservaQuadro(circuitos.length);
  const drModulos = circuitos.filter(x => x.dr).length * 2;
  const nFases = c.sistema === 'trifasico' ? 3 : c.sistema === 'bifasico' ? 2 : 1;
  const dpsQtd = nFases + (c.esquema === 'TT' || c.esquema === 'TN-S' ? 1 : 0);
  const dps = ucDps({ vfn: c.vfn, vff: c.vff, esquema: c.esquema }); // Tabela 49 — função comum das skills elétricas
  const modulos = polosCircuitos + drModulos + reserva + alim.polos + dpsQtd;
  const quadro = { circuitos: circuitos.length, reserva, modulos: Math.ceil(modulos / 6) * 6, dpsQtd, dpsUc: dps.uc, dps, iccKa: falta.iccQuadro / 1000, icnKa: falta.icnKa };
  const mat = materiais(circuitos, alim, quadro, previsao, c);
  const quedaTotal = alim.queda + maiorQueda;
  const limiteTotal = c.pontoEntrega === 'trafo' ? T.QUEDA.total_trafo : T.QUEDA.total_bt;
  const avisos = [...circuitos.flatMap(x => x.avisos), ...avisosFalta];
  if (quedaTotal > limiteTotal + 1e-9) {
    const pior = circuitos.find(x => x.queda === maiorQueda);
    avisos.push(`Queda de tensão total de ${arred(quedaTotal)} % acima de ${limiteTotal} % (6.2.7.1): o circuito ${pior.id} sozinho tem ${arred(maiorQueda)} % — aumentar a seção desse circuito terminal${alim.folgaQuedaInsuficiente ? ` (o alimentador ficou no seu limite de ${arred(alim.limiteQueda)} %, sem ser superdimensionado para compensar)` : ''}.`);
  }
  if (fases.desequilibrio > 0.2) {
    const [fMax, iMax] = Object.entries(fases.corrente).sort((a, b) => b[1] - a[1])[0];
    avisos.push(`Desequilíbrio entre fases de ${Math.round(fases.desequilibrio * 100)} % — redistribuir circuitos. O alimentador foi dimensionado pela fase mais carregada (fase ${fMax}: ${arred(iMax, 1)} A instalados × FD ${arred(alim.fd, 2)} = ${arred(alim.ib, 1)} A).`);
  }
  if (!informados.length) avisos.push('Circuitos sugeridos automaticamente (9.5.3) com comprimento padrão — informe os comprimentos reais no formulário (botão "Trazer os circuitos calculados" na seção 4). [CONFERIR]');
  if (c.fdIlumTugFixo == null || c.fdTueFixo == null) avisos.push('Fatores de demanda típicos de concessionária — conferir com a norma da distribuidora local. [CONFERIR]');
  if (!falta.iccInformada) avisos.push(`Icc presumida no ponto de entrega não informada: adotados ${ICC_ENTRADA_PADRAO_KA} kA para a capacidade de interrupção (Icc no quadro ≈ ${arred(falta.iccQuadro / 1000, 1)} kA) e laço de falta sem a impedância a montante do alimentador (Zs real maior) — informe a Icc da distribuidora. [CONFERIR]`);
  return { config: c, previsao, circuitos, fases, demanda: dem, alimentador: alim, quadro, falta, materiais: mat.itens, cabos: mat.cabos, maiorQueda, quedaTotal, limiteQuedaTotal: limiteTotal, avisos, circuitosSugeridos: !informados.length };
}

module.exports = { calcular, preverCargas, iluminacaoMinima, tomadasMinimas, dimensionarCircuito, config, ligacaoTue, balancearFases, protecaoFalta };
