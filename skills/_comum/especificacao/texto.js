// Texto da ESPECIFICAÇÃO do cliente/arquiteto → BLOCOS lógicos (título, parágrafo, item de lista,
// linha de tabela), cada um com a página e a seção de onde veio. É a base do leitor de
// requisitos (./leitor.js): cada requisito lido guarda o bloco e a frase de origem (rastreável).
//
// Determinístico e sem IA. Formatos: PDF com camada de texto (pdfjs-dist, resolvido do
// backend como o puppeteer em ../fabricacao/pdf.js), DOCX (jszip + xml-js), XLSX (exceljs) e
// TXT/MD. PDF escaneado (sem texto) volta sem blocos e com aviso — o OCR fica com o backend.
//
// Por que pela posição (PDF): o pdftotext e o pdf-parse juntam as colunas de uma tabela de
// duas colunas fora de ordem (o rótulo "Chillers (2 un.)" sai uma linha acima do valor). Com
// as coordenadas de cada trecho dá para remontar a linha da tabela (célula da esquerda + da
// direita, continuação na linha de baixo), o item de lista com a sua continuação e o título.

const path = require('path');

const RAIZ = path.join(__dirname, '..', '..', '..');

// ── PDF ──────────────────────────────────────────────────────────────────────

let pdfjsCache = null;
async function carregarPdfjs() {
  if (pdfjsCache) return pdfjsCache;
  const { pathToFileURL } = require('url');
  const tentativas = [path.join(RAIZ, 'backend'), path.join(RAIZ, 'skills'), __dirname];
  for (const base of tentativas) {
    try {
      const arq = require.resolve('pdfjs-dist/legacy/build/pdf.mjs', { paths: [base] });
      pdfjsCache = await import(pathToFileURL(arq).href);
      return pdfjsCache;
    } catch { /* tenta a próxima */ }
  }
  throw new Error('pdfjs-dist não encontrado: instale as dependências do backend (cd backend && npm install) para ler PDF.');
}

// Linhas de uma página: os trechos agrupados pela altura (y), da esquerda para a direita
function linhasDosItens(itens, pagina) {
  const ordenados = itens
    .filter(it => it.s.trim())
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas = [];
  for (const it of ordenados) {
    const tol = Math.max(2, it.h * 0.35);
    const l = linhas.find(k => Math.abs(k.y - it.y) <= tol);
    if (l) { l.segs.push(it); l.h = Math.max(l.h, it.h); } else linhas.push({ pagina, y: it.y, h: it.h, segs: [it] });
  }
  for (const l of linhas) l.segs.sort((a, b) => a.x - b.x);
  return linhas.sort((a, b) => b.y - a.y);
}

// Junta os trechos de uma linha: espaço pequeno = mesma frase; espaço grande = outra coluna
function celulasDaLinha(l) {
  const celulas = [];
  let atual = null;
  for (const s of l.segs) {
    if (!atual) { atual = { x: s.x, fim: s.x + s.w, texto: s.s }; continue; }
    const gap = s.x - atual.fim;
    if (gap > Math.max(18, 2.6 * l.h)) {
      celulas.push(atual);
      atual = { x: s.x, fim: s.x + s.w, texto: s.s };
    } else {
      const precisaEspaco = gap > 0.12 * l.h && !/\s$/.test(atual.texto) && !/^\s/.test(s.s);
      atual.texto += (precisaEspaco ? ' ' : '') + s.s;
      atual.fim = Math.max(atual.fim, s.x + s.w);
    }
  }
  if (atual) celulas.push(atual);
  return celulas.map(c => ({ ...c, texto: c.texto.replace(/\s+/g, ' ').trim() })).filter(c => c.texto);
}

async function linhasDoPdf(buffer) {
  const pdfjs = await carregarPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), verbosity: 0, isEvalSupported: false }).promise;
  const linhas = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const pg = await doc.getPage(p);
      const tc = await pg.getTextContent();
      const itens = tc.items.filter(it => typeof it.str === 'string').map(it => ({
        s: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: Math.abs(it.height || it.transform[3] || 10),
      }));
      for (const l of linhasDosItens(itens, p)) linhas.push({ ...l, celulas: celulasDaLinha(l) });
      pg.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return linhas;
}

