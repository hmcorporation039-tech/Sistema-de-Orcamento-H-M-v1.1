// Teste dos PAVIMENTOS (./pavimentos.js), da leitura dos ambientes pela etiqueta do arquiteto (./arquitetura.js) e do
// PROJETISTA da elaboração (./projetista.js) — versão 2.45, 18/11/2026. Pedido do usuário: o DWG da paróquia tinha
// subsolo, térreo, 1º e 2º pavimento lado a lado e o sistema via um pavimento só, não lia os nomes das salas e, no
// "elaborar projeto", só supunha quantidades. Desenho SINTÉTICO montado aqui (nenhum dado de cliente).
// Rodar: node _comum/cad/teste-pavimentos.js
const assert = require('assert');
const { lerArquitetura } = require('./arquitetura');
const { pavimentoDoTitulo, dividirPorPavimentos } = require('./pavimentos');
const { plantasDoDesenho } = require('./pranchas');
const { projetarDisciplinas, tipoDoAmbiente } = require('./projetista');
const INC = require('../../incendio/scripts/lib/calculo');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};

// ── DXF cru ───────────────────────────────────────────────────────────────────────────────────────────
const dxfR = (ents) => ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', 6, '0', 'ENDSEC',
  '0', 'SECTION', '2', 'ENTITIES', ...ents.flat(), '0', 'ENDSEC', '0', 'EOF'].join('\n');
const L = (x1, y1, x2, y2, layer = '0') => ['0', 'LINE', '8', layer, '10', x1, '20', y1, '30', 0, '11', x2, '21', y2, '31', 0];
const T = (s, x, y, h = 0.15, layer = 'TEXTO') => ['0', 'TEXT', '8', layer, '10', x, '20', y, '30', 0, '40', h, '1', s];
const PL = (pts, layer) => ['0', 'LWPOLYLINE', '8', layer, '90', pts.length, '70', 1, ...pts.flatMap(([x, y]) => ['10', x, '20', y])];
const RET = (x0, y0, x1, y1, layer) => [L(x0, y0, x1, y0, layer), L(x1, y0, x1, y1, layer), L(x1, y1, x0, y1, layer), L(x0, y1, x0, y0, layer)];
const br = (v) => v.toFixed(2).replace('.', ',');

