// Obras (versão 2.0, Fase 2D): a obra junta análise de projeto, laudos,
// propostas, contratos de prestador e movimentos do financeiro de um mesmo
// empreendimento. Regras puras (orçado × realizado, status) em utils/obras.js.
//
// Permissões (padrão do projeto): ver/listar = qualquer usuário logado;
// editar e ligar/desligar itens = dono da obra ou administrador (posse);
// excluir = administrador. Contratos e financeiro continuam só de admin: para
// os demais usuários, a obra mostra o orçado e esconde realizado/recebido,
// contratos e movimentos (`restrito_financeiro: true`).
const pool = require('../config/database');
const O = require('../utils/obras');
const P = require('../utils/pastasSistema');
const { comTransacao } = require('../utils/transacao');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');
const { versaoDoPedido, responderConflitoOuAusente } = require('../utils/versao');
const { registrarAuditoria } = require('../utils/auditoria');
const { segmentoDoCliente } = require('../utils/precosMaoDeObraReferencia');
const { condicaoPodeAbrirOS } = require('../utils/campo');
const { pastaDaObra, sincronizarObra, caminhoRegistrado, resumoPasta, pedidoLocal, seguro } = require('../services/pastasRegistros');

const ehAdmin = (req) => req.usuario?.role === 'admin';
const podeEditar = (req, obra) => ehAdmin(req) || obra.usuario_id == null || obra.usuario_id === req.usuario.id;

// Itens que podem ser ligados a uma obra: tabela, rótulo e se é só de admin.
const VINCULOS = {
  proposta: { tabela: 'propostas', rotulo: 'Proposta', admin: false },
  analise: { tabela: 'analises_projeto', rotulo: 'Análise', admin: false },
  laudo: { tabela: 'laudos_projetos', rotulo: 'Laudo', admin: false },
  contrato: { tabela: 'contratos', rotulo: 'Contrato', admin: true },
  movimento: { tabela: 'financeiro_movimentos', rotulo: 'Movimento', admin: true },
};

// ── validação ───────────────────────────────────────────────────────────
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
function dataOuNull(v) {
  if (v == null || v === '') return { valor: null };
  const s = String(v).slice(0, 10);
  if (!DATA_RE.test(s) || Number.isNaN(new Date(`${s}T12:00:00`).getTime())) return { erro: true };
  return { valor: s };
}
const inteiroOuNull = (v) => {
  if (v == null || v === '') return { valor: null };
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 2147483647 ? { valor: n } : { erro: true };
};
// coluna DATE lida pelo pg vem como Date à meia-noite local → 'AAAA-MM-DD'
const dataLocal = (v) => {
  if (!v) return null;
  if (!(v instanceof Date)) return String(v).slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
};
const texto = (v, max) => (v == null ? null : String(v).trim().slice(0, max) || null);

