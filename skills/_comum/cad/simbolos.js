// Biblioteca de símbolos de planta H&M (blocos DXF) por disciplina. Desenho
// simplificado e legível em 1:50/1:100 (≈ 0,25–0,35 m no modelo, em metros),
// geometria na layer 0 (herda a layer da inserção). Cada bloco tem o atributo
// ID (identificação do ponto: C3, CAM12, DF4…) e, quando faz sentido, um
// segundo atributo (CIRCUITO, POTENCIA). A legenda do desenho é gerada a partir
// desta mesma tabela (`legenda`), então símbolo e legenda nunca divergem.
const { point3d } = require('@tarikjabiri/dxf');

const L0 = { layerName: '0' };
const P = (x, y) => point3d(x, y);
const circ = (b, x, y, r) => b.addCircle(P(x, y), r, L0);
const lin = (b, x1, y1, x2, y2) => b.addLine(P(x1, y1), P(x2, y2), L0);
const poli = (b, pts) => pts.slice(1).forEach((p, i) => lin(b, pts[i][0], pts[i][1], p[0], p[1]));
const txt = (b, x, y, h, t) => b.addText(P(x, y), h, t, L0);
const ID = { tag: 'ID', x: 0.2, y: 0.12, altura: 0.12, padrao: '' };

// triângulo de tomada (vértice para cima), com marca da altura de instalação
const triangulo = (b, s = 0.18) => poli(b, [[-s, -s * 0.6], [s, -s * 0.6], [0, s * 0.9], [-s, -s * 0.6]]);

