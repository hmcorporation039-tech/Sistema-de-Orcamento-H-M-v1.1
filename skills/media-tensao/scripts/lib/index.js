// Disciplina MÉDIA TENSÃO / SUBESTAÇÃO (NBR 14039:2021, NBR 15751, NBR 5356,
// REN ANEEL 1000/2021 e norma de fornecimento da distribuidora) — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const T = require('./tabelas');
const { calcular } = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-subestacao.json');

const NORMAS = [
  ['ABNT NBR 14039:2021', 'Instalações elétricas de média tensão de 1,0 kV a 36,2 kV'],
  ['ABNT NBR 15751:2013', 'Sistemas de aterramento de subestações — Requisitos'],
  ['ABNT NBR 7117-1:2020', 'Parâmetros do solo para projetos de aterramentos elétricos — medição da resistividade e modelagem geoelétrica'],
  ['ABNT NBR 15749', 'Medição de resistência de aterramento e de potenciais na superfície do solo'],
  ['ABNT NBR 5356 (partes 1 a 5)', 'Transformadores de potência'],
  ['ABNT NBR 7286 / NBR 7287', 'Cabos de potência com isolação extrudada de EPR / XLPE para tensões de 1 kV a 35 kV'],
  ['ABNT NBR 16050', 'Para-raios de resistor não linear de óxido metálico sem centelhadores'],
  ['ABNT NBR IEC 62271-100 / -200', 'Disjuntores de alta tensão / conjuntos de manobra e controle em invólucro metálico'],
  ['IEC 60255-151', 'Relés de medição e proteção — funções de sobrecorrente (curvas de tempo inverso)'],
  ['IEEE Std 80', 'Guide for Safety in AC Substation Grounding (método de toque e passo)'],
  ['ABNT NBR 5410:2004', 'Instalações elétricas de baixa tensão (lado secundário e QGBT)'],
  ['ABNT NBR 10576', 'Óleo mineral isolante de equipamentos elétricos — supervisão e manutenção'],
  ['NR-10', 'Segurança em instalações e serviços em eletricidade'],
  ['ANEEL REN 1000/2021', 'Regras de prestação do serviço público de distribuição de energia elétrica'],
  ['Norma de fornecimento em MT da distribuidora', `${T.DISTRIBUIDORA.norma}`],
];
const SECOES_CHECKLIST = ['Documentação', 'Subestação e obra civil', 'Transformador', 'Proteção e manobra', 'Cabos, terminações e para-raios', 'Aterramento', 'Segurança NR-10'];

const num = (v, c = 2) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));
const kv = (v) => String(v).replace('.', ',');
const sim = (b) => (b ? 'atende' : 'NÃO ATENDE');
const ROTULO_CONEXAO = { exotermica: 'solda exotérmica', compressao: 'compressão', aparafusada: 'conector aparafusado' };

// ── Inspeção: medições ──────────────────────────────────────────────────────

const vazio = (v) => v == null || v === '';
const RIGIDEZ_MIN_KV = 30; // óleo em serviço, equipamento ≤ 72,5 kV [CONFERIR NBR 10576]
const AGUA_MAX_PPM = 35; // [CONFERIR NBR 10576]

function classificarTermografia(dt) {
  if (dt <= 10) return { resultado: 'C', classe: 'normal (ΔT ≤ 10 °C)' };
  if (dt <= 20) return { resultado: 'NC', classe: 'atenção — programar (P3)', prioridade: 'P3' };
  if (dt <= 40) return { resultado: 'NC', classe: 'sério — corrigir em até 30 dias (P2)', prioridade: 'P2' };
  return { resultado: 'NC', classe: 'crítico — corrigir de imediato (P1)', prioridade: 'P1' };
}

function medicoes(insp, calc) {
  const isolamento = (insp.isolamento || []).map(m => {
    const minimo = !vazio(m.minimo_mohm) ? Number(m.minimo_mohm) : (Number(m.tensao_ensaio_v) || 0) >= 2500 ? 1000 : 100;
    return { ...m, minimo, criterio: `≥ ${num(minimo, 0)} MΩ [CONFERIR critério do fabricante]`, resultado: vazio(m.valor_mohm) ? 'NV' : Number(m.valor_mohm) >= minimo ? 'C' : 'NC' };
  });
  const oleo = (insp.oleo || []).map(m => {
    const temR = !vazio(m.rigidez_kv);
    const temA = !vazio(m.agua_ppm);
    const ok = (!temR || Number(m.rigidez_kv) >= RIGIDEZ_MIN_KV) && (!temA || Number(m.agua_ppm) <= AGUA_MAX_PPM);
    return { ...m, criterio: `rigidez ≥ ${RIGIDEZ_MIN_KV} kV; água ≤ ${AGUA_MAX_PPM} ppm`, resultado: !temR && !temA ? 'NV' : ok ? 'C' : 'NC' };
  });
  const termografia = (insp.termografia || []).map(m => {
    if (vazio(m.temperatura_c) || vazio(m.referencia_c)) return { ...m, dt: null, classe: '', resultado: 'NV' };
    const dt = Number(m.temperatura_c) - Number(m.referencia_c);
    return { ...m, dt, ...classificarTermografia(dt) };
  });
  const p = calc.prot;
  const rele = (insp.rele || []).map(m => {
    let esperado = vazio(m.tempo_esperado_s) ? null : Number(m.tempo_esperado_s);
    const f = String(m.funcao || '').toUpperCase();
    if (esperado == null && p.modo === 'disjuntor' && !vazio(m.corrente_a)) {
      const ip = /51N/.test(f) ? p.i51n : /51/.test(f) ? p.i51 : null;
      if (ip) esperado = T.tempoCurva(p.curva, p.dial, Number(m.corrente_a) / ip);
      else if (/50/.test(f)) esperado = 0.05;
    }
    const medido = vazio(m.tempo_medido_s) ? null : Number(m.tempo_medido_s);
    const tol = esperado == null ? null : Math.max(0.1 * esperado, 0.04);
    return { ...m, esperado, tolerancia: tol, resultado: medido == null || esperado == null || !Number.isFinite(esperado) ? 'NV' : Math.abs(medido - esperado) <= tol ? 'C' : 'NC' };
  });
  const rMax = calc.malha.rMax;
  const malha = (insp.malha || []).map(m => ({ ...m, limite: rMax, resultado: vazio(m.valor_ohm) ? 'NV' : Number(m.valor_ohm) <= rMax ? 'C' : 'NC' }));
  return { isolamento, oleo, termografia, rele, malha };
}

function processar(dados) {
  const calc = calcular(dados);
  const insp = dados.inspecao || {};
  const na = {};
  if (calc.trafo.isolamento === 'seco') Object.assign(na, { T1: 'Transformador a seco', T2: 'Transformador a seco', S6: 'Transformador a seco' });
  if (calc.prot.modo !== 'disjuntor') Object.assign(na, { P1: 'Proteção geral por fusível (sem relé)', P2: 'Proteção geral por fusível (sem relé)', P3: 'Proteção geral por fusível (sem disjuntor)', D3: 'Proteção geral por fusível (sem relé)' });
  if (calc.se.tipo === 'poste') Object.assign(na, { S3: 'SE aérea em poste', S4: 'SE aérea em poste', S6: 'SE aérea em poste', P5: 'SE aérea em poste' });
  if (!calc.cabo) Object.assign(na, { C1: 'Sem ramal subterrâneo de MT', C2: 'Sem ramal subterrâneo de MT' });
  const med = medicoes(insp, calc);
  // itens do checklist cobertos pelos ensaios: se a equipe não marcou, a situação sai das medições
  const ehCabo = (m) => /cabo/i.test(m.equipamento || '');
  const porEnsaio = {
    T2: med.oleo, T3: med.isolamento.filter(m => !ehCabo(m)), C1: med.isolamento.filter(ehCabo),
    T5: med.termografia, P1: med.rele, A1: med.malha,
  };
  const informados = new Set((insp.checklist || []).filter(c => c.situacao && c.situacao !== 'NV').map(c => c.cod));
  const automaticos = Object.entries(porEnsaio).flatMap(([cod, lista]) => {
    const medidos = lista.filter(m => m.resultado && m.resultado !== 'NV');
    if (informados.has(cod) || !medidos.length) return [];
    const nc = medidos.some(m => m.resultado === 'NC');
    return [{ cod, situacao: nc ? 'NC' : 'C', obs: `${nc ? 'Não conforme' : 'Conforme'} nos ensaios da seção 6 (${medidos.length} medição(ões)).` }];
  });
  const checklist = I.mesclarChecklist(CHECKLIST, [...(insp.checklist || []).filter(c => !automaticos.some(a => a.cod === c.cod)), ...automaticos], na);
  // termografia crítica sem NC no checklist vira NC explícita
  const ncsMed = med.termografia.filter(m => m.resultado === 'NC').map(m => ({
    item: 'T5', local: m.ponto, descricao: `Ponto quente: ${num(m.temperatura_c, 1)} °C (ΔT ${num(m.dt, 1)} °C sobre a referência) — ${m.classe}`,
    requisito: 'Termografia (NBR 15572) [CONFERIR]', recomendacao: 'Desenergizar, limpar e reapertar/substituir a conexão; repetir a termografia com carga.', prioridade: m.prioridade || 'P2', foto: m.foto || '',
  }));
  const explicitas = [...(insp.ncs || []), ...ncsMed.filter(n => !(insp.ncs || []).some(e => e.item === n.item && e.local === n.local))];
  const ncs = I.consolidarNcs(checklist, explicitas);
  const parecer = I.parecer(checklist, ncs, [...med.isolamento, ...med.oleo, ...med.rele, ...med.malha]);
  return { dados, calc, insp, checklist, ncs, med, parecer };
}

// ── Resumo para a tela ──────────────────────────────────────────────────────

function textoProtecao(p) {
  if (p.modo === 'disjuntor') return `Disjuntor ${num(p.disjuntor.un)} kV ${p.disjuntor.in} A ${num(p.disjuntor.icn)} kA + relé 50/51/50N/51N`;
  return p.hh ? `Seccionadora + fusíveis HH ${num(p.hh)} A` : `Chave fusível ${p.chave ? p.chave.in : 100} A — elo ${p.elo}`;
}

