// Leitura de DXF de PROJETO (elétrica, iluminação, CFTV, rede…) para a Análise
// de Projeto: o que o PDF só dá como desenho, o DWG/DXF dá como dado.
//   - textos (TEXT, MTEXT, atributos) remontados em linhas, de cima para baixo
//     e da esquerda para a direita — os leitores de texto do PDF (carimbo,
//     lista de materiais, quadro de cargas, códigos de câmera/ponto) rodam em cima;
//   - blocos inseridos (símbolos) contados por nome, com a posição em metros
//     (dá para saber em que ambiente cada um está), a altura de instalação
//     (atributo ALTURA ou legenda) e a descrição e a quantidade pela legenda da
//     prancha quando há uma;
//   - comprimento das linhas por layer (eletroduto, eletrocalha, fiação…) em
//     metros, com arcos de polilinha, splines e elipses medidos pela curva.
// Interpretar o que cada bloco é (tomada, luminária, câmera) e a disciplina fica
// com quem chama (backend/src/services/analiseCad/index.js). Nenhum dado de cliente aqui.
const { Helper } = require('dxf');
const { transformar } = require('./arquitetura');
const { separarXref, alturaDoTexto, disciplinaDoTexto } = require('./disciplinasCad');
const { pontosDaPolilinha, pontosDaCurva, comprimento } = require('./geometriaCad');
const { limparMtext } = require('./textoCad');

// símbolo = bloco pequeno (até 3 m no maior lado, já em metros); maior é
// "contêiner" (desenho inteiro dentro de um bloco, xref inserida): abre e conta dentro
const SIMBOLO_MAX_M = 3;
const SIMBOLO_MIN_M = 0.02;

// arquitetura, anotação e folha: não são material do projeto. A layer de xref
// inserida ("XREF$0$LAYER") é julgada pela parte depois do "$0$" (antes, todo
// "$0$" ficava de fora — e a xref de instalação sumia junto) — 29/10/2026
const RE_LAYER_FORA = /^(0-)?ARQ|ARQUIT|MOBIL|LAYOUT|^COTA|COTAS|\bDIM|DIMENS|^TEXTO|TEXTOS?$|CARIMBO|\bSELO|FOLHA|PRANCHA|MARGEM|DEFPOINTS|HACH|NOTAS?\b|ANOTA|IDENTIFICADOR|\bTAG|ESTRUT|^FORMA|VIEWPORT|\bVPORT|PROJE[ÇC][ÃA]O|PROJ\b|CORTINA|MONTANTE|MODELOS GEN|ISOLAMENTO|ESQUADRIA|GUARDA|_dwg$/i;
// contêiner/xref de OUTRA ÁREA (arquitetura, estrutura, hidráulica, climatização):
// o que vem dele é base, não projeto. Xref de instalação (TOMADAS, CFTV…) não é base.
const RE_REFERENCIA = /\bdwg$|_dwg$|^ARQ|ARQUIT|^EST-|ESTRUT|^FORMA|HIDR[ÁA]UL|HIDROSS|SANIT[ÁA]R|\bAVAC\b|CLIMATIZ|AR.?CONDICION/i;
// contêiner com cara de xref (nome ou flag do bloco): marca a origem dos componentes
const RE_NOME_XREF = /XREF|^X[-_ ]/i;
// título de legenda de símbolos (não "LEGENDA CORTE" nem "legenda de fixação")
const RE_TITULO_LEGENDA = /^(LEGENDA|CONVEN[ÇC][ÕO]ES|SIMBOLOGIA)(\s+(GERAL|DE (S[ÍI]MBOLOS|EL[ÉE]TRICA|ILUMINA[ÇC][ÃA]O|INSTALA[ÇC][ÕO]ES|PONTOS|CFTV|REDE|L[ÓO]GICA|TELEFONIA|INC[ÊE]NDIO|ALARME|SEGURAN[ÇC]A|AUTOMA[ÇC][ÃA]O)))?\s*:?\s*$/i;
const RE_BLOCO_FORA = /PORTA|JANELA|\bDOOR|WINDOW|NORTE|NORTH|CARIMBO|SELO|\bCOTA|N[IÍ]VEL|^NI$|^NV$|CORTE|DETALHE|^SETA|CHAMADA|LOGO|MARGEM|FOLHA|T[IÍ]TULO|ESCALA|MOBILI|CADEIRA|\bMESA|SOF[AÁ]|\bCAMA\b|ARM[AÁ]RIO|BACIA|LAVAT|\bPIA\b|CUBA|CHUVEIRO|\bVASO|CARRO|VE[IÍ]CULO|VEGETA|[ÁA]RVORE|PESSOA|SITUA[ÇC][ÃA]O|LAYOUT|MATRIZ|^FORMA|^EST-|^ARQ-|BANCADA|ESCADA|ELEVADOR|^REV|REVIS[ÃA]O|LEGENDA/i;
// coluna de quantidade da legenda ("QTD: 17", "QTDE", "QUANT.", "QNT") e título que encerra a legenda
const RE_QTD = /^(QTDE?|QUANT(IDADE)?|QNT|QDE)\b\.?\s*[:=.]?\s*/i;
const RE_FIM_LEGENDA = /^(NOTAS?|OBSERVA[ÇC][ÕO]ES|OBS\.?)\s*:?\s*$/i;
const RE_QTD_NO_FIM = /\s[—–-]\s*(\d+)\s*(un|unid|p[çc])\.?\s*$/i;

