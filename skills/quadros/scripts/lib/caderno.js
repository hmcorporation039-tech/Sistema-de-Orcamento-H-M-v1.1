// Caderno de fabricação e montagem do quadro (PDF) — adaptador da skill de
// quadros para o motor comum skills/_comum/fabricacao (contrato no cabeçalho de
// _comum/fabricacao/caderno.js). Vale para TODO tipo de quadro que a skill
// projeta: distribuição (QD/QGBT), CCM/partidas, automação (CLP) e comando de
// máquina.
//
// Tudo sai do cálculo (./calculo.js): as vistas usam a MESMA geometria do DXF
// (./vistas.js) e do 3D (./porta.js, ./layout.js); componentes e medidas vêm
// do catálogo do fabricante quando há registro (senão medida típica
// [CONFERIR]); os materiais de montagem vão "da caixa aos parafusos", cada um
// com a regra que deu a quantidade. Valores típicos (torques, parafusos,
// prensa-cabos, massa) são marcados [CONFERIR].

const CAD = require('../../../_comum/fabricacao/caderno');
const { criarPincelSvg } = require('../../../_comum/fabricacao/svg');
const { ajustarTexto } = require('../../../_comum/fabricacao/plaquetas');
const { fmtNum } = require('../../../_comum/docx-base');
const T = require('./tabelas');
const { vistaFrontal, vistaLateral, vistaInterna, cota } = require('./vistas');
const { posicoesPorta } = require('./porta');
const { catalogoInfra } = require('./modelo3d');
const { tcNasBarras } = require('./layout');

const num = (v, c = 0) => fmtNum(v, c);
const n1 = (v) => num(v, 1);
const mm3 = (l, h, p) => `${n1(l)} × ${n1(h)} × ${p == null ? '—' : n1(p)}`;
const sec = (s) => `${String(s).replace('.', ',')} mm²`;
const limpaDesc = (d) => String(d || '').replace(/ — circ\. [^—]*/, '').replace(/ — circuitos [^—]*/, '').trim();
const PREFIXO_MODELO = { distribuicao: 'QD', automacao: 'QCA', ccm: 'CCM', comando: 'QCM' };

// ── Padrões H&M adotados (contrato do caderno; o usuário pode mudar no formulário) ──
const PLAQ = {
  comando: { material: 'Acrílico 2 mm preto, letra branca gravada a laser', fundo: '#111', letra: '#fff', fixacao: 'Fita dupla face acrílica (VHB) 12 mm' },
  emergencia: { material: 'Acrílico 2 mm amarelo, letra preta gravada a laser', fundo: '#f2c94c', letra: '#111', fixacao: 'Fita dupla face acrílica (VHB) 12 mm' },
  advertencia: { material: 'Adesivo vinílico amarelo com impressão preta, proteção UV', fundo: '#f2c94c', letra: '#111', fixacao: 'Autoadesivo' },
  etiqueta: { material: 'Etiqueta de poliéster impressa (impressora térmica), letra preta em fundo branco', fundo: '#fff', letra: '#111', fixacao: 'Autoadesiva, no dispositivo e na placa logo acima dele' },
  hm: { material: 'Alumínio anodizado 1 mm gravado (laser/serigrafia)', fixacao: '4 rebites de alumínio Ø 3,2 mm (furo Ø 3,3 mm)' },
};
const BOTAO_PLAQ = { l: 60, a: 18 };

// DIN 43673-1 (furação de barras) e torques típicos para parafuso classe 8.8 com arruela
// [CONFERIR com o fabricante do isolador/barra e com o manual dos dispositivos]
function parafusoBarra(l) {
  if (l <= 12) return { d: 5, n: 1, furo: 5.5, torque: 6 };
  if (l <= 15) return { d: 6, n: 1, furo: 6.6, torque: 10 };
  if (l <= 20) return { d: 8, n: 1, furo: 9, torque: 20 };
  if (l <= 30) return { d: 10, n: 1, furo: 11, torque: 40 };
  if (l <= 60) return { d: 12, n: 2, furo: 13.5, torque: 70 };
  return { d: 12, n: 4, furo: 13.5, torque: 70 };
}
const TORQUE_88 = [[5, 6], [6, 10], [8, 20], [10, 40], [12, 70], [16, 160]];
// comprimento comercial do parafuso: 2 barras + 2 arruelas lisas + 1 de pressão + porca + 2 fios
function comprimentoParafuso(d, espessuraPacote) {
  const L = espessuraPacote + 2 * 2 + 0.3 * d + 0.8 * d + 2 * 1.5;
  return [12, 16, 20, 25, 30, 35, 40, 45, 50, 60].find(x => x >= L) || 70;
}

// Diâmetro externo aproximado de cabo multipolar 0,6/1 kV (n condutores de seção s) e prensa-cabos
const FATOR_MULTIPOLAR = { 1: 1, 2: 2.0, 3: 2.16, 4: 2.42, 5: 2.7, 6: 3.0, 7: 3.0 };
const PRENSA = [['M16', 4.5, 10], ['M20', 6, 12], ['M25', 9, 17], ['M32', 13, 21], ['M40', 19, 28], ['M50', 27, 35], ['M63', 34, 45]];
const diametroCabo = (n, s) => (FATOR_MULTIPOLAR[n] || 3.2) * (T.DIAMETRO_FIO[s] || T.DIAMETRO_FIO[120]) + (n > 1 ? 2 * 1.8 : 1.6);
const prensaPara = (d) => PRENSA.find(([, , max]) => max >= d) || PRENSA[PRENSA.length - 1];

// Ponteiras (DIN 46228-4, cor por seção — padrão europeu) [CONFERIR fabricante]
const COR_PONTEIRA = { 0.5: 'branca', 0.75: 'cinza', 1: 'vermelha', 1.5: 'preta', 2.5: 'azul', 4: 'cinza', 6: 'amarela', 10: 'vermelha', 16: 'azul', 25: 'amarela', 35: 'vermelha' };

// ── Onde está cada componente ───────────────────────────────────────────────

function locais(calc) {
  const { layout } = calc;
  const m = new Map();
  layout.fileiras.forEach((f, i) => {
    const zona = f.zonas.map(z => layout.rotuloZona[z] || z).join(' / ');
    for (const k of f.itens) {
      if (k.tipo === 'reserva' || m.has(k.ref)) continue;
      m.set(k.ref, `Placa, fileira ${i + 1} (${zona})${f.trilho ? ', trilho DIN' : ', fixo na placa'}`);
    }
  });
  for (const t of tcNasBarras(calc)) m.set(t.ref, `Barramento, na barra L${t.fase + 1} após a chegada do geral`);
  return m;
}

const fonteDe = (m) => {
  if (m && m.origem === 'catalogo') return `${m.fonte_documento || `catálogo ${m.fabricante}`}${m.fonte_url ? ` — ${m.fonte_url}` : ''}${m.verificado ? '' : ' [CONFERIR — não verificada no documento oficial]'}`;
  if (m && m.origem === 'parcial') return 'parte catálogo, parte típica [CONFERIR]';
  return 'medida típica de catálogo [CONFERIR]';
};
const fabDe = (m) => (m && m.origem === 'catalogo' ? m.fabricante : (m && m.fabricante ? `${m.fabricante} (sem registro)` : '—'));
const refDe = (m) => (m && m.origem === 'catalogo' ? `${m.referencia}${m.linha ? ` (${m.linha})` : ''}` : (m && m.referencia) || '—');

// ── Plaquetas da porta (texto da função do comando) ─────────────────────────

const PADRAO_TEXTO = { emergencia: 'EMERGÊNCIA', liga: 'LIGA', desliga: 'DESLIGA', reset: 'REARME', seletor: 'MAN - 0 - AUT', sinaleiro_verde: 'EM OPERAÇÃO', sinaleiro_amarelo: 'ALARME', sinaleiro_vermelho: 'FALHA', sinaleiro_branco: 'ENERGIZADO', potenciometro: 'REFERÊNCIA' };

// quebra em até 2 linhas de ~16 caracteres (palavra inteira)
function quebrar(t, max = 16) {
  const s = String(t || '').trim().toUpperCase();
  if (s.length <= max) return [s];
  const pal = s.split(/\s+/);
  let a = '';
  while (pal.length && (a ? `${a} ${pal[0]}` : pal[0]).length <= max) a = a ? `${a} ${pal.shift()}` : pal.shift();
  return [a || s.slice(0, max), pal.join(' ')].filter(Boolean);
}

function plaquetasPorta(calc, PT) {
  const motoresTags = calc.motores.map(m => m.tag);
  const out = [];
  for (const b of PT.botoes) {
    const base = quebrar(b.funcao || PADRAO_TEXTO[b.tipo] || b.descricao);
    // várias unidades da mesma função: uma por motor quando a contagem bate, senão numeradas
    const extra = b.quantidade > 1 ? (b.quantidade === motoresTags.length ? motoresTags[b.indice] : `Nº ${b.indice + 1}`) : null;
    const texto = [...base.slice(0, extra ? 1 : 2), ...(extra ? [extra] : [])];
    const pad = b.tipo === 'emergencia' ? PLAQ.emergencia : PLAQ.comando;
    out.push({ tag: b.tag, texto, largura_mm: BOTAO_PLAQ.l, altura_mm: BOTAO_PLAQ.a, ...pad, local: `Porta, logo abaixo de ${b.tag} (${b.descricao})`, quantidade: 1, grupo: 'Porta — comando e sinalização', alvo: { tipo: 'botao', b } });
  }
  for (const m of PT.medidores) out.push({ tag: m.ref, texto: ['MEDIÇÃO DE ENERGIA'], largura_mm: 60, altura_mm: 14, ...PLAQ.comando, local: `Porta, abaixo do multimedidor ${m.ref}`, quantidade: 1, grupo: 'Porta — comando e sinalização', alvo: { tipo: 'retangulo', x: m.x + m.l / 2, y: m.y } });
  if (PT.ihm) out.push({ tag: 'IHM1', texto: ['IHM — OPERAÇÃO'], largura_mm: 70, altura_mm: 14, ...PLAQ.comando, local: 'Porta, abaixo da IHM', quantidade: 1, grupo: 'Porta — comando e sinalização', alvo: { tipo: 'retangulo', x: PT.ihm.x + PT.ihm.l / 2, y: PT.ihm.y } });
  PT.grelhas.forEach((g, i) => {
    const fan = /VENTILADOR/i.test(g.rotulo);
    out.push({ tag: fan ? 'EV1' : 'EV2', texto: [fan ? 'SAÍDA DE AR' : 'ENTRADA DE AR', fan ? 'VENTILADOR' : 'FILTRO'], largura_mm: 60, altura_mm: 14, ...PLAQ.comando, local: `Porta, abaixo da grelha de ${fan ? 'saída (ventilador)' : 'entrada (filtro)'}`, quantidade: 1, grupo: 'Porta — comando e sinalização', alvo: { tipo: 'retangulo', x: g.x + g.l / 2, y: g.y }, ordem: i });
  });
  return out;
}

// Posição livre na porta (retângulo l × a), de baixo para cima e da esquerda para a direita,
// longe dos itens já desenhados — para a plaqueta H&M e a advertência escrita
function lugarLivre(W, H, ocupados, l, a, folga = 8) {
  const colide = (x, y) => ocupados.some(o => x < o.x + o.l + folga && x + l + folga > o.x && y < o.y + o.a + folga && y + a + folga > o.y);
  for (let y = 30; y + a <= H - 30; y += 5) for (let x = 30; x + l <= W - 60; x += 5) if (!colide(x, y)) return { x, y, l, a };
  return null;
}

// ── Desenhos ────────────────────────────────────────────────────────────────

// Desenha na escala em que o desenho cabe na página do caderno: as alturas de texto dependem
// da escala (P), então desenha, mede a caixa, escolhe a escala e redesenha até estabilizar
function naEscala(desenhar, { notas = [], legenda = 0, margem = 3 } = {}) {
  let p = null, esc = null;
  // da maior escala para a menor: a primeira em que o desenho (com os textos daquela escala) cabe
  for (esc of CAD.ESCALAS) {
    p = desenhar(esc);
    const cx = p.caixa();
    const r = CAD.escolherEscala((cx.x1 - cx.x0) + 2 * margem * esc, (cx.y1 - cx.y0) + 2 * margem * esc, { notas, legenda, preferida: esc });
    if (r.esc === esc) break;
  }
  return { svg: p.svg({ margem: margem * esc }).svg, escala: `1:${esc}`, esc };
}

function desenharPlaquetaNoLugar(p, P, pl, x, yTopo) {
  const l = pl.largura_mm, a = pl.altura_mm;
  p.retCor(x, yTopo - a, l, a, { fundo: pl.fundo, cor: '#444', pena: 0.1, raio: 1 });
  const aj = ajustarTexto(pl.texto, l, a, { margem: 1.5 });
  const passo = aj.h * 1.45;
  aj.linhas.forEach((t, i) => p.txt(x + l / 2, yTopo - a / 2 + ((aj.linhas.length - 1) / 2 - i) * passo, aj.h, t, { alinhar: 'centro', cor: pl.letra, negrito: true }));
}

