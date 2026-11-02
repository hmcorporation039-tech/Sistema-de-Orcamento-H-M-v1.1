// Comparativo de fornecedores (02/11/2026, item da lista de sugestões): a cotação lida só completava o
// catálogo e o preço dela se perdia, então ninguém sabia quem cotou mais barato. Agora cada preço cotado
// fica guardado com o fornecedor (CNPJ lido do próprio documento). O catálogo continua sem mudar de preço
// por cotação (decisão de 10/10/2026): o comparativo só aponta, quem decide é o engenheiro.
// `documento` = hash do arquivo (pasta) ou identificador do e-mail + anexo: reler o mesmo documento não duplica.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cotacao_fornecedores (
      cnpj VARCHAR(14) PRIMARY KEY,
      nome VARCHAR(200),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS cotacoes_itens (
      id SERIAL PRIMARY KEY,
      material_id INTEGER NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
      fornecedor_cnpj VARCHAR(14) NOT NULL REFERENCES cotacao_fornecedores(cnpj),
      preco NUMERIC(12,4) NOT NULL,
      unidade VARCHAR(20),
      quantidade NUMERIC(14,3),
      origem VARCHAR(40),
      documento VARCHAR(120) NOT NULL,
      data_cotacao DATE NOT NULL DEFAULT CURRENT_DATE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS ux_cotacoes_itens_documento ON cotacoes_itens (documento, material_id, preco)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_cotacoes_itens_material ON cotacoes_itens (material_id, data_cotacao DESC)');
};
