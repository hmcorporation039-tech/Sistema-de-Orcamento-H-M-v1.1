import { arred2, arredQtd, totalDaLinha } from '../../utils/dinheiro';
import { tributosBdi } from '../../utils/bdiTcu';
import { SUBGRUPOS_PADRAO, ehMaoDeObra, gerarId, pertenceASecao, temBdiMateriais } from './apoio';

// Contas e montagens do editor de orçamento, sem estado (saíram de pages/Orcamento.js em 2.39,
// sem mudar o resultado). Arredondamentos iguais aos do servidor (utils/dinheiro.js ↔
// calculoProposta): quantidade 3 casas, unitário 2, linha 2 (totalDaLinha), parcelas 2 (arred2).

// Mesma conta do servidor (backend/src/utils/calculoProposta.js): quantidade
// com 3 casas, unitário com 2, total de cada linha arredondado, e cada
// componente (subtotais, BDI, impostos, total) arredondado — tela e PDF batem no centavo.
export function subtotalSecao(itens, sid) {
  return itens
    .filter(it => pertenceASecao(it, sid))
    .reduce((s, it) => s + totalDaLinha(it.quantidade, it.valor_unitario), 0);
}

// Subtotais, BDI (único ou diferenciado de materiais), impostos e total da proposta.
// `taxas` = { bdi, bdi_materiais, imposto_venda, imposto_servico } do formulário.
export function calcularTotais(itens, secoes, taxas) {
  let mat = 0, mao = 0;
  for (const sec of secoes) {
    const sub = subtotalSecao(itens, sec.id);
    if (ehMaoDeObra(sec.nome)) mao += sub;
    else mat += sub;
  }
  mat = arred2(mat);
  mao = arred2(mao);
  const bdiPct = Number(taxas.bdi) || 0;
  // BDI diferenciado (calculoProposta.detalharBdi): sem ele, a expressão de sempre
  let vBdi, vBdiMat = null, vBdiMao = null;
  if (temBdiMateriais(taxas.bdi_materiais)) {
    vBdiMat = arred2(mat * (Number(taxas.bdi_materiais) / 100));
    vBdiMao = arred2(mao * (bdiPct / 100));
    vBdi = arred2(vBdiMat + vBdiMao);
  } else {
    vBdi = arred2((mat + mao) * (bdiPct / 100));
  }
  const vImpVenda = arred2(mat * ((Number(taxas.imposto_venda) || 0) / 100));
  const vImpServico = arred2(mao * ((Number(taxas.imposto_servico) || 0) / 100));
  return {
    subtotalMateriais: mat, subtotalMaoObra: mao, valorBdi: vBdi, valorBdiMateriais: vBdiMat, valorBdiMaoObra: vBdiMao,
    valorImpostoVenda: vImpVenda, valorImpostoServico: vImpServico,
    total: arred2(mat + mao + vBdi + vImpVenda + vImpServico),
  };
}

// itens para a curva ABC (tipo pela seção, como no PDF e na planilha)
export function itensParaCurvaAbc(itens, secoes) {
  const tipoDaSecao = new Map(secoes.map(s => [s.id, ehMaoDeObra(s.nome) ? 'servico' : 'material']));
  return itens.map(it => ({
    // como o servidor grava (quantidade 3 casas, unitário 2): mesma curva do PDF
    descricao: it.descricao, quantidade: arredQtd(it.quantidade), unidade: it.unidade,
    valor_unitario: arred2(it.valor_unitario), codigo: it.codigo, tipo: tipoDaSecao.get(it.sid) || 'material',
  }));
}

// Avisos do BDI (Fase 3F): memória com tributos dentro + impostos por fora
// (imposto contado duas vezes) e BDI mudado à mão depois do cálculo.
export function avisosDoBdi(memoriaBdi, taxas) {
  const lista = [];
  if (!memoriaBdi) return lista;
  const tributosDentro = tributosBdi(memoriaBdi.parcelas, memoriaBdi.regime) > 0;
  if (tributosDentro && ((Number(taxas.imposto_venda) || 0) > 0 || (Number(taxas.imposto_servico) || 0) > 0)) {
    lista.push('O BDI calculado já inclui os tributos (PIS, COFINS, ISS…) e a proposta ainda soma "Imp. Vendas"/"Imp. Serviços" por fora — o imposto entra duas vezes. Zere esses campos ou recalcule o BDI sem tributos.');
  }
  if (Math.abs((Number(taxas.bdi) || 0) - memoriaBdi.bdi) > 0.005) {
    lista.push(`O BDI da proposta (${taxas.bdi} %) não é o da composição calculada (${memoriaBdi.bdi.toLocaleString('pt-BR')} %) — o anexo do PDF vai avisar a diferença. Abra o calculador e aplique de novo, ou remova a composição.`);
  }
  if (memoriaBdi.materiais && (!temBdiMateriais(taxas.bdi_materiais) || Math.abs(Number(taxas.bdi_materiais) - memoriaBdi.materiais.bdi) > 0.005)) {
    lista.push(`O BDI de materiais da proposta não é o da composição (${memoriaBdi.materiais.bdi.toLocaleString('pt-BR')} %).`);
  }
  return lista;
}

