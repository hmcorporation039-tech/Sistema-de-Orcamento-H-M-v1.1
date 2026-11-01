// Caderno de fabricação e montagem do rack do CFTV (PDF), montado a partir do
// dimensionamento da skill: patch panel dos cabos das câmeras, switches PoE,
// gravador (de rack ou sobre bandeja), nobreak, PDU e organizadores. Sistema
// pequeno vai em rack de parede com o nobreak (torre) fora dele. Não há
// catálogo de NVR/switch/nobreak: medidas e massas são típicas por porte e vão
// marcadas [CONFERIR]. Modelo do rack e desenhos: skills/_comum/fabricacao/rack.js.

const R = require('../../../_comum/fabricacao/rack');
const { gerarCadernoPdf } = require('../../../_comum/fabricacao/caderno');

const NORMAS = [
  ...R.NORMAS_RACK.map(n => (n.codigo.startsWith('ABNT NBR 14565') ? { ...n, aplicacao: 'cabos das câmeras até 90 m (cabo horizontal), patch panel e organização do rack; aterramento do cabeamento (Seção 12)' } : n)),
  { codigo: 'IEC 62676-4', titulo: 'Sistemas de vigilância por vídeo — diretrizes de aplicação', aplicacao: 'o rack abriga o gravador e a rede de vídeo: alimentação ininterrupta (nobreak), proteção física do gravador (rack com chave) e acesso restrito às imagens (LGPD)' },
  { codigo: 'IEEE 802.3af/at/bt', titulo: 'Power over Ethernet', aplicacao: 'orçamento PoE dos switches e classe de cada porta' },
  { codigo: 'ABNT NBR 5419-4:2026', titulo: 'Proteção contra descargas atmosféricas — sistemas elétricos e eletrônicos', aplicacao: 'DPS de rede das câmeras externas, aterrados na barra do rack' },
];

// Gravador típico por porte (canais/discos) [CONFERIR com o modelo escolhido]
function gravador(calc, s) {
  const potencia = (Number(s.nvr_w) || 30) + calc.hds * 8;
  const desc = `NVR ${calc.canais} canais, ${calc.hds} HD de ${calc.hdTb} TB${calc.raid ? ' em RAID 5' : ''}`;
  if (calc.hds <= 2 && calc.canais <= 16) {
    return { tipo: 'bandeja', tag: 'NVR-1', descricao: `Bandeja fixa 19" com ${desc} (gravador de mesa)`, sobre: { descricao: `NVR ${calc.canais} canais (de mesa)`, altura_mm: 53, profundidade_mm: 320, peso_kg: 3 + 0.6 * calc.hds, potencia_w: potencia }, aterrar: true };
  }
  const [u, prof, peso] = calc.hds <= 4 ? [2, 420, 6] : calc.hds <= 8 ? [2, 480, 9] : [3, 520, 14];
  return { tipo: 'nvr', tag: 'NVR-1', descricao: `${desc}, 19" ${u}U`, curta: `NVR ${calc.canais} canais · ${calc.hds} HD`, u, profundidade_mm: prof, peso_kg: peso + 0.6 * calc.hds, potencia_w: potencia };
}

// Nobreak de rack típico por potência [CONFERIR]
function nobreakDeRack(calc) {
  const va = calc.nobreakVa;
  const [u, prof, peso] = va <= 1500 ? [2, 430, 18] : va <= 3000 ? [2, 600, 28] : [3, 650, 45];
  return { tipo: 'nobreak', tag: 'NB-1', zona: 'base', descricao: `Nobreak ${va} VA senoidal, 19" ${u}U, saída com tomadas NBR 14136`, curta: `nobreak ${va} VA`, u, profundidade_mm: prof, peso_kg: peso, dissipacao_w: Math.round(calc.cargaW * 0.08) };
}

