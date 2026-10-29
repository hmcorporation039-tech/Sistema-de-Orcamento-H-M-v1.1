// Disciplina CARREGADOR VEICULAR (NBR 17019:2022 + NBR 5410) — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { fmtNum } = require('../../../_comum/docx-base');
const { calcular } = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-condominio.json');

const NORMAS = [
  ['ABNT NBR 17019:2022', 'Instalações elétricas de BT — locais especiais — alimentação de veículos elétricos'],
  ['ABNT NBR 5410:2004 (versão corrigida 2008)', 'Instalações elétricas de baixa tensão'],
  ['ABNT NBR IEC 61851', 'Sistema de recarga condutiva para veículos elétricos'],
  ['ABNT NBR IEC 62196', 'Plugues, tomadas e conectores para veículos elétricos'],
  ['IEC 62955', 'Dispositivo de detecção de corrente residual contínua (RDC-DD) para modo 3'],
  ['Norma técnica da distribuidora local', 'Aumento de carga e padrão de entrada'],
];
const SECOES_CHECKLIST = ['Documentação', 'Circuito', 'Proteção diferencial', 'Proteção contra surtos', 'Equipamento', 'Sinalização e acesso'];
const num = fmtNum; // número pt-BR; '—' quando vazio ou inválido
const sec = (s) => (s == null ? '—' : `${String(s).replace('.', ',')} mm²`);
const MODO = { modo2: 'Modo 2 (tomada + cabo IC-CPD)', modo3_ac: 'Modo 3 (estação CA / wallbox)', modo4_dc: 'Modo 4 (estação CC rápida)' };

function processar(dados) {
  const calc = calcular(dados);
  const insp = dados.inspecao || {};
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, {
    ...(calc.publico ? {} : { P4: 'Uso privativo — DPS recomendado, não obrigatório (5.4.2.1.101)', S1: 'Uso privativo' }),
    ...(calc.circuitos.some(x => x.ponto.ao_tempo) ? {} : { E1: 'Instalação abrigada' }),
  });
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const dr = (insp.ensaios_dr || []).map(m => ({ ...m, resultado: m.tempo_ms == null || m.tempo_ms === '' ? 'NV' : Number(m.tempo_ms) <= 300 ? 'C' : 'NC' }));
  const isolamento = (insp.isolamento || []).map(m => ({ ...m, resultado: m.valor_mohm == null || m.valor_mohm === '' ? 'NV' : Number(m.valor_mohm) >= 0.5 ? 'C' : 'NC' }));
  return { dados, calc, insp, checklist, ncs, med: { dr, isolamento }, parecer: I.parecer(checklist, ncs, [...dr, ...isolamento]) };
}

