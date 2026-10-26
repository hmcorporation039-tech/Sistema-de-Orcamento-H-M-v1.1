// Composições e kits (versão 2.0, Fase 3H): custo por segmento, itens "a
// cotar", explodir no orçamento, validação, casamento com o catálogo e os
// kits-modelo. Sem banco. Rodar: npm test (pasta backend).
const assert = require('assert');
const C = require('../src/utils/composicoes');
const { compararComCatalogo } = require('../src/utils/compatibilizacaoAnalise');
const { ITENS_REFERENCIA } = require('../src/utils/precosMaoDeObraReferencia');

let ok = 0;
const pendentes = [];
function caso(nome, fn) {
  pendentes.push(Promise.resolve().then(fn).then(
    () => { ok++; console.log(`  ok  ${nome}`); },
    (e) => { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
  ));
}

// bases de exemplo
const materiais = {
  1: { id: 1, codigo: 'CX42', descricao: 'CAIXA 4X2 AMARELA', unidade: 'UND', preco: '1.08', ativo: true, categoria: 'Infraestrutura', ncm: '39259090' },
  2: { id: 2, descricao: 'Cabo de cobre flexível 2,5 mm² 450/750 V PVC', unidade: 'm', preco: '2.835', ativo: true, categoria: 'Infraestrutura' },
  3: { id: 3, descricao: 'Tomada 2P+T 10 A com placa', unidade: 'un', preco: '0', ativo: true, categoria: 'Elétrica' },
  4: { id: 4, descricao: 'CABO FLEXIVEL 2,5MM 750V AZ 100MT', unidade: 'RL', preco: '283.04', ativo: true, categoria: 'Elétrica' },
  5: { id: 5, descricao: 'Sensor antigo', unidade: 'un', preco: '50', ativo: false, categoria: 'Alarme' },
};
const servicos = {
  ele_tomada_baixa: { codigo: 'ele_tomada_baixa', descricao: 'Instalação de tomada baixa (30/60cm)', unidade: 'un', valor_referencia: null, valor_publico: '19.46', valor_privado: '88.75' },
  ele_interruptor: { codigo: 'ele_interruptor', descricao: 'Instalação de interruptor', unidade: 'un', valor_referencia: '40', valor_publico: '15', valor_privado: '60' },
  ele_ponto_energia: { codigo: 'ele_ponto_energia', descricao: 'Ponto de energia', unidade: 'un', valor_referencia: null, valor_publico: null, valor_privado: null },
  livre_9: { codigo: 'livre_9', descricao: 'Instalação de tomada (livre)', unidade: 'un', origem: 'proposta', ativo: false, fundido_em: 'ele_tomada_baixa' },
};
const bases = { materiais, servicos };
const kitTomada = [
  { tipo: 'material', material_id: 1, coeficiente: 1, descricao: 'CAIXA 4X2 AMARELA', unidade: 'UND' },
  { tipo: 'material', material_id: null, coeficiente: 3, descricao: 'Eletroduto corrugado 3/4"', unidade: 'm' },
  { tipo: 'material', material_id: 2, coeficiente: 9, descricao: 'Cabo 2,5 mm²', unidade: 'm' },
  { tipo: 'material', material_id: 3, coeficiente: 1, descricao: 'Tomada 2P+T 10 A com placa', unidade: 'un' },
  { tipo: 'servico', servico_codigo: 'ele_tomada_baixa', coeficiente: 1, descricao: 'Instalação de tomada baixa', unidade: 'un' },
];

caso('unidades: UND = un = pç; RL ≠ m; MT = m', () => {
  assert.ok(C.unidadesCompativeis('UND', 'un'));
  assert.ok(C.unidadesCompativeis('pç', 'UN'));
  assert.ok(C.unidadesCompativeis('MT', 'm'));
  assert.ok(!C.unidadesCompativeis('RL', 'm'));
  assert.ok(!C.unidadesCompativeis('cx', 'un'));
});

caso('custo particular: material × catálogo + serviço × referência particular; sem preço = a cotar', () => {
  const c = C.calcularCusto(kitTomada, bases, 'privado');
  assert.strictEqual(c.segmento, 'privado');
  assert.strictEqual(c.itens[0].custo, 1.08);
  assert.strictEqual(c.itens[2].preco_unitario, 2.84); // unitário a 2 casas, como a proposta
  assert.strictEqual(c.itens[2].custo, 25.56);
  assert.strictEqual(c.itens[4].preco_unitario, 88.75);
  assert.strictEqual(c.itens[4].fonte_preco, 'referencia_privado');
  assert.strictEqual(c.custo_unitario, 115.39); // 1,08 + 25,56 + 88,75
  assert.strictEqual(c.itens_a_cotar, 2);
  assert.strictEqual(c.completo, false);
  assert.ok(c.itens[1].a_cotar && /sem catálogo/.test(c.itens[1].motivo));
  assert.ok(c.itens[3].a_cotar && /sem preço/.test(c.itens[3].motivo)); // preço 0 no catálogo não vira R$ 0
  assert.strictEqual(c.itens[1].preco_unitario, null);
  assert.strictEqual(c.itens[3].custo, null);
});

caso('custo oficial: órgão público usa a referência oficial; valor H&M adotado tem prioridade nos dois', () => {
  const c = C.calcularCusto(kitTomada, bases, 'publico');
  assert.strictEqual(c.itens[4].preco_unitario, 19.46);
  assert.strictEqual(c.itens[4].fonte_preco, 'referencia_publico');
  assert.strictEqual(c.custo_unitario, 46.1);
  const hm = [{ tipo: 'servico', servico_codigo: 'ele_interruptor', coeficiente: 2, descricao: 'x', unidade: 'un' }];
  assert.strictEqual(C.calcularCusto(hm, bases, 'publico').custo_unitario, 80);
  assert.strictEqual(C.calcularCusto(hm, bases, 'privado').custo_unitario, 80);
  assert.strictEqual(C.calcularCusto(hm, bases, 'publico').itens[0].fonte_preco, 'hm');
  const ambos = C.calcularCustoNosSegmentos(kitTomada, bases);
  assert.deepStrictEqual(Object.keys(ambos), ['publico', 'privado']);
  assert.strictEqual(ambos.privado.custo_unitario, 115.39);
  assert.strictEqual(C.calcularCusto(kitTomada, bases, 'qualquer').segmento, 'privado');
});

caso('serviço sem referência, serviço fundido e serviço que sumiu da base', () => {
  const its = [
    { tipo: 'servico', servico_codigo: 'ele_ponto_energia', coeficiente: 1, descricao: 'Ponto', unidade: 'un' },
    { tipo: 'servico', servico_codigo: 'livre_9', coeficiente: 2, descricao: 'livre', unidade: 'un' },
    { tipo: 'servico', servico_codigo: 'nao_existe', coeficiente: 1, descricao: 'Serviço antigo', unidade: 'un' },
    { tipo: 'servico', servico_codigo: null, coeficiente: 1, descricao: 'Serviço digitado', unidade: 'vb' },
  ];
  const c = C.calcularCusto(its, bases, 'privado');
  assert.ok(c.itens[0].a_cotar);
  assert.strictEqual(c.itens[1].servico_codigo_final, 'ele_tomada_baixa'); // segue a fusão
  assert.strictEqual(c.itens[1].custo, 177.5);
  assert.ok(c.itens[2].a_cotar && c.itens[2].descricao === 'Serviço antigo'); // cópia da descrição
  assert.ok(c.itens[3].a_cotar);
  assert.strictEqual(c.custo_unitario, 177.5);
  assert.strictEqual(c.itens_a_cotar, 3);
});

caso('material desativado, sumido ou com unidade diferente do item fica a cotar (não usa preço)', () => {
  const its = [
    { tipo: 'material', material_id: 5, coeficiente: 1, descricao: 'Sensor antigo', unidade: 'un' },
    { tipo: 'material', material_id: 999, coeficiente: 1, descricao: 'Material apagado', unidade: 'un' },
    { tipo: 'material', material_id: 4, coeficiente: 9, descricao: 'Cabo 2,5', unidade: 'm' }, // RL ≠ m
  ];
  const c = C.calcularCusto(its, bases, 'privado');
  assert.ok(c.itens.every(l => l.a_cotar && l.custo === null));
  assert.ok(/removido/.test(c.itens[0].motivo));
  assert.strictEqual(c.itens[1].descricao, 'Material apagado');
  assert.ok(/Unidade do catálogo \(RL\)/.test(c.itens[2].motivo));
  assert.strictEqual(c.custo_unitario, 0);
});

caso('explodir: quantidade = coef × qtd, seções, subgrupo da disciplina, status e vínculos', () => {
  const comp = { codigo: 'KIT-ELE-01', descricao: 'Ponto de tomada baixa', unidade: 'pt', disciplina: 'eletrica' };
  const custo = C.calcularCusto(kitTomada, bases, 'privado');
  const r = C.explodirComposicao(comp, custo, 12);
  assert.strictEqual(r.itens.length, 5);
  assert.strictEqual(r.quantidade, 12);
  const [caixa, eletroduto, cabo, tomada, mo] = r.itens;
  assert.strictEqual(caixa.secao, C.SECAO_MATERIAIS);
  assert.strictEqual(caixa.subgrupo, 'Elétrica');
  assert.strictEqual(caixa.quantidade, 12);
  assert.strictEqual(caixa.material_id, 1);
  assert.strictEqual(caixa.codigo, 'CX42');
  assert.strictEqual(caixa.ncm, '39259090');
  assert.strictEqual(caixa.status, 'confirmado'); // preço do catálogo
  assert.strictEqual(eletroduto.quantidade, 36);
  assert.strictEqual(eletroduto.material_id, null);
  assert.strictEqual(eletroduto.valor_unitario, 0);
  assert.strictEqual(eletroduto.status, 'a_cotar');
  assert.strictEqual(cabo.quantidade, 108);
  assert.strictEqual(cabo.valor_unitario, 2.84); // unitário arredondado como a proposta
  assert.strictEqual(tomada.material_id, 3); // no catálogo, mas sem preço
  assert.strictEqual(tomada.status, 'a_cotar');
  assert.strictEqual(mo.secao, C.SECAO_SERVICOS);
  assert.strictEqual(mo.subgrupo, 'Elétrica');
  assert.strictEqual(mo.codigo, 'ele_tomada_baixa');
  assert.strictEqual(mo.material_id, null);
  assert.strictEqual(mo.status, 'a_cotar'); // referência de mercado é sugestão
  assert.strictEqual(mo.valor_total, 1065);
  assert.strictEqual(r.itens_a_cotar, 2);
  assert.ok(r.itens.every(it => it.origem === 'KIT-ELE-01'));
  assert.strictEqual(r.total, 12.96 + 306.72 + 1065);
  // fração e serviço com valor H&M (preço fechado)
  const r2 = C.explodirComposicao({ ...comp, disciplina: 'rede' },
    C.calcularCusto([{ tipo: 'servico', servico_codigo: 'ele_interruptor', coeficiente: 0.3333, descricao: 'x', unidade: 'un' }], bases, 'privado'), 3);
  assert.strictEqual(r2.itens[0].quantidade, 1);
  assert.strictEqual(r2.itens[0].status, 'confirmado');
  assert.strictEqual(r2.itens[0].subgrupo, 'Redes');
  assert.ok(C.explodirComposicao(comp, custo, 0).erro);
  assert.ok(C.explodirComposicao(comp, custo, 'abc').erro);
  // material desativado não volta a ser ligado ao catálogo na proposta
  const r3 = C.explodirComposicao(comp, C.calcularCusto([{ tipo: 'material', material_id: 5, coeficiente: 1, descricao: 'Sensor antigo', unidade: 'un' }], bases), 1);
  assert.strictEqual(r3.itens[0].material_id, null);
  assert.strictEqual(r3.itens[0].descricao, 'Sensor antigo');
});

caso('validação: descrição, disciplina, coeficiente, tipo e item sem vínculo exige descrição', () => {
  const base = { descricao: 'Kit', disciplina: 'eletrica', itens: [{ tipo: 'material', descricao: 'Caixa', coeficiente: '1,5'.replace(',', '.') }] };
  const v = C.validarComposicao(base);
  assert.ok(!v.erro, v.erro);
  assert.strictEqual(v.dados.unidade, 'un');
  assert.strictEqual(v.dados.itens[0].coeficiente, 1.5);
  assert.ok(C.validarComposicao({ ...base, descricao: '  ' }).erro);
  assert.ok(C.validarComposicao({ ...base, disciplina: 'xpto' }).erro);
  assert.ok(C.validarComposicao({ ...base, itens: [{ tipo: 'material', descricao: 'a', coeficiente: 0 }] }).erro);
  assert.ok(C.validarComposicao({ ...base, itens: [{ tipo: 'material', descricao: 'a', coeficiente: -1 }] }).erro);
  assert.ok(C.validarComposicao({ ...base, itens: [{ tipo: 'outro', descricao: 'a', coeficiente: 1 }] }).erro);
  assert.ok(C.validarComposicao({ ...base, itens: [{ tipo: 'material', coeficiente: 1 }] }).erro);
  assert.ok(C.validarComposicao({ ...base, itens: 'x' }).erro);
  assert.ok(C.validarComposicao({ ...base, codigo: 'ruim código!' }).erro);
  assert.strictEqual(C.validarComposicao({ ...base, codigo: ' kit-ele-09 ' }).dados.codigo, 'KIT-ELE-09');
  // serviço não leva material_id e vice-versa
  const misto = C.validarComposicao({ ...base, itens: [{ tipo: 'servico', servico_codigo: 'ele_qdg', material_id: 3, coeficiente: 1 }] });
  assert.strictEqual(misto.dados.itens[0].material_id, null);
  // edição parcial: só o que veio
  const p = C.validarComposicao({ observacao: '' }, { parcial: true });
  assert.deepStrictEqual(p.dados, { observacao: null });
});

caso('código automático KIT-<SIGLA>-NN', () => {
  assert.strictEqual(C.proximoCodigo('eletrica', []), 'KIT-ELE-01');
  assert.strictEqual(C.proximoCodigo('eletrica', ['KIT-ELE-01', 'KIT-ELE-07', 'KIT-REDE-09', 'kit-ele-x']), 'KIT-ELE-08');
  assert.strictEqual(C.proximoCodigo('nao_existe', []), 'KIT-OUT-01');
});

caso('medidas: frações de polegada, decimais e números de norma ignorados', () => {
  assert.deepStrictEqual([...C.medidas('Cabo de cobre flexível 2,5 mm² 450/750 V')].sort(), ['2.5', '450', '750']);
  assert.deepStrictEqual([...C.medidas('Eletroduto 3/4" (25 mm)')].sort(), ['25', '3/4']);
  assert.deepStrictEqual([...C.medidas('Tomada 2P+T 10 A (padrão NBR 14136)')].sort(), ['10', '2']);
  assert.deepStrictEqual([...C.medidas('Disjuntor 1P 10 A curva C (NBR NM 60898)')].sort(), ['1', '10']);
});

caso('casar com o catálogo: medida e unidade precisam bater; prefere o que tem preço', () => {
  const catalogo = [
    { id: 10, descricao: 'Disjuntor termomagnético 1P 10 A curva C (NBR NM 60898)', unidade: 'un', preco: '0' },
    { id: 11, descricao: 'CABO FLEXIVEL 2,5MM 750V AZ 100MT', unidade: 'RL', preco: '283.04' },
    { id: 12, descricao: 'Cabo de cobre flexível 2,5 mm² 450/750 V PVC', unidade: 'm', preco: '0' },
    { id: 13, descricao: 'Caixa de embutir 4×2"', unidade: 'un', preco: '0' },
    { id: 14, descricao: 'CAIXA 4X2 AMARELA 689034', unidade: 'UND', preco: '1.08' },
  ];
  // compararComCatalogo sozinho daria 100% para o disjuntor de 10 A
  assert.ok(compararComCatalogo('Disjuntor termomagnético 2P 40 A curva C (NBR NM 60898)', catalogo));
  assert.strictEqual(C.casarComCatalogo({ descricao: 'Disjuntor termomagnético 2P 40 A curva C (NBR NM 60898)', unidade: 'un' }, catalogo, compararComCatalogo), null);
  // rolo não serve para item em metro
  assert.strictEqual(C.casarComCatalogo({ descricao: 'Cabo flexível 2,5 mm 750 V', unidade: 'm' }, catalogo, compararComCatalogo)?.material_id, 12);
  const caixa = C.casarComCatalogo({ descricao: 'Caixa de embutir 4×2" em PVC', unidade: 'un', busca: ['Caixa 4x2 amarela'] }, catalogo, compararComCatalogo);
  assert.strictEqual(caixa.material_id, 14);
  assert.strictEqual(C.casarComCatalogo({ descricao: 'Detector de fumaça', unidade: 'un' }, catalogo, compararComCatalogo), null);
});

caso('kits-modelo: 8–12 kits, códigos únicos, serviços da base padrão e itens válidos', () => {
  const kits = C.KITS_MODELO;
  assert.ok(kits.length >= 8 && kits.length <= 12);
  assert.strictEqual(new Set(kits.map(k => k.codigo)).size, kits.length);
  const codigosPadrao = new Set(ITENS_REFERENCIA.map(i => i.codigo));
  for (const k of kits) {
    const v = C.validarComposicao(k);
    assert.ok(!v.erro, `${k.codigo}: ${v.erro}`);
    assert.ok(k.itens.some(i => i.tipo === 'servico') && k.itens.some(i => i.tipo === 'material'), `${k.codigo} sem material ou serviço`);
    for (const it of k.itens) {
      if (it.tipo === 'servico') assert.ok(codigosPadrao.has(it.servico_codigo), `${k.codigo}: serviço ${it.servico_codigo} fora da base`);
      assert.ok(!('preco' in it) && !('valor_unitario' in it), `${k.codigo}: kit-modelo não grava preço`);
    }
  }
  const disciplinas = new Set(kits.map(k => k.disciplina));
  for (const d of ['eletrica', 'rede', 'cftv', 'alarme', 'incendio', 'antena']) assert.ok(disciplinas.has(d), `falta kit de ${d}`);
});

Promise.all(pendentes).then(() => console.log(`composicoes: ${ok} de ${pendentes.length} casos ok`));
