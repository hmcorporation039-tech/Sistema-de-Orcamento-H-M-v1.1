// Projeto pela ESPECIFICAÇÃO do cliente no sistema (09/11/2026). Fluxo da tela Obras → "Projeto pela
// especificação":
//   1. ler(arquivo)  — PDF/DOCX/XLSX/TXT → requisitos com a frase de origem (skills/_comum/especificacao),
//                      já com o vocabulário aprendido; nada é gravado;
//   2. gerar(...)    — os requisitos (corrigidos na tela) → solução do quadro/painel pelo perfil → um
//                      PROJETO da skill quadros (laudos_projetos, tipo 'projeto') com dados.especificacao;
//                      os documentos (folhas FL01–FL07, pesquisa de preços, ficha técnica, texto de
//                      entrega, e os de sempre: memorial, caderno, DXF, 3D) saem por /laudos/:id/documento;
//   3. precos(...)   — referências da H&M para os itens sem preço aprendido (cotação, vendido, catálogo,
//                      SINAPI — sem IA); a web só com pedido explícito, e volta como SUGESTÃO;
//   4. aprovar(...)  — o que o engenheiro aprova vira padrão (services/aprendizadoEspecificacao.js).
// Sem IA no caminho normal; o que não está na especificação nem em tabela fica [CONFERIR].
const path = require('path');
const { hojeBrasilia } = require('../utils/dataHoje');
const pool = require('../config/database');
const { COMUM, RAIZ_SKILLS } = require('../config/caminhos');
const AP = require('./aprendizadoEspecificacao');

const skill = {
  entrada: () => require(path.join(COMUM, 'especificacao', 'entrada.js')),
  perfis: () => require(path.join(COMUM, 'especificacao', 'perfis.js')),
  leitor: () => require(path.join(COMUM, 'especificacao', 'leitor.js')),
  logica: () => require(path.join(COMUM, 'especificacao', 'logica.js')),
  planilha: () => require(path.join(COMUM, 'especificacao', 'planilhaPrecos.js')),
  motor: () => require(path.join(RAIZ_SKILLS, 'quadros', 'scripts', 'lib', 'especificacao.js')),
};
const EXTENSOES = /\.(pdf|docx|xlsx|xlsm|txt|md|csv)$/i;
const MAX_BLOCOS_RESPOSTA = 400;

const erro = (msg, status = 400) => Object.assign(new Error(msg), { status });

function perfis() {
  return skill.perfis().listarPerfis();
}

async function ler(buffer, nome, { perfil = null, db = pool } = {}) {
  if (!EXTENSOES.test(nome || '')) throw erro('Envie a especificação em PDF, DOCX, XLSX ou TXT.');
  const E = skill.entrada();
  // 1ª leitura sem vocabulário aprendido só para escolher o perfil; depois com o aprendido dele
  const previa = await E.lerEspecificacao(buffer, { nome, perfil: perfil || undefined });
  const aprendido = await AP.carregar(previa.perfil, { db }).catch(() => ({ vocabulario: [] }));
  const lida = aprendido.vocabulario.length ? await E.lerEspecificacao(buffer, { nome, perfil: previa.perfil, aprendido }) : previa;
  if (!lida.blocos.length) throw erro(lida.avisos[0] || 'Não foi possível ler texto do arquivo.');
  // o que o engenheiro pode ensinar na tela (frase não lida → requisito/equipamento do perfil)
  const voc = skill.perfis().perfilDe(lida.perfil).vocabulario;
  const vocabulario = {
    requisitos: voc.requisitos.map(r => ({ id: r.id, rotulo: r.rotulo || r.id, grupo: r.grupo })),
    equipamentos: Object.entries(voc.equipamentos || {}).map(([id, e]) => ({ id, rotulo: e.rotulo })),
  };
  return { perfil: lida.perfil, lidos: lida.lidos, blocos: lida.blocos.slice(0, MAX_BLOCOS_RESPOSTA), avisos: lida.avisos, aprendidos: aprendido.vocabulario.length, vocabulario };
}

// referências internas (sem IA) para os itens sem preço aprendido
async function referenciasDosMateriais(projeto, aprendidos, { db = pool } = {}) {
  const { referenciasInternas } = require('./referenciasDePreco');
  const PL = skill.planilha();
  const semPreco = PL.resolverPrecos(projeto.materiais, { aprendidos }).filter(i => i.origem === PL.ORIGENS.cotar && i.chave);
  const out = {};
  for (const m of semPreco.slice(0, 40)) {
    const r = await referenciasInternas(m.descricao, { db }).catch(() => null);
    if (!r || !r.estatistica || !(r.estatistica.media > 0)) continue;
    const of = r.ofertas.find(o => o.mesmo_item) || r.ofertas[0];
    out[m.chave] = { preco: r.estatistica.minimo || r.estatistica.media, faixa: r.estatistica.n > 1 ? [r.estatistica.minimo, r.estatistica.maximo] : null, fonte: of?.fonte || 'Referências da H&M', produto: of?.produto, obs: of?.observacao || '', data: hojeBrasilia() };
  }
  return out;
}

