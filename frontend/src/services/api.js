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
export const duplicarProposta = (id) => api.post(`/propostas/${id}/duplicar`);
export const atualizarStatus = (id, status) => api.patch(`/propostas/${id}/status`, { status });
export const removerProposta = (id) => api.delete(`/propostas/${id}`);
export const enviarPropostaPorEmail = (id, destinatario, mensagem) =>
  api.post(`/propostas/${id}/enviar-email`, { destinatario, mensagem });

// ── USUÁRIOS ──────────────────────────────────────────────────────────
export const getUsuarios = () => api.get('/usuarios');
export const criarUsuario = (data) => api.post('/usuarios', data);
export const atualizarUsuario = (id, data) => api.put(`/usuarios/${id}`, data);
export const redefinirSenhaUsuario = (id, novaSenha) => api.post(`/usuarios/${id}/redefinir-senha`, { novaSenha });

export default api;
