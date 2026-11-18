// Projetista: a disciplina PROJETADA em cima da arquitetura (análise de elaboração de projeto).
//
// Pedido do usuário (18/11/2026): "quando for pedido para elaborar um projeto, não quero que o sistema apenas suponha a
// quantidade de componentes da disciplina; preciso que seja tudo sugerido dentro do arquivo carregado — cada ponto,
// infraestrutura, cabeamento —, assim como é feita a análise para um orçamento: como se o sistema fosse capaz de
// projetar a disciplina em cima do projeto arquitetônico". Antes, o projeto de CFTV da paróquia N. S. da Assunção punha
// uma câmera em cada "ambiente" lido (inclusive "Área (20,78 m²)", "Ambiente 3 sem nome" e um quarto), sem posição.
//
// Motor determinístico (sem IA): para cada pavimento da arquitetura (./pavimentos.js),
//   1) cada ambiente ganha um TIPO pelo nome (circulação, sanitário, sala técnica, assembleia, escritório, dormitório,
//      área externa…) — é o tipo que decide o que vai nele, com o MOTIVO escrito;
//   2) os componentes são posicionados no polígono da sala (./posicionamento.js): câmera no canto, detector em grade
//      pelo raio da NBR 17240 (o mesmo cálculo da skill de incêndio), ponto de rede no perímetro, acionador junto da
//      saída/escada a no máximo 30 m de caminhamento (5.5.3);
//   3) a infraestrutura é TRAÇADA: um tronco (eletrocalha) pelas circulações até a prumada (escada/shaft) e o rack ou a
//      central, e um eletroduto de cada ponto até o tronco — e cada cabo é MEDIDO pelo caminho (horizontal + subidas
//      entre pavimentos + folga), não estimado em 30 m;
//   4) o que é critério adotado (não número de norma) sai marcado [CONFERIR] — a norma não diz quantas câmeras uma
//      capela tem; diz o raio do detector e o comprimento máximo do cabo.
// O resultado são pontos e trechos no MESMO formato da leitura de um projeto pronto: entram na análise como os
// componentes inseridos pelo engenheiro (contagem, 3D por pavimento, editor de inserir/retirar), marcados "projetista".
//
//   projetarDisciplinas(arquitetura, disciplinas, opcoes) →
//     { pontos: [{ x, y, simbolo, disciplina, rotulo, altura_m, ambiente, pavimento, motivo }],
//       trechos: [{ disciplina, tipo, layer, segmentos: [[x1, y1, x2, y2]], material, medida }],
//       cabos: [{ disciplina, ponto, descricao, comprimento_m }], metragens: [{ disciplina, descricao, metros }],
//       resumo: [{ disciplina, pavimento, itens: { simbolo: n } }], criterios: [texto], avisos: [texto] }
const { dentro, centroide } = require('./arquitetura');
const P = require('./posicionamento');
const INC = require('../../incendio/scripts/lib/calculo');

const r2 = (v) => Math.round(v * 100) / 100;
const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const manhattan = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const caixaDe = (pol) => { const xs = pol.map(p => p[0]), ys = pol.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };

// ── 1) Tipo do ambiente pelo nome ─────────────────────────────────────────
// A ordem importa: a 1ª regra que casa vale ("SALA TÉCNICA" é técnica antes de ser sala; "BANHEIRO" antes de "BAN").
const TIPOS = [
  ['poco', /\bPOCO\b|\bSHAFT\b|\bELEVADOR\b|\bPRUMADA\b|TOMADA DE AR\b|TOMADA DE AR$|TOMADA DE AR /],
  ['escada', /\bESCADA\b|\bPATAMAR\b|\bRAMPA\b/],
  ['sanitario', /\bBANH|\bBAN\b|\bWC\b|\bW\.C|LAVABO|SANIT|VESTIAR|\bBWC\b|DUCHA|\bDML\b/],
  ['tecnica', /\bCPD\b|SALA TECNICA|AREA TECNICA|\bTECNIC|INSTALACOES|CASA DE MAQ|\bQGBT\b|ENERGIA|\bRACK\b|MONITORAMENTO|SERVIDOR|TELECOM|\bDG\b/],
  ['cozinha', /COZINHA|\bCOPA\b|PREPARO|CHURRASQ|LANCHONETE|REFEITORIO|CANTINA/],
  ['deposito', /DEPOSIT|\bDESP|ALMOX|ARQUIVO|ROUPARIA|\bAPOIO\b|GUARDA[- ]?VOLUME|\bDEP\b/],
  ['assembleia', /CAPELA|\bSALAO\b|CELEBRATIV|SANTUARIO|AUDITORI|IGREJA|\bNAVE\b|TEMPLO|MULTIUSO|PLATEIA|TEATRO|\bCULTO\b/],
  ['escritorio', /SECRETAR|ESCRITOR|ADMINISTR|ATENDIMENTO|TESOURAR|DIRETOR|GERENC|REUNI|RECEPCAO|\bOFFICE\b|COORDENA|PAROQUIAL|SACRISTIA|CONTABIL|FINANCEIR/],
  ['circulacao', /CIRCULA|CORREDOR|\bHALL\b|FOYER|ANTECAM|\bACESSO\b|\bENTRADA\b|GALERIA|VESTIBULO|NARTEX/],
  ['dormitorio', /QUARTO|DORMIT|\bSUITE\b|\bQTO\b/],
  ['servico', /AREA DE SERVICO|LAVANDERIA/],
  ['externo', /PATIO|JARDIM|VARANDA|TERRACO|TERRAZA|EXTERN|DESCOBERT|ESTACIONAMENTO|GARAGEM|QUADRA|CALCADA|CAMPANARIO|SACADA|PERGOLADO|\bLAJE\b|COBERTURA/],
  ['estar', /\bESTAR\b|\bJANTAR\b|\bLIVING\b/],
  ['sala', /\bSALA\b|\bAULA\b|CATEQ|ESTUDO|BIBLIOTEC|OFICINA|\bESPACO\b|\bLOJA\b|CONSULTORIO/],
];
const ROTULO_TIPO = {
  poco: 'poço/shaft', escada: 'escada/rampa', sanitario: 'sanitário', tecnica: 'sala técnica', cozinha: 'cozinha/copa', deposito: 'depósito',
  assembleia: 'espaço de reunião de pessoas', escritorio: 'escritório/atendimento', circulacao: 'circulação', dormitorio: 'dormitório',
  servico: 'área de serviço', externo: 'área externa/aberta', estar: 'estar/jantar', sala: 'sala de uso geral', outro: 'outro',
};
function tipoDoAmbiente(nome) {
  const n = sem(nome);
  for (const [t, re] of TIPOS) if (re.test(n)) return t;
  return 'outro';
}

