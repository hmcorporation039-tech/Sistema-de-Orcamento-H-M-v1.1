// MAPA DE ILUMINÂNCIA no piso (fase 5 do roteiro de 02/11/2026 — iluminação no 3D), à
// maneira do DIALux: cores falsas com legenda em lux, calculadas no navegador pelo MESMO
// módulo ponto a ponto da skill de iluminação (../../fotometria/pontoAPonto.js), com a
// fotometria de cada luminária que veio na cena (instalacao.luminotecnico) e o estado
// ATUAL do simulador (cena, dimerização, disjuntor desligado: a luminária entra com o
// nível dela). Só luz direta, sem interreflexão — avisado na legenda.
// Para não travar o celular: grade grossa (no máximo ~250 células por ambiente no
// celular, ~600 no computador), cálculo só quando o botão é ligado (e a cada mudança do
// simulador enquanto ligado), um desenho só para todos os ambientes (cor por vértice);
// cena grande demais: só o ambiente em que se está.
import { Mesh, BufferGeometry, Float32BufferAttribute, MeshBasicMaterial, DoubleSide, Color, SRGBColorSpace } from 'three';
import { avaliador, iluminanciaNoPonto, gradeNoPoligono, estatisticas, corFalsa, escala, malhaMedicao } from '../../fotometria/pontoAPonto.js';

