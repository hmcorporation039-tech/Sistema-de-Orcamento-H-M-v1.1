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

console.log(`analiseProjetoItens: ${ok} casos ok`);
process.exit(process.exitCode || 0);
