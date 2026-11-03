// Disciplina CLIMATIZAÇÃO (HVAC) — carga térmica e seleção do sistema, sistemas centrais
// (chiller, fancoil/AHU, VAV, dutos e bombas), PMOC, vistoria/medições e orçamento —
// ABNT NBR 16401-1/2/3, ASHRAE 62.1 e 90.1, AHRI 550/590, Lei 13.589/2018, Portaria MS
// 3.523/1998 e ANVISA RE 09/2003 (padrões hoje na ABNT NBR 17037) — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { fmtNum } = require('../../../_comum/docx-base');
const T = require('./tabelas');
const AUT = require('../../../automacao/scripts/lib/tabelas');
const { calcular } = require('./projeto');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-escritorio.json');

const NORMAS = [
  ['ABNT NBR 16401-1', 'Instalações de ar-condicionado — Sistemas centrais e unitários — Parte 1: Projetos das instalações'],
  ['ABNT NBR 16401-2', 'Instalações de ar-condicionado — Parte 2: Parâmetros de conforto térmico'],
  ['ABNT NBR 16401-3', 'Instalações de ar-condicionado — Parte 3: Qualidade do ar interior (vazões de ar externo e filtragem)'],
  ['ASHRAE 62.1', 'Ventilation and Acceptable Indoor Air Quality (comparação do ar externo e procedimento multizona)'],
  ['ASHRAE 90.1', 'Energy Standard for Buildings — eficiência mínima de chillers, ventiladores e controle de VAV [CONFERIR edição]'],
  ['AHRI 550/590', 'Performance Rating of Water-Chilling and Heat Pump Water-Heating Packages (COP e IPLV)'],
  ['Lei Federal 13.589/2018', 'Plano de Manutenção, Operação e Controle (PMOC) dos sistemas de climatização'],
  ['Portaria MS 3.523/1998', 'Regulamento técnico de limpeza, manutenção e controle dos sistemas de climatização (responsável técnico, art. 6º)'],
  ['ANVISA RE 09/2003', 'Padrões referenciais de qualidade do ar interior — substituídos, desde 25/07/2024, pelos da ABNT NBR 17037 [CONFERIR]'],
  ['ABNT NBR 17037', 'Qualidade do ar interior em ambientes não residenciais climatizados artificialmente — padrões referenciais [CONFERIR]'],
  ['ABNT NBR 13971', 'Sistemas de refrigeração, condicionamento de ar, ventilação e aquecimento — manutenção programada [CONFERIR edição]'],
  ['ASHRAE Handbook — Fundamentals', 'Psicrometria (cap. 1), cargas térmicas (cap. 18) e dutos — método de Altshul-Tsal (cap. 21)'],
  ['ABNT NBR 5410:2004', 'Instalações elétricas de baixa tensão (circuitos dos motores de bombas e ventiladores)'],
];
const SECOES_CHECKLIST = ['Documentação e PMOC', 'Central de água gelada', 'Unidades de tratamento de ar e fancoils', 'Splits, VRF e self', 'Dutos, difusores e tomada de ar', 'Elétrica e comando', 'Qualidade do ar interior', 'Segurança'];

const num = fmtNum; // número pt-BR; '—' quando vazio ou inválido
const vazio = (v) => v == null || v === '';
const m3h = (q) => `${num(q * 3600, 0)} m³/h`;
const kw = (w) => `${num(w / 1000, 1)} kW`;
const tr = (w) => `${num(w / T.W_POR_TR, 2)} TR`;

// ── Inspeção: medições (critérios SEMPRE os de referência — tabelas.js) ──────

function medicoes(insp, calc) {
  const crit = T.CRITERIOS_QAI[insp.criterio_qai] ? insp.criterio_qai : 'nbr17037';
  const q = T.CRITERIOS_QAI[crit];
  const terminais = calc.projeto.unidades.flatMap(u => u.terminais);
  const vazoes = (insp.vazoes || []).map(m => {
    const doCalc = terminais.find(t => t.id === m.ambiente || t.ambiente === m.ambiente);
    const projeto = vazio(m.projeto_m3h) ? (doCalc ? doCalc.vazaoPorDifusor : null) : Number(m.projeto_m3h);
    const desvio = projeto && !vazio(m.medido_m3h) ? Number(m.medido_m3h) / projeto - 1 : null;
    return { ...m, projeto, desvio, criterio: `±${num(T.TOLERANCIA_VAZAO * 100, 0)} % do projeto [CONFERIR]`,
      resultado: desvio == null ? 'NV' : Math.abs(desvio) <= T.TOLERANCIA_VAZAO + 1e-9 ? 'C' : 'NC' };
  });
  const dentro = (v, [a, b]) => Number(v) >= a - 1e-9 && Number(v) <= b + 1e-9;
  const ambiente = (insp.ambiente || []).map(m => {
    const r = {};
    r.t = vazio(m.tbs_c) ? 'NV' : dentro(m.tbs_c, q.t) ? 'C' : 'NC';
    r.ur = vazio(m.ur_pct) ? 'NV' : dentro(m.ur_pct, q.ur) ? 'C' : 'NC';
    const limCo2 = q.co2_acima_externo_ppm != null ? (vazio(m.co2_externo_ppm) ? null : Number(m.co2_externo_ppm) + q.co2_acima_externo_ppm) : q.co2_max_ppm;
    r.co2 = vazio(m.co2_ppm) || limCo2 == null ? 'NV' : Number(m.co2_ppm) <= limCo2 ? 'C' : 'NC';
    r.v = vazio(m.velocidade_ms) ? 'NV' : Number(m.velocidade_ms) <= q.v_max + 1e-9 ? 'C' : 'NC';
    const todos = Object.values(r);
    const resultado = todos.includes('NC') ? 'NC' : todos.every(x => x === 'NV') ? 'NV' : todos.includes('NV') ? 'NV' : 'C';
    return { ...m, limCo2, parcial: r, resultado };
  });
  const dtProj = calc.c.agua.dt;
  const agua = (insp.agua || []).map(m => {
    const dt = vazio(m.entrada_c) || vazio(m.saida_c) ? null : Number(m.entrada_c) - Number(m.saida_c);
    return { ...m, dt, criterio: `ΔT ≥ ${num(T.FRACAO_DT_AGUA * 100, 0)} % de ${num(dtProj, 1)} K [CONFERIR]`, resultado: dt == null ? 'NV' : dt >= T.FRACAO_DT_AGUA * dtProj - 1e-9 ? 'C' : 'NC' };
  });
  return { criterio: crit, rotuloCriterio: q.rotulo, q, vazoes, ambiente, agua };
}

function processar(dados) {
  const calc = calcular(dados);
  const insp = dados.inspecao || {};
  const pj = calc.projeto;
  const existentes = (dados.equipamentos_existentes || []).map(e => e.tipo);
  const tem = (...tipos) => tipos.some(t => existentes.includes(t)) || (!existentes.length && (
    (tipos.includes('chiller') && pj.central) || (tipos.includes('torre') && pj.central?.condAgua) || (tipos.includes('fancoil') && pj.unidades.length)
    || (tipos.includes('vav') && pj.unidades.some(u => u.vavs.length)) || (tipos.some(t => ['split', 'vrf_evap', 'vrf_cond', 'self'].includes(t)) && ['split', 'vrf', 'self'].includes(pj.sistema))));
  const na = {};
  if (!tem('chiller')) for (const k of ['C1', 'C2', 'C3', 'C4']) na[k] = 'Sem central de água gelada';
  if (!tem('torre')) na.C5 = 'Sem torre de resfriamento';
  if (!tem('fancoil', 'self')) for (const k of ['U1', 'U2', 'U3', 'U4', 'U5']) na[k] = 'Sem unidade de tratamento de ar';
  if (!tem('vav')) na.U6 = 'Sem caixas VAV';
  if (!tem('split', 'vrf_evap', 'vrf_cond', 'self')) for (const k of ['S1', 'S2', 'S3', 'S4']) na[k] = 'Sem split, VRF ou self';
  if (!calc.pmoc.obrigatoriedade.rtObrigatorio) na.D3 = `Sistema até ${calc.pmoc.obrigatoriedade.limiteTr} TR (Portaria 3.523, art. 6º)`;
  const med = medicoes(insp, calc);
  const porItem = {
    A3: med.vazoes, C3: med.agua,
    Q1: med.ambiente.map(m => ({ resultado: [m.parcial.t, m.parcial.ur].includes('NC') ? 'NC' : [m.parcial.t, m.parcial.ur].includes('NV') ? 'NV' : 'C' })),
    Q2: med.ambiente.map(m => ({ resultado: m.parcial.co2 })), Q3: med.ambiente.map(m => ({ resultado: m.parcial.v })),
  };
  const informados = new Set((insp.checklist || []).filter(x => x.situacao && x.situacao !== 'NV').map(x => x.cod));
  const automaticos = Object.entries(porItem).flatMap(([cod, lista]) => {
    const medidos = lista.filter(m => m.resultado && m.resultado !== 'NV');
    if (informados.has(cod) || !medidos.length) return [];
    const nc = medidos.some(m => m.resultado === 'NC');
    return [{ cod, situacao: nc ? 'NC' : 'C', obs: `${nc ? 'Não conforme' : 'Conforme'} nas medições da seção 6 (${medidos.length} medição(ões)).` }];
  });
  const checklist = I.mesclarChecklist(CHECKLIST, [...(insp.checklist || []).filter(x => !automaticos.some(a => a.cod === x.cod)), ...automaticos], na);
  const ncs = I.consolidarNcs(checklist, insp.ncs || []);
  const parecer = I.parecer(checklist, ncs, [...med.vazoes, ...med.ambiente, ...med.agua]);
  return { dados, calc, insp, checklist, ncs, med, parecer };
}

