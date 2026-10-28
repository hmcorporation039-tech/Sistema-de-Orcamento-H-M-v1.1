// Leva as pastas que já existem (Arquivos do Sistema\Obras, Projetos, Laudos)
// para a pasta de cada cliente (versão 2.3 — services/pastasRegistros.js):
//   obra                → Clientes\<cliente>\Obras\<obra>   (o que está dentro da obra vai junto)
//   análise sem obra    → Clientes\<cliente>\Projetos\<nome>
//   projeto sem obra    → Clientes\<cliente>\Projetos\<nome>
//   laudo sem obra      → Clientes\<cliente>\Laudos\<nome>
//   sem cliente         → Clientes\_Sem cliente\...
// Cada mudança fica em pastas_movidas (dá para desfazer). Depois tira o retrato
// das pastas como "conhecido", para o monitor não avisar o que já existia.
// Cliente que já tem pasta no servidor com o mesmo nome (sem acento/maiúscula)
// usa essa pasta (pastasRegistros.pastaRelDoCliente) — sem criar "Nome (C12)".
//
// Uso (na pasta backend, com o servidor já iniciado uma vez — as colunas vêm da migração 2.0-19):
//   node scripts/mudar-pastas-para-clientes.js            → só mostra o que faria
//   node scripts/mudar-pastas-para-clientes.js --aplicar  → move
//   node scripts/mudar-pastas-para-clientes.js --desfazer → devolve as pastas ao lugar antigo
// Faça o backup antes (backup-db.ps1 + cópia de Arquivos do Sistema).
require('dotenv').config();
const path = require('path');
const pool = require('../src/config/database');
const P = require('../src/utils/pastasSistema');
const R = require('../src/services/pastasRegistros');
const M = require('../src/services/monitorPastas');

const APLICAR = process.argv.includes('--aplicar');
const DESFAZER = process.argv.includes('--desfazer');
const juntar = (raiz, rel) => path.join(raiz, ...String(rel).split('/'));

async function planejar() {
  const plano = [];
  const obras = (await pool.query('SELECT id, nome, pasta, cliente_id, cliente_nome FROM obras WHERE pasta IS NOT NULL AND pasta_base IS NULL ORDER BY id')).rows;
  for (const o of obras) plano.push({ tabela: 'obras', row: o, origem: path.join(P.RAIZES.obra, o.pasta), sub: 'Obras', clienteId: await R.clienteIdDoItem(o) });
  const analises = (await pool.query('SELECT id, pasta, cliente_id, cliente_nome FROM analises_projeto WHERE pasta IS NOT NULL AND pasta_obra_id IS NULL AND pasta_base IS NULL ORDER BY id')).rows;
  for (const a of analises) plano.push({ tabela: 'analises_projeto', row: a, origem: path.join(P.RAIZES.projeto, a.pasta), sub: 'Projetos', clienteId: await R.clienteIdDoItem(a) });
  const laudos = (await pool.query('SELECT id, pasta, pasta_raiz, tipo, cliente_id, cliente_nome FROM laudos_projetos WHERE pasta IS NOT NULL AND pasta_obra_id IS NULL AND pasta_base IS NULL ORDER BY id')).rows;
  for (const l of laudos) {
    const projetos = (l.pasta_raiz || 'laudos') === 'projetos';
    plano.push({ tabela: 'laudos_projetos', row: l, origem: path.join(projetos ? P.RAIZES.projeto_disciplina : P.RAIZES.laudo, l.pasta), sub: projetos ? 'Projetos' : 'Laudos', clienteId: await R.clienteIdDoItem(l) });
  }
  return plano;
}

