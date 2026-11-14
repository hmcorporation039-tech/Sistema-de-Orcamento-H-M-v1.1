// Notas fiscais de serviço — lista, detalhe e o rascunho: criar, editar, apagar, duplicar ("clonador")
// e criar a partir de uma proposta.
const pool = require('../../config/database');
const { registrarAuditoria } = require('../../services/auditoria');
const { parsePaginacao, montarResposta } = require('../../utils/paginacao');
const {
  digitos, VALORES, CAMPOS_RASCUNHO, calcularTotais, tomadorDoCliente, servicoDaEmpresa, dadosDoRascunho, lerNota,
} = require('./comum');

// ── Lista, detalhe ─────────────────────────────────────────────────────────

const ORDEM = "COALESCE(n.data_emissao, n.criado_em) DESC, n.id DESC";

async function listar(req, res) {
  const { busca, situacao, de, ate } = req.query;
  const { pagina, porPagina, offset } = parsePaginacao(req.query);
  const cond = [];
  const params = [];
  if (busca) {
    params.push(`%${String(busca).trim()}%`, digitos(busca) || '§');
    cond.push(`(n.tomador->>'nome' ILIKE $${params.length - 1} OR n.discriminacao ILIKE $${params.length - 1}
      OR n.tomador->>'documento' LIKE '%' || $${params.length} || '%' OR n.numero::text = $${params.length})`);
  }
  if (['rascunho', 'emitida', 'cancelada', 'substituida'].includes(situacao)) { params.push(situacao); cond.push(`n.situacao = $${params.length}`); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(de || '')) { params.push(de); cond.push(`n.competencia >= $${params.length}`); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(ate || '')) { params.push(ate); cond.push(`n.competencia <= $${params.length}`); }
  if (Number(req.query.cliente_id)) { params.push(Number(req.query.cliente_id)); cond.push(`n.cliente_id = $${params.length}`); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const [{ rows: [tot] }, { rows }] = await Promise.all([
    pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE situacao = 'emitida')::int AS emitidas,
              COALESCE(sum(valor_servicos) FILTER (WHERE situacao = 'emitida'), 0) AS valor_emitido,
              COALESCE(sum(valor_liquido) FILTER (WHERE situacao = 'emitida'), 0) AS liquido_emitido,
              count(*) FILTER (WHERE situacao = 'rascunho')::int AS rascunhos
         FROM notas_fiscais n ${where}`, params),
    pool.query(
      `SELECT n.id, n.situacao, n.origem, n.padrao, n.numero, n.chave_acesso, n.codigo_verificacao, n.data_emissao,
              n.competencia, n.cliente_id, n.tomador->>'nome' AS tomador_nome, n.tomador->>'documento' AS tomador_documento,
              n.tomador->>'email' AS tomador_email, n.ctrib_nac, n.item_lista, n.discriminacao, n.valor_servicos, n.valor_liquido,
              n.iss_retido, n.ultimo_envio_em, n.ultimo_envio_para, (n.xml IS NOT NULL) AS tem_xml,
              n.proposta_id, (SELECT pr.numero FROM propostas pr WHERE pr.id = n.proposta_id) AS proposta_numero,
              n.atestado_enviado_em, n.atestado_enviado_para,
              (SELECT COALESCE(sum(f.valor), 0) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido_valor,
              (SELECT max(f.data_hora) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido_em
         FROM notas_fiscais n ${where} ORDER BY ${ORDEM}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, porPagina, offset]),
  ]);
  res.json({ ...montarResposta(rows, tot.total, pagina, porPagina), totais: tot });
}

async function obter(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  delete n.xml;
  res.json(n);
}

// ── Rascunho: criar, editar, apagar, duplicar ─────────────────────────────

async function criar(req, res) {
  const { d, erro } = await dadosDoRascunho(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows: [n] } = await pool.query(
    `INSERT INTO notas_fiscais (${CAMPOS_RASCUNHO.join(', ')}, criado_por)
     VALUES (${CAMPOS_RASCUNHO.map((_, i) => `$${i + 1}`).join(', ')}, $${CAMPOS_RASCUNHO.length + 1}) RETURNING id`,
    [...CAMPOS_RASCUNHO.map(c => d[c]), req.usuario.id]);
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'criar', usuarioId: req.usuario.id, detalhes: { valor: d.valor_servicos } });
  res.status(201).json(await lerNota(n.id).then(x => { delete x.xml; return x; }));
}

