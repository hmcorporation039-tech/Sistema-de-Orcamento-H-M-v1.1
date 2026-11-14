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
const P = require('../services/pastasSistema');
const { comTransacao } = require('../services/transacao');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');
const { versaoDoPedido, responderConflitoOuAusente } = require('../utils/versao');
const { registrarAuditoria } = require('../services/auditoria');
const { segmentoDoCliente } = require('../services/precosMaoDeObraReferencia');
const { condicaoPodeAbrirOS } = require('../utils/campo');
const { ehDataIso, hojeBrasilia, dataLocalIso } = require('../utils/dataHoje');
const { pastaDaObra, sincronizarObra, caminhoRegistrado, seguro, rotasDePasta } = require('../services/pastasRegistros');

// regra de quem edita a obra: utils/obras.js (a mesma do cronograma e do campo)
const ehAdmin = (req) => O.ehAdmin(req.usuario);
const podeEditar = (req, obra) => O.podeEditarObra(req.usuario, obra);

// Itens que podem ser ligados a uma obra: tabela, rótulo e se é só de admin.
const VINCULOS = {
  proposta: { tabela: 'propostas', rotulo: 'Proposta', admin: false },
  analise: { tabela: 'analises_projeto', rotulo: 'Análise', admin: false },
  laudo: { tabela: 'laudos_projetos', rotulo: 'Laudo', admin: false },
  contrato: { tabela: 'contratos', rotulo: 'Contrato', admin: true },
  movimento: { tabela: 'financeiro_movimentos', rotulo: 'Movimento', admin: true },
};

// ── validação ───────────────────────────────────────────────────────────
function dataOuNull(v) {
  if (v == null || v === '') return { valor: null };
  const s = String(v).slice(0, 10);
  if (!ehDataIso(s)) return { erro: true }; // 2026-02-31 não existe (antes passava e virava 500)
  return { valor: s };
}
const inteiroOuNull = (v) => {
  if (v == null || v === '') return { valor: null };
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 2147483647 ? { valor: n } : { erro: true };
};
// coluna DATE lida pelo pg vem como Date à meia-noite local → 'AAAA-MM-DD'
const dataLocal = dataLocalIso;
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
  const ano = Number(hojeBrasilia().slice(0, 4)); // ano em Brasília (como o código da OS do campo)
  const { rows } = await client.query('SELECT codigo FROM obras WHERE codigo LIKE $1', [`OB-${ano}-%`]);
  return O.formatarCodigo(ano, O.proximoSequencial(rows.map(r => r.codigo), ano));
}

// ── totais (regra única de utils/obras.js) ─────────────────────────────
// Notas fiscais emitidas das propostas da obra (o "faturado"). Notas são do financeiro: só para administrador.
// recebido = Pix ligados à nota (financeiro_movimentos.nota_id), para a baixa manual e a coluna da tabela.
const SQL_NOTA_FATURADA = `n.id, n.numero, n.data_emissao, n.tomador->>'nome' AS tomador_nome, n.valor_servicos, n.valor_liquido,
       n.baixa_manual_em, n.proposta_id, pr.numero AS proposta_numero,
       (SELECT COALESCE(sum(f.valor), 0) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido
  FROM notas_fiscais n JOIN propostas pr ON pr.id = n.proposta_id`;

