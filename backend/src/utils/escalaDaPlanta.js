// Escala automática da planta em PDF (fase 3 do roteiro, CAD-09, 02/11/2026).
//
// A análise do PDF só tirava a escala do texto do carimbo ("ESC. 1:50"). Num PDF sem esse texto a
// metragem das linhas da legenda ficava vazia, mesmo com a escala no nome do arquivo ("… A0 1_50.pdf")
// ou com portas desenhadas (o 3D já media pelas portas). Agora a escala sai, NESTA ordem:
//   1) a informada na tela (por arquivo) ............................. origem 'informada'
//   2) o texto do carimbo / o "1:50" do título da vista (pdfVetorial) . origem 'carimbo' / 'titulo_vista'
//   3) o nome do arquivo ("A0 1_50", "ESC 1-100") ...................... origem 'nome_arquivo'
//   4) as portas (raio do arco ≈ 0,80 m — utils/desenhoPdf.js) ........ origem 'portas'
//   5) as cotas ("3,50" sobre a linha de cota) ......................... origem 'cota'
// As origens 3 a 5 são dedução: o resultado diz de onde veio, e a análise marca [CONFERIR].
// Sem nenhuma, a metragem não é calculada (nunca se chuta uma escala).
const { PT_EM_M, arcoDaCurva, juntarArco, escalaPelasPortas } = require('./desenhoPdf');

// escalas usuais de projeto (a deduzida "encaixa" na mais próxima, a até 4 %)
const ESCALAS_USUAIS = [20, 25, 50, 75, 100, 125, 150, 200, 250, 500, 1000];
const encaixar = (v, tol = 0.04) => ESCALAS_USUAIS.find(e => Math.abs(v - e) <= tol * e) || null;

const ORIGEM_ESCALA = {
  informada: 'informada na tela', carimbo: 'do carimbo', titulo_vista: 'do título da vista', nome_arquivo: 'do nome do arquivo',
  portas: 'pelo tamanho das portas', cota: 'pelas cotas do desenho',
};
const DEDUZIDA = new Set(['nome_arquivo', 'portas', 'cota']);

// "Lumino … A0 1_50.pdf", "PLANTA ESC 1-100.pdf", "planta 1:75.pdf" → 50 / 100 / 75. Só escala usual, e um valor só
// (datas como "01-07" não passam: o "1" não pode vir colado a outro dígito e 7 não é escala). Com hífen ou barra
// só depois de "ESC"/"ESCALA": "PROJ_1-25.pdf" costuma ser a folha 1 de 25, não 1:25
function escalaDoNome(nome) {
  const s = String(nome || '').replace(/\.[a-z0-9]{2,4}$/i, '');
  const valores = new Set();
  const achar = (re) => { for (const m of s.matchAll(re)) { const v = Number(m[1]); if (ESCALAS_USUAIS.includes(v)) valores.add(v); } };
  achar(/(?<![\d.,])1\s*[_:]\s*(\d{2,4})(?![\d.,])/g);
  achar(/ESC(?:ALA)?\.?\s*[_:=]?\s*1\s*[-/]\s*(\d{2,4})(?![\d.,])/gi);
  return valores.size === 1 ? [...valores][0] : null;
}

// [[x0, y0, x1, y1]] → o ponto está numa delas?
const emAlguma = (regioes, p) => regioes.some(r => p[0] >= r[0] && p[0] <= r[2] && p[1] >= r[1] && p[1] <= r[3]);
// planta em escala menor que 1:200 não mostra porta de verdade: o arco que "dá" 1:500 é símbolo
const MAX_ESCALA_PORTAS = 200;

// Portas da página (arco de ~90° com a folha desenhada), só nas regiões de PLANTA do classificador
// (o arco do disjuntor do unifilar não é porta). `geo`: página lida com `geometria: true` (subs).
function escalaPelasPortasDaPagina(geo, regioesPlanta = []) {
  if (!regioesPlanta.length) return null;
  const fora = (p) => !emAlguma(regioesPlanta, p);
  const arcos = [], retas = [];
  for (const c of geo.caminhos || []) {
    if (!c.traco || !c.subs) continue;
    for (const s of c.subs) {
      for (const seg of s.segs) {
        if (seg[0] === 'l') { if (!fora(seg[1])) retas.push([seg[1], seg[2]]); continue; }
        const a = arcoDaCurva(...seg.slice(1));
        if (a && !fora(a.centro)) juntarArco(arcos, a);
      }
    }
  }
  const e = escalaPelasPortas(arcos, retas);
  return e && e <= MAX_ESCALA_PORTAS ? e : null;
}

