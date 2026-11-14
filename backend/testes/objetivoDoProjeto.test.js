// O que é o projeto → análise e orçamento (09/11/2026). Num DWG de subestação abrigada a análise saía com o trafo
// de 225 kVA de um bloco e as luminárias da arena (planta de situação de outro projeto colada na folha). Agora a
// leitura do objetivo (skills/_comum/cad/objetivoDoProjeto.js) diz o que vale; aqui se confere o que a análise faz
// com ele: componentes da relação de materiais viram material e serviço com a fonte, o que o projeto não escreve
// fica [CONFERIR] com quantidade 0, a ponte para a skill de média tensão usa os dados escritos e o filtro de posição
// tira a vista de contexto. Dados SINTÉTICOS — nenhum dado de cliente. Rodar: node testes/objetivoDoProjeto.test.js
const assert = require('assert');
const path = require('path');
const I = require('../src/utils/analiseProjetoItens');
const { dadosDaAnalise } = require('../src/utils/ponteAnaliseSkill');
const { motorDaDisciplina } = require('../src/utils/disciplinasLaudo');
const { CAD } = require('../src/config/caminhos');
const { filtroDoPonto } = require(path.join(CAD, 'objetivoDoProjeto.js'));

let ok = 0;
function caso(nome, fn) {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack}`); process.exitCode = 1; }
}

// itens que services/analiseCad monta dos componentes do objetivo (mesmo formato)
const comum = (id, descricao, servico, extra = {}) => ({
  descricao, disciplina: 'media_tensao', origemDescricao: 'objetivo', componente: id, servico, ambiguo: false, layer: '',
  observacaoMaterial: `relação de materiais do projeto (item ${id})`, ...extra,
});
const pagina = {
  pagina: 'DWG', origem: 'cad', itens: [
    { tipo: 'simbolo', ...comum('07', 'TRANSFORMADOR TRIFÁSICO 75 kVA 13,8 kV - 380/220 V', 'mt_transformador'), quantidade: 1, unidade: 'un', bloco: 'item 07', posicoes: [] },
    { tipo: 'simbolo', ...comum('11', 'HASTE DE ATERRAMENTO 5/8" × 2,4 m', 'mt_hastes'), quantidade: 4, unidade: 'un', bloco: 'item 11', posicoes: [] },
    { tipo: 'simbolo', ...comum('12', 'PARA-RAIOS 12 kV 10 kA', null), quantidade: 0, semQuantidade: true, unidade: 'un', bloco: 'item 12', posicoes: [], conferir: true,
      observacaoMaterial: 'relação de materiais do projeto (item 12) — quantidade não escrita no projeto [CONFERIR]' },
    { tipo: 'linha', ...comum('09', 'CABO 15 kV EPR 35 mm²', 'mt_cabo'), metros: 42, rota_m: 42, tipoLinha: 'componente' },
    { tipo: 'linha', ...comum('10', 'CORDOALHA DE COBRE NU 50 mm²', 'mt_malha'), metros: null, rota_m: null, tipoLinha: 'componente', conferir: true },
    { tipo: 'simbolo', descricao: 'subestação abrigada — montagem (objetivo do projeto)', quantidade: 1, disciplina: 'media_tensao', origemDescricao: 'objetivo',
      servico: 'mt_se_abrigada', semMaterial: true, ambiguo: false, bloco: 'subestacao_abrigada', layer: '', posicoes: [] },
  ],
};
const analise = { arquivo: 'SE.dwg', disciplinas: ['media_tensao'], listaMateriais: [] };

caso('componentes do objetivo: serviços mt_* pela relação de materiais (e a montagem da SE)', () => {
  const cad = I.contagemDoDesenho([analise], [[pagina]]);
  assert.strictEqual(cad.mt_transformador?.quantidade, 1);
  assert.strictEqual(cad.mt_hastes?.quantidade, 4);
  assert.strictEqual(cad.mt_se_abrigada?.quantidade, 1);
  assert.ok(cad.mt_cabo?.quantidade >= 42, 'cabo de MT pelos metros escritos');
  assert.ok(!cad.mt_malha, 'cordoalha sem metragem no projeto não vira serviço');
  const serv = Object.fromEntries(I.montarServicosPadrao([analise], ['media_tensao'], {}, {}, cad).map(s => [s.codigo, s]));
  assert.strictEqual(serv.mt_se_abrigada.quantidade, 1);
  assert.strictEqual(serv.mt_transformador.quantidade, 1);
});

caso('componentes do objetivo: material com a fonte; sem quantidade no projeto entra com 0 e [CONFERIR]; montagem não é material', () => {
  const mats = I.montarMateriaisDoDesenho([analise], [[pagina]], []);
  const por = (re) => mats.find(m => re.test(m.descricao));
  assert.strictEqual(por(/TRANSFORMADOR/).quantidade, 1);
  assert.match(por(/TRANSFORMADOR/).observacao, /relação de materiais do projeto \(item 07\)/);
  assert.strictEqual(por(/PARA-RAIOS/).quantidade, 0);
  assert.match(por(/PARA-RAIOS/).observacao, /\[CONFERIR\]/);
  assert.strictEqual(por(/CABO 15 kV/).quantidade, 42);
  assert.strictEqual(por(/CABO 15 kV/).unidade, 'm');
  assert.strictEqual(por(/CORDOALHA/).quantidade, 0, 'metro que o projeto não escreve: 0, não inventado');
  assert.ok(!por(/montagem/), 'a montagem da SE é serviço, não material');
});

caso('ponte para a skill de média tensão: dados escritos no projeto, demanda em kW pelo FP e [CONFERIR]', () => {
  const motor = motorDaDisciplina('media_tensao');
  const objetivo = {
    disciplina: 'media_tensao', titulo: 'SE 75 kVA', avisos: ['O bloco diz 112,5 kVA, a relação diz 75 — vale a relação [CONFERIR].'],
    dados: { potencia_kva: 75, tensao_primaria_kv: 13.8, tensao_secundaria_v: 380, tensao_secundaria_fn_v: 220, demanda_kva: 70, tipo_se: 'abrigada',
      protecao: { tipo: 'chave seccionadora + fusível HH' }, cabo_mt_mm2: 35, resistencia_malha_max_ohm: 10, hastes: 4, impedancia_pct: 3.5, isolamento_trafo: 'óleo' },
  };
  const { dados, avisos } = dadosDaAnalise('media_tensao', motor, { cliente: 'Cliente Teste', nomeProjeto: 'SE teste', dadosExtraidos: [{ arquivo: 'SE.dwg', objetivo }] });
  assert.strictEqual(dados.transformador.potencia_kva, 75);
  assert.strictEqual(dados.transformador.isolamento, 'oleo');
  assert.strictEqual(dados.fornecimento.tipo_se, 'abrigada');
  assert.strictEqual(dados.fornecimento.protecao, 'fusivel');
  assert.strictEqual(dados.cabo_mt.secao_mm2, 35);
  assert.strictEqual(dados.aterramento.n_hastes, 4);
  assert.strictEqual(dados.cargas.crescimento_pct, 0);
  assert.ok(Math.abs(dados.cargas.demanda_total_kw - 70 * 0.92) < 0.01);
  assert.ok(avisos.some(a => /vale a relação \[CONFERIR\]/.test(a)), 'os avisos do objetivo seguem para o formulário');
  assert.ok(avisos.some(a => /comprimento do cabo de MT/i.test(a)));
  // o cálculo da skill fecha com o transformador do projeto
  const r = motor.processar(dados);
  assert.ok(r, 'processou');
});

caso('ponte para a skill de média tensão: sem objetivo, só a identificação (como antes)', () => {
  const motor = motorDaDisciplina('media_tensao');
  const { avisos } = dadosDaAnalise('media_tensao', motor, { cliente: 'X', dadosExtraidos: [{ arquivo: 'a.pdf' }] });
  assert.ok(avisos.some(a => /Só a identificação/.test(a)));
});

caso('filtro de posição: abrigo só na vista principal; predial tira só a vista de contexto', () => {
  const vistas = [
    { id: 'P', papel: 'principal', caixa: [0, 0, 10, 10] },
    { id: 'C', papel: 'contexto', caixa: [20, 0, 40, 20] },
    { id: 'A', papel: 'apoio', caixa: [0, 20, 10, 30] },
  ];
  const abrigo = filtroDoPonto({ objeto: 'abrigo', vistas });
  assert.strictEqual(abrigo([5, 5]), true);
  assert.strictEqual(abrigo([30, 10]), false, 'situação de outro projeto');
  assert.strictEqual(abrigo([5, 25]), false, 'corte/detalhe não conta no abrigo');
  assert.strictEqual(abrigo([100, 100]), false, 'fora de toda vista não conta no abrigo');
  const predial = filtroDoPonto({ objeto: 'arquitetura', vistas });
  assert.strictEqual(predial([30, 10]), false);
  assert.strictEqual(predial([5, 25]), true, 'a planta de apoio do predial continua valendo');
  assert.strictEqual(predial([100, 100]), true);
  assert.strictEqual(filtroDoPonto({ objeto: 'arquitetura', vistas: vistas.filter(v => v.papel !== 'contexto') }), null, 'sem contexto: não filtra');
  assert.strictEqual(filtroDoPonto(null), null);
});

console.log(`objetivoDoProjeto: ${ok} casos ok`);
