// Instalações elétricas de estabelecimentos assistenciais de saúde (EAS) —
// ABNT NBR 13534:2008 (requisitos específicos; base IEC 60364-7-710:2002, cuja
// numeração "710.x" é citada abaixo — [CONFERIR] a numeração no texto da NBR),
// RDC 50/2002 da Anvisa (tipos de ambiente) e ABNT NBR 5410 para o restante.
//
// O dimensionamento de cada circuito (seção, disjuntor, queda de tensão) é o
// MESMO motor da skill de elétrica predial (skills/eletrica), por require.
//
// Calcula: grupo e classe de cada local; tomadas por leito/posto; circuitos
// separando IT médico × TN-S com DR; transformador de separação, DSI e painel
// de alarme por sistema IT; quadros (QDIT e QD setorial) e alimentadores;
// equipotencialização suplementar (BEL); fonte de segurança por classe
// (UPS e grupo gerador); não conformidades de projeto.

const E = require('../../../_comum/eletrico/calculo');
const T = require('../../../_comum/eletrico/tabelas');
const { ucDps } = require('../../../_comum/dps');
const TIPOS = require('../../dados/tipos_ambiente_rdc50.json').tipos;

const FOLGA = 1.1; // +10 % de cabo
const arred = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;
const n0 = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? 0 : Number(v));
const vazio = (v) => v == null || v === '';
const norm = (s) => String(s || '').trim();

// ── Constantes normativas e premissas ─────────────────────────────────────

// Transformador do IT médico: monofásico, 0,5 a 10 kVA, secundário ≤ 250 V,
// fuga ≤ 0,5 mA (IEC 61558-2-15; 710.512.1). Potências comerciais [CONFERIR fabricante].
const IT = { minKva: 0.5, maxKva: 10, vSecMax: 250, fugaMaxMa: 0.5, comerciais: [3.15, 4, 5, 6.3, 8, 10] };
// DSI (IEC 61557-8; 710.413.1.5): alarme ≥ 50 kΩ, impedância ≥ 100 kΩ, ≤ 25 V CC, ≤ 1 mA
const DSI = { alarmeMinKohm: 50, impedanciaMinKohm: 100, tensaoMaxV: 25, correnteMaxMa: 1 };
// Classes da fonte de segurança (710.556.5.1)
const CLASSES = {
  '0.15': { ordem: 1, limite: 0.15, rotulo: 'Classe 0,15 (≤ 0,15 s)', curto: '≤ 0,15 s' },
  '0.5': { ordem: 2, limite: 0.5, rotulo: 'Classe 0,5 (≤ 0,5 s)', curto: '≤ 0,5 s' },
  15: { ordem: 3, limite: 15, rotulo: 'Classe 15 (≤ 15 s)', curto: '≤ 15 s' },
  '>15': { ordem: 4, limite: null, rotulo: 'Classe > 15 s', curto: '> 15 s' },
  '': { ordem: 9, limite: null, rotulo: 'Normal (sem fonte de segurança)', curto: 'normal' },
};
const ordemClasse = (k) => (CLASSES[k] || CLASSES['']).ordem;
const maisRestritiva = (...ks) => ks.filter(k => k != null).reduce((m, k) => (ordemClasse(k) < ordemClasse(m) ? k : m), '');
// Autonomias mínimas (710.556.5.2.2.1 e .2.2): 3 h para ≤ 0,5 s; 24 h para ≤ 15 s (redutível a 3 h — [CONFERIR])
const AUTONOMIA = { ate05_h: 3, ate15_h: 24, ate15_reduzida_h: 3 };
// Equipotencialização suplementar (710.413.1.6): ≤ 0,2 Ω entre PE/partes condutivas e o BEL (grupo 2)
const BEL = { limiteOhm: 0.2, rConexoesOhm: 0.02, rho: 0.0225, secaoMin: 4, secaoMinQuadro: 6 };
// Potências comerciais típicas [CONFERIR com fabricantes]
const UPS_KVA = [1, 2, 3, 6, 10, 15, 20, 30, 40, 60, 80, 100, 120, 160, 200, 250, 300, 400, 500];
const GERADOR_KVA = [20, 30, 40, 55, 75, 81, 100, 115, 150, 180, 200, 230, 260, 300, 360, 400, 450, 500, 550, 650, 750, 1000, 1250];
// Premissas de dimensionamento das fontes [CONFERIR]
const FONTE = { carregamentoUps: 0.8, fpUps: 0.9, rendimentoUps: 0.9, fatorEntradaUps: 1.3, carregamentoGerador: 0.8, consumoDieselLkWh: 0.27 };
// Proteção do primário do transformador IT: corrente de magnetização (inrush) → ×1,25 e curva D [CONFERIR]
const FATOR_PRIMARIO_IT = 1.25;

// ── Configuração ──────────────────────────────────────────────────────────

function config(dados) {
  const bruto = dados.instalacao || {};
  const i = Object.fromEntries(Object.entries(bruto).filter(([, v]) => !vazio(v)));
  const c = E.config({ instalacao: { isolacao: 'EPR', metodo: 'B1', agrupamento: 3, comprimento_medio_circuito_m: 15, ...i } });
  return {
    ...c,
    vIt: Number(i.tensao_it_v) || 220,
    ligacaoTn: i.ligacao_tomadas_tn || (c.vfn >= 200 ? 'FN' : 'FF'),
    vaTomadaIt: Number(i.va_tomada_it) || 150,
    vaTomadaTn: Number(i.va_tomada_tn) || 100,
    fatorIt: Number(i.fator_simultaneidade_it) || 0.7,
    limiteItA: Number(i.limite_circuito_it_a) || 10,
    limiteTnA: Number(i.limite_circuito_tn_a) || 16,
    limiteIlumA: Number(i.limite_circuito_iluminacao_a) || 10,
    maxTomadas: Number(i.max_tomadas_circuito) || 8,
    fdQuadro: Number(i.fator_demanda_quadros) || 0.8,
    vaLuminaria: Number(i.va_luminaria) || 40,
    comprimentoPrimarioIt: Number(i.comprimento_primario_it_m) || 10,
    fpEquip: Number(i.fp_equipamentos) || 0.9,
    // disjuntor mínimo prático (tomada 20 A NBR 14136 / iluminação), respeitando In ≤ Iz [CONFERIR]
    disjMinTomadas: Number(i.disjuntor_min_tomadas_a) || 16,
    disjMinIluminacao: Number(i.disjuntor_min_iluminacao_a) || 10,
  };
}

// Sobe o disjuntor até o mínimo prático se a capacidade do cabo permitir (Ib ≤ In ≤ Iz, 5.3.4)
function disjuntorMinimo(d, inMin) {
  if (!inMin || d.disjuntor >= inMin) return d;
  const cand = T.DISJUNTORES.find(x => x >= inMin && x <= d.iz);
  return cand ? { ...d, disjuntor: cand, criterio: `${d.criterio} · disjuntor mínimo ${inMin} A` } : d;
}

// Corrente de projeto que leva o motor a escolher o disjuntor `inAlvo` no alimentador
function potenciaParaCorrente(ib, ligacao, c) {
  if (ligacao === 'FFF') return ib * Math.sqrt(3) * c.vff;
  return ib * (ligacao === 'FN' ? c.vfn : c.vff);
}