// códigos do MTEXT pelo limpador único (./textoCad.js — CAD-01); \P vira quebra de linha
const limparTexto = (s) => limparMtext(s, { quebra: '\n' })
  .replace(/[ \t]+/g, ' ')
  .trim();

// "_5L_Difusor linear_TROX_VSD50 - VSD50-2-VS-M-14886346-3P - FORRO" → "Difusor linear TROX VSD50 - VSD50-2-VS-M"
// "XREF$0$E-COND" → "E-COND" (o bloco é o que vem depois do "$0$"; antes é o nome da xref)
function nomeLimpoDoBloco(nome) {
  let s = separarXref(nome).nome.replace(/^_\d+L_/, '').replace(/^OFEletrico_/i, '');
  s = s.replace(/-(V\d+|\d{5,})(-.*)?$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const [a, b] = s.split(/\s+-\s+/);
  if (b && b.replace(/^OFEletrico /i, '').startsWith(a)) s = b.replace(/^OFEletrico /i, '');
  return s.trim() || String(nome);
}

// xref de referência: de outra área pelo nome, ou "XREF…" sem disciplina de instalação no
// nome ("XREF-BASE" é base; "XREF-CFTV" e "-TOMADAS NOBREAK" não são)
const xrefDeReferencia = (x) => !!x && (RE_REFERENCIA.test(x) || (/XREF/i.test(x) && !disciplinaDoTexto(x)));
// layer fora do projeto, julgada sem o prefixo da xref (e a da xref de referência fica fora)
const layerFora = (l) => { const { xref, nome } = separarXref(l || ''); return RE_LAYER_FORA.test(nome) || xrefDeReferencia(xref); };

const escalaDe = (transforms) => transforms.reduce((m, t) => m * Math.max(Math.abs(t.scaleX || 1), Math.abs(t.scaleY || 1)), 1);

// deslocamentos (no sistema de quem insere) das cópias de um MINSERT — arranjo retangular de
// linhas × colunas, afetado pela rotação e não pela escala; INSERT comum: [[0, 0]]
function arranjo(e) {
  const nl = Math.max(1, e.rowCount || 1), nc = Math.max(1, e.columnCount || 1);
  const rot = ((e.rotation || 0) * Math.PI) / 180;
  const out = [];
  for (let r = 0; r < nl; r++) {
    for (let c = 0; c < nc; c++) {
      out.push([
        -Math.sin(rot) * (e.rowSpacing || 0) * r + Math.cos(rot) * (e.columnSpacing || 0) * c,
        Math.cos(rot) * (e.rowSpacing || 0) * r + Math.sin(rot) * (e.columnSpacing || 0) * c,
      ]);
    }
  }
  return out;
}

// "17", "QTD: 2 + 1", "6 (10 RJ45)", "12 un" → número; senão null
function numeroDaQtd(s) {
  const t = String(s || '').replace(RE_QTD, '').replace(/\([^)]*\)/g, ' ').trim();
  const m = /^(\d+(?:\s*\+\s*\d+)*)\s*(un\.?|unid\.?|p[çc]s?\.?|pe[çc]as?)?\s*$/i.exec(t);
  return m ? m[1].split('+').reduce((a, n) => a + Number(n), 0) : null;
}

