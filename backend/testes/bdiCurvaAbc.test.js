// Fase 3F (versão 2.0): curva ABC da proposta, BDI pela fórmula do TCU
// (Acórdão 2.622/2013-Plenário), BDI diferenciado de materiais no cálculo dos
// totais e anexos do PDF. Sem banco e sem IA. Rodar: npm test (pasta backend).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  TIPOS_OBRA_TCU, FORNECIMENTO_TCU, aliquotaCprb, calcularBdiTcu, tributosBdi, sugestaoBdi, avaliarBdi, normalizarMemoriaBdi,
} = require('../src/utils/bdiTcu');
const { calcularCurvaAbc, LIMITES_CURVA_ABC } = require('../src/utils/curvaAbc');
const { calcularTotais, detalharBdi } = require('../src/utils/calculoProposta');
const { gerarHtmlProposta } = require('../src/utils/pdfTemplate');

let ok = 0;
function caso(nome, fn) {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
}
const perto = (a, b, tol = 0.005, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} esperado ${b}, veio ${a}`);

// ── BDI ──
caso('fórmula do TCU com valores conferidos à mão', () => {
  const zero = { ac: 0, sg: 0, r: 0, df: 0, l: 0, pis: 0, cofins: 0, iss: 0, cprb: 0 };
  perto(calcularBdiTcu(zero, 'nao_desonerado'), 0);
  perto(calcularBdiTcu({ ...zero, ac: 10 }, 'nao_desonerado'), 10);              // (1,10)/1 − 1
  perto(calcularBdiTcu({ ...zero, l: 10, df: 10 }, 'nao_desonerado'), 21);      // 1,1 × 1,1 − 1
  perto(calcularBdiTcu({ ...zero, pis: 50 }, 'nao_desonerado'), 100);           // 1/(1 − 0,5) − 1
  // AC 4 + S+G 0,8 + R 1,27 = 1,0607; × 1,0123 × 1,074 = 1,153203; I = 8,35 % (PIS 0,65 + COFINS 3 + ISS 2 + CPRB 2,7)
  // 1,153203 / 0,9165 = 1,258269 → 25,83 %
  perto(calcularBdiTcu({ ac: 4, sg: 0.8, r: 1.27, df: 1.23, l: 7.4, pis: 0.65, cofins: 3, iss: 2, cprb: 2.7 }, 'desonerado'), 25.83);
  // a CPRB só entra no regime desonerado
  perto(calcularBdiTcu({ ac: 4, sg: 0.8, r: 1.27, df: 1.23, l: 7.4, pis: 0.65, cofins: 3, iss: 2, cprb: 2.7 }, 'nao_desonerado'), 22.23);
  // ISS sobre uma base reduzida: 5 % × 40 % = 2 %
  perto(tributosBdi({ pis: 0.65, cofins: 3, iss: 5, iss_base: 40 }, 'nao_desonerado'), 5.65);
  assert.strictEqual(calcularBdiTcu({ ...zero, pis: 100 }, 'nao_desonerado'), null); // I = 100 % não tem preço
});

caso('fórmula confere com demonstrativo publicado (Goiás/SIC, obra Ponto de Apoio São Benedito, mar/2022)', () => {
  // Construção de edifícios, parcelas médias, PIS 0,65 + COFINS 3 + ISS 2 → BDI 22,23 % (publicado)
  perto(calcularBdiTcu({ ac: 4, sg: 0.8, r: 1.27, df: 1.23, l: 7.4, pis: 0.65, cofins: 3, iss: 2, cprb: 0 }, 'nao_desonerado'), 22.23);
  // BDI reduzido de mero fornecimento, parcelas médias, PIS + COFINS (sem ISS) → 15,28 % (publicado)
  perto(calcularBdiTcu({ ac: 3.45, sg: 0.48, r: 0.85, df: 0.85, l: 5.11, pis: 0.65, cofins: 3, iss: 0, cprb: 0 }, 'nao_desonerado'), 15.28);
});

caso('tabela do Acórdão 2.622/2013: 5 tipos de obra + fornecimento, quartis em ordem e valores do item 9.1', () => {
  assert.strictEqual(TIPOS_OBRA_TCU.length, 5);
  for (const t of [...TIPOS_OBRA_TCU, FORNECIMENTO_TCU]) {
    for (const k of ['bdi', 'ac', 'sg', 'r', 'df', 'l']) {
      const [q1, med, q3] = t[k];
      assert.ok(q1 <= med && med <= q3, `${t.id}.${k}`);
    }
  }
  const ed = TIPOS_OBRA_TCU.find(t => t.id === 'edificios');
  assert.deepStrictEqual(ed.bdi, [20.34, 22.12, 25.00]);
  assert.deepStrictEqual(TIPOS_OBRA_TCU.find(t => t.id === 'energia').bdi, [24.00, 25.84, 27.86]);
  assert.deepStrictEqual(TIPOS_OBRA_TCU.find(t => t.id === 'portuarias').l, [7.14, 8.40, 10.43]);
  assert.deepStrictEqual(FORNECIMENTO_TCU.bdi, [11.10, 14.02, 16.80]);
});

caso('CPRB da construção civil por ano (Lei 12.546/2011 e reoneração da Lei 14.973/2024)', () => {
  assert.strictEqual(aliquotaCprb(2024), 4.5);
  assert.strictEqual(aliquotaCprb(2025), 3.6);
  assert.strictEqual(aliquotaCprb(2026), 2.7);
  assert.strictEqual(aliquotaCprb(2027), 1.8);
  assert.strictEqual(aliquotaCprb(2028), 0);
});

caso('sugestão = valores médios; aviso só fora do 1º–3º quartil', () => {
  const s = sugestaoBdi('edificios', 'nao_desonerado', 2026);
  assert.deepStrictEqual([s.ac, s.sg, s.r, s.df, s.l, s.cprb], [4, 0.8, 1.27, 1.23, 7.4, 0]);
  assert.strictEqual(sugestaoBdi('edificios', 'desonerado', 2026).cprb, 2.7);
  assert.strictEqual(sugestaoBdi('fornecimento', 'nao_desonerado', 2026).iss, 0); // fornecimento não paga ISS
  assert.deepStrictEqual(avaliarBdi(s, 'nao_desonerado', 'edificios'), []);
  // desonerado: a faixa do BDI é comparada SEM a CPRB (o acórdão é de orçamentos sem desoneração)
  assert.deepStrictEqual(avaliarBdi(sugestaoBdi('edificios', 'desonerado', 2026), 'desonerado', 'edificios'), []);
  const avisos = avaliarBdi({ ...s, l: 12 }, 'nao_desonerado', 'edificios');
  assert.ok(avisos.some(a => a.parcela === 'l'));
  assert.ok(avisos.some(a => a.parcela === 'bdi'), 'BDI acima do 3º quartil');
});

caso('memória do BDI: só campos conhecidos e BDI recalculado no servidor', () => {
  const m = normalizarMemoriaBdi({
    tipo_obra: 'edificios', regime: 'desonerado', ano_cprb: 2026, bdi: 99, extra: '<script>',
    parcelas: { ...sugestaoBdi('edificios', 'desonerado', 2026), lixo: 1 },
    materiais: { parcelas: sugestaoBdi('fornecimento', 'desonerado', 2026), bdi: 1 },
  });
  assert.strictEqual(m.bdi, 25.83);
  assert.strictEqual(m.materiais.bdi, 18.6); // 1,110704 / (1 − 0,0635) − 1
  assert.strictEqual(m.extra, undefined);
  assert.strictEqual(m.parcelas.lixo, undefined);
  assert.strictEqual(normalizarMemoriaBdi({ tipo_obra: 'xyz', parcelas: {} }), null);
  assert.strictEqual(normalizarMemoriaBdi({ tipo_obra: 'edificios', parcelas: { ac: -1 } }), null);
  assert.strictEqual(normalizarMemoriaBdi(null), null);
  // não desonerado zera a CPRB mesmo que venha preenchida
  assert.strictEqual(normalizarMemoriaBdi({ tipo_obra: 'edificios', regime: 'nao_desonerado', parcelas: { ...s0(), cprb: 4.5 } }).parcelas.cprb, 0);
  function s0() { return sugestaoBdi('edificios', 'nao_desonerado', 2026); }
});

// ── Curva ABC ──
caso('curva ABC: ordem, % e classes conferidas à mão (limites 80 % / 95 %)', () => {
  assert.deepStrictEqual(LIMITES_CURVA_ABC, { A: 80, B: 95 });
  // totais 500, 300, 100, 60, 40 (= 1000): acumulado 50, 80, 90, 96, 100
  // acumulado ANTES do item: 0, 50, 80, 90, 96 → A, A, B, B, C
  const c = calcularCurvaAbc([
    { descricao: 'D', quantidade: 6, valor_unitario: 10, unidade: 'un' },
    { descricao: 'A', quantidade: 1, valor_unitario: 500, unidade: 'un', tipo: 'servico', codigo: 'ele_qdg' },
    { descricao: 'E', quantidade: 4, valor_unitario: 10, unidade: 'un' },
    { descricao: 'B', quantidade: 3, valor_unitario: 100, unidade: 'un' },
    { descricao: 'C', quantidade: 10, valor_unitario: 10, unidade: 'un' },
  ]);
  assert.strictEqual(c.total, 1000);
  assert.deepStrictEqual(c.itens.map(i => i.descricao), ['A', 'B', 'C', 'D', 'E']);
  assert.deepStrictEqual(c.itens.map(i => Math.round(i.pct * 100) / 100), [50, 30, 10, 6, 4]);
  assert.deepStrictEqual(c.itens.map(i => Math.round(i.pct_acumulado * 100) / 100), [50, 80, 90, 96, 100]);
  assert.deepStrictEqual(c.itens.map(i => i.classe), ['A', 'A', 'B', 'B', 'C']);
  assert.deepStrictEqual([c.resumo.A.itens, c.resumo.B.itens, c.resumo.C.itens], [2, 2, 1]);
  assert.deepStrictEqual([c.resumo.A.valor, c.resumo.B.valor, c.resumo.C.valor], [800, 160, 40]);
  assert.strictEqual(c.itens[0].tipo, 'servico');
});

caso('curva ABC: item que cruza o limite fica na classe de cima; mesmo item em duas linhas vira uma', () => {
  const c = calcularCurvaAbc([
    { descricao: 'Cabo 2,5 mm²', quantidade: 100, valor_unitario: 3.333, unidade: 'm' }, // 3,33 × 100 = 333
    { descricao: 'cabo  2,5 MM²', quantidade: 50, valor_unitario: 3.333, unidade: 'M' },  // mesma descrição/unidade: soma
    { descricao: 'Quadro', quantidade: 1, valor_unitario: 100, unidade: 'un' },
    { descricao: 'Zero', quantidade: 0, valor_unitario: 50, unidade: 'un' },
  ]);
  assert.strictEqual(c.itens.length, 3);
  assert.strictEqual(c.itens[0].total, 499.5);
  assert.strictEqual(c.itens[0].quantidade, 150);
  assert.deepStrictEqual(c.itens[0].origens, [0, 1]);
  // total 599,50: o cabo sozinho já é 83,3 % (cruza os 80 % e continua A);
  // o quadro começa em 83,3 % (≥ 80, < 95) → B; o item zerado começa em 100 % → C
  assert.deepStrictEqual(c.itens.map(i => i.classe), ['A', 'B', 'C']);
});

caso('curva ABC: lista vazia e total zero não quebram', () => {
  const v = calcularCurvaAbc([]);
  assert.strictEqual(v.itens.length, 0);
  assert.strictEqual(v.total, 0);
  const z = calcularCurvaAbc([{ descricao: 'X', quantidade: 0, valor_unitario: 0 }]);
  assert.strictEqual(z.itens[0].classe, 'C');
  assert.strictEqual(z.itens[0].pct, 0);
});

caso('núcleos compartilhados backend × frontend são idênticos (bdiTcu e curvaAbc)', () => {
  for (const nome of ['bdiTcu', 'curvaAbc']) {
    const nucleo = (arq) => {
      const s = fs.readFileSync(arq, 'utf8');
      const ini = s.indexOf(`// ==== INÍCIO DO NÚCLEO COMPARTILHADO (${nome}) ====`);
      const fim = s.indexOf(`// ==== FIM DO NÚCLEO COMPARTILHADO (${nome}) ====`);
      assert.ok(ini >= 0 && fim > ini, `marcas em ${arq}`);
      return s.slice(ini, fim).replace(/\r\n/g, '\n');
    };
    assert.strictEqual(nucleo(path.join(__dirname, '../../frontend/src/utils', `${nome}.js`)), nucleo(path.join(__dirname, '../src/utils', `${nome}.js`)), `${nome}: copie o núcleo do backend para o frontend`);
  }
});

