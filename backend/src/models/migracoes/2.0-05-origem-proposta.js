// Origem estruturada da proposta (versão 2.0, editor único de orçamento): o
// rascunho gerado pela Análise de Projeto ou por um laudo guarda de onde veio
// (origem_tipo 'analise' | 'laudo', origem_id). Antes o editor deduzia isso do
// texto do histórico. Propostas antigas são preenchidas pelos vínculos que já
// existem (analises_projeto.proposta_id e laudos_projetos.propostas), só onde
// a origem ainda é nula — idempotente.
module.exports = async (client) => {
  await client.query('ALTER TABLE propostas ADD COLUMN IF NOT EXISTS origem_tipo VARCHAR(10)');
  await client.query('ALTER TABLE propostas ADD COLUMN IF NOT EXISTS origem_id INTEGER');
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_origem_tipo_check') THEN
        ALTER TABLE propostas ADD CONSTRAINT propostas_origem_tipo_check CHECK (origem_tipo IS NULL OR origem_tipo IN ('analise', 'laudo'));
      END IF;
    END $$;
  `);
  await client.query(`
    UPDATE propostas p SET origem_tipo = 'analise', origem_id = a.id
      FROM analises_projeto a
     WHERE a.proposta_id = p.id AND p.origem_tipo IS NULL
  `);
  await client.query(`
    UPDATE propostas p SET origem_tipo = 'laudo', origem_id = l.id
      FROM laudos_projetos l, jsonb_each_text(COALESCE(l.propostas, '{}'::jsonb)) e
     WHERE e.value ~ '^[0-9]+$' AND e.value::int = p.id AND p.origem_tipo IS NULL
  `);
};
