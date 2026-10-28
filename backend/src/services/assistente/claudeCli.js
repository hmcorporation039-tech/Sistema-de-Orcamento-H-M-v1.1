// Execução do assistente pelo Claude Code (`claude -p`) com a assinatura Max.
//
// Cada mensagem é um processo:
//   claude -p <mensagem> --output-format stream-json --verbose --include-partial-messages
//          --model sonnet --restricted --strict-mcp-config --mcp-config <json temporário>
//          --disable-slash-commands --tools "" --permission-mode dontAsk
//          --allowedTools mcp__hm__buscar_obras … (só as do MCP do assistente)
//          --system-prompt <regras> --exclude-dynamic-system-prompt-sections
//          --session-id <uuid> (1ª mensagem)  |  --resume <uuid> (as seguintes)
//
// Por que cada opção:
//   --restricted + --tools ""     nenhuma ferramenta embutida (Bash, PowerShell,
//                                 Read, Edit, Write, WebFetch…) e sem as permissões
//                                 do settings.json do usuário (que liberam comandos)
//   --strict-mcp-config           só o MCP do assistente — nenhum outro servidor MCP do PC
//   --permission-mode dontAsk     o que não está em --allowedTools é negado (sem pergunta)
//   --allowedTools                exatamente as ferramentas do MCP do assistente
//   --disable-slash-commands      sem skills/comandos (o cálculo vem do sistema)
//   ambiente filtrado             o processo NÃO herda as variáveis do backend
//                                 (senha do banco, JWT_SECRET, ANTHROPIC_API_KEY —
//                                 esta faria o Claude Code cobrar da API em vez da assinatura)
// Conferido no evento "init" (tools = só mcp__hm__*), ver testes/assistente.test.js.
//
// O Claude Code grava a sessão em ~/.claude/projects/<pasta de trabalho>; por
// isso a pasta de trabalho é FIXA (o --resume procura a sessão por ela).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFile } = require('child_process');
const { ferramentasPermitidas, rotuloDa, nomeCurto } = require('./ferramentas');

// Variáveis de ambiente que o Claude Code precisa (perfil do Windows, rede);
// o resto do .env do backend fica de fora.
const AMBIENTE_PERMITIDO = /^(PATH|PATHEXT|SYSTEMROOT|SYSTEMDRIVE|WINDIR|COMSPEC|USERPROFILE|HOMEDRIVE|HOMEPATH|HOME|APPDATA|LOCALAPPDATA|PROGRAMDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMW6432|COMMONPROGRAMFILES|TEMP|TMP|USERNAME|USERDOMAIN|COMPUTERNAME|OS|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS|LANG|LC_ALL|TZ|HTTP_PROXY|HTTPS_PROXY|NO_PROXY|http_proxy|https_proxy|no_proxy|NODE_EXTRA_CA_CERTS|CLAUDE_CONFIG_DIR)$/i;

function ambienteFiltrado(env = process.env) {
  const saida = {};
  for (const [k, v] of Object.entries(env)) if (AMBIENTE_PERMITIDO.test(k)) saida[k] = v;
  return saida;
}

// Pasta de trabalho fixa (caminho completo: o modo restrito recusa nomes curtos do Windows, ex.: LABORA~1)
function pastaDeTrabalho() {
  const p = path.join(os.tmpdir(), 'hm-assistente-cli');
  fs.mkdirSync(p, { recursive: true });
  return fs.realpathSync.native(p);
}

function montarArgs({ mensagem, sessionId, retomar, mcpConfig, modelo, maxTurnos, sistema }) {
  const args = [
    '-p', mensagem,
    '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
    '--model', modelo,
    '--restricted', '--strict-mcp-config', '--mcp-config', mcpConfig,
    '--disable-slash-commands', '--tools', '',
    '--permission-mode', 'dontAsk',
    '--allowedTools', ...ferramentasPermitidas(),
    '--max-turns', String(maxTurnos),
    '--system-prompt', sistema,
    '--exclude-dynamic-system-prompt-sections',
  ];
  if (retomar) args.push('--resume', sessionId); else args.push('--session-id', sessionId);
  return args;
}

// Mata o processo e os filhos (o MCP do assistente roda como filho do claude.exe)
function matarArvore(filho) {
  if (!filho || filho.exitCode !== null || filho.killed) return;
  if (process.platform === 'win32' && filho.pid) {
    execFile('taskkill', ['/pid', String(filho.pid), '/T', '/F'], { windowsHide: true }, () => {});
  } else {
    try { filho.kill('SIGTERM'); } catch { /* já saiu */ }
  }
}

