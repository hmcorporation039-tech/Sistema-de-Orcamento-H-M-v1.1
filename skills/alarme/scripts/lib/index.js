// Disciplina ALARME DE INTRUSÃO MONITORADO — contrato do sistema.
// Referências: IEC 62642 / EN 50131 (graus, classes ambientais, detectores,
// fontes) e EN 50136 (transmissão de alarme). Não há NBR específica.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { fmtNum } = require('../../../_comum/docx-base');
const { calcular, CLASSES_AMBIENTAIS, ROTULO_DETECTOR, ROTULO_TECNOLOGIA, TEMPO_ENTRADA_MAX_S, AUTONOMIA_H, ATS_POR_GRAU, DIGITOS_SENHA } = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-residencia.json');

const NORMAS = [
  ['IEC 62642-1 / EN 50131-1', 'Sistemas de alarme de intrusão — requisitos gerais (graus de segurança 1 a 4, classes ambientais I a IV, autonomia, códigos de acesso, notificação)'],
  ['EN 50131-2-2 / 2-4 / 2-6', 'Detectores: infravermelho passivo, dupla tecnologia (IVP + micro-ondas) e contatos de abertura (magnéticos)'],
  ['EN 50131-3', 'Equipamento de controle e indicação (central)'],
  ['EN 50131-4', 'Dispositivos de aviso (sirenes)'],
  ['EN 50131-5-3', 'Interconexões sem fio'],
  ['EN 50131-6', 'Fontes de alimentação'],
  ['EN 50131-7 (CLC/TS 50131-7)', 'Guia de aplicação'],
  ['EN 50136-1', 'Sistemas e equipamentos de transmissão de alarme (categorias SP/DP); protocolos Contact ID (SIA DC-05) e SIA DC-09 (IP)'],
  ['ABNT NBR 5410', 'Alimentação da central por circuito exclusivo e proteção contra surtos'],
  ['ABNT NBR 5419-4', 'DPS nas linhas de energia e de sinal'],
  ['Lei 13.709/2018 (LGPD)', 'Quando houver verificação por imagem/vídeo'],
];
const SECOES_CHECKLIST = ['Documentação', 'Central e alimentação', 'Detecção', 'Dispositivos de aviso', 'Comando e operação', 'Comunicação e monitoramento', 'Infraestrutura'];
const num = fmtNum; // número pt-BR; '—' quando vazio ou inválido
const ROT_MEIO = { ethernet: 'Ethernet (IP)', gprs: 'GPRS/4G', linha: 'Linha telefônica' };
const ROT_PROTOCOLO = { contact_id: 'Contact ID (SIA DC-05)', sia_dc09: 'SIA DC-09 (IP)', sia: 'SIA DC-03' };
const TENSAO_MIN_BATERIA = 12.0; // V com rede desligada, sob carga [CONFERIR]
const sim = (v) => (v ? 'sim' : 'não');

function meiosTexto(calc) {
  return calc.meios.length ? calc.meios.map(m => ROT_MEIO[m]).join(' + ') : 'nenhum';
}

function processar(dados) {
  const calc = calcular(dados);
  const insp = dados.inspecao || {};
  const semFio = calc.zonas.some(z => z.semFio);
  const na = {};
  if (!calc.monitorado) ['D4', 'TX1', 'TX2', 'TX3'].forEach(c => { na[c] = 'Sistema não monitorado'; });
  if (!calc.monitorado && !calc.panico) na.CO4 = 'Sem monitoramento nem botão de pânico';
  if (calc.monitorado && calc.meios.length < 2) na.TX3 = 'Sistema com uma única via de comunicação';
  if (!semFio) na.DT5 = 'Sem dispositivos sem fio';
  if (!calc.externas.length) na.DT6 = 'Sem proteção perimetral externa';
  if (!dados.sistema?.verificacao_video) na.TX4 = 'Sem verificação por imagem/vídeo';
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, na);
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const zonasTeste = (insp.teste_zonas || []).filter(m => m && (m.zona || m.local)).map(m => {
    const evento = calc.monitorado ? m.evento_ok : undefined;
    const valores = [m.disparo_ok, evento].filter(v => v === true || v === false);
    return { ...m, resultado: !valores.length ? 'NV' : valores.includes(false) ? 'NC' : 'C' };
  });
  const e = insp.ensaios || {};
  const val = (v) => (v == null || v === '' ? null : Number(v));
  const ensaios = [
    { grandeza: 'Tempo de entrada (s)', valor: val(e.tempo_entrada_s), criterio: `≤ ${TEMPO_ENTRADA_MAX_S} s (EN 50131-1) [CONFERIR]`, ok: (v) => v <= TEMPO_ENTRADA_MAX_S },
    ...(calc.monitorado ? [{ grandeza: 'Tempo de transmissão do evento à central de monitoramento (s)', valor: val(e.tempo_transmissao_s), criterio: `≤ ${calc.ats.transmissaoS} s (${calc.ats.categoria}, EN 50136-1) [CONFERIR]`, ok: (v) => v <= calc.ats.transmissaoS }] : []),
    { grandeza: 'Tensão da bateria com a rede desligada, sob carga (V)', valor: val(e.tensao_bateria_v), criterio: `≥ ${num(TENSAO_MIN_BATERIA, 1)} V [CONFERIR]`, ok: (v) => v >= TENSAO_MIN_BATERIA },
  ].map(x => ({ ...x, resultado: x.valor == null ? 'NV' : x.ok(x.valor) ? 'C' : 'NC' }));
  return { dados, calc, insp, checklist, ncs, med: { zonas: zonasTeste, ensaios, tempoSaida: val(e.tempo_saida_s) }, parecer: I.parecer(checklist, ncs, [...zonasTeste, ...ensaios]) };
}

