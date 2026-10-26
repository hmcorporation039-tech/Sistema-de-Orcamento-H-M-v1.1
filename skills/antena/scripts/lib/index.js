// Disciplina ANTENA COLETIVA / TV (MATV e SMATV) — contrato do sistema.
// TV digital aberta ISDB-Tb (UHF) por rede de derivadores e satélite banda Ku
// por multiswitch; cálculo de níveis por ponto (link budget), proteção contra
// surtos e aterramento do mastro.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const C = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-predio.json');

const NORMAS = [
  ['Norma ABNT de distribuição de sinais de TV em edificações', 'número a confirmar (citada no pedido como ABNT NBR 16207) [CONFERIR]; na falta dela, adotam-se as referências abaixo'],
  ['IEC/EN 60728-1', 'Redes de cabos para sinais de televisão — desempenho do sistema (níveis na tomada, MER, C/N)'],
  ['IEC/EN 60728-11', 'Redes de cabos para sinais de televisão — segurança (aterramento e equipotencialização do mastro e do headend)'],
  ['ABNT NBR 15601 / NBR 15604', 'TV digital terrestre ISDB-Tb — transmissão e receptores (sensibilidade e nível máximo de entrada)'],
  ['ABNT NBR 14565:2019', 'Cabeamento estruturado — referência de topologia, caminhos e identificação'],
  ['ABNT NBR 5419-3 e NBR 5419-4', 'SPDA: mastro na zona de proteção e ligação equipotencial; DPS nas linhas de sinal'],
  ['ABNT NBR 5410', 'Equipotencialização e proteção contra surtos da instalação de baixa tensão'],
  ['ABNT NBR 6123', 'Forças devidas ao vento — fixação do mastro e das antenas'],
  ['Anatel', 'Canalização da TV digital (UHF 14–51 após o remanejamento da faixa de 700 MHz) e migração da TV aberta via satélite para a banda Ku [CONFERIR]'],
];
const SECOES_CHECKLIST = ['Documentação', 'Antenas e mastro', 'Headend', 'Distribuição', 'Tomadas e níveis', 'Proteção e aterramento'];
const num = (v, c = 1) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));
const ROT_TIPO = { terrestre: 'TV digital terrestre (MATV)', satelite: 'Satélite banda Ku (SMATV)', ambos: 'TV digital terrestre + satélite banda Ku (SMATV)' };
const ROT_SIT = { ok: 'OK', baixo: 'abaixo do alvo', insuficiente: 'INSUFICIENTE', alto: 'ACIMA do máximo' };
const maiuscula = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
// 2e-4 → "2×10⁻⁴"
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const fmtBer = (v) => { const [m, e] = Number(v).toExponential(1).split('e'); return `${m.replace('.0', '').replace('.', ',')}×10${String(Number(e)).split('').map(c => SUP[c]).join('')}`; };
const nBer = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));

function processar(dados) {
  const calc = C.calcular(dados);
  const E = calc.E;
  const insp = dados.inspecao || {};
  const na = {};
  if (!E.temSat) { na.A2 = 'Sem recepção via satélite no escopo'; na.N3 = 'Sem recepção via satélite no escopo'; }
  if (!E.temTerr) { na.A1 = 'Sem TV terrestre no escopo'; na.N1 = 'Sem TV terrestre no escopo'; na.N2 = 'Sem TV terrestre no escopo'; }
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, na);
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const medicoes = (insp.medicoes || []).filter(m => m && (m.ponto || m.nivel_dbuv != null)).map(m => {
    const sat = m.servico === 'satelite';
    const nivel = m.nivel_dbuv === '' || m.nivel_dbuv == null ? null : Number(m.nivel_dbuv);
    const mer = m.mer_db === '' || m.mer_db == null ? null : Number(m.mer_db);
    const ber = nBer(m.ber);
    const [mn, mx] = sat ? [E.sat.nivelMin, E.sat.nivelMax] : [E.nivelMin, E.nivelMax];
    const merMin = sat ? E.mer.sat : E.mer.terr;
    let resultado = 'NV';
    if (nivel != null || mer != null) {
      const okN = nivel == null || (nivel >= mn && nivel <= mx);
      const okM = mer == null || mer >= merMin;
      const okB = ber == null || ber <= E.berMax;
      resultado = okN && okM && okB ? 'C' : 'NC';
    }
    return { ...m, nivel, mer, ber, criterio: `${mn}–${mx} dBµV · MER ≥ ${merMin} dB${ber != null ? ` · BER ≤ ${fmtBer(E.berMax)}` : ''}`, resultado };
  });
  return { dados, calc, insp, checklist, ncs, medicoes, parecer: I.parecer(checklist, ncs, medicoes) };
}

// ── apoio aos textos/tabelas ──
const posicoes = (calc) => (calc.deriv ? calc.deriv.torres.flatMap(t => t.posicoes) : []);
function faixaTerr(calc) {
  const v = [...posicoes(calc), ...(calc.deriv ? calc.deriv.areas : [])];
  const ms = calc.ms && calc.E.terrPorMs ? calc.ms.linhas : [];
  const mins = [...v.map(p => p.tomadaMin), ...ms.map(l => l.terrMin)].filter(x => x != null);
  const maxs = [...v.map(p => p.tomadaMax), ...ms.map(l => l.terrMax)].filter(x => x != null);
  const sits = [...v.map(p => p.situacao), ...ms.map(l => l.situacaoTerr)].filter(Boolean);
  return mins.length ? { min: Math.min(...mins), max: Math.max(...maxs), ok: sits.every(s => s === 'ok'), insuf: sits.some(s => s === 'insuficiente' || s === 'alto') } : null;
}
function faixaSat(calc) {
  if (!calc.ms) return null;
  const l = calc.ms.linhas;
  return { min: Math.min(...l.map(x => x.satMin)), max: Math.max(...l.map(x => x.satMax)), ok: l.every(x => x.situacaoSat === 'ok'), insuf: l.some(x => x.situacaoSat === 'insuficiente' || x.situacaoSat === 'alto') };
}
function textoHeadend(calc) {
  const { E, deriv, ms } = calc;
  const partes = [];
  if (deriv) {
    if (deriv.amplificador) partes.push(`amplificador UHF ajustado em ${num(deriv.amplificador.ganho)} dB (saída máx. ${num(deriv.amplificador.saidaMax)} dBµV, limite ${num(deriv.amplificador.vmaxN)} dBµV para ${E.nCanais} canais)`);
    else if (deriv.atenuadorEntrada) partes.push(`sem amplificador — atenuador de ${deriv.atenuadorEntrada} dB na entrada`);
    else partes.push('sem amplificador (sinal suficiente)');
  }
  if (ms) {
    if (ms.ampTerr) partes.push(`TV aberta: amplificador UHF ${num(ms.ampTerr.ganho)} dB antes do multiswitch`);
    else if (E.terrPorMs && ms.atenuadorEntradaTerr) partes.push(`TV aberta: atenuador de ${ms.atenuadorEntradaTerr} dB antes do multiswitch`);
    partes.push(ms.ampSat ? `amplificador de FI (satélite) ${num(ms.ampSat.ganho)} dB` : 'satélite sem amplificador de FI');
  }
  return partes.join('; ');
}
const linhaPos = (p) => [p.torre, p.pavimento, `${p.unidades} un.`, `${p.saidas} × ${p.derivacao} dB`, num(p.entradaMin), p.ampLinha ? `+${num(p.ampLinha)} dB` : '—', p.atenuador ? `${p.atenuador} dB` : '—', num(p.tomadaMin), num(p.tomadaMax), ROT_SIT[p.situacao]];
const linhaMs = (l, terr) => [l.torre, l.pavimento, l.multiswitch, String(l.pontosMs), num(l.satMin), num(l.satMax), ...(terr ? [num(l.terrMin), num(l.terrMax)] : []), ROT_SIT[l.situacaoSat] + (terr && l.situacaoTerr !== 'ok' ? ` / TV ${ROT_SIT[l.situacaoTerr]}` : '')];

