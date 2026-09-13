const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { autenticar, admin } = require('../middleware/auth');
const { validarId } = require('../middleware/validarId');
const { exigirPosse } = require('../middleware/posse');

// Quem pode ALTERAR/APAGAR cada tipo de registro: o dono ou um administrador.
// Ver/listar continua livre para qualquer usuário autenticado.
const posseProposta = exigirPosse('propostas', {
  naoEncontrado: 'Proposta não encontrada.',
  semPermissao: 'Esta proposta foi criada por outro usuário. Peça a ele ou a um administrador para alterar.',
});
const posseAnalise = exigirPosse('analises_projeto', {
  naoEncontrado: 'Análise não encontrada.',
  semPermissao: 'Esta análise foi criada por outro usuário. Peça a ele ou a um administrador para alterar.',
});
const posseContrato = exigirPosse('contratos', {
  naoEncontrado: 'Contrato não encontrado.',
  semPermissao: 'Este contrato foi criado por outro usuário. Peça a ele ou a um administrador para alterar.',
});

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

// Limite de uso nos endpoints que chamam IA — sem isso, só o login tinha
// proteção. Cada pesquisa de mercado gasta cota do Gemini (ou dinheiro do
// Claude, no fallback); cada análise de projeto chama o Gemini por arquivo
// enviado. Um clique em loop (por engano ou não) pode estourar a cota do dia
// pra empresa inteira ou gerar custo. Limites generosos pro uso normal —
// aqui pra travar abuso, não pra atrapalhar o trabalho do dia a dia.
const limitePesquisaMercado = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas pesquisas de mercado em pouco tempo. Aguarde um pouco e tente novamente.' },
});
const limiteAnaliseProjeto = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas análises de projeto em pouco tempo. Aguarde um pouco e tente novamente.' },
});

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
const precosMOCtrl = require('../controllers/precosMaoDeObraController');

// ── AUTH ──────────────────────────────────────────────────────────────
router.post('/auth/login', limiteLogin, authCtrl.login);
router.post('/auth/senha', autenticar, authCtrl.alterarSenha);

// ── MATERIAIS ─────────────────────────────────────────────────────────
router.get('/materiais', autenticar, matCtrl.listar);
router.get('/materiais/categorias', autenticar, matCtrl.categorias);
router.post('/materiais', autenticar, matCtrl.criar);
router.put('/materiais/:id', autenticar, validarId, matCtrl.atualizar);
router.delete('/materiais/:id', autenticar, validarId, matCtrl.remover);
router.post('/materiais/importar', autenticar, matCtrl.importar);
router.post('/materiais/extrair-nota', autenticar, upload.single('arquivo'), matCtrl.extrairNota);

// ── CLIENTES ──────────────────────────────────────────────────────────
router.get('/clientes', autenticar, cliCtrl.listar);
router.post('/clientes', autenticar, cliCtrl.criar);
router.put('/clientes/:id', autenticar, validarId, cliCtrl.atualizar);
router.delete('/clientes/:id', autenticar, validarId, cliCtrl.remover);

// ── PROPOSTAS ─────────────────────────────────────────────────────────
router.get('/propostas', autenticar, propCtrl.listar);
router.get('/propostas/proximo-numero', autenticar, propCtrl.proximoNum);
router.get('/propostas/:id/pdf', autenticar, validarId, propCtrl.gerarPdf);
router.post('/propostas/:id/enviar-email', autenticar, validarId, propCtrl.enviarEmail);
router.get('/propostas/:id', autenticar, validarId, propCtrl.buscarUma);
router.post('/propostas', autenticar, propCtrl.criar);
router.put('/propostas/:id', autenticar, validarId, posseProposta, propCtrl.atualizar);
router.post('/propostas/:id/duplicar', autenticar, validarId, propCtrl.duplicar);
router.patch('/propostas/:id/status', autenticar, validarId, posseProposta, propCtrl.atualizarStatus);
router.delete('/propostas/:id', autenticar, validarId, posseProposta, propCtrl.remover);