// Próximo passo de várias obras (lista): o que a regra de utils/obras.js (proximoPasso) precisa, em poucas consultas.
// O % físico só é calculado na página da obra (precisa do cronograma inteiro); aqui fica null.
async function passosDasObras(obras, resumos, admin) {
  const ids = obras.map(o => o.id);
  const passos = new Map();
  if (!ids.length) return passos;
  const [props, analises, crono, juntadas] = await Promise.all([
    pool.query('SELECT id, obra_id, numero, status FROM propostas WHERE obra_id = ANY($1::int[])', [ids]),
    pool.query(`SELECT id, obra_id FROM analises_projeto WHERE obra_id = ANY($1::int[]) AND proposta_id IS NULL
                  AND COALESCE(finalidade, 'orcamento') = 'orcamento' ORDER BY id DESC`, [ids]),
    pool.query('SELECT DISTINCT obra_id FROM obra_etapas WHERE obra_id = ANY($1::int[])', [ids]),
    pool.query('SELECT o.id, j.codigo FROM obras o JOIN obras j ON j.id = o.juntada_a WHERE o.id = ANY($1::int[])', [ids]),
  ]);
  const por = (rows) => rows.reduce((m, r) => m.set(r.obra_id, [...(m.get(r.obra_id) || []), r]), new Map());
  const propsPor = por(props.rows);
  const analisesPor = por(analises.rows);
  const comCrono = new Set(crono.rows.map(r => r.obra_id));
  const codigoJuntada = new Map(juntadas.rows.map(r => [r.id, r.codigo]));
  for (const o of obras) {
    passos.set(o.id, O.proximoPasso({
      id: o.id, status: o.status, juntada_a: o.juntada_a, juntada_codigo: codigoJuntada.get(o.id),
      propostas: propsPor.get(o.id) || [], analises_sem_proposta: analisesPor.get(o.id) || [],
      qtd_analises: o.qtd_analises, qtd_projetos: o.qtd_projetos, tem_cronograma: comCrono.has(o.id),
      fisico_realizado: null, a_receber_faturado: admin ? resumos.get(o.id)?.a_receber_faturado ?? null : null,
    }));
  }
  return passos;
}

async function resumosDasObras(ids, admin) {
  const mapa = new Map(ids.map(id => [id, { propostas: [], movimentos: [], contratos: [], notas: [] }]));
  if (!ids.length) return mapa;
  const props = await pool.query('SELECT id, obra_id, status, total, data FROM propostas WHERE obra_id = ANY($1::int[])', [ids]);
  for (const p of props.rows) mapa.get(p.obra_id).propostas.push(p);
  if (admin) {
    const movs = await pool.query('SELECT obra_id, tipo, SUM(valor) AS valor FROM financeiro_movimentos WHERE obra_id = ANY($1::int[]) GROUP BY obra_id, tipo', [ids]);
    for (const m of movs.rows) mapa.get(m.obra_id).movimentos.push(m);
    const ctrs = await pool.query('SELECT obra_id, SUM(valor) AS valor FROM contratos WHERE obra_id = ANY($1::int[]) GROUP BY obra_id', [ids]);
    for (const c of ctrs.rows) mapa.get(c.obra_id).contratos.push(c);
    const notas = await pool.query(`SELECT pr.obra_id, ${SQL_NOTA_FATURADA} WHERE pr.obra_id = ANY($1::int[]) AND n.situacao = 'emitida'`, [ids]);
    for (const n of notas.rows) mapa.get(n.obra_id).notas.push(n);
  }
  const resumos = new Map();
  for (const [id, dados] of mapa) resumos.set(id, esconderFinanceiro(O.resumoFinanceiro(dados), admin));
  return resumos;
}

