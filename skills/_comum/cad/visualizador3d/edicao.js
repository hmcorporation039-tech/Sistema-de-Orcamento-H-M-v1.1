// Modo de edição de componentes do 3D (versão 2.30): o engenheiro insere e retira componentes da biblioteca H&M
// direto no modelo, dentro da tela da análise. A página continua em sandbox (sem login e sem rede): ela só AVISA a
// tela do sistema por postMessage, e é a tela que valida e grava (PUT /projetos/analises/:id/mapa/edicoes). O que foi
// pedido aparece na hora como marcador (inserido) ou some (retirado); "Atualizar" na tela gera o modelo de novo, com a
// peça encostada na parede e no ambiente certos.
// Só liga quando a página está DENTRO de outra (iframe) e a tela manda a paleta: o arquivo baixado e o link do cliente
// nunca mostram nada disto.
//
// Mensagens (tela → 3D): { tipo: 'hm3d:editar', paleta: [{ simbolo, nome, disciplina, grupo, montagem, altura_m, cor, doProjeto }] }
//                        doProjeto false = componente de outra disciplina: só aparece com "outras disciplinas" marcado
//                        { tipo: 'hm3d:resultado', ok, texto }
// Mensagens (3D → tela): { tipo: 'hm3d:pronto' }
//                        { tipo: 'hm3d:adicionar', simbolo, x, y }          (coordenadas do desenho, em metros)
//                        { tipo: 'hm3d:remover', simbolo, rotulo, x, y }
import { Raycaster, Vector2, Plane, Vector3, Mesh, CylinderGeometry, SphereGeometry, MeshBasicMaterial, Matrix4, Group } from 'three';

const ALTURA_ESPECIAL = { teto: null, piso: 0.05, canto: 2.3, 'topo-porta': 2.15 };