// ── Textos e linhas reaproveitados ──────────────────────────────────────────

const linhasCarga = (calc) => [
  ...calc.ambientes.map(a => [a.nome, num(a.area, 0), a.pessoas, num(a.sensivel / 1000, 1), num(a.latente / 1000, 1), num(a.kw, 1), num(a.tr, 2), num(a.wM2, 0), num(a.fcs, 2), num(a.vInsM3h, 0), num(a.voz * 3.6, 0)]),
  ['TOTAL', num(calc.totais.area, 0), calc.totais.pessoas, num(calc.totais.sensivel / 1000, 1), num(calc.totais.latente / 1000, 1), num(calc.totais.kw, 1), num(calc.totais.tr, 2), num(calc.totais.total / calc.totais.area, 0), '', num(calc.ambientes.reduce((s, a) => s + a.vInsM3h, 0), 0), num(calc.totais.arExterno * 3600, 0)],
];
const linhasComponentes = (calc) => calc.ambientes.map(a => {
  const k = a.componentes;
  return [a.nome, num(k.envoltoria, 0), num(k.pessoasS, 0), num(k.pessoasL, 0), num(k.iluminacao, 0), num(k.equipamentos, 0), num(k.infiltracaoS + k.infiltracaoL, 0), num(k.arExternoS, 0), num(k.arExternoL, 0)];
});
const descricaoTrecho = (t) => (t.forma === 'circular' ? `Ø ${num(t.diametro * 1000, 0)} mm` : `${num(t.largura * 1000, 0)} × ${num(t.altura * 1000, 0)} mm`);

function textoSistema(calc) {
  const pj = calc.projeto;
  if (pj.sistema === 'split') return `${pj.split.reduce((s, x) => s + x.n, 0)} split(s) — ${pj.split.map(s => `${s.ambiente}: ${s.n} × ${num(s.btuh, 0)} BTU/h`).join('; ')}`;
  if (pj.sistema === 'vrf') return `VRF: ${pj.vrf.nEvap} unidade(s) interna(s) (Σ ${num(pj.vrf.somaEvap, 1)} kW) e ${pj.vrf.sistemas} sistema(s) de ${pj.vrf.modulosPorSistema} × ${num(pj.vrf.modulo, 1)} kW — combinação ${num(pj.vrf.combinacao * 100, 0)} %`;
  if (pj.sistema === 'self') return pj.self.map(s => `${s.unidade}: ${s.n} × ${num(s.tr, 1)} TR`).join('; ');
  const ce = pj.central;
  return `${ce.nChillers} chiller(s) de ${num(ce.trPorChiller, 0)} TR (${ce.rotuloTipo}${ce.reserva ? ', 1 reserva' : ''}) e ${pj.unidades.length} fancoil(s)/AHU`;
}

// ── Resumo para a tela ──────────────────────────────────────────────────────

function resumir(res) {
  const { calc } = res;
  const pj = calc.projeto;
  const ind = [
    { rotulo: 'Carga térmica total', valor: `${num(calc.totais.tr, 1)} TR · ${num(calc.totais.kw, 1)} kW`, detalhe: `${num(calc.totais.btuh, 0)} BTU/h · sensível ${kw(calc.totais.sensivel)} + latente ${kw(calc.totais.latente)} · fator de segurança ${num(calc.c.fatorSeguranca * 100, 0)} % · ${num(calc.totais.total / calc.totais.area, 0)} W/m²` },
    { rotulo: 'Condições de projeto', valor: `ext. ${num(calc.ext.t, 1)} °C / ${num(calc.ext.ur, 0)} % · int. ${num(calc.int.t, 1)} °C / ${num(calc.int.ur, 0)} %`, detalhe: `altitude ${num(calc.c.altitude, 0)} m (p = ${num(calc.c.p, 1)} kPa) · W ext. ${num(calc.ext.w * 1000, 1)} g/kg · int. ${num(calc.int.w * 1000, 1)} g/kg [CONFERIR NBR 16401-1/-2]`, ok: undefined },
    { rotulo: 'Ar externo', valor: m3h(calc.totais.arExterno), detalhe: `${calc.totais.pessoas} pessoas · NBR 16401-3 com mínimo de 27 m³/h·pessoa (Portaria 3.523, art. 5º f)` },
    { rotulo: 'Sistema', valor: calc.sel.rotulo, detalhe: `${calc.sel.automatico ? 'escolha automática: ' : ''}${calc.sel.motivo} · ${textoSistema(calc)}` },
    ...pj.unidades.map(u => ({ rotulo: `${u.id} (${u.tipo === 'self' ? 'self' : 'fancoil/AHU'})`, valor: `${m3h(u.vFan)} · ${num(u.kw, 1)} kW · ${num(u.pressao, 0)} Pa`, detalhe: `ar externo ${m3h(u.votAdot)} (Ev ${num(u.ev, 2)}) · motor ${num(u.motor.cv)} cv (${u.motor.partida.rotulo}) · duto ${descricaoTrecho(u.dutos.principal)}${u.controlePressao ? ` · setpoint de pressão ${u.controlePressao.setpoint} Pa` : ''}` })),
    ...(pj.central ? [
      { rotulo: 'Central de água gelada', valor: `${pj.central.nChillers} × ${num(pj.central.trPorChiller, 0)} TR`, ok: pj.central.atende.pathA !== false || pj.central.atende.pathB !== false ? (pj.central.copInformado == null ? undefined : true) : false, detalhe: `carga ${num(pj.central.cargaTr, 1)} TR (simultaneidade ${num(calc.c.simultaneidade, 2)}) · COP ${num(pj.central.cop, 2)}${pj.central.iplv ? ` · IPLV ${num(pj.central.iplv, 2)}` : ''} · água ${num(pj.central.vazaoChiller, 1)} m³/h por chiller (ΔT ${num(pj.central.dtAgua, 1)} K)` },
      { rotulo: 'Bombas', valor: `${pj.central.bombas.length} bomba(s)`, detalhe: pj.central.bombas.map(b => `${b.tag} ${num(b.vazaoM3h, 1)} m³/h × ${num(b.altura, 1)} mca, ${num(b.motor.cv)} cv`).join(' · ') },
    ] : []),
    { rotulo: 'Potência elétrica estimada', valor: `${num(calc.eletrica.totalKw, 1)} kW`, detalhe: `${calc.eletrica.cargas.length} carga(s) — alimentar pela skill de elétrica/quadros` },
    { rotulo: 'PMOC', valor: calc.pmoc.obrigatoriedade.obrigatorio ? 'obrigatório' : 'recomendado', ok: undefined, detalhe: calc.pmoc.obrigatoriedade.texto },
    { rotulo: 'Pendências [CONFERIR]', valor: `${calc.pendencias.length}`, ok: undefined, detalhe: 'valores de tabela de norma não conferidos no texto vigente — ver o memorial' },
  ];
  const temInspecao = (res.insp.checklist || []).length || (res.insp.vazoes || []).length || (res.insp.ambiente || []).length;
  if (temInspecao) ind.push({ rotulo: 'Parecer da vistoria', valor: res.parecer.situacao.replace(/_/g, ' '), ok: res.parecer.situacao === 'CONFORME' ? true : res.parecer.situacao === 'INCONCLUSIVO' ? undefined : false, detalhe: `NC ${res.ncs.length} · NV ${res.parecer.cont.NV} · critério ${res.med.rotuloCriterio}` });
  const tabelas = [
    { titulo: 'Carga térmica por ambiente', colunas: ['Ambiente', 'Área (m²)', 'Pessoas', 'Sensível (kW)', 'Latente (kW)', 'Total (kW)', 'TR', 'W/m²', 'FCS', 'Insuflamento (m³/h)', 'Ar externo (m³/h)'], linhas: linhasCarga(calc) },
    { titulo: 'Componentes da carga (W, sem fator de segurança)', colunas: ['Ambiente', 'Envoltória', 'Pessoas S', 'Pessoas L', 'Iluminação', 'Equipamentos', 'Infiltração', 'Ar externo S', 'Ar externo L'], linhas: linhasComponentes(calc) },
    ...(pj.unidades.some(u => u.vavs.length) ? [{ titulo: 'Caixas VAV', colunas: ['Ambiente', 'Máxima (m³/h)', 'Mínima (m³/h)', 'Mín./máx.', 'Zpz', 'Caixas', 'Entrada'], linhas: pj.unidades.flatMap(u => u.vavs.map(v => [v.ambiente, num(v.vMax * 3600, 0), num(v.vMin * 3600, 0), `${num(v.fracaoMin * 100, 0)} %`, num(v.zpz, 2), v.caixas, v.entrada ? `Ø ${num(v.entrada * 1000, 0)} mm` : '—'])) }] : []),
    ...(calc.eletrica.cargas.length ? [{ titulo: 'Cargas elétricas (para o projeto elétrico)', colunas: ['Tag', 'Descrição', 'kW', 'In (A)', 'Partida'], linhas: calc.eletrica.cargas.map(c => [c.tag, c.descricao, num(c.kw, 2), c.in == null ? '—' : num(c.in, 1), c.partida]) }] : []),
  ];
  return { indicadores: ind, textos: [...calc.avisos, ...calc.pendencias], tabelas };
}

// ── Memorial descritivo e de cálculo ────────────────────────────────────────

