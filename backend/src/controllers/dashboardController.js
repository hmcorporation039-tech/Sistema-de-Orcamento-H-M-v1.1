const pool = require('../config/database');

// Seções cujo nome sugere trabalho/serviço — mesmo critério usado no frontend (Orcamento.js)
const REGEX_MAO_DE_OBRA = 'm[ãa]o.?de.?obra|serviç|servic';

function parseMeses(req) {
  const meses = parseInt(req.query.meses, 10);
  return [3, 6, 12].includes(meses) ? meses : 12;
}

async function resumo(req, res) {
  const meses = parseMeses(req);
  try {
    const totais = await pool.query(
      `SELECT
        count(*) AS propostas,
        COALESCE(SUM(total), 0) AS valor_total,
        COALESCE(SUM(total) FILTER (WHERE status = 'Aprovada'), 0) AS valor_aprovado,
        COALESCE(AVG(total) FILTER (WHERE status = 'Aprovada'), 0) AS ticket_medio,
        count(*) FILTER (WHERE status = 'Aprovada') AS aprovadas,
        count(*) FILTER (WHERE status = 'Recusada') AS recusadas
       FROM propostas
       WHERE data >= (CURRENT_DATE - ($1 || ' months')::interval)`,
      [meses]
    );

    const porStatus = await pool.query(
      `SELECT status, count(*) AS qtd, COALESCE(SUM(total), 0) AS valor
       FROM propostas
       WHERE data >= (CURRENT_DATE - ($1 || ' months')::interval)
       GROUP BY status`,
      [meses]
    );

    const cadastros = await pool.query(
      `SELECT
        (SELECT count(*) FROM clientes WHERE ativo = true) AS clientes,
        (SELECT count(*) FROM materiais WHERE ativo = true) AS materiais`
    );

    // Independe da janela de meses selecionada: reflete o estado atual das propostas em aberto
    const vencimentos = await pool.query(
      `SELECT
        count(*) FILTER (WHERE (data + (validade || ' days')::interval)::date < CURRENT_DATE) AS vencidas,
        count(*) FILTER (WHERE (data + (validade || ' days')::interval)::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 3) AS vencendo_em_breve
       FROM propostas
       WHERE status = 'Ativa'`
    );

    const t = totais.rows[0];
    const decididas = Number(t.aprovadas) + Number(t.recusadas);
    const taxaAprovacao = decididas > 0 ? (Number(t.aprovadas) / decididas) * 100 : 0;

    const status = { Ativa: { qtd: 0, valor: 0 }, Aprovada: { qtd: 0, valor: 0 }, Recusada: { qtd: 0, valor: 0 }, Cancelada: { qtd: 0, valor: 0 } };
    for (const row of porStatus.rows) {
      status[row.status] = { qtd: Number(row.qtd), valor: Number(row.valor) };
    }

    res.json({
      propostas: Number(t.propostas),
      valorTotal: Number(t.valor_total),
      valorAprovado: Number(t.valor_aprovado),
      ticketMedio: Number(t.ticket_medio),
      taxaAprovacao,
      status,
      clientes: Number(cadastros.rows[0].clientes),
      materiais: Number(cadastros.rows[0].materiais),
      vencidas: Number(vencimentos.rows[0].vencidas),
      vencendoEmBreve: Number(vencimentos.rows[0].vencendo_em_breve),
    });
  } catch (err) {
    console.error('Erro ao buscar resumo do dashboard:', err);
    res.status(500).json({ erro: 'Erro ao buscar resumo do dashboard' });
  }
}

