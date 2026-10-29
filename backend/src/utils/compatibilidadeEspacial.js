// Compatibilização POR POSIÇÃO entre os desenhos (DWG/DXF) de um pacote de
// projeto (versão 2.3) — o que antes só se via sobrepondo as pranchas no AutoCAD:
//   - alinhamento: cada desenho é casado com a arquitetura (ou com o desenho
//     de mais ambientes) pelos ambientes de mesmo nome; desenho deslocado é
//     corrigido pela translação; o que não casa (outro pavimento, sem
//     ambientes) forma outro grupo ou fica fora da verificação, com aviso;
//   - componentes próximos demais entre disciplinas (detector × luminária,
//     detector × saída de ar, câmera × luminária, IVP × saída de ar) e
//     componentes de disciplinas diferentes no MESMO ponto;
//   - traçado de energia sobreposto ao de telecomunicações (mesmo caminho);
//   - desenhos feitos sobre revisões diferentes da arquitetura (áreas divergentes).
// As distâncias são CRITÉRIOS ADOTADOS pela H&M (declarados em cada achado) —
// conferir na norma e no manual do equipamento; o objetivo é apontar onde olhar.
// Entrada por arquivo: { arquivo, disciplinas, referencia, espacial } (services/analiseCad/index.js).

const REGRAS = [
  { a: 'detector', b: 'luminaria', min: 0.5, tema: 'Detector de incêndio junto de luminária',
    criterio: 'afastamento mínimo adotado de 0,5 m (calor e obstrução junto do detector) — conferir na NBR 17240 e no manual do detector' },
  { a: 'detector', b: 'difusor', min: 1.5, tema: 'Detector de incêndio junto de saída de ar',
    criterio: 'afastamento mínimo adotado de 1,5 m de insuflamento/retorno (a corrente de ar desvia a fumaça) — conferir na NBR 17240' },
  { a: 'sensor_alarme', b: 'difusor', min: 1.0, tema: 'Sensor de alarme junto de saída de ar',
    criterio: 'afastamento adotado de 1,0 m (variação de temperatura do ar provoca disparo falso do IVP)' },
  { a: 'camera', b: 'luminaria', min: 0.6, tema: 'Câmera junto de luminária',
    criterio: 'afastamento adotado de 0,6 m (ofuscamento e reflexo na imagem)' },
];
const MESMO_PONTO_M = 0.2;
const ENERGIA = new Set(['eletrica', 'iluminacao', 'eletrica_hospitalar', 'eletrica_industrial']);
const TELECOM = new Set(['cabeamento', 'rede', 'cftv', 'telefonia', 'antena']);
const TRACADO_DIST_M = 0.15;
const MAX_CONFLITOS = 300;
// segmento de traçado mais longo que isso não é eletroduto/eletrocalha de
// verdade (linha de construção, erro de escala/unidade): fica de fora, com aviso
const MAX_SEGMENTO_M = 1000;

const { chaveNome: normalizar } = require('./texto');
const br = (v, c = 2) => Number(v).toFixed(c).replace('.', ',');
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); const k = Math.floor(s.length / 2); return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

