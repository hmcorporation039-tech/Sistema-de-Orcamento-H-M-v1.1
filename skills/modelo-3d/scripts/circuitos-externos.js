#!/usr/bin/env node
// Alimentação dos postes da área externa (estacionamento, quadras, pátio):
// traçado da vala/eletroduto enterrado, circuitos, seção dos cabos pela
// capacidade de condução (NBR 5410, tabela 36, método D — enterrado) e pela
// queda de tensão, disjuntor, caixas de passagem e quantitativos. Grava o
// memorial e os arquivos para o 3D (eletroduto enterrado e caixas).
//
// Uso (pasta skills):
//   node modelo-3d/scripts/circuitos-externos.js <pontos.json> <obra.json>
//        [--saida-trechos trechos-externos.json] [--saida-pontos caixas-externas.json]
//        [--memorial memorial-externo.md] [--json resumo-externo.json]
// pontos.json: saída do extrair-pontos.js (postes HM-ILU-POSTE e quadros HM-ELE-QUADRO).
// obra.json (ver modelo-3d/exemplos/obra-externa.json):
//   { "quadro": { "id": "ELE-QUADRO-3" } | { "nome": "QD-EXT", "x": 0, "y": 0 },
//     "tensao_v": 220, "ligacao": "FN" | "FF" | "3F", "fator_potencia": 0.95, "queda_max_pct": 4,
//     "corrente_max_circuito_a": 12.8, "por_ambiente": true, "caixa_a_cada_m": 30, "profundidade_vala_m": 0.7,
//     "tipos": [{ "rotulo": "Poste luz quadra", "potencia_w": 400, "altura_m": 8 }, …] }
//   "tipos" casa pelo rótulo do poste; com "ambiente", só os postes daquela área
//   (o mesmo símbolo no estacionamento e na quadra, com potências diferentes).
// O traçado é o mais curto em "L" (árvore a partir do quadro): é proposta para
// o projeto executivo, que deve seguir as vias, os canteiros e as interferências.
const fs = require('fs');
const path = require('path');

