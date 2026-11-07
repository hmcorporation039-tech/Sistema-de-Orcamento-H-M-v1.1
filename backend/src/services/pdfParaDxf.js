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
const { lerPagina, pdfjs } = require('../utils/pdfVetorial').paraTestes;
const { escalaDaPlanta } = require('../utils/pdfVetorial');
const { escalaDoNome, escalaPelasCotas } = require('../utils/escalaDaPlanta');

const { DesenhoDxf } = require(path.join(require('../config/caminhos').CAD, 'dxf.js'));

const {
  PT_EM_M, dist, bezier, arcoDaCurva, juntarArco, escalaPelasPortas, juntarTextos, espessuraDeParede,
} = require('../utils/desenhoPdf'); // geometria comum com a classificação das pranchas
const { classificarPaginaPdf, regioesParaManter } = require('../utils/classificarPranchaPdf');
const { NAO_PLANTA } = require(path.join(require('../config/caminhos').CAD, 'classificarPrancha.js'));
const MAX_CAMINHOS = 150000;
const erro = (msg, codigo) => Object.assign(new Error(msg), { codigo });

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
// Traço colorido → layer própria PDF-COR-RRGGBB, na cor ACI mais próxima (pedido
// de 01/11/2026: "sempre converter os pdfs em dxf, que são melhor interpretados no
// CAD"). No projeto exportado cada layer do CAD sai numa cor — eletroduto, fio,
// luminária e tomada ficam separados como no DWG, em vez de tudo em PDF-LINHAS.
const ACI = [[1, 255, 0, 0], [2, 255, 255, 0], [3, 0, 255, 0], [4, 0, 255, 255], [5, 0, 0, 255], [6, 255, 0, 255],
  [30, 255, 127, 0], [14, 165, 41, 0], [12, 165, 0, 0], [140, 0, 127, 255], [94, 0, 127, 63], [8, 128, 128, 128], [9, 192, 192, 192]];
function layerDaCor(d, cor, tracejado) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(cor || '');
  if (!m || ehCinza(cor) || /^#f{6}$/i.test(cor)) return null;
  const v = m.slice(1).map(h => parseInt(h, 16));
  const aci = ACI.reduce((b, c) => ((c[1] - v[0]) ** 2 + (c[2] - v[1]) ** 2 + (c[3] - v[2]) ** 2 < (b[1] - v[0]) ** 2 + (b[2] - v[1]) ** 2 + (b[3] - v[2]) ** 2 ? c : b))[0];
  // tracejado à parte: na NBR 5444 o eletroduto tracejado é o embutido no piso
  return d.camada(`PDF-COR-${cor.slice(1).toUpperCase()}${tracejado ? '-TRACEJADO' : ''}`, aci);
}

