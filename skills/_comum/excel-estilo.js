// Estilo das planilhas Excel da H&M (ExcelJS, sem importá-lo — recebe a aba e a
// pasta de trabalho prontas). Antes cada aba tinha o título numa célula solta,
// o cabeçalho da tabela começava em linhas diferentes, nada de bordas, e a
// impressão saía em retrato com as margens padrão: as abas largas (Orçamento,
// Pesquisa de Preços) se espalhavam em várias folhas, sem repetir o cabeçalho.
// Aqui fica o padrão único: faixa de título preta com o logo e o texto dourado,
// cabeçalho da tabela, bordas finas, linhas de seção/subtotal/total e a
// configuração de impressão (A4, ajustada à largura, títulos repetidos).
// O cabeçalho e o rodapé de impressão (empresa, página) continuam em empresa.js.

const fs = require('fs');
const path = require('path');

const COR = Object.freeze({
  preto: 'FF141414', dourado: 'FFC9A227', douradoEscuro: 'FF8A6A0C', branco: 'FFFFFFFF',
  cinzaTexto: 'FF6B6B6B', borda: 'FFD0D0D0', secao: 'FFF2F2F2', subtotal: 'FFFBF4DE',
});
const fundo = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const fina = (argb = COR.borda) => ({ style: 'thin', color: { argb } });
const LOGO = path.join(__dirname, 'assets', 'logo-pequeno.png');

// largura total das colunas usadas (unidades de caractere do Excel)
function larguraTotal(ws, ultimaColuna = ws.columnCount) {
  let s = 0;
  for (let c = 1; c <= ultimaColuna; c++) s += ws.getColumn(c).width || 9;
  return s;
}

// Faixa de título nas linhas 1 (e 2): mescla até a última coluna da tabela,
// logo à esquerda, título dourado em caixa alta centralizado e subtítulo
// (texto ou { formula }) em cinza. As linhas 1–2 já eram do título em todas as
// abas, então nenhuma fórmula muda de lugar. `subtitulo: false` deixa a linha 2
// como está (a aba usa as células dela).
function faixaTitulo(wb, ws, { titulo, subtitulo, ultimaColuna }) {
  const n = Math.max(1, ultimaColuna || ws.columnCount || 1);
  const l1 = ws.getRow(1);
  if (n > 1) ws.mergeCells(1, 1, 1, n);
  const c1 = ws.getCell(1, 1);
  c1.value = String(titulo || '').toUpperCase();
  c1.font = { name: 'Arial', bold: true, size: 14, color: { argb: COR.dourado } };
  c1.alignment = { horizontal: 'center', vertical: 'middle' };
  c1.fill = fundo(COR.preto);
  for (let c = 1; c <= n; c++) ws.getCell(1, c).border = { bottom: { style: 'medium', color: { argb: COR.dourado } } };
  l1.height = 40;
  if (fs.existsSync(LOGO)) {
    if (!wb.__logoHm) wb.__logoHm = wb.addImage({ buffer: fs.readFileSync(LOGO), extension: 'png' });
    // o logo fica por cima da faixa, no canto esquerdo (46 × 46 px cabem nos 40 pt ≈ 53 px da linha)
    ws.addImage(wb.__logoHm, { tl: { col: 0.08, row: 0.08 }, ext: { width: 46, height: 46 }, editAs: 'oneCell' });
  }
  if (subtitulo === false) return;
  const l2 = ws.getRow(2);
  if (n > 1) ws.mergeCells(2, 1, 2, n);
  const c2 = ws.getCell(2, 1);
  if (subtitulo != null) c2.value = subtitulo;
  c2.font = { name: 'Arial', italic: true, size: 9, color: { argb: COR.cinzaTexto } };
  c2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  l2.height = 20;
}

