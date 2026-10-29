// Classificação das pranchas (skills/_comum/cad/classificarPrancha.js): planta ×
// diagrama unifilar × quadro de cargas × legenda × carimbo, por região da folha.
// Folhas SINTÉTICAS montadas aqui (em metros, y para cima, como o DXF), sem banco
// e sem dado de cliente. Rodar: npm test (pasta backend).
const assert = require('assert');
const path = require('path');
const { CAD } = require('../src/config/caminhos');
const { classificarFolha, regioesParaManter, descreverFolha, tipoDoTitulo, paraTestes: T } = require(path.join(CAD, 'classificarPrancha.js'));

let ok = 0;
const caso = (nome, fn) => { try { fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

// ── peças ────────────────────────────────────────────────────────────────
const seg = (x1, y1, x2, y2) => ({ a: [x1, y1], b: [x2, y2] });
const ret = (x0, y0, x1, y1) => [seg(x0, y0, x1, y0), seg(x1, y0, x1, y1), seg(x1, y1, x0, y1), seg(x0, y1, x0, y0)];
const txt = (s, x, y, h = 0.2) => ({ s, x, y, h });
// planta: 3 salas com parede dupla de 15 cm, portas com folha, nomes
function planta(ox = 0, oy = 0) {
  const s = [...ret(ox, oy, ox + 12.3, oy + 4.3), ...ret(ox + 0.15, oy + 0.15, ox + 5.15, oy + 4.15), ...ret(ox + 5.3, oy + 0.15, ox + 8.3, oy + 4.15), ...ret(ox + 8.45, oy + 0.15, ox + 12.15, oy + 4.15)];
  const arcos = [];
  for (const x of [0.3, 5.45, 8.6]) {
    const c = [ox + x, oy + 0.3];
    s.push(seg(c[0], c[1], c[0], c[1] + 0.8)); // folha
    arcos.push({ centro: c, r: 0.8, varredura: 90, a: [c[0] + 0.8, c[1]], b: [c[0], c[1] + 0.8] });
  }
  const textos = [txt('SALA DE ESTAR', ox + 1.6, oy + 2.2), txt('COZINHA', ox + 6.2, oy + 2.2), txt('QUARTO', ox + 9.6, oy + 2.2), txt('PLANTA BAIXA - TÉRREO', ox, oy - 0.8, 0.35), txt('ESC. 1:50', ox, oy - 1.3)];
  return { segmentos: s, arcos, textos };
}
// unifilar: barramento + 12 saídas com o texto do circuito na ponta
function unifilar(ox, oy, n = 12) {
  const s = [seg(ox, oy, ox, oy + n * 0.4), ...ret(ox - 0.3, oy - 0.3, ox + 5, oy + n * 0.4 + 0.3)];
  const textos = [txt('DIAGRAMA UNIFILAR - QDC', ox, oy - 0.8, 0.3), txt('SEM ESCALA', ox, oy - 1.2)];
  for (let i = 0; i < n; i++) {
    const y = oy + 0.2 + i * 0.4;
    s.push(seg(ox, y, ox + 3, y));
    textos.push(txt(`C${i + 1} 2x2,5mm² DISJ 20A`, ox + 3.05, y + 0.03, 0.12));
  }
  return { segmentos: s, arcos: [], textos };
}
// quadro de cargas: grade com borda, cabeçalho e uma linha por circuito
function tabela(ox, oy, n = 10) {
  const s = [];
  for (let i = 0; i <= n + 1; i++) s.push(seg(ox, oy + i * 0.5, ox + 6, oy + i * 0.5));
  for (const x of [0, 1, 4, 6]) s.push(seg(ox + x, oy, ox + x, oy + (n + 1) * 0.5));
  const textos = [txt('QUADRO DE CARGAS - QDC', ox, oy + (n + 1) * 0.5 + 0.3, 0.25)];
  ['CIRCUITO', 'DESCRIÇÃO', 'POTÊNCIA'].forEach((t, k) => textos.push(txt(t, ox + [0, 1, 4][k] + 0.05, oy + n * 0.5 + 0.15, 0.15)));
  for (let i = 0; i < n; i++) ['C' + (i + 1), i % 2 ? 'Sala de reunião' : 'Copa', `${600 + i * 100}`].forEach((t, k) => textos.push(txt(t, ox + [0, 1, 4][k] + 0.05, oy + i * 0.5 + 0.15, 0.15)));
  return { segmentos: s, arcos: [], textos };
}
const juntar = (...partes) => ({ segmentos: partes.flatMap(p => p.segmentos), arcos: partes.flatMap(p => p.arcos), textos: partes.flatMap(p => p.textos) });
const folha = (desenho, extra = {}) => classificarFolha({ ...desenho, metrosPorUnidade: 1, ...extra });

caso('títulos: cada vista no seu tipo (a 1ª regra que casa vale)', () => {
  const casos = {
    'PLANTA BAIXA - TÉRREO': 'planta', 'PLANTA DE ILUMINAÇÃO': 'planta', 'LAYOUT': 'planta', '2º PAVIMENTO': 'planta',
    'DIAGRAMA UNIFILAR - QDC': 'diagrama', 'DIAGRAMA TRIFILAR': 'diagrama', 'ESQUEMA DE COMANDO': 'diagrama',
    'Quadro de Cargas (QGBT) - TÉRREO': 'quadro_cargas', 'QUADRO DE DEMANDA': 'quadro_cargas', 'Lista de materiais - SUB-SOLO': 'quadro_cargas',
    'VISTA FRONTAL DO QDC': 'vista_quadro', 'VISTA INTERNA': 'vista_quadro', 'Legenda - TÉRREO': 'legenda', 'NOTAS GERAIS': 'legenda',
    'DETALHE 2': 'detalhe', 'DETALHE-1': 'detalhe', 'CORTE A-A': 'corte_fachada', 'FACHADA NORTE': 'corte_fachada',
  };
  for (const [s, tipo] of Object.entries(casos)) assert.strictEqual(tipoDoTitulo(s), tipo, s);
  // "Seção" sozinha é coluna da tabela de cabos, não corte; nome de sala não é título
  for (const s of ['Seção', 'SALA DE ESTAR', 'QUADRAS 1 E 2', 'QD-Térreo']) assert.strictEqual(tipoDoTitulo(s), null, s);
});

caso('planta sozinha: planta, com os motivos (sala, porta, parede dupla, título, escala)', () => {
  const c = folha(planta());
  assert.strictEqual(c.tipo, 'planta');
  assert.ok(c.temPlanta && !c.semPlanta);
  const r = c.regioes.find(x => x.tipo === 'planta');
  assert.strictEqual(r.sinais.salas, 3);
  assert.strictEqual(r.sinais.portas, 3);
  assert.ok(r.motivos.some(m => /título "PLANTA BAIXA/.test(m)) && r.motivos.some(m => /parede em linha dupla/.test(m)), r.motivos.join(' | '));
});

caso('unifilar sozinho: diagrama, folha sem planta', () => {
  const c = folha(unifilar(0, 0));
  assert.strictEqual(c.tipo, 'diagrama', JSON.stringify(c.regioes.map(r => [r.tipo, r.pontuacao])));
  assert.ok(c.semPlanta && !c.temPlanta);
  const r = c.regioes.find(x => x.tipo === 'diagrama');
  assert.ok(r.motivos.some(m => /barramento com 12 saídas/.test(m)), r.motivos.join(' | '));
  assert.ok(r.motivos.some(m => /vocabulário elétrico/.test(m)));
  assert.deepStrictEqual(regioesParaManter(c), []); // nada de planta para o 3D
  assert.match(descreverFolha(3, c), /^folha 3: diagrama unifilar.* — ignorada no 3D$/);
});

caso('quadro de cargas sozinho: tabela (as salas da coluna "descrição" não fazem planta)', () => {
  const c = folha(tabela(0, 0));
  assert.strictEqual(c.tipo, 'quadro_cargas', JSON.stringify(c.regioes.map(r => [r.tipo, r.pontuacao])));
  assert.ok(c.semPlanta);
  assert.strictEqual(c.regioes[0].sinais.salas, 0);
});

caso('folha mista (planta + unifilar + tabela): uma região de cada, só a planta fica', () => {
  const c = folha(juntar(planta(0, 0), unifilar(18, 0), tabela(18, -9)));
  assert.ok(c.misto && c.temPlanta);
  const tipos = c.regioes.filter(r => r.tipo !== 'desconhecido').map(r => r.tipo).sort();
  assert.deepStrictEqual(tipos, ['diagrama', 'planta', 'quadro_cargas'], JSON.stringify(c.regioes.map(r => [r.tipo, r.caixa])));
  const manter = regioesParaManter(c);
  assert.strictEqual(manter.length, 1);
  assert.ok(manter[0][0] >= -0.5 && manter[0][2] <= 13, JSON.stringify(manter)); // só a planta (0–12,3 m)
  // o título "PLANTA BAIXA" (embaixo da planta) é da planta, não do bloco vizinho
  assert.match(c.regioes.find(r => r.tipo === 'planta').titulo, /PLANTA BAIXA/);
  assert.match(c.resumo, /^planta baixa \+ /);
});

caso('estacionamento (pente sem texto) não é diagrama; unifilar (pente com texto) é', () => {
  const { h, v } = T.retas([seg(0, 0, 0, 10), ...Array.from({ length: 10 }, (_, i) => seg(0, 0.5 + i, 5, 0.5 + i))]);
  assert.strictEqual(T.pente(v, h, [], 0.02).dentes, 10);
  assert.strictEqual(T.pente(v, h, [], 0.02).comTexto, 0);
  const textos = Array.from({ length: 10 }, (_, i) => txt(`C${i + 1} 20A`, 5.05, 0.55 + i, 0.12));
  assert.strictEqual(T.pente(v, h, textos, 0.02).comTexto, 10);
});

caso('parede dupla × pilha de linhas (tabela, barramento R-S-T-N)', () => {
  const { h } = T.retas([seg(0, 0, 6, 0), seg(0, 0.15, 6, 0.15)]);
  assert.ok(Math.abs(T.comprimentoDeParede(h, [0.07, 0.4], 0.01) - 6) < 1e-6);
  const pilha = T.retas([0, 0.15, 0.3, 0.45].map(y => seg(0, y, 6, y))).h;
  assert.ok(T.comprimentoDeParede(pilha, [0.07, 0.4], 0.01) < 6.01, 'pilha não soma como parede');
});

caso('carimbo no canto: carimbo; vista emoldurada leva o que está dentro', () => {
  const carimbo = { segmentos: ret(20, -6, 30, -2), arcos: [], textos: ['PROPRIETÁRIO:', 'AUTOR DO PROJETO', 'ESCALA', 'DATA', 'PRANCHA 01/05', 'CREA 1234'].map((s, i) => txt(s, 20.5, -2.5 - i * 0.5, 0.15)) };
  const c = folha(juntar(planta(0, 0), carimbo), { caixa: [-1, -7, 31, 6] });
  assert.ok(c.regioes.some(r => r.tipo === 'carimbo'), JSON.stringify(c.regioes.map(r => [r.tipo, r.caixa])));
  // moldura em volta de um unifilar pequeno: blocos de dentro juntam com ela
  const { regioes } = T.segmentar({ caixa: [-2, -2, 40, 30], segmentos: [...ret(0, 0, 10, 10), ...ret(2, 2, 3, 3), ...ret(6, 6, 7, 7)], arcos: [] });
  assert.strictEqual(regioes.length, 1);
});

caso('folha vazia ou sem traço não quebra', () => {
  assert.strictEqual(classificarFolha({ segmentos: [], textos: [] }).tipo, 'desconhecido');
  assert.deepStrictEqual(regioesParaManter(null), []);
});

console.log(`classificarPrancha: ${ok} casos ok`);
