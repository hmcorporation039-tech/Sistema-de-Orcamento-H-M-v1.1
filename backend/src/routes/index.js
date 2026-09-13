const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { autenticar, admin } = require('../middleware/auth');

// Limite de tentativas de login: sem isso, um atacante na rede local pode
// testar milhares de senhas por minuto contra /auth/login (o bcrypt sozinho
// não segura força bruta).
//
// Calibragem pensada para uso interno: 20 erros em 10 minutos. Força bruta
// real precisa de milhares de tentativas — 120/hora inviabiliza o ataque —
// enquanto quem simplesmente errou a senha algumas vezes não fica trancado
// fora do próprio sistema. `skipSuccessfulRequests` faz o acerto não contar,
// então o contador só sobe com erro de verdade.
const limiteLogin = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login sem sucesso. Aguarde 10 minutos e tente novamente.' },
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const authCtrl = require('../controllers/authController');
const matCtrl = require('../controllers/materiaisController');
const cliCtrl = require('../controllers/clientesController');
const propCtrl = require('../controllers/propostasController');
const integCtrl = require('../controllers/integracoesController');
const usuCtrl = require('../controllers/usuariosController');
const dashCtrl = require('../controllers/dashboardController');
const relCtrl = require('../controllers/relatoriosController');
const finCtrl = require('../controllers/financeiroController');
const prestCtrl = require('../controllers/prestadoresController');
const contrCtrl = require('../controllers/contratosController');
const projCtrl = require('../controllers/projetosController');
const pesqCtrl = require('../controllers/pesquisaMercadoController');

// ── AUTH ──────────────────────────────────────────────────────────────
router.post('/auth/login', limiteLogin, authCtrl.login);
router.post('/auth/senha', autenticar, authCtrl.alterarSenha);

// ── MATERIAIS ─────────────────────────────────────────────────────────
router.get('/materiais', autenticar, matCtrl.listar);
router.get('/materiais/categorias', autenticar, matCtrl.categorias);
router.post('/materiais', autenticar, matCtrl.criar);
router.put('/materiais/:id', autenticar, matCtrl.atualizar);
router.delete('/materiais/:id', autenticar, matCtrl.remover);
router.post('/materiais/importar', autenticar, matCtrl.importar);
router.post('/materiais/extrair-nota', autenticar, upload.single('arquivo'), matCtrl.extrairNota);

// ── CLIENTES ──────────────────────────────────────────────────────────
router.get('/clientes', autenticar, cliCtrl.listar);
router.post('/clientes', autenticar, cliCtrl.criar);
router.put('/clientes/:id', autenticar, cliCtrl.atualizar);
router.delete('/clientes/:id', autenticar, cliCtrl.remover);

// ── PROPOSTAS ─────────────────────────────────────────────────────────
router.get('/propostas', autenticar, propCtrl.listar);
router.get('/propostas/proximo-numero', autenticar, propCtrl.proximoNum);
router.get('/propostas/:id/pdf', autenticar, propCtrl.gerarPdf);
router.post('/propostas/:id/enviar-email', autenticar, propCtrl.enviarEmail);
router.get('/propostas/:id', autenticar, propCtrl.buscarUma);
router.post('/propostas', autenticar, propCtrl.criar);
router.put('/propostas/:id', autenticar, propCtrl.atualizar);
router.post('/propostas/:id/duplicar', autenticar, propCtrl.duplicar);
router.patch('/propostas/:id/status', autenticar, propCtrl.atualizarStatus);
router.delete('/propostas/:id', autenticar, propCtrl.remover);

// ── INTEGRAÇÕES ───────────────────────────────────────────────────────
router.get('/integracoes/email/status', autenticar, integCtrl.statusEmail);
router.post('/integracoes/email/verificar-agora', autenticar, integCtrl.verificarAgora);
router.get('/integracoes/email/historico', autenticar, integCtrl.historico);
router.get('/configuracoes/margem', autenticar, integCtrl.obterMargem);
router.put('/configuracoes/margem', autenticar, integCtrl.atualizarMargem);

