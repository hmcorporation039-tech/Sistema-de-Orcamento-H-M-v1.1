// Quem projetou: o responsável técnico do carimbo (ou o CREA), normalizado. É a chave do que o sistema aprende das
// notas do desenho por escritório (services/notasAprendidas.js). Vazio = o carimbo não diz.
const { chaveNome } = require('./texto');

const chaveEscritorio = (carimbo) => chaveNome(carimbo?.responsavel || carimbo?.crea || '').slice(0, 120);

// Prancha em PDF (versão 2.30): no acervo real o leitor do carimbo quase nunca acha o responsável (12 de 12 pranchas
// recentes sem ele). Reservas, nesta ordem: a linha "AUTOR DO PROJETO: …" / "PROJETISTA: …" / "RESPONSÁVEL TÉCNICO: …"
// do texto da folha e a sigla da projetista no código do desenho ("DE-HSL-5300-DME-PE-002…" → DME), o padrão de
// numeração de pranchas dos grandes clientes.
const RE_AUTOR = /(?:AUTOR(?:\s+DO)?\s+PROJETO|PROJETISTA|RESPONS[ÁA]VEL\s+T[ÉE]CNICO|RESP\.\s*T[ÉE]CN?\.?)\s*[:-]\s*([^\n\t:]{5,60})/i;
const RE_CODIGO_DESENHO = /^[A-Z]{2}-[A-Z0-9]{2,6}-\d{3,5}-([A-Z]{3})-[A-Z]{2}-/i;
// o leitor às vezes pega o RÓTULO do carimbo no lugar do nome (ensaio com o acervo: "RESPONSAVEL TECNICO", "PELA",
// "LOCALIZACAO ESQUEMATICA"): nome de verdade tem 2+ palavras e nenhuma palavra de rótulo; o CREA vale sozinho
const RE_ROTULO = /\b(RESPONSAVEL|TECNICO|LOCALIZACAO|ESQUEMATICA|PELA|PELO|PROJETO|DESENHO|DATA|ESCALA|FOLHA|REVISAO|ASSINATURA|CLIENTE|OBRA|ENDERECO|PRANCHA|CONTEUDO|APROVADO|VERIFICADO)\b/;
const nomeValido = (n) => !!n && !RE_ROTULO.test(n) && (/^CREA\b/.test(n) || n.split(' ').filter(p => p.length >= 2).length >= 2);
function escritorioDoPdf(carimbo, texto = '', nomeArquivo = '') {
  const doCarimbo = chaveEscritorio(carimbo);
  if (nomeValido(doCarimbo)) return doCarimbo;
  const m = RE_AUTOR.exec(String(texto || ''));
  if (m) {
    const nome = chaveNome(m[1].split(/\s{2,}/)[0].trim());
    if (/^[A-Z][A-Z .']{4,}$/.test(nome) && nomeValido(nome)) return nome.slice(0, 120);
  }
  const c = RE_CODIGO_DESENHO.exec(String(nomeArquivo || ''));
  return c ? `CODIGO ${c[1].toUpperCase()}` : '';
}

module.exports = { chaveEscritorio, escritorioDoPdf };