// Página da planta num PDF de várias (até 10 páginas). Antes era a com mais
// traços — quase sempre o diagrama unifilar, e o 3D "construía uma edificação
// com os desenhos do quadro". Agora cada página é classificada
// (utils/classificarPranchaPdf.js) e vale a de maior pontuação de planta; sem
// planta identificada, a com mais traços entre as que não foram reconhecidas
// como outra coisa; todas sendo diagrama/quadro/tabela → erro SEM_PLANTA.
// Devolve { n, geo, classificacao, folhas: [{ pagina, tipo, resumo, ... }] }.
const semDesenho = (geo) => geo.caminhos.filter(c => c.traco).reduce((s, c) => s + c.segs, 0) < 12;
async function escolherPagina(doc, OPS, pagina, escala) {
  if (pagina && (pagina < 1 || pagina > doc.numPages)) throw erro(`O PDF tem ${doc.numPages} página(s); a página ${pagina} não existe.`, 'PAGINA');
  const lista = pagina ? [pagina] : Array.from({ length: Math.min(doc.numPages, 10) }, (_, i) => i + 1);
  const folhas = [];
  let melhor = null;
  // planta (pela pontuação) > não identificada (pelos traços) > diagrama/quadro, escaneada
  const nota = (f) => (f.temPlanta ? 2e9 + f.pontuacaoPlanta * 1e6 : f.semPlanta || f.raster ? -1 : f.qtd);
  for (const n of lista) {
    const pag = await doc.getPage(n);
    // conta os traços ANTES de montar a geometria (que ocupa memória por traço)
    const ops = await pag.getOperatorList();
    const qtd = ops.fnArray.filter(f => f === OPS.constructPath).length;
    if (qtd > MAX_CAMINHOS) {
      pag.cleanup();
      if (pagina) throw erro(`a página ${n} tem ${qtd.toLocaleString('pt-BR')} traços (limite ${MAX_CAMINHOS.toLocaleString('pt-BR')}). Envie o DWG/DXF ou um PDF só da planta baixa.`, 'GRANDE');
      folhas.push({ pagina: n, qtd, grande: true, tipo: 'desconhecido', resumo: `${qtd.toLocaleString('pt-BR')} traços — não lida` });
      continue;
    }
    const geo = await lerPagina(pag, OPS, { geometria: true, ops });
    pag.cleanup();
    const raster = semDesenho(geo);
    const c = raster ? null : classificarPaginaPdf(geo, { escala });
    const f = c ? { pagina: n, qtd, tipo: c.tipo, resumo: c.resumo, temPlanta: c.temPlanta, semPlanta: c.semPlanta, pontuacaoPlanta: c.pontuacaoPlanta }
      : { pagina: n, qtd, raster: true, tipo: 'desconhecido', resumo: 'sem desenho vetorial' };
    folhas.push(f);
    if (!melhor || nota(f) > nota(melhor.f)) melhor = { f, n, geo, classificacao: c };
  }
  if (!melhor) throw erro(`as páginas do PDF têm traços demais (limite ${MAX_CAMINHOS.toLocaleString('pt-BR')}). Envie o DWG/DXF ou um PDF só da planta baixa.`, 'GRANDE');
  if (folhas.some(f => f.semPlanta) && folhas.every(f => f.semPlanta || f.raster || f.grande)) {
    throw erro(pagina
      ? `A página ${pagina} é ${folhas[0].resumo} — não há planta baixa nela para montar o 3D.`
      : `As páginas deste arquivo são diagramas/quadros elétricos — não há planta baixa para montar o 3D (${folhas.map(f => `folha ${f.pagina}: ${f.resumo}`).join('; ')}).`, 'SEM_PLANTA');
  }
  return { ...melhor, folhas };
}

