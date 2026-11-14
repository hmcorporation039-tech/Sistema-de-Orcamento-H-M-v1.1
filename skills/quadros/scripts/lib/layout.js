// Arranjo físico do quadro: distribui os componentes em fileiras sobre a placa
// de montagem (de cima para baixo: geral → entrada/DPS/medição → barramento →
// circuitos → placa → partidas → comando 24 Vcc → CLP → relés → barras N/PE →
// bornes), com canaleta horizontal sob cada fileira e canaletas verticais nas
// laterais (esquerda = potência, direita = comando), reserva de espaço (NBR
// 5410, 6.5.4.7 e Tabela 59, e a reserva percentual do projeto) e escolhe o
// MENOR invólucro da série comercial (./tabelas.js → INVOLUCROS) que comporta
// o arranjo na altura, na largura e na profundidade.
//
// Regra do invólucro (documentada no memorial): percorre a série em ordem de
// área frontal (A × L) e fica com o primeiro em que (1) a maior peça cabe na
// largura útil, (2) a soma das fileiras + entrada de cabos cabe na altura da
// placa e (3) a profundidade comercial ≥ peça mais funda + folga da porta.
// Coordenadas em mm a partir do canto superior esquerdo da placa.

const T = require('./tabelas');

const FOLGA_FILEIRA = 15;      // acima e abaixo dos dispositivos (fiação nos terminais)
const ESPACO_ENTRE = 5;        // entre peças não modulares na mesma fileira
const ENTRADA_CABOS = 100;     // faixa livre para a chegada dos cabos (prensa-cabos/flange)
const TOPO_LIVRE = 30;
const ZONAS = ['geral', 'entrada', 'barramento', 'distribuicao', 'placa', 'partidas', 'comando', 'clp', 'reles', 'barras_np', 'bornes'];
const ROTULO_ZONA = {
  geral: 'Entrada — disjuntor geral', entrada: 'Entrada — geral, DPS e medição', barramento: 'Barramento principal', distribuicao: 'Circuitos de distribuição',
  placa: 'Disjuntores de caixa moldada', partidas: 'Partidas de motores', comando: 'Comando — fonte 24 Vcc e proteções', clp: 'CLP e módulos de E/S',
  reles: 'Relés de interface', barras_np: 'Barramentos de neutro e terra', bornes: 'Réguas de bornes',
};
const ZONAS_COMANDO = new Set(['comando', 'clp', 'reles']);

const modular = (k) => k.modulos != null;

