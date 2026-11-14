// 3D FOCADO NO OBJETIVO DO PROJETO (pedido do usuário em 09/11/2026). Num DWG de
// subestação abrigada de 150 kVA o 3D montou a planta de SITUAÇÃO da arena (um PDF de
// outro projeto colado no desenho: estacionamento, quadras, luminárias) em vez da
// subestação. "Se é uma subestação, temos que pegar postes de entrada, trafos e todos os
// componentes que estão no projeto… Claro que temos que construir o local do abrigo de
// tudo, mas não pegar o desenho do local como estacionamentos, iluminação… foque no que
// interessa" — e "use o mesmo fundamento para todas as disciplinas".
//
// O objetivo do projeto (qual é o objeto, as vistas com o papel de cada uma, os componentes
// da relação de materiais com a posição na planta e o abrigo) vem pronto de quem chama
// (`opcoes.objetivo` de ./modelosPorPlanta.js). Aqui:
//   - semCamadasDeContexto: tira do desenho as camadas da base importada de outro projeto;
//   - montarCenaDoAbrigo: a cena é o ABRIGO (paredes do contorno, compartimentos, portas) e
//     os EQUIPAMENTOS nas posições dos componentes — nada do resto do desenho vira parede ou
//     ponto, e nada é estimado (sem tomada/luminária pela área);
//   - dispositivosDoObjetivo: os equipamentos do objetivo numa planta comum (elétrica etc.).
// Componente sem posição na planta: no lugar típico do tipo (poste ao lado do abrigo, peças
// do poste no poste, extintor junto da porta, hastes nos cantos…) ou no PÁTIO ao lado, sempre
// marcado "posição a conferir". As formas vêm da biblioteca do 3D (./equipamentos3d.js).
const { montarCena, recortarArquitetura } = require('./modelo3d');
const { dentro, centroide, perimetro, areaPoligono, distanciaContorno } = require('./arquitetura');
const { ehAmbienteValido } = require('./estimativaArquitetura');
const EQ = require('./equipamentos3d');

// sem pé-direito no projeto: o típico de abrigo de subestação (marcado [CONFERIR])
const PE_DIREITO_ABRIGO = 3.0;
const LAYER_PAREDE = 'A-PAREDE-ABRIGO';
const LAYER_TELA = 'A-GRADIL-TELA';
// o desenho do objeto, no piso como referência (não sobe como parede: ./modelo3d.js extrairElementos)
const LAYER_REFERENCIA = 'PLANTA-DO-OBJETO';
const NOME_PATIO = 'PÁTIO — COMPONENTES SEM POSIÇÃO NA PLANTA (CONFERIR)';
// distância do poste de entrada sem posição até a parede do abrigo
const AFASTAMENTO_POSTE_M = 3.0;
// peças "de frente" (manobra): o tapete isolante vai na frente delas
const TIPOS_FRENTE = ['disjuntor_mt', 'chave_seccionadora', 'cubiculo', 'qgbt', 'medicao', 'rele'];
// peças da entrada (do ramal): dão a direção do poste sem posição
const TIPOS_RAMAL = ['cabo_mt', 'eletroduto', 'poco_passagem', 'mufla', 'para_raios', 'chave_fusivel', 'cruzeta', 'isolador'];
const UNIDADES_PECA = /^(un|und|unid|unidade|p[çc]|pe[çc]a|cj|conj|conjunto|jg|jogo)?\.?s?$/i;

