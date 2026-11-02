// Acompanhamento das propostas enviadas e sem resposta (02/11/2026, item da lista de sugestões): cada vez que
// alguém liga ou escreve para o cliente fica um registro ('contato'), ou a decisão de deixar para depois
// ('adiado', com a data em proximo_em). A proposta enviada vem do histórico que já existe (proposta_eventos,
// acao 'email'); aqui só vai o que a pessoa fez depois. Apagar a proposta apaga os registros.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS proposta_followups (
      id SERIAL PRIMARY KEY,
      proposta_id INTEGER NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
      usuario_id INTEGER REFERENCES usuarios(id),
      tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('contato', 'adiado')),
      nota VARCHAR(500),
      proximo_em DATE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_proposta_followups_proposta ON proposta_followups (proposta_id, criado_em)');
};
