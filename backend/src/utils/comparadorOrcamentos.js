// Comparação do orçamento da H&M com o de um concorrente para o MESMO projeto (06/11/2026): casa os itens pela
// descrição (mesma semelhança do catálogo, com a especificação — bitola, corrente, polos — tendo de bater), compara
// quantidade e preço e aponta o que só um dos dois incluiu. Função pura: recebe as duas listas prontas.
//
// Preço comparável: o concorrente manda preço de VENDA (com BDI e impostos dentro); a proposta da H&M guarda o custo
// por item e aplica BDI e impostos no total. Por isso o unitário da H&M é levado a preço de venda pelo fator da
// própria proposta (total ÷ subtotal de materiais e serviços), separado para material e serviço quando o BDI difere.
const { termosDaDescricao, indiceJaccard, especificacoes, especificacaoConflita } = require('./semelhancaMateriais');

const CORTE = 0.45;               // igual ao casamento com o catálogo
const DIF_QUANTIDADE = 0.2;       // quantidade 20 % diferente: conferir na planta
const DIF_PRECO = 0.15;           // unitário 15 % acima do concorrente: revisar o preço
const PRECO_SUSPEITO = 0.5;       // concorrente abaixo da metade: pode ser outro produto/qualidade
const ACENTOS = /[̀-ͯ]/g;
const norm = (s) => String(s ?? '').normalize('NFD').replace(ACENTOS, '').toLowerCase().replace(/\s+/g, ' ').trim();
const r2 = (v) => Math.round(Number(v) * 100) / 100;
const pct = (v) => Math.round(v * 1000) / 10; // 0,1234 → 12,3
const UNIDADE = { m: 'm', mt: 'm', mts: 'm', metro: 'm', metros: 'm', ml: 'm', un: 'un', und: 'un', unid: 'un', unidade: 'un', pc: 'un', pç: 'un', peca: 'un', pt: 'un', ponto: 'un', cj: 'cj', conj: 'cj', kit: 'cj', vb: 'vb', verba: 'vb', gl: 'vb', rl: 'rl', rolo: 'rl', par: 'par' };
const unidadeNormal = (u) => UNIDADE[norm(u).replace(/\.$/, '')] || norm(u).replace(/\.$/, '');

// fatores de venda da proposta (custo do item → preço que o cliente paga)
function fatoresDeVenda(proposta) {
  const mat = Number(proposta.subtotal_materiais) || 0;
  const mo = Number(proposta.subtotal_mao_obra) || 0;
  const total = Number(proposta.total) || 0;
  const geral = mat + mo > 0 && total > 0 ? total / (mat + mo) : 1;
  return { material: geral, servico: geral, geral };
}

function semelhanca(a, b) {
  if (especificacaoConflita(a.specs, b.specs)) return 0;
  let s = indiceJaccard(a.termos, b.termos);
  if (s <= 0) return 0;
  if (a.tipo && b.tipo && a.tipo === b.tipo) s += 0.05;
  if (a.unidade && b.unidade && unidadeNormal(a.unidade) === unidadeNormal(b.unidade)) s += 0.05;
  return Math.min(1, s);
}

