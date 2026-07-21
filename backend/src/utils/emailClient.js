const { ImapFlow } = require('imapflow');

function credenciaisConfiguradas() {
  return Boolean(
    process.env.EMAIL_IMAP_HOST &&
    process.env.EMAIL_IMAP_USER &&
    process.env.EMAIL_IMAP_APP_PASSWORD
  );
}

async function conectar() {
  if (!credenciaisConfiguradas()) {
    throw new Error('Integração de e-mail não configurada (defina EMAIL_IMAP_HOST, EMAIL_IMAP_USER e EMAIL_IMAP_APP_PASSWORD no .env)');
  }

  const client = new ImapFlow({
    host: process.env.EMAIL_IMAP_HOST,
    port: Number(process.env.EMAIL_IMAP_PORT) || 993,
    secure: true,
    auth: {
      user: process.env.EMAIL_IMAP_USER,
      pass: process.env.EMAIL_IMAP_APP_PASSWORD,
    },
    logger: false,
  });

  await client.connect();
  return client;
}

module.exports = { conectar, credenciaisConfiguradas };
