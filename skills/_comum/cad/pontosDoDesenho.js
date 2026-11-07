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
const { TIPOS, familia, tipoPelaLayer, tipoPeloTexto, metros, alturaEscrita, tomadaPelaAltura, DE_PAREDE } = require('./tiposDePonto');
const { lerAltura } = require('./textoCad');
const { porSemelhanca, prepararExemplos } = require('./semelhancaDeSimbolo');

const MAIOR_SIMBOLO_M = 3; // grupo maior que isso é traçado, não símbolo
const COLA_M = 0.05;       // traços a até 5 cm um do outro são do mesmo símbolo
const MAX_LINHAS_MAPA = 300;        // linhas do mapa (formas de símbolo) por desenho; o resto vai no aviso
const MAX_FORMAS_PDF_SUGERIDAS = 8; // na cor do PDF, só as formas mais frequentes recebem tipo sugerido
// layers de instalação (o resto — arquitetura, prancha — não tem pontos)
const RE_INSTALACAO = /^PDF-COR-|^(EL|ELE|IFC|P|INC|CFTV|TEL|SPDA|PCI|HID|CAB|ACE|ALM|ANT|AUT|FV|VE|ILU)[-_ ]|SIMB|L[ÂA]MP|LUMIN|TOMAD|INTERRUP|CAIXA|QUADRO|POSTE|REFLET|PROJETOR|DETEC|C[ÂA]MERA|SENSOR|CONDUT|ELETROD|ELETROCALHA|LEITO|PERFILADO|EMERG|BALIZ|ACION|AVISAD|SIREN|CENTRAL|RACK|PORTEIRO|TELEF|INTERF|ANTENA|LEITOR|FECHAD|BOTOEIRA|CATRACA|\bIVP\b|INFRAV|MAGN[EÉ]T|TECLADO|CAPTOR|DESCIDA|INSPE[ÇC]|CARREG|WALLBOX|INVERSOR|FUMA[ÇC]|(^|[-_ ])(REDE|L[ÓO]GICA|DADOS|RJ.?45|WI.?FI|TV)([-_ ]|$)/i;
// (arquitetura e mobiliário também: "#ARQUITETURA SIMBOLOGIA" casava "SIMB" e o DWG só de
// arquitetura da Paróquia saía com 8 linhas de mapa e 2 "postes" — CAD-13, 02/11/2026; a mesma
// regra de RE_LAYER_FORA de ./projetoDxf.js, também na layer de xref "XREF$0$ARQ-…")
const RE_FORA = /FIOS?\b|TEXTO|TXT|DIAGRAM|^DI[-_ ]|BARRAMENTO|UNIFILAR|TABELA|CONEX[ÕO]ES|MARGEM|PRANCHA|CONTORNO\d|HATCH|HACH|COTA|ARQUIT|(^|\$\d+\$|\|)#?(0-)?ARQ|MOBIL/i;
const RE_TRECHO = /CONDUT|ELETROD|ELETROCALHA|LEITO|PERFILADO/i;
// Traçado de infraestrutura: a MESMA regra de layer, tipo e disciplina da medição do orçamento
// (./disciplinasCad.js — CAD-10). Antes o mapa tinha só RE_TRECHO (sem INFRA), tudo saía "eletrica" e
// o trecho repetido por cima contava duas vezes: o 3D e o orçamento mediam diferente o mesmo DXF.
// Fiação e cabeamento desenhados são rota (cabo), não traçado do 3D.
const { disciplinaDaLayer, RE_LAYER_INFRA, tipoDoTracado } = require('./disciplinasCad');
const RE_INFRA = new RegExp(RE_LAYER_INFRA, 'i');
const ehLayerDeTracado = (layer) => RE_TRECHO.test(layer || '') || (RE_INFRA.test(layer || '') && !tipoDoTracado(layer).rota);
// disciplina da análise → a do 3D (cor da peça: ./modelo3d.js)
const DISCIPLINA_DO_3D = { controle_acesso: 'controle-acesso', carregador: 'veicular', cabeamento: 'rede' };
const disciplinaDoTracado = (layer) => { const d = disciplinaDaLayer(layer); return d ? (DISCIPLINA_DO_3D[d] || d) : 'eletrica'; };
// segmentos dos traços, sem repetição (mesmas pontas ao milímetro, em qualquer sentido): [[x1, y1, x2, y2]]
function segmentosUnicos(refs) {
  const vistos = new Set();
  const out = [];
  const pega = (a, b) => {
    const s = [a[0], a[1], b[0], b[1]].map(v => Math.round(v * 1000) / 1000);
    const k = s[0] < s[2] || (s[0] === s[2] && s[1] <= s[3]) ? s.join(',') : [s[2], s[3], s[0], s[1]].join(',');
    if (vistos.has(k) || (s[0] === s[2] && s[1] === s[3])) return;
    vistos.add(k);
    out.push([a[0], a[1], b[0], b[1]].map(r2));
  };
  for (const r of refs) {
    for (let i = 1; i < r.pts.length; i++) pega(r.pts[i - 1], r.pts[i]);
    if (r.fechada && r.pts.length > 2) pega(r.pts.at(-1), r.pts[0]);
  }
  return out;
}

// tipos de ponto de todas as disciplinas, a altura escrita e a tomada pela altura: ./tiposDePonto.js
const RE_SO_CONTORNO = /IFC|CONTORNO|CAIXA/i;

// sugestão pelo nome da layer (na skill o engenheiro confere: é proposta, não leitura)
function sugestao(layer, medida, externo) {
  const [L, W] = medida;
  const t = tipoPelaLayer(layer);
  if (t) {
    // no projeto elétrico (layer EL-…) a luminária usa os eletrodutos da elétrica desenhados junto
    if (t[2] === 'HM-ILU-LUMINARIA') return { simbolo: t[2], disciplina: /^(EL|ELE|IFC)[-_ ]/i.test(layer) ? 'eletrica' : 'iluminacao' };
    return { simbolo: t[2], disciplina: t[3] };
  }
  if (/CAIXA/i.test(layer) && externo && L >= 0.1) return { simbolo: 'HM-ELE-CAIXA-PISO', disciplina: 'iluminacao-externa' };
  // traço comprido e fino FORA das salas (estacionamento, quadra): poste com braço
  if (externo && L >= 0.8 && L <= 3 && W <= 0.25) return { simbolo: 'HM-ILU-POSTE', disciplina: 'iluminacao-externa' };
  return null;
}