function centroide(p) {
  let a = 0, cx = 0, cy = 0;
  p.forEach(([x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; const f = x * y2 - x2 * y; a += f; cx += (x + x2) * f; cy += (y + y2) * f; });
  if (Math.abs(a) < 1e-9) return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
  return [cx / (3 * a), cy / (3 * a)];
}
function dentro([x, y], p) {
  let d = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

// nome normalizado → { centro, area } só dos nomes que aparecem uma vez no desenho
function ambientesUnicos(esp) {
  const cont = new Map();
  for (const a of esp.ambientes) { const k = normalizar(a.nome); cont.set(k, (cont.get(k) || 0) + 1); }
  const m = new Map();
  for (const a of esp.ambientes) { const k = normalizar(a.nome); if (k && cont.get(k) === 1) m.set(k, { centro: centroide(a.poligono), area: a.area_m2, origem: a.origem }); }
  return m;
}

// Translação que leva o desenho `f` para o sistema da referência `ref`, por
// VOTAÇÃO: cada par de ambientes de nome igual (ou um contido no outro —
// "CIRCULAÇÃO" × "CIRCULAÇÃO A") propõe um deslocamento; vence o deslocamento
// em que mais ambientes DISTINTOS concordam (a 0,3 m), pesando a área parecida.
// Precisa de 3 ambientes concordando. Ambiente de mesmo nome desenhado de outro
// jeito (sanitários juntos × separados) só perde o voto, não derruba o alinhamento.
const palavras = (s) => normalizar(s).split(' ').filter(Boolean);
const contido = (a, b) => a.length > 0 && a.every(p => b.includes(p));
function alinhar(ref, f) {
  const prep = (esp) => esp.ambientes
    .map((a, i) => ({ i, p: palavras(a.nome), centro: centroide(a.poligono), area: a.area_m2 }))
    .filter(a => a.p.join(' ').length >= 3 && !a.p.some(w => /^\d+$/.test(w) && a.p.length === 1));
  const R = prep(ref.espacial), F = prep(f.espacial);
  const pares = [];
  for (const a of F) {
    for (const b of R) {
      const igual = a.p.join(' ') === b.p.join(' ');
      if (!igual && !contido(a.p, b.p) && !contido(b.p, a.p)) continue;
      const areaParecida = Math.abs(a.area - b.area) <= Math.max(0.5, b.area * 0.1);
      pares.push({ f: a.i, dx: b.centro[0] - a.centro[0], dy: b.centro[1] - a.centro[1], peso: (igual ? 2 : 1) + (areaParecida ? 2 : 0) });
      if (pares.length > 20000) break;
    }
  }
  let melhor = null;
  for (const c of pares) {
    const junto = pares.filter(p => Math.hypot(p.dx - c.dx, p.dy - c.dy) < 0.3);
    const distintos = new Set(junto.map(p => p.f)).size;
    const peso = junto.reduce((s, p) => s + p.peso, 0);
    if (!melhor || distintos > melhor.distintos || (distintos === melhor.distintos && peso > melhor.peso)) melhor = { junto, distintos, peso };
  }
  if (melhor && melhor.distintos >= 3) {
    const dx = mediana(melhor.junto.map(p => p.dx)), dy = mediana(melhor.junto.map(p => p.dy));
    return { dx: Math.abs(dx) < 0.01 ? 0 : dx, dy: Math.abs(dy) < 0.01 ? 0 : dy, casados: melhor.distintos, por: 'ambientes' };
  }
  // sem ambientes que casem: desenho feito sobre a mesma base (xref) — os componentes caem dentro dos ambientes da referência
  const pts = f.espacial.pontos;
  if (pts.length >= 5 && ref.espacial.ambientes.length >= 3) {
    const dentroRef = pts.filter(p => ref.espacial.ambientes.some(amb => dentro([p.x, p.y], amb.poligono))).length;
    if (dentroRef / pts.length >= 0.6) return { dx: 0, dy: 0, casados: 0, por: 'posicao' };
  }
  return null;
}

// Grade espacial simples (célula em metros) para não comparar tudo com tudo
function grade(itens, cel, caixa) {
  const g = new Map();
  itens.forEach((it, i) => {
    const [x0, y0, x1, y1] = caixa(it);
    for (let cx = Math.floor(x0 / cel); cx <= Math.floor(x1 / cel); cx++) {
      for (let cy = Math.floor(y0 / cel); cy <= Math.floor(y1 / cel); cy++) {
        const k = `${cx},${cy}`;
        (g.get(k) || g.set(k, []).get(k)).push(i);
      }
    }
  });
  return {
    perto(x0, y0, x1, y1) {
      const s = new Set();
      for (let cx = Math.floor(x0 / cel); cx <= Math.floor(x1 / cel); cx++) for (let cy = Math.floor(y0 / cel); cy <= Math.floor(y1 / cel); cy++) for (const i of g.get(`${cx},${cy}`) || []) s.add(i);
      return [...s];
    },
  };
}

// Células por onde o SEGMENTO passa (com folga), andando ao longo dele em
// passos de meia célula — e não todas as células da caixa dele: a caixa de uma
// diagonal de 2 km tem 1 milhão de células de 2 m (1 s e 425 MB por segmento).
function celulasDoSegmento([ax, ay, bx, by], cel, folga) {
  const comp = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.ceil(comp / (cel / 2)));
  // cada amostra cobre meio passo para cada lado ao longo do segmento, mais a folga
  const meia = comp / (2 * n) + folga;
  const ks = new Set();
  for (let i = 0; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n, y = ay + ((by - ay) * i) / n;
    for (let cx = Math.floor((x - meia) / cel); cx <= Math.floor((x + meia) / cel); cx++) {
      for (let cy = Math.floor((y - meia) / cel); cy <= Math.floor((y + meia) / cel); cy++) ks.add(`${cx},${cy}`);
    }
  }
  return ks;
}

// Grade de segmentos: cada um entra só nas células ao longo dele (com a folga
// de proximidade); a consulta anda ao longo do outro segmento do mesmo jeito.
function gradeDeSegmentos(itens, cel, folga, segmentoDe) {
  const g = new Map();
  itens.forEach((it, i) => {
    for (const k of celulasDoSegmento(segmentoDe(it), cel, folga)) (g.get(k) || g.set(k, []).get(k)).push(i);
  });
  return {
    pertoDoSegmento(seg) {
      const s = new Set();
      for (const k of celulasDoSegmento(seg, cel, 0)) for (const i of g.get(k) || []) s.add(i);
      return [...s];
    },
  };
}

function ambienteEm(ambientes, x, y) {
  return ambientes.filter(a => dentro([x, y], a.poligono)).sort((a, b) => a.area_m2 - b.area_m2)[0]?.nome || null;
}

// componentes próximos demais
function conflitosDePontos(pontos, ambientesRef) {
  const out = [];
  const g = grade(pontos, 2, (p) => [p.x, p.y, p.x, p.y]);
  const lado = (p) => ({ arquivo: p.arquivo, descricao: p.descricao, disciplina: p.disciplina, classe: p.classe });
  for (const regra of REGRAS) {
    for (const a of pontos.filter(p => p.classe === regra.a)) {
      let melhor = null;
      for (const i of g.perto(a.x - regra.min, a.y - regra.min, a.x + regra.min, a.y + regra.min)) {
        const b = pontos[i];
        if (b.classe !== regra.b) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < regra.min && (!melhor || d < melhor.d)) melhor = { b, d };
      }
      if (melhor) {
        out.push({ tipo: 'afastamento', tema: regra.tema, criterio: regra.criterio, distancia: Math.round(melhor.d * 100) / 100, minimo: regra.min,
          x: a.x, y: a.y, ambiente: ambienteEm(ambientesRef, a.x, a.y), a: lado(a), b: lado(melhor.b) });
      }
    }
  }
  // mesmo ponto: disciplinas diferentes (ou um de climatização/hidráulica) a menos de 20 cm
  const jaTem = new Set(out.map(c => `${c.a.arquivo}|${c.x}|${c.y}`));
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i];
    for (const j of g.perto(a.x - MESMO_PONTO_M, a.y - MESMO_PONTO_M, a.x + MESMO_PONTO_M, a.y + MESMO_PONTO_M)) {
      if (j <= i) continue;
      const b = pontos[j];
      if (a.disciplina && a.disciplina === b.disciplina) continue;
      if (!a.disciplina && !b.disciplina) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d >= MESMO_PONTO_M || jaTem.has(`${a.arquivo}|${a.x}|${a.y}`) || jaTem.has(`${b.arquivo}|${b.x}|${b.y}`)) continue;
      out.push({ tipo: 'mesmo_ponto', tema: 'Componentes de disciplinas diferentes no mesmo ponto',
        criterio: `menos de ${br(MESMO_PONTO_M)} m entre eles — um dos dois precisa mudar de lugar`, distancia: Math.round(d * 100) / 100, minimo: MESMO_PONTO_M,
        x: a.x, y: a.y, ambiente: ambienteEm(ambientesRef, a.x, a.y), a: lado(a), b: lado(b) });
      jaTem.add(`${a.arquivo}|${a.x}|${a.y}`);
    }
  }
  return out;
}

