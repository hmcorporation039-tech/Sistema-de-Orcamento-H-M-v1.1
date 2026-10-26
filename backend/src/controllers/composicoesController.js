// Composições e kits (versão 2.0, Fase 3H) — regras em utils/composicoes.js.
// Listar, ver, calcular e explodir: qualquer usuário logado (o editor de
// orçamento insere kits). Criar, editar, duplicar, ativar/desativar e excluir:
// administrador (mesmo padrão da tabela de preços de mão de obra).
const pool = require('../config/database');
const { comTransacao } = require('../utils/transacao');
const { registrarAuditoria } = require('../utils/auditoria');
const { versaoDoPedido } = require('../utils/versao');
const { segmentoPorNomeDoCliente } = require('../utils/precosMaoDeObraReferencia');
const C = require('../utils/composicoes');

const MSG_CONFLITO = 'Esta composição foi alterada por outra pessoa (ou em outra aba) depois que você a abriu. Recarregue para ver a versão atual — suas alterações não foram gravadas.';

// ── bases para o custo (catálogo e serviços), só do que os itens usam ──
async function carregarBases(executor, itens) {
  const idsMat = [...new Set(itens.filter(i => i.material_id).map(i => Number(i.material_id)))];
  const materiais = {};
  if (idsMat.length) {
    const { rows } = await executor.query(
      'SELECT id, codigo, descricao, unidade, preco, ativo, categoria, ncm FROM materiais WHERE id = ANY($1::int[])', [idsMat]);
    for (const m of rows) materiais[m.id] = m;
  }
  // serviços: todos (são ~300 linhas) — a fusão de um livre pode apontar para qualquer código
  const servicos = {};
  if (itens.some(i => i.servico_codigo)) {
    const { rows } = await executor.query(
      'SELECT codigo, descricao, unidade, disciplina, ativo, fundido_em, valor_referencia, valor_publico, valor_privado FROM precos_mao_de_obra_referencia');
    for (const s of rows) servicos[s.codigo] = s;
  }
  return { materiais, servicos };
}

async function itensDe(executor, ids) {
  if (!ids.length) return new Map();
  const { rows } = await executor.query(
    `SELECT composicao_id, tipo, material_id, servico_codigo, coeficiente::float8 AS coeficiente, descricao, unidade
       FROM composicao_itens WHERE composicao_id = ANY($1::int[]) ORDER BY composicao_id, ordem, id`, [ids]);
  const mapa = new Map(ids.map(id => [id, []]));
  for (const r of rows) mapa.get(r.composicao_id).push(r);
  return mapa;
}

const resumoCusto = (custos) => Object.fromEntries(Object.entries(custos).map(([seg, c]) => [seg, {
  custo_unitario: c.custo_unitario, itens_a_cotar: c.itens_a_cotar, completo: c.completo,
}]));

