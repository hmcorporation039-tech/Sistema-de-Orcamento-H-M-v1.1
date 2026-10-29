const express = require('express');
// uploads com o limite da rota na mensagem de erro (utils/upload.js)
const { criarUpload, multer } = require('../utils/upload');
const rateLimit = require('express-rate-limit');
const { protegerRotasAsync } = require('../middleware/erros');
// toda rota (inclusive as de routes/v2) com asyncHandler: erro fora do try de
// um controller vira resposta de erro, não pedido pendurado
const router = protegerRotasAsync(express.Router());
const { autenticar, admin } = require('../middleware/auth');
const { validarId } = require('../middleware/validarId');
const { exigirPosse, posse } = require('../middleware/posse');

// Quem pode ALTERAR/APAGAR cada tipo de registro: o dono ou um administrador.
// Ver/listar continua livre para qualquer usuário autenticado. Regras prontas
// em middleware/posse.js (as mesmas nas rotas v2).
const { proposta: posseProposta, analise: posseAnalise, laudo: posseLaudo, contrato: posseContrato } = posse;

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

// Projetos: só PDF — conferido no controller pelos bytes iniciais "%PDF", com
// mensagem clara (um filtro aqui descartaria o arquivo calado)
// 2.3: a análise também recebe DWG/DXF de projeto — DXF de prancha passa fácil de 15 MB
const upload = criarUpload({ storage: multer.memoryStorage(), limits: { fileSize: 40 * 1024 * 1024, files: 10 } });
// Nota fiscal: PDF (DANFE) ou XML (NF-e)
const uploadNota = criarUpload({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /\.(pdf|xml)$/i.test(file.originalname || '')),
});

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
// Limite por CONTA (além do limite por IP): impede tentar senhas de uma
// mesma conta a partir de vários computadores.
const limiteLoginConta = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `conta:${String(req.body?.email || '').trim().toLowerCase()}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login nesta conta. Aguarde 15 minutos e tente novamente.' },
});
// Envio de proposta por e-mail sai da caixa da empresa: limite por usuário.
const limiteEnvioEmail = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => `usuario:${req.usuario?.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitos e-mails enviados em pouco tempo. Aguarde um pouco e tente novamente.' },
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
const maoObraCtrl = require('../controllers/maoDeObraController');
const laudoCtrl = require('../controllers/laudosController');

// Fotos de inspeção: JPG/PNG, até 20 por envio, 15 MB cada (o conteúdo é conferido no controller pelos bytes iniciais)
const uploadFotos = criarUpload({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 20 } });
// Arquitetura do projeto/análise (planta e 3D): DWG, DXF ou PDF vetorial até 40 MB;
// o conteúdo é conferido na leitura (services/tarefasCad). Uma só para todas as rotas (v2 inclusive).
const uploadArquitetura = criarUpload({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /\.(dxf|dwg|pdf)$/i.test(file.originalname || '')),
});

// ── AUTH ──────────────────────────────────────────────────────────────
router.post('/auth/login', limiteLogin, limiteLoginConta, authCtrl.login);
router.post('/auth/senha', autenticar, authCtrl.alterarSenha);

// ── MATERIAIS ─────────────────────────────────────────────────────────
router.get('/materiais', autenticar, matCtrl.listar);
router.get('/materiais/categorias', autenticar, matCtrl.categorias);
router.post('/materiais', autenticar, matCtrl.criar);
router.put('/materiais/:id', autenticar, validarId, matCtrl.atualizar);
// apagar some com o material do catálogo de todos (e das sugestões de preço):
// só administrador; criar e editar continuam livres para quem está logado
router.delete('/materiais/:id', autenticar, validarId, admin, matCtrl.remover);
router.post('/materiais/importar', autenticar, matCtrl.importar);
router.post('/materiais/extrair-nota', autenticar, uploadNota.single('arquivo'), matCtrl.extrairNota);
router.post('/materiais/comparar', autenticar, matCtrl.comparar);
router.post('/materiais/fornecedores/verificar-agora', autenticar, matCtrl.verificarFornecedoresAgora);

