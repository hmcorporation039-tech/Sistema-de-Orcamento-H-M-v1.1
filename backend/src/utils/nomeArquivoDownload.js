// Cabeçalho Content-Disposition com nome de arquivo acentuado (versão 2.0).
//
// `filename="..."` só aceita ASCII com segurança: acento cru chega estragado
// (ex.: "OrÃ§amento.pdf") quando o arquivo é baixado direto pelo navegador, e
// aspas/quebras de linha no nome quebrariam o cabeçalho. O padrão (RFC 6266 +
// RFC 5987) é mandar os dois:
//   attachment; filename="Orcamento_Joao.pdf"; filename*=UTF-8''Or%C3%A7amento_Jo%C3%A3o.pdf
// O navegador usa o filename* (nome certo, com acento); o filename é a reserva.
//
// Uso: res.set('Content-Disposition', contentDisposition(nome))
//      res.set('Content-Disposition', contentDisposition(nome, 'inline'))

const TAMANHO_MAX = 180;

// limpa o nome sem perder acentos: sem caracteres de controle, sem barras
// (não é caminho) e com tamanho limitado (mantendo a extensão)
function limparNome(nome, padrao = 'arquivo') {
  let s = String(nome ?? '')
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[\\/]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s || /^\.+$/.test(s)) s = padrao;
  if (s.length > TAMANHO_MAX) {
    const ext = (s.match(/\.[A-Za-z0-9]{1,6}$/) || [''])[0];
    s = s.slice(0, TAMANHO_MAX - ext.length).trimEnd() + ext;
  }
  return s;
}

// versão só com ASCII imprimível: tira o acento ("ç" → "c"), o resto vira "_";
// sem aspas nem barra invertida (não podem aparecer dentro de filename="...")
function nomeAscii(nome, padrao = 'arquivo') {
  const s = limparNome(nome, padrao)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
    .replace(/_+/g, '_')
    .trim();
  return s || padrao;
}

// RFC 5987 (ext-value): UTF-8 com %XX; encodeURIComponent deixa passar ' ( ) *,
// que não são attr-char — também codificados
function codificarRfc5987(nome) {
  return encodeURIComponent(nome).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function contentDisposition(nome, tipo = 'attachment', padrao = 'arquivo') {
  const disp = tipo === 'inline' ? 'inline' : 'attachment';
  const limpo = limparNome(nome, padrao);
  return `${disp}; filename="${nomeAscii(limpo, padrao)}"; filename*=UTF-8''${codificarRfc5987(limpo)}`;
}

module.exports = { contentDisposition, nomeAscii, limparNome, codificarRfc5987 };
