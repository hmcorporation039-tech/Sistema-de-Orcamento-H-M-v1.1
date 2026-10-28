// Leitura de e-mail sem repetir (revisão de 27/10/2026). A rotina de Pix agora
// confere o ID da transação antes de lançar um "Pix realizado" (o mesmo
// pagamento em dois e-mails não vira dois lançamentos): índice para essa
// consulta. Não é UNIQUE de propósito — lançamentos antigos repetidos, se
// existirem, não podem impedir a migração; a regra fica no serviço.
// A chave das mensagens mudou do UID do IMAP para X-GM-MSGID/Message-ID
// (services/conexaoEmail.js) sem coluna nova: emails_processados.message_id e
// financeiro_movimentos.email_message_id já são VARCHAR(998).
module.exports = async (client) => {
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_financeiro_movimentos_id_transacao
      ON financeiro_movimentos (id_transacao) WHERE id_transacao IS NOT NULL
  `);
};
