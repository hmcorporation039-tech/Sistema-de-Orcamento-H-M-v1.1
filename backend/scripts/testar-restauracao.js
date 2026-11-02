// Teste de restauração do backup (services/testeRestauracao.js). Roda uma vez e sai; o Agendador de Tarefas chama
// todo mês (registrar-teste-restauracao.bat). Restaura o dump mais novo (de preferência o da cópia fora do prédio)
// num banco temporário, confere com o banco em uso e apaga o temporário. O banco em uso só é lido.
//   .env: BACKUP_DESTINO_EXTERNO (pasta da cópia fora do prédio), ALERTA_EMAIL (padrão: o EMAIL_IMAP_USER)
//   --sem-email   não envia o e-mail (para rodar à mão)
require('../src/config/env');
const path = require('path');
const { Client } = require('pg');
const backup = require('../src/services/backup');
const teste = require('../src/services/testeRestauracao');

const conectar = async (banco) => {
  const c = new Client({
    host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, database: banco,
    user: process.env.DB_USER || 'postgres', password: process.env.DB_PASS || '',
    statement_timeout: 120000,
  });
  await c.connect();
  return c;
};

(async () => {
  const cfg = backup.configuracao(process.env);
  const dump = teste.escolherDump({
    banco: cfg.banco,
    pastaLocal: path.join(__dirname, '..', 'backups'),
    pastaExterna: cfg.externo,
  });
  console.log(dump ? `Testando ${dump.nome} (${dump.origem})...` : 'Nenhum backup encontrado.');
  const r = await teste.testar({ env: process.env, dump, conectar });
  teste.gravarResultado(r);
  console.log(r.ok ? `OK: ${r.tabelas} tabelas restauradas em ${r.duracaoS} s.` : `FALHOU: ${r.problemas.join('; ')}`);
  if (r.avisos && r.avisos.length) console.log(`Observações: ${r.avisos.join('; ')}`);

  if (!process.argv.includes('--sem-email')) {
    try {
      const para = process.env.ALERTA_EMAIL || process.env.EMAIL_IMAP_USER;
      if (!para) throw new Error('sem destinatário (defina ALERTA_EMAIL ou EMAIL_IMAP_USER no .env)');
      const { assunto, texto } = teste.mensagem(r);
      await require('../src/services/email/smtp').criarTransportador().sendMail({
        from: `"Monitor H&M" <${process.env.EMAIL_IMAP_USER}>`, to: para, subject: assunto, text: texto,
      });
      console.log(`E-mail enviado para ${para}.`);
    } catch (e) { console.log(`E-mail NÃO enviado: ${e.message}`); }
  }
  process.exit(r.ok ? 0 : 1);
})().catch((e) => { console.error(`erro no teste de restauração: ${e.message}`); process.exit(2); });
