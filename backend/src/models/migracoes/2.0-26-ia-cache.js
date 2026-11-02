// Cache das chamadas à IA (item 1 do plano de melhorias, 02/11/2026): a mesma entrada
// não volta a gastar IA enquanto a resposta guardada for válida.
//   ia_cache: uma linha por (função + entrada), com validade e contagem de acertos
//   ia_cache_uso: contagem por dia e por função (acertos × chamadas reais), para o
//   painel de Integrações mostrar quantas chamadas à IA foram evitadas
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ia_cache (
      chave CHAR(64) PRIMARY KEY,
      nome VARCHAR(60) NOT NULL,
      resultado JSONB NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      expira_em TIMESTAMP NOT NULL,
      acertos INTEGER NOT NULL DEFAULT 0
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_ia_cache_expira ON ia_cache (expira_em)');
  await client.query(`
    CREATE TABLE IF NOT EXISTS ia_cache_uso (
      nome VARCHAR(60) NOT NULL,
      dia DATE NOT NULL DEFAULT CURRENT_DATE,
      acertos INTEGER NOT NULL DEFAULT 0,
      chamadas INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (nome, dia)
    )
  `);
};
