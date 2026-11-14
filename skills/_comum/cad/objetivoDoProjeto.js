// ENTENDIMENTO DO PROJETO — do que o desenho realmente trata, antes de qualquer contagem ou 3D.
//
// Por que existe (pedido do usuário em 09/11/2026): o DWG de uma subestação abrigada de 150 kVA trazia colada a
// planta de SITUAÇÃO da arena (outro projeto, layers PDF_*: luminárias, tomadas, arquitetura). O sistema montou a
// "arquitetura" da arena no 3D e no mapa do CAD, tirou ambientes de textos soltos ("SEM ESCALA", "POÇO TIPO PP"
// com 1072 m², o carimbo) e listou "1 transformador 225 kVA, 4 acionadores manuais e 3 luminárias". Nas palavras
// dele: "quero que o sistema seja capaz de avaliar o projeto e ver do que realmente se trata; se é uma subestação
// temos que pegar postes de entrada, trafos e todos os componentes que estão no projeto… foque no que interessa
// no projeto, pois ali tem a disciplina que tem o objetivo da análise" — "use o mesmo fundamento para todas as
// disciplinas".
//
// O fundamento (o mesmo para TODAS as disciplinas):
//   1) OBJETIVO: a disciplina e o tipo do projeto pelo carimbo, pelos títulos das vistas, pelo vocabulário dos
//      textos, pelos nomes de layers, pelo nome do arquivo e pelas disciplinas marcadas pelo usuário (pesam, mas o
//      desenho manda quando é claro — a divergência vira aviso);
//   2) PAPEL DE CADA VISTA: principal (a planta do objetivo), contexto (situação/locação/implantação, planta de outro
//      projeto colada como base — só referência, nunca pontos/ambientes/3D), apoio (cortes, detalhes, unifilar,
//      legenda, relação, notas — lidos como DADOS) e fora (carimbo, moldura);
//   3) CAMADAS DE CONTEXTO: as layers da base importada que o resto do sistema ignora como pontos/componentes;
//   4) COMPONENTES do objetivo pelas legendas/relação, balões, blocos, layers e diagrama (./componentesDoProjeto.js);
//   5) DADOS escritos (kVA, tensões, demanda, medição…);
//   6) ABRIGO, quando o objeto do projeto não é a arquitetura (subestação): contorno, medidas, compartimentos, portas.
// Disciplina predial com uma planta só: principal = a planta, a arquitetura inteira continua valendo (sem mudança).
// Determinístico, sem IA. Valor que não está escrito fica null; estimado leva [CONFERIR]. Nenhum dado de cliente.
//
// entenderProjeto(arq, { nomeArquivo, disciplinas }) → {
//   disciplina, tipo, tipoRotulo, objeto ('arquitetura' | 'abrigo' | 'equipamento'), titulo, tituloCompleto,
//   confianca ('alta'|'media'|'baixa'), evidencias, ranking, servicoDoProjeto,
//   vistas: [{ id, caixa (unidades do desenho), tipo, titulo, papel, motivo, escala? (principal: { fator — metros
//            reais por unidade —, fonte: 'cotas', amostras, unidade } | null) }],
//   camadasDeContexto: [layer],
//   componentes: [{ id, tipo, descricao, item, lista, fonte, fontes, quantidade, unidade, especificacao, posicoes:
//                  [{ x, y, vista, origem, alvo?, local_m? }], posicao?: { x, y, local_m, vista }, conferir, motivo,
//                  forma3d, servico }],
//   legendas: [{ titulo, tipo, vista, contexto, doObjetivo, itens: [{ numero, descricao, especificacao, bloco? }], faltando }],
//   dados, fontesDados, abrigo: { contorno (unidades), contorno_m e origem (metros reais na origem do abrigo),
//   largura_m, comprimento_m, area_m2, escala, compartimentos, portas } | null, avisos }
// naVistaPrincipal(objetivo, [x, y]) / papelDoPonto(objetivo, [x, y]) / ehCamadaDeContexto(objetivo, layer): o filtro
// para o backend, o mapa do CAD e o 3D.
const { classificarFolha, tipoDoTitulo, NAO_PLANTA, RE_NOME_SALA } = require('./classificarPrancha');
const { PERFIS, perfilDe, componenteDoPerfil } = require('./perfisDisciplina');
const CP = require('./componentesDoProjeto');
const { separarXref } = require('./disciplinasCad');

const r2 = (v) => Math.round(v * 100) / 100;
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
const area = (c) => Math.max(0, c[2] - c[0]) * Math.max(0, c[3] - c[1]);
const interseccao = (a, b) => area([Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]);
const naCaixa = (c, [x, y], m = 0) => x >= c[0] - m && x <= c[2] + m && y >= c[1] - m && y <= c[3] + m;
const distCaixas = (a, b) => Math.hypot(Math.max(0, a[0] - b[2], b[0] - a[2]), Math.max(0, a[1] - b[3], b[1] - a[3]));
const caixaDe = (pts) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return Number.isFinite(x0) ? [x0, y0, x1, y1] : null; };
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => semAcento(s).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

// ── Vocabulário geral das vistas ────────────────────────────────────────────────────────────────────
// vista que é só referência de outro desenho
const RE_CONTEXTO = /SITUA[ÇC][ÃA]O|LOCA[ÇC][ÃA]O|LOCALIZA[ÇC][ÃA]O|IMPLANTA[ÇC][ÃA]O|PLANTA\s+DE\s+(LOCALIZA|SITUA)|MAPA\s+DE\s+LOCALIZA|PLANTA\s+CHAVE|URBANIZA/i;
// títulos que o classificador de pranchas não conhece mas que são de vista
const RE_TITULO_EXTRA = /^(CONJUNTO|VISTAS?|DETALHES?|CORTES?|PLANTA|LEGENDA|RELA[ÇC][ÃA]O\s+DE|LISTA\s+DE|DIAGRAMA|ESQUEMA|NOTAS?\b)|SITUA[ÇC][ÃA]O|LOCA[ÇC][ÃA]O|IMPLANTA[ÇC][ÃA]O/i;
const RE_FRASE = /^(É|SER[ÁA]|SER[ÃA]O|DEVE[MR]?|DEVER[ÁA]O?|CONFORME|TODOS|TODAS|PARA|QUANDO|CASO|N[ÃA]O|OS|AS|NA|NO|NAS|NOS|\d+\s*[-–)])\s/i;
const tipoDoTituloAmplo = (s) => {
  if (RE_CONTEXTO.test(s)) return 'planta';
  const t = tipoDoTitulo(s);
  if (t) return t;
  if (/^CONJUNTO|^DETALHE/i.test(s)) return 'detalhe';
  if (/^VISTA/i.test(s)) return 'corte_fachada';
  if (/^(LEGENDA|RELA[ÇC][ÃA]O|LISTA|NOTAS?)\b/i.test(s)) return 'legenda';
  if (/^PLANTA/i.test(s)) return 'planta';
  return null;
};
// carimbo: campos típicos (o mesmo vocabulário do classificador de pranchas, mais os de aprovação)
const RE_CAMPO_CARIMBO = /\b(DATA|ESCALA|REVIS[ÃA]O|DESENHO|PROPRIET[ÁA]RIO|AUTOR|RESPONS[ÁA]VEL|CREA|CAU|PRANCHA|FOLHA|ENDERE[ÇC]O|CLIENTE|ART|RRT|CONTE[ÚU]DO|ASSINATURA|APROVADO|ANALISADO|ETAPA)\b/i;
// layer de base importada: PDF convertido (PDF_*), xref (ARQ$0$…, ARQ|…)
const ehLayerDeBase = (l) => /^PDF[_-]/i.test(l || '') || !!separarXref(l).xref;
// layer de cota (o texto dela é só número) — nem parede, nem componente
const RE_LAYER_COTA = /DIM|COTA|COTAS/i;

