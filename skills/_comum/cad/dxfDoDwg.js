// Montagem do DXF (texto) a partir do banco que o LibreDWG lê de um DWG
// (convertEx em ./dwg-para-dxf.mjs). Fica separado do processo filho para ser
// testado sem um DWG (./teste-cad.js monta um banco no mesmo formato).
//
// Só a geometria que as leituras usam (arquitetura.js, projetoDxf.js,
// pontosDoDesenho.js): linhas, polilinhas, arcos, círculos, elipses, splines,
// sólidos, pontos, hachura sólida, textos, blocos com os ATRIBUTOS e o texto
// das chamadas (multileader). A escrita DXF do próprio LibreDWG (dwg_write_dxf)
// descarta blocos com POLYLINE2D — portas "Door (2D)" e blocos dinâmicos sumiam.
//
// Revisão de 02/11/2026:
//   - CAD-04: o atributo de bloco saía como TEXT solto, sem a tag: ALTURA, DESCR
//     e TAG nunca chegavam ao bloco num DWG (no DXF do AutoCAD chegavam). Agora é
//     ATTRIB de verdade (66=1 no INSERT, tag no código 2, SEQEND) — a arquitetura
//     lê o ATTRIB como texto (nome da sala em etiqueta de bloco) do mesmo jeito;
//   - CAD-05: SPLINE, ELLIPSE, SOLID e POINT caíam fora (a rota de eletroduto
//     desenhada em spline não era medida no DWG); a cota (DIMENSION) vai como
//     entidade, com a medida (42) e o texto (1); o texto da chamada (MULTILEADER)
//     vai como MTEXT. O LEADER antigo não tem texto próprio: o texto dele é um
//     MTEXT à parte, que já é gravado; a linha do leader não vai (numa layer de
//     eletroduto ela seria medida como eletroduto);
//   - CAD-07: o bloco dinâmico com parâmetro alterado é um "*U…" anônimo; o nome
//     verdadeiro (achado pelo processo filho) vai na tabela BLOCK_RECORD, no xdata
//     "AcDbDynamicBlockTrueName" — projetoDxf.js lê dali e conta o símbolo.
// Ficam de fora: hachura com padrão, sólidos 3D, imagens e os blocos de cota (*D).

const num = (v) => (Number.isFinite(v) ? Number(v.toFixed(6)) : 0);
const graus = (r) => num((r * 180) / Math.PI);
// texto numa linha só (o DXF não aceita quebra; o MTEXT usa \P)
const txt = (s) => String(s ?? '').replace(/\r?\n/g, '\\P').replace(/[\u0000-\u0008\u000B-\u001F]/g, '');
// valor que a lib `dxf` toma por marcador de seção/tabela/bloco: não pode ir como valor solto
const RESERVADAS_DXF = /^(TABLE|ENDTAB|SECTION|ENDSEC|EOF|BLOCK|ENDBLK|SEQEND)$/i;

// laço do contorno da hachura → pontos (polilinha, ou arestas reta/arco)
function contornoHachura(p) {
  if (p.vertices?.length) return p.vertices.map(v => [v.x, v.y]);
  const pts = [];
  for (const a of p.edges || []) {
    if (a.type === 2 && a.center && a.radius) {
      let a0 = a.startAngle || 0, a1 = a.endAngle || 0;
      if (a.isCCW === 0 || a.counterClockWise === false) [a0, a1] = [-a0, -a1];
      if (a1 <= a0) a1 += 2 * Math.PI;
      for (let i = 0; i < 8; i++) { const t = a0 + ((a1 - a0) * i) / 8; pts.push([a.center.x + a.radius * Math.cos(t), a.center.y + a.radius * Math.sin(t)]); }
    } else if (a.start) pts.push([a.start.x, a.start.y]);
    else if (a.center) pts.push([a.center.x, a.center.y]);
  }
  return pts;
}

// posição de um texto de linha (TEXT ou o texto do ATTRIB): alinhado (centro/direita) → o
// ponto de alinhamento, que é onde o texto aparece
const posicaoDoTexto = (t) => ((t.halign || t.valign) && t.endPoint && (t.endPoint.x || t.endPoint.y) ? t.endPoint : t.startPoint);

// nós de uma spline de grau 1 que passa pelos pontos (n pontos, extremos presos)
const nosLineares = (n) => [0, ...Array.from({ length: n }, (_, i) => i), n - 1];

