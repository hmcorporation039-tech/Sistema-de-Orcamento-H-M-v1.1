// Escape de texto para dentro de XML (conteúdo de elemento e valor de atributo entre aspas duplas) — um lugar
// só (estava copiado no .docx do atestado de capacidade e no pedido de cancelamento da NFS-e Nacional; auditoria
// 02/11/2026, OP-09). O & vem primeiro, senão o &lt; viraria &amp;lt;. Para HTML de PDF use o escapeHtml.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

module.exports = { esc };