// nossos: [{ id, descricao, unidade, quantidade, valor_unitario, tipo, disciplina }]
// deles:  [{ id, descricao, unidade, quantidade, valor_unitario, valor_total, tipo, disciplina, par_item_id, par_descricao, sem_par }]
// proposta: { subtotal_materiais, subtotal_mao_obra, total }
function comparar(nossos, deles, proposta, opcoes = {}) {
  const fator = fatoresDeVenda(proposta || {});
  const N = nossos.map(it => {
    const vendaUnit = r2((Number(it.valor_unitario) || 0) * (it.tipo === 'servico' ? fator.servico : fator.material));
    return { ...it, termos: termosDaDescricao(it.descricao), specs: especificacoes(it.descricao), venda_unitario: vendaUnit, venda_total: r2(vendaUnit * (Number(it.quantidade) || 0)) };
  });
  const D = deles.map(it => ({
    ...it, termos: termosDaDescricao(it.descricao), specs: especificacoes(it.descricao),
    total: Number(it.valor_total) > 0 ? Number(it.valor_total) : r2((Number(it.valor_unitario) || 0) * (Number(it.quantidade) || 0)),
  }));

  // 1) vínculos manuais (o engenheiro corrigiu o casamento): pelo id do item ou, depois de salvar a proposta (os
  // itens são recriados), pela descrição guardada
  const usadosN = new Set();
  const usadosD = new Set();
  const pares = [];
  for (const d of D) {
    if (d.sem_par) { usadosD.add(d); continue; }
    if (!d.par_item_id && !d.par_descricao) continue;
    const n = N.find(x => !usadosN.has(x) && x.id === d.par_item_id) || N.find(x => !usadosN.has(x) && d.par_descricao && norm(x.descricao) === norm(d.par_descricao));
    if (!n) continue;
    usadosN.add(n); usadosD.add(d);
    pares.push({ n, d, s: 1, manual: true });
  }
  // 2) automático: todos os pares acima do corte, do mais parecido para o menos, cada item uma vez só
  const candidatos = [];
  for (const d of D) {
    if (usadosD.has(d)) continue;
    for (const n of N) {
      if (usadosN.has(n)) continue;
      const s = semelhanca(n, d);
      if (s >= CORTE) candidatos.push({ n, d, s });
    }
  }
  candidatos.sort((a, b) => b.s - a.s);
  for (const c of candidatos) {
    if (usadosN.has(c.n) || usadosD.has(c.d)) continue;
    usadosN.add(c.n); usadosD.add(c.d);
    pares.push(c);
  }

  const resumoItem = (n) => ({ id: n.id, descricao: n.descricao, unidade: n.unidade, quantidade: Number(n.quantidade) || 0, custo_unitario: Number(n.valor_unitario) || 0, venda_unitario: n.venda_unitario, venda_total: n.venda_total, tipo: n.tipo, disciplina: n.disciplina || null });
  const resumoDeles = (d) => ({ id: d.id, descricao: d.descricao, unidade: d.unidade, quantidade: Number(d.quantidade) || 0, valor_unitario: Number(d.valor_unitario) || 0, valor_material: d.valor_material ?? null, valor_mao_obra: d.valor_mao_obra ?? null, total: r2(d.total), tipo: d.tipo, disciplina: d.disciplina || null });

  const linhas = pares.map(({ n, d, s, manual }) => {
    const qn = Number(n.quantidade) || 0;
    const qd = Number(d.quantidade) || 0;
    const ud = Number(d.valor_unitario) || 0;
    const mesmaUnidade = !n.unidade || !d.unidade || unidadeNormal(n.unidade) === unidadeNormal(d.unidade);
    const difQtd = qn > 0 ? (qd - qn) / qn : null;
    const difPreco = n.venda_unitario > 0 && ud > 0 && mesmaUnidade ? (ud - n.venda_unitario) / n.venda_unitario : null;
    const alertas = [];
    if (!mesmaUnidade) alertas.push(`unidades diferentes (${n.unidade} × ${d.unidade}): compare com cuidado`);
    if (difQtd != null && Math.abs(difQtd) > DIF_QUANTIDADE) alertas.push(`quantidade ${difQtd > 0 ? 'maior' : 'menor'} no concorrente (${qd} × ${qn}): confira na planta`);
    if (difPreco != null && difPreco < -DIF_PRECO) alertas.push(`nosso preço ${pct(-difPreco)} % acima do concorrente: revise a cotação ou a margem`);
    if (difPreco != null && ud < n.venda_unitario * PRECO_SUSPEITO) alertas.push('concorrente abaixo da metade do nosso preço: pode ser outro produto, marca ou qualidade — confira a especificação');
    if (!(n.venda_unitario > 0)) alertas.push('nosso item está sem preço (a cotar): o preço do concorrente serve de referência');
    return {
      nosso: resumoItem(n), deles: resumoDeles(d), semelhanca: Math.round(s * 100), manual: !!manual,
      dif_quantidade_pct: difQtd != null ? pct(difQtd) : null,
      dif_preco_pct: difPreco != null ? pct(difPreco) : null,
      // quanto o cliente pagaria a mais conosco neste item, na NOSSA quantidade (preço × preço, sem misturar escopo)
      dif_valor: difPreco != null ? r2((n.venda_unitario - ud) * qn) : null,
      alertas,
    };
  });
  const soDeles = D.filter(d => !usadosD.has(d) || d.sem_par).map(resumoDeles);
  const soNossos = N.filter(n => !usadosN.has(n)).map(resumoItem);

  // totais: nosso preço de venda (o total da proposta) × o do concorrente (total do documento ou soma dos itens)
  const somaDeles = r2(D.reduce((s, d) => s + d.total, 0));
  const totalDeles = Number(opcoes.totalDocumento) > 0 ? Number(opcoes.totalDocumento) : somaDeles;
  const totalNosso = Number(proposta?.total) > 0 ? Number(proposta.total) : r2(N.reduce((s, n) => s + n.venda_total, 0));
  const porGrupo = (chave) => {
    const g = {};
    const somar = (k, lado, v) => { (g[k] ||= { nosso: 0, deles: 0 })[lado] = r2(g[k][lado] + v); };
    for (const n of N) somar(chave(n) || 'outros', 'nosso', n.venda_total);
    for (const d of D) somar(chave(d) || 'outros', 'deles', d.total);
    return g;
  };
  const comPreco = linhas.filter(l => l.dif_preco_pct != null);
  const resumo = {
    total_nosso: r2(totalNosso), total_deles: r2(totalDeles), soma_itens_deles: somaDeles,
    diferenca: r2(totalNosso - totalDeles), diferenca_pct: totalDeles > 0 ? pct((totalNosso - totalDeles) / totalDeles) : null,
    fator_venda: Math.round(fator.geral * 10000) / 10000,
    pares: linhas.length, so_deles: soDeles.length, so_nossos: soNossos.length,
    valor_so_deles: r2(soDeles.reduce((s, d) => s + d.total, 0)),
    valor_so_nossos: r2(soNossos.reduce((s, n) => s + n.venda_total, 0)),
    nos_mais_caros: comPreco.filter(l => l.dif_preco_pct < 0).length,
    nos_mais_baratos: comPreco.filter(l => l.dif_preco_pct > 0).length,
    // onde o concorrente é mais barato no mesmo item: o quanto daria para baixar igualando o preço dele
    potencial_reducao: r2(comPreco.filter(l => l.dif_valor > 0).reduce((s, l) => s + l.dif_valor, 0)),
    por_tipo: porGrupo(x => x.tipo),
    por_disciplina: porGrupo(x => x.disciplina),
  };
  return { linhas, soDeles, soNossos, resumo, recomendacoes: recomendar(linhas, soDeles, soNossos, resumo) };
}