// sala "SALA" sem número no meio da casa (perto de quarto/estar/cozinha): é da residência — privacidade (sem câmera)
function ehResidencial(a, doPavimento) {
  if (a.tipo === 'dormitorio' || a.tipo === 'estar' || a.tipo === 'servico') return true;
  if (!['sala', 'cozinha', 'sanitario', 'circulacao'].includes(a.tipo)) return false;
  if (a.tipo === 'sala' && /\d/.test(a.nome)) return false; // "SALA - 08" é sala de uso (catequese, reunião)
  return doPavimento.some(o => (o.tipo === 'dormitorio' || o.tipo === 'estar') && Math.hypot(o.c[0] - a.c[0], o.c[1] - a.c[1]) <= 12);
}

// ── 2) Regras por disciplina ─────────────────────────────────────────────
// Cada regra devolve, para um ambiente, [{ simbolo, n, regra, rotulo, motivo }] (n = 0: nada).
// CFTV (IEC 62676-4 — a quantidade é critério de projeto, não número de norma): acesso, circulação, espaço de reunião,
// guarda de valores (secretaria, sacristia, tesouraria, CPD) e área externa. Nunca em sanitário, dormitório nem na
// residência (privacidade — LGPD).
function regrasCftv(a) {
  const q = (n, regra, motivo, externa = false) => [{ simbolo: 'HM-CFTV-CAMERA', n, regra, rotulo: externa ? `Câmera bullet externa IP67 — ${a.nome}` : `Câmera dome — ${a.nome}`, motivo, externa }];
  if (a.residencial) return [];
  switch (a.tipo) {
    case 'assembleia': return q(Math.min(6, Math.max(2, Math.ceil(a.area / 200))), 'cantos', `espaço de reunião de pessoas (${r2(a.area)} m²): visão geral e das entradas — 1 câmera a cada ~200 m², de 2 a 6 [CONFERIR]`);
    case 'circulacao': return a.area < 8 ? [] : q(Math.min(4, Math.max(1, Math.ceil(a.area / 150))), a.area > 150 ? 'grade' : 'cantos', `circulação: passagem obrigatória de quem entra — 1 câmera a cada ~150 m², até 4 [CONFERIR]`);
    case 'escritorio': return a.area < 6 ? [] : q(1, 'cantos', 'guarda de valores e atendimento ao público [CONFERIR]');
    case 'tecnica': return a.area < 3 ? [] : q(1, 'cantos', 'sala técnica (rack/central): acesso restrito');
    case 'externo': return a.area < 8 || /LAJE|COBERTURA/.test(sem(a.nome)) ? [] : q(Math.max(1, Math.ceil(a.area / 150)), 'cantos', `área externa/aberta: perímetro e acesso — 1 câmera a cada ~150 m² [CONFERIR]`, true);
    case 'deposito': return /RESTRITO|VALOR|COFRE/.test(sem(a.nome)) || a.area >= 20 ? q(1, 'cantos', 'depósito restrito/grande: proteção patrimonial [CONFERIR]') : [];
    default: return [];
  }
}

// Cabeamento estruturado (NBR 14565): 2 tomadas por área de trabalho de 10 m² no escritório (6.7.7.1); fora dele, o
// mínimo de uso (critério [CONFERIR]); AP (Wi-Fi) nas circulações e espaços de reunião
const AREA_TRABALHO_M2 = 10;
function regrasRede(a) {
  const pt = (n, motivo) => (n > 0 ? [{ simbolo: 'HM-CAB-PONTO-REDE', n, regra: 'perimetro', rotulo: `Ponto de telecomunicações RJ-45 Cat6 — ${a.nome}`, motivo }] : []);
  const ap = (n, motivo) => (n > 0 ? [{ simbolo: 'HM-CAB-AP', n, regra: 'grade', rotulo: `Ponto de acesso Wi-Fi (AP) — ${a.nome}`, motivo }] : []);
  switch (a.tipo) {
    case 'escritorio': return pt(Math.min(16, Math.max(2, 2 * Math.ceil(a.area / AREA_TRABALHO_M2))), `escritório: 2 tomadas por área de trabalho de ${AREA_TRABALHO_M2} m² (NBR 14565 6.7.7.1)`);
    case 'tecnica': return a.area < 3 ? [] : pt(2, 'sala técnica: rede de gerência dos equipamentos');
    case 'assembleia': return [...pt(2, 'espaço de reunião: som/transmissão [CONFERIR]'), ...ap(Math.min(3, Math.max(1, Math.ceil(a.area / 300))), 'Wi-Fi do espaço de reunião — 1 AP a cada ~300 m², até 3 [CONFERIR]')];
    case 'sala': return a.area < 8 ? [] : pt(2, 'sala de uso geral: 1 caixa com 2 tomadas [CONFERIR uso]');
    case 'estar': return pt(2, 'residência: estar/TV');
    case 'dormitorio': return pt(1, 'residência: dormitório');
    case 'circulacao': return a.area >= 60 && !a.residencial ? ap(Math.min(3, Math.ceil(a.area / 250)), 'Wi-Fi da circulação — 1 AP a cada ~250 m² [CONFERIR]') : [];
    default: return [];
  }
}

// Fachada do pavimento: o contorno convexo dos ambientes dele. Porta "para fora" lida na arquitetura (um lado sem sala)
// só conta como externa se estiver na fachada — a porta para uma sala que a leitura não fechou fica no miolo.
function contornoConvexo(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const giro = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const baixo = [], cima = [];
  for (const q of p) { while (baixo.length >= 2 && giro(baixo.at(-2), baixo.at(-1), q) <= 0) baixo.pop(); baixo.push(q); }
  for (const q of p.slice().reverse()) { while (cima.length >= 2 && giro(cima.at(-2), cima.at(-1), q) <= 0) cima.pop(); cima.push(q); }
  return [...baixo.slice(0, -1), ...cima.slice(0, -1)];
}
function distanciaAoContorno(p, pol) {
  let d = Infinity;
  for (let i = 0; i < pol.length; i++) d = Math.min(d, Math.hypot(...((q) => [p[0] - q[0], p[1] - q[1]])(maisPertoNoSegmento(p, [...pol[i], ...pol[(i + 1) % pol.length]]))));
  return d;
}

