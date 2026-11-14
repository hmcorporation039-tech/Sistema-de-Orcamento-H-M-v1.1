// O 3D de verdade, no Chromium sem janela (WebGL por software, o mesmo da captura do PDF) — versão 2.37.
// Os outros testes conferem a cena (JSON); este abre a PÁGINA e confere que o visualizador roda:
//   - sem erro de JavaScript (shader dos pilares numa geometria só, grade de escolha sob o mouse, formas novas);
//   - as formas próprias da climatização e o pilar com o corte no shader;
//   - buscar componente leva a câmera e mostra o achado; medir dá a distância com dois cliques;
//   - a vista no endereço (#vista=…) abre o modelo daquele ângulo;
//   - a página servida vai comprimida (gzip) quando o navegador aceita.
// Dados SINTÉTICOS. Rodar: node testes/visualizador3dNavegador.test.js (pasta backend).
const assert = require('assert');
const path = require('path');
const zlib = require('zlib');
const M = require('../src/services/modelo3d');
const { enviarComprimido } = require('../src/utils/respostaComprimida');
const { CAD, RAIZ_SKILLS } = require('../src/config/caminhos');
const { DesenhoDxf } = require(path.join(CAD, 'dxf.js'));
const { point3d } = require(path.join(RAIZ_SKILLS, 'node_modules', '@tarikjabiri', 'dxf'));

function dxfComPilar() {
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'A-PORTA', cor: 3 }, { nome: 'E-PILAR', cor: 2 }] });
  const L = (x1, y1, x2, y2) => g.linha(x1, y1, x2, y2, 'A-PAREDE');
  [[0, 0, 8000, 0], [8000, 0, 8000, 5000], [8000, 5000, 0, 5000], [0, 5000, 0, 0],
    [-150, -150, 8150, -150], [8150, -150, 8150, 5150], [8150, 5150, -150, 5150], [-150, 5150, -150, -150],
    [5000, 0, 5000, 1200], [5000, 2000, 5000, 5000], [5150, 0, 5150, 1200], [5150, 2000, 5150, 5000], [5000, 1200, 5150, 1200], [5000, 2000, 5150, 2000]].forEach(l => L(...l));
  g.bloco('PORTA80', (b) => { b.addLine(point3d(0, 0), point3d(800, 0), { layerName: '0' }); b.addArc(point3d(0, 0), 800, 0, 90, { layerName: '0' }); });
  g.dxf.addInsert('PORTA80', point3d(5000, 2000), { layerName: 'A-PORTA', rotationAngle: 180 });
  g.polilinha([[2400, 4500], [2700, 4500], [2700, 4800], [2400, 4800]], { layer: 'E-PILAR', fechada: true });
  g.texto(2500, 2500, 200, 'SALA DE ESTAR', { layer: 'A-TEXTO' });
  g.texto(6500, 2500, 200, 'COZINHA', { layer: 'A-TEXTO' });
  return g.toString().replace(/(\$INSUNITS\r?\n\s*70\r?\n\s*)6/, '$14');
}
const ponto = (simbolo, rotulo, disciplina, x, y, id) => ({ simbolo, rotulo, disciplina, x, y, rotacao: 0, id, ambiente: null });

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('resposta comprimida: gzip quando o navegador aceita, igual ao original; sem gzip, como veio', () => {
  const corpo = 'x'.repeat(20000);
  const fazer = (accept) => {
    const r = { headers: {}, vary: (h) => { r.headers.Vary = h; }, set: (k, v) => { r.headers[k] = v; }, send: (b) => { r.corpo = b; } };
    enviarComprimido({ headers: { 'accept-encoding': accept } }, r, corpo);
    return r;
  };
  const com = fazer('gzip, deflate, br');
  assert.strictEqual(com.headers['Content-Encoding'], 'gzip');
  assert.strictEqual(zlib.gunzipSync(com.corpo).toString(), corpo);
  assert.ok(com.corpo.length < corpo.length / 10);
  const sem = fazer('');
  assert.strictEqual(sem.headers['Content-Encoding'], undefined);
  assert.strictEqual(sem.corpo.toString(), corpo);
});