function resumir(res) {
  const { calc } = res;
  const { dem, trafo, corr, prot, cabo, bt, malha, contrato } = calc;
  const temInspecao = (res.insp.checklist || []).length || (res.insp.isolamento || []).length || (res.insp.termografia || []).length;
  return {
    indicadores: [
      { rotulo: 'Demanda', valor: `${num(dem.kva, 1)} kVA`, detalhe: `${num(dem.kw, 1)} kW · FP ${num(dem.fp)} · com ${num(dem.crescimento, 0)} % de reserva: ${num(dem.kvaProjeto, 1)} kVA` },
      { rotulo: 'Transformador', valor: `${num(trafo.kva)} kVA · Z ${num(trafo.z)} %`, ok: trafo.carregamento <= 1, detalhe: `carregamento ${num(trafo.carregamento * 100, 0)} % · ${trafo.ligacao}${trafo.zTipica ? ' · Z típica [CONFERIR]' : ''}` },
      { rotulo: 'Correntes nominais', valor: `${num(corr.inPrim, 1)} A / ${num(corr.inSec, 0)} A`, detalhe: `primário ${kv(calc.c.kv)} kV / secundário ${calc.c.vSec} V` },
      { rotulo: 'Curto no secundário', valor: `${num(corr.iccSecInfKa, 1)} kA`, detalhe: `S/(√3·V·Z%); com a fonte: ${num(corr.iccSecKa, 1)} kA · pico ${num(bt.ipk, 1)} kA` },
      { rotulo: 'Tipo de subestação', valor: T.TIPOS_SE[calc.se.tipo], ok: calc.se.permitido, detalhe: calc.se.desejado === 'auto' ? 'recomendado pela potência [CONFERIR]' : `desejado: ${T.TIPOS_SE[calc.se.desejado] || calc.se.desejado}` },
      { rotulo: 'Proteção geral de MT', valor: textoProtecao(prot), detalhe: prot.modo === 'disjuntor' ? `51: ${num(prot.i51, 1)} A · 50: ${num(prot.i50, 0)} A · 51N: ${num(prot.i51n, 1)} A · TC ${prot.tcRelacao}` : `In primária ${num(corr.inPrim, 1)} A` },
      ...(cabo ? [{ rotulo: 'Cabo de MT', valor: `3 × 1 × ${cabo.secao} mm² ${prot.classe.cabo}`, ok: cabo.atende, detalhe: `${cabo.criterio} · curto exige ≥ ${num(cabo.sCurtoMin, 1)} mm² · ${num(cabo.L, 0)} m` }] : []),
      { rotulo: 'Para-raios', valor: `${calc.pr.ur} kV · ${calc.pr.in} kA`, detalhe: `${calc.pr.quantidade} un — ${calc.pr.pontos.join('; ')}` },
      { rotulo: 'Disjuntor geral BT', valor: `${bt.inDisj} A · ${bt.icu} kA`, detalhe: `barramento ${bt.barramento.barra} · cabos ${bt.cabos.descricao}` },
      { rotulo: 'Malha de aterramento', valor: `${num(malha.rg, 2)} Ω`, ok: malha.verif.resistencia, detalhe: `${num(malha.lx)} × ${num(malha.ly)} m, ${malha.nHastes} hastes · limite ${num(malha.rMax)} Ω` },
      { rotulo: 'Toque / passo', valor: `${num(malha.tm.em, 0)} V / ${num(malha.tm.es, 0)} V`, ok: malha.verif.toque && malha.verif.passo, detalhe: `admissíveis ${num(malha.adm.toque, 0)} V / ${num(malha.adm.passo, 0)} V (simplificado) [CONFERIR]` },
      { rotulo: 'Medição', valor: `em ${calc.med.local}`, detalhe: calc.med.criterio },
      { rotulo: 'Demanda contratada sugerida', valor: `${contrato.sugerida} kW`, detalhe: `futura ${contrato.futura} kW · ultrapassagem acima de ${num(contrato.limiteUltrapassagem, 0)} kW${contrato.bancoKvar ? ` · capacitores ~${contrato.bancoKvar} kvar` : ''}` },
      ...(temInspecao ? [{ rotulo: 'Parecer da inspeção', valor: res.parecer.situacao.replace(/_/g, ' '), ok: res.parecer.situacao === 'CONFORME' ? true : res.parecer.situacao === 'INCONCLUSIVO' ? undefined : false, detalhe: `NC ${res.ncs.length} · NV ${res.parecer.cont.NV}` }] : []),
    ],
    textos: calc.avisos,
    tabelas: [
      { titulo: 'Demanda por quadro', colunas: ['Quadro', 'Descrição', 'kW', 'FP', 'kVA', 'Origem'], linhas: dem.quadros.map(q => [q.id, q.descricao, num(q.kw, 1), num(q.fp), num(q.kva, 1), q.origem]) },
      { titulo: 'Diagrama unifilar — sequência (entrada → QGBT)', colunas: ['#', 'Elemento', 'Tipo'], linhas: calc.unifilar.elementos.map(e => [e.ordem, e.rotulo, e.tipo]) },
    ],
  };
}

// ── Memorial para a distribuidora ───────────────────────────────────────────