// traçados de energia e de telecomunicações no mesmo caminho
function conflitosDeTracado(trechos, ambientesRef) {
  const segs = [];
  // segmentos longos demais ignorados: { arquivo, layer, metros } (vira aviso nos achados)
  const longos = [];
  for (const t of trechos) {
    const grupo = ENERGIA.has(t.disciplina) ? 'energia' : TELECOM.has(t.disciplina) ? 'telecom' : null;
    if (!grupo) continue;
    for (const s of t.segmentos) {
      const comp = Math.hypot(s[2] - s[0], s[3] - s[1]);
      if (!Number.isFinite(comp)) continue;
      if (comp > MAX_SEGMENTO_M) { longos.push({ arquivo: t.arquivo, layer: t.layer, metros: comp }); continue; }
      if (comp >= 0.3) segs.push({ s, comp, grupo, t });
    }
  }
  const tel = segs.filter(x => x.grupo === 'telecom');
  if (!tel.length) return { conflitos: [], resumo: [], longos };
  const g = gradeDeSegmentos(tel, 2, TRACADO_DIST_M, ({ s }) => s);
  const porPar = new Map();
  for (const e of segs.filter(x => x.grupo === 'energia')) {
    const [ax, ay, bx, by] = e.s;
    const ux = (bx - ax) / e.comp, uy = (by - ay) / e.comp;
    for (const i of g.pertoDoSegmento(e.s)) {
      const d = tel[i];
      const [cx, cy, dx2, dy2] = d.s;
      const vx = (dx2 - cx) / d.comp, vy = (dy2 - cy) / d.comp;
      if (Math.abs(ux * vy - uy * vx) > 0.14) continue; // não paralelos (> ~8°)
      const dist = Math.abs((cx - ax) * uy - (cy - ay) * ux);
      if (dist > TRACADO_DIST_M) continue;
      const t0 = (cx - ax) * ux + (cy - ay) * uy, t1 = (dx2 - ax) * ux + (dy2 - ay) * uy;
      const sobre = Math.min(e.comp, Math.max(t0, t1)) - Math.max(0, Math.min(t0, t1));
      if (sobre < 0.3) continue;
      const k = `${e.t.arquivo}|${e.t.layer}|${d.t.arquivo}|${d.t.layer}`;
      const reg = porPar.get(k) || porPar.set(k, { energia: e.t, telecom: d.t, metros: 0, amostras: [] }).get(k);
      reg.metros += sobre;
      if (reg.amostras.length < 5) {
        const m = Math.max(0, Math.min(t0, t1)) + sobre / 2;
        reg.amostras.push([ax + ux * m, ay + uy * m]);
      }
    }
  }
  const conflitos = [];
  const resumo = [];
  for (const reg of porPar.values()) {
    if (reg.metros < 1) continue;
    resumo.push(reg);
    for (const [x, y] of reg.amostras) {
      conflitos.push({ tipo: 'tracado', tema: 'Energia e telecomunicações no mesmo caminho',
        criterio: 'traçados paralelos a menos de 15 cm — prever separação física (septo na eletrocalha ou caminhos separados) entre energia e telecomunicações; conferir na NBR 14565',
        distancia: null, metros: Math.round(reg.metros * 10) / 10, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, ambiente: ambienteEm(ambientesRef, x, y),
        a: { arquivo: reg.energia.arquivo, descricao: `layer "${reg.energia.layer}"`, disciplina: reg.energia.disciplina },
        b: { arquivo: reg.telecom.arquivo, descricao: `layer "${reg.telecom.layer}"`, disciplina: reg.telecom.disciplina } });
    }
  }
  return { conflitos, resumo, longos };
}