// ── Montagem dos blocos a partir de linhas posicionadas ─────────────────────

const BULLET = /^[•\-–▪◦●■□*]$/;
const BULLET_INICIO = /^[•▪◦●■□]\s*/;
const TITULO_NUM = /^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+(\S.*)$/;
const PAGINACAO = /^(p[áa]gina|pag\.?|folha)\s*\d+\s*(de|\/)\s*\d+$/i;

const maiusculas = (s) => s.length >= 4 && s === s.toLocaleUpperCase('pt-BR') && /[A-ZÀ-Ý]{3}/.test(s);

// texto que se repete no topo/rodapé de várias páginas (cabeçalho do documento) — sai dos blocos
function repetidosEntrePaginas(linhas) {
  const paginas = new Set(linhas.map(l => l.pagina));
  if (paginas.size < 2) return new Set();
  const cont = new Map();
  for (const l of linhas) {
    const t = l.celulas.map(c => c.texto).join(' ').replace(/\d+/g, '#');
    if (!cont.has(t)) cont.set(t, new Set());
    cont.get(t).add(l.pagina);
  }
  return new Set([...cont.entries()].filter(([, ps]) => ps.size >= Math.min(2, paginas.size)).map(([t]) => t));
}

function blocosDasLinhas(linhas) {
  const repetidos = repetidosEntrePaginas(linhas);
  const corpoH = mediana(linhas.map(l => l.h)) || 10;
  const blocos = [];
  let secao = '';
  let secoes = [];
  let atual = null; // bloco em montagem (paragrafo | item | linha_tabela)
  let ultimaLinha = null;
  const fechar = () => { if (atual) { atual.texto = limpar(atual.texto); if (atual.celulas) atual.celulas = atual.celulas.map(limpar); blocos.push(atual); } atual = null; };
  const novo = (tipo, texto, l, extra = {}) => ({ id: `b${blocos.length + 1}`, tipo, texto, pagina: l.pagina, secao, secoes: [...secoes], ...extra });

  for (const l of linhas) {
    const textoLinha = l.celulas.map(c => c.texto).join(' ');
    if (!textoLinha || PAGINACAO.test(textoLinha) || repetidos.has(textoLinha.replace(/\d+/g, '#'))) continue;
    const gapV = ultimaLinha && ultimaLinha.pagina === l.pagina ? (ultimaLinha.y - l.y) : Infinity;
    const colado = gapV <= 1.75 * Math.max(l.h, ultimaLinha ? ultimaLinha.h : l.h);
    const x0 = l.celulas[0].x;

    // item de lista: "•" num trecho separado ou no começo do texto
    let celulas = l.celulas;
    let bullet = false;
    if (celulas.length >= 2 && BULLET.test(celulas[0].texto) && celulas[1].x - celulas[0].fim < 40) {
      bullet = true;
      celulas = [{ ...celulas[1], texto: celulas.slice(1).map(c => c.texto).join(' ') }];
    } else if (BULLET_INICIO.test(celulas[0].texto)) {
      bullet = true;
      celulas = [{ ...celulas[0], texto: celulas.map(c => c.texto).join(' ').replace(BULLET_INICIO, '') }];
    } else if (BULLET.test(celulas[0].texto) && celulas.length === 1) {
      continue; // marcador sozinho na linha
    }

    // título: numerado e curto, ou em maiúsculas/maior que o corpo
    const tm = TITULO_NUM.exec(textoLinha);
    const curto = textoLinha.length <= 90;
    const ehTitulo = !bullet && celulas.length === 1 && curto && (
      (tm && /^[A-ZÀ-Ý]/.test(tm[2]) && !/[.;,]$/.test(textoLinha) && (l.h > corpoH * 1.04 || maiusculas(tm[2]) || tm[2].split(/\s+/).length <= 7))
      || (l.h >= corpoH * 1.25 && !/[.;,]$/.test(textoLinha))
      || (maiusculas(textoLinha) && textoLinha.split(/\s+/).length <= 10 && !/\d{3}/.test(textoLinha)));
    if (ehTitulo) {
      fechar();
      const nivel = tm ? tm[1].split('.').length : 1;
      secoes = secoes.slice(0, nivel - 1);
      secoes[nivel - 1] = textoLinha;
      secao = textoLinha;
      blocos.push(novo('titulo', textoLinha, l, { nivel }));
      ultimaLinha = l;
      continue;
    }

    if (bullet) {
      fechar();
      atual = novo('item', celulas[0].texto, l, { x: celulas[0].x });
      ultimaLinha = l;
      continue;
    }

    // linha de tabela (duas ou mais colunas)
    if (l.celulas.length >= 2) {
      // continuação da célula de uma linha de tabela anterior (célula da 1ª coluna vazia)
      if (atual && atual.tipo === 'linha_tabela' && colado && x0 > atual.colX[0] + 20) {
        for (const c of l.celulas) {
          const k = indiceColuna(atual.colX, c.x);
          atual.celulas[k] = `${atual.celulas[k]} ${c.texto}`;
        }
        atual.texto = atual.celulas.join(' | ');
        ultimaLinha = l;
        continue;
      }
      fechar();
      atual = novo('linha_tabela', '', l, { celulas: l.celulas.map(c => c.texto), colX: l.celulas.map(c => c.x) });
      atual.texto = atual.celulas.join(' | ');
      ultimaLinha = l;
      continue;
    }

    // uma coluna só: continuação do bloco aberto ou parágrafo novo
    if (atual && colado) {
      if (atual.tipo === 'linha_tabela' && x0 > atual.colX[0] + 20) {
        const k = indiceColuna(atual.colX, x0);
        atual.celulas[k] = `${atual.celulas[k]} ${textoLinha}`;
        atual.texto = atual.celulas.join(' | ');
        ultimaLinha = l;
        continue;
      }
      if (atual.tipo === 'item' && x0 >= atual.x - 6) { atual.texto = juntar(atual.texto, textoLinha); ultimaLinha = l; continue; }
      if (atual.tipo === 'paragrafo' && Math.abs(x0 - atual.x) <= 8) { atual.texto = juntar(atual.texto, textoLinha); ultimaLinha = l; continue; }
    }
    fechar();
    atual = novo('paragrafo', textoLinha, l, { x: x0 });
    ultimaLinha = l;
  }
  fechar();
  return blocos.map(({ x, colX, ...b }) => b);
}

