// Caderno de fabricação e montagem da CENTRAL de alarme (PDF), montado a partir
// do dimensionamento da skill: central, fonte, bateria(s), expansores,
// receptor sem fio e comunicadores ficam na caixa CAL-01; teclados, sensores e
// sirenes são itens de campo (na_placa:false), só listados. Não há catálogo de
// central/bateria: medidas típicas por porte, marcadas [CONFERIR]. A bateria
// segue as dimensões comuns das VRLA 12 V. Motor: skills/_comum/fabricacao/caixa.js.

const { cadernoDeCaixas } = require('../../../_comum/fabricacao/caixa');
const { gerarCadernoPdf } = require('../../../_comum/fabricacao/caderno');

const NORMAS = [
  { codigo: 'IEC 62642-1 / EN 50131-1', titulo: 'Sistemas de alarme de intrusão — requisitos gerais', aplicacao: 'grau de segurança, classe ambiental, autonomia da bateria, códigos de acesso e notificação' },
  { codigo: 'EN 50131-3', titulo: 'Equipamento de controle e indicação', aplicacao: 'central: indicações de rede, bateria, armado e disparo, anulação (bypass) e tamper do gabinete' },
  { codigo: 'EN 50131-6', titulo: 'Fontes de alimentação', aplicacao: 'fonte, bateria selada, recarga até 80 % no prazo do grau e supervisão de falta de rede/bateria baixa' },
  { codigo: 'EN 50136-1', titulo: 'Sistemas e equipamentos de transmissão de alarme', aplicacao: 'comunicação com a central de monitoramento (categoria SP/DP, Contact ID / SIA DC-09), supervisão do canal' },
  { codigo: 'ABNT NBR 5410', titulo: 'Instalações elétricas de baixa tensão', aplicacao: 'circuito exclusivo da central, proteção, aterramento (6.4) e advertências' },
  { codigo: 'ABNT NBR 5419-4', titulo: 'Proteção contra descargas atmosféricas — sistemas elétricos e eletrônicos', aplicacao: 'DPS na alimentação e nas linhas de sinal do comunicador, aterrados na barra PE da caixa' },
];

// Bateria selada 12 V (VRLA) — dimensões comuns de mercado: L × A × P (mm) [CONFERIR com a marca]
const BATERIAS = {
  7: [151, 65, 100], 12: [151, 98, 100], 18: [181, 77, 167], 26: [166, 125, 175], 40: [197, 170, 165], 65: [350, 167, 174],
};

