// Leitor LOCAL da lista de equipamentos do projeto (plano "sistema autônomo", 03/11/2026): os itens que terminam em
// "REF.: <código>" ("JACK RJ-45, NÃO BLINDADO, PINAGEM UNIVERSAL. REF.: 1375055-X, AMP OU TECNICAMENTE EQUIVALENTE").
// Antes TODO arquivo ia para a IA (services/equipamentoExtratorIA.js), até o que não tinha nenhum "REF.". O texto tem
// padrão fixo: a descrição vem antes do "REF.:", o código logo depois, e o item acaba em "EQUIVALENTE", ";" ou na
// linha seguinte que começa outro item. A descrição quebrada em linhas (texto do PDF) é remontada: a linha de cima
// entra quando termina em vírgula/ponto/dois-pontos ou quando a de baixo continua a frase (minúscula, "COMP.:",
// "ALTURA:"…). Rótulo solto da planta ("ESTAÇÃO DE TRABALHO") não entra.
// → { itens: [{ descricao, referencia_fabricante, fabricante? }], marcadores, completos }: `completos` ÷ `marcadores`
//   diz se a leitura local basta (quem chama decide se pergunta à IA). Função pura.

const RE_REF = /\bREF\s*\.?\s*:/i;
const RE_FIM = /(EQUIVALENTE(\s+T[ÉE]CNICO)?|SIMILAR)\s*[.;]?\s*$|;\s*\S{0,8}\s*$/i;
// atributo que continua a descrição da linha de cima
const RE_ATRIBUTO = /^(COMP|ALTURA|DI[ÂA]M|DENSIDADE|COR|DIM|ESP|TEMP|IRC|POT|TENS|CORRENTE|BITOLA|SE[ÇC][ÃA]O|MODELO|ACAB|CAPACIDADE)\b/i;
// cauda do item na linha seguinte: "5-1375202-X, AMP OU", "TECNICAMENTE EQUIVALENTE", "equivalente técnico, vide…"
const RE_CAUDA = /^([\w.\-/]+\s*,\s*)?[\w ]{0,20}\b(OU|TECNICAMENTE|EQUIVALENTE|SIMILAR)\b/i;
const RE_EQUIVALENTE = /,?\s*\b(OU\s+)?(TECNICAMENTE\s+)?(EQUIVALENTE|SIMILAR)(\s+T[ÉE]CNICO)?\b[^;]*/gi;

const limpar = (s) => String(s || '').replace(/\\/g, '').replace(/[\t ]+/g, ' ').trim();
// o pedaço de baixo continua a frase de cima: minúscula, atributo ("COMP.:"), conectivo ("OU 24 FIBRAS", "EM BLOCO
// IDC"), primeira palavra seguida de vírgula ("ÓPTICA, PADRÃO 19\"") ou curto demais para ser um item ("UNIVERSAL.")
const RE_CONECTIVO = /^(OU|E|EM|DE|DA|DO|DOS|DAS|PARA|COM|SEM|À|AO|NA|NO)\s/i;
const palavrasDe = (s) => (String(s).match(/[A-Za-zÀ-ú0-9]{2,}/g) || []).length;
const continua = (primeira, juntado) => /^[a-zà-ú]/.test(primeira) || RE_ATRIBUTO.test(primeira) || RE_CONECTIVO.test(primeira)
  || /^[^\s,]+,/.test(primeira) || palavrasDe(juntado) < 4;
// a linha de cima termina no meio da frase: pontuação de continuação ou conectivo ("… Cat.6 PARA")
const terminaAberta = (s) => (/[,.:]$/.test(s) || /\s(PARA|DE|DA|DO|COM|SEM|EM|E|OU)$/i.test(s)) && !RE_FIM.test(s);

