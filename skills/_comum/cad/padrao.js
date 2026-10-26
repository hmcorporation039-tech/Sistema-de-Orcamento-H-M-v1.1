// Padrão H&M de layers para os desenhos gerados pelas skills (padrao-hm.json):
// <DISC>-<ELEMENTO>[-SUB][-EXIST|-DEMOL], uma disciplina por prefixo (ELE,
// ILU, CAB, CFTV, ACE, ALM, INC, SPDA, AUT, FV, VE), G- para a folha (carimbo,
// legenda, notas), ARQ-BASE para a arquitetura recebida (cinza, só referência).
// A NBR 5444 de simbologia foi cancelada em 2014 sem substituta; diagramas
// seguem a IEC 60617. Desenho em milímetros, como as pranchas da empresa.
const padrao = require('./padrao-hm.json');

// Tipos de linha usados no padrão (definidos no DXF; os complexos do AutoCAD,
// como FENCELINE1, viram tracejados simples aqui). Padrões em mm de PAPEL.
const TIPOS_LINHA = {
  DASHED: { descricao: '__ __ __ __', elementos: [12.7, -6.35] },
  HIDDEN: { descricao: '_ _ _ _ _ _', elementos: [6.35, -3.175] },
  CENTER: { descricao: '____ _ ____ _', elementos: [31.75, -6.35, 6.35, -6.35] },
  DASHDOT: { descricao: '__ . __ . __', elementos: [12.7, -6.35, 0, -6.35] },
};
const tipoLinha = (t) => {
  const n = String(t || 'CONTINUOUS').toUpperCase();
  if (n === 'CONTINUOUS' || TIPOS_LINHA[n]) return n;
  return /HIDDEN/.test(n) ? 'HIDDEN' : /CENTER/.test(n) ? 'CENTER' : 'DASHED';
};

const LAYERS = padrao.layers
  .filter(l => l.nome !== '0' && l.nome.toUpperCase() !== 'DEFPOINTS')
  .map(l => ({ nome: l.nome, cor: Number(l.cor) || 7, tipoLinha: tipoLinha(l.tipoLinha) }));

const CARIMBO = padrao.carimbo;

module.exports = { LAYERS, TIPOS_LINHA, CARIMBO, padrao };
