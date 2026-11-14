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

// ── 2.40: malhas juntas ─────────────────────────────────────────────────────
// Cena SINTÉTICA grande montada aqui (sem o gerador): grade de salas, 20 tipos de ponto em 5 peças (variações de
// tomada, interruptor, luminária, detector e ponto de rede, cada uma com a sua cor) e 200 grupos de infraestrutura
// (eletroduto com descidas, eletrocalha, leito, fiação e caminhos sugeridos). Antes: uma chamada de desenho por tipo
// e até 6 por grupo de infraestrutura (mais de 1.000 por quadro); agora poucas dezenas.
function tomDe(hex, k) {
  if (!k) return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = [0, 0.38, -0.3, 0.6, -0.45][k % 5];
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))).map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
function cenaSinteticaGrande({ nx = 8, ny = 5, L = 5, P = 4, grupos = 200 } = {}) {
  const PD = 2.8, W = nx * L, H = ny * P, x0 = -W / 2, y0 = -H / 2;
  const ambientes = [], paredes = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const ax = x0 + i * L, ay = y0 + j * P, k = ambientes.length;
    ambientes.push({ i: k, nome: `SALA ${String(k + 1).padStart(2, '0')}`, tipo: 'sala', poligono: [[ax, ay], [ax + L, ay], [ax + L, ay + P], [ax, ay + P]], centro: [ax + L / 2, ay + P / 2], area_m2: L * P, perimetro_m: 2 * (L + P) });
  }
  for (let i = 0; i <= nx; i++) paredes.push([x0 + i * L, y0, x0 + i * L, y0 + H, 0.15, 0, PD]);
  for (let j = 0; j <= ny; j++) paredes.push([x0, y0 + j * P, x0 + W, y0 + j * P, 0.15, 0, PD]);
  const disciplinas = { eletrica: { rotulo: 'Elétrica', cor: '#f2c94c' }, iluminacao: { rotulo: 'Iluminação', cor: '#ffe9a8' }, incendio: { rotulo: 'Incêndio', cor: '#eb5757' }, cabeamento: { rotulo: 'Cabeamento', cor: '#56ccf2' } };
  const TIPOS = [
    ['eletrica', 'tomada', 'parede', [0.1, 0.16, 0.03], ['Tomada 2P+T 10 A', 'Tomada 2P+T 20 A', 'Tomada bancada', 'Tomada estabilizada', 'Tomada uso geral', 'Tomada ar-condicionado']],
    ['eletrica', 'interruptor', 'parede', [0.1, 0.16, 0.03], ['Interruptor simples', 'Interruptor paralelo', 'Interruptor bipolar']],
    ['iluminacao', 'luminaria', 'teto', [0.62, 0.62, 0.06], ['Luminária LED 40 W', 'Luminária LED 32 W', 'Painel 60×60', 'Luminária embutir', 'Luminária sobrepor']],
    ['incendio', 'detector', 'teto', [0.16, 0.16, 0.07], ['Detector de fumaça óptico', 'Detector de fumaça iônico', 'Detector de temperatura']],
    ['cabeamento', 'rede', 'parede', [0.1, 0.16, 0.03], ['Ponto de rede Cat 6', 'Ponto de rede Cat 6A', 'Ponto de voz']],
  ];
  const dispositivos = [], porDisc = {};
  let id = 0;
  for (const [disc, forma, montagem, tam, rotulos] of TIPOS) rotulos.forEach((rotulo, r) => {
    const k = (porDisc[disc] = (porDisc[disc] ?? -1) + 1);
    const itens = [];
    for (const a of ambientes) {
      if ((a.i + r) % 2) continue;
      const [ax, ay] = a.poligono[0], f = (r + 1) / (rotulos.length + 1);
      itens.push(montagem === 'teto' ? [ax + L * f, ay + P * 0.5, PD, 0, 0, a.i, `X-${++id}`, null, null, null] : [ax + L * f, ay + 0.09, 0.3, 0, 1, a.i, `X-${++id}`, null, null, null]);
    }
    dispositivos.push({ simbolo: `HM-SINT-${forma.toUpperCase()}`, disciplina: disc, rotulo, forma, tam, montagem, altura: montagem === 'teto' ? 'no teto' : 'h = 0,30 m', cor: tomDe(disciplinas[disc].cor, k), itens });
  });
  const TIPOS_INFRA = [
    { tipo: 'eletroduto', forma: 'tubo', secao: [0.025, 0.025], cor: '#f2994a', rotulo: 'Eletroduto' },
    { tipo: 'eletrocalha', forma: 'caixa', secao: [0.1, 0.05], cor: '#9b9b9b', rotulo: 'Eletrocalha' },
    { tipo: 'leito', forma: 'caixa', secao: [0.3, 0.06], cor: '#6fcf97', rotulo: 'Leito para cabos' },
    { tipo: 'fiacao', forma: 'linha', secao: [0.012, 0.012], cor: '#bb6bd9', rotulo: 'Fiação / cabos' },
  ];
  const discs = Object.keys(disciplinas), infra = [];
  for (let g = 0; g < grupos; g++) {
    const T = TIPOS_INFRA[g % 7 === 0 ? 1 : g % 11 === 0 ? 2 : g % 13 === 0 ? 3 : 0];
    const sugerido = g % 17 === 5;
    const z = Math.round((PD - 0.15 - (g % 5) * 0.04) * 100) / 100;
    const segs = [], desc = [];
    let x = x0 + (g % nx) * L + 0.4 + (g % 4) * 0.12, y = y0 + (g % ny) * P + 0.5 + (g % 3) * 0.15;
    for (let s = 0; s < 12; s++) {
      const x2 = s % 2 ? x : Math.min(x0 + W - 0.3, x + 1.6 + (s % 3) * 0.4), y2 = s % 2 ? Math.min(y0 + H - 0.3, y + 0.9) : y;
      segs.push(x, y, x2, y2);
      if (s % 3 === 2 && T.forma !== 'linha') desc.push(x2, y2, 1.1, z);
      x = x2; y = y2;
    }
    infra.push({ disciplina: discs[g % discs.length], tipo: T.tipo, tipoInfra: sugerido ? 'sugerido' : T.tipo, rotulo: sugerido ? 'Eletroduto sugerido' : T.rotulo, material: `grupo-${g}`, forma: sugerido ? 'tubo' : T.forma,
      secao: T.secao, z, layers: [], cor: sugerido ? '#9fd8ff' : T.cor, sugerido: sugerido || undefined, origem_medida: sugerido ? 'sugerido' : 'layer', comprimento_m: 12, segmentos: segs, descidas: desc, descidas_m: 0 });
  }
  return {
    titulo: 'Modelo 3D — malhas juntas (sintético)', cliente: 'Cliente sintético', obra: '', data: '14/11/2026', limites: [x0 - 1, y0 - 1, x0 + W + 1, y0 + H + 1], peDireito: PD, alturaPorta: 2.1,
    ambientes, tiposAmbiente: { sala: { cor: '#d8cfbf', rotulo: 'Sala' }, outros: { cor: '#c4ccd4', rotulo: 'Outros' } }, paredes, muretas: [], guardas: [], vidros: [], pilares: [], folhas: [],
    dispositivos, disciplinas, infra, aviso: 'Cena sintética.', avisos: [],
    numeros: { area_interna_m2: W * H, ambientes: ambientes.length, area_externa_m2: 0, ambientes_externos: 0, dimensoes_m: [W, H], pe_direito_m: PD, paredes_m: 0, paredes_area_m2: 0, portas: 0, janelas: 0, pilares: 0,
      dispositivos: dispositivos.map(t => ({ rotulo: t.rotulo, quantidade: t.itens.length, unidade: 'un' })), por_ambiente: ambientes.map(a => ({ nome: a.nome, tipo: a.tipo, area_m2: a.area_m2, perimetro_m: a.perimetro_m })) },
  };
}

