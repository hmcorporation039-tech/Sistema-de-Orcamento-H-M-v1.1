// Regras de número e dinheiro IGUAIS às do servidor — a tela e o PDF/planilha
// precisam chegar ao mesmo centavo.
//   backend/src/utils/calculoProposta.js → arredondar, arredondarQuantidade
//   backend/src/utils/numeroBR.js        → paraNumeroBR
// Quantidade com 3 casas (proposta_itens.quantidade DECIMAL(10,3)), unitário
// com 2, total da linha com 2 (qtd × unitário já arredondados), parcelas com 2.

const numeroSeguro = (valor, padrao = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
};

export function arred2(valor) {
  return Math.round((numeroSeguro(valor) + Number.EPSILON) * 100) / 100;
}

// metade para longe do zero sobre o número como escrito ("1.0005" → 1,001),
// feito na notação decimal para não errar no binário — como o PostgreSQL
export function arredQtd(valor, padrao = 0) {
  const n = numeroSeguro(valor, padrao);
  const abs = String(Math.abs(n));
  const r = /e/i.test(abs) ? Math.round(Math.abs(n) * 1000) / 1000 : Number(`${Math.round(Number(`${abs}e3`))}e-3`);
  return n < 0 ? -r : r;
}

// total da linha como o servidor grava (valor_total)
export const totalDaLinha = (quantidade, valorUnitario) => arred2(arredQtd(quantidade) * arred2(valorUnitario));

// Texto digitado em formato brasileiro → número (null se não der):
//   tem vírgula → vírgula é decimal e pontos são milhar   ("1.234,56")
//   sem vírgula, pontos separando grupos de 3 → milhar    ("1.150", "1.150.000")
//   sem vírgula, um ponto com 1–2 casas → decimal         ("12.5", "12.50")
export function paraNumeroBR(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const texto = String(valor).trim().replace(/\s/g, '');
  if (!texto) return null;
  let normalizado;
  if (texto.includes(',')) normalizado = texto.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(texto)) normalizado = texto.replace(/\./g, '');
  else normalizado = texto;
  const n = parseFloat(normalizado);
  return Number.isFinite(n) ? n : null;
}