// GET /composicoes?busca=&disciplina=&inativos=1 — lista com o custo nos dois segmentos
async function listar(req, res) {
  const cond = [];
  const params = [];
  if (req.query.inativos !== '1') cond.push('c.ativo = true');
  if (req.query.disciplina) { params.push(String(req.query.disciplina)); cond.push(`c.disciplina = $${params.length}`); }
  if (req.query.busca) {
    params.push(`%${String(req.query.busca).trim()}%`);
    cond.push(`(c.descricao ILIKE $${params.length} OR c.codigo ILIKE $${params.length})`);
  }
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.codigo, c.descricao, c.unidade, c.disciplina, c.observacao, c.ativo, c.origem, c.versao,
              c.criado_em, c.atualizado_em, u.nome AS usuario_nome
         FROM composicoes c LEFT JOIN usuarios u ON u.id = c.usuario_id
        ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
        ORDER BY c.disciplina, c.descricao`, params);
    const itensPor = await itensDe(pool, rows.map(r => r.id));
    const bases = await carregarBases(pool, [...itensPor.values()].flat());
    const itens = rows.map(r => {
      const its = itensPor.get(r.id) || [];
      return { ...r, n_itens: its.length, custo: resumoCusto(C.calcularCustoNosSegmentos(its, bases)) };
    });
    res.json({ itens });
  } catch (err) {
    console.error('Erro ao listar composições:', err);
    res.status(500).json({ erro: 'Erro ao listar as composições' });
  }
}

async function buscarCompleta(executor, filtro) {
  const porCodigo = filtro.codigo != null;
  const { rows: [c] } = await executor.query(
    `SELECT c.*, u.nome AS usuario_nome FROM composicoes c LEFT JOIN usuarios u ON u.id = c.usuario_id
      WHERE ${porCodigo ? 'UPPER(c.codigo) = UPPER($1)' : 'c.id = $1'}`, [porCodigo ? String(filtro.codigo).trim() : filtro.id]);
  if (!c) return null;
  const itens = (await itensDe(executor, [c.id])).get(c.id);
  const bases = await carregarBases(executor, itens);
  return { composicao: { ...c, itens }, bases };
}

// GET /composicoes/:id — com os itens e o custo item a item nos dois segmentos
async function buscarUma(req, res) {
  try {
    const achada = await buscarCompleta(pool, { id: Number(req.params.id) });
    if (!achada) return res.status(404).json({ erro: 'Composição não encontrada' });
    const { composicao, bases } = achada;
    res.json({ ...composicao, custo: C.calcularCustoNosSegmentos(composicao.itens, bases) });
  } catch (err) {
    console.error('Erro ao buscar composição:', err);
    res.status(500).json({ erro: 'Erro ao buscar a composição' });
  }
}

// Confere os vínculos e troca a cópia (descrição/unidade) pela do catálogo/da
// base no momento do vínculo. Devolve { erro } ou { itens }.
async function conferirVinculos(executor, itens) {
  const idsMat = [...new Set(itens.filter(i => i.material_id).map(i => i.material_id))];
  const codigos = [...new Set(itens.filter(i => i.servico_codigo).map(i => i.servico_codigo))];
  const mats = new Map();
  const srvs = new Map();
  if (idsMat.length) {
    const { rows } = await executor.query('SELECT id, descricao, unidade FROM materiais WHERE id = ANY($1::int[])', [idsMat]);
    rows.forEach(r => mats.set(r.id, r));
  }
  if (codigos.length) {
    const { rows } = await executor.query('SELECT codigo, descricao, unidade FROM precos_mao_de_obra_referencia WHERE codigo = ANY($1)', [codigos]);
    rows.forEach(r => srvs.set(r.codigo, r));
  }
  const saida = [];
  for (const [i, it] of itens.entries()) {
    if (it.material_id) {
      const mt = mats.get(it.material_id);
      if (!mt) return { erro: `Item ${i + 1}: material #${it.material_id} não existe no catálogo` };
      saida.push({ ...it, descricao: String(mt.descricao).slice(0, 300), unidade: String(mt.unidade || it.unidade).slice(0, 10) });
    } else if (it.servico_codigo) {
      const sv = srvs.get(it.servico_codigo);
      if (!sv) return { erro: `Item ${i + 1}: serviço "${it.servico_codigo}" não existe na base de serviços` };
      saida.push({ ...it, descricao: String(sv.descricao).slice(0, 300), unidade: String(sv.unidade || it.unidade).slice(0, 10) });
    } else {
      saida.push(it);
    }
  }
  return { itens: saida };
}

