// Disciplina ELÉTRICA INDUSTRIAL (motores, partidas, CCM, correção do FP e
// curto-circuito — NBR 5410 6.5.1, NBR 17094-1, NBR IEC 60947-4-1, NBR IEC
// 61439, IEC 60909, REN ANEEL 1000) — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { fmtNum } = require('../../../_comum/docx-base');
const T = require('../../../_comum/eletrico/tabelas');
const X = require('./tabelas');
const { calcular } = require('./calculo');
const { montarUnifilar } = require('./unifilar');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-industria.json');

const NORMAS = [
  ['ABNT NBR 5410:2004 (versão corrigida 2008)', 'Instalações elétricas de baixa tensão — 6.5.1 (motores), 6.2 (condutores), 5.3 (proteção)'],
  ['ABNT NBR 17094-1', 'Máquinas elétricas girantes — motores de indução trifásicos (dados de placa, FS, Ip/In)'],
  ['IEC 60034-1 / IEC 60034-30-1', 'Máquinas elétricas girantes — regimes de serviço (S1 a S10) e classes de rendimento'],
  ['ABNT NBR IEC 60947-2 / 60947-4-1 / 60947-4-2', 'Disjuntores; contatores e partidas de motores (AC-3/AC-4, coordenação); soft-starters'],
  ['ABNT NBR IEC 61439-1 e 61439-2', 'Conjuntos de manobra e comando de baixa tensão (QGBT e CCM)'],
  ['IEC 60909-0', 'Correntes de curto-circuito em sistemas trifásicos CA'],
  ['IEC 60831-1 / ABNT NBR 5060', 'Capacitores de potência em derivação e guia de instalação'],
  ['REN ANEEL 1000/2021', 'Regras de prestação do serviço — fator de potência de referência 0,92'],
  ['IEC 61800-3 / 61800-5-1', 'Acionamentos de velocidade variável — EMC e segurança'],
  ['NR-10 e NR-12', 'Segurança em instalações elétricas; segurança em máquinas e equipamentos'],
];
const SECOES_CHECKLIST = ['Documentação', 'Quadros e CCM', 'Motores e partidas', 'Proteção', 'Aterramento', 'Banco de capacitores', 'Segurança NR-10 / NR-12', 'Ensaios e termografia'];

const num = fmtNum; // número pt-BR; '—' quando vazio ou inválido
const sec = (s) => (s == null ? '—' : `${String(s).replace('.', ',')} mm²`);
const ka = (a) => `${num(a / 1000, 2)} kA`;
const caboTxt = (a) => (a ? `${a.paralelos > 1 ? `${a.paralelos} × ` : ''}${a.condutores === 6 ? '6 × ' : '3 × '}${sec(a.secao)}${a.secaoNeutro ? ` + N ${sec(a.secaoNeutro)}` : ''} + PE ${sec(a.secaoPE)}` : '—');
const caboAlim = (a) => (a ? `${a.paralelos > 1 ? `${a.paralelos} × (` : ''}3 × ${sec(a.secao)}${a.secaoNeutro ? ` + N ${sec(a.secaoNeutro)}` : ''}${a.paralelos > 1 ? ')' : ''} + PE ${a.paralelos > 1 ? `${a.paralelos} × ` : ''}${sec(a.secaoPE)}` : '—');
const protTxt = (u) => u.partidaInfo.dispositivos.filter(d => !['contator', 'temporizador', 'soft_starter', 'inversor'].includes(d.tipo)).map(d => (d.faixa ? `${d.ref} ${num(d.faixa[0])}–${num(d.faixa[1])} A` : `${d.ref} ${d.nominal_a} A`)).join(' + ');
const contTxt = (u) => u.partidaInfo.dispositivos.filter(d => d.tipo === 'contator').map(d => `${d.ref} ${d.nominal_a} A`).join(', ');
const ROTULO_PARTIDA = Object.fromEntries(Object.entries(X.PARTIDAS).map(([k, v]) => [k, v.rotulo]));

// ── Inspeção ────────────────────────────────────────────────────────────────

const ISOLAMENTO_MIN_MOTOR = 5; // MΩ — IEEE 43-2013, enrolamentos randômicos < 1 kV [CONFERIR]
const TERMO_DELTA_MAX = 10;     // °C — ΔT acima do qual a anomalia vira NC [CONFERIR critério da NBR 15572]

function medicoes(insp, calc) {
  const porTag = new Map(calc.unidades.map(u => [u.tag, u]));
  const isolamento = (insp.isolamento_motores || []).map(m => ({
    ...m, criterio: `≥ ${ISOLAMENTO_MIN_MOTOR} MΩ (IEEE 43; NBR 5410 Tabela 60 para o circuito)`,
    resultado: m.valor_mohm == null || m.valor_mohm === '' ? 'NV' : Number(m.valor_mohm) >= ISOLAMENTO_MIN_MOTOR ? 'C' : 'NC',
  }));
  const continuidade = (insp.continuidade_pe || []).map(m => ({
    ...m, criterio: 'Continuidade confirmada; ≤ 1 Ω adotado como referência (7.3.2)',
    resultado: m.valor_ohm == null || m.valor_ohm === '' ? 'NV' : Number(m.valor_ohm) <= 1 ? 'C' : 'NC',
  }));
  const reles = (insp.reles || []).map(m => {
    const u = porTag.get(String(m.motor || '').trim());
    const ref = u ? u.partidaInfo.sobrecarga.ajuste_a : Number(m.in_placa_a) || null;
    const fs = u ? u.fs : Number(m.fs) || 1;
    const max = ref ? ref * fs * 1.05 : null;
    let resultado = 'NV';
    if (m.ajuste_a != null && m.ajuste_a !== '' && max) {
      const okAjuste = Number(m.ajuste_a) <= max;
      const okCorrente = m.corrente_medida_a == null || m.corrente_medida_a === '' || Number(m.corrente_medida_a) <= Number(m.ajuste_a);
      resultado = okAjuste && okCorrente ? 'C' : 'NC';
    }
    return { ...m, referencia: ref, maximo: max, criterio: ref ? `ajuste ≤ ${num(ref, 1)} A × FS ${num(fs)} (+5 %) e ≥ corrente medida` : 'informar In de placa', resultado };
  });
  const termografia = (insp.termografia || []).map(m => {
    const dt = m.temperatura_c == null || m.temperatura_c === '' || m.referencia_c == null || m.referencia_c === '' ? null : Number(m.temperatura_c) - Number(m.referencia_c);
    return { ...m, delta: dt, criterio: `ΔT ≤ ${TERMO_DELTA_MAX} °C em relação à referência (fase/componente similar)`, resultado: dt == null ? 'NV' : dt <= TERMO_DELTA_MAX ? 'C' : 'NC' };
  });
  return { isolamento, continuidade, reles, termografia };
}

function processar(dados) {
  const calc = calcular(dados);
  calc.unifilar = montarUnifilar(calc);
  const insp = dados.inspecao || {};
  const temInversor = calc.unidades.some(u => u.partida === 'inversor');
  const temSemicondutor = calc.unidades.some(u => u.partida === 'inversor' || u.partida === 'soft_starter');
  const temBanco = calc.banco.necessario || !!(dados.instalacao || {}).banco_existente;
  const na = {
    ...(calc.demanda.instaladaKw > 75 ? {} : { D2: 'Carga instalada ≤ 75 kW (NR-10, 10.2.4)' }),
    ...(temBanco ? {} : { C1: 'Sem banco de capacitores', C2: 'Sem banco de capacitores', C3: 'Sem banco de capacitores' }),
    ...(temInversor ? {} : { A3: 'Sem inversores de frequência', ...(temBanco ? { C3: 'Sem cargas não lineares relevantes (inversores)' } : {}) }),
    ...(temSemicondutor ? {} : { M4: 'Sem soft-starters/inversores' }),
  };
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, na);
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const med = medicoes(insp, calc);
  const parecer = I.parecer(checklist, ncs, [...med.isolamento, ...med.continuidade, ...med.reles, ...med.termografia]);
  return { dados, calc, insp, checklist, ncs, med, parecer };
}

// ── Resumo para a tela ──────────────────────────────────────────────────────

