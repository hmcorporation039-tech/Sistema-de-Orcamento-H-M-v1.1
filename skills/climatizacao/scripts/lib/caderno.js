// Caderno de fabricação e montagem do QUADRO DA CENTRAL DE ÁGUA GELADA (QCAG, PDF): alimentação
// de cada chiller (o chiller tem painel próprio — aqui só o disjuntor e o cabo de saída), as
// partidas das bombas primárias, secundárias e de condensação com os MESMOS dados de motor e
// partida do cálculo da skill (centrais.js → _comum/eletrico/motores.js: direta ou inversor),
// a reserva de cada grupo e o CLP de sequenciamento/intertravamento. O quadro é o da skill de
// quadros, pelo módulo comum _comum/fabricacao/cadernoPainel.js (invólucro, barramento, partidas,
// fonte 24 Vcc, E/S com reserva, relés de interface, bornes, plaquetas, materiais, lista de
// materiais com preço, ensaios de rotina da NBR IEC 61439-1). A lógica de intertravamento é a
// descrição funcional usual de CAG — tempos e sinais conforme o fabricante do chiller [CONFERIR].

const P = require('../../../_comum/fabricacao/cadernoPainel');
const { fmtNum } = require('../../../_comum/docx-base');

const num = fmtNum;
const TAG = 'QCAG';
const PARTIDA = { direta: 'direta', estrela_triangulo: 'estrela_triangulo', soft_starter: 'soft_starter', inversor: 'inversor' };

const NORMAS = [
  { codigo: 'ABNT NBR 16401-1', titulo: 'Instalações de ar-condicionado — sistemas centrais e unitários — projeto das instalações', aplicacao: 'Central de água gelada: chillers, bombas e controle do sistema hidrônico.' },
  { codigo: 'ABNT NBR IEC 60947-4-1', titulo: 'Contatores e partidas de motores', aplicacao: 'Partidas diretas das bombas (contator AC-3, disjuntor-motor com sobrecarga).' },
  { codigo: 'IEC 61800-5-1 / IEC 61800-3', titulo: 'Acionamentos de velocidade variável', aplicacao: 'Inversores das bombas secundárias (vazão variável pela ΔP).' },
  { codigo: 'ABNT NBR 5410', titulo: 'Instalações elétricas de baixa tensão', aplicacao: 'Circuitos dos chillers e das bombas (6.5.1), proteção e cabos de saída.' },
];

const central = (res) => (res.calc.projeto && res.calc.projeto.central) || null;
const exigeCaderno = (res) => !!central(res);

function montarQuadro(res, ce) {
  const { calc, dados } = res;
  const vff = Number((dados.eletrica || {}).tensao_ff) || 380;
  const chillers = calc.eletrica.cargas.filter(x => /^CH-/.test(x.tag));
  const circuitos = chillers.map(x => ({
    n: x.tag, descricao: `Alimentação do ${x.descricao} (painel próprio do chiller)`, tipo: 'tue', ligacao: 'FFF', fases: 'ABC',
    potencia_w: Math.round(x.kw * 1000), fp: 0.9, ib_a: Math.round(x.in * 100) / 100, disjuntor_a: null, curva: 'C', icu_ka: null, dr: '', secao_mm2: null, local_dr: false,
  }));
  const motores = ce.bombas.map(b => ({
    tag: b.tag, descricao: `Bomba ${b.funcao}`, potencia: b.motor.cv, unidade: 'cv', rendimento: b.motor.eta, fp: b.motor.fp,
    partida: PARTIDA[b.motor.partida.tipo] || 'direta', quantidade: 1, secao_mm2: null, tensao_placa: '',
    operando: !/reserva/i.test(b.funcao),
  }));
  const nCh = chillers.length;
  const sinais = [
    { tag: 'CH', descricao: 'Chiller: em operação e falha (contatos do painel do chiller)', tipo: 'DI', quantidade: 2 * nCh },
    { tag: 'CH', descricao: 'Chiller: habilitação remota', tipo: 'DO', quantidade: nCh },
    { tag: 'FS-EV', descricao: 'Fluxostato do evaporador (prova de vazão de água gelada)', tipo: 'DI', quantidade: nCh },
    ...(ce.condAgua ? [{ tag: 'FS-CD', descricao: 'Fluxostato do condensador (prova de vazão de condensação)', tipo: 'DI', quantidade: nCh }] : []),
    { tag: 'TT', descricao: 'Temperatura da água gelada — saída e retorno (4–20 mA)', tipo: 'AI', quantidade: 2 },
    ...(ce.arranjo === 'primario_secundario' ? [{ tag: 'PDT', descricao: 'Pressão diferencial do circuito secundário (4–20 mA) — PID das bombas secundárias', tipo: 'AI', quantidade: 1 }] : []),
    ...(ce.condAgua ? [{ tag: 'TT-CD', descricao: 'Temperatura da água de condensação (torre)', tipo: 'AI', quantidade: 1 }, { tag: 'TR', descricao: 'Ventilador da torre: comando', tipo: 'DO', quantidade: 1 }] : []),
  ];
  const porta = [
    { tipo: 'sinaleiro_branco', funcao: 'Quadro energizado', quantidade: 1 },
    { tipo: 'seletor', funcao: 'MAN-0-AUT por bomba', quantidade: motores.length },
    { tipo: 'seletor', funcao: 'Chiller LOCAL-0-REMOTO', quantidade: nCh },
    { tipo: 'sinaleiro_vermelho', funcao: 'Falha geral da CAG', quantidade: 1 },
  ];
  return P.dadosDoQuadro(dados, {
    quadro: { tag: TAG, descricao: 'Quadro da central de água gelada', tipo: 'ccm', sistema: 'trifasico', tensao_ff: vff, tensao_fn: Number((dados.eletrica || {}).tensao_fn) || ({ 380: 220, 220: 127, 440: 254 })[vff] || Math.round(vff / Math.sqrt(3)), montagem: 'autoportante', local: 'interno_tecnico', reserva_pct: 20 },
    circuitos, motores,
    automacao: { ativo: true, clp: true, reserva_io_pct: 20, sinais_motores: true, comunicacao: 'ethernet', ihm_pol: 7, switch_portas: 0, sinais, porta },
  });
}

