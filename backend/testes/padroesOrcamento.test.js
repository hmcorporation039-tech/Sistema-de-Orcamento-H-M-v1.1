// BDI e impostos padrão das propostas novas (item 4 do plano): sem valor de fábrica, o administrador
// define; vazio = "não definido"; valor inválido é recusado; o que o servidor cria (orçamento da
// análise/laudo, assistente) usa o padrão ou 0 + aviso. Usa o banco do v2 e devolve a configuração
// que encontrou. Rodar: node testes/padroesOrcamento.test.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const fs = require('fs');
const path = require('path');

(async () => {
  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`padroesOrcamento: pulado (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
    return;
  }
  const pool = require('../src/config/database');
  const padroes = require('../src/services/padroesOrcamento');
  const chaves = Object.values(padroes.CAMPOS).map(c => c.chave);

  const guardado = (await pool.query('SELECT chave, valor FROM configuracoes WHERE chave = ANY($1)', [chaves])).rows;
  const auditoriasAntes = (await pool.query("SELECT COUNT(*)::int n FROM auditoria WHERE acao = 'padroes_orcamento'").catch(() => ({ rows: [{ n: null }] }))).rows[0].n;
  // último id da auditoria antes do teste: no fim saem só as linhas que o teste gravou (usuário nulo)
  const ultimaAuditoria = (await pool.query('SELECT COALESCE(MAX(id), 0)::int n FROM auditoria').catch(() => ({ rows: [{ n: null }] }))).rows[0].n;
  try {
    await pool.query('DELETE FROM configuracoes WHERE chave = ANY($1)', [chaves]);

    // nada definido: ninguém inventa número
    let p = await padroes.obterPadroes(pool);
    assert.deepStrictEqual(p, { bdi: null, imposto_venda: null, imposto_servico: null, definidos: false });
    let nova = await padroes.padroesParaPropostaNova(pool);
    assert.deepStrictEqual([nova.bdi, nova.imposto_venda, nova.imposto_servico], [0, 0, 0]);
    assert.match(nova.aviso, /ainda não foram definidos/);

    // validação: texto, negativo, acima do teto
    for (const ruim of [{ bdi: 'abc' }, { bdi: -1 }, { bdi: 1000 }, { imposto_servico: 100.5 }, { imposto_venda: '5%' }]) {
      const r = await padroes.salvarPadroes(ruim, null, pool);
      assert.ok(r.erro, JSON.stringify(ruim));
    }
    assert.strictEqual((await padroes.obterPadroes(pool)).bdi, null, 'recusado não grava');

    // grava só o que veio (vírgula decimal aceita); o resto continua indefinido
    let r = await padroes.salvarPadroes({ bdi: '22,5' }, null, pool);
    assert.deepStrictEqual(r.padroes, { bdi: 22.5, imposto_venda: null, imposto_servico: null, definidos: false });
    nova = await padroes.padroesParaPropostaNova(pool);
    assert.deepStrictEqual([nova.bdi, nova.imposto_venda, nova.imposto_servico], [22.5, 0, 0]);
    assert.ok(nova.aviso);

    // tudo definido: sem aviso; 0 é um valor válido (não é "vazio")
    r = await padroes.salvarPadroes({ bdi: 20, imposto_venda: 0, imposto_servico: '3.65' }, null, pool);
    assert.deepStrictEqual(r.padroes, { bdi: 20, imposto_venda: 0, imposto_servico: 3.65, definidos: true });
    nova = await padroes.padroesParaPropostaNova(pool);
    assert.strictEqual(nova.aviso, null);

    // trocar a configuração não mexe em proposta já salva (o valor fica gravado nela)
    const salva = (await pool.query('SELECT id, bdi, imposto_venda, imposto_servico, total FROM propostas ORDER BY id DESC LIMIT 1')).rows[0];
    await padroes.salvarPadroes({ bdi: 31, imposto_servico: 7 }, null, pool);
    if (salva) {
      const depois = (await pool.query('SELECT id, bdi, imposto_venda, imposto_servico, total FROM propostas WHERE id = $1', [salva.id])).rows[0];
      assert.deepStrictEqual(depois, salva);
    }

    // vazio apaga e volta a "não definido"
    r = await padroes.salvarPadroes({ bdi: '', imposto_venda: null, imposto_servico: '  ' }, null, pool);
    assert.deepStrictEqual(r.padroes, { bdi: null, imposto_venda: null, imposto_servico: null, definidos: false });

    // cada troca fica na auditoria
    if (auditoriasAntes != null) {
      const agora = (await pool.query("SELECT COUNT(*)::int n FROM auditoria WHERE acao = 'padroes_orcamento'")).rows[0].n;
      assert.ok(agora >= auditoriasAntes + 3);
    }

    // os três caminhos do servidor leem o padrão (e a tela, o assistente e o MCP o pedem à API)
    const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
    for (const f of ['controllers/projetos/orcamento.js', 'controllers/laudos/orcamento.js']) {
      assert.ok(src(f).includes('padroesParaPropostaNova(client)'), `${f} usa o padrão`);
      assert.ok(!/\n\s+0, 0, 0, totais\.subtotal_materiais/.test(src(f)), `${f} não grava BDI/impostos 0 fixos`);
    }
    for (const f of ['mcp/assistenteFerramentas.mjs', 'mcp/ferramentasDesktop.mjs']) assert.ok(src(f).includes('/api/configuracoes/padroes-orcamento'), f);
    assert.ok(!/bdi:\s*20,|imposto_servico:\s*6,/.test(fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'Orcamento.js'), 'utf8')), 'tela sem 20 %/6 % fixos');
  } finally {
    await pool.query('DELETE FROM configuracoes WHERE chave = ANY($1)', [chaves]);
    for (const g of guardado) await pool.query('INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2', [g.chave, g.valor]);
    if (ultimaAuditoria != null) {
      await pool.query("DELETE FROM auditoria WHERE acao = 'padroes_orcamento' AND usuario_id IS NULL AND id > $1", [ultimaAuditoria]).catch(() => {});
    }
    await pool.end();
  }
  console.log('padroesOrcamento: ok');
})().catch(e => { console.error(e); process.exit(1); });
