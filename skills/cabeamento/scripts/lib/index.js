// Disciplina CABEAMENTO ESTRUTURADO (NBR 14565:2019) — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { calcular } = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-escritorio.json');

const NORMAS = [
  ['ABNT NBR 14565:2019', 'Cabeamento estruturado para edifícios comerciais'],
  ['ABNT NBR 16415', 'Caminhos e espaços para cabeamento estruturado'],
  ['ISO/IEC 14763-1', 'Administração do cabeamento'],
  ['ABNT NBR 5410 e ABNT NBR 5419', 'Aterramento, equipotencialização e proteção contra surtos'],
];
const SECOES_CHECKLIST = ['Documentação', 'Topologia e distâncias', 'Área de trabalho', 'Racks e distribuidores', 'Instalação'];
const num = (v, c = 2) => (v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));

function processar(dados) {
  const calc = calcular(dados);
  const insp = dados.inspecao || {};
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, calc.pavimentos.some(p => p.aps) ? {} : { A3: 'Sem pontos de acesso sem fio no escopo' });
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const certificacao = (insp.certificacao || []).map(m => {
    const comp = Number(m.comprimento_m);
    const passou = m.resultado_teste === 'aprovado' || m.resultado_teste === true;
    const reprovado = m.resultado_teste === 'reprovado' || m.resultado_teste === false;
    let resultado = 'NV';
    if (passou || reprovado) resultado = passou && !(comp > 90) ? 'C' : 'NC';
    return { ...m, resultado };
  });
  return { dados, calc, insp, checklist, ncs, certificacao, parecer: I.parecer(checklist, ncs, certificacao) };
}

function resumir(res) {
  const { calc } = res;
  return {
    indicadores: [
      { rotulo: 'Pontos de telecomunicações', valor: String(calc.pontos), detalhe: `${calc.pavimentos.reduce((a, p) => a + p.areasTrabalho, 0)} áreas de trabalho × ${calc.cfg.tomadasPorArea} tomadas + APs/extras` },
      { rotulo: `Cabo horizontal máximo (classe ${calc.classe})`, valor: `${num(calc.hMax, 1)} m`, detalhe: `Tabela 3 · F = ${num(calc.cfg.F)} m · ${num(calc.cfg.temperatura, 0)} °C` },
      { rotulo: 'Cabo', valor: `${num(calc.caboM, 0)} m`, detalhe: `${calc.caixas} caixa(s) de 305 m` },
      { rotulo: 'Distribuidores de piso', valor: String(calc.fds), detalhe: calc.backbone ? `backbone óptico ${num(calc.backboneM, 0)} m` : 'sem backbone' },
      { rotulo: 'Patch panels / switches', valor: `${calc.pavimentos.reduce((a, p) => a + p.paineis, 0)} / ${calc.pavimentos.reduce((a, p) => a + p.switches, 0)}`, detalhe: `${calc.cfg.portasPainel} e ${calc.cfg.portasSwitch} portas` },
      ...((res.insp.certificacao || []).length ? [{ rotulo: 'Certificação', valor: `${res.certificacao.filter(c => c.resultado === 'C').length}/${res.certificacao.length} aprovados`, ok: res.certificacao.every(c => c.resultado !== 'NC') }] : []),
    ],
    textos: calc.avisos,
    tabelas: [{ titulo: 'Pontos por pavimento', colunas: ['Pavimento', 'Área útil (m²)', 'Áreas de trabalho', 'Tomadas AT', 'APs', 'Extras', 'Pontos', 'Dist. média/máx. (m)', 'FD', 'Rack'],
      linhas: calc.pavimentos.map(p => [p.nome, num(p.area, 0), p.areasTrabalho, p.tomadasAt, p.aps, p.extra, p.pontos, `${num(p.dMed, 0)} / ${num(p.dMax, 0)}`, p.fds, `${p.rackU}U`]) }],
  };
}

