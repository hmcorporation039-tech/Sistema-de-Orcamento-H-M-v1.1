// Canal remoto (Fase 6 — Telegram/WhatsApp, 02/11/2026): fila das mensagens recebidas, estado da
// conversa de cada contato e o prazo das ações pendentes (INT-08). services/canal/*.
//
//   canal_mensagens   uma linha por mensagem recebida do provedor (ou do simulador da tela). O
//                     id externo é ÚNICO por canal: o provedor reenvia o mesmo update quando a resposta
//                     demora, e a segunda cópia não é processada de novo. O webhook só grava aqui e
//                     responde 200; o trabalhador do backend processa e responde depois.
//                     estado: recebida → processando → respondida | erro | ignorada
//   canal_contatos    estado da conversa de um chat/telefone: a conversa do assistente usada pelo
//                     canal e a escolha pendente ("qual das duas obras?"), com prazo.
//   assistente_acoes  ganha prazo (expira_em), a impressão do alvo no momento em que a ação foi
//                     preparada (hash do resumo + versão do registro: se mudar, a ação não executa)
//                     e, quando veio do canal, o código "SIM 4821" e o contato que pode confirmar.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS canal_mensagens (
      id SERIAL PRIMARY KEY,
      canal VARCHAR(12) NOT NULL CHECK (canal IN ('telegram', 'whatsapp', 'simulador')),
      id_externo VARCHAR(160) NOT NULL,
      remetente VARCHAR(64) NOT NULL,
      conversa VARCHAR(64) NOT NULL,
      nome_remetente VARCHAR(120),
      tipo VARCHAR(10) NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'audio', 'outro')),
      texto TEXT,
      midia JSONB,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      estado VARCHAR(12) NOT NULL DEFAULT 'recebida' CHECK (estado IN ('recebida', 'processando', 'respondida', 'erro', 'ignorada')),
      tentativas SMALLINT NOT NULL DEFAULT 0,
      proxima_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      iniciada_em TIMESTAMPTZ,
      resposta TEXT,
      enviada BOOLEAN NOT NULL DEFAULT false,
      via VARCHAR(20),
      erro TEXT,
      ip VARCHAR(64),
      recebida_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processada_em TIMESTAMPTZ,
      CONSTRAINT uq_canal_mensagens_externo UNIQUE (canal, id_externo)
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_canal_mensagens_fila ON canal_mensagens (proxima_em, id) WHERE estado IN ('recebida', 'processando')`);
  await client.query('CREATE INDEX IF NOT EXISTS idx_canal_mensagens_remetente ON canal_mensagens (canal, remetente, recebida_em DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_canal_mensagens_recebida ON canal_mensagens (recebida_em DESC)');

  await client.query(`
    CREATE TABLE IF NOT EXISTS canal_contatos (
      id SERIAL PRIMARY KEY,
      canal VARCHAR(12) NOT NULL CHECK (canal IN ('telegram', 'whatsapp', 'simulador')),
      id_externo VARCHAR(64) NOT NULL,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      conversa_id INTEGER REFERENCES assistente_conversas(id) ON DELETE SET NULL,
      escolha JSONB,
      codigos_errados SMALLINT NOT NULL DEFAULT 0,
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_canal_contatos UNIQUE (canal, id_externo)
    )
  `);

  await client.query('ALTER TABLE assistente_acoes ADD COLUMN IF NOT EXISTS expira_em TIMESTAMPTZ');
  await client.query('ALTER TABLE assistente_acoes ADD COLUMN IF NOT EXISTS impressao CHAR(64)');
  await client.query("ALTER TABLE assistente_acoes ADD COLUMN IF NOT EXISTS origem VARCHAR(12) NOT NULL DEFAULT 'web'");
  await client.query('ALTER TABLE assistente_acoes ADD COLUMN IF NOT EXISTS canal VARCHAR(12)');
  await client.query('ALTER TABLE assistente_acoes ADD COLUMN IF NOT EXISTS canal_id_externo VARCHAR(64)');
  await client.query('ALTER TABLE assistente_acoes ADD COLUMN IF NOT EXISTS codigo VARCHAR(8)');
  await client.query(`CREATE INDEX IF NOT EXISTS idx_assistente_acoes_canal ON assistente_acoes (canal, canal_id_externo, status) WHERE canal IS NOT NULL`);
};
