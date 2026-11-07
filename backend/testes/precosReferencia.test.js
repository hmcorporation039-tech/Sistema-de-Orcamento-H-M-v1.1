// Preços de referência de mão de obra: segmento do cliente (oficial/governo ×
// particular), prioridade da sugestão e roteiro de fontes de cada pesquisa.
// Também a regra "a IA só sugere" (06/11/2026): preço lido por IA não confirma item, item do assistente não ensina,
// mão de obra pelo vendido antes da web. Sem IA de verdade; a parte com banco só roda no banco de teste do v2.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const { segmentoDoCliente, valorSugerido } = require('../src/services/precosMaoDeObraReferencia');
const { promptServicoSegmento, SEGMENTOS_MO } = require('../src/services/pesquisaMercado');

let ok = 0;
function caso(nome, fn) {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
}

caso('segmento pelo cadastro do cliente: "Órgão Público" → oficial; Empresa/Pessoa Física → particular', () => {
  assert.strictEqual(segmentoDoCliente('Órgão Público', 'Qualquer'), 'publico');
  assert.strictEqual(segmentoDoCliente('Empresa', 'Secretaria de Saúde'), 'privado'); // o cadastro manda
  assert.strictEqual(segmentoDoCliente('Pessoa Física', 'João'), 'privado');
});

caso('sem cadastro, o nome do cliente indica órgão público', () => {
  for (const n of ['SECRETARIA DE ESTADO DE EDUCAÇÃO DO DF', 'Tribunal Regional Federal', 'Prefeitura Municipal de Formosa', 'Universidade Federal de Goiás', 'NOVACAP', 'Câmara Legislativa do DF', 'Corpo de Bombeiros Militar'])
    assert.strictEqual(segmentoDoCliente(null, n), 'publico', n);
  for (const n of ['Condomínio Residencial Exemplo', 'Clínica Exemplo LTDA', 'Cliente Exemplo', '', null])
    assert.strictEqual(segmentoDoCliente(null, n), 'privado', String(n));
});

caso('sugestão: valor H&M adotado tem prioridade; senão a referência do segmento', () => {
  const r = { hm: 120, publico: 95.5, privado: 150 };
  assert.strictEqual(valorSugerido(r, 'publico'), 120);
  assert.strictEqual(valorSugerido({ ...r, hm: null }, 'publico'), 95.5);
  assert.strictEqual(valorSugerido({ ...r, hm: null }, 'privado'), 150);
  assert.strictEqual(valorSugerido({ hm: null, publico: 95.5, privado: null }, 'privado'), null); // não mistura segmentos
});

caso('pesquisa oficial pede SINAPI/ORSE/licitações com código, data e UF; particular pede mercado e honorários', () => {
  const pub = promptServicoSegmento('Instalação de ponto de tomada', 'un', 'publico');
  assert.match(pub, /SINAPI/); assert.match(pub, /ORSE/); assert.match(pub, /Painel de Preços/); assert.match(pub, /UF DF/); assert.match(pub, /desonerado/);
  assert.match(pub, /por un\b/); assert.match(pub, /Não invente/);
  const pri = promptServicoSegmento('Laudo de SPDA com ART', 'vb', 'privado');
  assert.match(pri, /particulares/); assert.match(pri, /honorários de engenharia/); assert.match(pri, /Brasília\/Distrito Federal/);
  assert.doesNotMatch(pri, /SINAPI/);
  assert.deepStrictEqual(Object.keys(SEGMENTOS_MO), ['publico', 'privado']);
});

// ── "A IA só sugere" (revisão do uso de IA de 06/11/2026) ─────────────────────
const { precoConferido, ehOrigemDaIA } = require('../src/services/catalogoMateriais');
const C = require('../src/utils/composicoes');

caso('preço conferido: lido por IA (origem/preco_origem "…_ia" ou assistente) não confirma; editado na tela confirma', () => {
  assert.strictEqual(precoConferido({ origem: 'fornecedor_email_ia', preco_manual: false }), false);
  assert.strictEqual(precoConferido({ origem: 'manual', preco_origem: 'fornecedor_whatsapp_ia', preco_manual: false }), false, 'a origem do PREÇO vale mais que a do cadastro');
  assert.strictEqual(precoConferido({ origem: 'fornecedor_email_ia', preco_manual: true }), true, 'alguém conferiu na tela');
  assert.strictEqual(precoConferido({ origem: 'fornecedor_email_ia', preco_origem: 'email_xml' }), true, 'a nota fiscal trocou o preço');
  assert.strictEqual(precoConferido({ origem: 'email_xml' }), true);
  assert.strictEqual(precoConferido({ preco_origem: 'assistente' }), false);
  assert.strictEqual(precoConferido({ id: 1, preco: 10 }), true, 'consulta sem as colunas: conferido (compatível)');
  assert.strictEqual(precoConferido(null), false);
  for (const o of ['pesquisa_ia', 'fornecedor_email_ia', 'ia']) assert.ok(ehOrigemDaIA(o), o);
  for (const o of ['midia', 'manual', 'acervo', '', null]) assert.ok(!ehOrigemDaIA(o), String(o));
});

