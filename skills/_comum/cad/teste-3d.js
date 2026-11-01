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
  assert.strictEqual(cena.versao, 2);
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

console.log(`3d: ${ok} casos ok`);
