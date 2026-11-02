// Análise de Projeto a partir de DWG/DXF (versão 2.3). O desenho é lido numa
// thread à parte (services/analiseCad/worker.js → skills/_comum/cad/projetoDxf.js)
// e aqui vira o MESMO formato da análise do PDF (services/compatibilizacaoAnalise.js):
//   - o texto remontado do desenho passa pelos leitores de texto do PDF
//     (carimbo, lista de materiais, quadro de cargas, códigos de câmera/ponto);
//   - os ambientes vêm da arquitetura (área, perímetro, polígono e retângulo
//     mínimo reais, não do rótulo "A=");
//   - os blocos contados viram a "contagem pelo desenho" (como a do PDF
//     vetorial), cada um com descrição (legenda da prancha, atributo, biblioteca
//     H&M, sigla conhecida ou nome do bloco), disciplina e altura de instalação;
//     bloco que não dá para saber o que é NÃO vira material — vai para os
//     achados, para conferir; a quantidade da coluna QTD da legenda volta junto,
//     para conferência;
//   - linhas de infraestrutura (eletroduto, eletrocalha) medidas em metros; a
//     FIAÇÃO e o CABEAMENTO desenhados são ROTA (pagina.rotas), não material:
//     cabo = (rota + descidas) × nº de condutores, calculado por quem consome.
// Tudo marcado para conferir: o desenho manda, mas sigla de bloco é convenção
// de cada escritório.
const path = require('path');
const { executarNoWorker } = require('../executarNoWorker');
const { analisarTexto } = require('../../utils/projetoParser');
const { detectarDisciplinas } = require('../../utils/leitoresTabelaProjeto');
const { CAD } = require('../../config/caminhos');
const { BLOCOS_HM, disciplinaDaLayer, disciplinaDoBloco, disciplinaDoTexto, semPrefixoDeDisciplina, alturaDoTexto } = require(path.join(CAD, 'disciplinasCad.js'));
const { retanguloMinimo } = require(path.join(CAD, 'geometriaCad.js'));
const { medirTrechos } = require('./medidasInfra');
// Ponto lido do desenho (símbolo explodido) → descrição do item: a linha da legenda do
// projeto quando houver ("Tomada alta a 2,20m do piso"), senão o nome do símbolo na
// biblioteca da H&M (skills/_comum/cad/simbolos.js), sem a altura típica
const { SIMBOLOS } = require(path.join(CAD, 'simbolos.js'));
const NOME_EXTRA = { 'HM-ILU-POSTE': 'Poste de iluminação', 'HM-ELE-CAIXA-PISO': 'Caixa de passagem no piso', 'HM-ELE-PONTO': 'Ponto de parede (tomada/interruptor — conferir na legenda)' };
function descricaoDoPonto(pt) {
  const proprio = String(pt.rotulo || '').replace(/\s*\(nota do projeto:.*$/, '').trim();
  if (proprio && !/^(Tomada|Interruptor|Ponto)$/.test(proprio)) return proprio.slice(0, 120);
  return (SIMBOLOS[pt.simbolo]?.legenda || NOME_EXTRA[pt.simbolo] || proprio || pt.simbolo).replace(/\s*\(h = [^)]*\)/, '');
}
// disciplina do 3D (cor da peça) → disciplina do sistema
const DISCIPLINA_DO_3D = { 'controle-acesso': 'controle_acesso', 'iluminacao-externa': 'iluminacao', veicular: 'carregador' };

const RE_CAD = /\.(dwg|dxf)$/i;
const ehArquivoCad = (nome) => RE_CAD.test(String(nome || ''));

// layers medidas como infraestrutura (em metros)
const RE_LAYER_LINHA = 'ELETRODUT|ELETROCALHA|PERFILADO|LEITO|CONDU[IÍ]TE|CONDUIT|INFRA|CABEAMENTO|FIA[ÇC][ÃA]O|FIACAO|TUBELE|INST.*TUBULA|EL[ÉE]T.*TUBULA|TUBULA.*EL[ÉE]T|TUB.*(L[ÓO]GIC|TELEF|DADOS|CFTV)|(L[ÓO]GIC|TELEF|DADOS|CFTV).*(TUB|INFRA|ELETROD)';
const TEMPO_LIMITE_MS = 180 * 1000;