const arr = (n, f) => Array.from({ length: n }, (_, i) => f(i + 1));
const br = (v, c = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

function montarCaixa(res) {
  const { calc, dados } = res;
  const s = dados.sistema || {};
  const b = calc.bateria;
  const [bl, ba, bp] = BATERIAS[b.bateriaEscolhida] || BATERIAS[12];
  const modelo = s.central_modelo ? ` (${s.central_modelo})` : '';
  const nomeCom = { ethernet: ['IP', 'Módulo de comunicação Ethernet (IP) — Contact ID / SIA DC-09'], gprs: ['4G', 'Módulo comunicador GPRS/4G (chip M2M) com antena externa'], linha: ['LT', 'Comunicador por linha telefônica (Contact ID)'] };
  const itens = [
    { tipo: 'modulo', tag: 'CT', descricao: `Central de alarme ${calc.central.zonasMax} zonas, ${calc.central.particoes} partições${modelo}, grau ${calc.grau}`, largura_mm: 250, altura_mm: 180, profundidade_mm: 45, fixacao: 'parafuso', fonte: s.central_modelo ? 'modelo informado — medida típica [CONFERIR]' : 'medida típica [CONFERIR]' },
    { tipo: 'modulo', tag: 'FT', descricao: `Fonte chaveada 13,8 V ${br(b.fonteCentral, 1)} A supervisionada com carregador de bateria`, largura_mm: 120, altura_mm: 80, profundidade_mm: 40, fixacao: 'parafuso' },
    ...(b.fonteAux ? [{ tipo: 'modulo', tag: 'FT-AUX', descricao: `Fonte auxiliar supervisionada 13,8 V ${b.fonteAux} A (barreiras e detectores externos)`, largura_mm: 120, altura_mm: 80, profundidade_mm: 40, fixacao: 'parafuso' }] : []),
    ...arr(b.nBaterias, i => ({ tipo: 'bateria', tag: b.nBaterias > 1 ? `BAT-${i}` : 'BAT', descricao: `Bateria selada 12 V ${b.bateriaEscolhida} Ah (VRLA)`, largura_mm: bl, altura_mm: ba, profundidade_mm: bp, fixacao: 'cinta', fonte: 'dimensão comum VRLA [CONFERIR com a marca]' })),
    ...arr(calc.expansores, i => ({ tipo: 'modulo', tag: `EXP-${i}`, descricao: 'Expansor de 8 zonas com fio', largura_mm: 100, altura_mm: 70, profundidade_mm: 25, fixacao: 'parafuso' })),
    ...arr(calc.receptores, i => ({ tipo: 'modulo', tag: `RX-${i}`, descricao: 'Receptor/módulo sem fio (até 64 dispositivos)', largura_mm: 100, altura_mm: 70, profundidade_mm: 25, fixacao: 'parafuso' })),
    ...calc.meios.filter(m => nomeCom[m]).map(m => ({ tipo: 'modulo', tag: `COM-${nomeCom[m][0]}`, descricao: nomeCom[m][1], largura_mm: 90, altura_mm: 60, profundidade_mm: 25, fixacao: 'parafuso' })),
    { tipo: 'modulo', tag: 'DPS-AC', descricao: 'DPS classe II 275 V na entrada da alimentação (circuito exclusivo)', largura_mm: 36, altura_mm: 90, profundidade_mm: 65, fixacao: 'trilho' },
    ...(calc.meios.includes('ethernet') || calc.meios.includes('linha') ? [{ tipo: 'modulo', tag: 'DPS-SIN', descricao: `DPS de sinal para ${calc.meios.includes('ethernet') ? 'rede RJ-45' : 'linha telefônica'} do comunicador`, largura_mm: 60, altura_mm: 40, profundidade_mm: 30, fixacao: 'parafuso' }] : []),
    // campo (fora da caixa)
    ...arr(calc.teclados, i => ({ tipo: 'campo', tag: `TEC-${i}`, descricao: 'Teclado LCD (campo, em caixa 4×2)', na_placa: false })),
    ...(calc.nSensores ? [{ tipo: 'campo', tag: 'SENSORES', descricao: `Sensores (magnéticos, IVP, barreiras e pânico) — ${calc.zonasComReserva} zonas com reserva`, na_placa: false, quantidade: calc.nSensores }] : []),
    ...(calc.sirenesInternas ? [{ tipo: 'campo', tag: 'SIR-INT', descricao: 'Sirene interna 12 V 110 dB', na_placa: false, quantidade: calc.sirenesInternas }] : []),
    ...(calc.sirenesExternas ? [{ tipo: 'campo', tag: 'SIR-EXT', descricao: calc.autoalimentada ? 'Sirene externa autoalimentada com tamper' : 'Sirene externa 12 V 120 dB', na_placa: false, quantidade: calc.sirenesExternas }] : []),
  ];

  const frente = [
    { tipo: 'led', tag: 'LD-REDE', texto: ['REDE'] },
    { tipo: 'led', tag: 'LD-BAT', texto: ['BATERIA'] },
    { tipo: 'led', tag: 'LD-ARM', texto: ['ARMADO'] },
    { tipo: 'led', tag: 'LD-DISP', texto: ['DISPARO'] },
    { tipo: 'led', tag: 'LD-ANUL', texto: ['ANULAÇÃO'] },
    ...(calc.monitorado ? [{ tipo: 'led', tag: 'LD-COM', texto: ['COMUNICAÇÃO'] }] : []),
  ];

  const nZ = calc.zonasComReserva;
  const batTotal = b.bateriaEscolhida * b.nBaterias;
  return {
    id: 'CAL-01',
    titulo: 'CENTRAL DE ALARME DE INTRUSÃO',
    local: String(s.local_central || 'Sala técnica / ponto da central').toUpperCase(),
    funcao: `Central de alarme monitorado (grau ${calc.grau}, classe ambiental ${calc.classeAmbiental}) com ${calc.central.zonasMax} zonas, ${calc.central.particoes} partições disponíveis (${calc.particoes} em uso), ${calc.expansores} expansor(es) e ${calc.receptores} receptor(es) sem fio; fonte e ${b.nBaterias} bateria(s) de ${b.bateriaEscolhida} Ah para ${b.autonomiaH} h de autonomia (carga em repouso ${Math.round(b.iRepouso)} mA).`,
    itens,
    frente,
    ip: 'IP30',
    tensao: '127/220 V ~ 60 Hz (entrada) · 13,8 V CC (central e periféricos)',
    modeloHm: 'H&M CAL',
    normaHm: 'IEC 62642 / EN 50131-1 / EN 50131-6',
    normaInvolucro: 'EN 50131-1 (tamper) · ABNT NBR IEC 60529',
    cabo_interligacao: 'cabo de alarme 4 vias 24 AWG (sensores/teclados) e 2 × 0,75 mm² (sirenes)',
    bornes: Math.max(16, nZ * 2 + calc.teclados * 4 + 8),
    dissipacao_w: 15,
    largura_min_mm: 300, altura_min_mm: 400,
    dados_placa: [
      ['Grau / classe ambiental', `${calc.grau} / ${calc.classeAmbiental}`],
      ['Autonomia da bateria', `${b.autonomiaH} h (+ ${b.tAlarmeMin} min de alarme)`],
      ['Bateria', `${b.nBaterias} × 12 V ${b.bateriaEscolhida} Ah`],
      ['Zonas', `${nZ} (${calc.central.zonasMax} máx.)`],
    ],
    caracteristicas: [
      ['Grau de segurança', `${calc.grau} (IEC 62642-1 / EN 50131-1)`],
      ['Autonomia da bateria', `${b.autonomiaH} h, recarga a 80 % em ${b.recargaH} h`],
      ['Transmissão ao monitoramento', calc.monitorado ? `${calc.meios.join(' + ') || 'sem meio definido'} — ${calc.ats.categoria}, ≤ ${calc.ats.transmissaoS} s` : 'sem monitoramento (aviso local)'],
      ['Código de usuário', `mínimo ${calc.digitosSenha} dígitos`],
    ],
    verificacoes: [
      { item: 'CAL-01 · Autonomia da bateria', criterio: `com a rede desligada, a central segue operando e a bateria mantém ≥ ${b.autonomiaH} h (medir tensão sob carga; sinalização de falta de rede e de bateria baixa na central e no monitoramento)`, norma: 'EN 50131-1 · EN 50131-6' },
      { item: 'CAL-01 · Fonte e recarga', criterio: `tensão de flutuação 13,6 a 13,8 V; recarga a 80 % em até ${b.recargaH} h; fonte ≥ ${b.fonteEscolhida} A (carga calculada ${br(b.fonteA, 2)} A)`, norma: 'EN 50131-6' },
      { item: 'CAL-01 · Teste de cada zona', criterio: `disparo e restauração de cada uma das ${calc.nZonas} zonas instaladas (walk test, abertura de cada esquadria), com indicação correta de zona/partição no teclado${calc.monitorado ? ' e evento recebido na monitoração' : ''}`, norma: 'EN 50131-1' },
      { item: 'CAL-01 · Tamper', criterio: 'abrir a tampa da central, de teclados, sirenes e sensores: alarme de tamper imediato, mesmo desarmado', norma: 'EN 50131-3' },
      { item: 'CAL-01 · Comunicação com a central de monitoramento', criterio: calc.monitorado ? `evento de teste recebido pela central de monitoramento em ≤ ${calc.ats.transmissaoS} s por cada meio (${calc.meios.join(', ')}); falha do canal principal comutando para o reserva; supervisão do canal ativa` : 'não aplicável (sistema sem monitoramento)', norma: 'EN 50136-1' },
      { item: 'CAL-01 · Sinalizadores e anulação', criterio: 'LEDs REDE/BATERIA/ARMADO/DISPARO/ANULAÇÃO acendem conforme a condição; anulação (bypass) só por código e registrada', norma: 'EN 50131-3' },
      { item: 'CAL-01 · Alimentação', criterio: 'circuito exclusivo com disjuntor próprio, DPS ligado à barra PE, tensão de entrada conferida antes de ligar a central', norma: 'ABNT NBR 5410 · NBR 5419-4' },
    ],
    avisos: [
      ...(batTotal > 18 ? [`Bateria total de ${batTotal} Ah ocupa grande parte da caixa; avaliar gabinete maior ou fonte auxiliar com bateria própria. [CONFERIR]`] : []),
      'Medidas da central, fonte, módulos e baterias são típicas de mercado: substituir pelas do modelo comprado. [CONFERIR]',
      'Tensão de entrada (127 ou 220 V) e posição da antena do comunicador 4G a confirmar na obra. [CONFERIR]',
    ],
  };
}

function montarCaderno(res) {
  const { calc } = res;
  return cadernoDeCaixas([montarCaixa(res)], {
    dados: res.dados,
    sigla: 'CAD-CAL-ALM',
    subtitulo: `Central de alarme — grau ${calc.grau}, ${calc.nZonas} zonas, bateria ${calc.bateria.nBaterias} × ${calc.bateria.bateriaEscolhida} Ah`,
    normas: NORMAS,
    modeloHm: 'H&M CAL',
    normaHm: 'IEC 62642 / EN 50131-1 / EN 50131-6',
    secoes: [{
      titulo: 'Ligações e campo',
      paragrafos: [
        'A bateria liga à fonte/central com fusível e cabo de seção adequada; polaridade conferida antes de fechar. A central é energizada com os periféricos desligados da saída auxiliar; depois ligam-se teclados, expansores e sensores.',
        'Teclados, sensores, sirenes e cabos de campo ficam fora da caixa; entram por prensa-cabos na face inferior e terminam em borne identificado com a zona (Z01…).',
      ],
      tabela: { colunas: ['Equipamento', 'Qtd.', 'Repouso (mA)', 'Alarme (mA)'], linhas: calc.bateria.linhas.map(l => [l.equipamento, String(l.qtd), String(Math.round(l.totalRepouso)), String(Math.round(l.totalAlarme))]), proporcoes: [3, 0.6, 1, 1] },
    }],
  });
}

const gerarCaderno = (res) => gerarCadernoPdf(montarCaderno(res));

module.exports = { montarCaixa, montarCaderno, gerarCaderno };