function resumir(res) {
  const { calc } = res;
  const cap = calc.capacidade;
  return {
    indicadores: [
      { rotulo: 'Pontos de recarga', valor: String(calc.circuitos.length), detalhe: `${num(calc.somaVa / 1000)} kVA (fator de demanda 1)` },
      { rotulo: 'Corrente na distribuição', valor: `${num(calc.iDistrib, 1)} A na fase ${calc.faseCritica}`, detalhe: `${Object.entries(calc.correnteFaseDistrib).map(([f, i]) => `${f} ${num(i, 1)} A`).join(' · ')} — ${calc.controle ? 'limitada pelo controle de recarga' : 'sem controle de recarga (FD = 1)'}` },
      ...calc.circuitos.map(x => ({ rotulo: `Circuito ${x.id}`, valor: `${sec(x.secao)} · ${x.disjuntor} A`, detalhe: `Ib ${num(x.ib, 1)} A · ΔV ${num(x.queda)} % · DR ${x.dr.tipo}` })),
      ...(cap ? [{ rotulo: 'Padrão de entrada', valor: `${num(cap.iTotal, 1)} A de ${cap.inGeral} A (fase ${cap.fase})`, ok: cap.atende, detalhe: cap.atende ? 'carga adicional cabe na fase mais carregada' : 'pedir aumento de carga ou redistribuir as fases' }] : []),
      { rotulo: 'DPS', valor: calc.dps.obrigatorio ? 'obrigatório' : 'recomendado', detalhe: `${calc.dps.qtd} un · ${calc.dps.texto}` },
    ],
    textos: calc.avisos,
    tabelas: [{ titulo: 'Circuitos dos pontos de recarga', colunas: ['Ponto', 'Modo', 'Potência', 'Lig.', 'Fase', 'Ib (A)', 'Seção F/N/PE', 'Disjuntor', 'DR', 'ΔV %', 'Grau de proteção'],
      linhas: calc.circuitos.map(x => [`${x.id} — ${x.descricao}`, MODO[x.ponto.modo] || x.ponto.modo, `${num(x.ponto.potencia_kw)} kW`, x.ligacao, x.fases, num(x.ib, 1), `${sec(x.secao)} / ${x.secaoNeutro ? sec(x.secaoNeutro) : '—'} / ${sec(x.secaoPE)}`, `${x.polos}P ${x.disjuntor} A`, x.dr.tipo, num(x.queda), x.ip]) }],
  };
}