// Junta o pedido sobre a obra atual (edição parcial: campo ausente fica como
// está) e confere tudo. Devolve { dados } ou { erro }.
async function montarDados(body, atual = {}) {
  const tem = (k) => Object.prototype.hasOwnProperty.call(body || {}, k);
  const d = {
    nome: tem('nome') ? texto(body.nome, 200) : atual.nome,
    cliente_id: atual.cliente_id ?? null,
    cliente_nome: tem('cliente_nome') ? texto(body.cliente_nome, 200) : atual.cliente_nome ?? null,
    local: tem('local') ? texto(body.local, 2000) : atual.local ?? null,
    segmento: tem('segmento') && body.segmento ? String(body.segmento) : atual.segmento ?? null,
    status: tem('status') && body.status ? String(body.status) : atual.status || 'orcamento',
    inicio_previsto: atual.inicio_previsto ?? null,
    fim_previsto: atual.fim_previsto ?? null,
    responsavel_id: atual.responsavel_id ?? null,
    observacoes: tem('observacoes') ? texto(body.observacoes, 5000) : atual.observacoes ?? null,
  };
  if (!d.nome) return { erro: 'Informe o nome da obra.' };
  if (!O.STATUS_OBRA.includes(d.status)) return { erro: 'Status da obra inválido.' };
  if (d.segmento && !O.SEGMENTOS.includes(d.segmento)) return { erro: 'Segmento inválido (use publico ou privado).' };
  for (const k of ['inicio_previsto', 'fim_previsto']) {
    if (!tem(k)) { d[k] = dataLocal(d[k]); continue; }
    const r = dataOuNull(body[k]);
    if (r.erro) return { erro: 'Data inválida (use AAAA-MM-DD).' };
    d[k] = r.valor;
  }
  if (d.inicio_previsto && d.fim_previsto && d.fim_previsto < d.inicio_previsto) return { erro: 'O fim previsto não pode ser anterior ao início.' };
  if (tem('responsavel_id')) {
    const r = inteiroOuNull(body.responsavel_id);
    if (r.erro) return { erro: 'Responsável inválido.' };
    if (r.valor) {
      const { rows } = await pool.query('SELECT 1 FROM usuarios WHERE id = $1 AND ativo = true', [r.valor]);
      if (!rows.length) return { erro: 'Responsável não encontrado.' };
    }
    d.responsavel_id = r.valor;
  }
  let clienteMudou = false;
  if (tem('cliente_id')) {
    const r = inteiroOuNull(body.cliente_id);
    if (r.erro) return { erro: 'Cliente inválido.' };
    clienteMudou = r.valor !== (atual.cliente_id ?? null);
    d.cliente_id = r.valor;
  }
  let cliente = null;
  if (d.cliente_id) {
    cliente = (await pool.query('SELECT id, nome, tipo FROM clientes WHERE id = $1', [d.cliente_id])).rows[0];
    if (!cliente) return { erro: 'Cliente não encontrado.' };
    // a cópia do nome acompanha o cadastro quando o cliente muda (ou veio sem nome)
    if (clienteMudou || !d.cliente_nome) d.cliente_nome = cliente.nome;
  }
  // segmento: padrão pelo tipo do cliente (órgão público → oficial); muda com o cliente se não veio no pedido
  if (!d.segmento || (clienteMudou && !(tem('segmento') && body.segmento))) d.segmento = segmentoDoCliente(cliente?.tipo, d.cliente_nome);
  return { dados: d };
}

// Próximo código OB-AAAA-NNN — trava a numeração dentro da transação.
async function gerarCodigo(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('obras_codigo'))");
  const ano = new Date().getFullYear();
  const { rows } = await client.query('SELECT codigo FROM obras WHERE codigo LIKE $1', [`OB-${ano}-%`]);
  return O.formatarCodigo(ano, O.proximoSequencial(rows.map(r => r.codigo), ano));
}

// ── totais (regra única de utils/obras.js) ─────────────────────────────
async function resumosDasObras(ids, admin) {
  const mapa = new Map(ids.map(id => [id, { propostas: [], movimentos: [], contratos: [] }]));
  if (!ids.length) return mapa;
  const props = await pool.query('SELECT id, obra_id, status, total, data FROM propostas WHERE obra_id = ANY($1::int[])', [ids]);
  for (const p of props.rows) mapa.get(p.obra_id).propostas.push(p);
  if (admin) {
    const movs = await pool.query('SELECT obra_id, tipo, SUM(valor) AS valor FROM financeiro_movimentos WHERE obra_id = ANY($1::int[]) GROUP BY obra_id, tipo', [ids]);
    for (const m of movs.rows) mapa.get(m.obra_id).movimentos.push(m);
    const ctrs = await pool.query('SELECT obra_id, SUM(valor) AS valor FROM contratos WHERE obra_id = ANY($1::int[]) GROUP BY obra_id', [ids]);
    for (const c of ctrs.rows) mapa.get(c.obra_id).contratos.push(c);
  }
  const resumos = new Map();
  for (const [id, dados] of mapa) resumos.set(id, esconderFinanceiro(O.resumoFinanceiro(dados), admin));
  return resumos;
}

function esconderFinanceiro(resumo, admin) {
  if (admin) return resumo;
  return { ...resumo, realizado: null, recebido: null, contratado: null, margem: null, margem_pct: null, a_receber: null };
}