function desenhoFrontal(calc, ctx) {
  const { layout } = calc;
  const env = layout.involucro;
  const W = env.largura, H = env.altura, D = env.profundidade;
  const notas = [
    `Porta fechada; plaquetas desenhadas no lugar (texto e medida na folha de plaquetas 1:1); tag de cada comando no centro dele. Furação na tabela "Furação e recortes"; manter a vedação do ${calc.inv.ip}.`,
    `Lateral: placa a 15 mm do fundo; peça mais funda ${num(ctx.profPecas)} mm + folga ≥ ${T.FOLGA_PORTA} mm${ctx.profPorta ? `; porta entra ${num(ctx.profPorta)} mm (tracejado)` : ''}. Plaqueta H&M ${ctx.hm.lugar ? 'na face externa da porta' : 'na face INTERNA da porta'}; advertência ISO 7010 W012 + "PERIGO — RISCO DE CHOQUE ELÉTRICO" (NR-10, 10.10).`,
  ];
  const xL = W + 110;
  const r = naEscala((esc) => {
    const P = (v) => v * esc;
    const p = criarPincelSvg({ escala: esc });
    const PT = vistaFrontal(p, calc, 0, 0, P, { rotulos: false });
    // identificação externa (preta, letra branca) por cima do contorno da placa
    desenharPlaquetaNoLugar(p, P, ctx.plaquetaId, PT.placa.x, PT.placa.y + PT.placa.a);
    // advertência: triângulo amarelo com raio
    const tri = PT.aviso.l;
    p.poli([[PT.aviso.x, PT.aviso.y], [PT.aviso.x + tri, PT.aviso.y], [PT.aviso.x + tri / 2, PT.aviso.y + tri * 0.87]], { cor: '#111', fundo: '#f2c94c', pena: 0.25 }, true);
    const cx = PT.aviso.x + tri / 2, cy = PT.aviso.y + tri * 0.36;
    p.poli([[cx + 2, cy + 9], [cx - 4, cy - 1], [cx, cy - 1], [cx - 2, cy - 9], [cx + 5, cy + 2], [cx + 1, cy + 2]], { cor: '#111', fundo: '#111', pena: 0.05 }, true);
    // plaquetas de cada comando, logo abaixo; tag acima
    const hTag = Math.min(P(1.5), 9);
    for (const pl of ctx.plaquetasPorta) {
      const a = pl.alvo;
      if (a.tipo === 'botao') {
        const rr = a.b.tipo === 'emergencia' ? 34 : a.b.d / 2 + 7;
        desenharPlaquetaNoLugar(p, P, pl, a.b.cx - pl.largura_mm / 2, a.b.cy - rr);
        p.txt(a.b.cx, a.b.cy, Math.min(hTag, a.b.d * 0.28), pl.tag, { alinhar: 'centro', cor: '#1f5fa8', negrito: true }); // tag no centro do botão
      } else {
        desenharPlaquetaNoLugar(p, P, pl, a.x - pl.largura_mm / 2, a.y - 4);
      }
    }
    // plaqueta H&M e advertência escrita, no lugar livre
    if (ctx.hm.lugar) {
      const { x, y, l, a } = ctx.hm.lugar;
      p.retCor(x, y, l, a, { fundo: '#d5d9de', cor: '#555', pena: 0.15, raio: 2 });
      [[4, 4], [l - 4, 4], [4, a - 4], [l - 4, a - 4]].forEach(([fx, fy]) => p.circ(x + fx, y + fy, 1.75, { cor: '#555', fundo: '#fff', pena: 0.08 }));
      const cabe = (t, neg) => Math.min(a * 0.09, (l - 8) / (t.length * (neg ? 0.95 : 0.8)));
      [['H&M ENGENHARIA E TECNOLOGIA', 0.7, true], [ctx.plaquetaHm.modelo, 0.46, false], ['DADOS NOMINAIS: FOLHA DE PLAQUETAS', 0.24, false]]
        .forEach(([t, fy, neg]) => p.txt(x + l / 2, y + a * fy, cabe(t, neg), t, { alinhar: 'centro', negrito: neg }));
    }
    if (ctx.avisoTexto.lugar) desenharPlaquetaNoLugar(p, P, ctx.avisoTexto.plaqueta, ctx.avisoTexto.lugar.x, ctx.avisoTexto.lugar.y + ctx.avisoTexto.lugar.a);
    // ── vista lateral ao lado (mesma escala)
    vistaLateral(p, calc, xL, 0, P);
    const placaTopo = H - (H - layout.placa.altura) / 2;
    const xPlaca = xL + 15 + 2.5; // frente da placa de montagem
    for (const f of layout.fileiras) {
      const prof = Math.max(...f.itens.map(k => k.prof || T.DIN_PROF));
      if (prof > 0) p.ret(xPlaca, placaTopo - f.y - f.altura, Math.min(prof, D - 40), f.altura, 'QD-COMPONENTE');
    }
    // dispositivos de porta (corpo para dentro, tracejado)
    const portaInt = xL + D - 20;
    for (const b of PT.botoes) p.ret(portaInt - 50, b.cy - 15, 50, 30, 'QD-OCULTA');
    for (const m of PT.medidores) p.ret(portaInt - (m.p || 65), m.y, m.p || 65, m.a, 'QD-OCULTA');
    if (PT.ihm) p.ret(portaInt - 50, PT.ihm.y, 50, PT.ihm.a, 'QD-OCULTA');
    p.txt(xPlaca + 4, placaTopo + Math.min(P(1.2), 10) + 4, Math.min(P(1.2), 10), `PLACA ${layout.placa.altura} × ${layout.placa.largura}`, { cor: '#555' });
    cota(p, xPlaca, H * 0.08, xPlaca + ctx.profPecas, H * 0.08, `${num(ctx.profPecas)}`, P(1.6), { lado: 1 });
    // títulos centrados sobre cada vista
    p.txt(W / 2, H + P(4), P(2.2), 'VISTA FRONTAL', { alinhar: 'centro', negrito: true });
    p.txt(xL + D / 2, H + P(4), P(2.2), 'VISTA LATERAL', { alinhar: 'centro', negrito: true });
    return p;
  }, { notas });
  return { titulo: 'Vista frontal externa (porta fechada) e vista lateral', svg: r.svg, escala: r.escala, notas };
}

function desenhoInterno(calc) {
  const { layout } = calc;
  const env = layout.involucro;
  const notas = [
    `Placa de montagem ${layout.placa.altura} × ${layout.placa.largura} mm, largura útil de trilho ${num(layout.larguraUtil)} mm; números à esquerda = passo entre fileiras (mm).`,
    `Canaletas: vertical esquerda ${layout.verticais.esquerda.largura}×${layout.verticais.esquerda.altura} (potência), vertical direita ${layout.verticais.direita.largura}×${layout.verticais.direita.altura}, horizontais sob cada fileira (medida à direita), ocupação ≤ ${T.OCUPACAO_CANALETA * 100} %.`,
    'Tags iguais ao unifilar e à lista de componentes; área tracejada = reserva. Conferir as medidas com os modelos comprados antes de furar a placa.',
  ];
  const r = naEscala((esc) => {
    const P = (v) => v * esc;
    const p = criarPincelSvg({ escala: esc });
    vistaInterna(p, calc, 0, 0, P);
    return p;
  }, { notas });
  return { titulo: 'Layout interno — placa de montagem', svg: r.svg, escala: r.escala, notas };
}

// Detalhe do barramento: vista frontal com isoladores e vãos, corte A-A e emenda (barras);
// pente (pente); e as barras N/PE com a furação. Mesmas medidas do cálculo (calc.barr) e do layout
function desenhoBarramento(calc, ctx) {
  const { c, barr: b, layout } = calc;
  const barrasNp = layout.fileiras.flatMap(f => f.itens).filter(k => k.tipo === 'barra_neutro' || k.tipo === 'barra_pe');
  const notas = [];
  if (b.tipo === 'barra' && b.fase) {
    notas.push(`Barras de cobre eletrolítico ${b.fase.l} × ${b.fase.e} mm (${b.secaoFase} mm²) ${c.barraPintada ? 'pintadas' : 'nuas'}, de face, ${c.entreFases} mm entre centros; isoladores a cada ${c.apoios} mm (${b.apoiosQtd} pontos por barra); Icw ${b.icw} kA/${c.tempoIcw} s.`,
      `Distâncias: partes vivas nuas ≥ 10 mm entre si e ≥ 20 mm até massas (NBR 5410, 6.5.4.2); distância de isolamento ≥ ${String(T.porFaixa(T.DISTANCIA_ISOLAMENTO, c.uimpKv)).replace('.', ',')} mm para Uimp ${c.uimpKv} kV (NBR IEC 61439-1, Tabela 1).`,
      'Identificar L1/L2/L3/N nas pontas e em cada derivação (NBR 5410, 6.1.5.3). Apertar com torquímetro e marcar com tinta (verificação de rotina 11.6).');
  } else notas.push(`Pente ${c.nFases}P ${b.pente.a} A (${b.pente.s} mm²) do fabricante dos disjuntores, ${Math.max(1, b.fileirasPente || 1)} fileira(s), cortado no comprimento da fileira (passo ${String(T.MODULO_NOMINAL_MM).replace('.', ',')} mm), encaixado nos bornes de entrada; tampas nos pinos livres (IPXXB); torque dos bornes conforme o disjuntor.`);
  notas.push(`Barra de terra ${b.pe.l} × ${b.pe.e} mm (Tabela 58 da NBR 5410), ligada à placa e à porta por cordoalha; barras N/PE com furação em duas fileiras, passo 10 mm.`);
  const r = naEscala((esc) => {
    const P = (v) => v * esc;
    const p = criarPincelSvg({ escala: esc });
    const hT = P(1.8), hC = P(1.5), hTit = P(2.2);
    let yBase;
    if (b.tipo === 'barra' && b.fase) {
      const L = layout.larguraUtil;
      const nB = b.nBarras;
      const rot = ['L1', 'L2', 'L3'].slice(0, c.nFases).concat(nB > c.nFases ? ['N'] : []);
      const larg = (i) => (rot[i] === 'N' && b.neutro ? b.neutro.l : b.fase.l);
      const nAp = b.apoiosQtd || Math.ceil(L / c.apoios) + 1;
      // (a) vista frontal: barras de face, isoladores a cada c.apoios
      p.txt(0, P(3), hTit, 'A) VISTA FRONTAL DO BARRAMENTO', { negrito: true });
      const y0 = -P(4);
      const yc = (i) => y0 - (i + 0.5) * c.entreFases;
      for (let i = 0; i < nB; i++) {
        p.ret(0, yc(i) - larg(i) / 2, L, larg(i), rot[i] === 'N' ? 'QD-NEUTRO' : 'QD-BARRAMENTO');
        p.txt(-5, yc(i), hT, rot[i], { alinhar: 'direita', negrito: true });
      }
      const passoAp = nAp > 1 ? (L - 30) / (nAp - 1) : 0;
      for (let a = 0; a < nAp; a++) for (let i = 0; i < nB; i++) { p.ret(a * passoAp, yc(i) - 15, 30, 30, 'QD-ISOLADOR'); p.circ(a * passoAp + 15, yc(i), 4.5, '0'); }
      const yFim = y0 - nB * c.entreFases;
      cota(p, 0, yFim - 6, L, yFim - 6, `${num(L)}`, hC, { lado: -1 });
      if (nAp > 1) cota(p, 15, y0 + 4, 15 + passoAp, y0 + 4, `${num(passoAp)} (vão ≤ ${c.apoios})`, hC, { lado: 1 });
      cota(p, L + 8, yc(1), L + 8, yc(0), `${c.entreFases}`, hC, { lado: 1 });
      // (b) corte A-A: isoladores na placa, barra parafusada no topo
      const hIso = ctx.alturaIsolador;
      const yB = yFim - P(14); // B e C abaixo da vista A
      const xc = 40;
      p.txt(0, yB, hTit, 'B) CORTE A-A', { negrito: true });
      const dy = yB - P(4) - y0; // desloca o corte para baixo da vista A
      p.ret(xc - 3, yFim + dy - 10, 3, nB * c.entreFases + 10, 'QD-PAINEL');
      for (let i = 0; i < nB; i++) {
        p.ret(xc, (yc(i) + dy) - 12, hIso, 24, 'QD-ISOLADOR');
        p.ret(xc + hIso, (yc(i) + dy) - larg(i) / 2, b.fase.e, larg(i), rot[i] === 'N' ? 'QD-NEUTRO' : 'QD-BARRAMENTO');
        p.linha(xc + hIso - 12, (yc(i) + dy), xc + hIso + b.fase.e + 8, (yc(i) + dy), 'QD-OCULTA');
        p.txt(xc + hIso + b.fase.e + P(2), (yc(i) + dy), hC, `${rot[i]} ${larg(i)} × ${b.fase.e}`, {});
      }
      p.txt(xc - 6, yFim + dy - 4, hC, 'PLACA', { alinhar: 'direita' });
      cota(p, xc, yFim + dy - 6, xc + hIso, yFim + dy - 6, `h ${hIso}`, hC, { lado: -1 });
      // (c) emenda / derivação (vista de cima): barra + barra sobreposta, furos e o parafuso
      const xe = Math.max(xc + hIso + b.fase.e + P(24), L * 0.5);
      const lb = b.fase.l, sobre = Math.max(lb, 40);
      p.txt(xe, yB, hTit, 'C) EMENDA / DERIVAÇÃO', { negrito: true });
      const ye = yB - P(4) - 15;
      p.ret(xe, ye - lb, sobre + 40, lb, 'QD-BARRAMENTO');
      p.ret(xe + 40, ye - lb - 5, sobre + 40, lb, { cor: '#8a4b14', fundo: '#f0c48f', pena: 0.2 });
      const nf = ctx.parafuso.n;
      for (let k = 0; k < nf; k++) {
        const fx = xe + 40 + sobre / 2 + (nf > 1 ? (k % 2 ? 1 : -1) * sobre / 4 : 0);
        const fy = ye - lb / 2 - 2.5 + (nf > 2 ? (k < 2 ? 1 : -1) * lb / 4 : 0);
        p.circ(fx, fy, ctx.parafuso.furo / 2, '0');
      }
      cota(p, xe + 40, ye + 2, xe + 40 + sobre, ye + 2, `${sobre}`, hC, { lado: 1 });
      [`${nf} × M${ctx.parafuso.d} × ${ctx.compParafuso} classe 8.8`, `furo Ø ${String(ctx.parafuso.furo).replace('.', ',')} mm (DIN 43673-1)`, `torque ${ctx.parafuso.torque} N·m [CONFERIR]`, '2 arruelas lisas + 1 de pressão', 'contato limpo e escovado', `sobreposição ${sobre} mm`]
        .forEach((t, i) => p.txt(xe, ye - lb - 5 - P(4) - i * hC * 1.8, hC, t, {}));
      yBase = Math.min(yFim + dy - P(10), ye - lb - P(4) - 6 * hC * 1.8);
    } else {
      // pente
      const L = layout.larguraUtil;
      p.txt(0, P(3), hTit, `A) PENTE ${c.nFases}P ${b.pente.a} A`, { negrito: true });
      const y0 = -P(4);
      p.ret(0, y0 - 30, L, 30, 'QD-BARRAMENTO');
      for (let x = T.MODULO_MM / 2; x < L - 4; x += T.MODULO_MM) p.ret(x - 2, y0 - 42, 4, 12, 'QD-BARRAMENTO');
      p.ret(-26, y0 - 34, 24, 38, 'QD-COMPONENTE');
      p.txt(-14, y0 + 4 + hC, hC, 'ALIMENTAÇÃO', { alinhar: 'centro' });
      p.ret(L + 2, y0 - 32, 6, 34, 'QD-OCULTA');
      p.txt(L + 12, y0 - 15, hC, 'TAMPA FINAL', {});
      cota(p, 0, y0 - 46, L, y0 - 46, `${num(L)}`, hC, { lado: -1 });
      yBase = y0 - 46 - P(8);
    }
    // barras N e PE com furação (passo 10 mm, duas fileiras)
    let yb = yBase - P(4);
    p.txt(0, yb, hTit, `${b.tipo === 'barra' ? 'D' : 'B'}) BARRAS N E PE (FURAÇÃO)`, { negrito: true });
    yb -= P(3);
    for (const k of barrasNp) {
      yb -= 45;
      const pe = k.tipo === 'barra_pe';
      p.ret(0, yb, k.largura, 40, pe ? 'QD-PE' : 'QD-NEUTRO');
      let furos = 0;
      for (let xx = 15; xx < k.largura - 10; xx += 10) { p.circ(xx, yb + 13, 2.5, '0'); p.circ(xx, yb + 27, 2.5, '0'); furos += 2; }
      const sup = pe ? { cor: '#555', fundo: '#999', pena: 0.15 } : 'QD-ISOLADOR';
      p.ret(-22, yb + 5, 18, 30, sup);
      p.ret(k.largura + 4, yb + 5, 18, 30, sup);
      p.txt(k.largura + 28, yb + 20 + hC * 0.9, hC, `${pe ? `BARRA PE ${b.pe.l} × ${b.pe.e}` : 'BARRA N'} — ${furos} terminais`, { negrito: true });
      p.txt(k.largura + 28, yb + 20 - hC * 1.1, hC, `${pe ? 'direto na estrutura' : 'em 2 isoladores'}, 2 × M6`, {});
      cota(p, 0, yb - 3, k.largura, yb - 3, `${num(k.largura)}`, hC, { lado: -1 });
      yb -= P(5);
    }
    return p;
  }, { notas });
  return { titulo: b.tipo === 'barra' ? 'Detalhe do barramento (barras, isoladores, emendas, N e PE)' : 'Detalhe do barramento (pente, barras N e PE)', svg: r.svg, escala: r.escala, notas };
}

