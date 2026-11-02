// Revisão da proposta antes do envio: cada regra aponta o problema certo, proposta limpa sai sem alerta e
// a parte do banco confere a leitura real. A parte do banco só roda em hm_orcamentos_v2.
const assert = require('assert');
const { revisar } = require('../src/services/revisaoPreEnvio');
const { chaveDescricao } = require('../src/services/precosVendidos');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };
const codigos = (r) => r.achados.map(a => a.codigo);

const secoes = [{ id: 1, nome: 'Materiais' }, { id: 2, nome: 'Mão de Obra' }];
const item = (id, descricao, quantidade, valor_unitario, extra = {}) => ({ id, secao_id: 1, descricao, quantidade, unidade: 'm', valor_unitario, status: 'confirmado', ...extra });
// materiais 1.000 + mão de obra 100 = 1.100, com BDI de 20 % = 1.320
const maoDeObra = item(9, 'Instalação do cabeamento', 10, 10, { secao_id: 2, unidade: 'h' });
const base = (extra = {}) => ({
  proposta: { total: 1320, bdi: 20, imposto_venda: 0, imposto_servico: 0, data: '2026-11-01', validade: 10, local_obra: 'Brasília', pagamento: '50 % na entrada', status: 'Ativa', ...(extra.proposta || {}) },
  secoes, itens: extra.itens || [item(1, 'Cabo 2,5 mm²', 100, 10), maoDeObra],
  hoje: '2026-11-02', ...extra.resto,
});

