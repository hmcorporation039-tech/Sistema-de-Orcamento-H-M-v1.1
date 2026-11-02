// Atribuição dos lançamentos do financeiro às obras (02/11/2026, item 6 da lista de sugestões):
// a margem de cada obra só conta o que está ligado a ela (financeiro_movimentos.obra_id), e na
// produção nenhum Pix estava ligado. Esta tabela guarda a escolha do administrador por nome do
// pagador/favorecido ("lembrar"), para os próximos Pix desse nome já virem ligados, ou a marca
// "geral" (despesa da empresa, que não é de obra nenhuma e sai da lista de pendentes).
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS regras_movimento_obra (
      id SERIAL PRIMARY KEY,
      tipo VARCHAR(20) NOT NULL,
      nome_chave VARCHAR(200) NOT NULL,
      obra_id INTEGER REFERENCES obras(id) ON DELETE CASCADE,
      geral BOOLEAN NOT NULL DEFAULT FALSE,
      criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tipo, nome_chave),
      CHECK (geral OR obra_id IS NOT NULL)
    )
  `);
};
