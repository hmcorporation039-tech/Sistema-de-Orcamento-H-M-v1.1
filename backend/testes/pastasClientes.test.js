// Versão 2.3 — pasta por cliente e monitor das pastas (services/pastasRegistros.js,
// services/monitorPastas.js, migração 2.0-19). Banco de TESTE e pastas
// temporárias (nada no "Arquivos do Sistema" de verdade). Dados sintéticos.
// Rodar: npm test (pasta backend).
const os = require('os');
const fs = require('fs');
const path = require('path');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-teste-pastas-'));
process.env.PASTA_ARQUIVOS_SISTEMA = path.join(TMP, 'Arquivos do Sistema');
process.env.PASTA_CLIENTES = path.join(TMP, 'Servidor', 'Clientes');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const assert = require('assert');
const pool = require('../src/config/database');
const P = require('../src/services/pastasSistema');
const R = require('../src/services/pastasRegistros');
const M = require('../src/services/monitorPastas');

let ok = 0;
const caso = async (nome, fn) => { await fn(); ok++; };
const SUF = `T${Date.now().toString(36)}`;

(async () => {
  if (process.env.DB_NAME === 'hm_orcamentos') throw new Error('teste não roda no banco de produção');
  const col = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'obras' AND column_name = 'pasta_base'");
  if (!col.rows.length) { console.log('pastasClientes: migração 2.0-19 ainda não aplicada neste banco (inicie o servidor uma vez) — pulado'); await pool.end(); return; }
  P.registrarAoGravar((abs) => M.registrarGravacaoSistema(abs));
  const ids = { clientes: [], obras: [], analises: [] };
  try {
    const cli = (await pool.query("INSERT INTO clientes (nome) VALUES ($1) RETURNING id", [`Cliente Pasta ${SUF}`])).rows[0].id;
    const cli2 = (await pool.query("INSERT INTO clientes (nome) VALUES ($1) RETURNING id", [`Outro Cliente ${SUF}`])).rows[0].id;
    ids.clientes.push(cli, cli2);
    const obra = (await pool.query("INSERT INTO obras (codigo, nome, cliente_id, status) VALUES ($1,$2,$3,'prospeccao') RETURNING *", [`OB-${SUF}`, `Obra Pasta ${SUF}`, cli])).rows[0];
    ids.obras.push(obra.id);
    let dirObra;

    await caso('obra nova mora em Clientes\\<cliente>\\Obras\\<obra>, com "Recebidos do cliente"', async () => {
      dirObra = await R.pastaDaObra(obra);
      assert.strictEqual(dirObra, path.join(process.env.PASTA_CLIENTES, `Cliente Pasta ${SUF}`, 'Obras', `Obra Pasta ${SUF}`));
      assert.ok(fs.existsSync(path.join(dirObra, 'Recebidos do cliente')));
      assert.ok(fs.existsSync(path.join(process.env.PASTA_CLIENTES, `Cliente Pasta ${SUF}`, 'Recebidos do cliente')));
      const { rows: [o] } = await pool.query('SELECT pasta_base FROM obras WHERE id = $1', [obra.id]);
      assert.strictEqual(o.pasta_base, `Cliente Pasta ${SUF}/Obras`);
    });

    await caso('o que o sistema grava fica "conhecido" (não é novidade)', async () => {
      await P.gravarArquivo(path.join(dirObra, 'Propostas'), 'Orçamento P1.pdf', Buffer.from('%PDF-teste'));
      await new Promise(r => setTimeout(r, 150));
      const { rows } = await pool.query("SELECT origem, situacao, obra_id FROM pasta_arquivos WHERE caminho LIKE $1", [`%${SUF}/Propostas/Orçamento P1.pdf`]);
      assert.deepStrictEqual(rows, [{ origem: 'sistema', situacao: 'conhecido', obra_id: obra.id }]);
    });

    const recebido = path.join(dirObra, 'Recebidos do cliente', 'Projeto revisado R02.dwg');
    let idNovo;
    await caso('arquivo que o cliente mandou aparece como NOVO, ligado à obra', async () => {
      fs.writeFileSync(recebido, 'AC1027 teste');
      const r = await M.escanearCliente(cli);
      assert.strictEqual(r.novos, 1);
      const n = await M.novidades({ obraId: obra.id });
      assert.strictEqual(n.length, 1);
      assert.strictEqual(n[0].situacao, 'novo');
      assert.strictEqual(n[0].analisavel, true);
      assert.strictEqual(n[0].obra_id, obra.id);
      idNovo = n[0].id;
    });

    await caso('visto → conhecido; alterado depois → ALTERADO; apagado → REMOVIDO', async () => {
      assert.strictEqual(await M.marcarVisto([idNovo], { id: null }), 1);
      assert.strictEqual((await M.novidades({ clienteId: cli })).length, 0);
      fs.writeFileSync(recebido, 'AC1027 teste com mais conteúdo');
      await M.escanearCliente(cli);
      assert.strictEqual((await M.novidades({ clienteId: cli }))[0].situacao, 'alterado');
      fs.rmSync(recebido);
      await M.escanearCliente(cli);
      assert.strictEqual((await M.novidades({ clienteId: cli }))[0].situacao, 'removido');
      await M.marcarVisto((await M.novidades({ clienteId: cli })).map(x => x.id), { id: null });
      assert.strictEqual((await M.novidades({ clienteId: cli })).length, 0);
    });

    await caso('arquivo temporário do Office/AutoCAD não vira novidade', async () => {
      fs.writeFileSync(path.join(dirObra, 'Recebidos do cliente', '~$Memorial.docx'), 'x');
      fs.writeFileSync(path.join(dirObra, 'Recebidos do cliente', 'planta.dwl'), 'x');
      await M.escanearCliente(cli);
      assert.strictEqual((await M.novidades({ clienteId: cli })).length, 0);
    });

    await caso('renomear o cliente renomeia a pasta e acompanha obra e retrato', async () => {
      await pool.query('UPDATE clientes SET nome = $1 WHERE id = $2', [`Cliente Renomeado ${SUF}`, cli]);
      const novo = await R.pastaDaObraPorId(obra.id);
      assert.strictEqual(novo, path.join(process.env.PASTA_CLIENTES, `Cliente Renomeado ${SUF}`, 'Obras', `Obra Pasta ${SUF}`));
      assert.ok(fs.existsSync(path.join(novo, 'Propostas', 'Orçamento P1.pdf')));
      const { rows } = await pool.query("SELECT caminho FROM pasta_arquivos WHERE caminho LIKE $1", [`%Orçamento P1.pdf`]);
      assert.ok(rows.every(r => r.caminho.startsWith(`Cliente Renomeado ${SUF}/`)), JSON.stringify(rows));
      // novo nome não vira "novidade"
      await M.escanearCliente(cli);
      assert.strictEqual((await M.novidades({ clienteId: cli })).length, 0);
    });

    await caso('trocar o cliente da obra leva a pasta da obra junto', async () => {
      await pool.query('UPDATE obras SET cliente_id = $1 WHERE id = $2', [cli2, obra.id]);
      const novo = await R.pastaDaObraPorId(obra.id);
      assert.strictEqual(novo, path.join(process.env.PASTA_CLIENTES, `Outro Cliente ${SUF}`, 'Obras', `Obra Pasta ${SUF}`));
      assert.ok(fs.existsSync(path.join(novo, 'Propostas', 'Orçamento P1.pdf')));
      assert.ok(!fs.existsSync(path.join(process.env.PASTA_CLIENTES, `Cliente Renomeado ${SUF}`, 'Obras', `Obra Pasta ${SUF}`)));
    });

    await caso('análise sem obra vai para Clientes\\<cliente>\\Projetos (cliente achado pelo nome)', async () => {
      const a = (await pool.query("INSERT INTO analises_projeto (cliente_nome, nome_projeto, disciplinas) VALUES ($1, $2, '[]') RETURNING *", [`outro cliente ${SUF}`, `Análise ${SUF}`])).rows[0];
      ids.analises.push(a.id);
      const dir = await R.pastaDoProjeto(a);
      assert.strictEqual(dir, path.join(process.env.PASTA_CLIENTES, `Outro Cliente ${SUF}`, 'Projetos', `Análise ${SUF}`));
      assert.strictEqual(await R.caminhoRegistrado('projeto', (await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [a.id])).rows[0]), dir);
    });

    await caso('sem cliente → Clientes\\_Sem cliente', async () => {
      const o = (await pool.query("INSERT INTO obras (codigo, nome, status) VALUES ($1,$2,'prospeccao') RETURNING *", [`OB2-${SUF}`, `Obra Sem Cliente ${SUF}`])).rows[0];
      ids.obras.push(o.id);
      assert.strictEqual(await R.pastaDaObra(o), path.join(process.env.PASTA_CLIENTES, '_Sem cliente', 'Obras', `Obra Sem Cliente ${SUF}`));
    });

    const RAIZ = process.env.PASTA_CLIENTES;
    await caso('pasta que já existe no servidor com o nome do cliente é adotada (sem "(C12)") e o que já tinha não é novidade', async () => {
      const antiga = path.join(RAIZ, `clinica adotada ${SUF.toLowerCase()}`);
      fs.mkdirSync(path.join(antiga, 'Projetos 2024'), { recursive: true });
      fs.writeFileSync(path.join(antiga, 'Projetos 2024', 'Planta antiga.dwg'), 'AC1027');
      fs.writeFileSync(path.join(antiga, 'Contrato.pdf'), '%PDF');
      const c = (await pool.query('INSERT INTO clientes (nome) VALUES ($1) RETURNING id', [`Clínica Adotada ${SUF}`])).rows[0].id;
      ids.clientes.push(c);
      assert.strictEqual(await R.pastaRelDoCliente(c), path.basename(antiga));
      const { rows: [row] } = await pool.query('SELECT pasta_fixa, pasta_retrato_em FROM clientes WHERE id = $1', [c]);
      assert.deepStrictEqual(row, { pasta_fixa: true, pasta_retrato_em: null });
      const r = await M.escanearCliente(c);
      assert.strictEqual(r.primeira, true);
      assert.strictEqual(r.novos, 0);
      assert.strictEqual((await M.novidades({ clienteId: c })).length, 0);
      // depois do retrato, arquivo novo é novidade
      fs.writeFileSync(path.join(antiga, 'Recebidos do cliente', 'Revisão R01.pdf'), '%PDF r01');
      assert.strictEqual((await M.escanearCliente(c)).novos, 1);
      // pasta adotada não muda de nome quando o cliente muda
      await pool.query('UPDATE clientes SET nome = $1 WHERE id = $2', [`Clínica Nova ${SUF}`, c]);
      assert.strictEqual(await R.pastaRelDoCliente(c), path.basename(antiga));
    });

    await caso('ligar o cliente a uma pasta do servidor de outro nome junta o que o sistema já tinha gravado', async () => {
      const c = (await pool.query('INSERT INTO clientes (nome) VALUES ($1) RETURNING id', [`Hospital Ligado ${SUF}`])).rows[0].id;
      ids.clientes.push(c);
      const doSistema = await R.pastaDoCliente(c);
      await P.gravarArquivo(path.join(doSistema, 'Propostas'), 'Orçamento P7.pdf', Buffer.from('%PDF sistema'));
      const servidor = path.join(RAIZ, `HL antigo ${SUF}`);
      fs.mkdirSync(path.join(servidor, 'Propostas'), { recursive: true });
      fs.writeFileSync(path.join(servidor, 'Propostas', 'Orçamento P7.pdf'), '%PDF de antes');
      fs.writeFileSync(path.join(servidor, 'Memorial.docx'), 'docx');
      await assert.rejects(R.ligarPastaDoCliente(c, '..'), /inválida/);
      await assert.rejects(R.ligarPastaDoCliente(c, `Cliente Renomeado ${SUF}`), (e) => e.status === 409 || e.status === 404);
      const r = await R.ligarPastaDoCliente(c, `HL antigo ${SUF}`);
      assert.strictEqual(r.pasta, `HL antigo ${SUF}`);
      assert.ok(!fs.existsSync(doSistema));
      assert.strictEqual(fs.readFileSync(path.join(servidor, 'Propostas', 'Orçamento P7.pdf'), 'utf8'), '%PDF de antes');
      assert.strictEqual(fs.readFileSync(path.join(servidor, 'Propostas', 'Orçamento P7 (do sistema).pdf'), 'utf8'), '%PDF sistema');
      assert.strictEqual(await R.pastaRelDoCliente(c), `HL antigo ${SUF}`);
      await M.escanearCliente(c);
      assert.strictEqual((await M.novidades({ clienteId: c })).length, 0);
      // a pasta ligada não aparece mais livre para outro cliente
      const livres = (await R.pastasDoServidor()).filter(p => !p.cliente).map(p => p.nome);
      assert.ok(!livres.includes(`HL antigo ${SUF}`));
    });

    await caso('servidor fora do ar: grava na reserva local e envia quando ele volta', async () => {
      // processo à parte: a raiz dos clientes é lida quando o módulo carrega
      const { spawnSync } = require('child_process');
      const servidor = path.join(TMP, 'ServidorFora', 'Clientes');
      const script = `
        const fs = require('fs'), path = require('path');
        const P = require(${JSON.stringify(path.join(__dirname, '..', 'src', 'services', 'pastasSistema.js'))});
        (async () => {
          // servidor "fora": um ARQUIVO no lugar da pasta-mãe faz o mkdir falhar
          fs.mkdirSync(path.dirname(path.dirname(P.RAIZ_CLIENTES_SERVIDOR)), { recursive: true });
          fs.writeFileSync(path.dirname(P.RAIZ_CLIENTES_SERVIDOR), 'x');
          const raiz = await P.raizClientes();
          await P.gravarArquivo(path.join(raiz, 'Cliente X', 'Propostas'), 'P9.pdf', 'pdf');
          // servidor volta
          fs.rmSync(path.dirname(P.RAIZ_CLIENTES_SERVIDOR));
          const n = await P.enviarPendentesAoServidor();
          console.log(JSON.stringify({ raiz, pendente: P.RAIZ_CLIENTES_PENDENTE, n, chegou: fs.existsSync(path.join(P.RAIZ_CLIENTES_SERVIDOR, 'Cliente X', 'Propostas', 'P9.pdf')) }));
        })();`;
      const r = spawnSync(process.execPath, ['-e', script], { env: { ...process.env, PASTA_CLIENTES: servidor }, encoding: 'utf8' });
      const s = JSON.parse(r.stdout.trim().split('\n').pop());
      assert.strictEqual(s.raiz, s.pendente);
      assert.strictEqual(s.n, 1);
      assert.strictEqual(s.chegou, true);
    });
  } finally {
    await pool.query('DELETE FROM pasta_arquivos WHERE caminho LIKE $1', [`%${SUF}%`]);
    if (ids.analises.length) await pool.query('DELETE FROM analises_projeto WHERE id = ANY($1)', [ids.analises]);
    if (ids.obras.length) await pool.query('DELETE FROM obras WHERE id = ANY($1)', [ids.obras]);
    if (ids.clientes.length) await pool.query('DELETE FROM clientes WHERE id = ANY($1)', [ids.clientes]);
    await pool.end();
    fs.rmSync(TMP, { recursive: true, force: true });
  }
  console.log(`pastasClientes: ${ok} casos ok`);
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
