// PDF VETORIAL (planta exportada do AutoCAD/Revit) → DXF em metros, para o
// modelo 3D e a planta por disciplina lerem a arquitetura como se fosse um DXF
// (pedido do usuário em 28/10/2026: "para o 3D, também poder carregar PDF").
//
// Como funciona:
//   1) a página é lida pelo mesmo leitor da análise vetorial (utils/pdfVetorial.js,
//      opção `geometria`): traços com espessura, preenchimentos e textos;
//   2) a escala vem do carimbo ("ESC. 1:50"), da informada pelo usuário ou, sem
//      as duas, do raio dos arcos de porta (porta ≈ 0,80 m);
//   3) a moldura da folha e o quadro do carimbo saem (senão o carimbo vira
//      "ambiente" e o 3D enquadra o carimbo);
//   4) como o PDF não tem layers, elas são criadas pela aparência do traço:
//        PDF-PAREDE         traço bem mais grosso que o comum (paredes)
//        PDF-PAREDE-CHEIA   polígono reto cinza/preto com espessura de parede/pilar
//        PDF-LINHAS         o resto (móveis, portas, esquadrias)
//        PDF-TRACEJADO      tracejado (projeções, eixos) — nunca é parede
//        PDF-TEXTO          textos (nomes dos ambientes), com os pedaços de uma
//                           mesma linha juntados ("SALA" + "DE" + "ESTAR")
//      curva que é arco de círculo vira ARC (o arco da porta é reconhecido);
//      as outras viram polilinha.
// Limites: PDF escaneado (imagem) não tem traço para ler; com todas as linhas da
// mesma espessura, móveis desenhados podem virar parede no 3D (aviso).
const path = require('path');
const { lerPagina, pdfjs } = require('./pdfVetorial').paraTestes;
const { escalaDoCarimbo } = require('./pdfVetorial');

const { DesenhoDxf } = require(path.join(__dirname, '..', '..', '..', 'skills', '_comum', 'cad', 'dxf.js'));

const PT_EM_M = 25.4 / 72 / 1000; // 1 ponto do PDF no papel, em metros
const ESCALAS = [20, 25, 50, 75, 100, 125, 200, 250, 500];
const MAX_CAMINHOS = 150000;
const erro = (msg, codigo) => Object.assign(new Error(msg), { codigo });

// ── geometria ───────────────────────────────────────────────────────────
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const grau = (v) => ((Math.atan2(v[1], v[0]) * 180 / Math.PI) + 360) % 360;
const bezier = (p0, c1, c2, p3, t) => {
  const u = 1 - t;
  return [0, 1].map(i => u * u * u * p0[i] + 3 * u * u * t * c1[i] + 3 * u * t * t * c2[i] + t * t * t * p3[i]);
};

// Curva cúbica que é arco de círculo (o CAD exporta arco assim): centro no
// cruzamento das normais das pontas, mesmo raio nas pontas e no meio.
// Devolve { centro, r, inicio, fim } (graus, anti-horário) ou null.
function arcoDaCurva(p0, c1, c2, p3) {
  const t0 = sub2(c1, p0), t1 = sub2(p3, c2);
  const n0 = [-t0[1], t0[0]], n1 = [-t1[1], t1[0]];
  const det = n0[0] * -n1[1] + n1[0] * n0[1];
  if (Math.abs(det) < 1e-9 || dist(p0, p3) < 1e-6) return null;
  const d = sub2(p3, p0);
  const s = (d[0] * -n1[1] + n1[0] * d[1]) / det;
  const centro = [p0[0] + s * n0[0], p0[1] + s * n0[1]];
  const r = dist(centro, p0);
  const meio = bezier(p0, c1, c2, p3, 0.5);
  if (!(r > 0) || Math.abs(dist(centro, p3) - r) > r * 0.03 || Math.abs(dist(centro, meio) - r) > r * 0.03) return null;
  return { ...angulos(centro, p0, p3, meio), centro, r, p0, p3, meio };
}
// início/fim (graus, anti-horário) do arco de p0 a p3 passando por `meio`
function angulos(centro, p0, p3, meio) {
  const a0 = grau(sub2(p0, centro)), a1 = grau(sub2(p3, centro)), am = grau(sub2(meio, centro));
  const volta = (a) => (a - a0 + 360) % 360;
  return volta(am) < volta(a1) ? { inicio: a0, fim: a1 } : { inicio: a1, fim: a0 };
}
const varredura = (a) => (a.fim - a.inicio + 360) % 360 || 360;