// Detecção e alarme de incêndio (NBR 17240): detector pontual em todo ambiente fechado (fumaça; temperatura onde a
// fumaça é normal — cozinha, copa, churrasqueira), quantidade pela grade em que nenhum ponto do teto fica a mais do
// raio da norma (5.4.1.4, o mesmo cálculo da skill de incêndio); fora: sanitário, área aberta e poço/shaft.
function regrasIncendio(a) {
  if (['sanitario', 'externo', 'poco'].includes(a.tipo)) return [];
  const temp = a.tipo === 'cozinha';
  const r = INC.RAIO[temp ? 'temperatura' : 'fumaca'];
  const [x0, y0, x1, y1] = caixaDe(a.pol);
  // (sala bem menor que a caixa — em L, inclinada: a grade da caixa sobra; a da área equivalente quadrada é o mínimo)
  const L = x1 - x0, W = y1 - y0;
  const g = INC.gradeDetectores(L, W, r);
  const lado = Math.sqrt(a.area);
  const gq = INC.gradeDetectores(lado, lado, r);
  const n = Math.max(1, Math.min(g.n, Math.max(gq.n, Math.ceil(g.n * a.area / Math.max(1, L * W)))));
  return [{
    simbolo: temp ? 'HM-INC-DETECTOR-TEMP' : 'HM-INC-DETECTOR-FUMACA', n, regra: 'grade',
    rotulo: `${temp ? 'Detector de temperatura' : 'Detector de fumaça'} — ${a.nome}`,
    motivo: `${temp ? 'cozinha/copa: fumaça normal no uso — detector de temperatura' : 'ambiente fechado: detector de fumaça'}; raio de ${r2(r).toLocaleString('pt-BR')} m (NBR 17240 5.4.1)${a.tipo === 'circulacao' ? ' — circulação aberta para o exterior dispensa [CONFERIR]' : ''}${a.tipo === 'assembleia' ? ' — pé-direito acima de 8 m pede detector linear/aspiração (5.4.1.1) [CONFERIR]' : ''}`,
  }];
}

// Alarme de intrusão (EN 50131): IVP nos ambientes com valor e nas circulações de acesso; teclado e central na sala
// técnica/secretaria; sensor magnético nas portas para fora (as portas que dão para o exterior lidas na arquitetura)
function regrasAlarme(a) {
  if (a.residencial) return [];
  const ivp = (n, motivo) => [{ simbolo: 'HM-ALM-IVP', n, regra: 'cantos', rotulo: `Sensor infravermelho (IVP) — ${a.nome}`, motivo }];
  switch (a.tipo) {
    case 'escritorio': case 'tecnica': return a.area < 4 ? [] : ivp(1, 'ambiente com valor: IVP no canto, cobrindo a porta [CONFERIR]');
    case 'assembleia': return ivp(Math.max(1, Math.ceil(a.area / 100)), 'espaço grande: 1 IVP a cada ~100 m² (alcance ~12 m) [CONFERIR]');
    case 'circulacao': return a.area >= 10 ? ivp(Math.max(1, Math.ceil(a.area / 120)), 'circulação de acesso: rota obrigatória do intruso [CONFERIR]') : [];
    case 'deposito': return /RESTRITO|VALOR|COFRE/.test(sem(a.nome)) || a.area >= 20 ? ivp(1, 'depósito restrito/grande [CONFERIR]') : [];
    default: return [];
  }
}

const DISCIPLINAS = {
  cftv: { regras: regrasCftv, rotulo: 'CFTV', centro: 'HM-CAB-RACK', rotuloCentro: 'Rack / NVR (gravador) e switch PoE', grupo: 'telecom', cabo: 'Cabo U/UTP Cat6 LSZH (câmera → switch PoE)', laco: false },
  rede: { regras: regrasRede, rotulo: 'Cabeamento estruturado', centro: 'HM-CAB-RACK', rotuloCentro: 'Rack / distribuidor (patch panel e switch)', grupo: 'telecom', cabo: 'Cabo U/UTP Cat6 LSZH (ponto → patch panel)', laco: false },
  incendio: { regras: regrasIncendio, rotulo: 'Detecção e alarme de incêndio', centro: 'HM-INC-CENTRAL', rotuloCentro: 'Central de alarme de incêndio endereçável', grupo: 'incendio', cabo: 'Cabo blindado 2 × 1,5 mm² anti-chama (laço classe A)', laco: true },
  alarme: { regras: regrasAlarme, rotulo: 'Alarme de intrusão', centro: 'HM-ALM-CENTRAL', rotuloCentro: 'Central de alarme (com bateria e comunicador)', grupo: 'alarme', cabo: 'Cabo de alarme 4 vias 26 AWG (sensor → central)', laco: false },
};
const APELIDOS = { cabeamento: 'rede', telecom: 'rede', deteccao: 'incendio', intrusao: 'alarme' };

// ── 3) Posição dos componentes na sala ───────────────────────────────────
function posicoes(pol, n, regra) {
  if (!n) return [];
  if (regra === 'cantos') {
    // cantos ESPALHADOS: de todos os cantos da sala, o mais longe do centro e depois, um a um, o mais longe dos já
    // escolhidos (dois cantos colados da parede recortada davam duas câmeras no mesmo lugar); faltando canto, a grade
    const todos = P.nosCantos(pol, pol.length, { recuo: 0.3 }).filter(p => p && Number.isFinite(p.x) && dentro([p.x, p.y], pol));
    const c = centroide(pol);
    const escolhidos = [];
    const resta = todos.slice();
    while (escolhidos.length < n && resta.length) {
      let k = 0, melhor = -1;
      resta.forEach((p, i) => {
        const d = escolhidos.length ? Math.min(...escolhidos.map(q => Math.hypot(q.x - p.x, q.y - p.y))) : Math.hypot(p.x - c[0], p.y - c[1]);
        if (d > melhor) { melhor = d; k = i; }
      });
      if (escolhidos.length && melhor < 3) break; // os cantos que sobram estão colados nos escolhidos
      escolhidos.push(resta.splice(k, 1)[0]);
    }
    return escolhidos.length >= n ? escolhidos : [...escolhidos, ...P.gradeComQuantidade(pol, n - escolhidos.length)];
  }
  if (regra === 'perimetro') return P.noPerimetro(pol, n, { recuo: 0.15, fase: 0.35 });
  return P.gradeComQuantidade(pol, n);
}

