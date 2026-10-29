// Disciplina e altura de instalação de um componente de CAD pelo nome do bloco
// e pela layer — uma tabela EXPLÍCITA, gerada da própria biblioteca de
// símbolos da H&M (./simbolos.js) e do padrão de layers (./padrao.js), mais os
// prefixos usuais de outros escritórios. Antes, só o texto livre decidia: 28 dos
// 47 blocos H&M não eram reconhecidos sem legenda e as layers CAB-, INC-, CA-,
// ELE-, ILU-, ALM- davam disciplina nula (a eletrocalha de cabeamento entrava
// em "Incêndio", a de telecom em "Elétrica") — revisão de 29/10/2026.
// Usado por skills/_comum/cad/projetoDxf.js e arquitetura.js e, no backend, por
// services/analiseCad e utils/compatibilidadeEspacial.js. Nenhum dado de cliente.
const { SIMBOLOS } = require('./simbolos');
const { padrao } = require('./padrao');

// prefixo de disciplina do padrão H&M (<DISC>-<ELEMENTO>) → chave da análise de projeto
const PREFIXO_HM = {
  ELE: 'eletrica', ILU: 'iluminacao', CAB: 'rede', TEL: 'telefonia', ANT: 'antena', CFTV: 'cftv',
  ACE: 'controle_acesso', ALM: 'alarme', INC: 'incendio', SPDA: 'spda', AUT: 'automacao', FV: 'solar', VE: 'carregador',
  // só em nome de bloco (HM-HOSP-…, HM-SOL-…)
  HOSP: 'eletrica_hospitalar', SOL: 'solar',
};
// prefixos de outros escritórios (token inteiro da layer ou do nome do bloco)
const PREFIXO_OUTROS = {
  CA: 'controle_acesso', CTRL: 'controle_acesso', SDAI: 'incendio', SPCI: 'incendio', LOG: 'rede', LOGICA: 'rede', DADOS: 'rede',
  REDE: 'rede', TI: 'rede', TELECOM: 'rede', CABEAMENTO: 'rede', ILUM: 'iluminacao', LUM: 'iluminacao', ELET: 'eletrica', ELETRICA: 'eletrica',
  CFTV: 'cftv', CAM: 'cftv', ALARME: 'alarme', INCENDIO: 'incendio', TELEFONIA: 'telefonia', TELEF: 'telefonia', INTERFONE: 'telefonia',
  ANTENA: 'antena', TV: 'antena', CATV: 'antena', MATV: 'antena', SPDA: 'spda', AUTOMACAO: 'automacao', BMS: 'automacao', SOLAR: 'solar', FOTOVOLTAICO: 'solar',
};
// palavras em qualquer posição da layer ("INST - CFTV", "TUBULAÇÃO LÓGICA")
const PALAVRAS = [
  [/CFTV|C[ÂA]MERAS?\b/i, 'cftv'],
  [/INC[ÊE]NDIO|\bSDAI\b|DETEC[ÇC][ÃA]O/i, 'incendio'],
  [/ALARME|INTRUS[ÃA]O/i, 'alarme'],
  [/CONTROLE.?DE.?ACESSO|\bACESSO\b/i, 'controle_acesso'],
  [/L[ÓO]GICA|\bDADOS\b|CABEAMENTO|TELECOM/i, 'rede'],
  [/TELEFONIA|TELEF[ÔO]N|INTERFON/i, 'telefonia'],
  [/ANTENA|\bCATV\b|\bMATV\b/i, 'antena'],
  [/\bSPDA\b|PARA.?RAIOS?/i, 'spda'],
  [/AUTOMA[ÇC][ÃA]O|\bBMS\b|SUPERVIS[ÓO]RIO/i, 'automacao'],
  [/FOTOVOLT|\bSOLAR\b/i, 'solar'],
  [/ILUMINA[ÇC][ÃA]O|LUMIN[ÁA]RIA/i, 'iluminacao'],
  [/EL[ÉE]TRIC|TOMADAS?\b|\bFOR[ÇC]A\b/i, 'eletrica'],
];

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

// "XREF$0$BLOCO" (xref inserida com bind) → { xref: 'XREF', nome: 'BLOCO' };
// "XREF|BLOCO" (xref anexada) idem. O nome do bloco é o que vem DEPOIS.
function separarXref(nome) {
  const s = String(nome || '');
  // o último "$N$" (o bloco pode ser anônimo: "XREF$0$A$C12AB1871"); xref aninhada: a de fora
  const m = /^(.*)\$\d+\$(.*)$/.exec(s) || /^(.*)\|(.*)$/.exec(s);
  if (!m || !m[2] || !m[1]) return { xref: null, nome: s };
  return { xref: m[1].replace(/(?:\$\d+\$|\|).*$/, '') || null, nome: m[2] };
}