// worker com fila global (services/executarNoWorker.js): no máximo 2 leituras de CAD ao mesmo tempo
async function lerNoWorker(buffer, nome, aprendidos = []) {
  let m;
  try {
    m = await executarNoWorker(path.join(__dirname, 'worker.js'),
      { buffer, nome, reLayerLinha: RE_LAYER_LINHA, aprendidos }, { tempoLimiteMs: TEMPO_LIMITE_MS, memoriaMb: 2048 });
  } catch (e) {
    if (e.codigo === 'TEMPO_ESGOTADO') throw new Error(`a leitura de "${nome}" passou de ${TEMPO_LIMITE_MS / 1000} s`);
    throw e;
  }
  if (!m.ok) throw new Error(m.erro);
  return m;
}

// ── O que é cada bloco ─────────────────────────────────────────────────────
// Siglas usuais dos escritórios (nome do bloco, sem diferenciar maiúsculas).
// [regex, descrição, disciplina, só em nome curto]; a primeira que casar vale.
// "Só em nome curto": sigla de 2–3 letras ("TA", "QL", "AM") só vale em nome
// de bloco curto ou em layer elétrica — num nome longo é outra coisa (caso
// real: válvula "TA-Smart DN50" lida como tomada alta).
const SIGLAS = [
  [/^T\s?B\s?T?\d*\b|^TB[-_ ]|^TBT/i, 'Tomada baixa 2P+T', 'eletrica', true],
  [/^T\s?M\s?T?\d*\b|^TM[-_ ]|^TMT/i, 'Tomada média 2P+T', 'eletrica', true],
  [/^T\s?A\s?T?\d*\b|^TA[-_ ]|^TAT/i, 'Tomada alta 2P+T', 'eletrica', true],
  [/TOM(ADA)?[-_ ]?(DE[-_ ])?PISO/i, 'Tomada de piso', 'eletrica'],
  [/^TOMADA|^TOM\b|^TUG|^TUE/i, 'Tomada 2P+T', 'eletrica'],
  [/^INT(ERR?)?\d*\b|INTERRUP/i, 'Interruptor', 'eletrica'],
  [/^Q(L|D|DL|DC|DF|F|GBT|GD|LF|LFE|LFN|DG|TA)\b|^QUADRO/i, 'Quadro de distribuição', 'eletrica', true],
  [/CX[-_ ]?(DE[-_ ])?PASSAGEM|CAIXA DE PASSAGEM/i, 'Caixa de passagem', 'eletrica'],
  [/CONDULETE/i, 'Condulete', 'eletrica'],
  [/ATERR/i, 'Ponto de aterramento', 'eletrica'],
  [/DISJUNTOR|MINIDISJ|\bIDR\b|\bDR[-_ ]|\bDPS\b/i, 'Dispositivo de proteção (disjuntor/DR/DPS)', 'eletrica'],
  [/LUMIN|^LUM\b|PLAFON|SPOT|PENDENTE|ARANDELA|^ARAN|DOWNLIGHT|PAINEL LED|PERFIL (COM )?FITA|\d+\s?W.*\d+\s?lm|\blm\b/i, 'Luminária', 'iluminacao'],
  [/^(PL|PLUZ|PTO[-_ ]?LUZ)\b|PONTO DE LUZ/i, 'Ponto de luz', 'iluminacao', true],
  [/EMERG.*(LUM|BLOCO|ILUM)|BLOCO AUT|ILUMINA[ÇC][ÃA]O DE EMERG/i, 'Luminária de emergência', 'incendio'],
  // DOME/BULLET sem borda de palavra: "P-DOMEFIXA1" (510 câmeras num DWG real) não casava com \bDOME\b
  [/C[ÂA]MERA|\bCAM\b|^CAM[-_ \d]|(?<![A-Z])DOME|BULLET|SPEED ?DOME|\bPTZ\b/i, 'Câmera de CFTV', 'cftv'],
  [/RJ-?45|L[ÓO]GIC|PONTO DE REDE|ACCESS ?POINT|WI-?FI|PONTO[ ._-]?TEL(ECOM)?\b|PONTO DE TELECOM/i, 'Ponto de rede', 'rede'],
  [/^PR\d*\b|^PD\b|^REDE\b|^AP\b/i, 'Ponto de rede', 'rede', true],
  [/\bRACK\b/i, 'Rack / distribuidor', 'rede'],
  [/TELEF/i, 'Ponto de telefone', 'telefonia'],
  [/^TEL\b|^TEL[-_ \d]/i, 'Ponto de telefone', 'telefonia', true],
  [/INTERFONE|PORTEIRO/i, 'Interfone', 'telefonia'],
  [/ANTENA|COAXIAL/i, 'Ponto de TV', 'antena'],
  [/^TV\b|^TV[.\-_ ]/i, 'Ponto de TV', 'antena', true],
  [/DETEC|FUMA[ÇC]/i, 'Detector de incêndio', 'incendio'],
  [/^DF\b|^DTV?\b/i, 'Detector de incêndio', 'incendio', true],
  [/ACIONADOR|BOTOEIRA.*INC/i, 'Acionador manual', 'incendio'],
  [/^AM\b|^AM[-_ \d]/i, 'Acionador manual', 'incendio', true],
  [/AVISADOR|SIRENE.*INC|AUDIOVISUAL/i, 'Avisador sonoro/visual', 'incendio'],
  [/CENTRAL.*INC/i, 'Central de alarme de incêndio', 'incendio'],
  [/^CI\b/i, 'Central de alarme de incêndio', 'incendio', true],
  [/ISOLADOR/i, 'Isolador de laço', 'incendio'],
  [/IVP|INFRAVERMELHO|SENSOR.*PRESEN|MAGN[ÉE]TIC/i, 'Sensor de alarme', 'alarme'],
  [/^SM\b/i, 'Sensor de alarme', 'alarme', true],
  [/SIRENE/i, 'Sirene', 'alarme'],
  [/TECLADO/i, 'Teclado de alarme', 'alarme'],
  [/LEITORA?|FECHADURA|ELETRO[IÍ]M|CATRACA|BOTOEIRA|FECHO EL/i, 'Dispositivo de controle de acesso', 'controle_acesso'],
  [/TERMOSTATO|SENSOR DE (PRESS|TEMP|UMID|CO2)|BELIMO|ATUADOR|\bDDC\b|CONTROLADOR/i, 'Dispositivo de automação', 'automacao'],
  [/CARREGADOR|WALLBOX|ELETROPOSTO/i, 'Carregador veicular', 'carregador'],
];
// climatização/hidráulica (não é disciplina da H&M): não vira material nem "não identificado"
const RE_OUTRA_AREA = /DIFUSOR|GRELHA|COLARINHO|\bDUTO|DAMPER|VENEZIANA|ALÇAP|ALCAP|CURVA RET|TRANSI[ÇC][ÃA]O|UNI[ÃA]O RET|TAMPA RET|COTOVELO|ELBOW|\bTEES?\b|REDUCING|BUCHA|LUVA|V[ÁA]LVULA|REGISTRO|RALO|TORNEIRA|HIDRANTE|SPRINKLER|EXTINTOR|TERMINAIS DE AR|CONEX[ÕO]ES DE (DUTO|TUBO)|TUBULA[ÇC][ÕO]ES DE FABRICA|ACESS[ÓO]RIOS DO TUBO|FANCOIL|FAN ?COIL|FANCOLETE|EXAUSTOR|VENTILADOR|\bSPLIT\b|CONDENSADORA|EVAPORADORA|CHILLER|\bBOMBA|DANFOSS|\bDN\d+|HI-?WALL|\bBTU|CASSETE|PISO.?TETO/i;
// layer de instalação elétrica: libera as siglas curtas
const RE_LAYER_ELETRICA = /TOMADA|EL[ÉE]TRIC|ILUMINA|LUMIN|^E[-_ ]|INST\b|INST\s?-|FOR[ÇC]A|CFTV|REDE|L[ÓO]GIC|TELEF|INC[ÊE]NDIO|ALARME|SDAI/i;
// dispositivos que existem em várias disciplinas de segurança (sirene, sensor,
// botoeira, central): nelas a disciplina da layer manda na da sigla
const RAMO_SEGURANCA = new Set(['alarme', 'incendio', 'controle_acesso']);