// NBR 5410, tabela 36 — cobre, isolação PVC 70 °C, método D (enterrado), solo a
// 20 °C e 2,5 K·m/W: corrente (A) por seção (mm²) com 2 e 3 condutores carregados
const SECOES = [2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
const IZ_D = {
  2: { 2.5: 29, 4: 38, 6: 47, 10: 63, 16: 81, 25: 104, 35: 125, 50: 148, 70: 183, 95: 216, 120: 246 },
  3: { 2.5: 24, 4: 31, 6: 39, 10: 52, 16: 67, 25: 86, 35: 103, 50: 122, 70: 151, 95: 179, 120: 203 },
};
// NBR 5410, tabela 42 — fator de agrupamento de circuitos (em feixe / mesma vala)
const FCA = [1, 1, 0.8, 0.7, 0.65, 0.6, 0.57, 0.54, 0.52, 0.5, 0.5, 0.5, 0.45, 0.45, 0.45, 0.45, 0.41, 0.41, 0.41, 0.41, 0.38];
const fca = (n) => FCA[Math.min(n, FCA.length - 1)];
const DISJUNTORES = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
// cobre a 70 °C (Ω·mm²/m) e reatância típica de cabo unipolar (Ω/m)
const RHO = 0.0214;
const X = 0.0001;
// diâmetro externo típico do cabo unipolar 0,6/1 kV (mm) — para a taxa de ocupação
const DIAMETRO_CABO = { 2.5: 6.2, 4: 6.8, 6: 7.4, 10: 8.4, 16: 9.6, 25: 11.4, 35: 12.6, 50: 14.4, 70: 16.4, 95: 18.6, 120: 20.4 };
// duto corrugado PEAD (kanalduto): diâmetro interno típico de catálogo (mm)
const DUTOS = [
  { pol: '1 1/4"', de: 40, di: 32 }, { pol: '1 1/2"', de: 50, di: 40 }, { pol: '2"', de: 63, di: 51 },
  { pol: '3"', de: 90, di: 75 }, { pol: '4"', de: 125, di: 103 },
];
const OCUPACAO_MAX = 0.4; // 3 ou mais cabos (NBR 5410, 6.2.11.1.6)
// condutor de proteção pela tabela 58
const secaoPE = (s) => (s <= 16 ? s : s <= 35 ? 16 : s / 2);

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const br = (v, c = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const manhattan = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

function main() {
  const args = process.argv.slice(2);
  const val = (k) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : null);
  const COM_VALOR = ['--saida-trechos', '--saida-pontos', '--memorial', '--json'];
  const [arqPontos, arqObra] = args.filter((a, i) => !a.startsWith('--') && !COM_VALOR.includes(args[i - 1]));
  if (!arqPontos || !arqObra) {
    console.error('Uso: node modelo-3d/scripts/circuitos-externos.js <pontos.json> <obra.json> [--saida-trechos t.json] [--saida-pontos caixas.json] [--memorial memorial.md] [--json resumo.json]');
    process.exit(2);
  }
  const pontos = JSON.parse(fs.readFileSync(arqPontos, 'utf8'));
  const obra = JSON.parse(fs.readFileSync(arqObra, 'utf8'));
  const avisos = [];

  const V = Number(obra.tensao_v) || 220;
  const lig = ['FN', 'FF', '3F'].includes(obra.ligacao) ? obra.ligacao : 'FN';
  const fp = Number(obra.fator_potencia) || 0.95;
  const sen = Math.sqrt(1 - fp * fp);
  const quedaMax = Number(obra.queda_max_pct) || 4;
  const iMax = Number(obra.corrente_max_circuito_a) || 12.8;
  const caixaMax = Number(obra.caixa_a_cada_m) || 30;
  const prof = Number(obra.profundidade_vala_m) || 0.7;
  const carregados = lig === '3F' ? 3 : 2;
  const nCond = lig === '3F' ? 5 : 3; // F+N+PE, F+F+PE, 3F+N+PE
  const k = lig === '3F' ? Math.sqrt(3) : 2;
  const corrente = (w) => (lig === '3F' ? w / (Math.sqrt(3) * V * fp) : w / (V * fp));

  // postes e potência
  const tipos = obra.tipos || [];
  const postes = pontos.filter(p => p.simbolo === 'HM-ILU-POSTE').map(p => {
    const casa = (x) => (!x.rotulo || (p.rotulo && x.rotulo.toLowerCase() === p.rotulo.toLowerCase())) && (!x.ambiente || (p.ambiente || '').toUpperCase().includes(String(x.ambiente).toUpperCase()));
    const t = tipos.find(x => x.ambiente && casa(x)) || tipos.find(x => !x.ambiente && casa(x));
    const w = Number(p.potencia_w) || Number(t && t.potencia_w);
    if (!w) throw new Error(`Poste ${p.id} ("${p.rotulo || 'sem rótulo'}") sem potência: informe em "tipos" do obra.json (rótulos dos postes: ${[...new Set(pontos.filter(q => q.simbolo === 'HM-ILU-POSTE').map(q => q.rotulo || '—'))].join('; ')}).`);
    return { ...p, pt: [p.x, p.y], w, altura: Number(p.altura_m) || Number(t && t.altura_m) || 8, ib: corrente(w) };
  });
  if (!postes.length) throw new Error('Nenhum poste (HM-ILU-POSTE) em pontos.json.');

  // quadro de origem
  const quadros = pontos.filter(p => p.simbolo === 'HM-ELE-QUADRO');
  let quadro;
  if (obra.quadro && Number.isFinite(obra.quadro.x) && Number.isFinite(obra.quadro.y)) quadro = { nome: obra.quadro.nome || 'QD-EXT', pt: [obra.quadro.x, obra.quadro.y] };
  else if (obra.quadro && obra.quadro.id) {
    const q = quadros.find(x => x.id === obra.quadro.id);
    if (!q) throw new Error(`Quadro "${obra.quadro.id}" não está em pontos.json (quadros: ${quadros.map(x => x.id).join(', ') || 'nenhum'}).`);
    quadro = { nome: obra.quadro.nome || q.id, pt: [q.x, q.y] };
  } else {
    if (!quadros.length) throw new Error('Informe o quadro de origem em obra.json ("quadro": { "x", "y" } ou { "id" }).');
    const c = [postes.reduce((s, p) => s + p.x, 0) / postes.length, postes.reduce((s, p) => s + p.y, 0) / postes.length];
    const q = quadros.reduce((m, x) => (manhattan([x.x, x.y], c) < manhattan([m.x, m.y], c) ? x : m));
    quadro = { nome: q.id, pt: [q.x, q.y] };
    avisos.push(`[CONFERIR] Quadro de origem não informado: usado o mais perto dos postes (${q.id}${q.ambiente ? `, ${q.ambiente}` : ''}).`);
  }

  // árvore de menor comprimento em "L" a partir do quadro (Prim)
  const nos = [{ pt: quadro.pt, quadro: true }, ...postes];
  const pai = new Array(nos.length).fill(-1);
  const dentroArv = new Array(nos.length).fill(false);
  const melhor = nos.map(n => manhattan(n.pt, quadro.pt));
  dentroArv[0] = true;
  for (let i = 1; i < nos.length; i++) pai[i] = 0;
  for (let it = 1; it < nos.length; it++) {
    let j = -1;
    for (let i = 1; i < nos.length; i++) if (!dentroArv[i] && (j < 0 || melhor[i] < melhor[j])) j = i;
    dentroArv[j] = true;
    for (let i = 1; i < nos.length; i++) {
      if (dentroArv[i]) continue;
      const d = manhattan(nos[i].pt, nos[j].pt);
      if (d < melhor[i]) { melhor[i] = d; pai[i] = j; }
    }
  }
  const filhos = nos.map(() => []);
  for (let i = 1; i < nos.length; i++) filhos[pai[i]].push(i);
  // ordem de percurso (o circuito segue um ramo antes de pular para outro)
  const ordem = [];
  (function dfs(i) { if (i) ordem.push(i); for (const f of filhos[i].sort((a, b) => manhattan(nos[a].pt, nos[i].pt) - manhattan(nos[b].pt, nos[i].pt))) dfs(f); })(0);

  // circuitos: postes da mesma área (estacionamento, cada quadra) em sequência
  // pelo traçado, divididos por igual entre o mínimo de circuitos que a corrente
  // máxima permite (sem sobrar circuito de um poste só)
  const porArea = obra.por_ambiente !== false;
  const areas = new Map();
  for (const i of ordem) {
    const area = porArea ? (nos[i].ambiente || 'Área externa') : 'Área externa';
    if (!areas.has(area)) areas.set(area, []);
    areas.get(area).push(i);
  }
  // divide a sequência em n partes contíguas com a MENOR corrente máxima
  // (partição linear por programação dinâmica — poucas dezenas de postes)
  const dividir = (lista, n) => {
    const I = lista.map(i => nos[i].ib);
    const acum = [0];
    for (const v of I) acum.push(acum.at(-1) + v);
    const m = I.length;
    // custo[k][j]: menor máximo dividindo os j primeiros em k partes; corte = início da última
    const custo = [new Array(m + 1).fill(Infinity)];
    custo[0][0] = 0;
    const corte = [[]];
    for (let k = 1; k <= n; k++) {
      custo.push(new Array(m + 1).fill(Infinity));
      corte.push(new Array(m + 1).fill(0));
      for (let j = k; j <= m; j++) {
        for (let i = k - 1; i < j; i++) {
          const v = Math.max(custo[k - 1][i], acum[j] - acum[i]);
          if (v < custo[k][j]) { custo[k][j] = v; corte[k][j] = i; }
        }
      }
    }
    const partes = [];
    for (let k = n, j = m; k > 0; k--) {
      const i = corte[k][j];
      partes.unshift({ nos: lista.slice(i, j), ib: acum[j] - acum[i] });
      j = i;
    }
    return partes;
  };
  const circuitos = [];
  for (const [area, lista] of areas) {
    const total = lista.reduce((s, i) => s + nos[i].ib, 0);
    let n = Math.min(lista.length, Math.max(1, Math.ceil(total / iMax - 1e-9)));
    let partes = dividir(lista, n);
    while (n < lista.length && Math.max(...partes.map(q => q.ib)) > iMax + 1e-9) partes = dividir(lista, ++n);
    for (const q of partes) {
      const c = { nome: `C-EXT-${String(circuitos.length + 1).padStart(2, '0')}`, area, nos: q.nos, ib: q.ib, w: q.nos.reduce((s, i) => s + nos[i].w, 0) };
      for (const i of q.nos) nos[i].circuito = c;
      circuitos.push(c);
    }
  }
  for (const p of postes) if (p.ib > iMax) avisos.push(`Poste ${p.id}: ${br(p.ib)} A sozinho passa do limite de ${br(iMax)} A por circuito — circuito exclusivo.`);

  // aresta i (pai[i] → i): corrente de cada circuito que passa nela
  const passa = nos.map(() => new Map());
  for (let i = 1; i < nos.length; i++) {
    for (let j = i; j > 0; j = pai[j]) passa[j].set(nos[i].circuito, (passa[j].get(nos[i].circuito) || 0) + nos[i].ib);
  }
  // pernas do "L": horizontal saindo do pai, depois vertical até o filho
  const pernas = [];
  for (let i = 1; i < nos.length; i++) {
    const a = nos[pai[i]].pt, b = nos[i].pt, canto = [b[0], a[1]];
    for (const [p, q] of [[a, canto], [canto, b]]) if (manhattan(p, q) > 0.01) pernas.push({ p, q, aresta: i });
  }
  // a mesma vala: pernas na mesma reta se sobrepõem — circuitos por trecho de vala
  const retas = new Map();
  for (const s of pernas) {
    const hor = Math.abs(s.p[1] - s.q[1]) < 0.01;
    const chave = hor ? `h${r1(s.p[1])}` : `v${r1(s.p[0])}`;
    const [t0, t1] = hor ? [s.p[0], s.q[0]].sort((x, y) => x - y) : [s.p[1], s.q[1]].sort((x, y) => x - y);
    if (!retas.has(chave)) retas.set(chave, { hor, fixo: hor ? s.p[1] : s.p[0], itens: [] });
    retas.get(chave).itens.push({ t0, t1, aresta: s.aresta });
  }
  const vala = []; // { a, b, circuitos: Set, arestas: Set }
  for (const r of retas.values()) {
    const cortes = [...new Set(r.itens.flatMap(x => [x.t0, x.t1]))].sort((x, y) => x - y);
    for (let i = 1; i < cortes.length; i++) {
      const [t0, t1] = [cortes[i - 1], cortes[i]];
      if (t1 - t0 < 0.01) continue;
      const nesta = r.itens.filter(x => x.t0 <= t0 + 1e-6 && x.t1 >= t1 - 1e-6);
      if (!nesta.length) continue;
      const circ = new Set(nesta.flatMap(x => [...passa[x.aresta].keys()]));
      vala.push({ a: r.hor ? [t0, r.fixo] : [r.fixo, t0], b: r.hor ? [t1, r.fixo] : [r.fixo, t1], L: t1 - t0, circuitos: circ, arestas: new Set(nesta.map(x => x.aresta)) });
    }
  }
  const caminhoDe = (c) => { const s = new Set(); for (const i of c.nos) for (let j = i; j > 0; j = pai[j]) s.add(j); return s; };

  // dimensionamento de cada circuito
  for (const c of circuitos) {
    const arestas = caminhoDe(c);
    c.agrupados = Math.max(1, ...vala.filter(v => v.circuitos.has(c)).map(v => v.circuitos.size));
    c.fca = fca(c.agrupados);
    c.disjuntor = DISJUNTORES.find(d => d >= c.ib) || DISJUNTORES.at(-1);
    c.comprimento = [...arestas].reduce((s, i) => s + manhattan(nos[pai[i]].pt, nos[i].pt), 0) + 3 + c.nos.length * 1.0;
    const quedaCom = (S) => Math.max(...c.nos.map(i => {
      let dv = 0;
      for (let j = i; j > 0; j = pai[j]) dv += k * passa[j].get(c) * manhattan(nos[pai[j]].pt, nos[j].pt) * ((RHO / S) * fp + X * sen);
      return (100 * dv) / V;
    }));
    let escolha = null;
    for (const S of SECOES) {
      const iz = IZ_D[carregados][S] * c.fca;
      if (iz < c.disjuntor) continue;
      const q = quedaCom(S);
      if (q <= quedaMax) { escolha = { S, iz, q }; break; }
    }
    if (!escolha) {
      const S = SECOES.at(-1);
      escolha = { S, iz: IZ_D[carregados][S] * c.fca, q: quedaCom(S) };
      avisos.push(`${c.nome}: nem ${S} mm² atende (queda ${br(escolha.q, 2)} %) — dividir o circuito, subir a tensão (FF/3F) ou aproximar o quadro.`);
    }
    Object.assign(c, { secao: escolha.S, iz: escolha.iz, queda: escolha.q, pe: secaoPE(escolha.S), arestas });
  }

  // duto por aresta: os cabos de todos os circuitos que passam nela
  const dutoDe = (circs) => {
    const area = [...circs].reduce((s, c) => s + (nCond - 1) * Math.PI * (DIAMETRO_CABO[c.secao] / 2) ** 2 + Math.PI * (DIAMETRO_CABO[c.pe] / 2) ** 2, 0);
    for (const d of DUTOS) if (area <= OCUPACAO_MAX * Math.PI * (d.di / 2) ** 2) return { ...d, n: 1 };
    const d = DUTOS.at(-1);
    return { ...d, n: Math.ceil(area / (OCUPACAO_MAX * Math.PI * (d.di / 2) ** 2)) };
  };
  const dutosPorAresta = new Map();
  for (let i = 1; i < nos.length; i++) dutosPorAresta.set(i, dutoDe(new Set(passa[i].keys())));

  // caixas de passagem: no pé de cada poste, nos cantos e a cada `caixaMax` m
  const caixas = [];
  const juntaCaixa = (pt, motivo) => { if (!caixas.some(c => Math.hypot(c.pt[0] - pt[0], c.pt[1] - pt[1]) < 0.5)) caixas.push({ pt, motivo }); };
  for (const p of postes) juntaCaixa(p.pt, 'pé do poste');
  for (const s of pernas) {
    juntaCaixa(s.q, 'mudança de direção');
    const n = Math.ceil(manhattan(s.p, s.q) / caixaMax) - 1;
    for (let j = 1; j <= n; j++) juntaCaixa([s.p[0] + ((s.q[0] - s.p[0]) * j) / (n + 1), s.p[1] + ((s.q[1] - s.p[1]) * j) / (n + 1)], `trecho reto acima de ${caixaMax} m`);
  }

  // quantitativos
  const valaM = vala.reduce((s, v) => s + v.L, 0);
  const dutoM = new Map();
  for (const s of pernas) {
    const d = dutosPorAresta.get(s.aresta);
    dutoM.set(d.pol, (dutoM.get(d.pol) || 0) + manhattan(s.p, s.q) * d.n);
  }
  const caboM = new Map();
  const somaCabo = (S, m) => caboM.set(S, (caboM.get(S) || 0) + m);
  for (const c of circuitos) { somaCabo(c.secao, c.comprimento * (nCond - 1)); somaCabo(c.pe, c.comprimento); }
  const ramalM = postes.reduce((s, p) => s + p.altura + 2, 0); // da caixa até a luminária (PP 3 × 2,5 mm²)
  const disj = new Map();
  for (const c of circuitos) disj.set(c.disjuntor, (disj.get(c.disjuntor) || 0) + 1);

  // ── memorial ────────────────────────────────────────────────────────────
  const L = [];
  L.push('# Iluminação externa — alimentação dos postes', '');
  L.push(`Quadro de origem: **${quadro.nome}**. Sistema: ${lig === 'FN' ? `fase-neutro ${V} V` : lig === 'FF' ? `fase-fase ${V} V` : `trifásico ${V} V`}, fator de potência ${br(fp, 2)}. ${postes.length} postes, ${br(postes.reduce((s, p) => s + p.w, 0) / 1000, 2)} kW.`, '');
  L.push('## Critérios (ABNT NBR 5410)', '');
  L.push('- Linha enterrada: cabos unipolares 0,6/1 kV em duto corrugado PEAD (condutor isolado não é admitido enterrado) — 6.2.11.6.');
  L.push(`- Vala com ${br(prof, 2)} m de profundidade mínima (1,00 m sob tráfego de veículos), fita de advertência acima do duto e reaterro compactado.`);
  L.push(`- Capacidade de condução: tabela 36, método D (cobre/PVC 70 °C, solo 20 °C, 2,5 K·m/W), com o fator de agrupamento da tabela 42 pelo número de circuitos na mesma vala.`);
  L.push(`- Queda de tensão no circuito terminal até o poste mais distante ≤ ${br(quedaMax, 0)} % (6.2.7), com ρ = ${RHO} Ω·mm²/m (70 °C) e corrente de cada trecho.`);
  L.push(`- Caixa de passagem 30 × 30 × 30 cm com tampa e brita no fundo no pé de cada poste, nas mudanças de direção e a cada ${caixaMax} m em trecho reto (6.2.11.1.6).`);
  L.push(`- Taxa de ocupação do duto ≤ ${br(OCUPACAO_MAX * 100, 0)} %; condutor de proteção pela tabela 58, ligado à massa de cada poste metálico.`);
  L.push('- Recomendado: DR de 30 mA por circuito (obrigatório se houver tomada no poste — 5.1.3.2.2), DPS no quadro de origem e haste de aterramento no pé de cada poste metálico.', '');
  L.push('## Circuitos', '');
  L.push('| Circuito | Área | Postes | Potência (W) | Ib (A) | Disjuntor | Seção (mm²) | PE (mm²) | Circuitos na vala | Iz corrigida (A) | Comprimento (m) | ΔV máx. (%) |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const c of circuitos) L.push(`| ${c.nome} | ${c.area} | ${c.nos.length} | ${br(c.w, 0)} | ${br(c.ib)} | ${c.disjuntor} A | ${br(c.secao, c.secao % 1 ? 1 : 0)} | ${br(c.pe, c.pe % 1 ? 1 : 0)} | ${c.agrupados} (FCA ${br(c.fca, 2)}) | ${br(c.iz)} | ${br(c.comprimento, 0)} | ${br(c.queda, 2)} |`);
  L.push('', '## Quantitativos', '');
  L.push('| Item | Quantidade |', '|---|---|');
  for (const [S, m] of [...caboM].sort((a, b) => a[0] - b[0])) L.push(`| Cabo unipolar 0,6/1 kV ${br(S, S % 1 ? 1 : 0)} mm² (cobre) | ${br(m * 1.05, 0)} m |`);
  L.push(`| Cabo PP 3 × 2,5 mm² (caixa → luminária, dentro do poste) | ${br(ramalM * 1.05, 0)} m |`);
  for (const [pol, m] of dutoM) L.push(`| Duto corrugado PEAD ${pol} | ${br(m * 1.05, 0)} m |`);
  L.push(`| Vala ${br(prof, 2)} m (escavação, fita de advertência e reaterro) | ${br(valaM, 0)} m |`);
  L.push(`| Caixa de passagem 30 × 30 × 30 cm com tampa | ${caixas.length} un |`);
  for (const [d, n] of [...disj].sort((a, b) => a[0] - b[0])) L.push(`| Disjuntor ${lig === '3F' ? 'tripolar' : lig === 'FF' ? 'bipolar' : 'monopolar'} ${d} A (curva C) | ${n} un |`);
  L.push(`| Interruptor DR 30 mA (recomendado) | ${circuitos.length} un |`);
  L.push(`| Haste de aterramento 5/8" × 2,40 m com caixa de inspeção (recomendado) | ${postes.length} un |`);
  L.push('', 'Cabos e dutos com 5 % de perdas. Traçado em "L" mais curto a partir do quadro: o executivo deve seguir vias, canteiros e interferências e recalcular se os comprimentos mudarem.');
  if (avisos.length) L.push('', '## Avisos', '', ...avisos.map(a => `- ${a}`));

  console.log(`${postes.length} postes, ${circuitos.length} circuitos a partir de ${quadro.nome}; vala ${br(valaM, 0)} m; ${caixas.length} caixas.`);
  for (const c of circuitos) console.log(`  ${c.nome} (${c.area}): ${c.nos.length} postes, ${br(c.ib)} A, ${c.disjuntor} A, ${c.secao} mm², ΔV ${br(c.queda, 2)} %, ${br(c.comprimento, 0)} m`);
  for (const a of avisos) console.log(`  ! ${a}`);

  if (val('--memorial')) { fs.writeFileSync(val('--memorial'), L.join('\n') + '\n'); console.log(`Memorial: ${path.resolve(val('--memorial'))}`); }
  if (val('--saida-trechos')) {
    // um grupo por bitola de duto — o 3D mostra rente ao piso (está enterrado)
    const porDuto = new Map();
    for (const s of pernas) {
      const d = dutosPorAresta.get(s.aresta);
      const chave = `${d.pol}|${d.n}`;
      if (!porDuto.has(chave)) porDuto.set(chave, { disciplina: 'iluminacao-externa', tipo: 'eletroduto', layer: 'CALCULO-ILUMINACAO-EXTERNA', altura: 0.04, material: 'PEAD corrugado enterrado', medida: `${d.n > 1 ? `${d.n} × ` : ''}Ø ${d.pol} (DE ${d.de} mm)`, secao_mm: [d.de, d.de], origem_medida: 'calculado', segmentos: [] });
      porDuto.get(chave).segmentos.push([...s.p, ...s.q].map(r2));
    }
    fs.writeFileSync(val('--saida-trechos'), JSON.stringify([...porDuto.values()]));
    console.log(`Trechos para o 3D: ${path.resolve(val('--saida-trechos'))}`);
  }
  if (val('--saida-pontos')) {
    // caixa ao lado do poste (não some embaixo dele no 3D)
    const caixasPts = caixas.map((c, i) => ({ id: `CX-EXT-${i + 1}`, simbolo: 'HM-ELE-CAIXA-PISO', x: r2(c.pt[0] + (c.motivo === 'pé do poste' ? 0.5 : 0)), y: r2(c.pt[1]), rotulo: 'Caixa de passagem 30 × 30 × 30 cm', disciplina: 'iluminacao-externa' }));
    fs.writeFileSync(val('--saida-pontos'), JSON.stringify(caixasPts, null, 1));
    console.log(`Caixas para o 3D: ${path.resolve(val('--saida-pontos'))}`);
  }
  if (val('--json')) {
    fs.writeFileSync(val('--json'), JSON.stringify({
      quadro: quadro.nome, ligacao: lig, tensao_v: V, postes: postes.length, potencia_w: postes.reduce((s, p) => s + p.w, 0), vala_m: r1(valaM), caixas: caixas.length,
      circuitos: circuitos.map(c => ({ nome: c.nome, area: c.area, postes: c.nos.map(i => nos[i].id), potencia_w: c.w, ib_a: r2(c.ib), disjuntor_a: c.disjuntor, secao_mm2: c.secao, pe_mm2: c.pe, circuitos_na_vala: c.agrupados, fca: c.fca, iz_a: r1(c.iz), comprimento_m: r1(c.comprimento), queda_pct: r2(c.queda) })),
      cabos_m: Object.fromEntries([...caboM].map(([S, m]) => [S, r1(m * 1.05)])), ramal_pp_m: r1(ramalM * 1.05), dutos_m: Object.fromEntries([...dutoM].map(([p, m]) => [p, r1(m * 1.05)])),
      avisos,
    }, null, 2));
  }
}

try { main(); } catch (err) { console.error(`ERRO: ${err.message}`); process.exit(1); }