const SQL_CONTAGENS = `
  (SELECT count(*)::int FROM analises_projeto x WHERE x.obra_id = o.id) AS qtd_analises,
  (SELECT count(*)::int FROM laudos_projetos x WHERE x.obra_id = o.id AND x.tipo = 'laudo') AS qtd_laudos,
  (SELECT count(*)::int FROM laudos_projetos x WHERE x.obra_id = o.id AND x.tipo = 'projeto') AS qtd_projetos,
  (SELECT count(*)::int FROM propostas x WHERE x.obra_id = o.id) AS qtd_propostas,
  (SELECT count(*)::int FROM contratos x WHERE x.obra_id = o.id) AS qtd_contratos,
  (SELECT count(*)::int FROM financeiro_movimentos x WHERE x.obra_id = o.id) AS qtd_movimentos`;

// ── rotas ───────────────────────────────────────────────────────────────

// GET /obras?busca=&status=&cliente_id=&segmento=&pagina=&porPagina=&campos=basico
async function listar(req, res, next) {
  try {
    const { busca, status, segmento } = req.query;
    const basico = req.query.campos === 'basico';
    const { pagina, porPagina, offset } = parsePaginacao(req.query, basico ? 1000 : 30);
    const cond = [];
    const params = [];
    if (busca) {
      params.push(`%${String(busca).trim()}%`);
      cond.push(`(o.codigo ILIKE $${params.length} OR o.nome ILIKE $${params.length} OR o.cliente_nome ILIKE $${params.length} OR o.local ILIKE $${params.length})`);
    }
    if (status) {
      const lista = String(status).split(',').filter(s => O.STATUS_OBRA.includes(s));
      if (!lista.length) return res.status(400).json({ erro: 'Status inválido.' });
      params.push(lista);
      cond.push(`o.status = ANY($${params.length}::text[])`);
    }
    if (segmento) {
      if (!O.SEGMENTOS.includes(segmento)) return res.status(400).json({ erro: 'Segmento inválido.' });
      params.push(segmento);
      cond.push(`o.segmento = $${params.length}`);
    }
    if (req.query.cliente_id) {
      const r = inteiroOuNull(req.query.cliente_id);
      if (r.erro) return res.status(400).json({ erro: 'Cliente inválido.' });
      params.push(r.valor);
      cond.push(`o.cliente_id = $${params.length}`);
    }
    // ?pode_abrir_os=1 — só as obras em que o usuário pode abrir OS pelo app de
    // campo (a mesma regra da operação criar_os, em utils/campo.js)
    if (['1', 'true', 'sim'].includes(String(req.query.pode_abrir_os || '').toLowerCase())) {
      cond.push(condicaoPodeAbrirOS(req.usuario, params, 'o'));
    }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const total = await pool.query(`SELECT count(*) FROM obras o ${where}`, params);
    const colunas = basico
      ? 'o.id, o.codigo, o.nome, o.cliente_id, o.cliente_nome, o.local, o.status, o.segmento'
      : `o.*, u.nome AS responsavel_nome, ${SQL_CONTAGENS}`;
    const { rows } = await pool.query(
      `SELECT ${colunas} FROM obras o LEFT JOIN usuarios u ON u.id = o.responsavel_id ${where}
        ORDER BY ${basico ? 'o.nome' : 'o.atualizado_em DESC, o.id DESC'}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, porPagina, offset]
    );
    if (!basico) {
      const resumos = await resumosDasObras(rows.map(r => r.id), ehAdmin(req));
      for (const r of rows) {
        r.resumo = resumos.get(r.id);
        r.pode_editar = podeEditar(req, r);
        if (!ehAdmin(req)) { r.qtd_contratos = null; r.qtd_movimentos = null; }
      }
    }
    const totalObras = parseInt(total.rows[0].count, 10);
    // ?campos=basico (listas de escolha) vem numa página só de até 1000: acima
    // disso a lista era cortada sem aviso — `incompleto` avisa quem chamou
    const incompleto = offset + rows.length < totalObras;
    if (incompleto) res.set('X-Lista-Truncada', '1');
    res.json({ ...montarResposta(rows, totalObras, pagina, porPagina), incompleto, restrito_financeiro: !ehAdmin(req) });
  } catch (err) {
    next(err);
  }
}

async function carregarObra(id, executor = pool) {
  const { rows } = await executor.query(
    `SELECT o.*, u.nome AS responsavel_nome, c.nome AS usuario_nome, cl.tipo AS cliente_tipo
       FROM obras o
       LEFT JOIN usuarios u ON u.id = o.responsavel_id
       LEFT JOIN usuarios c ON c.id = o.usuario_id
       LEFT JOIN clientes cl ON cl.id = o.cliente_id
      WHERE o.id = $1`, [id]);
  return rows[0] || null;
}

// GET /obras/:id — obra + itens ligados + resumo orçado × realizado × recebido
async function buscarUma(req, res, next) {
  try {
    const obra = await carregarObra(req.params.id);
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
    const id = obra.id;
    const admin = ehAdmin(req);
    const [analises, laudos, propostas] = await Promise.all([
      pool.query(`SELECT a.id, a.nome_projeto, a.cliente_nome, a.finalidade, a.disciplinas, a.proposta_id, p.numero AS proposta_numero,
                         a.usuario_id, u.nome AS usuario_nome, a.criado_em, a.atualizado_em, (a.pasta_obra_id = a.obra_id) AS pasta_na_obra
                    FROM analises_projeto a LEFT JOIN propostas p ON p.id = a.proposta_id LEFT JOIN usuarios u ON u.id = a.usuario_id
                   WHERE a.obra_id = $1 ORDER BY a.atualizado_em DESC`, [id]),
      pool.query(`SELECT l.id, l.tipo, l.disciplina, l.titulo, l.cliente_nome, l.propostas, l.gerar_orcamento, l.analise_id,
                         l.dados->'meta'->>'revisao' AS revisao, l.usuario_id, u.nome AS usuario_nome, l.criado_em, l.atualizado_em,
                         (l.pasta_obra_id = l.obra_id) AS pasta_na_obra
                    FROM laudos_projetos l LEFT JOIN usuarios u ON u.id = l.usuario_id
                   WHERE l.obra_id = $1 ORDER BY l.atualizado_em DESC`, [id]),
      pool.query(`SELECT p.id, p.numero, p.data, p.cliente_nome, p.local_obra, p.status, p.total, p.usuario_id, u.nome AS usuario_nome, p.atualizado_em
                    FROM propostas p LEFT JOIN usuarios u ON u.id = p.usuario_id
                   WHERE p.obra_id = $1 ORDER BY p.sequencial DESC`, [id]),
    ]);
    let contratos = { rows: [] };
    let movimentos = { rows: [] };
    if (admin) {
      [contratos, movimentos] = await Promise.all([
        pool.query(`SELECT c.id, c.codigo_registro, c.objeto, c.local_obra, c.periodo_inicio, c.periodo_fim, c.valor, pr.nome AS prestador_nome
                      FROM contratos c JOIN prestadores pr ON pr.id = c.prestador_id
                     WHERE c.obra_id = $1 ORDER BY c.periodo_inicio DESC, c.id DESC`, [id]),
        pool.query(`SELECT fm.id, fm.tipo, fm.nome, fm.valor, fm.data_hora, fm.categoria, fm.origem, pr.nome AS prestador_nome
                      FROM financeiro_movimentos fm LEFT JOIN prestadores pr ON pr.id = fm.prestador_id
                     WHERE fm.obra_id = $1 ORDER BY fm.data_hora DESC`, [id]),
      ]);
    }
    const resumo = esconderFinanceiro(O.resumoFinanceiro({
      propostas: propostas.rows, movimentos: movimentos.rows, contratos: contratos.rows,
    }), admin);
    res.json({
      ...obra,
      analises: analises.rows, laudos: laudos.rows, propostas: propostas.rows,
      contratos: contratos.rows, movimentos: movimentos.rows,
      resumo, restrito_financeiro: !admin, pode_editar: podeEditar(req, obra), pode_excluir: admin,
    });
  } catch (err) {
    next(err);
  }
}

// POST /obras
async function criar(req, res, next) {
  try {
    const r = await montarDados(req.body);
    if (r.erro) return res.status(400).json({ erro: r.erro });
    const d = r.dados;
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'responsavel_id')) d.responsavel_id = req.usuario.id;
    const obra = await comTransacao(async (client) => {
      const codigo = await gerarCodigo(client);
      const { rows } = await client.query(
        `INSERT INTO obras (codigo, nome, cliente_id, cliente_nome, local, segmento, status, inicio_previsto, fim_previsto,
                            responsavel_id, observacoes, usuario_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [codigo, d.nome, d.cliente_id, d.cliente_nome, d.local, d.segmento, d.status, d.inicio_previsto, d.fim_previsto,
         d.responsavel_id, d.observacoes, req.usuario.id]
      );
      return rows[0];
    });
    await sincronizarObra(obra); // cria Arquivos do Sistema\Obras\<nome>
    res.status(201).json(await carregarObra(obra.id));
  } catch (err) {
    next(err);
  }
}

