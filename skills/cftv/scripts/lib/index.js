// Disciplina CFTV — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { calcular, ROTULO_DORI, DORI } = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-comercio.json');

const NORMAS = [
  ['IEC 62676-4', 'Sistemas de vigilância por vídeo — diretrizes de aplicação (densidade de pixels DORI)'],
  ['ABNT NBR 14565:2019', 'Cabeamento estruturado (limite de 90 m do cabo horizontal)'],
  ['IEEE 802.3af/at/bt', 'Alimentação PoE'],
  ['Lei 13.709/2018 (LGPD)', 'Tratamento de imagens: transparência, finalidade e segurança'],
  ['ABNT NBR 5410 e NBR 5419-4', 'Aterramento e proteção contra surtos'],
];
const SECOES_CHECKLIST = ['Documentação', 'Câmeras', 'Gravação', 'Segurança cibernética', 'Infraestrutura'];
const num = (v, c = 2) => (v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));

function processar(dados) {
  const calc = calcular(dados);
  const insp = dados.inspecao || {};
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, calc.cameras.some(c => c.externa) ? {} : { C2: 'Sem câmeras externas', I4: 'Sem câmeras externas' });
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  // C só com imagem E gravação testadas e ok; qualquer falha → NC; teste incompleto → NV
  const testes = (insp.teste_cameras || []).map(m => ({ ...m, resultado: m.imagem_ok === false || m.gravacao_ok === false ? 'NC' : m.imagem_ok === true && m.gravacao_ok === true ? 'C' : 'NV' }));
  return { dados, calc, insp, checklist, ncs, testes, parecer: I.parecer(checklist, ncs, testes) };
}

function resumir(res) {
  const { calc } = res;
  const falhas = calc.cameras.filter(c => c.atende === false).length;
  return {
    indicadores: [
      { rotulo: 'Câmeras', valor: String(calc.nCam), detalhe: falhas ? `${falhas} sem o objetivo DORI` : 'objetivos DORI atendidos', ok: falhas ? false : (calc.cameras.some(c => c.atende === true) ? true : undefined) },
      { rotulo: 'Armazenamento', valor: `${num(calc.armazenamentoTb, 1)} TB`, detalhe: `${calc.dias} dias · ${num(calc.banda, 1)} Mbps · ${calc.hds} HD de ${calc.hdTb} TB` },
      { rotulo: 'Gravador', valor: `NVR ${calc.canais} canais`, detalhe: `banda ≥ ${Math.ceil(calc.banda * 1.3)} Mbps` },
      { rotulo: 'PoE', valor: `${num(calc.poeTotal, 0)} W`, detalhe: `com margem ${num(calc.poeComMargem, 0)} W · ${calc.switches} switch(es)` },
      { rotulo: 'Nobreak', valor: `${calc.nobreakVa} VA`, detalhe: `${num(calc.cargaW, 0)} W · ${calc.autonomiaMin} min ≈ ${num(calc.energiaWh, 0)} Wh` },
    ],
    textos: calc.avisos,
    tabelas: [{ titulo: 'Câmeras (IEC 62676-4 — densidade de pixels)', colunas: ['Câmera', 'Local', 'Tipo', 'Qtd.', 'MP', 'Abertura', 'Objetivo', 'Dist. alvo', 'px/m', 'Alcance máx.', 'Situação'],
      linhas: calc.cameras.map(c => [c.id, c.local, c.tipo, c.qtd, c.resolucao_mp || 2, `${c.hfov}°`, ROTULO_DORI[c.objetivo], c.dAlvo ? `${num(c.dAlvo)} m` : '—', c.ppm ? num(c.ppm, 0) : '—', `${num(c.dMax, 1)} m`, c.atende == null ? '—' : c.atende ? 'atende' : 'NÃO atende']) }],
  };
}

