// ROTEADOR DE INTENÇÃO do assistente — determinístico, ANTES do modelo de IA (pedido de 09/11/2026: "temos que
// depender cada vez menos de IA"). Reconhece por regras e vocabulário (services/agentes/vocabulario.js + o aprendido
// e aprovado) os pedidos comuns e devolve a decisão:
//   'agente'   executa o agente próprio (sem IA) com a entrada montada do anexo, da tela aberta e do texto;
//   'resposta' responde sem IA: falta um dado que só o usuário dá (ex.: anexar o arquivo) ou a pergunta já tem
//              resposta APROVADA na base de conhecimento;
//   'suporte'  pesquisa aprofundada pedida pelo usuário → suporte Claude Max (modo consultor, só leitura + web);
//   'ia'       não reconheceu, é pergunta aberta, tem negação ou o usuário pediu a IA → o assistente de sempre.
// Cada decisão é registrada (agentes_pedidos) para o vocabulário aprender: pedido que caiu na IA e virou execução de
// agente vira regra SUGERIDA, que só vale depois de o administrador aprovar.
const { normalizar, tokens, termosSignificativos } = require('./textoPedido');
const V = require('./vocabulario');
const { obterAgente } = require('./registro');

const ARQ_PROJETO = new Set(['pdf', 'dwg', 'dxf']);
const ARQ_LISTA = new Set(['xlsx', 'csv']);
const ARQ_ESPEC = new Set(['pdf', 'docx', 'xlsx', 'csv']);
const MAX_TERMOS_ROTEAVEIS = 70;

// termo do vocabulário casa com o token?  "orcament*" (começo), "o que e" (frase), "pdf" (inteira)
const casaToken = (termo, tok) => (termo.endsWith('*') ? tok.startsWith(termo.slice(0, -1)) : tok === termo);
function acharGrupo(grupo, toks, usados, texto) {
  for (const termo of grupo) {
    if (termo.includes(' ')) { if (texto.includes(` ${termo} `)) return -1; continue; } // frase: não consome token
    const i = toks.findIndex((t, j) => !usados.has(j) && casaToken(termo, t));
    if (i >= 0) return i;
  }
  return null;
}
function casaGatilho(g, toks, texto) {
  const grupos = Array.isArray(g) ? g : g.grupos;
  const usados = new Set();
  const posicoes = [];
  for (const grupo of grupos) {
    const i = acharGrupo(grupo, toks, usados, texto);
    if (i == null) return null;
    if (i >= 0) { usados.add(i); posicoes.push(i); }
  }
  if (!Array.isArray(g) && g.exclui && toks.some(t => g.exclui.some(x => casaToken(x, t)))) return null;
  return { posicoes, requer: Array.isArray(g) ? null : g.requer || null };
}

function disciplinasDoTexto(texto) {
  let t = texto;
  const achadas = [];
  for (const [chave, termos] of V.DISCIPLINAS_TERMOS) {
    for (const termo of termos) {
      if (termo.includes(' ')) {
        if (t.includes(` ${termo} `)) { achadas.push(chave); t = t.replace(` ${termo} `, ' '); break; }
      } else {
        const toks = t.trim().split(' ');
        if (toks.some(x => casaToken(termo, x))) { achadas.push(chave); t = ` ${toks.filter(x => !casaToken(termo, x)).join(' ')} `; break; }
      }
    }
  }
  return [...new Set(achadas)];
}

const temFrase = (texto, lista) => lista.some(f => texto.includes(` ${f} `));
const comecaCom = (texto, lista) => lista.some(f => texto.startsWith(` ${f} `));
const ultimoDe = (arquivos, tipos) => (arquivos || []).find(a => tipos.has(a.tipo)) || null;

