// Disciplina QUADROS — projeto de fabricação de quadros elétricos e de
// automação (conjuntos de manobra e comando de BT, ABNT NBR IEC 61439-1/-2,
// com a NBR 5410 nos circuitos) — contrato do sistema (ver
// skills/spda/scripts/lib/index.js). Entrada: o unifilar/quadro de cargas do
// quadro (JSON); saída: memorial de cálculo e especificação, lista de
// materiais com preço (Excel), desenho de fabricação (DXF), checklist de
// fabricação e ensaios de rotina, relatório de ensaios e orçamento.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { fmtNum } = require('../../../_comum/docx-base');
const ET = require('../../../_comum/eletrico/tabelas');
const T = require('./tabelas');
const C = require('./calculo');
const { gerarDesenho } = require('./desenho');
const M3D = require('./modelo3d');
const CAT = require('./catalogo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-qd-predial.json');

const NORMAS = [
  ['ABNT NBR IEC 61439-1', 'Conjuntos de manobra e comando de baixa tensão — Parte 1: Regras gerais (verificação de projeto, seção 10; verificação de rotina, seção 11)'],
  ['ABNT NBR IEC 61439-2', 'Conjuntos de manobra e comando de potência (formas de separação, fator de diversidade nominal)'],
  ['ABNT NBR 5410:2004 (versão corrigida 2008)', 'Instalações elétricas de BT — 5.1.3.2.2 (DR), 5.3.4 e 5.3.5.5.1 (proteção e capacidade de interrupção), 6.3.5.2 (DPS), 6.5.4 (conjuntos; 6.5.4.2 distâncias, 6.5.4.7 e Tabela 59 reserva), Tabela 58 (PE), 6.1.5.3 (cores)'],
  ['ABNT NBR 5419-4:2026', 'Proteção contra descargas atmosféricas — sistemas elétricos e eletrônicos internos (DPS classe I com SPDA, Anexo C)'],
  ['ABNT NBR NM 60898 / NBR IEC 60947-2', 'Disjuntores para uso doméstico e análogo / disjuntores de BT (Icn, Icu, Ics)'],
  ['ABNT NBR NM 61008 / NBR IEC 61009', 'Interruptores e disjuntores a corrente diferencial-residual'],
  ['ABNT NBR IEC 60947-4-1 / 60947-4-2 / 60947-7-1', 'Contatores e partidas de motores; soft-starters; bornes'],
  ['ABNT NBR IEC 60529 / NBR IEC 62262', 'Graus de proteção por invólucros (IP) e contra impactos mecânicos (IK)'],
  ['IEC TR 60890', 'Método de verificação da elevação de temperatura de conjuntos por cálculo'],
  ['IEC 60865-1 / DIN 43671', 'Efeitos das correntes de curto-circuito (esforços e aquecimento); capacidade de corrente de barras de cobre'],
  ['ABNT NBR IEC 60204-1 e NR-12', 'Segurança de máquinas — equipamento elétrico (quando o quadro for de máquina); segurança no trabalho em máquinas'],
  ['NR-10', 'Segurança em instalações e serviços em eletricidade'],
];
const SECOES_CHECKLIST = [...new Set(CHECKLIST.map(c => c.secao))];

const num = fmtNum;
const ka = (v) => `${num(v, 1)} kA`;
const sec = (s) => (s == null ? '—' : `${String(s).replace('.', ',')} mm²`);
const pct = (v) => `${num(v * 100, 0)} %`;
const LIG = { FN: 'F-N', FF: 'F-F', FFN: '2F+N', FFF: '3F', FFFN: '3F+N' };
const drTxt = (x) => (x.dr === 'ddr' ? `DDR ${x.drMa} mA` : x.dr === 'idr' ? `${x.drId}` : (x.drFalta ? 'FALTA' : '—'));

// ── Inspeção / ensaios de rotina ────────────────────────────────────────────

function medicoes(insp, calc) {
  const c = calc.c;
  const iso = ET.ISOLAMENTO.find(i => c.vff <= i.ate) || ET.ISOLAMENTO[ET.ISOLAMENTO.length - 1];
  const vEnsaio = T.porFaixa(T.TENSAO_ENSAIO, c.ui);
  const vazio = (v) => v == null || v === '';
  const isolamento = (insp.isolamento || []).map(m => ({ ...m, criterio: `≥ ${num(iso.minimo)} MΩ a ${iso.tensaoEnsaio} V CC (NBR 5410, Tabela 60)`, resultado: vazio(m.valor_mohm) ? 'NV' : Number(m.valor_mohm) >= iso.minimo ? 'C' : 'NC' }));
  const dieletrico = (insp.dieletrico || []).map(m => ({ ...m, ensaio: m.resultado || '', criterio: `${vEnsaio} V eficaz sem descarga disruptiva (NBR IEC 61439-1, 11.9 [CONFERIR])`,
    resultado: !m.resultado || m.resultado === 'NV' ? 'NV' : (m.resultado === 'aprovado' && (vazio(m.tensao_v) || Number(m.tensao_v) >= vEnsaio)) ? 'C' : 'NC' }));
  const continuidade = (insp.continuidade_pe || []).map(m => ({ ...m, criterio: '≤ 0,1 Ω entre a massa e a barra PE (NBR IEC 61439-1, 10.5.2 [CONFERIR])', resultado: vazio(m.valor_ohm) ? 'NV' : Number(m.valor_ohm) <= 0.1 ? 'C' : 'NC' }));
  const funcional = (insp.funcional || []).map(m => ({ ...m, criterio: 'Opera conforme o diagrama', resultado: m.resultado === 'ok' ? 'C' : m.resultado === 'falha' ? 'NC' : 'NV' }));
  return { isolamento, dieletrico, continuidade, funcional, iso, vEnsaio };
}

function processar(dados, opcoes = {}) {
  const calc = C.calcular(dados, opcoes);
  const insp = dados.inspecao || {};
  const na = {
    ...(calc.aut.ativo ? {} : { O2: 'Quadro sem CLP', O5: 'Sem fonte 24 Vcc de automação' }),
    ...(calc.aut.releSeguranca ? {} : { O3: 'Sem parada de emergência no quadro' }),
    ...(calc.aut.porta.length ? {} : { O4: 'Sem dispositivos de comando na porta' }),
    ...(calc.term.ventilacao ? {} : { I3: 'Sem ventilação forçada' }),
    ...(calc.drs.length || calc.circuitos.some(x => x.dr) || calc.c.drGeral ? {} : { O6: 'Sem dispositivo DR' }),
    ...(calc.aut.ativo ? {} : { F5: 'Sem sinais analógicos/comunicação' }),
    ...(calc.dpsInfo ? {} : { C3: 'Sem DPS' }),
  };
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, na);
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const med = medicoes(insp, calc);
  const parecer = I.parecer(checklist, ncs, [...med.isolamento, ...med.dieletrico, ...med.continuidade, ...med.funcional]);
  return { dados, calc, insp, checklist, ncs, med, parecer };
}

// ── Resumo para a tela ──────────────────────────────────────────────────────

function textoBarra(calc) {
  const b = calc.barr;
  if (b.tipo === 'pente') return `Pente ${b.pente.a} A (${b.pente.s} mm²) + N/PE`;
  return b.fase ? `Cu ${b.fase.l}×${b.fase.e} mm (${num(b.capacidade, 0)} A corrigida)` : 'sem barra simples — paralelo';
}

function resumir(res) {
  const { calc } = res;
  const { c, geral, layout, term, aut, barr, dem } = calc;
  const env = layout.involucro;
  const icuRuins = calc.circuitos.filter(x => !x.icuOk).length;
  const temInspecao = (res.insp.checklist || []).length || (res.insp.isolamento || []).length;
  return {
    indicadores: [
      { rotulo: 'Invólucro', valor: `${env.altura} × ${env.largura} × ${env.profundidade} mm`, ok: layout.cabe, detalhe: `${c.montagem}, ${calc.inv.ip}/${calc.inv.ik}, forma ${calc.inv.forma} · ${layout.fileiras.length} fileiras · trilho ${pct(layout.ocupacaoTrilho)} ocupado` },
      { rotulo: 'Disjuntor geral', valor: `${geral.polos}P ${geral.In} A`, ok: geral.icu >= c.icc && geral.In >= dem.iProjeto - 1e-6, detalhe: `Ib do quadro ${num(dem.iProjeto, 1)} A (FD ${num(dem.fd, 2)}) · ${geral.norma} ${geral.icu} kA` },
      { rotulo: 'Curto-circuito', valor: `Icc ${ka(c.icc)} · Ipk ${ka(c.ipk)}`, ok: icuRuins === 0, detalhe: icuRuins ? `${icuRuins} dispositivo(s) com Icu < Icc` : 'Icu/Icn ≥ Icc em todos os dispositivos' },
      { rotulo: 'Barramento', valor: textoBarra(calc), ok: barr.tipo === 'pente' ? barr.penteOk : (barr.correnteOk && barr.curtoOk && (!barr.dinamico || barr.dinamico.ok)), detalhe: `PE ${barr.pe.l}×${barr.pe.e} · Icw ${barr.icw} kA/${c.tempoIcw} s${barr.dinamico ? ` · σ ≈ ${num(barr.dinamico.sigma, 0)} N/mm²` : ''}` },
      { rotulo: 'Temperatura (topo)', valor: `${num(term.tTopo, 1)} °C`, ok: term.ok ? true : (term.ventilacao ? undefined : false), detalhe: `${num(term.P, 0)} W dissipados · limite ${c.temperaturaMax} °C${term.ventilacao ? ` · ventilador ${term.ventilacao.ventilador} m³/h` : ''}` },
      { rotulo: 'Reserva', valor: `${calc.reservaCircuitos} circuitos`, detalhe: `NBR 5410 Tabela 59 / ${pct(c.reservaPct)} · ${num(layout.reservaMm / T.MODULO_MM, 0)} módulos livres` },
      { rotulo: 'Desequilíbrio de fases', valor: pct(dem.desequilibrio), ok: dem.desequilibrio <= 0.15, detalhe: Object.entries(dem.porFase).map(([f, i]) => `${f} ${num(i, 1)} A`).join(' · ') },
      ...(calc.dpsInfo ? [{ rotulo: 'DPS', valor: `Classe ${calc.dpsInfo.classe} · ${calc.dpsInfo.quantidade} un`, detalhe: calc.dpsInfo.uc.texto }] : []),
      ...(aut.ativo ? [{ rotulo: 'Automação', valor: `${aut.usados.DI} DI · ${aut.usados.DO} DO · ${aut.usados.AI} AI · ${aut.usados.AO} AO`, detalhe: `módulos ${['DI', 'DO', 'AI', 'AO'].map(t => `${aut.modulos[t]} ${t}`).join(', ')} · fonte ${aut.fontes > 1 ? `${aut.fontes} × ` : ''}${aut.fonteA} A (${num(aut.totalMa / 1000, 2)} A + ${pct(aut.margem)})` }] : []),
      ...(temInspecao ? [{ rotulo: 'Ensaios de rotina', valor: res.parecer.situacao.replace(/_/g, ' '), ok: res.parecer.situacao === 'CONFORME' ? true : res.parecer.situacao === 'INCONCLUSIVO' ? undefined : false, detalhe: `NC ${res.parecer.cont.NC} · NV ${res.parecer.cont.NV}` }] : []),
    ],
    textos: [...calc.avisos, ...calc.premissas],
    tabelas: [
      { titulo: 'Circuitos e coordenação', colunas: ['Nº', 'Descrição', 'Lig.', 'Fases', 'Ib (A)', 'Disjuntor', 'Icu (kA)', 'DR', 'Observações'],
        linhas: calc.circuitos.map(x => [x.n, x.descricao, LIG[x.ligacao], x.fases.join(''), num(x.ib, 1), `${x.polos}P ${x.disjuntor} A ${x.curva}`, num(x.icu, 1), drTxt(x), x.notas.join('; ')]) },
      { titulo: 'Arranjo (fileiras de cima para baixo)', colunas: ['Fileira', 'Zona', 'Dispositivos', 'Ocupado (mm)'],
        linhas: layout.fileiras.map((f, i) => [String(i + 1), f.zonas.map(z => layout.rotuloZona[z]).join(' / '), f.itens.map(k => k.ref).join(', '), `${num(f.usado, 0)} / ${num(layout.larguraUtil, 0)}`]) },
    ],
  };
}