// círculo pelos 3 pontos (null se alinhados)
function circulo3(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-12) return null;
  const q = (p) => p[0] * p[0] + p[1] * p[1];
  const centro = [(q(a) * (b[1] - c[1]) + q(b) * (c[1] - a[1]) + q(c) * (a[1] - b[1])) / d, (q(a) * (c[0] - b[0]) + q(b) * (a[0] - c[0]) + q(c) * (b[0] - a[0])) / d];
  return { centro, r: dist(centro, a) };
}

// Pedaços seguidos do mesmo círculo viram um arco só: o PDF pode partir um arco
// de 90° em 2 curvas (AutoCAD) ou em 16 de 5,6° (Chromium). O centro de um pedaço
// curto é impreciso: junta-se pela continuidade das pontas e o círculo é refeito
// pelos 3 pontos (início, junção, fim), conferindo que o ponto do meio cai nele.
function juntarArco(lista, a) {
  const ult = lista.at(-1);
  if (ult && Math.abs(ult.r - a.r) < ult.r * 0.03) {
    const tol = ult.r * 0.02;
    let ini = null, juncao = null, fim = null;
    if (dist(ult.p3, a.p0) < tol) [ini, juncao, fim] = [ult.p0, a.p0, a.p3];
    else if (dist(a.p3, ult.p0) < tol) [ini, juncao, fim] = [a.p0, ult.p0, ult.p3];
    const c = ini && circulo3(ini, juncao, fim);
    if (c && Math.abs(dist(c.centro, a.meio) - c.r) < c.r * 0.02 && Math.abs(dist(c.centro, ult.meio) - c.r) < c.r * 0.02) {
      Object.assign(ult, { centro: c.centro, r: c.r, p0: ini, p3: fim, meio: juncao, ...angulos(c.centro, ini, fim, juncao) });
      return;
    }
  }
  lista.push({ ...a });
}

// ── escala ──────────────────────────────────────────────────────────────
// Pelos arcos de porta (≈ 90°): a escala padrão em que o raio mediano fica mais
// perto de 0,80 m, desde que caia entre 0,55 e 1,10 m.
function escalaPelasPortas(arcosPt) {
  const raios = arcosPt.filter(a => { const v = varredura(a); return v >= 75 && v <= 105; }).map(a => a.r).sort((x, y) => x - y);
  if (raios.length < 2) return null;
  const mediano = raios[Math.floor(raios.length / 2)];
  let melhor = null;
  for (const e of ESCALAS) {
    const m = mediano * PT_EM_M * e;
    if (m >= 0.55 && m <= 1.1 && (!melhor || Math.abs(m - 0.8) < Math.abs(melhor.m - 0.8))) melhor = { e, m };
  }
  return melhor?.e || null;
}

// ── textos: junta os pedaços de uma mesma linha ─────────────────────────
function juntarTextos(textos) {
  const horiz = textos.filter(t => t.horizontal).sort((a, b) => (Math.abs(a.y - b.y) < Math.min(a.h, b.h) * 0.3 ? a.x - b.x : a.y - b.y));
  const saida = [];
  for (const t of horiz) {
    const ult = saida.at(-1);
    if (ult && Math.abs(ult.y - t.y) < ult.h * 0.3 && Math.abs(ult.h - t.h) < ult.h * 0.25) {
      const vao = t.x - (ult.x + ult.w);
      if (vao > -ult.h * 0.3 && vao < ult.h * 0.6) {
        ult.s += vao > ult.h * 0.12 ? ` ${t.s}` : t.s;
        ult.w = t.x + t.w - ult.x;
        continue;
      }
    }
    saida.push({ ...t });
  }
  return [...saida, ...textos.filter(t => !t.horizontal)];
}

