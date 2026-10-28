import axios from 'axios';
import { aguardarNovoLogin, avisarSenhaProvisoria, temOuvinteSessao } from './sessao';

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

// Sessão (ver services/sessao.js):
//   401 → a tela continua onde está; abre o "Entre de novo" e a requisição é
//         repetida com o token novo depois do login (nada do que está na tela
//         se perde). Desistir = sair e ir para /login.
//   403 com codigo SENHA_PROVISORIA → tela de definir senha.
//   Demais 403 (posse: registro de outro usuário; só admin) → só recusa; quem
//         chamou mostra a mensagem. Antes o 403 também deslogava: salvar a
//         proposta de outro usuário jogava fora tudo o que estava na tela.
// `semSessao: true` na config: o 401 é resposta da própria tela (login, senha
// atual errada) e não "sessão vencida".
function sairParaLogin() {
  localStorage.removeItem('hm_token');
  localStorage.removeItem('hm_usuario');
  window.location.href = '/login';
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config || {};
    const status = error.response?.status;
    if (config.semSessao) return Promise.reject(error);
    if (status === 401) {
      if (config._repetidaAposLogin || !temOuvinteSessao() || !localStorage.getItem('hm_usuario')) {
        sairParaLogin();
        return Promise.reject(error);
      }
      return aguardarNovoLogin().then(
        () => api({ ...config, _repetidaAposLogin: true }),
        () => Promise.reject(error)
      );
    }
    if (status === 403 && error.response?.data?.codigo === 'SENHA_PROVISORIA') avisarSenhaProvisoria();
    return Promise.reject(error);
  }
);

// ── AUTH ──────────────────────────────────────────────────────────────
export const login = (email, senha) =>
  api.post('/auth/login', { email, senha }, { semSessao: true });

// 401 aqui é "senha atual incorreta" (DefinirSenha mostra na tela, sem deslogar)
export const alterarSenha = (senhaAtual, novaSenha) =>
  api.post('/auth/senha', { senhaAtual, novaSenha }, { semSessao: true });

// ── MATERIAIS ─────────────────────────────────────────────────────────
export const getMateriais = (params) => api.get('/materiais', { params });
// Lista inteira, página a página (o servidor devolve no máximo 1000 por vez):
// o "+ catálogo" do editor de orçamento precisa do catálogo completo.
// `fn` é uma listagem paginada ({ itens, totalPaginas }); devolve { data: { itens } }.
export async function buscarTodasPaginas(fn, params = {}, limitePaginas = 50) {
  const itens = [];
  for (let pagina = 1; pagina <= limitePaginas; pagina++) {
    const { data } = await fn({ ...params, porPagina: 1000, pagina });
    itens.push(...(data.itens || []));
    if (!data.totalPaginas || pagina >= data.totalPaginas) break;
  }
  return { data: { itens } };
}
export const getTodosMateriais = (params) => buscarTodasPaginas(getMateriais, params);
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
export const getTodosClientes = (params) => buscarTodasPaginas(getClientes, params);
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

// ── PROJETOS E LAUDOS POR DISCIPLINA (hub Obras) ──────────────────────────
// Versão 2.1: /laudos guarda os dois tipos (params.tipo = 'projeto' | 'laudo')
export const getDisciplinasLaudo = () => api.get('/laudos/disciplinas');
export const getModeloLaudo = (disciplina) => api.get(`/laudos/modelo/${disciplina}`);
export const getLaudos = (params) => api.get('/laudos', { params });
export const getLaudo = (id) => api.get(`/laudos/${id}`);
export const criarLaudo = (disciplina, dados, tipo = 'laudo') => api.post('/laudos', { disciplina, dados, tipo });
// cria o PROJETO da disciplina a partir da análise (análise nunca gera laudo);
// se a análise já tem o projeto desta disciplina, o servidor devolve o existente
export const criarProjetoDeAnalise = (analiseId, disciplina) => api.post('/laudos/de-analise', { analise_id: analiseId, disciplina });
// entregas do projeto: catálogo e geração (destino 'zip' = baixa o pacote; 'pasta' = só grava na pasta)
export const getEntregasProjeto = () => api.get('/laudos/entregas');
export const gerarEntregaProjeto = (id, corpo, destino = 'zip') => api.post(`/laudos/${id}/entrega`, corpo, {
  params: { destino }, responseType: destino === 'zip' ? 'blob' : 'json', timeout: 300000,
});
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
// referência de mercado de um serviço: segmento 'publico' (oficial/governo) ou 'privado' (particular)
export const pesquisarReferenciaMaoDeObra = (codigo, segmento) =>
  api.post(`/precos-mao-de-obra/${encodeURIComponent(codigo)}/pesquisar`, { segmento }, { timeout: 300000 });

