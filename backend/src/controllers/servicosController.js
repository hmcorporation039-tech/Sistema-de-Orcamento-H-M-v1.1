const pool = require('../config/database');
const { comTransacao } = require('../utils/transacao');
const { valorSugerido, segmentoPorNomeDoCliente } = require('../utils/precosMaoDeObraReferencia');
const { planejarFusao } = require('../utils/servicosBase');

const num = (v) => (v == null ? null : Number(v));

// Base única de serviços (versão 2.0) para a lista suspensa da tela Orçamento:
// os serviços ATIVOS (padrão + lançados em propostas), com as duas
// referências de mercado e a sugestão já calculada para cada segmento
// (valor H&M adotado ?? referência do segmento — utils/precosMaoDeObraReferencia).
// Com ?cliente=<nome>, devolve também o segmento desse cliente.
async function listar(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT codigo, descricao, unidade, disciplina, origem, valor_referencia,
              valor_publico, fonte_publico, data_publico, valor_privado, fonte_privado, data_privado
         FROM precos_mao_de_obra_referencia
        WHERE ativo = true
        ORDER BY disciplina, descricao`
    );
    const itens = rows.map(r => {
      const ref = { hm: num(r.valor_referencia), publico: num(r.valor_publico), privado: num(r.valor_privado) };
      return {
        ...r,
        valor_referencia: ref.hm, valor_publico: ref.publico, valor_privado: ref.privado,
        sugerido: { publico: valorSugerido(ref, 'publico'), privado: valorSugerido(ref, 'privado') },
      };
    });
    const resposta = { itens };
    if (req.query.cliente) resposta.segmento = await segmentoPorNomeDoCliente(String(req.query.cliente));
    res.json(resposta);
  } catch (err) {
    console.error('Erro ao listar a base de serviços:', err);
    res.status(500).json({ erro: 'Erro ao listar os serviços de mão de obra' });
  }
}

// Segmento ('publico' | 'privado') do cliente pelo cadastro (tipo "Órgão
// Público") ou, sem cadastro, pelo nome — decide qual referência a tela sugere.
async function segmento(req, res) {
  try {
    res.json({ segmento: await segmentoPorNomeDoCliente(String(req.query.cliente || '')) });
  } catch (err) {
    console.error('Erro ao identificar o segmento do cliente:', err);
    res.status(500).json({ erro: 'Erro ao identificar o segmento do cliente' });
  }
}

// "É o mesmo que…": funde um serviço livre (lançado em proposta) num outro
// serviço, normalmente um padrão. O livre sai da lista (ativo=false,
// fundido_em=destino) e, se alguém digitar a mesma descrição de novo, o
// sistema reconhece o destino. Propostas já gravadas não são alteradas.
async function fundir(req, res) {
  const destino = req.body?.destino;
  if (!destino || typeof destino !== 'string') return res.status(400).json({ erro: 'Escolha o serviço de destino' });
  try {
    const resultado = await comTransacao(async (client) => {
      // trava a base durante a fusão (duas fusões ao mesmo tempo não criam ciclo)
      const { rows } = await client.query('SELECT codigo, origem, ativo, fundido_em FROM precos_mao_de_obra_referencia FOR UPDATE');
      const plano = planejarFusao(rows, req.params.codigo, destino);
      if (plano.erro) return plano;
      await client.query(
        'UPDATE precos_mao_de_obra_referencia SET ativo = false, fundido_em = $1, atualizado_em = NOW() WHERE codigo = $2',
        [plano.destino, plano.origem]
      );
      if (plano.redirecionar.length) {
        await client.query('UPDATE precos_mao_de_obra_referencia SET fundido_em = $1, atualizado_em = NOW() WHERE codigo = ANY($2)', [plano.destino, plano.redirecionar]);
      }
      // a 1.x lia a tabela antiga: o item também sai da lista dela
      const idAntigo = /^livre_(\d+)$/.exec(plano.origem)?.[1];
      if (idAntigo) await client.query('UPDATE mao_de_obra_itens SET ativo = false, atualizado_em = NOW() WHERE id = $1', [Number(idAntigo)]);
      return plano;
    });
    if (resultado.erro) return res.status(resultado.status || 400).json({ erro: resultado.erro });
    res.json({ mensagem: 'Serviço fundido', origem: resultado.origem, destino: resultado.destino });
  } catch (err) {
    console.error('Erro ao fundir serviço:', err);
    res.status(500).json({ erro: 'Erro ao fundir o serviço' });
  }
}

// Desativa (some da lista suspensa) ou reativa um serviço livre. Reativar
// desfaz também uma fusão. Os serviços padrão não são desativados por aqui.
async function definirAtivo(req, res) {
  const ativo = req.body?.ativo;
  if (typeof ativo !== 'boolean') return res.status(400).json({ erro: 'Informe ativo: true ou false' });
  try {
    const { rows: [atual] } = await pool.query(
      `UPDATE precos_mao_de_obra_referencia
          SET ativo = $1, fundido_em = CASE WHEN $1 THEN NULL ELSE fundido_em END, atualizado_em = NOW()
        WHERE codigo = $2 AND origem = 'proposta'
        RETURNING codigo, ativo, fundido_em`,
      [ativo, req.params.codigo]
    );
    if (!atual) return res.status(404).json({ erro: 'Serviço lançado em proposta não encontrado' });
    const idAntigo = /^livre_(\d+)$/.exec(atual.codigo)?.[1];
    if (idAntigo) await pool.query('UPDATE mao_de_obra_itens SET ativo = $1, atualizado_em = NOW() WHERE id = $2', [ativo, Number(idAntigo)]);
    res.json(atual);
  } catch (err) {
    console.error('Erro ao ativar/desativar serviço:', err);
    res.status(500).json({ erro: 'Erro ao alterar o serviço' });
  }
}

module.exports = { listar, segmento, fundir, definirAtivo };