// Itens por zona, já com a reserva
function itensPorZona(ctx) {
  const { c, comps, born, barr, reservaCircuitos } = ctx;
  const z = Object.fromEntries(ZONAS.map(n => [n, []]));
  // fora das fileiras: zona 'porta' (multimedidor de painel em recorte → ./porta.js) e
  // 'sobre_barramento' (TCs enfiados nas barras → tcNasBarras)
  for (const k of comps) if (z[k.zona]) z[k.zona].push({ ...k });
  // reserva da distribuição: espaços do dispositivo de circuito mais comum
  const circ = z.distribuicao.filter(k => k.tipo === 'disjuntor' || k.tipo === 'ddr');
  if (circ.length || reservaCircuitos) {
    const contagem = {};
    circ.forEach(k => { contagem[k.modulos] = (contagem[k.modulos] || 0) + 1; });
    const mod = Number(Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] || 1);
    z.distribuicao.push({ ref: 'RES', tipo: 'reserva', zona: 'distribuicao', descricao: `Reserva: ${reservaCircuitos} circuitos × ${mod} módulo(s)`, largura: reservaCircuitos * mod * T.MODULO_MM, modulos: reservaCircuitos * mod, altura: T.DIN_ALTURA, divisivel: mod * T.MODULO_MM, perda: 0 });
  }
  // reserva percentual nas zonas DIN de comando/automação
  for (const n of ['comando', 'clp', 'reles']) {
    const comp = z[n].reduce((s, k) => s + k.largura, 0);
    if (comp > 0) z[n].push({ ref: 'RES', tipo: 'reserva', zona: n, descricao: `Reserva ${Math.round(c.reservaPct * 100)} %`, largura: Math.ceil(comp * c.reservaPct / T.MODULO_MM) * T.MODULO_MM, modulos: Math.ceil(comp * c.reservaPct / T.MODULO_MM), altura: T.DIN_ALTURA, divisivel: T.MODULO_MM, perda: 0 });
  }
  // barramento de barras (fases + N) na faixa logo abaixo da entrada
  if (barr.tipo === 'barra') {
    z.barramento.push({ ref: 'BARR', tipo: 'barramento', zona: 'barramento', descricao: `Barramento ${barr.nBarras} barras`, largura: null, altura: barr.nBarras * c.entreFases + 20, perda: 0 });
  }
  // barras N (pente) e PE
  // barras N/PE com furação em duas fileiras (passo 10 mm): furos = saídas + reserva + 2
  const nPe = comps.filter(k => k.circuito || k.motor).length;
  const nN = ctx.nNeutros ?? nPe;
  const largura = (n) => Math.ceil((n + Math.ceil(n * c.reservaPct) + 2) / 2) * 10 + 30;
  if (barr.tipo === 'pente' && c.esquema !== 'TN-C') z.barras_np.push({ ref: 'XN', tipo: 'barra_neutro', zona: 'barras_np', descricao: 'Barramento de neutro', largura: largura(nN), altura: 40, divisivel: 10, perda: 0 });
  z.barras_np.push({ ref: 'XPE', tipo: 'barra_pe', zona: 'barras_np', descricao: 'Barramento de terra (PE)', largura: largura(nPe), altura: 40, divisivel: 10, perda: 0 });
  // bornes (cada grupo vira um item divisível)
  for (const g of born) {
    z.bornes.push({ ref: g.id, tipo: 'bornes', zona: 'bornes', descricao: `${g.id} — ${g.funcao} (${g.total} + ${g.reserva} reserva)`, largura: Math.ceil(g.comprimento), altura: g.altura || T.BORNE_ALTURA, prof: g.prof || 50, divisivel: 10, perda: 0, grupoBornes: g, medida: g.medida });
  }
  return z;
}

// Empacota os itens de uma zona em fileiras de largura `L`
function empacotar(itens, L) {
  const fileiras = [];
  let atual = null;
  const nova = () => { atual = { itens: [], usado: 0 }; fileiras.push(atual); };
  const larguraGrupo = (i0) => {
    const g = itens[i0].grupo;
    if (!g || itens[i0].tipo !== 'idr') return itens[i0].largura;
    let s = 0;
    for (let i = i0; i < itens.length && (i === i0 || itens[i].grupo === g); i++) s += itens[i].largura;
    return s;
  };
  for (let i = 0; i < itens.length; i++) {
    const k = itens[i];
    if (!atual) nova();
    const sep = atual.itens.length && !(modular(k) && modular(atual.itens[atual.itens.length - 1])) ? ESPACO_ENTRE : 0;
    // grupo DR inteiro na mesma fileira quando couber numa fileira vazia
    const lg = larguraGrupo(i);
    if (k.tipo === 'idr' && atual.usado + sep + lg > L && lg <= L && atual.itens.length) nova();
    const sep2 = atual.itens.length && !(modular(k) && modular(atual.itens[atual.itens.length - 1])) ? ESPACO_ENTRE : 0;
    if (atual.usado + sep2 + k.largura <= L + 1e-9) {
      atual.itens.push({ ...k, x: atual.usado + sep2 });
      atual.usado += sep2 + k.largura;
      continue;
    }
    if (k.divisivel) {
      // divide (reserva, bornes) no que couber
      let resto = k.largura;
      let parte = 0;
      while (resto > 1e-9) {
        const sepD = atual.itens.length ? ESPACO_ENTRE : 0;
        let livre = Math.floor((L - atual.usado - sepD) / k.divisivel) * k.divisivel;
        if (livre <= 0) { nova(); continue; }
        const w = Math.min(resto, livre);
        atual.itens.push({ ...k, largura: w, modulos: k.modulos != null ? Math.round(w / T.MODULO_MM) : undefined, x: atual.usado + sepD, parte: ++parte });
        atual.usado += sepD + w;
        resto -= w;
        if (resto > 1e-9) nova();
      }
      continue;
    }
    if (k.largura > L) return null; // peça maior que a largura útil
    nova();
    atual.itens.push({ ...k, x: 0 });
    atual.usado = k.largura;
  }
  return fileiras;
}

