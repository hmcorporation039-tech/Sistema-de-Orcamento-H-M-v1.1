// Cores do status da proposta — uma tabela só (revisão de 28/10/2026, etapa 7
// do kit de tela). Antes Propostas (Historico.js), Painel (Dashboard.js) e
// Obras (obras/comum.js) tinham cada um a sua cópia; status novo entra aqui.
//   bg / cor / borda  etiqueta escura da lista de propostas e da obra
//   realce            fundo translúcido da etiqueta do Painel (cor + 20% opaco)
export const STATUS_PROPOSTA = {
  Ativa: { bg: '#1a1a0a', cor: '#c9a227', borda: '#4a3d10', realce: '#c9a22733' },
  Aprovada: { bg: '#0a1a0f', cor: '#3fb95f', borda: '#1a4a26', realce: '#3fb95f33' },
  Recusada: { bg: '#1a0a0a', cor: '#b04040', borda: '#4a1a1a', realce: '#b0404033' },
  Cancelada: { bg: '#141414', cor: '#666', borda: '#2a2a2a', realce: '#66666633' },
};
