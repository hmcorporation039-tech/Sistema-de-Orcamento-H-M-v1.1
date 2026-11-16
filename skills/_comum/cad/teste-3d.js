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
const fs = require('fs');
const path = require('path');
const { montarCena, regiaoDoModelo, ESPEC, TAM_FORMA, TRECHOS, LIMITE_SEGMENTOS, ESPESSURA_MIN_DESENHO } = require('./modelo3d');
const { SIMBOLOS } = require('./simbolos');
const { pontosDasDisciplinas } = require('./estimativaArquitetura');
const { gerarHtml } = require('./visualizador3d');
const { bundleAtualizado, SAIDA } = require('./visualizador3d/construir');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};
const perto = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;
const r2t = (v) => Math.round(v * 100) / 100;
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
  assert.ok(tipo('HM-ELE-PONTO-LUZ').itens.every(i => perto(i[2], PD - 0.01))); // fundo da peça no forro
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

// ── Componentes legíveis: ESPEC com forma, tamanho e montagem ───────────────
const FONTE_APP = fs.readFileSync(path.join(__dirname, 'visualizador3d', 'app.js'), 'utf8');
const formasDoApp = new Set([...FONTE_APP.slice(FONTE_APP.indexOf('const FORMAS = {')).matchAll(/^\s+'?([a-z-]+)'?: \(w, h, d\)/gm)].map(m => m[1]));

caso('ESPEC: todo símbolo da biblioteca tem forma desenhada no visualizador, tamanho e altura', () => {
  for (const s of Object.keys(SIMBOLOS)) {
    const e = ESPEC[s];
    assert.ok(e, `${s} sem ESPEC`);
    assert.ok(formasDoApp.has(e.forma), `${s}: forma "${e.forma}" sem desenho em visualizador3d/app.js`);
    const tam = e.tam || TAM_FORMA[e.forma];
    assert.ok(Array.isArray(tam) && tam.length === 3 && tam.every(v => v > 0 && v <= 1.2), `${s}: tam ${JSON.stringify(tam)}`);
    assert.ok(typeof e.h === 'number' ? e.h > 0 && e.h < 3 : ['teto', 'canto', 'topo-porta', 'piso'].includes(e.h), `${s}: h ${e.h}`);
  }
  for (const f of Object.keys(TAM_FORMA)) assert.ok(formasDoApp.has(f), `forma ${f} sem desenho`);
  // tamanhos de desenho: tomada 4×2 um pouco exagerada (10 × 16 cm), quadro 60 × 80 cm, detector Ø 16 cm
  assert.deepStrictEqual(TAM_FORMA.tomada.slice(0, 2), [0.10, 0.16]);
  assert.deepStrictEqual(ESPEC['HM-ELE-QUADRO'].tam.slice(0, 2), [0.60, 0.80]);
  assert.strictEqual(TAM_FORMA.detector[0], 0.16);
  // a cena leva o tamanho e a montagem de cada tipo (o visualizador desenha por eles)
  for (const t of cena.dispositivos) {
    assert.ok(Array.isArray(t.tam) && t.tam.length === 3, `${t.simbolo} sem tam`);
    assert.ok(['parede', 'teto', 'canto', 'topo-porta', 'piso'].includes(t.montagem), `${t.simbolo}: montagem ${t.montagem}`);
  }
  assert.strictEqual(tipo('HM-ELE-TOMADA-BAIXA').montagem, 'parede');
  assert.strictEqual(tipo('HM-ELE-PONTO-LUZ').montagem, 'teto');
  assert.strictEqual(tipo('HM-CAB-PONTO-REDE').forma, 'rede');
  // 3 (fase 1 do roteiro, 02/11/2026): itens com circuito e comando e o modelo da instalação
  assert.strictEqual(cena.versao, 3);
});

caso('parede em linha simples ganha a espessura mínima de desenho (15 cm)', () => {
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }] });
  [[0, 0, 4000, 0], [4000, 0, 4000, 3000], [4000, 3000, 0, 3000], [0, 3000, 0, 0]].forEach(l => g.linha(...l, 'A-PAREDE'));
  g.texto(2000, 1500, 200, 'DEPÓSITO', { layer: 'A-TEXTO' });
  const a = lerArquitetura(g.toString().replace(/(\$INSUNITS\r?\n\s*70\r?\n\s*)6/, '$14'));
  const c = montarCena(a, { peDireito: 2.8 });
  assert.ok(c.paredes.length >= 4, `${c.paredes.length} paredes`);
  assert.ok(c.paredes.every(w => perto(w[4], ESPESSURA_MIN_DESENHO, 0.001)), JSON.stringify(c.paredes.map(w => w[4])));
  assert.strictEqual(ESPESSURA_MIN_DESENHO, 0.15);
});

// quadro e central com o símbolo no MEIO da sala: vão para a parede, inteiros
// (sem cair no vão da porta nem no peitoril da janela) e lado a lado
const sala = arq.ambientes.find(a => a.nome === 'SALA DE ESTAR');
const cQ = montarCena(arq, { peDireito: PD, dispositivos: [
  { simbolo: 'HM-ELE-QUADRO', id: 'QD-1', ambiente: 'SALA DE ESTAR', x: 2.5, y: 2.5, poligono: sala.poligono },
  { simbolo: 'HM-INC-CENTRAL', id: 'CAI-1', ambiente: 'SALA DE ESTAR', x: 2.5, y: 2.5, poligono: sala.poligono },
] });
const facesQ = [...cQ.paredes, ...cQ.muretas];
const distFaceQ = ([x, y, z]) => Math.min(...facesQ.filter(w => z >= w[5] && z <= w[6]).map(w => {
  const vx = w[2] - w[0], vy = w[3] - w[1], L2 = vx * vx + vy * vy;
  const t = Math.max(0, Math.min(1, ((x - w[0]) * vx + (y - w[1]) * vy) / L2));
  return Math.hypot(x - w[0] - vx * t, y - w[1] - vy * t) - w[4] / 2;
}));

caso('quadro elétrico e central: encostados na parede mais próxima, inteiros, na altura certa e sem sobrepor', () => {
  const q = cQ.dispositivos.find(t => t.simbolo === 'HM-ELE-QUADRO');
  const ce = cQ.dispositivos.find(t => t.simbolo === 'HM-INC-CENTRAL');
  const iq = q.itens[0], ic = ce.itens[0];
  assert.strictEqual(q.forma, 'quadro');
  assert.strictEqual(iq[2], 1.5);
  for (const [t, it] of [[q, iq], [ce, ic]]) {
    assert.ok(distFaceQ(it) <= 0.05, `${t.simbolo} a ${distFaceQ(it).toFixed(2)} m da parede`);
    // as pontas da peça (± meia largura ao longo da parede, topo e base) também estão na parede
    const tx = -it[4], ty = it[3];
    for (const s of [-1, 1]) for (const dz of [-1, 1]) {
      const p = [it[0] + tx * s * t.tam[0] / 2, it[1] + ty * s * t.tam[0] / 2, it[2] + dz * t.tam[1] / 2 * 0.95];
      assert.ok(distFaceQ(p) <= 0.06, `${t.simbolo}: ponta ${s},${dz} fora da parede (${distFaceQ(p).toFixed(2)} m)`);
    }
  }
  const ao = Math.abs((ic[0] - iq[0]) * -iq[4] + (ic[1] - iq[1]) * iq[3]);
  assert.ok(ao >= (q.tam[0] + ce.tam[0]) / 2 + 0.09, `quadro e central sobrepostos (${ao.toFixed(2)} m entre centros)`);
});

// Correção de 14/11/2026: quadro perto do CANTO (ou da parede interna/batente) saía na
// diagonal, metade dentro da parede do lado — "metade para fora, metade para dentro do
// ambiente". Agora: paralelo à parede, inteiro dentro do ambiente, sem entrar em parede.
function entraNaParede(it, tam, w) {
  const [x, y, z, nx, ny] = it; const u = [-ny, nx];
  if (z + tam[1] / 2 <= w[5] + 0.01 || z - tam[1] / 2 >= w[6] - 0.01) return 0;
  const c1 = [x + nx * tam[2] / 2, y + ny * tam[2] / 2], e1 = [u, [nx, ny]], h1 = [tam[0] / 2, tam[2] / 2];
  const v = [w[2] - w[0], w[3] - w[1]], L = Math.hypot(v[0], v[1]); if (L < 1e-6) return 0;
  const a = [v[0] / L, v[1] / L], e2 = [a, [-a[1], a[0]]], h2 = [L / 2, w[4] / 2], c2 = [(w[0] + w[2]) / 2, (w[1] + w[3]) / 2];
  const pr = (e, ax) => Math.abs(e[0] * ax[0] + e[1] * ax[1]);
  return Math.min(...[...e1, ...e2].map(ax => h1[0] * pr(e1[0], ax) + h1[1] * pr(e1[1], ax) + h2[0] * pr(e2[0], ax) + h2[1] * pr(e2[1], ax) - pr([c2[0] - c1[0], c2[1] - c1[1]], ax)));
}
caso('quadros nos cantos, junto da parede interna e da porta: paralelos à parede, inteiros dentro do ambiente', () => {
  const coz = arq.ambientes.find(a => a.nome === 'COZINHA');
  const [ox, oy] = (() => { const r = regiaoDoModelo(arq).caixa; return [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2]; })();
  const pontos = [['QD-SO', 0.2, 0.2, sala], ['QD-SO2', 0.3, 0.25, sala], ['QD-NE', 4.8, 4.8, sala], ['QD-PORTA', 4.85, 2.2, sala],
    ['QD-NO', 5.35, 4.8, coz], ['QD-SE', 7.8, 0.2, coz]];
  const c = montarCena(arq, { peDireito: PD, dispositivos: [
    ...pontos.map(([id, x, y, a]) => ({ simbolo: 'HM-ELE-QUADRO', id, ambiente: a.nome, x, y, poligono: a.poligono })),
    { simbolo: 'HM-PRZ-PAINEL', id: 'PRZ', ambiente: 'COZINHA', x: 7.9, y: 4.9, poligono: coz.poligono },
  ] });
  for (const t of c.dispositivos.filter(d => d.forma === 'quadro')) {
    for (const it of t.itens) {
      const amb = pontos.find(p => p[0] === it[6])?.[3] || coz;
      assert.ok(perto(Math.abs(it[3]) + Math.abs(it[4]), 1, 0.001), `${it[6]} na diagonal (${it[3]}, ${it[4]})`);
      const pior = Math.max(...c.paredes.map(w => entraNaParede(it, t.tam, w)));
      assert.ok(pior <= 0.01, `${it[6]} entra ${(pior * 100).toFixed(0)} cm na parede`);
      // frente e as duas pontas da peça dentro do ambiente do símbolo (o contorno lido tem a grade de 5 cm)
      const u = [-it[4], it[3]];
      for (const s of [-1, 1]) {
        const q = [it[0] + ox + u[0] * s * t.tam[0] / 2 + it[3] * t.tam[2], it[1] + oy + u[1] * s * t.tam[0] / 2 + it[4] * t.tam[2]];
        assert.ok(dentro(q, amb.poligono) || distanciaContorno(q, amb.poligono) < 0.08, `${it[6]}: ponta ${s} fora do ambiente`);
      }
    }
  }
  // os dois do mesmo canto: lado a lado, sem sobrepor
  const qd = c.dispositivos.find(t => t.simbolo === 'HM-ELE-QUADRO').itens, a = qd.find(i => i[6] === 'QD-SO'), b = qd.find(i => i[6] === 'QD-SO2');
  const mesmaParede = perto(a[3], b[3], 0.01) && perto(a[4], b[4], 0.01);
  if (mesmaParede) assert.ok(Math.abs((b[0] - a[0]) * -a[4] + (b[1] - a[1]) * a[3]) >= 0.6 - 0.001, 'QD-SO e QD-SO2 sobrepostos');
});