// PUT /obras/:id (posse) — edição parcial com bloqueio otimista por `versao`
async function atualizar(req, res, next) {
  try {
    const atual = await carregarObra(req.params.id);
    if (!atual) return res.status(404).json({ erro: 'Obra não encontrada.' });
    const r = await montarDados(req.body, atual);
    if (r.erro) return res.status(400).json({ erro: r.erro });
    const d = r.dados;
    const { rows } = await pool.query(
      `UPDATE obras SET nome=$1, cliente_id=$2, cliente_nome=$3, local=$4, segmento=$5, status=$6, inicio_previsto=$7,
              fim_previsto=$8, responsavel_id=$9, observacoes=$10, atualizado_em=NOW(), versao=versao+1
        WHERE id=$11 AND ($12::int IS NULL OR versao = $12) RETURNING *`,
      [d.nome, d.cliente_id, d.cliente_nome, d.local, d.segmento, d.status, d.inicio_previsto, d.fim_previsto,
       d.responsavel_id, d.observacoes, atual.id, versaoDoPedido(req.body)]
    );
    if (!rows[0]) return responderConflitoOuAusente(pool, res, 'obras', atual.id);
    if (rows[0].nome !== atual.nome || !rows[0].pasta) await sincronizarObra(rows[0]); // pasta acompanha o nome
    res.json(await carregarObra(atual.id));
  } catch (err) {
    next(err);
  }
}