// Uma planta de 18 × 10 m (parede de 15 cm), 4 salas (2 × 2) separadas por divisórias de 15 cm com VÃOS DE 1 m SEM
// PORTA desenhada; cada sala com o nome e a etiqueta "Área: xx m²" do arquiteto. Deslocada de dx.
const SALAS = (x0) => [
  { c: [1.15, 1.15, 10, 6] }, { c: [10.15, 1.15, 18.85, 6] }, { c: [1.15, 6.15, 10, 10.85] }, { c: [10.15, 6.15, 18.85, 10.85] },
].map(s => ({ ...s, c: [s.c[0] + x0, s.c[1], s.c[2] + x0, s.c[3]], area: (s.c[2] - s.c[0]) * (s.c[3] - s.c[1]) }));
function planta(dx, nomes, titulo, { lixo = false } = {}) {
  const e = [];
  e.push(...RET(1 + dx, 1, 19 + dx, 11, 'ALVENARIA'), ...RET(1.15 + dx, 1.15, 18.85 + dx, 10.85, 'ALVENARIA'));
  // divisória vertical (x 10–10,15) com vãos em y 3–4 e 8–9
  for (const x of [10, 10.15]) e.push(L(x + dx, 1.15, x + dx, 3, 'ALVENARIA'), L(x + dx, 4, x + dx, 8, 'ALVENARIA'), L(x + dx, 9, x + dx, 10.85, 'ALVENARIA'));
  for (const y of [3, 4, 8, 9]) e.push(L(10 + dx, y, 10.15 + dx, y, 'ALVENARIA'));
  // divisória horizontal (y 6–6,15) com vãos em x 5–6 e 14–15
  for (const y of [6, 6.15]) e.push(L(1.15 + dx, y, 5 + dx, y, 'ALVENARIA'), L(6 + dx, y, 10 + dx, y, 'ALVENARIA'), L(10.15 + dx, y, 14 + dx, y, 'ALVENARIA'), L(15 + dx, y, 18.85 + dx, y, 'ALVENARIA'));
  for (const x of [5, 6, 14, 15]) e.push(L(x + dx, 6, x + dx, 6.15, 'ALVENARIA'));
  SALAS(dx).forEach((s, i) => {
    const cx = (s.c[0] + s.c[2]) / 2 - 1, cy = (s.c[1] + s.c[3]) / 2;
    e.push(T(nomes[i], cx, cy + 0.25, 0.15, '#ARQUITETURA HACHURA'), T(`Área: ${br(s.area)} m²`, cx, cy, 0.1, '#ARQUITETURA HACHURA'));
  });
  // anotação de esquadria dentro da sala (não é sala nem nome)
  if (lixo) e.push(T('FIXA+MAXIM-AR', 3 + dx, 9, 0.12, '#ARQUITETURA TEXTO'));
  // título embaixo da planta e a moldura da prancha (a de uma planta ENCOSTA na da outra)
  e.push(T(titulo, 2 + dx, -1, 0.3, '#ARQUITETURA TEXTO'), ...RET(0 + dx, -2, 20 + dx, 14, '#ARQUITETURA PRANCHA'));
  return e;
}
function desenho() {
  const e = [
    ...planta(0, ['SECRETARIA', 'CPD', 'CIRCULAÇÃO', 'BANHEIRO'], 'PLANTA BAIXA - TÉRREO', { lixo: true }),
    ...planta(20, ['QUARTO - 01', 'SALA DE ESTAR', 'CAPELA', 'DEPÓSITO'], 'PLANTA BAIXA - 1º PAVIMENTO'),
    // o limite do terreno corre por baixo das duas plantas e liga uma na outra
    L(0, 12.5, 40, 12.5, 'LIMITE'),
    // quadro de especificações da prancha: células fechadas com texto (antes viravam "ambientes" PORTAS e ESQUADRIAS)
    PL([[2, 11.5], [6, 11.5], [6, 12.3], [2, 12.3]], '#ARQUITETURA 02'), T('PORTAS', 2.3, 11.8, 0.12, '#ARQUITETURA TEXTO'),
    PL([[6, 11.5], [10, 11.5], [10, 12.3], [6, 12.3]], '#ARQUITETURA 02'), T('ESQUADRIAS', 6.3, 11.8, 0.12, '#ARQUITETURA TEXTO'),
  ];
  return dxfR(e);
}

caso('título → pavimento: subsolo, térreo, nº pavimento/andar/PAV 01, cobertura; nota de escada e corte não são título', () => {
  const p = (s) => pavimentoDoTitulo(s)?.nome || null;
  assert.strictEqual(p('PLANTA BAIXA - SUBSOLO'), 'Subsolo');
  assert.strictEqual(p('PLANTA BAIXA 2º SUBSOLO'), '2º subsolo');
  assert.strictEqual(p('PLANTA BAIXA TÉRREO'), 'Térreo');
  assert.strictEqual(p('PLANTA BAIXA 1º PAVIMENTO'), '1º pavimento');
  assert.strictEqual(p('PLANTA BAIXA - PAV 02'), '2º pavimento');
  assert.strictEqual(p('PLANTA DO SEGUNDO ANDAR'), '2º pavimento');
  assert.strictEqual(p('PLANTA DE COBERTURA'), 'Cobertura');
  assert.strictEqual(p('ESCADA SOBE 1º PAVIMENTO'), null);
  assert.strictEqual(p('PROJEÇÃO PAV.SUPERIOR'), null);
  assert.strictEqual(p('NOVO PAVIMENTO 1'), null);
  assert.ok(pavimentoDoTitulo('PLANTA BAIXA - SUBSOLO').ordem < pavimentoDoTitulo('PLANTA BAIXA TÉRREO').ordem);
});

caso('região com dois pavimentos encostados: cortada na divisa da moldura da prancha', () => {
  const segmentos = [{ a: [20, -2], b: [20, 14], layer: '#ARQUITETURA PRANCHA' }, { a: [0, 5], b: [40, 5], layer: 'LIMITE' }];
  const textos = [{ s: 'PLANTA BAIXA - TÉRREO', x: 2, y: -1, h: 0.3 }, { s: 'PLANTA BAIXA - 1º PAVIMENTO', x: 22, y: -1, h: 0.3 }];
  const r = dividirPorPavimentos({ tipo: 'planta', caixa: [0, -2, 40, 14] }, { textos, segmentos });
  assert.deepStrictEqual(r.map(x => x.pavimento.nome), ['Térreo', '1º pavimento']);
  assert.strictEqual(r[0].caixa[2], 20);
  assert.strictEqual(r[1].caixa[0], 20);
  // um pavimento só: a região fica inteira, com o pavimento
  const um = dividirPorPavimentos({ tipo: 'planta', caixa: [0, -2, 20, 14] }, { textos: textos.slice(0, 1), segmentos });
  assert.strictEqual(um.length, 1);
  assert.strictEqual(um[0].pavimento.nome, 'Térreo');
});

