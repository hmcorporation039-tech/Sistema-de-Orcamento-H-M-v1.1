// Visualizador do modelo 3D ilustrativo (página que o CLIENTE abre, sem internet).
// Fonte ESM: `npm run build:3d` (pasta skills) gera app.bundle.js com o three.js
// embutido, que ../visualizador3d.js insere no HTML junto com a cena (window.CENA).
// Planta (x, y) em metros → mundo three.js (x, altura, −y).
import {
  WebGLRenderer, Scene, Color, PerspectiveCamera, HemisphereLight, DirectionalLight, AmbientLight,
  BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial, LineSegments,
  EdgesGeometry, Shape, ShapeGeometry, ExtrudeGeometry, PlaneGeometry, BoxGeometry, CylinderGeometry, SphereGeometry,
  InstancedMesh, Object3D, Vector3, Vector2, Raycaster, Group, DoubleSide, SRGBColorSpace, MathUtils,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const CENA = window.CENA;
const $ = (s) => document.querySelector(s);
const br = (v, c = 2) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const PD = CENA.peDireito;

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

const camera = new PerspectiveCamera(45, 1, 0.1, diag * 20);
const controles = new OrbitControls(camera, tela);
controles.enableDamping = true;
controles.dampingFactor = 0.08;
controles.maxPolarAngle = Math.PI / 2 - 0.02;
controles.minDistance = 1;
controles.maxDistance = diag * 4;
controles.autoRotateSpeed = 0.9;

cena.add(new HemisphereLight('#ffffff', '#3a3a30', 1.6));
cena.add(new AmbientLight('#ffffff', 0.35));
const sol = new DirectionalLight('#fff4e0', 1.4);
sol.position.set(diag * 0.6, diag * 0.9, diag * 0.4);
cena.add(sol);

// ── Grupos (camadas liga/desliga) ───────────────────────────────────────────
const grupos = {};
function grupo(k) {
  if (!grupos[k]) { grupos[k] = new Group(); cena.add(grupos[k]); }
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

// pisos dos ambientes (o menor por cima: ambientes sobrepostos no desenho)
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
});