// ── Textos e traços do desenho ──────────────────────────────────────────────────────────────────────
function textosDe(arq) {
  const vistos = new Set();
  const out = [];
  const add = (t) => {
    if (!t || !t.s || !Number.isFinite(t.x) || !Number.isFinite(t.y)) return;
    const k = `${t.s}|${t.x.toFixed(3)}|${t.y.toFixed(3)}`;
    if (vistos.has(k)) return;
    vistos.add(k);
    out.push({ s: String(t.s).trim(), x: t.x, y: t.y, h: t.h || 0, layer: t.layer || null });
  };
  // (arq sem textosDoDesenho: leitura antiga — as notas e os rótulos)
  (arq.textosDoDesenho || arq.rotulos || []).forEach(add);
  (arq.notas || []).forEach(add);
  return out.filter(t => t.s);
}
function segmentosDe(arq) {
  const segs = [];
  for (const r of arq.referencia || []) {
    if (r.tipo === 'arco' || !r.pts || r.pts.length < 2) continue;
    for (let i = 1; i < r.pts.length; i++) segs.push({ a: r.pts[i - 1], b: r.pts[i], layer: r.layer });
    if (r.fechada && r.pts.length >= 3) segs.push({ a: r.pts.at(-1), b: r.pts[0], layer: r.layer });
  }
  return segs;
}
// arco pelos 3 pontos (início, meio, fim): centro, raio e varredura — a referência só guarda os pontos
function arcoDosPontos(pts) {
  if (!pts || pts.length < 3) return null;
  const [a, b, c] = [pts[0], pts[pts.length >> 1], pts.at(-1)];
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-12) return null;
  const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d;
  const uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d;
  const r = Math.hypot(a[0] - ux, a[1] - uy);
  let varredura = 0;
  for (let i = 1; i < pts.length; i++) {
    let da = Math.atan2(pts[i][1] - uy, pts[i][0] - ux) - Math.atan2(pts[i - 1][1] - uy, pts[i - 1][0] - ux);
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    varredura += da;
  }
  return { centro: [ux, uy], r, varredura: Math.abs(varredura) * 180 / Math.PI, a: pts[0], b: pts.at(-1) };
}
function arcosDe(arq) {
  return (arq.referencia || []).filter(r => r.tipo === 'arco' && !r.fechada).map(r => { const a = arcoDosPontos(r.pts); return a && { ...a, layer: r.layer }; }).filter(Boolean);
}

// ── Carimbos ────────────────────────────────────────────────────────────────────────────────────────
// grupos de textos com 4+ campos de carimbo diferentes, perto uns dos outros
function carimbosDe(textos) {
  const campos = textos.filter(t => t.s.length <= 40 && RE_CAMPO_CARIMBO.test(semAcento(t.s).toUpperCase()));
  if (campos.length < 4) return [];
  const hRef = mediana(campos.map(t => t.h || 0.1)) || 0.1;
  const d = 25 * hRef;
  const pai = campos.map((_, i) => i);
  const raiz = (i) => { while (pai[i] !== i) i = pai[i] = pai[pai[i]]; return i; };
  for (let i = 0; i < campos.length; i++) for (let j = i + 1; j < campos.length; j++) {
    if (Math.abs(campos[i].x - campos[j].x) <= d && Math.abs(campos[i].y - campos[j].y) <= d) pai[raiz(i)] = raiz(j);
  }
  const grupos = new Map();
  campos.forEach((t, i) => { const r = raiz(i); (grupos.get(r) || grupos.set(r, []).get(r)).push(t); });
  const out = [];
  for (const g of grupos.values()) {
    const chaves = new Set(g.map(t => semAcento(t.s).toUpperCase().match(RE_CAMPO_CARIMBO)[1]));
    if (chaves.size < 4) continue;
    const c = caixaDe(g.flatMap(t => [[t.x, t.y], [t.x + t.s.length * (t.h || hRef) * 0.6, t.y + (t.h || hRef)]]));
    // (o título da folha fica acima dos campos, dentro do quadro do carimbo)
    const m = 3 * hRef, mv = 20 * hRef;
    const caixa = [c[0] - m, c[1] - m, c[2] + m, c[3] + mv];
    // os outros textos do carimbo (o conteúdo da folha, o título) ficam dentro da caixa dos campos
    out.push({ caixa, textos: textos.filter(t => naCaixa(caixa, [t.x, t.y])) });
  }
  return out;
}

// ── Vistas ──────────────────────────────────────────────────────────────────────────────────────────
// As regiões do classificador de pranchas; a região que engole várias vistas (a moldura da folha, longe da borda
// do desenho, une tudo — o "PLANTA BAIXA-SUBESTAÇÃO" com cortes, detalhes e carimbo) é reclassificada sozinha
function construirVistas(arq, textos, segs, arcos, ehTitulo) {
  const regs = (arq.classificacao?.regioes || []).map(r => ({ caixa: r.caixa, tipo: r.tipo, tituloClassificador: r.titulo || null, origem: 'classificacao' }));
  if (!regs.length) {
    const e = arq.extensao;
    const caixa = e ? [e.min[0], e.min[1], e.max[0], e.max[1]] : caixaDe(textos.map(t => [t.x, t.y])) || [0, 0, 0, 0];
    return [{ caixa, tipo: 'planta', tituloClassificador: null, origem: 'extensao' }];
  }
  const out = [];
  for (const r of regs) {
    const tits = new Set(textos.filter(t => ehTitulo(t) && naCaixa(r.caixa, [t.x, t.y])).map(t => norm(t.s)));
    if (tits.size >= 3) {
      const sub = reclassificar(r, segs, arcos, textos);
      if (sub && sub.length >= 2) { out.push(...sub); continue; }
    }
    out.push(r);
  }
  // repetidas (a sub-região igual a uma região que o classificador já tinha): fica a primeira
  const unicas = [];
  for (const v of out) {
    if (unicas.some(u => { const i = interseccao(u.caixa, v.caixa); return i >= 0.85 * area(v.caixa) && i >= 0.85 * area(u.caixa); })) continue;
    unicas.push(v);
  }
  return unicas;
}
function reclassificar(r, segs, arcos, textos) {
  const dentro = (p) => naCaixa(r.caixa, p, 1e-6);
  const s = segs.filter(x => dentro(x.a) && dentro(x.b));
  if (s.length < 20) return null;
  const c = classificarFolha({
    caixa: r.caixa, yParaBaixo: false, metrosPorUnidade: 1, raioPorta: [0.55, 1.25], espessuraParede: [0.07, 0.4],
    segmentos: s, arcos: arcos.filter(a => dentro(a.centro)), textos: textos.filter(t => dentro([t.x, t.y])).map(t => ({ s: t.s, x: t.x, y: t.y, h: t.h })),
  });
  return (c.regioes || []).filter(x => x.tipo !== 'desconhecido' || x.segmentos >= 50).map(x => ({ caixa: x.caixa, tipo: x.tipo, tituloClassificador: x.titulo || null, origem: 'subdivisao', soTexto: x.soTexto }));
}
// título de cada vista: o texto de título mais perto (embaixo, em cima ou na borda da vista); chamada no miolo da
// vista ("DETALHE-1" apontando o detalhe) pesa menos
function atribuirTitulos(vistas, titulos) {
  const porVista = vistas.map(() => []);
  for (const t of titulos) {
    const h = t.h || 0.1;
    const ext = [t.x, t.y, t.x + t.s.length * h * 0.6, t.y + h];
    let melhor = -1, dm = Infinity;
    vistas.forEach((v, i) => {
      let d = distCaixas(ext, v.caixa);
      const alt = v.caixa[3] - v.caixa[1];
      if (d === 0) {
        const naBorda = t.y - v.caixa[1] <= Math.max(alt * 0.15, 2 * h) || v.caixa[3] - t.y <= Math.max(alt * 0.15, 2 * h);
        if (!naBorda) d = 8 * h; // chamada no miolo
      } else if (t.y > v.caixa[3]) d *= 1.5; // título fica, de costume, embaixo da vista
      if (d < dm || (d === dm && melhor >= 0 && area(v.caixa) < area(vistas[melhor].caixa))) { dm = d; melhor = i; }
    });
    if (melhor >= 0 && dm <= 15 * h) porVista[melhor].push({ t, d: dm });
  }
  vistas.forEach((v, i) => {
    const c = porVista[i].sort((a, b) => (b.t.h - a.t.h) || (a.d - b.d))[0];
    v.titulo = c ? c.t.s : v.tituloClassificador || null;
    v.tituloTexto = c?.t || null;
  });
}

