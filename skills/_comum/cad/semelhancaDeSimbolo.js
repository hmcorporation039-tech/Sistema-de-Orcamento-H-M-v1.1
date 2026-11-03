// Reconhecimento por SEMELHANÇA (plano "sistema autônomo", 03/11/2026). A legenda e a biblioteca de blocos casam a
// layer pelo nome EXATO: o escritório novo, que chama a layer de "ELE_TOMADAS_BAIXAS" em vez de "EL-TOMADAS", ficava
// sem nada. Aqui a forma que nenhuma regra reconheceu é comparada com TUDO o que o sistema já aprendeu (legendas lidas e
// confirmações do mapa do CAD, de qualquer escritório): nome da layer parecido (trigramas das palavras), mesma medida
// (em tamanho real, quando o aprendido é por medida; senão a proporção) e mesmo preenchimento. Os vizinhos mais
// parecidos votam (a confirmação do engenheiro vale o dobro da legenda) e a resposta sai com a confiança e a faixa —
// "provável" ou "possível", como o par "Matches / Possible Matches" dos programas de takeoff. Abaixo disso: não chuta.
// É sempre SUGESTÃO: a linha continua "falta conferir" e só conta no orçamento depois de confirmada.
// Função pura (roda na thread do leitor do CAD).

// palavras que não dizem o que o símbolo é (prefixo de disciplina, "layer", "símbolo", número de pavimento…)
const GENERICAS = new Set(['EL', 'ELE', 'ELET', 'E', 'INST', 'INS', 'PROJ', 'PRJ', 'LAYER', 'LAY', 'SIMB', 'SIMBOLO', 'SIMBOLOS', 'SYMBOL',
  'SYMBOLS', 'BLOCO', 'BLOCOS', 'DEF', 'PAV', 'PVTO', 'TERREO', 'NOVO', 'NOVA', 'EXIST', 'EXISTENTE', 'HM', 'QI', 'PDF', 'COR', 'DE', 'DA', 'DO']);
const K = 7;
const MINIMO_NOME = 0.35; // a layer tem de lembrar a do exemplo: só a forma (um quadrado de 20 cm) é ambígua demais
const FAIXA_PROVAVEL = 0.75;
const FAIXA_POSSIVEL = 0.5;

function palavras(layer) {
  return String(layer || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/([A-Z])(\d)/g, '$1 $2').split(/[^A-Z0-9]+/).filter(p => p.length >= 2 && !GENERICAS.has(p) && !/^\d+$/.test(p))
    // o plural não muda o que o símbolo é (TOMADAS = TOMADA, LUMINARIAS = LUMINARIA)
    .map(p => (p.length > 4 && p.endsWith('S') && !p.endsWith('SS') ? p.slice(0, -1) : p));
}
// trigramas das palavras (TOMADA, TOMADAS e TOM. viram parentes) e as palavras inteiras
function assinaturaDoNome(layer) {
  const s = new Set();
  for (const p of palavras(layer)) {
    s.add(`w:${p}`);
    const q = `_${p}_`;
    for (let i = 0; i + 3 <= q.length; i++) s.add(`g:${q.slice(i, i + 3)}`);
  }
  return s;
}
const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n);
};
const ordenada = (m) => [...m].map(Number).sort((a, b) => b - a);
// medida: em tamanho real (aprendido por medida) a diferença relativa de cada lado; senão a proporção
function semelhancaDaMedida(exemplo, medida) {
  const [a0, a1] = ordenada(exemplo.medida);
  const [b0, b1] = medida;
  if (!(a0 > 0) || !(b0 > 0)) return 0;
  if (exemplo.porMedida) return Math.exp(-2.5 * (Math.abs(Math.log(a0 / b0)) + Math.abs(Math.log(Math.max(a1, 0.005) / Math.max(b1, 0.005)))));
  return Math.exp(-3 * Math.abs(Math.log((a1 / a0) / (b1 / b0) || 1)));
}

// exemplos: as linhas aprendidas (services/simbolosAprendidos.carregar: { layer, medida, fracao, simbolo, disciplina,
// texto, usuario?, porMedida?, escritorio? }); cada uma ganha a assinatura do nome uma vez só (prepararExemplos)
function prepararExemplos(aprendidos) {
  return (aprendidos || []).filter(l => l?.layer && Array.isArray(l.medida) && l.simbolo && l.simbolo !== '?' && !/^PDF-COR-/i.test(l.layer))
    .map(l => ({ ...l, nome: assinaturaDoNome(l.layer) }));
}

// → { simbolo, disciplina, texto, confianca (0–1), faixa: 'provavel'|'possivel', base: { layer, escritorio, usuario } } ou null
function porSemelhanca(exemplos, layer, medida, fracao = 0) {
  if (!exemplos?.length || /^PDF-COR-/i.test(layer || '')) return null;
  const nome = assinaturaDoNome(layer);
  if (!nome.size) return null;
  const m = ordenada(medida);
  const vizinhos = [];
  for (const ex of exemplos) {
    const sn = jaccard(nome, ex.nome);
    if (sn < MINIMO_NOME) continue;
    const sm = semelhancaDaMedida(ex, m);
    const sf = 1 - Math.min(1, Math.abs((Number(ex.fracao) || 0) - (Number(fracao) || 0)) / 0.3);
    vizinhos.push({ ex, nota: 0.55 * sn + 0.3 * sm + 0.15 * sf });
  }
  if (!vizinhos.length) return null;
  vizinhos.sort((a, b) => b.nota - a.nota);
  const votos = new Map();
  let total = 0;
  for (const { ex, nota } of vizinhos.slice(0, K)) {
    const peso = nota * (ex.usuario ? 2 : 1);
    total += peso;
    const v = votos.get(ex.simbolo) || { peso: 0, melhor: null };
    v.peso += peso;
    if (!v.melhor) v.melhor = { ex, nota };
    votos.set(ex.simbolo, v);
  }
  const [simbolo, v] = [...votos].sort((a, b) => b[1].peso - a[1].peso)[0];
  // concordância dos vizinhos × o quanto o melhor deles se parece
  const confianca = Math.round((v.peso / total) * v.melhor.nota * 100) / 100;
  if (confianca < FAIXA_POSSIVEL) return null;
  const { ex } = v.melhor;
  return {
    simbolo, disciplina: ex.disciplina || '', texto: ex.texto || '', ...(Number(ex.altura_m) > 0 ? { altura_m: Number(ex.altura_m) } : {}),
    confianca, faixa: confianca >= FAIXA_PROVAVEL ? 'provavel' : 'possivel',
    base: { layer: ex.layer, escritorio: ex.escritorio || '', usuario: !!ex.usuario },
  };
}

module.exports = { porSemelhanca, prepararExemplos, assinaturaDoNome, palavras, FAIXA_PROVAVEL, FAIXA_POSSIVEL };