function esconderFinanceiro(resumo, admin) {
  if (admin) return resumo;
  return { ...resumo, realizado: null, recebido: null, contratado: null, sem_custos: null, margem: null, margem_pct: null, a_receber: null,
    faturado: null, faturado_liquido: null, baixado_manual: null, qtd_notas: null, a_receber_faturado: null };
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
  const { busca, status, segmento } = req.query;
  const basico = req.query.campos === 'basico';
  const { pagina, porPagina, offset } = parsePaginacao(req.query, basico ? 1000 : 30);
  const cond = [];
  const params = [];
  if (busca) {
    params.push(`%${String(busca).trim()}%`);
    cond.push(`(o.codigo ILIKE $${params.length} OR o.nome ILIKE $${params.length} OR o.cliente_nome ILIKE $${params.length} OR o.local ILIKE $${params.length})`);
  }
  let condStatus = null;
  if (status) {
    const lista = String(status).split(',').filter(s => O.STATUS_OBRA.includes(s));
    if (!lista.length) return res.status(400).json({ erro: 'Status inválido.' });
    params.push(lista);
    condStatus = `o.status = ANY($${params.length}::text[])`;
    cond.push(condStatus);
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
  let contagemStatus;
  if (!basico) {
    const resumos = await resumosDasObras(rows.map(r => r.id), ehAdmin(req));
    const passos = await passosDasObras(rows, resumos, ehAdmin(req));
    for (const r of rows) {
      r.resumo = resumos.get(r.id);
      r.proximo_passo = passos.get(r.id);
      r.pode_editar = podeEditar(req, r);
      if (!ehAdmin(req)) { r.qtd_contratos = null; r.qtd_movimentos = null; }
    }
    // quantas obras em cada status com os MESMOS filtros, menos o de status (botões de status da lista)
    // (o parâmetro do status continua citado — sempre verdadeiro — para a numeração $n dos outros não mudar)
    const semStatus = cond.map(c => (c === condStatus ? condStatus.replace(/^o\.status = ANY\((\$\d+)::text\[\]\)$/, '$1::text[] IS NOT NULL') : c));
    const { rows: cont } = await pool.query(
      `SELECT o.status, count(*)::int AS n FROM obras o ${semStatus.length ? `WHERE ${semStatus.join(' AND ')}` : ''} GROUP BY o.status`, params);
    contagemStatus = Object.fromEntries(O.STATUS_OBRA.map(s => [s, cont.find(c => c.status === s)?.n || 0]));
  }
  const totalObras = parseInt(total.rows[0].count, 10);
  // ?campos=basico (listas de escolha) vem numa página só de até 1000: acima
  // disso a lista era cortada sem aviso — `incompleto` avisa quem chamou
  const incompleto = offset + rows.length < totalObras;
  if (incompleto) res.set('X-Lista-Truncada', '1');
  res.json({ ...montarResposta(rows, totalObras, pagina, porPagina), incompleto, restrito_financeiro: !ehAdmin(req), ...(contagemStatus ? { contagem_status: contagemStatus } : {}) });
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
  let notas = { rows: [] };
  if (admin) {
    [contratos, movimentos, notas] = await Promise.all([
      pool.query(`SELECT c.id, c.codigo_registro, c.objeto, c.local_obra, c.periodo_inicio, c.periodo_fim, c.valor, pr.nome AS prestador_nome
                    FROM contratos c JOIN prestadores pr ON pr.id = c.prestador_id
                   WHERE c.obra_id = $1 ORDER BY c.periodo_inicio DESC, c.id DESC`, [id]),
      pool.query(`SELECT fm.id, fm.tipo, fm.nome, fm.valor, fm.data_hora, fm.categoria, fm.origem, pr.nome AS prestador_nome
                    FROM financeiro_movimentos fm LEFT JOIN prestadores pr ON pr.id = fm.prestador_id
                   WHERE fm.obra_id = $1 ORDER BY fm.data_hora DESC`, [id]),
      pool.query(`SELECT ${SQL_NOTA_FATURADA} WHERE pr.obra_id = $1 AND n.situacao = 'emitida' ORDER BY n.data_emissao DESC NULLS LAST, n.id DESC`, [id]),
    ]);
  }
  const resumoCompleto = O.resumoFinanceiro({
    propostas: propostas.rows, movimentos: movimentos.rows, contratos: contratos.rows, notas: notas.rows,
  });
  const resumo = esconderFinanceiro(resumoCompleto, admin);
  // etapa e próximo passo (2.42): % físico pelo cronograma, quando houver
  const CR = require('./cronogramaController')._interno;
  let fisico = null;
  let temCronograma = false;
  const dadosCrono = await CR.carregarDados(id).catch(() => null);
  if (dadosCrono?.etapas?.length) {
    temCronograma = true;
    try { fisico = CR.calcular(dadosCrono).calc.resumo.fisico_realizado; } catch { fisico = null; }
  }
  const juntada = obra.juntada_a ? (await pool.query('SELECT id, codigo, nome FROM obras WHERE id = $1', [obra.juntada_a])).rows[0] || null : null;
  const proximo = O.proximoPasso({
    id, status: obra.status, juntada_a: obra.juntada_a, juntada_codigo: juntada?.codigo,
    propostas: propostas.rows, qtd_analises: analises.rows.length, qtd_projetos: laudos.rows.filter(l => l.tipo === 'projeto').length,
    analises_sem_proposta: analises.rows.filter(a => !a.proposta_id && (a.finalidade || 'orcamento') === 'orcamento').sort((a, b) => b.id - a.id),
    tem_cronograma: temCronograma, fisico_realizado: fisico, a_receber_faturado: admin ? resumoCompleto.a_receber_faturado : null,
  });
  res.json({
    ...obra,
    analises: analises.rows, laudos: laudos.rows, propostas: propostas.rows,
    contratos: contratos.rows, movimentos: movimentos.rows, notas: notas.rows,
    resumo, restrito_financeiro: !admin, pode_editar: podeEditar(req, obra), pode_excluir: admin,
    proximo_passo: proximo, juntada, fisico_realizado: fisico, tem_cronograma: temCronograma,
  });
}

// GET /obras/parecidas?nome=&cliente_id=&local=&excluir= — obras que parecem a mesma (aviso ao criar e
// sugestão do "juntar"). Qualquer usuário logado (é só a lista de obras, que todos veem).
async function parecidas(req, res) {
  const { nome = '', local = '', cliente_id: clienteId = null } = req.query;
  const excluir = inteiroOuNull(req.query.excluir).valor || null;
  if (String(nome).trim().length < 3 && String(local).trim().length < 3) return res.json({ itens: [] });
  const { rows } = await pool.query("SELECT id, codigo, nome, local, cliente_id, cliente_nome, status FROM obras WHERE status <> 'cancelada'");
  res.json({ itens: O.obrasParecidas({ nome, local, cliente_id: clienteId }, rows, { excluir }) });
}

// POST /obras/:id/juntar { origem_id } (admin) — junta a obra repetida (origem) NESTA (destino): tudo o que
// estava ligado à origem passa para cá (propostas, análises, projetos/laudos, contratos, movimentos, OS,
// regras do Pix, vencimentos, comparativos e o cronograma, se só a origem tinha) e a origem fica
// "cancelada", com juntada_a apontando para cá — nada é apagado, e a pasta da origem fica onde está (os
// arquivos dela aparecem em "Pastas anteriores" da obra). Dados que faltam no destino (cliente, local,
// datas, responsável) vêm da origem. Tudo numa transação, com auditoria.
const TABELAS_JUNTAR = ['propostas', 'analises_projeto', 'laudos_projetos', 'contratos', 'financeiro_movimentos',
  'ordens_servico', 'regras_movimento_obra', 'vencimentos_laudos', 'orcamentos_concorrentes'];
async function juntar(req, res) {
  const destinoId = Number(req.params.id);
  const origem = inteiroOuNull(req.body?.origem_id);
  if (origem.erro || !origem.valor) return res.status(400).json({ erro: 'Escolha a obra que será juntada a esta.' });
  if (origem.valor === destinoId) return res.status(400).json({ erro: 'Escolha outra obra: não dá para juntar a obra com ela mesma.' });
  const r = await comTransacao(async (client) => {
    // trava as duas na ordem do id (duas junções cruzadas não se travam)
    const { rows } = await client.query('SELECT * FROM obras WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [[destinoId, origem.valor]]);
    const destino = rows.find(o => o.id === destinoId);
    const org = rows.find(o => o.id === origem.valor);
    if (!destino || !org) return { status: 404, erro: 'Obra não encontrada.' };
    if (org.juntada_a) return { status: 409, erro: `A obra ${org.codigo} já foi juntada a outra.` };
    if (destino.juntada_a) return { status: 409, erro: `A obra ${destino.codigo} foi juntada a outra: junte na obra que ficou.` };
    const crono = await client.query('SELECT obra_id, count(*)::int AS n FROM obra_etapas WHERE obra_id = ANY($1::int[]) GROUP BY obra_id', [[destinoId, org.id]]);
    const cronoDe = (id) => crono.rows.find(c => c.obra_id === id)?.n || 0;
    if (cronoDe(destinoId) && cronoDe(org.id)) {
      return { status: 409, erro: `As duas obras têm cronograma. Apague o cronograma de uma delas (aba Execução) antes de juntar.` };
    }
    const movidos = {};
    for (const t of TABELAS_JUNTAR) {
      const u = await client.query(`UPDATE ${t} SET obra_id = $1 WHERE obra_id = $2`, [destinoId, org.id]);
      if (u.rowCount) movidos[t] = u.rowCount;
    }
    if (cronoDe(org.id)) {
      // o cronograma (config, etapas, medições) vem junto — o destino não tinha nenhum
      await client.query('DELETE FROM obra_cronogramas WHERE obra_id = $1', [destinoId]);
      for (const t of ['obra_cronogramas', 'obra_etapas', 'obra_medicoes']) {
        const u = await client.query(`UPDATE ${t} SET obra_id = $1 WHERE obra_id = $2`, [destinoId, org.id]);
        if (u.rowCount) movidos[t] = u.rowCount;
      }
    }
    // o que falta no destino vem da origem; o status fica o mais adiantado das duas (cancelada/concluída não puxam)
    const ordem = O.ETAPAS_OBRA;
    const status = ordem.indexOf(org.status) > ordem.indexOf(destino.status) && org.status !== 'concluida' ? org.status : destino.status;
    await client.query(
      `UPDATE obras SET cliente_id = COALESCE(cliente_id, $2), cliente_nome = COALESCE(cliente_nome, $3), local = COALESCE(NULLIF(local, ''), $4),
              inicio_previsto = COALESCE(inicio_previsto, $5), fim_previsto = COALESCE(fim_previsto, $6), responsavel_id = COALESCE(responsavel_id, $7),
              status = $8, atualizado_em = NOW(), versao = versao + 1
        WHERE id = $1`,
      [destinoId, org.cliente_id, org.cliente_nome, org.local, org.inicio_previsto, org.fim_previsto, org.responsavel_id, status]);
    const nota = `Juntada à obra ${destino.codigo} em ${hojeBrasilia().split('-').reverse().join('/')}.`;
    await client.query(
      `UPDATE obras SET status = 'cancelada', juntada_a = $2, observacoes = TRIM(BOTH E'\\n' FROM COALESCE(observacoes, '') || E'\\n' || $3),
              atualizado_em = NOW(), versao = versao + 1 WHERE id = $1`, [org.id, destinoId, nota]);
    await registrarAuditoria(client, { entidade: 'obras', entidadeId: destinoId, acao: 'juntar', usuarioId: req.usuario.id,
      detalhes: { origem: { id: org.id, codigo: org.codigo, nome: org.nome, status: org.status }, movidos } });
    return { status: 200, destino, origem: org, movidos };
  });
  if (r.status !== 200) return res.status(r.status).json({ erro: r.erro });
  const total = Object.values(r.movidos).reduce((s, n) => s + n, 0);
  res.json({ mensagem: `Obra ${r.origem.codigo} juntada à ${r.destino.codigo} (${total} ite${total === 1 ? 'm' : 'ns'} passaram para cá).`, movidos: r.movidos });
}

// POST /obras
async function criar(req, res, next) {
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
    await registrarAuditoria(client, { entidade: 'obras', entidadeId: rows[0].id, acao: 'criar', usuarioId: req.usuario.id, detalhes: { codigo, nome: d.nome } });
    return rows[0];
  });
  await sincronizarObra(obra); // cria a pasta da obra (na do cliente)
  res.status(201).json(await carregarObra(obra.id));
}

