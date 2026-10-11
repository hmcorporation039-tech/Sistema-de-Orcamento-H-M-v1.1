// Disciplina USINA SOLAR FOTOVOLTAICA (micro/minigeração) — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { calcular, MESES } = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-residencia.json');

const NORMAS = [
  ['ABNT NBR 16690:2019', 'Instalações elétricas de arranjos fotovoltaicos — requisitos de projeto'],
  ['ABNT NBR 16612:2020', 'Cabos de potência para sistemas fotovoltaicos, até 1,8 kV CC'],
  ['ABNT NBR 16274:2014', 'Sistemas FV conectados à rede — documentação, comissionamento, inspeção e desempenho'],
  ['ABNT NBR 16149 / NBR 16150', 'Sistemas FV — características da interface de conexão com a rede'],
  ['ABNT NBR 5410:2004', 'Instalações elétricas de baixa tensão (lado CA)'],
  ['REN Aneel 1000/2021 e Lei 14.300/2022', 'Micro e minigeração distribuída e sistema de compensação'],
  ['CRESESB/CEPEL — Manual de Engenharia para Sistemas Fotovoltaicos (2014)', 'Dimensionamento do gerador, do inversor e das strings'],
];
const SECOES_CHECKLIST = ['Documentação', 'Arranjo fotovoltaico', 'Proteção CC', 'Inversor', 'Lado CA e conexão', 'Ensaios'];
const num = (v, c = 2) => (v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));
const sec = (s) => (s == null ? '—' : `${String(s).replace('.', ',')} mm²`);
const ROTULO_MES = { jan: 'Jan', fev: 'Fev', mar: 'Mar', abr: 'Abr', mai: 'Mai', jun: 'Jun', jul: 'Jul', ago: 'Ago', set: 'Set', out: 'Out', nov: 'Nov', dez: 'Dez' };

function processar(dados) {
  const calc = calcular(dados);
  const insp = dados.inspecao || {};
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, calc.precisaFusivel ? {} : { P2: 'Até 2 strings em paralelo por MPPT — fusível não exigido' });
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const bVoc = Number(dados.modulo?.coef_voc_pct ?? -0.28) / 100;
  const strings = (insp.strings || []).map(m => {
    const esperado = Number(m.modulos) > 0 ? Number(m.modulos) * Number(dados.modulo.voc) * (1 + bVoc * ((Number(m.temp_modulo) || 25) - 25)) : null;
    const desvio = esperado && Number(m.voc_medido) > 0 ? (Number(m.voc_medido) - esperado) / esperado * 100 : null;
    const isoOk = [m.iso_pos_mohm, m.iso_neg_mohm].every(v => v == null || v === '' || Number(v) >= 1);
    const medido = desvio != null || m.iso_pos_mohm != null;
    return { ...m, esperado, desvio, resultado: !medido ? 'NV' : (desvio == null || Math.abs(desvio) <= 5) && isoOk ? 'C' : 'NC' };
  });
  return { dados, calc, insp, checklist, ncs, strings, parecer: I.parecer(checklist, ncs, strings) };
}