// Bloco DINÂMICO com um parâmetro alterado (a tomada com a visibilidade "alta", a luminária
// esticada) o AutoCAD grava como bloco anônimo "*U…"; o nome verdadeiro fica no registro do
// bloco (tabela BLOCK_RECORD): xdata "AcDbBlockRepBTag" (1005 = handle do bloco dinâmico, como o
// AutoCAD grava) ou "AcDbDynamicBlockTrueName" (1000 = o nome, como ./dwg-para-dxf.mjs grava).
// A lib `dxf` não lê essa tabela: leitura direta do texto. Devolve Map(nome anônimo → verdadeiro).
function nomesDeBlocosDinamicos(textoDxf) {
  const nomes = new Map();
  const ini = String(textoDxf || '').search(/\n[ \t]*2[ \t]*\r?\nBLOCK_RECORD[ \t]*\r?\n/);
  if (ini < 0) return nomes;
  const fim = textoDxf.indexOf('\nENDTAB', ini);
  const linhas = textoDxf.slice(ini + 1, fim < 0 ? undefined : fim).split(/\r?\n/);
  const registros = [];
  let r = null, app = null;
  for (let i = 0; i + 1 < linhas.length; i += 2) {
    const codigo = linhas[i].trim(), valor = linhas[i + 1].trim();
    if (codigo === '0') { r = valor === 'BLOCK_RECORD' ? {} : null; app = null; if (r) registros.push(r); continue; }
    if (!r) continue;
    if (codigo === '5') r.handle = valor.toUpperCase();
    else if (codigo === '2') r.nome = valor;
    else if (codigo === '1001') app = valor;
    else if (codigo === '1000' && app === 'AcDbDynamicBlockTrueName' && !r.verdadeiro) r.verdadeiro = valor;
    else if (codigo === '1005' && app === 'AcDbBlockRepBTag' && !r.bloco) r.bloco = valor.toUpperCase();
  }
  const porHandle = new Map(registros.filter(x => x.handle).map(x => [x.handle, x]));
  for (const x of registros) {
    if (!x.nome || !x.nome.startsWith('*')) continue;
    const v = x.verdadeiro || porHandle.get(x.bloco)?.nome;
    if (v && !v.startsWith('*')) nomes.set(x.nome, v);
  }
  return nomes;
}

