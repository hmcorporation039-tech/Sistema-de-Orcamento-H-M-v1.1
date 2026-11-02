// Alerta de sistema fora do ar: a decisão (quando avisar) e a consulta ao /health, sem rede nem e-mail.
const assert = require('assert');
const { avaliar, consultar, mensagem, FALHAS_PARA_ALERTAR } = require('../src/services/monitorSaude');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };
const t = (min) => new Date(Date.UTC(2026, 10, 2, 12, min));

(async () => {
  await caso('uma falha isolada não alerta; a terceira seguida alerta uma vez só', () => {
    let e = null; const acoes = [];
    for (let i = 0; i < 6; i++) { const r = avaliar(e, false, t(i * 5)); e = r.estado; acoes.push(r.acao); }
    assert.deepStrictEqual(acoes, [null, null, 'queda', null, null, null]);
    assert.strictEqual(FALHAS_PARA_ALERTAR, 3);
    assert.strictEqual(e.desde, t(0).toISOString(), 'a queda é contada desde a primeira falha');
  });

  await caso('voltou: avisa só se a queda tinha sido avisada; falha curta que se recupera fica calada', () => {
    let e = avaliar(avaliar(null, false, t(0)).estado, false, t(5)).estado; // 2 falhas, sem alerta
    const r1 = avaliar(e, true, t(10));
    assert.strictEqual(r1.acao, null);
    assert.deepStrictEqual([r1.estado.falhas, r1.estado.alertado], [0, false]);
    e = null; for (let i = 0; i < 3; i++) e = avaliar(e, false, t(i)).estado; // alertado
    const r2 = avaliar(e, true, t(20));
    assert.strictEqual(r2.acao, 'voltou');
    assert.strictEqual(avaliar(r2.estado, true, t(25)).acao, null, 'não repete o "voltou"');
  });

  await caso('estado antigo ou quebrado não derruba a decisão', () => {
    assert.strictEqual(avaliar({}, true, t(0)).acao, null);
    assert.strictEqual(avaliar('lixo', false, t(0)).estado.falhas, 1);
  });

  await caso('consultar: ok só com HTTP 200 e status ok; erro de rede, 503 e timeout viram falha com motivo', async () => {
    const resp = (status, corpo) => async () => ({ ok: status < 400, status, json: async () => corpo });
    assert.deepStrictEqual(await consultar('u', 50, resp(200, { status: 'ok', banco: 'ok' })), { ok: true });
    assert.deepStrictEqual(await consultar('u', 50, resp(503, { status: 'erro' })), { ok: false, motivo: 'HTTP 503' });
    assert.match((await consultar('u', 50, resp(200, { status: 'erro' }))).motivo, /status não é ok/);
    assert.match((await consultar('u', 50, async () => { throw new Error('ECONNREFUSED'); })).motivo, /ECONNREFUSED/);
    const lento = (u, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(Object.assign(new Error('x'), { name: 'AbortError' }))));
    assert.match((await consultar('u', 30, lento)).motivo, /sem resposta/);
  });

  await caso('mensagens: a de queda diz o que fazer e a de volta mostra desde quando', () => {
    const q = mensagem('queda', { desde: t(0).toISOString(), motivo: 'HTTP 503', url: 'http://x/health' });
    assert.match(q.assunto, /fora do ar/);
    assert.match(q.texto, /reiniciar-backend\.bat/);
    assert.match(q.texto, /HTTP 503/);
    assert.match(mensagem('voltou', { desde: t(0).toISOString(), url: 'http://x/health' }).assunto, /voltou/);
  });

  console.log(`monitorSaude: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