function resumir(res) {
  const { calc } = res;
  const c = calc.config;
  const b = calc.banco;
  const tr = calc.trafo;
  const piorPartida = calc.unidades.reduce((a, u) => (!a || u.quedaPartida.motor > a.quedaPartida.motor ? u : a), null);
  const piorRegime = calc.unidades.reduce((a, u) => (!a || u.quedaTotalRegime > a.quedaTotalRegime ? u : a), null);
  const temInspecao = (res.insp.checklist || []).length || (res.insp.isolamento_motores || []).length;
  const cvTotal = calc.unidades.reduce((s, u) => s + u.cv, 0);
  return {
    indicadores: [
      { rotulo: 'Motores', valor: `${calc.unidades.length} (${num(cvTotal, 0)} cv)`, detalhe: `${calc.unidades.filter(u => u.emOperacao).length} em operação simultânea` },
      { rotulo: 'Demanda', valor: `${num(calc.demanda.kw, 1)} kW · ${num(calc.demanda.kva, 1)} kVA`, detalhe: `FP calculado ${num(calc.demanda.fp, 3)} · instalada ${num(calc.demanda.instaladaKw, 1)} kW` },
      ...(tr ? [{ rotulo: 'Transformador', valor: `${num(tr.kva, 1)} kVA · ${num(tr.carregamentoDepois * 100, 0)} %`, ok: tr.atende, detalhe: `antes da correção ${num(tr.carregamentoAntes * 100, 0)} % · In ${num(tr.inSec, 0)} A` }] : []),
      { rotulo: 'Correção do FP', valor: b.necessario ? `${num(b.total, 1)} kvar` : 'não necessária', ok: b.necessario ? b.fpDepois >= c.fpAlvo - 1e-6 : true,
        detalhe: b.necessario ? `${b.tipo === 'automatico' ? `${b.n} × ${num(b.estagio, 1)} kvar` : 'fixo'} · FP ${num(b.fp1, 2)} → ${num(b.fpDepois, 3)}${b.dessintonizado ? ' · dessintonizado' : ''}` : `FP ${num(b.fp1, 3)} ≥ ${num(c.fpAlvo, 2)}` },
      { rotulo: 'Icc no QGBT', valor: ka(calc.qgbt.curto.icc), detalhe: `Icu mínimo ${calc.qgbt.curto.icuMin} kA · Ipk ${ka(calc.qgbt.curto.ip)}` },
      { rotulo: 'Disjuntor geral', valor: `${calc.entrada.disjuntorGeral} A`, detalhe: `cabo de entrada ${caboAlim(calc.entrada.cabo)}` },
      ...(piorPartida ? [{ rotulo: 'Pior queda na partida', valor: `${num(piorPartida.quedaPartida.motor, 1)} %`, ok: piorPartida.quedaPartida.dispositivo <= c.quedaPartida, detalhe: `${piorPartida.tag} · ${num(piorPartida.quedaPartida.dispositivo, 1)} % no dispositivo de partida (limite ${c.quedaPartida} %)` }] : []),
      ...(piorRegime ? [{ rotulo: 'Pior queda em regime', valor: `${num(piorRegime.quedaTotalRegime)} %`, ok: piorRegime.quedaTotalRegime <= c.quedaTotal + 1e-6, detalhe: `${piorRegime.tag} · limite ${c.quedaTotal} % (6.2.7)` }] : []),
      ...(temInspecao ? [{ rotulo: 'Parecer da inspeção', valor: res.parecer.situacao.replace(/_/g, ' '), ok: res.parecer.situacao === 'CONFORME' ? true : res.parecer.situacao === 'INCONCLUSIVO' ? undefined : false, detalhe: `NC ${res.parecer.cont.NC} · NV ${res.parecer.cont.NV}` }] : []),
    ],
    textos: [...calc.avisos, ...calc.premissas],
    tabelas: [
      { titulo: 'Motores e partidas', colunas: ['TAG', 'Descrição', 'Quadro', 'cv', 'In (A)', 'Partida', 'Ip linha (A)', 'Proteção', 'Contatores', 'Cabo', 'ΔV reg. %', 'ΔV partida %'],
        linhas: calc.unidades.map(u => [u.tag, u.descricao, u.quadro, num(u.cv, 1), num(u.in, 1), ROTULO_PARTIDA[u.partida], num(u.partidaInfo.ipLinha, 0), protTxt(u), contTxt(u), caboTxt(u.circuito), num(u.circuito.queda), `${num(u.quedaPartida.dispositivo, 1)} / ${num(u.quedaPartida.motor, 1)}`]) },
      { titulo: 'Quadros e alimentadores (NBR 5410, 6.5.1)', colunas: ['Quadro', 'Ib (A)', 'Cabo', 'Disjuntor', 'ΔV %', 'Icc (kA)', 'Icu mín.', 'Barramento / Icw'],
        linhas: [
          ['QGBT', num(calc.qgbt.projeto.ib, 1), caboAlim(calc.entrada.cabo), `${calc.entrada.disjuntorGeral} A`, num(calc.entrada.cabo.quedaDemanda), num(calc.qgbt.curto.icc / 1000), `${calc.qgbt.curto.icuMin} kA`, `${calc.qgbt.conjunto.barramento} A / ${calc.qgbt.conjunto.icw} kA`],
          ...calc.quadros.filter(q => q.alim).map(q => [q.id, num(q.projeto.ib, 1), caboAlim(q.alim), `${q.alim.disjuntor} A`, num(q.alim.queda), num(q.curto.icc / 1000), `${q.curto.icuMin} kA`, `${q.conjunto.barramento} A / ${q.conjunto.icw} kA`]),
        ] },
    ],
  };
}

// ── Documentos ──────────────────────────────────────────────────────────────

