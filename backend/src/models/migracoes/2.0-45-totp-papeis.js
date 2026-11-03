// Verificação em duas etapas (TOTP, RFC 6238) e papéis além de admin/user (Fase 6, itens 3 e 7 —
// 02/11/2026).
//   usuarios.totp_segredo            chave do aplicativo autenticador, CIFRADA (AES-256-GCM com a
//                                     TOTP_CHAVE_CIFRA do .env; services/totp.js)
//   usuarios.totp_segredo_pendente   chave gerada na ativação, até a pessoa confirmar com um código
//   usuarios.totp_ultimo_passo       último passo de 30 s aceito: o mesmo código não entra duas vezes
//   totp_recuperacao                 códigos de recuperação (uso único), guardados só como hash
// Papéis: 'financeiro' e 'tecnico' entram na regra do banco (ck_usuarios_role). O acesso das rotas que
// já existem não muda; o middleware exigePapel (middleware/auth.js) é que passa a poder usá-los.
module.exports = async (client) => {
  await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_ativo BOOLEAN NOT NULL DEFAULT false');
  await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_segredo TEXT');
  await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_segredo_pendente TEXT');
  await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_pendente_em TIMESTAMP');
  await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_ativado_em TIMESTAMP');
  await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_ultimo_passo BIGINT');

  await client.query(`
    CREATE TABLE IF NOT EXISTS totp_recuperacao (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      codigo_hash CHAR(64) NOT NULL,
      usado_em TIMESTAMP,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_totp_recuperacao_usuario ON totp_recuperacao (usuario_id)');

  // A regra antiga (schema.js) só aceitava admin/user. Troca pela nova uma vez; nas próximas partidas
  // a definição já contém 'tecnico' e nada acontece. NOT VALID + VALIDATE como em schema.js.
  await client.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_usuarios_role'
                  AND pg_get_constraintdef(oid) NOT LIKE '%tecnico%') THEN
        ALTER TABLE usuarios DROP CONSTRAINT ck_usuarios_role;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_usuarios_role') THEN
        ALTER TABLE usuarios ADD CONSTRAINT ck_usuarios_role
          CHECK (role IN ('admin', 'user', 'financeiro', 'tecnico')) NOT VALID;
        BEGIN
          ALTER TABLE usuarios VALIDATE CONSTRAINT ck_usuarios_role;
        EXCEPTION WHEN check_violation THEN
          RAISE WARNING 'Dados antigos fora da regra ck_usuarios_role: vale só para registros novos';
        END;
      END IF;
    END $$;
  `);
};
