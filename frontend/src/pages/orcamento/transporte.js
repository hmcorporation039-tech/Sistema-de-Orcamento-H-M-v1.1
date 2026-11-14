// Proposta nova gravada: a URL vira /propostas/editar/:id e o React Router pode
// montar a tela de novo — o que estava nela (inclusive as pesquisas de mercado
// abertas) passa por aqui em vez de ser relido do servidor. Quem grava é o
// useSalvarProposta; quem recebe, o useCargaProposta (2.40 — antes uma variável
// solta no Orcamento.js).
let pendente = null;

export function guardarTransporte(dados) {
  pendente = dados;
}

// O estado guardado para ESTA proposta (e o esvazia); null se não há ou é de outra.
export function tomarTransporte(id) {
  if (!id || !pendente || pendente.id !== String(id)) return null;
  const t = pendente;
  pendente = null;
  return t;
}