function secoesMemorial(res) {
  const { calc, dados } = res;
  const c = calc.config;
  const b = calc.banco;
  const tr = calc.trafo;
  const e = calc.entrada;
  const s = [];
  s.push({ titulo: '1. Objeto e premissas', paragrafos: [
    `Projeto das instalações elétricas industriais de baixa tensão de ${dados.obra?.nome || 'a instalação'}: ${calc.unidades.length} motores, ${calc.quadros.length} quadro(s)/CCM(s) alimentados pelo QGBT, correção do fator de potência e verificação de curto-circuito.`,
    `Sistema trifásico ${c.vff}/${c.vfn} V, ${c.frequencia} Hz, esquema ${c.esquema}, ${c.entrada === 'trafo' ? `alimentado por transformador próprio de ${num(c.trafoKva, 1)} kVA, Z = ${num(c.trafoZ)} %` : 'alimentado em baixa tensão pela distribuidora'}. Condutores de cobre ${c.isolacao === 'PVC' ? 'PVC 70 °C' : 'EPR/XLPE 90 °C, 0,6/1 kV'}, circuitos de motores no método ${c.metodo} (${T.METODOS[c.metodo]}) e alimentadores no método ${c.metodoAlim} (${T.METODOS[c.metodoAlim]}), temperatura ambiente ${c.temperatura} °C.`,
  ] });
  s.push({ titulo: '2. Critérios de cálculo', marcadores: [
    'Corrente nominal do motor: In = P / (√3 · V · η · FP), com P no eixo em kW (1 cv = 0,7355 kW) e η, FP da placa (NBR 17094-1). Havendo In de placa, ela prevalece.',
    'Circuito terminal de motor (NBR 5410, 6.5.1): Ib = 1,25 × In (ou FS × In, se maior). Seção pelo maior entre capacidade de condução (Tabelas 36–39 com FCT da Tabela 40 e FCA da Tabela 42), seção mínima de 2,5 mm² (Tabela 47) e queda de tensão em regime ≤ ' + `${num(c.quedaTerminal)} % (6.2.7). PE pela Tabela 58.`,
    'Estrela-triângulo: 6 condutores entre o CCM e o motor, cada um com a corrente de fase In/√3; queda no enrolamento em Δ = 2·ρ·L·If/(S·V).',
    `Queda de tensão na partida ≤ ${num(c.quedaPartida)} % nos terminais do dispositivo de partida (NBR 5410, 6.5.1 e 6.2.7) [CONFERIR item], calculada por ΔV = ΔV(regime até o quadro) + √3·Ip·(R·cos φp + X·sen φp)/V em cada trecho, incluindo a impedância do transformador; o mesmo limite é aplicado nos terminais do motor para a escolha da seção do circuito. No estágio estrela da Y-Δ cada enrolamento tem dois condutores em série.`,
    'Alimentador do CCM (NBR 5410, 6.5.1): Ib = 1,25 × In do maior motor + soma das In dos demais motores em operação simultânea + corrente de demanda das outras cargas; condutores em paralelo acima de ' + `${c.secaoMaxParalelo} mm²; queda total em regime do transformador ao motor ≤ ${num(c.quedaTotal)} % (6.2.7).`,
    'Partidas (NBR IEC 60947-4-1): contatores em AC-3; direta: K1 ≥ In; Y-Δ: K1 e K2 ≥ In/√3 e K3 ≥ In/3, corrente e conjugado de partida reduzidos a 1/3; soft-starter (NBR IEC 60947-4-2) com corrente de partida limitada; inversor com aceleração em corrente controlada. Coordenação tipo 2 pela tabela do fabricante.',
    'Curto-circuito (IEC 60909-0): Icc = c · V / (√3 · |Zrede + K_T·Ztrafo + Zcabos|), com c = c_max, Ztrafo = Z% · V²/S corrigida por K_T = 0,95·c_max/(1 + 0,6·x_T) (6.3.3), cabos a 20 °C (Icc máximo) e contribuição dos motores em operação (≈ Ip). Icu dos disjuntores ≥ Icc presumido no ponto (NBR 5410, 5.3.5.5.1); Icw e Ipk dos conjuntos ≥ os do barramento (NBR IEC 61439-1). Queda na partida e Icc mínimo com a impedância real do transformador.',
    `Correção do fator de potência: Qc = P · (tg φ1 − tg φ2), com FP alvo ${num(c.fpAlvo, 2)} (FP de referência da REN ANEEL 1000/2021). Banco automático em estágios iguais com controlador; cabo e proteção do banco para 1,43 × Ic (IEC 60831-1).`,
  ] });
  s.push({ titulo: '3. Motores — dados e corrente nominal', tabela: {
    colunas: ['TAG', 'Descrição', 'Quadro', 'P (kW / cv)', 'V', 'η', 'FP', 'In (A)', 'Ip/In', 'FS', 'Regime', 'Oper.'],
    linhas: calc.unidades.map(u => [u.tag, u.descricao, u.quadro, `${num(u.pKw, 2)} / ${num(u.cv, 1)}`, num(u.tensao, 0), num(u.eta, 3), num(u.fp, 2), `${num(u.in, 1)}${u.inPlaca ? ' (placa)' : ''}`, num(u.ipIn, 1), num(u.fs, 2), u.regime, u.emOperacao ? 'sim' : 'reserva']),
    proporcoes: [0.6, 1.6, 0.7, 0.9, 0.45, 0.45, 0.45, 0.75, 0.45, 0.4, 0.5, 0.55], tamanho: 14 } });
  s.push({ titulo: '4. Partidas e dispositivos (NBR IEC 60947-4-1 / 60947-4-2)', tabela: {
    colunas: ['TAG', 'Partida', 'Ip linha (A)', 'Conjugado partida', 'Proteção', 'Contatores (AC-3)', 'Sobrecarga'],
    linhas: calc.unidades.map(u => [u.tag, ROTULO_PARTIDA[u.partida], num(u.partidaInfo.ipLinha, 0), u.partidaInfo.conjugado == null ? 'controlado' : `${num(u.partidaInfo.conjugado, 0)} %`, protTxt(u), contTxt(u), `${num(u.partidaInfo.sobrecarga.ajuste_a, 1)} A — ${u.partidaInfo.sobrecarga.local}`]),
    proporcoes: [0.6, 1.1, 0.7, 0.8, 1.4, 1.6, 2], tamanho: 14 },
    marcadores: [...new Set(calc.unidades.flatMap(u => u.partidaInfo.observacoes.map(o => `${u.tagBase}: ${o}`)))] });
  s.push({ titulo: '5. Circuitos dos motores (regime e partida)', tabela: {
    colunas: ['TAG', 'Ib (A)', 'L (m)', 'Cabo', 'Iz (A)', 'ΔV regime %', 'ΔV partida disp. %', 'ΔV partida motor %', 'Icc motor', 'Critério'],
    linhas: calc.unidades.map(u => [u.tag, u.circuito.condutores === 6 ? `${num(u.circuito.ibLinha, 1)} (${num(u.circuito.ibCond, 1)} por condutor)` : num(u.circuito.ibLinha, 1), num(u.circuito.comprimento, 0), caboTxt(u.circuito), num(u.circuito.iz, 1), num(u.circuito.queda), num(u.quedaPartida.dispositivo, 1), num(u.quedaPartida.motor, 1), ka(u.curto.iccMax), u.circuito.criterio]),
    proporcoes: [0.6, 0.55, 0.45, 1.6, 0.55, 0.65, 0.7, 0.7, 0.65, 1.3], tamanho: 14 },
    notas: [`ΔV em regime a ρ = ${String(T.RHO_COBRE).replace('.', ',')} Ω·mm²/m; ΔV na partida com FP de partida ${num(X.FP_PARTIDA_PADRAO)} (inversor ${num(X.FP_PARTIDA_INVERSOR)}) e X = ${num(X.X_CABO * 1000)} mΩ/m. [CONFERIR]`] });
  if (calc.outras.length) {
    s.push({ titulo: '6. Outras cargas', tabela: {
      colunas: ['Id', 'Descrição', 'Quadro', 'kW', 'FD', 'FP', 'Lig.', 'Cabo', 'Disjuntor', 'ΔV %'],
      linhas: calc.outras.map(o => [o.id, o.descricao, o.quadro, num(o.kw, 1), num(o.fd), num(o.fp), o.ligacao, `${o.ligacao === 'FFF' ? '3 × ' : ''}${sec(o.circuito.secao)}${o.circuito.secaoNeutro ? ` + N ${sec(o.circuito.secaoNeutro)}` : ''} + PE ${sec(o.circuito.secaoPE)}`, `${o.circuito.polos}P ${o.circuito.disjuntor} A`, num(o.circuito.queda)]),
      proporcoes: [0.5, 1.8, 0.7, 0.5, 0.45, 0.45, 0.45, 1.6, 0.8, 0.5], tamanho: 14 } });
  }
  s.push({ titulo: '7. Quadros, CCMs e alimentadores (NBR 5410, 6.5.1 / NBR IEC 61439)', tabela: {
    colunas: ['Quadro', 'Maior motor', 'Ib = 1,25·In + ΣIn + outras (A)', 'Cabo', 'L (m)', 'Disjuntor', 'ΔV %', 'Barramento', 'Icw ≥'],
    linhas: calc.quadros.filter(q => q.alim).map(q => [q.id, q.projeto.maior ? `${q.projeto.maior} (${num(q.projeto.inMaior, 1)} A)` : '—', `1,25 × ${num(q.projeto.inMaior, 1)} + ${num(q.projeto.somaDemais, 1)} + ${num(q.projeto.iOutras, 1)} = ${num(q.projeto.ib, 1)}`, caboAlim(q.alim), num(q.alim.comprimento, 0), `${q.alim.disjuntor} A`, num(q.alim.queda), `${q.conjunto.barramento} A`, `${q.conjunto.icw} kA`]),
    proporcoes: [0.65, 0.9, 1.7, 1.6, 0.4, 0.65, 0.45, 0.7, 0.5], tamanho: 14 },
    paragrafos: [`QGBT: disjuntor geral ${e.disjuntorGeral} A, barramento ${calc.qgbt.conjunto.barramento} A, Icw ≥ ${calc.qgbt.conjunto.icw} kA/1 s. Cabo ${c.entrada === 'trafo' ? 'transformador' : 'entrada'} → QGBT: ${caboAlim(e.cabo)}, ${num(e.cabo.comprimento, 0)} m, Iz = ${num(e.cabo.izTotal, 0)} A${e.cabo.informado ? ' (informado)' : ''}, queda ${num(e.cabo.quedaDemanda)} % na demanda.`],
    notas: ['Conjuntos com verificação de projeto pelo fabricante (NBR IEC 61439-1, seção 10): elevação de temperatura, suportabilidade a curto-circuito, distâncias e grau de proteção. Forma de separação e IP conforme a tabela de quadros. [CONFERIR]'] });
  s.push({ titulo: '8. Demanda e transformador', paragrafos: [
    `Demanda dos motores = Σ (P/η × Fu) dos motores em operação: ${num(calc.demanda.kwMot, 1)} kW / ${num(calc.demanda.kvarMot, 1)} kvar; outras cargas ${num(calc.demanda.kwOut, 1)} kW / ${num(calc.demanda.kvarOut, 1)} kvar; fator de simultaneidade geral ${num(calc.demanda.fatorSimultaneidade)}. Demanda total ${num(calc.demanda.kw, 1)} kW, ${num(calc.demanda.kva, 1)} kVA, FP ${num(calc.demanda.fp, 3)}, ${num(calc.demanda.corrente, 0)} A. [CONFERIR fatores de utilização e simultaneidade]`,
    tr ? `Transformador ${num(tr.kva, 1)} kVA (In secundário ${num(tr.inSec, 0)} A): carregamento ${num(tr.carregamentoAntes * 100, 0)} % antes e ${num(tr.carregamentoDepois * 100, 0)} % depois da correção do FP — ${tr.atende ? 'atende' : `NÃO atende (sugerido ${tr.sugerido || 'maior'} kVA)`} ao limite de ${num(c.carregamentoMax, 0)} %.` : 'Entrada em baixa tensão: confirmar a categoria de atendimento e a carga liberada com a distribuidora. [CONFERIR]',
  ], tabela: { colunas: ['TAG', 'P/η (kW)', 'Fu', 'kW', 'kvar'], linhas: calc.demanda.motores.map(m => [m.tag, num(m.pAbs, 2), m.emOperacao ? num(m.fu) : 'reserva', num(m.kw, 2), num(m.kvar, 2)]), proporcoes: [1, 1, 0.7, 1, 1] } });
  s.push({ titulo: '9. Correção do fator de potência (REN ANEEL 1000/2021)', paragrafos: b.necessario ? [
    `P = ${num(b.pKw, 1)} kW${b.pMedida ? ' (medida)' : ' (demanda calculada)'}; FP atual ${num(b.fp1, 3)}${b.fp1Medido ? ' (medido)' : ' (calculado)'}; FP alvo ${num(b.fp2, 2)}. Qc = ${num(b.pKw, 1)} × (tg φ1 − tg φ2) = ${num(b.pKw, 1)} × (${num(Math.tan(Math.acos(b.fp1)), 4)} − ${num(Math.tan(Math.acos(b.fp2)), 4)}) = ${num(b.qNecessario, 1)} kvar.`,
    b.tipo === 'automatico'
      ? `Banco automático de ${num(b.total, 1)} kvar efetivos em ${c.vff} V: ${b.n} estágios de ${num(b.estagio, 1)} kvar, controlador de FP de ${b.controlador} estágios, contatores para capacitor (AC-6b) e fusíveis NH ${b.fusivelEstagio} A por estágio (≈ 1,65 × ${num(b.icEstagio, 1)} A). Capacitores de ${b.tensaoCapacitor} V: cada estágio tem ${num(b.kvarNominalEstagio, 1)} kvar nominais em ${b.tensaoCapacitor} V para entregar ${num(b.estagio, 1)} kvar em ${c.vff} V (Q ∝ V²). [CONFERIR]`
      : `Banco fixo de ${num(b.total, 1)} kvar efetivos em ${c.vff} V com fusíveis NH ${b.fusivelEstagio} A e resistores de descarga.`,
    `FP após a correção: ${num(b.fpDepois, 3)}${b.capacitivo ? ' (capacitivo — revisar)' : ''}; potência aparente ${num(b.kvaAntes, 1)} → ${num(b.kvaDepois, 1)} kVA. Corrente do banco Ic = ${num(b.ic, 1)} A; cabo e disjuntor para 1,43 × Ic = ${num(b.ibCabo, 1)} A: ${caboAlim(b.cabo)}, disjuntor ${b.cabo.disjuntor} A.`,
    b.dessintonizado ? `Inversores representam ${num(b.harmonicos * 100, 0)} % da demanda: banco com reatores de dessintonia p = 7 % (sintonia ≈ ${num(b.frequenciaSintonia, 0)} Hz) e capacitores de tensão reforçada; medir harmônicos antes da compra. [CONFERIR]` : 'Cargas não lineares pouco relevantes no cálculo; confirmar com medição de harmônicos. [CONFERIR]',
  ] : [`FP ${num(b.fp1, 3)} já atende ao FP de referência ${num(b.fp2, 2)} — correção não necessária pela demanda calculada. [CONFERIR com a fatura]`] });
  s.push({ titulo: '10. Curto-circuito e capacidade de interrupção (IEC 60909 / NBR 5410, 5.3.5)', paragrafos: [
    tr ? `Icc nos terminais do transformador (rede ${c.sccRedeMva ? `${num(c.sccRedeMva, 0)} MVA` : 'infinita'}): Icc = c_max · V / (√3 · K_T · Z_T) ≈ ${ka(tr.iccTerminais)}.` : `Icc no ponto de entrega ${num(c.iccEntradaKa || 10, 1)} kA. [CONFERIR com a distribuidora]`,
    `Fator de tensão c_max = ${num(c.fatorC)} (IEC 60909-0, Tabela 1: BT com tolerância de +6 %)${tr ? `; correção do transformador K_T = ${num(calc.kT, 4)}` : ''}; contribuição dos motores ${c.contribuicaoMotores ? 'incluída' : 'não incluída'}. Ipk = κ·√2·Icc (κ = 1,02 + 0,98·e^(−3R/X)). DPS do QGBT: ${calc.dps.texto}.`,
  ], tabela: { colunas: ['Ponto', 'Icc fonte', 'Contrib. motores', 'Icc total', 'Ipk', 'Icu mínimo dos disjuntores'],
    linhas: [calc.qgbt, ...calc.quadros.filter(q => q.alim)].map(q => [q.id, ka(q.curto.iccFonte), ka(q.curto.contribuicao), ka(q.curto.icc), ka(q.curto.ip), `${q.curto.icuMin} kA`]),
    proporcoes: [0.9, 0.9, 0.9, 0.9, 0.9, 1.3] } });
  s.push({ titulo: '11. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 1), m.referencia]), proporcoes: [0.6, 4, 0.4, 0.55, 1.8], tamanho: 14 },
    notas: [`Cabos com 10 % de folga, em metros de condutor. Eletrocalhas estimadas (${(calc.eletrocalha || []).map(x => `${x.trecho}: ${x.largura} mm, ${num(x.metros, 0)} m`).join('; ')}) — confirmar traçado no projeto executivo.`] });
  s.push({ titulo: 'Premissas [CONFERIR]', marcadores: calc.premissas });
  if (calc.avisos.length) s.push({ titulo: 'Avisos', marcadores: calc.avisos });
  return s;
}