function secoes(res, ce) {
  const { calc } = res;
  const chillers = calc.eletrica.cargas.filter(x => /^CH-/.test(x.tag));
  const grupo = (re) => ce.bombas.filter(b => re.test(b.funcao));
  const desc = (lista) => lista.map(b => `${b.tag} ${num(b.motor.cv, 1)} cv (${b.motor.partida.rotulo.toLowerCase()})`).join(', ');
  return [
    { titulo: 'Central de água gelada — equipamentos atendidos pelo quadro', paisagem: true,
      paragrafos: [`${ce.nChillers} chiller(s) ${ce.rotuloTipo.toLowerCase()} de ${num(ce.trPorChiller)} TR (${ce.nOp} em operação${ce.reserva ? ' + reserva' : ''}), água gelada ${num(ce.tSaida)} °C com ΔT ${num(ce.dtAgua, 1)} K, vazão total ${num(ce.vazaoTotal, 1)} m³/h, arranjo ${ce.arranjo === 'primario_secundario' ? 'primário/secundário' : ce.arranjo}.`],
      tabela: { colunas: ['Tag', 'Equipamento', 'Potência', 'In (A)', 'Acionamento no quadro', 'Operação'],
        linhas: [
          ...chillers.map(x => [x.tag, x.descricao, `${num(x.kw, 1)} kW${x.estimado ? ' (estimada)' : ''}`, num(x.in, 1), 'disjuntor + cabo para o painel do chiller', 'sequenciamento pelo CLP']),
          ...ce.bombas.map(b => [b.tag, `Bomba ${b.funcao} — ${num(b.vazaoM3h, 1)} m³/h × ${num(b.altura, 1)} mca`, `${num(b.motor.cv, 1)} cv`, num(b.motor.in, 1), b.motor.partida.rotulo, /reserva/i.test(b.funcao) ? 'reserva (rodízio)' : 'operação']),
        ], proporcoes: [0.6, 2.6, 0.9, 0.5, 1.6, 1] } },
    { titulo: 'Intertravamentos e sequência de operação', paragrafos: ['Descrição funcional do CLP de sequenciamento (programa entregue com o quadro). Tempos, faixas e sinais seguem o manual do fabricante do chiller e o projeto hidráulico. [CONFERIR]'],
      marcadores: [
        `Partida: bombas ${ce.condAgua ? 'de condensação e ' : ''}primárias antes do chiller; o chiller só é habilitado com a vazão provada pelo fluxostato do evaporador${ce.condAgua ? ' e do condensador' : ''} e a bomba confirmada (contato do contator/acionamento).`,
        'Parada: o chiller sai primeiro; as bombas continuam por um tempo de pós-circulação definido pelo fabricante do chiller. [CONFERIR tempo]',
        `Bombas primárias (${desc(grupo(/^primária/))}): ${ce.bombaReserva ? 'falha da bomba em operação parte a reserva automaticamente; rodízio periódico para igualar as horas.' : 'sem reserva no cálculo.'}`,
        ...(grupo(/^secundária/).length ? [`Bombas secundárias (${desc(grupo(/^secundária/))}): velocidade pelo PID da pressão diferencial do circuito secundário (transmissor PDT no ponto mais desfavorável); reserva em espera.`] : []),
        ...(ce.condAgua ? [`Condensação (${desc(grupo(/condensa/))}): bomba e torre acompanham os chillers; ventilador da torre pela temperatura da água de condensação.`] : []),
        `Sequenciamento dos ${ce.nChillers} chillers pela carga (temperatura de retorno/vazão), com retardo entre estágios e rodízio do líder. [CONFERIR com a estratégia do fabricante]`,
        'Seletoras na porta: bombas MAN-0-AUT (MAN liga direto, fora da lógica, mantendo a proteção do motor); chillers LOCAL-0-REMOTO (REMOTO = habilitado pelo CLP). Falha geral e status para o supervisório/BMS pela rede.',
      ] },
  ];
}

