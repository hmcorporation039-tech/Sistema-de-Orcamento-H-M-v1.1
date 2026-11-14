// API do projeto pela especificação do cliente (backend/src/routes/v2/especificacao.js). Os documentos
// saem pela rota de sempre dos projetos (baixarDocumentoLaudo em services/api.js).
import api from './api';

export const getPerfisEspecificacao = () => api.get('/especificacao/perfis');
export const lerEspecificacao = (arquivo, perfil) => {
  const fd = new FormData();
  fd.append('arquivo', arquivo);
  if (perfil) fd.append('perfil', perfil);
  return api.post('/especificacao/ler', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
};
export const gerarProjetoEspecificacao = (corpo) => api.post('/especificacao/gerar', corpo, { timeout: 180000 });
export const getProjetoEspecificacao = (id) => api.get(`/especificacao/projetos/${id}`);
export const atualizarProjetoEspecificacao = (id, corpo) => api.put(`/especificacao/projetos/${id}`, corpo, { timeout: 120000 });
export const simularProjetoEspecificacao = (id, entradas) => api.post(`/especificacao/projetos/${id}/simular`, { entradas });
export const precosProjetoEspecificacao = (id, web) => api.post(`/especificacao/projetos/${id}/precos`, { web }, { timeout: web ? 300000 : 120000 });
export const aprovarProjetoEspecificacao = (id, corpo) => api.post(`/especificacao/projetos/${id}/aprovar`, corpo);
export const getAprendizadoEspecificacao = (perfil) => api.get('/especificacao/aprendizado', { params: { perfil } });
