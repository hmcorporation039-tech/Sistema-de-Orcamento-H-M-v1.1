// Conferência do quadro de cargas pela NBR 5410 (utils/conferenciaNBR5410.js).
// Circuitos SINTÉTICOS nos campos do leitor em colunas (formato AltoQi) e do
// formato em linha — nenhum dado de cliente. Os circuitos "certos" repetem os
// números típicos de um projeto real conferido à mão (Ic de tabela × FCA).
// Rodar: node testes/conferenciaNBR5410.test.js (pasta backend).
const assert = require('assert');
const { conferirCircuito, achadosNBR5410 } = require('../src/utils/conferenciaNBR5410');
const { gerarAchados } = require('../src/utils/analiseProjetoAchados');

let ok = 0;
function caso(nome, fn) {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack}`); process.exitCode = 1; }
}
const regras = (c) => conferirCircuito(c).map(r => r.regra);
// circuito em colunas: 2,5 mm² B1, Ic 24 A, FCA 0,7 → Iz 16,8 A
const col = (extra) => ({ circuito: 'T 1', esquema: 'F+N+T', metodo: 'B1', fases: 'R', ip_A: 9.1, disjuntor_A: 16, secao_mm2: 2.5, ic_A: 24, fct: 1, fca: 0.7, dv_parcial_pct: 1.06, dv_total_pct: 1.77, status: 'OK', ...extra });

caso('circuito conforme não gera nada (Iz = Ic × FCT × FCA, inclusive alimentador)', () => {
  assert.deepStrictEqual(regras(col()), []);
  assert.deepStrictEqual(regras({ circuito: 'QD-1PAV', alimentador: true, esquema: '3F+N+T', ip_A: 56.8, disjuntor_A: 63, secao_mm2: 35, ic_A: 110, fct: 1, fca: 0.65, dv_parcial_pct: 1.43, dv_total_pct: 1.64, status: 'OK' }), []);
  // queda total 4,01 % está dentro dos 5 % (6.2.7.1); o 4 % é só do circuito terminal
  assert.deepStrictEqual(regras(col({ circuito: 'VE-03', dv_parcial_pct: 2.37, dv_total_pct: 4.01 })), []);
});

caso('Ib > In e In > Iz corrigida', () => {
  assert.deepStrictEqual(regras(col({ ip_A: 18 })), ['ib_in']);
  // 16 A em 2,5 mm² com FCA 0,65: Iz 15,6 A
  const r = conferirCircuito(col({ fca: 0.65 }));
  assert.deepStrictEqual(r.map(x => x.regra), ['in_iz']);
  assert.match(r[0].texto, /disjuntor 16 A > Iz 15,6 A/);
});

caso('formato sem Ic: referência B1/PVC da Tabela 36 (2 ou 3 condutores carregados)', () => {
  const linha = { circuito: '3', descricao: 'Tomadas sala', corrente_A: 12, disjuntor_A: 25, cabo_mm2: 2.5, fases: 'R' };
  assert.deepStrictEqual(regras(linha), ['in_iz_ref']);
  assert.deepStrictEqual(regras({ ...linha, disjuntor_A: 20 }), []);
  // trifásico: 4 mm² conduz 28 A com 3 carregados → 32 A passa do limite
  assert.deepStrictEqual(regras({ circuito: 'M1', corrente_A: 20, disjuntor_A: 32, cabo_mm2: 4, fases: 'RST' }), ['in_iz_ref']);
});

caso('seção mínima (Tabela 47) pelo tipo do circuito', () => {
  assert.deepStrictEqual(regras(col({ circuito: 'IL 2', secao_mm2: 1.5, ic_A: 17.5, disjuntor_A: 10, ip_A: 2 })), []);
  assert.deepStrictEqual(regras(col({ circuito: 'T 4', secao_mm2: 1.5, ic_A: 17.5, disjuntor_A: 10, ip_A: 2 })), ['secao_min']);
  assert.deepStrictEqual(regras(col({ circuito: 'X', secao_mm2: 1, ic_A: 14, disjuntor_A: 6, ip_A: 2 })), ['secao_min']);
});

caso('queda de tensão: terminal > 4 %, total > 5 % (só com trafo) e > 7 %', () => {
  assert.deepStrictEqual(regras(col({ dv_parcial_pct: 4.3, dv_total_pct: 4.9 })), ['queda_terminal']);
  assert.deepStrictEqual(regras(col({ dv_total_pct: 5.8 })), ['queda_total_bt']);
  assert.deepStrictEqual(regras(col({ dv_total_pct: 7.5 })), ['queda_total']);
  // alimentador não tem o limite de circuito terminal
  assert.deepStrictEqual(regras(col({ alimentador: true, dv_parcial_pct: 4.5, dv_total_pct: 4.6 })), []);
});

caso('DR em área molhada/externa sem DR indicado; status do projetista', () => {
  assert.deepStrictEqual(regras(col({ descricao: 'Tomadas cozinha' })), ['dr']);
  assert.deepStrictEqual(regras(col({ descricao: 'Tomadas cozinha (DR 30mA)' })), []);
  assert.deepStrictEqual(regras(col({ status: 'ERRO' })), ['status']);
});

caso('achados agrupados por regra, com quadro/circuito; entram em gerarAchados', () => {
  const quadros = [{ quadro: 'QD-1', circuitos: [col({ circuito: 'T 1', fca: 0.65 }), col({ circuito: 'T 2', fca: 0.65 }), col({ circuito: 'T 3' })] }];
  const a = achadosNBR5410('ele.pdf', quadros);
  assert.strictEqual(a.length, 1);
  assert.match(a[0].tema, /In ≤ Iz/);
  assert.match(a[0].observacao, /^"ele\.pdf": QD-1 \/ T 1: .*; QD-1 \/ T 2: /);
  const todos = gerarAchados([{ arquivo: 'ele.pdf', disciplinas: ['eletrica'], quadroCargas: quadros[0].circuitos, quadrosDeCargas: quadros, cameras: { ocorrencias: 0 }, pontosRedeAntena: { rede: { ocorrencias: 0 }, antena: { ocorrencias: 0 } } }]);
  assert.ok(todos.some(x => /In ≤ Iz/.test(x.tema)));
});

console.log(`conferenciaNBR5410: ${ok} casos ok`);
process.exit(process.exitCode || 0);
