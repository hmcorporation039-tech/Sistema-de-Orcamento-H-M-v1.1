const pool = require('../config/database');

// Trilha de auditoria geral (tabela `auditoria`): exclusões e alterações
// sensíveis que não têm histórico próprio — proposta excluída, cliente,
// material, usuário, contrato, movimento financeiro, laudo, análise, margem.
// Nunca derruba a operação principal: falha ao registrar só vai para o log.
//
// Dentro de uma transação (executor = client do pool, não o pool) a falha NÃO
// pode simplesmente ser engolida: no PostgreSQL o comando que falha aborta a
// transação inteira, e o COMMIT seguinte vira ROLLBACK em silêncio — a rota
// respondia sucesso sem ter gravado nada (revisão de 27/10/2026: nome
// "Jo\ud800ão" na aprovação pública → 201 "Proposta aprovada" e nada no banco).
// Por isso o INSERT roda num SAVEPOINT: se falhar, só ele é desfeito e a
// operação principal segue. Fora de transação (client em autocommit) o
// SAVEPOINT é recusado com 25P01 e o INSERT roda direto, como antes.
const SAVEPOINT = 'hm_auditoria';

// JSON.stringify mantém surrogate solto como "\ud800", que o jsonb recusa;
// troca por U+FFFD (o mesmo que String#toWellFormed faz).
function jsonBemFormado(valor) {
  return JSON.stringify(valor, (_k, v) => (typeof v === 'string' ? v.toWellFormed() : v));
}

const ehClienteDeConexao = (executor) => !!executor && executor !== pool && typeof executor.release === 'function';

// `obrigatoria`: a falha da auditoria é LANÇADA (depois de desfazer o trecho
// dela) para a operação principal não seguir sem registro — usado nas
// exclusões, em que a auditoria é a única cópia do que foi apagado.
async function registrarAuditoria(executor, { entidade, entidadeId = null, acao, detalhes = null, usuarioId = null, obrigatoria = false }) {
  const sql = 'INSERT INTO auditoria (entidade, entidade_id, acao, detalhes, usuario_id) VALUES ($1,$2,$3,$4,$5)';
  const params = [entidade, entidadeId, acao, detalhes ? jsonBemFormado(detalhes) : null, usuarioId];
  const avisar = (e) => console.warn(`Auditoria (${entidade} ${acao}): ${e.message}`);

  if (!ehClienteDeConexao(executor)) {
    try {
      await (executor || pool).query(sql, params);
    } catch (e) {
      avisar(e);
      if (obrigatoria) throw e;
    }
    return;
  }

  try {
    await executor.query(`SAVEPOINT ${SAVEPOINT}`);
  } catch (e) {
    if (e && e.code === '25P01') { // não há transação aberta: autocommit
      try { await executor.query(sql, params); } catch (e2) { avisar(e2); if (obrigatoria) throw e2; }
      return;
    }
    // transação já abortada antes daqui (25P02) ou conexão caída: não há o que
    // registrar; quem abriu a transação recebe o erro no COMMIT (comTransacao)
    avisar(e);
    if (obrigatoria) throw e;
    return;
  }
  try {
    await executor.query(sql, params);
    await executor.query(`RELEASE SAVEPOINT ${SAVEPOINT}`);
  } catch (e) {
    avisar(e);
    // se nem o ROLLBACK TO der certo, a conexão está comprometida: o erro sobe
    await executor.query(`ROLLBACK TO SAVEPOINT ${SAVEPOINT}`);
    await executor.query(`RELEASE SAVEPOINT ${SAVEPOINT}`);
    if (obrigatoria) throw e;
  }
}

module.exports = { registrarAuditoria, jsonBemFormado };
