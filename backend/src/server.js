require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { tratarErros } = require('./middleware/erros');
const { criarTabelas } = require('./models/schema');
const { agendarRotinas } = require('./services/rotinas');
const { pedidoLocal } = require('./services/pastasRegistros');
const pool = require('./config/database');
const { version: VERSAO } = require('../package.json');

const app = express();
const PORT = process.env.PORT || 3001;
// As leituras automáticas (e-mail de notas, Pix e pasta de orçamentos de
// fornecedores, às 06:00 e 18:00) ficam em services/rotinas.js, com registro
// de cada execução para o painel de Integrações. Os botões "Verificar agora"
// das telas Materiais e Financeiro passam pelo mesmo registro.

// Middlewares
app.use(helmet({
  // CSP: o navegador só executa scripts do próprio sistema. Se algum texto
  // gravado (nome de cliente, descrição de material, conteúdo vindo de e-mail
  // ou de IA) conseguir virar HTML na tela, o script injetado não roda — e o
  // token de login, guardado no navegador, não vaza. O build não tem script
  // inline (frontend/.env.production: INLINE_RUNTIME_CHUNK=false).
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // 'unsafe-inline' em estilos: o react-hot-toast injeta <style>; estilo não executa código
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      // blob: = fotos do laudo e PDFs/CSV gerados abertos pelo navegador
      imgSrc: ["'self'", 'data:', 'blob:'],
      frameSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      connectSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      // sem upgrade-insecure-requests: o sistema roda em HTTP na rede local
    },
  },
}));

// Origens liberadas: configurável via CORS_ORIGINS no .env (separado por
// vírgula), com o valor de hoje (localhost + rede local) como padrão — só
// existe pra não precisar mexer em código quando o sistema sair do PC local
// pra uma VPS (ver README, seção 8.2).
const origensPadrao = ['http://localhost:3000', /^http:\/\/192\.168\.\d+\.\d+:3000$/];
const origensConfiguradas = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : null;
// Sem `credentials`: o login vai no cabeçalho Authorization (token no
// navegador), não em cookie — então nenhuma outra origem precisa enviar cookies.
app.use(cors({ origin: origensConfiguradas || origensPadrao }));

// Atrás de um proxy reverso (nginx numa VPS, por exemplo), toda requisição
// chega ao Express com o IP do proxy, não o do cliente real — sem isso, o
// rate limit (express-rate-limit, usado no login e nos endpoints de IA)
// contaria todo mundo como um único IP e bloquearia todo mundo junto no
// primeiro abuso. Em LAN local (o ambiente de hoje) isso fica desligado por
// padrão — só ativa definindo TRUST_PROXY no .env quando for pra produção.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);
}

// 5 MB: o maior corpo JSON real é o formulário do laudo (limitado a 2 MB no
// controller) ou uma análise grande; arquivos vêm por upload (multer), não aqui.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rotas
app.use('/api', routes);

// Health check: "ok" só se o banco responde (antes dizia ok com o banco fora).
// A versão só aparece para quem pede deste PC (o reiniciar-backend.bat a mostra).
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', banco: 'ok', ...(pedidoLocal(req) ? { versao: VERSAO } : {}) });
  } catch {
    res.status(503).json({ status: 'erro', banco: 'indisponível' });
  }
});

// Serve o build de produção do frontend, se existir (permite um único
// processo/porta em vez de precisar do "npm start" do React separado).
// FRONTEND_BUILD_DIR: só para uma instância de teste servir um build novo
// sem tocar no que está em produção
const buildFrontend = process.env.FRONTEND_BUILD_DIR || path.join(__dirname, '..', '..', 'frontend', 'build');
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
// Exceção síncrona não capturada é diferente: o processo pode ter ficado em
// estado inconsistente (transação pela metade, trava presa). Registra e sai —
// o iniciar-producao.ps1 sobe o backend de novo em alguns segundos.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Exceção não capturada — reiniciando:', err);
  process.exitCode = 1;
  encerrar('uncaughtException');
});

// Desligamento ordenado (Ctrl+C, reinício): para de aceitar conexões, deixa
// as requisições em andamento terminarem e fecha o pool do banco. Se travar,
// sai à força depois de 10 s.
let servidor = null;
let encerrando = false;
function encerrar(sinal) {
  if (encerrando) return;
  encerrando = true;
  console.log(`Encerrando o backend (${sinal})...`);
  setTimeout(() => process.exit(process.exitCode || 1), 10000).unref();
  const fecharBanco = () => pool.end().catch(() => {}).finally(() => process.exit(process.exitCode || 0));
  if (servidor) servidor.close(fecharBanco); else fecharBanco();
}
process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));

// Inicializar
// Na partida do Windows o backend pode subir antes do serviço do PostgreSQL:
// tenta o banco por até ~2 minutos antes de desistir.
async function aguardarBanco(tentativas = 24, intervaloMs = 5000) {
  for (let i = 1; ; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (i >= tentativas) throw err;
      console.warn(`Banco de dados ainda indisponível (${err.code || err.message}) — nova tentativa em ${intervaloMs / 1000}s (${i}/${tentativas})`);
      await new Promise(r => setTimeout(r, intervaloMs));
    }
  }
}

async function iniciar() {
  try {
    await aguardarBanco();
    await criarTabelas();
    servidor = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\nH&M Engenharia - API rodando na porta ${PORT}`);
      console.log(`Local:    http://localhost:${PORT}`);
      console.log(`Rede:     http://SEU_IP:${PORT}`);
      console.log(`Health:   http://localhost:${PORT}/health\n`);
      // instância de teste/homologação (ROTINAS_AUTOMATICAS=desligadas): não lê a
      // caixa de e-mail nem as pastas de fornecedores da produção
      agendarRotinas();
    });
  } catch (err) {
    console.error('Erro ao iniciar servidor:', err.message);
    process.exit(1);
  }
}

iniciar();