// Sugestões de subgrupo: os padrões da empresa + os que já foram usados nessa seção
// (permite tanto escolher um dos padrões quanto reaproveitar um nome digitado antes)
export function subgruposDaSecao(itens, sid) {
  const usados = itens.filter(it => it.sid === sid).map(it => (it.subgrupo || '').trim()).filter(Boolean);
  return Array.from(new Set([...SUBGRUPOS_PADRAO, ...usados]));
}

// Agrupa os itens de uma seção por subgrupo, na ordem em que aparecem (os
// itens já chegam reordenados por reordenarPorSubgrupo — isso só monta os
// cabeçalhos e o subtotal de cada grupo), igual ao "Bloco X" do PDF de
// referência. Fecha o grupo anterior com um subtotal (soma dos totais dos
// itens dele) sempre que o subgrupo muda ou a lista acaba — sem subtotal
// pros itens sem subgrupo (não formam um "bloco" de verdade).
export function itensAgrupados(itens, sid) {
  const lista = itens.filter(it => pertenceASecao(it, sid));
  const linhas = [];
  let ultimoSubgrupo = null;
  let somaGrupo = 0;
  const fecharGrupo = () => {
    if (ultimoSubgrupo) linhas.push({ tipo: 'subtotal', nome: ultimoSubgrupo, soma: somaGrupo, key: `sub_${linhas.length}` });
  };
  for (const it of lista) {
    const sg = (it.subgrupo || '').trim() || null;
    if (sg !== ultimoSubgrupo) {
      fecharGrupo();
      if (sg) linhas.push({ tipo: 'cabecalho', nome: sg, key: `cab_${it.id}` });
      ultimoSubgrupo = sg;
      somaGrupo = 0;
    }
    somaGrupo += totalDaLinha(it.quantidade, it.valor_unitario);
    linhas.push({ tipo: 'item', item: it });
  }
  fecharGrupo();
  return linhas;
}

// Reagrupa os itens de UMA seção por subgrupo (mantendo as outras seções
// exatamente onde estavam) — sem isso, mudar o subgrupo de um item só
// trocava o rótulo dele, mas a posição na lista continuava a mesma, então
// ele não "se juntava" visualmente aos outros itens do mesmo subgrupo
// (itensAgrupados só detecta troca entre vizinhos, não reordena sozinho).
// Ordena pela primeira vez que cada subgrupo aparece na lista atual — o
// sort é estável, então a ordem relativa dentro de cada subgrupo não muda.
export function reordenarPorSubgrupo(lista, sid) {
  const primeiraOcorrencia = new Map();
  let posicao = 0;
  for (const it of lista) {
    if (it.sid !== sid) continue;
    const sg = (it.subgrupo || '').trim();
    if (!primeiraOcorrencia.has(sg)) primeiraOcorrencia.set(sg, posicao);
    posicao++;
  }
  const daSecao = lista.filter(it => it.sid === sid);
  const ordenados = [...daSecao].sort((a, b) =>
    primeiraOcorrencia.get((a.subgrupo || '').trim()) - primeiraOcorrencia.get((b.subgrupo || '').trim())
  );
  let cursor = 0;
  return lista.map(it => (it.sid === sid ? ordenados[cursor++] : it));
}

// Formulário da tela a partir da proposta gravada (GET /propostas/:id)
export function formDaProposta(p) {
  return {
    data: (p.data || '').slice(0, 10),
    validade: p.validade,
    tipo: p.tipo || '',
    porte: p.porte || '',
    cliente_nome: p.cliente_nome || '',
    cliente_id: p.cliente_id ?? null,
    responsavel: p.responsavel || '',
    local_obra: p.local_obra || '',
    escopo: p.escopo || '',
    pagamento: p.pagamento || '',
    observacoes: p.observacoes || '',
    bdi: Number(p.bdi) || 0,
    bdi_materiais: temBdiMateriais(p.bdi_materiais) ? Number(p.bdi_materiais) : null,
    bdi_memoria: p.bdi_memoria || null,
    imposto_venda: Number(p.imposto_venda) || 0,
    imposto_servico: Number(p.imposto_servico) || 0,
    desconto_materiais_pct: p.desconto_materiais_pct != null ? Number(p.desconto_materiais_pct) : null,
    desconto_mao_obra_pct: p.desconto_mao_obra_pct != null ? Number(p.desconto_mao_obra_pct) : null,
    obra_id: p.obra_id ?? null,
  };
}

