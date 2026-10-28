// Regra única do dinheiro da proposta (revisão de 27/10/2026): quantidade com
// 3 casas, unitário com 2, linha com 2, cada parcela (subtotais, BDI, impostos)
// com 2 — e o servidor, o PDF e a planilha Excel fecham o MESMO total.
// Sem banco: a planilha é montada em memória (montarPlanilhaCliente) e as
// fórmulas recalculadas com o HyperFormula da pasta skills.
// Rodar: node testes/arredondamentoPropostas.test.js (pasta backend).
const assert = require('assert');
const path = require('path');
const ExcelJS = require('exceljs');
const { calcularTotais, normalizarItem, arredondarQuantidade, itemPertenceASecao, arredondar } = require('../src/utils/calculoProposta');
const { validarProposta } = require('../src/utils/validacaoProposta');
const { montarPlanilhaCliente } = require('../src/utils/planilhaOrcamentoCliente');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('quantidade arredondada a 3 casas antes da conta (como o banco grava)', () => {
  // antes: 1,0004 × 1.000 = 1.000,40, mas o banco gravava 1,000 → PDF "1 × 1.000,00 = 1.000,40"
  const it = normalizarItem({ qtd: 1.0004, vu: 1000 }, 0);
  assert.strictEqual(it.quantidade, 1);
  assert.strictEqual(it.valor_total, 1000);
  // o arredondamento é o do PostgreSQL (metade para longe do zero, sobre o número escrito)
  assert.strictEqual(arredondarQuantidade('1.0005'), 1.001);
  assert.strictEqual(arredondarQuantidade(1.0005), 1.001);   // no binário 1.0005 é 1.000499…; o banco grava 1.001
  assert.strictEqual(arredondarQuantidade(2.5555), 2.556);
  assert.strictEqual(arredondarQuantidade(0), 0);
  assert.strictEqual(arredondarQuantidade(undefined, 1), 1);
  assert.strictEqual(arredondarQuantidade('abc', 1), 1);
  // linha = ROUND(qtd(3) × unitário(2); 2)
  for (const [q, vu] of [[2.555, 10.33], [0.3333, 3], [12.3456, 7.77]]) {
    const n = normalizarItem({ qtd: q, vu }, 0);
    assert.strictEqual(n.valor_total, arredondar(arredondarQuantidade(q) * vu), `${q} × ${vu}`);
  }
  // total da proposta usa a mesma quantidade
  const t = calcularTotais({ secoes: [{ id: 1, nome: 'Materiais' }], itens: [{ sid: 1, qtd: 1.0004, vu: 1000 }] });
  assert.strictEqual(t.total, 1000);
});

caso('seção sem id não puxa item de outra seção (100 não vira 200)', () => {
  const t = calcularTotais({ secoes: [{ nome: 'A' }, { nome: 'B' }], itens: [{ secao_nome: 'A', qtd: 1, vu: 100 }] });
  assert.strictEqual(t.total, 100);
  assert.strictEqual(itemPertenceASecao({ secao_nome: 'A' }, { nome: 'B' }), false);
  assert.strictEqual(itemPertenceASecao({}, {}), false);
  assert.strictEqual(itemPertenceASecao({ sid: 2 }, { id: 2, nome: 'X' }), true);
  assert.strictEqual(itemPertenceASecao({ secao_nome: 'X' }, { id: 2, nome: 'X' }), true);
  // pelo id continua igual
  const t2 = calcularTotais({ secoes: [{ id: 1, nome: 'Materiais' }, { id: 2, nome: 'Serviços' }], itens: [{ sid: 1, qtd: 2, vu: 10 }, { sid: 2, qtd: 1, vu: 5 }] });
  assert.deepStrictEqual([t2.subtotal_materiais, t2.subtotal_mao_obra, t2.total], [20, 5, 25]);
});

