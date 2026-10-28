const pool = require('../config/database');
const { periodoMesAtualBrasilia } = require('../utils/dataHoje');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const { registrarAuditoria } = require('../utils/auditoria');
const rotinas = require('../services/rotinas');
const { lerObraId, conferirObra, sqlObraJson } = require('../utils/obras');

const CATEGORIA_LABEL = { mao_de_obra: 'Mão de obra', material: 'Material', despesa: 'Despesa diária' };

// Primeiro dia do mês atual até hoje (horário de Brasília), se as datas não
// forem informadas — utils/dataHoje.js (toISOString dava o dia em UTC)
const periodoPadrao = () => periodoMesAtualBrasilia();

function montarFiltro(query) {
  const padrao = periodoPadrao();
  const dataInicio = query.dataInicio || padrao.dataInicio;
  const dataFim = query.dataFim || padrao.dataFim;
  const { tipo, busca, categoria, prestadorId } = query;

  const condicoes = ['fm.data_hora >= $1', 'fm.data_hora < ($2::date + 1)'];
  const params = [dataInicio, dataFim];

  if (tipo) {
    params.push(tipo);
    condicoes.push(`fm.tipo = $${params.length}`);
  }
  if (busca) {
    params.push(`%${busca}%`);
    condicoes.push(`fm.nome ILIKE $${params.length}`);
  }
  if (categoria) {
    params.push(categoria);
    condicoes.push(`fm.categoria = $${params.length}`);
  }
  if (prestadorId) {
    params.push(prestadorId);
    condicoes.push(`fm.prestador_id = $${params.length}`);
  }
  // obra (2.0): ?obraId=ID (movimentos da obra) ou ?obraId=sem (sem obra)
  const obraId = query.obraId ?? query.obra_id;
  if (obraId === 'sem') condicoes.push('fm.obra_id IS NULL');
  else if (obraId && Number.isInteger(Number(obraId)) && Number(obraId) > 0) {
    params.push(Number(obraId));
    condicoes.push(`fm.obra_id = $${params.length}`);
  }

  return { where: `WHERE ${condicoes.join(' AND ')}`, params, dataInicio, dataFim };
}

async function buscarMovimentosEtotais(query) {
  const { where, params, dataInicio, dataFim } = montarFiltro(query);

  const movimentos = await pool.query(
    `SELECT fm.id, fm.tipo, fm.nome, fm.valor, fm.data_hora, fm.id_transacao, fm.origem,
            fm.categoria, fm.prestador_id, p.nome AS prestador_nome,
            fm.obra_id, ${sqlObraJson('ob')} AS obra
     FROM financeiro_movimentos fm
     LEFT JOIN prestadores p ON p.id = fm.prestador_id
     LEFT JOIN obras ob ON ob.id = fm.obra_id
     ${where}
     ORDER BY fm.data_hora DESC`,
    params
  );

  const totaisResult = await pool.query(
    `SELECT
      COALESCE(SUM(fm.valor) FILTER (WHERE fm.tipo = 'recebido'), 0) AS total_recebido,
      COALESCE(SUM(fm.valor) FILTER (WHERE fm.tipo = 'realizado'), 0) AS total_realizado,
      count(*) FILTER (WHERE fm.tipo = 'recebido') AS qtd_recebido,
      count(*) FILTER (WHERE fm.tipo = 'realizado') AS qtd_realizado
     FROM financeiro_movimentos fm
     ${where}`,
    params
  );
  const t = totaisResult.rows[0];
  const totalRecebido = Number(t.total_recebido);
  const totalRealizado = Number(t.total_realizado);

  return {
    dataInicio, dataFim,
    movimentos: movimentos.rows,
    totais: {
      recebido: totalRecebido,
      realizado: totalRealizado,
      saldo: totalRecebido - totalRealizado,
      qtdRecebido: Number(t.qtd_recebido),
      qtdRealizado: Number(t.qtd_realizado),
    },
  };
}

async function listar(req, res) {
  try {
    const resultado = await buscarMovimentosEtotais(req.query);
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao listar movimentos financeiros:', err);
    res.status(500).json({ erro: 'Erro ao listar movimentos financeiros' });
  }
}

