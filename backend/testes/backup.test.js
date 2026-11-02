// Backup pelo painel: lista dos dumps, alerta de atraso, leitura da saída do script
// e a trava de uma execução por vez. Sem banco e sem rede (o script de verdade é
// trocado por um node -e). Rodar: node testes/backup.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const b = require('../src/services/backup');

(async () => {
  // nomes: só os dumps do próprio banco (o v2 não entra na lista da produção e vice-versa)
  assert.ok(b.ehDump('hm_orcamentos', 'hm_orcamentos_2026-11-02_02-00.dump'));
  assert.ok(!b.ehDump('hm_orcamentos', 'hm_orcamentos_v2_2026-11-02_02-00.dump'));
  assert.ok(b.ehDump('hm_orcamentos_v2', 'hm_orcamentos_v2_2026-11-02_02-00.dump'));
  assert.ok(!b.ehDump('hm_orcamentos', 'antes-da-restauracao_2026-11-02_10-00.dump'));
  assert.ok(!b.ehDump('hm_orcamentos', 'hm_orcamentos_2026-11-02_02-00.dump.tmp'));

  // lista em disco, do mais novo para o mais antigo
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-backup-'));
  const cria = (nome, dataIso) => {
    const f = path.join(dir, nome);
    fs.writeFileSync(f, 'x'.repeat(2048));
    fs.utimesSync(f, new Date(dataIso), new Date(dataIso));
  };
  cria('hm_orcamentos_2026-11-01_02-00.dump', '2026-11-01T05:00:00Z');
  cria('hm_orcamentos_2026-11-02_02-00.dump', '2026-11-02T05:00:00Z');
  cria('hm_orcamentos_v2_2026-11-02_09-00.dump', '2026-11-02T12:00:00Z');
  cria('antes-da-restauracao_2026-11-02_10-00.dump', '2026-11-02T13:00:00Z');
  const dumps = b.listarDumps(dir, 'hm_orcamentos');
  assert.deepStrictEqual(dumps.map(d => d.nome), ['hm_orcamentos_2026-11-02_02-00.dump', 'hm_orcamentos_2026-11-01_02-00.dump']);
  assert.strictEqual(dumps[0].tamanho, 2048);
  assert.deepStrictEqual(b.listarDumps(path.join(dir, 'nao-existe'), 'hm_orcamentos'), []);

  // atraso: 26 h de limite
  const agora = new Date('2026-11-02T20:00:00Z');
  let s = b.avaliar(dumps, agora);
  assert.strictEqual(s.atrasado, false);
  assert.strictEqual(s.horasDesdeUltimo, 15);
  s = b.avaliar(dumps, new Date('2026-11-03T08:00:00Z')); // 27 h depois
  assert.strictEqual(s.atrasado, true);
  s = b.avaliar([], agora);
  assert.strictEqual(s.atrasado, true);
  assert.strictEqual(s.ultimo, null);

  // situação completa: destinos inexistentes viram "false"/null, sem travar nem lançar
  const sit = await b.situacao({ pasta: dir, agora, env: { DB_NAME: 'hm_orcamentos', BACKUP_DESTINO_REDE: path.join(dir, 'rede-vazia'), BACKUP_DESTINO_EXTERNO: dir } });
  assert.strictEqual(sit.totalLocal, 2);
  assert.strictEqual(sit.ultimo.copiaRede, false);
  assert.strictEqual(sit.ultimo.copiaExterna, false); // dir/Banco não existe
  assert.strictEqual(sit.destinos.externo, path.join(dir, 'Banco'));
  fs.mkdirSync(path.join(dir, 'rede-vazia'));
  fs.copyFileSync(path.join(dir, 'hm_orcamentos_2026-11-02_02-00.dump'), path.join(dir, 'rede-vazia', 'hm_orcamentos_2026-11-02_02-00.dump'));
  const sit2 = await b.situacao({ pasta: dir, agora, env: { DB_NAME: 'hm_orcamentos', BACKUP_DESTINO_REDE: path.join(dir, 'rede-vazia') } });
  assert.strictEqual(sit2.ultimo.copiaRede, true);
  assert.strictEqual(sit2.backups[1].copiaRede, false);
  assert.strictEqual(sit2.ultimo.copiaExterna, null); // nuvem não configurada

  // saída do script
  const saidaOk = [
    '2026-11-02 14:00:00 Backup do banco concluido e conferido: C:\\HM\\backend\\backups\\hm_orcamentos_2026-11-02_14-00.dump (812 KB)',
    '2026-11-02 14:00:02 Copia do banco enviada para a rede: \\\\SRV\\Backups',
    '2026-11-02 14:00:03 AVISO: BACKUP_DESTINO_EXTERNO nao definido no .env - nenhuma copia fora do predio',
  ].join('\r\n');
  const r = b.interpretarSaida(saidaOk);
  assert.strictEqual(r.arquivo, 'hm_orcamentos_2026-11-02_14-00.dump');
  assert.strictEqual(r.avisos.length, 1);
  assert.strictEqual(b.interpretarSaida('2026-11-02 14:00:00 ERRO no backup do banco: pg_dump saiu com codigo 1').arquivo, null);

  // execução: sucesso, falha e trava de uma por vez (script de mentira em node)
  const falso = (corpo) => ({ comando: process.execPath, argumentos: ['-e', corpo] });
  const ok = await b.executar(falso(`console.log(${JSON.stringify('2026-11-02 14:00:00 Backup do banco concluido e conferido: X:\\backups\\hm_orcamentos_2026-11-02_14-00.dump (5 KB)')})`));
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.arquivo, 'hm_orcamentos_2026-11-02_14-00.dump');

  const ruim = await b.executar(falso(`console.log('2026-11-02 14:00:00 ERRO no backup do banco: disco cheio'); process.exit(1)`));
  assert.strictEqual(ruim.ok, false);
  assert.match(ruim.erro, /disco cheio/);

  // exit 0 sem a linha de "concluído" não conta como sucesso
  const vazio = await b.executar(falso(`console.log('nada')`));
  assert.strictEqual(vazio.ok, false);

  const lenta = b.executar(falso(`setTimeout(() => console.log('2026-11-02 14:00:00 Backup do banco concluido e conferido: X\\\\hm_orcamentos_2026-11-02_14-01.dump (1 KB)'), 400)`));
  await assert.rejects(() => b.executar(falso(`console.log('segunda')`)), e => e.status === 409);
  assert.strictEqual((await lenta).ok, true);
  // liberou a trava: pode rodar de novo
  assert.strictEqual((await b.executar(falso(`console.log('x')`))).ok, false);

  // comando inexistente não deixa a trava presa
  const semComando = await b.executar({ comando: 'comando-que-nao-existe-hm', argumentos: [] });
  assert.strictEqual(semComando.ok, false);
  assert.match(semComando.erro, /iniciar/);

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('backup: ok');
})().catch(e => { console.error(e); process.exit(1); });
