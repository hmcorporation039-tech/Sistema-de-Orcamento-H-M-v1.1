// Disciplina INCÊNDIO — detecção e alarme (NBR 17240:2010) e iluminação de
// emergência (NBR 10898:2023) — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { fmtNum } = require('../../../_comum/docx-base');
const { calcular, RAIO } = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-escritorio.json');

const NORMAS = [
  ['ABNT NBR 17240:2010', 'Sistemas de detecção e alarme de incêndio — projeto, instalação, comissionamento e manutenção'],
  ['ABNT NBR 10898:2023', 'Sistema de iluminação de emergência'],
  ['ABNT NBR ISO 7240-7', 'Detectores pontuais de fumaça'],
  ['ABNT NBR 16820', 'Sistemas de sinalização de emergência'],
  ['Instruções técnicas do Corpo de Bombeiros local', 'Exigências por ocupação e área (no DF: CBMDF)'],
];
const SECOES_CHECKLIST = ['Documentação', 'Central', 'Detectores', 'Acionadores', 'Avisadores', 'Circuitos', 'Iluminação de emergência'];
const num = fmtNum; // número pt-BR; '—' quando vazio ou inválido
const ROT_DET = { fumaca: 'Fumaça', temperatura: 'Temperatura', nenhum: '—' };

function processar(dados) {
  const calc = calcular(dados);
  const insp = dados.inspecao || {};
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, calc.iluminacao.length ? {} : {
    IE1: 'Sem iluminação de emergência no escopo', IE2: 'Sem iluminação de emergência no escopo', IE3: 'Sem iluminação de emergência no escopo',
    IE4: 'Sem iluminação de emergência no escopo', IE5: 'Sem iluminação de emergência no escopo', IE6: 'Sem iluminação de emergência no escopo', IE7: 'Sem iluminação de emergência no escopo',
  });
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const autonomia = (insp.autonomia || []).map(m => ({ ...m, resultado: m.horas == null || m.horas === '' ? 'NV' : Number(String(m.horas).replace(',', '.')) >= calc.autonomiaEmergH ? 'C' : 'NC' }));
  const iluminancia = (insp.iluminancia || []).map(m => {
    const min = m.escada ? 5 : 3;
    return { ...m, minimo: min, resultado: m.lux == null || m.lux === '' ? 'NV' : Number(m.lux) >= min ? 'C' : 'NC' };
  });
  const dispositivos = (insp.teste_dispositivos || []).map(m => ({ ...m, resultado: m.ok === true ? 'C' : m.ok === false ? 'NC' : 'NV' }));
  return { dados, calc, insp, checklist, ncs, med: { autonomia, iluminancia, dispositivos }, parecer: I.parecer(checklist, ncs, [...autonomia, ...iluminancia, ...dispositivos]) };
}

