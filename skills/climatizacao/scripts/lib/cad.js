// Climatização no CAD e no 3D — arquivo PRÓPRIO da skill (fase 4 do roteiro).
//
// 1. Tipos de ponto HVAC no mesmo formato de skills/_comum/cad/tiposDePonto.js
//    ([layer, texto, símbolo, disciplina]): difusor, grelha, VAV, fancoil,
//    evaporadora, condensadora e chiller. NÃO entram na lista geral (TIPOS) de
//    propósito: nas outras disciplinas um difusor continua sendo "referência de outra
//    área" (backend/src/services/analiseCad/index.js); quem lê um projeto DE
//    CLIMATIZAÇÃO usa `tipoDePontoClimatizacao` daqui.
// 2. Layers de climatização (HVAC, AVAC, AR-CONDICIONADO, MEC-DUTOS…): `ehLayerDaClimatizacao`
//    é o que o ponto de extensão dos leitores de DWG/PDF deve consultar quando a
//    disciplina for climatização, para essas layers deixarem de ser referência.
// 3. 3D e planta: ESPEC_3D / DISCIPLINA_3D / PREFIXO_SIMBOLO / TRECHO_3D (formato de
//    skills/_comum/cad/modelo3d.js) e SIMBOLOS_PLANTA (formato de simbolos.js) declaram as
//    peças; esta skill não edita modelo3d.js — falta ligar lá (ver o relatório da fase 4).
// 4. Planta automática (`planta`, para PLANTAS de plantasDisciplina.js): difusores em grade, grelhas de retorno no perímetro,
//    caixas VAV, evaporadoras e fancoils por ambiente, a partir do cálculo da skill.

const DISCIPLINA = 'climatizacao';

// A ordem importa (o mais específico antes): "unidade condensadora" antes de "unidade
// interna/evaporadora"; VAV antes de difusor ("difusor da VAV" é difusor só no texto).
const TIPOS_CLIMATIZACAO = [
  [/CHILLER|\bURA\b|RESFRIAD/i, /chiller|resfriador de [áa]gua|\bura\b|unidade resfriadora/i, 'HM-CLIM-CHILLER', DISCIPLINA],
  [/CONDENSAD|(^|[-_ ])(UC|UE)([-_ ]|\d|$)/i, /condensadora|unidade (externa|condensadora)|\bvrf\b.{0,20}extern/i, 'HM-CLIM-CONDENSADORA', DISCIPLINA],
  // no texto, só "VAV ..."/"caixa VAV": "difusor da VAV" é difusor
  [/(^|[-_ ])VAV([-_ ]|\d|$)|CAIXA.?VAV/i, /^\s*(caixa\s+)?vav\b|caixa\s+vav|volume de ar vari[áa]vel|caixa de vaz[ãa]o vari[áa]vel/i, 'HM-CLIM-VAV', DISCIPLINA],
  [/FAN.?COIL|FANCOLETE|(^|[-_ ])(FC|FCU|AHU|UTA|SELF)([-_ ]|\d|$)/i, /fan.?coil|fancolete|\bahu\b|\buta\b|unidade de tratamento de ar|climatizador|self.?contained|rooftop/i, 'HM-CLIM-FANCOIL', DISCIPLINA],
  [/EVAPORAD|HI.?WALL|CASSETE|CASSETTE|SPLIT|PISO.?TETO|(^|[-_ ])(UI|EV)([-_ ]|\d|$)/i, /evaporadora|hi.?wall|cassete|cassette|\bsplit\b|piso.?teto|unidade interna/i, 'HM-CLIM-EVAPORADORA', DISCIPLINA],
  [/GRELHA|VENEZ|RETORNO/i, /grelha|veneziana|retorno de ar|tomada de ar externo/i, 'HM-CLIM-GRELHA', DISCIPLINA],
  [/DIFUS|INSUFL/i, /difusor|insuflamento|insufla[çc][ãa]o/i, 'HM-CLIM-DIFUSOR', DISCIPLINA],
];
const SIMBOLOS_CLIMATIZACAO = TIPOS_CLIMATIZACAO.map(t => t[2]);

