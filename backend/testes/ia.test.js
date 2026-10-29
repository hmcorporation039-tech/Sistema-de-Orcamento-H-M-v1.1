// Módulo único de IA (services/ia.js): ordem da cadeia, troca de provedor, timeout,
// validação da resposta e uso pelos serviços — com provedores FALSOS (nenhuma
// chamada de IA de verdade, nenhum acesso ao banco). Rodar: npm test (pasta backend).
const assert = require('assert');
const pool = require('../src/config/database');
const ia = require('../src/services/ia');
const { criarIA, ordemConfigurada, ORDEM_PADRAO, PROVEDORES } = ia;

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

// provedor falso: `resposta` é valor, erro ou função (pedido) => valor
function falso(id, resposta, { disponivel = true, chamadas = [] } = {}) {
  return {
    id, rotulo: id.toUpperCase(), timeoutPadrao: () => 1000,
    disponivel: (o) => (typeof disponivel === 'function' ? disponivel(o) : disponivel),
    configurado: () => true,
    async executar(pedido) {
      chamadas.push({ id, ...pedido });
      if (resposta instanceof Error) throw resposta;
      return typeof resposta === 'function' ? resposta(pedido) : resposta;
    },
  };
}
const cadeia = (provs, ordem) => criarIA({ provedores: Object.fromEntries(provs.map(p => [p.id, p])), ordem: () => ordem || provs.map(p => p.id), registrarLog: false });

caso('ordem padrão = preferência do usuário: Claude Max → API → Gemini', () => {
  assert.deepStrictEqual(ORDEM_PADRAO, ['claude_max', 'claude_api', 'gemini']);
  assert.deepStrictEqual(ordemConfigurada(''), ORDEM_PADRAO);
  assert.deepStrictEqual(Object.keys(PROVEDORES).sort(), [...ORDEM_PADRAO].sort());
});

caso('IA_ORDEM: troca a ordem, aceita apelidos, ignora repetido/desconhecido', () => {
  assert.deepStrictEqual(ordemConfigurada('gemini, max'), ['gemini', 'claude_max']);
  assert.deepStrictEqual(ordemConfigurada('api,claude,claude_api,gemini'), ['claude_api', 'gemini']);
  assert.deepStrictEqual(ordemConfigurada('chatgpt'), ORDEM_PADRAO, 'só desconhecido → padrão');
});

caso('primeiro que responde ganha; quem falhou antes fica registrado', async () => {
  const chamadas = [];
  const c = cadeia([falso('a', new Error('sem login'), { chamadas }), falso('b', { x: 1 }, { chamadas }), falso('c', { x: 2 }, { chamadas })]);
  const r = await c.perguntarJSON('p', { finalidade: 'teste' });
  assert.deepStrictEqual([r.provedor, r.fonte, r.json], ['b', 'B', { x: 1 }]);
  assert.deepStrictEqual(chamadas.map(x => x.id), ['a', 'b'], 'não chama o terceiro');
  const s = c.status().provedores;
  assert.strictEqual(s.find(p => p.id === 'a').falhas, 1);
  assert.match(s.find(p => p.id === 'a').ultimoErro.mensagem, /sem login/);
  assert.strictEqual(s.find(p => p.id === 'b').sucessos, 1);
  assert.strictEqual(s.find(p => p.id === 'b').ultimoSucesso.finalidade, 'teste');
});

caso('provedor indisponível é pulado; ordem configurada manda', async () => {
  const chamadas = [];
  const c = cadeia([falso('a', { de: 'a' }, { chamadas, disponivel: false }), falso('b', { de: 'b' }, { chamadas }), falso('c', { de: 'c' }, { chamadas })], ['c', 'a', 'b']);
  assert.strictEqual((await c.perguntarJSON('p')).provedor, 'c');
  assert.deepStrictEqual(c.status().ordem, ['c', 'a', 'b']);
});

caso('nenhum disponível → erro claro com `indisponivel`', async () => {
  const c = cadeia([falso('a', {}, { disponivel: false })]);
  assert.strictEqual(c.disponivel(), false);
  await assert.rejects(c.perguntarJSON('p'), e => e.indisponivel && /Nenhuma IA disponível/.test(e.message));
});

caso('todos falham → erro com a lista de erros na ordem', async () => {
  const c = cadeia([falso('a', new Error('cota')), falso('b', new Error('sem crédito'))]);
  await assert.rejects(c.perguntarJSON('p'), e => e.indisponivel && e.erros.map(x => x.provedor).join() === 'a,b' && /A: cota \| B: sem crédito/.test(e.message));
});

