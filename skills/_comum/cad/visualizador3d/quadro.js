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
//
// Desempenho (correção de 29/10/2026): o quadro tem centenas de peças. Antes
// cada uma criava geometria, arestas e material próprios e a cena era
// redesenhada em todo quadro de animação — no WebGL por software (SwiftShader,
// máquinas sem GPU) o primeiro desenho estourava o tempo, o navegador
// derrubava o contexto ("context lost") e a vista inicial ficava VAZIA, só com
// as etiquetas. Agora: UMA geometria unitária de caixa e de cilindro escalada
// por peça, materiais em cache por cor/opacidade, compilação dos shaders
// antes do 1º desenho, desenho só quando algo muda e redesenho ao restaurar
// o contexto.
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
  let sujo = true; // há o que redesenhar
  const pedirDesenho = () => { sujo = true; };

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
  controles.addEventListener('change', pedirDesenho);

  cena.add(new HemisphereLight('#ffffff', '#55524a', 1.5));
  cena.add(new AmbientLight('#ffffff', 0.55));
  const sol = new DirectionalLight('#fff4e0', 1.3);
  sol.position.set(L * M * 1.5, A * M * 2, P * M * 6 + 1);
  cena.add(sol);
  const sol2 = new DirectionalLight('#dfe8ff', 0.5);
  sol2.position.set(-L * M, A * M, P * M * 3);
  cena.add(sol2);

  // ── geometrias e materiais compartilhados ─────────────────────────────
  const GEO = { caixa: new BoxGeometry(1, 1, 1), cilindro: new CylinderGeometry(0.5, 0.5, 1, 28) };
  GEO.cilindro.rotateX(Math.PI / 2);
  const ARESTAS = { caixa: new EdgesGeometry(GEO.caixa) };
  const mats = new Map();
  function material(cor, op, metal) {
    const k = `${cor}|${op}|${metal ? 1 : 0}`;
    if (!mats.has(k)) mats.set(k, new MeshStandardMaterial({ color: cor, roughness: metal ? 0.35 : 0.65, metalness: metal ? 0.65 : 0.05, transparent: op < 1, opacity: op, depthWrite: op >= 0.99 }));
    return mats.get(k);
  }
  const linhas = new Map();
  function materialAresta(cor, op) {
    const k = `${cor}|${op}`;
    if (!linhas.has(k)) linhas.set(k, new LineBasicMaterial({ color: new Color(cor).multiplyScalar(0.45), transparent: op < 1, opacity: Math.min(1, op + 0.25) }));
    return linhas.get(k);
  }

  // ── camadas ────────────────────────────────────────────────────────────
  const grupos = {};
  const grupo = (id, pai = cena) => { if (!grupos[id]) { grupos[id] = new Group(); grupos[id].name = id; pai.add(grupos[id]); } return grupos[id]; };
  const clicaveis = [];
  const etiquetas = [];
  const portaGrupo = new Group();

  function peca(b, pai) {
    const l = Math.max(0.5, b.l) * M, a = Math.max(0.5, b.a) * M, p = Math.max(0.5, b.p) * M;
    const forma = b.forma === 'cilindro' ? 'cilindro' : 'caixa';
    const op = b.opacidade ?? 1;
    const cor = b.cor || '#cccccc';
    const mesh = new Mesh(GEO[forma], material(cor, op, b.metal));
    mesh.scale.set(l, forma === 'cilindro' ? l : a, p);
    mesh.position.set(b.x * M + l / 2, b.y * M + a / 2, b.z * M + p / 2);
    if (!b.semBorda && forma === 'caixa') mesh.add(new LineSegments(ARESTAS.caixa, materialAresta(cor, op)));
    mesh.userData = b;
    if (b.info) clicaveis.push(mesh);
    if (b.rotulo) etiquetas.push({ mesh, texto: b.rotulo, el: null, porta: pai === portaGrupo });
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
  ].forEach(b => peca({ ...b, cor: corEnv }, involucro));

  // porta: articulada à esquerda (eixo vertical em x = 0, z = P)
  portaGrupo.position.set(0, 0, P * M);
  cena.add(portaGrupo);
  grupos.porta = portaGrupo;
  peca({ x: 0, y: 0, z: 0, l: L, a: A, p: esp, cor: corEnv }, portaGrupo);
  for (const it of (C.porta && C.porta.itens) || []) peca({ ...it, z: esp + (it.z || 0) }, portaGrupo);

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
    pedirDesenho();
  }
  // folga para o cabeçalho, a barra e o painel lateral da página
  const distFrente = () => Math.max(A * M, (L * M) / Math.max(0.3, camera.aspect * 0.72)) / (2 * Math.tan((camera.fov * Math.PI / 180) / 2)) * 1.42 + P * M;
  function vistaFrente(instantaneo) {
    const dx = window.innerWidth > 900 ? L * M * 0.35 : 0; // o painel da direita cobre parte da tela
    const alvo = new Vector3(L * M / 2 + dx, A * M / 2 + A * M * 0.03, P * M * 0.3);
    const pos = new Vector3(L * M / 2 + dx, A * M / 2 + A * M * 0.03, distFrente());
    if (instantaneo) { camera.position.copy(pos); controles.target.copy(alvo); pedirDesenho(); } else irPara(pos, alvo);
  }
  function vista3d(instantaneo) {
    const d = distFrente() * 1.05;
    const alvo = centro.clone().add(new Vector3(window.innerWidth > 900 ? L * M * 0.3 : 0, 0, 0));
    const pos = new Vector3(L * M / 2 + d * 0.38, A * M * 0.6 + d * 0.2, d * 0.95);
    if (instantaneo) { camera.position.copy(pos); controles.target.copy(alvo); pedirDesenho(); } else irPara(pos, alvo);
  }
  function mostrar(id, sim) {
    if (grupos[id]) grupos[id].visible = sim;
    document.querySelectorAll(`[data-camada="${id}"]`).forEach(b => b.classList.toggle('ativo', sim));
    pedirDesenho();
  }
  function abrirPorta(sim = true) { anguloAlvo = sim ? ABERTA : 0; $('#b-porta') && $('#b-porta').classList.toggle('ativo', sim); pedirDesenho(); }
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
  liga('#b-etiquetas', () => { mostrarEtq = !mostrarEtq; $('#b-etiquetas').classList.toggle('ativo', mostrarEtq); pedirDesenho(); });
  $('#b-etiquetas') && $('#b-etiquetas').classList.add('ativo');
  $('#b-porta') && $('#b-porta').classList.toggle('ativo', anguloAlvo !== 0);
  liga('#b-tela', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); });

  // seleção: clique numa peça → dados (TAG, fabricante, referência, medidas, fonte);
  // passar o mouse mostra a TAG (útil nas peças estreitas, sem etiqueta fixa)
  const ray = new Raycaster();
  const ptr = new Vector2();
  let selecionado = null;
  function visivel(o) { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; }
  function apontado(ev) {
    const r = tela.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    return ray.intersectObjects(clicaveis.filter(visivel), false)[0] || null;
  }
  function escolher(ev) {
    const hit = apontado(ev);
    if (selecionado) { selecionado.material = selecionado.userData.__mat; selecionado = null; }
    const info = $('#info');
    pedirDesenho();
    if (!hit) { if (info) info.innerHTML = '<small>Clique num dispositivo para ver TAG, fabricante, referência e medidas.</small>'; return; }
    selecionado = hit.object;
    selecionado.userData.__mat = selecionado.material;
    selecionado.material = selecionado.material.clone();
    selecionado.material.emissive.set('#5a4500');
    const b = selecionado.userData;
    if (info) info.innerHTML = `<b class="tag">${esc(b.rotulo || '')}</b><table>${(b.info || []).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${/^https?:/.test(String(v)) ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(v)}</td></tr>`).join('')}</table>`;
  }
  let baixo = null;
  tela.addEventListener('pointerdown', (e) => { baixo = [e.clientX, e.clientY]; });
  tela.addEventListener('pointerup', (e) => { if (baixo && Math.hypot(e.clientX - baixo[0], e.clientY - baixo[1]) < 5) escolher(e); baixo = null; });
  const dica = document.createElement('div');
  dica.className = 'etq-q etq-dica';
  dica.style.display = 'none';
  document.body.appendChild(dica);
  let ultimoMov = 0;
  tela.addEventListener('pointermove', (e) => {
    if (e.buttons) { dica.style.display = 'none'; return; }
    const agora = performance.now();
    if (agora - ultimoMov < 60) return;
    ultimoMov = agora;
    const hit = apontado(e);
    const t = hit && hit.object.userData.rotulo;
    if (!t) { dica.style.display = 'none'; return; }
    dica.textContent = t;
    dica.style.display = 'block';
    dica.style.transform = `translate(${e.clientX + 12}px, ${e.clientY - 26}px)`;
  });
  tela.addEventListener('pointerleave', () => { dica.style.display = 'none'; });

  // etiquetas HTML (TAG) projetadas na tela: só quando a peça, na tela, é
  // larga o bastante para a etiqueta — as estreitas mostram a TAG no mouse
  const caixaEtq = $('#etiquetas');
  for (const e of etiquetas) {
    e.el = document.createElement('div');
    e.el.className = 'etq-q';
    e.el.textContent = e.texto;
    caixaEtq && caixaEtq.appendChild(e.el);
    e.larg = 0;
  }
  const v3 = new Vector3();
  function atualizarEtiquetas() {
    const w = tela.clientWidth, h = tela.clientHeight;
    const dist = camera.position.distanceTo(controles.target);
    const tanF = 2 * Math.tan((camera.fov * Math.PI / 180) / 2);
    const ocupado = [];
    for (const e of etiquetas) {
      // etiqueta da porta só com a porta fechada; as de dentro, com a porta aberta ou oculta
      let vis = mostrarEtq && visivel(e.mesh) && (e.porta ? !portaAberta() : (portaAberta() || !grupos.porta.visible)) && dist < diag * 3.2;
      if (vis) {
        e.mesh.getWorldPosition(v3);
        const pxPorM = h / (tanF * Math.max(0.05, camera.position.distanceTo(v3)));
        if (!e.larg) { e.el.style.display = 'block'; e.larg = e.el.offsetWidth || e.texto.length * 7 + 12; }
        vis = e.mesh.scale.x * pxPorM >= e.larg * 0.95;
      }
      if (!vis) { e.el.style.display = 'none'; continue; }
      v3.z += e.mesh.scale.z / 2;
      v3.project(camera);
      if (v3.z > 1) { e.el.style.display = 'none'; continue; }
      const x = ((v3.x + 1) / 2) * w, y = ((1 - v3.y) / 2) * h;
      // não sobrepor duas etiquetas
      if (ocupado.some(o => Math.abs(o[0] - x) < (o[2] + e.larg) / 2 && Math.abs(o[1] - y) < 16)) { e.el.style.display = 'none'; continue; }
      ocupado.push([x, y, e.larg]);
      e.el.style.display = 'block';
      e.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }
  }

  function redimensionar() {
    const w = tela.clientWidth || window.innerWidth, h = tela.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pedirDesenho();
  }
  window.addEventListener('resize', redimensionar);
  tela.addEventListener('webglcontextrestored', pedirDesenho);
  redimensionar();
  vista3d(true);
  renderer.compile(cena, camera); // shaders prontos antes do 1º desenho

  function desenhar(agora) {
    if (anim) { anim(agora); sujo = true; }
    const d = anguloAlvo - portaGrupo.rotation.y;
    if (Math.abs(d) > 1e-3) { portaGrupo.rotation.y += d * 0.12; sujo = true; } else if (portaGrupo.rotation.y !== anguloAlvo) { portaGrupo.rotation.y = anguloAlvo; sujo = true; }
    if (controles.update()) sujo = true;
    if (!sujo) return;
    sujo = false;
    renderer.render(cena, camera);
    atualizarEtiquetas();
  }
  // atalhos para captura/integração
  window.HM3D = {
    tipo: 'quadro', grupos, camera, controles, cena, renderer,
    abrirPorta: (s = true) => { abrirPorta(s); portaGrupo.rotation.y = anguloAlvo; },
    vistaFrente: () => { vistaFrente(true); }, vista3d: () => { vista3d(true); }, soPlaca: (s = true) => soPlaca(s),
    mostrar, etiquetas: (s) => { mostrarEtq = s; pedirDesenho(); }, render: () => { anim = null; sujo = true; desenhar(performance.now()); },
  };
  function quadroAnim(agora) { requestAnimationFrame(quadroAnim); desenhar(agora); }
  desenhar(performance.now());
  requestAnimationFrame(quadroAnim);
  document.body.classList.add('pronto');
}
