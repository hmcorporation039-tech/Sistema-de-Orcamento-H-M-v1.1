// Edições do usuário numa análise de projeto, para o "Reprocessar com o mapa conferido" (item 3 do plano) não
// jogar fora o trabalho de revisão. A análise guarda o que o sistema LEU (analises_projeto.leitura_original,
// migração 2.0-28); a edição do usuário é a diferença entre o lido e o salvo:
//   - campo mudado num item (quantidade, valor, "pronto", observação…) → vale a edição do usuário;
//   - item que o usuário retirou → continua fora na análise nova;
//   - item que o usuário acrescentou → entra na análise nova.
// Exceção que protege a contagem: se o usuário mexeu na QUANTIDADE de um item que o mapa conferido acabou de
// recalcular (a quantidade lida agora é outra), vale a do mapa e o item é listado em `recalculados`, para ele rever.
// Funções puras; sem base (análise anterior ao registro) nada é copiado e o resumo diz isso.
const { chaveNome } = require('../utils/texto');

const CAMPOS_EDITAVEIS = ['quantidade', 'valor_unitario', 'pronto', 'unidade', 'observacao', 'material_id', 'preco_catalogo',
  'confianca_catalogo', 'descricao_catalogo', 'referencia_fabricante', 'subgrupo'];

const igual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// chave estável do item: disciplina + código + descrição normalizada (repetido ganha #n)
function indexar(lista) {
  const mapa = new Map();
  const vistos = new Map();
  for (const it of Array.isArray(lista) ? lista : []) {
    const base = `${it?.disciplina || ''}|${it?.codigo || ''}|${chaveNome(it?.descricao)}`;
    const n = (vistos.get(base) || 0) + 1;
    vistos.set(base, n);
    mapa.set(n > 1 ? `${base}#${n}` : base, it);
  }
  return mapa;
}

const rotulo = (it) => String(it?.descricao || it?.codigo || '').slice(0, 120);

// base: o que foi lido na análise antiga; atual: o que está salvo nela (editado); novo: o que a releitura produziu.
// Devolve { lista, resumo: { alterados, removidos, acrescentados, recalculados: [rótulo] } } — não altera os argumentos.
function mesclarLista(base, atual, novo) {
  const resumo = { alterados: 0, removidos: 0, acrescentados: 0, recalculados: [] };
  const mb = indexar(base), ma = indexar(atual), mn = indexar(novo);
  const resultado = new Map([...mn].map(([k, it]) => [k, { ...it }]));
  for (const [k, ib] of mb) {
    const ia = ma.get(k);
    if (!ia) { // o usuário retirou
      if (resultado.delete(k)) resumo.removidos++;
      continue;
    }
    const it = resultado.get(k);
    if (!it) continue;
    let mexeu = false;
    for (const c of CAMPOS_EDITAVEIS) {
      if (igual(ia[c], ib[c])) continue; // não foi editado
      if (c === 'quantidade' && !igual(it.quantidade, ib.quantidade)) { // o mapa recalculou: vale o mapa
        resumo.recalculados.push(rotulo(it));
        continue;
      }
      it[c] = ia[c];
      mexeu = true;
    }
    if (mexeu) resumo.alterados++;
  }
  for (const [k, ia] of ma) { // o usuário acrescentou (não existia no que foi lido)
    if (mb.has(k) || resultado.has(k)) continue;
    resultado.set(k, { ...ia });
    resumo.acrescentados++;
  }
  return { lista: [...resultado.values()], resumo };
}

// Aplica as edições da análise anterior ao resultado da releitura (altera resultado.servicos e resultado.materiais).
// anterior: linha de analises_projeto { servicos, materiais, leitura_original }.
function herdarEdicoes(resultado, anterior) {
  const base = anterior?.leitura_original;
  if (!base || (!Array.isArray(base.servicos) && !Array.isArray(base.materiais))) {
    return { copiadas: false, motivo: 'A análise anterior foi feita antes de o sistema registrar o que leu; as edições dela não foram copiadas.' };
  }
  const s = mesclarLista(base.servicos, anterior.servicos, resultado.servicos);
  const m = mesclarLista(base.materiais, anterior.materiais, resultado.materiais);
  resultado.servicos = s.lista;
  resultado.materiais = m.lista;
  const soma = (campo) => s.resumo[campo] + m.resumo[campo];
  return {
    copiadas: true,
    servicos: s.resumo, materiais: m.resumo,
    alterados: soma('alterados'), removidos: soma('removidos'), acrescentados: soma('acrescentados'),
    recalculados: [...s.resumo.recalculados, ...m.resumo.recalculados],
  };
}

module.exports = { mesclarLista, herdarEdicoes, CAMPOS_EDITAVEIS };
