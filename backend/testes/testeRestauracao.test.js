// Teste de restauração do backup: a decisão (contagens, escolha do dump, atraso, mensagens) e o fluxo com Postgres de mentira.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const t = require('../src/services/testeRestauracao');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };

const vivo = { usuarios: 5, clientes: 120, materiais: 900, propostas: 60, proposta_itens: 2000, notas_fiscais: 40, logs: 5000 };

(async () => {
  await caso('backup inteiro: ok; tabela criada depois vira só observação', () => {
    const { logs, ...resto } = vivo;
    const r = t.avaliarContagens({ ...resto, logs: 4900 }, { ...vivo, nova: 3 });
    assert.strictEqual(r.ok, true);
    assert.deepStrictEqual(r.avisos, ['nova foi criada depois deste backup']);
  });

  await caso('uma noite de uso (poucas linhas a mais no banco em uso) não reprova', () => {
    const r = t.avaliarContagens({ ...vivo, propostas: 58, proposta_itens: 1950 }, vivo);
    assert.strictEqual(r.ok, true);
  });

  await caso('tabela essencial que voltou pela metade ou sumiu reprova e diz qual', () => {
    const r = t.avaliarContagens({ ...vivo, propostas: 20 }, vivo);
    assert.strictEqual(r.ok, false);
    assert.match(r.problemas[0], /propostas: o backup tem 20 linhas e o banco em uso 60/);
    const { materiais, ...semMateriais } = vivo;
    const r2 = t.avaliarContagens(semMateriais, vivo);
    assert.match(r2.problemas.join(), /a tabela materiais não veio no backup/);
  });

  await caso('tabela pequena (abaixo do mínimo) não entra na régua; banco restaurado vazio reprova', () => {
    assert.strictEqual(t.avaliarContagens({ ...vivo, usuarios: 2 }, vivo).ok, true, '5 usuários no vivo, 2 no backup: abaixo do mínimo de 10');
    const r = t.avaliarContagens({}, vivo);
    assert.strictEqual(r.ok, false);
    assert.match(r.problemas[0], /nenhuma tabela/);
  });

  await caso('escolherDump prefere a cópia fora do prédio e cai para a local; sem nenhuma, devolve null', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'rest-'));
    const local = path.join(base, 'local'); const externo = path.join(base, 'externo');
    fs.mkdirSync(local); fs.mkdirSync(externo);
    assert.strictEqual(t.escolherDump({ banco: 'hm', pastaLocal: local, pastaExterna: externo }), null);
    fs.writeFileSync(path.join(local, 'hm_2026-11-02_02-00.dump'), 'x');
    assert.strictEqual(t.escolherDump({ banco: 'hm', pastaLocal: local, pastaExterna: externo }).origem, 'local');
    fs.writeFileSync(path.join(externo, 'hm_2026-11-01_02-00.dump'), 'x');
    const d = t.escolherDump({ banco: 'hm', pastaLocal: local, pastaExterna: externo });
    assert.strictEqual(d.origem, 'fora do prédio');
    assert.strictEqual(d.nome, 'hm_2026-11-01_02-00.dump');
    assert.strictEqual(t.escolherDump({ banco: 'hm', pastaLocal: local, pastaExterna: null }).origem, 'local');
    fs.rmSync(base, { recursive: true, force: true });
  });

  await caso('atrasado: sem teste ou com mais de 40 dias', () => {
    const agora = new Date('2026-12-10T12:00:00Z');
    assert.strictEqual(t.atrasado(null, agora), true);
    assert.strictEqual(t.atrasado({ em: '2026-11-01T06:30:00Z' }, agora), false);
    assert.strictEqual(t.atrasado({ em: '2026-10-20T06:30:00Z' }, agora), true);
  });

  await caso('resultado grava e lê; arquivo estragado vira null', () => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rest-')), 'r.json');
    assert.strictEqual(t.lerResultado(f), null);
    t.gravarResultado({ ok: true, em: 'x' }, f);
    assert.strictEqual(t.lerResultado(f).ok, true);
    fs.writeFileSync(f, '{lixo');
    assert.strictEqual(t.lerResultado(f), null);
  });

  await caso('mensagens: a de falha diz o que fazer; a de sucesso diz o que foi conferido', () => {
    const base = { em: '2026-11-01T06:30:00Z', arquivo: 'hm_2026-11-01_02-00.dump', origem: 'fora do prédio', tabelas: 80, duracaoS: 12, avisos: [] };
    assert.match(t.mensagem({ ...base, ok: true }).texto, /80 tabelas restauradas/);
    const f = t.mensagem({ ...base, ok: false, problemas: ['o pg_restore falhou'] });
    assert.match(f.assunto, /NÃO restaurou/);
    assert.match(f.texto, /backup-db\.ps1/);
    assert.match(f.texto, /o pg_restore falhou/);
  });

  await caso('testar: nunca mexe se o banco em uso tem o nome do banco de teste, nem sem backup', async () => {
    let conexoes = 0;
    const conectar = async () => { conexoes++; throw new Error('não era para conectar'); };
    const a = await t.testar({ env: { DB_NAME: t.BANCO_TESTE }, dump: { arquivo: 'x', nome: 'x', origem: 'local' }, conectar });
    assert.strictEqual(a.ok, false);
    const b = await t.testar({ env: { DB_NAME: 'hm' }, dump: null, conectar });
    assert.strictEqual(b.ok, false);
    assert.match(b.problemas[0], /nenhum backup/);
    assert.strictEqual(conexoes, 0);
  });

  await caso('testar: se não dá para criar o banco temporário, falha com o motivo e não lança', async () => {
    const consultas = [];
    const conectar = async () => ({ query: async (q) => { consultas.push(q); if (/CREATE DATABASE/.test(q)) throw new Error('permissão negada'); return { rows: [] }; }, end: async () => {} });
    const r = await t.testar({ env: { DB_NAME: 'hm' }, dump: { arquivo: 'x', nome: 'x', origem: 'local' }, conectar });
    assert.strictEqual(r.ok, false);
    assert.match(r.problemas[0], /permissão negada/);
    assert.ok(!consultas.some(q => /DROP DATABASE.*hm\b(?!_)/.test(q) && !q.includes(t.BANCO_TESTE)), 'só o banco de teste é apagado');
  });

  console.log(`testeRestauracao: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
