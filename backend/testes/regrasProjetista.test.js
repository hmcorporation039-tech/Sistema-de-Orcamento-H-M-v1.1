// REGRAS APRENDIDAS DO PROJETISTA (versão 2.49, 20/11/2026). Pedido do usuário: os agentes de cada disciplina "continuem
// aprendendo tudo para que se dependa cada vez menos de IA". A correção feita pelo campo de instruções na elaboração
// vira ajuste por ambiente; a mesma correção repetida (2 análises ou 3 ambientes do mesmo tipo) vira sugestão de regra;
// aprovada, o projetista aplica sozinho (skills/_comum/cad/projetista.js). Dados SINTÉTICOS.
// Rodar: node testes/regrasProjetista.test.js
const assert = require('assert');
const path = require('path');
const { CAD } = require('../src/config/caminhos');
const { projetarDisciplinas, regrasDe } = require(path.join(CAD, 'projetista.js'));
const RP = require('../src/services/instrucoes/regrasProjetista');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
};

const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const sala = (nome, pol, pavimento = 'Térreo') => ({ nome, pavimento, poligono: pol, area_m2: Math.abs((pol[1][0] - pol[0][0]) * (pol[2][1] - pol[1][1])) });
const AMB = [
  sala('SECRETARIA', R(0, 0, 5, 4)), sala('CIRCULAÇÃO', R(5, 0, 15, 4)), sala('CAPELA', R(0, 4, 10, 12)),
  sala('DEPÓSITO 1', R(10, 4, 13, 8)), sala('DEPÓSITO 2', R(13, 4, 16, 8)), sala('BANHEIRO', R(10, 8, 13, 12)),
];
const ARQ = { ambientes: AMB, portas: [], pavimentos: [{ nome: 'Térreo' }] };
const naSala = (proj, nome, simbolo) => proj.pontos.filter(p => p.ambiente === nome && p.simbolo === simbolo && !p.central).length;

console.log('Regras aprendidas do projetista (2.49)');

caso('sem regra: o projeto de sempre (capela com 2 câmeras, detector nos depósitos, rack na secretaria)', () => {
  const p = projetarDisciplinas(ARQ, ['cftv', 'incendio'], {});
  assert.strictEqual(naSala(p, 'CAPELA', 'HM-CFTV-CAMERA'), 2);
  assert.ok(naSala(p, 'DEPÓSITO 1', 'HM-INC-DETECTOR-FUMACA') >= 1);
  assert.strictEqual(p.pontos.find(x => x.simbolo === 'HM-CAB-RACK').ambiente, 'SECRETARIA');
  assert.ok(!p.criterios.some(t => /Regras aprendidas/.test(t)));
});

caso('regras aprovadas: +2 câmeras no espaço de reunião, sem detector em depósito, rack no depósito', () => {
  const regras = [
    { id: 1, modo: 'mais', disciplina: 'cftv', tipo: 'assembleia', simbolo: 'HM-CFTV-CAMERA', n: 2, nome: 'Câmera de CFTV' },
    { id: 2, modo: 'nenhum', disciplina: 'incendio', tipo: 'deposito', simbolo: 'HM-INC-DETECTOR-FUMACA', nome: 'Detector pontual de fumaça' },
    { id: 3, modo: 'centro', grupo: 'telecom', tipo: 'deposito', nome: 'Rack / NVR e switch' },
  ];
  const p = projetarDisciplinas(ARQ, ['cftv', 'incendio'], { criterios: { regras } });
  assert.strictEqual(naSala(p, 'CAPELA', 'HM-CFTV-CAMERA'), 4);
  assert.strictEqual(naSala(p, 'DEPÓSITO 1', 'HM-INC-DETECTOR-FUMACA'), 0);
  assert.strictEqual(naSala(p, 'DEPÓSITO 2', 'HM-INC-DETECTOR-FUMACA'), 0);
  assert.ok(naSala(p, 'SECRETARIA', 'HM-INC-DETECTOR-FUMACA') >= 1, 'a regra vale só para o tipo ensinado');
  const rack = p.pontos.find(x => x.simbolo === 'HM-CAB-RACK');
  assert.ok(/^DEPÓSITO/.test(rack.ambiente), rack.ambiente);
  assert.ok(/regra aprendida/.test(rack.motivo));
  assert.ok(p.pontos.some(x => x.ambiente === 'CAPELA' && /regra aprendida/.test(x.motivo)));
  const linha = p.criterios.find(t => /Regras aprendidas/.test(t));
  assert.ok(linha && /\+2 câmera/.test(linha) && /sem detector/.test(linha), linha);
  // a análise guarda as regras com que foi feita (recalcular não aplica regra nova)
  assert.strictEqual(p.criteriosUsados.regras.length, 3);
});

