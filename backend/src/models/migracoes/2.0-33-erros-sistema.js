// Resumo de erros do sistema (02/11/2026, item da lista de sugestões): os erros 500 só iam para o
// log do servidor e ninguém via. Cada erro é gravado AGRUPADO por assinatura (método + rota sem os
// números + começo da mensagem): `ocorrencias` conta todas e `ocorrencias_avisadas` quantas já foram
// para o e-mail; a rotina `erros-sistema` avisa só a diferença, então o mesmo erro não vira 50 e-mails.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS erros_sistema (
      id SERIAL PRIMARY KEY,
      assinatura VARCHAR(64) NOT NULL UNIQUE,
      metodo VARCHAR(10),
      rota VARCHAR(300),
      mensagem VARCHAR(500),
      pilha TEXT,
      ocorrencias INTEGER NOT NULL DEFAULT 1,
      ocorrencias_avisadas INTEGER NOT NULL DEFAULT 0,
      primeiro_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ultimo_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      avisado_em TIMESTAMPTZ
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_erros_sistema_ultimo ON erros_sistema (ultimo_em)');
};
