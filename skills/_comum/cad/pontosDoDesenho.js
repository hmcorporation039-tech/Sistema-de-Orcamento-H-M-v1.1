// Pontos REAIS do projeto lidos do desenho, mesmo quando os blocos vêm
// explodidos (exportação do QiBuilder/AltoQi, PDF convertido): cada símbolo é
// um grupo de traços colados na mesma layer, reconhecido pela MEDIDA. Assim o
// 3D mostra as luminárias, os postes, as caixas e os eletrodutos do projeto, e
// nunca a estimativa pela área das salas.
//
// Pedido do usuário (01/11/2026): o 3D "continua distribuindo iluminação sem nem
// estar no projeto" — a análise da Arena veio do PDF, o DWG entrou só como
// arquitetura e o sistema estimou 868 tomadas pela norma. Agora o 3D mostra só
// o que está desenhado; o que não dá para ler fica de fora, com aviso.
//
//   propostaDeMapa(arq)   → { simbolos, trechos }: tipos de símbolo por layer e
//                           medida, com a proposta pelo nome da layer ("?" = não entra)
//   aplicarMapa(arq, mapa) → { pontos, trechos } em metros, no sistema da arquitetura
//   pontosDoDesenho(arq)  → aplicarMapa(arq, propostaDeMapa(arq)): só os grupos que o
//                           NOME DA LAYER diz o que são (luminária, tomada, interruptor,
//                           quadro, caixa externa) e os postes fora das salas
// Usado pelo sistema (backend/src/services/modelo3d/worker.js) e pela skill
// (skills/modelo-3d/scripts/extrair-pontos.js, em que o engenheiro confere o mapa).
const { dentro } = require('./arquitetura');
const { ESPEC } = require('./modelo3d');
const { tipoDoAmbiente } = require('./estimativaArquitetura');

const MAIOR_SIMBOLO_M = 3; // grupo maior que isso é traçado, não símbolo
const COLA_M = 0.05;       // traços a até 5 cm um do outro são do mesmo símbolo
// layers de instalação (o resto — arquitetura, prancha — não tem pontos)
const RE_INSTALACAO = /^(EL|ELE|IFC|P|INC|CFTV|TEL|SPDA|PCI|HID)[-_ ]|SIMB|L[ÂA]MP|LUMIN|TOMAD|INTERRUP|CAIXA|QUADRO|POSTE|REFLET|PROJETOR|DETEC|C[ÂA]MERA|SENSOR|CONDUT|ELETROD|ELETROCALHA|LEITO|PERFILADO/i;
const RE_FORA = /FIOS?\b|TEXTO|TXT|DIAGRAM|^DI[-_ ]|BARRAMENTO|UNIFILAR|TABELA|MARGEM|PRANCHA|CONTORNO\d|HATCH|HACH|COTA/i;
const RE_TRECHO = /CONDUT|ELETROD|ELETROCALHA|LEITO|PERFILADO/i;

// sugestão pelo nome da layer (na skill o engenheiro confere: é proposta, não leitura)
function sugestao(layer, medida, externo) {
  const [L, W] = medida;
  // no projeto elétrico (layer EL-…) a luminária usa os eletrodutos da elétrica desenhados junto
  if (/L[ÂA]MP|LUMIN|REFLET|PROJETOR/i.test(layer)) return { simbolo: 'HM-ILU-LUMINARIA', disciplina: /^(EL|ELE|IFC)[-_ ]/i.test(layer) ? 'eletrica' : 'iluminacao' };
  if (/POSTE/i.test(layer)) return { simbolo: 'HM-ILU-POSTE', disciplina: 'iluminacao-externa' };
  if (/TOMAD/i.test(layer)) return { simbolo: 'HM-ELE-TOMADA-BAIXA', disciplina: 'eletrica' };
  if (/INTERRUP/i.test(layer)) return { simbolo: 'HM-ELE-INTERRUPTOR', disciplina: 'eletrica' };
  if (/QUADRO/i.test(layer)) return { simbolo: 'HM-ELE-QUADRO', disciplina: 'eletrica' };
  if (/CAIXA/i.test(layer) && externo && L >= 0.1) return { simbolo: 'HM-ELE-CAIXA-PISO', disciplina: 'iluminacao-externa' };
  // traço comprido e fino FORA das salas (estacionamento, quadra): poste com braço
  if (externo && L >= 0.8 && L <= 3 && W <= 0.25) return { simbolo: 'HM-ILU-POSTE', disciplina: 'iluminacao-externa' };
  return null;
}