caso('componente que o tipo não tinha (+1 câmera no depósito) e "menos" (−1 na capela)', () => {
  const p = projetarDisciplinas(ARQ, ['cftv'], { criterios: { regras: [
    { modo: 'mais', disciplina: 'cftv', tipo: 'deposito', simbolo: 'HM-CFTV-CAMERA', n: 1, nome: 'Câmera de CFTV' },
    { modo: 'menos', disciplina: 'cftv', tipo: 'assembleia', simbolo: 'HM-CFTV-CAMERA', n: 1, nome: 'Câmera de CFTV' },
  ] } });
  assert.strictEqual(naSala(p, 'DEPÓSITO 1', 'HM-CFTV-CAMERA'), 1);
  assert.strictEqual(naSala(p, 'CAPELA', 'HM-CFTV-CAMERA'), 1);
  assert.strictEqual(naSala(p, 'BANHEIRO', 'HM-CFTV-CAMERA'), 0);
});

caso('regra inválida não entra (elétrica é do cálculo da skill; tipo e símbolo desconhecidos; n fora de 1–20)', () => {
  const r = regrasDe([
    { modo: 'mais', disciplina: 'eletrica', tipo: 'sala', simbolo: 'HM-ELE-TOMADA-BAIXA', n: 2 },
    { modo: 'mais', disciplina: 'cftv', tipo: 'garagem', simbolo: 'HM-CFTV-CAMERA', n: 2 },
    { modo: 'mais', disciplina: 'cftv', tipo: 'sala', simbolo: 'DROP TABLE', n: 2 },
    { modo: 'mais', disciplina: 'cftv', tipo: 'sala', simbolo: 'HM-CFTV-CAMERA', n: 99 },
    { modo: 'centro', grupo: 'eletrica', tipo: 'tecnica' },
    { modo: 'nenhum', disciplina: 'cftv', tipo: 'sala', simbolo: 'HM-CFTV-CAMERA' },
  ]);
  assert.deepStrictEqual(r.map(x => x.modo), ['nenhum']);
});

// ── ajustes de uma instrução e sugestões ──
const A0 = { finalidade: 'elaboracao', ambientes: AMB, espacial: { pontos: [
  { simbolo: 'HM-CFTV-CAMERA', x: 0.5, y: 4.5 }, { simbolo: 'HM-CFTV-CAMERA', x: 9.5, y: 11.5 },
  { simbolo: 'HM-INC-DETECTOR-FUMACA', x: 11.5, y: 6 }, { simbolo: 'HM-INC-DETECTOR-FUMACA', x: 14.5, y: 6 },
] } };
const OPS = [
  { tipo: 'adicionar', adicionar: [{ simbolo: 'HM-CFTV-CAMERA', x: 0.5, y: 11.5 }, { simbolo: 'HM-CFTV-CAMERA', x: 9.5, y: 4.5 }], remover: [], centros: {} },
  { tipo: 'retirar', adicionar: [], remover: [{ simbolo: 'HM-INC-DETECTOR-FUMACA', x: 11.5, y: 6 }], centros: {} },
  { tipo: 'mover', adicionar: [], remover: [], centros: { telecom: { ambiente: 'DEPÓSITO 2', pavimento: 'Térreo' }, 'eletrica|Térreo': { ambiente: 'CIRCULAÇÃO' } } },
];