const ROTULO_PERDA = {
  disjuntor_geral: 'Disjuntor geral', disjuntor: 'Disjuntores dos circuitos', disjuntor_cm: 'Disjuntores de caixa moldada', ddr: 'Disjuntores diferenciais (DDR)', idr: 'Interruptores DR',
  dps: 'DPS', protecao_dps: 'Proteção dos DPS', medidor: 'Multimedidor', protecao_medicao: 'Proteção da medição', partida: 'Partidas de motores (disjuntor-motor, contatores, soft-starter/inversor)',
  disjuntor_comando: 'Disjuntor do comando', fonte: 'Fonte 24 Vcc', protecao_24v: 'Proteções 24 Vcc', rele_seguranca: 'Relé de segurança', clp: 'CPU do CLP',
  modulo_DI: 'Módulos DI', modulo_DO: 'Módulos DO', modulo_AI: 'Módulos AI', modulo_AO: 'Módulos AO', modulo_rs485: 'Módulo RS-485', switch: 'Switch', rele_interface: 'Relés de interface',
};

// ── Memorial ────────────────────────────────────────────────────────────────

function secoesMemorial(res) {
  const { calc, dados } = res;
  const { c, geral, dem, drs, dpsInfo, aut, barr, layout, term, inv, perdas, motores } = calc;
  const env = layout.involucro;
  const s = [];
  s.push({ titulo: '1. Objeto e dados de entrada', paragrafos: [
    `Projeto de fabricação do quadro ${c.tag} (${c.tipoRotulo})${c.descricao ? ` — ${c.descricao}` : ''}, da obra ${dados.obra?.nome || '(obra)'}: dimensionamento do invólucro e do arranjo dos dispositivos, barramentos, coordenação das proteções, ${aut.ativo ? 'automação (CLP, fonte 24 Vcc, relés e bornes), ' : ''}elevação de temperatura e verificações da NBR IEC 61439, a partir do unifilar/quadro de cargas.`,
  ], kv: [
    ['Sistema', `${({ trifasico: 'trifásico', bifasico: 'bifásico', monofasico: 'monofásico' })[c.sistema]}, ${c.vff}/${c.vfn} V, ${c.frequencia} Hz, esquema ${c.esquema}`],
    ['Curto-circuito no ponto', `Icc = ${ka(c.icc)}${c.iccInformada ? ' (informada)' : ' (adotada — [CONFERIR])'}; Ipk = ${ka(c.ipk)}${c.ipkInformado ? ' (informada)' : ` (n = ${num(c.fatorN, 1)})`}; Icw por ${num(c.tempoIcw)} s`],
    ['Saídas', `${calc.circuitos.length} circuitos${motores.length ? ` e ${motores.length} partidas de motores` : ''}`],
    ['Local de instalação', `${c.localInfo.rotulo} (influências ${c.localInfo.influencias})`],
    ['Montagem / material', `${c.montagem}, ${c.posicao === 'livre' ? 'livre por todos os lados' : c.posicao === 'fileira' ? 'em fileira' : 'encostado na parede'}, ${({ aco: 'chapa de aço pintada', inox: 'aço inox', aluminio: 'alumínio', poliester: 'poliéster' })[c.material]}`],
    ['Ambiente', `${c.temperatura} °C (média de 24 h, condição normal de serviço ≤ 35 °C — NBR IEC 61439-1, 7.1 [CONFERIR]); ar interno máximo adotado ${c.temperaturaMax} °C; altitude ${num(c.altitude, 0)} m`],
  ] });
  s.push({ titulo: '2. Critérios', marcadores: [
    'Corrente de cada circuito: Ib = P/(V·FP) (F-N e F-F) ou P/(√3·V·FP) (trifásico), quando não informada. Corrente de projeto do quadro por fase = FD × ΣIb + (Σ In dos motores + 0,25 × In do maior) — NBR 5410, 6.5.1 para motores; FD = fator de diversidade nominal da NBR IEC 61439-2 pelo número de saídas quando não informado [CONFERIR].',
    'Proteção (NBR 5410, 5.3.4.1): Ib ≤ In ≤ Iz; capacidade de interrupção ≥ Icc presumida no ponto (5.3.5.5.1), admitida inferior só com filiação comprovada pelo fabricante; redução de corrente dos disjuntores DIN no ar interno (≈ 0,45 %/°C acima de 30 °C [CONFERIR]).',
    'DR de alta sensibilidade (≤ 30 mA) obrigatório nos circuitos de 5.1.3.2.2 (banheiros, tomadas externas, cozinhas, áreas de serviço, garagens, áreas molhadas); no esquema TT o seccionamento automático é por DR.',
    'DPS (NBR 5410, 6.3.5.2): Uc pela Tabela 49, In ≥ 5 kA (classe II) ou Iimp ≥ 12,5 kA (classe I) por modo, ligações ≤ 0,5 m; classe I quando a edificação tem SPDA (NBR 5419-4:2026, C.1.7).',
    `Espaço: módulo DIN de ${num(T.MODULO_NOMINAL_MM, 1)} mm (reservado ${T.MODULO_MM} mm); fileiras com ${15} mm de folga acima e abaixo e canaleta horizontal sob cada fileira; canaletas verticais nas laterais (esquerda potência, direita comando); ocupação das canaletas ≤ ${T.OCUPACAO_CANALETA * 100} %; reserva = maior entre a Tabela 59 da NBR 5410 (6.5.4.7) e ${pct(c.reservaPct)} dos circuitos.`,
    'Invólucro: o menor da série comercial (Anexo — série adotada) em que cabem a maior peça na largura útil, as fileiras + entrada de cabos na altura da placa e a peça mais funda + folga da porta na profundidade.',
    'Barramento: corrente pela DIN 43671 (barra a 65 °C, ar a 35 °C) corrigida para o ar interno por k2 = ((θb − θa)/30)^0,61 [CONFERIR]; curto térmico S ≥ Icw·√t/k com k = 226·√ln((234,5 + θf)/(234,5 + θi)) (IEC 60949/IEC 60865-1, θf = 200 °C); esforço eletrodinâmico pelo método simplificado da IEC 60865-1 (estimativa); PE pela Tabela 58 da NBR 5410.',
    'Elevação de temperatura: perdas dos dispositivos a Ib (P = Pn·(Ib/In)²), dos barramentos e da fiação; ΔT médio = P/(k·Ae) com a superfície efetiva Ae da IEC TR 60890 e k do material; ar no topo ≈ 1,3 × ΔT (estimativa declarada) [CONFERIR].',
  ] });
  // 3. quadro de cargas
  s.push({ titulo: '3. Quadro de cargas e corrente de projeto', tabela: {
    colunas: ['Nº', 'Descrição', 'Tipo', 'Lig.', 'Fases', 'P (W)', 'Ib (A)', 'Cabo'],
    linhas: calc.circuitos.map(x => [x.n, x.descricao, x.tipoRotulo, LIG[x.ligacao], x.fases.join(''), x.reserva ? '—' : num(x.potencia, 0), `${num(x.ib, 1)}${x.ibInformada ? ' (inf.)' : ''}`, sec(x.secao)]),
    proporcoes: [0.4, 2.4, 1.2, 0.5, 0.5, 0.6, 0.7, 0.7], tamanho: 15 },
    paragrafos: [
      `Carga instalada por fase (Σ Ib): ${Object.entries(dem.instalada).slice(0, c.nFases).map(([f, i]) => `${f} ${num(i, 1)} A`).join(' · ')}. Com FD ${num(dem.fd, 2)}${motores.length ? ' e os motores' : ''}: ${Object.entries(dem.porFase).map(([f, i]) => `${f} ${num(i, 1)} A`).join(' · ')}; corrente de projeto do quadro ${num(dem.iProjeto, 1)} A (${num(dem.potenciaKva, 1)} kVA), desequilíbrio ${pct(dem.desequilibrio)}${c.nFases > 1 ? `, corrente no neutro ≈ ${num(dem.neutro, 1)} A` : ''}.`,
      'A reserva da Tabela 59 deve ser considerada no alimentador do quadro (nota da Tabela 59 da NBR 5410).',
    ] });
  // 4. geral e coordenação
  s.push({ titulo: '4. Disjuntor geral, coordenação e capacidade de interrupção', paragrafos: [
    `Disjuntor geral ${geral.polos}P ${geral.In} A${geral.informado ? ' (do unifilar)' : ' (dimensionado: menor In ≥ corrente de projeto)'} — ${geral.tipo === 'din' ? 'modular' : 'caixa moldada'}, ${geral.norma} ${geral.icu} kA, Ics ${num(geral.ics, 1)} kA, frente a Icc ${ka(c.icc)}.`,
  ], tabela: {
    colunas: ['Nº', 'Disjuntor', 'Ib (A)', 'In corr. (A)', 'Iz (A)', 'Icu (kA)', 'DR', 'Situação / observações'],
    linhas: calc.circuitos.map(x => [x.n, `${x.polos}P ${x.disjuntor} A ${x.curva}${x.caixaMoldada ? ' (CM)' : ''}`, num(x.ib, 1), num(x.inCorrigida, 1), x.iz ? num(x.iz, 1) : '—', `${num(x.icu, 1)}${x.icuEspecificado ? ' (esp.)' : ''}`, drTxt(x), x.notas.length ? x.notas.join('; ') : 'atende']),
    proporcoes: [0.4, 1.1, 0.55, 0.65, 0.55, 0.6, 0.6, 3], tamanho: 14 },
    notas: ['Icu "(esp.)": capacidade de interrupção especificada por este cálculo (não informada no unifilar). Seletividade por razão de correntes nominais ≥ 1,6 é só indicativa — a seletividade total e a filiação dependem das tabelas do fabricante dos disjuntores. [CONFERIR]'] });
  // 5. DR
  s.push({ titulo: '5. Proteção diferencial-residual (NBR 5410, 5.1.3.2.2)', tabela: drs.length ? {
    colunas: ['DR', 'Circuitos', 'Polos', 'In (A)', 'IΔn (mA)', 'Tipo', 'Σ Ib (A)', 'Observações'],
    linhas: drs.map(g => [g.id, g.circuitos.join(', '), String(g.polos), String(g.In), String(g.idn), g.tipo, num(g.soma, 1), g.notas.join('; ') || '—']),
    proporcoes: [0.5, 1.2, 0.45, 0.5, 0.6, 0.45, 0.6, 2.6], tamanho: 15 } : null,
    marcadores: [
      `Circuitos com DR obrigatório: ${calc.circuitos.filter(x => x.drObrigatorio).map(x => `${x.n} (${x.drMotivo})`).join(', ') || 'nenhum marcado'}.`,
      `Circuitos sem DR onde é exigido: ${calc.circuitos.filter(x => x.drFalta).map(x => x.n).join(', ') || 'nenhum'}.`,
      `DR recomendado (boa prática, tomadas): ${calc.circuitos.filter(x => x.drRecomendado).map(x => x.n).join(', ') || '—'}.`,
      'In do interruptor DR ≥ maior disjuntor do grupo e ≥ soma das correntes com diversidade; DR tipo A para cargas eletrônicas e tipo F/B para inversores trifásicos, conforme o fabricante da carga. [CONFERIR]',
    ] });
  // 6. DPS
  s.push({ titulo: '6. Proteção contra surtos (DPS)', paragrafos: dpsInfo ? [
    `${dpsInfo.quantidade} DPS (${dpsInfo.fases} fase${dpsInfo.fases > 1 ? 's' : ''}${dpsInfo.neutroPe ? ' + N-PE' : ''}), ${dpsInfo.uc.texto}.`,
    `${dpsInfo.texto}.`, `${dpsInfo.ligacao}. ${dpsInfo.protecao}`,
  ] : ['Quadro sem DPS: confirmar a existência e a coordenação do DPS a montante (NBR 5410, 6.3.5.2).'] });
  // 7. motores
  if (motores.length) {
    s.push({ titulo: '7. Partidas de motores (NBR IEC 60947-4-1 / 60947-4-2)', tabela: {
      colunas: ['TAG', 'Motor', 'In (A)', 'Partida', 'Dispositivos', 'Proteção de sobrecarga'],
      linhas: motores.map(m => [m.tag, `${m.descricao} ${num(m.pKw, 2)} kW (${num(m.cv, 1)} cv)`, num(m.in, 1), m.partidaRotulo,
        m.partidaInfo.dispositivos.map(d => `${d.ref} ${d.tipo === 'contator' ? `${d.nominal_a} A AC-3` : d.faixa ? `${d.faixa[0]}–${d.faixa[1]} A` : d.nominal_a ? `${d.nominal_a} A` : d.corrente_a ? `≥ ${num(d.corrente_a, 1)} A` : ''}`).join(' · '), `${num(m.partidaInfo.sobrecarga.ajuste_a, 1)} A — ${m.partidaInfo.sobrecarga.local}`]),
      proporcoes: [0.6, 1.8, 0.55, 1, 2.4, 1.6], tamanho: 14 },
      marcadores: [...new Set(motores.flatMap(m => m.partidaInfo.observacoes.map(o => `${m.tag}: ${o}`)))],
      notas: ['Dispositivos de partida pelo mesmo motor da skill de elétrica industrial; coordenação tipo 2 pela tabela do fabricante. [CONFERIR]'] });
  }
  // 8. automação
  if (aut.ativo) {
    s.push({ titulo: '8. Automação — E/S, fonte 24 Vcc, relés e bornes', tabela: {
      colunas: ['Tipo', 'Em uso', `Com reserva (${pct(aut.reserva)})`, 'CPU', 'Módulos', 'Disponível', 'Folga'],
      linhas: ['DI', 'DO', 'AI', 'AO'].map(t => [t, String(aut.usados[t]), String(aut.req[t]), String(aut.cpu[t]), `${aut.modulos[t]} × ${T.CLP[t].canais}`, String(aut.disponivel[t]), String(aut.folgaIo[t])]),
      proporcoes: [0.5, 0.6, 0.9, 0.5, 0.8, 0.8, 0.6] },
      paragrafos: [
        `Origem dos pontos: ${aut.origem.map(o => `${o.tag ? `${o.tag} ` : ''}${o.descricao}${o.tipo !== 'motor' ? ` (${o.quantidade} ${o.tipo})` : ''}`).join('; ')}${aut.porta.length ? '; botões/seletores/sinaleiros da porta' : ''}${aut.releSeguranca ? '; estado do relé de segurança (1 DI)' : ''}.`,
        `Fonte 24 Vcc: consumo ${num(aut.totalMa / 1000, 2)} A (${num(aut.pSaida, 0)} W) + margem ${pct(aut.margem)} = ${num(aut.iFonte, 2)} A → ${aut.fontes > 1 ? `${aut.fontes} fontes de ` : 'fonte de '}${aut.fonteA} A; entrada protegida por disjuntor 2P ${aut.disjFonte} A curva C (≈ ${num(aut.iEntrada, 2)} A a plena carga — conferir a corrente de energização no manual) [CONFERIR]; ${aut.ramos24} ramos protegidos separadamente (CLP/IHM, campo, saídas).`,
        `Relés de interface: ${aut.reles} (um por saída digital que aciona bobina/sinalização em outra tensão). Comunicação: ${aut.comunicacao.join(', ') || '—'}${aut.rs485 ? ' (módulo RS-485)' : ''}${aut.switchPortas ? `; switch de ${aut.switchPortas} portas` : ''}${aut.ihm ? `; IHM ${aut.ihm}"` : ''}.`,
      ],
      marcadores: [
        'Separação potência × comando: canaletas próprias (vertical direita e fileiras de comando), cruzamentos a 90°, cabos de sinal analógico e comunicação blindados e afastados ≥ 100 mm dos cabos de potência ou com separador metálico. [CONFERIR IEC 61000-5-2 / guia do fabricante]',
        'Aterramento: barra PE ligada à placa e à porta; blindagens aterradas em 360° na entrada do quadro (barra/abraçadeira de blindagem); 0 V da fonte aterrado num único ponto (PELV) quando o projeto adotar. [CONFERIR]',
        `Bornes de sinal: DI ${aut.bornes.DI}, DO ${aut.bornes.DO}, AI ${aut.bornes.AI}, AO ${aut.bornes.AO}, comunicação ${aut.bornes.comunicacao}, alimentação 24 Vcc ${aut.bornes.alimentacao24} (1 borne por sinal + comuns a cada 8; analógicos com +, − e blindagem).`,
      ] });
    s.push({ titulo: '8.1 Consumo em 24 Vcc', tabela: { colunas: ['Carga', 'mA'], linhas: aut.consumo.map(x => [x.item, num(x.ma, 0)]), proporcoes: [4, 1] },
      notas: ['Consumos típicos de catálogo [CONFERIR com os modelos escolhidos].'] });
  }
  if (c.maquina || aut.porta.length) {
    s.push({ titulo: `${aut.ativo ? '8.2' : '8'}. Comando na porta${c.maquina ? ' e segurança de máquina (NBR IEC 60204-1 / NR-12)' : ''}`, tabela: aut.porta.length ? {
      colunas: ['Dispositivo', 'Função', 'Cor', 'Qtd.'], linhas: aut.porta.map(p => [p.rotulo, p.funcao || '—', p.cor, String(p.quantidade)]), proporcoes: [2.2, 1.6, 1.6, 0.4] } : null,
      marcadores: [
        'Cores conforme a NBR IEC 60204-1 (10.2 botões, 10.3 indicadores, 10.7 emergência): emergência vermelho sobre fundo amarelo; LIGA branco (preferencial) ou verde, nunca vermelho; DESLIGA preto (preferencial), cinza ou branco; sinalização vermelho (emergência/falha), amarelo (anormal), verde (normal), azul (ação obrigatória), branco (neutro). [CONFERIR itens]',
        ...(c.maquina || aut.releSeguranca ? ['Parada de emergência categoria 0 ou 1 (NBR IEC 60204-1, 9.2.2 e 9.2.5.4) por relé de segurança monitorado de dois canais com rearme manual; a categoria/PL vem da apreciação de risco (NBR ISO 12100 e NBR ISO 13849-1) e atende à NR-12 (sistemas de segurança e dispositivos de parada de emergência). [CONFERIR itens da NR-12 vigente]'] : []),
      ] });
  }
  // 9. barramentos
  const b = barr;
  s.push({ titulo: '9. Barramentos', paragrafos: b.tipo === 'barra' && b.fase ? [
    `Barramento principal de cobre ${b.fase.l} × ${b.fase.e} mm (${b.secaoFase} mm²) por fase, ${c.barraPintada ? 'pintado' : 'nu'}: ${b.fase[c.barraPintada ? 'pintada' : 'nua']} A pela DIN 43671 (barra 65 °C, ar 35 °C); com o ar interno a ${num(b.thetaAr)} °C e a barra limitada a ${c.temperaturaBarra} °C, k2 = ((${c.temperaturaBarra} − ${num(b.thetaAr)})/30)^0,61 = ${num(b.k2, 3)} → ${num(b.capacidade, 0)} A ≥ ${b.In} A (In do conjunto) — ${b.correnteOk ? 'atende' : 'NÃO atende'}.`,
    `Curto térmico (Icw ${ka(c.icc)} por ${num(c.tempoIcw)} s): k = 226·√ln((234,5 + 200)/(234,5 + ${c.temperaturaBarra})) = ${num(b.kCurto, 1)}; S ≥ ${num(c.icc * 1000, 0)}·√${num(c.tempoIcw)}/${num(b.kCurto, 1)} = ${num(b.sCurtoMin, 1)} mm² ≤ ${b.secaoFase} mm² — ${b.curtoOk ? 'atende' : 'NÃO atende'}. Icw do conjunto a declarar: ${b.icw} kA/${num(c.tempoIcw)} s.`,
    b.dinamico ? `Esforço eletrodinâmico (estimativa, IEC 60865-1 simplificado): F = 0,173·ip²·L/a = 0,173 × ${num(c.ipk, 1)}² × ${c.apoios}/${c.entreFases} = ${num(b.dinamico.F, 0)} N; Z = b·e²/6 = ${num(b.dinamico.Z, 1)} mm³; σ = β·F·L/(8·Z) = ${num(b.dinamico.sigma, 0)} N/mm² ${b.dinamico.ok ? '≤' : '>'} q·Rp0,2 = ${num(b.dinamico.adm, 0)} N/mm²; força em cada isolador ≈ ${num(b.dinamico.forcaApoio, 0)} N; vão máximo ≈ ${num(b.dinamico.lMax, 0)} mm. [CONFERIR com o ensaio/projeto de referência do fabricante]` : '',
    `Neutro ${b.neutro ? `${b.neutro.l} × ${b.neutro.e} mm` : ''} (${num(b.secaoNeutro, 0)} mm²${c.neutroReduzido ? ', reduzido' : ', igual à fase'}); isoladores a cada ${c.apoios} mm (${b.isoladores} un), ${c.entreFases} mm entre centros de fase, comprimento ≈ ${num(b.comprimentoFase, 2)} m por barra, massa total ≈ ${num(b.massaKg, 1)} kg.`,
  ].filter(Boolean) : [
    `Barramento tipo pente ${c.nFases}P ${b.pente.a} A (${b.pente.s} mm²) em ${b.fileirasPente || 1} fileira(s) de disjuntores, alimentado por bloco de distribuição a partir do geral; ${b.penteOk ? 'corrente nominal ≥ In do geral' : 'ABAIXO do In do geral — usar barras'}. A suportabilidade ao curto do pente é a declarada pelo fabricante com o disjuntor a montante (Icc ${ka(c.icc)}). [CONFERIR]`,
    'Neutro em barra isolada (azul-claro) com um terminal por circuito + reserva.',
  ], kv: [
    ['Barra PE', `${b.pe.l} × ${b.pe.e} mm (${b.pe.l * b.pe.e} mm²) ≥ Tabela 58 (${num(b.secaoPeMin, 0)} mm² para fase de ${num(b.secaoFase, 0)} mm²) e ≥ curto fase-massa ${num(b.secaoPeCurto, 1)} mm² (Icc por 0,2 s, k = ${num(C.kAdiabatico(30), 0)}) [CONFERIR tempo de atuação]`],
  ] });
  // 10. espaço e invólucro
  s.push({ titulo: '10. Componentes, espaço e invólucro', paragrafos: [
    `Invólucro escolhido: ${env.altura} × ${env.largura} × ${env.profundidade} mm (A × L × P), ${c.montagem}; placa de montagem ${layout.placa.altura} × ${layout.placa.largura} mm, largura útil de trilho ${num(layout.larguraUtil, 0)} mm (${Math.floor(layout.larguraUtil / T.MODULO_MM)} módulos). Altura ocupada ${num(layout.alturaNecessaria, 0)} mm (sobra ${num(layout.sobraAltura, 0)} mm); profundidade necessária ${num(layout.profNecessaria, 0)} mm.${layout.cabe ? '' : ' NENHUM invólucro da série comporta o arranjo — dividir o quadro ou mudar a montagem.'}`,
    `Ocupação dos trilhos ${pct(layout.ocupacaoTrilho)}; espaço livre/reserva ≈ ${num(layout.reservaMm / T.MODULO_MM, 0)} módulos; reserva exigida ${calc.reservaCircuitos} circuitos (Tabela 59: ${ET.reservaQuadro(calc.circuitos.filter(x => !x.reserva).length)}; ${pct(c.reservaPct)}: ${Math.ceil(c.reservaPct * calc.circuitos.filter(x => !x.reserva).length)}).`,
  ], tabela: {
    colunas: ['Fileira', 'Zona', 'Dispositivos (ordem do unifilar)', 'Altura (mm)', 'Ocupado (mm)', 'Canaleta abaixo'],
    linhas: layout.fileiras.map((f, i) => [String(i + 1), f.zonas.map(z => layout.rotuloZona[z]).join(' / '), f.itens.map(k => (k.tipo === 'reserva' ? `RESERVA (${k.modulos} mód.)` : k.ref)).join(', '), num(f.altura, 0), `${num(f.usado, 0)} / ${num(layout.larguraUtil, 0)}`, f.canaleta ? `${f.canaleta.largura}×${f.canaleta.altura} (${pct(f.canaleta.ocupacao)})` : '—']),
    proporcoes: [0.45, 1.3, 3, 0.6, 0.85, 0.95], tamanho: 14 },
    marcadores: [
      `Canaletas verticais: esquerda (potência) ${layout.verticais.esquerda.largura}×${layout.verticais.esquerda.altura} mm, ${pct(layout.verticais.esquerda.ocupacao)} ocupada; direita (${aut.ativo || motores.length ? 'comando' : 'potência'}) ${layout.verticais.direita.largura}×${layout.verticais.direita.altura} mm, ${pct(layout.verticais.direita.ocupacao)} — área dos condutores pelo diâmetro externo do cabo flexível 750 V [CONFERIR catálogo].`,
      `Bornes: ${calc.born.length ? calc.born.map(g => `${g.id} (${g.funcao}): ${g.total} + ${g.reserva} reserva, ≈ ${num(g.comprimento, 0)} mm de trilho`).join('; ') : 'saídas ligadas direto nos disjuntores (quadro de distribuição), N e PE nas barras'}.`,
      `Invólucros descartados: ${layout.tentativas.slice(-4).map(t => `${t.altura}×${t.largura} (${t.motivo})`).join('; ') || '—'}.`,
      'Distâncias: entre partes vivas nuas de polaridades diferentes ≥ 10 mm e até massas ≥ 20 mm (NBR 5410, 6.5.4.2); espaço para exaustão do arco dos disjuntores conforme o fabricante; entrada de cabos com faixa livre de 100 mm.',
    ],
    notas: ['Dimensões dos dispositivos típicas de catálogo (tabela no anexo da skill) — conferir com os modelos comprados antes de furar a placa. [CONFERIR]'] });
  // 11. térmica
  const porTipo = Object.entries(perdas.porTipo).filter(([, w]) => w > 0.05).sort((a, b2) => b2[1] - a[1]);
  {
    const e = calc.espaco;
    const cmp = calc.comparacao;
    const fmtE = (x) => `${x.involucro.altura} × ${x.involucro.largura} × ${x.involucro.profundidade} mm; placa ${pct(x.ocupacaoPlaca)} ocupada por dispositivos (${pct(x.ocupacaoCanaletas)} por canaletas); trilho ${pct(x.ocupacaoTrilho)}; reserva ≈ ${x.reservaModulos} módulos; altura usada ${num(x.alturaNecessaria, 0)} de ${x.placa.altura} mm`;
    const fab = calc.catalogo.fabricantes;
    s.push({ titulo: '10.1 Fabricantes, medidas dos componentes e aproveitamento do espaço', paragrafos: [
      fab ? `Fabricantes adotados: padrão ${fab.padrao || '—'}${fab.por_tipo && Object.keys(fab.por_tipo).length ? `; por tipo: ${Object.entries(fab.por_tipo).map(([t, f]) => `${t.replace(/_/g, ' ')} ${f}`).join(', ')}` : ''}. Para cada dispositivo foi escolhido o menor modelo do fabricante que atende à especificação (polos, In, curva, Icu, IΔn, classe do DPS, AC-3, faixa, kW, saída), com as medidas do documento oficial do fabricante; sem registro, medida típica [CONFERIR].` : 'Fabricantes não informados: dimensões típicas de catálogo [CONFERIR]. Informe os fabricantes para o sistema buscar as medidas oficiais e refazer o arranjo.',
      `Aproveitamento do espaço: ${fmtE(e)}.`,
      cmp ? `Comparação com as medidas típicas: ${fmtE(cmp.tipica)} → com as medidas dos fabricantes: ${fmtE(cmp.catalogo)}.` : '',
    ].filter(Boolean), tabela: { colunas: ['TAG', 'Dispositivo', 'Fabricante / referência', 'L × A × P (mm)', 'Origem da medida'], linhas: linhasMedidas(calc), proporcoes: [0.8, 2.4, 1.6, 1.1, 1.9], tamanho: 13 },
      marcadores: (calc.componentes_sem_medida || []).length ? [`Sem medida oficial no catálogo (buscar o datasheet do fabricante): ${calc.componentes_sem_medida.map(x => `${x.tag} — ${x.especificacao}`).join('; ')}.`] : [] });
  }
  s.push({ titulo: '11. Elevação de temperatura (NBR IEC 61439-1, 10.10; IEC TR 60890)', tabela: {
    colunas: ['Origem da perda', 'W'],
    linhas: [...porTipo.map(([k, w]) => [ROTULO_PERDA[k] || k.replace(/_/g, ' '), num(w, 1)]), ['barramento', num(perdas.barramento, 1)], ['fiação interna', num(perdas.fiacao, 1)], ['TOTAL', num(perdas.total, 1)]],
    proporcoes: [3, 1] },
    paragrafos: [
      `Superfície efetiva Ae = ${num(term.ae, 3)} m² (${term.regra}); k = ${num(term.k, 1)} W/(m²·K). ΔT médio = ${num(term.P, 1)}/(${num(term.k, 1)} × ${num(term.ae, 3)}) = ${num(term.dtMedio, 1)} K; ar no topo ≈ ${num(calc.c.temperatura)} + 1,3 × ${num(term.dtMedio, 1)} = ${num(term.tTopo, 1)} °C (limite ${c.temperaturaMax} °C) — ${term.ok ? 'atende sem ventilação' : 'NÃO atende sem ventilação'}. Dissipação natural admissível ≈ ${num(term.pAdmissivel, 0)} W.`,
      term.ok ? '' : (term.ventilacao ? `Ventilação forçada: V = f·(P − P_adm)/ΔT, com P_adm a dissipação natural no limite e ΔT = ar interno máximo − ambiente: ${num(term.ventilacao.f, 1)} × ${num(term.ventilacao.pExcedente, 0)}/${num(term.ventilacao.dt, 0)} = ${num(term.ventilacao.vazao, 0)} m³/h (f para ${num(c.altitude, 0)} m de altitude) → ventilador com filtro de ${term.ventilacao.ventilador} m³/h livres (≈ ${num(term.ventilacao.ventilador * T.EFICIENCIA_FILTRO, 0)} m³/h com filtro de saída) e termostato; alternativa: invólucro com Ae ≥ ${num(term.aeNecessaria, 2)} m². [CONFERIR]` : `Aumentar o invólucro para Ae ≥ ${num(term.aeNecessaria, 2)} m² ou prever ventilação/climatização.`),
      `Método de verificação: ${term.metodo === '10.10.4.2' ? 'cálculo para compartimento único ≤ 630 A (10.10.4.2 — perdas totais ≤ capacidade de dissipação do invólucro declarada pelo fabricante; circuitos ≤ 80 % da corrente térmica convencional dos dispositivos)' : term.metodo === '10.10.4.3' ? 'cálculo pela IEC TR 60890 (10.10.4.3, até 1600 A)' : 'acima de 1600 A só por ensaio ou derivação de projeto ensaiado'}. [CONFERIR]`,
    ].filter(Boolean),
    notas: ['Perdas dos disjuntores DIN pelos valores MÁXIMOS da NBR NM 60898 por polo (catálogos costumam ser 40–60 % menores); demais perdas típicas de catálogo. Fator 1,3 do topo é estimativa do perfil de temperatura da IEC TR 60890. [CONFERIR]'] });
  // 12. IP/forma
  s.push({ titulo: '12. Grau de proteção, impacto e forma de separação', kv: [
    ['Grau de proteção (NBR IEC 60529)', `${inv.ip}${inv.ip === c.localInfo.ip ? ' (recomendado para o local)' : ` (recomendado ${c.localInfo.ip})`}`],
    ['Impacto mecânico (NBR IEC 62262)', `${inv.ik}`],
    ['Forma de separação (NBR IEC 61439-2, 8.101)', inv.formaTexto],
  ], marcadores: [...inv.notas, `IP do local: recomendação H&M a partir das influências externas ${c.localInfo.influencias} (NBR 5410, 4.2.6 e 6.5.4.4) [CONFERIR com o local].`] });
  // 13. verificações de projeto
  s.push({ titulo: '13. Verificações de projeto (NBR IEC 61439-1, seção 10 e Anexo D)', tabela: {
    colunas: ['#', 'Verificação', 'Item', 'Opções admitidas', 'Como é atendida neste quadro', 'Situação'],
    linhas: calc.verificacoes.map(v => [String(v.n), v.item, v.ref, v.opcoes, v.como, v.situacao]),
    proporcoes: [0.3, 1.8, 0.45, 1.1, 2.8, 1.1], tamanho: 14 },
    notas: ['As opções (ensaio / comparação com projeto de referência / avaliação) seguem a tabela de verificações do Anexo D da NBR IEC 61439-1 [CONFERIR]. Itens do invólucro e dos componentes são comprovados pelos certificados dos fabricantes; o fabricante do quadro (montador) é o responsável pela verificação do conjunto.'] });
  s.push({ titulo: '14. Verificação de rotina (NBR IEC 61439-1, seção 11)', marcadores: [
    'Em todo quadro fabricado, antes da expedição: grau de proteção (11.2), distâncias (11.3), proteção contra choque e continuidade do PE (11.4), componentes incorporados (11.5), circuitos internos e torque (11.6), terminais (11.7), operação mecânica (11.8), ensaio dielétrico (11.9 — ' + `${T.porFaixa(T.TENSAO_ENSAIO, c.ui)} V para Ui ${c.ui} V) e fiação/funcionamento (11.10). [CONFERIR numeração]`,
    'O roteiro completo está no documento "Checklist de fabricação e ensaios de rotina"; os resultados vão no "Relatório de ensaios de rotina".',
  ] });
  s.push({ titulo: '15. Lista de materiais (resumo)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 2)]), proporcoes: [0.6, 4.6, 0.4, 0.5], tamanho: 14 },
    notas: ['Quantidades e preços na planilha (Excel). Modelos de catálogo genérico — confirmar fabricante, linha e coordenação antes da compra.'] });
  s.push({ titulo: 'Anexo — série de invólucros adotada', paragrafos: [
    `${c.montagem}: ${T.INVOLUCROS[c.montagem].alturasLarguras.map(([h, l]) => `${h}×${l}`).join(', ')} mm (A × L); profundidades ${T.INVOLUCROS[c.montagem].profundidades.join(', ')} mm. Série típica dos fabricantes nacionais de quadros de chapa [CONFERIR com o fornecedor].`,
  ] });
  s.push({ titulo: 'Premissas [CONFERIR]', marcadores: calc.premissas });
  if (calc.avisos.length) s.push({ titulo: 'Avisos', marcadores: calc.avisos });
  return s;
}