(async () => {
  await caso('proposta correta não tem nenhum alerta', () => {
    const r = revisar(base());
    assert.strictEqual(r.nivel, 'ok');
    assert.deepStrictEqual(r.achados.filter(a => a.nivel !== 'info').length, 0);
    assert.strictEqual(r.itens_conferidos, 2);
  });

  await caso('sem itens e total zero bloqueiam', () => {
    assert.deepStrictEqual(codigos(revisar(base({ itens: [] }))).slice(0, 1), ['sem_itens']);
    assert.strictEqual(revisar(base({ itens: [] })).nivel, 'bloqueio');
    const r = revisar(base({ proposta: { total: 0 } }));
    assert.ok(codigos(r).includes('total_zero') && r.nivel === 'bloqueio');
  });

  await caso('total gravado diferente dos itens bloqueia; diferença de centavos passa', () => {
    const r = revisar(base({ proposta: { total: 1000 } }));
    assert.ok(codigos(r).includes('total_defasado'));
    assert.match(r.achados.find(a => a.codigo === 'total_defasado').mensagem, /salve de novo/);
    assert.ok(!codigos(revisar(base({ proposta: { total: 1320.03 } }))).includes('total_defasado'));
  });

  await caso('item a cotar, preço zero, repetido e descrição de rascunho', () => {
    const itens = [
      item(1, 'Cabo 2,5 mm²', 100, 10),
      item(2, 'Eletroduto', 10, 5, { status: 'a_cotar' }),
      item(3, 'Disjuntor', 2, 0, { unidade: 'un' }),
      item(4, 'cabo 2,5 MM²', 5, 10),
      item(5, 'XXX verificar', 1, 1),
    ];
    const r = revisar(base({ itens, proposta: { total: 0.01 } }));
    const c = codigos(r);
    for (const esperado of ['a_cotar', 'preco_zero', 'repetidos', 'descricao_provisoria']) assert.ok(c.includes(esperado), esperado);
    assert.match(r.achados.find(a => a.codigo === 'a_cotar').mensagem, /Eletroduto/);
    assert.ok(!r.achados.find(a => a.codigo === 'preco_zero').mensagem.includes('Eletroduto'), 'item a cotar não conta como preço zero');
  });

  await caso('quantidade fracionada só em unidade inteira; item com quantidade zero é ignorado', () => {
    const itens = [item(1, 'Tomada', 2.5, 10, { unidade: 'un' }), item(2, 'Cabo', 10.5, 10), item(3, 'Item apagado', 0, 0)];
    const r = revisar(base({ itens, proposta: { total: 0.01 } }));
    const q = r.achados.find(a => a.codigo === 'quantidade_quebrada');
    assert.ok(q.mensagem.includes('Tomada') && !q.mensagem.includes('Cabo'));
    assert.strictEqual(r.itens_conferidos, 2);
    assert.ok(!codigos(r).includes('preco_zero'), 'quantidade zero não é lançamento');
  });

  await caso('preço contra o já vendido e contra o custo de compra do catálogo', () => {
    const itens = [item(1, 'Cabo 2,5 mm²', 100, 10, { material_id: 7 })];
    const faixas = { 7: { propostas: 3, minimo: 12, mediana: 13, maximo: 14, ultimo: 13 } };
    const abaixo = revisar(base({ itens, resto: { faixas } }));
    assert.ok(codigos(abaixo).includes('abaixo_do_vendido'));
    assert.ok(!codigos(revisar(base({ itens: [item(1, 'Cabo', 100, 11.6, { material_id: 7 })], resto: { faixas }, proposta: { total: 1392 } }))).includes('abaixo_do_vendido'), 'dentro de 5 % do menor');
    const caro = revisar(base({ itens: [item(1, 'Cabo', 100, 25, { material_id: 7 })], resto: { faixas }, proposta: { total: 3000 } }));
    assert.ok(codigos(caro).includes('acima_do_vendido'));
    assert.strictEqual(caro.achados.find(a => a.codigo === 'acima_do_vendido').nivel, 'info');
    const custo = revisar(base({ itens, resto: { custos: { 7: 11 } } }));
    assert.ok(codigos(custo).includes('abaixo_do_custo'));
    assert.ok(!codigos(revisar(base({ itens: [item(1, 'Sem catálogo', 100, 1)], proposta: { total: 120 }, resto: { faixas, custos: { 7: 11 } } }))).includes('abaixo_do_custo'), 'sem material_id não compara');
  });

  await caso('BDI zerado avisa, exceto com BDI diferenciado de materiais; impostos zerados é só lembrete', () => {
    const zero = revisar(base({ proposta: { bdi: 0, total: 1100 } }));
    assert.ok(codigos(zero).includes('bdi_zero'));
    assert.strictEqual(zero.achados.find(a => a.codigo === 'impostos_zerados').nivel, 'info');
    const dif = revisar(base({ proposta: { bdi: 0, bdi_materiais: 15, total: 1250 } }));
    assert.ok(!codigos(dif).includes('bdi_zero'));
  });

  await caso('item digitado à mão (sem material) usa a faixa achada pela descrição e unidade, e o custo do catálogo pelo nome', () => {
    const itens = [item(1, 'Cabo flexível 2,5 mm²', 100, 10), maoDeObra];
    const faixasDescricao = { [chaveDescricao('CABO FLEXIVEL 2,5 MM²', 'm')]: { propostas: 2, minimo: 12, mediana: 13, maximo: 14, ultimo: 13 } };
    assert.ok(codigos(revisar(base({ itens, resto: { faixasDescricao } }))).includes('abaixo_do_vendido'));
    assert.ok(!codigos(revisar(base({ itens: [item(1, 'Cabo flexível 2,5 mm²', 100, 10, { unidade: 'rolo' }), maoDeObra], resto: { faixasDescricao } }))).includes('abaixo_do_vendido'), 'outra unidade = outro preço');
    assert.ok(codigos(revisar(base({ itens, resto: { custosDescricao: { 'cabo flexivel 2,5 mm²': 11 } } }))).includes('abaixo_do_custo'));
    // o material do catálogo tem prioridade sobre a descrição
    const ligado = [item(1, 'Cabo flexível 2,5 mm²', 100, 10, { material_id: 7 }), maoDeObra];
    assert.ok(!codigos(revisar(base({ itens: ligado, resto: { faixas: { 7: { minimo: 9, maximo: 11 } }, faixasDescricao } }))).includes('abaixo_do_vendido'));
  });

  await caso('descrição longa não engole o valor da mensagem', () => {
    const longo = 'Cabo de cobre flexível isolado 750 V antichama com bitola de dois vírgula cinco milímetros quadrados na cor azul';
    const r = revisar(base({ itens: [item(1, longo, 100, 10, { material_id: 7 }), maoDeObra], resto: { faixas: { 7: { minimo: 12, maximo: 14 } } } }));
    const m = r.achados.find(a => a.codigo === 'abaixo_do_vendido').mensagem;
    assert.ok(m.includes('R$ 10,00') && m.includes('R$ 12,00'), m);
    assert.ok(!m.includes(longo), 'o nome é cortado');
  });

  await caso('escopo básico: só material pede confirmação; só mão de obra é lembrete; proposta completa não avisa', () => {
    const soMaterial = revisar(base({ itens: [item(1, 'Cabo', 100, 10)], proposta: { total: 1200 } }));
    assert.strictEqual(soMaterial.achados.find(a => a.codigo === 'sem_mao_de_obra').nivel, 'atencao');
    const soMao = revisar(base({ itens: [maoDeObra], proposta: { total: 120 } }));
    assert.strictEqual(soMao.achados.find(a => a.codigo === 'so_mao_de_obra').nivel, 'info');
    assert.ok(!codigos(revisar(base())).some(c => c === 'sem_mao_de_obra' || c === 'so_mao_de_obra'));
  });

  await caso('validade vencida só vale para proposta Ativa (as outras já têm o aviso de status)', () => {
    const antiga = { data: '2026-01-01', validade: 10 };
    assert.ok(codigos(revisar(base({ proposta: { ...antiga, status: 'Ativa' } }))).includes('vencida'));
    for (const status of ['Aprovada', 'Recusada', 'Cancelada']) {
      const c = codigos(revisar(base({ proposta: { ...antiga, status } })));
      assert.ok(!c.includes('vencida') && c.includes('status'), status);
    }
  });

  await caso('validade vencida usa a data da proposta + dias; data como Date do driver também', () => {
    assert.ok(codigos(revisar(base({ proposta: { data: '2026-10-01', validade: 10 } }))).includes('vencida'));
    assert.ok(!codigos(revisar(base({ proposta: { data: '2026-10-23', validade: 10 } }))).includes('vencida'), 'vence hoje ainda vale');
    const comoDate = revisar(base({ proposta: { data: new Date(2026, 9, 1), validade: 10 } }));
    assert.match(comoDate.achados.find(a => a.codigo === 'vencida').mensagem, /11\/10\/2026/);
    assert.ok(!codigos(revisar(base({ proposta: { data: '2026-01-01', validade: 0 } }))).includes('vencida'), 'validade 0 = sem prazo');
  });

  await caso('local, pagamento, status diferente de Ativa e envio anterior', () => {
    const r = revisar(base({ proposta: { local_obra: '  ', pagamento: null, status: 'Recusada' }, resto: { eventosEmail: [{ criado_em: new Date(2026, 10, 1), detalhes: 'Enviada por e-mail para a@b.c' }] } }));
    const c = codigos(r);
    for (const esperado of ['sem_local', 'sem_pagamento', 'status', 'ja_enviada']) assert.ok(c.includes(esperado), esperado);
    assert.match(r.achados.find(a => a.codigo === 'ja_enviada').mensagem, /01\/11\/2026/);
  });

  await caso('ordem: bloqueio, atenção, informação; resumo conta cada nível', () => {
    const r = revisar(base({ itens: [], proposta: { bdi: 0, local_obra: '' } }));
    const niveis = r.achados.map(a => a.nivel);
    assert.deepStrictEqual(niveis, [...niveis].sort((a, b) => ['bloqueio', 'atencao', 'info'].indexOf(a) - ['bloqueio', 'atencao', 'info'].indexOf(b)));
    assert.strictEqual(r.resumo.bloqueios, 1);
    assert.ok(r.resumo.atencoes >= 2 && r.resumo.infos >= 1);
  });

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`revisaoPreEnvio: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const { revisarProposta } = require('../src/services/revisaoPreEnvio');
    const limpar = async () => {
      await pool.query("DELETE FROM propostas WHERE numero LIKE 'ZZR%'").catch(() => {});
      await pool.query("DELETE FROM materiais WHERE descricao LIKE 'ZZ ELETRODUTO%'").catch(() => {});
    };
    try {
      await limpar();
      await caso('banco: lê proposta, seções e itens reais; inexistente devolve null', async () => {
        const { rows: [p] } = await pool.query(
          `INSERT INTO propostas (numero, sequencial, data, validade, cliente_nome, bdi, total, status)
           VALUES ('ZZR001', 990001, '2026-01-01', 5, 'ZZ Cliente', 0, 500, 'Ativa') RETURNING id`);
        const { rows: [s] } = await pool.query("INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1, 'Materiais', 0) RETURNING id", [p.id]);
        await pool.query(
          `INSERT INTO proposta_itens (proposta_id, secao_id, descricao, quantidade, unidade, valor_unitario, valor_total, status, ordem)
           VALUES ($1, $2, 'ZZ item a cotar', 10, 'm', 50, 500, 'a_cotar', 0)`, [p.id, s.id]);
        await pool.query("INSERT INTO proposta_eventos (proposta_id, acao, detalhes) VALUES ($1, 'email', 'Enviada por e-mail para zz@zz.zz')", [p.id]);
        const r = await revisarProposta(p.id);
        const c = codigos(r);
        for (const esperado of ['a_cotar', 'bdi_zero', 'vencida', 'sem_local', 'sem_pagamento', 'ja_enviada', 'sem_mao_de_obra']) assert.ok(c.includes(esperado), esperado + ' em ' + c.join(','));
        assert.ok(!c.includes('total_defasado'), 'total gravado 500 = itens 500 sem BDI');
        assert.strictEqual(await revisarProposta(999999999), null);
      });

      await caso('banco: item digitado à mão acha a faixa vendida e o custo do catálogo pela descrição (acento e caixa não importam)', async () => {
        const nova = async (numero, seq, status) => (await pool.query(
          "INSERT INTO propostas (numero, sequencial, data, validade, cliente_nome, bdi, total, status) VALUES ($1, $2, '2026-11-01', 30, 'ZZ Cliente', 0, 1, $3) RETURNING id", [numero, seq, status])).rows[0].id;
        const comItem = async (propostaId, descricao, unidade, vu, status = 'confirmado') => {
          const { rows: [s] } = await pool.query("INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1, 'Materiais', 0) RETURNING id", [propostaId]);
          await pool.query(
            "INSERT INTO proposta_itens (proposta_id, secao_id, descricao, quantidade, unidade, valor_unitario, valor_total, status, ordem) VALUES ($1, $2, $3, 1, $4, $5, $5, $6, 0)",
            [propostaId, s.id, descricao, unidade, vu, status]);
        };
        await comItem(await nova('ZZR010', 990010, 'Aprovada'), 'ZZ Eletroduto Flexível  Corrugado', 'm', 20);
        await comItem(await nova('ZZR011', 990011, 'Recusada'), 'ZZ Eletroduto Flexível Corrugado', 'm', 1);   // recusada não conta
        await pool.query("INSERT INTO materiais (descricao, categoria, unidade, preco, preco_compra) VALUES ('ZZ ELETRODUTO FLEXIVEL CORRUGADO', 'Teste', 'm', 30, 25)");
        const aberta = await nova('ZZR012', 990012, 'Ativa');
        await comItem(aberta, 'zz eletroduto flexivel corrugado', 'm', 10);
        const r = await revisarProposta(aberta);
        const c = codigos(r);
        assert.ok(c.includes('abaixo_do_vendido'), 'faixa pela descrição: ' + c.join(','));
        assert.ok(c.includes('abaixo_do_custo'), 'custo do catálogo pelo nome: ' + c.join(','));
        assert.ok(r.achados.find(a => a.codigo === 'abaixo_do_vendido').mensagem.includes('R$ 20,00'), r.achados.find(a => a.codigo === 'abaixo_do_vendido').mensagem);
      });
    } finally {
      await limpar();
      await pool.end();
    }
  }

  console.log(`revisaoPreEnvio: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
