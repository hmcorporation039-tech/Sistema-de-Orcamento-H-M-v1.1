// Classificador local de materiais (item 7 do plano): aprende as categorias do próprio catálogo
// (descrições já classificadas pela H&M) e diz a categoria de uma descrição nova COM uma confiança.
// Só vale a resposta quando a confiança passa do corte; abaixo dele não chuta e a decisão segue
// para a etapa seguinte (palavras-chave, depois IA). Sem dependência nova e sem chamada externa.
//
// Método: TF-IDF sobre os termos da descrição + trigramas de cada palavra (acha "FLEX", "FLEXIVEL" e
// "FLEX." como parentes), similaridade do cosseno e voto ponderado dos K vizinhos mais próximos.
// Funções puras: o catálogo (descrição + categoria) vem pronto de quem chama.
const { termosDaDescricao } = require('./semelhancaMateriais');

const PALAVRAS_VAZIAS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'P', 'PARA', 'COM', 'C', 'S', 'SEM', 'E', 'EM', 'X', 'A', 'O', 'UN', 'PC', 'PCT']);
const K = 5;
const MINIMO_EXEMPLOS = 20; // abaixo disso o catálogo é pequeno demais para confiar no resultado

// Características de uma descrição: termos inteiros e trigramas das palavras com 4 letras ou mais
function caracteristicas(descricao, { trigramas = true } = {}) {
  const termos = termosDaDescricao(descricao, { minimo: 2, manterVirgula: false, palavrasVazias: PALAVRAS_VAZIAS });
  const lista = [];
  for (const t of termos) {
    lista.push(`w:${t}`);
    if (trigramas && t.length >= 4 && /[A-Z]/.test(t)) for (let i = 0; i + 3 <= t.length; i++) lista.push(`g:${t.slice(i, i + 3)}`);
  }
  return lista;
}

// Treina: guarda o vetor TF-IDF normalizado de cada exemplo. `exemplos` = [{ descricao, categoria }]
function treinar(exemplos, { k = K, trigramas = true } = {}) {
  const validos = exemplos.filter(e => e && e.descricao && e.categoria);
  const docs = validos.map(e => ({ categoria: e.categoria, descricao: e.descricao, carac: new Set(caracteristicas(e.descricao, { trigramas })) }));
  const df = new Map();
  for (const d of docs) for (const c of d.carac) df.set(c, (df.get(c) || 0) + 1);
  const n = docs.length;
  const idf = (c) => Math.log((n + 1) / ((df.get(c) || 0) + 1)) + 1;
  const vetorizar = (carac) => {
    const v = new Map();
    let norma = 0;
    for (const c of carac) { const w = idf(c); v.set(c, w); norma += w * w; }
    norma = Math.sqrt(norma) || 1;
    for (const [c, w] of v) v.set(c, w / norma);
    return v;
  };
  for (const d of docs) d.vetor = vetorizar(d.carac);
  return { docs, n, vetorizar, k, trigramas, categorias: [...new Set(docs.map(d => d.categoria))] };
}

function cosseno(a, b) {
  const [menor, maior] = a.size <= b.size ? [a, b] : [b, a];
  let s = 0;
  for (const [c, w] of menor) { const x = maior.get(c); if (x) s += w * x; }
  return s;
}

// { categoria, confianca (0 a 1), similaridade, vizinhos[] } ou null (modelo pequeno/descrição vazia).
// confiança = parte do voto dos K vizinhos que vai para a categoria vencedora × similaridade do melhor vizinho:
// só é alta quando os vizinhos concordam E há um vizinho de fato parecido.
function classificar(modelo, descricao) {
  if (!modelo || modelo.n < MINIMO_EXEMPLOS) return null;
  const carac = new Set(caracteristicas(descricao, { trigramas: modelo.trigramas }));
  if (!carac.size) return null;
  const v = modelo.vetorizar(carac);
  const vizinhos = modelo.docs.map(d => ({ d, s: cosseno(v, d.vetor) })).filter(x => x.s > 0).sort((x, y) => y.s - x.s).slice(0, modelo.k);
  if (!vizinhos.length) return null;
  const votos = new Map();
  let total = 0;
  for (const { d, s } of vizinhos) { const p = s * s; votos.set(d.categoria, (votos.get(d.categoria) || 0) + p); total += p; }
  const [categoria, voto] = [...votos.entries()].sort((a, b) => b[1] - a[1])[0];
  const similaridade = vizinhos[0].s;
  return {
    categoria, similaridade,
    confianca: (voto / total) * similaridade,
    vizinhos: vizinhos.slice(0, 3).map(x => ({ descricao: x.d.descricao, categoria: x.d.categoria, similaridade: x.s })),
  };
}

module.exports = { treinar, classificar, caracteristicas, K, MINIMO_EXEMPLOS };
