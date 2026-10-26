// Registro uniforme das rotinas automáticas (services/rotinas.js) — com rotinas
// e banco FALSOS: não lê e-mail nem pastas de fornecedores, não grava no banco.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const { criarRotinas, proximosHorarios, msAteProximoHorario, rotinasAutomaticasLigadas, compactar } = require('../src/services/rotinas');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

// banco falso: guarda as linhas de rotinas_execucoes em memória
function bancoFalso() {
  const linhas = [];
  return {
    linhas,
    async query(sql, params = []) {
      if (/^INSERT INTO rotinas_execucoes/.test(sql)) {
        const l = { id: linhas.length + 1, chave: params[0], origem: params[1], usuario_id: params[2], status: 'em_andamento', iniciado_em: new Date(), terminado_em: null };
        linhas.push(l);
        return { rows: [{ id: l.id }] };
      }
      if (/^UPDATE rotinas_execucoes/.test(sql)) {
        const l = linhas.find(x => x.id === params[0]);
        Object.assign(l, { status: params[1], itens: params[2], resumo: params[3] ? JSON.parse(params[3]) : null, erro: params[4], terminado_em: new Date() });
        return { rows: [] };
      }
      if (/FROM rotinas_execucoes e/.test(sql)) {
        return { rows: [...linhas].reverse().filter(l => params[0].includes(l.chave)).map(l => ({ ...l, usuario_nome: l.usuario_id ? 'Admin Teste' : null })) };
      }
      return { rows: [] };
    },
  };
}

function rotinaFalsa(executar, extra = {}) {
  return { nome: 'Falsa', descricao: 'teste', atrasoSegundos: 0, configurada: () => true, executar, itens: r => r.processados, texto: r => `${r.processados} processado(s)`, ...extra };
}

const silencioso = { log() {}, warn() {}, error() {} };

caso('execução manual grava início e fim: status, itens, resumo e usuário', async () => {
  const db = bancoFalso();
  const r = criarRotinas({ db, log: silencioso, definicoes: { falsa: rotinaFalsa(async () => ({ processados: 3, avisos: [], arquivos: new Array(500).fill('x') })) } });
  const resumo = await r.executarRotina('falsa', { origem: 'manual', usuarioId: 7 });
  assert.strictEqual(resumo.processados, 3, 'devolve o resumo da rotina como antes');
  assert.strictEqual(db.linhas.length, 1);
  const l = db.linhas[0];
  assert.deepStrictEqual([l.chave, l.origem, l.usuario_id, l.status, l.itens], ['falsa', 'manual', 7, 'ok', 3]);
  assert.strictEqual(l.resumo.texto, '3 processado(s)');
  assert.ok(!('arquivos' in l.resumo.contagens), 'listas grandes não vão para o registro');
});

caso('avisos, rodada ignorada e erro viram status próprios', async () => {
  const db = bancoFalso();
  const r = criarRotinas({ db, log: silencioso, definicoes: {
    avisa: rotinaFalsa(async () => ({ processados: 0, avisos: ['Integração de e-mail não configurada'] })),
    ignora: rotinaFalsa(async () => ({ ignorado: true, avisos: ['"x" já está em execução em outra instância do sistema — rodada ignorada'] })),
    quebra: rotinaFalsa(async () => { throw new Error('IMAP recusou o login'); }),
  } });
  await r.executarRotina('avisa');
  await r.executarRotina('ignora', { origem: 'agendada' });
  await assert.rejects(r.executarRotina('quebra'), /IMAP recusou/, 'o erro continua chegando a quem chamou');
  assert.deepStrictEqual(db.linhas.map(l => [l.chave, l.status, l.origem]), [['avisa', 'avisos', 'manual'], ['ignora', 'ignorada', 'agendada'], ['quebra', 'erro', 'manual']]);
  assert.match(db.linhas[1].resumo.texto, /rodada ignorada/);
  assert.strictEqual(db.linhas[2].erro, 'IMAP recusou o login');
  assert.strictEqual(db.linhas[2].itens, null);
});

caso('duas chamadas ao mesmo tempo = uma execução e uma linha', async () => {
  const db = bancoFalso();
  let execucoes = 0;
  const r = criarRotinas({ db, log: silencioso, definicoes: { lenta: rotinaFalsa(async () => { execucoes++; await new Promise(res => setTimeout(res, 30)); return { processados: 1, avisos: [] }; }) } });
  const [a, b] = await Promise.all([r.executarRotina('lenta', { origem: 'agendada' }), r.executarRotina('lenta')]);
  assert.strictEqual(a, b);
  assert.strictEqual(execucoes, 1);
  assert.strictEqual(db.linhas.length, 1);
});

caso('banco fora do ar não impede a rotina', async () => {
  const db = { query: async () => { throw new Error('ECONNREFUSED'); } };
  const r = criarRotinas({ db, log: silencioso, definicoes: { falsa: rotinaFalsa(async () => ({ processados: 2, avisos: [] })) } });
  assert.strictEqual((await r.executarRotina('falsa')).processados, 2);
});

