// Seção de mão de obra × de material, pelo nome (2.40 — a regra estava no editor de orçamento
// e copiada no InserirComposicao). Mesma expressão do servidor (backend/src/utils/calculoProposta.js,
// RE_MAO_DE_OBRA): seção cujo nome sugere trabalho/serviço entra no subtotal de mão de obra;
// o restante conta como material.
export function ehMaoDeObra(nome) {
  return /m[ãa]o.?de.?obra|serviç|servic/i.test(nome || '');
}
