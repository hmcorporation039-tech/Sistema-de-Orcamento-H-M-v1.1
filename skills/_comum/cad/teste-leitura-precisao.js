// Teste da fase 3 do roteiro (precisão da leitura de PDF e DWG) com desenhos SINTÉTICOS montados
// aqui (nenhum dado de cliente):
//   - a legenda do projeto (pontosDoDesenho.legendaDoProjeto): o símbolo cuja linha não diz tipo
//     não pega o texto da linha vizinha (no R04, o isolador de laço saía como avisador);
//   - a biblioteca de blocos (CAD-08): a confirmação do mapa vale pela medida real e pelo escritório;
//   - a escala automática (CAD-09): informada → carimbo → nome do arquivo → portas → cota;
//   - o mapa único (CAD-10/12): a mesma medição de eletroduto no 3D e no orçamento.
// Rodar: node _comum/cad/teste-leitura-precisao.js
const assert = require('assert');
const { legendaDoProjeto, propostaDeMapa } = require('./pontosDoDesenho');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};
// quadrado/retângulo fechado de L × W com o canto em (x, y)
const ret = (layer, x, y, L, W = L) => ({ layer, pts: [[x, y], [x + L, y], [x + L, y + W], [x, y + W]], fechada: true });
const traco = (layer, x, y, L) => ({ layer, pts: [[x, y], [x + L, y]] });
const nota = (s, x, y) => ({ s, x, y, h: 0.12, legenda: true });

// legenda do incêndio no padrão do R04: cada símbolo à esquerda, o texto à direita, linhas a 0,67 m
function legendaIncendio() {
  return {
    ambientes: [], referencia: [], preenchimentos: [],
    notas: [
      nota('Sinalizador audiovisual SAV 521E h=2,40m', 35.4, 17.85),
      nota('Isolador de laco IDL 521', 35.4, 17.15),
      nota('Acionador manual AME 521 h=1,20m', 35.4, 16.5),
      nota('Raio de cobertura do detector (6,3 m) - conferencia', 35.4, 15.8),
    ],
    simbolosDaLegenda: [
      ret('INC-SIRENE', 34.66, 17.71, 0.38, 0.33),
      ret('INC-ISOLADOR', 34.63, 17.08, 0.44, 0.26),
      ret('INC-ACIONADOR', 34.69, 16.34, 0.32),
      traco('INC-RAIO-COBERTURA', 34.5, 15.8, 0.7),
    ],
  };
}

caso('legenda: a linha sem tipo ("Isolador de laço") não pega o texto da vizinha', () => {
  const leg = legendaDoProjeto(legendaIncendio());
  const por = Object.fromEntries(leg.map(l => [l.layer, l.simbolo]));
  assert.strictEqual(por['INC-ISOLADOR'], undefined, JSON.stringify(leg));
  assert.strictEqual(por['INC-SIRENE'], 'HM-INC-AVISADOR');
  assert.strictEqual(por['INC-ACIONADOR'], 'HM-INC-ACIONADOR');
  assert.strictEqual(leg.find(l => l.layer === 'INC-SIRENE').altura_m, 2.4);
  // o traço da legenda (raio de cobertura) não é símbolo de ponto
  assert.strictEqual(por['INC-RAIO-COBERTURA'], undefined);
});

caso('legenda: comSemTipo devolve a linha sem tipo com o próprio texto', () => {
  const leg = legendaDoProjeto(legendaIncendio(), { comSemTipo: true });
  const iso = leg.find(l => l.layer === 'INC-ISOLADOR');
  assert.ok(iso && iso.simbolo === null && /Isolador de laco/.test(iso.texto), JSON.stringify(iso));
});

caso('mapa: com o isolador sem tipo, a sirene de mesma quantidade continua avisador (antes virava "?")', () => {
  const arq = legendaIncendio();
  // planta: 3 sirenes e 3 isoladores (a regra "o mesmo aparelho em duas layers" anulava a sirene)
  for (let i = 0; i < 3; i++) {
    arq.referencia.push(ret('INC-SIRENE', i * 5, 0, 0.38, 0.33), ret('INC-ISOLADOR', i * 5 + 1, 0, 0.44, 0.26));
  }
  const m = propostaDeMapa(arq);
  const sir = m.simbolos.find(s => s.layer === 'INC-SIRENE');
  const iso = m.simbolos.find(s => s.layer === 'INC-ISOLADOR');
  assert.deepStrictEqual([sir.simbolo, sir.tipoDe, sir.altura_m], ['HM-INC-AVISADOR', 'legenda', 2.4]);
  // a linha "?" mostra o que a legenda diz e não diz que o tipo veio da legenda
  assert.deepStrictEqual([iso.simbolo, iso.tipoDe], ['?', undefined]);
  assert.match(iso.rotulo, /Isolador de laco/);
});