// ── espessura que é parede ──────────────────────────────────────────────
// Espessuras (por comprimento de traço): parede é a faixa bem mais grossa que a
// mediana, com pelo menos 3% do total desenhado. null = tudo da mesma espessura.
function espessuraDeParede(caminhos) {
  const porLw = new Map();
  let total = 0;
  for (const c of caminhos) {
    if (!c.traco || c.dash) continue;
    const lw = Math.round(c.lwPg * 20) / 20;
    porLw.set(lw, (porLw.get(lw) || 0) + c.comp);
    total += c.comp;
  }
  if (!total) return null;
  const faixas = [...porLw.entries()].sort((a, b) => a[0] - b[0]);
  let acum = 0, mediana = faixas[0][0];
  for (const [lw, comp] of faixas) { acum += comp; if (acum >= total / 2) { mediana = lw; break; } }
  const limite = Math.max(mediana * 1.6, mediana + 0.15);
  const grossas = faixas.filter(([lw]) => lw >= limite).reduce((s, [, c]) => s + c, 0);
  return grossas >= total * 0.03 ? limite : null;
}

// ── moldura e carimbo da folha ──────────────────────────────────────────
// Moldura: segmento comprido (> 40% da folha) na faixa de 8% junto à borda.
function ehMoldura([a, b], W, H) {
  const faixaX = W * 0.08, faixaY = H * 0.08;
  const naBorda = (p) => p[0] < faixaX || p[0] > W - faixaX || p[1] < faixaY || p[1] > H - faixaY;
  const horiz = Math.abs(a[1] - b[1]) < 1, vert = Math.abs(a[0] - b[0]) < 1;
  return naBorda(a) && naBorda(b) && ((horiz && Math.abs(a[0] - b[0]) > W * 0.4 && (a[1] < faixaY || a[1] > H - faixaY))
    || (vert && Math.abs(a[1] - b[1]) > H * 0.4 && (a[0] < faixaX || a[0] > W - faixaX)));
}
// Carimbo: o maior retângulo fechado na parte de baixo/direita da folha (até 35%
// dela) com textos típicos de carimbo dentro. Tudo dentro dele sai do DXF (senão
// o quadro do carimbo vira "ambiente" e o 3D enquadra o carimbo).
const RE_CARIMBO = /\b(PROJETO ARQUITET|PRANCHA|FOLHA|ESCALA|ESC\.|DATA|CREA|CAU|RESPONS[AÁ]VEL|PROPRIET[AÁ]RI|AUTOR|DESENHO|DESENHISTA|REVIS[AÃ]O|CONTE[UÚ]DO|ENDERE[CÇ]O|CLIENTE|ASSINATURA|ART|RRT|CARIMBO)\b/i;
function regiaoDoCarimbo(caminhos, textos, W, H) {
  const chaves = textos.filter(t => RE_CARIMBO.test(t.s));
  if (!chaves.length) return null;
  let melhor = null;
  for (const c of caminhos) {
    if (!c.traco) continue;
    for (const s of c.subs) {
      // retângulo: 4 retas que voltam ao início (com ou sem o "fechar" do PDF)
      if (s.segs.length !== 4 || s.segs.some(g => g[0] !== 'l') || dist(s.segs[0][1], s.segs[3][2]) > 1) continue;
      const xs = s.segs.map(g => g[1][0]), ys = s.segs.map(g => g[1][1]);
      const r = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      const area = (r[2] - r[0]) * (r[3] - r[1]);
      if (area > W * H * 0.35 || area < W * H * 0.002 || (r[0] < W * 0.6 && r[1] < H * 0.6)) continue; // carimbo fica embaixo ou à direita
      const dentro = chaves.filter(t => t.x >= r[0] && t.x <= r[2] && t.y >= r[1] && t.y <= r[3]).length;
      if (dentro && (!melhor || dentro > melhor.dentro || (dentro === melhor.dentro && area > melhor.area))) melhor = { r, dentro, area };
    }
  }
  return melhor?.r || null;
}
const naRegiao = (r, [x, y]) => !!r && x >= r[0] - 0.5 && x <= r[2] + 0.5 && y >= r[1] - 0.5 && y <= r[3] + 0.5;
// cinza/preto (poché de parede); colorido (vegetação, piso, destaque) não é parede
function ehCinza(cor) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(cor || '');
  if (!m) return false;
  const v = m.slice(1).map(h => parseInt(h, 16));
  return Math.max(...v) - Math.min(...v) < 40 && Math.max(...v) < 235;
}