function cfgLaudo(res) {
  const { calc, med } = res;
  const c = calc.config;
  return {
    titulo: 'LAUDO TÉCNICO DE INSPEÇÃO — INSTALAÇÕES ELÉTRICAS INDUSTRIAIS',
    tipoInspecao: `Motores, CCMs, proteções e banco de capacitores — NBR 5410 (Seção 7 e 6.5.1), NBR IEC 61439, NR-10 e NR-12 — ${({ inicial: 'verificação inicial', periodica: 'inspeção periódica', reforma: 'após reforma/ampliação' })[res.insp.tipo] || 'inspeção periódica'}`,
    tituloCurto: 'Laudo de inspeção — elétrica industrial',
    sigla: 'LAUDO-IND',
    objetivo: 'Este laudo registra a inspeção visual, os ensaios e as verificações das instalações elétricas industriais de baixa tensão (QGBT, CCMs, partidas de motores, proteções, aterramento das carcaças, banco de capacitores e dispositivos de segurança de máquinas), com as não conformidades, recomendações e prazos.',
    listaNormas: NORMAS,
    secoesChecklist: SECOES_CHECKLIST,
    descricao: [
      ['Alimentação', `${c.vff}/${c.vfn} V, ${c.frequencia} Hz, ${c.esquema}${calc.trafo ? ` — transformador ${num(calc.trafo.kva, 1)} kVA, Z ${num(calc.trafo.z)} %` : ''}`],
      ['Quadros', `QGBT${calc.quadros.length ? ` + ${calc.quadros.map(q => q.id).join(', ')}` : ''}`],
      ['Motores', `${calc.unidades.length} motores — ${num(calc.unidades.reduce((s, u) => s + u.cv, 0), 0)} cv instalados`],
      ['Demanda calculada', `${num(calc.demanda.kw, 1)} kW / ${num(calc.demanda.kva, 1)} kVA (FP ${num(calc.demanda.fp, 3)})`],
      ['Icc no QGBT (calculado)', `${ka(calc.qgbt.curto.icc)} — Icu mínimo ${calc.qgbt.curto.icuMin} kA`],
    ],
    metodologia: [
      'Inspeção visual (NBR 5410, 7.2) dos conjuntos, partidas e motores, com APR, desenergização, bloqueio e sinalização (NR-10, 10.5).',
      'Conferência dos dados de placa dos motores e dos ajustes de proteção contra sobrecarga (In de placa × FS).',
      'Resistência de isolamento dos motores e circuitos com megôhmetro (NBR 5410, 7.3.3; IEEE 43), com o motor desconectado de inversores/soft-starters.',
      'Continuidade do condutor de proteção das carcaças até o barramento PE (7.3.2).',
      'Termografia dos conjuntos sob carga (ABNT NBR 15572) e teste funcional das paradas de emergência e intertravamentos (NR-12).',
    ],
    medicoes: [
      { titulo: '6.1 Resistência de isolamento dos motores', colunas: ['Motor', 'Tensão de ensaio (V)', 'Medido (MΩ)', 'Critério', 'Resultado'], proporcoes: [1, 1, 0.9, 2.6, 0.8],
        linhas: med.isolamento.map(m => [m.motor, num(m.tensao_ensaio_v, 0), m.valor_mohm ?? '', m.criterio, m.resultado]),
        nota: `Critério mínimo de ${ISOLAMENTO_MIN_MOTOR} MΩ (IEEE 43-2013 para enrolamentos < 1 kV) e índice de polarização quando aplicável. [CONFERIR]` },
      { titulo: '6.2 Continuidade do PE das carcaças (7.3.2)', colunas: ['Ponto', 'Medido (Ω)', 'Critério', 'Resultado'], proporcoes: [2, 0.9, 2.6, 0.8],
        linhas: med.continuidade.map(m => [m.ponto, m.valor_ohm ?? '', m.criterio, m.resultado]) },
      { titulo: '6.3 Ajuste da proteção contra sobrecarga', colunas: ['Motor', 'Ajuste (A)', 'Corrente medida (A)', 'Critério', 'Resultado'], proporcoes: [1, 0.8, 0.9, 2.6, 0.8],
        linhas: med.reles.map(m => [m.motor, m.ajuste_a ?? '', m.corrente_medida_a ?? '', m.criterio, m.resultado]) },
      { titulo: '6.4 Termografia', colunas: ['Ponto', 'T (°C)', 'Referência (°C)', 'ΔT (°C)', 'Resultado'], proporcoes: [2.2, 0.7, 0.9, 0.7, 0.8],
        linhas: med.termografia.map(m => [m.ponto, m.temperatura_c ?? '', m.referencia_c ?? '', m.delta == null ? '' : num(m.delta, 1), m.resultado]),
        nota: `ΔT > ${TERMO_DELTA_MAX} °C entre componentes similares tratado como não conforme. [CONFERIR critério do termografista / NBR 15572]` },
    ],
    conclusoes: ['As instalações devem ser mantidas com inspeções periódicas registradas no prontuário (NR-10, 10.2.4 e 10.4.4) e as máquinas com os dispositivos de segurança da NR-12 testados.'],
    proximaInspecao: [
      ['Inspeção periódica recomendada', 'Anual, ou conforme o plano de manutenção (NBR 5410, 8.1) [CONFERIR]'],
      ['Termografia', 'Semestral ou anual, sob carga'],
      ['Paradas de emergência', 'Teste funcional conforme o plano de manutenção das máquinas (NR-12)'],
    ],
  };
}

