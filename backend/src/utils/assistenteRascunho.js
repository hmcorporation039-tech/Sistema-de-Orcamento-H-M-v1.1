// Edição de rascunho pelo assistente virtual (e pelas ações que ele propõe e o
// usuário aplica). Um lugar só para as duas pontas — a ferramenta
// editar_rascunho do MCP do assistente (src/mcp/assistenteFerramentas.mjs) e a
// ação "editar_proposta" aplicada pelo usuário (services/assistente/acoes.js) —
// para que "trocar a quantidade do item 12" signifique a mesma coisa nos dois.
//
// Nada aqui grava: transforma a proposta lida em GET /propostas/:id no corpo do
// PUT /propostas/:id (o mesmo que a tela de Orçamento manda), aplicando as
// operações pedidas. Totais, validação, catálogo e auditoria continuam no
// servidor (propostasController.atualizar), como para a tela.
const { ehMaoDeObra, arredondar, arredondarQuantidade } = require('./calculoProposta');

const SECAO_SERVICOS = 'Serviços (Mão de Obra)';
const SECAO_MATERIAIS = 'Materiais e Equipamentos';
const STATUS_ITEM = ['confirmado', 'a_cotar'];
const CAMPOS_PROPOSTA = ['cliente_nome', 'local_obra', 'escopo', 'pagamento', 'observacoes', 'responsavel'];
const PERCENTUAIS = ['bdi', 'imposto_venda', 'imposto_servico'];
const MAX_OPERACOES = 300;

class ErroRascunho extends Error {}

// Resumo das alterações (cartão de ação que o usuário confirma): cada campo
// alterado mostra o valor ANTES → DEPOIS, com o texto inteiro (até ~600
// caracteres). Antes o cartão dizia só "escopo alterado" e o usuário aprovava
// sem ver o que o assistente ia gravar.
const LIMITE_TEXTO_RESUMO = 600;
function cortarTexto(v, limite = LIMITE_TEXTO_RESUMO) {
  // linha em branco no meio do texto quebraria a separação resumo/motivo do cartão
  const t = String(v ?? '').replace(/\r/g, '').replace(/\n{2,}/g, '\n');
  return t.length > limite ? `${t.slice(0, limite)}…` : t;
}
const citar = (v) => (v == null || v === '' ? '(vazio)' : `"${cortarTexto(v)}"`);
const reais = (v) => `R$ ${Number(v || 0).toFixed(2)}`;

const dataIso = (d) => (d ? String(d instanceof Date ? d.toISOString() : d).slice(0, 10) : d);

// GET /propostas/:id → corpo do PUT (igual ao montarPayload da tela). Cada item
// leva `_id` (o id de proposta_itens) para as operações acharem o item.
function propostaParaPayload(p) {
  return {
    data: dataIso(p.data),
    validade: Number(p.validade) || 5,
    tipo: p.tipo || '',
    porte: p.porte || '',
    cliente_id: p.cliente_id || null,
    cliente_nome: p.cliente_nome || '',
    responsavel: p.responsavel || '',
    local_obra: p.local_obra || '',
    escopo: p.escopo || '',
    pagamento: p.pagamento || '',
    observacoes: p.observacoes || '',
    bdi: Number(p.bdi) || 0,
    bdi_materiais: p.bdi_materiais != null && p.bdi_materiais !== '' ? Number(p.bdi_materiais) : null,
    bdi_memoria: p.bdi_memoria || null,
    imposto_venda: Number(p.imposto_venda) || 0,
    imposto_servico: Number(p.imposto_servico) || 0,
    desconto_materiais_pct: p.desconto_materiais_pct != null ? Number(p.desconto_materiais_pct) : null,
    desconto_mao_obra_pct: p.desconto_mao_obra_pct != null ? Number(p.desconto_mao_obra_pct) : null,
    obra_id: p.obra_id ?? null,
    versao: p.versao ?? null,
    secoes: (p.secoes || []).map(s => ({ id: s.id, nome: s.nome })),
    itens: (p.itens || []).map(it => ({
      _id: it.id, sid: it.secao_id, desc: it.descricao, qtd: Number(it.quantidade), un: it.unidade,
      vu: Number(it.valor_unitario), ncm: it.ncm || null, codigo: it.codigo || null,
      material_id: it.material_id || null, subgrupo: it.subgrupo || null, status: it.status || 'confirmado',
    })),
  };
}

