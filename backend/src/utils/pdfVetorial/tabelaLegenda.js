// Parte da leitura vetorial de PDF (utils/pdfVetorial.js, que explica o método inteiro):
// passo 3b, legenda em TABELA.
const { dentroDe, meioDoTexto, faixaDe } = require('./legenda');

// ── 3b) Legenda em TABELA ──────────────────────────────────────────────────
// "Símbolo | Fornecedor | Descrição | QTDE" (luminotécnico), "SÍMBOLO | TIPO |
// MODELO | QNT | USO" (tomadas), "CIRCUITO | SÍMBOLO | ESPECIFICAÇÃO | … | QNT".
// O texto logo à direita do símbolo é o da coluna vizinha (a marca), não a
// descrição: um luminotécnico real com 21 tipos virou 5 itens com o nome do
// fornecedor (29/10/2026). Aqui o cabeçalho diz qual coluna é qual, as linhas da
// tabela (ou, sem elas, a coluna de quantidade) separam as linhas e cada linha
// dá UMA entrada: símbolo + descrição + a quantidade que o projetista escreveu.
const RE_COL_SIMBOLO = /^S[ÍI]MB(OLOS?|\.)$/i;
const RE_COL_DESCRICAO = /^(DESCRI[ÇC][ÃA]O|ESPECIFICA[ÇC][ÃA]O|DISCRIMINA[ÇC][ÃA]O)\b/i;
const RE_COL_TIPO = /^(TIPO|MODELO|ITEM|EQUIPAMENTO|LUMIN[ÁA]RIA|PRODUTO)\b/i;
const RE_COL_QTD = /^(QTDE?|QTD|QUANT(IDADE)?|QNT|QUANTID)\.?:?$/i;
const RE_COL_FORNECEDOR = /^(FORNECEDOR|FABRICANTE|MARCA)\b/i;
const RE_NUMERO = /^\d{1,5}(?:,\d+)?$/;

// linhas (réguas) retas da página: verticais e horizontais, para as colunas e linhas da tabela
function reguasDaPagina(caminhos) {
  const v = [], h = [];
  for (const c of caminhos) {
    if (!c.reto && !(c.cheio && c.segs <= 5)) continue;
    const [x0, y0, x1, y1] = c.caixa;
    if (x1 - x0 < 1.2 && y1 - y0 > 8) v.push(c.caixa);
    else if (y1 - y0 < 1.2 && x1 - x0 > 30) h.push(c.caixa);
  }
  return { v, h };
}