caso('valores acima das colunas DECIMAL dão 400 (mensagem), não 500', () => {
  const base = { data: '2026-10-27', cliente_nome: 'Cliente', secoes: [{ id: 1, nome: 'Materiais' }] };
  const com = (itens, extra = {}) => validarProposta({ ...base, itens, ...extra });
  assert.strictEqual(com([{ sid: 1, desc: 'Cabo', qtd: 9999999.999, vu: 1 }]), null);
  assert.match(com([{ sid: 1, desc: 'Cabo', qtd: 10000000, vu: 1 }]), /Quantidade grande demais/);
  assert.match(com([{ sid: 1, desc: 'Cabo', qtd: 9999999.9996, vu: 1 }]), /Quantidade grande demais/); // arredonda para 10.000.000
  assert.match(com([{ sid: 1, desc: 'Cabo', qtd: 1, vu: 100000000 }]), /Valor unitário grande demais/);
  assert.match(com([{ sid: 1, desc: 'Cabo', qtd: 9999999, vu: 99999999 }]), /total do item 1 passa/);
  // cada linha cabe, mas a soma (ou o BDI) estoura DECIMAL(12,2)
  const dois = [{ sid: 1, desc: 'A', qtd: 60, vu: 99999999 }, { sid: 1, desc: 'B', qtd: 60, vu: 99999999 }];
  assert.match(com(dois), /total da proposta passa/);
  assert.match(com([{ sid: 1, desc: 'A', qtd: 60, vu: 99999999 }], { bdi: 999 }), /total da proposta passa/);
  assert.strictEqual(com([{ sid: 1, desc: 'Normal', qtd: 3, vu: 12.5 }], { bdi: 25 }), null);
});

// ── Excel × servidor ─────────────────────────────────────────────────────
function carregarHyperFormula() {
  try { return require(path.join(__dirname, '..', '..', 'skills', 'node_modules', 'hyperformula')).HyperFormula; } catch { return null; }
}
const HyperFormula = carregarHyperFormula();

async function avaliarPlanilha(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const folhas = {};
  wb.worksheets.forEach(ws => {
    const linhas = [];
    ws.eachRow({ includeEmpty: true }, (row, r) => {
      const l = [];
      row.eachCell({ includeEmpty: true }, (c, col) => {
        const v = c.value;
        l[col - 1] = v && typeof v === 'object' && v.formula ? `=${v.formula}` : v && typeof v === 'object' && 'text' in v ? v.text : v instanceof Date ? 46000 : v ?? null;
      });
      linhas[r - 1] = l;
    });
    folhas[ws.name] = Array.from(linhas, l => l || []);
  });
  const hf = HyperFormula.buildFromSheets(folhas, { licenseKey: 'gpl-v3' });
  const ws = wb.getWorksheet('Resumo');
  let linhaFinal = null;
  ws.eachRow((row, r) => { if (row.getCell(1).value === 'PREÇO FINAL DA PROPOSTA') linhaFinal = r; });
  const valor = (aba, a1) => hf.getCellValue(hf.simpleCellAddressFromString(a1, hf.getSheetId(aba)));
  return { final: valor('Resumo', `D${linhaFinal}`), valor, wb };
}

function proposta({ itens, bdi = 25, iv = 5, is = 3, bdiMat = null }) {
  const secoes = [{ id: 1, nome: 'Materiais e Equipamentos', ordem: 0 }, { id: 2, nome: 'Serviços (Mão de Obra)', ordem: 1 }];
  const linhas = itens.map((it, k) => ({ id: k + 1, secao_id: it.sid, descricao: `Item ${k + 1}`, quantidade: it.qtd, unidade: 'un', valor_unitario: it.vu, codigo: null, subgrupo: it.sub || null, status: 'confirmado' }));
  const servidor = calcularTotais({ secoes, itens: linhas.map(i => ({ sid: i.secao_id, qtd: i.quantidade, vu: i.valor_unitario })), bdi, bdi_materiais: bdiMat, imposto_venda: iv, imposto_servico: is });
  const p = { id: 1, numero: 'P999', cliente_nome: 'Teste', data: '2026-10-27', validade: 15, bdi, imposto_venda: iv, imposto_servico: is, bdi_materiais: bdiMat, total: servidor.total };
  return { dados: { p, secoes, itens: linhas, pesquisaPor: new Map() }, servidor };
}