function tituloDo(projeto) {
  return String(projeto.meta?.titulo || 'Quadro pela especificação').slice(0, 200);
}

async function gerar({ perfil, lidos, pedido = '', cliente = '', obra = '', obraId = null, decisoes = {}, respostas = {}, contingencia = 0.1, usuario }, { db = pool } = {}) {
  if (!lidos || !Array.isArray(lidos.requisitos)) throw erro('Requisitos ausentes: leia a especificação antes de gerar.');
  const P = skill.perfis().perfilDe(perfil || lidos.perfil || 'quadro_forca_comando');
  const aprendido = await AP.carregar(P.chave, { db }).catch(() => ({ precos: [] }));
  const projeto = skill.motor().solucionar(lidos, { perfil: P, aprendido, decisoes, respostas, pedido, cliente, obra });
  const referencias = await referenciasDosMateriais(projeto, aprendido.precos, { db });
  const especificacao = {
    perfil: P.chave, lidos, pedido, decisoes, respostas, contingencia, cliente,
    aprendido: { vocabulario: aprendido.vocabulario || [], escolhas: aprendido.escolhas || {}, decisoes: aprendido.decisoes || {}, respostas: aprendido.respostas || {} },
    precos: { aprendidos: aprendido.precos || [], referencias },
    gerado_em: new Date().toISOString(),
  };
  const dados = { ...projeto.dadosQuadros, cliente: { nome: cliente || '' }, obra: { nome: obra || projeto.meta.obra || '' }, especificacao };
  const { rows: [linha] } = await db.query(
    `INSERT INTO laudos_projetos (disciplina, titulo, cliente_nome, dados, usuario_id, gerar_orcamento, obra_id, tipo)
     VALUES ('quadros', $1, $2, $3, $4, false, $5, 'projeto') RETURNING id`,
    [tituloDo(projeto), cliente || null, dados, usuario?.id || null, obraId]);
  return { id: linha.id, resumo: resumir(projeto, especificacao) };
}

// Refaz a solução a partir do que está gravado (sem IA) e devolve o resumo para a tela
function solucaoDoRegistro(dados) {
  const esp = dados?.especificacao;
  if (!esp || !esp.lidos) throw erro('Este projeto não foi gerado pela especificação.', 404);
  const P = skill.perfis().perfilDe(esp.perfil || 'quadro_forca_comando');
  const projeto = skill.motor().solucionar(esp.lidos, { perfil: P, aprendido: esp.aprendido || {}, decisoes: esp.decisoes || {}, respostas: esp.respostas || {}, pedido: esp.pedido || '', cliente: dados.cliente?.nome || esp.cliente || '', obra: dados.obra?.nome || '' });
  return { projeto, especificacao: esp };
}

function resumir(projeto, esp) {
  const PL = skill.planilha();
  const itens = PL.resolverPrecos(projeto.materiais, esp?.precos || {});
  const res = PL.resumir(itens, { contingencia: esp?.contingencia ?? 0.1 });
  return {
    meta: projeto.meta, perfil: projeto.perfil, quadro: projeto.quadro, geral: projeto.geral, demanda: projeto.demanda, barramento: projeto.barramento,
    protecoes: projeto.protecoes, comando: { tensao: projeto.comando.tensao, fonte: projeto.comando.fonte, reles: projeto.comando.reles, seletoras: projeto.comando.seletoras, blocos: projeto.comando.blocos, logica: projeto.comando.logica },
    sinaleiros: projeto.sinaleiros, reguas: projeto.reguas, ventilacao: projeto.ventilacao, decisoes: projeto.decisoes, premissas: projeto.premissas,
    pendencias: projeto.pendencias, pontos: projeto.pontos, excecoes: projeto.excecoes, avisos: projeto.avisos, funcional: projeto.funcional, interacao: projeto.interacao,
    materiais: itens, precos: res,
  };
}

async function carregarRegistro(id, { db = pool } = {}) {
  const { rows: [l] } = await db.query("SELECT id, usuario_id, dados FROM laudos_projetos WHERE id = $1 AND disciplina = 'quadros'", [id]);
  if (!l) throw erro('Projeto não encontrado.', 404);
  return l;
}

async function ver(id, opcoes = {}) {
  const l = await carregarRegistro(id, opcoes);
  const { projeto, especificacao } = solucaoDoRegistro(l.dados);
  return { id: l.id, lidos: especificacao.lidos, decisoes: especificacao.decisoes || {}, respostas: especificacao.respostas || {}, resumo: resumir(projeto, especificacao) };
}

