// Revisão da aba Obras (2.42) — integração com o BANCO DE TESTE (hm_orcamentos_v2) e a API de verdade numa porta
// livre, com dados SINTÉTICOS. Confere:
//   - GET /obras traz o próximo passo de cada obra e a contagem por status (com os outros filtros, sem o de status);
//   - GET /obras/parecidas acha a obra repetida (e não a cancelada);
//   - POST /obras/:id/juntar: só admin; não junta com ela mesma; move propostas e movimentos; o destino herda o
//     cliente que faltava; a origem fica cancelada com juntada_a e o próximo passo aponta para a que ficou; não junta 2×;
//   - ligar proposta aprovada leva a obra a "contratada"; o "juntar" recusa duas obras com cronograma.
// Só roda com DB_NAME=hm_orcamentos_v2; apaga tudo o que cria.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');

const BANCO_DE_TESTE = 'hm_orcamentos_v2';
if (process.env.DB_NAME !== BANCO_DE_TESTE) {
  console.log(`obrasEtapasIntegracao: pulado (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  process.exit(0);
}

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const { criarTabelas } = require('../src/models/schema');
const { JWT_SECRET } = require('../src/config/segredos');

const MARCA = `zzobra${Date.now().toString(36)}`;
const criado = { usuarios: [], obras: [], propostas: [], movimentos: [], clientes: [] };
let base; let servidor;
let ok = 0;

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

async function obra(nome, extra = {}) {
  const { rows: [o] } = await pool.query(
    `INSERT INTO obras (codigo, nome, cliente_id, cliente_nome, local, status, usuario_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [`ZZ-${MARCA}-${criado.obras.length}`, nome, extra.cliente_id ?? null, extra.cliente_nome ?? null, extra.local ?? null, extra.status || 'orcamento', criado.usuarios[0].id]);
  criado.obras.push(o);
  return o;
}
async function proposta(status, obraId = null, total = 1000) {
  const n = 950000 + Math.floor(Math.random() * 40000);
  const { rows: [p] } = await pool.query(
    `INSERT INTO propostas (numero, sequencial, data, cliente_nome, status, total, usuario_id, obra_id) VALUES ($1,$2,CURRENT_DATE,'Cliente Obra Teste',$3,$4,$5,$6) RETURNING id, numero`,
    [`P${n}`, n, status, total, criado.usuarios[0].id, obraId]);
  criado.propostas.push(p);
  return p;
}

const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('lista: próximo passo por obra e contagem por status sem o filtro de status', async () => {
  const [admin] = criado.usuarios;
  const a = await obra(`${MARCA} Lista A`);
  const b = await obra(`${MARCA} Lista B`, { status: 'contratada' });
  const p = await proposta('Ativa', a.id);
  const r = await req('GET', `/api/obras?busca=${MARCA}%20Lista&status=orcamento`, { token: tok(admin) });
  assert.strictEqual(r.status, 200, JSON.stringify(r.dados));
  assert.deepStrictEqual(r.dados.itens.map(o => o.id), [a.id]);
  assert.match(r.dados.itens[0].proximo_passo.texto, new RegExp(p.numero));
  assert.strictEqual(r.dados.contagem_status.orcamento, 1);
  assert.strictEqual(r.dados.contagem_status.contratada, 1); // conta mesmo com o filtro em "orçamento"
  const rb = await req('GET', `/api/obras?busca=${MARCA}%20Lista%20B`, { token: tok(admin) });
  assert.strictEqual(rb.dados.itens[0].proximo_passo.acao.rotulo, 'Gerar cronograma');
  assert.strictEqual(rb.dados.itens[0].id, b.id);
});

caso('parecidas: acha a repetida, ignora a cancelada e pede autenticação', async () => {
  const [admin, comum] = criado.usuarios;
  const x = await obra(`${MARCA} Hospital Repetido Sobradinho`);
  await obra(`${MARCA} Hospital Repetido Sobradinho cancelada`, { status: 'cancelada' });
  assert.strictEqual((await req('GET', `/api/obras/parecidas?nome=${MARCA}`)).status, 401);
  const r = await req('GET', `/api/obras/parecidas?nome=${encodeURIComponent(`${MARCA} Hospital Repetido Sobradinho`)}`, { token: tok(comum) });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.dados.itens.map(o => o.id), [x.id]);
  const ex = await req('GET', `/api/obras/parecidas?nome=${encodeURIComponent(`${MARCA} Hospital Repetido Sobradinho`)}&excluir=${x.id}`, { token: tok(admin) });
  assert.deepStrictEqual(ex.dados.itens, []);
});

