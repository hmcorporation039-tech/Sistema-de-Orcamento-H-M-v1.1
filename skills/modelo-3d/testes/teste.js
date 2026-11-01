// Teste da skill modelo-3d-arquitetura com desenhos SINTÉTICOS (nenhum dado de
// cliente): layers no padrão AsBEA/QiBuilder (ARQ-ALV-CRT, EL-Fios, P-SIMBOL),
// símbolo redondo na layer de parede (PDF convertido), postes no estacionamento
// e o fluxo completo diagnóstico → pontos → circuitos externos → 3D.
// Rodar: node modelo-3d/testes/teste.js (ou npm test na pasta skills)
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { DesenhoDxf } = require('../../_comum/cad/dxf');
const { lerArquitetura } = require('../../_comum/cad/arquitetura');
const { classeDaLayer, haLayerDeParede, simboloRedondo, extrairElementos, regiaoDoModelo, recortarArquitetura } = require('../../_comum/cad/modelo3d');
const { tipoDoAmbiente } = require('../../_comum/cad/estimativaArquitetura');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};
const SCRIPTS = path.join(__dirname, '..', 'scripts');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teste-modelo3d-'));
const rodar = (script, args) => execFileSync(process.execPath, [path.join(SCRIPTS, script), ...args], { encoding: 'utf8' });
const circulo = (cx, cy, r, n = 24) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);
const retangulo = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

caso('layers AsBEA/QiBuilder: alvenaria é parede; fio, diagrama, símbolo e louça não', () => {
  assert.strictEqual(classeDaLayer('ARQ-ALV-CRT', true), 'parede');
  assert.strictEqual(classeDaLayer('ARQ-EST-CNC-VT1', true), 'pilar');
  for (const l of ['EL-Fios (Neutro)', 'DI-Barramento Fase 1', 'P-SIMBOL', 'Caixas de passagem', 'IFC-Luminária-Contorno', 'ARQ-LOU-VST', 'ARQ-PIS-VT1', 'EL-Condutos (Teto)']) {
    assert.strictEqual(classeDaLayer(l, true), null, l);
    assert.strictEqual(classeDaLayer(l, false), null, `${l} (sem layer de parede)`);
  }
  assert.strictEqual(haLayerDeParede(['ARQ-ALV-CRT', 'EL-Fios (Neutro)']), true);
  assert.strictEqual(haLayerDeParede(['EL-Fios (Neutro)', '0']), false);
  assert.strictEqual(classeDaLayer('A-PAREDE', true), 'parede');
});

caso('forma curva (círculo/oval do símbolo) não é pilar; retângulo é', () => {
  assert.strictEqual(simboloRedondo([...circulo(0, 0, 0.15), circulo(0, 0, 0.15)[0]]), true);
  assert.strictEqual(simboloRedondo(retangulo(0, 0, 0.3, 0.3)), false);
  assert.strictEqual(simboloRedondo([[0, 0], [0.4, 0], [0.4, 0.2], [0.2, 0.2], [0.2, 0.4], [0, 0.4]]), false); // pilar em L
});

caso('quadra e estacionamento são área externa', () => {
  for (const n of ['QUADRAS 1 E 2', 'QUADRA DE TÊNIS', 'ESTACIONAMENTO', 'CAMPO DE FUTEBOL']) assert.strictEqual(tipoDoAmbiente(n), 'externo', n);
  assert.notStrictEqual(tipoDoAmbiente('ESCRITÓRIO DE CAMPO'), 'externo');
});

// PDF convertido: tudo na PDF-PAREDE — paredes, 3 postes redondos e 1 pilar quadrado
caso('PDF: símbolos redondos na layer de parede não sobem; o pilar quadrado sobe', () => {
  const g = new DesenhoDxf({ layers: [{ nome: 'PDF-PAREDE', cor: 7 }, { nome: 'PDF-LINHAS', cor: 8 }] });
  for (const d of [0, 0.15]) g.polilinha(retangulo(-d, -d, 10 + d, 8 + d), { layer: 'PDF-PAREDE', fechada: true });
  for (const x of [12, 15, 18]) g.polilinha(circulo(x, 4, 0.16, 29), { layer: 'PDF-PAREDE', fechada: true });
  g.polilinha(retangulo(4.85, 3.85, 5.15, 4.15), { layer: 'PDF-PAREDE', fechada: true });
  g.texto(3, 2, 0.3, 'LOJA', { layer: 'PDF-LINHAS' });
  const arq = lerArquitetura(g.toString());
  const el = extrairElementos(arq, [-5, -5, 25, 15], 3);
  assert.strictEqual(el.pilares.filter(p => p.ehPilar).length, 1);
  assert.strictEqual(el.simbolosRedondos, 3);
});

