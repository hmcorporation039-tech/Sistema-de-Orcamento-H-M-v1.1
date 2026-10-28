// Análise de Projeto a partir de DWG/DXF (versão 2.3). O desenho é lido numa
// thread à parte (services/analiseCad/worker.js → skills/_comum/cad/projetoDxf.js)
// e aqui vira o MESMO formato da análise do PDF (utils/compatibilizacaoAnalise.js):
//   - o texto remontado do desenho passa pelos leitores de texto do PDF
//     (carimbo, lista de materiais, quadro de cargas, códigos de câmera/ponto);
//   - os ambientes vêm da arquitetura (área real, não do rótulo "A=");
//   - os blocos contados viram a "contagem pelo desenho" (como a do PDF
//     vetorial), cada um com descrição (legenda da prancha, atributo, sigla
//     conhecida ou nome do bloco) e disciplina; bloco que não dá para saber o
//     que é NÃO vira material — vai para os achados, para conferir;
//   - linhas de infraestrutura (eletroduto, eletrocalha, fiação) medidas em metros.
// Tudo marcado para conferir: o desenho manda, mas sigla de bloco é convenção
// de cada escritório.
const path = require('path');
const { Worker } = require('worker_threads');
const { analisarTexto } = require('./projetoParser');
const { detectarDisciplinas } = require('./leitoresTabelaProjeto');

const RE_CAD = /\.(dwg|dxf)$/i;
const ehArquivoCad = (nome) => RE_CAD.test(String(nome || ''));

// layers medidas como infraestrutura (em metros)
const RE_LAYER_LINHA = 'ELETRODUT|ELETROCALHA|PERFILADO|LEITO|CONDU[IÍ]TE|CONDUIT|INFRA|CABEAMENTO|FIA[ÇC][ÃA]O|FIACAO|TUBELE|INST.*TUBULA|EL[ÉE]T.*TUBULA|TUBULA.*EL[ÉE]T|TUB.*(L[ÓO]GIC|TELEF|DADOS|CFTV)|(L[ÓO]GIC|TELEF|DADOS|CFTV).*(TUB|INFRA|ELETROD)';
const TEMPO_LIMITE_MS = 180 * 1000;

