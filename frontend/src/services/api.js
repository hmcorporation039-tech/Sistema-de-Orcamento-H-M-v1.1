import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL
    ? `${process.env.REACT_APP_API_URL}/api`
    : '/api',
  timeout: 15000,
});

// Injeta o token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Trata erros de autenticação globalmente — exceto na própria tela de login,
// onde um 401 é só "senha errada" e precisa aparecer na tela, não recarregar.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = error.config?.url?.includes('/auth/login');
    if (!isLogin && (error.response?.status === 401 || error.response?.status === 403)) {
      localStorage.removeItem('hm_token');
      localStorage.removeItem('hm_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── AUTH ──────────────────────────────────────────────────────────────
export const login = (email, senha) =>
  api.post('/auth/login', { email, senha });

export const alterarSenha = (senhaAtual, novaSenha) =>
  api.post('/auth/senha', { senhaAtual, novaSenha });

// ── MATERIAIS ─────────────────────────────────────────────────────────
export const getMateriais = (params) => api.get('/materiais', { params });
export const getCategoriasMateriais = () => api.get('/materiais/categorias');
export const criarMaterial = (data) => api.post('/materiais', data);
export const atualizarMaterial = (id, data) => api.put(`/materiais/${id}`, data);
export const removerMaterial = (id) => api.delete(`/materiais/${id}`);
export const importarMateriais = (materiais) => api.post('/materiais/importar', { materiais });
export const extrairNotaFiscal = (arquivo) => {
  const formData = new FormData();
  formData.append('arquivo', arquivo);
  return api.post('/materiais/extrair-nota', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const verificarFornecedoresAgora = () => api.post('/materiais/fornecedores/verificar-agora');

// ── MÃO DE OBRA (catálogo de itens já lançados em propostas, sugestão em
// dropdown na aba Orçamento) ─────────────────────────────────────────────
export const getMaoDeObraItens = (params) => api.get('/mao-de-obra-itens', { params });

// ── CLIENTES ──────────────────────────────────────────────────────────
export const getClientes = (params) => api.get('/clientes', { params });
export const criarCliente = (data) => api.post('/clientes', data);
export const atualizarCliente = (id, data) => api.put(`/clientes/${id}`, data);
export const removerCliente = (id) => api.delete(`/clientes/${id}`);

// ── INTEGRAÇÕES ───────────────────────────────────────────────────────
export const getStatusEmail = () => api.get('/integracoes/email/status');
export const verificarEmailAgora = () => api.post('/integracoes/email/verificar-agora');
export const getHistoricoEmail = () => api.get('/integracoes/email/historico');
export const getMargemPadrao = () => api.get('/configuracoes/margem');
export const atualizarMargemPadrao = (margem) => api.put('/configuracoes/margem', { margem });

// ── PROPOSTAS ─────────────────────────────────────────────────────────
export const getPropostas = (params) => api.get('/propostas', { params });
export const getProposta = (id) => api.get(`/propostas/${id}`);
export const getProximoNumero = () => api.get('/propostas/proximo-numero');
export const criarProposta = (data) => api.post('/propostas', data);
export const atualizarProposta = (id, data) => api.put(`/propostas/${id}`, data);
export const duplicarProposta = (id) => api.post(`/propostas/${id}/duplicar`);
export const atualizarStatus = (id, status) => api.patch(`/propostas/${id}/status`, { status });
export const removerProposta = (id) => api.delete(`/propostas/${id}`);
export const enviarPropostaPorEmail = (id, destinatario, mensagem) =>
  api.post(`/propostas/${id}/enviar-email`, { destinatario, mensagem });

// ── ANÁLISE DE PROJETO (compatibilização) ────────────────────────────────
// `arquivosComDisciplinas`: [{ arquivo: File, disciplinas: string[] }] — cada
// arquivo carrega sua própria lista de disciplinas (não uma lista única pro
// lote), por isso vai como um array posicional (mesma ordem dos arquivos
// anexados) em vez de um campo só.
export const analisarProjeto = (arquivosComDisciplinas, nomeProjeto) => {
  const formData = new FormData();
  if (nomeProjeto) formData.append('nome_projeto', nomeProjeto);
  arquivosComDisciplinas.forEach(({ arquivo }) => formData.append('arquivos', arquivo));
  formData.append('disciplinasPorArquivo', JSON.stringify(arquivosComDisciplinas.map(a => a.disciplinas)));
  // Extrai equipamentos via IA (uma chamada por arquivo) — pode passar bem
  // do timeout padrão de 15s, por isso o prazo maior só nessa chamada.
  return api.post('/projetos/analisar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  });
};
export const getDisciplinasProjeto = () => api.get('/projetos/disciplinas');
export const getAnalisesProjeto = (params) => api.get('/projetos/analises', { params });
export const getAnaliseProjeto = (id) => api.get(`/projetos/analises/${id}`);
export const atualizarAnaliseProjeto = (id, data) => api.put(`/projetos/analises/${id}`, data);
export const removerAnaliseProjeto = (id) => api.delete(`/projetos/analises/${id}`);
export const gerarRelatorioCompatibilizacao = (id) =>
  api.get(`/projetos/analises/${id}/relatorio`, { responseType: 'blob' });
export const gerarOrcamentoDaAnalise = (id) => api.post(`/projetos/analises/${id}/gerar-orcamento`);
// Pasta do projeto em Arquivos do Sistema/Projetos
export const getPastaAnalise = (id) => api.get(`/projetos/analises/${id}/pasta`);
export const abrirPastaAnalise = (id) => api.post(`/projetos/analises/${id}/pasta/abrir`);

// ── LAUDOS E PROJETOS POR DISCIPLINA (aba Análise de Projeto) ─────────────
export const getDisciplinasLaudo = () => api.get('/laudos/disciplinas');
export const getModeloLaudo = (disciplina) => api.get(`/laudos/modelo/${disciplina}`);
export const getLaudos = (params) => api.get('/laudos', { params });
export const getLaudo = (id) => api.get(`/laudos/${id}`);
export const criarLaudo = (disciplina, dados) => api.post('/laudos', { disciplina, dados });
export const criarLaudoDeAnalise = (analiseId, disciplina) => api.post('/laudos/de-analise', { analise_id: analiseId, disciplina });
export const enviarArquiteturaLaudo = (id, arquivo) => {
  const fd = new FormData();
  fd.append('arquivo', arquivo);
  return api.post(`/laudos/${id}/arquitetura`, fd, { timeout: 180000 });
};
export const getArquiteturaLaudo = (id) => api.get(`/laudos/${id}/arquitetura`);
export const baixarUnifilarLaudo = (id) => api.get(`/laudos/${id}/unifilar`, { responseType: 'blob', timeout: 120000 });
export const baixarPlantaLaudo = (id) => api.get(`/laudos/${id}/planta`, { responseType: 'blob', timeout: 180000 });
// gerarOrcamento: true/false ("só laudo"); omitido mantém o que está salvo
// versao: a que a tela carregou (bloqueio otimista — o servidor recusa com 409 se outro gravou antes)
export const atualizarLaudo = (id, dados, gerarOrcamento, versao) => api.put(`/laudos/${id}`, {
  dados, versao, ...(gerarOrcamento == null ? {} : { gerar_orcamento: gerarOrcamento }),
});
// Pasta do laudo em Arquivos do Sistema/Laudos
export const salvarDocumentosLaudo = (id) => api.post(`/laudos/${id}/salvar-documentos`, null, { timeout: 300000 });
export const getPastaLaudo = (id) => api.get(`/laudos/${id}/pasta`);
export const abrirPastaLaudo = (id) => api.post(`/laudos/${id}/pasta/abrir`);
export const removerLaudo = (id) => api.delete(`/laudos/${id}`);
export const calcularLaudo = (id) => api.post(`/laudos/${id}/calcular`, null, { timeout: 60000 });
export const baixarDocumentoLaudo = (id, tipo) =>
  api.get(`/laudos/${id}/documento/${tipo}`, { responseType: 'blob', timeout: 120000 });
export const enviarFotosLaudo = (id, arquivos) => {
  const formData = new FormData();
  arquivos.forEach(a => formData.append('fotos', a));
  return api.post(`/laudos/${id}/fotos`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
};
export const getFotoLaudo = (id, fotoId) => api.get(`/laudos/${id}/fotos/${fotoId}`, { responseType: 'blob' });
export const removerFotoLaudo = (id, fotoId) => api.delete(`/laudos/${id}/fotos/${fotoId}`);
export const gerarOrcamentoDoLaudo = (id, modo) => api.post(`/laudos/${id}/gerar-orcamento`, { modo }, { timeout: 60000 });

// ── PESQUISA DE MERCADO ───────────────────────────────────────────────
// a pesquisa pelo Claude Max (busca na web real) leva de 30 s a 1 min
export const pesquisarPrecoMercado = (descricao, tipo = 'material') => api.post('/pesquisa-mercado', { descricao, tipo }, { timeout: 300000 });

// ── PREÇOS DE REFERÊNCIA DE MÃO DE OBRA (admin) ─────────────────────────
export const getPrecosMaoDeObra = () => api.get('/precos-mao-de-obra');
export const atualizarPrecosMaoDeObra = (itens) => api.put('/precos-mao-de-obra', { itens });

// ── USUÁRIOS ──────────────────────────────────────────────────────────
export const getUsuarios = () => api.get('/usuarios');
export const criarUsuario = (data) => api.post('/usuarios', data);
export const atualizarUsuario = (id, data) => api.put(`/usuarios/${id}`, data);
export const redefinirSenhaUsuario = (id, novaSenha) => api.post(`/usuarios/${id}/redefinir-senha`, { novaSenha });
export const removerUsuario = (id) => api.delete(`/usuarios/${id}`);

// ── DASHBOARD ─────────────────────────────────────────────────────────
export const getDashboardResumo = (params) => api.get('/dashboard/resumo', { params });
export const getDashboardPorMes = (params) => api.get('/dashboard/por-mes', { params });
export const getDashboardTopClientes = (params) => api.get('/dashboard/top-clientes', { params });
export const getDashboardTopMateriais = (params) => api.get('/dashboard/top-materiais', { params });
export const getDashboardUltimas = (params) => api.get('/dashboard/ultimas-propostas', { params });

// ── RELATÓRIOS ────────────────────────────────────────────────────────
export const getRelatorioPropostas = (params) => api.get('/relatorios/propostas', { params });

// ── FINANCEIRO ────────────────────────────────────────────────────────
export const getFinanceiroMovimentos = (params) => api.get('/financeiro/movimentos', { params });
export const criarFinanceiroMovimento = (data) => api.post('/financeiro/movimentos', data);
export const atualizarFinanceiroMovimento = (id, data) => api.put(`/financeiro/movimentos/${id}`, data);
export const categorizarFinanceiroMovimento = (id, data) => api.patch(`/financeiro/movimentos/${id}/categorizar`, data);
export const removerFinanceiroMovimento = (id) => api.delete(`/financeiro/movimentos/${id}`);
export const verificarPixAgora = () => api.post('/financeiro/verificar-agora');

// ── PRESTADORES DE SERVIÇOS ──────────────────────────────────────────────
export const getPrestadores = (params) => api.get('/prestadores', { params });
export const criarPrestador = (data) => api.post('/prestadores', data);
export const atualizarPrestador = (id, data) => api.put(`/prestadores/${id}`, data);
export const removerPrestador = (id) => api.delete(`/prestadores/${id}`);

// ── CONTRATOS DE PRESTAÇÃO DE SERVIÇO ─────────────────────────────────────
export const getContratos = (params) => api.get('/contratos', { params });
export const criarContrato = (data) => api.post('/contratos', data);
export const atualizarContrato = (id, data) => api.put(`/contratos/${id}`, data);
export const removerContrato = (id) => api.delete(`/contratos/${id}`);

export default api;
