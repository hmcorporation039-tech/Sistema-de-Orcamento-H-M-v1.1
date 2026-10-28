// Cancelamento de verdade na cadeia de IA (utils/ia.js e geminiClient.js —
// revisão de 27/10/2026): no tempo-limite o provedor que ficou para trás é
// ABORTADO (antes a cadeia só parava de esperar e o Gemini seguia gastando cota),
// e o `signal` de quem chamou cancela a cadeia inteira. Só provedores FALSOS e
// fetch falso — nenhuma chamada real de IA, nenhuma cota gasta.
// Rodar: node testes/iaCancelamento.test.js (pasta backend).
const assert = require('assert');

process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'chave-falsa-do-teste';
const ia = require('../src/utils/ia');
const gemini = require('../src/utils/geminiClient');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

// provedor que só termina quando o sinal recebido é abortado
function pendurado(id, registro) {
  return {
    id, rotulo: id.toUpperCase(), disponivel: () => true, timeoutPadrao: () => 1,
    executar: ({ signal }) => new Promise((_, rej) => {
      registro.recebeuSinal = !!signal;
      signal?.addEventListener('abort', () => { registro.abortado = true; rej(new Error('abortado')); }, { once: true });
    }),
  };
}
const responde = (id, json, registro = {}) => ({ id, rotulo: id.toUpperCase(), disponivel: () => true, async executar() { registro.chamado = (registro.chamado || 0) + 1; return json; } });
const cadeia = (provs) => ia.criarIA({ provedores: Object.fromEntries(provs.map(p => [p.id, p])), ordem: () => provs.map(p => p.id), registrarLog: false });

caso('tempo-limite: o provedor atrasado recebe abort e o próximo responde', async () => {
  const reg = {};
  const c = cadeia([pendurado('a', reg), responde('b', { ok: true })]);
  const r = await c.perguntarJSON('p', { timeoutMs: 20 });
  assert.strictEqual(r.provedor, 'b');
  assert.strictEqual(reg.recebeuSinal, true);
  assert.strictEqual(reg.abortado, true, 'o provedor atrasado não foi cancelado');
});

caso('signal de quem chamou cancela a cadeia (não tenta o próximo provedor)', async () => {
  const reg = {}, regB = {};
  const c = cadeia([pendurado('a', reg), responde('b', { ok: true }, regB)]);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(new Error('usuário saiu da tela')), 30);
  const inicio = Date.now();
  await assert.rejects(c.perguntarJSON('p', { timeoutMs: 60000, signal: ctrl.signal }), e => e.cancelado === true);
  assert.ok(Date.now() - inicio < 3000);
  assert.strictEqual(reg.abortado, true);
  assert.strictEqual(regB.chamado, undefined, 'tentou o próximo provedor depois do cancelamento');
  // sinal já abortado: nem começa
  await assert.rejects(c.perguntarJSON('p', { signal: AbortSignal.abort() }), e => e.cancelado === true);
});

caso('provedor que ignora o sinal: a cadeia não fica presa nele ao cancelar', async () => {
  const surdo = { id: 's', rotulo: 'S', disponivel: () => true, executar: () => new Promise(() => {}) };
  const c = cadeia([surdo]);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 20);
  await assert.rejects(c.perguntarJSON('p', { timeoutMs: 60000, signal: ctrl.signal }), e => e.cancelado === true);
});

caso('Gemini: abort interrompe o fetch em andamento e não tenta outro modelo nem de novo', async () => {
  const fetchOriginal = global.fetch;
  let chamadas = 0;
  global.fetch = (url, opcoes) => new Promise((_, rej) => {
    chamadas++;
    opcoes.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
  });
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 30);
    const inicio = Date.now();
    await assert.rejects(gemini.chamarGemini({ prompt: 'p', busca: true, tentativas: 3, signal: ctrl.signal }), e => e.cancelado === true);
    assert.ok(Date.now() - inicio < 3000);
    assert.strictEqual(chamadas, 1, `${chamadas} chamadas ao Gemini depois do cancelamento`);
  } finally {
    global.fetch = fetchOriginal;
  }
});

caso('Gemini: espera entre tentativas (503) também é interrompida', async () => {
  const fetchOriginal = global.fetch;
  let chamadas = 0;
  global.fetch = async () => { chamadas++; return { status: 503, json: async () => ({ error: { status: 'UNAVAILABLE', message: 'sobrecarregado' } }) }; };
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 50); // a 1ª espera seria de 3 s
    const inicio = Date.now();
    await assert.rejects(gemini.chamarGemini({ prompt: 'p', tentativas: 3, signal: ctrl.signal }), e => e.cancelado === true);
    assert.ok(Date.now() - inicio < 2000, `${Date.now() - inicio} ms`);
    assert.strictEqual(chamadas, 1);
  } finally {
    global.fetch = fetchOriginal;
  }
});

caso('provedores reais repassam o sinal (Gemini e API da Anthropic)', async () => {
  // Gemini pelo provedor da cadeia, com fetch falso: o sinal chega até o fetch
  const fetchOriginal = global.fetch;
  let sinalNoFetch = null;
  global.fetch = (url, opcoes) => { sinalNoFetch = opcoes.signal; return new Promise((_, rej) => opcoes.signal.addEventListener('abort', () => rej(Object.assign(new Error('x'), { name: 'AbortError' })), { once: true })); };
  try {
    const ctrl = new AbortController();
    const p = ia.PROVEDORES.gemini.executar({ prompt: 'p', web: true, signal: ctrl.signal });
    await new Promise(r => setTimeout(r, 10));
    ctrl.abort();
    await assert.rejects(p, e => e.cancelado === true);
    assert.ok(sinalNoFetch);
  } finally {
    global.fetch = fetchOriginal;
  }
  // CLI do Claude Max: sinal já abortado não abre processo
  await assert.rejects(ia.executarClaudeMax('p', null, { signal: AbortSignal.abort() }), e => e.cancelado === true);
  // a API da Anthropic recebe o signal nas opções da requisição
  const fonte = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'utils', 'ia.js'), 'utf8');
  assert.match(fonte, /signal \? \{ signal \} : \{\}/);
});

caso('pesquisa de preço pela CLI: só WebSearch (WebFetch desligado, salvo IA_CLI_WEBFETCH=ligado)', () => {
  const w = ia.argsClaudeMax('p', false, { web: true });
  assert.ok(!w.some(x => /WebFetch/.test(x)));
  process.env.IA_CLI_WEBFETCH = 'ligado';
  try {
    const l = ia.argsClaudeMax('p', false, { web: true });
    assert.strictEqual(l[l.indexOf('--tools') + 1], 'WebSearch,WebFetch');
    assert.ok(l.includes('WebFetch(domain:localhost)') && l.includes('WebFetch(domain:127.0.0.1)'));
    assert.ok(l.indexOf('--disallowedTools') < l.indexOf('--allowedTools'));
  } finally {
    delete process.env.IA_CLI_WEBFETCH;
  }
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`ia (cancelamento): ${ok}/${casos.length} casos ok`);
})();
