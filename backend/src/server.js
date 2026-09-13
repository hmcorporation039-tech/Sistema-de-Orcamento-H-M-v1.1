require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { tratarErros } = require('./middleware/erros');
const { criarTabelas } = require('./models/schema');
const { credenciaisConfiguradas } = require('./utils/emailClient');
const { verificarCaixaDeEntrada } = require('./services/notaFiscalEmailService');
const { verificarPixNaCaixaDeEntrada } = require('./services/financeiroEmailService');
const { verificarPastaFornecedores, PASTAS_FORNECEDORES } = require('./services/cotacaoFornecedorService');

const app = express();
const PORT = process.env.PORT || 3001;
const VERIFICACOES_EMAIL_POR_DIA = 3;
const INTERVALO_VERIFICACAO_EMAIL_MS = (24 / VERIFICACOES_EMAIL_POR_DIA) * 60 * 60 * 1000;
const INTERVALO_VERIFICACAO_FORNECEDORES_MS = 15 * 60 * 1000;

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
  res.json({ status: 'ok', sistema: 'H&M Engenharia', versao: '1.5.0' });
});

// Serve o build de produção do frontend, se existir (permite um único
// processo/porta em vez de precisar do "npm start" do React separado).
const buildFrontend = path.join(__dirname, '..', '..', 'frontend', 'build');
if (fs.existsSync(buildFrontend)) {
  // index.html nunca pode ficar em cache: ele referencia os arquivos JS/CSS
  // com hash do build atual, e um index.html velho no navegador faz a
  // interface parecer "sem as mudanças" mesmo depois de recarregar a página.
  app.use(express.static(buildFrontend, { index: false }));
  app.get(/^(?!\/api|\/health).*/, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(buildFrontend, 'index.html'));
  });
}

// Middleware de erro — precisa vir DEPOIS de todas as rotas. Sem ele, erros de
// upload (multer) caíam no handler padrão do Express, que responde HTML com o
// stack trace completo, vazando o caminho de instalação do servidor.
app.use(tratarErros);

// Rede de segurança do processo. No Node 24, uma promise rejeitada sem
// tratamento encerra o processo por padrão — um pico no banco ou um
// browser.close() falhando derrubava o sistema inteiro e desconectava todos os
// usuários. Aqui registramos e seguimos em frente: um erro isolado numa
// requisição não pode tirar a API do ar.
process.on('unhandledRejection', (motivo) => {
  console.error('[unhandledRejection] Promise rejeitada sem tratamento:', motivo);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Exceção não capturada:', err);
});

function agendarVerificacaoDeEmail() {
  if (!credenciaisConfiguradas()) {
    console.log('Importação automática de notas por e-mail não configurada (veja EMAIL_IMAP_* no .env)');
    return;
  }

  const rodar = async () => {
    try {
      const resumo = await verificarCaixaDeEntrada();
      if (resumo.emailsProcessados > 0) {
        console.log(`E-mails verificados: ${resumo.emailsProcessados}/${resumo.emailsEncontrados} — ${resumo.materiaisCriados} materiais criados, ${resumo.materiaisAtualizados} atualizados`);
      }
      resumo.avisos.forEach(a => console.warn('Aviso:', a));
    } catch (err) {
      console.error('Erro na verificação automática de e-mail:', err.message);
    }
  };

  setTimeout(rodar, 10 * 1000);
  setInterval(rodar, INTERVALO_VERIFICACAO_EMAIL_MS);
  console.log(`Importação automática de notas por e-mail ativa (${VERIFICACOES_EMAIL_POR_DIA}x por dia, a cada ${INTERVALO_VERIFICACAO_EMAIL_MS / 3600000}h)`);
}

function agendarVerificacaoDePix() {
  if (!credenciaisConfiguradas()) return;

  const rodar = async () => {
    try {
      const resumo = await verificarPixNaCaixaDeEntrada();
      if (resumo.movimentosImportados > 0) {
        console.log(`Pix verificados: ${resumo.movimentosImportados}/${resumo.emailsEncontrados} movimentos importados`);
      }
      resumo.avisos.forEach(a => console.warn('Aviso (Pix):', a));
    } catch (err) {
      console.error('Erro na verificação automática de Pix:', err.message);
    }
  };

  setTimeout(rodar, 30 * 1000);
  setInterval(rodar, INTERVALO_VERIFICACAO_EMAIL_MS);
  console.log(`Controle financeiro de Pix por e-mail ativo (${VERIFICACOES_EMAIL_POR_DIA}x por dia, a cada ${INTERVALO_VERIFICACAO_EMAIL_MS / 3600000}h)`);
}

function agendarVerificacaoDePastaFornecedores() {
  const rodar = async () => {
    try {
      const resumo = await verificarPastaFornecedores();
      if (resumo.arquivosProcessados > 0) {
        console.log(`Orçamentos de fornecedores verificados: ${resumo.arquivosProcessados}/${resumo.arquivosEncontrados} arquivos — ${resumo.materiaisCriados} materiais criados, ${resumo.materiaisAtualizados} atualizados`);
      }
      resumo.avisos.forEach(a => console.warn('Aviso (orçamentos de fornecedores):', a));
    } catch (err) {
      console.error('Erro na verificação da pasta de orçamentos de fornecedores:', err.message);
    }
  };

  setTimeout(rodar, 15 * 1000);
  setInterval(rodar, INTERVALO_VERIFICACAO_FORNECEDORES_MS);
  console.log(`Leitura automática de orçamentos de fornecedores ativa (a cada ${INTERVALO_VERIFICACAO_FORNECEDORES_MS / 60000}min) — pastas: ${PASTAS_FORNECEDORES.join(' | ')}`);
}

// Inicializar
async function iniciar() {
  try {
    await criarTabelas();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\nH&M Engenharia - API rodando na porta ${PORT}`);
      console.log(`Local:    http://localhost:${PORT}`);
      console.log(`Rede:     http://SEU_IP:${PORT}`);
      console.log(`Health:   http://localhost:${PORT}/health\n`);
      agendarVerificacaoDeEmail();
      agendarVerificacaoDePix();
      agendarVerificacaoDePastaFornecedores();
    });
  } catch (err) {
    console.error('Erro ao iniciar servidor:', err.message);
    process.exit(1);
  }
}

iniciar();