// DELETE /obras/:id (admin) — só obra vazia; com itens ligados → 409
async function remover(req, res, next) {
  try {
    const id = Number(req.params.id);
    const resultado = await comTransacao(async (client) => {
      const { rows: [obra] } = await client.query('SELECT * FROM obras WHERE id = $1 FOR UPDATE', [id]);
      if (!obra) return { status: 404 };
      const { rows: [n] } = await client.query(
        `SELECT (SELECT count(*) FROM analises_projeto WHERE obra_id = $1 OR pasta_obra_id = $1)::int AS analises,
                (SELECT count(*) FROM laudos_projetos WHERE obra_id = $1 OR pasta_obra_id = $1)::int AS laudos,
                (SELECT count(*) FROM propostas WHERE obra_id = $1)::int AS propostas,
                (SELECT count(*) FROM contratos WHERE obra_id = $1)::int AS contratos,
                (SELECT count(*) FROM financeiro_movimentos WHERE obra_id = $1)::int AS movimentos,
                (SELECT count(*) FROM ordens_servico WHERE obra_id = $1)::int AS ordens_servico,
                (SELECT count(*) FROM obra_medicoes WHERE obra_id = $1)::int AS medicoes`, [id]);
      const total = Object.values(n).reduce((s, v) => s + v, 0);
      if (total > 0) return { status: 409, vinculos: n };
      await client.query('DELETE FROM obras WHERE id = $1', [id]);
      await registrarAuditoria(client, { entidade: 'obras', entidadeId: id, acao: 'excluir', usuarioId: req.usuario.id, detalhes: { obra } });
      return { status: 200, obra };
    });
    if (resultado.status === 404) return res.status(404).json({ erro: 'Obra não encontrada.' });
    if (resultado.status === 409) {
      const v = resultado.vinculos;
      const partes = [['analises', 'análise(s)'], ['laudos', 'projeto(s)/laudo(s) por disciplina'], ['propostas', 'proposta(s)'], ['contratos', 'contrato(s)'], ['movimentos', 'movimento(s)'], ['ordens_servico', 'ordem(ns) de serviço'], ['medicoes', 'medição(ões) do cronograma']]
        .filter(([k]) => v[k] > 0).map(([k, r]) => `${v[k]} ${r}`);
      return res.status(409).json({
        codigo: 'OBRA_COM_VINCULOS', vinculos: v,
        erro: `Esta obra tem itens ligados (${partes.join(', ')}). Para tirá-la da lista, mude o status para "Cancelada" ou "Concluída"; para excluir, desligue os itens antes.`,
      });
    }
    // pasta (vazia ou com arquivos postos à mão) vai para _Excluídos
    await seguro(`excluir obra ${id}`, () => P.moverParaExcluidos('obra', resultado.obra.pasta));
    res.json({ mensagem: `Obra ${resultado.obra.codigo} excluída.` });
  } catch (err) {
    next(err);
  }
}