function secoesMemorial(res) {
  const { calc, dados } = res;
  const pj = calc.projeto;
  const obra = dados.obra?.nome || 'a edificação';
  const s = [];
  let i = 1;
  s.push({ titulo: `${i++}. Objeto`, paragrafos: [
    `Memorial descritivo e de cálculo da climatização de "${obra}": carga térmica por ambiente pelo método por componentes, ar externo, escolha e pré-seleção do sistema${pj.unidades.length ? ', unidades de tratamento de ar, dutos' : ''}${pj.central ? ', central de água gelada e bombas' : ''}, cargas elétricas e plano de manutenção (PMOC).`,
    'Os valores de tabela de norma que não foram conferidos no texto vigente estão marcados [CONFERIR] e listados na seção "Pendências". Capacidades e modelos são pré-seleção: a seleção final é feita no software/catálogo do fabricante.',
  ] });
  s.push({ titulo: `${i++}. Condições de projeto`, kv: [
    ['Local', `${dados.projeto?.cidade || T.EXTERNO_PADRAO.cidade} · altitude ${num(calc.c.altitude, 0)} m · pressão ${num(calc.c.p, 2)} kPa`],
    ['Externa (verão)', `TBS ${num(calc.ext.t, 1)} °C · TBU ${num(calc.c.tbuExt, 1)} °C · UR ${num(calc.ext.ur, 0)} % · W ${num(calc.ext.w * 1000, 2)} g/kg · h ${num(calc.ext.h, 1)} kJ/kg [CONFERIR NBR 16401-1 Anexo A]`],
    ['Interna', `TBS ${num(calc.int.t, 1)} °C · UR ${num(calc.int.ur, 0)} % · W ${num(calc.int.w * 1000, 2)} g/kg · h ${num(calc.int.h, 1)} kJ/kg [CONFERIR NBR 16401-2]`],
    ['Fator de segurança / simultaneidade', `${num(calc.c.fatorSeguranca * 100, 0)} % / ${num(calc.c.simultaneidade, 2)}`],
    ['Insuflamento', `ΔT ${num(calc.c.dtInsuflamento, 1)} K · ${T.EZ[calc.c.ez].rotulo} (Ez ${num(T.EZ[calc.c.ez].ez, 1)})`],
  ], notas: ['Psicrometria pelas equações do ASHRAE Fundamentals, cap. 1 (pressão pela altitude, Hyland-Wexler, umidade pelo bulbo úmido).'] });
  s.push({ titulo: `${i++}. Carga térmica por ambiente`, paragrafos: [
    'Método por componentes (ASHRAE Fundamentals cap. 18 / NBR 16401-1): envoltória opaca por U·A·(ΔT + α·I·Rse) — temperatura sol-ar em regime, sem a inércia da parede (lado seguro); vidros por U·A·ΔT + A·FS·I·(1 − sombreamento); pessoas pela atividade; iluminação e equipamentos pela densidade; ar externo e infiltração pela psicrometria (qs = ṁ·cp·ΔT, ql = ṁ·hfg·ΔW).',
  ], tabela: { colunas: ['Ambiente', 'Área', 'Pess.', 'Sens. kW', 'Lat. kW', 'Total kW', 'TR', 'W/m²', 'FCS', 'Insufl. m³/h', 'Ar ext. m³/h'], linhas: linhasCarga(calc), proporcoes: [1.8, 0.6, 0.5, 0.6, 0.6, 0.6, 0.5, 0.5, 0.5, 0.8, 0.8], tamanho: 14 } });
  s.push({ titulo: `${i++}. Componentes da carga`, tabela: { colunas: ['Ambiente', 'Envolt.', 'Pess. S', 'Pess. L', 'Ilum.', 'Equip.', 'Infiltr.', 'Ar ext. S', 'Ar ext. L'], linhas: linhasComponentes(calc), proporcoes: [1.8, 0.7, 0.6, 0.6, 0.6, 0.7, 0.6, 0.7, 0.7], tamanho: 14 },
    notas: ['Valores em W, sem o fator de segurança.', ...calc.ambientes.flatMap(a => a.superficies.map(x => `${a.nome} — ${x.descricao}, ${num(x.area, 1)} m²: ${num(x.q, 0)} W (${x.detalhe}).`))] });
  s.push({ titulo: `${i++}. Ar externo (NBR 16401-3)`, paragrafos: [
    'Vazão por zona Vbz = Fp·Pz + Fa·Az (NBR 16401-3, nível 1 — tabela compartilhada com a skill de automação), Voz = Vbz/Ez; adotado no mínimo 27 m³/h por pessoa (Portaria MS 3.523/1998, art. 5º f). Em sistema multizona: Zpz = Voz/Vpz, Ev pela maior Zpz e Vot = Vou/Ev (ASHRAE 62.1, procedimento multizona). [CONFERIR]',
  ], tabela: { colunas: ['Ambiente', 'Uso', 'Pessoas', 'Fp', 'Fa', 'Vbz (m³/h)', 'Adotado (m³/h)', 'Critério'], linhas: calc.ambientes.map(a => [a.nome, a.rotuloUso, a.pessoas, num(a.fp, 1), num(a.fa, 2), num(a.vbz * 3.6, 0), num(a.voz * 3.6, 0), a.criterioAr]), proporcoes: [1.6, 1, 0.5, 0.4, 0.4, 0.7, 0.7, 2.2], tamanho: 14 } });
  s.push({ titulo: `${i++}. Sistema adotado`, paragrafos: [`${calc.sel.rotulo} — ${calc.sel.automatico ? 'escolha automática pelo critério H&M' : 'escolhido no projeto'}: ${calc.sel.motivo}. ${textoSistema(calc)}.`] });
  if (pj.sistema === 'split') s.push({ titulo: `${i++}. Splits por ambiente`, tabela: { colunas: ['Ambiente', 'Carga (BTU/h)', 'Unidades', 'Capacidade (BTU/h)', 'Tipo', 'Potência elétrica (kW)'], linhas: pj.split.map(x => [x.ambiente, num(calc.ambientes.find(a => a.id === x.id).btuh, 0), x.n, num(x.btuh, 0), x.forma, num(x.kwEl, 2)]) }, notas: [`Potência elétrica estimada com COP ${num(T.COP_TIPICO.split, 1)} [CONFERIR etiqueta INMETRO/catálogo].`] });
  if (pj.sistema === 'vrf') s.push({ titulo: `${i++}. VRF`, tabela: { colunas: ['Ambiente', 'Carga (kW)', 'Unidades internas', 'Capacidade (kW)'], linhas: pj.vrf.evaporadoras.map(e => [e.ambiente, num(calc.ambientes.find(a => a.id === e.id).kw, 2), e.n, num(e.kw, 1)]) },
    notas: [`Unidades externas: ${pj.vrf.sistemas} sistema(s) × ${pj.vrf.modulosPorSistema} módulo(s) de ${num(pj.vrf.modulo, 1)} kW para ${num(pj.vrf.requerido, 1)} kW simultâneos; combinação Σ internas/Σ externas ${num(pj.vrf.combinacao * 100, 0)} % (faixa adotada ${T.VRF_COMBINACAO.map(v => v * 100).join('–')} % [CONFERIR fabricante]). Comprimentos e desníveis de tubulação pelo software do fabricante.`] });
  for (const u of pj.unidades) {
    s.push({ titulo: `${i++}. ${u.tipo === 'self' ? 'Self' : 'Fancoil/AHU'} ${u.id} — ${u.ambientes.join(', ')}`, kv: [
      ['Vazão de insuflamento', `${m3h(u.vFan)}${calc.c.distribuicao === 'vav' ? ` (Σ máximas ${m3h(u.vSoma)} × simultaneidade ${num(calc.c.simultaneidade, 2)})` : ''}`],
      ['Ar externo do sistema', `${m3h(u.votAdot)} — Vou ${m3h(u.vou)}, Xs ${num(u.xs, 2)}, maior Zpz ${num(u.zpzMax, 2)}, Ev ${num(u.ev, 2)} (${u.metodoEv === 'apendice' ? 'Apêndice A: Ev = 1 + Xs − Zpz' : u.metodoEv})${u.vMinLegal > u.vot ? ' — mínimo legal de 27 m³/h·pessoa' : ''}`],
      ['Serpentina', `${num(u.kw, 1)} kW (${num(u.tr, 2)} TR) · sensível ${kw(u.sensivel)} · latente ${kw(u.latente)}${u.aguaM3h ? ` · água gelada ${num(u.aguaM3h, 2)} m³/h` : ''}`],
      ['Ventilador', `${num(u.pressao, 0)} Pa · eixo ${num(u.kwEixo, 2)} kW (η ${num(res.calc.cfgAr.rendimento_ventilador, 2)}) · motor ${num(u.motor.cv)} cv, In ${num(u.motor.in, 1)} A · ${u.motor.partida.rotulo}`],
      ...(u.controlePressao ? [['Controle de pressão do duto', `setpoint inicial ${u.controlePressao.setpoint} Pa, sensor ${u.controlePressao.sensor}; reset por demanda pela caixa mais aberta ("trim & respond") [CONFERIR ASHRAE 90.1 6.5.3.2 / Guideline 36]`]] : []),
    ], tabela: { colunas: ['Parcela (caminho crítico)', 'Pa', 'Referência'], linhas: [...u.linhas.map(l => [l[0], num(l[1], 1), l[2]]), [`Efeito do sistema (${num(res.calc.cfgAr.efeito_sistema * 100, 0)} %)`, num(u.pressao - u.subtotal, 1), 'AMCA 201'], ['TOTAL', num(u.pressao, 0), '']], proporcoes: [3, 0.6, 1.6], tamanho: 15 },
    notas: [`Dutos (Altshul-Tsal, chapa galvanizada, perda alvo ${num(res.calc.cfgAr.perda_alvo_pa_m, 1)} Pa/m): principal ${descricaoTrecho(u.dutos.principal)}, ${num(u.dutos.principal.v, 1)} m/s; ramais ${u.dutos.ramais.map(r => `${r.ambiente} ${descricaoTrecho(r)} (${num(r.v, 1)} m/s)`).join('; ')}. Chapa ≈ ${num(u.dutos.chapaM2, 0)} m².`,
      `Terminais: ${u.terminais.map(t => `${t.ambiente} ${t.difusores} difusor(es) de ~${num(t.vazaoPorDifusor, 0)} m³/h e ${t.grelhas} grelha(s) de retorno`).join('; ')}.`] });
    if (u.vavs.length) s.push({ titulo: `${i++}. Caixas VAV — ${u.id}`, paragrafos: ['Vazão máxima pela carga sensível do ambiente; mínima pela maior entre a fração mínima controlável e Voz ÷ Zpz alvo (para a Ev do sistema não despencar); com reaquecimento, a mínima é comparada com o limite da ASHRAE 90.1 6.5.2.1 (maior entre 20 % da máxima e a vazão exigida pela ventilação). [CONFERIR]'],
      tabela: { colunas: ['Ambiente', 'Máx. m³/h', 'Mín. m³/h', 'Mín./máx.', 'Zpz', 'Caixas', 'Entrada', 'Reaquec. kW'], linhas: u.vavs.map(v => [v.ambiente, num(v.vMax * 3600, 0), num(v.vMin * 3600, 0), `${num(v.fracaoMin * 100, 0)} %`, num(v.zpz, 2), v.caixas, v.entrada ? `Ø ${num(v.entrada * 1000, 0)}` : '—', num((u.reaquecimento.find(r => r.ambiente === v.ambiente) || {}).kw, 2)]), tamanho: 15 } });
  }
  if (pj.central) {
    const ce = pj.central;
    s.push({ titulo: `${i++}. Central de água gelada`, kv: [
      ['Carga da central', `${num(ce.cargaKw, 1)} kW (${num(ce.cargaTr, 1)} TR) = Σ serpentinas × simultaneidade ${num(calc.c.simultaneidade, 2)}`],
      ['Chillers', `${ce.nChillers} × ${num(ce.trPorChiller, 0)} TR (${num(ce.kwPorChiller, 1)} kW) — ${ce.rotuloTipo}${ce.reserva ? ' — 1 reserva' : ''}${ce.modelo ? ` — catálogo: ${ce.modelo.fabricante} ${ce.modelo.modelo || ''}${ce.modelo.verificado ? '' : ' (a conferir)'}` : ''}`],
      ['Eficiência', `COP ${num(ce.cop, 2)}${ce.copInformado == null ? ' (mínimo da 90.1 adotado — informar o do fabricante)' : ''} · IPLV ${ce.iplv == null ? '—' : num(ce.iplv, 2)}${ce.iplvCalculado ? ' (AHRI 550/590: 0,01·A + 0,42·B + 0,45·C + 0,12·D)' : ''}`],
      ['Mínimo ASHRAE 90.1', `Path A: COP ${num(ce.minimo.a.cop, 2)} / IPLV ${num(ce.minimo.a.iplv, 2)} · Path B: ${num(ce.minimo.b.cop, 2)} / ${num(ce.minimo.b.iplv, 2)} — ${ce.atende.pathA ? 'atende Path A' : ce.atende.pathB ? 'atende Path B' : ce.atende.pathA === false ? 'NÃO atende' : 'informe COP e IPLV'} [CONFERIR edição]`],
      ['Água gelada', `${num(ce.tSaida, 1)} °C de saída, ΔT ${num(ce.dtAgua, 1)} K · ${num(ce.vazaoChiller, 2)} m³/h por chiller · ${num(ce.vazaoTotal, 2)} m³/h no secundário · tubo principal ${ce.tuboPrincipal.dn} (${num(ce.tuboPrincipal.v, 2)} m/s)`],
      ...(ce.condAgua ? [['Condensação', `rejeição ${num(ce.rejeicao, 1)} kW por chiller · ${num(ce.vazaoCond, 2)} m³/h (ΔT ${num(ce.dtCond, 1)} K) · torre ${num(ce.torreTr, 0)} TR de torre (15 000 BTU/h) [CONFERIR]`]] : []),
      ['Bombeamento', `${ce.arranjo === 'primario_secundario' ? 'primário constante + secundário variável (inversor)' : 'primário variável'} · rede ${ce.rede} m → ${num(ce.hRede, 1)} mca de atrito com singularidades`],
    ], tabela: { colunas: ['Tag', 'Função', 'Vazão (m³/h)', 'Altura (mca)', 'Eixo (kW)', 'Motor', 'In (A)', 'Partida', 'Tubo'], linhas: ce.bombas.map(b => [b.tag, b.funcao, num(b.vazaoM3h, 1), num(b.altura, 1), num(b.kwEixo, 2), `${num(b.motor.cv)} cv`, num(b.motor.in, 1), b.motor.partida.rotulo, b.tubo.dn]), proporcoes: [0.8, 1.3, 0.7, 0.7, 0.6, 0.6, 0.5, 1.3, 0.5], tamanho: 14 },
    notas: ['Vazão de água = P / (ρ·cp·ΔT). Potência da bomba = ρ·g·Q·H/η; motor comercial com 15 % de folga, dispositivos de partida pelo motor comum de motores (NBR IEC 60947-4-1/-4-2).'] });
  }
  if (calc.eletrica.cargas.length) s.push({ titulo: `${i++}. Cargas elétricas`, tabela: { colunas: ['Tag', 'Descrição', 'kW', 'In (A)', 'Partida'], linhas: calc.eletrica.cargas.map(c => [c.tag, c.descricao, num(c.kw, 2), c.in == null ? '—' : num(c.in, 1), c.partida]), proporcoes: [0.8, 2.8, 0.5, 0.5, 1.6], tamanho: 15 },
    notas: [`Total estimado ${num(calc.eletrica.totalKw, 1)} kW em ${num(calc.c.vff, 0)} V. Circuitos e quadro de HVAC pelas skills de elétrica/elétrica industrial e de quadros; pontos de automação pela skill de automação (BMS).`] });
  s.push({ titulo: `${i++}. Manutenção (PMOC)`, paragrafos: [calc.pmoc.obrigatoriedade.texto, `Inventário de ${calc.pmoc.inventario.itens.length} equipamento(s) e ${calc.pmoc.plano.linhas.length} rotina(s) — ver o documento "PMOC".`] });
  s.push({ titulo: `${i++}. Lista de materiais (preliminar)`, tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 1), m.referencia]), proporcoes: [0.8, 4, 0.5, 0.6, 1.6], tamanho: 15 } });
  s.push({ titulo: `${i++}. Pendências — valores a conferir na norma vigente`, marcadores: calc.pendencias });
  if (calc.avisos.length) s.push({ titulo: 'Avisos', marcadores: calc.avisos });
  return s;
}

