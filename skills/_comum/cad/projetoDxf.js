// Leitura de DXF de PROJETO (elétrica, iluminação, CFTV, rede…) para a Análise
// de Projeto: o que o PDF só dá como desenho, o DWG/DXF dá como dado.
//   - textos (TEXT, MTEXT, atributos) remontados em linhas, de cima para baixo
//     e da esquerda para a direita — os leitores de texto do PDF (carimbo,
//     lista de materiais, quadro de cargas, códigos de câmera/ponto) rodam em cima;
//   - blocos inseridos (símbolos) contados por nome, com a posição em metros
//     (dá para saber em que ambiente cada um está) e a descrição pela legenda
//     da prancha quando há uma;
//   - comprimento das linhas por layer (eletroduto, eletrocalha, fiação…) em metros.
// Interpretar o que cada bloco é (tomada, luminária, câmera) e a disciplina fica
// com quem chama (backend/src/utils/analiseCad.js). Nenhum dado de cliente aqui.
const { Helper } = require('dxf');
const { transformar } = require('./arquitetura');

// símbolo = bloco pequeno (até 3 m no maior lado, já em metros); maior é
// "contêiner" (desenho inteiro dentro de um bloco, xref inserida): abre e conta dentro
const SIMBOLO_MAX_M = 3;
const SIMBOLO_MIN_M = 0.02;

// arquitetura, anotação e folha: não são material do projeto
const RE_LAYER_FORA = /^(0-)?ARQ|ARQUIT|MOBIL|LAYOUT|^COTA|COTAS|\bDIM|DIMENS|^TEXTO|TEXTOS?$|CARIMBO|\bSELO|FOLHA|PRANCHA|MARGEM|DEFPOINTS|HACH|NOTAS?\b|ANOTA|IDENTIFICADOR|\bTAG|ESTRUT|^FORMA|VIEWPORT|\bVPORT|PROJE[ÇC][ÃA]O|PROJ\b|CORTINA|MONTANTE|MODELOS GEN|ISOLAMENTO|ESQUADRIA|GUARDA|_dwg$|\$0\$/i;
// bloco contêiner que é referência externa (xref inserida/"bind"): o que vem dela é base, não projeto
const RE_REFERENCIA = /XREF|\$0\$|\bdwg$|_dwg$|^ARQ|ARQUIT|^EST-|ESTRUT|^FORMA/i;
// título de legenda de símbolos (não "LEGENDA CORTE" nem "legenda de fixação")
const RE_TITULO_LEGENDA = /^(LEGENDA|CONVEN[ÇC][ÕO]ES|SIMBOLOGIA)(\s+(GERAL|DE (S[ÍI]MBOLOS|EL[ÉE]TRICA|ILUMINA[ÇC][ÃA]O|INSTALA[ÇC][ÕO]ES|PONTOS|CFTV|REDE|L[ÓO]GICA|TELEFONIA|INC[ÊE]NDIO|ALARME|SEGURAN[ÇC]A|AUTOMA[ÇC][ÃA]O)))?\s*:?\s*$/i;
const RE_BLOCO_FORA = /PORTA|JANELA|\bDOOR|WINDOW|NORTE|NORTH|CARIMBO|SELO|\bCOTA|N[IÍ]VEL|^NI$|^NV$|CORTE|DETALHE|^SETA|CHAMADA|LOGO|MARGEM|FOLHA|T[IÍ]TULO|ESCALA|MOBILI|CADEIRA|\bMESA|SOF[AÁ]|\bCAMA\b|ARM[AÁ]RIO|BACIA|LAVAT|\bPIA\b|CUBA|CHUVEIRO|\bVASO|CARRO|VE[IÍ]CULO|VEGETA|[ÁA]RVORE|PESSOA|SITUA[ÇC][ÃA]O|LAYOUT|MATRIZ|^FORMA|^EST-|^ARQ-|BANCADA|ESCADA|ELEVADOR|^REV|REVIS[ÃA]O|LEGENDA/i;