function montarRack(res) {
  const { calc, dados } = res;
  const s = dados.sistema || {};
  const portasSw = Number(s.portas_switch) || 24;
  // pequeno: rack de parede com o nobreak (torre) fora dele
  const pequeno = calc.nCam <= 16 && calc.nobreakVa <= 1500 && calc.hds <= 2 && calc.canais <= 16;
  const itens = [];
  let restantes = calc.nCam;
  let pp = 0, org = 0;
  const camsPorSw = Math.ceil(calc.nCam / calc.switches);
  const poePorSw = calc.poeTotal / calc.switches;
  for (let k = 0; k < calc.switches; k++) {
    const cams = Math.min(camsPorSw, restantes);
    restantes -= cams;
    for (let p = 0; p < Math.ceil(cams / 24); p++) {
      itens.push({ tipo: 'patch_panel', tag: `PP-${String.fromCharCode(65 + pp++)}`, descricao: 'Patch panel 24 portas Cat 6 (cabos das câmeras)', curta: 'patch panel 24p Cat 6 (câmeras)', portas: 24 });
      itens.push({ tipo: 'organizador', tag: `ORG-${++org}`, descricao: 'Organizador horizontal 1U com tampa' });
    }
    const poe = cams * (poePorSw / Math.max(1, camsPorSw));
    itens.push({
      tipo: 'switch', tag: `SW-${k + 1}`, portas: portasSw,
      descricao: `Switch PoE ${portasSw} portas (802.3af/at${calc.portasBt ? '/bt' : ''}), orçamento ≥ ${Math.ceil(calc.poeComMargem / calc.switches)} W, 1U`, curta: `switch PoE ${portasSw} portas`,
      profundidade_mm: 300, peso_kg: 4.5,
      // a potência PoE passa pela PDU mas é dissipada nas câmeras
      potencia_w: Math.round(30 + poe / 0.88), dissipacao_w: Math.round(30 + poe * 0.12),
    });
    itens.push({ tipo: 'organizador', tag: `ORG-${++org}`, descricao: 'Organizador horizontal 1U com tampa' });
  }
  itens.push(gravador(calc, s));
  itens.push({ tipo: 'pdu', tag: 'PDU-1', zona: 'base' });
  if (!pequeno) itens.push(nobreakDeRack(calc));

  const externas = calc.cameras.filter(c => c.externa).reduce((a, c) => a + c.qtd, 0);
  const extra = [
    { grupo: 'Fiação', descricao: 'Patch cord Cat 6 1,5 m (patch panel → switch PoE)', especificacao: 'LSZH, montado de fábrica; cor própria do CFTV (ex.: vermelho) [CONFERIR padrão do cliente]', quantidade: calc.nCam, unidade: 'un', regra: '1 por câmera' },
    { grupo: 'Fiação', descricao: 'Patch cord Cat 6 1,5 m (switch → gravador / rede do cliente)', especificacao: 'LSZH', quantidade: calc.switches + 1, unidade: 'un', regra: `1 por switch (uplink ao NVR) + 1 do NVR à rede de monitoramento` },
  ];
  if (externas) {
    extra.push({ grupo: 'Aterramento', descricao: 'DPS de rede RJ-45 PoE para câmera externa, no rack (entre o patch panel e o switch)', especificacao: 'Cat 6, compatível com PoE+; aterrado na barra do rack (NBR 5419-4) — avaliar DPS também junto à câmera em trechos externos longos [CONFERIR]', quantidade: externas, unidade: 'un', regra: '1 por câmera externa (mesmo item DPS do memorial)' });
    extra.push({ grupo: 'Aterramento', descricao: 'Jumper de aterramento 4 mm² verde-amarelo (DPS de rede → barra do rack)', especificacao: 'o mais curto possível', quantidade: externas, unidade: 'un', regra: '1 por DPS de rede' });
  }
  if (pequeno) {
    extra.push({ grupo: 'Energia', descricao: `Nobreak ${calc.nobreakVa} VA torre, saída senoidal, tomadas NBR 14136 — fora do rack (ao lado/abaixo), alimentando a PDU`, especificacao: `carga ≈ ${Math.round(calc.cargaW)} W; autonomia desejada ${calc.autonomiaMin} min ≈ ${Math.round(calc.energiaWh)} Wh [CONFERIR bateria]`, quantidade: 1, unidade: 'un', regra: 'mesmo item NB do memorial; rack de parede não comporta nobreak' });
  }
  return R.dimensionarRack({
    id: 'RACK-CFTV',
    local: String(s.local_rack || 'SALA TÉCNICA / MONITORAMENTO').toUpperCase(),
    tipo: pequeno ? 'parede' : 'piso',
    itens,
    cabos: calc.nCam,
    tensao_v: Number(s.tensao_pdu_v) || 220,
    distancia_tgb_m: Number(s.distancia_tgb_m) || 10,
    espaco606: '0A',
    numero: 1,
    materiais_extra: extra,
  });
}