caso('juntar: só admin, nunca com ela mesma, move tudo, herda o cliente e a origem aponta para a que ficou', async () => {
  const [admin, comum] = criado.usuarios;
  const { rows: [cli] } = await pool.query("INSERT INTO clientes (nome, tipo) VALUES ($1, 'empresa') RETURNING id, nome", [`${MARCA} Cliente`]);
  criado.clientes.push(cli.id);
  const destino = await obra(`${MARCA} Clínica Junta`);
  const origem = await obra(`${MARCA} Clínica Junta (repetida)`, { cliente_id: cli.id, cliente_nome: cli.nome, local: 'Asa Sul', status: 'contratada' });
  const p1 = await proposta('Aprovada', origem.id, 5000);
  const { rows: [mv] } = await pool.query(
    "INSERT INTO financeiro_movimentos (tipo, nome, valor, data_hora, obra_id, categoria, origem) VALUES ('realizado', 'Fornecedor Junta', 321, NOW(), $1, 'material', 'manual') RETURNING id", [origem.id]);
  criado.movimentos.push(mv.id);
  assert.strictEqual((await req('POST', `/api/obras/${destino.id}/juntar`, { corpo: { origem_id: origem.id }, token: tok(comum) })).status, 403);
  assert.strictEqual((await req('POST', `/api/obras/${destino.id}/juntar`, { corpo: { origem_id: destino.id }, token: tok(admin) })).status, 400);
  const r = await req('POST', `/api/obras/${destino.id}/juntar`, { corpo: { origem_id: origem.id }, token: tok(admin) });
  assert.strictEqual(r.status, 200, JSON.stringify(r.dados));
  assert.deepStrictEqual(r.dados.movidos, { propostas: 1, financeiro_movimentos: 1 });
  const { rows: [d] } = await pool.query('SELECT * FROM obras WHERE id = $1', [destino.id]);
  assert.strictEqual(d.cliente_id, cli.id);
  assert.strictEqual(d.local, 'Asa Sul');
  assert.strictEqual(d.status, 'contratada'); // o mais adiantado das duas
  assert.strictEqual((await pool.query('SELECT obra_id FROM propostas WHERE id = $1', [p1.id])).rows[0].obra_id, destino.id);
  const o = await req('GET', `/api/obras/${origem.id}`, { token: tok(admin) });
  assert.strictEqual(o.dados.status, 'cancelada');
  assert.strictEqual(o.dados.juntada.id, destino.id);
  assert.strictEqual(o.dados.proximo_passo.acao.para, `/obras/${destino.id}`);
  assert.match(o.dados.observacoes, /Juntada à obra/);
  const det = await req('GET', `/api/obras/${destino.id}`, { token: tok(admin) });
  assert.strictEqual(det.dados.resumo.realizado, 321);
  assert.strictEqual(det.dados.resumo.sem_custos, false);
  assert.strictEqual((await req('POST', `/api/obras/${destino.id}/juntar`, { corpo: { origem_id: origem.id }, token: tok(admin) })).status, 409);
  // usuário comum não vê o financeiro (nem o sem_custos)
  const detComum = await req('GET', `/api/obras/${destino.id}`, { token: tok(comum) });
  assert.strictEqual(detComum.dados.resumo.sem_custos, null);
});

caso('juntar recusa duas obras com cronograma', async () => {
  const [admin] = criado.usuarios;
  const a = await obra(`${MARCA} Crono A`, { status: 'contratada' });
  const b = await obra(`${MARCA} Crono B`, { status: 'contratada' });
  for (const o of [a, b]) {
    await pool.query("INSERT INTO obra_etapas (obra_id, ordem, nome, origem, valor) VALUES ($1, 1, 'Etapa teste', 'manual', 100)", [o.id]);
  }
  const r = await req('POST', `/api/obras/${a.id}/juntar`, { corpo: { origem_id: b.id }, token: tok(admin) });
  assert.strictEqual(r.status, 409);
  assert.match(r.dados.erro, /cronograma/);
});

caso('ligar proposta aprovada leva a obra a contratada', async () => {
  const [admin] = criado.usuarios;
  const o = await obra(`${MARCA} Ligar Aprovada`);
  const p = await proposta('Aprovada');
  const r = await req('PUT', `/api/obras/${o.id}/vinculos`, { corpo: { tipo: 'proposta', id: p.id, ligar: true }, token: tok(admin) });
  assert.strictEqual(r.status, 200, JSON.stringify(r.dados));
  assert.strictEqual((await pool.query('SELECT status FROM obras WHERE id = $1', [o.id])).rows[0].status, 'contratada');
});

(async () => {
  try {
    await criarTabelas();
    for (const [i, role] of ['admin', 'user'].entries()) {
      const { rows: [u] } = await pool.query(
        `INSERT INTO usuarios (nome, email, senha, role, ativo, senha_provisoria) VALUES ($1,$2,'x-sem-login',$3,true,false) RETURNING id, nome, email, role`,
        [`Teste Obras ${i} ${MARCA}`, `${MARCA}.${i}@teste.invalido`, role]);
      criado.usuarios.push(u);
    }
    servidor = app().listen(0, '127.0.0.1');
    await new Promise(r => servidor.once('listening', r));
    base = `http://127.0.0.1:${servidor.address().port}`;
    for (const [nome, fn] of casos) {
      try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
    }
  } catch (e) {
    console.error('obrasEtapasIntegracao: falha na preparação:', e);
    process.exitCode = 1;
  } finally {
    if (servidor) await new Promise(r => servidor.close(r));
    const ids = criado.obras.map(o => o.id);
    const usuarios = criado.usuarios.map(u => u.id);
    await pool.query('DELETE FROM auditoria WHERE usuario_id = ANY($1::int[])', [usuarios]).catch(() => {});
    await pool.query('DELETE FROM financeiro_movimentos WHERE id = ANY($1::int[])', [criado.movimentos]).catch(e => console.error('limpeza movimentos:', e.message));
    await pool.query('DELETE FROM propostas WHERE id = ANY($1::int[])', [criado.propostas.map(p => p.id)]).catch(e => console.error('limpeza propostas:', e.message));
    await pool.query('UPDATE obras SET juntada_a = NULL WHERE id = ANY($1::int[])', [ids]).catch(() => {});
    await pool.query('DELETE FROM obras WHERE id = ANY($1::int[])', [ids]).catch(e => console.error('limpeza obras:', e.message));
    await pool.query('DELETE FROM clientes WHERE id = ANY($1::int[])', [criado.clientes]).catch(e => console.error('limpeza clientes:', e.message));
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::int[])', [usuarios]).catch(e => console.error('limpeza usuários:', e.message));
    console.log(`obras — etapas e juntar (integração): ${ok}/${casos.length} casos ok`);
    await pool.end();
  }
})();