// Roda o processo e entrega cada linha JSON do stream a `aoEvento`.
// `comando`/`prefixo` permitem o CLI falso dos testes (node cli-falso.js …).
function executarProcesso({ comando, prefixo = [], args, cwd, env, aoEvento, signal, tempoLimiteMs }) {
  return new Promise((resolve) => {
    let filho;
    try {
      filho = spawn(comando, [...prefixo, ...args], { cwd, env, windowsHide: true });
    } catch (e) {
      return resolve({ codigo: null, erroSpawn: e.message, stderr: '' });
    }
    let buffer = '';
    let stderr = '';
    let estourou = false;
    let cancelado = false;
    const timer = tempoLimiteMs ? setTimeout(() => { estourou = true; matarArvore(filho); }, tempoLimiteMs) : null;
    const aoAbortar = () => { cancelado = true; matarArvore(filho); };
    if (signal) {
      if (signal.aborted) aoAbortar();
      else signal.addEventListener('abort', aoAbortar, { once: true });
    }
    filho.stdin.end(); // sem isso a CLI espera dados na entrada padrão
    filho.stdout.setEncoding('utf8');
    filho.stdout.on('data', (d) => {
      buffer += d;
      let i;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const linha = buffer.slice(0, i).trim();
        buffer = buffer.slice(i + 1);
        if (!linha) continue;
        let evento;
        try { evento = JSON.parse(linha); } catch { continue; }
        try { aoEvento(evento); } catch (e) { console.error('[assistente] erro ao tratar evento:', e.message); }
      }
    });
    filho.stderr.setEncoding('utf8');
    filho.stderr.on('data', (d) => { if (stderr.length < 20000) stderr += d; });
    filho.on('error', (e) => { stderr += `\n${e.message}`; });
    filho.on('close', (codigo) => {
      if (timer) clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', aoAbortar);
      const resto = buffer.trim();
      if (resto) { try { aoEvento(JSON.parse(resto)); } catch { /* linha incompleta */ } }
      resolve({ codigo, stderr: stderr.trim(), estourou, cancelado });
    });
  });
}

// ── Interpretação do stream-json ──────────────────────────────────────────
// Transforma os eventos do Claude Code em eventos da tela e na linha do tempo
// gravada na mensagem (`partes`): texto e passos (ferramentas) na ordem.
const resumirResultado = (conteudo) => {
  const texto = Array.isArray(conteudo)
    ? conteudo.filter(c => c && c.type === 'text').map(c => c.text).join('\n')
    : String(conteudo ?? '');
  return texto.length > 1500 ? `${texto.slice(0, 1500)}…` : texto;
};
const resumirEntrada = (entrada) => {
  // textos longos (ex.: dados de um formulário inteiro) ficam cortados no registro
  try { return JSON.parse(JSON.stringify(entrada ?? {}, (k, v) => (typeof v === 'string' && v.length > 300 ? `${v.slice(0, 300)}…` : v))); } catch { return null; }
};

class InterpretadorStream {
  constructor(emitir = () => {}) {
    this.emitir = emitir;
    this.partes = [];
    this.sessionId = null;
    this.ferramentasDisponiveis = null;
    this.resultado = null;
    this.limiteUso = null;
    this.msgsComDelta = new Set();
    this.msgAtual = null;
    this.blocoFerramenta = new Map(); // índice do bloco → id da ferramenta (no stream parcial)
  }

  textoFinal() {
    return this.partes.filter(p => p.tipo === 'texto').map(p => p.texto).join('\n\n').trim();
  }

  _texto(delta) {
    if (!delta) return;
    const ultima = this.partes[this.partes.length - 1];
    if (ultima && ultima.tipo === 'texto') ultima.texto += delta;
    else this.partes.push({ tipo: 'texto', texto: delta });
    this.emitir({ tipo: 'texto', delta });
  }

  _inicioFerramenta(id, nome) {
    if (this.partes.some(p => p.tipo === 'ferramenta' && p.id === id)) return;
    const parte = { tipo: 'ferramenta', id, nome: nomeCurto(nome), rotulo: rotuloDa(nome), entrada: null, ok: null, resumo: null, inicio: Date.now(), fim: null };
    this.partes.push(parte);
    this.emitir({ tipo: 'ferramenta_inicio', id, nome: parte.nome, rotulo: parte.rotulo });
  }