async function aplicar(plano) {
  const raiz = P.RAIZ_CLIENTES_SERVIDOR;
  const inicio = new Date();
  let movidas = 0;
  const clientes = new Set();
  for (const p of plano) {
    const cli = await R.pastaRelDoCliente(p.clienteId);
    const base = `${cli}/${p.sub}`;
    let nome = p.row.pasta;
    let destino = juntar(raiz, `${base}/${nome}`);
    if (await P.existe(destino)) { nome = `${nome} (${p.row.id})`; destino = juntar(raiz, `${base}/${nome}`); }
    const temPasta = await P.existe(p.origem);
    if (temPasta) await P.moverPasta(p.origem, destino);
    await pool.query(`UPDATE ${p.tabela} SET pasta_base = $1, pasta = $2 WHERE id = $3`, [base, nome, p.row.id]);
    await pool.query('INSERT INTO pastas_movidas (tabela, registro_id, origem, destino, pasta_antes) VALUES ($1,$2,$3,$4,$5)',
      [p.tabela, p.row.id, p.origem, temPasta ? destino : '(sem pasta no disco)', p.row.pasta]);
    if (temPasta) movidas++;
    if (p.clienteId) clientes.add(p.clienteId);
    console.log(`${temPasta ? 'movida ' : 'apontada'} ${p.tabela} #${p.row.id}: ${p.origem} → ${destino}`);
  }
  // retrato inicial: o que já estava nas pastas não é "novidade" (inclusive na
  // pasta do servidor adotada pelo nome do cliente, com arquivos de antes)
  if (clientes.size) await pool.query('UPDATE clientes SET pasta_retrato_em = NULL WHERE id = ANY($1)', [[...clientes]]);
  await M.escanearTodos({ todos: true });
  const r = await pool.query("UPDATE pasta_arquivos SET situacao = 'conhecido' WHERE situacao IN ('novo', 'alterado') AND detectado_em >= $1", [inicio]);
  console.log(`\n${movidas} pasta(s) movida(s), ${plano.length - movidas} registro(s) só apontado(s); retrato: ${r.rowCount} arquivo(s) marcados como conhecidos.`);
}

async function desfazer() {
  const { rows } = await pool.query('SELECT * FROM pastas_movidas WHERE desfeito_em IS NULL ORDER BY id DESC');
  for (const m of rows) {
    if (m.destino !== '(sem pasta no disco)' && await P.existe(m.destino)) await P.moverPasta(m.destino, m.origem);
    await pool.query(`UPDATE ${m.tabela} SET pasta_base = NULL, pasta = $1 WHERE id = $2`, [m.pasta_antes, m.registro_id]);
    await pool.query('UPDATE pastas_movidas SET desfeito_em = NOW() WHERE id = $1', [m.id]);
    console.log(`devolvida ${m.tabela} #${m.registro_id}: ${m.destino} → ${m.origem}`);
  }
  console.log(`${rows.length} mudança(s) desfeita(s).`);
}

(async () => {
  const col = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'obras' AND column_name = 'pasta_base'");
  if (!col.rows.length) throw new Error('as colunas da pasta por cliente ainda não existem: inicie o servidor uma vez (migração 2.0-19) e rode de novo.');
  if (!(await P.servidorDisponivel({ forcar: true }))) throw new Error(`a pasta dos clientes não está acessível: ${P.RAIZ_CLIENTES_SERVIDOR} (PASTA_CLIENTES no .env).`);
  console.log(`Pasta dos clientes: ${P.RAIZ_CLIENTES_SERVIDOR}`);
  if (DESFAZER) return desfazer();
  const plano = await planejar();
  if (!plano.length) { console.log('Nada a mudar: todas as pastas já estão nos clientes.'); return; }
  if (!APLICAR) {
    for (const p of plano) console.log(`${p.tabela} #${p.row.id}: ${p.origem} → <cliente ${p.clienteId ?? 'sem cliente'}>/${p.sub}/${p.row.pasta}`);
    console.log(`\n${plano.length} item(ns). Nada foi movido — rode com --aplicar para mover.`);
    return;
  }
  await aplicar(plano);
})().catch(e => { console.error(`ERRO: ${e.message}`); process.exitCode = 1; }).finally(() => pool.end());