// ── MÃO DE OBRA (catálogo de itens já lançados em propostas, usado como
// sugestão em dropdown — diferente de /precos-mao-de-obra, que é a tabela de
// preços de referência da Análise de Projeto) ───────────────────────────
router.get('/mao-de-obra-itens', autenticar, maoObraCtrl.listar);

// ── CLIENTES ──────────────────────────────────────────────────────────
router.get('/clientes', autenticar, cliCtrl.listar);
router.post('/clientes', autenticar, cliCtrl.criar);
router.put('/clientes/:id', autenticar, validarId, cliCtrl.atualizar);
// o cliente é compartilhado por propostas e obras de todos: apagar, só administrador
router.delete('/clientes/:id', autenticar, validarId, admin, cliCtrl.remover);

// ── PROPOSTAS ─────────────────────────────────────────────────────────
router.get('/propostas', autenticar, propCtrl.listar);
router.get('/propostas/proximo-numero', autenticar, propCtrl.proximoNum);
router.get('/propostas/:id/pdf', autenticar, validarId, propCtrl.gerarPdf);
router.get('/propostas/:id/planilha', autenticar, validarId, propCtrl.gerarPlanilha);
router.post('/propostas/:id/enviar-email', autenticar, validarId, posseProposta, limiteEnvioEmail, propCtrl.enviarEmail);
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
router.put('/configuracoes/margem', autenticar, admin, integCtrl.atualizarMargem);

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
router.get('/projetos/disciplinas', autenticar, (req, res) => res.json(require('../utils/disciplinasProjeto').DISCIPLINAS));
router.get('/projetos/analises', autenticar, projCtrl.listar);
router.post('/projetos/analisar', autenticar, limiteAnaliseProjeto, upload.array('arquivos', 10), projCtrl.analisar);
router.get('/projetos/analises/:id/relatorio', autenticar, validarId, projCtrl.gerarRelatorio);
// Pasta do projeto em "Arquivos do Sistema/Projetos" (consultar e abrir no Explorer deste PC)
router.get('/projetos/analises/:id/pasta', autenticar, validarId, projCtrl.pasta);
router.post('/projetos/analises/:id/pasta/abrir', autenticar, validarId, projCtrl.abrirPasta);
router.get('/projetos/analises/:id', autenticar, validarId, projCtrl.buscarUma);
router.put('/projetos/analises/:id', autenticar, validarId, posseAnalise, projCtrl.atualizar);
router.delete('/projetos/analises/:id', autenticar, validarId, posseAnalise, projCtrl.remover);
router.post('/projetos/analises/:id/gerar-orcamento', autenticar, validarId, posseAnalise, projCtrl.gerarOrcamento);