function secoesMemorial(res) {
  const { calc } = res;
  return [
    { titulo: '1. Objeto e critérios', paragrafos: [
      `Sistema de CFTV IP de ${res.dados.obra?.nome || 'a edificação'} com ${calc.nCam} câmeras. Não há norma ABNT específica de projeto de CFTV; adotam-se os critérios de densidade de pixels da IEC 62676-4 (DORI): detecção ${DORI.deteccao} px/m, observação ${DORI.observacao} px/m, reconhecimento ${DORI.reconhecimento} px/m e identificação ${DORI.identificacao} px/m, o limite de 90 m do cabo horizontal da ABNT NBR 14565 e os princípios da LGPD para o tratamento das imagens.`,
      'Densidade de pixels na distância do alvo: px/m = resolução horizontal ÷ (2 · d · tg(abertura/2)). Alcance máximo para o objetivo: d = resolução ÷ (px/m exigido · 2 · tg(abertura/2)).',
    ] },
    { titulo: '2. Câmeras', tabela: { colunas: ['Câmera', 'Local', 'Tipo', 'Qtd.', 'MP', 'Abertura', 'Objetivo', 'px/m no alvo', 'Alcance', 'Situação'],
      linhas: calc.cameras.map(c => [c.id, c.local, c.tipo, c.qtd, c.resolucao_mp || 2, `${c.hfov}°`, ROTULO_DORI[c.objetivo], c.ppm ? num(c.ppm, 0) : '—', `${num(c.dMax, 1)} m`, c.atende == null ? '—' : c.atende ? 'atende' : 'NÃO atende']),
      proporcoes: [0.7, 1.6, 0.7, 0.4, 0.4, 0.6, 1, 0.8, 0.7, 0.8], tamanho: 15 } },
    { titulo: '3. Gravação e armazenamento', paragrafos: [
      `Banda total ${num(calc.banda, 1)} Mbps (${res.dados.sistema?.codec || 'H.265'}, ${res.dados.sistema?.fps || 15} qps). Armazenamento = banda × 3 600 s × ${calc.horas} h × ${calc.dias} dias${calc.atividade < 1 ? ` × ${num(calc.atividade * 100, 0)} % de atividade` : ''} ÷ 8 = ${num(calc.armazenamentoTb, 2)} TB → ${calc.hds} disco(s) de ${calc.hdTb} TB${calc.raid ? ` em RAID 5 (${calc.hdsDados} de capacidade útil + 1 de paridade; mínimo de 3 discos)` : ''}. Gravador de ${calc.canais} canais.`,
      'Retenção definida em política escrita, com acesso restrito e registrado (LGPD, art. 6º e 46).',
    ] },
    { titulo: '4. Alimentação e rede', paragrafos: [
      `Consumo PoE ${num(calc.poeTotal, 0)} W (com 20 % de margem: ${num(calc.poeComMargem, 0)} W) em ${calc.switches} switch(es). Carga total ≈ ${num(calc.cargaW, 0)} W → nobreak de ${calc.nobreakVa} VA; autonomia desejada de ${calc.autonomiaMin} min exige ≈ ${num(calc.energiaWh, 0)} Wh de bateria (conferir com o fabricante).`,
      calc.caboAcima90.length
        ? `Cabos U/UTP Cat 6 por câmera (${num(calc.caboM, 0)} m no total), limitados a 90 m pela NBR 14565 — EXCEDEM o limite: ${calc.caboAcima90.map(c => `${c.id} (${num(c.cabo, 0)} m)`).join(', ')}; nesses pontos usar extensor PoE, switch intermediário ou fibra. Câmeras externas com DPS de rede e aterramento (NBR 5419-4).`
        : `Cabos U/UTP Cat 6 até 90 m por câmera (${num(calc.caboM, 0)} m no total). Câmeras externas com DPS de rede e aterramento (NBR 5419-4).`,
      ...(calc.portasBt ? [`Câmeras acima de 25,5 W (limite do PoE+ 802.3at): ${calc.cameras.filter(c => c.poe > 25.5 && c.poe <= 71.3).map(c => `${c.id} ${num(c.poe, 1)} W → ${c.poePadrao}`).join('; ')} — portas IEEE 802.3bt no switch.`] : []),
    ] },
    { titulo: '5. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 0), m.referencia]), proporcoes: [0.6, 4, 0.5, 0.6, 1.5] } },
    ...(calc.avisos.length ? [{ titulo: 'Avisos', marcadores: calc.avisos }] : []),
  ];
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial do sistema de CFTV', formato: 'Word', nome: 'Memorial_CFTV',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO — SISTEMA DE CFTV', subtitulo: 'Critérios IEC 62676-4 (DORI), ABNT NBR 14565 e LGPD', tituloCurto: 'Memorial — CFTV', sigla: 'MEM-CFTV', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de câmeras e materiais', formato: 'Excel', nome: 'CFTV',
    gerar: (res) => D.gerarPlanilha([
      { nome: 'Câmeras', colunas: [{ header: 'Câmera', key: 'id' }, { header: 'Local', key: 'local', width: 26 }, { header: 'Tipo', key: 'tipo' }, { header: 'Qtd.', key: 'qtd' }, { header: 'MP', key: 'resolucao_mp' }, { header: 'Abertura (°)', key: 'hfov' }, { header: 'Objetivo', key: 'objetivo', width: 16 }, { header: 'px/m no alvo', key: 'ppm', numFmt: '0' }, { header: 'Alcance máx. (m)', key: 'dMax', numFmt: '0.0' }, { header: 'Bitrate (Mbps)', key: 'bitrate', numFmt: '0.0' }, { header: 'PoE (W)', key: 'poe' }, { header: 'Cabo (m)', key: 'cabo' }], linhas: res.calc.cameras },
      D.abaMateriais(res.calc.materiais),
    ]) },
  { tipo: 'laudo', rotulo: 'Laudo de vistoria do CFTV', formato: 'Word', nome: 'Laudo_CFTV',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, {
      titulo: 'LAUDO DE VISTORIA — SISTEMA DE CFTV', tipoInspecao: 'Vistoria técnica / comissionamento', tituloCurto: 'Laudo — CFTV', sigla: 'LAUDO-CFTV',
      objetivo: 'Verificar o funcionamento, a cobertura, a gravação, a segurança cibernética, a infraestrutura e a conformidade com a LGPD do sistema de CFTV.',
      listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
      descricao: [['Câmeras', String(res.calc.nCam)], ['Gravador', `NVR ${res.calc.canais} canais — ${res.calc.hds} × ${res.calc.hdTb} TB`], ['Retenção de projeto', `${res.calc.dias} dias`]],
      metodologia: ['Inspeção visual das câmeras, gravador, rack e infraestrutura.', 'Teste de imagem (dia/noite) e de gravação de cada câmera; busca e exportação de trecho gravado.', 'Verificação de usuários, senhas, firmware, sincronismo de horário e acesso remoto.'],
      medicoes: [{ titulo: '6.1 Teste das câmeras', colunas: ['Câmera', 'Imagem', 'Gravação', 'Obs.', 'Resultado'], proporcoes: [1.2, 0.7, 0.8, 2.2, 0.8], linhas: res.testes.map(m => [m.camera, m.imagem_ok === false ? 'falha' : m.imagem_ok ? 'ok' : '', m.gravacao_ok === false ? 'falha' : m.gravacao_ok ? 'ok' : '', m.observacao || '', m.resultado]) }],
    }, { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
];

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade) => ({ secao: S, subgrupo: 'CFTV', codigo, descricao, quantidade, unidade });
  const internas = calc.cameras.filter(c => !c.externa).reduce((a, c) => a + c.qtd, 0);
  const externas = calc.cameras.filter(c => c.externa).reduce((a, c) => a + c.qtd, 0);
  const itens = modo === 'vistoria'
    ? [srv('cftv_vistoria', 'Vistoria do sistema de CFTV (testes de imagem e gravação por câmera)', calc.nCam, 'un'), srv('cftv_laudo', 'Laudo de vistoria com ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' }))]
    : [
      ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'CFTV', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      srv('cftv_ponto', 'Conectorização de ponto de câmera (RJ-45 + patch panel + teste)', calc.nCam, 'pt'),
      ...(internas ? [srv('cftv_camera_interna', 'Instalação/config. de câmera interna (dome)', internas, 'un')] : []),
      ...(externas ? [srv('cftv_camera_externa', 'Instalação/config. de câmera externa (bullet)', externas, 'un')] : []),
      srv('cftv_nvr', 'Instalação e configuração do gravador, switch, nobreak e acesso remoto', 1, 'vb'),
      srv('cab_passagem', 'Passagem de cabeamento (infraestrutura + lançamento de cabos)', 1, 'vb'),
      srv('cftv_projeto', 'Projeto de CFTV com estudo de cobertura (DORI) e ART', 1, 'vb'),
    ];
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: modo === 'vistoria'
      ? `Vistoria técnica do sistema de CFTV de ${dados.obra?.nome || 'a edificação'} (${calc.nCam} câmeras), com testes, verificação de segurança cibernética e LGPD e laudo com ART.`
      : `Fornecimento e instalação de sistema de CFTV IP com ${calc.nCam} câmeras, gravador ${calc.canais} canais com ${calc.hds} × ${calc.hdTb} TB (${calc.dias} dias de gravação), switch PoE, nobreak, cabeamento e configuração de acesso remoto seguro em ${dados.obra?.nome || 'a edificação'}.`,
    observacoes: 'Rascunho gerado pela skill de CFTV — conferir modelos, quantidades e preços antes de enviar ao cliente.',
    itens,
  };
}

