// Tabela SINAPI local (Caixa): preços de insumos e custos de composições por mês, UF e
// regime de encargos (pedido do usuário em 02/11/2026: referência DF, atualizada pelo
// site oficial). O sistema consulta daqui, sem IA e sem internet.
//   regime: 'sem' = sem desoneração da folha, 'com' = com desoneração
//   origem do preço (insumos): 'C' coletado, 'CR' coeficiente de representatividade
//   pct_as (composições): % do custo obtida com preços de São Paulo por falta de coleta
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS sinapi_insumos (
      mes CHAR(7) NOT NULL,
      uf CHAR(2) NOT NULL,
      regime VARCHAR(3) NOT NULL CHECK (regime IN ('sem', 'com')),
      codigo INTEGER NOT NULL,
      descricao VARCHAR(400) NOT NULL,
      unidade VARCHAR(40),
      classificacao VARCHAR(120),
      origem VARCHAR(4),
      preco NUMERIC(14,2),
      PRIMARY KEY (mes, uf, regime, codigo)
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS sinapi_composicoes (
      mes CHAR(7) NOT NULL,
      uf CHAR(2) NOT NULL,
      regime VARCHAR(3) NOT NULL CHECK (regime IN ('sem', 'com')),
      codigo INTEGER NOT NULL,
      grupo VARCHAR(200),
      descricao VARCHAR(600) NOT NULL,
      unidade VARCHAR(40),
      custo NUMERIC(14,2),
      pct_as NUMERIC(6,4),
      PRIMARY KEY (mes, uf, regime, codigo)
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS sinapi_importacoes (
      mes CHAR(7) NOT NULL,
      uf CHAR(2) NOT NULL,
      arquivo VARCHAR(200),
      insumos INTEGER NOT NULL DEFAULT 0,
      composicoes INTEGER NOT NULL DEFAULT 0,
      importado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (mes, uf)
    )
  `);
  // colunas alargadas depois do primeiro teste com a planilha real (grupo e unidade passavam do limite)
  await client.query(`ALTER TABLE sinapi_composicoes ALTER COLUMN grupo TYPE VARCHAR(200), ALTER COLUMN unidade TYPE VARCHAR(40)`);
  await client.query(`ALTER TABLE sinapi_insumos ALTER COLUMN classificacao TYPE VARCHAR(120), ALTER COLUMN unidade TYPE VARCHAR(40)`);
  // estado e regime de referência: ajustáveis (DF e sem desoneração até o Márcio decidir)
  await client.query(`INSERT INTO configuracoes (chave, valor) VALUES ('sinapi_uf', 'DF') ON CONFLICT (chave) DO NOTHING`);
  await client.query(`INSERT INTO configuracoes (chave, valor) VALUES ('sinapi_regime', 'sem') ON CONFLICT (chave) DO NOTHING`);
};
