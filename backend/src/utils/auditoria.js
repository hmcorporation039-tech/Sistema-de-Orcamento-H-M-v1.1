const pool = require('../config/database');

// Trilha de auditoria geral (tabela `auditoria`): exclusões e alterações
// sensíveis que não têm histórico próprio — proposta excluída, cliente,
// material, usuário, contrato, movimento financeiro, laudo, análise, margem.
// Nunca derruba a operação principal: falha ao registrar só vai para o log.
async function registrarAuditoria(executor, { entidade, entidadeId = null, acao, detalhes = null, usuarioId = null }) {
  try {
    await (executor || pool).query(
      'INSERT INTO auditoria (entidade, entidade_id, acao, detalhes, usuario_id) VALUES ($1,$2,$3,$4,$5)',
      [entidade, entidadeId, acao, detalhes ? JSON.stringify(detalhes) : null, usuarioId]
    );
  } catch (e) {
    console.warn(`Auditoria (${entidade} ${acao}): ${e.message}`);
  }
}

module.exports = { registrarAuditoria };
