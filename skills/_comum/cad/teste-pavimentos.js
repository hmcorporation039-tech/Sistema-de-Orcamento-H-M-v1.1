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
  assert.strictEqual(projetarDisciplinas(arq, ['pressurizacao']).pontos.length, 0);
  const semNome = projetarDisciplinas({ ambientes: [{ nome: 'Ambiente 1', semNome: true, area_m2: 20, poligono: [[0, 0], [5, 0], [5, 4], [0, 4]] }] }, ['cftv']);
  assert.strictEqual(semNome.pontos.length, 0);
  assert.ok(semNome.avisos.length >= 1);
});

// ── 2.46: níveis/pé-direito, alinhamento, roteamento, critérios, disciplinas novas, prancha e prédio empilhado ──
// o mesmo desenho com as cotas de nível escritas (térreo +0,10 e 1º +3,40 → 3,30 m entre pisos)
function desenhoComNiveis() {
  const e = [
    ...planta(0, ['SECRETARIA', 'CPD', 'CIRCULAÇÃO', 'BANHEIRO'], 'PLANTA BAIXA - TÉRREO'),
    ...planta(20, ['QUARTO - 01', 'SALA DE ESTAR', 'CAPELA', 'DEPÓSITO'], 'PLANTA BAIXA - 1º PAVIMENTO'),
    L(0, 12.5, 40, 12.5, 'LIMITE'),
    ...[[3, 3], [16, 3], [3, 9]].map(([x, y]) => T('+0,10', x, y, 0.1, 'ARQ-SMB-NIV')),
    ...[[23, 3], [36, 3], [23, 9], [36, 9]].map(([x, y]) => T('+3,40', x, y, 0.1, 'ARQ-SMB-NIV')),
    T('-0,05', 8, 2, 0.1, 'ARQ-SMB-NIV'), // cota solta (degrau): não é o piso
  ];
  return dxfR(e);
}
const arqN = lerArquitetura(desenhoComNiveis());
// porta entre a SECRETARIA e o CPD (no vão da divisória) e a da fachada na CIRCULAÇÃO (entrada)
const comPortas = (a) => ({ ...a, portas: [
  { meio: [10.07, 3.5], n: [1, 0], largura_m: 0.9, ambientes: ['SECRETARIA', 'CPD'], externa: false },
  { meio: [1.07, 8.5], n: [1, 0], largura_m: 1.2, ambientes: ['CIRCULAÇÃO'], externa: true },
] });

caso('2.46 níveis: o piso de cada pavimento pela cota mais repetida, subindo; pé-direito = entre pisos − laje', () => {
  const [t, p1] = arqN.pavimentos;
  assert.strictEqual(t.nivel_m, 0.1);
  assert.strictEqual(p1.nivel_m, 3.4);
  assert.strictEqual(t.entre_pisos_m, 3.3);
  assert.strictEqual(t.pe_direito_m, 3.1);
  assert.strictEqual(p1.pe_direito_m, null, 'o último pavimento não tem o de cima lido');
});

caso('2.46 alinhamento: o 1º pavimento vai para cima do térreo pelas paredes que se repetem', () => {
  const p1 = arqN.pavimentos[1];
  assert.deepStrictEqual(p1.deslocamento, [-20, 0]);
  assert.match(p1.metodo, /paredes que se repetem/);
  assert.strictEqual(arqN.pavimentos[0].metodo, 'referência');
});