// Linha de cabeçalho da tabela: fundo preto, texto branco em negrito, centralizado e com quebra
function cabecalhoTabela(ws, linha, titulos) {
  const r = ws.getRow(linha);
  titulos.forEach((t, i) => {
    const c = r.getCell(i + 1);
    c.value = t;
    c.font = { name: 'Arial', bold: true, size: 9, color: { argb: COR.branco } };
    c.fill = fundo(COR.preto);
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = { top: fina(COR.preto), left: fina('FF3A3A3A'), right: fina('FF3A3A3A'), bottom: { style: 'medium', color: { argb: COR.dourado } } };
  });
  r.height = 30;
}

// Corpo da tabela: borda fina em todas as células, alinhamento vertical ao centro,
// quebra de texto nas colunas de texto longo e centralizado nas colunas curtas.
// Não mexe em fonte (o azul = "valor digitado" é convenção da planilha) nem em formato numérico.
function corpoTabela(ws, { de, ate, ultimaColuna, quebrar = [], centralizar = [] }) {
  for (let l = de; l <= ate; l++) {
    for (let c = 1; c <= ultimaColuna; c++) {
      const cel = ws.getCell(l, c);
      cel.border = { top: fina(), left: fina(), right: fina(), bottom: fina() };
      cel.alignment = { ...(cel.alignment || {}), vertical: 'middle', ...(quebrar.includes(c) ? { wrapText: true } : {}), ...(centralizar.includes(c) ? { horizontal: 'center' } : {}) };
      if (!cel.font?.name) cel.font = { ...(cel.font || {}), name: 'Arial', size: cel.font?.size || 9 };
    }
  }
}

// Linhas de destaque da tabela (o texto e as fórmulas já estão nelas):
//   'secao'    — título do sistema: faixa cinza clara, dourado escuro, negrito
//   'subtotal' — creme, negrito, borda de cima
//   'total'    — faixa preta, texto dourado em negrito (TOTAL, PREÇO FINAL)
function destacarLinha(ws, linha, ultimaColuna, tipo) {
  for (let c = 1; c <= ultimaColuna; c++) {
    const cel = ws.getCell(linha, c);
    const base = { name: 'Arial', size: tipo === 'total' ? 10 : 9, bold: true };
    if (tipo === 'secao') { cel.fill = fundo(COR.secao); cel.font = { ...base, color: { argb: COR.douradoEscuro } }; }
    if (tipo === 'subtotal') { cel.fill = fundo(COR.subtotal); cel.font = { ...base, color: { argb: COR.preto } }; }
    if (tipo === 'total') { cel.fill = fundo(COR.preto); cel.font = { ...base, color: { argb: COR.dourado } }; }
    cel.border = { top: { style: tipo === 'secao' ? 'thin' : 'medium', color: { argb: tipo === 'total' ? COR.dourado : COR.borda } }, bottom: fina(), left: fina(), right: fina() };
    cel.alignment = { ...(cel.alignment || {}), vertical: 'middle', ...(tipo === 'secao' ? { horizontal: 'left' } : {}) };
  }
  ws.getRow(linha).height = tipo === 'total' ? 22 : 18;
}

// Impressão: A4, ajustada à largura da página (altura livre), centralizada,
// margens estreitas com espaço para o cabeçalho/rodapé do timbrado e as linhas
// de título repetidas em cada folha. Paisagem quando a tabela é larga.
function configurarImpressao(ws, { linhasTitulo = null, ultimaColuna = ws.columnCount, paisagem = null } = {}) {
  const larga = paisagem ?? larguraTotal(ws, ultimaColuna) > 105;
  ws.pageSetup = {
    ...ws.pageSetup,
    paperSize: 9, orientation: larga ? 'landscape' : 'portrait',
    fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
    margins: { left: 0.4, right: 0.4, top: 0.75, bottom: 0.85, header: 0.3, footer: 0.3 },
    ...(linhasTitulo ? { printTitlesRow: linhasTitulo } : {}),
  };
}

module.exports = { COR, faixaTitulo, cabecalhoTabela, corpoTabela, destacarLinha, configurarImpressao, larguraTotal };
