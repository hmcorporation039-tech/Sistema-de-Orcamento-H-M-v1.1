// Rack 19" (EIA/ECA-310-E) — modelo de ocupação por U, desenhos em SVG
// (elevação frontal, traseira e vista lateral) e a lista de montagem "do rack
// aos parafusos" que alimenta o caderno de fabricação (caderno.js).
//
// Quem usa: os adaptadores das skills (cabeamento, CFTV…) montam a lista de
// itens a partir do próprio cálculo e chamam dimensionarRack(); o caderno sai
// de cadernoDeRacks(). Medidas e massas típicas de mercado vão marcadas
// [CONFERIR] — não há catálogo de racks/ativos no sistema ainda.
//
// Convenções: 1U = 44,45 mm (1,75"); U numerado de BAIXO para cima (U1 na
// base, como gravado nos trilhos); a lista de ocupação é dada de CIMA para
// baixo (ordem de montagem e de leitura da elevação).

const U_MM = 44.45;
const LARGURA_19_MM = 482.6;   // painel com as abas (19")
const VAO_TRILHOS_MM = 450;    // abertura livre entre trilhos (17,75")
const FUROS_ENTRE_MM = 465.1;  // centro a centro dos furos dos trilhos
// Furação por U (EIA-310-E): 3 furos a 6,35 / 22,225 / 38,1 mm da borda inferior do U
const FUROS_U_MM = [6.35, 22.225, 38.1];
const FOLGA_PAINEL_MM = 0.79;  // altura do painel = n·U − 1/32"

const ALTURAS = { parede: [6, 8, 10, 12], piso: [12, 16, 20, 24, 28, 32, 36, 40, 44] };
const PROFUNDIDADES = { parede: [350, 450, 570], piso: [600, 800, 1000] };
// Geometria típica [CONFERIR] com o fabricante do rack escolhido
const GEOMETRIA = {
  piso: { recuo: 60, fundo: 40, topo: 70, base: 60, pes: 40, larguraExt: 600, capacidadeKg: 400, massa: (u) => 20 + 1.1 * u },
  parede: { recuo: 40, fundo: 30, topo: 35, base: 35, pes: 0, larguraExt: 560, capacidadeKg: 40, massa: (u) => 5 + 1.0 * u },
};
const FOLGA_CABOS_MM = 100; // atrás do item mais fundo: plugues e raio de curvatura dos cabos

// Itens típicos (medidas, massa e consumo de mercado) — o adaptador pode sobrescrever
const TIPICOS = {
  patch_panel: { rotulo: 'Patch panel', u: 1, profundidade_mm: 120, peso_kg: 1.6, cor: '#dce6f2', traco: '#2b4a6f' },
  organizador: { rotulo: 'Organizador horizontal', u: 1, profundidade_mm: 80, peso_kg: 0.7, cor: '#ececec', traco: '#555' },
  switch: { rotulo: 'Switch', u: 1, profundidade_mm: 260, peso_kg: 3.8, potencia_w: 45, tomadas: 1, aterrar: true, cor: '#d9ead3', traco: '#2e6b2e' },
  dio: { rotulo: 'DIO', u: 1, profundidade_mm: 250, peso_kg: 2.5, aterrar: true, cor: '#fde9d9', traco: '#9c4a1a' },
  pdu: { rotulo: 'Régua de energia (PDU)', u: 1, profundidade_mm: 60, peso_kg: 1.2, cor: '#fff2cc', traco: '#8a6d00' },
  bandeja: { rotulo: 'Bandeja fixa', u: 1, profundidade_mm: 350, peso_kg: 2.5, cor: '#e6e0f0', traco: '#5b4a8a' },
  nvr: { rotulo: 'Gravador (NVR)', u: 1, profundidade_mm: 320, peso_kg: 4.5, potencia_w: 40, tomadas: 1, aterrar: true, cor: '#d0e0e3', traco: '#1f5b66' },
  nobreak: { rotulo: 'Nobreak', u: 2, profundidade_mm: 450, peso_kg: 22, aterrar: true, fonte: true, cor: '#f4cccc', traco: '#8a1f1f' },
  equipamento: { rotulo: 'Equipamento', u: 1, profundidade_mm: 250, peso_kg: 3, potencia_w: 20, tomadas: 1, aterrar: true, cor: '#eef3e2', traco: '#4d5e2a' },
  tampa: { rotulo: 'Tampa cega', u: 1, profundidade_mm: 15, peso_kg: 0.4, cor: '#f7f7f7', traco: '#999' },
};