// buffer do PDF → { texto (DXF em metros), escala, origemEscala, pagina, paginas, avisos }
// `escala`: denominador informado (50 para 1:50); `pagina`: 1, 2… (padrão: a de planta — ver escolherPagina)
// Sem `pagina`, TODAS as folhas com planta entram, lado a lado, cada uma na sua
// moldura (paginasUsadas); `pagina` = a principal.
// folhas: [{ pagina, tipo, resumo, usada }] — a classificação de cada página lida
// `nomeArquivo`: a escala escrita no nome ("… A0 1_50.pdf") vale depois do carimbo e da informada (fase 3, CAD-09)
async function pdfParaDxf(buffer, { escala: escalaInformada = null, pagina = null, nomeArquivo = '' } = {}) {
  const escalaDoNomeArquivo = escalaDoNome(nomeArquivo);
  const { getDocument, OPS } = await pdfjs();
  let doc;
  try {
    doc = await getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, verbosity: 0, disableFontFace: true }).promise;
  } catch (e) {
    throw erro(`não é um PDF válido (${e.message}).`, 'PDF');
  }
  try {
    const { n, geo, classificacao, folhas } = await escolherPagina(doc, OPS, Number(pagina) || null, Number(escalaInformada) || null);
    // escaneado: só imagem (e talvez a camada de texto do OCR) — quase nenhum segmento desenhado
    if (semDesenho(geo)) {
      throw erro('este PDF não tem desenho vetorial (parece escaneado ou imagem). Para o 3D, envie o PDF exportado do AutoCAD/Revit ou o DWG/DXF.', 'RASTER');
    }
    const d = new DesenhoDxf({ layers: [], unidade: 'm', escalaPlotagem: Number(escalaInformada) || 50 });
    const L = {
      parede: d.camada('PDF-PAREDE', 7), cheia: d.camada('PDF-PAREDE-CHEIA', 8), linhas: d.camada('PDF-LINHAS', 9),
      tracejado: d.camada('PDF-TRACEJADO', 9), texto: d.camada('PDF-TEXTO', 2),
    };
    const avisos = [];
    // a folha escolhida primeiro; sem página pedida, também as OUTRAS folhas com planta,
    // cada uma ao lado da anterior e dentro da sua moldura: o 3D faz um modelo por
    // planta (skills/_comum/cad/modelosPorPlanta.js) — pedido de 01/11/2026, "cada
    // folha em pdf individualmente"
    const r0 = escreverFolha(d, L, geo, classificacao, { n, escalaInformada, escalaDoNomeArquivo, dx: 0, avisos, obrigatoria: true });
    const usadas = [n];
    let dx = r0.largura * 1.1;
    for (const f of pagina ? [] : folhas.filter(x => x.temPlanta && x.pagina !== n).sort((a, b) => a.pagina - b.pagina)) {
      const pag = await doc.getPage(f.pagina);
      const g = await lerPagina(pag, OPS, { geometria: true });
      pag.cleanup();
      const r = escreverFolha(d, L, g, classificarPaginaPdf(g, { escala: Number(escalaInformada) || null }), { n: f.pagina, escalaInformada, escalaDoNomeArquivo, dx, avisos, obrigatoria: false });
      if (!r) continue;
      usadas.push(f.pagina);
      dx += r.largura * 1.1;
    }
    // o que foi ignorado vai para a tela (avisos) e para o resumo gravado (folhas)
    const outras = folhas.filter(f => !usadas.includes(f.pagina) && !f.raster);
    if (usadas.length > 1) avisos.push(`Folhas ${usadas.join(', ')} usadas para o 3D, cada uma um modelo à parte.`);
    if (outras.length) avisos.push(`${usadas.length > 1 ? 'Fora do 3D' : `Usada a folha ${n} (${classificacao?.resumo || 'desenho'}) para o 3D`}. ${outras.map(f => `Folha ${f.pagina}: ${f.resumo}${f.semPlanta ? ' — ignorada' : ''}`).join('; ')}.`);
    return {
      texto: d.toString(), escala: r0.escala, origemEscala: r0.origemEscala, pagina: n, paginasUsadas: usadas, paginas: doc.numPages, avisos,
      folhas: folhas.map(({ pagina: p, tipo, resumo }) => ({ pagina: p, tipo, resumo, usada: usadas.includes(p) })),
    };
  } finally {
    await doc.destroy();
  }
}