// Itens da tela a partir da proposta gravada, já reagrupados por subgrupo em cada seção — sem
// isso, uma proposta salva antes dessa correção (ou com itens lançados fora de ordem) só ficava
// reorganizada depois que alguém mexesse manualmente num subgrupo.
export function itensDaProposta(p) {
  let itens = (p.itens || []).map(it => ({
    id: gerarId(), sid: it.secao_id, material_id: it.material_id,
    descricao: it.descricao, quantidade: Number(it.quantidade), unidade: it.unidade,
    valor_unitario: Number(it.valor_unitario), ncm: it.ncm || '', codigo: it.codigo || '',
    subgrupo: it.subgrupo || '', status: it.status || 'confirmado',
    // 'assistente' = sugerido pela IA (assistente virtual): fica "a cotar" até o engenheiro confirmar aqui
    origem_item: it.origem_item || null
  }));
  for (const sid of new Set(itens.map(it => it.sid))) {
    itens = reordenarPorSubgrupo(itens, sid);
  }
  return itens;
}

// Confere o que o servidor também recusaria, apontando o item com problema.
// Devolve a mensagem do primeiro problema ou null.
export function problemaParaSalvar(form, itens) {
  if (!form.cliente_nome.trim()) return 'Informe o cliente da proposta';
  if (itens.length === 0) return 'Adicione ao menos um item à proposta';
  for (const [i, it] of itens.entries()) {
    if (!String(it.descricao || '').trim()) return `O item ${i + 1} está sem descrição`;
    const qtd = Number(it.quantidade);
    if (!Number.isFinite(qtd) || qtd < 0) return `Quantidade inválida no item ${i + 1}`;
    const vu = Number(it.valor_unitario);
    if (!Number.isFinite(vu) || vu < 0) return `Valor unitário inválido no item ${i + 1}`;
  }
  return null;
}

// Corpo do POST/PUT /propostas. clienteId = cliente do cadastro (escolhido na lista) ou null.
export function montarPayload(form, secoes, itens, clienteId) {
  return {
    data: form.data,
    validade: Number(form.validade) || 5,
    tipo: form.tipo,
    porte: form.porte,
    cliente_id: clienteId || null,
    cliente_nome: form.cliente_nome.trim(),
    responsavel: form.responsavel,
    local_obra: form.local_obra,
    escopo: form.escopo,
    pagamento: form.pagamento,
    observacoes: form.observacoes,
    bdi: Number(form.bdi) || 0,
    // Fase 3F: sempre enviados — null limpa (BDI único / sem composição)
    bdi_materiais: temBdiMateriais(form.bdi_materiais) ? Number(form.bdi_materiais) : null,
    bdi_memoria: form.bdi_memoria || null,
    imposto_venda: Number(form.imposto_venda) || 0,
    imposto_servico: Number(form.imposto_servico) || 0,
    desconto_materiais_pct: form.desconto_materiais_pct,
    desconto_mao_obra_pct: form.desconto_mao_obra_pct,
    // obra (2.0): sempre enviada — no PUT, null desliga a proposta da obra
    obra_id: form.obra_id || null,
    // Subtotais/BDI/impostos/total não são mais enviados: o backend
    // recalcula tudo a partir dos itens (antes ele gravava o que o
    // navegador mandasse, e uma quantidade zerada fazia o PDF sair com a
    // linha valendo o preço cheio e o total geral sem ela).
    secoes: secoes.map(s => ({ id: s.id, nome: s.nome })),
    itens: itens.map(it => ({
      // quantidade com 3 casas e unitário com 2, como o servidor grava
      sid: it.sid, desc: it.descricao, qtd: arredQtd(it.quantidade),
      un: it.unidade, vu: arred2(it.valor_unitario), ncm: it.ncm || null,
      codigo: it.codigo || null, material_id: it.material_id || null,
      subgrupo: it.subgrupo?.trim() || null, status: it.status || 'confirmado',
      // a marca do item sugerido pela IA vai junto (o servidor o mantém "a cotar" e fora do catálogo enquanto existir)
      origem_item: it.origem_item || null
    })),
  };
}