const arq = lerArquitetura(desenho());

caso('desenho com duas plantas lado a lado: dois pavimentos, cada ambiente no dele', () => {
  assert.deepStrictEqual(arq.pavimentos.map(p => p.nome), ['Térreo', '1º pavimento']);
  const doPav = (n) => arq.ambientes.filter(a => a.pavimento === n).map(a => a.nome).sort();
  assert.deepStrictEqual(doPav('Térreo'), ['BANHEIRO', 'CIRCULAÇÃO', 'CPD', 'SECRETARIA']);
  assert.deepStrictEqual(doPav('1º pavimento'), ['CAPELA', 'DEPÓSITO', 'QUARTO - 01', 'SALA DE ESTAR']);
});

caso('salas com vão aberto de 1 m (sem porta desenhada) fecham, com a área escrita pelo arquiteto', () => {
  for (const a of arq.ambientes) {
    assert.ok(a.area_projeto_m2 > 0, `${a.nome} sem a área escrita`);
    assert.ok(Math.abs(a.area_m2 - a.area_projeto_m2) <= 0.15 * a.area_projeto_m2, `${a.nome}: lida ${a.area_m2} × escrita ${a.area_projeto_m2}`);
    assert.ok(!a.areaDivergente, `${a.nome} marcado divergente`);
  }
});

caso('anotação e tabela da prancha não viram ambiente (FIXA+MAXIM-AR, PORTAS, ESQUADRIAS)', () => {
  const nomes = arq.ambientes.map(a => a.nome);
  assert.strictEqual(arq.ambientes.length, 8, nomes.join(', '));
  for (const lixo of ['PORTAS', 'ESQUADRIAS', 'FIXA+MAXIM-AR']) assert.ok(!nomes.includes(lixo), `${lixo} virou ambiente`);
});

caso('3D: uma planta por pavimento, na ordem do prédio e com o nome do pavimento', () => {
  const pl = plantasDoDesenho(arq).filter(p => p.ambientes);
  assert.deepStrictEqual(pl.map(p => p.nome), ['Planta 1 — Térreo', 'Planta 2 — 1º pavimento']);
});

caso('tipo do ambiente pelo nome', () => {
  assert.strictEqual(tipoDoAmbiente('BANHEIRO PNE'), 'sanitario');
  assert.strictEqual(tipoDoAmbiente('SALA TÉCNICA'), 'tecnica');
  assert.strictEqual(tipoDoAmbiente('CAPELA'), 'assembleia');
  assert.strictEqual(tipoDoAmbiente('SECRETARIA GERAL'), 'escritorio');
  assert.strictEqual(tipoDoAmbiente('QUARTO - 01'), 'dormitorio');
  assert.strictEqual(tipoDoAmbiente('PÁTIO COBERTO'), 'externo');
  assert.strictEqual(tipoDoAmbiente('CIRCULAÇÃO'), 'circulacao');
  assert.strictEqual(tipoDoAmbiente('SALA - 08'), 'sala');
});

const proj = projetarDisciplinas(arq, ['cftv', 'incendio', 'cabeamento']);
const de = (simbolo, ambiente) => proj.pontos.filter(p => p.simbolo === simbolo && (!ambiente || p.ambiente === ambiente));