function resumir(res) {
  const { calc } = res;
  const b = calc.bateria;
  return {
    indicadores: [
      { rotulo: 'Grau de segurança', valor: `Grau ${calc.grau}`, detalhe: `${CLASSES_AMBIENTAIS[calc.classeAmbiental]} · ${ROTULO_TECNOLOGIA[calc.tecnologia]}` },
      { rotulo: 'Sensores', valor: String(calc.nSensores), detalhe: `${calc.nMag} magnéticos · ${calc.nIvp} IVP · ${calc.nBarreiras} par(es) de barreira · ${calc.nIvpExt} IVP externo(s)` },
      { rotulo: 'Zonas', valor: `${calc.nZonas} → ${calc.zonasComReserva} com reserva`, detalhe: `${calc.zonasFio} com fio · ${calc.nZonas - calc.zonasFio} sem fio · ${calc.particoes} partição(ões)` },
      { rotulo: 'Central', valor: `${calc.central.zonasMax} zonas / ${calc.central.particoes} partições`, detalhe: `${calc.expansores} expansor(es) · ${calc.receptores} receptor(es) sem fio · ${calc.repetidores} repetidor(es)` },
      { rotulo: 'Comando e aviso', valor: `${calc.teclados} teclado(s) · ${calc.sirenesInternas + calc.sirenesExternas} sirene(s)`, detalhe: `${calc.sirenesInternas} interna(s) · ${calc.sirenesExternas} externa(s)${calc.autoalimentada && calc.sirenesExternas ? ' autoalimentada(s)' : ''}` },
      { rotulo: 'Bateria (EN 50131-6)', valor: `${num(b.bateriaAh, 1)} Ah → ${b.nBaterias > 1 ? `${b.nBaterias} × ` : ''}${b.bateriaEscolhida} Ah`, detalhe: `autonomia ${b.autonomiaH} h${calc.notificado ? ' (falta de rede notificada)' : ''} · repouso ${num(b.iRepouso, 0)} mA · alarme ${num(b.iAlarme, 0)} mA` },
      { rotulo: 'Fonte', valor: `${num(b.fonteA, 2)} A`, detalhe: `repouso + recarga de 80 % em ${b.recargaH} h${b.fonteAux ? ` · fonte auxiliar ${b.fonteAux} A` : ''}`, ok: b.fonteAux ? false : undefined },
      { rotulo: 'Comunicação', valor: calc.monitorado ? meiosTexto(calc) : 'Não monitorado', detalhe: calc.monitorado ? `categoria mínima ${calc.ats.categoria} (EN 50136-1)` : 'só aviso local', ok: calc.monitorado && !calc.meios.length ? false : undefined },
    ],
    textos: calc.avisos,
    tabelas: [
      { titulo: 'Detecção por ambiente', colunas: ['Ambiente', 'Part.', 'Área (m²)', 'Maior dim. (m)', 'Portas', 'Janelas prot.', 'Magnéticos', 'Detector', 'IVP', 'Zonas'],
        linhas: calc.ambientes.map(a => [a.nome, a.particao, num(a.area, 1), num(a.maiorDim, 1), a.portas, `${a.janelasProtegidas}/${a.janelas}`, a.magneticos, ROTULO_DETECTOR[a.tipoIvp], a.ivps, a.zonas]) },
      ...(calc.externas.length ? [{ titulo: 'Proteção perimetral externa', colunas: ['Área', 'Tipo', 'Comprimento (m)', 'Trechos', 'Alcance útil (m)', 'Quantidade'],
        linhas: calc.externas.map(e => [e.nome, e.tipo === 'barreira' ? 'Barreira IVA' : 'IVP externo', num(e.comprimento, 1), e.lados || 1, num(e.alcance, 0), `${e.qtd} ${e.tipo === 'barreira' ? 'par(es)' : 'un'}`]) }] : []),
      { titulo: 'Zonas', colunas: ['Zona', 'Ambiente', 'Dispositivo', 'Tipo de zona', 'Part.', 'Ligação'],
        linhas: calc.zonas.map(z => [z.id, z.ambiente, z.dispositivo, z.tipo, z.particao, z.semFio ? 'sem fio' : 'com fio']) },
    ],
  };
}