async function atualizar(req, res) {
  const atual = await lerNota(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Nota não encontrada' });
  if (atual.situacao !== 'rascunho') return res.status(409).json({ erro: 'Só o rascunho pode ser editado. Para mudar uma nota emitida, duplique-a.' });
  const base = { ...atual, competencia: atual.competencia instanceof Date ? atual.competencia.toISOString().slice(0, 10) : atual.competencia };
  const { d, erro } = await dadosDoRascunho(req.body, base);
  if (erro) return res.status(400).json({ erro });
  await pool.query(
    `UPDATE notas_fiscais SET ${CAMPOS_RASCUNHO.map((c, i) => `${c} = $${i + 1}`).join(', ')}, atualizado_em = NOW()
      WHERE id = $${CAMPOS_RASCUNHO.length + 1} AND situacao = 'rascunho'`,
    [...CAMPOS_RASCUNHO.map(c => d[c]), atual.id]);
  const n = await lerNota(atual.id);
  delete n.xml;
  res.json(n);
}

async function remover(req, res) {
  const { rows: [n] } = await pool.query("DELETE FROM notas_fiscais WHERE id = $1 AND situacao = 'rascunho' RETURNING id", [req.params.id]);
  if (!n) return res.status(409).json({ erro: 'Só o rascunho pode ser apagado. Nota emitida se cancela.' });
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'excluir', usuarioId: req.usuario.id, detalhes: {} });
  res.json({ mensagem: 'Rascunho apagado' });
}

// "Clonador": copia serviço, descrição, valores e retenções para um rascunho
// novo. Opcional no corpo: cliente_ids (uma cópia para cada cliente) — os
// códigos do serviço e os dados do tomador são relidos do cadastro de hoje.
async function duplicar(req, res) {
  const origem = await lerNota(req.params.id);
  if (!origem) return res.status(404).json({ erro: 'Nota não encontrada' });
  const pedidos = Array.isArray(req.body?.cliente_ids) && req.body.cliente_ids.length
    ? [...new Set(req.body.cliente_ids.map(Number).filter(Boolean))].slice(0, 50)
    : [origem.cliente_id];
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const criados = [];
  for (const clienteId of pedidos) {
    const tomador = clienteId ? await tomadorDoCliente(clienteId) : null;
    const s = origem.servico_id ? await servicoDaEmpresa(origem.servico_id) : null;
    const d = { ...origem };
    for (const c of VALORES) d[c] = Number(origem[c] || 0);
    d.aliquota_iss = origem.aliquota_iss == null ? null : Number(origem.aliquota_iss);
    Object.assign(d, {
      cliente_id: tomador ? clienteId : null,
      tomador: JSON.stringify(tomador || {}),
      competencia: hoje,
      iss_retido: tomador ? !!tomador.retem_iss || origem.iss_retido : origem.iss_retido,
      ...(s ? { ctrib_nac: s.ctrib_nac, ctrib_mun: s.ctrib_mun, nbs: s.nbs, cnae: s.cnae, servico_descricao: s.ctrib_nac_descricao } : {}),
    });
    calcularTotais(d);
    const { rows: [n] } = await pool.query(
      `INSERT INTO notas_fiscais (${CAMPOS_RASCUNHO.join(', ')}, nota_origem_id, criado_por)
       VALUES (${CAMPOS_RASCUNHO.map((_, i) => `$${i + 1}`).join(', ')}, $${CAMPOS_RASCUNHO.length + 1}, $${CAMPOS_RASCUNHO.length + 2}) RETURNING id`,
      [...CAMPOS_RASCUNHO.map(c => d[c]), origem.id, req.usuario.id]);
    criados.push(n.id);
  }
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: origem.id, acao: 'duplicar', usuarioId: req.usuario.id, detalhes: { novas: criados } });
  res.status(201).json({ ids: criados, mensagem: criados.length === 1 ? 'Cópia criada como rascunho' : `${criados.length} rascunhos criados` });
}