function cfgChecklist(res) {
  const { calc } = res;
  return {
    titulo: 'CHECKLIST DE CAMPO — ELÉTRICA INDUSTRIAL', subtitulo: 'Motores, CCMs, proteções e banco de capacitores — NBR 5410, NBR IEC 61439, NR-10, NR-12', tituloCurto: 'Checklist de campo — elétrica industrial',
    secoesChecklist: SECOES_CHECKLIST,
    preparacao: [
      'APR e permissão de trabalho; desenergização, bloqueio e sinalização (NR-10, 10.5) antes de abrir CCMs e caixas de ligação.',
      'Levar: megôhmetro (500/1000 V CC), alicate amperímetro true RMS, analisador de energia (FP e harmônicos), termovisor, multímetro CAT III/IV, câmera.',
      'Banco de capacitores: aguardar o tempo de descarga e conferir tensão zero antes de tocar.',
    ],
    referencias: [
      ['Icc no QGBT / Icu mínimo', `${ka(calc.qgbt.curto.icc)} / ${calc.qgbt.curto.icuMin} kA`],
      ['Disjuntor geral', `${calc.entrada.disjuntorGeral} A`],
      ['Banco de capacitores', calc.banco.necessario ? `${num(calc.banco.total, 1)} kvar (${calc.banco.n} × ${num(calc.banco.estagio, 1)})` : 'não previsto'],
      ...calc.quadros.filter(q => q.alim).map(q => [`Alimentador ${q.id}`, `${caboAlim(q.alim)} / ${q.alim.disjuntor} A`]),
    ],
    medicoes: [
      { titulo: 'Motores — placa, ajuste e corrente', colunas: ['TAG', 'In calc. (A)', 'Ajuste previsto (A)', 'Ajuste encontrado (A)', 'Corrente medida (A)', 'Isolamento (MΩ)'], proporcoes: [1, 0.8, 0.9, 0.9, 0.9, 0.9],
        linhas: calc.unidades.map(u => [`${u.tag} — ${u.descricao}`.slice(0, 50), num(u.in, 1), num(u.partidaInfo.sobrecarga.ajuste_a, 1), '', '', '']) },
      { titulo: 'Termografia', colunas: ['Ponto', 'T (°C)', 'Referência (°C)', 'Obs.'], proporcoes: [2.5, 0.8, 0.9, 1.6], linhas: [] },
    ],
  };
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo e de cálculo', formato: 'Word', nome: 'Memorial_Eletrica_Industrial',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO E DE CÁLCULO — ELÉTRICA INDUSTRIAL', subtitulo: 'Motores, partidas, CCM, correção do fator de potência e curto-circuito — ABNT NBR 5410', tituloCurto: 'Memorial — elétrica industrial', sigla: 'MEM-IND', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de motores, partidas, banco e curto-circuito', formato: 'Excel', nome: 'Eletrica_Industrial',
    gerar: (res) => {
      const { calc } = res;
      return D.gerarPlanilha([
        { nome: 'Motores', colunas: [
          { header: 'TAG', key: 'tag', width: 10 }, { header: 'Descrição', key: 'descricao', width: 30 }, { header: 'Quadro', key: 'quadro', width: 10 },
          { header: 'P (kW)', key: 'pKw', width: 9, numFmt: '0.00' }, { header: 'P (cv)', key: 'cv', width: 8, numFmt: '0.0' }, { header: 'Tensão (V)', key: 'tensao', width: 9 },
          { header: 'η', key: 'eta', width: 7, numFmt: '0.000' }, { header: 'FP', key: 'fp', width: 7, numFmt: '0.00' }, { header: 'In (A)', key: 'in', width: 9, numFmt: '0.0' },
          { header: 'Ip/In', key: 'ipIn', width: 7 }, { header: 'FS', key: 'fs', width: 6 }, { header: 'Regime', key: 'regime', width: 7 },
          { header: 'Em operação', key: 'op', width: 10 }, { header: 'Fu', key: 'fu', width: 6, numFmt: '0.00' }],
          linhas: calc.unidades.map(u => ({ ...u, op: u.emOperacao ? 'sim' : 'reserva' })) },
        { nome: 'Circuitos', colunas: [
          { header: 'TAG', key: 'tag', width: 10 }, { header: 'Ib (A)', key: 'ib', width: 9, numFmt: '0.0' }, { header: 'Condutores', key: 'cond', width: 10 },
          { header: 'Seção (mm²)', key: 'secao', width: 10 }, { header: 'PE (mm²)', key: 'pe', width: 9 }, { header: 'Método', key: 'metodo', width: 8 },
          { header: 'Comprimento (m)', key: 'L', width: 12 }, { header: 'Iz corrigida (A)', key: 'iz', width: 12, numFmt: '0.0' },
          { header: 'ΔV regime (%)', key: 'dv', width: 11, numFmt: '0.00' }, { header: 'ΔV partida disp. (%)', key: 'dvd', width: 14, numFmt: '0.00' },
          { header: 'ΔV partida motor (%)', key: 'dvm', width: 14, numFmt: '0.00' }, { header: 'ΔV total regime (%)', key: 'dvt', width: 14, numFmt: '0.00' },
          { header: 'Icc motor (kA)', key: 'icc', width: 11, numFmt: '0.00' }, { header: 'Critério', key: 'criterio', width: 28 }],
          linhas: [
            ...calc.unidades.map(u => ({ tag: u.tag, ib: u.circuito.ibLinha, cond: u.circuito.condutores, secao: u.circuito.secao, pe: u.circuito.secaoPE, metodo: u.circuito.metodo, L: u.circuito.comprimento, iz: u.circuito.iz, dv: u.circuito.queda, dvd: u.quedaPartida.dispositivo, dvm: u.quedaPartida.motor, dvt: u.quedaTotalRegime, icc: u.curto.iccMax / 1000, criterio: u.circuito.criterio })),
            ...calc.outras.map(o => ({ tag: o.id, ib: o.circuito.ib, cond: o.ligacao, secao: o.circuito.secao, pe: o.circuito.secaoPE, metodo: o.circuito.metodo, L: o.circuito.comprimento, iz: o.circuito.iz, dv: o.circuito.queda, criterio: o.circuito.criterio })),
          ] },
        { nome: 'Partidas', colunas: [
          { header: 'TAG', key: 'tag', width: 10 }, { header: 'Partida', key: 'partida', width: 22 }, { header: 'Ip linha (A)', key: 'ip', width: 11, numFmt: '0' },
          { header: 'Ref.', key: 'ref', width: 7 }, { header: 'Dispositivo', key: 'tipo', width: 16 }, { header: 'Função', key: 'funcao', width: 30 },
          { header: 'Corrente (A)', key: 'corrente', width: 11, numFmt: '0.0' }, { header: 'Nominal / faixa', key: 'nominal', width: 14 }, { header: 'Categoria', key: 'cat', width: 9 },
          { header: 'Icu mín. (kA)', key: 'icu', width: 11 }, { header: 'Especificação', key: 'esp', width: 60 }],
          linhas: calc.unidades.flatMap(u => u.partidaInfo.dispositivos.map(d => ({ tag: u.tag, partida: ROTULO_PARTIDA[u.partida], ip: u.partidaInfo.ipLinha, ref: d.ref, tipo: d.tipo, funcao: d.funcao,
            corrente: d.corrente_a ?? d.ajuste_a ?? null, nominal: d.faixa ? `${d.faixa[0]}–${d.faixa[1]}` : d.nominal_a ?? '', cat: d.categoria || '', icu: ['disjuntor_motor', 'caixa_moldada'].includes(d.tipo) ? u.curto.icuMin : '', esp: d.especificacao || '' }))) },
        { nome: 'Quadros', colunas: [
          { header: 'Quadro', key: 'id', width: 10 }, { header: 'Tipo', key: 'tipo', width: 7 }, { header: 'Ib 6.5.1 (A)', key: 'ib', width: 11, numFmt: '0.0' },
          { header: 'Paralelos', key: 'np', width: 9 }, { header: 'Seção (mm²)', key: 'secao', width: 10 }, { header: 'Neutro (mm²)', key: 'n', width: 10 }, { header: 'PE (mm²)', key: 'pe', width: 9 },
          { header: 'Comprimento (m)', key: 'L', width: 12 }, { header: 'Iz total (A)', key: 'iz', width: 11, numFmt: '0' }, { header: 'Disjuntor (A)', key: 'disj', width: 11 },
          { header: 'ΔV (%)', key: 'dv', width: 8, numFmt: '0.00' }, { header: 'Icc (kA)', key: 'icc', width: 9, numFmt: '0.00' }, { header: 'Icu mín. (kA)', key: 'icu', width: 11 },
          { header: 'Barramento (A)', key: 'barr', width: 12 }, { header: 'Icw ≥ (kA)', key: 'icw', width: 10 }],
          linhas: [
            { id: 'QGBT', tipo: 'QGBT', ib: calc.qgbt.projeto.ib, np: calc.entrada.cabo.paralelos, secao: calc.entrada.cabo.secao, n: calc.entrada.cabo.secaoNeutro, pe: calc.entrada.cabo.secaoPE, L: calc.entrada.cabo.comprimento, iz: calc.entrada.cabo.izTotal, disj: calc.entrada.disjuntorGeral, dv: calc.entrada.cabo.quedaDemanda, icc: calc.qgbt.curto.icc / 1000, icu: calc.qgbt.curto.icuMin, barr: calc.qgbt.conjunto.barramento, icw: calc.qgbt.conjunto.icw },
            ...calc.quadros.filter(q => q.alim).map(q => ({ id: q.id, tipo: q.tipo, ib: q.projeto.ib, np: q.alim.paralelos, secao: q.alim.secao, n: q.alim.secaoNeutro, pe: q.alim.secaoPE, L: q.alim.comprimento, iz: q.alim.izTotal, disj: q.alim.disjuntor, dv: q.alim.queda, icc: q.curto.icc / 1000, icu: q.curto.icuMin, barr: q.conjunto.barramento, icw: q.conjunto.icw })),
          ] },
        { nome: 'Banco de capacitores', colunas: [{ header: 'Grandeza', key: 'k', width: 44 }, { header: 'Valor', key: 'v', width: 22 }, { header: 'Unidade / observação', key: 'u', width: 40 }],
          linhas: (() => {
            const b = calc.banco;
            const l = [
              { k: 'Potência ativa de referência (P)', v: arr(b.pKw, 1), u: b.pMedida ? 'kW (medida)' : 'kW (demanda calculada)' },
              { k: 'FP atual (φ1)', v: arr(b.fp1, 3), u: b.fp1Medido ? 'medido' : 'calculado' },
              { k: 'FP alvo (φ2)', v: arr(b.fp2, 2), u: 'REN ANEEL 1000/2021' },
              { k: 'Qc = P·(tg φ1 − tg φ2)', v: arr(b.qNecessario, 1), u: 'kvar' },
            ];
            if (b.necessario) {
              l.push({ k: 'Tipo de banco', v: b.tipo, u: b.dessintonizado ? 'com reatores de dessintonia 7 %' : '' },
                { k: 'Estágios', v: `${b.n} × ${b.estagio}`, u: 'kvar efetivos na tensão da rede' },
                { k: 'Potência instalada', v: b.total, u: 'kvar' },
                { k: 'Tensão dos capacitores', v: b.tensaoCapacitor, u: `V — ${arr(b.kvarNominalEstagio, 1)} kvar nominais por estágio` },
                { k: 'FP após a correção', v: arr(b.fpDepois, 3), u: b.capacitivo ? 'capacitivo — revisar' : '' },
                { k: 'Corrente do banco (Ic)', v: arr(b.ic, 1), u: 'A' },
                { k: 'Cabo / disjuntor (1,43 × Ic)', v: `${b.cabo.paralelos} × ${b.cabo.secao} mm²`, u: `disjuntor ${b.cabo.disjuntor} A` },
                { k: 'Fusível por estágio (1,65 × Ic estágio)', v: b.fusivelEstagio, u: 'A (NH gG)' });
            }
            return l;
          })() },
        { nome: 'Curto-circuito', colunas: [{ header: 'Ponto', key: 'p', width: 26 }, { header: 'Icc fonte (kA)', key: 'f', width: 13, numFmt: '0.00' }, { header: 'Contrib. motores (kA)', key: 'm', width: 16, numFmt: '0.00' }, { header: 'Icc total (kA)', key: 't', width: 13, numFmt: '0.00' }, { header: 'Ipk (kA)', key: 'ip', width: 10, numFmt: '0.00' }, { header: 'Icu mín. (kA)', key: 'icu', width: 12 }, { header: 'Icc mín. 2φ (kA)', key: 'min', width: 14, numFmt: '0.00' }],
          linhas: [
            ...(calc.trafo ? [{ p: 'Terminais do transformador', f: calc.trafo.iccTerminais / 1000, t: calc.trafo.iccTerminais / 1000 }] : []),
            ...[calc.qgbt, ...calc.quadros.filter(q => q.alim)].map(q => ({ p: q.id, f: q.curto.iccFonte / 1000, m: q.curto.contribuicao / 1000, t: q.curto.icc / 1000, ip: q.curto.ip / 1000, icu: q.curto.icuMin, min: q.curto.iccMin2f / 1000 })),
            ...calc.unidades.map(u => ({ p: `Motor ${u.tag} (terminais)`, t: u.curto.iccMax / 1000, min: u.curto.iccMin2f / 1000 })),
          ] },
        D.abaMateriais(calc.materiais),
      ]);
    } },
  { tipo: 'laudo', rotulo: 'Laudo de inspeção (elétrica industrial)', formato: 'Word', nome: 'Laudo_Eletrica_Industrial',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, cfgLaudo(res), { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Industrial',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, cfgChecklist(res), res.checklist)) },
];
function arr(v, c = 2) { return v == null ? null : Math.round(v * 10 ** c) / 10 ** c; }

// ── Orçamento ───────────────────────────────────────────────────────────────

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const obra = dados.obra?.nome || dados.cliente?.nome || 'a instalação';
  const S = 'Serviços (Mão de Obra)';
  const SUB = 'Elétrica industrial';
  const srv = (codigo, descricao, quantidade, unidade, subgrupo = SUB) => ({ secao: S, subgrupo, codigo, descricao, quantidade, unidade });
  if (modo === 'execucao') {
    const faixa = (min, max) => calc.unidades.filter(u => u.cv > min + 1e-9 && u.cv <= max + 1e-9).length;
    const nAte10 = faixa(0, 10);
    const n10a50 = faixa(10, 50);
    const nAcima50 = faixa(50, Infinity);
    const nSemicondutor = calc.unidades.filter(u => u.partida === 'soft_starter' || u.partida === 'inversor').length;
    const nQuadros = calc.quadros.filter(q => q.alim).length + 1;
    const metrosEletrocalha = (calc.eletrocalha || []).reduce((s, x) => s + x.metros, 0);
    const metrosCircuito = calc.unidades.reduce((s, u) => s + u.circuito.comprimento, 0) + calc.outras.reduce((s, o) => s + o.circuito.comprimento, 0)
      + calc.quadros.filter(q => q.alim).reduce((s, q) => s + q.alim.comprimento * q.alim.paralelos, 0)
      + (calc.config.fornecerCaboEntrada ? calc.entrada.cabo.comprimento * calc.entrada.cabo.paralelos : 0);
    const partidas = [...new Set(calc.unidades.map(u => ROTULO_PARTIDA[u.partida].toLowerCase()))].join(', ');
    return {
      cliente_nome: dados.cliente?.nome || '',
      escopo: `Execução das instalações elétricas industriais de ${obra}: QGBT com disjuntor geral de ${calc.entrada.disjuntorGeral} A${calc.quadros.length ? `, ${calc.quadros.filter(q => q.alim).map(q => q.id).join(', ')}` : ''}, ligação de ${calc.unidades.length} motores (${num(calc.unidades.reduce((s, u) => s + u.cv, 0), 0)} cv) com partidas ${partidas}, alimentadores e circuitos dimensionados pela ABNT NBR 5410 (6.5.1)${calc.banco.necessario ? `, banco de capacitores de ${num(calc.banco.total, 1)} kvar para FP ≥ ${num(calc.config.fpAlvo, 2)}` : ''}, eletrocalhas, comissionamento e projeto com ART.`,
      observacoes: 'Rascunho gerado pela skill de elétrica industrial — conferir quantidades, modelos (tabelas de coordenação do fabricante) e preços antes de enviar ao cliente.',
      itens: [
        ...calc.materiais.filter(m => m.quantidade > 0).map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: SUB, descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
        ...(nAte10 ? [srv('ind_motor_ate10cv', 'Ligação de motor até 10 cv (conexão, sentido de rotação e teste)', nAte10, 'un')] : []),
        ...(n10a50 ? [srv('ind_motor_10a50cv', 'Ligação de motor acima de 10 cv até 50 cv (conexão, sentido de rotação e teste)', n10a50, 'un')] : []),
        ...(nAcima50 ? [srv('ind_motor_acima50cv', 'Ligação de motor acima de 50 cv (conexão, sentido de rotação e teste)', nAcima50, 'un')] : []),
        srv('ind_partida_montagem', 'Montagem e fiação de partida no CCM (direta, Y-Δ, soft-starter ou inversor), por partida', calc.unidades.length, 'un'),
        ...(nSemicondutor ? [srv('ind_parametrizacao', 'Parametrização de soft-starter/inversor e ensaio de partida', nSemicondutor, 'un')] : []),
        srv('ind_ccm_montagem', 'Montagem e instalação de QGBT/CCM/quadro (fixação, barramentos, interligações e identificação)', nQuadros, 'un'),
        ...(calc.banco.necessario ? [srv('ind_banco_capacitores', 'Instalação e ajuste do banco de capacitores com controlador de FP', 1, 'un')] : []),
        srv('ind_eletrocalha', 'Instalação de eletrocalha/leito com suportes e acessórios', Math.ceil(metrosEletrocalha), 'm'),
        srv('ind_lancamento_cabos', 'Lançamento e conexão de cabos de força em eletrocalha/eletroduto (por metro de circuito)', Math.ceil(metrosCircuito), 'm'),
        srv('ind_comissionamento', 'Comissionamento: isolamento, continuidade do PE, ajuste de proteções, sentido de rotação e partida assistida', 1, 'vb'),
        srv('ind_projeto', 'Projeto elétrico industrial com memorial de cálculo, diagramas unifilares e ART', 1, 'vb'),
      ],
    };
  }
  const nQuadros = calc.quadros.filter(q => q.alim).length + 1;
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: `Inspeção das instalações elétricas industriais de ${obra} (QGBT, ${nQuadros - 1} quadro(s)/CCM(s), ${calc.unidades.length} motores e banco de capacitores) conforme NBR 5410 (Seção 7), NBR IEC 61439, NR-10 e NR-12, com termografia, ensaios de isolamento dos motores, conferência dos ajustes de proteção e emissão de laudo técnico com ART.${res.ncs.length ? ` Inclui a correção das ${res.ncs.length} não conformidades apontadas (itens a cotar).` : ''}`,
    observacoes: 'Rascunho gerado pela skill de elétrica industrial — conferir antes de enviar ao cliente.',
    itens: [
      srv('ind_inspecao', 'Inspeção visual das instalações industriais (QGBT, CCMs, partidas, motores) — NBR 5410 / NR-10 / NR-12', 1, 'vb', 'Laudo elétrico industrial'),
      srv('ind_termografia', 'Termografia de QGBT/CCM/quadro sob carga, por conjunto', nQuadros + (calc.banco.necessario || dados.instalacao?.banco_existente ? 1 : 0), 'un', 'Laudo elétrico industrial'),
      srv('ind_ensaio_motor', 'Ensaio de isolamento e conferência da proteção de sobrecarga, por motor', calc.unidades.length, 'un', 'Laudo elétrico industrial'),
      srv('ind_laudo', 'Laudo técnico das instalações elétricas industriais com ART', 1, 'vb', 'Laudo elétrico industrial'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
    ],
  };
}

