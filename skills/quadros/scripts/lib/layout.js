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
  for (const k of comps) z[k.zona].push({ ...k });
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
    z.bornes.push({ ref: g.id, tipo: 'bornes', zona: 'bornes', descricao: `${g.id} — ${g.funcao} (${g.total} + ${g.reserva} reserva)`, largura: Math.ceil(g.comprimento), altura: T.BORNE_ALTURA, divisivel: 10, perda: 0, grupoBornes: g });
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
    ? [['geral'], ['entrada'], ['barramento'], ['distribuicao'], ['placa'], ['partidas'], ['comando', 'clp', 'reles'], ['barras_np'], ['bornes']]
    : [['geral'], ['entrada', 'distribuicao'], ['placa'], ['partidas'], ['comando', 'clp', 'reles'], ['barras_np'], ['bornes']];
  for (const grupo of grupos) {
    const itens = grupo.flatMap(n => zonas[n]);
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
  const profPorta = porta.length || ctx.aut.ihm ? 50 : 0;
  const profNecessaria = Math.max(profPecas + T.FOLGA_PORTA + profPorta, Math.max(vE.altura, vD.altura) + 30);
  return { placa, larguraUtil, x0, fileiras, horizontais, alturaNecessaria, profNecessaria, cabeAltura: alturaNecessaria <= placa.altura };
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
    const r = tentar({ altura: h, largura: l }, fam, { ...ctx, zonas });
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
    const r = ultimo && ultimo.h === h ? ultimo.r : tentar({ altura: h, largura: l }, fam, { ...ctx, zonas }) || ultimo?.r;
    escolha = { h, l, p: fam.profundidades[fam.profundidades.length - 1], r };
  }
  const r = escolha.r;
  // metragem de canaletas
  const metros = {};
  const somaM = (d, m) => { const k = `${d.largura} × ${d.altura}`; metros[k] = (metros[k] || 0) + m; };
  r.horizontais.forEach(d => somaM(d, r.larguraUtil / 1000 + 0.02));
  const alturaVert = (r.placa.altura - 2 * T.MARGEM_UTIL) / 1000;
  somaM(fio.vertical.esquerda, alturaVert);
  somaM(fio.vertical.direita, alturaVert);
  // ocupação dos trilhos e reserva
  const trilhos = r.fileiras.filter(f => f.trilho);
  const ocupacaoTrilho = trilhos.length ? trilhos.reduce((s, f) => s + f.itens.filter(k => k.tipo !== 'reserva').reduce((a, k) => a + k.largura, 0), 0) / (trilhos.length * r.larguraUtil) : 0;
  const reservaMm = trilhos.reduce((s, f) => s + f.itens.filter(k => k.tipo === 'reserva').reduce((a, k) => a + k.largura, 0) + (r.larguraUtil - f.usado), 0);
  return {
    involucro: { altura: escolha.h, largura: escolha.l, profundidade: escolha.p, familia: c.montagem },
    placa: r.placa, larguraUtil: r.larguraUtil, x0: r.x0, fileiras: r.fileiras, horizontais: r.horizontais,
    verticais: { esquerda: fio.vertical.esquerda, direita: fio.vertical.direita },
    alturaNecessaria: r.alturaNecessaria, profNecessaria: r.profNecessaria, cabe, tentativas, canaletasMetros: metros,
    ocupacaoTrilho, reservaMm, reservaCircuitos: ctx.reservaCircuitos, sobraAltura: r.placa.altura - r.alturaNecessaria,
    rotuloZona: ROTULO_ZONA, zonasComando: [...ZONAS_COMANDO],
  };
}

module.exports = { montarLayout, empacotar, canaletaPara, ZONAS, ROTULO_ZONA, ENTRADA_CABOS, FOLGA_FILEIRA };