// Layers de climatização (as mesmas que hoje os leitores tratam como "outra área")
const RE_LAYER_CLIMATIZACAO = /HVAC|\bAVAC\b|^AVAC|CLIMATIZ|CLIMA[-_ ]|AR[-_ .]?COND|^AC[-_ ]|^MEC[-_ ]|MEC[-_ ]?DUTO|DUTOS?([-_ ]|$)|DIFUS|GRELHA|FAN.?COIL|CHILLER|EVAPORAD|CONDENSAD|(^|[-_ ])VAV([-_ ]|$)|^HM-CLIM/i;
const ehLayerDaClimatizacao = (layer) => RE_LAYER_CLIMATIZACAO.test(String(layer || ''));

// Trecho de duto (linha/polilinha na layer de dutos): o 3D desenha como caixa no forro
const RE_LAYER_DUTO = /DUTO|DUCT|MEC[-_ ]?DUTO/i;
const ehLayerDeDuto = (layer) => RE_LAYER_DUTO.test(String(layer || ''));

// { layer, texto } → { simbolo, disciplina } | null. Layer primeiro (quando o nome é claro);
// layer genérica de climatização ("HVAC", "AR-COND") → pelo texto da legenda/bloco.
function tipoDePontoClimatizacao({ layer = '', texto = '' } = {}) {
  const t = TIPOS_CLIMATIZACAO.find(([rl]) => rl.test(layer)) || TIPOS_CLIMATIZACAO.find(([, rt]) => rt.test(texto));
  return t ? { simbolo: t[2], disciplina: t[3] } : null;
}

// Contagem dos blocos lidos do projeto ([{ layer, nome|descricao, quantidade }]) por tipo HVAC
function contarPontos(blocos = []) {
  const cont = Object.fromEntries(SIMBOLOS_CLIMATIZACAO.map(s => [s, 0]));
  const fora = [];
  for (const b of blocos) {
    const tp = tipoDePontoClimatizacao({ layer: b.layer, texto: `${b.nome || ''} ${b.descricao || ''}` });
    if (tp) cont[tp.simbolo] += Number(b.quantidade) || 1;
    else if (ehLayerDaClimatizacao(b.layer)) fora.push(b);
  }
  return { contagem: cont, naoIdentificados: fora };
}

// ── 3D (formato de skills/_comum/cad/modelo3d.js — ESPEC / DISCIPLINAS / disciplinaDoSimbolo) ──
// Formas que o visualizador JÁ desenha (visualizador3d/app.js), em escala ilustrativa: o teste
// teste-3d.js exige forma existente e tamanho ≤ 1,2 m. Chiller e fancoil reais são maiores.
// [largura, altura, profundidade] em m; h = altura de instalação ('teto', 'piso' ou metros).
const ESPEC_3D = {
  'HM-CLIM-DIFUSOR': { h: 'teto', forma: 'luminaria', tam: [0.60, 0.60, 0.05] },
  'HM-CLIM-GRELHA': { h: 'teto', forma: 'luminaria', tam: [0.60, 0.30, 0.04] },
  'HM-CLIM-VAV': { h: 'teto', forma: 'luminaria', tam: [0.50, 0.90, 0.35] },
  'HM-CLIM-EVAPORADORA': { h: 2.3, forma: 'emergencia', tam: [0.90, 0.30, 0.22] },
  'HM-CLIM-FANCOIL': { h: 'piso', forma: 'catraca', tam: [1.20, 0.90, 0.60] },
  'HM-CLIM-CONDENSADORA': { h: 'piso', forma: 'catraca', tam: [0.85, 0.70, 0.35] },
  'HM-CLIM-CHILLER': { h: 'piso', forma: 'catraca', tam: [1.20, 1.20, 1.20] },
};
const DISCIPLINA_3D = { [DISCIPLINA]: { rotulo: 'Climatização', cor: '#5ec8f2' } };
// prefixo do símbolo → disciplina (modelo3d.disciplinaDoSimbolo usa a 2ª parte do nome: HM-CLIM-…)
const PREFIXO_SIMBOLO = { CLIM: DISCIPLINA };
// duto retangular no forro (seção padrão ilustrativa quando o projeto não diz a medida) — para TRECHOS
const TRECHO_3D = { duto: { rotulo: 'Duto de ar', secao: [0.50, 0.30], medida: '500 × 300 mm', desce: 0.40, forma: 'caixa' } };