function resumir(res) {
  const { calc } = res;
  const ca = calc.circuitosCa[0];
  return {
    indicadores: [
      { rotulo: 'Potência do gerador', valor: `${num(calc.pfv)} kWp`, detalhe: `${calc.nTotal} módulos de ${calc.wp} Wp · necessário ${num(calc.pfvNecessaria)} kWp` },
      { rotulo: 'Geração estimada', valor: `${num(calc.geracaoMes, 0)} kWh/mês`, detalhe: `${num(calc.geracaoAno, 0)} kWh/ano · HSP ${num(calc.hsp)} · TD ${num(calc.pr * 100, 0)} %` },
      { rotulo: 'Cobertura do consumo', valor: calc.cobertura == null ? '—' : `${num(calc.cobertura * 100, 0)} %`, detalhe: `consumo médio ${num(calc.media, 0)} kWh − disponibilidade ${calc.disponibilidade} kWh`, ok: calc.cobertura == null ? undefined : calc.cobertura >= 0.95 },
      { rotulo: 'Inversor', valor: `${calc.nInv} × ${num(calc.pca)} kW`, detalhe: `FDI ${num(calc.fdi)} (usual 0,75–1,05)`, ok: calc.fdi >= 0.75 && calc.fdi <= 1.05 },
      { rotulo: 'Strings', valor: calc.strings.join(' + '), detalhe: `faixa admissível ${calc.faixa.min}–${calc.faixa.max} módulos · Voc a ${calc.temperaturas.tMin} °C: ${num(calc.ns * calc.temperaturas.vocTmin, 0)} V` },
      { rotulo: 'Cabos', valor: `CC ${sec(calc.caboCc.secao)} · CA ${sec(ca.secao)}`, detalhe: `ΔV CC ${num(calc.caboCc.queda)} % · CA ${num(ca.queda)} % · disjuntor ${ca.polos}P ${ca.disjuntor} A` },
      ...(calc.economiaMes != null ? [{ rotulo: 'Economia estimada', valor: `R$ ${num(calc.economiaMes, 0)}/mês`, detalhe: 'sem o Fio B da Lei 14.300' }] : []),
    ],
    textos: calc.avisos,
    tabelas: [
      { titulo: 'Verificação das strings (CRESESB Eq. 6.30 a 6.32)', colunas: ['Verificação', 'Valor', 'Limite', 'Situação'], linhas: linhasVerificacao({ ...calc, inversorDados: res.dados.inversor }) },
      { titulo: 'Geração mensal estimada', colunas: MESES.map(m => ROTULO_MES[m]), linhas: [calc.geracaoMensal.map(g => num(g.kwh, 0))] },
    ],
  };
}

function linhasVerificacao(calc) {
  const t = calc.temperaturas;
  const inv = calc.inversorDados || {};
  const ok = (b) => (b ? 'atende' : 'NÃO atende');
  return [
    [`Voc da maior string a ${t.tMin} °C (${calc.ns} × ${num(t.vocTmin)} V)`, `${num(calc.ns * t.vocTmin, 0)} V`, `≤ ${num(t.vMaxSistema, 0)} V`, ok(calc.ns * t.vocTmin <= t.vMaxSistema)],
    [`Vmp da menor string a ${num(t.tModMax, 0)} °C (${calc.nsMin} × ${num(t.vmpTmax)} V)`, `${num(calc.nsMin * t.vmpTmax, 0)} V`, `≥ MPPT mín.`, ok(calc.nsMin >= calc.faixa.min)],
    [`Vmp da maior string a ${t.tMin} °C`, `${num(calc.ns * t.vmpTmin, 0)} V`, `≤ MPPT máx.`, ok(calc.ns <= calc.faixa.maxMppt)],
    ['Corrente de operação por MPPT', `${num(calc.iMpptOp, 1)} A`, inv.imax_mppt ? `≤ ${inv.imax_mppt} A` : '—', inv.imax_mppt ? ok(calc.iMpptOp <= inv.imax_mppt) : '—'],
    ['Corrente máxima da string (1,25 × Isc)', `${num(calc.iscMax, 1)} A`, `cabo Iz ${num(calc.caboCc.iz, 1)} A`, ok(calc.caboCc.iz >= calc.caboCc.iProjeto)],
    ['Fusível de string', calc.precisaFusivel ? `gPV ${calc.fusivel || '?'} A` : 'não exigido', calc.precisaFusivel ? `1,5–2,4 × Isc e ≤ ${calc.iReversa} A` : '≤ 2 strings por MPPT', '—'],
  ];
}