// Réguas de bornes: um borne por posição, na ordem, com número, cor (N azul, PE verde-amarelo),
// batentes, tampas finais e reserva — quebra a régua a cada ~360 mm para caber na folha
function desenhoBornes(calc) {
  if (!calc.born.length) return null;
  const legenda = [];
  calc.born.forEach(g => {
    legenda.push([`Régua ${g.id}`, g.funcao]);
    g.itens.forEach((it, gi) => legenda.push([`${g.id}.${gi + 1}`, `${/^\d+$/.test(String(it.circuito)) ? `circ. ${it.circuito}` : it.circuito} — ${it.quantidade} × ${sec(it.secao)}${it.pe ? ` + ${it.pe} PE` : ''}`]));
    if (g.reserva) legenda.push([`${g.id} R`, `${g.reserva} bornes de reserva (${Math.round(calc.c.reservaPct * 100)} %)`]);
  });
  const notas = ['Vista de frente das réguas: número do borne acima; azul-claro = neutro, verde-amarelo = PE (borne terra ligado ao trilho), tracejado = reserva; batente (poste) nas pontas e tampa final ao fim de cada grupo.',
    'Marcar cada borne (régua e número) e cada condutor com anilha igual nas duas pontas (NBR 5410, 6.5.4.9). Grupos (X1.1, X1.2…) na legenda.'];
  const PASSO = 85;
  const tentar = (QUEBRA) => naEscala((esc) => {
    const P = (v) => v * esc;
    const p = criarPincelSvg({ escala: esc });
    const poste = (x, y) => p.ret(x, y - 60, T.BORNE_POSTE_MM, 60, { cor: '#111', fundo: '#333', pena: 0.1 });
    const hN = Math.min(P(1.3), 3.2);
    let y = 0;
    for (const g of calc.born) {
      p.txt(0, y, P(2.2), `RÉGUA ${g.id}`, { negrito: true });
      y -= P(3) + hN * 3;
      const pos = [];
      g.itens.forEach((it, gi) => {
        const larg = (g.medidas || []).find(m => Number(m.secao) === Number(it.secao))?.largura_mm || T.BORNE_LARGURA[it.secao] || 6.2;
        const cx = calc.circuitos.find(x => String(x.n) === String(it.circuito));
        for (let i = 0; i < it.quantidade; i++) pos.push({ l: larg, tipo: cx && cx.neutro && i === it.quantidade - 1 ? 'N' : 'F', grupo: gi });
        for (let i = 0; i < (it.pe || 0); i++) pos.push({ l: Math.max(larg, 5.2), tipo: 'PE', grupo: gi });
        pos.push({ tampa: true });
      });
      const usados = pos.filter(x => !x.tampa);
      const lm = usados.reduce((s, x) => s + x.l, 0) / Math.max(1, usados.length);
      for (let i = 0; i < g.reserva; i++) pos.push({ l: lm, tipo: 'R', grupo: -1 });
      let x = 0, n = 0;
      const vistos = new Set();
      poste(x, y); x += T.BORNE_POSTE_MM + 1;
      for (const k of pos) {
        if (x > QUEBRA) { poste(x, y); x = 0; y -= PASSO; poste(x, y); x += T.BORNE_POSTE_MM + 1; }
        if (k.tampa) { p.ret(x, y - 58, 2, 56, { cor: '#666', fundo: '#bbb', pena: 0.05 }); x += 2; continue; }
        n += 1;
        p.ret(x, y - 60, k.l, 60, k.tipo === 'PE' ? 'QD-PE' : k.tipo === 'N' ? 'QD-NEUTRO' : k.tipo === 'R' ? 'QD-RESERVA' : 'QD-BORNE');
        p.txt(x + k.l / 2 + Math.min(hN, k.l * 0.8) * 0.5, y + 2, Math.min(hN, k.l * 0.8), k.tipo === 'R' ? 'R' : String(n), { rotacao: 90 });
        if (k.grupo >= 0 && !vistos.has(k.grupo)) { vistos.add(k.grupo); p.txt(x + 0.5, y - 60 - P(1.6), Math.min(P(1.2), 4), `${g.id}.${k.grupo + 1}`, { cor: '#1f5fa8', negrito: true }); }
        x += k.l;
      }
      poste(x, y);
      y -= PASSO + P(4);
    }
    return p;
  }, { notas, legenda: legenda.length, margem: 3 });
  // régua longa em poucas linhas ou curta em muitas: fica a quebra que dá a maior escala
  const r = [300, 380, 460, 540].map(tentar).reduce((m, x) => (x.esc < m.esc ? x : m));
  return { titulo: 'Detalhe das réguas de bornes', svg: r.svg, escala: r.escala, notas, legenda };
}

// ── Componentes ─────────────────────────────────────────────────────────────

function componentes(calc, ctx) {
  const { c } = calc;
  const out = [];
  const loc = ctx.locais;
  for (const k of calc.comps.lista) {
    if (k.filhos) {
      const mot = calc.motores.find(m => m.tag === k.motor);
      for (const f of k.filhos) {
        const d = mot && mot.partidaInfo.dispositivos.find(x => x.ref === f.ref);
        const desc = (f.medida && f.medida.origem === 'catalogo' && f.medida.descricao) || (d && (d.especificacao || (d.tipo === 'contator' ? `Contator tripolar ${d.nominal_a} A AC-3, bobina ${calc.aut.ativo ? '24 Vcc' : `${c.vfn} Vca`}` : d.tipo === 'rele_sobrecarga' ? `Relé de sobrecarga faixa ${d.faixa ? d.faixa.join('–') : ''} A` : d.tipo === 'temporizador' ? 'Relé de tempo estrela-triângulo' : d.tipo))) || f.ref;
        out.push({ tag: `${k.ref}/${f.ref}`, descricao: `${desc} — partida ${k.ref}`, fabricante: fabDe(f.medida), referencia: refDe(f.medida), medidas: mm3(f.l, f.h, f.p), quantidade: 1, unidade: 'un', local: `Partida ${k.ref}: ${loc.get(k.ref) || '—'}`, fonte: fonteDe(f.medida) });
      }
      continue;
    }
    // a descrição do cálculo termina em " — fabricante referência" quando veio do catálogo: fica nas colunas próprias
    const sufixo = k.medida && k.medida.origem === 'catalogo' ? ` — ${k.medida.fabricante} ${k.medida.referencia}` : null;
    out.push({ tag: k.ref, descricao: limpaDesc(sufixo ? k.descricao.replace(sufixo, '') : k.descricao), fabricante: fabDe(k.medida), referencia: refDe(k.medida), medidas: mm3(k.largura, k.altura, k.prof), quantidade: 1, unidade: 'un',
      local: k.zona === 'porta' ? 'Porta, em recorte (corpo para dentro)' : (loc.get(k.ref) || '—'), fonte: fonteDe(k.medida) });
  }
  // barramentos e barras N/PE
  const b = calc.barr;
  if (b.tipo === 'barra' && b.fase) out.push({ tag: 'BARR', descricao: `Barramento ${c.nFases} × ${b.fase.l}×${b.fase.e} mm Cu${b.neutro && b.nBarras > c.nFases ? ` + N ${b.neutro.l}×${b.neutro.e}` : ''} em ${b.isoladores} isoladores (ver capítulo Barramentos)`, fabricante: '—', referencia: '—', medidas: `${num(calc.layout.larguraUtil)} × ${num(b.nBarras * c.entreFases + 20)} × ${ctx.alturaIsolador + b.fase.e}`, quantidade: 1, unidade: 'cj', local: ctx.locais.get('BARR') || 'Placa', fonte: 'projeto H&M (cálculo do barramento)' });
  else out.push({ tag: 'PENTE', descricao: `Barramento tipo pente ${c.nFases}P ${b.pente.a} A (${b.pente.s} mm²)`, fabricante: '—', referencia: '—', medidas: `${num(calc.layout.larguraUtil)} (comprimento por fileira)`, quantidade: Math.max(1, b.fileirasPente || 1), unidade: 'un', local: 'Fileiras de disjuntores (bornes de entrada)', fonte: 'fabricante dos disjuntores [CONFERIR]' });
  for (const f of calc.layout.fileiras) for (const k of f.itens) {
    if ((k.tipo === 'barra_neutro' || k.tipo === 'barra_pe') && !out.some(o => o.tag === k.ref)) out.push({ tag: k.ref, descricao: k.tipo === 'barra_pe' ? `Barra de terra (PE) ${b.pe.l}×${b.pe.e} mm com terminais, verde-amarelo` : 'Barra de neutro isolada com terminais, azul-claro', fabricante: '—', referencia: '—', medidas: mm3(k.largura, k.altura, 30), quantidade: 1, unidade: 'un', local: ctx.locais.get(k.ref) || '—', fonte: 'medida típica [CONFERIR]' });
  }
  // bornes (por seção, com a medida do catálogo quando há)
  for (const g of calc.born) for (const md of g.medidas || []) {
    const q = g.itens.filter(i => Number(i.secao) === Number(md.secao)).reduce((s, i) => s + i.quantidade, 0);
    const res = Math.ceil(q / Math.max(1, g.itens.reduce((s, i) => s + i.quantidade, 0)) * g.reserva);
    out.push({ tag: g.id, descricao: `Borne de passagem ${sec(md.secao)} — ${g.funcao} (${q} + ${res} reserva)`, fabricante: fabDe(md), referencia: refDe(md), medidas: mm3(md.largura_mm, g.altura, g.prof), quantidade: q + res, unidade: 'un', local: ctx.locais.get(g.id) || '—', fonte: fonteDe(md) });
  }
  // porta: botões, sinaleiros, seletores, IHM, ventilação
  const IC = ctx.IC;
  for (const bt of ctx.PT.botoes) {
    const m = IC.porta(bt.tipo);
    out.push({ tag: bt.tag, descricao: `${bt.descricao}${bt.funcao ? ` — ${bt.funcao}` : ''} (cor: ${bt.cor})`, fabricante: m.origem === 'catalogo' ? m.fabricante : (m.fabricante ? `${m.fabricante} (sem registro)` : '—'), referencia: m.origem === 'catalogo' ? m.referencia : '—',
      medidas: m.origem === 'catalogo' ? mm3(m.l, m.a, m.p) : `Ø ${bt.d} frontal, furo Ø 22,3 (típica)`, quantidade: 1, unidade: 'un', local: 'Porta', fonte: m.origem === 'catalogo' ? fonteDe(m) : 'medida típica [CONFERIR]' });
  }
  if (ctx.PT.ihm) {
    const m = IC.porta('ihm', calc.aut.ihm);
    out.push({ tag: 'IHM1', descricao: `IHM touch ${calc.aut.ihm}" 24 Vcc, Ethernet`, fabricante: fabDe(m), referencia: refDe(m), medidas: m.origem === 'catalogo' ? mm3(m.l, m.a, m.p) : mm3(ctx.PT.ihm.l, ctx.PT.ihm.a, 50), quantidade: 1, unidade: 'un', local: 'Porta, em recorte', fonte: fonteDe(m) });
  }
  if (calc.term.ventilacao) {
    const mv = IC.ventilacao(calc.term.ventilacao.ventilador);
    out.push({ tag: 'EV1', descricao: `Ventilador com filtro ${calc.term.ventilacao.ventilador} m³/h (vazão livre), ${c.vfn} Vca — saída de ar`, fabricante: fabDe(mv.ventilador), referencia: refDe(mv.ventilador), medidas: mv.ventilador.origem === 'catalogo' ? mm3(mv.ventilador.l, mv.ventilador.a, mv.ventilador.p) : '120 × 120 (grelha, típica)', quantidade: calc.term.ventilacao.quantidade, unidade: 'un', local: 'Porta, alto (saída de ar quente)', fonte: fonteDe(mv.ventilador) });
    out.push({ tag: 'EV2', descricao: 'Grelha de entrada com filtro (sem motor)', fabricante: fabDe(mv.filtro), referencia: refDe(mv.filtro), medidas: mv.filtro.origem === 'catalogo' ? mm3(mv.filtro.l, mv.filtro.a, mv.filtro.p) : '120 × 120 (típica)', quantidade: calc.term.ventilacao.quantidade, unidade: 'un', local: 'Porta, embaixo (entrada de ar)', fonte: fonteDe(mv.filtro) });
  }
  // itens iguais (mesma peça, no mesmo lugar) numa linha só, com todas as tags: KA1, KA2… KA13
  const grupos = new Map();
  for (const k of out) {
    const chave = [k.descricao, k.fabricante, k.referencia, k.medidas, k.local, k.fonte, k.unidade].join('|');
    const g = grupos.get(chave);
    if (g) { g.tags.push(k.tag); g.quantidade += k.quantidade; } else grupos.set(chave, { ...k, tags: [k.tag] });
  }
  return [...grupos.values()].map(({ tags, ...k }) => ({ ...k, tag: tags.join(', ') }));
}

