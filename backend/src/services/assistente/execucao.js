// Gerenciador das execuções do assistente: fila, processo do Claude Code,
// streaming para a tela, cancelamento, tempo-limite e gravação da resposta.
//
// Fluxo de uma mensagem (POST /api/assistente/conversas/:id/mensagens):
//   1. grava a mensagem do usuário e a do assistente (status "fila");
//   2. entra na FILA (no máximo ASSISTENTE_MAX_SIMULTANEAS no PC; as outras
//      esperam e a tela mostra a posição);
//   3. emite o token curto do assistente para esta execução e escreve o
//      --mcp-config temporário apontando para o MCP do assistente;
//   4. roda `claude -p` (ou, com ASSISTENTE_PROVEDOR=api, o adaptador da API) e
//      repassa à tela, em tempo real, o texto e os passos das ferramentas;
//   5. no fim grava texto, passos, registros criados, erro e tempo; o token deixa
//      de valer (a execução sai do registro) e o arquivo temporário é apagado.
// A tela pode fechar no meio: a execução continua e a resposta fica gravada;
// ao reabrir, GET .../acompanhar devolve o estado atual e segue o streaming.
//
// ROTEADOR (09/11/2026 — services/agentes/roteador.js): a decisão vem do controller ANTES do modelo:
//   'agente'   roda o agente próprio (sem IA, fila dos agentes) e responde com o resultado (provedor 'agente');
//   'resposta' responde sem IA (dado que falta, ou resposta aprovada na base de conhecimento);
//   'suporte'  pesquisa aprofundada: suporte Claude Max em modo consultor (só leitura + WebSearch/WebFetch),
//              provedor 'suporte_claude' — a resposta vira sugestão pendente de conhecimento;
//   'ia'       o caminho de sempre (claude -p com as ferramentas do assistente).
// Toda decisão fica em agentes_pedidos (aprendizado do vocabulário e "o usuário aceitou?").
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const pool = require('../../config/database');
const { config } = require('./config');
const S = require('./sessoes');
const CLI = require('./claudeCli');
const { textoDeSistema, descreverContexto, montarMensagem } = require('./prompt');
const { hojeBrasilia } = require('../../utils/dataHoje');

const CAMINHO_MCP = path.join(__dirname, '..', '..', 'mcp', 'assistenteMcp.mjs');

// Fila (semáforo com posição): utils/fila.js, a mesma do Claude Max, do PDF e das threads (2.38)
const { Fila } = require('../../utils/fila');

