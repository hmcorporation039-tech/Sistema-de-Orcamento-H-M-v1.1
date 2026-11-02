// SINAPI local: consulta e configuração. Rotas em routes/v2/sinapi.js.
const sinapi = require('../services/sinapi');
const pool = require('../config/database');

async function situacao(req, res) {
  res.json(await sinapi.situacao());
}

async function buscar(req, res) {
  const tipo = req.query.tipo === 'composicoes' ? 'composicoes' : 'insumos';
  const q = String(req.query.q || '').slice(0, 120);
  res.json({ ...(await sinapi.configuracao()), tipo, itens: await sinapi.buscar(q, { tipo, limite: Math.min(Number(req.query.limite) || 30, 100) }) });
}

// Estado e regime ajustáveis; só aceita UF que já foi importada (senão a busca ficaria vazia).
async function configurar(req, res) {
  const uf = req.body.uf == null ? null : String(req.body.uf).toUpperCase();
  const regime = req.body.regime == null ? null : String(req.body.regime);
  if (regime != null && !['sem', 'com'].includes(regime)) return res.status(400).json({ erro: 'Regime deve ser "sem" ou "com" desoneração.' });
  if (uf != null) {
    const ok = await pool.query('SELECT 1 FROM sinapi_importacoes WHERE uf = $1 LIMIT 1', [uf]);
    if (!ok.rows.length) return res.status(400).json({ erro: `Nenhuma planilha do SINAPI importada para ${uf}.` });
  }
  for (const [chave, valor] of [['sinapi_uf', uf], ['sinapi_regime', regime]]) {
    if (valor != null) await pool.query('INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES ($1, $2, NOW()) ON CONFLICT (chave) DO UPDATE SET valor = $2, atualizado_em = NOW()', [chave, valor]);
  }
  res.json(await sinapi.situacao());
}

module.exports = { situacao, buscar, configurar };