function secoesMemorial(res) {
  const { calc } = res;
  const c = calc.config;
  return [
    { titulo: '1. Objeto', paragrafos: [`Instalação elétrica fixa para alimentação de ${calc.circuitos.length} ponto(s) de recarga de veículo elétrico em ${res.dados.obra?.nome || 'a edificação'}, conforme a ABNT NBR 17019:2022 lida em conjunto com a ABNT NBR 5410. Alimentação ${c.vfn}/${c.vff} V, esquema ${c.esquema}${calc.publico ? ', local com afluência de público' : ', uso privativo'}.`] },
    { titulo: '2. Critérios da NBR 17019', marcadores: [
      'Circuito terminal exclusivo e proteção contra sobrecorrente individual para cada ponto de conexão (4.2.5.101 e 6.3.4.101).',
      'Fator de demanda igual a 1 no circuito terminal e na distribuição, salvo controle de recarga (4.2.1.1.102 e 4.2.1.1.103).',
      'DR individual com IΔn ≤ 30 mA, no mínimo tipo A; tipo AC não permitido (5.1.1.3 e 6.3.3.2.101). Em modo 3 com tomada IEC 62196: tipo B, ou tipo A/F com RDC-DD (IEC 62955), salvo se incorporado no carregador (6.3.3.2.102).',
      'No esquema TN, os circuitos dos pontos de conexão não podem ter condutor PEN (4.2.2.2.1.101).',
      `DPS ${calc.publico ? 'obrigatório (local com público, 5.4.2.1.101)' : 'recomendado'}; ao tempo IPX4 e IP4X; IK08 e proteção mecânica onde houver risco de impacto (6.1.3.2).`,
    ] },
    { titulo: '3. Dimensionamento dos circuitos (NBR 5410, 6.2)', paragrafos: [`Cabos de cobre ${c.isolacao === 'PVC' ? 'PVC' : 'EPR/XLPE 90 °C, 0,6/1 kV'}, método ${c.metodo}, temperatura ${c.temperatura} °C. Seção pelo maior entre capacidade de condução (Iz ≥ Ib e In ≤ Iz) e queda de tensão ≤ ${num(c.quedaTerminal)} %. Estações CC: corrente de entrada com rendimento de 95 %.`],
      tabela: { colunas: ['Ponto', 'Modo', 'kW', 'Lig.', 'Fase', 'Ib (A)', 'L (m)', 'Seção F/N/PE', 'Iz (A)', 'Disjuntor', 'DR', 'ΔV %'],
        linhas: calc.circuitos.map(x => [x.id, (MODO[x.ponto.modo] || '').split(' (')[0], num(x.ponto.potencia_kw), x.ligacao, x.fases, num(x.ib, 1), num(x.comprimento, 0), `${sec(x.secao)} / ${x.secaoNeutro ? sec(x.secaoNeutro) : '—'} / ${sec(x.secaoPE)}`, num(x.iz, 1), `${x.polos}P ${x.disjuntor} A`, `tipo ${x.dr.tipo}`, num(x.queda)]),
        proporcoes: [0.6, 0.8, 0.5, 0.45, 0.45, 0.6, 0.5, 1.6, 0.6, 0.9, 0.7, 0.5], tamanho: 15 },
      notas: calc.circuitos.map(x => `${x.id}: ${x.dr.texto}`) },
    { titulo: '4. Distribuição e capacidade do padrão de entrada (7.1.101)', paragrafos: [
      `Corrente dos pontos de recarga por fase (cada carregador monofásico numa fase; FD = 1): ${Object.entries(calc.correnteFaseDistrib).map(([f, i]) => `fase ${f} ${num(i, 1)} A`).join('; ')}${calc.controle ? ` (limitada a ${calc.inst.limite_controle_a} A por fase pelo controle de recarga)` : ''}. A verificação usa a fase mais carregada (${calc.faseCritica}: ${num(calc.iDistrib, 1)} A).`,
      calc.capacidade ? `Padrão de entrada: disjuntor geral ${calc.capacidade.inGeral} A; demanda existente suposta equilibrada nas fases (${num(calc.capacidade.iExistente, 1)} A por fase) + recarga na fase ${calc.capacidade.fase} ${num(calc.capacidade.iNovo, 1)} A = ${num(calc.capacidade.iTotal, 1)} A — ${calc.capacidade.atende ? 'a carga adicional cabe no padrão existente.' : 'EXCEDE o padrão existente: solicitar aumento de carga à distribuidora, redistribuir as fases ou adotar controle de recarga.'} [CONFERIR a distribuição real das cargas existentes por fase]` : 'Capacidade do padrão de entrada não informada. [CONFERIR com a distribuidora antes da instalação]',
      calc.alimentador ? `Alimentador do quadro de recarga: Ib = ${num(calc.alimentador.ib, 1)} A (fase mais carregada), ${sec(calc.alimentador.secao)}, disjuntor ${calc.alimentador.polos}P ${calc.alimentador.disjuntor} A (≥ Ib e ≥ o maior disjuntor a jusante, ${calc.alimentador.maiorJusante} A), queda ${num(calc.alimentador.queda)} %.` : '',
    ].filter(Boolean) },
    { titulo: '5. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 1), m.referencia]), proporcoes: [0.7, 4, 0.5, 0.6, 1.7] } },
    ...(calc.avisos.length ? [{ titulo: 'Avisos', marcadores: calc.avisos }] : []),
  ];
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial do ponto de recarga', formato: 'Word', nome: 'Memorial_Recarga_VE',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO E DE CÁLCULO — RECARGA DE VEÍCULOS ELÉTRICOS', subtitulo: 'ABNT NBR 17019:2022 e ABNT NBR 5410', tituloCurto: 'Memorial — recarga de VE', sigla: 'MEM-VE', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de circuitos e materiais', formato: 'Excel', nome: 'Recarga_VE',
    gerar: (res) => D.gerarPlanilha([
      { nome: 'Circuitos', colunas: [{ header: 'Ponto', key: 'id' }, { header: 'Descrição', key: 'descricao', width: 30 }, { header: 'Ligação', key: 'ligacao' }, { header: 'Fase', key: 'fases' }, { header: 'Ib (A)', key: 'ib', numFmt: '0.0' }, { header: 'Comprimento (m)', key: 'comprimento' }, { header: 'Seção (mm²)', key: 'secao' }, { header: 'Disjuntor (A)', key: 'disjuntor' }, { header: 'DR tipo', key: 'drTipo' }, { header: 'Queda (%)', key: 'queda', numFmt: '0.00' }],
        linhas: res.calc.circuitos.map(x => ({ ...x, drTipo: x.dr.tipo })) },
      D.abaMateriais(res.calc.materiais),
    ]) },
  { tipo: 'laudo', rotulo: 'Laudo de vistoria (NBR 17019)', formato: 'Word', nome: 'Laudo_Recarga_VE',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, {
      titulo: 'LAUDO DE VISTORIA — PONTO DE RECARGA DE VEÍCULO ELÉTRICO', tipoInspecao: 'Verificação conforme a ABNT NBR 17019:2022 e a ABNT NBR 5410, Seção 7', tituloCurto: 'Laudo — recarga de VE', sigla: 'LAUDO-VE',
      objetivo: 'Verificar a conformidade da instalação elétrica fixa destinada à recarga de veículos elétricos com a ABNT NBR 17019:2022, incluindo circuito exclusivo, proteção diferencial, proteção contra surtos, grau de proteção do equipamento e ensaios da NBR 5410.',
      listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
      descricao: res.calc.circuitos.map(x => [`Ponto ${x.id}`, `${x.descricao} — ${MODO[x.ponto.modo] || ''}, ${num(x.ponto.potencia_kw)} kW, ${sec(x.secao)}, ${x.polos}P ${x.disjuntor} A, DR tipo ${x.dr.tipo}`]),
      metodologia: ['Inspeção visual do quadro, circuito e estação de recarga.', 'Ensaios de isolamento e funcionamento do DR (NBR 5410, 7.3).', 'Teste funcional de recarga com veículo ou simulador, quando disponível.'],
      medicoes: [
        { titulo: '6.1 Ensaio do DR', colunas: ['Ponto', 'Tipo', 'IΔn (mA)', 'Tempo (ms)', 'Resultado'], proporcoes: [1.5, 0.8, 0.8, 0.8, 0.8], linhas: res.med.dr.map(m => [m.ponto, m.tipo || '', m.corrente_ma ?? 30, m.tempo_ms ?? '', m.resultado]) },
        { titulo: '6.2 Resistência de isolamento (≥ 0,5 MΩ a 500 V CC)', colunas: ['Circuito', 'Medido (MΩ)', 'Resultado'], proporcoes: [2, 1, 0.8], linhas: res.med.isolamento.map(m => [m.circuito, m.valor_mohm ?? '', m.resultado]) },
      ],
    }, { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
];

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade) => ({ secao: S, subgrupo: 'Recarga de VE', codigo, descricao, quantidade, unidade });
  const metros = calc.circuitos.reduce((s, x) => s + x.comprimento, 0);
  const itens = modo === 'vistoria'
    ? [srv('ve_vistoria', 'Vistoria e ensaios do ponto de recarga (NBR 17019 / NBR 5410)', calc.circuitos.length, 'un'), srv('ve_laudo', 'Laudo de vistoria do ponto de recarga com ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' }))]
    : [
      ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Recarga de VE', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      srv('ve_infraestrutura', 'Infraestrutura: eletrodutos, passagem e lançamento de cabos até o ponto de recarga', Math.ceil(metros), 'm'),
      srv('ve_quadro', 'Montagem do quadro de proteção do ponto de recarga (disjuntor, DR, DPS)', 1, 'un'),
      srv('ve_instalacao_carregador', 'Instalação, configuração e comissionamento da estação de recarga', calc.circuitos.length, 'un'),
      srv('ve_projeto', 'Projeto do ponto de recarga com memorial e ART', 1, 'vb'),
    ];
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: modo === 'vistoria'
      ? `Vistoria do(s) ponto(s) de recarga de veículo elétrico de ${dados.obra?.nome || 'a edificação'} conforme a ABNT NBR 17019, com ensaios e laudo técnico com ART.`
      : `Fornecimento e instalação de ${calc.circuitos.length} ponto(s) de recarga de veículo elétrico em ${dados.obra?.nome || 'a edificação'} conforme a ABNT NBR 17019: circuito exclusivo por ponto, DR ${[...new Set(calc.circuitos.map(x => `tipo ${x.dr.tipo}`))].join('/')} 30 mA, DPS, quadro de proteção, infraestrutura e comissionamento, com projeto e ART.`,
    observacoes: 'Rascunho gerado pela skill de recarga de VE — conferir quantidades e preços antes de enviar ao cliente.',
    itens,
  };
}