// Lista de materiais com fabricante, referência, medidas e fonte da medida (preço editável, total por fórmula)
function abaMateriais(materiais) {
  return {
    nome: 'Materiais',
    colunas: [
      { header: 'Cód.', key: 'codigo', width: 10 }, { header: 'Descrição', key: 'descricao', width: 64 },
      { header: 'Fabricante', key: 'fabricante', width: 18 }, { header: 'Referência do fabricante', key: 'referencia_fabricante', width: 20 },
      { header: 'L × A × P (mm)', key: 'medidas', width: 18 }, { header: 'Fonte da medida', key: 'fonte', width: 48 },
      { header: 'Un.', key: 'unidade', width: 6 }, { header: 'Qtd.', key: 'quantidade', width: 9 },
      { header: 'Preço unit. (R$)', key: 'preco', width: 14, numFmt: '#,##0.00' }, { header: 'Total (R$)', key: 'total', width: 14, numFmt: '#,##0.00' },
      { header: 'Grupo / referência normativa', key: 'ref', width: 40 },
    ],
    linhas: materiais.map((m, i) => ({ ...m, ref: `${m.grupo} — ${m.referencia}`, preco: null, total: { formula: `IF(I${i + 2}="","",H${i + 2}*I${i + 2})` } })),
    formulas: (ws) => { const r = ws.addRow({ descricao: 'TOTAL', total: { formula: `SUM(J2:J${materiais.length + 1})` } }); r.font = { bold: true }; },
  };
}

