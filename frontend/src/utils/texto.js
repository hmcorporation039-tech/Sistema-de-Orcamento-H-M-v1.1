// Texto para comparar e buscar (revisão de 14/11/2026 — "tirar acento" estava
// copiado em sete telas, umas passando para minúsculas e outras não).

// Tira os acentos ('Clínica São José' → 'Clinica Sao Jose'); não muda maiúsculas
// nem espaços. Nulo, indefinido ou vazio viram ''.
export function semAcento(txt) {
  return String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Chave de busca: sem acento e em minúsculas ('Elétrica' e 'ELETRICA' casam).
export function chaveBusca(txt) {
  return semAcento(txt).toLowerCase();
}

// Nome para comparar cadastros: sem acento, minúsculas e sem espaço nas pontas
// — "CLINICA" na proposta x "CLÍNICA " no cadastro são o mesmo cliente.
export function normalizarNome(txt) {
  return semAcento(txt).trim().toLowerCase();
}