function configFonte(dados) {
  const f = dados.fonte_seguranca || {};
  const opc = (v, padrao) => (['prever', 'existente', 'nao'].includes(v) ? v : padrao);
  const gerador = opc(f.gerador, 'prever');
  const ups = opc(f.ups, 'prever');
  return {
    gerador, ups,
    geradorKva: n0(f.gerador_kva) || null,
    geradorAutonomiaH: n0(f.gerador_autonomia_h) || 24,
    tempoTransferenciaS: n0(f.tempo_transferencia_s) || 10,
    upsKva: n0(f.ups_kva) || null,
    upsAutonomiaMin: n0(f.ups_autonomia_min) || (gerador === 'nao' ? 180 : 15),
    vBancoV: n0(f.tensao_banco_v) || 192,
    outrasKva: n0(f.outras_cargas_essenciais_kva),
  };
}

// ── Classificação dos locais (710.3 e Anexo de exemplos; RDC 50) ──────────

function tipoAmbiente(id) {
  return TIPOS.find(t => t.id === id) || null;
}

function classificar(a) {
  const tipo = tipoAmbiente(a.tipo);
  const t = tipo || TIPOS.find(x => x.id === 'apoio');
  const grupo = !vazio(a.grupo) && [0, 1, 2].includes(Number(a.grupo)) ? Number(a.grupo) : t.grupo;
  let classe = !vazio(a.classe) && CLASSES[String(a.classe)] ? String(a.classe) : t.classe;
  if (grupo >= 1 && ordemClasse(classe) > ordemClasse('15')) classe = '15'; // grupos 1 e 2: ao menos ≤ 15 s (710.556.5.2.2.2)
  return { tipo: t, tipoDesconhecido: !tipo, grupo, classe, grupoSugerido: t.grupo, classeSugerida: t.classe, editado: grupo !== t.grupo || classe !== t.classe };
}

// ── Equipamentos médicos ───────────────────────────────────────────────────

function normalizarEquip(e, grupo, c) {
  const quantidade = Math.max(1, Math.round(n0(e.quantidade) || 1));
  const fp = Number(e.fp) || c.fpEquip;
  const vaUnit = n0(e.potencia_w) / fp;
  const suporteVida = e.suporte_vida === true || e.suporte_vida === 'true';
  let sistema = e.sistema === 'IT' || e.sistema === 'TN' ? e.sistema : null;
  let motivoTn = '';
  if (!sistema) {
    if (grupo === 2 && vaUnit > 5000) { sistema = 'TN'; motivoTn = 'equipamento > 5 kVA (710.413.1.3)'; } else sistema = grupo === 2 ? 'IT' : 'TN';
  } else if (sistema === 'TN' && grupo === 2) motivoTn = 'definido no projeto (mesa cirúrgica, raios X, > 5 kVA ou não crítico — 710.413.1.3)';
  const classe = !vazio(e.classe) && CLASSES[String(e.classe)] ? String(e.classe) : (suporteVida ? '0.15' : grupo >= 1 ? '15' : '');
  const exclusivo = e.circuito_exclusivo === true || e.circuito_exclusivo === 'true' || vaUnit > 2000;
  return {
    descricao: norm(e.descricao) || 'Equipamento', quantidade, potencia_w: n0(e.potencia_w), fp, vaUnit, va: vaUnit * quantidade,
    suporteVida, sistema, motivoTn, classe, exclusivo, ligacao: e.ligacao || null, drTipo: e.dr_tipo === 'B' ? 'B' : 'A',
  };
}

// ── Utilidades de circuitos ────────────────────────────────────────────────

function dividir(total, n) {
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, k) => base + (k < total - base * n ? 1 : 0));
}

function agrupar(itens, limiteVa) {
  const grupos = [];
  let atual = null;
  for (const it of itens) {
    if (!atual || atual.va + it.va > limiteVa) { atual = { va: 0, ambientes: [] }; grupos.push(atual); }
    atual.va += it.va;
    atual.ambientes.push(it.nome);
  }
  return grupos;
}

const vTn = (lig, c) => (lig === 'FN' ? c.vfn : c.vff);

// ── Cálculo principal ──────────────────────────────────────────────────────

