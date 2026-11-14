// Dados de entrada do gerador de unifilar de quadro (./qet/unifilar-qd.mjs) a partir do resultado das
// skills: elétrica predial (dadosUnifilar) e elétrica industrial (dadosUnifilarIndustrial). Arquivo leve,
// sem o gerador (.mjs): a skill industrial usa o adaptador sem carregar o QElectroTech. Separado de
// ./unifilar.js na 2.40, quando o adaptador da industrial veio da skill para cá (virgula e mm2 eram
// cópias idênticas nos dois).

const virgula = (n, d = 1) => String(Number(n).toFixed(d)).replace('.', ',').replace(/,0+$/, '');
const mm2 = (s) => `${virgula(s, 1)} mm²`;
const TIPO = { iluminacao: 'iluminacao', tug: 'tomada', tue: 'tue' };
const ABREV = [[/Tomadas?/g, 'TUG'], [/Iluminação/g, 'Ilum.'], [/cozinha/gi, 'coz.'], [/serviço/gi, 'serv.'], [/banheiros?/gi, 'banh.'], [/de uso geral/g, ''], [/Ar-condicionado/g, 'Ar-cond.'], [/\s+/g, ' ']];
const abreviar = (s, max) => {
  let t = String(s).trim();
  if (t.length > max) for (const [re, r] of ABREV) t = t.replace(re, r).trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

// Dados do formulário + resultado → entrada do gerador de unifilar
function dadosUnifilar(res, { quadro = 'QD-01' } = {}) {
  const { calc, dados } = res;
  const inst = dados.instalacao || {};
  const al = calc.alimentador;
  const fases = { monofasico: '1F+N+PE', bifasico: '2F+N+PE', trifasico: '3F+N+PE' }[inst.sistema] || 'F+N+PE';
  const nCondutores = { monofasico: 2, bifasico: 3, trifasico: 4 }[inst.sistema] || 3;
  const hoje = new Date();
  return {
    quadro,
    obra: dados.obra?.nome || dados.meta?.titulo || 'Obra',
    cliente: dados.cliente?.nome || '',
    local: dados.obra?.uso || '',
    data: `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`,
    rev: dados.meta?.revisao || 'R00',
    responsavel: dados.responsavel?.nome || '',
    crea: dados.responsavel?.crea ? `CREA ${dados.responsavel.crea}` : '',
    arquivo: `unifilar-${quadro.toLowerCase()}`,
    alimentacao: {
      texto: `${fases} — ${inst.tensao_fn}/${inst.tensao_ff} V — 60 Hz`,
      secao: `${nCondutores} × ${mm2(al.secao)} + PE ${mm2(al.secaoPE)} (Cu/${inst.isolacao || 'PVC'})`,
      secaoCurta: mm2(al.secao),
    },
    geral: { descricao: `${al.disjuntor} A — ${al.polos}P` },
    dr: null, // a skill dimensiona DR por circuito (5.1.3.2.2)
    dps: { descricao: `classe II\n${calc.quadro.dpsUc || 275} V — 20 kA`, secao: '4 mm²' },
    circuitos: calc.circuitos.map((c, i) => ({
      id: i + 1,
      // chuveiro/aquecedor/forno: símbolo de resistência; demais TUE: tomada
      tipo: /CHUVEIRO|AQUECEDOR|FORNO|TORNEIRA EL/i.test(c.descricao || '') ? 'chuveiro' : (TIPO[c.tipo] || 'tue'),
      // coluna de ~23 caracteres em 7 pt no unifilar: o número já aparece em "Circuito N"
      descricao: abreviar(String(c.descricao || '').split(' — ')[0], 23),
      disjuntor: `${c.disjuntor} A — ${c.polos}P`,
      secao: mm2(c.secao),
      carga: `${Math.round(c.potencia_va).toLocaleString('pt-BR')} VA`,
      dr: c.dr ? '30 mA' : null,
    })),
    notas: [
      'NOTAS',
      '1. Condutores de cobre, isolação',
      `    ${inst.isolacao || 'PVC'} 70 °C, seções em mm².`,
      '2. DR 30 mA nos circuitos indicados',
      '    (NBR 5410, 5.1.3.2.2).',
      `3. DPS classe II Uc ≥ ${calc.quadro.dpsUc || 275} V (Tab. 49).`,
      `4. Reserva no quadro: ${calc.quadro.reserva} (Tab. 59).`,
      '5. Gerado pelo sistema H&M — revisar.',
    ],
  };
}

// ── Elétrica industrial (QGBT e cada CCM/quadro) ──
// Adaptador para o gerador de unifilar de quadro (./qet/unifilar-qd.mjs → gerarUnifilarQD): mesma
// forma de dados de dadosUnifilar. Morava na skill (eletrica-industrial/scripts/lib/unifilar.js, que
// reexporta como dadosUnifilarQD) até a 2.40 — o _comum não pode depender da skill. Desenha cada saída
// com disjuntor + carga; o símbolo de motor (M 3~), contatores e relé ainda não
// existem nesse gerador — por isso a partida vai no texto do disjuntor.
const curtoTxt = (s, max) => (String(s).length > max ? `${String(s).slice(0, max - 1)}…` : String(s));
const SIGLA_PARTIDA = { direta: 'direta', estrela_triangulo: 'Y-Δ', soft_starter: 'soft', inversor: 'inversor' };

function dadosUnifilarIndustrial(res, { quadro = 'QGBT' } = {}) {
  const { calc, dados } = res;
  const c = calc.config;
  const q = quadro === 'QGBT' ? calc.qgbt : calc.quadros.find(x => x.id === quadro);
  if (!q) throw new Error(`Quadro "${quadro}" não existe (disponíveis: QGBT, ${calc.quadros.map(x => x.id).join(', ')}).`);
  const hoje = new Date();
  const cabo = quadro === 'QGBT' ? calc.entrada.cabo : q.alim;
  const geral = quadro === 'QGBT' ? calc.entrada.disjuntorGeral : q.alim.disjuntor;
  const circuitos = [];
  const add = (tipo, descricao, disjuntor, secao, carga) => circuitos.push({ id: circuitos.length + 1, tipo, descricao: curtoTxt(descricao, 23), disjuntor, secao, carga, dr: null });
  if (quadro === 'QGBT') calc.quadros.filter(x => x.alim).forEach(x => add('tue', `Alim. ${x.id}`, `${x.alim.disjuntor} A — 3P`, `${x.alim.paralelos > 1 ? `${x.alim.paralelos}×` : ''}${mm2(x.alim.secao)}`, `${virgula(x.projeto.ib, 0)} A`));
  for (const u of q.motores) {
    const prot = u.partidaInfo.dispositivos.find(d => d.ref === 'Q1' || d.ref === 'F1-F3');
    const pTxt = prot.faixa ? `${virgula(prot.faixa[0])}–${virgula(prot.faixa[1])} A` : `${prot.nominal_a} A`;
    add('tue', `${u.tag} ${virgula(u.cv)} cv ${SIGLA_PARTIDA[u.partida]}`, `${pTxt} — ${prot.tipo === 'fusivel' ? 'fus.' : 'DM'}`, `${u.circuito.condutores === 6 ? '6×' : ''}${mm2(u.circuito.secao)}`, `${virgula(u.pKw)} kW`);
  }
  for (const o of q.outras) add(o.tipo === 'iluminacao' ? 'iluminacao' : o.tipo === 'resistiva' ? 'aquecedor' : 'tomada', o.descricao, `${o.circuito.disjuntor} A — ${o.circuito.polos}P`, mm2(o.circuito.secao), `${virgula(o.kw)} kW`);
  if (quadro === 'QGBT' && calc.banco.necessario) add('tue', `Banco capac. ${virgula(calc.banco.total)} kvar`, `${calc.banco.cabo.disjuntor} A — 3P`, mm2(calc.banco.cabo.secao), `${virgula(calc.banco.total)} kvar`);
  return {
    quadro,
    obra: dados.obra?.nome || dados.meta?.titulo || 'Obra',
    cliente: dados.cliente?.nome || '',
    local: q.descricao || '',
    data: `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`,
    rev: dados.meta?.revisao || 'R00',
    responsavel: dados.responsavel?.nome || '',
    crea: dados.responsavel?.crea ? `CREA ${dados.responsavel.crea}` : '',
    arquivo: `unifilar-${quadro.toLowerCase()}`,
    alimentacao: {
      texto: `3F${cabo.secaoNeutro ? '+N' : ''}+PE — ${c.vff}/${c.vfn} V — ${c.frequencia} Hz`,
      secao: `${cabo.paralelos > 1 ? `${cabo.paralelos} × (` : ''}${cabo.secaoNeutro ? 4 : 3} × ${mm2(cabo.secao)}${cabo.paralelos > 1 ? ')' : ''} + PE ${mm2(cabo.secaoPE)} (Cu/${c.isolacao})`,
      secaoCurta: mm2(cabo.secao),
    },
    geral: { descricao: `${geral} A — 3P` },
    dr: null,
    dps: { descricao: `classe II\n${calc.dps.uc} V — 20 kA`, secao: '16 mm²' }, // Uc pela NBR 5410, Tabela 49 (antes fixo em 275 V)
    circuitos,
    notas: [
      'NOTAS',
      `1. Icc no barramento ${virgula(q.curto.icc / 1000, 1)} kA;`,
      `    Icu mínimo ${q.curto.icuMin} kA.`,
      '2. Partidas: ver memorial (contatores',
      '    AC-3, relés e soft/inversor).',
      '3. Gerado pelo sistema H&M — revisar.',
    ],
  };
}

module.exports = { dadosUnifilar, dadosUnifilarIndustrial, virgula, mm2, abreviar };
