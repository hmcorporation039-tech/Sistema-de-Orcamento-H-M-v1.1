// Célula de CSV (separador ";", abre no Excel em português). Uma só para as
// exportações (relatórios, financeiro) — antes havia duas cópias.
// Texto que começa com = + - @ vira fórmula no Excel (nome de cliente ou
// descrição de Pix digitados por terceiros: "=HYPERLINK(...)"); ganha um
// apóstrofo na frente e fica texto. Número negativo ("-150,00") continua número.
function escaparCsv(valor) {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto) && !/^[-+]?\d[\d.,]*$/.test(texto)) texto = `'${texto}`;
  if (/[",;\n\r]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

module.exports = { escaparCsv };