function indiceColuna(colX, x) {
  let k = 0;
  colX.forEach((cx, i) => { if (x >= cx - 12) k = i; });
  return k;
}

function juntar(a, b) {
  if (/[A-Za-zÀ-ÿ]-$/.test(a) && /^[a-zà-ÿ]/.test(b)) return a.slice(0, -1) + b; // hifenização
  return `${a} ${b}`;
}

const limpar = (s) => String(s || '').replace(/\s+/g, ' ').replace(/\s+([,.;:)])/g, '$1').replace(/\(\s+/g, '(').trim();

function mediana(v) {
  const a = v.filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return 0;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// ── TXT / MD ─────────────────────────────────────────────────────────────────

function blocosDoTexto(texto) {
  const blocos = [];
  let secao = '';
  let secoes = [];
  let atual = null;
  const fechar = () => { if (atual) { atual.texto = limpar(atual.texto); blocos.push(atual); } atual = null; };
  const novo = (tipo, t, extra = {}) => ({ id: `b${blocos.length + 1}`, tipo, texto: t, pagina: 1, secao, secoes: [...secoes], ...extra });
  for (const bruta of String(texto || '').replace(/\r/g, '').split('\n')) {
    const linha = bruta.replace(/\t/g, '    ').replace(/\s+$/, '');
    const t = linha.trim();
    if (!t) { fechar(); continue; }
    if (PAGINACAO.test(t)) continue;
    const md = /^(#{1,4})\s+(.*)$/.exec(t);
    const tm = TITULO_NUM.exec(t);
    // (14/11/2026) a 1ª linha do documento em maiúsculas começando pela TAG ("QF-SEQ — QUADRO DE FORÇA E COMANDO
    // DA CAG COM SEQUÊNCIA DE CHILLERS") é o título, mesmo com mais de 10 palavras — senão a tag e o título do
    // quadro saíam do "1. OBJETIVO"
    const tituloComTag = !blocos.length && !atual && maiusculas(t) && /^[A-Z]{1,4}[-–][A-Z0-9]{1,8}\s*[—–-]\s/.test(t) && t.split(/\s+/).length <= 20;
    if (md || tituloComTag || (tm && /^[A-ZÀ-Ý]/.test(tm[2]) && t.length <= 90 && !/[.;,]$/.test(t) && tm[2].split(/\s+/).length <= 8) || (maiusculas(t) && t.split(/\s+/).length <= 10 && !/\d{3}/.test(t))) {
      fechar();
      const nivel = md ? md[1].length : tm ? tm[1].split('.').length : 1;
      const titulo = md ? md[2] : t;
      secoes = secoes.slice(0, nivel - 1);
      secoes[nivel - 1] = titulo;
      secao = titulo;
      blocos.push(novo('titulo', titulo, { nivel }));
      continue;
    }
    const bm = /^\s*(?:[•\-–▪◦●*]|\d+[.)]|[a-z][.)])\s+(.*)$/.exec(linha);
    if (bm) { fechar(); atual = novo('item', bm[1]); continue; }
    const cel = t.includes('|') ? t.split('|') : t.split(/\s{3,}/);
    const celulas = cel.map(c => c.trim()).filter(Boolean);
    if (celulas.length >= 2 && !(atual && atual.tipo === 'paragrafo' && !t.includes('|'))) {
      fechar();
      blocos.push(novo('linha_tabela', celulas.join(' | '), { celulas }));
      continue;
    }
    if (atual && (atual.tipo === 'paragrafo' || atual.tipo === 'item') && /^\s/.test(bruta) === (atual.tipo === 'item')) { atual.texto = juntar(atual.texto, t); continue; }
    if (atual && atual.tipo === 'paragrafo') { atual.texto = juntar(atual.texto, t); continue; }
    fechar();
    atual = novo('paragrafo', t);
  }
  fechar();
  return blocos;
}

// ── DOCX ─────────────────────────────────────────────────────────────────────

async function blocosDoDocx(buffer) {
  const JSZip = require('jszip');
  const { xml2js } = require('xml-js');
  const zip = await JSZip.loadAsync(buffer);
  const arq = zip.file('word/document.xml');
  if (!arq) throw new Error('DOCX sem word/document.xml');
  const doc = xml2js(await arq.async('string'), { compact: false });
  const filhos = (n) => (n && n.elements) || [];
  const achar = (n, nome) => filhos(n).find(e => e.name === nome);
  const textoDe = (n) => {
    if (!n) return '';
    if (n.type === 'text') return n.text;
    if (n.name === 'w:tab') return ' ';
    if (n.name === 'w:br') return ' ';
    return filhos(n).map(textoDe).join('');
  };
  const body = achar(achar(doc, 'w:document'), 'w:body');
  const linhas = [];
  for (const el of filhos(body)) {
    if (el.name === 'w:p') {
      const pPr = achar(el, 'w:pPr');
      const estilo = (achar(pPr, 'w:pStyle')?.attributes?.['w:val'] || '').toLowerCase();
      const lista = !!achar(pPr, 'w:numPr') || /list|lista/.test(estilo);
      const nivelTitulo = /^(heading|t[ií]tulo|ttulo)\s*(\d)/.exec(estilo.replace(/ /g, ''));
      linhas.push({ tipo: nivelTitulo ? 'titulo' : lista ? 'item' : 'paragrafo', texto: textoDe(el), nivel: nivelTitulo ? Number(nivelTitulo[2]) : null });
    } else if (el.name === 'w:tbl') {
      for (const tr of filhos(el).filter(e => e.name === 'w:tr')) {
        const celulas = filhos(tr).filter(e => e.name === 'w:tc').map(tc => limpar(filhos(tc).filter(e => e.name === 'w:p').map(textoDe).join(' ')));
        if (celulas.some(Boolean)) linhas.push({ tipo: 'linha_tabela', celulas });
      }
    }
  }
  // títulos por estilo; parágrafos curtos numerados também viram título (documento sem estilos)
  const blocos = [];
  let secao = '';
  let secoes = [];
  for (const l of linhas) {
    const t = limpar(l.texto || (l.celulas || []).join(' | '));
    if (!t) continue;
    const tm = TITULO_NUM.exec(t);
    const titulo = l.tipo === 'titulo' || (l.tipo === 'paragrafo' && tm && /^[A-ZÀ-Ý]/.test(tm[2]) && t.length <= 90 && !/[.;,]$/.test(t) && tm[2].split(/\s+/).length <= 8);
    if (titulo) {
      const nivel = l.nivel || (tm ? tm[1].split('.').length : 1);
      secoes = secoes.slice(0, nivel - 1);
      secoes[nivel - 1] = t;
      secao = t;
      blocos.push({ id: `b${blocos.length + 1}`, tipo: 'titulo', texto: t, pagina: 1, secao, secoes: [...secoes], nivel });
      continue;
    }
    blocos.push({ id: `b${blocos.length + 1}`, tipo: l.tipo, texto: t, pagina: 1, secao, secoes: [...secoes], ...(l.celulas ? { celulas: l.celulas } : {}) });
  }
  return blocos;
}

// ── XLSX ─────────────────────────────────────────────────────────────────────

async function blocosDoXlsx(buffer) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const blocos = [];
  wb.eachSheet((ws) => {
    const secao = ws.name;
    blocos.push({ id: `b${blocos.length + 1}`, tipo: 'titulo', texto: ws.name, pagina: 1, secao, secoes: [secao], nivel: 1 });
    ws.eachRow({ includeEmpty: false }, (row) => {
      const celulas = [];
      row.eachCell({ includeEmpty: false }, (c) => {
        let v = c.value;
        if (v && typeof v === 'object') v = v.result ?? (v.richText ? v.richText.map(r => r.text).join('') : v.text ?? '');
        const t = limpar(v);
        if (t) celulas.push(t);
      });
      if (!celulas.length) return;
      const texto = celulas.join(' | ');
      blocos.push({ id: `b${blocos.length + 1}`, tipo: celulas.length >= 2 ? 'linha_tabela' : 'paragrafo', texto, pagina: 1, secao, secoes: [secao], ...(celulas.length >= 2 ? { celulas } : {}) });
    });
  });
  return blocos;
}