// disciplina pelos tokens iniciais ("CAB-ELETROCALHA", "D10_TEL_ELETROCALHAS",
// "-ELE-EQUIPTOS SIST", "CFTV_CAMERA") e, se não houver, pelas palavras
function disciplinaDoTexto(texto, { palavras = true } = {}) {
  const s = semAcento(separarXref(texto).nome).toUpperCase();
  const tokens = s.split(/[-_.\s]+/).filter(Boolean);
  // o PRIMEIRO token (depois de um número de pavimento/folha: "D10_TEL"); um token
  // de disciplina mais adiante não vale ("ARQ-ANT-TXT" é texto da arquitetura, não antena)
  const primeiro = tokens.find(t => !/^[A-Z]?\d+$/.test(t));
  const d = primeiro && (PREFIXO_HM[primeiro] || PREFIXO_OUTROS[primeiro]);
  if (d) return d;
  if (palavras) for (const [re, d] of PALAVRAS) if (re.test(s)) return d;
  return null;
}
const disciplinaDaLayer = (layer) => disciplinaDoTexto(layer);
// nome de bloco: só o prefixo (palavra solta no nome é tratada pelas siglas de quem chama)
const disciplinaDoBloco = (nome) => disciplinaDoTexto(nome, { palavras: false });

// o nome sem o prefixo de disciplina: "ELE QD" → "QD", "INC DET FUMACA" → "DET FUMACA"
function semPrefixoDeDisciplina(nome) {
  const s = String(nome || '').trim();
  const m = /^([A-Za-z]{2,5})[-_\s]+(.+)$/.exec(s);
  if (!m) return s;
  const t = semAcento(m[1]).toUpperCase();
  return (PREFIXO_HM[t] || PREFIXO_OUTROS[t]) ? m[2].trim() : s;
}

// Altura de instalação num texto ("h=1,20m", "H = 0,30 m", "(teto)", "piso",
// "topo da porta"). Devolve { altura_m, montagem } ou null quando não diz.
function alturaDoTexto(texto) {
  const s = semAcento(texto).toLowerCase();
  if (!s.trim()) return null;
  const m = /\bh\s*[=:]\s*(\d+(?:[.,]\d+)?)\s*(m|cm)?\b/.exec(s) || /\baltura\s*[=:]?\s*(\d+(?:[.,]\d+)?)\s*(m|cm)?\b/.exec(s);
  if (m) {
    let v = Number(m[1].replace(',', '.'));
    if (m[2] === 'cm' || (!m[2] && v > 10)) v /= 100;
    if (v >= 0 && v <= 30) return { altura_m: Math.round(v * 100) / 100, montagem: v === 0 ? 'piso' : 'parede' };
  }
  if (/\b(teto|forro|laje)\b/.test(s)) return { altura_m: null, montagem: 'teto' };
  if (/\bpiso\b/.test(s)) return { altura_m: 0, montagem: 'piso' };
  if (/topo da porta|sobre a porta|acima da porta/.test(s)) return { altura_m: 2.1, montagem: 'parede' };
  return null;
}

// Tabela da biblioteca H&M: bloco → descrição (legenda), disciplina, layer e altura
const BLOCOS_HM = Object.fromEntries(Object.entries(SIMBOLOS).map(([nome, s]) => {
  const [, discBloco] = nome.split('-');
  // o prefixo do NOME manda (HM-ELE-INTERRUPTOR é da elétrica, mesmo na layer ILU-INTERRUPTOR)
  const disciplina = PREFIXO_HM[discBloco] || disciplinaDaLayer(s.layer);
  const alt = alturaDoTexto(s.legenda) || (/sensor de presen|detector|ponto de luz|^lumin[áa]ria \(|\(AP\)/i.test(s.legenda) ? { altura_m: null, montagem: 'teto' } : null);
  return [nome, { descricao: s.legenda, disciplina, layer: s.layer, ...(alt || {}) }];
}));

// prefixos de layer do padrão H&M por disciplina (padrao-hm.json), para conferência
const LAYERS_HM = (padrao.layers || []).map(l => l.nome).filter(n => /^[A-Z]+-/.test(n));
const PREFIXOS_LAYER_HM = Object.fromEntries([...new Set(LAYERS_HM.map(n => n.split('-')[0]))].filter(p => PREFIXO_HM[p]).map(p => [p, PREFIXO_HM[p]]));
// layer de instalação de qualquer disciplina (prefixo H&M ou de outro escritório): o que
// está nela não é parede nem ambiente
const ehLayerDeInstalacao = (layer) => !!disciplinaDoTexto(layer, { palavras: false });

module.exports = {
  BLOCOS_HM, PREFIXO_HM, PREFIXO_OUTROS, PREFIXOS_LAYER_HM,
  separarXref, disciplinaDaLayer, disciplinaDoBloco, disciplinaDoTexto, semPrefixoDeDisciplina, alturaDoTexto, ehLayerDeInstalacao,
};
