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
//            caixas: [{ camada, x, y, z, l, a, p, cor, opacidade, forma, metal, rotulo, info: [[k, v]],
//                       tag, dica, semEtiqueta }],
//            camadas: [{ id, rotulo, cor }], numeros: [[rotulo, valor]], avisos }
// Itens da porta usam x, y no plano da frente e z a partir da face externa (z
// negativo = corpo do dispositivo por dentro da porta). `dica` é o texto do mouse
// (TAG, tipo e medida); `semEtiqueta` deixa a peça só com a dica, sem etiqueta
// fixa; invólucro e porta aceitam `rotulo` e `info` para a ficha do clique.
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
//
// 3D INTERATIVO (fase 2 do roteiro, 02/11/2026): com o modelo único da instalação
// (cena.instalacao na página da skill quadros, ou o simulador do prédio quando o quadro
// abre de dentro do 3D do prédio — ./app.js), cada disjuntor/DR ganha ALAVANCA articulada
// e a bandeirola I/O; clicar liga/desliga pelo simulador lógico
// (../../instalacao/simulador.js). Partidas de motor: contator que "fecha" (verde),
// relé térmico desarmado (âmbar), sinaleiros da porta acesos pelo estado, emergência e
// rearme da porta. Sem instalação, o quadro abre como antes (só a ficha de cada peça).
// iniciarQuadro(C, { raiz, sim, quadroTag, embutido, portaFechada, aoVoltar, aviso })
import {
  WebGLRenderer, Scene, Color, PerspectiveCamera, HemisphereLight, DirectionalLight, AmbientLight,
  BoxGeometry, CylinderGeometry, EdgesGeometry, Mesh, MeshStandardMaterial, LineSegments, LineBasicMaterial,
  Group, Raycaster, Vector2, Vector3, SRGBColorSpace,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { simuladorDaCena, htmlQuadro, htmlCircuito, htmlPainel, ligarBotoes, criarAviso } from './interativo.js';

const M = 0.001;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function iniciarQuadro(C, op = {}) {
  // embutido no 3D do prédio: o DOM do quadro fica dentro de op.raiz (camada sobre o prédio)
  const raiz = op.raiz || document;
  const $ = (s) => raiz.querySelector(s);
  const tela = $('#tela');
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas: tela, antialias: true, preserveDrawingBuffer: true });
  } catch (e) {
    const sem = $('#semwebgl') || document.querySelector('#semwebgl');
    if (sem) sem.style.display = 'flex';
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
  const comTag = []; // peças com TAG (disjuntores, DR, partidas, botões da porta)

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
    // semEtiqueta: só a dica do mouse (trilho, placa, canaleta vertical, bornes um a um),
    // senão a etiqueta fixa delas tomaria o lugar das TAGs dos dispositivos
    if (b.rotulo && !b.semEtiqueta) etiquetas.push({ mesh, texto: b.rotulo, el: null, porta: pai === portaGrupo });
    if (b.tag) comTag.push(mesh);
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
  ].forEach(b => peca({ ...b, cor: corEnv, rotulo: C.involucro.rotulo, info: C.involucro.info, semEtiqueta: true }, involucro));

  // porta: articulada à esquerda (eixo vertical em x = 0, z = P)
  portaGrupo.position.set(0, 0, P * M);
  cena.add(portaGrupo);
  grupos.porta = portaGrupo;
  peca({ x: 0, y: 0, z: 0, l: L, a: A, p: esp, cor: corEnv, rotulo: C.porta && C.porta.rotulo, info: C.porta && C.porta.info, semEtiqueta: true }, portaGrupo);
  for (const it of (C.porta && C.porta.itens) || []) peca({ ...it, z: esp + (it.z || 0) }, portaGrupo);

  // conteúdo
  for (const b of C.caixas || []) peca(b, grupo(b.camada || 'outros'));

  // ── porta: abrir/fechar com animação ───────────────────────────────────
  const ABERTA = -Math.PI * 0.58;
  let anguloAlvo = C.portaAberta === false ? 0 : ABERTA;
  portaGrupo.rotation.y = anguloAlvo;
  // aberto a partir do prédio: começa fechado e a tampa abre na frente do cliente
  if (op.portaFechada) { anguloAlvo = 0; portaGrupo.rotation.y = 0; setTimeout(() => abrirPorta(true), 350); }
  const portaAberta = () => Math.abs(portaGrupo.rotation.y) > 0.2;

  // ── 3D interativo: simulador, alavancas e estados ──────────────────────
  let selecionado = null;
  // material "de estado" de cada peça (contator fechado, sinaleiro aceso…): guardado à
  // parte, para o destaque da seleção não se perder quando o estado muda
  const matBase = new WeakMap();
  const baseDe = (m) => matBase.get(m) || m.material;
  function porMaterial(mesh, mat) {
    matBase.set(mesh, mat);
    mesh.material = mesh === selecionado ? destaque(mat) : mat;
  }
  const corpoDe = new WeakMap(); // alavanca → corpo do disjuntor
  const sim = op.sim || (C.instalacao && Array.isArray(C.instalacao.quadros) ? simuladorDaCena(C.instalacao, C.titulo) : null);
  const quadroTag = sim ? String(op.quadroTag || sim.quadros()[0]?.tag || '') : '';
  const aviso = sim ? (op.aviso || criarAviso()) : null;
  const elemDe = new WeakMap();
  const elementoDe = (m) => (m ? elemDe.get(m) || null : null);
  const alavancas = []; // { giro, band, tag, alvo }
  const estados = [];   // { mesh, el, base }
  const LIGADO = -0.55, DESLIGADO = 0.55; // alavanca para cima = ligado
  const mats2 = new Map();
  function variante(base, k, f) {
    const key = `${base.uuid}|${k}`;
    if (!mats2.has(key)) { const m = base.clone(); f(m); mats2.set(key, m); }
    return mats2.get(key);
  }
  const brilho = (base, cor, i) => variante(base, `b${cor}${i}`, (m) => { m.emissive.set(cor); m.emissiveIntensity = i; });
  const escuro = (base) => variante(base, 'escuro', (m) => { m.color.multiplyScalar(0.35); });
  function criarAlavanca(mesh, el) {
    const sx = mesh.scale.x, sy = mesh.scale.y, sz = mesh.scale.z;
    const pivo = new Group();
    pivo.position.set(mesh.position.x, mesh.position.y, mesh.position.z + sz / 2);
    const giro = new Group();
    const comp = Math.min(0.016, Math.max(0.008, sy * 0.2));
    const alav = new Mesh(GEO.caixa, material('#2b2d31', 1, false));
    alav.scale.set(Math.min(0.012, sx * 0.45), Math.max(0.004, comp * 0.45), comp);
    alav.position.set(0, 0, comp / 2);
    giro.add(alav);
    // bandeirola de estado (vermelha = I ligado, verde = O desligado), acima da alavanca
    const band = new Mesh(GEO.caixa, material('#d62828', 1, false));
    band.scale.set(Math.min(0.008, sx * 0.4), Math.min(0.006, sy * 0.07), 0.0015);
    band.position.set(0, sy * 0.27, 0.0008);
    pivo.add(giro, band);
    mesh.parent.add(pivo);
    for (const m of [alav, band]) { corpoDe.set(m, mesh); m.userData = mesh.userData; }
    clicaveis.push(alav);
    const on = sim.ligado(el.tag, quadroTag);
    giro.rotation.x = on ? LIGADO : DESLIGADO;
    alavancas.push({ giro, band, tag: el.tag, alvo: giro.rotation.x });
  }
  if (sim) {
    const q = sim.quadro(quadroTag);
    const motores = sim.paineis().filter(p => String(p.quadro) === quadroTag).map(p => p.id);
    const contPorta = {};
    for (const mesh of comTag) {
      const tag = String(mesh.userData.tag);
      let el = null;
      if (q && sim.dispositivo(tag, quadroTag)) el = { tipo: 'protecao', tag };
      else {
        // partida de motor da skill quadros: "M-01/Q1" (disjuntor-motor M-01-Q1), "M-01/K1"
        // (contator), "M-01/F4" (relé de sobrecarga), "M-01/T1" (soft-starter/inversor)
        const m = tag.match(/^(.+)\/([A-Z]+)(\d*)$/);
        const p = tag.match(/^(liga|desliga|emergencia|reset|seletor|sinaleiro_verde|sinaleiro_vermelho|sinaleiro_amarelo|sinaleiro_branco):\d+$/);
        if (m && motores.includes(m[1])) {
          const qm = `${m[1]}-${m[2]}${m[3]}`;
          el = m[2] === 'Q' && sim.dispositivo(qm, quadroTag) ? { tipo: 'protecao', tag: qm, motor: m[1] }
            : m[2] === 'K' ? { tipo: 'contator', motor: m[1] } : m[2] === 'F' ? { tipo: 'termico', motor: m[1] } : { tipo: 'partida', motor: m[1] };
        } else if (p) {
          // botões e sinaleiros da porta: o k-ésimo de cada tipo vai para o k-ésimo motor
          const k = p[1];
          const i = (contPorta[k] = (contPorta[k] ?? -1) + 1);
          const motor = motores.length ? motores[i % motores.length] : null;
          if (k === 'emergencia') el = { tipo: 'porta', acao: 'emergencia' };
          else if (k === 'reset') el = { tipo: 'porta', acao: 'rearme' };
          else if (k === 'liga' || k === 'desliga') el = motor ? { tipo: 'porta', acao: k, motor } : null;
          else if (k === 'seletor') el = motor ? { tipo: 'porta', acao: 'alternar', motor } : null;
          else el = { tipo: 'sinaleiro', sinal: k.slice(10), motor: k === 'sinaleiro_branco' ? null : motor };
        }
      }
      if (!el) continue;
      elemDe.set(mesh, el);
      if (el.tipo === 'protecao' && mesh.parent !== portaGrupo) criarAlavanca(mesh, el);
      if (el.tipo !== 'porta' && (el.tipo !== 'protecao' || el.motor)) estados.push({ mesh, el, base: mesh.material });
    }
  }
  function agir(el) {
    if (!el) return null;
    if (el.tipo === 'protecao') { sim.alternar(el.tag, quadroTag); return `${el.tag} ${sim.ligado(el.tag, quadroTag) ? 'ligado' : 'desligado'}`; }
    if (el.tipo !== 'porta') return null; // contator, térmico, sinaleiro: a ficha tem o painel
    if (el.acao === 'emergencia') {
      const a = !sim.emergenciaDoQuadro(quadroTag);
      sim.emergenciaQuadro(quadroTag, a);
      return a ? 'EMERGÊNCIA acionada: motores parados (clique de novo para soltar)' : 'Emergência liberada (aperte LIGA)';
    }
    if (el.acao === 'rearme') {
      for (const p of sim.paineis()) if (String(p.quadro) === quadroTag && p.termico) sim.motor(p.id, 'rearmar');
      return 'Rearme: relés térmicos rearmados';
    }
    if (el.acao === 'alternar') return sim.motor(el.motor, sim.painel(el.motor).contator ? 'desliga' : 'liga');
    return sim.motor(el.motor, el.acao);
  }
  const painelSim = sim ? $('#simulacao') : null;
  function atualizarEstado() {
    if (!sim) return;
    const q = sim.quadro(quadroTag);
    const energizado = !q?.geral || sim.ligado(q.geral.tag, quadroTag);
    for (const a of alavancas) {
      const on = sim.ligado(a.tag, quadroTag);
      a.alvo = on ? LIGADO : DESLIGADO;
      porMaterial(a.band, material(on ? '#d62828' : '#2f9e44', 1, false));
    }
    for (const e of estados) {
      const pn = e.el.motor ? sim.painel(e.el.motor) : null;
      let mat = e.base;
      if (e.el.tipo === 'contator' || e.el.tipo === 'partida') { if (pn?.girando) mat = brilho(e.base, '#2fbf5a', 0.6); }
      else if (e.el.tipo === 'termico' || e.el.tipo === 'protecao') { if (pn?.termico) mat = brilho(e.base, '#e0a000', 0.9); }
      else if (e.el.tipo === 'sinaleiro') {
        const s = e.el.sinal;
        const aceso = s === 'branco' ? energizado : pn ? !!pn.sinaleiros[s] : s === 'vermelho' && sim.emergenciaDoQuadro(quadroTag);
        mat = aceso ? brilho(e.base, `#${e.base.color.getHexString()}`, 1.6) : escuro(e.base);
      }
      porMaterial(e.mesh, mat);
    }
    if (painelSim) painelSim.innerHTML = htmlQuadro(sim, quadroTag);
    mostrarFicha();
    pedirDesenho();
  }
  const sairDoSim = sim ? sim.assinar(atualizarEstado) : () => {};
  if (painelSim) ligarBotoes(painelSim, sim, { aviso });
  if (sim && $('#info')) ligarBotoes($('#info'), sim, { aviso });

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
  liga('#b-voltar-predio', () => { if (op.aoVoltar) op.aoVoltar(); });

  // seleção: clique numa peça → dados (TAG, fabricante, referência, medidas, fonte);
  // passar o mouse mostra a TAG (útil nas peças estreitas, sem etiqueta fixa)
  const ray = new Raycaster();
  const ptr = new Vector2();
  // material de destaque em cache por material de origem (como material() faz por
  // cor): antes cada clique clonava um e a cópia descartada nunca era liberada
  // (revisão de 02/11/2026; o 3D interativo vai trocar o estado das peças a toda hora)
  const destaques = new Map();
  function destaque(mat) {
    if (!destaques.has(mat)) {
      const d = mat.clone();
      d.emissive.set('#5a4500');
      destaques.set(mat, d);
    }
    return destaques.get(mat);
  }
  function visivel(o) { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; }
  function apontado(ev) {
    const r = tela.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    return ray.intersectObjects(clicaveis.filter(visivel), false)[0] || null;
  }
  const fichaPeca = (b) => `<b class="tag">${esc(b.rotulo || '')}</b><table>${(b.info || []).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${/^https?:/.test(String(v)) ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(v)}</td></tr>`).join('')}</table>`;
  let fichaAtual = null; // peça mostrada no painel (refeito quando o estado muda)
  function mostrarFicha() {
    const info = $('#info');
    if (!info) return;
    if (!fichaAtual) { info.innerHTML = `<small>Clique num dispositivo para ver TAG, fabricante, referência e medidas.${sim ? ' Clique num disjuntor para ligar/desligar.' : ''}</small>`; return; }
    const b = fichaAtual.userData;
    const el = sim && elementoDe(fichaAtual);
    let extra = '';
    if (el?.tipo === 'protecao') {
      const c = sim.dispositivo(el.tag, quadroTag);
      const circ = c?.tipo === 'dr' ? null : (c?.item?.circuito ?? null);
      extra = circ != null ? htmlCircuito(sim, circ, { abrir: false }) : `<div class="sim-est">${el.tag}: <b class="${sim.ligado(el.tag, quadroTag) ? 'sim-on' : 'sim-off'}">${sim.ligado(el.tag, quadroTag) ? 'ligado' : 'desligado'}</b></div>`;
    } else if (el?.motor) extra = htmlPainel(sim.painel(el.motor));
    info.innerHTML = fichaPeca(b) + extra;
  }
  function escolher(ev) {
    const hit = apontado(ev);
    if (selecionado) { selecionado.material = baseDe(selecionado); selecionado = null; }
    pedirDesenho();
    if (!hit) { fichaAtual = null; mostrarFicha(); return; }
    const alvo = corpoDe.get(hit.object) || hit.object;
    selecionado = alvo;
    matBase.set(alvo, baseDe(alvo));
    alvo.material = destaque(baseDe(alvo));
    fichaAtual = alvo;
    // 3D interativo: o clique no disjuntor/DR liga ou desliga; no botão da porta, aperta
    const r = sim ? agir(elementoDe(alvo)) : null;
    if (r && aviso) aviso(r);
    mostrarFicha();
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
    let t = hit && (hit.object.userData.dica || hit.object.userData.rotulo); // dica: TAG, tipo e medida
    if (!t) { dica.style.display = 'none'; return; }
    const el = sim && elementoDe(corpoDe.get(hit.object) || hit.object);
    if (el?.tipo === 'protecao') t += sim.ligado(el.tag, quadroTag) ? ' — LIGADO (clique para desligar)' : ' — DESLIGADO (clique para ligar)';
    else if (el?.acao) t += ' — clique para apertar';
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

  let ativo = true; // embutido no prédio e escondido: não desenha
  function redimensionar() {
    if (!ativo) return;
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
  atualizarEstado();
  if (!sim) mostrarFicha();
  renderer.compile(cena, camera); // shaders prontos antes do 1º desenho

  function desenhar(agora) {
    if (!ativo) return;
    if (anim) { anim(agora); sujo = true; }
    const d = anguloAlvo - portaGrupo.rotation.y;
    if (Math.abs(d) > 1e-3) { portaGrupo.rotation.y += d * 0.12; sujo = true; } else if (portaGrupo.rotation.y !== anguloAlvo) { portaGrupo.rotation.y = anguloAlvo; sujo = true; }
    // alavancas dos disjuntores indo para a posição do estado
    for (const a of alavancas) {
      const da = a.alvo - a.giro.rotation.x;
      if (Math.abs(da) > 1e-3) { a.giro.rotation.x += da * 0.3; sujo = true; } else if (a.giro.rotation.x !== a.alvo) { a.giro.rotation.x = a.alvo; sujo = true; }
    }
    if (controles.update()) sujo = true;
    if (!sujo) return;
    sujo = false;
    renderer.render(cena, camera);
    atualizarEtiquetas();
  }
  const api = {
    tipo: 'quadro', grupos, camera, controles, cena, renderer, sim, quadroTag,
    abrirPorta: (s = true) => { abrirPorta(s); portaGrupo.rotation.y = anguloAlvo; },
    vistaFrente: () => { vistaFrente(true); }, vista3d: () => { vista3d(true); }, soPlaca: (s = true) => soPlaca(s),
    mostrar, etiquetas: (s) => { mostrarEtq = s; pedirDesenho(); }, render: () => { anim = null; sujo = true; desenhar(performance.now()); },
    // 3D interativo: alavanca de um disjuntor (para a captura e o teste no navegador)
    alternar: (tag) => (sim ? agir({ tipo: 'protecao', tag }) : null),
    alavanca: (tag) => { const a = alavancas.find(x => x.tag === tag); return a ? a.giro.rotation.x : null; },
    get sujo() { return sujo; },
  };
  let laco = 0;
  function quadroAnim(agora) { laco = requestAnimationFrame(quadroAnim); desenhar(agora); }
  desenhar(performance.now());
  laco = requestAnimationFrame(quadroAnim);
  if (op.embutido) {
    // controle para o prédio (./app.js): mostrar/esconder a camada e desmontar ao trocar de quadro
    return {
      ...api,
      ativar(sim2 = true) { ativo = sim2; if (ativo) { redimensionar(); atualizarEstado(); } },
      // reaberto a partir do prédio: a tampa (porta) abre de novo na frente do cliente
      abrirAnimado() { anguloAlvo = 0; portaGrupo.rotation.y = 0; pedirDesenho(); setTimeout(() => abrirPorta(true), 300); },
      destruir() {
        ativo = false; cancelAnimationFrame(laco); sairDoSim();
        window.removeEventListener('resize', redimensionar);
        dica.remove();
        renderer.dispose(); renderer.forceContextLoss?.();
      },
    };
  }
  // atalhos para captura/integração
  window.HM3D = api;
  document.body.classList.add('pronto');
  return api;
}