// Dispositivos com a origem da medida (memorial, planilha e 3D)
function linhasMedidas(calc) {
  const fmt = (v) => num(v, 1);
  const linha = (tag, desc, m, l, h, p) => [tag, desc.replace(m && m.origem === 'catalogo' ? ` — ${m.fabricante} ${m.referencia}` : '\u0000', '').replace(/ — circ\. [^—]*/, '').replace(/ — circuitos [^—]*/, '').trim().slice(0, 80),
    m && m.origem === 'catalogo' ? `${m.fabricante} ${m.referencia}` : (m && m.fabricante ? `${m.fabricante} (sem registro)` : '—'),
    `${fmt(l)} × ${fmt(h)} × ${fmt(p)}`,
    m && m.origem === 'catalogo' ? `${m.verificado ? 'catálogo' : 'catálogo — não verificado [CONFERIR]'}${m.fonte_url ? ` (${m.fonte_url})` : ''}` : 'típica [CONFERIR]'];
  const out = [];
  for (const f of calc.layout.fileiras) for (const k of f.itens) {
    if (['reserva', 'barramento', 'barra_neutro', 'barra_pe', 'bornes'].includes(k.tipo)) continue;
    if (k.filhos) k.filhos.forEach(x => out.push(linha(`${k.ref}/${x.ref}`, x.medida && x.medida.descricao ? x.medida.descricao : x.ref, x.medida, x.l, x.h, x.p)));
    else out.push(linha(k.ref, k.descricao, k.medida, k.largura, k.altura, k.prof));
  }
  for (const g of calc.born) for (const md of g.medidas || []) out.push(linha(`${g.id} ${num(md.secao)} mm²`, 'Borne de passagem', md, md.largura_mm, g.altura, g.prof));
  return out;
}