// ── Disciplina ──────────────────────────────────────────────────────────────────────────────────────
const PESO_CARIMBO = { eletrica: 0.35 }; // "PROJETO ELÉTRICO" está em todo carimbo de instalação — pouco diz
function pontuarDisciplinas({ textosValidos, carimbos, titulos, layers, nomeArquivo, disciplinas }) {
  const chaves = Object.keys(PERFIS).filter(k => k !== 'cabeamento');
  const arquivo = semAcento(String(nomeArquivo || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[_]+/g, ' ')).toUpperCase();
  const textosCarimbo = [...new Set(carimbos.flatMap(c => c.textos.map(t => t.s)))];
  const out = [];
  for (const k of chaves) {
    const p = PERFIS[k];
    let s = 0;
    const ev = [];
    if (p.carimbo) {
      const hits = textosCarimbo.filter(t => p.carimbo.test(t));
      if (hits.length) { const v = Math.min(12, 6 * hits.length) * (PESO_CARIMBO[k] ?? 1); s += v; ev.push(`carimbo: "${hits.slice(0, 2).join('", "')}" (+${r2(v)})`); }
    }
    if (p.titulosPrincipal) {
      const hits = [...new Set(titulos.filter(t => p.titulosPrincipal.test(t)))];
      if (hits.length) { const v = Math.min(8, 4 * hits.length); s += v; ev.push(`título de vista: "${hits.slice(0, 2).join('", "')}" (+${v})`); }
    }
    let voc = 0;
    const exemplos = [];
    for (const [re, w] of p.vocabulario || []) {
      const n = textosValidos.filter(t => re.test(t.s));
      if (n.length) { voc += w * Math.min(6, n.length); if (exemplos.length < 3) exemplos.push(n[0].s.slice(0, 40)); }
    }
    voc = Math.min(10, voc);
    if (voc) { s += voc; ev.push(`vocabulário (+${r2(voc)}): "${exemplos.join('", "')}"`); }
    if (p.layers) {
      const ls = layers.filter(l => p.layers.test(l));
      if (ls.length) { const v = Math.min(2, 0.3 * ls.length); s += v; ev.push(`layers: ${ls.slice(0, 3).join(', ')} (+${r2(v)})`); }
    }
    if (arquivo && ((p.carimbo && p.carimbo.test(arquivo)) || (p.vocabulario || []).some(([re, w]) => w >= 1 && re.test(arquivo)))) { s += 4; ev.push(`nome do arquivo (+4)`); }
    if ((disciplinas || []).includes(k) || (k === 'rede' && (disciplinas || []).includes('cabeamento'))) { s += 3; ev.push('marcada pelo usuário (+3)'); }
    out.push({ chave: k, pontos: r2(s), evidencias: ev });
  }
  return out.sort((a, b) => b.pontos - a.pontos);
}

