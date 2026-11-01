// Caderno de fabricação e montagem dos racks do cabeamento (PDF): um rack por
// distribuidor de piso (FD), montado a partir do cálculo da NBR 14565 —
// patch panels, organizadores, switches, DIO do backbone, bandeja, PDU e a
// reserva de U. O modelo do rack, os desenhos e a lista "do rack aos
// parafusos" vêm de skills/_comum/fabricacao/rack.js.

const R = require('../../../_comum/fabricacao/rack');
const { gerarCadernoPdf } = require('../../../_comum/fabricacao/caderno');

// consumo típico de switch de acesso (sem PoE) e de cada AP alimentado por PoE+ [CONFERIR]
const SWITCH_W = { 24: 30, 48: 45 };
const AP_W = 15;

const NORMAS = [
  ...R.NORMAS_RACK,
  { codigo: 'ABNT NBR 16415:2021', titulo: 'Caminhos e espaços para cabeamento estruturado', aplicacao: 'sala/espaço do distribuidor de piso: área livre na frente e atrás do rack (≥ 1 m [CONFERIR]), entrada de cabos e climatização' },
];

// Lista de itens de cada rack (de cima para baixo): DIO, e para cada switch os seus
// patch panels (cada um com organizador) seguidos do switch e do organizador
function itensDoRack(calc, p, pontosRack, apsRack) {
  const c = calc.cfg;
  const cat = c.categoria;
  const itens = [];
  if (calc.backbone) itens.push({ tipo: 'dio', tag: 'DIO-1', descricao: 'DIO 1U 24 fibras, acopladores LC duplex OM3', curta: 'DIO 24 fibras LC OM3', profundidade_mm: 250 });
  const paineis = Math.ceil(pontosRack / c.portasPainel);
  const switches = Math.ceil(pontosRack / c.portasSwitch);
  const porSwitch = Math.max(1, Math.ceil(c.portasSwitch / c.portasPainel));
  const poe = apsRack > 0;
  let pp = 0, org = 0;
  const letra = () => String.fromCharCode(65 + pp);
  for (let s = 0; s < switches; s++) {
    for (let k = 0; k < porSwitch && pp < paineis; k++) {
      itens.push({ tipo: 'patch_panel', tag: `PP-${letra()}`, descricao: `Patch panel ${c.portasPainel} portas Cat ${cat}${c.blindado ? ' blindado' : ''}`, portas: c.portasPainel, aterrar: !!c.blindado });
      pp++;
      itens.push({ tipo: 'organizador', tag: `ORG-${++org}`, descricao: 'Organizador horizontal 1U com tampa' });
    }
    const apsSw = Math.ceil(apsRack / switches);
    const base = SWITCH_W[c.portasSwitch] || 45;
    itens.push({
      tipo: 'switch', tag: `SW-${s + 1}`, portas: c.portasSwitch,
      descricao: `Switch gerenciável ${c.portasSwitch} portas${poe ? ' PoE+' : ''}, 1U`, curta: `switch ${c.portasSwitch} portas${poe ? ' PoE+' : ''}`,
      profundidade_mm: poe ? 300 : 260, peso_kg: poe ? 4.8 : 3.8,
      // PoE: a potência dos APs passa pela PDU mas é dissipada no teto, não no rack
      potencia_w: Math.round(base + (poe ? apsSw * AP_W / 0.9 : 0)), dissipacao_w: Math.round(base + (poe ? apsSw * AP_W * 0.1 : 0)),
    });
    itens.push({ tipo: 'organizador', tag: `ORG-${++org}`, descricao: 'Organizador horizontal 1U com tampa' });
  }
  itens.push({ tipo: 'bandeja', tag: 'BJ-1', zona: 'base', descricao: 'Bandeja fixa 1U 19"', sobre: { descricao: 'Modem/roteador da operadora', altura_mm: 40, profundidade_mm: 250, potencia_w: 15 } });
  itens.push({ tipo: 'pdu', tag: 'PDU-1', zona: 'base' });
  return itens;
}

