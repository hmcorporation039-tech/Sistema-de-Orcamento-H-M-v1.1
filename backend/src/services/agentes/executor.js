// EXECUTOR dos agentes próprios: fila, estado, registro e suporte (pedido de 09/11/2026).
//
// Uma execução (tabela agentes_execucoes) = um agente rodando os passos dele (services/agentes/passos.js) com as
// ferramentas internas (ferramentasInternas.js). Fluxo:
//   1. confere o agente e a entrada (registro.js), garante a conversa (os arquivos de entrada e de saída ficam nela;
//      sem conversa, cria "Agente: <nome>" para o usuário) e grava a execução "fila";
//   2. espera a vez na fila (AGENTES_MAX_SIMULTANEAS, padrão 2 — separada da fila da IA);
//   3. registra a execução no mesmo registro do assistente (services/assistente/sessoes.js) e emite o token curto de
//      escopo 'assistente': as chamadas à API passam pelas regras de middleware/escopoAssistente.js (só rascunho, só
//      altera o que criou nesta conversa ou o que o usuário autorizou ao iniciar — `autorizados` — e nunca sobrescreve
//      proposta Ativa de outra pessoa);
//   4. roda os passos gravando o estado a cada um (passos, logs, pendências [CONFERIR], resultado parcial);
//   5. quando o agente PARA sem resposta e marca suporte (dado faltando, regra ausente, pergunta técnica): olha a base
//      de conhecimento APROVADA; se não tiver, pede o suporte Claude Max (suporteClaude.js) — a resposta fica como
//      sugestão pendente. Sem Claude Max, as pendências ficam marcadas e nada quebra;
//   6. grava o resultado final; o token deixa de valer.
// Tempo-limite por execução: AGENTES_TEMPO_LIMITE_MIN (padrão 15).
const pool = require('../../config/database');
const S = require('../assistente/sessoes');
const { config: configAssistente } = require('../assistente/config');
const { obterAgente, validarEntrada } = require('./registro');
const { EXECUTORES, Parada } = require('./passos');
const { criarClienteApi, criarFerramentas } = require('./ferramentasInternas');
const { textoDoResultado } = require('./textoDoResultado');

const inteiro = (v, padrao, min = 1) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= min ? n : padrao; };
const agora = () => new Date().toISOString();

const { Fila } = require('../../utils/fila'); // a mesma fila do assistente (2.38)

class ErroExecucao extends Error { constructor(m, status = 400) { super(m); this.status = status; } }