// ── Checklist de fabricação, relatório de ensaios e planilha ──────────────

function cfgChecklist(res) {
  const { calc } = res;
  const { c, geral, barr, layout, aut } = calc;
  const env = layout.involucro;
  return {
    titulo: 'CHECKLIST DE FABRICAÇÃO E ENSAIOS DE ROTINA', subtitulo: `${c.tag} — ${c.tipoRotulo} — NBR IEC 61439-1 (seção 11) e NBR 5410`, tituloCurto: `Checklist de fabricação — ${c.tag}`,
    secoesChecklist: SECOES_CHECKLIST,
    preparacao: [
      'Conferir a revisão do desenho de fabricação (DXF), da lista de materiais e do memorial antes de cortar trilhos e furar a placa.',
      'Montagem: placa → trilhos e canaletas → barramentos/isoladores → dispositivos na ordem do layout → fiação (anilhas e ponteiras) → bornes → porta → identificação.',
      'Ensaios com o quadro desenergizado da rede: desconectar DPS, multimedidor, fonte, CLP e eletrônicos antes do ensaio dielétrico e do megôhmetro.',
      'Levar/usar: torquímetro, micro-ohmímetro ou fonte de continuidade, megôhmetro 500/1000 V CC, equipamento de tensão aplicada, testador de DR, multímetro CAT III, paquímetro.',
    ],
    referencias: [
      ['Invólucro (A × L × P)', `${env.altura} × ${env.largura} × ${env.profundidade} mm, ${calc.inv.ip} / ${calc.inv.ik}, forma ${calc.inv.forma}`],
      ['Disjuntor geral', `${geral.polos}P ${geral.In} A, ${geral.icu} kA`],
      ['Barramento', barr.tipo === 'barra' && barr.fase ? `${barr.fase.l}×${barr.fase.e} mm, apoios a cada ${c.apoios} mm, ${c.entreFases} mm entre fases` : `pente ${barr.pente.a} A`],
      ['Barra PE', `${barr.pe.l}×${barr.pe.e} mm`],
      ['Tensão de ensaio dielétrico', `${T.porFaixa(T.TENSAO_ENSAIO, c.ui)} V eficaz (Ui ${c.ui} V)`],
      ['Isolamento mínimo (Tabela 60)', `${num(res.med.iso.minimo)} MΩ a ${res.med.iso.tensaoEnsaio} V CC`],
      ['Continuidade massa–PE', '≤ 0,1 Ω [CONFERIR]'],
      ...(aut.ativo ? [['Fonte 24 Vcc', `${aut.fonteA} A (${num(aut.totalMa / 1000, 2)} A previstos)`], ['E/S', `${aut.usados.DI} DI · ${aut.usados.DO} DO · ${aut.usados.AI} AI · ${aut.usados.AO} AO`]] : []),
    ],
    medicoes: [
      { titulo: 'Ensaio dielétrico e isolamento por circuito', colunas: ['Circuito', 'Tensão aplicada (V)', 'Resultado', 'Isolamento (MΩ)', 'Obs.'], proporcoes: [1.6, 1, 0.9, 0.9, 1.4],
        linhas: [['Principal (barramento)', '', '', '', ''], ...calc.circuitos.map(x => [`${x.n} — ${x.descricao}`.slice(0, 45), '', '', '', '']), ...calc.motores.map(m => [`${m.tag} — ${m.descricao}`, '', '', '', ''])] },
      { titulo: 'Continuidade do circuito de proteção', colunas: ['Ponto (massa → barra PE)', 'Medido (Ω)', 'Obs.'], proporcoes: [2.6, 0.9, 1.6], linhas: [['Porta', '', ''], ['Placa de montagem', '', ''], ['Laterais / teto', '', ''], ['Flange de entrada', '', '']] },
      { titulo: 'Torque das conexões de potência', colunas: ['Conexão', 'Torque do fabricante (N·m)', 'Conferido'], proporcoes: [2.4, 1.2, 0.8], linhas: [['Entrada do geral', '', ''], ['Barramento (todas)', '', ''], ['Saídas por amostragem', '', '']] },
      ...(aut.ativo ? [{ titulo: 'Teste de E/S (ponto a ponto)', colunas: ['Ponto', 'Tipo', 'Endereço', 'Borne', 'OK'], proporcoes: [2.2, 0.6, 0.9, 0.8, 0.5], linhas: [] }] : []),
    ],
  };
}

function cfgLaudo(res) {
  const { calc, med } = res;
  const { c, layout } = calc;
  return {
    titulo: 'RELATÓRIO DE ENSAIOS DE ROTINA / INSPEÇÃO DE QUADRO ELÉTRICO',
    tipoInspecao: `${c.tag} — verificação de rotina da NBR IEC 61439-1 (seção 11) — ${({ fabricacao: 'na fabricação (antes da expedição)', recebimento: 'no recebimento', periodica: 'inspeção periódica de quadro existente' })[res.insp.tipo] || 'na fabricação'}`,
    tituloCurto: `Relatório de ensaios — ${c.tag}`,
    sigla: 'REL-QD',
    objetivo: 'Este relatório registra a verificação de rotina do conjunto (inspeções visuais, medições e ensaios da seção 11 da NBR IEC 61439-1) e o teste funcional, com as não conformidades e o parecer.',
    listaNormas: NORMAS,
    secoesChecklist: SECOES_CHECKLIST,
    descricao: [
      ['Conjunto', `${c.tag} — ${c.tipoRotulo}${c.descricao ? ` (${c.descricao})` : ''}`],
      ['Características', `${c.vff}/${c.vfn} V, ${c.frequencia} Hz, ${c.esquema}; In ${calc.geral.In} A; Icc ${ka(c.icc)}; ${calc.inv.ip}/${calc.inv.ik}; forma ${calc.inv.forma}`],
      ['Invólucro', `${layout.involucro.altura} × ${layout.involucro.largura} × ${layout.involucro.profundidade} mm (${c.montagem})`],
      ['Saídas', `${calc.circuitos.length} circuitos${calc.motores.length ? `, ${calc.motores.length} partidas` : ''}${calc.aut.ativo ? `, CLP com ${calc.aut.usados.DI + calc.aut.usados.DO + calc.aut.usados.AI + calc.aut.usados.AO} pontos em uso` : ''}`],
    ],
    metodologia: [
      'Inspeção visual e conferência contra o desenho de fabricação e a lista de materiais.',
      `Ensaio dielétrico na frequência industrial a ${med.vEnsaio} V por 1 s em cada circuito principal (NBR IEC 61439-1, 11.9 [CONFERIR]), com eletrônicos desconectados; ou resistência de isolamento quando admitida.`,
      'Continuidade das massas à barra PE (micro-ohmímetro) e conferência de torque das conexões por amostragem.',
      'Teste funcional dos circuitos de comando, intertravamentos, parada de emergência, DR (testador) e E/S do CLP.',
    ],
    medicoes: [
      { titulo: '6.1 Ensaio dielétrico', colunas: ['Circuito', 'Tensão (V)', 'Resultado', 'Critério', 'Situação'], proporcoes: [1.4, 0.7, 0.8, 2.6, 0.7],
        linhas: med.dieletrico.map(m => [m.circuito, m.tensao_v ?? '', m.ensaio, m.criterio, m.resultado]) },
      { titulo: '6.2 Resistência de isolamento', colunas: ['Circuito', 'Tensão de ensaio (V)', 'Medido (MΩ)', 'Critério', 'Resultado'], proporcoes: [1.4, 0.9, 0.8, 2.4, 0.7],
        linhas: med.isolamento.map(m => [m.circuito, m.tensao_v ?? '', m.valor_mohm ?? '', m.criterio, m.resultado]) },
      { titulo: '6.3 Continuidade do circuito de proteção', colunas: ['Ponto', 'Medido (Ω)', 'Critério', 'Resultado'], proporcoes: [1.8, 0.8, 2.6, 0.7],
        linhas: med.continuidade.map(m => [m.ponto, m.valor_ohm ?? '', m.criterio, m.resultado]) },
      { titulo: '6.4 Teste funcional', colunas: ['Função', 'Observação', 'Critério', 'Resultado'], proporcoes: [1.8, 1.6, 1.4, 0.7],
        linhas: med.funcional.map(m => [m.funcao, m.obs || '', m.criterio, m.resultado]) },
    ],
    conclusoes: ['O conjunto só deve ser expedido/energizado com todos os ensaios de rotina conformes e a placa de identificação instalada.'],
    proximaInspecao: [['Quadro em operação', 'Inspeção visual e termografia anual; reaperto conforme o plano de manutenção (NBR 5410, 8.1) [CONFERIR]']],
  };
}

const arr = (v, cc = 2) => (v == null ? null : Math.round(v * 10 ** cc) / 10 ** cc);