const ORCAMENTO = { celular: 4e5, computador: 1.5e6 }; // avaliações de luminária × ponto por cálculo
const br = (v, c = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

// opcoes: { CENA, INST, sim, interativos, pai (grupo three), altura (piso do mapa), celular, pedirDesenho, esc, ambienteAtual() }
export function criarMapa(opcoes) {
  const { CENA, INST, sim, interativos, pai, altura, celular, pedirDesenho, esc, ambienteAtual } = opcoes;
  const LT = INST?.luminotecnico;
  if (!sim || !LT || !LT.fotometrias) return null;
  const avals = {};
  const porAmb = new Map(); // índice do ambiente da cena → luminárias com fotometria
  for (const x of interativos) {
    if (x.kind !== 'luz') continue;
    const p = sim.ponto(x.id);
    const cod = p?.luminaria;
    if (!cod || !LT.fotometrias[cod]) continue;
    const a = CENA.ambientes[x.it[5]];
    if (!a || a.poligono.length < 3) continue;
    if (!avals[cod]) avals[cod] = avaliador(LT.fotometrias[cod]);
    if (!porAmb.has(x.it[5])) porAmb.set(x.it[5], []);
    porAmb.get(x.it[5]).push({ id: x.id, x: x.it[0], y: x.it[1], z: x.it[2], cod, nome: p.ambiente });
  }
  if (!porAmb.size) return null;

  // dados do ambiente: plano, montagem e FM do luminotécnico (pelo nome do ambiente no modelo)
  const salas = [...porAmb].map(([i, lums]) => {
    const a = CENA.ambientes[i];
    const conta = {};
    for (const l of lums) conta[l.nome] = (conta[l.nome] || 0) + 1;
    const nome = Object.keys(conta).sort((p, q) => conta[q] - conta[p])[0];
    const d = LT.ambientes?.[nome] || {};
    const xs = a.poligono.map(p => p[0]), ys = a.poligono.map(p => p[1]);
    const L = Math.max(...xs) - Math.min(...xs), W = Math.max(...ys) - Math.min(...ys);
    return {
      i, a, lums, dados: d, nome,
      plano: Number.isFinite(d.plano_m) ? d.plano_m : 0.75, fm: Number.isFinite(d.fm) ? d.fm : 1,
      montagem: Number.isFinite(d.altura_montagem_m) ? d.altura_montagem_m : null,
      // C0 ao longo do lado maior, como a grade da skill (nx no comprimento)
      rot: L >= W ? 0 : 90, area: Math.max(0.5, Number(a.area_m2) || L * W),
    };
  });

  let malha = null, visivel = false, construido = null, ultimo = null;
  const mat = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.86, depthWrite: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });

  // células por ambiente dentro do orçamento (grade grossa; celular mais grossa)
  function celulasPorAmbiente(lista) {
    const orc = celular ? ORCAMENTO.celular : ORCAMENTO.computador;
    const maxCel = celular ? 250 : 600;
    const custo = lista.reduce((s, x) => s + maxCel * x.lums.length, 0);
    const f = Math.min(1, orc / Math.max(1, custo));
    return Math.max(30, Math.floor(maxCel * f));
  }

  // monta a geometria (posições fixas) dos ambientes da lista
  function construir(lista) {
    const maxCel = celulasPorAmbiente(lista);
    const pos = [], idx = [];
    const partes = [];
    for (const s of lista) {
      const g = gradeNoPoligono(s.a.poligono, { passo: Math.max(0.15, Math.sqrt(s.area / maxCel)), maxCelulas: maxCel });
      const base = pos.length / 3;
      const vert = new Map(); // "i,j" → índice do vértice
      const vertices = [];
      const v = (i, j) => {
        const k = `${i},${j}`;
        if (!vert.has(k)) { vert.set(k, base + vertices.length); const x = g.x0 + g.dx * i, y = g.y0 + g.dy * j; vertices.push([x, y]); pos.push(x, altura, -y); }
        return vert.get(k);
      };
      for (const c of g.centros) {
        const a = v(c.i, c.j), b = v(c.i + 1, c.j), d = v(c.i + 1, c.j + 1), e = v(c.i, c.j + 1);
        idx.push(a, b, d, a, d, e);
      }
      // Em, Emín e U0 na MESMA malha do memorial da skill (malha de medição), não na do desenho
      const m = malhaMedicao(g.L, g.W);
      partes.push({ s, g, vertices, medicao: gradeNoPoligono(s.a.poligono, { nx: m.nx, ny: m.ny }) });
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new Float32BufferAttribute(new Float32Array(pos.length), 3));
    geo.setIndex(idx);
    if (malha) { malha.geometry.dispose(); pai.remove(malha); }
    malha = new Mesh(geo, mat);
    malha.renderOrder = 3;
    malha.frustumCulled = false;
    pai.add(malha);
    return { lista, partes, maxCel };
  }

  // luminárias do ambiente com o nível atual do simulador
  const luminariasDe = (s) => s.lums.map(l => {
    const e = sim.estadoPonto(l.id);
    return { x: l.x, y: l.y, z: s.montagem ?? l.z, I: avals[l.cod], rot: s.rot, fator: s.fm * (e ? e.nivel : 0) };
  });

  // recalcula valores e cores (com o estado do simulador agora)
  function calcular() {
    if (!construido) return;
    const resultados = [];
    let max = 0;
    for (const p of construido.partes) {
      const lums = luminariasDe(p.s);
      const nos = p.vertices.map(([x, y]) => iluminanciaNoPonto(x, y, p.s.plano, lums));
      const centros = p.medicao.centros.map(c => iluminanciaNoPonto(c.x, c.y, p.s.plano, lums));
      const est = estatisticas(centros);
      max = Math.max(max, est.emax, ...nos);
      resultados.push({ p, nos, est });
    }
    const esc0 = escala(max);
    const cor = malha.geometry.attributes.color;
    const c = new Color();
    let k = 0;
    for (const r of resultados) {
      for (const v of r.nos) {
        const [R, G, B] = corFalsa(v / esc0.max);
        c.setRGB(R, G, B, SRGBColorSpace);
        cor.array[k++] = c.r; cor.array[k++] = c.g; cor.array[k++] = c.b;
      }
    }
    cor.needsUpdate = true;
    ultimo = { escala: esc0, porAmbiente: new Map(resultados.map(r => [r.p.s.i, { ...r.est, sala: r.p.s, celulas: r.p.g.centros.length }])) };
    legenda();
    pedirDesenho();
  }

  // ── legenda (HTML) ──────────────────────────────────────────────────────
  const el = document.createElement('div');
  el.id = 'mapa-lux';
  document.body.appendChild(el);
  const gradiente = `linear-gradient(90deg, ${[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => { const [r, g, b] = corFalsa(t); return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}) ${t * 100}%`; }).join(', ')})`;
  function legenda() {
    if (!ultimo) return;
    const atual = ambienteAtual();
    const r = ultimo.porAmbiente.get(atual);
    const linha = (rot, v) => `<div>${rot}: ${v}</div>`;
    let detalhe;
    if (r) {
      const d = r.sala.dados;
      detalhe = `<div class="t"><b>${esc(r.sala.a.nome)}</b> — ponto a ponto, estado atual das luzes</div>`
        + linha('Em', `<b>${br(r.em)} lx</b>${d.em_exigida ? ` (exigida ${br(d.em_exigida)} lx; lúmens ${br(d.em_lumens || 0)} lx)` : ''}`)
        + linha('Emín / Emáx', `${br(r.emin)} / ${br(r.emax)} lx`)
        + linha('U0 = Emín/Em', `<b>${br(r.u0, 2)}</b>${d.uo_min != null ? ` (mínimo ${br(d.uo_min, 1)})` : ''}`);
    } else {
      detalhe = `<div class="t">${ultimo.porAmbiente.size} ambiente(s) com luminárias do projeto luminotécnico${construido.parcial ? ' — cena grande: só o ambiente atual (entre num ambiente)' : ''}. Entre num ambiente para ver Em, Emín e U0.</div>`;
    }
    el.innerHTML = `<div class="tit">Mapa de iluminância (lx)</div><div class="barra" style="background:${gradiente}"></div>