const textoDescritivo = (s) => /[A-Za-zÀ-ú]{4,}/.test(s || '') && !/^\s*\d+([.,]\d+)?\s*(V|W|VA|A|kW|kVA|m|mm|cm)?\s*$/i.test(s || '');

// disciplina das layers do grupo (a mais frequente entre as que dizem)
function disciplinaDasLayers(layers) {
  const cont = new Map();
  for (const l of layers || []) { const d = disciplinaDaLayer(l); if (d) cont.set(d, (cont.get(d) || 0) + 1); }
  return [...cont].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function descreverSimbolo(g) {
  const camadas = (g.layers || [g.layer]).join(' ');
  const atributo = Object.entries(g.atributos || {}).find(([k, v]) => /DESC|TIPO|NOME|MODELO|EQUIP/.test(k) && textoDescritivo(v))?.[1];
  const nomeCurto = g.nomeLimpo.length <= 12 || RE_LAYER_ELETRICA.test(camadas);
  // biblioteca de símbolos da H&M (skills/_comum/cad/simbolos.js), pelo nome exato
  const hm = BLOCOS_HM[g.bloco] || BLOCOS_HM[g.nomeLimpo] || null;
  // sigla também no nome sem o prefixo de disciplina ("ELE QD" → "QD", "INC DET FUMACA")
  const semPrefixo = semPrefixoDeDisciplina(g.nomeLimpo);
  const sigla = SIGLAS.find(([re, , , curta]) => (!curta || nomeCurto || semPrefixo !== g.nomeLimpo) && (re.test(g.nomeLimpo) || re.test(g.bloco) || re.test(semPrefixo)));
  const daLegenda = textoDescritivo(g.descricaoLegenda) ? g.descricaoLegenda : null;
  // nome de bloco que já descreve (famílias do Revit: "Sensor de pressão Belimo 22ADP")
  const nomeDescritivo = /[A-Za-zÀ-ú]{3,}.*\s.*[A-Za-zÀ-ú0-9]{2,}/.test(g.nomeLimpo) && g.nomeLimpo.length >= 8;
  const emergencia = /EMERG/i.test(`${g.bloco} ${camadas}`);

  let descricao = null, origem = null;
  if (daLegenda) { descricao = daLegenda; origem = 'legenda'; }
  else if (atributo) { descricao = atributo; origem = 'atributo'; }
  else if (hm) { descricao = hm.descricao; origem = 'biblioteca'; }
  else if (sigla) { descricao = sigla[1]; origem = 'sigla'; }
  else if (nomeDescritivo) { descricao = g.nomeLimpo; origem = 'nome'; }
  if (descricao && emergencia && !/EMERG/i.test(descricao)) descricao += ' (circuito de emergência)';
  // o nome do bloco vai junto: separa variantes (TB-T × TB-T1, luminária EF1 × EF2) e ajuda a conferir na planta
  if (descricao && origem !== 'nome' && !descricao.includes(g.nomeLimpo)) descricao += ` — bloco ${g.nomeLimpo}`;

  const base = `${descricao || ''} ${g.nomeLimpo} ${camadas}`;
  const outraArea = !hm && !sigla && !daLegenda && RE_OUTRA_AREA.test(`${g.nomeLimpo} ${camadas}`);
  // Disciplina (M1 da revisão de 29/10/2026), do mais específico ao mais vago:
  // biblioteca H&M → prefixo do nome do bloco ("INC_SIRENE_AV") → sigla (a layer
  // manda quando as duas são do ramo de segurança: "SIRENE" em INC-AVISADOR é
  // incêndio) → prefixo/palavra da layer ("CA-DISPOSITIVO", "D10_TEL_…") → texto
  const daLayer = disciplinaDasLayers(g.layers || [g.layer]);
  let disciplina = hm?.disciplina || disciplinaDoBloco(g.nomeLimpo) || disciplinaDoBloco(g.bloco) || null;
  if (!disciplina && sigla) disciplina = (daLayer && RAMO_SEGURANCA.has(daLayer) && RAMO_SEGURANCA.has(sigla[2])) ? daLayer : sigla[2];
  if (!disciplina) disciplina = daLayer || detectarDisciplinas(base)[0]?.chave || (/TOMADA|EL[ÉE]TRIC|^E[-_ ]|INST\b/i.test(camadas) ? 'eletrica' : null);

  // altura de instalação do tipo (a da posição — atributo ALTURA — vale mais: alturasDoGrupo)
  const altura = alturaDoTexto(daLegenda || '') || (hm?.montagem ? { altura_m: hm.altura_m ?? null, montagem: hm.montagem } : null)
    || (sigla && /^Detector/.test(sigla[1]) ? { altura_m: null, montagem: 'teto' } : null);
  return { descricao, origem, disciplina: outraArea ? null : disciplina, outraArea, altura };
}

// O tipo de cada linha medida. Fiação e cabeamento desenhados são ROTA: virar
// "material em metros = rota" errava o cabo (rota não é rota × condutores) e o
// item ainda tirava o modelo "Eletroduto" do orçamento (revisão de 29/10/2026, A8).
function descreverLinha(l) {
  const L = l.layer;
  const tipo = /ELETROCALHA|\bCALHA/i.test(L) ? 'eletrocalha' : /PERFILADO/i.test(L) ? 'perfilado' : /LEITO/i.test(L) ? 'leito'
    : /FIA[ÇC][ÃA]O|FIACAO/i.test(L) ? 'fiacao' : /CABEAMENTO/i.test(L) && !/INFRA|ELETROD|TUB/i.test(L) ? 'cabeamento' : 'eletroduto';
  const nome = { eletrocalha: 'Eletrocalha', perfilado: 'Perfilado', leito: 'Leito para cabos', eletroduto: 'Eletroduto' }[tipo];
  const rota = tipo === 'fiacao' || tipo === 'cabeamento';
  const descricao = rota
    ? `Rota ${tipo === 'fiacao' ? 'da fiação' : 'do cabeamento'} — medida no desenho (layer "${L}"); cabo = (rota + descidas) × nº de condutores`
    : `${nome} — medido no desenho (layer "${L}")`;
  const disciplina = disciplinaDaLayer(L) || detectarDisciplinas(L)[0]?.chave || null;
  return { descricao, disciplina, tipo, rota };
}

// ponto dentro de polígono (mesma regra de skills/_comum/cad/arquitetura.js)
function dentro([x, y], p) {
  let d = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
const COLUNA_POR_AMBIENTE = { cftv: 'cftv', rede: 'rede', cabeamento: 'rede', antena: 'antena' };
const ramo = (d) => ({ cabeamento: 'rede', telefonia: 'rede' }[d] || d);
const r2 = (v) => Math.round(v * 100) / 100;

// Grupo de símbolos só com as posições que valem (`manter(i)`), arrays paralelos juntos
function filtrarPosicoes(g, manter) {
  const idx = g.posicoes.map((_, i) => i).filter(manter);
  if (idx.length === g.posicoes.length) return g;
  const pega = (arr) => (Array.isArray(arr) && arr.length === g.posicoes.length ? idx.map(i => arr[i]) : arr);
  return { ...g, posicoes: pega(g.posicoes), alturas: pega(g.alturas), montagens: pega(g.montagens), xrefs: pega(g.xrefs), quantidade: idx.length };
}

// altura de cada posição: atributo ALTURA da inserção; senão a do tipo (legenda/biblioteca)
function alturasDoGrupo(g, d) {
  return g.posicoes.map((_, i) => {
    const montagem = g.montagens?.[i] || null;
    if (montagem) return { altura_m: g.alturas?.[i] ?? null, montagem };
    return d.altura ? { altura_m: d.altura.altura_m ?? null, montagem: d.altura.montagem || null } : { altura_m: null, montagem: null };
  });
}

// Lê o arquivo e devolve, no formato da análise do PDF:
//   { analise, pagina (contagem pelo desenho), pontosPorAmbiente, arquitetura (para o 3D), espacial }
// pagina: { itens, rotas, naoIdentificados, legendaItens, conferenciaLegenda, xrefsDeOutraDisciplina, outraArea, … }
// opcoes.aprendidos: legenda de projetos anteriores (services/simbolosAprendidos.js)
async function lerArquivoCad(buffer, nome, opcoes = {}) {
  const r = await lerNoWorker(buffer, nome, opcoes.aprendidos || []);
  const p = r.projeto;
  const analise = analisarTexto(p.texto, nome);
  // ambientes com área real da arquitetura (o rótulo "A=" do texto fica de reserva):
  // perímetro, polígono e retângulo mínimo vão junto (M8: a ponte para a skill estimava o
  // perímetro por 4·√área — corredor de 1,2 × 10 m: 13,9 m em vez de 22,4 m)
  const ambientesArq = (r.arquitetura?.ambientes || []).filter(a => a.area_m2 >= 0.8);
  if (ambientesArq.length) {
    analise.ambientes = ambientesArq.map(a => ({
      nome: a.nome, area_m2: a.area_m2, perimetro_m: a.perimetro_m ?? null,
      poligono: (a.poligono || []).map(([x, y]) => [r2(x), r2(y)]), retangulo: retanguloMinimo(a.poligono), origem: a.origem || null,
    }));
  }

  const itens = [];
  const rotas = [];
  const naoIdentificados = [];
  const outraArea = [];
  const conferenciaLegenda = [];
  // bloco dentro do unifilar, da vista do quadro ou da tabela não é ponto da obra
  // (o disjuntor desenhado no diagrama não é uma tomada a mais) — 29/10/2026
  const folha = r.arquitetura?.folha || null;
  const regioesFora = folha?.regioesFora || [];
  const naPlanta = ([x, y]) => !regioesFora.some(c => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3]);
  const simbolosDaPlanta = p.simbolos.map(g => {
    if (!regioesFora.length || g.posicoes.length !== g.quantidade) return g;
    return filtrarPosicoes(g, (i) => naPlanta(g.posicoes[i]));
  }).filter(g => g.quantidade > 0);

  const descritos = simbolosDaPlanta.filter(s => !s.fora).map(g => ({ g, d: descreverSimbolo(g) }));
  // Xref de OUTRA disciplina é referência (A11): a disciplina da xref sai do nome
  // dela ("…TOMADAS…" é elétrica); as do desenho, do que está FORA de xref.
  // Desenho todo dentro de xref (nada fora): nenhuma xref vira referência.
  const proprias = new Set();
  for (const { g, d } of descritos) if (d.disciplina && (g.xrefs || []).some(x => !x)) proprias.add(ramo(d.disciplina));
  for (const l of p.linhas) { const dl = descreverLinha(l).disciplina; if (dl && !l.xref) proprias.add(ramo(dl)); }
  const discXref = new Map();
  const xrefOutra = (x) => {
    if (!x || !proprias.size) return false;
    if (!discXref.has(x)) discXref.set(x, disciplinaDoTexto(x));
    const dx = discXref.get(x);
    return !!dx && !proprias.has(ramo(dx));
  };
  const deOutraDisciplina = new Map(); // xref → { xref, disciplina, componentes, metros }
  const anotarXref = (x, campo, v) => {
    const reg = deOutraDisciplina.get(x) || deOutraDisciplina.set(x, { xref: x, disciplina: discXref.get(x), componentes: 0, metros: 0 }).get(x);
    reg[campo] += v;
  };

  const pontos = [];
  for (const { g: g0, d } of descritos) {
    const g = filtrarPosicoes(g0, (i) => !xrefOutra(g0.xrefs?.[i]));
    if (g.quantidade < g0.quantidade) for (const x of g0.xrefs || []) if (xrefOutra(x)) anotarXref(x, 'componentes', 1);
    if (!g.quantidade) continue;
    if (d.outraArea) { outraArea.push(g); continue; }
    if (!d.descricao || !d.disciplina) { naoIdentificados.push({ bloco: g.nomeLimpo, layer: g.layers.join(', '), quantidade: g.quantidade }); continue; }
    const alts = alturasDoGrupo(g, d);
    const uniforme = alts.every(a => a.altura_m === alts[0].altura_m && a.montagem === alts[0].montagem);
    itens.push({
      tipo: 'simbolo', descricao: d.descricao, quantidade: g.quantidade, disciplina: d.disciplina, origemDescricao: d.origem,
      bloco: g.nomeLimpo, layer: g.layers.join(', '), posicoes: g.posicoes, ambiguo: false,
      ...(uniforme && alts[0].montagem ? { altura_m: alts[0].altura_m, montagem: alts[0].montagem } : {}),
      ...(g.quantidadeLegenda != null ? { quantidadeLegenda: g.quantidadeLegenda } : {}),
      // inserções repetidas no mesmo ponto, contadas uma vez só (para conferir)
      ...(g.duplicadas ? { sobrepostas: g.duplicadas } : {}),
    });
    if (g.quantidadeLegenda != null && g.quantidadeLegenda !== g.quantidade) {
      conferenciaLegenda.push({ bloco: g.nomeLimpo, descricao: d.descricao, desenho: g.quantidade, legenda: g.quantidadeLegenda });
    }
    g.posicoes.forEach(([x, y], i) => pontos.push({ x, y, descricao: d.descricao, disciplina: d.disciplina, classe: classeDoComponente(d.descricao), altura_m: alts[i].altura_m, montagem: alts[i].montagem }));
  }
  // Símbolos EXPLODIDOS (QiBuilder/AltoQi, PDF convertido em DWG): sem bloco, o desenho
  // ainda tem os pontos — lidos pela layer, pela medida e pela legenda da prancha (o mesmo
  // leitor do 3D: skills/_comum/cad/pontosDoDesenho.js). Antes a análise saía com 0 itens e
  // o 3D com todos; agora entram no orçamento, marcados para conferir.
  const doDesenho = [];
  if (!itens.some(it => it.tipo === 'simbolo') && r.desenho?.pontos?.length) {
    const grupos = new Map();
    for (const pt of r.desenho.pontos) {
      if (!naPlanta([pt.x, pt.y])) continue;
      const descricao = descricaoDoPonto(pt);
      const disciplina = DISCIPLINA_DO_3D[pt.disciplina] || pt.disciplina || 'eletrica';
      const k = `${descricao}|${disciplina}|${pt.altura_m ?? ''}`;
      const g = grupos.get(k) || grupos.set(k, { descricao, disciplina, simbolo: pt.simbolo, altura_m: Number(pt.altura_m) > 0 ? Number(pt.altura_m) : null, alturaDe: pt.alturaDe || null, posicoes: [] }).get(k);
      g.posicoes.push([pt.x, pt.y]);
    }
    for (const g of grupos.values()) {
      const montagem = /LUMINARIA|PONTO-LUZ|DETECTOR|SENSOR|CAB-AP|CAPTOR|CAMERA/.test(g.simbolo) ? 'teto' : g.altura_m ? 'parede' : null;
      itens.push({
        tipo: 'simbolo', descricao: g.descricao, quantidade: g.posicoes.length, disciplina: g.disciplina, origemDescricao: 'desenho',
        bloco: g.simbolo, layer: '', posicoes: g.posicoes, ambiguo: true, conferir: true,
        ...(g.altura_m ? { altura_m: g.altura_m, montagem: montagem || 'parede', alturaDe: g.alturaDe } : montagem ? { montagem } : {}),
      });
      doDesenho.push(g);
      g.posicoes.forEach(([x, y]) => pontos.push({ x, y, descricao: g.descricao, disciplina: g.disciplina, classe: classeDoComponente(g.descricao), altura_m: g.altura_m, montagem }));
    }
  }
  for (const l of p.linhas) {
    const d = descreverLinha(l);
    if (xrefOutra(l.xref)) { anotarXref(l.xref, 'metros', l.metros); continue; }
    // toda linha medida também é rota (comprimento do caminho, para o cálculo do cabo)
    rotas.push({ layer: l.layer, tipo: d.tipo, disciplina: d.disciplina, rota_m: l.metros, ...(l.xref ? { xref: l.xref } : {}),
      cabo: { rota_m: l.metros, descidas_m: null, condutores: null, formula: '(rota + descidas) × condutores' } });
    if (d.rota) continue; // fiação/cabeamento desenhado: rota, não material
    itens.push({ tipo: 'linha', descricao: d.descricao, metros: l.metros, rota_m: l.metros, tipoLinha: d.tipo, disciplina: d.disciplina, layer: l.layer, ambiguo: false });
  }

  // tipo da legenda com QTD e nenhum símbolo na planta: também é divergência
  const comGrupo = new Set(p.simbolos.map(g => g.nomeLimpo));
  for (const li of p.legendaItens || []) {
    if (li.quantidade > 0 && !comGrupo.has(li.nomeLimpo)) conferenciaLegenda.push({ bloco: li.nomeLimpo, descricao: li.descricao, desenho: 0, legenda: li.quantidade });
  }

  // pontos de CFTV/rede/antena por ambiente, pela posição do bloco
  const pontosPorAmbiente = [];
  if (ambientesArq.length) {
    const porAmb = new Map();
    for (const it of itens) {
      const col = COLUNA_POR_AMBIENTE[it.disciplina];
      if (it.tipo !== 'simbolo' || !col) continue;
      for (const pos of it.posicoes) {
        const amb = ambientesArq.filter(a => dentro(pos, a.poligono)).sort((a, b) => a.area_m2 - b.area_m2)[0];
        if (!amb) continue;
        const linha = porAmb.get(amb.nome) || { ambiente: amb.nome, cftv: 0, rede: 0, antena: 0 };
        linha[col]++;
        porAmb.set(amb.nome, linha);
      }
    }
    pontosPorAmbiente.push(...porAmb.values());
  }

  // DWG que é PDF convertido (só traços, sem texto nem bloco) ou vazio
  const vazio = !p.texto.replace(/\s/g, '').length && !p.simbolos.length && !doDesenho.length;
  analise.semTexto = vazio;
  analise.origemCad = { formato: r.origem, versao: r.versao, legenda: p.legenda };
  const pagina = {
    pagina: r.origem === 'dwg' ? 'DWG' : 'DXF', origem: 'cad', escala: null, legenda: p.legenda,
    ...(folha ? { folha: { tipo: folha.tipo, resumo: folha.resumo, temPlanta: folha.temPlanta, semPlanta: folha.semPlanta } } : {}),
    itens, rotas, naoIdentificados, outraArea: outraArea.reduce((s, g) => s + g.quantidade, 0),
    // QTD da legenda × contagem do desenho (para o achado de conferência)
    ...(p.legendaItens?.length ? { legendaItens: p.legendaItens } : {}),
    ...(conferenciaLegenda.length ? { conferenciaLegenda } : {}),
    ...(deOutraDisciplina.size ? { xrefsDeOutraDisciplina: [...deOutraDisciplina.values()].map(x => ({ ...x, metros: Math.round(x.metros * 10) / 10 })) } : {}),
    ...(vazio ? { aviso: 'o desenho não tem texto nem blocos (parece um PDF convertido em DWG, só com traços) — envie o PDF do projeto' } : {}),
  };
  const avisos = [
    r.avisoUnidade,
    doDesenho.length ? `${doDesenho.reduce((s, g) => s + g.posicoes.length, 0)} pontos lidos dos símbolos desenhados (blocos explodidos), pela layer, pela medida e pela legenda da prancha — [CONFERIR] as quantidades` : null,
    r.desenho?.erro ? `leitura dos símbolos desenhados falhou: ${r.desenho.erro}` : null,
  ].filter(Boolean);
  if (avisos.length) pagina.aviso = [pagina.aviso, ...avisos].filter(Boolean).join('; ');
  const arquitetura = r.arquitetura?.ambientes?.length ? {
    nome_arquivo: nome, dxf: r.dxf,
    // base do 3D só se o desenho tem planta (services/compatibilizacaoAnalise.js)
    planta: !folha?.semPlanta,
    resumo: {
      ambientes: r.arquitetura.ambientes.map(a => ({ nome: a.nome, area_m2: a.area_m2, perimetro_m: a.perimetro_m, origem: a.origem })),
      portas: r.arquitetura.portas, layers: r.arquitetura.layers, fatorUnidade: r.arquitetura.fatorUnidade, origem: r.origem,
    },
  } : null;

  // posições para a compatibilização entre arquivos (utils/compatibilidadeEspacial.js):
  // os componentes identificados (com a altura, quando se sabe) e também os de
  // climatização/hidráulica (difusor e sprinkler não são da H&M, mas um detector
  // não pode ficar colado neles)
  for (const g of outraArea) {
    const classe = classeDoComponente(`${g.nomeLimpo} ${g.layers.join(' ')}`);
    // acionador/avisador sem disciplina não entram (a conferência de incêndio pede a disciplina)
    if (classe === 'outro' || classe === 'acionador' || classe === 'avisador') continue;
    for (const [x, y] of g.posicoes) pontos.push({ x, y, descricao: g.nomeLimpo, disciplina: null, classe, altura_m: null, montagem: classe === 'difusor' || classe === 'sprinkler' ? 'teto' : null });
  }
  const espacial = {
    ambientes: ambientesArq.map(a => ({ nome: a.nome, area_m2: a.area_m2, poligono: a.poligono, origem: a.origem })),
    pontos,
    // disciplina do traçado pelo prefixo/palavra da layer (CAB-, INC-, D10_TEL…); tipo,
    // material e medida pelo texto junto ao traçado, pela layer ou pela legenda — o
    // trecho com medidas diferentes vira um trecho por medida (medidasInfra.js)
    trechos: medirTrechos(
      p.linhas.filter(l => !xrefOutra(l.xref)).map(l => ({ layer: l.layer, disciplina: descreverLinha(l).disciplina, segmentos: l.segmentos || [] })).filter(t => t.segmentos.length),
      p.textosMedida || []),
  };
  // o que a legenda das pranchas ensinou (services/simbolosAprendidos.js grava)
  return { analise, pagina, pontosPorAmbiente, arquitetura, espacial, aprendizado: { legenda: r.desenho?.legenda || [] } };
}

// Classe do componente para as regras de afastamento da compatibilização
function classeDoComponente(texto) {
  const s = String(texto || '');
  if (/^Detector|DETECTOR|FUMA[ÇC]/i.test(s)) return 'detector';
  if (/^Lumin[áa]ria|LUMIN|PLAFON|SPOT|PENDENTE|DOWNLIGHT|\d+\s?W.*\d+\s?lm/i.test(s)) return 'luminaria';
  if (/^C[âa]mera|C[ÂA]MERA|(?<![A-Z])DOME|BULLET/i.test(s)) return 'camera';
  if (/^Sensor de alarme|IVP|INFRAVERMELHO/i.test(s)) return 'sensor_alarme';
  if (/DIFUSOR|GRELHA|INSUFL|VENEZIANA|TERMINAIS DE AR|\bVAV\b/i.test(s)) return 'difusor';
  if (/SPRINKLER|CHUVEIRO AUTOM/i.test(s)) return 'sprinkler';
  if (/ACCESS ?POINT|WI-?FI|^Ponto de rede.*\bAP\b|^AP\b/i.test(s)) return 'access_point';
  // incêndio (alturas e caminhamento da NBR 17240 na compatibilização; a
  // disciplina do ponto separa da botoeira de emergência do controle de acesso)
  if (/ACIONADOR/i.test(s)) return 'acionador';
  if (/SINALIZADOR|AVISADOR|SIRENE/i.test(s)) return 'avisador';
  return 'outro';
}

module.exports = { ehArquivoCad, lerArquivoCad, descreverSimbolo, descreverLinha, classeDoComponente };
