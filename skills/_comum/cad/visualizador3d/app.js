// Visualizador do modelo 3D ilustrativo (página que o CLIENTE abre, sem internet).
// Fonte ESM: `npm run build:3d` (pasta skills) gera app.bundle.js com o three.js
// embutido, que ../visualizador3d.js insere no HTML junto com a cena (window.CENA).
// Planta (x, y) em metros → mundo three.js (x, altura, −y).
//
// Dois modos de câmera:
//   - VISTA GERAL: OrbitControls (girar, zoom em direção ao cursor, mover) e o
//     CORTE, que rebaixa as paredes da frente (lado da câmera) para enxergar o
//     interior sem precisar esconder todas;
//   - DENTRO DO AMBIENTE (duplo clique no piso/etiqueta ou "Ir para ambiente"):
//     olhos a 1,60 m, arrastar gira a cabeça, roda/pinça muda a lente (zoom),
//     duplo clique no piso anda até o ponto; etiquetas dos pontos próximos.
// Desempenho: paredes numa geometria só (o corte é feito no shader, sem refazer
// geometria), dispositivos e trechos em InstancedMesh por tipo, e a escala dos
// símbolos pela distância é calculada na GPU.
import {
  WebGLRenderer, Scene, Color, PerspectiveCamera, HemisphereLight, DirectionalLight, AmbientLight,
  BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial, LineSegments,
  Shape, ShapeGeometry, ExtrudeGeometry, PlaneGeometry, BoxGeometry, CylinderGeometry, SphereGeometry,
  InstancedMesh, Object3D, Vector3, Vector2, Raycaster, Group, DoubleSide, SRGBColorSpace, MathUtils,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const CENA = window.CENA;
const $ = (s) => document.querySelector(s);
const br = (v, c = 2) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const PD = CENA.peDireito;
const INFRA = CENA.infra || [];
const ALTURA_OLHOS = 1.6;
// altura a que o corte rebaixa as paredes da frente: acima das tomadas baixas,
// para que elas continuem "na parede", e baixa o bastante para ver o piso
const ALTURA_CORTE = 0.45;

// ── Renderizador ─────────────────────────────────────────────────────────────
const tela = $('#tela');
let renderer;
try {
  renderer = new WebGLRenderer({ canvas: tela, antialias: true, preserveDrawingBuffer: true });
} catch (e) {
  $('#semwebgl').style.display = 'flex';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = SRGBColorSpace;
const cena = new Scene();
cena.background = new Color('#14161b');

const [lx0, ly0, lx1, ly1] = CENA.limites;
const larg = lx1 - lx0, prof = ly1 - ly0;
const diag = Math.hypot(larg, prof);
const W = (x, y, z = 0) => new Vector3(x, z, -y);

const camera = new PerspectiveCamera(45, 1, 0.1, diag * 20 + 50);
const controles = new OrbitControls(camera, tela);
controles.enableDamping = true;
controles.dampingFactor = 0.08;
controles.maxPolarAngle = Math.PI / 2 - 0.02;
controles.minDistance = 0.5;
controles.maxDistance = diag * 4;
controles.autoRotateSpeed = 0.9;
// zoom na direção do cursor: a roda leva até o ambiente que se quer ver
controles.zoomToCursor = true;

cena.add(new HemisphereLight('#ffffff', '#5a5a4e', 1.6));
cena.add(new AmbientLight('#ffffff', 0.6));
const sol = new DirectionalLight('#fff4e0', 1.4);
sol.position.set(diag * 0.6, diag * 0.9, diag * 0.4);
cena.add(sol);

// ── Grupos (camadas liga/desliga) ───────────────────────────────────────────
const grupos = {};
function grupo(k, pai = cena) {
  if (!grupos[k]) { grupos[k] = new Group(); pai.add(grupos[k]); }
  return grupos[k];
}

// terreno
{
  const m = Math.max(4, diag * 0.15);
  const g = new PlaneGeometry(larg + 2 * m, prof + 2 * m);
  const t = new Mesh(g, new MeshStandardMaterial({ color: '#3d4334', roughness: 1 }));
  t.rotation.x = -Math.PI / 2;
  t.position.set((lx0 + lx1) / 2, -0.02, -(ly0 + ly1) / 2);
  grupo('terreno').add(t);
}

// contrapiso neutro sob os ambientes internos: o polígono do ambiente (achado
// pelas paredes em grade de 5 cm) pode não encostar na face da parede, e de
// dentro a fresta mostraria o gramado
{
  const internos = CENA.ambientes.filter(a => a.tipo !== 'externo' && a.poligono.length >= 3);
  if (internos.length) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const a of internos) for (const [x, y] of a.poligono) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const g = new PlaneGeometry(x1 - x0 + 0.4, y1 - y0 + 0.4);
    const m = new Mesh(g, new MeshStandardMaterial({ color: '#8c887e', roughness: 1 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, 0.001, -(y0 + y1) / 2);
    grupo('terreno').add(m);
  }
}

// pisos dos ambientes (o menor por cima: ambientes sobrepostos no desenho)
const pisos = [];
const ordem = [...CENA.ambientes].sort((a, b) => b.area_m2 - a.area_m2);
ordem.forEach((a, k) => {
  if (a.poligono.length < 3) return;
  const s = new Shape(a.poligono.map(([x, y]) => new Vector2(x, y)));
  const g = new ShapeGeometry(s);
  const cor = (CENA.tiposAmbiente[a.tipo] || CENA.tiposAmbiente.outros).cor;
  const mesh = new Mesh(g, new MeshStandardMaterial({ color: cor, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 - k * 0.05, polygonOffsetUnits: -1 - k }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.005 + k * 0.0004;
  mesh.userData = { ambiente: a };
  grupo('ambientes').add(mesh);
  pisos.push(mesh);
});

// ── Corte das paredes da frente (no shader) ─────────────────────────────────
// Cada vértice de parede leva o centro da sua parede (aParede = cx, z0, cz).
// A parede cujo centro fica do lado da câmera, além de uMargem do alvo, é
// rebaixada até ALTURA_CORTE (o topo escuro desce junto e a planta continua
// legível); trecho que começa acima do corte (verga, vidro) some. A passada
// "fantasma" desenha só a parte cortada, quase transparente.
const UC = {
  uAlvo: { value: new Vector3() }, uDir: { value: new Vector2(0, 0) }, uCorte: { value: 0 },
  uAltCorte: { value: ALTURA_CORTE }, uMargem: { value: 0.3 },
};
function comCorte(mat, fantasma = false) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, UC);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 aParede;
uniform vec3 uAlvo; uniform vec2 uDir; uniform float uCorte; uniform float uAltCorte; uniform float uMargem;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  bool frente = uCorte > 0.5 && dot(aParede.xz - uAlvo.xz, uDir) > uMargem;
  ${fantasma
    ? 'if (!frente) transformed = vec3(aParede.x, -50.0, aParede.z);'
    : 'if (frente) { if (aParede.y >= uAltCorte - 0.01) transformed = vec3(aParede.x, -50.0, aParede.z); else transformed.y = min(transformed.y, uAltCorte); }'}
}`);
  };
  mat.customProgramCacheKey = () => (fantasma ? 'corte-fantasma' : 'corte');
  return mat;
}

// caixas orientadas (paredes, muretas, vergas, vidros, folhas) numa geometria
// só, com cor por face (topo escuro: lê a planta de cima) e o centro da parede
function geometriaDeCaixas(lista, cores) {
  const pos = [], nor = [], cor = [], par = [], idx = [];
  const [lado, topo, base] = cores.map(c => new Color(c));
  const linhas = [], parL = [];
  for (const [ax, ay, bx, by, esp, z0, z1] of lista) {
    const L = Math.hypot(bx - ax, by - ay);
    if (L < 1e-4 || z1 <= z0) continue;
    const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy * esp / 2, ny = ux * esp / 2;
    const c = [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
    const v = (i, z) => { const [x, y] = c[i]; return [x, z, -y]; };
    const centro = [(ax + bx) / 2, z0, -(ay + by) / 2, 0];
    const faces = [
      [v(0, z0), v(1, z0), v(1, z1), v(0, z1), [-uy, 0, -ux], lado], [v(2, z0), v(3, z0), v(3, z1), v(2, z1), [uy, 0, ux], lado],
      [v(1, z0), v(2, z0), v(2, z1), v(1, z1), [ux, 0, -uy], lado], [v(3, z0), v(0, z0), v(0, z1), v(3, z1), [-ux, 0, uy], lado],
      [v(0, z1), v(1, z1), v(2, z1), v(3, z1), [0, 1, 0], topo], [v(3, z0), v(2, z0), v(1, z0), v(0, z0), [0, -1, 0], base],
    ];
    for (const [p0, p1, p2, p3, n, k] of faces) {
      const b = pos.length / 3;
      pos.push(...p0, ...p1, ...p2, ...p3);
      for (let i = 0; i < 4; i++) { nor.push(...n); cor.push(k.r, k.g, k.b); par.push(...centro); }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    // arestas: contorno do topo, da base e as 4 verticais (sem diagonais)
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      linhas.push(...v(i, z1), ...v(j, z1), ...v(i, z0), ...v(j, z0), ...v(i, z0), ...v(i, z1));
      for (let k = 0; k < 6; k++) parL.push(...centro);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new Float32BufferAttribute(cor, 3));
  g.setAttribute('aParede', new Float32BufferAttribute(par, 4));
  g.setIndex(idx);
  const gl = new BufferGeometry();
  gl.setAttribute('position', new Float32BufferAttribute(linhas, 3));
  gl.setAttribute('aParede', new Float32BufferAttribute(parL, 4));
  return { g, gl };
}

const matParede = comCorte(new MeshStandardMaterial({ vertexColors: true, roughness: 0.88, side: DoubleSide }));
const matMureta = comCorte(new MeshStandardMaterial({ vertexColors: true, roughness: 0.88, side: DoubleSide }));
const matFantasma = comCorte(new MeshStandardMaterial({ color: '#efeae0', roughness: 0.9, transparent: true, opacity: 0.13, depthWrite: false, side: DoubleSide }), true);
const matVidro = comCorte(new MeshStandardMaterial({ color: '#8ec9ff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false, side: DoubleSide }));
const matAresta = comCorte(new LineBasicMaterial({ color: '#2f2c27', transparent: true, opacity: 0.5 }));
const fantasmas = [];

function caixas(lista, mat, chave, { cores = ['#efeae0', '#5f594f', '#cfc8ba'], arestas = true, fantasma = false } = {}) {
  if (!lista || !lista.length) return null;
  const { g, gl } = geometriaDeCaixas(lista, cores);
  const m = new Mesh(g, mat);
  m.renderOrder = 2;
  grupo(chave).add(m);
  if (fantasma) {
    const f = new Mesh(g, matFantasma);
    f.renderOrder = 5;
    grupo(chave).add(f);
    fantasmas.push(f);
  }
  if (arestas) {
    const e = new LineSegments(gl, matAresta);
    e.renderOrder = 3;
    grupo(chave).add(e);
  }
  return m;
}
const malhaParedes = caixas(CENA.paredes, matParede, 'paredes', { fantasma: true });
caixas(CENA.muretas, matMureta, 'paredes', { cores: ['#ddd5c6', '#5f594f', '#cfc8ba'], fantasma: true });
caixas(CENA.guardas, matVidro, 'paredes');
caixas(CENA.vidros, matVidro, 'paredes', { arestas: false });
// pilares (o corte rebaixa os da frente pela escala)
const matPilar = new MeshStandardMaterial({ color: '#a5a39c', roughness: 0.8 });
const pilares = [];
for (const p of CENA.pilares) {
  if (p.length < 3) continue;
  const g = new ExtrudeGeometry(new Shape(p.map(([x, y]) => new Vector2(x, y))), { depth: PD, bevelEnabled: false });
  const m = new Mesh(g, matPilar);
  m.rotation.x = -Math.PI / 2;
  grupo('pilares').add(m);
  pilares.push({ m, cx: p.reduce((s, q) => s + q[0], 0) / p.length, cz: -p.reduce((s, q) => s + q[1], 0) / p.length });
}
// planta de referência no piso (mobiliário, louças, bancadas, escada): Int16 em cm
if (CENA.planta) {
  const bin = atob(CENA.planta);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(u8.buffer);
  const pos = new Float32Array((i16.length / 2) * 3);
  for (let k = 0, j = 0; k < i16.length; k += 2, j += 3) { pos[j] = i16[k] / 100; pos[j + 1] = 0.03; pos[j + 2] = -i16[k + 1] / 100; }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  grupo('planta').add(new LineSegments(g, new LineBasicMaterial({ color: '#3a382f', transparent: true, opacity: 0.6 })));
}
// folhas das portas abertas (90°)
caixas(CENA.folhas.map(([ax, ay, bx, by]) => [ax, ay, bx, by, 0.04, 0, CENA.alturaPorta]),
  comCorte(new MeshStandardMaterial({ color: '#b08457', roughness: 0.7, transparent: true, opacity: 0.85 })), 'portas', { arestas: false });

// ── Dispositivos ─────────────────────────────────────────────────────────────
// Geometria por forma, no tamanho da cena (tam = [largura, altura, profundidade]):
// o FUNDO da peça fica no plano z = 0 (encostado na parede/forro) e o eixo +Z
// local aponta para fora. Partes com tom diferente (furos, tecla, porta do
// quadro, lente) vão na cor de vértice, que multiplica a cor da disciplina.
function juntar(partes) {
  const pos = [], nor = [], cor = [];
  for (const [g0, tom] of partes) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    const [r, gg, b] = Array.isArray(tom) ? tom : [tom, tom, tom];
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    for (let i = 0; i < p.length / 3; i++) cor.push(r, gg, b);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new Float32BufferAttribute(cor, 3));
  return g;
}
const bx = (w, h, d, x = 0, y = 0, z = 0) => new BoxGeometry(w, h, d).translate(x, y, z + d / 2);
// poucos lados: milhares de peças por tipo, e de perto 14 lados já parecem redondos
const ci = (r, d, x = 0, y = 0, z = 0, seg = 14) => new CylinderGeometry(r, r, d, seg).rotateX(Math.PI / 2).translate(x, y, z + d / 2);
const semi = (r, x = 0, y = 0, z = 0) => new SphereGeometry(r, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(x, y, z);
const ESC = 0.12; // furos, telas, lentes
const FORMAS = {
  // placa 4×2 com o rebaixo redondo e os 2 furos (NBR 14136)
  tomada: (w, h, d) => juntar([[bx(w, h, d), 1], [ci(w * 0.34, 0.004, 0, 0, d), 0.7], [ci(w * 0.065, 0.004, -w * 0.14, 0, d + 0.003, 8), ESC], [ci(w * 0.065, 0.004, w * 0.14, 0, d + 0.003, 8), ESC]]),
  interruptor: (w, h, d) => juntar([[bx(w, h, d), 1], [bx(w * 0.52, h * 0.44, 0.012, 0, 0, d), 0.78], [bx(w * 0.12, h * 0.04, 0.003, 0, h * 0.14, d + 0.012), ESC]]),
  // placa com o conector RJ (furo retangular com a trava)
  rede: (w, h, d) => juntar([[bx(w, h, d), 1], [bx(w * 0.62, h * 0.34, 0.004, 0, h * 0.04, d), 0.7], [bx(w * 0.38, h * 0.17, 0.004, 0, h * 0.06, d + 0.003), ESC], [bx(w * 0.14, h * 0.05, 0.004, 0, -h * 0.05, d + 0.003), ESC]]),
  coaxial: (w, h, d) => juntar([[bx(w, h, d), 1], [ci(w * 0.2, 0.014, 0, 0, d), 0.75], [ci(w * 0.06, 0.004, 0, 0, d + 0.014, 10), ESC]]),
  // caixa de sobrepor com a porta, o fecho e a plaqueta de identificação
  quadro: (w, h, d) => juntar([[bx(w, h, d * 0.85), 0.68], [bx(w - 0.04, h - 0.04, 0.012, 0, 0, d * 0.85), 1.05], [bx(0.025, 0.1, 0.02, w / 2 - 0.07, 0, d * 0.85 + 0.012), ESC], [bx(w * 0.36, 0.05, 0.003, 0, h / 2 - 0.1, d * 0.85 + 0.012), 0.3]]),
  rack: (w, h, d) => juntar([[bx(w, h, d * 0.92), 0.4], [bx(w - 0.03, h - 0.03, 0.01, 0, 0, d * 0.92), 0.8], [bx(w - 0.1, h - 0.1, 0.004, 0, 0, d * 0.92 + 0.01), 0.22], [bx(0.02, 0.08, 0.02, w / 2 - 0.05, 0, d * 0.92 + 0.01), 1.3]]),
  caixa: (w, h, d) => juntar([[bx(w, h, d), 1], [bx(w * 0.7, h * 0.7, 0.004, 0, 0, d), 0.7]]),
  teclado: (w, h, d) => {
    const p = [[bx(w, h, d), 1], [bx(w * 0.72, h * 0.2, 0.003, 0, h * 0.28, d), ESC]];
    for (const y of [0.06, -0.07, -0.2, -0.33]) for (const x of [-0.24, 0, 0.24]) p.push([bx(w * 0.17, h * 0.08, 0.004, x * w, y * h, d), 0.55]);
    return juntar(p);
  },
  acionador: (w, h, d) => juntar([[bx(w, h, d), 1], [bx(w * 0.6, h * 0.6, 0.004, 0, 0, d), 1.5], [ci(w * 0.12, 0.006, 0, 0, d + 0.004, 12), ESC]]),
  sirene: (w, h, d) => juntar([[bx(w, h, d * 0.45), 0.85], [ci(w * 0.36, d * 0.55, 0, 0, d * 0.45), 1.35]]),
  barra: (w, h, d) => juntar([[bx(w, h, d), 1], [bx(w * 0.9, h * 0.3, 0.003, 0, 0, d), 0.6]]),
  emergencia: (w, h, d) => juntar([[bx(w, h, d), 0.9], [bx(w * 0.36, h * 0.5, 0.004, -w * 0.22, 0, d), 1.8], [bx(w * 0.36, h * 0.5, 0.004, w * 0.22, 0, d), 1.8]]),
  wallbox: (w, h, d) => juntar([[bx(w, h, d), 1], [bx(w * 0.5, h * 0.18, 0.003, 0, h * 0.22, d), ESC], [ci(w * 0.16, 0.05, 0, -h * 0.18, d), 0.5]]),
  // no teto: painel com moldura e difusor; disco com borda (detector); domo
  luminaria: (w, h, d) => juntar([[bx(w, h, d), 0.62], [bx(w - 0.05, h - 0.05, 0.004, 0, 0, d), 1.25]]),
  'ponto-luz': (w, h, d) => juntar([[ci(w * 0.5, d * 0.25), 0.7], [semi(w * 0.3, 0, 0, d * 0.25), 1.3]]),
  detector: (w, h, d) => juntar([[ci(w * 0.5, d * 0.3), 0.78], [ci(w * 0.4, d * 0.7, 0, 0, d * 0.3), 1.05], [ci(w * 0.05, 0.004, w * 0.2, 0, d, 8), ESC]]),
  sensor: (w, h, d) => juntar([[ci(w * 0.5, d * 0.35), 0.85], [semi(w * 0.32, 0, 0, d * 0.35), 1.2]]),
  ap: (w, h, d) => juntar([[ci(w * 0.5, d, 0, 0, 0, 24), 1.1], [ci(w * 0.08, 0.003, 0, 0, d, 8), 0.4]]),
  // câmera bullet: base na parede, braço, corpo cilíndrico, para-sol e lente
  camera: (w, h, d) => {
    const c = d - 0.08;
    return juntar([[ci(0.035, 0.012), 0.6], [bx(0.025, 0.025, 0.07, 0, 0, 0.012), 0.6], [ci(w * 0.5, c, 0, 0, 0.08), 1],
      [bx(w * 1.2, 0.01, c * 0.85, 0, w * 0.5 + 0.006, 0.08 + c * 0.18), 0.85], [ci(w * 0.32, 0.004, 0, 0, d), ESC]]);
  },
  dome: (w, h, d) => juntar([[ci(w * 0.5, d * 0.3), 0.9], [semi(w * 0.42, 0, 0, d * 0.3), 0.3]]),
  'sensor-canto': (w, h, d) => juntar([[bx(w, h, d), 1], [bx(w * 0.78, h * 0.42, 0.008, 0, -h * 0.12, d), 0.35], [ci(w * 0.06, 0.003, 0, h * 0.32, d, 8), ESC]]),
  catraca: (w, h, d) => juntar([[new BoxGeometry(w, h, d).translate(0, h / 2, 0), 0.9], [new BoxGeometry(w * 1.05, 0.04, d * 1.02).translate(0, h, 0), 0.6]]),
};
// cenas antigas (versão 1) não trazem tam/montagem
const TAM_PADRAO = { tomada: [0.1, 0.16, 0.03], interruptor: [0.1, 0.16, 0.03], quadro: [0.6, 0.8, 0.15], rack: [0.6, 0.6, 0.45], luminaria: [0.62, 0.62, 0.06], 'ponto-luz': [0.26, 0.26, 0.1], detector: [0.16, 0.16, 0.07], sensor: [0.13, 0.13, 0.06], camera: [0.11, 0.11, 0.32], 'sensor-canto': [0.08, 0.13, 0.07], catraca: [0.3, 1, 0.8], barra: [0.3, 0.06, 0.05] };
const NO_TETO = new Set(['luminaria', 'ponto-luz', 'detector', 'sensor', 'ap', 'dome']);
for (const t of CENA.dispositivos) {
  t.tam = t.tam || TAM_PADRAO[t.forma] || [0.18, 0.18, 0.07];
  t.montagem = t.montagem || (NO_TETO.has(t.forma) ? 'teto' : t.forma === 'catraca' ? 'piso' : t.forma === 'camera' || t.forma === 'sensor-canto' ? 'canto' : 'parede');
}

// Escala pela distância (no shader): a peça nunca fica menor que uMin pixels
// na tela (de longe todas aparecem) e nunca menor que o tamanho real × uBase
// (de perto fica no tamanho da cena). uPx = tamanho no mundo de 1 px a 1 m da
// câmera, atualizado a cada quadro (depende da lente e da altura da tela).
const UD = { uPx: { value: 0.001 }, uMin: { value: 14 }, uBase: { value: 1 }, uMinInfra: { value: 3 } };
const ESCALA_MAX = 40;
function materialDispositivo(cor, tamMax, brilho) {
  const mat = new MeshStandardMaterial({ color: cor, vertexColors: true, emissive: cor, emissiveIntensity: brilho, roughness: 0.55, metalness: 0.05 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uPx: UD.uPx, uMin: UD.uMin, uBase: UD.uBase, uTam: { value: tamMax } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uPx; uniform float uMin; uniform float uBase; uniform float uTam;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = max(uBase, min(uMin * uPx * distance(cameraPosition, o) / uTam, ${ESCALA_MAX.toFixed(1)}));
  transformed *= s;
}
#endif`);
    // o brilho próprio segue o tom da peça (furo e lente continuam escuros)
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor.rgb;\n#endif');
  };
  mat.customProgramCacheKey = () => 'dispositivo';
  return mat;
}
// mesma conta em JS, para achar o ponto sob o mouse com o tamanho que aparece
function escalaDe(tamMax, d) { return Math.max(UD.uBase.value, Math.min(UD.uMin.value * UD.uPx.value * d / tamMax, ESCALA_MAX)); }

