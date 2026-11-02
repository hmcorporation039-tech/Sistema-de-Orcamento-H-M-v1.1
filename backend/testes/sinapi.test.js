// SINAPI local: leitura da planilha da Caixa (planilha de mentira com o mesmo formato),
// importação idempotente por mês/UF, busca, queda para o mês anterior e troca de regime.
// Usa o banco do v2 (cria as tabelas pela migração; limpa só o mês de teste).
// Rodar: node testes/sinapi.test.js
const assert = require('assert');
const ExcelJS = require('exceljs');
const pool = require('../src/config/database');
const sinapi = require('../src/services/sinapi');
const migracao = require('../src/models/migracoes/2.0-25-sinapi');

const MES = '2099-01';
const MES_ANT = '2098-12';

function planilha(mes, { precoCabo = 12.5, semPrecoDisj = false } = {}) {
  const wb = new ExcelJS.Workbook();
  const [a, m] = mes.split('-');
  const rotulo = `${m}/${a}`;
  for (const aba of ['ISD', 'ICD']) {
    const ws = wb.addWorksheet(aba);
    ws.getRow(3).values = ['Mês de Referência:', rotulo];
    ws.getRow(10).values = ['Classificação', 'Código', 'Descrição', 'Unidade', 'Origem', 'AC', 'DF', 'GO'];
    const k = aba === 'ICD' ? 0.9 : 1;
    ws.getRow(11).values = ['CABOS', { formula: 'X', result: 91001 }, 'CABO DE COBRE FLEXIVEL 750 V, 2,5 MM2', 'M', 'C', 99, +(precoCabo * k).toFixed(2), 88];
    ws.getRow(12).values = ['DISJUNTORES', 91002, 'DISJUNTOR TERMOMAGNETICO MONOPOLAR 20A', 'UN', 'CR', 99, semPrecoDisj ? null : 15 * k, 88];
    ws.getRow(13).values = ['SERVICOS', 91003, 'ITEM SO DE OUTRO ESTADO', 'UN', 'C', 5, null, 7];
  }
  for (const aba of ['CSD', 'CCD']) {
    const ws = wb.addWorksheet(aba);
    ws.getRow(3).values = ['Mês de Referência:', rotulo];
    ws.getRow(4).values = [null, null, null, null, 'AC', null, 'DF', null];
    ws.getRow(10).values = ['Grupo', 'Código', 'Descrição', 'Unidade', 'Custo (R$)', '%AS', 'Custo (R$)', '%AS'];
    ws.getRow(11).values = [{ text: 'ELETRICA', hyperlink: 'https://x' }, { formula: 'HYPERLINK("#A1",95001)' }, 'PONTO DE TOMADA 2P+T 10A, INSTALAÇÃO', 'UN', 1, 0, 61.3, 0.25];
    ws.getRow(12).values = ['ELETRICA', 95002, 'COMPOSICAO SEM CUSTO', 'UN', 1, 0, '-', 0];
  }
  return wb;
}