const NOME_DISC = { eletrica: 'elétrica', iluminacao: 'iluminação', incendio: 'incêndio', cftv: 'CFTV', cabeamento: 'cabeamento', rede: 'rede', alarme: 'alarme', telefonia: 'telefonia', antena: 'antena', controle_acesso: 'controle de acesso', automacao: 'automação' };
const rotuloLado = (l) => `${String(l.descricao).replace(/ — bloco .*/, '').slice(0, 50)} (${l.disciplina ? NOME_DISC[l.disciplina] || l.disciplina : 'climatização/hidráulica'}, "${l.arquivo}")`;

// arquivos: [{ arquivo, disciplinas, referencia, tipoReferencia, espacial }]
function compatibilizar(arquivos, { temPdf = false } = {}) {
  const achados = [];
  const comDados = arquivos.filter(a => a.espacial && (a.espacial.ambientes.length || a.espacial.pontos.length || a.espacial.trechos.length));
  // um desenho só também é verificado (prancha com várias disciplinas juntas)
  if (!comDados.length) return { conflitos: [], achados, referencia: null, grupos: [] };

  // referência: arquitetura enviada como referência, depois o desenho com mais ambientes
  const ordem = [...comDados].sort((a, b) => (Number(b.tipoReferencia === 'arquitetura') - Number(a.tipoReferencia === 'arquitetura')) || (b.espacial.ambientes.length - a.espacial.ambientes.length));
  const grupos = [];
  const soltos = [];
  for (const f of ordem) {
    let entrou = false;
    for (const g of grupos) {
      const al = alinhar(g.ref, f);
      if (al) { g.membros.push({ f, ...al }); entrou = true; break; }
    }
    if (entrou) continue;
    if (f.espacial.ambientes.length >= 3) grupos.push({ ref: f, membros: [{ f, dx: 0, dy: 0, casados: f.espacial.ambientes.length, por: 'referencia' }] });
    else soltos.push(f);
  }

  const conflitos = [];
  const contagem = new Map();
  let espacialReferencia = null;
  grupos.forEach((g, gi) => {
    const ambRef = g.ref.espacial.ambientes;
    const pontos = [], trechos = [];
    for (const m of g.membros) {
      const discArquivo = m.f.disciplinas.length === 1 ? m.f.disciplinas[0] : null;
      for (const p of m.f.espacial.pontos) pontos.push({ ...p, x: Math.round((p.x + m.dx) * 100) / 100, y: Math.round((p.y + m.dy) * 100) / 100, arquivo: m.f.arquivo });
      if (!m.f.referencia) {
        for (const t of m.f.espacial.trechos) trechos.push({ ...t, disciplina: t.disciplina || discArquivo, arquivo: m.f.arquivo, segmentos: t.segmentos.map(s => [s[0] + m.dx, s[1] + m.dy, s[2] + m.dx, s[3] + m.dy]) });
      }
      // deslocado em relação à referência
      if (m.f !== g.ref && Math.hypot(m.dx, m.dy) >= 0.05) {
        achados.push({ tema: 'Desenho deslocado em relação à arquitetura',
          observacao: `"${m.f.arquivo}" está ${br(Math.hypot(m.dx, m.dy))} m deslocado de "${g.ref.arquivo}" (casado por ${m.casados} ambientes de mesmo nome). A compatibilização foi feita com a correção; ao sobrepor as pranchas no AutoCAD, use o mesmo ponto de origem.` });
      }
      // revisão diferente da arquitetura: mesmo ambiente com área diferente
      if (m.f !== g.ref && m.por === 'ambientes') {
        // só ambientes desenhados com polilinha de área nos DOIS desenhos (a sala achada
        // pelas paredes varia com o que está desenhado por cima e daria falso alarme)
        const r = ambientesUnicos(g.ref.espacial), a = ambientesUnicos(m.f.espacial);
        const comparaveis = [...a].filter(([k, v]) => r.has(k) && v.origem === 'polilinha' && r.get(k).origem === 'polilinha');
        const difs = comparaveis.filter(([k, v]) => Math.abs(v.area - r.get(k).area) > Math.max(1, r.get(k).area * 0.1))
          .map(([k, v]) => `${k}: ${br(v.area)} m² × ${br(r.get(k).area)} m²`);
        if (difs.length >= 3 && difs.length / comparaveis.length >= 0.25) {
          achados.push({ tema: 'Arquitetura de revisões diferentes',
            observacao: `"${m.f.arquivo}" e "${g.ref.arquivo}" têm ambientes com áreas diferentes (${difs.slice(0, 6).join('; ')}${difs.length > 6 ? `; +${difs.length - 6}` : ''}) — os projetos parecem feitos sobre revisões diferentes da arquitetura. Confirme a revisão vigente antes de orçar.` });
        }
      }
      // componentes fora dos ambientes da referência
      if (m.f !== g.ref && m.f.espacial.pontos.length >= 10) {
        const fora = m.f.espacial.pontos.filter(p => !ambRef.some(amb => dentro([p.x + m.dx, p.y + m.dy], amb.poligono))).length;
        if (fora / m.f.espacial.pontos.length > 0.3) {
          achados.push({ tema: 'Componentes fora da arquitetura', observacao: `${fora} de ${m.f.espacial.pontos.length} componentes de "${m.f.arquivo}" ficam fora dos ambientes de "${g.ref.arquivo}" — conferir pavimento e alinhamento das pranchas.` });
        }
      }
    }
    // grupo da referência: posições reais alinhadas, para o 3D mostrar o
    // projeto como desenhado (services/modelo3d) — com limite, para não pesar o banco
    if (gi === 0) {
      let nSeg = 0;
      espacialReferencia = {
        referencia: g.ref.arquivo,
        pontos: pontos.slice(0, 20000).map(({ x, y, descricao, disciplina, classe }) => ({ x, y, descricao, disciplina, classe })),
        trechos: trechos.map(t => ({ disciplina: t.disciplina, layer: t.layer, segmentos: t.segmentos.slice(0, Math.max(0, 20000 - nSeg)).map(s => { nSeg++; return s.map(v => Math.round(v * 1000) / 1000); }) }))
          .filter(t => t.segmentos.length),
      };
    }
    const novos = [...conflitosDePontos(pontos, ambRef)];
    const tr = conflitosDeTracado(trechos, ambRef);
    novos.push(...tr.conflitos);
    for (const c of novos) {
      contagem.set(c.tema, (contagem.get(c.tema) || []).concat([{ ...c, grupo: gi }]));
      if (conflitos.length < MAX_CONFLITOS) conflitos.push({ ...c, grupo: gi });
    }
    if (tr.longos.length) {
      const porLayer = new Map();
      for (const l of tr.longos) { const k = `"${l.layer}" ("${l.arquivo}")`; porLayer.set(k, (porLayer.get(k) || 0) + 1); }
      achados.push({ tema: 'Traçados longos demais ignorados na compatibilização',
        observacao: `${tr.longos.length} segmento(s) com mais de ${MAX_SEGMENTO_M} m não entraram na verificação de traçados (${[...porLayer].slice(0, 6).map(([k, n]) => `${n} na layer ${k}`).join('; ')}). Linha desse tamanho costuma ser erro de unidade/escala ou linha de construção — conferir no desenho.` });
    }
    for (const reg of tr.resumo) {
      achados.push({ tema: 'Energia e telecomunicações no mesmo caminho',
        observacao: `${br(reg.metros, 1)} m da layer "${reg.energia.layer}" ("${reg.energia.arquivo}") correm a menos de 15 cm da layer "${reg.telecom.layer}" ("${reg.telecom.arquivo}"). Prever separação física (septo na eletrocalha ou caminhos separados) — conferir na NBR 14565.` });
    }
  });

  // um achado por tema, com exemplos
  for (const [tema, lista] of contagem) {
    if (tema === 'Energia e telecomunicações no mesmo caminho') continue;
    const ex = lista.slice(0, 8).map(c => `${c.ambiente || 'fora dos ambientes'}: ${rotuloLado(c.a)} a ${br(c.distancia)} m de ${rotuloLado(c.b)}`);
    achados.push({ tema: `Compatibilização: ${tema}`, observacao: `${lista.length} ocorrência(s). ${ex.join('; ')}${lista.length > 8 ? ` (+${lista.length - 8})` : ''}. Critério: ${lista[0].criterio}.` });
  }

  const semVerificacao = [...soltos, ...grupos.filter(g => g.membros.length < 2 && grupos.length > 1).map(g => g.ref)];
  if (semVerificacao.length) {
    achados.push({ tema: 'Desenhos sem verificação de posição',
      observacao: `${semVerificacao.map(f => `"${f.arquivo}"`).join(', ')}: não casam com a arquitetura dos demais (outro pavimento, ou sem ambientes com nome) — a compatibilização por posição não foi feita para eles. Envie a arquitetura do mesmo pavimento junto.` });
  }
  if (temPdf) {
    achados.push({ tema: 'Compatibilização por posição só entre DWG/DXF', observacao: 'Os PDFs do pacote entram na compatibilização pelo texto (códigos, quadros, listas); a verificação de posição entre componentes e traçados é feita só entre os desenhos DWG/DXF.' });
  }
  return { conflitos, achados, espacial: espacialReferencia, referencia: grupos[0]?.ref.arquivo || null, grupos: grupos.map(g => ({ referencia: g.ref.arquivo, membros: g.membros.map(m => ({ arquivo: m.f.arquivo, dx: m.dx, dy: m.dy, por: m.por })) })) };
}

module.exports = { compatibilizar, alinhar, conflitosDeTracado };