function lerNoWorker(buffer, nome) {
  return new Promise((ok, falha) => {
    const w = new Worker(path.join(__dirname, '..', 'services', 'analiseCad', 'worker.js'), {
      workerData: { buffer, nome, reLayerLinha: RE_LAYER_LINHA },
      resourceLimits: { maxOldGenerationSizeMb: 2048 },
    });
    const relogio = setTimeout(() => { w.terminate(); falha(new Error(`a leitura de "${nome}" passou de ${TEMPO_LIMITE_MS / 1000} s`)); }, TEMPO_LIMITE_MS);
    w.once('message', (m) => { clearTimeout(relogio); w.terminate(); m.ok ? ok(m) : falha(new Error(m.erro)); });
    w.once('error', (e) => { clearTimeout(relogio); falha(e); });
  });
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
  [/ATERR/i, 'Ponto de aterramento', 'eletrica'],
  [/DISJUNTOR|MINIDISJ|\bIDR\b|\bDR[-_ ]|\bDPS\b/i, 'Dispositivo de proteção (disjuntor/DR/DPS)', 'eletrica'],
  [/LUMIN|^LUM\b|PLAFON|SPOT|PENDENTE|ARANDELA|^ARAN|DOWNLIGHT|PAINEL LED|PERFIL (COM )?FITA|\d+\s?W.*\d+\s?lm|\blm\b/i, 'Luminária', 'iluminacao'],
  [/^(PL|PLUZ|PTO[-_ ]?LUZ)\b|PONTO DE LUZ/i, 'Ponto de luz', 'iluminacao', true],
  [/EMERG.*(LUM|BLOCO|ILUM)|BLOCO AUT|ILUMINA[ÇC][ÃA]O DE EMERG/i, 'Luminária de emergência', 'incendio'],
  [/C[ÂA]MERA|\bCAM\b|^CAM[-_ \d]|\bDOME\b|BULLET|SPEED ?DOME/i, 'Câmera de CFTV', 'cftv'],
  [/RJ-?45|L[ÓO]GIC|PONTO DE REDE|ACCESS ?POINT|WI-?FI/i, 'Ponto de rede', 'rede'],
  [/^PR\d*\b|^PD\b|^REDE\b|^AP\b/i, 'Ponto de rede', 'rede', true],
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
  [/IVP|INFRAVERMELHO|SENSOR.*PRESEN|MAGN[ÉE]TIC/i, 'Sensor de alarme', 'alarme'],
  [/^SM\b/i, 'Sensor de alarme', 'alarme', true],
  [/SIRENE/i, 'Sirene', 'alarme'],
  [/TECLADO/i, 'Teclado de alarme', 'alarme'],
  [/LEITORA?|FECHADURA|ELETRO[IÍ]M|CATRACA|BOTOEIRA|FECHO EL/i, 'Dispositivo de controle de acesso', 'controle_acesso'],
  [/TERMOSTATO|SENSOR DE (PRESS|TEMP|UMID|CO2)|BELIMO|ATUADOR|\bDDC\b|CONTROLADOR/i, 'Dispositivo de automação', 'automacao'],
  [/CARREGADOR|WALLBOX|ELETROPOSTO/i, 'Carregador veicular', 'carregador'],
];
// climatização/hidráulica (não é disciplina da H&M): não vira material nem "não identificado"
const RE_OUTRA_AREA = /DIFUSOR|GRELHA|COLARINHO|\bDUTO|DAMPER|VENEZIANA|ALÇAP|ALCAP|CURVA RET|TRANSI[ÇC][ÃA]O|UNI[ÃA]O RET|TAMPA RET|COTOVELO|ELBOW|\bTEES?\b|REDUCING|BUCHA|LUVA|V[ÁA]LVULA|REGISTRO|RALO|TORNEIRA|HIDRANTE|SPRINKLER|EXTINTOR|TERMINAIS DE AR|CONEX[ÕO]ES DE (DUTO|TUBO)|TUBULA[ÇC][ÕO]ES DE FABRICA|ACESS[ÓO]RIOS DO TUBO|FANCOIL|FAN ?COIL|EXAUSTOR|VENTILADOR|\bSPLIT\b|CONDENSADORA|EVAPORADORA|CHILLER|\bBOMBA|DANFOSS|\bDN\d+|HI-?WALL|\bBTU|CASSETE|PISO.?TETO/i;
// layer de instalação elétrica: libera as siglas curtas
const RE_LAYER_ELETRICA = /TOMADA|EL[ÉE]TRIC|ILUMINA|LUMIN|^E[-_ ]|INST\b|INST\s?-|FOR[ÇC]A|CFTV|REDE|L[ÓO]GIC|TELEF|INC[ÊE]NDIO|ALARME|SDAI/i;

const textoDescritivo = (s) => /[A-Za-zÀ-ú]{4,}/.test(s || '') && !/^\s*\d+([.,]\d+)?\s*(V|W|VA|A|kW|kVA|m|mm|cm)?\s*$/i.test(s || '');