function secoesMemorial(res) {
  const { calc, dados } = res;
  const { c, dem, trafo, curto, corr, se, prot, cabo, pr, bt, malha, med, contrato } = calc;
  const obra = dados.obra?.nome || 'a unidade consumidora';
  const s = [];
  s.push({ titulo: '1. Objeto e dados do fornecimento', paragrafos: [
    `Memorial descritivo e de cálculo da subestação da unidade consumidora "${obra}", atendida em ${kv(c.kv)} kV pela ${c.distribuidora}, conforme a ABNT NBR 14039:2021, a ${T.DISTRIBUIDORA.norma} e a REN ANEEL 1000/2021.`,
  ], kv: [
    ['Tensão de fornecimento', `${kv(c.kv)} kV, trifásico, 60 Hz${c.neutroAterrado ? ', sistema com neutro efetivamente aterrado' : ''}`],
    ['Tensão secundária', `${c.vSec}/${c.vSecFn} V, esquema TN-S a partir do QGBT`],
    ['Tipo de subestação', `${T.TIPOS_SE[se.tipo]}${se.desejado === 'auto' ? ' (escolhida pela potência)' : ''}`],
    ['Potência de transformação', `${num(trafo.kva)} kVA (1 transformador)`],
    ['Carga instalada', dem.cargaInstaladaKw != null ? `${num(dem.cargaInstaladaKw, 1)} kW` : '(informar) [CONFERIR]'],
    ['Nível de curto no ponto de entrega', `${num(curto.icc3fKa, 2)} kA trifásico (${num(curto.sccMva, 1)} MVA); ${num(curto.iccFtKa, 2)} kA fase-terra${curto.informado ? ' — dado da distribuidora' : ' [CONFERIR — valor adotado]'}`],
  ] });
  s.push({ titulo: '2. Cargas e demanda', paragrafos: [
    `Demanda (${dem.origem})${dem.fatorDiversidade !== 1 ? `, com fator de diversidade ${num(dem.fatorDiversidade)} entre quadros` : ''}: ${num(dem.kw, 1)} kW e ${num(dem.kva, 1)} kVA (FP médio ${num(dem.fp)}). Os kVA dos quadros são somados aritmeticamente (lado da segurança).`,
    `Reserva para crescimento de ${num(dem.crescimento, 0)} %: demanda de projeto ${num(dem.kvaProjeto, 1)} kVA${dem.carregamentoMax !== 100 ? `, carregamento máximo admitido ${num(dem.carregamentoMax, 0)} %` : ''}.`,
  ], tabela: { colunas: ['Quadro', 'Descrição', 'Demanda (kW)', 'FP', 'kVA', 'Origem'], linhas: dem.quadros.map(q => [q.id, q.descricao, num(q.kw, 1), num(q.fp), num(q.kva, 1), q.origem]), proporcoes: [0.7, 2.6, 0.9, 0.5, 0.7, 1.1], vazio: `Demanda total informada: ${num(dem.kw, 1)} kW.` } });
  s.push({ titulo: '3. Transformador (NBR 5356)', paragrafos: [
    `Potência comercial imediatamente superior à demanda de projeto (${num(trafo.necessario, 1)} kVA): ${num(trafo.kva)} kVA${trafo.forcado ? ' (definida no formulário)' : ''}, carregamento previsto ${num(trafo.carregamento * 100, 0)} %. Transformador trifásico ${trafo.isolamento === 'seco' ? 'a seco' : 'imerso em óleo isolante'}, ${kv(c.kv)} kV – ${c.vSec}/${c.vSecFn} V, ligação ${trafo.ligacao}, neutro do secundário solidamente aterrado, comutador de derivações sem tensão.`,
    `Impedância percentual Z = ${num(trafo.z)} %${trafo.zTipica ? ' — valor típico adotado; substituir pelo da placa/folha de dados [CONFERIR]' : ' (dado do fabricante)'}.`,
  ] });
  s.push({ titulo: '4. Correntes nominais e de curto-circuito', paragrafos: [
    `In primária = S / (√3 · V) = ${num(trafo.kva)} / (√3 × ${kv(c.kv)}) = ${num(corr.inPrim, 2)} A.  In secundária = ${num(trafo.kva * 1000, 0)} / (√3 × ${c.vSec}) = ${num(corr.inSec, 1)} A.`,
    `Curto-circuito trifásico no secundário (barramento infinito): Icc = S / (√3 · V · Z%) = In / Z = ${num(corr.inSec, 1)} / ${num(trafo.z / 100, 3)} = ${num(corr.iccSecInfKa, 2)} kA — valor usado para especificar o disjuntor geral e o barramento. Considerando a impedância da fonte (${num(corr.zFontePu * 100, 3)} % na base do transformador): ${num(corr.iccSecKa, 2)} kA. Valor de pico (IEC 60909, X/R = ${num(c.bt.xr)}): ip = κ·√2·Icc = ${num(bt.ipk, 1)} kA.`,
  ] });
  // proteção
  if (prot.modo === 'disjuntor') {
    s.push({ titulo: '5. Proteção geral de média tensão', paragrafos: [
      `${trafo.kva > T.DISTRIBUIDORA.limite_fusivel_kva ? `Potência de transformação acima de ${T.DISTRIBUIDORA.limite_fusivel_kva} kVA` : `Potência de ${num(trafo.kva)} kVA (o fusível seria admitido até ${T.DISTRIBUIDORA.limite_fusivel_kva} kVA; disjuntor adotado por opção do projeto)`}: proteção geral por disjuntor acionado por relé secundário de ação indireta com funções 50/51 (fase) e 50N/51N (neutro), conforme a NBR 14039 e a norma da distribuidora [CONFERIR item vigente]. Seccionamento visível a montante do disjuntor: ${se.tipo === 'poste' ? `chaves fusíveis de distribuição ${prot.chave.in} A no poste (abertura visível do porta-fusível)` : `chave seccionadora tripolar ${prot.classe.equipamento} kV com intertravamento`} [CONFERIR exigência da distribuidora].`,
      `Disjuntor: ${prot.disjuntor.un} kV, ${prot.disjuntor.in} A, capacidade de interrupção ${num(prot.disjuntor.icn)} kA (${prot.checagens.disjuntorAtende ? `≥ ${num(curto.icc3fKa, 2)} kA` : `ABAIXO do curto de ${num(curto.icc3fKa, 2)} kA — NÃO ATENDE, consultar fabricante`}), NBI ${prot.disjuntor.nbi} kV. TCs de proteção ${prot.tcRelacao}, classe 10B100/10P20: primário ≥ Icc/20 = ${num(curto.icc3fKa * 1000 / 20, 0)} A (sem saturação no curto máximo); partidas no secundário: 51 = ${num(prot.pct51, 1)} % e 51N = ${num(prot.pct51n, 1)} % da nominal do TC${prot.checagens.faseNaFaixaTc && prot.checagens.neutroNaFaixaTc ? '' : ` — abaixo de ~${T.RELE_PARTIDA_MIN_PCT_TC} %, conferir a faixa de ajuste do relé ou usar TC de menor relação/neutro sensível [CONFERIR]`}. Fonte do relé por nobreak dedicado ou fonte capacitiva.`,
      'Ajustes INDICATIVOS (os definitivos saem do estudo de proteção e seletividade com os dados e as restrições da distribuidora): [CONFERIR]',
    ], tabela: { colunas: ['Função', 'Ajuste (A primários)', 'Critério'], proporcoes: [0.9, 1.2, 3.6], linhas: [
      ['51 — fase temporizada', `${num(prot.i51, 1)} A; curva ${prot.curvaRotulo}, dial ${num(prot.dial)}`, `${num(c.rele.fatorFase)} × In primária; curva abaixo do ponto ANSI (${num(prot.ansi.i, 0)} A em ${prot.ansi.t} s): t(ANSI) = ${num(prot.t51Ansi, 3)} s — ${sim(prot.checagens.protegeTrafo)}`],
      ['50 — fase instantânea', `${num(prot.i50, 0)} A`, `1,1 × maior entre a magnetização (${prot.inrush.multiplo} × In = ${num(prot.inrush.i, 0)} A por ${num(prot.inrush.t)} s) e o curto no secundário referido ao primário (${num(corr.iccSecRefPrim, 0)} A); < 0,8 × Icc da concessionária — ${sim(prot.checagens.instantaneoAbaixoIcc)}`],
      ['51N — neutro temporizada', `${num(prot.i51n, 1)} A`, `${num(c.rele.fatorNeutro)} × ajuste de fase; ponto ANSI fase-terra (Dyn) ${num(prot.ansi.iFt, 0)} A`],
      ['50N — neutro instantânea', `${num(prot.i50n, 0)} A`, '0,5 × ajuste do 50 de fase [CONFERIR]'],
    ] } });
  } else {
    s.push({ titulo: '5. Proteção geral de média tensão', paragrafos: [
      `Potência de transformação ≤ ${T.DISTRIBUIDORA.limite_fusivel_kva} kVA: proteção geral por ${prot.hh ? 'chave seccionadora tripolar com fusíveis limitadores HH' : 'chaves fusíveis de distribuição'}, admitida pela NBR 14039 e pela norma da distribuidora [CONFERIR item vigente].`,
      prot.hh ? `Fusível HH ${num(prot.hh)} A (≥ ${num(T.FATOR_HH, 1)} × In = ${num(T.FATOR_HH * corr.inPrim, 1)} A, acima da magnetização de ${num(prot.inrush.i, 0)} A por 0,1 s) [CONFERIR com a curva do fabricante].` : `Elo fusível ${prot.elo} para ${num(trafo.kva)} kVA em ${kv(c.kv)} kV [CONFERIR tabela da distribuidora]; chave ${prot.classe.equipamento} kV, ${prot.chave.in} A (≥ In primária ${num(corr.inPrim, 1)} A), capacidade de interrupção ≥ ${num(curto.icc3fKa, 2)} kA${prot.chave.atendeCurto ? '' : ` — acima da capacidade usual de chave tipo expulsão (${num(prot.chave.icnSimKa, 1)} kA simétricos): equipamento a definir com a distribuidora [CONFERIR]`}.`,
    ] });
  }
  s.push({ titulo: '6. Ramal de entrada em média tensão', paragrafos: cabo ? [
    `Cabos unipolares de cobre, ${prot.classe.cabo}, isolação ${cabo.isolacao} 90 °C com blindagem metálica, ${T.METODOS_MT[cabo.metodo].toLowerCase()}, ${num(cabo.L, 0)} m do ponto de entrega à subestação, terminações (muflas) nas duas extremidades.`,
    `Critérios (NBR 14039): (a) capacidade de condução Iz ≥ maior entre In primária (${num(cabo.ib, 1)} A) e o ajuste da proteção (${num(cabo.iProj, 1)} A) → ${cabo.sCap} mm² [CONFERIR tabela de capacidade da NBR 14039/fabricante]; (b) seção mínima ${cabo.smin} mm² (NBR 14039: 10 mm² Cu; ${cabo.smin > 10 ? 'valor maior exigido no ramal pela distribuidora [CONFERIR]' : ''}); (c) curto-circuito pela integral de Joule: S ≥ I·√t / k = ${num(curto.icc3fKa * 1000, 0)} × √${num(cabo.t)} / ${cabo.k} = ${num(cabo.sCurtoMin, 1)} mm² → ${cabo.sCurto} mm², com t = ${num(cabo.t)} s (eliminação pela proteção) e k = ${cabo.k} (cobre, ${cabo.isolacao} 90 → 250 °C).`,
    `Seção adotada: ${cabo.secao} mm² — critério determinante: ${cabo.criterio}; Iz = ${num(cabo.iz, 0)} A; queda de tensão ${num(cabo.queda, 3)} %. Blindagem metálica e aterramento das blindagens a verificar para a corrente de curto fase-terra (I·√t = ${num(cabo.blindagemIt, 2)} kA·√s) com o fabricante [CONFERIR].`,
  ] : [se.tipo === 'poste' ? 'Subestação aérea em poste: o transformador é ligado diretamente à rede aérea da distribuidora, sem ramal subterrâneo.' : 'Comprimento do ramal não informado. [CONFERIR]'] });
  s.push({ titulo: '7. Proteção contra sobretensões', paragrafos: [
    `${pr.descricao}, tensão nominal ${pr.ur} kV (MCOV ≈ ${num(pr.mcov, 1)} kV ≥ ${num(pr.mcovNecessaria, 2)} kV, tensão máxima ${c.neutroAterrado ? 'fase-neutro' : 'entre fases — em sistema não efetivamente aterrado as fases sãs ficam na tensão de linha durante a falta à terra'}) para sistema de ${kv(c.kv)} kV ${c.neutroAterrado ? 'com neutro efetivamente aterrado' : 'não efetivamente aterrado'} [CONFERIR com a distribuidora]; ${pr.quantidade} unidades na ${pr.pontos.join('; ')}, ligadas à malha por condutor curto e direto (NBR 14039).`,
  ] });
  s.push({ titulo: '8. Baixa tensão — disjuntor geral, barramento e cabos', paragrafos: [
    bt.disjAtende
      ? `Disjuntor geral de BT ${bt.tipoDisj}, tripolar, In = ${bt.inDisj} A (≥ In secundária ${num(corr.inSec, 1)} A), capacidade de interrupção Icu ≥ ${bt.icu} kA (Icc ${num(corr.iccSecInfKa, 2)} kA)${bt.icuAtende ? '' : ' — ABAIXO do curto, NÃO ATENDE [CONFERIR]'} — NBR 5410, 5.3.4 e NBR IEC 60947-2.`
      : `ATENÇÃO: In secundária de ${num(corr.inSec, 0)} A acima do maior disjuntor geral de BT da tabela (${bt.inDisj} A) — NÃO HÁ proteção geral única que atenda; dividir em dois transformadores/QGBTs ou elevar a tensão secundária antes de emitir o projeto. [CONFERIR]`,
    `Barramento do QGBT: cobre ${bt.barramento.barra} por fase (~${bt.barramento.a} A, ordem de grandeza DIN 43671 [CONFERIR com o fabricante])${bt.barramento.a < bt.inDisj ? ' — abaixo da corrente do disjuntor, dimensionar com o fabricante do painel' : ''}, suportabilidade Icw ≥ ${num(bt.icw, 1)} kA / 1 s e ipk ≥ ${num(bt.ipk, 1)} kA.`,
    bt.cabos.tipo === 'barramento_blindado'
      ? `Ligação transformador → QGBT (${num(bt.cabos.L, 0)} m): nenhuma combinação de até 10 cabos de até 300 mm² por fase atende ${bt.inDisj} A com os fatores de agrupamento da NBR 5410; adotado ${bt.cabos.descricao}.`
      : `Cabos transformador → QGBT (${num(bt.cabos.L, 0)} m, método ${bt.cabos.metodo}, EPR 90 °C — tabelas da NBR 5410 da skill de elétrica): ${bt.cabos.descricao}; Iz = ${num(bt.cabos.iz, 0)} A (FCA ${num(bt.cabos.fca)} para ${bt.cabos.n} circuito(s) em paralelo) ≥ ${bt.inDisj} A; queda ${num(bt.cabos.queda)} % (limite total de 7 % a partir do transformador, NBR 5410 6.2.7).`,
  ] });
  s.push({ titulo: '9. Medição de energia', paragrafos: [`${med.descricao} — critério: ${med.criterio} [CONFERIR com a norma da distribuidora]. Equipamentos de medição fornecidos e lacrados pela distribuidora.`] });
  s.push({ titulo: '10. Malha de aterramento (NBR 15751)', paragrafos: [
    `Solo: ${malha.rho2 && malha.h1 ? `duas camadas — ρ1 = ${num(malha.rho1, 0)} Ω·m até ${num(malha.h1)} m e ρ2 = ${num(malha.rho2, 0)} Ω·m abaixo` : `uniforme, ρ = ${num(malha.rho1, 0)} Ω·m`} (medição pelo método de Wenner, NBR 7117-1). Resistividade aparente para a malha (aproximação de camadas em paralelo até ${num(malha.profInfluencia)} m): ρa = ${num(malha.rhoA, 0)} Ω·m [CONFERIR estratificação].`,
    `Malha ${num(malha.lx)} × ${num(malha.ly)} m (A = ${num(malha.area, 1)} m²), ${malha.nx} × ${malha.ny} condutores (espaçamentos ${num(malha.dx)} m e ${num(malha.dy)} m), profundidade ${num(malha.h)} m, cabo de cobre nu ${malha.sCond} mm² (LC = ${num(malha.lc, 0)} m) e ${malha.nHastes} hastes de ${num(malha.lHaste)} m no perímetro (LR = ${num(malha.lr, 1)} m).`,
    `Resistência (Sverak, IEEE 80): R = ρa·[1/LT + 1/√(20A)·(1 + 1/(1 + h·√(20/A)))] = ${num(malha.rg, 2)} Ω; conferência por Laurent-Niemann: ${num(malha.rgLaurent, 2)} Ω. Limite adotado ${num(malha.rMax)} Ω [CONFERIR exigência da distribuidora] — ${sim(malha.verif.resistencia)}.`,
    `Condutor (Onderdonk): S ≥ I·√t / K = ${num(curto.iccFtKa, 2)} kA × √${num(malha.ts)} / ${num(malha.kO, 3)} = ${num(malha.sCondMin, 1)} mm² (conexão por ${ROTULO_CONEXAO[malha.conexao]}, ${T.TEMP_CONEXAO[malha.conexao]} °C) → ${malha.sCond} mm² (mínimo usual ${T.SECAO_MIN_MALHA} mm² [CONFERIR]).`,
    `Tensões de toque e passo — método simplificado (NBR 15751 / IEEE 80), pessoa de ${malha.pesoKg} kg, tempo de defeito ${num(malha.ts)} s, ${malha.comBrita ? `camada de brita ρs = ${num(malha.rhoBrita, 0)} Ω·m com ${num(malha.hs * 100, 0)} cm (Cs = ${num(malha.adm.cs, 3)}) — a brita é premissa do cálculo e consta da lista de materiais` : `SEM camada superficial de brita (não informada): Cs = 1 e ρs = ρ do solo = ${num(malha.rho1, 0)} Ω·m [CONFERIR — se houver brita, informar ρs e espessura]`}. Corrente de malha IG = Sf × Icc,ft = ${num(malha.sf)} × ${num(curto.iccFtKa, 2)} kA = ${num(malha.ig, 0)} A [CONFERIR fator de divisão com a distribuidora]; elevação de potencial GPR = ${num(malha.gpr, 0)} V. [CONFERIR — para o projeto definitivo, verificar com software de malha em solo estratificado]`,
  ], tabela: { colunas: ['Grandeza', 'Calculado', 'Admissível', 'Situação'], proporcoes: [2, 1, 1, 1], linhas: [
    ['Tensão de toque (malha, Em)', `${num(malha.tm.em, 0)} V`, `${num(malha.adm.toque, 0)} V`, sim(malha.verif.toque)],
    ['Tensão de passo (Es)', `${num(malha.tm.es, 0)} V`, `${num(malha.adm.passo, 0)} V`, sim(malha.verif.passo)],
    ['Resistência da malha', `${num(malha.rg, 2)} Ω`, `${num(malha.rMax)} Ω`, sim(malha.verif.resistencia)],
  ] }, notas: ['Todas as massas, carcaças, telas, portões, cercas, blindagens dos cabos e o neutro do transformador são ligados à malha (NBR 14039 e NBR 15751).'] });
  s.push({ titulo: '11. Demanda contratada e fator de potência (REN 1000/2021)', paragrafos: [
    `Demanda a contratar sugerida: ${contrato.sugerida} kW (mínimo de ${T.DISTRIBUIDORA.demanda_min_contratada_kw} kW); prever revisão para ~${contrato.futura} kW com o crescimento. Ultrapassagem cobrada acima de ${num(contrato.limiteUltrapassagem, 0)} kW (tolerância de ${num(T.DISTRIBUIDORA.tolerancia_ultrapassagem * 100, 0)} %). Modalidade tarifária (verde ou azul) a definir pelo estudo de faturamento. [CONFERIR artigos vigentes da REN 1000]`,
    `Fator de potência médio previsto ${num(contrato.fp)} (referência ${num(contrato.fpReferencia)}).${contrato.bancoKvar ? ` Prever banco de capacitores automático de ~${contrato.bancoKvar} kvar no QGBT para FP ${num(contrato.fpAlvo)}.` : ''}`,
  ] });
  s.push({ titulo: '12. Requisitos construtivos e de segurança', marcadores: [
    `Distâncias mínimas no ar entre partes vivas e entre partes vivas e terra para ${prot.classe.equipamento} kV / NBI ${prot.classe.nbi} kV: 160 mm (instalação interna) [CONFERIR tabela da NBR 14039].`,
    'Partes vivas sem barreira a no mínimo 2,50 m do piso de circulação; telas/barreiras metálicas aterradas nos postos de transformação e proteção [CONFERIR NBR 14039].',
    'Corredores de circulação e manobra desobstruídos, com largura livre conforme a NBR 14039 (tipicamente ≥ 1,20 m na frente dos comandos) [CONFERIR].',
    'Porta metálica com fechadura abrindo para fora, placa "PERIGO — ALTA TENSÃO" e acesso restrito a pessoas autorizadas (NR-10, 10.8 e 10.10).',
    'Iluminação normal e de emergência, ventilação adequada às perdas do transformador e extintor de CO₂ junto à entrada.',
    ...(trafo.isolamento === 'oleo' ? ['Transformador a óleo: caixa/bacia de contenção com brita e drenagem; avaliar parede corta-fogo conforme o volume de óleo [CONFERIR NBR 14039 e Corpo de Bombeiros].'] : []),
    'EPCs na subestação: tapete isolante, vara de manobra, detector de tensão e conjunto de aterramento temporário (NR-10, 10.2.8 e 10.5); diagrama unifilar afixado.',
  ] });
  s.push({ titulo: '13. Diagrama unifilar — sequência dos equipamentos', paragrafos: ['Do ponto de entrega ao QGBT, na ordem do diagrama unifilar (base para o desenho no QElectroTech):'],
    tabela: { colunas: ['#', 'Id', 'Equipamento'], linhas: calc.unifilar.elementos.map(e => [e.ordem, e.id, e.rotulo]), proporcoes: [0.3, 0.6, 5] } });
  s.push({ titulo: '14. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 1), m.referencia]), proporcoes: [0.8, 4, 0.45, 0.55, 1.6], tamanho: 15 } });
  s.push({ titulo: 'Avisos e premissas', marcadores: calc.avisos });
  return s;
}

// ── Laudo de inspeção/manutenção e checklist de campo ──────────────────────

function cfgLaudo(res) {
  const { calc, med } = res;
  return {
    titulo: 'LAUDO TÉCNICO DE INSPEÇÃO E MANUTENÇÃO DE SUBESTAÇÃO',
    tipoInspecao: `Inspeção conforme a ABNT NBR 14039:2021 e a NR-10 — ${({ preventiva: 'manutenção preventiva', inicial: 'comissionamento / verificação inicial', corretiva: 'após manutenção corretiva' })[res.insp.tipo] || 'manutenção preventiva'}`,
    tituloCurto: 'Laudo — subestação de média tensão',
    sigla: 'LAUDO-SE',
    objetivo: 'Registrar a inspeção visual, a termografia e os ensaios da subestação de média tensão (transformador, proteção geral, cabos e terminações, para-raios e malha de aterramento), com as não conformidades, recomendações e prazos, conforme a ABNT NBR 14039:2021 e a NR-10.',
    listaNormas: NORMAS,
    secoesChecklist: SECOES_CHECKLIST,
    descricao: [
      ['Fornecimento', `${kv(calc.c.kv)} kV — ${calc.c.distribuidora}`],
      ['Tipo de subestação', T.TIPOS_SE[calc.se.tipo]],
      ['Transformador', `${num(calc.trafo.kva)} kVA, ${kv(calc.c.kv)} kV – ${calc.c.vSec}/${calc.c.vSecFn} V, ${calc.trafo.ligacao}, Z ${num(calc.trafo.z)} %, ${calc.trafo.isolamento === 'seco' ? 'a seco' : 'a óleo'}`],
      ['Proteção geral', textoProtecao(calc.prot)],
      ['Disjuntor geral BT', `${calc.bt.inDisj} A / ${calc.bt.icu} kA`],
      ['Malha de aterramento (projeto)', `${num(calc.malha.rg, 2)} Ω estimados; limite ${num(calc.malha.rMax)} Ω`],
    ],
    metodologia: [
      'Inspeção visual com a subestação energizada (distâncias de segurança respeitadas) e termografia com carga.',
      'Desligamento programado com a distribuidora; desenergização, bloqueio, teste de ausência de tensão e aterramento temporário (NR-10, 10.5).',
      'Ensaios: resistência de isolamento (megôhmetro 5 kV/1 kV), relação de transformação, coleta de óleo para laboratório, teste do relé por injeção secundária e do disjuntor.',
      'Medição da resistência da malha pelo método da queda de potencial (NBR 15749) e continuidade das ligações à malha.',
    ],
    medicoes: [
      { titulo: '6.1 Resistência de isolamento', colunas: ['Equipamento', 'Ensaio', 'Tensão (V)', 'Medido (MΩ)', 'Critério', 'Resultado'], proporcoes: [1.4, 1.2, 0.7, 0.8, 1.8, 0.7],
        linhas: med.isolamento.map(m => [m.equipamento, m.ensaio, num(m.tensao_ensaio_v, 0), m.valor_mohm ?? '', m.criterio, m.resultado]) },
      { titulo: '6.2 Óleo isolante (NBR 10576)', colunas: ['Equipamento', 'Rigidez (kV)', 'Água (ppm)', 'Critério', 'Resultado'], proporcoes: [1.6, 0.8, 0.8, 2, 0.7],
        linhas: med.oleo.map(m => [m.equipamento, m.rigidez_kv ?? '', m.agua_ppm ?? '', m.criterio, m.resultado]), nota: 'Limites de óleo em serviço para equipamentos até 72,5 kV. [CONFERIR com a NBR 10576 vigente e o laudo do laboratório]' },
      { titulo: '6.3 Termografia', colunas: ['Ponto', 'Temp. (°C)', 'Referência (°C)', 'ΔT (°C)', 'Classificação', 'Resultado'], proporcoes: [2, 0.7, 0.8, 0.6, 1.8, 0.7],
        linhas: med.termografia.map(m => [m.ponto, m.temperatura_c ?? '', m.referencia_c ?? '', num(m.dt, 1), m.classe, m.resultado]), nota: 'Classificação por ΔT sobre componente similar/ambiente: ≤ 10 °C normal; 10–20 °C atenção; 20–40 °C sério; > 40 °C crítico. [CONFERIR critério adotado pela empresa]' },
      { titulo: '6.4 Teste do relé de proteção (injeção secundária)', colunas: ['Função', 'Corrente (A prim.)', 'Esperado (s)', 'Medido (s)', 'Tolerância (s)', 'Resultado'], proporcoes: [1.2, 1, 0.9, 0.9, 0.9, 0.7],
        linhas: med.rele.map(m => [m.funcao, m.corrente_a ?? '', num(m.esperado, 3), m.tempo_medido_s ?? '', num(m.tolerancia, 3), m.resultado]), nota: 'Tempo esperado pela curva e ajustes do estudo de proteção quando não informado; tolerância ± 10 % ou ± 40 ms.' },
      { titulo: '6.5 Resistência da malha de aterramento', colunas: ['Ponto', 'Método', 'Medido (Ω)', 'Limite (Ω)', 'Resultado'], proporcoes: [2, 1.6, 0.8, 0.8, 0.7],
        linhas: med.malha.map(m => [m.ponto, m.metodo || 'queda de potencial', m.valor_ohm ?? '', num(m.limite), m.resultado]) },
    ],
    conclusoes: ['A subestação deve ser mantida com manutenção preventiva periódica registrada no prontuário das instalações (NR-10, 10.2.4) e operada apenas por profissionais autorizados.'],
    proximaInspecao: [
      ['Manutenção preventiva completa (com desligamento)', 'Anual [CONFERIR plano de manutenção / recomendação do fabricante]'],
      ['Termografia', 'Semestral a anual, com carga'],
      ['Análise do óleo isolante', 'Anual (físico-químico e rigidez); cromatografia conforme histórico'],
      ['Teste do relé e do disjuntor', 'Anual e após qualquer atuação por curto-circuito'],
      ['Resistência da malha', 'Anual, preferencialmente na estação seca'],
    ],
  };
}

function cfgChecklist(res) {
  const { calc } = res;
  const p = calc.prot;
  return {
    titulo: 'CHECKLIST DE CAMPO — SUBESTAÇÃO DE MÉDIA TENSÃO', subtitulo: 'ABNT NBR 14039:2021 — NR-10', tituloCurto: 'Checklist de campo — subestação',
    secoesChecklist: SECOES_CHECKLIST,
    preparacao: [
      'Desligamento programado com a distribuidora; APR, permissão de trabalho e equipe autorizada para SEP (NR-10, 10.7).',
      'Sequência: desenergizar, seccionar, bloquear, testar ausência de tensão, aterrar temporariamente, sinalizar (NR-10, 10.5).',
      'Levar: megôhmetro 5 kV, TTR, micro-ohmímetro, mala de teste de relé, terrômetro, termovisor, frascos para coleta de óleo, EPI/EPC classe adequada.',
    ],
    referencias: [
      ['Transformador', `${num(calc.trafo.kva)} kVA · In ${num(calc.corr.inPrim, 1)} A / ${num(calc.corr.inSec, 0)} A`],
      ['Proteção geral', textoProtecao(p)],
      ...(p.modo === 'disjuntor' ? [['Ajustes do relé (projeto)', `51 ${num(p.i51, 1)} A ${p.curva} dial ${num(p.dial)} · 50 ${num(p.i50, 0)} A · 51N ${num(p.i51n, 1)} A · 50N ${num(p.i50n, 0)} A`]] : []),
      ['Malha de aterramento', `≤ ${num(calc.malha.rMax)} Ω (projeto ${num(calc.malha.rg, 2)} Ω)`],
      ['Óleo isolante', `rigidez ≥ ${RIGIDEZ_MIN_KV} kV; água ≤ ${AGUA_MAX_PPM} ppm [CONFERIR]`],
    ],
    medicoes: [
      { titulo: 'Resistência de isolamento', colunas: ['Equipamento / ensaio', 'Tensão (V)', '1 min (MΩ)', '10 min (MΩ)', 'IP'], proporcoes: [2.2, 0.8, 0.9, 0.9, 0.6], linhas: [['Transformador AT – massa', 5000, '', '', ''], ['Transformador BT – massa', 1000, '', '', ''], ['Transformador AT – BT', 5000, '', '', ''], ...(calc.cabo ? ['A', 'B', 'C'].map(f => [`Cabo de MT fase ${f}`, 5000, '', '', '']) : [])] },
      { titulo: 'Termografia', colunas: ['Ponto', 'Temp. (°C)', 'Referência (°C)', 'Carga (%)', 'Foto'], proporcoes: [2.4, 0.8, 0.9, 0.8, 0.8], linhas: [] },
      ...(p.modo === 'disjuntor' ? [{ titulo: 'Teste do relé', colunas: ['Função', 'Corrente injetada', 'Tempo esperado (s)', 'Tempo medido (s)', 'Disparou DJ?'], proporcoes: [1, 1.1, 1, 1, 0.9], linhas: [['51 fase', '', '', '', '☐'], ['50 fase', '', '', '', '☐'], ['51N', '', '', '', '☐'], ['50N', '', '', '', '☐']] }] : []),
      { titulo: 'Malha de aterramento', colunas: ['Ponto', 'Distância eletrodos (m)', 'Medido (Ω)', 'Clima / solo'], proporcoes: [2, 1, 0.8, 1.4], linhas: [] },
    ],
  };
}

// ── Planilha ────────────────────────────────────────────────────────────────

function abaKv(nome, linhas) {
  return {
    nome,
    colunas: [{ header: 'Grandeza', key: 'grandeza', width: 46 }, { header: 'Valor', key: 'valor', width: 18 }, { header: 'Unidade', key: 'unidade', width: 10 }, { header: 'Critério / referência', key: 'ref', width: 70 }],
    linhas: linhas.map(([grandeza, valor, unidade, ref]) => ({ grandeza, valor: typeof valor === 'number' ? Math.round(valor * 1000) / 1000 : valor, unidade, ref })),
  };
}

async function gerarPlanilha(res) {
  const { calc } = res;
  const { c, dem, trafo, curto, corr, prot, cabo, pr, bt, malha, med, contrato } = calc;
  return D.gerarPlanilha([
    { nome: 'Demanda', colunas: [{ header: 'Quadro', key: 'id', width: 10 }, { header: 'Descrição', key: 'descricao', width: 44 }, { header: 'Demanda (kW)', key: 'kw', width: 13, numFmt: '0.0' }, { header: 'FP', key: 'fp', width: 7, numFmt: '0.00' }, { header: 'kVA', key: 'kva', width: 10, numFmt: '0.0' }, { header: 'Origem', key: 'origem', width: 26 }],
      linhas: [...dem.quadros, { id: 'TOTAL', descricao: `× fator de diversidade ${dem.fatorDiversidade}`, kw: dem.kw, fp: dem.fp, kva: dem.kva }, { id: 'PROJETO', descricao: `com ${dem.crescimento} % de crescimento`, kw: dem.kwProjeto, kva: dem.kvaProjeto }] },
    abaKv('Transformador e correntes', [
      ['Demanda de projeto', dem.kvaProjeto, 'kVA', `demanda × (1 + ${dem.crescimento} %)`],
      ['Potência do transformador', trafo.kva, 'kVA', 'potência comercial imediatamente superior (NBR 5356)'],
      ['Carregamento', trafo.carregamento * 100, '%', ''],
      ['Impedância Z', trafo.z, '%', trafo.zTipica ? 'típica [CONFERIR placa]' : 'fabricante'],
      ['In primária', corr.inPrim, 'A', 'S / (√3·V)'],
      ['In secundária', corr.inSec, 'A', 'S / (√3·V)'],
      ['Icc trifásica no ponto de entrega', curto.icc3fKa, 'kA', curto.informado ? 'distribuidora' : 'adotado [CONFERIR]'],
      ['Potência de curto no ponto de entrega', curto.sccMva, 'MVA', '√3·V·Icc'],
      ['Icc fase-terra no ponto de entrega', curto.iccFtKa, 'kA', ''],
      ['Icc no secundário (barramento infinito)', corr.iccSecInfKa, 'kA', 'S / (√3·V·Z%)'],
      ['Icc no secundário (com a fonte)', corr.iccSecKa, 'kA', 'In / (Z + S/Scc)'],
      ['Corrente de pico no secundário', bt.ipk, 'kA', `κ·√2·Icc, κ = ${Math.round(bt.kappa * 1000) / 1000}`],
      ['Corrente de magnetização', prot.inrush.i, 'A', `${prot.inrush.multiplo} × In por 0,1 s [CONFERIR]`],
      ['Ponto ANSI', prot.ansi.i, 'A', `100/Z × In em ${prot.ansi.t} s`],
    ]),
    abaKv('Proteção', prot.modo === 'disjuntor' ? [
      ['Proteção geral', prot.dispositivo, '', 'NBR 14039; norma da distribuidora'],
      ['TC de proteção', prot.tcRelacao, '', 'primário ≥ Icc/20'],
      ['51 / 51N no secundário do TC', `${Math.round(prot.pct51 * 10) / 10} / ${Math.round(prot.pct51n * 10) / 10}`, '% de 5 A', `≥ ~${T.RELE_PARTIDA_MIN_PCT_TC} % [CONFERIR faixa do relé]: ${sim(prot.checagens.faseNaFaixaTc && prot.checagens.neutroNaFaixaTc)}`],
      ['51 — partida de fase', prot.i51, 'A', `${c.rele.fatorFase} × In primária`],
      ['51 — curva / dial', `${prot.curva} / ${prot.dial}`, '', prot.curvaRotulo],
      ['51 — tempo no ponto ANSI', prot.t51Ansi, 's', `< ${prot.ansi.t} s: ${sim(prot.checagens.protegeTrafo)}`],
      ['50 — instantâneo de fase', prot.i50, 'A', '1,1 × max(magnetização; Icc BT referida ao primário)'],
      ['51N — partida de neutro', prot.i51n, 'A', `${c.rele.fatorNeutro} × 51`],
      ['50N — instantâneo de neutro', prot.i50n, 'A', '0,5 × 50 [CONFERIR]'],
      ['Disjuntor MT', `${prot.disjuntor.un} kV ${prot.disjuntor.in} A ${prot.disjuntor.icn} kA`, '', 'Icn ≥ Icc'],
      ['Para-raios', `${pr.ur} kV / ${pr.in} kA × ${pr.quantidade}`, '', 'NBR 16050 [CONFERIR]'],
      ['Elo da derivação', prot.eloDerivacao, '', 'tabela da distribuidora [CONFERIR]'],
      ['Chave fusível da derivação', `${prot.chave.in} A`, '', `≥ In primária; Icn usual ${prot.chave.icnSimKa} kA sim.: ${sim(prot.chave.atendeCurto)} [CONFERIR]`],
      ['Medição', med.local, '', med.criterio],
    ] : [
      ['Proteção geral', prot.dispositivo, '', `≤ ${T.DISTRIBUIDORA.limite_fusivel_kva} kVA — NBR 14039`],
      ...(prot.hh ? [['Fusível HH', prot.hh, 'A', `≥ ${T.FATOR_HH} × In`]] : [['Elo fusível', prot.elo, '', 'tabela da distribuidora [CONFERIR]']]),
      ['Para-raios', `${pr.ur} kV / ${pr.in} kA × ${pr.quantidade}`, '', 'NBR 16050 [CONFERIR]'],
      ['Medição', med.local, '', med.criterio],
    ]),
    abaKv('Cabos', [
      ...(cabo ? [
        ['MT — seção adotada', cabo.secao, 'mm²', cabo.criterio],
        ['MT — pela capacidade', cabo.sCap, 'mm²', `Iz ≥ ${Math.round(cabo.iProj * 10) / 10} A (${T.METODOS_MT[cabo.metodo]})`],
        ['MT — pelo curto (mínimo calculado)', cabo.sCurtoMin, 'mm²', `S ≥ I·√t/k; I = ${curto.icc3fKa} kA, t = ${cabo.t} s, k = ${cabo.k}`],
        ['MT — seção mínima', cabo.smin, 'mm²', 'NBR 14039 / distribuidora'],
        ['MT — Iz da seção adotada', cabo.iz, 'A', '[CONFERIR tabela]'],
        ['MT — comprimento', cabo.L, 'm', ''],
        ['MT — queda de tensão', cabo.queda, '%', ''],
      ] : [['MT', 'sem ramal subterrâneo', '', '']]),
      ...(bt.cabos.tipo === 'barramento_blindado' ? [
        ['BT — trafo → QGBT', bt.cabos.descricao, '', 'cabos em paralelo não atendem [CONFERIR com o fabricante]'],
      ] : [
        ['BT — cabos trafo → QGBT', bt.cabos.descricao, '', `método ${bt.cabos.metodo}, EPR 90 °C`],
        ['BT — Iz total', bt.cabos.iz, 'A', `≥ ${bt.inDisj} A (FCA ${bt.cabos.fca})`],
        ['BT — queda de tensão', bt.cabos.queda, '%', `≤ ${c.bt.quedaMax} %`],
      ]),
      ['BT — disjuntor geral', `${bt.inDisj} A / ${bt.icu} kA`, '', bt.tipoDisj],
      ['BT — barramento', bt.barramento.barra, '', `~${bt.barramento.a} A [CONFERIR]`],
    ]),
    abaKv('Malha', [
      ['ρ1 / h1 / ρ2', `${malha.rho1} / ${malha.h1 ?? '—'} / ${malha.rho2 ?? '—'}`, 'Ω·m / m / Ω·m', 'NBR 7117-1'],
      ['Resistividade aparente', malha.rhoA, 'Ω·m', '[CONFERIR estratificação]'],
      ['Dimensões', `${malha.lx} × ${malha.ly}`, 'm', ''],
      ['Condutores / espaçamentos', `${malha.nx} × ${malha.ny} / ${Math.round(malha.dx * 100) / 100} e ${Math.round(malha.dy * 100) / 100}`, 'm', ''],
      ['Comprimento de cabo (LC)', malha.lc, 'm', ''],
      ['Hastes', `${malha.nHastes} × ${malha.lHaste}`, 'm', ''],
      ['Resistência (Sverak)', malha.rg, 'Ω', `≤ ${malha.rMax} Ω: ${sim(malha.verif.resistencia)}`],
      ['Resistência (Laurent-Niemann)', malha.rgLaurent, 'Ω', 'conferência'],
      ['Seção mínima do condutor', malha.sCondMin, 'mm²', `Onderdonk, conexão ${malha.conexao}`],
      ['Seção adotada', malha.sCond, 'mm²', ''],
      ['Corrente de malha IG', malha.ig, 'A', `Sf ${malha.sf} × Icc,ft [CONFERIR]`],
      ['GPR', malha.gpr, 'V', ''],
      ['Fator Cs', malha.adm.cs, '', malha.comBrita ? `brita ${malha.rhoBrita} Ω·m, ${malha.hs} m` : 'sem brita (Cs = 1, ρs = ρ do solo)'],
      ['Toque admissível', malha.adm.toque, 'V', `${malha.pesoKg} kg, ${malha.ts} s`],
      ['Toque na malha (Em)', malha.tm.em, 'V', sim(malha.verif.toque)],
      ['Passo admissível', malha.adm.passo, 'V', ''],
      ['Passo (Es)', malha.tm.es, 'V', sim(malha.verif.passo)],
    ]),
    abaKv('Demanda contratada', [
      ['Demanda contratada sugerida', contrato.sugerida, 'kW', `mínimo ${T.DISTRIBUIDORA.demanda_min_contratada_kw} kW (REN 1000) [CONFERIR]`],
      ['Demanda futura', contrato.futura, 'kW', 'com crescimento'],
      ['Limite sem ultrapassagem', contrato.limiteUltrapassagem, 'kW', '+5 %'],
      ['Fator de potência', contrato.fp, '', `referência ${contrato.fpReferencia}`],
      ['Banco de capacitores', contrato.bancoKvar, 'kvar', contrato.bancoKvar ? `para FP ${contrato.fpAlvo}` : 'não necessário'],
    ]),
    { nome: 'Unifilar', colunas: [{ header: '#', key: 'ordem', width: 5 }, { header: 'Id', key: 'id', width: 8 }, { header: 'Tipo', key: 'tipo', width: 20 }, { header: 'Equipamento', key: 'rotulo', width: 70 }, { header: 'Dados', key: 'dados', width: 80 }],
      linhas: calc.unifilar.elementos.map(e => ({ ...e, dados: JSON.stringify(e.dados) })) },
    D.abaMateriais(calc.materiais),
  ]);
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo para a distribuidora', formato: 'Word', nome: 'Memorial_Subestacao',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO E DE CÁLCULO — SUBESTAÇÃO DE MÉDIA TENSÃO', subtitulo: `ABNT NBR 14039:2021 — fornecimento em ${kv(res.calc.c.kv)} kV (${res.calc.c.distribuidora})`, tituloCurto: 'Memorial — subestação de MT', sigla: 'MEM-SE', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de cálculo e materiais', formato: 'Excel', nome: 'Subestacao', gerar: (res) => gerarPlanilha(res) },
  { tipo: 'laudo', rotulo: 'Laudo de inspeção/manutenção da SE', formato: 'Word', nome: 'Laudo_Subestacao',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, cfgLaudo(res), { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Subestacao',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, cfgChecklist(res), res.checklist)) },
];

// ── Orçamento ───────────────────────────────────────────────────────────────

const SERVICOS_SE = {
  poste: ['mt_se_poste', 'Montagem de subestação aérea em poste (estrutura, transformador, chaves e para-raios)'],
  abrigada: ['mt_se_abrigada', 'Montagem eletromecânica de subestação abrigada (cubículos, barramentos de MT, telas e equipamentos)'],
  blindada: ['mt_se_blindada', 'Instalação e ligação de subestação/cabine blindada'],
  ao_tempo: ['mt_se_ao_tempo', 'Montagem de subestação ao tempo (estruturas, barramentos, equipamentos e cerca)'],
};

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const obra = dados.obra?.nome || dados.cliente?.nome || 'a unidade consumidora';
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade, subgrupo = 'Subestação') => ({ secao: S, subgrupo, codigo, descricao, quantidade, unidade });
  if (modo === 'execucao') {
    const { trafo, se, prot, cabo, malha } = calc;
    const [codSe, descSe] = SERVICOS_SE[se.tipo];
    return {
      cliente_nome: dados.cliente?.nome || '',
      escopo: `Fornecimento e montagem de subestação ${T.TIPOS_SE[se.tipo].toLowerCase()} de ${num(trafo.kva)} kVA em ${kv(calc.c.kv)} kV para ${obra}, conforme a ABNT NBR 14039 e a norma da ${calc.c.distribuidora}: ${textoProtecao(prot).toLowerCase()}, para-raios, ${cabo ? `ramal subterrâneo ${cabo.secao} mm² (${num(cabo.L, 0)} m), ` : ''}transformador ${trafo.ligacao}, QGBT com disjuntor geral de ${calc.bt.inDisj} A, malha de aterramento e medição padrão da distribuidora, com projeto, aprovação, ensaios de comissionamento e ART.`,
      observacoes: 'Rascunho gerado pela skill de média tensão — conferir quantidades e preços antes de enviar ao cliente. Taxas e serviços da distribuidora (vistoria, ligação, eventual obra de rede) não incluídos.',
      itens: [
        ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Subestação', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
        srv(codSe, descSe, 1, 'un'),
        srv('mt_transformador', 'Transporte interno, içamento, posicionamento e ligação do transformador', 1, 'un'),
        ...(prot.modo === 'disjuntor' ? [srv('mt_disjuntor_rele', 'Instalação do disjuntor de MT com relé secundário, TCs e fonte; parametrização dos ajustes', 1, 'un')] : []),
        ...(cabo ? [
          srv('mt_infra_subterranea', 'Infraestrutura do ramal subterrâneo de MT (vala, eletroduto, caixas de passagem e descida no poste)', Math.ceil(cabo.L), 'm'),
          srv('mt_cabo', 'Lançamento de cabo de MT (por metro de circuito trifásico)', Math.ceil(cabo.L), 'm'),
          srv('mt_terminacao', 'Confecção de terminação (mufla) de MT', 6, 'un'),
        ] : []),
        srv('mt_malha', 'Malha de aterramento: vala, lançamento de cabo nu e conexões exotérmicas', Math.ceil(malha.lc), 'm'),
        srv('mt_hastes', 'Cravação de haste de aterramento e instalação de caixa de inspeção', malha.nHastes, 'un'),
        srv('mt_qgbt', 'Montagem do QGBT e ligação dos cabos do transformador ao QGBT', 1, 'un'),
        srv('mt_ensaios_comissionamento', 'Ensaios e comissionamento (isolamento, TTR, teste do relé, malha) e energização com a distribuidora', 1, 'vb'),
        srv('mt_projeto_aprovacao', 'Projeto da subestação (memorial, unifilar, estudo de proteção), ART e aprovação na distribuidora', 1, 'vb'),
      ].filter(i => i.quantidade > 0),
    };
  }
  const sub = 'Manutenção de SE';
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: `Manutenção preventiva e inspeção da subestação de ${num(calc.trafo.kva)} kVA de ${obra} conforme a ABNT NBR 14039 e a NR-10: limpeza e reaperto, termografia, ${calc.trafo.isolamento === 'oleo' ? 'análise do óleo isolante, ' : ''}ensaios de isolamento e TTR${calc.prot.modo === 'disjuntor' ? ', teste do relé e do disjuntor' : ''}, medição da malha de aterramento e laudo técnico com ART.${res.ncs.length ? ` Inclui a correção das ${res.ncs.length} não conformidades apontadas (itens a cotar).` : ''}`,
    observacoes: 'Rascunho gerado pela skill de média tensão — conferir antes de enviar ao cliente. Desligamento programado junto à distribuidora por conta do cliente.',
    itens: [
      srv('mt_manutencao_preventiva', 'Manutenção preventiva da subestação com desligamento (limpeza, reaperto, inspeção, lubrificação de mecanismos)', 1, 'vb', sub),
      srv('mt_termografia', 'Inspeção termográfica da subestação e do QGBT com relatório', 1, 'vb', sub),
      ...(calc.trafo.isolamento === 'oleo' ? [srv('mt_ensaio_oleo', 'Coleta e análise do óleo isolante (rigidez, físico-químico e cromatografia)', 1, 'un', sub)] : []),
      srv('mt_ensaio_isolamento', 'Ensaios de resistência de isolamento e relação de transformação (transformador e cabos)', 1, 'vb', sub),
      ...(calc.prot.modo === 'disjuntor' ? [srv('mt_teste_rele', 'Teste do relé de proteção por injeção secundária e do disjuntor de MT', 1, 'un', sub)] : []),
      srv('mt_medicao_malha', 'Medição da resistência da malha de aterramento e continuidade das ligações', 1, 'un', sub),
      srv('mt_laudo', 'Laudo técnico de inspeção da subestação com ART', 1, 'vb', sub),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
    ],
  };
}

// ── Formulário da tela ─────────────────────────────────────────────────────

const OP = {
  kv: F.op([['13.8', '13,8 kV'], ['13.2', '13,2 kV'], ['22', '22 kV'], ['34.5', '34,5 kV']]),
  vsec: F.op([['380', '380/220 V'], ['220', '220/127 V'], ['440', '440/254 V']]),
  vsecfn: F.op([['220', '220 V'], ['127', '127 V'], ['254', '254 V']]),
  tipoSe: F.op([['auto', 'Automático pela potência'], ...Object.entries(T.TIPOS_SE)]),
  protecao: F.op([['auto', 'Automático pela potência'], ['disjuntor', 'Disjuntor + relé 50/51 – 50N/51N'], ['fusivel', 'Fusível (até 300 kVA)']]),
  isolTrafo: F.op([['oleo', 'Imerso em óleo'], ['seco', 'A seco']]),
  metodoMt: F.op(Object.entries(T.METODOS_MT)),
  isolCabo: F.op([['EPR', 'EPR 90 °C'], ['XLPE', 'XLPE 90 °C']]),
  curva: F.op(Object.entries(T.CURVAS_IEC).map(([k, v]) => [k, v.rotulo])),
  metodoBt: F.op([['F', 'F — unipolares em bandeja/leito'], ['E', 'E — multipolar em bandeja'], ['B1', 'B1 — em eletroduto aparente'], ['D', 'D — eletroduto enterrado']]),
  conexao: F.op([['exotermica', 'Solda exotérmica'], ['compressao', 'Compressão'], ['aparafusada', 'Aparafusada']]),
  peso: F.op([['50', '50 kg (conservador)'], ['70', '70 kg']]),
  tipoInsp: F.op([['preventiva', 'Manutenção preventiva'], ['inicial', 'Comissionamento / verificação inicial'], ['corretiva', 'Após manutenção corretiva']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Fornecimento (distribuidora)', aberta: true, resumo: 'fornecimento.tensao_primaria_kv', itens: [
    { tipo: 'nota', texto: 'Nível de curto no ponto de entrega: peça à distribuidora (Neoenergia) — informe em kA ou em MVA. Os limites por tipo de SE e proteção seguem a norma de fornecimento vigente [CONFERIR].' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'fornecimento.distribuidora', rotulo: 'Distribuidora' },
      { caminho: 'fornecimento.tensao_primaria_kv', rotulo: 'Tensão primária', tipo: 'selecao', opcoes: OP.kv },
      { caminho: 'fornecimento.tensao_secundaria_v', rotulo: 'Tensão secundária (F-F)', tipo: 'selecao', opcoes: OP.vsec },
      { caminho: 'fornecimento.tensao_secundaria_fn', rotulo: 'Tensão secundária (F-N)', tipo: 'selecao', opcoes: OP.vsecfn },
      { caminho: 'fornecimento.icc_3f_ka', rotulo: 'Icc trifásica no ponto (kA)', tipo: 'numero' },
      { caminho: 'fornecimento.scc_mva', rotulo: 'ou potência de curto (MVA)', tipo: 'numero' },
      { caminho: 'fornecimento.icc_ft_ka', rotulo: 'Icc fase-terra (kA)', tipo: 'numero' },
      { caminho: 'fornecimento.tempo_eliminacao_s', rotulo: 'Tempo de eliminação do curto (s)', tipo: 'numero', dica: 'Usado no cabo de MT e na malha; padrão 0,5 s' },
      { caminho: 'fornecimento.tipo_se', rotulo: 'Tipo de subestação desejado', tipo: 'selecao', opcoes: OP.tipoSe },
      { caminho: 'fornecimento.protecao', rotulo: 'Proteção geral', tipo: 'selecao', opcoes: OP.protecao },
      { caminho: 'fornecimento.neutro_aterrado', rotulo: 'Sistema com neutro efetivamente aterrado', tipo: 'check' },
    ] },
  ] },
  { titulo: '3. Cargas de baixa tensão e demanda', aberta: true, resumo: 'cargas.demanda_total_kw', itens: [
    { tipo: 'nota', texto: 'Informe a demanda por quadro (kW e FP) ou só a demanda total. Para importar da skill de elétrica, use o campo "Arquivo(s) da skill de elétrica" (CLI) ou cole o JSON da obra elétrica em cargas.eletrica ao importar o arquivo.' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'cargas.demanda_total_kw', rotulo: 'Demanda total (kW) — se não houver quadros', tipo: 'numero' },
      { caminho: 'cargas.fp_total', rotulo: 'Fator de potência', tipo: 'numero' },
      { caminho: 'cargas.carga_instalada_kw', rotulo: 'Carga instalada (kW)', tipo: 'numero', dica: 'REN 1000, art. 23: > 75 kW em MT' },
      { caminho: 'cargas.fator_diversidade', rotulo: 'Fator de diversidade entre quadros', tipo: 'numero' },
      { caminho: 'cargas.crescimento_pct', rotulo: 'Crescimento previsto (%)', tipo: 'numero' },
      { caminho: 'cargas.carregamento_max_pct', rotulo: 'Carregamento máximo do trafo (%)', tipo: 'numero' },
      { caminho: 'cargas.arquivo_eletrica', rotulo: 'Arquivo(s) da skill de elétrica', largura: 'inteira', dica: 'Caminho do JSON da obra elétrica (uso pela CLI)' },
    ] },
    { tipo: 'tabela', caminho: 'cargas.quadros', rotuloAdicionar: 'Adicionar quadro', novaLinha: { id: 'Q{n}', descricao: '', demanda_kw: null, fp: 0.92 },
      colunas: [{ campo: 'id', rotulo: 'Quadro', largura: 80 }, { campo: 'descricao', rotulo: 'Descrição' }, { campo: 'demanda_kw', rotulo: 'Demanda (kW)', tipo: 'numero', largura: 110 }, { campo: 'fp', rotulo: 'FP', tipo: 'numero', largura: 80 }] },
  ] },
  { titulo: '4. Transformador', itens: [
    { tipo: 'nota', texto: 'Deixe a potência vazia para escolher pela demanda. Informe a impedância da placa/folha de dados quando houver.' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'transformador.potencia_kva', rotulo: 'Potência (kVA) — opcional', tipo: 'numero' },
      { caminho: 'transformador.z_pct', rotulo: 'Impedância Z (%)', tipo: 'numero' },
      { caminho: 'transformador.isolamento', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.isolTrafo },
      { caminho: 'transformador.ligacao', rotulo: 'Ligação', dica: 'Dyn1 (padrão)' },
    ] },
  ] },
  { titulo: '5. Cabos de MT e de BT', itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'cabo_mt.comprimento_m', rotulo: 'Ramal de MT: ponto de entrega → SE (m)', tipo: 'numero' },
      { caminho: 'cabo_mt.metodo', rotulo: 'Método de instalação (MT)', tipo: 'selecao', opcoes: OP.metodoMt },
      { caminho: 'cabo_mt.isolacao', rotulo: 'Isolação (MT)', tipo: 'selecao', opcoes: OP.isolCabo },
      { caminho: 'cabo_mt.secao_minima_mm2', rotulo: 'Seção mínima exigida (mm²)', tipo: 'numero', dica: 'NBR 14039: 10 mm²; distribuidora costuma exigir 35 mm² [CONFERIR]' },
      { caminho: 'cabo_mt.fator_correcao', rotulo: 'Fator de correção (temperatura/agrupamento)', tipo: 'numero' },
      { caminho: 'cabo_mt.secao_mm2', rotulo: 'Seção adotada (mm²) — opcional', tipo: 'numero' },
      { caminho: 'bt.comprimento_m', rotulo: 'Cabos trafo → QGBT (m)', tipo: 'numero' },
      { caminho: 'bt.metodo', rotulo: 'Método (BT)', tipo: 'selecao', opcoes: OP.metodoBt },
      { caminho: 'bt.temperatura', rotulo: 'Temperatura ambiente BT (°C)', tipo: 'numero' },
      { caminho: 'bt.queda_max_pct', rotulo: 'Queda máx. trafo → QGBT (%)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '6. Proteção (ajustes indicativos do relé)', itens: [
    { tipo: 'nota', texto: 'Só para proteção por disjuntor. Os ajustes definitivos vêm do estudo de proteção aprovado pela distribuidora.' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'protecao.curva', rotulo: 'Curva (51)', tipo: 'selecao', opcoes: OP.curva },
      { caminho: 'protecao.dial', rotulo: 'Dial / TMS', tipo: 'numero' },
      { caminho: 'protecao.fator_partida_fase', rotulo: 'Partida 51 (× In primária)', tipo: 'numero' },
      { caminho: 'protecao.fator_partida_neutro', rotulo: 'Partida 51N (× ajuste de fase)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '7. Solo e malha de aterramento', itens: [
    { tipo: 'nota', texto: 'Resistividade pelo método de Wenner (NBR 7117-1). Estratificação simples: camada superior (ρ1 até h1) e inferior (ρ2). Deixe ρ2 vazio para solo uniforme.' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'aterramento.rho1_ohm_m', rotulo: 'ρ1 — camada superior (Ω·m)', tipo: 'numero' },
      { caminho: 'aterramento.h1_m', rotulo: 'h1 — espessura da camada superior (m)', tipo: 'numero' },
      { caminho: 'aterramento.rho2_ohm_m', rotulo: 'ρ2 — camada inferior (Ω·m)', tipo: 'numero' },
      { caminho: 'aterramento.resistencia_max_ohm', rotulo: 'Resistência máxima (Ω)', tipo: 'numero' },
      { caminho: 'aterramento.comprimento_m', rotulo: 'Área da malha — comprimento (m)', tipo: 'numero' },
      { caminho: 'aterramento.largura_m', rotulo: 'Área da malha — largura (m)', tipo: 'numero' },
      { caminho: 'aterramento.espacamento_m', rotulo: 'Espaçamento entre condutores (m)', tipo: 'numero' },
      { caminho: 'aterramento.profundidade_m', rotulo: 'Profundidade da malha (m)', tipo: 'numero' },
      { caminho: 'aterramento.n_hastes', rotulo: 'Nº de hastes (vazio = automático)', tipo: 'numero' },
      { caminho: 'aterramento.comprimento_haste_m', rotulo: 'Comprimento da haste (m)', tipo: 'numero' },
      { caminho: 'aterramento.rho_brita_ohm_m', rotulo: 'Resistividade da brita (Ω·m)', tipo: 'numero', dica: 'Em branco = sem brita (Cs = 1). Informada, entra no toque/passo e na lista de materiais' },
      { caminho: 'aterramento.espessura_brita_m', rotulo: 'Espessura da brita (m)', tipo: 'numero' },
      { caminho: 'aterramento.fator_divisao', rotulo: 'Fator de divisão da corrente (Sf)', tipo: 'numero', dica: '1 = conservador; menor só com dado da distribuidora [CONFERIR]' },
      { caminho: 'aterramento.tempo_defeito_s', rotulo: 'Tempo de defeito (s) — vazio = eliminação', tipo: 'numero' },
      { caminho: 'aterramento.peso_kg', rotulo: 'Critério de peso corporal', tipo: 'selecao', opcoes: OP.peso },
      { caminho: 'aterramento.conexao', rotulo: 'Conexões da malha', tipo: 'selecao', opcoes: OP.conexao },
    ] },
  ] },
  F.secaoInspecao(8, OP.tipoInsp),
  F.secaoChecklist(9, CHECKLIST.length),
  { titulo: '10. Ensaios e medições', itens: [
    { tipo: 'tabela', caminho: 'inspecao.isolamento', rotuloAdicionar: 'Adicionar ensaio de isolamento', novaLinha: { equipamento: '', ensaio: '', tensao_ensaio_v: 5000, valor_mohm: null, minimo_mohm: null },
      colunas: [{ campo: 'equipamento', rotulo: 'Equipamento' }, { campo: 'ensaio', rotulo: 'Ensaio (ex.: AT – massa)' }, { campo: 'tensao_ensaio_v', rotulo: 'Tensão (V)', tipo: 'numero', largura: 100 }, { campo: 'valor_mohm', rotulo: 'Medido (MΩ)', tipo: 'numero', largura: 110 }, { campo: 'minimo_mohm', rotulo: 'Mínimo (MΩ)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'inspecao.oleo', rotuloAdicionar: 'Adicionar análise de óleo', novaLinha: { equipamento: '', rigidez_kv: null, agua_ppm: null },
      colunas: [{ campo: 'equipamento', rotulo: 'Equipamento' }, { campo: 'rigidez_kv', rotulo: 'Rigidez (kV)', tipo: 'numero', largura: 110 }, { campo: 'agua_ppm', rotulo: 'Água (ppm)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'inspecao.termografia', rotuloAdicionar: 'Adicionar ponto de termografia', novaLinha: { ponto: '', temperatura_c: null, referencia_c: null, foto: '' },
      colunas: [{ campo: 'ponto', rotulo: 'Ponto' }, { campo: 'temperatura_c', rotulo: 'Temp. (°C)', tipo: 'numero', largura: 100 }, { campo: 'referencia_c', rotulo: 'Referência (°C)', tipo: 'numero', largura: 110 }, { campo: 'foto', rotulo: 'Foto', largura: 80 }] },
    { tipo: 'tabela', caminho: 'inspecao.rele', rotuloAdicionar: 'Adicionar teste do relé', novaLinha: { funcao: '51 fase', corrente_a: null, tempo_esperado_s: null, tempo_medido_s: null },
      colunas: [{ campo: 'funcao', rotulo: 'Função' }, { campo: 'corrente_a', rotulo: 'Corrente (A prim.)', tipo: 'numero', largura: 120 }, { campo: 'tempo_esperado_s', rotulo: 'Esperado (s) — vazio = curva', tipo: 'numero', largura: 140 }, { campo: 'tempo_medido_s', rotulo: 'Medido (s)', tipo: 'numero', largura: 100 }] },
    { tipo: 'tabela', caminho: 'inspecao.malha', rotuloAdicionar: 'Adicionar medição da malha', novaLinha: { ponto: '', metodo: 'queda de potencial (62 %)', valor_ohm: null },
      colunas: [{ campo: 'ponto', rotulo: 'Ponto' }, { campo: 'metodo', rotulo: 'Método' }, { campo: 'valor_ohm', rotulo: 'Medido (Ω)', tipo: 'numero', largura: 110 }] },
  ] },
  F.secaoNcs(11, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(12),
];

module.exports = criarDisciplina({
  chave: 'media_tensao',
  nome: 'Média tensão — subestação (NBR 14039)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Execução da subestação', descricao: 'Transformador, proteção, cabos de MT, malha, QGBT e medição (com preço do catálogo) e mão de obra de montagem, projeto e aprovação' },
    { modo: 'inspecao', rotulo: 'Manutenção preventiva e laudo', descricao: 'Manutenção preventiva, termografia, ensaios, laudo da SE e correção das não conformidades' },
  ],
  montarOrcamento,
});
