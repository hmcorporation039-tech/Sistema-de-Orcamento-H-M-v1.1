// Caderno de fabricação e montagem (PDF) do headend da antena coletiva/TV,
// montado a partir do calcular(): caixa de headend com amplificador UHF,
// amplificador de FI do satélite, fonte de alimentação, divisor/atenuador de
// entrada, filtro de 700 MHz (LTE/5G), misturador TV+SAT, multiswitch (quando
// em estrela), DPS coaxial por linha e barra de equipotencialização (BEL) do
// mastro. Antenas, mastro, derivadores, tomadas e multiswitches de cascata
// ficam de campo (na_placa:false). Não há catálogo de dimensões: medidas
// típicas, todas [CONFERIR]. Motor: skills/_comum/fabricacao/caixa.js.

const CX = require('../../../_comum/fabricacao/caixa');
const { gerarCadernoPdf } = require('../../../_comum/fabricacao/caderno');

const NORMAS = [
  { codigo: 'IEC/EN 60728-1', titulo: 'Redes de cabos para sinais de televisão — desempenho do sistema', aplicacao: 'níveis na tomada, MER e C/N medidos a partir do headend' },
  { codigo: 'IEC/EN 60728-11', titulo: 'Redes de cabos para sinais de televisão — segurança', aplicacao: 'equipotencialização e aterramento do headend e do mastro (BEL)' },
  { codigo: 'ABNT NBR 5410', titulo: 'Instalações elétricas de baixa tensão', aplicacao: 'circuito de alimentação do headend, DPS e aterramento (6.3.5 e 6.4)' },
  { codigo: 'ABNT NBR 5419-3 e NBR 5419-4', titulo: 'SPDA — danos físicos e sistemas elétricos/eletrônicos', aplicacao: 'mastro na zona de proteção e ligado ao SPDA/BEP; DPS coaxial em cada linha de antena' },
  { codigo: 'ABNT NBR 14565:2019', titulo: 'Cabeamento estruturado', aplicacao: 'caminhos, caixas de passagem e identificação da prumada' },
  { codigo: 'ABNT NBR 15604', titulo: 'TV digital terrestre ISDB-Tb — receptores', aplicacao: 'sensibilidade e nível máximo de entrada dos receptores' },
  { codigo: 'ABNT NBR IEC 60529', titulo: 'Graus de proteção do invólucro', aplicacao: 'grau IP da caixa do headend' },
];

