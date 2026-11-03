// Telefone e chat verificados (Fase 6, item 4 — 02/11/2026). O canal remoto (Telegram/WhatsApp) só
// atende quem ligou o próprio chat ou telefone ao usuário, com um código de uso único gerado na tela
// "Minha conta" e enviado pelo próprio canal ("/vincular 123456"). services/telefonesVerificados.js.
//   canal_vinculos         chat_id do Telegram ou telefone E.164 do WhatsApp ligado a um usuário.
//                          Um id externo ativo pertence a um usuário só (índice único parcial).
//   canal_codigos_vinculo  código de 6 dígitos (só o hash), com prazo curto e uso único
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS canal_vinculos (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      canal VARCHAR(20) NOT NULL CHECK (canal IN ('telegram', 'whatsapp')),
      id_externo VARCHAR(64) NOT NULL,
      verificado_em TIMESTAMP,
      ativo BOOLEAN NOT NULL DEFAULT true,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      removido_em TIMESTAMP
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_canal_vinculos_usuario ON canal_vinculos (usuario_id)');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS ux_canal_vinculos_ativo ON canal_vinculos (canal, id_externo) WHERE ativo');

  await client.query(`
    CREATE TABLE IF NOT EXISTS canal_codigos_vinculo (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      canal VARCHAR(20) NOT NULL CHECK (canal IN ('telegram', 'whatsapp')),
      codigo_hash CHAR(64) NOT NULL,
      expira_em TIMESTAMP NOT NULL,
      usado_em TIMESTAMP,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_canal_codigos_usuario ON canal_codigos_vinculo (usuario_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_canal_codigos_hash ON canal_codigos_vinculo (canal, codigo_hash)');
};