const SIMBOLOS = {
  'HM-ELE-TOMADA-BAIXA': { layer: 'ELE-TOMADA', legenda: 'Tomada baixa 2P+T (h = 0,30 m)', desenhar: b => triangulo(b), atributos: [ID, { tag: 'CIRCUITO', x: 0.2, y: -0.08, altura: 0.1 }] },
  'HM-ELE-TOMADA-MEDIA': { layer: 'ELE-TOMADA', legenda: 'Tomada média 2P+T (h = 1,10 m)', desenhar: b => { triangulo(b); lin(b, -0.09, 0.0, 0.09, 0.0); }, atributos: [ID, { tag: 'CIRCUITO', x: 0.2, y: -0.08, altura: 0.1 }] },
  'HM-ELE-TOMADA-ALTA': { layer: 'ELE-TOMADA', legenda: 'Tomada alta 2P+T (h = 2,00 m)', desenhar: b => { triangulo(b); lin(b, -0.09, 0.0, 0.09, 0.0); lin(b, -0.05, 0.08, 0.05, 0.08); }, atributos: [ID, { tag: 'CIRCUITO', x: 0.2, y: -0.08, altura: 0.1 }] },
  'HM-ELE-TUE': { layer: 'ELE-TOMADA-ESPECIAL', legenda: 'Ponto de uso específico (TUE)', desenhar: b => { triangulo(b); txt(b, -0.06, -0.06, 0.1, 'E'); }, atributos: [ID, { tag: 'POTENCIA', x: 0.2, y: -0.08, altura: 0.1 }] },
  'HM-ELE-PONTO-LUZ': { layer: 'ILU-LUMINARIA', legenda: 'Ponto de luz no teto', desenhar: b => { circ(b, 0, 0, 0.15); lin(b, -0.1, -0.1, 0.1, 0.1); lin(b, -0.1, 0.1, 0.1, -0.1); }, atributos: [ID, { tag: 'CIRCUITO', x: 0.2, y: -0.08, altura: 0.1 }] },
  'HM-ELE-INTERRUPTOR': { layer: 'ILU-INTERRUPTOR', legenda: 'Interruptor simples (h = 1,10 m)', desenhar: b => { circ(b, 0, 0, 0.08); lin(b, 0.06, 0.06, 0.18, 0.18); }, atributos: [ID] },
  'HM-ELE-QUADRO': { layer: 'ELE-QUADRO', legenda: 'Quadro de distribuição', desenhar: b => { poli(b, [[-0.3, -0.12], [0.3, -0.12], [0.3, 0.12], [-0.3, 0.12], [-0.3, -0.12]]); lin(b, -0.3, -0.12, 0.3, 0.12); }, atributos: [{ ...ID, x: 0.35 }] },
  'HM-ILU-LUMINARIA': { layer: 'ILU-LUMINARIA', legenda: 'Luminária (embutir/sobrepor)', desenhar: b => { poli(b, [[-0.3, -0.15], [0.3, -0.15], [0.3, 0.15], [-0.3, 0.15], [-0.3, -0.15]]); lin(b, -0.3, 0, 0.3, 0); }, atributos: [{ ...ID, x: 0.35 }] },
  'HM-HOSP-TOMADA-IT': { layer: 'ELE-TOMADA-ESPECIAL', legenda: 'Tomada do sistema IT médico (identificada)', desenhar: b => { triangulo(b); txt(b, -0.08, -0.06, 0.08, 'IT'); }, atributos: [ID, { tag: 'CIRCUITO', x: 0.2, y: -0.08, altura: 0.1 }] },
  'HM-HOSP-BEL': { layer: 'ELE-QUADRO', legenda: 'Barramento de equipotencialização local (BEL)', desenhar: b => { poli(b, [[-0.2, -0.06], [0.2, -0.06], [0.2, 0.06], [-0.2, 0.06], [-0.2, -0.06]]); lin(b, -0.12, -0.06, -0.12, -0.16); lin(b, 0, -0.06, 0, -0.16); lin(b, 0.12, -0.06, 0.12, -0.16); }, atributos: [ID] },
  'HM-HOSP-PAINEL-ALARME': { layer: 'ELE-QUADRO', legenda: 'Painel de alarme do DSI (IT médico)', desenhar: b => { poli(b, [[-0.15, -0.1], [0.15, -0.1], [0.15, 0.1], [-0.15, 0.1], [-0.15, -0.1]]); txt(b, -0.09, -0.05, 0.09, 'DSI'); }, atributos: [ID] },
  'HM-ILU-SENSOR': { layer: 'ILU-SENSOR', legenda: 'Sensor de presença (teto)', desenhar: b => { circ(b, 0, 0, 0.13); txt(b, -0.05, -0.05, 0.1, 'P'); lin(b, -0.18, 0, -0.13, 0); lin(b, 0.13, 0, 0.18, 0); }, atributos: [ID] },
  'HM-ILU-COMANDO': { layer: 'ILU-INTERRUPTOR', legenda: 'Comando de iluminação (interruptor, dimmer, botoeira/teclado DALI)', desenhar: b => { poli(b, [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1], [-0.1, -0.1]]); circ(b, 0, 0, 0.04); }, atributos: [ID] },
  'HM-CAB-PONTO-REDE': { layer: 'CAB-PONTO', legenda: 'Ponto de telecomunicações (RJ-45)', desenhar: b => { triangulo(b); txt(b, -0.06, -0.06, 0.1, 'R'); }, atributos: [ID] },
  'HM-CAB-AP': { layer: 'CAB-PONTO', legenda: 'Ponto de acesso Wi-Fi (AP)', desenhar: b => { circ(b, 0, 0, 0.15); txt(b, -0.1, -0.05, 0.1, 'AP'); }, atributos: [ID] },
  'HM-CAB-RACK': { layer: 'CAB-RACK', legenda: 'Rack / distribuidor', desenhar: b => { poli(b, [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3], [-0.3, -0.3]]); lin(b, -0.3, -0.3, 0.3, 0.3); lin(b, -0.3, 0.3, 0.3, -0.3); }, atributos: [{ ...ID, x: 0.35 }] },
  'HM-TEL-PONTO': { layer: 'TEL-PONTO', legenda: 'Ponto de telefonia / interfone', desenhar: b => { triangulo(b); txt(b, -0.06, -0.06, 0.1, 'T'); }, atributos: [ID] },
  'HM-TEL-PORTEIRO': { layer: 'TEL-PORTEIRO', legenda: 'Porteiro eletrônico (com fechadura/portão)', desenhar: b => { poli(b, [[-0.15, -0.2], [0.15, -0.2], [0.15, 0.2], [-0.15, 0.2], [-0.15, -0.2]]); circ(b, 0, 0.08, 0.06); txt(b, -0.06, -0.14, 0.1, 'PE'); }, atributos: [ID] },
  'HM-TEL-DG': { layer: 'TEL-DG', legenda: 'DG / central de interfonia ou PABX (com nobreak)', desenhar: b => { poli(b, [[-0.3, -0.2], [0.3, -0.2], [0.3, 0.2], [-0.3, 0.2], [-0.3, -0.2]]); txt(b, -0.12, -0.06, 0.12, 'DG'); }, atributos: [{ ...ID, x: 0.35 }] },
  'HM-ANT-PONTO': { layer: 'ANT-PONTO', legenda: 'Tomada de TV (antena coletiva)', desenhar: b => { triangulo(b); txt(b, -0.06, -0.06, 0.1, 'A'); }, atributos: [ID] },
  'HM-ANT-SAT': { layer: 'ANT-PONTO', legenda: 'Tomada de satélite (SAT)', desenhar: b => { triangulo(b); txt(b, -0.09, -0.06, 0.08, 'S'); circ(b, 0, 0.05, 0.25); }, atributos: [ID] },
  'HM-CFTV-CAMERA': { layer: 'CFTV-CAMERA', legenda: 'Câmera de CFTV', desenhar: b => { poli(b, [[-0.2, -0.1], [0.12, -0.1], [0.12, 0.1], [-0.2, 0.1], [-0.2, -0.1]]); poli(b, [[0.12, -0.05], [0.25, -0.12], [0.25, 0.12], [0.12, 0.05]]); }, atributos: [ID] },
  'HM-ACE-LEITOR': { layer: 'ACE-LEITORA', legenda: 'Leitor de controle de acesso (cartão/facial)', desenhar: b => { poli(b, [[-0.1, -0.15], [0.1, -0.15], [0.1, 0.15], [-0.1, 0.15], [-0.1, -0.15]]); circ(b, 0, 0.05, 0.05); }, atributos: [ID] },
  'HM-ACE-FECHADURA': { layer: 'ACE-FECHADURA', legenda: 'Fechadura eletromagnética / eletroímã', desenhar: b => { poli(b, [[-0.2, -0.06], [0.2, -0.06], [0.2, 0.06], [-0.2, 0.06], [-0.2, -0.06]]); txt(b, -0.05, -0.04, 0.08, 'M'); }, atributos: [ID] },
  'HM-ACE-BOTOEIRA': { layer: 'ACE-BOTOEIRA', legenda: 'Botoeira de saída', desenhar: b => { circ(b, 0, 0, 0.1); circ(b, 0, 0, 0.04); }, atributos: [ID] },
  'HM-ACE-EMERGENCIA': { layer: 'ACE-BOTOEIRA', legenda: 'Acionador de emergência (quebra-vidro) — libera a porta', desenhar: b => { poli(b, [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1], [-0.1, -0.1]]); lin(b, -0.1, -0.1, 0.1, 0.1); lin(b, -0.1, 0.1, 0.1, -0.1); }, atributos: [ID] },
  'HM-ACE-SENSOR': { layer: 'ACE-FECHADURA', legenda: 'Sensor de porta (magnético — porta aberta/arrombada)', desenhar: b => { poli(b, [[-0.1, -0.04], [0.1, -0.04], [0.1, 0.04], [-0.1, 0.04], [-0.1, -0.04]]); txt(b, -0.04, -0.03, 0.06, 'S'); }, atributos: [ID] },
  'HM-ACE-CONTROLADORA': { layer: 'ACE-CONTROLADORA', legenda: 'Controladora de acesso (com fonte e bateria)', desenhar: b => { poli(b, [[-0.25, -0.18], [0.25, -0.18], [0.25, 0.18], [-0.25, 0.18], [-0.25, -0.18]]); txt(b, -0.15, -0.05, 0.1, 'CTRL'); }, atributos: [{ ...ID, x: 0.3 }] },
  'HM-ACE-CATRACA': { layer: 'ACE-CONTROLADORA', legenda: 'Catraca / torniquete com leitor', desenhar: b => { poli(b, [[-0.15, -0.4], [0.15, -0.4], [0.15, 0.4], [-0.15, 0.4], [-0.15, -0.4]]); lin(b, 0.15, 0, 0.55, 0); lin(b, 0.15, 0, 0.35, 0.3); lin(b, 0.15, 0, 0.35, -0.3); }, atributos: [{ ...ID, x: 0.2, y: 0.45 }] },
  'HM-ALM-IVP': { layer: 'ALM-SENSOR', legenda: 'Sensor infravermelho passivo (IVP)', desenhar: b => { poli(b, [[0, 0], [0.25, 0.15], [0.25, -0.15], [0, 0]]); circ(b, 0, 0, 0.04); }, atributos: [ID] },
  'HM-ALM-MAGNETICO': { layer: 'ALM-SENSOR', legenda: 'Sensor magnético de abertura', desenhar: b => { poli(b, [[-0.12, -0.05], [0.12, -0.05], [0.12, 0.05], [-0.12, 0.05], [-0.12, -0.05]]); lin(b, -0.12, 0.1, 0.12, 0.1); }, atributos: [ID] },
  'HM-ALM-SIRENE': { layer: 'ALM-SIRENE', legenda: 'Sirene', desenhar: b => { poli(b, [[-0.1, -0.08], [0, -0.08], [0.15, -0.18], [0.15, 0.18], [0, 0.08], [-0.1, 0.08], [-0.1, -0.08]]); }, atributos: [ID] },
  'HM-ALM-TECLADO': { layer: 'ALM-CENTRAL', legenda: 'Teclado de comando do alarme', desenhar: b => { poli(b, [[-0.15, -0.12], [0.15, -0.12], [0.15, 0.12], [-0.15, 0.12], [-0.15, -0.12]]); txt(b, -0.06, -0.05, 0.1, 'K'); }, atributos: [ID] },
  'HM-ALM-CENTRAL': { layer: 'ALM-CENTRAL', legenda: 'Central de alarme (com bateria e comunicador)', desenhar: b => { poli(b, [[-0.3, -0.2], [0.3, -0.2], [0.3, 0.2], [-0.3, 0.2], [-0.3, -0.2]]); txt(b, -0.12, -0.06, 0.12, 'CA'); }, atributos: [{ ...ID, x: 0.35 }] },
  'HM-INC-DETECTOR-FUMACA': { layer: 'INC-DETECTOR', legenda: 'Detector pontual de fumaça', desenhar: b => { circ(b, 0, 0, 0.15); txt(b, -0.05, -0.06, 0.12, 'F'); }, atributos: [ID] },
  'HM-INC-DETECTOR-TEMP': { layer: 'INC-DETECTOR', legenda: 'Detector pontual de temperatura', desenhar: b => { circ(b, 0, 0, 0.15); txt(b, -0.05, -0.06, 0.12, 'T'); }, atributos: [ID] },
  'HM-INC-ACIONADOR': { layer: 'INC-ACIONADOR', legenda: 'Acionador manual (h = 1,20 m)', desenhar: b => { poli(b, [[-0.12, -0.12], [0.12, -0.12], [0.12, 0.12], [-0.12, 0.12], [-0.12, -0.12]]); circ(b, 0, 0, 0.06); }, atributos: [ID] },
  'HM-INC-AVISADOR': { layer: 'INC-AVISADOR', legenda: 'Avisador audiovisual', desenhar: b => { poli(b, [[-0.12, -0.12], [0.12, -0.12], [0.12, 0.12], [-0.12, 0.12], [-0.12, -0.12]]); poli(b, [[-0.06, -0.06], [0.06, 0], [-0.06, 0.06], [-0.06, -0.06]]); }, atributos: [ID] },
  'HM-INC-CENTRAL': { layer: 'INC-CENTRAL', legenda: 'Central de alarme de incêndio', desenhar: b => { poli(b, [[-0.3, -0.2], [0.3, -0.2], [0.3, 0.2], [-0.3, 0.2], [-0.3, -0.2]]); txt(b, -0.18, -0.06, 0.12, 'CAI'); }, atributos: [{ ...ID, x: 0.35 }] },
  'HM-INC-EMERGENCIA': { layer: 'INC-ILUM-EMERG', legenda: 'Luminária de emergência', desenhar: b => { poli(b, [[-0.2, -0.08], [0.2, -0.08], [0.2, 0.08], [-0.2, 0.08], [-0.2, -0.08]]); lin(b, -0.2, -0.08, 0.2, 0.08); }, atributos: [ID] },
  'HM-SPDA-CAPTOR': { layer: 'SPDA-CAPTOR', legenda: 'Captor (terminal aéreo)', desenhar: b => { circ(b, 0, 0, 0.12); lin(b, 0, -0.12, 0, 0.12); lin(b, -0.12, 0, 0.12, 0); }, atributos: [ID] },
  'HM-SPDA-DESCIDA': { layer: 'SPDA-DESCIDA', legenda: 'Descida (condutor de descida)', desenhar: b => { circ(b, 0, 0, 0.12); poli(b, [[-0.06, 0.04], [0, -0.06], [0.06, 0.04]]); }, atributos: [ID] },
  'HM-SPDA-CAIXA-INSPECAO': { layer: 'SPDA-CAIXA-INSPECAO', legenda: 'Caixa de inspeção / haste de aterramento', desenhar: b => { poli(b, [[-0.12, -0.12], [0.12, -0.12], [0.12, 0.12], [-0.12, 0.12], [-0.12, -0.12]]); lin(b, 0, 0.1, 0, -0.1); lin(b, -0.08, -0.1, 0.08, -0.1); }, atributos: [ID] },
  'HM-AUT-SENSOR': { layer: 'AUT-SENSOR', legenda: 'Sensor de automação (temperatura, CO₂, presença)', desenhar: b => { circ(b, 0, 0, 0.12); txt(b, -0.05, -0.05, 0.1, 'S'); }, atributos: [ID] },
  'HM-AUT-CONTROLADOR': { layer: 'AUT-CONTROLADOR', legenda: 'Controlador / quadro de automação', desenhar: b => { poli(b, [[-0.3, -0.2], [0.3, -0.2], [0.3, 0.2], [-0.3, 0.2], [-0.3, -0.2]]); txt(b, -0.15, -0.06, 0.12, 'DDC'); }, atributos: [{ ...ID, x: 0.35 }] },
  'HM-SOL-INVERSOR': { layer: 'FV-INVERSOR', legenda: 'Inversor fotovoltaico', desenhar: b => { poli(b, [[-0.25, -0.2], [0.25, -0.2], [0.25, 0.2], [-0.25, 0.2], [-0.25, -0.2]]); lin(b, -0.25, -0.2, 0.25, 0.2); txt(b, -0.2, 0.05, 0.08, '='); txt(b, 0.08, -0.15, 0.08, '~'); }, atributos: [{ ...ID, x: 0.3 }] },
  'HM-VE-CARREGADOR': { layer: 'VE-CARREGADOR', legenda: 'Carregador veicular (wallbox)', desenhar: b => { poli(b, [[-0.15, -0.2], [0.15, -0.2], [0.15, 0.2], [-0.15, 0.2], [-0.15, -0.2]]); txt(b, -0.1, -0.06, 0.12, 'VE'); }, atributos: [ID] },
};

// Define no desenho só os símbolos usados (ou todos)
function definirSimbolos(desenho, nomes = Object.keys(SIMBOLOS)) {
  for (const nome of nomes) {
    const s = SIMBOLOS[nome];
    if (!s) throw new Error(`Símbolo desconhecido: ${nome}`);
    desenho.bloco(nome, s.desenhar, s.atributos);
  }
}

// Legenda (símbolo + descrição + quantidade) em (x, y), para os símbolos usados
function legenda(desenho, x, y, itens, { titulo = 'LEGENDA' } = {}) {
  const passo = 0.55;
  desenho.texto(x, y, 0.22, titulo, { layer: 'G-LEGENDA' });
  itens.forEach(({ simbolo, quantidade }, i) => {
    const yl = y - 0.6 - i * passo;
    desenho.inserir(simbolo, x + 0.3, yl, { layer: SIMBOLOS[simbolo].layer });
    desenho.texto(x + 0.8, yl - 0.07, 0.15, SIMBOLOS[simbolo].legenda + (quantidade != null ? ` — ${quantidade} un` : ''), { layer: 'G-LEGENDA' });
  });
  return { altura: 0.6 + itens.length * passo };
}

module.exports = { SIMBOLOS, definirSimbolos, legenda };
