// Revisão 2.38 — redundâncias do backend viram uma fonte só:
//   - utils/fila.js: a fila de vagas do Claude Max, do PDF, das threads de CAD/3D e do assistente/agentes;
//   - utils/dataHoje.dataLocalIso: coluna DATE (meia-noite local) → AAAA-MM-DD;
//   - utils/moeda.moedaTexto: reais em texto corrido (espaço comum, "—" opcional para vazio);
//   - utils/texto.chaveBusca: sem acento, minúsculas, espaços juntados;
//   - catalogoMateriais.materialAtivoPorDescricao: a mesma expressão do índice único dos dois lados.
// Dados SINTÉTICOS. Rodar: node testes/revisao238.test.js (pasta backend).
const assert = require('assert');
const { criarFila, Fila } = require('../src/utils/fila');
const { dataLocalIso } = require('../src/utils/dataHoje');
const { moedaTexto } = require('../src/utils/moeda');
const { chaveBusca, semAcento, chaveNome } = require('../src/utils/texto');
const { materialAtivoPorDescricao, encontrarExistente } = require('../src/services/catalogoMateriais');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

caso('fila: ordem de chegada, a vaga passa direto ao próximo (ninguém fura), posição avisada', async () => {
  const fila = criarFila(1);
  const ordem = [];
  const posicoes = [];
  const s1 = await fila.reservar();
  const b = fila.reservar({ id: 'b', aoMudarPosicao: p => posicoes.push(['b', p]) }).then(s => { ordem.push('b'); return s; });
  const c = fila.reservar({ id: 'c', aoMudarPosicao: p => posicoes.push(['c', p]) }).then(s => { ordem.push('c'); return s; });
  assert.deepStrictEqual(fila.situacao(), { ativos: 1, esperando: 2, maximo: 1 });
  s1();
  // entre o soltar e a entrada do "b", um pedido novo não pega a vaga
  const intruso = fila.reservar().then(s => { ordem.push('intruso'); return s; });
  const sb = await b; sb();
  const sc = await c; sc();
  (await intruso)();
  assert.deepStrictEqual(ordem, ['b', 'c', 'intruso']);
  assert.ok(posicoes.some(([q, p]) => q === 'c' && p === 2) && posicoes.some(([q, p]) => q === 'c' && p === 1), JSON.stringify(posicoes));
  assert.deepStrictEqual(fila.situacao(), { ativos: 0, esperando: 0, maximo: 1 });
});

caso('fila: prazo, cancelamento pelo sinal, remover por id e erro próprio de prazo (o do PDF)', async () => {
  const fila = criarFila(() => 1);
  const s = await fila.reservar();
  await assert.rejects(fila.reservar({ prazoMs: 20 }), e => e.timeout === true);
  const cheia = Object.assign(new Error('fila cheia'), { status: 503 });
  await assert.rejects(fila.reservar({ prazoMs: 20, erroPrazo: () => cheia }), e => e === cheia);
  const ctrl = new AbortController();
  const p = fila.reservar({ signal: ctrl.signal });
  ctrl.abort();
  await assert.rejects(p, e => e.cancelado === true);
  const q = fila.reservar({ id: 'x' }).catch(e => e);
  assert.strictEqual(fila.remover('x'), true);
  assert.ok((await q).cancelado);
  assert.strictEqual(fila.remover('nao-existe'), false);
  assert.strictEqual(fila.situacao().esperando, 0);
  s(); s(); // soltar duas vezes não devolve duas vagas
  assert.strictEqual(fila.situacao().ativos, 0);
  await esperar(5);
});

caso('fila: a forma adquirir/liberar (assistente e agentes) com o estado de sempre', async () => {
  const f = new Fila(2);
  await f.adquirir('a'); await f.adquirir('b');
  const c = f.adquirir('c');
  assert.deepStrictEqual(f.estado(), { rodando: 2, esperando: 1, maximo: 2 });
  f.liberar();
  await c;
  assert.deepStrictEqual(f.estado(), { rodando: 2, esperando: 0, maximo: 2 });
  f.liberar(); f.liberar(); f.liberar(); // liberar a mais não fica negativo
  assert.strictEqual(f.estado().rodando, 0);
});