// Lê o DXF. opcoes: { fator (unidade → metro, de lerArquitetura), reLayerLinha (layers medidas) }
function lerProjetoDxf(textoDxf, { fator = 1, reLayerLinha = null } = {}) {
  const { parsed } = new Helper(textoDxf);
  const blocos = new Map((parsed.blocks || []).map(b => [b.name, b]));
  const dinamicos = nomesDeBlocosDinamicos(textoDxf);

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

  // A lib `dxf` entrega os ATTRIB como entidades soltas logo depois do INSERT
  // (e.attribs vem vazio): nenhum atributo (DESCR, ALTURA, ID) chegava ao bloco.
  // Junta cada sequência de ATTRIB ao INSERT anterior.
  const atributosDe = new Map(); // INSERT → [ATTRIB]
  const juntarAtributos = (ents) => {
    let ultimo = null;
    for (const e of ents || []) {
      if (e.type === 'INSERT') { ultimo = e; continue; }
      if (e.type === 'ATTRIB' && ultimo) (atributosDe.get(ultimo) || atributosDe.set(ultimo, []).get(ultimo)).push(e);
      else ultimo = null;
    }
  };
  juntarAtributos(parsed.entities);
  for (const b of blocos.values()) juntarAtributos(b.entities);
  const valorAtributo = (a) => limparTexto(a.text?.string ?? a.string);

  const insercoes = []; // símbolos: { bloco, layer, x, y (m), atributos, xref, altura }
  const textos = []; // { s, x, y, h } em metros
  const linhasPorChave = new Map(); // layer|xref → { layer, xref, metros, segmentos }
  const m = (v) => v * fator;

  const textoDe = (e) => (e.type === 'ATTRIB' ? e.text?.string : e.string);
  function guardarTexto(e, transforms, layer) {
    const bruto = textoDe(e);
    const x = e.type === 'ATTRIB' ? e.text?.x : e.x, y = e.type === 'ATTRIB' ? e.text?.y : e.y;
    if (bruto == null || !Number.isFinite(x)) return;
    const [[tx, ty]] = transformar([[x, y]], transforms);
    const h = (e.nominalTextHeight || e.textHeight || e.text?.textHeight || 0) * escalaDe(transforms);
    const partes = limparTexto(bruto).split('\n').map(s => s.trim()).filter(Boolean);
    partes.forEach((s, i) => textos.push({ s, x: m(tx), y: m(ty) - i * m(h || 0) * 1.6, h: m(h), layer, ...(e.type === 'ATTRIB' ? { atributo: true } : {}) }));
  }

  // traçado (segmentos em metros) de cada layer medida — para a compatibilização
  // entre disciplinas (energia × dados no mesmo caminho); limitado por layer
  const MAX_SEGMENTOS = 20000;
  function linhaDe(layer, xref) {
    const k = `${layer}|${xref || ''}`;
    return linhasPorChave.get(k) || linhasPorChave.set(k, { layer, xref: xref || null, metros: 0, segmentos: [] }).get(k);
  }
  function tracar(reg, pts) {
    for (let i = 1; i < pts.length && reg.segmentos.length < MAX_SEGMENTOS; i++) {
      reg.segmentos.push([m(pts[i - 1][0]), m(pts[i - 1][1]), m(pts[i][0]), m(pts[i][1])].map(v => Math.round(v * 1000) / 1000));
    }
  }
  // trecho desenhado de novo por cima (xref inserida duas vezes, cópia sobreposta)
  // é o mesmo eletroduto: mede uma vez só, por layer
  const vistosPorLayer = new Map();
  const novo = (layer, chave) => {
    const s = vistosPorLayer.get(layer) || vistosPorLayer.set(layer, new Set()).get(layer);
    if (s.has(chave)) return false;
    s.add(chave);
    return true;
  };
  const cm = (v) => Math.round(m(v) * 100);
  const chaveSegmento = (p, q) => { const a = `${cm(p[0])},${cm(p[1])}`, b = `${cm(q[0])},${cm(q[1])}`; return a < b ? `${a}|${b}` : `${b}|${a}`; };
  function medir(e, transforms, layer, xref) {
    if (!reLayerLinha || !reLayerLinha.test(layer || '')) return;
    let pts = null;
    if (e.type === 'LINE') pts = [[e.start.x, e.start.y], [e.end.x, e.end.y]];
    // polilinha com o arco (bulge) seguindo a curva — antes, medida pela corda
    else if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') pts = pontosDaPolilinha(e);
    // SPLINE e ELLIPSE: antes não eram medidas
    else if (e.type === 'SPLINE' || e.type === 'ELLIPSE') pts = pontosDaCurva(e);
    else if (e.type === 'ARC') {
      const ang = (((e.endAngle - e.startAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI;
      // traçado do arco em 4 cordas
      const corda = transformar(Array.from({ length: 5 }, (_, i) => { const a = e.startAngle + (ang * i) / 4; return [e.x + e.r * Math.cos(a), e.y + e.r * Math.sin(a)]; }), transforms);
      if (!novo(layer, `arco|${chaveSegmento(corda[0], corda[4])}|${cm(corda[2][0])},${cm(corda[2][1])}`)) return;
      const reg = linhaDe(layer, xref);
      reg.metros += m(e.r * ang * escalaDe(transforms));
      tracar(reg, corda);
      return;
    }
    if (!pts || pts.length < 2) return;
    const tp = transformar(pts, transforms);
    const reg = linhaDe(layer, xref);
    let trecho = [tp[0]];
    const fechar = () => { if (trecho.length >= 2) { reg.metros += m(comprimento(trecho)); tracar(reg, trecho); } };
    for (let i = 1; i < tp.length; i++) {
      if (novo(layer, chaveSegmento(tp[i - 1], tp[i]))) trecho.push(tp[i]);
      else { fechar(); trecho = [tp[i]]; }
    }
    fechar();
  }

  // xref de um contêiner: "XREF$0$…", flag de xref do bloco ou nome com cara de xref
  const xrefDoConteiner = (nome, b) => {
    const sx = separarXref(nome);
    if (sx.xref) return sx.xref;
    if (((b?.type || 0) & 4) === 4 || RE_NOME_XREF.test(nome)) return nome;
    return null;
  };
  // contêiner de referência: de outra área pelo nome, ou xref ("XREF…", flag de xref)
  // sem disciplina de instalação no nome ("XREF-BASE" é base; "XREF-CFTV" não é)
  const ehReferencia = (nome, b) => {
    const sx = separarXref(nome);
    if (RE_REFERENCIA.test(sx.nome) || xrefDeReferencia(sx.xref)) return true;
    return (/XREF/i.test(nome) || ((b?.type || 0) & 4) === 4) && !disciplinaDoTexto(nome);
  };

  function visitar(ents, transforms, layerPai, prof, deReferencia, xref) {
    for (const e of ents) {
      const layer = layerPai && (!e.layer || e.layer === '0') ? layerPai : e.layer;
      if (e.type === 'TEXT' || e.type === 'MTEXT' || e.type === 'ATTRIB') { guardarTexto(e, transforms, layer); continue; }
      if (e.type !== 'INSERT') { medir(e, transforms, layer, xref); continue; }
      const b = blocos.get(e.block);
      if (!b || prof > 10) continue;
      // atributos que vieram como entidade solta já entram no texto pelo laço acima
      for (const a of e.attribs || []) guardarTexto({ ...a, type: 'ATTRIB', text: a.text || { string: a.string, x: a.x, y: a.y, textHeight: a.textHeight } }, transforms, layer);
      const t = { x: e.x || 0, y: e.y || 0, scaleX: e.scaleX, scaleY: e.scaleY, rotation: e.rotation, extrusionZ: e.extrusionZ };
      const tamanhoM = m(extensao(e.block) * escalaDe([t, ...transforms]));
      // bloco anônimo: só é símbolo quando é um bloco dinâmico de nome conhecido ("*U12" →
      // "TOMADA"); antes todo "*U" era aberto como contêiner e a tomada dinâmica não contava (CAD-07)
      const nomeBloco = /^\*/.test(e.block) ? dinamicos.get(e.block) || null : e.block;
      if (nomeBloco && tamanhoM <= SIMBOLO_MAX_M && tamanhoM >= SIMBOLO_MIN_M) {
        const attribs = [...(e.attribs || []), ...(atributosDe.get(e) || [])];
        const atributos = Object.fromEntries(attribs.map(a => [String(a.tag || '').toUpperCase(), valorAtributo(a)]).filter(([k, v]) => k && v));
        const alt = Object.entries(atributos).find(([k]) => /^(ALTURA|ALT|H|MONTAGEM|INSTALA)/.test(k));
        const xrefProprio = separarXref(e.block).xref;
        const altura = alt ? alturaDoTexto(alt[1]) || alturaDoTexto(`h=${alt[1]}`) : null;
        // MINSERT (símbolo em arranjo linhas × colunas): cada cópia é um símbolo — antes contava 1
        for (const [dx, dy] of arranjo(e)) {
          const [[x, y]] = transformar([[t.x + dx, t.y + dy]], transforms);
          insercoes.push({
            bloco: nomeBloco, layer, x: m(x), y: m(y), tamanho: tamanhoM,
            deReferencia: !!deReferencia || xrefDeReferencia(xrefProprio),
            xref: xrefProprio || xref || null,
            altura, atributos,
          });
        }
        continue;
      }
      // contêiner (ou bloco anônimo sem nome conhecido): abre, com arranjo retangular como em arquitetura.js
      const xrefAqui = xrefDoConteiner(e.block, b) || xref;
      const referencia = deReferencia || ehReferencia(e.block, b);
      for (const [dx, dy] of arranjo(e)) {
        visitar(b.entities || [], [{ x: -(b.x || 0), y: -(b.y || 0) }, { ...t, x: t.x + dx, y: t.y + dy }, ...transforms], layer, prof + 1, referencia, xrefAqui);
      }
    }
  }
  visitar(parsed.entities || [], [], null, 0, false, null);

  const legenda = lerLegenda(insercoes, textos);
  const simbolos = agruparSimbolos(insercoes, legenda);
  const linhas = [...linhasPorChave.values()].map(l => ({ layer: l.layer, xref: l.xref, metros: Math.round(l.metros * 10) / 10, segmentos: l.segmentos }))
    .filter(l => l.metros >= 0.5)
    .sort((a, b) => b.metros - a.metros);
  return { texto: remontarTexto(textos), textos, simbolos, linhas, legenda: legenda.titulo, legendaItens: legenda.itens };
}

// Legenda da prancha: título "LEGENDA" e, abaixo dele, linhas "símbolo ·
// descrição · QTD". A caixa NÃO é mais um retângulo fixo abaixo do título (120 ×
// 150 alturas de letra = 30 × 37,5 m com letra de 0,25 m): ela engolia câmeras
// da planta ao lado e dava a elas a descrição do acionador da mesma altura
// (DXF real, 29/10/2026). Agora:
//   - a coluna das descrições é a dos textos alinhados à esquerda que têm um
//     símbolo logo à esquerda, contínua a partir do título (para em NOTAS ou num vão grande);
//   - o símbolo da legenda é a inserção logo à ESQUERDA da descrição, na
//     mesma linha, a poucos tamanhos de símbolo: uma por bloco por linha;
//   - a coluna "QTD" (ou "— N un" no fim da descrição) é lida e devolvida.
function lerLegenda(insercoes, textos) {
  const titulos = textos.filter(t => RE_TITULO_LEGENDA.test(t.s) && t.h > 0);
  const descricao = new Map(); // bloco → texto
  const quantidade = new Map(); // bloco → QTD da legenda
  const daLegenda = new Set(); // inserções a não contar
  const itens = []; // { bloco, descricao, quantidade }
  for (const tit of titulos) {
    const h = tit.h;
    const naFaixa = (p) => p.y < tit.y + h && p.y > tit.y - 600 * h && p.x >= tit.x - 30 * h && p.x <= tit.x + 400 * h;
    const abaixo = textos.filter(t => t !== tit && !t.atributo && t.y < tit.y - 0.1 * h && naFaixa(t));
    const candidatas = insercoes.filter(ins => !daLegenda.has(ins) && naFaixa(ins));
    if (!abaixo.length || !candidatas.length) continue;
    const alcanceY = (ins, t) => Math.max(ins.tamanho * 0.7, (t.h || h) * 1.5);
    const alcanceX = (ins, t) => ins.tamanho * 2.5 + (t.h || h) * 10;
    const aDireita = (ins, t) => t.x > ins.x && t.x - ins.x <= alcanceX(ins, t) && Math.abs(t.y - ins.y) <= alcanceY(ins, t);
    // linha de cada inserção: o texto da mesma altura mais próximo à direita
    const pares = candidatas
      .map(ins => ({ ins, t: abaixo.filter(t => t.s.length >= 2 && aDireita(ins, t)).sort((a, b) => Math.abs(a.y - ins.y) - Math.abs(b.y - ins.y) || a.x - b.x)[0] }))
      .filter(p => p.t && !RE_QTD.test(p.t.s) && numeroDaQtd(p.t.s) == null);
    if (!pares.length) continue;
    // coluna das descrições: o x mais comum entre esses textos
    const tolX = (t) => Math.max(t.h || h, h) * 1.5;
    let coluna = null;
    for (const p of pares) {
      const n = pares.filter(q => Math.abs(q.t.x - p.t.x) <= tolX(p.t)).length;
      if (!coluna || n > coluna.n || (n === coluna.n && p.t.y > coluna.y)) coluna = { x: p.t.x, n, y: p.t.y };
    }
    const tamanhos = pares.map(p => p.ins.tamanho).sort((x, y) => x - y);
    const tamanhoTipico = tamanhos[Math.floor(tamanhos.length / 2)] || 0;
    // a coluna, de cima para baixo, contínua a partir do título
    const naColuna = abaixo.filter(t => Math.abs(t.x - coluna.x) <= tolX(t)).sort((a, b) => b.y - a.y);
    const linhas = [];
    const passos = [];
    let yAnterior = tit.y;
    for (const t of naColuna) {
      if (RE_FIM_LEGENDA.test(t.s) || RE_TITULO_LEGENDA.test(t.s)) break;
      const vao = yAnterior - t.y;
      const passo = passos.length ? [...passos].sort((a, b) => a - b)[Math.floor(passos.length / 2)] : 0;
      if (vao > (linhas.length ? Math.max(10 * (t.h || h), 8 * h, 2.5 * passo, 3 * tamanhoTipico) : 12 * h + tamanhoTipico)) break;
      if (linhas.length) passos.push(vao);
      linhas.push(t);
      yAnterior = t.y;
    }
    if (!linhas.length) continue;
    // QTD: texto "QTD: n" na mesma linha, ou coluna com cabeçalho "QTD"
    const yMin = linhas.at(-1).y - 2 * h;
    const cabecalhoQtd = abaixo.find(t => /^(QTDE?|QUANT(IDADE)?\.?|QNT|QDE)\.?$/i.test(t.s) && t.y >= yMin && t.x > coluna.x);
    const qtdDaLinha = (t) => {
      const mesma = abaixo.filter(o => o !== t && o.x > t.x && Math.abs(o.y - t.y) <= Math.max(t.h, o.h || 0) * 0.8);
      const rot = mesma.find(o => RE_QTD.test(o.s) && numeroDaQtd(o.s) != null);
      if (rot) return numeroDaQtd(rot.s);
      if (cabecalhoQtd) {
        const col = mesma.find(o => Math.abs(o.x - cabecalhoQtd.x) <= Math.max(o.h, cabecalhoQtd.h) * 4 && numeroDaQtd(o.s) != null);
        if (col) return numeroDaQtd(col.s);
      }
      // "Tomada baixa 2P+T — 12 un" (legenda gerada pela H&M, skills/_comum/cad/simbolos.js)
      const fim = RE_QTD_NO_FIM.exec(t.s);
      return fim ? Number(fim[1]) : null;
    };
    const esquerda = Math.min(tit.x, coluna.x);
    for (const t of linhas) {
      // o símbolo da linha: à esquerda da descrição, dentro da legenda, e esta é
      // a linha mais próxima dele; um por bloco (o mais perto da descrição)
      const porBloco = new Map();
      for (const ins of candidatas) {
        if (daLegenda.has(ins) || ins.x >= t.x || !aDireita(ins, t) || ins.x < esquerda - Math.max(ins.tamanho, 4 * h)) continue;
        const maisPerto = linhas.reduce((a, b) => (Math.abs(b.y - ins.y) < Math.abs(a.y - ins.y) ? b : a));
        if (maisPerto !== t) continue;
        const atual = porBloco.get(ins.bloco);
        if (!atual || ins.x > atual.x) porBloco.set(ins.bloco, ins);
      }
      if (!porBloco.size) continue;
      const qtd = qtdDaLinha(t);
      const texto = t.s.replace(RE_QTD_NO_FIM, '').trim();
      for (const ins of porBloco.values()) {
        daLegenda.add(ins);
        if (descricao.has(ins.bloco)) continue;
        descricao.set(ins.bloco, texto);
        if (qtd != null) quantidade.set(ins.bloco, qtd);
        itens.push({ bloco: ins.bloco, nomeLimpo: nomeLimpoDoBloco(ins.bloco), descricao: texto, quantidade: qtd });
      }
    }
  }
  return { titulo: titulos[0]?.s || null, descricao, quantidade, daLegenda, itens };
}

function agruparSimbolos(insercoes, legenda) {
  const grupos = new Map();
  for (const ins of insercoes) {
    if (legenda.daLegenda.has(ins)) continue;
    const nomeLimpo = nomeLimpoDoBloco(ins.bloco);
    const k = nomeLimpo;
    const g = grupos.get(k) || {
      bloco: separarXref(ins.bloco).nome, nomeLimpo, layer: ins.layer, layers: [], quantidade: 0, posicoes: [],
      // por posição (mesma ordem de `posicoes`): altura de instalação e xref de origem
      alturas: [], montagens: [], xrefs: [],
      atributos: {}, descricaoLegenda: null, quantidadeLegenda: null, deReferencia: 0, duplicadas: 0, _vistas: new Set(),
    };
    // o mesmo bloco inserido de novo no MESMO ponto (cópia sobreposta, xref
    // inserida duas vezes) é um componente só: DWG real com 510 câmeras em 184 posições
    const chave = `${Math.round(ins.x / 0.02)},${Math.round(ins.y / 0.02)}`;
    if (g._vistas.has(chave)) { g.duplicadas++; grupos.set(k, g); continue; }
    g._vistas.add(chave);
    g.quantidade++;
    if (!g.layers.includes(ins.layer)) g.layers.push(ins.layer);
    if (ins.deReferencia) g.deReferencia++;
    g.posicoes.push([Math.round(ins.x * 100) / 100, Math.round(ins.y * 100) / 100]);
    g.alturas.push(ins.altura?.altura_m ?? null);
    g.montagens.push(ins.altura?.montagem ?? null);
    g.xrefs.push(ins.xref || null);
    for (const [a, v] of Object.entries(ins.atributos)) if (!g.atributos[a]) g.atributos[a] = v;
    g.descricaoLegenda = g.descricaoLegenda || legenda.descricao.get(ins.bloco) || null;
    if (g.quantidadeLegenda == null && legenda.quantidade.has(ins.bloco)) g.quantidadeLegenda = legenda.quantidade.get(ins.bloco);
    grupos.set(k, g);
  }
  return [...grupos.values()]
    // fora: arquitetura/anotação, ou só aparece dentro de referência externa
    .map(({ _vistas, ...g }) => ({ ...g, fora: g.layers.every(layerFora) || RE_BLOCO_FORA.test(g.nomeLimpo) || RE_BLOCO_FORA.test(g.bloco) || g.deReferencia === g.quantidade }))
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

module.exports = { lerProjetoDxf, nomeLimpoDoBloco, nomesDeBlocosDinamicos, limparTexto, numeroDaQtd, layerFora, RE_LAYER_FORA, RE_BLOCO_FORA, RE_TITULO_LEGENDA, RE_REFERENCIA };