// escape de HTML/SVG: pacote comum (base/html.js)
const { escapeHtml: esc } = require('../base/html');
const br = (v, c = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const r1 = (v) => Math.round(v * 10) / 10;

// ── Dimensionamento ───────────────────────────────────────────────────────

function normalizarItem(it, i) {
  const t = TIPICOS[it.tipo] || TIPICOS.equipamento;
  const sobre = it.sobre || null; // aparelho de mesa apoiado na bandeja
  let u = Number(it.u) || t.u;
  // bandeja: a chapa fica na base do U e o aparelho sobe a partir dela (+4 mm de folga)
  if (it.tipo === 'bandeja' && sobre) u = Math.max(1, Math.ceil(((Number(sobre.altura_mm) || 40) + 4) / U_MM));
  const potencia = Number(it.potencia_w ?? sobre?.potencia_w ?? t.potencia_w) || 0;
  return {
    ...it,
    tag: it.tag || `IT-${i + 1}`,
    tipo: TIPICOS[it.tipo] ? it.tipo : 'equipamento',
    rotulo: t.rotulo,
    descricao: it.descricao || t.rotulo,
    // rótulo curto da elevação (a descrição completa vai na tabela de componentes)
    curta: it.curta || (it.tipo === 'organizador' ? 'organizador horizontal 1U' : sobre ? `bandeja + ${sobre.descricao}` : ''),
    u,
    profundidade_mm: Number(it.profundidade_mm ?? sobre?.profundidade_mm ?? t.profundidade_mm) || 0,
    peso_kg: (Number(it.peso_kg ?? t.peso_kg) || 0) + (Number(sobre?.peso_kg) || 0),
    potencia_w: potencia,
    // calor que fica no rack: num switch PoE a maior parte da potência sai para as câmeras/APs
    dissipacao_w: Number(it.dissipacao_w ?? potencia) || 0,
    tomadas: Number(it.tomadas ?? sobre?.tomadas ?? (potencia > 0 && !t.fonte ? 1 : t.tomadas || 0)) || 0,
    aterrar: it.aterrar ?? t.aterrar ?? false,
    fonte: !!t.fonte,
    zona: it.zona === 'base' ? 'base' : 'topo',
    sobre,
    fabricante: it.fabricante || 'a definir',
    referencia: it.referencia || '',
    fonteDado: it.fonte || 'medida típica de mercado [CONFERIR]',
    cor: t.cor,
    traco: t.traco,
  };
}

// entrada = { id, local, tipo: 'piso'|'parede'|'auto', alturaU?, profundidade_mm?, largura_mm?, itens[],
//             tensao_v?, secao_terra_mm2?, distancia_tgb_m?, cabos?, espaco606?, rack606?|numero?,
//             materiais_extra?[{ grupo, descricao, especificacao, quantidade, unidade, regra }] }
function dimensionarRack(entrada) {
  const avisos = [];
  const itens = (entrada.itens || []).map(normalizarItem);
  if (!itens.length) throw new Error(`${entrada.id || 'Rack'}: nenhum item para acomodar.`);
  const uItens = itens.reduce((a, it) => a + it.u, 0);
  const profMax = Math.max(...itens.map(it => it.tipo === 'bandeja' ? (it.sobre?.profundidade_mm || 0) : it.profundidade_mm));
  const pesoItens = itens.reduce((a, it) => a + it.peso_kg, 0);
  const tensao = Number(entrada.tensao_v) || 220;

  // tipo: parede só até 12U, sem item fundo/pesado demais (nobreak vai num rack de piso)
  let tipo = entrada.tipo;
  const uPedido = Number(entrada.alturaU) || 0;
  const cabeParede = Math.max(uPedido, uItens) <= 12 && profMax + GEOMETRIA.parede.recuo + FOLGA_CABOS_MM + GEOMETRIA.parede.fundo <= 570
    && pesoItens <= GEOMETRIA.parede.capacidadeKg * 0.8 && !itens.some(it => it.tipo === 'nobreak');
  if (tipo !== 'piso' && tipo !== 'parede') tipo = cabeParede ? 'parede' : 'piso';
  if (tipo === 'parede' && !cabeParede) {
    avisos.push(`${entrada.id}: os itens não cabem num rack de parede (até 12U, ${GEOMETRIA.parede.capacidadeKg} kg, sem nobreak) — adotado rack de piso. [CONFERIR]`);
    tipo = 'piso';
  }
  const g = GEOMETRIA[tipo];

  // altura: a pedida pelo cálculo da skill, ou a menor de catálogo que acomoda os itens
  let alturaU = ALTURAS[tipo].find(u => u >= Math.max(uItens, uPedido)) || ALTURAS[tipo][ALTURAS[tipo].length - 1];
  if (uPedido && alturaU !== uPedido) {
    if (uPedido < uItens) avisos.push(`${entrada.id}: ${uItens}U de itens não cabem nos ${uPedido}U previstos — adotado rack de ${alturaU}U. [CONFERIR]`);
    else if (!ALTURAS[tipo].includes(uPedido)) avisos.push(`${entrada.id}: rack de ${uPedido}U fora da série de ${tipo} — adotado ${alturaU}U.`);
  }
  if (uItens > alturaU) {
    avisos.push(`${entrada.id}: ${uItens}U de itens excedem o maior rack de ${tipo} (${alturaU}U) — dividir em dois racks. [CONFERIR]`);
  }

  // profundidade: a pedida ou a menor que deixa folga atrás do item mais fundo
  const profNecessaria = profMax + g.recuo + FOLGA_CABOS_MM + g.fundo;
  let profundidade = Number(entrada.profundidade_mm) || PROFUNDIDADES[tipo].find(p => p >= profNecessaria) || PROFUNDIDADES[tipo][PROFUNDIDADES[tipo].length - 1];
  const profUtil = profundidade - g.recuo - g.fundo;
  if (profMax + FOLGA_CABOS_MM > profUtil) avisos.push(`${entrada.id}: item de ${profMax} mm + ${FOLGA_CABOS_MM} mm de folga para cabos excede a profundidade útil de ${profUtil} mm. [CONFERIR]`);

  // portas de patch panel: acima de 6 painéis o rack de 800 mm dá espaço aos organizadores verticais
  const portasPainel = itens.filter(it => it.tipo === 'patch_panel').reduce((a, it) => a + (Number(it.portas) || 24), 0);
  const larguraExt = Number(entrada.largura_mm) || (tipo === 'piso' && portasPainel > 144 ? 800 : g.larguraExt);

  // ocupação: zona 'topo' de cima para baixo, zona 'base' encostada no U1; o meio é reserva
  const ocupacao = [];
  let topo = alturaU;
  for (const it of itens.filter(x => x.zona === 'topo')) {
    ocupacao.push({ ...it, uTopo: topo, uBase: topo - it.u + 1 });
    topo -= it.u;
  }
  const base = itens.filter(x => x.zona === 'base');
  let uBaseZona = base.reduce((a, it) => a + it.u, 0);
  const daBase = [];
  for (const it of base) {
    daBase.push({ ...it, uTopo: uBaseZona, uBase: uBaseZona - it.u + 1 });
    uBaseZona -= it.u;
  }
  // tampas cegas de 1U em cada U livre (fluxo de ar frente→trás; tiradas na expansão)
  const fundoTopo = topo; // último U livre abaixo da zona de topo
  const topoBase = daBase.length ? daBase[0].uTopo : 0;
  const tampas = [];
  for (let u = fundoTopo; u > topoBase; u--) {
    tampas.push(normalizarItem({ tipo: 'tampa', tag: `TC-${String(tampas.length + 1).padStart(2, '0')}`, descricao: 'Tampa cega 1U (U livre — reserva)', preenchimento: true }, 0));
    Object.assign(tampas[tampas.length - 1], { uTopo: u, uBase: u });
  }
  ocupacao.push(...tampas, ...daBase);
  ocupacao.sort((a, b) => b.uTopo - a.uTopo);
  const uOcupados = uItens;
  const uLivres = Math.max(0, alturaU - uItens);

  // energia: tomadas da PDU = aparelhos + ventilação, com 25 % de reserva
  const dissipacao = ocupacao.reduce((a, it) => a + it.dissipacao_w, 0);
  // vazão de ar Q [m³/h] ≈ 3,1 × P [W] ÷ ΔT [K], ΔT = 10 K; ventilador de 120 mm ≈ 50 m³/h efetivos no rack [CONFERIR]
  const vazao = dissipacao > 0 ? 3.1 * dissipacao / 10 : 0;
  const ventiladores = dissipacao > 0 ? Math.max(tipo === 'piso' ? 2 : 1, Math.ceil(vazao / 50)) : 0;
  const potVent = ventiladores * 8;
  const potencia = ocupacao.reduce((a, it) => a + (it.fonte ? 0 : it.potencia_w), 0) + potVent;
  const tomadasNec = ocupacao.reduce((a, it) => a + it.tomadas, 0) + (ventiladores ? 1 : 0);
  const corrente = potencia / (tensao * 0.9); // FP 0,9 típico de fontes chaveadas
  // PDU: 10 A até 8 A de carga (80 %), senão 20 A; acima de 16 A, duas PDUs em circuitos distintos
  const nPdu = Math.max(1, Math.ceil(corrente / 16));
  const correntePdu = nPdu > 1 || corrente > 8 ? 20 : 10;
  const tomadasPdu = [8, 12].find(n => n * nPdu >= Math.ceil(tomadasNec * 1.25)) || 12;
  if (tomadasNec * 1.25 > 12 * nPdu) avisos.push(`${entrada.id}: ${tomadasNec} tomadas necessárias — acima de ${12 * nPdu} na(s) PDU(s); prever PDU adicional. [CONFERIR]`);
  const temPdu = ocupacao.some(it => it.tipo === 'pdu');
  if (!temPdu && tomadasNec) avisos.push(`${entrada.id}: há aparelhos energizados e nenhuma PDU na lista de itens.`);
  for (const it of ocupacao.filter(x => x.tipo === 'pdu')) {
    it.descricao = `PDU 19" 1U, ${tomadasPdu} tomadas 2P+T NBR 14136 ${correntePdu} A, ${tensao} V`;
    it.curta = `PDU ${tomadasPdu} tomadas ${correntePdu} A ${tensao} V`;
    it.referencia = it.referencia || 'com chave liga/desliga e proteção (disjuntor/DPS) [CONFERIR]';
  }

  const massaRack = g.massa(alturaU);
  const massa = massaRack + ocupacao.reduce((a, it) => a + it.peso_kg, 0);
  if (massa - massaRack > g.capacidadeKg) avisos.push(`${entrada.id}: ${br(massa - massaRack)} kg de equipamentos acima da capacidade típica do rack (${g.capacidadeKg} kg). [CONFERIR]`);

  const secaoTerra = Number(entrada.secao_terra_mm2) || 16; // TIA-607-D: mínimo 6 AWG (13,3 mm²) → 16 mm² comercial
  const distTgb = Number(entrada.distancia_tgb_m) || 10;
  const rack = {
    id: entrada.id || 'RACK-01', local: entrada.local || '', titulo: entrada.titulo || '', tipo, alturaU, larguraExt, profundidade, profUtil, profMax,
    alturaUtilMm: alturaU * U_MM, alturaExtMm: Math.round(alturaU * U_MM + g.topo + g.base + g.pes),
    geometria: g, ocupacao, uOcupados, uLivres, tampas: tampas.length, portasPainel,
    cabos: Number(entrada.cabos) || portasPainel, // cabos horizontais terminados no rack
    potencia, dissipacao, vazao, ventiladores, tomadasNec, tomadasPdu, correntePdu, nPdu, corrente, tensao,
    massaRack, massa, secaoTerra, distTgb,
    espaco606: entrada.espaco606 || '0A', rack606: entrada.rack606 || `R${String(entrada.numero || 1).padStart(2, '0')}`,
    materiaisExtra: entrada.materiais_extra || [], avisos,
  };
  // letras dos painéis (TIA-606-C: painel identificado no rack, de cima para baixo)
  let letra = 0;
  for (const it of ocupacao) if (it.tipo === 'patch_panel' || it.tipo === 'dio') it.letra = String.fromCharCode(65 + letra++);
  return rack;
}

// ── Desenhos (SVG em mm) ──────────────────────────────────────────────────

const FONTE = 'font-family="Arial, Helvetica, sans-serif"';

function cotaVertical(x, y1, y2, texto, lado = -1, fz = 18) {
  const tx = x + lado * (fz * 0.8);
  return `<g stroke="#333" stroke-width="1" fill="none"><line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>`
    + `<line x1="${x - 8}" y1="${y1}" x2="${x + 8}" y2="${y1}"/><line x1="${x - 8}" y1="${y2}" x2="${x + 8}" y2="${y2}"/>`
    + `<path d="M${x} ${y1} l-5 14 h10 z M${x} ${y2} l-5 -14 h10 z" fill="#333"/></g>`
    + `<text x="${tx}" y="${(y1 + y2) / 2}" ${FONTE} font-size="${fz}" text-anchor="middle" transform="rotate(-90 ${tx} ${(y1 + y2) / 2})">${esc(texto)}</text>`;
}

function cotaHorizontal(x1, x2, y, texto, fz = 18) {
  return `<g stroke="#333" stroke-width="1" fill="none"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`
    + `<line x1="${x1}" y1="${y - 8}" x2="${x1}" y2="${y + 8}"/><line x1="${x2}" y1="${y - 8}" x2="${x2}" y2="${y + 8}"/>`
    + `<path d="M${x1} ${y} l14 -5 v10 z M${x2} ${y} l-14 -5 v10 z" fill="#333"/></g>`
    + `<text x="${(x1 + x2) / 2}" y="${y - 7}" ${FONTE} font-size="${fz}" text-anchor="middle">${esc(texto)}</text>`;
}

// corta o texto para caber em `larguraMm` com fonte de `tamanho` mm (≈ 0,55 em por caractere)
function caber(texto, larguraMm, tamanho) {
  const max = Math.max(4, Math.floor(larguraMm / (tamanho * 0.55)));
  const s = String(texto);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// detalhe de frente de cada tipo (portas, argolas, tomadas) — só ilustrativo
function detalheFrente(it, x, y, w, h) {
  const out = [];
  const meio = y + h - 14;
  if (it.tipo === 'patch_panel' || (it.tipo === 'switch' && it.u === 1)) {
    const n = Math.min(Number(it.portas) || 24, 48);
    const porLinha = n > 24 ? Math.ceil(n / 2) : n;
    const linhas = n > 24 ? 2 : 1;
    const passo = Math.min(13, (w - 120) / porLinha);
    const x0 = x + w / 2 - (porLinha * passo) / 2;
    for (let l = 0; l < linhas; l++) {
      for (let k = 0; k < porLinha && l * porLinha + k < n; k++) {
        const py = linhas === 2 ? y + h - 17 + l * 8 : meio - 3;
        out.push(`<rect x="${r1(x0 + k * passo + 1.5)}" y="${r1(py)}" width="${r1(passo - 3)}" height="${linhas === 2 ? 7 : 9}" fill="#fff" stroke="#555" stroke-width="0.6"/>`);
      }
    }
  } else if (it.tipo === 'organizador') {
    // argolas nas pontas: o centro fica para o texto
    for (const ax of [x + 20, x + w - 38]) out.push(`<rect x="${r1(ax)}" y="${r1(y + 12)}" width="18" height="20" rx="6" fill="none" stroke="#666" stroke-width="1.4"/>`);
  } else if (it.tipo === 'pdu') {
    const n = Number(it.tomadas_pdu) || 8;
    for (let k = 0; k < n; k++) out.push(`<circle cx="${r1(x + 70 + k * (w - 140) / Math.max(1, n - 1))}" cy="${r1(y + h - 10)}" r="6" fill="#fff" stroke="#8a6d00" stroke-width="1"/>`);
  } else if (it.tipo === 'tampa') {
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#hachura)" stroke="none"/>`);
  } else if (it.tipo === 'bandeja') {
    // chapa da bandeja na base e o aparelho apoiado
    out.push(`<rect x="${x + 50}" y="${y + h - 6}" width="${w - 100}" height="4" fill="#5b4a8a"/>`);
    out.push(`<rect x="${x + 40}" y="${y + 4}" width="${w - 80}" height="${h - 12}" fill="#fff" stroke="#5b4a8a" stroke-width="1" stroke-dasharray="6 3"/>`);
  } else if (it.tipo === 'nobreak') {
    out.push(`<rect x="${x + w - 85}" y="${y + 30}" width="50" height="24" fill="#fff" stroke="#8a1f1f" stroke-width="1"/>`);
  }
  return out.join('');
}

// k: escala prevista do desenho (1:k) — as letras crescem com ela para sair legíveis no papel
function elevacaoSvg(rack, face = 'frente', k = 10) {
  const g = rack.geometria;
  const fz = (mm, min, max) => r1(Math.min(max, Math.max(min, mm * k)));
  const fU = fz(1.7, 16, 26), fItem = fz(1.9, 14, 26), fCota = fz(1.8, 18, 28);
  const ML = 150, MR = 120, MT = face === 'tras' ? 95 : 30, MB = face === 'tras' ? 160 : 110;
  const W = rack.larguraExt;
  const altExt = rack.alturaExtMm - g.pes;
  const largura = ML + W + MR;
  const altura = MT + altExt + g.pes + MB;
  const x0 = ML; const yTopo = MT;
  const yU = (u) => yTopo + g.topo + (rack.alturaU - u) * U_MM; // y do TOPO do U `u`
  const cx = x0 + W / 2;
  const xP = cx - LARGURA_19_MM / 2;
  const xTrilhoE = cx - VAO_TRILHOS_MM / 2 - 16; const xTrilhoD = cx + VAO_TRILHOS_MM / 2;
  const traseira = face === 'tras';
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r1(largura)} ${r1(altura)}" width="${r1(largura)}mm" height="${r1(altura)}mm">`);
  out.push('<defs><pattern id="hachura" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="12" stroke="#ccc" stroke-width="2"/></pattern></defs>');
  out.push(`<rect x="0" y="0" width="${r1(largura)}" height="${r1(altura)}" fill="#fff"/>`);
  // estrutura: laterais, teto e base
  out.push(`<rect x="${x0}" y="${yTopo}" width="${W}" height="${r1(altExt)}" fill="#f2f2f2" stroke="#222" stroke-width="3"/>`);
  out.push(`<rect x="${x0 + 25}" y="${yTopo + g.topo}" width="${W - 50}" height="${r1(rack.alturaUtilMm)}" fill="#fafafa" stroke="#666" stroke-width="1"/>`);
  if (g.pes) for (const px of [x0 + 30, x0 + W - 70]) out.push(`<rect x="${px}" y="${r1(yTopo + altExt)}" width="40" height="${g.pes}" fill="#555"/>`);
  // trilhos com a furação EIA-310 (3 furos quadrados por U)
  for (const xt of [xTrilhoE, xTrilhoD]) {
    out.push(`<rect x="${r1(xt)}" y="${r1(yU(rack.alturaU))}" width="16" height="${r1(rack.alturaUtilMm)}" fill="#bbb" stroke="#555" stroke-width="0.8"/>`);
    for (let u = 1; u <= rack.alturaU; u++) {
      const yb = yU(u) + U_MM;
      for (const f of FUROS_U_MM) out.push(`<rect x="${r1(xt + 3.5)}" y="${r1(yb - f - 4.5)}" width="9" height="9" fill="#fff" stroke="#777" stroke-width="0.5"/>`);
    }
  }
  // números de U à esquerda e linhas de divisão
  for (let u = 1; u <= rack.alturaU; u++) {
    const y = yU(u);
    out.push(`<line x1="${x0 - 50}" y1="${r1(y + U_MM)}" x2="${x0}" y2="${r1(y + U_MM)}" stroke="#999" stroke-width="0.6"/>`);
    out.push(`<text x="${x0 - 12}" y="${r1(y + U_MM / 2 + 6)}" ${FONTE} font-size="${fU}" text-anchor="end" fill="#333">${u}</text>`);
  }
  out.push(`<line x1="${x0 - 50}" y1="${r1(yU(rack.alturaU))}" x2="${x0}" y2="${r1(yU(rack.alturaU))}" stroke="#999" stroke-width="0.6"/>`);
  out.push(`<text x="${x0 - 28}" y="${r1(yU(rack.alturaU) - 8)}" ${FONTE} font-size="${fU}" text-anchor="middle" font-weight="bold">U</text>`);
  // organizadores verticais (rack de piso) nas laterais
  if (rack.tipo === 'piso') {
    for (const xv of [x0 + 30, x0 + W - 30 - (rack.larguraExt >= 800 ? 120 : 30)]) {
      const lv = rack.larguraExt >= 800 ? 120 : 30;
      out.push(`<rect x="${xv}" y="${r1(yU(rack.alturaU))}" width="${lv}" height="${r1(rack.alturaUtilMm)}" fill="none" stroke="#888" stroke-width="1" stroke-dasharray="8 4"/>`);
    }
  }
  // itens (na traseira o desenho é espelhado: o lado esquerdo da frente fica à direita)
  for (const it of rack.ocupacao) {
    const y = yU(it.uTopo) + 0.4;
    const h = it.u * U_MM - FOLGA_PAINEL_MM;
    const x = xP; const w = LARGURA_19_MM;
    const raso = traseira && it.tipo !== 'pdu' && it.profundidade_mm < 30; // tampas: só o verso
    out.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${w}" height="${r1(h)}" fill="${traseira ? '#fff' : it.cor}" stroke="${it.traco}" stroke-width="${raso ? 0.8 : 1.6}"${traseira && !raso ? ' stroke-dasharray="10 4"' : ''}/>`);
    if (!traseira) out.push(detalheFrente({ ...it, tomadas_pdu: rack.tomadasPdu }, x, y, w, h));
    // parafusos nas abas: 2 por lado por U (furos 1 e 3 do U)
    if (!traseira) {
      for (let u = it.uBase; u <= it.uTopo; u++) {
        const yb = yU(u) + U_MM;
        const furos = it.tipo === 'tampa' ? [FUROS_U_MM[1]] : [FUROS_U_MM[0], FUROS_U_MM[2]];
        for (const f of furos) for (const xs of [xTrilhoE + 8, xTrilhoD + 8]) out.push(`<circle cx="${r1(xs)}" cy="${r1(yb - f)}" r="4.2" fill="#333"/>`);
      }
    }
    const tam = it.u >= 2 ? Math.min(30, fItem + 3) : fItem;
    let texto;
    if (traseira) {
      const verso = { patch_panel: 'terminação dos cabos (barra de apoio)', switch: 'fonte e entrada de energia', nvr: 'entrada de energia, rede e HDs', nobreak: 'tomadas de saída e bateria', dio: 'entrada do cabo óptico', pdu: 'cabo de alimentação da PDU', bandeja: 'cabos do aparelho sobre a bandeja', organizador: '', tampa: '' }[it.tipo] ?? 'conexões traseiras';
      texto = `${it.tag}${verso ? ` — ${verso}` : ''}`;
    } else {
      texto = it.tipo === 'tampa' ? `${it.tag} — tampa cega 1U` : `${it.tag}${it.letra ? ` [${it.letra}]` : ''} — ${it.curta || it.descricao}`;
    }
    const ty = it.tipo === 'tampa' || traseira || it.tipo === 'organizador' || (it.tipo === 'bandeja' && it.u === 1) ? y + h / 2 + tam * 0.35 : y + tam + 2;
    const tyFinal = it.tipo === 'pdu' && !traseira ? y + tam + 1 : ty;
    out.push(`<text x="${r1(cx)}" y="${r1(tyFinal)}" ${FONTE} font-size="${tam}" text-anchor="middle" fill="${it.tipo === 'tampa' ? '#777' : '#111'}"${it.tipo === 'tampa' ? '' : ' font-weight="bold"'}>${esc(caber(texto, LARGURA_19_MM - (it.tipo === 'organizador' && !traseira ? 110 : 30), tam))}</text>`);
  }
  // traseira: barra de aterramento, jumpers e entrada de cabos
  if (traseira) {
    const xb = rack.tipo === 'piso' ? x0 + W - 52 : cx + 120;
    if (rack.tipo === 'piso') {
      out.push(`<rect x="${r1(xb)}" y="${r1(yU(rack.alturaU) + 10)}" width="14" height="${r1(rack.alturaUtilMm - 20)}" fill="#c87533" stroke="#7a4410" stroke-width="1"/>`);
      out.push(`<path d="M${r1(xb + 7)} ${r1(yU(rack.alturaU) + 10)} V${r1(yTopo - 4)}" stroke="#7a4410" stroke-width="1.2"/>`);
      out.push(`<text x="${r1(xb + 40)}" y="${r1(yTopo - 8)}" ${FONTE} font-size="${fCota}" text-anchor="end" fill="#7a4410">barra de aterramento do rack (Cu)</text>`);
    } else {
      out.push(`<rect x="${r1(xb)}" y="${r1(yTopo + altExt - g.base - 4)}" width="150" height="14" fill="#c87533" stroke="#7a4410"/>`);
      out.push(`<text x="${r1(xb + 75)}" y="${r1(yTopo + altExt + 22)}" ${FONTE} font-size="${fCota}" text-anchor="middle">barra de aterramento (Cu)</text>`);
    }
    // jumpers dos itens aterrados até a barra (verde-amarelo)
    for (const it of rack.ocupacao.filter(x => x.aterrar)) {
      const y = yU(it.uTopo) + (it.u * U_MM) / 2;
      const xi = cx + LARGURA_19_MM / 2 - 20;
      const yAlvo = rack.tipo === 'piso' ? y : yTopo + altExt - g.base + 3;
      const xAlvo = rack.tipo === 'piso' ? xb : xb + 20;
      out.push(`<path d="M${r1(xi)} ${r1(y)} L${r1(xAlvo)} ${r1(yAlvo)}" stroke="#2a8a2a" stroke-width="3" fill="none"/><path d="M${r1(xi)} ${r1(y)} L${r1(xAlvo)} ${r1(yAlvo)}" stroke="#e6c200" stroke-width="3" stroke-dasharray="6 6" fill="none"/>`);
    }
    // condutor ao TGB/BEP
    const ySai = rack.tipo === 'piso' ? yU(1) + U_MM - 20 : yTopo + altExt - g.base + 3;
    const xSai = rack.tipo === 'piso' ? xb + 7 : xb + 150;
    const yFim = yTopo + altExt + g.pes + 112;
    out.push(`<path d="M${r1(xSai)} ${r1(ySai)} L${r1(x0 + W + 75)} ${r1(ySai)} L${r1(x0 + W + 75)} ${r1(yFim)}" stroke="#2a8a2a" stroke-width="5" fill="none"/>`);
    out.push(`<text x="${r1(x0 + W + 75)}" y="${r1(yFim + 22)}" ${FONTE} font-size="${fCota}" text-anchor="end">${esc(`${br(rack.secaoTerra)} mm² verde-amarelo → TGB/BEP (≈ ${br(rack.distTgb)} m)`)}</text>`);
    // entrada de cabos pelo teto
    out.push(`<path d="M${r1(x0 + 20)} ${r1(yTopo - 52)} v40 m-10 -14 l10 14 l10 -14" stroke="#1f4e79" stroke-width="3" fill="none"/>`);
    out.push(`<text x="${r1(x0 + 38)}" y="${r1(yTopo - 36)}" ${FONTE} font-size="${fCota}" fill="#1f4e79">entrada de cabos pelo teto (escova)</text>`);
  }
  // cotas
  out.push(cotaVertical(x0 - 80, yU(rack.alturaU), yU(1) + U_MM, `${rack.alturaU}U = ${br(rack.alturaUtilMm, 1)} mm`, -1, fCota));
  out.push(cotaVertical(x0 + W + 30, yTopo, yTopo + altExt + g.pes, `${br(rack.alturaExtMm)} mm (externa)`, 1, fCota));
  out.push(cotaHorizontal(xP, xP + LARGURA_19_MM, yTopo + altExt + g.pes + 40, '19" = 482,6 mm', fCota));
  out.push(cotaHorizontal(x0, x0 + W, yTopo + altExt + g.pes + 85, `${br(W)} mm (externa)`, fCota));
  if (traseira) out.push(`<text x="${r1(x0 + W)}" y="${r1(yTopo - 64)}" ${FONTE} font-size="${fCota}" text-anchor="end" font-weight="bold">VISTA POR TRÁS</text>`);
  out.push('</svg>');
  return out.join('');
}

function lateralSvg(rack, k = 10) {
  const g = rack.geometria;
  const fz = (mm, min, max) => r1(Math.min(max, Math.max(min, mm * k)));
  const fItem = fz(1.7, 14, 26), fCota = fz(1.8, 18, 28);
  const ML = 150, MR = 330, MT = 50, MB = 110;
  const P = rack.profundidade;
  const altExt = rack.alturaExtMm - g.pes;
  const largura = ML + P + MR;
  const altura = MT + altExt + g.pes + MB;
  const x0 = ML; const yTopo = MT;
  const yU = (u) => yTopo + g.topo + (rack.alturaU - u) * U_MM;
  const xTF = x0 + g.recuo; // face do trilho frontal
  const xLim = x0 + P - g.fundo;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r1(largura)} ${r1(altura)}" width="${r1(largura)}mm" height="${r1(altura)}mm">`);
  out.push(`<rect x="0" y="0" width="${r1(largura)}" height="${r1(altura)}" fill="#fff"/>`);
  out.push(`<rect x="${x0}" y="${yTopo}" width="${P}" height="${r1(altExt)}" fill="#f6f6f6" stroke="#222" stroke-width="3"/>`);
  if (g.pes) for (const px of [x0 + 20, x0 + P - 60]) out.push(`<rect x="${px}" y="${r1(yTopo + altExt)}" width="40" height="${g.pes}" fill="#555"/>`);
  if (rack.tipo === 'parede') {
    out.push(`<rect x="${x0 + P}" y="${yTopo - 40}" width="40" height="${r1(altExt + 80)}" fill="url(#parede)" stroke="#555"/>`);
    out.push('<defs><pattern id="parede" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="#999" stroke-width="2"/></pattern></defs>');
    for (const yy of [yTopo + 40, yTopo + altExt - 40]) out.push(`<rect x="${x0 + P - 10}" y="${r1(yy - 4)}" width="70" height="8" fill="#555"/>`);
    out.push(`<text x="${x0 + P + 50}" y="${yTopo + 30}" ${FONTE} font-size="${fItem}">parede — 4 buchas + parafusos</text>`);
  }
  // trilhos frontal e traseiro
  out.push(`<line x1="${xTF}" y1="${r1(yU(rack.alturaU))}" x2="${xTF}" y2="${r1(yU(1) + U_MM)}" stroke="#555" stroke-width="5"/>`);
  if (rack.tipo === 'piso') out.push(`<line x1="${xLim - 20}" y1="${r1(yU(rack.alturaU))}" x2="${xLim - 20}" y2="${r1(yU(1) + U_MM)}" stroke="#555" stroke-width="5" stroke-dasharray="14 6"/>`);
  out.push(`<line x1="${r1(xLim - FOLGA_CABOS_MM)}" y1="${yTopo + 10}" x2="${r1(xLim - FOLGA_CABOS_MM)}" y2="${r1(yTopo + altExt - 10)}" stroke="#c00" stroke-width="1.2" stroke-dasharray="6 6"/>`);
  out.push(`<text x="${r1(xLim - FOLGA_CABOS_MM - 6)}" y="${yTopo + 28}" ${FONTE} font-size="${fItem}" fill="#c00" text-anchor="end">limite do equipamento (folga p/ cabos atrás)</text>`);
  for (const it of rack.ocupacao) {
    const y = yU(it.uTopo) + 0.4;
    const h = it.u * U_MM - FOLGA_PAINEL_MM;
    const prof = it.tipo === 'bandeja' ? Math.max(it.profundidade_mm, it.sobre?.profundidade_mm || 0) : it.profundidade_mm;
    const excede = prof + FOLGA_CABOS_MM > rack.profUtil;
    out.push(`<rect x="${xTF - 4}" y="${r1(y)}" width="${Math.max(4, prof)}" height="${r1(h)}" fill="${excede ? '#f8c8c8' : it.cor}" stroke="${excede ? '#c00' : it.traco}" stroke-width="1.2"/>`);
    if (it.tipo !== 'tampa') out.push(`<text x="${r1(xTF + Math.max(4, prof) + 8)}" y="${r1(y + h / 2 + fItem * 0.35)}" ${FONTE} font-size="${fItem}">${esc(`${it.tag} · ${prof} mm`)}</text>`);
  }
  out.push(cotaHorizontal(x0, x0 + P, yTopo + altExt + g.pes + 40, `profundidade ${br(P)} mm`, fCota));
  out.push(cotaHorizontal(xTF, xLim, yTopo + altExt + g.pes + 85, `útil ${br(rack.profUtil)} mm (do trilho frontal)`, fCota));
  out.push(cotaVertical(x0 - 50, yTopo, yTopo + altExt + g.pes, `${br(rack.alturaExtMm)} mm`, -1, fCota));
  out.push(`<text x="${r1(x0)}" y="${MT - 12}" ${FONTE} font-size="${fCota}" font-weight="bold">FRENTE</text>`);
  out.push(`<text x="${r1(x0 + P)}" y="${MT - 12}" ${FONTE} font-size="${fCota}" font-weight="bold" text-anchor="end">FUNDO</text>`);
  out.push('</svg>');
  return out.join('');
}

