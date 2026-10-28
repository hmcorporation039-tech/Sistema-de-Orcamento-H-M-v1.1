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

// Corta em `max` unidades de texto sem partir um caractere de 2 unidades
// (emoji, alguns símbolos): o corte no meio deixava meio caractere solto e o
// encodeURIComponent do filename* estourava (URIError → erro 500 no download).
// Corta no mesmo ponto de antes; só recua 1 quando cairia no meio do par.
function cortarTexto(texto, max) {
  const s = String(texto ?? '');
  if (s.length <= max) return s;
  let fim = Math.max(0, max);
  const c = s.charCodeAt(fim - 1);
  if (c >= 0xd800 && c <= 0xdbff) fim--; // 1ª metade de um par: fica de fora
  return s.slice(0, fim);
}

// Meio caractere solto já vindo no nome (texto colado/corrompido) também
// quebraria o encodeURIComponent: vira o caractere de substituição
const bemFormado = (s) => (typeof s.toWellFormed === 'function' ? s.toWellFormed() : s.replace(/[�-�](?![�-�])|(?<![�-�])[�-�]/g, '�'));

// limpa o nome sem perder acentos: sem caracteres de controle, sem barras
// (não é caminho) e com tamanho limitado (mantendo a extensão)
function limparNome(nome, padrao = 'arquivo') {
  let s = bemFormado(String(nome ?? ''))
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[\\/]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s || /^\.+$/.test(s)) s = padrao;
  if (s.length > TAMANHO_MAX) {
    const ext = (s.match(/\.[A-Za-z0-9]{1,6}$/) || [''])[0];
    s = cortarTexto(s, TAMANHO_MAX - ext.length).trimEnd() + ext;
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

module.exports = { contentDisposition, nomeAscii, limparNome, codificarRfc5987, cortarTexto };