// PUT /obras/:id/vinculos { tipo, id, ligar } (posse da obra) — liga um item
// existente a esta obra (tirando de outra, se estava) ou desliga daqui.
// O item também precisa poder ser alterado por quem pede (dono ou admin);
// contrato e movimento são só de admin, como as telas deles.
async function vincular(req, res, next) {
  try {
    const obraId = Number(req.params.id);
    const { tipo } = req.body || {};
    const cfg = VINCULOS[tipo];
    if (!cfg) return res.status(400).json({ erro: 'Tipo inválido (use proposta, analise, laudo, contrato ou movimento).' });
    const item = inteiroOuNull(req.body.id);
    if (item.erro || !item.valor) return res.status(400).json({ erro: 'Item inválido.' });
    const ligar = req.body.ligar !== false;
    if (cfg.admin && !ehAdmin(req)) return res.status(403).json({ erro: 'Somente administradores ligam contratos e movimentos do financeiro.' });
    const { rows: [row] } = await pool.query(`SELECT id, obra_id, usuario_id FROM ${cfg.tabela} WHERE id = $1`, [item.valor]);
    if (!row) return res.status(404).json({ erro: `${cfg.rotulo} não encontrado(a).` });
    if (!cfg.admin && !ehAdmin(req) && row.usuario_id != null && row.usuario_id !== req.usuario.id) {
      return res.status(403).json({ erro: `${cfg.rotulo} criado(a) por outro usuário. Peça a ele ou a um administrador para ligar à obra.` });
    }
    let novo = row.obra_id;
    if (ligar) {
      await pool.query(`UPDATE ${cfg.tabela} SET obra_id = $1 WHERE id = $2`, [obraId, row.id]);
      novo = obraId;
    } else if (row.obra_id === obraId) {
      await pool.query(`UPDATE ${cfg.tabela} SET obra_id = NULL WHERE id = $1 AND obra_id = $2`, [row.id, obraId]);
      novo = null;
    }
    const afetadas = [...new Set([obraId, row.obra_id].filter(Boolean))];
    await pool.query('UPDATE obras SET atualizado_em = NOW() WHERE id = ANY($1::int[])', [afetadas]);
    res.json({ ok: true, tipo, id: row.id, obra_id: novo, obra_anterior: row.obra_id });
  } catch (err) {
    next(err);
  }
}