caso('rotina desconhecida → 404 (só as chaves definidas rodam)', () => {
  const r = criarRotinas({ db: bancoFalso(), log: silencioso, definicoes: { falsa: rotinaFalsa(async () => ({})) } });
  assert.throws(() => r.executarRotina('constructor'), e => e.status === 404);
  assert.throws(() => r.executarRotina('../x'), e => e.status === 404);
  assert.ok(r.existe('falsa') && !r.existe('toString'));
});

caso('agenda: respeita ROTINAS_AUTOMATICAS e só agenda rotina configurada', async () => {
  const antes = process.env.ROTINAS_AUTOMATICAS;
  const timers = [];
  const agendar = (fn, ms) => timers.push({ fn, ms });
  const defs = { boa: rotinaFalsa(async () => ({ processados: 1, avisos: [] })), semEmail: rotinaFalsa(async () => ({}), { configurada: () => false, motivoNaoConfigurada: 'e-mail não configurado' }) };
  try {
    process.env.ROTINAS_AUTOMATICAS = 'desligadas';
    assert.strictEqual(rotinasAutomaticasLigadas(), false);
    const r1 = criarRotinas({ db: bancoFalso(), log: silencioso, agendar, definicoes: defs });
    r1.agendarRotinas();
    assert.strictEqual(timers.length, 0, 'instância de teste não agenda nada');
    const s1 = await r1.statusRotinas();
    assert.strictEqual(s1.rotinasAutomaticas.ligadas, false);
    assert.ok(s1.rotinas.every(x => !x.ativa && /ROTINAS_AUTOMATICAS/.test(x.motivoInativa) && x.proximasExecucoes.length === 0));

    delete process.env.ROTINAS_AUTOMATICAS;
    const db = bancoFalso();
    const r2 = criarRotinas({ db, log: silencioso, agendar, definicoes: defs });
    r2.agendarRotinas();
    assert.strictEqual(timers.length, 1, 'só a configurada');
    await timers[0].fn(); // dispara o horário: roda pelo mesmo registro e reagenda
    assert.strictEqual(timers.length, 2);
    assert.deepStrictEqual(db.linhas.map(l => [l.chave, l.origem, l.status]), [['boa', 'agendada', 'ok']]);
    const s2 = await r2.statusRotinas();
    const boa = s2.rotinas.find(x => x.chave === 'boa');
    assert.ok(boa.ativa && boa.proximasExecucoes.length === 2);
    assert.strictEqual(boa.ultimaExecucao.status, 'ok');
    assert.strictEqual(boa.ultimaExecucao.itens, 1);
    assert.strictEqual(boa.ultimaExecucao.origem, 'agendada');
    const sem = s2.rotinas.find(x => x.chave === 'semEmail');
    assert.ok(!sem.ativa && sem.motivoInativa === 'e-mail não configurado');
  } finally {
    if (antes === undefined) delete process.env.ROTINAS_AUTOMATICAS; else process.env.ROTINAS_AUTOMATICAS = antes;
  }
});

caso('próximos horários 06:00 e 18:00 (com o atraso de cada rotina)', () => {
  const agora = new Date(2026, 9, 25, 17, 59, 0);
  const [a, b] = proximosHorarios(agora, 30, 2);
  assert.deepStrictEqual([a.getHours(), a.getMinutes(), a.getSeconds(), a.getDate()], [18, 0, 30, 25]);
  assert.deepStrictEqual([b.getHours(), b.getDate()], [6, 26]);
  // a menos de 1 s do horário, pula para o próximo (não roda duas vezes)
  const quase = new Date(2026, 9, 25, 5, 59, 59, 500);
  assert.strictEqual(proximosHorarios(quase, 0, 1)[0].getHours(), 18);
  assert.strictEqual(msAteProximoHorario(quase, 0), 12 * 3600000 + 500);
  assert.strictEqual(msAteProximoHorario(new Date(2026, 9, 25, 5, 0, 0), 15), 3600000 + 15000);
});

caso('resumo compacto: contagens, até 20 avisos, sem listas', () => {
  const c = compactar({ texto: r => `${r.n}` }, { n: 2, ok: true, avisos: new Array(30).fill('a'), arquivos: [1, 2], classificacao: { classificadosIA: 1 } });
  assert.deepStrictEqual(c.contagens, { n: 2, ok: true });
  assert.strictEqual(c.avisos.length, 20);
  assert.strictEqual(c.totalAvisos, 30);
  assert.strictEqual(c.texto, '2');
  assert.deepStrictEqual(c.classificacao, { classificadosIA: 1 });
});

caso('rotinas reais: as três de sempre, sem emissão de nota nem cobrança', () => {
  const r = require('../src/services/rotinas');
  assert.deepStrictEqual(r.chaves(), ['notas-email', 'pix-email', 'fornecedores-pastas']);
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
  }
  console.log(`rotinas: ${ok}/${casos.length} casos ok`);
})();