// ── Abrigo (o objeto do projeto que não é a arquitetura: a subestação) ──────────────────────────────
// Paredes em linha dupla (duas paralelas a 7–40 cm, correndo juntas) da vista principal; o maior grupo ligado é o
// abrigo. Cota, chamada e componente (layer de cota, de componente ou de contexto) não são parede. As linhas de
// corte atravessam o abrigo e saem dele: não dividem compartimento
function lerAbrigo({ vista, segs, arcos, textos, excluir, componentes, escala = null }) {
  // limites em METROS REAIS convertidos para unidades da vista (a planta desenhada ao dobro tem parede de 0,30 unidade)
  const u = 1 / (escala?.fator || 1);
  const cx = [vista.caixa[0] - 0.2, vista.caixa[1] - 0.2, vista.caixa[2] + 0.2, vista.caixa[3] + 0.2];
  // (as linhas de cota achadas pela escala da vista também não são parede)
  const usar = segs.filter(s => naCaixa(cx, s.a) && naCaixa(cx, s.b) && !excluir(s.layer) && !escala?.linhas?.has(s));
  const tol = 0.01;
  const H = [], V = [];
  for (const s of usar) {
    const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1];
    if (Math.abs(dy) <= Math.abs(dx) * tol && Math.abs(dx) > 0.05) H.push({ p: (s.a[1] + s.b[1]) / 2, i0: Math.min(s.a[0], s.b[0]), i1: Math.max(s.a[0], s.b[0]), layer: s.layer });
    else if (Math.abs(dx) <= Math.abs(dy) * tol && Math.abs(dy) > 0.05) V.push({ p: (s.a[0] + s.b[0]) / 2, i0: Math.min(s.a[1], s.b[1]), i1: Math.max(s.a[1], s.b[1]), layer: s.layer });
  }
  // paredes: pares de paralelas
  const paredes = [];
  const pares = (lista, horizontal) => {
    const o = [...lista].sort((a, b) => a.p - b.p);
    for (let i = 0; i < o.length; i++) {
      for (let j = i + 1; j < o.length && o[j].p - o[i].p <= 0.4 * u; j++) {
        const gap = o[j].p - o[i].p;
        // as duas faces da parede ficam na mesma layer (a linha de corte ao lado da linha de chamada da cota, não)
        if (gap < 0.07 * u || o[i].layer !== o[j].layer) continue;
        const a0 = Math.max(o[i].i0, o[j].i0), a1 = Math.min(o[i].i1, o[j].i1);
        const menor = Math.min(o[i].i1 - o[i].i0, o[j].i1 - o[j].i0);
        if (a1 - a0 < 0.6 * u || a1 - a0 < 0.6 * menor) continue;
        paredes.push(horizontal ? { caixa: [a0, o[i].p, a1, o[j].p], comp: a1 - a0, esp: gap, horizontal } : { caixa: [o[i].p, a0, o[j].p, a1], comp: a1 - a0, esp: gap, horizontal });
      }
    }
  };
  pares(H, true);
  pares(V, false);
  if (paredes.length < 3) return null;
  // grupos de paredes que se tocam (até 25 cm)
  const pai = paredes.map((_, i) => i);
  const raiz = (i) => { while (pai[i] !== i) i = pai[i] = pai[pai[i]]; return i; };
  for (let i = 0; i < paredes.length; i++) for (let j = i + 1; j < paredes.length; j++) if (distCaixas(paredes[i].caixa, paredes[j].caixa) <= 0.25 * u) pai[raiz(i)] = raiz(j);
  const grupos = new Map();
  paredes.forEach((p, i) => { const r = raiz(i); (grupos.get(r) || grupos.set(r, []).get(r)).push(p); });
  const candidatos = [...grupos.values()].map(g => ({ g, caixa: caixaDe(g.flatMap(p => [[p.caixa[0], p.caixa[1]], [p.caixa[2], p.caixa[3]]])), comp: g.reduce((s, p) => s + p.comp, 0) }))
    // abrigo fechado: paredes nas duas direções
    .filter(c => c.g.some(p => p.horizontal) && c.g.some(p => !p.horizontal))
    .sort((a, b) => area(b.caixa) - area(a.caixa) || b.comp - a.comp);
  if (!candidatos.length) return null;
  const { g, caixa } = candidatos[0];
  const largura = caixa[2] - caixa[0], comprimento = caixa[3] - caixa[1];
  const esp = mediana(g.map(p => p.esp));
  const interno = [caixa[0] + esp, caixa[1] + esp, caixa[2] - esp, caixa[3] - esp];
  // compartimentos: linha (parede, tela) que atravessa o interior de face a face, sem sair do abrigo
  const divisores = [];
  const atravessa = (r, a0, a1, p0, p1) => r.p > p0 + 0.5 * u && r.p < p1 - 0.5 * u && r.i0 <= a0 + 0.15 * (a1 - a0) && r.i1 >= a1 - 0.15 * (a1 - a0) && r.i0 >= a0 - esp - 0.3 * u && r.i1 <= a1 + esp + 0.3 * u;
  const naoComponente = (r) => !componenteDoPerfil({ componentes: componentes || [] }, r.layer || '');
  for (const r of H) if (naoComponente(r) && atravessa(r, interno[0], interno[2], interno[1], interno[3])) divisores.push({ eixo: 'y', p: r.p });
  for (const r of V) if (naoComponente(r) && atravessa(r, interno[1], interno[3], interno[0], interno[2])) divisores.push({ eixo: 'x', p: r.p });
  // divisores muito próximos (as duas faces de uma parede, a tela dupla) são um só
  const eixo = divisores.filter(d => d.eixo === (comprimento >= largura ? 'y' : 'x')).map(d => d.p).sort((a, b) => a - b);
  const cortes = [];
  for (const p of eixo) if (!cortes.length || p - cortes.at(-1) > 0.4 * u) cortes.push(p); else cortes[cortes.length - 1] = (cortes.at(-1) + p) / 2;
  const compartimentos = [];
  const lim = comprimento >= largura ? [interno[1], ...cortes, interno[3]] : [interno[0], ...cortes, interno[2]];
  if (cortes.length) {
    for (let i = 1; i < lim.length; i++) {
      const c = comprimento >= largura ? [interno[0], lim[i - 1], interno[2], lim[i]] : [lim[i - 1], interno[1], lim[i], interno[3]];
      compartimentos.push({ caixa: c.map(r2), largura_m: r2(Math.min(c[2] - c[0], c[3] - c[1])), comprimento_m: r2(Math.max(c[2] - c[0], c[3] - c[1])), area_m2: r2(area(c)) });
    }
  }
  // portas: arco de 70–110° com raio de folha perto do contorno; folhas que se encontram = porta de duas folhas
  const folhas = arcos.filter(a => a.r >= 0.4 * u && a.r <= 1.3 * u && a.varredura >= 70 && a.varredura <= 110 && distCaixas([a.centro[0], a.centro[1], a.centro[0], a.centro[1]], caixa) <= 0.3 * u
    && !naCaixa([caixa[0] + 0.3 * u, caixa[1] + 0.3 * u, caixa[2] - 0.3 * u, caixa[3] - 0.3 * u], a.centro));
  const portas = [];
  const usadas = new Set();
  folhas.forEach((f, i) => {
    if (usadas.has(i)) return;
    usadas.add(i);
    const j = folhas.findIndex((o, k) => !usadas.has(k) && Math.abs(Math.hypot(o.centro[0] - f.centro[0], o.centro[1] - f.centro[1]) - (o.r + f.r)) <= 0.15 * u);
    if (j >= 0) usadas.add(j);
    const g2 = j >= 0 ? folhas[j] : null;
    const meio = g2 ? [(f.centro[0] + g2.centro[0]) / 2, (f.centro[1] + g2.centro[1]) / 2] : f.centro;
    portas.push({ x: r2(meio[0]), y: r2(meio[1]), largura_m: r2(g2 ? f.r + g2.r : f.r), folhas: g2 ? 2 : 1, origem: 'arco da folha na vista principal' });
  });
  // ESCALA: a da vista (cotas × linhas de cota); sem ela, o par de cotas que bate com largura e comprimento do abrigo
  const L = Math.min(largura, comprimento), Cm = Math.max(largura, comprimento);
  let esc = escala;
  if (!esc) {
    const cotas = [...new Set(textos.filter(t => /^\d{2,5}([.,]\d{1,2})?$/.test(t.s)).map(t => Number(t.s.replace(',', '.'))))];
    let par = null;
    for (const v1 of cotas) for (const v2 of cotas) {
      if (v2 < v1 || !L || !Cm) continue;
      const k1 = v1 / L, k2 = v2 / Cm;
      if (Math.abs(k1 - k2) / k1 <= 0.02 && (!par || v1 + v2 > par.v1 + par.v2)) par = { v1, v2, k: (k1 + k2) / 2 };
    }
    const f = par && fatorDaUnidade(par.k);
    esc = f ? { fator: f.fator, fonte: 'cotas do abrigo', amostras: 2, unidade: f.unidade } : { fator: 1, fonte: 'sem cotas', amostras: 0 };
  }
  const k = esc.fator;
  const e = (v) => r2(v * k);
  // medidas em METROS REAIS; o contorno em unidades do desenho (o sistema das posições dos componentes) e em metros
  // na origem do abrigo (contorno_m) — o 3D usa um ou outro
  const origem = [caixa[0], caixa[1]];
  const local = (x, y) => [r2((x - origem[0]) * k), r2((y - origem[1]) * k)];
  for (const c of compartimentos) { c.caixa_m = [...local(c.caixa[0], c.caixa[1]), ...local(c.caixa[2], c.caixa[3])]; c.largura_m = e(c.largura_m); c.comprimento_m = e(c.comprimento_m); c.area_m2 = r2(c.area_m2 * k * k); }
  for (const p of portas) { p.largura_m = e(p.largura_m); p.local_m = local(p.x, p.y); }
  // cota escrita que confirma as medidas reais (em cm, mm ou m)
  const cotasTxt = textos.filter(t => /^\d{2,5}([.,]\d{1,2})?$/.test(t.s)).map(t => Number(t.s.replace(',', '.')));
  const confere = (v) => cotasTxt.some(c => Math.abs(c / 100 - v) <= 0.03 || Math.abs(c - v) <= 0.03 || Math.abs(c / 1000 - v) <= 0.03);
  return {
    vista: vista.id,
    contorno: [[caixa[0], caixa[1]], [caixa[2], caixa[1]], [caixa[2], caixa[3]], [caixa[0], caixa[3]]].map(p => p.map(r2)),
    contorno_m: [[0, 0], [e(largura), 0], [e(largura), e(comprimento)], [0, e(comprimento)]], origem: origem.map(r2),
    largura_m: e(L), comprimento_m: e(Cm), area_m2: r2(L * Cm * k * k),
    espessura_parede_m: e(esp), interno: { largura_m: e(Math.min(interno[2] - interno[0], interno[3] - interno[1])), comprimento_m: e(Math.max(interno[2] - interno[0], interno[3] - interno[1])) },
    // metros reais por unidade do desenho nesta vista (1 = verdadeira grandeza)
    escala: esc, medidas_desenho: { largura: r2(L), comprimento: r2(Cm) },
    cotasConfirmam: { largura: confere(e(L)), comprimento: confere(e(Cm)) },
    compartimentos, portas, fonte: `${g.length} trechos de parede em linha dupla na vista principal`,
  };
}
// proporção cota escrita ÷ comprimento no desenho → metros reais por unidade: a unidade da cota (cm, mm, m) é a que
// deixa a proporção mais perto de 1 (desenho em verdadeira grandeza, ao dobro, à metade…)
function fatorDaUnidade(k) {
  const o = [[0.01, 'cm'], [0.001, 'mm'], [1, 'm']].map(([u, unidade]) => ({ f: k * u, unidade })).sort((a, b) => Math.abs(Math.log(a.f)) - Math.abs(Math.log(b.f)))[0];
  if (!(o.f >= 0.05 && o.f <= 20)) return null;
  // proporção de desenho é "redonda" (1, 1/2, 2, 1/4…): perto (±3 %) de uma delas, vale ela — a cota medida no
  // traço tem a folga da seta e do arredondamento (250 cm sobre 4,96 unidades)
  const redonda = [1, 0.5, 2, 0.25, 4, 0.2, 5, 0.1, 10, 0.4, 2.5, 0.05, 20].find(r => Math.abs(o.f / r - 1) <= 0.03);
  return { fator: redonda ?? Math.round(o.f * 1000) / 1000, unidade: o.unidade };
}
// ESCALA DE UMA VISTA pelas cotas: cada texto numérico com a linha de cota logo abaixo (horizontal) ou ao lado
// (vertical) dá uma proporção valor ÷ comprimento; o maior grupo de proporções iguais (±3 %, 3+ amostras) é a escala.
// Pedido do 3D (09/11/2026): a planta da subestação real está desenhada ao dobro das cotas (5,00 × 10,50 unidades
// para 250 × 525 cm) — o fator da unidade do desenho (global) não serve para ela
function escalaDaVista(vista, segs, textos) {
  // (as cotas ficam em volta do desenho: a caixa da vista com 10 % de folga)
  const m = 0.1 * Math.max(vista.caixa[2] - vista.caixa[0], vista.caixa[3] - vista.caixa[1]);
  const nums = textos.filter(t => /^\d{1,5}([.,]\d{1,3})?$/.test(t.s) && Number(t.s.replace(',', '.')) > 0 && naCaixa(vista.caixa, [t.x, t.y], m));
  if (nums.length < 3) return null;
  const doisLados = segs.filter(s => naCaixa(vista.caixa, s.a, m) && naCaixa(vista.caixa, s.b, m));
  const props = [];
  const linhas = new Map(); // proporção → linhas de cota (o abrigo não as toma por parede)
  for (const t of nums) {
    const h = t.h || 0.1;
    const v = Number(t.s.replace(',', '.'));
    const cxT = t.x + t.s.length * h * 0.3;
    let melhor = null;
    for (const s of doisLados) {
      const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1];
      const len = Math.hypot(dx, dy);
      if (len < 2 * h) continue;
      const mx = (s.a[0] + s.b[0]) / 2, my = (s.a[1] + s.b[1]) / 2;
      let d = null;
      if (Math.abs(dy) <= 0.01 * len) { if (t.y - my >= -0.2 * h && t.y - my <= 1.5 * h && Math.abs(mx - cxT) <= 0.25 * len + h) d = Math.abs(t.y - my) + Math.abs(mx - cxT) / len; }
      else if (Math.abs(dx) <= 0.01 * len) { if (Math.abs(t.x - mx) <= 1.5 * h && Math.abs(my - t.y) <= 0.25 * len + h) d = Math.abs(t.x - mx) + Math.abs(my - t.y) / len; }
      if (d != null && (!melhor || d < melhor.d)) melhor = { d, k: v / len, s };
    }
    if (melhor) { props.push(melhor.k); linhas.set(melhor.k, [...(linhas.get(melhor.k) || []), melhor.s]); }
  }
  props.sort((a, b) => a - b);
  let grupo = [];
  for (let i = 0; i < props.length; i++) {
    const g = props.filter(p => Math.abs(p - props[i]) / props[i] <= 0.03);
    if (g.length > grupo.length) grupo = g;
  }
  if (grupo.length < 3) return null;
  const f = fatorDaUnidade(mediana(grupo));
  if (!f) return null;
  const cotas = new Set(grupo.flatMap(k => linhas.get(k) || []));
  return Object.defineProperty({ fator: f.fator, fonte: 'cotas', amostras: grupo.length, unidade: f.unidade }, 'linhas', { value: cotas, enumerable: false });
}
// nome do compartimento pelo que está dentro dele (posições dos componentes: o alvo do balão, senão o balão)
function nomearCompartimentos(abrigo, componentes) {
  abrigo.compartimentos.forEach((c, i) => {
    const dentro = componentes.filter(k => k.posicoes.some(p => naCaixa(c.caixa, p.alvo || [p.x, p.y], 0.05))).map(k => k.tipo);
    c.componentes = [...new Set(dentro)];
    c.nome = dentro.includes('transformador') ? 'célula de transformação'
      : dentro.some(t => /chave_seccionadora|disjuntor_mt|fusivel|alavanca|tapete|rele/.test(t)) ? 'posto de manobra/proteção'
        : dentro.includes('medicao') ? 'posto de medição' : `compartimento ${i + 1}`;
  });
}