// ── 4) Infraestrutura: tronco pelas circulações, eletroduto até cada ponto ─
// Árvore retilínea (Prim com distância de Manhattan) entre a prumada, o centro das circulações e o equipamento central;
// cada aresta vira um "L". O ponto liga no trecho do tronco mais perto. Comprimentos pelo caminho na árvore.
function maisPertoNoSegmento(p, [x1, y1, x2, y2]) {
  const vx = x2 - x1, vy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((p[0] - x1) * vx + (p[1] - y1) * vy) / ((vx * vx + vy * vy) || 1)));
  return [x1 + vx * t, y1 + vy * t];
}
function arvore(nos) {
  // nos: [[x, y]] — devolve arestas [[i, j]] (Prim, Manhattan)
  if (nos.length < 2) return [];
  const usado = new Array(nos.length).fill(false);
  usado[0] = true;
  const arestas = [];
  for (let k = 1; k < nos.length; k++) {
    let melhor = null;
    for (let i = 0; i < nos.length; i++) if (usado[i]) for (let j = 0; j < nos.length; j++) if (!usado[j]) {
      const d = manhattan(nos[i], nos[j]);
      if (!melhor || d < melhor.d) melhor = { i, j, d };
    }
    usado[melhor.j] = true;
    arestas.push([melhor.i, melhor.j]);
  }
  return arestas;
}
// distâncias na árvore a partir do nó 0 (a raiz: prumada ou o equipamento central)
function distanciasNaArvore(nos, arestas, raiz = 0) {
  const viz = nos.map(() => []);
  for (const [i, j] of arestas) { const d = manhattan(nos[i], nos[j]); viz[i].push([j, d]); viz[j].push([i, d]); }
  const D = nos.map(() => Infinity);
  D[raiz] = 0;
  const fila = [raiz];
  while (fila.length) { const i = fila.shift(); for (const [j, d] of viz[i]) if (D[j] === Infinity) { D[j] = D[i] + d; fila.push(j); } }
  return D;
}

