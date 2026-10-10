// Rejeita :id que não seja inteiro positivo ANTES de chegar ao banco.
//
// Sem isso, `GET /propostas/abc` mandava 'abc' para uma coluna integer, o
// PostgreSQL devolvia 22P02 e o catch genérico transformava em 500 — erro de
// servidor para o que é claramente entrada inválida do cliente. Validei esse
// comportamento em 6 endpoints (propostas, análises, contratos e os PDFs).
// Maior valor de uma coluna integer/SERIAL do PostgreSQL — acima disso o
// banco devolve 22003 (fora do intervalo), que também virava 500.
const MAIOR_ID = 2147483647;

function validarId(req, res, next) {
  const { id } = req.params;
  if (!/^\d+$/.test(String(id)) || Number(id) < 1 || Number(id) > MAIOR_ID) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }
  next();
}

module.exports = { validarId };