// ── BASE ÚNICA DE SERVIÇOS (versão 2.0): padrão + lançados em propostas ──
export const getServicos = (params) => api.get('/servicos', { params });
export const getSegmentoCliente = (cliente) => api.get('/servicos/segmento', { params: { cliente } });
// "é o mesmo que…": o livre sai da lista e as próximas propostas usam o destino (admin)
export const fundirServico = (codigo, destino) => api.post(`/servicos/${encodeURIComponent(codigo)}/fundir`, { destino });
export const definirServicoAtivo = (codigo, ativo) => api.put(`/servicos/${encodeURIComponent(codigo)}/ativo`, { ativo });

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

// ── INTEGRAÇÕES: ROTINAS AUTOMÁTICAS E IA (2.0, admin) ─────────────────────
export const getRotinasIntegracoes = () => api.get('/integracoes/rotinas');
// a rotina roda na hora (e-mail/pastas podem levar minutos)
export const executarRotinaIntegracao = (chave) =>
  api.post(`/integracoes/rotinas/${encodeURIComponent(chave)}/executar`, null, { timeout: 600000 });
export const testarIAIntegracoes = () => api.post('/integracoes/ia/testar', null, { timeout: 180000 });
// ── OBRAS (2.0, Fase 2D) ───────────────────────────────────────────────────
// Lista: params { busca, status, cliente_id, segmento, pagina, porPagina, campos }
//   campos: 'basico' → só { id, codigo, nome, cliente_id, cliente_nome, status, segmento }
//   (sem contagens/totais; usado pelo ObraSelect, porPagina até 1000)
export const getObras = (params) => api.get('/obras', { params });
export const getObra = (id) => api.get(`/obras/${id}`);
// data: { nome*, cliente_id, cliente_nome, local, segmento, status, inicio_previsto,
//         fim_previsto, responsavel_id, observacoes } (+ versao no PUT)
export const criarObra = (data) => api.post('/obras', data);
export const atualizarObra = (id, data) => api.put(`/obras/${id}`, data);
export const removerObra = (id) => api.delete(`/obras/${id}`);
// liga/desliga um item existente: tipo 'proposta' | 'analise' | 'laudo' | 'contrato' | 'movimento'
export const vincularItemObra = (obraId, tipo, itemId, ligar = true) =>
  api.put(`/obras/${obraId}/vinculos`, { tipo, id: itemId, ligar });
export const getPastaObra = (id) => api.get(`/obras/${id}/pasta`);
export const abrirPastaObra = (id) => api.post(`/obras/${id}/pasta/abrir`);
// Criação já ligada a uma obra (obraId null/undefined = sem obra; o backend
// também aceita obra_id direto no corpo de POST/PUT /propostas, /contratos,
// /financeiro/movimentos e PATCH categorizar)
// finalidade (2.1): 'orcamento' | 'elaboracao'
export const analisarProjetoNaObra = (arquivosComDisciplinas, nomeProjeto, obraId, finalidade = 'orcamento') => {
  const formData = new FormData();
  if (nomeProjeto) formData.append('nome_projeto', nomeProjeto);
  if (obraId) formData.append('obra_id', String(obraId));
  formData.append('finalidade', finalidade);
  arquivosComDisciplinas.forEach(({ arquivo }) => formData.append('arquivos', arquivo));
  formData.append('disciplinasPorArquivo', JSON.stringify(arquivosComDisciplinas.map(a => a.disciplinas)));
  return api.post('/projetos/analisar', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 });
};
// tipo (2.1): 'projeto' | 'laudo' (padrão laudo)
export const criarLaudoNaObra = (disciplina, dados, obraId, tipo = 'laudo') =>
  api.post('/laudos', { disciplina, dados, obra_id: obraId || null, tipo });