function secoesMemorial(res) {
  const { calc } = res;
  const c = calc.cfg;
  return [
    { titulo: '1. Objeto', paragrafos: [`Sistema de cabeamento estruturado de ${res.dados.obra?.nome || 'a edificação'} conforme a ABNT NBR 14565:2019, classe ${calc.classe} (componentes Cat ${c.categoria}${c.blindado ? ', blindados' : ''}), topologia estrela a partir do(s) distribuidor(es) de piso.`] },
    { titulo: '2. Pontos de telecomunicações (6.7.7 e Seção 15)', paragrafos: [
      `Área de trabalho adotada de ${num(c.areaTrabalho)} m² (dimensão conforme ABNT NBR 16415 — [CONFERIR] com o leiaute), com ${c.tomadasPorArea} tomadas por área de trabalho (6.7.7.1: mínimo de duas). Áreas de cobertura sem fio com duas tomadas por ponto de acesso (15.4), recomendando-se cabeamento Cat 6A/OM3 (15.3.4).`,
    ],
    tabela: { colunas: ['Pavimento', 'Área (m²)', 'Áreas de trabalho', 'Tomadas', 'APs', 'Extras', 'Total'], linhas: calc.pavimentos.map(p => [p.nome, num(p.area, 0), p.areasTrabalho, p.tomadasAt, p.aps, p.extra, p.pontos]), proporcoes: [1.6, 0.9, 1, 0.8, 0.6, 0.6, 0.7] } },
    { titulo: '3. Comprimentos (8.2.1 e Tabela 3)', paragrafos: [
      `Cabo horizontal máximo H = ${c.modelo === 'conexao_cruzada' ? 'conexão cruzada' : 'interconexão'} classe ${calc.classe} com patch cords somando F = ${num(c.F)} m e relação de perda X = ${num(c.X)}: H = ${num(calc.hMax, 1)} m${c.temperatura > 20 ? `, já reduzido para ${num(c.temperatura, 0)} °C (nota da Tabela 3)` : ''}. Restrições: canal ≤ 100 m, cabo horizontal ≤ 90 m, patch cords e jumpers ≤ 5 m, ponto de consolidação a ≥ 15 m do distribuidor e ≥ 5 m da tomada (8.2.1.2).`,
      `Distribuidores de piso: ao menos um por piso e um a cada 1 000 m² de área de escritório (6.7.3), e tantos quantos necessários para que o ponto mais distante fique dentro de H. Total: ${calc.fds}.`,
    ] },
    { titulo: '4. Distribuidores, racks e ativos', tabela: { colunas: ['Pavimento', 'FD', 'Patch panels', 'Switches', 'U necessários por rack', 'Rack'], linhas: calc.pavimentos.map(p => [p.nome, p.fds, p.fds > 1 ? `${p.paineis} (${p.paineisPorFd} por FD)` : p.paineis, p.fds > 1 ? `${p.switches} (${p.switchesPorFd} por FD)` : p.switches, p.uNecessario, `${p.rackU}U`]), proporcoes: [1.6, 0.6, 1, 1, 1, 0.8] },
      notas: [`U por rack = (patch panels + switches) × 2U (cada um com organizador de 1U) + 2U de régua/bandeja, com reserva de ${c.reservaRack} %; cada distribuidor de piso tem os próprios patch panels e switches. Racks e blindagens aterrados ao BEP (12.3).${calc.backbone ? ` Backbone em fibra multimodo OM3 de ${num(calc.backboneM, 0)} m, um lance por distribuidor de piso (estimativa: subida + 15 m, e FDs adicionais do mesmo piso afastados ≈ distância máxima ÷ nº de FDs) [CONFERIR].` : ''}`] },
    { titulo: '5. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 0), m.referencia]), proporcoes: [0.6, 4, 0.5, 0.6, 1.5] },
      notas: [`Cabo estimado por ponto = distância média + ${c.folgaPonto} m de folga (sobras no rack e na tomada).`] },
    ...(calc.avisos.length ? [{ titulo: 'Avisos', marcadores: calc.avisos }] : []),
  ];
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial de cabeamento estruturado', formato: 'Word', nome: 'Memorial_Cabeamento',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO — CABEAMENTO ESTRUTURADO', subtitulo: 'ABNT NBR 14565:2019', tituloCurto: 'Memorial — cabeamento', sigla: 'MEM-CAB', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de pontos e materiais', formato: 'Excel', nome: 'Cabeamento',
    gerar: (res) => D.gerarPlanilha([
      { nome: 'Pontos', colunas: [{ header: 'Pavimento', key: 'nome', width: 20 }, { header: 'Área útil (m²)', key: 'area' }, { header: 'Áreas de trabalho', key: 'areasTrabalho' }, { header: 'Tomadas', key: 'tomadasAt' }, { header: 'APs', key: 'aps' }, { header: 'Extras', key: 'extra' }, { header: 'Pontos', key: 'pontos' }, { header: 'Cabo (m)', key: 'cabo', numFmt: '0' }, { header: 'Rack (U)', key: 'rackU' }], linhas: res.calc.pavimentos },
      { nome: 'Certificação', colunas: [{ header: 'Ponto', key: 'ponto', width: 14 }, { header: 'Comprimento (m)', key: 'comprimento_m' }, { header: 'Resultado do teste', key: 'resultado_teste', width: 18 }, { header: 'Situação', key: 'resultado' }], linhas: res.certificacao },
      D.abaMateriais(res.calc.materiais),
    ]) },
  { tipo: 'laudo', rotulo: 'Relatório de inspeção / certificação', formato: 'Word', nome: 'Laudo_Cabeamento',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, {
      titulo: 'RELATÓRIO DE INSPEÇÃO E CERTIFICAÇÃO — CABEAMENTO ESTRUTURADO', tipoInspecao: 'Verificação conforme a ABNT NBR 14565:2019', tituloCurto: 'Relatório — cabeamento', sigla: 'REL-CAB',
      objetivo: 'Verificar a conformidade do cabeamento estruturado com a ABNT NBR 14565:2019: topologia, comprimentos, tomadas por área de trabalho, distribuidores, aterramento, identificação e resultados de certificação dos canais.',
      listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
      descricao: [['Classe / categoria', `${res.calc.classe} / Cat ${res.calc.cfg.categoria}`], ['Pontos', String(res.calc.pontos)], ['Distribuidores de piso', String(res.calc.fds)]],
      metodologia: ['Inspeção visual de racks, encaminhamentos e tomadas.', 'Conferência dos relatórios de certificação (certificador de campo) por canal/enlace permanente.', 'Verificação de identificação e documentação (ISO/IEC 14763-1).'],
      medicoes: [{ titulo: '6.1 Certificação dos canais', colunas: ['Ponto', 'Comprimento (m)', 'Teste', 'Resultado'], proporcoes: [1.5, 1, 1.2, 0.8], linhas: res.certificacao.map(m => [m.ponto, m.comprimento_m ?? '', m.resultado_teste ?? '', m.resultado]), nota: 'Reprovado ou cabo horizontal acima de 90 m = NC.' }],
    }, { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
];

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade) => ({ secao: S, subgrupo: 'Cabeamento estruturado', codigo, descricao, quantidade, unidade });
  const itens = modo === 'certificacao'
    ? [srv('cab_certificacao', 'Certificação e etiquetagem dos pontos', calc.pontos, 'pt'), srv('cab_relatorio', 'Relatório de certificação e inspeção com ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' }))]
    : [
      ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Cabeamento estruturado', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      srv('cab_passagem', 'Passagem de cabeamento (infraestrutura + lançamento de cabos)', 1, 'vb'),
      srv('rede_ponto', 'Conectorização de ponto de rede/dados (RJ-45 + patch panel + teste)', calc.pontos, 'pt'),
      srv('cab_racks', 'Montagem e organização dos racks (patch panels, guias, PDU)', calc.fds, 'un'),
      srv('cab_certificacao', 'Certificação e etiquetagem dos pontos', calc.pontos, 'pt'),
      srv('cab_projeto', 'Projeto de cabeamento estruturado com ART', 1, 'vb'),
    ];
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: modo === 'certificacao'
      ? `Certificação e inspeção do cabeamento estruturado de ${dados.obra?.nome || 'a edificação'} (${calc.pontos} pontos) conforme a ABNT NBR 14565, com relatório e ART.`
      : `Fornecimento e instalação de cabeamento estruturado classe ${calc.classe} (Cat ${calc.cfg.categoria}) em ${dados.obra?.nome || 'a edificação'}: ${calc.pontos} pontos, ${calc.fds} distribuidor(es) de piso${calc.backbone ? ', backbone óptico' : ''}, racks organizados, certificação e identificação de todos os pontos conforme ABNT NBR 14565.`,
    observacoes: 'Rascunho gerado pela skill de cabeamento — conferir quantidades e preços antes de enviar ao cliente.',
    itens,
  };
}