function calcular(dados) {
  const c = config(dados);
  const fonte = configFonte(dados);
  const cIt = { ...c, vfn: c.vIt, vff: c.vIt };
  const avisos = [];
  const ncs = []; // não conformidades de projeto/instalação: { cod, local, texto }
  const nc = (cod, local, texto) => ncs.push({ cod, local, texto });

  const brutos = (dados.ambientes || []).filter(a => norm(a.nome));
  if (!brutos.length) throw new Error('Informe ao menos um ambiente (nome e tipo da RDC 50).');
  const nomes = new Set();
  for (const a of brutos) {
    if (nomes.has(norm(a.nome))) throw new Error(`Ambiente repetido: "${norm(a.nome)}" — use nomes diferentes.`);
    nomes.add(norm(a.nome));
  }
  const equipGerais = (dados.equipamentos || []).filter(e => norm(e.descricao) || n0(e.potencia_w) > 0);
  const semAmb = equipGerais.filter(e => !nomes.has(norm(e.ambiente)));
  if (semAmb.length) throw new Error(`Equipamento sem ambiente correspondente: ${semAmb.map(e => e.descricao || '?').join(', ')} — confira o nome do ambiente.`);

  // Quadros por setor
  const quadrosInf = (dados.quadros || []).filter(q => norm(q.id) || norm(q.nome));
  const quadros = quadrosInf.map((q, i) => ({ id: norm(q.id) || `QD${i + 1}`, nome: norm(q.nome) || norm(q.id), setor: norm(q.setor), comprimento: n0(q.comprimento_alimentador_m) || c.comprimentoAlimentador, circuitos: [], primarios: [] }));
  const quadroDe = (id) => {
    const chave = norm(id) || (quadros[0] ? quadros[0].id : 'QD1');
    let q = quadros.find(x => x.id === chave || x.nome === chave);
    if (!q) {
      q = { id: chave, nome: chave, setor: '', comprimento: c.comprimentoAlimentador, circuitos: [], primarios: [] };
      quadros.push(q);
      if (quadrosInf.length) avisos.push(`Quadro "${chave}" não cadastrado em "Quadros por setor" — criado com alimentador de ${c.comprimentoAlimentador} m. [CONFERIR]`);
    }
    return q;
  };

  // Situação existente (laudo de instalação existente)
  const existente = new Map((dados.existente || []).filter(x => norm(x.ambiente)).map(x => [norm(x.ambiente), x]));

  // 1) Classificação, tomadas, cargas e iluminação por ambiente
  const ambientes = brutos.map(a => {
    const nome = norm(a.nome);
    const cl = classificar(a);
    const g = cl.grupo;
    const t = cl.tipo;
    if (cl.tipoDesconhecido) avisos.push(`${nome}: tipo de ambiente "${a.tipo || ''}" fora da tabela RDC 50 — classificado como grupo ${g}. [CONFERIR]`);
    const postos = Math.max(1, Math.round(n0(a.leitos) || 1));
    const equip = [...(a.equipamentos || []), ...equipGerais.filter(e => norm(e.ambiente) === nome)]
      .filter(e => n0(e.potencia_w) > 0).map(e => normalizarEquip(e, g, c));
    const extrasIt = Math.max(0, Math.round(n0(a.tomadas_it_extras)));
    const extrasTn = Math.max(0, Math.round(n0(a.tomadas_tn_extras)));
    const temIt = g === 2 || extrasIt > 0 || equip.some(e => e.sistema === 'IT');
    // Tomadas mínimas por posto (premissa H&M [CONFERIR]); no grupo 2 o ambiente do paciente vai para o IT
    let porPostoIt = 0;
    let porPostoTn = t.tomadas_tn + t.tomadas_it;
    if (g === 2) { porPostoIt = t.tomadas_it || t.tomadas_tn; porPostoTn = t.tomadas_it ? t.tomadas_tn : 2; }
    let tomadasIt = temIt ? porPostoIt * postos + extrasIt : 0;
    let tomadasTn = porPostoTn * postos + extrasTn;
    const plugIt = equip.filter(e => e.sistema === 'IT' && !e.exclusivo).reduce((s, e) => s + e.quantidade, 0);
    const plugTn = equip.filter(e => e.sistema === 'TN' && !e.exclusivo).reduce((s, e) => s + e.quantidade, 0);
    if (plugIt > tomadasIt) { avisos.push(`${nome}: ${plugIt} equipamentos ligados no IT para ${tomadasIt} tomadas — tomadas do IT aumentadas para ${plugIt}.`); tomadasIt = plugIt; }
    if (plugTn > tomadasTn) { avisos.push(`${nome}: ${plugTn} equipamentos em tomadas TN para ${tomadasTn} tomadas — aumentadas para ${plugTn}.`); tomadasTn = plugTn; }
    // Cargas
    const vaEquip = (sis, excl) => equip.filter(e => e.sistema === sis && e.exclusivo === excl).reduce((s, e) => s + e.va, 0);
    const vaItTomadas = vaEquip('IT', false) + Math.max(0, tomadasIt - plugIt) * c.vaTomadaIt;
    const vaItExclusivo = vaEquip('IT', true);
    const vaTnTomadas = vaEquip('TN', false) + Math.max(0, tomadasTn - plugTn) * c.vaTomadaTn;
    // Iluminação: informada (luminotécnico) ou densidade típica × área [CONFERIR]
    const area = n0(a.area_m2);
    const iluminacaoVa = !vazio(a.iluminacao_va) ? n0(a.iluminacao_va) : area * t.ilum_w_m2;
    if (vazio(a.iluminacao_va) && area > 0) avisos.push(`${nome}: iluminação estimada em ${t.ilum_w_m2} W/m² (${Math.round(iluminacaoVa)} VA) — substituir pelo projeto luminotécnico. [CONFERIR]`);
    if (!area && vazio(a.iluminacao_va)) avisos.push(`${nome}: sem área nem iluminação informada — circuito de iluminação não previsto. [CONFERIR]`);
    // Iluminação de segurança (710.560.9): grupo 2 ≥ 50 %; grupo 1 ≥ 1 luminária; serviços essenciais/rotas ≥ 1 luminária
    const pctSeg = g === 2 ? 0.5 : g === 1 ? 0.25 : (cl.classe === '15' ? 0.5 : 0);
    let segVa = iluminacaoVa * pctSeg;
    if (pctSeg > 0 && iluminacaoVa > 0) segVa = Math.min(iluminacaoVa, Math.max(segVa, c.vaLuminaria));
    const luminarias = iluminacaoVa > 0 ? Math.max(1, Math.ceil(iluminacaoVa / c.vaLuminaria)) : 0;
    const luminariasSeguranca = segVa > 0 ? Math.min(luminarias, Math.max(1, Math.ceil(segVa / c.vaLuminaria))) : 0;
    const ex = existente.get(nome) || {};
    return {
      nome, tipo: t.id, tipoRotulo: t.rotulo, unidadeRdc: t.unidade, grupo: g, classe: cl.classe, grupoSugerido: cl.grupoSugerido, classeSugerida: cl.classeSugerida, editado: cl.editado,
      area_m2: area, postos, posto: t.posto, painelNoLocal: !!t.painel_no_local, comprimento: n0(a.comprimento_m) || c.comprimentoPadrao,
      quadro: quadroDe(a.quadro).id, chaveIt: norm(a.sistema_it) || nome, localPainel: norm(a.local_painel_alarme),
      equipamentos: equip, temIt, tomadasIt, tomadasTn, tomadasMinPorPosto: { it: porPostoIt, tn: porPostoTn }, plugIt, plugTn,
      vaItTomadas, vaItExclusivo, vaTnTomadas, iluminacaoVa, iluminacaoSegurancaVa: segVa, iluminacaoNormalVa: iluminacaoVa - segVa, luminarias, luminariasSeguranca,
      sistemaIt: null, bel: g >= 1, existente: ex, circuitos: { it: [], tn: [], iluminacao: [], seguranca: [], exclusivos: [] }, alertas: [],
    };
  });

  // 2) Sistemas IT médicos (um por grupo de salas com a mesma função — 710.413.1.5)
  const sistemas = [];
  for (const a of ambientes.filter(x => x.temIt)) {
    let s = sistemas.find(x => x.chave === a.chaveIt);
    if (!s) { s = { chave: a.chaveIt, id: `IT${sistemas.length + 1}`, ambientes: [], quadro: a.quadro }; sistemas.push(s); }
    s.ambientes.push(a);
    a.sistemaIt = s.id;
  }
  const circuitosIt = [];
  for (const s of sistemas) {
    s.qdit = `QDIT-${s.id.slice(2)}`;
    let n = 0;
    s.circuitos = [];
    for (const a of s.ambientes) {
      // tomadas: ≥ 2 circuitos por posto (710.53), limite de corrente e de tomadas por circuito
      if (a.tomadasIt > 0) {
        const nC = Math.max(2, Math.ceil(a.vaItTomadas / (c.limiteItA * c.vIt)), Math.ceil(a.tomadasIt / c.maxTomadas));
        const tom = dividir(a.tomadasIt, nC);
        for (let k = 0; k < nC; k++) {
          s.circuitos.push({ id: `${s.id}.${++n}`, tipo: 'tug', sistema: 'IT', ambiente: a.nome, descricao: `Tomadas IT ${k + 1}/${nC} — ${a.nome}`, ligacao: 'FF', potencia_va: a.vaItTomadas / nC, tomadas: tom[k], comprimento_m: a.comprimento });
        }
      }
      for (const e of a.equipamentos.filter(x => x.sistema === 'IT' && x.exclusivo)) {
        s.circuitos.push({ id: `${s.id}.${++n}`, tipo: 'tue', sistema: 'IT', ambiente: a.nome, descricao: `${e.descricao}${e.quantidade > 1 ? ` (${e.quantidade} un)` : ''} — ${a.nome}`, ligacao: 'FF', potencia_va: e.va, tomadas: 0, comprimento_m: a.comprimento, equipamento: e.descricao });
      }
    }
    const equips = s.ambientes.flatMap(a => a.equipamentos.filter(e => e.sistema === 'IT'));
    s.classe = maisRestritiva('15', ...s.ambientes.map(a => (ordemClasse(a.classe) <= ordemClasse('0.5') ? a.classe : '15')), ...equips.map(e => e.classe));
    s.vaInstalada = s.ambientes.reduce((t, a) => t + a.vaItTomadas + a.vaItExclusivo, 0);
    s.fator = c.fatorIt;
    s.vaDemanda = s.vaInstalada * c.fatorIt;
    const maiorEquip = Math.max(0, ...equips.map(e => e.va));
    const kvaNec = Math.max(s.vaDemanda, maiorEquip) / 1000;
    s.unidades = Math.max(1, Math.ceil(kvaNec / IT.maxKva));
    // cada transformador tem de comportar sozinho o maior equipamento ligado a ele
    s.kvaPorUnidade = IT.comerciais.find(k => k >= Math.max(kvaNec / s.unidades, Math.max(0, ...equips.map(e => e.vaUnit)) / 1000)) || IT.maxKva;
    // um equipamento só acima de 10 kVA não cabe em nenhum transformador do IT médico — dividir
    // a carga em vários sistemas não resolve (NBR 13534, 6.1.3.1.101 b): 0,5 a 10 kVA)
    for (const e of equips.filter(x => x.vaUnit > IT.maxKva * 1000)) {
      nc('IT2', s.id, `${e.descricao} (${arred(e.vaUnit / 1000, 1)} kVA por unidade) acima de ${IT.maxKva} kVA: não pode ser alimentado pelo transformador do IT médico (0,5 a 10 kVA, monofásico — NBR 13534, 6.1.3.1.101 b); alimentar em TN-S com DR 30 mA tipo A/B (equipamento > 5 kVA, 5.1.2.2.4.2 c) ou rever a potência com o fabricante.`);
    }
    s.kvaNecessario = kvaNec;
    s.kvaTotal = s.kvaPorUnidade * s.unidades;
    s.carregamento = kvaNec / s.kvaTotal;
    s.iSecundario = s.kvaPorUnidade * 1000 / c.vIt;
    s.disjSecundario = T.DISJUNTORES.find(d => d >= s.iSecundario * FATOR_PRIMARIO_IT);
    s.localPainel = s.ambientes.find(a => a.localPainel)?.localPainel
      || (s.ambientes.every(a => a.painelNoLocal) ? s.ambientes.map(a => a.nome).join(', ') : 'Posto de enfermagem do setor [CONFERIR]');
    if (s.unidades > 1) avisos.push(`${s.id} (${s.ambientes.map(a => a.nome).join(', ')}): carga de ${arred(kvaNec, 2)} kVA acima de ${IT.maxKva} kVA por transformador (710.512.1) — dividido em ${s.unidades} sistemas IT de ${String(s.kvaPorUnidade).replace('.', ',')} kVA, cada um com DSI e painel de alarme. Distribuir as tomadas de cada leito entre os sistemas. [CONFERIR]`);
    if (c.vIt > IT.vSecMax) nc('IT2', s.id, `Tensão do secundário do IT médico ${c.vIt} V > ${IT.vSecMax} V (710.512.1).`);
    // dimensionamento dos circuitos IT pelo motor da NBR 5410 (2 condutores vivos, disjuntor bipolar)
    s.circuitos = s.circuitos.map(ci => {
      const d = disjuntorMinimo(E.dimensionarCircuito(ci, cIt, { minimo: T.SECAO_MINIMA.tug, limiteQueda: c.quedaTerminal }), ci.tipo === 'tug' ? c.disjMinTomadas : 0);
      return { ...d, sistema: 'IT', classe: s.classe, dr: false, drObrigatorio: false, quadro: s.qdit, sistemaIt: s.id };
    });
    circuitosIt.push(...s.circuitos);
    for (const ci of s.circuitos) {
      const a = ambientes.find(x => x.nome === ci.ambiente);
      (ci.tipo === 'tue' ? a.circuitos.exclusivos : a.circuitos.it).push(ci.id);
    }
    // primário do transformador a partir do quadro setorial (proteção só contra curto — [CONFERIR])
    const q = quadroDe(s.quadro);
    const ligPrim = c.vfn >= 200 ? 'FN' : 'FF';
    s.primarios = [];
    for (let u = 0; u < s.unidades; u++) {
      const circ = { id: `${q.id}.P${s.id.slice(2)}${s.unidades > 1 ? String.fromCharCode(97 + u) : ''}`, tipo: 'tue', descricao: `Primário do transformador ${s.qdit}${s.unidades > 1 ? String.fromCharCode(97 + u) : ''} (${String(s.kvaPorUnidade).replace('.', ',')} kVA)`, ligacao: ligPrim, potencia_va: s.kvaPorUnidade * 1000 * FATOR_PRIMARIO_IT, comprimento_m: c.comprimentoPrimarioIt, agrupamento: 1 };
      const d = E.dimensionarCircuito(circ, c, { minimo: T.SECAO_MINIMA.tug, limiteQueda: c.quedaAlimentador + 1 });
      const prim = { ...d, potenciaNominalVa: s.kvaPorUnidade * 1000, sistema: 'TN', classe: s.classe, dr: false, drObrigatorio: false, quadro: q.id, primarioIt: s.id, curva: 'D' };
      s.primarios.push(prim);
      q.primarios.push(prim);
    }
    s.iPrimario = s.kvaPorUnidade * 1000 / vTn(ligPrim, c);
  }

  // 3) Circuitos TN-S por ambiente (DR 30 mA tipo A/B nos grupos 1 e 2 — 710.413.1.3)
  const contador = {};
  const proxId = (q) => `${q}.${String((contador[q] = (contador[q] || 0) + 1)).padStart(2, '0')}`;
  const circuitosTn = [];
  const addTn = (q, circ, a, lista) => {
    const minimo = circ.tipo === 'iluminacao' ? T.SECAO_MINIMA.iluminacao : T.SECAO_MINIMA.tug;
    const d0 = E.dimensionarCircuito({ ...circ, id: proxId(q) }, c, { minimo, limiteQueda: c.quedaTerminal });
    const d = disjuntorMinimo(d0, circ.tipo === 'iluminacao' ? c.disjMinIluminacao : circ.tipo === 'tug' ? c.disjMinTomadas : 0);
    const ci = { ...d, sistema: 'TN', quadro: q };
    circuitosTn.push(ci);
    quadroDe(q).circuitos.push(ci);
    for (const nomeA of circ.ambientes || [a.nome]) {
      const amb = ambientes.find(x => x.nome === nomeA);
      if (amb) amb.circuitos[lista].push(ci.id);
    }
    return ci;
  };
  const ligTn = c.ligacaoTn;
  for (const a of ambientes) {
    if (a.tomadasTn > 0) {
      const v = vTn(ligTn, c);
      const nC = Math.max(1, Math.ceil(a.vaTnTomadas / (c.limiteTnA * v)), Math.ceil(a.tomadasTn / c.maxTomadas));
      const tom = dividir(a.tomadasTn, nC);
      for (let k = 0; k < nC; k++) {
        addTn(a.quadro, { tipo: 'tug', descricao: `Tomadas ${a.grupo >= 1 ? 'TN-S com DR' : 'de uso geral'}${nC > 1 ? ` ${k + 1}/${nC}` : ''} — ${a.nome}`, ligacao: ligTn, potencia_va: a.vaTnTomadas / nC, tomadas: tom[k], comprimento_m: a.comprimento, ambientes: [a.nome],
          dr: true, drObrigatorio: a.grupo >= 1, drTipo: 'A', classe: a.grupo >= 1 ? '15' : (ordemClasse(a.classe) <= ordemClasse('>15') ? a.classe : '') }, a, 'tn');
      }
    }
    for (const e of a.equipamentos.filter(x => x.sistema === 'TN' && x.exclusivo)) {
      const lig = e.ligacao || (e.va > 4000 ? 'FF' : ligTn);
      addTn(a.quadro, { tipo: 'tue', descricao: `${e.descricao}${e.quantidade > 1 ? ` (${e.quantidade} un)` : ''} — ${a.nome}${e.motivoTn ? ' (fora do IT)' : ''}`, ligacao: lig, potencia_va: e.va, comprimento_m: a.comprimento, ambientes: [a.nome],
        dr: true, drObrigatorio: a.grupo >= 1, drTipo: e.drTipo, classe: e.classe, equipamento: e.descricao }, a, 'exclusivos');
      if (e.suporteVida && a.grupo === 2) nc('IT1', a.nome, `${e.descricao}: equipamento de suporte à vida em circuito TN fora do sistema IT médico (710.413.1.5).`);
    }
  }
  // Iluminação: grupo 2 com circuitos próprios (normal e segurança); demais agrupados por quadro
  const limIlum = c.limiteIlumA * c.vfn;
  for (const a of ambientes.filter(x => x.grupo === 2 && x.iluminacaoVa > 0)) {
    for (const [va, seg] of [[a.iluminacaoNormalVa, false], [a.iluminacaoSegurancaVa, true]]) {
      if (va <= 0) continue;
      const nC = Math.max(1, Math.ceil(va / limIlum));
      for (let k = 0; k < nC; k++) {
        addTn(a.quadro, { tipo: 'iluminacao', descricao: `Iluminação ${seg ? 'de segurança' : 'normal'}${nC > 1 ? ` ${k + 1}/${nC}` : ''} — ${a.nome}`, ligacao: 'FN', potencia_va: va / nC, comprimento_m: a.comprimento, ambientes: [a.nome], dr: false, drObrigatorio: false, classe: seg ? '15' : '', seguranca: seg }, a, seg ? 'seguranca' : 'iluminacao');
      }
    }
  }
  for (const q of [...new Set(ambientes.map(a => a.quadro))]) {
    const amb = ambientes.filter(a => a.quadro === q && a.grupo < 2);
    for (const [campo, seg] of [['iluminacaoNormalVa', false], ['iluminacaoSegurancaVa', true]]) {
      const itens = amb.filter(a => a[campo] > 0).map(a => ({ nome: a.nome, va: a[campo] }));
      agrupar(itens, limIlum).forEach((gr, k, todos) => {
        addTn(q, { tipo: 'iluminacao', descricao: `Iluminação ${seg ? 'de segurança' : 'normal'}${todos.length > 1 ? ` ${k + 1}` : ''} — ${gr.ambientes.join(', ')}`, ligacao: 'FN', potencia_va: gr.va,
          comprimento_m: Math.max(...gr.ambientes.map(n => ambientes.find(x => x.nome === n).comprimento)), ambientes: gr.ambientes, dr: false, drObrigatorio: false, classe: seg ? '15' : '', seguranca: seg }, amb[0], seg ? 'seguranca' : 'iluminacao');
      });
    }
  }

  // 4) Quadros setoriais: demanda e alimentador
  for (const q of quadros) {
    const vaTn = q.circuitos.reduce((s, x) => s + Number(x.potencia_va), 0);
    const vaIt = sistemas.filter(s => s.quadro === q.id).reduce((s, x) => s + Math.max(x.vaDemanda, 0), 0);
    q.instaladaVa = vaTn + sistemas.filter(s => s.quadro === q.id).reduce((s, x) => s + x.vaInstalada, 0);
    q.demandaVa = vaTn * c.fdQuadro + vaIt;
    q.fd = c.fdQuadro;
    q.alimentador = q.demandaVa > 0 ? alimentadorQuadro(q, c) : null;
    const todos = [...q.circuitos, ...q.primarios];
    q.nCircuitos = todos.length;
    q.reserva = T.reservaQuadro(todos.length);
    q.nDr = q.circuitos.filter(x => x.dr).length;
    const nFases = c.sistema === 'trifasico' ? 3 : c.sistema === 'bifasico' ? 2 : 1;
    q.dpsQtd = nFases + (c.esquema === 'TT' || c.esquema === 'TN-S' ? 1 : 0);
    const dps = ucDps({ vfn: c.vfn, vff: c.vff, esquema: c.esquema }); // NBR 5410, Tabela 49 — função comum
    q.dpsUc = dps.uc;
    q.dpsTexto = dps.texto;
    const modulos = todos.reduce((s, x) => s + x.polos, 0) + q.circuitos.filter(x => x.dr).reduce((s, x) => s + (x.ligacao === 'FFF' ? 4 : 2), 0) + q.reserva * 2 + (q.alimentador ? q.alimentador.polos : 0) + q.dpsQtd;
    q.modulos = Math.ceil(modulos / 6) * 6;
    q.essencial = todos.some(x => ordemClasse(x.classe) <= ordemClasse('15'));
  }

  // 5) Equipotencialização suplementar (710.413.1.6)
  for (const a of ambientes.filter(x => x.bel)) {
    const lado = Math.sqrt(a.area_m2 || 9);
    const lMax = 2 * lado + 3; // maior distância ponto → BEL [CONFERIR no projeto]
    const sCalc = BEL.rho * lMax / (BEL.limiteOhm - BEL.rConexoesOhm);
    const secao = T.SECOES.find(s => s >= Math.max(BEL.secaoMin, sCalc));
    const ligacoes = a.postos * 2 + 4 + (a.temIt ? 1 : 0); // por posto: painel de gases + estrutura/coluna; local: tubulações, forro/grade, esquadrias, foco/pendente; blindagem do trafo [CONFERIR]
    const q = quadros.find(x => x.id === a.quadro);
    const pePrincipal = q?.alimentador ? q.alimentador.secaoPE : 6;
    a.equipotencializacao = {
      lMax: arred(lMax, 1), secaoCalculada: arred(sCalc, 2), secao, ligacoes, comprimentoTotal: Math.ceil(ligacoes * (lado + 2)),
      resistenciaEstimada: arred(BEL.rho * lMax / secao + BEL.rConexoesOhm, 3), limite: BEL.limiteOhm,
      secaoQuadro: T.SECOES.find(s => s >= Math.max(BEL.secaoMinQuadro, pePrincipal / 2)), comprimentoQuadro: a.comprimento,
      exigeLimite: a.grupo === 2,
    };
  }

  // 6) Fonte de segurança por classe (710.556)
  const porClasse = { '0.15': 0, '0.5': 0, 15: 0, '>15': 0 };
  for (const s of sistemas) porClasse[s.classe] += s.vaDemanda;
  for (const ci of circuitosTn) if (porClasse[ci.classe] != null) porClasse[ci.classe] += Number(ci.potencia_va);
  const fs = { ...fonte, porClasse };
  fs.upsCargaVa = porClasse['0.15'] + porClasse['0.5'];
  fs.precisaUps = fs.upsCargaVa > 0;
  fs.upsMinKva = fs.upsCargaVa / 1000 / FONTE.carregamentoUps;
  fs.upsKvaSugerido = fs.precisaUps ? (UPS_KVA.find(k => k >= fs.upsMinKva) || Math.ceil(fs.upsMinKva)) : 0;
  fs.upsKvaAdotado = fonte.ups === 'existente' ? fonte.upsKva : fs.upsKvaSugerido;
  fs.upsAutonomiaReqMin = fonte.gerador === 'nao' ? AUTONOMIA.ate05_h * 60 : 15; // com gerador: ponte até o gerador [CONFERIR]
  fs.upsEnergiaKwh = fs.upsCargaVa * FONTE.fpUps / 1000 * (fonte.upsAutonomiaMin / 60) / FONTE.rendimentoUps;
  fs.upsBateriaAh = fs.upsEnergiaKwh * 1000 / fonte.vBancoV;
  fs.carga15Va = porClasse['15'] * c.fdQuadro + porClasse['>15'] * c.fdQuadro;
  fs.precisaGerador = porClasse['15'] + porClasse['>15'] > 0 || fs.precisaUps;
  fs.geradorCargaVa = fs.carga15Va + (fs.precisaUps ? fs.upsCargaVa * FONTE.fatorEntradaUps : 0) + fonte.outrasKva * 1000;
  fs.geradorMinKva = fs.geradorCargaVa / 1000 / FONTE.carregamentoGerador;
  fs.geradorKvaSugerido = fs.precisaGerador ? (GERADOR_KVA.find(k => k >= fs.geradorMinKva) || Math.ceil(fs.geradorMinKva)) : 0;
  fs.geradorKvaAdotado = fonte.gerador === 'existente' ? fonte.geradorKva : fs.geradorKvaSugerido;
  fs.consumoLh = fs.geradorCargaVa * 0.9 / 1000 * FONTE.consumoDieselLkWh;
  fs.tanqueL = Math.ceil(fs.consumoLh * fonte.geradorAutonomiaH);
  if (fs.precisaUps) {
    if (fonte.ups === 'nao') nc('F1', 'Fonte de segurança', `Há ${arred(fs.upsCargaVa / 1000, 2)} kVA de cargas classe ≤ 0,5 s (focos cirúrgicos, IT dos locais do grupo 2, suporte à vida) sem UPS — o gerador sozinho não comuta em 0,5 s (710.556.5.2.2.1).`);
    else if (fonte.ups === 'existente' && !(fonte.upsKva >= fs.upsMinKva)) nc('F1', 'Fonte de segurança', `UPS existente de ${fonte.upsKva || '?'} kVA abaixo do mínimo de ${arred(fs.upsMinKva, 1)} kVA (carga ${arred(fs.upsCargaVa / 1000, 2)} kVA com carregamento ${FONTE.carregamentoUps * 100} %).`);
    if (fonte.ups !== 'nao' && fonte.upsAutonomiaMin < fs.upsAutonomiaReqMin) nc('F1', 'Fonte de segurança', `Autonomia da UPS de ${fonte.upsAutonomiaMin} min abaixo de ${fs.upsAutonomiaReqMin} min${fonte.gerador === 'nao' ? ' (3 h sem gerador — 710.556.5.2.2.1)' : ' (ponte até o gerador assumir) [CONFERIR]'}.`);
  }
  if (fs.precisaGerador) {
    if (fonte.gerador === 'nao') nc('F3', 'Fonte de segurança', 'Locais dos grupos 1/2 com cargas classe ≤ 15 s sem grupo gerador (fonte de segurança ≥ 24 h — 710.556.5.2.2.2).');
    else {
      if (fonte.gerador === 'existente' && !(fonte.geradorKva >= fs.geradorMinKva)) nc('F3', 'Fonte de segurança', `Gerador existente de ${fonte.geradorKva || '?'} kVA abaixo do mínimo de ${arred(fs.geradorMinKva, 1)} kVA para as cargas de segurança. [CONFERIR com as demais cargas essenciais]`);
      if (fonte.tempoTransferenciaS > 15) nc('F3', 'Fonte de segurança', `Tempo de partida + transferência do gerador de ${fonte.tempoTransferenciaS} s acima de 15 s (710.556.5.2.2.2).`);
      if (fonte.geradorAutonomiaH < AUTONOMIA.ate15_reduzida_h) nc('F3', 'Fonte de segurança', `Autonomia do gerador de ${fonte.geradorAutonomiaH} h abaixo de 3 h.`);
      else if (fonte.geradorAutonomiaH < AUTONOMIA.ate15_h) avisos.push(`Autonomia do gerador de ${fonte.geradorAutonomiaH} h: a NBR 13534 pede 24 h, redutível a 3 h só se os procedimentos puderem ser encerrados e o prédio evacuado (710.556.5.2.2.2). [CONFERIR]`);
    }
  }

  // 7) Não conformidades da situação existente e de classificação
  for (const a of ambientes) {
    const ex = a.existente;
    if (a.grupo === 2 && (ex.sem_it === true || ex.sem_it === 'true')) nc('IT1', a.nome, 'Local do grupo 2 sem sistema IT médico (710.413.1.5).');
    if (a.temIt && (ex.dr_no_it === true || ex.dr_no_it === 'true')) nc('P3', a.nome, 'Dispositivo DR instalado em circuito do sistema IT médico — remover (o IT não deve desligar na 1ª falta). [CONFERIR]');
    if (a.temIt && (ex.tomadas_sem_identificacao === true || ex.tomadas_sem_identificacao === 'true')) nc('T2', a.nome, 'Tomadas do IT médico sem identificação clara e permanente (710.53).');
    if (a.bel && (ex.sem_bel === true || ex.sem_bel === 'true')) nc('E1', a.nome, 'Local do grupo 1/2 sem barramento de equipotencialização suplementar (710.413.1.6).');
    if (a.grupo < 2 && a.equipamentos.some(e => e.suporteVida)) {
      const t = `Equipamento de suporte à vida em local do grupo ${a.grupo} — reavaliar a classificação com a equipe médica (grupo 2 quando a falta de energia ameaça a vida). [CONFERIR]`;
      a.alertas.push(t);
      avisos.push(`${a.nome}: ${t}`);
    }
    if (a.editado) avisos.push(`${a.nome}: classificação alterada no formulário (sugerido grupo ${a.grupoSugerido}${a.classeSugerida ? `, classe ${CLASSES[a.classeSugerida].curto}` : ''} → adotado grupo ${a.grupo}${a.classe ? `, classe ${CLASSES[a.classe].curto}` : ''}).`);
  }
  if (c.esquema === 'TN-C') nc('P1', 'Instalação', 'Esquema TN-C (condutor PEN) não é permitido a jusante do quadro geral em EAS (710.312.2.1).');
  for (const n of ncs) { const a = ambientes.find(x => x.nome === n.local); if (a) a.alertas.push(n.texto); }

  // Painel de alarme: no próprio local (salas) ou no posto de enfermagem do setor
  for (const s of sistemas) {
    const posto = ambientes.find(a => a.tipo === 'posto_enfermagem' && a.quadro === s.quadro) || ambientes.find(a => a.tipo === 'posto_enfermagem');
    s.ambientePainel = s.ambientes.every(a => a.painelNoLocal) ? s.ambientes[0].nome : (posto ? posto.nome : null);
    if (!s.ambientes.every(a => a.painelNoLocal) && posto && !s.ambientes.some(a => a.localPainel)) s.localPainel = posto.nome;
    const ap = ambientes.find(a => a.nome === s.ambientePainel);
    if (ap) (ap.paineisAlarme = ap.paineisAlarme || []).push(s.id);
  }

  const circuitos = [...circuitosIt, ...circuitosTn];
  const todosCircuitos = [...circuitos, ...sistemas.flatMap(s => s.primarios)];
  const maiorQueda = Math.max(0, ...circuitos.map(x => x.queda));
  avisos.push('Fator de simultaneidade do IT, VA por tomada, tomadas por leito e densidade de iluminação são premissas H&M — ajustar com a lista real de equipamentos médicos e o luminotécnico. [CONFERIR]');
  avisos.push('Balanceamento de fases dos quadros setoriais a conferir no projeto executivo. [CONFERIR]');
  const materiais = listaMateriais({ c, ambientes, sistemas, quadros, circuitos, fs });
  return { config: c, fonte: fs, ambientes, sistemas, quadros, circuitos, circuitosIt, circuitosTn, todosCircuitos, maiorQueda, ncs, avisos, materiais };
}