// Seção do item novo: "servicos" | "materiais" | nome exato de uma seção existente
function secaoDoItem(payload, secao) {
  const pedido = String(secao || '').trim();
  const chave = pedido.toLowerCase();
  let alvo;
  if (['servicos', 'serviços', 'servico', 'serviço', 'mao_de_obra', 'mão de obra'].includes(chave)) {
    alvo = payload.secoes.find(s => ehMaoDeObra(s.nome));
    if (!alvo) alvo = { id: novoIdSecao(payload), nome: SECAO_SERVICOS };
  } else if (['materiais', 'material', 'equipamentos', ''].includes(chave)) {
    alvo = payload.secoes.find(s => !ehMaoDeObra(s.nome));
    if (!alvo) alvo = { id: novoIdSecao(payload), nome: SECAO_MATERIAIS };
  } else {
    alvo = payload.secoes.find(s => s.nome.toLowerCase() === chave);
    if (!alvo) alvo = { id: novoIdSecao(payload), nome: pedido.slice(0, 100) };
  }
  if (!payload.secoes.includes(alvo)) payload.secoes.push(alvo);
  return alvo;
}
const novoIdSecao = (payload) => payload.secoes.reduce((m, s) => Math.max(m, Number(s.id) || 0), 0) + 1;

function numeroValido(v, rotulo, { min = 0 } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) throw new ErroRascunho(`${rotulo} inválido(a): ${v}`);
  return n;
}

function itemNovo(payload, it) {
  if (!it || typeof it !== 'object') throw new ErroRascunho('Item a adicionar inválido.');
  const descricao = String(it.descricao || '').trim();
  if (!descricao) throw new ErroRascunho('Item a adicionar sem descrição.');
  const secao = secaoDoItem(payload, it.secao);
  const vu = it.valor_unitario == null ? 0 : arredondar(numeroValido(it.valor_unitario, 'Valor unitário'));
  const qtd = arredondarQuantidade(numeroValido(it.quantidade ?? 1, 'Quantidade'), 1);
  const status = STATUS_ITEM.includes(it.status) ? it.status : (vu > 0 ? 'confirmado' : 'a_cotar');
  return {
    sid: secao.id, desc: descricao.slice(0, 500), qtd, un: it.unidade ? String(it.unidade).slice(0, 20) : null, vu,
    ncm: it.ncm || null, codigo: it.codigo ? String(it.codigo).slice(0, 50) : null,
    material_id: Number.isInteger(Number(it.material_id)) && Number(it.material_id) > 0 ? Number(it.material_id) : null,
    subgrupo: it.subgrupo ? String(it.subgrupo).slice(0, 100) : null, status,
  };
}