// ── PMOC ────────────────────────────────────────────────────────────────────

const MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function secoesPmoc(res) {
  const { calc, dados } = res;
  const pm = calc.pmoc;
  const cli = dados.cliente || {};
  const s = [];
  s.push({ titulo: '1. Identificação do ambiente climatizado', kv: [
    ['Edificação', `${dados.obra?.nome || '(preencher)'} — ${cli.endereco || ''} ${[cli.cidade, cli.uf].filter(Boolean).join('/')}`.trim()],
    ['Proprietário / responsável legal', `${cli.nome || '(preencher)'}${cli.cnpj ? ` — CNPJ ${cli.cnpj}` : ''}`],
    ['Área climatizada', pm.areaClimatizada ? `${num(pm.areaClimatizada, 0)} m²` : '(preencher)'],
    ['Ocupantes', `fixos ${pm.ocupantes.fixos ?? '(preencher)'} · flutuantes ${pm.ocupantes.flutuantes ?? '(preencher)'}`],
    ['Capacidade instalada', `${num(pm.trTotal, 1)} TR (${num(pm.trTotal * 12000, 0)} BTU/h)`],
    ['Início da vigência', pm.inicio || '(preencher)'],
  ] });
  s.push({ titulo: '2. Responsável técnico', kv: [
    ['Nome', pm.rt.nome || '(preencher)'], ['Registro profissional (CREA/CFT)', pm.rt.registro || '(preencher)'], ['ART / TRT', pm.rt.art || '(preencher)'],
  ], notas: [pm.obrigatoriedade.texto] });
  s.push({ titulo: '3. Inventário dos equipamentos', tabela: { colunas: ['Tag', 'Tipo', 'Local', 'Capacidade', 'Qtd.', 'Fabricante / modelo / série'], linhas: pm.inventario.itens.map(e => [e.tag, e.rotulo, e.local, e.tr ? `${num(e.tr, 1)} TR` : '—', e.quantidade, [e.fabricante, e.modelo, e.serie].filter(Boolean).join(' / ') || '(preencher na implantação)']), proporcoes: [0.8, 1.4, 1.8, 0.7, 0.4, 1.6], tamanho: 15 },
    notas: [pm.inventario.origem === 'projeto' ? 'Inventário gerado a partir do projeto: completar fabricante, modelo e número de série na implantação.' : 'Inventário dos equipamentos existentes informados na vistoria.'] });
  s.push({ titulo: '4. Plano de manutenção, operação e controle — rotinas', paragrafos: ['Periodicidade: D diária · M mensal · T trimestral · S semestral · A anual. Rotinas típicas no espírito do Anexo I da Portaria MS 3.523/1998 e da ABNT NBR 13971 — ajustar às recomendações do fabricante de cada equipamento. [CONFERIR Anexo I e NBR 13971]'],
    tabela: { colunas: ['Equipamento', 'Tags', 'Rotina', 'Per.'], linhas: pm.plano.linhas.map(l => [l.rotulo, l.equipamentos, l.rotina, l.periodicidade]), proporcoes: [1.2, 1.2, 4, 0.4], tamanho: 14 } });
  s.push({ titulo: '5. Cronograma anual', tabela: { colunas: ['Rotina', ...MES], linhas: pm.plano.linhas.map(l => [`${l.rotulo}: ${l.rotina}`, ...MES.map((_, k) => (l.meses.includes(k + 1) ? l.periodicidade : ''))]), proporcoes: [4, ...MES.map(() => 0.32)], tamanho: 12 } });
  s.push({ titulo: '6. Recomendações permanentes (Portaria MS 3.523/1998, art. 5º)', marcadores: [
    'Manter limpos bandejas, serpentinas, umidificadores, ventiladores e dutos (a).',
    'Usar na limpeza produtos biodegradáveis registrados no Ministério da Saúde para esse fim (b).',
    'Verificar periodicamente os filtros e trocá-los quando necessário (c).',
    'Manter a caixa de mistura de uso exclusivo do sistema, sem materiais ou utensílios (d).',
    'Manter a captação de ar externo livre de fontes poluentes, com filtro classe G1 no mínimo (e).',
    'Garantir renovação de ar de no mínimo 27 m³/h por pessoa (f).',
    'Acondicionar as sujidades retiradas na limpeza em sacos resistentes (g).',
  ] });
  s.push({ titulo: '7. Qualidade do ar interior', paragrafos: [
    `Padrões referenciais: ${T.CRITERIOS_QAI.nbr17037.rotulo} — CO₂ até ${T.CRITERIOS_QAI.nbr17037.co2_acima_externo_ppm} ppm acima do ar externo; PM10 ${T.CRITERIOS_QAI.nbr17037.pm10} µg/m³ e PM2,5 ${T.CRITERIOS_QAI.nbr17037.pm25} µg/m³; ${T.CRITERIOS_QAI.nbr17037.t.join(' a ')} °C; UR ${T.CRITERIOS_QAI.nbr17037.ur.join(' a ')} %; velocidade do ar até ${num(T.CRITERIOS_QAI.nbr17037.v_max, 2)} m/s; análises semestrais por laboratório acreditado (ISO/IEC 17025), com amostra do ar externo no mesmo período. Valores pelo comunicado ABRAVA de 05/08/2024 — NBR 17037 não lida. [CONFERIR NBR 17037]`,
  ] });
  s.push({ titulo: '8. Registro de execução', tabela: { colunas: ['Data', 'Equipamento / tag', 'Rotina executada', 'Executante', 'Visto do RT'], linhas: Array.from({ length: 12 }, () => ['', '', '', '', '']), proporcoes: [0.8, 1.4, 3, 1.2, 1] }, notas: ['Manter o registro disponível no imóvel e divulgar aos ocupantes os procedimentos e resultados (Portaria 3.523, art. 6º c e d).'] });
  return s;
}