// sem obraId, o projeto herda a obra da análise de origem
export const criarProjetoDeAnaliseNaObra = (analiseId, disciplina, obraId) =>
  api.post('/laudos/de-analise', { analise_id: analiseId, disciplina, ...(obraId ? { obra_id: obraId } : {}) });
// ── APROVAÇÃO DA PROPOSTA POR LINK (2.0, Fase 3I) ─────────────────────────
// Internas (login). Gerar devolve o token EM CLARO uma única vez:
//   { id, token, caminho: '/aprovacao/<token>', url_publica_base, expira_em, numero, cliente_nome, total }
// dias (opcional, 1–90): validade do link; vazio = até o fim da validade da proposta
export const gerarLinkAprovacao = (propostaId, dias) =>
  api.post(`/propostas/${propostaId}/link-aprovacao`, dias ? { dias: Number(dias) } : {});
// { url_publica_base, links: [{ id, criado_em, criado_por_nome, expira_em, revogado_em, ultimo_acesso_em, acessos, estado, decisao }] }
export const getLinksAprovacao = (propostaId) => api.get(`/propostas/${propostaId}/links-aprovacao`);
export const revogarLinkAprovacao = (propostaId, linkId) => api.post(`/propostas/${propostaId}/links-aprovacao/${linkId}/revogar`);
// [{ id, link_id, codigo, decisao, nome, documento, cargo, email, observacao, decidido_em, ip, user_agent, hash_conteudo, ... }]
export const getDecisoesAprovacao = (propostaId) => api.get(`/propostas/${propostaId}/decisoes-aprovacao`);