caso('dataLocalIso: Date à meia-noite local, texto, vazio e data inválida', () => {
  assert.strictEqual(dataLocalIso(new Date(2026, 0, 31)), '2026-01-31');
  assert.strictEqual(dataLocalIso(new Date(2026, 11, 1, 23, 59)), '2026-12-01');
  assert.strictEqual(dataLocalIso('2026-03-05T10:00:00Z'), '2026-03-05');
  assert.strictEqual(dataLocalIso(null), null);
  assert.strictEqual(dataLocalIso(''), null);
  assert.strictEqual(dataLocalIso(new Date('x')), null);
});

caso('moedaTexto: milhar, centavos, negativo, nulo e espaço comum (sem NBSP)', () => {
  assert.strictEqual(moedaTexto(1234.5), 'R$ 1.234,50');
  assert.strictEqual(moedaTexto(0), 'R$ 0,00');
  assert.strictEqual(moedaTexto(null), 'R$ 0,00');
  assert.strictEqual(moedaTexto(null, { vazio: '—' }), '—');
  assert.strictEqual(moedaTexto(1000000), 'R$ 1.000.000,00');
  assert.ok(!/ /.test(moedaTexto(-3) + moedaTexto(10)));
});

caso('chaveBusca: sem acento, minúsculas e espaços juntados; o resto do texto comum continua', () => {
  assert.strictEqual(chaveBusca('  Cabo   Flexível\t2,5 mm² '), 'cabo flexivel 2,5 mm²');
  assert.strictEqual(chaveBusca(null), '');
  assert.strictEqual(chaveBusca(0), '0');
  assert.strictEqual(semAcento('Ação'), 'Acao');
  assert.strictEqual(chaveNome('Clínica São José-2'), 'CLINICA SAO JOSE 2');
});

caso('material ativo por descrição: a expressão do índice único dos dois lados (e o encontrarExistente usa)', async () => {
  const consultas = [];
  const client = { query: async (sql, params) => { consultas.push([sql, params]); return { rows: /LOWER\(TRIM\(descricao\)\) = LOWER\(TRIM\(\$1\)\)/.test(sql) ? [{ id: 9, descricao: 'Cabo  PP' }] : [] }; } };
  const m = await materialAtivoPorDescricao(client, ' cabo  pp ', 'id');
  assert.deepStrictEqual(m, { id: 9, descricao: 'Cabo  PP' });
  assert.match(consultas[0][0], /SELECT id FROM materiais WHERE ativo = true AND LOWER\(TRIM\(descricao\)\) = LOWER\(TRIM\(\$1\)\)/);
  assert.deepStrictEqual(consultas[0][1], [' cabo  pp ']); // vai como veio: quem normaliza é o banco, igual ao índice
  const achado = await encontrarExistente(client, { porChave: new Map(), porCodigo: new Map() }, 'Cabo  PP');
  assert.strictEqual(achado.criterio, 'descrição igual');
  const vazio = { query: async () => ({ rows: [] }) };
  assert.strictEqual(await materialAtivoPorDescricao(vazio, 'nada'), null);
});

caso('Pix das 22h fica no dia dele (Brasília), não no dia seguinte em UTC', () => {
  const { agrupar } = require('../src/services/atribuicaoObras');
  const [g] = agrupar([
    { tipo: 'realizado', nome: 'Fornecedor Sintético', valor: 10, data_hora: '2026-03-10T22:30:00-03:00' },
    { tipo: 'realizado', nome: 'Fornecedor Sintético', valor: 5.105, data_hora: '2026-03-02T09:00:00-03:00' },
  ]);
  assert.strictEqual(g.de, '2026-03-02');
  assert.strictEqual(g.ate, '2026-03-10'); // em UTC já seria 11/03
  assert.strictEqual(g.total, 15.11); // arredondamento comum (base/dinheiro)
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`revisão 2.38: ${ok}/${casos.length} casos ok`);
  await require('../src/config/database').end().catch(() => {});
})();