// ── Documentos ──────────────────────────────────────────────────────────────

const TIPOS_INSPECAO = { comissionamento: 'comissionamento / TAB', periodica: 'vistoria periódica (PMOC)', corretiva: 'após manutenção corretiva', qualidade_ar: 'avaliação da qualidade do ar interior' };

function cfgLaudo(res) {
  const { calc, med } = res;
  const ins = res.insp;
  return {
    titulo: 'RELATÓRIO DE VISTORIA E MEDIÇÕES — CLIMATIZAÇÃO', tipoInspecao: `Vistoria do sistema de climatização — ${TIPOS_INSPECAO[ins.tipo] || 'inspeção'}`, tituloCurto: 'Vistoria — climatização', sigla: 'REL-CLIM',
    objetivo: 'Verificar a instalação, a operação, a manutenção (PMOC) e a qualidade do ar interior do sistema de climatização, com medição das vazões de ar, das condições dos ambientes e da água gelada, frente ao projeto e às referências legais e normativas.',
    listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
    descricao: [['Sistema', `${calc.sel.rotulo} — ${textoSistema(calc)}`], ['Carga de projeto', `${num(calc.totais.tr, 1)} TR`], ['PMOC', calc.pmoc.obrigatoriedade.texto], ['Critério de qualidade do ar', med.rotuloCriterio]],
    metodologia: ['Inspeção visual dos equipamentos, casas de máquinas, dutos, difusores e tomadas de ar externo.', 'Medição de vazão nos difusores com balômetro (capelinha) ou anemômetro com cone.', 'Medição de temperatura, umidade relativa, CO₂ (interno e externo no mesmo período) e velocidade do ar a 1,1 m do piso.', 'Medição das temperaturas de entrada e saída da água gelada em cada chiller.', 'Conferência dos registros do PMOC e dos relatórios de qualidade do ar.'],
    medicoes: [
      { titulo: '6.1 Vazão por difusor', colunas: ['Local', 'Projeto (m³/h)', 'Medido (m³/h)', 'Desvio', 'Critério', 'Resultado'], proporcoes: [2.4, 0.8, 0.8, 0.6, 1.1, 0.8], linhas: med.vazoes.map(m => [m.local || m.ambiente, num(m.projeto, 0), num(m.medido_m3h, 0), m.desvio == null ? '' : `${num(m.desvio * 100, 0)} %`, m.criterio, m.resultado]) },
      { titulo: '6.2 Condições dos ambientes', colunas: ['Ambiente', 'TBS (°C)', 'UR (%)', 'CO₂ (ppm)', 'Limite CO₂', 'V (m/s)', 'Resultado'], proporcoes: [2, 0.6, 0.6, 0.7, 0.8, 0.6, 0.8], linhas: med.ambiente.map(m => [m.ambiente, num(m.tbs_c, 1), num(m.ur_pct, 0), num(m.co2_ppm, 0), m.limCo2 == null ? '(medir o externo)' : num(m.limCo2, 0), num(m.velocidade_ms, 2), m.resultado]),
        nota: `Critério ${med.rotuloCriterio}: ${med.q.t.join(' a ')} °C; UR ${med.q.ur.join(' a ')} %; CO₂ ${med.q.co2_acima_externo_ppm != null ? `até externo + ${med.q.co2_acima_externo_ppm} ppm` : `até ${med.q.co2_max_ppm} ppm`}; velocidade ≤ ${num(med.q.v_max, 2)} m/s. [CONFERIR]` },
      { titulo: '6.3 Água gelada', colunas: ['Equipamento', 'Entrada (°C)', 'Saída (°C)', 'ΔT (K)', 'Critério', 'Resultado'], proporcoes: [1.6, 0.8, 0.8, 0.6, 1.6, 0.8], linhas: med.agua.map(m => [m.equipamento, num(m.entrada_c, 1), num(m.saida_c, 1), num(m.dt, 1), m.criterio, m.resultado]) },
    ],
    proximaInspecao: [['Vistoria do PMOC', 'conforme o cronograma do PMOC (rotinas mensais a anuais)'], ['Qualidade do ar interior', 'semestral, por laboratório acreditado (NBR 17037) [CONFERIR]']],
  };
}

