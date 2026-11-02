// Revisão da proposta ANTES de enviar ao cliente (sem IA, só regras): pega o que um engenheiro cansado deixa
// passar — item ainda "a cotar" indo como preço fechado, preço zerado, item repetido, BDI zerado, preço
// abaixo do que a H&M já vendeu ou abaixo do custo de compra, proposta já vencida ou enviada antes.
//
// Três níveis:
//   bloqueio: a proposta está errada (sem itens, total zero, valores gravados que não batem com os itens);
//             a tela exige confirmação explícita para enviar mesmo assim.
//   atencao:  provável problema, o engenheiro decide.
//   info:     só lembrete.
// Nada aqui altera a proposta nem impede o envio no servidor: é uma conferência que a tela mostra.
const pool = require('../config/database');
const { calcularTotais, arredondar, numeroSeguro, itemPertenceASecao, bdiMateriaisDefinido } = require('../utils/calculoProposta');
const { faixasPorMaterial, faixasPorDescricao, chaveDescricao, normalizar, sqlNormalizar } = require('./precosVendidos');
const { hojeBrasilia } = require('../utils/dataHoje');

const TOLERANCIA_TOTAL = 0.05;     // R$: diferença de arredondamento aceitável entre o gravado e o recalculado
const MARGEM_ABAIXO_VENDIDO = 0.95;
const MARGEM_ACIMA_VENDIDO = 1.5;
const MAX_ITENS_NA_MENSAGEM = 5;
const UNIDADES_INTEIRAS = new Set(['un', 'und', 'unid', 'pç', 'pc', 'pç.', 'cj', 'vb']);

const moeda = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// A coluna DATE chega do driver como Date à meia-noite local (ver utils/validacaoProposta): usa a parte local.
function diaIso(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return t.toISOString().slice(0, 10);
}

const dataBr = (iso) => iso.split('-').reverse().join('/');

// Cada entrada é a descrição (texto) ou { nome, detalhe }: só o nome é cortado, o detalhe (valores) vai inteiro.
function lista(entradas) {
  const mostrados = entradas.slice(0, MAX_ITENS_NA_MENSAGEM).map(e => {
    const { nome, detalhe } = typeof e === 'object' ? e : { nome: e, detalhe: '' };
    return `"${String(nome).slice(0, 60)}"${detalhe ? ` (${detalhe})` : ''}`;
  });
  const resto = entradas.length - mostrados.length;
  return mostrados.join(', ') + (resto > 0 ? ` e mais ${resto}` : '');
}

const PROVISORIA = /^\s*(teste|xxx+|a definir|a confirmar|tbd|\?+)\b|\bxxx+\b|\?\?\?/i;

