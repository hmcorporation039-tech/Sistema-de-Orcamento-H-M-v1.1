// Verificação de pré-deploy (scripts/pre-deploy.js): lista os testes sozinha, pega versão esquecida,
// migração repetida ou faltando e distingue teste que passa, que falha e que trava.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const p = require('../scripts/pre-deploy');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };
const pasta = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hm-predeploy-'));
const grava = (arq, texto) => { fs.mkdirSync(path.dirname(arq), { recursive: true }); fs.writeFileSync(arq, texto); };

(async () => {
  await caso('lista todos os *.test.js da pasta, em ordem, e nada mais', () => {
    const d = pasta();
    grava(path.join(d, 'b.test.js'), ''); grava(path.join(d, 'a.test.js'), ''); grava(path.join(d, 'apoio.js'), '');
    assert.deepStrictEqual(p.listarTestes(d), ['a.test.js', 'b.test.js']);
  });

  await caso('nenhum teste da pasta real fica de fora da verificação', () => {
    const todos = p.listarTestes();
    assert.ok(todos.includes('preDeploy.test.js') && todos.length > 40);
  });

  const pacote = (d, nome, versao, lock = versao, raiz = versao) => {
    grava(path.join(d, nome, 'package.json'), JSON.stringify({ version: versao }));
    grava(path.join(d, nome, 'package-lock.json'), JSON.stringify({ version: lock, packages: { '': { version: raiz } } }));
  };

  await caso('versões: iguais nos 4 arquivos passa; um esquecido reprova e diz qual', () => {
    const d = pasta();
    pacote(d, 'backend', '2.20.0'); pacote(d, 'frontend', '2.20.0');
    const certo = p.verificarVersoes(d);
    assert.ok(certo.ok); assert.strictEqual(certo.versao, '2.20.0');
    pacote(d, 'frontend', '2.20.0', '2.19.0');
    const errado = p.verificarVersoes(d);
    assert.ok(!errado.ok);
    assert.match(errado.problemas[0], /frontend\/package-lock\.json=2\.19\.0/);
    pacote(d, 'frontend', '2.20.0', '2.20.0', '2.18.0');
    assert.ok(!p.verificarVersoes(d).ok, 'a versão do pacote raiz dentro do lock também conta');
  });

  await caso('versões: arquivo ausente reprova sem lançar', () => {
    const r = p.verificarVersoes(pasta());
    assert.ok(!r.ok);
    assert.match(r.problemas.join(' '), /não consegui ler/);
  });

  await caso('migrações: ordem completa passa; repetida, buraco, nome fora do padrão e export errado reprovam', () => {
    const d = pasta();
    for (const n of ['2.0-01-a', '2.0-02-b', '2.0-03-c']) grava(path.join(d, n + '.js'), 'module.exports = async () => {};');
    assert.ok(p.verificarMigracoes(d).ok);

    grava(path.join(d, '2.0-03-repetida.js'), 'module.exports = async () => {};');
    assert.match(p.verificarMigracoes(d).problemas.join(' '), /repetido: 3/);
    fs.unlinkSync(path.join(d, '2.0-03-repetida.js'));

    fs.unlinkSync(path.join(d, '2.0-02-b.js'));
    assert.match(p.verificarMigracoes(d).problemas.join(' '), /falta a migração número 2/);

    grava(path.join(d, '2.0-02-b.js'), 'module.exports = 5;');
    grava(path.join(d, '9-solto.js'), 'module.exports = async () => {};');
    const r = p.verificarMigracoes(d);
    assert.match(r.problemas.join(' '), /2\.0-02-b\.js: não exporta uma função/);
    assert.match(r.problemas.join(' '), /9-solto\.js: nome fora do padrão/);
  });

  await caso('as migrações reais do projeto estão em ordem', () => {
    const r = p.verificarMigracoes();
    assert.ok(r.ok, r.problemas.join('; '));
  });

  await caso('rodarTeste distingue passou, falhou, travou e banco pulado', async () => {
    const raiz = pasta();
    const t = path.join(raiz, 'testes');
    grava(path.join(t, 'passa.test.js'), "console.log('x: parte do banco pulada (DB_NAME=outro)');");
    grava(path.join(t, 'falha.test.js'), "console.error('quebrou'); process.exit(1);");
    grava(path.join(t, 'trava.test.js'), 'setInterval(() => {}, 1000);');
    const passa = await p.rodarTeste('passa.test.js', t);
    assert.ok(passa.ok && passa.pulouBanco);
    const falha = await p.rodarTeste('falha.test.js', t);
    assert.ok(!falha.ok && !falha.estourou);
    assert.match(falha.saida, /quebrou/);
    const trava = await p.rodarTeste('trava.test.js', t, 600);
    assert.ok(!trava.ok && trava.estourou);
  });

  console.log(`preDeploy: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