// grupos de traços colados (caixa envolvente com folga) por layer
function agrupar(refs, maior = MAIOR_SIMBOLO_M) {
  const bb = refs.map(r => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of r.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return [x0, y0, x1, y1];
  });
  const pai = bb.map((_, i) => i);
  // sem recursão: cadeia longa de traços colados (milhares) estourava a pilha
  const raiz = (i) => {
    let r = i;
    while (pai[r] !== r) r = pai[r];
    while (pai[i] !== r) { const p = pai[i]; pai[i] = r; i = p; }
    return r;
  };
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
    if (!o) { g.set(k, { b, membros: [i], arcos: refs[i].tipo === 'arco' ? 1 : 0 }); return; }
    o.b = [Math.min(o.b[0], b[0]), Math.min(o.b[1], b[1]), Math.max(o.b[2], b[2]), Math.max(o.b[3], b[3])];
    o.membros.push(i);
    if (refs[i].tipo === 'arco') o.arcos++;
  });
  // membros: índices em refs; arcos: quantos são arco/círculo (luminária redonda)
  return [...g.values()].map(({ b, membros, arcos }) => ({ caixa: b, centro: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], medida: [b[2] - b[0], b[3] - b[1]].sort((x, y) => y - x), membros, arcos }))
    .filter(s => s.medida[0] <= maior && s.medida[0] > 0.01);
}

// ── PDF convertido (backend/src/services/pdfParaDxf.js) ─────────────────────
// O PDF não tem layers: cada COR de traço vira uma layer PDF-COR-RRGGBB (no
// projeto exportado, uma cor por layer do CAD). Sem nome para dizer o que é,
// vale a FORMA: grupo compacto pequeno é símbolo; o resto (traço comprido,
// curva entre pontos, tracejado) é eletroduto/eletrocalha.
const RE_PDF_COR = /^PDF-COR-/i;
const simboloPdf = (s) => s.medida[0] <= 0.8 && s.medida[1] >= 0.05;
// (a planta lida do PDF costuma ter poucos ambientes fechados: "fora das salas"
// não diz se o ponto é externo — vale a forma e o tamanho)
function sugestaoPdf(medida, externo, circular) {
  const [L, W] = medida;
  // círculo de 15 a 80 cm na planta: a luminária (convenção da NBR 5444 e do QiBuilder)
  if (circular && L >= 0.15 && W >= 0.8 * L) return { simbolo: 'HM-ILU-LUMINARIA', disciplina: 'eletrica', rotulo: 'Luminária (círculo do projeto em PDF)' };
  // marca miúda (até 12 cm) fora das salas: poste ou caixa da área externa
  if (externo && L <= 0.12) return { simbolo: 'HM-ELE-CAIXA-PISO', disciplina: 'iluminacao-externa', rotulo: 'Ponto externo do projeto (poste/caixa — conferir na legenda)' };
  if (L <= 0.45) return { simbolo: 'HM-ELE-PONTO', disciplina: 'eletrica', rotulo: 'Ponto de parede do projeto (tomada/interruptor — conferir na legenda)' };
  return null;
}
// círculo desenhado como arco ou como polilinha (a curva do PDF em pedaços):
// os pontos dos traços ficam todos à mesma distância do centro (±12%)
function redondo(s, refs) {
  if (s.arcos >= 0.5 * s.membros.length) return true;
  const d = s.membros.flatMap(i => refs[i].pts.map(p => Math.hypot(p[0] - s.centro[0], p[1] - s.centro[1])));
  const m = d.reduce((a, b) => a + b, 0) / d.length;
  return d.length >= 8 && m > 0 && d.every(v => Math.abs(v - m) <= 0.12 * m);
}

// símbolos da área externa sem legenda na biblioteca (./simbolos.js)
const ROTULO_PADRAO = { 'HM-ILU-POSTE': 'Poste de iluminação', 'HM-ELE-CAIXA-PISO': 'Caixa de passagem no piso' };
const r2 = (v) => Math.round(v * 100) / 100;
const mesmaMedida = (a, b, tol) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol;
// De várias formas candidatas [{ medida (maior lado primeiro), tol, preenchimento? }], a de medida mais
// próxima de um símbolo desenhado (dentro da tolerância e do mesmo preenchimento, ±0,08). Empate: a
// menor forma (não depende da ordem das linhas). Devolve o índice ou -1. Usada pela proposta do mapa e
// por aplicarMapa: cada símbolo é de UMA forma só (CAD-03).
function maisProxima(formas, medida, fracao) {
  let melhor = -1, custoMelhor = Infinity;
  formas.forEach((f, i) => {
    if (!mesmaMedida(medida, f.medida, f.tol)) return;
    const dF = Number.isFinite(f.preenchimento) ? Math.abs((fracao || 0) - f.preenchimento) : 0;
    if (dF > 0.08) return;
    const custo = Math.abs(medida[0] - f.medida[0]) + Math.abs(medida[1] - f.medida[1]) + dF;
    const empate = Math.abs(custo - custoMelhor) <= 1e-9;
    if (custo < custoMelhor - 1e-9 || (empate && (f.medida[0] < formas[melhor].medida[0] - 1e-9 || (Math.abs(f.medida[0] - formas[melhor].medida[0]) <= 1e-9 && f.medida[1] < formas[melhor].medida[1] - 1e-9)))) {
      melhor = i; custoMelhor = custo;
    }
  });
  return melhor;
}
// as posições de uma linha do mapa (centros, até 400) e os símbolos de outra são as mesmas (±30 cm, a folga
// de aplicarMapa para o mesmo aparelho em duas layers): todo símbolo de uma tem um da outra ao lado
const DUAS_LAYERS_M = 0.3;
const mesmasPosicoes = (centros, itens) => (centros || []).length > 0
  && itens.slice(0, centros.length).every(s => centros.some(c => Math.hypot(c[0] - s.centro[0], c[1] - s.centro[1]) < DUAS_LAYERS_M));