// Página da planta num PDF de várias: a com mais traços (até 10 páginas)
async function escolherPagina(doc, OPS, pagina) {
  if (pagina) {
    if (pagina < 1 || pagina > doc.numPages) throw erro(`O PDF tem ${doc.numPages} página(s); a página ${pagina} não existe.`, 'PAGINA');
    return pagina;
  }
  if (doc.numPages === 1) return 1;
  let melhor = 1, mais = -1;
  for (let n = 1; n <= Math.min(doc.numPages, 10); n++) {
    const p = await doc.getPage(n);
    const ops = await p.getOperatorList();
    const qtd = ops.fnArray.filter(f => f === OPS.constructPath).length;
    if (qtd > mais) { mais = qtd; melhor = n; }
    p.cleanup();
  }
  return melhor;
}

// buffer do PDF → { texto (DXF em metros), escala, origemEscala, pagina, paginas, avisos }
// `escala`: denominador informado (50 para 1:50); `pagina`: 1, 2… (padrão: a com mais traços)
async function pdfParaDxf(buffer, { escala: escalaInformada = null, pagina = null } = {}) {
  const { getDocument, OPS } = await pdfjs();
  let doc;
  try {
    doc = await getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, verbosity: 0, disableFontFace: true }).promise;
  } catch (e) {
    throw erro(`não é um PDF válido (${e.message}).`, 'PDF');
  }
  try {
    const n = await escolherPagina(doc, OPS, Number(pagina) || null);
    const pag = await doc.getPage(n);
    // conta os traços ANTES de montar a geometria (que ocupa memória por traço)
    const ops = await pag.getOperatorList();
    const qtd = ops.fnArray.filter(f => f === OPS.constructPath).length;
    if (qtd > MAX_CAMINHOS) throw erro(`a página ${n} tem ${qtd.toLocaleString('pt-BR')} traços (limite ${MAX_CAMINHOS.toLocaleString('pt-BR')}). Envie o DWG/DXF ou um PDF só da planta baixa.`, 'GRANDE');
    const geo = await lerPagina(pag, OPS, { geometria: true, ops });
    pag.cleanup();
    // escaneado: só imagem (e talvez a camada de texto do OCR) — quase nenhum segmento desenhado
    if (geo.caminhos.filter(c => c.traco).reduce((s, c) => s + c.segs, 0) < 12) {
      throw erro('este PDF não tem desenho vetorial (parece escaneado ou imagem). Para o 3D, envie o PDF exportado do AutoCAD/Revit ou o DWG/DXF.', 'RASTER');
    }

    // arcos e escala (em pontos do PDF, antes de converter)
    const H = geo.altura;
    const arcosPt = [];
    for (const c of geo.caminhos) {
      if (!c.traco) continue;
      for (const s of c.subs) for (const seg of s.segs) if (seg[0] === 'c') { const a = arcoDaCurva(...seg.slice(1)); if (a) juntarArco(arcosPt, a); }
    }
    const avisos = [];
    let escala = Number(escalaInformada) || null, origemEscala = escala ? 'informada' : null;
    if (!escala) { escala = escalaDoCarimbo(geo.textos); if (escala) origemEscala = 'carimbo'; }
    if (!escala) {
      escala = escalaPelasPortas(arcosPt);
      if (escala) { origemEscala = 'portas'; avisos.push(`Escala 1:${escala} deduzida pelo tamanho das portas (o carimbo não tem a escala) — confira as medidas.`); }
    }
    if (!escala || escala < 1 || escala > 5000) {
      throw erro('não achei a escala da planta no PDF (nem "ESC. 1:50" no carimbo, nem portas para medir). Informe a escala (ex.: 50 para 1:50).', 'ESCALA');
    }

    const k = PT_EM_M * escala;
    const P = ([x, y]) => [x * k, (H - y) * k]; // PDF (y para baixo) → metros (y para cima)
    const W = geo.largura;
    const carimbo = regiaoDoCarimbo(geo.caminhos, geo.textos, W, H);
    const foraDoCarimbo = (seg) => !carimbo || !seg.slice(1).every(p => naRegiao(carimbo, p));
    const lwParede = espessuraDeParede(geo.caminhos);
    if (!lwParede) avisos.push('As linhas do PDF têm todas a mesma espessura: o sistema não separa parede de móvel — móveis desenhados podem aparecer como parede no 3D.');

    const d = new DesenhoDxf({ layers: [], unidade: 'm', escalaPlotagem: escala });
    const L = {
      parede: d.camada('PDF-PAREDE', 7), cheia: d.camada('PDF-PAREDE-CHEIA', 8), linhas: d.camada('PDF-LINHAS', 9),
      tracejado: d.camada('PDF-TRACEJADO', 9), texto: d.camada('PDF-TEXTO', 2),
    };
    let entidades = 0;
    for (const c of geo.caminhos) {
      if (c.traco) {
        const layer = c.dash ? L.tracejado : (lwParede && c.lwPg >= lwParede ? L.parede : L.linhas);
        for (const s of c.subs) {
          let pts = [];
          const arcos = []; // pedaços do mesmo círculo juntados (o PDF pode partir 90° em 16 curvas)
          const fechar = () => { if (pts.length >= 2) { d.polilinha(pts, { layer }); entidades++; } pts = []; };
          for (const seg of s.segs) {
            if (!foraDoCarimbo(seg) || (seg[0] === 'l' && ehMoldura([seg[1], seg[2]], W, H))) { fechar(); continue; }
            if (seg[0] === 'l') {
              const a = P(seg[1]), b = P(seg[2]);
              if (!pts.length) pts.push(a);
              pts.push(b);
              continue;
            }
            const [p0, c1, c2, p3] = seg.slice(1).map(P);
            const arco = arcoDaCurva(p0, c1, c2, p3);
            if (arco) { fechar(); juntarArco(arcos, arco); continue; }
            if (!pts.length) pts.push(p0);
            for (let i = 1; i <= 8; i++) pts.push(bezier(p0, c1, c2, p3, i / 8));
          }
          if (s.fechado && pts.length >= 3 && dist(pts[0], pts.at(-1)) < 1e-6) { pts.pop(); d.polilinha(pts, { layer, fechada: true }); entidades++; pts = []; }
          fechar();
          for (const a of arcos) { d.arco(a.centro[0], a.centro[1], a.r, a.inicio, a.fim, layer); entidades++; }
        }
      } else if (c.cheio && ehCinza(c.fill)) {
        // preenchimento cinza/preto com cara de parede/pilar: polígono reto (árvore, pedra
        // de piso e outros desenhos com curva não são parede), espessura média (2·área/perímetro) de 4 a 60 cm
        for (const s of c.subs) {
          if (s.segs.some(seg => seg[0] !== 'l') || !s.segs.every(foraDoCarimbo)) continue;
          const pts = s.segs.map(seg => P(seg[1]));
          if (pts.length < 3) continue;
          let area = 0, per = 0;
          pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; area += p[0] * q[1] - q[0] * p[1]; per += dist(p, q); });
          area = Math.abs(area) / 2;
          const esp = per ? (2 * area) / per : 0;
          if (area >= 0.01 && esp >= 0.04 && esp <= 0.6) { d.polilinha(pts, { layer: L.cheia, fechada: true }); entidades++; }
        }
      }
    }
    for (const t of juntarTextos(geo.textos)) {
      if (naRegiao(carimbo, [t.x, t.y])) continue;
      const [x, y] = P([t.x, t.y]);
      d.texto(x, y, Math.max(t.h * k, 0.01), t.s, { layer: L.texto });
    }
    if (!entidades) throw erro('não achei linhas de desenho na página do PDF.', 'VAZIO');
    return { texto: d.toString(), escala, origemEscala, pagina: n, paginas: doc.numPages, avisos };
  } finally {
    await doc.destroy();
  }
}