// Decisão PURA (sem banco). entrada: { texto, arquivos (anexados nesta mensagem), arquivosConversa (mais novo
// primeiro), contexto { analise_id, projeto_id, proposta_id, obra_id }, regrasAprendidas [{ id, termos, agente,
// intencao }], materiaisDoQuadro { execucao_id, materiais } }
function decidirPuro({ texto = '', arquivos = [], arquivosConversa = [], contexto = {}, regrasAprendidas = [], materiaisDoQuadro = null } = {}) {
  const bruto = String(texto || '').trim();
  const forcarAgente = /^\/agente\b/i.test(bruto);
  const t = normalizar(bruto.replace(/^\/(agente|ia)\b/i, ''));
  const toks = tokens(t);
  const ia = (motivo) => ({ decisao: 'ia', motivo, intencao: null, agente: null, confianca: 0 });
  if (/^\/ia\b/i.test(bruto)) return ia('o usuário pediu a IA (/ia)');
  if (!forcarAgente && temFrase(t, V.FORCAR_IA)) return ia('o usuário pediu a IA');
  if (!toks.length) return ia('mensagem vazia');

  const disciplinas = disciplinasDoTexto(t);
  const pergunta = /\?\s*$/.test(bruto) || comecaCom(t, V.COMECO_PERGUNTA);
  const negacao = toks.slice(0, 5).includes('nao');

  // intenções padrão, pela prioridade
  let melhor = null;
  for (const it of V.INTENCOES) {
    for (const [gi, g] of it.gatilhos.entries()) {
      const c = casaGatilho(g, toks, t);
      if (!c) continue;
      if (c.requer === 'disciplina' && !disciplinas.length) continue;
      if (c.requer === 'disciplina_ou_projeto' && !disciplinas.length && !contexto.projeto_id && !contexto.analise_id) continue;
      if (c.requer === 'arquivo_anexado' && !arquivos.length) continue;
      if (!melhor || it.prioridade > melhor.it.prioridade) melhor = { it, regra: `padrao:${it.chave}#${gi + 1}`, posicoes: c.posicoes };
      break;
    }
  }
  // regras aprendidas (aprovadas pelo admin): só quando nenhuma padrão casou
  if (!melhor) {
    const conj = new Set(toks);
    const r = regrasAprendidas.find(x => Array.isArray(x.termos) && x.termos.length && x.termos.every(y => conj.has(y)) && obterAgente(x.agente));
    if (r) {
      const it = V.INTENCOES.find(i => i.chave === r.intencao) || { chave: r.intencao || r.agente, agente: r.agente, prioridade: 10 };
      melhor = { it, regra: `aprendida:${r.id}`, posicoes: [] };
    }
  }
  if (!melhor) return ia('nenhuma intenção reconhecida');
  const { it } = melhor;
  if (!forcarAgente) {
    if (negacao) return ia('pedido com negação');
    if (pergunta && !it.aceitaPergunta) return ia('pergunta aberta');
    // texto longo só vale se o gatilho está no começo (ex.: "monte o quadro desta especificação: …")
    if (toks.length > MAX_TERMOS_ROTEAVEIS && !melhor.posicoes.every(p => p < 25)) return ia('texto longo demais para o roteador');
  }

  const base = { intencao: it.chave, regra: melhor.regra, confianca: melhor.regra.startsWith('aprendida') ? 0.7 : 0.9, disciplinas, forcado: forcarAgente };
  const permiteWeb = temFrase(t, V.PERMITE_WEB);
  const resposta = (textoResposta, motivo) => ({ ...base, decisao: 'resposta', agente: it.agente, motivo, resposta: textoResposta });
  const anexadoProjeto = ultimoDe(arquivos, ARQ_PROJETO);
  const conversaProjeto = ultimoDe(arquivosConversa, ARQ_PROJETO);

  if (it.decisao === 'suporte') {
    return { ...base, decisao: 'suporte', agente: null, motivo: 'pesquisa aprofundada pedida', entrada: { pergunta: bruto.replace(/^\/agente\b/i, '').trim(), disciplina: disciplinas[0] || null } };
  }
  const agente = it.agente;
  const entrada = {};
  if (agente === 'analise_projeto') {
    if (anexadoProjeto) entrada.arquivo_id = anexadoProjeto.id;
    else if (contexto.analise_id) entrada.analise_id = contexto.analise_id;
    else if (conversaProjeto) entrada.arquivo_id = conversaProjeto.id;
    else return resposta('Para analisar, anexe o PDF, DWG ou DXF do projeto (clipe ou arraste para cá) — ou abra a análise na tela — e peça de novo.', 'falta o arquivo');
    if (disciplinas.length) entrada.disciplinas = disciplinas;
    if (it.chave === 'modelo_3d' || toks.includes('3d')) entrada.mostrar_3d = true;
    if (contexto.obra_id) entrada.obra_id = contexto.obra_id;
  } else if (agente === 'projeto_disciplina') {
    if (anexadoProjeto) entrada.arquivo_id = anexadoProjeto.id;
    else if (contexto.projeto_id) entrada.projeto_id = contexto.projeto_id;
    else if (contexto.analise_id) entrada.analise_id = contexto.analise_id;
    else if (conversaProjeto) entrada.arquivo_id = conversaProjeto.id;
    else return resposta('Para fazer o projeto, anexe o arquivo do projeto (PDF, DWG ou DXF) ou abra a análise na tela, e diga a disciplina (ex.: "faça o projeto de CFTV").', 'falta a análise ou o arquivo');
    const daSkill = disciplinas.filter(d => d !== 'quadros' || toks.some(x => /^quadro|^painel/.test(x)));
    if (daSkill.length === 1) entrada.disciplina = daSkill[0];
    else if (daSkill.length > 1) return resposta(`Você citou ${daSkill.length} disciplinas (${daSkill.join(', ')}). O agente faz um projeto por vez: diga qual primeiro.`, 'várias disciplinas');
    if (entrada.arquivo_id && entrada.disciplina) entrada.disciplinas = [entrada.disciplina];
  } else if (agente === 'orcamento') {
    if (anexadoProjeto) entrada.arquivo_id = anexadoProjeto.id;
    else if (contexto.projeto_id) entrada.projeto_id = contexto.projeto_id;
    else if (contexto.analise_id) entrada.analise_id = contexto.analise_id;
    else if (conversaProjeto) entrada.arquivo_id = conversaProjeto.id;
    else return resposta('Para orçar, anexe o projeto (PDF, DWG ou DXF) ou abra a análise/projeto na tela e peça de novo.', 'falta a origem do orçamento');
    if (disciplinas.length && entrada.arquivo_id) entrada.disciplinas = disciplinas;
    if (permiteWeb) entrada.pesquisar_mercado = true;
  } else if (agente === 'pesquisa_precos') {
    const lista = ultimoDe(arquivos, ARQ_LISTA);
    const sobreQuadro = toks.some(x => /^quadro|^painel|^montagem/.test(x));
    if (lista) entrada.arquivo_id = lista.id;
    else if (sobreQuadro && materiaisDoQuadro?.materiais?.length) {
      entrada.itens = materiaisDoQuadro.materiais;
      entrada.anteprojeto = true;
      entrada.origem_lista = `projeto do quadro (execução #${materiaisDoQuadro.execucao_id})`;
      entrada.titulo = 'Pesquisa de preços — material do quadro';
    } else if (contexto.proposta_id) entrada.proposta_id = contexto.proposta_id;
    else if (contexto.analise_id) entrada.analise_id = contexto.analise_id;
    else if (ultimoDe(arquivosConversa, ARQ_LISTA)) entrada.arquivo_id = ultimoDe(arquivosConversa, ARQ_LISTA).id;
    else if (sobreQuadro) return resposta('Ainda não há projeto do quadro nesta conversa com a lista de materiais (o agente de quadro pela especificação está aguardando o módulo). Anexe a lista de materiais em Excel (Descrição, Qtd, Un) ou abra a proposta, e peça de novo.', 'falta a lista de materiais do quadro');
    else return resposta('Para pesquisar os preços, anexe a lista de materiais em Excel/CSV (Descrição, Qtd, Un) ou abra a proposta/análise na tela e peça de novo.', 'falta a lista de materiais');
    if (permiteWeb) entrada.pesquisar_mercado = true;
  } else if (agente === 'quadro_especificacao') {
    const esp = ultimoDe(arquivos, ARQ_ESPEC) || ultimoDe(arquivosConversa, ARQ_ESPEC);
    if (esp) entrada.arquivo_id = esp.id;
    else if (toks.length > 25) entrada.texto = bruto;
    else return resposta('Para projetar o quadro, anexe a especificação/descrição do cliente (PDF, Word ou Excel) ou cole o texto dela na mensagem.', 'falta a especificação');
  } else {
    return ia('agente aprendido sem montagem de entrada');
  }
  return { ...base, decisao: 'agente', agente, entrada, motivo: `reconhecido por ${melhor.regra}` };
}