const comprimento = (r) => r.pts.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - r.pts[i][0], p[1] - r.pts[i][1]), 0);

// ambiente do ponto (o menor que o contém) e se ele está na área externa
function contexto(arq) {
  const ambienteDe = (p) => arq.ambientes.filter(a => dentro(p, a.poligono)).sort((a, b) => a.area_m2 - b.area_m2)[0] || null;
  const ehExterno = (p) => { const a = ambienteDe(p); return !a || tipoDoAmbiente(a.nome) === 'externo'; };
  const porLayer = new Map();
  for (const r of arq.referencia) {
    if (!r.pts.length || !(RE_INSTALACAO.test(r.layer || '') || ehLayerDeTracado(r.layer)) || RE_FORA.test(r.layer || '')) continue;
    if (!porLayer.has(r.layer)) porLayer.set(r.layer, []);
    porLayer.get(r.layer).push(r);
  }
  return { ambienteDe, ehExterno, porLayer };
}

// ── Alturas do projeto ──────────────────────────────────────────────────────
// Pedido do usuário (01/11/2026): as tomadas dos chuveiros do vestiário da Arena
// saíam a 0,30 m — a legenda diz "Tomada alta a 2,20m do piso". No QiBuilder o
// triângulo da tomada é o mesmo traço nas três alturas; o que muda é o
// PREENCHIMENTO (vazio = baixa, meio cheio = média, cheio = alta). Então cada
// símbolo da planta é comparado com os da legenda pela fração preenchida e pela
// proporção, e a nota escrita ao lado do ponto ("altura: 97,5 cm", "h= 20 cm
// abaixo do forro") vale sobre a legenda. A altura escrita é lida pelo leitor único
// (./textoCad.js): antes a legenda só entendia "… do piso" e a nota não entendia "h:" (CAD-11).
const areaPol = (pts) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

// fração da caixa do símbolo coberta por preenchimento sólido da mesma layer
function fracaoPreenchida(s, layer, preenchimentos) {
  const area = (s.caixa[2] - s.caixa[0]) * (s.caixa[3] - s.caixa[1]);
  if (!(area > 0) || !preenchimentos?.length) return 0;
  let cheio = 0;
  for (const p of preenchimentos) {
    if (p.layer !== layer) continue;
    const c = p.pts.reduce((a, q) => [a[0] + q[0] / p.pts.length, a[1] + q[1] / p.pts.length], [0, 0]);
    if (c[0] >= s.caixa[0] - COLA_M && c[0] <= s.caixa[2] + COLA_M && c[1] >= s.caixa[1] - COLA_M && c[1] <= s.caixa[3] + COLA_M) cheio += areaPol(p.pts);
  }
  return Math.min(1, cheio / area);
}

// legenda → [{ layer, medida, fracao, simbolo, disciplina, altura_m?, texto }]: cada símbolo
// da legenda fica com o texto da SUA linha (o mais perto à direita). O TEXTO diz o tipo
// (qualquer disciplina) e a altura ("… a 2,20m do piso"). Layer de nome claro só aceita
// texto do mesmo tipo (a luminária da linha de cima não pega a altura do interruptor).
//
// O texto que está mais perto de OUTRO símbolo da legenda é da linha dele. Antes só se olhava
// o texto que diz um tipo: o símbolo cuja linha não diz tipo nenhum ("Isolador de laço IDL 521")
// pegava o texto da linha vizinha — no R04, o INC-ISOLADOR saía como avisador e, com isso, o
// INC-SIRENE (mesma quantidade) virava "?" no mapa (fase 3, 02/11/2026). Agora a linha sem tipo
// fica sem tipo. A amostra de TRAÇO (raio de cobertura, campo de visão, eletrocalha — lado
// menor < 2 cm) não é símbolo de ponto. opcoes.comSemTipo: devolve também essas linhas, com
// simbolo null e o texto (a tela do mapa mostra a descrição na linha "?").
const RE_TEXTO_NAO_PONTO = /^\s*(raio|campo de vis|cobertura|eletrocalha|eletroduto|leito|perfilado|cabo|cabeamento|tubula|rota|tra[çc]ado)\b/i;
const ehTracoDeLegenda = (s) => s.medida[1] < 0.02;
function legendaDoProjeto(arq, opcoes = {}) {
  const textos = (arq.notas || []).filter(n => n.legenda && String(n.s || '').trim());
  if (!textos.length || !arq.simbolosDaLegenda?.length) return [];
  // todos os símbolos da legenda (de qualquer layer, inclusive traço e contorno): dizem de quem é cada texto
  const porLayerTodas = new Map();
  for (const r of arq.simbolosDaLegenda) {
    if (!porLayerTodas.has(r.layer)) porLayerTodas.set(r.layer, []);
    porLayerTodas.get(r.layer).push(r);
  }
  const grupos = [...porLayerTodas].flatMap(([layer, refs]) => agrupar(refs).map(s => ({ layer, s })));
  const naJanela = (s, n) => s.centro[0] >= n.x - 4 && s.centro[0] <= n.x + 0.1 && Math.abs(s.centro[1] - n.y) <= 1;
  // o texto é de outro símbolo quando outro grupo (de outra posição) está claramente mais perto dele
  const deOutro = (s, n) => {
    const d = Math.abs(s.centro[1] - n.y);
    // (o de outra coluna da legenda, bem mais à esquerda, não toma o texto desta)
    return grupos.some(o => o.s !== s && naJanela(o.s, n) && Math.abs(o.s.centro[1] - n.y) < d - 0.05 && Math.abs(o.s.centro[1] - s.centro[1]) > 0.05 && o.s.centro[0] >= s.centro[0] - 0.5);
  };
  const out = [];
  for (const { layer, s } of grupos) {
    if (!RE_INSTALACAO.test(layer || '') || RE_FORA.test(layer || '') || RE_TRECHO.test(layer || '')) continue;
    const daLayer = tipoPelaLayer(layer);
    if (!daLayer && RE_SO_CONTORNO.test(layer)) continue;
    const daLinha = textos.filter(n => naJanela(s, n) && !deOutro(s, n));
    if (!daLinha.length) continue;
    // texto de várias linhas ("Tomada alta" / "a 2,20m do piso"): vale o que diz o tipo, o mais perto
    const perto = (a, b) => Math.abs(a.y - s.centro[1]) - Math.abs(b.y - s.centro[1]) || (a.x - s.centro[0]) - (b.x - s.centro[0]);
    const comTipo = ehTracoDeLegenda(s) ? [] : daLinha.filter(n => tipoPeloTexto(n.s) && !RE_TEXTO_NAO_PONTO.test(n.s)).sort(perto);
    const t = comTipo.find(n => !daLayer || familia(tipoPeloTexto(n.s)[2]) === familia(daLayer[2]));
    const base = { layer, medida: s.medida.map(r2), fracao: r2(fracaoPreenchida(s, layer, arq.preenchimentos)) };
    if (!t) {
      // linha sem tipo (ou de outro tipo que a layer): fica sem tipo, com o texto dela
      if (opcoes.comSemTipo) out.push({ ...base, simbolo: null, disciplina: '', texto: [...daLinha].sort(perto)[0].s.slice(0, 120), semTipo: true });
      continue;
    }
    const [, , simbolo, disciplina] = tipoPeloTexto(t.s);
    const altura_m = alturaEscrita(t.s) || undefined;
    out.push({
      ...base, simbolo: /TOMADA/.test(simbolo) && altura_m ? tomadaPelaAltura(altura_m) : simbolo, disciplina,
      ...(altura_m ? { altura_m } : {}), texto: t.s.slice(0, 120),
    });
  }
  return out;
}
const legendaDeAlturas = (arq) => legendaDoProjeto(arq).filter(l => l.altura_m);