// ── Infraestrutura (opcoes.trechos) ─────────────────────────────────────────
const regiao = regiaoDoModelo(arq).caixa;
const origem = [(regiao[0] + regiao[2]) / 2, (regiao[1] + regiao[3]) / 2];
const cT = montarCena(arq, { peDireito: PD, trechos: [
  { disciplina: 'eletrica', tipo: 'eletrocalha', layer: 'ELE-ELETROCALHA', segmentos: [[0.5, 4, 7.5, 4], [4, 4, 4, 1]] },
  { disciplina: 'cabeamento', tipo: 'eletroduto', layer: 'CAB-ELETRODUTO', segmentos: [[1, 1, 1, 1.004], [1, 'x', 2, 2], [2, 2, 5, 2], [1000, 1000, 1010, 1000]] },
  { disciplina: 'rede', tipo: 'leito', segmentos: [[6, 0.5, 6, 3.5]], altura: 2.5 },
  { disciplina: 'alarme', tipo: 'inventado', segmentos: [[1, 3, 2, 3]] },
] });
const grupoInfra = (d, t) => cT.infra.find(g => g.disciplina === d && g.tipo === t);

caso('trechos: eletrocalha 10 × 5 cm a 30 cm do teto, eletroduto perto do teto, comprimento total e coordenadas da cena', () => {
  const ec = grupoInfra('eletrica', 'eletrocalha');
  assert.ok(ec, JSON.stringify(cT.infra.map(g => [g.disciplina, g.tipo])));
  assert.deepStrictEqual(ec.secao, [0.10, 0.05]);
  assert.strictEqual(ec.z, r2t(PD - 0.3));
  assert.strictEqual(ec.forma, 'caixa');
  assert.strictEqual(ec.comprimento_m, 10);
  assert.deepStrictEqual(ec.layers, ['ELE-ELETROCALHA']);
  // mesma translação P() da arquitetura
  assert.deepStrictEqual(ec.segmentos.slice(0, 4), [r2t(0.5 - origem[0]), r2t(4 - origem[1]), r2t(7.5 - origem[0]), r2t(4 - origem[1])]);
  assert.strictEqual(ec.segmentos.length, 8);
  // "cabeamento" vira a disciplina "rede"; segmento curto, inválido ou fora da região fica de fora
  const ed = grupoInfra('rede', 'eletroduto');
  assert.ok(ed && ed.forma === 'tubo' && ed.z === r2t(PD - TRECHOS.eletroduto.desce), JSON.stringify(ed));
  assert.strictEqual(ed.segmentos.length, 4);
  assert.strictEqual(ed.comprimento_m, 3);
  // altura informada no trecho; tipo desconhecido é desenhado como eletroduto
  assert.strictEqual(grupoInfra('rede', 'leito').z, 2.5);
  assert.ok(grupoInfra('alarme', 'eletroduto'), 'tipo desconhecido');
  assert.ok(cT.infra.every(g => /^#[0-9a-f]{6}$/i.test(g.cor)));
  // números e botões: comprimento por grupo e a disciplina aparece mesmo sem pontos
  // sem medida no desenho: a seção padrão, marcada como tal
  assert.deepStrictEqual(cT.numeros.infraestrutura.find(g => g.tipo === 'eletrocalha'), { disciplina: 'eletrica', tipo: 'eletrocalha', rotulo: 'Eletrocalha', material: null, medida: '100 × 50 mm', origem_medida: 'padrao', sugerido: false, comprimento_m: 10, descidas_m: 0, segmentos: 2 });
  assert.ok(cT.disciplinas.rede && cT.disciplinas.eletrica && cT.disciplinas.alarme);
  assert.deepStrictEqual(montarCena(arq).infra, []);
});

caso(`trechos: acima de ${LIMITE_SEGMENTOS.toLocaleString('pt-BR')} segmentos desenha os mais longos e avisa (comprimento conta todos)`, () => {
  const muitos = [];
  for (let i = 0; i < LIMITE_SEGMENTOS + 50; i++) muitos.push([0.1, 0.1 + (i % 400) * 0.01, 0.2 + (i < 50 ? 1 : 0), 0.1 + (i % 400) * 0.01]);
  const c = montarCena(arq, { peDireito: PD, trechos: [{ disciplina: 'eletrica', tipo: 'fiacao', segmentos: muitos }] });
  const g = c.infra[0];
  assert.strictEqual(g.segmentos.length / 4, LIMITE_SEGMENTOS);
  assert.strictEqual(g.segmentos_total, LIMITE_SEGMENTOS + 50);
  assert.ok(Math.abs(g.comprimento_m - ((LIMITE_SEGMENTOS + 50) * 0.1 + 50)) < 1, `${g.comprimento_m} m`);
  // os 50 mais longos (1,1 m) ficaram
  let longos = 0;
  for (let k = 0; k < g.segmentos.length; k += 4) if (g.segmentos[k + 2] - g.segmentos[k] > 1) longos++;
  assert.strictEqual(longos, 50);
  assert.ok(c.avisos.some(a => /mais longos/.test(a)), c.avisos.join(' | '));
});

caso('trechos com tipo e medida do desenho: seção real, grupo por medida e descida até a tomada', () => {
  const c = montarCena(arq, { peDireito: PD,
    trechos: [
      { disciplina: 'eletrica', tipo: 'eletroduto', layer: 'ELE-ELETRODUTO', material: 'PVC rígido', medida: 'Ø 25 mm (3/4")', secao_mm: [25, 25], origem_medida: 'texto', segmentos: [[0.5, 3, 7.5, 3]] },
      { disciplina: 'eletrica', tipo: 'eletroduto', layer: 'ELE-ELETRODUTO', material: 'PVC rígido', medida: 'Ø 32 mm (1")', secao_mm: [32, 32], origem_medida: 'texto', segmentos: [[4, 3, 4, 1]] },
    ],
    // tomada baixa a 0,5 m do eletroduto de 3/4" em planta: ramal + descida
    dispositivos: [{ simbolo: 'HM-ELE-TOMADA-BAIXA', x: 2, y: 3.5, ambiente: 'SALA DE ESTAR', poligono: sala.poligono }] });
  const g34 = c.infra.find(g => g.medida === 'Ø 25 mm (3/4")');
  assert.deepStrictEqual([g34.material, g34.origem_medida, g34.estimado, g34.secao], ['PVC rígido', 'texto', false, [0.025, 0.025]]);
  assert.ok(c.infra.some(g => g.medida === 'Ø 32 mm (1")' && g.secao[0] === 0.032));
  assert.strictEqual(g34.descidas.length, 4, JSON.stringify(g34.descidas));
  const [, , z0, z1] = g34.descidas;
  assert.ok(z0 < 0.5 && z1 === g34.z, `descida de ${z0} a ${z1}`);
  assert.ok(g34.descidas_m > 2 && g34.comprimento_m > 7 + g34.descidas_m - 0.01, JSON.stringify([g34.comprimento_m, g34.descidas_m]));
  // a disciplina que tem traçado não ganha o estimado
  assert.ok(!c.infra.some(g => g.estimado));
});

caso('sem traçado no projeto: eletroduto estimado do quadro até cada ponto, em "L", sem trecho repetido', () => {
  const pts = [[1, 1], [6, 1], [6, 3.5], [1, 3.5]].map(([x, y]) => ({ simbolo: 'HM-ELE-TOMADA-BAIXA', x, y, ambiente: 'SALA DE ESTAR', poligono: sala.poligono }));
  const c = montarCena(arq, { peDireito: PD, dispositivos: [{ simbolo: 'HM-ELE-QUADRO', x: 3.5, y: 0.5, ambiente: 'SALA DE ESTAR', poligono: sala.poligono }, ...pts,
    { simbolo: 'HM-INC-DETECTOR-FUMACA', x: 2, y: 2, ambiente: 'SALA DE ESTAR', poligono: sala.poligono }] });
  const g = c.infra.find(x => x.disciplina === 'eletrica');
  assert.deepStrictEqual([g.estimado, g.tipo, g.material, g.medida, g.origem_medida], [true, 'eletroduto', 'PVC corrugado', 'Ø 25 mm (3/4")', 'estimado']);
  // todos os segmentos são paralelos aos eixos e nenhum se sobrepõe a outro na mesma linha
  const s = [];
  for (let i = 0; i < g.segmentos.length; i += 4) s.push(g.segmentos.slice(i, i + 4));
  assert.ok(s.every(([x1, y1, x2, y2]) => Math.abs(x1 - x2) < 1e-6 || Math.abs(y1 - y2) < 1e-6));
  // 5 peças de parede (quadro + 4 tomadas) descem do eletroduto
  assert.strictEqual(g.descidas.length / 4, 5);
  // disciplina com uma peça só (o detector) não ganha traçado
  assert.ok(!c.infra.some(x => x.disciplina === 'incendio'));
  assert.ok(c.avisos.some(a => /Infraestrutura ESTIMADA/.test(a) && /PVC corrugado Ø 25 mm \(3\/4"\)/.test(a)), c.avisos.join(' | '));
});

// ── Infraestrutura: eletrocalha em abas, caminhos sugeridos, PDF por cor ─────
const { separarEletrocalhas, sugerirCaminhos } = require('./infraestrutura');
const { propostaDeMapa, aplicarMapa } = require('./pontosDoDesenho');

caso('eletrocalha desenhada como par de abas vira um eixo com a largura medida; eletrodutos lado a lado não', () => {
  const r = separarEletrocalhas([[0, 0, 6, 0], [0, 0.2, 6, 0.2], [1, 3, 5, 3], [2.5, 3.15, 9, 3.15], [7, 0, 7, 0.5]]);
  assert.strictEqual(r.eletrocalhas.length, 1);
  assert.strictEqual(r.eletrocalhas[0].largura_mm, 200);
  assert.deepStrictEqual(r.eletrocalhas[0].segmentos, [[0, 0.1, 6, 0.1]]);
  // os dois eletrodutos que só correm juntos num pedaço e o curto ficam como estão
  assert.strictEqual(r.resto.length, 3);
  const c = montarCena(arq, { peDireito: PD, trechos: [{ disciplina: 'eletrica', tipo: 'eletroduto', layer: 'EL-Condutos (Teto)', segmentos: [[0.5, 3, 7, 3], [0.5, 3.3, 7, 3.3], [2, 1, 2, 3]] }] });
  const ec = c.infra.find(g => g.tipo === 'eletrocalha');
  assert.ok(ec && ec.secao[0] === 0.3 && ec.comprimento_m === 6.5 && ec.origem_medida === 'desenho', JSON.stringify(c.infra.map(g => [g.tipo, g.secao, g.comprimento_m])));
  assert.ok(c.infra.some(g => g.tipo === 'eletroduto' && g.comprimento_m === 2));
});

caso('caminhos sugeridos: interruptor vai à luminária do ambiente, o resto à rede; "L" pelo lado com menos paredes', () => {
  const pecas = [
    { x: 0, y: 0, tipo: 'quadro', amb: 0 },
    { x: 5, y: 4, tipo: 'luminaria', amb: 1 },
    { x: 6, y: 1, tipo: 'interruptor', amb: 1 },
    { x: 0.3, y: 6, tipo: 'outro', amb: 0 },
  ];
  // parede em x = 3 de y = -1 a 2: o "L" do quadro até (5, 4) sobe primeiro e passa acima dela
  const r = sugerirCaminhos({ pecas, paredes: [[3, -1, 3, 2]] });
  assert.deepStrictEqual([r.sugeridos, r.sem], [3, 0]);
  const toca = (p) => r.segmentos.some(s => (perto(s[0], p[0]) && perto(s[1], p[1])) || (perto(s[2], p[0]) && perto(s[3], p[1])));
  assert.ok(pecas.every(p => toca([p.x, p.y])), JSON.stringify(r.segmentos));
  // o interruptor liga direto na luminária (retorno), não no quadro
  assert.ok(r.segmentos.some(s => perto(s[0], 6) && perto(s[1], 1)) && r.segmentos.some(s => (perto(s[2], 5) && perto(s[3], 4)) || (perto(s[0], 5) && perto(s[1], 4))));
  const cruzaParede = r.segmentos.some(([x1, y1, x2, y2]) => Math.min(x1, x2) < 3 && Math.max(x1, x2) > 3 && y1 > -1 && y1 < 2);
  assert.ok(!cruzaParede, JSON.stringify(r.segmentos));
  // ponto já encostado na rede do projeto não ganha caminho
  const r2 = sugerirCaminhos({ pecas: [{ x: 1, y: 0.3, tipo: 'outro' }, { x: 4, y: 3, tipo: 'outro' }], rede: [0, 0, 5, 0] });
  assert.deepStrictEqual([r2.ligados, r2.sugeridos], [1, 1]);
  // tomada ligada pelo eletroduto do piso (redeParede) também não
  const r3 = sugerirCaminhos({ pecas: [{ x: 1, y: 0.3, tipo: 'outro' }, { x: 4, y: 3, tipo: 'luminaria' }], rede: [4, 0, 4, 2], redeParede: [0, 0, 2, 0] });
  assert.deepStrictEqual([r3.sugeridos, r3.segmentos.length], [1, 1]);
});

caso('3D com caminhos sugeridos: grupo à parte, translúcido no visualizador, tomada sobe do eletroduto do piso', () => {
  const c = montarCena(arq, { peDireito: PD, sugerirInfra: true, estimarInfra: false,
    trechos: [{ disciplina: 'eletrica', tipo: 'eletroduto', layer: 'EL-Condutos (Piso)', altura: 0.04, segmentos: [[0.5, 3.5, 6, 3.5]] }],
    dispositivos: [
      { simbolo: 'HM-ELE-QUADRO', x: 3.5, y: 0.5, ambiente: 'SALA DE ESTAR', poligono: sala.poligono },
      { simbolo: 'HM-ILU-LUMINARIA', x: 2, y: 2, ambiente: 'SALA DE ESTAR', poligono: sala.poligono },
      { simbolo: 'HM-ILU-LUMINARIA', x: 5, y: 2, ambiente: 'SALA DE ESTAR', poligono: sala.poligono },
      { simbolo: 'HM-ELE-TOMADA-BAIXA', x: 2, y: 3.9, ambiente: 'SALA DE ESTAR', poligono: sala.poligono },
    ] });
  const sug = c.infra.filter(g => g.sugerido);
  assert.ok(sug.length && sug.every(g => g.estimado && g.origem_medida === 'sugerido' && g.rotulo === 'Eletroduto sugerido'), JSON.stringify(c.infra.map(g => g.rotulo)));
  assert.ok(sug[0].comprimento_m > 2);
  // a tomada (a 0,4 m do eletroduto do piso) sobe dele; não ganha caminho pelo teto
  const piso = c.infra.find(g => !g.sugerido && g.z < 0.5);
  assert.strictEqual(piso.descidas.length, 4, JSON.stringify(piso.descidas));
  assert.ok(piso.descidas[2] === piso.z && piso.descidas[3] > 0.1);
  assert.ok(c.avisos.some(a => /Caminhos SUGERIDOS/.test(a)), c.avisos.join(' | '));
  assert.ok(c.numeros.infraestrutura.some(g => g.sugerido));
  const html = gerarHtml(c);
  assert.ok(html.includes('id="b-sugerido"'));
  for (const k of ['materialSugerido', "'#b-sugerido'"]) assert.ok(FONTE_APP.includes(k), `app.js sem ${k}`);
  // sem a opção, nada sugerido
  assert.ok(!montarCena(arq, { peDireito: PD, estimarInfra: false, dispositivos: [{ simbolo: 'HM-ILU-LUMINARIA', x: 2, y: 2 }, { simbolo: 'HM-ILU-LUMINARIA', x: 5, y: 2 }] }).infra.length);
});

caso('PDF convertido: cor que é traçado vira eletroduto (tracejado no piso); círculo vira luminária; marca miúda não', () => {
  const circulo = (cx, cy, r) => Array.from({ length: 24 }, (_, k) => [cx + r * Math.cos(k * Math.PI / 12), cy + r * Math.sin(k * Math.PI / 12)]);
  const referencia = [];
  for (const x of [2, 5, 8]) referencia.push({ tipo: 'poli', fechada: true, layer: 'PDF-COR-A52900', pts: circulo(x, 2, 0.16) });
  // eletroduto curvo entre as luminárias + duas setas miúdas na mesma cor
  referencia.push({ tipo: 'poli', layer: 'PDF-COR-FF7F00', pts: [[2.16, 2], [3.5, 2.6], [4.84, 2]] }, { tipo: 'poli', layer: 'PDF-COR-FF7F00', pts: [[5.16, 2], [6.5, 2.6], [7.84, 2]] });
  for (const x of [3, 6]) referencia.push({ tipo: 'poli', fechada: true, layer: 'PDF-COR-FF7F00', pts: [[x, 1], [x + 0.1, 1.05], [x, 1.1]] });
  referencia.push({ tipo: 'linha', layer: 'PDF-COR-FF0101-TRACEJADO', pts: [[0, 0], [9, 0]] });
  const arqPdf = { ambientes: [], referencia };
  const mapa = propostaDeMapa(arqPdf);
  const lum = mapa.simbolos.find(s => s.layer === 'PDF-COR-A52900');
  assert.ok(lum && lum.simbolo === 'HM-ILU-LUMINARIA' && lum.quantidade === 3, JSON.stringify(mapa.simbolos));
  assert.ok(!mapa.simbolos.some(s => s.layer === 'PDF-COR-FF7F00' && s.simbolo !== '?'), 'seta do eletroduto virou ponto');
  const tr = Object.fromEntries(mapa.trechos.map(t => [t.layer, t]));
  assert.ok(tr['PDF-COR-FF7F00'] && !tr['PDF-COR-FF7F00'].altura);
  assert.strictEqual(tr['PDF-COR-FF0101-TRACEJADO'].altura, 0.04);
  const { pontos, trechos } = aplicarMapa(arqPdf, mapa);
  assert.strictEqual(pontos.filter(p => p.simbolo === 'HM-ILU-LUMINARIA').length, 3);
  // o traçado laranja sem as setas: 2 curvas de 2 pedaços
  assert.strictEqual(trechos.find(t => t.layer === 'PDF-COR-FF7F00').segmentos.length, 4);
});

caso('altura da tomada pela legenda (preenchimento do triângulo) e pela nota ao lado do ponto', () => {
  // triângulo do QiBuilder (0,5 × 0,4) explodido em 3 traços; alta = cheio, média = meio, baixa = vazio
  const tri = (x, y) => [[[x, y], [x + 0.5, y + 0.2]], [[x + 0.5, y + 0.2], [x, y + 0.4]], [[x, y + 0.4], [x, y]]].map(pts => ({ tipo: 'linha', layer: 'EL-Tomadas', pts }));
  const cheio = (x, y, f) => ({ layer: 'EL-Tomadas', pts: [[x, y], [x + 0.5 * f, y], [x + 0.5 * f, y + 0.4], [x, y + 0.4]] });
  const referencia = [], preenchimentos = [], simbolosDaLegenda = [];
  // legenda (fora da planta): símbolo à esquerda do texto
  simbolosDaLegenda.push(...tri(100, 0), ...tri(100, -1), ...tri(100, -2));
  preenchimentos.push(cheio(100, 0, 0.8), cheio(100, -2, 0.4));
  const notas = [
    { s: 'Tomada alta a 2,20m do piso', x: 101, y: 0.2, legenda: true },
    { s: 'Tomada baixa a 0,30m do piso', x: 101, y: -0.8, legenda: true },
    { s: 'Tomada média a 1,20m do piso', x: 101, y: -1.8, legenda: true },
  ];
  // planta: 2 altas (chuveiros), 2 baixas, 1 média; uma baixa com nota "altura: 97,5 cm" e uma alta "20 cm abaixo do forro"
  for (const [x, f] of [[1, 0.8], [3, 0.8], [5, 0], [7, 0], [9, 0.4]]) { referencia.push(...tri(x, 1)); if (f) preenchimentos.push(cheio(x, 1, f)); }
  notas.push({ s: 'Tomada de espelho altura: 97,5 cm', x: 7.2, y: 1.8 }, { s: 'h= 20 cm abaixo do forro', x: 3.2, y: 1.8 });
  const arqT = { ambientes: [], referencia, preenchimentos, simbolosDaLegenda, notas };
  const mapa = propostaDeMapa(arqT);
  const por = (h) => mapa.simbolos.find(s => s.altura_m === h);
  assert.ok(por(2.2)?.simbolo === 'HM-ELE-TOMADA-ALTA' && por(2.2).quantidade === 2 && por(2.2).rotulo === 'Tomada alta a 2,20m do piso', JSON.stringify(mapa.simbolos));
  assert.ok(por(0.3)?.quantidade === 2 && por(1.2)?.simbolo === 'HM-ELE-TOMADA-MEDIA', JSON.stringify(mapa.simbolos));
  const { pontos } = aplicarMapa(arqT, mapa);
  const em = (x) => pontos.find(p => Math.abs(p.x - x - 0.25) < 0.01);
  assert.deepStrictEqual([em(1).altura_m, em(5).altura_m, em(9).altura_m, em(7).altura_m], [2.2, 0.3, 1.2, 0.98]);
  assert.ok(em(7).simbolo === 'HM-ELE-TOMADA-MEDIA' && /nota do projeto/.test(em(7).rotulo) && em(7).alturaDe === 'nota');
  assert.ok(em(3).abaixoDoForro_m === 0.2 && !em(3).altura_m);
  // no 3D: a alta a 2,20 m e a "abaixo do forro" pelo pé-direito
  const c = montarCena(arq, { peDireito: 3, dispositivos: pontos.map(p => ({ ...p, x: 1 + p.x / 3, y: 3.9 })) });
  const zs = c.dispositivos.flatMap(t => t.itens.map(i => i[2])).sort();
  assert.deepStrictEqual(zs, [0.3, 0.98, 1.2, 2.2, 2.8],JSON.stringify(c.dispositivos.map(t => [t.rotulo, t.itens.map(i => i[2])])));
});

caso('componente do projeto: descrição própria, altura lida e símbolo genérico quando não há um no 3D', () => {
  const c = montarCena(arq, { peDireito: PD, dispositivos: [
    { simbolo: 'HM-INC-ACIONADOR', rotulo: 'Acionador manual AME 521', altura_m: 1.25, disciplina: 'incendio', x: 2, y: 3.9, ambiente: 'SALA DE ESTAR', poligono: sala.poligono },
    { simbolo: 'HM-GEN-COMPONENTE', rotulo: 'Isolador de laço IDL 521', disciplina: 'incendio', x: 3, y: 3.9, ambiente: 'SALA DE ESTAR', poligono: sala.poligono },
  ] });
  const ac = c.dispositivos.find(t => t.rotulo === 'Acionador manual AME 521');
  assert.ok(ac && ac.itens[0][2] === 1.25, JSON.stringify(ac));
  const iso = c.dispositivos.find(t => t.rotulo === 'Isolador de laço IDL 521');
  assert.deepStrictEqual([iso.disciplina, iso.forma, iso.montagem], ['incendio', 'caixa', 'parede']);
});

caso('página: corte, infraestrutura, "Ir para ambiente" e painel de dentro do ambiente; infra na cena; texto escapado', () => {
  const html = gerarHtml(cT);
  for (const id of ['b-corte', 'b-infra', 'ir-ambiente', 'b-voltar', 'dentro', 'etiquetas-pontos', 'b-grandes', 'b-paredes']) assert.ok(html.includes(`id="${id}"`), `sem #${id}`);
  assert.match(html, /Voltar à vista geral/);
  const json = JSON.parse(html.match(/<script>window\.CENA=(.*?);document\.querySelectorAll/s)[1]);
  assert.strictEqual(json.infra.length, cT.infra.length);
  // o visualizador entra no ambiente, faz o corte no shader e escala os símbolos pela distância
  for (const k of ['entrarAmbiente', 'voltarVistaGeral', 'zoomToCursor', 'aParede', 'uMinInfra', 'InstancedMesh', 'dblclick']) assert.ok(FONTE_APP.includes(k), `app.js sem ${k}`);
  // nome de ambiente/rótulo vindo da cena nunca vai cru para o HTML
  const cru = FONTE_APP.split('\n').filter(l => !/textContent/.test(l) && /\$\{(?:a|t|g|d|c\.t)\.(?:nome|rotulo|layers)\}/.test(l));
  assert.deepStrictEqual(cru, [], 'texto da cena sem esc() em template de HTML');
});

caso('barra enxuta (2.44): à vista só ambiente, vistas, paredes e corte; camadas em "Exibir", ferramentas em "Ferramentas"; painel lateral sob "Legenda"', () => {
  const html = gerarHtml(cT);
  const nav = html.slice(html.indexOf('<nav id="barra">'), html.indexOf('</nav>'));
  const exibir = nav.slice(nav.indexOf('id="m-exibir"'), nav.indexOf('id="m-ferr"'));
  const ferr = nav.slice(nav.indexOf('id="m-ferr"'));
  for (const id of ['disciplinas', 'b-ambientes', 'b-etiquetas', 'b-portas', 'b-planta', 'b-infra', 'b-sugerido', 'b-campo', 'b-grandes']) assert.ok(exibir.includes(`id="${id}"`), `#${id} fora do menu Exibir`);
  assert.ok(ferr.includes('id="b-giro"'), 'giro fora do menu Ferramentas');
  for (const id of ['ir-ambiente', 'b-3d', 'b-cima', 'b-paredes', 'b-corte', 'b-painel', 'b-tela']) assert.ok(nav.includes(`id="${id}"`), `sem #${id} na barra`);
  // fora dos menus, no máximo 9 controles à vista (antes eram 17 + um por disciplina)
  const avista = nav.replace(/<div class="menu-lista">[\s\S]*?<\/div><\/div>/g, '').match(/<(button|select)\b/g).length;
  assert.ok(avista <= 9, `${avista} controles à vista`);
  // embutido (tela da análise) e tela pequena: painel lateral fechado e sem o cabeçalho repetido
  assert.ok(html.includes('body.embutido>header{display:none}'), 'cabeçalho repetido no 3D embutido');
  assert.ok(html.includes('body.sem-painel>aside{display:none}'), 'painel lateral sem o botão Legenda');
  // Medir, Copiar vista e a simulação vão para o menu; a busca fica na barra
  assert.ok(FONTE_APP.includes("menu: $('#m-ferr .menu-lista')") && FONTE_APP.includes('function menuFerramentas('));
});

// ── Revisão de 02/11/2026: ambiente pelo polígono, chaves do registro, desempenho ──
caso('3D-01 componente do DWG com ambiente null: vai para o menor ambiente que contém o ponto (ou o de contorno mais perto)', () => {
  const c = montarCena(arq, { peDireito: PD, dispositivos: [
    { simbolo: 'HM-ILU-LUMINARIA', disciplina: 'iluminacao', x: 2, y: 2, id: '', ambiente: null },
    { simbolo: 'HM-ILU-LUMINARIA', disciplina: 'iluminacao', x: 6.5, y: 2.5, id: '', ambiente: null },
    // dentro da parede (5 cm fora do contorno, que corre pela face interna): a sala do lado
    { simbolo: 'HM-ELE-TOMADA-BAIXA', disciplina: 'eletrica', x: 2, y: 5.05, id: '', ambiente: null },
    // nome que não casa com nenhum ambiente: também pelo polígono
    { simbolo: 'HM-ELE-TOMADA-BAIXA', disciplina: 'eletrica', x: 6.5, y: 0.2, id: '', ambiente: 'SALA QUE NÃO EXISTE' },
    // longe de tudo: continua sem ambiente
    { simbolo: 'HM-ILU-POSTE', disciplina: 'iluminacao-externa', x: 11, y: 2, id: '', ambiente: null },
  ] });
  const nome = (i) => (i >= 0 ? c.ambientes[i].nome : null);
  const lum = c.dispositivos.find(t => t.simbolo === 'HM-ILU-LUMINARIA').itens.map(i => nome(i[5]));
  assert.deepStrictEqual(lum, ['SALA DE ESTAR', 'COZINHA']);
  const tom = c.dispositivos.find(t => t.simbolo === 'HM-ELE-TOMADA-BAIXA').itens.map(i => nome(i[5]));
  assert.deepStrictEqual(tom, ['SALA DE ESTAR', 'COZINHA']);
  assert.strictEqual(c.dispositivos.find(t => t.simbolo === 'HM-ILU-POSTE').itens[0][5], -1);
  // pelo nome, quando casa, continua valendo
  const c2 = montarCena(arq, { peDireito: PD, dispositivos: [{ simbolo: 'HM-ILU-LUMINARIA', x: 2, y: 2, ambiente: 'COZINHA' }] });
  assert.strictEqual(c2.ambientes[c2.dispositivos[0].itens[0][5]].nome, 'COZINHA');
});

caso('SK-05 chaves de disciplina do 3D = as do registro único; nomes antigos aceitos (controle-acesso, veicular)', () => {
  const { DISCIPLINAS: REG } = require('../disciplinas');
  const { DISCIPLINAS: D3, chaveDisciplina } = require('./modelo3d');
  const chaves = new Set(REG.map(d => d.chave));
  assert.deepStrictEqual(Object.keys(D3).filter(k => !chaves.has(k)), ['iluminacao-externa']);
  assert.strictEqual(chaveDisciplina('controle-acesso'), 'controle_acesso');
  assert.strictEqual(chaveDisciplina('veicular'), 'carregador');
  const c = montarCena(arq, { peDireito: PD, dispositivos: [
    { simbolo: 'HM-VE-CARREGADOR', disciplina: 'carregador', x: 2, y: 3.9 },
    { simbolo: 'HM-VE-CARREGADOR', disciplina: 'veicular', x: 3, y: 3.9 },
    { simbolo: 'HM-ACE-LEITOR', disciplina: 'controle-acesso', x: 6, y: 3.9 },
    { simbolo: 'HM-HOSP-TOMADA-IT', x: 1, y: 3.9 },
  ], trechos: [{ disciplina: 'controle-acesso', tipo: 'eletroduto', segmentos: [[5.5, 1, 7.5, 1]] }] });
  // um tipo só, com a cor e o rótulo da disciplina (antes: cinza #dddddd e 'carregador' cru)
  const ve = c.dispositivos.filter(t => t.simbolo === 'HM-VE-CARREGADOR');
  assert.deepStrictEqual(ve.map(t => [t.disciplina, t.itens.length]), [['carregador', 2]]);
  assert.deepStrictEqual(Object.keys(c.disciplinas).sort(), ['carregador', 'controle_acesso', 'eletrica_hospitalar']);
  assert.ok(Object.values(c.disciplinas).every(d => d.cor !== '#dddddd' && !/_/.test(d.rotulo)), JSON.stringify(c.disciplinas));
  assert.ok(c.infra.every(g => g.disciplina === 'controle_acesso'), JSON.stringify(c.infra.map(g => g.disciplina)));
});

caso('3D-03 busca pela grade = busca em todos os segmentos (mesmo segmento, mesma distância, mesmo empate)', () => {
  const { buscaMaisPerto } = require('./infraestrutura');
  let sem = 7;
  const rnd = () => { sem = (sem * 1103515245 + 12345) % 2147483648; return sem / 2147483648; };
  const segs = [];
  for (let i = 0; i < 500; i++) { const x = Math.round(rnd() * 80), y = Math.round(rnd() * 60), L = Math.round(rnd() * 6); segs.push(...(rnd() < 0.5 ? [x, y, x + L, y] : [x, y, x, y + L])); }
  const pela = buscaMaisPerto(segs);
  for (let k = 0; k < 400; k++) {
    const x = Math.round(rnd() * 100) - 10, y = Math.round(rnd() * 80) - 10;
    let m = null;
    for (let i = 0; i < segs.length; i += 4) {
      const [x1, y1, vx, vy] = [segs[i], segs[i + 1], segs[i + 2] - segs[i], segs[i + 3] - segs[i + 1]];
      const L2 = vx * vx + vy * vy, t = L2 ? Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / L2)) : 0;
      const d = Math.hypot(x - (x1 + vx * t), y - (y1 + vy * t));
      if (!m || d < m.d) m = { d, s: i / 4 };
    }
    const g = pela(x, y);
    assert.deepStrictEqual([g.d, g.s], [m.d, m.s], `ponto ${x}, ${y}`);
  }
});

caso('3D-03 caminhos sugeridos em planta grande: rápido; no teto de ligações para e conta os que ficaram de fora', () => {
  // 300 salas de 4 × 4 m, 9 pontos cada (antes: 3,4 s na cena; a de 1.200 salas, 51 s)
  const pecas = [], paredes = [];
  for (let i = 0; i < 20; i++) for (let j = 0; j < 15; j++) {
    const x0 = i * 4 + 0.15, y0 = j * 4 + 0.15, amb = i * 15 + j;
    for (let k = 0; k < 4; k++) pecas.push({ x: x0 + 0.5 + k * 0.9, y: y0 + 0.02, tipo: 'outro', amb });
    for (let k = 0; k < 4; k++) pecas.push({ x: x0 + 1 + (k % 2) * 2, y: y0 + 1 + Math.floor(k / 2) * 2, tipo: 'luminaria', amb });
    pecas.push({ x: x0 + 0.02, y: y0 + 1, tipo: 'interruptor', amb });
  }
  for (let i = 0; i <= 20; i++) paredes.push([i * 4, 0, i * 4, 60], [i * 4 + 0.15, 0, i * 4 + 0.15, 60]);
  for (let j = 0; j <= 15; j++) paredes.push([0, j * 4, 80, j * 4], [0, j * 4 + 0.15, 80, j * 4 + 0.15]);
  const t = Date.now();
  const r = sugerirCaminhos({ pecas, paredes });
  const ms = Date.now() - t;
  assert.deepStrictEqual([r.sugeridos, r.sem, r.cortados], [2699, 0, 0]);
  assert.ok(ms < 2500, `${ms} ms`);
  // teto: para no limite e conta os que ficaram de fora (10 salas: 10 retornos, 1 raiz, 10 ligações)
  const rc = sugerirCaminhos({ pecas: pecas.slice(0, 90), paredes, maxSugeridos: 10 });
  assert.deepStrictEqual([rc.sugeridos, rc.sem, rc.cortados], [20, 69, 69]);
});

// ── Revisão do motor de leitura (06/11/2026): pontos do desenho, tipos, nomes repetidos, recorte ──
{
  const { tipoPelaLayer, tipoPeloTexto } = require('./tiposDePonto');
  const { pontosDoDesenho } = require('./pontosDoDesenho');
  const { recortarArquitetura } = require('./modelo3d');
  const { criarSimulador } = require('../instalacao/simulador');
  const quadradoR = (x, y, s, layer) => ({ tipo: 'poli', fechada: true, layer, pts: [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]] });
  const arqDeR = (referencia) => ({ ambientes: [], referencia, notas: [], preenchimentos: [], simbolosDaLegenda: [] });
  const ret = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

  caso('R-01 luminárias do térreo e do superior (mesma quantidade, outro lugar) contam as duas: 12, não 6', () => {
    const refs = [];
    for (let i = 0; i < 6; i++) refs.push(quadradoR(i * 2, 0, 0.3, 'EL-LUMINARIA-TERREO'), quadradoR(i * 2, 30, 0.3, 'EL-LUMINARIA-SUPERIOR'));
    const mapa = propostaDeMapa(arqDeR(refs));
    assert.deepStrictEqual(mapa.simbolos.map(s => s.simbolo), ['HM-ILU-LUMINARIA', 'HM-ILU-LUMINARIA']);
    assert.strictEqual(aplicarMapa(arqDeR(refs), mapa).pontos.length, 12);
    // o mesmo aparelho em duas layers NO MESMO LUGAR (símbolo + contorno IFC) continua contando uma vez
    const dup = [];
    for (let i = 0; i < 6; i++) dup.push(quadradoR(i * 2, 0, 0.3, 'EL-LUMINARIA'), quadradoR(i * 2 - 0.02, -0.02, 0.34, 'IFC-LUMINARIA'));
    assert.strictEqual(pontosDoDesenho(arqDeR(dup)).pontos.length, 6);
  });

  caso('R-02 duas tomadas a 25 cm na bancada são duas (8 em 4 bancadas); a cópia no mesmo lugar continua uma', () => {
    const tri = (x, y, s = 0.15) => ({ tipo: 'poli', fechada: true, layer: 'EL-TOMADAS', pts: [[x, y], [x + s, y], [x + s / 2, y + s * 0.87], [x, y]] });
    const refs = [];
    for (let i = 0; i < 4; i++) refs.push(tri(i * 3, 0), tri(i * 3 + 0.25, 0));
    assert.strictEqual(pontosDoDesenho(arqDeR(refs)).pontos.length, 8);
    // bloco inserido duas vezes no mesmo ponto (com 1 cm de diferença): um ponto
    assert.strictEqual(pontosDoDesenho(arqDeR([tri(0, 0), tri(0.01, 0), tri(3, 0)])).pontos.length, 2);
  });

  caso('R-03 símbolo explodido em SOLID (tomada cheia) e ELLIPSE (luminária oval) é lido; o SOLID conta como preenchido', () => {
    const solid = (x, y, l) => ['0', 'SOLID', '8', l, '10', x, '20', y, '30', 0, '11', x + 0.2, '21', y, '31', 0, '12', x + 0.1, '22', y + 0.17, '32', 0, '13', x + 0.1, '23', y + 0.17, '33', 0];
    const elipse = (x, y, l) => ['0', 'ELLIPSE', '8', l, '10', x, '20', y, '30', 0, '11', 0.15, '21', 0, '31', 0, '40', 0.5, '41', 0, '42', 6.283185];
    const ents = [solid(0, 0, 'EL-TOMADAS'), solid(2, 0, 'EL-TOMADAS'), solid(4, 0, 'EL-TOMADAS'), elipse(0, 3, 'EL-LUMINARIA'), elipse(3, 3, 'EL-LUMINARIA')];
    const txt = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', 6, '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', ...ents.flat(), '0', 'ENDSEC', '0', 'EOF'].join('\n');
    const a = lerArquitetura(txt, { classificar: false });
    assert.strictEqual(a.preenchimentos.length, 3);
    const mapa = propostaDeMapa(a);
    const tom = mapa.simbolos.find(s => s.layer === 'EL-TOMADAS');
    // (triângulo cheio = metade da caixa, como o mesmo triângulo em HATCH sólido; antes o SOLID dava 0 — vazio)
    assert.deepStrictEqual([tom.quantidade, tom.preenchimento], [3, 0.5], 'tomada cheia: preenchida como a de HATCH');
    const p = aplicarMapa(a, mapa).pontos;
    assert.deepStrictEqual([p.filter(x => /TOMADA/.test(x.simbolo)).length, p.filter(x => x.simbolo === 'HM-ILU-LUMINARIA').length], [3, 2]);
  });

  caso('R-08 tipos: "detector de presença" é sensor (não fumaça); ILUMINAÇÃO na layer não engole interruptor, quadro e poste; ALM-SENSOR é alarme', () => {
    assert.strictEqual(tipoPeloTexto('Detector de presença de teto')[2], 'HM-ILU-SENSOR');
    assert.strictEqual(tipoPeloTexto('Detector de fumaça óptico')[2], 'HM-INC-DETECTOR-FUMACA');
    assert.strictEqual(tipoPeloTexto('Sensor de presença IVP do alarme')[2], 'HM-ALM-IVP');
    const l = (x) => tipoPelaLayer(x)?.[2];
    assert.deepStrictEqual(['EL-ILUMINACAO-INTERRUPTORES', 'EL-QUADRO-ILUMINACAO', 'ILUMINACAO-POSTES', 'EL-DETECTOR-PRESENCA', 'ALM-SENSOR', 'ALM-SENSOR-MAGNETICO', 'EL-ILUMINACAO', 'EL-LUMINARIA', 'INC-DETECTOR'].map(l),
      ['HM-ELE-INTERRUPTOR', 'HM-ELE-QUADRO', 'HM-ILU-POSTE', 'HM-ILU-SENSOR', 'HM-ALM-IVP', 'HM-ALM-MAGNETICO', 'HM-ILU-LUMINARIA', 'HM-ILU-LUMINARIA', 'HM-INC-DETECTOR-FUMACA']);
  });

  // dois "BANHEIRO" (o 2º maior): os pontos chegam com o NOME do ambiente, como de pontosDoDesenho
  const b1 = ret(0, 0, 2, 2), b2 = ret(10, 0, 14, 3);
  const paredes = (p) => p.map((a, i) => ({ tipo: 'linha', layer: 'A-PAREDE', pts: [a, p[(i + 1) % p.length]] }));
  const arqBanheiros = () => ({
    ambientes: [{ nome: 'BANHEIRO', poligono: b1, area_m2: 4, centro: [1, 1] }, { nome: 'BANHEIRO', poligono: b2, area_m2: 12, centro: [12, 1.5] }],
    referencia: [...paredes(b1), ...paredes(b2)], portas: [], regioesPlanta: [], extensao: { min: [0, 0], max: [14, 3] },
  });
  const dispositivosBanheiros = () => [
    { simbolo: 'HM-ELE-QUADRO', x: 0.2, y: 1, ambiente: 'BANHEIRO', disciplina: 'eletrica' },
    { simbolo: 'HM-ILU-LUMINARIA', x: 1, y: 1, ambiente: 'BANHEIRO', disciplina: 'eletrica', id: 'L-1' },
    { simbolo: 'HM-ELE-INTERRUPTOR', x: 0.1, y: 0.5, ambiente: 'BANHEIRO', disciplina: 'eletrica', id: 'I-1' },
    { simbolo: 'HM-ILU-LUMINARIA', x: 12, y: 1.5, ambiente: 'BANHEIRO', disciplina: 'eletrica', id: 'L-2' },
    { simbolo: 'HM-ELE-INTERRUPTOR', x: 10.1, y: 0.5, ambiente: 'BANHEIRO', disciplina: 'eletrica', id: 'I-2' },
  ];
  caso('R-09 3D com dois ambientes "BANHEIRO": cada ponto no seu, e o interruptor de um não acende a luz do outro', () => {
    const c = montarCena(arqBanheiros(), { peDireito: 2.8, dispositivos: dispositivosBanheiros(), estimarInfra: false });
    const amb = Object.fromEntries(c.dispositivos.flatMap(t => t.itens.map(it => [it[6], it[5]])));
    assert.deepStrictEqual([amb['L-1'], amb['I-1'], amb['L-2'], amb['I-2']], [0, 0, 1, 1]);
    assert.deepStrictEqual(c.instalacao.comandos.map(k => `${k.dispositivos}→${k.pontos}`), ['I-1→L-1', 'I-2→L-2']);
  });

  caso('R-19 circuito lido no texto da planta entra na simulação marcado "lido, a conferir" (com aviso)', () => {
    const c = montarCena(arqBanheiros(), { peDireito: 2.8, dispositivos: dispositivosBanheiros(), estimarInfra: false, rotulos: [{ s: '3', x: 1.2, y: 1.1 }] });
    const p = c.instalacao.pontos.find(x => x.id === 'L-1');
    assert.deepStrictEqual([p.circuito, p.circuitoLido], ['3', 'a_conferir']);
    assert.match(c.instalacao.circuitos.find(x => x.id === '3').descricao, /lido na planta, a conferir/);
    assert.ok(c.avisos.some(a => /LIDO no texto da planta.*\[CONFERIR\]/.test(a)), c.avisos.join(' | '));
    assert.strictEqual(criarSimulador(c.instalacao).estadoPonto('L-1').circuitoLido, 'a_conferir');
    assert.strictEqual(c.instalacao.pontos.find(x => x.id === 'L-2').circuitoLido, undefined, 'o ponto sem número lido não é marcado');
  });

  caso('R-20 recorte de uma planta: a parede que cruza a borda é recortada nela (antes sumia)', () => {
    const arq = { ambientes: [], portas: [], referencia: [
      { tipo: 'linha', layer: 'A-PAREDE', pts: [[1, 1], [20, 1]] },          // sai pela direita
      { tipo: 'linha', layer: 'A-PAREDE', pts: [[-5, 2], [30, 2]] },         // atravessa a planta
      { tipo: 'poli', layer: 'A-PAREDE', fechada: true, pts: [[8, 3], [12, 3], [12, 4], [8, 4]] }, // metade fora
      { tipo: 'linha', layer: 'A-PAREDE', pts: [[40, 1], [50, 1]] },         // toda fora
      { tipo: 'linha', layer: 'A-PAREDE', pts: [[1, 4], [2, 4]] },           // toda dentro
    ] };
    const r = recortarArquitetura(arq, [0, 0, 10, 5]).referencia;
    const fmt = (x) => x.pts.map(p => p.map(v => Math.round(v * 100) / 100).join(',')).join(' ');
    assert.deepStrictEqual(r.map(fmt), ['1,1 10.5,1', '-0.5,2 10.5,2', '10.5,4 8,4 8,3 10.5,3', '1,4 2,4']);
  });
}

// ── 3D focado no objetivo do projeto (09/11/2026): subestação abrigada num DWG com a planta de
// situação de OUTRO projeto colada ao lado (estacionamento, luminárias) — tudo sintético ──
{
  const { montarCenasPorPlanta } = require('./modelosPorPlanta');
  const EQ = require('./equipamentos3d');
  const ret = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const linha = (layer, a, b) => ({ tipo: 'linha', layer, pts: [a, b] });
  const contornoLinhas = (layer, [x0, y0, x1, y1]) => [linha(layer, [x0, y0], [x1, y0]), linha(layer, [x1, y0], [x1, y1]), linha(layer, [x1, y1], [x0, y1]), linha(layer, [x0, y1], [x0, y0])];
  const ABRIGO = [105, 3, 107.5, 8.25]; // 2,50 × 5,25 m
  // desenho: situação (0..60 × 0..40: prédio, estacionamento, base em PDF) e a SE (100..115 × 0..12)
  function arqDuasPlantas() {
    const referencia = [
      ...contornoLinhas('A-PAREDE', [5, 5, 25, 20]), ...contornoLinhas('A-PAREDE', [30, 5, 55, 35]),
      ...contornoLinhas('PDF_ARQ-PIS-VT1', [2, 22, 28, 38]), linha('PDF_ARQ-PIS-VT1', [2, 30], [28, 30]),
      // planta da SE: o desenho dela (paredes em layer "0", o transformador desenhado, a malha)
      ...contornoLinhas('0', ABRIGO), ...contornoLinhas('0', [105.6, 6.5, 106.8, 7.5]), linha('0', [104, 2], [109, 2]),
    ];
    return {
      referencia, portas: [], notas: [], preenchimentos: [], simbolosDaLegenda: [], rotulos: [],
      ambientes: [
        { nome: 'ESTACIONAMENTO', poligono: ret(2, 22, 28, 38), area_m2: 416, perimetro_m: 84, layer: 'PDF_ARQ-PIS-VT1' },
        { nome: 'LOJA', poligono: ret(5, 5, 25, 20), area_m2: 300, perimetro_m: 70 },
        { nome: 'GALPÃO', poligono: ret(30, 5, 55, 35), area_m2: 750, perimetro_m: 110 },
      ],
      extensao: { min: [0, 0], max: [115, 40] },
      classificacao: { regioes: [{ tipo: 'planta', caixa: [0, 0, 60, 40], titulo: 'PLANTA DE SITUAÇÃO' }, { tipo: 'planta', caixa: [100, 0, 115, 12], titulo: 'PLANTA BAIXA SUBESTAÇÃO' }] },
    };
  }
  // pontos "do projeto" da situação (os postes do estacionamento, da base em PDF) — não podem entrar
  const dispositivosReais = [
    { simbolo: 'HM-ILU-POSTE', x: 10, y: 30, layer: 'PDF_IFC-Luminária-Contorno' }, { simbolo: 'HM-ILU-POSTE', x: 20, y: 30, layer: 'PDF_IFC-Luminária-Contorno' },
    { simbolo: 'HM-ILU-LUMINARIA', x: 40, y: 20 },
  ];
  const objetivo = () => ({
    disciplina: 'media_tensao', tipo: 'subestacao_abrigada', titulo: 'Subestação abrigada 150 kVA', confianca: 0.9, evidencias: [],
    vistas: [
      { id: 'v-sit', caixa: [0, 0, 60, 40], tipo: 'situacao', titulo: 'Planta de situação', papel: 'contexto', motivo: 'base de outro projeto' },
      { id: 'v-se', caixa: [100, 0, 115, 12], tipo: 'planta', titulo: 'Planta baixa da subestação', papel: 'principal', motivo: 'abrigo e equipamentos' },
    ],
    camadasDeContexto: ['PDF_ARQ-PIS-VT1', 'PDF_IFC-Luminária-Contorno'],
    componentes: [
      { id: 'c-trafo', tipo: 'transformador', descricao: 'Transformador trifásico a óleo', item: 11, quantidade: 1, unidade: 'un', especificacao: '150 kVA, 13.800 V - 380/220 V, isolamento a óleo', posicoes: [{ x: 106.2, y: 7, vista: 'v-se' }], fontes: ['relacao', 'balao'] },
      { id: 'c-secc', tipo: 'chave_seccionadora', descricao: 'Chave seccionadora tripolar 15 kV 400 A', item: 2, quantidade: 1, unidade: 'un', especificacao: { tensao_kv: 15, corrente_a: 400 }, posicoes: [{ x: 105.3, y: 6.5, vista: 'v-se' }], fontes: ['relacao', 'layer'] },
      { id: 'c-tapete', tipo: 'tapete_borracha', descricao: 'Tapete de borracha isolante', item: 28, quantidade: 1, unidade: 'un', especificacao: '1000x1000 mm, classe 2', posicoes: [{ x: 106.9, y: 4.5, vista: 'v-se' }], fontes: ['legenda'] },
      { id: 'c-porta', tipo: 'porta', descricao: 'Porta metálica', item: 18, quantidade: 1, unidade: 'un', especificacao: '2,10x1,20 m', posicoes: [{ x: 105, y: 4.6, vista: 'v-se' }] },
      { id: 'c-ext', tipo: 'extintor', descricao: 'Extintor CO2 6 kg', item: 17, quantidade: 1, unidade: 'un', especificacao: { altura_m: 1.5 }, posicoes: [], fontes: ['relacao'], conferir: true },
      { id: 'c-poste', tipo: 'poste', descricao: 'Poste DT 11 m/300 daN', item: 1, quantidade: 1, unidade: 'un', posicoes: [] },
      { id: 'c-pr', tipo: 'para_raios', descricao: 'Para-raios 12 kV 10 kA', item: 4, quantidade: 3, unidade: 'pç', posicoes: [] },
      { id: 'c-haste', tipo: 'haste', descricao: 'Haste cobreada 5/8 pol. × 2,40 m', item: 30, quantidade: 4, unidade: 'un', posicoes: [] },
      { id: 'c-rele', tipo: 'rele', descricao: 'Relé de proteção 50/51', item: 9, quantidade: 1, unidade: 'un', posicoes: [] },
      // posição numa vista de contexto: não vale para o abrigo
      { id: 'c-lum', tipo: 'luminaria', descricao: 'Luminária do estacionamento', item: 99, quantidade: 1, unidade: 'un', posicoes: [{ x: 10, y: 30, vista: 'v-sit' }] },
    ],
    dados: { potencia_kva: 150, tensao_primaria_kv: 13.8, tensao_secundaria_v: 380 },
    abrigo: { vista: 'v-se', contorno: ret(...ABRIGO), largura_m: 2.5, comprimento_m: 5.25, area_m2: 13.13, compartimentos: [], portas: [] },
    avisos: ['Medição em BT pela distribuidora [CONFERIR].'],
  });
  const noDesenho = (c, x, y) => [x + c.origem[0], y + c.origem[1]];
  const r = montarCenasPorPlanta(arqDuasPlantas(), { dispositivosReais, objetivo: objetivo(), titulo: 'SE' });
  const cena = r.cenas[0];
  const tipoDe = (id) => cena.dispositivos.find(t => t.componente === id);
  const itemNoDesenho = (id, k = 0) => { const it = tipoDe(id).itens[k]; return [...noDesenho(cena, it[0], it[1]), it[2]]; };
  const ficha = (id) => cena.componentes.find(c => c.id === id);
  const noAbrigo = ([x, y]) => x >= ABRIGO[0] && x <= ABRIGO[2] && y >= ABRIGO[1] && y <= ABRIGO[3];

  caso('OBJ-01 com objetivo: uma cena só, a da subestação; a planta de situação (contexto) não vira cena', () => {
    assert.strictEqual(r.cenas.length, 1);
    assert.deepStrictEqual(cena.objetivoInfo, { disciplina: 'media_tensao', tipo: 'subestacao_abrigada', titulo: 'Subestação abrigada 150 kVA', vistaPrincipal: 'v-se', componentes: 9, semPosicao: 5 });
    assert.ok(cena.plantaInfo && cena.plantaInfo.origem === 'objetivo' && /Subestação abrigada/.test(cena.plantaInfo.nome), JSON.stringify(cena.plantaInfo));
    assert.ok(!cena.ambientes.some(a => /ESTACIONAMENTO|LOJA|GALP/.test(a.nome)), cena.ambientes.map(a => a.nome).join());
  });

  caso('OBJ-02 nenhuma parede nem ponto da situação: paredes só no contorno do abrigo, peças só do objetivo', () => {
    for (const w of cena.paredes) {
      for (const [x, y] of [noDesenho(cena, w[0], w[1]), noDesenho(cena, w[2], w[3])]) assert.ok(x >= ABRIGO[0] - 0.2 && x <= ABRIGO[2] + 0.2 && y >= ABRIGO[1] - 0.2 && y <= ABRIGO[3] + 0.2, `parede fora do abrigo: ${x},${y}`);
    }
    // o transformador desenhado (layer "0" dentro do abrigo) não subiu como parede: 5 trechos (vão da porta) + a verga
    assert.ok(cena.paredes.length <= 6, `${cena.paredes.length} paredes`);
    assert.ok(cena.dispositivos.every(t => t.componente), cena.dispositivos.map(t => t.simbolo).join());
    assert.ok(!cena.dispositivos.some(t => t.simbolo === 'HM-ILU-POSTE' || t.componente === 'c-lum'), 'luminária/poste da situação no 3D');
    assert.ok(!cena.avisos.some(a => /Pontos lidos dos símbolos/.test(a)), 'leu pontos do desenho');
    assert.ok(cena.avisos.some(a => /focado no objetivo/.test(a)) && cena.avisos.includes('Medição em BT pela distribuidora [CONFERIR].'));
    assert.ok(!cena.instalacao && !cena.infra.length, 'instalação ou infraestrutura estimada na SE');
  });

  caso('OBJ-03 abrigo com as medidas do contorno, pé-direito típico [CONFERIR] e a porta no vão da parede', () => {
    assert.deepStrictEqual(cena.numeros.abrigo, { largura_m: 2.5, comprimento_m: 5.25, area_m2: 13.13, pe_direito_m: 3, pe_direito_do_projeto: false });
    assert.strictEqual(cena.peDireito, 3);
    assert.ok(cena.avisos.some(a => /Pé-direito do abrigo não informado.*3,00 m.*\[CONFERIR\]/.test(a)));
    assert.strictEqual(cena.portas.length, 1);
    assert.strictEqual(cena.portas[0].largura, 1.2); // "2,10x1,20 m": a menor é a largura
    const [px, py] = noDesenho(cena, ...cena.portas[0].meio);
    assert.ok(Math.abs(px - 105) < 0.01 && Math.abs(py - 4.6) < 0.01, `${px},${py}`);
    // nenhuma parede cheia (do piso) atravessa o vão da porta
    assert.ok(!cena.paredes.filter(w => w[5] === 0).some(w => { const [ax, ay] = noDesenho(cena, w[0], w[1]), [bx, by] = noDesenho(cena, w[2], w[3]); return Math.abs(ax - 105) < 0.01 && Math.abs(bx - 105) < 0.01 && Math.min(ay, by) < 4.5 && Math.max(ay, by) > 4.7; }));
    assert.strictEqual(cena.numeros.area_externa_m2, 0, 'pátio não conta como área');
    assert.strictEqual(cena.numeros.area_interna_m2, 13.13);
  });

  caso('OBJ-04 transformador, chave e tapete nas posições do projeto, com forma e tamanho da biblioteca', () => {
    const tr = tipoDe('c-trafo');
    assert.deepStrictEqual([tr.forma, tr.montagem, tr.tam], ['transformador', 'piso', [1.3, 0.9, 1.4]]); // 150 kVA lido no TEXTO da especificação
    assert.strictEqual(tr.cor, EQ.EQUIPAMENTOS.transformador.cor);
    const [tx, ty, tz] = itemNoDesenho('c-trafo');
    assert.ok(perto(tx, 106.2) && perto(ty, 7) && tz === 0, `${tx},${ty},${tz}`);
    const [sx, sy, sz] = itemNoDesenho('c-secc');
    assert.ok(perto(sx, 105 + 0.075 + 0.01, 0.03) && perto(sy, 6.5, 0.05) && perto(sz, 2.2), `chave ${sx},${sy},${sz}`);
    assert.strictEqual(tipoDe('c-secc').montagem, 'parede');
    const tp = tipoDe('c-tapete');
    assert.deepStrictEqual([tp.forma, tp.montagem, tp.tam], ['tapete', 'piso', [1, 1, 0.012]]);
    const [ax, ay] = itemNoDesenho('c-tapete');
    assert.ok(perto(ax, 106.9) && perto(ay, 4.5));
    // mais kVA, transformador maior
    assert.ok(EQ.tamanhoDe(EQ.equipamentoDe({ tipo: 'transformador' }), '300 kVA')[0] > 1.6);
  });

  caso('OBJ-05 componente sem posição: lugar típico do tipo ou pátio, sempre "posição a conferir"', () => {
    assert.deepStrictEqual(['c-trafo', 'c-secc', 'c-tapete'].map(id => [ficha(id).posicao, ficha(id).posicaoAConferir]), [['desenho', false], ['desenho', false], ['desenho', false]]);
    for (const id of ['c-ext', 'c-poste', 'c-pr', 'c-haste', 'c-rele']) assert.ok(ficha(id).posicaoAConferir, id);
    // poste fora do abrigo, a 3 m da parede; para-raios no poste (3 peças, 0,90 m abaixo do topo de 11 m)
    const [qx, qy] = itemNoDesenho('c-poste');
    assert.ok(!noAbrigo([qx, qy]), 'poste dentro do abrigo');
    assert.strictEqual(tipoDe('c-poste').tam[2], 11);
    assert.strictEqual(tipoDe('c-pr').itens.length, 3);
    for (let k = 0; k < 3; k++) { const [x, y, z] = itemNoDesenho('c-pr', k); assert.ok(perto(z, 10.1) && Math.hypot(x - qx, y - qy) < 0.9, `para-raios ${x},${y},${z}`); }
    // extintor por dentro, junto da porta, na parede a 1,50 m (a especificação diz)
    const [ex, ey, ez] = itemNoDesenho('c-ext');
    assert.ok(ex > 105 && ex < 105.3 && Math.abs(ey - 4.6) < 1.3 && perto(ez, 1.5), `extintor ${ex},${ey},${ez}`);
    // 4 hastes, nos cantos do abrigo, por fora
    assert.strictEqual(tipoDe('c-haste').itens.length, 4);
    for (let k = 0; k < 4; k++) assert.ok(!noAbrigo(itemNoDesenho('c-haste', k)), `haste ${k} dentro`);
    // relé sem lugar típico: no pátio ao lado
    assert.strictEqual(ficha('c-rele').posicao, 'patio');
    assert.ok(!noAbrigo(itemNoDesenho('c-rele')));
    assert.ok(cena.ambientes.some(a => /PÁTIO — COMPONENTES SEM POSIÇÃO/.test(a.nome)));
    // (o poste tem o aviso próprio; a luminária com posição só na situação fica fora, com aviso)
    assert.ok(cena.avisos.some(a => /4 componente\(s\) sem posição na planta.*Relé de proteção.*\[CONFERIR\]/.test(a)), cena.avisos.join(' | '));
    assert.ok(cena.avisos.some(a => /posição só em outra vista.*Luminária do estacionamento/.test(a)));
  });

  caso('OBJ-06 ficha do componente na cena: item, descrição, especificação (texto ou objeto) e fontes', () => {
    const f = ficha('c-trafo');
    assert.deepStrictEqual([f.item, f.descricao, f.especificacaoTexto, f.fontes], [11, 'Transformador trifásico a óleo', '150 kVA, 13.800 V - 380/220 V, isolamento a óleo', ['relacao', 'balao']]);
    assert.deepStrictEqual(ficha('c-secc').especificacao, { tensao_kv: 15, corrente_a: 400 });
    assert.ok(ficha('c-ext').conferir);
    assert.ok(!ficha('c-porta'), 'porta é o vão, não uma peça');
    // a página leva os componentes (o visualizador abre a ficha no clique)
    const html = gerarHtml(r.cenas);
    assert.ok(html.includes('"componentes":[') && html.includes('"c-trafo"') && html.includes('"objetivoInfo"'));
  });

  caso('OBJ-07 sem objetivo, tudo como antes: as plantas do desenho e os pontos do projeto', () => {
    const antes = montarCenasPorPlanta(arqDuasPlantas(), { dispositivosReais, data: 'x' });
    const igual = montarCenasPorPlanta(arqDuasPlantas(), { dispositivosReais, data: 'x', objetivo: null });
    assert.strictEqual(JSON.stringify(antes), JSON.stringify(igual));
    assert.ok(antes.cenas.some(c => c.dispositivos.some(t => t.simbolo === 'HM-ILU-POSTE')));
    assert.ok(antes.cenas.every(c => !c.objetivoInfo && !c.componentes));
  });

  caso('OBJ-08 objetivo sem abrigo (elétrica): só a vista principal vira cena, sem as camadas de contexto', () => {
    const o = objetivo();
    delete o.abrigo;
    o.disciplina = 'eletrica'; o.tipo = null;
    o.vistas = [{ id: 'v-sit', caixa: [0, 0, 60, 40], papel: 'principal', titulo: 'Térreo' }, { id: 'v-se', caixa: [100, 0, 115, 12], papel: 'apoio', titulo: 'Detalhe' }];
    o.componentes = [{ id: 'q1', tipo: 'qgbt', descricao: 'QGBT', item: 5, quantidade: 1, unidade: 'un', posicoes: [{ x: 24.8, y: 10, vista: 'v-sit' }] }];
    const rr = montarCenasPorPlanta(arqDuasPlantas(), { dispositivosReais, objetivo: o });
    assert.strictEqual(rr.cenas.length, 1);
    const c = rr.cenas[0];
    assert.ok(!c.ambientes.some(a => a.nome === 'ESTACIONAMENTO'), 'ambiente da camada de contexto');
    assert.ok(!c.dispositivos.some(t => t.simbolo === 'HM-ILU-POSTE'), 'ponto da camada de contexto');
    assert.ok(c.dispositivos.some(t => t.simbolo === 'HM-ILU-LUMINARIA'), 'ponto do projeto (fora das camadas de contexto) sumiu');
    assert.ok(c.dispositivos.some(t => t.componente === 'q1' && t.forma === 'quadro'));
    assert.strictEqual(c.objetivoInfo.vistaPrincipal, 'v-sit');
    assert.strictEqual(c.componentes[0].item, 5);
  });

  caso('OBJ-09 biblioteca: toda forma de equipamento tem desenho no visualizador; medidas lidas do texto', () => {
    for (const f of EQ.FORMAS_EQUIPAMENTO) assert.ok(formasDoApp.has(f), `forma ${f} sem desenho em visualizador3d/app.js`);
    for (const [s, e] of Object.entries(EQ.ESPEC_EQUIPAMENTOS)) assert.deepStrictEqual(ESPEC[s], e, s);
    const eqDe = (tipo) => EQ.equipamentoDe({ tipo });
    assert.deepStrictEqual(EQ.tamanhoDe(eqDe('veneziana'), 'Veneziana 500x1000 mm').slice(0, 2), [1, 0.5]);
    assert.deepStrictEqual(EQ.tamanhoDe(eqDe('canaleta'), 'canaleta 30x30 cm'), [1, 0.3, 0.3]);
    assert.strictEqual(EQ.larguraDaPorta('porta 2,10x1,20 m'), 1.2);
    assert.strictEqual(EQ.medidasDaEspecificacao('1.000 kVA, 13.800 V').kva, 1000);
    assert.strictEqual(eqDe('trafo').chave, 'transformador');
    assert.strictEqual(EQ.equipamentoDe({ tipo: 'coisa_nova' }).forma, 'caixa');
  });

  caso('OBJ-11 desenho em escala dobrada (fator pelas cotas): abrigo em metros reais, uma porta dupla, trafo sem duplicar', () => {
    // a SE desenhada ao dobro: 5 × 10,5 unidades = 2,50 × 5,25 m (fator 0,5 lido das cotas)
    const AB2 = [200, 0, 205, 10.5];
    const arq2 = {
      referencia: [...contornoLinhas('0', AB2)], portas: [], notas: [], preenchimentos: [], simbolosDaLegenda: [], rotulos: [], ambientes: [],
      extensao: { min: [195, -2], max: [210, 12] },
      classificacao: { regioes: [{ tipo: 'planta', caixa: [195, -2, 210, 12], titulo: 'PLANTA BAIXA SUBESTAÇÃO' }] },
    };
    const obj = {
      disciplina: 'media_tensao', tipo: 'subestacao_abrigada', titulo: 'SE dobrada', confianca: 0.9, evidencias: [],
      vistas: [{ id: 'v', caixa: [195, -2, 210, 12], tipo: 'planta', titulo: 'Planta baixa', papel: 'principal', escala: { fator: 0.5, fonte: 'cotas' } }],
      camadasDeContexto: [],
      componentes: [
        // a mesma peça achada pelo balão e pelo bloco: quantidade 1, fica o bloco
        { id: 't', tipo: 'transformador', descricao: 'Transformador 150 kVA', quantidade: 1, unidade: 'un', especificacao: '150 kVA',
          posicoes: [{ x: 202, y: 8, vista: 'v', origem: 'balao' }, { x: 203, y: 9, vista: 'v', origem: 'bloco' }] },
        // a porta da relação de materiais e a porta lida no desenho são a mesma
        { id: 'p', tipo: 'porta', descricao: 'Porta metálica de 2 folhas', quantidade: 1, unidade: 'un', especificacao: '2,10x1,20 m', posicoes: [{ x: 200, y: 3, vista: 'v' }] },
      ],
      dados: {},
      abrigo: { vista: 'v', contorno: ret(...AB2), origem: [200, 0], escala: { fator: 0.5, fonte: 'cotas' }, largura_m: 2.5, comprimento_m: 5.25, area_m2: 13.13, compartimentos: [],
        portas: [{ x: 200, y: 3, largura_m: 1.2, folhas: 2 }] },
      avisos: [],
    };
    const c = montarCenasPorPlanta(arq2, { dispositivosReais: [], objetivo: obj, titulo: 'SE' }).cenas[0];
    const nd = (x, y) => [x + c.origem[0], y + c.origem[1]];
    // paredes no contorno em metros: 200..202,5 × 0..5,25
    for (const w of c.paredes) for (const [x, y] of [nd(w[0], w[1]), nd(w[2], w[3])]) assert.ok(x >= 199.8 && x <= 202.7 && y >= -0.2 && y <= 5.45, `parede fora da escala real: ${x},${y}`);
    assert.strictEqual(c.portas.length, 1, `${c.portas.length} portas`);
    assert.ok(c.portas[0].dupla, 'porta de 2 folhas');
    assert.ok(perto(c.portas[0].largura, 1.2));
    const [py] = [nd(...c.portas[0].meio)[1]];
    assert.ok(perto(py, 1.5, 0.05), `porta em y=${py} (3 unidades × 0,5)`);
    const tr = c.dispositivos.find(t => t.componente === 't');
    assert.strictEqual(tr.itens.length, 1, 'transformador duplicado (balão + bloco)');
    const [tx, ty] = nd(tr.itens[0][0], tr.itens[0][1]);
    assert.ok(perto(tx, 201.5) && perto(ty, 4.5), `trafo em ${tx},${ty} (o bloco, na escala)`);
  });
}

// ficha do equipamento no visualizador (o ESM do 3D, carregado aqui sem o navegador)
{
  const avisoOriginal = process.emitWarning;
  process.emitWarning = () => {};
  import('./visualizador3d/interativo.js').then(({ htmlFichaComponente }) => {
    process.emitWarning = avisoOriginal;
    caso('OBJ-10 ficha: item, quantidade, especificação, fonte, [CONFERIR] e posição a conferir; texto escapado', () => {
      const h = htmlFichaComponente({ id: 'c1', descricao: 'Transformador <b>150</b>', item: 11, quantidade: 1, unidade: 'un', especificacao: { kva: 150, tensao_kv: 13.8 }, especificacaoTexto: '150 kVA, 13.800 V', fontes: ['relacao', 'balao', 'layer: SUBEST'], conferir: true, posicao: 'patio', posicaoAConferir: true, dimensoes_m: [1.3, 0.9, 1.4] });
      for (const t of ['nº 11', '1 un', '150 kVA, 13.800 V', 'Potência</th><td>150 kVA', 'relação de materiais · balão na planta · layer do desenho: SUBEST', '[CONFERIR]', 'a conferir', 'ilustrativas', 'Transformador &lt;b&gt;150']) assert.ok(h.includes(t), `${t} — ${h}`);
      assert.ok(!h.includes('<b>150</b>'));
      const sem = htmlFichaComponente({ id: 'c2', descricao: 'Tapete', posicao: 'desenho', posicaoAConferir: false });
      assert.ok(!/CONFERIR|a conferir|Item da relação/.test(sem), sem);
    });
  }).catch(e => { process.emitWarning = avisoOriginal; console.error(`  FALHOU ficha do equipamento: ${e.message}`); process.exitCode = 1; });
}

console.log(`3d: ${ok} casos ok`);
