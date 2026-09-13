// Converte valor monetário lido de PDF para número, cobrindo os dois formatos
// que aparecem na prática.
//
// A versão anterior (duplicada em cotacaoFornecedorParser.js e
// notaFiscalParser.js) assumia SEMPRE o padrão brasileiro e removia todos os
// pontos achando que eram separador de milhar. Num PDF que escreve "12.50"
// (ponto decimal, comum em sistema configurado em inglês), isso virava 1250 —
// preço inflado 100x gravado direto no catálogo pelo job automático, sem
// revisão humana. Confirmado rodando o parser real durante a auditoria:
// "CABO HDMI 2.0 PREMIUM 3 un 12.50 37.50" devolvia preco: 1250.
//
// Regra adotada:
//   - tem vírgula  -> vírgula é decimal e pontos são milhar  (1.234,56)
//   - sem vírgula e pontos separando grupos de 3 dígitos -> milhar  (1.234)
//   - sem vírgula e um ponto com 1-2 casas -> decimal  (12.5 / 12.50)
function paraNumeroBR(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const texto = String(valor).trim().replace(/\s/g, '');
  if (!texto) return null;

  let normalizado;
  if (texto.includes(',')) {
    normalizado = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(texto)) {
    normalizado = texto.replace(/\./g, '');
  } else {
    normalizado = texto;
  }

  const n = parseFloat(normalizado);
  return Number.isFinite(n) ? n : null;
}

module.exports = { paraNumeroBR };
