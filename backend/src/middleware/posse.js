const pool = require('../config/database');

// Exige que o usuário seja o DONO do registro (ou administrador) para alterar
// ou apagar. Leitura continua livre para qualquer usuário autenticado —
// a regra definida pelo cliente foi: todos veem tudo, mas cada um só mexe no
// que criou; o administrador mexe em tudo.
//
// Antes disso, `usuario_id` era gravado em propostas, contratos, análises e
// movimentos financeiros mas NUNCA aparecia em nenhuma cláusula WHERE: qualquer
// usuário autenticado apagava a proposta de qualquer outro, sem deixar rastro
// (o DELETE ainda derruba seções/itens/eventos por cascade).
//
// `tabela` é sempre um literal escolhido aqui no código (nunca vem do
// usuário), então a interpolação no SQL é segura.
function exigirPosse(tabela, { naoEncontrado, semPermissao }) {
  return async function verificarPosse(req, res, next) {
    try {
      const { rows } = await pool.query(
        `SELECT usuario_id FROM ${tabela} WHERE id = $1`,
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ erro: naoEncontrado });
      }

      const dono = rows[0].usuario_id;
      const ehAdmin = req.usuario.role === 'admin';
      // Registro antigo sem dono (anterior a este controle) fica liberado —
      // bloquear tornaria propostas históricas ineditáveis por qualquer pessoa.
      const semDono = dono === null || dono === undefined;

      if (ehAdmin || semDono || dono === req.usuario.id) return next();

      return res.status(403).json({ erro: semPermissao });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { exigirPosse };