// Função pura: recebe tudo carregado e devolve os achados. `faixas` = faixasPorMaterial; `custos` = { [material_id]: preco_compra };
// `eventosEmail` = envios anteriores [{ criado_em, detalhes }].
// `faixas`/`custos` são por material_id; `faixasDescricao`/`custosDescricao` valem para o item digitado à mão (sem material),
// achado pela descrição idêntica (chaveDescricao / normalizar).
function revisar({ proposta, secoes = [], itens = [], faixas = {}, custos = {}, faixasDescricao = {}, custosDescricao = {}, eventosEmail = [], hoje = hojeBrasilia() }) {
  const achados = [];
  const add = (nivel, codigo, mensagem, extra = {}) => achados.push({ nivel, codigo, mensagem, ...extra });
  const ativos = itens.filter(i => numeroSeguro(i.quantidade) > 0);
  const descr = (i) => i.descricao || i.desc || '(sem descrição)';

  const recalculo = calcularTotais({
    secoes, itens: itens.map(i => ({ ...i })), bdi: proposta.bdi, bdi_materiais: proposta.bdi_materiais,
    imposto_venda: proposta.imposto_venda, imposto_servico: proposta.imposto_servico,
  });
  if (!ativos.length) {
    add('bloqueio', 'sem_itens', 'A proposta não tem nenhum item com quantidade.');
  } else if (numeroSeguro(proposta.total) <= 0) {
    add('bloqueio', 'total_zero', 'O total da proposta está zerado, embora tenha itens.');
  } else {
    const diferenca = arredondar(recalculo.total - numeroSeguro(proposta.total));
    if (Math.abs(diferenca) > TOLERANCIA_TOTAL) {
      add('bloqueio', 'total_defasado', `O total gravado (${moeda(proposta.total)}) não bate com os itens (${moeda(recalculo.total)}, diferença de ${moeda(Math.abs(diferenca))}). Abra a proposta e salve de novo antes de enviar.`);
    }
  }

  const aCotar = ativos.filter(i => (i.status || 'confirmado') === 'a_cotar');
  if (aCotar.length) {
    add('atencao', 'a_cotar', `${aCotar.length} item(ns) ainda "a cotar" — o preço é estimativa e vai para o cliente como se fosse fechado: ${lista(aCotar.map(descr))}.`, { itens: aCotar.map(i => i.id) });
  }

  const semPreco = ativos.filter(i => (i.status || 'confirmado') !== 'a_cotar' && numeroSeguro(i.valor_unitario) <= 0);
  if (semPreco.length) {
    add('atencao', 'preco_zero', `${semPreco.length} item(ns) com valor unitário zero: ${lista(semPreco.map(descr))}.`, { itens: semPreco.map(i => i.id) });
  }

  const vistos = new Map();
  const repetidos = new Set();
  for (const i of ativos) {
    const chave = `${normalizar(descr(i))}|${normalizar(i.unidade)}`;
    if (vistos.has(chave)) repetidos.add(descr(i)); else vistos.set(chave, true);
  }
  if (repetidos.size) {
    add('atencao', 'repetidos', `Item(ns) lançado(s) mais de uma vez com a mesma descrição e unidade: ${lista([...repetidos])}.`);
  }

  const provisorios = ativos.filter(i => PROVISORIA.test(descr(i)));
  if (provisorios.length) {
    add('atencao', 'descricao_provisoria', `Descrição com cara de rascunho: ${lista(provisorios.map(descr))}.`, { itens: provisorios.map(i => i.id) });
  }

  const quebrados = ativos.filter(i => UNIDADES_INTEIRAS.has(normalizar(i.unidade)) && !Number.isInteger(numeroSeguro(i.quantidade)));
  if (quebrados.length) {
    add('atencao', 'quantidade_quebrada', `Quantidade fracionada em unidade inteira: ${lista(quebrados.map(i => ({ nome: descr(i), detalhe: `${numeroSeguro(i.quantidade)} ${i.unidade}` })))}.`, { itens: quebrados.map(i => i.id) });
  }

  // preço × o que a H&M já vendeu (propostas aprovadas) e × o custo de compra do catálogo
  const abaixoVendido = [];
  const acimaVendido = [];
  const abaixoCusto = [];
  for (const i of ativos) {
    const vu = numeroSeguro(i.valor_unitario);
    if (vu <= 0 || (i.status || 'confirmado') === 'a_cotar') continue;
    const f = (i.material_id && faixas[i.material_id]) || faixasDescricao[chaveDescricao(descr(i), i.unidade)];
    if (f && vu < f.minimo * MARGEM_ABAIXO_VENDIDO) abaixoVendido.push({ nome: descr(i), detalhe: `${moeda(vu)}; já vendido a partir de ${moeda(f.minimo)}` });
    if (f && vu > f.maximo * MARGEM_ACIMA_VENDIDO) acimaVendido.push({ nome: descr(i), detalhe: `${moeda(vu)}; já vendido até ${moeda(f.maximo)}` });
    const custo = numeroSeguro(i.material_id ? custos[i.material_id] : custosDescricao[normalizar(descr(i))]);
    if (custo > 0 && vu < custo) abaixoCusto.push({ nome: descr(i), detalhe: `${moeda(vu)} contra custo de compra ${moeda(custo)}` });
  }
  if (abaixoCusto.length) add('atencao', 'abaixo_do_custo', `Vendendo abaixo do custo de compra do catálogo: ${lista(abaixoCusto)}.`);
  if (abaixoVendido.length) add('atencao', 'abaixo_do_vendido', `Preço abaixo do menor já praticado em proposta aprovada: ${lista(abaixoVendido)}.`);
  if (acimaVendido.length) add('info', 'acima_do_vendido', `Preço bem acima do que já foi vendido (pode custar a proposta): ${lista(acimaVendido)}.`);

  const bdi = numeroSeguro(proposta.bdi);
  if (bdi <= 0 && !(bdiMateriaisDefinido(proposta.bdi_materiais) && numeroSeguro(proposta.bdi_materiais) > 0)) {
    add('atencao', 'bdi_zero', 'BDI em 0%: a proposta vai sem margem nem custo indireto, a menos que os preços dos itens já os embutam.');
  }
  if (numeroSeguro(proposta.imposto_venda) <= 0 && numeroSeguro(proposta.imposto_servico) <= 0) {
    add('info', 'impostos_zerados', 'Impostos em 0% na proposta (normal se já estão dentro do BDI).');
  }

  // prazo de resposta só importa enquanto a proposta está aberta; aprovada, recusada ou cancelada já tem aviso próprio (status)
  const data = diaIso(proposta.data);
  const validade = numeroSeguro(proposta.validade, 0);
  if (data && validade > 0 && (!proposta.status || proposta.status === 'Ativa')) {
    const fim = somarDias(data, validade);
    if (fim < hoje) add('atencao', 'vencida', `A validade acabou em ${dataBr(fim)} (${validade} dia(s) a partir de ${dataBr(data)}). Atualize a data ou a validade.`);
  }

  // escopo básico: obra elétrica quase sempre tem material E mão de obra; fornecimento puro é legítimo, mas é para confirmar
  if (ativos.length && secoes.length) {
    if (recalculo.subtotal_materiais > 0 && recalculo.subtotal_mao_obra <= 0) {
      add('atencao', 'sem_mao_de_obra', 'A proposta tem só materiais, sem mão de obra. Confirme que é apenas fornecimento.');
    } else if (recalculo.subtotal_mao_obra > 0 && recalculo.subtotal_materiais <= 0) {
      add('info', 'so_mao_de_obra', 'A proposta tem só mão de obra, sem materiais (o cliente fornece o material?).');
    }
  }

  if (!String(proposta.local_obra || '').trim()) add('atencao', 'sem_local', 'A proposta não informa o local da obra.');
  if (!String(proposta.pagamento || '').trim()) add('atencao', 'sem_pagamento', 'A proposta não informa as condições de pagamento.');

  if (proposta.status && proposta.status !== 'Ativa') {
    add('atencao', 'status', `A proposta está como "${proposta.status}", não "Ativa".`);
  }

  if (eventosEmail.length) {
    const ultimo = eventosEmail[0];
    const quando = diaIso(ultimo.criado_em);
    add('info', 'ja_enviada', `Esta proposta já foi enviada por e-mail ${eventosEmail.length} vez(es)${quando ? `, a última em ${dataBr(quando)}` : ''}${ultimo.detalhes ? ` (${ultimo.detalhes})` : ''}.`);
  }

  const ordem = { bloqueio: 0, atencao: 1, info: 2 };
  achados.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
  const contar = (n) => achados.filter(a => a.nivel === n).length;
  return {
    nivel: contar('bloqueio') ? 'bloqueio' : contar('atencao') ? 'atencao' : 'ok',
    resumo: { bloqueios: contar('bloqueio'), atencoes: contar('atencao'), infos: contar('info') },
    itens_conferidos: ativos.length,
    achados,
  };
}

