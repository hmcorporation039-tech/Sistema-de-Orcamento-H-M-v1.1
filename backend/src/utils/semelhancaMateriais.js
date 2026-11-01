// Semelhança entre descrições de materiais pelo índice de Jaccard (termos em
// comum ÷ termos da união). Um lugar só para o tokenizador e o índice — antes
// a mesma conta estava escrita duas vezes, com tokenizações diferentes, em
// compatibilizacaoAnalise (preço sugerido do catálogo) e em
// classificacaoMateriais (categoria pelo material mais parecido).
//
// Cada uso mantém a SUA tokenização e o SEU corte, porque foram calibrados
// separadamente e mudar qualquer um muda resultado na tela:
//   - catálogo (compararComCatalogo, abaixo): palavras com mais de 2 letras,
//     vírgula separa, corte 0,45;
//   - classificação (services/classificacaoMateriais.js): termos com 2 letras
//     ou mais, vírgula fica ("2,5" é um termo), sem palavras vazias, corte 0,5.
// testes/semelhancaMateriais.test.js fixa os resultados dos dois.
// Funções puras: o catálogo vem pronto de quem chama.

const ACENTOS = /[̀-ͯ]/g;

// Termos de uma descrição: sem acento, em maiúsculas, só letras e números (e a
// vírgula, com `manterVirgula`), descartando os curtos e as palavras vazias.
function termosDaDescricao(descricao, { minimo = 3, manterVirgula = false, palavrasVazias = null } = {}) {
  const texto = String(descricao || '').normalize('NFD').replace(ACENTOS, '').toUpperCase();
  const partes = texto.match(manterVirgula ? /[A-Z0-9,]+/g : /[A-Z0-9]+/g) || [];
  return new Set(partes.filter(t => t.length >= minimo && !(palavrasVazias && palavrasVazias.has(t))));
}

// Índice de Jaccard entre dois conjuntos de termos (0 quando os dois são vazios).
// Comuns ÷ união, e não comuns ÷ lado menor: com o lado menor, um material de
// descrição curta virava subconjunto trivial e cravava 100% — "PARAFUSO"
// casava com "PARAFUSO AUTOBROCANTE 4.2X32 CAIXA 100UN (R$ 99)" e sugeria
// R$ 99 por um parafuso. Jaccard penaliza a diferença de tamanho.
function indiceJaccard(a, b) {
  let comuns = 0;
  for (const t of a) if (b.has(t)) comuns++;
  return comuns / (a.size + b.size - comuns || 1);
}

// --- catálogo de materiais (preço sugerido) ---
const OPCOES_CATALOGO = { minimo: 3 }; // ignora palavras curtas (DE, OU, UN...)
const CORTE_CATALOGO = 0.45;