const limparTexto = (s) => String(s || '')
  .replace(/\\P/g, '\n')
  .replace(/\\[A-Za-z][^;\\{}]*;/g, '')
  .replace(/\\[~ ]/g, ' ')
  .replace(/[{}]/g, '')
  .replace(/%%[cC]/g, 'Ø').replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[uUoO]/g, '')
  .replace(/[ \t]+/g, ' ')
  .trim();

// "_5L_Difusor linear_TROX_VSD50 - VSD50-2-VS-M-14886346-3P - FORRO" → "Difusor linear TROX VSD50 - VSD50-2-VS-M"
function nomeLimpoDoBloco(nome) {
  let s = String(nome || '').replace(/^_\d+L_/, '').replace(/^OFEletrico_/i, '');
  s = s.replace(/-(V\d+|\d{5,})(-.*)?$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const [a, b] = s.split(/\s+-\s+/);
  if (b && b.replace(/^OFEletrico /i, '').startsWith(a)) s = b.replace(/^OFEletrico /i, '');
  return s.trim() || String(nome);
}

const escalaDe = (transforms) => transforms.reduce((m, t) => m * Math.max(Math.abs(t.scaleX || 1), Math.abs(t.scaleY || 1)), 1);
const comprimento = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// Lê o DXF. opcoes: { fator (unidade → metro, de lerArquitetura), reLayerLinha (layers medidas) }
function lerProjetoDxf(textoDxf, { fator = 1, reLayerLinha = null } = {}) {
  const { parsed } = new Helper(textoDxf);
  const blocos = new Map((parsed.blocks || []).map(b => [b.name, b]));

  // extensão de cada bloco (unidades dele, sem escala), com os blocos internos pela extensão deles
  const extensoes = new Map();
  function extensao(nome, prof = 0) {
    if (extensoes.has(nome)) return extensoes.get(nome);
    extensoes.set(nome, 0); // ciclo
    const b = blocos.get(nome);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const somar = (x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } };
    for (const e of b?.entities || []) {
      if (e.type === 'LINE') { somar(e.start.x, e.start.y); somar(e.end.x, e.end.y); }
      else if (e.vertices) for (const v of e.vertices) somar(v.x, v.y);
      else if (e.type === 'CIRCLE' || e.type === 'ARC') { somar(e.x - e.r, e.y - e.r); somar(e.x + e.r, e.y + e.r); }
      else if (e.type === 'INSERT' && prof < 8) {
        const r = extensao(e.block, prof + 1) * Math.max(Math.abs(e.scaleX || 1), Math.abs(e.scaleY || 1)) / 2;
        somar((e.x || 0) - r, (e.y || 0) - r); somar((e.x || 0) + r, (e.y || 0) + r);
      }
    }
    const v = Number.isFinite(x0) ? Math.max(x1 - x0, y1 - y0) : 0;
    extensoes.set(nome, v);
    return v;
  }

  const insercoes = []; // símbolos: { bloco, layer, x, y (m), atributos }
  const textos = []; // { s, x, y, h } em metros
  const linhasPorLayer = new Map(); // layer → metros
  const m = (v) => v * fator;

  const textoDe = (e) => (e.type === 'ATTRIB' ? e.text?.string : e.string);
  function guardarTexto(e, transforms, layer) {
    const bruto = textoDe(e);
    const x = e.type === 'ATTRIB' ? e.text?.x : e.x, y = e.type === 'ATTRIB' ? e.text?.y : e.y;
    if (bruto == null || !Number.isFinite(x)) return;
    const [[tx, ty]] = transformar([[x, y]], transforms);
    const h = (e.nominalTextHeight || e.textHeight || e.text?.textHeight || 0) * escalaDe(transforms);
    const partes = limparTexto(bruto).split('\n').map(s => s.trim()).filter(Boolean);
    partes.forEach((s, i) => textos.push({ s, x: m(tx), y: m(ty) - i * m(h || 0) * 1.6, h: m(h), layer }));
  }

  function medir(e, transforms, layer) {
    if (!reLayerLinha || !reLayerLinha.test(layer || '')) return;
    let pts = null;
    if (e.type === 'LINE') pts = [[e.start.x, e.start.y], [e.end.x, e.end.y]];
    else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices?.length >= 2) {
      pts = e.vertices.map(v => [v.x, v.y]);
      if (e.closed) pts.push(pts[0]);
    } else if (e.type === 'ARC') {
      const ang = (((e.endAngle - e.startAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI;
      linhasPorLayer.set(layer, (linhasPorLayer.get(layer) || 0) + m(e.r * ang * escalaDe(transforms)));
      return;
    }
    if (!pts) return;
    linhasPorLayer.set(layer, (linhasPorLayer.get(layer) || 0) + m(comprimento(transformar(pts, transforms))));
  }

  function visitar(ents, transforms, layerPai, prof, deReferencia) {
    for (const e of ents) {
      const layer = layerPai && (!e.layer || e.layer === '0') ? layerPai : e.layer;
      if (e.type === 'TEXT' || e.type === 'MTEXT' || e.type === 'ATTRIB') { guardarTexto(e, transforms, layer); continue; }
      if (e.type !== 'INSERT') { medir(e, transforms, layer); continue; }
      const b = blocos.get(e.block);
      if (!b || prof > 10) continue;
      for (const a of e.attribs || []) guardarTexto({ ...a, type: 'ATTRIB', text: a.text || { string: a.string, x: a.x, y: a.y, textHeight: a.textHeight } }, transforms, layer);
      const t = { x: e.x || 0, y: e.y || 0, scaleX: e.scaleX, scaleY: e.scaleY, rotation: e.rotation, extrusionZ: e.extrusionZ };
      const tamanhoM = m(extensao(e.block) * escalaDe([t, ...transforms]));
      const anonimo = /^\*/.test(e.block);
      if (!anonimo && tamanhoM <= SIMBOLO_MAX_M && tamanhoM >= SIMBOLO_MIN_M) {
        const [[x, y]] = transformar([[t.x, t.y]], transforms);
        insercoes.push({
          bloco: e.block, layer, x: m(x), y: m(y), tamanho: tamanhoM, deReferencia: !!deReferencia,
          atributos: Object.fromEntries((e.attribs || []).map(a => [String(a.tag || '').toUpperCase(), limparTexto(a.text?.string ?? a.string)]).filter(([k, v]) => k && v)),
        });
        continue;
      }
      // contêiner (ou bloco anônimo/dinâmico): abre, com arranjo retangular como em arquitetura.js
      const nl = Math.max(1, e.rowCount || 1), nc = Math.max(1, e.columnCount || 1);
      const rot = ((e.rotation || 0) * Math.PI) / 180;
      for (let r = 0; r < nl; r++) {
        for (let c = 0; c < nc; c++) {
          const dx = -Math.sin(rot) * (e.rowSpacing || 0) * r + Math.cos(rot) * (e.columnSpacing || 0) * c;
          const dy = Math.cos(rot) * (e.rowSpacing || 0) * r + Math.sin(rot) * (e.columnSpacing || 0) * c;
          visitar(b.entities || [], [{ x: -(b.x || 0), y: -(b.y || 0) }, { ...t, x: t.x + dx, y: t.y + dy }, ...transforms], layer, prof + 1,
            deReferencia || RE_REFERENCIA.test(e.block) || ((b.type || 0) & 4) === 4);
        }
      }
    }
  }
  visitar(parsed.entities || [], [], null, 0, false);

  const legenda = lerLegenda(insercoes, textos);
  const simbolos = agruparSimbolos(insercoes, legenda);
  const linhas = [...linhasPorLayer].map(([layer, metros]) => ({ layer, metros: Math.round(metros * 10) / 10 })).filter(l => l.metros >= 0.5)
    .sort((a, b) => b.metros - a.metros);
  return { texto: remontarTexto(textos), textos, simbolos, linhas, legenda: legenda.titulo };
}

// Legenda da prancha: título "LEGENDA" e, logo abaixo, cada símbolo com a
// descrição à direita. A inserção da legenda sai da contagem.
function lerLegenda(insercoes, textos) {
  const titulos = textos.filter(t => RE_TITULO_LEGENDA.test(t.s) && t.h > 0);
  const descricao = new Map(); // bloco → texto
  const daLegenda = new Set(); // inserções a não contar
  for (const tit of titulos) {
    const h = tit.h;
    const naCaixa = (p) => p.x >= tit.x - 10 * h && p.x <= tit.x + 120 * h && p.y <= tit.y + h && p.y >= tit.y - 150 * h;
    for (const ins of insercoes) {
      if (!naCaixa(ins)) continue;
      const alcance = Math.max(ins.tamanho, h);
      const aDireita = textos
        .filter(t => t !== tit && t.x > ins.x && t.x - ins.x < alcance * 2 + 40 * h && Math.abs(t.y - ins.y) < Math.max(alcance * 0.7, h * 1.5) && t.s.length >= 3)
        .sort((a, b) => a.x - b.x)[0];
      if (!aDireita) continue;
      if (!descricao.has(ins.bloco)) descricao.set(ins.bloco, aDireita.s);
      daLegenda.add(ins);
    }
  }
  return { titulo: titulos[0]?.s || null, descricao, daLegenda };
}

function agruparSimbolos(insercoes, legenda) {
  const grupos = new Map();
  for (const ins of insercoes) {
    if (legenda.daLegenda.has(ins)) continue;
    const nomeLimpo = nomeLimpoDoBloco(ins.bloco);
    const k = nomeLimpo;
    const g = grupos.get(k) || { bloco: ins.bloco, nomeLimpo, layer: ins.layer, layers: [], quantidade: 0, posicoes: [], atributos: {}, descricaoLegenda: null, deReferencia: 0 };
    g.quantidade++;
    if (!g.layers.includes(ins.layer)) g.layers.push(ins.layer);
    if (ins.deReferencia) g.deReferencia++;
    g.posicoes.push([Math.round(ins.x * 100) / 100, Math.round(ins.y * 100) / 100]);
    for (const [a, v] of Object.entries(ins.atributos)) if (!g.atributos[a]) g.atributos[a] = v;
    g.descricaoLegenda = g.descricaoLegenda || legenda.descricao.get(ins.bloco) || null;
    grupos.set(k, g);
  }
  return [...grupos.values()]
    // fora: arquitetura/anotação, ou só aparece dentro de referência externa
    .map(g => ({ ...g, fora: g.layers.every(l => RE_LAYER_FORA.test(l || '')) || RE_BLOCO_FORA.test(g.nomeLimpo) || RE_BLOCO_FORA.test(g.bloco) || g.deReferencia === g.quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

// Linhas de texto: mesma altura (tolerância pela altura da letra) e, na linha,
// pedaços próximos juntos com TAB (como o texto do PDF); pedaço muito longe vira outra linha.
function remontarTexto(textos) {
  const ord = [...textos].sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas = [];
  for (const t of ord) {
    const tol = Math.max(t.h * 0.6, 1e-6);
    const l = linhas.find(x => Math.abs(x.y - t.y) <= tol && x.itens.some(i => Math.abs(i.x - t.x) < Math.max(i.h, t.h, 0.05) * 60));
    if (l) l.itens.push(t); else linhas.push({ y: t.y, itens: [t] });
  }
  return linhas
    .sort((a, b) => b.y - a.y || a.itens[0].x - b.itens[0].x)
    .map(l => l.itens.sort((a, b) => a.x - b.x).map(i => i.s).join('\t'))
    .join('\n');
}

module.exports = { lerProjetoDxf, nomeLimpoDoBloco, limparTexto, RE_LAYER_FORA, RE_BLOCO_FORA, RE_TITULO_LEGENDA };