// Atualiza requisitos corrigidos, decisões, respostas e preços aprovados (sem aprender ainda)
async function atualizar(id, { lidos, decisoes, respostas, pedido, contingencia, precosAprovados }, { db = pool } = {}) {
  const l = await carregarRegistro(id, { db });
  const esp = { ...(l.dados.especificacao || {}) };
  if (lidos && Array.isArray(lidos.requisitos)) esp.lidos = lidos;
  if (decisoes && typeof decisoes === 'object') esp.decisoes = decisoes;
  if (respostas && typeof respostas === 'object') esp.respostas = respostas;
  if (typeof pedido === 'string') esp.pedido = pedido.slice(0, 500);
  if (contingencia != null && Number.isFinite(Number(contingencia))) esp.contingencia = Math.min(0.5, Math.max(0, Number(contingencia)));
  if (Array.isArray(precosAprovados)) esp.precos = { ...(esp.precos || {}), aprendidos: [...(esp.precos?.aprendidos || []).filter(a => !precosAprovados.some(p => p.chave === a.chave)), ...precosAprovados.filter(p => Number(p.preco) > 0)] };
  const { projeto } = solucaoDoRegistro({ ...l.dados, especificacao: esp });
  const dados = { ...l.dados, ...projeto.dadosQuadros, cliente: l.dados.cliente, obra: l.dados.obra, especificacao: esp };
  await db.query('UPDATE laudos_projetos SET dados = $1, titulo = $2, atualizado_em = NOW() WHERE id = $3', [dados, tituloDo(projeto), id]);
  return { id, resumo: resumir(projeto, esp) };
}

// Simulação do comando (o mesmo modelo do 3D): entradas → estado estável
async function simular(id, entradas = {}, opcoes = {}) {
  const l = await carregarRegistro(id, opcoes);
  const { projeto } = solucaoDoRegistro(l.dados);
  const r = skill.logica().avaliar(projeto.comando.modelo, entradas);
  return { entradas: r.entradas, saidas: r.saidas, estavel: r.estavel, interacao: projeto.interacao, rotulos: projeto.comando.modelo.rotulos };
}

// Preços: referências internas (sem IA) e, só com web: true, a pesquisa de mercado (IA) como sugestão
async function sugerirPrecos(id, { web = false, signal } = {}, { db = pool } = {}) {
  const l = await carregarRegistro(id, { db });
  const { projeto, especificacao } = solucaoDoRegistro(l.dados);
  const referencias = await referenciasDosMateriais(projeto, especificacao.precos?.aprendidos || [], { db });
  const sugestoes = [];
  if (web) {
    const { pesquisarPrecoMercado } = require('./pesquisaMercado');
    const PL = skill.planilha();
    const faltam = PL.resolverPrecos(projeto.materiais, { ...(especificacao.precos || {}), referencias }).filter(i => i.origem === PL.ORIGENS.cotar).slice(0, 8);
    for (const m of faltam) {
      try {
        const r = await pesquisarPrecoMercado(`${m.descricao}${m.referencia && m.referencia !== '—' ? ` (${m.referencia.split(' / ')[0]})` : ''}`, { signal });
        const of = (r.ofertas || []).filter(o => o.mesmo_item !== false && o.preco > 0).sort((a, b) => a.preco - b.preco);
        if (of.length) sugestoes.push({ chave: m.chave, descricao: m.descricao, unidade: m.unidade, preco: of[0].preco, faixa: [of[0].preco, of[of.length - 1].preco], fonte: of[0].fonte, referencia: of[0].produto, link: of[0].link || null, origem: 'pesquisado', sugerido_pela_ia: true, data: hojeBrasilia() });
      } catch { /* sem IA ou sem cota: segue sem a sugestão */ }
    }
  }
  const esp = { ...especificacao, precos: { ...(especificacao.precos || {}), referencias } };
  await db.query('UPDATE laudos_projetos SET dados = jsonb_set(dados, \'{especificacao}\', $1::jsonb), atualizado_em = NOW() WHERE id = $2', [JSON.stringify(esp), id]);
  return { referencias: Object.keys(referencias).length, sugestoes, resumo: resumir(projeto, esp) };
}

// O engenheiro aprova: correções de leitura, respostas aos pontos, preços e escolhas viram padrão
async function aprovar(id, corpo, { usuario, db = pool } = {}) {
  const l = await carregarRegistro(id, { db });
  const esp = l.dados.especificacao || {};
  const itens = AP.itensDaAprovacao(corpo || {}, skill.leitor().padraoDaFrase);
  const n = await AP.aprender(itens, { perfil: esp.perfil || 'quadro_forca_comando', usuarioId: usuario?.id || null, laudoId: id, db });
  return { aprendidos: n, tipos: itens.reduce((s, i) => ({ ...s, [i.tipo]: (s[i.tipo] || 0) + 1 }), {}) };
}

module.exports = { perfis, ler, gerar, ver, atualizar, simular, sugerirPrecos, aprovar, resumir, solucaoDoRegistro, EXTENSOES };
