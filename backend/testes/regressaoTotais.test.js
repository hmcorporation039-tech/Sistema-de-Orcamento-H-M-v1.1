// Regressão dos totais (versão 2.0, Fase 3F — BDI diferenciado de materiais):
// recalcula TODAS as propostas do banco de TESTE com o calcularTotais atual e
// confere que subtotais, BDI, impostos e total são os gravados — e os mesmos da
// conta antiga (cópia congelada abaixo). Só lê o banco.
//
// Só roda no banco de teste da 2.0 (DB_NAME=hm_orcamentos_v2 no .env); em
// qualquer outro (produção é hm_orcamentos) ou sem banco, pula sem falhar.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');

const BANCO_DE_TESTE = 'hm_orcamentos_v2';

// Conta de ANTES da Fase 3F (calculoProposta.calcularTotais na versão 2.0 Fase 2),
// congelada aqui de propósito: é a referência de "o total não muda".
function totaisAntigos({ secoes, itens, bdi, imposto_venda, imposto_servico }) {
  const num = (v, p = 0) => { const n = Number(v); return Number.isFinite(n) ? n : p; };
  const arr = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
  const mo = (nome) => /m[ãa]o.?de.?obra|serviç|servic/i.test(nome || '');
  let mat = 0; let mao = 0;
  for (const sec of secoes) {
    const sub = itens.filter(it => it.sid === sec.id).reduce((s, it) => s + arr(num(it.qtd, 1) * arr(num(it.vu, 0))), 0);
    if (mo(sec.nome)) mao += sub; else mat += sub;
  }
  mat = arr(mat); mao = arr(mao);
  const vBdi = arr((mat + mao) * (num(bdi) / 100));
  const vV = arr(mat * (num(imposto_venda) / 100));
  const vS = arr(mao * (num(imposto_servico) / 100));
  return { subtotal_materiais: mat, subtotal_mao_obra: mao, valor_bdi: vBdi, valor_imposto_venda: vV, valor_imposto_servico: vS, total: arr(mat + mao + vBdi + vV + vS) };
}

(async () => {
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`regressaoTotais: pulado (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
    return;
  }
  const pool = require('../src/config/database');
  const { calcularTotais } = require('../src/utils/calculoProposta');
  try {
    const { rows: [db] } = await pool.query('SELECT current_database() AS nome');
    assert.strictEqual(db.nome, BANCO_DE_TESTE);
    const temBdiMateriais = (await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'propostas' AND column_name = 'bdi_materiais'")).rowCount > 0;
    const { rows: propostas } = await pool.query(`SELECT * FROM propostas ORDER BY id`);
    let conferidas = 0;
    const falhas = [];
    for (const p of propostas) {
      const secoes = (await pool.query('SELECT id, nome FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem', [p.id])).rows;
      const itens = (await pool.query('SELECT secao_id, quantidade, valor_unitario FROM proposta_itens WHERE proposta_id = $1', [p.id])).rows
        .map(i => ({ sid: i.secao_id, qtd: i.quantidade, vu: i.valor_unitario }));
      const base = { secoes, itens, bdi: p.bdi, imposto_venda: p.imposto_venda, imposto_servico: p.imposto_servico };
      const novo = calcularTotais({ ...base, bdi_materiais: temBdiMateriais ? p.bdi_materiais : null });
      const antigo = totaisAntigos(base);
      const diferente = [];
      for (const k of ['subtotal_materiais', 'subtotal_mao_obra', 'valor_bdi', 'valor_imposto_venda', 'valor_imposto_servico', 'total']) {
        const gravado = Number(p[k]);
        if (Math.abs(novo[k] - gravado) > 0.001) diferente.push(`${k}: gravado ${gravado}, recalculado ${novo[k]}`);
        // proposta com BDI diferenciado (criada depois da 3F) não tem "conta antiga"
        if (p.bdi_materiais == null && Math.abs(novo[k] - antigo[k]) > 0.001) diferente.push(`${k}: conta antiga ${antigo[k]}, nova ${novo[k]}`);
      }
      if (diferente.length) falhas.push(`${p.numero}: ${diferente.join('; ')}`);
      conferidas++;
    }
    assert.ok(conferidas > 0, 'nenhuma proposta no banco de teste');
    assert.deepStrictEqual(falhas, [], falhas.join('\n'));
    console.log(`  ok  ${conferidas} proposta(s) do banco de teste recalculadas — totais iguais aos gravados e à conta antiga`);
  } catch (e) {
    if (e.code === 'ECONNREFUSED' || /connect|timeout/i.test(e.message)) {
      console.log(`regressaoTotais: pulado (banco indisponível: ${e.message})`);
    } else {
      console.error(`  FALHOU regressão de totais: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await pool.end().catch(() => {});
  }
})();