async function planilha(res) {
  const { calc } = res;
  const { c, aut, layout, barr, term, perdas } = calc;
  const abas = [
    abaMateriais(calc.materiais),
    { nome: 'Circuitos', colunas: [
      { header: 'Nº', key: 'n', width: 6 }, { header: 'Descrição', key: 'descricao', width: 36 }, { header: 'Tipo', key: 'tipo', width: 18 }, { header: 'Ligação', key: 'lig', width: 8 },
      { header: 'Fases', key: 'fases', width: 7 }, { header: 'P (W)', key: 'p', width: 9, numFmt: '0' }, { header: 'Ib (A)', key: 'ib', width: 8, numFmt: '0.0' },
      { header: 'Disjuntor', key: 'disj', width: 14 }, { header: 'Icu (kA)', key: 'icu', width: 8 }, { header: 'Icc (kA)', key: 'icc', width: 8 },
      { header: 'DR', key: 'dr', width: 10 }, { header: 'Cabo (mm²)', key: 'secao', width: 10 }, { header: 'Iz (A)', key: 'iz', width: 8, numFmt: '0.0' }, { header: 'Observações', key: 'obs', width: 70 }],
      linhas: [
        ...calc.circuitos.map(x => ({ n: x.n, descricao: x.descricao, tipo: x.tipoRotulo, lig: LIG[x.ligacao], fases: x.fases.join(''), p: x.potencia, ib: arr(x.ib, 2), disj: `${x.polos}P ${x.disjuntor} A ${x.curva}`, icu: x.icu, icc: c.icc, dr: drTxt(x), secao: x.secao, iz: arr(x.iz, 1), obs: x.notas.join('; ') })),
        ...calc.motores.map(m => ({ n: m.tag, descricao: m.descricao, tipo: m.partidaRotulo, lig: '3F', fases: 'ABC', p: arr(m.pKw * 1000, 0), ib: arr(m.in, 2), disj: m.partidaInfo.dispositivos.map(d => `${d.ref} ${d.nominal_a || (d.faixa ? d.faixa.join('–') : '')}`).join(' '), icc: c.icc, secao: m.secao, obs: m.partidaInfo.observacoes.join(' ') })),
      ] },
    { nome: 'Arranjo', colunas: [{ header: 'Fileira', key: 'f', width: 8 }, { header: 'Zona', key: 'z', width: 30 }, { header: 'Ref.', key: 'ref', width: 10 }, { header: 'Descrição', key: 'd', width: 70 },
      { header: 'Largura (mm)', key: 'l', width: 12, numFmt: '0.0' }, { header: 'Módulos', key: 'm', width: 9 }, { header: 'Altura (mm)', key: 'h', width: 11 }, { header: 'X na fileira (mm)', key: 'x', width: 14, numFmt: '0' }, { header: 'Perda (W)', key: 'w', width: 10, numFmt: '0.00' }],
      linhas: layout.fileiras.flatMap((f, i) => f.itens.map(k => ({ f: i + 1, z: f.zonas.map(z => layout.rotuloZona[z]).join(' / '), ref: k.ref, d: k.descricao, l: k.largura, m: k.modulos, h: k.altura, x: k.x, w: k.perda }))) },
    { nome: 'Barramentos e térmica', colunas: [{ header: 'Grandeza', key: 'k', width: 52 }, { header: 'Valor', key: 'v', width: 22 }, { header: 'Unidade / referência', key: 'u', width: 50 }],
      linhas: [
        { k: 'Tipo de barramento', v: barr.tipo, u: barr.tipo === 'pente' ? `${barr.pente.a} A / ${barr.pente.s} mm²` : 'barras de cobre em isoladores' },
        ...(barr.fase ? [{ k: 'Barra de fase', v: `${barr.fase.l} × ${barr.fase.e}`, u: `mm — ${barr.secaoFase} mm²` }, { k: 'Capacidade DIN 43671 × k2', v: arr(barr.capacidade, 0), u: `A (k2 = ${arr(barr.k2, 3)})` },
          { k: 'Seção mínima ao curto (S ≥ I·√t/k)', v: arr(barr.sCurtoMin, 1), u: `mm² (k = ${arr(barr.kCurto, 1)})` }] : []),
        ...(barr.dinamico ? [{ k: 'Força no condutor central (estimativa)', v: arr(barr.dinamico.F, 0), u: 'N' }, { k: 'Tensão de flexão σ', v: arr(barr.dinamico.sigma, 1), u: `N/mm² (adm. ${barr.dinamico.adm})` }, { k: 'Força nos isoladores', v: arr(barr.dinamico.forcaApoio, 0), u: 'N' }] : []),
        { k: 'Barra PE', v: `${barr.pe.l} × ${barr.pe.e}`, u: 'mm' },
        { k: 'Perdas totais', v: arr(perdas.total, 1), u: 'W' },
        { k: 'Superfície efetiva Ae', v: arr(term.ae, 3), u: 'm² (IEC TR 60890)' },
        { k: 'ΔT médio do ar', v: arr(term.dtMedio, 1), u: 'K' },
        { k: 'Temperatura do ar no topo', v: arr(term.tTopo, 1), u: `°C (limite ${c.temperaturaMax} °C)` },
        ...(term.ventilacao ? [{ k: 'Vazão de ventilação necessária', v: arr(term.ventilacao.vazao, 0), u: `m³/h → ventilador ${term.ventilacao.ventilador} m³/h` }] : []),
      ] },
    { nome: 'Verificações 61439', colunas: [{ header: '#', key: 'n', width: 5 }, { header: 'Verificação', key: 'item', width: 50 }, { header: 'Item', key: 'ref', width: 7 }, { header: 'Opções', key: 'opcoes', width: 30 }, { header: 'Como é atendida', key: 'como', width: 80 }, { header: 'Situação', key: 'situacao', width: 28 }],
      linhas: calc.verificacoes },
  ];
  if (aut.ativo) {
    abas.push({ nome: 'Automação (E-S)', colunas: [{ header: 'Tag', key: 'tag', width: 12 }, { header: 'Descrição', key: 'descricao', width: 60 }, { header: 'Tipo', key: 'tipo', width: 8 }, { header: 'Qtd.', key: 'quantidade', width: 6 }, { header: 'Endereço', key: 'end', width: 12 }, { header: 'Borne', key: 'borne', width: 10 }],
      linhas: [...aut.origem, ...aut.porta.filter(p => p.sinal).map(p => ({ tag: '', descricao: `${p.rotulo} — ${p.funcao}`, tipo: p.sinal === 'DI2' ? 'DI' : p.sinal, quantidade: p.sinal === 'DI2' ? 2 * p.quantidade : p.quantidade }))] });
    abas.push({ nome: 'Fonte 24 Vcc', colunas: [{ header: 'Carga', key: 'item', width: 60 }, { header: 'mA', key: 'ma', width: 10, numFmt: '0' }],
      linhas: [...aut.consumo, { item: `Total (+ ${Math.round(aut.margem * 100)} % de margem = ${arr(aut.iFonte, 2)} A → fonte ${aut.fonteA} A)`, ma: aut.totalMa }] });
  }
  abas.push({ nome: 'Bornes', colunas: [{ header: 'Régua', key: 'g', width: 8 }, { header: 'Circuito / função', key: 'c', width: 50 }, { header: 'Seção (mm²)', key: 's', width: 11 }, { header: 'Bornes', key: 'q', width: 8 }, { header: 'PE', key: 'pe', width: 6 }],
    linhas: calc.born.flatMap(g => [...g.itens.map(i => ({ g: g.id, c: i.circuito, s: i.secao, q: i.quantidade, pe: i.pe || '' })), { g: g.id, c: `Reserva (${Math.round(c.reservaPct * 100)} %)`, q: g.reserva }]) });
  return D.gerarPlanilha(abas, { titulo: `Quadro ${c.tag} — lista de materiais e cálculo` });
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial de cálculo e especificação do quadro', formato: 'Word', nome: 'Memorial_Quadro',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DE CÁLCULO E ESPECIFICAÇÃO DE QUADRO', subtitulo: `${res.calc.c.tag} — ${res.calc.c.tipoRotulo} — projeto de fabricação (ABNT NBR IEC 61439-1/-2 e NBR 5410)`, tituloCurto: `Memorial — ${res.calc.c.tag}`, sigla: 'MEM-QD', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Lista de materiais (BOM) e planilha de cálculo', formato: 'Excel', nome: 'Lista_Materiais_Quadro', gerar: planilha },
  { tipo: 'desenho', rotulo: 'Desenho de fabricação (vista frontal e layout interno)', formato: 'DXF', nome: 'Desenho_Quadro',
    gerar: async (res) => Buffer.from(gerarDesenho(res.calc, res.dados).dxf, 'utf8') },
  { tipo: 'modelo3d', rotulo: 'Modelo 3D do quadro (HTML)', formato: 'HTML', nome: 'Modelo_3D_Quadro',
    gerar: async (res) => Buffer.from(M3D.gerarHtml(res.calc, res.dados), 'utf8') },
  { tipo: 'ensaios', rotulo: 'Checklist de fabricação e ensaios de rotina', formato: 'Word', nome: 'Checklist_Fabricacao_Quadro',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, cfgChecklist(res), res.checklist)) },
  { tipo: 'laudo', rotulo: 'Relatório de ensaios de rotina / inspeção do quadro', formato: 'Word', nome: 'Relatorio_Ensaios_Quadro',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, cfgLaudo(res), { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
];

// ── Orçamento ───────────────────────────────────────────────────────────────

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const { c, aut, layout, barr, term, motores, comps } = calc;
  const obra = dados.obra?.nome || dados.cliente?.nome || 'a obra';
  const S = 'Serviços (Mão de Obra)';
  const SUB = 'Montagem de quadros';
  const srv = (codigo, descricao, quantidade, unidade) => (quantidade > 0 ? [{ secao: S, subgrupo: SUB, codigo, descricao, quantidade, unidade }] : []);
  const env = layout.involucro;
  if (modo === 'fabricacao') {
    const modulares = comps.lista.filter(k => k.modulos != null && !['clp', 'fonte'].includes(k.tipo) && !k.tipo.startsWith('modulo')).length;
    const cm = comps.lista.filter(k => k.tipo === 'disjuntor_cm' || (k.tipo === 'disjuntor_geral' && k.modulos == null)).length;
    const automacao = comps.lista.filter(k => ['clp', 'fonte', 'switch', 'rele_seguranca', 'rele_interface'].includes(k.tipo) || k.tipo.startsWith('modulo')).length;
    const trilhoCanaleta = layout.fileiras.filter(f => f.trilho).length * layout.larguraUtil / 1000 + Object.values(layout.canaletasMetros).reduce((s, v) => s + v, 0);
    const bornes = calc.born.reduce((s, g) => s + g.total + g.reserva, 0);
    const portaQtd = aut.porta.reduce((s, p) => s + p.quantidade, 0) + (aut.ihm ? 1 : 0);
    const pontos = aut.ativo ? aut.usados.DI + aut.usados.DO + aut.usados.AI + aut.usados.AO : 0;
    const barraM = barr.tipo === 'barra' && barr.fase ? arr((c.nFases + (barr.neutro ? 1 : 0) + 1) * barr.comprimentoFase, 1) : 0;
    return {
      cliente_nome: dados.cliente?.nome || '',
      escopo: `Fabricação do quadro ${c.tag} (${c.tipoRotulo}) para ${obra}: invólucro ${env.altura} × ${env.largura} × ${env.profundidade} mm ${calc.inv.ip}, disjuntor geral ${calc.geral.polos}P ${calc.geral.In} A, ${calc.circuitos.length} circuitos${motores.length ? `, ${motores.length} partidas de motores` : ''}${aut.ativo ? `, CLP com ${pontos} pontos de E/S, fonte 24 Vcc e IHM` : ''}, barramento ${barr.tipo === 'pente' ? 'tipo pente' : 'de cobre'}, montagem, fiação, identificação, ensaios de rotina conforme a ABNT NBR IEC 61439-1 e projeto de fabricação com ART.`,
      observacoes: 'Rascunho gerado pela skill de quadros — conferir modelos e quantidades na lista de materiais e os preços antes de enviar ao cliente. Mão de obra pelo preço de referência (a cotar).',
      itens: [
        ...calc.materiais.filter(m => m.quantidade > 0).map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Quadros elétricos', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
        ...srv('qd_projeto', 'Projeto de fabricação do quadro (memorial de cálculo, layout, desenho, lista de materiais) com ART', 1, 'vb'),
        ...srv('qd_preparacao_involucro', 'Preparação do invólucro (furação da placa e da porta, recortes, flanges, prensa-cabos, aterramento)', 1, 'un'),
        ...srv('qd_trilho_canaleta', 'Montagem de trilho DIN e canaletas de fiação', Math.ceil(trilhoCanaleta), 'm'),
        ...srv('qd_dispositivo_modular', 'Montagem e ligação de dispositivo modular (disjuntor, DR, DPS, medidor) com fiação e identificação', modulares, 'un'),
        ...srv('qd_caixa_moldada', 'Montagem e ligação de disjuntor de caixa moldada / seccionadora', cm, 'un'),
        ...srv('qd_barramento', 'Fabricação e montagem de barramento de cobre (corte, furação, isoladores, conexões e torque)', barraM, 'm'),
        ...srv('qd_pente', 'Montagem de barramento tipo pente com alimentação e tampas, por fileira', barr.tipo === 'pente' ? Math.max(1, barr.fileirasPente || 1) : 0, 'un'),
        ...srv('qd_partida_motor', 'Montagem e fiação de partida de motor (direta, Y-Δ, soft-starter ou inversor)', motores.length, 'un'),
        ...srv('qd_automacao_montagem', 'Montagem de CLP, módulos de E/S, fonte 24 Vcc, relés e switch', automacao, 'un'),
        ...srv('qd_fiacao_io', 'Fiação de ponto de E/S do CLP até o borne, com identificação', pontos, 'pt'),
        ...srv('qd_porta', 'Montagem e fiação de dispositivo de porta (botão, sinaleiro, seletor, IHM)', portaQtd, 'un'),
        ...srv('qd_bornes', 'Montagem e identificação de bornes', bornes, 'un'),
        ...srv('qd_ventilacao', 'Instalação de ventilação forçada (ventilador, filtro, termostato)', term.ventilacao ? term.ventilacao.quantidade : 0, 'un'),
        ...srv('qd_programacao', 'Programação do CLP e da IHM, testes de lógica', aut.ativo ? 1 : 0, 'vb'),
        ...srv('qd_identificacao', 'Identificação do conjunto (placa de identificação, etiquetas, advertências, diagramas)', 1, 'vb'),
        ...srv('qd_ensaios_rotina', 'Ensaios de rotina NBR IEC 61439-1 (inspeção, dielétrico, continuidade, funcional) com relatório', 1, 'un'),
      ],
    };
  }
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: `Inspeção e ensaios do quadro ${c.tag} de ${obra} (verificação de rotina da ABNT NBR IEC 61439-1, termografia, isolamento, continuidade do PE, teste de DR e funcional) com relatório técnico e ART.${res.ncs.length ? ` Inclui a correção das ${res.ncs.length} não conformidades apontadas (itens a cotar).` : ''}`,
    observacoes: 'Rascunho gerado pela skill de quadros — conferir antes de enviar ao cliente.',
    itens: [
      ...srv('qd_inspecao', 'Inspeção visual do quadro (identificação, IP, distâncias, PE, dispositivos, torque por amostragem)', 1, 'un'),
      ...srv('qd_termografia', 'Termografia do quadro sob carga', 1, 'un'),
      ...srv('qd_ensaios_rotina', 'Ensaios do quadro (isolamento/dielétrico, continuidade, DR, funcional) com registro', 1, 'un'),
      ...srv('qd_relatorio', 'Relatório de ensaios/inspeção do quadro com ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
    ],
  };
}