// Rascunho de nota a partir de uma proposta (cliente, valor total e local vêm dela). O serviço fiscal (código de tributação,
// alíquota, município) é o da última nota do cliente — ou da última nota registrada, se o cliente é novo. Só cria RASCUNHO: o
// administrador confere e emite como sempre. Uma proposta que já tem nota ativa pede confirmação (`confirmar: true`).
async function criarDeProposta(req, res) {
  const propostaId = Number(req.body?.proposta_id);
  if (!Number.isInteger(propostaId) || propostaId <= 0) return res.status(400).json({ erro: 'Escolha a proposta.' });
  const { rows: [p] } = await pool.query('SELECT id, numero, total, cliente_id, local_obra, status FROM propostas WHERE id = $1', [propostaId]);
  if (!p) return res.status(404).json({ erro: 'Proposta não encontrada.' });
  if (['Cancelada', 'Recusada'].includes(p.status)) return res.status(400).json({ erro: `A proposta está ${p.status.toLowerCase()}.` });
  if (!p.cliente_id) return res.status(400).json({ erro: 'A proposta não tem cliente cadastrado: cadastre o cliente antes de gerar a nota.' });
  if (!(Number(p.total) > 0)) return res.status(400).json({ erro: 'A proposta não tem valor total.' });
  const { rows: ativas } = await pool.query(
    "SELECT id, numero, situacao FROM notas_fiscais WHERE proposta_id = $1 AND situacao IN ('rascunho', 'emitida') ORDER BY id", [p.id]);
  if (ativas.length && req.body?.confirmar !== true) {
    return res.status(409).json({ erro: `Esta proposta já tem ${ativas.length > 1 ? 'notas' : 'nota'} (${ativas.map(a => (a.numero ? `nº ${a.numero}` : 'rascunho')).join(', ')}). Confirme para criar mais um rascunho (nota parcial, por exemplo).`, ja_tem_nota: true });
  }
  const { rows: [base] } = await pool.query(
    `SELECT servico_id, aliquota_iss, codigo_municipio_prestacao FROM notas_fiscais
      WHERE servico_id IS NOT NULL AND situacao IN ('emitida', 'rascunho')
      ORDER BY (cliente_id = $1) DESC, (situacao = 'emitida') DESC, id DESC LIMIT 1`, [p.cliente_id]);
  if (!base) return res.status(409).json({ erro: 'Ainda não há nota anterior para copiar o serviço fiscal. Crie o primeiro rascunho à mão (Nova nota).' });
  const tomador = await tomadorDoCliente(p.cliente_id);
  if (!tomador) return res.status(400).json({ erro: 'O cliente da proposta está inativo ou foi removido.' });
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const { d, erro } = await dadosDoRascunho({
    cliente_id: p.cliente_id, servico_id: base.servico_id, valor_servicos: Number(p.total), competencia: hoje,
    discriminacao: `Prestação de serviços conforme proposta comercial nº ${p.numero}${p.local_obra ? ` — ${String(p.local_obra).trim()}` : ''}.`.slice(0, 2000),
    aliquota_iss: base.aliquota_iss, iss_retido: !!tomador.retem_iss, codigo_municipio_prestacao: base.codigo_municipio_prestacao,
  });
  if (erro) return res.status(400).json({ erro });
  const { rows: [n] } = await pool.query(
    `INSERT INTO notas_fiscais (${CAMPOS_RASCUNHO.join(', ')}, criado_por, proposta_id)
     VALUES (${CAMPOS_RASCUNHO.map((_, i) => `$${i + 1}`).join(', ')}, $${CAMPOS_RASCUNHO.length + 1}, $${CAMPOS_RASCUNHO.length + 2}) RETURNING id`,
    [...CAMPOS_RASCUNHO.map(c => d[c]), req.usuario.id, p.id]);
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'criar_de_proposta', usuarioId: req.usuario.id, detalhes: { proposta_id: p.id, valor: d.valor_servicos } });
  res.status(201).json({ id: n.id, mensagem: `Rascunho criado a partir da proposta ${p.numero}: confira o texto, o valor e o serviço antes de emitir.` });
}

module.exports = { listar, obter, criar, atualizar, remover, duplicar, criarDeProposta };
