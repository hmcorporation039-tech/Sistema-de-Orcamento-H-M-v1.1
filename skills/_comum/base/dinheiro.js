// Regras de número e dinheiro da proposta — a tela, o PDF e a planilha precisam chegar ao mesmo centavo.
// Quantidade com 3 casas (proposta_itens.quantidade DECIMAL(10,3)), unitário com 2, total da linha com 2,
// parcelas com 2. O frontend tem a cópia em frontend/src/utils/dinheiro.js (o build do React não importa
// daqui); backend/testes/comum.test.js confere que as duas dão o mesmo resultado.

// Número finito ou o padrão. (`Number('abc') * 10` produzia NaN, e o PostgreSQL ACEITA NaN em coluna
// numeric — contaminando para sempre qualquer SUM() do dashboard.)
function numeroSeguro(valor, padrao = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
}

// 2 casas (centavos)
function arredondar(valor) {
  return Math.round((numeroSeguro(valor) + Number.EPSILON) * 100) / 100;
}

// Quantidade com 3 casas, como a coluna proposta_itens.quantidade DECIMAL(10,3)
// grava. Antes a conta usava a quantidade cheia (1,0004 × 1.000 = 1.000,40) e o
// banco gravava 1,000: o PDF saía "1 × 1.000,00 = 1.000,40" e Excel, curva ABC,
// cronograma e a tela depois de recarregar davam outro número. O arredondamento
// é o do PostgreSQL (metade para longe do zero sobre o número como escrito:
// "1.0005" → 1,001), feito na notação decimal para não errar no binário.
function arredondarQuantidade(valor, padrao = 0) {
  const n = numeroSeguro(valor, padrao);
  const abs = String(Math.abs(n));
  const r = /e/i.test(abs) ? Math.round(Math.abs(n) * 1000) / 1000 : Number(`${Math.round(Number(`${abs}e3`))}e-3`);
  return n < 0 ? -r : r;
}

// Valor escrito em formato brasileiro (ou lido de PDF) → número (null se não der):
//   tem vírgula  -> vírgula é decimal e pontos são milhar  (1.234,56)
//   sem vírgula e pontos separando grupos de 3 dígitos -> milhar  (1.234)
//   sem vírgula e um ponto com 1-2 casas -> decimal  (12.5 / 12.50)
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

module.exports = { numeroSeguro, arredondar, arredondarQuantidade, paraNumeroBR };