// ── Formulário da tela ─────────────────────────────────────────────────────

const OP = {
  tipo: F.op(Object.entries(C.TIPOS_QUADRO)),
  sistema: F.op([['trifasico', 'Trifásico'], ['bifasico', 'Bifásico'], ['monofasico', 'Monofásico']]),
  tensoesFF: F.op([['220', '220 V'], ['380', '380 V'], ['440', '440 V']]),
  tensoesFN: F.op([['127', '127 V'], ['220', '220 V'], ['254', '254 V']]),
  esquema: F.op([['TN-S', 'TN-S'], ['TN-C-S', 'TN-C-S'], ['TN-C', 'TN-C'], ['TT', 'TT'], ['IT', 'IT']]),
  geralTipo: F.op([['auto', 'Automático'], ['din', 'Modular (DIN)'], ['caixa_moldada', 'Caixa moldada']]),
  dps: F.op([['auto', 'Automático (classe I+II com SPDA)'], ['II', 'Classe II'], ['I+II', 'Classe I+II'], ['I', 'Classe I'], ['nenhum', 'Sem DPS neste quadro']]),
  local: F.op(Object.entries(T.LOCAIS).map(([k, v]) => [k, `${v.rotulo} → ${v.ip}/${v.ik}`])),
  montagem: F.op([['sobrepor', 'Sobrepor (parede)'], ['embutir', 'Embutir'], ['autoportante', 'Autoportante (piso)']]),
  posicao: F.op([['parede', 'Encostado na parede'], ['livre', 'Livre por todos os lados'], ['fileira', 'Em fileira (laterais cobertas)']]),
  material: F.op([['aco', 'Chapa de aço pintada'], ['inox', 'Aço inox'], ['aluminio', 'Alumínio'], ['poliester', 'Poliéster']]),
  forma: F.op([['auto', 'Automática'], ...Object.entries(T.FORMAS).map(([k, v]) => [k, v.split(' — ')[0]])]),
  barramento: F.op([['auto', 'Automático'], ['pente', 'Tipo pente (DIN)'], ['barra', 'Barras de cobre']]),
  entrada: F.op([['inferior', 'Por baixo'], ['superior', 'Por cima']]),
  simNao: F.op([['auto', 'Automático'], ['sim', 'Sim'], ['nao', 'Não']]),
  ventilacao: F.op([['auto', 'Prever se necessário'], ['nao', 'Não prever (só avisar)']]),
  ligacao: F.op(Object.entries(LIG)),
  tipoCircuito: F.op(Object.entries(C.TIPOS_CIRCUITO)),
  curva: F.op([['B', 'B'], ['C', 'C'], ['D', 'D']]),
  dr: F.op([['', 'Sem DR'], ['ddr', 'DDR (disjuntor diferencial)'], ['idr', 'IDR (interruptor DR — exclusivo ou grupo)']]),
  partida: F.op([['direta', 'Partida direta'], ['estrela_triangulo', 'Estrela-triângulo'], ['soft_starter', 'Soft-starter'], ['inversor', 'Inversor de frequência']]),
  unidade: F.op([['cv', 'cv'], ['kW', 'kW']]),
  sinal: F.op([['DI', 'DI'], ['DO', 'DO'], ['AI', 'AI'], ['AO', 'AO']]),
  porta: F.op(Object.entries(C.PORTA).map(([k, v]) => [k, v.rotulo])),
  tipoInsp: F.op([['fabricacao', 'Ensaios de rotina na fabricação'], ['recebimento', 'Recebimento na obra'], ['periodica', 'Inspeção periódica de quadro existente']]),
  resultado: F.op([['', '—'], ['aprovado', 'Aprovado'], ['reprovado', 'Reprovado']]),
  // texto livre com sugestões (tipo 'sugestao'): fabricante fora da lista cai na medida típica e vai para componentes_sem_medida
  fabricante: F.op([...CAT.FABRICANTES].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(f => [f, f])),
  funcional: F.op([['', '—'], ['ok', 'OK'], ['falha', 'Falha']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Quadro — dados do unifilar e do local', aberta: true, resumo: 'quadro.tag', itens: [
    { tipo: 'nota', texto: 'Para importar o quadro de cargas de um projeto de elétrica predial ou industrial já feito no sistema: node skills/quadros/scripts/importar.js <projeto.json> --de eletrica|eletrica-industrial [--quadro CCM-01].' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'quadro.tag', rotulo: 'TAG do quadro' }, { caminho: 'quadro.descricao', rotulo: 'Descrição' },
      { caminho: 'quadro.tipo', rotulo: 'Tipo de quadro', tipo: 'selecao', opcoes: OP.tipo }, { caminho: 'quadro.maquina', rotulo: 'Quadro de máquina (NBR IEC 60204-1 / NR-12)', tipo: 'check' },
      { caminho: 'quadro.sistema', rotulo: 'Sistema', tipo: 'selecao', opcoes: OP.sistema }, { caminho: 'quadro.tensao_ff', rotulo: 'Tensão F-F (V)', tipo: 'selecao', opcoes: OP.tensoesFF },
      { caminho: 'quadro.tensao_fn', rotulo: 'Tensão F-N (V)', tipo: 'selecao', opcoes: OP.tensoesFN }, { caminho: 'quadro.esquema', rotulo: 'Esquema de aterramento', tipo: 'selecao', opcoes: OP.esquema },
      { caminho: 'quadro.icc_ka', rotulo: 'Icc presumida no ponto (kA)', tipo: 'numero', dica: 'Do estudo de curto ou da distribuidora; vazio = 10 kA [CONFERIR]' },
      { caminho: 'quadro.ipk_ka', rotulo: 'Ipk (kA)', tipo: 'numero', dica: 'Vazio = n × Icc (NBR IEC 61439-1, Tabela 7)' },
      { caminho: 'quadro.tempo_icw_s', rotulo: 'Tempo do Icw (s)', tipo: 'numero' },
      { caminho: 'quadro.disjuntor_geral_a', rotulo: 'Disjuntor geral (A)', tipo: 'numero', dica: 'Vazio = dimensionar pela corrente de projeto' },
      { caminho: 'quadro.geral_tipo', rotulo: 'Tipo do geral', tipo: 'selecao', opcoes: OP.geralTipo }, { caminho: 'quadro.geral_icu_ka', rotulo: 'Icu do geral (kA)', tipo: 'numero' },
      { caminho: 'quadro.dr_geral', rotulo: 'DR geral (seletivo)', tipo: 'check' }, { caminho: 'quadro.multimedidor', rotulo: 'Multimedidor de energia', tipo: 'check' },
      { caminho: 'quadro.dps_classe', rotulo: 'DPS', tipo: 'selecao', opcoes: OP.dps }, { caminho: 'quadro.spda', rotulo: 'Edificação com SPDA', tipo: 'check' },
      { caminho: 'quadro.ponto_entrada', rotulo: 'Quadro no ponto de entrada da linha', tipo: 'check' }, { caminho: 'quadro.residencial', rotulo: 'Uso residencial (advertência 6.5.4.10)', tipo: 'check' },
      { caminho: 'quadro.local', rotulo: 'Local de instalação', tipo: 'selecao', opcoes: OP.local }, { caminho: 'quadro.montagem', rotulo: 'Montagem', tipo: 'selecao', opcoes: OP.montagem },
      { caminho: 'quadro.posicao', rotulo: 'Posição (troca de calor)', tipo: 'selecao', opcoes: OP.posicao }, { caminho: 'quadro.material', rotulo: 'Material do invólucro', tipo: 'selecao', opcoes: OP.material },
      { caminho: 'quadro.ip', rotulo: 'IP (vazio = recomendado)' }, { caminho: 'quadro.ik', rotulo: 'IK (vazio = recomendado)' },
      { caminho: 'quadro.forma_separacao', rotulo: 'Forma de separação', tipo: 'selecao', opcoes: OP.forma }, { caminho: 'quadro.entrada_cabos', rotulo: 'Entrada de cabos', tipo: 'selecao', opcoes: OP.entrada },
      { caminho: 'quadro.temperatura_ambiente', rotulo: 'Temperatura ambiente (°C)', tipo: 'numero' }, { caminho: 'quadro.temperatura_max_interna', rotulo: 'Ar interno máximo (°C)', tipo: 'numero', dica: 'Limite adotado para o ar no topo do quadro' },
      { caminho: 'quadro.altitude_m', rotulo: 'Altitude (m)', tipo: 'numero' }, { caminho: 'quadro.ventilacao', rotulo: 'Ventilação forçada', tipo: 'selecao', opcoes: OP.ventilacao },
      { caminho: 'quadro.barramento', rotulo: 'Barramento', tipo: 'selecao', opcoes: OP.barramento }, { caminho: 'quadro.barra_pintada', rotulo: 'Barra pintada', tipo: 'check' },
      { caminho: 'quadro.temperatura_max_barra', rotulo: 'Temperatura máx. da barra (°C)', tipo: 'numero' }, { caminho: 'quadro.distancia_apoios_mm', rotulo: 'Distância entre isoladores (mm)', tipo: 'numero' },
      { caminho: 'quadro.distancia_fases_mm', rotulo: 'Distância entre fases (mm)', tipo: 'numero' }, { caminho: 'quadro.bornes_saida', rotulo: 'Bornes nas saídas', tipo: 'selecao', opcoes: OP.simNao },
      { caminho: 'quadro.reserva_pct', rotulo: 'Reserva (%)', tipo: 'numero', dica: 'Mínimo da Tabela 59 da NBR 5410 sempre aplicado' }, { caminho: 'quadro.fator_diversidade', rotulo: 'Fator de diversidade', tipo: 'numero', dica: 'Vazio = NBR IEC 61439-2 pelo número de saídas' },
    ] },
  ] },
  { titulo: '2.1 Fabricantes dos componentes', itens: [
    { tipo: 'nota', texto: 'Informe os fabricantes: o sistema escolhe o menor modelo de cada um que atende à especificação e usa as medidas OFICIAIS do catálogo (arranjo, invólucro, 3D). Sem registro do modelo, usa a medida típica e lista o item em "componentes sem medida" para buscar o datasheet. Fabricante ou referência por circuito/motor (colunas da tabela) têm prioridade.' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'fabricantes.padrao', rotulo: 'Fabricante padrão', tipo: 'sugestao', opcoes: OP.fabricante },
      ...[['disjuntor_din', 'Disjuntores DIN'], ['dr', 'Interruptores DR'], ['ddr', 'Disjuntores DR'], ['dps', 'DPS'], ['disjuntor_caixa_moldada', 'Caixa moldada'], ['contator', 'Contatores'],
        ['disjuntor_motor', 'Disjuntores-motor'], ['soft_starter', 'Soft-starters'], ['inversor', 'Inversores'], ['fonte_24v', 'Fonte 24 Vcc'], ['clp_cpu', 'CLP (CPU)'], ['clp_modulo', 'Módulos de E/S'],
        ['rele_interface', 'Relés de interface'], ['multimedidor', 'Multimedidor'], ['borne', 'Bornes']].map(([t, r]) => ({ caminho: `fabricantes.por_tipo.${t}`, rotulo: r, tipo: 'sugestao', opcoes: OP.fabricante })),
    ] },
  ] },
  { titulo: '3. Circuitos (unifilar / quadro de cargas)', aberta: true, itens: [
    { tipo: 'nota', texto: 'Um circuito por linha, na ordem do unifilar. Ib vazio = calculada pela potência. DR "IDR" com o mesmo "Grupo DR" (ex.: DR1) compartilha o interruptor; sem grupo, IDR exclusivo. Marque "Local 5.1.3.2.2" para banheiro, cozinha, área de serviço, garagem, área externa ou molhada.' },
    { tipo: 'tabela', caminho: 'circuitos', rotuloAdicionar: 'Adicionar circuito',
      novaLinha: { n: '{n}', descricao: '', tipo: 'tug', ligacao: 'FN', fases: '', potencia_w: null, fp: null, ib_a: null, disjuntor_a: null, curva: 'C', icu_ka: null, dr: '', dr_grupo: '', dr_ma: 30, secao_mm2: null, local_dr: false },
      colunas: [
        { campo: 'n', rotulo: 'Nº', largura: 60 }, { campo: 'descricao', rotulo: 'Descrição' }, { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.tipoCircuito, largura: 160 },
        { campo: 'ligacao', rotulo: 'Lig.', tipo: 'selecao', opcoes: OP.ligacao, largura: 80 }, { campo: 'fases', rotulo: 'Fases (A/B/C)', largura: 80 },
        { campo: 'potencia_w', rotulo: 'P (W)', tipo: 'numero', largura: 80 }, { campo: 'fp', rotulo: 'FP', tipo: 'numero', largura: 60 }, { campo: 'ib_a', rotulo: 'Ib (A)', tipo: 'numero', largura: 70 },
        { campo: 'disjuntor_a', rotulo: 'Disj. (A)', tipo: 'numero', largura: 70 }, { campo: 'curva', rotulo: 'Curva', tipo: 'selecao', opcoes: OP.curva, largura: 60 }, { campo: 'icu_ka', rotulo: 'Icu (kA)', tipo: 'numero', largura: 70 },
        { campo: 'dr', rotulo: 'DR', tipo: 'selecao', opcoes: OP.dr, largura: 150 }, { campo: 'dr_grupo', rotulo: 'Grupo DR', largura: 70 }, { campo: 'dr_ma', rotulo: 'IΔn (mA)', tipo: 'numero', largura: 70 },
        { campo: 'secao_mm2', rotulo: 'Cabo (mm²)', tipo: 'numero', largura: 70 }, { campo: 'local_dr', rotulo: 'Local 5.1.3.2.2', tipo: 'check', largura: 80 },
        { campo: 'fabricante', rotulo: 'Fabricante', tipo: 'sugestao', opcoes: OP.fabricante, largura: 150 }, { campo: 'referencia', rotulo: 'Referência', largura: 120 },
      ] },
    { tipo: 'tabela', caminho: 'drs', rotuloAdicionar: 'Definir interruptor DR de grupo (opcional)',
      novaLinha: { id: 'DR{n}', in_a: null, idn_ma: 30, polos: null, tipo: 'AC' },
      colunas: [{ campo: 'id', rotulo: 'Grupo', largura: 80 }, { campo: 'in_a', rotulo: 'In (A)', tipo: 'numero', largura: 80 }, { campo: 'idn_ma', rotulo: 'IΔn (mA)', tipo: 'numero', largura: 80 }, { campo: 'polos', rotulo: 'Polos', tipo: 'numero', largura: 70 }, { campo: 'tipo', rotulo: 'Tipo (AC/A/F/B)', largura: 90 }] },
  ] },
  { titulo: '4. Motores com partida no quadro', itens: [
    { tipo: 'nota', texto: 'Dados de placa; a partida (disjuntor-motor, contatores, soft-starter, inversor) é dimensionada pelo motor da skill de elétrica industrial.' },
    { tipo: 'tabela', caminho: 'motores', rotuloAdicionar: 'Adicionar motor',
      novaLinha: { tag: 'M-0{n}', descricao: '', potencia: null, unidade: 'cv', rendimento: null, fp: null, in_placa_a: null, ip_in: 7, partida: 'direta', quantidade: 1, secao_mm2: null, tensao_placa: '' },
      colunas: [
        { campo: 'tag', rotulo: 'TAG', largura: 80 }, { campo: 'descricao', rotulo: 'Descrição' }, { campo: 'potencia', rotulo: 'Potência', tipo: 'numero', largura: 80 }, { campo: 'unidade', rotulo: 'Un.', tipo: 'selecao', opcoes: OP.unidade, largura: 70 },
        { campo: 'rendimento', rotulo: 'η', tipo: 'numero', largura: 60 }, { campo: 'fp', rotulo: 'FP', tipo: 'numero', largura: 60 }, { campo: 'in_placa_a', rotulo: 'In placa (A)', tipo: 'numero', largura: 80 }, { campo: 'ip_in', rotulo: 'Ip/In', tipo: 'numero', largura: 60 },
        { campo: 'tensao_placa', rotulo: 'Tensões de placa', largura: 90 }, { campo: 'partida', rotulo: 'Partida', tipo: 'selecao', opcoes: OP.partida, largura: 160 }, { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 60 }, { campo: 'secao_mm2', rotulo: 'Cabo (mm²)', tipo: 'numero', largura: 80 },
        { campo: 'fabricante', rotulo: 'Fabricante', tipo: 'sugestao', opcoes: OP.fabricante, largura: 150 }, { campo: 'referencia', rotulo: 'Referência (soft/inversor ou contator)', largura: 140 },
      ] },
  ] },
  { titulo: '5. Automação (CLP, fonte, IHM, porta)', itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'automacao.ativo', rotulo: 'Quadro com automação', tipo: 'check' }, { caminho: 'automacao.clp', rotulo: 'Com CLP', tipo: 'check' },
      { caminho: 'automacao.cpu_di', rotulo: 'DI integradas na CPU', tipo: 'numero' }, { caminho: 'automacao.cpu_do', rotulo: 'DO integradas', tipo: 'numero' },
      { caminho: 'automacao.cpu_ai', rotulo: 'AI integradas', tipo: 'numero' }, { caminho: 'automacao.cpu_ao', rotulo: 'AO integradas', tipo: 'numero' },
      { caminho: 'automacao.reserva_io_pct', rotulo: 'Reserva de E/S (%)', tipo: 'numero' }, { caminho: 'automacao.margem_fonte_pct', rotulo: 'Margem da fonte (%)', tipo: 'numero' },
      { caminho: 'automacao.sinais_motores', rotulo: 'Gerar E/S dos motores', tipo: 'check' }, { caminho: 'automacao.ihm_pol', rotulo: 'IHM (polegadas)', tipo: 'numero' },
      { caminho: 'automacao.comunicacao', rotulo: 'Comunicação', dica: 'ethernet, modbus_rtu, profinet…' }, { caminho: 'automacao.switch_portas', rotulo: 'Switch (portas)', tipo: 'numero' },
      { caminho: 'automacao.reles_interface', rotulo: 'Relés de interface', tipo: 'numero', dica: 'Vazio = um por DO' },
    ] },
    { tipo: 'tabela', caminho: 'automacao.sinais', rotuloAdicionar: 'Adicionar sinal de campo', novaLinha: { tag: '', descricao: '', tipo: 'DI', quantidade: 1 },
      colunas: [{ campo: 'tag', rotulo: 'Tag', largura: 90 }, { campo: 'descricao', rotulo: 'Descrição' }, { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.sinal, largura: 70 }, { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 60 }] },
    { tipo: 'tabela', caminho: 'automacao.cargas_24v', rotuloAdicionar: 'Adicionar carga em 24 Vcc', novaLinha: { descricao: '', quantidade: 1, corrente_ma: null },
      colunas: [{ campo: 'descricao', rotulo: 'Carga' }, { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 60 }, { campo: 'corrente_ma', rotulo: 'mA cada', tipo: 'numero', largura: 80 }] },
    { tipo: 'tabela', caminho: 'automacao.porta', rotuloAdicionar: 'Adicionar dispositivo de porta', novaLinha: { tipo: 'liga', funcao: '', quantidade: 1 },
      colunas: [{ campo: 'tipo', rotulo: 'Dispositivo', tipo: 'selecao', opcoes: OP.porta, largura: 260 }, { campo: 'funcao', rotulo: 'Função' }, { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 60 }] },
  ] },
  F.secaoInspecao(6, OP.tipoInsp),
  F.secaoChecklist(7, CHECKLIST.length),
  { titulo: '8. Ensaios de rotina', itens: [
    { tipo: 'tabela', caminho: 'inspecao.dieletrico', rotuloAdicionar: 'Adicionar ensaio dielétrico', novaLinha: { circuito: '', tensao_v: null, resultado: '' },
      colunas: [{ campo: 'circuito', rotulo: 'Circuito' }, { campo: 'tensao_v', rotulo: 'Tensão (V)', tipo: 'numero', largura: 100 }, { campo: 'resultado', rotulo: 'Resultado', tipo: 'selecao', opcoes: OP.resultado, largura: 120 }] },
    { tipo: 'tabela', caminho: 'inspecao.isolamento', rotuloAdicionar: 'Adicionar isolamento', novaLinha: { circuito: '', tensao_v: 500, valor_mohm: null },
      colunas: [{ campo: 'circuito', rotulo: 'Circuito' }, { campo: 'tensao_v', rotulo: 'Tensão (V)', tipo: 'numero', largura: 100 }, { campo: 'valor_mohm', rotulo: 'Medido (MΩ)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'inspecao.continuidade_pe', rotuloAdicionar: 'Adicionar continuidade', novaLinha: { ponto: '', valor_ohm: null },
      colunas: [{ campo: 'ponto', rotulo: 'Ponto (massa → barra PE)' }, { campo: 'valor_ohm', rotulo: 'Medido (Ω)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'inspecao.funcional', rotuloAdicionar: 'Adicionar teste funcional', novaLinha: { funcao: '', obs: '', resultado: '' },
      colunas: [{ campo: 'funcao', rotulo: 'Função' }, { campo: 'obs', rotulo: 'Observação' }, { campo: 'resultado', rotulo: 'Resultado', tipo: 'selecao', opcoes: OP.funcional, largura: 110 }] },
  ] },
  F.secaoNcs(9, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(10),
];

const base = criarDisciplina({
  chave: 'quadros',
  nome: 'Quadros elétricos e de automação — projeto de fabricação (NBR IEC 61439)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'fabricacao', rotulo: 'Fabricação do quadro', descricao: 'Lista de materiais do quadro e mão de obra de montagem, fiação, programação e ensaios de rotina (códigos qd_*)' },
    { modo: 'inspecao', rotulo: 'Inspeção e ensaios de quadro', descricao: 'Inspeção, termografia, ensaios e relatório do quadro, com a correção das não conformidades' },
  ],
  montarOrcamento,
});

// O molde comum (_comum/disciplina.js) só conhece Word e Excel: o desenho DXF
// sai por aqui, com o mesmo padrão de nome de arquivo
const gerarDocumentoBase = base.gerarDocumento;
const FORA_DO_OFFICE = { desenho: { ext: 'dxf', mime: 'application/dxf' }, modelo3d: { ext: 'html', mime: 'text/html; charset=utf-8' } };
base.gerarDocumento = async (res, tipo) => {
  const f = FORA_DO_OFFICE[tipo];
  if (!f) return gerarDocumentoBase(res, tipo);
  const d = DOCUMENTOS.find(x => x.tipo === tipo);
  return { buffer: await d.gerar(res), nomeArquivo: D.nomeArquivo(res.dados, d.nome, f.ext, true), mime: f.mime };
};

module.exports = base;
module.exports.secoesMemorial = secoesMemorial;
