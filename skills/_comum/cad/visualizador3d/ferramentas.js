// Ferramentas do 3D do prédio (versão 2.37, revisão geral de 14/11/2026): o que o engenheiro e o cliente pediam e só
// existia o "Ir para ambiente".
//   - BUSCAR componente pelo nome, pela identificação do projeto (ID/TAG), pelo ambiente ou pelo circuito: a lista
//     mostra os achados e o clique leva a câmera até a peça, marcada por um anel por alguns segundos;
//   - MEDIR: dois cliques no modelo (piso, parede, pilar) dão a distância, com a parte horizontal e a vertical —
//     ilustrativo (o modelo é estimado pela planta; a cota vale a do projeto);
//   - VISTA NO ENDEREÇO: a posição da câmera vai no fim do endereço (#vista=…), junto da planta escolhida; abrir o
//     mesmo endereço volta à mesma vista. "Copiar vista" copia o endereço (no link do cliente, que não expira).
// Nada daqui grava no sistema nem sai da página (a página roda em sandbox, sem rede).
import {
  Raycaster, Vector2, Vector3, Mesh, SphereGeometry, TorusGeometry, MeshBasicMaterial, BufferGeometry, Float32BufferAttribute,
  LineBasicMaterial, Line, Sprite, SpriteMaterial, CanvasTexture, Group,
} from 'three';

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const LIMITE_ACHADOS = 30;