// GET /obras/:id/pasta — Arquivos do Sistema\Obras\<obra> + pastas antigas dos itens ligados
async function pasta(req, res, next) {
  try {
    const obra = await carregarObra(req.params.id);
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
    const dir = await seguro(`pasta obra ${obra.id}`, () => pastaDaObra(obra));
    const outras = [];
    const analises = (await pool.query('SELECT a.*, o.pasta AS pasta_obra_dir FROM analises_projeto a LEFT JOIN obras o ON o.id = a.pasta_obra_id WHERE a.obra_id = $1 AND a.pasta IS NOT NULL AND a.pasta_obra_id IS DISTINCT FROM $1', [obra.id])).rows;
    for (const a of analises) outras.push({ tipo: 'analise', id: a.id, rotulo: a.nome_projeto || a.cliente_nome || `Análise ${a.id}`, caminho: await caminhoRegistrado('projeto', a) });
    const laudos = (await pool.query('SELECT l.*, o.pasta AS pasta_obra_dir FROM laudos_projetos l LEFT JOIN obras o ON o.id = l.pasta_obra_id WHERE l.obra_id = $1 AND l.pasta IS NOT NULL AND l.pasta_obra_id IS DISTINCT FROM $1', [obra.id])).rows;
    // tipo_registro (2.1): 'projeto' | 'laudo' — a tela mostra "Projeto #…" ou "Laudo #…"
    for (const l of laudos) outras.push({ tipo: 'laudo', tipo_registro: l.tipo, id: l.id, rotulo: l.titulo || `${l.tipo === 'projeto' ? 'Projeto' : 'Laudo'} ${l.id}`, caminho: await caminhoRegistrado('laudo', l) });
    res.json({ ...(await resumoPasta(dir)), podeAbrir: pedidoLocal(req), outras });
  } catch (err) {
    next(err);
  }
}

async function abrirPasta(req, res, next) {
  if (!pedidoLocal(req)) return res.status(400).json({ erro: 'A pasta só pode ser aberta no PC onde o sistema roda.' });
  try {
    const obra = await carregarObra(req.params.id);
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
    P.abrirNoExplorer(await pastaDaObra(obra));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// POST /obras/:id/pasta/pacote (2.3) — pacote de análise com os PDF/DWG/DXF/ZIP que
// JÁ estão na pasta da obra (o projeto que o cliente mandou por e-mail e alguém
// salvou lá). O que o próprio sistema gerou (propostas, contratos, laudos,
// documentos dos projetos) vem desmarcado: o usuário marca se quiser.
const RE_GERADO_PELO_SISTEMA = /^(Propostas|Contratos|Laudos|Projetos)\//i;
async function pacoteDaPasta(req, res, next) {
  try {
    const obra = await carregarObra(req.params.id);
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
    const dir = await seguro(`pasta obra ${obra.id}`, () => pastaDaObra(obra));
    if (!dir) return res.status(400).json({ erro: 'A pasta da obra não está disponível neste servidor.' });
    const todos = (await P.listarArquivos(dir))
      .map(a => ({ ...a, rel: a.arquivo.replace(/\\/g, '/') }))
      .filter(a => /\.(pdf|dwg|dxf|zip)$/i.test(a.rel));
    if (!todos.length) return res.status(400).json({ erro: `Não há PDF, DWG, DXF nem ZIP na pasta da obra (${dir}). Salve lá os arquivos recebidos do cliente, ou envie pela tela.` });
    // os recebidos primeiro (o pacote aceita até 60 arquivos)
    const ordenados = [...todos.filter(a => !RE_GERADO_PELO_SISTEMA.test(a.rel)), ...todos.filter(a => RE_GERADO_PELO_SISTEMA.test(a.rel))];
    const recebidos = ordenados.map(a => ({ originalname: a.rel.split('/').pop(), path: require('path').join(dir, a.arquivo), caminho: a.rel }));
    const pacote = await require('../services/pacotesProjeto').receberPacote(recebidos, req.usuario);
    for (const it of pacote.arquivos) it.incluirSugerido = !RE_GERADO_PELO_SISTEMA.test(it.caminho);
    res.status(201).json({ ...pacote, pasta: dir });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ erro: err.message });
    next(err);
  }
}

module.exports = { listar, buscarUma, criar, atualizar, remover, vincular, pasta, abrirPasta, pacoteDaPasta };