// ── Totais com BDI diferenciado ──
const SECOES = [{ id: 's1', nome: 'Materiais' }, { id: 's2', nome: 'Mão de Obra' }];
const ITENS = [
  { sid: 's1', qtd: 3, vu: 333.33 },  // 999,99
  { sid: 's1', qtd: 1, vu: 0.015 },   // unitário arredondado a 0,02
  { sid: 's2', qtd: 2, vu: 250.555 }, // 250,56 × 2 = 501,12
];

caso('sem BDI de materiais o total é o de sempre (mesma expressão)', () => {
  for (const vazio of [undefined, null, '']) {
    const t = calcularTotais({ secoes: SECOES, itens: ITENS, bdi: 22.12, bdi_materiais: vazio, imposto_venda: 2, imposto_servico: 6 });
    // (1000,01 + 501,12) × 22,12 % = 332,05; venda 1000,01 × 2 % = 20,00; serviço 501,12 × 6 % = 30,07
    assert.strictEqual(t.subtotal_materiais, 1000.01);
    assert.strictEqual(t.subtotal_mao_obra, 501.12);
    assert.strictEqual(t.valor_bdi, 332.05);
    assert.strictEqual(t.total, 1883.25);
    assert.strictEqual(t.valor_bdi_materiais, null);
  }
});