caso('2.46 roteamento: o caminho entre duas salas passa pelo vão da porta, não fura a parede', () => {
  const { malhaDoPavimento, rota } = require('./projetista').paraTestes;
  // parede de 50 cm entre as salas; a porta 1 m acima do caminho reto: a volta (≈ 2 m) custa menos que furar a parede
  const salas = [{ pol: [[0, 0], [5, 0], [5, 5], [0, 5]] }, { pol: [[5.5, 0], [10, 0], [10, 5], [5.5, 5]] }];
  const m = malhaDoPavimento(salas, [{ meio: [5.25, 2], largura_m: 0.9 }]);
  const r = rota(m, [1, 1], [9, 1]);
  assert.ok(r.pts.some(([x, y]) => x > 4.5 && x < 6 && y > 1.4 && y < 2.6), `não passou pela porta: ${JSON.stringify(r.pts)}`);
  assert.ok(r.comp >= 8 && r.comp < 11, `comprimento ${r.comp}`);
  // sem porta, fura a parede (caminho reto, acima do forro)
  const reto = rota(malhaDoPavimento(salas, []), [1, 1], [9, 1]);
  assert.ok(reto.comp < 8.6, `sem porta: ${reto.comp}`);
});

caso('2.46 critérios: densidade econômica, detecção só nas rotas, ambiente fora e pé-direito informado', () => {
  const base = projetarDisciplinas(arqN, ['cftv', 'incendio']);
  const crit = projetarDisciplinas(arqN, ['cftv', 'incendio'], { criterios: { densidadeCftv: 'economica', incendio: 'rotas', excluir: ['DEPÓSITO'], peDireito: 4 } });
  const n = (r, s, a) => r.pontos.filter(p => p.simbolo === s && (!a || p.ambiente === a)).length;
  assert.ok(n(crit, 'HM-CFTV-CAMERA') <= n(base, 'HM-CFTV-CAMERA'));
  assert.strictEqual(n(crit, 'HM-INC-DETECTOR-FUMACA', 'SECRETARIA'), 0, 'detector fora das rotas');
  assert.ok(n(crit, 'HM-INC-DETECTOR-FUMACA', 'CIRCULAÇÃO') >= 1, 'circulação é rota de fuga');
  assert.ok(!crit.pontos.some(p => p.ambiente === 'DEPÓSITO'), 'ambiente excluído recebeu componente');
  assert.ok(crit.pontos.filter(p => p.simbolo === 'HM-CFTV-CAMERA').every(p => p.altura_m === 3.5), 'câmera na altura do pé-direito informado');
  assert.ok(crit.criterios.some(c => /Fora do projeto/.test(c)));
  assert.strictEqual(crit.criteriosUsados.densidadeCftv, 'economica');
  // o pé-direito lido entra no projeto
  assert.strictEqual(base.pavimentosInfo.find(p => p.nome === 'Térreo').pe_direito_m, 3.1);
});

caso('2.46 elétrica e iluminação: pontos e circuitos pela skill, QD por pavimento, cabo por seção (F+N+PE)', () => {
  const r = projetarDisciplinas(arqN, ['eletrica', 'iluminacao']);
  const qd = r.pontos.filter(p => p.simbolo === 'HM-ELE-QUADRO');
  assert.strictEqual(qd.length, 2, 'um QD por pavimento');
  assert.ok(r.pontos.some(p => p.simbolo === 'HM-ELE-TOMADA-BAIXA' && p.circuito), 'tomada sem circuito');
  assert.ok(r.pontos.some(p => p.simbolo === 'HM-ILU-LUMINARIA'), 'sem luminária');
  assert.ok(!r.pontos.some(p => p.simbolo === 'HM-ELE-PONTO-LUZ'), 'ponto de luz da elétrica com a iluminação pedida');
  assert.ok(r.metragens.some(m => /Cabo de cobre flexível 2,5 mm²/.test(m.descricao) && m.metros > 0));
  assert.ok(r.metragens.some(m => /Cabo de cobre flexível 1,5 mm²/.test(m.descricao) && m.metros > 0));
  assert.ok(r.metragens.some(m => /Alimentadores dos QDs/.test(m.descricao)));
});