function alimentadorQuadro(q, c) {
  const ligacao = c.sistema === 'trifasico' ? 'FFF' : c.sistema === 'bifasico' ? 'FF' : 'FN';
  const circ = { id: `ALIM-${q.id}`, descricao: `Alimentador do ${q.id}${q.nome && q.nome !== q.id ? ` (${q.nome})` : ''}`, tipo: 'alimentador', ligacao, potencia_va: q.demandaVa, comprimento_m: q.comprimento, agrupamento: 1 };
  // bifásico com neutro: corrente por fase = D / (2·Vfn), 3 condutores carregados (mesma regra da skill de elétrica)
  if (c.sistema === 'bifasico') { circ.potencia_va = q.demandaVa * c.vff / (2 * c.vfn); circ.carregados = 3; }
  const opts = { minimo: T.SECAO_MINIMA.alimentador, limiteQueda: c.quedaAlimentador };
  let d = E.dimensionarCircuito(circ, c, opts);
  const ibReal = d.ib;
  // seletividade: o geral do quadro acima do maior disjuntor a jusante [CONFERIR curvas no executivo]
  const maiorJusante = Math.max(0, ...[...q.circuitos, ...q.primarios].map(x => x.disjuntor));
  const inMin = T.DISJUNTORES.find(x => x > maiorJusante);
  if (inMin && d.disjuntor < inMin) {
    d = E.dimensionarCircuito({ ...circ, potencia_va: potenciaParaCorrente(inMin, ligacao, c) }, c, opts);
    d.criterio = `seletividade com o maior disjuntor a jusante (${maiorJusante} A)`;
  }
  d.ib = ibReal;
  d.potencia_va = q.demandaVa;
  d.secaoNeutro = d.secao;
  return d;
}

