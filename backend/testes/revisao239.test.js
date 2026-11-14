// Revisão 2.39 — servidor:
//   - utils/limiteUsoIa: cada pesquisa na web com IA conta no limite por hora do usuário (o lote contava como uma);
//     a leitura com IA do orçamento da concorrência ganhou limite;
//   - apoioMigracoes.garantirNotNull/permitirNull: ALTER COLUMN só quando precisa (não trava a tabela a cada partida);
//   - config/database: a conexão fixa o fuso de Brasília (CURRENT_DATE não depende da configuração do PostgreSQL).
// Dados SINTÉTICOS. Rodar: node testes/revisao239.test.js (pasta backend).
const assert = require('assert');
const L = require('../src/utils/limiteUsoIa');
const { garantirNotNull, permitirNull } = require('../src/models/apoioMigracoes');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('limite por peso: consome, recusa o que não cabe, parcial pega o que cabe, janela de 1 h libera', () => {
  L._zerar();
  process.env.IA_PESQUISAS_POR_HORA = '10';
  const t0 = 1_000_000;
  assert.strictEqual(L.consumir('pesquisa', 7, 4, { agora: t0 }), 4);
  assert.strictEqual(L.consumir('pesquisa', 7, 7, { agora: t0 + 1 }), 0, 'tudo ou nada: 7 não cabe em 6');
  assert.strictEqual(L.consumir('pesquisa', 7, 7, { parcial: true, agora: t0 + 2 }), 6);
  assert.strictEqual(L.disponivel('pesquisa', 7, t0 + 3).restam, 0);
  assert.strictEqual(L.disponivel('pesquisa', 8, t0 + 3).restam, 10, 'outro usuário tem o limite dele');
  assert.strictEqual(L.disponivel('pesquisa', 7, t0 + 3 + L.JANELA_MS).restam, 10, 'depois de 1 h a janela esvazia');
  process.env.IA_PESQUISAS_POR_HORA = '0';
  assert.strictEqual(L.consumir('pesquisa', 7, 500), 500, '0 = sem limite');
  delete process.env.IA_PESQUISAS_POR_HORA;
  assert.strictEqual(L.disponivel('pesquisa', 9).maximo, 60);
  assert.strictEqual(L.disponivel('leitura', 9).maximo, 10);
});

caso('middleware: 429 com mensagem em português quando o usuário passou do limite', () => {
  L._zerar();
  process.env.IA_LEITURAS_POR_HORA = '1';
  const mw = L.exigirUsoIa('leitura');
  const resp = () => { const r = { codigo: 200, corpo: null }; r.status = (c) => { r.codigo = c; return r; }; r.json = (b) => { r.corpo = b; return r; }; return r; };
  let seguiu = 0;
  mw({ usuario: { id: 3 } }, resp(), () => seguiu++);
  const r = resp();
  mw({ usuario: { id: 3 } }, r, () => seguiu++);
  assert.strictEqual(seguiu, 1);
  assert.strictEqual(r.codigo, 429);
  assert.match(r.corpo.erro, /Limite de 1 leituras de documento pela IA por hora atingido\. Libera de novo em \d+ min/);
  delete process.env.IA_LEITURAS_POR_HORA;
});

caso('busca de medidas em lote: cada item conta; o que passa do limite fica "ignorado" e, sem vaga nenhuma, 429', async () => {
  L._zerar();
  process.env.IA_PESQUISAS_POR_HORA = '2';
  const ia = require('../src/services/ia');
  const original = ia.disponivel;
  ia.disponivel = () => true;
  const { iniciarPesquisaEmLote } = require('../src/services/componentesQuadro');
  const lista = [1, 2, 3].map(i => ({ tag: `Q${i}`, tipo: 'disjuntor_din', fabricante: 'Fabricante Sintético', especificacao: `Disjuntor sintético ${i}P ${900 + i} A teste-2.39` }));
  const feitos = [];
  try {
    const t = await iniciarPesquisaEmLote(lista, { id: 4242 }, { executar: async (p) => { feitos.push(p.tag); return { situacao: 'cadastrado' }; } });
    const pendentes = t.itens.filter(i => i.situacao !== 'ignorado');
    const ignorados = t.itens.filter(i => i.situacao === 'ignorado');
    assert.strictEqual(pendentes.length, 2, JSON.stringify(t.itens));
    assert.strictEqual(ignorados.length, 1);
    assert.match(ignorados[0].motivo, /limite de pesquisas por hora/);
    await new Promise(r => setTimeout(r, 100)); // o lote em curso do mesmo usuário é devolvido em vez de abrir outro
    assert.deepStrictEqual(feitos, ['Q1', 'Q2']);
    await assert.rejects(iniciarPesquisaEmLote(lista.map(i => ({ ...i, tag: `${i.tag}b`, especificacao: `${i.especificacao} b` })), { id: 4242 }), e => e.status === 429);
  } finally {
    ia.disponivel = original;
    delete process.env.IA_PESQUISAS_POR_HORA;
  }
});