const moeda = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
// O que fazer para oferecer o melhor ao cliente — regras simples, sem IA, na ordem de impacto
function recomendar(linhas, soDeles, soNossos, resumo) {
  const r = [];
  if (resumo.total_deles > 0) {
    if (resumo.diferenca > 0) r.push(`Nosso total está ${moeda(resumo.diferenca)} (${resumo.diferenca_pct} %) acima do concorrente. Comece pelos itens de maior diferença abaixo.`);
    else if (resumo.diferenca < 0) r.push(`Nosso total está ${moeda(-resumo.diferenca)} (${Math.abs(resumo.diferenca_pct)} %) abaixo do concorrente. Antes de manter a vantagem, confira se não faltou escopo (itens que só o concorrente incluiu).`);
  }
  const caros = linhas.filter(l => l.dif_valor > 0).sort((a, b) => b.dif_valor - a.dif_valor).slice(0, 5);
  if (caros.length) r.push(`Maiores diferenças de preço (nosso acima): ${caros.map(l => `${l.nosso.descricao.slice(0, 60)} (+${moeda(l.dif_valor)})`).join('; ')}. Revise a cotação desses itens, a marca adotada ou a margem.`);
  if (soDeles.length) {
    const maiores = [...soDeles].sort((a, b) => b.total - a.total).slice(0, 5);
    r.push(`${soDeles.length} item(ns) só no orçamento do concorrente (${moeda(resumo.valor_so_deles)}): ${maiores.map(d => d.descricao.slice(0, 60)).join('; ')}. Se fazem parte do escopo do projeto, inclua no nosso; se não fazem, é argumento para o cliente (o concorrente está cobrando o que o projeto não pede).`);
  }
  if (soNossos.length) {
    r.push(`${soNossos.length} item(ns) só no nosso orçamento (${moeda(resumo.valor_so_nossos)}). Se o projeto pede, destaque para o cliente que o concorrente não incluiu (risco de aditivo depois); se não pede, retire.`);
  }
  const qtd = linhas.filter(l => l.dif_quantidade_pct != null && Math.abs(l.dif_quantidade_pct) > DIF_QUANTIDADE * 100);
  if (qtd.length) r.push(`${qtd.length} item(ns) com quantidade mais de ${DIF_QUANTIDADE * 100} % diferente: confira na planta quem contou certo antes de mexer no preço.`);
  const suspeitos = linhas.filter(l => l.alertas.some(a => /outro produto/.test(a)));
  if (suspeitos.length) r.push(`${suspeitos.length} item(ns) do concorrente abaixo da metade do nosso preço: provável produto de outra linha/marca. Vale explicar ao cliente a diferença de especificação.`);
  if (!r.length) r.push('Os dois orçamentos estão equivalentes item a item: a decisão do cliente fica em prazo, garantia e qualidade da execução.');
  return r;
}

module.exports = { comparar, fatoresDeVenda, unidadeNormal, paraTestes: { semelhanca, CORTE } };
