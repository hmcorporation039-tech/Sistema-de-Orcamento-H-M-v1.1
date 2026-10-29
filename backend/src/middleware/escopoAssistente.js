// Token de escopo "assistente" (services/assistente/sessoes.js): o que o MCP do
// assistente virtual pode fazer na API, decidido AQUI no servidor — não no
// prompt. Chamado pelo `autenticar` quando o token tem escopo 'assistente'.
//
// 1. LISTA DE ROTAS PERMITIDAS (método + caminho da rota). Fora dela: 403. Não
//    estão na lista, de propósito: mudar status/aprovar, enviar e-mail, gerar
//    link de aprovação, excluir qualquer coisa, mexer em catálogo, base de
//    serviços, preços, usuários, financeiro, contratos e obras. Para isso o
//    assistente só tem `propor_acao`, que grava uma ação PENDENTE; quem executa
//    é o usuário, clicando "Aplicar" com o próprio login.
// 2. ALTERAR só o que ele criou NESTA conversa (coluna assistente_conversa_id).
//    Proposta, análise ou projeto de qualquer pessoa — inclusive do próprio
//    usuário, feito na tela — volta 403 com o código ASSISTENTE_NAO_CRIOU.
// 3. MARCAÇÃO: o que ele cria pelas rotas de criação recebe a marca da conversa
//    antes da resposta sair (a próxima chamada do MCP já enxerga a marca).
// Posse e admin continuam valendo depois daqui, como para o próprio usuário.
const pool = require('../config/database');
const { registrarCriacao } = require('../services/assistente/sessoes');

const TABELAS = {
  propostas: { tipo: 'proposta', nome: 'Proposta' },
  analises_projeto: { tipo: 'analise', nome: 'Análise de projeto' },
  laudos_projetos: { tipo: 'projeto', nome: 'Projeto' },
};

function linkDo(tipo, id) {
  if (tipo === 'proposta') return `/propostas/editar/${id}`;
  if (tipo === 'analise') return `/obras/analise/${id}`;
  if (tipo === 'projeto') return `/obras?aba=projetos&laudo=${id}`;
  if (tipo === 'obra') return `/obras/${id}`;
  return null;
}

const idCriado = (campo, exigeStatus) => (corpo, status) => {
  if (exigeStatus && status !== exigeStatus) return null;
  return corpo?.[campo] || null;
};

// [método, caminho da rota, regras]
//   exigir:  tabela cujo :id precisa ter sido criado pelo assistente nesta conversa
//   vinculadas: confere também a proposta Ativa que a operação ATUALIZARIA
//   marcar:  { tabela, id(corpo, status) } — marca o registro criado
const ROTAS = [
  // leitura
  ['GET', '/obras'], ['GET', '/obras/:id'],
  ['GET', '/propostas'], ['GET', '/propostas/:id'],
  ['GET', '/clientes'],
  ['GET', '/materiais'], ['GET', '/materiais/categorias'], ['POST', '/materiais/comparar'],
  ['GET', '/servicos'], ['GET', '/servicos/segmento'], ['GET', '/mao-de-obra-itens'],
  ['GET', '/pesquisa-mercado/historico'],
  ['GET', '/projetos/disciplinas'], ['GET', '/projetos/analises'], ['GET', '/projetos/analises/:id'],
  ['GET', '/laudos'], ['GET', '/laudos/disciplinas'], ['GET', '/laudos/modelo/:disciplina'], ['GET', '/laudos/:id'],
  ['GET', '/laudos/:id/arquitetura'],
  ['GET', '/composicoes'], ['GET', '/composicoes/:id'],
  // cálculos que não gravam
  ['POST', '/laudos/:id/calcular'], ['POST', '/composicoes/explodir'], ['POST', '/composicoes/calcular'],
  // pesquisa de preço (gasta cota; tem o limite de uso da rota)
  ['POST', '/pesquisa-mercado'],
  // criação de rascunho (marcada)
  ['POST', '/projetos/analisar', { marcar: { tabela: 'analises_projeto', id: idCriado('id') } }],
  ['POST', '/laudos/de-analise', { marcar: { tabela: 'laudos_projetos', id: idCriado('id', 201) } }],
  ['POST', '/laudos', { soProjeto: true, marcar: { tabela: 'laudos_projetos', id: idCriado('id', 201) } }],
  ['POST', '/propostas', { marcar: { tabela: 'propostas', id: idCriado('id', 201) } }],
  // alteração do que ELE criou nesta conversa
  ['PUT', '/propostas/:id', { exigir: 'propostas' }],
  ['PUT', '/projetos/analises/:id', { exigir: 'analises_projeto' }],
  ['PUT', '/laudos/:id', { exigir: 'laudos_projetos' }],
  ['POST', '/laudos/:id/arquitetura', { exigir: 'laudos_projetos' }],
  ['POST', '/projetos/analises/:id/gerar-orcamento', {
    exigir: 'analises_projeto', vinculadas: 'analise',
    marcar: { tabela: 'propostas', id: (c) => (c?.criada ? c.propostaId : null) },
  }],
  ['POST', '/laudos/:id/gerar-orcamento', {
    exigir: 'laudos_projetos', vinculadas: 'laudo',
    marcar: { tabela: 'propostas', id: (c) => (c?.criada ? c.propostaId : null) },
  }],
  // ferramentas próprias do assistente (routes/v2/assistente.js)
  ['GET', '/assistente/ferramentas/contexto'],
  ['GET', '/assistente/ferramentas/arquivos'],
  ['GET', '/assistente/ferramentas/arquivos/:id'],
  ['GET', '/assistente/ferramentas/arquivos/:id/conteudo'],
  ['GET', '/assistente/ferramentas/norma'],
  ['GET', '/assistente/ferramentas/historico-preco'],
  ['POST', '/assistente/ferramentas/acoes'],
];

