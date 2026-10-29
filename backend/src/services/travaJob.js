const pool = require('../config/database');

// Trava das leituras automáticas (e-mail de notas, Pix, pasta de fornecedores).
// Duas execuções ao mesmo tempo — o horário das 06:00/18:00 e um "Verificar
// agora", ou duas cópias do backend rodando (já aconteceu: EADDRINUSE no log) —
// processariam o mesmo e-mail/arquivo duas vezes. Dentro do processo, quem
// chega durante uma execução recebe o resultado dela; entre processos, uma
// trava do PostgreSQL (advisory lock) faz a segunda cópia pular a rodada.
const emAndamento = new Map();

function executarComTrava(nome, fn) {
  if (emAndamento.has(nome)) return emAndamento.get(nome);
  const promessa = (async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS ok', [`hm-job:${nome}`]);
      if (!rows[0].ok) return { ignorado: true, avisos: [`"${nome}" já está em execução em outra instância do sistema — rodada ignorada`] };
      try {
        return await fn();
      } finally {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [`hm-job:${nome}`]).catch(() => {});
      }
    } finally {
      client.release();
    }
  })().finally(() => emAndamento.delete(nome));
  emAndamento.set(nome, promessa);
  return promessa;
}

module.exports = { executarComTrava };
