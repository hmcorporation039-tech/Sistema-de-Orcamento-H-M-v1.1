// Caderno de fabricação e montagem da CENTRAL de detecção e alarme de incêndio
// (CDI, PDF), montado a partir do calcular(): placa-mãe/CPU, módulos de laço (ou
// de zona), fonte, baterias da central (Anexo B da NBR 17240, o que a skill
// calcula: 24 h em repouso + 5 min em alarme), módulo de comunicação e o
// invólucro. Detectores, acionadores, avisadores e módulos de comando ficam como
// itens de campo (na_placa:false). A iluminação de emergência (NBR 10898) da
// skill é de blocos autônomos (bateria própria, sem quadro nem central), por isso
// só entra como item de campo e aviso. Não há catálogo de central/baterias: as
// medidas são típicas por porte e saem marcadas [CONFERIR]. Motor: _comum/fabricacao/caixa.js.

const { cadernoDeCaixas } = require('../../../_comum/fabricacao/caixa');
const { gerarCadernoPdf } = require('../../../_comum/fabricacao/caderno');

const br = (v, c = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

const NORMAS = [
  { codigo: 'ABNT NBR 17240:2010', titulo: 'Sistemas de detecção e alarme de incêndio — projeto, instalação, comissionamento e manutenção', aplicacao: 'central (5.3 e 6.1), fonte e baterias (Anexo B: 24 h em repouso + alarme), supervisão de laços e falhas, sinalização e comandos da central' },
  { codigo: 'ABNT NBR 10898:2023', titulo: 'Sistema de iluminação de emergência', aplicacao: 'blocos autônomos de campo, com bateria própria e autonomia mínima de 2 h; não passam pela central' },
  { codigo: 'ABNT NBR 5410:2004', titulo: 'Instalações elétricas de baixa tensão', aplicacao: 'circuito exclusivo de alimentação da central, proteção e aterramento (PE) da caixa' },
  { codigo: 'ABNT NBR 5419-4:2026', titulo: 'Proteção contra descargas atmosféricas — sistemas elétricos e eletrônicos', aplicacao: 'DPS na alimentação e nos laços/cabos que saem da edificação, aterrados na barra PE da central' },
  { codigo: 'ABNT NBR IEC 60529', titulo: 'Graus de proteção para invólucros (código IP)', aplicacao: 'grau de proteção da caixa da central' },
];

// Bateria selada 12 V por capacidade: [L, A, P] mm e massa kg (típicos) [CONFERIR]
const BAT = { 7: [151, 94, 65, 2.1], 12: [151, 98, 95, 3.7], 18: [181, 167, 77, 5.4], 26: [166, 125, 175, 8.5], 40: [197, 170, 165, 13], 55: [229, 213, 138, 17], 65: [350, 174, 167, 20], 100: [330, 215, 173, 30] };

function baterias(ah) {
  const [l, a, p, kg] = BAT[ah] || [Math.round(100 + ah * 3), 200, 170, +(0.3 * ah).toFixed(1)];
  return [1, 2].map(n => ({
    tipo: 'bateria', tag: `BAT-${n}`, largura_mm: l, altura_mm: a, profundidade_mm: p, peso_kg: kg, fixacao: 'cinta',
    descricao: `Bateria selada chumbo-ácido 12 V ${ah} Ah (BAT-1 e BAT-2 em série = 24 V)`,
  }));
}

function montarCaixa(res) {
  const { calc, dados } = res;
  const b = calc.bateria;
  const end = calc.tipoSistema === 'enderecavel';
  const nLacos = end ? calc.lacos : calc.zonas;
  const rotLaco = end ? 'laço' : 'zona';
  const itens = [
    { tipo: 'modulo', tag: 'CPU', descricao: `Placa-mãe / CPU da central ${end ? 'endereçável' : 'convencional'} com display e memória de eventos`, largura_mm: 200, altura_mm: 150, profundidade_mm: 40 },
    ...Array.from({ length: nLacos }, (_, i) => ({
      tipo: 'modulo', tag: `${end ? 'LACO' : 'ZONA'}-${i + 1}`, largura_mm: 90, altura_mm: 110, profundidade_mm: 30,
      descricao: end ? `Módulo de laço ${i + 1} (até ${calc.limiteLaco} dispositivos endereçáveis, supervisão de curto e circuito aberto)` : `Módulo de zona ${i + 1} (supervisão de curto e circuito aberto, resistor de fim de linha)`,
    })),
    { tipo: 'modulo', tag: 'FNT', descricao: `Fonte chaveada 24 V CC, ≥ ${br(Math.max(b.fonteA, 1), 1)} A (1,2 × corrente de alarme = ${br(b.fonteA, 2)} A), com carregador de bateria, entrada 127/220 V`, largura_mm: 200, altura_mm: 110, profundidade_mm: 60, peso_kg: 1.2, dissipacao_w: Math.round(b.fonteA * 24 * 0.12) },
    ...baterias(b.bateriaEscolhida),
    { tipo: 'modulo', tag: 'COM', descricao: 'Módulo de comunicação (repetidor, rede/IP ou discadora para a monitoração)', largura_mm: 90, altura_mm: 70, profundidade_mm: 30 },
    { tipo: 'modulo', tag: 'SAIDA', descricao: 'Módulo de saídas supervisionadas para avisadores (sirenes) e relés auxiliares', largura_mm: 90, altura_mm: 70, profundidade_mm: 30 },
    { tipo: 'modulo', tag: 'DPS-AC', descricao: 'DPS Classe II 275 V na entrada de alimentação, com disjuntor 10 A exclusivo', largura_mm: 36, altura_mm: 90, profundidade_mm: 65 },
  ];
  // Itens de campo (fora da caixa)
  const campo = (tag, descricao, quantidade) => { if (quantidade > 0) itens.push({ tipo: 'campo', tag, descricao, quantidade, na_placa: false, local: 'campo (fora da caixa)', fonte: 'quantidade do dimensionamento da skill' }); };
  campo('DET', `Detectores pontuais ${end ? 'endereçáveis' : 'convencionais'} (fumaça/temperatura) com base`, calc.nDet);
  campo('ACM', 'Acionadores manuais', calc.nAc);
  campo('AV', 'Avisadores audiovisuais (sirene com strobo)', calc.nAv);
  campo('MOD', 'Módulos de comando/monitoramento', calc.nMod);
  campo('LE', 'Luminárias de emergência, bloco autônomo LED (NBR 10898, bateria própria)', calc.nAclar);
  campo('SIN', 'Sinalização de saída iluminada (balizamento)', calc.nBaliz);

  const frente = [
    { tag: 'LD1', tipo: 'led', texto: ['ALIMENT.'] }, { tag: 'LD2', tipo: 'led', texto: ['ALARME'] },
    { tag: 'LD3', tipo: 'led', texto: ['FALHA'] }, { tag: 'LD4', tipo: 'led', texto: ['SUPERV.'] },
    { tag: 'LD5', tipo: 'led', texto: ['SILENC.'] }, { tag: 'LD6', tipo: 'led', texto: ['BATERIA'] },
    { tag: 'DSP', tipo: 'display', texto: ['DISPLAY'] },
    { tag: 'BT1', tipo: 'botao', texto: ['SILENCIAR'] }, { tag: 'BT2', tipo: 'botao', texto: ['RESET'] },
    { tag: 'BT3', tipo: 'botao', texto: ['TESTE'] }, { tag: 'BT4', tipo: 'botao', texto: ['EVACUAR'] },
  ];

  return {
    id: 'CDI-1', titulo: 'Central de detecção e alarme de incêndio',
    local: String((dados.sistema || {}).local_central || 'PORTARIA / SALA DE CONTROLE').toUpperCase(),
    itens, frente,
    tensao: '127/220 V CA (entrada) · 24 V CC (laços e avisadores)',
    ip: 'IP30', largura_min_mm: 400, altura_min_mm: 500,
    dissipacao_w: Math.round(b.fonteA * 24 * 0.12 + 15),
    bornes: nLacos * 6 + 20,
    cabo_interligacao: 'cabo blindado 2 × 1,5 mm² para laços/zonas (NBR 17240, 6.8)',
    dados_placa: [
      ['Tipo', end ? `endereçável, ${calc.lacos} laço(s)` : `convencional, ${calc.zonas} zona(s)`],
      ['Dispositivos', String(calc.dispositivos)],
      ['Fonte', `24 V CC / ${br(Math.max(b.fonteA, 1), 1)} A`],
      ['Baterias', `2 × 12 V ${b.bateriaEscolhida} Ah`],
      ['Autonomia', `${br(b.tRepouso, 0)} h repouso + ${br(b.tAlarme, 0)} min alarme`],
    ],
    normas: NORMAS, normaInvolucro: 'ABNT NBR IEC 60529',
    verificacoes: [
      { item: 'Autonomia da bateria', criterio: `${br(b.bateriaAh, 1)} Ah calculados (repouso ${br(b.iRepouso, 0)} mA × ${br(b.tRepouso, 0)} h + alarme ${br(b.iAlarme, 0)} mA × ${br(b.tAlarme, 0)} min, fator 1,2); instaladas 2 × ${b.bateriaEscolhida} Ah; tensão de flutuação conferida e queda de rede sinalizada na central`, norma: 'NBR 17240, Anexo B' },
      { item: `Teste de cada ${rotLaco}${end ? ' e endereço' : ''}`, criterio: `cada dispositivo (${calc.dispositivos}) acionado em campo, com evento correto e identificação na central${end ? '; endereços sem repetição' : '; cada zona identificada'}`, norma: 'NBR 17240, comissionamento' },
      { item: `Falha de ${rotLaco} aberto`, criterio: `abrir o cabo do ${rotLaco}: a central sinaliza FALHA sem perder os demais dispositivos; curto-circuito também sinalizado`, norma: 'NBR 17240, 5.3 e 6.8' },
      { item: 'Alarme sonoro', criterio: 'avisadores acionam ao alarme, silenciam no botão SILENCIAR e voltam a soar em novo evento; audibilidade conferida nos ambientes', norma: 'NBR 17240, 5.6' },
      { item: 'Sinalizadores e comandos', criterio: 'teste de lâmpadas dos LEDs; SILENCIAR, RESET e TESTE funcionam; EVACUAR aciona todos os avisadores', norma: 'NBR 17240, 5.3' },
      { item: 'Comunicação', criterio: 'evento de teste chega ao repetidor/monitoração pelo módulo de comunicação', norma: 'projeto' },
    ],
    avisos: [
      'Fonte e baterias calculadas pelo Anexo B da skill (24 h em repouso + 5 min em alarme, fator 1,2). Se a IT/NT do Corpo de Bombeiros local ou o fabricante exigir tempo de alarme maior (ex.: 15 min), ajustar o campo "Tempo em alarme" e refazer o cálculo. [CONFERIR]',
      'Central, módulos e baterias não têm catálogo no sistema: medidas e massas são típicas por porte; substituir pelo modelo comprado. [CONFERIR]',
      ...(calc.nAclar ? ['A iluminação de emergência (NBR 10898) dimensionada pela skill é de blocos autônomos com bateria própria: não há quadro nem central de iluminação a fabricar. Para central de baterias centralizada, o dimensionamento teria de ser refeito. [CONFERIR]'] : []),
    ],
  };
}

function montarCaderno(res) {
  const { calc } = res;
  return cadernoDeCaixas([montarCaixa(res)], {
    dados: res.dados,
    sigla: 'CAD-CDI',
    subtitulo: `Central de incêndio — ${calc.tipoSistema === 'enderecavel' ? `${calc.lacos} laço(s) endereçável(is)` : `${calc.zonas} zona(s)`}, ${calc.dispositivos} dispositivos, baterias 2 × ${calc.bateria.bateriaEscolhida} Ah`,
    modeloHm: 'H&M CDI',
    normaHm: 'ABNT NBR 17240 / NBR 10898',
    normas: NORMAS,
  });
}

const gerarCaderno = (res) => gerarCadernoPdf(montarCaderno(res));

module.exports = { montarCaixa, montarCaderno, gerarCaderno };
