// Monitor de saúde do sistema: consulta o /health e avisa por e-mail se ficar fora do ar (services/monitorSaude.js).
// Roda uma vez e sai; o Agendador de Tarefas chama a cada 5 minutos (registrar-monitor-saude.bat).
//   .env (opcional): ALERTA_EMAIL (destinatários, vírgula; padrão: o próprio EMAIL_IMAP_USER), PORT (padrão 3001)
// O estado (quantas falhas seguidas, se já avisou) fica em backend/logs/saude-estado.json.
require('../src/config/env');
const fs = require('fs');
const path = require('path');
const monitor = require('../src/services/monitorSaude');

const PASTA_LOGS = path.join(__dirname, '..', 'logs');
const ARQUIVO_ESTADO = path.join(PASTA_LOGS, 'saude-estado.json');
const URL = process.env.MONITOR_URL || `http://127.0.0.1:${process.env.PORT || 3001}/health`;

const lerEstado = () => { try { return JSON.parse(fs.readFileSync(ARQUIVO_ESTADO, 'utf8')); } catch { return null; } };
const gravarEstado = (e) => { fs.mkdirSync(PASTA_LOGS, { recursive: true }); fs.writeFileSync(ARQUIVO_ESTADO, JSON.stringify(e)); };
const registrar = (t) => { try { fs.appendFileSync(path.join(PASTA_LOGS, 'saude.log'), `${new Date().toISOString()} ${t}\n`); } catch { /* sem log */ } };

(async () => {
  const r = await monitor.consultar(URL);
  const antes = lerEstado();
  const { estado, acao } = monitor.avaliar(antes, r.ok);
  if (!r.ok) registrar(`falha ${estado.falhas}: ${r.motivo}`);
  if (acao) {
    const { assunto, texto } = monitor.mensagem(acao, { desde: antes?.desde || estado.desde, motivo: r.motivo, url: URL });
    try {
      const para = process.env.ALERTA_EMAIL || process.env.EMAIL_IMAP_USER;
      if (!para) throw new Error('sem destinatário (defina ALERTA_EMAIL ou EMAIL_IMAP_USER no .env)');
      await require('../src/services/email/smtp').criarTransportador().sendMail({
        from: `"Monitor H&M" <${process.env.EMAIL_IMAP_USER}>`, to: para, subject: assunto, text: texto,
      });
      registrar(`aviso "${acao}" enviado para ${para}`);
    } catch (e) {
      // sem e-mail não adianta marcar como avisado: a próxima rodada tenta de novo
      registrar(`aviso "${acao}" NÃO enviado: ${e.message}`);
      if (acao === 'queda') estado.alertado = false;
    }
  }
  gravarEstado(estado);
})().catch((e) => { registrar(`erro no monitor: ${e.message}`); process.exit(1); });
