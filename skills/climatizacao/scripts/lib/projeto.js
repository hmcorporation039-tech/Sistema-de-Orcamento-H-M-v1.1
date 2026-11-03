// Climatização — cálculo completo da obra: etapa 1 (carga e seleção, ./calculo.js),
// etapa 2 (sistemas centrais, ./centrais.js), etapa 3 (PMOC, ./pmoc.js), a lista de
// cargas elétricas para o projeto elétrico e os materiais.

const T = require('./tabelas');
const K = require('./calculo');
const C = require('./centrais');
const P = require('./pmoc');

const { num, fmt } = K;

function calcular(dados) {
  const { c, avisos, pendencias } = K.config(dados);
  const ext = K.estado(c.tbsExt, K.umidadePorTbu(c.tbsExt, c.tbuExt, c.p), c.p);
  const int = K.estado(c.tbsInt, K.umidadePorUr(c.tbsInt, c.urInt, c.p), c.p);
  c.ext = ext;
  c.int = int;
  const cen = dados.central || {};
  c.vff = num((dados.eletrica || {}).tensao_ff, 380);
  c.agua = { dt: num(cen.delta_t_agua_c, T.AGUA_GELADA_PADRAO.delta_t), tSaida: num(cen.t_saida_agua_c, T.AGUA_GELADA_PADRAO.saida_c) };
  c.reaquecimento = ['eletrico', 'agua_quente', 'nenhum'].includes((dados.ar || {}).reaquecimento) ? dados.ar.reaquecimento : 'nenhum';
  const catalogo = Array.isArray(dados.catalogo_equipamentos) ? dados.catalogo_equipamentos : [];
  if (ext.w <= int.w) avisos.push(`Ar externo mais seco que o interno (W ${fmt(ext.w * 1000, 1)} ≤ ${fmt(int.w * 1000, 1)} g/kg): carga latente do ar externo considerada nula.`);

  const ambientes = K.lerAmbientes(dados, c, ext, int, avisos, pendencias);
  if (!ambientes.length) throw new Error('Informe ao menos um ambiente com área (tabela "Ambientes").');
  pendencias.add('Calor de pessoas por atividade (sensível/latente): ASHRAE Fundamentals cap. 18 Tab. 1 / NBR 16401-1 Anexo C — valores de memória. [CONFERIR]');
  pendencias.add('Ar externo: Fp, Fa e densidade de ocupação da NBR 16401-3 (Tabela 1, nível 1) e Ez da Tabela 2 — tabela da skill de automação, não conferida no texto. [CONFERIR]');
  if (ambientes.length > 1) pendencias.add('Eficiência de ventilação Ev pela maior Zpz (ASHRAE 62.1 Tab. 6.2.5.2 / NBR 16401-3) — não conferida no texto. [CONFERIR]');
  const sel = K.escolherSistema(ambientes, c);
  c.sistemaEscolhido = sel.sistema;
  pendencias.add('Critério de escolha do sistema (split ≤ 5 TR em até 4 ambientes; self para poucos ambientes ≥ 10 TR; VRF até 120 TR; acima, água gelada) — critério H&M, não é norma. [CONFERIR]');
  pendencias.add('Capacidades comerciais de split, VRF, self e chiller e COP típicos para a potência elétrica estimada — pré-seleção; o modelo final é do catálogo do fabricante. [CONFERIR]');

  const projeto = { sistema: sel.sistema, ambientes, split: [], vrf: null, self: [], unidades: [], central: null };
  let cfgAr = T.AR;
  if (sel.sistema === 'split') projeto.split = K.selecionarSplit(ambientes, c, catalogo);
  if (sel.sistema === 'vrf') projeto.vrf = K.selecionarVrf(ambientes, c, avisos, catalogo);
  if (sel.sistema === 'self' || sel.sistema === 'chiller') {
    if (sel.sistema === 'self' && c.distribuicao === 'vav') { avisos.push('Self com VAV: adotado volume constante (o self de catálogo tem controle por estágios). [CONFERIR]'); c.distribuicao = 'vac'; }
    const r = C.unidadesDeAr(ambientes, c, dados, catalogo, avisos, pendencias);
    projeto.unidades = r.unidades;
    cfgAr = r.cfgAr;
    if (sel.sistema === 'self') projeto.self = K.selecionarSelf(r.unidades.map(u => ({ id: u.id, kw: u.kw, ambientes: ambientes.filter(a => u.ids.includes(a.id)) })), catalogo);
    else projeto.central = C.centralAguaGelada(r.unidades, ambientes, c, dados, catalogo, avisos, pendencias);
    if (c.distribuicao === 'vav') {
      pendencias.add('Limite de vazão mínima com reaquecimento da ASHRAE 90.1 (6.5.2.1: 20 % da máxima ou o ar externo da zona) — edição não conferida. [CONFERIR]');
      pendencias.add('Controle da pressão estática do duto (sensor a ~2/3 do principal, reset por demanda — ASHRAE 90.1 6.5.3.2 / Guideline 36) — itens não conferidos no texto. [CONFERIR]');
    }
  }
  pendencias.add('Dutos: perda pelo método de Altshul-Tsal (ASHRAE Fundamentals cap. 21), perda alvo de 1 Pa/m e velocidades máximas de 8 m/s (principal) e 5 m/s (ramal) — critério de ruído a conferir com a NBR 16401-1. [CONFERIR]');

  const totais = {
    sensivel: ambientes.reduce((s, a) => s + a.sensivel, 0), latente: ambientes.reduce((s, a) => s + a.latente, 0),
    area: ambientes.reduce((s, a) => s + a.area, 0), pessoas: ambientes.reduce((s, a) => s + a.pessoas, 0),
    arExterno: ambientes.reduce((s, a) => s + a.voz, 0) / 1000,
  };
  totais.total = totais.sensivel + totais.latente;
  totais.kw = totais.total / 1000;
  totais.tr = K.kwParaTr(totais.total);
  totais.btuh = totais.total * T.BTUH_POR_W;
  totais.simultanea = totais.total * c.simultaneidade;
  totais.trSimultanea = K.kwParaTr(totais.simultanea);

  const eletrica = cargasEletricas(projeto, c);
  const pmoc = P.calcularPmoc(dados, projeto);
  pmoc.avisos.forEach(a => avisos.push(a));
  pendencias.add('PMOC: rotinas e periodicidades por equipamento — critério H&M no espírito do Anexo I da Portaria 3.523/1998 e da NBR 13971, que não foram lidos. [CONFERIR]');
  pendencias.add('Qualidade do ar interior: critérios da ABNT NBR 17037 pelo comunicado ABRAVA de 05/08/2024 (norma não lida) e da RE 09/2003 (de memória). [CONFERIR]');
  const x = { c, ext, int, ambientes, sel, projeto, totais, eletrica, pmoc, cfgAr, avisos, pendencias: [...pendencias] };
  x.materiais = listaMateriais(x);
  return x;
}