function montarRacks(res) {
  const { calc, dados } = res;
  const s = dados.sistema || {};
  const racks = [];
  calc.pavimentos.forEach((p, i) => {
    for (let k = 0; k < p.fds; k++) {
      // o último FD do piso fica com o resto dos pontos (os demais com o "por FD" do cálculo)
      const pontosRack = k < p.fds - 1 ? p.pontosPorFd : p.pontos - p.pontosPorFd * (p.fds - 1);
      const apsRack = Math.round(p.aps / p.fds);
      const n = racks.length + 1;
      const nome = String(p.nome || `Pavimento ${i + 1}`).toUpperCase();
      const extra = [
        { grupo: 'Fiação', descricao: `Patch cord Cat ${calc.cfg.categoria} 1,5 m (patch panel → switch)`, especificacao: 'LSZH, montado de fábrica e certificado; cores: azul dados, amarelo APs [CONFERIR padrão do cliente]', quantidade: pontosRack, unidade: 'un', regra: '1 por ponto atendido no rack (mesmo item PC-R do memorial)' },
      ];
      if (calc.backbone) {
        extra.push({ grupo: 'Fiação', descricao: 'Cordão óptico duplex LC/LC OM3 2 m', especificacao: 'multimodo 50/125 µm', quantidade: 2, unidade: 'un', regra: 'uplink do switch ao DIO + 1 de reserva' });
        extra.push({ grupo: 'Fiação', descricao: 'Módulo SFP multimodo (850 nm) para o uplink do switch', especificacao: 'compatível com o switch [CONFERIR]', quantidade: 1, unidade: 'un', regra: '1 por rack (uplink do backbone)' });
      }
      racks.push(R.dimensionarRack({
        id: `RACK-${String(n).padStart(2, '0')}`,
        local: `FD-${nome}${p.fds > 1 ? `-${k + 1}` : ''}`,
        tipo: 'auto',
        alturaU: p.rackU,
        itens: itensDoRack(calc, p, pontosRack, apsRack),
        cabos: pontosRack,
        tensao_v: Number(s.tensao_pdu_v) || 220,
        distancia_tgb_m: Number(s.distancia_tgb_m) || 10,
        espaco606: `${i}${String.fromCharCode(65 + k)}`,
        numero: 1,
        materiais_extra: extra,
      }));
    }
  });
  return racks;
}

function montarCaderno(res) {
  const racks = montarRacks(res);
  const c = res.calc.cfg;
  return R.cadernoDeRacks(racks, {
    dados: res.dados,
    sigla: 'CAD-RK-CAB',
    subtitulo: `Racks dos distribuidores de piso — cabeamento classe ${res.calc.classe} (Cat ${c.categoria}), ${res.calc.pontos} pontos`,
    normas: NORMAS,
    modeloHm: 'H&M RK-14565',
    normaHm: 'ABNT NBR 14565:2019 / EIA/ECA-310-E',
    verificacoesExtra: [
      { item: 'Certificação dos enlaces', criterio: `todos os enlaces permanentes/canais classe ${res.calc.classe} certificados com certificador de campo e relatório anexado; cabo horizontal ≤ ${res.calc.hMax.toFixed(1).replace('.', ',')} m (Tabela 3)`, norma: 'NBR 14565 (Seção 8) · IEC 61935-1' },
      ...(res.calc.backbone ? [{ item: 'Backbone óptico', criterio: 'perda de inserção de cada fibra medida (OLTS) dentro do orçamento de perda do enlace; conectores limpos e inspecionados', norma: 'NBR 14565 (Seção 9) · IEC 61280-4-1' }] : []),
    ],
    secoes: [{
      titulo: 'Ligações no rack',
      paragrafos: [
        `Modelo de ${c.modelo === 'conexao_cruzada' ? 'conexão cruzada' : 'interconexão'}: cada porta do patch panel liga a uma porta do switch logo abaixo por patch cord de 1,5 m, passando pelo organizador horizontal; patch cords somados (rack + área de trabalho) ≤ ${String(c.F).replace('.', ',')} m, como no cálculo da Tabela 3.`,
        'Terminação T568A ou T568B — a mesma em toda a obra, no patch panel e na tomada. Destrançamento máximo de 13 mm nos conectores (Cat 6).',
        res.calc.backbone ? 'Backbone óptico OM3 chega ao DIO no topo do rack (entrada pelo teto); cordão LC/LC do DIO ao SFP de uplink do switch.' : 'Sem backbone: o switch do rack é o núcleo da rede (uplink ao roteador sobre a bandeja).',
      ],
    }],
  });
}

const gerarCaderno = (res) => gerarCadernoPdf(montarCaderno(res));

module.exports = { montarRacks, montarCaderno, gerarCaderno, itensDoRack };
