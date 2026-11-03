// Proposta de renovação de laudo: texto do item/escopo (puro) e o fluxo com banco (só em hm_orcamentos_v2).
// O teste cria seus próprios vencimentos e propostas ("ZZ Renov…"), apaga tudo no fim e devolve o contador de números.
const assert = require('assert');
const r = require('../src/services/propostaRenovacao');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };

(async () => {
  await caso('o texto do item é fixo por disciplina (para o histórico de preços achar a renovação anterior)', () => {
    assert.strictEqual(r.descricaoDoItem('spda'), 'Renovação do laudo de SPDA — para-raios');
    assert.strictEqual(r.descricaoDoItem('INCENDIO'), 'Renovação do laudo de incêndio — detecção, alarme e iluminação de emergência');
    assert.strictEqual(r.descricaoDoItem('geotecnia'), 'Renovação do laudo de GEOTECNIA');
  });

  await caso('o nome vem do registro único: qualquer disciplina com laudo, sem a norma; "outro" (chave antiga) vale "outros"', () => {
    const { DISCIPLINAS } = require('../../skills/_comum/disciplinas');
    for (const d of DISCIPLINAS.filter(x => x.laudo)) {
      const t = r.descricaoDoItem(d.chave);
      // o nome do laudo no registro, sem a norma entre parênteses (e não a chave crua da disciplina desconhecida)
      assert.strictEqual(t.toLowerCase(), ('Renovação do laudo de ' + d.nomes.laudo.replace(/\s*\(.*\)$/, '')).toLowerCase(), d.chave);
      assert.ok(!t.includes('('), d.chave + ': ' + t);
    }
    assert.strictEqual(r.descricaoDoItem('pressurizacao'), 'Renovação do laudo de pressurização de escadas — controle de fumaça e automação');
    assert.strictEqual(r.descricaoDoItem('cftv'), 'Renovação do laudo de CFTV');
    assert.strictEqual(r.descricaoDoItem('outro'), 'Renovação do laudo técnico');
    assert.strictEqual(r.descricaoDoItem('outros'), 'Renovação do laudo técnico');
  });

  await caso('o texto gravado pela 2.26.0 continua valendo para achar o preço já vendido', () => {
    assert.strictEqual(r.descricaoAntiga('spda'), 'Renovação do laudo de SPDA');
    assert.strictEqual(r.descricaoAntiga('eletrica'), 'Renovação do laudo de instalações elétricas');
    assert.strictEqual(r.descricaoAntiga('outro'), 'Renovação do laudo de serviço');
    assert.strictEqual(r.descricaoAntiga('cftv'), null, 'o texto não mudou');
    assert.strictEqual(r.descricaoAntiga('pressurizacao'), null, 'não existia');
  });

  await caso('o escopo diz as datas e deixa escopo e valor para o engenheiro confirmar', () => {
    const t = r.escopoDaRenovacao({ descricao: 'SPDA — Aurora', emitido_em: '2025-12-20', vence_em: '2026-12-20' });
    assert.match(t, /emitido em 20\/12\/2025/);
    assert.match(t, /vencimento em 20\/12\/2026/);
    assert.match(t, /confirmar pelo engenheiro/);
  });

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`propostaRenovacao: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const venc = require('../src/services/vencimentos');
    const contador = (await pool.query("SELECT valor FROM configuracoes WHERE chave = 'proximo_numero'")).rows[0]?.valor;
    const limpar = async () => {
      await pool.query("DELETE FROM vencimentos_laudos WHERE descricao LIKE 'ZZ Renov%'");
      await pool.query("DELETE FROM propostas WHERE cliente_nome LIKE 'ZZ Renov%'");
      if (contador !== undefined) await pool.query("UPDATE configuracoes SET valor = $1 WHERE chave = 'proximo_numero'", [contador]);
    };
    const usuario = { id: null, nome: 'ZZ Renov Teste' };
    const novoVenc = (dados) => venc.criar(pool, { disciplina: 'spda', descricao: 'ZZ Renov laudo SPDA', cliente_nome: 'ZZ Renov Cliente', emitido_em: '2025-12-20', validade_meses: 12, ...dados });
    try {
      await require('../src/models/migracoes/2.0-38-proposta-renovacao')(pool);
      await require('../src/models/migracoes/2.0-38-proposta-renovacao')(pool);  // idempotente
      await limpar();

      await caso('banco: cria o rascunho com cliente, um item a cotar e o vínculo; o segundo clique abre a mesma proposta', async () => {
        const id = await novoVenc();
        const a = await r.criarPropostaRenovacao(id, usuario);
        assert.strictEqual(a.criada, true);
        const p = (await pool.query('SELECT * FROM propostas WHERE id = $1', [a.propostaId])).rows[0];
        assert.strictEqual(p.cliente_nome, 'ZZ Renov Cliente');
        assert.strictEqual(p.status, 'Ativa');
        assert.match(p.escopo, /ZZ Renov laudo SPDA/);
        const itens = (await pool.query('SELECT descricao, quantidade, unidade, valor_unitario, status FROM proposta_itens WHERE proposta_id = $1', [a.propostaId])).rows;
        assert.strictEqual(itens.length, 1);
        assert.strictEqual(itens[0].descricao, 'Renovação do laudo de SPDA — para-raios');
        assert.strictEqual(Number(itens[0].valor_unitario), 0);
        assert.strictEqual(itens[0].status, 'a_cotar');
        assert.match(a.sugestaoDePreco, /Sem valor sugerido/);
        const b = await r.criarPropostaRenovacao(id, usuario);
        assert.strictEqual(b.criada, false);
        assert.strictEqual(b.propostaId, a.propostaId);
        const lista = (await venc.listar(pool)).itens.find(i => i.id === id);
        assert.strictEqual(lista.proposta_renovacao_id, a.propostaId);
        assert.strictEqual(lista.proposta_renovacao_numero, a.numero);
      });

      await caso('banco: depois de aprovada, o valor fechado vira sugestão e um novo clique cria outra proposta', async () => {
        const id = await novoVenc({ descricao: 'ZZ Renov laudo outro' });
        const primeira = await r.criarPropostaRenovacao(id, usuario);
        await pool.query("UPDATE proposta_itens SET valor_unitario = 1800, valor_total = 1800, status = 'confirmado' WHERE proposta_id = $1", [primeira.propostaId]);
        await pool.query("UPDATE propostas SET status = 'Aprovada' WHERE id = $1", [primeira.propostaId]);
        assert.strictEqual((await venc.listar(pool)).itens.find(i => i.id === id).proposta_renovacao_id, null, 'proposta aprovada não é mais "a proposta de renovação" em aberto');
        const segunda = await r.criarPropostaRenovacao(id, usuario);
        assert.strictEqual(segunda.criada, true);
        assert.notStrictEqual(segunda.propostaId, primeira.propostaId);
        assert.match(segunda.sugestaoDePreco, /R\$ 1800,00/);
        const item = (await pool.query('SELECT valor_unitario, status FROM proposta_itens WHERE proposta_id = $1', [segunda.propostaId])).rows[0];
        assert.strictEqual(Number(item.valor_unitario), 1800);
        assert.strictEqual(item.status, 'a_cotar', 'o valor é sugestão: continua a cotar até o engenheiro confirmar');
      });

      await caso('banco: renovação vendida com o texto antigo (2.26.0) vira sugestão; a chave antiga "outro" funciona', async () => {
        const id = await novoVenc({ disciplina: 'outro', descricao: 'ZZ Renov laudo texto antigo' });
        const primeira = await r.criarPropostaRenovacao(id, usuario);
        assert.strictEqual((await pool.query('SELECT descricao FROM proposta_itens WHERE proposta_id = $1', [primeira.propostaId])).rows[0].descricao, 'Renovação do laudo técnico');
        // simula a proposta feita pela 2.26.0: mesmo item, com o texto antigo
        await pool.query("UPDATE proposta_itens SET descricao = 'Renovação do laudo de serviço', valor_unitario = 950, valor_total = 950, status = 'confirmado' WHERE proposta_id = $1", [primeira.propostaId]);
        await pool.query("UPDATE propostas SET status = 'Aprovada' WHERE id = $1", [primeira.propostaId]);
        const segunda = await r.criarPropostaRenovacao(id, usuario);
        assert.match(segunda.sugestaoDePreco, /R\$ 950,00/);
        const item = (await pool.query('SELECT descricao, valor_unitario FROM proposta_itens WHERE proposta_id = $1', [segunda.propostaId])).rows[0];
        assert.strictEqual(item.descricao, 'Renovação do laudo técnico', 'o item novo sai com o texto de hoje');
        assert.strictEqual(Number(item.valor_unitario), 950);
      });

      await caso('banco: documento da empresa, vencimento encerrado, laudo sem cliente e id inexistente são recusados', async () => {
        const doc = await venc.criar(pool, { tipo: 'empresa', descricao: 'ZZ Renov certidão', vence_em: '2027-01-10' }, null, '2026-11-02');
        await assert.rejects(() => r.criarPropostaRenovacao(doc, usuario), /só para laudos/);
        const enc = await novoVenc({ descricao: 'ZZ Renov encerrado' });
        await venc.encerrar(pool, enc);
        await assert.rejects(() => r.criarPropostaRenovacao(enc, usuario), /encerrado/);
        const sem = await novoVenc({ descricao: 'ZZ Renov sem cliente', cliente_nome: '' });
        await assert.rejects(() => r.criarPropostaRenovacao(sem, usuario), /sem cliente/);
        await assert.rejects(() => r.criarPropostaRenovacao(2147483000, usuario), /não encontrado/);
        assert.strictEqual((await pool.query("SELECT count(*)::int AS n FROM propostas WHERE cliente_nome LIKE 'ZZ Renov%' AND escopo LIKE '%encerrado%'")).rows[0].n, 0);
      });
    } finally {
      await limpar();
      await pool.end();
    }
  }

  console.log(`propostaRenovacao: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