const malhasDispositivos = [];
const o3 = new Object3D();
const eixoZ = new Vector3(0, 0, 1);
const vTmp = new Vector3();

function posicionarInstancias(t, mesh) {
  t.itens.forEach(([x, y, z, nx, ny], i) => {
    o3.position.set(x, z, -y);
    o3.quaternion.identity();
    if (t.montagem === 'teto') {
      o3.quaternion.setFromUnitVectors(eixoZ, vTmp.set(0, -1, 0)); // face para baixo, fundo no forro
    } else if (t.montagem === 'piso') {
      if (t.forma !== 'catraca') o3.quaternion.setFromUnitVectors(eixoZ, vTmp.set(0, 1, 0));
    } else if (nx || ny) {
      vTmp.set(nx, 0, -ny).normalize();
      if (t.forma === 'camera') vTmp.y = -0.45; else if (t.forma === 'sensor-canto') vTmp.y = -0.35; // inclinada para baixo
      o3.quaternion.setFromUnitVectors(eixoZ, vTmp.normalize());
    }
    o3.scale.set(1, 1, 1);
    o3.updateMatrix();
    mesh.setMatrixAt(i, o3.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

// peças do teto vistas DE CIMA (vista geral) ficam translúcidas: senão as
// luminárias tampam as salas e o que está nas paredes
const matsTeto = [];
const porAmbiente = new Map(); // índice do ambiente → [[tipo, item], …] (etiquetas de perto)
for (const t of CENA.dispositivos) {
  if (!t.itens.length) continue;
  const brilho = t.forma === 'luminaria' ? 0.55 : t.forma === 'ponto-luz' ? 0.5 : 0.22;
  t.tamMax = Math.max(...t.tam);
  const geo = (FORMAS[t.forma] || FORMAS.caixa)(...t.tam);
  const mat = materialDispositivo(t.cor, t.tamMax, brilho);
  if (t.montagem === 'teto') { mat.transparent = true; matsTeto.push(mat); }
  const mesh = new InstancedMesh(geo, mat, t.itens.length);
  mesh.userData = { tipo: t };
  mesh.renderOrder = 1;
  mesh.frustumCulled = false; // a escala do shader aumenta a peça além da caixa calculada na CPU
  posicionarInstancias(t, mesh);
  grupo(`disc:${t.disciplina}`).add(mesh);
  malhasDispositivos.push(mesh);
  t.malha = mesh;
  for (const it of t.itens) {
    if (!porAmbiente.has(it[5])) porAmbiente.set(it[5], []);
    porAmbiente.get(it[5]).push([t, it]);
  }
  // campo de visão (câmera) / cobertura (IVP): área no piso recortada pelo
  // ambiente + volume translúcido do aparelho até essa área
  if (t.itens.some(it => Array.isArray(it[7]))) {
    const piso = [], vol = [], borda = [];
    for (const [x, y, z, , , , , campo] of t.itens) {
      if (!Array.isArray(campo) || campo.length < 6) continue;
      const pts = [];
      for (let k = 0; k < campo.length; k += 2) pts.push([campo[k], campo[k + 1]]);
      const ap = [x, z, -y];
      for (let k = 1; k < pts.length - 1; k++) piso.push(pts[0][0], 0.03, -pts[0][1], pts[k][0], 0.03, -pts[k][1], pts[k + 1][0], 0.03, -pts[k + 1][1]);
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k], b = pts[(k + 1) % pts.length];
        vol.push(...ap, a[0], 0.03, -a[1], b[0], 0.03, -b[1]);
        borda.push(a[0], 0.035, -a[1], b[0], 0.035, -b[1]);
      }
    }
    const malha = (arr, mat, Cls = Mesh) => { const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(arr, 3)); const m = new Cls(g, mat); m.renderOrder = 4; grupo('campo').add(m); return m; };
    malha(piso, new MeshBasicMaterial({ color: t.cor, transparent: true, opacity: 0.22, depthWrite: false, side: DoubleSide }));
    malha(vol, new MeshBasicMaterial({ color: t.cor, transparent: true, opacity: 0.05, depthWrite: false, side: DoubleSide }));
    malha(borda, new LineBasicMaterial({ color: t.cor, transparent: true, opacity: 0.7 }), LineSegments);
  }
}

// ── Infraestrutura (eletrocalhas, eletrodutos, leitos, perfilados, fiação) ───
// Um InstancedMesh por grupo (caixa unitária ou tubo de 8 lados esticado em
// cada segmento) + uma linha fina no mesmo eixo, que continua visível de longe.
// A seção também engrossa com a distância (mínimo de uMinInfra px na tela).
function materialInfra(cor, secaoMax) {
  const mat = new MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.18, roughness: 0.45, metalness: 0.35 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uPx: UD.uPx, uMinInfra: UD.uMinInfra, uSecao: { value: secaoMax } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uPx; uniform float uMinInfra; uniform float uSecao;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = clamp(uMinInfra * uPx * distance(cameraPosition, o) / uSecao, 1.0, 15.0);
  transformed.yz *= s;
}
#endif`);
  };
  mat.customProgramCacheKey = () => 'infra';
  return mat;
}
const gInfra = grupo('infra');
for (const g of INFRA) {
  const seg = g.segmentos || [];
  const n = Math.floor(seg.length / 4);
  if (!n) continue;
  const item = new Group();
  grupo(`infra:${g.disciplina}`, gInfra).add(item);
  g.objeto = item;
  const [sw, sh] = g.secao || [0.05, 0.05];
  if (g.forma !== 'linha') {
    const geo = g.forma === 'tubo' ? new CylinderGeometry(0.5, 0.5, 1, 8).rotateZ(Math.PI / 2) : new BoxGeometry(1, 1, 1);
    const mesh = new InstancedMesh(geo, materialInfra(g.cor, Math.max(sw, sh)), n);
    for (let i = 0; i < n; i++) {
      const x1 = seg[i * 4], y1 = seg[i * 4 + 1], x2 = seg[i * 4 + 2], y2 = seg[i * 4 + 3];
      const L = Math.hypot(x2 - x1, y2 - y1);
      o3.position.set((x1 + x2) / 2, g.z, -(y1 + y2) / 2);
      o3.quaternion.identity();
      o3.rotation.set(0, Math.atan2(y2 - y1, x2 - x1), 0);
      // emenda: cada segmento avança meia largura nas pontas (cantos fechados)
      o3.scale.set(L + sw, sh, sw);
      o3.updateMatrix();
      mesh.setMatrixAt(i, o3.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    item.add(mesh);
  }
  const pos = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) pos.set([seg[i * 4], g.z, -seg[i * 4 + 1], seg[i * 4 + 2], g.z, -seg[i * 4 + 3]], i * 6);
  const gl = new BufferGeometry();
  gl.setAttribute('position', new Float32BufferAttribute(pos, 3));
  item.add(new LineSegments(gl, new LineBasicMaterial({ color: g.cor, transparent: true, opacity: g.forma === 'linha' ? 0.95 : 0.8 })));
}

// ── Estado ──────────────────────────────────────────────────────────────────
const estado = { paredes: 0, corte: true, ambientes: true, etiquetas: true, portas: true, planta: true, campo: false, giro: false, grandes: false, infra: true };
let modo = 'geral'; // 'geral' | 'dentro' | 'saindo'
let atual = -1;     // ambiente onde a câmera está (modo dentro)
let salvo = null;   // vista geral antes de entrar
let anim = null;
let yaw = 0, pitch = 0;
const alvoAnim = new Vector3();
let livre = { lateral: 0, topo: 0 };

// ── Etiquetas dos ambientes (HTML sobre o 3D) ───────────────────────────────
const camadaEtiquetas = $('#etiquetas');
const etiquetas = CENA.ambientes.map(a => {
  const el = document.createElement('div');
  el.className = 'etq';
  el.innerHTML = `<b>${esc(a.nome)}</b><span>${br(a.area_m2)} m²</span>`;
  camadaEtiquetas.appendChild(el);
  return { a, el, p: W(a.centro[0], a.centro[1], 0.05), lado: Math.sqrt(a.area_m2), ret: null };
}).sort((p, q) => q.a.area_m2 - p.a.area_m2);
function atualizarEtiquetas() {
  if (!estado.etiquetas || modo !== 'geral') { for (const e of etiquetas) { e.el.style.display = 'none'; e.ret = null; } return; }
  const w = tela.clientWidth, h = tela.clientHeight;
  const focal = (h / 2) / Math.tan(MathUtils.degToRad(camera.fov / 2));
  const ocupado = [];
  for (const e of etiquetas) {
    vTmp.copy(e.p).project(camera);
    const dCam = camera.position.distanceTo(e.p);
    const px = e.lado * focal / Math.max(dCam, 0.1);
    const x = (vTmp.x + 1) / 2 * w, y = (1 - vTmp.y) / 2 * h;
    // só na área livre (fora da barra, do painel e do rodapé)
    let mostrar = vTmp.z < 1 && px > 38 && x > 50 && x < w - livre.lateral - 50 && y > livre.topo + 18 && y < h - 60;
    if (mostrar) {
      const r = [x - 55, y - 16, x + 55, y + 16];
      if (ocupado.some(o => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1])) mostrar = false; else ocupado.push(r);
    }
    e.el.style.display = mostrar ? '' : 'none';
    e.ret = mostrar ? [x - 60, y - 18, x + 60, y + 18] : null;
    if (mostrar) e.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
}

// altura de instalação do ponto, para a dica e as etiquetas
function alturaDoItem(t, it) {
  if (t.montagem === 'teto') return 'no teto';
  if (t.montagem === 'piso') return 'no piso';
  if (t.montagem === 'topo-porta') return 'acima da porta';
  if (t.montagem === 'canto') return `no alto do canto · h = ${br(it[2])} m`;
  return `h = ${br(it[2])} m`;
}

// etiquetas dos pontos próximos (só dentro do ambiente): até 30, sem sobrepor;
// texto por textContent (nada de HTML vindo da cena)
const camadaPontos = $('#etiquetas-pontos');
const poolPontos = [];
function etiquetaPonto(i) {
  if (!poolPontos[i]) {
    const el = document.createElement('div');
    el.className = 'etq-p';
    const b = document.createElement('b'), s = document.createElement('span');
    el.append(b, s);
    camadaPontos.appendChild(el);
    poolPontos[i] = { el, b, s, chave: null };
  }
  return poolPontos[i];
}
function atualizarEtiquetasPontos() {
  let usados = 0;
  if (camadaPontos && modo === 'dentro' && !anim && estado.etiquetas) {
    const w = tela.clientWidth, h = tela.clientHeight;
    const cands = [];
    for (const [t, it] of porAmbiente.get(atual) || []) {
      if (!t.malha.visible || !t.malha.parent.visible) continue;
      vTmp.set(it[0], it[2], -it[1]);
      const d = camera.position.distanceTo(vTmp);
      // etiqueta acima da peça (quadro grande não fica coberto); no teto, abaixo
      const s = escalaDe(t.tamMax, d);
      const embaixo = t.montagem === 'teto';
      vTmp.y += embaixo ? -t.tam[2] * s : t.montagem === 'piso' ? t.tam[1] * s : (t.tam[1] / 2) * s;
      vTmp.project(camera);
      if (vTmp.z > 1 || vTmp.z < -1) continue;
      const x = (vTmp.x + 1) / 2 * w, y = (1 - vTmp.y) / 2 * h;
      if (x < 20 || x > w - livre.lateral - 20 || y < livre.topo + 50 || y > h - 70) continue;
      cands.push({ t, it, d, x, y: embaixo ? y + 46 : y });
    }
    cands.sort((a, b) => a.d - b.d);
    const ocupado = [];
    for (const c of cands) {
      if (usados >= 30) break;
      const r = [c.x - 70, c.y - 46, c.x + 70, c.y - 6];
      if (ocupado.some(o => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1])) continue;
      ocupado.push(r);
      const p = etiquetaPonto(usados++);
      const chave = `${c.t.simbolo}|${c.it[6]}|${c.it[0]}|${c.it[1]}`;
      if (p.chave !== chave) {
        p.chave = chave;
        p.b.textContent = c.t.rotulo;
        p.s.textContent = alturaDoItem(c.t, c.it) + (c.it[6] ? ` · ${c.it[6]}` : '');
        p.el.style.setProperty('--cor', c.t.cor);
        p.el.style.display = '';
        p.larg = p.el.offsetWidth; // medida só quando o texto muda
      }
      p.el.style.display = '';
      c.x = MathUtils.clamp(c.x, p.larg / 2 + 4, w - livre.lateral - p.larg / 2 - 4);
      p.el.style.transform = `translate(-50%, -100%) translate(${c.x.toFixed(1)}px, ${(c.y - 6).toFixed(1)}px)`;
    }
  }
  for (let i = usados; i < poolPontos.length; i++) poolPontos[i].el.style.display = 'none';
}

