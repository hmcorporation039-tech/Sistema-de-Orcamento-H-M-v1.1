// Teste do modelo 3D ilustrativo (skills/_comum/cad/modelo3d.js + visualizador3d.js)
// com uma arquitetura SINTÉTICA gerada aqui (nenhum dado de cliente): sala de
// estar e cozinha em mm, parede de 15 cm em linhas soltas, porta em bloco,
// janela com 3 linhas de caixilho, mureta "alvenaria baixa", pilar e mesa.
// Rodar: node _comum/cad/teste-3d.js
const assert = require('assert');
const vm = require('vm');
const { point3d } = require('@tarikjabiri/dxf');
const { DesenhoDxf } = require('./dxf');
const { lerArquitetura, dentro, distanciaContorno } = require('./arquitetura');
const { montarCena } = require('./modelo3d');
const { pontosDasDisciplinas } = require('./estimativaArquitetura');
const { gerarHtml } = require('./visualizador3d');
const { bundleAtualizado, SAIDA } = require('./visualizador3d/construir');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};
const perto = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;
const comp = (w) => Math.hypot(w[2] - w[0], w[3] - w[1]);

function arquitetura() {
  const g = new DesenhoDxf({ layers: [
    { nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'A-PORTA', cor: 3 }, { nome: 'A-JANELA', cor: 4 },
    { nome: 'A-ALVENARIA BAIXA', cor: 9 }, { nome: 'A-PILAR', cor: 2 }, { nome: 'A-MOBILIARIO', cor: 5 },
  ] });
  const L = (x1, y1, x2, y2, layer = 'A-PAREDE') => g.linha(x1, y1, x2, y2, layer);
  // contorno: face interna (0..8000 × 0..5000) e externa (−150), com janela de 1,5 m na fachada sul (x 1000–2500)
  [[0, 0, 1000, 0], [2500, 0, 8000, 0], [-150, -150, 1000, -150], [2500, -150, 8150, -150],
    [8000, 0, 8000, 5000], [8000, 5000, 0, 5000], [0, 5000, 0, 0], [8150, -150, 8150, 5150], [8150, 5150, -150, 5150], [-150, 5150, -150, -150],
    [1000, -150, 1000, 0], [2500, -150, 2500, 0]].forEach(l => L(...l));
  // caixilho da janela: 3 linhas paralelas
  for (const y of [-150, -75, 0]) L(1000, y, 2500, y, 'A-JANELA');
  // parede interna de 15 cm com vão de porta de 80 cm (y 1200–2000)
  [[5000, 0, 5000, 1200], [5000, 2000, 5000, 5000], [5150, 0, 5150, 1200], [5150, 2000, 5150, 5000], [5000, 1200, 5150, 1200], [5000, 2000, 5150, 2000]].forEach(l => L(...l));
  g.bloco('PORTA80', (b) => { b.addLine(point3d(0, 0), point3d(800, 0), { layerName: '0' }); b.addArc(point3d(0, 0), 800, 0, 90, { layerName: '0' }); });
  g.dxf.addInsert('PORTA80', point3d(5000, 2000), { layerName: 'A-PORTA', rotationAngle: 180 });
  // mureta de 15 cm no jardim (alvenaria baixa) e pilar 30 × 30 fora do prédio
  L(0, 6000, 3000, 6000, 'A-ALVENARIA BAIXA'); L(0, 6150, 3000, 6150, 'A-ALVENARIA BAIXA');
  g.polilinha([[-450, -450], [-150, -450], [-150, -150], [-450, -150]], { layer: 'A-PILAR', fechada: true });
  g.polilinha([[1000, 3000], [2000, 3000], [2000, 4000], [1000, 4000]], { layer: 'A-MOBILIARIO', fechada: true });
  g.texto(2500, 2500, 200, 'SALA DE ESTAR', { layer: 'A-TEXTO' });
  g.texto(6500, 2500, 200, 'COZINHA', { layer: 'A-TEXTO' });
  return lerArquitetura(g.toString().replace(/(\$INSUNITS\r?\n\s*70\r?\n\s*)6/, '$14'));
}

const arq = arquitetura();
const PD = 3;
const pts = pontosDasDisciplinas(arq, ['eletrica', 'cftv', 'rede'], { peDireito: PD });
const cena = montarCena(arq, { peDireito: PD, dispositivos: pts.dispositivos, avisos: pts.avisos, titulo: 'Teste', cliente: '<b>Cliente & Cia</b>', obra: 'Obra "teste"' });
const tipo = (s) => cena.dispositivos.find(t => t.simbolo === s);

caso('arquitetura sintética: 2 ambientes pelas paredes e 1 porta', () => {
  assert.deepStrictEqual(arq.ambientes.map(a => a.nome), ['COZINHA', 'SALA DE ESTAR']);
  assert.strictEqual(arq.portas.length, 1);
});