// ── Processo à parte ────────────────────────────────────────────────────
// O leitor de PDF (pdfjs) com um desenho grande pode derrubar a thread com um
// erro nativo (visto em teste: "Segmentation fault" ao converter vários PDFs
// pesados seguidos numa worker thread) — e isso derruba o processo inteiro.
// Como na conversão do DWG (skills/_comum/cad/dwg.js), a conversão roda num
// processo filho: este mesmo arquivo, com o PDF na entrada; na saída, a 1ª
// linha é o JSON do resultado e o resto é o DXF. Falha: código 2 e JSON do erro.
const { spawn } = require('child_process');

function pdfParaDxfIsolado(buffer, { escala = null, pagina = null, timeoutMs = 150000 } = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, ['--max-old-space-size=2048', __filename, String(Number(escala) || ''), String(Number(pagina) || '')],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const partes = [];
    let saidaErro = '';
    let terminou = false;
    const fim = (fn, v) => { if (!terminou) { terminou = true; clearTimeout(timer); fn(v); } };
    const timer = setTimeout(() => { filho.kill(); fim(reject, erro(`a conversão do PDF passou de ${timeoutMs / 1000} s. Envie o DWG/DXF ou um PDF só da planta baixa.`, 'TEMPO')); }, timeoutMs);
    filho.stdout.on('data', (c) => partes.push(c));
    filho.stderr.on('data', (c) => { saidaErro = (saidaErro + c).slice(-2000); });
    filho.on('error', (e) => fim(reject, e));
    filho.on('close', (code) => {
      const saida = Buffer.concat(partes).toString('utf8');
      const quebra = saida.indexOf('\n');
      let meta = null;
      try { meta = JSON.parse(quebra >= 0 ? saida.slice(0, quebra) : saida); } catch { /* sem JSON: o filho caiu */ }
      if (code === 0 && meta?.ok) return fim(resolve, { ...meta.resultado, texto: saida.slice(quebra + 1) });
      if (meta?.erro) return fim(reject, erro(meta.erro, meta.codigo));
      fim(reject, erro(`o leitor de PDF parou (código ${code}${/heap|memory/i.test(saidaErro) ? ', memória insuficiente' : ''}). Envie o DWG/DXF ou um PDF só da planta baixa.`, 'FALHA'));
    });
    filho.stdin.on('error', () => {});
    filho.stdin.end(buffer);
  });
}

if (require.main === module) {
  const partes = [];
  process.stdin.on('data', (c) => partes.push(c));
  process.stdin.on('end', async () => {
    try {
      const { texto, ...resultado } = await pdfParaDxf(Buffer.concat(partes), { escala: Number(process.argv[2]) || null, pagina: Number(process.argv[3]) || null });
      process.stdout.write(`${JSON.stringify({ ok: true, resultado })}\n`);
      process.stdout.write(texto, () => process.exit(0));
    } catch (e) {
      process.stdout.write(`${JSON.stringify({ erro: e.message, codigo: e.codigo || null })}\n`, () => process.exit(2));
    }
  });
}

module.exports = { pdfParaDxf, pdfParaDxfIsolado, paraTestes: { arcoDaCurva, juntarArco, escalaPelasPortas, juntarTextos, espessuraDeParede } };
