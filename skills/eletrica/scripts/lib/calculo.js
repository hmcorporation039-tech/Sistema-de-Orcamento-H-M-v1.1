// Projeto de instalação elétrica de baixa tensão — ABNT NBR 5410:2004.
// Previsão de cargas (9.5.2), divisão em circuitos (9.5.3), dimensionamento
// de condutores (6.2.5 a 6.2.7), proteção (5.3.4, 5.1.3.2.2), quadro,
// demanda (fatores de concessionária, editáveis) e lista de materiais.

const T = require('./tabelas');

const FOLGA = 1.1; // +10 % de cabo para sobras, emendas e chegada no quadro
const arred = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;

function config(dados) {
  const i = dados.instalacao || {};
  return {
    vfn: Number(i.tensao_fn) || 127,
    vff: Number(i.tensao_ff) || 220,
    sistema: i.sistema || 'bifasico',
    esquema: i.esquema || 'TN-S',
    pontoEntrega: i.ponto_entrega || 'bt',
    temperatura: i.temperatura ?? 30,
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
    fdIlumTug: (i.fd_ilum_tug && i.fd_ilum_tug.length) ? i.fd_ilum_tug : T.DEMANDA_ILUM_TUG_PADRAO,
    fdTue: (i.fd_tue && i.fd_tue.length) ? i.fd_tue : T.DEMANDA_TUE_PADRAO,
  };
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
    const iluminacao = a.iluminacao_va != null && a.iluminacao_va !== '' ? Number(a.iluminacao_va) : iluminacaoMinima(Number(a.area_m2));
    let tugVa;
    if (T.LOCAIS_600VA.includes(a.tipo)) tugVa = Math.min(nTug, ate600) * 600 + Math.max(0, nTug - ate600) * 100;
    else tugVa = nTug * 100;
    const tues = (a.tues || []).filter(t => Number(t.potencia_w) > 0);
    return { ...a, iluminacao, nTug, tugVa, tues };
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
      add('tue', `${t.descricao || 'TUE'} — ${a.nome}`, Number(t.potencia_w) / fp, [a.nome], t.ligacao || (Number(t.potencia_w) > 4000 ? 'FF' : 'FN'));
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
  let escolha = null;
  for (const s of T.SECOES.filter(x => x >= smin)) {
    const izRef = T.capacidade(s, metodo, carregados, c.isolacao);
    if (izRef == null) continue;
    const iz = izRef * fct * fca;
    const inDisj = T.DISJUNTORES.find(d => d >= ib);
    const queda = (k * T.RHO_COBRE * L * ib) / (s * v) * 100;
    const okCap = iz >= ib;
    const okProt = inDisj != null && inDisj <= iz;
    const okQueda = queda <= limiteQueda;
    if (okCap && okProt && okQueda) {
      const criterio = (() => {
        const sCap = T.SECOES.find(x => x >= smin && (T.capacidade(x, metodo, carregados, c.isolacao) || 0) * fct * fca >= ib && T.DISJUNTORES.find(d => d >= ib) <= (T.capacidade(x, metodo, carregados, c.isolacao) || 0) * fct * fca);
        if (s === smin && s === sCap) return 'seção mínima (Tab. 47)';
        return s === sCap ? 'capacidade de condução / proteção' : 'queda de tensão';
      })();
      escolha = { secao: s, iz, izRef, inDisj, queda, criterio };
      break;
    }
  }
  if (!escolha) throw new Error(`Circuito ${circ.id} (${circ.descricao || ''}): nenhuma seção atende — revise potência, comprimento ou método.`);
  const neutro = ligacao === 'FF' ? null : (tri && escolha.secao > 25 && circ.neutro_reduzido ? T.NEUTRO_REDUZIDO[escolha.secao] : escolha.secao);
  return {
    ...circ, ligacao, tensao: v, ib, carregados, metodo, fct, fca, comprimento: L,
    secao: escolha.secao, secaoNeutro: neutro, secaoPE: T.secaoPE(escolha.secao),
    izRef: escolha.izRef, iz: escolha.iz, disjuntor: escolha.inDisj, polos: tri ? 3 : ligacao === 'FF' ? 2 : 1,
    queda: escolha.queda, criterio: escolha.criterio,
  };
}

// ── Fases, demanda, alimentador ────────────────────────────────────────────

function balancearFases(circuitos, sistema) {
  const fases = sistema === 'trifasico' ? ['A', 'B', 'C'] : sistema === 'bifasico' ? ['A', 'B'] : ['A'];
  const carga = Object.fromEntries(fases.map(f => [f, 0]));
  const ordenados = [...circuitos].sort((a, b) => b.potencia_va - a.potencia_va);
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
  return { carga, desequilibrio };
}

function fatorTabela(tabela, valor, chave) {
  return (tabela.find(l => valor <= Number(l[chave])) || tabela[tabela.length - 1]).fator;
}

function demanda(circuitos, c) {
  const ilumTugVa = circuitos.filter(x => x.tipo !== 'tue').reduce((s, x) => s + Number(x.potencia_va), 0);
  const tues = circuitos.filter(x => x.tipo === 'tue');
  const tueVa = tues.reduce((s, x) => s + Number(x.potencia_va), 0);
  const ilumTugKw = ilumTugVa * c.fp / 1000;
  const fd1 = fatorTabela(c.fdIlumTug, ilumTugKw, 'ate_kw');
  const fd2 = fatorTabela(c.fdTue, tues.length, 'ate_qtd');
  const dVa = ilumTugVa * fd1 + tueVa * fd2;
  return { instaladaVa: ilumTugVa + tueVa, ilumTugVa, tueVa, fdIlumTug: fd1, fdTue: fd2, nTue: tues.length, demandaVa: dVa, demandaKw: dVa * c.fp / 1000 };
}