// o tipo da planta na legenda: mesma layer, mesma fração preenchida e mesma proporção
// (a planta pode estar noutra escala). Dois tipos ou duas alturas possíveis: nenhum (fica [CONFERIR]).
//
// Biblioteca de blocos (CAD-08): a linha aprendida de uma confirmação no mapa (porMedida — DWG/DXF em
// tamanho real) casa pela MEDIDA (±2 cm ou 8 %), não só pela proporção: a tomada de 20 cm e o quadro de
// 40 cm, dois quadrados na mesma layer, deixam de se confundir. A do mesmo escritório do carimbo vem antes
// da de outro escritório. A linha sem medida (legenda lida, aprendizado antigo) segue pela proporção.
function daLegenda(legenda, layer, medida, fracao, escritorio = '') {
  const prop = (m) => m[1] / m[0];
  const daLayer = legenda.filter(l => l.layer.toUpperCase() === layer.toUpperCase() && Math.abs(l.fracao - fracao) <= 0.08);
  const comMedida = daLayer.filter(l => l.porMedida && Array.isArray(l.medida)
    && mesmaMedida([...l.medida].sort((a, b) => b - a), medida, Math.max(0.02, 0.08 * medida[0])));
  const doEscritorio = escritorio ? comMedida.filter(l => l.escritorio === escritorio) : [];
  const cand = doEscritorio.length ? doEscritorio : comMedida.length ? comMedida
    : daLayer.filter(l => !l.porMedida && Math.abs(prop(l.medida) - prop(medida)) <= 0.15 * prop(l.medida));
  const chaves = new Set(cand.map(l => `${familia(l.simbolo)}|${l.altura_m || ''}`));
  return chaves.size === 1 ? cand.sort((a, b) => Math.abs(a.medida[0] - medida[0]) - Math.abs(b.medida[0] - medida[0]))[0] : null;
}


// nota escrita ao lado do ponto ("Tomada de espelho altura: 97,5 cm", "h= 20 cm abaixo
// do forro"): vale para o ponto de parede mais perto (até 1,5 m)
function aplicarNotas(arq, pontos) {
  for (const n of arq.notas || []) {
    if (n.legenda) continue;
    const a = lerAltura(n.s);
    // "altura do forro: 3,00 m", "pé-direito h=2,80": é do ambiente, não do ponto
    if (!a || (/forro|p[ée].?direito|\bteto\b|\blaje\b/i.test(n.s) && !a.abaixoDoForro)) continue;
    const alvo = pontos.filter(p => DE_PAREDE.test(p.simbolo)).map(p => [p, Math.hypot(p.x - n.x, p.y - n.y)]).filter(([, d]) => d <= 1.5).sort((a, b) => a[1] - b[1])[0]?.[0];
    if (!alvo) continue;
    const h = a.altura_m;
    if (!(h > 0 && h < 10)) continue;
    delete alvo.altura_m; delete alvo.abaixoDoForro_m;
    if (a.abaixoDoForro) alvo.abaixoDoForro_m = h;
    else alvo.altura_m = h;
    if (/TOMADA/.test(alvo.simbolo)) alvo.simbolo = alvo.altura_m ? tomadaPelaAltura(alvo.altura_m) : 'HM-ELE-TOMADA-ALTA';
    alvo.rotulo = `${/TOMADA/.test(alvo.simbolo) ? 'Tomada' : /INTERRUPTOR/.test(alvo.simbolo) ? 'Interruptor' : (alvo.rotulo || 'Ponto').replace(/\s*\(nota do projeto:.*$/, '')} (nota do projeto: ${n.s})`.slice(0, 100);
    alvo.alturaDe = 'nota';
  }
  // a nota pode ter trocado o tipo (baixa → média): numeração de novo, por tipo
  const cont = new Map();
  for (const p of pontos) {
    const n = (cont.get(p.simbolo) || 0) + 1;
    cont.set(p.simbolo, n);
    p.id = `${p.simbolo.replace(/^HM-[A-Z]+-/, '')}-${n}`;
  }
}