// grupos de traços colados (caixa envolvente com folga) por layer
function agrupar(refs) {
  const bb = refs.map(r => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of r.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return [x0, y0, x1, y1];
  });
  const pai = bb.map((_, i) => i);
  const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const ordem = bb.map((_, i) => i).sort((i, j) => bb[i][0] - bb[j][0]);
  for (let a = 0; a < ordem.length; a++) {
    const i = ordem[a];
    for (let b = a + 1; b < ordem.length; b++) {
      const j = ordem[b];
      if (bb[j][0] > bb[i][2] + COLA_M) break;
      if (bb[j][1] <= bb[i][3] + COLA_M && bb[j][3] >= bb[i][1] - COLA_M) pai[raiz(i)] = raiz(j);
    }
  }
  const g = new Map();
  bb.forEach((b, i) => {
    const k = raiz(i);
    const o = g.get(k);
    g.set(k, o ? [Math.min(o[0], b[0]), Math.min(o[1], b[1]), Math.max(o[2], b[2]), Math.max(o[3], b[3])] : b);
  });
  return [...g.values()].map(b => ({ caixa: b, centro: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], medida: [b[2] - b[0], b[3] - b[1]].sort((x, y) => y - x) }))
    .filter(s => s.medida[0] <= MAIOR_SIMBOLO_M && s.medida[0] > 0.01);
}

// símbolos da área externa sem legenda na biblioteca (./simbolos.js)
const ROTULO_PADRAO = { 'HM-ILU-POSTE': 'Poste de iluminação', 'HM-ELE-CAIXA-PISO': 'Caixa de passagem no piso' };
const r2 = (v) => Math.round(v * 100) / 100;
const mesmaMedida = (a, b, tol) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol;
const comprimento = (r) => r.pts.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - r.pts[i][0], p[1] - r.pts[i][1]), 0);

// ambiente do ponto (o menor que o contém) e se ele está na área externa
function contexto(arq) {
  const ambienteDe = (p) => arq.ambientes.filter(a => dentro(p, a.poligono)).sort((a, b) => a.area_m2 - b.area_m2)[0] || null;
  const ehExterno = (p) => { const a = ambienteDe(p); return !a || tipoDoAmbiente(a.nome) === 'externo'; };
  const porLayer = new Map();
  for (const r of arq.referencia) {
    if (!r.pts.length || !RE_INSTALACAO.test(r.layer || '') || RE_FORA.test(r.layer || '')) continue;
    if (!porLayer.has(r.layer)) porLayer.set(r.layer, []);
    porLayer.get(r.layer).push(r);
  }
  return { ambienteDe, ehExterno, porLayer };
}

// Mapa proposto: cada layer de instalação → tipos de símbolo (medida × quantidade) e traçados
function propostaDeMapa(arq) {
  const { ehExterno, porLayer } = contexto(arq);
  const simbolos = [];
  const trechos = [];
  for (const [layer, refs] of [...porLayer].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (RE_TRECHO.test(layer)) {
      const piso = /PISO|DIRETA|ENTERR|SOLO/i.test(layer);
      trechos.push({ layer, tipo: /ELETROCALHA/i.test(layer) ? 'eletrocalha' : /LEITO/i.test(layer) ? 'leito' : /PERFILADO/i.test(layer) ? 'perfilado' : 'eletroduto', disciplina: 'eletrica', ...(piso ? { altura: 0.04 } : {}), comprimento_m: r2(refs.reduce((s, r) => s + comprimento(r), 0)) });
      continue;
    }
    // tipos de símbolo da layer: medidas parecidas (±3 cm) juntas
    const tipos = [];
    for (const s of agrupar(refs)) {
      let t = tipos.find(x => mesmaMedida(x.medida, s.medida, 0.03));
      if (!t) tipos.push(t = { medida: s.medida, itens: [] });
      t.itens.push(s);
    }
    // símbolo isolado só entra se o nome da layer diz o que é (o quadro geral costuma ser um só)
    const mais = (x) => x.itens.length >= 2 || !!sugestao(layer, x.medida, x.itens.every(q => ehExterno(q.centro)));
    for (const t of tipos.filter(mais).sort((a, b) => b.itens.length - a.itens.length).slice(0, 6)) {
      // área externa: fora das salas, ou em ambiente externo (estacionamento, quadra, pátio)
      const fora = t.itens.filter(s => ehExterno(s.centro)).length;
      let sug = sugestao(layer, t.medida, fora > t.itens.length / 2);
      // o mesmo aparelho desenhado em duas layers (símbolo + contorno IFC): conta uma vez só
      if (sug && simbolos.some(o => o.simbolo === sug.simbolo && o.quantidade === t.itens.length)) sug = null;
      simbolos.push({ layer, medida: t.medida.map(r2), quantidade: t.itens.length, fora, simbolo: sug ? sug.simbolo : '?', rotulo: '', disciplina: sug ? sug.disciplina : '', ...(sug && sug.simbolo === 'HM-ELE-CAIXA-PISO' ? { area: 'externa' } : {}) });
    }
  }
  return { simbolos, trechos };
}