caso('com BDI de materiais: materiais × BDI reduzido + mão de obra × BDI', () => {
  const t = calcularTotais({ secoes: SECOES, itens: ITENS, bdi: 25.83, bdi_materiais: 18.6, imposto_venda: 0, imposto_servico: 0 });
  // 1000,01 × 18,6 % = 186,00; 501,12 × 25,83 % = 129,44; soma 315,44
  assert.strictEqual(t.valor_bdi_materiais, 186);
  assert.strictEqual(t.valor_bdi_mao_obra, 129.44);
  assert.strictEqual(t.valor_bdi, 315.44);
  assert.strictEqual(t.total, 1816.57);
  // BDI de materiais 0 é diferenciado de verdade (não é "vazio")
  const zero = calcularTotais({ secoes: SECOES, itens: ITENS, bdi: 20, bdi_materiais: 0 });
  assert.strictEqual(zero.valor_bdi, 100.22);
  assert.deepStrictEqual(detalharBdi({ subtotalMateriais: 100, subtotalMaoObra: 50, bdi: 10, bdi_materiais: null }).valor_bdi, 15);
});

// ── PDF ──
const PROPOSTA = {
  numero: 'P900', data: '2026-10-01', validade: 5, cliente_nome: 'Secretaria <Teste>', bdi: 25.83, bdi_materiais: 18.6,
  subtotal_materiais: 1000, subtotal_mao_obra: 500, valor_bdi: 315.15, total: 1815.15,
  bdi_memoria: normalizarMemoriaBdi({ tipo_obra: 'edificios', regime: 'desonerado', ano_cprb: 2026, parcelas: sugestaoBdi('edificios', 'desonerado', 2026), materiais: { parcelas: sugestaoBdi('fornecimento', 'desonerado', 2026) } }),
  secoes: [{ id: 1, nome: 'Materiais' }, { id: 2, nome: 'Mão de Obra' }],
  itens: [
    { secao_id: 1, descricao: 'Cabo <b>flex</b>', quantidade: 100, unidade: 'm', valor_unitario: 5, valor_total: 500, codigo: 'CB-25' },
    { secao_id: 1, descricao: 'Quadro', quantidade: 1, unidade: 'un', valor_unitario: 500, valor_total: 500 },
    { secao_id: 2, descricao: 'Instalação do quadro', quantidade: 1, unidade: 'vb', valor_unitario: 500, valor_total: 500, codigo: 'ele_qdg' },
  ],
};