// Notas GERAIS de altura ("Tomadas baixas a 0,30 m do piso", "Interruptores h = 1,10 m"): dizem o tipo e a altura sem
// estar ao lado de um ponto (aplicarNotas só vale a menos de 1,5 m). Devolve [{ simbolo, altura_m, texto }], uma por tipo
// de ponto de parede. Fica de fora a nota que cita dois tipos ("tomadas a 0,30 e interruptores a 1,10"), a de forro/pé-direito
// e o tipo que as notas contradizem (duas alturas). É SUGESTÃO para a linha do mapa sem altura (item 8 do plano).
function notasDeAltura(arq) {
  const por = new Map();
  for (const n of arq.notas || []) {
    if (n.legenda || /forro|p[ée].?direito|\bteto\b|\blaje\b/i.test(n.s)) continue;
    const h = alturaEscrita(n.s);
    const tipos = TIPOS.filter(([, rt]) => rt.test(n.s));
    if (!(h > 0 && h <= 5) || !tipos.length || new Set(tipos.map(t => familia(t[2]))).size !== 1) continue;
    const t = tipos[0];
    if (!DE_PAREDE.test(t[2])) continue;
    const simbolo = /TOMADA/.test(t[2]) ? tomadaPelaAltura(h) : t[2];
    const g = por.get(simbolo) || por.set(simbolo, { alturas: new Set(), texto: n.s.slice(0, 120) }).get(simbolo);
    g.alturas.add(h);
  }
  return [...por].filter(([, g]) => g.alturas.size === 1).map(([simbolo, g]) => ({ simbolo, altura_m: [...g.alturas][0], texto: g.texto }));
}