// Aplica as operações no corpo do PUT. `ops` = {
//   adicionar: [{ secao, descricao, quantidade, unidade, valor_unitario, codigo, material_id, subgrupo, status }],
//   alterar:   [{ item_id, quantidade?, valor_unitario?, descricao?, unidade?, status?, subgrupo? }],
//   remover:   [item_id, ...],
//   campos:    { bdi?, imposto_venda?, imposto_servico?, cliente_nome?, local_obra?, escopo?, pagamento?, observacoes?, responsavel?, validade?, obra_id? }
// }
// Devolve { payload, resumo: [textos] }. Item inexistente → erro (não ignora calado).
function aplicarOperacoes(payloadOriginal, ops = {}) {
  const payload = { ...payloadOriginal, secoes: payloadOriginal.secoes.map(s => ({ ...s })), itens: payloadOriginal.itens.map(i => ({ ...i })) };
  const resumo = [];
  const total = (ops.adicionar?.length || 0) + (ops.alterar?.length || 0) + (ops.remover?.length || 0);
  if (total > MAX_OPERACOES) throw new ErroRascunho(`Operações demais numa vez (${total}; máximo ${MAX_OPERACOES}).`);
  const acharItem = (id) => {
    const i = payload.itens.findIndex(it => Number(it._id) === Number(id));
    if (i < 0) throw new ErroRascunho(`Item ${id} não existe nesta proposta (use ver_proposta para ver os ids).`);
    return i;
  };

  for (const id of ops.remover || []) {
    const i = acharItem(id);
    const r = payload.itens[i];
    resumo.push(`removido: ${cortarTexto(r.desc, 200)} — ${r.qtd} ${r.un || ''} × ${reais(r.vu)}`.replace(/\s+×/, ' ×'));
    payload.itens.splice(i, 1);
  }
  for (const alt of ops.alterar || []) {
    const it = payload.itens[acharItem(alt.item_id)];
    const antes = { ...it };
    const mudou = [];
    const rotuloStatus = (st) => (st === 'a_cotar' ? 'a cotar' : 'confirmado');
    if (alt.quantidade != null) { it.qtd = arredondarQuantidade(numeroValido(alt.quantidade, 'Quantidade'), 1); mudou.push(`qtd ${antes.qtd} → ${it.qtd}`); }
    if (alt.valor_unitario != null) { it.vu = arredondar(numeroValido(alt.valor_unitario, 'Valor unitário')); mudou.push(`unitário ${reais(antes.vu)} → ${reais(it.vu)}`); }
    if (alt.descricao != null && String(alt.descricao).trim()) { it.desc = String(alt.descricao).trim().slice(0, 500); mudou.push(`descrição ${citar(antes.desc)} → ${citar(it.desc)}`); }
    if (alt.unidade != null) { it.un = String(alt.unidade).slice(0, 20) || null; mudou.push(`unidade ${antes.un || '(vazio)'} → ${it.un || '(vazio)'}`); }
    if (alt.subgrupo != null) { it.subgrupo = String(alt.subgrupo).slice(0, 100) || null; mudou.push(`subgrupo ${citar(antes.subgrupo)} → ${citar(it.subgrupo)}`); }
    if (alt.status != null) {
      if (!STATUS_ITEM.includes(alt.status)) throw new ErroRascunho(`Status de item inválido: ${alt.status} (use confirmado ou a_cotar).`);
      it.status = alt.status; mudou.push(`${rotuloStatus(antes.status)} → ${rotuloStatus(it.status)}`);
    }
    if (mudou.length) resumo.push(`alterado: ${cortarTexto(antes.desc, 200)} (${mudou.join(', ')})`);
  }
  for (const novo of ops.adicionar || []) {
    const it = itemNovo(payload, novo);
    payload.itens.push(it);
    resumo.push(`adicionado: ${cortarTexto(it.desc, 200)} — ${it.qtd} ${it.un || ''} × R$ ${it.vu.toFixed(2)}${it.status === 'a_cotar' ? ' (a cotar)' : ''}`.replace(/\s+—/, ' —'));
  }

  const campos = ops.campos || {};
  for (const c of PERCENTUAIS) {
    if (campos[c] == null) continue;
    const n = numeroValido(campos[c], c);
    if (n > 999.99) throw new ErroRascunho(`${c} acima de 999,99 %.`);
    resumo.push(`${c} ${payload[c] ?? 0} % → ${n} %`);
    payload[c] = n;
  }
  for (const c of CAMPOS_PROPOSTA) {
    if (campos[c] == null) continue;
    const novo = String(campos[c]);
    resumo.push(`${c}: ${citar(payload[c])} → ${citar(novo)}`);
    payload[c] = novo;
  }
  if (campos.validade != null) {
    const antes = payload.validade;
    payload.validade = Math.round(numeroValido(campos.validade, 'Validade', { min: 1 }));
    resumo.push(`validade ${antes ?? '(vazio)'} → ${payload.validade} dias`);
  }
  if (Object.prototype.hasOwnProperty.call(campos, 'obra_id')) {
    const antes = payload.obra_id;
    payload.obra_id = campos.obra_id == null ? null : Math.round(numeroValido(campos.obra_id, 'Obra', { min: 1 }));
    resumo.push(payload.obra_id ? `ligada à obra #${payload.obra_id}${antes ? ` (antes: obra #${antes})` : ''}` : `desligada da obra${antes ? ` #${antes}` : ''}`);
  }

  // seções que já existiam ficam (mesmo vazias, como na tela); só não sobra seção nova vazia
  payload.secoes = payload.secoes.filter(s => payload.itens.some(it => it.sid === s.id) || (payloadOriginal.secoes || []).some(o => o.id === s.id));
  if (!resumo.length) throw new ErroRascunho('Nenhuma alteração pedida.');
  return { payload, resumo };
}

// Corpo final para o PUT (sem o _id auxiliar)
function payloadParaEnvio(payload) {
  return { ...payload, itens: payload.itens.map(({ _id, ...resto }) => resto) };
}

// Formulário da skill: mescla os dados parciais pedidos no formulário atual.
// Objetos mesclam campo a campo; listas e valores simples SUBSTITUEM (uma lista
// de ambientes nova vale inteira — mesclar listas por posição embaralharia).
function mesclarDados(base, parcial, profundidade = 0) {
  if (profundidade > 12) throw new ErroRascunho('Dados aninhados demais.');
  if (parcial === null || typeof parcial !== 'object' || Array.isArray(parcial)) return parcial;
  const saida = (base && typeof base === 'object' && !Array.isArray(base)) ? { ...base } : {};
  for (const [k, v] of Object.entries(parcial)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    saida[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? mesclarDados(saida[k], v, profundidade + 1) : v;
  }
  return saida;
}

module.exports = {
  cortarTexto, citar,
  propostaParaPayload, aplicarOperacoes, payloadParaEnvio, mesclarDados, ErroRascunho,
};
