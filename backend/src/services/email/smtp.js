const nodemailer = require('nodemailer');
const { credenciaisConfiguradas } = require('./imap');

function criarTransportador() {
  if (!credenciaisConfiguradas()) {
    throw new Error('Envio de e-mail não configurado (defina EMAIL_IMAP_USER e EMAIL_IMAP_APP_PASSWORD no .env)');
  }
  // Mesma conta/senha de app usada para ler a caixa de entrada — senhas de
  // app do Gmail valem tanto para IMAP quanto para SMTP. Servidor e porta vêm do
  // .env (EMAIL_SMTP_HOST/EMAIL_SMTP_PORT), como a leitura (EMAIL_IMAP_HOST):
  // se o provedor mudar, o envio não para. Padrão: Gmail, 465 (SSL direto);
  // em outra porta (ex.: 587) a conexão sobe com STARTTLS.
  const porta = Number(process.env.EMAIL_SMTP_PORT) || 465;
  return nodemailer.createTransport({
    host: (process.env.EMAIL_SMTP_HOST || '').trim() || 'smtp.gmail.com',
    port: porta,
    secure: porta === 465,
    auth: {
      user: process.env.EMAIL_IMAP_USER,
      pass: process.env.EMAIL_IMAP_APP_PASSWORD,
    },
  });
}

module.exports = { criarTransportador };