// Mapa proposto: cada layer de instalação → tipos de símbolo (medida × quantidade) e traçados.
// opcoes.aprendidos: a legenda lida em projetos anteriores (backend: tabela cad_simbolos_aprendidos),
// usada só na layer que não tem legenda neste desenho — o sistema aprende a cada projeto.
function propostaDeMapa(arq, opcoes = {}) {
  const { ehExterno, porLayer } = contexto(arq);
  // (as linhas da legenda sem tipo — "Isolador de laço" — só emprestam a descrição à linha "?" do mapa)
  const legendaToda = legendaDoProjeto(arq, { comSemTipo: true });
  const legendaDaqui = legendaToda.filter(l => l.simbolo);
  const semTipoDaqui = legendaToda.filter(l => !l.simbolo);
  const comLegenda = new Set(legendaDaqui.map(l => l.layer.toUpperCase()));
  const legenda = [...legendaDaqui, ...(opcoes.aprendidos || []).filter(l => l?.layer && Array.isArray(l.medida) && !comLegenda.has(l.layer.toUpperCase())).map(l => ({ ...l, aprendido: true }))];
  // forma que nenhuma regra reconhece: a mais parecida entre tudo o que já foi aprendido, de qualquer escritório
  // e com outro nome de layer (./semelhancaDeSimbolo.js) — sugestão com confiança, nunca contagem sem conferir
  const exemplos = prepararExemplos([...legendaDaqui, ...(opcoes.aprendidos || [])]);
  // símbolo da layer → tipo da legenda (do mesmo aparelho: tomada continua tomada)
  const pelaLegenda = (layer, sug, t) => {
    if (RE_PDF_COR.test(layer)) return null;
    const l = daLegenda(legenda, layer, t.medida, t.fracao, opcoes.escritorio || '');
    if (!l) return null;
    // tipo conferido pelo engenheiro em outro projeto (l.usuario) vale mesmo quando a regra da layer dizia outra família
    if (!l.usuario && (sug ? familia(l.simbolo) !== familia(sug.simbolo) : RE_SO_CONTORNO.test(layer))) return null;
    return l;
  };
  // altura sugerida pelas notas gerais deste desenho e, depois, pelo que o escritório (responsável técnico do carimbo)
  // costuma escrever (opcoes.notasAprendidas, services/notasAprendidas.js; opcoes.escritorio)
  const notasDaqui = notasDeAltura(arq);
  const alturaSugerida = (simbolo) => {
    if (!simbolo || !DE_PAREDE.test(simbolo)) return null;
    const d = notasDaqui.find(n => n.simbolo === simbolo);
    if (d) return { altura_m: d.altura_m, de: 'nota', texto: d.texto };
    if (!opcoes.escritorio) return null; // carimbo sem responsável: não dá para saber de quem é o costume
    const a = (opcoes.notasAprendidas || []).find(n => n.simbolo === simbolo && n.escritorio === opcoes.escritorio);
    return a ? { altura_m: a.altura_m, de: 'nota_aprendida', texto: a.texto } : null;
  };
  const simbolos = [];
  const trechos = [];
  for (const [layer, refs] of [...porLayer].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (ehLayerDeTracado(layer)) {
      const piso = /PISO|DIRETA|ENTERR|SOLO/i.test(layer);
      // tipo e disciplina pela regra comum (a do orçamento) e o comprimento sem os trechos repetidos (CAD-10)
      trechos.push({ layer, tipo: tipoDoTracado(layer).tipo, disciplina: disciplinaDoTracado(layer), ...(piso ? { altura: 0.04 } : {}), comprimento_m: r2(segmentosUnicos(refs).reduce((s, g) => s + Math.hypot(g[2] - g[0], g[3] - g[1]), 0)) });
      continue;
    }
    const pdf = RE_PDF_COR.test(layer);
    let ehTracado = false;
    if (pdf) {
      // a cor do PDF: o que não é símbolo é traçado (eletroduto; as abas paralelas
      // viram eletrocalha no 3D); tracejado é o enterrado/embutido no piso (NBR 5444)
      const noSimbolo = new Set(agrupar(refs, Infinity).filter(simboloPdf).flatMap(s => s.membros));
      const resto = refs.filter((_, i) => !noSimbolo.has(i));
      const L = resto.reduce((s, r) => s + comprimento(r), 0);
      const total = refs.reduce((s, r) => s + comprimento(r), 0);
      // tracejado que o PDF desenhou traço a traço (sem padrão de traço): muitos pedaços curtos
      const pedacos = resto.map(comprimento).sort((a, b) => a - b);
      const picado = pedacos.length > 50 && pedacos[pedacos.length >> 1] < 0.25;
      // layer de símbolos com sobras (texto, contorno) não vira traçado
      ehTracado = L >= 3 && L >= 0.5 * total;
      if (ehTracado) trechos.push({ layer, tipo: 'eletroduto', disciplina: 'eletrica', foraDosSimbolos: true, ...(/TRACEJADO/.test(layer) || picado ? { altura: 0.04 } : {}), comprimento_m: r2(L) });
    }
    // tipos de símbolo da layer: medidas parecidas (±3 cm) e o mesmo preenchimento juntos
    const cheios = !pdf && (arq.preenchimentos || []).some(p => p.layer === layer);
    // a forma de cada tipo é a do primeiro símbolo que não cabia em nenhum; depois cada símbolo vai
    // para o tipo de medida MAIS PRÓXIMA — a mesma regra de aplicarMapa (CAD-03): a contagem da
    // linha e os pontos que ela gera batem
    const tipos = [];
    const formas = [];
    for (const s of agrupar(refs)) {
      if (pdf && !simboloPdf(s)) continue;
      const fracao = fracaoPreenchida(s, layer, arq.preenchimentos);
      formas.push({ s, fracao });
      if (!tipos.some(x => mesmaMedida(x.medida, s.medida, 0.03) && Math.abs(x.fracao - fracao) <= 0.08)) tipos.push({ medida: s.medida, fracao, itens: [] });
    }
    // (com a medida e o preenchimento arredondados como ficam na linha: o empate sai igual nos dois)
    const candidatos = tipos.map(t => ({ medida: t.medida.map(r2), tol: 0.03, ...(cheios ? { preenchimento: r2(t.fracao) } : {}) }));
    const exatos = tipos.map(t => ({ medida: t.medida, tol: 0.03, preenchimento: t.fracao }));
    for (const { s, fracao } of formas) {
      let i = maisProxima(candidatos, s.medida, cheios ? fracao : 0);
      if (i < 0) i = maisProxima(exatos, s.medida, fracao); // no limite da tolerância, o arredondamento não tira o símbolo
      if (i >= 0) tipos[i].itens.push(s);
    }
    // símbolo isolado só entra se o nome da layer diz o que é (o quadro geral costuma ser um só)
    // (no PDF, sem nome de layer, só o que se repete)
    const mais = (x) => x.itens.length >= 2 || (x.itens.length === 1 && !pdf && (!!sugestao(layer, x.medida, x.itens.every(q => ehExterno(q.centro))) || !!pelaLegenda(layer, null, x)));
    // Todas as formas viram linha (antes, só as 8 mais frequentes de cada layer: numa layer
    // genérica "SIMBOLOS" o resto sumia do mapa sem aviso — CAD-06). Na cor do PDF, depois das
    // 8 mais frequentes, a forma aparece para conferir mas sem tipo sugerido (letra e seta
    // convertidas em traço não viram ponto sozinhas).
    for (const [ordem, t] of tipos.filter(mais).sort((a, b) => b.itens.length - a.itens.length).entries()) {
      // área externa: fora das salas, ou em ambiente externo (estacionamento, quadra, pátio)
      const fora = t.itens.filter(s => ehExterno(s.centro)).length;
      const circular = t.itens.filter(q => redondo(q, refs)).length > t.itens.length / 2;
      // na cor que é traçado, as marcas miúdas são setas e indicações do eletroduto: só o círculo (luminária) vira ponto
      let sug = pdf ? sugestaoPdf(t.medida, fora > t.itens.length / 2, circular) : sugestao(layer, t.medida, fora > t.itens.length / 2);
      if (pdf && ehTracado && sug?.simbolo !== 'HM-ILU-LUMINARIA') sug = null;
      if (pdf && ordem >= MAX_FORMAS_PDF_SUGERIDAS) sug = null;
      // tipo e altura pela legenda do projeto (tomada alta/média/baixa, interruptor a 1,20 m;
      // layer genérica "SIMBOLOS" com "Detector de fumaça" ao lado na legenda)
      const leg = pelaLegenda(layer, sug, t);
      if (leg) sug = { simbolo: leg.simbolo, disciplina: sug?.disciplina || leg.disciplina, rotulo: leg.texto };
      const sem = !sug && !pdf ? porSemelhanca(exemplos, layer, t.medida, t.fracao) : null;
      if (sem) sug = { simbolo: sem.simbolo, disciplina: sem.disciplina, rotulo: sem.texto };
      // o mesmo aparelho desenhado em duas layers (símbolo + contorno IFC): conta uma vez só — mas só quando as
      // POSIÇÕES coincidem. Antes bastava o mesmo tipo e a mesma quantidade: EL-LUMINARIA-TERREO (6) e
      // EL-LUMINARIA-SUPERIOR (6, noutro lugar) davam 6 luminárias em vez de 12 (revisão de 06/11/2026)
      if (sug && simbolos.some(o => o.layer !== layer && o.simbolo === sug.simbolo && o.quantidade === t.itens.length && mesmasPosicoes(o.centros, t.itens))) sug = null;
      const semUsada = sug && sem ? sem : null;
      // (o tipo e a altura da legenda só valem se a linha ficou com o tipo: antes a linha "?" saía com origem "legenda")
      const legUsada = sug && leg ? leg : null;
      const sugAltura = !legUsada?.altura_m ? alturaSugerida(sug?.simbolo) : null;
      // linha sem tipo: a descrição da legenda deste desenho, se a linha dela não diz tipo (a tela mostra o que é)
      const semTipo = !sug && !pdf ? daLegenda(semTipoDaqui.map(l => ({ ...l, simbolo: 'SEM-TIPO' })), layer, t.medida, t.fracao) : null;
      simbolos.push({
        layer, medida: t.medida.map(r2), quantidade: t.itens.length, fora, simbolo: sug ? sug.simbolo : '?', rotulo: sug?.rotulo || semTipo?.texto || '', disciplina: sug ? sug.disciplina : '',
        // layer com preenchimento: o tipo vale só para os símbolos com a mesma fração (aplicarMapa)
        ...(cheios ? { preenchimento: r2(t.fracao) } : {}), ...(legUsada?.altura_m ? { altura_m: legUsada.altura_m, alturaDe: legUsada.aprendido ? 'aprendido' : 'legenda' } : sugAltura ? { altura_m: sugAltura.altura_m, alturaDe: sugAltura.de, alturaTexto: sugAltura.texto } : {}), ...(legUsada ? { tipoDe: legUsada.aprendido ? 'aprendido' : 'legenda' } : {}),
        ...(semUsada ? { tipoDe: 'semelhante', semelhanca: { confianca: semUsada.confianca, faixa: semUsada.faixa, base: semUsada.base } } : {}),
        ...(sug && sug.simbolo === 'HM-ELE-CAIXA-PISO' && !pdf ? { area: 'externa' } : {}),
        // onde cada símbolo desta forma está (a planta da tela do mapa mostra também o que não foi reconhecido)
        centros: t.itens.slice(0, 400).map(q => [r2(q.centro[0]), r2(q.centro[1])]),
      });
    }
  }
  // limite de linhas (o mapa vai guardado na análise): ficam as reconhecidas e as mais frequentes;
  // o que sobra é dito no aviso, nunca some calado
  if (simbolos.length <= MAX_LINHAS_MAPA) return { simbolos, trechos };
  const ficam = new Set(simbolos.map((s, i) => [s, i])
    .sort(([a], [b]) => (b.simbolo !== '?') - (a.simbolo !== '?') || b.quantidade - a.quantidade)
    .slice(0, MAX_LINHAS_MAPA).map(([, i]) => i));
  const saem = simbolos.filter((_, i) => !ficam.has(i));
  const comTipo = saem.filter(s => s.simbolo !== '?').length;
  const aviso = `o mapa do desenho mostra ${MAX_LINHAS_MAPA} formas de símbolo; outras ${saem.length} (${saem.reduce((t, s) => t + s.quantidade, 0)} símbolos${comTipo ? `, ${comTipo} delas com tipo sugerido` : ', nenhuma reconhecida'}; layers ${[...new Set(saem.map(s => s.layer))].slice(0, 5).join(', ')}) ficaram fora da lista e da contagem — [CONFERIR] no desenho`;
  return { simbolos: simbolos.filter((_, i) => ficam.has(i)), trechos, aviso };
}

