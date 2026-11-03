// Catálogo de equipamentos de climatização (fase 4 — services/equipamentosCatalogo.js,
// migração 2.0-42, rotas /equipamentos-catalogo). SEM banco:
//   1. regras puras do registro (tipo, fabricante, modelo, capacidade, números pt-BR, link);
//   2. injeção nos dados da skill de climatização (tabela vazia não muda nada) e a
//      escolha do menor equipamento que atende, preferindo o verificado;
//   3. rotas: toda rota com autenticar; escrita só com admin.
// Rodar: node testes/equipamentosCatalogo.test.js (ou npm test, pasta backend).
const assert = require('assert');
const path = require('path');
const S = require('../src/services/equipamentosCatalogo');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
};

caso('registro válido: capacidade em TR vira kW; número com vírgula', () => {
  const { registro, erros } = S.normalizarRegistro({ tipo: 'Chiller', fabricante: ' Exemplo ', modelo: 'CH-40', dados: { capacidade_tr: '40', cop: '5,6', refrigerante: 'R-134a' } });
  assert.deepStrictEqual(erros, []);
  assert.strictEqual(registro.tipo, 'chiller');
  assert.strictEqual(registro.fabricante, 'Exemplo');
  assert.strictEqual(registro.dados.capacidade_kw, 140.67);
  assert.strictEqual(registro.dados.cop, 5.6);
  assert.strictEqual(registro.dados.refrigerante, 'R-134a');
});

caso('registro inválido: tipo, fabricante, modelo, capacidade, negativo e link', () => {
  assert.strictEqual(S.normalizarRegistro({ tipo: 'geladeira' }).erros.length, 3);
  assert.ok(S.normalizarRegistro({ tipo: 'split', fabricante: 'X', modelo: 'Y' }).erros.some(e => /capacidade/.test(e)));
  assert.ok(S.normalizarRegistro({ tipo: 'bomba', fabricante: 'X', modelo: 'Y', dados: { vazao_m3h: -2 } }).erros.some(e => /negativo/.test(e)));
  assert.ok(S.normalizarRegistro({ tipo: 'bomba', fabricante: 'X', modelo: 'Y', fonte_url: 'site.com' }).erros.some(e => /http/.test(e)));
  assert.deepStrictEqual(S.normalizarRegistro({ tipo: 'split', fabricante: 'X', modelo: 'Y', dados: { capacidade_btuh: 12000 } }).erros, []);
});

caso('injeção na skill: tabela vazia não muda os dados; com registros, a skill escolhe o menor verificado que atende', () => {
  const motor = require(path.join(__dirname, '..', '..', 'skills', 'climatizacao', 'scripts', 'lib', 'index.js'));
  const dados = motor.exemplo();
  assert.strictEqual(S.injetarNosDados(dados, []), dados);
  const registros = [
    { tipo: 'chiller', fabricante: 'Fab A', modelo: 'A-50', dados: { capacidade_kw: 175.8, cop: 5.9 }, verificado: false },
    { tipo: 'chiller', fabricante: 'Fab B', modelo: 'B-40', dados: { capacidade_kw: 140.7, cop: 6.1 }, verificado: true },
    { tipo: 'chiller', fabricante: 'Fab C', modelo: 'C-20', dados: { capacidade_kw: 70, cop: 6.5 }, verificado: true },
  ];
  const comCatalogo = S.injetarNosDados(dados, registros);
  assert.strictEqual(comCatalogo.catalogo_equipamentos.length, 3);
  assert.ok(!dados.catalogo_equipamentos, 'não altera o original');
  const ce = motor.processar(comCatalogo).calc.projeto.central;
  assert.strictEqual(ce.modelo.modelo, 'B-40'); // 30 TR = 105,5 kW: C-20 não atende; B-40 verificado antes de A-50
});

caso('rotas: autenticar em todas; escrita só com admin', () => {
  const rotas = [];
  const router = new Proxy({}, { get: (_, metodo) => (caminho, ...mws) => rotas.push({ metodo, caminho, mws }) });
  const autenticar = () => {}; const admin = () => {}; const validarId = () => {};
  require('../src/routes/v2/equipamentosCatalogo')(router, { autenticar, admin, validarId });
  assert.ok(rotas.length >= 6);
  for (const r of rotas) {
    assert.strictEqual(r.mws[0], autenticar, `${r.metodo} ${r.caminho} sem autenticar`);
    if (r.metodo !== 'get') assert.ok(r.mws.includes(admin), `${r.metodo} ${r.caminho} sem admin`);
  }
});

console.log(`equipamentosCatalogo: ${ok} casos ok`);