// ── Materiais de montagem "do rack aos parafusos" ─────────────────────────

const RESERVA = (n) => n + Math.max(4, Math.ceil(n * 0.1));

function materiaisMontagem(rack) {
  const m = [];
  const add = (grupo, descricao, especificacao, quantidade, unidade, regra) => { if (quantidade > 0) m.push({ grupo, descricao, especificacao, quantidade, unidade, regra }); };
  const piso = rack.tipo === 'piso';
  const occ = rack.ocupacao;
  const fixados = occ.filter(it => it.tipo !== 'tampa');
  const uFixados = fixados.reduce((a, it) => a + it.u, 0);
  const nTampas = occ.filter(it => it.tipo === 'tampa').length;

  // Invólucro
  add('Invólucro', `Rack ${piso ? 'de piso' : 'de parede'} fechado 19" ${rack.alturaU}U × ${rack.profundidade} mm`,
    `EIA/ECA-310-E, ${piso ? '4 trilhos reguláveis, largura externa ' + rack.larguraExt + ' mm, porta frontal de vidro temperado com fechadura, porta traseira e laterais removíveis com fecho' : 'porta frontal de vidro com fechadura, laterais removíveis, fundo com furação para parede'}, aço pintado (epóxi), capacidade ≥ ${br(Math.ceil(rack.massa - rack.massaRack))} kg [CONFERIR modelo]`,
    1, 'un', `1 por espaço de telecomunicações; altura = ${rack.uOcupados}U de itens + reserva → ${rack.alturaU}U; profundidade ≥ item mais fundo (${rack.profMax} mm) + recuo + ${FOLGA_CABOS_MM} mm de cabos`);
  if (piso) {
    add('Invólucro', 'Pé nivelador M10 (ou rodízio com trava)', 'normalmente fornecido com o rack [CONFERIR]', 4, 'un', '4 cantos da base');
    if (rack.alturaU >= 36) add('Fixação', 'Chumbador CBA 3/8" com arruela para fixar a base ao piso', 'aço zincado', 4, 'un', `rack alto (${rack.alturaU}U): fixar ao piso contra tombamento [CONFERIR]`);
  } else {
    add('Fixação', 'Bucha de nylon S10 para alvenaria', 'parede de alvenaria/concreto; drywall: bucha basculante metálica ou reforço [CONFERIR tipo de parede]', 4, 'un', '4 furos do fundo do rack de parede');
    add('Fixação', 'Parafuso sextavado 6 × 70 mm (rosca soberba) com arruela lisa', 'aço zincado', 4, 'un', `1 por bucha; massa montada ≈ ${br(rack.massa)} kg distribuída em 4 pontos`);
  }
  add('Invólucro', 'Chaves das portas', 'fornecidas com o rack; entregar ao responsável com registro no termo de entrega', 2, 'jg', '2 jogos por rack');

  // Fixação dos itens nos trilhos
  const parafusos = uFixados * 4 + nTampas * 2;
  const regraFix = `4 por U de cada item fixado (${uFixados}U × 4 = ${uFixados * 4}: 2 por lado por U) + 2 por tampa cega (${nTampas} × 2), + 10 % de reserva (mín. 4)`;
  add('Fixação', 'Porca gaiola M6 (cage nut)', 'para furo quadrado de 9,5 mm, chapa de 1,6–2,5 mm, aço zincado', RESERVA(parafusos), 'un', regraFix);
  add('Fixação', 'Parafuso M6 × 16 mm cabeça Phillips com flange', 'aço zincado; aperto manual firme (≈ 3 N·m) [CONFERIR]', RESERVA(parafusos), 'un', regraFix);
  add('Fixação', 'Arruela plástica (nylon) M6', 'protege a pintura e a aba do equipamento', RESERVA(parafusos), 'un', regraFix);
  const pesados = fixados.filter(it => it.peso_kg >= 15 || (it.profundidade_mm >= 400 && it.tipo !== 'bandeja'));
  for (const it of pesados) {
    add('Fixação', `Par de suportes/trilhos traseiros para ${it.tag} (${it.descricao})`, piso ? 'apoio no trilho traseiro; usar o kit do fabricante do equipamento quando houver [CONFERIR]' : 'rack de parede sem trilho traseiro — avaliar bandeja reforçada [CONFERIR]', 1, 'par', `item com ${br(it.peso_kg)} kg / ${it.profundidade_mm} mm: não sustentar só pelas abas frontais`);
  }

  // Organização e entrada de cabos
  const orgH = occ.filter(it => it.tipo === 'organizador').length;
  const paineis = occ.filter(it => it.tipo === 'patch_panel').length;
  if (piso) {
    add('Entrada de cabos', rack.larguraExt >= 800 ? `Organizador vertical fechado 150 mm × ${rack.alturaU}U` : `Guia de cabos vertical com argolas × ${rack.alturaU}U (entre trilho e lateral)`, 'aço pintado', 2, 'un', '1 por lado do rack');
    add('Entrada de cabos', 'Passa-cabos com escova para o teto (e base) do rack', 'vedação contra pó, mantém o fluxo de ar', 2, 'un', 'entrada de cabos pelo teto + saída pela base');
  } else {
    add('Entrada de cabos', 'Passa-cabos com escova / prensa-cabo no teto ou fundo do rack de parede', 'conforme a entrada de eletroduto/eletrocalha [CONFERIR]', 1, 'un', '1 entrada de cabos');
  }
  if (paineis) add('Fiação', 'Barra traseira de apoio de cabos (cable support bar) 19"', 'normalmente acompanha o patch panel [CONFERIR]', paineis, 'un', '1 por patch panel: amarra os cabos horizontais sem tracionar a terminação');
  const velcro = orgH * 2 + paineis * 2 + (piso ? 2 * Math.ceil(rack.alturaU / 4) : 2);
  add('Fiação', 'Abraçadeira de velcro (tira 20 cm × 12 mm)', 'reutilizável; não esmaga o cabo (mantém o desempenho do par trançado)', velcro,
    'un', `2 por organizador horizontal (${orgH}) + 2 por patch panel (${paineis}) + ${piso ? `1 a cada 4U em cada guia vertical (2 × ${Math.ceil(rack.alturaU / 4)})` : '2 nas laterais'}`);
  add('Fiação', 'Abraçadeira de nylon 200 × 4,8 mm', 'SÓ para cabos de energia e fixação à barra de apoio — nunca apertada sobre cabos UTP', 1, 'pct 100', '1 pacote por rack');

  // Energia
  add('Energia', `Ponto de energia para a PDU: tomada 2P+T NBR 14136 ${rack.correntePdu} A em circuito exclusivo`, `${rack.tensao} V, condutor e disjuntor pelo projeto elétrico (NBR 5410) — fora do fornecimento do rack [CONFERIR]`, rack.nPdu, 'pt',
    `carga ≈ ${br(rack.potencia)} W → ${br(rack.corrente, 1)} A a ${rack.tensao} V (FP 0,9); 1 circuito por PDU`);

  // Ventilação
  if (rack.ventiladores) {
    add('Ventilação', `Kit de ventilação de teto com ${rack.ventiladores} ventilador(es) 120 mm, ${rack.tensao} V, com cabo e plugue NBR 14136`, 'fluxo de baixo/frente para cima/trás; com termostato quando disponível [CONFERIR]', 1, 'kit',
      `dissipação ≈ ${br(rack.dissipacao)} W → vazão ≈ 3,1 × P ÷ ΔT(10 K) = ${br(rack.vazao)} m³/h ÷ 50 m³/h por ventilador`);
  }
  add('Ventilação', 'Tampa cega 1U 19" (painel cego)', 'aço pintado, fixação por 2 parafusos', nTampas, 'un', `1 por U livre (${nTampas}U): evita recirculação de ar quente e fecha a reserva`);

  // Aterramento (ANSI/TIA-607-D, NBR 5410 e NBR 14565)
  const aterrados = occ.filter(it => it.aterrar);
  const jumpersPortas = piso ? 5 : 3; // piso: porta frontal, traseira, 2 laterais e teto; parede: porta e 2 laterais
  add('Aterramento', piso ? `Barra de aterramento vertical do rack em cobre × ${rack.alturaU}U` : 'Barra de aterramento de cobre 10 furos (fundo do rack)', 'cobre estanhado com furação para terminais; isolada da pintura por contato direto parafusado com arruela dentada', 1, 'un', 'TIA-607-D: barra de aterramento do rack (RGB) que recebe todos os jumpers');
  add('Aterramento', `Cabo flexível ${br(rack.secaoTerra)} mm² verde-amarelo 750 V (barra do rack → TGB/BEP)`, 'NBR NM 247-3 / NBR 5410; percurso o mais curto e direto possível, sem emendas', Math.ceil(rack.distTgb * 1.1), 'm',
    `distância ao TGB/BEP ≈ ${br(rack.distTgb)} m + 10 % [CONFERIR]`);
  add('Aterramento', `Terminal de compressão 2 furos ${br(rack.secaoTerra)} mm² (lado TGB)`, 'cobre estanhado, prensado com alicate de compressão', 1, 'un', 'TIA-607-D: terminal de compressão de 2 furos na barra');
  add('Aterramento', `Terminal olhal ${br(rack.secaoTerra)} mm² (lado da barra do rack)`, 'cobre estanhado', 1, 'un', '1 na barra do rack');
  add('Aterramento', 'Jumper de aterramento 4 mm² verde-amarelo × 300 mm com terminais olhal (portas, laterais e teto)', 'flexível; garante a continuidade das partes removíveis', jumpersPortas, 'un', piso ? '5: porta frontal, porta traseira, 2 laterais e teto' : '3: porta frontal e 2 laterais');
  add('Aterramento', 'Jumper de aterramento 4 mm² verde-amarelo com terminais olhal (equipamentos → barra do rack)', 'do borne de terra do equipamento à barra', aterrados.length, 'un', `1 por equipamento com borne de terra: ${aterrados.map(it => it.tag).join(', ') || '—'}`);
  add('Aterramento', 'Arruela dentada (estrela) M6 para contato com a pintura', 'aço inox/zincado', (jumpersPortas + aterrados.length) * 2 + 2, 'un', '2 por jumper (uma em cada ponta) + 2 na barra');
  add('Aterramento', 'Pasta antioxidante para conexões elétricas', 'aplicar nos terminais da barra', 1, 'bisnaga', '1 por rack');

  // Identificação (ANSI/TIA-606-C)
  add('Identificação', 'Etiqueta de portas para patch panel (tira impressa 24 portas)', 'poliéster, impressão térmica, código TIA-606-C', paineis, 'un', '1 por patch panel');
  add('Identificação', 'Etiqueta de identificação de equipamento (painel, switch, DIO, PDU…)', 'poliéster autoadesivo', fixados.filter(it => it.tipo !== 'organizador').length, 'un', '1 por item montado (exceto organizadores)');
  if (rack.cabos) add('Identificação', 'Etiqueta autolaminada envolvente para cabo', 'vinil com proteção transparente, impressa', rack.cabos * 2, 'un', `2 por cabo (uma em cada extremidade) × ${rack.cabos} cabos`);

  // itens próprios da disciplina (patch cords, cordões ópticos, DPS de rede…)
  for (const x of rack.materiaisExtra) add(x.grupo || 'Outros', x.descricao, x.especificacao || '—', x.quantidade, x.unidade || 'un', x.regra || '—');

  // Documentação
  add('Documentação', `Porta-documentos adesivo A4 ${piso ? 'na porta traseira' : 'na face interna da porta'}`, 'PVC transparente', 1, 'un', '1 por rack');
  add('Documentação', 'Planilha de identificação das portas (TIA-606-C) e elevação do rack, impressas e plastificadas', 'cópia deste caderno', 1, 'cj', 'guardada no porta-documentos');
  return m;
}