caso('a página do 3D roda no navegador: formas novas, pilar, busca, medição e vista no endereço, sem erro', async () => {
  const r = await M.gerarNoWorker({
    origemTipo: 'analise', origemId: 1, nomeArquivo: 'teste.dxf', dxf: dxfComPilar(), disciplinas: [], dadosPorDisciplina: {}, semPontos: null, peDireito: 2.8,
    titulo: 'Modelo 3D — teste do navegador', cliente: 'Cliente sintético', obra: '',
    dispositivosReais: [
      ponto('HM-CLIM-FANCOIL', 'Fancoil FC-01', 'climatizacao', 1.5, 1.5, 'FC-01'),
      ponto('HM-CLIM-CONDENSADORA', 'Condensadora CD-01', 'climatizacao', 3.5, 1.0, 'CD-01'),
      ponto('HM-CLIM-CHILLER', 'Chiller CH-01', 'climatizacao', 6.5, 1.0, 'CH-01'),
      ponto('HM-CLIM-EVAPORADORA', 'Evaporadora EV-01', 'climatizacao', 6.5, 4.8, 'EV-01'),
      ponto('HM-CLIM-DIFUSOR', 'Difusor DF-01', 'climatizacao', 2.0, 3.0, 'DF-01'),
      ponto('HM-CLIM-GRELHA', 'Grelha GR-01', 'climatizacao', 3.0, 3.0, 'GR-01'),
      ponto('HM-CLIM-VAV', 'Caixa VAV VAV-01', 'climatizacao', 4.0, 3.5, 'VAV-01'),
      ponto('HM-ELE-TOMADA-BAIXA', 'Tomada baixa', 'eletrica', 0.2, 2.5, 'T-01'),
    ],
  });
  const cena = r.cenas[0];
  assert.ok(cena.pilares.length >= 1, 'o desenho sintético tem um pilar');
  const formas = new Set(cena.dispositivos.map(t => t.forma));
  for (const f of ['fancoil', 'condensadora', 'chiller', 'evaporadora', 'difusor', 'grelha', 'vav']) assert.ok(formas.has(f), `forma ${f}: ${[...formas]}`);
  assert.strictEqual(cena.disciplinas.climatizacao?.cor, require(path.join(RAIZ_SKILLS, '_comum', 'disciplinas.js')).visual('climatizacao').cor);

  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const erros = [];
    const abrir = async (hash = '') => {
      const page = await browser.newPage();
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
      await page.setViewport({ width: 1400, height: 900 });
      // setContent não tem endereço próprio: a vista vai pelo hash antes de o script rodar
      await page.evaluateOnNewDocument((h) => { if (h) history.replaceState(null, '', h); }, hash);
      await page.goto('about:blank');
      await page.setContent(M.paginaDoModelo(r), { waitUntil: 'load' });
      await page.waitForSelector('body.pronto', { timeout: 30000 });
      return page;
    };
    const page = await abrir();
    assert.deepStrictEqual(erros, [], erros.join(' | '));

    // buscar: "fancoil" acha o FC-01; Enter leva a câmera até ele
    await page.type('input[aria-label="Buscar componente no modelo"]', 'fancoil');
    const achados = await page.$$eval('#barra [data-i]', els => els.map(e => e.textContent));
    assert.ok(achados.length === 1 && /Fancoil FC-01/.test(achados[0]), achados.join(' | '));
    await page.keyboard.press('Enter');
    await new Promise(res => setTimeout(res, 1500));
    // o alvo da câmera é o fancoil (coordenadas da cena, já centradas: mundo x = it[0], z = −it[1])
    const fc = cena.dispositivos.find(t => t.forma === 'fancoil').itens[0];
    const alvo = await page.evaluate(() => { const t = window.HM3D.controles.target; return [t.x, t.z]; });
    assert.ok(Math.abs(alvo[0] - fc[0]) < 0.05 && Math.abs(alvo[1] + fc[1]) < 0.05, `alvo ${alvo} × fancoil ${fc.slice(0, 2)}`);
    const aviso = await page.$eval('#hm-ferr-aviso', el => el.textContent);
    assert.match(aviso, /Fancoil FC-01/);

    // passar o mouse pela tela (grade de escolha sob o mouse) não dá erro
    for (const [x, y] of [[700, 450], [500, 500], [900, 400], [650, 520]]) await page.mouse.move(x, y);
    await new Promise(res => setTimeout(res, 300));

    // medir: dois cliques no modelo dão a distância
    const medir = await page.$$eval('#barra button', bs => bs.findIndex(b => b.textContent === 'Medir'));
    assert.ok(medir >= 0, 'botão Medir');
    await page.evaluate((i) => document.querySelectorAll('#barra button')[i].click(), medir);
    await page.evaluate(() => window.HM3D.vista3d());
    await new Promise(res => setTimeout(res, 300));
    await page.mouse.click(640, 520);
    await page.mouse.click(760, 520);
    const medida = await page.$eval('#hm-ferr-aviso', el => el.textContent);
    assert.match(medida, /Distância: \d+,\d{2} m/, medida);
    assert.deepStrictEqual(erros, [], erros.join(' | '));
    await page.close();

    // vista no endereço: abre daquele ângulo (câmera bem acima do centro)
    const p2 = await abrir('#vista=4,30,-2.5,4,0,-2.5');
    const y = await p2.evaluate(() => window.HM3D.camera.position.y);
    assert.ok(y > 25, `câmera em y=${y}`);
    assert.deepStrictEqual(erros, [], erros.join(' | '));
    await p2.close();
  } finally {
    await browser.close();
  }
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`visualizador 3D no navegador: ${ok}/${casos.length} casos ok`);
  await require('../src/config/database').end().catch(() => {});
})();