caso('timeout: provedor pendurado não trava a cadeia', async () => {
  const preso = { ...falso('a', null), executar: () => new Promise(() => {}), timeoutPadrao: () => 1 };
  const c = cadeia([preso, falso('b', { ok: true })]);
  const inicio = Date.now();
  // timeoutMs pequeno + folga interna de 5 s da cadeia
  const r = await c.perguntarJSON('p', { timeoutMs: 20 });
  assert.strictEqual(r.provedor, 'b');
  assert.ok(Date.now() - inicio < 8000);
  assert.match(c.status().provedores.find(p => p.id === 'a').ultimoErro.mensagem, /sem resposta/);
});

caso('aceitar(): resposta vazia passa ao próximo, mas o último é aceito', async () => {
  const aceitar = (json, { ultimo }) => ultimo || (json?.ofertas || []).length > 0;
  const c1 = cadeia([falso('a', { ofertas: [] }), falso('b', { ofertas: [1] })]);
  assert.strictEqual((await c1.pesquisarWeb('p', { aceitar })).provedor, 'b');
  const c2 = cadeia([falso('a', { ofertas: [] }), falso('b', null)]);
  const r = await c2.pesquisarWeb('p', { aceitar });
  assert.strictEqual(r.provedor, 'b');
  assert.strictEqual(r.json, null);
});

caso('web, documento e anexo chegam ao provedor; prompt próprio vai literal', async () => {
  const chamadas = [];
  const c = cadeia([falso('a', new Error('x'), { chamadas }), falso('b', {}, { chamadas })]);
  await c.pesquisarWeb('procure', {});
  assert.ok(chamadas.every(x => x.web === true && x.prompt === 'procure' && x.literal === false));
  chamadas.length = 0;
  await c.perguntarJSON({ padrao: 'geral', b: 'só do b' }, { documento: 'DOC', anexo: { tipo: 'pdf', buffer: Buffer.from('x') } });
  assert.deepStrictEqual(chamadas.map(x => [x.id, x.prompt, x.literal, x.documento, x.anexo.tipo, x.web]), [['a', 'geral', false, 'DOC', 'pdf', false], ['b', 'só do b', true, 'DOC', 'pdf', false]]);
});