// ── Plaquetas ─────────────────────────────────────────────────────────────

function exemploPorta(rack) {
  const painel = rack.ocupacao.find(it => it.tipo === 'patch_panel');
  return `${rack.espaco606}.${rack.rack606}-${painel?.letra || 'A'}:01`;
}

function plaquetasRack(rack, { modeloHm = 'H&M RK-310', normaHm = 'ABNT NBR 14565:2019 / EIA/ECA-310-E', data = '' } = {}) {
  const ident = [rack.id, rack.local].filter(Boolean);
  const plaquetas = [
    { tag: 'ID-RACK', texto: ident, largura_mm: 120, altura_mm: 40, material: 'acrílico 2 mm preto gravado a laser', fundo: '#000', letra: '#fff', fixacao: 'adesivo dupla face 3M VHB', local: rack.tipo === 'piso' ? 'portas frontal e traseira, no topo, centralizada' : 'porta frontal, no topo, e lateral direita', quantidade: 2 },
    { tag: 'ADV-ENERGIA', texto: ['ATENÇÃO', 'EQUIPAMENTO ENERGIZADO', `${rack.tensao} V~ — DESLIGAR A PDU`, 'ANTES DE INTERVIR'], largura_mm: 100, altura_mm: 30, material: 'acrílico 2 mm amarelo gravado a laser', fundo: '#ffd400', letra: '#000', fixacao: 'adesivo dupla face 3M VHB', local: rack.tipo === 'piso' ? 'porta traseira, ao lado da PDU' : 'lateral, ao lado da PDU', quantidade: 1 },
    { tag: 'ADV-TERRA', texto: ['ATENÇÃO — ATERRAMENTO', 'SE SOLTO OU SE PRECISAR', 'SER REMOVIDO, CHAME O', 'RESPONSÁVEL TÉCNICO'], largura_mm: 90, altura_mm: 30, material: 'etiqueta de poliéster amarela (ou acrílico 1 mm)', fundo: '#ffd400', letra: '#000', fixacao: 'envolvente no condutor / adesivo junto à barra', local: 'condutor de aterramento, junto à barra do rack (TIA-607-D)', quantidade: 1 },
    { tag: 'LEG-606', texto: ['IDENTIFICAÇÃO ANSI/TIA-606-C', `PORTA ${exemploPorta(rack)}`, '= ESPAÇO.RACK-PAINEL:PORTA', 'PAINÉIS A, B, C… DE CIMA P/ BAIXO'], largura_mm: 120, altura_mm: 40, material: 'acrílico 2 mm preto gravado a laser', fundo: '#000', letra: '#fff', fixacao: 'adesivo dupla face 3M VHB', local: 'face interna da porta frontal', quantidade: 1 },
  ];
  const plaqueta_hm = {
    modelo: `${modeloHm} / ${rack.id}`,
    numero_serie: 'a preencher na fabricação (nº da OS)',
    dados: [
      ['Norma', normaHm],
      ['Identificação', ident.join(' / ')],
      ['Altura útil', `${rack.alturaU}U (${br(rack.alturaUtilMm, 1)} mm) · 19"`],
      ['Dimensões', `${br(rack.larguraExt)} × ${br(rack.profundidade)} × ${br(rack.alturaExtMm)} mm`],
      ['Carga máx.', `${br(rack.geometria.capacidadeKg)} kg [CONFERIR fabricante]`],
      ['PDU', `${rack.tensao} V~ · ${rack.correntePdu} A · ${rack.tomadasPdu} tomadas`],
      ['Data', data || 'a preencher'],
    ],
    largura_mm: 100, altura_mm: 70,
    material: 'alumínio anodizado 0,5 mm gravado',
    fixacao: 'adesivo dupla face 3M VHB (sem furar a chapa pintada do rack)',
    local: rack.tipo === 'piso' ? 'lateral direita, a 1,5 m do piso' : 'lateral direita',
  };
  return { plaquetas, plaqueta_hm };
}