// ── Símbolos de planta (formato de skills/_comum/cad/simbolos.js → SIMBOLOS) ──
// Ficam aqui até o 3D ter o ESPEC deles: o teste do 3D exige ESPEC para todo símbolo da
// biblioteca comum. Ligar = espalhar SIMBOLOS_PLANTA dentro de SIMBOLOS e ESPEC_3D dentro de ESPEC.
// Layers HVAC-* como no mercado.
const { point3d } = require('@tarikjabiri/dxf');
const L0 = { layerName: '0' };
const P = (x, y) => point3d(x, y);
const circ = (b, x, y, r) => b.addCircle(P(x, y), r, L0);
const lin = (b, x1, y1, x2, y2) => b.addLine(P(x1, y1), P(x2, y2), L0);
const poli = (b, pts) => pts.slice(1).forEach((p, i) => lin(b, pts[i][0], pts[i][1], p[0], p[1]));
const txt = (b, x, y, h, t) => b.addText(P(x, y), h, t, L0);
const ret = (b, a, c) => poli(b, [[-a, -c], [a, -c], [a, c], [-a, c], [-a, -c]]);
const ID = (x) => ({ tag: 'ID', x, y: 0.12, altura: 0.12, padrao: '' });
const SIMBOLOS_PLANTA = {
  'HM-CLIM-DIFUSOR': { layer: 'HVAC-DIFUSOR', legenda: 'Difusor de insuflamento (forro)', desenhar: b => { ret(b, 0.25, 0.25); lin(b, -0.25, -0.25, 0.25, 0.25); lin(b, -0.25, 0.25, 0.25, -0.25); }, atributos: [ID(0.3)] },
  'HM-CLIM-GRELHA': { layer: 'HVAC-GRELHA', legenda: 'Grelha de retorno', desenhar: b => { ret(b, 0.25, 0.12); lin(b, -0.25, -0.04, 0.25, -0.04); lin(b, -0.25, 0.04, 0.25, 0.04); }, atributos: [ID(0.3)] },
  'HM-CLIM-VAV': { layer: 'HVAC-VAV', legenda: 'Caixa VAV (acima do forro)', desenhar: b => { ret(b, 0.25, 0.15); txt(b, -0.15, -0.05, 0.1, 'VAV'); }, atributos: [ID(0.3)] },
  'HM-CLIM-FANCOIL': { layer: 'HVAC-EQUIPAMENTO', legenda: 'Fancoil / AHU / self', desenhar: b => { ret(b, 0.4, 0.25); txt(b, -0.12, -0.06, 0.12, 'FC'); }, atributos: [ID(0.45)] },
  'HM-CLIM-EVAPORADORA': { layer: 'HVAC-EVAPORADORA', legenda: 'Evaporadora (split/VRF)', desenhar: b => { ret(b, 0.4, 0.1); txt(b, -0.06, -0.05, 0.1, 'E'); }, atributos: [ID(0.45)] },
  'HM-CLIM-CONDENSADORA': { layer: 'HVAC-CONDENSADORA', legenda: 'Condensadora (split/VRF)', desenhar: b => { ret(b, 0.4, 0.3); circ(b, 0, 0, 0.22); }, atributos: [ID(0.45)] },
  'HM-CLIM-CHILLER': { layer: 'HVAC-EQUIPAMENTO', legenda: 'Chiller (resfriador de água)', desenhar: b => { ret(b, 0.6, 0.3); txt(b, -0.3, -0.06, 0.12, 'CH'); }, atributos: [ID(0.65)] },
};

