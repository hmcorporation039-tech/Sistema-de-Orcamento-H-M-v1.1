const pool = require('../config/database');
const { periodoMesAtualBrasilia, ehDataIso, FUSO } = require('../utils/dataHoje');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const { escaparCsv } = require('../utils/csv');
const { registrarAuditoria } = require('../services/auditoria');
const rotinas = require('../services/rotinas');
const { lerObraId, conferirObra, sqlObraJson } = require('../utils/obras');
const { ErroHttp } = require('../utils/erros');

const CATEGORIA_LABEL = { mao_de_obra: 'Mão de obra', material: 'Material', despesa: 'Despesa diária' };

// Primeiro dia do mês atual até hoje (horário de Brasília), se as datas não
// forem informadas — utils/dataHoje.js (toISOString dava o dia em UTC)
const periodoPadrao = () => periodoMesAtualBrasilia();

function montarFiltro(query) {
  const padrao = periodoPadrao();
  const dataInicio = query.dataInicio || padrao.dataInicio;
  const dataFim = query.dataFim || padrao.dataFim;
  // Data fora do formato (ou 31/02) ia direto para o SQL: o PostgreSQL recusava
  // e a tela recebia um 500 genérico. Agora é 400 com a mensagem certa.
  if (!ehDataIso(dataInicio)) throw new ErroHttp(400, 'Data inicial inválida (use AAAA-MM-DD).');
  if (!ehDataIso(dataFim)) throw new ErroHttp(400, 'Data final inválida (use AAAA-MM-DD).');
  if (dataFim < dataInicio) throw new ErroHttp(400, 'A data final é anterior à inicial.');
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
  const resultado = await buscarMovimentosEtotais(req.query);
  res.json(resultado);
}

async function exportarCsv(req, res) {
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
}

// data_hora é TIMESTAMP SEM fuso e guarda a hora de Brasília (o Pix lido do
// e-mail chega como Date e o pg grava a hora local do servidor). A tela
// mandava toISOString() (hora UTC com "Z"): o PostgreSQL descarta o "Z" num
// TIMESTAMP sem fuso e gravava a hora UTC — 3 h adiantada, e mais 3 h a cada
// edição (a volta para a tela já vinha adiantada). Agora:
//   "AAAA-MM-DDTHH:MM[:SS]" sem fuso (o datetime-local da tela) → já é a hora
//       de Brasília, grava como está;
//   com fuso ("Z", "-03:00") ou Date → converte o instante para Brasília.
// Devolve "AAAA-MM-DD HH:MM:SS" ou null (inválida).
const RE_DATA_HORA_LOCAL = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;
const RE_COM_FUSO = /(Z|[+-]\d{2}:?\d{2})$/i;
const formatoBrasilia = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
function dataHoraBrasilia(valor) {
  if (valor instanceof Date || (typeof valor === 'string' && RE_COM_FUSO.test(valor.trim()) && /T|\s/.test(valor.trim()))) {
    const d = valor instanceof Date ? valor : new Date(valor.trim());
    if (Number.isNaN(d.getTime())) return null;
    const p = Object.fromEntries(formatoBrasilia.formatToParts(d).map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
  }
  const m = RE_DATA_HORA_LOCAL.exec(String(valor || '').trim());
  if (!m || !ehDataIso(m[1])) return null;
  const [hh, mi, ss = '00'] = [m[2], m[3], m[4]];
  if (Number(hh) > 23 || Number(mi) > 59 || Number(ss) > 59) return null;
  return `${m[1]} ${hh}:${mi}:${ss}`;
}

function validarMovimento(body) {
  const { tipo, valor, dataHora } = body;
  if (!['recebido', 'realizado'].includes(tipo)) return 'Tipo inválido (use recebido ou realizado)';
  if (!(Number(valor) > 0)) return 'Valor deve ser maior que zero';
  if (!dataHoraBrasilia(dataHora)) return 'Data/hora inválida';
  return null;
}

async function criar(req, res) {
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
    [tipo, nome || null, valor, dataHoraBrasilia(dataHora), idTransacao || null, req.usuario.id, obra.valor]
  );
  res.status(201).json(resultado.rows[0]);
}

async function atualizar(req, res) {
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
    [tipo, nome || null, valor, dataHoraBrasilia(dataHora), idTransacao || null, req.params.id, obra.presente, obra.valor]
  );
  if (resultado.rows.length === 0) {
    return res.status(404).json({ erro: 'Lançamento manual não encontrado (movimentos importados de e-mail não podem ser editados)' });
  }
  res.json(resultado.rows[0]);
}

async function remover(req, res) {
  const resultado = await pool.query(
    `DELETE FROM financeiro_movimentos WHERE id = $1 AND origem = 'manual' RETURNING *`,
    [req.params.id]
  );
  if (resultado.rows.length === 0) {
    return res.status(404).json({ erro: 'Lançamento manual não encontrado (movimentos importados de e-mail não podem ser excluídos)' });
  }
  await registrarAuditoria(pool, { entidade: 'financeiro_movimentos', entidadeId: resultado.rows[0].id, acao: 'excluir', usuarioId: req.usuario.id, detalhes: { movimento: resultado.rows[0] } });
  res.json({ sucesso: true });
}

const CATEGORIAS_VALIDAS = Object.keys(CATEGORIA_LABEL);

async function categorizar(req, res) {
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
}

async function verificarAgora(req, res, next) {
  try {
    // pelo registro comum das rotinas (services/rotinas.js) — aparece no painel de Integrações
    const resumo = await rotinas.executarRotina('pix-email', { origem: 'manual', usuarioId: req.usuario?.id });
    res.json(resumo);
  } catch (err) {
    console.error('Erro ao verificar Pix na caixa de entrada:', err);
    // falha de conexão com a caixa: mensagem escrita para o usuário; o resto vai
    // para o tratarErros (registra no resumo de erros e não mostra texto interno)
    if (err.code === 'EMAIL_CONEXAO') return res.status(503).json({ erro: err.message || 'Erro ao verificar Pix na caixa de entrada' });
    return next(err);
  }
}

module.exports = { listar, criar, atualizar, remover, categorizar, exportarCsv, verificarAgora,
  dataHoraBrasilia }; // dataHoraBrasilia: testes