// ── Lista de materiais ─────────────────────────────────────────────────────

function listaMateriais({ c, ambientes, sistemas, quadros, circuitos, fs }) {
  const itens = [];
  const add = (grupo, codigo, descricao, unidade, quantidade, referencia) => { if (quantidade > 0) itens.push({ grupo, codigo, descricao, unidade, quantidade: arred(quantidade, 1), referencia }); };
  const contar = (obj, k, q = 1) => { obj[k] = (obj[k] || 0) + q; };
  const fmt = (v) => String(v).replace('.', ',');
  const vPrim = c.vfn >= 200 ? c.vfn : c.vff;

  // Sistema IT médico
  const trafos = {};
  sistemas.forEach(s => contar(trafos, s.kvaPorUnidade, s.unidades));
  Object.keys(trafos).map(Number).sort((a, b) => a - b).forEach(k => add('Sistema IT médico', 'TRAFO-IT', `Transformador de separação para uso médico (IEC 61558-2-15) monofásico ${fmt(k)} kVA, ${vPrim}/${c.vIt} V, blindagem eletrostática entre enrolamentos, sensor de temperatura, corrente de fuga ≤ 0,5 mA`, 'un', trafos[k], 'NBR 13534; IEC 60364-7-710, 710.512.1'));
  const nIt = sistemas.reduce((s, x) => s + x.unidades, 0);
  add('Sistema IT médico', 'DSI', 'Dispositivo supervisor de isolamento (DSI) para IT médico (IEC 61557-8): alarme ajustável ≥ 50 kΩ, impedância ≥ 100 kΩ, tensão de medição ≤ 25 V CC, com monitoração de carga e temperatura do transformador', 'un', nIt, '710.413.1.5');
  add('Sistema IT médico', 'PAINEL-ALARME', 'Painel de alarme/sinalização remota do IT médico (sinal verde normal, amarelo de falha não cancelável, alarme sonoro silenciável, botão de teste)', 'un', nIt, '710.413.1.5');
  sistemas.forEach(s => add('Sistema IT médico', 'QDIT', `Quadro do sistema IT médico ${s.qdit} em chapa de aço para transformador de ${fmt(s.kvaPorUnidade)} kVA, DSI e ${Math.ceil(s.circuitos.length / s.unidades)} disjuntores bipolares + reserva`, 'un', s.unidades, '710.512.1'));
  const disjIt = {};
  sistemas.forEach(s => { s.circuitos.forEach(x => contar(disjIt, `2P ${x.disjuntor} A curva C`)); contar(disjIt, `2P ${s.disjSecundario} A curva C — geral do secundário (só curto-circuito) [CONFERIR]`, s.unidades); });
  Object.entries(disjIt).forEach(([k, q]) => add('Sistema IT médico', 'DISJ-IT', `Disjuntor termomagnético ${k} — sistema IT`, 'un', q, '710.53; NBR 5410, 5.3.4'));
  const disjPrim = {};
  sistemas.forEach(s => s.primarios.forEach(p => contar(disjPrim, `${p.polos === 1 ? '1P' : '2P'} ${p.disjuntor} A curva D`)));
  Object.entries(disjPrim).forEach(([k, q]) => add('Sistema IT médico', 'DISJ-PRIM', `Disjuntor ${k} — primário do transformador IT (corrente de magnetização) [CONFERIR]`, 'un', q, 'NBR 5410, 5.3.4'));
  const tomIt = ambientes.reduce((s, a) => s + a.tomadasIt, 0);
  add('Tomadas e pontos', 'TOM-IT', 'Tomada 2P+T 20 A (NBR 14136) do sistema IT médico, cor diferenciada, com identificação permanente "IT MÉDICO" e nº do circuito, com placa', 'un', tomIt, '710.53');

  // Quadros setoriais e proteção TN
  for (const q of quadros.filter(x => x.nCircuitos)) {
    add('Quadros e proteção', 'QD', `Quadro de distribuição setorial ${q.id}${q.nome && q.nome !== q.id ? ` (${q.nome})` : ''} em chapa de aço, ${q.modulos} módulos DIN, barramentos F/N/PE isolados${q.essencial ? ', identificado como alimentado pela fonte de segurança' : ''}`, 'un', 1, 'NBR 5410, 6.5.4; Tabela 59');
    if (q.alimentador) add('Quadros e proteção', 'DISJ-G', `Disjuntor geral ${q.alimentador.polos}P ${q.alimentador.disjuntor} A — ${q.id}`, 'un', 1, 'NBR 5410, 5.3.4');
    add('Quadros e proteção', 'DPS', `DPS classe II Uc ≥ ${q.dpsUc} V, In ≥ 20 kA (8/20 µs) — ${q.id}`, 'un', q.dpsQtd, 'NBR 5410, 6.3.5.2.4 e Tabela 49');
  }
  const disjTn = {};
  const drs = {};
  circuitos.filter(x => x.sistema === 'TN').forEach(x => {
    contar(disjTn, `${x.polos}P ${x.disjuntor} A curva C`);
    if (x.dr) contar(drs, `${x.ligacao === 'FFF' ? '4P' : '2P'} ${[25, 40, 63, 80, 100].find(v => v >= x.disjuntor) || 100} A 30 mA tipo ${x.drTipo || 'A'}`);
  });
  Object.entries(disjTn).forEach(([k, q]) => add('Quadros e proteção', 'DISJ', `Disjuntor termomagnético ${k} (NBR NM 60898)`, 'un', q, 'NBR 5410, 5.3.4'));
  Object.entries(drs).forEach(([k, q]) => add('Quadros e proteção', 'DR', `Interruptor diferencial residual (DR) ${k} — tipo AC não permitido`, 'un', q, '710.413.1.3'));

  // Tomadas TN e pontos
  add('Tomadas e pontos', 'TOM', 'Tomada 2P+T 20 A (NBR 14136) com placa — circuitos TN-S com DR', 'un', ambientes.reduce((s, a) => s + a.tomadasTn, 0), '710.413.1.3; NBR 5410, 9.5.2.2');
  const lumN = ambientes.reduce((s, a) => s + a.luminarias - a.luminariasSeguranca, 0);
  const lumS = ambientes.reduce((s, a) => s + a.luminariasSeguranca, 0);
  add('Tomadas e pontos', 'LUZ', 'Ponto de luz (caixa, conexões e fiação até a luminária) — iluminação normal', 'un', lumN, 'NBR 5410, 9.5.2.1');
  add('Tomadas e pontos', 'LUZ-S', 'Ponto de luz da iluminação de segurança (circuito da fonte de segurança, identificado)', 'un', lumS, '710.560.9');
  add('Tomadas e pontos', 'PF', 'Ponto de força para equipamento médico (circuito exclusivo)', 'un', circuitos.filter(x => x.tipo === 'tue').length, 'NBR 5410, 9.5.3.1');

  // Equipotencialização suplementar
  const bels = ambientes.filter(a => a.equipotencializacao);
  add('Equipotencialização', 'BEL', 'Barramento de equipotencialização local (BEL) em cobre, com terminais individuais desconectáveis e identificados, em caixa com tampa', 'un', bels.length, '710.413.1.6');
  const cabBel = {};
  bels.forEach(a => { contar(cabBel, a.equipotencializacao.secao, a.equipotencializacao.comprimentoTotal); contar(cabBel, a.equipotencializacao.secaoQuadro, Math.ceil(a.equipotencializacao.comprimentoQuadro * FOLGA)); });
  Object.keys(cabBel).map(Number).sort((a, b) => a - b).forEach(s => add('Equipotencialização', `CAB-EQ-${fmt(s)}`, `Cabo de cobre flexível ${fmt(s)} mm² verde-amarelo 450/750 V não halogenado — equipotencialização`, 'm', Math.ceil(cabBel[s]), '710.413.1.6'));
  add('Equipotencialização', 'TERM-EQ', 'Terminal/conector de compressão para ligação equipotencial (partes condutivas estranhas e PE)', 'un', bels.reduce((s, a) => s + a.equipotencializacao.ligacoes + 1, 0), '710.413.1.6');

  // Cabos e infraestrutura
  const cabos = {};
  const somaCabo = (x) => {
    const L = x.comprimento * FOLGA;
    const fases = x.ligacao === 'FFF' ? 3 : x.ligacao === 'FF' ? 2 : 1;
    contar(cabos, x.secao, L * fases);
    if (x.secaoNeutro) contar(cabos, x.secaoNeutro, L);
    contar(cabos, x.secaoPE, L);
  };
  [...circuitos, ...sistemas.flatMap(s => s.primarios), ...quadros.filter(q => q.alimentador).map(q => q.alimentador)].forEach(somaCabo);
  const iso = c.isolacao === 'PVC' ? '450/750 V, isolação não halogenada (LSZH)' : '0,6/1 kV HEPR 90 °C, cobertura não halogenada (LSZH)';
  Object.keys(cabos).map(Number).sort((a, b) => a - b).forEach(s => add('Cabos e infraestrutura', `CAB-${fmt(s)}`, `Cabo de cobre flexível ${fmt(s)} mm² ${iso}, baixa emissão de fumaça (NBR 13248)`, 'm', Math.ceil(cabos[s]), 'NBR 5410, 6.2 e 5.2.2.2 (BD4) [CONFERIR]'));
  const eletroduto = [...circuitos, ...sistemas.flatMap(s => s.primarios)].reduce((s, x) => s + x.comprimento, 0) + quadros.reduce((s, q) => s + (q.alimentador ? q.alimentador.comprimento : 0), 0);
  add('Cabos e infraestrutura', 'ELE', 'Eletroduto/eletrocalha (estimativa pelo comprimento dos circuitos — conferir no projeto)', 'm', Math.ceil(eletroduto), 'NBR 5410, 6.2.11');

  // Fonte de segurança
  if (fs.precisaUps && fs.ups === 'prever') add('Fonte de segurança', 'UPS', `UPS on-line dupla conversão ${fs.upsKvaSugerido} kVA (fp saída ≥ 0,9) com banco de baterias para ${fs.upsAutonomiaMin} min (≈ ${fmt(arred(fs.upsEnergiaKwh, 1))} kWh) e by-pass de manutenção — classes 0,15 s e 0,5 s [CONFERIR com o fabricante]`, 'un', 1, '710.556.5.2.2.1');
  if (fs.precisaGerador && fs.gerador === 'prever') add('Fonte de segurança', 'GMG', `Grupo motor-gerador diesel ${fs.geradorKvaSugerido} kVA, partida automática e QTA (transferência ≤ 15 s), tanque para ${fs.geradorAutonomiaH} h (≈ ${fs.tanqueL} L) [CONFERIR]`, 'un', 1, '710.556.5.2.2.2');
  return itens;
}

module.exports = { calcular, config, configFonte, classificar, tipoAmbiente, normalizarEquip, maisRestritiva, TIPOS, CLASSES, IT, DSI, BEL, AUTONOMIA, FONTE, UPS_KVA, GERADOR_KVA, FATOR_PRIMARIO_IT };
