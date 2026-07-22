const PADRAO_POR_PAGINA = 30;

function parsePaginacao(query, porPaginaPadrao = PADRAO_POR_PAGINA) {
  const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);
  const porPagina = Math.min(1000, Math.max(1, parseInt(query.porPagina, 10) || porPaginaPadrao));
  const offset = (pagina - 1) * porPagina;
  return { pagina, porPagina, offset };
}

function montarResposta(itens, total, pagina, porPagina) {
  return {
    itens,
    total,
    pagina,
    porPagina,
    totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}

module.exports = { parsePaginacao, montarResposta };
