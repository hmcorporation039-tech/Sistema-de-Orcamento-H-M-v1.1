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

// ── Fila (semáforo com posição) ─────────────────────────────────────────
class Fila {
  constructor(maximo) { this.maximo = maximo; this.rodando = 0; this.esperando = []; }
  adquirir(id, aoMudarPosicao = () => {}) {
    if (this.rodando < this.maximo) { this.rodando++; return Promise.resolve(); }
    return new Promise((resolve, reject) => {
      this.esperando.push({ id, resolve, reject, aoMudarPosicao });
      this._avisar();
    });
  }
  liberar() {
    const proximo = this.esperando.shift();
    if (proximo) proximo.resolve(); else this.rodando = Math.max(0, this.rodando - 1);
    this._avisar();
  }
  remover(id) {
    const i = this.esperando.findIndex(e => e.id === id);
    if (i < 0) return false;
    const [e] = this.esperando.splice(i, 1);
    e.reject(Object.assign(new Error('Cancelado pelo usuário.'), { cancelado: true }));
    this._avisar();
    return true;
  }
  _avisar() { this.esperando.forEach((e, i) => { try { e.aoMudarPosicao(i + 1); } catch { /* idem */ } }); }
  estado() { return { rodando: this.rodando, esperando: this.esperando.length, maximo: this.maximo }; }
}

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
            },
          },
        },
      }), { mode: 0o600 });
      const interpretador = new CLI.InterpretadorStream((ev) => emitir(estado, ev));
      estado.interpretador = interpretador;
      const args = CLI.montarArgs({
        mensagem, sessionId, retomar, mcpConfig, modelo: cfg.modelo, maxTurnos: cfg.maxTurnos,
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
      mcp: { command: process.execPath, args: [CAMINHO_MCP], env: { ASSISTENTE_API_URL: cfg.apiUrl, ASSISTENTE_TOKEN: token, ASSISTENTE_CONTEXTO: JSON.stringify(estado.contexto || {}) } },
      interpretador, signal: estado.abort.signal, tempoLimiteMs: cfg.tempoLimiteMs,
    });
    return { interpretador, saida };
  }

  // Inicia (em segundo plano) a resposta a uma mensagem. Devolve o estado já
  // registrado; a resposta segue pelos ouvintes e é gravada no fim.
  async function iniciar({ usuario, conversa, texto, contexto, arquivos = [] }) {
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
        [conversa.id, cfg.provedor]));
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
      contexto, status: 'fila', posicao: null, ouvintes: new Set(), abort: new AbortController(), cancelado: false, interpretador: null,
      inicio: Date.now(),
    };
    // criados/ações registrados pelas rotas (middleware de escopo e propor_acao) chegam à tela na hora
    registro.ouvintes.add((ev) => emitir(estado, ev));
    // "Parar" clicado enquanto a mensagem era gravada (reserva): não entra na fila
    if (reserva.cancelado) estado.cancelado = true;
    porConversa.set(conversa.id, estado);

    const mensagem = montarMensagem({ contextoTexto, arquivos, texto, usuario });
    (async () => {
      let interpretador = null;
      let saida = null;
      let erro = null;
      if (estado.cancelado) erro = 'Cancelado pelo usuário.';
      else {
        try {
          await fila.adquirir(exec, (posicao) => { estado.posicao = posicao; emitir(estado, { tipo: 'fila', posicao }); });
        } catch (e) {
          erro = e.cancelado ? 'Cancelado pelo usuário.' : e.message;
        }
      }
      if (!erro) {
        try {
          estado.status = 'executando';
          estado.posicao = null;
          await pool.query("UPDATE assistente_mensagens SET status = 'executando' WHERE id = $1", [msgAssist.id]);
          emitir(estado, { tipo: 'executando' });
          if (cfg.provedor === 'api') {
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
          `UPDATE assistente_mensagens SET texto = $2, passos = $3, criados = $4, status = $5, erro = $6, tempo_ms = $7
            WHERE id = $1 RETURNING *`,
          [msgAssist.id, textoFinal, JSON.stringify(partes), JSON.stringify(registro.criados), status, erro, Date.now() - estado.inicio]);
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
