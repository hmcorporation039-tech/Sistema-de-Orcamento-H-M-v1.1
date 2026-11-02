// Comparativo de fornecedores: CNPJ lido do documento, quem cotou mais barato, validade e unidade, e a
// gravação sem mexer no catálogo. A parte do banco só roda em hm_orcamentos_v2.
const assert = require('assert');
const { cnpjValido, extrairFornecedor, formatarCnpj } = require('../src/utils/cnpj');
const c = require('../src/services/cotacoesFornecedor');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };

// CNPJ de teste com dígitos verificadores certos
function cnpjDe(base12) {
  const dv = (s) => { let soma = 0, peso = s.length - 7; for (const n of s) { soma += Number(n) * peso--; if (peso < 2) peso = 9; } const r = soma % 11; return r < 2 ? 0 : 11 - r; };
  const d1 = dv(base12), d2 = dv(base12 + d1);
  return base12 + d1 + d2;
}
const F1 = cnpjDe('990000010001'), F2 = cnpjDe('990000020001'), F3 = cnpjDe('990000030001');
const cot = (cnpj, preco, data, unidade = 'm', nome = null) => ({ fornecedor_cnpj: cnpj, fornecedor_nome: nome, preco, unidade, data_cotacao: data });
const HOJE = '2026-11-02';