// Cotas: o número em metros ("3,50", "12.40") logo acima de uma reta horizontal do mesmo
// comprimento na escala. Cada cota dá uma escala; vale a que se repete (≥ 3 cotas e ≥ 60 % delas
// na mesma escala usual) — a cota de um detalhe noutra escala não decide sozinha.
const RE_COTA = /^\d{1,2}[,.]\d{2}$/;
function escalaPelasCotas(geo, regioesPlanta = []) {
  if (!regioesPlanta.length) return null;
  const fora = (p) => !emAlguma(regioesPlanta, p);
  const cotas = (geo.textos || []).filter(t => t.horizontal && RE_COTA.test(t.s)).map(t => ({ ...t, v: Number(t.s.replace(',', '.')) }))
    .filter(t => t.v >= 0.3 && t.v <= 60 && !fora([t.x, t.y]));
  if (cotas.length < 3) return null;
  // retas horizontais por faixa de y (índice: a página tem dezenas de milhares de traços)
  const FAIXA = 4;
  const porFaixa = new Map();
  for (const c of geo.caminhos || []) {
    if (!c.traco || !c.subs) continue;
    for (const s of c.subs) {
      for (const seg of s.segs) {
        if (seg[0] !== 'l') continue;
        const [a, b] = [seg[1], seg[2]];
        if (Math.abs(a[1] - b[1]) > 0.3) continue;
        const L = Math.abs(a[0] - b[0]);
        if (L < 8) continue;
        const k = Math.floor(a[1] / FAIXA);
        (porFaixa.get(k) || porFaixa.set(k, []).get(k)).push([Math.min(a[0], b[0]), Math.max(a[0], b[0]), a[1]]);
      }
    }
  }
  const votos = new Map();
  let total = 0;
  for (const t of cotas) {
    const cx = t.x + t.w / 2;
    let melhor = null;
    // a linha de cota fica logo abaixo do número (y do PDF cresce para baixo; t.y é a base do texto)
    for (let k = Math.floor((t.y - t.h) / FAIXA); k <= Math.floor((t.y + 1.5 * t.h) / FAIXA); k++) {
      for (const [x0, x1, y] of porFaixa.get(k) || []) {
        const dy = y - t.y;
        if (dy < -0.6 * t.h || dy > 1.5 * t.h) continue;
        // o número fica no meio da linha, dentro dela
        if (t.x < x0 - 1 || t.x + t.w > x1 + 1 || Math.abs((x0 + x1) / 2 - cx) > Math.max(t.w, 0.2 * (x1 - x0))) continue;
        if (!melhor || Math.abs(dy) < Math.abs(melhor.dy)) melhor = { dy, L: x1 - x0 };
      }
    }
    if (!melhor) continue;
    const e = encaixar(t.v / (melhor.L * PT_EM_M));
    total++;
    if (e) votos.set(e, (votos.get(e) || 0) + 1);
  }
  const [e, n] = [...votos].sort((a, b) => b[1] - a[1])[0] || [];
  return e && n >= 3 && n >= 0.6 * total ? e : null;
}

// A escala de reserva da página (3 a 5), quando não há informada nem carimbo: { escala, origem } ou null.
// Portas e cotas só com `geo.caminhos[].subs` (geometria) e só dentro de `regioesPlanta` (caixas das regiões
// que o classificador disse serem planta) — quem chama mede antes de liberar os trechos.
function escalaDeReserva({ nomeArquivo = '', geo = null, regioesPlanta = [] } = {}) {
  const pelaNome = escalaDoNome(nomeArquivo);
  if (pelaNome) return { escala: pelaNome, origem: 'nome_arquivo' };
  if (!geo) return null;
  const pelasPortas = escalaPelasPortasDaPagina(geo, regioesPlanta);
  if (pelasPortas) return { escala: pelasPortas, origem: 'portas' };
  const pelasCotas = escalaPelasCotas(geo, regioesPlanta);
  if (pelasCotas) return { escala: pelasCotas, origem: 'cota' };
  return null;
}

// texto curto para o achado e a tela: "1:50 do nome do arquivo [CONFERIR]"
const descreverEscala = (escala, origem) => (escala ? `1:${escala} ${ORIGEM_ESCALA[origem] || ''}${DEDUZIDA.has(origem) ? ' [CONFERIR]' : ''}`.trim() : 'sem escala');

module.exports = { escalaDoNome, escalaPelasPortasDaPagina, escalaPelasCotas, escalaDeReserva, descreverEscala, ORIGEM_ESCALA, DEDUZIDA, ESCALAS_USUAIS };