function secoesMemorial(res) {
  const { calc, dados } = res;
  const c = calc.config;
  const mod = dados.modulo || {};
  const inv = dados.inversor || {};
  const loc = dados.local || {};
  const ca = calc.circuitosCa[0];
  return [
    { titulo: '1. Objetivo', paragrafos: [`Sistema de ${calc.enquadramento.toLowerCase()} fotovoltaica conectado à rede de baixa tensão em ${dados.obra?.nome || 'a unidade consumidora'}, com ${num(calc.pfv)} kWp de módulos e ${num(calc.pcaTotal)} kW de inversores, para compensação de energia nos termos da REN Aneel 1000/2021 e da Lei 14.300/2022.`] },
    { titulo: '2. Descrição geral do consumidor', paragrafos: [
      `${dados.cliente?.nome || ''}${dados.cliente?.endereco ? `, ${dados.cliente.endereco}` : ''}${dados.cliente?.cidade ? ` — ${dados.cliente.cidade}/${dados.cliente.uf || ''}` : ''}. Uso: ${dados.obra?.uso || '—'}.`,
      `Atendimento ${dados.instalacao?.sistema || 'bifásico'} ${c.vfn}/${c.vff} V${dados.instalacao?.disjuntor_geral_a ? `, disjuntor do padrão de entrada ${dados.instalacao.disjuntor_geral_a} A (potência disponibilizada ≈ ${num(calc.pDisp, 1)} kW)` : ''}.`,
      `Consumo médio ${num(calc.media, 0)} kWh/mês${calc.meses ? ` (${calc.meses} meses de histórico)` : ''}; custo de disponibilidade ${calc.disponibilidade} kWh/mês; energia a compensar ${num(calc.energiaCompensar, 0)} kWh/mês.`,
    ] },
    { titulo: '3. Descrição geral da geração distribuída', paragrafos: [
      `Gerador: ${calc.nTotal} módulos ${mod.modelo || ''} de ${calc.wp} Wp (Voc ${num(mod.voc)} V, Vmp ${num(mod.vmp)} V, Isc ${num(mod.isc)} A, coef. Voc ${num(mod.coef_voc_pct)} %/°C), em ${calc.nStrings} string(s) de ${calc.strings.join(' + ')} módulos, instalados em ${loc.tipo_local || 'telhado'}${loc.orientacao ? `, orientação ${loc.orientacao}` : ''}${loc.inclinacao_graus ? `, inclinação ${loc.inclinacao_graus}°` : ''}. Área estimada ${num(calc.area, 0)} m².`,
      `Inversor: ${calc.nInv} × ${inv.modelo || ''} ${num(calc.pca)} kW, ${calc.nMppt} MPPT (faixa ${inv.mppt_min}–${inv.mppt_max} V, máx. ${inv.vmax_cc} V CC). FDI = ${num(calc.pcaTotal)} / ${num(calc.pfv)} = ${num(calc.fdi)} (faixa usual 0,75 a 1,05 — CRESESB Eq. 6.29).`,
    ],
    tabela: { colunas: ['Verificação', 'Valor', 'Limite', 'Situação'], linhas: linhasVerificacao({ ...calc, inversorDados: inv }), proporcoes: [2.6, 1, 1.3, 0.9] },
    notas: [`Temperatura do módulo: Tmód = Tamb + (NOCT − 20)/800 × 1000 = ${num(calc.temperaturas.tModMax, 1)} °C (CRESESB Eq. 4.7); mínima adotada ${calc.temperaturas.tMin} °C.`] },
    { titulo: '3.1 Cabos e proteções CC (NBR 16690 / NBR 16612)', marcadores: [
      `Cabo solar ${sec(calc.caboCc.secao)} 1,8 kV CC, cobre estanhado classe 5, ${calc.caboCc.exposicao === 'exposto' ? 'exposto ao sol' : 'protegido do sol'}: capacidade ${num(calc.caboCc.iz, 1)} A a ${calc.caboCc.taCabo} °C (Tabela C.2 da NBR 16612 × ${num(calc.caboCc.kt, 3)}) ≥ ${num(calc.caboCc.iProjeto, 1)} A; queda ${num(calc.caboCc.queda)} % em ${num(calc.caboCc.lCc, 0)} m.`,
      calc.precisaFusivel ? `Fusíveis gPV de ${calc.fusivel || '[definir]'} A nos polos + e − de cada string (${calc.stringsPorMppt} strings em paralelo por MPPT).` : 'Fusíveis de string não exigidos (até 2 strings em paralelo por MPPT; corrente reversa abaixo da suportável pelo módulo).',
      `Chave seccionadora CC sob carga${calc.stringBox ? ' em string box' : ' integrada ao inversor'}; DPS CC classe II Ucpv ${calc.ucpv} V${calc.caboCc.lCc > 10 ? ' junto ao inversor e junto ao arranjo (distância > 10 m)' : ' junto ao inversor'}.`,
      'Molduras e estruturas equipotencializadas e ligadas ao aterramento da edificação; cabos fixados e com área de laços mínima.',
    ] },
    { titulo: '3.2 Lado CA (NBR 5410)', paragrafos: [`Por inversor: circuito ${ca.ligacao} ${sec(ca.secao)} (PE ${sec(ca.secaoPE)}), ${num(ca.comprimento, 0)} m, disjuntor ${ca.polos}P ${ca.disjuntor} A (corrente de projeto 1,25 × nominal = ${num(ca.ib, 1)} A), queda ${num(ca.queda)} %; DPS CA classe II no quadro de conexão; placa de advertência de geração própria no padrão de entrada.`] },
    { titulo: '4. Previsão da produção de energia', paragrafos: [`E = P × HSP × 30 × TD = ${num(calc.pfv)} × ${num(calc.hsp)} × 30 × ${num(calc.pr)} = ${num(calc.geracaoMes, 0)} kWh/mês (${num(calc.geracaoAno, 0)} kWh/ano), ${calc.cobertura == null ? '' : `${num(calc.cobertura * 100, 0)} % da energia compensável.`}${calc.economiaMes != null ? ` Economia estimada R$ ${num(calc.economiaMes, 0)}/mês à tarifa de R$ ${num(calc.tarifa, 2)}/kWh, antes do Fio B da Lei 14.300.` : ''}`],
      tabela: { colunas: MESES.map(m => ROTULO_MES[m]), linhas: [calc.geracaoMensal.map(g => num(g.kwh, 0))], tamanho: 15 } },
    { titulo: '5. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 0), m.referencia]), proporcoes: [0.7, 4, 0.5, 0.6, 1.5] } },
    { titulo: '6. Anexos para a solicitação de acesso', marcadores: ['Formulário de solicitação de acesso da distribuidora', 'Diagrama unifilar', 'ART de projeto', 'Certificados de conformidade (Inmetro) dos inversores', 'Folhas de dados dos módulos e inversores'] },
    ...(calc.avisos.length ? [{ titulo: 'Avisos', marcadores: calc.avisos }] : []),
  ];
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo da usina', formato: 'Word', nome: 'Memorial_Usina_Solar',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO — SISTEMA FOTOVOLTAICO CONECTADO À REDE', subtitulo: 'Micro/minigeração distribuída — REN Aneel 1000/2021, ABNT NBR 16690 e NBR 5410', tituloCurto: 'Memorial — usina solar', sigla: 'MEM-FV', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de dimensionamento e materiais', formato: 'Excel', nome: 'Usina_Solar',
    gerar: (res) => D.gerarPlanilha([
      { nome: 'Geração', colunas: [{ header: 'Mês', key: 'mes' }, { header: 'HSP (kWh/m²·dia)', key: 'hsp', numFmt: '0.00' }, { header: 'Geração (kWh)', key: 'kwh', numFmt: '0' }], linhas: res.calc.geracaoMensal },
      { nome: 'Strings', colunas: [{ header: 'String', key: 'id' }, { header: 'Módulos', key: 'modulos' }, { header: 'Voc a Tmín (V)', key: 'voc', numFmt: '0' }, { header: 'Vmp a Tmáx (V)', key: 'vmp', numFmt: '0' }],
        linhas: res.calc.strings.map((m, i) => ({ id: `S${i + 1}`, modulos: m, voc: m * res.calc.temperaturas.vocTmin, vmp: m * res.calc.temperaturas.vmpTmax })) },
      D.abaMateriais(res.calc.materiais),
    ]) },
  { tipo: 'laudo', rotulo: 'Relatório de comissionamento / inspeção (NBR 16274)', formato: 'Word', nome: 'Laudo_Usina_Solar',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, {
      titulo: 'RELATÓRIO DE COMISSIONAMENTO E INSPEÇÃO — SISTEMA FOTOVOLTAICO', tipoInspecao: 'Inspeção e ensaios conforme a ABNT NBR 16274', tituloCurto: 'Laudo — usina solar', sigla: 'LAUDO-FV',
      objetivo: 'Verificar a conformidade do sistema fotovoltaico conectado à rede com o projeto, a ABNT NBR 16690, a ABNT NBR 5410 e os requisitos da distribuidora, por inspeção visual e ensaios de comissionamento da ABNT NBR 16274.',
      listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
      descricao: [['Gerador', `${res.calc.nTotal} × ${res.calc.wp} Wp = ${num(res.calc.pfv)} kWp em ${res.calc.nStrings} string(s) (${res.calc.strings.join(' + ')})`], ['Inversor', `${res.calc.nInv} × ${res.dados.inversor?.modelo || ''} ${num(res.calc.pca)} kW`], ['Enquadramento', res.calc.enquadramento]],
      metodologia: ['Inspeção visual do arranjo, estrutura, cabos, string box, inversor e quadro CA.', 'Ensaios por string: polaridade, tensão de circuito aberto, corrente e resistência de isolamento (NBR 16274).', 'Ensaio funcional e de desconexão do inversor ao abrir o disjuntor CA.'],
      medicoes: [{ titulo: '6.1 Ensaios por string (Voc esperado corrigido pela temperatura do módulo; tolerância ± 5 %; isolamento ≥ 1 MΩ)', colunas: ['String', 'Módulos', 'T mód. (°C)', 'Voc esperado', 'Voc medido', 'Desvio', 'Isc (A)', 'Iso + / − (MΩ)', 'Resultado'],
        proporcoes: [0.6, 0.6, 0.6, 0.8, 0.8, 0.6, 0.6, 0.9, 0.8],
        linhas: res.strings.map(m => [m.string, m.modulos ?? '', m.temp_modulo ?? '', m.esperado ? num(m.esperado, 1) : '', m.voc_medido ?? '', m.desvio == null ? '' : `${num(m.desvio, 1)} %`, m.isc_medido ?? '', `${m.iso_pos_mohm ?? ''} / ${m.iso_neg_mohm ?? ''}`, m.resultado]) }],
    }, { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
];

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade) => ({ secao: S, subgrupo: 'Usina solar', codigo, descricao, quantidade, unidade });
  const itens = modo === 'inspecao'
    ? [srv('sol_inspecao', 'Inspeção e ensaios por string (polaridade, Voc, Isc, isolamento — NBR 16274)', calc.nStrings, 'un'), srv('sol_laudo', 'Relatório de comissionamento/inspeção com ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' }))]
    : [
      ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Usina solar', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      srv('sol_estrutura', 'Instalação da estrutura de fixação (por módulo)', calc.nTotal, 'un'),
      srv('sol_modulo', 'Montagem dos módulos fotovoltaicos', calc.nTotal, 'un'),
      srv('sol_inversor', 'Instalação e configuração do inversor e do monitoramento', calc.nInv, 'un'),
      srv('sol_cc', 'Cabeamento CC, conectores MC4 e string box', 1, 'vb'),
      srv('sol_ca', 'Circuito CA, quadro de proteção e conexão ao quadro geral', 1, 'vb'),
      srv('sol_projeto_homologacao', 'Projeto, ART e homologação na distribuidora', 1, 'vb'),
      srv('sol_comissionamento', 'Comissionamento (NBR 16274) e start-up', 1, 'vb'),
    ];
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: modo === 'inspecao'
      ? `Inspeção e ensaios de comissionamento do sistema fotovoltaico de ${dados.obra?.nome || 'a unidade consumidora'} (${num(calc.pfv)} kWp, ${calc.nStrings} strings) conforme a ABNT NBR 16274, com relatório técnico e ART.`
      : `Fornecimento e instalação de usina solar fotovoltaica conectada à rede de ${num(calc.pfv)} kWp (${calc.nTotal} módulos de ${calc.wp} Wp e ${calc.nInv} inversor(es) de ${num(calc.pca)} kW) em ${dados.obra?.nome || 'a unidade consumidora'}, com geração estimada de ${num(calc.geracaoMes, 0)} kWh/mês, incluindo estrutura, cabeamento CC/CA, proteções, projeto, ART, homologação na distribuidora e comissionamento.`,
    observacoes: 'Rascunho gerado pela skill de usina solar — geração estimada com HSP e taxa de desempenho informadas; conferir equipamentos, quantidades e preços antes de enviar ao cliente.',
    itens,
  };
}