(async () => {
  await caso('CNPJ: valida o dígito verificador e recusa repetidos e tamanho errado', () => {
    assert.ok(cnpjValido('11.953.410/0001-73'));
    assert.ok(cnpjValido('04003376000100'));
    assert.ok(!cnpjValido('11.953.410/0001-74'));
    assert.ok(!cnpjValido('11111111111111'));
    assert.ok(!cnpjValido('1195341000017'));
  });

  await caso('fornecedor: ignora o CNPJ da H&M e a inscrição estadual, e acha o nome antes do CNPJ', () => {
    const eco = 'ECO Automação Industrial Ltda\nRua Dona Francisca, 6021 - Sala 01\n11.953.410/0001-73 / 256.095.060\nCliente: H&M ENGENHARIA 04.003.376/0001-00\n';
    assert.deepStrictEqual(extrairFornecedor(eco), { cnpj: '11953410000173', nome: 'ECO Automação Industrial Ltda' });
    const atacado = 'Página: 1\t27/08/2026 12:01\tEmitido em\tADM 1.1.5.9 R1\nDF ATACADISTA\nCNPJ:\nEndereço:\nInscrição Estadual:\n33.578.308/0001-78\n0791485600100\nCliente: 13.899 - H&M ENGENHARIA E TECNOLOGIA LTDA';
    assert.deepStrictEqual(extrairFornecedor(atacado), { cnpj: '33578308000178', nome: 'DF ATACADISTA' });
  });

  await caso('fornecedor: só o CNPJ da H&M, número inválido ou texto vazio dão null', () => {
    assert.strictEqual(extrairFornecedor('Cliente: H&M 04.003.376/0001-00'), null);
    assert.strictEqual(extrairFornecedor('Pedido 12.345.678/0001-00 total 10,00'), null);
    assert.strictEqual(extrairFornecedor(''), null);
    assert.strictEqual(extrairFornecedor(null), null);
  });

  await caso('compara: o menor preço, quanto os outros pagam a mais e o catálogo acima do menor', () => {
    const r = c.comparar({ cotacoes: [cot(F1, 80, '2026-10-20'), cot(F2, 90, '2026-10-25')], material: { unidade: 'm', preco_compra: 100 }, hoje: HOJE });
    assert.strictEqual(r.menor.cnpj, F1);
    assert.strictEqual(r.n_comparaveis, 2);
    assert.strictEqual(r.fornecedores[0].menor, true);
    assert.strictEqual(r.fornecedores[1].acima_do_menor_pct, 12.5);
    assert.strictEqual(r.diferenca_entre_fornecedores_pct, 12.5);
    assert.strictEqual(r.catalogo_acima_pct, 25);
    assert.strictEqual(r.suspeito, false);
  });

  await caso('compara: de cada fornecedor vale só a cotação mais nova', () => {
    const r = c.comparar({ cotacoes: [cot(F1, 60, '2026-09-20'), cot(F1, 85, '2026-10-30'), cot(F2, 90, '2026-10-25')], material: { unidade: 'm' }, hoje: HOJE });
    assert.strictEqual(r.fornecedores.length, 2);
    assert.strictEqual(r.menor.preco, 85);
  });

  await caso('compara: cotação com mais de 90 dias fica fora do ranking e é contada como antiga', () => {
    const r = c.comparar({ cotacoes: [cot(F1, 50, '2026-06-01'), cot(F2, 90, '2026-10-25')], material: { unidade: 'm' }, hoje: HOJE });
    assert.strictEqual(r.antigas, 1);
    assert.strictEqual(r.menor.cnpj, F2);
    assert.strictEqual(r.n_comparaveis, 1);
    assert.strictEqual(r.diferenca_entre_fornecedores_pct, null);
    assert.strictEqual(c.comparar({ cotacoes: [cot(F1, 50, '2026-08-04')], material: { unidade: 'm' }, hoje: HOJE }).antigas, 0);   // 90 dias exatos ainda vale
  });

  await caso('compara: unidade diferente da do material aparece, mas não entra na comparação', () => {
    const r = c.comparar({ cotacoes: [cot(F1, 800, '2026-10-20', 'rl'), cot(F2, 9, '2026-10-25', 'MT')], material: { unidade: 'm', preco_compra: 10 }, hoje: HOJE });
    assert.strictEqual(r.fornecedores.length, 2);
    assert.strictEqual(r.n_comparaveis, 1);
    assert.strictEqual(r.menor.cnpj, F2);
    assert.strictEqual(r.fornecedores.find(f => f.cnpj === F1).comparavel, false);
    assert.strictEqual(r.fornecedores.find(f => f.cnpj === F1).acima_do_menor_pct, null);
  });

  await caso('compara: diferença de 5× ou mais é marcada como suspeita (provável embalagem diferente)', () => {
    const r = c.comparar({ cotacoes: [cot(F1, 10, '2026-10-20'), cot(F2, 100, '2026-10-25')], material: { unidade: 'm' }, hoje: HOJE });
    assert.strictEqual(r.suspeito, true);
    const cat = c.comparar({ cotacoes: [cot(F1, 10, '2026-10-20')], material: { unidade: 'm', preco_compra: 90 }, hoje: HOJE });
    assert.strictEqual(cat.suspeito, true);
  });

  await caso('compara: sem cotação, sem custo e nome vazio não quebram; o CNPJ vira o nome', () => {
    const vazio = c.comparar({ cotacoes: [], material: { unidade: 'm' }, hoje: HOJE });
    assert.strictEqual(vazio.menor, null);
    assert.strictEqual(vazio.catalogo_acima_pct, null);
    const r = c.comparar({ cotacoes: [cot('11953410000173', 5, '2026-10-30')], material: { unidade: 'm', preco_compra: 0 }, hoje: HOJE });
    assert.strictEqual(r.fornecedores[0].nome, '11.953.410/0001-73');
    assert.strictEqual(r.custo_catalogo, null);
  });

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`cotacoesFornecedor: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const { importarItens, guardarCotacoesDoArquivo } = require('../src/services/cotacaoFornecedorService');
    const { carregarIndice } = require('../src/services/catalogoMateriais');
    const limpar = async () => {
      await pool.query("DELETE FROM materiais WHERE descricao LIKE 'ZZCOT %'").catch(() => {});
      await pool.query('DELETE FROM cotacao_fornecedores WHERE cnpj = ANY($1)', [[F1, F2, F3]]).catch(() => {});
    };
    try {
      const migracao = require('../src/models/migracoes/2.0-35-cotacoes-fornecedor');
      await migracao(pool);
      await migracao(pool);   // idempotente
      await limpar();
      const novo = async (descricao, unidade, custo) => (await pool.query(
        "INSERT INTO materiais (descricao, categoria, unidade, preco, preco_compra, origem) VALUES ($1,'Teste',$2,$3,$3,'teste') RETURNING id",
        [descricao, unidade, custo])).rows[0].id;
      const A = await novo('ZZCOT CABO FLEX 2,5MM', 'm', 100);
      const B = await novo('ZZCOT TOMADA 10A', 'un', 50);
      const indice = await carregarIndice(pool);
      const leitura = (fornecedor, itens) => ({ itens, metodo: 'teste', fornecedor });
      const item = (descricao, preco, unidade = 'm') => ({ descricao, preco, unidade, quantidade: 10 });
      const linhas = async (id) => (await pool.query('SELECT * FROM cotacoes_itens WHERE material_id = $1', [id])).rows;
      const hojeReal = c.hojeIso();
      // como na importação de verdade: uma conexão só, dentro de uma transação
      const importar = async (...args) => {
        const cl = await pool.connect();
        try { await cl.query('BEGIN'); const r = await importarItens(cl, ...args); await cl.query('COMMIT'); return r; }
        catch (e) { await cl.query('ROLLBACK').catch(() => {}); throw e; }
        finally { cl.release(); }
      };

      await caso('banco: a cotação grava o preço com o fornecedor e o catálogo não muda', async () => {
        await importar(indice, leitura({ cnpj: F1, nome: 'Fornecedor Um' }, [item('ZZCOT CABO FLEX 2,5MM', 80), item('ZZCOT TOMADA 10A', 52, 'un')]), 'fornecedor_whatsapp', 30, { documento: 'ZZ-doc1' });
        await importar(indice, leitura({ cnpj: F2, nome: null }, [item('ZZCOT CABO FLEX 2,5MM', 90)]), 'fornecedor_email', 30, { documento: 'ZZ-doc2#a.pdf' });
        assert.strictEqual((await linhas(A)).length, 2);
        assert.strictEqual((await linhas(B)).length, 1);
        const { rows: [m] } = await pool.query('SELECT preco_compra FROM materiais WHERE id = $1', [A]);
        assert.strictEqual(Number(m.preco_compra), 100);
      });

      await caso('banco: reler o mesmo documento não duplica', async () => {
        await importar(indice, leitura({ cnpj: F1, nome: 'Fornecedor Um' }, [item('ZZCOT CABO FLEX 2,5MM', 80)]), 'fornecedor_whatsapp', 30, { documento: 'ZZ-doc1' });
        assert.strictEqual((await linhas(A)).length, 2);
      });

      await caso('banco: sem contexto do documento ou sem fornecedor, nada vai para o comparativo', async () => {
        await importar(indice, leitura({ cnpj: F3, nome: 'X' }, [item('ZZCOT CABO FLEX 2,5MM', 70)]), 'fornecedor_whatsapp', 30);
        await importar(indice, leitura(null, [item('ZZCOT CABO FLEX 2,5MM', 70)]), 'fornecedor_whatsapp', 30, { documento: 'ZZ-doc3' });
        assert.strictEqual((await linhas(A)).length, 2);
      });

      await caso('banco: comparação do material e nome corrigido à mão', async () => {
        let r = await c.comparacaoDoMaterial(pool, A, hojeReal);
        assert.strictEqual(r.menor.cnpj, F1);
        assert.strictEqual(r.menor.preco, 80);
        assert.strictEqual(r.catalogo_acima_pct, 25);
        assert.strictEqual(r.fornecedores.find(f => f.cnpj === F2).nome, formatarCnpj(F2));
        await c.renomearFornecedor(pool, F2, '  Fornecedor   Dois ');
        r = await c.comparacaoDoMaterial(pool, A);
        assert.strictEqual(r.fornecedores.find(f => f.cnpj === F2).nome, 'Fornecedor Dois');
        await assert.rejects(() => c.renomearFornecedor(pool, '00000000000000', 'X'), /não encontrado/);
        await assert.rejects(() => c.renomearFornecedor(pool, F2, '   '), /Informe um nome/);
        assert.strictEqual(await c.comparacaoDoMaterial(pool, 999999999), null);
      });

      await caso('banco: oportunidades lista o material com catálogo acima e deixa de fora o que está em ordem', async () => {
        const r = await c.oportunidades(pool);
        const meu = r.itens.find(i => i.material_id === A);
        assert.ok(meu, 'material A tem de aparecer');
        assert.strictEqual(meu.motivo, 'catalogo_acima');
        assert.strictEqual(meu.menor.preco, 80);
        assert.ok(!r.itens.some(i => i.material_id === B), 'material B (1 fornecedor, catálogo em ordem) fica de fora');
        assert.ok(r.resumo.materiais_com_varios_fornecedores >= 1);
      });

      await caso('banco: releitura de arquivo antigo guarda a cotação com a data do arquivo e não cadastra material', async () => {
        const fake = { ler: async () => leitura({ cnpj: F3, nome: 'Atacado Três' }, [item('ZZCOT CABO FLEX 2,5MM', 95), item('ZZCOT NAO EXISTE', 1)]), lerArquivo: async () => Buffer.from('conteudo-zz'), dataDoArquivo: async () => new Date(2026, 9, 1), indice };
        const contar = async () => (await pool.query("SELECT count(*)::int n FROM materiais WHERE descricao LIKE 'ZZCOT %'")).rows[0].n;
        const antes = await contar();
        const r = await guardarCotacoesDoArquivo(pool, { pasta: 'x', nome: 'a.pdf' }, fake);
        assert.strictEqual(r.guardados, 1);
        assert.strictEqual(await contar(), antes);
        const { rows: [l] } = await pool.query("SELECT to_char(data_cotacao,'YYYY-MM-DD') d FROM cotacoes_itens WHERE fornecedor_cnpj = $1", [F3]);
        assert.strictEqual(l.d, '2026-10-01');
        assert.strictEqual((await guardarCotacoesDoArquivo(pool, { pasta: 'x', nome: 'a.pdf' }, fake)).guardados, 0);
        const semForn = await guardarCotacoesDoArquivo(pool, { pasta: 'x', nome: 'b.pdf' }, { ...fake, ler: async () => leitura(null, [item('ZZCOT CABO FLEX 2,5MM', 95)]) });
        assert.deepStrictEqual(semForn, { itens: 1, guardados: 0, semFornecedor: true });
      });

      await caso('banco: apagar o material leva as cotações junto', async () => {
        await pool.query('DELETE FROM materiais WHERE id = $1', [A]);
        assert.strictEqual((await linhas(A)).length, 0);
      });
    } finally {
      await limpar();
      await pool.end();
    }
  }

  console.log(`cotacoesFornecedor: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