// ── PROJETOS E LAUDOS POR DISCIPLINA (hub Obras) ──────────────────────────
// Versão 2.1: /laudos guarda os dois tipos de registro (?tipo=projeto|laudo);
// /laudos/de-analise cria sempre um PROJETO (análise não gera laudo).
// Caminhos específicos antes do /:id genérico
router.get('/laudos/disciplinas', autenticar, laudoCtrl.disciplinas);
router.get('/laudos/entregas', autenticar, laudoCtrl.catalogoEntregas);
router.get('/laudos/modelo/:disciplina', autenticar, laudoCtrl.modelo);
router.get('/laudos', autenticar, laudoCtrl.listar);
router.post('/laudos', autenticar, laudoCtrl.criar);
router.post('/laudos/de-analise', autenticar, laudoCtrl.criarDeAnalise);
router.get('/laudos/:id/documento/:tipo', autenticar, validarId, laudoCtrl.documento);
// Pasta do laudo em "Arquivos do Sistema/Laudos": gravar todos os documentos, consultar e abrir
router.post('/laudos/:id/salvar-documentos', autenticar, validarId, posseLaudo, laudoCtrl.salvarDocumentos);
router.get('/laudos/:id/pasta', autenticar, validarId, laudoCtrl.pasta);
router.post('/laudos/:id/pasta/abrir', autenticar, validarId, laudoCtrl.abrirPasta);
router.get('/laudos/:id/fotos/:fotoId', autenticar, validarId, laudoCtrl.verFoto);
router.post('/laudos/:id/fotos', autenticar, validarId, posseLaudo, uploadFotos.array('fotos', 20), laudoCtrl.enviarFotos);
// arquitetura (.dxf) do projeto e planta gerada pela skill da disciplina
router.post('/laudos/:id/arquitetura', autenticar, validarId, posseLaudo, uploadArquitetura.single('arquivo'), laudoCtrl.enviarArquitetura);
router.get('/laudos/:id/arquitetura', autenticar, validarId, laudoCtrl.verArquitetura);
router.get('/laudos/:id/planta', autenticar, validarId, laudoCtrl.gerarPlantaDxf);
router.get('/laudos/:id/unifilar', autenticar, validarId, laudoCtrl.gerarUnifilarQet);
router.delete('/laudos/:id/fotos/:fotoId', autenticar, validarId, posseLaudo, laudoCtrl.removerFoto);
router.post('/laudos/:id/calcular', autenticar, validarId, laudoCtrl.calcular);
router.post('/laudos/:id/gerar-orcamento', autenticar, validarId, posseLaudo, laudoCtrl.gerarOrcamento);
// entregas do projeto (definições técnicas, as-built, DXF, QElectroTech, PDF): ZIP (?destino=zip) ou só a pasta (?destino=pasta)
router.post('/laudos/:id/entrega', autenticar, validarId, posseLaudo, laudoCtrl.gerarEntrega);
router.get('/laudos/:id', autenticar, validarId, laudoCtrl.buscarUm);
router.put('/laudos/:id', autenticar, validarId, posseLaudo, laudoCtrl.atualizar);
router.delete('/laudos/:id', autenticar, validarId, posseLaudo, laudoCtrl.remover);

// ── PREÇOS DE REFERÊNCIA DE MÃO DE OBRA (admin) ──────────────────────────
// Tela de administração — a sugestão em si já vem embutida em cada serviço
// da Análise de Projeto (montarServicosPadrao lê a tabela direto), então só
// quem PODE EDITAR essa referência precisa dessas rotas.
router.get('/precos-mao-de-obra', autenticar, admin, precosMOCtrl.listar);
router.put('/precos-mao-de-obra', autenticar, admin, precosMOCtrl.atualizar);
// referência de mercado oficial/governo ou particular pesquisada na web (mesmo limite da pesquisa de mercado)
router.post('/precos-mao-de-obra/:codigo/pesquisar', autenticar, admin, limitePesquisaMercado, precosMOCtrl.pesquisar);

// ── PESQUISA DE MERCADO (Gemini + busca real) ────────────────────────────
router.post('/pesquisa-mercado', autenticar, limitePesquisaMercado, pesqCtrl.pesquisar);
router.get('/pesquisa-mercado/historico', autenticar, pesqCtrl.historico);
// Salvar uma pesquisa feita fora da API (ex.: busca do próprio Claude Desktop) —
// só grava no banco, não chama IA, então não precisa do limite de IA.
router.post('/pesquisa-mercado/salvar', autenticar, pesqCtrl.salvar);

// Versão 2.0: rotas por tema em routes/v2/*.js — cada arquivo exporta
// (router, { autenticar, admin, validarId, exigirPosse, posse, limitePesquisaMercado, limiteAnaliseProjeto, uploadArquitetura }) => void
for (const f of require('fs').readdirSync(require('path').join(__dirname, 'v2')).filter(n => /\.js$/.test(n)).sort()) {
  require(`./v2/${f}`)(router, { autenticar, admin, validarId, exigirPosse, posse, limitePesquisaMercado, limiteAnaliseProjeto, uploadArquitetura });
}

module.exports = router;
