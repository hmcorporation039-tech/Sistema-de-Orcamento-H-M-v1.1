// Disciplina PRESSURIZAÇÃO DE ESCADAS — controle de fumaça por pressurização da escada
// de segurança e automação do sistema (ABNT NBR 14880; CBMDF NT 10/2015, 4.3.1.10;
// CBMGO NT 13/2025 / IT 13 do CBPMESP como método de cálculo) — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const T = require('./tabelas');
const { calcular } = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-edificio.json');

const NORMAS = [
  ['ABNT NBR 14880:2014', 'Saídas de emergência em edifícios — Escada de segurança — Controle de fumaça por pressurização'],
  ['CBMDF — Norma Técnica nº 10/2015', 'Saídas de emergência (Portaria nº 02/2015-CBMDF), item 4.3.1.10 — escadas à prova de fumaça pressurizadas [CONFERIR revisão vigente]'],
  ['CBMGO — Norma Técnica 13/2025', 'Pressurização de escada de segurança (método de cálculo, Anexos A, B e F) — mesmo texto da IT 13 do CBPMESP'],
  ['CBPMESP — Instrução Técnica nº 13', 'Pressurização de escada de segurança (referência complementar) [CONFERIR edição]'],
  ['ABNT NBR 9077', 'Saídas de emergência em edifícios'],
  ['ABNT NBR 11742', 'Porta corta-fogo para saída de emergência'],
  ['ABNT NBR 17240:2010', 'Sistemas de detecção e alarme de incêndio — projeto, instalação, comissionamento e manutenção'],
  ['ABNT NBR 16401-3', 'Instalações de ar-condicionado — qualidade do ar interior (filtros da tomada de ar)'],
  ['ABNT NBR 5410:2004', 'Instalações elétricas de baixa tensão (circuitos dos motores)'],
  ['ABNT NBR IEC 61439', 'Conjuntos de manobra e comando de baixa tensão (painel de comando)'],
  ['AMCA 203 / AMCA 201', 'Medição de ventiladores em campo / efeito do sistema'],
  ['ASHRAE Handbook — Fundamentals, cap. 21', 'Projeto de dutos (perda por atrito, fator de Altshul-Tsal)'],
];
const SECOES_CHECKLIST = ['Documentação', 'Escada e portas corta-fogo', 'Ventiladores e casa de máquinas', 'Tomada de ar e distribuição', 'Controle de pressão e alívio', 'Automação e painel de comando', 'Detecção e acionamento', 'Energia e cabos'];

const num = (v, c = 2) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));
const sim = (b) => (b ? 'atende' : 'NÃO ATENDE');
const vazio = (v) => v == null || v === '';
const m3h = (q) => `${num(q * 3600, 0)} m³/h`;

// ── Inspeção: medições ──────────────────────────────────────────────────────

function medicoes(insp, calc) {
  const { c, vent } = calc;
  const dpMin = T.PRESSAO.minimo_medido_fracao * c.dp;
  const pressoes = (insp.pressoes || []).map(m => ({
    ...m, criterio: `${num(dpMin, 0)} a ${num(c.dpMax, 0)} Pa`,
    resultado: vazio(m.dp_pa) ? 'NV' : Number(m.dp_pa) >= dpMin && Number(m.dp_pa) <= c.dpMax ? 'C' : 'NC',
  }));
  const velocidades = (insp.velocidades || []).map(m => {
    const pts = Number(m.pontos) || null;
    return { ...m, criterio: `≥ ${num(c.vPorta)} m/s (média de ≥ 12 pontos)`, obs: pts && pts < 12 ? `só ${pts} pontos (5.5.4 pede ≥ 12)` : '',
      resultado: vazio(m.media_ms) ? 'NV' : Number(m.media_ms) >= c.vPorta ? 'C' : 'NC' };
  });
  const forcas = (insp.forcas || []).map(m => ({ ...m, criterio: `≤ ${num(c.limiteForca, 0)} N [CONFERIR]`, resultado: vazio(m.forca_n) ? 'NV' : Number(m.forca_n) <= c.limiteForca ? 'C' : 'NC' }));
  const ensaios = (insp.ensaios || []).map(m => {
    const informado = ['C', 'NC'].includes(m.resultado) ? m.resultado : null;
    const r = informado || (vazio(m.tempo_s) ? 'NV' : Number(m.tempo_s) <= c.tempoPartidaMax ? 'C' : 'NC');
    return { ...m, criterio: vazio(m.tempo_s) ? 'funcional' : `≤ ${num(c.tempoPartidaMax, 0)} s [CONFERIR]`, resultado: r };
  });
  const ventiladores = (insp.ventiladores || []).map(m => ({
    ...m, esperado: vent.qVentM3h, criterio: `≥ 90 % de ${num(vent.qVentM3h, 0)} m³/h`,
    resultado: vazio(m.vazao_m3h) ? 'NV' : Number(m.vazao_m3h) >= 0.9 * vent.qVentM3h ? 'C' : 'NC',
  }));
  return { pressoes, velocidades, forcas, ensaios, ventiladores };
}

function processar(dados) {
  const calc = calcular(dados);
  const insp = dados.inspecao || {};
  const na = {};
  if (calc.arr.n === 1) Object.assign(na, { V2: 'Ventilador único admitido (CBMDF NT 10, 4.3.1.10.3 c)', A2: 'Ventilador único — sem reversão' });
  const med = medicoes(insp, calc);
  const porEnsaio = {
    P1: med.pressoes, P2: med.velocidades, P4: med.forcas,
    A2: med.ensaios.filter(m => /revers/i.test(m.ensaio || '')),
    R1: med.ensaios.filter(m => /detector|detec/i.test(m.ensaio || '')),
  };
  const informados = new Set((insp.checklist || []).filter(x => x.situacao && x.situacao !== 'NV').map(x => x.cod));
  const automaticos = Object.entries(porEnsaio).flatMap(([cod, lista]) => {
    const medidos = lista.filter(m => m.resultado && m.resultado !== 'NV');
    if (informados.has(cod) || !medidos.length) return [];
    const nc = medidos.some(m => m.resultado === 'NC');
    return [{ cod, situacao: nc ? 'NC' : 'C', obs: `${nc ? 'Não conforme' : 'Conforme'} nas medições da seção 6 (${medidos.length} medição(ões)).` }];
  });
  const checklist = I.mesclarChecklist(CHECKLIST, [...(insp.checklist || []).filter(x => !automaticos.some(a => a.cod === x.cod)), ...automaticos], na);
  const ncs = I.consolidarNcs(checklist, insp.ncs || []);
  const parecer = I.parecer(checklist, ncs, [...med.pressoes, ...med.velocidades, ...med.forcas, ...med.ensaios, ...med.ventiladores]);
  return { dados, calc, insp, checklist, ncs, med, parecer };
}

// ── Textos reaproveitados ───────────────────────────────────────────────────

function textoArranjo(calc) {
  return `${calc.arr.n} × ${num(calc.vent.cv)} cv — ${T.ARRANJOS[calc.arr.arranjo]}`;
}

function linhasPortas(v) {
  const grupos = new Map();
  v.portas.forEach((p, i) => {
    const k = p.linha;
    const g = grupos.get(k) || { descricao: p.descricao, tipo: T.PORTAS[p.tipo].rotulo, sentido: p.sentido === 'saida' ? 'saída' : 'acesso', qtd: 0, abertas: 0, fresta: p.frestaEfetiva, vao: p.vao };
    g.qtd++;
    if (v.abertas.includes(i)) g.abertas++;
    grupos.set(k, g);
  });
  return [...grupos.values()];
}

// ── Resumo para a tela ──────────────────────────────────────────────────────