caso('2.46 controle de acesso, telefonia, antena: nas portas e nos ambientes certos', () => {
  const r = projetarDisciplinas(comPortas(arqN), ['controle_acesso', 'telefonia', 'antena']);
  const de = (s) => r.pontos.filter(p => p.simbolo === s);
  assert.ok(de('HM-ACE-LEITOR').some(p => p.ambiente === 'CPD'), 'porta do CPD sem leitor');
  assert.strictEqual(de('HM-ACE-FECHADURA').length, de('HM-ACE-BOTOEIRA').length);
  assert.ok(de('HM-ACE-EMERGENCIA').length >= 1, 'entrada (rota de fuga) sem acionador de emergência');
  assert.strictEqual(de('HM-ACE-CONTROLADORA').length, 1);
  assert.ok(de('HM-TEL-PONTO').some(p => p.ambiente === 'SECRETARIA'));
  assert.strictEqual(de('HM-TEL-PORTEIRO').length, 1);
  assert.ok(de('HM-ANT-PONTO').some(p => p.ambiente === 'SALA DE ESTAR'));
  assert.ok(!de('HM-ANT-PONTO').some(p => p.ambiente === 'BANHEIRO'));
});

caso('2.46 SPDA: descidas pela classe (NBR 5419-3 Tabela 5), malha de captação e anel', () => {
  const SP = require('../../spda/scripts/lib/tabelas');
  for (const classe of ['II', 'IV']) {
    const r = projetarDisciplinas(arqN, ['spda'], { criterios: { classeSpda: classe } });
    const desc = r.pontos.filter(p => p.simbolo === 'HM-SPDA-DESCIDA');
    // contorno do prédio alinhado: 18 × 10 m → 56 m de perímetro
    assert.strictEqual(desc.length, Math.max(2, Math.ceil(56 / SP.NIVEL[classe].descidas)), `classe ${classe}: ${desc.length} descidas`);
    assert.strictEqual(r.pontos.filter(p => p.simbolo === 'HM-SPDA-CAIXA-INSPECAO').length, desc.length);
    assert.ok(r.metragens.some(m => /Captação em malha/.test(m.descricao) && m.metros >= 56));
    assert.ok(r.metragens.some(m => /Anel de aterramento/.test(m.descricao)));
  }
});

caso('2.46 prancha do pavimento: DXF com os blocos e a arquitetura de fundo, SVG e quantitativo só do pavimento', () => {
  const { pranchaDoPavimento } = require('./pranchaSugerida');
  const proj = projetarDisciplinas(arqN, ['cftv', 'incendio']);
  const disp = proj.pontos.map(p => ({ simbolo: p.simbolo, x: p.x, y: p.y, disciplina: p.disciplina, rotulo: p.rotulo, id: p.id }));
  const r = pranchaDoPavimento({ arquitetura: arqN, pavimento: '1º pavimento', dispositivos: disp, trechos: proj.trechos, notas: ['nota de teste'] });
  const doPav = proj.pontos.filter(p => p.pavimento === '1º pavimento').length;
  assert.strictEqual(r.quantitativo.reduce((s, q) => s + q.quantidade, 0), doPav);
  assert.match(r.dxf, /HM-CFTV-CAMERA/);
  assert.match(r.dxf, /ARQ-BASE/);
  assert.match(r.svg, /^<svg/);
  assert.match(r.svg, /CAPELA/);
  assert.throws(() => pranchaDoPavimento({ arquitetura: arqN, pavimento: 'Mezanino', dispositivos: disp }), /não está na arquitetura/);
});

