// Cópia do núcleo de backend/src/utils/curvaAbc.js (curva ABC da proposta) —
// a tela, o PDF e a planilha fazem a mesma conta. NÃO edite só aqui: mude no
// backend e copie o bloco entre as marcas (o teste do backend confere que são iguais).

// ==== INÍCIO DO NÚCLEO COMPARTILHADO (curvaAbc) ====
// Limites em % do valor acumulado: classe A até 80 %, B até 95 %, C o resto.
// Regra: a classe vem do acumulado ANTES do item — o item que cruza os 80 %
// ainda é A (a classe A cobre pelo menos 80 % do valor e nunca fica vazia).
const LIMITES_CURVA_ABC = { A: 80, B: 95 };

const arred2Abc = (v) => Math.round(((Number(v) || 0) + Number.EPSILON) * 100) / 100;
const normAbc = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

function classeAbc(acumuladoAnteriorPct, limites) {
  const lim = limites || LIMITES_CURVA_ABC;
  if (acumuladoAnteriorPct < lim.A - 1e-9) return 'A';
  if (acumuladoAnteriorPct < lim.B - 1e-9) return 'B';
  return 'C';
}

// itens: [{ descricao, quantidade, unidade, valor_unitario, tipo: 'material'|'servico', codigo }]
// O mesmo item lançado em mais de uma linha (mesmo tipo, descrição e unidade)
// vira UMA linha da curva, com as quantidades e os valores somados. O valor de
// cada linha é o da proposta: unitário arredondado × quantidade, arredondado
// (mesma conta de calculoProposta.normalizarItem). Custo direto, sem BDI.
function calcularCurvaAbc(itens, limites) {
  const lim = { ...LIMITES_CURVA_ABC, ...(limites || {}) };
  const grupos = new Map();
  (Array.isArray(itens) ? itens : []).forEach((it, indice) => {
    const tipo = it.tipo === 'servico' ? 'servico' : 'material';
    const chave = `${tipo}|${normAbc(it.descricao)}|${normAbc(it.unidade)}`;
    const qtd = Number(it.quantidade);
    const quantidade = Number.isFinite(qtd) ? qtd : 0;
    const total = arred2Abc(quantidade * arred2Abc(it.valor_unitario));
    let g = grupos.get(chave);
    if (!g) {
      g = { descricao: String(it.descricao || '').trim(), codigo: it.codigo || '', unidade: it.unidade || '', tipo, quantidade: 0, total: 0, valor_unitario: arred2Abc(it.valor_unitario), origens: [] };
      grupos.set(chave, g);
    }
    g.quantidade += quantidade;
    g.total = arred2Abc(g.total + total);
    if (!g.codigo && it.codigo) g.codigo = it.codigo;
    g.origens.push(indice);
  });

  const lista = [...grupos.values()].sort((a, b) => (b.total - a.total) || a.descricao.localeCompare(b.descricao, 'pt-BR'));
  const totalGeral = arred2Abc(lista.reduce((s, g) => s + g.total, 0));
  let somaAcumulada = 0;
  const resumo = { A: { itens: 0, valor: 0, pct: 0 }, B: { itens: 0, valor: 0, pct: 0 }, C: { itens: 0, valor: 0, pct: 0 } };
  const linhas = lista.map((g, i) => {
    const anterior = totalGeral > 0 ? (somaAcumulada / totalGeral) * 100 : 100;
    somaAcumulada += g.total;
    const pct = totalGeral > 0 ? (g.total / totalGeral) * 100 : 0;
    const pctAcumulado = totalGeral > 0 ? (somaAcumulada / totalGeral) * 100 : 0;
    const classe = classeAbc(anterior, lim);
    resumo[classe].itens += 1;
    resumo[classe].valor = arred2Abc(resumo[classe].valor + g.total);
    if (g.quantidade > 0 && g.origens.length > 1) g.valor_unitario = arred2Abc(g.total / g.quantidade);
    return { posicao: i + 1, ...g, pct, pct_acumulado: pctAcumulado, classe };
  });
  for (const c of ['A', 'B', 'C']) resumo[c].pct = totalGeral > 0 ? (resumo[c].valor / totalGeral) * 100 : 0;
  return { itens: linhas, total: totalGeral, resumo, limites: lim };
}
// ==== FIM DO NÚCLEO COMPARTILHADO (curvaAbc) ====

export {
  LIMITES_CURVA_ABC, calcularCurvaAbc, classeAbc,
};