// ── Cargas elétricas (vão para o projeto elétrico / skill de quadros) ──────
function cargasEletricas(pj, c) {
  const l = [];
  const corrente = (kw, fp = T.FP_EQUIPAMENTO) => (kw * 1000) / (Math.sqrt(3) * c.vff * fp);
  if (pj.sistema === 'split') pj.split.forEach(s => l.push({ tag: `SPL-${s.id}`, descricao: `Split ${fmt(s.btuh, 0)} BTU/h × ${s.n} — ${s.ambiente}`, kw: s.kwEl, in: null, partida: 'própria do equipamento (monofásico/bifásico conforme o modelo)', estimado: true }));
  if (pj.sistema === 'vrf') l.push({ tag: 'UE-VRF', descricao: `Condensadoras VRF (${pj.vrf.sistemas} sistema(s) × ${pj.vrf.modulosPorSistema} módulo(s) de ${fmt(pj.vrf.modulo, 1)} kW)`, kw: pj.vrf.kwEl, in: corrente(pj.vrf.kwEl), partida: 'inversor do próprio equipamento', estimado: true });
  if (pj.sistema === 'self') pj.self.forEach(s => l.push({ tag: s.unidade, descricao: `Self ${fmt(s.tr, 1)} TR × ${s.n}`, kw: s.kwEl, in: corrente(s.kwEl), partida: 'própria do equipamento', estimado: true }));
  for (const u of pj.unidades) l.push({ tag: `${u.id}-VE`, descricao: `Ventilador ${u.id} ${fmt(u.motor.cv)} cv`, kw: u.motor.kw / u.motor.eta, in: u.motor.in, partida: u.motor.partida.rotulo, motor: u.motor });
  for (const u of pj.unidades) for (const r of u.reaquecimento) l.push({ tag: `RQ-${r.ambiente}`, descricao: `Reaquecimento elétrico da VAV — ${r.ambiente}`, kw: r.kw, in: corrente(r.kw, 1), partida: 'controlador da VAV (SSR/estágios)', estimado: true });
  if (pj.central) {
    const ce = pj.central;
    for (let i = 1; i <= ce.nChillers; i++) l.push({ tag: `CH-${String(i).padStart(2, '0')}`, descricao: `Chiller ${fmt(ce.trPorChiller, 0)} TR (COP ${fmt(ce.cop, 2)})${i > ce.nOp ? ' — reserva' : ''}`, kw: ce.kwEl, in: corrente(ce.kwEl), partida: 'painel do próprio chiller', estimado: true });
    for (const b of ce.bombas) l.push({ tag: b.tag, descricao: `Bomba ${b.funcao} ${fmt(b.motor.cv)} cv`, kw: b.motor.kw / b.motor.eta, in: b.motor.in, partida: b.motor.partida.rotulo, motor: b.motor });
  }
  return { cargas: l, totalKw: l.reduce((s, x) => s + (x.kw || 0), 0) };
}