// ── INTEGRAÇÕES ───────────────────────────────────────────────────────
router.get('/integracoes/email/status', autenticar, integCtrl.statusEmail);
router.post('/integracoes/email/verificar-agora', autenticar, integCtrl.verificarAgora);
router.get('/integracoes/email/historico', autenticar, integCtrl.historico);
router.get('/configuracoes/margem', autenticar, integCtrl.obterMargem);
router.put('/configuracoes/margem', autenticar, integCtrl.atualizarMargem);

// ── USUÁRIOS (admin) ─────────────────────────────────────────────────
router.get('/usuarios', autenticar, admin, usuCtrl.listar);
router.post('/usuarios', autenticar, admin, usuCtrl.criar);
router.put('/usuarios/:id', autenticar, validarId, admin, usuCtrl.atualizar);
router.post('/usuarios/:id/redefinir-senha', autenticar, validarId, admin, usuCtrl.redefinirSenha);
router.delete('/usuarios/:id', autenticar, validarId, admin, usuCtrl.remover);

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
router.get('/financeiro/movimentos', autenticar, admin, finCtrl.listar);
router.get('/financeiro/movimentos/csv', autenticar, admin, finCtrl.exportarCsv);
router.post('/financeiro/movimentos', autenticar, admin, finCtrl.criar);
router.put('/financeiro/movimentos/:id', autenticar, validarId, admin, finCtrl.atualizar);
router.patch('/financeiro/movimentos/:id/categorizar', autenticar, validarId, admin, finCtrl.categorizar);
router.delete('/financeiro/movimentos/:id', autenticar, validarId, admin, finCtrl.remover);
router.post('/financeiro/verificar-agora', autenticar, admin, finCtrl.verificarAgora);

// ── PRESTADORES DE SERVIÇOS ──────────────────────────────────────────────
router.get('/prestadores', autenticar, admin, prestCtrl.listar);
router.post('/prestadores', autenticar, admin, prestCtrl.criar);
router.put('/prestadores/:id', autenticar, validarId, admin, prestCtrl.atualizar);
router.delete('/prestadores/:id', autenticar, validarId, admin, prestCtrl.remover);

// ── CONTRATOS DE PRESTAÇÃO DE SERVIÇO ────────────────────────────────────
router.get('/contratos', autenticar, admin, contrCtrl.listar);
router.post('/contratos', autenticar, admin, contrCtrl.criar);
router.put('/contratos/:id', autenticar, validarId, admin, posseContrato, contrCtrl.atualizar);
router.get('/contratos/:id/pdf', autenticar, validarId, admin, contrCtrl.gerarPdf);
router.delete('/contratos/:id', autenticar, validarId, admin, posseContrato, contrCtrl.remover);

// ── ANÁLISE DE PROJETO (compatibilização) ────────────────────────────────
// Caminhos específicos antes do /:id genérico (mesma regra usada em /propostas)
router.get('/projetos/analises', autenticar, projCtrl.listar);
router.post('/projetos/analisar', autenticar, limiteAnaliseProjeto, upload.array('arquivos', 10), projCtrl.analisar);
router.get('/projetos/analises/:id/relatorio', autenticar, validarId, projCtrl.gerarRelatorio);
router.get('/projetos/analises/:id', autenticar, validarId, projCtrl.buscarUma);
router.put('/projetos/analises/:id', autenticar, validarId, posseAnalise, projCtrl.atualizar);
router.delete('/projetos/analises/:id', autenticar, validarId, posseAnalise, projCtrl.remover);
router.post('/projetos/analises/:id/gerar-orcamento', autenticar, validarId, posseAnalise, projCtrl.gerarOrcamento);

// ── PREÇOS DE REFERÊNCIA DE MÃO DE OBRA (admin) ──────────────────────────
// Tela de administração — a sugestão em si já vem embutida em cada serviço
// da Análise de Projeto (montarServicosPadrao lê a tabela direto), então só
// quem PODE EDITAR essa referência precisa dessas rotas.
router.get('/precos-mao-de-obra', autenticar, admin, precosMOCtrl.listar);
router.put('/precos-mao-de-obra', autenticar, admin, precosMOCtrl.atualizar);

// ── PESQUISA DE MERCADO (Gemini + busca real) ────────────────────────────
router.post('/pesquisa-mercado', autenticar, limitePesquisaMercado, pesqCtrl.pesquisar);

module.exports = router;
