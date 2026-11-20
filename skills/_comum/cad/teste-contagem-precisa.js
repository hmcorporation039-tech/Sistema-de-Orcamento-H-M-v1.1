// Contagem precisa de pontos no DWG (20/11/2026), com desenhos SINTÉTICOS (nenhum dado de cliente):
//   - unidade: o cabeçalho que dá ao desenho tamanho implausível não vale (mm declarado, desenhado em metros);
//   - a mesma planta desenhada duas vezes (pontos + fiação) conta uma vez só; pavimentos diferentes contam os dois;
//   - o filtro de posição tira a vista repetida (com folga) e mantém a principal.
// Rodar: node _comum/cad/teste-contagem-precisa.js
const assert = require('assert');
const { decidirFator } = require('./arquitetura');
const { filtroDoPonto, paraTestes: { marcarRepeticoes } } = require('./objetivoDoProjeto');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};

caso('unidade: cabeçalho em mm com planta de 50 unidades e sem porta → metros', () => {
  assert.strictEqual(decidirFator(4, [], 52, 50), 1);
});
caso('unidade: cabeçalho em mm com planta de 50.000 unidades → mm (como antes)', () => {
  assert.strictEqual(decidirFator(4, [], 52000, 50000), 0.001);
});
caso('unidade: cabeçalho em metros plausível continua valendo', () => {
  assert.strictEqual(decidirFator(6, [], 40, 40), 1);
});

// planta sintética: paredes (ARQ) + pontos/fiação (EL-) dentro de uma caixa de 50 × 24
function planta(dx, dy, { semente = 1, comFiacao = false } = {}) {
  let s = semente;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const segs = [];
  for (let i = 0; i < 120; i++) { const x = rnd() * 50, y = rnd() * 24; segs.push({ a: [dx + x, dy + y], b: [dx + x + 2, dy + y], layer: 'ARQ-PAREDE' }); }
  for (let i = 0; i < 80; i++) { const x = rnd() * 50, y = rnd() * 24; segs.push({ a: [dx + x, dy + y], b: [dx + x + 0.3, dy + y + 0.3], layer: 'EL-Tomadas' }); }
  if (comFiacao) for (let i = 0; i < 30; i++) { const x = rnd() * 48, y = rnd() * 24; segs.push({ a: [dx + x, dy + y], b: [dx + x + 1.5, dy + y], layer: 'EL-Fios (Fase 1)' }); }
  return segs;
}
const vista = (id, caixa, titulo) => ({ id, caixa, titulo, papel: 'principal' });

caso('repetição: "PLANTA DE PONTOS" + "PLANTA DE FIAÇÃO" do mesmo pavimento → a fiação não conta', () => {
  const v1 = vista('V1', [0, 0, 50, 24], 'PLANTA DE FIAÇÃO');
  const v2 = vista('V2', [0, 30, 50, 55], 'PLANTA DE PONTOS ELÉTRICOS'); // caixa 1 m mais alta (título)
  const segs = new Map([[v1, planta(0, 0, { comFiacao: true })], [v2, planta(0, 30)]]);
  marcarRepeticoes([v1, v2], (v) => segs.get(v));
  assert.strictEqual(v2.papel, 'principal', 'a de PONTOS fica');
  assert.strictEqual(v1.papel, 'repeticao', v1.motivo);
});
caso('repetição: pavimentos tipo com a mesma arquitetura e pontos diferentes contam os dois', () => {
  const v1 = vista('V1', [0, 0, 50, 24], 'PLANTA BAIXA');
  const v2 = vista('V2', [0, 30, 50, 54], 'PLANTA BAIXA');
  const a = planta(0, 0, { semente: 7 }), b = planta(0, 30, { semente: 7 });
  const outros = planta(0, 30, { semente: 99 }).filter(s => s.layer === 'EL-Tomadas');
  const segs = new Map([[v1, a], [v2, b.filter(s => s.layer !== 'EL-Tomadas').concat(outros)]]);
  marcarRepeticoes([v1, v2], (v) => segs.get(v));
  assert.strictEqual(v1.papel, 'principal');
  assert.strictEqual(v2.papel, 'principal');
});
caso('repetição: "2º PAVIMENTO" × "3º PAVIMENTO" com desenho igual contam os dois', () => {
  const v1 = vista('V1', [0, 0, 50, 24], '2º PAVIMENTO');
  const v2 = vista('V2', [0, 30, 50, 54], '3º PAVIMENTO');
  const segs = new Map([[v1, planta(0, 0, { semente: 3 })], [v2, planta(0, 30, { semente: 3 })]]);
  marcarRepeticoes([v1, v2], (v) => segs.get(v));
  assert.strictEqual(v2.papel, 'principal');
});
caso('filtro: ponto na vista repetida (inclusive na folga da caixa) fica fora; o da principal entra', () => {
  const objetivo = { objeto: 'arquitetura', vistas: [
    { id: 'V1', papel: 'principal', caixa: [0, 0, 50, 24] },
    { id: 'V2', papel: 'repeticao', caixa: [0, 30, 50, 54] },
  ] };
  const f = filtroDoPonto(objetivo);
  assert.ok(f([10, 10]));
  assert.ok(!f([10, 40]));
  assert.ok(!f([-0.8, 40]), 'tomada na face externa da parede da vista repetida');
});

console.log(`contagem precisa: ${ok} casos ok`);