// ── Formulário da tela ─────────────────────────────────────────────────────

const OP = {
  tensoes: F.op([['220', '220 V (F-F)'], ['380', '380 V (F-F)'], ['440', '440 V (F-F)']]),
  tensoesFN: F.op([['127', '127 V'], ['220', '220 V'], ['254', '254 V']]),
  esquema: F.op([['TN-S', 'TN-S'], ['TN-C-S', 'TN-C-S'], ['TT', 'TT'], ['IT', 'IT']]),
  entrega: F.op([['trafo', 'Transformador próprio (queda total ≤ 7 %)'], ['bt', 'Baixa tensão da distribuidora (≤ 5 %)']]),
  isolacao: F.op([['EPR', 'EPR/XLPE 90 °C (0,6/1 kV)'], ['PVC', 'PVC 70 °C']]),
  metodo: F.op(Object.entries(T.METODOS)),
  unidade: F.op([['cv', 'cv'], ['kW', 'kW']]),
  partida: F.op(Object.entries(ROTULO_PARTIDA)),
  regime: F.op(Object.entries(X.REGIMES)),
  protecao: F.op([['auto', 'Automática'], ['disjuntor_motor', 'Disjuntor-motor'], ['fusivel', 'Fusíveis + relé'], ['caixa_moldada', 'Disjuntor caixa moldada + relé']]),
  tipoQuadro: F.op([['CCM', 'CCM'], ['QD', 'Quadro de distribuição']]),
  forma: F.op(Object.entries(X.FORMAS)),
  tipoCarga: F.op(Object.entries(X.DEMANDA_OUTRAS).map(([k, v]) => [k, v.rotulo])),
  ligacao: F.op([['FFF', '3F'], ['FN', 'F-N']]),
  banco: F.op([['auto', 'Automático (fixo se ≤ 15 kvar)'], ['automatico', 'Automático com estágios'], ['fixo', 'Fixo']]),
  tipoInsp: F.op([['periodica', 'Inspeção periódica'], ['inicial', 'Verificação inicial (obra nova)'], ['reforma', 'Após reforma/ampliação']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Alimentação, transformador e critérios', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'instalacao.tensao_ff', rotulo: 'Tensão F-F', tipo: 'selecao', opcoes: OP.tensoes },
      { caminho: 'instalacao.tensao_fn', rotulo: 'Tensão F-N', tipo: 'selecao', opcoes: OP.tensoesFN },
      { caminho: 'instalacao.esquema', rotulo: 'Esquema de aterramento', tipo: 'selecao', opcoes: OP.esquema },
      { caminho: 'instalacao.ponto_entrega', rotulo: 'Ponto de entrega', tipo: 'selecao', opcoes: OP.entrega },
      { caminho: 'instalacao.trafo_kva', rotulo: 'Transformador (kVA)', tipo: 'numero' },
      { caminho: 'instalacao.trafo_z_pct', rotulo: 'Impedância Z (%)', tipo: 'numero', dica: 'Placa do transformador (típico 4,5 a 6 %)' },
      { caminho: 'instalacao.trafo_perdas_cobre_w', rotulo: 'Perdas no cobre (W)', tipo: 'numero', dica: 'Do ensaio/placa; vazio = R 1 %' },
      { caminho: 'instalacao.scc_rede_mva', rotulo: 'Scc da rede MT (MVA)', tipo: 'numero', dica: 'Informado pela distribuidora; vazio = rede infinita' },
      { caminho: 'instalacao.icc_entrada_ka', rotulo: 'Icc no ponto de entrega BT (kA)', tipo: 'numero', dica: 'Só para entrada em baixa tensão' },
      { caminho: 'instalacao.cabo_entrada_secao_mm2', rotulo: 'Cabo trafo → QGBT: seção (mm²)', tipo: 'numero', dica: 'Vazio = dimensionar' },
      { caminho: 'instalacao.cabo_entrada_paralelos', rotulo: 'Cabos por fase', tipo: 'numero' },
      { caminho: 'instalacao.cabo_entrada_comprimento_m', rotulo: 'Comprimento trafo → QGBT (m)', tipo: 'numero' },
      { caminho: 'instalacao.isolacao', rotulo: 'Isolação dos cabos', tipo: 'selecao', opcoes: OP.isolacao },
      { caminho: 'instalacao.metodo', rotulo: 'Método — circuitos de motores', tipo: 'selecao', opcoes: OP.metodo },
      { caminho: 'instalacao.metodo_alimentador', rotulo: 'Método — alimentadores', tipo: 'selecao', opcoes: OP.metodo },
      { caminho: 'instalacao.temperatura', rotulo: 'Temperatura ambiente (°C)', tipo: 'numero' },
      { caminho: 'instalacao.agrupamento', rotulo: 'Circuitos agrupados (motores)', tipo: 'numero' },
      { caminho: 'instalacao.queda_max_terminal_pct', rotulo: 'Queda máx. circuito terminal (%)', tipo: 'numero', dica: 'NBR 5410 6.2.7: 4 %' },
      { caminho: 'instalacao.queda_max_alimentador_pct', rotulo: 'Queda máx. alimentador (%)', tipo: 'numero' },
      { caminho: 'instalacao.queda_max_partida_pct', rotulo: 'Queda máx. na partida (%)', tipo: 'numero', dica: 'NBR 5410 6.5.1: 10 % nos terminais do dispositivo de partida' },
      { caminho: 'instalacao.fornecer_cabo_entrada', rotulo: 'Incluir cabo de entrada nos materiais', tipo: 'check' },
      { caminho: 'instalacao.contribuicao_motores', rotulo: 'Somar contribuição dos motores ao Icc', tipo: 'check' },
    ] },
  ] },
  { titulo: '3. Quadros / CCMs', aberta: true, itens: [
    { tipo: 'nota', texto: 'O QGBT já existe; cadastre aqui os CCMs e quadros alimentados por ele. Use o mesmo "Id" na coluna "Quadro" dos motores e cargas (ou "QGBT" para ligar direto no QGBT).' },
    { tipo: 'tabela', caminho: 'quadros', rotuloAdicionar: 'Adicionar quadro/CCM',
      novaLinha: { id: 'CCM-0{n}', descricao: '', tipo: 'CCM', distancia_qgbt_m: null, forma: '3b', ip: 'IP54', eletrocalha_m: null },
      colunas: [
        { campo: 'id', rotulo: 'Id', largura: 90 }, { campo: 'descricao', rotulo: 'Descrição' },
        { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.tipoQuadro, largura: 150 },
        { campo: 'distancia_qgbt_m', rotulo: 'Distância do QGBT (m)', tipo: 'numero', largura: 110 },
        { campo: 'forma', rotulo: 'Forma (61439-2)', tipo: 'selecao', opcoes: OP.forma, largura: 110 }, { campo: 'ip', rotulo: 'IP', largura: 70 },
        { campo: 'eletrocalha_m', rotulo: 'Eletrocalha dos ramais (m)', tipo: 'numero', largura: 120 },
      ] },
  ] },
  { titulo: '4. Motores', aberta: true, itens: [
    { tipo: 'nota', texto: 'Um tipo de motor por linha (dados de placa — NBR 17094-1). "Qtd." cria um circuito para cada unidade; "Simult." é quantos funcionam ao mesmo tempo (o resto é reserva). Para Y-Δ a placa precisa ter a tensão da rede em triângulo (ex.: 380/660 V).' },
    { tipo: 'tabela', caminho: 'motores', rotuloAdicionar: 'Adicionar motor',
      novaLinha: { tag: 'M-0{n}', descricao: '', quadro: '', potencia: null, unidade: 'cv', tensao_placa: '', rendimento: null, fp: null, ip_in: null, fs: 1.15, partida: 'direta', regime: 'S1', distancia_m: null, quantidade: 1, simultaneos: 1, protecao: 'auto', in_placa_a: null, seccionadora_local: false },
      colunas: [
        { campo: 'tag', rotulo: 'TAG', largura: 80 }, { campo: 'descricao', rotulo: 'Descrição' }, { campo: 'quadro', rotulo: 'Quadro', largura: 90 },
        { campo: 'potencia', rotulo: 'Potência', tipo: 'numero', largura: 80 }, { campo: 'unidade', rotulo: 'Un.', tipo: 'selecao', opcoes: OP.unidade, largura: 70 },
        { campo: 'tensao_placa', rotulo: 'Tensões de placa', largura: 100 },
        { campo: 'rendimento', rotulo: 'η', tipo: 'numero', largura: 70 }, { campo: 'fp', rotulo: 'FP', tipo: 'numero', largura: 70 },
        { campo: 'ip_in', rotulo: 'Ip/In', tipo: 'numero', largura: 70 }, { campo: 'fs', rotulo: 'FS', tipo: 'numero', largura: 60 },
        { campo: 'in_placa_a', rotulo: 'In placa (A)', tipo: 'numero', largura: 90 },
        { campo: 'partida', rotulo: 'Partida', tipo: 'selecao', opcoes: OP.partida, largura: 170 },
        { campo: 'regime', rotulo: 'Regime', tipo: 'selecao', opcoes: OP.regime, largura: 130 },
        { campo: 'distancia_m', rotulo: 'Distância do quadro (m)', tipo: 'numero', largura: 100 },
        { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 60 }, { campo: 'simultaneos', rotulo: 'Simult.', tipo: 'numero', largura: 70 },
        { campo: 'protecao', rotulo: 'Proteção', tipo: 'selecao', opcoes: OP.protecao, largura: 160 },
        { campo: 'seccionadora_local', rotulo: 'Seccionadora local', tipo: 'check', largura: 90 },
      ] },
  ] },
  { titulo: '5. Outras cargas', itens: [
    { tipo: 'nota', texto: 'Iluminação, tomadas, cargas resistivas e outras, por quadro. Fator de demanda vazio = típico do tipo (iluminação 1,0; tomadas 0,3; resistiva 1,0).' },
    { tipo: 'tabela', caminho: 'outras_cargas', rotuloAdicionar: 'Adicionar carga',
      novaLinha: { id: 'C{n}', quadro: '', descricao: '', tipo: 'iluminacao', potencia_kw: null, fp: null, fd: null, ligacao: 'FFF', comprimento_m: null },
      colunas: [
        { campo: 'id', rotulo: 'Id', largura: 70 }, { campo: 'quadro', rotulo: 'Quadro', largura: 90 }, { campo: 'descricao', rotulo: 'Descrição' },
        { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.tipoCarga, largura: 200 },
        { campo: 'potencia_kw', rotulo: 'kW', tipo: 'numero', largura: 70 }, { campo: 'fp', rotulo: 'FP', tipo: 'numero', largura: 70 }, { campo: 'fd', rotulo: 'FD', tipo: 'numero', largura: 70 },
        { campo: 'ligacao', rotulo: 'Lig.', tipo: 'selecao', opcoes: OP.ligacao, largura: 80 }, { campo: 'comprimento_m', rotulo: 'Compr. (m)', tipo: 'numero', largura: 90 },
      ] },
  ] },
  { titulo: '6. Fator de potência e banco de capacitores', itens: [
    { tipo: 'nota', texto: 'Use o FP e a demanda medidos (fatura ou analisador de energia) quando houver; vazio = calculado pelos dados de placa. FP de referência da REN ANEEL 1000/2021: 0,92.' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'instalacao.fp_medido', rotulo: 'FP medido', tipo: 'numero' },
      { caminho: 'instalacao.demanda_medida_kw', rotulo: 'Demanda medida (kW)', tipo: 'numero' },
      { caminho: 'instalacao.fp_alvo', rotulo: 'FP alvo', tipo: 'numero' },
      { caminho: 'instalacao.tipo_banco', rotulo: 'Tipo de banco', tipo: 'selecao', opcoes: OP.banco },
      { caminho: 'instalacao.estagios_controlador', rotulo: 'Estágios do controlador', tipo: 'numero' },
      { caminho: 'instalacao.banco_distancia_m', rotulo: 'Distância QGBT → banco (m)', tipo: 'numero' },
      { caminho: 'instalacao.fator_simultaneidade', rotulo: 'Fator de simultaneidade geral', tipo: 'numero', dica: 'Aplicado sobre a demanda total; 1 = só a simultaneidade dos motores' },
      { caminho: 'instalacao.banco_existente', rotulo: 'Já existe banco de capacitores', tipo: 'check' },
    ] },
  ] },
  F.secaoInspecao(7, OP.tipoInsp),
  F.secaoChecklist(8, CHECKLIST.length),
  { titulo: '9. Ensaios e medições', itens: [
    { tipo: 'tabela', caminho: 'inspecao.isolamento_motores', rotuloAdicionar: 'Adicionar isolamento de motor', novaLinha: { motor: '', tensao_ensaio_v: 1000, valor_mohm: null },
      colunas: [{ campo: 'motor', rotulo: 'Motor (TAG)' }, { campo: 'tensao_ensaio_v', rotulo: 'Tensão de ensaio (V)', tipo: 'numero', largura: 130 }, { campo: 'valor_mohm', rotulo: 'Medido (MΩ)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'inspecao.continuidade_pe', rotuloAdicionar: 'Adicionar continuidade do PE', novaLinha: { ponto: '', valor_ohm: null },
      colunas: [{ campo: 'ponto', rotulo: 'Ponto (carcaça → barra PE)' }, { campo: 'valor_ohm', rotulo: 'Medido (Ω)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'inspecao.reles', rotuloAdicionar: 'Adicionar ajuste de proteção', novaLinha: { motor: '', ajuste_a: null, corrente_medida_a: null },
      colunas: [{ campo: 'motor', rotulo: 'Motor (TAG, ex.: M-02-1)' }, { campo: 'ajuste_a', rotulo: 'Ajuste encontrado (A)', tipo: 'numero', largura: 130 }, { campo: 'corrente_medida_a', rotulo: 'Corrente medida (A)', tipo: 'numero', largura: 130 }] },
    { tipo: 'tabela', caminho: 'inspecao.termografia', rotuloAdicionar: 'Adicionar ponto de termografia', novaLinha: { ponto: '', temperatura_c: null, referencia_c: null },
      colunas: [{ campo: 'ponto', rotulo: 'Ponto' }, { campo: 'temperatura_c', rotulo: 'T (°C)', tipo: 'numero', largura: 90 }, { campo: 'referencia_c', rotulo: 'Referência (°C)', tipo: 'numero', largura: 120 }] },
  ] },
  F.secaoNcs(10, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(11),
];

module.exports = criarDisciplina({
  chave: 'eletrica_industrial',
  nome: 'Elétrica industrial (motores, CCM, correção de FP)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Execução da instalação', descricao: 'Materiais do dimensionamento (cabos, partidas, CCM, banco de capacitores, eletrocalhas) e mão de obra de montagem e ligação' },
    { modo: 'inspecao', rotulo: 'Inspeção e laudo', descricao: 'Inspeção, termografia, ensaios dos motores, laudo e correção das não conformidades' },
  ],
  montarOrcamento,
});