// db: { header, entities, tables: { BLOCK_RECORD, DIMSTYLE } } do LibreDWG.
// opcoes.nomesDinamicos: Map("*U12" → "TOMADA") dos blocos dinâmicos (./dwg-para-dxf.mjs).
function montarDxf(db, { nomesDinamicos = new Map() } = {}) {
  const out = [];
  const g = (codigo, valor) => out.push(String(codigo), String(valor));
  const extrusao = (e) => { if ((e.extrusionDirection?.z ?? 1) < 0) { g(210, 0); g(220, 0); g(230, -1); } };
  const comum = (tipo, e) => { g(0, tipo); g(8, txt(e.layer || '0')); };

  const registros = db.tables?.BLOCK_RECORD?.entries || [];
  const modelo = registros.find(b => /^\*Model_Space$/i.test(b.name));
  // blocos de cota (*D) e espaços de papel ficam de fora; dinâmicos (*U) entram
  const blocos = registros.filter(b => b !== modelo && !/^\*(Paper_Space|D\d)/i.test(b.name));
  const blocosValidos = new Set(blocos.map(b => b.name));
  // altura do texto da cota: DIMTXT × DIMSCALE do estilo
  const estilosCota = new Map((db.tables?.DIMSTYLE?.entries || []).map(s => [s.name, (s.DIMTXT || 0) * (s.DIMSCALE || 1)]));

  function atributo(a, layerInsert) {
    const t = a.text || {};
    // o ponto inicial, como o código 10 do ATTRIB no DXF do AutoCAD (e como o conversor já gravava)
    const p = t.startPoint || t.endPoint;
    comum('ATTRIB', { layer: a.layer || layerInsert });
    // a lib `dxf` lê 10/20/40/1 na subclasse AcDbText e a tag (2) na AcDbAttribute
    g(100, 'AcDbText');
    g(10, num(p.x)); g(20, num(p.y)); g(40, num(t.textHeight) || 1); g(1, txt(t.text));
    g(100, 'AcDbAttribute');
    g(2, txt(a.tag || a.attrTag || '')); g(70, a.flags || 0);
    if (t.rotation) g(50, graus(t.rotation));
  }

  function entidade(e) {
    switch (e.type) {
      case 'LINE':
        comum('LINE', e);
        g(10, num(e.startPoint.x)); g(20, num(e.startPoint.y)); g(11, num(e.endPoint.x)); g(21, num(e.endPoint.y));
        break;
      case 'LWPOLYLINE':
      case 'POLYLINE2D': {
        const v = e.vertices || [];
        if (v.length < 2) break;
        const fechada = e.type === 'LWPOLYLINE' ? (e.flag & 512) : (e.flag & 1);
        comum('LWPOLYLINE', e);
        g(90, v.length); g(70, fechada ? 1 : 0);
        for (const p of v) { g(10, num(p.x)); g(20, num(p.y)); if (p.bulge) g(42, num(p.bulge)); }
        extrusao(e);
        break;
      }
      case 'ARC':
        comum('ARC', e);
        g(10, num(e.center.x)); g(20, num(e.center.y)); g(40, num(e.radius)); g(50, graus(e.startAngle)); g(51, graus(e.endAngle));
        extrusao(e);
        break;
      case 'CIRCLE':
        comum('CIRCLE', e);
        g(10, num(e.center.x)); g(20, num(e.center.y)); g(40, num(e.radius));
        extrusao(e);
        break;
      case 'ELLIPSE':
        // ângulos em parâmetro (radianos), eixo maior relativo ao centro — igual ao DXF
        if (!e.center || !e.majorAxisEndPoint) break;
        comum('ELLIPSE', e);
        g(10, num(e.center.x)); g(20, num(e.center.y)); g(30, num(e.center.z));
        g(11, num(e.majorAxisEndPoint.x)); g(21, num(e.majorAxisEndPoint.y)); g(31, num(e.majorAxisEndPoint.z));
        g(40, num(e.axisRatio) || 1); g(41, num(e.startAngle)); g(42, Number.isFinite(e.endAngle) ? num(e.endAngle) : num(2 * Math.PI));
        extrusao(e);
        break;
      case 'SPLINE': {
        const cps = e.controlPoints || [];
        const fit = e.fitPoints || [];
        // só com pontos de ajuste (o AutoCAD grava assim a spline desenhada "por pontos"): a lib
        // `dxf` mede pelos pontos de controle, então vai como spline de grau 1 pelos pontos de
        // ajuste — a medida sai pelas cordas entre eles (um pouco menor que a curva)
        const porAjuste = cps.length < 2 && fit.length >= 2;
        const pts = porAjuste ? fit : cps;
        if (pts.length < 2) break;
        const grau = porAjuste ? 1 : (e.degree || 3);
        const nos = porAjuste ? nosLineares(fit.length) : (e.knots || []);
        if (!porAjuste && nos.length !== pts.length + grau + 1) break; // spline sem nós coerentes: a lib não interpola
        comum('SPLINE', e);
        g(70, (e.flag || 0) & (porAjuste ? ~4 : ~0)); g(71, grau); g(72, nos.length); g(73, pts.length); g(74, porAjuste ? 0 : fit.length);
        for (const k of nos) g(40, num(k));
        if (!porAjuste && e.weights?.length === pts.length) for (const w of e.weights) g(41, num(w));
        for (const p of pts) { g(10, num(p.x)); g(20, num(p.y)); g(30, num(p.z)); }
        break;
      }
      case 'SOLID': {
        const c = [e.corner1, e.corner2, e.corner3, e.corner4 || e.corner3];
        if (c.some(p => !p)) break;
        comum('SOLID', e);
        c.forEach((p, i) => { g(10 + i, num(p.x)); g(20 + i, num(p.y)); });
        extrusao(e);
        break;
      }
      case 'POINT':
        if (!e.position) break;
        comum('POINT', e);
        g(10, num(e.position.x)); g(20, num(e.position.y)); g(30, num(e.position.z));
        break;
      case 'DIMENSION': {
        // a cota como entidade (a lib `dxf` não desenha nem conta): a medida (42) e o texto
        // escrito (1), para conferir a escala; o desenho da cota (bloco *D) não vai
        if (!e.definitionPoint || !e.textPoint) break;
        comum('DIMENSION', e);
        g(10, num(e.definitionPoint.x)); g(20, num(e.definitionPoint.y));
        g(11, num(e.textPoint.x)); g(21, num(e.textPoint.y));
        g(70, (e.dimensionType || 0) & 7);
        if (e.text) g(1, txt(e.text));
        if (Number.isFinite(e.measurement)) g(42, num(e.measurement));
        if (e.subDefinitionPoint1) { g(13, num(e.subDefinitionPoint1.x)); g(23, num(e.subDefinitionPoint1.y)); }
        if (e.subDefinitionPoint2) { g(14, num(e.subDefinitionPoint2.x)); g(24, num(e.subDefinitionPoint2.y)); }
        if (e.rotationAngle) g(50, graus(e.rotationAngle));
        // texto escrito à mão na cota ("ELETROCALHA 300x100", "ver detalhe"): também como texto
        const escrito = String(e.text || '').replace(/<>/g, '').trim();
        if (/[A-Za-zÀ-ú]{3,}/.test(escrito)) {
          comum('TEXT', e);
          g(10, num(e.textPoint.x)); g(20, num(e.textPoint.y)); g(40, num(estilosCota.get(e.styleName)) || 1);
          g(1, txt(String(e.text).replace(/<>/g, Number.isFinite(e.measurement) ? String(num(e.measurement)) : '')));
        }
        break;
      }
      case 'MULTILEADER': {
        // texto da chamada ("Eletrocalha 300x100 — ver detalhe") como MTEXT na âncora do texto
        const s = String(e.textContent || '').trim();
        const p = e.textAnchor || e.contentBasePosition;
        if (!s || !p) break;
        comum('MTEXT', e);
        g(10, num(p.x)); g(20, num(p.y)); g(40, num(e.textHeight) || 1); g(1, txt(s));
        break;
      }
      case 'TEXT': {
        const p = posicaoDoTexto(e);
        comum('TEXT', e);
        g(10, num(p.x)); g(20, num(p.y)); g(40, num(e.textHeight) || 1); g(1, txt(e.text)); if (e.rotation) g(50, graus(e.rotation));
        break;
      }
      case 'MTEXT':
        comum('MTEXT', e);
        g(10, num(e.insertionPoint.x)); g(20, num(e.insertionPoint.y)); g(40, num(e.textHeight) || 1); g(1, txt(e.text));
        break;
      case 'ATTRIB':
        // o atributo vai junto do INSERT dele (abaixo); solto, não tem a quem pertencer
        break;
      case 'INSERT': {
        if (!blocosValidos.has(e.name)) break;
        const atributos = (e.attribs || []).filter(a => (a.text?.startPoint || a.text?.endPoint) && String(a.text?.text ?? '').trim());
        comum('INSERT', e);
        if (atributos.length) g(66, 1);
        g(2, txt(e.name)); g(10, num(e.insertionPoint.x)); g(20, num(e.insertionPoint.y));
        g(41, num(e.xScale ?? 1) || 1); g(42, num(e.yScale ?? 1) || 1); g(43, num(e.zScale ?? 1) || 1);
        if (e.rotation) g(50, graus(e.rotation));
        if (e.columnCount > 1 || e.rowCount > 1) { g(70, e.columnCount || 1); g(71, e.rowCount || 1); g(44, num(e.columnSpacing)); g(45, num(e.rowSpacing)); }
        extrusao(e);
        if (atributos.length) {
          for (const a of atributos) atributo(a, e.layer);
          g(0, 'SEQEND'); g(8, txt(e.layer || '0'));
        }
        break;
      }
      case 'HATCH': {
        // só o preenchimento sólido, com o contorno como polilinha: é ele que separa
        // os símbolos iguais no traço (tomada baixa vazia × alta cheia × média meio
        // cheia, legenda do QiBuilder) — sem ele a tomada do chuveiro saía a 0,30 m
        if (!e.solidFill && !/^SOLID$/i.test(e.patternName || '')) break;
        const lacos = (e.boundaryPaths || []).map(contornoHachura).filter(l => l.length >= 3);
        if (!lacos.length) break;
        comum('HATCH', e);
        g(10, 0); g(20, 0); g(30, 0); g(210, 0); g(220, 0); g(230, (e.extrusionDirection?.z ?? 1) < 0 ? -1 : 1);
        g(2, 'SOLID'); g(70, 1); g(71, 0); g(91, lacos.length);
        for (const l of lacos) {
          g(92, 2); g(72, 0); g(73, 1); g(93, l.length);
          for (const [x, y] of l) { g(10, num(x)); g(20, num(y)); }
          g(97, 0);
        }
        g(75, 0); g(76, 1); g(98, 0);
        break;
      }
      default:
        break; // sólido 3D, imagem, leader (o texto dele é um MTEXT à parte), tabela: não usados na leitura
    }
  }

  g(0, 'SECTION'); g(2, 'HEADER');
  g(9, '$ACADVER'); g(1, 'AC1015');
  g(9, '$INSUNITS'); g(70, db.header?.INSUNITS ?? 0);
  g(0, 'ENDSEC');
  // nome verdadeiro dos blocos dinâmicos (*U…) usados aqui — lido por projetoDxf.js
  const dinamicos = blocos.map(b => [b.name, nomesDinamicos.get(b.name)]).filter(([u, v]) => v && !RESERVADAS_DXF.test(u) && !RESERVADAS_DXF.test(v));
  if (dinamicos.length) {
    g(0, 'SECTION'); g(2, 'TABLES');
    g(0, 'TABLE'); g(2, 'BLOCK_RECORD'); g(70, dinamicos.length);
    for (const [u, v] of dinamicos) { g(0, 'BLOCK_RECORD'); g(2, txt(u)); g(1001, 'AcDbDynamicBlockTrueName'); g(1000, txt(v)); }
    g(0, 'ENDTAB');
    g(0, 'ENDSEC');
  }
  g(0, 'SECTION'); g(2, 'BLOCKS');
  for (const b of blocos) {
    g(0, 'BLOCK'); g(8, '0'); g(2, txt(b.name)); g(70, 0); g(10, num(b.basePoint?.x)); g(20, num(b.basePoint?.y)); g(3, txt(b.name));
    for (const e of b.entities || []) entidade(e);
    g(0, 'ENDBLK'); g(8, '0');
  }
  g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'ENTITIES');
  // só o espaço do modelo (o espaço de papel tem carimbo e viewports)
  const doModelo = modelo?.entities?.length ? modelo.entities : (db.entities || []).filter(e => !modelo || e.ownerBlockRecordSoftId === modelo.handle);
  for (const e of doModelo) entidade(e);
  g(0, 'ENDSEC');
  g(0, 'EOF');
  return out.join('\n') + '\n';
}

module.exports = { montarDxf };
