const pool = require('../config/database');

// Executa `fn(client)` dentro de uma transação, cuidando de BEGIN/COMMIT/
// ROLLBACK e da devolução da conexão ao pool.
//
// Resolve dois problemas reais que existiam no padrão manual repetido nos
// controllers:
//
// 1. `const client = await pool.connect()` ficava FORA do try. Se o Postgres
//    reiniciasse ou o pool esgotasse, a rejeição não era capturada: a
//    requisição ficava pendurada sem resposta e o processo caía (Node 24
//    derruba o processo em unhandledRejection).
//
// 2. `await client.query('ROLLBACK')` sem proteção. Quando o erro original era
//    justamente a queda da conexão, o ROLLBACK também rejeitava — o erro real
//    nunca era logado, a resposta nunca era enviada, e a conexão voltava suja
//    para o pool (a próxima requisição herdava uma transação abortada).
//    Agora o ROLLBACK falho é engolido e a conexão é descartada do pool
//    passando o erro para `release`, que é o jeito correto no `pg`.
async function comTransacao(fn) {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    throw new Error(`Não foi possível conectar ao banco de dados: ${err.message}`);
  }

  let conexaoComprometida = false;
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (erroRollback) {
      // A conexão provavelmente morreu — não pode voltar limpa para o pool.
      conexaoComprometida = true;
      console.error('Falha ao desfazer a transação (conexão será descartada):', erroRollback.message);
    }
    throw err;
  } finally {
    client.release(conexaoComprometida ? new Error('conexão descartada após falha no rollback') : undefined);
  }
}

module.exports = { comTransacao };
