// Escala automática da planta em PDF (utils/escalaDaPlanta.js, fase 3 do roteiro — CAD-09): nome do arquivo,
// portas e cotas, com a origem no resultado. Páginas SINTÉTICAS montadas aqui (pontos do PDF, y para baixo),
// sem banco e sem dado de cliente. Rodar: node testes/escalaDaPlanta.test.js
const assert = require('assert');
const path = require('path');
const { escalaDoNome, escalaPelasCotas, escalaPelasPortasDaPagina, escalaDeReserva, descreverEscala } = require('../src/utils/escalaDaPlanta');
const { PT_EM_M } = require('../src/utils/desenhoPdf');
const { CAD } = require('../src/config/caminhos');
const { classificarFolha } = require(path.join(CAD, 'classificarPrancha.js'));

let ok = 0;
const caso = (nome, fn) => { try { fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };
const pt = (m, escala) => m / (PT_EM_M * escala); // metros na obra → pontos no papel
const reta = (a, b) => ({ traco: true, subs: [{ segs: [['l', a, b]] }] });
const TODA = [[-1e6, -1e6, 1e6, 1e6]];

caso('nome do arquivo: "A0 1_50", "ESC 1-100", "1:75"; data e revisão não são escala', () => {
  assert.strictEqual(escalaDoNome('Lumino - Paroquia_M1 - 01-07 - A0 1_50.pdf'), 50);
  assert.strictEqual(escalaDoNome('PLANTA BAIXA ESC 1-100.pdf'), 100);
  assert.strictEqual(escalaDoNome('planta 1:75.pdf'), 75);
  assert.strictEqual(escalaDoNome('Planta Terreo 01-07.pdf'), null);
  assert.strictEqual(escalaDoNome('ELE_ARENA_R00.pdf'), null);
  assert.strictEqual(escalaDoNome('REV.04_PROJ_1-5.pdf'), null); // folha 1 de 5
  assert.strictEqual(escalaDoNome('PROJ_ELETRICO_1-25.pdf'), null); // folha 1 de 25, não 1:25
  assert.strictEqual(escalaDoNome('PLANTA_ESC_1-50.pdf'), 50);
  assert.strictEqual(escalaDoNome('planta 1_50 e ampliacao 1_25.pdf'), null); // duas escalas: nenhuma
});

caso('cotas: o número em metros sobre a linha de cota dá a escala que se repete', () => {
  const cota = (v, x, y, L) => ({ texto: { s: v.toFixed(2).replace('.', ','), x: x + L / 2 - 10, y, w: 20, h: 6, horizontal: true }, linha: reta([x, y + 2], [x + L, y + 2]) });
  const cotas = [cota(3.53, 100, 100, pt(3.53, 50)), cota(7.06, 100, 200, pt(7.06, 50)), cota(1.8, 400, 300, pt(1.8, 50)),
    // a cota de um detalhe 1:25 não decide
    cota(1.8, 600, 400, pt(1.8, 25))];
  const geo = { textos: cotas.map(c => c.texto), caminhos: cotas.map(c => c.linha) };
  assert.strictEqual(escalaPelasCotas(geo, TODA), 50);
  // fora da planta (regiões do classificador), não conta
  assert.strictEqual(escalaPelasCotas(geo, [[0, 0, 10, 10]]), null);
  // duas cotas só não bastam
  assert.strictEqual(escalaPelasCotas({ textos: geo.textos.slice(0, 2), caminhos: geo.caminhos.slice(0, 2) }, TODA), null);
});

caso('portas: arco de 90° com a folha desenhada; 1:500 de símbolo miúdo não vale', () => {
  const porta = (cx, cy, r) => {
    const k = 0.5523 * r;
    return [{ traco: true, subs: [{ segs: [['c', [cx + r, cy], [cx + r, cy - k], [cx + k, cy - r], [cx, cy - r]]] }] }, reta([cx, cy], [cx, cy - r])];
  };
  const r50 = pt(0.8, 50);
  const geo = { textos: [], caminhos: [...porta(100, 300, r50), ...porta(400, 300, r50), ...porta(700, 300, r50)] };
  assert.strictEqual(escalaPelasPortasDaPagina(geo, TODA), 50);
  assert.strictEqual(escalaPelasPortasDaPagina(geo, []), null); // sem região de planta, não mede
  const miudo = { textos: [], caminhos: [...porta(100, 300, pt(0.8, 500)), ...porta(400, 300, pt(0.8, 500))] };
  assert.strictEqual(escalaPelasPortasDaPagina(miudo, TODA), null);
  // a ordem: o nome do arquivo vem antes das portas
  assert.deepStrictEqual(escalaDeReserva({ nomeArquivo: 'x 1_100.pdf', geo, regioesPlanta: TODA }), { escala: 100, origem: 'nome_arquivo' });
  assert.deepStrictEqual(escalaDeReserva({ nomeArquivo: 'x.pdf', geo, regioesPlanta: TODA }), { escala: 50, origem: 'portas' });
  assert.strictEqual(descreverEscala(50, 'portas'), '1:50 pelo tamanho das portas [CONFERIR]');
  assert.strictEqual(descreverEscala(50, 'carimbo'), '1:50 do carimbo');
});

caso('classificador (CAD-14): centenas de metros de parede dupla sem porta nem sala ainda é planta', () => {
  // prancha luminotécnica com o texto SHX em traço: nenhuma sala escrita, portas sem a folha — só as paredes
  const seg = (x1, y1, x2, y2) => ({ a: [x1, y1], b: [x2, y2] });
  const segmentos = [];
  for (let i = 0; i < 12; i++) {
    const y = i * 3;
    segmentos.push(seg(0, y, 40, y), seg(0, y + 0.15, 40, y + 0.15)); // parede de 15 cm, 40 m
  }
  for (const x of [0, 40]) segmentos.push(seg(x, 0, x, 33.15), seg(x + 0.15, 0, x + 0.15, 33.15));
  const c = classificarFolha({ segmentos, arcos: [], textos: [], metrosPorUnidade: 1 });
  assert.strictEqual(c.tipo, 'planta', JSON.stringify(c.regioes.map(r => [r.tipo, r.motivos])));
  // pouca parede dupla sozinha continua sem decidir (retângulos do diagrama também fazem pares)
  const pouca = classificarFolha({ segmentos: segmentos.slice(0, 4), arcos: [], textos: [], metrosPorUnidade: 1 });
  assert.notStrictEqual(pouca.tipo, 'planta');
});

console.log(`escala da planta: ${ok} casos ok`);