const OP = {
  tensoes: F.op([['127', '127 V (F-N)'], ['220', '220 V (F-N)']]),
  tensoesFF: F.op([['220', '220 V (F-F)'], ['380', '380 V (F-F)']]),
  sistema: F.op([['monofasico', 'Monofásico'], ['bifasico', 'Bifásico'], ['trifasico', 'Trifásico']]),
  esquema: F.op([['TN-S', 'TN-S'], ['TN-C-S', 'TN-C-S'], ['TT', 'TT']]),
  modo: F.op(Object.entries(MODO)),
  fases: F.op([['1', 'Monofásico'], ['3', 'Trifásico']]),
  faseQuadro: F.op([['', 'auto'], ['A', 'A'], ['B', 'B'], ['C', 'C'], ['AB', 'AB'], ['BC', 'BC'], ['AC', 'AC'], ['ABC', 'ABC']]),
  metodo: F.op([['B1', 'B1 — eletroduto aparente/embutido'], ['B2', 'B2 — cabo multipolar em eletroduto'], ['C', 'C — sobre parede/bandeja'], ['D', 'D — eletroduto enterrado'], ['E', 'E — bandeja perfurada']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Instalação existente e critérios', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'instalacao.tensao_fn', rotulo: 'Tensão F-N', tipo: 'selecao', opcoes: OP.tensoes },
      { caminho: 'instalacao.tensao_ff', rotulo: 'Tensão F-F', tipo: 'selecao', opcoes: OP.tensoesFF },
      { caminho: 'instalacao.sistema', rotulo: 'Sistema de alimentação', tipo: 'selecao', opcoes: OP.sistema },
      { caminho: 'instalacao.esquema', rotulo: 'Esquema de aterramento', tipo: 'selecao', opcoes: OP.esquema },
      { caminho: 'instalacao.metodo', rotulo: 'Método de instalação', tipo: 'selecao', opcoes: OP.metodo },
      { caminho: 'instalacao.temperatura', rotulo: 'Temperatura ambiente (°C)', tipo: 'numero' },
      { caminho: 'instalacao.disjuntor_geral_existente_a', rotulo: 'Disjuntor geral existente (A)', tipo: 'numero' },
      { caminho: 'instalacao.demanda_existente_kva', rotulo: 'Demanda existente (kVA)', tipo: 'numero' },
      { caminho: 'instalacao.comprimento_alimentador_m', rotulo: 'Comprimento do alimentador (m)', tipo: 'numero' },
      { caminho: 'instalacao.limite_controle_a', rotulo: 'Limite do controle de recarga (A)', tipo: 'numero' },
      { caminho: 'instalacao.eletroduto', rotulo: 'Tipo de eletroduto', dica: 'ex.: de aço galvanizado Ø 3/4"' },
      { caminho: 'instalacao.uso_publico', rotulo: 'Local com afluência de público', tipo: 'check' },
      { caminho: 'instalacao.controle_recarga', rotulo: 'Há controle de recarga (gestão de carga)', tipo: 'check' },
      { caminho: 'instalacao.quadro_recarga_dedicado', rotulo: 'Quadro de recarga dedicado com alimentador', tipo: 'check' },
    ] },
  ] },
  { titulo: '3. Pontos de recarga', aberta: true, itens: [
    { tipo: 'nota', texto: 'Um ponto por linha. Wallbox comum: modo 3, 7,4 kW monofásico. Marque "RDC-DD no carregador" se a ficha técnica indicar detecção de 6 mA CC (permite DR tipo A). "Fase no quadro": a fase de ligação de cada ponto (vazio = distribuição automática pela fase menos carregada) — o padrão de entrada e o alimentador são verificados pela fase mais carregada.' },
    { tipo: 'tabela', caminho: 'pontos', rotuloAdicionar: 'Adicionar ponto de recarga',
      novaLinha: { id: 'VE{n}', descricao: '', modo: 'modo3_ac', potencia_kw: 7.4, fases: '1', fase: '', comprimento_m: null, rdc_dd_incorporado: true, ao_tempo: false, protecao_impacto: false, fornecido_cliente: false, modelo: '' },
      colunas: [
        { campo: 'id', rotulo: 'Id', largura: 60 }, { campo: 'descricao', rotulo: 'Local / vaga' },
        { campo: 'modo', rotulo: 'Modo', tipo: 'selecao', opcoes: OP.modo, largura: 200 }, { campo: 'potencia_kw', rotulo: 'kW', tipo: 'numero', largura: 70 },
        { campo: 'fases', rotulo: 'Fases', tipo: 'selecao', opcoes: OP.fases, largura: 110 }, { campo: 'fase', rotulo: 'Fase no quadro', tipo: 'selecao', opcoes: OP.faseQuadro, largura: 90 }, { campo: 'comprimento_m', rotulo: 'Distância do quadro (m)', tipo: 'numero', largura: 110 },
        { campo: 'modelo', rotulo: 'Modelo', largura: 130 },
        { campo: 'rdc_dd_incorporado', rotulo: 'RDC-DD no carregador', tipo: 'check', largura: 90 }, { campo: 'ao_tempo', rotulo: 'Ao tempo', tipo: 'check', largura: 70 },
        { campo: 'protecao_impacto', rotulo: 'Risco de impacto', tipo: 'check', largura: 80 }, { campo: 'fornecido_cliente', rotulo: 'Carregador do cliente', tipo: 'check', largura: 90 },
      ] },
  ] },
  F.secaoInspecao(4, F.op([['vistoria', 'Vistoria / comissionamento'], ['periodica', 'Inspeção periódica']])),
  F.secaoChecklist(5, CHECKLIST.length),
  { titulo: '6. Ensaios', itens: [
    { tipo: 'tabela', caminho: 'inspecao.ensaios_dr', rotuloAdicionar: 'Adicionar ensaio de DR', novaLinha: { ponto: '', tipo: 'A', corrente_ma: 30, tempo_ms: null },
      colunas: [{ campo: 'ponto', rotulo: 'Ponto' }, { campo: 'tipo', rotulo: 'Tipo do DR', largura: 90 }, { campo: 'corrente_ma', rotulo: 'IΔn (mA)', tipo: 'numero', largura: 90 }, { campo: 'tempo_ms', rotulo: 'Tempo (ms)', tipo: 'numero', largura: 100 }] },
    { tipo: 'tabela', caminho: 'inspecao.isolamento', rotuloAdicionar: 'Adicionar medição de isolamento', novaLinha: { circuito: '', valor_mohm: null },
      colunas: [{ campo: 'circuito', rotulo: 'Circuito' }, { campo: 'valor_mohm', rotulo: 'Medido (MΩ)', tipo: 'numero', largura: 110 }] },
  ] },
  F.secaoNcs(7, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(8),
];

module.exports = criarDisciplina({
  chave: 'carregador',
  nome: 'Carregador veicular (NBR 17019)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Instalação do ponto de recarga', descricao: 'Materiais (com preço do catálogo), carregador e mão de obra de instalação' },
    { modo: 'vistoria', rotulo: 'Vistoria e laudo', descricao: 'Vistoria, ensaios e laudo de conformidade com a NBR 17019' },
  ],
  montarOrcamento,
});