// Confirmações do engenheiro (tela do mapa do CAD) sobre o mapa proposto: [{ layer, medida, preenchimento?,
// simbolo, disciplina?, altura_m?, rotulo? }]. Casa pela layer, pela medida (±3 cm) e pelo preenchimento; a linha
// confirmada vale mais que a legenda, o aprendido e a regra. simbolo '?' = "não é ponto" (fica fora da contagem).
function aplicarConfirmacoes(mapa, confirmados) {
  if (!confirmados?.length) return mapa;
  const simbolos = (mapa.simbolos || []).map((s) => {
    if (!Array.isArray(s.medida) || s.medida.length < 2) return s;
    // a confirmação de medida mais próxima (não a primeira a ±3 cm: duas linhas vizinhas,
    // 20 e 22 cm, confirmadas com tipos diferentes, pegavam as duas o tipo da primeira)
    const daLayer = confirmados.filter(x => String(x.layer).toUpperCase() === String(s.layer).toUpperCase() && Array.isArray(x.medida) && x.medida.length >= 2
      && (!Number.isFinite(x.preenchimento) || !Number.isFinite(s.preenchimento) || Math.abs(x.preenchimento - s.preenchimento) <= 0.08));
    const k = maisProxima(daLayer.map(x => ({ medida: [...x.medida].sort((a, b) => b - a), tol: 0.03 })), [...s.medida].sort((a, b) => b - a), 0);
    const c = k >= 0 ? daLayer[k] : null;
    if (!c) return s;
    const { altura_m, alturaDe, ...resto } = s;
    return {
      ...resto, simbolo: c.simbolo, disciplina: c.disciplina || (c.simbolo === s.simbolo ? s.disciplina : ''), rotulo: c.rotulo ?? s.rotulo,
      ...(Number(c.altura_m) > 0 ? { altura_m: Number(c.altura_m), alturaDe: 'confirmado' } : {}), tipoDe: 'confirmado', confirmado: true,
    };
  });
  return { ...mapa, simbolos };
}

// De onde veio o tipo de uma linha do mapa (tela de confirmação): confirmado × legenda do desenho × aprendido de
// outro projeto × regra (nome da layer, medida) × não reconhecido
function origemDaLinha(s) {
  if (s.confirmado) return 'confirmado';
  if (s.tipoDe === 'legenda' || s.tipoDe === 'aprendido' || s.tipoDe === 'semelhante') return s.tipoDe;
  return s.simbolo && s.simbolo !== '?' ? 'regra' : 'nao_reconhecido';
}

