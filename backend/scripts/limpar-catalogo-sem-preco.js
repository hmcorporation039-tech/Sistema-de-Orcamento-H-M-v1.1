// Desativa no catálogo os materiais que o sistema cadastrou SOZINHO a partir de
// propostas e que nunca tiveram preço — o que o orçamento gerado da
// análise/laudo deixava antes da regra de services/catalogoAutoCadastro.js
// (28/10/2026). Desativar não apaga: o material some das listas e buscas; as
// propostas antigas continuam iguais. Fica de fora o que está numa composição
// (kit) ou tem histórico de preço.
//   padrão   → só o que é claramente lixo de leitura ("— bloco INT", "medido no
//              desenho", "NC-01…", texto com tabulação);
//   --todos  → também os itens reais que só estão sem preço (ex.: peça de uma
//              cotação) — decida antes de usar.
// Cada desativação vai para a auditoria ('desativar_sem_preco'): dá para desfazer.
//
// Uso (na pasta backend):
//   node scripts/limpar-catalogo-sem-preco.js [--todos]            → só lista
//   node scripts/limpar-catalogo-sem-preco.js [--todos] --aplicar  → desativa
//   node scripts/limpar-catalogo-sem-preco.js --desfazer           → reativa os desativados por este script
require('../src/config/env');
const pool = require('../src/config/database');
const { registrarAuditoria } = require('../src/services/auditoria');

const ACAO = 'desativar_sem_preco';
const TODOS = process.argv.includes('--todos');
// mesma regra de services/catalogoAutoCadastro.js (RE_NAO_REUTILIZAVEL), em SQL
const LIXO = String.raw`descricao ~* '(\t|—\s*bloco\y|medido no desenho|contado no\y|^NC-[0-9]+)'`;
const SQL_CANDIDATOS = `
  SELECT m.id, m.descricao, m.unidade,
         (SELECT count(*)::int FROM proposta_itens pi WHERE pi.material_id = m.id) AS em_propostas
    FROM materiais m
   WHERE m.ativo AND m.origem = 'proposta' AND COALESCE(m.preco, 0) = 0 AND COALESCE(m.preco_compra, 0) = 0
     AND NOT EXISTS (SELECT 1 FROM composicao_itens ci WHERE ci.material_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM materiais_precos_historico h WHERE h.material_id = m.id)
     ${TODOS ? '' : `AND ${LIXO}`}
   ORDER BY m.descricao`;

(async () => {
  if (process.argv.includes('--desfazer')) {
    const { rows } = await pool.query(`SELECT DISTINCT entidade_id FROM auditoria WHERE entidade = 'materiais' AND acao = $1`, [ACAO]);
    const ids = rows.map(r => r.entidade_id);
    const r = ids.length ? await pool.query('UPDATE materiais SET ativo = true WHERE id = ANY($1) AND NOT ativo RETURNING id', [ids]) : { rowCount: 0 };
    console.log(`${r.rowCount} material(is) reativado(s).`);
    return;
  }
  const { rows } = await pool.query(SQL_CANDIDATOS);
  for (const m of rows) console.log(`#${m.id}  ${m.descricao.replace(/\t/g, ' ⇥ ').slice(0, 90)}  (${m.unidade}; em ${m.em_propostas} proposta(s))`);
  const tipo = TODOS ? 'sem preço cadastrados por proposta' : 'sem preço com cara de lixo de leitura';
  if (!process.argv.includes('--aplicar')) {
    console.log(`\n${rows.length} material(is) ${tipo}. Nada foi mudado — rode com --aplicar para desativar.`);
    return;
  }
  for (const m of rows) {
    await pool.query('UPDATE materiais SET ativo = false, atualizado_em = NOW() WHERE id = $1', [m.id]);
    await registrarAuditoria(pool, { entidade: 'materiais', entidadeId: m.id, acao: ACAO, detalhes: { descricao: m.descricao } });
  }
  console.log(`\n${rows.length} material(is) ${tipo} desativado(s). Para voltar: --desfazer`);
})().catch(e => { console.error(`ERRO: ${e.message}`); process.exitCode = 1; }).finally(() => pool.end());
