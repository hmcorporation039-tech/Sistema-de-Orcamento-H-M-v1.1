// Escape de texto para dentro de XML (conteúdo de elemento e valor de atributo entre aspas duplas):
// .docx montado à mão, XML da NFS-e. O & vem primeiro, senão o &lt; viraria &amp;lt;.
// Nulo/indefinido viram texto vazio (o utils/xml.js do backend mantém o String(s) de sempre).
// Para HTML de PDF use o escapeHtml.
const escXml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

module.exports = { escXml };
