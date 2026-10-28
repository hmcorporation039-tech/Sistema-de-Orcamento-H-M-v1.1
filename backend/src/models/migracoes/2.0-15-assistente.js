// Assistente virtual (versão 2.x, primeira versão — pedido do usuário de
// 27/10/2026): conversa com o Claude (assinatura Max, `claude -p`) que lê
// arquivos e mexe no sistema pelas ferramentas do MCP do assistente
// (src/mcp/assistenteMcp.mjs). Regras em services/assistente/*.
//
// assistente_conversas  uma por assunto; `session_id` = sessão do Claude Code
//                       retomada a cada mensagem (--resume); `contexto` = tela
//                       aberta na última mensagem (obra/proposta/análise/rota).
// assistente_mensagens  o que o usuário escreveu e o que o assistente respondeu,
//                       com os passos (ferramentas chamadas, com argumentos e
//                       resultado resumido), os registros criados e o erro.
// assistente_arquivos   arquivos anexados (gravados na pasta do sistema, em
//                       Assistente\<conversa>); as ferramentas recebem o ID,
//                       nunca um caminho vindo do modelo.
// assistente_acoes      ações que o assistente NÃO faz sozinho (aprovar, enviar
//                       e-mail, excluir, alterar o que não criou, mudar preço do
//                       catálogo…): ficam pendentes até o usuário clicar
//                       "Aplicar" (executa com o login dele) ou "Descartar".
//
// `assistente_conversa_id` em propostas, analises_projeto e laudos_projetos:
// marca o que o assistente criou (e em qual conversa). É o que o servidor
// confere antes de deixar o assistente ALTERAR um registro: só o que ele criou
// naquela conversa (middleware/escopoAssistente.js). ON DELETE SET NULL: apagar
// a conversa não apaga a proposta, só a marca.
//
// Guarda: 12 meses (rotina de limpeza opcional, desligada — ASSISTENTE_LIMPEZA).
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS assistente_conversas (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      titulo VARCHAR(200) NOT NULL DEFAULT 'Nova conversa',
      contexto JSONB NOT NULL DEFAULT '{}'::jsonb,
      session_id UUID,
      sessao_iniciada BOOLEAN NOT NULL DEFAULT false,
      arquivada BOOLEAN NOT NULL DEFAULT false,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_assistente_conversas_usuario ON assistente_conversas(usuario_id, arquivada, atualizado_em DESC)');

  await client.query(`
    CREATE TABLE IF NOT EXISTS assistente_mensagens (
      id SERIAL PRIMARY KEY,
      conversa_id INTEGER NOT NULL REFERENCES assistente_conversas(id) ON DELETE CASCADE,
      papel VARCHAR(12) NOT NULL CHECK (papel IN ('usuario', 'assistente')),
      texto TEXT NOT NULL DEFAULT '',
      passos JSONB NOT NULL DEFAULT '[]'::jsonb,
      criados JSONB NOT NULL DEFAULT '[]'::jsonb,
      contexto JSONB,
      arquivos JSONB NOT NULL DEFAULT '[]'::jsonb,
      status VARCHAR(12) NOT NULL DEFAULT 'concluida' CHECK (status IN ('fila', 'executando', 'concluida', 'erro', 'cancelada')),
      erro TEXT,
      tempo_ms INTEGER,
      provedor VARCHAR(20),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_assistente_mensagens_conversa ON assistente_mensagens(conversa_id, id)');

  await client.query(`
    CREATE TABLE IF NOT EXISTS assistente_arquivos (
      id SERIAL PRIMARY KEY,
      conversa_id INTEGER NOT NULL REFERENCES assistente_conversas(id) ON DELETE CASCADE,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      nome_original VARCHAR(255) NOT NULL,
      nome_arquivo VARCHAR(255) NOT NULL,
      tipo VARCHAR(10) NOT NULL,
      mime VARCHAR(100),
      tamanho INTEGER NOT NULL,
      sha256 CHAR(64),
      resumo JSONB,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_assistente_arquivos_conversa ON assistente_arquivos(conversa_id)');

  await client.query(`
    CREATE TABLE IF NOT EXISTS assistente_acoes (
      id SERIAL PRIMARY KEY,
      conversa_id INTEGER NOT NULL REFERENCES assistente_conversas(id) ON DELETE CASCADE,
      mensagem_id INTEGER REFERENCES assistente_mensagens(id) ON DELETE SET NULL,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      tipo VARCHAR(40) NOT NULL,
      alvo_tipo VARCHAR(20),
      alvo_id INTEGER,
      descricao TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status VARCHAR(12) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aplicada', 'descartada', 'falhou')),
      resultado JSONB,
      decidido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      decidido_em TIMESTAMPTZ,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_assistente_acoes_conversa ON assistente_acoes(conversa_id, status)');

  // o que o assistente criou (e em que conversa)
  for (const tabela of ['propostas', 'analises_projeto', 'laudos_projetos']) {
    await client.query(`ALTER TABLE ${tabela} ADD COLUMN IF NOT EXISTS assistente_conversa_id INTEGER`);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_${tabela}_assistente_conversa') THEN
          ALTER TABLE ${tabela} ADD CONSTRAINT fk_${tabela}_assistente_conversa
            FOREIGN KEY (assistente_conversa_id) REFERENCES assistente_conversas(id) ON DELETE SET NULL;
        END IF;
      END $$`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_${tabela}_assistente_conversa ON ${tabela}(assistente_conversa_id) WHERE assistente_conversa_id IS NOT NULL`);
  }
};
