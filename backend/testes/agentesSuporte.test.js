// Suporte Claude Max dos agentes próprios — testes SEM banco e SEM gastar cota (Claude Code FALSO que emite um
// stream-json montado aqui; banco falso em memória). Confere:
//   - argumentos: modo restrito, --strict-mcp-config, só as ferramentas de LEITURA (e, no consultor, só
//     WebSearch/WebFetch a mais — nenhuma Bash/Read/Write/Edit, nenhuma que grave);
//   - o init: lista de ferramentas EXATAMENTE a esperada; a mais ou a menos → suporte recusado;
//   - a resposta vira SUGESTÃO PENDENTE (fonte claude-max), nunca regra direto; o uso é registrado (indicador);
//   - sem login no Claude Max, desligado ou sem token: falha limpa (o agente segue com a pendência);
//   - o pacote de contexto leva o que o agente fez, a base de conhecimento, as ferramentas e a pergunta.
// Opcional (gasta quase nada, só o init): AGENTES_TESTE_CLI_REAL=1 confere no Claude Code real deste PC que
// --restricted + --tools WebSearch,WebFetch é aceito e o init traz só essas duas.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SUP = require('../src/services/agentes/suporteClaude');
const F = require('../src/services/assistente/ferramentas');
const CLI = require('../src/services/assistente/claudeCli');

const FIX = path.join(__dirname, 'fixtures', 'assistente');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-suporte-teste-'));
let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

function roteiro(nome, ferramentas, texto = '**Resposta:** use a disciplina pelo carimbo.\n**Regra sugerida:** nenhuma.\n**Fontes:** base de conhecimento.') {
  const linhas = [
    { type: 'system', subtype: 'init', tools: ferramentas, mcp_servers: [{ name: 'hm', status: 'connected' }], model: 'claude-sonnet-5', permissionMode: 'dontAsk', session_id: '__SESSAO__' },
    { type: 'assistant', message: { id: 'm1', role: 'assistant', content: [{ type: 'text', text: texto }] }, session_id: '__SESSAO__' },
    { type: 'result', subtype: 'success', is_error: false, result: texto, num_turns: 1, session_id: '__SESSAO__' },
  ];
  const p = path.join(tmp, nome);
  fs.writeFileSync(p, linhas.map(l => JSON.stringify(l)).join('\n'));
  return p;
}

function bancoFalso() {
  const chamadas = [];
  return {
    chamadas,
    async query(sql, params) {
      chamadas.push({ sql: String(sql).replace(/\s+/g, ' '), params });
      if (/INSERT INTO agentes_sugestoes/.test(sql)) return { rows: [{ id: 42 }] };
      return { rows: [] };
    },
  };
}

function preparar(arquivoRoteiro, { logado = true, config = {} } = {}) {
  const registro = path.join(tmp, `args-${Math.random().toString(36).slice(2)}.jsonl`);
  SUP.configurarParaTeste({
    comando: process.execPath, prefixo: [path.join(FIX, 'cli-falso.js'), arquivoRoteiro, registro],
    statusLogin: async () => ({ instalado: true, logado }), config: { ligado: true, consultor: true, tempoLimiteMs: 20000, ...config },
  });
  return registro;
}
const argsGravados = (registro) => JSON.parse(fs.readFileSync(registro, 'utf8').trim().split('\n').pop());
const valorDe = (a, nome) => a[a.indexOf(nome) + 1];

caso('argumentos: suporte só com as de leitura; consultor só + WebSearch/WebFetch', () => {
  const base = { pergunta: 'p', mcpConfig: 'C:\\tmp\\mcp.json', modelo: 'sonnet', maxTurnos: 12, sistema: 's' };
  const a = SUP.montarArgsSuporte(base);
  for (const flag of ['--restricted', '--strict-mcp-config', '--disable-slash-commands', '--exclude-dynamic-system-prompt-sections']) assert.ok(a.includes(flag), flag);
  assert.strictEqual(valorDe(a, '--tools'), '');
  assert.strictEqual(valorDe(a, '--permission-mode'), 'dontAsk');
  const liberadas = a.slice(a.indexOf('--allowedTools') + 1, a.indexOf('--max-turns'));
  assert.deepStrictEqual(liberadas, F.FERRAMENTAS_LEITURA.map(n => `mcp__hm__${n}`));
  const c = SUP.montarArgsSuporte({ ...base, consultor: true });
  assert.strictEqual(valorDe(c, '--tools'), 'WebSearch,WebFetch');
  const lc = c.slice(c.indexOf('--allowedTools') + 1, c.indexOf('--max-turns'));
  assert.deepStrictEqual(lc, [...F.FERRAMENTAS_LEITURA.map(n => `mcp__hm__${n}`), 'WebSearch', 'WebFetch']);
  for (const lista of [liberadas, lc]) {
    assert.ok(!lista.some(t => /Bash|PowerShell|Read$|Write|Edit|NotebookEdit/.test(t)), 'ferramenta embutida perigosa');
    for (const grava of ['propor_acao', 'gerar_orcamento', 'editar_rascunho', 'analisar_arquivo', 'executar_agente', 'pesquisar_preco_mercado', 'atualizar_dados_projeto', 'inserir_kit', 'criar_projeto_disciplina', 'enviar_arquitetura', 'criar_rascunho_proposta', 'salvar_pesquisa_mercado']) {
      assert.ok(!lista.includes(`mcp__hm__${grava}`), grava);
    }
  }
  assert.ok(!a.includes('--dangerously-skip-permissions') && !a.includes('bypassPermissions'));
});