const MAPA = new Map(ROTAS.map(([m, c, r]) => [`${m} ${c}`, r || {}]));
const rotasPermitidas = () => ROTAS.map(([m, c]) => `${m} ${c}`);

const NAO_PERMITIDO = 'O assistente não pode fazer isso sozinho. Use a ferramenta propor_acao: a ação fica pendente e o usuário confirma clicando "Aplicar".';
const NAO_CRIOU = 'O assistente só altera o que ele mesmo criou nesta conversa. Para alterar este registro, use propor_acao (o usuário confirma).';

const idValido = (v) => /^\d{1,10}$/.test(String(v)) && Number(v) >= 1 && Number(v) <= 2147483647;

async function conversaDoRegistro(tabela, id) {
  const { rows } = await pool.query(`SELECT assistente_conversa_id FROM ${tabela} WHERE id = $1`, [id]);
  return rows.length ? { existe: true, conversa: rows[0].assistente_conversa_id } : { existe: false };
}

// Proposta Ativa que a geração de orçamento ATUALIZARIA (em vez de criar uma nova)
async function propostasVinculadas(tipo, id, corpo) {
  if (tipo === 'analise') {
    const { rows } = await pool.query('SELECT proposta_id FROM analises_projeto WHERE id = $1', [id]);
    return rows[0]?.proposta_id ? [rows[0].proposta_id] : [];
  }
  const { rows } = await pool.query('SELECT propostas FROM laudos_projetos WHERE id = $1', [id]);
  const mapa = rows[0]?.propostas || {};
  const modo = corpo?.modo;
  return modo && mapa[modo] ? [mapa[modo]] : [];
}

function marcarAoResponder(req, res, regra, execucao) {
  const original = res.json.bind(res);
  res.json = (corpo) => {
    let id = null;
    try { id = res.statusCode >= 200 && res.statusCode < 300 ? regra.id(corpo, res.statusCode) : null; } catch { id = null; }
    if (!idValido(id)) return original(corpo);
    const tabela = regra.tabela;
    const extra = tabela === 'propostas' ? 'numero' : tabela === 'laudos_projetos' ? 'disciplina, titulo' : 'nome_projeto, cliente_nome';
    pool.query(
      `UPDATE ${tabela} SET assistente_conversa_id = $1 WHERE id = $2 AND assistente_conversa_id IS NULL RETURNING id, ${extra}`,
      [execucao.conversaId, id]
    ).then(({ rows }) => {
      if (!rows[0]) return;
      const r = rows[0];
      const { tipo, nome } = TABELAS[tabela];
      const rotulo = tabela === 'propostas' ? `Proposta ${r.numero}`
        : tabela === 'laudos_projetos' ? `Projeto #${r.id} — ${r.disciplina}${r.titulo ? ` (${r.titulo})` : ''}`
          : `${nome} #${r.id}${r.nome_projeto || r.cliente_nome ? ` — ${r.nome_projeto || r.cliente_nome}` : ''}`;
      registrarCriacao(execucao.exec, { tipo, id: r.id, rotulo, link: linkDo(tipo, r.id) });
    }).catch((e) => {
      console.error(`[assistente] não marcou ${tabela} #${id}:`, e.message);
    }).finally(() => original(corpo));
    return res;
  };
}

// (req, res, next, execucao) — execucao = registro da execução do token (já conferido)
async function aplicarEscopoAssistente(req, res, next, execucao) {
  const caminho = req.route?.path;
  const chave = `${req.method} ${caminho}`;
  const regra = typeof caminho === 'string' ? MAPA.get(chave) : undefined;
  if (!regra) return res.status(403).json({ erro: NAO_PERMITIDO, codigo: 'ASSISTENTE_NAO_PERMITIDO' });
  req.assistente = { conversaId: execucao.conversaId, exec: execucao.exec, mensagemId: execucao.mensagemId };
  try {
    if (regra.soProjeto && req.body?.tipo !== 'projeto') {
      return res.status(403).json({ erro: 'O assistente cria só projetos por disciplina (rascunho). Laudo é pedido pelo usuário em "Novo laudo".', codigo: 'ASSISTENTE_NAO_PERMITIDO' });
    }
    if (regra.exigir && idValido(req.params.id)) {
      const r = await conversaDoRegistro(regra.exigir, req.params.id);
      if (r.existe && r.conversa !== execucao.conversaId) {
        return res.status(403).json({ erro: NAO_CRIOU, codigo: 'ASSISTENTE_NAO_CRIOU' });
      }
    }
    if (regra.vinculadas && idValido(req.params.id)) {
      for (const pid of await propostasVinculadas(regra.vinculadas, req.params.id, req.body)) {
        const { rows: [p] } = await pool.query('SELECT status, assistente_conversa_id FROM propostas WHERE id = $1', [pid]);
        if (p && p.status === 'Ativa' && p.assistente_conversa_id !== execucao.conversaId) {
          return res.status(403).json({
            erro: 'Gerar o orçamento daqui ATUALIZARIA uma proposta que o assistente não criou nesta conversa. Use propor_acao para o usuário decidir.',
            codigo: 'ASSISTENTE_NAO_CRIOU',
          });
        }
      }
    }
    if (regra.marcar) marcarAoResponder(req, res, regra.marcar, execucao);
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { aplicarEscopoAssistente, rotasPermitidas };
