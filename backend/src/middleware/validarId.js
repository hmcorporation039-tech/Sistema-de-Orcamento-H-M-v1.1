// Rejeita :id que não seja inteiro positivo ANTES de chegar ao banco.
//
// Sem isso, `GET /propostas/abc` mandava 'abc' para uma coluna integer, o
// PostgreSQL devolvia 22P02 e o catch genérico transformava em 500 — erro de
// servidor para o que é claramente entrada inválida do cliente. Validei esse
// comportamento em 6 endpoints (propostas, análises, contratos e os PDFs).
function validarId(req, res, next) {
  const { id } = req.params;
  if (!/^\d+$/.test(String(id)) || Number(id) < 1) {
    return res.status(400).json({ erro: 'Identificador inválido.' });
  }
  next();
}

module.exports = { validarId };