caso('projetista CFTV: câmera onde há o que vigiar; nunca em banheiro, quarto ou na residência', () => {
  assert.ok(de('HM-CFTV-CAMERA', 'CAPELA').length >= 2, 'capela com menos de 2 câmeras');
  for (const a of ['SECRETARIA', 'CPD', 'CIRCULAÇÃO']) assert.strictEqual(de('HM-CFTV-CAMERA', a).length, 1, a);
  for (const a of ['BANHEIRO', 'QUARTO - 01', 'SALA DE ESTAR']) assert.strictEqual(de('HM-CFTV-CAMERA', a).length, 0, a);
  // cada câmera dentro da sala dela, com o motivo
  for (const p of de('HM-CFTV-CAMERA')) {
    const a = arq.ambientes.find(x => x.nome === p.ambiente);
    assert.ok(require('./arquitetura').dentro([p.x, p.y], a.poligono), `câmera fora de ${p.ambiente}`);
    assert.ok(p.motivo, 'câmera sem motivo');
  }
  // a capela: câmeras em cantos diferentes
  const cap = de('HM-CFTV-CAMERA', 'CAPELA');
  assert.ok(Math.hypot(cap[0].x - cap[1].x, cap[0].y - cap[1].y) > 3, 'duas câmeras no mesmo canto');
});

caso('projetista: rack no CPD; detectores pela grade da NBR 17240 (o cálculo da skill); acionador e avisador por pavimento', () => {
  const rack = de('HM-CAB-RACK');
  assert.strictEqual(rack.length, 1);
  assert.strictEqual(rack[0].ambiente, 'CPD');
  for (const a of arq.ambientes) {
    const n = de('HM-INC-DETECTOR-FUMACA', a.nome).length + de('HM-INC-DETECTOR-TEMP', a.nome).length;
    if (a.nome === 'BANHEIRO') { assert.strictEqual(n, 0, 'detector no banheiro'); continue; }
    const xs = a.poligono.map(p => p[0]), ys = a.poligono.map(p => p[1]);
    const g = INC.gradeDetectores(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), INC.RAIO.fumaca);
    assert.ok(n >= 1 && n <= g.n, `${a.nome}: ${n} detector(es), grade ${g.n}`);
  }
  for (const pav of ['Térreo', '1º pavimento']) {
    assert.ok(proj.pontos.some(p => p.simbolo === 'HM-INC-ACIONADOR' && p.pavimento === pav), `sem acionador no ${pav}`);
    assert.ok(proj.pontos.some(p => p.simbolo === 'HM-INC-AVISADOR' && p.pavimento === pav), `sem avisador no ${pav}`);
  }
  assert.strictEqual(de('HM-INC-CENTRAL').length, 1);
});

caso('projetista: traçado (eletrocalha + eletrodutos) e cabo MEDIDO por ponto, com a subida entre pavimentos', () => {
  assert.ok(proj.trechos.some(t => t.disciplina === 'cftv' && t.tipo === 'eletrocalha' && t.segmentos.length), 'sem eletrocalha');
  assert.ok(proj.trechos.some(t => t.tipo === 'eletroduto' && t.segmentos.length), 'sem eletroduto');
  const rack = de('HM-CAB-RACK')[0];
  for (const p of de('HM-CFTV-CAMERA')) {
    assert.ok(p.cabo_m > 0, 'câmera sem cabo');
    const reta = Math.abs(p.x - rack.x) + Math.abs(p.y - rack.y);
    if (p.pavimento === rack.pavimento) assert.ok(p.cabo_m >= reta, `${p.ambiente}: cabo ${p.cabo_m} < ${reta}`);
    else assert.ok(p.cabo_m >= 3.2, `${p.ambiente}: cabo sem a subida`);
  }
  // CFTV e rede dividem a eletrocalha: o tronco é contado uma vez
  assert.strictEqual(proj.metragens.filter(m => /Eletrocalha/.test(m.descricao)).length, 1);
  assert.ok(proj.metragens.some(m => /laço classe A/.test(m.descricao) && m.metros > 0), 'sem o laço de incêndio');
  assert.ok(proj.cabos.every(c => c.comprimento_m > 0));
});

caso('projetista: sem disciplina conhecida ou sem ambiente com nome, nada é inventado', () => {
  assert.strictEqual(projetarDisciplinas(arq, ['eletrica']).pontos.length, 0);
  const semNome = projetarDisciplinas({ ambientes: [{ nome: 'Ambiente 1', semNome: true, area_m2: 20, poligono: [[0, 0], [5, 0], [5, 4], [0, 4]] }] }, ['cftv']);
  assert.strictEqual(semNome.pontos.length, 0);
  assert.ok(semNome.avisos.length >= 1);
});

console.log(`pavimentos e projetista: ${ok} casos ok`);