// ── Peças do caderno ──────────────────────────────────────────────────────

const NORMAS_RACK = [
  { codigo: 'ABNT NBR 14565:2019', titulo: 'Cabeamento estruturado para edifícios comerciais', aplicacao: 'distribuidores (racks), patch panels, organização, comprimentos de patch cords e aterramento do cabeamento (Seção 12)' },
  { codigo: 'EIA/ECA-310-E', titulo: 'Cabinets, racks, panels and associated equipment', aplicacao: 'padrão 19" (482,6 mm), U = 44,45 mm, vão de 450 mm e furação dos trilhos (3 furos por U)' },
  { codigo: 'ANSI/TIA-606-C', titulo: 'Administration standard for telecommunications infrastructure', aplicacao: 'identificação do espaço, do rack, dos painéis, das portas e dos cabos nas duas extremidades' },
  { codigo: 'ANSI/TIA-607-D', titulo: 'Generic telecommunications bonding and grounding', aplicacao: 'barra de aterramento do rack, jumpers de portas/laterais/equipamentos e condutor até o TGB/BEP' },
  { codigo: 'ABNT NBR 5410:2004', titulo: 'Instalações elétricas de baixa tensão', aplicacao: 'circuito da PDU, condutor de proteção verde-amarelo e equipotencialização (6.4)' },
  { codigo: 'ABNT NBR 14136:2012', titulo: 'Plugues e tomadas para uso doméstico e análogo', aplicacao: 'tomadas da PDU e plugues dos equipamentos (10 A / 20 A, 2P+T)' },
];