// ── Planta automática (para skills/_comum/cad/plantasDisciplina.js) ───────
// Pontos por ambiente a partir do cálculo: difusores em grade, grelhas de retorno no
// perímetro, VAV (uma por caixa) em grade; split/VRF → evaporadoras no perímetro.
// Fancoil, condensadora e chiller ficam fora dos ambientes de projeto (casa de máquinas,
// cobertura): entram como nota, com a localização a definir na arquitetura.
function planta(res) {
  const { calc } = res;
  const pj = calc.projeto;
  const pontos = [];
  const porId = (id) => calc.ambientes.find(a => a.id === id);
  if (pj.sistema === 'split' || pj.sistema === 'vrf') {
    const lista = pj.sistema === 'split' ? pj.split : pj.vrf.evaporadoras;
    for (const e of lista) pontos.push({ ambiente: e.ambiente, itens: [{ simbolo: 'HM-CLIM-EVAPORADORA', n: e.n, regra: 'perimetro', prefixo: pj.sistema === 'split' ? 'SPL' : 'UI' }] });
  } else {
    for (const u of pj.unidades) {
      for (const t of u.terminais) {
        const vav = u.vavs.find(v => v.id === t.id);
        pontos.push({ ambiente: porId(t.id).nome, itens: [
          { simbolo: 'HM-CLIM-DIFUSOR', n: t.difusores, regra: 'grade', prefixo: 'DF' },
          { simbolo: 'HM-CLIM-GRELHA', n: t.grelhas, regra: 'perimetro', prefixo: 'GR' },
          ...(vav ? [{ simbolo: 'HM-CLIM-VAV', n: vav.caixas, regra: 'grade', prefixo: `VAV-${t.id}-` }] : []),
        ] });
      }
    }
  }
  const externos = [];
  if (pj.sistema === 'split') externos.push(`${pj.split.reduce((s, x) => s + x.n, 0)} condensadora(s) de split`);
  if (pj.sistema === 'vrf') externos.push(`${pj.vrf.modulosPorSistema * pj.vrf.sistemas} módulo(s) de condensadora VRF`);
  if (pj.unidades.length) externos.push(`${pj.unidades.length} ${pj.sistema === 'self' ? 'self(s)' : 'fancoil(s)/AHU'} (${pj.unidades.map(u => u.id).join(', ')})`);
  if (pj.central) externos.push(`${pj.central.nChillers} chiller(s) e ${pj.central.bombas.length} bomba(s)${pj.central.condAgua ? ` e ${pj.central.nChillers} torre(s)` : ''} na central`);
  return {
    pontos,
    notas: [
      'Difusores distribuídos em grade pela vazão de insuflamento e pela área de cobertura adotada; grelhas de retorno no perímetro — ajustar ao forro e à luminotécnica.',
      'Caixas VAV acima do forro, no ramal de cada ambiente (uma por caixa calculada).',
      ...(externos.length ? [`Fora dos ambientes (casa de máquinas, cobertura ou fachada técnica — posicionar na arquitetura): ${externos.join('; ')}.`] : []),
      'Traçado de dutos, tubulações frigorígenas/de água gelada e drenos a completar pelo projetista. [CONFERIR]',
    ],
  };
}

module.exports = {
  DISCIPLINA, TIPOS_CLIMATIZACAO, SIMBOLOS_CLIMATIZACAO, RE_LAYER_CLIMATIZACAO, ehLayerDaClimatizacao, ehLayerDeDuto,
  tipoDePontoClimatizacao, contarPontos, ESPEC_3D, DISCIPLINA_3D, PREFIXO_SIMBOLO, TRECHO_3D, SIMBOLOS_PLANTA, planta,
};