const arred = (v, c = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

// Dimensões típicas do multiswitch por número de saídas [CONFERIR]
const dimMs = (s) => (s <= 4 ? [160, 100, 35] : s <= 8 ? [220, 110, 40] : s <= 16 ? [280, 130, 45] : [440, 160, 50]);

function montarCaixaHeadend(res) {
  const { calc } = res;
  const { E, deriv, ms } = calc;
  const itens = [];
  const ampTerr = deriv?.amplificador || ms?.ampTerr;
  const ganhoTerr = ampTerr?.ganho;

  if (E.temTerr) {
    itens.push({ tag: 'FLT', descricao: 'Filtro passa-baixa / rejeita-faixa 700 MHz (LTE/5G) na entrada UHF — evita interferência de celular no ISDB-Tb', largura_mm: 80, altura_mm: 50, profundidade_mm: 30, fixacao: 'parafuso' });
    if (deriv?.atenuadorEntrada) itens.push({ tag: 'ATT-E', descricao: `Atenuador de entrada ${deriv.atenuadorEntrada} dB 75 Ω`, largura_mm: 40, altura_mm: 30, profundidade_mm: 20, fixacao: 'parafuso' });
    if (ampTerr) {
      itens.push({ tag: 'AMP-U', descricao: `Amplificador de headend UHF, ajuste ${arred(ganhoTerr, 1)} dB (máx. ${E.amp.ganhoMax} dB), saída máx. ${E.amp.vmax} dBµV (DIN 45004B)`, largura_mm: 200, altura_mm: 120, profundidade_mm: 60, fixacao: 'parafuso', potencia_w: 6 });
    }
    if (deriv?.split?.vias) itens.push({ tag: 'DIV-H', descricao: `Divisor ${deriv.split.vias} vias 5–1 000 MHz (saída do headend para as prumadas)`, largura_mm: 70, altura_mm: 50, profundidade_mm: 30, fixacao: 'parafuso' });
  }
  if (E.temSat) {
    if (ms?.ampSat) itens.push({ tag: 'AMP-FI', descricao: `Amplificador de FI 950–2 150 MHz (4 linhas), ajuste ${arred(ms.ampSat.ganho, 1)} dB`, largura_mm: 220, altura_mm: 120, profundidade_mm: 60, fixacao: 'parafuso', potencia_w: 8 });
    if (E.sat.topologia === 'estrela') {
      (ms?.mss || []).forEach((s, i) => { const [l, a, p] = dimMs(s); itens.push({ tag: `MS-${i + 1}`, descricao: `Multiswitch 5×${s} (4 SAT + TERR) no headend`, largura_mm: l, altura_mm: a, profundidade_mm: p, fixacao: 'parafuso', potencia_w: 6 }); });
    }
  }
  if (E.temTerr && E.temSat && E.terrPorMs) itens.push({ tag: 'MIX', descricao: 'Misturador/diplexador TV terrestre + FI de satélite (entrada TERR do multiswitch)', largura_mm: 80, altura_mm: 50, profundidade_mm: 30, fixacao: 'parafuso' });
  itens.push({ tag: 'FNT', descricao: 'Fonte chaveada 12–24 V cc / 2 A (amplificadores e multiswitch), entrada 127/220 V~', largura_mm: 120, altura_mm: 60, profundidade_mm: 45, tipo: 'modulo', fixacao: 'trilho', potencia_w: 3 });
  itens.push({ tag: 'DJ', descricao: 'Disjuntor 10 A curva C dedicado do headend + tomada de serviço', largura_mm: 18, altura_mm: 90, profundidade_mm: 65, tipo: 'modulo', fixacao: 'trilho' });
  const nDpsLinhas = (E.antenasUhf || 0) + (E.temSat ? 4 : 0);
  itens.push({ tag: 'DPS-C', descricao: `DPS coaxial 75 Ω, conector F (${nDpsLinhas} un.: ${E.antenasUhf} de UHF${E.temSat ? ' + 4 linhas do LNBF' : ''}), no cabo de descida antes do headend`, largura_mm: 30 * Math.min(nDpsLinhas, 8), altura_mm: 60, profundidade_mm: 40, fixacao: 'parafuso' });
  itens.push({ tag: 'DPS-CA', descricao: 'DPS de CA classe II 1P+N, 20 kA, na alimentação do headend', largura_mm: 36, altura_mm: 90, profundidade_mm: 65, tipo: 'modulo', fixacao: 'trilho' });
  itens.push({ tag: 'BEL', descricao: 'Barra de equipotencialização local (BEL) em cobre — DPS, caixa, malha dos coaxiais e mastro', largura_mm: 200, altura_mm: 30, profundidade_mm: 15, fixacao: 'parafuso' });
  // campo
  if (E.temTerr) itens.push({ tag: 'ANT', descricao: `${E.antenasUhf} antena(s) UHF canais 14–51 no mastro, descida em RG-6 até o headend (${E.dAH} m)`, na_placa: false });
  if (E.temSat) itens.push({ tag: 'PAR', descricao: `Parabólica offset banda Ku Ø ${E.sat.diametro} cm com LNBF quattro (4 descidas até o headend)`, na_placa: false });
  itens.push({ tag: 'MAS', descricao: `Mastro de aço galvanizado 1½" × 3 m, ligado ao SPDA/BEP por cabo de cobre 16 mm² (${E.distAterramento} m)`, na_placa: false });
  if (E.temSat && E.sat.topologia === 'cascata' && calc.nMultiswitch) itens.push({ tag: 'MS-C', descricao: `${calc.nMultiswitch} multiswitch(es) em cascata nos pavimentos (caixas de passagem), fora do headend`, na_placa: false });
  if (calc.nDerivadores) itens.push({ tag: 'DER', descricao: `${calc.nDerivadores} derivador(es), divisores, atenuadores e ${calc.nPontos} tomada(s) de campo`, na_placa: false });
  else itens.push({ tag: 'TOM', descricao: `${calc.nPontos} tomada(s) TV/SAT de campo`, na_placa: false });

  const potW = 6 + (ms?.ampSat ? 8 : 0) + (ms?.mss || []).length * 6 + 3;
  const sistema = E.temTerr && E.temSat ? 'TV aberta ISDB-Tb + satélite Ku' : E.temSat ? 'satélite banda Ku' : 'TV aberta ISDB-Tb (UHF)';
  return {
    id: 'HE-TV',
    titulo: 'Headend de antena coletiva',
    local: 'COBERTURA / CASA DE MÁQUINAS',
    funcao: `Caixa de headend do sistema coletivo de ${sistema}: recebe as descidas da antena${E.temSat ? ' e do LNBF' : ''}, filtra, amplifica${E.temSat && E.sat.topologia === 'estrela' ? ', distribui por multiswitch' : ''} e entrega o sinal às prumadas. DPS coaxial em cada descida, aterrados na BEL ligada ao mastro e ao SPDA/BEP.`,
    tensao: '127/220 V~ (circuito dedicado) / 12–24 V cc',
    ip: 'IP54',
    externa: true,
    modeloHm: 'H&M HE-TV',
    normaHm: 'IEC/EN 60728 / NBR 5419',
    normas: NORMAS,
    cabo_interligacao: 'jumpers coaxiais RG-6 com conector F de compressão',
    bornes: 10,
    dissipacao_w: potW,
    frente: [
      { tag: 'L1', texto: ['REDE'], tipo: 'led' },
      { tag: 'L2', texto: ['FONTE 12-24V'], tipo: 'led' },
      ...(E.temTerr && ampTerr ? [{ tag: 'L3', texto: ['AMP UHF'], tipo: 'led' }] : []),
      ...(E.temSat ? [{ tag: 'L4', texto: ['LNBF 13/18V'], tipo: 'led' }] : []),
    ],
    dados_placa: [
      ['Sistema', sistema],
      ...(ampTerr ? [['Ganho UHF', `${arred(ganhoTerr, 1)} dB (máx. ${E.amp.ganhoMax} dB)`]] : []),
      ...(E.temSat ? [['Multiswitch', calc.nMultiswitch ? `${calc.nMultiswitch} un.` : '—']] : []),
      ['DPS coaxial', `${nDpsLinhas} un. (${calc.dps} no sistema)`],
      ['Níveis na tomada', `${E.nivelMin}–${E.nivelMax} dBµV`],
    ],
    itens,
    verificacoes: [
      { item: 'Níveis na saída e nas tomadas (dBµV)', criterio: `analisador de sinais: tomadas TV entre ${E.nivelMin} e ${E.nivelMax} dBµV${E.temSat ? `, SAT entre ${E.sat.nivelMin} e ${E.sat.nivelMax} dBµV` : ''}; medir a primeira, a última e a de pior caso de cada prumada e comparar com a planilha de níveis`, norma: 'IEC/EN 60728-1' },
      { item: 'MER / BER', criterio: `MER ≥ ${E.mer.terr} dB e BER ≤ ${String(E.berMax).replace('.', ',')} em todos os canais UHF${E.temSat ? `; MER ≥ ${E.mer.sat} dB no satélite` : ''}`, norma: 'IEC/EN 60728-1 · NBR 15604' },
      { item: 'Continuidade PE do mastro e da BEL', criterio: `mastro ↔ BEL ↔ SPDA/BEP em cabo 16 mm² (${E.distAterramento} m) com continuidade ≤ 1 Ω; DPS coaxial ligado à BEL pelo condutor mais curto`, norma: 'IEC/EN 60728-11 · NBR 5419-3' },
      { item: 'DPS', criterio: 'DPS coaxial em cada descida (UHF e 4 linhas do LNBF) e DPS de CA presentes, sem indicação de falha', norma: 'NBR 5419-4 · NBR 5410' },
      { item: 'Alimentação e ganho', criterio: 'ganho do amplificador ajustado ao valor de projeto sem saturar (saída ≤ nível máximo para o nº de canais); fonte e LNBF energizados', norma: 'IEC/EN 60728-1' },
    ],
    observacoes: [
      `${E.temTerr ? `UHF: canal mais fraco ${arred(E.terr.fraco, 1)} dBµV e mais forte ${arred(E.terr.forte, 1)} dBµV na antena. ` : ''}${calc.amplificadores.total} amplificador(es) no sistema (${calc.amplificadores.headendTerr + calc.amplificadores.headendSat} no headend, ${calc.amplificadores.linhaTerr + calc.amplificadores.linhaSat} de linha na prumada).`,
      'Dimensões de amplificadores, multiswitch, filtros e fonte são típicas por porte; a placa é redimensionada quando os modelos forem escolhidos. [CONFERIR]',
    ],
    avisos: calc.avisos.slice(0, 3),
  };
}

function montarCaderno(res) {
  const { calc } = res;
  return CX.cadernoDeCaixas([montarCaixaHeadend(res)], {
    dados: res.dados,
    sigla: 'CAD-CX-ANT',
    subtitulo: `Headend — ${calc.E.temTerr ? 'TV ISDB-Tb' : ''}${calc.E.temTerr && calc.E.temSat ? ' + ' : ''}${calc.E.temSat ? 'satélite Ku' : ''}, ${calc.nPontos} pontos`,
    normas: NORMAS,
    modeloHm: 'H&M HE-TV',
    normaHm: 'IEC/EN 60728 / NBR 5419',
    avisos: [
      'Antenas, mastro, derivadores, divisores, tomadas e multiswitches em cascata são de campo (fora da caixa). [CONFERIR]',
      'A norma ABNT de distribuição de TV em edificações não foi confirmada; adotam-se IEC/EN 60728 e as NBR listadas. [CONFERIR]',
    ],
  });
}

const gerarCaderno = (res) => gerarCadernoPdf(montarCaderno(res));

module.exports = { montarCaixaHeadend, montarCaderno, gerarCaderno };
