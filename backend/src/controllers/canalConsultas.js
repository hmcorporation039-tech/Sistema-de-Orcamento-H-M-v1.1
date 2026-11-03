// GET /consultas/* — leituras usadas pelas ferramentas do assistente (as mesmas do canal e do MCP do
// Claude Desktop): cada uma devolve { texto, dados } (services/canal/consultas.js). Só leitura.
const pool = require('../config/database');
const C = require('../services/canal/consultas');
const { historicoPreco } = require('../services/assistente/consultas');

const responder = (fn) => async (req, res) => {
  try {
    res.json(await fn(req));
  } catch (e) {
    if (e instanceof C.ErroConsulta) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
};

const custos = responder((req) => C.custosDaObra(Number(req.params.id), { mes: req.query.mes === '1' || req.query.mes === 'true' }));
const margem = responder((req) => C.margemDaObra(Number(req.params.id)));
const pixSemObra = responder((req) => C.pixSemObra({ limite: Math.min(30, Math.max(1, Number(req.query.limite) || 10)) }));
const notasFiscais = responder(() => C.notasFiscais());
const notasAReceber = responder(() => C.notasAReceber());
const vencimentos = responder((req) => C.vencimentos({ incluirEmpresa: C.podeVerFinanceiro(req.usuario) }));
const novidadesPastas = responder(() => C.novidadesPastas());
const cotacoes = responder(() => C.cotacoes());

async function historico(req, res) {
  const descricao = String(req.query.descricao || '').trim();
  if (descricao.length < 2) return res.status(400).json({ erro: 'Informe a descrição.' });
  res.json(await historicoPreco(pool, descricao));
}

module.exports = { custos, margem, pixSemObra, notasFiscais, notasAReceber, vencimentos, novidadesPastas, cotacoes, historico };