function ocupacaoTabela(rack) {
  return {
    colunas: ['U', 'Tag', 'Item', 'U ocup.', 'Prof. (mm)', 'Massa (kg)', 'Potência (W)'],
    linhas: rack.ocupacao.map(it => [it.u > 1 ? `${it.uTopo}–${it.uBase}` : String(it.uTopo), it.tag, it.descricao, String(it.u), br(it.profundidade_mm), br(it.peso_kg, 1), it.fonte ? '(fonte)' : br(it.potencia_w)]),
    proporcoes: [0.6, 0.8, 3.6, 0.6, 0.7, 0.7, 0.8],
  };
}

// componentes: todo item da elevação, com o U onde vai (tampas agrupadas numa linha)
function componentesRack(rack) {
  const comps = [];
  for (const it of rack.ocupacao.filter(x => x.tipo !== 'tampa')) {
    comps.push({
      tag: it.tag, descricao: it.descricao + (it.sobre ? ` — sobre a bandeja: ${it.sobre.descricao}` : ''),
      fabricante: it.fabricante, referencia: it.referencia,
      medidas: `19" × ${it.u}U × ${it.profundidade_mm} mm${it.sobre?.altura_mm ? ` (aparelho ${it.sobre.altura_mm} mm de altura)` : ''}`,
      quantidade: 1, unidade: 'un', local: `${rack.id} · U${it.u > 1 ? `${it.uTopo}–${it.uBase}` : it.uTopo}${it.letra ? ` · painel ${it.letra}` : ''}`, fonte: it.fonteDado,
    });
  }
  const tampas = rack.ocupacao.filter(x => x.tipo === 'tampa');
  if (tampas.length) comps.push({ tag: 'TC', descricao: 'Tampa cega 1U 19"', fabricante: 'a definir', referencia: '', medidas: '19" × 1U', quantidade: tampas.length, unidade: 'un', local: `${rack.id} · U${faixas(tampas.map(t => t.uTopo))}`, fonte: 'padrão EIA-310' });
  return comps;
}