// ── Entendimento ────────────────────────────────────────────────────────────────────────────────────
// arq: resultado de lerArquitetura (./arquitetura.js). Ver o cabeçalho para o que sai.
function entenderProjeto(arq, { nomeArquivo = '', disciplinas = [] } = {}) {
  const avisos = [];
  const textos = textosDe(arq || {});
  const segs = segmentosDe(arq || {});
  const arcos = arcosDe(arq || {});
  const hMed = mediana(textos.map(t => t.h).filter(h => h > 0)) || 0.1;
  const ehTitulo = (t) => t.s.length >= 3 && t.s.length <= 70 && t.s.split(/\s+/).length <= 10 && !RE_FRASE.test(t.s) && /[A-Za-zÀ-ú]{3}/.test(t.s)
    && (t.h || 0) >= 0.9 * hMed && !!tipoDoTituloAmplo(t.s.trim());
  const titulos = textos.filter(ehTitulo);

  // 1) vistas e títulos
  const vistas = construirVistas(arq || {}, textos, segs, arcos, ehTitulo);
  atribuirTitulos(vistas, titulos);
  const carimbos = carimbosDe(textos);
  // carimbo que nenhuma vista cobre vira vista "fora" (a folha com o carimbo engolido pela planta foi reclassificada)
  for (const c of carimbos) if (!vistas.some(v => interseccao(v.caixa, c.caixa) >= 0.6 * area(c.caixa))) vistas.push({ caixa: c.caixa, tipo: 'carimbo', titulo: null, origem: 'carimbo' });
  // segmentos por vista (a menor que contém o ponto médio)
  const vistaDoPonto = (p) => { let m = -1; vistas.forEach((v, i) => { if (naCaixa(v.caixa, p, 0.01) && (m < 0 || area(v.caixa) < area(vistas[m].caixa))) m = i; }); return m; };
  const segsPorVista = vistas.map(() => []);
  for (const s of segs) { const i = vistaDoPonto([(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2]); if (i >= 0) segsPorVista[i].push(s); }
  const totalBase = segs.filter(s => ehLayerDeBase(s.layer)).length;
  const temNativo = segs.length - totalBase >= 0.3 * segs.length;

  // 2) papel geral (antes da disciplina): fora, apoio, contexto; o resto é candidato a principal
  vistas.forEach((v, i) => {
    v.id = `V${i + 1}`;
    const tt = v.titulo ? tipoDoTituloAmplo(v.titulo) : null;
    v.tipo = tt && v.tituloTexto ? tt : v.tipo;
    const s = segsPorVista[i];
    const base = s.length ? s.filter(x => ehLayerDeBase(x.layer)).length / s.length : 0;
    // (a vista que É o carimbo, ou que contém quase todo um carimbo sem ser maior que ele 3×)
    if (v.tipo === 'carimbo' || carimbos.some(c => { const i = interseccao(v.caixa, c.caixa); return i >= 0.6 * (area(v.caixa) || 1) || (i >= 0.6 * area(c.caixa) && area(v.caixa) <= 3 * area(c.caixa)); })) { v.papel = 'fora'; v.motivo = 'carimbo da folha'; }
    else if (v.titulo && RE_CONTEXTO.test(v.titulo)) { v.papel = 'contexto'; v.motivo = `título "${v.titulo}": situação/locação — só referência`; }
    else if (NAO_PLANTA.has(v.tipo) || v.soTexto) { v.papel = 'apoio'; v.motivo = v.soTexto ? 'bloco só de texto (notas/lista): lido como dado' : `${v.tipo.replace('_', '/')}: lido como dado, não como geometria`; }
    else if (temNativo && s.length >= 20 && base >= 0.7) { v.papel = 'base'; v.motivo = null; } // contexto ou detalhe importado: decide depois
    else { v.papel = null; v.motivo = null; }
    v._base = base;
  });

  // vista em base importada colada à de contexto (pedaços da mesma planta de situação) é contexto já
  for (const v of vistas.filter(x => x.papel === 'base')) {
    if (vistas.some(o => o.papel === 'contexto' && distCaixas(o.caixa, v.caixa) <= 0.5)) { v.papel = 'contexto'; v.motivo = `${Math.round(v._base * 100)}% dos traços em layers de base importada, junto da vista de contexto`; }
  }
  // 3) disciplina e tipo
  const naContexto = (p) => vistas.some(v => v.papel === 'contexto' && naCaixa(v.caixa, p));
  const textosValidos = textos.filter(t => !naContexto([t.x, t.y]));
  const layersNativas = (arq?.layers || []).filter(l => l && !ehLayerDeBase(l));
  const ranking = pontuarDisciplinas({ textosValidos, carimbos, titulos: vistas.filter(v => v.papel !== 'contexto' && v.titulo).map(v => v.titulo), layers: layersNativas, nomeArquivo, disciplinas });
  let escolhida = ranking[0];
  const marcadas = ranking.filter(r => (disciplinas || []).includes(r.chave) || (r.chave === 'rede' && (disciplinas || []).includes('cabeamento')));
  if (marcadas.length && !marcadas.includes(escolhida)) {
    // o desenho manda quando é claro (1,5× a marcada e 8+ pontos); senão vale a marcada
    if (escolhida.pontos >= 1.5 * marcadas[0].pontos && escolhida.pontos >= 8) avisos.push(`Disciplina marcada: ${marcadas.map(m => m.chave).join(', ')}; o desenho é de ${escolhida.chave} (${escolhida.evidencias.slice(0, 2).join('; ')}) — valeu o desenho; confira [CONFERIR].`);
    else { avisos.push(`O desenho parece de ${escolhida.chave}, mas foi marcado ${marcadas[0].chave} — valeu a marcação (o desenho não é claro) [CONFERIR].`); escolhida = marcadas[0]; }
  }
  const segunda = ranking.find(r => r !== escolhida);
  const margem = escolhida.pontos - (segunda?.pontos || 0);
  const confianca = escolhida.pontos >= 10 && margem >= 4 ? 'alta' : escolhida.pontos >= 5 && margem >= 2 ? 'media' : 'baixa';
  const disciplina = escolhida.pontos > 0 ? escolhida.chave : null;
  const perfil = disciplina ? perfilDe(disciplina) : null;
  // tipo: carimbo, títulos e nome do arquivo primeiro; depois o resto do texto
  const fontesTipo = [...carimbos.flatMap(c => c.textos.map(t => t.s)), ...vistas.map(v => v.titulo).filter(Boolean), String(nomeArquivo || '').replace(/[_]+/g, ' ')];
  let tipoRow = perfil?.tipos?.find(([re]) => fontesTipo.some(s => re.test(s))) || perfil?.tipos?.find(([re]) => textosValidos.some(t => re.test(t.s)));
  const tipo = tipoRow ? tipoRow[1] : perfil?.tipoPadrao?.[0] || null;
  const tipoRotulo = tipoRow ? tipoRow[2] : perfil?.tipoPadrao?.[1] || null;
  const objeto = tipoRow?.[3] || perfil?.objeto || 'arquitetura';
  // título do projeto: a linha do carimbo que fala do objetivo (e as linhas de baixo dela)
  const parasCarimbo = carimbos.flatMap(c => CP.paragrafos(c.textos));
  const tituloPara = perfil?.carimbo && parasCarimbo.filter(p => perfil.carimbo.test(p.s)).sort((a, b) => b.h - a.h)[0];
  const titulo = tituloPara ? tituloPara.linhas[0].s : null;
  const tituloCompleto = tituloPara ? tituloPara.s : null;

  // 4) principal entre os candidatos
  const baloes = CP.lerBaloes(textos, arq?.circulos || []);
  const candidatos = vistas.filter(v => v.papel === null);
  const nomeComp = (s) => !!componenteDoPerfil(perfil, s);
  for (const v of candidatos) {
    let p = 0;
    const m = [];
    if (perfil?.titulosPrincipal && v.titulo && perfil.titulosPrincipal.test(v.titulo)) { p += 5; m.push(`título "${v.titulo}" é do objetivo`); }
    else if (v.titulo && /PLANTA/i.test(v.titulo)) { p += 1; m.push(`título "${v.titulo}"`); }
    const nb = baloes.filter(b => naCaixa(v.caixa, [b.x, b.y])).length;
    if (nb) { p += Math.min(5, nb / 2); m.push(`${nb} balão(ões) de item`); }
    const ni = (arq?.insercoes || []).filter(i => naCaixa(v.caixa, [i.x, i.y]) && nomeComp(i.nome)).length;
    if (ni) { p += 2; m.push(`${ni} bloco(s) de componente`); }
    const nl = new Set(segsPorVista[vistas.indexOf(v)].filter(s => !ehLayerDeBase(s.layer) && nomeComp(s.layer)).map(s => s.layer)).size;
    if (nl) { p += 2; m.push(`${nl} layer(s) com nome de componente`); }
    if (v.tipo === 'planta') p += 1;
    v._pontos = p;
    v._motivos = m;
  }
  if (objeto === 'arquitetura') {
    // predial: toda planta que não é contexto é principal (várias pranchas/pavimentos) — como antes
    for (const v of candidatos) {
      if (v.tipo === 'planta' || v.origem === 'extensao' || candidatos.filter(c => c.tipo === 'planta').length === 0) { v.papel = 'principal'; v.motivo = v._motivos.length ? v._motivos.join('; ') : 'planta do projeto'; }
      else { v.papel = 'apoio'; v.motivo = 'vista não identificada (não é planta)'; }
    }
  } else {
    const ordem = [...candidatos].sort((a, b) => b._pontos - a._pontos || area(b.caixa) - area(a.caixa));
    const melhor = ordem[0];
    for (const v of candidatos) {
      if (v === melhor) { v.papel = 'principal'; v.motivo = v._motivos.join('; ') || 'a vista com mais sinais do objetivo'; continue; }
      v.papel = 'apoio';
      v.motivo = v.titulo && melhor.titulo && norm(v.titulo) === norm(melhor.titulo) ? `repetição da vista principal ("${v.titulo}") — não é contada de novo` : `vista sem o objeto do projeto${v.titulo ? ` ("${v.titulo}")` : ''}: lida como dado`;
    }
  }
  // base importada (PDF/xref) que não é a principal: planta de outro projeto (nomes de sala, ou maior que a principal)
  // é CONTEXTO; o resto é detalhe padrão importado (o conjunto de medição da distribuidora) — APOIO, lido como dado
  {
    const ap = Math.max(0, ...vistas.filter(v => v.papel === 'principal').map(v => area(v.caixa)));
    for (const v of vistas.filter(x => x.papel === 'base')) {
      const salas = new Set(textos.filter(t => naCaixa(v.caixa, [t.x, t.y]) && t.s.length <= 40 && RE_NOME_SALA.test(t.s)).map(t => norm(t.s))).size;
      if (salas >= 2 || (ap && area(v.caixa) >= 1.5 * ap) || vistas.some(o => o.papel === 'contexto' && distCaixas(o.caixa, v.caixa) <= 0.5)) {
        v.papel = 'contexto';
        v.motivo = `${Math.round(v._base * 100)}% dos traços em layers de base importada (PDF/xref)${salas >= 2 ? `, ${salas} nomes de ambiente` : ''} — desenho de outro projeto colado como referência`;
      } else { v.papel = 'apoio'; v.motivo = `detalhe importado (${Math.round(v._base * 100)}% em layers PDF/xref): lido como dado, não como geometria`; }
    }
  }
  const principais = vistas.filter(v => v.papel === 'principal');
  if (!principais.length) avisos.push('Nenhuma vista principal identificada (planta do objetivo do projeto) — confira o desenho [CONFERIR].');
  const vp = principais.sort((a, b) => (b._pontos || 0) - (a._pontos || 0))[0] || null;
  const naPrincipal = (p, m = 0.05) => principais.some(v => naCaixa(v.caixa, p, m));
  // escala de cada vista principal pelas cotas (metros reais por unidade do desenho)
  for (const v of principais) {
    v.escala = escalaDaVista(v, segs, textos) || null;
    if (!v.escala) avisos.push(`Vista principal ${v.id}${v.titulo ? ` ("${v.titulo}")` : ''}: sem cotas suficientes para conferir a escala — considerada em verdadeira grandeza (fator 1) [CONFERIR].`);
    else if (v.escala.fator !== 1) avisos.push(`Vista principal ${v.id}${v.titulo ? ` ("${v.titulo}")` : ''} desenhada fora da escala do desenho: 1 unidade = ${v.escala.fator} m pelas cotas (${v.escala.amostras} cotas em ${v.escala.unidade}) — medidas e posições convertidas por este fator.`);
  }

  // 5) camadas de contexto: a maioria fora da principal e dentro do contexto; ou base importada fora da principal
  const porLayer = new Map();
  const contar = (layer, p) => {
    if (!layer) return;
    const c = porLayer.get(layer) || porLayer.set(layer, { total: 0, principal: 0, contexto: 0 }).get(layer);
    c.total++;
    if (naPrincipal(p)) c.principal++;
    else if (naContexto(p)) c.contexto++;
  };
  for (const r of arq?.referencia || []) if (r.pts?.length) contar(r.layer, r.pts[0]);
  for (const t of textos) contar(t.layer, [t.x, t.y]);
  const camadasDeContexto = [];
  for (const [l, c] of porLayer) {
    if (c.principal > 0.1 * c.total) continue;
    if (c.contexto >= 0.7 * c.total) camadasDeContexto.push(l);
    else if (ehLayerDeBase(l) && temNativo) camadasDeContexto.push(l);
  }
  camadasDeContexto.sort();
  const ehContexto = new Set(camadasDeContexto);

  // 6) legendas, componentes e dados
  const insercoes = (arq?.insercoes || []).filter(i => !ehContexto.has(i.layer));
  const legendasTodas = CP.lerLegendas(textos, { insercoes });
  const vistaDe = (p) => { const i = vistaDoPonto(p); return i >= 0 ? vistas[i] : null; };
  for (const l of legendasTodas) {
    const p = l.x != null ? [l.x, l.y] : [l.itens[0].x, l.itens[0].y];
    const v = vistaDe(p);
    l.vista = v?.id || null;
    l.contexto = !!(v && v.papel === 'contexto') || naContexto(p);
    const doPerfil = l.itens.filter(it => componenteDoPerfil(perfil, it.descricao)).length;
    l.doObjetivo = l.tipo === 'relacao_materiais' || (l.itens.length ? doPerfil / l.itens.length >= 0.3 : false);
  }
  const legendas = legendasTodas.filter(l => !l.contexto);
  const segsPrincipal = vp ? segsPorVista[vistas.indexOf(vp)].map(s => [s.a, s.b]) : [];
  const bp = baloes.filter(b => naPrincipal([b.x, b.y])).map(b => ({ ...b, alvo: CP.alvoDoBalao(b, segsPrincipal) }));
  const baloesVistas = vistas.filter(v => v.papel === 'apoio').map(v => ({ id: v.id, titulo: v.titulo, baloes: baloes.filter(b => vistaDe([b.x, b.y]) === v) })).filter(v => v.baloes.length);
  const blocosPrincipal = insercoes.filter(i => naPrincipal([i.x, i.y]));
  // layers com nome de componente: posições = grupos de desenho na principal
  const layersComponente = [];
  for (const l of (arq?.layers || []).filter(x => x && !ehContexto.has(x) && !ehLayerDeBase(x) && componenteDoPerfil(perfil, x))) {
    const pts = (arq.referencia || []).filter(r => r.layer === l && r.pts?.length && naPrincipal(r.pts[0])).map(r => caixaDe(r.pts));
    const grupos = [];
    for (const c of pts) {
      const g = grupos.find(x => distCaixas(x, c) <= 0.5);
      if (g) { g[0] = Math.min(g[0], c[0]); g[1] = Math.min(g[1], c[1]); g[2] = Math.max(g[2], c[2]); g[3] = Math.max(g[3], c[3]); } else grupos.push([...c]);
    }
    layersComponente.push({ layer: l, posicoes: grupos.map(g => ({ x: r2((g[0] + g[2]) / 2), y: r2((g[1] + g[3]) / 2) })) });
  }
  const parasValidos = CP.paragrafos(textosValidos).map(p => ({ ...p, carimbo: carimbos.some(c => naCaixa(c.caixa, [p.x, p.y])) }));
  // (o bloco só de texto que o classificador chamou de "diagrama" — a lista de peças de um detalhe — não é o unifilar)
  const ehDiagrama = (v) => v && v.papel !== 'contexto' && ((v.tipo === 'diagrama' && !v.soTexto && segsPorVista[vistas.indexOf(v)].length >= 30) || /UNIFILAR|DIAGRAMA/i.test(v.titulo || ''));
  const diagrama = parasValidos.filter(p => ehDiagrama(vistaDe([p.x, p.y])));
  const rotulosPrincipal = textosValidos.filter(t => naPrincipal([t.x, t.y]) && !bp.some(b => Math.hypot(b.x - t.x, b.y - t.y) <= 2 * b.r));
  // balões da lista secundária: na vista dela e nas vistas dentro da caixa dela (o poste de frente e de lado)
  const baloesDaLista = (lista) => {
    const v = vistas.find(x => x.id === lista.vista);
    if (!v) return [];
    return baloes.filter(b => naCaixa(v.caixa, [b.x, b.y])).map(b => ({ ...b, vista: vistaDe([b.x, b.y])?.id || v.id }));
  };
  const montado = perfil ? CP.montarComponentes(perfil, { legendas, baloesPrincipal: bp, baloesVistas, blocosPrincipal, layersComponente, diagrama, rotulosPrincipal, baloesDaLista, vistaPrincipal: vp?.id || null }) : { componentes: [], avisos: [] };
  const componentes = montado.componentes;
  avisos.push(...montado.avisos);
  // serviço da montagem inteira pelo tipo do projeto (subestação abrigada → mt_se_abrigada)
  const servicoDoProjeto = perfil?.servicoDoTipo?.[tipo] || null;

  let dados = {};
  let fontesDados = {};
  if (disciplina === 'media_tensao') {
    const relacao = legendas.find(l => l.tipo === 'relacao_materiais')?.itens || [];
    const blocosNomes = [...new Set(insercoes.filter(i => vistaDe([i.x, i.y])?.papel !== 'contexto').map(i => i.nome))];
    const d = CP.dadosMediaTensao(parasValidos, { relacao, layers: (arq?.layers || []).filter(l => !ehContexto.has(l)), blocos: blocosNomes });
    dados = d.dados;
    fontesDados = d.fontes;
    // (a divergência de layer/bloco que os componentes já avisaram não sai duas vezes)
    avisos.push(...d.avisos.filter(a => { const n = /^(?:A layer|O bloco) "([^"]+)"/.exec(a)?.[1]; return !n || !avisos.some(b => b.includes(`"${n}"`)); }));
  }
  // biblioteca de blocos do DWG: bloco com nome de componente que não está inserido em lugar nenhum não é componente
  const naoInseridos = (arq?.blocosDefinidos || []).filter(b => !b.insercoes && componenteDoPerfil(perfil, b.nome)).map(b => b.nome);
  if (naoInseridos.length) avisos.push(`Blocos só na biblioteca do DWG (não inseridos no desenho), ignorados: ${naoInseridos.slice(0, 8).join('; ')}${naoInseridos.length > 8 ? '…' : ''}.`);

  // 7) abrigo
  let abrigo = null;
  if (objeto !== 'arquitetura' && vp) {
    const camadaComponente = (l) => !!componenteDoPerfil(perfil, l || '');
    // (a layer das cotas pode ser a das paredes também — a "01" do desenho real: só o NOME de cota exclui)
    const excluir = (l) => ehContexto.has(l) || RE_LAYER_COTA.test(l || '') || camadaComponente(l);
    abrigo = lerAbrigo({ vista: vp, segs, arcos, textos: textos.filter(t => naCaixa(vp.caixa, [t.x, t.y], 0.1 * Math.max(vp.caixa[2] - vp.caixa[0], vp.caixa[3] - vp.caixa[1]))), excluir, componentes: perfil?.componentes, escala: vp.escala });
    if (abrigo) {
      if (!vp.escala && abrigo.escala.fonte !== 'sem cotas') vp.escala = abrigo.escala;
      // posição de cada componente em metros reais na origem do abrigo (a mesma referência do contorno_m)
      const k = abrigo.escala.fator;
      for (const c of componentes) {
        for (const p of c.posicoes) if (p.vista === vp.id) { const [x, y] = p.alvo || [p.x, p.y]; p.local_m = [r2((x - abrigo.origem[0]) * k), r2((y - abrigo.origem[1]) * k)]; }
        const pp = c.posicoes.find(p => p.vista === vp.id);
        if (pp) c.posicao = { x: pp.alvo?.[0] ?? pp.x, y: pp.alvo?.[1] ?? pp.y, local_m: pp.local_m, vista: vp.id };
      }
      nomearCompartimentos(abrigo, componentes);
      const porta = componentes.find(c => c.tipo === 'porta');
      if (porta) {
        for (const p of abrigo.portas) {
          p.altura_m = porta.especificacao.altura_m ?? null;
          p.componente = porta.id;
          if (porta.especificacao.largura_m && Math.abs(porta.especificacao.largura_m - p.largura_m) > 0.1) {
            avisos.push(`Porta do abrigo: o arco no desenho dá ${p.largura_m} m, a relação diz ${porta.especificacao.largura_m} m — vale a relação [CONFERIR].`);
            p.largura_desenho_m = p.largura_m;
            p.largura_m = porta.especificacao.largura_m;
          }
        }
        if (!abrigo.portas.length && porta.posicoes.length) abrigo.portas.push({ x: porta.posicoes[0].alvo?.[0] ?? porta.posicoes[0].x, y: porta.posicoes[0].alvo?.[1] ?? porta.posicoes[0].y, largura_m: porta.especificacao.largura_m ?? null, altura_m: porta.especificacao.altura_m ?? null, folhas: null, origem: 'balão da porta na relação [CONFERIR]', componente: porta.id });
      }
      if (!abrigo.cotasConfirmam.largura || !abrigo.cotasConfirmam.comprimento) avisos.push(`Abrigo ${abrigo.largura_m} × ${abrigo.comprimento_m} m pelas paredes — ${!abrigo.cotasConfirmam.largura && !abrigo.cotasConfirmam.comprimento ? 'nenhuma cota escrita confirma' : 'só uma das medidas tem cota escrita'} [CONFERIR].`);
      if (abrigo.escala.fonte === 'sem cotas') avisos.push('Abrigo: escala da vista sem cotas para conferir — medidas em unidades do desenho tomadas como metros [CONFERIR].');
    } else avisos.push('Abrigo: as paredes da vista principal não fecharam um contorno — medidas do abrigo a conferir no desenho [CONFERIR].');
  }

  const evidencias = escolhida.evidencias.slice();
  if (segunda && segunda.pontos > 0) evidencias.push(`2ª colocada: ${segunda.chave} (${segunda.pontos} pontos)`);
  return {
    disciplina, tipo, tipoRotulo, objeto, titulo, tituloCompleto, confianca, evidencias, servicoDoProjeto,
    ranking: ranking.slice(0, 5).map(r => ({ chave: r.chave, pontos: r.pontos })),
    vistas: vistas.map(v => ({ id: v.id, caixa: v.caixa.map(r2), tipo: v.tipo, titulo: v.titulo || null, papel: v.papel, motivo: v.motivo, ...(v.papel === 'principal' ? { escala: v.escala || null } : {}) })),
    camadasDeContexto, componentes, legendas: legendas.concat(legendasTodas.filter(l => l.contexto)).map(l => ({ titulo: l.titulo, tipo: l.tipo, vista: l.vista, contexto: l.contexto, doObjetivo: l.doObjetivo,
      itens: l.itens.map(it => ({ numero: it.numero, descricao: it.descricao, especificacao: it.especificacao, ...(it.quantidade != null ? { quantidade: it.quantidade } : {}), ...(it.bloco ? { bloco: it.bloco } : {}) })), faltando: l.faltando })),
    dados, fontesDados, abrigo, avisos,
  };
}

// ── Utilitários para o backend e o 3D ───────────────────────────────────────────────────────────────
// papel do ponto [x, y]: 'principal' se cai numa vista principal; senão o papel da menor vista que o contém; null
// fora de todas
function papelDoPonto(objetivo, [x, y], margem = 0.05) {
  const vs = objetivo?.vistas || [];
  if (vs.some(v => v.papel === 'principal' && naCaixa(v.caixa, [x, y], margem))) return 'principal';
  let m = null;
  for (const v of vs) if (naCaixa(v.caixa, [x, y], margem) && (!m || area(v.caixa) < area(m.caixa))) m = v;
  return m ? m.papel : null;
}
// o ponto vale como ponto/ambiente/traço do projeto? Sem vistas: sim (leitura antiga). Fora de toda vista: sim no
// projeto predial (como antes), não quando o objeto é o abrigo/equipamento
function naVistaPrincipal(objetivo, p, { margem = 0.05 } = {}) {
  if (!objetivo?.vistas?.length) return true;
  const papel = papelDoPonto(objetivo, p, margem);
  if (papel === 'principal') return true;
  if (papel === null) return (objetivo.objeto || 'arquitetura') === 'arquitetura';
  return false;
}
// a layer é de contexto (base importada, outro projeto)?
const ehCamadaDeContexto = (objetivo, layer) => !!objetivo?.camadasDeContexto?.includes(layer);
// Filtro de posição para quem consome a leitura (análise do backend, mapa do CAD): null = não filtra.
// Objeto abrigo/equipamento: só a vista principal. Projeto predial: tira só o que está numa vista de CONTEXTO (a base de
// outro projeto) — as plantas de apoio de um predial com várias plantas continuam valendo, como antes.
function filtroDoPonto(objetivo) {
  if (!objetivo?.vistas?.length || objetivo.erro) return null;
  if ((objetivo.objeto || 'arquitetura') !== 'arquitetura') return (p) => naVistaPrincipal(objetivo, p);
  if (!objetivo.vistas.some(v => v.papel === 'contexto')) return null;
  return (p) => papelDoPonto(objetivo, p) !== 'contexto';
}

module.exports = { entenderProjeto, papelDoPonto, naVistaPrincipal, ehCamadaDeContexto, filtroDoPonto, paraTestes: { escalaDaVista, fatorDaUnidade, carimbosDe, construirVistas, atribuirTitulos, lerAbrigo, pontuarDisciplinas, arcoDosPontos, tipoDoTituloAmplo } };
