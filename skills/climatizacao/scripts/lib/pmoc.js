// Climatização — etapa 3: PMOC (Plano de Manutenção, Operação e Controle).
//
// Obrigatoriedade (conferida no texto em 02/11/2026 — ver tabelas.js):
//  - Lei 13.589/2018, art. 1º: edifícios de USO PÚBLICO E COLETIVO com ambientes
//    climatizados artificialmente devem ter PMOC — a lei não fixa limite de capacidade;
//    § 1º: também os de uso restrito (processos produtivos, laboratórios, hospitais),
//    pelos regulamentos próprios.
//  - Portaria MS 3.523/1998, art. 6º: sistema com capacidade ACIMA de 5 TR (60.000 BTU/h)
//    exige responsável técnico habilitado, que implanta e mantém o PMOC (Anexo I e
//    NBR 13971), garante a execução, mantém o registro e divulga aos ocupantes.
//    Até 5 TR em uso público e coletivo: o PMOC continua exigido pela lei; a exigência
//    de RT pela Portaria não se aplica [CONFERIR regulamentação posterior da Lei 13.589].
// Rotinas e periodicidades: tabelas.js (ROTINAS_PMOC) — critério H&M [CONFERIR Anexo I
// da Portaria 3.523 e NBR 13971].

const T = require('./tabelas');
const { num, fmt } = require('./calculo');

const LIMITE_RT_TR = 5; // Portaria 3.523/1998, art. 6º (conferido): "acima de 5 TR"

// Inventário: o informado (laudo/PMOC de sistema existente) ou o do projeto
function inventario(dados, projeto) {
  const ex = (dados.equipamentos_existentes || []).filter(e => e && T.TIPOS_EQUIPAMENTO[e.tipo]);
  if (ex.length) {
    return {
      origem: 'existente',
      itens: ex.map((e, i) => ({
        tag: e.tag || `EQ-${String(i + 1).padStart(2, '0')}`, tipo: e.tipo, rotulo: T.TIPOS_EQUIPAMENTO[e.tipo], local: e.local || '',
        tr: num(e.capacidade_tr, null) ?? (num(e.capacidade_btuh, null) != null ? Number(e.capacidade_btuh) / 12000 : null),
        fabricante: e.fabricante || '', modelo: e.modelo || '', serie: e.serie || '', quantidade: Math.max(1, Math.round(num(e.quantidade, 1))),
      })),
    };
  }
  const itens = [];
  const add = (tag, tipo, local, tr, quantidade = 1) => itens.push({ tag, tipo, rotulo: T.TIPOS_EQUIPAMENTO[tipo], local, tr, fabricante: '', modelo: '', serie: '', quantidade });
  if (!projeto) return { origem: 'projeto', itens };
  const { sistema, split, vrf, self, unidades, central } = projeto;
  if (sistema === 'split') split.forEach((s, i) => add(`SPL-${String(i + 1).padStart(2, '0')}`, 'split', s.ambiente, s.tr, s.n));
  if (sistema === 'vrf') {
    vrf.evaporadoras.forEach((e, i) => add(`UI-${String(i + 1).padStart(2, '0')}`, 'vrf_evap', e.ambiente, e.kw * 1000 / T.W_POR_TR, e.n));
    for (let s = 1; s <= vrf.sistemas; s++) add(`UE-${String(s).padStart(2, '0')}`, 'vrf_cond', `Sistema ${s} (${vrf.modulosPorSistema} módulo(s))`, (vrf.modulo * vrf.modulosPorSistema * 1000) / T.W_POR_TR, 1);
  }
  if (sistema === 'self') self.forEach(s => add(s.unidade, 'self', s.ambientes.join(', '), s.tr, s.n));
  if (sistema === 'chiller') {
    unidades.forEach(u => add(u.id, 'fancoil', u.ambientes.join(', '), u.tr, 1));
    unidades.forEach(u => u.vavs.forEach(v => add(`VAV-${v.id}`, 'vav', v.ambiente, null, 1)));
    for (let i = 1; i <= central.nChillers; i++) add(`CH-${String(i).padStart(2, '0')}`, 'chiller', 'Central de água gelada', central.trPorChiller, 1);
    if (central.condAgua) for (let i = 1; i <= central.nChillers; i++) add(`TR-${String(i).padStart(2, '0')}`, 'torre', 'Central de água gelada', central.torreTr, 1);
    central.bombas.forEach(b => add(b.tag, 'bomba', `Central — ${b.funcao}`, null, 1));
  }
  return { origem: 'projeto', itens };
}