function resumir(res) {
  const { calc } = res;
  const { E } = calc;
  const ft = faixaTerr(calc);
  const fs = faixaSat(calc);
  const a = calc.amplificadores;
  const tabelas = [];
  if (calc.deriv) {
    tabelas.push({ titulo: 'TV aberta — derivadores e níveis por pavimento (dBµV)', colunas: ['Torre', 'Pavimento', 'Unid.', 'Derivador', 'Entrada', 'Amp. linha', 'Atenuador', 'Tomada mín.', 'Tomada máx.', 'Situação'], linhas: posicoes(calc).map(linhaPos) });
    if (calc.deriv.areas.length) tabelas.push({ titulo: 'TV aberta — áreas comuns (dBµV)', colunas: ['Área', 'Pontos', 'Cabo (m)', 'Divisor', 'Atenuador', 'Tomada mín.', 'Tomada máx.', 'Situação'], linhas: calc.deriv.areas.map(x => [x.nome, x.pontos, num(x.d, 0), x.divisor.vias ? `${x.divisor.vias} vias` : '—', x.atenuador ? `${x.atenuador} dB` : '—', num(x.tomadaMin), num(x.tomadaMax), ROT_SIT[x.situacao]]) });
  }
  if (calc.ms) {
    tabelas.push({ titulo: `Satélite${E.terrPorMs ? ' + TV aberta' : ''} — multiswitch (${E.sat.topologia}) e níveis (dBµV)`, colunas: ['Torre', 'Pavimento', 'Multiswitch', 'Pontos', 'SAT mín.', 'SAT máx.', ...(E.terrPorMs ? ['TV mín.', 'TV máx.'] : []), 'Situação'], linhas: calc.ms.linhas.map(l => linhaMs(l, E.terrPorMs)) });
  }
  return {
    indicadores: [
      { rotulo: 'Sistema', valor: ROT_TIPO[E.tipo], detalhe: `${calc.nUnidades} unidades · ${calc.nPontos} pontos${calc.pontosSat ? ` (${calc.pontosSat} com satélite)` : ''}` },
      ...(E.temTerr ? [{ rotulo: 'Sinal na antena (UHF)', valor: `${num(E.terr.fraco)} a ${num(E.terr.forte)} dBµV`, detalhe: `${E.nCanais} canais · ${E.fMin}–${E.fMax} MHz · ${res.dados.sistema?.nivel_medido === 'medido' ? 'medido' : 'estimado [CONFERIR]'}` }] : []),
      { rotulo: 'Headend', valor: a.headendTerr || a.headendSat ? `${a.headendTerr + a.headendSat} amplificador(es)` : 'passivo', detalhe: textoHeadend(calc) },
      ...(ft ? [{ rotulo: 'TV aberta na tomada', valor: `${num(ft.min)} a ${num(ft.max)} dBµV`, detalhe: `faixa ${E.nivelMin}–${E.nivelMax} dBµV · alvo ${E.alvo} dBµV`, ok: ft.insuf ? false : ft.ok ? true : undefined }] : []),
      ...(fs ? [{ rotulo: 'Satélite na tomada', valor: `${num(fs.min)} a ${num(fs.max)} dBµV`, detalhe: `faixa ${E.sat.nivelMin}–${E.sat.nivelMax} dBµV · ${calc.nMultiswitch} multiswitch(es)`, ok: fs.insuf ? false : fs.ok ? true : undefined }] : []),
      ...(calc.deriv ? [{ rotulo: 'Derivadores', valor: String(calc.nDerivadores), detalhe: [...new Set(posicoes(calc).map(p => p.derivacao))].sort((x, y) => x - y).map(v => `${v} dB`).join(', ') }] : []),
      { rotulo: 'Amplificadores', valor: String(a.total), detalhe: `headend ${a.headendTerr + a.headendSat} · linha ${a.linhaTerr + a.linhaSat}` },
      ...(calc.deriv?.cn != null ? [{ rotulo: 'C/N estimada (amplificadores)', valor: `${num(calc.deriv.cn)} dB`, detalhe: `mínimo ${E.amp.cnMin} dB [CONFERIR]`, ok: calc.deriv.cn >= E.amp.cnMin }] : []),
      { rotulo: 'Cabo coaxial', valor: `${num(calc.caboRg6, 0)} m RG-6${calc.caboRg11 ? ` + ${num(calc.caboRg11, 0)} m RG-11` : ''}`, detalhe: `com ${E.reserva} % de reserva · ${calc.conectores} conectores F` },
      ...(res.medicoes.length ? [{ rotulo: 'Medições', valor: `${res.medicoes.filter(m => m.resultado === 'C').length}/${res.medicoes.length} conformes`, ok: res.medicoes.every(m => m.resultado !== 'NC') }] : []),
    ],
    textos: calc.avisos,
    tabelas,
  };
}