function canaletaPara(area) {
  const util = area / T.OCUPACAO_CANALETA;
  const d = T.CANALETAS.find(([l, h]) => l * h >= util && l >= 30) || T.CANALETAS[T.CANALETAS.length - 1];
  return { largura: d[0], altura: d[1], ocupacao: area / (d[0] * d[1]), area };
}

function tentar(inv, fam, ctx) {
  const { c, zonas, fio, porta } = ctx;
  const placa = { altura: inv.altura - fam.margemPlaca[0], largura: inv.largura - fam.margemPlaca[1] };
  const vE = fio.vertical.esquerda;
  const vD = fio.vertical.direita;
  const x0 = T.MARGEM_UTIL + vE.largura + 10;
  const larguraUtil = placa.largura - 2 * T.MARGEM_UTIL - vE.largura - vD.largura - 20;
  if (larguraUtil < 150) return null;
  const fileiras = [];
  // zonas compatíveis dividem a mesma fileira (potência DIN; comando 24 Vcc); com barramento
  // de barras a entrada fica acima das barras e os circuitos abaixo
  const grupos = zonas.barramento.length
    ? [['geral'], ['entrada'], ['barramento'], ['distribuicao'], ['placa'], ['partidas'], ['comando', 'clp', 'reles'], ['barras_np', 'bornes']]
    : [['geral'], ['entrada', 'distribuicao'], ['placa'], ['partidas'], ['comando', 'clp', 'reles'], ['barras_np', 'bornes']];
  for (const grupo of grupos) {
    let itens = grupo.flatMap(n => zonas[n]);
    // partidas e caixas moldadas: as mais altas juntas na mesma fileira (aproveita a altura; a ordem do unifilar fica na legenda)
    if (grupo[0] === 'partidas' || grupo[0] === 'placa') itens = [...itens].sort((a, b) => (b.altura || 0) - (a.altura || 0));
    if (!itens.length) continue;
    if (grupo[0] === 'barramento') {
      fileiras.push({ zona: 'barramento', zonas: ['barramento'], itens: [{ ...itens[0], x: 0, largura: larguraUtil }], usado: larguraUtil, trilho: false });
      continue;
    }
    const f = empacotar(itens, larguraUtil);
    if (!f) return null;
    const area = grupo.reduce((s, n) => s + (fio.porZona[n] || 0), 0) / f.length;
    for (const fl of f) {
      const zs = [...new Set(fl.itens.map(k => k.zona))];
      fileiras.push({ zona: zs[0], zonas: zs, ...fl, trilho: !['placa', 'barras_np'].includes(zs[0]), areaFiacao: area });
    }
  }
  // alturas: dispositivo + folgas + canaleta horizontal (sob a fileira)
  let y = TOPO_LIVRE + (c.entradaCabos === 'superior' ? ENTRADA_CABOS : 0);
  const ductTopo = canaletaPara(fileiras[0] ? (fileiras[0].areaFiacao || 0) : 0);
  const horizontais = [{ y, largura: ductTopo.largura, altura: ductTopo.altura, ocupacao: 0, zona: 'topo' }];
  y += ductTopo.largura;
  for (const f of fileiras) {
    const hMax = Math.max(...f.itens.map(k => k.altura || T.DIN_ALTURA));
    f.y = y + FOLGA_FILEIRA;
    f.altura = hMax;
    y += hMax + 2 * FOLGA_FILEIRA;
    if (f.zona !== 'barramento') {
      const d = canaletaPara(Math.max(f.areaFiacao || 0, 1));
      const dd = f.zona === 'bornes' ? canaletaPara(Math.max(fio.areaPot + fio.areaCmd, 1) / Math.max(1, fileiras.filter(x => x.zona === 'bornes').length) / 2) : d;
      f.canaleta = { y, ...dd };
      horizontais.push({ y, largura: dd.largura, altura: dd.altura, ocupacao: dd.ocupacao, zona: f.zona });
      y += dd.largura;
    }
  }
  const alturaNecessaria = y + (c.entradaCabos === 'inferior' ? ENTRADA_CABOS : 0) + T.MARGEM_UTIL;
  const profPecas = Math.max(...fileiras.flatMap(f => f.itens.map(k => k.prof || T.DIN_PROF)), T.DIN_PROF);
  // dispositivos de porta entram para dentro do quadro: botoeiras/IHM ~50 mm, multimedidor de painel pela medida dele
  const profPorta = Math.max(porta.length || ctx.aut.ihm ? 50 : 0, ...ctx.comps.filter(k => k.zona === 'porta').map(k => k.prof || 0));
  const profNecessaria = Math.max(profPecas + T.FOLGA_PORTA + profPorta, Math.max(vE.altura, vD.altura) + 30);
  return { placa, larguraUtil, x0, fileiras, horizontais, alturaNecessaria, profNecessaria, cabeAltura: alturaNecessaria <= placa.altura };
}