// ── Câmera: perspectiva, vista de cima ──────────────────────────────────────
const centro = new Vector3((lx0 + lx1) / 2, 0, -(ly0 + ly1) / 2);
// área livre da tela (fora do painel lateral, da barra e do rodapé)
function areaLivre() {
  const w = tela.clientWidth, h = tela.clientHeight;
  const aside = document.querySelector('aside');
  const lateral = w > 900 && aside ? aside.offsetWidth + 16 : 0;
  const topo = document.querySelector('#barra')?.getBoundingClientRect().bottom || 0;
  return { w, h, lateral, topo, livreW: Math.max(200, w - lateral - 32), livreH: Math.max(200, h - topo - 50) };
}
function ajustarFov(fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
function vista3d() {
  sairDoAmbiente();
  ajustarFov(45);
  const a = areaLivre();
  // celular em pé: a lente é estreita na horizontal, a câmera recua
  const k = Math.max(1, (a.w / a.livreW) * 0.85) * Math.max(1, 1 / camera.aspect);
  camera.position.copy(centro).add(new Vector3(diag * 0.42 * k, diag * 0.5 * k, diag * 0.58 * k));
  controles.target.copy(centro);
  controles.update();
}
function vistaDeCima() {
  sairDoAmbiente();
  ajustarFov(30);
  const a = areaLivre();
  const t = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2));
  const d = Math.max((larg * a.w) / (a.livreW * t * camera.aspect), (prof * a.h) / (a.livreH * t)) * 1.04;
  camera.position.copy(centro).add(new Vector3(0, d + PD, 0.001));
  controles.target.copy(centro);
  controles.update();
}