// Uma folha do PDF no DXF, deslocada `dx` metros para a direita e com a moldura
// da página na layer PDF-MARGEM-F<n> (a leitura da arquitetura a usa para separar as
// pranchas e não a sobe como parede). Folha que não é obrigatória e não tem
// escala nem linhas: null, com aviso (as outras seguem).
// (folha sem escala NÃO usa a da principal: a folha 1 da Arena saía com 23 × 16 m, errada)
function escreverFolha(d, L, geo, classificacao, { n, escalaInformada, escalaDoNomeArquivo = null, dx, avisos, obrigatoria }) {
  const falhar = (msg, codigo) => {
    if (obrigatoria) throw erro(msg, codigo);
    avisos.push(`Folha ${n} fora do 3D: ${msg}`);
    return null;
  };
  // só a planta vai para o DXF: as regiões de diagrama, quadro de cargas, legenda,
  // detalhe e carimbo da folha ficam de fora (folha MISTA: planta + unifilar)
  const H = geo.altura, W = geo.largura;
  const manter = regioesParaManter(classificacao);
  const margem = Math.max(W, H) / 250;
  const naPlanta = (p) => !manter.length || manter.some(r => naRegiao([r[0] - margem, r[1] - margem, r[2] + margem, r[3] + margem], p));

  // arcos e escala (em pontos do PDF, antes de converter) — portas só da planta:
  // o arco do disjuntor no unifilar puxava o raio mediano e a escala não saía
  const arcosPt = [], retasPt = [];
  for (const c of geo.caminhos) {
    if (!c.traco) continue;
    for (const s of c.subs) {
      for (const seg of s.segs) {
        if (seg[0] === 'l') { if (naPlanta(seg[1])) retasPt.push([seg[1], seg[2]]); continue; }
        const a = arcoDaCurva(...seg.slice(1));
        if (a && naPlanta(a.centro)) juntarArco(arcosPt, a);
      }
    }
  }
  // a escala informada vale mais na folha principal; nas OUTRAS folhas o carimbo da
  // própria folha vem antes e a informada só cobre a folha sem escala — na Arena, a
  // planta sem escala ao lado de folhas 1:25: a informada em todas deixava as
  // luminárias com 1,3 m
  const informada = Number(escalaInformada) || null;
  let escala = obrigatoria ? informada : null, origemEscala = escala ? 'informada' : null;
  // escala escrita: a MESMA função da metragem da análise (pdfVetorial/escala.js, escalaDaPlanta) — o carimbo sem a
  // escala de detalhe, o título da vista de planta; antes o 3D usava só o carimbo e, no empate 1:50 × 1:25, saía na metade
  if (!escala) {
    const e = escalaDaPlanta(geo.textos, classificacao?.regioes || []);
    if (e.escala) {
      escala = e.escala; origemEscala = e.origem;
      if (e.ambigua) avisos.push(`A folha ${n} tem as escalas ${e.ambigua.map(v => `1:${v}`).join(' e ')} escritas sem dizer qual é a da planta: usada 1:${escala} (a mesma da metragem da análise) — confira as medidas ou informe a escala.`);
    }
  }
  if (!escala && informada) { escala = informada; origemEscala = 'informada'; }
  if (!escala && escalaDoNomeArquivo) {
    escala = escalaDoNomeArquivo; origemEscala = 'nome_arquivo';
    avisos.push(`Escala 1:${escala} da folha ${n} tirada do nome do arquivo (o carimbo não tem a escala) — confira as medidas.`);
  }
  if (!escala) {
    escala = escalaPelasPortas(arcosPt, retasPt);
    if (escala) { origemEscala = 'portas'; avisos.push(`Escala 1:${escala} da folha ${n} deduzida pelo tamanho das portas (o carimbo não tem a escala) — confira as medidas.`); }
  }
  // as cotas, como na metragem da análise (utils/escalaDaPlanta.js): só dentro das regiões de planta
  if (!escala) {
    const regioesPlanta = (classificacao?.regioes || []).filter(r => r.tipo === 'planta').map(r => r.caixa);
    escala = escalaPelasCotas(geo, regioesPlanta);
    if (escala) { origemEscala = 'cota'; avisos.push(`Escala 1:${escala} da folha ${n} deduzida pelas cotas do desenho (o carimbo não tem a escala) — confira as medidas.`); }
  }
  if (!escala || escala < 1 || escala > 5000) {
    return falhar('não achei a escala da planta no PDF (nem "ESC. 1:50" no carimbo, nem portas para medir). Informe a escala (ex.: 50 para 1:50).', 'ESCALA');
  }

  const k = PT_EM_M * escala;
  const P = ([x, y]) => [dx + x * k, (H - y) * k]; // PDF (y para baixo) → metros (y para cima)
  const carimbo = regiaoDoCarimbo(geo.caminhos, geo.textos, W, H);
  const meio = (seg) => { const a = seg[1], b = seg.at(-1); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  const foraDoCarimbo = (seg) => (!carimbo || !seg.slice(1).every(p => naRegiao(carimbo, p))) && naPlanta(meio(seg));
  // a espessura de parede sai só da planta (o barramento grosso do unifilar puxava o limite)
  const lwParede = espessuraDeParede(geo.caminhos.filter(c => naPlanta([(c.caixa[0] + c.caixa[2]) / 2, (c.caixa[1] + c.caixa[3]) / 2])));
  if (!lwParede) avisos.push(`As linhas da folha ${n} têm todas a mesma espessura: o sistema não separa parede de móvel — móveis desenhados podem aparecer como parede no 3D.`);

  let entidades = 0;
  for (const c of geo.caminhos) {
    if (c.traco) {
      // colorido nunca é parede (parede é preta/cinza): vai para a layer da cor
      const layer = layerDaCor(d, c.stroke, !!c.dash) || (c.dash ? L.tracejado : (lwParede && c.lwPg >= lwParede ? L.parede : L.linhas));
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
    if (naRegiao(carimbo, [t.x, t.y]) || !naPlanta([t.x, t.y])) continue;
    const [x, y] = P([t.x, t.y]);
    d.texto(x, y, Math.max(t.h * k, 0.01), t.s, { layer: L.texto });
  }
  if (!entidades) return falhar('não achei linhas de desenho na página do PDF.', 'VAZIO');
  // moldura da página: separa esta folha das outras no 3D
  d.polilinha([[dx, 0], [dx + W * k, 0], [dx + W * k, H * k], [dx, H * k]], { layer: d.camada(`PDF-MARGEM-F${n}`, 1), fechada: true });
  const fora = (classificacao?.regioes || []).filter(r => NAO_PLANTA.has(r.tipo) && r.tipo !== 'carimbo');
  if (manter.length && fora.length) {
    const porTipo = {};
    for (const r of fora) porTipo[r.rotulo] = (porTipo[r.rotulo] || 0) + 1;
    avisos.push(`Na folha ${n}, ficaram fora do 3D: ${Object.entries(porTipo).map(([t, q]) => (q > 1 ? `${t} (${q})` : t)).join(', ')}.`);
  }
  return { escala, origemEscala, largura: W * k };
}

// ── Processo à parte ────────────────────────────────────────────────────
// O leitor de PDF (pdfjs) com um desenho grande pode derrubar a thread com um
// erro nativo (visto em teste: "Segmentation fault" ao converter vários PDFs
// pesados seguidos numa worker thread) — e isso derruba o processo inteiro.
// Como na conversão do DWG (skills/_comum/cad/dwg.js), a conversão roda num
// processo filho: este mesmo arquivo, com o PDF na entrada; na saída, a 1ª
// linha é o JSON do resultado e o resto é o DXF. Falha: código 2 e JSON do erro.
const { spawn } = require('child_process');

function pdfParaDxfIsolado(buffer, { escala = null, pagina = null, nomeArquivo = '', timeoutMs = 150000 } = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, ['--max-old-space-size=2048', __filename, String(Number(escala) || ''), String(Number(pagina) || ''), String(nomeArquivo || '').slice(0, 260)],
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
      const { texto, ...resultado } = await pdfParaDxf(Buffer.concat(partes), { escala: Number(process.argv[2]) || null, pagina: Number(process.argv[3]) || null, nomeArquivo: process.argv[4] || '' });
      process.stdout.write(`${JSON.stringify({ ok: true, resultado })}\n`);
      process.stdout.write(texto, () => process.exit(0));
    } catch (e) {
      process.stdout.write(`${JSON.stringify({ erro: e.message, codigo: e.codigo || null })}\n`, () => process.exit(2));
    }
  });
}

module.exports = { pdfParaDxf, pdfParaDxfIsolado, paraTestes: { arcoDaCurva, juntarArco, escalaPelasPortas, juntarTextos, espessuraDeParede } };