function criarExecutor(opcoes = {}) {
  const db = opcoes.db || pool;
  const cfgA = configAssistente();
  const cfg = {
    apiUrl: opcoes.apiUrl || cfgA.apiUrl,
    maxSimultaneas: inteiro(process.env.AGENTES_MAX_SIMULTANEAS, 2),
    tempoLimiteMs: inteiro(process.env.AGENTES_TEMPO_LIMITE_MIN, 15) * 60 * 1000,
    ...(opcoes.config || {}),
  };
  const fila = new Fila(cfg.maxSimultaneas);
  const ativas = new Map(); // id → { promessa, abort, cancelado }
  const fabricaFerramentas = opcoes.fabricaFerramentas || (({ token, conversaId, usuarioId, signal }) =>
    criarFerramentas({ api: criarClienteApi({ url: cfg.apiUrl, token, signal }), conversaId, usuarioId, db }));
  const suporte = opcoes.suporte || require('./suporteClaude').pedirSuporte;
  let recuperou = false;

  // execuções que estavam no ar quando o backend caiu/reiniciou
  async function recuperarInterrompidas() {
    if (recuperou) return;
    recuperou = true;
    await db.query(`UPDATE agentes_execucoes SET status = 'erro', erro = 'Interrompida: o sistema reiniciou durante a execução. Peça de novo.', terminado_em = NOW()
                     WHERE status IN ('fila', 'executando')`).catch(() => {});
  }

  async function garantirConversa(usuarioId, conversaId, agente) {
    if (conversaId) {
      const { rows: [c] } = await db.query('SELECT id FROM assistente_conversas WHERE id = $1 AND usuario_id = $2', [conversaId, usuarioId]);
      if (!c) throw new ErroExecucao('Conversa não encontrada.', 404);
      return c.id;
    }
    const { rows: [c] } = await db.query(`INSERT INTO assistente_conversas (usuario_id, titulo) VALUES ($1, $2) RETURNING id`, [usuarioId, `Agente: ${agente.nome}`.slice(0, 200)]);
    return c.id;
  }

  async function gravar(id, estado, extra = {}) {
    await db.query(
      `UPDATE agentes_execucoes SET passos = $2, logs = $3, pendencias = $4, resultado = $5, precisa_ia = $6, motivo_ia = $7,
              status = COALESCE($8, status), erro = COALESCE($9, erro), iniciado_em = COALESCE($10, iniciado_em), terminado_em = COALESCE($11, terminado_em)
        WHERE id = $1`,
      [id, JSON.stringify(estado.passos), JSON.stringify(estado.logs.slice(-200)), JSON.stringify([...new Set(estado.pendencias)].slice(0, 200)),
        JSON.stringify(estado.resultado), !!estado.motivoIa, estado.motivoIa || null, extra.status || null, extra.erro || null, extra.iniciado_em || null, extra.terminado_em || null]);
  }

  // inicia em segundo plano → { id, conversaId, concluida (Promise do registro final) }
  async function iniciar({ agente: chave, entrada = {}, usuario, conversaId = null, mensagemId = null, origem = 'tela', texto = '', autorizados = [], aoEvento = () => {} }) {
    await recuperarInterrompidas();
    const agente = obterAgente(chave);
    if (!agente) throw new ErroExecucao(`Agente desconhecido: ${chave}`);
    const v = validarEntrada(agente, entrada);
    if (!v.ok) throw new ErroExecucao(`Entrada inválida para ${agente.nome}: ${v.erros.join('; ')}.`);
    const conv = await garantirConversa(usuario.id, conversaId, agente);
    if (v.entrada.arquivo_id) {
      const { rows: [a] } = await db.query('SELECT id FROM assistente_arquivos WHERE id = $1 AND conversa_id = $2', [v.entrada.arquivo_id, conv]);
      if (!a) throw new ErroExecucao('O arquivo informado não está nesta conversa.', 400);
    }
    const definicao = agente.passos.map(p => ({ chave: p.chave, rotulo: p.rotulo, status: 'aguardando', opcional: !!p.opcional }));
    const { rows: [reg] } = await db.query(
      `INSERT INTO agentes_execucoes (agente, usuario_id, conversa_id, mensagem_id, origem, entrada, passos, texto_pedido)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [agente.chave, usuario.id, conv, mensagemId, origem, JSON.stringify(v.entrada), JSON.stringify(definicao), String(texto || '').slice(0, 4000)]);
    const controle = { abort: new AbortController(), cancelado: false };
    controle.promessa = rodar(reg, agente, v.entrada, { usuario, conversaId: conv, mensagemId, texto, autorizados, aoEvento, controle, definicao })
      .finally(() => ativas.delete(reg.id));
    ativas.set(reg.id, controle);
    return { id: reg.id, conversaId: conv, concluida: controle.promessa };
  }

  async function rodar(reg, agente, entrada, { usuario, conversaId, mensagemId, texto, autorizados, aoEvento, controle, definicao }) {
    const estado = { passos: definicao, logs: [], pendencias: [], resultado: { secoes: [], links: [], arquivos: [], dados: {} }, motivoIa: null };
    const emitir = (ev) => { try { aoEvento(ev); } catch { /* ouvinte não derruba */ } };
    const log = (t, nivel = 'info') => estado.logs.push({ em: agora(), nivel, texto: String(t).slice(0, 500) });
    await fila.adquirir(null, (posicao) => emitir({ tipo: 'fila', posicao }));
    const exec = S.novoIdExecucao();
    let status = 'concluida';
    let erro = null;
    const inicio = agora();
    try {
      if (controle.cancelado) throw Object.assign(new Error('Cancelado pelo usuário.'), { cancelado: true });
      await db.query(`UPDATE agentes_execucoes SET status = 'executando', iniciado_em = $2 WHERE id = $1`, [reg.id, inicio]);
      emitir({ tipo: 'executando' });
      const registro = S.registrarExecucao({ exec, conversaId, usuarioId: usuario.id, mensagemId });
      // o que o usuário autorizou ao iniciar (dono/admin conferido na rota): pode ser alterado pelo agente
      registro.autorizados = new Set(autorizados);
      registro.ouvintes.add((ev) => {
        if (ev.tipo !== 'criado') return;
        if (!estado.resultado.links.some(k => k.link === ev.item.link)) estado.resultado.links.push({ rotulo: ev.item.rotulo, link: ev.item.link, tipo: ev.item.tipo, id: ev.item.id });
        emitir({ tipo: 'criado', item: ev.item });
      });
      const token = S.emitirTokenAssistente({ usuarioId: usuario.id, conversaId, exec });
      const f = fabricaFerramentas({ token, conversaId, usuarioId: usuario.id, signal: controle.abort.signal });

      const passoDe = (chave) => {
        let p = estado.passos.find(x => x.chave === chave);
        if (!p) { p = { chave, rotulo: chave, status: 'aguardando' }; estado.passos.push(p); }
        return p;
      };
      const ctx = {
        entrada, texto, f,
        cancelado: () => controle.cancelado,
        log,
        async passo(chave, fn) {
          if (controle.cancelado) throw Object.assign(new Error('Cancelado pelo usuário.'), { cancelado: true });
          const p = passoDe(chave);
          Object.assign(p, { status: 'executando', inicio: agora() });
          emitir({ tipo: 'passo', passo: { ...p } });
          try {
            const resumo = await fn();
            Object.assign(p, { status: 'concluido', fim: agora(), resumo: resumo ? String(resumo).slice(0, 500) : null });
            return resumo;
          } catch (e) {
            Object.assign(p, { status: e.parada ? 'parado' : 'erro', fim: agora(), resumo: String(e.message || e).slice(0, 500) });
            throw e;
          } finally {
            emitir({ tipo: 'passo', passo: { ...p } });
            await gravar(reg.id, estado).catch(() => {});
          }
        },
        pular(chave, motivo) { const p = passoDe(chave); Object.assign(p, { status: 'pulado', resumo: motivo || null }); emitir({ tipo: 'passo', passo: { ...p } }); },
        secao(titulo, linhas) { estado.resultado.secoes.push({ titulo, linhas: (linhas || []).map(String) }); },
        pendencia(t) { if (t) estado.pendencias.push(String(t).slice(0, 400)); },
        link(rotulo, link) { if (!estado.resultado.links.some(k => k.link === link)) estado.resultado.links.push({ rotulo, link }); },
        arquivo(a) { if (a?.id) { estado.resultado.arquivos.push({ id: a.id, nome: a.nome, tipo: a.tipo, tamanho: a.tamanho }); emitir({ tipo: 'criado', item: { tipo: 'arquivo', id: a.id, rotulo: a.nome, link: null } }); } },
        dado(k, v) { estado.resultado.dados[k] = v; },
        precisaIa(motivo) { estado.motivoIa = String(motivo).slice(0, 500); },
      };

      const fn = EXECUTORES[agente.chave];
      let timer;
      const limite = new Promise((_, rej) => { timer = setTimeout(() => { controle.abort.abort(); rej(Object.assign(new Error(`O agente passou do tempo-limite (${Math.round(cfg.tempoLimiteMs / 60000)} min).`), { estourou: true })); }, cfg.tempoLimiteMs); });
      try {
        await Promise.race([fn(ctx), limite]);
      } catch (e) {
        if (!e.parada) throw e;
        status = e.status || 'pendente';
        if (e.message) estado.resultado.secoes.unshift({ titulo: status === 'aguardando_modulo' ? 'Aguardando módulo' : 'Parei aqui', linhas: [e.message] });
        if (e.pergunta) estado.resultado.pergunta = e.pergunta;
        if (e.suporte) await escalar(e.suporte, { agente, estado, reg, token, usuario, conversaId, mensagemId, controle, emitir });
      } finally { clearTimeout(timer); }
      if (controle.cancelado) status = 'cancelada';
    } catch (e) {
      status = e.cancelado || controle.cancelado ? 'cancelada' : 'erro';
      erro = e.cancelado || controle.cancelado ? 'Cancelado pelo usuário.' : String(e.message || e).slice(0, 1000);
      if (status === 'erro') { log(`erro: ${erro}`, 'erro'); if (!e.status) console.error(`[agentes] execução #${reg.id} (${agente.chave}) falhou:`, e); }
    } finally {
      S.encerrarExecucao(exec);
      fila.liberar();
    }
    // passos que nem começaram ficam "não executado"
    for (const p of estado.passos) if (p.status === 'aguardando') p.status = 'nao_executado';
    await gravar(reg.id, estado, { status, erro, terminado_em: agora() }).catch(e => console.error('[agentes] não gravou o fim da execução:', e.message));
    const final = await ver(reg.id);
    emitir({ tipo: 'fim', execucao: final });
    return final;
  }

  // Sem resposta do agente: base aprovada → suporte Claude Max (sugestão pendente) → pendência marcada
  async function escalar(pedido, { agente, estado, reg, token, usuario, conversaId, mensagemId, controle, emitir }) {
    const { respostaAprovada } = require('../conhecimento');
    const disciplina = pedido.disciplina || null;
    const aprovada = await respostaAprovada(pedido.pergunta, { db, agente: agente.chave, disciplina });
    if (aprovada) {
      estado.resultado.suporte = { texto: aprovada.resposta, base_aprovada: true, sugestao_id: aprovada.id };
      return;
    }
    emitir({ tipo: 'suporte_inicio', modo: 'suporte' });
    const parcial = [
      ...estado.passos.filter(p => p.status !== 'aguardando').map(p => `- passo ${p.rotulo}: ${p.status}${p.resumo ? ` — ${p.resumo}` : ''}`),
      ...estado.resultado.secoes.flatMap(s => [`## ${s.titulo}`, ...s.linhas.slice(0, 10)]),
      ...(estado.pendencias.length ? ['Pendências:', ...estado.pendencias.slice(0, 15)] : []),
    ].join('\n');
    const r = await suporte({
      agente: agente.chave, motivo: pedido.tipo, pergunta: pedido.pergunta, parcial, disciplina, modo: 'suporte', token,
      db, usuarioId: usuario.id, execucaoId: reg.id, conversaId, mensagemId, signal: controle.abort.signal,
      aoEvento: (ev) => emitir({ tipo: 'suporte', evento: ev }),
    }).catch(e => ({ ok: false, motivoFalha: e.message }));
    if (r.ok) {
      estado.resultado.suporte = { texto: r.texto, modo: r.modo, sugestao_id: r.sugestao_id };
      estado.motivoIa = `suporte Claude Max consultado (${pedido.tipo})`;
    } else {
      estado.pendencias.push(`[CONFERIR] sem suporte de IA (${r.motivoFalha}): ${String(pedido.pergunta).slice(0, 200)}`);
    }
  }

  async function ver(id) {
    const { rows: [r] } = await db.query('SELECT * FROM agentes_execucoes WHERE id = $1', [id]);
    return r ? { ...r, texto: textoDoResultado(r) } : null;
  }

  // espera terminar (até `ms`) e devolve o registro
  async function aguardar(id, ms = 240000) {
    const c = ativas.get(Number(id));
    if (c) await Promise.race([c.promessa.catch(() => null), new Promise(r => setTimeout(r, ms))]);
    return ver(id);
  }

  function cancelar(id) {
    const c = ativas.get(Number(id));
    if (!c) return false;
    c.cancelado = true;
    c.abort.abort();
    return true;
  }

  return { iniciar, aguardar, cancelar, ver, emAndamento: (id) => ativas.has(Number(id)), cfg };
}