function montarCaderno(res) {
  const { calc } = res;
  const rack = montarRack(res);
  return R.cadernoDeRacks([rack], {
    dados: res.dados,
    sigla: 'CAD-RK-CFTV',
    subtitulo: `Rack do CFTV — ${calc.nCam} câmeras, NVR ${calc.canais} canais, ${calc.switches} switch(es) PoE`,
    normas: NORMAS,
    modeloHm: 'H&M RK-CFTV',
    normaHm: 'IEC 62676-4 / NBR 14565 / EIA-310-E',
    verificacoesExtra: [
      { item: 'PoE e imagem por câmera', criterio: `cada porta entrega PoE na classe da câmera; imagem ao vivo e gravação conferidas no NVR para as ${calc.nCam} câmeras; carga PoE ≤ 80 % do orçamento do switch`, norma: 'IEEE 802.3af/at/bt · IEC 62676-4' },
      { item: 'Cabos das câmeras', criterio: `mapa de fios/continuidade de cada cabo (certificação recomendada) e comprimento ≤ 90 m${calc.caboAcima90.length ? ` — acima: ${calc.caboAcima90.map(c => c.id).join(', ')} (extensor/fibra)` : ''}`, norma: 'NBR 14565' },
      { item: 'Gravador', criterio: `discos reconhecidos${calc.raid ? ' e RAID 5 ativo' : ''}, data/hora sincronizada (NTP), retenção de ${calc.dias} dias configurada, usuários com senha própria e registro de acesso`, norma: 'IEC 62676-4 · LGPD' },
      { item: 'Nobreak', criterio: `ao desligar a rede, NVR e switches seguem sem reiniciar; autonomia ≥ ${calc.autonomiaMin} min com a carga real (≈ ${Math.round(calc.cargaW)} W)`, norma: 'boa prática (IEC 62676-1-1)' },
    ],
    secoes: [{
      titulo: 'Ligações no rack',
      paragrafos: [
        'Cada cabo de câmera termina no patch panel (porta = número da câmera) e segue por patch cord de 1,5 m até a porta PoE do switch logo abaixo, passando pelo organizador horizontal.',
        `O switch liga ao gravador por uplink; o gravador liga à rede de monitoramento. ${rack.tipo === 'parede' ? 'O nobreak (torre) fica fora do rack e alimenta a PDU.' : 'O nobreak, na base do rack, alimenta a PDU; o nobreak liga à tomada do circuito exclusivo.'}`,
        'Portas do patch panel identificadas com a câmera (ex.: 0A.R01-A:03 = CAM3) e a mesma identificação nas duas pontas do cabo.',
      ],
      tabela: { colunas: ['Câmera', 'Local', 'Qtd.', 'PoE (W)', 'Cabo (m)', 'Externa'], linhas: calc.cameras.map(c => [c.id, c.local, String(c.qtd), String(Math.round(c.poe * 10) / 10).replace('.', ','), String(c.cabo), c.externa ? 'sim (DPS)' : 'não']), proporcoes: [0.7, 2.4, 0.5, 0.7, 0.7, 0.8] },
    }],
    avisos: [
      'Rack, patch panel, organizadores, PDU e patch cords constam da lista de materiais do memorial e do orçamento do CFTV (mesma quantidade deste caderno).'
    ],
  });
}

const gerarCaderno = (res) => gerarCadernoPdf(montarCaderno(res));

module.exports = { montarRack, montarCaderno, gerarCaderno };