// caixas orientadas (paredes, muretas, vergas, vidros, folhas) numa geometria só
function geometriaDeCaixas(lista) {
  const pos = [], nor = [], idx = [];
  for (const [ax, ay, bx, by, esp, z0, z1] of lista) {
    const L = Math.hypot(bx - ax, by - ay);
    if (L < 1e-4 || z1 <= z0) continue;
    const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy * esp / 2, ny = ux * esp / 2;
    const c = [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
    const v = (i, z) => { const [x, y] = c[i]; return [x, z, -y]; };
    const faces = [
      [v(0, z0), v(1, z0), v(1, z1), v(0, z1), [-uy, 0, -ux]], [v(2, z0), v(3, z0), v(3, z1), v(2, z1), [uy, 0, ux]],
      [v(1, z0), v(2, z0), v(2, z1), v(1, z1), [ux, 0, -uy]], [v(3, z0), v(0, z0), v(0, z1), v(3, z1), [-ux, 0, uy]],
      [v(0, z1), v(1, z1), v(2, z1), v(3, z1), [0, 1, 0]], [v(3, z0), v(2, z0), v(1, z0), v(0, z0), [0, -1, 0]],
    ];
    for (const [p0, p1, p2, p3, n] of faces) {
      const b = pos.length / 3;
      pos.push(...p0, ...p1, ...p2, ...p3);
      for (let i = 0; i < 4; i++) nor.push(...n);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

const matParede = new MeshStandardMaterial({ color: '#ece7dc', roughness: 0.85, transparent: true, opacity: 0.42, depthWrite: false, side: DoubleSide });
const matMureta = new MeshStandardMaterial({ color: '#d9d2c3', roughness: 0.85, transparent: true, opacity: 0.6, depthWrite: false, side: DoubleSide });
const matVidro = new MeshStandardMaterial({ color: '#8ec9ff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false, side: DoubleSide });
const matAresta = new LineBasicMaterial({ color: '#f4efe4', transparent: true, opacity: 0.55 });

function caixas(lista, mat, chave, comArestas = true) {
  if (!lista.length) return;
  const g = geometriaDeCaixas(lista);
  const m = new Mesh(g, mat);
  m.renderOrder = 2;
  grupo(chave).add(m);
  if (comArestas) {
    const e = new LineSegments(new EdgesGeometry(g, 30), matAresta);
    e.renderOrder = 3;
    grupo(chave).add(e);
  }
}
caixas(CENA.paredes, matParede, 'paredes');
caixas(CENA.muretas, matMureta, 'paredes');
caixas(CENA.guardas, matVidro, 'paredes');
caixas(CENA.vidros, matVidro, 'paredes', false);
// pilares
const matPilar = new MeshStandardMaterial({ color: '#a5a39c', roughness: 0.8 });
for (const p of CENA.pilares) {
  if (p.length < 3) continue;
  const g = new ExtrudeGeometry(new Shape(p.map(([x, y]) => new Vector2(x, y))), { depth: PD, bevelEnabled: false });
  const m = new Mesh(g, matPilar);
  m.rotation.x = -Math.PI / 2;
  grupo('pilares').add(m);
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
caixas(CENA.folhas.map(([ax, ay, bx, by]) => [ax, ay, bx, by, 0.04, 0, CENA.alturaPorta]), new MeshStandardMaterial({ color: '#b08457', roughness: 0.7, transparent: true, opacity: 0.85 }), 'portas', false);

// ── Dispositivos ─────────────────────────────────────────────────────────────
// forma → geometria (m); o eixo +Z local aponta para fora da parede
const FORMAS = {
  tomada: () => new BoxGeometry(0.12, 0.12, 0.05), interruptor: () => new BoxGeometry(0.09, 0.13, 0.04),
  quadro: () => new BoxGeometry(0.5, 0.7, 0.12), rack: () => new BoxGeometry(0.6, 0.6, 0.5), caixa: () => new BoxGeometry(0.18, 0.18, 0.08),
  barra: () => new BoxGeometry(0.3, 0.06, 0.05), luminaria: () => new BoxGeometry(0.62, 0.62, 0.04), 'ponto-luz': () => new CylinderGeometry(0.15, 0.15, 0.05, 20).rotateX(Math.PI / 2),
  sensor: () => new SphereGeometry(0.09, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2), detector: () => new CylinderGeometry(0.11, 0.11, 0.06, 20).rotateX(Math.PI / 2),
  camera: () => new BoxGeometry(0.11, 0.11, 0.3).translate(0, 0, 0.12), 'sensor-canto': () => new BoxGeometry(0.09, 0.13, 0.07), catraca: () => new BoxGeometry(0.3, 1.0, 0.8).translate(0, 0.5, 0),
};
const ESCALA_BASE = MathUtils.clamp(diag / 22, 1.3, 3);
let escalaSimbolos = ESCALA_BASE;
const malhasDispositivos = [];
const o3 = new Object3D();
const eixoZ = new Vector3(0, 0, 1);

function posicionarInstancias(t, mesh) {
  t.itens.forEach(([x, y, z, nx, ny], i) => {
    o3.position.set(x, z, -y);
    o3.quaternion.identity();
    o3.rotation.set(0, 0, 0);
    if (t.forma === 'luminaria' || t.forma === 'ponto-luz' || t.forma === 'detector' || t.forma === 'sensor') {
      o3.quaternion.setFromUnitVectors(eixoZ, new Vector3(0, -1, 0)); // face para baixo, no teto
    } else if (t.forma === 'catraca') {
      // no piso
    } else if (nx || ny) {
      const d = new Vector3(nx, 0, -ny).normalize();
      if (t.forma === 'camera' || t.forma === 'sensor-canto') d.y = -0.45; // inclinada para baixo
      o3.quaternion.setFromUnitVectors(eixoZ, d.normalize());
    }
    const s = ['luminaria', 'quadro', 'rack', 'catraca'].includes(t.forma) ? 1 : ['ponto-luz', 'detector', 'sensor'].includes(t.forma) ? Math.max(1, escalaSimbolos * 0.65) : escalaSimbolos;
    o3.scale.set(s, s, s);
    o3.updateMatrix();
    mesh.setMatrixAt(i, o3.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

for (const t of CENA.dispositivos) {
  if (!t.itens.length) continue;
  const brilho = ['luminaria', 'ponto-luz'].includes(t.forma);
  const mat = new MeshStandardMaterial({ color: t.cor, emissive: t.cor, emissiveIntensity: brilho ? 0.9 : 0.35, roughness: 0.5 });
  const mesh = new InstancedMesh((FORMAS[t.forma] || FORMAS.caixa)(), mat, t.itens.length);
  mesh.userData = { tipo: t };
  mesh.renderOrder = 1;
  posicionarInstancias(t, mesh);
  grupo(`disc:${t.disciplina}`).add(mesh);
  malhasDispositivos.push(mesh);
  t.malha = mesh;
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

// ── Etiquetas dos ambientes (HTML sobre o 3D) ───────────────────────────────
const camadaEtiquetas = $('#etiquetas');
const etiquetas = CENA.ambientes.map(a => {
  const el = document.createElement('div');
  el.className = 'etq';
  el.innerHTML = `<b>${esc(a.nome)}</b><span>${br(a.area_m2)} m²</span>`;
  camadaEtiquetas.appendChild(el);
  return { a, el, p: W(a.centro[0], a.centro[1], 0.05), lado: Math.sqrt(a.area_m2) };
}).sort((p, q) => q.a.area_m2 - p.a.area_m2);
const vTmp = new Vector3();
function atualizarEtiquetas() {
  if (!estado.etiquetas) { camadaEtiquetas.style.display = 'none'; return; }
  camadaEtiquetas.style.display = '';
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
    if (mostrar) e.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
}

// ── Câmera: perspectiva, vista de cima, giro ────────────────────────────────
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
  ajustarFov(45);
  const a = areaLivre();
  const k = Math.max(1, (a.w / a.livreW) * 0.85);
  camera.position.copy(centro).add(new Vector3(diag * 0.42 * k, diag * 0.5 * k, diag * 0.58 * k));
  controles.target.copy(centro);
  controles.update();
}
function vistaDeCima() {
  ajustarFov(30);
  const a = areaLivre();
  const t = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2));
  const d = Math.max((larg * a.w) / (a.livreW * t * camera.aspect), (prof * a.h) / (a.livreH * t)) * 1.04;
  camera.position.copy(centro).add(new Vector3(0, d + PD, 0.001));
  controles.target.copy(centro);
  controles.update();
}

// ── Estado e botões ─────────────────────────────────────────────────────────
const estado = { paredes: 0, ambientes: true, etiquetas: true, portas: true, planta: true, campo: false, giro: false, grandes: false };
const MODOS_PAREDE = ['translúcidas', 'sólidas', 'ocultas'];
function aplicarParedes() {
  const m = estado.paredes;
  grupo('paredes').visible = m !== 2;
  grupo('pilares').visible = m !== 2;
  matParede.opacity = m === 1 ? 1 : 0.42; matParede.transparent = m !== 1; matParede.depthWrite = m === 1;
  matMureta.opacity = m === 1 ? 1 : 0.6; matMureta.transparent = m !== 1; matMureta.depthWrite = m === 1;
  matParede.needsUpdate = matMureta.needsUpdate = true;
  $('#b-paredes').textContent = `Paredes: ${MODOS_PAREDE[m]}`;
  $('#b-paredes').classList.toggle('ativo', m !== 2);
}
function alternar(botao, chave, aplicar) {
  const b = $(botao);
  if (!b) return;
  b.classList.toggle('ativo', !!estado[chave]);
  b.addEventListener('click', () => { estado[chave] = !estado[chave]; b.classList.toggle('ativo', estado[chave]); aplicar(); });
}
$('#b-paredes').addEventListener('click', () => { estado.paredes = (estado.paredes + 1) % 3; aplicarParedes(); });
alternar('#b-ambientes', 'ambientes', () => { grupo('ambientes').visible = estado.ambientes; });
alternar('#b-etiquetas', 'etiquetas', () => {});
alternar('#b-portas', 'portas', () => { grupo('portas').visible = estado.portas; });
alternar('#b-planta', 'planta', () => { grupo('planta').visible = estado.planta; });
if (!CENA.planta) $('#b-planta')?.remove();
alternar('#b-campo', 'campo', () => { grupo('campo').visible = estado.campo; });
alternar('#b-giro', 'giro', () => { controles.autoRotate = estado.giro; });
alternar('#b-grandes', 'grandes', () => {
  escalaSimbolos = ESCALA_BASE * (estado.grandes ? 2 : 1);
  for (const m of malhasDispositivos) posicionarInstancias(m.userData.tipo, m);
});
grupo('campo').visible = estado.campo;
$('#b-cima').addEventListener('click', vistaDeCima);
$('#b-3d').addEventListener('click', vista3d);
$('#b-tela')?.addEventListener('click', () => { const d = document.documentElement; if (!document.fullscreenElement) d.requestFullscreen?.(); else document.exitFullscreen?.(); });

// disciplinas: um botão por disciplina; legenda clicável por tipo
const barraDisc = $('#disciplinas');
for (const [k, d] of Object.entries(CENA.disciplinas)) {
  const n = CENA.dispositivos.filter(t => t.disciplina === k).reduce((s, t) => s + t.itens.length, 0);
  const b = document.createElement('button');
  b.className = 'ativo disc';
  b.style.setProperty('--cor', d.cor);
  b.innerHTML = `<i></i>${esc(d.rotulo)} <small>${n}</small>`;
  b.addEventListener('click', () => { const g = grupo(`disc:${k}`); g.visible = !g.visible; b.classList.toggle('ativo', g.visible); });
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
  ...N.dispositivos.map(d => cartao(d.quantidade, 'un', d.rotulo)),
].join('');
$('#lista-ambientes').innerHTML = `<table><thead><tr><th>Ambiente</th><th>m²</th><th>perím. m</th></tr></thead><tbody>${[...N.por_ambiente].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })).map(a => `<tr><td><i style="background:${(CENA.tiposAmbiente[a.tipo] || CENA.tiposAmbiente.outros).cor}"></i>${esc(a.nome)}</td><td>${br(a.area_m2)}</td><td>${br(a.perimetro_m, 1)}</td></tr>`).join('')}</tbody></table>`;

const legenda = $('#legenda');
legenda.innerHTML = CENA.dispositivos.map((t, i) => `<button class="leg ativo" data-i="${i}" title="Mostrar/ocultar"><i class="f-${t.forma}" style="--cor:${t.cor}"></i><span>${esc(t.rotulo)}<small>${esc(CENA.disciplinas[t.disciplina]?.rotulo || '')} · ${esc(t.altura)}</small></span><b>${t.itens.length}</b></button>`).join('')
  + `<div class="tipos">${[...new Set(CENA.ambientes.map(a => a.tipo))].map(k => `<span><i style="background:${CENA.tiposAmbiente[k].cor}"></i>${esc(CENA.tiposAmbiente[k].rotulo)}</span>`).join('')}</div>`;
legenda.querySelectorAll('.leg').forEach(b => b.addEventListener('click', () => {
  const t = CENA.dispositivos[Number(b.dataset.i)];
  t.malha.visible = !t.malha.visible;
  b.classList.toggle('ativo', t.malha.visible);
}));

// ── Dica ao passar o mouse ──────────────────────────────────────────────────
const raio = new Raycaster();
const mouse = new Vector2();
const dica = $('#dica');
tela.addEventListener('pointermove', (ev) => {
  const r = tela.getBoundingClientRect();
  mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raio.setFromCamera(mouse, camera);
  const vis = malhasDispositivos.filter(m => m.visible && m.parent.visible);
  const hit = raio.intersectObjects(vis, false)[0];
  if (hit && hit.instanceId != null) {
    const t = hit.object.userData.tipo;
    const it = t.itens[hit.instanceId];
    const amb = CENA.ambientes[it[5]];
    dica.innerHTML = `<b>${esc(t.rotulo)}</b>${it[6] ? ` · ${esc(it[6])}` : ''}<br>${amb ? `${esc(amb.nome)} · ` : ''}${esc(t.altura === 'no alto do canto' || /teto|porta|piso/.test(t.altura) ? t.altura : `h = ${br(it[2])} m`)}`;
    dica.style.display = 'block';
    dica.style.left = `${ev.clientX - r.left + 14}px`;
    dica.style.top = `${ev.clientY - r.top + 14}px`;
    tela.style.cursor = 'pointer';
  } else { dica.style.display = 'none'; tela.style.cursor = ''; }
});
tela.addEventListener('pointerleave', () => { dica.style.display = 'none'; });

// ── Laço ────────────────────────────────────────────────────────────────────
let livre = { lateral: 0, topo: 0 };
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
vista3d();
// atalhos para captura/integração: window.HM3D.vistaDeCima() etc.
window.HM3D = { vista3d, vistaDeCima, grupos, estado, renderer, camera, controles, cena, render: () => { controles.update(); renderer.render(cena, camera); atualizarEtiquetas(); } };
function quadro() {
  requestAnimationFrame(quadro);
  controles.update();
  renderer.render(cena, camera);
  atualizarEtiquetas();
}
quadro();
document.body.classList.add('pronto');