// ── 5) O projeto ─────────────────────────────────────────────────────────
// opcoes: { peDireito (m, padrão 3,0), alturaEntrePisos (m, padrão 3,2), folga (fração, 0,10), centroPreferido }
function projetarDisciplinas(arquitetura, disciplinas0 = [], opcoes = {}) {
  const peDireito = Number(opcoes.peDireito) > 0 ? Number(opcoes.peDireito) : 3.0;
  const entrePisos = Number(opcoes.alturaEntrePisos) > 0 ? Number(opcoes.alturaEntrePisos) : 3.2;
  const folga = Number.isFinite(opcoes.folga) ? opcoes.folga : 0.10;
  const disciplinas = [...new Set((disciplinas0 || []).map(d => APELIDOS[d] || d).filter(d => DISCIPLINAS[d]))];
  const vazio = { pontos: [], trechos: [], cabos: [], metragens: [], resumo: [], criterios: [], avisos: [], pavimentos: [], ambientes: [] };
  if (!disciplinas.length) return vazio;

  // ambientes válidos: com nome (o "Ambiente N" sem nome não recebe projeto: não se sabe o uso), polígono e área
  const todos = (arquitetura.ambientes || []).filter(a => Array.isArray(a.poligono) && a.poligono.length >= 3 && a.area_m2 >= 1.5)
    .map(a => ({ nome: a.nome, area: Number(a.area_projeto_m2) || a.area_m2, pol: a.poligono, c: a.centro || centroide(a.poligono), pavimento: a.pavimento || 'Pavimento único', semNome: !!a.semNome, divergente: !!a.areaDivergente, tipo: tipoDoAmbiente(a.nome) }));
  const semNome = todos.filter(a => a.semNome);
  const ambs = todos.filter(a => !a.semNome);
  if (!ambs.length) return { ...vazio, avisos: ['Nenhum ambiente com nome na arquitetura: o projeto não sabe o uso de cada sala — confira a planta (nomes e paredes) e analise de novo.'] };
  // pavimentos na ordem do prédio (a lista da arquitetura) — a cobertura/telhado não recebe distribuição interna
  const ordem = (arquitetura.pavimentos || []).map(p => p.nome);
  const nomesPav = [...new Set(ambs.map(a => a.pavimento))].sort((a, b) => (ordem.indexOf(a) === -1 ? 1e3 : ordem.indexOf(a)) - (ordem.indexOf(b) === -1 ? 1e3 : ordem.indexOf(b)));
  for (const nome of nomesPav) {
    const doPav = ambs.filter(a => a.pavimento === nome);
    for (const a of doPav) a.residencial = ehResidencial(a, doPav);
  }
  const portas = arquitetura.portas || [];
  const fachada = {};
  for (const nome of nomesPav) fachada[nome] = contornoConvexo(ambs.filter(a => a.pavimento === nome).flatMap(a => a.pol));
  const naFachada = (porta, nome) => (fachada[nome] || []).length >= 3 && distanciaAoContorno(porta.meio, fachada[nome]) <= 2;

  // sala do equipamento central (rack / central): técnica (CPD, sala técnica) > secretaria/escritório > a maior sala;
  // no pavimento de acesso (térreo) quando houver empate
  const prioridade = (a) => (a.tipo === 'tecnica' ? (/CPD|RACK|TELECOM|MONITORAMENTO|SERVIDOR/.test(sem(a.nome)) ? 0 : 1) : a.tipo === 'escritorio' ? (/SECRETAR|ADMIN/.test(sem(a.nome)) ? 2 : 3) : 9);
  const ordemPav = (p) => { const i = ordem.indexOf(p); return i === -1 ? 50 : Math.abs(i - Math.max(0, ordem.findIndex(n => /T[ÉE]RREO/i.test(n)))); };
  const candidatosCentro = ambs.filter(a => prioridade(a) < 9 && a.area >= 3).sort((x, y) => prioridade(x) - prioridade(y) || ordemPav(x.pavimento) - ordemPav(y.pavimento) || x.area - y.area);
  const salaCentro = candidatosCentro[0] || ambs.slice().sort((x, y) => y.area - x.area)[0];

  // prumada de cada pavimento: shaft/poço > escada > a circulação maior > o centro do pavimento
  const prumada = {};
  for (const nome of nomesPav) {
    const doPav = ambs.filter(a => a.pavimento === nome);
    const shaft = doPav.find(a => a.tipo === 'poco' && /SHAFT|PRUMADA|TECNIC/.test(sem(a.nome))) || doPav.find(a => a.tipo === 'escada') || doPav.find(a => a.tipo === 'poco')
      || doPav.filter(a => a.tipo === 'circulacao').sort((x, y) => y.area - x.area)[0];
    const c = shaft ? shaft.c : [doPav.reduce((s, a) => s + a.c[0], 0) / doPav.length, doPav.reduce((s, a) => s + a.c[1], 0) / doPav.length];
    prumada[nome] = { x: c[0], y: c[1], ambiente: shaft?.nome || null };
  }

  const out = { ...vazio, pavimentos: nomesPav, ambientes: ambs.map(a => ({ nome: a.nome, pavimento: a.pavimento, tipo: a.tipo, rotuloTipo: ROTULO_TIPO[a.tipo], residencial: !!a.residencial, area_m2: r2(a.area) })) };
  const idx = { n: 0 };
  const novoId = (pref) => `${pref}${String(++idx.n).padStart(3, '0')}`;
  const centrosPorGrupo = {};
  // o tronco é do GRUPO: CFTV e rede dividem a mesma eletrocalha (desenhada e contada uma vez)
  const troncoDoGrupo = new Set();
  const iPav = (n) => Math.max(0, nomesPav.indexOf(n));

  for (const disc of disciplinas) {
    const D = DISCIPLINAS[disc];
    // equipamento central (um por grupo: CFTV e rede dividem o rack)
    let central = centrosPorGrupo[D.grupo];
    if (!central) {
      // cada grupo num trecho da parede da sala (antes o rack e a central de incêndio caíam no mesmo ponto)
      const [p0] = P.noPerimetro(salaCentro.pol, 1, { recuo: 0.2, fase: D.grupo === 'telecom' ? 0.15 : D.grupo === 'incendio' ? 0.4 : 0.65 });
      const pos = p0 || { x: salaCentro.c[0], y: salaCentro.c[1] };
      central = { id: novoId(D.grupo === 'telecom' ? 'RK' : D.grupo === 'incendio' ? 'CI' : 'CA'), x: pos.x, y: pos.y, pavimento: salaCentro.pavimento, ambiente: salaCentro.nome, simbolo: D.centro, rotulo: D.rotuloCentro };
      centrosPorGrupo[D.grupo] = central;
      out.pontos.push({ x: r2(central.x), y: r2(central.y), simbolo: D.centro, disciplina: disc, rotulo: `${D.rotuloCentro} — ${salaCentro.nome}`, ambiente: salaCentro.nome, pavimento: salaCentro.pavimento,
        motivo: `equipamento central na ${ROTULO_TIPO[salaCentro.tipo]} "${salaCentro.nome}" (${salaCentro.pavimento}): ${salaCentro.tipo === 'tecnica' ? 'sala técnica de acesso restrito' : 'local com supervisão'} [CONFERIR]`, id: central.id, central: true });
    }
    const pontosDisc = [];
    for (const a of ambs) {
      for (const regra of D.regras(a)) {
        const pts = posicoes(a.pol, regra.n, regra.regra).filter(p => p && Number.isFinite(p.x));
        for (const p of pts) {
          const pt = { x: r2(p.x), y: r2(p.y), simbolo: regra.simbolo, disciplina: disc, rotulo: regra.rotulo, ambiente: a.nome, pavimento: a.pavimento, motivo: regra.motivo, id: novoId(regra.simbolo.split('-').slice(-1)[0].slice(0, 3)) };
          if (regra.simbolo === 'HM-CFTV-CAMERA') pt.altura_m = r2(Math.max(2.4, peDireito - 0.3));
          pontosDisc.push(pt);
        }
      }
    }
    // incêndio: acionador manual + avisador junto das saídas (escadas e portas para fora), a até 30 m de caminhamento
    // de qualquer ponto do pavimento (5.5.3: a linha reta × 1,3 ≈ caminhamento — critério [CONFERIR]); a central já
    // está no pavimento dela
    if (disc === 'incendio') {
      for (const nome of nomesPav) {
        const doPav = ambs.filter(a => a.pavimento === nome && !['externo', 'poco'].includes(a.tipo));
        if (!doPav.length) continue;
        // candidatos: junto das escadas, das portas para fora e no meio das circulações
        const cand = [];
        for (const a of doPav.filter(x => x.tipo === 'escada')) { const [p] = P.noPerimetro(a.pol, 1, { recuo: 0.2, fase: 0.5 }); if (p) cand.push({ ...p, ambiente: a.nome, motivo: 'junto da escada (saída do pavimento)' }); }
        for (const pt of portas.filter(p => p.externa && naFachada(p, nome) && doPav.some(a => (p.ambientes || []).includes(a.nome)))) {
          const a = doPav.find(x => (pt.ambientes || []).includes(x.nome));
          const dentroDaSala = [pt.meio[0] + (pt.n?.[0] || 0) * 0.4, pt.meio[1] + (pt.n?.[1] || 0) * 0.4];
          cand.push({ x: dentro(dentroDaSala, a.pol) ? dentroDaSala[0] : pt.meio[0], y: dentro(dentroDaSala, a.pol) ? dentroDaSala[1] : pt.meio[1], ambiente: a.nome, motivo: 'junto da porta de saída' });
        }
        for (const a of doPav.filter(x => x.tipo === 'circulacao')) cand.push({ x: a.c[0], y: a.c[1], ambiente: a.nome, motivo: 'na circulação' });
        if (!cand.length) { const a = doPav.sort((x, y) => y.area - x.area)[0]; cand.push({ x: a.c[0], y: a.c[1], ambiente: a.nome, motivo: 'no maior ambiente (sem escada/saída lida) [CONFERIR]' }); }
        // cobertura: o centro de cada ambiente a até 30 m (caminhamento ≈ 1,3 × a linha reta)
        const alvos = doPav.map(a => a.c);
        const coberto = (c, p) => Math.hypot(c[0] - p.x, c[1] - p.y) * 1.3 <= INC_CAMINHAMENTO;
        const escolhidos = [];
        let falta = alvos.slice();
        // o 1º é sempre o da escada/saída (a norma pede junto das saídas)
        while (falta.length && escolhidos.length < 20) {
          const melhor = cand.reduce((m, c) => { const n = falta.filter(f => coberto(f, c)).length; return !m || n > m.n || (n === m.n && escolhidos.length === 0 && c.motivo.startsWith('junto')) ? { c, n } : m; }, null);
          if (!melhor || !melhor.n) break;
          escolhidos.push(melhor.c);
          falta = falta.filter(f => !coberto(f, melhor.c));
        }
        if (falta.length) out.avisos.push(`Incêndio — ${nome}: ${falta.length} ambiente(s) a mais de 30 m de caminhamento do acionador mais perto pela linha reta; inclua acionador [CONFERIR].`);
        for (const c of escolhidos) {
          pontosDisc.push({ x: r2(c.x), y: r2(c.y), simbolo: 'HM-INC-ACIONADOR', disciplina: disc, rotulo: `Acionador manual h=1,20 m — ${c.ambiente}`, ambiente: c.ambiente, pavimento: nome, altura_m: 1.2, motivo: `${c.motivo}; caminhamento máximo de ${INC_CAMINHAMENTO} m até ele (NBR 17240 5.5.3)`, id: novoId('ACI') });
          pontosDisc.push({ x: r2(c.x + 0.5), y: r2(c.y), simbolo: 'HM-INC-AVISADOR', disciplina: disc, rotulo: `Avisador audiovisual h=2,30 m — ${c.ambiente}`, ambiente: c.ambiente, pavimento: nome, altura_m: 2.3, motivo: 'junto do acionador; audibilidade 15 dB acima do ruído ambiente (5.6) [CONFERIR]', id: novoId('AVS') });
        }
        // espaço de reunião grande: avisador próprio (o som do corredor não chega) — critério [CONFERIR]
        for (const a of doPav.filter(x => x.tipo === 'assembleia' && x.area >= 150)) {
          const [p] = P.noPerimetro(a.pol, 1, { recuo: 0.2, fase: 0.75 });
          if (p) pontosDisc.push({ x: r2(p.x), y: r2(p.y), simbolo: 'HM-INC-AVISADOR', disciplina: disc, rotulo: `Avisador audiovisual h=2,30 m — ${a.nome}`, ambiente: a.nome, pavimento: nome, altura_m: 2.3, motivo: `espaço de reunião de ${r2(a.area)} m²: avisador dentro dele (audibilidade, 5.6) [CONFERIR]`, id: novoId('AVS') });
        }
      }
    }
    // alarme: teclado junto da entrada principal (porta para fora da circulação/hall do pavimento da central) e sensor
    // magnético em cada porta para fora; sirene externa junto da central
    if (disc === 'alarme') {
      const externas = portas.filter(p => p.externa && ambs.some(a => (p.ambientes || []).includes(a.nome) && !a.residencial && naFachada(p, a.pavimento)));
      for (const p of externas) {
        const a = ambs.find(x => (p.ambientes || []).includes(x.nome));
        pontosDisc.push({ x: r2(p.meio[0]), y: r2(p.meio[1]), simbolo: 'HM-ALM-MAGNETICO', disciplina: disc, rotulo: `Sensor magnético — porta de ${a.nome}`, ambiente: a.nome, pavimento: a.pavimento, motivo: 'porta para o exterior: abertura detectada antes da entrada [CONFERIR]', id: novoId('MAG') });
      }
      const entrada = externas.map(p => ({ p, a: ambs.find(x => (p.ambientes || []).includes(x.nome)) })).find(e => e.a && e.a.pavimento === central.pavimento && ['circulacao', 'escritorio'].includes(e.a.tipo));
      const t = entrada ? { x: entrada.p.meio[0] + 0.8, y: entrada.p.meio[1], ambiente: entrada.a.nome, pavimento: entrada.a.pavimento } : { x: central.x + 0.6, y: central.y, ambiente: central.ambiente, pavimento: central.pavimento };
      pontosDisc.push({ x: r2(t.x), y: r2(t.y), simbolo: 'HM-ALM-TECLADO', disciplina: disc, rotulo: `Teclado do alarme h=1,40 m — ${t.ambiente}`, ambiente: t.ambiente, pavimento: t.pavimento, altura_m: 1.4, motivo: entrada ? 'junto da entrada principal: arma/desarma ao sair/entrar' : 'junto da central (entrada não lida) [CONFERIR]', id: novoId('TEC') });
      pontosDisc.push({ x: r2(central.x + 1), y: r2(central.y), simbolo: 'HM-ALM-SIRENE', disciplina: disc, rotulo: 'Sirene (instalar na fachada, h ≥ 2,40 m)', ambiente: central.ambiente, pavimento: central.pavimento, altura_m: 2.4, motivo: 'sirene externa de dissuasão — posição na fachada [CONFERIR]', id: novoId('SIR') });
      if (!externas.length) out.avisos.push('Alarme: nenhuma porta para o exterior foi lida na arquitetura — os sensores magnéticos das portas ficaram de fora [CONFERIR].');
    }

    // compatibilização do próprio projeto: componente a menos de 30 cm de um de OUTRA disciplina (a câmera e o detector
    // no mesmo ponto da grade, o avisador em cima do acionador de outro sistema) anda 60 cm, afastando-se do outro e
    // ficando dentro da sala — o projeto sai sem o conflito "disciplinas diferentes no mesmo ponto" que ele mesmo criaria
    for (const pt of pontosDisc) {
      const perto = out.pontos.find(o => o.pavimento === pt.pavimento && o.disciplina !== pt.disciplina && Math.hypot(o.x - pt.x, o.y - pt.y) < 0.3);
      if (!perto) continue;
      const a = ambs.find(x => x.nome === pt.ambiente && x.pavimento === pt.pavimento);
      const dirs = [];
      if (Math.hypot(pt.x - perto.x, pt.y - perto.y) > 0.01) dirs.push([pt.x - perto.x, pt.y - perto.y]);
      if (a && Math.hypot(a.c[0] - pt.x, a.c[1] - pt.y) > 0.01) dirs.push([a.c[0] - pt.x, a.c[1] - pt.y]);
      dirs.push([1, 0], [0, 1], [-1, 0], [0, -1]);
      for (const [vx, vy] of dirs) {
        const n = Math.hypot(vx, vy);
        const novo = [pt.x + (vx / n) * 0.6, pt.y + (vy / n) * 0.6];
        if (a && !dentro(novo, a.pol)) continue;
        if (out.pontos.some(o => o.pavimento === pt.pavimento && o.disciplina !== pt.disciplina && Math.hypot(o.x - novo[0], o.y - novo[1]) < 0.3)) continue;
        pt.x = r2(novo[0]); pt.y = r2(novo[1]);
        break;
      }
    }

    // ── infraestrutura e cabos da disciplina ──
    const layerTronco = D.grupo === 'telecom' ? 'HM-CAB-ELETROCALHA' : D.grupo === 'incendio' ? 'HM-INC-ELETRODUTO' : 'HM-ALM-ELETRODUTO';
    const tipoTronco = D.grupo === 'telecom' ? 'eletrocalha' : 'eletroduto';
    const segTronco = [], segRamal = [];
    const cabos = [];
    let somaTronco = 0, somaRamal = 0;
    for (const nome of nomesPav) {
      const doPav = pontosDisc.filter(p => p.pavimento === nome);
      const ehDaCentral = nome === central.pavimento;
      if (!doPav.length && !ehDaCentral) continue;
      // Árvore do pavimento (Prim, distância de Manhattan): a raiz (a central no pavimento dela; a prumada nos outros),
      // a prumada, o centro das circulações/escadas (o TRONCO) e cada ponto — o ponto liga no vizinho mais perto que já
      // está na árvore (outro ponto da mesma sala, a circulação), como a infraestrutura corre de fato; antes cada ponto
      // ia em linha reta até o tronco e cruzava a planta inteira. Aresta entre dois nós do tronco: eletrocalha (ou o
      // eletroduto principal); as outras: eletroduto de ramal. O cabo de cada ponto é o caminho dele na árvore.
      const pr = prumada[nome];
      const nos = [ehDaCentral ? [central.x, central.y] : [pr.x, pr.y]];
      if (ehDaCentral && nomesPav.length > 1 && pontosDisc.some(p => p.pavimento !== nome)) nos.push([pr.x, pr.y]);
      for (const a of ambs.filter(x => x.pavimento === nome && (x.tipo === 'circulacao' || x.tipo === 'escada') && x.area >= 4)) nos.push(a.c);
      // 1º o TRONCO (só os nós do tronco: raiz, prumada, circulações); depois cada ponto se pendura, um a um, no que
      // estiver mais perto — um trecho do tronco ou um ponto já ligado (os pontos da mesma sala seguem juntos)
      const nTronco = nos.length;
      const daArvore = doPav.filter(p => !p.central);
      const arestas = arvore(nos);
      const D0 = distanciasNaArvore(nos, arestas, 0);
      const trechosTronco = [];
      const lAresta = (a, b) => {
        const meio = [b[0], a[1]];
        const segs = [];
        if (Math.abs(a[0] - b[0]) > 0.01) segs.push([a[0], a[1], meio[0], meio[1]]);
        if (Math.abs(a[1] - b[1]) > 0.01) segs.push([meio[0], meio[1], b[0], b[1]]);
        return segs;
      };
      for (const [i, j] of arestas) {
        for (const s of lAresta(nos[i], nos[j])) trechosTronco.push({ seg: s, i, j });
        somaTronco += manhattan(nos[i], nos[j]);
      }
      segTronco.push(...trechosTronco.map(t => t.seg));
      const naArvoreDe = new Map(); // ponto → distância até a raiz pelo caminho
      const ligados = []; // [{ q: [x, y], d }]
      const restam = daArvore.slice();
      while (restam.length) {
        let melhor = null;
        for (let k = 0; k < restam.length; k++) {
          const p = [restam[k].x, restam[k].y];
          // no tronco (ou na raiz, sem tronco)
          if (!trechosTronco.length) { const d = manhattan(p, nos[0]); if (!melhor || d < melhor.d) melhor = { k, d, q: nos[0], dist: 0 }; }
          for (const t of trechosTronco) {
            const q = maisPertoNoSegmento(p, t.seg);
            const d = manhattan(p, q);
            if (!melhor || d < melhor.d) melhor = { k, d, q, dist: Math.min(D0[t.i] + manhattan(q, nos[t.i]), D0[t.j] + manhattan(q, nos[t.j])) };
          }
          for (const l of ligados) { const d = manhattan(p, l.q); if (!melhor || d < melhor.d) melhor = { k, d, q: l.q, dist: l.d }; }
        }
        const pt = restam.splice(melhor.k, 1)[0];
        const pq = [pt.x, pt.y];
        segRamal.push(...lAresta(pq, melhor.q));
        somaRamal += melhor.d;
        const d = melhor.dist + melhor.d;
        naArvoreDe.set(pt, d);
        ligados.push({ q: pq, d });
      }
      // vertical até o pavimento da central: subida/descida pela prumada
      const vertical = Math.abs(iPav(nome) - iPav(central.pavimento)) * entrePisos;
      // (outro pavimento: no da central, ainda o caminho da prumada até ela)
      const naCentral = ehDaCentral ? 0 : distanciaPrumadaCentral(prumada[central.pavimento], central);
      daArvore.forEach((p) => {
        const naArvore = naArvoreDe.get(p);
        const descidas = (peDireito - (p.altura_m || (/DETECTOR|CAB-AP/.test(p.simbolo) ? peDireito : 0.3))) + 1.6; // ponto → forro e forro → equipamento central
        const m = ((Number.isFinite(naArvore) ? naArvore : 0) + vertical + naCentral + Math.abs(descidas)) * (1 + folga) + (D.grupo === 'telecom' ? 3 : 1);
        p.cabo_m = Math.round(m * 10) / 10;
        if (!D.laco) cabos.push({ disciplina: disc, ponto: p.id, descricao: D.cabo, comprimento_m: p.cabo_m });
      });
    }
    // laço classe A (incêndio): ida e volta por caminhos distintos — o cabo é o percurso que passa por todos os
    // dispositivos do laço (vizinho mais perto, a partir da central) e volta à central, × 2 vias já no cabo de 2 condutores
    if (D.laco) {
      const noLaco = pontosDisc.filter(p => !p.central && p.simbolo !== D.centro);
      const comPos = noLaco.map(p => ({ p, q: [p.x, p.y] }));
      let atual = [central.x, central.y], pavAtual = central.pavimento, total = 0;
      const resta = comPos.slice();
      while (resta.length) {
        // prefere ficar no mesmo pavimento; troca de pavimento pela prumada
        let k = -1, dk = Infinity;
        resta.forEach((r, i) => { const d = (r.p.pavimento === pavAtual ? 0 : 1e6) + manhattan(atual, r.q); if (d < dk) { dk = d; k = i; } });
        const r = resta.splice(k, 1)[0];
        if (r.p.pavimento !== pavAtual) {
          total += manhattan(atual, [prumada[pavAtual].x, prumada[pavAtual].y]) + Math.abs(iPav(r.p.pavimento) - iPav(pavAtual)) * entrePisos;
          atual = [prumada[r.p.pavimento].x, prumada[r.p.pavimento].y];
          pavAtual = r.p.pavimento;
        }
        total += manhattan(atual, r.q);
        atual = r.q;
      }
      // volta (classe A: retorno por outro caminho — adotado o mesmo comprimento da ida)
      if (pavAtual !== central.pavimento) total += manhattan(atual, [prumada[pavAtual].x, prumada[pavAtual].y]) + Math.abs(iPav(central.pavimento) - iPav(pavAtual)) * entrePisos + manhattan([prumada[central.pavimento].x, prumada[central.pavimento].y], [central.x, central.y]);
      else total += manhattan(atual, [central.x, central.y]);
      const descidas = noLaco.length * 2 * 0.5;
      const m = Math.round((total + descidas) * (1 + folga) * 10) / 10;
      cabos.push({ disciplina: disc, ponto: 'laço', descricao: `${D.cabo} — ${noLaco.length} dispositivos`, comprimento_m: m });
    }

    out.pontos.push(...pontosDisc);
    const troncoJaFeito = troncoDoGrupo.has(D.grupo);
    if (segTronco.length) troncoDoGrupo.add(D.grupo);
    if (troncoJaFeito) { segTronco.length = 0; somaTronco = 0; }
    if (segTronco.length) out.trechos.push({ disciplina: disc, tipo: tipoTronco, layer: layerTronco, segmentos: segTronco.map(s => s.map(r2)), material: tipoTronco === 'eletrocalha' ? 'aço perfurado' : 'PVC rígido/galvanizado', medida: tipoTronco === 'eletrocalha' ? '100x50 mm' : '3/4"', sugerido: true });
    if (segRamal.length) out.trechos.push({ disciplina: disc, tipo: 'eletroduto', layer: `${layerTronco}-RAMAL`, segmentos: segRamal.map(s => s.map(r2)), material: 'PVC/galvanizado', medida: '3/4"', sugerido: true });
    out.cabos.push(...cabos);
    const somaCabo = cabos.reduce((s, c) => s + c.comprimento_m, 0);
    if (somaTronco > 0) out.metragens.push({ disciplina: disc, descricao: tipoTronco === 'eletrocalha' ? 'Eletrocalha perfurada 100x50 mm com tampa (tronco pelas circulações — traçado sugerido)' : 'Eletroduto 3/4" (tronco pelas circulações — traçado sugerido)', metros: Math.round(somaTronco * (1 + folga) * 10) / 10 });
    if (somaRamal > 0) out.metragens.push({ disciplina: disc, descricao: 'Eletroduto 3/4" (ramais do tronco até cada ponto — traçado sugerido)', metros: Math.round(somaRamal * (1 + folga) * 10) / 10 });
    if (somaCabo > 0) out.metragens.push({ disciplina: disc, descricao: D.cabo, metros: Math.round(somaCabo * 10) / 10, cabo: true });
    // NBR 14565: canal horizontal ≤ 90 m (cabo permanente)
    if (D.grupo === 'telecom') {
      const longos = cabos.filter(c => c.comprimento_m > 90);
      if (longos.length) out.avisos.push(`${D.rotulo}: ${longos.length} cabo(s) passam de 90 m até o rack (NBR 14565, canal horizontal) — preveja um distribuidor de piso/rack secundário no pavimento mais longe [CONFERIR].`);
    }
    // resumo por pavimento
    for (const nome of nomesPav) {
      const itens = {};
      for (const p of [...pontosDisc, ...(central.pavimento === nome && out.pontos.some(q => q.central && q.disciplina === disc) ? [central] : [])].filter(q => q.pavimento === nome)) itens[p.simbolo] = (itens[p.simbolo] || 0) + 1;
      if (Object.keys(itens).length) out.resumo.push({ disciplina: disc, pavimento: nome, itens });
    }
  }
  out.criterios.push(
    `Pavimentos: ${nomesPav.join(', ')} — cada um projetado na planta dele; subida entre pavimentos pela prumada (escada/shaft) com ${String(entrePisos).replace('.', ',')} m por pavimento [CONFERIR].`,
    `Equipamento central em "${salaCentro.nome}" (${salaCentro.pavimento}).`,
    `Pé-direito adotado ${String(peDireito).replace('.', ',')} m (câmeras a ${String(r2(Math.max(2.4, peDireito - 0.3))).replace('.', ',')} m) [CONFERIR].`,
    `Cabos medidos pelo traçado (tronco pelas circulações + ramal + subidas) com ${Math.round(folga * 100)} % de folga e as sobras no rack/central.`,
    'Sem câmera em sanitário, dormitório e nas áreas da residência (privacidade/LGPD); sem detector em sanitário, área aberta e poço/shaft.',
  );
  // rótulo = o TIPO do componente (agrupa as quantidades e casa com serviço/material); o lugar vai à parte
  for (const p of out.pontos) {
    p.local = `${p.ambiente}${nomesPav.length > 1 ? ` (${p.pavimento})` : ''}`;
    p.rotulo = String(p.rotulo).replace(/\s+—\s+.*$/, '');
  }
  const divergentes = ambs.filter(a => a.divergente);
  if (divergentes.length) out.avisos.push(`${divergentes.length} ambiente(s) com a área lida pelas paredes diferente da área escrita na planta (${divergentes.slice(0, 6).map(a => a.nome).join(', ')}${divergentes.length > 6 ? '…' : ''}): a quantidade usa a área escrita; a posição dos pontos nesses ambientes fica a conferir [CONFERIR].`);
  if (semNome.length) out.avisos.push(`${semNome.length} ambiente(s) sem nome na planta ficaram sem projeto (não se sabe o uso) [CONFERIR].`);
  return out;
}
// NBR 17240 5.5.3: caminhamento máximo de 30 m até o acionador (o mesmo valor da skill de incêndio)
const INC_CAMINHAMENTO = 30;

// trecho prumada → central no pavimento da central
function distanciaPrumadaCentral(pr, central) {
  return pr ? manhattan([pr.x, pr.y], [central.x, central.y]) : 0;
}

module.exports = { projetarDisciplinas, tipoDoAmbiente, ROTULO_TIPO, DISCIPLINAS, paraTestes: { arvore, distanciasNaArvore, ehResidencial } };