function resumir(res) {
  const { calc } = res;
  const { c, v, d, vent, al, aut } = calc;
  const temInspecao = (res.insp.checklist || []).length || (res.insp.pressoes || []).length || (res.insp.velocidades || []).length;
  const fMax = Math.max(...v.forcas.map(f => f.f60), 0);
  return {
    indicadores: [
      { rotulo: 'Edificação', valor: `${T.OCUPACOES[c.grupo].split(' — ')[1]} · ${num(c.altura, 1)} m`, detalhe: `${c.pavimentos} pavimentos · ${v.portas.length} PCF · PCF abertas no cálculo: ${v.npa} (Tabela B1${v.reuniao ? ' + reunião de público' : ''})` },
      { rotulo: 'Vazão com PCF fechadas (QFT)', valor: `${num(v.qft, 2)} m³/s`, detalhe: `A = ${num(v.areas.total, 3)} m² · ΔP ${num(c.dp, 0)} Pa · Q = 0,827·A·ΔP^(1/N)` },
      { rotulo: 'Vazão com PCF abertas (QAT)', valor: `${num(v.qat, 2)} m³/s`, ok: true, detalhe: `APA = ${num(v.apa, 2)} m² · V com QFT = ${num(v.vpa, 2)} m/s → corrigida para ${num(c.vPorta)} m/s` },
      { rotulo: 'Vazão de projeto (QTS)', valor: `${num(v.qts, 2)} m³/s · ${m3h(v.qts)}`, detalhe: `QT = ${num(v.qt, 2)} m³/s (${v.criterio}) × ${num(v.fatorTotal)} (dutos ${T.ROTULO_DUTO[c.tipoDuto]} + não identificados)` },
      { rotulo: 'Alívio de sobrepressão', valor: v.qd > 0 ? `${num(v.qd, 2)} m³/s · ${num(v.areaDamper, 3)} m² livres` : 'não necessário', detalhe: `${T.ALIVIOS[c.alivio]} · QFT a ${num(c.dpMax, 0)} Pa = ${num(v.qftd, 2)} m³/s` },
      { rotulo: 'Força de abertura (60 Pa)', valor: `${num(fMax, 0)} N`, ok: v.forcas.every(f => f.atende), detalhe: `limite ${num(c.limiteForca, 0)} N [CONFERIR] · fechador ${num(c.fechador, 0)} N` },
      { rotulo: 'Duto e grelhas', valor: `${num(d.largura)} × ${num(d.altura)} m · ${num(d.v, 1)} m/s`, ok: d.v <= c.vLimiteDuto, detalhe: `${d.nGrelhas} grelhas de ${m3h(d.qGrelha)} · tomada de ar ≥ ${num(d.areaTomada, 2)} m²` },
      { rotulo: 'Pressão estática do ventilador', valor: `${num(d.pressao, 0)} Pa`, detalhe: `estimada: atrito ${num(d.atrito, 0)} Pa + localizadas + ${num(c.dpMax, 0)} Pa na escada + ${num(T.PERDAS_PADRAO.efeito_sistema * 100, 0)} % efeito do sistema [CONFERIR]` },
      { rotulo: 'Ventiladores', valor: textoArranjo(calc), detalhe: `${m3h(vent.qVent)} cada · eixo ${num(vent.pEixo / 1000, 2)} kW (η ${num(c.rendimento)}) · In ${num(vent.in, 1)} A` },
      { rotulo: 'Partida e controle', valor: T.PARTIDAS[c.partida], detalhe: `${aut.nSensores} transmissor(es) de ΔP · ${calc.arr.n} pressostato(s) de fluxo${vent.velocidadeMin ? ` · rotação mínima ~${num(vent.velocidadeMin * 100, 0)} %` : ''}` },
      { rotulo: 'Alimentação (NBR 5410)', valor: al.circuitos.map(ci => `${ci.id}: ${num(ci.secao)} mm² · ${ci.disjuntor} A`).join(' / '), detalhe: `${al.fonte === 'gerador' ? 'gerador 4 h' : 'antes da chave geral'} · queda ${num(al.circuitos[0].queda, 2)} % · cabo resistente ao fogo 2 h` },
      { rotulo: 'Automação — pontos de E/S', valor: `ED ${aut.totais.ED} · SD ${aut.totais.SD} · EA ${aut.totais.EA} · SA ${aut.totais.SA}`, detalhe: `controlador com 20 % de reserva: ${aut.comReserva.ED}/${aut.comReserva.SD}/${aut.comReserva.EA}/${aut.comReserva.SA}` },
      ...(calc.existente ? [{ rotulo: 'Ventilador existente', valor: `${num(calc.existente.vazao, 0)} m³/h · ${num(calc.existente.pressao, 0)} Pa`, ok: calc.existente.atendeVazao !== false && calc.existente.atendePressao !== false, detalhe: `requerido ${num(vent.qVentM3h, 0)} m³/h · ${num(vent.pressao, 0)} Pa` }] : []),
      ...(temInspecao ? [{ rotulo: 'Parecer da inspeção', valor: res.parecer.situacao.replace(/_/g, ' '), ok: res.parecer.situacao === 'CONFORME' ? true : res.parecer.situacao === 'INCONCLUSIVO' ? undefined : false, detalhe: `NC ${res.ncs.length} · NV ${res.parecer.cont.NV}` }] : []),
    ],
    textos: calc.avisos,
    tabelas: [
      { titulo: 'Áreas de escape por grupo de portas', colunas: ['Portas', 'Tipo', 'Sentido', 'Qtd.', 'Abertas', 'Fresta (m²)', 'Vão (m²)'], linhas: linhasPortas(v).map(g => [g.descricao, g.tipo, g.sentido, g.qtd, g.abertas, num(g.fresta, 4), num(g.vao, 2)]) },
      { titulo: 'Pressão estática estimada do ventilador', colunas: ['Parcela', 'Pa', 'Referência'], linhas: [...d.linhas.map(l => [l[0], num(l[1], 1), l[2]]), [`Efeito do sistema (${num(T.PERDAS_PADRAO.efeito_sistema * 100, 0)} %)`, num(d.efeito, 1), 'AMCA 201'], ['TOTAL', num(d.pressao, 0), '']] },
      { titulo: 'Pontos de entrada e saída do painel', colunas: ['Tag', 'Tipo', 'Descrição', 'Origem'], linhas: aut.pontos.map(p => [p.tag, p.tipo, p.descricao, p.origem]) },
    ],
  };
}

// ── Memorial descritivo e de cálculo ────────────────────────────────────────