// Mapa (proposto ou conferido) → pontos e trechos
function aplicarMapa(arq, mapa) {
  const { ambienteDe, ehExterno, porLayer } = contexto(arq);
  const pontos = [];
  const contagem = new Map();
  for (const m of mapa.simbolos || []) {
    if (!m.simbolo || m.simbolo === '?') continue;
    if (!ESPEC[m.simbolo]) throw new Error(`Símbolo "${m.simbolo}" (layer ${m.layer}) não existe no 3D (use: ${Object.keys(ESPEC).join(', ')}).`);
    const medida = [...m.medida].sort((a, b) => b - a);
    const tol = Number(m.tolerancia) > 0 ? Number(m.tolerancia) : 0.03;
    for (const s of agrupar(porLayer.get(m.layer) || [])) {
      if (!mesmaMedida(s.medida, medida, tol)) continue;
      if (m.area === 'externa' && !ehExterno(s.centro)) continue;
      if (m.area === 'interna' && ehExterno(s.centro)) continue;
      // o mesmo aparelho em pedaços (quadro desenhado em partes) ou em duas layers
      // (EL-Lâmpada + IFC-Luminária-Contorno): um ponto só
      if (pontos.some(o => o.simbolo === m.simbolo && Math.hypot(o.x - s.centro[0], o.y - s.centro[1]) < 0.3)) continue;
      const amb = ambienteDe(s.centro);
      const n = (contagem.get(m.simbolo) || 0) + 1;
      contagem.set(m.simbolo, n);
      pontos.push({
        id: `${m.simbolo.replace(/^HM-[A-Z]+-/, '')}-${n}`, simbolo: m.simbolo, x: r2(s.centro[0]), y: r2(s.centro[1]),
        ...(m.rotulo || ROTULO_PADRAO[m.simbolo] ? { rotulo: m.rotulo || ROTULO_PADRAO[m.simbolo] } : {}), ...(m.disciplina ? { disciplina: m.disciplina } : {}),
        ...(Number(m.altura_m) > 0 ? { altura_m: Number(m.altura_m) } : {}), ambiente: amb ? amb.nome : '',
      });
    }
  }
  const trechos = [];
  for (const t of mapa.trechos || []) {
    const segmentos = [];
    for (const r of porLayer.get(t.layer) || []) {
      for (let i = 1; i < r.pts.length; i++) segmentos.push([...r.pts[i - 1], ...r.pts[i]].map(r2));
      if (r.fechada && r.pts.length > 2) segmentos.push([...r.pts.at(-1), ...r.pts[0]].map(r2));
    }
    const { comprimento_m, ...resto } = t;
    if (segmentos.length) trechos.push({ ...resto, segmentos });
  }
  return { pontos, trechos };
}

const pontosDoDesenho = (arq) => aplicarMapa(arq, propostaDeMapa(arq));

module.exports = { pontosDoDesenho, propostaDeMapa, aplicarMapa, agrupar, sugestao, RE_INSTALACAO, RE_FORA, RE_TRECHO };