// Públicas (sem login): instância própria, SEM o token do sistema e sem o
// redirecionamento para /login do interceptor acima (o cliente não tem conta).
const apiPublica = axios.create({
  baseURL: process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api/publico` : '/api/publico',
  timeout: 20000,
});
export const getAprovacaoPublica = (token) => apiPublica.get(`/aprovacao/${encodeURIComponent(token)}`);
// dados: { decisao: 'aprovada'|'recusada', nome, documento, cargo, email, observacao, aceite, hash_conteudo }
export const enviarDecisaoAprovacao = (token, dados) => apiPublica.post(`/aprovacao/${encodeURIComponent(token)}/decisao`, dados);
export const urlPdfAprovacaoPublica = (token) =>
  `${process.env.REACT_APP_API_URL || ''}/api/publico/aprovacao/${encodeURIComponent(token)}/pdf`;

// ── COMPOSIÇÕES E KITS (2.0, Fase 3H) ────────────────────────────────────
// Lista: params { busca, disciplina, inativos: '1' } → { itens: [{ id, codigo, descricao,
//   unidade, disciplina, observacao, ativo, origem, versao, n_itens,
//   custo: { publico: { custo_unitario, itens_a_cotar, completo }, privado: {...} } }] }
export const getComposicoes = (params) => api.get('/composicoes', { params });
// { ...composicao, itens: [...], custo: { publico: calculo, privado: calculo } }
export const getComposicao = (id) => api.get(`/composicoes/${id}`);
// data: { codigo?, descricao*, unidade, disciplina, observacao, itens: [{ tipo: 'material'|'servico',
//   material_id?, servico_codigo?, coeficiente*, descricao, unidade }] } (+ versao no PUT) — admin
export const criarComposicao = (data) => api.post('/composicoes', data);
export const atualizarComposicao = (id, data) => api.put(`/composicoes/${id}`, data);
export const duplicarComposicao = (id) => api.post(`/composicoes/${id}/duplicar`);
export const definirComposicaoAtiva = (id, ativo) => api.put(`/composicoes/${id}/ativo`, { ativo });
export const removerComposicao = (id) => api.delete(`/composicoes/${id}`);
// custo de um rascunho de itens nos dois segmentos (não grava)
export const calcularComposicao = (itens) => api.post('/composicoes/calcular', { itens });
// itens prontos para a proposta: { codigo, quantidade, segmento: 'publico'|'privado' }
export const explodirComposicao = (codigo, quantidade, segmento) =>
  api.post('/composicoes/explodir', { codigo, quantidade, segmento });

// ── CRONOGRAMA FÍSICO-FINANCEIRO E MEDIÇÕES DA OBRA (2.0, Fase 3G) ─────────
// GET: { cronograma, etapas, calculo (curva S, resumo), medicoes (histórico), propostas, pode_editar }
export const getCronogramaObra = (obraId, params) => api.get(`/obras/${obraId}/cronograma`, { params });
// data: { proposta_id?, data_inicio?, periodicidade?, custo_hh?, equipe?, incluir_etapas_fixas? }
export const gerarCronogramaObra = (obraId, data) => api.post(`/obras/${obraId}/cronograma/gerar`, data, { timeout: 60000 });
// data: { versao, periodicidade, criterio_peso, data_inicio, etapas: [{ id?, nome, valor, peso, inicio, fim, distribuicao? }] }
export const salvarCronogramaObra = (obraId, data) => api.put(`/obras/${obraId}/cronograma`, data);
export const getMedicoesObra = (obraId) => api.get(`/obras/${obraId}/medicoes`);
// data: { data_medicao, periodo?, observacao?, itens: [{ etapa_id, percentual_acumulado?, valor_medido?, observacao? }] }
export const registrarMedicaoObra = (obraId, data) => api.post(`/obras/${obraId}/medicoes`, data);
export const baixarPlanilhaCronogramaObra = (obraId) =>
  api.get(`/obras/${obraId}/cronograma/planilha`, { responseType: 'blob', timeout: 120000 });
export const baixarBoletimMedicaoObra = (obraId, periodo) =>
  api.get(`/obras/${obraId}/medicoes/boletim`, { params: { periodo }, responseType: 'blob', timeout: 120000 });

// ── ORDENS DE SERVIÇO DE CAMPO — tela do escritório (2.0, Fase 4J) ────────
// Contrato em docs/CAMPO-API.md. O app de campo (/campo) tem o seu próprio
// cliente de API; aqui só as chamadas da aba "Campo (OS)" da obra.
// { itens: [OS], agora } — OS que o usuário vê, todas as situações
export const getOrdensServicoObra = (obraId) => api.get('/campo/os', { params: { obra_id: obraId, status: 'todas' } });
// OS completa, com `historico` (respostas substituídas)
export const getOrdemServico = (id) => api.get(`/campo/os/${id}`);
// { itens: [{ chave, rotulo, disciplina, itens: [{ id, grupo, texto }] }] }
export const getModelosChecklist = (disciplina) => api.get('/campo/modelos-checklist', { params: disciplina ? { disciplina } : {} });
// data: { titulo*, descricao, tipo, disciplina, responsavel_id, agendada_para, modelo_checklist } (dono da obra ou admin)
export const criarOrdemServico = (obraId, data) => api.post(`/obras/${obraId}/os`, data);
// data: mesmos campos + versao (409 se mudou); { status: 'cancelada' } só admin
export const atualizarOrdemServico = (id, data) => api.put(`/campo/os/${id}`, data);
// admin: sem fotos/assinatura exclui; com elas, cancela → { cancelada, mensagem }
export const removerOrdemServico = (id) => api.delete(`/campo/os/${id}`);
export const baixarPdfOrdemServico = (id) => api.get(`/campo/os/${id}/pdf`, { responseType: 'blob', timeout: 120000 });
// foto/assinatura (autenticadas): `url` como o servidor devolve ("/api/campo/...") → blob
export const getArquivoCampo = (url) => {
  const rota = String(url || '').replace(/^\/api(?=\/campo\/)/, '');
  if (!/^\/campo\/(fotos\/[0-9a-f-]{36}|os\/\d+\/assinatura)$/i.test(rota)) return Promise.reject(new Error('Endereço de arquivo de campo inválido'));
  return api.get(rota, { responseType: 'blob', timeout: 60000 });
};