caso('2.46 3D: pé-direito lido em cada pavimento e a vista do prédio com os pavimentos empilhados', () => {
  const { montarCenasPorPlanta } = require('./modelosPorPlanta');
  const proj = projetarDisciplinas(arqN, ['cftv']);
  const disp = proj.pontos.map(p => ({ simbolo: p.simbolo, x: p.x, y: p.y, disciplina: p.disciplina, rotulo: p.rotulo, id: p.id, rotacao: 0 }));
  const { cenas, principal } = montarCenasPorPlanta(arqN, { dispositivosReais: disp, peDireito: 2.8, peDireitoInformado: false });
  assert.strictEqual(cenas.length, 3);
  assert.strictEqual(cenas[0].peDireito, 3.1, 'térreo com o pé-direito lido');
  const predio = cenas[2];
  assert.ok(predio.plantaInfo.predio);
  assert.notStrictEqual(principal, 2, 'a vista do prédio não abre por padrão');
  assert.deepStrictEqual([...new Set(predio.ambientes.map(a => a.z))], [0, 3.3]);
  assert.ok(predio.paredes.some(w => w[5] >= 3.3), 'paredes do 1º pavimento não subiram');
  // alinhado: as salas do 1º pavimento caem em cima das do térreo
  const cap = predio.ambientes.find(a => a.nome === 'CAPELA (1º pavimento)'), circ = predio.ambientes.find(a => a.nome === 'CIRCULAÇÃO (Térreo)');
  assert.ok(Math.hypot(cap.centro[0] - circ.centro[0], cap.centro[1] - circ.centro[1]) < 0.5, 'pavimentos desalinhados');
  assert.strictEqual(predio.dispositivos.reduce((s, t) => s + t.itens.length, 0), disp.length);
  // sem dois pavimentos: nada de vista do prédio
  assert.strictEqual(require('./predioEmpilhado').cenaDoPredio(cenas.slice(0, 1), arqN), null);
});

caso('2.47 local escolhido pelo engenheiro: rack, central e QD na sala pedida; os cabos saem de lá; sala que não existe fica no calculado', () => {
  const base = projetarDisciplinas(arqN, ['cftv', 'incendio', 'eletrica']);
  const rackBase = base.pontos.find(p => p.simbolo === 'HM-CAB-RACK');
  assert.strictEqual(rackBase.ambiente, 'CPD');
  const r = projetarDisciplinas(arqN, ['cftv', 'incendio', 'eletrica'], { criterios: { centros: { telecom: { ambiente: 'DEPÓSITO', pavimento: '1º pavimento' }, incendio: 'SECRETARIA', 'eletrica|1º pavimento': { ambiente: 'CAPELA' } } } });
  const rack = r.pontos.find(p => p.simbolo === 'HM-CAB-RACK');
  assert.strictEqual(rack.ambiente, 'DEPÓSITO');
  assert.match(rack.motivo, /escolhido pelo engenheiro/);
  assert.strictEqual(r.pontos.find(p => p.simbolo === 'HM-INC-CENTRAL').ambiente, 'SECRETARIA');
  assert.strictEqual(r.pontos.find(p => p.simbolo === 'HM-ELE-QUADRO' && p.pavimento === '1º pavimento').ambiente, 'CAPELA');
  assert.notStrictEqual(r.pontos.find(p => p.simbolo === 'HM-ELE-QUADRO' && p.pavimento === 'Térreo').ambiente, 'CAPELA');
  // o cabo das câmeras agora vai até o depósito: o comprimento muda
  const somaCabo = (x) => x.cabos.filter(c => c.disciplina === 'cftv').reduce((t, c) => t + c.comprimento_m, 0);
  assert.notStrictEqual(Math.round(somaCabo(r)), Math.round(somaCabo(base)));
  assert.deepStrictEqual(r.criteriosUsados.centros.telecom, { ambiente: 'DEPÓSITO', pavimento: '1º pavimento' });
  const errado = projetarDisciplinas(arqN, ['cftv'], { criterios: { centros: { telecom: 'SALA QUE NÃO EXISTE' } } });
  assert.strictEqual(errado.pontos.find(p => p.simbolo === 'HM-CAB-RACK').ambiente, 'CPD');
  assert.ok(errado.avisos.some(a => /SALA QUE NÃO EXISTE/.test(a) && /CONFERIR/.test(a)));
  // chave estranha não entra nos critérios
  assert.deepStrictEqual(projetarDisciplinas(arqN, ['cftv'], { criterios: { centros: { 'TELECOM; DROP': 'CPD', outro: '' } } }).criteriosUsados.centros, {});
});

console.log(`pavimentos e projetista: ${ok} casos ok`);