function alimentador(dem, c, maiorQuedaTerminal) {
  const limiteTotal = c.pontoEntrega === 'trafo' ? T.QUEDA.total_trafo : T.QUEDA.total_bt;
  const limite = Math.min(c.quedaAlimentador, limiteTotal - maiorQuedaTerminal);
  let ligacao;
  let potencia = dem.demandaVa;
  if (c.sistema === 'trifasico') ligacao = 'FFF';
  else if (c.sistema === 'bifasico') { ligacao = 'FF'; } else ligacao = 'FN';
  const circ = { id: 'ALIM', descricao: 'Alimentador do quadro', tipo: 'alimentador', ligacao, potencia_va: potencia, comprimento_m: c.comprimentoAlimentador, agrupamento: 1 };
  // bifásico com neutro (F-F-N): corrente por fase = D / (2·Vfn); 3 condutores carregados (Tabela 46)
  if (c.sistema === 'bifasico') { circ.potencia_va = potencia * c.vff / (2 * c.vfn); circ.carregados = 3; }
  const d = dimensionarCircuito(circ, c, { minimo: T.SECAO_MINIMA.alimentador, limiteQueda: Math.max(limite, 0.1) });
  d.potencia_va = potencia;
  d.limiteQueda = limite;
  d.secaoNeutro = d.secao; // alimentador com neutro
  return d;
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
  Object.entries(disj).forEach(([k, q]) => add('DISJ', `Disjuntor termomagnético ${k} curva C (NBR NM 60898)`, 'un', q, 'NBR 5410, 5.3.4 e 9.5.4'));
  add('DISJ-G', `Disjuntor geral ${alim.polos === 3 ? '3P' : alim.polos === 2 ? '2P' : '1P'} ${alim.disjuntor} A`, 'un', 1, 'NBR 5410, 5.3.4');
  const drs = {};
  for (const ci of circuitos.filter(x => x.dr)) {
    const corrente = [25, 40, 63, 80, 100].find(x => x >= ci.disjuntor) || 100;
    const k = `${ci.ligacao === 'FFF' ? '4P' : '2P'} ${corrente} A 30 mA`;
    drs[k] = (drs[k] || 0) + 1;
  }
  Object.entries(drs).forEach(([k, q]) => add('DR', `Interruptor diferencial residual (DR) ${k} tipo AC/A`, 'un', q, 'NBR 5410, 5.1.3.2.2'));
  add('DPS', `DPS classe II, Uc ≥ ${quadro.dpsUc} V, In ≥ 20 kA (8/20 µs)`, 'un', quadro.dpsQtd, 'NBR 5410, 6.3.5.2 e Tabela 49');
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
  const informados = (dados.circuitos || []).filter(x => Number(x.potencia_va) > 0);
  const base = informados.length
    ? informados.map((x, i) => ({
      id: x.id || String(i + 1), ...x,
      ambientes: Array.isArray(x.ambientes) ? x.ambientes : String(x.ambientes || '').split(',').map(s => s.trim()).filter(Boolean),
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
    return d;
  });
  const fases = balancearFases(circuitos, c.sistema);
  const dem = demanda(circuitos, c);
  const maiorQueda = Math.max(...circuitos.map(x => x.queda));
  const alim = alimentador(dem, c, maiorQueda);
  const polosCircuitos = circuitos.reduce((s, x) => s + x.polos, 0);
  const reserva = T.reservaQuadro(circuitos.length);
  const drModulos = circuitos.filter(x => x.dr).length * 2;
  const nFases = c.sistema === 'trifasico' ? 3 : c.sistema === 'bifasico' ? 2 : 1;
  const dpsQtd = nFases + (c.esquema === 'TT' || c.esquema === 'TN-S' ? 1 : 0);
  const dpsUc = c.vfn * 1.1 <= 175 ? 175 : 275; // Tabela 49: Uc ≥ 1,1·Uo — valor comercial imediatamente superior
  const modulos = polosCircuitos + drModulos + reserva + alim.polos + dpsQtd;
  const quadro = { circuitos: circuitos.length, reserva, modulos: Math.ceil(modulos / 6) * 6, dpsQtd, dpsUc };
  const mat = materiais(circuitos, alim, quadro, previsao, c);
  const quedaTotal = alim.queda + maiorQueda;
  const avisos = [];
  if (fases.desequilibrio > 0.2) avisos.push(`Desequilíbrio entre fases de ${Math.round(fases.desequilibrio * 100)} % — redistribuir circuitos.`);
  if (!informados.length) avisos.push('Circuitos sugeridos automaticamente (9.5.3) com comprimento padrão — informe os comprimentos reais no formulário. [CONFERIR]');
  avisos.push('Fatores de demanda típicos de concessionária — conferir com a norma da distribuidora local. [CONFERIR]');
  return { config: c, previsao, circuitos, fases, demanda: dem, alimentador: alim, quadro, materiais: mat.itens, cabos: mat.cabos, maiorQueda, quedaTotal, avisos, circuitosSugeridos: !informados.length };
}

module.exports = { calcular, preverCargas, iluminacaoMinima, tomadasMinimas, dimensionarCircuito, config };
