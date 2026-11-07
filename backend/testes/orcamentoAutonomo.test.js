// Aprendizado de orçamento por disciplina (services/aprendizadoOrcamento.js) e comparador de orçamentos da
// concorrência (utils/leitorOrcamentoConcorrente.js, utils/comparadorOrcamentos.js, services/concorrencia.js).
// As partes puras rodam sempre; as do banco só no banco de teste, dentro de transação desfeita ou com limpeza no fim.
// Rodar: node testes/orcamentoAutonomo.test.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const ExcelJS = require('exceljs');
const { lerPlanilha, lerTexto, tipoDoItem } = require('../src/utils/leitorOrcamentoConcorrente');
const { comparar } = require('../src/utils/comparadorOrcamentos');
const aprendizado = require('../src/services/aprendizadoOrcamento');

(async () => {
  // ── leitor do orçamento do concorrente ────────────────────────────────────
  assert.strictEqual(tipoDoItem('Instalação de câmera dome', 'un'), 'servico');
  assert.strictEqual(tipoDoItem('Caixa de passagem 4x2', 'un'), 'material', '"passagem" no meio não é serviço');
  assert.strictEqual(tipoDoItem('Passagem de cabos UTP', 'm'), 'servico');
  assert.strictEqual(tipoDoItem('Engenheiro eletricista', 'h'), 'servico');
  assert.strictEqual(tipoDoItem('Cabo UTP Cat6', 'm', 'MÃO DE OBRA'), 'servico', 'a seção de mão de obra vale');

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Orçamento');
  ws.addRow(['CONCORRENTE EXEMPLO LTDA']);
  ws.addRow([]);
  ws.addRow(['Item', 'Descrição', 'Und', 'Qtd', 'Unit. Mat.', 'Unit. M.O.', 'Total']);
  ws.addRow(['1', 'CFTV']);
  ws.addRow(['1.1', 'Câmera IP dome 2MP', 'un', 10, 300, 80, 3800]);
  ws.addRow(['1.2', 'Cabo UTP Cat6', 'm', 400, 2.5, 1.5, 1600]);
  ws.addRow(['', 'Subtotal CFTV', '', '', '', '', 5400]);
  ws.addRow(['2', 'MÃO DE OBRA']);
  ws.addRow(['2.1', 'Configuração do NVR', 'vb', 1, 0, 900, 900]);
  ws.addRow(['', 'TOTAL GERAL', '', '', '', '', 6300]);
  const p = lerPlanilha(wb);
  assert.strictEqual(p.itens.length, 3, `3 itens (sem título nem subtotal): ${JSON.stringify(p.itens.map(i => i.descricao))}`);
  assert.deepStrictEqual(p.itens.map(i => i.valor_unitario), [380, 4, 900], 'unitário = material + mão de obra');
  assert.strictEqual(p.itens[0].valor_material, 300);
  assert.strictEqual(p.itens[0].disciplina, 'cftv', 'disciplina pela seção');
  assert.strictEqual(p.itens[2].tipo, 'servico');

  const pdf = lerTexto([
    'ORÇAMENTO 123',
    'Câmera IP bullet 4MP  un  6  450,00  2.700,00',
    'Instalação de câmera  un  6  120,00  720,00',
    'TOTAL 3.420,00',
  ].join('\n'));
  assert.strictEqual(pdf.itens.length, 2);
  assert.strictEqual(pdf.totalDocumento, 3420, 'a soma confere com o total do documento');
  assert.strictEqual(pdf.itens[1].tipo, 'servico');
  const matMo = lerTexto('1.1 Eletroduto PVC 3/4  m  120,00  4,50  3,20  924,00\n1.2 Caixa 4x2  un  10,00  3,00  2,00  50,00\nTOTAL 974,00');
  assert.strictEqual(matMo.itens.length, 2, 'linha com material e mão de obra separados');
  assert.strictEqual(matMo.itens[0].valor_unitario, 7.7);

  // ── comparador ────────────────────────────────────────────────────────────
  const nossos = [
    { id: 1, descricao: 'Câmera IP dome 2MP', unidade: 'un', quantidade: 10, valor_unitario: 400, tipo: 'material' },
    { id: 2, descricao: 'Cabo UTP Cat6 azul', unidade: 'm', quantidade: 300, valor_unitario: 3, tipo: 'material' },
    { id: 3, descricao: 'Disjuntor 10A', unidade: 'un', quantidade: 2, valor_unitario: 20, tipo: 'material' },
    { id: 4, descricao: 'Nobreak 1,5 kVA', unidade: 'un', quantidade: 1, valor_unitario: 1200, tipo: 'material' },
  ];
  const deles = [
    { id: 11, descricao: 'Camera IP dome 2MP', unidade: 'un', quantidade: 10, valor_unitario: 380, valor_total: 3800, tipo: 'material' },
    { id: 12, descricao: 'Cabo UTP Cat6', unidade: 'm', quantidade: 400, valor_unitario: 4, valor_total: 1600, tipo: 'material' },
    { id: 13, descricao: 'Disjuntor 16A', unidade: 'un', quantidade: 2, valor_unitario: 22, valor_total: 44, tipo: 'material' },
    { id: 14, descricao: 'Configuração do NVR', unidade: 'vb', quantidade: 1, valor_unitario: 900, valor_total: 900, tipo: 'servico' },
  ];
  const c = comparar(nossos, deles, { subtotal_materiais: 6100, subtotal_mao_obra: 0, total: 6100 });
  const par = (idNosso) => c.linhas.find(l => l.nosso.id === idNosso);
  assert.strictEqual(par(1).deles.id, 11, 'mesma câmera casa (sem acento também)');
  assert.strictEqual(par(2).deles.id, 12);
  assert.ok(par(2).alertas.some(a => /quantidade maior/.test(a)), 'quantidade 400 × 300 é avisada');
  assert.ok(!par(3), 'disjuntor 10 A não casa com o de 16 A (especificação diferente)');
  assert.deepStrictEqual(c.soDeles.map(d => d.id).sort(), [13, 14]);
  assert.deepStrictEqual(c.soNossos.map(n => n.id).sort(), [3, 4]);
  assert.strictEqual(par(1).dif_valor, 200, 'câmera: (400 − 380) × 10');
  assert.ok(c.recomendacoes.length >= 2);
  // vínculo manual e "sem equivalente"
  const c2 = comparar(nossos, deles.map(d => (d.id === 13 ? { ...d, par_item_id: 3 } : d.id === 12 ? { ...d, sem_par: true } : d)), { total: 0 });
  assert.strictEqual(c2.linhas.find(l => l.nosso.id === 3).deles.id, 13, 'o vínculo manual vale mesmo com especificação diferente');
  assert.ok(c2.soDeles.some(d => d.id === 12), 'marcado sem equivalente fica só do concorrente');
  // preço de venda: a proposta com BDI leva o custo a preço de venda antes de comparar
  const c3 = comparar([nossos[0]], [deles[0]], { subtotal_materiais: 4000, subtotal_mao_obra: 0, total: 5000 });
  assert.strictEqual(c3.linhas[0].nosso.venda_unitario, 500);
  assert.strictEqual(c3.linhas[0].dif_preco_pct, -24);

  // ── aprendizado de orçamento (puro) ───────────────────────────────────────
  const { baseDaDisciplina, quantidadeSugerida } = aprendizado.paraTestes;
  assert.strictEqual(baseDaDisciplina([{ unidade: 'pt', quantidade: 8 }, { unidade: 'un', quantidade: 2 }, { unidade: 'm', quantidade: 100 }, { unidade: 'vb', quantidade: 1 }]), 10);
  assert.strictEqual(quantidadeSugerida({ unidade: 'm', porPonto: [10, 12, 11], quantidades: [] }, 4), 44);
  assert.strictEqual(quantidadeSugerida({ unidade: 'vb', porPonto: [], quantidades: [1] }, 4), 1);
  const cftv = aprendizado.disciplinaDoSubgrupo('cftv');
  assert.ok(cftv, 'a chave da disciplina é reconhecida no subgrupo');

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`orcamentoAutonomo: partes puras ok; banco pulado (DB_NAME=${process.env.DB_NAME || '(vazio)'})`);
    return;
  }
  const pool = require('../src/config/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // três propostas aprovadas de CFTV: o serviço "cftv_ponto" vendido a 100, 120, 110 e o "Patch cord" sempre junto
    let seq = 800000 + Math.floor(Math.random() * 90000);
    const proposta = async (status, pontos, preco, comPatch) => {
      seq++;
      const { rows: [pr] } = await client.query(
        "INSERT INTO propostas (numero, sequencial, data, cliente_nome, status) VALUES ($1, $2, CURRENT_DATE - 30, 'Cliente teste orçamento', $3) RETURNING id",
        [`T${seq}`.slice(0, 10), seq, status]);
      const sMo = (await client.query("INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1, 'Serviços (Mão de Obra)', 0) RETURNING id", [pr.id])).rows[0].id;
      const sMat = (await client.query("INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1, 'Materiais e Equipamentos', 1) RETURNING id", [pr.id])).rows[0].id;
      await client.query(
        `INSERT INTO proposta_itens (proposta_id, secao_id, codigo, descricao, quantidade, unidade, valor_unitario, valor_total, subgrupo, status, ordem)
         VALUES ($1, $2, 'cftv_ponto', 'Conectorização de ponto de câmera', $3::numeric, 'pt', $4::numeric, $3::numeric * $4::numeric, 'cftv', 'confirmado', 0)`, [pr.id, sMo, pontos, preco]);
      if (comPatch) {
        await client.query(
          `INSERT INTO proposta_itens (proposta_id, secao_id, descricao, quantidade, unidade, valor_unitario, valor_total, subgrupo, status, ordem)
           VALUES ($1, $2, 'ZZ Patch cord teste orçamento 1,5 m', $3::numeric, 'un', 25, $3::numeric * 25, 'cftv', 'confirmado', 0)`, [pr.id, sMat, pontos * 2]);
      }
      return pr.id;
    };
    await proposta('Aprovada', 10, 100, true);
    await proposta('Aprovada', 5, 120, true);
    await proposta('Aprovada', 8, 110, false);
    await proposta('Recusada', 8, 999, true); // recusada não ensina

    const conhecimento = await aprendizado.carregarConhecimento({ db: client });
    assert.ok(conhecimento[cftv]?.propostas >= 3, 'as 3 aprovadas de CFTV contam');
    const itensNovos = [{ secao_nome: 'Serviços (Mão de Obra)', codigo: 'cftv_ponto', descricao: 'Conectorização de ponto de câmera', quantidade: 6, unidade: 'pt', valor_unitario: 0, subgrupo: 'cftv', status: 'a_cotar' }];
    const r = aprendizado.aplicar(itensNovos, conhecimento);
    const servico = r.itens.find(i => i.codigo === 'cftv_ponto');
    assert.strictEqual(servico.valor_unitario, 110, 'preço = mediana do que foi vendido (100, 110, 120; a recusada a 999 não conta)');
    assert.strictEqual(servico.status, 'confirmado', 'vendido em 2+ propostas no último ano: confirma');
    const patch = r.itens.find(i => /ZZ Patch cord teste/.test(i.descricao));
    if (conhecimento[cftv].propostas === 3) {
      assert.ok(patch, 'o item que acompanha a disciplina em 2 de 3 propostas é sugerido');
      assert.strictEqual(patch.quantidade, 12, '2 patch cords por ponto × 6 pontos');
      assert.strictEqual(patch.status, 'a_cotar', 'sugestão do aprendizado entra a cotar');
      assert.strictEqual(patch.valor_unitario, 25);
    }
    assert.ok(/Aprendizado de orçamento/.test(aprendizado.textoDoResumo(r.resumo)));
    const painel = await aprendizado.painel({ db: client });
    assert.ok(painel.some(d => d.disciplina === cftv && d.propostas >= 3));
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }

  // importação e comparação pelo serviço (grava de verdade; apagado no fim)
  const concorrencia = require('../src/services/concorrencia');
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  let propostaId = null;
  let importado = null;
  try {
    const seq = 700000 + Math.floor(Math.random() * 90000);
    propostaId = (await pool.query(
      "INSERT INTO propostas (numero, sequencial, data, cliente_nome, status, subtotal_materiais, total) VALUES ($1, $2, CURRENT_DATE, 'Cliente comparador', 'Ativa', 4000, 4000) RETURNING id",
      [`T${seq}`.slice(0, 10), seq])).rows[0].id;
    const sec = (await pool.query("INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1, 'Materiais e Equipamentos', 0) RETURNING id", [propostaId])).rows[0].id;
    await pool.query(
      `INSERT INTO proposta_itens (proposta_id, secao_id, descricao, quantidade, unidade, valor_unitario, valor_total, subgrupo, status, ordem)
       VALUES ($1, $2, 'Câmera IP dome 2MP', 10, 'un', 400, 4000, 'cftv', 'confirmado', 0)`, [propostaId, sec]);
    importado = await concorrencia.importar({ buffer: buf, nome: 'concorrente.xlsx', propostaId, concorrente: 'Concorrente Teste', usuarioId: null });
    assert.ok(!importado.erro, importado.erro);
    assert.strictEqual(importado.itens, 3);
    const comp = await concorrencia.comparacao(importado.id);
    assert.strictEqual(comp.concorrente, 'Concorrente Teste');
    assert.strictEqual(comp.comparacao.linhas.length, 1, 'a câmera casa');
    assert.strictEqual(comp.comparacao.resumo.so_deles, 2);
    const lista = await concorrencia.listar({ propostaId });
    assert.strictEqual(lista.length, 1);
    const linhaCabo = comp.itensConcorrente.find(i => /Cabo/.test(i.descricao));
    assert.ok((await concorrencia.vincularItem(importado.id, linhaCabo.id, { sem_par: true })).ok);
    assert.ok((await concorrencia.vincularItem(importado.id, linhaCabo.id, { par_item_id: 999999999 })).erro, 'item de outra proposta é recusado');
    assert.ok((await concorrencia.lerArquivo(Buffer.from('texto qualquer'), 'a.txt')).erro, 'formato não suportado');
  } finally {
    if (importado?.id) await concorrencia.remover(importado.id, null);
    if (propostaId) await pool.query('DELETE FROM propostas WHERE id = $1', [propostaId]);
  }
  await pool.end();
  console.log('orcamentoAutonomo: ok');
})().catch((e) => { console.error(e); process.exit(1); });