function descreverSimbolo(g) {
  const camadas = (g.layers || [g.layer]).join(' ');
  const atributo = Object.entries(g.atributos || {}).find(([k, v]) => /DESC|TIPO|NOME|MODELO|EQUIP/.test(k) && textoDescritivo(v))?.[1];
  const nomeCurto = g.nomeLimpo.length <= 12 || RE_LAYER_ELETRICA.test(camadas);
  const sigla = SIGLAS.find(([re, , , curta]) => (!curta || nomeCurto) && (re.test(g.nomeLimpo) || re.test(g.bloco)));
  const daLegenda = textoDescritivo(g.descricaoLegenda) ? g.descricaoLegenda : null;
  // nome de bloco que já descreve (famílias do Revit: "Sensor de pressão Belimo 22ADP")
  const nomeDescritivo = /[A-Za-zÀ-ú]{3,}.*\s.*[A-Za-zÀ-ú0-9]{2,}/.test(g.nomeLimpo) && g.nomeLimpo.length >= 8;
  const emergencia = /EMERG/i.test(`${g.bloco} ${camadas}`);

  let descricao = null, origem = null;
  if (daLegenda) { descricao = daLegenda; origem = 'legenda'; }
  else if (atributo) { descricao = atributo; origem = 'atributo'; }
  else if (sigla) { descricao = sigla[1]; origem = 'sigla'; }
  else if (nomeDescritivo) { descricao = g.nomeLimpo; origem = 'nome'; }
  if (descricao && emergencia && !/EMERG/i.test(descricao)) descricao += ' (circuito de emergência)';
  // o nome do bloco vai junto: separa variantes (TB-T × TB-T1, luminária EF1 × EF2) e ajuda a conferir na planta
  if (descricao && origem !== 'nome' && !descricao.includes(g.nomeLimpo)) descricao += ` — bloco ${g.nomeLimpo}`;

  const base = `${descricao || ''} ${g.nomeLimpo} ${camadas}`;
  const outraArea = !sigla && !daLegenda && RE_OUTRA_AREA.test(`${g.nomeLimpo} ${camadas}`);
  const disciplina = (sigla && sigla[2]) || detectarDisciplinas(base)[0]?.chave
    || (/TOMADA|EL[ÉE]TRIC|^E[-_ ]|INST\b/i.test(camadas) ? 'eletrica' : null);
  return { descricao, origem, disciplina: outraArea ? null : disciplina, outraArea };
}