const colunasXls = (pares) => pares.map(([header, key, width, numFmt]) => ({ header, key, width: width || 14, ...(numFmt ? { numFmt } : {}) }));

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo e de cálculo', formato: 'Word', nome: 'Memorial_Climatizacao',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO E DE CÁLCULO — CLIMATIZAÇÃO', subtitulo: 'Carga térmica, ar externo, seleção do sistema, sistemas centrais e PMOC — ABNT NBR 16401', tituloCurto: 'Memorial — climatização', sigla: 'MEM-CLIM', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de carga térmica, equipamentos e materiais', formato: 'Excel', nome: 'Climatizacao',
    gerar: (res) => {
      const { calc } = res;
      const pj = calc.projeto;
      return D.gerarPlanilha([
        { nome: 'Carga térmica', colunas: colunasXls([['Ambiente', 'nome', 28], ['Uso', 'rotuloUso', 18], ['Área (m²)', 'area', 10, '0.0'], ['Pessoas', 'pessoas', 9], ['Envoltória (W)', 'env', 13, '0'], ['Pessoas S (W)', 'ps', 12, '0'], ['Pessoas L (W)', 'pl', 12, '0'], ['Iluminação (W)', 'il', 12, '0'], ['Equipamentos (W)', 'eq', 13, '0'], ['Ar externo S (W)', 'oas', 13, '0'], ['Ar externo L (W)', 'oal', 13, '0'], ['Sensível c/ FS (W)', 'sensivel', 14, '0'], ['Latente c/ FS (W)', 'latente', 14, '0'], ['Total (W)', 'total', 12, '0'], ['TR', 'tr', 8, '0.00'], ['BTU/h', 'btuh', 11, '#,##0'], ['Insuflamento (m³/h)', 'vInsM3h', 14, '0'], ['Ar externo (m³/h)', 'oa', 13, '0']]),
          linhas: calc.ambientes.map(a => ({ ...a, env: a.componentes.envoltoria, ps: a.componentes.pessoasS, pl: a.componentes.pessoasL, il: a.componentes.iluminacao, eq: a.componentes.equipamentos, oas: a.componentes.arExternoS, oal: a.componentes.arExternoL, oa: a.voz * 3.6 })) },
        { nome: 'Envoltória', colunas: colunasXls([['Ambiente', 'ambiente', 26], ['Superfície', 'descricao', 36], ['Área (m²)', 'area', 10, '0.0'], ['U (W/m²K)', 'u', 10, '0.00'], ['Carga (W)', 'q', 11, '0'], ['Cálculo', 'detalhe', 70]]), linhas: calc.ambientes.flatMap(a => a.superficies.map(x => ({ ...x, ambiente: a.nome }))) },
        ...(pj.unidades.length ? [{ nome: 'Unidades de ar', colunas: colunasXls([['Unidade', 'id', 10], ['Ambientes', 'amb', 40], ['Insuflamento (m³/h)', 'vFanM3h', 14, '0'], ['Ar externo (m³/h)', 'oa', 13, '0'], ['Ev', 'ev', 6, '0.00'], ['Serpentina (kW)', 'kw', 12, '0.0'], ['TR', 'tr', 8, '0.00'], ['Água (m³/h)', 'aguaM3h', 10, '0.00'], ['Pressão (Pa)', 'pressao', 10, '0'], ['Motor (cv)', 'cv', 9], ['Duto principal', 'duto', 16]]),
          linhas: pj.unidades.map(u => ({ ...u, amb: u.ambientes.join(', '), oa: u.votAdot * 3600, cv: u.motor.cv, duto: descricaoTrecho(u.dutos.principal) })) }] : []),
        ...(pj.unidades.some(u => u.vavs.length) ? [{ nome: 'VAV', colunas: colunasXls([['Ambiente', 'ambiente', 28], ['Máxima (m³/h)', 'max', 13, '0'], ['Mínima (m³/h)', 'min', 13, '0'], ['Zpz', 'zpz', 7, '0.00'], ['Caixas', 'caixas', 8], ['Entrada (mm)', 'ent', 11]]),
          linhas: pj.unidades.flatMap(u => u.vavs.map(v => ({ ambiente: v.ambiente, max: v.vMax * 3600, min: v.vMin * 3600, zpz: v.zpz, caixas: v.caixas, ent: v.entrada ? Math.round(v.entrada * 1000) : '' }))) }] : []),
        ...(pj.central ? [{ nome: 'Água gelada', colunas: colunasXls([['Tag', 'tag', 10], ['Função', 'funcao', 22], ['Vazão (m³/h)', 'vazaoM3h', 12, '0.0'], ['Altura (mca)', 'altura', 11, '0.0'], ['Eixo (kW)', 'kwEixo', 10, '0.00'], ['Motor (cv)', 'cv', 9], ['In (A)', 'in', 8, '0.0'], ['Partida', 'partida', 22], ['Tubo', 'dn', 8]]),
          linhas: pj.central.bombas.map(b => ({ ...b, cv: b.motor.cv, in: b.motor.in, partida: b.motor.partida.rotulo, dn: b.tubo.dn })) }] : []),
        { nome: 'Cargas elétricas', colunas: colunasXls([['Tag', 'tag', 12], ['Descrição', 'descricao', 50], ['kW', 'kw', 9, '0.00'], ['In (A)', 'in', 9, '0.0'], ['Partida', 'partida', 34]]), linhas: calc.eletrica.cargas },
        { nome: 'PMOC', colunas: colunasXls([['Equipamento', 'rotulo', 26], ['Tags', 'equipamentos', 30], ['Rotina', 'rotina', 80], ['Periodicidade', 'rotuloPeriodicidade', 13]]), linhas: calc.pmoc.plano.linhas },
        D.abaMateriais(calc.materiais),
      ], { titulo: 'Climatização' });
    } },
  { tipo: 'pmoc', rotulo: 'PMOC — Plano de Manutenção, Operação e Controle', formato: 'Word', nome: 'PMOC',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'PLANO DE MANUTENÇÃO, OPERAÇÃO E CONTROLE — PMOC', subtitulo: 'Lei 13.589/2018 · Portaria MS 3.523/1998 · ABNT NBR 13971 e NBR 17037', tituloCurto: 'PMOC', sigla: 'PMOC', secoes: secoesPmoc(res), listaNormas: NORMAS.filter(n => /13.589|3.523|RE 09|17037|13971|16401-3/.test(n[0])) })) },
  { tipo: 'laudo', rotulo: 'Relatório de vistoria e medições', formato: 'Word', nome: 'Vistoria_Climatizacao',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, cfgLaudo(res), { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Climatizacao',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, {
      titulo: 'CHECKLIST DE CAMPO — CLIMATIZAÇÃO', subtitulo: 'Vistoria, PMOC e medições (NBR 16401, Portaria 3.523, NBR 17037)', tituloCurto: 'Checklist — climatização', secoesChecklist: SECOES_CHECKLIST,
      preparacao: ['Combinar com a manutenção o acesso às casas de máquinas e o desligamento das unidades para inspeção.', 'Levar: balômetro (capelinha), anemômetro de fio quente, termo-higrômetro, medidor de CO₂ NDIR, termômetro de contato, lanterna e câmera; EPIs de trabalho em altura (NR-35).', 'Medir o CO₂ externo no mesmo período das medições internas.'],
      referencias: [['Carga de projeto', `${num(res.calc.totais.tr, 1)} TR`], ['Ar externo total', m3h(res.calc.totais.arExterno)], ...res.calc.projeto.unidades.map(u => [`${u.id} — insuflamento`, m3h(u.vFan)]), ...(res.calc.projeto.central ? [['ΔT de água gelada', `${num(res.calc.c.agua.dt, 1)} K`]] : [])],
      medicoes: [
        { titulo: 'Vazão por difusor', colunas: ['Local', 'Projeto (m³/h)', 'Medido (m³/h)', 'Obs.'], proporcoes: [2.4, 1, 1, 1.6], linhas: res.calc.projeto.unidades.flatMap(u => u.terminais.map(t => [`${t.ambiente} (${t.difusores} difusores)`, num(t.vazaoPorDifusor, 0), '', ''])) },
        { titulo: 'Condições dos ambientes', colunas: ['Ambiente', 'TBS', 'UR', 'CO₂', 'CO₂ ext.', 'V'], proporcoes: [2.2, 0.7, 0.7, 0.7, 0.7, 0.7], linhas: res.calc.ambientes.map(a => [a.nome, '', '', '', '', '']) },
      ],
    }, res.checklist)) },
];

// ── Orçamento ────────────────────────────────────────────────────────────────

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const pj = calc.projeto;
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade) => ({ secao: S, subgrupo: 'Climatização', codigo, descricao, quantidade, unidade });
  const obra = dados.obra?.nome || 'a edificação';
  let itens;
  let escopo;
  if (modo === 'pmoc') {
    const inv = calc.pmoc.inventario.itens;
    const nEq = inv.reduce((s, e) => s + e.quantidade, 0);
    itens = [
      srv('clim_pmoc_elaboracao', 'Elaboração do PMOC (inventário, rotinas, cronograma) com ART/TRT do responsável técnico', 1, 'vb'),
      srv('clim_manutencao', `Manutenção preventiva mensal conforme o PMOC (${nEq} equipamento(s), por equipamento × mês)`, nEq * 12, 'un'),
      srv('clim_qai', 'Análise da qualidade do ar interior por laboratório acreditado (campanha semestral, com amostra externa)', 2, 'un'),
      ...(calc.pmoc.obrigatoriedade.rtObrigatorio ? [srv('clim_rt', 'Responsabilidade técnica do PMOC (mensal)', 12, 'mês')] : []),
    ];
    escopo = `Implantação e execução do PMOC de ${obra} por 12 meses: elaboração do plano, manutenção preventiva mensal de ${nEq} equipamento(s), duas análises da qualidade do ar interior e responsabilidade técnica (Lei 13.589/2018; Portaria MS 3.523/1998).`;
  } else if (modo === 'vistoria') {
    const pontos = (res.insp.vazoes || []).length + (res.insp.ambiente || []).length + (res.insp.agua || []).length;
    itens = [
      srv('clim_vistoria', 'Vistoria técnica do sistema de climatização (equipamentos, dutos, PMOC e documentação)', 1, 'vb'),
      srv('clim_medicoes', 'Medições de vazão, temperatura, umidade, CO₂ e velocidade do ar (por ponto)', Math.max(pontos, calc.ambientes.length), 'pt'),
      srv('clim_laudo', 'Relatório técnico de vistoria com ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
    ];
    escopo = `Vistoria técnica e medições do sistema de climatização de ${obra}, com checklist, medição de vazões e da qualidade do ar e relatório técnico com ART.`;
  } else {
    const mat = calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Climatização', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade }));
    const qtd = (cod) => calc.materiais.filter(m => m.codigo === cod).reduce((s, m) => s + m.quantidade, 0);
    itens = [
      ...mat,
      ...(qtd('SPLIT') ? [srv('clim_split', 'Instalação de split (evaporadora, condensadora, interligação, dreno, vácuo e carga)', qtd('SPLIT'), 'un')] : []),
      ...(qtd('VRF-UI') ? [srv('clim_vrf_ui', 'Instalação de unidade interna VRF (com dreno e controle)', qtd('VRF-UI'), 'un')] : []),
      ...(qtd('VRF-UE') ? [srv('clim_vrf_ue', 'Instalação de unidade externa VRF (base, içamento, vácuo, carga e start-up)', qtd('VRF-UE'), 'un')] : []),
      ...(qtd('TUB-FRIG') ? [srv('clim_tubulacao_frigorigena', 'Tubulação frigorígena de cobre com isolamento, brasagem com nitrogênio e teste de estanqueidade', qtd('TUB-FRIG'), 'm')] : []),
      ...(qtd('SELF') ? [srv('clim_self', 'Instalação de self-contained / rooftop', qtd('SELF'), 'un')] : []),
      ...(qtd('FANCOIL') ? [srv('clim_fancoil', 'Instalação de fancoil/AHU (base, conexões hidráulicas, elétricas e de dutos)', qtd('FANCOIL'), 'un')] : []),
      ...(qtd('VAV') ? [srv('clim_vav', 'Instalação de caixa VAV com controlador', qtd('VAV'), 'un')] : []),
      ...(qtd('DUTO') ? [srv('clim_duto', 'Fabricação e montagem de duto de chapa galvanizada com isolamento e suportes', qtd('DUTO'), 'm²')] : []),
      ...(qtd('DIFUSOR') + qtd('GRELHA-RET') ? [srv('clim_difusor', 'Instalação de difusor/grelha com registro', qtd('DIFUSOR') + qtd('GRELHA-RET'), 'un')] : []),
      ...(qtd('CHILLER') ? [srv('clim_chiller', 'Instalação de chiller (içamento, base antivibração, conexões e start-up com o fabricante)', qtd('CHILLER'), 'un')] : []),
      ...(qtd('TORRE') ? [srv('clim_torre', 'Instalação de torre de resfriamento', qtd('TORRE'), 'un')] : []),
      ...(qtd('BOMBA') ? [srv('clim_bomba', 'Instalação de bomba de água (base, alinhamento, conexões)', qtd('BOMBA'), 'un')] : []),
      ...(qtd('TUBO-AG') ? [srv('clim_tubulacao_agua', 'Rede de água gelada em aço carbono com isolamento, suportes e teste hidrostático', qtd('TUBO-AG'), 'm')] : []),
      srv('clim_comissionamento', 'Comissionamento, testes, ajuste e balanceamento (TAB) com relatório', 1, 'vb'),
      srv('clim_pmoc_elaboracao', 'Elaboração do PMOC inicial com ART/TRT', 1, 'vb'),
      srv('clim_projeto', 'Projeto de climatização (memorial de carga térmica, desenhos e especificações) com ART', 1, 'vb'),
    ];
    escopo = `Fornecimento e instalação do sistema de climatização de ${obra} (${calc.sel.rotulo.toLowerCase()}, ${num(calc.totais.tr, 1)} TR de carga), com projeto, ART, comissionamento/TAB e PMOC inicial.`;
  }
  return {
    cliente_nome: dados.cliente?.nome || '', escopo, itens,
    observacoes: 'Rascunho gerado pela skill de climatização — equipamentos pré-selecionados e quantitativos preliminares; confirmar no catálogo/software dos fabricantes e com o traçado antes de enviar ao cliente. Quadro elétrico de HVAC pela skill de quadros; automação pela skill de automação.',
  };
}