function secoesMemorial(res) {
  const { calc, dados } = res;
  const { E } = calc;
  const obra = dados.obra?.nome || 'a edificação';
  const secoes = [];
  secoes.push({ titulo: '1. Objeto e premissas', paragrafos: [
    `Sistema de ${ROT_TIPO[E.tipo]} de ${obra}: ${E.torres.length} torre(s)/bloco(s), ${calc.nPavimentos} pavimentos, ${calc.nUnidades} unidades e ${calc.nPontos} pontos de TV${calc.pontosSat ? `, dos quais ${calc.pontosSat} com satélite` : ''}${E.areas.length ? `, incluindo ${E.areas.length} área(s) comum(ns)` : ''}.`,
    `Faixa de nível adotada na tomada para TV digital ISDB-Tb: ${E.nivelMin} a ${E.nivelMax} dBµV, com alvo de projeto de ${E.alvo} dBµV no ponto mais desfavorável (margem para envelhecimento e variação do sinal) [CONFERIR com a norma ABNT aplicável; a IEC/EN 60728-1 adota faixa da ordem de 45–74 dBµV para COFDM 64-QAM]. Receptores ISDB-Tb operam de cerca de −77 dBm (≈ 32 dBµV) a −20 dBm (≈ 89 dBµV) na entrada (ABNT NBR 15604).`,
    ...(E.temSat ? [`Satélite (FI 950–2 150 MHz no cabo): ${E.sat.nivelMin} a ${E.sat.nivelMax} dBµV na tomada, alvo ${E.sat.alvo} dBµV [CONFERIR].`] : []),
    `Critério de aceitação nas medições: nível dentro da faixa, MER ≥ ${E.mer.terr} dB (TV terrestre)${E.temSat ? ` e ≥ ${E.mer.sat} dB (satélite)` : ''} e BER pós-Viterbi ≤ ${fmtBer(E.berMax)} [CONFERIR com a modulação e a taxa de código das emissoras].`,
  ] });
  if (E.temTerr) {
    secoes.push({ titulo: '2. Sinais recebidos — TV digital terrestre', paragrafos: [
      `Faixa UHF de TV digital: canais 14 a 51 (470–698 MHz) após o remanejamento da faixa de 700 MHz para o serviço móvel [CONFERIR]. Canal físico n ocupa ${'470 + 6·(n − 14)'} a ${'476 + 6·(n − 14)'} MHz. Nível na antena ${res.dados.sistema?.nivel_medido === 'medido' ? 'medido em campo' : 'ESTIMADO — medir antes da execução [CONFERIR]'}: ${num(E.terr.fraco)} dBµV (canal mais fraco) a ${num(E.terr.forte)} dBµV (mais forte).`,
    ],
    tabela: E.canais.length ? { colunas: ['Canal', 'Emissora', 'Faixa (MHz)', 'Nível na antena (dBµV)'], linhas: E.canais.map(c => [String(c.canal), c.emissora || '—', c.faixa ? `${c.faixa[0]}–${c.faixa[1]}` : '—', num(c.nivel)]), proporcoes: [0.6, 2, 1.2, 1.4] } : undefined });
  }
  if (E.temSat) {
    secoes.push({ titulo: `${E.temTerr ? 3 : 2}. Sinais recebidos — satélite`, paragrafos: [
      `Antena parabólica offset banda Ku Ø ${E.sat.diametro} cm com LNBF quattro (4 saídas: polarizações V/H × bandas baixa/alta) alimentando multiswitch ${E.sat.topologia === 'cascata' ? 'em cascata, um por pavimento (tronco de 5 linhas na prumada)' : 'central no headend, com um cabo por ponto (estrela)'}. Satélite: ${E.sat.nome || '(informar)'}${E.sat.posicao ? ` em ${E.sat.posicao}` : ''}${E.sat.transponders ? `, transponders ${E.sat.transponders}` : ''}. Nível na saída do LNBF ${num(E.sat.lnbf)} a ${num(E.sat.lnbfMax)} dBµV [CONFERIR].`,
      'A TV aberta via satélite para recepção doméstica migrou da banda C para a banda Ku com a liberação da faixa de 3,5 GHz para o 5G — conferir o satélite, as frequências e as polarizações vigentes das emissoras [CONFERIR].',
    ] });
  }
  const nS = (k) => k + (E.temTerr ? 1 : 0) + (E.temSat ? 1 : 0);
  secoes.push({ titulo: `${nS(2)}. Cabos e componentes`, paragrafos: [
    `Cabo coaxial RG-6 75 Ω${E.caboPrumada === 'RG-11' ? ' nas derivações e RG-11 na prumada/tronco' : ''}. Atenuação adotada (dB/100 m): ${num(E.a.min * 100)} a ${E.fMin} MHz e ${num(E.a.max * 100)} a ${E.fMax} MHz${E.temSat ? `; ${num(E.a.satMin * 100)} a 950 MHz e ${num(E.a.satMax * 100)} a 2 150 MHz` : ''} — valores típicos de catálogo ou informados [CONFERIR com o fabricante]. O mínimo de cada tomada é calculado na maior frequência (maior atenuação) e o máximo na menor.`,
  ],
  tabela: { colunas: ['Derivador (saídas)', '8 dB', '12 dB', '16 dB', '20 dB', '24 dB'], linhas: Object.entries(C.DERIVADORES).map(([s, v]) => [`${s} saída(s) — perda de inserção`, ...[8, 12, 16, 20, 24].map(T => (v[T] != null ? `${num(v[T])} dB` : '—'))]), proporcoes: [2.2, 0.8, 0.8, 0.8, 0.8, 0.8] },
  notas: [`Divisores (perda por saída, UHF): ${Object.entries(C.DIVISORES).map(([k, v]) => `${k} vias ${num(v)} dB`).join('; ')}. Tomada terminal ${num(E.perdaTomada)} dB${E.temSat ? `; tomada SAT/TV-SAT ${num(E.perdaTomadaSat)} dB` : ''}. [CONFERIR]`] });
  secoes.push({ titulo: `${nS(3)}. Headend`, paragrafos: [
    `${maiuscula(textoHeadend(calc))}. Cabo da antena ao headend: ${num(E.dAH, 0)} m.`,
    ...(calc.deriv ? [`Nível máximo de saída do amplificador: ${num(E.amp.vmax)} dBµV (DIN 45004B), reduzido em 7,5·log(N − 1) para N = ${E.nCanais} canais → ${num(E.vmaxN)} dBµV [CONFERIR com o fabricante]. Ganho escolhido: o menor que leva todas as tomadas ao alvo, limitado pelo ganho máximo (${E.amp.ganhoMax} dB) e pelo nível máximo de saída; acima disso, amplificadores de linha na prumada.`] : []),
    ...(calc.deriv?.cn != null ? [`C/N estimada após a cadeia de amplificadores: ${num(calc.deriv.cn)} dB (C/N = nível na entrada − NF ${num(E.amp.nf)} dB − ruído térmico ${num(C.RUIDO_TERMICO_DBUV)} dBµV em 5,57 MHz; estágios somados em potência) — mínimo recomendado ${E.amp.cnMin} dB [CONFERIR].`] : []),
  ] });
  if (calc.deriv) {
    const t0 = calc.deriv.torres[0];
    secoes.push({ titulo: `${nS(4)}. Cálculo de níveis — rede de derivadores (TV aberta)`, paragrafos: [
      'Nível na tomada = nível na antena − cabo até o headend + ganho do amplificador − divisor do headend − cabo da prumada (dB/m × m) − perdas de inserção dos derivadores anteriores − derivação do pavimento − cabo até a unidade e até a tomada − divisor da unidade − tomada.',
      `Derivador de cada pavimento: o MAIOR valor comercial (8/12/16/20/24 dB, conforme o número de saídas) que mantém a tomada mais desfavorável do pavimento no alvo de ${E.alvo} dBµV — guarda sinal para os pavimentos de baixo e equaliza a prumada. Se o canal mais forte na menor frequência passar de ${E.nivelMax} dBµV, sobe-se a derivação ou aplica-se atenuador nas saídas. Pavimentos com até 8 unidades: um derivador; acima disso, derivadores em série. Saídas sem uso e fim da prumada terminados em 75 Ω.`,
      `Unidades da ${t0.nome}: ${t0.pontos} ponto(s) por unidade${t0.pontos > 1 ? ` com divisor de ${t0.divisorUnidade.vias} vias (${num(t0.divisorUnidade.perda)} dB)` : ''}, cabo da prumada à unidade de ${num(t0.dMin, 0)} a ${num(t0.dMax, 0)} m (média ${num(t0.dMed, 0)} m) e ${num(E.interna, 0)} m até cada tomada; altura entre pavimentos ${num(E.peDireito)} m.`,
    ],
    tabela: { colunas: ['Torre', 'Pavimento', 'Unid.', 'Derivador', 'Entrada (dBµV)', 'Amp. linha', 'Atenuador', 'Tomada mín.', 'Tomada máx.', 'Situação'], linhas: posicoes(calc).map(linhaPos), proporcoes: [0.9, 0.9, 0.5, 0.9, 0.8, 0.7, 0.7, 0.7, 0.7, 1], tamanho: 14 },
    notas: [`Tomada mín.: canal mais fraco a ${E.fMax} MHz no maior percurso; tomada máx.: canal mais forte a ${E.fMin} MHz no menor percurso.`] });
    if (calc.deriv.areas.length) {
      secoes.push({ titulo: `${nS(4)}.1 Áreas comuns`, paragrafos: ['Cada área comum é atendida por uma saída do divisor do headend, com cabo próprio e divisor local.'],
        tabela: { colunas: ['Área', 'Pontos', 'Cabo (m)', 'Divisor', 'Atenuador', 'Tomada mín.', 'Tomada máx.', 'Situação'], linhas: calc.deriv.areas.map(x => [x.nome, x.pontos, num(x.d, 0), x.divisor.vias ? `${x.divisor.vias} vias` : '—', x.atenuador ? `${x.atenuador} dB` : '—', num(x.tomadaMin), num(x.tomadaMax), ROT_SIT[x.situacao]]), proporcoes: [1.6, 0.6, 0.7, 0.8, 0.8, 0.8, 0.8, 1] } });
    }
  }
  if (calc.ms) {
    secoes.push({ titulo: `${nS(5)}. Cálculo de níveis — multiswitch (satélite${E.terrPorMs ? ' e TV aberta' : ''})`, paragrafos: [
      `Satélite: nível na tomada = nível do LNBF − cabo até o headend${calc.ms.ampSat ? ` + amplificador de FI ${num(calc.ms.ampSat.ganho)} dB` : ''}${calc.ms.divisorTronco?.vias > 1 ? ` − divisor de tronco ${calc.ms.divisorTronco.sat.vias} vias (${num(calc.ms.divisorTronco.sat.perda)} dB)` : ''} − cabo do tronco − passagem dos multiswitches anteriores (${num(E.sat.passagem)} dB cada) ${E.sat.ganhoMs >= 0 ? '+' : '−'} ganho/perda de saída do multiswitch (${num(Math.abs(E.sat.ganhoMs))} dB) − cabo até a tomada − tomada. Mínimo a 2 150 MHz, máximo a 950 MHz.`,
      ...(E.terrPorMs ? [`TV aberta pela entrada terrestre do multiswitch: derivação ${num(E.sat.terrDerivacao)} dB e passagem ${num(E.sat.terrPassagem)} dB por multiswitch; tomadas TV/SAT diplexadas.`] : []),
      `Multiswitches: ${calc.nMultiswitch} (${[...new Set(calc.ms.mss)].map(s => `5×${s}`).join(', ')}), um por pavimento até 32 saídas${E.sat.topologia === 'estrela' ? ' — na topologia em estrela, todos no headend' : ''}. Uma saída por receptor/ponto.`,
    ],
    tabela: { colunas: ['Torre', 'Pavimento', 'Multiswitch', 'Pontos', 'SAT mín.', 'SAT máx.', ...(E.terrPorMs ? ['TV mín.', 'TV máx.'] : []), 'Situação'], linhas: calc.ms.linhas.map(l => linhaMs(l, E.terrPorMs)), proporcoes: [1, 1, 1, 0.6, 0.7, 0.7, ...(E.terrPorMs ? [0.7, 0.7] : []), 1.2], tamanho: 14 } });
  }
  secoes.push({ titulo: `${nS(6)}. Proteção contra surtos e aterramento`, paragrafos: [
    'O mastro deve ficar dentro do volume de proteção do SPDA e ser ligado ao subsistema de captação/aterramento por condutor de cobre de 16 mm² (ABNT NBR 5419-3; IEC/EN 60728-11) [CONFERIR com o projeto de SPDA]. Sem SPDA, aterrar o mastro no BEP da edificação pelo caminho mais curto.',
    `Na entrada dos cabos de antena no edifício: DPS coaxial 75 Ω em cada linha (${calc.dps} un.) e blindagens ligadas ao BEL do headend, interligado ao BEP (ABNT NBR 5419-4 e NBR 5410). Cabos coaxiais separados dos circuitos de energia e identificados por pavimento e unidade.`,
  ] });
  secoes.push({ titulo: `${nS(7)}. Lista de materiais (preliminar)`, tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 0), m.referencia]), proporcoes: [0.7, 4, 0.5, 0.6, 1.6] },
    notas: [`Cabo por trecho: antena–headend, tronco/prumada, unidade (distância média + ${num(E.interna, 0)} m por tomada) com ${E.reserva} % de reserva. Conectores F estimados em 2 por trecho de cabo + 10 %.`] });
  if (calc.avisos.length) secoes.push({ titulo: 'Avisos', marcadores: calc.avisos });
  return secoes;
}