// ── Com o banco: regras aprendidas, arquivos e execuções da conversa, conhecimento aprovado ──
async function carregarRegrasAprendidas(db) {
  try {
    const { rows } = await db.query(`SELECT id, termos, agente, intencao FROM agentes_sugestoes WHERE tipo = 'vocabulario' AND situacao = 'aprovada' ORDER BY id`);
    return rows;
  } catch { return []; }
}

async function decidir({ db, texto, arquivos = [], conversaId = null, contexto = {} }) {
  let arquivosConversa = [];
  let materiaisDoQuadro = null;
  if (conversaId) {
    try {
      arquivosConversa = (await db.query('SELECT id, tipo, nome_original AS nome FROM assistente_arquivos WHERE conversa_id = $1 ORDER BY id DESC LIMIT 30', [conversaId])).rows;
      const { rows: [q] } = await db.query(
        `SELECT id, resultado FROM agentes_execucoes WHERE conversa_id = $1 AND agente = 'quadro_especificacao' AND status IN ('concluida', 'pendente')
          ORDER BY id DESC LIMIT 1`, [conversaId]);
      const mats = q?.resultado?.dados?.materiais;
      if (Array.isArray(mats) && mats.length) materiaisDoQuadro = { execucao_id: q.id, materiais: mats };
    } catch { /* tabelas antigas */ }
  }
  const d = decidirPuro({ texto, arquivos, arquivosConversa, contexto, regrasAprendidas: await carregarRegrasAprendidas(db), materiaisDoQuadro });
  // pergunta que já tem resposta APROVADA pelo engenheiro: responde sem IA
  if (d.decisao === 'ia' && !/^\/ia\b/i.test(String(texto).trim()) && !/pediu a IA/.test(d.motivo)) {
    const aprovada = await require('../conhecimento').respostaAprovada(texto, { db });
    if (aprovada) {
      return { decisao: 'resposta', intencao: 'conhecimento', agente: null, regra: `conhecimento:${aprovada.id}`, confianca: 0.8, motivo: 'pergunta com resposta aprovada',
        resposta: `${aprovada.resposta}\n\n_(Resposta aprovada pelo engenheiro na base de conhecimento #${aprovada.id} — sem IA.)_` };
    }
  }
  return d;
}