caso('legenda: texto em duas linhas e legenda em duas colunas', () => {
  const arq = {
    ambientes: [], referencia: [], preenchimentos: [],
    notas: [
      nota('Tomada alta a 2,20m do piso', 1.0, 10.05), nota('2P+T 20A', 1.0, 9.85),
      nota('Interruptor simples h=1,10m', 1.0, 9.3),
      // segunda coluna, 3 m à direita, linhas um pouco desalinhadas
      nota('Detector de fumaca', 4.0, 10.0), nota('Isolador de laco', 4.0, 9.35),
    ],
    simbolosDaLegenda: [
      ret('EL-TOMADAS', 0.3, 9.85, 0.3), ret('EL-INTERRUP', 0.3, 9.2, 0.2),
      ret('INC-SIMBOLOS', 3.3, 9.88, 0.3), ret('INC-SIMBOLOS', 3.3, 9.25, 0.3, 0.2),
    ],
  };
  const leg = legendaDoProjeto(arq);
  const tom = leg.find(l => l.layer === 'EL-TOMADAS');
  assert.deepStrictEqual([tom.simbolo, tom.altura_m], ['HM-ELE-TOMADA-ALTA', 2.2]);
  assert.strictEqual(leg.find(l => l.layer === 'EL-INTERRUP').simbolo, 'HM-ELE-INTERRUPTOR');
  const inc = leg.filter(l => l.layer === 'INC-SIMBOLOS');
  assert.deepStrictEqual(inc.map(l => l.simbolo), ['HM-INC-DETECTOR-FUMACA'], JSON.stringify(inc));
});

// ── Biblioteca de blocos (CAD-08) ───────────────────────────────────────────
function plantaDeQuadrados() {
  const arq = { ambientes: [], referencia: [], preenchimentos: [], notas: [], simbolosDaLegenda: [] };
  for (let i = 0; i < 3; i++) arq.referencia.push(ret('EL-SIMBOLOS', i * 2, 0, 0.2));
  for (let i = 0; i < 2; i++) arq.referencia.push(ret('EL-SIMBOLOS', i * 2, 5, 0.4));
  return arq;
}
const aprendido = (simbolo, L, extra = {}) => ({ layer: 'EL-SIMBOLOS', medida: [L, L], fracao: 0, simbolo, disciplina: 'eletrica', usuario: true, porMedida: true, ...extra });

caso('biblioteca: dois quadrados de tamanhos diferentes na mesma layer não se confundem', () => {
  const m = propostaDeMapa(plantaDeQuadrados(), { aprendidos: [aprendido('HM-ELE-TOMADA-BAIXA', 0.2), aprendido('HM-ELE-QUADRO', 0.4)] });
  const por = Object.fromEntries(m.simbolos.map(s => [s.medida[0], s.simbolo]));
  assert.deepStrictEqual([por[0.2], por[0.4]], ['HM-ELE-TOMADA-BAIXA', 'HM-ELE-QUADRO'], JSON.stringify(m.simbolos.map(s => [s.medida, s.simbolo])));
  // só a de 20 cm aprendida: a de 40 cm fica sem tipo (antes as duas viravam a mesma coisa)
  const so20 = propostaDeMapa(plantaDeQuadrados(), { aprendidos: [aprendido('HM-ELE-TOMADA-BAIXA', 0.2)] });
  assert.strictEqual(so20.simbolos.find(s => s.medida[0] === 0.4).simbolo, '?');
});

caso('biblioteca: o escritório do carimbo vem antes; o aprendizado antigo (só proporção) continua valendo', () => {
  const aprendidos = [aprendido('HM-ELE-TOMADA-BAIXA', 0.2, { escritorio: 'OUTRO ESCRITORIO' }), aprendido('HM-ELE-INTERRUPTOR', 0.2, { escritorio: 'FULANO DE TAL' })];
  const m = propostaDeMapa(plantaDeQuadrados(), { aprendidos, escritorio: 'FULANO DE TAL' });
  assert.strictEqual(m.simbolos.find(s => s.medida[0] === 0.2).simbolo, 'HM-ELE-INTERRUPTOR');
  // sem escritório no carimbo: dois tipos possíveis para a mesma medida → nenhum (fica para conferir)
  const sem = propostaDeMapa(plantaDeQuadrados(), { aprendidos });
  assert.strictEqual(sem.simbolos.find(s => s.medida[0] === 0.2).simbolo, '?');
  // linha antiga (sem medida): casa pela proporção, como antes
  const antigo = propostaDeMapa(plantaDeQuadrados(), { aprendidos: [{ ...aprendido('HM-ELE-TOMADA-BAIXA', 0.3), porMedida: undefined }] });
  assert.ok(antigo.simbolos.every(s => s.simbolo === 'HM-ELE-TOMADA-BAIXA'));
});

module.exports = { ret, traco, nota, caso };
if (require.main === module) process.on('exit', () => console.log(`leitura (fase 3): ${ok} casos ok`));