function tabelasDeLegenda(textos, caminhos, blobs) {
  const tabelas = [];
  const horiz = textos.filter(t => t.horizontal);
  let reguas = null;
  for (const s of horiz) {
    if (!RE_COL_SIMBOLO.test(s.s.trim())) continue;
    if (tabelas.some(t => dentroDe(t.caixa, [s.x, s.y - s.h, s.x + s.w, s.y]))) continue;
    // células do cabeçalho: textos da mesma linha, contíguos ao "Símbolo" (vão < 350 pt)
    const linha = horiz.filter(t => Math.abs(meioDoTexto(t) - meioDoTexto(s)) < Math.max(s.h, t.h) * 0.6).sort((a, b) => a.x - b.x);
    let ini = linha.indexOf(s), fim = ini;
    while (ini > 0 && linha[ini].x - (linha[ini - 1].x + linha[ini - 1].w) < 350) ini--;
    while (fim < linha.length - 1 && linha[fim + 1].x - (linha[fim].x + linha[fim].w) < 350) fim++;
    const cel = linha.slice(ini, fim + 1);
    if (!cel.some(c => RE_COL_DESCRICAO.test(c.s) || RE_COL_TIPO.test(c.s))) continue;
    reguas ||= reguasDaPagina(caminhos);
    const hy = meioDoTexto(s);
    const verticais = reguas.v.filter(r => r[1] <= hy + 1 && r[3] >= hy - 1).map(r => r[0]).sort((a, b) => a - b);
    const reguaEntre = (a, b) => verticais.find(x => x > a - 1 && x < b + 1);
    // colunas: borda esquerda = régua vertical entre os títulos ou, sem ela, o fim do título anterior
    const colunas = cel.map((c, k) => {
      const esq = k === 0
        ? (verticais.filter(x => x < c.x + 1 && x > c.x - 150).pop() ?? c.x - 60)
        : (reguaEntre(cel[k - 1].x + cel[k - 1].w, c.x) ?? cel[k - 1].x + cel[k - 1].w + 0.5);
      return { texto: c.s.trim(), esq };
    });
    const ultima = cel[cel.length - 1];
    colunas.forEach((c, k) => { c.dir = k < colunas.length - 1 ? colunas[k + 1].esq : (verticais.find(x => x > ultima.x + ultima.w - 1 && x < ultima.x + ultima.w + 150) ?? ultima.x + ultima.w + Math.max(60, ultima.w)); });
    const colSimb = colunas[cel.indexOf(s)];
    const colDesc = colunas.filter(c => RE_COL_DESCRICAO.test(c.texto));
    const colTexto = colDesc.length ? colDesc : colunas.filter(c => RE_COL_TIPO.test(c.texto));
    const colQtd = colunas.find(c => RE_COL_QTD.test(c.texto)) || null;
    const colForn = colunas.find(c => RE_COL_FORNECEDOR.test(c.texto)) || null;
    const esqT = colunas[0].esq, dirT = colunas[colunas.length - 1].dir;
    const naTabela = (t) => t.x >= esqT - 0.5 && t.x < dirT;
    const daColuna = (col, t) => t.x >= col.esq - 0.5 && t.x < col.dir - 0.5;
    const topoCab = s.y - s.h * 1.2;

    // linhas da tabela: réguas horizontais que atravessam do símbolo à descrição
    const xDesc = colTexto[0].esq;
    const ys = reguas.h.filter(r => r[0] <= colSimb.esq + (colSimb.dir - colSimb.esq) * 0.5 && r[2] >= xDesc + 5 && r[1] > hy - s.h * 0.3)
      .map(r => (r[1] + r[3]) / 2).sort((a, b) => a - b)
      .filter((y, i, l) => i === 0 || y - l[i - 1] > 1);
    let faixas = [];
    if (ys.length >= 2 && ys[0] < s.y + s.h * 4) {
      const passoMax = Math.max(s.h * 15, 60);
      const passos = [];
      for (let i = 1; i < ys.length; i++) {
        const g = ys[i] - ys[i - 1];
        const med = passos.length ? [...passos].sort((a, b) => a - b)[passos.length >> 1] : null;
        if (g > passoMax || (med && g > med * 4)) break; // vão grande: acabou a tabela
        const temTexto = horiz.some(t => { const m = meioDoTexto(t); return m > ys[i - 1] && m < ys[i] && naTabela(t); });
        if (!temTexto && passos.length) break; // linha vazia depois das linhas: fim da tabela
        if (temTexto) { faixas.push([ys[i - 1], ys[i]]); passos.push(g); }
      }
    }
    if (!faixas.length) {
      // sem réguas: cada número da coluna de quantidade (ou cada símbolo) marca uma linha
      const ancoras = (colQtd
        ? horiz.filter(t => daColuna(colQtd, t) && RE_NUMERO.test(t.s.trim()) && t.y > s.y).map(meioDoTexto)
        : blobs.filter(b => b.cx >= colSimb.esq && b.cx < colSimb.dir && b.cy > s.y).map(b => b.cy))
        .sort((a, b) => a - b).filter((y, i, l) => i === 0 || y - l[i - 1] > 2);
      const lista = [];
      for (const y of ancoras) { if (lista.length ? y - lista[lista.length - 1] > Math.max(s.h * 8, 60) : y - s.y > Math.max(s.h * 8, 60)) break; lista.push(y); }
      const passo = lista.length > 1 ? (lista[lista.length - 1] - lista[0]) / (lista.length - 1) : s.h * 2;
      faixas = lista.map((y, i) => [i ? (lista[i - 1] + y) / 2 : Math.max(s.y + s.h * 0.2, y - passo / 2), i < lista.length - 1 ? (y + lista[i + 1]) / 2 : y + passo / 2]);
    }
    if (!faixas.length) continue;
    const fundo = faixas[faixas.length - 1][1];
    const caixa = [esqT - 2, topoCab - 2, dirT + 2, fundo + 2];
    const juntar = (lista) => lista.sort((a, b) => (Math.abs(a.y - b.y) < a.h * 0.3 ? a.x - b.x : a.y - b.y)).map(t => t.s).join(' ').replace(/\s+/g, ' ').trim();
    const entradas = [], semSimbolo = [];
    for (const [y0, y1] of faixas) {
      const dentro = horiz.filter(t => { const m = meioDoTexto(t); return m > y0 && m < y1 && naTabela(t); });
      const texto = colTexto.map(c => juntar(dentro.filter(t => daColuna(c, t)))).filter(Boolean).join(' — ');
      if (!texto) continue;
      const qtdTxt = colQtd ? dentro.filter(t => daColuna(colQtd, t) && RE_NUMERO.test(t.s.trim()))[0] : null;
      const qtde = qtdTxt ? Number(qtdTxt.s.trim().replace(',', '.')) : null;
      const fornecedor = colForn ? juntar(dentro.filter(t => daColuna(colForn, t))) || null : null;
      const codigo = dentro.find(t => daColuna(colSimb, t) && /^\d{1,3}$/.test(t.s.trim()))?.s.trim() || null;
      const dentroDaCelula = (cx, cy, cx0, cx1) => cy > y0 && cy < y1 && cx0 > colSimb.esq + 0.3 && cx1 < colSimb.dir - 0.3;
      // o número da linha ("01", "02"…) pode vir desenhado em traços no canto da
      // célula: o símbolo é o que fica sob o título "Símbolo" (coluna estreita: a célula toda)
      const larg = colSimb.dir - colSimb.esq, centro = s.x + s.w / 2;
      const bs = blobs.filter(b => dentroDaCelula(b.cx, b.cy, b.caixa[0], b.caixa[2]) && (larg < 30 || Math.abs(b.cx - centro) < larg * 0.25))
        .sort((a, b) => b.w * b.h - a.w * a.h);
      const ls = caminhos.filter(c => c.traco && c.reto && c.comp >= 6 && dentroDaCelula((c.caixa[0] + c.caixa[2]) / 2, (c.caixa[1] + c.caixa[3]) / 2, c.caixa[0], c.caixa[2])).sort((a, b) => b.comp - a.comp);
      const desc = { texto, x: xDesc, y: y0, h: s.h };
      const extra = { texto, qtde, fornecedor, codigo, daTabela: true };
      const b = bs[0], l = ls[0];
      // perfil/trilho desenhado como faixa fina (retângulo cheio ou contorno fechado)
      const f = !l && !b ? caminhos.filter(c => faixaDe(c) && dentroDaCelula((c.caixa[0] + c.caixa[2]) / 2, (c.caixa[1] + c.caixa[3]) / 2, c.caixa[0], c.caixa[2])).sort((a, b) => faixaDe(b).L - faixaDe(a).L)[0] : null;
      if (l && (!b || l.comp > 2 * Math.max(b.w, b.h))) {
        entradas.push({ tipo: 'linha', caixa: l.caixa, desc, estilo: `${l.stroke}|${l.lw}|${l.dash}`, cor: l.stroke, lw: l.lw, dash: l.dash, ...extra });
      } else if (f) {
        const { familia, T } = faixaDe(f);
        entradas.push({ tipo: 'linha', caixa: f.caixa, desc, estilo: `faixa|${familia}|${T.toFixed(1)}`, cor: f.cheio ? f.fill : f.stroke, lw: +T.toFixed(1), dash: '', faixa: true, ...extra });
      } else if (b) {
        entradas.push({ tipo: 'simbolo', caixa: b.caixa, desc, blob: b, ...extra });
      } else {
        semSimbolo.push({ descricao: texto, qtde_projeto: qtde, ...(codigo ? { codigo } : {}), motivo: 'símbolo da tabela não reconhecido (traço longo ou desenho composto)' });
      }
    }
    tabelas.push({ caixa, entradas, semSimbolo, colunas: colunas.map(c => c.texto) });
  }
  return tabelas;
}

module.exports = { reguasDaPagina, tabelasDeLegenda };