function lerReferencia(depois) {
  // "1375055-X, AMP OU TECNICAMENTE EQUIVALENTE" → código "1375055-X", fabricante "AMP"
  const s = limpar(depois).replace(/^[:\s]+/, '');
  // "OU" só encerra o código antes de "EQUIVALENTE"/"SIMILAR" ou no fim ("Fyrmica ou Pertech" são duas marcas aceitas)
  const corte = s.search(/;|,|\s\bOU\b(?=\s*(T[ÉE]CNICAMENTE|EQUIVALENTE|SIMILAR|$))|\(|\s-\s/i);
  const referencia = limpar(corte >= 0 ? s.slice(0, corte) : s).replace(/[.]+$/, '').slice(0, 60);
  const fab = /^[^,;]*,\s*([A-Za-zÀ-ú][\w&.\- ]{1,25}?)\s+OU\b/i.exec(s)?.[1] || null;
  return { referencia, fabricante: fab && !/EQUIVALENTE|T[ÉE]CNIC/i.test(fab) ? limpar(fab) : null };
}

function lerEquipamentosRef(texto) {
  const linhas = String(texto || '').split(/\r?\n/).map(limpar).filter(Boolean);
  const itens = [];
  let marcadores = 0;
  let completos = 0;
  let fimDoUltimo = -1; // a descrição de um item não volta para dentro do item anterior
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const m = RE_REF.exec(l);
    if (!m) continue;
    marcadores++;
    let antes = l.slice(0, m.index);
    let depois = l.slice(m.index + m[0].length);
    // "REF.:" no fim da linha: o código está na linha seguinte
    let j = i;
    if (!limpar(depois) && i + 1 < linhas.length && !RE_REF.test(linhas[i + 1])) { j = i + 1; depois = linhas[j]; }
    // a descrição que começou nas linhas de cima (até 3)
    let primeira = limpar(antes) || l;
    for (let k = i - 1, n = 0; k > fimDoUltimo && n < 3; k--, n++) {
      const cima = linhas[k];
      if (RE_REF.test(cima) || RE_FIM.test(cima)) break;
      if (!(terminaAberta(cima) || continua(primeira, antes))) break;
      antes = `${cima} ${antes}`;
      primeira = cima;
    }
    // a cauda do item ("AMP OU" / "TECNICAMENTE EQUIVALENTE") nas linhas de baixo
    let cauda = depois;
    while (!RE_FIM.test(cauda) && j + 1 < linhas.length && !RE_REF.test(linhas[j + 1]) && RE_CAUDA.test(linhas[j + 1]) && j - i < 3) {
      j++;
      cauda = `${cauda} ${linhas[j]}`;
    }
    fimDoUltimo = j;
    i = j;
    const { referencia, fabricante } = lerReferencia(cauda);
    // o resto da linha depois do código ("DIM.: 0,80x2,10m - 1 unidade") ainda descreve o item
    // (o que vem depois de ";" é outra coisa da prancha — "P-02"; o fabricante de "AMP OU TECNICAMENTE" já foi lido)
    const semInicio = cauda.replace(/^[:\s]*/, '');
    const resto = limpar(semInicio.slice(semInicio.indexOf(referencia) + referencia.length).split(';')[0])
      .replace(/(^|,)\s*[^,]*\bOU\b\s*((T[ÉE]CNICAMENTE|EQUIVALENTE|SIMILAR)\b.*)?$/i, '')
      .replace(RE_EQUIVALENTE, '').replace(/^[,.;\s]+|[,.;\s]+$/g, '');
    const descricao = limpar(`${limpar(antes).replace(/[,.;:\s]+$/, '')}${resto && !/^[A-Za-zÀ-ú]{1,25}$/.test(resto) ? `, ${resto}` : ''}`)
      .replace(/,\s*,/g, ',').replace(/,\s*-\s/g, ' - ').slice(0, 300);
    if (!/[A-Za-zÀ-ú]{3,}/.test(descricao)) continue;
    const completo = !!referencia && /[A-Za-z0-9]{2,}/.test(referencia);
    if (completo) completos++;
    itens.push({ descricao, referencia_fabricante: completo ? referencia : null, ...(fabricante ? { fabricante } : {}) });
  }
  // o mesmo item repetido nas pranchas (detalhe e legenda): uma vez só
  const vistos = new Set();
  const unicos = itens.filter((it) => {
    const k = `${it.descricao.toUpperCase()}|${it.referencia_fabricante || ''}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  return { itens: unicos, marcadores, completos };
}

module.exports = { lerEquipamentosRef };