async function porMes(req, res) {
  const meses = parseMeses(req);
  try {
    const result = await pool.query(
      `SELECT
        to_char(m.mes, 'YYYY-MM') AS mes,
        COALESCE(count(p.id), 0) AS propostas,
        COALESCE(SUM(p.total), 0) AS valor,
        COALESCE(count(p.id) FILTER (WHERE p.status = 'Aprovada'), 0) AS aprovadas,
        COALESCE(SUM(p.total) FILTER (WHERE p.status = 'Aprovada'), 0) AS valor_aprovado
       FROM generate_series(
         date_trunc('month', CURRENT_DATE - ($1 || ' months')::interval),
         date_trunc('month', CURRENT_DATE),
         interval '1 month'
       ) AS m(mes)
       LEFT JOIN propostas p ON date_trunc('month', p.data) = m.mes
       GROUP BY m.mes
       ORDER BY m.mes`,
      [meses - 1]
    );

    res.json(result.rows.map(r => ({
      mes: r.mes,
      propostas: Number(r.propostas),
      valor: Number(r.valor),
      aprovadas: Number(r.aprovadas),
      valorAprovado: Number(r.valor_aprovado),
    })));
  } catch (err) {
    console.error('Erro ao buscar série mensal do dashboard:', err);
    res.status(500).json({ erro: 'Erro ao buscar série mensal do dashboard' });
  }
}

async function topClientes(req, res) {
  const meses = parseMeses(req);
  const limite = Math.min(parseInt(req.query.limite, 10) || 5, 20);
  try {
    const result = await pool.query(
      `SELECT
        cliente_nome AS nome,
        count(*) AS propostas,
        COALESCE(SUM(total), 0) AS valor_total,
        COALESCE(SUM(total) FILTER (WHERE status = 'Aprovada'), 0) AS valor_aprovado
       FROM propostas
       WHERE data >= (CURRENT_DATE - ($1 || ' months')::interval)
       GROUP BY cliente_nome
       ORDER BY valor_aprovado DESC, valor_total DESC
       LIMIT $2`,
      [meses, limite]
    );
    res.json(result.rows.map(r => ({
      nome: r.nome,
      propostas: Number(r.propostas),
      valorTotal: Number(r.valor_total),
      valorAprovado: Number(r.valor_aprovado),
    })));
  } catch (err) {
    console.error('Erro ao buscar top clientes do dashboard:', err);
    res.status(500).json({ erro: 'Erro ao buscar top clientes do dashboard' });
  }
}

async function topMateriais(req, res) {
  const meses = parseMeses(req);
  const limite = Math.min(parseInt(req.query.limite, 10) || 8, 30);
  try {
    const result = await pool.query(
      `SELECT
        it.descricao,
        count(DISTINCT it.proposta_id) AS propostas,
        COALESCE(SUM(it.quantidade), 0) AS quantidade,
        COALESCE(SUM(it.valor_total), 0) AS valor
       FROM proposta_itens it
       JOIN proposta_secoes s ON it.secao_id = s.id
       JOIN propostas p ON it.proposta_id = p.id
       WHERE p.data >= (CURRENT_DATE - ($1 || ' months')::interval)
         AND s.nome !~* $2
       GROUP BY it.descricao
       ORDER BY valor DESC
       LIMIT $3`,
      [meses, REGEX_MAO_DE_OBRA, limite]
    );
    res.json(result.rows.map(r => ({
      descricao: r.descricao,
      propostas: Number(r.propostas),
      quantidade: Number(r.quantidade),
      valor: Number(r.valor),
    })));
  } catch (err) {
    console.error('Erro ao buscar top materiais do dashboard:', err);
    res.status(500).json({ erro: 'Erro ao buscar top materiais do dashboard' });
  }
}

async function ultimasPropostas(req, res) {
  const limite = Math.min(parseInt(req.query.limite, 10) || 6, 20);
  try {
    const result = await pool.query(
      `SELECT id, numero, data, cliente_nome, local_obra, total, status
       FROM propostas
       ORDER BY sequencial DESC
       LIMIT $1`,
      [limite]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar últimas propostas do dashboard:', err);
    res.status(500).json({ erro: 'Erro ao buscar últimas propostas do dashboard' });
  }
}

module.exports = { resumo, porMes, topClientes, topMateriais, ultimasPropostas };
