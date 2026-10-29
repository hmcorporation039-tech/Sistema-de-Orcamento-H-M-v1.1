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
function compararComCatalogo(descricao, catalogo) {
  const alvo = termosDaDescricao(descricao, OPCOES_CATALOGO);
  if (alvo.size === 0) return null;

  let melhor = null;
  for (const mat of catalogo) {
    const termosMat = termosDaDescricao(mat.descricao, OPCOES_CATALOGO);
    if (termosMat.size === 0) continue;
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

module.exports = { termosDaDescricao, indiceJaccard, compararComCatalogo };