caso('planilha: fórmulas com ROUND nas linhas, BDI, impostos e preço final', async () => {
  const { dados } = proposta({ itens: [{ sid: 1, qtd: 2.555, vu: 10.33 }, { sid: 2, qtd: 1, vu: 7.77 }] });
  const { buffer } = await montarPlanilhaCliente(dados);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const formulas = [];
  wb.getWorksheet('Orçamento').eachRow(r => r.eachCell(c => { if (c.value?.formula) formulas.push(c.value.formula); }));
  wb.getWorksheet('Resumo').eachRow(r => r.eachCell(c => { if (c.value?.formula) formulas.push(c.value.formula); }));
  assert.ok(formulas.some(f => /^ROUND\(F\d+\*H\d+,2\)$/.test(f)), 'total material da linha sem ROUND');
  assert.ok(formulas.some(f => /^ROUND\(F\d+\*I\d+,2\)$/.test(f)), 'total mão de obra da linha sem ROUND');
  assert.ok(formulas.some(f => /ROUND\(\(B\d+\+C\d+\)\*Parâmetros!\$B\$8,2\)/.test(f)), 'BDI sem ROUND');
  assert.ok(formulas.some(f => /^ROUND\(B\d+\*Parâmetros!\$B\$9,2\)$/.test(f)), 'imposto de venda sem ROUND');
  assert.ok(formulas.some(f => /^ROUND\(C\d+\*Parâmetros!\$B\$10,2\)$/.test(f)), 'imposto de serviço sem ROUND');
});

caso('planilha recalculada fecha com o total do servidor (caso da revisão: 1.143,47)', async () => {
  if (!HyperFormula) { console.log('      (HyperFormula não encontrado em skills/node_modules — só as fórmulas foram conferidas)'); return; }
  const qs = [2.555, 1.005, 3.335, 7.125, 0.335, 12.345, 4.445, 9.995, 1.115, 6.665];
  const itens = [...qs.map(q => ({ sid: 1, qtd: q, vu: 10.33 })), ...qs.map(q => ({ sid: 2, qtd: q, vu: 7.77 }))];
  const { dados, servidor } = proposta({ itens });
  assert.strictEqual(servidor.total, 1143.47);
  const { final } = await avaliarPlanilha((await montarPlanilhaCliente(dados)).buffer);
  assert.strictEqual(Math.round(final * 100) / 100, servidor.total); // antes: 1.143,49 na planilha
});

caso('planilha × servidor em 40 propostas aleatórias (com e sem BDI diferenciado, vários sistemas)', async () => {
  if (!HyperFormula) return;
  let semente = 271027;
  const rnd = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff; };
  for (let n = 0; n < 40; n++) {
    const itens = Array.from({ length: 3 + Math.floor(rnd() * 12) }, () => ({
      sid: rnd() < 0.6 ? 1 : 2,
      qtd: Math.round(rnd() * 50000) / 1000,
      vu: Math.round(rnd() * 200000) / 100,
      sub: ['CFTV', 'Rede', null][Math.floor(rnd() * 3)],
    }));
    const bdi = Math.round(rnd() * 3500) / 100, iv = Math.round(rnd() * 1000) / 100, is = Math.round(rnd() * 600) / 100;
    const bdiMat = n % 3 === 0 ? Math.round(rnd() * 1500) / 100 : null;
    const { dados, servidor } = proposta({ itens, bdi, iv, is, bdiMat });
    const { final } = await avaliarPlanilha((await montarPlanilhaCliente(dados)).buffer);
    assert.strictEqual(Math.round(final * 100) / 100, servidor.total, `proposta ${n}: planilha ${final} × servidor ${servidor.total}`);
  }
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
  }
  console.log(`arredondamento das propostas: ${ok}/${casos.length} casos ok`);
  // a planilha carrega o módulo do banco (pool sem conexão aberta): encerra limpo
  await require('../src/config/database').end().catch(() => {});
})();