// prancha QiBuilder: loja em ARQ-ALV-CRT, fios na planta, unifilar ao lado,
// estacionamento com 4 postes (P-SIMBOL explodido) e o quadro na loja
const g = new DesenhoDxf({ layers: [
  { nome: 'ARQ-ALV-CRT', cor: 8 }, { nome: 'ARQ-PIS-VT1', cor: 9 }, { nome: 'TEXTO', cor: 7 }, { nome: 'EL-Fios (Neutro)', cor: 5 },
  { nome: 'P-SIMBOL', cor: 2 }, { nome: 'EL-Quadro de distribuição', cor: 1 }, { nome: 'DI-Barramento Fase 1', cor: 1 },
] });
for (const d of [0, 0.15]) g.polilinha(retangulo(-d, -d, 10 + d, 8 + d), { layer: 'ARQ-ALV-CRT', fechada: true });
g.texto(4, 4, 0.3, 'LOJA', { layer: 'TEXTO' });
g.polilinha(retangulo(12, 0, 52, 8), { layer: 'ARQ-PIS-VT1', fechada: true });
g.texto(30, 4, 0.3, 'ESTACIONAMENTO', { layer: 'TEXTO' });
for (let i = 0; i < 6; i++) g.linha(1 + i, 1, 1 + i, 7, 'EL-Fios (Neutro)');
// poste explodido: duas linhas e um retângulo colados (1,5 × 0,10 m)
for (const x of [16, 26, 36, 46]) {
  g.linha(x, 7.0, x + 1.5, 7.0, 'P-SIMBOL'); g.linha(x, 7.1, x + 1.5, 7.1, 'P-SIMBOL');
  g.polilinha(retangulo(x + 1.2, 7.0, x + 1.5, 7.1), { layer: 'P-SIMBOL', fechada: true });
}
g.polilinha(retangulo(9.7, 3.8, 9.94, 3.86), { layer: 'EL-Quadro de distribuição', fechada: true });
// unifilar longe da planta (não pode virar parede)
g.linha(200, 0, 260, 0, 'DI-Barramento Fase 1');
const arqDxf = path.join(tmp, 'projeto.dxf');
fs.writeFileSync(arqDxf, g.toString());

caso('prancha QiBuilder: só a alvenaria sobe; fio e unifilar não', () => {
  const arq = lerArquitetura(g.toString());
  const el = extrairElementos(arq, regiaoDoModelo(arq).caixa, 3);
  assert.ok(el.paredes.length >= 4, `${el.paredes.length} paredes`);
  const foraDaLoja = el.paredes.filter(w => [w.a, w.b].some(p => p[0] > 10.5 || p[1] > 8.5 || p[0] < -0.5 || p[1] < -0.5));
  assert.strictEqual(foraDaLoja.length, 0, JSON.stringify(foraDaLoja.slice(0, 3)));
});

caso('recorte de uma planta: só os ambientes e linhas dentro da caixa', () => {
  const arq = recortarArquitetura(lerArquitetura(g.toString()), [-1, -1, 11, 9]);
  assert.deepStrictEqual(arq.ambientes.map(a => a.nome), ['LOJA']);
  assert.ok(arq.referencia.every(r => r.pts.every(p => p[0] <= 11.5)));
});

