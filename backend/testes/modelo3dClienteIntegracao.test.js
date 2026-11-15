// 3D salvo para o cliente de dentro do editor (2.43) — integração com o BANCO DE TESTE (hm_orcamentos_v2), a API
// de verdade numa porta livre e uma arquitetura SINTÉTICA (sala e cozinha). Confere:
//   - POST /modelo-3d/analise/:id/salvar-cliente: só o dono da análise ou admin; grava "Modelo 3D - <nome>.html"
//     na pasta do cliente, guarda quem salvou e devolve as propostas feitas da análise;
//   - GET /modelo-3d/analise|proposta/:id traz o "salvo para o cliente" e se ainda é o mesmo 3D (atual);
//   - editado depois de salvo: atual = false, e abrir o 3D (ver/editar) NÃO troca a cópia aprovada da pasta;
//     salvar de novo troca.
// Só roda com DB_NAME=hm_orcamentos_v2; apaga tudo o que cria (pasta do sistema numa pasta temporária).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BANCO_DE_TESTE = 'hm_orcamentos_v2';
if (process.env.DB_NAME !== BANCO_DE_TESTE) {
  console.log(`modelo3dClienteIntegracao: pulado (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  process.exit(0);
}
const PASTA_TESTE = fs.mkdtempSync(path.join(os.tmpdir(), 'modelo3dcliente-'));
process.env.PASTA_ARQUIVOS_SISTEMA = PASTA_TESTE;

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const { criarTabelas } = require('../src/models/schema');
const { JWT_SECRET } = require('../src/config/segredos');
const { CAD, RAIZ_SKILLS } = require('../src/config/caminhos');
const { DesenhoDxf } = require(path.join(CAD, 'dxf.js'));
const { point3d } = require(path.join(RAIZ_SKILLS, 'node_modules', '@tarikjabiri', 'dxf'));

const MARCA = `zz3d${Date.now().toString(36)}`;
const criado = { usuarios: [], analises: [], propostas: [] };
let base; let servidor;
let ok = 0;

// sala e cozinha (mm), como testes/modelo3d.test.js
function dxfSintetico() {
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'A-PORTA', cor: 3 }] });
  const L = (x1, y1, x2, y2) => g.linha(x1, y1, x2, y2, 'A-PAREDE');
  [[0, 0, 8000, 0], [8000, 0, 8000, 5000], [8000, 5000, 0, 5000], [0, 5000, 0, 0],
    [-150, -150, 8150, -150], [8150, -150, 8150, 5150], [8150, 5150, -150, 5150], [-150, 5150, -150, -150],
    [5000, 0, 5000, 1200], [5000, 2000, 5000, 5000], [5150, 0, 5150, 1200], [5150, 2000, 5150, 5000], [5000, 1200, 5150, 1200], [5000, 2000, 5150, 2000]].forEach(l => L(...l));
  g.bloco('PORTA80', (b) => { b.addLine(point3d(0, 0), point3d(800, 0), { layerName: '0' }); b.addArc(point3d(0, 0), 800, 0, 90, { layerName: '0' }); });
  g.dxf.addInsert('PORTA80', point3d(5000, 2000), { layerName: 'A-PORTA', rotationAngle: 180 });
  g.texto(2500, 2500, 200, 'SALA DE ESTAR', { layer: 'A-TEXTO' });
  g.texto(6500, 2500, 200, 'COZINHA', { layer: 'A-TEXTO' });
  return g.toString().replace(/(\$INSUNITS\r?\n\s*70\r?\n\s*)6/, '$14');
}

function app() {
  const a = express();
  a.use(express.json({ limit: '5mb' }));
  a.use('/api', require('../src/routes'));
  a.use(require('../src/middleware/erros').tratarErros);
  return a;
}
async function req(metodo, caminho, { corpo, token } = {}) {
  const h = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (corpo !== undefined) h['Content-Type'] = 'application/json';
  const r = await fetch(`${base}${caminho}`, { method: metodo, headers: h, body: corpo !== undefined ? JSON.stringify(corpo) : undefined });
  const texto = await r.text();
  let dados; try { dados = JSON.parse(texto); } catch { dados = texto; }
  return { status: r.status, dados };
}
const tok = (u) => jwt.sign({ id: u.id, nome: u.nome, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '10m', algorithm: 'HS256' });

// o arquivo do 3D onde estiver dentro da pasta do sistema de teste
function acharArquivo(nome, pasta = PASTA_TESTE) {
  for (const e of fs.readdirSync(pasta, { withFileTypes: true })) {
    const p = path.join(pasta, e.name);
    if (e.isDirectory()) { const r = acharArquivo(nome, p); if (r) return r; } else if (e.name === nome) return p;
  }
  return null;
}
const espacial = (pontos) => JSON.stringify({ pontos, trechos: [] });

const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

let analise; let proposta; let arquivoSalvo;

caso('antes de salvar: a situação não traz "salvo para o cliente"', async () => {
  const r = await req('GET', `/api/modelo-3d/analise/${analise.id}`, { token: tok(criado.usuarios[1]) });
  assert.strictEqual(r.status, 200, JSON.stringify(r.dados));
  assert.strictEqual(r.dados.disponivel, true);
  assert.strictEqual(r.dados.salvo_cliente, null);
});

caso('salvar para o cliente: outro usuário 403; sem login 401', async () => {
  assert.strictEqual((await req('POST', `/api/modelo-3d/analise/${analise.id}/salvar-cliente`, { token: tok(criado.usuarios[2]) })).status, 403);
  assert.strictEqual((await req('POST', `/api/modelo-3d/analise/${analise.id}/salvar-cliente`)).status, 401);
});

caso('o dono salva: arquivo na pasta do cliente, quem salvou e as propostas da análise', async () => {
  const r = await req('POST', `/api/modelo-3d/analise/${analise.id}/salvar-cliente`, { token: tok(criado.usuarios[1]) });
  assert.strictEqual(r.status, 200, JSON.stringify(r.dados));
  assert.match(r.dados.nome_arquivo, /^Modelo 3D - .+\.html$/);
  assert.strictEqual(r.dados.na_pasta, true);
  assert.strictEqual(r.dados.por, criado.usuarios[1].nome);
  assert.match(r.dados.url, /^\/api\/modelo-3d\/ver\/[0-9a-f]{48}$/);
  assert.deepStrictEqual(r.dados.propostas.map(p => p.id), [proposta.id]);
  assert.strictEqual(r.dados.propostas[0].modelo_3d_cliente, false);
  arquivoSalvo = acharArquivo(r.dados.nome_arquivo);
  assert.ok(arquivoSalvo, 'arquivo do 3D na pasta do cliente');
  assert.ok(fs.readFileSync(arquivoSalvo, 'utf8').startsWith('<!doctype html>'));
  const s = await req('GET', `/api/modelo-3d/analise/${analise.id}`, { token: tok(criado.usuarios[2]) });
  assert.strictEqual(s.dados.salvo_cliente.atual, true);
  assert.strictEqual(s.dados.salvo_cliente.por, criado.usuarios[1].nome);
  // a proposta feita da análise enxerga o mesmo "salvo" (o número dela só muda o título do 3D)
  const p = await req('GET', `/api/modelo-3d/proposta/${proposta.id}`, { token: tok(criado.usuarios[2]) });
  assert.strictEqual(p.dados.salvo_cliente.atual, true);
});

caso('editado depois de salvo: atual = false e abrir o 3D não troca a cópia aprovada; salvar de novo troca', async () => {
  const antes = fs.readFileSync(arquivoSalvo, 'utf8');
  await pool.query('UPDATE analises_projeto SET espacial = $1 WHERE id = $2', [espacial([
    { disciplina: 'eletrica', descricao: 'Tomada 2P+T', x: 2000, y: 2000, altura_m: 0.3 },
    { disciplina: 'eletrica', descricao: 'Tomada 2P+T', x: 6500, y: 1000, altura_m: 0.3 },
  ]), analise.id]);
  const s = await req('GET', `/api/modelo-3d/analise/${analise.id}`, { token: tok(criado.usuarios[1]) });
  assert.strictEqual(s.dados.salvo_cliente.atual, false);
  const ab = await req('POST', `/api/modelo-3d/analise/${analise.id}/abrir`, { token: tok(criado.usuarios[1]), corpo: { embutido: true } });
  assert.strictEqual(ab.status, 200, JSON.stringify(ab.dados));
  assert.strictEqual(fs.readFileSync(arquivoSalvo, 'utf8'), antes, 'a cópia aprovada continua a mesma');
  // admin também pode salvar
  const r = await req('POST', `/api/modelo-3d/analise/${analise.id}/salvar-cliente`, { token: tok(criado.usuarios[0]) });
  assert.strictEqual(r.status, 200, JSON.stringify(r.dados));
  assert.notStrictEqual(fs.readFileSync(arquivoSalvo, 'utf8'), antes, 'salvar de novo troca a cópia');
  const d = await req('GET', `/api/modelo-3d/analise/${analise.id}`, { token: tok(criado.usuarios[1]) });
  assert.strictEqual(d.dados.salvo_cliente.atual, true);
  assert.strictEqual(d.dados.salvo_cliente.por, criado.usuarios[0].nome);
});

(async () => {
  try {
    await criarTabelas();
    for (const [i, role] of ['admin', 'user', 'user'].entries()) {
      const { rows: [u] } = await pool.query(
        `INSERT INTO usuarios (nome, email, senha, role, ativo, senha_provisoria) VALUES ($1,$2,'x-sem-login',$3,true,false) RETURNING id, nome, email, role`,
        [`Teste 3D ${i} ${MARCA}`, `${MARCA}.${i}@teste.invalido`, role]);
      criado.usuarios.push(u);
    }
    const dono = criado.usuarios[1].id;
    ({ rows: [analise] } = await pool.query(
      `INSERT INTO analises_projeto (cliente_nome, nome_projeto, usuario_id, espacial) VALUES ($1,$2,$3,$4) RETURNING id`,
      [`Cliente ${MARCA}`, `Casa ${MARCA}`, dono, espacial([{ disciplina: 'eletrica', descricao: 'Tomada 2P+T', x: 2000, y: 2000, altura_m: 0.3 }])]));
    criado.analises.push(analise.id);
    await pool.query('INSERT INTO analises_projeto_arquitetura (analise_id, nome_arquivo, conteudo, resumo, usuario_id) VALUES ($1,$2,$3,$4,$5)',
      [analise.id, 'arquitetura.dxf', Buffer.from(dxfSintetico(), 'utf8'), { ambientes: [] }, dono]);
    const n = 990000 + Math.floor(Math.random() * 9000);
    ({ rows: [proposta] } = await pool.query(
      `INSERT INTO propostas (numero, sequencial, data, cliente_nome, status, total, usuario_id, origem_tipo, origem_id)
       VALUES ($1,$2,CURRENT_DATE,'Cliente 3D Teste','Rascunho',1000,$3,'analise',$4) RETURNING id, numero`, [`P${n}`, n, dono, analise.id]));
    criado.propostas.push(proposta.id);

    servidor = app().listen(0, '127.0.0.1');
    await new Promise(r => servidor.once('listening', r));
    base = `http://127.0.0.1:${servidor.address().port}`;
    for (const [nome, fn] of casos) {
      try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
    }
  } catch (e) {
    console.error('modelo3dClienteIntegracao: falha na preparação:', e);
    process.exitCode = 1;
  } finally {
    if (servidor) await new Promise(r => servidor.close(r));
    const usuarios = criado.usuarios.map(u => u.id);
    await pool.query('DELETE FROM auditoria WHERE usuario_id = ANY($1::int[])', [usuarios]).catch(() => {});
    await pool.query("DELETE FROM modelos_3d WHERE (origem_tipo = 'analise' AND origem_id = ANY($1::int[])) OR (origem_tipo = 'proposta' AND origem_id = ANY($2::int[]))",
      [criado.analises, criado.propostas]).catch(e => console.error('limpeza modelos_3d:', e.message));
    await pool.query('DELETE FROM propostas WHERE id = ANY($1::int[])', [criado.propostas]).catch(e => console.error('limpeza propostas:', e.message));
    await pool.query('DELETE FROM analises_projeto WHERE id = ANY($1::int[])', [criado.analises]).catch(e => console.error('limpeza análises:', e.message));
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::int[])', [usuarios]).catch(e => console.error('limpeza usuários:', e.message));
    await pool.end();
    fs.rmSync(PASTA_TESTE, { recursive: true, force: true });
    console.log(`modelo3dClienteIntegracao: ${ok}/${casos.length} casos ok`);
  }
})();