caso('kit: material com preço lido por IA entra "a cotar" (fonte catalogo_ia), o conferido fecha', () => {
  const itens = [{ tipo: 'material', material_id: 1, coeficiente: 1, descricao: 'A', unidade: 'un' }, { tipo: 'material', material_id: 2, coeficiente: 2, descricao: 'B', unidade: 'un' }];
  const bases = { materiais: {
    1: { id: 1, descricao: 'Disjuntor 16 A', unidade: 'un', preco: 30, ativo: true, origem: 'fornecedor_email_ia', preco_manual: false },
    2: { id: 2, descricao: 'Cabo PP', unidade: 'un', preco: 10, ativo: true, origem: 'email_xml' },
  } };
  const custo = C.calcularCusto(itens, bases, 'privado');
  assert.deepStrictEqual(custo.itens.map(l => l.fonte_preco), ['catalogo_ia', 'catalogo']);
  assert.match(custo.itens[0].observacao_preco, /lido por IA/);
  const ex = C.explodirComposicao({ codigo: 'K-1', descricao: 'Kit', disciplina: 'eletrica' }, custo, 1);
  assert.deepStrictEqual(ex.itens.map(i => i.status), ['a_cotar', 'confirmado']);
});

console.log(`preços de referência: ${ok} casos ok`);

