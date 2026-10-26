const pool = require('../config/database');
const { comTransacao } = require('../utils/transacao');
const { pesquisarReferenciaMaoDeObra, ErroPesquisaMercado } = require('../utils/pesquisaMercadoService');

const SEGMENTOS = ['publico', 'privado'];
const COLUNAS = [
  'codigo', 'descricao', 'unidade', 'disciplina', 'valor_referencia', 'atualizado_em',
  ...SEGMENTOS.flatMap(s => [`valor_${s}`, `fonte_${s}`, `link_${s}`, `data_${s}`, `ofertas_${s}`]),
];

// Lista os itens de referência de mão de obra (admin) — ordenados por
// disciplina pra ficar fácil de conferir tudo de uma categoria de uma vez,
// mesmo agrupamento visual usado no resto do sistema (Análise de Projeto,
// Orçamento). Cada item traz o valor adotado pela H&M e as referências de
// mercado oficial/governo e privado/particular, com fonte e link.
async function listar(req, res) {
  try {
    const result = await pool.query(`SELECT ${COLUNAS.join(', ')} FROM precos_mao_de_obra_referencia ORDER BY disciplina, codigo`);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar preços de referência de mão de obra:', err);
    res.status(500).json({ erro: 'Erro ao listar preços de referência' });
  }
}

const valorValido = (v) => v === null || v === '' || v === undefined || (Number.isFinite(Number(v)) && Number(v) >= 0);
const valorOuNulo = (v) => (v === '' || v === undefined || v === null ? null : Number(v));
const textoOuNulo = (v, max) => (v == null || String(v).trim() === '' ? null : String(v).trim().slice(0, max));

// Atualiza um ou mais códigos — nunca cria/exclui código (a lista é fixa,
// definida em utils/precosMaoDeObraReferencia.js e semeada pelo schema).
// `itens`: [{ codigo, valor_referencia?, valor_publico?, fonte_publico?,
// valor_privado?, fonte_privado? }] — só os campos enviados são alterados.
async function atualizar(req, res) {
  const { itens } = req.body;
  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'Envie ao menos um item para atualizar' });
  }
  for (const it of itens) {
    if (!it.codigo || typeof it.codigo !== 'string') {
      return res.status(400).json({ erro: 'Item sem código válido' });
    }
    for (const campo of ['valor_referencia', 'valor_publico', 'valor_privado']) {
      if (campo in it && !valorValido(it[campo])) return res.status(400).json({ erro: `Valor inválido em "${it.codigo}" (${campo})` });
    }
  }

  try {
    await comTransacao(async (client) => {
      for (const it of itens) {
        const sets = [];
        const vals = [];
        const por = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
        if ('valor_referencia' in it) por('valor_referencia', valorOuNulo(it.valor_referencia));
        for (const s of SEGMENTOS) {
          if (`valor_${s}` in it) {
            por(`valor_${s}`, valorOuNulo(it[`valor_${s}`]));
            // valor digitado à mão: a data passa a ser a da edição
            sets.push(`data_${s} = NOW()`);
          }
          if (`fonte_${s}` in it) por(`fonte_${s}`, textoOuNulo(it[`fonte_${s}`], 300));
        }
        if (!sets.length) continue;
        vals.push(it.codigo);
        await client.query(`UPDATE precos_mao_de_obra_referencia SET ${sets.join(', ')}, atualizado_em = NOW() WHERE codigo = $${vals.length}`, vals);
      }
    });
    res.json({ mensagem: 'Preços de referência atualizados' });
  } catch (err) {
    console.error('Erro ao atualizar preços de referência de mão de obra:', err);
    res.status(500).json({ erro: 'Erro ao atualizar preços de referência' });
  }
}

// Pesquisa na web a referência de mercado de UM serviço num segmento
// (`publico` = oficial/governo, `privado` = particular) e grava valor (média
// das referências equivalentes), fontes, link e ofertas — sobrescreve o que
// havia naquele segmento; o valor adotado pela H&M não é tocado.
async function pesquisar(req, res) {
  const { segmento } = req.body || {};
  if (!SEGMENTOS.includes(segmento)) return res.status(400).json({ erro: 'Informe o segmento: publico ou privado' });
  try {
    const { rows: [item] } = await pool.query('SELECT codigo, descricao, unidade FROM precos_mao_de_obra_referencia WHERE codigo = $1', [req.params.codigo]);
    if (!item) return res.status(404).json({ erro: 'Serviço não encontrado' });
    const r = await pesquisarReferenciaMaoDeObra(item.descricao, item.unidade, segmento);
    const { rows: [atual] } = await pool.query(
      `UPDATE precos_mao_de_obra_referencia
         SET valor_${segmento} = $1, fonte_${segmento} = $2, link_${segmento} = $3, ofertas_${segmento} = $4, data_${segmento} = NOW(), atualizado_em = NOW()
       WHERE codigo = $5 RETURNING ${COLUNAS.join(', ')}`,
      [r.valor, r.fontes, r.link, JSON.stringify(r.ofertas), item.codigo]
    );
    res.json({ item: atual, resultado: r.resultado, deCache: r.deCache, encontrado: r.valor != null });
  } catch (err) {
    if (err instanceof ErroPesquisaMercado) return res.status(err.status).json({ erro: err.message });
    console.error('Erro ao pesquisar referência de mão de obra:', err);
    res.status(500).json({ erro: 'Erro ao pesquisar a referência de mercado' });
  }
}

module.exports = { listar, atualizar, pesquisar };