// ── Dentro do ambiente ──────────────────────────────────────────────────────
function dentroPol([x, y], p) {
  let d = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
// distância do ponto o, na direção u, até o contorno do polígono
function distanciaRaio(o, u, pol) {
  let t = Infinity;
  for (let i = 0; i < pol.length; i++) {
    const a = pol[i], b = pol[(i + 1) % pol.length];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const den = u[0] * ey - u[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    const s = ((a[0] - o[0]) * ey - (a[1] - o[1]) * ex) / den;
    const r = ((a[0] - o[0]) * u[1] - (a[1] - o[1]) * u[0]) / den;
    if (s > 0.05 && r >= 0 && r <= 1 && s < t) t = s;
  }
  return t;
}
// olhos encostados na parede oposta à MAIS LONGA, olhando para ela (a parede
// inteira cabe na imagem). Entre paredes longas parecidas (até 15 % menores)
// vence a que tem mais pontos de parede — quadro e rack valem mais.
const PESO_PAREDE = { quadro: 5, rack: 5, teclado: 2, caixa: 2, wallbox: 3 };
function pontoDeVista(a) {
  const pol = a.poligono, n = pol.length;
  const comp = (i) => Math.hypot(pol[(i + 1) % n][0] - pol[i][0], pol[(i + 1) % n][1] - pol[i][1]);
  const maior = Math.max(...pol.map((_, i) => comp(i)));
  const naParede = (porAmbiente.get(a.i) || []).filter(([t]) => t.montagem === 'parede' || t.montagem === 'canto');
  let bi = 0, melhor = -1;
  for (let i = 0; i < n; i++) {
    const L = comp(i);
    if (L < 0.85 * maior) continue;
    const [A, B] = [pol[i], pol[(i + 1) % n]];
    let pontos = 0;
    for (const [t, it] of naParede) {
      const vx = B[0] - A[0], vy = B[1] - A[1];
      const s = MathUtils.clamp(((it[0] - A[0]) * vx + (it[1] - A[1]) * vy) / (L * L), 0, 1);
      if (Math.hypot(it[0] - A[0] - vx * s, it[1] - A[1] - vy * s) < 0.4) pontos += PESO_PAREDE[t.forma] || 1;
    }
    const nota = pontos * 10 + L;
    if (nota > melhor) { melhor = nota; bi = i; }
  }
  const bL = comp(bi);
  const A = pol[bi], B = pol[(bi + 1) % n];
  const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const u = [(B[0] - A[0]) / bL, (B[1] - A[1]) / bL];
  let nr = [-u[1], u[0]];
  if (!dentroPol([m[0] + nr[0] * 0.2, m[1] + nr[1] * 0.2], pol)) nr = [-nr[0], -nr[1]];
  const folga = distanciaRaio(m, nr, pol);
  // corredor (estreito e comprido): de frente para a parede só se veria a
  // parede; fica numa ponta, olhando ao longo dele
  if (Number.isFinite(folga) && folga < 2.6 && bL > 2.5 * folga) {
    const meio = [m[0] + nr[0] * folga / 2, m[1] + nr[1] * folga / 2];
    const olho = [meio[0] - u[0] * (bL / 2 - 0.6), meio[1] - u[1] * (bL / 2 - 0.6)];
    if (dentroPol(olho, pol)) return { olho, alvo: [meio[0] + u[0] * bL / 2, meio[1] + u[1] * bL / 2], altura: 1.5 };
  }
  let D = Math.min(folga - 0.35, Math.max(3, bL * 0.9));
  if (!Number.isFinite(D) || D < 0.6) D = Number.isFinite(folga) ? folga / 2 : 1.5;
  let olho = [m[0] + nr[0] * D, m[1] + nr[1] * D];
  if (!dentroPol(olho, pol)) olho = a.centro;
  return { olho, alvo: m };
}
function aplicarOlhar() {
  camera.rotation.order = 'YXZ';
  camera.rotation.set(pitch, yaw, 0);
}
function olharPara(p) {
  const d = vTmp.copy(p).sub(camera.position).normalize();
  yaw = Math.atan2(-d.x, -d.z);
  pitch = Math.asin(MathUtils.clamp(d.y, -1, 1));
  aplicarOlhar();
}
// ponto para onde a câmera olha agora (início da animação)
function pontoOlhado(dist) {
  if (anim) return alvoAnim.clone();
  if (modo === 'geral') return controles.target.clone();
  return camera.position.clone().add(camera.getWorldDirection(new Vector3()).multiplyScalar(dist));
}
const suave = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function animar(a0, pos, alvo, fov, dur, fim) {
  anim = { t0: performance.now(), dur, p0: camera.position.clone(), p1: pos.clone(), a0, a1: alvo.clone(), f0: camera.fov, f1: fov, fim };
  if (!dur) passoAnimacao(performance.now());
}
function passoAnimacao(agora) {
  if (!anim) return;
  const k = anim.dur ? Math.min(1, (agora - anim.t0) / anim.dur) : 1;
  const e = suave(k);
  camera.position.lerpVectors(anim.p0, anim.p1, e);
  alvoAnim.lerpVectors(anim.a0, anim.a1, e);
  camera.rotation.order = 'XYZ';
  camera.lookAt(alvoAnim);
  ajustarFov(anim.f0 + (anim.f1 - anim.f0) * e);
  if (k >= 1) { const f = anim.fim; anim = null; if (f) f(); }
}

// forro do ambiente atual: fecha o "céu" quando se olha para cima e dá fundo
// às luminárias e detectores
let forro = null;
function trocarForro(a) {
  if (forro) { forro.geometry.dispose(); forro.material.dispose(); grupo('forro').remove(forro); forro = null; }
  if (!a || a.poligono.length < 3) return;
  forro = new Mesh(new ShapeGeometry(new Shape(a.poligono.map(([x, y]) => new Vector2(x, y)))), new MeshBasicMaterial({ color: '#cfccc4', side: DoubleSide }));
  forro.rotation.x = -Math.PI / 2;
  forro.position.y = PD + 0.002;
  grupo('forro').add(forro);
}

const painelDentro = $('#dentro');
function mostrarPainel(a) {
  if (!painelDentro) return;
  $('#dentro-nome').textContent = a ? a.nome : '';
  painelDentro.classList.toggle('aberto', !!a);
  // o painel lateral sai da frente: dentro do ambiente a imagem usa a tela toda
  if (document.body.classList.contains('modo-dentro') !== !!a) {
    document.body.classList.toggle('modo-dentro', !!a);
    redimensionar();
  }
  aplicarGrandes();
}
function entrarAmbiente(ref, op = {}) {
  const a = typeof ref === 'number' ? CENA.ambientes[ref] : CENA.ambientes.find(x => x.nome === ref);
  if (!a || a.poligono.length < 3) return false;
  const { olho, alvo, altura } = pontoDeVista(a);
  const pos = W(olho[0], olho[1], ALTURA_OLHOS), look = W(alvo[0], alvo[1], altura || 1.1);
  const a0 = pontoOlhado(camera.position.distanceTo(look));
  if (modo === 'geral') salvo = { pos: camera.position.clone(), alvo: controles.target.clone(), fov: camera.fov };
  modo = 'dentro';
  atual = a.i ?? CENA.ambientes.indexOf(a);
  controles.enabled = false;
  controles.autoRotate = false;
  trocarForro(a);
  mostrarPainel(a);
  animar(a0, pos, look, op.fov || 70, op.instantaneo ? 0 : 1100, () => olharPara(look));
  return true;
}
// desliga o modo "dentro" sem animação (botões de vista)
function sairDoAmbiente() {
  if (modo === 'geral') return;
  anim = null;
  modo = 'geral';
  atual = -1;
  trocarForro(null);
  mostrarPainel(null);
  camera.rotation.order = 'XYZ';
  controles.enabled = true;
  controles.autoRotate = estado.giro;
}
function voltarVistaGeral(op = {}) {
  if (modo === 'geral') return;
  const s = salvo;
  if (!s) { vista3d(); return; }
  const a0 = pontoOlhado(camera.position.distanceTo(s.alvo));
  modo = 'saindo';
  trocarForro(null);
  mostrarPainel(null);
  animar(a0, s.pos, s.alvo, s.fov, op.instantaneo ? 0 : 900, () => {
    modo = 'geral'; atual = -1;
    camera.rotation.order = 'XYZ';
    controles.target.copy(s.alvo);
    controles.enabled = true;
    controles.autoRotate = estado.giro;
    controles.update();
  });
}
// andar até um ponto do piso (duplo clique dentro), mantendo a direção do olhar
function andarAte(px, pz, amb) {
  const pos = new Vector3(px, ALTURA_OLHOS, pz);
  const dir = camera.getWorldDirection(new Vector3());
  const look = pos.clone().add(dir.multiplyScalar(3));
  if (amb && amb.i !== atual) { atual = amb.i; trocarForro(amb); mostrarPainel(amb); }
  animar(pontoOlhado(3), pos, look, camera.fov, 700, () => olharPara(look));
}
function ambienteNoPonto(x, y) {
  let melhor = null;
  for (const a of CENA.ambientes) if (a.poligono.length >= 3 && dentroPol([x, y], a.poligono) && (!melhor || a.area_m2 < melhor.area_m2)) melhor = a;
  return melhor;
}

// ── Botões ──────────────────────────────────────────────────────────────────
const MODOS_PAREDE = ['sólidas', 'translúcidas', 'ocultas'];
function aplicarParedes() {
  const m = estado.paredes;
  grupo('paredes').visible = m !== 2;
  grupo('pilares').visible = m !== 2;
  for (const mat of [matParede, matMureta]) {
    mat.transparent = m === 1; mat.opacity = m === 1 ? (mat === matParede ? 0.42 : 0.6) : 1; mat.depthWrite = m !== 1;
    mat.needsUpdate = true;
  }
  $('#b-paredes').textContent = `Paredes: ${MODOS_PAREDE[m]}`;
  $('#b-paredes').classList.toggle('ativo', m !== 2);
}
function alternar(botao, chave, aplicar) {
  const b = $(botao);
  if (!b) return;
  b.classList.toggle('ativo', !!estado[chave]);
  b.addEventListener('click', () => { estado[chave] = !estado[chave]; b.classList.toggle('ativo', estado[chave]); aplicar(); });
}
function aplicarGrandes() {
  // dentro do ambiente o mínimo na tela é maior: a ideia é conferir as peças
  UD.uMin.value = (estado.grandes ? 26 : 14) + (modo === 'dentro' ? 6 : 0);
  UD.uBase.value = estado.grandes ? 1.5 : 1;
  UD.uMinInfra.value = estado.grandes ? 6 : 3;
}
$('#b-paredes').addEventListener('click', () => { estado.paredes = (estado.paredes + 1) % 3; aplicarParedes(); });
alternar('#b-corte', 'corte', () => {});
alternar('#b-ambientes', 'ambientes', () => { grupo('ambientes').visible = estado.ambientes; });
alternar('#b-etiquetas', 'etiquetas', () => {});
alternar('#b-portas', 'portas', () => { grupo('portas').visible = estado.portas; });
alternar('#b-planta', 'planta', () => { grupo('planta').visible = estado.planta; });
if (!CENA.planta) $('#b-planta')?.remove();
alternar('#b-campo', 'campo', () => { grupo('campo').visible = estado.campo; });
alternar('#b-giro', 'giro', () => { controles.autoRotate = estado.giro && modo === 'geral'; });
alternar('#b-grandes', 'grandes', aplicarGrandes);
alternar('#b-infra', 'infra', () => { gInfra.visible = estado.infra; });
if (!INFRA.length) $('#b-infra')?.remove();
grupo('campo').visible = estado.campo;
$('#b-cima').addEventListener('click', vistaDeCima);
$('#b-3d').addEventListener('click', vista3d);
$('#b-voltar')?.addEventListener('click', () => voltarVistaGeral());
$('#b-tela')?.addEventListener('click', () => { const d = document.documentElement; if (!document.fullscreenElement) d.requestFullscreen?.(); else document.exitFullscreen?.(); });

// "Ir para ambiente": lista A–Z (com a área, que separa nomes repetidos)
const seletor = $('#ir-ambiente');
if (seletor) {
  const lista = CENA.ambientes.filter(a => a.poligono.length >= 3).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }) || a.area_m2 - b.area_m2);
  if (!lista.length) seletor.remove();
  for (const a of lista) {
    const o = document.createElement('option');
    o.value = String(a.i);
    o.textContent = `${a.nome} (${br(a.area_m2, 1)} m²)`;
    seletor.appendChild(o);
  }
  seletor.addEventListener('change', () => { if (seletor.value !== '') entrarAmbiente(Number(seletor.value)); seletor.value = ''; seletor.blur(); });
}