// PUT /obras/:id (posse) — edição parcial com bloqueio otimista por `versao`
async function atualizar(req, res, next) {
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
  // auditoria: só os campos que mudaram (antes a edição da obra não deixava rastro)
  const mudou = Object.keys(d).filter(k => String(atual[k] ?? '') !== String(rows[0][k] ?? ''));
  if (mudou.length) await registrarAuditoria(pool, { entidade: 'obras', entidadeId: atual.id, acao: 'editar', usuarioId: req.usuario.id, detalhes: { campos: mudou } });
  if (rows[0].nome !== atual.nome || !rows[0].pasta) await sincronizarObra(rows[0]); // pasta acompanha o nome
  res.json(await carregarObra(atual.id));
}

// DELETE /obras/:id (admin) — só obra vazia; com itens ligados → 409
async function remover(req, res, next) {
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
}

// PUT /obras/:id/vinculos { tipo, id, ligar } (posse da obra) — liga um item
// existente a esta obra (tirando de outra, se estava) ou desliga daqui.
// O item também precisa poder ser alterado por quem pede (dono ou admin);
// contrato e movimento são só de admin, como as telas deles.
async function vincular(req, res, next) {
  const obraId = Number(req.params.id);
  const { tipo } = req.body || {};
  const cfg = Object.hasOwn(VINCULOS, tipo) ? VINCULOS[tipo] : undefined;
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
    // 2.42: proposta já aprovada ligada à obra leva a obra para "contratada" (como aprovar depois de ligada)
    if (tipo === 'proposta') {
      const { rows: [p] } = await pool.query('SELECT status FROM propostas WHERE id = $1', [row.id]);
      if (p?.status === 'Aprovada') await O.avancarStatusObra(pool, obraId, 'contratada', ['prospeccao', 'orcamento']);
    }
  } else if (row.obra_id === obraId) {
    await pool.query(`UPDATE ${cfg.tabela} SET obra_id = NULL WHERE id = $1 AND obra_id = $2`, [row.id, obraId]);
    novo = null;
  }
  const afetadas = [...new Set([obraId, row.obra_id].filter(Boolean))];
  await pool.query('UPDATE obras SET atualizado_em = NOW() WHERE id = ANY($1::int[])', [afetadas]);
  res.json({ ok: true, tipo, id: row.id, obra_id: novo, obra_anterior: row.obra_id });
}