function montarCaderno(res) {
  const ce = central(res);
  if (!ce) throw new Error('O projeto não tem central de água gelada (sistema chiller): não há quadro de CAG para o caderno.');
  const dq = montarQuadro(res, ce);
  const { caderno } = P.cadernoDoQuadro(dq, {
    sigla: 'CAD-CAG', normas: NORMAS,
    subtitulo: `${TAG} — central de água gelada: ${ce.nChillers} chiller(s) de ${num(ce.trPorChiller)} TR, ${ce.bombas.length} bombas (${[...new Set(ce.bombas.map(b => b.motor.partida.rotulo.toLowerCase()))].join(', ')}), CLP de sequenciamento`,
    caracteristicas: [['Central', `${ce.nChillers} × ${num(ce.trPorChiller)} TR — ${ce.rotuloTipo}`], ['Bombas', `${ce.bombas.length} (${ce.bombas.filter(b => /reserva/i.test(b.funcao)).length} reserva)`]],
    secoes: secoes(res, ce),
    verificacoes: [
      { item: 'Intertravamento chiller × bombas', criterio: 'Com a bomba desligada ou o fluxostato aberto (simulado no borne), o CLP não habilita o chiller; com a vazão provada, habilita', norma: 'manual do fabricante do chiller [CONFERIR]' },
      { item: 'Reversão para a bomba reserva', criterio: 'Desarmar o disjuntor-motor (ou falha do inversor) da bomba em operação: a reserva parte e a falha aparece na IHM e no supervisório', norma: 'projeto' },
      { item: 'PID das bombas secundárias', criterio: 'Sinal do PDT no inversor/CLP e resposta da velocidade à variação da ΔP (simulada)', norma: 'IEC 61800-5-1; projeto' },
      { item: 'Seletoras MAN-0-AUT e LOCAL-0-REMOTO', criterio: 'Cada posição conferida em cada bomba e chiller; em MAN a bomba liga sem o CLP e a sobrecarga continua atuando', norma: 'NBR IEC 61439-1, 11.10' },
    ],
    avisos: [
      'Os chillers têm painel próprio (partida dos compressores e proteções internas): o quadro só alimenta e habilita. Potência elétrica do chiller estimada pelo COP — usar a corrente de placa do modelo escolhido (MCA/MFA) para o disjuntor e o cabo. [CONFERIR]',
      ...(ce.condAgua ? ['O ventilador da torre de resfriamento não é dimensionado pela skill: o quadro prevê só o sinal de comando; incluir a partida dele quando a torre for escolhida. [CONFERIR]'] : []),
      'Lista de sinais (fluxostatos, temperaturas, ΔP, status do chiller) é a usual de CAG — conferir com o fabricante do chiller e com a lista de pontos da automação (BMS). [CONFERIR]',
    ],
    precos: res.dados.precos_materiais || null,
  });
  return caderno;
}

const gerarCaderno = (res) => P.gerarPdf(montarCaderno(res));

module.exports = { montarCaderno, gerarCaderno, exigeCaderno, montarQuadro };