// disciplinas: um botão por disciplina (pontos e infraestrutura dela); legenda clicável por tipo
const barraDisc = $('#disciplinas');
for (const [k, d] of Object.entries(CENA.disciplinas)) {
  const n = CENA.dispositivos.filter(t => t.disciplina === k).reduce((s, t) => s + t.itens.length, 0);
  const m = INFRA.filter(g => g.disciplina === k).reduce((s, g) => s + g.comprimento_m, 0);
  const b = document.createElement('button');
  b.className = 'ativo disc';
  b.style.setProperty('--cor', d.cor);
  b.innerHTML = `<i></i>${esc(d.rotulo)} <small>${n || !m ? n : `${br(m, 0)} m`}</small>`;
  b.addEventListener('click', () => {
    const g = grupo(`disc:${k}`);
    g.visible = !g.visible;
    if (grupos[`infra:${k}`]) grupos[`infra:${k}`].visible = g.visible;
    b.classList.toggle('ativo', g.visible);
  });
  barraDisc.appendChild(b);
}
if (!CENA.dispositivos.some(t => t.itens.some(it => Array.isArray(it[7])))) $('#b-campo')?.remove();

// ── Painéis: números do projeto e legenda ───────────────────────────────────
const N = CENA.numeros;
const cartao = (valor, unid, rotulo) => `<div class="num"><div><span>${unid}</span> ${valor}</div><small>${rotulo}</small></div>`;
$('#numeros').innerHTML = [
  cartao(br(N.area_interna_m2), 'm²', `área interna, ${N.ambientes} ambiente${N.ambientes === 1 ? '' : 's'}`),
  N.area_externa_m2 ? cartao(br(N.area_externa_m2), 'm²', `área externa (${N.ambientes_externos})`) : '',
  cartao(`${br(N.dimensoes_m[0], 1)} × ${br(N.dimensoes_m[1], 1)}`, 'm', 'dimensões gerais'),
  cartao(br(N.pe_direito_m), 'm', 'pé-direito adotado'),
  cartao(N.paredes_m.toLocaleString('pt-BR'), 'm', `de paredes (≈ ${N.paredes_area_m2.toLocaleString('pt-BR')} m² de face)`),
  cartao(N.portas, 'un', 'portas'),
  N.janelas ? cartao(N.janelas, 'un', 'janelas / esquadrias') : '',
  N.pilares ? cartao(N.pilares, 'un', 'pilares') : '',
  ...N.dispositivos.map(d => cartao(d.quantidade, 'un', esc(d.rotulo))),
  ...INFRA.map(g => cartao(br(g.comprimento_m, 1), 'm', `${esc(g.rotulo)} · ${esc(CENA.disciplinas[g.disciplina]?.rotulo || g.disciplina)}`)),
].join('');
$('#lista-ambientes').innerHTML = `<table><thead><tr><th>Ambiente</th><th>m²</th><th>perím. m</th></tr></thead><tbody>${[...N.por_ambiente].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })).map(a => `<tr><td><i style="background:${(CENA.tiposAmbiente[a.tipo] || CENA.tiposAmbiente.outros).cor}"></i>${esc(a.nome)}</td><td>${br(a.area_m2)}</td><td>${br(a.perimetro_m, 1)}</td></tr>`).join('')}</tbody></table>`;