caso('migração: ALTER COLUMN só quando a coluna ainda não está como deveria', async () => {
  const feitos = [];
  const cliente = (info) => ({ query: async (sql) => { if (/information_schema/.test(sql)) return { rows: info ? [info] : [] }; feitos.push(sql.trim()); return { rows: [] }; } });
  await garantirNotNull(cliente({ is_nullable: 'NO', column_default: "'laudo'::character varying" }), 'laudos_projetos', 'tipo', { padrao: "'laudo'" });
  await permitirNull(cliente({ is_nullable: 'YES', column_default: null }), 'financeiro_movimentos', 'email_message_id');
  assert.deepStrictEqual(feitos, [], 'nada a fazer: nenhum ALTER (não trava a tabela)');
  await garantirNotNull(cliente({ is_nullable: 'YES', column_default: null }), 'laudos_projetos', 'tipo', { padrao: "'laudo'" });
  await permitirNull(cliente({ is_nullable: 'NO', column_default: null }), 'financeiro_movimentos', 'email_message_id');
  assert.deepStrictEqual(feitos, [
    "ALTER TABLE laudos_projetos ALTER COLUMN tipo SET DEFAULT 'laudo'",
    'ALTER TABLE laudos_projetos ALTER COLUMN tipo SET NOT NULL',
    'ALTER TABLE financeiro_movimentos ALTER COLUMN email_message_id DROP NOT NULL',
  ]);
  await assert.rejects(garantirNotNull(cliente(null), 'x; DROP TABLE y', 'z'), /nome inválido/);
});

caso('conexão do banco no fuso de Brasília', async () => {
  const pool = require('../src/config/database');
  const { rows: [r] } = await pool.query("SELECT current_setting('TimeZone') AS tz");
  assert.strictEqual(r.tz, 'America/Sao_Paulo');
});

caso('análise: cliente_id escolhido da lista é gravado; ausente mantém; inexistente dá 400', async () => {
  const pool = require('../src/config/database');
  const original = pool.query;
  const updates = [];
  pool.query = async (sql, p) => {
    if (/SELECT 1 FROM clientes WHERE id/.test(sql)) return { rows: p[0] === 55 ? [{}] : [] };
    if (/UPDATE analises_projeto SET/.test(sql)) { updates.push({ sql, p }); return { rows: [{ id: 1, cliente_nome: 'Cliente Sintético', cliente_id: p[12], versao: 2 }] }; }
    if (/FROM analises_projeto/.test(sql)) return { rows: [{ id: 1, cliente_nome: 'Cliente Sintético', cliente_id: 55, servicos: [], materiais: [], pontos_por_disciplina: [], versao: 2 }] };
    return { rows: [] };
  };
  const resp = () => { const r = { codigo: 200 }; r.status = (c) => { r.codigo = c; return r; }; r.json = (b) => { r.corpo = b; return r; }; return r; };
  try {
    // sem gravar na pasta do cliente (o controller desestrutura ao carregar: o substituto entra antes)
    require('../src/services/pastasRegistros').sincronizarProjeto = async () => null;
    const { atualizar } = require('../src/controllers/projetos/analises');
    const req = (body) => ({ params: { id: '1' }, body, usuario: { id: 1, role: 'admin' } });
    let r = resp(); await atualizar(req({ cliente_nome: 'Cliente Sintético', cliente_id: 55 }), r);
    assert.strictEqual(r.codigo, 200, JSON.stringify(r.corpo));
    assert.match(updates[0].sql, /cliente_id = CASE WHEN \$12::boolean THEN \$13::int ELSE cliente_id END/);
    assert.deepStrictEqual(updates[0].p.slice(11), [true, 55]);
    r = resp(); await atualizar(req({ cliente_nome: 'Nome digitado', cliente_id: null }), r);
    assert.deepStrictEqual(updates[1].p.slice(11), [true, null], 'null desliga (cliente novo)');
    r = resp(); await atualizar(req({ nome_projeto: 'Só o nome' }), r);
    assert.deepStrictEqual(updates[2].p.slice(11), [false, null], 'ausente mantém');
    r = resp(); await atualizar(req({ cliente_id: 999 }), r);
    assert.strictEqual(r.codigo, 400);
    assert.strictEqual(updates.length, 3);
  } finally {
    pool.query = original;
  }
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`revisão 2.39: ${ok}/${casos.length} casos ok`);
  await require('../src/config/database').end().catch(() => {});
})();