// [12, 11, 10, 5] → "10–12, 5"
function faixas(us) {
  const s = [...us].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(i === j ? `${s[i]}` : `${s[i]}–${s[j]}`);
    i = j;
  }
  return out.reverse().join(', ');
}

function caracteristicasRack(rack) {
  return [
    ['Identificação / local', [rack.id, rack.local].filter(Boolean).join(' — ')],
    ['Tipo', `Rack ${rack.tipo === 'piso' ? 'de piso' : 'de parede'} fechado 19" (EIA/ECA-310-E)`],
    ['Altura útil', `${rack.alturaU}U = ${br(rack.alturaUtilMm, 1)} mm`],
    ['Dimensões externas (L × P × A)', `${br(rack.larguraExt)} × ${br(rack.profundidade)} × ${br(rack.alturaExtMm)} mm [CONFERIR modelo]`],
    ['Profundidade útil', `${br(rack.profUtil)} mm do trilho frontal; item mais fundo ${br(rack.profMax)} mm`],
    ['Ocupação', `${rack.uOcupados}U ocupados, ${rack.uLivres}U livres (tampas cegas)`],
    ['Potência / dissipação', `${br(rack.potencia)} W / ${br(rack.dissipacao)} W (${br(rack.dissipacao * 3.412)} BTU/h)`],
    ['PDU', `${rack.nPdu} × ${rack.tomadasPdu} tomadas NBR 14136 ${rack.correntePdu} A, ${rack.tensao} V — ${rack.tomadasNec} em uso`],
    ['Ventilação', rack.ventiladores ? `${rack.ventiladores} ventilador(es) no teto (≈ ${br(rack.vazao)} m³/h)` : 'natural (sem equipamento ativo)'],
    ['Massa montada (estimada)', `${br(rack.massa)} kg (rack ≈ ${br(rack.massaRack)} kg)`],
    ['Aterramento', `barra do rack → ${br(rack.secaoTerra)} mm² verde-amarelo → TGB/BEP`],
  ];
}

function verificacoesRack(rack, extras = []) {
  return [
    { item: 'Ocupação', criterio: `itens nas posições da elevação (${rack.uOcupados}U ocupados de ${rack.alturaU}U), tampas cegas em todos os U livres`, norma: 'EIA/ECA-310-E' },
    { item: 'Fixação', criterio: 'todos os furos previstos com porca gaiola + parafuso M6 + arruela; itens pesados com suporte traseiro; rack nivelado/prumado (piso) ou fixado nos 4 pontos (parede)', norma: 'EIA/ECA-310-E' },
    { item: 'Aterramento — continuidade', criterio: 'continuidade entre portas, laterais, equipamentos e a barra do rack, e da barra ao TGB/BEP, medida com ohmímetro de baixa resistência; referência ≤ 0,1 Ω [CONFERIR critério do projeto]', norma: 'ANSI/TIA-607-D · NBR 5410 (6.4 e 7.3.2)' },
    { item: 'PDU — carga e tomadas', criterio: `corrente medida ≤ 80 % da nominal da PDU (${rack.correntePdu} A) e do circuito; tensão ${rack.tensao} V; polaridade e terra das tomadas conferidas com testador`, norma: 'NBR 5410 · NBR 14136' },
    { item: 'Identificação', criterio: 'rack, painéis, portas, equipamentos e cabos (nas duas pontas) identificados conforme o esquema da plaqueta LEG-606; planilha de portas entregue', norma: 'ANSI/TIA-606-C' },
    { item: 'Organização de cabos', criterio: 'raio de curvatura ≥ 4 × diâmetro do cabo UTP; velcro sem esmagar; nenhuma abraçadeira de nylon apertada sobre cabos de dados', norma: 'NBR 14565 · ANSI/TIA-568.2-D' },
    { item: 'Ventilação', criterio: rack.ventiladores ? 'ventiladores girando, fluxo de ar de baixo/frente para cima/trás, passa-cabos com escova instalados' : 'aberturas de ventilação desobstruídas', norma: 'boa prática (ANSI/TIA-569-E)' },
    { item: 'Plaquetas e chaves', criterio: 'plaquetas ID-RACK, ADV-ENERGIA, ADV-TERRA, LEG-606 e a plaqueta H&M fixadas; portas trancando; 2 jogos de chaves entregues', norma: 'ANSI/TIA-606-C · NR-10 10.10' },
    ...extras,
  ];
}

// Escala que o motor do caderno vai escolher para o svg (mesma regra), para as
// letras do desenho crescerem junto e saírem legíveis no papel
function escalaPrevista(svg, notas) {
  const { escolherEscala } = require('./caderno');
  const m = String(svg).match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return escolherEscala(Number(m[1]), Number(m[2]), { notas }).esc;
}

// opts = { modeloHm, normaHm, data, verificacoesExtra }
function partesDoRack(rack, opts = {}) {
  const { plaquetas, plaqueta_hm } = plaquetasRack(rack, opts);
  const vistas = [
    { titulo: `${rack.id} — Elevação frontal`, gerar: (k) => elevacaoSvg(rack, 'frente', k), notas: ['U numerado de baixo para cima (U1 na base); pontos pretos = parafuso M6 + porca gaiola (2 por lado por U); painéis A, B, C… de cima para baixo.'] },
    { titulo: `${rack.id} — Elevação traseira`, gerar: (k) => elevacaoSvg(rack, 'tras', k), notas: [`Vista por trás (espelhada). Jumpers 4 mm² dos equipamentos à barra do rack; barra → TGB/BEP em ${br(rack.secaoTerra)} mm² verde-amarelo.`] },
    { titulo: `${rack.id} — Vista lateral (profundidade)`, gerar: (k) => lateralSvg(rack, k), notas: [`Profundidade útil ${br(rack.profUtil)} mm do trilho frontal, com ${FOLGA_CABOS_MM} mm atrás do item mais fundo para plugues e curvatura dos cabos; item em vermelho não cabe.`] },
  ];
  // mesma escala nas três vistas do rack (a maior entre elas)
  const k = Math.max(...vistas.map(v => escalaPrevista(v.gerar(10), v.notas)));
  const desenhos = vistas.map(v => ({ titulo: v.titulo, svg: v.gerar(k), escala: `1:${k}`, notas: v.notas }));
  return {
    caracteristicas: caracteristicasRack(rack),
    desenhos,
    componentes: componentesRack(rack),
    materiais_montagem: materiaisMontagem(rack),
    plaquetas,
    plaqueta_hm,
    ocupacao: ocupacaoTabela(rack),
    verificacoes: verificacoesRack(rack, opts.verificacoesExtra || []),
    avisos: rack.avisos,
  };
}