// O que o usuário AUTORIZA o agente a alterar ao iniciá-lo: só o registro dele (ou sem dono), ou qualquer um se for
// admin — a mesma regra de posse da tela (middleware/posse.js). Vai para execucao.autorizados (escopoAssistente.js).
const TABELA_DO_CAMPO = { analise_id: 'analises_projeto', projeto_id: 'laudos_projetos', proposta_id: 'propostas' };
async function autorizadosDaEntrada(db, usuario, entrada) {
  const lista = [];
  for (const [campo, tabela] of Object.entries(TABELA_DO_CAMPO)) {
    const id = Number(entrada?.[campo]);
    if (!Number.isInteger(id) || id < 1) continue;
    const { rows: [r] } = await db.query(`SELECT usuario_id FROM ${tabela} WHERE id = $1`, [id]);
    if (!r) throw new ErroExecucao(`${campo} ${id} não encontrado.`, 404);
    if (usuario.role === 'admin' || r.usuario_id == null || r.usuario_id === usuario.id) lista.push(`${tabela}:${id}`);
  }
  return lista;
}

let padrao = null;
const executor = () => (padrao ||= criarExecutor());
const substituirExecutor = (e) => { padrao = e; };

module.exports = { criarExecutor, executor, substituirExecutor, ErroExecucao, autorizadosDaEntrada };