const legenda = $('#legenda');
legenda.innerHTML = CENA.dispositivos.map((t, i) => `<button class="leg ativo" data-i="${i}" title="Mostrar/ocultar"><i class="f-${esc(t.forma)}" style="--cor:${esc(t.cor)}"></i><span>${esc(t.rotulo)}<small>${esc(CENA.disciplinas[t.disciplina]?.rotulo || '')} · ${esc(t.altura)}</small></span><b>${t.itens.length}</b></button>`).join('')
  + INFRA.map((g, i) => `<button class="leg ativo" data-infra="${i}" title="Mostrar/ocultar"><i class="f-infra f-${esc(g.forma)}" style="--cor:${esc(g.cor)}"></i><span>${esc(g.rotulo)}<small>${esc(CENA.disciplinas[g.disciplina]?.rotulo || g.disciplina)} · h = ${br(g.z)} m${g.layers?.length ? ` · ${esc(g.layers.slice(0, 2).join(', '))}` : ''}</small></span><b>${br(g.comprimento_m, 1)} m</b></button>`).join('')
  + `<div class="tipos">${[...new Set(CENA.ambientes.map(a => a.tipo))].map(k => `<span><i style="background:${CENA.tiposAmbiente[k].cor}"></i>${esc(CENA.tiposAmbiente[k].rotulo)}</span>`).join('')}</div>`;