function descreverLinha(l) {
  const L = l.layer;
  const tipo = /ELETROCALHA/i.test(L) ? 'Eletrocalha' : /PERFILADO/i.test(L) ? 'Perfilado' : /LEITO/i.test(L) ? 'Leito para cabos'
    : /FIA[ÇC][ÃA]O|FIACAO/i.test(L) ? 'Trecho de fiação (eletroduto com condutores)' : /CABEAMENTO/i.test(L) ? 'Cabeamento (trecho)' : 'Eletroduto';
  return { descricao: `${tipo} — medido no desenho (layer "${L}")`, disciplina: detectarDisciplinas(L)[0]?.chave || null };
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

// Lê o arquivo e devolve, no formato da análise do PDF:
//   { analise, pagina (contagem pelo desenho), pontosPorAmbiente, naoIdentificados, arquitetura (para o 3D) }
async function lerArquivoCad(buffer, nome) {
  const r = await lerNoWorker(buffer, nome);
  const p = r.projeto;
  const analise = analisarTexto(p.texto, nome);
  // ambientes com área real da arquitetura (o rótulo "A=" do texto fica de reserva)
  const ambientesArq = (r.arquitetura?.ambientes || []).filter(a => a.area_m2 >= 0.8);
  if (ambientesArq.length) analise.ambientes = ambientesArq.map(a => ({ nome: a.nome, area_m2: a.area_m2 }));

  const itens = [];
  const naoIdentificados = [];
  const outraArea = [];
  for (const g of p.simbolos.filter(s => !s.fora)) {
    const d = descreverSimbolo(g);
    if (d.outraArea) { outraArea.push(g); continue; }
    if (!d.descricao || !d.disciplina) { naoIdentificados.push({ bloco: g.nomeLimpo, layer: g.layers.join(', '), quantidade: g.quantidade }); continue; }
    itens.push({
      tipo: 'simbolo', descricao: d.descricao, quantidade: g.quantidade, disciplina: d.disciplina, origemDescricao: d.origem,
      bloco: g.nomeLimpo, layer: g.layers.join(', '), posicoes: g.posicoes, ambiguo: false,
    });
  }
  for (const l of p.linhas) {
    const d = descreverLinha(l);
    itens.push({ tipo: 'linha', descricao: d.descricao, metros: l.metros, disciplina: d.disciplina, layer: l.layer, ambiguo: false });
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
  const vazio = !p.texto.replace(/\s/g, '').length && !p.simbolos.length;
  analise.semTexto = vazio;
  analise.origemCad = { formato: r.origem, versao: r.versao, legenda: p.legenda };
  const pagina = {
    pagina: r.origem === 'dwg' ? 'DWG' : 'DXF', origem: 'cad', escala: null, legenda: p.legenda,
    itens, naoIdentificados, outraArea: outraArea.reduce((s, g) => s + g.quantidade, 0),
    ...(vazio ? { aviso: 'o desenho não tem texto nem blocos (parece um PDF convertido em DWG, só com traços) — envie o PDF do projeto' } : {}),
  };
  const arquitetura = r.arquitetura?.ambientes?.length ? {
    nome_arquivo: nome, dxf: r.dxf,
    resumo: {
      ambientes: r.arquitetura.ambientes.map(a => ({ nome: a.nome, area_m2: a.area_m2, perimetro_m: a.perimetro_m, origem: a.origem })),
      portas: r.arquitetura.portas, layers: r.arquitetura.layers, fatorUnidade: r.arquitetura.fatorUnidade, origem: r.origem,
    },
  } : null;

  // posições para a compatibilização entre arquivos (utils/compatibilidadeEspacial.js):
  // os componentes identificados e também os de climatização/hidráulica
  // (difusor e sprinkler não são da H&M, mas um detector não pode ficar colado neles)
  const pontos = [];
  for (const it of itens.filter(i => i.tipo === 'simbolo')) {
    for (const [x, y] of it.posicoes) pontos.push({ x, y, descricao: it.descricao, disciplina: it.disciplina, classe: classeDoComponente(it.descricao) });
  }
  for (const g of outraArea) {
    const classe = classeDoComponente(`${g.nomeLimpo} ${g.layers.join(' ')}`);
    if (classe === 'outro') continue;
    for (const [x, y] of g.posicoes) pontos.push({ x, y, descricao: g.nomeLimpo, disciplina: null, classe });
  }
  const espacial = {
    ambientes: ambientesArq.map(a => ({ nome: a.nome, area_m2: a.area_m2, poligono: a.poligono, origem: a.origem })),
    pontos,
    trechos: p.linhas.map(l => ({ layer: l.layer, disciplina: descreverLinha(l).disciplina, segmentos: l.segmentos || [] })).filter(t => t.segmentos.length),
  };
  return { analise, pagina, pontosPorAmbiente, arquitetura, espacial };
}

// Classe do componente para as regras de afastamento da compatibilização
function classeDoComponente(texto) {
  const s = String(texto || '');
  if (/^Detector|DETECTOR|FUMA[ÇC]/i.test(s)) return 'detector';
  if (/^Lumin[áa]ria|LUMIN|PLAFON|SPOT|PENDENTE|DOWNLIGHT|\d+\s?W.*\d+\s?lm/i.test(s)) return 'luminaria';
  if (/^C[âa]mera|C[ÂA]MERA|\bDOME\b|BULLET/i.test(s)) return 'camera';
  if (/^Sensor de alarme|IVP|INFRAVERMELHO/i.test(s)) return 'sensor_alarme';
  if (/DIFUSOR|GRELHA|INSUFL|VENEZIANA|TERMINAIS DE AR|\bVAV\b/i.test(s)) return 'difusor';
  if (/SPRINKLER|CHUVEIRO AUTOM/i.test(s)) return 'sprinkler';
  if (/ACCESS ?POINT|WI-?FI|^Ponto de rede.*\bAP\b/i.test(s)) return 'access_point';
  return 'outro';
}

module.exports = { ehArquivoCad, lerArquivoCad, descreverSimbolo, descreverLinha, classeDoComponente, SIGLAS, RE_LAYER_LINHA };
