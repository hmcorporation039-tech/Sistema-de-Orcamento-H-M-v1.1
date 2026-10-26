// Bloqueio otimista (coluna `versao` em propostas, analises_projeto e
// laudos_projetos). A tela envia a versão que carregou; o UPDATE só acontece se
// ela ainda for a atual. Sem `versao` no pedido (MCP, chamadas antigas), grava
// como antes.

// Versão enviada pelo cliente: inteiro >= 0, ou null quando não veio.
function versaoDoPedido(body) {
  const v = body?.versao;
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

const MENSAGEM_CONFLITO = {
  propostas: 'Esta proposta foi alterada por outra pessoa (ou em outra aba) depois que você a abriu.',
  analises_projeto: 'Esta análise foi alterada por outra pessoa (ou em outra aba) depois que você a abriu.',
  laudos_projetos: 'Este laudo/projeto foi alterado por outra pessoa (ou em outra aba) depois que você o abriu.',
};

// Responde 409 se o registro existe (então o UPDATE não pegou por versão) ou
// 404 se não existe. Devolve true quando respondeu.
async function responderConflitoOuAusente(executor, res, tabela, id) {
  const { rows } = await executor.query(`SELECT versao FROM ${tabela} WHERE id = $1`, [id]);
  if (!rows[0]) {
    res.status(404).json({ erro: 'Registro não encontrado' });
  } else {
    res.status(409).json({
      codigo: 'CONFLITO_VERSAO',
      versaoAtual: rows[0].versao,
      erro: `${MENSAGEM_CONFLITO[tabela]} Recarregue a página para ver a versão atual — suas alterações não foram gravadas.`,
    });
  }
  return true;
}

module.exports = { versaoDoPedido, responderConflitoOuAusente };
