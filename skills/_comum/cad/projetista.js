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
//      saída/escada a no máximo 30 m de caminhamento (5.5.3); elétrica e iluminação pelo cálculo da PRÓPRIA skill
//      (NBR 5410 9.5.2 e método dos lúmens — ./estimativaArquitetura.js), com os circuitos e a seção de cada um;
//   3) a infraestrutura é TRAÇADA: um tronco pelas circulações até a prumada (escada/shaft) e o rack/central/quadro, e
//      um eletroduto de cada ponto até o tronco — ROTEADO por dentro das salas e pelas portas, desviando das paredes
//      (2.46) — e cada cabo é MEDIDO pelo caminho (horizontal + subida entre os níveis lidos + folga);
//   4) o que é critério adotado (não número de norma) sai marcado [CONFERIR] — a norma não diz quantas câmeras uma
//      capela tem; diz o raio do detector e o comprimento máximo do cabo. O engenheiro escolhe os critérios antes
//      (opcoes.criterios: densidade de câmeras, cobertura do incêndio, tomadas de rede, classe do SPDA, ambientes fora).
// O resultado são pontos e trechos no MESMO formato da leitura de um projeto pronto: entram na análise como os
// componentes inseridos pelo engenheiro (contagem, 3D por pavimento, editor de inserir/retirar), marcados "projetista".
//
//   projetarDisciplinas(arquitetura, disciplinas, opcoes) →
//     { pontos: [{ x, y, simbolo, disciplina, rotulo, altura_m, ambiente, pavimento, motivo }],
//       trechos: [{ disciplina, tipo, layer, segmentos: [[x1, y1, x2, y2]], material, medida }],
//       cabos: [{ disciplina, ponto, descricao, comprimento_m }], metragens: [{ disciplina, descricao, metros }],
//       resumo: [{ disciplina, pavimento, itens: { simbolo: n } }], criterios: [texto], avisos: [texto],
//       pavimentosInfo: [{ nome, nivel_m, pe_direito_m, deslocamento, metodo }], criteriosUsados }
const { dentro, centroide } = require('./arquitetura');
const P = require('./posicionamento');
const INC = require('../../incendio/scripts/lib/calculo');
const SPDA = require('../../spda/scripts/lib/tabelas');
// elétrica e iluminação: o cálculo normativo da skill sobre a planta (carregado só quando pedido)
let motorDasPlantas = null;
const pontosDasDisciplinas = (...a) => (motorDasPlantas || (motorDasPlantas = require('./estimativaArquitetura').pontosDasDisciplinas))(...a);

const r2 = (v) => Math.round(v * 100) / 100;
const br = (v) => String(r2(v)).replace('.', ',');
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

// ── Critérios escolhidos pelo engenheiro antes de gerar (2.46) ─────────────
// Tudo aqui é critério de projeto (não número de norma); o padrão é o que a 2.45 usava.
const DENSIDADE_CFTV = { economica: 0.6, padrao: 1, reforcada: 1.5 };
const ROTULO_DENSIDADE = { economica: 'econômica', padrao: 'padrão', reforcada: 'reforçada' };
function criteriosDe(c = {}) {
  const densidadeCftv = DENSIDADE_CFTV[c.densidadeCftv] ? c.densidadeCftv : 'padrao';
  const pd = Number(c.peDireito);
  return {
    densidadeCftv, fatorCftv: DENSIDADE_CFTV[densidadeCftv],
    cftvExterno: c.cftvExterno !== false, ptz: c.ptz !== false,
    incendio: c.incendio === 'rotas' ? 'rotas' : 'total',
    redePor10m2: [2, 3, 4].includes(Number(c.redePor10m2)) ? Number(c.redePor10m2) : 2,
    classeSpda: ['I', 'II', 'III', 'IV'].includes(c.classeSpda) ? c.classeSpda : 'III',
    excluir: [...new Set((Array.isArray(c.excluir) ? c.excluir : []).map(s => String(s || '').trim()).filter(Boolean))],
    peDireito: pd > 1.8 && pd < 30 ? pd : null,
    centros: centrosDe(c.centros),
    regras: regrasDe(c.regras),
  };
}

// (2.49) REGRAS APRENDIDAS das instruções do engenheiro e aprovadas pelo administrador (backend:
// services/instrucoes/regrasProjetista.js). Valem por disciplina e TIPO de ambiente:
//   { modo: 'mais'|'menos', n } — acrescenta/retira n do componente em cada ambiente do tipo;
//   { modo: 'nenhum' }          — o tipo de ambiente não leva o componente;
//   { modo: 'centro', grupo }   — o equipamento central do grupo vai num ambiente do tipo.
// A análise guarda as regras com que foi feita (criteriosUsados): recalcular a mesma análise não aplica regra nova por
// cima das edições que a ensinaram.
const MODOS_REGRA = new Set(['mais', 'menos', 'nenhum', 'centro']);
const GRUPOS_CENTRO = new Set(['telecom', 'incendio', 'alarme', 'acesso', 'telefonia', 'antena']);
function regrasDe(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const r of v.slice(0, 60)) {
    if (!r || typeof r !== 'object' || !MODOS_REGRA.has(r.modo) || !ROTULO_TIPO[r.tipo]) continue;
    const base = { id: Number.isInteger(r.id) ? r.id : null, modo: r.modo, tipo: r.tipo, nome: String(r.nome || '').slice(0, 80) };
    if (r.modo === 'centro') { if (GRUPOS_CENTRO.has(r.grupo)) out.push({ ...base, grupo: r.grupo }); continue; }
    if (!DISCIPLINAS[r.disciplina] || DISCIPLINAS[r.disciplina].motor || DISCIPLINAS[r.disciplina].especial || !/^HM-[A-Z0-9-]{2,40}$/.test(String(r.simbolo || ''))) continue;
    const n = Math.round(Number(r.n));
    if (r.modo !== 'nenhum' && !(n >= 1 && n <= 20)) continue;
    out.push({ ...base, disciplina: r.disciplina, simbolo: r.simbolo, ...(r.modo === 'nenhum' ? {} : { n }) });
  }
  return out;
}
const POSICAO_PADRAO = { 'HM-CFTV-CAMERA': 'cantos', 'HM-ALM-IVP': 'cantos', 'HM-INC-DETECTOR-FUMACA': 'grade', 'HM-INC-DETECTOR-TEMP': 'grade', 'HM-CAB-AP': 'grade' };
const MONTAGEM_PERIMETRO = /PONTO-REDE|TEL-PONTO|ANT-PONTO|TOMADA|LEITOR|BOTOEIRA|ACIONADOR|TECLADO|MAGNETICO/;
const minuscula = (s) => String(s || '').replace(/^\p{Lu}(?=\p{Ll})/u, c => c.toLowerCase());
function textoDaRegra(r) {
  const tipo = ROTULO_TIPO[r.tipo] || r.tipo;
  const nome = minuscula(r.nome || r.simbolo);
  if (r.modo === 'nenhum') return `${tipo}: sem ${nome}`;
  if (r.modo === 'centro') return `equipamento central (${r.grupo}) em ${tipo}`;
  return `${tipo}: ${r.modo === 'mais' ? '+' : '−'}${r.n} ${nome}`;
}
// ajusta o que as regras da disciplina deram para o ambiente; usadas: Map(regra → nº de ambientes)
function ajustarPelasRegras(itens, a, disc, regras, usadas) {
  const minhas = regras.filter(r => r.modo !== 'centro' && r.disciplina === disc && r.tipo === a.tipo);
  if (!minhas.length) return itens;
  let lista = itens.map(i => ({ ...i }));
  const marcar = (r) => usadas.set(r, (usadas.get(r) || 0) + 1);
  // "nenhum" vale por último (se o engenheiro tirou o componente do tipo de ambiente, nada o põe de volta)
  for (const r of [...minhas.filter(x => x.modo !== 'nenhum'), ...minhas.filter(x => x.modo === 'nenhum')]) {
    const doSimbolo = lista.filter(i => i.simbolo === r.simbolo && i.n > 0);
    const motivo = `regra aprendida das instruções do engenheiro (aprovada): ${textoDaRegra(r)}`;
    if (r.modo === 'nenhum') {
      if (doSimbolo.length) { lista = lista.filter(i => i.simbolo !== r.simbolo); marcar(r); }
    } else if (r.modo === 'mais') {
      if (doSimbolo.length) { doSimbolo[0].n += r.n; doSimbolo[0].motivo = `${doSimbolo[0].motivo}; + ${r.n} pela ${motivo}`; } else {
        lista.push({ simbolo: r.simbolo, n: r.n, regra: POSICAO_PADRAO[r.simbolo] || (MONTAGEM_PERIMETRO.test(r.simbolo) ? 'perimetro' : 'cantos'), rotulo: `${r.nome || r.simbolo} — ${a.nome}`, motivo });
      }
      marcar(r);
    } else if (r.modo === 'menos' && doSimbolo.length) {
      let falta = r.n;
      for (const i of doSimbolo) { const t = Math.min(i.n, falta); i.n -= t; falta -= t; i.motivo = `${i.motivo}; − ${t} pela ${motivo}`; }
      lista = lista.filter(i => i.n > 0);
      marcar(r);
    }
  }
  return lista;
}

// (2.47) local da ESTRUTURA escolhido pelo engenheiro (campo de instruções: "leve o rack para o CPD"): por grupo
// (telecom, incendio, alarme, acesso, telefonia, antena) ou, para o QD de cada pavimento, "eletrica|<pavimento>" →
// { ambiente, pavimento? }. A sala é procurada pelo nome; nome que não existe fica no local calculado, com aviso.
function centrosDe(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out = {};
  for (const [k, x] of Object.entries(v).slice(0, 40)) {
    const ambiente = String((x && typeof x === 'object' ? x.ambiente : x) || '').trim().slice(0, 120);
    const pavimento = x && typeof x === 'object' && x.pavimento ? String(x.pavimento).trim().slice(0, 80) : null;
    if (/^[a-z_]+(\|.{1,80})?$/.test(k) && ambiente) out[k] = { ambiente, ...(pavimento ? { pavimento } : {}) };
  }
  return out;
}

// ── 2) Regras por disciplina ─────────────────────────────────────────────
// Cada regra devolve, para um ambiente, [{ simbolo, n, regra, rotulo, motivo }] (n = 0: nada). ctx = { crit, pd }.
// CFTV (IEC 62676-4 — a quantidade é critério de projeto, não número de norma): acesso, circulação, espaço de reunião,
// guarda de valores (secretaria, sacristia, tesouraria, CPD) e área externa. Nunca em sanitário, dormitório nem na
// residência (privacidade — LGPD). Densidade escolhida pelo engenheiro (econômica × 0,6, padrão, reforçada × 1,5); PTZ
// nos espaços muito grandes, como o projeto R04 da paróquia entregue pela H&M (18 fixas + 2 PTZ).
function regrasCftv(a, { crit }) {
  const f = crit.fatorCftv;
  const nq = (base, min, max) => Math.min(Math.max(min, Math.round(max * f)), Math.max(min, Math.round(base * f)));
  const q = (n, regra, motivo, externa = false) => (n > 0 ? [{ simbolo: 'HM-CFTV-CAMERA', n, regra, rotulo: externa ? `Câmera bullet externa IP67 — ${a.nome}` : `Câmera dome — ${a.nome}`, motivo, externa }] : []);
  const ptz = (motivo) => (crit.ptz ? [{ simbolo: 'HM-CFTV-CAMERA', n: 1, regra: 'centro', rotulo: `Câmera PTZ (speed dome) — ${a.nome}`, motivo, ptz: true }] : []);
  const dens = crit.densidadeCftv === 'padrao' ? '' : ` — densidade ${ROTULO_DENSIDADE[crit.densidadeCftv]}`;
  if (a.residencial) return [];
  switch (a.tipo) {
    case 'assembleia': return [...q(nq(Math.ceil(a.area / 200), 2, 6), 'cantos', `espaço de reunião de pessoas (${r2(a.area)} m²): visão geral e das entradas — 1 câmera a cada ~200 m², de 2 a 6${dens} [CONFERIR]`),
      ...(a.area >= 400 ? ptz(`espaço de reunião de ${r2(a.area)} m²: PTZ para acompanhar o que as fixas não detalham [CONFERIR]`) : [])];
    case 'circulacao': return a.area < 8 ? [] : q(nq(Math.ceil(a.area / 150), 1, 4), a.area > 150 ? 'grade' : 'cantos', `circulação: passagem obrigatória de quem entra — 1 câmera a cada ~150 m², até 4${dens} [CONFERIR]`);
    case 'escritorio': return a.area < 6 ? [] : q(1, 'cantos', 'guarda de valores e atendimento ao público [CONFERIR]');
    case 'tecnica': return a.area < 3 ? [] : q(1, 'cantos', 'sala técnica (rack/central): acesso restrito');
    case 'externo': return !crit.cftvExterno || a.area < 8 || /LAJE|COBERTURA/.test(sem(a.nome)) ? [] : [
      ...q(nq(Math.ceil(a.area / 150), 1, 8), 'cantos', `área externa/aberta: perímetro e acesso — 1 câmera a cada ~150 m²${dens} [CONFERIR]`, true),
      ...(a.area >= 600 ? ptz(`área externa de ${r2(a.area)} m²: PTZ no pátio/estacionamento [CONFERIR]`) : [])];
    case 'deposito': return /RESTRITO|VALOR|COFRE/.test(sem(a.nome)) || a.area >= 20 ? q(1, 'cantos', 'depósito restrito/grande: proteção patrimonial [CONFERIR]') : [];
    default: return [];
  }
}