// ── Barramentos ─────────────────────────────────────────────────────────────

function barramentos(calc, ctx) {
  const { c, barr: b } = calc;
  const out = [];
  const pz = ctx.parafuso;
  const fix = `Barra → isolador: parafuso M8 × 20 classe 8.8 + arruela lisa e de pressão, 20 N·m; emendas e derivações: ${pz.n} × M${pz.d} × ${ctx.compParafuso} classe 8.8, furo Ø ${String(pz.furo).replace('.', ',')} mm (DIN 43673-1), ${pz.torque} N·m [CONFERIR]`;
  if (b.tipo === 'barra' && b.fase) {
    const compr = Math.round(b.comprimentoFase * 1000);
    out.push({ barra: ['L1', 'L2', 'L3'].slice(0, c.nFases).join('/'), material: `Cobre eletrolítico (Cu-ETP) ${c.barraPintada ? 'pintado' : 'nu'}`, secao: `${b.fase.l} × ${b.fase.e} mm (${b.secaoFase} mm²)`, comprimento_mm: compr, quantidade: c.nFases,
      capacidade_A: Math.round(b.capacidade), icw_kA: b.icw, isoladores: `${b.apoiosQtd} isoladores por barra (epóxi, M8, h = ${ctx.alturaIsolador} mm, ≥ ${num(b.dinamico ? b.dinamico.forcaApoio : 0)} N), vão ≤ ${c.apoios} mm, ${c.entreFases} mm entre centros`, fixacao: fix });
    if (b.neutro && b.nBarras > c.nFases) out.push({ barra: 'N', material: 'Cobre eletrolítico (Cu-ETP), identificado azul-claro', secao: `${b.neutro.l} × ${b.neutro.e} mm (${b.neutro.l * b.neutro.e} mm²)`, comprimento_mm: compr, quantidade: 1, capacidade_A: '= fase', icw_kA: b.icw, isoladores: `${b.apoiosQtd} isoladores (iguais aos das fases)`, fixacao: fix });
    const xpe = calc.layout.fileiras.flatMap(f => f.itens).find(k => k.tipo === 'barra_pe');
    out.push({ barra: 'PE', material: 'Cobre eletrolítico, identificado verde-amarelo, furada para os terminais PE', secao: `${b.pe.l} × ${b.pe.e} mm (${b.pe.l * b.pe.e} mm²)`, comprimento_mm: xpe ? Math.round(xpe.largura) : compr, quantidade: 1, capacidade_A: '—', icw_kA: `${num(c.icc, 1)} (fase-massa, 0,2 s)`, isoladores: 'Fixação direta na estrutura/placa (continuidade ≤ 0,1 Ω)', fixacao: '2 × parafuso M6 + arruela dentada; terminais dos condutores PE com parafuso M6 [CONFERIR]' });
  } else {
    out.push({ barra: `Pente ${c.nFases}P`, material: 'Cobre isolado (do fabricante dos disjuntores)', secao: `${b.pente.s} mm²`, comprimento_mm: Math.round(calc.layout.larguraUtil), quantidade: Math.max(1, b.fileirasPente || 1), capacidade_A: b.pente.a, icw_kA: 'pelo fabricante (com o disjuntor a montante)',
      isoladores: 'Isolação integral do pente; tampas nos pinos livres e tampa final', fixacao: 'Pinos nos bornes de entrada dos disjuntores — torque do borne do disjuntor (típico 2,5–3,5 N·m [CONFERIR])' });
    for (const f of calc.layout.fileiras) for (const k of f.itens) {
      if (k.tipo === 'barra_neutro') out.push({ barra: 'N', material: 'Cobre/latão estanhado, base isolante azul-claro', secao: '—', comprimento_mm: Math.round(k.largura), quantidade: 1, capacidade_A: `≥ ${calc.geral.In}`, icw_kA: '—', isoladores: '2 isoladores (suporte da barra)', fixacao: '2 × parafuso M6 + arruela lisa e de pressão, 5 N·m; terminais por parafuso [CONFERIR]' });
      if (k.tipo === 'barra_pe') out.push({ barra: 'PE', material: 'Cobre/latão estanhado, verde-amarelo', secao: `${b.pe.l} × ${b.pe.e} mm`, comprimento_mm: Math.round(k.largura), quantidade: 1, capacidade_A: '—', icw_kA: `${num(c.icc, 1)} (fase-massa, 0,2 s)`, isoladores: 'Fixação direta na placa/estrutura (continuidade)', fixacao: '2 × parafuso M6 + arruela dentada (remove a pintura), 5 N·m [CONFERIR]' });
    }
  }
  return out;
}

// ── Materiais de montagem — da caixa aos parafusos ─────────────────────────