function secoesMemorial(res) {
  const { calc, dados } = res;
  const { c, v, d, vent, arr, al, aut } = calc;
  const obra = dados.obra?.nome || 'a edificação';
  const esc = dados.escada?.nome || 'Escada 1';
  const s = [];
  s.push({ titulo: '1. Objeto e normas', paragrafos: [
    `Memorial descritivo e de cálculo do sistema de pressurização da escada de segurança "${esc}" de "${obra}" — controle de fumaça por pressurização (escada à prova de fumaça pressurizada — PFP), com o sistema de ventilação, o alívio de sobrepressão, a alimentação elétrica e a automação.`,
    'Base normativa: ABNT NBR 14880 (método de pressurização), CBMDF Norma Técnica nº 10/2015 — Saídas de emergência, item 4.3.1.10 (exigências do Distrito Federal) e, para o método de cálculo, a CBMGO NT 13/2025, de mesmo texto da IT 13 do CBPMESP. A NBR 14880:2014 não foi conferida na íntegra nesta revisão. [CONFERIR]',
  ], kv: [
    ['Ocupação / altura', `${T.OCUPACOES[c.grupo]} · ${num(c.altura, 1)} m · ${c.pavimentos} pavimentos atendidos pela escada`],
    ['Sistema', `${c.doisEstagios ? '2 estágios (15 Pa contínuo + 50 Pa em emergência)' : '1 estágio (somente em emergência)'} · jurisdição ${c.jurisdicao === 'DF' ? 'CBMDF' : 'outra (critérios da NT 13/IT 13)'}`],
    ['Antecâmara', v.antecamara ? 'sim, não pressurizada (frestas em série)' : 'não'],
    ['Local (densidade do ar)', `${num(c.altitude, 0)} m, ${num(c.temperatura, 0)} °C — ρ ≈ ${num(calc.rho, 3)} kg/m³ (cálculo em ar padrão 1,204 kg/m³)`],
  ] });
  s.push({ titulo: '2. Critérios de projeto', marcadores: [
    `Diferencial de pressão de projeto ${num(c.dp, 0)} Pa com todas as PCF fechadas, sem passar de ${num(c.dpMax, 0)} Pa (NT 13 Tabela A1 e 5.1.5.1; CBMDF NT 10, 4.3.1.10.2 r).`,
    `Velocidade mínima de ${num(c.vPorta)} m/s saindo pelas PCF consideradas abertas (5.1.6.4 c); 4 m/s em abertura permanente (5.1.6.4 b).`,
    `PCF abertas no cálculo: ${v.npa} (Tabela B1: ${T.OCUPACOES[c.grupo].split(' — ')[1]} ${c.grupo === 'A' ? '≤ 80 m → 1, acima → 2' : c.grupo === 'D' ? '≤ 21 m → 1, acima → 2' : '→ 2'}${v.reuniao ? '; +1 por local de reunião de público, 5.1.6.4 f' : ''}).`,
    `Vazamentos: +${num(v.fatorDuto * 100, 0)} % nos dutos (${T.ROTULO_DUTO[c.tipoDuto]}) e +25 % não identificados (5.1.6.6, Equação 5).`,
    `Velocidades nos dutos: captação ≤ 8 m/s; distribuição ≤ ${c.vLimiteDuto} m/s (${T.ROTULO_DUTO[c.tipoDuto]}) — adotado ${num(c.vDuto)} m/s de projeto para ruído ≤ 85 dB(A) na escada.`,
  ] });
  s.push({ titulo: '3. Áreas de escape (Tabela A2)', paragrafos: [
    `Frestas das PCF fechadas e vão de luz das abertas pela Tabela A2 (PCF 2,10 × 0,89 m: simples 0,03 m² de acesso / 0,04 m² de saída; dupla 0,045 / 0,06 m²; vão 1,64 m² por folha) ou pelos valores informados do fabricante; porta de elevador 0,06 m².${v.antecamara ? ' Com antecâmara não pressurizada, a fresta efetiva de cada acesso é 1/A² = 1/A1² + 1/A2² (Equação 3).' : ''}`,
  ], tabela: { colunas: ['Portas', 'Tipo', 'Sentido', 'Qtd.', 'Abertas', 'Fresta (m²)', 'Vão (m²)'], linhas: linhasPortas(v).map(g => [g.descricao, g.tipo, g.sentido, g.qtd, g.abertas, num(g.fresta, 4), num(g.vao, 2)]), proporcoes: [2.4, 1.6, 0.7, 0.5, 0.6, 0.8, 0.7] },
  notas: [`Área total com tudo fechado: PCF ${num(v.areas.portas, 3)} m² + elevadores ${num(v.areas.elevadores, 3)} m² + janelas ${num(v.areas.janelas, 3)} m² (N = 1,6)${v.areas.permanentes ? ` + abertura permanente ${num(v.areas.permanentes, 2)} m²` : ''}.`] });
  s.push({ titulo: '4. Suprimento de ar com as PCF fechadas (QFT)', paragrafos: [
    `QFT = 0,827 × A × ΔP^(1/N) (Equação 1) = 0,827 × ${num(v.areas.n2, 3)} × ${num(c.dp, 0)}^(1/2)${v.areas.janelas ? ` + 0,827 × ${num(v.areas.janelas, 3)} × ${num(c.dp, 0)}^(1/1,6)` : ''}${v.qPerm ? ` + ${num(v.qPerm, 2)}` : ''} = ${num(v.qft, 2)} m³/s.`,
  ] });
  s.push({ titulo: '5. Suprimento de ar com PCF abertas (QAT)', paragrafos: [
    `APA = vão das ${v.npa} PCF abertas (${num(v.aVao, 2)} m²) + frestas das demais PCF (${num(v.aFrestasFechadas, 3)} m²)${v.areas.elevadores + v.areas.janelas ? ` + frestas de elevadores/janelas (${num(v.areas.elevadores + v.areas.janelas, 3)} m²)` : ''} = ${num(v.apa, 2)} m².`,
    `Velocidade com a vazão QFT: V = QFT / APA = ${num(v.qft, 2)} / ${num(v.apa, 2)} = ${num(v.vpa, 2)} m/s ${v.vpa < c.vPorta ? `< ${num(c.vPorta)} m/s → vazão corrigida` : '≥ mínimo'}: QAT = APA × ${num(c.vPorta)} m/s${v.qPerm ? ` + ${num(v.qPerm, 2)}` : ''} = ${num(v.qat, 2)} m³/s.`,
  ] });
  s.push({ titulo: '6. Vazão de projeto (QTS)', paragrafos: [
    `QT = maior entre QFT (${num(v.qft, 2)}) e QAT (${num(v.qat, 2)}) = ${num(v.qt, 2)} m³/s — determinante: ${v.criterio} (Equação 4).`,
    `QTS = QT × ${num(v.fatorTotal)} = ${num(v.qts, 3)} m³/s = ${m3h(v.qts)} (Equação 5).${v.q1Estagio ? ` 1º estágio (15 Pa contínuo): ${num(v.q1Estagio, 2)} m³/s.` : ''}`,
  ] });
  s.push({ titulo: '7. Alívio de sobrepressão', paragrafos: [
    `Com todas as PCF fechadas a escada não pode passar de ${num(c.dpMax, 0)} Pa: QFT(${num(c.dpMax, 0)} Pa) = 0,827 × A × √${num(c.dpMax, 0)} = ${num(v.qftd, 2)} m³/s; excesso QD = QTS − QFT(${num(c.dpMax, 0)}) = ${num(v.qd, 2)} m³/s (Anexo F, parte V).`,
    v.qd > 0
      ? `${T.ALIVIOS[c.alivio]}. ${c.alivio === 'inversor' ? `O inversor reduz a vazão até ${num(v.qftd, 2)} m³/s (~${num((v.qftd / v.qts) * 100, 0)} % da rotação) com as portas fechadas — controle por transmissor de ΔP instalado na escada (NT 13 5.3.9 c).` : `Área livre do damper ≥ QD / (0,827 × √${num(c.dpMax, 0)}) = ${num(v.areaDamper, 3)} m² (orifício equivalente [CONFERIR curva do fabricante]), entre a escada e um espaço que garanta o escape, fora das áreas de risco (5.3.9 b).`}`
      : 'Vazão de projeto menor que a de 60 Pa: alívio não necessário pelo cálculo; mantido o dispositivo exigido de limitação a 60 Pa.',
  ] });
  s.push({ titulo: '8. Força de abertura das PCF', paragrafos: [
    `F = Fdc + W·A·ΔP / (2·(W − d)), com fechador Fdc = ${num(c.fechador, 0)} N [CONFERIR] e maçaneta a d = ${num(T.FORCA.distancia_macaneta_m)} m da borda (ASHRAE/NFPA 92). Limite adotado ${num(c.limiteForca, 0)} N (NFPA 101; a EN 12101-6 usa 100 N) [CONFERIR na NBR 14880].`,
  ], tabela: { colunas: ['Porta', `F a ${num(c.dp, 0)} Pa (N)`, `F a ${num(c.dpMax, 0)} Pa (N)`, 'Limite (N)', 'Situação'], linhas: v.forcas.map(f => [f.descricao, num(f.f50, 0), num(f.f60, 0), num(f.limite, 0), sim(f.atende)]), proporcoes: [2.6, 1, 1, 0.8, 0.9] } });
  s.push({ titulo: '9. Distribuição de ar', marcadores: [
    `Duto vertical adjacente à escada, ${c.tipoDuto === 'metalico' ? 'em chapa de aço galvanizado com costuras seladas (SMACNA)' : 'em alvenaria rebocada internamente'}, ${num(d.largura)} × ${num(d.altura)} m (${num(d.area, 3)} m²), V = ${num(d.v, 2)} m/s ≤ ${c.vLimiteDuto} m/s — ${sim(d.v <= c.vLimiteDuto)}.`,
    `${d.nGrelhas} grelhas de insuflação com registro, no máximo 2 pavimentos entre grelhas, com grelha no térreo e no último pavimento (NT 13 5.3.7; CBMDF 4.3.1.10.2 k): ${m3h(d.qGrelha)} por grelha, área livre ≥ ${num(d.areaGrelha, 3)} m² (≤ 2,5 m/s na face). Registros travados após o balanceamento.`,
    `Tomada de ar ${c.tomadaAr === 'terreo' ? 'no pavimento térreo ou próxima dele (CBMDF 4.3.1.10.2 e)' : 'na cobertura — só para adequação de edificação existente, com aprovação do CBMDF (4.3.1.10.2 f/g): duas tomadas em fachadas distintas, parede 1 m acima e afastada 5 m'}, com veneziana, tela e filtro metálico lavável, área livre ≥ ${num(d.areaTomada, 2)} m² (≤ 6 m/s; limite 8 m/s ⇒ ≥ ${num(d.areaTomadaMin, 2)} m²). Afastamentos: 2,5 m de aberturas laterais (5 m em fachadas ortogonais), 2 m de aberturas acima, 5 m de divisas; sem extração de fumaça de subsolo na mesma fachada (NT 13 5.3.3).`,
    'Sem registros corta-fogo na rede de pressurização (CBMDF 4.3.1.10.2 j). Dutos e cabos protegidos contra o fogo por no mínimo 2 h (4.3.1.10.2 l).',
  ] });
  s.push({ titulo: '10. Ventiladores — pressão estática estimada e potência', paragrafos: [
    'Estimativa SIMPLIFICADA e declarada: atrito no duto pela equação de Darcy-Weisbach com o fator de Altshul-Tsal (ASHRAE Fundamentals, cap. 21) e perdas localizadas típicas; a seleção final usa o traçado real e as curvas dos fabricantes, considerando o efeito do sistema (AMCA 201; NT 13 5.1.6.9). [CONFERIR]',
  ], tabela: { colunas: ['Parcela', 'Pa', 'Referência'], linhas: [...d.linhas.map(l => [l[0], num(l[1], 1), l[2]]), [`Efeito do sistema (${num(T.PERDAS_PADRAO.efeito_sistema * 100, 0)} %)`, num(d.efeito, 1), 'AMCA 201'], ['Pressão estática total', num(d.pressao, 0), '']], proporcoes: [3.4, 0.7, 2.2] },
  notas: [
    `Potência: P = Q × p / η = ${num(vent.qVent, 3)} m³/s × ${num(d.pressao, 0)} Pa / ${num(c.rendimento)} = ${num(vent.pEixo / 1000, 2)} kW no eixo; com folga de ${num((T.FOLGA_MOTOR - 1) * 100, 0)} %: ${num(vent.kwMin, 2)} kW → motor de ${num(vent.cv)} cv (${num(vent.kw, 2)} kW), η ≈ ${num(vent.eta)}, FP ≈ ${num(vent.fp)}, In ≈ ${num(vent.in, 1)} A em ${c.eletrica.vff} V [CONFERIR placa].`,
    `Arranjo: ${T.ARRANJOS[arr.arranjo]} (CBMDF NT 10, 4.3.1.10.3 c; NT 13 5.3.2). Casa de máquinas exclusiva com TRRF 2 h e PCF P-90; antecâmara se no subsolo (4.3.1.10.3 a/b).`,
  ] });
  s.push({ titulo: '11. Alimentação elétrica (NBR 5410)', paragrafos: [
    `${al.fonteTexto}.`,
    `Circuito exclusivo por ventilador, ${c.eletrica.vff} V trifásico, Ib = 1,25 × In = ${num(al.ib, 1)} A (NBR 5410, 6.5.1), ${num(c.eletrica.comprimento, 0)} m, método ${c.eletrica.metodo}, isolação ${c.eletrica.isolacao} — dimensionado pelo motor de cálculo da skill de elétrica. Cabos com integridade de circuito em incêndio (≥ 2 h) ou protegidos por eletroduto/enclausuramento com TRRF 2 h (CBMDF 4.3.1.10.2 l).`,
  ], tabela: { colunas: ['Circuito', 'Ib (A)', 'Seção (mm²)', 'PE (mm²)', 'Iz (A)', 'Proteção (A)', 'Queda (%)', 'Critério'], linhas: al.circuitos.map(ci => [ci.id, num(ci.ib, 1), num(ci.secao), num(ci.secaoPE), num(ci.iz, 1), ci.disjuntor, num(ci.queda, 2), ci.criterio]), proporcoes: [0.6, 0.6, 0.8, 0.7, 0.6, 0.8, 0.7, 1.6] },
  notas: [`Partida: ${al.partida.rotulo}. ${al.partida.dispositivos.map(x => x.especificacao || `${x.tipo} ${x.nominal_a || ''} A`).join('; ')}.`, ...al.partida.observacoes] });
  s.push({ titulo: '12. Automação e painel de comando', paragrafos: [
    `Painel de comando dedicado, junto aos ventiladores, com controlador programável, ${T.PARTIDAS_CURTO[c.partida]}, ${aut.nSensores} transmissor(es) de pressão diferencial (${T.SENSORES[c.sensores].charAt(0).toLowerCase() + T.SENSORES[c.sensores].slice(1)}), pressostato de fluxo em cada ventilador, seletora MANUAL–0–AUTOMÁTICO, chave de TESTE, botoeiras e sinalização; integração com a central de detecção e alarme (NBR 17240) por módulo de comando e módulos de entrada.`,
  ], marcadores: aut.logica,
  tabela: { colunas: ['Tag', 'Tipo', 'Ponto', 'Origem'], linhas: aut.pontos.map(p => [p.tag, p.tipo, p.descricao, p.origem]), proporcoes: [0.6, 0.5, 4, 1.4], tamanho: 15 },
  notas: [`Controlador: ${aut.comReserva.ED} ED, ${aut.comReserva.SD} SD, ${aut.comReserva.EA} EA e ${aut.comReserva.SA} SA (20 % de reserva).`, ...aut.intertravamentos.map(t => `Intertravamento: ${t}`)] });
  s.push({ titulo: '13. Acionamento pela detecção de incêndio', marcadores: [
    'Acionamento principal pela detecção automática de fumaça nos halls de acesso à escada, do lado de menor pressão das PCF — nunca dentro do espaço pressurizado (CBMDF 4.3.1.10.5 a/b). Detecção também na casa de máquinas (laço exclusivo) e na sala do gerador (NT 13 5.2.1 k).',
    'Acionadores manuais de alarme acionam a pressurização de forma complementar (4.3.1.10.5 e); sprinklers e outros sistemas não dispensam a detecção (4.3.1.10.5 d).',
    `Acionadores manuais "LIGA" na sala de controle central, no compartimento do ventilador (painel) e na portaria/guarita (4.3.1.10.5 f) — ${c.acionadoresRemotos} remoto(s) previstos.`,
    'Destravadores eletromagnéticos de PCF (se houver) ligados à central: liberam no alarme e na falta de energia (4.3.1.10.5 h). O projeto da detecção segue a skill de incêndio (NBR 17240).',
  ] });
  s.push({ titulo: '14. Diagrama de comando — sequência', paragrafos: ['Elementos de força e de comando na ordem do diagrama (base para o desenho do painel):'],
    tabela: { colunas: ['#', 'Id', 'Elemento', 'Circuito'], linhas: calc.diagrama.map(e => [e.ordem, e.id, e.rotulo, e.ligacao]), proporcoes: [0.3, 0.6, 4.6, 0.8], tamanho: 15 } });
  s.push({ titulo: '15. Comissionamento e manutenção', marcadores: [
    `Teste de aceitação com o prédio concluído e os sistemas balanceados (NT 13 5.5): ΔP com todas as PCF fechadas em cada pavimento (manômetro com sonda pela fresta) entre ${num(T.PRESSAO.minimo_medido_fracao * c.dp, 0)} e ${num(c.dpMax, 0)} Pa; velocidade média ≥ ${num(c.vPorta)} m/s nas ${v.npa} PCF abertas (anemômetro, ≥ 12 pontos); força de abertura; tempos de partida pela detecção, pelo acionador manual e na reversão; operação no gerador.`,
    'Teste semanal de cada ventilador (modo TESTE), verificação anual dos diferenciais de pressão e manutenção de dutos, correias, filtros, damper, detectores e gerador (NT 13 5.3.12). Medições de campo conforme AMCA 203.',
  ] });
  s.push({ titulo: '16. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 2), m.referencia]), proporcoes: [0.7, 4.2, 0.45, 0.55, 1.6], tamanho: 15 } });
  s.push({ titulo: 'Avisos e premissas', marcadores: calc.avisos });
  return s;
}

// ── Laudo de inspeção/comissionamento e checklist de campo ─────────────────

const TIPOS_INSPECAO = { comissionamento: 'comissionamento / teste de aceitação', periodica: 'inspeção periódica', corretiva: 'após manutenção corretiva' };

function cfgLaudo(res) {
  const { calc, med } = res;
  const { c, v, vent, d } = calc;
  return {
    titulo: 'LAUDO TÉCNICO DE INSPEÇÃO DO SISTEMA DE PRESSURIZAÇÃO DE ESCADA',
    tipoInspecao: `Inspeção conforme a ABNT NBR 14880 e a CBMDF NT 10/2015 — ${TIPOS_INSPECAO[res.insp.tipo] || TIPOS_INSPECAO.comissionamento}`,
    tituloCurto: 'Laudo — pressurização de escada',
    sigla: 'LAUDO-PRES',
    objetivo: 'Registrar a inspeção e os ensaios do sistema de pressurização da escada de segurança (diferencial de pressão com as portas fechadas, velocidade do ar nas portas abertas, força de abertura, tempos de acionamento, reversão de ventiladores, integração com a detecção e a alimentação de emergência), com as não conformidades, recomendações e prazos.',
    listaNormas: NORMAS,
    secoesChecklist: SECOES_CHECKLIST,
    descricao: [
      ['Escada', `${res.dados.escada?.nome || 'Escada 1'} — ${c.pavimentos} pavimentos, ${v.portas.length} PCF${v.antecamara ? ', com antecâmara' : ''}`],
      ['Ocupação / altura', `${T.OCUPACOES[c.grupo]} · ${num(c.altura, 1)} m`],
      ['Vazão de projeto', `${num(v.qts, 2)} m³/s (${m3h(v.qts)}) — ${v.npa} PCF abertas a ${num(c.vPorta)} m/s`],
      ['Ventiladores', `${textoArranjo(calc)} · ${num(d.pressao, 0)} Pa estimados`],
      ['Controle / alívio', `${T.PARTIDAS[c.partida]} · ${T.ALIVIOS[c.alivio]}`],
      ['Critérios', `ΔP ${num(T.PRESSAO.minimo_medido_fracao * c.dp, 0)}–${num(c.dpMax, 0)} Pa; V ≥ ${num(c.vPorta)} m/s; F ≤ ${num(c.limiteForca, 0)} N [CONFERIR]; partida ≤ ${num(c.tempoPartidaMax, 0)} s [CONFERIR]`],
    ],
    metodologia: [
      'Inspeção visual da escada, PCF, casa de máquinas, tomada de ar, dutos, grelhas, damper, painel e cabos.',
      'Sistema em operação de emergência (acionado pela central), edifício vazio e vento estável (NT 13 5.5.1 c e 5.5.4 b).',
      'ΔP com todas as PCF fechadas: manômetro digital calibrado, sonda pela fresta da PCF com dobra em L (5.5.2).',
      'Velocidade: anemômetro de fio quente, média de ≥ 12 pontos no vão de cada PCF aberta, no número de PCF do cálculo (5.5.4).',
      'Força de abertura com dinamômetro na maçaneta; tempos com cronômetro desde o alarme até a pressão de projeto.',
      `Vazão e pressão dos ventiladores conforme AMCA 203 (referência: ${num(vent.qVentM3h, 0)} m³/h).`,
    ],
    medicoes: [
      { titulo: '6.1 Diferencial de pressão com as PCF fechadas', colunas: ['Pavimento', 'ΔP (Pa)', 'Critério', 'Resultado'], proporcoes: [2.4, 0.8, 1.4, 0.8],
        linhas: med.pressoes.map(m => [m.pavimento, m.dp_pa ?? '', m.criterio, m.resultado]), nota: 'Medido ≥ 90 % do projetado e ≤ 60 Pa (NT 13 5.5.3 d; CBMDF 4.3.1.10.2 r).' },
      { titulo: '6.2 Velocidade do ar nas PCF abertas', colunas: ['PCF', 'Média (m/s)', 'Pontos', 'Critério', 'Resultado'], proporcoes: [2.6, 0.8, 0.6, 1.4, 0.8],
        linhas: med.velocidades.map(m => [m.porta, m.media_ms ?? '', [m.pontos, m.obs].filter(Boolean).join(' — '), m.criterio, m.resultado]) },
      { titulo: '6.3 Força de abertura das PCF', colunas: ['PCF', 'Força (N)', 'Critério', 'Resultado'], proporcoes: [2.6, 0.8, 1.4, 0.8],
        linhas: med.forcas.map(m => [m.porta, m.forca_n ?? '', m.criterio, m.resultado]), nota: 'Limite adotado no projeto (NFPA 101/NFPA 92; EN 12101-6 usa 100 N). [CONFERIR na NBR 14880]' },
      { titulo: '6.4 Ensaios funcionais e tempos de acionamento', colunas: ['Ensaio', 'Tempo (s)', 'Critério', 'Resultado'], proporcoes: [3, 0.8, 1.2, 0.8],
        linhas: med.ensaios.map(m => [m.ensaio, m.tempo_s ?? '', m.criterio, m.resultado]) },
      { titulo: '6.5 Ventiladores (vazão e pressão medidas)', colunas: ['Ventilador', 'Vazão (m³/h)', 'Pressão (Pa)', 'Corrente (A)', 'Critério', 'Resultado'], proporcoes: [1, 0.9, 0.8, 0.8, 1.6, 0.8],
        linhas: med.ventiladores.map(m => [m.equipamento, m.vazao_m3h ?? '', m.pressao_pa ?? '', m.corrente_a ?? '', m.criterio, m.resultado]) },
    ],
    conclusoes: ['O sistema de pressurização deve operar semanalmente em teste, ter os diferenciais de pressão verificados anualmente e manutenção registrada; qualquer obra que altere portas, frestas ou aberturas da escada exige novo balanceamento (NT 13 5.3.12).'],
    proximaInspecao: [
      ['Operação de cada ventilador (modo TESTE)', 'Semanal (NT 13 5.3.12 b)'],
      ['Medição dos diferenciais de pressão', 'Anual (NT 13 5.3.12 d)'],
      ['Manutenção preventiva (ventiladores, filtros, damper, painel, detectores, gerador)', 'Conforme plano anual de manutenção [CONFERIR]'],
      ['Novo comissionamento', 'Após reforma que altere a escada, as PCF ou o sistema'],
    ],
  };
}

function cfgChecklist(res) {
  const { calc } = res;
  const { c, v, vent } = calc;
  return {
    titulo: 'CHECKLIST DE CAMPO — PRESSURIZAÇÃO DE ESCADA', subtitulo: 'ABNT NBR 14880 — CBMDF NT 10/2015', tituloCurto: 'Checklist de campo — pressurização',
    secoesChecklist: SECOES_CHECKLIST,
    preparacao: [
      'Combinar com o síndico/administração: aviso aos ocupantes, brigada e portaria (o teste aciona a central).',
      'Prédio vazio na escada, vento estável, sistemas de ar-condicionado no modo de emergência (desligados pela central).',
      'Levar: manômetro digital 0–200 Pa com sonda em L, anemômetro de fio quente, dinamômetro, cronômetro, alicate amperímetro, fumaça de teste, rádio.',
    ],
    referencias: [
      ['ΔP com PCF fechadas', `${num(T.PRESSAO.minimo_medido_fracao * c.dp, 0)} a ${num(c.dpMax, 0)} Pa`],
      ['PCF abertas no teste de velocidade', `${v.npa} (${linhasPortas(v).filter(g => g.abertas).map(g => `${g.abertas} × ${g.descricao}`).join('; ')})`],
      ['Velocidade nas PCF abertas', `≥ ${num(c.vPorta)} m/s (média de 12 pontos)`],
      ['Força de abertura', `≤ ${num(c.limiteForca, 0)} N [CONFERIR]`],
      ['Vazão de projeto (cada ventilador)', `${num(vent.qVentM3h, 0)} m³/h a ${num(vent.pressao, 0)} Pa · In ${num(vent.in, 1)} A`],
      ['Tempo de partida', `≤ ${num(c.tempoPartidaMax, 0)} s [CONFERIR]; reversão: pressostato em ${num(c.tempoReversao, 0)} s`],
    ],
    medicoes: [
      { titulo: 'ΔP com todas as PCF fechadas', colunas: ['Pavimento', 'ΔP (Pa)', 'Observação'], proporcoes: [2, 1, 3], linhas: Array.from({ length: Math.min(c.pavimentos, 30) }, (_, i) => [`${i === 0 ? 'Térreo / descarga' : `${i}º pavimento`}`, '', '']) },
      { titulo: 'Velocidade nas PCF abertas (12 pontos)', colunas: ['PCF', 'Pontos (m/s)', 'Média (m/s)'], proporcoes: [1.6, 3.6, 0.9], linhas: [] },
      { titulo: 'Força de abertura', colunas: ['PCF', 'Força (N)', 'Observação'], proporcoes: [2, 1, 3], linhas: [] },
      { titulo: 'Ensaios funcionais', colunas: ['Ensaio', 'Tempo (s)', 'OK?'], proporcoes: [3.6, 1, 0.8], linhas: [
        ['Partida pelo detector de fumaça do hall', '', '☐'], ['Partida pelo acionador manual de alarme', '', '☐'], ['Acionador remoto LIGA (portaria)', '', '☐'],
        ['Reversão V1 → V2 (falha do V1)', '', '☐'], ['Rearme da central não desliga o sistema', '', '☐'], ['Fumaça na casa de máquinas inibe o automático', '', '☐'],
        ['Falta de energia → gerador / circuito antes da chave geral', '', '☐'], ['Damper / inversor limita a 60 Pa', '', '☐'],
      ] },
    ],
  };
}

// ── Planilha ────────────────────────────────────────────────────────────────

function abaKv(nome, linhas) {
  return {
    nome,
    colunas: [{ header: 'Grandeza', key: 'grandeza', width: 52 }, { header: 'Valor', key: 'valor', width: 18 }, { header: 'Unidade', key: 'unidade', width: 10 }, { header: 'Critério / referência', key: 'ref', width: 70 }],
    linhas: linhas.map(([grandeza, valor, unidade, ref]) => ({ grandeza, valor: typeof valor === 'number' ? Math.round(valor * 10000) / 10000 : valor, unidade, ref })),
  };
}

async function gerarPlanilha(res) {
  const { calc } = res;
  const { c, v, d, vent, al, aut } = calc;
  return D.gerarPlanilha([
    { nome: 'Portas', colunas: [{ header: 'Portas', key: 'descricao', width: 40 }, { header: 'Tipo', key: 'tipo', width: 28 }, { header: 'Sentido', key: 'sentido', width: 10 }, { header: 'Qtd.', key: 'qtd', width: 7 }, { header: 'Abertas', key: 'abertas', width: 8 }, { header: 'Fresta (m²)', key: 'fresta', width: 12, numFmt: '0.0000' }, { header: 'Vão (m²)', key: 'vao', width: 10, numFmt: '0.00' }],
      linhas: linhasPortas(v) },
    abaKv('Vazões', [
      ['Ocupação (Tabela B1)', T.OCUPACOES[c.grupo], '', ''],
      ['Altura', c.altura, 'm', ''],
      ['PCF abertas no cálculo (NPA)', v.npa, 'un', 'Tabela B1 (+5.1.6.4 f)'],
      ['Área de frestas com tudo fechado', v.areas.total, 'm²', 'Tabela A2'],
      ['ΔP de projeto', c.dp, 'Pa', 'Tabela A1'],
      ['QFT — PCF fechadas', v.qft, 'm³/s', 'Q = 0,827·A·ΔP^(1/N)'],
      ['APA — vão das abertas + frestas das fechadas', v.apa, 'm²', '5.1.6.5'],
      ['Velocidade com QFT', v.vpa, 'm/s', `mínimo ${c.vPorta} m/s`],
      ['QAT — PCF abertas', v.qat, 'm³/s', 'APA × V mín.'],
      ['QT', v.qt, 'm³/s', v.criterio],
      ['Fator de vazamentos', v.fatorTotal, '', `dutos ${T.ROTULO_DUTO[c.tipoDuto]} + 25 % não identificados`],
      ['QTS — vazão de projeto', v.qts, 'm³/s', 'Equação 5'],
      ['QTS', v.qts * 3600, 'm³/h', ''],
      ['QFT a 60 Pa', v.qftd, 'm³/s', 'Anexo F parte V'],
      ['QD — excesso para o alívio', v.qd, 'm³/s', 'QTS − QFT(60 Pa)'],
      ['Área livre do damper', v.areaDamper, 'm²', 'QD / (0,827·√60) [CONFERIR fabricante]'],
      ...v.forcas.map(f => [`Força de abertura a ${c.dpMax} Pa — ${f.descricao}`, f.f60, 'N', `≤ ${f.limite} N [CONFERIR]`]),
    ]),
    abaKv('Dutos e ventilador', [
      ['Duto (largura × altura)', `${d.largura} × ${d.altura}`, 'm', c.tipoDuto],
      ['Velocidade no duto', d.v, 'm/s', `≤ ${c.vLimiteDuto} m/s`],
      ['Comprimento do duto', d.comprimento, 'm', ''],
      ['Diâmetro hidráulico', d.dh, 'm', ''],
      ['Reynolds', d.re, '', '66 400·Dh·V'],
      ['Fator de atrito', d.f, '', 'Altshul-Tsal'],
      ['Perda por metro', d.porMetro, 'Pa/m', ''],
      ...d.linhas.map(l => [l[0], l[1], 'Pa', l[2]]),
      ['Efeito do sistema', d.efeito, 'Pa', 'AMCA 201'],
      ['Pressão estática total', d.pressao, 'Pa', '[CONFERIR fabricante]'],
      ['Grelhas', d.nGrelhas, 'un', 'máx. 2 pavimentos entre grelhas'],
      ['Vazão por grelha', d.qGrelha * 3600, 'm³/h', ''],
      ['Área livre da tomada de ar', d.areaTomada, 'm²', '≤ 6 m/s'],
      ['Vazão por ventilador', vent.qVentM3h, 'm³/h', T.ARRANJOS[calc.arr.arranjo]],
      ['Potência no eixo', vent.pEixo / 1000, 'kW', `η ${c.rendimento}`],
      ['Motor', vent.cv, 'cv', `${Math.round(vent.kw * 100) / 100} kW`],
      ['Corrente nominal', vent.in, 'A', `${c.eletrica.vff} V [CONFERIR placa]`],
      ...al.circuitos.map(ci => [`Circuito ${ci.id}`, `${ci.secao} mm² / ${ci.disjuntor} A`, '', `queda ${Math.round(ci.queda * 100) / 100} %; ${ci.criterio}`]),
      ['Fonte de emergência', al.fonte === 'gerador' ? 'gerador 4 h' : 'antes da chave geral', '', 'CBMDF NT 10 4.3.1.10.2'],
    ]),
    { nome: 'Automação', colunas: [{ header: 'Tag', key: 'tag', width: 8 }, { header: 'Tipo', key: 'tipo', width: 6 }, { header: 'Ponto', key: 'descricao', width: 80 }, { header: 'Origem', key: 'origem', width: 34 }], linhas: aut.pontos },
    D.abaMateriais(calc.materiais),
  ]);
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo e de cálculo', formato: 'Word', nome: 'Memorial_Pressurizacao',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO E DE CÁLCULO — PRESSURIZAÇÃO DE ESCADA DE SEGURANÇA', subtitulo: 'ABNT NBR 14880 — CBMDF NT 10/2015 — controle de fumaça e automação', tituloCurto: 'Memorial — pressurização de escada', sigla: 'MEM-PRES', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de cálculo, automação e materiais', formato: 'Excel', nome: 'Pressurizacao', gerar: (res) => gerarPlanilha(res) },
  { tipo: 'laudo', rotulo: 'Laudo de inspeção / comissionamento', formato: 'Word', nome: 'Laudo_Pressurizacao',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, cfgLaudo(res), { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Pressurizacao',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, cfgChecklist(res), res.checklist)) },
];

// ── Orçamento ───────────────────────────────────────────────────────────────

// Materiais do painel e da automação (modo "automacao": retrofit do comando, como o
// serviço que a H&M executou em 2026 em três escadas pressurizadas de um hospital)
const COD_AUTOMACAO = new Set(['PAINEL', 'CLP', 'INV', 'SOFT', 'PROT', 'K', 'KT', 'SELETORA', 'CH-TESTE', 'BOT', 'SINAL', 'RELE', 'FONTE24', 'DPS-P', 'PT', 'PDS', 'BOT-REM', 'MOD-CMD', 'MOD-ENT', 'CABO-C', 'CABO-S', 'ELET']);

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const { c, v, d, arr, aut, al } = calc;
  const obra = dados.obra?.nome || dados.cliente?.nome || 'a edificação';
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade, subgrupo = 'Pressurização de escadas') => ({ secao: S, subgrupo, codigo, descricao, quantidade, unidade });
  const mat = (m) => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Pressurização', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade });
  const qtd = (cod) => calc.materiais.filter(m => m.codigo === cod).reduce((s, m) => s + m.quantidade, 0);
  const mCabosForca = calc.materiais.filter(m => /^CABO-F/.test(m.codigo)).reduce((s, m) => s + m.quantidade, 0);
  const mComando = qtd('CABO-C') + qtd('CABO-S');
  const comum = {
    pres_painel: srv('pres_painel', `Montagem e instalação do painel de comando (${T.PARTIDAS_CURTO[c.partida]}, controlador, proteções e sinalização)`, 1, 'un'),
    pres_programacao: srv('pres_programacao', 'Programação do controlador e parametrização dos acionamentos (PID de ΔP, reversão automática, modos manual/automático/teste, supervisão de falhas)', 1, 'vb'),
    pres_sensores: srv('pres_sensores', 'Instalação de transmissores de pressão diferencial (com tomadas de pressão) e pressostatos de fluxo', aut.nSensores + arr.n, 'un'),
    pres_cabo_comando: srv('pres_cabo_comando', 'Lançamento e conexão de cabos de comando, sinal e instrumentação', mComando, 'm'),
    pres_infra: srv('pres_infra', 'Infraestrutura em eletroduto de aço galvanizado com fixações', qtd('ELET'), 'm'),
    pres_acionador: srv('pres_acionador', 'Instalação de acionador remoto "LIGA pressurização" (portaria/sala de controle)', c.acionadoresRemotos, 'un'),
    pres_integracao_alarme: srv('pres_integracao_alarme', 'Integração com a central de detecção e alarme (módulos de comando e de entrada, programação da matriz e testes) — NBR 17240', 1, 'vb'),
    pres_comissionamento: srv('pres_comissionamento', `Comissionamento e testes de aceitação: ΔP por pavimento, velocidade nas ${v.npa} PCF abertas, força de abertura, tempos, reversão e gerador, com relatório`, 1, 'vb'),
  };
  if (modo === 'execucao') {
    return {
      cliente_nome: dados.cliente?.nome || '',
      escopo: `Fornecimento e instalação do sistema de pressurização da escada de segurança de ${obra}, conforme a ABNT NBR 14880 e a CBMDF NT 10/2015: ${arr.n} ventilador(es) de ${num(calc.vent.qVentM3h, 0)} m³/h (${num(calc.vent.cv)} cv), duto ${c.tipoDuto === 'metalico' ? 'metálico' : 'de alvenaria'} com ${d.nGrelhas} grelhas, tomada de ar com filtro, ${c.alivio === 'inversor' ? 'controle de pressão por inversor' : 'alívio de sobrepressão'}, painel de comando com automação, integração com a central de alarme, alimentação elétrica ${al.fonte === 'gerador' ? 'pelo gerador' : 'antes da chave geral'}, comissionamento, projeto e ART.`,
      observacoes: `Rascunho gerado pela skill de pressurização — conferir quantidades e preços antes de enviar ao cliente.${c.tipoDuto !== 'metalico' ? ' Duto de alvenaria por conta da obra civil.' : ''} Obra civil da casa de máquinas, PCF, grupo gerador e detecção dos halls (skill de incêndio) não incluídos, salvo indicação.`,
      itens: [
        ...calc.materiais.map(mat),
        srv('pres_ventilador', 'Instalação do conjunto motoventilador (base antivibratória, junta flexível, alinhamento e ligação)', arr.n, 'un'),
        ...(c.tipoDuto === 'metalico' ? [srv('pres_duto', 'Fabricação e montagem de duto de chapa galvanizada com suportes e vedação', qtd('DUTO'), 'm²')] : []),
        srv('pres_grelha', 'Instalação e balanceamento de grelhas de insuflação e da veneziana de tomada de ar', d.nGrelhas + qtd('TOMADA'), 'un'),
        ...(qtd('DAMPER') + qtd('REG-RET') ? [srv('pres_damper', 'Instalação de damper de alívio e registros de retenção', qtd('DAMPER') + qtd('REG-RET'), 'un')] : []),
        comum.pres_painel, comum.pres_programacao, comum.pres_sensores,
        srv('pres_cabo_forca', 'Lançamento e conexão de cabos de força resistentes ao fogo (por metro de circuito)', mCabosForca, 'm'),
        comum.pres_cabo_comando, comum.pres_infra, comum.pres_acionador, comum.pres_integracao_alarme, comum.pres_comissionamento,
        srv('pres_projeto', 'Projeto de pressurização (memorial de cálculo, desenhos, diagrama de comando) com ART e aprovação no CBMDF', 1, 'vb'),
      ].filter(i => i.quantidade > 0),
    };
  }
  if (modo === 'automacao') {
    return {
      cliente_nome: dados.cliente?.nome || '',
      escopo: `Adequação do comando e automação do sistema de pressurização da escada de ${obra}: painel com ${T.PARTIDAS_CURTO[c.partida]}, controlador programável, ${aut.nSensores} transmissor(es) de pressão diferencial, ${arr.n} pressostato(s) de fluxo, reversão automática, modos manual/automático/teste, sinalização, acionadores remotos e integração com a central de alarme (NBR 17240), com comissionamento e ART.`,
      observacoes: 'Rascunho gerado pela skill de pressurização (modo automação) — ventiladores, dutos e damper existentes mantidos. Conferir antes de enviar.',
      itens: [
        ...calc.materiais.filter(m => COD_AUTOMACAO.has(m.codigo)).map(mat),
        comum.pres_painel, comum.pres_programacao, comum.pres_sensores, comum.pres_cabo_comando, comum.pres_infra, comum.pres_acionador, comum.pres_integracao_alarme, comum.pres_comissionamento,
      ].filter(i => i.quantidade > 0),
    };
  }
  const sub = 'Inspeção e manutenção';
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: `Inspeção, ensaios e laudo do sistema de pressurização da escada de ${obra} conforme a ABNT NBR 14880 e a CBMDF NT 10/2015: ΔP com as PCF fechadas em ${c.pavimentos} pavimentos, velocidade nas PCF abertas, força de abertura, tempos de acionamento, reversão dos ventiladores, integração com a central e alimentação de emergência, com manutenção preventiva e laudo com ART.${res.ncs.length ? ` Inclui a correção das ${res.ncs.length} não conformidades apontadas (itens a cotar).` : ''}`,
    observacoes: 'Rascunho gerado pela skill de pressurização — conferir antes de enviar. Testes com o prédio vazio, combinados com a administração.',
    itens: [
      srv('pres_inspecao', 'Inspeção e ensaios do sistema (ΔP por pavimento, velocidade nas PCF abertas, força de abertura, tempos e reversão)', 1, 'vb', sub),
      srv('pres_manutencao', 'Manutenção preventiva do sistema de pressurização (ventiladores, filtros, damper, painel e sensores)', 1, 'vb', sub),
      srv('pres_laudo', 'Laudo técnico de inspeção da pressurização com ART', 1, 'vb', sub),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
    ],
  };
}

// ── Formulário da tela ─────────────────────────────────────────────────────

const OP = {
  ocupacao: F.op(Object.entries(T.OCUPACOES)),
  sistema: F.op([['1_estagio', '1 estágio (só emergência)'], ['2_estagios', '2 estágios (15 Pa contínuo + 50 Pa)']]),
  jurisdicao: F.op([['DF', 'Distrito Federal (CBMDF)'], ['outra', 'Outra (critérios da NT 13 / IT 13)']]),
  tipoPorta: F.op([['simples', 'PCF simples'], ['dupla', 'PCF dupla']]),
  sentido: F.op([['acesso', 'Acesso à escada'], ['saida', 'Saída da escada (descarga)']]),
  duto: F.op([['metalico', 'Chapa metálica (+15 %)'], ['alvenaria', 'Alvenaria (+25 %)'], ['misto', 'Misto (+25 %)']]),
  arranjo: F.op(Object.entries(T.ARRANJOS)),
  partida: F.op(Object.entries(T.PARTIDAS)),
  alivio: F.op(Object.entries(T.ALIVIOS)),
  sensores: F.op(Object.entries(T.SENSORES)),
  tomada: F.op([['terreo', 'No térreo ou próxima dele'], ['cobertura', 'Na cobertura (adequação de existente)']]),
  vff: F.op([['380', '380 V'], ['220', '220 V'], ['440', '440 V']]),
  vfn: F.op([['220', '220 V'], ['127', '127 V'], ['254', '254 V']]),
  metodo: F.op([['B1', 'B1 — eletroduto aparente/embutido'], ['B2', 'B2 — multipolar em eletroduto'], ['C', 'C — parede'], ['D', 'D — enterrado'], ['E', 'E — multipolar em bandeja'], ['F', 'F — unipolares em leito']]),
  isolacao: F.op([['EPR', 'EPR/XLPE 90 °C'], ['PVC', 'PVC 70 °C']]),
  fonte: F.op([['auto', 'Automático pela norma (CBMDF 4.3.1.10.2 o/p)'], ['gerador', 'Grupo gerador (4 h)'], ['antes_chave_geral', 'Antes da chave geral (isentos)']]),
  tipoInsp: F.op(Object.entries(TIPOS_INSPECAO)),
  resultado: F.op([['', '— (pelo tempo)'], ['C', 'C — conforme'], ['NC', 'NC — não conforme']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Edificação', aberta: true, resumo: 'edificacao.altura_m', itens: [
    { tipo: 'nota', texto: 'A ocupação e a altura definem o nº de portas abertas no cálculo (Tabela B1), o ventilador reserva e o gerador (CBMDF NT 10/2015, 4.3.1.10).' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'edificacao.ocupacao', rotulo: 'Ocupação (grupo)', tipo: 'selecao', opcoes: OP.ocupacao },
      { caminho: 'edificacao.altura_m', rotulo: 'Altura da edificação (m)', tipo: 'numero' },
      { caminho: 'edificacao.pavimentos', rotulo: 'Pavimentos ligados à escada', tipo: 'numero' },
      { caminho: 'edificacao.sistema', rotulo: 'Sistema', tipo: 'selecao', opcoes: OP.sistema },
      { caminho: 'edificacao.jurisdicao', rotulo: 'Corpo de Bombeiros', tipo: 'selecao', opcoes: OP.jurisdicao },
      { caminho: 'edificacao.altitude_m', rotulo: 'Altitude (m)', tipo: 'numero', dica: 'Brasília ≈ 1 100 m' },
      { caminho: 'edificacao.temperatura_c', rotulo: 'Temperatura do ar externo (°C)', tipo: 'numero' },
      { caminho: 'edificacao.local_reuniao_publico', rotulo: 'Escritório até 21 m com local de reunião ≥ 50 pessoas fora do térreo', tipo: 'check' },
    ] },
  ] },
  { titulo: '3. Escada, portas, elevadores e janelas', aberta: true, resumo: 'escada.nome', itens: [
    { tipo: 'nota', texto: 'Uma linha por grupo de PCF iguais. Frestas e vão vazios = Tabela A2 (PCF 2,10 × 0,89 m: simples 0,03/0,04 m², dupla 0,045/0,06 m², vão 1,64 m² por folha). Informe os valores do fabricante quando forem outros.' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'escada.nome', rotulo: 'Escada' },
      { caminho: 'escada.portas_abertas', rotulo: 'PCF abertas no cálculo (vazio = Tabela B1)', tipo: 'numero' },
      { caminho: 'escada.antecamara', rotulo: 'Antecâmara não pressurizada (frestas em série)', tipo: 'check' },
    ] },
    { tipo: 'tabela', caminho: 'escada.portas', rotuloAdicionar: 'Adicionar grupo de PCF', novaLinha: { descricao: '', tipo: 'simples', sentido: 'acesso', quantidade: 1, largura_m: 0.89, altura_m: 2.1, fresta_m2: null, vao_m2: null },
      colunas: [{ campo: 'descricao', rotulo: 'Descrição' }, { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.tipoPorta, largura: 120 }, { campo: 'sentido', rotulo: 'Sentido', tipo: 'selecao', opcoes: OP.sentido, largura: 150 },
        { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 70 }, { campo: 'largura_m', rotulo: 'Largura folha (m)', tipo: 'numero', largura: 100 }, { campo: 'altura_m', rotulo: 'Altura (m)', tipo: 'numero', largura: 90 },
        { campo: 'fresta_m2', rotulo: 'Fresta (m²)', tipo: 'numero', largura: 100 }, { campo: 'vao_m2', rotulo: 'Vão aberto (m²)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'escada.elevadores', rotuloAdicionar: 'Adicionar porta de elevador no espaço pressurizado', novaLinha: { descricao: 'Elevador de emergência', quantidade: 1, fresta_m2: 0.06 },
      colunas: [{ campo: 'descricao', rotulo: 'Descrição' }, { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 80 }, { campo: 'fresta_m2', rotulo: 'Fresta (m²)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'escada.janelas', rotuloAdicionar: 'Adicionar janela/abertura na caixa da escada', novaLinha: { descricao: '', quantidade: 1, fresta_m2: null, permanente: false, area_aberta_m2: null },
      colunas: [{ campo: 'descricao', rotulo: 'Descrição' }, { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 70 }, { campo: 'fresta_m2', rotulo: 'Fresta (m²) — N = 1,6', tipo: 'numero', largura: 130 },
        { campo: 'permanente', rotulo: 'Abertura permanente', tipo: 'check', largura: 110 }, { campo: 'area_aberta_m2', rotulo: 'Área aberta (m²) — 4 m/s', tipo: 'numero', largura: 140 }] },
  ] },
  { titulo: '4. Critérios e distribuição de ar', itens: [
    { tipo: 'nota', texto: 'Deixe vazio para usar os valores da norma e os típicos (perdas da tomada de ar, grelha e registro). A pressão do ventilador é estimada — confirme com o traçado e o catálogo.' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.pressao_projeto_pa', rotulo: 'ΔP de projeto (Pa)', tipo: 'numero' },
      { caminho: 'sistema.pressao_max_pa', rotulo: 'ΔP máxima (Pa)', tipo: 'numero' },
      { caminho: 'sistema.velocidade_porta_ms', rotulo: 'Velocidade na PCF aberta (m/s)', tipo: 'numero' },
      { caminho: 'sistema.tipo_duto', rotulo: 'Duto', tipo: 'selecao', opcoes: OP.duto },
      { caminho: 'sistema.velocidade_duto_ms', rotulo: 'Velocidade de projeto no duto (m/s)', tipo: 'numero', dica: 'Padrão 10 (metálico) / 8 (alvenaria)' },
      { caminho: 'sistema.largura_duto_m', rotulo: 'Duto — largura (m)', tipo: 'numero' },
      { caminho: 'sistema.altura_duto_m', rotulo: 'Duto — altura (m)', tipo: 'numero' },
      { caminho: 'sistema.comprimento_duto_m', rotulo: 'Comprimento do duto (m)', tipo: 'numero', dica: 'Vazio = altura + 10 m' },
      { caminho: 'sistema.curvas', rotulo: 'Nº de curvas', tipo: 'numero' },
      { caminho: 'sistema.perda_tomada_ar_pa', rotulo: 'Perda tomada de ar + filtro (Pa)', tipo: 'numero' },
      { caminho: 'sistema.perda_grelha_pa', rotulo: 'Perda na grelha (Pa)', tipo: 'numero' },
      { caminho: 'sistema.perda_registro_pa', rotulo: 'Perda em registros (Pa)', tipo: 'numero' },
      { caminho: 'sistema.rendimento_ventilador', rotulo: 'Rendimento do ventilador', tipo: 'numero' },
      { caminho: 'sistema.tomada_ar', rotulo: 'Tomada de ar', tipo: 'selecao', opcoes: OP.tomada },
    ] },
  ] },
  { titulo: '5. Ventiladores, partida e automação', itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.arranjo', rotulo: 'Ventiladores', tipo: 'selecao', opcoes: OP.arranjo },
      { caminho: 'sistema.partida', rotulo: 'Partida / controle', tipo: 'selecao', opcoes: OP.partida },
      { caminho: 'sistema.alivio', rotulo: 'Alívio de sobrepressão', tipo: 'selecao', opcoes: OP.alivio },
      { caminho: 'sistema.sensores', rotulo: 'Sensores de ΔP', tipo: 'selecao', opcoes: OP.sensores },
      { caminho: 'sistema.acionadores_remotos', rotulo: 'Acionadores remotos LIGA', tipo: 'numero', dica: 'Portaria e sala de controle (CBMDF 4.3.1.10.5 f)' },
      { caminho: 'sistema.limite_forca_n', rotulo: 'Força máx. de abertura (N)', tipo: 'numero', dica: '133 N (NFPA 101); EN 12101-6: 100 N [CONFERIR NBR 14880]' },
      { caminho: 'sistema.forca_fechador_n', rotulo: 'Força do fechador (N)', tipo: 'numero' },
      { caminho: 'sistema.tempo_partida_max_s', rotulo: 'Tempo máx. de partida (s)', tipo: 'numero' },
      { caminho: 'sistema.tempo_reversao_s', rotulo: 'Tempo para reversão ao reserva (s)', tipo: 'numero' },
      { caminho: 'sistema.deteccao_existente', rotulo: 'Detecção dos halls já existe (skill incêndio)', tipo: 'check' },
    ] },
  ] },
  { titulo: '6. Alimentação elétrica (NBR 5410)', itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'alimentacao.tensao_ff', rotulo: 'Tensão F-F', tipo: 'selecao', opcoes: OP.vff },
      { caminho: 'alimentacao.tensao_fn', rotulo: 'Tensão F-N', tipo: 'selecao', opcoes: OP.vfn },
      { caminho: 'alimentacao.comprimento_m', rotulo: 'Comprimento QGBT → painel (m)', tipo: 'numero' },
      { caminho: 'alimentacao.metodo', rotulo: 'Método de instalação', tipo: 'selecao', opcoes: OP.metodo },
      { caminho: 'alimentacao.isolacao', rotulo: 'Isolação', tipo: 'selecao', opcoes: OP.isolacao },
      { caminho: 'alimentacao.temperatura', rotulo: 'Temperatura ambiente (°C)', tipo: 'numero' },
      { caminho: 'alimentacao.fonte', rotulo: 'Fonte de emergência', tipo: 'selecao', opcoes: OP.fonte },
    ] },
  ] },
  { titulo: '7. Ventilador existente (para laudo)', itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'existente.vazao_m3h', rotulo: 'Vazão (m³/h)', tipo: 'numero' },
      { caminho: 'existente.pressao_pa', rotulo: 'Pressão estática (Pa)', tipo: 'numero' },
      { caminho: 'existente.potencia_cv', rotulo: 'Motor (cv)', tipo: 'numero' },
      { caminho: 'existente.quantidade', rotulo: 'Quantidade', tipo: 'numero' },
    ] },
  ] },
  F.secaoInspecao(8, OP.tipoInsp),
  F.secaoChecklist(9, CHECKLIST.length),
  { titulo: '10. Medições e ensaios', itens: [
    { tipo: 'tabela', caminho: 'inspecao.pressoes', rotuloAdicionar: 'Adicionar ΔP de pavimento', novaLinha: { pavimento: '', dp_pa: null },
      colunas: [{ campo: 'pavimento', rotulo: 'Pavimento' }, { campo: 'dp_pa', rotulo: 'ΔP com PCF fechadas (Pa)', tipo: 'numero', largura: 170 }] },
    { tipo: 'tabela', caminho: 'inspecao.velocidades', rotuloAdicionar: 'Adicionar velocidade em PCF aberta', novaLinha: { porta: '', media_ms: null, pontos: 12 },
      colunas: [{ campo: 'porta', rotulo: 'PCF aberta' }, { campo: 'media_ms', rotulo: 'Média (m/s)', tipo: 'numero', largura: 110 }, { campo: 'pontos', rotulo: 'Nº de pontos', tipo: 'numero', largura: 100 }] },
    { tipo: 'tabela', caminho: 'inspecao.forcas', rotuloAdicionar: 'Adicionar força de abertura', novaLinha: { porta: '', forca_n: null },
      colunas: [{ campo: 'porta', rotulo: 'PCF' }, { campo: 'forca_n', rotulo: 'Força (N)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'inspecao.ensaios', rotuloAdicionar: 'Adicionar ensaio funcional', novaLinha: { ensaio: '', tempo_s: null, resultado: '' },
      colunas: [{ campo: 'ensaio', rotulo: 'Ensaio (ex.: partida pelo detector do hall)' }, { campo: 'tempo_s', rotulo: 'Tempo (s)', tipo: 'numero', largura: 100 }, { campo: 'resultado', rotulo: 'Resultado', tipo: 'selecao', opcoes: OP.resultado, largura: 150 }] },
    { tipo: 'tabela', caminho: 'inspecao.ventiladores', rotuloAdicionar: 'Adicionar medição de ventilador', novaLinha: { equipamento: 'V1', vazao_m3h: null, pressao_pa: null, corrente_a: null },
      colunas: [{ campo: 'equipamento', rotulo: 'Ventilador', largura: 100 }, { campo: 'vazao_m3h', rotulo: 'Vazão (m³/h)', tipo: 'numero', largura: 120 }, { campo: 'pressao_pa', rotulo: 'Pressão (Pa)', tipo: 'numero', largura: 110 }, { campo: 'corrente_a', rotulo: 'Corrente (A)', tipo: 'numero', largura: 110 }] },
  ] },
  F.secaoNcs(11, CHECKLIST.map(x => x.cod)),
  F.secaoFotos(12),
];

module.exports = criarDisciplina({
  chave: 'pressurizacao',
  nome: 'Pressurização de escadas — controle de fumaça e automação (NBR 14880 / CBMDF)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Instalação do sistema', descricao: 'Ventiladores, dutos, grelhas, tomada de ar, alívio, painel de comando, automação, cabos, integração com a central, comissionamento e projeto' },
    { modo: 'automacao', rotulo: 'Automação / adequação do painel', descricao: 'Painel com inversor ou soft-starter, controlador, sensores de pressão, pressostatos, acionadores remotos e integração com a central (ventiladores e dutos existentes)' },
    { modo: 'inspecao', rotulo: 'Inspeção, manutenção e laudo', descricao: 'Ensaios de ΔP, velocidade, força e tempos, manutenção preventiva, laudo com ART e correção das não conformidades' },
  ],
  montarOrcamento,
});
