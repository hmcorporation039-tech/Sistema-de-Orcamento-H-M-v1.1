// Disciplina CABEAMENTO ESTRUTURADO (NBR 14565:2025) — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { fmtNum } = require('../../../_comum/docx-base');
const { calcular } = require('./calculo');
const { gerarCaderno } = require('./caderno');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-escritorio.json');

const NORMAS = [
  ['ABNT NBR 14565:2025', 'Cabeamento estruturado para edifícios comerciais (edição de 13/11/2025, que substituiu a de 2019; itens e tabelas citados conferidos na edição 2019 [CONFERIR numeração na 2025])'],
  ['ABNT NBR 16415', 'Caminhos e espaços para cabeamento estruturado'],
  ['ISO/IEC 14763-1', 'Administração do cabeamento'],
  ['ABNT NBR 5410:2004 (versão corrigida 2008) e ABNT NBR 5419', 'Aterramento, equipotencialização, proteção contra surtos (DPS, 6.3.5) e taxa de ocupação de eletrodutos (6.2.11.1.6)'],
  ['ANSI/TIA-607-D', 'Aterramento e equipotencialização de telecomunicações — barra do rack e condutor ao TGB/BEP'],
];
const SECOES_CHECKLIST = ['Documentação', 'Topologia e distâncias', 'Área de trabalho', 'Racks e distribuidores', 'Instalação'];
const num = fmtNum; // número pt-BR; '—' quando vazio ou inválido

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
    { titulo: '1. Objeto', paragrafos: [`Sistema de cabeamento estruturado de ${res.dados.obra?.nome || 'a edificação'} conforme a ABNT NBR 14565:2025, classe ${calc.classe} (componentes Cat ${c.categoria}${c.blindado ? ', blindados' : ''}), topologia estrela a partir do(s) distribuidor(es) de piso.`] },
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
    { titulo: '4.1 Energia, proteção e aterramento dos racks', marcadores: [
      `DPS no circuito que alimenta cada rack: ${calc.dps.texto}; ${calc.dps.uc.texto}. [CONFERIR com o projeto elétrico]`,
      ...calc.pavimentos.filter(p => p.nobreak).map(p => `${p.nome}: nobreak de ${p.nobreak.va} VA por distribuidor (carga ≈ ${num(p.cargaRackW, 0)} W: ${p.switchesPorFd} switch(es)${p.apsPorFd ? ` e ${p.apsPorFd} AP(s) por PoE` : ''}; FP 0,7 e margem de 1,25) com bateria de 12 V ${p.nobreak.bateriaAh} Ah${p.nobreak.nBaterias > 1 ? ` × ${p.nobreak.nBaterias}` : ''} para ${c.autonomiaMin} min (consumos típicos [CONFERIR]).`),
      `Barra de aterramento em cada rack, com jumpers dos equipamentos e blindagens, ligada ao TGB/BEP por cabo de 16 mm² verde-amarelo (ANSI/TIA-607-D: mínimo 6 AWG) [CONFERIR com o projeto de aterramento/SPDA].`,
    ] },
    { titulo: '4.2 Encaminhamento (taxa de ocupação)', paragrafos: [
      `Eletroduto de distribuição ${calc.eletroduto.bitola} (Ø interno ≈ ${num(calc.eletroduto.di, 1)} mm, catálogo [CONFERIR]): até ${calc.eletroduto.capacidade} cabos de Ø ${num(c.diametroCabo, 1)} mm na taxa de ocupação de 40 % (NBR 5410, 6.2.11.1.6: 53 % para 1 cabo, 31 % para 2, 40 % para 3 ou mais). Estimativa: ${num(calc.eletroduto.percursoCabos, 0)} m de percurso de cabos ÷ ${calc.eletroduto.capacidade} = ${calc.eletroduto.metros} m [CONFERIR traçado].`,
      ...calc.pavimentos.map(p => `${p.nome}: saída de cada rack com ${p.pontosPorFd} cabos → ${p.troncoSaida.quantidade > 1 ? `${p.troncoSaida.quantidade} × ` : ''}eletroduto ${p.troncoSaida.bitola} (ou eletrocalha) no trecho junto ao rack.`),
    ] },
    { titulo: '5. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 0), m.referencia]), proporcoes: [0.6, 4, 0.5, 0.6, 1.5] },
      notas: [`Cabo estimado por ponto = distância média + ${c.folgaPonto} m de folga (sobras no rack e na tomada).`] },
    ...(calc.avisos.length ? [{ titulo: 'Avisos', marcadores: calc.avisos }] : []),
  ];
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial de cabeamento estruturado', formato: 'Word', nome: 'Memorial_Cabeamento',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO — CABEAMENTO ESTRUTURADO', subtitulo: 'ABNT NBR 14565:2025', tituloCurto: 'Memorial — cabeamento', sigla: 'MEM-CAB', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de pontos e materiais', formato: 'Excel', nome: 'Cabeamento',
    gerar: (res) => D.gerarPlanilha([
      { nome: 'Pontos', colunas: [{ header: 'Pavimento', key: 'nome', width: 20 }, { header: 'Área útil (m²)', key: 'area' }, { header: 'Áreas de trabalho', key: 'areasTrabalho' }, { header: 'Tomadas', key: 'tomadasAt' }, { header: 'APs', key: 'aps' }, { header: 'Extras', key: 'extra' }, { header: 'Pontos', key: 'pontos' }, { header: 'Cabo (m)', key: 'cabo', numFmt: '0' }, { header: 'Rack (U)', key: 'rackU' }], linhas: res.calc.pavimentos },
      { nome: 'Certificação', colunas: [{ header: 'Ponto', key: 'ponto', width: 14 }, { header: 'Comprimento (m)', key: 'comprimento_m' }, { header: 'Resultado do teste', key: 'resultado_teste', width: 18 }, { header: 'Situação', key: 'resultado' }], linhas: res.certificacao },
      D.abaMateriais(res.calc.materiais),
    ]) },
  { tipo: 'laudo', rotulo: 'Relatório de inspeção / certificação', formato: 'Word', nome: 'Laudo_Cabeamento',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, {
      titulo: 'RELATÓRIO DE INSPEÇÃO E CERTIFICAÇÃO — CABEAMENTO ESTRUTURADO', tipoInspecao: 'Verificação conforme a ABNT NBR 14565:2025', tituloCurto: 'Relatório — cabeamento', sigla: 'REL-CAB',
      objetivo: 'Verificar a conformidade do cabeamento estruturado com a ABNT NBR 14565:2025: topologia, comprimentos, tomadas por área de trabalho, distribuidores, aterramento, identificação e resultados de certificação dos canais.',
      listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
      descricao: [['Classe / categoria', `${res.calc.classe} / Cat ${res.calc.cfg.categoria}`], ['Pontos', String(res.calc.pontos)], ['Distribuidores de piso', String(res.calc.fds)]],
      metodologia: ['Inspeção visual de racks, encaminhamentos e tomadas.', 'Conferência dos relatórios de certificação (certificador de campo) por canal/enlace permanente.', 'Verificação de identificação e documentação (ISO/IEC 14763-1).'],
      medicoes: [{ titulo: '6.1 Certificação dos canais', colunas: ['Ponto', 'Comprimento (m)', 'Teste', 'Resultado'], proporcoes: [1.5, 1, 1.2, 0.8], linhas: res.certificacao.map(m => [m.ponto, m.comprimento_m ?? '', m.resultado_teste ?? '', m.resultado]), nota: 'Reprovado ou cabo horizontal acima de 90 m = NC.' }],
    }, { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Cabeamento',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, {
      titulo: 'CHECKLIST DE CAMPO — CABEAMENTO ESTRUTURADO', subtitulo: 'Inspeção e certificação (ABNT NBR 14565:2025, NBR 16415, NBR 5410)', tituloCurto: 'Checklist — cabeamento', secoesChecklist: SECOES_CHECKLIST,
      preparacao: [
        'Levar a planta com a identificação dos pontos, o certificador de campo com os adaptadores de enlace permanente/canal da categoria do projeto e a trena.',
        'Combinar com o cliente o desligamento dos pontos em uso durante a certificação e o teste do nobreak sem energia.',
        'Registrar em cada ponto: comprimento, resultado do certificador e identificação nas duas pontas.',
      ],
      referencias: [
        ['Pontos de telecomunicações', String(res.calc.pontos)],
        [`Cabo horizontal máximo (classe ${res.calc.classe})`, `${num(res.calc.hMax, 1)} m (Tabela 3)`],
        ['Distribuidores de piso / racks', res.calc.pavimentos.map(p => `${p.nome}: ${p.fds} × ${p.rackU}U`).join(' · ')],
        ...res.calc.pavimentos.filter(p => p.nobreak).map(p => [`Nobreak — ${p.nome}`, `${p.nobreak.va} VA · ${res.calc.cfg.autonomiaMin} min`]),
        ['Eletroduto de distribuição', `${res.calc.eletroduto.bitola}: até ${res.calc.eletroduto.capacidade} cabos (taxa ≤ 40 %)`],
      ],
      medicoes: [{ titulo: 'Certificação ponto a ponto', colunas: ['Ponto', 'Comprimento (m)', 'Certificador', 'Identificação ok', 'Obs.'], proporcoes: [0.8, 0.9, 1, 0.9, 2], linhas: [] }],
    }, res.checklist)) },
  // PDF: um rack por distribuidor de piso, um capítulo de desenhos/materiais por rack
  { tipo: 'caderno', rotulo: 'Caderno de fabricação e montagem do rack', formato: 'PDF', nome: 'Caderno_Fabricacao_Rack', gerar: (res) => gerarCaderno(res) },
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
  esquema: F.op([['TN-S', 'TN-S'], ['TN-C-S', 'TN-C-S'], ['TT', 'TT'], ['IT', 'IT']]),
  eletroduto: F.op(['1/2"', '3/4"', '1"', '1 1/4"', '1 1/2"', '2"'].map(b => [b, `PVC rígido ${b}`])),
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
      { caminho: 'sistema.tensao_pdu_v', rotulo: 'Tensão da PDU do rack (V)', tipo: 'numero' },
      { caminho: 'sistema.distancia_tgb_m', rotulo: 'Distância do rack ao TGB/BEP (m)', tipo: 'numero' },
      { caminho: 'sistema.esquema_aterramento', rotulo: 'Esquema de aterramento (DPS)', tipo: 'selecao', opcoes: OP.esquema },
      { caminho: 'sistema.nobreak', rotulo: 'Nobreak por rack', tipo: 'check' },
      { caminho: 'sistema.autonomia_min', rotulo: 'Autonomia do nobreak (min)', tipo: 'numero', dica: 'Padrão 30 min' },
      { caminho: 'sistema.eletroduto_bitola', rotulo: 'Eletroduto de distribuição', tipo: 'selecao', opcoes: OP.eletroduto },
      { caminho: 'sistema.diametro_cabo_mm', rotulo: 'Diâmetro externo do cabo (mm)', tipo: 'numero', dica: 'Ficha do cabo — Cat 6 U/UTP ≈ 6,0 mm' },
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

const base = criarDisciplina({
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

module.exports = base;