function resumir(res) {
  const { calc } = res;
  const b = calc.bateria;
  return {
    indicadores: [
      { rotulo: 'Detectores', valor: String(calc.nDet), detalhe: `${calc.ambientes.length} ambiente(s)` },
      { rotulo: 'Acionadores manuais', valor: String(calc.nAc), detalhe: '≤ 30 m de caminhamento, ≥ 1 por pavimento' },
      { rotulo: 'Avisadores', valor: String(calc.nAv), detalhe: 'estimativa — confirmar audibilidade' },
      { rotulo: 'Central', valor: calc.tipoSistema === 'enderecavel' ? `${calc.lacos} laço(s)` : `${calc.zonas} zona(s)`, detalhe: `${calc.dispositivos} dispositivos` },
      { rotulo: 'Bateria (Anexo B)', valor: `${num(b.bateriaAh, 1)} Ah → ${b.bateriaEscolhida} Ah`, detalhe: `repouso ${num(b.iRepouso, 0)} mA · alarme ${num(b.iAlarme, 0)} mA` },
      { rotulo: 'Fonte principal', valor: `${num(b.fonteA, 2)} A`, detalhe: '1,2 × corrente de alarme' },
      ...(calc.iluminacao.length ? [{ rotulo: 'Iluminação de emergência', valor: `${calc.nAclar} luminárias`, detalhe: `${calc.nBaliz} sinais de balizamento · autonomia ≥ ${num(calc.autonomiaEmergH, 1)} h` }] : []),
    ],
    textos: calc.avisos,
    tabelas: [
      { titulo: 'Detectores por ambiente (NBR 17240, 5.4)', colunas: ['Ambiente', 'Pav.', 'Dimensões (m)', 'Pé-direito', 'Tipo', 'Raio (m)', 'Grade', 'Detectores'],
        linhas: calc.ambientes.map(a => [a.nome, a.pavimento || '—', `${num(a.L)} × ${num(a.W)}`, `${num(a.pe)} m`, ROT_DET[a.tipo || 'fumaca'], a.raio ? num(a.raio) : '—', a.grade ? `${a.grade.nx} × ${a.grade.ny}` : '—', a.detectores]) },
      { titulo: 'Acionadores e avisadores por pavimento', colunas: ['Pavimento', 'Área (m²)', 'Maior caminhamento (m)', 'Acionadores', 'Avisadores'],
        linhas: calc.pavimentos.map(p => [p.nome, num(p.area, 0), num(p.comp, 0), p.acionadores, p.avisadores]) },
      ...(calc.iluminacao.length ? [{ titulo: 'Iluminação de emergência (NBR 10898)', colunas: ['Ambiente', 'Altura (m)', 'Aclaramento', 'Balizamento', 'Nível mínimo'],
        linhas: calc.iluminacao.map(x => [x.nome, num(x.h), x.aclaramento, x.balizamento, `${x.nivelLux} lx`]) }] : []),
    ],
  };
}