caso('init: só aceita a lista exata', () => {
  const esperada = F.ferramentasDoSuporte({ consultor: true });
  assert.ok(SUP.conferirFerramentasDoInit(esperada, { consultor: true }).ok);
  assert.ok(!SUP.conferirFerramentasDoInit([...esperada, 'Bash'], { consultor: true }).ok);
  assert.ok(!SUP.conferirFerramentasDoInit(esperada, { consultor: false }).ok, 'web no modo suporte = recusa');
  assert.ok(!SUP.conferirFerramentasDoInit(esperada.slice(1), { consultor: true }).ok, 'faltando ferramenta (MCP não conectou) = recusa');
});

caso('suporte: responde e a resposta vira sugestão PENDENTE (fonte claude-max) + uso registrado', async () => {
  const reg = preparar(roteiro('ok.jsonl', F.ferramentasDoSuporte({ consultor: false })));
  const db = bancoFalso();
  const r = await SUP.pedirSuporte({ agente: 'projeto_disciplina', motivo: 'dado_faltando', pergunta: 'Qual a disciplina do arquivo sintético?', parcial: '- passo análise: parado', disciplina: 'eletrica', token: 'x.y.z', db, usuarioId: 1, execucaoId: 2, conversaId: 3 });
  assert.ok(r.ok, r.motivoFalha);
  assert.strictEqual(r.sugestao_id, 42);
  assert.strictEqual(r.modo, 'suporte');
  assert.match(r.texto, /Regra sugerida/);
  const ins = db.chamadas.find(c => /INSERT INTO agentes_sugestoes/.test(c.sql));
  assert.ok(ins && /'conhecimento', 'claude-max'/.test(ins.sql), 'tipo conhecimento, fonte claude-max');
  assert.ok(!/'aprovada'/.test(ins.sql), 'nunca nasce aprovada');
  const uso = db.chamadas.find(c => /INSERT INTO agentes_suporte/.test(c.sql));
  assert.strictEqual(uso.params[3], true);
  // pacote de contexto: o que fez, base de conhecimento, ferramentas e a pergunta exata
  const args = argsGravados(reg);
  const msg = args[args.indexOf('-p') + 1];
  for (const parte of ['[O QUE O AGENTE JÁ FEZ', '- passo análise: parado', '[BASE DE CONHECIMENTO', '[FERRAMENTAS DO SISTEMA', 'consultar_conhecimento', '[PERGUNTA EXATA]', 'Qual a disciplina do arquivo sintético?']) assert.ok(msg.includes(parte), parte);
  // o MCP do suporte sobe só com as de leitura (o --mcp-config temporário é apagado no fim: confere pela fonte)
  assert.ok(!fs.existsSync(valorDe(args, '--mcp-config')), 'config temporária apagada');
  const fonte = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'agentes', 'suporteClaude.js'), 'utf8');
  assert.match(fonte, /ASSISTENTE_SOMENTE_LEITURA: '1'/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', 'mcp', 'assistenteMcp.mjs'), 'utf8'), /somenteLeitura = process\.env\.ASSISTENTE_SOMENTE_LEITURA === '1'/);
});

