// Ferramentas INTERNAS dos agentes próprios: os motores determinísticos do sistema, chamados por um lugar só.
//
// O que GRAVA (criar análise, projeto, rascunho de proposta) passa pela API do próprio sistema, com um token de
// escopo 'assistente' emitido para a execução do agente (services/assistente/sessoes.js). Assim valem as MESMAS
// garantias do assistente (middleware/escopoAssistente.js): só rotas de leitura e de rascunho, só altera o que foi
// criado na conversa da execução (ou o que o usuário autorizou ao iniciar — `autorizados`), não sobrescreve proposta
// Ativa de outra pessoa, e posse/admin continuam valendo. O que só LÊ e não tem rota (referências de preço, arquivo
// da conversa) roda aqui dentro, sem IA.
const pool = require('../../config/database');
const A = require('../assistente/arquivos');

const ErroFerramenta = class extends Error {
  constructor(mensagem, { status = null, codigo = null } = {}) { super(mensagem); this.status = status; this.codigo = codigo; }
};

function nomeDoCabecalho(disp) {
  const m = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disp || '') || /filename\s*=\s*"?([^";]+)"?/i.exec(disp || '');
  if (!m) return null;
  try { return decodeURIComponent(m[1].trim()); } catch { return m[1].trim(); }
}

// Cliente da API com o token da execução. formulario: FormData; binario: { buffer, nome, tipoConteudo }
function criarClienteApi({ url, token, fetchImpl = globalThis.fetch, signal = null }) {
  return async function api(metodo, caminho, corpo, { formulario = false, binario = false } = {}) {
    const headers = { Authorization: `Bearer ${token}` };
    let body;
    if (formulario) body = corpo;
    else if (corpo !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(corpo); }
    const resp = await fetchImpl(`${url}${caminho}`, { method: metodo, headers, body, signal });
    if (binario && resp.ok) {
      return { buffer: Buffer.from(await resp.arrayBuffer()), nome: nomeDoCabecalho(resp.headers.get('content-disposition')), tipoConteudo: resp.headers.get('content-type') };
    }
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new ErroFerramenta(dados.erro || `Erro ${resp.status} em ${metodo} ${caminho.split('?')[0]}`, { status: resp.status, codigo: dados.codigo });
    return dados;
  };
}

// conversaId/usuarioId: a conversa da execução (arquivos de entrada e de saída ficam nela)
function criarFerramentas({ api, conversaId, usuarioId, db = pool }) {
  async function arquivoDaConversa(id) {
    const { rows: [a] } = await db.query('SELECT * FROM assistente_arquivos WHERE id = $1 AND conversa_id = $2', [id, conversaId]);
    if (!a) throw new ErroFerramenta(`O arquivo #${id} não está nesta conversa.`, { status: 404 });
    return a;
  }

  return {
    // ── arquivos da conversa ──
    arquivoDaConversa,
    async bytesDoArquivo(id) { const a = await arquivoDaConversa(id); return { registro: A.publico(a), buffer: await A.lerConteudo(a) }; },
    async resumoDoArquivo(id) { const a = await arquivoDaConversa(id); return A.resumirArquivo(db, a); },
    async salvarArquivo(nome, buffer, tipo) {
      const t = tipo || await A.detectarTipo(buffer, nome);
      if (!t) return null;
      return A.salvarArquivo(db, { conversaId, usuarioId, nomeOriginal: nome, buffer, tipo: t });
    },

    // ── análise de projeto ──
    async analisarArquivo({ arquivo_id, disciplinas, finalidade = 'orcamento', nome_projeto, obra_id }) {
      const { registro, buffer } = await this.bytesDoArquivo(arquivo_id);
      if (!['pdf', 'dwg', 'dxf'].includes(registro.tipo)) throw new ErroFerramenta(`O arquivo "${registro.nome}" é ${registro.tipo.toUpperCase()}: a análise lê PDF, DWG ou DXF.`, { status: 400 });
      const form = new FormData();
      const nome = `${registro.nome.replace(/[^\w.\- ]+/g, '_').replace(/\.(pdf|dwg|dxf)$/i, '')}.${registro.tipo}`;
      form.append('arquivos', new Blob([buffer], { type: registro.tipo === 'pdf' ? 'application/pdf' : 'application/octet-stream' }), nome);
      form.append('disciplinasPorArquivo', JSON.stringify([disciplinas]));
      form.append('finalidade', finalidade);
      if (nome_projeto) form.append('nome_projeto', nome_projeto);
      if (obra_id) form.append('obra_id', String(obra_id));
      return api('POST', '/api/projetos/analisar', form, { formulario: true });
    },
    verAnalise: (id) => api('GET', `/api/projetos/analises/${id}`),
    situacao3d: (origem, id) => api('GET', `/api/modelo-3d/${origem}/${id}`),

    // ── projeto da disciplina (skills) ──
    criarProjetoDeAnalise: (analise_id, disciplina) => api('POST', '/api/laudos/de-analise', { analise_id, disciplina }),
    verProjeto: (id) => api('GET', `/api/laudos/${id}`),
    calcularProjeto: (id) => api('POST', `/api/laudos/${id}/calcular`, {}),
    disciplinasDoTipo: (tipo) => api('GET', `/api/laudos/disciplinas?tipo=${encodeURIComponent(tipo)}`),
    documentoDoProjeto: (id, tipo) => api('GET', `/api/laudos/${id}/documento/${encodeURIComponent(tipo)}`, undefined, { binario: true }),

    // ── orçamento ──
    gerarOrcamentoDaAnalise: (id) => api('POST', `/api/projetos/analises/${id}/gerar-orcamento`, {}),
    gerarOrcamentoDoProjeto: (id, modo) => api('POST', `/api/laudos/${id}/gerar-orcamento`, { modo, ligar_orcamento: true }),
    verProposta: (id) => api('GET', `/api/propostas/${id}`),

    // ── preços (sem IA; a web só quando o usuário permitiu) ──
    async referenciasDePreco(descricao) {
      return require('../referenciasDePreco').referenciasInternas(descricao, { db }).catch(() => null);
    },
    pesquisarMercado: (descricao) => api('POST', '/api/pesquisa-mercado', { descricao, tipo: 'material' }),
  };
}

module.exports = { criarClienteApi, criarFerramentas, ErroFerramenta, nomeDoCabecalho };