caso('PDF: anexos desligados por padrão; ligados mostram curva ABC e composição do BDI', () => {
  const padrao = gerarHtmlProposta(PROPOSTA);
  assert.doesNotMatch(padrao, /Anexo — Curva ABC/);
  assert.doesNotMatch(padrao, /Anexo — Composição do BDI/);
  assert.match(padrao, /BDI materiais \(18,6%\)/);
  assert.match(padrao, /BDI mão de obra \(25,83%\)/);
  const com = gerarHtmlProposta(PROPOSTA, { curvaAbc: true, composicaoBdi: true });
  assert.match(com, /Anexo — Curva ABC/);
  assert.match(com, /Anexo — Composição do BDI/);
  assert.match(com, /Construção de edifícios/);
  assert.match(com, /25,83%/);
  assert.match(com, /18,60%/);
  assert.match(com, /Acórdão 2\.622\/2013/);
  assert.doesNotMatch(com, /ele_qdg/);              // código interno de serviço não vai ao cliente
  assert.match(com, /CB-25/);                       // código de material vai
  assert.doesNotMatch(com, /<b>flex<\/b>/);         // descrição escapada
  assert.doesNotMatch(com, /difere do calculado/);  // BDI aplicado = composição
});

caso('PDF: composição avisa quando o BDI aplicado difere da memória; sem memória, só o BDI', () => {
  const dif = gerarHtmlProposta({ ...PROPOSTA, bdi: 30 }, { composicaoBdi: true });
  assert.match(dif, /difere do calculado/);
  const sem = gerarHtmlProposta({ ...PROPOSTA, bdi_memoria: null }, { composicaoBdi: true });
  assert.match(sem, /não foi registrada/);
});

console.log(`bdiCurvaAbc: ${ok} caso(s) ok`);