caso('consultor: aceita WebSearch/WebFetch; ferramenta a mais no init é recusada por segurança', async () => {
  preparar(roteiro('consultor.jsonl', F.ferramentasDoSuporte({ consultor: true })));
  const r = await SUP.pedirSuporte({ origem: 'consultor', motivo: 'pesquisa', pergunta: 'Pesquise a norma sintética', modo: 'consultor', token: 't', db: bancoFalso() });
  assert.ok(r.ok, r.motivoFalha);
  assert.strictEqual(r.modo, 'consultor');
  preparar(roteiro('a-mais.jsonl', [...F.ferramentasDoSuporte({ consultor: true }), 'mcp__hm__gerar_orcamento']));
  const db = bancoFalso();
  const r2 = await SUP.pedirSuporte({ origem: 'consultor', motivo: 'pesquisa', pergunta: 'x', modo: 'consultor', token: 't', db });
  assert.ok(!r2.ok);
  assert.match(r2.motivoFalha, /recusado por segurança.*gerar_orcamento/);
  assert.ok(!db.chamadas.some(c => /INSERT INTO agentes_sugestoes/.test(c.sql)), 'recusado não vira sugestão');
  // consultor desligado: cai no modo suporte (sem web)
  preparar(roteiro('so-leitura.jsonl', F.ferramentasDoSuporte({ consultor: false })), { config: { consultor: false } });
  const r3 = await SUP.pedirSuporte({ origem: 'consultor', motivo: 'pesquisa', pergunta: 'x', modo: 'consultor', token: 't', db: bancoFalso() });
  assert.ok(r3.ok);
  assert.strictEqual(r3.modo, 'suporte');
});

caso('sem Claude Max (desligado, sem login, sem token): falha limpa, sem quebrar', async () => {
  preparar(roteiro('x.jsonl', []), { config: { ligado: false } });
  const a = await SUP.pedirSuporte({ pergunta: 'x', token: 't', db: bancoFalso() });
  assert.ok(!a.ok && /desligado/.test(a.motivoFalha));
  preparar(roteiro('x.jsonl', []), { logado: false });
  const b = await SUP.pedirSuporte({ pergunta: 'x', token: 't', db: bancoFalso() });
  assert.ok(!b.ok && /não está logado/.test(b.motivoFalha));
  preparar(roteiro('x.jsonl', []));
  const c = await SUP.pedirSuporte({ pergunta: 'x', token: null, db: bancoFalso() });
  assert.ok(!c.ok);
});

caso('configuração: chave liga/desliga, tempo e turnos', () => {
  const c = SUP.config({ AGENTES_SUPORTE_CLAUDE: 'desligado', AGENTES_SUPORTE_TEMPO_LIMITE_MIN: '2', AGENTES_SUPORTE_MAX_TURNOS: '5' });
  assert.strictEqual(c.ligado, false);
  assert.strictEqual(c.tempoLimiteMs, 120000);
  assert.strictEqual(c.maxTurnos, 5);
  assert.strictEqual(SUP.config({}).ligado, true);
  assert.strictEqual(SUP.config({ AGENTES_SUPORTE_CONSULTOR: 'desligado' }).consultor, false);
});

caso('opcional: Claude Code real aceita --restricted com WebSearch/WebFetch (AGENTES_TESTE_CLI_REAL=1)', async () => {
  if (process.env.AGENTES_TESTE_CLI_REAL !== '1') { console.log('     (pulado: defina AGENTES_TESTE_CLI_REAL=1 para conferir no Claude Code real — só o init, sem resposta)'); return; }
  const cfg = SUP.config();
  const mcp = path.join(tmp, 'mcp-vazio.json');
  fs.writeFileSync(mcp, JSON.stringify({ mcpServers: {} }));
  const args = ['-p', 'OK', '--output-format', 'stream-json', '--verbose', '--model', 'haiku', '--restricted', '--strict-mcp-config', '--mcp-config', mcp,
    '--disable-slash-commands', '--tools', 'WebSearch,WebFetch', '--permission-mode', 'dontAsk', '--allowedTools', 'WebSearch', 'WebFetch', '--max-turns', '1'];
  const abortar = new AbortController();
  let tools = null;
  await CLI.executarProcesso({ comando: cfg.caminhoCli, args, cwd: CLI.pastaDeTrabalho(), env: CLI.ambienteFiltrado(), signal: abortar.signal, tempoLimiteMs: 60000,
    aoEvento: (e) => { if (e.type === 'system' && e.subtype === 'init') { tools = e.tools; abortar.abort(); } } });
  assert.deepStrictEqual((tools || []).slice().sort(), ['WebFetch', 'WebSearch']);
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  SUP.configurarParaTeste({});
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`agentesSuporte: ${ok}/${casos.length} casos ok`);
  process.exit(process.exitCode || 0);
})();
