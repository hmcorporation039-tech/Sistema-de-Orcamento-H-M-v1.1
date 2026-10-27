// Versão 2.0 — registro uniforme das rotinas automáticas (painel de Integrações).
// Uma linha por execução de cada rotina (notas por e-mail, Pix por e-mail,
// orçamentos de fornecedores nas pastas), seja pelo horário (06:00/18:00) ou
// pelo botão "Verificar agora"/"Executar agora". Gravada por services/rotinas.js.
// Os registros próprios de cada rotina (emails_processados, notas_processadas,
// arquivos_fornecedores_processados) continuam como estão.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS rotinas_execucoes (
      id SERIAL PRIMARY KEY,
      chave VARCHAR(40) NOT NULL,
      origem VARCHAR(20) NOT NULL DEFAULT 'agendada',
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'em_andamento',
      itens INTEGER,
      resumo JSONB,
      erro TEXT,
      iniciado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      terminado_em TIMESTAMP
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_rotinas_execucoes_chave ON rotinas_execucoes (chave, iniciado_em DESC)');
  // origem: agendada | manual; status: em_andamento | ok | avisos | ignorada | erro
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rotinas_execucoes_status_check') THEN
        ALTER TABLE rotinas_execucoes ADD CONSTRAINT rotinas_execucoes_status_check
          CHECK (status IN ('em_andamento', 'ok', 'avisos', 'ignorada', 'erro'));
      END IF;
    END $$
  `);
};