caso('paredes: faces paralelas a 15 cm viram uma parede de 15 cm, na altura do pé-direito', () => {
  const longas = cena.paredes.filter(w => comp(w) > 0.3 && w[5] === 0);
  assert.ok(longas.length >= 7, `${longas.length} paredes longas`); // 5 do contorno (sul em 2 trechos) + 2 da interna
  assert.ok(longas.every(w => perto(w[4], 0.15) && w[6] === PD), JSON.stringify(longas.filter(w => !perto(w[4], 0.15) || w[6] !== PD)));
  // linha de centro: contorno 8,15 × 5,15 menos a janela (25,1 m) + parede interna sem o vão (4,2 m) + cantos/arremates
  assert.ok(cena.numeros.paredes_m >= 29 && cena.numeros.paredes_m <= 33, `paredes ${cena.numeros.paredes_m} m`);
  // nenhuma parede atravessa o vão da porta (x 5,0–5,15 × y 1,2–2,0) abaixo de 2,10 m
  const [ox, oy] = [(cena.limites[0] + cena.limites[2]) / 2, (cena.limites[1] + cena.limites[3]) / 2];
  const noVao = cena.paredes.filter(w => w[5] < 2.1 && [0.25, 0.5, 0.75].some(t => { const x = w[0] + (w[2] - w[0]) * t, y = w[1] + (w[3] - w[1]) * t; return x > 4.95 - ox && x < 5.2 - ox && y > 1.25 - oy && y < 1.95 - oy; }));
  assert.strictEqual(noVao.length, 0, JSON.stringify(noVao));
});

caso('porta: verga de 2,10 m ao teto no eixo da parede e folha aberta de 80 cm', () => {
  const vergas = cena.paredes.filter(w => w[5] === 2.1 && w[6] === PD && perto(comp(w), 0.8));
  assert.ok(vergas.length >= 1, 'sem verga sobre a porta');
  assert.ok(perto(vergas[0][4], 0.15), `verga com ${vergas[0][4]} m`);
  assert.strictEqual(cena.folhas.length, 1);
  const f = cena.folhas[0];
  assert.ok(perto(Math.hypot(f[2] - f[0], f[3] - f[1]), 0.8), 'folha com a largura da porta');
});

caso('janela: peitoril até 1,10 m, vidro de 1,10 a 2,10 m e verga até o teto', () => {
  assert.strictEqual(cena.vidros.length, 1);
  const v = cena.vidros[0];
  assert.ok(perto(comp(v), 1.5) && v[5] === 1.1 && v[6] === 2.1, JSON.stringify(v));
  assert.ok(cena.muretas.some(w => perto(comp(w), 1.5) && w[6] === 1.1), 'sem peitoril');
  assert.ok(cena.paredes.some(w => perto(comp(w), 1.5) && w[5] === 2.1 && w[6] === PD), 'sem verga da janela');
});

caso('mureta (layer "alvenaria baixa") com 1,10 m; pilar extrudado; mobiliário no piso', () => {
  assert.ok(cena.muretas.some(w => perto(comp(w), 3) && perto(w[4], 0.15) && w[6] === 1.1), 'mureta');
  assert.strictEqual(cena.numeros.pilares, 1);
  const linhas = Buffer.from(cena.planta, 'base64').length / 8;
  assert.ok(linhas >= 4, `${linhas} linhas de planta (mesa)`);
});

caso('números do projeto: áreas, ambientes, portas, janelas e pé-direito', () => {
  const N = cena.numeros;
  assert.ok(Math.abs(N.area_interna_m2 - 39.25) < 1, `área ${N.area_interna_m2}`);
  assert.strictEqual(N.ambientes, 2);
  assert.strictEqual(N.portas, 1);
  assert.strictEqual(N.janelas, 1);
  assert.strictEqual(N.pe_direito_m, PD);
  assert.ok(N.dimensoes_m[0] > 7.9 && N.dimensoes_m[1] > 4.9, `dimensões ${N.dimensoes_m}`);
  assert.deepStrictEqual(N.por_ambiente.map(a => a.tipo).sort(), ['molhado', 'social']);
});

