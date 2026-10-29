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

// As regras de dono de cada tipo de registro, prontas — antes cada arquivo de
// rotas criava a sua (a de proposta em 3 lugares, a de obra em 3, a de análise
// em 2), com o mesmo texto copiado. Mensagem: "Esta proposta foi criada por
// outro usuário. Peça a ele ou a um administrador para <ação>."
const msgDono = (rotulo, feminino, acao = 'alterar') =>
  `Est${feminino ? 'a' : 'e'} ${rotulo} foi criad${feminino ? 'a' : 'o'} por outro usuário. Peça a ele ou a um administrador para ${acao}.`;
const regra = (tabela, rotulo, feminino, naoEncontrado, acao) => exigirPosse(tabela, { naoEncontrado, semPermissao: msgDono(rotulo, feminino, acao) });
const posse = {
  proposta: regra('propostas', 'proposta', true, 'Proposta não encontrada.'),
  analise: regra('analises_projeto', 'análise', true, 'Análise não encontrada.'),
  laudo: regra('laudos_projetos', 'laudo', false, 'Laudo não encontrado.'),
  contrato: regra('contratos', 'contrato', false, 'Contrato não encontrado.'),
  // obra: a ação muda a mensagem ("abrir a OS", "alterar o cronograma…")
  obra: (acao = 'alterar') => regra('obras', 'obra', true, 'Obra não encontrada.', acao),
};

module.exports = { exigirPosse, posse };