function secoesMemorial(res) {
  const { calc, dados } = res;
  const b = calc.bateria;
  const s = dados.sistema || {};
  const ext = calc.externas.length;
  let n = 0;
  const t = (x) => `${++n}. ${x}`;
  return [
    { titulo: t('Objeto e referências normativas'), paragrafos: [
      `Sistema de alarme de intrusão ${calc.monitorado ? 'monitorado 24 h por central de monitoramento remota' : 'com aviso local (não monitorado)'} de ${dados.obra?.nome || 'a edificação'}, ${ROTULO_TECNOLOGIA[calc.tecnologia].toLowerCase()}, com ${calc.nSensores} sensores em ${calc.nZonas} zonas e ${calc.particoes} partição(ões).`,
      'Não há norma ABNT específica de projeto de sistemas de alarme de intrusão. Adotam-se como referência a IEC 62642 / série EN 50131 (graus de segurança, classes ambientais, detectores, central, sirenes, interconexões sem fio e fontes de alimentação) e a EN 50136 (sistemas de transmissão de alarme), além da ABNT NBR 5410 e da NBR 5419-4 para a alimentação e a proteção contra surtos.',
    ] },
    { titulo: t('Grau de segurança e classe ambiental (EN 50131-1)'), paragrafos: [
      `Grau de segurança adotado: ${calc.grau} (escala de 1 — risco baixo, intruso com pouco conhecimento — a 4 — risco alto, intruso com conhecimento e equipamento). Classe ambiental dos equipamentos internos: ${CLASSES_AMBIENTAIS[calc.classeAmbiental]}${ext ? '; detectores externos em classe IV' : ''}. Todos os componentes devem ter grau igual ou superior ao do sistema.`,
    ],
    tabela: { colunas: ['Requisito', 'Grau 1', 'Grau 2', 'Grau 3', 'Grau 4', 'Adotado'], linhas: [
      ['Autonomia da bateria — falta de rede notificada (h)', ...[1, 2, 3, 4].map(g => AUTONOMIA_H[g].notificado), `${b.autonomiaH} h`],
      ['Autonomia da bateria — sem notificação (h)', ...[1, 2, 3, 4].map(g => AUTONOMIA_H[g].sem), calc.notificado ? '—' : `${b.autonomiaH} h`],
      ['Transmissão de alarme (categoria mínima)', ...[1, 2, 3, 4].map(g => ATS_POR_GRAU[g].categoria.split(' (')[0]), calc.monitorado ? calc.ats.categoria : 'não monitorado'],
      ['Dígitos mínimos do código de usuário', ...[1, 2, 3, 4].map(g => DIGITOS_SENHA[g]), String(calc.digitosSenha)],
      ['Antimascaramento dos detectores', 'não', 'não', 'sim', 'sim', calc.grau >= 3 ? 'sim' : 'não'],
    ], proporcoes: [2.6, 0.7, 0.7, 0.7, 0.7, 1.2], tamanho: 15 },
    notas: ['Valores da tabela conforme leitura da EN 50131-1 / EN 50131-6 / EN 50136-1 — conferir na edição vigente da norma e com a certificação dos equipamentos. [CONFERIR]'] },
    { titulo: t('Detecção por ambiente'), paragrafos: [
      `Sensores magnéticos de abertura (EN 50131-2-6): ${s.magnetico_por_porta ?? 1} por porta de acesso e ${s.magnetico_por_janela ?? 1} por janela protegida (${s.magneticos_janelas === 'todas' ? 'todas as janelas' : s.magneticos_janelas === 'nenhuma' ? 'janelas sem magnético' : 'janelas acessíveis: térreo, sacadas e junto a telhados/marquises'}).${calc.agrupar ? ' Magnéticos com fio do mesmo ambiente e da mesma função ligados em série numa zona.' : ' Cada magnético em zona própria.'}`,
      `Detectores infravermelhos passivos (EN 50131-2-2) com alcance de ${num(calc.alcance)} m e abertura de ${num(calc.abertura, 0)}°: área coberta por detector = π · r² · θ/360 = ${num(calc.areaCoberta, 1)} m². Nº de IVP = maior entre ⌈área ÷ área coberta⌉ e ⌈maior dimensão ÷ alcance⌉. Ambientes com animais recebem IVP pet; ambientes de risco alto recebem detector de dupla tecnologia (IVP + micro-ondas, EN 50131-2-4) com campos cruzados (área coberta × 0,5 e no mínimo 2 detectores). [CONFERIR] cobertura com o diagrama do fabricante.`,
      'Instalação: IVP no canto oposto à entrada do ambiente, apontado para o interior e para o caminho provável do intruso, sem visada direta para janelas, fontes de calor ou saídas de ar-condicionado.',
    ],
    tabela: { colunas: ['Ambiente', 'Part.', 'Área (m²)', 'Maior dim.', 'Portas', 'Janelas prot.', 'Magn.', 'Detector', 'IVP'], linhas: calc.ambientes.map(a => [a.nome, a.particao, num(a.area, 1), `${num(a.maiorDim, 1)} m`, a.portas, `${a.janelasProtegidas}/${a.janelas}`, a.magneticos, ROTULO_DETECTOR[a.tipoIvp], a.ivps]), proporcoes: [2, 0.5, 0.8, 0.8, 0.6, 0.8, 0.6, 1.6, 0.5], tamanho: 15 } },
    ...(ext ? [{ titulo: t('Proteção perimetral externa'), paragrafos: [
      'Barreiras infravermelhas ativas (IVA) ao longo de cada trecho reto do perímetro: nº de pares = maior entre o nº de trechos e ⌈comprimento ÷ alcance útil⌉. O alcance útil adotado é a metade do alcance nominal do fabricante, por causa de neblina, chuva e sol direto. IVP externos com imunidade a pequenos animais e lente/cortina adequada à área. Equipamentos externos em classe ambiental IV. [CONFERIR] alcance com o fabricante.',
    ], tabela: { colunas: ['Área', 'Tipo', 'Comprimento (m)', 'Trechos', 'Alcance útil (m)', 'Quantidade'], linhas: calc.externas.map(e => [e.nome, e.tipo === 'barreira' ? 'Barreira IVA' : 'IVP externo', num(e.comprimento, 1), e.lados || 1, num(e.alcance, 0), `${e.qtd} ${e.tipo === 'barreira' ? 'par(es)' : 'un'}`]), proporcoes: [2.2, 1, 1, 0.7, 1, 0.9] } }] : []),
    { titulo: t('Zonas, partições e central (EN 50131-3)'), paragrafos: [
      `${calc.nZonas} zonas (${calc.zonasFio} com fio e ${calc.nZonas - calc.zonasFio} sem fio). Com ${num(calc.reserva * 100, 0)} % de reserva: ${calc.zonasComReserva} zonas → central de ${calc.central.zonasMax} zonas e ${calc.central.particoes} partições, com ${calc.central.zonasPlaca} zonas na placa${calc.expansores ? ` e ${calc.expansores} expansor(es) de 8 zonas (${calc.zonasFioReserva} zonas com fio com reserva)` : ''}${calc.receptores ? `, ${calc.receptores} receptor(es) sem fio para ${calc.dispSemFio} dispositivo(s)` : ''}${calc.repetidores ? ` e ${calc.repetidores} repetidor(es) de sinal (${num(calc.areaSemFio, 0)} m² com dispositivos sem fio; ${num(s.area_radio_m2 || 300, 0)} m² por central/repetidor adotados [CONFERIR])` : ''}.`,
      `Zonas temporizadas apenas no caminho de entrada (${calc.acessos ? `acesso principal: ${calc.ambientes.filter(a => a.acesso_principal).map(a => a.nome).join(', ')}` : 'nenhum ambiente marcado como acesso principal — definir no projeto [CONFERIR]'}), com o IVP desse ambiente como zona seguidora; demais zonas instantâneas; botões de pânico e coação em zona 24 h silenciosa. A central fica dentro da área supervisionada, fora da vista do acesso, com tamper de abertura.`,
    ],
    tabela: { colunas: ['Zona', 'Ambiente', 'Dispositivo', 'Tipo', 'Part.', 'Ligação'], linhas: calc.zonas.map(z => [z.id, z.ambiente, z.dispositivo, z.tipo, z.particao, z.semFio ? 'sem fio' : 'com fio']), proporcoes: [0.5, 1.8, 2, 1.1, 0.5, 0.8], tamanho: 15 } },
    { titulo: t('Comando e dispositivos de aviso (EN 50131-4)'), paragrafos: [
      `${calc.teclados} teclado(s) — no mínimo um por partição e um junto a cada acesso principal (${calc.acessos}), a cerca de 1,40 m do piso, dentro da área protegida. ${calc.sirenesInternas} sirene(s) interna(s) (uma por partição) e ${calc.sirenesExternas} sirene(s) externa(s) na fachada, em altura de difícil acesso${calc.autoalimentada ? ', autoalimentada(s) com bateria própria e tamper' : ''}. Código de usuário com no mínimo ${calc.digitosSenha} dígitos; senhas de fábrica alteradas na entrega.`,
    ] },
    { titulo: t('Alimentação (EN 50131-6 e NBR 5410)'), paragrafos: [
      `Autonomia exigida: ${b.autonomiaH} h${Number(s.autonomia_h) > 0 ? ' (informada no projeto)' : ` (grau ${calc.grau}, ${calc.notificado ? 'falta de rede notificada à central de monitoramento' : 'sem notificação remota'})`}, mais ${b.tAlarmeMin} min em alarme. Capacidade da bateria = ${num(b.fator, 2)} × (${num(b.iRepouso, 0)} mA × ${b.autonomiaH} h + ${num(b.iAlarme, 0)} mA × ${b.tAlarmeMin}/60 h) / 1000 = ${num(b.bateriaAh, 2)} Ah → ${b.nBaterias > 1 ? `${b.nBaterias} × ` : ''}bateria selada 12 V de ${b.bateriaEscolhida} Ah. O fator ${num(b.fator, 2)} cobre envelhecimento e fim de vida da bateria. [CONFERIR]`,
      `Fonte em regime contínuo = repouso + recarga de 80 % da bateria em ${b.recargaH} h = ${num(b.iRepouso / 1000, 2)} A + ${num(b.iRecarga, 2)} A = ${num(b.fonteA, 2)} A${b.fonteAux ? `, acima da fonte da central (${num(b.fonteCentral, 1)} A adotados) → fonte auxiliar supervisionada de ${b.fonteAux} A` : ''}. Em alarme (${num(b.iAlarme / 1000, 2)} A), a bateria complementa a fonte durante o tempo de sirene. Consumos ${dados.sistema?.consumos && Object.keys(dados.sistema.consumos).length ? 'informados pelo fabricante' : 'típicos adotados — [CONFERIR] com a ficha técnica dos equipamentos'}.`,
      'Central alimentada por circuito exclusivo do quadro de distribuição, com disjuntor identificado e DPS classe II (NBR 5410); DPS de sinal nas linhas de comunicação que saem da edificação (NBR 5419-4).',
    ],
    tabela: { colunas: ['Equipamento', 'Qtd.', 'Repouso (mA)', 'Total repouso', 'Alarme (mA)', 'Total alarme'], linhas: [...b.linhas.map(l => [l.equipamento, l.qtd, num(l.repouso, 1), num(l.totalRepouso, 0), num(l.alarme, 1), num(l.totalAlarme, 0)]), ['TOTAL', '', '', num(b.iRepouso, 0), '', num(b.iAlarme, 0)]], proporcoes: [2.4, 0.5, 0.9, 0.9, 0.9, 0.9] },
    notas: ['Dispositivos sem fio operam com bateria própria (lítio) e não entram no consumo da central; repetidores têm fonte e bateria próprias com a mesma autonomia.'] },
    { titulo: t('Comunicação e monitoramento (EN 50136)'), paragrafos: calc.monitorado ? [
      `Transmissão dos eventos à central de monitoramento por ${meiosTexto(calc)}, protocolo ${ROT_PROTOCOLO[s.protocolo] || ROT_PROTOCOLO.contact_id}. Categoria mínima do sistema de transmissão para o grau ${calc.grau}: ${calc.ats.categoria} (EN 50136-1), com teste periódico de supervisão do canal no intervalo da categoria e tempo de transmissão ≤ ${calc.ats.transmissaoS} s adotado no ensaio. [CONFERIR]`,
      calc.meios.length > 1 ? 'Dupla via: a falha da via principal é sinalizada e os eventos seguem pela via reserva.' : 'Via única de comunicação: a falha da via não tem caminho alternativo para ser notificada.',
      'Eventos mínimos transmitidos: disparo por zona, pânico/coação, armar/desarmar com usuário, tamper, falta de rede, bateria baixa, falha de comunicação e teste periódico.',
      ...(s.verificacao_video ? ['Verificação por imagem/vídeo: imagens tratadas só para a finalidade de verificação do alarme, com acesso restrito e registrado e retenção definida em política escrita (LGPD, art. 6º e 46).'] : []),
    ] : ['Sistema sem monitoramento remoto: o aviso é só local (sirenes). Para os graus 2 a 4, conferir se as opções de notificação da EN 50131-1 são atendidas sem transmissão remota. [CONFERIR]'] },
    { titulo: t('Cabeamento e infraestrutura'), paragrafos: [
      `Cabo de alarme de 4 vias para cada detector, grupo de magnéticos e teclado com fio: distância média de ${num(s.distancia_media_m || 15, 0)} m até a central × fator de percurso ${num(s.fator_cabo || 1.3, 2)} + 2 m de sobra (${num(calc.cabo4, 0)} m). Sirenes em cabo 2 × 0,75 mm² (${num(calc.cabo2, 0)} m). Infraestrutura em eletroduto/canaleta separada dos circuitos de energia (${num(calc.infra, 0)} m estimados). [CONFERIR] no projeto executivo.`,
    ] },
    { titulo: t('Lista de materiais (preliminar)'), tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 0), m.referencia]), proporcoes: [0.6, 4, 0.5, 0.6, 1.6] } },
    ...(calc.avisos.length ? [{ titulo: 'Avisos', marcadores: calc.avisos }] : []),
  ];
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo do alarme', formato: 'Word', nome: 'Memorial_Alarme',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO — SISTEMA DE ALARME DE INTRUSÃO MONITORADO', subtitulo: 'Referências IEC 62642 / EN 50131, EN 50136 e ABNT NBR 5410', tituloCurto: 'Memorial — alarme', sigla: 'MEM-ALM', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de ambientes, zonas e materiais', formato: 'Excel', nome: 'Alarme',
    gerar: (res) => D.gerarPlanilha([
      { nome: 'Ambientes', colunas: [{ header: 'Ambiente', key: 'nome', width: 26 }, { header: 'Partição', key: 'particao' }, { header: 'Área (m²)', key: 'area', numFmt: '0.0' }, { header: 'Maior dimensão (m)', key: 'maiorDim', numFmt: '0.0' }, { header: 'Pé-direito (m)', key: 'pe', numFmt: '0.00' }, { header: 'Portas', key: 'portas' }, { header: 'Janelas', key: 'janelas' }, { header: 'Janelas protegidas', key: 'janelasProtegidas' }, { header: 'Magnéticos', key: 'magneticos' }, { header: 'Detector', key: 'rotuloIvp', width: 26 }, { header: 'IVP', key: 'ivps' }, { header: 'Zonas', key: 'zonas' }],
        linhas: res.calc.ambientes.map(a => ({ ...a, rotuloIvp: ROTULO_DETECTOR[a.tipoIvp] })) },
      { nome: 'Zonas', colunas: [{ header: 'Zona', key: 'id', width: 8 }, { header: 'Ambiente / área', key: 'ambiente', width: 28 }, { header: 'Dispositivo', key: 'dispositivo', width: 32 }, { header: 'Tipo de zona', key: 'tipo', width: 18 }, { header: 'Partição', key: 'particao' }, { header: 'Ligação', key: 'ligacao' }, { header: 'Cabo 4 vias (m)', key: 'cabo', numFmt: '0.0' }],
        linhas: res.calc.zonas.map(z => ({ ...z, ligacao: z.semFio ? 'sem fio' : 'com fio' })) },
      ...(res.calc.externas.length ? [{ nome: 'Perímetro', colunas: [{ header: 'Área', key: 'nome', width: 28 }, { header: 'Tipo', key: 'tipo', width: 14 }, { header: 'Comprimento (m)', key: 'comprimento' }, { header: 'Trechos', key: 'lados' }, { header: 'Alcance útil (m)', key: 'alcance' }, { header: 'Quantidade', key: 'qtd' }], linhas: res.calc.externas }] : []),
      { nome: 'Bateria (EN 50131-6)', colunas: [{ header: 'Equipamento', key: 'equipamento', width: 34 }, { header: 'Qtd.', key: 'qtd' }, { header: 'Repouso (mA)', key: 'repouso' }, { header: 'Total repouso (mA)', key: 'totalRepouso' }, { header: 'Alarme (mA)', key: 'alarme' }, { header: 'Total alarme (mA)', key: 'totalAlarme' }],
        linhas: [...res.calc.bateria.linhas, { equipamento: `TOTAL — autonomia ${res.calc.bateria.autonomiaH} h → ${res.calc.bateria.bateriaAh.toFixed(2)} Ah (bateria ${res.calc.bateria.nBaterias} × ${res.calc.bateria.bateriaEscolhida} Ah)`, totalRepouso: res.calc.bateria.iRepouso, totalAlarme: res.calc.bateria.iAlarme }] },
      D.abaMateriais(res.calc.materiais),
    ]) },
  { tipo: 'laudo', rotulo: 'Relatório de vistoria e teste', formato: 'Word', nome: 'Relatorio_Alarme',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, {
      titulo: 'RELATÓRIO DE VISTORIA E TESTE — SISTEMA DE ALARME DE INTRUSÃO',
      tipoInspecao: res.insp.tipo === 'comissionamento' ? 'Comissionamento e entrega (teste zona a zona)' : 'Vistoria técnica / manutenção preventiva',
      tituloCurto: 'Relatório — alarme', sigla: 'REL-ALM',
      objetivo: 'Verificar o funcionamento de cada zona, a proteção contra violação (tamper), a alimentação e a bateria, os tempos de entrada e saída, as senhas, os dispositivos de aviso e a comunicação com a central de monitoramento do sistema de alarme de intrusão, tomando como referência a série EN 50131 e a EN 50136.',
      listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
      descricao: [
        ['Sistema', `Grau ${res.calc.grau} — ${ROTULO_TECNOLOGIA[res.calc.tecnologia]} — ${res.calc.nZonas} zonas em ${res.calc.particoes} partição(ões)`],
        ['Central', `${res.calc.central.zonasMax} zonas / ${res.calc.central.particoes} partições${res.dados.sistema?.central_modelo ? ` — ${res.dados.sistema.central_modelo}` : ''}`],
        ['Monitoramento', res.calc.monitorado ? `${meiosTexto(res.calc)} — ${ROT_PROTOCOLO[res.dados.sistema?.protocolo] || ROT_PROTOCOLO.contact_id}` : 'não monitorado'],
        ['Bateria de projeto', `${res.calc.bateria.nBaterias} × ${res.calc.bateria.bateriaEscolhida} Ah — autonomia ${res.calc.bateria.autonomiaH} h`],
        ...(res.med.tempoSaida != null ? [['Tempo de saída programado', `${num(res.med.tempoSaida, 0)} s`]] : []),
      ],
      metodologia: [
        'Inspeção visual da central, fonte, bateria, detectores, sirenes, teclados e infraestrutura.',
        'Teste de cada zona (walk test e abertura de cada esquadria) com conferência da indicação na central e do evento recebido pela central de monitoramento.',
        'Abertura das tampas para teste de tamper; simulação de falta de rede e medição da tensão da bateria sob carga.',
        'Cronometragem dos tempos de entrada/saída e do tempo de transmissão dos eventos; teste da via reserva de comunicação.',
      ],
      medicoes: [
        { titulo: '6.1 Teste das zonas', colunas: ['Zona', 'Local', 'Disparo', 'Evento na monitoração', 'Obs.', 'Resultado'], proporcoes: [0.6, 1.6, 0.7, 1, 2, 0.8],
          linhas: res.med.zonas.map(m => [m.zona || '', m.local || '', m.disparo_ok === false ? 'falha' : m.disparo_ok ? 'ok' : '', !res.calc.monitorado ? 'NA' : m.evento_ok === false ? 'falha' : m.evento_ok ? 'ok' : '', m.observacao || '', m.resultado]) },
        { titulo: '6.2 Ensaios do sistema', colunas: ['Grandeza', 'Medido', 'Critério', 'Resultado'], proporcoes: [2.4, 0.7, 2, 0.8],
          linhas: res.med.ensaios.map(m => [m.grandeza, m.valor == null ? '' : num(m.valor, 1), m.criterio, m.resultado]) },
      ],
      proximaInspecao: [['Manutenção preventiva', 'No mínimo anual (semestral nos graus 3 e 4), com teste de todas as zonas e da comunicação — EN 50131-7 [CONFERIR]'], ['Bateria', 'Teste anual sob carga; troca conforme vida útil do fabricante (tipicamente 3 a 5 anos)']],
    }, { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Alarme',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, {
      titulo: 'CHECKLIST DE CAMPO — ALARME DE INTRUSÃO MONITORADO', subtitulo: 'Vistoria e teste zona a zona (EN 50131 / EN 50136)', tituloCurto: 'Checklist — alarme', secoesChecklist: SECOES_CHECKLIST,
      preparacao: [
        'Avisar a central de monitoramento e o cliente antes dos testes (colocar a conta em teste) para evitar atendimento indevido.',
        'Ter a senha do instalador e a lista de zonas; levar multímetro, cronômetro, escada e celular para confirmar eventos com a central de monitoramento.',
      ],
      referencias: [
        ['Zonas previstas', `${res.calc.nZonas} (${res.calc.zonasFio} com fio)`],
        ['Partições / teclados', `${res.calc.particoes} / ${res.calc.teclados}`],
        ['Bateria mínima', `${res.calc.bateria.nBaterias} × ${res.calc.bateria.bateriaEscolhida} Ah (${res.calc.bateria.autonomiaH} h)`],
        ['Tempo de entrada máximo', `${TEMPO_ENTRADA_MAX_S} s`],
        ...(res.calc.monitorado ? [['Tempo de transmissão máximo', `${res.calc.ats.transmissaoS} s (${res.calc.ats.categoria})`]] : []),
      ],
      medicoes: [{ titulo: 'Teste zona a zona', colunas: ['Zona', 'Local / dispositivo', 'Disparo', 'Tamper', 'Evento recebido', 'Obs.'], proporcoes: [0.6, 2.4, 0.7, 0.7, 0.9, 1.5],
        linhas: res.calc.zonas.map(z => [z.id, `${z.ambiente} — ${z.dispositivo}`, '☐', '☐', res.calc.monitorado ? '☐' : 'NA', '']) }],
    }, res.checklist)) },
];

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade) => ({ secao: S, subgrupo: 'Alarme', codigo, descricao, quantidade, unidade });
  const orc = dados.orcamento || {};
  // Mensalidade do monitoramento: contrato à parte, recorrente — NÃO entra como item
  // (na seção de mão de obra ela era somada ao total da instalação); vai nas observações.
  const mensalidade = calc.monitorado && orc.incluir_mensalidade
    ? ` Mensalidade do monitoramento 24 h (${meiosTexto(calc)})${Number(orc.mensalidade_valor) > 0 ? `: referência R$ ${num(orc.mensalidade_valor, 2)}/mês` : ''} — contrato à parte com a empresa de monitoramento, não compõe o total desta proposta.`
    : '';
  let itens;
  if (modo === 'inspecao') {
    itens = [
      srv('alarme_vistoria', 'Vistoria e teste do alarme por zona (disparo, tamper e evento na central de monitoramento)', calc.nZonas, 'un'),
      srv('alarme_laudo', 'Relatório de vistoria e teste do alarme com ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
    ];
  } else {
    const nIvp = calc.nIvp + calc.nIvpExt;
    itens = [
      ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Alarme', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      ...(calc.nMag + calc.panico ? [srv('alarme_sensor_abertura', `Instalação de sensor de abertura (magnético) porta/janela${calc.panico ? ' e botão de pânico' : ''}`, calc.nMag + calc.panico, 'un')] : []),
      ...(nIvp ? [srv('alarme_ivp', 'Instalação de sensor infravermelho passivo (IVP, pet, dupla tecnologia ou externo)', nIvp, 'un')] : []),
      ...(calc.nBarreiras ? [srv('alarme_barreira', 'Instalação e alinhamento de barreira infravermelha ativa (par TX + RX)', calc.nBarreiras, 'par')] : []),
      srv('alarme_sirene', 'Instalação de sirene', calc.sirenesInternas + calc.sirenesExternas, 'un'),
      srv('alarme_teclado', 'Instalação de teclado de comando', calc.teclados, 'un'),
      ...(calc.repetidores ? [srv('alarme_repetidor', 'Instalação de repetidor de sinal', calc.repetidores, 'un')] : []),
      srv('alarme_central', `Instalação e configuração da central de alarme (zonas, partições, usuários${calc.expansores ? ', expansores' : ''}${calc.receptores ? ', receptor sem fio' : ''})`, 1, 'un'),
      ...(calc.monitorado && calc.meios.length ? [srv('alarme_comunicacao', `Instalação e configuração do comunicador (${meiosTexto(calc)}) e teste com a central de monitoramento`, 1, 'vb')] : []),
      ...(calc.cabo4 + calc.cabo2 ? [srv('alarme_infra', 'Infraestrutura e lançamento de cabos do alarme', calc.cabo4 + calc.cabo2, 'm')] : []),
      srv('alarme_comissionamento', 'Comissionamento: teste zona a zona, teste de comunicação e treinamento do usuário', 1, 'vb'),
      srv('alarme_projeto', 'Projeto do sistema de alarme (zonas, partições, bateria) com ART', 1, 'vb'),
    ];
  }
  const obra = dados.obra?.nome || 'a edificação';
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: modo === 'inspecao'
      ? `Vistoria e teste do sistema de alarme de intrusão de ${obra} (${calc.nZonas} zonas), com teste zona a zona, tamper, bateria, tempos de entrada/saída${calc.monitorado ? ', comunicação com a central de monitoramento' : ''} e relatório com ART.`
      : `Fornecimento e instalação de sistema de alarme de intrusão${calc.monitorado ? ' monitorado' : ''} grau ${calc.grau} em ${obra}: ${calc.nSensores} sensores (${calc.nMag} magnéticos, ${calc.nIvp} IVP${calc.nBarreiras ? `, ${calc.nBarreiras} par(es) de barreira` : ''}${calc.nIvpExt ? `, ${calc.nIvpExt} IVP externo(s)` : ''}), central de ${calc.central.zonasMax} zonas com ${calc.particoes} partição(ões), ${calc.teclados} teclado(s), ${calc.sirenesInternas + calc.sirenesExternas} sirene(s), bateria de ${calc.bateria.nBaterias > 1 ? `${calc.bateria.nBaterias} × ` : ''}${calc.bateria.bateriaEscolhida} Ah (${calc.bateria.autonomiaH} h)${calc.monitorado && calc.meios.length ? ` e comunicação ${meiosTexto(calc)}` : ''}, com cabeamento, programação, testes e treinamento.`,
    observacoes: `Rascunho gerado pela skill de alarme — conferir modelos, quantidades e preços antes de enviar ao cliente.${mensalidade}`,
    itens,
  };
}