// ── Registro e aprendizado ───────────────────────────────────────────────
async function registrarPedido(db, { usuarioId, conversaId, mensagemId, respostaId, texto, decisao, execucaoId = null }) {
  try {
    const { rows: [p] } = await db.query(
      `INSERT INTO agentes_pedidos (usuario_id, conversa_id, mensagem_id, resposta_id, texto, normalizado, decisao, intencao, agente, regra, confianca, motivo, execucao_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [usuarioId, conversaId, mensagemId, respostaId, String(texto).slice(0, 4000), normalizar(texto).trim().slice(0, 4000), decisao.decisao,
        decisao.intencao || null, decisao.agente || null, decisao.regra || null, decisao.confianca ?? null, String(decisao.motivo || '').slice(0, 500), execucaoId]);
    return p.id;
  } catch (e) {
    console.error('[agentes] não registrou o pedido:', e.message);
    return null;
  }
}

// O modelo (pedido que caiu na IA) chamou executar_agente na resposta `respostaId`: sugere a regra (termos do pedido →
// agente). Fica PENDENTE até o admin aprovar (situacao 'aprovada'). Repetida, só conta mais uma vez.
async function sugerirRegraDoPedido(db, { respostaId, agente }) {
  try {
    const { rows: [p] } = await db.query(`SELECT id, texto FROM agentes_pedidos WHERE resposta_id = $1 AND decisao = 'ia' ORDER BY id DESC LIMIT 1`, [respostaId]);
    if (!p) return null;
    const discs = new Set(disciplinasDoTexto(normalizar(p.texto)).flatMap(c => (V.DISCIPLINAS_TERMOS.find(([k]) => k === c)?.[1] || [])));
    const termos = termosSignificativos(p.texto, { max: 12 }).filter(t => ![...discs].some(d => casaToken(d, t))).slice(0, 4);
    if (termos.length < 2) return null;
    const intencao = V.INTENCOES.find(i => i.agente === agente)?.chave || agente;
    const chave = `vocabulario:${agente}:${[...termos].sort().join('+')}`;
    const { rows: [s] } = await db.query(
      `INSERT INTO agentes_sugestoes (tipo, fonte, agente, intencao, termos, pergunta, resposta, chave, pedido_id)
       VALUES ('vocabulario', 'roteador', $1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (chave) DO UPDATE SET vezes = agentes_sugestoes.vezes + 1, atualizado_em = NOW()
       RETURNING id, situacao, vezes`,
      [agente, intencao, JSON.stringify(termos), p.texto.slice(0, 1000), `Pedidos com "${termos.join(' + ')}" → ${obterAgente(agente)?.nome || agente}`, chave, p.id]);
    return s;
  } catch (e) {
    console.error('[agentes] não sugeriu a regra:', e.message);
    return null;
  }
}

module.exports = { decidirPuro, decidir, registrarPedido, sugerirRegraDoPedido, disciplinasDoTexto, casaToken };