// ── Formulário (tela do sistema) ────────────────────────────────────────────

const OP = {
  sistema: F.op([['auto', 'Automático (critério H&M)'], ...Object.entries(T.SISTEMAS).map(([k, v]) => [k, v.rotulo])]),
  distribuicao: F.op([['vac', 'Volume de ar constante'], ['vav', 'Volume de ar variável (VAV)']]),
  ez: F.op(Object.entries(T.EZ).map(([k, v]) => [k, `${v.rotulo} (Ez ${v.ez})`])),
  uso: F.op(Object.entries(AUT.AR_EXTERNO).map(([k, v]) => [k, v.rotulo])),
  atividade: F.op([['', '— (pelo uso)'], ...Object.entries(T.ATIVIDADES).map(([k, v]) => [k, v.rotulo])]),
  construcao: F.op(Object.entries(T.CONSTRUCOES).map(([k, v]) => [k, v.rotulo])),
  orientacao: F.op(Object.entries(T.ORIENTACOES)),
  cor: F.op([['clara', 'Clara'], ['media', 'Média'], ['escura', 'Escura']]),
  chiller: F.op(Object.entries(T.TIPOS_CHILLER).map(([k, v]) => [k, v.rotulo])),
  bombas: F.op([['primario_secundario', 'Primário constante + secundário variável'], ['primario_variavel', 'Primário variável']]),
  reaquecimento: F.op([['nenhum', 'Sem reaquecimento'], ['eletrico', 'Resistência elétrica'], ['agua_quente', 'Água quente']]),
  tipoEquip: F.op(Object.entries(T.TIPOS_EQUIPAMENTO)),
  criterio: F.op(Object.entries(T.CRITERIOS_QAI).map(([k, v]) => [k, v.rotulo])),
  forma: F.op([['retangular', 'Retangular'], ['circular', 'Circular']]),
  tipoInsp: F.op(Object.entries(TIPOS_INSPECAO)),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Condições de projeto e sistema', aberta: true, itens: [
    { tipo: 'nota', texto: 'Condições externas pela NBR 16401-1 (Anexo A) da cidade da obra; vazio = padrão de Brasília para pré-dimensionamento [CONFERIR].' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'projeto.cidade', rotulo: 'Cidade (dados climáticos)' },
      { caminho: 'projeto.altitude_m', rotulo: 'Altitude (m)', tipo: 'numero' },
      { caminho: 'projeto.tbs_externa_c', rotulo: 'TBS externa (°C)', tipo: 'numero' },
      { caminho: 'projeto.tbu_externa_c', rotulo: 'TBU externa coincidente (°C)', tipo: 'numero' },
      { caminho: 'projeto.tbs_interna_c', rotulo: 'TBS interna (°C)', tipo: 'numero' },
      { caminho: 'projeto.ur_interna_pct', rotulo: 'UR interna (%)', tipo: 'numero' },
      { caminho: 'projeto.fator_seguranca_pct', rotulo: 'Fator de segurança (%)', tipo: 'numero' },
      { caminho: 'projeto.simultaneidade', rotulo: 'Fator de simultaneidade (0,5–1)', tipo: 'numero' },
      { caminho: 'projeto.sistema', rotulo: 'Sistema', tipo: 'selecao', opcoes: OP.sistema },
      { caminho: 'projeto.distribuicao', rotulo: 'Distribuição de ar (dutado)', tipo: 'selecao', opcoes: OP.distribuicao },
      { caminho: 'projeto.distribuicao_ar', rotulo: 'Insuflamento/retorno (Ez)', tipo: 'selecao', opcoes: OP.ez },
      { caminho: 'projeto.delta_t_insuflamento_c', rotulo: 'ΔT de insuflamento (K)', tipo: 'numero' },
      { caminho: 'projeto.minimo_27_m3h_pessoa', rotulo: 'Mínimo de 27 m³/h·pessoa (Portaria 3.523)', tipo: 'check' },
      { caminho: 'projeto.uso_publico_coletivo', rotulo: 'Uso público e coletivo (PMOC — Lei 13.589)', tipo: 'check' },
      { caminho: 'projeto.distancia_condensadora_m', rotulo: 'Distância evaporadora–condensadora (m)', tipo: 'numero' },
      { caminho: 'eletrica.tensao_ff', rotulo: 'Tensão trifásica (V)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '3. Ambientes', aberta: true, itens: [
    { tipo: 'nota', texto: 'Pessoas vazio = densidade típica do uso (NBR 16401-3). Iluminação/equipamentos vazios = densidade padrão [CONFERIR]. "Unidade" agrupa os ambientes no mesmo fancoil/self (ex.: AHU-01).' },
    { tipo: 'tabela', caminho: 'ambientes', rotuloAdicionar: 'Adicionar ambiente', novaLinha: { id: 'A{n}', nome: '', uso: 'escritorio', area_m2: null, pe_direito_m: 2.7, pessoas: null, atividade: '', iluminacao_w_m2: null, equipamentos_w_m2: null, equipamentos_w: null, infiltracao_m3h: null, unidade: '', comprimento_ramal_m: null },
      colunas: [
        { campo: 'id', rotulo: 'Id', largura: 55 }, { campo: 'nome', rotulo: 'Ambiente' }, { campo: 'uso', rotulo: 'Uso', tipo: 'selecao', opcoes: OP.uso, largura: 150 },
        { campo: 'area_m2', rotulo: 'Área (m²)', tipo: 'numero', largura: 75 }, { campo: 'pe_direito_m', rotulo: 'Pé-dir. (m)', tipo: 'numero', largura: 70 }, { campo: 'pessoas', rotulo: 'Pessoas', tipo: 'numero', largura: 65 },
        { campo: 'atividade', rotulo: 'Atividade', tipo: 'selecao', opcoes: OP.atividade, largura: 170 }, { campo: 'iluminacao_w_m2', rotulo: 'Ilum. (W/m²)', tipo: 'numero', largura: 75 },
        { campo: 'equipamentos_w_m2', rotulo: 'Equip. (W/m²)', tipo: 'numero', largura: 75 }, { campo: 'equipamentos_w', rotulo: 'Equip. extra (W)', tipo: 'numero', largura: 80 },
        { campo: 'infiltracao_m3h', rotulo: 'Infiltr. (m³/h)', tipo: 'numero', largura: 75 }, { campo: 'unidade', rotulo: 'Unidade', largura: 80 }, { campo: 'comprimento_ramal_m', rotulo: 'Ramal (m)', tipo: 'numero', largura: 65 },
      ] },
  ] },
  { titulo: '4. Envoltória', itens: [
    { tipo: 'nota', texto: 'Uma linha por superfície exposta: ambiente (id ou nome), construção, orientação, área. U e FS vazios = típicos da construção [CONFERIR NBR 15220-3/fabricante].' },
    { tipo: 'tabela', caminho: 'envoltoria', rotuloAdicionar: 'Adicionar superfície', novaLinha: { ambiente: '', construcao: 'alvenaria', orientacao: 'N', area_m2: null, u_w_m2k: null, fs: null, cor: 'media', sombreamento_pct: 0 },
      colunas: [
        { campo: 'ambiente', rotulo: 'Ambiente', largura: 120 }, { campo: 'construcao', rotulo: 'Construção', tipo: 'selecao', opcoes: OP.construcao, largura: 230 },
        { campo: 'orientacao', rotulo: 'Orientação', tipo: 'selecao', opcoes: OP.orientacao, largura: 130 }, { campo: 'area_m2', rotulo: 'Área (m²)', tipo: 'numero', largura: 80 },
        { campo: 'u_w_m2k', rotulo: 'U (W/m²K)', tipo: 'numero', largura: 80 }, { campo: 'fs', rotulo: 'FS (vidro)', tipo: 'numero', largura: 75 },
        { campo: 'cor', rotulo: 'Cor', tipo: 'selecao', opcoes: OP.cor, largura: 90 }, { campo: 'sombreamento_pct', rotulo: 'Sombra (%)', tipo: 'numero', largura: 75 },
      ] },
  ] },
  { titulo: '5. Unidades de ar (fancoil/self) e VAV', itens: [
    { tipo: 'tabela', caminho: 'unidades', rotuloAdicionar: 'Adicionar unidade', novaLinha: { id: 'AHU-0{n}', comprimento_principal_m: null, curvas_principal: 3, forma_duto: 'retangular' },
      colunas: [{ campo: 'id', rotulo: 'Unidade', largura: 100 }, { campo: 'comprimento_principal_m', rotulo: 'Duto principal (m)', tipo: 'numero', largura: 120 }, { campo: 'curvas_principal', rotulo: 'Curvas', tipo: 'numero', largura: 80 }, { campo: 'forma_duto', rotulo: 'Forma do duto', tipo: 'selecao', opcoes: OP.forma, largura: 130 }] },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'ar.reaquecimento', rotulo: 'Reaquecimento das VAV', tipo: 'selecao', opcoes: OP.reaquecimento },
      { caminho: 'ar.vav_fracao_minima', rotulo: 'VAV: fração mínima (0–1)', tipo: 'numero' },
      { caminho: 'ar.vazao_difusor_m3h', rotulo: 'Vazão por difusor (m³/h)', tipo: 'numero' },
      { caminho: 'ar.dp_serpentina_pa', rotulo: 'Δp serpentina (Pa)', tipo: 'numero' },
      { caminho: 'ar.dp_filtros_pa', rotulo: 'Δp filtros sujos (Pa)', tipo: 'numero' },
      { caminho: 'ar.rendimento_ventilador', rotulo: 'Rendimento do ventilador', tipo: 'numero' },
      { caminho: 'ar.perda_alvo_pa_m', rotulo: 'Perda alvo no duto (Pa/m)', tipo: 'numero' },
      { caminho: 'ar.altura_max_duto_m', rotulo: 'Altura máx. do duto (m)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '6. Central de água gelada', itens: [
    { tipo: 'nota', texto: 'COP e COP a 100/75/50/25 % da carga do certificado AHRI 550/590 do fabricante (calcula o IPLV). Vazio = mínimo da ASHRAE 90.1 só para estimar [CONFERIR].' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'central.tipo_chiller', rotulo: 'Tipo de chiller', tipo: 'selecao', opcoes: OP.chiller },
      { caminho: 'central.chillers', rotulo: 'Chillers em operação', tipo: 'numero' },
      { caminho: 'central.chiller_reserva', rotulo: 'Chiller reserva (N+1)', tipo: 'check' },
      { caminho: 'central.t_saida_agua_c', rotulo: 'Saída da água gelada (°C)', tipo: 'numero' },
      { caminho: 'central.delta_t_agua_c', rotulo: 'ΔT da água gelada (K)', tipo: 'numero' },
      { caminho: 'central.cop', rotulo: 'COP a plena carga', tipo: 'numero' },
      { caminho: 'central.cop_100', rotulo: 'COP 100 %', tipo: 'numero' }, { caminho: 'central.cop_75', rotulo: 'COP 75 %', tipo: 'numero' },
      { caminho: 'central.cop_50', rotulo: 'COP 50 %', tipo: 'numero' }, { caminho: 'central.cop_25', rotulo: 'COP 25 %', tipo: 'numero' },
      { caminho: 'central.iplv', rotulo: 'IPLV informado', tipo: 'numero' },
      { caminho: 'central.arranjo_bombas', rotulo: 'Bombeamento', tipo: 'selecao', opcoes: OP.bombas },
      { caminho: 'central.bomba_reserva', rotulo: 'Bomba reserva', tipo: 'check' },
      { caminho: 'central.comprimento_rede_m', rotulo: 'Rede mais desfavorável, ida + volta (m)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '7. Equipamentos existentes (PMOC / vistoria)', itens: [
    { tipo: 'nota', texto: 'Preencha para PMOC ou vistoria de sistema existente. Vazio = inventário gerado pelo projeto.' },
    { tipo: 'tabela', caminho: 'equipamentos_existentes', rotuloAdicionar: 'Adicionar equipamento', novaLinha: { tag: '', tipo: 'split', local: '', capacidade_btuh: null, capacidade_tr: null, fabricante: '', modelo: '', serie: '', quantidade: 1 },
      colunas: [
        { campo: 'tag', rotulo: 'Tag', largura: 80 }, { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.tipoEquip, largura: 200 }, { campo: 'local', rotulo: 'Local' },
        { campo: 'capacidade_btuh', rotulo: 'BTU/h', tipo: 'numero', largura: 80 }, { campo: 'capacidade_tr', rotulo: 'TR', tipo: 'numero', largura: 60 },
        { campo: 'fabricante', rotulo: 'Fabricante', largura: 110 }, { campo: 'modelo', rotulo: 'Modelo', largura: 110 }, { campo: 'serie', rotulo: 'Nº série', largura: 100 }, { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 55 },
      ] },
  ] },
  { titulo: '8. PMOC', itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'pmoc.responsavel_tecnico', rotulo: 'Responsável técnico' },
      { caminho: 'pmoc.registro_profissional', rotulo: 'Registro (CREA/CFT)' },
      { caminho: 'pmoc.art_trt', rotulo: 'ART / TRT' },
      { caminho: 'pmoc.data_inicio', rotulo: 'Início da vigência', tipo: 'data' },
      { caminho: 'pmoc.ocupantes_fixos', rotulo: 'Ocupantes fixos', tipo: 'numero' },
      { caminho: 'pmoc.ocupantes_flutuantes', rotulo: 'Ocupantes flutuantes', tipo: 'numero' },
      { caminho: 'pmoc.area_climatizada_m2', rotulo: 'Área climatizada (m²)', tipo: 'numero' },
      { caminho: 'pmoc.uso_publico_coletivo', rotulo: 'Uso público e coletivo', tipo: 'check' },
    ] },
  ] },
  F.secaoInspecao(9, OP.tipoInsp),
  F.secaoChecklist(10, CHECKLIST.length),
  { titulo: '11. Medições', itens: [
    { tipo: 'grade', colunas: 4, campos: [{ caminho: 'inspecao.criterio_qai', rotulo: 'Critério de qualidade do ar', tipo: 'selecao', opcoes: OP.criterio }] },
    { tipo: 'tabela', caminho: 'inspecao.vazoes', rotuloAdicionar: 'Adicionar difusor medido', novaLinha: { local: '', ambiente: '', projeto_m3h: null, medido_m3h: null },
      colunas: [{ campo: 'local', rotulo: 'Local / difusor' }, { campo: 'ambiente', rotulo: 'Ambiente (id)', largura: 100 }, { campo: 'projeto_m3h', rotulo: 'Projeto (m³/h)', tipo: 'numero', largura: 110 }, { campo: 'medido_m3h', rotulo: 'Medido (m³/h)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'inspecao.ambiente', rotuloAdicionar: 'Adicionar ambiente medido', novaLinha: { ambiente: '', tbs_c: null, ur_pct: null, co2_ppm: null, co2_externo_ppm: null, velocidade_ms: null },
      colunas: [{ campo: 'ambiente', rotulo: 'Ambiente' }, { campo: 'tbs_c', rotulo: 'TBS (°C)', tipo: 'numero', largura: 80 }, { campo: 'ur_pct', rotulo: 'UR (%)', tipo: 'numero', largura: 75 }, { campo: 'co2_ppm', rotulo: 'CO₂ (ppm)', tipo: 'numero', largura: 85 }, { campo: 'co2_externo_ppm', rotulo: 'CO₂ externo', tipo: 'numero', largura: 90 }, { campo: 'velocidade_ms', rotulo: 'V (m/s)', tipo: 'numero', largura: 75 }] },
    { tipo: 'tabela', caminho: 'inspecao.agua', rotuloAdicionar: 'Adicionar medição de água gelada', novaLinha: { equipamento: '', entrada_c: null, saida_c: null },
      colunas: [{ campo: 'equipamento', rotulo: 'Equipamento' }, { campo: 'entrada_c', rotulo: 'Entrada (°C)', tipo: 'numero', largura: 100 }, { campo: 'saida_c', rotulo: 'Saída (°C)', tipo: 'numero', largura: 100 }] },
  ] },
  F.secaoNcs(12, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(13),
];

module.exports = criarDisciplina({
  chave: 'climatizacao',
  nome: 'Climatização — carga térmica, VRF/self/chiller, VAV e PMOC (NBR 16401 / Lei 13.589)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Instalação do sistema', descricao: 'Equipamentos, dutos, tubulações, terminais, comissionamento/TAB, projeto e PMOC inicial' },
    { modo: 'pmoc', rotulo: 'PMOC — manutenção por 12 meses', descricao: 'Elaboração do PMOC, manutenção preventiva mensal, análises de qualidade do ar e responsabilidade técnica' },
    { modo: 'vistoria', rotulo: 'Vistoria e medições', descricao: 'Checklist, medições de vazão e qualidade do ar, relatório e correção das não conformidades' },
  ],
  montarOrcamento,
});