function escaparCsv(valor) {
  const texto = String(valor ?? '');
  if (/[",;\n]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

async function exportarCsv(req, res) {
  try {
    const { movimentos } = await buscarMovimentosEtotais(req.query);

    const cabecalho = ['Data', 'Tipo', 'Nome', 'Valor', 'ID Transacao', 'Prestador', 'Categoria', 'Obra'];
    const linhas = movimentos.map(m => [
      new Date(m.data_hora).toLocaleString('pt-BR'),
      m.tipo === 'recebido' ? 'Recebido' : 'Realizado',
      m.nome || '',
      Number(m.valor).toFixed(2),
      m.id_transacao || '',
      m.prestador_nome || '',
      CATEGORIA_LABEL[m.categoria] || '',
      m.obra ? `${m.obra.codigo} ${m.obra.nome}` : '',
    ].map(escaparCsv).join(';'));

    const csv = [cabecalho.join(';'), ...linhas].join('\r\n');
    const bom = '﻿';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition('financeiro-pix.csv'));
    res.send(bom + csv);
  } catch (err) {
    console.error('Erro ao exportar CSV financeiro:', err);
    res.status(500).json({ erro: 'Erro ao exportar CSV financeiro' });
  }
}

function validarMovimento(body) {
  const { tipo, valor, dataHora } = body;
  if (!['recebido', 'realizado'].includes(tipo)) return 'Tipo inválido (use recebido ou realizado)';
  if (!(Number(valor) > 0)) return 'Valor deve ser maior que zero';
  if (!dataHora || Number.isNaN(new Date(dataHora).getTime())) return 'Data/hora inválida';
  return null;
}

async function criar(req, res) {
  try {
    const erro = validarMovimento(req.body);
    if (erro) return res.status(400).json({ erro });

    const { tipo, nome, valor, dataHora, idTransacao } = req.body;
    const obra = lerObraId(req.body); // obra (2.0): obraId/obra_id opcional
    const erroObra = await conferirObra(pool, obra);
    if (erroObra) return res.status(400).json({ erro: erroObra });
    const resultado = await pool.query(
      `INSERT INTO financeiro_movimentos (tipo, nome, valor, data_hora, id_transacao, origem, usuario_id, obra_id)
       VALUES ($1,$2,$3,$4,$5,'manual',$6,$7)
       RETURNING id, tipo, nome, valor, data_hora, id_transacao, origem, obra_id`,
      [tipo, nome || null, valor, dataHora, idTransacao || null, req.usuario.id, obra.valor]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao criar movimento financeiro:', err);
    res.status(500).json({ erro: 'Erro ao criar movimento financeiro' });
  }
}

async function atualizar(req, res) {
  try {
    const erro = validarMovimento(req.body);
    if (erro) return res.status(400).json({ erro });

    const { tipo, nome, valor, dataHora, idTransacao } = req.body;
    const obra = lerObraId(req.body); // presente liga/desliga (null); ausente mantém
    const erroObra = await conferirObra(pool, obra);
    if (erroObra) return res.status(400).json({ erro: erroObra });
    const resultado = await pool.query(
      `UPDATE financeiro_movimentos
       SET tipo = $1, nome = $2, valor = $3, data_hora = $4, id_transacao = $5,
           obra_id = CASE WHEN $7::boolean THEN $8::int ELSE obra_id END
       WHERE id = $6 AND origem = 'manual'
       RETURNING id, tipo, nome, valor, data_hora, id_transacao, origem, obra_id`,
      [tipo, nome || null, valor, dataHora, idTransacao || null, req.params.id, obra.presente, obra.valor]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Lançamento manual não encontrado (movimentos importados de e-mail não podem ser editados)' });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar movimento financeiro:', err);
    res.status(500).json({ erro: 'Erro ao atualizar movimento financeiro' });
  }
}

async function remover(req, res) {
  try {
    const resultado = await pool.query(
      `DELETE FROM financeiro_movimentos WHERE id = $1 AND origem = 'manual' RETURNING *`,
      [req.params.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Lançamento manual não encontrado (movimentos importados de e-mail não podem ser excluídos)' });
    }
    await registrarAuditoria(pool, { entidade: 'financeiro_movimentos', entidadeId: resultado.rows[0].id, acao: 'excluir', usuarioId: req.usuario.id, detalhes: { movimento: resultado.rows[0] } });
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao remover movimento financeiro:', err);
    res.status(500).json({ erro: 'Erro ao remover movimento financeiro' });
  }
}

const CATEGORIAS_VALIDAS = Object.keys(CATEGORIA_LABEL);

async function categorizar(req, res) {
  try {
    const { prestadorId, categoria } = req.body;
    if (categoria && !CATEGORIAS_VALIDAS.includes(categoria)) {
      return res.status(400).json({ erro: 'Categoria inválida' });
    }

    // obra (2.0): vale também para movimentos importados do e-mail (que não
    // são editáveis); presente liga/desliga (null), ausente mantém
    const obra = lerObraId(req.body);
    const erroObra = await conferirObra(pool, obra);
    if (erroObra) return res.status(400).json({ erro: erroObra });

    const resultado = await pool.query(
      `UPDATE financeiro_movimentos
       SET prestador_id = $1, categoria = $2, obra_id = CASE WHEN $4::boolean THEN $5::int ELSE obra_id END
       WHERE id = $3
       RETURNING id, prestador_id, categoria, obra_id`,
      [prestadorId || null, categoria || null, req.params.id, obra.presente, obra.valor]
    );
    if (resultado.rows.length === 0) return res.status(404).json({ erro: 'Movimento não encontrado' });
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao categorizar movimento financeiro:', err);
    res.status(500).json({ erro: 'Erro ao categorizar movimento financeiro' });
  }
}

async function verificarAgora(req, res) {
  try {
    // pelo registro comum das rotinas (services/rotinas.js) — aparece no painel de Integrações
    const resumo = await rotinas.executarRotina('pix-email', { origem: 'manual', usuarioId: req.usuario?.id });
    res.json(resumo);
  } catch (err) {
    console.error('Erro ao verificar Pix na caixa de entrada:', err);
    res.status(err.code === 'EMAIL_CONEXAO' ? 503 : 500).json({ erro: err.message || 'Erro ao verificar Pix na caixa de entrada' });
  }
}

module.exports = { listar, criar, atualizar, remover, categorizar, exportarCsv, verificarAgora };