legenda.querySelectorAll('.leg').forEach(b => b.addEventListener('click', () => {
  const o = b.dataset.infra != null ? INFRA[Number(b.dataset.infra)].objeto : CENA.dispositivos[Number(b.dataset.i)].malha;
  if (!o) return;
  o.visible = !o.visible;
  b.classList.toggle('ativo', o.visible);
}));

// ── Ponto sob o mouse/dedo (na tela, com a mesma escala do shader) ──────────
function escolherDispositivo(cx, cy) {
  const r = tela.getBoundingClientRect();
  const mx = cx - r.left, my = cy - r.top, w = r.width, h = r.height;
  let melhor = null;
  for (const t of CENA.dispositivos) {
    const m = t.malha;
    if (!m || !m.visible || !m.parent.visible) continue;
    for (const it of t.itens) {
      vTmp.set(it[0], it[2], -it[1]);
      const d = camera.position.distanceTo(vTmp);
      // dentro do ambiente: só os dele e os muito próximos (sem "ver" através da parede)
      if (modo === 'dentro' && it[5] !== atual && d > 4) continue;
      vTmp.project(camera);
      if (vTmp.z > 1 || vTmp.z < -1) continue;
      const sx = (vTmp.x + 1) / 2 * w, sy = (1 - vTmp.y) / 2 * h;
      const raio = Math.max(10, (t.tamMax * escalaDe(t.tamMax, d)) / (d * UD.uPx.value) / 2);
      const dd = Math.hypot(sx - mx, sy - my);
      if (dd <= raio && (!melhor || dd < melhor.dd - 2 || (Math.abs(dd - melhor.dd) <= 2 && d < melhor.d))) melhor = { t, it, d, dd };
    }
  }
  return melhor;
}
const dica = $('#dica');
function mostrarDica(cx, cy) {
  const p = escolherDispositivo(cx, cy);
  const r = tela.getBoundingClientRect();
  if (!p) { dica.style.display = 'none'; tela.style.cursor = ''; return false; }
  const { t, it } = p;
  const amb = CENA.ambientes[it[5]];
  dica.innerHTML = `<b>${esc(t.rotulo)}</b>${it[6] ? ` · ${esc(it[6])}` : ''}<br>${amb ? `${esc(amb.nome)} · ` : ''}${esc(alturaDoItem(t, it))}<br><small>${esc(CENA.disciplinas[t.disciplina]?.rotulo || '')}</small>`;
  dica.style.display = 'block';
  dica.style.left = `${Math.max(8, Math.min(cx - r.left + 14, r.width - 290))}px`;
  dica.style.top = `${cy - r.top + 14}px`;
  tela.style.cursor = 'pointer';
  return true;
}
let pendenteMouse = null;
tela.addEventListener('pointermove', (ev) => {
  if (ev.pointerType !== 'mouse' || ev.buttons) return;
  if (!pendenteMouse) requestAnimationFrame(() => { const e = pendenteMouse; pendenteMouse = null; if (e) mostrarDica(e.clientX, e.clientY); });
  pendenteMouse = ev;
});
// (no toque o dedo "sai" da tela logo depois de soltar: lá a dica some sozinha)
tela.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') dica.style.display = 'none'; });