// ── Materiais ──────────────────────────────────────────────────────────────
function listaMateriais(x) {
  const itens = [];
  const add = (codigo, descricao, unidade, quantidade, referencia = '') => { if (quantidade > 0) itens.push({ codigo, descricao, unidade, quantidade: Math.round(quantidade * 100) / 100, referencia }); };
  const { projeto: pj, cfgAr } = x;
  const distancia = num((x.c && x.c.distanciaCondensadora) || null, 7);
  if (pj.sistema === 'split') {
    const porCap = new Map();
    pj.split.forEach(s => { const k = `${s.btuh}|${s.forma}`; porCap.set(k, (porCap.get(k) || 0) + s.n); });
    for (const [k, n] of porCap) { const [btuh, forma] = k.split('|'); add('SPLIT', `Ar-condicionado split inverter ${fmt(Number(btuh), 0)} BTU/h (${forma}), evaporadora + condensadora`, 'cj', n, 'modelo do catálogo [CONFERIR]'); }
    const n = pj.split.reduce((s, a) => s + a.n, 0);
    add('TUB-FRIG', 'Par de tubos de cobre com isolamento elastomérico (linha de líquido e de sucção)', 'm', n * distancia * 1.1, `${distancia} m por unidade + 10 % [CONFERIR traçado]`);
    add('CABO-PP', 'Cabo PP de interligação evaporadora–condensadora', 'm', n * distancia * 1.1);
    add('DRENO', 'Tubo de PVC 3/4" para dreno de condensado', 'm', n * 5, '[CONFERIR traçado]');
    add('SUP-COND', 'Suporte da condensadora com coxins antivibração', 'un', n);
  }
  if (pj.sistema === 'vrf') {
    const v = pj.vrf;
    const porCap = new Map();
    v.evaporadoras.forEach(e => porCap.set(e.kw, (porCap.get(e.kw) || 0) + e.n));
    for (const [kw, n] of porCap) add('VRF-UI', `Unidade interna VRF ${fmt(kw, 1)} kW`, 'un', n, 'modelo pelo ambiente [CONFERIR]');
    add('VRF-UE', `Unidade externa VRF (módulo) ${fmt(v.modulo, 1)} kW`, 'un', v.modulosPorSistema * v.sistemas, `${v.sistemas} sistema(s) [CONFERIR software do fabricante]`);
    add('VRF-DER', 'Kit de derivação (junta/refnet) do fabricante', 'un', Math.max(0, v.nEvap - v.sistemas), '1 por unidade interna além da primeira [CONFERIR]');
    add('VRF-CTRL', 'Controle individual com fio para unidade interna', 'un', v.nEvap);
    add('VRF-CENTRAL', 'Controle central do VRF (com interface BMS)', 'un', 1);
    add('TUB-FRIG', 'Tubulação de cobre para VRF com isolamento elastomérico', 'm', (v.nEvap * 8 + v.sistemas * 20) * 1.1, '8 m por unidade interna + 20 m por sistema + 10 % [CONFERIR traçado]');
    add('DRENO', 'Tubo de PVC 3/4" para dreno de condensado', 'm', v.nEvap * 5, '[CONFERIR traçado]');
  }
  if (pj.sistema === 'self') pj.self.forEach(s => add('SELF', `Self-contained ${fmt(s.tr, 1)} TR com condensação a ar — ${s.unidade}`, 'un', s.n, 'modelo do catálogo [CONFERIR]'));
  if (pj.unidades.length) {
    if (pj.sistema === 'chiller') pj.unidades.forEach(u => add('FANCOIL', `Fancoil/AHU ${u.id}: ${fmt(u.vFanM3h, 0)} m³/h, ${fmt(u.kw, 1)} kW (${fmt(u.tr, 1)} TR), ${fmt(u.pressao, 0)} Pa, motor ${fmt(u.motor.cv)} cv`, 'un', 1, 'seleção no software do fabricante [CONFERIR]'));
    const chapa = pj.unidades.reduce((s, u) => s + u.dutos.chapaM2, 0);
    add('DUTO', 'Duto de chapa de aço galvanizado (fabricação e montagem, com suportes)', 'm²', chapa * 1.1, 'área da chapa + 10 % de conexões [CONFERIR]');
    add('ISOL-DUTO', 'Isolamento térmico do duto de insuflamento (manta com barreira de vapor)', 'm²', chapa * 1.1);
    const dif = pj.unidades.flatMap(u => u.terminais);
    add('DIFUSOR', `Difusor de insuflamento (≈ ${cfgAr.vazao_difusor_m3h} m³/h cada, com registro)`, 'un', dif.reduce((s, t) => s + t.difusores, 0), '[CONFERIR catálogo — ruído NC]');
    add('GRELHA-RET', 'Grelha de retorno', 'un', dif.reduce((s, t) => s + t.grelhas, 0));
    add('TOMADA-AR', `Veneziana de tomada de ar externo com filtro (no mínimo ${T.FILTRAGEM.ar_externo_min})`, 'un', pj.unidades.length);
    add('FILTRO', `Jogo de filtros da unidade (${T.FILTRAGEM.recomendada})`, 'cj', pj.unidades.length);
    const vavs = pj.unidades.flatMap(u => u.vavs);
    if (vavs.length) {
      const porDiam = new Map();
      vavs.forEach(v => { const d = v.entrada ? Math.round(v.entrada * 1000) : 0; porDiam.set(d, (porDiam.get(d) || 0) + v.caixas); });
      for (const [d, n] of porDiam) add('VAV', `Caixa VAV com controlador DDC e sensor de fluxo${d ? `, entrada Ø ${d} mm` : ' (acima da série — dividir a zona)'}${x.c.reaquecimento === 'eletrico' ? ', com reaquecimento elétrico' : ''}`, 'un', n, '[CONFERIR fabricante]');
      add('SENSOR-PE', 'Transmissor de pressão estática do duto (controle do inversor do ventilador)', 'un', pj.unidades.filter(u => u.controlePressao).length);
    }
  }
  if (pj.central) {
    const ce = pj.central;
    add('CHILLER', `Chiller ${ce.rotuloTipo} ${fmt(ce.trPorChiller, 0)} TR (COP ≥ ${fmt(ce.cop, 2)} a plena carga, AHRI 550/590)`, 'un', ce.nChillers, ce.modelo ? `${ce.modelo.fabricante} ${ce.modelo.modelo || ''}`.trim() : 'seleção do fabricante [CONFERIR]');
    if (ce.condAgua) add('TORRE', `Torre de resfriamento ${fmt(ce.torreTr, 0)} TR de torre`, 'un', ce.nChillers, '[CONFERIR fabricante]');
    const porBomba = new Map();
    ce.bombas.forEach(b => { const k = `${b.funcao.replace(' (reserva)', '')}|${fmt(b.vazaoM3h, 0)}|${fmt(b.altura, 0)}|${fmt(b.motor.cv)}`; porBomba.set(k, (porBomba.get(k) || 0) + 1); });
    for (const [k, n] of porBomba) { const [f, q, h, cv] = k.split('|'); add('BOMBA', `Bomba centrífuga ${f}: ${q} m³/h × ${h} mca, motor ${cv} cv`, 'un', n, 'curva do fabricante [CONFERIR]'); }
    const nInv = ce.bombas.filter(b => b.partida === 'inversor').length;
    add('INVERSOR', 'Inversor de frequência para bomba (ver quadro de comando)', 'un', nInv);
    add('VALV-2V', 'Válvula de controle de 2 vias com atuador modulante (por fancoil)', 'un', pj.unidades.length);
    add('TUBO-AG', `Tubo de aço carbono Sch 40 ${ce.tuboPrincipal.dn} com isolamento (rede de água gelada)`, 'm', ce.rede * 1.1, `${ce.rede} m + 10 % [CONFERIR traçado]`);
    add('TANQUE-EXP', 'Tanque de expansão fechado com pré-carga', 'un', 1);
    add('FLUXOSTATO', 'Fluxostato de água gelada (proteção do chiller)', 'un', ce.nChillers);
  }
  return itens;
}

module.exports = { calcular, cargasEletricas, listaMateriais };