export function iniciarFerramentas(ctx) {
  const { CENA, tela, camera, cena, controles, barra, antes, menu, alvosDoClique, animar, pontoOlhado, sairDoAmbiente, modo, pedirDesenho, esc, br } = ctx;
  const estado = { medindo: false, ponto: null };
  const extras = new Group();
  extras.renderOrder = 20;
  cena.add(extras);
  const botao = (texto, titulo) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = texto; b.title = titulo;
    // no menu "Ferramentas" (2.44); a busca continua na barra
    if (menu) menu.appendChild(b); else barra.insertBefore(b, antes || null);
    return b;
  };
  const avisar = (() => {
    const el = document.createElement('div');
    el.id = 'hm-ferr-aviso';
    el.style.cssText = 'position:fixed;left:50%;bottom:58px;transform:translateX(-50%);z-index:30;background:rgba(18,24,33,.94);color:#eef2f6;border:1px solid #c9a227;border-radius:8px;padding:7px 12px;font:13px/1.35 system-ui,sans-serif;display:none;max-width:90vw';
    document.body.appendChild(el);
    let t = null;
    return (texto, ms = 3500) => { el.textContent = texto; el.style.display = 'block'; clearTimeout(t); if (ms) t = setTimeout(() => { el.style.display = 'none'; }, ms); };
  })();

  // ── Buscar ────────────────────────────────────────────────────────────────
  const indice = [];
  for (const t of CENA.dispositivos || []) {
    t.itens.forEach((it) => {
      const amb = CENA.ambientes?.[it[5]];
      const texto = [t.rotulo, it[6], amb?.nome, it[8] ? `circuito ${it[8]}` : '', CENA.disciplinas?.[t.disciplina]?.rotulo].filter(Boolean).join(' · ');
      indice.push({ t, it, texto, chave: semAcento(texto) });
    });
  }
  let anel = null, tempoAnel = null;
  function marcar(p, tam) {
    if (anel) { extras.remove(anel); anel.geometry.dispose(); anel.material.dispose(); }
    const r = Math.max(0.25, tam * 0.9);
    anel = new Mesh(new TorusGeometry(r, r * 0.08, 8, 40), new MeshBasicMaterial({ color: '#e6c45a', transparent: true, opacity: 0.95, depthTest: false }));
    anel.position.copy(p);
    anel.lookAt(camera.position);
    anel.renderOrder = 20;
    extras.add(anel);
    clearTimeout(tempoAnel);
    tempoAnel = setTimeout(() => { if (anel) { extras.remove(anel); anel = null; pedirDesenho(true); } }, 5000);
    pedirDesenho(true);
  }
  function irPara(achado) {
    const { t, it } = achado;
    const alvo = new Vector3(it[0], it[2], -it[1]);
    const ida = () => {
      // de fora e um pouco de cima, do lado em que a câmera já está (não atravessa o prédio)
      const dir = camera.position.clone().sub(alvo).setY(0);
      if (dir.lengthSq() < 1e-6) dir.set(1, 0, 1);
      dir.normalize().multiplyScalar(3.2).setY(2.4);
      const pos = alvo.clone().add(dir);
      animar(pontoOlhado(camera.position.distanceTo(alvo)), pos, alvo, 45, 800, () => {
        controles.target.copy(alvo);
        controles.update();
        marcar(alvo, t.tamMax || 0.2);
      });
    };
    if (modo() !== 'geral') { sairDoAmbiente(); }
    ida();
    avisar(achado.texto);
  }
  if (indice.length) {
    const caixa = document.createElement('span');
    caixa.style.cssText = 'position:relative;display:inline-flex';
    const campo = document.createElement('input');
    campo.type = 'search';
    campo.placeholder = 'Buscar componente…';
    campo.title = 'Nome, identificação (ID/TAG), ambiente ou circuito — Enter vai ao primeiro achado';
    campo.setAttribute('aria-label', 'Buscar componente no modelo');
    campo.style.cssText = 'background:#1e2128;color:#eef2f6;border:1px solid #3a3f4a;border-radius:6px;padding:5px 9px;font:inherit;font-size:12.5px;width:170px';
    const lista = document.createElement('div');
    lista.style.cssText = 'position:absolute;top:100%;left:0;margin-top:4px;z-index:40;background:rgba(18,24,33,.97);border:1px solid #c9a227;border-radius:8px;max-height:320px;overflow:auto;min-width:300px;display:none;font-size:12.5px';
    caixa.append(campo, lista);
    barra.insertBefore(caixa, antes || null);
    let achados = [];
    const procurar = () => {
      const termos = semAcento(campo.value).split(/\s+/).filter(Boolean);
      achados = termos.length ? indice.filter(e => termos.every(p => e.chave.includes(p))) : [];
      if (!termos.length) { lista.style.display = 'none'; return; }
      lista.innerHTML = achados.length
        ? achados.slice(0, LIMITE_ACHADOS).map((e, i) => `<div data-i="${i}" style="padding:6px 10px;cursor:pointer;border-bottom:1px solid #253040;color:#dfe6ee">${esc(e.texto)}</div>`).join('')
          + (achados.length > LIMITE_ACHADOS ? `<div style="padding:6px 10px;color:#aab4c0">e mais ${achados.length - LIMITE_ACHADOS} — refine a busca</div>` : '')
        : '<div style="padding:6px 10px;color:#aab4c0">Nada encontrado.</div>';
      lista.style.display = 'block';
    };
    campo.addEventListener('input', procurar);
    campo.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && achados.length) { irPara(achados[0]); lista.style.display = 'none'; campo.blur(); }
      if (ev.key === 'Escape') { campo.value = ''; lista.style.display = 'none'; campo.blur(); }
    });
    lista.addEventListener('click', (ev) => {
      const d = ev.target.closest('[data-i]');
      if (!d) return;
      irPara(achados[Number(d.dataset.i)]);
      lista.style.display = 'none';
    });
    campo.addEventListener('blur', () => setTimeout(() => { lista.style.display = 'none'; }, 200));
  }

  // ── Medir ─────────────────────────────────────────────────────────────────
  const raio = new Raycaster();
  const ndc = new Vector2();
  const medidas = new Group();
  extras.add(medidas);
  const matPonto = new MeshBasicMaterial({ color: '#e6c45a', depthTest: false });
  const matLinha = new LineBasicMaterial({ color: '#e6c45a', depthTest: false });
  function pontoSob(cx, cy) {
    const r = tela.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raio.setFromCamera(ndc, camera);
    const hit = raio.intersectObjects(alvosDoClique(), false)[0];
    return hit ? hit.point.clone() : null;
  }
  function etiqueta(texto, p) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(18,24,33,0.92)'; g.fillRect(0, 0, 512, 96);
    g.strokeStyle = '#c9a227'; g.lineWidth = 4; g.strokeRect(2, 2, 508, 92);
    g.fillStyle = '#ffffff'; g.font = 'bold 38px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(texto, 256, 50);
    const s = new Sprite(new SpriteMaterial({ map: new CanvasTexture(c), depthTest: false, sizeAttenuation: false }));
    s.scale.set(0.16, 0.03, 1);
    s.position.copy(p);
    s.renderOrder = 22;
    return s;
  }
  const bolinha = (p) => { const m = new Mesh(new SphereGeometry(0.06, 12, 8), matPonto); m.position.copy(p); m.renderOrder = 21; return m; };
  function limparMedidas() {
    for (const o of [...medidas.children]) {
      medidas.remove(o);
      o.geometry?.dispose();
      if (o.material?.map) o.material.map.dispose();
      if (o.material && o.material !== matPonto && o.material !== matLinha) o.material.dispose();
    }
    estado.ponto = null;
    pedirDesenho(true);
  }
  const bMedir = botao('Medir', 'Dois cliques no modelo (piso, parede, pilar): a distância entre eles, com a parte horizontal e a vertical. Ilustrativo — a cota que vale é a do projeto.');
  bMedir.addEventListener('click', () => {
    estado.medindo = !estado.medindo;
    bMedir.classList.toggle('ativo', estado.medindo);
    tela.style.cursor = estado.medindo ? 'crosshair' : '';
    if (estado.medindo) avisar('Medir: clique no primeiro ponto do modelo e depois no segundo. Clique em "Medir" de novo para sair (as medidas somem).', 6000);
    else limparMedidas();
  });
  function cliqueMedir(cx, cy) {
    const p = pontoSob(cx, cy);
    if (!p) { avisar('Clique em cima do modelo (piso, parede ou pilar).'); return; }
    medidas.add(bolinha(p));
    if (!estado.ponto) { estado.ponto = p; pedirDesenho(true); return; }
    const a = estado.ponto;
    estado.ponto = null;
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([a.x, a.y, a.z, p.x, p.y, p.z], 3));
    const linha = new Line(g, matLinha);
    linha.renderOrder = 21;
    medidas.add(linha);
    const total = a.distanceTo(p), hor = Math.hypot(p.x - a.x, p.z - a.z), ver = Math.abs(p.y - a.y);
    const texto = `${br(total, 2)} m` + (ver > 0.05 && hor > 0.05 ? ` (h ${br(hor, 2)} · v ${br(ver, 2)})` : '');
    medidas.add(etiqueta(texto, a.clone().add(p).multiplyScalar(0.5)));
    avisar(`Distância: ${texto} — ilustrativo, a cota que vale é a do projeto.`, 6000);
    pedirDesenho(true);
  }

  // ── Vista no endereço ─────────────────────────────────────────────────────
  // #planta=2&vista=x,y,z,ax,ay,az (o seletor de planta da página lê só o "planta=")
  const r2 = (v) => Math.round(v * 100) / 100;
  function lerVista() {
    const m = /vista=([-0-9.,]+)/.exec(location.hash);
    const v = m ? m[1].split(',').map(Number) : null;
    return v && v.length === 6 && v.every(Number.isFinite) ? v : null;
  }
  function gravarVista() {
    if (modo() !== 'geral') return;
    const v = [camera.position.x, camera.position.y, camera.position.z, controles.target.x, controles.target.y, controles.target.z].map(r2).join(',');
    const planta = /planta=([0-9]+)/.exec(location.hash);
    const novo = `#${planta ? `planta=${planta[1]}&` : ''}vista=${v}`;
    if (novo === location.hash) return;
    try { history.replaceState(null, '', novo); } catch { /* página sem histórico próprio (sandbox): a vista só não fica no endereço */ }
  }
  let tempoVista = null;
  controles.addEventListener('end', () => { clearTimeout(tempoVista); tempoVista = setTimeout(gravarVista, 400); });
  const bVista = botao('Copiar vista', 'Copia o endereço desta página com a posição da câmera: quem abrir o mesmo endereço vê o modelo deste ângulo');
  bVista.addEventListener('click', async () => {
    gravarVista();
    const url = location.href;
    try { await navigator.clipboard.writeText(url); avisar('Endereço com esta vista copiado.'); }
    catch { avisar(`Copie o endereço: ${url}`, 12000); }
  });

  return {
    ativo: () => estado.medindo,
    clique: (cx, cy) => { if (estado.medindo) { cliqueMedir(cx, cy); return true; } return false; },
    // a vista guardada no endereço, para a página abrir nela (null = vista padrão)
    vistaDoEndereco: lerVista,
  };
}
