// Texto do pedido normalizado (sem acento, minúsculo, só letras/números) e os termos que importam — usado pelo
// roteador de intenção, pelo aprendizado do vocabulário e pela busca na base de conhecimento. Sem dependências.
const normalizar = (s) => ` ${String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[-_/]+/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
const tokens = (s) => normalizar(s).trim().split(' ').filter(Boolean);

// palavras que não dizem nada sozinhas (artigos, preposições, verbos de cortesia)
const VAZIAS = new Set(('a o os as um uma uns umas de do da dos das no na nos nas em por para pra pro com sem e ou que se me te nos voce voces '
  + 'este esta esse essa isto isso aquele aquela aqui ai la ja tambem favor porfavor pf obrigado obrigada ola oi bom dia boa tarde noite '
  + 'pode poderia consegue conseguiria quero queria gostaria preciso precisamos vamos ser sera seja fazer faca faz eu meu minha nosso nossa '
  + 'ao aos as sobre entre ate apos depois antes mais menos muito muita todo toda todos todas cada qual quais como quando onde porque '
  + 'agora hoje so apenas ele ela eles elas lhe dele dela tem ter tenho temos ha estou esta estao foi era sim nao').split(' '));

// termos significativos (para regra aprendida e busca): sem palavras vazias e sem números soltos
function termosSignificativos(s, { max = 8 } = {}) {
  const vistos = new Set();
  const out = [];
  for (const t of tokens(s)) {
    if (t.length < 3 || VAZIAS.has(t) || /^\d+$/.test(t) || vistos.has(t)) continue;
    vistos.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

module.exports = { normalizar, tokens, termosSignificativos, VAZIAS };