function abaNiveis(calc) {
  const linhas = [];
  posicoes(calc).forEach(p => linhas.push({ rede: 'TV aberta (derivadores)', torre: p.torre, pavimento: p.pavimento, elemento: `Derivador ${p.saidas} saída(s) ${p.derivacao} dB`, pontos: p.unidades, entrada: p.entradaMin, amp: p.ampLinha || null, att: p.atenuador || null, min: p.tomadaMin, max: p.tomadaMax, situacao: ROT_SIT[p.situacao] }));
  (calc.deriv ? calc.deriv.areas : []).forEach(x => linhas.push({ rede: 'TV aberta (derivadores)', torre: 'Áreas comuns', pavimento: x.nome, elemento: x.divisor.vias ? `Divisor ${x.divisor.vias} vias` : 'Cabo direto', pontos: x.pontos, entrada: null, amp: null, att: x.atenuador || null, min: x.tomadaMin, max: x.tomadaMax, situacao: ROT_SIT[x.situacao] }));
  (calc.ms ? calc.ms.linhas : []).forEach(l => {
    linhas.push({ rede: 'Satélite (multiswitch)', torre: l.torre, pavimento: l.pavimento, elemento: `Multiswitch ${l.multiswitch}`, pontos: l.pontosMs, entrada: l.entradaSat, amp: l.ampLinha || null, att: l.atenuadorSat || null, min: l.satMin, max: l.satMax, situacao: ROT_SIT[l.situacaoSat] });
    if (l.terrMin != null) linhas.push({ rede: 'TV aberta (multiswitch)', torre: l.torre, pavimento: l.pavimento, elemento: `Multiswitch ${l.multiswitch} — entrada terrestre`, pontos: l.pontosMs, entrada: null, amp: null, att: l.atenuadorTerr || null, min: l.terrMin, max: l.terrMax, situacao: ROT_SIT[l.situacaoTerr] });
  });
  return {
    nome: 'Níveis por ponto',
    colunas: [{ header: 'Rede', key: 'rede', width: 24 }, { header: 'Torre', key: 'torre', width: 14 }, { header: 'Pavimento / área', key: 'pavimento', width: 18 }, { header: 'Elemento', key: 'elemento', width: 30 }, { header: 'Unid./pontos', key: 'pontos', width: 11 },
      { header: 'Entrada (dBµV)', key: 'entrada', numFmt: '0.0' }, { header: 'Amp. linha (dB)', key: 'amp', numFmt: '0.0' }, { header: 'Atenuador (dB)', key: 'att' }, { header: 'Tomada mín. (dBµV)', key: 'min', numFmt: '0.0' }, { header: 'Tomada máx. (dBµV)', key: 'max', numFmt: '0.0' }, { header: 'Situação', key: 'situacao', width: 16 }],
    linhas,
  };
}