async function revisarProposta(id, db = pool) {
  const { rows: [proposta] } = await db.query('SELECT * FROM propostas WHERE id = $1', [id]);
  if (!proposta) return null;
  const { rows: secoes } = await db.query('SELECT * FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem', [id]);
  const { rows: itens } = await db.query('SELECT * FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem', [id]);
  const ids = [...new Set(itens.map(i => i.material_id).filter(Boolean))];
  const faixas = await faixasPorMaterial(ids, { excluirPropostaId: Number(id) }, db);
  const digitados = itens.filter(i => !i.material_id);
  const faixasDescricao = await faixasPorDescricao(digitados, { excluirPropostaId: Number(id) }, db);
  const custos = {};
  if (ids.length) {
    const { rows } = await db.query('SELECT id, preco_compra FROM materiais WHERE id = ANY($1::int[])', [ids]);
    for (const r of rows) custos[r.id] = r.preco_compra;
  }
  // item digitado à mão com a mesma descrição de um material do catálogo: o menor custo de compra desse nome
  const custosDescricao = {};
  const nomes = [...new Set(digitados.map(i => normalizar(i.descricao)).filter(Boolean))];
  if (nomes.length) {
    const { rows } = await db.query(
      `SELECT ${sqlNormalizar('descricao')} AS nome, MIN(preco_compra) AS custo FROM materiais
        WHERE COALESCE(ativo, true) AND preco_compra > 0 AND ${sqlNormalizar('descricao')} = ANY($1::text[]) GROUP BY 1`, [nomes]);
    for (const r of rows) custosDescricao[r.nome] = r.custo;
  }
  const { rows: eventosEmail } = await db.query(
    "SELECT criado_em, detalhes FROM proposta_eventos WHERE proposta_id = $1 AND acao = 'email' ORDER BY criado_em DESC", [id]);
  return revisar({ proposta, secoes, itens, faixas, custos, faixasDescricao, custosDescricao, eventosEmail });
}

module.exports = { revisar, revisarProposta };