const OP = {
  grau: F.op([['1', 'Grau 1 — risco baixo'], ['2', 'Grau 2 — risco baixo a médio (residências, comércio)'], ['3', 'Grau 3 — risco médio a alto'], ['4', 'Grau 4 — risco alto']]),
  classe: F.op(Object.entries(CLASSES_AMBIENTAIS)),
  tecnologia: F.op(Object.entries(ROTULO_TECNOLOGIA)),
  protocolo: F.op(Object.entries(ROT_PROTOCOLO)),
  janelas: F.op([['acessiveis', 'Só as marcadas como acessíveis'], ['todas', 'Todas as janelas'], ['nenhuma', 'Nenhuma (só IVP)']]),
  risco: F.op([['normal', 'Normal'], ['alto', 'Alto (dupla tecnologia)']]),
  externa: F.op([['barreira', 'Barreira IVA (par)'], ['ivp_externo', 'IVP externo']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Sistema', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.grau', rotulo: 'Grau de segurança (EN 50131-1)', tipo: 'selecao', opcoes: OP.grau },
      { caminho: 'sistema.classe_ambiental', rotulo: 'Classe ambiental (internos)', tipo: 'selecao', opcoes: OP.classe },
      { caminho: 'sistema.tecnologia', rotulo: 'Tecnologia', tipo: 'selecao', opcoes: OP.tecnologia, dica: 'Híbrido: magnéticos de janela sem fio, demais com fio' },
      { caminho: 'sistema.particoes', rotulo: 'Partições / setores', tipo: 'numero' },
      { caminho: 'sistema.monitorado', rotulo: 'Monitorado 24 h', tipo: 'check' },
      { caminho: 'sistema.com_ethernet', rotulo: 'Comunicação Ethernet (IP)', tipo: 'check' },
      { caminho: 'sistema.com_gprs', rotulo: 'Comunicação GPRS/4G', tipo: 'check' },
      { caminho: 'sistema.com_linha', rotulo: 'Linha telefônica', tipo: 'check' },
      { caminho: 'sistema.protocolo', rotulo: 'Protocolo', tipo: 'selecao', opcoes: OP.protocolo },
      { caminho: 'sistema.autonomia_h', rotulo: 'Autonomia exigida (h)', tipo: 'numero', dica: 'Vazio = pelo grau: 12 h (graus 1–2), 30 h (graus 3–4 com falta de rede notificada) ou 60 h (sem notificação)' },
      { caminho: 'sistema.tempo_alarme_min', rotulo: 'Tempo de sirene/alarme (min)', tipo: 'numero' },
      { caminho: 'sistema.reserva_zonas_pct', rotulo: 'Reserva de zonas (%)', tipo: 'numero' },
      { caminho: 'sistema.verificacao_video', rotulo: 'Verificação por vídeo (LGPD)', tipo: 'check' },
      { caminho: 'sistema.central_modelo', rotulo: 'Modelo da central (opcional)' },
    ] },
    { tipo: 'nota', texto: 'Critérios de quantidade (padrões entre parênteses) — altere só se o projeto pedir.' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.magneticos_janelas', rotulo: 'Magnéticos nas janelas', tipo: 'selecao', opcoes: OP.janelas },
      { caminho: 'sistema.magnetico_por_porta', rotulo: 'Magnéticos por porta (1)', tipo: 'numero' },
      { caminho: 'sistema.magnetico_por_janela', rotulo: 'Magnéticos por janela (1)', tipo: 'numero' },
      { caminho: 'sistema.agrupar_magneticos', rotulo: 'Magnéticos com fio do ambiente em série numa zona', tipo: 'check' },
      { caminho: 'sistema.ivp_alcance_m', rotulo: 'Alcance do IVP (12 m)', tipo: 'numero' },
      { caminho: 'sistema.ivp_abertura_graus', rotulo: 'Abertura do IVP (90°)', tipo: 'numero' },
      { caminho: 'sistema.ivp_externo_alcance_m', rotulo: 'Alcance do IVP externo (12 m)', tipo: 'numero' },
      { caminho: 'sistema.area_radio_m2', rotulo: 'Área por central/repetidor sem fio (300 m²)', tipo: 'numero' },
      { caminho: 'sistema.distancia_media_m', rotulo: 'Distância média à central (15 m)', tipo: 'numero' },
      { caminho: 'sistema.fator_cabo', rotulo: 'Fator de percurso do cabo (1,3)', tipo: 'numero' },
      { caminho: 'sistema.sirenes_externas', rotulo: 'Sirenes externas (1)', tipo: 'numero' },
      { caminho: 'sistema.sirene_autoalimentada', rotulo: 'Sirene externa autoalimentada', tipo: 'check', dica: 'Obrigatória nos graus 3 e 4' },
      { caminho: 'sistema.botoes_panico', rotulo: 'Botões de pânico', tipo: 'numero' },
      { caminho: 'sistema.controles_remotos', rotulo: 'Controles remotos', tipo: 'numero' },
      { caminho: 'sistema.fonte_central_a', rotulo: 'Fonte da central (1,5 A)', tipo: 'numero' },
    ] },
    { tipo: 'nota', texto: 'Consumos (mA a 12 V) para o cálculo da bateria — deixe vazio para usar valores típicos; preencha com a ficha técnica do fabricante.' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.consumos.central.repouso', rotulo: 'Central — repouso', tipo: 'numero' }, { caminho: 'sistema.consumos.central.alarme', rotulo: 'Central — alarme', tipo: 'numero' },
      { caminho: 'sistema.consumos.ivp.repouso', rotulo: 'IVP — repouso', tipo: 'numero' }, { caminho: 'sistema.consumos.teclado.repouso', rotulo: 'Teclado — repouso', tipo: 'numero' },
      { caminho: 'sistema.consumos.barreira.repouso', rotulo: 'Barreira (par) — repouso', tipo: 'numero' }, { caminho: 'sistema.consumos.sirene_externa.alarme', rotulo: 'Sirene externa — alarme', tipo: 'numero' },
      { caminho: 'sistema.consumos.com_gprs.alarme', rotulo: 'Comunicador 4G — transmissão', tipo: 'numero' }, { caminho: 'sistema.consumos.com_ethernet.repouso', rotulo: 'Comunicador IP — repouso', tipo: 'numero' },
    ] },
  ] },
  { titulo: '3. Ambientes', aberta: true, itens: [
    { tipo: 'nota', texto: 'Portas: só as de acesso (exterior, garagem ou área não protegida) — recebem magnético. Janelas: o sistema lê portas/janelas das legendas de esquadrias da arquitetura. Marque "Acesso principal" onde fica a porta de entrada usada para armar/desarmar (zona temporizada e teclado).' },
    { tipo: 'tabela', caminho: 'ambientes', rotuloAdicionar: 'Adicionar ambiente',
      novaLinha: { nome: '', particao: 1, area_m2: null, maior_dimensao_m: null, portas: 0, janelas: 0, janelas_acessiveis: true, pe_direito_m: 2.8, externo: false, animais: false, risco: 'normal', acesso_principal: false, ivp_manual: null },
      colunas: [
        { campo: 'nome', rotulo: 'Ambiente' }, { campo: 'particao', rotulo: 'Part.', tipo: 'numero', largura: 60 },
        { campo: 'area_m2', rotulo: 'Área (m²)', tipo: 'numero', largura: 80 }, { campo: 'maior_dimensao_m', rotulo: 'Maior dim. (m)', tipo: 'numero', largura: 90 },
        { campo: 'portas', rotulo: 'Portas', tipo: 'numero', largura: 60 }, { campo: 'janelas', rotulo: 'Janelas', tipo: 'numero', largura: 60 },
        { campo: 'janelas_acessiveis', rotulo: 'Janelas acessíveis', tipo: 'check', largura: 80 }, { campo: 'pe_direito_m', rotulo: 'Pé-dir. (m)', tipo: 'numero', largura: 70 },
        { campo: 'externo', rotulo: 'Externo / perímetro', tipo: 'check', largura: 80 }, { campo: 'animais', rotulo: 'Animais (pet)', tipo: 'check', largura: 70 },
        { campo: 'risco', rotulo: 'Risco', tipo: 'selecao', opcoes: OP.risco, largura: 150 }, { campo: 'acesso_principal', rotulo: 'Acesso principal', tipo: 'check', largura: 80 },
        { campo: 'ivp_manual', rotulo: 'IVP (manual)', tipo: 'numero', largura: 70 },
      ] },
  ] },
  { titulo: '4. Áreas externas (perímetro)', itens: [
    { tipo: 'nota', texto: 'Comprimento do perímetro a proteger e número de trechos retos (cada trecho reto exige ao menos um par de barreira). Alcance útil: metade do alcance nominal do fabricante.' },
    { tipo: 'tabela', caminho: 'areas_externas', rotuloAdicionar: 'Adicionar área externa',
      novaLinha: { nome: '', tipo: 'barreira', comprimento_m: null, lados: 1, alcance_m: 30, distancia_central_m: 20, particao: 1, feixes: 4 },
      colunas: [
        { campo: 'nome', rotulo: 'Área' }, { campo: 'tipo', rotulo: 'Proteção', tipo: 'selecao', opcoes: OP.externa, largura: 150 },
        { campo: 'comprimento_m', rotulo: 'Comprimento (m)', tipo: 'numero', largura: 100 }, { campo: 'lados', rotulo: 'Trechos retos', tipo: 'numero', largura: 80 },
        { campo: 'alcance_m', rotulo: 'Alcance útil (m)', tipo: 'numero', largura: 90 }, { campo: 'distancia_central_m', rotulo: 'Dist. à central (m)', tipo: 'numero', largura: 100 },
        { campo: 'particao', rotulo: 'Part.', tipo: 'numero', largura: 60 }, { campo: 'feixes', rotulo: 'Feixes', tipo: 'numero', largura: 60 },
      ] },
  ] },
  { titulo: '5. Orçamento', itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'orcamento.incluir_mensalidade', rotulo: 'Incluir mensalidade de monitoramento (informativo)', tipo: 'check' },
      { caminho: 'orcamento.mensalidade_valor', rotulo: 'Mensalidade de referência (R$/mês)', tipo: 'numero' },
    ] },
  ] },
  F.secaoInspecao(6, F.op([['vistoria', 'Vistoria / manutenção preventiva'], ['comissionamento', 'Comissionamento e entrega']])),
  F.secaoChecklist(7, CHECKLIST.length),
  { titulo: '8. Ensaios e teste das zonas', itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'inspecao.ensaios.tempo_entrada_s', rotulo: 'Tempo de entrada (s)', tipo: 'numero' },
      { caminho: 'inspecao.ensaios.tempo_saida_s', rotulo: 'Tempo de saída (s)', tipo: 'numero' },
      { caminho: 'inspecao.ensaios.tempo_transmissao_s', rotulo: 'Tempo de transmissão do evento (s)', tipo: 'numero' },
      { caminho: 'inspecao.ensaios.tensao_bateria_v', rotulo: 'Tensão da bateria sem rede, sob carga (V)', tipo: 'numero' },
    ] },
    { tipo: 'tabela', caminho: 'inspecao.teste_zonas', rotuloAdicionar: 'Adicionar teste de zona', novaLinha: { zona: 'Z{n}', local: '', disparo_ok: null, evento_ok: null, observacao: '' },
      colunas: [{ campo: 'zona', rotulo: 'Zona', largura: 70 }, { campo: 'local', rotulo: 'Local / dispositivo' }, { campo: 'disparo_ok', rotulo: 'Disparo ok', tipo: 'check', largura: 80 }, { campo: 'evento_ok', rotulo: 'Evento recebido', tipo: 'check', largura: 90 }, { campo: 'observacao', rotulo: 'Observação' }] },
  ] },
  F.secaoNcs(9, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(10),
];

module.exports = criarDisciplina({
  chave: 'alarme',
  nome: 'Alarme de intrusão monitorado (EN 50131 / EN 50136)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Instalação do alarme', descricao: 'Central, sensores, teclados, sirenes, bateria, comunicação, cabos e mão de obra' },
    { modo: 'inspecao', rotulo: 'Vistoria e teste', descricao: 'Teste zona a zona, relatório e correção das não conformidades' },
  ],
  montarOrcamento,
});