caso('ajustes da instrução: por ambiente, com o tipo do projetista; o local da estrutura; orçamento não ensina', () => {
  const aj = RP.ajustesDaInstrucao(A0, OPS);
  const cam = aj.find(x => x.simbolo === 'HM-CFTV-CAMERA');
  assert.deepStrictEqual({ tipo: cam.tipo, ambiente: cam.ambiente, delta: cam.delta, zerou: cam.zerou }, { tipo: 'assembleia', ambiente: 'CAPELA', delta: 2, zerou: false });
  const det = aj.find(x => x.simbolo === 'HM-INC-DETECTOR-FUMACA');
  assert.deepStrictEqual({ tipo: det.tipo, ambiente: det.ambiente, delta: det.delta, zerou: det.zerou }, { tipo: 'deposito', ambiente: 'DEPÓSITO 1', delta: -1, zerou: true });
  const c = aj.filter(x => x.modo === 'centro');
  assert.deepStrictEqual(c.map(x => [x.grupo, x.tipo]), [['telecom', 'deposito']], 'o QD por pavimento não ensina');
  assert.deepStrictEqual(RP.ajustesDaInstrucao({ ...A0, finalidade: 'orcamento' }, OPS), []);
  // mover componente entre salas é posição, não quantidade
  assert.deepStrictEqual(RP.ajustesDaInstrucao(A0, [{ tipo: 'mover', adicionar: [{ simbolo: 'HM-CFTV-CAMERA', x: 1, y: 1 }], remover: [{ simbolo: 'HM-CFTV-CAMERA', x: 0.5, y: 4.5 }], centros: {} }]), []);
});

caso('uma correção só não vira regra; a mesma em 2 análises vira (quantidade mais frequente)', () => {
  const aj = RP.ajustesDaInstrucao(A0, OPS);
  assert.strictEqual(RP.candidatas([{ analise_id: 1, ajustes: aj }]).length, 0);
  const duas = RP.candidatas([{ analise_id: 1, ajustes: aj }, { analise_id: 2, ajustes: aj }]);
  const porChave = Object.fromEntries(duas.map(c => [c.chave, c]));
  const cam = porChave['regra:cftv:assembleia:HM-CFTV-CAMERA:mais'];
  assert.ok(cam && cam.regra.n === 2 && cam.analises === 2, JSON.stringify(duas));
  assert.ok(porChave['regra:incendio:deposito:HM-INC-DETECTOR-FUMACA:nenhum']);
  assert.ok(porChave['regra:centro:telecom:deposito']);
  assert.ok(/acrescentar 2 × câmera de CFTV/.test(RP.textoDa(cam.regra)), RP.textoDa(cam.regra));
});

caso('3 ambientes do mesmo tipo numa análise viram regra; correção desfeita na mesma análise não conta', () => {
  const tres = ['DEPÓSITO 1', 'DEPÓSITO 2', 'DEPÓSITO 3'].map(ambiente => ({ disciplina: 'cftv', simbolo: 'HM-CFTV-CAMERA', tipo: 'deposito', ambiente, pavimento: 'Térreo', delta: 1, zerou: false }));
  assert.strictEqual(RP.candidatas([{ analise_id: 7, ajustes: tres }]).length, 1);
  // +2 e depois −2 na capela (duas instruções da mesma análise): saldo zero, nada a aprender
  const mais = { disciplina: 'cftv', simbolo: 'HM-CFTV-CAMERA', tipo: 'assembleia', ambiente: 'CAPELA', pavimento: 'Térreo', delta: 2, zerou: false };
  const menos = { ...mais, delta: -2 };
  assert.strictEqual(RP.candidatas([{ analise_id: 1, ajustes: [mais] }, { analise_id: 1, ajustes: [menos] }, { analise_id: 2, ajustes: [mais] }, { analise_id: 2, ajustes: [menos] }]).length, 0);
  // estrutura numa análise só não vira regra (precisa de 2)
  assert.strictEqual(RP.candidatas([{ analise_id: 1, ajustes: [{ modo: 'centro', grupo: 'telecom', disciplina: 'rede', tipo: 'deposito', ambiente: 'A' }] }]).length, 0);
});

console.log(`${ok} caso(s) ok`);