let pontos;
caso('extrair-pontos: propõe poste para o símbolo comprido do estacionamento e grava os pontos', () => {
  const mapa = path.join(tmp, 'mapa-pontos.json');
  rodar('extrair-pontos.js', [arqDxf, '--listar', '--saida', mapa]);
  const m = JSON.parse(fs.readFileSync(mapa, 'utf8'));
  const poste = m.simbolos.find(s => s.layer === 'P-SIMBOL');
  assert.ok(poste && poste.simbolo === 'HM-ILU-POSTE' && poste.quantidade === 4, JSON.stringify(m.simbolos));
  assert.ok(m.simbolos.some(s => s.simbolo === 'HM-ELE-QUADRO'));
  poste.rotulo = 'Poste estacionamento';
  fs.writeFileSync(mapa, JSON.stringify(m));
  rodar('extrair-pontos.js', [arqDxf, '--mapa', mapa, '--saida-pontos', path.join(tmp, 'pontos.json')]);
  pontos = JSON.parse(fs.readFileSync(path.join(tmp, 'pontos.json'), 'utf8'));
  const postes = pontos.filter(p => p.simbolo === 'HM-ILU-POSTE');
  assert.strictEqual(postes.length, 4);
  assert.ok(postes.every(p => p.ambiente === 'ESTACIONAMENTO' && p.disciplina === 'iluminacao-externa'), JSON.stringify(postes));
});

caso('circuitos externos: queda ≤ 4 %, Iz ≥ disjuntor ≥ Ib, caixa no pé de cada poste', () => {
  const obra = path.join(tmp, 'obra.json');
  fs.writeFileSync(obra, JSON.stringify({ quadro: { id: pontos.find(p => p.simbolo === 'HM-ELE-QUADRO').id }, tensao_v: 220, ligacao: 'FN', tipos: [{ rotulo: 'Poste estacionamento', potencia_w: 400, altura_m: 8 }] }));
  rodar('circuitos-externos.js', [path.join(tmp, 'pontos.json'), obra, '--json', path.join(tmp, 'r.json'), '--saida-trechos', path.join(tmp, 't.json'), '--saida-pontos', path.join(tmp, 'c.json'), '--memorial', path.join(tmp, 'm.md')]);
  const r = JSON.parse(fs.readFileSync(path.join(tmp, 'r.json'), 'utf8'));
  // 4 × 400 W / (220 × 0,95) = 7,66 A: um circuito
  assert.strictEqual(r.circuitos.length, 1);
  const c = r.circuitos[0];
  assert.ok(c.queda_pct <= 4 && c.disjuntor_a >= c.ib_a && c.iz_a >= c.disjuntor_a, JSON.stringify(c));
  assert.strictEqual(c.disjuntor_a, 10);
  // ~46 m do quadro ao último poste em 2,5 mm²: 2 × 7,66 A em trechos decrescentes ≈ 2,6 %
  assert.ok(c.queda_pct > 1 && c.queda_pct < 4, `${c.queda_pct} %`);
  assert.ok(r.caixas >= 4);
  const md = fs.readFileSync(path.join(tmp, 'm.md'), 'utf8');
  assert.ok(/0,6\/1 kV/.test(md) && /tabela 36, método D/.test(md));
  const t = JSON.parse(fs.readFileSync(path.join(tmp, 't.json'), 'utf8'));
  assert.ok(t.length && t.every(x => x.altura === 0.04 && x.disciplina === 'iluminacao-externa'));
});

caso('3D com --pontos/--trechos: postes, caixas e eletroduto enterrado na cena', () => {
  const cena = path.join(tmp, 'cena.json');
  execFileSync(process.execPath, [path.join(__dirname, '..', '..', '_comum', 'cad', 'gerar-3d.js'), arqDxf, '--saida', path.join(tmp, 'm.html'), '--cena', cena,
    '--pontos', path.join(tmp, 'pontos.json'), '--pontos', path.join(tmp, 'c.json'), '--trechos', path.join(tmp, 't.json')], { encoding: 'utf8' });
  const c = JSON.parse(fs.readFileSync(cena, 'utf8'));
  const tipo = (s) => c.dispositivos.filter(t => t.simbolo === s).reduce((n, t) => n + t.itens.length, 0);
  assert.strictEqual(tipo('HM-ILU-POSTE'), 4);
  assert.ok(tipo('HM-ELE-CAIXA-PISO') >= 4);
  assert.ok(c.dispositivos.find(t => t.simbolo === 'HM-ILU-POSTE').montagem === 'piso');
  assert.ok(c.infra.some(g => g.disciplina === 'iluminacao-externa' && g.z === 0.04 && g.comprimento_m > 30));
  assert.strictEqual(c.numeros.pilares, 0);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`modelo-3d: ${ok} casos ok`);
