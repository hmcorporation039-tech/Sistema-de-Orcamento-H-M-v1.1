// Desenho de fundo da planta do mapa do CAD (services/analiseCad/fundoDoMapa.js): só a região da planta, sem o que
// não é planta, sem miudeza de símbolo e simplificado em níveis até caber. Traços SINTÉTICOS (nenhum dado de cliente).
// Rodar: node testes/fundoDoMapa.test.js
const assert = require('assert');
const { fundoDoMapa, regiaoDeInteresse, caixaPrincipal, MAX_VERTICES } = require('../src/services/analiseCad/fundoDoMapa');

let ok = 0;
const caso = (nome, fn) => { try { fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };
const parede = (x0, y0, x1, y1, layer = 'A-PAREDE') => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fechada: true, layer });

caso('parede entra; unifilar longe da planta, região de carimbo e miudeza de símbolo saem', () => {
  const regiao = regiaoDeInteresse([[2, 2], [8, 3]], []);
  const f = fundoDoMapa([
    parede(0, 0, 10, 5),
    { pts: [[110000, 0], [110050, 0]], layer: 'DI-Barramento' }, // unifilar a 110 km (caso real de 03/11/2026)
    { pts: [[1, 1], [1.05, 1.02]], layer: 'P-SIMBOL' }, // traço de 5 cm do símbolo
    { pts: [[20, 0], [30, 0]], layer: 'CARIMBO' },
  ], [[19, -1, 31, 1]], regiao);
  assert.deepStrictEqual(f.layers, ['A-PAREDE']);
  assert.strictEqual(f.linhas.length, 1);
  // [layer, x0, y0, …] fechado: volta ao primeiro vértice
  assert.deepStrictEqual(f.linhas[0], [0, 0, 0, 10, 0, 10, 5, 0, 5, 0, 0]);
});

caso('desenho grande: simplifica até caber e as paredes de TODAS as plantas ficam (antes, só as da primeira)', () => {
  const tracos = [];
  // 5 plantas separadas: os detalhes (4.000 traços de 40 cm com vértice a cada 4,4 cm) vêm antes das paredes
  for (let k = 0; k < 5; k++) {
    for (let i = 0; i < 4000; i++) {
      const x = k * 300 + (i % 100) * 0.5, y = Math.floor(i / 100) * 0.5;
      tracos.push({ pts: Array.from({ length: 10 }, (_, j) => [x + j * 0.044, y]), layer: `DETALHE-${k}` });
    }
  }
  for (let k = 0; k < 5; k++) for (let i = 0; i < 50; i++) tracos.push({ pts: [[k * 300, i], [k * 300 + 10, i]], layer: `PAREDE-${k}` });
  const f = fundoDoMapa(tracos, [], null);
  const vertices = f.linhas.reduce((s, l) => s + (l.length - 1) / 2, 0);
  assert.ok(vertices <= MAX_VERTICES, `${vertices} vértices`);
  for (let k = 0; k < 5; k++) assert.ok(f.layers.includes(`PAREDE-${k}`), `paredes da planta ${k + 1}: ${f.layers.join(', ')}`);
  // só traços curtos (nada sobra no nível mais grosso): fica o nível anterior, cortado na cota — nunca vazio
  const curtos = fundoDoMapa(tracos.filter(t => t.layer.startsWith('DETALHE')), [], null);
  assert.ok(curtos && curtos.linhas.length > 0 && curtos.cortados > 0);
});

caso('enquadramento pelos percentis: ponto perdido longe não encolhe a planta', () => {
  const xs = [...Array.from({ length: 99 }, (_, i) => i / 10), 5000];
  const ys = [...Array.from({ length: 99 }, (_, i) => i / 20), -3000];
  const c = caixaPrincipal(xs, ys);
  assert.ok(c[2] < 20 && c[1] > -5, JSON.stringify(c));
});

console.log(`fundoDoMapa: ${ok} casos ok`);
