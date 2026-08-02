const pool = require('../config/database');
const { verificarPixNaCaixaDeEntrada } = require('../services/financeiroEmailService');

const CATEGORIA_LABEL = { mao_de_obra: 'Mão de obra', material: 'Material', despesa: 'Despesa diária' };

// Primeiro dia do mês atual até hoje, se as datas não forem informadas
function periodoPadrao() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return {
    dataInicio: inicio.toISOString().slice(0, 10),
    dataFim: hoje.toISOString().slice(0, 10),
  };
}

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

  return { where: `WHERE ${condicoes.join(' AND ')}`, params, dataInicio, dataFim };
}

async function buscarMovimentosEtotais(query) {
  const { where, params, dataInicio, dataFim } = montarFiltro(query);

  const movimentos = await pool.query(
    `SELECT fm.id, fm.tipo, fm.nome, fm.valor, fm.data_hora, fm.id_transacao, fm.origem,
            fm.categoria, fm.prestador_id, p.nome AS prestador_nome
     FROM financeiro_movimentos fm
     LEFT JOIN prestadores p ON p.id = fm.prestador_id
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

    const cabecalho = ['Data', 'Tipo', 'Nome', 'Valor', 'ID Transacao', 'Prestador', 'Categoria'];
    const linhas = movimentos.map(m => [
      new Date(m.data_hora).toLocaleString('pt-BR'),
      m.tipo === 'recebido' ? 'Recebido' : 'Realizado',
      m.nome || '',
      Number(m.valor).toFixed(2),
      m.id_transacao || '',
      m.prestador_nome || '',
      CATEGORIA_LABEL[m.categoria] || '',
    ].map(escaparCsv).join(';'));

    const csv = [cabecalho.join(';'), ...linhas].join('\r\n');
    const bom = '﻿';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="financeiro-pix.csv"');
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
    const resultado = await pool.query(
      `INSERT INTO financeiro_movimentos (tipo, nome, valor, data_hora, id_transacao, origem, usuario_id)
       VALUES ($1,$2,$3,$4,$5,'manual',$6)
       RETURNING id, tipo, nome, valor, data_hora, id_transacao, origem`,
      [tipo, nome || null, valor, dataHora, idTransacao || null, req.usuario.id]
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
    const resultado = await pool.query(
      `UPDATE financeiro_movimentos
       SET tipo = $1, nome = $2, valor = $3, data_hora = $4, id_transacao = $5
       WHERE id = $6 AND origem = 'manual'
       RETURNING id, tipo, nome, valor, data_hora, id_transacao, origem`,
      [tipo, nome || null, valor, dataHora, idTransacao || null, req.params.id]
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
      `DELETE FROM financeiro_movimentos WHERE id = $1 AND origem = 'manual' RETURNING id`,
      [req.params.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Lançamento manual não encontrado (movimentos importados de e-mail não podem ser excluídos)' });
    }
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

    const resultado = await pool.query(
      `UPDATE financeiro_movimentos
       SET prestador_id = $1, categoria = $2
       WHERE id = $3
       RETURNING id, prestador_id, categoria`,
      [prestadorId || null, categoria || null, req.params.id]
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
    const resumo = await verificarPixNaCaixaDeEntrada();
    res.json(resumo);
  } catch (err) {
    console.error('Erro ao verificar Pix na caixa de entrada:', err);
    res.status(500).json({ erro: err.message || 'Erro ao verificar Pix na caixa de entrada' });
  }
}

module.exports = { listar, criar, atualizar, remover, categorizar, exportarCsv, verificarAgora };