async function gravarItens(client, composicaoId, itens) {
  await client.query('DELETE FROM composicao_itens WHERE composicao_id = $1', [composicaoId]);
  for (const [ordem, it] of itens.entries()) {
    await client.query(
      `INSERT INTO composicao_itens (composicao_id, ordem, tipo, material_id, servico_codigo, coeficiente, descricao, unidade)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [composicaoId, ordem, it.tipo, it.material_id, it.servico_codigo, it.coeficiente, it.descricao, it.unidade]
    );
  }
}

async function codigoLivre(executor, disciplina) {
  const { rows } = await executor.query('SELECT codigo FROM composicoes WHERE codigo ILIKE $1', ['KIT-%']);
  return C.proximoCodigo(disciplina, rows.map(r => r.codigo));
}

const erroDeBanco = (res, err, acao) => {
  if (err.code === '23505') return res.status(409).json({ erro: 'Já existe uma composição com esse código' });
  console.error(`Erro ao ${acao} composição:`, err);
  return res.status(500).json({ erro: `Erro ao ${acao} a composição` });
};

// POST /composicoes (admin)
async function criar(req, res) {
  const { erro, dados } = C.validarComposicao(req.body);
  if (erro) return res.status(400).json({ erro });
  try {
    const resultado = await comTransacao(async (client) => {
      const conf = await conferirVinculos(client, dados.itens);
      if (conf.erro) return { status: 400, erro: conf.erro };
      const codigo = dados.codigo || await codigoLivre(client, dados.disciplina);
      const { rows: [nova] } = await client.query(
        `INSERT INTO composicoes (codigo, descricao, unidade, disciplina, observacao, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, codigo, versao`,
        [codigo, dados.descricao, dados.unidade, dados.disciplina, dados.observacao ?? null, req.usuario.id]);
      await gravarItens(client, nova.id, conf.itens);
      return { nova };
    });
    if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
    res.status(201).json({ mensagem: 'Composição criada', ...resultado.nova });
  } catch (err) {
    erroDeBanco(res, err, 'criar');
  }
}

// PUT /composicoes/:id (admin) — descrição, unidade, disciplina, observação,
// código e itens (a lista enviada substitui a anterior). Com `versao`, só grava
// se ninguém gravou depois (409); a versão sobe a cada edição.
async function atualizar(req, res) {
  const { erro, dados } = C.validarComposicao(req.body, { parcial: true });
  if (erro) return res.status(400).json({ erro });
  const id = Number(req.params.id);
  try {
    const resultado = await comTransacao(async (client) => {
      const { rows: [atual] } = await client.query('SELECT id, versao FROM composicoes WHERE id = $1 FOR UPDATE', [id]);
      if (!atual) return { status: 404, erro: 'Composição não encontrada' };
      const versao = versaoDoPedido(req.body);
      if (versao != null && versao !== atual.versao) return { status: 409, erro: MSG_CONFLITO, versaoAtual: atual.versao };
      let itens = null;
      if (dados.itens) {
        const conf = await conferirVinculos(client, dados.itens);
        if (conf.erro) return { status: 400, erro: conf.erro };
        itens = conf.itens;
      }
      const { rows: [nova] } = await client.query(
        `UPDATE composicoes SET
            codigo = COALESCE($1, codigo), descricao = COALESCE($2, descricao), unidade = COALESCE($3, unidade),
            disciplina = COALESCE($4, disciplina),
            observacao = CASE WHEN $5::boolean THEN $6 ELSE observacao END,
            versao = versao + 1, atualizado_em = NOW()
          WHERE id = $7 RETURNING id, codigo, versao, atualizado_em`,
        [dados.codigo ?? null, dados.descricao ?? null, dados.unidade ?? null, dados.disciplina ?? null,
          'observacao' in dados, dados.observacao ?? null, id]);
      if (itens) await gravarItens(client, id, itens);
      return { nova };
    });
    if (resultado.erro) {
      return res.status(resultado.status).json({
        erro: resultado.erro, ...(resultado.status === 409 ? { codigo: 'CONFLITO_VERSAO', versaoAtual: resultado.versaoAtual } : {}),
      });
    }
    res.json({ mensagem: 'Composição salva', ...resultado.nova });
  } catch (err) {
    erroDeBanco(res, err, 'salvar');
  }
}

// POST /composicoes/:id/duplicar (admin) — cópia com código novo, para variar um kit
async function duplicar(req, res) {
  try {
    const resultado = await comTransacao(async (client) => {
      const achada = await buscarCompleta(client, { id: Number(req.params.id) });
      if (!achada) return { status: 404, erro: 'Composição não encontrada' };
      const o = achada.composicao;
      const codigo = await codigoLivre(client, o.disciplina);
      const { rows: [nova] } = await client.query(
        `INSERT INTO composicoes (codigo, descricao, unidade, disciplina, observacao, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, codigo, versao`,
        [codigo, `${o.descricao} (cópia)`.slice(0, 300), o.unidade, o.disciplina, o.observacao, req.usuario.id]);
      await gravarItens(client, nova.id, o.itens);
      return { nova };
    });
    if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
    res.status(201).json({ mensagem: 'Composição duplicada', ...resultado.nova });
  } catch (err) {
    erroDeBanco(res, err, 'duplicar');
  }
}

// PUT /composicoes/:id/ativo (admin) { ativo } — desativada some da escolha no orçamento
async function definirAtivo(req, res) {
  const ativo = req.body?.ativo;
  if (typeof ativo !== 'boolean') return res.status(400).json({ erro: 'Informe ativo: true ou false' });
  try {
    const { rows: [c] } = await pool.query(
      'UPDATE composicoes SET ativo = $1, versao = versao + 1, atualizado_em = NOW() WHERE id = $2 RETURNING id, codigo, ativo, versao',
      [ativo, Number(req.params.id)]);
    if (!c) return res.status(404).json({ erro: 'Composição não encontrada' });
    res.json(c);
  } catch (err) {
    erroDeBanco(res, err, 'alterar');
  }
}

// DELETE /composicoes/:id (admin) — exclui de vez (as propostas não guardam a
// composição, só os itens já inseridos). Fica na auditoria com os itens.
async function remover(req, res) {
  try {
    const resultado = await comTransacao(async (client) => {
      const achada = await buscarCompleta(client, { id: Number(req.params.id) });
      if (!achada) return null;
      const c = achada.composicao;
      await client.query('DELETE FROM composicoes WHERE id = $1', [c.id]);
      return c;
    });
    if (!resultado) return res.status(404).json({ erro: 'Composição não encontrada' });
    const { itens, codigo, descricao } = resultado;
    await registrarAuditoria(pool, { entidade: 'composicao', entidadeId: resultado.id, acao: 'excluida', detalhes: { codigo, descricao, itens }, usuarioId: req.usuario.id });
    res.json({ mensagem: 'Composição excluída' });
  } catch (err) {
    erroDeBanco(res, err, 'excluir');
  }
}

// POST /composicoes/calcular { itens } — custo de um rascunho (tela de edição)
// nos dois segmentos, sem gravar nada
async function calcular(req, res) {
  const { erro, dados } = C.validarComposicao({ descricao: '-', itens: req.body?.itens });
  if (erro) return res.status(400).json({ erro });
  try {
    const bases = await carregarBases(pool, dados.itens);
    res.json({ custo: C.calcularCustoNosSegmentos(dados.itens, bases) });
  } catch (err) {
    console.error('Erro ao calcular composição:', err);
    res.status(500).json({ erro: 'Erro ao calcular a composição' });
  }
}

// POST /composicoes/explodir { codigo | id, quantidade, segmento | cliente }
// → os itens prontos para inserir na proposta (ver utils/composicoes.js)
async function explodir(req, res) {
  const { codigo, id, quantidade, cliente } = req.body || {};
  if (!codigo && !id) return res.status(400).json({ erro: 'Informe o código da composição' });
  try {
    const achada = await buscarCompleta(pool, codigo ? { codigo } : { id: Number(id) });
    if (!achada) return res.status(404).json({ erro: 'Composição não encontrada' });
    const { composicao, bases } = achada;
    if (!composicao.ativo) return res.status(400).json({ erro: 'Esta composição está desativada' });
    let segmento = req.body?.segmento;
    if (segmento !== 'publico' && segmento !== 'privado') segmento = cliente ? await segmentoPorNomeDoCliente(String(cliente)) : 'privado';
    const custo = C.calcularCusto(composicao.itens, bases, segmento);
    const resultado = C.explodirComposicao(composicao, custo, quantidade);
    if (resultado.erro) return res.status(400).json({ erro: resultado.erro });
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao explodir composição:', err);
    res.status(500).json({ erro: 'Erro ao montar os itens da composição' });
  }
}

module.exports = { listar, buscarUma, criar, atualizar, duplicar, definirAtivo, remover, calcular, explodir };
