// Vencimentos de laudos (02/11/2026, item 9 da lista de sugestões): cada laudo entregue tem validade
// (SPDA, incêndio, elétrica… costumam ser renovados todo ano ou a cada poucos anos). A tabela guarda
// quando o laudo foi emitido, quantos meses vale e quando vence; a rotina `vencimentos` avisa por
// e-mail a 60 e a 30 dias e quando vence (`etapa_avisada`: 0 nada, 1 = 60 dias, 2 = 30 dias, 3 = vencido).
// Preenchida pelos laudos do próprio sistema (laudo_id) e por cadastro manual dos laudos antigos.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS vencimentos_laudos (
      id SERIAL PRIMARY KEY,
      disciplina VARCHAR(30) NOT NULL,
      descricao VARCHAR(200) NOT NULL,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      cliente_nome VARCHAR(200),
      obra_id INTEGER REFERENCES obras(id) ON DELETE SET NULL,
      laudo_id INTEGER REFERENCES laudos_projetos(id) ON DELETE SET NULL,
      emitido_em DATE NOT NULL,
      validade_meses INTEGER NOT NULL DEFAULT 12 CHECK (validade_meses BETWEEN 1 AND 120),
      vence_em DATE NOT NULL,
      etapa_avisada SMALLINT NOT NULL DEFAULT 0,
      avisado_em TIMESTAMPTZ,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      observacao TEXT,
      criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_vencimentos_laudo ON vencimentos_laudos (laudo_id) WHERE laudo_id IS NOT NULL');
  await client.query('CREATE INDEX IF NOT EXISTS idx_vencimentos_ativos ON vencimentos_laudos (vence_em) WHERE ativo');
};