function materiaisMontagem(calc, ctx) {
  const { c, layout, barr: b, aut, term, inv, born, motores } = calc;
  const env = layout.involucro;
  const L = [];
  const add = (grupo, descricao, especificacao, quantidade, unidade, regra) => { if (quantidade > 0) L.push({ grupo, descricao, especificacao, quantidade, unidade, regra }); };
  const mat = (re) => calc.materiais.find(m => re.test(m.descricao));
  const IC = ctx.IC;

  // Invólucro
  const inv0 = calc.materiais.find(m => m.grupo === 'Invólucro');
  add('Invólucro', 'Invólucro com porta, fecho e dobradiças', inv0 ? inv0.descricao : `${env.altura} × ${env.largura} × ${env.profundidade} mm`, 1, 'un', 'Menor invólucro da série que comporta o arranjo (memorial, seção 10)');
  add('Invólucro', 'Placa de montagem', `${layout.placa.altura} × ${layout.placa.largura} mm, chapa de aço galvanizado 2,0–2,5 mm (normalmente fornecida com o invólucro) [CONFERIR]`, 1, 'un', 'Uma placa por invólucro');
  const espelho = mat(/Espelho\/contraporta/);
  if (espelho) add('Invólucro', 'Contraporta / espelho de proteção', 'Chapa recortada para os dispositivos modulares, IPXXB com a porta aberta (NBR IEC 61439-1, 8.2)', 1, 'un', 'Há fileiras de dispositivos modulares');
  add('Invólucro', 'Fechadura / fecho da porta', c.montagem === 'autoportante' ? 'Fecho tipo cremona com chave (padrão do invólucro) [CONFERIR]' : 'Fecho com chave ou 1/4 de volta (padrão do invólucro) [CONFERIR]', 1, 'un', 'Uma por porta (normalmente incluso no invólucro)');
  if (c.montagem === 'sobrepor') add('Invólucro', 'Fixação do invólucro na parede', 'Suporte/aba de fixação + bucha S8 + parafuso 5,5 × 50 mm', 4, 'cj', '4 pontos de fixação (cantos) [CONFERIR com a parede]');
  if (c.montagem === 'autoportante') {
    add('Invólucro', 'Base soleira (rodapé) 100 mm', 'Do fabricante do invólucro, com tampas frontais', 1, 'cj', 'Autoportante: base para fixação no piso e entrada de cabos [CONFERIR]');
    add('Invólucro', 'Olhais de içamento', 'M12, do fabricante do invólucro', 4, 'un', '4 cantos do teto (retirar e tampar depois da instalação)');
    add('Invólucro', 'Fixação da base no piso', 'Chumbador/parabolt 3/8" com arruela', 4, 'un', '4 pontos da base [CONFERIR]');
  }

  // Fixação
  const nPontosPlaca = layout.placa.altura <= 1000 ? 4 : 6;
  add('Fixação', 'Fixação da placa de montagem', 'Porca M6 (ou M8, conforme os prisioneiros do invólucro) + arruela lisa + arruela de pressão', nPontosPlaca, 'cj', `Prisioneiros do fundo do invólucro: 4 até 1000 mm de altura de placa, 6 acima (placa ${layout.placa.altura} mm) [CONFERIR]`);
  const trilhos = layout.fileiras.filter(f => f.trilho);
  const furosTrilho = trilhos.reduce((s) => s + Math.max(2, Math.ceil(layout.larguraUtil / 250) + 1), 0);
  const trilhoM = Math.ceil(trilhos.length * layout.larguraUtil / 100) / 10;
  const mT = IC.trilho();
  add('Fixação', 'Trilho DIN 35 × 7,5 mm perfurado (EN 60715)', mT.origem === 'catalogo' ? `${mT.fabricante} ${mT.referencia}` : 'Aço zincado, perfurado', trilhoM, 'm', `${trilhos.length} trilho(s) × ${num(layout.larguraUtil)} mm de largura útil (um por fileira com trilho)`);
  add('Fixação', 'Parafuso de fixação do trilho', 'M5 × 10 cabeça panela, aço zincado, com arruela lisa (placa furada Ø 4,2 mm e roscada M5)', furosTrilho, 'un', `M5 a cada 250 mm, mínimo 2 por trilho: ${trilhos.length} trilho(s) × ${Math.max(2, Math.ceil(layout.larguraUtil / 250) + 1)}`);
  const segH = layout.horizontais.length;
  const compV = layout.placa.altura - 2 * T.MARGEM_UTIL;
  const fixCan = segH * Math.max(2, Math.ceil((layout.larguraUtil + 20) / 300) + 1) + 2 * Math.max(2, Math.ceil(compV / 300) + 1);
  for (const [k, v] of Object.entries(layout.canaletasMetros)) {
    const [l, a] = k.split(' × ').map(Number);
    const r = IC.canaleta(l, a);
    add('Fixação', `Canaleta de fiação recortada ${k} mm com tampa`, r.m.origem === 'catalogo' ? `${r.m.fabricante} ${r.m.referencia}` : `PVC cinza, ${k} mm${r.equivalente ? ` — equivalente: ${r.equivalente}` : ''}`, Math.ceil(v * 10) / 10, 'm', 'Comprimentos do layout (horizontais na largura útil + 20 mm; verticais na altura da placa − 30 mm)');
  }
  add('Fixação', 'Fixação das canaletas', 'Rebite plástico Ø 5 mm ou parafuso M4 × 10 com arruela (placa furada)', fixCan, 'un', `1 a cada 300 mm, mínimo 2 por trecho: ${segH} horizontais + 2 verticais`);
  const cm = calc.comps.lista.filter(k => k.tipo === 'disjuntor_cm' || (k.tipo === 'disjuntor_geral' && k.modulos == null)).length
    + motores.filter(m => m.partidaInfo.dispositivos.some(d => d.ref === 'Q1' && d.tipo === 'caixa_moldada')).length;
  add('Fixação', 'Fixação dos disjuntores de caixa moldada', 'Parafuso M5 × 16 (ou o do gabarito do fabricante) + arruela lisa e de pressão', 4 * cm, 'un', `4 por disjuntor de caixa moldada × ${cm} [CONFERIR gabarito]`);
  const eletr = calc.comps.lista.filter(k => k.filhos).flatMap(k => k.filhos).filter(f => f.ref === 'T1').length;
  add('Fixação', 'Fixação de soft-starters / inversores', 'Parafuso M5 × 12 + arruela lisa e de pressão (modelos pequenos podem ir em trilho DIN)', 4 * eletr, 'un', `4 por equipamento × ${eletr} [CONFERIR manual]`);

  // Barramento
  const pz = ctx.parafuso;
  if (b.tipo === 'barra' && b.fase) {
    const mF = mat(/Barra de cobre eletrolítico .* fases/);
    add('Barramento', `Barra de cobre eletrolítico ${b.fase.l} × ${b.fase.e} mm — fases`, 'Cu-ETP (DIN 43671), cantos arredondados, sem rebarba', mF ? mF.quantidade : b.comprimentoFase * c.nFases, 'm', `${c.nFases} barras × ${num(b.comprimentoFase, 2)} m (largura útil + 0,3 m de derivações)`);
    const mN = mat(/Barra de cobre .* neutro/);
    if (mN) add('Barramento', mN.descricao, 'Cu-ETP, identificar azul-claro', mN.quantidade, 'm', '1 barra × comprimento das fases');
    const xpe = layout.fileiras.flatMap(f => f.itens).find(k => k.tipo === 'barra_pe');
    if (xpe) add('Barramento', `Barra de terra (PE) ${b.pe.l} × ${b.pe.e} mm (verde-amarelo)`, `${num(xpe.largura)} mm, ${Math.floor((xpe.largura - 20) / 10) * 2} terminais`, 1, 'un', 'Furos = saídas + reserva + 2 (passo 10 mm, 2 fileiras); seção pela Tabela 58 da NBR 5410');
    add('Barramento', 'Fixação da barra PE', 'Parafuso M6 × 16 + arruela dentada (continuidade com a estrutura)', 2, 'cj', '2 por barra');
    add('Barramento', 'Isolador suporte de barramento', `Epóxi/poliéster, rosca M8 nas duas faces, h = ${ctx.alturaIsolador} mm, ≥ ${num(b.dinamico ? b.dinamico.forcaApoio : 0)} N (esforço estimado)`, b.isoladores, 'un', `${b.apoiosQtd} pontos de apoio (vão ≤ ${c.apoios} mm) × ${b.nBarras + 1} barras (fases, N e PE)`);
    add('Barramento', 'Parafuso barra → isolador', 'M8 × 20 classe 8.8 zincado + arruela lisa + arruela de pressão, 20 N·m', b.isoladores, 'cj', '1 por isolador');
    add('Barramento', 'Parafuso isolador → placa', 'M8 × 20 classe 8.8 zincado + arruela lisa + arruela de pressão (placa furada Ø 9 mm)', b.isoladores, 'cj', '1 por isolador');
    add('Barramento', 'Parafuso de emenda/derivação das barras', `M${pz.d} × ${ctx.compParafuso} classe 8.8 zincado (furo Ø ${String(pz.furo).replace('.', ',')} mm), torque ${pz.torque} N·m`, ctx.juntas.parafusos, 'un', `${ctx.juntas.texto}; ${pz.n} parafuso(s) por junta (DIN 43673-1 para barra de ${b.fase.l} mm) [CONFERIR]`);
    add('Barramento', 'Porca das emendas', `M${pz.d} classe 8, zincada`, ctx.juntas.parafusos, 'un', '1 por parafuso de emenda');
    add('Barramento', 'Arruela lisa das emendas', `M${pz.d} larga (DIN 7349 / DIN 125), aço zincado`, 2 * ctx.juntas.parafusos, 'un', '2 por parafuso (uma de cada lado)');
    add('Barramento', 'Arruela de pressão / Belleville das emendas', `M${pz.d} (DIN 6796), mantém o aperto com a dilatação`, ctx.juntas.parafusos, 'un', '1 por parafuso');
    add('Barramento', 'Terminal de compressão das derivações em cabo', `Olhal de cobre estanhado, furo M${pz.d}, seção do cabo da derivação [CONFERIR]`, ctx.juntas.terminais, 'un', 'Derivações em cabo a partir das barras (chegada do geral, partidas, caixas moldadas)');
    add('Barramento', 'Proteção isolante frontal do barramento', 'Policarbonato transparente 3 mm com espaçadores e parafusos M5', 1, 'cj', `Forma de separação ${inv.forma} / IPXXB (NBR IEC 61439-1, 8.4)`);
    add('Barramento', 'Pasta de contato / limpeza das superfícies', 'Escova de aço inox + pasta antioxidante para conexões de cobre', 1, 'un', 'Boa prática nas emendas [CONFERIR]');
  } else {
    const fileiras = Math.max(1, b.fileirasPente || 1);
    add('Barramento', `Barramento tipo pente ${c.nFases}P ${b.pente.a} A (${b.pente.s} mm²)`, 'Do mesmo fabricante dos disjuntores, cortar no comprimento da fileira', fileiras, 'un', `1 por fileira de disjuntores (${fileiras})`);
    add('Barramento', 'Terminal de alimentação do pente', 'Do fabricante do pente, seção do cabo de alimentação', fileiras, 'un', '1 por pente');
    add('Barramento', 'Tampas dos pinos livres e tampa final do pente', 'Do fabricante do pente', fileiras, 'cj', '1 jogo por pente');
    const mBloco = mat(/Bloco de distribuição/);
    if (mBloco) add('Barramento', mBloco.descricao, 'Isolado, trilho DIN', mBloco.quantidade, 'un', 'Mais de uma fileira de pente');
    for (const f of layout.fileiras) for (const k of f.itens) {
      if (k.tipo === 'barra_neutro') add('Barramento', 'Barramento de neutro isolado (azul-claro)', `${num(k.largura)} mm, ${Math.floor((k.largura - 20) / 10) * 2} terminais, 2 isoladores`, 1, 'un', 'Furos = circuitos com neutro + reserva + 2 (furação em duas fileiras, passo 10 mm)');
      if (k.tipo === 'barra_pe') add('Barramento', `Barramento de terra (PE) ${b.pe.l} × ${b.pe.e} mm (verde-amarelo)`, `${num(k.largura)} mm, ${Math.floor((k.largura - 20) / 10) * 2} terminais`, 1, 'un', 'Furos = saídas + reserva + 2; seção pela Tabela 58 da NBR 5410');
    }
    add('Barramento', 'Fixação das barras N e PE', 'Parafuso M6 × 16 + arruela lisa + arruela de pressão (PE: arruela dentada)', 2 * layout.fileiras.flatMap(f => f.itens).filter(k => k.tipo === 'barra_neutro' || k.tipo === 'barra_pe').length, 'cj', '2 por barra');
  }

  // Fiação — por seção e cor (NBR 5410 6.1.5.3; NBR IEC 60204-1 13.2.4 no comando)
  for (const f of ctx.fiacao.linhas) add('Fiação', `Cabo flexível 750 V (classe 5) ${sec(f.secao)} — ${f.cor}`, f.funcao, f.metros, 'm', f.regra);
  if (aut.ativo && aut.usados.AI + aut.usados.AO) add('Fiação', 'Cabo blindado 2 × 0,75 mm² (par trançado) — sinais analógicos', 'Malha aterrada em 360° na entrada (abraçadeira/barra de blindagem)', Math.ceil(2 * (aut.usados.AI + aut.usados.AO) * c.fiacaoM * 1.2), 'm', `${aut.usados.AI + aut.usados.AO} sinais analógicos × 2 × ${num(c.fiacaoM, 1)} m × 1,2`);
  if (aut.ativo) add('Fiação', 'Cabo de rede Cat 6 blindado (patch cord)', 'CLP / IHM / switch', 1 + (aut.ihm ? 1 : 0) + (aut.switchPortas ? 1 : 0), 'un', '1 por ligação de rede interna');
  add('Fiação', 'Abraçadeira de nylon', '100 × 2,5 mm (chicotes) e 200 × 3,6 mm (cabos de potência), preta resistente a UV', Math.ceil(ctx.fiacao.condutores / 4) + 20, 'un', `≈ 1 a cada 4 condutores (${ctx.fiacao.condutores}) + 20 para o chicote da porta e a entrada [CONFERIR]`);
  add('Fiação', 'Base adesiva para abraçadeira', '20 × 20 mm', c.montagem === 'autoportante' ? 20 : 10, 'un', 'Fixação dos chicotes fora das canaletas');
  if (ctx.PT.botoes.length || ctx.PT.ihm || ctx.PT.medidores.length || term.ventilacao) {
    add('Fiação', 'Espiral / tubo corrugado para o chicote da porta', 'Ø 15–25 mm, com prensa-chicote na articulação', env.altura <= 1000 ? 1 : 1.5, 'm', 'Da placa até a porta pela dobradiça: ≈ metade da altura da porta + 0,5 m');
    add('Fiação', 'Prensa-chicote / suporte articulado da porta', 'Fixação do chicote na placa e na porta', 2, 'un', '1 de cada lado da dobradiça');
  }

  // Terminais (ponteiras, terminais de compressão, bornes e acessórios)
  for (const t of ctx.fiacao.ponteiras) add('Terminais', `Terminal tubular (ponteira) isolado ${sec(t.secao)}`, `DIN 46228-4, cor ${COR_PONTEIRA[t.secao] || 'conforme o fabricante'} [CONFERIR]`, t.qtd, 'un', `${t.cond} condutor${t.cond > 1 ? 'es' : ''} × 2 pontas × 1,1`);
  for (const t of ctx.fiacao.olhais) add('Terminais', `Terminal de compressão olhal ${sec(t.secao)}`, 'Cobre estanhado, prensado com alicate/hidráulica, com termocontrátil na cor do condutor', t.qtd, 'un', `${t.cond} condutor${t.cond > 1 ? 'es' : ''} × 2 pontas × 1,1 (seção ≥ 50 mm² não usa ponteira)`);
  const nAlim = c.nFases + (c.esquema === 'TN-C' ? 0 : 1) + 1;
  add('Terminais', 'Terminal de compressão para o alimentador (chegada no geral / barras)', `Olhal ou tubular de cobre estanhado, na seção do alimentador [CONFERIR]`, nAlim, 'un', `Fases + N + PE do alimentador (${nAlim})`);
  for (const g of born) {
    const porSec = {};
    g.itens.forEach(i => { porSec[i.secao] = (porSec[i.secao] || 0) + i.quantidade; });
    const total = g.itens.reduce((s, i) => s + i.quantidade, 0);
    for (const [s, q] of Object.entries(porSec)) {
      const md = (g.medidas || []).find(x => Number(x.secao) === Number(s));
      add('Terminais', `Borne de passagem ${sec(s)} (${g.id})`, md && md.origem === 'catalogo' ? `${md.fabricante} ${md.referencia}` : 'Mola ou parafuso, cinza', q + Math.ceil(q / Math.max(1, total) * g.reserva), 'un', `${q} usados + reserva proporcional de ${Math.round(c.reservaPct * 100)} %`);
    }
    const pe = g.itens.reduce((s, i) => s + (i.pe || 0), 0);
    add('Terminais', `Borne terra (PE) verde-amarelo (${g.id})`, 'Contato com o trilho (aterramento do trilho)', pe, 'un', '1 por saída com PE');
    add('Terminais', `Poste / batente de fim de régua (${g.id})`, 'Parafuso de aperto no trilho', 2, 'un', '2 por régua (uma em cada ponta)');
    add('Terminais', `Tampa final de borne (${g.id})`, 'Da mesma linha dos bornes', 1 + g.itens.length, 'un', '1 ao fim de cada grupo de circuito + 1');
    add('Terminais', `Plaqueta de marcação de borne (${g.id})`, 'Tira de marcadores numerados (1…n)', g.total + g.reserva, 'un', 'Uma por borne, incluindo a reserva');
    if (g.id === 'X2' && aut.ativo) add('Terminais', 'Ponte de ligação (jumper) 10 polos', 'Para os comuns de DI/DO e a distribuição 24 Vcc', Math.ceil((aut.bornes.DI + aut.bornes.DO + aut.bornes.alimentacao24) / 20), 'un', '1 a cada 20 bornes de sinal/alimentação [CONFERIR]');
  }

  // Identificação
  const nPorta = ctx.plaquetasPorta.length;
  add('Identificação', 'Plaqueta de comando/sinalização da porta', `${PLAQ.comando.material}; ${BOTAO_PLAQ.l} × ${BOTAO_PLAQ.a} mm (emergência em amarelo)`, nPorta, 'un', 'Uma por dispositivo de porta (folha de plaquetas)');
  add('Identificação', 'Plaqueta de identificação externa do quadro', `${PLAQ.comando.material}; ${ctx.plaquetaId.largura_mm} × ${ctx.plaquetaId.altura_mm} mm — "${ctx.plaquetaId.texto.join(' / ')}"`, 1, 'un', 'Uma por conjunto, no alto da porta');
  add('Identificação', 'Placa de advertência — símbolo de risco elétrico', 'Adesivo vinílico triângulo 40 mm (ISO 7010 W012), amarelo/preto', 1, 'un', 'Uma por porta (NR-10, 10.10)');
  add('Identificação', 'Placa de advertência — texto', `${PLAQ.advertencia.material}; 100 × 25 mm — "PERIGO — RISCO DE CHOQUE ELÉTRICO"`, 1, 'un', 'Uma por porta (NR-10, 10.10)');
  if (c.residencial) add('Identificação', 'Advertência da NBR 5410, 6.5.4.10', 'Adesivo com o texto integral da norma (quadros de unidades residenciais)', 1, 'un', 'Quadro de uso residencial');
  add('Identificação', 'Plaqueta H&M (fabricante do conjunto)', `${PLAQ.hm.material}; 100 × 70 mm com logo, modelo, nº de série/OS e dados de marcação (NBR IEC 61439-1, 6.1)`, 1, 'un', 'Uma por conjunto');
  add('Identificação', 'Rebite de alumínio Ø 3,2 × 8 mm (plaqueta H&M)', 'Cabeça abaulada, furo Ø 3,3 mm na porta', 4, 'un', '4 por plaqueta H&M');
  add('Identificação', 'Fita dupla face acrílica (VHB) 12 mm', 'Para as plaquetas de acrílico', Math.ceil((nPorta * 2 * BOTAO_PLAQ.l + 2 * ctx.plaquetaId.largura_mm) / 100) / 10, 'm', '2 tiras na largura de cada plaqueta de acrílico');
  add('Identificação', 'Etiqueta de identificação dos dispositivos (tag)', `${PLAQ.etiqueta.material}; ≈ 15 × 6 mm`, 2 * ctx.etiquetas, 'un', `2 por dispositivo (no dispositivo e na placa/espelho): ${ctx.etiquetas} dispositivos`);
  const anilhas = mat(/^Anilhas/);
  add('Identificação', 'Anilha de identificação dos condutores', 'Tipo luva, letra/número conforme o diagrama, nas duas pontas', anilhas ? anilhas.quantidade : Math.ceil(ctx.fiacao.condutores * 2 * 1.1), 'un', `${ctx.fiacao.condutores} condutores × 2 pontas × 1,1 (NBR 5410, 6.5.4.9)`);
  if (b.tipo === 'barra' && b.fase) add('Identificação', 'Etiqueta de fase nas barras (L1, L2, L3, N, PE)', 'Adesiva, cores da NBR 5410 6.1.5.3 para N e PE', 2 * (b.nBarras + 1), 'un', '2 por barra (nas pontas)');

  // Entrada de cabos
  add('Entrada de cabos', 'Flange / placa de entrada de cabos', `Removível, na entrada ${c.entradaCabos}; furar conforme a lista de prensa-cabos; vedação ${inv.ip}`, 1, 'un', 'Uma por invólucro');
  for (const [tam, g] of Object.entries(ctx.prensas.porTamanho)) add('Entrada de cabos', `Prensa-cabos ${tam} (aperto ${g.faixa} mm)`, 'Poliamida, IP68, com contraporca e anel de vedação', g.qtd, 'un', `Um por cabo: ${g.cabos.slice(0, 6).join('; ')}${g.cabos.length > 6 ? '…' : ''} — diâmetro do cabo estimado [CONFERIR]`);
  add('Entrada de cabos', 'Bujão / tampão para furo de reserva', 'Poliamida, IP68', 2, 'un', '2 furos de reserva na flange');

  // Ventilação
  if (term.ventilacao) {
    const mv = IC.ventilacao(term.ventilacao.ventilador);
    add('Ventilação', 'Ventilador com filtro (saída de ar)', `${term.ventilacao.ventilador} m³/h livres, ${c.vfn} Vca${mv.ventilador.origem === 'catalogo' ? ` — ${mv.ventilador.fabricante} ${mv.ventilador.referencia}` : ''}`, term.ventilacao.quantidade, 'un', `Cálculo térmico: ${num(term.ventilacao.vazao)} m³/h necessários (IEC TR 60890)`);
    add('Ventilação', 'Grelha de entrada com filtro', mv.filtro.origem === 'catalogo' ? `${mv.filtro.fabricante} ${mv.filtro.referencia}` : 'Mesmo tamanho do ventilador', term.ventilacao.quantidade, 'un', '1 por ventilador (entrada embaixo, saída em cima)');
    add('Ventilação', 'Manta filtrante de reposição', 'Do mesmo fabricante (classe G3/G4)', 2 * term.ventilacao.quantidade, 'un', '1 jogo de reposição por grelha');
    add('Ventilação', 'Cabo do ventilador e do termostato', 'Flexível 750 V 1,5 mm² (fase preto, N azul-claro, PE verde-amarelo)', 3, 'm', 'Do disjuntor/borne ao termostato e ao ventilador na porta [CONFERIR]');
  }

  // Aterramento
  const nCord = 2 + (c.montagem === 'autoportante' ? 2 : 0);
  add('Aterramento', 'Cordoalha de aterramento 16 mm² com terminais', 'Cobre estanhado trançado, 300 mm', nCord, 'un', `Porta e placa${c.montagem === 'autoportante' ? ' + laterais/teto removíveis' : ''} (NBR IEC 61439-1, 8.4.3.2 [CONFERIR])`);
  add('Aterramento', 'Parafuso M6 × 16 + porca + arruela dentada (leque)', 'A arruela dentada rompe a pintura e garante a continuidade', 2 * nCord + 2, 'cj', `2 por cordoalha + 2 da barra PE à estrutura`);
  add('Aterramento', 'Terminal para o condutor PE externo', 'Terminal/borne na barra PE para o PE do alimentador (seção pela Tabela 58 da NBR 5410 conforme o alimentador) [CONFERIR]', 1, 'un', 'Um por alimentador');

  // Documentação
  add('Documentação', 'Porta-documentos interno', 'A4, plástico, fixado por dentro da porta', 1, 'un', 'NBR 5410, 6.1.8 [CONFERIR]');
  add('Documentação', 'Diagramas plastificados', 'Unifilar, força e comando, layout e lista de bornes (A3 ou A4)', 1, 'jg', 'Um jogo por conjunto');
  add('Documentação', 'Caderno de fabricação + relatório de ensaios de rotina', 'Revisão em vigor, assinado', 1, 'jg', 'Entregue com o conjunto');
  return L;
}