// ── Entrada única ────────────────────────────────────────────────────────────

const FORMATOS = { pdf: 'pdf', docx: 'docx', xlsx: 'xlsx', xlsm: 'xlsx', txt: 'txt', md: 'txt', csv: 'txt' };
const EXTENSOES = /\.(pdf|docx|xlsx|xlsm|txt|md|csv)$/i;

// → { formato, blocos, avisos }
async function blocosDoArquivo(buffer, nome = 'arquivo.pdf') {
  const ext = (String(nome).match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
  const formato = FORMATOS[ext];
  if (!formato) throw new Error(`Formato não suportado (${ext || 'sem extensão'}): envie PDF, DOCX, XLSX ou TXT.`);
  const avisos = [];
  let blocos;
  if (formato === 'pdf') {
    blocos = blocosDasLinhas(await linhasDoPdf(buffer));
    if (!blocos.length) avisos.push('O PDF não tem texto (escaneado?): use o OCR da Análise de Projeto ou envie o DOCX/TXT da especificação. [CONFERIR]');
  } else if (formato === 'docx') blocos = await blocosDoDocx(buffer);
  else if (formato === 'xlsx') blocos = await blocosDoXlsx(buffer);
  else blocos = blocosDoTexto(Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer));
  return { formato, blocos, avisos };
}

module.exports = { blocosDoArquivo, blocosDoTexto, blocosDasLinhas, linhasDoPdf, celulasDaLinha, EXTENSOES };
