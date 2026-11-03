// Escape de texto para dentro de HTML (PDF do backend, folhas e desenhos SVG das skills).
// Regra do projeto: TODO texto que vem do banco/formulário passa por escapeHtml.
// Nulo/indefinido viram texto vazio.
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

module.exports = { escapeHtml };
