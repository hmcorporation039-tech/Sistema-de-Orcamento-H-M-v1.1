// Resumo de erros do sistema: agrupamento por assinatura, aviso só do que é novo e e-mail que não sai
// quando não há erro. A parte do banco só roda em hm_orcamentos_v2.
const assert = require('assert');
const e = require('../src/services/errosSistema');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (err) { err.message = nome + ': ' + err.message; throw err; } };

(async () => {
  await caso('a rota perde números, UUID e query string', () => {
    assert.strictEqual(e.normalizarRota('/api/obras/123/itens/45?x=1'), '/api/obras/:id/itens/:id');
    assert.strictEqual(e.normalizarRota('/api/propostas/0b2f6c1e-1a2b-4c3d-8e9f-0123456789ab/pdf'), '/api/propostas/:id/pdf');
    assert.strictEqual(e.normalizarRota('/api/v2/relatorios'), '/api/v2/relatorios');
  });

  await caso('mesma falha em registros diferentes tem a mesma assinatura; rota ou erro diferente, não', () => {
    const a = e.assinar('GET', '/api/obras/:id', 'coluna "x" não existe (linha 10)');
    assert.strictEqual(a, e.assinar('get', '/api/obras/:id', 'coluna "x" não existe (linha 99)'));
    assert.notStrictEqual(a, e.assinar('POST', '/api/obras/:id', 'coluna "x" não existe (linha 10)'));
    assert.notStrictEqual(a, e.assinar('GET', '/api/clientes/:id', 'coluna "x" não existe (linha 10)'));
    assert.notStrictEqual(a, e.assinar('GET', '/api/obras/:id', 'outra coisa'));
  });

  await caso('mensagem do erro: só a primeira linha, cortada; sem mensagem não quebra', () => {
    assert.strictEqual(e.mensagemDoErro(new Error('linha 1\nlinha 2')), 'linha 1');
    assert.strictEqual(e.mensagemDoErro(new Error('x'.repeat(900))).length, 500);
    assert.strictEqual(e.mensagemDoErro(null), 'erro sem mensagem');
  });

  await caso('e-mail: conta ocorrências novas, marca o que já tinha avisado e limita a lista', () => {
    const itens = Array.from({ length: 20 }, (_, i) => ({ metodo: 'GET', rota: `/api/r${i}`, mensagem: `falha ${i}`, ocorrencias: i === 0 ? 5 : 1, ocorrencias_avisadas: i === 0 ? 2 : 0, ultimo_em: '2026-11-02T15:00:00Z' }));
    const m = e.mensagemEmail(itens);
    assert.match(m.assunto, /22 erros .*20 tipos/);
    assert.match(m.texto, /3 vezes/);
    assert.match(m.texto, /já tinha avisado antes/);
    assert.match(m.texto, /e mais 5 tipo/);
    assert.ok(!m.texto.includes('/api/r19'), 'passou do limite do e-mail');
  });

  await caso('registrar nunca lança, mesmo com o banco fora', async () => {
    const quebrado = { query: async () => { throw new Error('banco fora'); } };
    const aviso = console.warn; console.warn = () => {};
    try { await e.registrar({ method: 'GET', originalUrl: '/api/x' }, new Error('boom'), quebrado); } finally { console.warn = aviso; }
  });

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`errosSistema: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const limpar = () => pool.query("DELETE FROM erros_sistema WHERE rota LIKE '/zz-erros%'").catch(() => {});
    try {
      await require('../src/models/migracoes/2.0-33-erros-sistema')(pool);
      await require('../src/models/migracoes/2.0-33-erros-sistema')(pool);  // idempotente
      await limpar();
      const req = (id) => ({ method: 'GET', originalUrl: `/zz-erros/${id}/itens?q=1` });
      const meus = async () => (await e.pendentes(pool)).filter(p => p.rota.startsWith('/zz-erros'));

      await caso('banco: o mesmo erro em ids diferentes vira uma linha com a contagem', async () => {
        await e.registrar(req(1), new Error('falhou 10'), pool);
        await e.registrar(req(2), new Error('falhou 20'), pool);
        await e.registrar(req(3), new Error('falhou 30'), pool);
        await e.registrar({ method: 'POST', originalUrl: '/zz-erros/1' }, new Error('outro'), pool);
        const p = await meus();
        assert.strictEqual(p.length, 2);
        assert.strictEqual(p[0].ocorrencias, 3);
        assert.strictEqual(p[0].rota, '/zz-erros/:id/itens');
      });

      await caso('banco: a rotina só marca como avisado se o e-mail saiu; depois avisa só o novo', async () => {
        const falha = await e.executarRotina({ db: pool, destino: 'a@b.c', enviar: async () => { throw new Error('sem rede'); } });
        assert.match(falha.avisos[0], /sem rede/);
        assert.strictEqual((await meus()).length, 2, 'e-mail falhou: continua pendente');

        const enviados = [];
        const r = await e.executarRotina({ db: pool, destino: 'a@b.c', enviar: async (m) => enviados.push(m) });
        assert.strictEqual(enviados.length, 1);
        assert.ok(enviados[0].text.includes('/zz-erros/:id/itens'));
        assert.ok(r.tipos >= 2);
        assert.strictEqual((await meus()).length, 0, 'avisado: nada pendente');

        const outra = [];
        await e.executarRotina({ db: pool, destino: 'a@b.c', enviar: async (m) => outra.push(m) });
        assert.ok(!outra.some(m => m.text.includes('/zz-erros')), 'sem erro novo não repete o aviso');

        await e.registrar(req(9), new Error('falhou 99'), pool);
        const p = await meus();
        assert.strictEqual(p.length, 1);
        assert.strictEqual(p[0].ocorrencias - p[0].ocorrencias_avisadas, 1, 'só a ocorrência nova');
      });

      await caso('banco: sem destino não envia e avisa que falta o e-mail', async () => {
        const r = await e.executarRotina({ db: pool, destino: '', enviar: async () => { throw new Error('não devia enviar'); } });
        assert.match(r.avisos[0], /ALERTA_EMAIL/);
      });
    } finally {
      await limpar();
      await pool.end();
    }
  }

  console.log(`errosSistema: ok (${ok} verificações)`);
})().catch(err => { console.error(err); process.exit(1); });
