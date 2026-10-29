// Visualizador 3D de QUADRO ELÉTRICO (skills/quadros → documento "modelo3d").
// Entra pelo mesmo bundle do modelo de prédio (./app.js despacha por
// window.CENA.tipo === 'quadro'); a página é montada pela skill com o shell
// e o CSS de ../visualizador3d.js.
//
// Cena em milímetros, origem no canto inferior-esquerdo-FUNDO do invólucro:
// x para a direita, y para cima, z para a frente (porta em z = P). Cada peça é
// uma caixa (ou cilindro) com as medidas reais L × A × P do dispositivo.
//   cena = { tipo: 'quadro', titulo, cliente, obra, data,
//            involucro: { L, A, P, espessura, cor }, porta: { itens: [...] },
//            caixas: [{ camada, x, y, z, l, a, p, cor, opacidade, forma, metal, rotulo, info: [[k, v]] }],
//            camadas: [{ id, rotulo, cor }], numeros: [[rotulo, valor]], avisos }
// Itens da porta usam x, y no plano da frente e z a partir da face externa.
import {
  WebGLRenderer, Scene, Color, PerspectiveCamera, HemisphereLight, DirectionalLight, AmbientLight,
  BoxGeometry, CylinderGeometry, EdgesGeometry, Mesh, MeshStandardMaterial, LineSegments, LineBasicMaterial,
  Group, Raycaster, Vector2, Vector3, SRGBColorSpace,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const M = 0.001;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function iniciarQuadro(C) {
  const $ = (s) => document.querySelector(s);
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

  const { L, A, P } = C.involucro;
  const esp = C.involucro.espessura || 2;
  const diag = Math.hypot(L, A, P) * M;
  const centro = new Vector3(L * M / 2, A * M / 2, P * M / 2);
  const camera = new PerspectiveCamera(38, 1, 0.01, diag * 40);
  const controles = new OrbitControls(camera, tela);
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;
  controles.target.copy(centro);
  controles.minDistance = 0.1;
  controles.maxDistance = diag * 8;
  controles.zoomToCursor = true;

  cena.add(new HemisphereLight('#ffffff', '#55524a', 1.5));
  cena.add(new AmbientLight('#ffffff', 0.55));
  const sol = new DirectionalLight('#fff4e0', 1.3);
  sol.position.set(L * M * 1.5, A * M * 2, P * M * 6 + 1);
  cena.add(sol);
  const sol2 = new DirectionalLight('#dfe8ff', 0.5);
  sol2.position.set(-L * M, A * M, P * M * 3);
  cena.add(sol2);

  // ── camadas ────────────────────────────────────────────────────────────
  const grupos = {};
  const grupo = (id, pai = cena) => { if (!grupos[id]) { grupos[id] = new Group(); grupos[id].name = id; pai.add(grupos[id]); } return grupos[id]; };
  const clicaveis = [];
  const etiquetas = [];
  const portaGrupo = new Group();

  function peca(b, pai, origem = new Vector3()) {
    const l = Math.max(0.5, b.l) * M, a = Math.max(0.5, b.a) * M, p = Math.max(0.5, b.p) * M;
    let geo;
    if (b.forma === 'cilindro') {
      geo = new CylinderGeometry(l / 2, l / 2, p, 28);
      geo.rotateX(Math.PI / 2);
    } else {
      geo = new BoxGeometry(l, a, p);
    }
    const op = b.opacidade ?? 1;
    const mat = new MeshStandardMaterial({ color: b.cor || '#cccccc', roughness: b.metal ? 0.35 : 0.65, metalness: b.metal ? 0.65 : 0.05, transparent: op < 1, opacity: op, depthWrite: op >= 0.99 });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(origem.x + (b.x * M) + l / 2, origem.y + (b.y * M) + a / 2, origem.z + (b.z * M) + p / 2);
    if (!b.semBorda) {
      const cor = new Color(b.cor || '#cccccc').multiplyScalar(0.45);
      const ar = new LineSegments(new EdgesGeometry(geo), new LineBasicMaterial({ color: cor, transparent: op < 1, opacity: Math.min(1, op + 0.25) }));
      mesh.add(ar);
    }
    mesh.userData = b;
    if (b.info) clicaveis.push(mesh);
    if (b.rotulo) etiquetas.push({ mesh, texto: b.rotulo, camada: b.camada, el: null, porta: pai === portaGrupo || pai.parent === portaGrupo });
    pai.add(mesh);
    return mesh;
  }

  // invólucro (fundo, laterais, teto e base) — chapa com a espessura informada
  const corEnv = C.involucro.cor || '#d6d4cf';
  const involucro = grupo('involucro');
  [
    { x: 0, y: 0, z: 0, l: L, a: A, p: esp },
    { x: 0, y: 0, z: 0, l: esp, a: A, p: P },
    { x: L - esp, y: 0, z: 0, l: esp, a: A, p: P },
    { x: 0, y: A - esp, z: 0, l: L, a: esp, p: P },
    { x: 0, y: 0, z: 0, l: L, a: esp, p: P },
  ].forEach(b => peca({ ...b, cor: corEnv, camada: 'involucro' }, involucro));

  // porta: articulada à esquerda (eixo vertical em x = 0, z = P)
  portaGrupo.position.set(0, 0, P * M);
  cena.add(portaGrupo);
  grupos.porta = portaGrupo;
  peca({ x: 0, y: 0, z: 0, l: L, a: A, p: esp, cor: corEnv, camada: 'porta' }, portaGrupo);
  for (const it of (C.porta && C.porta.itens) || []) peca({ ...it, z: esp + (it.z || 0), camada: 'porta' }, portaGrupo);

  // conteúdo
  for (const b of C.caixas || []) peca(b, grupo(b.camada || 'outros'));

  // ── porta: abrir/fechar com animação ───────────────────────────────────
  const ABERTA = -Math.PI * 0.58;
  let anguloAlvo = C.portaAberta === false ? 0 : ABERTA;
  portaGrupo.rotation.y = anguloAlvo;
  const portaAberta = () => Math.abs(portaGrupo.rotation.y) > 0.2;

  // ── vistas ─────────────────────────────────────────────────────────────
  let anim = null;
  function irPara(pos, alvo, ms = 700) {
    const p0 = camera.position.clone(), t0 = controles.target.clone(), ini = performance.now();
    anim = (agora) => {
      const k = Math.min(1, (agora - ini) / ms), s = k * k * (3 - 2 * k);
      camera.position.lerpVectors(p0, pos, s);
      controles.target.lerpVectors(t0, alvo, s);
      if (k >= 1) anim = null;
    };
  }
  // folga para o cabeçalho, a barra e o painel lateral da página
  const distFrente = () => Math.max(A * M, (L * M) / Math.max(0.3, camera.aspect * 0.72)) / (2 * Math.tan((camera.fov * Math.PI / 180) / 2)) * 1.42 + P * M;
  function vistaFrente(instantaneo) {
    const dx = window.innerWidth > 900 ? L * M * 0.35 : 0; // o painel da direita cobre parte da tela
    const alvo = new Vector3(L * M / 2 + dx, A * M / 2 + A * M * 0.03, P * M * 0.3);
    const pos = new Vector3(L * M / 2 + dx, A * M / 2 + A * M * 0.03, distFrente());
    if (instantaneo) { camera.position.copy(pos); controles.target.copy(alvo); } else irPara(pos, alvo);
  }
  function vista3d(instantaneo) {
    const d = distFrente() * 1.05;
    const alvo = centro.clone().add(new Vector3(window.innerWidth > 900 ? L * M * 0.3 : 0, 0, 0));
    const pos = new Vector3(L * M / 2 + d * 0.38, A * M * 0.6 + d * 0.2, d * 0.95);
    if (instantaneo) { camera.position.copy(pos); controles.target.copy(alvo); } else irPara(pos, alvo);
  }
  function mostrar(id, sim) {
    if (grupos[id]) grupos[id].visible = sim;
    document.querySelectorAll(`[data-camada="${id}"]`).forEach(b => b.classList.toggle('ativo', sim));
  }
  function abrirPorta(sim = true) { anguloAlvo = sim ? ABERTA : 0; $('#b-porta') && $('#b-porta').classList.toggle('ativo', sim); }
  function soPlaca(sim = true) {
    mostrar('involucro', !sim); mostrar('porta', !sim);
    $('#b-placa') && $('#b-placa').classList.toggle('ativo', sim);
  }

  // ── interface ──────────────────────────────────────────────────────────
  const barra = $('#camadas');
  for (const c of C.camadas || []) {
    const b = document.createElement('button');
    b.className = 'leg ativo';
    b.dataset.camada = c.id;
    b.style.setProperty('--cor', c.cor);
    b.innerHTML = `<i></i><span>${esc(c.rotulo)}${c.qtd != null ? ` <small>${esc(c.qtd)}</small>` : ''}</span>`;
    b.onclick = () => mostrar(c.id, !(grupos[c.id] ? grupos[c.id].visible : true));
    barra && barra.appendChild(b);
  }
  const num = $('#numeros');
  if (num) num.innerHTML = (C.numeros || []).map(([r, v]) => `<div class="num"><div>${esc(v)}</div><small>${esc(r)}</small></div>`).join('');
  const liga = (id, fn) => { const b = $(id); if (b) b.onclick = fn; };
  liga('#b-porta', () => abrirPorta(anguloAlvo === 0));
  liga('#b-sem-porta', () => { const v = !grupos.porta.visible; mostrar('porta', v); $('#b-sem-porta').classList.toggle('ativo', !v); });
  liga('#b-involucro', () => { const v = !grupos.involucro.visible; mostrar('involucro', v); $('#b-involucro').classList.toggle('ativo', !v); });
  liga('#b-frente', () => vistaFrente());
  liga('#b-3d', () => vista3d());
  liga('#b-placa', () => { const s = !$('#b-placa').classList.contains('ativo'); soPlaca(s); if (s) vistaFrente(); });
  let mostrarEtq = true;
  liga('#b-etiquetas', () => { mostrarEtq = !mostrarEtq; $('#b-etiquetas').classList.toggle('ativo', mostrarEtq); });
  $('#b-etiquetas') && $('#b-etiquetas').classList.add('ativo');
  $('#b-porta') && $('#b-porta').classList.toggle('ativo', anguloAlvo !== 0);
  liga('#b-tela', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); });

  // seleção: clique numa peça → dados (TAG, fabricante, referência, medidas, fonte)
  const ray = new Raycaster();
  const ptr = new Vector2();
  let selecionado = null;
  function visivel(o) { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; }
  function escolher(ev) {
    const r = tela.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(clicaveis.filter(visivel), false)[0];
    if (selecionado) { selecionado.material.emissive && selecionado.material.emissive.set('#000000'); selecionado = null; }
    const info = $('#info');
    if (!hit) { if (info) info.innerHTML = '<small>Clique num dispositivo para ver TAG, fabricante, referência e medidas.</small>'; return; }
    selecionado = hit.object;
    selecionado.material.emissive.set('#5a4500');
    const b = selecionado.userData;
    if (info) info.innerHTML = `<b class="tag">${esc(b.rotulo || '')}</b><table>${(b.info || []).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${/^https?:/.test(String(v)) ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(v)}</td></tr>`).join('')}</table>`;
  }
  let baixo = null;
  tela.addEventListener('pointerdown', (e) => { baixo = [e.clientX, e.clientY]; });
  tela.addEventListener('pointerup', (e) => { if (baixo && Math.hypot(e.clientX - baixo[0], e.clientY - baixo[1]) < 5) escolher(e); baixo = null; });

  // etiquetas HTML (TAG) projetadas na tela
  const caixaEtq = $('#etiquetas');
  for (const e of etiquetas) {
    e.el = document.createElement('div');
    e.el.className = 'etq-q';
    e.el.textContent = e.texto;
    caixaEtq && caixaEtq.appendChild(e.el);
  }
  const v3 = new Vector3();
  function atualizarEtiquetas() {
    const w = tela.clientWidth, h = tela.clientHeight;
    const dist = camera.position.distanceTo(controles.target);
    const tanF = 2 * Math.tan((camera.fov * Math.PI / 180) / 2);
    for (const e of etiquetas) {
      // etiqueta da porta só com a porta fechada; as de dentro, com a porta aberta ou oculta
      let vis = mostrarEtq && visivel(e.mesh) && (e.porta ? !portaAberta() : (portaAberta() || !grupos.porta.visible)) && dist < diag * 3.2;
      if (vis) {
        // só quando a peça tem tamanho na tela para caber o texto (aproxime para ver as menores)
        e.mesh.getWorldPosition(v3);
        const pxPorM = h / (tanF * Math.max(0.05, camera.position.distanceTo(v3)));
        const lg = (e.mesh.geometry.parameters.width || e.mesh.geometry.parameters.radiusTop * 2 || 0);
        vis = lg * pxPorM >= Math.min(60, e.texto.length * 5.6) * 0.8;
      }
      if (!vis) { e.el.style.display = 'none'; continue; }
      e.mesh.getWorldPosition(v3);
      v3.z += (e.mesh.geometry.parameters.depth || 0) / 2;
      v3.project(camera);
      if (v3.z > 1) { e.el.style.display = 'none'; continue; }
      e.el.style.display = 'block';
      e.el.style.transform = `translate(${((v3.x + 1) / 2) * w}px, ${((1 - v3.y) / 2) * h}px) translate(-50%, -50%)`;
    }
  }

  function redimensionar() {
    const w = tela.clientWidth || window.innerWidth, h = tela.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', redimensionar);
  redimensionar();
  vista3d(true);

  function desenhar(agora) {
    if (anim) anim(agora);
    const d = anguloAlvo - portaGrupo.rotation.y;
    if (Math.abs(d) > 1e-3) portaGrupo.rotation.y += d * 0.12; else portaGrupo.rotation.y = anguloAlvo;
    controles.update();
    renderer.render(cena, camera);
    atualizarEtiquetas();
  }
  // atalhos para captura/integração
  window.HM3D = {
    tipo: 'quadro', grupos, camera, controles, cena, renderer,
    abrirPorta: (s = true) => { abrirPorta(s); portaGrupo.rotation.y = anguloAlvo; },
    vistaFrente: () => { vistaFrente(true); }, vista3d: () => { vista3d(true); }, soPlaca: (s = true) => soPlaca(s),
    mostrar, etiquetas: (s) => { mostrarEtq = s; }, render: () => { anim = null; desenhar(performance.now()); },
  };
  function quadroAnim(agora) { requestAnimationFrame(quadroAnim); desenhar(agora); }
  requestAnimationFrame(quadroAnim);
  document.body.classList.add('pronto');
}