const OP = {
  tensoes: F.op([['127', '127 V (F-N)'], ['220', '220 V (F-N)']]),
  tensoesFF: F.op([['220', '220 V (F-F)'], ['380', '380 V (F-F)']]),
  sistema: F.op([['monofasico', 'Monofásico'], ['bifasico', 'Bifásico'], ['trifasico', 'Trifásico']]),
  local: F.op([['telhado', 'Telhado'], ['laje', 'Laje'], ['solo', 'Solo'], ['carport', 'Carport']]),
  fases: F.op([['1', 'Monofásico'], ['3', 'Trifásico']]),
  metodo: F.op([['B1', 'B1 — eletroduto aparente/embutido'], ['B2', 'B2 — cabo multipolar em eletroduto'], ['C', 'C — sobre parede/bandeja'], ['D', 'D — eletroduto enterrado']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Consumo (contas de energia)', aberta: true, itens: [
    { tipo: 'nota', texto: 'Preencha os 12 meses da conta (kWh) ou só a média. A potência sai do consumo menos o custo de disponibilidade (30/50/100 kWh).' },
    { tipo: 'grade', colunas: 6, campos: [
      ...MESES.map(m => ({ caminho: `consumo.${m}`, rotulo: `${ROTULO_MES[m]} (kWh)`, tipo: 'numero' })),
      { caminho: 'consumo.media_kwh', rotulo: 'Ou média (kWh/mês)', tipo: 'numero' },
      { caminho: 'sistema.fracao_pct', rotulo: 'Parcela a compensar (%)', tipo: 'numero' },
      { caminho: 'sistema.tarifa_kwh', rotulo: 'Tarifa (R$/kWh)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '3. Local e padrão de entrada (ficha de visita técnica)', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'local.tipo_local', rotulo: 'Local dos módulos', tipo: 'selecao', opcoes: OP.local },
      { caminho: 'local.tipo_telha', rotulo: 'Tipo de telha / estrutura' },
      { caminho: 'local.orientacao', rotulo: 'Orientação' },
      { caminho: 'local.inclinacao_graus', rotulo: 'Inclinação (°)', tipo: 'numero' },
      { caminho: 'local.hsp', rotulo: 'HSP no plano (kWh/m²·dia)', tipo: 'numero', dica: 'CRESESB SunData' },
      { caminho: 'local.tamb_min', rotulo: 'Temperatura mínima (°C)', tipo: 'numero' },
      { caminho: 'local.tamb_max', rotulo: 'Temperatura máxima (°C)', tipo: 'numero' },
      { caminho: 'local.area_disponivel_m2', rotulo: 'Área disponível (m²)', tipo: 'numero' },
      { caminho: 'local.dist_arranjo_inversor_m', rotulo: 'Distância arranjo → inversor (m)', tipo: 'numero' },
      { caminho: 'local.dist_inversor_quadro_m', rotulo: 'Distância inversor → quadro (m)', tipo: 'numero' },
      { caminho: 'instalacao.sistema', rotulo: 'Atendimento', tipo: 'selecao', opcoes: OP.sistema },
      { caminho: 'instalacao.disjuntor_geral_a', rotulo: 'Disjuntor do padrão (A)', tipo: 'numero' },
      { caminho: 'instalacao.tensao_fn', rotulo: 'Tensão F-N', tipo: 'selecao', opcoes: OP.tensoes },
      { caminho: 'instalacao.tensao_ff', rotulo: 'Tensão F-F', tipo: 'selecao', opcoes: OP.tensoesFF },
      { caminho: 'instalacao.metodo', rotulo: 'Método de instalação CA', tipo: 'selecao', opcoes: OP.metodo },
      { caminho: 'sistema.aterramento_existente', rotulo: 'Aterramento existente', tipo: 'check' },
    ] },
  ] },
  { titulo: '4. Módulo fotovoltaico (folha de dados)', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'modulo.modelo', rotulo: 'Fabricante / modelo', largura: 'inteira' },
      { caminho: 'modulo.potencia_wp', rotulo: 'Potência (Wp)', tipo: 'numero' },
      { caminho: 'modulo.voc', rotulo: 'Voc (V)', tipo: 'numero' },
      { caminho: 'modulo.vmp', rotulo: 'Vmp (V)', tipo: 'numero' },
      { caminho: 'modulo.isc', rotulo: 'Isc (A)', tipo: 'numero' },
      { caminho: 'modulo.imp', rotulo: 'Imp (A)', tipo: 'numero' },
      { caminho: 'modulo.coef_voc_pct', rotulo: 'Coef. Voc (%/°C)', tipo: 'numero' },
      { caminho: 'modulo.coef_pmax_pct', rotulo: 'Coef. Pmáx (%/°C)', tipo: 'numero' },
      { caminho: 'modulo.noct', rotulo: 'NOCT (°C)', tipo: 'numero' },
      { caminho: 'modulo.comprimento_m', rotulo: 'Comprimento (m)', tipo: 'numero' },
      { caminho: 'modulo.largura_m', rotulo: 'Largura (m)', tipo: 'numero' },
      { caminho: 'modulo.corrente_reversa_max_a', rotulo: 'Fusível série máx. (A)', tipo: 'numero' },
      { caminho: 'modulo.tensao_max_sistema', rotulo: 'Tensão máx. do sistema (V)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '5. Inversor (folha de dados) e opções', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'inversor.modelo', rotulo: 'Fabricante / modelo', largura: 'inteira' },
      { caminho: 'inversor.potencia_ca_w', rotulo: 'Potência CA (W)', tipo: 'numero' },
      { caminho: 'inversor.quantidade', rotulo: 'Quantidade (vazio = calcular)', tipo: 'numero' },
      { caminho: 'inversor.fases', rotulo: 'Saída', tipo: 'selecao', opcoes: OP.fases },
      { caminho: 'inversor.vmax_cc', rotulo: 'Tensão máx. CC (V)', tipo: 'numero' },
      { caminho: 'inversor.mppt_min', rotulo: 'MPPT mínimo (V)', tipo: 'numero' },
      { caminho: 'inversor.mppt_max', rotulo: 'MPPT máximo (V)', tipo: 'numero' },
      { caminho: 'inversor.n_mppt', rotulo: 'Nº de MPPT', tipo: 'numero' },
      { caminho: 'inversor.strings_por_mppt', rotulo: 'Strings por MPPT', tipo: 'numero' },
      { caminho: 'inversor.imax_mppt', rotulo: 'Corrente máx. por MPPT (A)', tipo: 'numero' },
      { caminho: 'inversor.isc_max_mppt', rotulo: 'Isc máx. por MPPT (A)', tipo: 'numero' },
      { caminho: 'sistema.pr', rotulo: 'Taxa de desempenho (0,70–0,80)', tipo: 'numero' },
      { caminho: 'sistema.n_modulos', rotulo: 'Nº de módulos (vazio = calcular)', tipo: 'numero' },
      { caminho: 'sistema.modulos_por_string', rotulo: 'Módulos por string (vazio = calcular)', tipo: 'numero' },
      { caminho: 'sistema.queda_cc_max_pct', rotulo: 'Queda máx. CC (%)', tipo: 'numero' },
      { caminho: 'sistema.temp_cabo', rotulo: 'Temperatura junto aos cabos (°C)', tipo: 'numero' },
      { caminho: 'sistema.cabo_exposto_sol', rotulo: 'Cabos CC expostos ao sol', tipo: 'check' },
      { caminho: 'sistema.string_box', rotulo: 'String box externa', tipo: 'check' },
    ] },
  ] },
  F.secaoInspecao(6, F.op([['comissionamento', 'Comissionamento'], ['periodica', 'Inspeção periódica']])),
  F.secaoChecklist(7, CHECKLIST.length),
  { titulo: '8. Ensaios por string (NBR 16274)', itens: [
    { tipo: 'tabela', caminho: 'inspecao.strings', rotuloAdicionar: 'Adicionar string', novaLinha: { string: 'S{n}', modulos: null, temp_modulo: null, voc_medido: null, isc_medido: null, iso_pos_mohm: null, iso_neg_mohm: null },
      colunas: [{ campo: 'string', rotulo: 'String', largura: 80 }, { campo: 'modulos', rotulo: 'Módulos', tipo: 'numero', largura: 80 }, { campo: 'temp_modulo', rotulo: 'T módulo (°C)', tipo: 'numero', largura: 100 },
        { campo: 'voc_medido', rotulo: 'Voc medido (V)', tipo: 'numero' }, { campo: 'isc_medido', rotulo: 'Isc/Iop (A)', tipo: 'numero' }, { campo: 'iso_pos_mohm', rotulo: 'Iso + (MΩ)', tipo: 'numero' }, { campo: 'iso_neg_mohm', rotulo: 'Iso − (MΩ)', tipo: 'numero' }] },
  ] },
  F.secaoNcs(9, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(10),
];

module.exports = criarDisciplina({
  chave: 'solar',
  nome: 'Usina solar fotovoltaica (NBR 16690 / REN 1000)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Instalação da usina', descricao: 'Módulos, inversor, estrutura, cabos, proteções, projeto, homologação e comissionamento' },
    { modo: 'inspecao', rotulo: 'Comissionamento / inspeção', descricao: 'Ensaios por string, relatório NBR 16274 e correção das não conformidades' },
  ],
  montarOrcamento,
});
