// Sessões revogáveis (Fase 6, "antes de abrir para fora", item 2 — 02/11/2026).
// Antes o login devolvia um token de 8 h que não tinha como ser cancelado: sair só apagava o token do
// navegador, e um token copiado continuava valendo até vencer. Agora o login abre uma SESSÃO por
// dispositivo: o token de acesso é curto (SESSAO_TOKEN_MINUTOS, 15 min) e é renovado pela chave de
// renovação da sessão, que o servidor guarda só como hash (SHA-256). Sair, "encerrar as outras sessões"
// e desativar o usuário revogam a sessão, e o token de acesso dela para de valer na hora.
//   renovacao_hash           hash da chave de renovação atual (troca a cada renovação)
//   renovacao_anterior_hash  a chave anterior, aceita por 60 s (duas abas renovando juntas)
//   expira_em                prazo máximo da sessão (SESSAO_MAXIMA_DIAS), mesmo com uso contínuo
//   motivo_revogacao         'saiu' | 'encerrada' | 'outras' | 'senha' | 'desativado' | 'substituida' | 'reuso'
// Auditoria de acesso: reaproveita a tabela `auditoria` (entidade = 'acesso'), com a origem do pedido
// ('web' | 'telegram' | 'whatsapp' | 'mcp') e o IP.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS sessoes (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      dispositivo_id VARCHAR(64),
      dispositivo VARCHAR(200),
      ip VARCHAR(64),
      origem VARCHAR(20) NOT NULL DEFAULT 'web',
      renovacao_hash CHAR(64) NOT NULL,
      renovacao_anterior_hash CHAR(64),
      renovada_em TIMESTAMP,
      criada_em TIMESTAMP NOT NULL DEFAULT NOW(),
      ultimo_uso_em TIMESTAMP NOT NULL DEFAULT NOW(),
      expira_em TIMESTAMP NOT NULL,
      revogada_em TIMESTAMP,
      motivo_revogacao VARCHAR(40)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes (usuario_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_sessoes_usuario_dispositivo ON sessoes (usuario_id, dispositivo_id)');

  await client.query('ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS origem VARCHAR(20)');
  await client.query('ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS ip VARCHAR(64)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_auditoria_criado ON auditoria (criado_em DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria (usuario_id, criado_em DESC)');
};