// ── Arranjo por ZONAS (quadro.layout = 'zonas'; projeto pela especificação, 09/11/2026) ─────
// O arranjo acima empilha cada zona numa fileira de largura total — num quadro de força e comando
// (geral + barramento + caixas moldadas + inversores + comando por relés) isso pede ~1,9 m de placa.
// Aqui, como se monta na prática (força no alto, comando à direita separado por chapa):
//   faixa A: geral (+ entrada/DPS) à esquerda e o barramento horizontal à direita, na mesma faixa;
//   faixa B: saídas de força (caixas moldadas, disjuntores-motor) e o que sobrou da entrada;
//   faixa C: acionamentos (inversores/soft, no fluxo de ar) | chapa separadora | comando (circuitos
//            DIN, fonte, relés auxiliares, CLP) empilhado em fileiras da largura da coluna;
//   faixa D: barras N/PE e réguas de bornes.
// Canaleta horizontal sob cada faixa. Cada fileira guarda trilhoX/trilhoL (o trilho só na coluna dela).
const SEPARADOR = 30;          // chapa separadora força | comando (com folga)
const BARRAMENTO_MIN = 250;    // comprimento mínimo útil do barramento ao lado do geral
const COLUNA_COMANDO_MIN = 200;

function tentarZonas(inv, fam, ctx) {
  const { c, fio, porta } = ctx;
  let { zonas } = ctx;
  const placa = { altura: inv.altura - fam.margemPlaca[0], largura: inv.largura - fam.margemPlaca[1] };
  const vE = fio.vertical.esquerda;
  const vD = fio.vertical.direita;
  const x0 = T.MARGEM_UTIL + vE.largura + 10;
  const L = placa.largura - 2 * T.MARGEM_UTIL - vE.largura - vD.largura - 20;
  if (L < 300) return null;
  const faixas = [];
  const area = (ns) => ns.reduce((s, n) => s + (fio.porZona[n] || 0), 0);
  const linha = (itens, zona, extra = {}) => ({ zona, zonas: [...new Set(itens.map(k => k.zona))], itens, usado: itens.reduce((s, k) => Math.max(s, k.x + k.largura), 0), trilho: itens.some(k => k.modulos != null), ...extra });
  // A: geral + entrada | barramento
  const topo = [...zonas.geral, ...zonas.entrada];
  const barr = zonas.barramento[0];
  let sobraEntrada = [];
  if (topo.length || barr) {
    const fA = topo.length ? (empacotar(topo, L) || []) : [];
    let itensA = fA[0] ? fA[0].itens : [];
    if (fA.length > 1) sobraEntrada = fA.slice(1).flatMap(f => f.itens).map(({ x, ...k }) => k);
    let wA = fA[0] ? fA[0].usado : 0;
    if (barr && L - wA - 20 < BARRAMENTO_MIN) {
      // não cabe ao lado: a entrada vai para a faixa B e o geral fica com o barramento
      sobraEntrada = [...topo.filter(k => k.zona !== 'geral'), ...sobraEntrada.filter(k => k.zona === 'geral')];
      const fg = empacotar(topo.filter(k => k.zona === 'geral'), L) || [];
      itensA = fg[0] ? fg[0].itens : [];
      wA = itensA.reduce((s, k) => Math.max(s, k.x + k.largura), 0);
    }
    const itens = [...itensA];
    if (barr) itens.push({ ...barr, x: wA ? wA + 20 : 0, largura: L - (wA ? wA + 20 : 0) });
    const modA = itensA.filter(k => k.modulos != null);
    faixas.push({ fileiras: [linha(itens, itensA.length ? 'geral' : 'barramento', { trilho: modA.length > 0, trilhoX: modA.length ? Math.min(...modA.map(k => k.x)) : 0, trilhoL: modA.length ? wA - Math.min(...modA.map(k => k.x)) : 0 })], areaFiacao: area(['geral', 'entrada']) });
  }
  // B: saídas de força — quando as saídas e os acionamentos cabem numa coluna à esquerda, o comando
  // ocupa a coluna da direita desde a faixa B (B e C viram uma faixa só, como na montagem real)
  const itensB = [...zonas.placa, ...sobraEntrada].sort((a, b) => (b.altura || 0) - (a.altura || 0));
  const acion0 = zonas.partidas;
  const cmd0 = [...zonas.distribuicao, ...zonas.comando, ...zonas.clp, ...zonas.reles];
  const wB = itensB.reduce((s, k) => s + k.largura, 0) + Math.max(0, itensB.length - 1) * ESPACO_ENTRE;
  const wA0 = acion0.reduce((s, k) => s + k.largura, 0) + Math.max(0, acion0.length - 1) * 20;
  const WL = Math.max(wB, wA0);
  if (itensB.length && acion0.length && cmd0.length && L - WL - SEPARADOR >= COLUNA_COMANDO_MIN) {
    const WR = L - WL - SEPARADOR;
    const fB = empacotar(itensB, WL);
    const fd = empacotar(cmd0, WR);
    if (!fB || !fd) return null;
    let xx = 0;
    const itensE = acion0.map(k => { const it = { ...k, x: xx }; xx += k.largura + 20; return it; });
    const xD = WL + SEPARADOR;
    faixas.push({
      colunas: true, separadorX: WL + SEPARADOR / 2,
      esquerda: [...fB.map(fl => linha(fl.itens, 'placa', { trilho: fl.itens.some(k => k.modulos != null), trilhoX: 0, trilhoL: WL, coluna: 'esquerda' })), linha(itensE, 'partidas', { trilho: false, coluna: 'esquerda' })],
      direita: fd.map(fl => linha(fl.itens.map(k => ({ ...k, x: k.x + xD })), fl.itens[0].zona, { trilho: true, trilhoX: xD, trilhoL: WR, coluna: 'direita' })),
      areaFiacao: area(['placa', 'entrada', 'partidas', 'distribuicao', 'comando', 'clp', 'reles']),
    });
    zonas = { ...zonas, partidas: [], distribuicao: [], comando: [], clp: [], reles: [] };
  } else if (itensB.length) {
    const f = empacotar(itensB, L);
    if (!f) return null;
    faixas.push({ fileiras: f.map(fl => linha(fl.itens, 'placa', { trilhoX: 0, trilhoL: L })), areaFiacao: area(['placa', 'entrada']) });
  }
  // C: acionamentos | comando
  const acion = zonas.partidas;
  const cmd = [...zonas.distribuicao, ...zonas.comando, ...zonas.clp, ...zonas.reles];
  const wAcion = acion.reduce((s, k) => s + k.largura, 0) + Math.max(0, acion.length - 1) * 20;
  if (acion.length || cmd.length) {
    const WR = acion.length ? L - wAcion - SEPARADOR : L;
    if (acion.length && cmd.length && WR >= COLUNA_COMANDO_MIN) {
      let xx = 0;
      const itensE = acion.map(k => { const it = { ...k, x: xx }; xx += k.largura + 20; return it; });
      const fd = empacotar(cmd, WR);
      if (!fd) return null;
      const xD = wAcion + SEPARADOR;
      faixas.push({
        colunas: true, separadorX: wAcion + SEPARADOR / 2,
        esquerda: [linha(itensE, 'partidas', { trilho: false, coluna: 'esquerda' })],
        direita: fd.map(fl => linha(fl.itens.map(k => ({ ...k, x: k.x + xD })), fl.itens[0].zona, { trilho: true, trilhoX: xD, trilhoL: WR, coluna: 'direita' })),
        areaFiacao: area(['partidas', 'distribuicao', 'comando', 'clp', 'reles']),
      });
    } else {
      for (const grupo of [acion, cmd]) {
        if (!grupo.length) continue;
        const f = empacotar(grupo, L);
        if (!f) return null;
        faixas.push({ fileiras: f.map(fl => linha(fl.itens, fl.itens[0].zona, { trilho: grupo !== acion, trilhoX: 0, trilhoL: L })), areaFiacao: area(grupo === acion ? ['partidas'] : ['distribuicao', 'comando', 'clp', 'reles']) });
      }
    }
  }
  // D: barras N/PE e bornes
  const itensD = [...zonas.barras_np, ...zonas.bornes];
  if (itensD.length) {
    const f = empacotar(itensD, L);
    if (!f) return null;
    faixas.push({ fileiras: f.map(fl => linha(fl.itens, fl.itens.some(k => k.tipo === 'bornes') ? 'bornes' : 'barras_np', { trilho: fl.itens.some(k => k.tipo === 'bornes'), trilhoX: 0, trilhoL: L })), areaFiacao: Math.max(fio.areaPot + fio.areaCmd, 1) / 2 });
  }
  // alturas: faixa a faixa; na faixa de colunas vale a mais alta
  let y = TOPO_LIVRE + (c.entradaCabos === 'superior' ? ENTRADA_CABOS : 0);
  const ductTopo = canaletaPara(faixas[0] ? faixas[0].areaFiacao : 0);
  const horizontais = [{ y, largura: ductTopo.largura, altura: ductTopo.altura, ocupacao: 0, zona: 'topo' }];
  y += ductTopo.largura;
  const fileiras = [];
  const separadores = [];
  const empilhar = (lista, y0) => {
    let yy = y0;
    for (const f of lista) {
      const hMax = Math.max(...f.itens.map(k => k.altura || T.DIN_ALTURA));
      f.y = yy + FOLGA_FILEIRA;
      f.altura = hMax;
      yy += hMax + 2 * FOLGA_FILEIRA;
      fileiras.push(f);
    }
    return yy;
  };
  for (const fx of faixas) {
    const y0 = y;
    if (fx.colunas) {
      const yE = empilhar(fx.esquerda, y0);
      const yD = empilhar(fx.direita, y0);
      y = Math.max(yE, yD);
      separadores.push({ x: fx.separadorX, y0, y1: y });
    } else y = empilhar(fx.fileiras, y0);
    // a última faixa (réguas de bornes) não leva canaleta embaixo: os cabos de campo saem direto pela flange
    if (fx === faixas[faixas.length - 1] && fileiras[fileiras.length - 1].zona === 'bornes') continue;
    const d = canaletaPara(Math.max(fx.areaFiacao || 0, 1));
    const ultima = fileiras[fileiras.length - 1];
    horizontais.push({ y, largura: d.largura, altura: d.altura, ocupacao: d.ocupacao, zona: ultima.zona });
    ultima.canaleta = { y, ...d };
    y += d.largura;
  }
  const alturaNecessaria = y + (c.entradaCabos === 'inferior' ? ENTRADA_CABOS : 0) + T.MARGEM_UTIL;
  const profPecas = Math.max(...fileiras.flatMap(f => f.itens.map(k => k.prof || T.DIN_PROF)), T.DIN_PROF);
  const profPorta = Math.max(porta.length || ctx.aut.ihm ? 50 : 0, ...ctx.comps.filter(k => k.zona === 'porta').map(k => k.prof || 0));
  const profNecessaria = Math.max(profPecas + T.FOLGA_PORTA + profPorta, Math.max(vE.altura, vD.altura) + 30);
  return { placa, larguraUtil: L, x0, fileiras, horizontais, separadores, alturaNecessaria, profNecessaria, cabeAltura: alturaNecessaria <= placa.altura, modo: 'zonas' };
}