// Fiação interna por seção e cor: força (fases preto, N azul-claro, PE verde-amarelo), comando
// CA vermelho e CC azul-escuro (NBR IEC 60204-1, 13.2.4 — quadro com comando/automação)
function fiacaoPorCor(calc) {
  const { c, fio, aut } = calc;
  const met = {};
  const cond = {};
  const somar = (secao, cor, funcao, n) => {
    if (!(n > 0)) return;
    const k = `${secao}|${cor}`;
    met[k] = met[k] || { secao, cor, funcao, n: 0 };
    met[k].n += n;
    cond[secao] = (cond[secao] || 0) + n;
  };
  for (const k of fio.pot) {
    let fases, neutro;
    if (k.origem === 'entrada') { fases = c.nFases; neutro = k.n - c.nFases - 1; } else {
      const cx = calc.circuitos.find(x => String(x.n) === String(k.circuito));
      if (cx) { fases = cx.nFases; neutro = cx.neutro ? 1 : 0; } else { fases = k.n - 1; neutro = 0; }
    }
    somar(k.secao, 'preto', 'Força — fases (identificar L1/L2/L3 por anilha)', fases);
    somar(k.secao, 'azul-claro', 'Força — neutro (NBR 5410, 6.1.5.3.1)', neutro);
    somar(k.secao, 'verde-amarelo', 'Proteção — PE (NBR 5410, 6.1.5.3.2)', 1);
  }
  for (const k of fio.cmd) {
    if (/anal[óo]gic/i.test(k.circuito)) continue; // vai em cabo blindado (linha própria)
    const cc = aut.ativo;
    somar(k.secao, cc ? 'azul-escuro' : 'vermelho', cc ? 'Comando 24 Vcc (NBR IEC 60204-1, 13.2.4: CC = azul)' : `Comando ${c.vfn} Vca (NBR IEC 60204-1, 13.2.4: CA = vermelho)`, k.n);
  }
  const linhas = Object.values(met).sort((a, b) => a.secao - b.secao || a.cor.localeCompare(b.cor))
    .map(x => ({ ...x, metros: Math.ceil(x.n * c.fiacaoM * 1.2), regra: `${x.n} condutor${x.n > 1 ? 'es' : ''} × ${num(c.fiacaoM, 1)} m (comprimento médio interno) × 1,2 de sobra` }));
  const ponteiras = [], olhais = [];
  for (const [s, n] of Object.entries(cond).map(([s, n]) => [Number(s), n]).sort((a, b) => a[0] - b[0])) {
    (s >= 50 ? olhais : ponteiras).push({ secao: s, cond: n, qtd: Math.ceil(n * 2 * 1.1) });
  }
  return { linhas, ponteiras, olhais, condutores: Object.values(cond).reduce((s, v) => s + v, 0) };
}

// Prensa-cabos: um por cabo externo (alimentador, saídas, motores, sinais de campo)
function prensaCabos(calc) {
  const { c, aut, fio } = calc;
  const cabos = [];
  const ent = fio.pot.find(k => k.origem === 'entrada');
  if (ent) {
    if (ent.secao <= 35) cabos.push({ nome: `alimentador ${ent.n} × ${sec(ent.secao)}`, d: diametroCabo(ent.n, ent.secao) });
    else for (let i = 0; i < ent.n; i++) cabos.push({ nome: `alimentador 1 × ${sec(ent.secao)}`, d: diametroCabo(1, ent.secao) });
  }
  for (const x of calc.circuitos) {
    if (x.reserva) continue;
    const n = x.nFases + (x.neutro ? 1 : 0) + 1;
    cabos.push({ nome: `circ. ${x.n} ${n} × ${sec(x.fio)}`, d: diametroCabo(n, x.fio) });
  }
  for (const m of calc.motores) {
    const n = (m.partida === 'estrela_triangulo' ? 6 : 3) + 1;
    cabos.push({ nome: `${m.tag} ${n} × ${sec(m.fio)}`, d: diametroCabo(n, m.fio) });
  }
  if (aut.ativo) for (const s of aut.origem.filter(o => o.campo)) for (let i = 0; i < s.quantidade; i++) cabos.push({ nome: `${s.tag || s.descricao} (${s.tipo})`, d: s.tipo === 'AI' || s.tipo === 'AO' ? 7 : diametroCabo(2, 1) });
  const porTamanho = {};
  for (const k of cabos) {
    const [tam, min, max] = prensaPara(k.d);
    porTamanho[tam] = porTamanho[tam] || { qtd: 0, faixa: `${String(min).replace('.', ',')}–${max}`, cabos: [] };
    porTamanho[tam].qtd += 1;
    porTamanho[tam].cabos.push(k.nome);
  }
  return { cabos, porTamanho };
}

// Juntas aparafusadas do barramento de barras: chegada do geral, derivações para caixas moldadas,
// partidas, fileiras de distribuição e comando
function juntasBarramento(calc, pz) {
  const { c, barr: b, layout } = calc;
  if (b.tipo !== 'barra') return { parafusos: 0, terminais: 0, texto: '' };
  const chegada = b.nBarras;
  const cm = calc.circuitos.filter(x => x.caixaMoldada).reduce((s, x) => s + x.polos, 0);
  const part = calc.motores.length * 3;
  const fileiras = layout.fileiras.filter(f => f.zonas.includes('distribuicao')).length * (c.nFases + 1);
  const comando = calc.comps.lista.some(k => k.tipo === 'disjuntor_comando') ? 2 : 0;
  const juntas = chegada + cm + part + fileiras + comando;
  return { parafusos: juntas * pz.n, terminais: cm + part + fileiras + comando, texto: `${juntas} juntas: chegada ${chegada} + caixas moldadas ${cm} + partidas ${part} + fileiras de distribuição ${fileiras} + comando ${comando}` };
}

// Massa estimada (plaqueta e expedição): invólucro + placa + barramento + dispositivos + fiação
function massaEstimada(calc) {
  const { c, layout, barr: b, fio } = calc;
  const H = layout.involucro.altura / 1000, W = layout.involucro.largura / 1000, D = layout.involucro.profundidade / 1000;
  const area = 2 * (H * W + H * D + W * D);
  const kgM2 = { aco: 11.8, inox: 11.8, aluminio: 5.4, poliester: 6.6 }[c.material] || 11.8;
  const involucro = area * kgM2 * (c.montagem === 'autoportante' ? 1.25 : 1);
  const placa = (layout.placa.altura / 1000) * (layout.placa.largura / 1000) * 19.6;
  const vol = (l, h, p) => (l || 0) * (h || 0) * (p || 0) * 0.9e-6; // ≈ 0,9 g/cm³ de volume envolvente
  let disp = 0;
  for (const k of calc.comps.lista) disp += k.filhos ? k.filhos.reduce((s, f) => s + vol(f.l, f.h, f.p), 0) : vol(k.largura, k.altura, k.prof);
  disp += calc.born.reduce((s, g) => s + (g.total + g.reserva) * 0.012, 0);
  const barras = b.massaKg || 0;
  const fiacao = Object.entries(fio.condutoresMetros).reduce((s, [sec2, m]) => s + Number(sec2) * m * 1.2 * 0.00896 * 1.3, 0);
  return Math.ceil((involucro + placa + disp + barras + fiacao) / 5) * 5;
}

// ── Normas, características, verificações e seções ─────────────────────────

