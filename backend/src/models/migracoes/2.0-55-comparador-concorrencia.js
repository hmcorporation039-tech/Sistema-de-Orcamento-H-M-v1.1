// Comparador de orçamentos da concorrência (pedido do usuário, 06/11/2026: "carregamos um orçamento do concorrente
// para um mesmo projeto que precisamos orçar e analisamos todos os itens e serviços para oferecermos o melhor para o
// cliente"). O orçamento do concorrente (PDF ou planilha) é lido sem IA (services/concorrencia.js) e guardado aqui,
// ligado à proposta da H&M do mesmo projeto; a comparação item a item é calculada na hora (utils/comparadorOrcamentos).
//   orcamentos_concorrentes: um arquivo de um concorrente (cabeçalho, totais, avisos da leitura)
//   orcamento_concorrente_itens: as linhas lidas; par_item_id é o vínculo manual com um item da proposta da H&M
//     (corrige o casamento automático), sem FK porque o item da proposta é recriado a cada salvamento — o vínculo
//     manual guarda também a descrição (par_descricao) para reencontrar o item depois de salvar a proposta.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS orcamentos_concorrentes (
      id SERIAL PRIMARY KEY,
      proposta_id INTEGER REFERENCES propostas(id) ON DELETE SET NULL,
      obra_id INTEGER REFERENCES obras(id) ON DELETE SET NULL,
      concorrente VARCHAR(200) NOT NULL,
      cnpj VARCHAR(20),
      arquivo_nome VARCHAR(255),
      arquivo_hash VARCHAR(64),
      metodo VARCHAR(80),
      total_documento NUMERIC(14,2),
      soma_itens NUMERIC(14,2),
      bdi_informado NUMERIC(7,2),
      avisos JSONB NOT NULL DEFAULT '[]',
      observacoes TEXT,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS orcamento_concorrente_itens (
      id SERIAL PRIMARY KEY,
      orcamento_id INTEGER NOT NULL REFERENCES orcamentos_concorrentes(id) ON DELETE CASCADE,
      ordem INTEGER NOT NULL DEFAULT 0,
      descricao VARCHAR(500) NOT NULL,
      unidade VARCHAR(20),
      quantidade NUMERIC(14,3),
      valor_unitario NUMERIC(14,2),
      valor_material NUMERIC(14,2),
      valor_mao_obra NUMERIC(14,2),
      valor_total NUMERIC(14,2),
      tipo VARCHAR(10),
      disciplina VARCHAR(40),
      secao VARCHAR(200),
      par_item_id INTEGER,
      par_descricao VARCHAR(500),
      sem_par BOOLEAN NOT NULL DEFAULT false
    )`);
  await client.query('CREATE INDEX IF NOT EXISTS idx_orc_concorrentes_proposta ON orcamentos_concorrentes(proposta_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_orc_concorrentes_obra ON orcamentos_concorrentes(obra_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_orc_concorrente_itens_orc ON orcamento_concorrente_itens(orcamento_id)');
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_orc_concorrente_itens_tipo') THEN
      ALTER TABLE orcamento_concorrente_itens ADD CONSTRAINT ck_orc_concorrente_itens_tipo CHECK (tipo IS NULL OR tipo IN ('material', 'servico'));
    END IF;
  END $$`);
};
