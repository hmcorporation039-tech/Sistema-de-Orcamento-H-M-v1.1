const nodemailer = require('nodemailer');
const { credenciaisConfiguradas } = require('./emailClient');

function criarTransportador() {
  if (!credenciaisConfiguradas()) {
    throw new Error('Envio de e-mail não configurado (defina EMAIL_IMAP_USER e EMAIL_IMAP_APP_PASSWORD no .env)');
  }
  // Mesma conta/senha de app usada para ler a caixa de entrada — senhas de
  // app do Gmail valem tanto para IMAP quanto para SMTP.
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_IMAP_USER,
      pass: process.env.EMAIL_IMAP_APP_PASSWORD,
    },
  });
}

module.exports = { criarTransportador };