function secoesMemorial(res) {
  const { calc } = res;
  const b = calc.bateria;
  return [
    { titulo: '1. Objeto', paragrafos: [`Sistema de detecção e alarme de incêndio ${calc.tipoSistema === 'enderecavel' ? 'endereçável' : 'convencional'}${calc.iluminacao.length ? ' e sistema de iluminação de emergência' : ''} de ${res.dados.obra?.nome || 'a edificação'}, conforme a ABNT NBR 17240:2010${calc.iluminacao.length ? ' e a ABNT NBR 10898:2023' : ''}.`] },
    { titulo: '2. Detectores (NBR 17240, 5.4)', paragrafos: [
      `Detectores pontuais distribuídos de forma que nenhum ponto do teto fique além do raio de cobertura (5.4.1.4): fumaça r = ${num(RAIO.fumaca)} m (área máxima de 81 m², quadrado de 9 m — 5.4.1.1) e temperatura r = ${num(RAIO.temperatura)} m (36 m², quadrado de 6 m). Vigas de 0,21 m a 0,60 m reduzem o espaçamento a 2/3 e vigas acima de 0,61 m a 1/2 (5.4.1.5 e 5.4.1.6). Afastamento mínimo de 0,15 m de paredes e vigas (5.4.1.2).`,
      'Os exemplos das Figuras 4 e 5 da norma são ilustrações aproximadas; o dimensionamento segue o critério do item 5.4.1.4, a favor da segurança.',
    ],
    tabela: { colunas: ['Ambiente', 'Dimensões (m)', 'Pé-direito', 'Tipo', 'Raio (m)', 'Grade', 'Qtd.'], linhas: calc.ambientes.map(a => [a.nome, `${num(a.L)} × ${num(a.W)}`, `${num(a.pe)} m`, ROT_DET[a.tipo || 'fumaca'], a.raio ? num(a.raio) : '—', a.grade ? `${a.grade.nx} × ${a.grade.ny}` : '—', a.detectores]), proporcoes: [2, 1.1, 0.8, 0.9, 0.7, 0.7, 0.5] } },
    { titulo: '3. Acionadores manuais e avisadores (5.5 e 5.6)', paragrafos: [
      'Acionadores em rotas de fuga e saídas, entre 0,90 m e 1,35 m do piso, na cor vermelha, com caminhamento máximo de 30 m até o mais próximo e ao menos um por pavimento (5.5). Avisadores entre 2,20 m e 3,50 m, audíveis e visíveis em todo o ambiente (5.6); avisadores visuais onde o ruído passar de 105 dBA ou houver uso de protetor auricular.',
    ],
    tabela: { colunas: ['Pavimento', 'Área (m²)', 'Maior caminhamento (m)', 'Acionadores', 'Avisadores'], linhas: calc.pavimentos.map(p => [p.nome, num(p.area, 0), num(p.comp, 0), p.acionadores, p.avisadores]), proporcoes: [2, 1, 1.4, 1, 1] },
      notas: ['A quantidade de avisadores é estimada pela área do pavimento; confirmar a audibilidade em todos os pontos no comissionamento (8.1.6). [CONFERIR]'] },
    { titulo: '4. Central, laços e alimentação (5.3 e Anexo B)', paragrafos: [
      calc.tipoSistema === 'enderecavel' ? `Central endereçável com ${calc.lacos} laço(s) para ${calc.dispositivos} dispositivos (limite adotado de ${calc.limiteLaco} por laço — conferir com o fabricante).` : `Central convencional com ${calc.zonas} zona(s).`,
      `Capacidade mínima da fonte = 1,20 × ${num(b.iAlarme, 0)} mA / 1000 = ${num(b.fonteA, 2)} A. Capacidade mínima da bateria = 1,20 × (${b.tRepouso} h × ${num(b.iRepouso, 1)} mA + ${b.tAlarme}/60 h × ${num(b.iAlarme, 0)} mA) / 1000 = ${num(b.bateriaAh, 2)} Ah → bateria de ${b.bateriaEscolhida} Ah (Anexo B). Consumos ${res.dados.sistema?.consumos ? 'informados pelo fabricante' : 'típicos adotados — [CONFERIR] com a ficha técnica dos equipamentos'}.`,
    ],
    tabela: { colunas: ['Equipamento', 'Qtd.', 'Repouso (mA)', 'Total repouso', 'Alarme (mA)', 'Total alarme'], linhas: b.linhas.map(l => [l.equipamento, l.qtd, num(l.repouso, 2), num(l.totalRepouso, 1), num(l.alarme, 2), num(l.totalAlarme, 1)]), proporcoes: [2, 0.6, 1, 1, 1, 1] } },
    ...(calc.iluminacao.length ? [{ titulo: '5. Iluminação de emergência (NBR 10898)', paragrafos: [
      `Autonomia mínima de ${num(calc.autonomiaEmergH, 1)} h (NBR 10898:2023, 4.9 — a edição de 2013 pedia 1 h; vale a maior exigência entre a norma e a IT/NT do Corpo de Bombeiros local [CONFERIR CBMDF]), aclaramento ≥ 3 lx em locais planos e ≥ 5 lx em escadas (5.1 e A.2.1), luminárias com fluxo ≥ 300 lm (6.1.2.4) junto a portas de saída, escadas, mudanças de direção e interseções (5.1.2), distância máxima entre luminárias de 4 vezes a altura de instalação (Anexo A) e balizamento a no máximo 15 m (14.18). O nível de iluminância deve ser confirmado por cálculo ponto a ponto ou software (14.14).`,
    ], tabela: { colunas: ['Ambiente', 'Altura (m)', 'Aclaramento', 'Balizamento', 'Nível mínimo'], linhas: calc.iluminacao.map(x => [x.nome, num(x.h), x.aclaramento, x.balizamento, `${x.nivelLux} lx`]), proporcoes: [2.2, 0.8, 1, 1, 1] } }] : []),
    { titulo: `${calc.iluminacao.length ? 6 : 5}. Lista de materiais (preliminar)`, tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 0), m.referencia]), proporcoes: [0.6, 4, 0.5, 0.6, 1.6] },
      notas: ['Cabos e eletrodutos estimados pelos perímetros dos ambientes e caminhamentos — conferir no projeto executivo.'] },
    ...(calc.avisos.length ? [{ titulo: 'Avisos', marcadores: calc.avisos }] : []),
  ];
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial de detecção, alarme e emergência', formato: 'Word', nome: 'Memorial_Incendio',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO E DE CÁLCULO — DETECÇÃO E ALARME DE INCÊNDIO E ILUMINAÇÃO DE EMERGÊNCIA', subtitulo: 'ABNT NBR 17240:2010 e ABNT NBR 10898:2023', tituloCurto: 'Memorial — incêndio', sigla: 'MEM-INC', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de dispositivos, bateria e materiais', formato: 'Excel', nome: 'Incendio',
    gerar: (res) => D.gerarPlanilha([
      { nome: 'Detectores', colunas: [{ header: 'Ambiente', key: 'nome', width: 26 }, { header: 'Pavimento', key: 'pavimento' }, { header: 'Comprimento (m)', key: 'L' }, { header: 'Largura (m)', key: 'W' }, { header: 'Pé-direito (m)', key: 'pe' }, { header: 'Tipo', key: 'tipo' }, { header: 'Detectores', key: 'detectores' }], linhas: res.calc.ambientes },
      { nome: 'Bateria (Anexo B)', colunas: [{ header: 'Equipamento', key: 'equipamento', width: 26 }, { header: 'Qtd.', key: 'qtd' }, { header: 'Repouso (mA)', key: 'repouso' }, { header: 'Total repouso (mA)', key: 'totalRepouso' }, { header: 'Alarme (mA)', key: 'alarme' }, { header: 'Total alarme (mA)', key: 'totalAlarme' }], linhas: res.calc.bateria.linhas },
      D.abaMateriais(res.calc.materiais),
    ]) },
  { tipo: 'laudo', rotulo: 'Laudo de inspeção / comissionamento', formato: 'Word', nome: 'Laudo_Incendio',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, {
      titulo: 'LAUDO DE INSPEÇÃO DO SISTEMA DE DETECÇÃO E ALARME DE INCÊNDIO E ILUMINAÇÃO DE EMERGÊNCIA',
      tipoInspecao: `${res.insp.tipo === 'comissionamento' ? 'Comissionamento e entrega (NBR 17240, Seção 8)' : 'Inspeção periódica / manutenção (NBR 17240, Seção 10; NBR 10898, Seção 16)'}`,
      tituloCurto: 'Laudo — incêndio', sigla: 'LAUDO-INC',
      objetivo: 'Verificar a conformidade do sistema de detecção e alarme de incêndio com a ABNT NBR 17240:2010 e do sistema de iluminação de emergência com a ABNT NBR 10898:2023, por inspeção visual, ensaios funcionais de dispositivos, medições de iluminância e de autonomia.',
      listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
      descricao: [['Sistema', `${res.calc.tipoSistema === 'enderecavel' ? 'Endereçável' : 'Convencional'} — ${res.calc.nDet} detectores, ${res.calc.nAc} acionadores, ${res.calc.nAv} avisadores`], ['Iluminação de emergência', res.calc.iluminacao.length ? `${res.calc.nAclar} luminárias de aclaramento e ${res.calc.nBaliz} de balizamento` : 'fora do escopo']],
      metodologia: ['Inspeção visual da central, dispositivos, infraestrutura e interfaces.', 'Ensaio funcional de detectores (fumaça/calor de teste), acionadores e avisadores, com conferência da indicação na central (8.1).', 'Simulação de falhas (rompimento de circuito, falta de energia) e verificação da sinalização.', 'Iluminação de emergência: medição de iluminância no piso com luxímetro e ensaio de autonomia com a rede desligada (NBR 10898, Seção 17).'],
      medicoes: [
        { titulo: '6.1 Ensaio funcional de dispositivos', colunas: ['Dispositivo / local', 'Tipo', 'Indicação na central', 'Resultado'], proporcoes: [2, 1, 1.4, 0.8], linhas: res.med.dispositivos.map(m => [m.local, m.tipo || '', m.observacao || '', m.resultado]) },
        { titulo: '6.2 Iluminância de emergência no piso', colunas: ['Local', 'Medido (lx)', 'Mínimo (lx)', 'Resultado'], proporcoes: [2.2, 1, 1, 0.8], linhas: res.med.iluminancia.map(m => [m.local, m.lux ?? '', m.minimo, m.resultado]) },
        { titulo: '6.3 Autonomia', colunas: ['Sistema / circuito', 'Medido (h)', 'Mínimo', 'Resultado'], proporcoes: [2.2, 1, 1, 0.8], linhas: res.med.autonomia.map(m => [m.local, m.horas ?? '', `${num(res.calc.autonomiaEmergH, 1)} h`, m.resultado]) },
      ],
      proximaInspecao: [['Manutenção preventiva', 'Conforme NBR 17240, Seção 10 e plano do fabricante'], ['Iluminação de emergência', 'Teste mensal de funcionamento e semestral de autonomia (NBR 10898, 16.2)']],
    }, { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Incendio',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, {
      titulo: 'CHECKLIST DE CAMPO — DETECÇÃO, ALARME E ILUMINAÇÃO DE EMERGÊNCIA', subtitulo: 'ABNT NBR 17240:2010 e ABNT NBR 10898:2023', tituloCurto: 'Checklist — incêndio', secoesChecklist: SECOES_CHECKLIST,
      preparacao: ['Avisar a brigada/portaria antes dos testes para evitar acionamento indevido.', 'Levar: fumaça de teste, testador de calor, chave de acionador, luxímetro, cronômetro, trena.'],
      referencias: [['Detectores previstos', String(res.calc.nDet)], ['Acionadores previstos', String(res.calc.nAc)], ['Bateria mínima', `${res.calc.bateria.bateriaEscolhida} Ah`], ['Autonomia mínima iluminação', `${num(res.calc.autonomiaEmergH, 1)} h`]],
      medicoes: [{ titulo: 'Iluminância (lx) e autonomia', colunas: ['Local', 'lx medido', 'Mínimo', 'Obs.'], proporcoes: [2.2, 1, 1, 2], linhas: res.calc.iluminacao.map(x => [x.nome, '', `${x.nivelLux} lx`, '']) }],
    }, res.checklist)) },
];

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade) => ({ secao: S, subgrupo: 'Incêndio', codigo, descricao, quantidade, unidade });
  const metros = calc.materiais.find(m => m.codigo === 'CAB')?.quantidade || 0;
  const itens = modo === 'inspecao'
    ? [srv('inc_inspecao', 'Inspeção e ensaios funcionais do sistema de alarme e iluminação de emergência', 1, 'vb'), srv('inc_laudo', 'Laudo técnico com ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' }))]
    : [
      ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Incêndio', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      srv('inc_infra', 'Infraestrutura e lançamento de cabos do sistema de alarme', metros, 'm'),
      srv('inc_dispositivo', 'Instalação de detectores, acionadores e avisadores', calc.nDet + calc.nAc + calc.nAv, 'un'),
      srv('inc_central', 'Instalação, programação e endereçamento da central', 1, 'un'),
      ...(calc.nAclar + calc.nBaliz ? [srv('inc_ilum_emergencia', 'Instalação de luminárias e sinalização de emergência', calc.nAclar + calc.nBaliz, 'un')] : []),
      srv('inc_comissionamento', 'Comissionamento, testes e treinamento (NBR 17240, Seções 8 e 9)', 1, 'vb'),
      srv('inc_projeto', 'Projeto executivo de detecção e alarme com ART', 1, 'vb'),
    ];
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: modo === 'inspecao'
      ? `Inspeção do sistema de detecção e alarme de incêndio${calc.iluminacao.length ? ' e da iluminação de emergência' : ''} de ${dados.obra?.nome || 'a edificação'} conforme as ABNT NBR 17240 e NBR 10898, com ensaios funcionais e laudo com ART.`
      : `Fornecimento e instalação de sistema de detecção e alarme de incêndio ${calc.tipoSistema === 'enderecavel' ? 'endereçável' : 'convencional'} (${calc.nDet} detectores, ${calc.nAc} acionadores, ${calc.nAv} avisadores, central com bateria de ${calc.bateria.bateriaEscolhida} Ah)${calc.iluminacao.length ? ` e iluminação de emergência (${calc.nAclar} luminárias, ${calc.nBaliz} sinais)` : ''} conforme ABNT NBR 17240${calc.iluminacao.length ? ' e NBR 10898' : ''}, com comissionamento, treinamento e ART.`,
    observacoes: 'Rascunho gerado pela skill de incêndio — conferir quantidades e preços antes de enviar ao cliente.',
    itens,
  };
}