function abaComponentes(calc) {
  const { E, deriv, ms } = calc;
  const l = [];
  const add = (grupo, item, valor) => l.push({ grupo, item, valor: String(valor) });
  add('Sistema', 'Tipo', ROT_TIPO[E.tipo]);
  add('Sistema', 'Unidades / pontos / pontos com satélite', `${calc.nUnidades} / ${calc.nPontos} / ${calc.pontosSat}`);
  if (E.temTerr) {
    add('TV aberta', 'Canais / faixa', `${E.nCanais} canais · ${E.fMin}–${E.fMax} MHz`);
    add('TV aberta', 'Nível na antena (fraco / forte)', `${num(E.terr.fraco)} / ${num(E.terr.forte)} dBµV`);
    add('TV aberta', 'Faixa / alvo na tomada', `${E.nivelMin}–${E.nivelMax} / ${E.alvo} dBµV`);
  }
  add('Cabo', `Atenuação RG-6 (dB/100 m) a ${E.fMin} / ${E.fMax} MHz`, `${num(E.a.min * 100)} / ${num(E.a.max * 100)}`);
  if (E.temSat) add('Cabo', 'Atenuação RG-6 (dB/100 m) a 950 / 2 150 MHz', `${num(E.a.satMin * 100)} / ${num(E.a.satMax * 100)}`);
  add('Headend', 'Configuração', textoHeadend(calc));
  if (deriv) {
    add('Headend', 'Divisor do headend', deriv.split.vias ? `${deriv.split.vias} vias (${num(deriv.split.perda)} dB)` : 'não há');
    add('Headend', 'Nível na entrada do headend (fraco / forte)', `${num(deriv.inW)} / ${num(deriv.inS)} dBµV`);
    deriv.torres.forEach(t => t.ampsLinha.forEach(x => add('Amplificador de linha', `${t.nome} — antes do ${x.pavimento}`, `${num(x.ganho)} dB`)));
  }
  if (ms) {
    add('Satélite', 'LNBF (fraco / forte)', `${num(E.sat.lnbf)} / ${num(E.sat.lnbfMax)} dBµV`);
    add('Satélite', 'Topologia / multiswitches', `${E.sat.topologia} · ${calc.nMultiswitch} (${ms.mss.map(s => `5×${s}`).join(', ')})`);
    ms.ampsLinha.forEach(x => add('Amplificador de linha (FI)', `${x.torre} — antes do ${x.pavimento}`, `${num(x.ganho)} dB`));
  }
  add('Proteção', 'DPS coaxial', calc.dps);
  add('Quantitativos', 'Cabo RG-6 / RG-11 (m)', `${calc.caboRg6} / ${calc.caboRg11}`);
  add('Quantitativos', 'Conectores F / terminadores 75 Ω', `${calc.conectores} / ${calc.terminadores}`);
  return { nome: 'Componentes', colunas: [{ header: 'Grupo', key: 'grupo', width: 24 }, { header: 'Item', key: 'item', width: 48 }, { header: 'Valor', key: 'valor', width: 60 }], linhas: l };
}