export function iniciarEdicao(ctx) {
  const { CENA, tela, camera, cena, pisos, escolherDispositivo, pedirDesenho, esc } = ctx;
  const embutido = window.parent && window.parent !== window;
  const estado = { ligado: false, modo: 'navegar', paleta: [], escolhido: null, outras: false, inseridos: 0, retirados: 0 };
  const nada = { ativo: () => false, clique: () => false, estado };
  if (!embutido) return nada;
  // (2.46) a vista do prédio (pavimentos empilhados) só mostra: inserir/retirar é na planta de cada pavimento
  if (CENA.plantaInfo && CENA.plantaInfo.predio) return nada;
  const origem = Array.isArray(CENA.origem) ? CENA.origem : null;
  const enviar = (msg) => { try { window.parent.postMessage(msg, '*'); } catch { /* tela fechada */ } };
  const marcas = new Group();
  cena.add(marcas);
  const raio = new Raycaster();
  const ndc = new Vector2();
  const chao = new Plane(new Vector3(0, 1, 0), 0);
  const zero = new Matrix4().makeScale(0, 0, 0);
  let painel = null, aviso = null;

  function montarPainel() {
    const css = document.createElement('style');
    css.textContent = `
#hm-edicao{position:absolute;top:var(--topo,58px);right:14px;z-index:6;width:250px;background:rgba(18,24,33,.94);color:#eef2f6;border:1px solid #c9a227;border-radius:10px;padding:8px 10px;font:13px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35)}
#hm-edicao:not(.inserindo) .so-inserir{display:none!important}
#hm-edicao h4{margin:0 0 6px;font-size:13px;color:#e6c45a;letter-spacing:.3px}
#hm-edicao select{width:100%;margin:8px 0 6px;padding:5px;border-radius:6px;border:1px solid #556;background:#0f141b;color:#eef2f6}
#hm-edicao .modos{display:flex;gap:6px}
#hm-edicao .modos button{flex:1;padding:6px 4px;border-radius:6px;border:1px solid #556;background:#1d2633;color:#eef2f6;cursor:pointer;font-size:12px}
#hm-edicao .modos button.ativo{background:#c9a227;color:#111;border-color:#c9a227;font-weight:600}
#hm-edicao small{display:block;color:#aab4c0;margin-top:6px}#hm-edicao small:empty{display:none}
#hm-edicao label.outras{display:flex;align-items:center;gap:5px;margin:-4px 0 6px;font-size:12px;color:#cfd6de;cursor:pointer}
#hm-edicao .aviso{margin-top:6px;padding:5px 7px;border-radius:6px;background:#203046;display:none}
#hm-edicao .aviso.erro{background:#5a1f1f}`;
    document.head.appendChild(css);
    painel = document.createElement('div');
    painel.id = 'hm-edicao';
    // só os componentes das disciplinas da análise (doProjeto); "outras disciplinas" chama os demais, depois deles
    const temOutras = estado.paleta.some(p => !p.doProjeto);
    // nenhum componente da disciplina da análise: a lista já abre com as outras (nunca vazia)
    if (!estado.paleta.some(p => p.doProjeto)) estado.outras = true;
    const opcoes = () => {
      const grupos = new Map();
      for (const p of estado.paleta) {
        if (!p.doProjeto && !estado.outras) continue;
        const g = p.doProjeto ? p.grupo : `Outras — ${p.grupo}`;
        if (!grupos.has(g)) grupos.set(g, { doProjeto: p.doProjeto, itens: [] });
        grupos.get(g).itens.push(p);
      }
      return [...grupos.entries()]
        .sort((a, b) => (a[1].doProjeto === b[1].doProjeto ? a[0].localeCompare(b[0], 'pt-BR') : a[1].doProjeto ? -1 : 1))
        .map(([g, { itens }]) => `<optgroup label="${esc(g)}">${[...itens].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(p => `<option value="${esc(p.simbolo)}">${esc(p.nome)}</option>`).join('')}</optgroup>`).join('');
    };
    painel.innerHTML = `<h4>Editar componentes</h4>
<div class="modos"><button data-m="navegar" class="ativo">Navegar</button><button data-m="inserir">Inserir</button><button data-m="retirar">Retirar</button></div>
<select id="hm-comp" class="so-inserir" aria-label="Componente a inserir">${opcoes()}</select>
${temOutras ? `<label class="outras so-inserir" title="Mostra também os componentes das disciplinas que não são desta análise"><input type="checkbox" id="hm-outras"${estado.outras ? ' checked' : ''}> outras disciplinas</label>` : ''}
<small id="hm-dica"></small>
<small id="hm-conta"></small>
<div class="aviso" id="hm-aviso"></div>`;
    document.body.appendChild(painel);
    painel.title = '"Inserir": escolha o componente e clique no piso onde ele vai. "Retirar": clique no componente.';
    aviso = painel.querySelector('#hm-aviso');
    window.hmLayout?.();
    const sel = painel.querySelector('#hm-comp');
    estado.escolhido = sel.value || null;
    sel.addEventListener('change', () => { estado.escolhido = sel.value; });
    painel.querySelector('#hm-outras')?.addEventListener('change', (ev) => {
      estado.outras = ev.target.checked;
      const antes = estado.escolhido;
      sel.innerHTML = opcoes();
      // o escolhido continua, se ainda está na lista; senão, o primeiro
      if (antes && [...sel.options].some(o => o.value === antes)) sel.value = antes;
      estado.escolhido = sel.value || null;
    });
    painel.querySelectorAll('.modos button').forEach(b => b.addEventListener('click', () => {
      estado.modo = b.dataset.m;
      painel.querySelectorAll('.modos button').forEach(x => x.classList.toggle('ativo', x === b));
      tela.style.cursor = estado.modo === 'navegar' ? '' : 'crosshair';
      painel.classList.toggle('inserindo', estado.modo === 'inserir');
      painel.querySelector('#hm-dica').textContent = estado.modo === 'inserir' ? 'Clique no piso onde vai o componente.' : estado.modo === 'retirar' ? 'Clique no componente a retirar.' : '';
      window.hmLayout?.();
    }));
    atualizarConta();
  }
  function atualizarConta() {
    const c = painel?.querySelector('#hm-conta');
    if (c) c.textContent = estado.inseridos || estado.retirados ? `${estado.inseridos} inserido(s), ${estado.retirados} retirado(s) — "Atualizar 3D" põe a peça no lugar definitivo.` : '';
    window.hmLayout?.();
  }
  function mostrarAviso(texto, erro = false) {
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.className = `aviso${erro ? ' erro' : ''}`;
    aviso.style.display = 'block';
    clearTimeout(mostrarAviso.t);
    mostrarAviso.t = setTimeout(() => { aviso.style.display = 'none'; }, 4000);
  }

  // ponto do piso sob o clique (piso do ambiente; fora dele, o plano do chão)
  function pontoNoPiso(cx, cy) {
    const r = tela.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raio.setFromCamera(ndc, camera);
    const hit = raio.intersectObjects(pisos, false)[0];
    if (hit) return hit.point.clone();
    const p = new Vector3();
    return raio.ray.intersectPlane(chao, p) ? p : null;
  }

  function inserir(cx, cy) {
    const comp = estado.paleta.find(p => p.simbolo === estado.escolhido);
    if (!comp) { mostrarAviso('Escolha o componente na lista.', true); return true; }
    const p = pontoNoPiso(cx, cy);
    if (!p) { mostrarAviso('Clique no piso do modelo.', true); return true; }
    const x = p.x, y = -p.z; // mundo three.js → planta
    const h = typeof comp.altura_m === 'number' ? comp.altura_m : (comp.montagem in ALTURA_ESPECIAL ? ALTURA_ESPECIAL[comp.montagem] : 1.1);
    const z = h == null ? CENA.peDireito - 0.05 : h;
    // marcador: haste do piso até a altura e uma esfera na cor da disciplina
    const cor = comp.cor || '#c9a227';
    const haste = new Mesh(new CylinderGeometry(0.015, 0.015, Math.max(z, 0.05), 6), new MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.6 }));
    haste.position.set(x, Math.max(z, 0.05) / 2, -y);
    const bola = new Mesh(new SphereGeometry(0.09, 14, 10), new MeshBasicMaterial({ color: cor }));
    bola.position.set(x, z, -y);
    marcas.add(haste, bola);
    estado.inseridos++;
    atualizarConta();
    pedirDesenho(true);
    enviar({ tipo: 'hm3d:adicionar', simbolo: comp.simbolo, x: Math.round((x + origem[0]) * 1000) / 1000, y: Math.round((y + origem[1]) * 1000) / 1000 });
    return true;
  }

  function retirar(cx, cy) {
    const p = escolherDispositivo(cx, cy);
    if (!p) { mostrarAviso('Clique em cima do componente a retirar.', true); return true; }
    const { t, it } = p;
    const i = t.itens.indexOf(it);
    // (2.40: tipos da mesma peça dividem a malha — a instância do item fica em t.base + i)
    if (t.malha && i >= 0) { t.malha.setMatrixAt((t.base || 0) + i, zero); t.malha.instanceMatrix.needsUpdate = true; }
    it.fora = true; // a busca do clique e a dica deixam de achar o retirado
    estado.retirados++;
    atualizarConta();
    pedirDesenho(true);
    enviar({ tipo: 'hm3d:remover', simbolo: t.simbolo || null, rotulo: t.rotulo || null, x: Math.round((it[0] + origem[0]) * 1000) / 1000, y: Math.round((it[1] + origem[1]) * 1000) / 1000 });
    return true;
  }

  window.addEventListener('message', (ev) => {
    if (ev.source !== window.parent) return;
    const m = ev.data;
    if (!m || typeof m !== 'object') return;
    if (m.tipo === 'hm3d:editar' && !estado.ligado && origem && Array.isArray(m.paleta)) {
      estado.paleta = m.paleta.filter(p => p && typeof p.simbolo === 'string' && typeof p.nome === 'string')
        .map(p => ({ simbolo: p.simbolo, nome: p.nome, grupo: String(p.grupo || p.disciplina || ''), montagem: p.montagem, altura_m: typeof p.altura_m === 'number' ? p.altura_m : null, cor: /^#[0-9a-f]{6}$/i.test(p.cor || '') ? p.cor : null, doProjeto: p.doProjeto !== false }));
      if (!estado.paleta.length) return;
      estado.ligado = true;
      montarPainel();
    } else if (m.tipo === 'hm3d:resultado') {
      mostrarAviso(String(m.texto || (m.ok ? 'Salvo.' : 'Não foi possível salvar.')).slice(0, 200), !m.ok);
    }
  });
  enviar({ tipo: 'hm3d:pronto', comOrigem: !!origem });

  return {
    estado,
    ativo: () => estado.ligado && estado.modo !== 'navegar',
    // clique curto na tela: true = o modo de edição tratou
    clique: (cx, cy) => (estado.modo === 'inserir' ? inserir(cx, cy) : estado.modo === 'retirar' ? retirar(cx, cy) : false),
  };
}