// Mapa (proposto ou conferido) → pontos e trechos
function aplicarMapa(arq, mapa) {
  const { ambienteDe, ehExterno, porLayer } = contexto(arq);
  const pontos = [];
  const contagem = new Map();
  const linhasDoMapa = mapa.simbolos || [];
  for (const m of linhasDoMapa) {
    if (m.simbolo && m.simbolo !== '?' && !ESPEC[m.simbolo]) throw new Error(`Símbolo "${m.simbolo}" (layer ${m.layer}) não existe no 3D (use: ${Object.keys(ESPEC).join(', ')}).`);
  }
  // Cada símbolo desenhado vai para UMA linha: a de medida mais próxima (e mesmo preenchimento). Antes
  // ele entrava em toda linha da layer a ±3 cm — duas linhas vizinhas confirmadas com tipos diferentes
  // davam o mesmo símbolo como tomada E interruptor (9 símbolos → 12 pontos; CAD-03, 02/11/2026).
  // A linha "não é ponto" ('?') também fica com os seus símbolos (eles não vão para a vizinha).
  const doMapa = new Map(); // linha → símbolos desenhados dela
  const linhasPorLayer = new Map();
  linhasDoMapa.forEach((m, i) => {
    if (!Array.isArray(m.medida) || m.medida.length < 2) return;
    (linhasPorLayer.get(m.layer) || linhasPorLayer.set(m.layer, []).get(m.layer)).push(i);
  });
  for (const [layer, idxs] of linhasPorLayer) {
    const pdf = RE_PDF_COR.test(layer);
    const formas = idxs.map(i => {
      const m = linhasDoMapa[i];
      return { i, area: m.area, medida: [...m.medida].sort((a, b) => b - a), tol: Number(m.tolerancia) > 0 ? Number(m.tolerancia) : 0.03, ...(Number.isFinite(m.preenchimento) ? { preenchimento: m.preenchimento } : {}) };
    });
    const comPreenchimento = formas.some(f => Number.isFinite(f.preenchimento));
    const comArea = formas.some(f => f.area === 'externa' || f.area === 'interna');
    for (const s of agrupar(porLayer.get(layer) || [])) {
      if (pdf && !simboloPdf(s)) continue;
      const fracao = comPreenchimento ? fracaoPreenchida(s, layer, arq.preenchimentos) : 0;
      const externo = comArea ? ehExterno(s.centro) : null;
      const cand = formas.filter(f => !(f.area === 'externa' && !externo) && !(f.area === 'interna' && externo));
      const k = maisProxima(cand, s.medida, fracao);
      if (k < 0) continue;
      const linha = cand[k].i;
      (doMapa.get(linha) || doMapa.set(linha, []).get(linha)).push(s);
    }
  }
  // Ponto repetido (revisão de 06/11/2026). Antes, dois pontos do mesmo tipo a menos de 30 cm viravam um só —
  // as 2 tomadas a 25 cm de cada bancada saíam 1. A regra agora separa os dois casos:
  //   - de OUTRA linha do mapa (outra layer ou outra forma: EL-Lâmpada + IFC-Luminária-Contorno, o quadro
  //     desenhado em partes): é o mesmo aparelho até 30 cm, como antes;
  //   - da MESMA linha (mesma layer e mesma forma): dois símbolos iguais lado a lado são dois aparelhos; só é o
  //     mesmo quando as caixas se sobrepõem — o centro a menos de meio símbolo (a cópia sobreposta, o bloco
  //     inserido duas vezes no mesmo ponto).
  const vistos = []; // { x, y, simbolo, linha, meio }
  for (const [linha, m] of linhasDoMapa.entries()) {
    if (!m.simbolo || m.simbolo === '?') continue;
    for (const s of doMapa.get(linha) || []) {
      const meio = Math.max(0.02, s.medida[0] / 2);
      const repetido = vistos.some(o => o.simbolo === m.simbolo && Math.hypot(o.x - s.centro[0], o.y - s.centro[1]) < (o.linha === linha ? Math.max(meio, o.meio) : DUAS_LAYERS_M));
      if (repetido) continue;
      vistos.push({ x: s.centro[0], y: s.centro[1], simbolo: m.simbolo, linha, meio });
      const amb = ambienteDe(s.centro);
      const n = (contagem.get(m.simbolo) || 0) + 1;
      contagem.set(m.simbolo, n);
      pontos.push({
        id: `${m.simbolo.replace(/^HM-[A-Z]+-/, '')}-${n}`, simbolo: m.simbolo, x: r2(s.centro[0]), y: r2(s.centro[1]),
        ...(m.rotulo || ROTULO_PADRAO[m.simbolo] ? { rotulo: m.rotulo || ROTULO_PADRAO[m.simbolo] } : {}), ...(m.disciplina ? { disciplina: m.disciplina } : {}),
        ...(Number(m.altura_m) > 0 ? { altura_m: Number(m.altura_m), alturaDe: m.alturaDe || 'mapa' } : {}), ambiente: amb ? amb.nome : '',
        // linha do mapa de onde o ponto veio (a tela do mapa conta os pontos por linha) e se o engenheiro confirmou o tipo
        linha, ...(m.confirmado ? { confirmado: true } : {}),
      });
    }
  }
  aplicarNotas(arq, pontos);
  const trechos = [];
  for (const t of mapa.trechos || []) {
    const segmentos = [];
    const refs = porLayer.get(t.layer) || [];
    // layer de cor do PDF: o traçado sem os símbolos da mesma cor
    const noSimbolo = t.foraDosSimbolos ? new Set(agrupar(refs, Infinity).filter(simboloPdf).flatMap(s => s.membros)) : null;
    // (o trecho desenhado de novo por cima entra uma vez só — a mesma regra da medição do orçamento, CAD-10)
    segmentos.push(...segmentosUnicos(refs.filter((_, i) => !noSimbolo?.has(i))));
    const { comprimento_m, foraDosSimbolos, ...resto } = t;
    if (segmentos.length) trechos.push({ ...resto, segmentos });
  }
  return { pontos, trechos };
}

const pontosDoDesenho = (arq, opcoes = {}) => aplicarMapa(arq, propostaDeMapa(arq, opcoes));

module.exports = {
  notasDeAltura, pontosDoDesenho, propostaDeMapa, aplicarMapa, aplicarConfirmacoes, origemDaLinha, agrupar, sugestao, sugestaoPdf, legendaDoProjeto, legendaDeAlturas, fracaoPreenchida, tomadaPelaAltura, metros, DE_PAREDE, TIPOS, RE_INSTALACAO, RE_FORA, RE_TRECHO, RE_PDF_COR };
