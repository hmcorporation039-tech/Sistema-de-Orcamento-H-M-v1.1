require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { criarTabelas } = require('./models/schema');
const { credenciaisConfiguradas } = require('./utils/emailClient');
const { verificarCaixaDeEntrada } = require('./services/notaFiscalEmailService');

const app = express();
const PORT = process.env.PORT || 3001;
const INTERVALO_VERIFICACAO_EMAIL_MS = 15 * 60 * 1000;

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', /^http:\/\/192\.168\.\d+\.\d+:3000$/],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', sistema: 'H&M Engenharia', versao: '1.0.0' });
});

function agendarVerificacaoDeEmail() {
  if (!credenciaisConfiguradas()) {
    console.log('ℹ️  Importação automática de notas por e-mail não configurada (veja EMAIL_IMAP_* no .env)');
    return;
  }

  const rodar = async () => {
    try {
      const resumo = await verificarCaixaDeEntrada();
      if (resumo.emailsProcessados > 0) {
        console.log(`📧 E-mails verificados: ${resumo.emailsProcessados}/${resumo.emailsEncontrados} — ${resumo.materiaisCriados} materiais criados, ${resumo.materiaisAtualizados} atualizados`);
      }
      resumo.avisos.forEach(a => console.warn('📧 Aviso:', a));
    } catch (err) {
      console.error('❌ Erro na verificação automática de e-mail:', err.message);
    }
  };

  setTimeout(rodar, 10 * 1000);
  setInterval(rodar, INTERVALO_VERIFICACAO_EMAIL_MS);
  console.log(`📧 Importação automática de notas por e-mail ativa (a cada ${INTERVALO_VERIFICACAO_EMAIL_MS / 60000} min)`);
}

// Inicializar
async function iniciar() {
  try {
    await criarTabelas();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 H&M Engenharia - API rodando na porta ${PORT}`);
      console.log(`📡 Local:    http://localhost:${PORT}`);
      console.log(`🌐 Rede:     http://SEU_IP:${PORT}`);
      console.log(`❤️  Health:   http://localhost:${PORT}/health\n`);
      agendarVerificacaoDeEmail();
    });
  } catch (err) {
    console.error('❌ Erro ao iniciar servidor:', err.message);
    process.exit(1);
  }
}

iniciar();