function normas(calc) {
  const { c, aut, dpsInfo, geral, barr } = calc;
  const maquina = c.maquina || aut.releSeguranca;
  const n = [
    { codigo: 'ABNT NBR IEC 61439-1', titulo: 'Conjuntos de manobra e comando de BT — regras gerais', aplicacao: 'Marcação da plaqueta (6.1), documentação (6.2), verificação de projeto (seção 10) e verificação de rotina de cada conjunto fabricado (seção 11 — checklist deste caderno).' },
    { codigo: 'ABNT NBR IEC 61439-2', titulo: 'Conjuntos de manobra e comando de potência (PSC)', aplicacao: `Forma de separação ${calc.inv.forma}, fator de diversidade nominal, características nominais do conjunto (InA ${geral.In} A, Icw ${barr.icw} kA).` },
  ];
  if (c.tipo === 'distribuicao' && geral.In <= 250) n.push({ codigo: 'ABNT NBR IEC 61439-3', titulo: 'Quadros de distribuição destinados a ser operados por pessoas comuns (DBO)', aplicacao: 'Se o quadro for acessível a pessoas comuns (In ≤ 250 A): requisitos adicionais de DBO (proteção, marcação) — confirmar o enquadramento com o uso [CONFERIR].' });
  n.push(
    { codigo: 'ABNT NBR 5410', titulo: 'Instalações elétricas de baixa tensão', aplicacao: 'Cores de N e PE (6.1.5.3), identificação dos componentes (6.5.4.9), distâncias de partes vivas (6.5.4.2), reserva (6.5.4.7), PE pela Tabela 58, DPS (6.3.5.2)' + (c.residencial ? ', advertência de 6.5.4.10' : '') + '.' },
    { codigo: 'ABNT NBR IEC 60529', titulo: 'Graus de proteção por invólucros (código IP)', aplicacao: `${calc.inv.ip} declarado: manter após furações (prensa-cabos, recortes da porta${calc.term.ventilacao ? ', ventilação com filtro' : ''}).` },
    { codigo: 'ABNT NBR IEC 62262', titulo: 'Proteção contra impactos mecânicos externos (código IK)', aplicacao: `${calc.inv.ik} do invólucro (certificado do fabricante).` },
    { codigo: 'IEC 60445 / IEC 60073', titulo: 'Identificação de terminais e condutores; cores de indicadores e atuadores', aplicacao: 'Marcação de bornes e condutores (anilhas); cores dos sinaleiros e botões da porta.' },
    { codigo: 'ABNT NBR IEC 60947 (partes 2, 4-1, 4-2, 5-1, 7-1)', titulo: 'Dispositivos de manobra e comando de BT', aplicacao: 'Cada componente montado conforme a sua norma e o manual do fabricante (distâncias, posição, torque).' },
    { codigo: 'DIN 43671 / DIN 43673-1', titulo: 'Barras de cobre: capacidade de corrente; furação das conexões', aplicacao: barr.tipo === 'barra' ? 'Seção das barras e furação/quantidade de parafusos das emendas.' : 'Barras N/PE (furação dos terminais).' },
    { codigo: 'NR-10', titulo: 'Segurança em instalações e serviços em eletricidade', aplicacao: 'Sinalização de segurança (10.10): advertência de risco elétrico na porta; documentação do conjunto.' },
    { codigo: 'ISO 7010 (W012)', titulo: 'Sinais de segurança — advertência de eletricidade', aplicacao: 'Pictograma triangular da placa de advertência.' },
  );
  if (maquina || aut.ativo || calc.motores.length) n.push({ codigo: 'ABNT NBR IEC 60204-1', titulo: 'Segurança de máquinas — equipamento elétrico', aplicacao: `Cores de botões e sinaleiros (10.2, 10.3, 10.7), cores da fiação de comando (13.2.4)${maquina ? ', parada de emergência (9.2.5.4) por relé de segurança' : ''}${c.maquina ? '' : ' — aplicada como boa prática ao comando de motores/automação'}.` });
  if (c.maquina) n.push({ codigo: 'NR-12', titulo: 'Segurança no trabalho em máquinas e equipamentos', aplicacao: 'Dispositivos de parada de emergência e sistemas de segurança (categoria pela apreciação de risco, NBR ISO 13849-1) [CONFERIR itens da NR-12 vigente].' });
  if (dpsInfo && /I/.test(dpsInfo.classe) && dpsInfo.classe !== 'II') n.push({ codigo: 'ABNT NBR 5419-4', titulo: 'Proteção contra descargas atmosféricas — sistemas internos', aplicacao: `DPS classe ${dpsInfo.classe} no ponto de entrada com SPDA.` });
  return n;
}

function caracteristicas(calc, massa) {
  const { c, geral, barr, inv, dem, term, layout } = calc;
  const env = layout.involucro;
  return [
    ['Conjunto', `${c.tag} — ${c.tipoRotulo}${c.descricao ? ` (${c.descricao})` : ''}`],
    ['Fabricante (montador)', 'H&M Engenharia e Tecnologia LTDA'],
    ['Norma do produto', 'ABNT NBR IEC 61439-1 e 61439-2'],
    ['Tensão nominal (Un) / de emprego (Ue)', `${c.vff}/${c.vfn} V, ${({ trifasico: 'trifásico', bifasico: 'bifásico', monofasico: 'monofásico' })[c.sistema]}, ${c.frequencia} Hz`],
    ['Tensão de isolamento (Ui) / impulso (Uimp)', `${c.ui} V / ${c.uimpKv} kV`],
    ['Corrente nominal do conjunto (InA)', `${geral.In} A (disjuntor geral ${geral.polos}P ${geral.In} A, ${geral.icu} kA)`],
    ['Corrente de curto-circuito', `Icc presumida ${num(c.icc, 1)} kA${c.iccInformada ? '' : ' (adotada [CONFERIR])'}; Icw ${barr.icw} kA / ${c.tempoIcw} s; Ipk ${num(c.ipk, 1)} kA`],
    ['Fator de diversidade nominal (RDF)', num(dem.fd, 2)],
    ['Esquema de aterramento', c.esquema],
    ['Grau de proteção / impacto', `${inv.ip} / ${inv.ik}`],
    ['Forma de separação', inv.formaTexto],
    ['Instalação', `${c.localInfo.rotulo}; ${c.montagem}; ambiente ${c.temperatura} °C (ar interno máx. ${c.temperaturaMax} °C); ${term.ventilacao ? `ventilação forçada ${term.ventilacao.ventilador} m³/h` : 'ventilação natural'}`],
    ['Compatibilidade eletromagnética', `Ambiente ${c.tipo === 'distribuicao' ? 'B (residencial/comercial)' : 'A (industrial)'} — NBR IEC 61439-1, 9.4 [CONFERIR]`],
    ['Dimensões (A × L × P)', `${env.altura} × ${env.largura} × ${env.profundidade} mm`],
    ['Massa estimada', `≈ ${massa} kg (estimativa — pesar o conjunto pronto) [CONFERIR]`],
  ];
}

function verificacoes(calc) {
  const { c, inv, barr, term } = calc;
  const vEnsaio = T.porFaixa(T.TENSAO_ENSAIO, c.ui);
  return [
    { item: 'Grau de proteção do invólucro (11.2)', criterio: `${inv.ip} mantido: prensa-cabos com vedação, recortes da porta com junta, flange vedada${term.ventilacao ? ', ventilador e grelha com filtro' : ''}`, norma: 'NBR IEC 61439-1, 11.2' },
    { item: 'Distâncias de isolamento e de escoamento (11.3)', criterio: `≥ ${n1(T.porFaixa(T.DISTANCIA_ISOLAMENTO, c.uimpKv))} mm no ar (Uimp ${c.uimpKv} kV) e ≥ ${n1(T.porFaixa(T.DISTANCIA_ESCOAMENTO, c.ui))} mm de escoamento (Ui ${c.ui} V); partes vivas nuas ≥ 10 mm entre si e ≥ 20 mm de massas`, norma: 'NBR IEC 61439-1, 11.3; NBR 5410, 6.5.4.2' },
    { item: 'Proteção contra choque e continuidade do PE (11.4)', criterio: 'Massa → barra PE ≤ 0,1 Ω (porta, placa, laterais, flange); cordoalhas instaladas; IPXXB com a porta aberta (espelho/proteção do barramento)', norma: 'NBR IEC 61439-1, 11.4 e 10.5.2' },
    { item: 'Incorporação dos componentes (11.5)', criterio: 'Todos os itens da lista de componentes, com a referência indicada, no lugar do layout; espaço de exaustão de arco conforme o fabricante', norma: 'NBR IEC 61439-1, 11.5' },
    { item: 'Circuitos internos e conexões (11.6)', criterio: `Torques da tabela conferidos com torquímetro e marcados com tinta${barr.tipo === 'barra' ? ' (100 % no barramento)' : ''}; seções e cores da tabela de fiação; ponteiras em todo condutor flexível`, norma: 'NBR IEC 61439-1, 11.6' },
    { item: 'Terminais para condutores externos (11.7)', criterio: 'Bornes e terminais compatíveis com as seções dos cabos de campo; régua numerada', norma: 'NBR IEC 61439-1, 11.7' },
    { item: 'Operação mecânica (11.8)', criterio: 'Porta, fecho, manoplas, seletores e intertravamentos operam sem esforço anormal', norma: 'NBR IEC 61439-1, 11.8' },
    { item: 'Propriedades dielétricas (11.9)', criterio: `${vEnsaio} V eficaz por 1 s entre fases e fases-massa, com eletrônicos (DPS, fonte, CLP, multimedidor) desconectados; ou isolamento ≥ 1 MΩ a 500 V CC quando admitido`, norma: 'NBR IEC 61439-1, 11.9 [CONFERIR]' },
    { item: 'Fiação, desempenho operacional e função (11.10)', criterio: `Fiação conforme os diagramas (anilhas nas duas pontas); teste funcional de cada circuito${calc.aut.ativo ? ', E/S do CLP ponto a ponto' : ''}${calc.aut.releSeguranca ? ', parada de emergência' : ''}; botão de teste dos DR`, norma: 'NBR IEC 61439-1, 11.10' },
    { item: 'Identificação', criterio: 'Plaquetas da porta, identificação externa, advertências, etiquetas dos dispositivos e marcação dos bornes conforme a folha de plaquetas', norma: 'NBR 5410, 6.5.4.9; NR-10, 10.10' },
    { item: 'Plaqueta H&M', criterio: 'Instalada com o nº de série/OS, data de fabricação e massa preenchidos (pesar)', norma: 'NBR IEC 61439-1, 6.1' },
    { item: 'Limpeza e acabamento', criterio: 'Sem limalha, rebarba, sobra de fio ou parafuso solto; tampas das canaletas fechadas; pintura retocada nos cortes', norma: 'Boa prática H&M' },
    { item: 'Documentação', criterio: 'Diagramas plastificados no porta-documentos; relatório de ensaios de rotina assinado', norma: 'NBR IEC 61439-1, 6.2' },
  ];
}

function secoesExtras(calc, ctx) {
  const { c, barr } = calc;
  const s = [];
  s.push({ titulo: 'Fiação interna — seções e cores', paragrafos: [
    'Cores: neutro azul-claro e PE verde-amarelo são obrigatórios (NBR 5410, 6.1.5.3). Fases em preto, identificadas por anilha (L1/L2/L3). No comando, NBR IEC 60204-1, 13.2.4: CA vermelho, CC azul-escuro; circuitos de intertravamento alimentados por fonte externa, laranja. [CONFERIR padrão do cliente]',
    'Seções da força pela corrente de cada circuito (memorial); comando 24 Vcc 0,75 mm², distribuição 24 Vcc 1,5 mm², comando CA 1,5 mm². Cabo flexível 750 V classe 5 com ponteira em todas as pontas; seções ≥ 50 mm² com terminal de compressão.',
  ], tabela: { colunas: ['Seção', 'Cor', 'Função', 'Condutores', 'Metros'], linhas: ctx.fiacao.linhas.map(f => [sec(f.secao), f.cor, f.funcao, String(f.n), String(f.metros)]), proporcoes: [0.7, 0.9, 3, 0.7, 0.6] } });
  const torques = [
    ...(barr.tipo === 'barra' ? TORQUE_88.filter(([d]) => d >= 6 && d <= 12).map(([d, t]) => [`Parafuso M${d} classe 8.8 (barramento, isoladores, terminais)`, `${t} N·m`, 'Com arruela lisa + de pressão; superfícies limpas [CONFERIR com o fabricante]']) : [['Parafuso M6 (barras N/PE, cordoalhas)', '5–6 N·m', '[CONFERIR]']]),
    ['Bornes de disjuntores modulares (DIN)', '2,5–3,5 N·m', 'Valor do fabricante do disjuntor [CONFERIR]'],
    ['Disjuntores de caixa moldada / disjuntor-motor', 'conforme o manual', 'Varia com a seção e o terminal [CONFERIR]'],
    ['Bornes de passagem a parafuso 2,5 / 4 / 6 / 10 / 16 mm²', '0,5–0,6 / 0,6–0,8 / 1,5–1,8 / 1,5–1,8 / 2,5–3,0 N·m', 'Faixa típica — usar o valor do fabricante [CONFERIR]'],
    ['Trilho DIN (M5) / placa de montagem (M6)', '3–4 / 5–6 N·m', 'Aço zincado [CONFERIR]'],
    ['Prensa-cabos (porca do corpo)', 'conforme o fabricante', 'Apertar até a vedação abraçar o cabo'],
  ];
  s.push({ titulo: 'Torques de aperto', paragrafos: ['Apertar com torquímetro calibrado e marcar cada conexão de potência com tinta (traço sobre parafuso e porca) — verificação de rotina 11.6.'], tabela: { colunas: ['Conexão', 'Torque', 'Observação'], linhas: torques, proporcoes: [2.6, 1.6, 2.6] } });
  s.push({ titulo: 'Furação e recortes', paragrafos: ['Marcar pelo desenho em escala e conferir com o gabarito do fabricante de cada dispositivo antes de furar. Proteger a placa contra limalha.'],
    tabela: { colunas: ['Peça', 'Item', 'Recorte / furo', 'Qtd.'], linhas: [...ctx.furacao.porta.map(f => ['Porta', f.item, f.recorte, String(f.qtd)]), ...ctx.furacao.placa.map(f => ['Placa', f.item, f.recorte, String(f.qtd)]), ...ctx.furacao.flange.map(f => ['Flange', f.item, f.recorte, String(f.qtd)])], proporcoes: [0.6, 2.4, 1.8, 0.4] } });
  const passos = [
    'Conferir a revisão do caderno, do desenho e da lista de componentes; separar os materiais por grupo (capítulo de materiais).',
    'Invólucro: retirar a placa, marcar e furar placa, porta e flange (tabela de furação); rebarbar e retocar a pintura.',
    'Placa de montagem: fixar trilhos (M5 a cada 250 mm) e canaletas (a cada 300 mm) nas posições do layout.',
    barr.tipo === 'barra' ? 'Barramento: cortar, furar e escovar as barras; montar os isoladores; fixar as barras (20 N·m) e as emendas com o torque da tabela; instalar a proteção de policarbonato.' : 'Barramentos: montar barras N e PE; o pente entra depois dos disjuntores.',
    'Dispositivos: montar na ordem do layout (fileira por fileira, tags iguais ao unifilar); caixas moldadas e soft-starters/inversores com os parafusos do gabarito.',
    'Bornes: montar as réguas com batentes, tampas finais e marcadores na ordem do detalhe das réguas.',
    'Fiação: força primeiro (seções e cores da tabela), depois comando; ponteira e anilha nas duas pontas; separar potência (canaleta esquerda) e comando (direita).',
    'Porta: montar botões, sinaleiros, IHM e ventilação; chicote em espiral pela dobradiça; cordoalhas de aterramento da porta e da placa.',
    'Identificação: plaquetas da porta (folha 1:1), identificação externa, advertências, etiquetas dos dispositivos, etiquetas de fase e a plaqueta H&M (rebites).',
    'Recolocar a placa no invólucro, ligar o PE à estrutura e fechar as tampas das canaletas.',
    'Verificação de rotina (capítulo de verificações) e relatório de ensaios; corrigir e repetir o que não passar.',
    'Limpeza, documentação no porta-documentos, pesar e preencher a plaqueta H&M; embalar com proteção dos componentes da porta.',
  ];
  s.push({ titulo: 'Sequência de montagem', marcadores: passos.map((t, i) => `${i + 1}. ${t}`) });
  return s;
}