(async () => {
  // leitura
  const lido = sinapi.lerPlanilha(planilha(MES), 'DF');
  assert.strictEqual(lido.mes, MES);
  const ins = lido.blocos.find(b => b.tipo === 'insumos' && b.regime === 'sem').itens;
  assert.strictEqual(ins.length, 3);
  assert.strictEqual(ins[0].codigo, 91001); // código vindo de fórmula
  assert.strictEqual(ins[0].preco, 12.5);
  assert.strictEqual(ins[2].preco, null); // sem coleta no DF: nunca vira preço zero
  assert.strictEqual(lido.blocos.find(b => b.tipo === 'insumos' && b.regime === 'com').itens[0].preco, 11.25);
  const comp = lido.blocos.find(b => b.tipo === 'composicoes' && b.regime === 'sem').itens;
  assert.strictEqual(comp[0].grupo, 'ELETRICA'); // grupo vindo de hiperlink
  assert.strictEqual(comp[0].custo, 61.3);
  assert.strictEqual(comp[0].pct_as, 0.25);
  assert.strictEqual(comp[1].custo, null); // "-" = custo zerado
  assert.throws(() => sinapi.lerPlanilha(planilha(MES), 'XX'), /UF XX não encontrada/);
  const semAba = planilha(MES); semAba.removeWorksheet(semAba.getWorksheet('CCD').id);
  assert.throws(() => sinapi.lerPlanilha(semAba, 'DF'), /aba CCD/);

  // banco
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await migracao(client);
    await migracao(client); // idempotente
    await client.query('COMMIT');
  } finally { client.release(); }
  const antes = (await pool.query("SELECT chave, valor FROM configuracoes WHERE chave IN ('sinapi_uf', 'sinapi_regime')")).rows;
  const limpa = async () => {
    for (const t of ['sinapi_insumos', 'sinapi_composicoes', 'sinapi_importacoes']) await pool.query(`DELETE FROM ${t} WHERE mes IN ($1, $2)`, [MES, MES_ANT]);
    await pool.query("DELETE FROM configuracoes WHERE chave IN ('sinapi_uf', 'sinapi_regime')");
    await pool.query("INSERT INTO configuracoes (chave, valor) VALUES ('sinapi_uf', 'DF'), ('sinapi_regime', 'sem')");
  };
  await limpa();
  const salva = async (mes, opc) => {
    const c = await pool.connect();
    try { await c.query('BEGIN'); const r = await sinapi.gravar(c, sinapi.lerPlanilha(planilha(mes, opc), 'DF'), 'teste.xlsx'); await c.query('COMMIT'); return r; } finally { c.release(); }
  };
  try {
    await salva(MES_ANT, { precoCabo: 10 });
    const r1 = await salva(MES, { semPrecoDisj: true });
    assert.deepStrictEqual([r1.insumos, r1.composicoes], [6, 4]); // 3 insumos × 2 regimes; 2 composições × 2 regimes
    const r2 = await salva(MES, { semPrecoDisj: true }); // reimportar não duplica
    assert.deepStrictEqual([r2.insumos, r2.composicoes], [6, 4]);
    assert.strictEqual((await pool.query('SELECT COUNT(*)::int n FROM sinapi_insumos WHERE mes = $1', [MES])).rows[0].n, 6);

    // busca: termos fora de ordem, sem acento, só itens com preço, mês mais recente
    const achados = await sinapi.buscar('cabo 2,5 flexível');
    assert.strictEqual(achados.length, 1);
    assert.strictEqual(achados[0].codigo, 91001);
    assert.strictEqual(achados[0].valor, 12.5);
    assert.strictEqual(achados[0].mes.trim(), MES);
    assert.deepStrictEqual(await sinapi.buscar('item so de outro estado'), []); // sem preço no DF
    assert.deepStrictEqual(await sinapi.buscar(''), []);
    assert.strictEqual((await sinapi.buscar('tomada instalacao', { tipo: 'composicoes' }))[0].valor, 61.3); // acha INSTALAÇÃO sem digitar o acento
    assert.strictEqual((await sinapi.buscar('instalação', { tipo: 'composicoes' })).length, 1);

    // queda para o mês anterior: o disjuntor não tem preço em MES, tem em MES_ANT
    const disj = await sinapi.precoPorCodigo(91002);
    assert.strictEqual(disj.mes, MES_ANT);
    assert.match(disj.aviso, /Sem preço em 2099-01/);
    assert.strictEqual((await sinapi.precoPorCodigo(91001)).aviso, null);
    assert.strictEqual(await sinapi.precoPorCodigo(1), null);

    // regime ajustável
    await pool.query("UPDATE configuracoes SET valor = 'com' WHERE chave = 'sinapi_regime'");
    assert.strictEqual((await sinapi.buscar('cabo flexivel'))[0].valor, 11.25);
    assert.strictEqual((await sinapi.situacao()).regime, 'com');

    // mês esperado: a Caixa publica o mês anterior por volta do dia 10
    assert.strictEqual(sinapi.mesEsperado(new Date(2026, 10, 2)), '2026-09'); // 02/11: ainda não saiu a de outubro
    assert.strictEqual(sinapi.mesEsperado(new Date(2026, 10, 12)), '2026-10');
    assert.strictEqual(sinapi.mesEsperado(new Date(2027, 0, 5)), '2026-11'); // virada de ano
    const sit = await sinapi.situacao();
    assert.strictEqual(typeof sit.atrasado, 'boolean');
    assert.ok(/^\d{4}-\d{2}$/.test(sit.mes_esperado) && sit.pasta_entrada.endsWith('SINAPI'));

    // pasta de entrada: zip da Caixa (com a planilha dentro), zip sem planilha e arquivo que não é SINAPI
    const fsp = require('fs/promises'); const os = require('os'); const path = require('path'); const JSZip = require('jszip');
    const pasta = await fsp.mkdtemp(path.join(os.tmpdir(), 'sinapi-teste-'));
    try {
      const bom = new JSZip();
      bom.file('SINAPI_Referência_2099_01.xlsx', await planilha(MES, { precoCabo: 20 }).xlsx.writeBuffer());
      await fsp.writeFile(path.join(pasta, 'SINAPI-2099-01-formato-xlsx.zip'), await bom.generateAsync({ type: 'nodebuffer' }));
      const vazio = new JSZip(); vazio.file('leia-me.txt', 'nada');
      await fsp.writeFile(path.join(pasta, 'SINAPI-2099-02-formato-xlsx.zip'), await vazio.generateAsync({ type: 'nodebuffer' }));
      await fsp.writeFile(path.join(pasta, 'outro-arquivo.zip'), 'não é do SINAPI');
      const r = await sinapi.importarPastaDeEntrada({ pasta });
      assert.deepStrictEqual([r.arquivosEncontrados, r.arquivosProcessados, r.meses], [2, 1, [MES]]);
      assert.ok(r.avisos.some(a => /SINAPI-2099-02.*não tem a planilha/.test(a)));
      assert.strictEqual((await sinapi.buscar('cabo flexivel'))[0].valor, 18, 'a planilha da pasta substituiu o mês (20 × 0,9 com desoneração)');
      assert.deepStrictEqual((await fsp.readdir(path.join(pasta, 'processados'))).length, 1);
      assert.deepStrictEqual((await fsp.readdir(path.join(pasta, 'com-erro'))).length, 1);
      assert.ok((await fsp.readdir(pasta)).includes('outro-arquivo.zip'), 'o que não é SINAPI fica onde está');
      assert.strictEqual((await sinapi.importarPastaDeEntrada({ pasta })).arquivosProcessados, 0, 'pasta sem novidade: nada a fazer');
    } finally { await fsp.rm(pasta, { recursive: true, force: true }); }
  } finally {
    await limpa();
    await pool.query("DELETE FROM configuracoes WHERE chave IN ('sinapi_uf', 'sinapi_regime')");
    for (const c of antes) await pool.query('INSERT INTO configuracoes (chave, valor) VALUES ($1, $2)', [c.chave, c.valor]); // devolve o que o admin tinha
    await pool.end();
  }
  console.log('sinapi: ok');
})().catch(e => { console.error(e); process.exit(1); });