  processar(e) {
    if (!e || typeof e !== 'object') return;
    if (e.type === 'system' && e.subtype === 'init') {
      this.sessionId = e.session_id || this.sessionId;
      this.ferramentasDisponiveis = e.tools || [];
      this.mcp = e.mcp_servers || [];
      this.emitir({ tipo: 'inicio', modelo: e.model || null });
      return;
    }
    if (e.type === 'rate_limit_event') {
      this.limiteUso = e.rate_limit_info || null;
      return;
    }
    if (e.type === 'stream_event' && e.event) {
      const ev = e.event;
      if (ev.type === 'message_start') { this.msgAtual = ev.message?.id || null; this.blocoFerramenta.clear(); }
      else if (ev.type === 'content_block_start' && ev.content_block?.type === 'tool_use') {
        this.blocoFerramenta.set(ev.index, ev.content_block.id);
        this._inicioFerramenta(ev.content_block.id, ev.content_block.name);
      } else if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
        if (this.msgAtual) this.msgsComDelta.add(this.msgAtual);
        this._texto(ev.delta.text);
      }
      return;
    }
    if (e.type === 'assistant' && e.message) {
      if (e.parent_tool_use_id) return; // (não há subagentes; por garantia)
      const msgId = e.message.id;
      for (const b of e.message.content || []) {
        if (b.type === 'text' && !this.msgsComDelta.has(msgId)) this._texto(b.text);
        if (b.type === 'tool_use') {
          this._inicioFerramenta(b.id, b.name);
          const parte = this.partes.find(p => p.tipo === 'ferramenta' && p.id === b.id);
          if (parte) {
            parte.entrada = resumirEntrada(b.input);
            this.emitir({ tipo: 'ferramenta_entrada', id: b.id, entrada: parte.entrada });
          }
        }
      }
      return;
    }
    if (e.type === 'user' && e.message && Array.isArray(e.message.content)) {
      for (const b of e.message.content) {
        if (b.type !== 'tool_result') continue;
        const parte = this.partes.find(p => p.tipo === 'ferramenta' && p.id === b.tool_use_id);
        const resumo = resumirResultado(b.content);
        const ok = !b.is_error;
        if (parte) { parte.ok = ok; parte.resumo = resumo; parte.fim = Date.now(); }
        this.emitir({ tipo: 'ferramenta_fim', id: b.tool_use_id, ok, resumo });
      }
      return;
    }
    if (e.type === 'result') {
      this.sessionId = e.session_id || this.sessionId;
      this.resultado = {
        sucesso: e.subtype === 'success' && !e.is_error,
        subtipo: e.subtype, texto: typeof e.result === 'string' ? e.result : null,
        turnos: e.num_turns ?? null, duracaoMs: e.duration_ms ?? null,
        erroApi: e.api_error_status ?? null,
      };
      // sem nenhum texto no stream (ex.: CLI sem stream parcial): usa o resultado final
      if (!this.textoFinal() && this.resultado.texto && this.resultado.sucesso) this._texto(this.resultado.texto);
    }
  }
}

// Mensagem clara quando a CLI/assinatura não responde
function explicarFalha({ codigo, stderr, erroSpawn, estourou, cancelado, resultado, tempoLimiteMs }) {
  if (cancelado) return 'Cancelado pelo usuário.';
  if (estourou) return `O assistente passou do tempo-limite (${Math.round(tempoLimiteMs / 60000)} min) e foi interrompido. O que ele já criou continua salvo; peça para continuar.`;
  if (erroSpawn) return `Não consegui iniciar o Claude Code neste PC (${erroSpawn}). Confira se ele está instalado (CLAUDE_CLI_PATH).`;
  const texto = `${stderr || ''} ${resultado?.texto || ''}`;
  if (/not logged in|please run \/login|invalid api key|authentication|OAuth|401/i.test(texto)) {
    return 'O Claude Code deste PC não está logado na assinatura Claude Max (ou o login expirou). Peça ao administrador para abrir o Claude Code no PC e fazer o login.';
  }
  if (/usage limit|rate limit|limit reached|5-hour|weekly limit|429|overloaded/i.test(texto)) {
    return 'A cota da assinatura Claude Max está esgotada no momento (limite de uso). Tente de novo mais tarde.';
  }
  if (resultado && resultado.subtipo === 'error_max_turns') return 'O assistente atingiu o limite de passos desta mensagem. O que ele já fez está salvo; peça para continuar.';
  if (resultado && !resultado.sucesso) return `O Claude respondeu com erro (${resultado.subtipo || 'erro'}${resultado.erroApi ? `, ${resultado.erroApi}` : ''}).`;
  return `O Claude Code terminou sem resposta (código ${codigo ?? '?'})${stderr ? `: ${stderr.slice(0, 300)}` : ''}.`;
}

const sessaoNaoEncontrada = (stderr) => /No conversation found|session.*not found|não encontrad/i.test(String(stderr || ''));

// Login/assinatura sem gastar cota (`claude auth status`), guardado por 5 min
let cacheLogin = { em: 0, valor: null };
function statusLogin(caminhoCli, { cacheMs = 5 * 60 * 1000 } = {}) {
  if (Date.now() - cacheLogin.em < cacheMs && cacheLogin.valor) return Promise.resolve(cacheLogin.valor);
  return new Promise((resolve) => {
    if (!fs.existsSync(caminhoCli)) return resolve({ instalado: false, logado: false });
    execFile(caminhoCli, ['auth', 'status'], { env: ambienteFiltrado(), windowsHide: true, timeout: 20000 }, (erro, stdout) => {
      let valor;
      try {
        const j = JSON.parse(stdout);
        valor = { instalado: true, logado: !!j.loggedIn, assinatura: j.subscriptionType || null, metodo: j.authMethod || null };
      } catch {
        valor = { instalado: true, logado: false, erro: erro ? erro.message.slice(0, 200) : 'resposta inesperada' };
      }
      cacheLogin = { em: Date.now(), valor };
      resolve(valor);
    });
  });
}

module.exports = {
  montarArgs, executarProcesso, InterpretadorStream, explicarFalha, sessaoNaoEncontrada, ambienteFiltrado,
  pastaDeTrabalho, matarArvore, statusLogin,
};