// duplo clique / duplo toque: na vista geral entra no ambiente (piso ou
// etiqueta); dentro, anda até o ponto do piso (a parede na frente bloqueia)
const raio = new Raycaster();
const ndc = new Vector2();
function aoDuploClique(cx, cy) {
  if (anim) return false;
  const r = tela.getBoundingClientRect();
  const x = cx - r.left, y = cy - r.top;
  if (modo === 'geral') {
    for (const e of etiquetas) if (e.ret && x >= e.ret[0] && x <= e.ret[2] && y >= e.ret[1] && y <= e.ret[3]) return entrarAmbiente(e.a.i);
  }
  ndc.set((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1);
  raio.setFromCamera(ndc, camera);
  const alvos = modo === 'dentro' && malhaParedes && grupo('paredes').visible ? [...pisos, malhaParedes] : pisos;
  const hit = raio.intersectObjects(alvos, false)[0];
  if (!hit || hit.object === malhaParedes) return false;
  const a = hit.object.userData.ambiente;
  if (modo === 'dentro') { andarAte(hit.point.x, hit.point.z, a); return true; }
  return entrarAmbiente(a.i);
}

// ── Ponteiro: olhar em volta (dentro), toque curto = dica, duplo toque ──────
const toques = new Map();
let ultimoTipo = 'mouse', pinca = null, toqueIni = null, ultimoToque = null, tempoDica = 0;
tela.addEventListener('dblclick', (ev) => { if (ultimoTipo !== 'touch') aoDuploClique(ev.clientX, ev.clientY); });
tela.addEventListener('pointerdown', (ev) => {
  ultimoTipo = ev.pointerType;
  toques.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  toqueIni = toques.size === 1 ? { x: ev.clientX, y: ev.clientY, t: ev.timeStamp } : null;
  if (modo === 'dentro') {
    tela.setPointerCapture?.(ev.pointerId);
    if (toques.size === 2) { const [a, b] = [...toques.values()]; pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), fov: camera.fov }; }
  }
});
tela.addEventListener('pointermove', (ev) => {
  const p = toques.get(ev.pointerId);
  if (!p) return;
  const dx = ev.clientX - p.x, dy = ev.clientY - p.y;
  p.x = ev.clientX; p.y = ev.clientY;
  if (modo !== 'dentro' || anim) return;
  if (toques.size === 1) {
    // a cena acompanha o dedo: arrastar para a direita gira a cabeça para a esquerda
    const k = MathUtils.degToRad(camera.fov) / Math.max(tela.clientHeight, 1);
    yaw += dx * k;
    pitch = MathUtils.clamp(pitch + dy * k, -1.45, 1.45);
    aplicarOlhar();
  } else if (toques.size === 2 && pinca) {
    const [a, b] = [...toques.values()];
    ajustarFov(MathUtils.clamp(pinca.fov * pinca.d / Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1), 15, 90));
  }
});
tela.addEventListener('pointerup', (ev) => {
  const ini = toqueIni;
  toques.delete(ev.pointerId);
  if (toques.size < 2) pinca = null;
  if (!ini || toques.size) return;
  const curto = ev.timeStamp - ini.t < 350 && Math.hypot(ev.clientX - ini.x, ev.clientY - ini.y) < 10;
  if (!curto || ev.pointerType !== 'touch') return;
  const agora = ev.timeStamp; // hora do evento (o quadro pode atrasar o tratamento)
  if (ultimoToque && agora - ultimoToque.t < 450 && Math.hypot(ev.clientX - ultimoToque.x, ev.clientY - ultimoToque.y) < 30) {
    ultimoToque = null;
    aoDuploClique(ev.clientX, ev.clientY);
    return;
  }
  ultimoToque = { x: ev.clientX, y: ev.clientY, t: agora };
  // toque simples: dica do ponto (some sozinha)
  if (mostrarDica(ev.clientX, ev.clientY)) { clearTimeout(tempoDica); tempoDica = setTimeout(() => { dica.style.display = 'none'; }, 3000); }
});
tela.addEventListener('pointercancel', (ev) => { toques.delete(ev.pointerId); pinca = null; toqueIni = null; });
// roda: zoom de lente dentro do ambiente (na vista geral é o OrbitControls)
tela.addEventListener('wheel', (ev) => {
  if (modo !== 'dentro') return;
  ev.preventDefault();
  ajustarFov(MathUtils.clamp(camera.fov * Math.exp(ev.deltaY * 0.0012), 15, 90));
}, { passive: false });
// teclado dentro do ambiente: setas/WASD andam e giram, Esc volta
const teclas = new Set();
window.addEventListener('keydown', (ev) => {
  if (ev.target && /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return;
  if (ev.key === 'Escape' && modo === 'dentro') { voltarVistaGeral(); return; }
  if (modo === 'dentro' && /^(Arrow(Up|Down|Left|Right)|[wasdWASD])$/.test(ev.key)) { teclas.add(ev.key.toLowerCase()); ev.preventDefault(); }
});
window.addEventListener('keyup', (ev) => teclas.delete(ev.key.toLowerCase()));
window.addEventListener('blur', () => teclas.clear());
function andarPeloTeclado(dt) {
  if (modo !== 'dentro' || anim || !teclas.size) return;
  const f = (teclas.has('arrowup') || teclas.has('w') ? 1 : 0) - (teclas.has('arrowdown') || teclas.has('s') ? 1 : 0);
  const l = (teclas.has('d') ? 1 : 0) - (teclas.has('a') ? 1 : 0);
  const g = (teclas.has('arrowleft') ? 1 : 0) - (teclas.has('arrowright') ? 1 : 0);
  if (g) { yaw += g * 1.6 * dt; aplicarOlhar(); }
  if (!f && !l) return;
  const v = 1.8 * dt;
  camera.position.x += (-Math.sin(yaw) * f + Math.cos(yaw) * l) * v;
  camera.position.z += (-Math.cos(yaw) * f - Math.sin(yaw) * l) * v;
  const a = ambienteNoPonto(camera.position.x, -camera.position.z);
  if (a && a.i !== atual) { atual = a.i; trocarForro(a); mostrarPainel(a); }
}

// ── Corte e plano próximo, por quadro ───────────────────────────────────────
function atualizarCorte() {
  let k = 0;
  const alvo = anim ? alvoAnim : controles.target;
  if (estado.corte && modo !== 'dentro' && estado.paredes !== 2) {
    const dx = camera.position.x - alvo.x, dz = camera.position.z - alvo.z;
    const hor = Math.hypot(dx, dz), ver = Math.abs(camera.position.y - alvo.y);
    // quase de cima não há "frente": a planta já aparece inteira
    if (hor > 0.35 * ver && hor > 0.5) { k = 1; UC.uDir.value.set(dx / hor, dz / hor); UC.uAlvo.value.copy(alvo); }
  }
  UC.uCorte.value = k;
  const deCima = modo !== 'dentro' && camera.position.y > PD + 0.3;
  for (const m of matsTeto) { m.opacity = deCima ? 0.45 : 1; m.depthWrite = !deCima; }
  for (const f of fantasmas) f.visible = k === 1 && estado.paredes === 0;
  const dir = UC.uDir.value;
  for (const p of pilares) {
    const frente = k === 1 && (p.cx - alvo.x) * dir.x + (p.cz - alvo.z) * dir.y > UC.uMargem.value;
    p.m.scale.z = frente ? ALTURA_CORTE / PD : 1;
  }
}
// plano próximo acompanha a distância (precisão de profundidade nos modelos grandes)
function ajustarPlanoProximo() {
  const perto = modo === 'dentro' || anim ? 0.05 : MathUtils.clamp(camera.position.distanceTo(controles.target) * 0.01, 0.05, 1);
  if (Math.abs(camera.near - perto) > camera.near * 0.25) { camera.near = perto; camera.updateProjectionMatrix(); }
}

// ── Laço ────────────────────────────────────────────────────────────────────
function redimensionar() {
  const a = areaLivre();
  livre = a;
  renderer.setSize(a.w, a.h, false);
  camera.aspect = a.w / Math.max(a.h, 1);
  // o centro da imagem vai para o meio da área livre
  camera.setViewOffset(a.w, a.h, a.lateral / 2, -(a.topo - 44) / 2, a.w, a.h);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', redimensionar);
window.addEventListener('load', redimensionar);
redimensionar();
aplicarParedes();
aplicarGrandes();
vista3d();

let tAnterior = performance.now();
function desenhar(agora = performance.now()) {
  const dt = Math.min(0.1, Math.max(0, (agora - tAnterior) / 1000));
  tAnterior = agora;
  passoAnimacao(agora);
  andarPeloTeclado(dt);
  if (modo === 'geral' && !anim) controles.update();
  ajustarPlanoProximo();
  UD.uPx.value = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) / Math.max(tela.clientHeight, 1);
  atualizarCorte();
  renderer.render(cena, camera);
  atualizarEtiquetas();
  atualizarEtiquetasPontos();
}
// atalhos para captura/integração: window.HM3D.vistaDeCima(), entrarAmbiente('SALA', { instantaneo: true }) etc.
window.HM3D = {
  vista3d, vistaDeCima, entrarAmbiente, voltarVistaGeral, grupos, estado, renderer, camera, controles, cena,
  olhar: (yawGraus, pitchGraus = 0) => { if (modo !== 'dentro') return; yaw = MathUtils.degToRad(yawGraus); pitch = MathUtils.degToRad(pitchGraus); aplicarOlhar(); },
  girarCabeca: (graus, pitchGraus) => { if (modo !== 'dentro') return; yaw += MathUtils.degToRad(graus); if (pitchGraus != null) pitch = MathUtils.degToRad(pitchGraus); aplicarOlhar(); },
  lente: (fov) => ajustarFov(MathUtils.clamp(fov, 15, 90)),
  olharPara: (x, y, z) => { if (modo === 'dentro') olharPara(W(x, y, z)); },
  irPara: (x, y) => { if (modo === 'dentro') { camera.position.set(x, ALTURA_OLHOS, -y); const a = ambienteNoPonto(x, y); if (a && a.i !== atual) { atual = a.i; trocarForro(a); mostrarPainel(a); } } },
  escolherDispositivo, mostrarDica, aoDuploClique,
  get modo() { return modo; }, get ambienteAtual() { return atual; },
  render: () => desenhar(performance.now()),
};
function quadro(agora) {
  requestAnimationFrame(quadro);
  desenhar(agora);
}
requestAnimationFrame(quadro);
document.body.classList.add('pronto');