caso('dispositivos: quantidades da skill, altura típica de instalação e dentro do ambiente', () => {
  const qtd = Object.fromEntries(cena.numeros.dispositivos.map(d => [d.simbolo, d.quantidade]));
  const doCalculo = {};
  for (const d of pts.dispositivos) doCalculo[d.simbolo] = (doCalculo[d.simbolo] || 0) + 1;
  assert.deepStrictEqual(qtd, doCalculo);
  assert.ok(qtd['HM-ELE-TOMADA-BAIXA'] >= 6 && qtd['HM-ELE-INTERRUPTOR'] === 2 && qtd['HM-CFTV-CAMERA'] === 1 && qtd['HM-CAB-PONTO-REDE'] === 10, JSON.stringify(qtd));
  assert.ok(tipo('HM-ELE-TOMADA-BAIXA').itens.every(i => i[2] === 0.3));
  assert.ok(tipo('HM-ELE-INTERRUPTOR').itens.every(i => i[2] === 1.1));
  assert.ok(tipo('HM-CAB-PONTO-REDE').itens.every(i => i[2] === 0.3));
  assert.ok(tipo('HM-ELE-PONTO-LUZ').itens.every(i => perto(i[2], PD - 0.03)));
  assert.ok(tipo('HM-CFTV-CAMERA').itens.every(i => perto(i[2], PD - 0.25)));
  // todo ponto fica dentro do seu ambiente (polígono pelas paredes: ± 8 cm da face)
  for (const t of cena.dispositivos) {
    for (const it of t.itens) {
      const amb = cena.ambientes[it[5]];
      assert.ok(amb && (dentro([it[0], it[1]], amb.poligono) || distanciaContorno([it[0], it[1]], amb.poligono) <= 0.08), `${t.simbolo} ${it[6]} fora de ${amb?.nome}: ${it[0]},${it[1]}`);
    }
  }
});

caso('pontos de parede encostados na face da parede (≤ 5 cm), virados para o ambiente', () => {
  const faces = [...cena.paredes, ...cena.muretas]; // peitoril da janela também é face
  const distFace = ([x, y, z]) => Math.min(...faces.filter(w => z >= w[5] && z <= w[6]).map(w => {
    const vx = w[2] - w[0], vy = w[3] - w[1], L2 = vx * vx + vy * vy;
    const t = Math.max(0, Math.min(1, ((x - w[0]) * vx + (y - w[1]) * vy) / L2));
    return Math.hypot(x - w[0] - vx * t, y - w[1] - vy * t) - w[4] / 2;
  }));
  for (const s of ['HM-ELE-TOMADA-BAIXA', 'HM-ELE-INTERRUPTOR', 'HM-CAB-PONTO-REDE']) {
    for (const it of tipo(s).itens) assert.ok(distFace(it) <= 0.05, `${s} ${it[6]} a ${distFace(it).toFixed(2)} m da parede`);
  }
  // câmera no canto, olhando para o centro do ambiente, com campo de visão recortado pelo ambiente
  const cam = tipo('HM-CFTV-CAMERA').itens[0];
  const amb = cena.ambientes[cam[5]];
  assert.ok((amb.centro[0] - cam[0]) * cam[3] + (amb.centro[1] - cam[1]) * cam[4] > 0, 'câmera de costas para a sala');
  const campo = cam[7];
  assert.ok(Array.isArray(campo) && campo.length >= 6);
  for (let k = 0; k < campo.length; k += 2) {
    const [x, y] = [campo[k], campo[k + 1]];
    const xs = amb.poligono.map(p => p[0]), ys = amb.poligono.map(p => p[1]);
    assert.ok(x >= Math.min(...xs) - 0.02 && x <= Math.max(...xs) + 0.02 && y >= Math.min(...ys) - 0.02 && y <= Math.max(...ys) + 0.02, 'campo de visão atravessa a parede');
  }
});

caso('pé-direito padrão 2,80 m quando não informado; avisos [CONFERIR] da estimativa', () => {
  const c2 = montarCena(arq);
  assert.strictEqual(c2.peDireito, 2.8);
  assert.ok(c2.paredes.filter(w => w[5] === 0).every(w => w[6] === 2.8));
  assert.strictEqual(pts.avisos.length, 3);
  assert.ok(pts.avisos.every(a => /\[CONFERIR\]/.test(a)));
});

caso('HTML autossuficiente: three.js embutido, sem recurso externo, aviso de ilustração e texto escapado', () => {
  assert.ok(bundleAtualizado(), `bundle do visualizador desatualizado: rode "npm run build:3d" (${SAIDA})`);
  const html = gerarHtml(cena);
  assert.ok(Buffer.byteLength(html) < 2 * 1024 * 1024, `${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB`);
  assert.match(html, /^<!doctype html>/);
  assert.ok(!/<script[^>]+src=|<link[^>]+href=|@import|url\(http/i.test(html), 'recurso externo no HTML');
  assert.match(html, /Ilustração — não substitui o projeto executivo/);
  assert.match(html, /three\.js r186/);
  assert.match(html, /&lt;b&gt;Cliente &amp; Cia&lt;\/b&gt;/);
  assert.ok(!html.includes('<b>Cliente & Cia</b>'), 'texto do cliente sem escape');
  // a cena no <script> não fecha a tag e é JSON válido
  const json = html.match(/<script>window\.CENA=(.*?);document\.querySelectorAll/s)[1];
  assert.ok(!json.includes('</'), '</ dentro do JSON');
  assert.strictEqual(JSON.parse(json).numeros.portas, 1);
  // o bundle é JavaScript válido (compila)
  const bundle = html.match(/<script>(\/\* Visualizador 3D H&M[\s\S]*?)<\/script>/)[1];
  new vm.Script(bundle);
});

console.log(`3d: ${ok} casos ok`);
