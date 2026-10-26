// Versão 2.0 — Fase 3I: aprovação da proposta por link (aceite eletrônico
// simples, NÃO é assinatura ICP-Brasil). Regras em utils/aprovacaoLink.js.
//
// proposta_links_aprovacao: um link por envio. O token em claro só aparece uma
// vez, ao gerar; aqui fica o HASH sha-256 (quem lê o banco ou um backup não
// consegue abrir a proposta pelo link).
//
// proposta_decisoes_aprovacao: no máximo UMA decisão por link (UNIQUE). Guarda
// quem decidiu (nome, CPF/CNPJ, cargo, e-mail), de onde (IP, navegador), quando,
// o texto da declaração aceita e o conteúdo da proposta naquele momento
// (JSON + hash sha-256 do total e dos itens). Os vínculos com link/proposta são
// ON DELETE SET NULL: excluir a proposta não apaga a prova do aceite (o número
// e o total ficam copiados na própria linha).
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS proposta_links_aprovacao (
      id SERIAL PRIMARY KEY,
      proposta_id INTEGER NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
      token_hash CHAR(64) NOT NULL UNIQUE,
      criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expira_em TIMESTAMPTZ NOT NULL,
      revogado_em TIMESTAMPTZ,
      revogado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      ultimo_acesso_em TIMESTAMPTZ,
      acessos INTEGER NOT NULL DEFAULT 0
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_links_aprovacao_proposta ON proposta_links_aprovacao(proposta_id)');

  await client.query(`
    CREATE TABLE IF NOT EXISTS proposta_decisoes_aprovacao (
      id SERIAL PRIMARY KEY,
      link_id INTEGER UNIQUE REFERENCES proposta_links_aprovacao(id) ON DELETE SET NULL,
      proposta_id INTEGER REFERENCES propostas(id) ON DELETE SET NULL,
      numero_proposta VARCHAR(10) NOT NULL,
      total DECIMAL(12,2) NOT NULL,
      decisao VARCHAR(10) NOT NULL CHECK (decisao IN ('aprovada', 'recusada')),
      nome VARCHAR(150) NOT NULL,
      tipo_documento VARCHAR(4) NOT NULL CHECK (tipo_documento IN ('CPF', 'CNPJ')),
      documento VARCHAR(14) NOT NULL,
      cargo VARCHAR(100),
      email VARCHAR(254),
      observacao TEXT,
      aceite_termos BOOLEAN NOT NULL DEFAULT false,
      texto_declaracao TEXT NOT NULL,
      ip VARCHAR(64),
      user_agent VARCHAR(500),
      decidido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      hash_conteudo CHAR(64) NOT NULL,
      conteudo JSONB NOT NULL
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_decisoes_aprovacao_proposta ON proposta_decisoes_aprovacao(proposta_id)');
};