caso('status do painel não expõe chaves', () => {
  const chave = 'sk-teste-' + 'x'.repeat(30);
  const antes = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = chave;
  try {
    const s = JSON.stringify(ia.status());
    assert.ok(!s.includes(chave));
    assert.ok(ia.status().provedores.find(p => p.id === 'claude_api').configurado);
  } finally {
    if (antes === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = antes;
  }
});

caso('COTACAO_IA=desligada: sem IA nas perguntas; na web só sai o Claude Max (como na 1.x)', () => {
  const antes = process.env.COTACAO_IA;
  process.env.COTACAO_IA = 'desligada';
  try {
    assert.strictEqual(PROVEDORES.claude_max.disponivel({ web: true }), false);
    assert.strictEqual(PROVEDORES.gemini.disponivel({ web: false }), false);
    assert.strictEqual(PROVEDORES.claude_api.disponivel({ web: false }), false);
    if (process.env.GEMINI_API_KEY) assert.strictEqual(PROVEDORES.gemini.disponivel({ web: true }), true);
  } finally {
    if (antes === undefined) delete process.env.COTACAO_IA; else process.env.COTACAO_IA = antes;
  }
});

// ── Uso pelos serviços (cadeia falsa no lugar da padrão) ─────────────────
function trocar(obj, nome, valor) { const antigo = obj[nome]; obj[nome] = valor; return () => { obj[nome] = antigo; }; }

caso('pesquisa de mercado: Claude Max sem oferta → API; grava fonte "claude", ofertas validadas e média', async () => {
  const consultas = [];
  const desfazer = [
    trocar(pool, 'query', async (sql, params) => { consultas.push({ sql, params }); return { rows: [] }; }),
  ];
  const c = cadeia([
    falso('claude_max', { ofertas: [] }),
    falso('claude_api', { ofertas: [{ fonte: 'Loja A', produto: 'Cabo', preco: 'R$ 10,00', link: 'https://a.com' }, { fonte: 'Loja B', produto: 'Cabo', preco: 20, link: 'javascript:x' }], observacao: 'ok' }),
    falso('gemini', new Error('não devia chegar aqui')),
  ]);
  desfazer.push(trocar(ia, 'pesquisarWeb', c.pesquisarWeb), trocar(ia, 'disponivel', c.disponivel));
  try {
    const { pesquisarPrecoMercado } = require('../src/services/pesquisaMercado');
    const r = await pesquisarPrecoMercado('Cabo flexível 2,5 mm² teste-ia');
    assert.strictEqual(r.fonte, 'claude');
    assert.strictEqual(r.deCache, false);
    assert.deepStrictEqual(r.ofertas.map(o => [o.fonte, o.preco, o.link]), [['Loja A', 10, 'https://a.com'], ['Loja B', 20, null]]);
    assert.strictEqual(r.precoSugerido, 15);
    const insert = consultas.find(q => /INSERT INTO pesquisas_mercado/.test(q.sql));
    assert.ok(insert, 'grava no cache');
    assert.strictEqual(insert.params[3], 'claude');
    assert.strictEqual(insert.params[5], 15);
  } finally { desfazer.reverse().forEach(f => f()); }
});

caso('pesquisa de mercado: nenhuma IA respondeu → erro 502 com o motivo de cada uma', async () => {
  const desfazer = [trocar(pool, 'query', async () => ({ rows: [] }))];
  const c = cadeia([falso('claude_max', new Error('sem login')), falso('gemini', new Error('cota do dia'))]);
  desfazer.push(trocar(ia, 'pesquisarWeb', c.pesquisarWeb), trocar(ia, 'disponivel', c.disponivel));
  try {
    const { pesquisarPrecoMercado } = require('../src/services/pesquisaMercado');
    await assert.rejects(pesquisarPrecoMercado('item qualquer teste-ia'), e => e.status === 502 && /claude_max: sem login \| gemini: cota do dia/.test(e.message));
  } finally { desfazer.reverse().forEach(f => f()); }
});

caso('leitura de orçamento: mesmos textos da 1.x por provedor, esquema fixo e normalização', async () => {
  let pedido;
  const desfazer = trocar(ia, 'perguntarJSON', async (prompt, opcoes) => {
    pedido = { prompt, opcoes };
    return { provedor: 'claude_api', fonte: 'Claude', json: { eh_orcamento_de_fornecedor: true, total_documento: '30', itens: [{ descricao: ' Cabo   PP ', quantidade: 3, preco_unitario: 10, total_linha: 30, ncm: '8544.49.00' }] } };
  });
  try {
    const { extrairComIA } = require('../src/services/leitorCotacaoIA');
    const r = await extrairComIA(Buffer.from('%PDF'), 'pdf');
    assert.strictEqual(r.fonte, 'Claude');
    assert.deepStrictEqual([r.ehOrcamento, r.totalDocumento, r.itens[0].descricao, r.itens[0].ncm, r.itens[0].unidade], [true, 30, 'Cabo PP', '85444900', 'un']);
    assert.match(pedido.prompt.claude_max, /H&M é o CLIENTE[\s\S]*\nFormato do JSON: \{"eh_orcamento_de_fornecedor"/);
    assert.match(pedido.prompt.gemini, /\nResponda SOMENTE com JSON neste formato: \{"eh_orcamento/);
    assert.doesNotMatch(pedido.prompt.claude_api, /Formato do JSON/, 'na API o formato vem do esquema');
    assert.strictEqual(pedido.opcoes.esquema.name, 'registrar_itens_cotacao');
    assert.strictEqual(pedido.opcoes.anexo.tipo, 'pdf');
  } finally { desfazer(); }
});

caso('classificação e equipamentos usam a cadeia única', async () => {
  const pedidos = [];
  const desfazer = [
    trocar(ia, 'perguntarJSON', async (prompt, opcoes) => { pedidos.push({ prompt, opcoes }); return { provedor: 'gemini', fonte: 'Gemini', json: { itens: [{ descricao: 'Luminária LED 18 W', referencia: 'ABC-1' }, { descricao: 'x' }] } }; }),
    trocar(ia, 'disponivel', () => true),
  ];
  try {
    const { extrairEquipamentosComIA } = require('../src/services/equipamentoExtratorIA');
    const r = await extrairEquipamentosComIA('texto do projeto');
    assert.deepStrictEqual(r.itens, [{ descricao: 'Luminária LED 18 W', referencia_fabricante: 'ABC-1' }]);
    assert.strictEqual(pedidos[0].opcoes.documento, 'texto do projeto', 'texto longo vai como documento (arquivo na CLI)');
  } finally { desfazer.reverse().forEach(f => f()); }
});

caso('argumentos da CLI isolada continuam em ia.js (mesma função do teste de segurança)', () => {
  assert.strictEqual(require('../src/services/leitorCotacaoIA').argsClaudeMax, ia.argsClaudeMax);
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
  }
  console.log(`ia: ${ok}/${casos.length} casos ok`);
  await pool.end().catch(() => {});
})();