// GET /obras/:id/pasta — Arquivos do Sistema\Obras\<obra> + pastas antigas dos itens ligados
// pasta da obra e "abrir no Explorer" (pastasRegistros.rotasDePasta); a resposta
// da pasta traz também as pastas antigas de análises/laudos da obra (`outras`)
const { pasta, abrirPasta } = rotasDePasta({
  carregar: carregarObra,
  pastaDe: (obra) => seguro(`pasta obra ${obra.id}`, () => pastaDaObra(obra)),
  naoEncontrado: 'Obra não encontrada.',
  extra: async (obra) => ({ outras: await outrasPastasDaObra(obra) }),
});

async function outrasPastasDaObra(obra) {
  const outras = [];
  const analises = (await pool.query('SELECT a.*, o.pasta AS pasta_obra_dir FROM analises_projeto a LEFT JOIN obras o ON o.id = a.pasta_obra_id WHERE a.obra_id = $1 AND a.pasta IS NOT NULL AND a.pasta_obra_id IS DISTINCT FROM $1', [obra.id])).rows;
  for (const a of analises) outras.push({ tipo: 'analise', id: a.id, rotulo: a.nome_projeto || a.cliente_nome || `Análise ${a.id}`, caminho: await caminhoRegistrado('projeto', a) });
  const laudos = (await pool.query('SELECT l.*, o.pasta AS pasta_obra_dir FROM laudos_projetos l LEFT JOIN obras o ON o.id = l.pasta_obra_id WHERE l.obra_id = $1 AND l.pasta IS NOT NULL AND l.pasta_obra_id IS DISTINCT FROM $1', [obra.id])).rows;
  // tipo_registro (2.1): 'projeto' | 'laudo' — a tela mostra "Projeto #…" ou "Laudo #…"
  for (const l of laudos) outras.push({ tipo: 'laudo', tipo_registro: l.tipo, id: l.id, rotulo: l.titulo || `${l.tipo === 'projeto' ? 'Projeto' : 'Laudo'} ${l.id}`, caminho: await caminhoRegistrado('laudo', l) });
  return outras;
}