const r2 = (v) => Math.round(v * 100) / 100;
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const { num } = EQ;
const caixaDe = (pts) => [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
const naCaixa = (c, [x, y], m = 0) => x >= c[0] - m && x <= c[2] + m && y >= c[1] - m && y <= c[3] + m;
const uniao = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
const expandir = (c, m) => [c[0] - m, c[1] - m, c[2] + m, c[3] + m];
const unit = (v) => { const L = Math.hypot(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; };
const caixaValida = (c) => Array.isArray(c) && c.length === 4 && c.every(Number.isFinite) && c[2] > c[0] && c[3] > c[1];
const br = (v, c = 2) => String(Number(v).toFixed(c)).replace('.', ',');

// polígono [[x, y], …] válido (≥ 3 vértices, sem repetir o 1º no fim)
function poligono(p) {
  if (!Array.isArray(p)) return null;
  const v = p.filter(q => Array.isArray(q) && Number.isFinite(Number(q[0])) && Number.isFinite(Number(q[1]))).map(q => [Number(q[0]), Number(q[1])]);
  if (v.length > 2 && dist(v[0], v.at(-1)) < 1e-6) v.pop();
  return v.length >= 3 && areaPoligono(v) > 0.05 ? v : null;
}
const areaSinal = (pol) => pol.reduce((s, [x, y], i) => { const [x2, y2] = pol[(i + 1) % pol.length]; return s + x * y2 - x2 * y; }, 0) / 2;
// projeção do ponto no segmento a→b: { d, t (m ao longo), q, L }
function projetar(p, a, b) {
  const v = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(v[0], v[1]) || 1e-9;
  const t = Math.max(0, Math.min(L, ((p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1]) / L));
  const q = [a[0] + (v[0] / L) * t, a[1] + (v[1] / L) * t];
  return { d: dist(p, q), t, q, L };
}

// ── Camadas de contexto (base importada de outro projeto) ───────────────────
const chaveLayer = (l) => String(l ?? '').trim().toUpperCase();
function semCamadasDeContexto(arq, camadas) {
  const fora = new Set((camadas || []).map(chaveLayer).filter(Boolean));
  if (!fora.size) return arq;
  const fica = (x) => !x || x.layer == null || !fora.has(chaveLayer(x.layer));
  const out = { ...arq };
  for (const k of ['referencia', 'ambientes', 'portas', 'notas', 'preenchimentos', 'rotulos', 'textosDoDesenho', 'circulos', 'molduras']) {
    if (Array.isArray(arq[k])) out[k] = arq[k].filter(fica);
  }
  return out;
}
const foraDoContexto = (camadas) => { const fora = new Set((camadas || []).map(chaveLayer).filter(Boolean)); return (x) => !x || x.layer == null || !fora.has(chaveLayer(x.layer)); };

// vistas do objetivo pelo papel
const vistasPrincipais = (obj) => (obj?.vistas || []).filter(v => v && v.papel === 'principal' && caixaValida(v.caixa));
const vistasDescartadas = (obj) => (obj?.vistas || []).filter(v => v && v.papel !== 'principal' && caixaValida(v.caixa));

// posições do componente que valem para a vista (mesmo sistema de coordenadas da planta)
function posicoesNaVista(comp, vista, margem = 6) {
  return (comp.posicoes || []).map(p => ({ ...p, x: Number(p?.x), y: Number(p?.y) })).filter(p => {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
    if (!vista) return true;
    if (p.vista != null && p.vista !== '') return String(p.vista) === String(vista.id);
    return naCaixa(vista.caixa, [p.x, p.y], margem);
  });
}
// quantos objetos o componente sem posição vira: peça contável até 8 (cada uma um objeto); o resto, um
function objetosSemPosicao(comp, eq) {
  if (eq.linear) return 1;
  const q = Number(comp.quantidade);
  if (!Number.isFinite(q) || q < 1 || Math.round(q) !== q || q > 8) return 1;
  return UNIDADES_PECA.test(String(comp.unidade ?? '').trim()) ? q : 1;
}
const textoComp = (c, eq) => String(c.descricao || eq.rotulo || c.tipo || 'Componente').trim();

// Ficha do componente (a cena leva; o visualizador mostra no clique — ./visualizador3d/interativo.js)
// Os campos vêm da relação de materiais / legenda do projeto e podem faltar: lidos com cuidado
// (especificação em objeto ou em texto; fonte única ou lista)
function fichaDoComponente(c, eq, tam, posicao, objetos) {
  const esp = c.especificacao;
  const fontes = [...(Array.isArray(c.fontes) ? c.fontes : []), ...(c.fonte ? [c.fonte] : [])]
    .map(f => (f && typeof f === 'object' ? [f.tipo || f.fonte, f.detalhe || f.layer || f.folha].filter(Boolean).join(': ') : String(f ?? ''))).filter(Boolean);
  return {
    id: String(c.id), tipo: c.tipo || eq.chave, descricao: textoComp(c, eq), item: c.item ?? null,
    quantidade: c.quantidade ?? null, unidade: c.unidade || '', especificacao: esp && typeof esp === 'object' && !Array.isArray(esp) ? esp : {},
    especificacaoTexto: typeof esp === 'string' ? esp : esp && typeof esp === 'object' && typeof (esp.texto || esp.descricao) === 'string' ? (esp.texto || esp.descricao) : '',
    fontes: [...new Set(fontes)], conferir: !!c.conferir, motivo: c.motivo || '', servico: c.servico || '',
    // 'desenho' (posição da planta) | 'tipica' (lugar típico do tipo) | 'patio' (ao lado, sem lugar típico)
    posicao, posicaoAConferir: posicao !== 'desenho', objetos,
    forma: eq.forma, dimensoes_m: tam, rotuloForma: eq.rotulo,
    // como o equipamento é operado (contrato `interacao` de ../instalacao/interacao.js), quando o
    // componente declara — senão o 3D usa o perfil do tipo (chave fusível, seccionadora, disjuntor…)
    ...(c.interacao && typeof c.interacao === 'object' && !Array.isArray(c.interacao) ? { interacao: c.interacao } : {}),
  };
}

// ── Equipamentos do objetivo numa planta comum (elétrica, incêndio…) ─────────
// Os componentes com posição dentro da vista viram peças da biblioteca; o que já foi lido
// no desenho (mesma forma a menos de 50 cm) não repete. Sem posição: só o aviso (a planta
// comum não tem "pátio").
function dispositivosDoObjetivo(obj, vista, existentes = []) {
  const disc = obj.disciplina || 'outros';
  const dispositivos = [], componentes = [], semPosicao = [];
  const ja = existentes.filter(d => Number.isFinite(d.x) && Number.isFinite(d.y));
  for (const c of obj.componentes || []) {
    if (!c || EQ.TIPOS_PORTA.has(EQ.chaveTipo(c.tipo) || String(c.tipo || '').toLowerCase())) continue;
    const eq = EQ.equipamentoDe(c);
    const pos = posicoesNaVista(c, vista, 0.5);
    if (!pos.length) { if (!(c.posicoes || []).length) semPosicao.push(c); continue; }
    const tam = EQ.tamanhoDe(eq, c.especificacao);
    let n = 0;
    for (const p of pos) {
      const repetido = ja.some(d => dist([d.x, d.y], [p.x, p.y]) < 0.5 && (d.simbolo === eq.simbolo || (eq.chave === 'luminaria' && /LUMINARIA|PONTO-LUZ/.test(d.simbolo || '')) || (eq.forma === 'quadro' && /QUADRO/.test(d.simbolo || ''))));
      if (repetido) continue;
      n++;
      dispositivos.push({ simbolo: eq.simbolo, disciplina: eq.chave === 'luminaria' ? 'iluminacao' : disc, rotulo: textoComp(c, eq), componente: String(c.id), tam, cor: eq.cor, x: p.x, y: p.y, id: `${c.id}#${n}`, ...(num(c.especificacao?.altura_m) && typeof eq.h === 'number' ? { altura_m: num(c.especificacao.altura_m) } : {}) });
    }
    if (n) componentes.push(fichaDoComponente(c, eq, tam, 'desenho', n));
  }
  return { dispositivos, componentes, semPosicao };
}

// ── Abrigo ───────────────────────────────────────────────────────────────────
// contorno do abrigo: o do objetivo; sem ele, o retângulo largura × comprimento centrado nos
// equipamentos posicionados (ou no meio da vista), com o aviso
function contornoDoAbrigo(abrigo, centroPreferido, avisos) {
  const c = poligono(abrigo.contorno);
  if (c) return c;
  const L = num(abrigo.largura_m), C = num(abrigo.comprimento_m);
  if (!L || !C || !centroPreferido) return null;
  const [cx, cy] = centroPreferido;
  avisos.push(`Contorno do abrigo não lido no desenho: retângulo de ${br(L)} × ${br(C)} m (medidas do projeto) centrado nos equipamentos [CONFERIR].`);
  return [[cx - L / 2, cy - C / 2], [cx + L / 2, cy - C / 2], [cx + L / 2, cy + C / 2], [cx - L / 2, cy + C / 2]];
}

// lados de parede (contorno + divisões internas dos compartimentos), com os vãos das portas
function paredesEPortas(contorno, compartimentos, portasDadas, avisos) {
  const ccw = areaSinal(contorno) > 0;
  const lados = contorno.map((a, i) => {
    const b = contorno[(i + 1) % contorno.length];
    const u = unit([b[0] - a[0], b[1] - a[1]]);
    // normal para FORA do abrigo
    const n = ccw ? [u[1], -u[0]] : [-u[1], u[0]];
    return { a, b, u, n, L: dist(a, b), externo: true, layer: LAYER_PAREDE, cortes: [] };
  });
  const noContorno = (p) => distanciaContorno(p, contorno) < 0.12;
  const vistos = new Set();
  for (const comp of compartimentos) {
    const pol = comp.poligono;
    pol.forEach((a, i) => {
      const b = pol[(i + 1) % pol.length];
      if (dist(a, b) < 0.1) return;
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (noContorno(a) && noContorno(b) && noContorno(m)) return;
      // divisão compartilhada por dois compartimentos: uma parede só
      const chave = [a, b].map(p => p.map(v => Math.round(v * 20)).join(',')).sort().join('|');
      if (vistos.has(chave)) return;
      vistos.add(chave);
      const u = unit([b[0] - a[0], b[1] - a[1]]);
      lados.push({ a, b, u, n: [-u[1], u[0]], L: dist(a, b), externo: false, layer: /TELA|GRADE|ALAMBR/i.test(String(comp.divisao || '')) ? LAYER_TELA : LAYER_PAREDE, cortes: [] });
    });
  }
  const portas = [];
  for (const [k, pd] of portasDadas.entries()) {
    let melhor = null;
    for (const l of lados) {
      const pr = projetar(pd.meio, l.a, l.b);
      if (pr.d <= 1.0 && (!melhor || pr.d < melhor.pr.d - 1e-6 || (Math.abs(pr.d - melhor.pr.d) < 1e-6 && l.externo))) melhor = { l, pr };
    }
    if (!melhor) { avisos.push(`Porta "${pd.nome || k + 1}" do abrigo longe de toda parede do contorno: não entrou no 3D [CONFERIR].`); continue; }
    const { l, pr } = melhor;
    const larg = Math.min(pd.largura_m, Math.max(0.6, l.L - 0.1));
    const t0 = Math.max(0.05, Math.min(l.L - 0.05 - larg, pr.t - larg / 2));
    const t1 = t0 + larg;
    l.cortes.push([t0, t1]);
    const ponto = (t) => [l.a[0] + l.u[0] * t, l.a[1] + l.u[1] * t];
    const dobradica = ponto(t0), batente = ponto(t1);
    portas.push({ id: `porta-${k + 1}`, nome: pd.nome || '', meio: ponto((t0 + t1) / 2), largura_m: r2(larg), dupla: !!pd.dupla, dobradica, batente, u: l.u, n: l.n, externa: l.externo, conferir: pd.conferir });
  }
  // linhas de parede (os pedaços entre os vãos)
  const referencia = [];
  for (const l of lados) {
    const cortes = l.cortes.sort((p, q) => p[0] - q[0]);
    let t = 0;
    for (const [c0, c1] of [...cortes, [l.L, l.L]]) {
      if (c0 - t > 0.03) referencia.push({ tipo: 'linha', layer: l.layer, pts: [[l.a[0] + l.u[0] * t, l.a[1] + l.u[1] * t], [l.a[0] + l.u[0] * c0, l.a[1] + l.u[1] * c0]] });
      t = Math.max(t, c1);
    }
  }
  return { lados, portas, referencia };
}

// nome do compartimento que o 3D aceita como ambiente (célula "QGBT" ou "150 kVA" seria descartada)
function nomeDeAmbiente(nome, padrao) {
  let s = String(nome || '').trim().toUpperCase() || padrao;
  const ok = (n) => ehAmbienteValido({ nome: n, area_m2: 10 });
  if (ok(s)) return s;
  s = s.replace(/\b\d+(?:[.,]\d+)?\s*(KA|KVA|KW|MM²|MM2)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
  if (s && ok(s)) return s;
  return `CABINE ${s || padrao}`.trim();
}

// O objetivo lido do desenho (./objetivoDoProjeto.js) traz a ESCALA da vista principal, tirada das cotas: a SE
// real estava desenhada ao dobro (5,00 × 10,50 no desenho; cotas 250 × 525 cm). Aqui o contorno do abrigo, os
// compartimentos, as portas, a caixa da vista e as posições dos componentes nela passam para metros reais, em
// torno da origem do abrigo. A posição do balão vale pela ponta da seta (alvo). Componente contável com mais
// posições que a quantidade fica com as melhores (bloco > texto > layer > balão); antes, o trafo de 1 un.
// (balão + bloco) aparecia duas vezes.
const RANK_ORIGEM = { bloco: 0, texto: 1, layer: 2, balao: 3 };
function objetivoEmMetros(objetivo) {
  if (!objetivo || objetivo._emMetros) return objetivo;
  const ab = objetivo.abrigo || {};
  const vistas = objetivo.vistas || [];
  const vistaAb = vistas.find(v => v && String(v.id) === String(ab.vista)) || vistas.find(v => v?.papel === 'principal') || null;
  const fator = num(ab.escala?.fator) || num(vistaAb?.escala?.fator) || 1;
  const cont = poligono(ab.contorno);
  const O = Array.isArray(ab.origem) && ab.origem.every(v => Number.isFinite(Number(v))) ? ab.origem.map(Number)
    : cont ? [Math.min(...cont.map(p => p[0])), Math.min(...cont.map(p => p[1]))] : null;
  const escalar = !!(O && vistaAb && Math.abs(fator - 1) > 0.02);
  const T = escalar ? ([x, y]) => [r2(O[0] + (x - O[0]) * fator), r2(O[1] + (y - O[1]) * fator)] : (p) => p;
  const local = (p) => (escalar && Array.isArray(p?.local_m) && p.local_m.length === 2 && p.local_m.every(Number.isFinite) ? [r2(O[0] + p.local_m[0]), r2(O[1] + p.local_m[1])] : null);
  const naVistaAb = (p) => !!vistaAb && (p?.vista != null && p.vista !== '' ? String(p.vista) === String(vistaAb.id) : caixaValida(vistaAb.caixa) && naCaixa(vistaAb.caixa, [Number(p?.x), Number(p?.y)], 0.5));
  const componentes = (objetivo.componentes || []).map(c => {
    if (!c) return c;
    let pos = (c.posicoes || []).map(p => {
      if (!p || !naVistaAb(p)) return p;
      const base = Array.isArray(p.alvo) && p.alvo.length === 2 && p.alvo.every(Number.isFinite) ? p.alvo : [Number(p.x), Number(p.y)];
      const [x, y] = local(p) || T(base);
      const { alvo, ...resto } = p;
      return { ...resto, x, y };
    });
    const q = num(c.quantidade);
    const naVista = pos.filter(naVistaAb);
    if (q && UNIDADES_PECA.test(String(c.unidade || '').trim()) && naVista.length > q) {
      const manter = new Set([...naVista].sort((a, b) => (RANK_ORIGEM[a.origem] ?? 2) - (RANK_ORIGEM[b.origem] ?? 2)).slice(0, q));
      pos = pos.filter(p => !naVistaAb(p) || manter.has(p));
    }
    return { ...c, posicoes: pos };
  });
  if (!escalar) return { ...objetivo, componentes, _emMetros: true };
  const caixaT = (c) => { const a = T([c[0], c[1]]), b = T([c[2], c[3]]); return [a[0], a[1], b[0], b[1]]; };
  const abrigo = {
    ...ab,
    contorno: cont ? cont.map(T) : ab.contorno,
    compartimentos: (ab.compartimentos || []).map(c => {
      const pol = poligono(c?.poligono);
      if (pol) return { ...c, poligono: pol.map(T) };
      if (caixaValida(c?.caixa)) { const [x0, y0, x1, y1] = caixaT(c.caixa); return { ...c, poligono: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] }; }
      return c;
    }),
    portas: (ab.portas || []).map(p => {
      if (Array.isArray(p)) return T(p.map(Number));
      if (!p) return p;
      if (Array.isArray(p.meio)) return { ...p, meio: T(p.meio.map(Number)) };
      const [x, y] = local(p) || T([Number(p.x), Number(p.y)]);
      return { ...p, x, y };
    }),
  };
  const vistasT = vistas.map(v => (v === vistaAb && caixaValida(v.caixa) ? { ...v, caixa: caixaT(v.caixa), escalaAplicada: fator } : v));
  return { ...objetivo, abrigo, vistas: vistasT, componentes, _emMetros: true, _escala: { origem: O, fator } };
}

// A cena do abrigo com os equipamentos. → cena (montarCena) com plantaInfo, objetivoInfo,
// componentes (fichas) — ou null quando não há como montar o abrigo (sem contorno nem medidas)
function montarCenaDoAbrigo(arquitetura, objetivo0, opcoes = {}) {
  const objetivo = objetivoEmMetros(objetivo0);
  const abrigo = objetivo.abrigo || {};
  const avisos = [...(opcoes.avisos || []), ...(objetivo.avisos || []).map(String)];
  const vistas = objetivo.vistas || [];
  const vista = vistas.find(v => v && String(v.id) === String(abrigo.vista) && caixaValida(v.caixa)) || vistasPrincipais(objetivo)[0] || null;
  const disc = objetivo.disciplina || 'media_tensao';
  const comps = (objetivo.componentes || []).filter(c => c && c.id != null);
  const ehPorta = (c) => EQ.TIPOS_PORTA.has(String(c.tipo || '').toLowerCase());

  // posições na vista do abrigo (mesmo sistema de coordenadas do contorno)
  const posDe = new Map(comps.map(c => [c, posicoesNaVista(c, vista)]));
  const posicionados = comps.filter(c => !ehPorta(c) && posDe.get(c).length);
  const meioDe = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  const centroPref = posicionados.length ? meioDe(posicionados.flatMap(c => posDe.get(c).map(p => [p.x, p.y]))) : vista ? [(vista.caixa[0] + vista.caixa[2]) / 2, (vista.caixa[1] + vista.caixa[3]) / 2] : null;
  const contorno = contornoDoAbrigo(abrigo, centroPref, avisos);
  if (!contorno) return null;
  const caixaAbrigo = caixaDe(contorno);
  const centro = dentro(centroide(contorno), contorno) ? centroide(contorno) : [(caixaAbrigo[0] + caixaAbrigo[2]) / 2, (caixaAbrigo[1] + caixaAbrigo[3]) / 2];
  const dentroAbrigo = (p) => dentro(p, contorno);

  // pé-direito: o do projeto (abrigo ou dados); senão o típico, a conferir
  const pdProjeto = num(abrigo.pe_direito_m) || num(abrigo.altura_m) || num(objetivo.dados?.pe_direito_m) || num(objetivo.dados?.pe_direito_abrigo_m);
  const peDireito = pdProjeto && pdProjeto >= 2 && pdProjeto <= 12 ? pdProjeto : PE_DIREITO_ABRIGO;
  if (peDireito !== pdProjeto) avisos.push(`Pé-direito do abrigo não informado no projeto: adotado ${br(PE_DIREITO_ABRIGO)} m (típico) [CONFERIR].`);

  // compartimentos (ambientes do 3D); sem eles, o abrigo inteiro é um ambiente
  const nomePadrao = abrigo.nome || (/SUBESTA/i.test(`${objetivo.tipo || ''} ${objetivo.titulo || ''}`) ? 'SUBESTAÇÃO' : 'ABRIGO');
  const compartimentos = (abrigo.compartimentos || []).map(c => ({ ...c, poligono: poligono(c?.poligono) })).filter(c => c.poligono && areaPoligono(c.poligono) >= 0.8);
  const ambientes = (compartimentos.length ? compartimentos : [{ nome: nomePadrao, poligono: contorno }]).map(c => ({
    nome: nomeDeAmbiente(c.nome, nomePadrao), poligono: c.poligono, area_m2: r2(areaPoligono(c.poligono)), perimetro_m: r2(perimetro(c.poligono)), centro: centroide(c.poligono), origem: 'objetivo',
  }));

  // portas: as do abrigo e os componentes "porta" com posição
  const portasDadas = [];
  for (const p of abrigo.portas || []) {
    const meio = Array.isArray(p?.meio) ? p.meio.map(Number) : Array.isArray(p) ? p.map(Number) : [Number(p?.x), Number(p?.y)];
    if (!meio.every(Number.isFinite)) continue;
    portasDadas.push({ meio, largura_m: num(p.largura_m) || EQ.larguraDaPorta(p.especificacao) || 1.0, dupla: !!p.dupla || Number(p.folhas) >= 2, nome: p.nome || '' });
  }
  // a porta do componente (balão da relação) é a MESMA do contorno quando o abrigo já tem tantas portas quanto
  // a relação pede: não abre um segundo vão ao lado (caso real: balão a 0,8 m do arco da porta)
  const portasPedidas = comps.filter(ehPorta).reduce((s, c) => s + (num(c.quantidade) || posDe.get(c).length || 1), 0);
  for (const c of portasDadas.length >= portasPedidas ? [] : comps.filter(ehPorta)) {
    for (const p of posDe.get(c)) {
      if (portasDadas.some(q => dist(q.meio, [p.x, p.y]) < 0.6)) continue;
      const L = EQ.larguraDaPorta(c.especificacao) || 1.0;
      portasDadas.push({ meio: [p.x, p.y], largura_m: L, dupla: L >= 1.6 || Number(c.especificacao?.folhas) === 2, nome: textoComp(c, EQ.equipamentoDe(c)) });
    }
  }
  const { lados, portas, referencia: paredes } = paredesEPortas(contorno, compartimentos, portasDadas, avisos);
  if (!portas.length) avisos.push('Porta do abrigo sem posição no projeto: o 3D mostra o abrigo fechado [CONFERIR].');
  const portaExt = portas.find(p => p.externa) || portas[0] || null;

  // eixo do lado de parede mais próximo (peça do piso fica paralela à parede)
  const ladoPerto = (p) => lados.filter(l => l.externo).reduce((m, l) => { const d = projetar(p, l.a, l.b).d; return !m || d < m.d ? { l, d } : m; }, null)?.l;

  // ── peças ──
  const pecas = []; // { comp, eq, tam, x, y, ...campos do dispositivo }
  const fichas = [];
  const semPosicao = [];
  const pecasDe = new Map();
  const add = (c, eq, tam, campos) => { const lista = pecasDe.get(c) || []; lista.push(campos); pecasDe.set(c, lista); };

  // 1) com posição na planta: cada posição é um objeto
  for (const c of posicionados) {
    const eq = EQ.equipamentoDe(c), tam = EQ.tamanhoDe(eq, c.especificacao);
    for (const p of posDe.get(c)) {
      const campos = { x: p.x, y: p.y };
      if (eq.h === 'piso') { const l = ladoPerto([p.x, p.y]); if (l) campos.direcao = l.u; }
      add(c, eq, tam, campos);
    }
  }
  // 2) poste de entrada sem posição: fora do abrigo, na direção do ramal (peças da entrada
  // fora do abrigo) ou, sem elas, ao lado (+y), a AFASTAMENTO_POSTE_M da parede
  const doTipo = (k) => comps.filter(c => EQ.chaveTipo(c.tipo) === k);
  const postes = doTipo('poste');
  let poste = null; // { x, y, H, dir }
  const pecaDePoste = postes.find(c => pecasDe.get(c)?.length);
  const forasDoRamal = comps.filter(c => TIPOS_RAMAL.includes(EQ.chaveTipo(c.tipo)) && pecasDe.get(c)).flatMap(c => pecasDe.get(c).map(p => [p.x, p.y])).filter(p => !dentroAbrigo(p));
  if (pecaDePoste) {
    const p = pecasDe.get(pecaDePoste)[0];
    poste = { x: p.x, y: p.y, H: EQ.tamanhoDe(EQ.equipamentoDe(pecaDePoste), pecaDePoste.especificacao)[2], dir: unit([p.x - centro[0], p.y - centro[1]]) };
  } else if (postes.length) {
    const c = postes[0], eq = EQ.equipamentoDe(c), tam = EQ.tamanhoDe(eq, c.especificacao);
    const dir = forasDoRamal.length ? unit([meioDe(forasDoRamal)[0] - centro[0], meioDe(forasDoRamal)[1] - centro[1]]) : [0, 1];
    // até a parede pela direção (raio do centro ao contorno) + o afastamento
    let alcance = 0;
    for (let s = 0; s < 200 && dentroAbrigo([centro[0] + dir[0] * s * 0.1, centro[1] + dir[1] * s * 0.1]); s++) alcance = s * 0.1;
    const x = centro[0] + dir[0] * (alcance + AFASTAMENTO_POSTE_M), y = centro[1] + dir[1] * (alcance + AFASTAMENTO_POSTE_M);
    poste = { x, y, H: tam[2], dir };
    semPosicao.push(c);
    add(c, eq, tam, { x, y, direcao: [-dir[1], dir[0]], lugar: 'tipica' });
    avisos.push(`${textoComp(c, eq)}: sem posição na planta — posto fora do abrigo, a ${br(AFASTAMENTO_POSTE_M, 1)} m da parede, ${forasDoRamal.length ? 'na direção do ramal de entrada' : 'ao lado (direção do ramal não identificada)'} [CONFERIR].`);
  }

  // peça de parede desenhada FORA do abrigo: junto do poste (até 1,5 m) vai no poste, na altura
  // típica abaixo do topo; longe dele fica onde o desenho diz — sem "grudar" na parede do abrigo
  for (const c of posicionados) {
    const eq = EQ.equipamentoDe(c);
    if (typeof eq.h !== 'number') continue;
    for (const p of pecasDe.get(c)) {
      if (dentroAbrigo([p.x, p.y]) || distanciaContorno([p.x, p.y], contorno) < 0.5) continue;
      const noPoste = poste && dist([p.x, p.y], [poste.x, poste.y]) <= 1.5;
      const olhar = noPoste ? [-poste.dir[0], -poste.dir[1]] : unit([centro[0] - p.x, centro[1] - p.y]);
      Object.assign(p, { posicaoFixa: true, z_fixo: r2(noPoste ? poste.H - (eq.noPoste || 1.5) : eq.h), direcao: olhar });
      if (noPoste && dist([p.x, p.y], [poste.x, poste.y]) < 0.15) { p.x += olhar[0] * 0.18; p.y += olhar[1] * 0.18; }
    }
  }

  // 3) os outros sem posição: lugar típico do tipo ou o pátio
  const frente = comps.filter(c => TIPOS_FRENTE.includes(EQ.chaveTipo(c.tipo)) && pecasDe.get(c)).flatMap(c => pecasDe.get(c)).find(p => dentroAbrigo([p.x, p.y]));
  const cantos = contorno.map(v => { const d = unit([v[0] - centro[0], v[1] - centro[1]]); return [v[0] + d[0] * 0.6, v[1] + d[1] * 0.6]; });
  const ladosLivres = lados.filter(l => l.externo && !l.cortes.length && l.L >= 0.8).sort((p, q) => q.L - p.L);
  const uso = {};
  const lugarTipico = (k, c, eq, i) => {
    const n = (uso[k] = (uso[k] ?? -1) + 1);
    if (eq.noPoste && poste) {
      // no poste: abaixo do topo, ao longo da cruzeta (perpendicular ao ramal), olhando para o abrigo
      const cr = [-poste.dir[1], poste.dir[0]];
      const off = (i - (objetosSemPosicao(c, eq) - 1) / 2) * 0.6;
      return { x: poste.x + cr[0] * off - poste.dir[0] * 0.18, y: poste.y + cr[1] * off - poste.dir[1] * 0.18, z_fixo: r2(poste.H - eq.noPoste), direcao: [-poste.dir[0], -poste.dir[1]], posicaoFixa: true };
    }
    if (k === 'extintor' && portaExt) {
      // por dentro, ao lado da porta (lado da dobradiça), na parede
      const p = [portaExt.dobradica[0] - portaExt.u[0] * (0.45 + 0.4 * n) - portaExt.n[0] * 0.2, portaExt.dobradica[1] - portaExt.u[1] * (0.45 + 0.4 * n) - portaExt.n[1] * 0.2];
      return { x: p[0], y: p[1] };
    }
    if (k === 'placa_advertencia' && portaExt) {
      // por fora, ao lado da porta (lado do batente)
      const p = [portaExt.batente[0] + portaExt.u[0] * (0.4 + 0.5 * n) + portaExt.n[0] * 0.2, portaExt.batente[1] + portaExt.u[1] * (0.4 + 0.5 * n) + portaExt.n[1] * 0.2];
      return { x: p[0], y: p[1] };
    }
    if (k === 'tapete_borracha') {
      // na frente da peça de manobra; sem ela, logo depois da porta; sem porta, no meio do abrigo
      let p = frente ? [frente.x + unit([centro[0] - frente.x, centro[1] - frente.y])[0] * 0.9, frente.y + unit([centro[0] - frente.x, centro[1] - frente.y])[1] * 0.9] : portaExt ? [portaExt.meio[0] - portaExt.n[0] * 0.8, portaExt.meio[1] - portaExt.n[1] * 0.8] : centro;
      if (!dentroAbrigo(p)) p = centro;
      const l = ladoPerto(p);
      return { x: p[0] + n * 0.3, y: p[1] + n * 0.3, ...(l ? { direcao: l.u } : {}) };
    }
    if ((k === 'haste' || k === 'caixa_inspecao') && n < cantos.length) return { x: cantos[n][0], y: cantos[n][1] };
    if (k === 'veneziana' && ladosLivres.length) {
      // alternando parede e altura: ventilação alta e baixa em paredes opostas
      const l = ladosLivres[n % ladosLivres.length];
      const m = [(l.a[0] + l.b[0]) / 2 - l.n[0] * 0.1, (l.a[1] + l.b[1]) / 2 - l.n[1] * 0.1];
      return { x: m[0], y: m[1], ...(n % 2 ? { altura_m: 0.5 } : {}) };
    }
    if (k === 'luminaria') { const a = ambientes[n % ambientes.length]; return { x: a.centro[0], y: a.centro[1] }; }
    return null;
  };
  const patio = []; // { c, eq, tam, campos }
  const deOutraVista = []; // posição só numa vista de contexto/apoio: é da base, não do abrigo
  for (const c of comps) {
    if (ehPorta(c) || pecasDe.get(c)) continue;
    // posição só numa vista de APOIO (detalhe do poste, corte, legenda) é o mesmo componente desenhado em outro
    // lugar da folha: vai ao lugar típico (o poste de entrada e as peças dele — pedido de 09/11/2026). Só a posição
    // numa vista de CONTEXTO (a base de outro projeto) deixa o componente fora do 3D.
    const papelDe = (id) => (objetivo.vistas || []).find(v => v && String(v.id) === String(id))?.papel || null;
    const vistasDele = (c.posicoes || []).filter(p => p && p.vista != null && p.vista !== '').map(p => papelDe(p.vista));
    if (vistasDele.length && vistasDele.every(pp => pp === 'contexto' || pp === 'fora')) { deOutraVista.push(c); continue; }
    const eq = EQ.equipamentoDe(c), tam = EQ.tamanhoDe(eq, c.especificacao);
    semPosicao.push(c);
    for (let i = 0; i < objetosSemPosicao(c, eq); i++) {
      const lugar = lugarTipico(eq.chave, c, eq, i);
      if (lugar) add(c, eq, tam, { ...lugar, lugar: 'tipica' });
      else patio.push({ c, eq, tam });
    }
  }
  // pátio: coluna ao lado do abrigo (do lado oposto ao poste), peças em fila, a 1,5 m da parede
  let ambPatio = null;
  if (patio.length) {
    const lado = poste && poste.dir[0] > 0.5 ? -1 : 1;
    const COL = 1.8;
    let col = 0, yAt = caixaAbrigo[3] - 0.3;
    const pts = [];
    for (const { c, eq, tam } of patio) {
      const passo = Math.max(eq.h === 'piso' ? tam[1] : tam[0], 0.3) + 0.5;
      if (yAt - passo < caixaAbrigo[1] - 0.5 && pts.length) { col++; yAt = caixaAbrigo[3] - 0.3; }
      const x = lado > 0 ? caixaAbrigo[2] + 1.5 + COL * (col + 0.5) : caixaAbrigo[0] - 1.5 - COL * (col + 0.5);
      const y = yAt - passo / 2;
      yAt -= passo;
      // peça de parede no pátio: em pé, baixa, virada para o abrigo
      const campos = eq.h === 'piso' ? { x, y } : eq.h === 'teto' ? { x, y, posicaoFixa: true, z_fixo: 0.3, direcao: [0, 0] } : { x, y, posicaoFixa: true, z_fixo: r2(Math.max(tam[1] / 2 + 0.3, 0.6)), direcao: [-lado, 0] };
      add(c, eq, tam, { ...campos, lugar: 'patio' });
      pts.push([x - Math.max(tam[0], 0.3) / 2, y - passo / 2], [x + Math.max(tam[0], 0.3) / 2, y + passo / 2]);
    }
    const cx = expandir(caixaDe(pts), 0.3);
    const pol = [[cx[0], cx[1]], [cx[2], cx[1]], [cx[2], cx[3]], [cx[0], cx[3]]];
    ambPatio = { nome: NOME_PATIO, poligono: pol, area_m2: r2(areaPoligono(pol)), perimetro_m: r2(perimetro(pol)), centro: centroide(pol), origem: 'objetivo' };
  }

  // ── dispositivos (um tipo por componente) ──
  const dispositivos = [];
  for (const [c, lista] of pecasDe) {
    const eq = EQ.equipamentoDe(c), tam = EQ.tamanhoDe(eq, c.especificacao);
    // altura de instalação escrita ("extintor a 1,50 m do piso", "h = 1,50 m") no objeto ou no texto da especificação
    const alturaEsp = num(c.especificacao?.altura_m) || num(c.especificacao?.altura_instalacao_m) || num(/(?:\bh\s*=|altura(?:\s+de)?|\ba)\s*(\d+[.,]\d+)\s*m\b/i.exec(EQ.textoDaEspecificacao(c.especificacao))?.[1]);
    lista.forEach((campos, i) => {
      const { lugar, ...resto } = campos;
      dispositivos.push({
        simbolo: eq.simbolo, disciplina: eq.chave === 'luminaria' ? 'iluminacao' : disc, rotulo: textoComp(c, eq), componente: String(c.id), tam, cor: eq.cor,
        id: `${c.id}#${i + 1}`, expandeRegiao: true,
        // altura da especificação (extintor "a 1,50 m") vale sobre a típica da peça de parede
        ...(alturaEsp && typeof eq.h === 'number' && eq.chave !== 'poste' ? { altura_m: alturaEsp } : {}),
        ...resto,
      });
    });
    const posicao = posDe.get(c).length ? 'desenho' : lista.some(p => p.lugar === 'patio') ? 'patio' : 'tipica';
    fichas.push(fichaDoComponente(c, eq, tam, posicao, lista.length));
  }

  // desenho do objeto no piso (só a vizinhança do abrigo e das peças; sem as camadas de contexto)
  let caixaObjeto = caixaAbrigo;
  for (const d of dispositivos) caixaObjeto = uniao(caixaObjeto, [d.x, d.y, d.x, d.y]);
  // vista em outra escala (./objetivoEmMetros): recorta no sistema do desenho e leva os traços para metros reais
  const esc = objetivo._escala;
  const ida = esc ? ([x, y]) => [r2(esc.origem[0] + (x - esc.origem[0]) * esc.fator), r2(esc.origem[1] + (y - esc.origem[1]) * esc.fator)] : null;
  const volta = esc ? ([x, y]) => [esc.origem[0] + (x - esc.origem[0]) / esc.fator, esc.origem[1] + (y - esc.origem[1]) / esc.fator] : null;
  const caixaPiso = expandir(caixaObjeto, 1);
  const caixaRecorte = esc ? [...volta([caixaPiso[0], caixaPiso[1]]), ...volta([caixaPiso[2], caixaPiso[3]])] : caixaPiso;
  const noPiso = opcoes.plantaNoPiso === false ? [] : recortarArquitetura({ ambientes: [], portas: [], referencia: arquitetura.referencia || [] }, caixaRecorte).referencia
    .filter(foraDoContexto(objetivo.camadasDeContexto)).map(r => ({ ...r, ...(ida ? { pts: r.pts.map(ida) } : {}), layer: LAYER_REFERENCIA }));

  const arqAbrigo = {
    ambientes: [...ambientes, ...(ambPatio ? [ambPatio] : [])],
    portas,
    referencia: [...paredes, ...noPiso],
    regioesPlanta: [expandir(caixaObjeto, 1)],
    extensao: { min: [caixaObjeto[0], caixaObjeto[1]], max: [caixaObjeto[2], caixaObjeto[3]] },
  };

  // avisos do foco
  const descartadas = vistasDescartadas(objetivo);
  avisos.unshift(`Modelo focado no objetivo do projeto${objetivo.titulo ? ` (${objetivo.titulo})` : ''}: só o abrigo e os equipamentos do projeto${descartadas.length ? `; ${descartadas.length} vista(s) de contexto/apoio do desenho não entram (${descartadas.slice(0, 4).map(v => v.titulo || v.tipo || v.id).join(', ')}${descartadas.length > 4 ? '…' : ''})` : ''}${(objetivo.camadasDeContexto || []).length ? `; camadas de base de outro projeto ignoradas: ${objetivo.camadasDeContexto.slice(0, 4).join(', ')}${objetivo.camadasDeContexto.length > 4 ? ` e mais ${objetivo.camadasDeContexto.length - 4}` : ''}` : ''}.`);
  const semPosicaoOutros = semPosicao.filter(c => EQ.chaveTipo(c.tipo) !== 'poste');
  if (semPosicaoOutros.length) avisos.push(`${semPosicaoOutros.length} componente(s) sem posição na planta — postos no lugar típico do tipo ou no pátio ao lado, com "posição a conferir": ${semPosicaoOutros.slice(0, 8).map(c => textoComp(c, EQ.equipamentoDe(c))).join('; ')}${semPosicaoOutros.length > 8 ? '…' : ''} [CONFERIR].`);
  if (deOutraVista.length) avisos.push(`${deOutraVista.length} componente(s) com posição só em outra vista do desenho (não na planta do abrigo) ficaram fora do 3D: ${deOutraVista.slice(0, 6).map(c => textoComp(c, EQ.equipamentoDe(c))).join('; ')}${deOutraVista.length > 6 ? '…' : ''} [CONFERIR].`);
  const aConferir = comps.filter(c => c.conferir && !ehPorta(c));
  if (aConferir.length) avisos.push(`${aConferir.length} componente(s) marcados para conferir na leitura do projeto (ver a ficha de cada um no clique).`);
  avisos.push('Formas e dimensões dos equipamentos são ilustrativas (típicas de catálogo); o transformador segue a potência (kVA) da especificação quando ela traz. Clique num equipamento para ver a ficha do projeto.');

  const cena = montarCena(arqAbrigo, {
    peDireito, dispositivos, avisos, trechos: [], estimarInfra: false, sugerirInfra: false, instalacaoEstimada: false,
    titulo: opcoes.titulo || objetivo.titulo, cliente: opcoes.cliente, obra: opcoes.obra, proposta: opcoes.proposta,
  });
  // compartimentos do abrigo são área técnica (a cor do piso); o pátio não conta como área do projeto
  for (const a of cena.ambientes) if (a.nome !== NOME_PATIO) a.tipo = 'tecnico';
  for (const a of cena.numeros.por_ambiente) if (a.nome !== NOME_PATIO) a.tipo = 'tecnico';
  if (ambPatio) {
    const pa = cena.ambientes.find(a => a.nome === NOME_PATIO);
    if (pa) {
      cena.numeros.area_externa_m2 = r2(Math.max(0, cena.numeros.area_externa_m2 - pa.area_m2));
      cena.numeros.ambientes_externos = Math.max(0, cena.numeros.ambientes_externos - 1);
      cena.numeros.por_ambiente = cena.numeros.por_ambiente.filter(a => a.nome !== NOME_PATIO);
    }
  }
  // telas de proteção entre compartimentos: na altura de uma tela (não de guarda-corpo)
  cena.guardas = cena.guardas.map(g => [...g.slice(0, 6), r2(Math.min(2.2, peDireito))]);
  cena.numeros.abrigo = { largura_m: r2(Math.min(caixaAbrigo[2] - caixaAbrigo[0], caixaAbrigo[3] - caixaAbrigo[1])), comprimento_m: r2(Math.max(caixaAbrigo[2] - caixaAbrigo[0], caixaAbrigo[3] - caixaAbrigo[1])), area_m2: r2(areaPoligono(contorno)), pe_direito_m: peDireito, pe_direito_do_projeto: peDireito === pdProjeto };
  cena.componentes = fichas;
  // números do projeto: a quantidade da relação de materiais (60 m de cabo, não "1 peça")
  cena.numeros.dispositivos.forEach((d, i) => {
    const f = fichas.find(x => x.id === String(cena.dispositivos[i]?.componente));
    const q = Number(String(f?.quantidade ?? '').replace(',', '.'));
    if (f && Number.isFinite(q) && q > 0) Object.assign(d, { quantidade: q, unidade: String(f.unidade || 'un') });
  });
  cena.plantaInfo = {
    n: 1, nome: `Planta 1 — ${objetivo.titulo || nomePadrao}${vista?.titulo ? ` (${vista.titulo})` : ''}`.slice(0, 90),
    caixa: (vista ? vista.caixa : caixaAbrigo).map(r2), pontos: dispositivos.length, origem: 'objetivo', area_m2: r2(areaPoligono(contorno)),
  };
  cena.objetivoInfo = infoDoObjetivo(objetivo, vista, comps.filter(c => !ehPorta(c)).length, semPosicao.length);
  return cena;
}

const infoDoObjetivo = (obj, vista, componentes, semPosicao) => ({
  disciplina: obj.disciplina || null, tipo: obj.tipo || null, titulo: obj.titulo || '', vistaPrincipal: vista ? vista.id ?? null : null, componentes, semPosicao,
});

module.exports = { montarCenaDoAbrigo, dispositivosDoObjetivo, semCamadasDeContexto, vistasPrincipais, vistasDescartadas, infoDoObjetivo, posicoesNaVista, NOME_PATIO, PE_DIREITO_ABRIGO };
