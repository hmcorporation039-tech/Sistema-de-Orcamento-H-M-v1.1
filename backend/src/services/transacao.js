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
//
// 3. COMMIT numa transação já abortada não dá erro no PostgreSQL: ele responde
//    "ROLLBACK" e desfaz tudo em silêncio. Se um comando do meio falhou e o
//    erro foi engolido, a rota respondia sucesso sem nada gravado (revisão de
//    27/10/2026: aprovação pública → 201 "Proposta aprovada" e nada no banco).
//    Agora o retorno do COMMIT é conferido e vira erro.
class TransacaoDesfeita extends Error {
  constructor() {
    super('A transação foi desfeita pelo banco de dados: um comando anterior falhou e nada foi gravado.');
    this.name = 'TransacaoDesfeita';
    this.code = 'TRANSACAO_DESFEITA';
  }
}

// Nível de isolamento opcional ({ isolamento: 'REPEATABLE READ' }): no padrão
// (READ COMMITTED) cada comando enxerga o banco do seu próprio instante; quem
// lê proposta, seções e itens em comandos separados pode pegar uma edição pela
// metade (seções novas com os itens antigos). Em REPEATABLE READ todas as
// leituras da transação veem o mesmo retrato.
// Nesse nível, gravar uma linha que outra transação alterou depois do retrato
// dá erro de serialização (40001): a transação inteira é refeita, até
// `tentativas` vezes (padrão 3 em REPEATABLE READ/SERIALIZABLE, 1 no padrão).
const ISOLAMENTOS = new Set(['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE']);
const ERROS_DE_SERIALIZACAO = new Set(['40001', '40P01']);

async function comTransacao(fn, { isolamento = null, tentativas = null } = {}) {
  const nivel = isolamento == null ? null : String(isolamento).toUpperCase();
  if (nivel && !ISOLAMENTOS.has(nivel)) throw new Error(`Nível de isolamento inválido: ${isolamento}`);
  const maxTentativas = tentativas || (nivel && nivel !== 'READ COMMITTED' ? 3 : 1);
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await umaTransacao(fn, nivel);
    } catch (err) {
      if (tentativa >= maxTentativas || !ERROS_DE_SERIALIZACAO.has(err.code)) throw err;
    }
  }
}

async function umaTransacao(fn, nivel) {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    throw new Error(`Não foi possível conectar ao banco de dados: ${err.message}`);
  }

  let conexaoComprometida = false;
  try {
    await client.query(nivel ? `BEGIN ISOLATION LEVEL ${nivel}` : 'BEGIN');
    const resultado = await fn(client);
    const fim = await client.query('COMMIT');
    if (fim && fim.command === 'ROLLBACK') throw new TransacaoDesfeita();
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

module.exports = { comTransacao, TransacaoDesfeita };