const OP = {
  codec: F.op([['H.265', 'H.265'], ['H.264', 'H.264']]),
  modo: F.op([['continua', 'Contínua'], ['movimento', 'Por movimento']]),
  raid: F.op([['nenhum', 'Sem RAID'], ['raid5', 'RAID 5']]),
  tipo: F.op([['dome', 'Dome'], ['bullet', 'Bullet'], ['ptz', 'PTZ'], ['fisheye', 'Fisheye']]),
  mp: F.op([['2', '2 MP'], ['4', '4 MP'], ['5', '5 MP'], ['8', '8 MP (4K)'], ['12', '12 MP']]),
  objetivo: F.op(Object.entries(ROTULO_DORI).map(([k, v]) => [k, `${v} (${DORI[k]} px/m)`])),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Gravação e infraestrutura', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.codec', rotulo: 'Codec', tipo: 'selecao', opcoes: OP.codec },
      { caminho: 'sistema.fps', rotulo: 'Quadros por segundo', tipo: 'numero' },
      { caminho: 'sistema.dias_gravacao', rotulo: 'Dias de gravação', tipo: 'numero' },
      { caminho: 'sistema.horas_dia', rotulo: 'Horas por dia', tipo: 'numero' },
      { caminho: 'sistema.modo_gravacao', rotulo: 'Modo de gravação', tipo: 'selecao', opcoes: OP.modo },
      { caminho: 'sistema.atividade_pct', rotulo: 'Atividade (%) — gravação por movimento', tipo: 'numero' },
      { caminho: 'sistema.hd_tb', rotulo: 'Capacidade do HD (TB)', tipo: 'numero' },
      { caminho: 'sistema.raid', rotulo: 'RAID', tipo: 'selecao', opcoes: OP.raid },
      { caminho: 'sistema.portas_switch', rotulo: 'Portas por switch', tipo: 'numero' },
      { caminho: 'sistema.autonomia_min', rotulo: 'Autonomia do nobreak (min)', tipo: 'numero' },
      { caminho: 'sistema.acessos', rotulo: 'Acessos (placas de monitoramento)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '3. Câmeras', aberta: true, itens: [
    { tipo: 'nota', texto: 'Abertura horizontal da lente: 2,8 mm ≈ 100°, 3,6 mm ≈ 80°, 6 mm ≈ 50°, 12 mm ≈ 25° (conferir ficha técnica). Distância do alvo: até onde a câmera precisa atingir o objetivo.' },
    { tipo: 'tabela', caminho: 'cameras', rotuloAdicionar: 'Adicionar câmera', novaLinha: { id: 'CAM{n}', local: '', tipo: 'dome', quantidade: 1, resolucao_mp: '4', hfov_graus: 90, objetivo: 'observacao', distancia_alvo_m: null, distancia_cabo_m: 30, externa: false, modelo: '' },
      colunas: [
        { campo: 'id', rotulo: 'Id', largura: 70 }, { campo: 'local', rotulo: 'Local' }, { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.tipo, largura: 100 },
        { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 60 }, { campo: 'resolucao_mp', rotulo: 'Resolução', tipo: 'selecao', opcoes: OP.mp, largura: 100 },
        { campo: 'hfov_graus', rotulo: 'Abertura (°)', tipo: 'numero', largura: 80 }, { campo: 'objetivo', rotulo: 'Objetivo', tipo: 'selecao', opcoes: OP.objetivo, largura: 190 },
        { campo: 'distancia_alvo_m', rotulo: 'Dist. alvo (m)', tipo: 'numero', largura: 90 }, { campo: 'distancia_cabo_m', rotulo: 'Cabo (m)', tipo: 'numero', largura: 80 },
        { campo: 'externa', rotulo: 'Externa', tipo: 'check', largura: 60 }, { campo: 'modelo', rotulo: 'Modelo', largura: 120 },
      ] },
  ] },
  F.secaoInspecao(4, F.op([['vistoria', 'Vistoria / comissionamento'], ['periodica', 'Inspeção periódica']])),
  F.secaoChecklist(5, CHECKLIST.length),
  { titulo: '6. Teste das câmeras', itens: [
    { tipo: 'tabela', caminho: 'inspecao.teste_cameras', rotuloAdicionar: 'Adicionar teste', novaLinha: { camera: '', imagem_ok: null, gravacao_ok: null, observacao: '' },
      colunas: [{ campo: 'camera', rotulo: 'Câmera' }, { campo: 'imagem_ok', rotulo: 'Imagem ok', tipo: 'check', largura: 80 }, { campo: 'gravacao_ok', rotulo: 'Gravação ok', tipo: 'check', largura: 90 }, { campo: 'observacao', rotulo: 'Observação' }] },
  ] },
  F.secaoNcs(7, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(8),
];

module.exports = criarDisciplina({
  chave: 'cftv',
  nome: 'CFTV (IEC 62676-4 / LGPD)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Instalação do CFTV', descricao: 'Câmeras, gravador, discos, switch PoE, nobreak, cabos e mão de obra' },
    { modo: 'vistoria', rotulo: 'Vistoria e laudo', descricao: 'Testes por câmera, laudo e correção das não conformidades' },
  ],
  montarOrcamento,
});