function referenciasCampo(calc) {
  const { E } = calc;
  const ft = faixaTerr(calc);
  const fs = faixaSat(calc);
  const pos = posicoes(calc);
  return [
    ...(E.temTerr ? [['Nível na antena (canal fraco / forte)', `${num(E.terr.fraco)} / ${num(E.terr.forte)} dBµV`]] : []),
    ['Headend', textoHeadend(calc)],
    ...(pos.length ? [['Tomada mais próxima do headend (projeto)', `${pos[0].torre} ${pos[0].pavimento}: ${num(pos[0].tomadaMin)}–${num(pos[0].tomadaMax)} dBµV`], ['Tomada mais distante (projeto)', `${pos[pos.length - 1].torre} ${pos[pos.length - 1].pavimento}: ${num(pos[pos.length - 1].tomadaMin)}–${num(pos[pos.length - 1].tomadaMax)} dBµV`]] : []),
    ...(ft ? [['Faixa TV aberta na tomada', `${E.nivelMin}–${E.nivelMax} dBµV · MER ≥ ${E.mer.terr} dB`]] : []),
    ...(fs ? [['Faixa satélite na tomada', `${E.sat.nivelMin}–${E.sat.nivelMax} dBµV · MER ≥ ${E.mer.sat} dB`]] : []),
    ['Aterramento do mastro', 'Ligado ao SPDA/BEP (16 mm² Cu)'],
  ];
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo e de cálculo de níveis', formato: 'Word', nome: 'Memorial_Antena_Coletiva',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO — ANTENA COLETIVA / TV', subtitulo: 'Distribuição de TV digital ISDB-Tb e satélite — cálculo de níveis por ponto', tituloCurto: 'Memorial — antena coletiva', sigla: 'MEM-ANT', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de níveis, componentes e materiais', formato: 'Excel', nome: 'Antena_Coletiva',
    gerar: (res) => D.gerarPlanilha([
      abaNiveis(res.calc),
      abaComponentes(res.calc),
      { nome: 'Medições', colunas: [{ header: 'Ponto', key: 'ponto', width: 18 }, { header: 'Serviço', key: 'servico', width: 12 }, { header: 'Canal / transponder', key: 'canal', width: 18 }, { header: 'Nível (dBµV)', key: 'nivel' }, { header: 'MER (dB)', key: 'mer' }, { header: 'BER', key: 'ber' }, { header: 'Critério', key: 'criterio', width: 36 }, { header: 'Resultado', key: 'resultado' }], linhas: res.medicoes },
      D.abaMateriais(res.calc.materiais),
    ]) },
  { tipo: 'relatorio', rotulo: 'Relatório de medição / comissionamento', formato: 'Word', nome: 'Relatorio_Medicao_Antena',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, {
      titulo: 'RELATÓRIO DE MEDIÇÃO E COMISSIONAMENTO — ANTENA COLETIVA / TV', tipoInspecao: res.insp.tipo === 'periodica' ? 'Vistoria / medição periódica' : 'Comissionamento e entrega (medição por ponto)', tituloCurto: 'Relatório — antena coletiva', sigla: 'REL-ANT',
      objetivo: 'Verificar o nível de sinal, a MER e a BER em cada ponto de TV, a fixação e o apontamento das antenas, o ajuste do headend, a distribuição (derivadores/multiswitch e terminações), o aterramento do mastro, os DPS coaxiais e a identificação do sistema de antena coletiva.',
      listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
      descricao: [
        ['Sistema', ROT_TIPO[res.calc.tipo]],
        ['Edificação', `${res.calc.E.torres.length} torre(s) · ${res.calc.nPavimentos} pavimentos · ${res.calc.nUnidades} unidades · ${res.calc.nPontos} pontos`],
        ['Headend (projeto)', textoHeadend(res.calc)],
        ...(res.calc.deriv ? [['Derivadores', `${res.calc.nDerivadores} — ${[...new Set(posicoes(res.calc).map(p => `${p.saidas}×${p.derivacao} dB`))].join(', ')}`]] : []),
        ...(res.calc.ms ? [['Multiswitches', `${res.calc.nMultiswitch} (${res.calc.E.sat.topologia})`]] : []),
      ],
      metodologia: [
        'Inspeção visual do mastro, antenas, headend, caixas de prumada, derivadores/multiswitch, terminações e tomadas.',
        'Medição com analisador de sinais de TV digital/satélite: nível (dBµV), MER (dB) e BER em cada canal/transponder por ponto (ou amostra acordada, incluindo o ponto mais próximo e o mais distante do headend).',
        'Conferência do aterramento do mastro, da continuidade das blindagens ao BEL e dos DPS coaxiais.',
      ],
      medicoes: [{ titulo: '6.1 Medição por ponto', colunas: ['Ponto', 'Serviço', 'Canal / TP', 'Nível (dBµV)', 'MER (dB)', 'BER', 'Critério', 'Resultado'], proporcoes: [1.1, 0.8, 0.8, 0.8, 0.7, 0.7, 1.8, 0.8],
        linhas: res.medicoes.map(m => [m.ponto || '', m.servico === 'satelite' ? 'Satélite' : 'TV aberta', m.canal ?? '', num(m.nivel), num(m.mer), m.ber != null ? fmtBer(m.ber) : '', m.criterio, m.resultado]),
        nota: 'Nível fora da faixa, MER abaixo do mínimo ou BER acima do máximo = NC.' }],
      proximaInspecao: [['Medição periódica', 'Anual, e sempre que houver mudança de canais das emissoras, reapontamento ou intervenção na prumada [CONFERIR]'], ['Mastro e aterramento', 'Inspeção visual anual junto com a do SPDA']],
    }, { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Antena',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, {
      titulo: 'CHECKLIST DE CAMPO — ANTENA COLETIVA / TV', subtitulo: 'Medição de nível/MER por ponto e vistoria do sistema', tituloCurto: 'Checklist — antena coletiva', secoesChecklist: SECOES_CHECKLIST,
      preparacao: [
        'Levar analisador de sinais de TV digital/satélite calibrado, jumpers F, chave de conector, terminadores 75 Ω e a planilha de níveis de projeto.',
        'Avisar o síndico/administração: a medição no headend pode interromper o sinal por alguns minutos. Trabalho no mastro/cobertura com NR-35 (altura) e sem tempestade.',
      ],
      referencias: referenciasCampo(res.calc),
      medicoes: [{ titulo: 'Medição por ponto', colunas: ['Ponto', 'Projeto (dBµV)', 'Nível medido', 'MER (dB)', 'BER', 'Obs.'], proporcoes: [1.6, 1.2, 0.9, 0.8, 0.8, 1.4],
        linhas: [
          ...posicoes(res.calc).map(p => [`${p.torre} ${p.pavimento} — TV`, `${num(p.tomadaMin)}–${num(p.tomadaMax)}`, '', '', '', '']),
          ...(res.calc.deriv ? res.calc.deriv.areas.map(x => [`${x.nome} — TV`, `${num(x.tomadaMin)}–${num(x.tomadaMax)}`, '', '', '', '']) : []),
          ...(res.calc.ms ? res.calc.ms.linhas.map(l => [`${l.torre} ${l.pavimento} — SAT`, `${num(l.satMin)}–${num(l.satMax)}`, '', '', '', '']) : []),
        ] }],
    }, res.checklist)) },
];

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const { E } = calc;
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade) => ({ secao: S, subgrupo: 'Antena coletiva', codigo, descricao, quantidade, unidade });
  const obra = dados.obra?.nome || 'a edificação';
  const pontosMedir = Number(dados.inspecao?.pontos_a_medir) > 0 ? Number(dados.inspecao.pontos_a_medir) : calc.nPontos + (E.temDerivadores && E.temSat ? calc.pontosSat : 0);
  let itens;
  if (modo === 'inspecao') {
    itens = [
      srv('antena_vistoria', 'Vistoria do sistema de antena coletiva (antenas, mastro, headend, distribuição e aterramento)', 1, 'vb'),
      srv('antena_medicao', 'Medição de nível e MER/BER por ponto e ajuste', pontosMedir, 'pt'),
      srv('antena_relatorio', 'Relatório de medição/comissionamento da antena coletiva com ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
    ];
  } else {
    const nAntenas = E.antenasUhf + (E.temSat ? 1 : 0);
    const pavDeriv = calc.nDerivadores + (calc.ms && E.sat.topologia === 'cascata' ? calc.ms.linhas.filter(l => l.saidas).length : 0);
    const ampsLinha = calc.amplificadores.linhaTerr + calc.amplificadores.linhaSat;
    const pontosTotais = calc.nPontos + (E.temDerivadores && E.temSat ? calc.pontosSat : 0);
    itens = [
      ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Antena coletiva', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      srv('antena_instalacao', `Instalação de antena (${[E.antenasUhf ? `${E.antenasUhf} UHF` : '', E.temSat ? 'parabólica Ku + LNBF' : ''].filter(Boolean).join(' e ')}) com mastro, suporte e apontamento`, nAntenas, 'un'),
      srv('antena_headend', 'Montagem e ajuste do headend (amplificador, divisores, multiswitch central e DPS)', 1, 'vb'),
      ...(pavDeriv ? [srv('antena_derivador', 'Instalação de derivador/multiswitch de pavimento (caixa, conexões e terminação)', pavDeriv, 'un')] : []),
      ...(ampsLinha ? [srv('antena_amplificador_linha', 'Instalação e ajuste de amplificador de linha na prumada', ampsLinha, 'un')] : []),
      ...(calc.prumadaM ? [srv('antena_prumada', 'Lançamento de cabo coaxial na prumada/tronco', calc.prumadaM, 'm')] : []),
      srv('antena_passagem_ponto', 'Passagem de cabo coaxial da prumada até a tomada', pontosTotais, 'pt'),
      srv('antena_ponto', 'Conectorização de ponto de TV/antena (conector coaxial RG-6)', pontosTotais, 'pt'),
      srv('antena_aterramento', 'Aterramento e equipotencialização do mastro e do headend (DPS coaxial)', 1, 'vb'),
      srv('antena_medicao', 'Medição de nível e MER/BER por ponto e ajuste', pontosTotais, 'pt'),
      srv('antena_projeto', 'Projeto de antena coletiva com cálculo de níveis (link budget) e ART', 1, 'vb'),
    ];
  }
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: modo === 'inspecao'
      ? `Vistoria e medição do sistema de antena coletiva de ${obra} (${pontosMedir} pontos): nível, MER e BER por ponto, inspeção do mastro, headend, distribuição, aterramento e DPS, com relatório e ART.`
      : `Fornecimento e instalação de sistema de ${ROT_TIPO[E.tipo]} em ${obra}: ${calc.nPontos} pontos em ${calc.nUnidades} unidades${E.areas.length ? ' e áreas comuns' : ''}, ${textoHeadend(calc)}${calc.nDerivadores ? `, ${calc.nDerivadores} derivadores equalizados por pavimento` : ''}${calc.nMultiswitch ? `, ${calc.nMultiswitch} multiswitch(es)` : ''}, cabo RG-6, conectores F de compressão, DPS coaxial, aterramento do mastro e medição de nível/MER em todos os pontos.`,
    observacoes: 'Rascunho gerado pela skill de antena coletiva — conferir níveis medidos na antena, modelos dos componentes, quantidades e preços antes de enviar ao cliente.',
    itens,
  };
}

