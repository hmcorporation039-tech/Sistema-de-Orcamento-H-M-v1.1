// Análise de projeto → itens de orçamento (utils/analiseProjetoItens.js,
// analiseProjetoAchados.js, classificarArquivoProjeto.js, ponteAnaliseSkill.js
// e o cliente de services/compatibilizacaoAnalise.js). Dados SINTÉTICOS nos
// formatos lidos dos projetos reais da revisão de 29/10/2026 — nenhum dado de
// cliente. Rodar: node testes/analiseProjetoItens.test.js (pasta backend).
const assert = require('assert');
const I = require('../src/utils/analiseProjetoItens');
const { sugerirDisciplinas } = require('../src/utils/classificarArquivoProjeto');
const { extrairCliente } = require('../src/services/compatibilizacaoAnalise');

let ok = 0;
function caso(nome, fn) {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack}`); process.exitCode = 1; }
}

// análise mínima de um arquivo (formato de projetoParser.analisarProjeto)
const codigos = (total) => ({ total, ocorrencias: total, unicas: [], repetidas: [], faltando: [] });
const analise = (arquivo, disciplinas, extra = {}) => ({
  arquivo, disciplinas, cameras: codigos(0), pontosRedeAntena: { rede: codigos(0), antena: codigos(0) },
  quadroCargas: [], listaMateriais: [], tabelaQuantitativa: [], ambientes: [], ...extra,
});

caso('A4: arquivo marcado "cabeamento" conta os pontos R como o marcado "rede"', () => {
  const comoRede = [analise('cab.pdf', ['rede'], { pontosRedeAntena: { rede: codigos(69), antena: codigos(0) } })];
  const comoCab = [analise('cab.pdf', ['cabeamento'], { pontosRedeAntena: { rede: codigos(69), antena: codigos(0) } })];
  assert.strictEqual(I.totaisCodificados(comoCab).rede, 69);
  const serv = I.montarServicosPadrao(comoCab, ['cabeamento']);
  const s = Object.fromEntries(serv.map(x => [x.codigo, x]));
  assert.strictEqual(s.rede_ponto.quantidade, 69);
  assert.strictEqual(s.rede_ponto.disciplina, 'cabeamento', 'entra na disciplina marcada');
  assert.strictEqual(s.cab_certificacao.quantidade, 69);
  const mat = I.montarMateriaisInstalacaoPadrao(comoCab, ['cabeamento']);
  assert.strictEqual(mat.find(m => /Keystone/.test(m.descricao)).quantidade, 69);
  // marcado "rede": o mesmo resultado
  assert.strictEqual(I.montarServicosPadrao(comoRede, ['rede']).find(x => x.codigo === 'rede_ponto').quantidade, 69);
  const amb = I.montarPontosPorAmbiente([], comoCab, [[{ ambiente: 'SALA', cftv: 0, rede: 3, antena: 0 }]]);
  assert.strictEqual(amb[0].rede, 3);
});

caso('A4: pacote "…-CAB.ESTRU.pdf" é cabeamento, não automação pelo "AUT" do código', () => {
  assert.deepStrictEqual(sugerirDisciplinas('SENG-AUT-OBRA_EXEMPLO_R02-CAB.ESTRU (1).pdf').disciplinas, ['cabeamento']);
  assert.deepStrictEqual(sugerirDisciplinas('AUT-01.pdf').disciplinas, ['automacao'], 'sozinho, AUT ainda vale');
  assert.deepStrictEqual(sugerirDisciplinas('LOG-CFTV-02.pdf').disciplinas.sort(), ['cabeamento', 'cftv']);
});

caso('M3: cliente só na mesma linha; número ou outro rótulo não é cliente', () => {
  assert.strictEqual(extrairCliente('ASSINATURA / APROVAÇÃO DO AUTOR E DO CLIENTE:\n00\t18/09/2024'), null);
  assert.strictEqual(extrairCliente('CLIENTE:\nENDEREÇO:\tRua X'), null);
  assert.strictEqual(extrairCliente('CLIENTE:\tENDEREÇO:'), null);
  assert.strictEqual(extrairCliente('APROVAÇÃO DO CLIENTE:\n00\nCLIENTE: CONDOMÍNIO EXEMPLO\tFOLHA 1'), 'CONDOMÍNIO EXEMPLO');
});

// material com a marca interna de fonte (semDuplicarFontes)
const mat = (descricao, quantidade, _fonte, _arquivo, disciplina = 'eletrica', unidade = 'un') => ({ descricao, quantidade, unidade, disciplina, _fonte, _arquivo, observacao: `obs ${_fonte}.` });

caso('A9: mesmo tipo em pavimentos diferentes soma; mesmo desenho em dois formatos conta uma vez', () => {
  const achados = [];
  const r = I.semDuplicarFontes([
    mat('Tomada baixa 2P+T — bloco TB', 40, 'cad', 'TERREO.dwg'),
    mat('2 Tomadas médias a 1,20m do piso', 35, 'pdf', 'SUPERIOR.pdf'),
  ], achados);
  assert.deepStrictEqual(r.map(m => m.quantidade), [40, 35]);
  assert.ok(achados.some(a => /somado/.test(a.tema) && /TERREO\.dwg/.test(a.observacao)), JSON.stringify(achados));
  assert.ok(r.every(m => !('_arquivo' in m) && !('_fonte' in m)));
  // mesmo nome-base (revisão e cópia não contam): vale o DWG
  const a2 = [];
  const r2 = I.semDuplicarFontes([
    mat('Tomada 2P+T — bloco TUG', 6, 'cad', 'OBRA_ELE_TERREO_R04.dwg'),
    mat('Tomada 2P+T 10 A', 7, 'lista', 'OBRA_ELE_TERREO_REV.03 (1).pdf'),
  ], a2);
  assert.deepStrictEqual(r2.map(m => [m.descricao, m.quantidade]), [['Tomada 2P+T 10 A', 6]]);
  assert.ok(/mesmo desenho/.test(a2[0].observacao));
  // nomes diferentes, mas a compatibilização casou os ambientes: mesmo pavimento
  const r3 = I.semDuplicarFontes([
    mat('Tomada 2P+T — bloco TUG', 6, 'cad', 'ELETRICA.dwg'),
    mat('TOMADA BAIXA', 7, 'pdf', 'PRANCHA-02.pdf'),
  ], [], { gruposCompat: [{ referencia: 'ARQ.dwg', membros: [{ arquivo: 'ARQ.dwg' }, { arquivo: 'ELETRICA.dwg' }, { arquivo: 'PRANCHA-02.pdf' }] }] });
  assert.deepStrictEqual(r3.map(m => m.quantidade), [6]);
  // dois pavimentos em DWG + o PDF de um deles: o PDF sai, os DWGs somam
  const r4 = I.semDuplicarFontes([
    mat('Tomada — bloco TUG', 10, 'cad', 'P1.dwg'), mat('Tomada — bloco TUG', 12, 'cad', 'P2.dwg'), mat('TOMADA', 9, 'pdf', 'P2.pdf'),
  ], []);
  assert.deepStrictEqual(r4.map(m => m.quantidade), [10, 12]);
});

caso('BAIXO: reserva de plug RJ-45 em percentual, não +24 fixo', () => {
  const an = [analise('cftv.pdf', ['cftv'], { cameras: codigos(2) })];
  const plug = (n) => I.montarMateriaisInstalacaoPadrao([analise('c.pdf', ['cftv'], { cameras: codigos(n) })], ['cftv']).find(m => /Plug RJ-45/.test(m.descricao));
  assert.strictEqual(I.montarMateriaisInstalacaoPadrao(an, ['cftv']).find(m => /Plug RJ-45/.test(m.descricao)).quantidade, 4);
  assert.strictEqual(plug(75).quantidade, 90);
  assert.match(plug(75).observacao, /20 %/);
});

console.log(`analiseProjetoItens: ${ok} casos ok`);
process.exit(process.exitCode || 0);