// Casa a descrição de um item (equipamento extraído do projeto, item de laudo,
// material de kit) com o catálogo de materiais já cadastrado, por sobreposição
// de palavras (sem exigir texto idêntico — a redação do projeto quase nunca
// bate com a do catálogo). Só assume a correspondência com índice >= 0,45 —
// senão fica sem preço sugerido, pra não arriscar comparar coisas diferentes.
// Empate: fica o primeiro do catálogo (quem chama ordena por id).
// `catalogo` é passado pronto — comparar vários itens não repete a consulta.
// Especificação técnica (bitola, corrente, tensão, potência, polos, diâmetro…): número +
// unidade, normalizado ("2,5 mm²" → MM2=2.5; "3P"/"tripolar" → P=3). Auditoria de
// 01/11/2026: os termos curtos e a vírgula sumiam da comparação e "Cabo flexível 2,5mm²"
// casava 80% com o "1,5mm²" do catálogo (e 6,5 mm², 100%), "Disjuntor 10A" com o de 16A —
// e o preço errado entrava como confirmado. Agora a especificação diferente é OUTRO material.
const UNIDADES_SPEC = [
  [/^MM(2|²)$/, 'MM2'], [/^MM$/, 'MM'], [/^(CM)$/, 'CM'], [/^(POL|"|'')$/, 'POL'], [/^A$/, 'A'], [/^KA$/, 'KA'], [/^MA$/, 'MA'],
  [/^V$/, 'V'], [/^KV$/, 'KV'], [/^W$/, 'W'], [/^KW$/, 'KW'], [/^K?VA$/, null], [/^KWP$/, 'KWP'], [/^CV$/, 'CV'], [/^HP$/, 'HP'],
  [/^P$/, 'P'], [/^POLOS?$/, 'P'], [/^VIAS?$/, 'VIAS'], [/^PARES?$/, 'PARES'], [/^AWG$/, 'AWG'], [/^MP$/, 'MP'], [/^LM$/, 'LM'], [/^K$/, 'K'],
  [/^AH$/, 'AH'], [/^TB$/, 'TB'], [/^GB$/, 'GB'], [/^PORTAS?$/, 'PORTAS'], [/^U$/, 'U'],
];
const POLOS_POR_NOME = { MONOPOLAR: 1, UNIPOLAR: 1, BIPOLAR: 2, TRIPOLAR: 3, TETRAPOLAR: 4 };
function especificacoes(descricao) {
  const texto = String(descricao || '').normalize('NFD').replace(ACENTOS, '').toUpperCase();
  const specs = new Map();
  const re = /(\d+\s?\/\s?\d+|\d+(?:[.,]\d+)?)\s*(MM²|MM2|MM|CM|POL|"|''|KA|MA|A|KV|V|KWP|KW|W|KVA|VA|CV|HP|POLOS?|P|VIAS?|PARES?|AWG|MP|LM|K|AH|TB|GB|PORTAS?|U)(?![A-Z0-9])/g;
  let m;
  while ((m = re.exec(texto))) {
    const u = UNIDADES_SPEC.find(([r]) => r.test(m[2]));
    const un = u && u[1] ? u[1] : m[2];
    // "3/4"" fica fração (polegada); "450/750 V" são as duas tensões; "2,5" e "2.50" o mesmo número
    const num = (x) => String(Number(x.replace(',', '.')));
    const vs = !m[1].includes('/') ? [num(m[1])] : un === 'POL' ? [m[1].replace(/\s/g, '')] : m[1].split('/').map(x => num(x.trim()));
    if (!specs.has(un)) specs.set(un, new Set());
    for (const v of vs) specs.get(un).add(v);
  }
  for (const [nome, n] of Object.entries(POLOS_POR_NOME)) if (new RegExp(`\\b${nome}\\b`).test(texto)) { if (!specs.has('P')) specs.set('P', new Set()); specs.get('P').add(String(n)); }
  return specs;
}
// mesma unidade nos dois com valores diferentes = especificação diferente
function especificacaoConflita(a, b) {
  for (const [un, va] of a) {
    const vb = b.get(un);
    if (vb && ![...va].some(v => vb.has(v))) return true;
  }
  return false;
}

// Chave do vínculo aprendido (services/aprendizadoMateriais.js): a descrição sem acento,
// em maiúsculas e com um espaço só — "Cabo  flexível 2,5mm²" e "CABO FLEXIVEL 2,5MM²" são a mesma
const chaveDaDescricao = (d) => String(d || '').normalize('NFD').replace(ACENTOS, '').toUpperCase().replace(/\s+/g, ' ').trim().slice(0, 300);

function compararComCatalogo(descricao, catalogo) {
  // vínculo aprendido no orçamento confirmado (catalogo.aliases): o material certo, direto
  const idAprendido = catalogo?.aliases?.get?.(chaveDaDescricao(descricao));
  const aprendido = idAprendido && catalogo.find(m => m.id === idAprendido);
  if (aprendido) {
    return { material_id: aprendido.id, descricao_catalogo: aprendido.descricao, preco_catalogo: Number(aprendido.preco), unidade_catalogo: aprendido.unidade, confianca: 100, origem: 'alias' };
  }
  const alvo = termosDaDescricao(descricao, OPCOES_CATALOGO);
  if (alvo.size === 0) return null;
  const specAlvo = especificacoes(descricao);

  let melhor = null;
  for (const mat of catalogo) {
    const termosMat = termosDaDescricao(mat.descricao, OPCOES_CATALOGO);
    if (termosMat.size === 0) continue;
    if (specAlvo.size && especificacaoConflita(specAlvo, especificacoes(mat.descricao))) continue;
    const score = indiceJaccard(alvo, termosMat);
    if (score >= CORTE_CATALOGO && (!melhor || score > melhor.score)) {
      melhor = { score, material: mat };
    }
  }

  if (!melhor) return null;
  return {
    material_id: melhor.material.id,
    descricao_catalogo: melhor.material.descricao,
    preco_catalogo: Number(melhor.material.preco),
    unidade_catalogo: melhor.material.unidade,
    confianca: Math.round(melhor.score * 100),
  };
}

// Correspondência boa o bastante para o preço entrar "confirmado" no orçamento: texto quase
// igual (≥ 90%) ou o vínculo aprendido/confirmado antes. Abaixo disso o item entra com o
// preço sugerido, mas "a cotar" — antes 45% de palavras em comum já confirmava o preço.
const CONFIANCA_CONFIRMA = 90;
const confirmaPreco = (achado) => !!achado && (achado.origem === 'alias' || Number(achado.confianca) >= CONFIANCA_CONFIRMA);

module.exports = { termosDaDescricao, indiceJaccard, compararComCatalogo, chaveDaDescricao, especificacoes, especificacaoConflita, confirmaPreco, CONFIANCA_CONFIRMA };