const OP = {
  tipo: F.op([['terrestre', 'TV digital terrestre (UHF)'], ['satelite', 'Satélite banda Ku'], ['ambos', 'Terrestre + satélite']]),
  redeTerr: F.op([['multiswitch', 'Pelo multiswitch (tomada TV/SAT, 1 cabo)'], ['separada', 'Rede de derivadores separada']]),
  medido: F.op([['estimado', 'Estimado'], ['medido', 'Medido em campo']]),
  cabo: F.op([['RG-6', 'RG-6'], ['RG-11', 'RG-11 (prumada/tronco)']]),
  topologia: F.op([['cascata', 'Cascata — multiswitch por pavimento'], ['estrela', 'Estrela — multiswitch no headend']]),
  servico: F.op([['terrestre', 'TV aberta'], ['satelite', 'Satélite']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Sistema e sinais', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.tipo', rotulo: 'Sistema', tipo: 'selecao', opcoes: OP.tipo },
      { caminho: 'sistema.rede_terrestre', rotulo: 'TV aberta (quando terrestre + satélite)', tipo: 'selecao', opcoes: OP.redeTerr },
      { caminho: 'sistema.nivel_medido', rotulo: 'Nível na antena', tipo: 'selecao', opcoes: OP.medido },
      { caminho: 'sistema.nivel_antena_dbuv', rotulo: 'Nível do canal mais fraco (dBµV)', tipo: 'numero', dica: 'Usado quando a tabela de canais não tem níveis' },
      { caminho: 'sistema.nivel_antena_max_dbuv', rotulo: 'Nível do canal mais forte (dBµV)', tipo: 'numero' },
      { caminho: 'sistema.canais_qtd', rotulo: 'Nº de canais (sem tabela)', tipo: 'numero' },
      { caminho: 'sistema.antenas_uhf', rotulo: 'Antenas UHF', tipo: 'numero', dica: 'Mais de uma quando as emissoras estão em direções diferentes' },
    ] },
    { tipo: 'nota', texto: 'Canais físicos UHF 14–51 (470–698 MHz). O nível de cada canal na saída da antena (dBµV) medido com analisador define o canal mais fraco (mínimo nas tomadas) e o mais forte (máximo).' },
    { tipo: 'tabela', caminho: 'sistema.canais', rotuloAdicionar: 'Adicionar canal', novaLinha: { canal: null, emissora: '', nivel_dbuv: null },
      colunas: [{ campo: 'canal', rotulo: 'Canal físico', tipo: 'numero', largura: 100 }, { campo: 'emissora', rotulo: 'Emissora' }, { campo: 'nivel_dbuv', rotulo: 'Nível na antena (dBµV)', tipo: 'numero', largura: 150 }] },
  ] },
  { titulo: '3. Satélite', resumo: 'sistema.satelite.nome', itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.satelite.nome', rotulo: 'Satélite' },
      { caminho: 'sistema.satelite.posicao', rotulo: 'Posição orbital' },
      { caminho: 'sistema.satelite.transponders', rotulo: 'Transponders / polarizações' },
      { caminho: 'sistema.satelite.diametro_cm', rotulo: 'Diâmetro da parabólica (cm)', tipo: 'numero' },
      { caminho: 'sistema.satelite.nivel_lnbf_dbuv', rotulo: 'Nível na saída do LNBF (dBµV)', tipo: 'numero', dica: 'Transponder mais fraco [CONFERIR]' },
      { caminho: 'sistema.satelite.nivel_lnbf_max_dbuv', rotulo: 'LNBF — transponder mais forte (dBµV)', tipo: 'numero' },
      { caminho: 'sistema.satelite.topologia', rotulo: 'Topologia', tipo: 'selecao', opcoes: OP.topologia },
      { caminho: 'sistema.satelite.saidas_multiswitch', rotulo: 'Saídas máx. por multiswitch', tipo: 'numero' },
      { caminho: 'sistema.satelite.ganho_multiswitch_db', rotulo: 'Ganho de saída do multiswitch (dB)', tipo: 'numero', dica: 'Negativo para multiswitch passivo' },
      { caminho: 'sistema.satelite.perda_passagem_db', rotulo: 'Perda de passagem SAT (dB)', tipo: 'numero' },
      { caminho: 'sistema.satelite.perda_terrestre_db', rotulo: 'Derivação terrestre do multiswitch (dB)', tipo: 'numero' },
      { caminho: 'sistema.satelite.nivel_min_dbuv', rotulo: 'Nível mín. SAT (dBµV)', tipo: 'numero' },
      { caminho: 'sistema.satelite.nivel_max_dbuv', rotulo: 'Nível máx. SAT (dBµV)', tipo: 'numero' },
      { caminho: 'sistema.satelite.mer_min_db', rotulo: 'MER mín. SAT (dB)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '4. Headend, cabos e critérios', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.distancia_antena_headend_m', rotulo: 'Antena → headend (m)', tipo: 'numero' },
      { caminho: 'sistema.amp_ganho_max_db', rotulo: 'Amplificador: ganho máx. (dB)', tipo: 'numero' },
      { caminho: 'sistema.amp_nivel_max_dbuv', rotulo: 'Amplificador: saída máx. DIN 45004B (dBµV)', tipo: 'numero' },
      { caminho: 'sistema.amp_figura_ruido_db', rotulo: 'Amplificador: figura de ruído (dB)', tipo: 'numero' },
      { caminho: 'sistema.amp_linha_ganho_max_db', rotulo: 'Amplificador de linha: ganho máx. (dB)', tipo: 'numero' },
      { caminho: 'sistema.cabo_prumada', rotulo: 'Cabo da prumada/tronco', tipo: 'selecao', opcoes: OP.cabo },
      { caminho: 'sistema.atenuacao_fmax_db_100m', rotulo: 'RG-6: atenuação na maior freq. (dB/100 m)', tipo: 'numero', dica: 'Do catálogo; vazio = tabela típica' },
      { caminho: 'sistema.atenuacao_fmin_db_100m', rotulo: 'RG-6: atenuação na menor freq. (dB/100 m)', tipo: 'numero' },
      { caminho: 'sistema.pe_direito_m', rotulo: 'Altura entre pavimentos (m)', tipo: 'numero' },
      { caminho: 'sistema.distancia_interna_m', rotulo: 'Cabo até cada tomada na unidade (m)', tipo: 'numero' },
      { caminho: 'sistema.perda_tomada_db', rotulo: 'Perda da tomada (dB)', tipo: 'numero' },
      { caminho: 'sistema.nivel_min_dbuv', rotulo: 'Nível mín. na tomada (dBµV)', tipo: 'numero', dica: 'ISDB-Tb ~50 [CONFERIR]' },
      { caminho: 'sistema.nivel_max_dbuv', rotulo: 'Nível máx. na tomada (dBµV)', tipo: 'numero', dica: '~80 [CONFERIR]' },
      { caminho: 'sistema.nivel_alvo_dbuv', rotulo: 'Alvo no ponto pior (dBµV)', tipo: 'numero', dica: 'Vazio = mínimo + 10 dB' },
      { caminho: 'sistema.mer_min_db', rotulo: 'MER mín. TV aberta (dB)', tipo: 'numero' },
      { caminho: 'sistema.reserva_cabo_pct', rotulo: 'Reserva de cabo (%)', tipo: 'numero' },
      { caminho: 'sistema.distancia_aterramento_m', rotulo: 'Mastro → SPDA/BEP (m)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '5. Edificação', aberta: true, itens: [
    { tipo: 'nota', texto: 'Uma linha por torre/bloco. Distância da prumada: cabo da caixa do pavimento até a caixa de entrada da unidade (média, menor e maior). Distância ao headend: tronco do headend até o topo da prumada (0 se o headend fica na própria torre). Ambientes: onde ficam as tomadas da unidade-tipo, separados por vírgula (ex.: Sala, Suíte, Quarto 2).' },
    { tipo: 'tabela', caminho: 'edificacao.torres', rotuloAdicionar: 'Adicionar torre/bloco', novaLinha: { nome: '', pavimentos: null, primeiro_pavimento: 1, unidades_por_pavimento: null, pontos_por_unidade: 2, pontos_sat_por_unidade: null, distancia_prumada_m: 10, distancia_min_m: null, distancia_max_m: null, distancia_headend_m: 0, ambientes_tv: 'Sala, Suíte' },
      colunas: [
        { campo: 'nome', rotulo: 'Torre', largura: 100 }, { campo: 'pavimentos', rotulo: 'Pavimentos', tipo: 'numero', largura: 80 }, { campo: 'primeiro_pavimento', rotulo: '1º pav. (nº)', tipo: 'numero', largura: 80 },
        { campo: 'unidades_por_pavimento', rotulo: 'Unid./pav.', tipo: 'numero', largura: 80 }, { campo: 'pontos_por_unidade', rotulo: 'Pontos TV/unid.', tipo: 'numero', largura: 90 },
        { campo: 'pontos_sat_por_unidade', rotulo: 'Pontos SAT/unid.', tipo: 'numero', largura: 90 },
        { campo: 'distancia_prumada_m', rotulo: 'Dist. média prumada (m)', tipo: 'numero', largura: 110 }, { campo: 'distancia_min_m', rotulo: 'Menor (m)', tipo: 'numero', largura: 70 }, { campo: 'distancia_max_m', rotulo: 'Maior (m)', tipo: 'numero', largura: 70 },
        { campo: 'distancia_headend_m', rotulo: 'Headend → prumada (m)', tipo: 'numero', largura: 110 }, { campo: 'ambientes_tv', rotulo: 'Ambientes com TV' },
      ] },
  ] },
  { titulo: '6. Áreas comuns', itens: [
    { tipo: 'tabela', caminho: 'edificacao.areas_comuns', rotuloAdicionar: 'Adicionar área comum', novaLinha: { nome: '', pontos: 1, pontos_sat: 0, distancia_m: 30 },
      colunas: [{ campo: 'nome', rotulo: 'Área' }, { campo: 'pontos', rotulo: 'Pontos TV', tipo: 'numero', largura: 90 }, { campo: 'pontos_sat', rotulo: 'Pontos SAT', tipo: 'numero', largura: 90 }, { campo: 'distancia_m', rotulo: 'Cabo do headend (m)', tipo: 'numero', largura: 130 }] },
  ] },
  F.secaoInspecao(7, F.op([['comissionamento', 'Comissionamento / entrega'], ['periodica', 'Vistoria / medição periódica']])),
  F.secaoChecklist(8, CHECKLIST.length),
  { titulo: '9. Medições por ponto', itens: [
    { tipo: 'grade', colunas: 4, campos: [{ caminho: 'inspecao.pontos_a_medir', rotulo: 'Pontos a medir (orçamento de vistoria)', tipo: 'numero', dica: 'Vazio = todos' }] },
    { tipo: 'tabela', caminho: 'inspecao.medicoes', rotuloAdicionar: 'Adicionar medição', novaLinha: { ponto: '', servico: 'terrestre', canal: '', nivel_dbuv: null, mer_db: null, ber: '' },
      colunas: [{ campo: 'ponto', rotulo: 'Ponto', largura: 140 }, { campo: 'servico', rotulo: 'Serviço', tipo: 'selecao', opcoes: OP.servico, largura: 110 }, { campo: 'canal', rotulo: 'Canal / transponder', largura: 120 }, { campo: 'nivel_dbuv', rotulo: 'Nível (dBµV)', tipo: 'numero', largura: 90 }, { campo: 'mer_db', rotulo: 'MER (dB)', tipo: 'numero', largura: 80 }, { campo: 'ber', rotulo: 'BER (ex.: 1E-6)', largura: 100 }] },
  ] },
  F.secaoNcs(10, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(11),
];

module.exports = criarDisciplina({
  chave: 'antena',
  nome: 'Antena coletiva / TV (ISDB-Tb e satélite)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Instalação da antena coletiva', descricao: 'Antenas, mastro, headend, derivadores/multiswitch, cabos, tomadas, DPS, aterramento e mão de obra' },
    { modo: 'inspecao', rotulo: 'Vistoria e medição', descricao: 'Medição de nível/MER por ponto, relatório e correção das não conformidades' },
  ],
  montarOrcamento,
});