// POST /obras/:id/pasta/pacote (2.3) — pacote de análise com os PDF/DWG/DXF/ZIP que
// JÁ estão na pasta da obra (o projeto que o cliente mandou por e-mail e alguém
// salvou lá). O que o próprio sistema gerou (propostas, contratos, laudos,
// documentos dos projetos) vem desmarcado: o usuário marca se quiser. São as
// pastas que o sistema cria na obra — "Projeto" e "Projeto (A86)" das análises
// (com a cópia dos arquivos já analisados e o orçamento) inclusive — e qualquer
// arquivo que o monitor registrou como gravado pelo sistema (pasta_arquivos).
// Antes só "Projetos/" contava: o orçamento e o relatório da análise vinham
// marcados e seriam lidos como projeto (tudo contado em dobro).
const RE_GERADO_PELO_SISTEMA = /^(Propostas|Contratos|Laudos|Projetos|Projeto(?: \(A\d+\))?)\//i;
async function pacoteDaPasta(req, res, next) {
  const obra = await carregarObra(req.params.id);
  if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
  const dir = await seguro(`pasta obra ${obra.id}`, () => pastaDaObra(obra));
  if (!dir) return res.status(400).json({ erro: 'A pasta da obra não está disponível neste servidor.' });
  const todos = (await P.listarArquivos(dir))
    .map(a => ({ ...a, rel: a.arquivo.replace(/\\/g, '/') }))
    .filter(a => /\.(pdf|dwg|dxf|zip)$/i.test(a.rel));
  if (!todos.length) return res.status(400).json({ erro: `Não há PDF, DWG, DXF nem ZIP na pasta da obra (${dir}). Salve lá os arquivos recebidos do cliente, ou envie pela tela.` });
  const { rows: [atual] } = await pool.query('SELECT pasta, pasta_base FROM obras WHERE id = $1', [obra.id]);
  const prefixo = atual?.pasta_base ? `${atual.pasta_base}/${atual.pasta}/`.toLowerCase() : null;
  const doSistema = new Set(prefixo
    ? (await pool.query("SELECT LOWER(caminho) AS c FROM pasta_arquivos WHERE origem = 'sistema' AND left(LOWER(caminho), length($1)) = $1", [prefixo])).rows.map(r => r.c.slice(prefixo.length))
    : []);
  const gerado = (rel) => RE_GERADO_PELO_SISTEMA.test(rel) || doSistema.has(rel.toLowerCase());
  // os recebidos primeiro (o pacote aceita até 60 arquivos)
  const ordenados = [...todos.filter(a => !gerado(a.rel)), ...todos.filter(a => gerado(a.rel))];
  const recebidos = ordenados.map(a => ({ originalname: a.rel.split('/').pop(), path: require('path').join(dir, a.arquivo), caminho: a.rel }));
  const pacote = await require('../services/pacotesProjeto').receberPacote(recebidos, req.usuario, { nomeSugerido: obra.nome });
  for (const it of pacote.arquivos) it.incluirSugerido = !gerado(it.caminho);
  res.status(201).json({ ...pacote, pasta: dir });
}

module.exports = { listar, buscarUma, criar, atualizar, remover, vincular, pasta, abrirPasta, pacoteDaPasta, parecidas, juntar };