function criarGerenciador(opcoes = {}) {
  const cfg = { ...config(), ...(opcoes.config || {}) };
  const fila = new Fila(cfg.maxSimultaneas);
  const porConversa = new Map(); // conversaId → estado da execução em andamento
  const executarProcesso = opcoes.executarProcesso || CLI.executarProcesso;
  const comando = opcoes.comando || cfg.caminhoCli;
  const prefixo = opcoes.prefixo || [];
  let ultimoLimiteUso = null;

  function emitir(estado, evento) {
    for (const f of estado.ouvintes) { try { f(evento); } catch { /* ouvinte não derruba a execução */ } }
  }

  function retrato(estado) {
    return {
      tipo: 'estado', status: estado.status, posicao: estado.posicao || null, mensagemId: estado.mensagemId,
      origem: estado.rota ? (estado.rota.decisao === 'agente' || estado.rota.decisao === 'resposta' ? 'agente' : estado.rota.decisao === 'suporte' ? 'suporte' : 'ia') : null,
      partes: estado.interpretador ? estado.interpretador.partes : [], criados: estado.registro.criados, acoes: estado.registro.acoes,
    };
  }

  // Ouvir a execução em andamento de uma conversa (retrato atual + eventos novos)
  function acompanhar(conversaId, ouvinte) {
    const estado = porConversa.get(Number(conversaId));
    // reserva (iniciar ainda gravando a mensagem): nada para mostrar ainda
    if (!estado || estado.reservado) return null;
    ouvinte(retrato(estado));
    estado.ouvintes.add(ouvinte);
    return () => estado.ouvintes.delete(ouvinte);
  }

  const emAndamento = (conversaId) => porConversa.has(Number(conversaId));

  function cancelar(conversaId) {
    const estado = porConversa.get(Number(conversaId));
    if (!estado) return false;
    estado.cancelado = true;
    if (estado.reservado) return true; // iniciar vê o cancelamento antes de entrar na fila
    if (!fila.remover(estado.exec)) estado.abort.abort();
    return true;
  }

  async function historicoResumido(conversaId, ateMensagemId) {
    const { rows } = await pool.query(
      `SELECT papel, texto FROM assistente_mensagens WHERE conversa_id = $1 AND id < $2 AND texto <> '' ORDER BY id DESC LIMIT 10`,
      [conversaId, ateMensagemId]);
    return rows.reverse().map(m => `${m.papel === 'usuario' ? 'Usuário' : 'Assistente'}: ${m.texto.slice(0, 600)}`).join('\n') || null;
  }

  // Uma rodada do Claude Code. Devolve { interpretador, saida, retomar }
  async function rodarCli(estado, { conversa, mensagem, retomar, sessionId }) {
    const tmp = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'hm-assist-')));
    const mcpConfig = path.join(tmp, 'mcp.json');
    try {
      const token = S.emitirTokenAssistente({ usuarioId: estado.usuarioId, conversaId: conversa.id, exec: estado.exec });
      fs.writeFileSync(mcpConfig, JSON.stringify({
        mcpServers: {
          hm: {
            command: process.execPath,
            args: [CAMINHO_MCP],
            env: {
              ASSISTENTE_API_URL: cfg.apiUrl,
              ASSISTENTE_TOKEN: token,
              ASSISTENTE_CONTEXTO: JSON.stringify(estado.contexto || {}),
              // o MCP só registra as ferramentas do papel (o financeiro, para admin/financeiro)
              ASSISTENTE_PAPEL: estado.papel || '',
            },
          },
        },
      }), { mode: 0o600 });
      const interpretador = new CLI.InterpretadorStream((ev) => emitir(estado, ev));
      estado.interpretador = interpretador;
      const args = CLI.montarArgs({
        mensagem, sessionId, retomar, mcpConfig, modelo: cfg.modelo, maxTurnos: cfg.maxTurnos, papel: estado.papel,
        sistema: textoDeSistema({ hoje: hojeBrasilia() }),
      });
      const saida = await executarProcesso({
        comando, prefixo, args, cwd: CLI.pastaDeTrabalho(), env: CLI.ambienteFiltrado(),
        aoEvento: (e) => interpretador.processar(e), signal: estado.abort.signal, tempoLimiteMs: cfg.tempoLimiteMs,
      });
      if (interpretador.limiteUso) ultimoLimiteUso = { ...interpretador.limiteUso, em: new Date().toISOString() };
      return { interpretador, saida };
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  async function rodarApi(estado, { conversa, mensagem }) {
    const { executarPelaApi } = require('./provedorApi');
    const interpretador = new CLI.InterpretadorStream((ev) => emitir(estado, ev));
    estado.interpretador = interpretador;
    const token = S.emitirTokenAssistente({ usuarioId: estado.usuarioId, conversaId: conversa.id, exec: estado.exec });
    const historico = await pool.query(
      `SELECT papel, texto FROM assistente_mensagens WHERE conversa_id = $1 AND id < $2 AND texto <> '' AND status IN ('concluida') ORDER BY id DESC LIMIT 20`,
      [conversa.id, estado.mensagemUsuarioId]);
    const saida = await executarPelaApi({
      cfg, mensagem, historico: historico.rows.reverse(), sistema: textoDeSistema({ hoje: hojeBrasilia() }),
      mcp: { command: process.execPath, args: [CAMINHO_MCP], env: { ASSISTENTE_API_URL: cfg.apiUrl, ASSISTENTE_TOKEN: token, ASSISTENTE_CONTEXTO: JSON.stringify(estado.contexto || {}), ASSISTENTE_PAPEL: estado.papel || '' } },
      interpretador, signal: estado.abort.signal, tempoLimiteMs: cfg.tempoLimiteMs,
    });
    return { interpretador, saida };
  }

  // Inicia (em segundo plano) a resposta a uma mensagem. Devolve o estado já
  // registrado; a resposta segue pelos ouvintes e é gravada no fim.
  // Resposta sem IA: agente próprio ou resposta direta do roteador. Monta as "partes" como as da IA (passos como
  // ferramentas e o texto no fim) para a tela mostrar igual.
  async function rodarSemIa(estado, { conversa, rota, usuario, texto }) {
    const partes = [];
    const interpretador = { partes, resultado: { sucesso: true }, textoFinal: () => partes.filter(p => p.tipo === 'texto').map(p => p.texto).join('\n\n').trim() };
    estado.interpretador = interpretador;
    const escrever = (t) => { partes.push({ tipo: 'texto', texto: t }); emitir(estado, { tipo: 'texto', delta: t }); };
    if (rota.decisao === 'resposta') { escrever(rota.resposta); return { interpretador }; }
    const { executor, autorizadosDaEntrada } = require('../agentes/executor');
    const autorizados = await autorizadosDaEntrada(pool, usuario, rota.entrada).catch(() => []);
    const aoEvento = (ev) => {
      if (ev.tipo === 'fila') { estado.posicao = ev.posicao; emitir(estado, { tipo: 'fila', posicao: ev.posicao }); return; }
      if (ev.tipo === 'executando') { estado.status = 'executando'; estado.posicao = null; emitir(estado, { tipo: 'executando' }); return; }
      if (ev.tipo === 'criado') {
        if (!estado.registro.criados.some(c => c.tipo === ev.item.tipo && c.id === ev.item.id)) estado.registro.criados.push(ev.item);
        emitir(estado, { tipo: 'criado', item: ev.item });
        return;
      }
      if (ev.tipo === 'suporte_inicio') {
        partes.push({ tipo: 'ferramenta', id: 'suporte', nome: 'suporte_claude', rotulo: 'Pedindo suporte ao Claude Max (só leitura)', ok: null });
        emitir(estado, { tipo: 'ferramenta_inicio', id: 'suporte', nome: 'suporte_claude', rotulo: 'Pedindo suporte ao Claude Max (só leitura)' });
        return;
      }
      if (ev.tipo !== 'passo' || ev.passo.status === 'pulado' || ev.passo.status === 'aguardando') return;
      const id = `passo-${ev.passo.chave}`;
      let parte = partes.find(p => p.id === id);
      if (!parte) {
        parte = { tipo: 'ferramenta', id, nome: `agente:${ev.passo.chave}`, rotulo: ev.passo.rotulo, ok: null };
        partes.push(parte);
        emitir(estado, { tipo: 'ferramenta_inicio', id, nome: parte.nome, rotulo: parte.rotulo });
      }
      if (ev.passo.status !== 'executando') {
        parte.ok = ev.passo.status === 'concluido';
        parte.resumo = ev.passo.resumo || null;
        emitir(estado, { tipo: 'ferramenta_fim', id, ok: parte.ok, resumo: parte.resumo });
      }
    };
    const inicio = await executor().iniciar({ agente: rota.agente, entrada: rota.entrada, usuario, conversaId: conversa.id, mensagemId: estado.mensagemId, origem: 'roteador', texto, autorizados, aoEvento });
    estado.execucaoId = inicio.id;
    const cancelarAgente = () => executor().cancelar(inicio.id);
    estado.abort.signal.addEventListener('abort', cancelarAgente, { once: true });
    const final = await inicio.concluida;
    const sup = partes.find(p => p.id === 'suporte');
    if (sup && sup.ok == null) { sup.ok = !!final.resultado?.suporte?.texto; emitir(estado, { tipo: 'ferramenta_fim', id: 'suporte', ok: sup.ok, resumo: sup.ok ? 'respondido (sugestão pendente)' : 'indisponível — pendência marcada' }); }
    escrever(final.texto);
    estado.sugestaoId = final.resultado?.suporte?.sugestao_id && !final.resultado.suporte.base_aprovada ? final.resultado.suporte.sugestao_id : null;
    if (final.status === 'cancelada') estado.cancelado = true;
    return { interpretador };
  }

  // Pesquisa aprofundada pedida pelo usuário: suporte Claude Max em modo consultor (só leitura + web)
  async function rodarSuporte(estado, { conversa, rota, usuario }) {
    const partes = [];
    const interpretador = { partes, resultado: { sucesso: true }, textoFinal: () => partes.filter(p => p.tipo === 'texto').map(p => p.texto).join('\n\n').trim() };
    estado.interpretador = interpretador;
    const { pedirSuporte } = require('../agentes/suporteClaude');
    const token = S.emitirTokenAssistente({ usuarioId: usuario.id, conversaId: conversa.id, exec: estado.exec });
    const r = await pedirSuporte({
      agente: null, origem: 'consultor', motivo: 'pesquisa aprofundada pedida pelo usuário', pergunta: rota.entrada.pergunta, disciplina: rota.entrada.disciplina,
      modo: 'consultor', token, contexto: estado.contexto || {}, usuarioId: usuario.id, conversaId: conversa.id, mensagemId: estado.mensagemId, signal: estado.abort.signal,
      aoEvento: (ev) => emitir(estado, ev),
    });
    if (r.ok) {
      partes.push(...(r.partes || []).filter(p => p.tipo === 'ferramenta'), { tipo: 'texto', texto: `${r.texto}\n\n_Resposta do suporte Claude Max${r.modo === 'consultor' ? ' (pesquisa aprofundada)' : ''} — vira conhecimento do sistema só depois de aprovada._` });
      estado.sugestaoId = r.sugestao_id;
      return { interpretador };
    }
    // sem Claude Max: responde o que o sistema sabe e marca a pendência
    const { consultar } = require('../conhecimento');
    const base = await consultar({ disciplina: rota.entrada.disciplina, busca: rota.entrada.pergunta, limite: 3, db: pool }).catch(() => ({ secoes: [] }));
    const texto = [`Não consegui o suporte do Claude Max agora (${r.motivoFalha}).`,
      ...(base.secoes.length ? ['', '**O que o sistema já sabe sobre isso:**', ...base.secoes.map(x => x.texto)] : ['', 'A base de conhecimento do sistema não tem nada sobre isso.']),
      '', '[CONFERIR] pergunta sem resposta: tente de novo mais tarde ou consulte a norma/fabricante.'].join('\n');
    partes.push({ tipo: 'texto', texto });
    emitir(estado, { tipo: 'texto', delta: texto });
    return { interpretador };
  }

  async function iniciar({ usuario, conversa, texto, contexto, arquivos = [], rota = null }) {
    if (porConversa.has(conversa.id)) throw Object.assign(new Error('O assistente ainda está respondendo nesta conversa. Aguarde ou clique em Parar.'), { status: 409 });
    // Reserva a conversa JÁ (síncrono, antes de qualquer await): antes a marca
    // só entrava depois dos INSERTs, e dois envios quase juntos passavam os dois
    // pela conferência acima — duas execuções na mesma conversa e sessão.
    const reserva = { reservado: true, cancelado: false };
    porConversa.set(conversa.id, reserva);
    const soltarReserva = () => { if (porConversa.get(conversa.id) === reserva) porConversa.delete(conversa.id); };
    let contextoTexto, msgUsuario, msgAssist, conv;
    try {
      contextoTexto = await descreverContexto(contexto);
      ({ rows: [msgUsuario] } = await pool.query(
        `INSERT INTO assistente_mensagens (conversa_id, papel, texto, contexto, arquivos) VALUES ($1,'usuario',$2,$3,$4) RETURNING *`,
        [conversa.id, texto, contexto, JSON.stringify(arquivos.map(a => ({ id: a.id, nome: a.nome, tipo: a.tipo, tamanho: a.tamanho })))]));
      ({ rows: [msgAssist] } = await pool.query(
        `INSERT INTO assistente_mensagens (conversa_id, papel, status, provedor) VALUES ($1,'assistente','fila',$2) RETURNING *`,
        [conversa.id, rota && rota.decisao !== 'ia' ? (rota.decisao === 'suporte' ? 'suporte_claude' : 'agente') : cfg.provedor]));
      ({ rows: [conv] } = await pool.query(
        `UPDATE assistente_conversas SET contexto = $2, atualizado_em = NOW(),
                titulo = CASE WHEN titulo = 'Nova conversa' THEN $3 ELSE titulo END
          WHERE id = $1 RETURNING titulo`,
        [conversa.id, contexto, String(texto).replace(/\s+/g, ' ').trim().slice(0, 80) || 'Nova conversa']));
    } catch (e) {
      soltarReserva();
      throw e;
    }

    const exec = S.novoIdExecucao();
    const registro = S.registrarExecucao({ exec, conversaId: conversa.id, usuarioId: usuario.id, mensagemId: msgAssist.id });
    const estado = {
      exec, registro, conversaId: conversa.id, usuarioId: usuario.id, mensagemId: msgAssist.id, mensagemUsuarioId: msgUsuario.id,
      papel: usuario.papel || usuario.role || null,
      contexto, status: 'fila', posicao: null, ouvintes: new Set(), abort: new AbortController(), cancelado: false, interpretador: null,
      inicio: Date.now(),
    };
    // criados/ações registrados pelas rotas (middleware de escopo e propor_acao) chegam à tela na hora
    registro.ouvintes.add((ev) => emitir(estado, ev));
    // "Parar" clicado enquanto a mensagem era gravada (reserva): não entra na fila
    if (reserva.cancelado) estado.cancelado = true;
    porConversa.set(conversa.id, estado);

    const mensagem = montarMensagem({ contextoTexto, arquivos, texto, usuario });
    // decisão do roteador registrada (aprendizado do vocabulário e avaliação "serviu?")
    const semIa = !!rota && (rota.decisao === 'agente' || rota.decisao === 'resposta');
    if (rota) {
      estado.rota = rota;
      estado.pedidoId = await require('../agentes/roteador').registrarPedido(pool, {
        usuarioId: usuario.id, conversaId: conversa.id, mensagemId: msgUsuario.id, respostaId: msgAssist.id, texto, decisao: rota,
      });
      emitir(estado, { tipo: 'origem', origem: semIa ? 'agente' : rota.decisao === 'suporte' ? 'suporte' : 'ia', agente: rota.agente || null, pedidoId: estado.pedidoId });
    }
    (async () => {
      let interpretador = null;
      let saida = null;
      let erro = null;
      if (estado.cancelado) erro = 'Cancelado pelo usuário.';
      else if (semIa) {
        try {
          estado.status = 'executando';
          await pool.query("UPDATE assistente_mensagens SET status = 'executando' WHERE id = $1", [msgAssist.id]);
          ({ interpretador } = await rodarSemIa(estado, { conversa, rota, usuario, texto }));
          if (estado.cancelado) erro = 'Cancelado pelo usuário.';
        } catch (e) {
          console.error('[assistente] falha no agente próprio:', e);
          erro = `Falha no agente próprio: ${String(e.message || e).slice(0, 300)}`;
        }
      } else {
        try {
          await fila.adquirir(exec, (posicao) => { estado.posicao = posicao; emitir(estado, { tipo: 'fila', posicao }); });
        } catch (e) {
          erro = e.cancelado ? 'Cancelado pelo usuário.' : e.message;
        }
      }
      if (!erro && !semIa) {
        try {
          estado.status = 'executando';
          estado.posicao = null;
          await pool.query("UPDATE assistente_mensagens SET status = 'executando' WHERE id = $1", [msgAssist.id]);
          emitir(estado, { tipo: 'executando' });
          if (rota?.decisao === 'suporte') {
            ({ interpretador } = await rodarSuporte(estado, { conversa, rota, usuario }));
          } else if (cfg.provedor === 'api') {
            ({ interpretador, saida } = await rodarApi(estado, { conversa, mensagem }));
          } else {
            const { rows: [c] } = await pool.query('SELECT session_id, sessao_iniciada FROM assistente_conversas WHERE id = $1', [conversa.id]);
            let sessionId = c.session_id;
            let retomar = !!(c.sessao_iniciada && sessionId);
            if (!retomar) {
              sessionId = crypto.randomUUID();
              await pool.query('UPDATE assistente_conversas SET session_id = $2 WHERE id = $1', [conversa.id, sessionId]);
            }
            ({ interpretador, saida } = await rodarCli(estado, { conversa, mensagem, retomar, sessionId }));
            // sessão perdida (pasta do Claude limpa, outro PC): começa outra com o resumo da conversa
            if (retomar && !interpretador.resultado && !saida.cancelado && !saida.estourou && CLI.sessaoNaoEncontrada(saida.stderr)) {
              sessionId = crypto.randomUUID();
              await pool.query('UPDATE assistente_conversas SET session_id = $2, sessao_iniciada = false WHERE id = $1', [conversa.id, sessionId]);
              const historico = await historicoResumido(conversa.id, msgUsuario.id);
              ({ interpretador, saida } = await rodarCli(estado, { conversa, mensagem: montarMensagem({ contextoTexto, arquivos, texto, historico, usuario }), retomar: false, sessionId }));
            }
            if (interpretador.resultado) {
              await pool.query('UPDATE assistente_conversas SET session_id = $2, sessao_iniciada = true WHERE id = $1', [conversa.id, interpretador.sessionId || sessionId]);
            }
          }
          if (!interpretador.resultado?.sucesso || estado.cancelado) {
            erro = CLI.explicarFalha({ ...saida, cancelado: estado.cancelado || saida.cancelado, resultado: interpretador.resultado, tempoLimiteMs: cfg.tempoLimiteMs });
          }
        } catch (e) {
          console.error('[assistente] falha na execução:', e);
          erro = `Falha ao executar o assistente: ${String(e.message || e).slice(0, 300)}`;
        } finally {
          fila.liberar();
        }
      }
      const status = estado.cancelado ? 'cancelada' : erro ? 'erro' : 'concluida';
      const partes = interpretador ? interpretador.partes : [];
      const textoFinal = interpretador ? interpretador.textoFinal() : '';
      try {
        const { rows: [final] } = await pool.query(
          `UPDATE assistente_mensagens SET texto = $2, passos = $3, criados = $4, status = $5, erro = $6, tempo_ms = $7,
                  agente_execucao_id = $8, agente_pedido_id = $9, sugestao_id = $10
            WHERE id = $1 RETURNING *`,
          [msgAssist.id, textoFinal, JSON.stringify(partes), JSON.stringify(registro.criados), status, erro, Date.now() - estado.inicio,
            estado.execucaoId || null, estado.pedidoId || null, estado.sugestaoId || null]);
        if (estado.execucaoId && estado.pedidoId) await pool.query('UPDATE agentes_pedidos SET execucao_id = $2 WHERE id = $1', [estado.pedidoId, estado.execucaoId]).catch(() => {});
        await pool.query('UPDATE assistente_conversas SET atualizado_em = NOW() WHERE id = $1', [conversa.id]);
        const { rows: acoes } = await pool.query('SELECT * FROM assistente_acoes WHERE mensagem_id = $1 ORDER BY id', [msgAssist.id]);
        emitir(estado, { tipo: 'fim', mensagem: { ...final, acoes } });
      } catch (e) {
        console.error('[assistente] não gravou a resposta:', e);
        emitir(estado, { tipo: 'fim', mensagem: { id: msgAssist.id, papel: 'assistente', texto: textoFinal, passos: partes, criados: registro.criados, status: 'erro', erro: erro || 'Não foi possível gravar a resposta.' } });
      } finally {
        S.encerrarExecucao(exec);
        // só apaga se a marca ainda é desta execução (nunca a de outra que já começou)
        if (porConversa.get(conversa.id) === estado) porConversa.delete(conversa.id);
        for (const f of estado.ouvintes) { try { f({ tipo: 'encerrado' }); } catch { /* idem */ } }
        estado.ouvintes.clear();
      }
    })();

    return { estado, mensagemUsuario: msgUsuario, mensagemAssistente: msgAssist, titulo: conv?.titulo || conversa.titulo };
  }

  function estadoGeral() {
    return { fila: fila.estado(), conversasEmAndamento: porConversa.size, limiteUso: ultimoLimiteUso, provedor: cfg.provedor, modelo: cfg.provedor === 'api' ? cfg.modeloApi : cfg.modelo };
  }

  return { iniciar, acompanhar, cancelar, emAndamento, estadoGeral, cfg, fila };
}

let padrao = null;
const gerenciador = () => (padrao ||= criarGerenciador());
// testes: troca o gerenciador por um com o Claude Code falso (testes/assistenteIntegracao.test.js)
const substituirGerenciador = (g) => { padrao = g; };

module.exports = { criarGerenciador, gerenciador, substituirGerenciador, Fila };