// ── USUÁRIOS (admin) ─────────────────────────────────────────────────
router.get('/usuarios', autenticar, admin, usuCtrl.listar);
router.post('/usuarios', autenticar, admin, usuCtrl.criar);
router.put('/usuarios/:id', autenticar, admin, usuCtrl.atualizar);
router.post('/usuarios/:id/redefinir-senha', autenticar, admin, usuCtrl.redefinirSenha);
router.delete('/usuarios/:id', autenticar, admin, usuCtrl.remover);

// ── DASHBOARD ─────────────────────────────────────────────────────────
router.get('/dashboard/resumo', autenticar, dashCtrl.resumo);
router.get('/dashboard/por-mes', autenticar, dashCtrl.porMes);
router.get('/dashboard/top-clientes', autenticar, dashCtrl.topClientes);
router.get('/dashboard/top-materiais', autenticar, dashCtrl.topMateriais);
router.get('/dashboard/ultimas-propostas', autenticar, dashCtrl.ultimasPropostas);

// ── RELATÓRIOS ────────────────────────────────────────────────────────
router.get('/relatorios/propostas', autenticar, relCtrl.listar);
router.get('/relatorios/propostas/csv', autenticar, relCtrl.exportarCsv);
router.get('/relatorios/propostas/pdf', autenticar, relCtrl.exportarPdf);

// ── FINANCEIRO ────────────────────────────────────────────────────────
router.get('/financeiro/movimentos', autenticar, finCtrl.listar);
router.get('/financeiro/movimentos/csv', autenticar, finCtrl.exportarCsv);
router.post('/financeiro/movimentos', autenticar, finCtrl.criar);
router.put('/financeiro/movimentos/:id', autenticar, finCtrl.atualizar);
router.patch('/financeiro/movimentos/:id/categorizar', autenticar, finCtrl.categorizar);
router.delete('/financeiro/movimentos/:id', autenticar, finCtrl.remover);
router.post('/financeiro/verificar-agora', autenticar, finCtrl.verificarAgora);

// ── PRESTADORES DE SERVIÇOS ──────────────────────────────────────────────
router.get('/prestadores', autenticar, prestCtrl.listar);
router.post('/prestadores', autenticar, prestCtrl.criar);
router.put('/prestadores/:id', autenticar, prestCtrl.atualizar);
router.delete('/prestadores/:id', autenticar, prestCtrl.remover);

// ── CONTRATOS DE PRESTAÇÃO DE SERVIÇO ────────────────────────────────────
router.get('/contratos', autenticar, contrCtrl.listar);
router.post('/contratos', autenticar, contrCtrl.criar);
router.put('/contratos/:id', autenticar, contrCtrl.atualizar);
router.get('/contratos/:id/pdf', autenticar, contrCtrl.gerarPdf);
router.delete('/contratos/:id', autenticar, contrCtrl.remover);

// ── ANÁLISE DE PROJETO (compatibilização) ────────────────────────────────
// Caminhos específicos antes do /:id genérico (mesma regra usada em /propostas)
router.get('/projetos/analises', autenticar, projCtrl.listar);
router.post('/projetos/analisar', autenticar, upload.array('arquivos', 10), projCtrl.analisar);
router.get('/projetos/analises/:id/relatorio', autenticar, projCtrl.gerarRelatorio);
router.get('/projetos/analises/:id', autenticar, projCtrl.buscarUma);
router.put('/projetos/analises/:id', autenticar, projCtrl.atualizar);
router.delete('/projetos/analises/:id', autenticar, projCtrl.remover);

// ── PESQUISA DE MERCADO (Gemini + busca real) ────────────────────────────
router.post('/pesquisa-mercado', autenticar, pesqCtrl.pesquisar);

module.exports = router;
