const pool = require('../config/database');
const { comTransacao } = require('../utils/transacao');

// Lista os itens de referência de mão de obra (admin) — ordenados por
// disciplina pra ficar fácil de conferir tudo de uma categoria de uma vez,
// mesmo agrupamento visual usado no resto do sistema (Análise de Projeto,
// Orçamento).
async function listar(req, res) {
  try {
    const result = await pool.query(
      'SELECT codigo, descricao, unidade, disciplina, valor_referencia, atualizado_em FROM precos_mao_de_obra_referencia ORDER BY disciplina, codigo'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar preços de referência de mão de obra:', err);
    res.status(500).json({ erro: 'Erro ao listar preços de referência' });
  }
}

// Atualiza o valor de referência de um ou mais códigos — nunca cria/exclui
// código (a lista é fixa, definida em utils/precosMaoDeObraReferencia.js e
// semeada pelo schema). `itens`: [{ codigo, valor_referencia }].
async function atualizar(req, res) {
  const { itens } = req.body;
  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'Envie ao menos um item para atualizar' });
  }
  for (const it of itens) {
    if (!it.codigo || typeof it.codigo !== 'string') {
      return res.status(400).json({ erro: 'Item sem código válido' });
    }
    if (it.valor_referencia !== null && it.valor_referencia !== '') {
      const n = Number(it.valor_referencia);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ erro: `Valor de referência inválido para "${it.codigo}"` });
      }
    }
  }

  try {
    await comTransacao(async (client) => {
      for (const it of itens) {
        const valor = (it.valor_referencia === '' || it.valor_referencia === undefined) ? null : it.valor_referencia;
        await client.query(
          'UPDATE precos_mao_de_obra_referencia SET valor_referencia = $1, atualizado_em = NOW() WHERE codigo = $2',
          [valor, it.codigo]
        );
      }
    });
    res.json({ mensagem: 'Preços de referência atualizados' });
  } catch (err) {
    console.error('Erro ao atualizar preços de referência de mão de obra:', err);
    res.status(500).json({ erro: 'Erro ao atualizar preços de referência' });
  }
}

module.exports = { listar, atualizar };