// Cabeamento estruturado (NBR 14565): no mínimo 2 tomadas por área de trabalho de 10 m² no escritório (6.7.7.1) — o
// engenheiro pode pedir 3 ou 4; fora dele, o mínimo de uso (critério [CONFERIR]); AP (Wi-Fi) nas circulações e
// espaços de reunião
const AREA_TRABALHO_M2 = 10;
function regrasRede(a, { crit }) {
  const pt = (n, motivo) => (n > 0 ? [{ simbolo: 'HM-CAB-PONTO-REDE', n, regra: 'perimetro', rotulo: `Ponto de telecomunicações RJ-45 Cat6 — ${a.nome}`, motivo }] : []);
  const ap = (n, motivo) => (n > 0 ? [{ simbolo: 'HM-CAB-AP', n, regra: 'grade', rotulo: `Ponto de acesso Wi-Fi (AP) — ${a.nome}`, motivo }] : []);
  const k = crit.redePor10m2;
  switch (a.tipo) {
    case 'escritorio': return pt(Math.min(8 * k, Math.max(2, k * Math.ceil(a.area / AREA_TRABALHO_M2))), `escritório: ${k} tomadas por área de trabalho de ${AREA_TRABALHO_M2} m² (NBR 14565 6.7.7.1: no mínimo 2)${k > 2 ? ' — critério escolhido' : ''}`);
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
  for (let i = 0; i < pol.length; i++) { const q = maisPertoNoSegmento(p, [...pol[i], ...pol[(i + 1) % pol.length]]); d = Math.min(d, Math.hypot(p[0] - q[0], p[1] - q[1])); }
  return d;
}

// Detecção e alarme de incêndio (NBR 17240): detector pontual em todo ambiente fechado (fumaça; temperatura onde a
// fumaça é normal — cozinha, copa, churrasqueira), quantidade pela grade em que nenhum ponto do teto fica a mais do
// raio da norma (5.4.1.4, o mesmo cálculo da skill de incêndio); fora: sanitário, área aberta e poço/shaft. Com a
// cobertura "rotas" (escolha do engenheiro), só rotas de fuga e áreas de risco — quem diz onde a detecção é exigida é
// a IT do Corpo de Bombeiros para a ocupação [CONFERIR].
const SO_ROTAS = new Set(['circulacao', 'escada', 'tecnica', 'deposito', 'cozinha']);
function regrasIncendio(a, { crit, pd }) {
  if (['sanitario', 'externo', 'poco'].includes(a.tipo)) return [];
  if (crit.incendio === 'rotas' && !SO_ROTAS.has(a.tipo)) return [];
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
    motivo: `${temp ? 'cozinha/copa: fumaça normal no uso — detector de temperatura' : 'ambiente fechado: detector de fumaça'}; raio de ${br(r)} m (NBR 17240 5.4.1)${crit.incendio === 'rotas' ? ' — cobertura só de rotas de fuga e áreas de risco (escolhida) [CONFERIR]' : ''}${a.tipo === 'circulacao' ? ' — circulação aberta para o exterior dispensa [CONFERIR]' : ''}${a.tipo === 'assembleia' && pd > 8 ? ` — pé-direito de ${br(pd)} m: acima de 8 m pede detector linear/aspiração (5.4.1.1) [CONFERIR]` : ''}`,
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

// Telefonia/interfonia (práticas Telebrás, NBR 14565 para os ramais IP): ramal no escritório/atendimento (um a cada
// ~20 m² de posto de trabalho — critério [CONFERIR]) e o interfone da residência; o porteiro eletrônico vai na entrada
function regrasTelefonia(a) {
  const tel = (n, motivo) => (n > 0 ? [{ simbolo: 'HM-TEL-PONTO', n, regra: 'perimetro', rotulo: `Ponto de telefone/ramal — ${a.nome}`, motivo }] : []);
  if (a.residencial) return a.tipo === 'estar' ? tel(1, 'residência: interfone/ramal no estar [CONFERIR]') : [];
  if (a.tipo === 'escritorio') return a.area < 4 ? [] : tel(Math.max(1, Math.ceil(a.area / 20)), 'escritório/atendimento: 1 ramal a cada ~20 m² de posto de trabalho [CONFERIR]');
  return [];
}

// Antena coletiva/TV (IEC/EN 60728): tomada de TV no estar e nos dormitórios da residência, na sala de reunião e no
// espaço de reunião grande (telão) — critério [CONFERIR]
function regrasAntena(a) {
  const tv = (motivo) => [{ simbolo: 'HM-ANT-PONTO', n: 1, regra: 'perimetro', rotulo: `Tomada de TV (coaxial) — ${a.nome}`, motivo }];
  if (a.tipo === 'estar' || (a.tipo === 'dormitorio' && a.residencial !== false)) return tv(`residência: TV no ${ROTULO_TIPO[a.tipo]} [CONFERIR]`);
  if (a.tipo === 'assembleia' && a.area >= 100) return tv('espaço de reunião: TV/telão [CONFERIR]');
  if (a.tipo === 'escritorio' && /REUNI/.test(sem(a.nome))) return tv('sala de reunião: TV [CONFERIR]');
  return [];
}

// Elétrica e iluminação: pontos pelo cálculo da skill (NBR 5410 9.5.2; método dos lúmens da NBR ISO/CIE 8995-1)
const MOTIVO_MOTOR = {
  'HM-ELE-TOMADA-BAIXA': ['Tomada de uso geral (TUG) h=0,30 m', 'NBR 5410 9.5.2.2: quantidade mínima pelo perímetro/área e uso do ambiente'],
  'HM-ELE-TOMADA-MEDIA': ['Tomada de uso geral (TUG) h=1,10 m', 'NBR 5410 9.5.2.2: bancada/uso do ambiente'],
  'HM-ELE-TOMADA-ALTA': ['Tomada alta h=2,20 m', 'NBR 5410 9.5.2.2: uso do ambiente'],
  'HM-ELE-TUE': ['Tomada de uso específico (TUE)', 'equipamento com circuito próprio (NBR 5410 9.5.2.3)'],
  'HM-ELE-PONTO-LUZ': ['Ponto de luz no teto', 'NBR 5410 9.5.2.1: ao menos um ponto de luz no teto por ambiente, potência pela área'],
  'HM-ELE-INTERRUPTOR': ['Interruptor h=1,10 m', 'comando do ponto de luz junto da porta'],
  'HM-ILU-LUMINARIA': ['Luminária LED (painel 60 × 60 de referência)', 'iluminância da atividade (NBR ISO/CIE 8995-1) pelo método dos lúmens [CONFERIR luminária]'],
  'HM-ILU-COMANDO': ['Comando de iluminação h=1,10 m', 'comando junto da porta (interruptor/cena)'],
  'HM-ILU-SENSOR': ['Sensor de presença', 'automação da iluminação em área de passagem'],
};
const ALTURA_MOTOR = { 'HM-ELE-TOMADA-BAIXA': 0.3, 'HM-ELE-TOMADA-MEDIA': 1.1, 'HM-ELE-TOMADA-ALTA': 2.2, 'HM-ELE-TUE': 0.3, 'HM-ELE-INTERRUPTOR': 1.1, 'HM-ILU-COMANDO': 1.1 };

const DISCIPLINAS = {
  cftv: { regras: regrasCftv, rotulo: 'CFTV', centro: 'HM-CAB-RACK', rotuloCentro: 'Rack / NVR (gravador) e switch PoE', grupo: 'telecom', cabo: 'Cabo U/UTP Cat6 LSZH (câmera → switch PoE)', laco: false },
  rede: { regras: regrasRede, rotulo: 'Cabeamento estruturado', centro: 'HM-CAB-RACK', rotuloCentro: 'Rack / distribuidor (patch panel e switch)', grupo: 'telecom', cabo: 'Cabo U/UTP Cat6 LSZH (ponto → patch panel)', laco: false },
  incendio: { regras: regrasIncendio, rotulo: 'Detecção e alarme de incêndio', centro: 'HM-INC-CENTRAL', rotuloCentro: 'Central de alarme de incêndio endereçável', grupo: 'incendio', cabo: 'Cabo blindado 2 × 1,5 mm² anti-chama (laço classe A)', laco: true },
  alarme: { regras: regrasAlarme, rotulo: 'Alarme de intrusão', centro: 'HM-ALM-CENTRAL', rotuloCentro: 'Central de alarme (com bateria e comunicador)', grupo: 'alarme', cabo: 'Cabo de alarme 4 vias 26 AWG (sensor → central)', laco: false },
  controle_acesso: { regras: () => [], rotulo: 'Controle de acesso', centro: 'HM-ACE-CONTROLADORA', rotuloCentro: 'Controladora de acesso (com fonte e bateria)', grupo: 'acesso', cabo: 'Cabo multivias 4 × 24 AWG + 2 × 1,0 mm² (leitor/fechadura/botoeira → controladora)', laco: false },
  telefonia: { regras: regrasTelefonia, rotulo: 'Telefonia / interfonia', centro: 'HM-TEL-DG', rotuloCentro: 'Central telefônica / DG (blocos IDC-110)', grupo: 'telefonia', cabo: 'Cabo telefônico CCI-50 2 pares (ramal → DG)', laco: false },
  antena: { regras: regrasAntena, rotulo: 'Antena coletiva / TV', centro: 'HM-ANT-PARABOLICA', rotuloCentro: 'Antena UHF e amplificador (headend)', grupo: 'antena', cabo: 'Cabo coaxial RG-6 75 Ω (tomada → derivador/headend)', laco: false, centroNoTopo: true },
  eletrica: { motor: 'eletrica', rotulo: 'Elétrica predial', centro: 'HM-ELE-QUADRO', rotuloCentro: 'Quadro de distribuição (QD)', grupo: 'eletrica', porPavimento: true },
  iluminacao: { motor: 'iluminacao', rotulo: 'Iluminação', centro: 'HM-ELE-QUADRO', rotuloCentro: 'Quadro de distribuição (QD)', grupo: 'eletrica', porPavimento: true },
  spda: { especial: true, rotulo: 'SPDA (proteção contra descargas atmosféricas)', grupo: 'spda' },
};
const ORDEM_PROJETO = ['cftv', 'rede', 'telefonia', 'antena', 'controle_acesso', 'alarme', 'incendio', 'eletrica', 'iluminacao', 'spda'];
const APELIDOS = { cabeamento: 'rede', telecom: 'rede', deteccao: 'incendio', intrusao: 'alarme', 'controle-acesso': 'controle_acesso', acesso: 'controle_acesso', interfonia: 'telefonia', tv: 'antena', 'para-raios': 'spda' };
// cada grupo num trecho da parede da sala do equipamento central (não caem no mesmo ponto)
const FASE_CENTRO = { telecom: 0.15, incendio: 0.4, telefonia: 0.55, alarme: 0.65, acesso: 0.85, antena: 0.3, eletrica: 0.5 };

// ── 3) Posição dos componentes na sala ───────────────────────────────────
function posicoes(pol, n, regra) {
  if (!n) return [];
  if (regra === 'centro') return [P.centro(pol)].slice(0, n);
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

// ── 4) Infraestrutura ────────────────────────────────────────────────────
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
// distâncias na árvore a partir do nó 0 (a raiz: prumada ou o equipamento central); comp(i, j) = comprimento da aresta
function distanciasNaArvore(nos, arestas, raiz = 0, comp = (i, j) => manhattan(nos[i], nos[j])) {
  const viz = nos.map(() => []);
  for (const [i, j] of arestas) { const d = comp(i, j); viz[i].push([j, d]); viz[j].push([i, d]); }
  const D = nos.map(() => Infinity);
  D[raiz] = 0;
  const fila = [raiz];
  while (fila.length) { const i = fila.shift(); for (const [j, d] of viz[i]) if (D[j] === Infinity) { D[j] = D[i] + d; fila.push(j); } }
  return D;
}

// Roteamento (2.46: "traçado que passa pelas portas e desvia das paredes"): o pavimento vira uma grade (0,25 m; 0,5 m
// em planta grande); dentro de sala e no vão de porta o passo custa 1, atravessar parede custa PAREDE (≈ 1,5 m de volta
// numa parede de 15 cm) — o caminho vai pela porta quando a volta é curta e fura a parede acima do forro quando não é
// (com 24, o cabo dava a volta no prédio nas salas sem porta lida e passava de 150 m). Passos só em X e em Y, como o
// eletroduto corre. Sem grade (planta enorme), o "L" de antes.
const PAREDE = 6;
const MAX_CELULAS = 1.5e6;
function malhaDoPavimento(ambs, portas) {
  if (!ambs.length) return null;
  const cx = ambs.flatMap(a => a.pol.map(p => p[0])), cy = ambs.flatMap(a => a.pol.map(p => p[1]));
  const x0 = Math.min(...cx) - 1, y0 = Math.min(...cy) - 1, x1 = Math.max(...cx) + 1, y1 = Math.max(...cy) + 1;
  let cel = 0.25;
  if (((x1 - x0) / cel) * ((y1 - y0) / cel) > MAX_CELULAS) cel = 0.5;
  const W = Math.ceil((x1 - x0) / cel), H = Math.ceil((y1 - y0) / cel);
  if (W * H > MAX_CELULAS) return null;
  const custo = new Uint8Array(W * H).fill(PAREDE);
  for (const a of ambs) {
    const [, by0, , by1] = caixaDe(a.pol);
    const j0 = Math.max(0, Math.floor((by0 - y0) / cel)), j1 = Math.min(H - 1, Math.ceil((by1 - y0) / cel));
    for (let j = j0; j <= j1; j++) {
      const y = y0 + (j + 0.5) * cel;
      const xs = [];
      for (let k = 0; k < a.pol.length; k++) {
        const [ax, ay] = a.pol[k], [bx, by] = a.pol[(k + 1) % a.pol.length];
        if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.max(0, Math.ceil((xs[k] - x0) / cel - 0.5)), i1 = Math.min(W - 1, Math.floor((xs[k + 1] - x0) / cel - 0.5));
        for (let i = i0; i <= i1; i++) custo[j * W + i] = 1;
      }
    }
  }
  for (const p of portas || []) {
    if (!p?.meio) continue;
    const r = Math.max(0.5, (Number(p.largura_m) || 0.8) / 2 + 0.1);
    const i0 = Math.floor((p.meio[0] - r - x0) / cel), i1 = Math.ceil((p.meio[0] + r - x0) / cel);
    const j0 = Math.floor((p.meio[1] - r - y0) / cel), j1 = Math.ceil((p.meio[1] + r - y0) / cel);
    for (let j = Math.max(0, j0); j <= Math.min(H - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(W - 1, i1); i++) {
      if (Math.hypot(x0 + (i + 0.5) * cel - p.meio[0], y0 + (j + 0.5) * cel - p.meio[1]) <= r) custo[j * W + i] = 1;
    }
  }
  return { cel, x0, y0, W, H, custo, cache: new Map() };
}
// caminho a → b pela grade: { comp (m), pts: [[x, y]…] } — a polilinha começa em a e termina em b
function rota(m, a, b) {
  const L = () => {
    const pts = [a];
    if (Math.abs(a[0] - b[0]) > 0.01 && Math.abs(a[1] - b[1]) > 0.01) pts.push([b[0], a[1]]);
    pts.push(b);
    return { comp: manhattan(a, b), pts };
  };
  if (!m) return L();
  const chave = `${a[0].toFixed(2)},${a[1].toFixed(2)}>${b[0].toFixed(2)},${b[1].toFixed(2)}`;
  if (m.cache.has(chave)) return m.cache.get(chave);
  const { cel, x0, y0, W, H, custo } = m;
  const celula = (p) => [Math.min(W - 1, Math.max(0, Math.floor((p[0] - x0) / cel))), Math.min(H - 1, Math.max(0, Math.floor((p[1] - y0) / cel)))];
  const [ia, ja] = celula(a), [ib, jb] = celula(b);
  const ini = ja * W + ia, fim = jb * W + ib;
  let res;
  if (ini === fim) res = L();
  else {
    const g = new Float32Array(W * H).fill(Infinity);
    const de = new Int32Array(W * H).fill(-1);
    const heap = []; // [f, idx]
    const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const pai = (k - 1) >> 1; if (heap[pai][0] <= heap[k][0]) break; [heap[pai], heap[k]] = [heap[k], heap[pai]]; k = pai; } };
    const pop = () => { const top = heap[0]; const ult = heap.pop(); if (heap.length) { heap[0] = ult; let k = 0; for (;;) { const e = 2 * k + 1, d = e + 1; let menor = k; if (e < heap.length && heap[e][0] < heap[menor][0]) menor = e; if (d < heap.length && heap[d][0] < heap[menor][0]) menor = d; if (menor === k) break; [heap[menor], heap[k]] = [heap[k], heap[menor]]; k = menor; } } return top; };
    g[ini] = 0; push(Math.abs(ia - ib) + Math.abs(ja - jb), ini);
    let n = 0;
    while (heap.length && n++ < 400000) {
      const [, i] = pop();
      if (i === fim) break;
      const ix = i % W, jy = (i - ix) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = ix + dx, ny = jy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx;
        // virar custa um pouco (o caminho prefere trechos retos, como o eletroduto)
        const virou = de[i] >= 0 && (de[i] % W !== ix ? dy !== 0 : dx !== 0) ? 0.3 : 0;
        const ng = g[i] + custo[k] + virou;
        if (ng < g[k]) { g[k] = ng; de[k] = i; push(ng + Math.abs(nx - ib) + Math.abs(ny - jb), k); }
      }
    }
    if (de[fim] < 0) res = L();
    else {
      const celulas = [];
      for (let i = fim; i !== -1; i = de[i]) celulas.push(i);
      celulas.reverse();
      const ctr = (i) => [x0 + ((i % W) + 0.5) * cel, y0 + (Math.floor(i / W) + 0.5) * cel];
      // simplifica: só os cantos do caminho
      const pts = [a];
      const c0 = ctr(celulas[0]);
      if (Math.abs(c0[0] - a[0]) > 0.01 && Math.abs(c0[1] - a[1]) > 0.01) pts.push([c0[0], a[1]]);
      for (let k = 0; k < celulas.length; k++) {
        const p = ctr(celulas[k]);
        const ant = k > 0 ? ctr(celulas[k - 1]) : null, prox = k + 1 < celulas.length ? ctr(celulas[k + 1]) : null;
        if (ant && prox && ((ant[0] === p[0] && prox[0] === p[0]) || (ant[1] === p[1] && prox[1] === p[1]))) continue;
        pts.push(p);
      }
      const cf = ctr(celulas[celulas.length - 1]);
      if (Math.abs(cf[0] - b[0]) > 0.01 && Math.abs(cf[1] - b[1]) > 0.01) pts.push([b[0], cf[1]]);
      pts.push(b);
      let comp = 0;
      for (let k = 1; k < pts.length; k++) comp += manhattan(pts[k - 1], pts[k]);
      res = { comp: Math.max(comp, manhattan(a, b)), pts };
    }
  }
  m.cache.set(chave, res);
  return res;
}
const segmentosDe = (pts) => pts.slice(1).map((q, k) => [pts[k][0], pts[k][1], q[0], q[1]]).filter(s => Math.abs(s[0] - s[2]) + Math.abs(s[1] - s[3]) > 0.01);

// ── 5) O projeto ─────────────────────────────────────────────────────────
// opcoes: { peDireito (m, padrão 3,0), alturaEntrePisos (m, padrão 3,2), folga (fração, 0,10), criterios }
function projetarDisciplinas(arquitetura, disciplinas0 = [], opcoes = {}) {
  const crit = criteriosDe(opcoes.criterios || {});
  const peDireito0 = crit.peDireito || (Number(opcoes.peDireito) > 0 ? Number(opcoes.peDireito) : 3.0);
  const entrePisos = Number(opcoes.alturaEntrePisos) > 0 ? Number(opcoes.alturaEntrePisos) : 3.2;
  const folga = Number.isFinite(opcoes.folga) ? opcoes.folga : 0.10;
  // ordem de projeto (2.46): telecom e segurança primeiro, energia depois — a energia é roteada desviando das células
  // da telecom (separação física) e o SPDA por último
  const disciplinas = [...new Set((disciplinas0 || []).map(d => APELIDOS[d] || d).filter(d => DISCIPLINAS[d]))].sort((a, b) => ORDEM_PROJETO.indexOf(a) - ORDEM_PROJETO.indexOf(b));
  const vazio = { pontos: [], trechos: [], cabos: [], metragens: [], resumo: [], criterios: [], avisos: [], pavimentos: [], ambientes: [], pavimentosInfo: [], criteriosUsados: crit };
  if (!disciplinas.length) return vazio;

  // ambientes válidos: com nome (o "Ambiente N" sem nome não recebe projeto: não se sabe o uso), polígono e área; os
  // que o engenheiro tirou do projeto ficam de fora
  const fora = new Set(crit.excluir.map(sem));
  const todos = (arquitetura.ambientes || []).filter(a => Array.isArray(a.poligono) && a.poligono.length >= 3 && a.area_m2 >= 1.5)
    .map(a => ({ nome: a.nome, area: Number(a.area_projeto_m2) || a.area_m2, pol: a.poligono, c: a.centro || centroide(a.poligono), pavimento: a.pavimento || 'Pavimento único', semNome: !!a.semNome, divergente: !!a.areaDivergente, tipo: tipoDoAmbiente(a.nome), orig: a }));
  const semNome = todos.filter(a => a.semNome);
  const excluidos = todos.filter(a => !a.semNome && (fora.has(sem(a.nome)) || fora.has(sem(`${a.nome} (${a.pavimento})`))));
  const ambs = todos.filter(a => !a.semNome && !excluidos.includes(a));
  if (!ambs.length) return { ...vazio, avisos: ['Nenhum ambiente com nome na arquitetura: o projeto não sabe o uso de cada sala — confira a planta (nomes e paredes) e analise de novo.'] };
  // pavimentos na ordem do prédio (a lista da arquitetura) — a cobertura/telhado não recebe distribuição interna
  const ordem = (arquitetura.pavimentos || []).map(p => p.nome);
  const nomesPav = [...new Set(ambs.map(a => a.pavimento))].sort((a, b) => (ordem.indexOf(a) === -1 ? 1e3 : ordem.indexOf(a)) - (ordem.indexOf(b) === -1 ? 1e3 : ordem.indexOf(b)));
  for (const nome of nomesPav) {
    const doPav = ambs.filter(a => a.pavimento === nome);
    for (const a of doPav) a.residencial = ehResidencial(a, doPav);
  }
  // nível, pé-direito e alinhamento de cada pavimento (./pavimentos.js, lidos das cotas e das paredes)
  const infoPav = new Map((arquitetura.pavimentos || []).map(p => [p.nome, p]));
  const pdDe = (nome) => crit.peDireito || infoPav.get(nome)?.pe_direito_m || peDireito0;
  const desl = (nome) => infoPav.get(nome)?.deslocamento || [0, 0];
  const alinhado = (nome, [x, y]) => [x + desl(nome)[0], y + desl(nome)[1]];
  const iPav = (n) => Math.max(0, nomesPav.indexOf(n));
  const nivelDe = (n) => infoPav.get(n)?.nivel_m;
  const subida = (a, b) => {
    if (a === b) return 0;
    const na = nivelDe(a), nb = nivelDe(b);
    return Number.isFinite(na) && Number.isFinite(nb) ? Math.abs(na - nb) : Math.abs(iPav(a) - iPav(b)) * entrePisos;
  };
  const alturaCamera = (nome) => r2(Math.min(3.5, Math.max(2.4, pdDe(nome) - 0.3)));

  const portas = arquitetura.portas || [];
  const fachada = {};
  for (const nome of nomesPav) fachada[nome] = contornoConvexo(ambs.filter(a => a.pavimento === nome).flatMap(a => a.pol));
  const naFachada = (porta, nome) => (fachada[nome] || []).length >= 3 && distanciaAoContorno(porta.meio, fachada[nome]) <= 2;
  const pavDaPorta = (p) => ambs.find(a => (p.ambientes || []).includes(a.nome) && dentro(p.meio, a.pol))?.pavimento
    || ambs.filter(a => (p.ambientes || []).includes(a.nome)).sort((x, y) => distanciaAoContorno(p.meio, x.pol) - distanciaAoContorno(p.meio, y.pol))[0]?.pavimento;

  // sala do equipamento central (rack / central): técnica (CPD, sala técnica) > secretaria/escritório > a maior sala;
  // no pavimento de acesso (térreo) quando houver empate
  const prioridade = (a) => (a.tipo === 'tecnica' ? (/CPD|RACK|TELECOM|MONITORAMENTO|SERVIDOR/.test(sem(a.nome)) ? 0 : 1) : a.tipo === 'escritorio' ? (/SECRETAR|ADMIN/.test(sem(a.nome)) ? 2 : 3) : 9);
  const ordemPav = (p) => { const i = ordem.indexOf(p); return i === -1 ? 50 : Math.abs(i - Math.max(0, ordem.findIndex(n => /T[ÉE]RREO/i.test(n)))); };
  const candidatosCentro = ambs.filter(a => prioridade(a) < 9 && a.area >= 3).sort((x, y) => prioridade(x) - prioridade(y) || ordemPav(x.pavimento) - ordemPav(y.pavimento) || x.area - y.area);
  const salaCentro = candidatosCentro[0] || ambs.slice().sort((x, y) => y.area - x.area)[0];
  // (2.47) sala escolhida pelo engenheiro (crit.centros[chave] = { ambiente, pavimento? }); pavDoQd restringe ao pavimento
  const avisosEscolha = [];
  const salaEscolhida = (chave, pavDoQd = null) => {
    const e = crit.centros?.[chave];
    if (!e) return null;
    const pav = pavDoQd || e.pavimento || null;
    const achou = ambs.filter(a => sem(a.nome) === sem(e.ambiente) && (!pav || a.pavimento === pav)).sort((x, y) => y.area - x.area)[0] || null;
    if (!achou) avisosEscolha.push(`O local escolhido para ${chave.replace('|', ' do ')} ("${e.ambiente}"${pav ? `, ${pav}` : ''}) não existe nesta arquitetura — ficou o local calculado [CONFERIR].`);
    return achou;
  };
  // (2.49) sala do equipamento central pela regra aprendida: o ambiente do tipo ensinado (técnica no térreo antes)
  const usadas = new Map();
  const salaAprendida = (grupo) => {
    const r = crit.regras.find(x => x.modo === 'centro' && x.grupo === grupo);
    if (!r) return null;
    const sala = ambs.filter(a => a.tipo === r.tipo && a.area >= 2).sort((x, y) => ordemPav(x.pavimento) - ordemPav(y.pavimento) || prioridade(x) - prioridade(y) || y.area - x.area)[0] || null;
    if (sala) usadas.set(r, (usadas.get(r) || 0) + 1);
    return sala;
  };

  // prumada: a escada/shaft/poço que se repete na MESMA posição do prédio (pavimentos alinhados) em mais pavimentos;
  // num pavimento sem ela, a circulação maior (ou o centro) — e a diferença entra no cabo como desvio horizontal
  const candPr = {};
  for (const nome of nomesPav) {
    const doPav = ambs.filter(a => a.pavimento === nome);
    candPr[nome] = [...doPav.filter(a => a.tipo === 'poco' && /SHAFT|PRUMADA|TECNIC/.test(sem(a.nome))), ...doPav.filter(a => a.tipo === 'escada'), ...doPav.filter(a => a.tipo === 'poco')];
  }
  let ancora = null;
  for (const nome of nomesPav) for (const a of candPr[nome]) {
    const q = alinhado(nome, a.c);
    const n = nomesPav.filter(o => candPr[o].some(b => Math.hypot(...((r) => [r[0] - q[0], r[1] - q[1]])(alinhado(o, b.c))) <= 4)).length;
    if (!ancora || n > ancora.n) ancora = { n, q, nome: a.nome };
  }
  // sem escada/shaft que se repita: a prumada é UM ponto do prédio — o centro da maior circulação do pavimento do
  // equipamento central — e em cada pavimento, a sala que fica em cima/embaixo dele (ou a circulação mais perto)
  const deVolta = (nome, q) => [q[0] - desl(nome)[0], q[1] - desl(nome)[1]];
  let pontoPrumada = null;
  if (!ancora || ancora.n < 2) {
    const doCentral = ambs.filter(a => a.pavimento === salaCentro.pavimento);
    const base = doCentral.filter(a => a.tipo === 'circulacao').sort((x, y) => y.area - x.area)[0] || salaCentro;
    pontoPrumada = alinhado(salaCentro.pavimento, base.c);
  }
  const prumada = {};
  for (const nome of nomesPav) {
    const doPav = ambs.filter(a => a.pavimento === nome);
    const naAncora = ancora && ancora.n >= 2 && candPr[nome].find(b => Math.hypot(...((r) => [r[0] - ancora.q[0], r[1] - ancora.q[1]])(alinhado(nome, b.c))) <= 4);
    if (!naAncora && pontoPrumada) {
      const q = deVolta(nome, pontoPrumada);
      const sobre = doPav.find(a => dentro(q, a.pol) && !['sanitario', 'dormitorio'].includes(a.tipo));
      const perto = sobre || doPav.filter(a => ['circulacao', 'escada'].includes(a.tipo)).sort((x, y) => manhattan(x.c, q) - manhattan(y.c, q))[0];
      if (perto) { const c = sobre ? q : perto.c; prumada[nome] = { x: c[0], y: c[1], ambiente: perto.nome, alinhada: !!sobre }; continue; }
    }
    const shaft = naAncora || candPr[nome][0] || doPav.filter(a => a.tipo === 'circulacao').sort((x, y) => y.area - x.area)[0];
    const c = shaft ? shaft.c : [doPav.reduce((s, a) => s + a.c[0], 0) / doPav.length, doPav.reduce((s, a) => s + a.c[1], 0) / doPav.length];
    prumada[nome] = { x: c[0], y: c[1], ambiente: shaft?.nome || null, alinhada: !!naAncora };
  }
  // desvio horizontal entre as prumadas de dois pavimentos (no prédio): 0 quando a escada/shaft se repete
  const desvio = (a, b) => (a === b ? 0 : manhattan(alinhado(a, [prumada[a].x, prumada[a].y]), alinhado(b, [prumada[b].x, prumada[b].y])));

  // grade de roteamento de cada pavimento (salas + vãos de porta)
  const malhas = {};
  const malha = (nome) => {
    if (!(nome in malhas)) {
      const doPav = ambs.filter(a => a.pavimento === nome);
      const doPavTodos = todos.filter(a => a.pavimento === nome); // salas sem nome também são caminho
      malhas[nome] = malhaDoPavimento(doPavTodos.length ? doPavTodos : doPav, portas.filter(p => pavDaPorta(p) === nome));
    }
    return malhas[nome];
  };
  // energia × telecom: as células por onde a telecom já passa custam mais na grade da energia — o eletroduto de energia
  // corre na linha vizinha (25 cm), não junto da eletrocalha/eletroduto de telecom (NBR 14565; a análise acusaria)
  const celulasTelecom = new Set();
  const chaveCel = (x, y) => `${Math.floor(x / 0.25)},${Math.floor(y / 0.25)}`;
  const marcarTelecom = (segs) => {
    for (const sg of segs) {
      const n = Math.max(1, Math.ceil(manhattan([sg[0], sg[1]], [sg[2], sg[3]]) / 0.1));
      for (let k = 0; k <= n; k++) celulasTelecom.add(chaveCel(sg[0] + ((sg[2] - sg[0]) * k) / n, sg[1] + ((sg[3] - sg[1]) * k) / n));
    }
  };
  const malhasEnergia = {};
  const malhaDe = (nome, energia) => {
    if (!energia || !celulasTelecom.size) return malha(nome);
    if (!(nome in malhasEnergia)) {
      const m = malha(nome);
      if (!m) malhasEnergia[nome] = null;
      else {
        const custo = Uint8Array.from(m.custo);
        for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
          const k = j * m.W + i;
          if (custo[k] < PAREDE && celulasTelecom.has(chaveCel(m.x0 + (i + 0.5) * m.cel, m.y0 + (j + 0.5) * m.cel))) custo[k] = 3;
        }
        malhasEnergia[nome] = { ...m, custo, cache: new Map() };
      }
    }
    return malhasEnergia[nome];
  };

  const out = { ...vazio, pavimentos: nomesPav, criteriosUsados: crit,
    pavimentosInfo: nomesPav.map(n => ({ nome: n, nivel_m: nivelDe(n) ?? null, pe_direito_m: r2(pdDe(n)), pe_direito_lido: !crit.peDireito && !!infoPav.get(n)?.pe_direito_m, deslocamento: desl(n), metodo: infoPav.get(n)?.metodo || null })),
    ambientes: ambs.map(a => ({ nome: a.nome, pavimento: a.pavimento, tipo: a.tipo, rotuloTipo: ROTULO_TIPO[a.tipo], residencial: !!a.residencial, area_m2: r2(a.area) })) };
  const idx = { n: 0 };
  const novoId = (pref) => `${pref}${String(++idx.n).padStart(3, '0')}`;
  // compatibilização do próprio projeto (2.45; 2.46 com os afastamentos da compatibilização — utils/compatibilidadeEspacial):
  // detector a 0,5 m de luminária, câmera a 0,6 m de luminária e 0,3 m entre componentes de disciplinas diferentes
  // (+ 10 cm de folga). O componente anda para longe do outro, dentro da sala — o projeto não cria o conflito que a
  // análise acusaria (a câmera e o detector no mesmo ponto da grade, o QD em cima do rack de piso)
  const luz = (s) => /ILU-LUMINARIA|ELE-PONTO-LUZ/.test(s), det = (s) => /INC-DETECTOR/.test(s), cam = (s) => /CFTV-CAMERA/.test(s);
  const minimo = (p, o) => ((det(p.simbolo) && luz(o.simbolo)) || (luz(p.simbolo) && det(o.simbolo)) ? 0.6 : (cam(p.simbolo) && luz(o.simbolo)) || (luz(p.simbolo) && cam(o.simbolo)) ? 0.7 : 0.3);
  const afastar = (pt) => {
    const conflito = (x, y) => out.pontos.find(o => o !== pt && o.pavimento === pt.pavimento && o.disciplina !== pt.disciplina && Math.hypot(o.x - x, o.y - y) < minimo(pt, o));
    const perto = conflito(pt.x, pt.y);
    if (!perto) return;
    // a sala que CONTÉM o ponto (dois ambientes com o mesmo nome no pavimento: "CIRCULAÇÃO" × 2 na paróquia)
    const mesmos = ambs.filter(x => x.nome === pt.ambiente && x.pavimento === pt.pavimento);
    const a = mesmos.find(x => dentro([pt.x, pt.y], x.pol)) || mesmos.sort((x, y) => distanciaAoContorno([pt.x, pt.y], x.pol) - distanciaAoContorno([pt.x, pt.y], y.pol))[0];
    const dirs = [];
    if (Math.hypot(pt.x - perto.x, pt.y - perto.y) > 0.01) dirs.push([pt.x - perto.x, pt.y - perto.y]);
    if (a && Math.hypot(a.c[0] - pt.x, a.c[1] - pt.y) > 0.01) dirs.push([a.c[0] - pt.x, a.c[1] - pt.y]);
    dirs.push([1, 0], [0, 1], [-1, 0], [0, -1]);
    const passo = minimo(pt, perto) + 0.1;
    for (const k of [1, 1.6, 2.4]) for (const [vx, vy] of dirs) {
      const n = Math.hypot(vx, vy);
      const novo = [pt.x + (vx / n) * passo * k, pt.y + (vy / n) * passo * k];
      if (a && !dentro(novo, a.pol)) continue;
      if (conflito(novo[0], novo[1])) continue;
      pt.x = r2(novo[0]); pt.y = r2(novo[1]);
      return;
    }
  };
  const centrosPorGrupo = {};
  // o tronco é do GRUPO: CFTV e rede dividem a mesma eletrocalha (desenhada e contada uma vez)
  const troncoDoGrupo = new Set();
  // entrada principal: porta da fachada de circulação/escritório no pavimento do equipamento central
  const portaDe = (p) => ({ p, a: ambs.find(x => (p.ambientes || []).includes(x.nome)) });
  const portasFachada = portas.filter(p => p.externa && p.meio).map(portaDe).filter(e => e.a && !e.a.residencial && naFachada(e.p, e.a.pavimento));
  const entradaPrincipal = portasFachada.find(e => e.a.pavimento === salaCentro.pavimento && ['circulacao', 'escritorio'].includes(e.a.tipo)) || portasFachada.find(e => e.a.pavimento === salaCentro.pavimento) || null;
  // lado de dentro de uma porta em relação à sala a
  const ladoDe = (p, a, d = 0.35) => {
    const n = p.n || [0, 1];
    const um = [p.meio[0] + n[0] * d, p.meio[1] + n[1] * d], outro = [p.meio[0] - n[0] * d, p.meio[1] - n[1] * d];
    return dentro(um, a.pol) ? { dentro: um, fora: outro, t: [-n[1], n[0]] } : { dentro: outro, fora: um, t: [-n[1], n[0]] };
  };

  const motores = {}; // disciplina → { pontos por pavimento, circuitos, quadros }
  for (const disc of disciplinas) {
    const D = DISCIPLINAS[disc];
    if (D.especial) continue;
    const ctx = { crit };
    const pontosDisc = [];

    // ── equipamento central ──
    // por pavimento (QD de cada pavimento: elétrica/iluminação) ou um só por grupo (rack, central)
    const centraisPav = {};
    let central = centrosPorGrupo[D.grupo];
    if (!D.porPavimento && !central) {
      let pos, onde, pav;
      if (D.centroNoTopo) {
        // antena: no pavimento mais alto com salas, junto da prumada (o cabo desce pela prumada)
        pav = nomesPav[nomesPav.length - 1];
        pos = { x: prumada[pav].x + 0.6, y: prumada[pav].y };
        onde = { nome: prumada[pav].ambiente || pav, pavimento: pav, motivo: `antena e amplificador no ${pav} (o mais alto com salas), junto da prumada "${prumada[pav].ambiente || '—'}": cabo de descida mais curto — a antena vai na cobertura [CONFERIR]` };
      } else {
        // (2.47) sala escolhida pelo engenheiro para a estrutura do grupo, se existir
        const escolhida = salaEscolhida(D.grupo);
        const aprendida = !escolhida && salaAprendida(D.grupo);
        const sala = escolhida || aprendida || salaCentro;
        const [p0] = P.noPerimetro(sala.pol, 1, { recuo: 0.2, fase: FASE_CENTRO[D.grupo] ?? 0.5 });
        pos = p0 || { x: sala.c[0], y: sala.c[1] };
        pav = sala.pavimento;
        onde = { nome: sala.nome, pavimento: pav, motivo: escolhida ? `equipamento central em "${sala.nome}" (${pav}): local escolhido pelo engenheiro` : aprendida ? `equipamento central em "${sala.nome}" (${pav}): regra aprendida das instruções do engenheiro (aprovada) — ${ROTULO_TIPO[sala.tipo]}` : `equipamento central na ${ROTULO_TIPO[sala.tipo]} "${sala.nome}" (${pav}): ${sala.tipo === 'tecnica' ? 'sala técnica de acesso restrito' : 'local com supervisão'} [CONFERIR]` };
      }
      central = { id: novoId(D.grupo === 'telecom' ? 'RK' : D.grupo === 'incendio' ? 'CI' : D.grupo === 'alarme' ? 'CA' : D.grupo.slice(0, 2).toUpperCase()), x: pos.x, y: pos.y, pavimento: pav, ambiente: onde.nome, simbolo: D.centro, rotulo: D.rotuloCentro };
      centrosPorGrupo[D.grupo] = central;
      out.pontos.push({ x: r2(central.x), y: r2(central.y), simbolo: D.centro, disciplina: disc, rotulo: `${D.rotuloCentro} — ${onde.nome}`, ambiente: onde.nome, pavimento: pav, motivo: onde.motivo, id: central.id, central: true });
    }

    // ── componentes ──
    if (D.motor) {
      // elétrica / iluminação: o cálculo da skill em cada pavimento (nomes únicos por pavimento)
      motores[disc] = { circuitos: new Map() };
      for (const nome of nomesPav) {
        const doPav = ambs.filter(a => a.pavimento === nome);
        const arqPav = {
          ambientes: doPav.map(a => ({ ...a.orig, nome: a.nome, poligono: a.pol, area_m2: a.area, perimetro_m: a.orig.perimetro_m || perimetroDe(a.pol), centro: a.c })),
          portas: portas.filter(p => pavDaPorta(p) === nome).map(p => ({ ...p, n: p.n || [0, 1], largura_m: p.largura_m || 0.8, id: p.id || null })),
        };
        let r;
        try { r = pontosDasDisciplinas(arqPav, [D.motor], { peDireito: pdDe(nome) }); } catch (e) { out.avisos.push(`${D.rotulo} — ${nome}: o cálculo da skill não rodou (${e.message}) [CONFERIR].`); continue; }
        // com iluminação pedida, o ponto de luz/interruptor da elétrica sai (a iluminação projeta as luminárias)
        const dispositivos = r.dispositivos.filter(d => !(disc === 'eletrica' && disciplinas.includes('iluminacao') && /PONTO-LUZ|INTERRUPTOR/.test(d.simbolo)));
        const qd = dispositivos.find(d => d.simbolo === 'HM-ELE-QUADRO');
        // QD do pavimento (um por pavimento para elétrica e iluminação juntas)
        const chaveQd = `${D.grupo}|${nome}`;
        if (!centrosPorGrupo[chaveQd]) {
          const pr = prumada[nome];
          // QD fora de sanitário, dormitório, área externa e poço (o cálculo da skill pode pô-lo no banheiro): vai para a
          // sala técnica/depósito/circulação do pavimento, na parede
          const ruim = (n) => { const a = doPav.find(x => x.nome === n); return !a || ['sanitario', 'dormitorio', 'externo', 'poco', 'escada'].includes(a.tipo); };
          let pos = qd ? { x: qd.x, y: qd.y } : { x: pr.x + 0.6, y: pr.y };
          let amb = qd?.ambiente || pr.ambiente || nome;
          let mudou = false;
          // (2.47) sala do QD escolhida pelo engenheiro para este pavimento
          const escolhidaQd = salaEscolhida(`${D.grupo}|${nome}`, nome);
          if (escolhidaQd) {
            const [p0] = P.noPerimetro(escolhidaQd.pol, 1, { recuo: 0.15, fase: 0.6 });
            pos = p0 || { x: escolhidaQd.c[0], y: escolhidaQd.c[1] }; amb = escolhidaQd.nome; mudou = 'escolha';
          } else if (ruim(amb)) {
            const boa = [...doPav.filter(a => a.tipo === 'tecnica'), ...doPav.filter(a => a.tipo === 'deposito'), ...doPav.filter(a => a.tipo === 'circulacao').sort((x, y) => y.area - x.area), ...doPav.filter(a => !ruim(a.nome))][0];
            if (boa) { const [p0] = P.noPerimetro(boa.pol, 1, { recuo: 0.15, fase: 0.6 }); pos = p0 || { x: boa.c[0], y: boa.c[1] }; mudou = amb; amb = boa.nome; }
          }
          const c = { id: novoId('QD'), x: pos.x, y: pos.y, pavimento: nome, ambiente: amb, simbolo: 'HM-ELE-QUADRO', rotulo: 'Quadro de distribuição (QD)' };
          centrosPorGrupo[chaveQd] = c;
          const q = { x: r2(c.x), y: r2(c.y), simbolo: 'HM-ELE-QUADRO', disciplina: disc, rotulo: `Quadro de distribuição (QD) — ${amb}`, ambiente: amb, pavimento: nome, motivo: mudou === 'escolha' ? `QD do ${nome} em "${amb}": local escolhido pelo engenheiro` : `QD do ${nome}: circuitos dos ambientes do pavimento (${mudou ? `tirado de "${mudou}" — quadro não vai em sanitário/dormitório` : 'posição pelo cálculo da skill elétrica'}) [CONFERIR]`, id: c.id, central: true, altura_m: 1.5 };
          afastar(q); c.x = q.x; c.y = q.y;
          out.pontos.push(q);
        }
        centraisPav[nome] = centrosPorGrupo[chaveQd];
        for (const c of r.instalacao?.circuitos || []) motores[disc].circuitos.set(`${nome}|${c.id}`, c);
        for (const d of dispositivos) {
          if (d.simbolo === 'HM-ELE-QUADRO') continue;
          const [rot, mot] = MOTIVO_MOTOR[d.simbolo] || [d.simbolo, 'cálculo da skill'];
          const ambNome = d.ambiente;
          const amb = doPav.find(a => a.nome === ambNome);
          pontosDisc.push({ x: r2(d.x), y: r2(d.y), simbolo: d.simbolo, disciplina: disc, rotulo: `${rot} — ${ambNome}`, ambiente: ambNome, pavimento: nome,
            motivo: amb ? `${mot} (${ROTULO_TIPO[amb.tipo]}, ${br(amb.area)} m²)` : mot, id: novoId(d.simbolo.split('-').slice(-1)[0].slice(0, 3)),
            circuito: d.atributos?.CIRCUITO || null, ...(ALTURA_MOTOR[d.simbolo] != null ? { altura_m: ALTURA_MOTOR[d.simbolo] } : {}) });
        }
      }
      out.criterios.push(`${D.rotulo}: pontos e circuitos pelo cálculo da skill (${disc === 'eletrica' ? 'NBR 5410 9.5.2 — tomadas pelo perímetro/uso e ponto de luz pela área; sem TUEs (chuveiro, ar-condicionado): inclua no formulário' : 'método dos lúmens com painel LED 4.000 lm de referência e a iluminância da atividade (NBR ISO/CIE 8995-1)'}) [CONFERIR].`);
    } else {
      for (const a of ambs) {
        for (const regra of ajustarPelasRegras(D.regras(a, { ...ctx, pd: pdDe(a.pavimento) }), a, disc, crit.regras, usadas)) {
          const pts = posicoes(a.pol, regra.n, regra.regra).filter(p => p && Number.isFinite(p.x));
          for (const p of pts) {
            const pt = { x: r2(p.x), y: r2(p.y), simbolo: regra.simbolo, disciplina: disc, rotulo: regra.rotulo, ambiente: a.nome, pavimento: a.pavimento, motivo: regra.motivo, id: novoId(regra.simbolo.split('-').slice(-1)[0].slice(0, 3)) };
            if (regra.simbolo === 'HM-CFTV-CAMERA') pt.altura_m = alturaCamera(a.pavimento);
            pontosDisc.push(pt);
          }
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
        const cand = [];
        for (const a of doPav.filter(x => x.tipo === 'escada')) { const [p] = P.noPerimetro(a.pol, 1, { recuo: 0.2, fase: 0.5 }); if (p) cand.push({ ...p, ambiente: a.nome, motivo: 'junto da escada (saída do pavimento)' }); }
        for (const pt of portas.filter(p => p.externa && naFachada(p, nome) && doPav.some(a => (p.ambientes || []).includes(a.nome)))) {
          const a = doPav.find(x => (pt.ambientes || []).includes(x.nome));
          const dentroDaSala = [pt.meio[0] + (pt.n?.[0] || 0) * 0.4, pt.meio[1] + (pt.n?.[1] || 0) * 0.4];
          cand.push({ x: dentro(dentroDaSala, a.pol) ? dentroDaSala[0] : pt.meio[0], y: dentro(dentroDaSala, a.pol) ? dentroDaSala[1] : pt.meio[1], ambiente: a.nome, motivo: 'junto da porta de saída' });
        }
        for (const a of doPav.filter(x => x.tipo === 'circulacao')) cand.push({ x: a.c[0], y: a.c[1], ambiente: a.nome, motivo: 'na circulação' });
        if (!cand.length) { const a = doPav.slice().sort((x, y) => y.area - x.area)[0]; cand.push({ x: a.c[0], y: a.c[1], ambiente: a.nome, motivo: 'no maior ambiente (sem escada/saída lida) [CONFERIR]' }); }
        const alvos = doPav.map(a => a.c);
        const coberto = (c, p) => Math.hypot(c[0] - p.x, c[1] - p.y) * 1.3 <= INC_CAMINHAMENTO;
        const escolhidos = [];
        let falta = alvos.slice();
        while (falta.length && escolhidos.length < 20) {
          const melhor = cand.reduce((m, c) => { const n = falta.filter(f => coberto(f, c)).length; return !m || n > m.n || (n === m.n && escolhidos.length === 0 && c.motivo.startsWith('junto')) ? { c, n } : m; }, null);
          if (!melhor || !melhor.n) break;
          escolhidos.push(melhor.c);
          falta = falta.filter(f => !coberto(f, melhor.c));
        }
        if (falta.length) out.avisos.push(`Incêndio — ${nome}: ${falta.length} ambiente(s) a mais de 30 m de caminhamento do acionador mais perto pela linha reta; inclua acionador [CONFERIR].`);
        for (const c of escolhidos) {
          pontosDisc.push({ x: r2(c.x), y: r2(c.y), simbolo: 'HM-INC-ACIONADOR', disciplina: disc, rotulo: `Acionador manual h=1,20 m — ${c.ambiente}`, ambiente: c.ambiente, pavimento: nome, altura_m: 1.2, motivo: `${c.motivo}; caminhamento máximo de ${INC_CAMINHAMENTO} m até ele (NBR 17240 5.5.3)`, id: novoId('ACI') });
          pontosDisc.push({ x: r2(c.x + 0.5), y: r2(c.y), simbolo: 'HM-INC-AVISADOR', disciplina: disc, rotulo: `Avisador audiovisual h=2,40 m — ${c.ambiente}`, ambiente: c.ambiente, pavimento: nome, altura_m: 2.4, motivo: 'junto do acionador; audibilidade 15 dB acima do ruído ambiente (5.6) — altura do padrão H&M (projeto R04) [CONFERIR]', id: novoId('AVS') });
        }
        for (const a of doPav.filter(x => x.tipo === 'assembleia' && x.area >= 150)) {
          const [p] = P.noPerimetro(a.pol, 1, { recuo: 0.2, fase: 0.75 });
          if (p) pontosDisc.push({ x: r2(p.x), y: r2(p.y), simbolo: 'HM-INC-AVISADOR', disciplina: disc, rotulo: `Avisador audiovisual h=2,40 m — ${a.nome}`, ambiente: a.nome, pavimento: nome, altura_m: 2.4, motivo: `espaço de reunião de ${r2(a.area)} m²: avisador dentro dele (audibilidade, 5.6) [CONFERIR]`, id: novoId('AVS') });
        }
      }
    }
    // alarme: sensor magnético em cada porta para fora, teclado junto da entrada principal, sirene externa
    if (disc === 'alarme') {
      for (const { p, a } of portasFachada) {
        pontosDisc.push({ x: r2(p.meio[0]), y: r2(p.meio[1]), simbolo: 'HM-ALM-MAGNETICO', disciplina: disc, rotulo: `Sensor magnético — porta de ${a.nome}`, ambiente: a.nome, pavimento: a.pavimento, motivo: 'porta para o exterior: abertura detectada antes da entrada [CONFERIR]', id: novoId('MAG') });
      }
      const e = entradaPrincipal;
      const t = e ? { ...((l) => ({ x: l.dentro[0] + l.t[0] * 0.8, y: l.dentro[1] + l.t[1] * 0.8 }))(ladoDe(e.p, e.a)), ambiente: e.a.nome, pavimento: e.a.pavimento } : { x: central.x + 0.6, y: central.y, ambiente: central.ambiente, pavimento: central.pavimento };
      pontosDisc.push({ x: r2(t.x), y: r2(t.y), simbolo: 'HM-ALM-TECLADO', disciplina: disc, rotulo: `Teclado do alarme h=1,40 m — ${t.ambiente}`, ambiente: t.ambiente, pavimento: t.pavimento, altura_m: 1.4, motivo: e ? 'junto da entrada principal: arma/desarma ao sair/entrar' : 'junto da central (entrada não lida) [CONFERIR]', id: novoId('TEC') });
      pontosDisc.push({ x: r2(central.x + 1), y: r2(central.y), simbolo: 'HM-ALM-SIRENE', disciplina: disc, rotulo: 'Sirene (instalar na fachada, h ≥ 2,40 m)', ambiente: central.ambiente, pavimento: central.pavimento, altura_m: 2.4, motivo: 'sirene externa de dissuasão — posição na fachada [CONFERIR]', id: novoId('SIR') });
      if (!portasFachada.length) out.avisos.push('Alarme: nenhuma porta para o exterior foi lida na arquitetura — os sensores magnéticos das portas ficaram de fora [CONFERIR].');
    }
    // controle de acesso (IEC 60839-11-1): leitor do lado de fora, fechadura na porta e botoeira de saída do lado de
    // dentro, nas portas das salas com valor/restritas e na entrada principal; porta em rota de fuga: fail-safe com
    // liberação pela central de incêndio e acionador de emergência (NBR 9077/IT de saídas de emergência) [CONFERIR]
    if (disc === 'controle_acesso') {
      const restrita = (a) => !a.residencial && (a.tipo === 'tecnica' || (a.tipo === 'escritorio' && /SECRETAR|TESOUR|ADMIN|DIRETOR|FINANCEIR|CONTABIL|PAROQUIAL/.test(sem(a.nome))) || (a.tipo === 'deposito' && /RESTRITO|VALOR|COFRE|ALMOX/.test(sem(a.nome))));
      const feitas = [];
      const portasAce = [];
      for (const p of portas.filter(q => q.meio)) {
        const a = ambs.filter(x => (p.ambientes || []).includes(x.nome) && restrita(x)).sort((x, y) => prioridade(x) - prioridade(y))[0];
        if (a) portasAce.push({ p, a, fuga: false, motivo: `${ROTULO_TIPO[a.tipo]} de acesso restrito` });
      }
      if (entradaPrincipal) portasAce.unshift({ p: entradaPrincipal.p, a: entradaPrincipal.a, fuga: true, motivo: 'entrada principal' });
      for (const { p, a, fuga, motivo } of portasAce) {
        if (feitas.some(q => Math.hypot(q[0] - p.meio[0], q[1] - p.meio[1]) < 0.6)) continue;
        feitas.push(p.meio);
        const l = ladoDe(p, a);
        const lado = (Number(p.largura_m) || 0.8) / 2 + 0.25;
        const fora0 = [l.fora[0] + l.t[0] * lado, l.fora[1] + l.t[1] * lado];
        const dentro0 = [l.dentro[0] + l.t[0] * lado, l.dentro[1] + l.t[1] * lado];
        const base = { disciplina: disc, ambiente: a.nome, pavimento: a.pavimento };
        pontosDisc.push({ ...base, x: r2(fora0[0]), y: r2(fora0[1]), simbolo: 'HM-ACE-LEITOR', rotulo: `Leitor de acesso h=1,20 m — porta de ${a.nome}`, altura_m: 1.2, motivo: `${motivo}: leitor do lado de fora`, id: novoId('LEI') });
        pontosDisc.push({ ...base, x: r2(p.meio[0]), y: r2(p.meio[1]), simbolo: 'HM-ACE-FECHADURA', rotulo: `Fechadura eletromagnética — porta de ${a.nome}`, altura_m: 2.1, motivo: fuga ? 'rota de fuga: fechadura fail-safe (abre sem energia) e liberada pela central de incêndio [CONFERIR]' : `${motivo}: fechadura na folha`, id: novoId('FEC') });
        pontosDisc.push({ ...base, x: r2(dentro0[0]), y: r2(dentro0[1]), simbolo: 'HM-ACE-BOTOEIRA', rotulo: `Botoeira de saída h=1,20 m — porta de ${a.nome}`, altura_m: 1.2, motivo: 'saída livre do lado de dentro', id: novoId('BOT') });
        if (fuga) pontosDisc.push({ ...base, x: r2(dentro0[0] - l.t[0] * 0.5), y: r2(dentro0[1] - l.t[1] * 0.5), simbolo: 'HM-ACE-EMERGENCIA', rotulo: `Acionador de emergência (quebra-vidro) — porta de ${a.nome}`, altura_m: 1.2, motivo: 'porta em rota de fuga: liberação manual de emergência (NBR 9077 / IT de saídas de emergência) [CONFERIR]', id: novoId('EMG') });
      }
      if (!portasAce.length) out.avisos.push('Controle de acesso: nenhuma porta de sala restrita nem a entrada principal foi lida na arquitetura — inclua as portas no editor do 3D [CONFERIR].');
    }
    // telefonia: porteiro eletrônico na entrada principal (lado de fora)
    if (disc === 'telefonia' && entradaPrincipal) {
      const l = ladoDe(entradaPrincipal.p, entradaPrincipal.a);
      const lado = (Number(entradaPrincipal.p.largura_m) || 0.8) / 2 + 0.3;
      pontosDisc.push({ x: r2(l.fora[0] - l.t[0] * lado), y: r2(l.fora[1] - l.t[1] * lado), simbolo: 'HM-TEL-PORTEIRO', disciplina: disc, rotulo: `Porteiro eletrônico h=1,40 m — entrada de ${entradaPrincipal.a.nome}`, ambiente: entradaPrincipal.a.nome, pavimento: entradaPrincipal.a.pavimento, altura_m: 1.4, motivo: 'entrada principal: porteiro eletrônico/interfone ligado à central [CONFERIR]', id: novoId('POR') });
    }

    // compatibilização do próprio projeto (afastar, acima)
    for (const pt of pontosDisc) afastar(pt);

    // ── infraestrutura e cabos da disciplina ──
    const layerTronco = { telecom: 'HM-CAB-ELETROCALHA', incendio: 'HM-INC-ELETRODUTO', alarme: 'HM-ALM-ELETRODUTO', acesso: 'HM-ACE-ELETRODUTO', telefonia: 'HM-TEL-ELETRODUTO', antena: 'HM-ANT-ELETRODUTO', eletrica: 'HM-ELE-ELETRODUTO' }[D.grupo] || 'HM-ELETRODUTO';
    const tipoTronco = D.grupo === 'telecom' ? 'eletrocalha' : 'eletroduto';
    const segTronco = [], segRamal = [];
    const cabos = [];
    let somaTronco = 0, somaRamal = 0;
    const centroDe = (nome) => (D.porPavimento ? centraisPav[nome] : central);
    for (const nome of nomesPav) {
      const doPav = pontosDisc.filter(p => p.pavimento === nome);
      const cen = centroDe(nome);
      if (!cen) continue;
      const ehDaCentral = nome === cen.pavimento;
      if (!doPav.length && !ehDaCentral) continue;
      const m = malhaDe(nome, D.grupo === 'eletrica');
      // Árvore do pavimento: a raiz (a central/QD no pavimento dela; a prumada nos outros), a prumada, o centro das
      // circulações/escadas (o TRONCO) e cada ponto pendurado, um a um, no que estiver mais perto — um trecho do tronco
      // ou um ponto já ligado (os pontos da mesma sala seguem juntos). Cada ligação é ROTEADA pela grade do pavimento.
      const pr = prumada[nome];
      const nos = [ehDaCentral ? [cen.x, cen.y] : [pr.x, pr.y]];
      if (ehDaCentral && !D.porPavimento && nomesPav.length > 1 && pontosDisc.some(p => p.pavimento !== nome)) nos.push([pr.x, pr.y]);
      // energia corre a 40 cm da telecom nas mesmas circulações (separação física — NBR 14565/NBR 5410): o tronco da
      // elétrica passa deslocado, paralelo ao da eletrocalha
      const off = D.grupo === 'eletrica' ? 0.4 : 0;
      for (const a of ambs.filter(x => x.pavimento === nome && (x.tipo === 'circulacao' || x.tipo === 'escada') && x.area >= 4)) nos.push(off && dentro([a.c[0] + off, a.c[1] + off], a.pol) ? [a.c[0] + off, a.c[1] + off] : a.c);
      const daArvore = doPav.filter(p => !p.central);
      const arestas = arvore(nos);
      const rotasTronco = arestas.map(([i, j]) => rota(m, nos[i], nos[j]));
      const compAresta = new Map(arestas.map(([i, j], k) => [`${i}|${j}`, rotasTronco[k].comp]));
      const D0 = distanciasNaArvore(nos, arestas, 0, (i, j) => compAresta.get(`${i}|${j}`) ?? compAresta.get(`${j}|${i}`) ?? manhattan(nos[i], nos[j]));
      const trechosTronco = [];
      arestas.forEach(([i, j], k) => {
        for (const s of segmentosDe(rotasTronco[k].pts)) trechosTronco.push({ seg: s, i, j });
        somaTronco += rotasTronco[k].comp;
      });
      segTronco.push(...trechosTronco.map(t => t.seg));
      const naArvoreDe = new Map(); // ponto → distância até a raiz pelo caminho
      const ligados = []; // [{ q: [x, y], d }]
      const restam = daArvore.slice();
      // nota = ramal + ¼ do caminho até a raiz: o ponto se pendura perto, mas não na ponta de uma "cobrinha" de pontos
      // que dá a volta na planta (o cabo segue o eletroduto: a cobrinha alongava o cabo de todos depois dela)
      const nota = (d, dist) => d + 0.25 * dist;
      while (restam.length) {
        let melhor = null;
        for (let k = 0; k < restam.length; k++) {
          const p = [restam[k].x, restam[k].y];
          if (!trechosTronco.length) { const d = manhattan(p, nos[0]); if (!melhor || nota(d, 0) < melhor.nota) melhor = { k, d, q: nos[0], dist: 0, nota: nota(d, 0) }; }
          for (const t of trechosTronco) {
            const q = maisPertoNoSegmento(p, t.seg);
            const d = manhattan(p, q);
            const dist = Math.min(D0[t.i] + manhattan(q, nos[t.i]), D0[t.j] + manhattan(q, nos[t.j]));
            if (!melhor || nota(d, dist) < melhor.nota) melhor = { k, d, q, dist, nota: nota(d, dist) };
          }
          for (const l of ligados) { const d = manhattan(p, l.q); if (!melhor || nota(d, l.d) < melhor.nota) melhor = { k, d, q: l.q, dist: l.d, nota: nota(d, l.d) }; }
        }
        const pt = restam.splice(melhor.k, 1)[0];
        const pq = [pt.x, pt.y];
        const r = rota(m, pq, melhor.q);
        segRamal.push(...segmentosDe(r.pts));
        somaRamal += r.comp;
        const d = melhor.dist + r.comp;
        naArvoreDe.set(pt, d);
        ligados.push({ q: pq, d });
      }
      if (D.porPavimento) {
        // elétrica/iluminação: o cabo é por CIRCUITO (o mesmo cabo passa de ponto em ponto), não por ponto
        continue;
      }
      // subida/descida até o pavimento da central pela prumada (pelos níveis lidos), com o desvio entre as prumadas
      let vertical = subida(nome, cen.pavimento) + desvio(nome, cen.pavimento);
      let naCentral = ehDaCentral ? 0 : (prumada[cen.pavimento] ? manhattan([prumada[cen.pavimento].x, prumada[cen.pavimento].y], [cen.x, cen.y]) : 0);
      const pd = pdDe(nome);
      const descidaDe = (p) => (pd - (p.altura_m || (/DETECTOR|CAB-AP|ILU-LUMINARIA|PONTO-LUZ/.test(p.simbolo) ? pd : 0.3))) + 1.6; // ponto → forro e forro → equipamento central
      const caboDe = (p) => ((Number.isFinite(naArvoreDe.get(p)) ? naArvoreDe.get(p) : 0) + vertical + naCentral + Math.abs(descidaDe(p))) * (1 + folga) + (D.grupo === 'telecom' ? 3 : 1);
      // NBR 14565 (canal horizontal ≤ 90 m): pavimento cujo cabo passaria de 90 m até o rack principal ganha um RACK DE
      // PISO na prumada (distribuidor secundário, um para CFTV e rede), ligado ao principal por backbone óptico
      const chavePiso = `telecom|piso|${nome}`;
      if (D.grupo === 'telecom' && !ehDaCentral && (centrosPorGrupo[chavePiso] || daArvore.some(p => caboDe(p) > 90))) {
        if (!centrosPorGrupo[chavePiso]) {
          const rp = { id: novoId('RK'), x: pr.x + 0.6, y: pr.y, pavimento: nome, ambiente: pr.ambiente || nome };
          centrosPorGrupo[chavePiso] = rp;
          const q = { x: r2(rp.x), y: r2(rp.y), simbolo: 'HM-CAB-RACK', disciplina: disc, rotulo: `Rack de piso (distribuidor secundário) — ${rp.ambiente}`, ambiente: rp.ambiente, pavimento: nome, motivo: `no ${nome} o cabo até o rack principal passaria de 90 m (NBR 14565, canal horizontal): rack de piso na prumada, ligado ao principal por fibra óptica [CONFERIR]`, id: rp.id, central: true };
          afastar(q); rp.x = q.x; rp.y = q.y;
          out.pontos.push(q);
          const bb = (subida(nome, cen.pavimento) + desvio(nome, cen.pavimento) + naCentral + 0.6 + 6) * (1 + folga);
          out.metragens.push({ disciplina: disc, descricao: `Backbone óptico multimodo OM3 6 fibras — rack de piso do ${nome} → rack principal (pela prumada)`, metros: Math.round(bb * 10) / 10, cabo: true });
        }
        vertical = 0; naCentral = 0;
      }
      daArvore.forEach((p) => { p.cabo_m = Math.round(caboDe(p) * 10) / 10; });
      // ainda passa de 90 m (salão longe do rack no mesmo pavimento): rack SECUNDÁRIO na sala técnica/depósito/
      // circulação mais perto desses pontos; cada ponto vai ao rack mais perto pelo caminho
      if (D.grupo === 'telecom' && daArvore.some(p => p.cabo_m > 90)) {
        const chaveSec = `telecom|sec|${nome}`;
        let rs = centrosPorGrupo[chaveSec];
        if (!rs) {
          const longe = daArvore.filter(p => p.cabo_m > 90);
          const g = [longe.reduce((s, p) => s + p.x, 0) / longe.length, longe.reduce((s, p) => s + p.y, 0) / longe.length];
          const salas = ambs.filter(a => a.pavimento === nome && ['tecnica', 'deposito', 'circulacao'].includes(a.tipo) && a.area >= 2).sort((x, y) => manhattan(x.c, g) - manhattan(y.c, g));
          const sala = salas[0] && manhattan(salas[0].c, g) <= 40 ? salas[0] : ambs.find(a => a.pavimento === nome && a.nome === longe[0].ambiente);
          const [pos] = P.noPerimetro(sala.pol, 1, { recuo: 0.2, fase: 0.2 });
          rs = { id: novoId('RK'), x: (pos || { x: sala.c[0] }).x, y: (pos || { y: sala.c[1] }).y, pavimento: nome, ambiente: sala.nome };
          centrosPorGrupo[chaveSec] = rs;
          const q = { x: r2(rs.x), y: r2(rs.y), simbolo: 'HM-CAB-RACK', disciplina: disc, rotulo: `Rack secundário (distribuidor) — ${sala.nome}`, ambiente: sala.nome, pavimento: nome, motivo: `${longe.length} ponto(s) do ${nome} (${[...new Set(longe.map(p => p.ambiente))].slice(0, 3).join(', ')}) a mais de 90 m do rack (NBR 14565): rack secundário em "${sala.nome}"${sala.tipo === 'tecnica' || sala.tipo === 'deposito' ? '' : ' — prefira um nicho/sala técnica perto'} [CONFERIR]`, id: rs.id, central: true };
          afastar(q); rs.x = q.x; rs.y = q.y;
          out.pontos.push(q);
          const raiz = nos[0];
          const bb = (rota(m, [rs.x, rs.y], raiz).comp + vertical + naCentral + 6) * (1 + folga);
          out.metragens.push({ disciplina: disc, descricao: `Backbone óptico multimodo OM3 6 fibras — rack secundário em ${sala.nome} (${nome}) → rack ${vertical ? 'de piso/principal' : 'principal'}`, metros: Math.round(bb * 10) / 10, cabo: true });
        }
        for (const p of daArvore) {
          const alt = (rota(m, [p.x, p.y], [rs.x, rs.y]).comp + Math.abs(descidaDe(p))) * (1 + folga) + 3;
          if (alt < p.cabo_m) p.cabo_m = Math.round(alt * 10) / 10;
        }
      }
      if (!D.laco) for (const p of daArvore) cabos.push({ disciplina: disc, ponto: p.id, descricao: D.cabo, comprimento_m: p.cabo_m });
    }
    // elétrica/iluminação: cabo de cada circuito = do QD ao 1º ponto + de ponto em ponto (mais perto) + descidas,
    // × 3 condutores (F + N + PE), na seção do circuito calculada pela skill
    if (D.porPavimento) {
      const porSecao = new Map();
      for (const nome of nomesPav) {
        const cen = centraisPav[nome];
        if (!cen) continue;
        const m = malhaDe(nome, true);
        const pd = pdDe(nome);
        const grupos = new Map();
        for (const p of pontosDisc.filter(q => q.pavimento === nome && !q.central)) { const k = p.circuito || `amb:${p.ambiente}`; (grupos.get(k) || grupos.set(k, []).get(k)).push(p); }
        for (const [k, pts] of grupos) {
          const circ = motores[disc].circuitos.get(`${nome}|${k}`);
          const secao = circ?.secao_mm2 || (/ILU|LUZ|INTERRUPTOR|COMANDO/.test(pts[0].simbolo) ? 1.5 : 2.5);
          let atual = [cen.x, cen.y], total = 0;
          const resta = pts.slice();
          while (resta.length) {
            let j = 0;
            resta.forEach((p, i) => { if (manhattan(atual, [p.x, p.y]) < manhattan(atual, [resta[j].x, resta[j].y])) j = i; });
            const p = resta.splice(j, 1)[0];
            total += rota(m, atual, [p.x, p.y]).comp + (pd - (p.altura_m ?? pd));
            atual = [p.x, p.y];
          }
          const comp = Math.round((total + 1.6) * (1 + folga) * 10) / 10;
          for (const p of pts) p.cabo_m = p.cabo_m || null;
          cabos.push({ disciplina: disc, ponto: `circuito ${k} (${nome})`, descricao: `Circuito ${k} — ${pts.length} ponto(s)`, comprimento_m: comp, secao_mm2: secao });
          porSecao.set(secao, (porSecao.get(secao) || 0) + comp * 3);
        }
      }
      for (const [secao, metros] of [...porSecao].sort((a, b) => a[0] - b[0])) {
        out.metragens.push({ disciplina: disc, descricao: `Cabo de cobre flexível ${String(secao).replace('.', ',')} mm² 450/750 V (F + N + PE dos circuitos — seção pela skill)`, metros: Math.round(metros * 10) / 10, cabo: true });
      }
      // alimentador de cada QD a partir do QD do pavimento de acesso (que faz as vezes do QGBT) pela prumada
      if (disc === 'eletrica' || !disciplinas.includes('eletrica')) {
        const geral = centraisPav[salaCentro.pavimento] || Object.values(centraisPav)[0];
        let alim = 0;
        for (const nome of nomesPav) {
          const c = centraisPav[nome];
          if (!c || c === geral) continue;
          alim += (manhattan([c.x, c.y], [prumada[nome].x, prumada[nome].y]) + subida(nome, geral.pavimento) + desvio(nome, geral.pavimento) + manhattan([prumada[geral.pavimento].x, prumada[geral.pavimento].y], [geral.x, geral.y])) * (1 + folga);
        }
        if (alim > 0) out.metragens.push({ disciplina: disc, descricao: `Alimentadores dos QDs a partir do QD do ${geral.pavimento} (eletroduto pela prumada; seção pelo dimensionamento da skill elétrica [CONFERIR])`, metros: Math.round(alim * 10) / 10 });
      }
    }
    // laço classe A (incêndio): ida e volta por caminhos distintos — o cabo é o percurso que passa por todos os
    // dispositivos do laço (vizinho mais perto, a partir da central), roteado pela grade, e volta à central
    if (D.laco) {
      const noLaco = pontosDisc.filter(p => !p.central && p.simbolo !== D.centro);
      let atual = [central.x, central.y], pavAtual = central.pavimento, total = 0;
      const resta = noLaco.map(p => ({ p, q: [p.x, p.y] }));
      while (resta.length) {
        let k = -1, dk = Infinity;
        resta.forEach((r, i) => { const d = (r.p.pavimento === pavAtual ? 0 : 1e6) + manhattan(atual, r.q); if (d < dk) { dk = d; k = i; } });
        const r = resta.splice(k, 1)[0];
        if (r.p.pavimento !== pavAtual) {
          total += rota(malha(pavAtual), atual, [prumada[pavAtual].x, prumada[pavAtual].y]).comp + subida(r.p.pavimento, pavAtual) + desvio(r.p.pavimento, pavAtual);
          atual = [prumada[r.p.pavimento].x, prumada[r.p.pavimento].y];
          pavAtual = r.p.pavimento;
        }
        total += rota(malha(pavAtual), atual, r.q).comp;
        atual = r.q;
      }
      if (pavAtual !== central.pavimento) total += rota(malha(pavAtual), atual, [prumada[pavAtual].x, prumada[pavAtual].y]).comp + subida(central.pavimento, pavAtual) + desvio(central.pavimento, pavAtual) + rota(malha(central.pavimento), [prumada[central.pavimento].x, prumada[central.pavimento].y], [central.x, central.y]).comp;
      else total += rota(malha(pavAtual), atual, [central.x, central.y]).comp;
      const descidas = noLaco.length * 2 * 0.5;
      const mm = Math.round((total + descidas) * (1 + folga) * 10) / 10;
      cabos.push({ disciplina: disc, ponto: 'laço', descricao: `${D.cabo} — ${noLaco.length} dispositivos`, comprimento_m: mm });
    }

    out.pontos.push(...pontosDisc);
    const troncoJaFeito = troncoDoGrupo.has(D.grupo);
    if (segTronco.length) troncoDoGrupo.add(D.grupo);
    if (troncoJaFeito) { segTronco.length = 0; somaTronco = 0; }
    const medTronco = tipoTronco === 'eletrocalha' ? '100x50 mm' : D.grupo === 'eletrica' ? '1"' : '3/4"';
    if (['telecom', 'telefonia', 'antena'].includes(D.grupo)) marcarTelecom([...segTronco, ...segRamal]);
    if (segTronco.length) out.trechos.push({ disciplina: disc, tipo: tipoTronco, layer: layerTronco, segmentos: segTronco.map(s => s.map(r2)), material: tipoTronco === 'eletrocalha' ? 'aço perfurado' : 'PVC rígido/galvanizado', medida: medTronco, sugerido: true });
    if (segRamal.length) out.trechos.push({ disciplina: disc, tipo: 'eletroduto', layer: `${layerTronco}-RAMAL`, segmentos: segRamal.map(s => s.map(r2)), material: D.grupo === 'eletrica' ? 'PVC corrugado' : 'PVC/galvanizado', medida: '3/4"', sugerido: true });
    out.cabos.push(...cabos);
    if (somaTronco > 0) out.metragens.push({ disciplina: disc, descricao: tipoTronco === 'eletrocalha' ? 'Eletrocalha perfurada 100x50 mm com tampa (tronco pelas circulações — traçado sugerido)' : `Eletroduto ${medTronco} (tronco pelas circulações — traçado sugerido)`, metros: Math.round(somaTronco * (1 + folga) * 10) / 10 });
    if (somaRamal > 0) out.metragens.push({ disciplina: disc, descricao: 'Eletroduto 3/4" (ramais do tronco até cada ponto — traçado sugerido)', metros: Math.round(somaRamal * (1 + folga) * 10) / 10 });
    if (!D.porPavimento) {
      const somaCabo = cabos.reduce((s, c) => s + c.comprimento_m, 0);
      if (somaCabo > 0) out.metragens.push({ disciplina: disc, descricao: D.cabo, metros: Math.round(somaCabo * 10) / 10, cabo: true });
    }
    // NBR 14565: canal horizontal ≤ 90 m (cabo permanente)
    if (D.grupo === 'telecom') {
      const longos = cabos.filter(c => c.comprimento_m > 90);
      if (longos.length) out.avisos.push(`${D.rotulo}: ${longos.length} cabo(s) passam de 90 m até o rack (NBR 14565, canal horizontal) — preveja um distribuidor de piso/rack secundário no pavimento mais longe [CONFERIR].`);
    }
    // resumo por pavimento
    for (const nome of nomesPav) {
      const itens = {};
      for (const p of out.pontos.filter(q => q.disciplina === disc && q.pavimento === nome)) itens[p.simbolo] = (itens[p.simbolo] || 0) + 1;
      if (Object.keys(itens).length) out.resumo.push({ disciplina: disc, pavimento: nome, itens });
    }
  }

  if (disciplinas.includes('spda')) projetarSpda({ out, ambs, nomesPav, alinhado, desl, nivelDe, pdDe, entrePisos, crit, novoId, folga });

  const pdLidos = nomesPav.filter(n => !crit.peDireito && infoPav.get(n)?.pe_direito_m);
  out.criterios.push(
    `Pavimentos: ${nomesPav.join(', ')} — cada um projetado na planta dele; subida entre pavimentos pela prumada${ancora && ancora.n > 1 ? ` ("${ancora.nome}", na mesma posição em ${ancora.n} pavimentos alinhados)` : ''} ${nomesPav.some(n => Number.isFinite(nivelDe(n))) ? 'pelos níveis de piso lidos nas cotas da planta' : `com ${br(entrePisos)} m por pavimento [CONFERIR]`}.`,
    salaCentro ? `Equipamento central em "${salaCentro.nome}" (${salaCentro.pavimento}).` : '',
    crit.peDireito ? `Pé-direito informado: ${br(crit.peDireito)} m em todos os pavimentos.`
      : pdLidos.length ? `Pé-direito de cada pavimento pela diferença entre os níveis lidos, menos ${br(0.2)} m de laje/forro adotados [CONFERIR]: ${nomesPav.map(n => `${n} ${br(pdDe(n))} m`).join('; ')}.`
        : `Pé-direito adotado ${br(peDireito0)} m [CONFERIR].`,
    disciplinas.includes('cftv') ? `Câmeras a ${nomesPav.map(n => `${br(alturaCamera(n))} m`).filter((v, i, l) => l.indexOf(v) === i).join(' / ')} (pé-direito − 0,30 m, entre 2,40 e 3,50 m como no projeto R04 da H&M); densidade ${ROTULO_DENSIDADE[crit.densidadeCftv]}${crit.cftvExterno ? '' : ', sem câmeras externas'}${crit.ptz ? ', PTZ nos espaços com 400 m² ou mais (externos com 600 m² ou mais)' : ', sem PTZ'}.` : '',
    disciplinas.includes('incendio') ? `Detecção: cobertura ${crit.incendio === 'rotas' ? 'só de rotas de fuga e áreas de risco [CONFERIR com a IT do Corpo de Bombeiros]' : 'total (todo ambiente fechado)'}.` : '',
    'Infraestrutura roteada por dentro das salas e pelos vãos de porta (atravessa parede só quando a volta seria muito maior — sala sem porta lida); cabos medidos por esse caminho + subidas, com ' + Math.round(folga * 100) + ' % de folga e as sobras no rack/central.',
    'Sem câmera em sanitário, dormitório e nas áreas da residência (privacidade/LGPD); sem detector em sanitário, área aberta e poço/shaft.',
  );
  if (usadas.size) out.criterios.push(`Regras aprendidas das instruções do engenheiro (aprovadas pelo administrador): ${[...usadas].map(([r, n]) => `${textoDaRegra(r)} (${n} ${r.modo === 'centro' ? 'grupo' : 'ambiente(s)'})`).join('; ')}.`);
  out.criterios = out.criterios.filter(Boolean);
  // rótulo = o TIPO do componente (agrupa as quantidades e casa com serviço/material); o lugar vai à parte
  for (const p of out.pontos) {
    p.local = `${p.ambiente}${nomesPav.length > 1 ? ` (${p.pavimento})` : ''}`;
    p.rotulo = String(p.rotulo).replace(/\s+—\s+.*$/, '');
  }
  const divergentes = ambs.filter(a => a.divergente);
  if (divergentes.length) out.avisos.push(`${divergentes.length} ambiente(s) com a área lida pelas paredes diferente da área escrita na planta (${divergentes.slice(0, 6).map(a => a.nome).join(', ')}${divergentes.length > 6 ? '…' : ''}): a quantidade usa a área escrita; a posição dos pontos nesses ambientes fica a conferir [CONFERIR].`);
  if (semNome.length) out.avisos.push(`${semNome.length} ambiente(s) sem nome na planta ficaram sem projeto (não se sabe o uso) [CONFERIR].`);
  if (excluidos.length) out.criterios.push(`Fora do projeto (escolha do engenheiro): ${excluidos.map(a => `${a.nome} (${a.pavimento})`).join(', ')}.`);
  const naoAchados = crit.excluir.filter(n => !todos.some(a => sem(a.nome) === sem(n) || sem(`${a.nome} (${a.pavimento})`) === sem(n)));
  if (naoAchados.length) out.avisos.push(`Ambientes pedidos para ficar fora que não estão na planta: ${naoAchados.join(', ')} [CONFERIR].`);
  out.avisos.push(...new Set(avisosEscolha));
  return out;
}
// NBR 17240 5.5.3: caminhamento máximo de 30 m até o acionador (o mesmo valor da skill de incêndio)
const INC_CAMINHAMENTO = 30;

const perimetroDe = (pol) => pol.reduce((s, p, i) => s + Math.hypot(pol[(i + 1) % pol.length][0] - p[0], pol[(i + 1) % pol.length][1] - p[1]), 0);

// ── SPDA (NBR 5419-3) sobre o contorno do prédio ─────────────────────────
// Contorno: o convexo das salas de todos os pavimentos acima do solo, ALINHADOS (./pavimentos.js) [CONFERIR]. Classe
// (nível de proteção) escolhida pelo engenheiro (padrão III) — quem decide é a análise de risco da NBR 5419-2. Pela
// classe (Tabelas 2 e 5 da parte 3, as mesmas da skill de SPDA): malha de captação de M × M m no topo, descidas a cada
// D m no perímetro (no mínimo 2) com caixa de inspeção, anel de aterramento a 1 m da fachada (arranjo B) [CONFERIR].
function projetarSpda({ out, ambs, nomesPav, alinhado, desl, nivelDe, pdDe, entrePisos, crit, novoId, folga }) {
  const acima = nomesPav.filter(n => !/SUBSOLO/i.test(n) && !(Number.isFinite(nivelDe(n)) && nivelDe(n) < -1));
  const base = acima[0] || nomesPav[0];
  const topo = acima[acima.length - 1] || base;
  const casco = contornoConvexo((acima.length ? acima : nomesPav).flatMap(n => ambs.filter(a => a.pavimento === n).flatMap(a => a.pol.map(p => alinhado(n, p)))));
  if (casco.length < 3) { out.avisos.push('SPDA: o contorno do prédio não foi lido (sem salas) — o SPDA ficou de fora [CONFERIR].'); return; }
  const N = SPDA.NIVEL[crit.classeSpda];
  const perim = perimetroDe(casco);
  const nDesc = Math.max(2, Math.ceil(perim / N.descidas));
  // altura do prédio: do piso do pavimento de base ao topo (nível do pavimento mais alto + pé-direito)
  const nb = nivelDe(base), nt = nivelDe(topo);
  const altura = Number.isFinite(nb) && Number.isFinite(nt) ? nt - nb + pdDe(topo) + 0.2 : (acima.length || 1) * entrePisos;
  const doPredio = (nome, [x, y]) => [x - desl(nome)[0], y - desl(nome)[1]]; // coords do prédio → da planta
  const [cx, cy] = centroide(casco);
  const pontos = [];
  // descidas igualmente espaçadas no perímetro, a partir do 1º canto
  const passo = perim / nDesc;
  let alvo = 0, acum = 0;
  for (let i = 0; i < casco.length && pontos.length < nDesc; i++) {
    const a = casco[i], b = casco[(i + 1) % casco.length];
    const lado = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (alvo <= acum + lado && pontos.length < nDesc) {
      const t = (alvo - acum) / lado;
      pontos.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      alvo += passo;
    }
    acum += lado;
  }
  const fora = (p, d) => { const v = [p[0] - cx, p[1] - cy]; const n = Math.hypot(...v) || 1; return [p[0] + (v[0] / n) * d, p[1] + (v[1] / n) * d]; };
  pontos.forEach((p, k) => {
    const pd = doPredio(base, p), cx0 = doPredio(base, fora(p, 0.5));
    out.pontos.push({ x: r2(pd[0]), y: r2(pd[1]), simbolo: 'HM-SPDA-DESCIDA', disciplina: 'spda', rotulo: 'Descida do SPDA (cobre nu 35 mm²)', ambiente: 'fachada', pavimento: base, motivo: `descidas a cada ${N.descidas} m no perímetro (NBR 5419-3, Tabela 5 — NP ${crit.classeSpda}); ${nDesc} descidas em ${br(perim)} m`, id: novoId('DSC') });
    out.pontos.push({ x: r2(cx0[0]), y: r2(cx0[1]), simbolo: 'HM-SPDA-CAIXA-INSPECAO', disciplina: 'spda', rotulo: 'Caixa de inspeção do aterramento', ambiente: 'fachada', pavimento: base, motivo: 'uma por descida: medição e ensaio de continuidade', id: novoId('CXI') });
  });
  // malha de captação no topo: o contorno + linhas a cada M m dentro dele (corte da reta com o contorno convexo)
  const corte = (eixo, v) => {
    const xs = [];
    for (let i = 0; i < casco.length; i++) {
      const a = casco[i], b = casco[(i + 1) % casco.length];
      const [a0, b0] = eixo === 'x' ? [a[0], b[0]] : [a[1], b[1]];
      if ((a0 <= v && b0 > v) || (b0 <= v && a0 > v)) { const t = (v - a0) / (b0 - a0); xs.push(eixo === 'x' ? a[1] + (b[1] - a[1]) * t : a[0] + (b[0] - a[0]) * t); }
    }
    return xs.length >= 2 ? [Math.min(...xs), Math.max(...xs)] : null;
  };
  const [bx0, by0, bx1, by1] = caixaDe(casco);
  const captacao = casco.map((p, i) => [...p, ...casco[(i + 1) % casco.length]]);
  for (let x = bx0 + N.malha; x < bx1 - 0.5; x += N.malha) { const c = corte('x', x); if (c) captacao.push([x, c[0], x, c[1]]); }
  for (let y = by0 + N.malha; y < by1 - 0.5; y += N.malha) { const c = corte('y', y); if (c) captacao.push([c[0], y, c[1], y]); }
  const compCapt = captacao.reduce((s, q) => s + Math.hypot(q[2] - q[0], q[3] - q[1]), 0);
  const anel = casco.map(p => fora(p, 1));
  const compAnel = perimetroDe(anel);
  const plantaDe = (nome) => (s) => [...doPredio(nome, [s[0], s[1]]), ...doPredio(nome, [s[2], s[3]])].map(r2);
  out.trechos.push({ disciplina: 'spda', tipo: 'fiacao', layer: 'HM-SPDA-CAPTACAO', segmentos: captacao.map(plantaDe(topo)), material: SPDA.MATERIAIS_CAPTACAO.cobre_35.descricao, medida: '35 mm²', sugerido: true });
  out.trechos.push({ disciplina: 'spda', tipo: 'fiacao', layer: 'HM-SPDA-ATERRAMENTO', segmentos: anel.map((p, i) => [...p, ...anel[(i + 1) % anel.length]]).map(plantaDe(base)), material: SPDA.MATERIAIS_ATERRAMENTO.cobre_50.descricao, medida: '50 mm²', sugerido: true });
  out.metragens.push(
    { disciplina: 'spda', descricao: `Captação em malha ${N.malha} × ${N.malha} m — ${SPDA.MATERIAIS_CAPTACAO.cobre_35.descricao} (NBR 5419-3, Tabelas 2 e 7)`, metros: Math.round(compCapt * (1 + folga) * 10) / 10, cabo: true },
    { disciplina: 'spda', descricao: `Descidas (${nDesc} × ${br(altura)} m) — ${SPDA.MATERIAIS_CAPTACAO.cobre_35.descricao}`, metros: Math.round(nDesc * altura * (1 + folga) * 10) / 10, cabo: true },
    { disciplina: 'spda', descricao: `Anel de aterramento a 1 m da fachada (arranjo B) — ${SPDA.MATERIAIS_ATERRAMENTO.cobre_50.descricao} (NBR 5419-3, Tabela 8)`, metros: Math.round(compAnel * (1 + folga) * 10) / 10, cabo: true },
  );
  out.criterios.push(`SPDA: nível de proteção ${crit.classeSpda} ${crit.classeSpda === 'III' ? 'adotado' : 'escolhido'} — quem define é a análise de risco (NBR 5419-2) [CONFERIR]; malha de ${N.malha} × ${N.malha} m e descidas a cada ${N.descidas} m (NBR 5419-3, Tabelas 2 e 5); contorno convexo dos pavimentos alinhados (${br(perim)} m) e altura de ${br(altura)} m [CONFERIR]; anel de aterramento a 1 m da fachada.`);
  const itens = {};
  for (const p of out.pontos.filter(q => q.disciplina === 'spda')) itens[p.simbolo] = (itens[p.simbolo] || 0) + 1;
  out.resumo.push({ disciplina: 'spda', pavimento: base, itens });
}

module.exports = { projetarDisciplinas, tipoDoAmbiente, criteriosDe, regrasDe, textoDaRegra, ROTULO_TIPO, DISCIPLINAS, APELIDOS, paraTestes: { arvore, distanciasNaArvore, ehResidencial, malhaDoPavimento, rota } };