// ── parte com banco (só no banco de teste do v2) ─────────────────────────────
(async () => {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  if (process.env.DB_NAME !== 'hm_orcamentos_v2') { console.log('preços de referência: parte do banco pulada'); return; }
  const pool = require('../src/config/database');
  const marca = `TESTE-IA-SUGERE-${Date.now()}`;
  const limpar = async () => {
    await pool.query("DELETE FROM material_aliases WHERE descricao LIKE $1", [`%${marca}%`]);
    await pool.query("DELETE FROM propostas WHERE cliente_nome = $1", [marca]);
    await pool.query("DELETE FROM materiais WHERE descricao LIKE $1", [`%${marca}%`]);
    await pool.query("DELETE FROM pesquisas_mercado WHERE descricao LIKE $1", [`%${marca}%`]);
  };
  try {
    await limpar();
    // 1. proposta: item do assistente fica "a cotar", não entra no catálogo nem ensina vínculo; o confirmado por gente ensina
    const { inserirSecoesEItens } = require('../src/controllers/propostasController');
    const { rows: [mat] } = await pool.query("INSERT INTO materiais (descricao, categoria, unidade, preco, origem) VALUES ($1, 'Elétrica', 'un', 10, 'manual') RETURNING id", [`Material ${marca}`]);
    const { rows: [prop] } = await pool.query("INSERT INTO propostas (numero, sequencial, data, cliente_nome, total) VALUES ($1, 0, CURRENT_DATE, $2, 0) RETURNING id", [`T${Date.now() % 100000}`, marca]);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await inserirSecoesEItens(client, prop.id, [{ id: 1, nome: 'Materiais e Equipamentos' }], [
        { sid: 1, desc: `Pedido pela IA ${marca}`, qtd: 1, vu: 99, status: 'confirmado', material_id: mat.id, origem_item: 'assistente' },
        { sid: 1, desc: `Novo da IA ${marca}`, qtd: 1, vu: 55, status: 'a_cotar', origem_item: 'assistente' },
        { sid: 1, desc: `Conferido ${marca}`, qtd: 1, vu: 10, status: 'confirmado', material_id: mat.id },
      ]);
      await client.query('COMMIT');
    } finally { client.release(); }
    const { rows: itens } = await pool.query('SELECT descricao, status, origem_item, material_id FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem', [prop.id]);
    assert.deepStrictEqual(itens.map(i => [i.status, i.origem_item]), [['a_cotar', 'assistente'], ['a_cotar', 'assistente'], ['confirmado', null]]);
    assert.strictEqual(itens[1].material_id, null, 'item novo da IA não cadastra material no catálogo');
    assert.strictEqual((await pool.query('SELECT 1 FROM materiais WHERE descricao = $1', [`Novo da IA ${marca}`])).rowCount, 0);
    const aliases = (await pool.query('SELECT descricao FROM material_aliases WHERE descricao LIKE $1', [`%${marca}%`])).rows.map(r => r.descricao);
    assert.deepStrictEqual(aliases, [`Conferido ${marca}`], 'só o item confirmado por gente ensina o vínculo');
    console.log('  ok  proposta: item do assistente "a cotar", fora do catálogo e sem ensinar vínculo');

    // 2. cotação lida por IA: material existente sem custo recebe o preço COM a origem do preço
    const { registrarItemCotacao, carregarIndice, idsComPrecoNaoConferido } = require('../src/services/catalogoMateriais');
    const { rows: [semCusto] } = await pool.query("INSERT INTO materiais (descricao, categoria, unidade, preco, origem) VALUES ($1, 'Elétrica', 'un', 5, 'acervo') RETURNING id", [`Sem custo ${marca}`]);
    const indice = await carregarIndice(pool);
    await registrarItemCotacao(pool, indice, { descricao: `Sem custo ${marca}`, preco: 7, unidade: 'un' }, 'fornecedor_email_ia', 30);
    const { rows: [depois] } = await pool.query('SELECT preco_origem, preco_compra FROM materiais WHERE id = $1', [semCusto.id]);
    assert.deepStrictEqual([depois.preco_origem, Number(depois.preco_compra)], ['fornecedor_email_ia', 7]);
    const naoConf = await idsComPrecoNaoConferido([semCusto.id, mat.id], pool);
    assert.ok(naoConf.has(semCusto.id) && !naoConf.has(mat.id));
    console.log('  ok  cotação lida por IA: preço do material existente marcado como não conferido');

    // 3. mão de obra: o vendido nas propostas aprovadas do mesmo segmento vem antes da web
    const { referenciasInternasMaoDeObra } = require('../src/services/referenciasDePreco');
    const codigo = `livre_teste_${Date.now() % 100000}`;
    const { rows: [aprov] } = await pool.query("INSERT INTO propostas (numero, sequencial, data, cliente_nome, total, status) VALUES ($1, 0, CURRENT_DATE, $2, 0, 'Aprovada') RETURNING id", [`A${Date.now() % 100000}`, marca]);
    const { rows: [sec] } = await pool.query("INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1, 'Serviços (Mão de Obra)', 0) RETURNING id", [aprov.id]);
    for (const vu of [100, 120, 200]) {
      await pool.query("INSERT INTO proposta_itens (proposta_id, secao_id, descricao, quantidade, unidade, valor_unitario, valor_total, codigo, status, ordem) VALUES ($1,$2,$3,1,'pt',$4,$4,$5,'confirmado',0)", [aprov.id, sec.id, `Serviço ${marca}`, vu, codigo]);
    }
    const ref = await referenciasInternasMaoDeObra({ codigo, descricao: 'outra descrição', unidade: 'pt' }, 'privado', { db: pool });
    assert.ok(ref && ref.interna, 'achou pelo código');
    assert.strictEqual(ref.valor, 120, 'mediana');
    assert.strictEqual(await referenciasInternasMaoDeObra({ codigo, descricao: 'x', unidade: 'pt' }, 'publico', { db: pool }), null, 'cliente particular não serve de referência para órgão público');
    const porDescricao = await referenciasInternasMaoDeObra({ codigo: null, descricao: `serviço ${marca}`, unidade: 'PT' }, 'privado', { db: pool });
    assert.strictEqual(porDescricao?.valor, 120, 'achou pela descrição e unidade (sem acento/caixa)');
    const { pesquisarReferenciaMaoDeObra } = require('../src/services/pesquisaMercado');
    const ia = require('../src/services/ia');
    const orig = { pesquisarWeb: ia.pesquisarWeb, disponivel: ia.disponivel };
    let web = 0;
    ia.disponivel = () => true;
    ia.pesquisarWeb = async () => { web++; return { provedor: 'gemini', json: { ofertas: [] } }; };
    try {
      const r = await pesquisarReferenciaMaoDeObra(`Serviço ${marca}`, 'pt', 'privado', { codigo });
      assert.deepStrictEqual([r.valor, r.interna, web], [120, true, 0], 'sem IA');
      // 4. pesquisa na web sem oferta nenhuma: não vai para o cache (antes ficava 7 dias)
      const { pesquisarPrecoMercado } = require('../src/services/pesquisaMercado');
      await pesquisarPrecoMercado(`Nada ${marca}`, { tipo: 'servico' });
      await pesquisarPrecoMercado(`Nada ${marca}`, { tipo: 'servico' });
      assert.strictEqual(web, 2, 'a pesquisa vazia não ficou guardada');
      assert.strictEqual((await pool.query('SELECT 1 FROM pesquisas_mercado WHERE descricao LIKE $1', [`%${marca}%`])).rowCount, 0);
      // cancelada pela tela: erro próprio, sem seguir a cadeia
      ia.pesquisarWeb = async () => { throw Object.assign(new Error('pedido à IA cancelado'), { cancelado: true }); };
      await assert.rejects(pesquisarPrecoMercado(`Outra ${marca}`, { tipo: 'servico', fresco: true }), (e) => e.status === 499);
    } finally { Object.assign(ia, orig); }
    console.log('  ok  mão de obra: vendido antes da web; pesquisa vazia fora do cache; cancelamento');
  } catch (e) {
    console.error(`  FALHOU parte do banco: ${e.stack || e.message}`);
    process.exitCode = 1;
  } finally {
    await limpar().catch(() => {});
    await pool.end();
  }
})();