// Furação/recortes da porta, da placa e da flange
function furacao(calc, ctx) {
  const porta = [];
  const nBot = ctx.PT.botoes.length;
  if (nBot) porta.push({ item: 'Botões, seletores e sinaleiros Ø 22 mm', recorte: 'Furo Ø 22,3 mm (com rasgo anti-giro 3,2 mm, se houver)', qtd: nBot });
  for (const m of ctx.PT.medidores) porta.push({ item: `Multimedidor ${m.ref}`, recorte: `${Math.round(m.l - 4)} × ${Math.round(m.a - 4)} mm (painel ${Math.round(m.l)} × ${Math.round(m.a)}) [CONFERIR datasheet]`, qtd: 1 });
  if (ctx.PT.ihm) porta.push({ item: `IHM ${calc.aut.ihm}"`, recorte: `≈ ${Math.round(ctx.PT.ihm.l - 10)} × ${Math.round(ctx.PT.ihm.a - 10)} mm [CONFERIR datasheet]`, qtd: 1 });
  for (const g of ctx.PT.grelhas) porta.push({ item: g.rotulo.toLowerCase(), recorte: `≈ ${g.l - 7} × ${g.a - 7} mm (recorte da grelha) [CONFERIR datasheet]`, qtd: 1 });
  if (ctx.hm.lugar) porta.push({ item: 'Plaqueta H&M', recorte: 'Furo Ø 3,3 mm para rebite (gabarito da plaqueta)', qtd: 4 });
  const placa = [];
  const trilhos = calc.layout.fileiras.filter(f => f.trilho).length;
  placa.push({ item: 'Trilhos DIN', recorte: 'Furo Ø 4,2 mm + rosca M5', qtd: trilhos * Math.max(2, Math.ceil(calc.layout.larguraUtil / 250) + 1) });
  if (calc.barr.tipo === 'barra' && calc.barr.isoladores) placa.push({ item: 'Isoladores do barramento', recorte: 'Furo Ø 9 mm', qtd: calc.barr.isoladores });
  const cm = calc.comps.lista.filter(k => k.tipo === 'disjuntor_cm' || (k.tipo === 'disjuntor_geral' && k.modulos == null)).length;
  if (cm) placa.push({ item: 'Disjuntores de caixa moldada', recorte: 'Furo Ø 4,2 mm + rosca M5 (gabarito do fabricante)', qtd: 4 * cm });
  const flange = Object.entries(ctx.prensas.porTamanho).map(([tam, g]) => ({ item: `Prensa-cabos ${tam}`, recorte: `Furo Ø ${Number(tam.slice(1)) + 0.5} mm (rosca métrica ${tam} × 1,5 ou contraporca)`, qtd: g.qtd }));
  return { porta, placa, flange };
}

// ── Montagem do objeto do caderno ──────────────────────────────────────────

function montarCaderno(res) {
  const { calc, dados } = res;
  const { c, layout, barr } = calc;
  const PT = posicoesPorta(calc);
  const IC = catalogoInfra(dados);
  const parafuso = barr.fase ? parafusoBarra(barr.fase.l) : parafusoBarra(10);
  const ctx = {
    PT, IC, parafuso, locais: locais(calc),
    alturaIsolador: Math.max(40, Math.round(c.entreFases / 2 / 5) * 5),
    compParafuso: barr.fase ? comprimentoParafuso(parafuso.d, 2 * barr.fase.e) : 20,
    profPecas: Math.max(...layout.fileiras.flatMap(f => f.itens.map(k => k.prof || T.DIN_PROF)), T.DIN_PROF),
    profPorta: Math.max(PT.botoes.length || PT.ihm ? 50 : 0, ...PT.medidores.map(m => m.p || 0)),
  };
  for (const f of layout.fileiras) if (f.zona === 'barramento') ctx.locais.set('BARR', `Placa, fileira ${layout.fileiras.indexOf(f) + 1} (barramento principal)`);
  ctx.juntas = juntasBarramento(calc, parafuso);
  ctx.fiacao = fiacaoPorCor(calc);
  ctx.prensas = prensaCabos(calc);
  const massa = massaEstimada(calc);

  // plaquetas: porta, identificação externa, advertências, H&M, etiquetas internas
  ctx.plaquetasPorta = plaquetasPorta(calc, PT);
  // 2ª linha: a descrição se for curta; senão o tipo do quadro (sem o parêntese)
  const funcaoId = c.descricao && c.descricao.length <= 26 ? c.descricao : c.tipoRotulo.replace(/\s*\(.*\)\s*/, '');
  ctx.plaquetaId = { tag: 'ID', texto: [c.tag, funcaoId.toUpperCase()], largura_mm: PT.placa.l, altura_mm: PT.placa.a, ...PLAQ.comando, local: 'Porta, no alto e centralizada', quantidade: 1, grupo: 'Identificação externa e advertência' };
  const avisoTri = { tag: 'AV1', texto: [], forma: 'triangulo', largura_mm: PT.aviso.l, altura_mm: Math.round(PT.aviso.l * 0.87), ...PLAQ.advertencia, local: 'Porta, canto superior esquerdo', quantidade: 1, grupo: 'Identificação externa e advertência' };
  const avisoTxt = { tag: 'AV2', texto: ['PERIGO', 'RISCO DE CHOQUE ELÉTRICO'], largura_mm: 100, altura_mm: 25, ...PLAQ.advertencia, quantidade: 1, grupo: 'Identificação externa e advertência' };
  // lugar livre na porta para a advertência escrita e a plaqueta H&M
  const ocup = [
    { x: PT.placa.x, y: PT.placa.y, l: PT.placa.l, a: PT.placa.a }, { x: PT.aviso.x, y: PT.aviso.y, l: PT.aviso.l, a: PT.aviso.l },
    { x: PT.fecho.x - 10, y: PT.fecho.y, l: PT.fecho.l + 30, a: PT.fecho.a }, { x: 0, y: 0, l: 25, a: layout.involucro.altura },
    ...PT.medidores.map(m => ({ x: m.x, y: m.y - 20, l: m.l, a: m.a + 20 })),
    ...(PT.ihm ? [{ x: PT.ihm.x, y: PT.ihm.y - 20, l: PT.ihm.l, a: PT.ihm.a + 20 }] : []),
    ...PT.botoes.map(b => ({ x: b.cx - 35, y: b.cy - (b.tipo === 'emergencia' ? 34 : b.d / 2 + 7) - BOTAO_PLAQ.a, l: 70, a: (b.tipo === 'emergencia' ? 34 : b.d / 2 + 7) + BOTAO_PLAQ.a + 45 })),
    ...PT.grelhas.map(g => ({ x: g.x, y: g.y - 20, l: g.l, a: g.a + 20 })),
  ];
  const W = layout.involucro.largura, H = layout.involucro.altura;
  const lugarHm = lugarLivre(W, H, ocup, 100, 70);
  if (lugarHm) ocup.push(lugarHm);
  const lugarAviso = lugarLivre(W, H, ocup, 100, 25);
  avisoTxt.local = lugarAviso ? 'Porta, face externa (posição no desenho)' : 'Face interna da porta (sem espaço livre na face externa)';
  ctx.avisoTexto = { lugar: lugarAviso, plaqueta: avisoTxt };
  const modelo = `H&M ${PREFIXO_MODELO[c.tipo] || 'QD'}-61439 / ${c.tag}`;
  const plaquetaHm = {
    modelo, subtitulo: 'Conjunto de manobra e comando de BT',
    numero_serie: dados.meta?.documento_n ? `OS ${dados.meta.documento_n}` : 'preencher na fabricação',
    dados: [
      ['Norma', 'ABNT NBR IEC 61439-1/-2'], ['Fabricação', '____/______'],
      ['Un / Ui', `${c.vff}/${c.vfn} V / ${c.ui} V`], ['Uimp', `${c.uimpKv} kV`], ['InA', `${calc.geral.In} A`], ['f', `${c.frequencia} Hz`],
      ['Icw', `${barr.icw} kA / ${c.tempoIcw} s`], ['Ipk', `${num(c.ipk, 1)} kA`], ['IP / IK', `${calc.inv.ip} / ${calc.inv.ik}`], ['Forma', calc.inv.forma],
      ['Esquema', c.esquema], ['Massa', `≈ ${massa} kg`],
    ],
    largura_mm: 100, altura_mm: 70, ...PLAQ.hm, local: lugarHm ? 'Porta, face externa (posição no desenho)' : 'Face interna da porta (sem espaço livre na face externa)',
  };
  ctx.plaquetaHm = plaquetaHm;
  ctx.hm = { lugar: lugarHm };
  ctx.furacao = furacao(calc, ctx);

  // etiquetas internas (lista, sem desenho): uma por dispositivo, filho de partida e régua
  const etiquetas = [];
  for (const k of calc.comps.lista) {
    if (k.zona === 'porta') continue;
    if (k.filhos) { etiquetas.push({ tag: k.ref, local: `Partida ${k.ref} (bloco)` }); k.filhos.forEach(f => etiquetas.push({ tag: `${k.ref}/${f.ref}`, local: `Partida ${k.ref}` })); } else etiquetas.push({ tag: k.ref, local: ctx.locais.get(k.ref) || 'Placa' });
  }
  calc.born.forEach(g => etiquetas.push({ tag: g.id, local: `Régua ${g.id}` }));
  ctx.etiquetas = etiquetas.length;
  // uma linha só na lista (o texto de cada etiqueta é a própria tag)
  const plaquetasEtiquetas = [{ tag: 'ETQ', texto: [`Uma etiqueta por tag: ${etiquetas.map(x => x.tag).join(', ')}`], largura_mm: 15, altura_mm: 6, ...PLAQ.etiqueta, local: 'No dispositivo e na placa/espelho logo acima dele', quantidade: 2 * etiquetas.length, grupo: 'Etiquetas internas (dispositivos)', desenhar: false }];
  const fasesBarra = ['L1', 'L2', 'L3'].slice(0, c.nFases).concat(barr.nBarras > c.nFases ? ['N'] : [], ['PE']);
  const plaquetasBarras = barr.tipo === 'barra' && barr.fase ? [{ tag: 'FASES', texto: [`${fasesBarra.join(', ')} (N azul-claro, PE verde-amarelo)`], largura_mm: 20, altura_mm: 10, material: 'Etiqueta adesiva', fundo: '#fff', letra: '#111', fixacao: 'Autoadesiva, nas pontas de cada barra', local: 'Barramento', quantidade: 2 * fasesBarra.length, grupo: 'Etiquetas internas (dispositivos)', desenhar: false }] : [];

  const desenhos = [desenhoFrontal(calc, ctx), desenhoInterno(calc), desenhoBarramento(calc, ctx), desenhoBornes(calc)].filter(Boolean);
  const semAlvo = (pl) => { const { alvo, ordem, ...resto } = pl; return resto; };
  const avisos = [
    ...calc.avisos,
    'Medidas e referências marcadas [CONFERIR] são típicas: confirmar com o datasheet dos modelos comprados antes de furar a placa e a porta.',
    'Torques, parafusos, prensa-cabos e massa são valores típicos de boa prática — usar o valor do fabricante de cada componente quando houver. [CONFERIR]',
    ...(lugarHm ? [] : ['Sem espaço livre na face externa da porta para a plaqueta H&M: instalada na face interna. [CONFERIR]']),
    ...((calc.componentes_sem_medida || []).length ? [`Sem medida oficial no catálogo: ${calc.componentes_sem_medida.map(x => `${x.tag} — ${x.especificacao}`).join('; ')}.`] : []),
  ];
  return {
    tipo: 'quadro', sigla: 'CAD-QD', titulo: 'CADERNO DE FABRICAÇÃO E MONTAGEM',
    subtitulo: `${c.tag} — ${c.tipoRotulo}${c.descricao ? ` — ${c.descricao}` : ''}`,
    tag: c.tag, revisao: String(dados.meta?.revisao || 'R00'), data: dados.meta?.data ? String(dados.meta.data).slice(0, 10).split('-').reverse().join('/') : '',
    dados,
    normas: normas(calc),
    caracteristicas: caracteristicas(calc, massa),
    desenhos,
    componentes: componentes(calc, ctx),
    barramentos: barramentos(calc, ctx),
    materiais_montagem: materiaisMontagem(calc, ctx),
    plaquetas: [...ctx.plaquetasPorta.map(semAlvo), ctx.plaquetaId, avisoTri, avisoTxt,
      ...(c.residencial ? [{ tag: 'AV3', texto: ['ADVERTÊNCIA — NBR 5410, 6.5.4.10', '(texto integral da norma)'], largura_mm: 100, altura_mm: 70, ...PLAQ.advertencia, local: 'Porta, face interna ou externa', quantidade: 1, grupo: 'Identificação externa e advertência', desenhar: false }] : []),
      ...plaquetasBarras, ...plaquetasEtiquetas],
    plaqueta_hm: plaquetaHm,
    secoes: secoesExtras(calc, ctx),
    verificacoes: verificacoes(calc),
    avisos,
  };
}

async function gerarPdf(res) {
  return CAD.gerarCadernoPdf(montarCaderno(res));
}

module.exports = { montarCaderno, gerarPdf, parafusoBarra, prensaCabos, fiacaoPorCor };