function montarLayout(ctx) {
  const { c, fio } = ctx;
  const fam = T.INVOLUCROS[c.montagem];
  const zonas = itensPorZona(ctx);
  const serie = [...fam.alturasLarguras].sort((a, b) => a[0] * a[1] - b[0] * b[1] || a[0] - b[0]);
  let escolha = null;
  let ultimo = null;
  const tentativas = [];
  for (const [h, l] of serie) {
    const r = (c.layoutZonas ? tentarZonas : tentar)({ altura: h, largura: l }, fam, { ...ctx, zonas });
    if (!r) { tentativas.push({ altura: h, largura: l, motivo: 'peça maior que a largura útil' }); continue; }
    ultimo = { h, l, r };
    const prof = fam.profundidades.find(p => p >= r.profNecessaria);
    if (!r.cabeAltura) { tentativas.push({ altura: h, largura: l, motivo: `altura necessária ${Math.ceil(r.alturaNecessaria)} mm > placa ${r.placa.altura} mm` }); continue; }
    if (!prof) { tentativas.push({ altura: h, largura: l, motivo: `profundidade necessária ${Math.ceil(r.profNecessaria)} mm acima da série` }); continue; }
    escolha = { h, l, p: prof, r };
    break;
  }
  const cabe = !!escolha;
  if (!escolha) {
    const [h, l] = serie[serie.length - 1];
    const r = ultimo && ultimo.h === h ? ultimo.r : (c.layoutZonas ? tentarZonas : tentar)({ altura: h, largura: l }, fam, { ...ctx, zonas }) || ultimo?.r;
    escolha = { h, l, p: fam.profundidades[fam.profundidades.length - 1], r };
  }
  const r = escolha.r;
  // metragem de canaletas
  const metros = {};
  const somaM = (d, m) => { const k = `${d.largura} × ${d.altura}`; metros[k] = (metros[k] || 0) + m; };
  r.horizontais.forEach(d => somaM(d, r.larguraUtil / 1000 + 0.02));
  (r.separadores || []).forEach(sp => somaM(fio.vertical.direita, (sp.y1 - sp.y0) / 1000)); // canaleta vertical junto à chapa separadora
  const alturaVert = (r.placa.altura - 2 * T.MARGEM_UTIL) / 1000;
  somaM(fio.vertical.esquerda, alturaVert);
  somaM(fio.vertical.direita, alturaVert);
  // ocupação dos trilhos e reserva
  const trilhos = r.fileiras.filter(f => f.trilho);
  const compTrilho = (f) => f.trilhoL ?? r.larguraUtil;
  const ocupacaoTrilho = trilhos.length ? trilhos.reduce((s, f) => s + f.itens.filter(k => k.tipo !== 'reserva').reduce((a, k) => a + k.largura, 0), 0) / trilhos.reduce((s, f) => s + compTrilho(f), 0) : 0;
  const reservaMm = trilhos.reduce((s, f) => s + f.itens.filter(k => k.tipo === 'reserva').reduce((a, k) => a + k.largura, 0) + Math.max(0, (f.trilhoX ?? 0) + compTrilho(f) - f.usado), 0);
  return {
    involucro: { altura: escolha.h, largura: escolha.l, profundidade: escolha.p, familia: c.montagem },
    placa: r.placa, larguraUtil: r.larguraUtil, x0: r.x0, fileiras: r.fileiras, horizontais: r.horizontais,
    verticais: { esquerda: fio.vertical.esquerda, direita: fio.vertical.direita },
    alturaNecessaria: r.alturaNecessaria, profNecessaria: r.profNecessaria, cabe, tentativas, modo: r.modo || 'fileiras', separadores: r.separadores || [], canaletasMetros: metros,
    ocupacaoTrilho, reservaMm, reservaCircuitos: ctx.reservaCircuitos, sobraAltura: r.placa.altura - r.alturaNecessaria,
    rotuloZona: ROTULO_ZONA, zonasComando: [...ZONAS_COMANDO],
  };
}

// TCs nas barras de fase: logo após o 1º isolador (chegada do geral, à esquerda), escalonados ao
// longo da barra porque a altura do TC (≥ 80 mm) não cabe nos 60 mm entre fases. dx = a partir
// do início da barra; l = espessura do TC ao longo da barra; a = altura; p = largura (frente).
function tcNasBarras(calc) {
  return calc.comps.lista.filter(k => k.zona === 'sobre_barramento').map((k, i) => ({ ref: k.ref, fase: i, dx: 45 + i * (k.prof + 15), l: k.prof, a: k.altura, p: k.largura, item: k }));
}

module.exports = { montarLayout, tentarZonas, tcNasBarras, empacotar, canaletaPara, ZONAS, ROTULO_ZONA, ENTRADA_CABOS, FOLGA_FILEIRA };