caso('malhas juntas (2.40): poucas chamadas de desenho com muita infraestrutura e tipos da mesma peça; camadas, dica, corte, busca e medição seguem', async () => {
  const cena = cenaSinteticaGrande();
  const html = require(path.join(CAD, 'visualizador3d.js')).gerarHtml(cena);
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const erros = [];
    const page = await browser.newPage();
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto('about:blank');
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForSelector('body.pronto', { timeout: 60000 });
    assert.deepStrictEqual(erros, [], erros.join(' | '));
    const H = (fn, ...a) => page.evaluate(fn, ...a);

    // os 20 tipos em 5 peças; os 200 grupos em poucas malhas e uma linha
    const m = await H(() => window.HM3D.malhas());
    assert.strictEqual(m.tipos, 20);
    assert.strictEqual(m.dispositivos, 5, JSON.stringify(m));
    assert.strictEqual(m.gruposInfra, 200);
    assert.ok(m.infra <= 8, JSON.stringify(m));
    const chamadas = () => H(() => { const h = window.HM3D; h.render(); return h.renderer.info.render.calls; });
    await H(() => window.HM3D.vista3d());
    const calls = await chamadas();
    // antes: ≥ 1 por tipo + ≥ 2 por grupo de infraestrutura (mais de 400 aqui); agora poucas dezenas
    assert.ok(calls <= 40, `chamadas de desenho: ${calls}`);
    assert.ok(calls * 10 < m.tipos + 2 * m.gruposInfra, `chamadas de desenho: ${calls}`);

    // legenda: esconde um tipo (os outros da mesma peça continuam) e mostra de novo
    const legDe = (rotulo) => cena.dispositivos.findIndex(t => t.rotulo === rotulo);
    const clicarLeg = (i) => page.evaluate((k) => document.querySelector(`#legenda .leg[data-i="${k}"]`).click(), i);
    await clicarLeg(legDe('Tomada 2P+T 20 A'));
    assert.strictEqual(await H(() => window.HM3D.itemAparece('Tomada 2P+T 20 A')), false);
    assert.strictEqual(await H(() => window.HM3D.itemAparece('Tomada 2P+T 10 A')), true);
    await clicarLeg(legDe('Tomada 2P+T 20 A'));
    assert.strictEqual(await H(() => window.HM3D.itemAparece('Tomada 2P+T 20 A')), true);

    // disciplina: o botão desliga os pontos E a infraestrutura dela
    const iCab = cena.infra.findIndex(g => g.disciplina === 'cabeamento' && !g.sugerido);
    const iEle = cena.infra.findIndex(g => g.disciplina === 'eletrica' && !g.sugerido);
    const botaoDisc = () => page.evaluate(() => [...document.querySelectorAll('#disciplinas button')].find(b => /Cabeamento/.test(b.textContent)).click());
    await botaoDisc();
    assert.strictEqual(await H(() => window.HM3D.itemAparece('Ponto de rede Cat 6')), false);
    assert.strictEqual(await H((i) => window.HM3D.infraAparece(i), iCab), false);
    assert.strictEqual(await H((i) => window.HM3D.infraAparece(i), iEle), true);
    await botaoDisc();
    assert.strictEqual(await H((i) => window.HM3D.infraAparece(i), iCab), true);

    // tipo de infraestrutura: desligar o eletroduto tira os grupos dele (e a linha deles), a eletrocalha fica
    const iDuto = cena.infra.findIndex(g => g.tipoInfra === 'eletroduto'), iCalha = cena.infra.findIndex(g => g.tipoInfra === 'eletrocalha');
    const linhasAntes = (await H(() => window.HM3D.malhas())).linhasInfra;
    await H(() => window.HM3D.mostrarTipoInfra('eletroduto', false));
    assert.strictEqual(await H((i) => window.HM3D.infraAparece(i), iDuto), false);
    assert.strictEqual(await H((i) => window.HM3D.infraAparece(i), iCalha), true);
    assert.ok((await H(() => window.HM3D.malhas())).linhasInfra < linhasAntes);
    await H(() => window.HM3D.mostrarTipoInfra('eletroduto', true));
    assert.strictEqual(await H((i) => window.HM3D.infraAparece(i), iDuto), true);
    // destaque do tipo não dá erro e não muda as malhas
    await H(() => { window.HM3D.destacarInfra('eletrocalha'); window.HM3D.render(); window.HM3D.destacarInfra(null); });

    // ponto sob o mouse (grade na tela): de cima, com os pontos escondidos, a dica acha o trecho da eletrocalha;
    // escondido o grupo na legenda, o mesmo lugar não mostra mais esse grupo
    for (let i = 0; i < cena.dispositivos.length; i++) await clicarLeg(i);
    await H(() => window.HM3D.vistaDeCima());
    const g = cena.infra[iCalha];
    const alvo = await H((s, z) => {
      const h = window.HM3D, V = h.camera.position.constructor;
      h.render();
      const v = new V((s[0] + s[2]) / 2, z, -(s[1] + s[3]) / 2).project(h.camera);
      return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight];
    }, g.segmentos.slice(0, 4), g.z);
    assert.ok(await H((p) => window.HM3D.mostrarDica(p[0], p[1]), alvo), 'dica no trecho');
    assert.match(await page.$eval('#dica', el => el.textContent), new RegExp(g.material));
    await page.evaluate((k) => document.querySelector(`#legenda .leg[data-infra="${k}"]`).click(), iCalha);
    await H((p) => window.HM3D.mostrarDica(p[0], p[1]), alvo);
    assert.doesNotMatch(await page.$eval('#dica', el => (el.style.display === 'none' ? '' : el.textContent)), new RegExp(`${g.material}\\b`));
    await page.evaluate((k) => document.querySelector(`#legenda .leg[data-infra="${k}"]`).click(), iCalha);
    for (let i = 0; i < cena.dispositivos.length; i++) await clicarLeg(i);

    // corte das paredes da frente segue no shader (imagem muda com o corte ligado × desligado), sem erro
    await H(() => window.HM3D.vista3d());
    const img = () => H(() => { window.HM3D.render(); return document.querySelector('#tela').toDataURL(); });
    const comCorte = await img();
    await page.click('#b-corte');
    const semCorte = await img();
    assert.notStrictEqual(comCorte, semCorte, 'o corte muda a imagem');
    await page.click('#b-corte');

    // busca: acha a variação certa do tipo (a malha é da peça, o achado é do tipo) e leva a câmera até o item
    await page.type('input[aria-label="Buscar componente no modelo"]', 'tomada bancada');
    await page.keyboard.press('Enter');
    await new Promise(res => setTimeout(res, 1500));
    const it = cena.dispositivos.find(t => t.rotulo === 'Tomada bancada').itens[0];
    const tgt = await H(() => { const t = window.HM3D.controles.target; return [t.x, t.z]; });
    assert.ok(Math.abs(tgt[0] - it[0]) < 0.05 && Math.abs(tgt[1] + it[1]) < 0.05, `alvo ${tgt} × tomada ${it.slice(0, 2)}`);

    // medição: dois cliques no modelo
    await page.evaluate(() => [...document.querySelectorAll('#barra button')].find(b => b.textContent === 'Medir').click());
    await H(() => window.HM3D.vista3d());
    await new Promise(res => setTimeout(res, 300));
    await page.mouse.click(640, 520);
    await page.mouse.click(760, 520);
    assert.match(await page.$eval('#hm-ferr-aviso', el => el.textContent), /Distância: \d+,\d{2} m/);
    assert.deepStrictEqual(erros, [], erros.join(' | '));
    await page.close();
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