const OP = {
  categoria: F.op([['5e', 'Cat 5e (classe D)'], ['6', 'Cat 6 (classe E)'], ['6A', 'Cat 6A (classe EA)'], ['7A', 'Cat 7A (classe FA)']]),
  modelo: F.op([['interconexao', 'Interconexão (patch panel → switch)'], ['conexao_cruzada', 'Conexão cruzada']]),
  teste: F.op([['', '—'], ['aprovado', 'Aprovado'], ['reprovado', 'Reprovado']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Critérios do sistema', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.categoria', rotulo: 'Categoria', tipo: 'selecao', opcoes: OP.categoria },
      { caminho: 'sistema.modelo', rotulo: 'Modelo de conexão', tipo: 'selecao', opcoes: OP.modelo },
      { caminho: 'sistema.blindado', rotulo: 'Cabo blindado', tipo: 'check' },
      { caminho: 'sistema.temperatura', rotulo: 'Temperatura de operação (°C)', tipo: 'numero' },
      { caminho: 'sistema.patch_cords_total_m', rotulo: 'Patch cords no canal (m)', tipo: 'numero', dica: 'Tabela 2: até 10 m' },
      { caminho: 'sistema.area_trabalho_m2', rotulo: 'Área de trabalho (m²)', tipo: 'numero', dica: 'NBR 16415 — típico 10 m²' },
      { caminho: 'sistema.tomadas_por_area', rotulo: 'Tomadas por área de trabalho', tipo: 'numero' },
      { caminho: 'sistema.portas_patch_panel', rotulo: 'Portas por patch panel', tipo: 'numero' },
      { caminho: 'sistema.portas_switch', rotulo: 'Portas por switch', tipo: 'numero' },
      { caminho: 'sistema.folga_por_ponto_m', rotulo: 'Folga de cabo por ponto (m)', tipo: 'numero' },
      { caminho: 'sistema.reserva_rack_pct', rotulo: 'Reserva no rack (%)', tipo: 'numero' },
      { caminho: 'sistema.pe_direito_m', rotulo: 'Altura entre pavimentos (m)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '3. Pavimentos', aberta: true, itens: [
    { tipo: 'nota', texto: 'Distância média e máxima: percurso do cabo do distribuidor de piso até as tomadas. Extras: pontos de CFTV, telefonia, automação etc.' },
    { tipo: 'tabela', caminho: 'pavimentos', rotuloAdicionar: 'Adicionar pavimento', novaLinha: { nome: '', area_util_m2: null, distancia_media_m: 30, distancia_max_m: null, aps: 0, pontos_extra: 0 },
      colunas: [{ campo: 'nome', rotulo: 'Pavimento' }, { campo: 'area_util_m2', rotulo: 'Área útil (m²)', tipo: 'numero', largura: 110 }, { campo: 'distancia_media_m', rotulo: 'Dist. média (m)', tipo: 'numero', largura: 110 }, { campo: 'distancia_max_m', rotulo: 'Dist. máxima (m)', tipo: 'numero', largura: 110 }, { campo: 'aps', rotulo: 'Pontos de acesso Wi-Fi', tipo: 'numero', largura: 120 }, { campo: 'pontos_extra', rotulo: 'Pontos extras', tipo: 'numero', largura: 100 }] },
  ] },
  F.secaoInspecao(4, F.op([['certificacao', 'Certificação / entrega'], ['periodica', 'Inspeção']])),
  F.secaoChecklist(5, CHECKLIST.length),
  { titulo: '6. Certificação dos pontos', itens: [
    { tipo: 'tabela', caminho: 'inspecao.certificacao', rotuloAdicionar: 'Adicionar ponto certificado', novaLinha: { ponto: '', comprimento_m: null, resultado_teste: '' },
      colunas: [{ campo: 'ponto', rotulo: 'Ponto' }, { campo: 'comprimento_m', rotulo: 'Comprimento (m)', tipo: 'numero', largura: 130 }, { campo: 'resultado_teste', rotulo: 'Resultado', tipo: 'selecao', opcoes: OP.teste, largura: 140 }] },
  ] },
  F.secaoNcs(7, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(8),
];

module.exports = criarDisciplina({
  chave: 'cabeamento',
  nome: 'Cabeamento estruturado (NBR 14565)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Instalação do cabeamento', descricao: 'Cabos, tomadas, patch panels, racks, ativos e mão de obra' },
    { modo: 'certificacao', rotulo: 'Certificação e relatório', descricao: 'Certificação dos pontos, relatório e correção das não conformidades' },
  ],
  montarOrcamento,
});