const OP = {
  tipo: F.op([['enderecavel', 'Endereçável'], ['convencional', 'Convencional']]),
  detector: F.op([['fumaca', 'Fumaça (pontual)'], ['temperatura', 'Temperatura (pontual)'], ['nenhum', 'Sem detector']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Sistema e consumos', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.tipo', rotulo: 'Tipo de sistema', tipo: 'selecao', opcoes: OP.tipo },
      { caminho: 'sistema.dispositivos_por_laco', rotulo: 'Dispositivos por laço (fabricante)', tipo: 'numero' },
      { caminho: 'sistema.dispositivos_por_zona', rotulo: 'Dispositivos por zona (convencional)', tipo: 'numero' },
      { caminho: 'sistema.modulos_comando', rotulo: 'Módulos de comando/interfaces', tipo: 'numero' },
      { caminho: 'sistema.area_por_avisador_m2', rotulo: 'Área por avisador (m²) — estimativa', tipo: 'numero' },
      { caminho: 'sistema.tempo_repouso_h', rotulo: 'Tempo em repouso (h)', tipo: 'numero', dica: 'Anexo B: 24 h' },
      { caminho: 'sistema.tempo_alarme_min', rotulo: 'Tempo em alarme (min)', tipo: 'numero', dica: 'Anexo B: 5 min' },
      { caminho: 'sistema.autonomia_iluminacao_h', rotulo: 'Autonomia da iluminação de emergência (h)', tipo: 'numero', dica: 'Vazio = 2 h (NBR 10898:2023, 4.9); maior só se a IT/NT local exigir' },
    ] },
    { tipo: 'nota', texto: 'Consumos dos equipamentos (mA) para o cálculo da bateria — deixe vazio para usar valores típicos; preencha com a ficha técnica do fabricante.' },
    { tipo: 'grade', colunas: 5, campos: [
      { caminho: 'sistema.consumos.central.repouso', rotulo: 'Central — repouso', tipo: 'numero' }, { caminho: 'sistema.consumos.central.alarme', rotulo: 'Central — alarme', tipo: 'numero' },
      { caminho: 'sistema.consumos.detector.repouso', rotulo: 'Detector — repouso', tipo: 'numero' }, { caminho: 'sistema.consumos.detector.alarme', rotulo: 'Detector — alarme', tipo: 'numero' },
      { caminho: 'sistema.consumos.avisador.alarme', rotulo: 'Avisador — alarme', tipo: 'numero' },
    ] },
  ] },
  { titulo: '3. Pavimentos', aberta: true, itens: [
    { tipo: 'nota', texto: 'Maior caminhamento = maior percurso a pé dentro do pavimento (define os acionadores: no máximo 30 m até o mais próximo).' },
    { tipo: 'tabela', caminho: 'pavimentos', rotuloAdicionar: 'Adicionar pavimento', novaLinha: { nome: '', area_m2: null, maior_caminhamento_m: null, saidas_emergencia: 1 },
      colunas: [{ campo: 'nome', rotulo: 'Pavimento' }, { campo: 'area_m2', rotulo: 'Área (m²)', tipo: 'numero', largura: 110 }, { campo: 'maior_caminhamento_m', rotulo: 'Maior caminhamento (m)', tipo: 'numero', largura: 150 }, { campo: 'saidas_emergencia', rotulo: 'Saídas de emergência', tipo: 'numero', largura: 130 }] },
  ] },
  { titulo: '4. Ambientes', aberta: true, itens: [
    { tipo: 'nota', texto: 'Para ambientes irregulares, use o retângulo envolvente ou divida em partes. Marque "Rota de fuga" nos ambientes que recebem iluminação de emergência.' },
    { tipo: 'tabela', caminho: 'ambientes', rotuloAdicionar: 'Adicionar ambiente',
      novaLinha: { nome: '', pavimento: '', comprimento_m: null, largura_m: null, pe_direito_m: 3, detector: 'fumaca', altura_viga_m: null, rota_fuga: false, escada: false, saidas: 0, mudancas_direcao: 0, altura_luminaria_m: null },
      colunas: [
        { campo: 'nome', rotulo: 'Ambiente' }, { campo: 'pavimento', rotulo: 'Pav.', largura: 80 },
        { campo: 'comprimento_m', rotulo: 'Compr. (m)', tipo: 'numero', largura: 80 }, { campo: 'largura_m', rotulo: 'Larg. (m)', tipo: 'numero', largura: 80 },
        { campo: 'pe_direito_m', rotulo: 'Pé-dir. (m)', tipo: 'numero', largura: 80 }, { campo: 'detector', rotulo: 'Detector', tipo: 'selecao', opcoes: OP.detector, largura: 150 },
        { campo: 'altura_viga_m', rotulo: 'Viga (m)', tipo: 'numero', largura: 70 }, { campo: 'rota_fuga', rotulo: 'Rota de fuga', tipo: 'check', largura: 70 },
        { campo: 'escada', rotulo: 'Escada', tipo: 'check', largura: 60 }, { campo: 'saidas', rotulo: 'Portas de saída', tipo: 'numero', largura: 80 },
        { campo: 'mudancas_direcao', rotulo: 'Mudanças de direção', tipo: 'numero', largura: 90 }, { campo: 'altura_luminaria_m', rotulo: 'Altura luminária (m)', tipo: 'numero', largura: 90 },
      ] },
  ] },
  F.secaoInspecao(5, F.op([['periodica', 'Inspeção periódica / manutenção'], ['comissionamento', 'Comissionamento e entrega']])),
  F.secaoChecklist(6, CHECKLIST.length),
  { titulo: '7. Ensaios e medições', itens: [
    { tipo: 'tabela', caminho: 'inspecao.teste_dispositivos', rotuloAdicionar: 'Adicionar teste de dispositivo', novaLinha: { local: '', tipo: 'detector', ok: null, observacao: '' },
      colunas: [{ campo: 'local', rotulo: 'Dispositivo / local' }, { campo: 'tipo', rotulo: 'Tipo', largura: 120 }, { campo: 'ok', rotulo: 'Funcionou', tipo: 'check', largura: 80 }, { campo: 'observacao', rotulo: 'Indicação na central / obs.' }] },
    { tipo: 'tabela', caminho: 'inspecao.iluminancia', rotuloAdicionar: 'Adicionar medição de iluminância', novaLinha: { local: '', lux: null, escada: false },
      colunas: [{ campo: 'local', rotulo: 'Local' }, { campo: 'lux', rotulo: 'Medido (lx)', tipo: 'numero', largura: 100 }, { campo: 'escada', rotulo: 'Escada (5 lx)', tipo: 'check', largura: 90 }] },
    { tipo: 'tabela', caminho: 'inspecao.autonomia', rotuloAdicionar: 'Adicionar ensaio de autonomia', novaLinha: { local: '', horas: null },
      colunas: [{ campo: 'local', rotulo: 'Sistema / circuito' }, { campo: 'horas', rotulo: 'Autonomia medida (h)', tipo: 'numero', largura: 150 }] },
  ] },
  F.secaoNcs(8, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(9),
];

module.exports = criarDisciplina({
  chave: 'incendio',
  nome: 'Incêndio — detecção, alarme e iluminação de emergência (NBR 17240 / NBR 10898)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Instalação do sistema', descricao: 'Detectores, acionadores, avisadores, central, iluminação de emergência e mão de obra' },
    { modo: 'inspecao', rotulo: 'Inspeção e laudo', descricao: 'Ensaios funcionais, laudo e correção das não conformidades' },
  ],
  montarOrcamento,
});