function obrigatoriedade(dados, trTotal) {
  const p = dados.pmoc || {};
  const usoPublico = p.uso_publico_coletivo !== false && (dados.projeto || {}).uso_publico_coletivo !== false;
  const acimaRt = trTotal > LIMITE_RT_TR + 1e-9;
  const texto = usoPublico
    ? `PMOC OBRIGATÓRIO — edificação de uso público e coletivo com climatização artificial (Lei 13.589/2018, art. 1º; a lei não fixa capacidade mínima).${acimaRt ? ` Capacidade total ${fmt(trTotal, 1)} TR acima de ${LIMITE_RT_TR} TR: responsável técnico habilitado obrigatório (Portaria MS 3.523/1998, art. 6º).` : ` Capacidade total ${fmt(trTotal, 1)} TR até ${LIMITE_RT_TR} TR: a Portaria 3.523, art. 6º, não exige responsável técnico, mas o plano continua exigido pela lei. [CONFERIR regulamentação]`}`
    : `Uso privado/residencial: PMOC não exigido pela Lei 13.589/2018 (que trata de uso público e coletivo) — recomendado como boa prática${acimaRt ? `; acima de ${LIMITE_RT_TR} TR a Portaria 3.523, art. 6º, pede responsável técnico` : ''}. [CONFERIR enquadramento]`;
  return { usoPublico, acimaRt, obrigatorio: usoPublico, rtObrigatorio: acimaRt, limiteTr: LIMITE_RT_TR, texto };
}

// Plano: rotinas por tipo de equipamento presente + rotinas gerais, com o cronograma anual
function plano(inv) {
  const tipos = [...new Set(inv.itens.map(e => e.tipo))];
  const linhas = [];
  for (const tipo of [...tipos, 'geral']) {
    const tags = tipo === 'geral' ? 'Todo o sistema' : inv.itens.filter(e => e.tipo === tipo).map(e => e.tag).join(', ');
    for (const [rotina, per] of T.ROTINAS_PMOC[tipo] || []) {
      linhas.push({ tipo, rotulo: tipo === 'geral' ? 'Sistema (geral)' : T.TIPOS_EQUIPAMENTO[tipo], rotina, periodicidade: per, rotuloPeriodicidade: T.PERIODICIDADES[per], equipamentos: tags, meses: T.MESES_DA_PERIODICIDADE[per] });
    }
  }
  // execuções previstas no ano por equipamento (contagem para o contrato de manutenção)
  const visitasMensais = inv.itens.reduce((s, e) => s + e.quantidade, 0);
  return { linhas, visitasMensais };
}

function calcularPmoc(dados, projeto) {
  const inv = inventario(dados, projeto);
  // capacidade do sistema = a dos equipamentos que produzem frio; sem eles no inventário
  // (só as unidades internas informadas), a soma das unidades internas
  const soma = (tipos) => inv.itens.filter(e => tipos.includes(e.tipo)).reduce((s, e) => s + (e.tr || 0) * e.quantidade, 0);
  const trTotal = soma(['split', 'vrf_cond', 'self', 'chiller']) || soma(['fancoil', 'vrf_evap']);
  const ob = obrigatoriedade(dados, trTotal);
  const pl = plano(inv);
  const p = dados.pmoc || {};
  const avisos = [];
  if (ob.rtObrigatorio && !(p.responsavel_tecnico && p.registro_profissional)) avisos.push(`PMOC: informe o responsável técnico habilitado e o registro profissional (CREA/CFT) — obrigatório acima de ${LIMITE_RT_TR} TR (Portaria 3.523, art. 6º).`);
  if (!inv.itens.length) avisos.push('PMOC: nenhum equipamento no inventário — informe os equipamentos existentes ou calcule o projeto.');
  return {
    inventario: inv, trTotal, obrigatoriedade: ob, plano: pl, avisos,
    rt: { nome: p.responsavel_tecnico || '', registro: p.registro_profissional || '', art: p.art_trt || '' },
    ocupantes: { fixos: num(p.ocupantes_fixos, null), flutuantes: num(p.ocupantes_flutuantes, null) },
    areaClimatizada: num(p.area_climatizada_m2, null) ?? (projeto ? projeto.ambientes.reduce((s, a) => s + a.area, 0) : null),
    inicio: p.data_inicio || '',
  };
}

module.exports = { LIMITE_RT_TR, inventario, obrigatoriedade, plano, calcularPmoc };