<div class="marcas">${ultimo.escala.marcas.map(m => `<span>${br(m)}</span>`).join('')}</div>${detalhe}
<small>Cálculo ponto a ponto no plano de trabalho, só luz direta (sem interreflexão de teto, paredes e piso): fica abaixo do método dos lúmens. Muda com as cenas, a dimerização e os disjuntores.</small>`;
  }

  // ambientes a pintar: todos (dentro do orçamento) ou só o atual (cena grande)
  function listaAtual() {
    const maxCel = 30;
    const custoMinimo = salas.reduce((s, x) => s + maxCel * x.lums.length, 0);
    const orc = celular ? ORCAMENTO.celular : ORCAMENTO.computador;
    if (custoMinimo <= orc) return { lista: salas, parcial: false };
    const atual = ambienteAtual();
    return { lista: salas.filter(s => s.i === atual), parcial: true };
  }
  function montarSePreciso() {
    const { lista, parcial } = listaAtual();
    const chave = lista.map(s => s.i).join(',');
    if (!construido || construido.chave !== chave) { construido = { ...construir(lista), chave, parcial }; }
  }

  function mostrar(v) {
    visivel = !!v;
    if (visivel) { montarSePreciso(); calcular(); }
    if (malha) malha.visible = visivel;
    el.classList.toggle('aberto', visivel);
    pedirDesenho(true);
  }

  return {
    get visivel() { return visivel; },
    ambientes: porAmb.size,
    alternar() { mostrar(!visivel); return visivel; },
    mostrar,
    // simulador mudou (cena, nível, disjuntor) ou troca de ambiente
    atualizar() { if (!visivel) return; montarSePreciso(); calcular(); },
    legenda() { if (visivel) { if (construido?.parcial) { montarSePreciso(); calcular(); } else legenda(); } },
    // para o teste no navegador: estatísticas do ambiente (índice da cena)
    resultado(i) { const r = ultimo?.porAmbiente.get(i); return r ? { em: r.em, emin: r.emin, emax: r.emax, u0: r.u0, celulas: r.celulas, nome: r.sala.a.nome } : null; },
    get escala() { return ultimo?.escala || null; },
    get celulas() { return construido ? construido.partes.reduce((s, p) => s + p.g.centros.length, 0) : 0; },
  };
}