function secaoIdentificacao(racks) {
  const linhas = [];
  for (const r of racks) {
    const base = `${r.espaco606}.${r.rack606}`;
    linhas.push([r.id, 'Espaço de telecomunicações', r.espaco606, r.local || '—']);
    linhas.push([r.id, 'Rack', base, 'plaqueta ID-RACK nas portas']);
    for (const it of r.ocupacao.filter(x => x.letra)) {
      const n = Number(it.portas) || 24;
      linhas.push([r.id, `${it.tag} — ${it.tipo === 'dio' ? 'DIO' : 'patch panel'} (U${it.uTopo})`, `${base}-${it.letra}`, `portas ${base}-${it.letra}:01 a ${base}-${it.letra}:${String(n).padStart(2, '0')}`]);
    }
  }
  return {
    titulo: 'Identificação — esquema ANSI/TIA-606-C',
    paragrafos: [
      'Formato adotado: espaço.rack-painel:porta (fs.xy-r:p da TIA-606-C) — espaço = pavimento + letra da sala; rack = R + número; painel = letra de cima para baixo; porta = 2 dígitos. [CONFERIR com o esquema do cliente, se houver]',
      'O mesmo identificador vai na porta do patch panel, nas duas extremidades do cabo horizontal (etiqueta autolaminada a ≈ 10 cm do conector) e na tomada da área de trabalho. Equipamentos ativos recebem etiqueta com a tag (SW-1, NVR-1…). A planilha de portas fica no porta-documentos do rack.',
    ],
    tabela: { colunas: ['Rack', 'Elemento', 'Identificador', 'Uso / faixa'], linhas, proporcoes: [0.8, 1.8, 1.2, 2.4] },
  };
}

const SEQUENCIA_MONTAGEM = [
  'Conferir o rack recebido (U, profundidade, portas, chaves) com este caderno; instalar pés niveladores ou fixar na parede (4 pontos, nível e prumo).',
  'Instalar a barra de aterramento e os jumpers das portas, laterais e teto; lançar o condutor verde-amarelo até o TGB/BEP.',
  'Encaixar as porcas gaiola nas posições da elevação (furos 1 e 3 de cada U) e montar os itens de cima para baixo; itens pesados com suporte traseiro.',
  'Instalar organizadores, guias verticais, bandeja, PDU e kit de ventilação; tampas cegas em todos os U livres.',
  'Terminar os cabos horizontais nos patch panels (T568A ou T568B, o mesmo em toda a obra), amarrar na barra de apoio com velcro e respeitar o raio de curvatura.',
  'Identificar painéis, portas, cabos (nas duas pontas) e equipamentos; fixar as plaquetas e a plaqueta H&M.',
  'Ligar a PDU, medir a corrente e conferir tomadas; certificar/testar os enlaces e preencher o checklist de verificações.',
];

// Vários racks num só caderno: cada rack com as suas 3 vistas, os seus grupos de
// material e o seu checklist (prefixados com a id); características e
// identificação resumidas por rack. opts = { dados, sigla, titulo, subtitulo,
// tag, revisao, data, normas, modeloHm, normaHm, verificacoesExtra, secoes, avisos }
function cadernoDeRacks(racks, opts = {}) {
  const lista = Array.isArray(racks) ? racks : [racks];
  const dados = opts.dados || {};
  const data = opts.data || (dados.meta?.data ? String(dados.meta.data).slice(0, 10).split('-').reverse().join('/') : '');
  const partes = lista.map(r => ({ rack: r, ...partesDoRack(r, { ...opts, data }) }));
  const varios = lista.length > 1;
  const pref = (r, t) => (varios ? `${r.id} · ${t}` : t);
  const caracteristicas = varios
    ? [['Racks', String(lista.length)], ...partes.map(p => [`${p.rack.id}${p.rack.local ? ` — ${p.rack.local}` : ''}`, `${p.rack.tipo === 'piso' ? 'piso' : 'parede'} ${p.rack.alturaU}U × ${p.rack.profundidade} mm · ${p.rack.uOcupados}U ocupados · PDU ${p.rack.tomadasPdu} tom. ${p.rack.correntePdu} A ${p.rack.tensao} V · ≈ ${br(p.rack.massa)} kg`])]
    : partes[0].caracteristicas;
  // plaquetas: as de cada rack agrupadas pela id; a H&M do 1º rack é desenhada e as dos demais entram na lista com os dados
  const plaquetas = [];
  for (const p of partes) {
    for (const pl of p.plaquetas) plaquetas.push({ ...pl, tag: varios ? `${pl.tag} ${p.rack.id}` : pl.tag, grupo: varios ? `Plaquetas — ${p.rack.id}` : undefined });
  }
  const secoes = [
    ...partes.map(p => ({
      titulo: `${p.rack.id} — características e ocupação por U`,
      paragrafos: p.caracteristicas.map(([k, v]) => `${k}: ${v}`),
      tabela: p.ocupacao,
    })),
    secaoIdentificacao(lista),
    { titulo: 'Sequência de montagem', marcadores: SEQUENCIA_MONTAGEM },
    ...(opts.secoes || []),
  ];
  return {
    tipo: 'rack',
    sigla: opts.sigla || 'CAD-RK',
    titulo: opts.titulo || 'CADERNO DE FABRICAÇÃO E MONTAGEM',
    subtitulo: opts.subtitulo || (varios ? `${lista.length} racks 19" — ${lista.map(r => r.id).join(', ')}` : `${lista[0].id} — rack 19" ${lista[0].alturaU}U`),
    tag: opts.tag || (varios ? `${lista[0].id}…${lista[lista.length - 1].id}` : lista[0].id),
    revisao: opts.revisao || String(dados.meta?.revisao || 'R00').split(' ')[0],
    data,
    dados,
    normas: opts.normas || NORMAS_RACK,
    caracteristicas,
    desenhos: partes.flatMap(p => p.desenhos),
    componentes: partes.flatMap(p => p.componentes),
    materiais_montagem: partes.flatMap(p => p.materiais_montagem.map(m => ({ ...m, grupo: pref(p.rack, m.grupo) }))),
    plaquetas,
    plaqueta_hm: partes[0].plaqueta_hm,
    plaquetas_hm: partes.map(p => p.plaqueta_hm),
    secoes,
    verificacoes: partes.flatMap(p => p.verificacoes.map(v => ({ ...v, item: pref(p.rack, v.item) }))),
    avisos: [...partes.flatMap(p => p.avisos), ...(opts.avisos || []),
      ...(lista.some(r => r.secaoTerra < 16) ? ['Condutor do rack ao TGB/BEP informado abaixo do mínimo; a ANSI/TIA-607-D pede no mínimo 6 AWG (≈ 16 mm²) — confirmar a seção com o projeto de aterramento/SPDA da edificação. [CONFERIR]'] : []),
      'Medidas, massas e consumos dos ativos são típicos de mercado — conferir com a ficha técnica dos modelos comprados antes da montagem. [CONFERIR]'],
  };
}

// Autoconferência do rack (usada nos testes das skills): cada chave true = ok
function conferirRack(rack) {
  const occ = rack.ocupacao;
  const itens = occ.filter(it => it.tipo !== 'tampa');
  const usos = Array(rack.alturaU + 1).fill(0);
  for (const it of occ) for (let u = it.uBase; u <= it.uTopo; u++) if (u >= 1 && u <= rack.alturaU) usos[u]++;
  const frente = elevacaoSvg(rack, 'frente');
  const comps = componentesRack(rack);
  const mats = materiaisMontagem(rack);
  const qtd = (re) => (mats.find(m => re.test(m.descricao)) || {}).quantidade;
  const uFix = itens.reduce((a, it) => a + it.u, 0);
  const nTampas = occ.length - itens.length;
  const fixacao = RESERVA(uFix * 4 + nTampas * 2);
  const { plaquetas, plaqueta_hm } = plaquetasRack(rack);
  const tags = plaquetas.map(p => p.tag);
  return {
    somaU: uFix <= rack.alturaU && occ.reduce((a, it) => a + it.u, 0) === rack.alturaU,
    cadaUUmaVez: usos.slice(1).every(n => n === 1),
    itensNaElevacao: itens.every(it => frente.includes(`>${esc(it.tag)}`) || frente.includes(`>${esc(it.tag)} `)),
    itensNosComponentes: itens.every(it => comps.some(c => c.tag === it.tag && c.local.startsWith(rack.id))) && (!nTampas || comps.some(c => c.tag === 'TC' && c.quantidade === nTampas)),
    regraPorcas: [qtd(/^Porca gaiola M6/), qtd(/^Parafuso M6/), qtd(/^Arruela plástica/)].every(q => q === fixacao),
    aterramento: mats.some(m => m.grupo === 'Aterramento' && /verde-amarelo/.test(m.descricao) && /TGB\/BEP/.test(m.descricao))
      && mats.some(m => m.grupo === 'Aterramento' && /^Barra de aterramento/.test(m.descricao))
      && mats.some(m => /Jumper de aterramento .*portas/.test(m.descricao)),
    plaquetas: ['ID-RACK', 'ADV-ENERGIA', 'ADV-TERRA', 'LEG-606'].every(t => tags.includes(t)),
    plaquetaHm: /H&M/.test(plaqueta_hm.modelo) && plaqueta_hm.dados.some(([k, v]) => k === 'Norma' && v) && plaqueta_hm.dados.some(([k]) => k === 'PDU'),
  };
}

module.exports = {
  U_MM, LARGURA_19_MM, VAO_TRILHOS_MM, FUROS_ENTRE_MM, FUROS_U_MM, ALTURAS, PROFUNDIDADES, TIPICOS, NORMAS_RACK,
  dimensionarRack, elevacaoSvg, lateralSvg, materiaisMontagem, plaquetasRack, componentesRack, caracteristicasRack,
  verificacoesRack, ocupacaoTabela, partesDoRack, cadernoDeRacks, conferirRack, faixas,
};
