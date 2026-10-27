// Pressurização de escada de segurança (controle de fumaça) — cálculo.
//
// Método (CBMGO NT 13/2025, que segue a IT 13 do CBPMESP; CBMDF NT 10/2015 remete à
// ABNT NBR 14880 — ver as fontes em tabelas.js):
//  1. áreas de escape: frestas das PCF fechadas (Tabela A2), vão de luz das PCF abertas,
//     portas de elevador, janelas (N = 1,6) e aberturas permanentes (4 m/s);
//     antecâmara não pressurizada em série com a escada: 1/A² = Σ 1/Ai² (Equação 3);
//  2. QFT = 0,827 · A · ΔP^(1/N) com todas as PCF fechadas a 50 Pa (Equação 1);
//  3. QAT = APA · 1 m/s, APA = vão das PCF abertas (Tabela B1) + frestas das demais;
//  4. QT = maior entre QFT e QAT (Equação 4); QTS = QT × 1,4 (duto metálico) ou × 1,5
//     (alvenaria/misto) (Equação 5);
//  5. alívio: QD = QTS − QFT(60 Pa) — o excesso que o damper (ou o inversor) tira para a
//     pressão não passar de 60 Pa (Anexo F, parte V);
//  6. distribuição (duto, grelhas, tomada de ar), pressão estática ESTIMADA pelo atrito
//     (Darcy/Altshul-Tsal) e perdas localizadas típicas, potência do motor;
//  7. alimentação de cada motor pela NBR 5410 (motor da skill de elétrica) e dispositivos
//     de partida (motor da skill de elétrica industrial);
//  8. automação: pontos de E/S do painel, lógica, intertravamentos e sinalização;
//  9. materiais.

const T = require('./tabelas');
const E = require('../../../eletrica/scripts/lib/calculo');
const ET = require('../../../eletrica/scripts/lib/tabelas');
const EI = require('../../../eletrica-industrial/scripts/lib/calculo');

const RAIZ3 = Math.sqrt(3);
const CV_KW = 0.7355;
const numero = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const arred = (v, c = 2) => (v == null || !Number.isFinite(v) ? v : Math.round(v * 10 ** c) / 10 ** c);
const fmt = (v, c = 2) => (v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));
const sim = (v) => v === true || v === 'true' || v === 'sim' || v === 1;

// ── Fórmulas básicas (testadas) ────────────────────────────────────────────

// Equação 1: Q (m³/s) = 0,827 · A (m²) · ΔP (Pa)^(1/N)
function vazaoFresta(area, dp, n = T.N_PORTA) {
  return T.COEF_VAZAO * area * dp ** (1 / n);
}

// Equação 3: caminhos em série — 1/A² = Σ 1/Ai²
function areaSerie(areas) {
  const s = areas.filter(a => a > 0).reduce((t, a) => t + 1 / (a * a), 0);
  return s ? 1 / Math.sqrt(s) : 0;
}

// Densidade do ar no local (atmosfera padrão + gás ideal), para o aviso de altitude
function densidadeLocal(altitudeM = 0, temperaturaC = 20) {
  const p = 101325 * (1 - 2.25577e-5 * altitudeM) ** 5.25588;
  return p / (287.05 * (273.15 + temperaturaC));
}

// Força para abrir a porta: F = Fdc + W·A·ΔP / (2·(W − d))
function forcaPorta({ largura, altura, dp, fechador = T.FORCA.fechador_n, d = T.FORCA.distancia_macaneta_m }) {
  return fechador + (largura * largura * altura * dp) / (2 * (largura - d));
}

// Fator de atrito de Altshul-Tsal (ASHRAE Fundamentals, cap. 21)
function fatorAtrito(dh, v, eps) {
  const re = 66400 * dh * v;
  const f1 = 0.11 * (eps / dh + 68 / re) ** 0.25;
  return { re, f: f1 >= 0.018 ? f1 : 0.85 * f1 + 0.0028 };
}

// Perda por atrito (Pa) em duto retangular a × b, vazão Q, comprimento L
function perdaAtrito({ vazao, largura, altura, comprimento, eps, rho = T.DENSIDADE_PADRAO }) {
  const area = largura * altura;
  const v = vazao / area;
  const dh = (2 * largura * altura) / (largura + altura);
  const { re, f } = fatorAtrito(dh, v, eps);
  const pv = (rho * v * v) / 2;
  const porMetro = (f / dh) * pv;
  return { area, v, dh, re, f, pv, porMetro, total: porMetro * comprimento };
}

function motorComercial(kwMin) {
  return T.MOTORES_CV.find(cv => cv * CV_KW >= kwMin - 1e-9) || null;
}

// Grelhas: no máximo 2 pavimentos entre grelhas, uma no térreo e uma no último (NT 13 GO 5.3.7)
function numeroGrelhas(pavimentos) {
  if (pavimentos <= 1) return 1;
  return Math.ceil((pavimentos - 1) / T.MAX_PAVIMENTOS_ENTRE_GRELHAS) + 1;
}

// ── Entradas ───────────────────────────────────────────────────────────────

function config(dados) {
  const ed = dados.edificacao || {};
  const s = dados.sistema || {};
  const al = dados.alimentacao || {};
  const grupo = T.OCUPACOES[ed.ocupacao] ? ed.ocupacao : 'A';
  const pavimentos = Math.max(1, Math.round(numero(ed.pavimentos) || 1));
  const altura = numero(ed.altura_m) || pavimentos * 3;
  const tipoDuto = T.FATOR_DUTO[s.tipo_duto] != null ? s.tipo_duto : 'metalico';
  const partida = T.PARTIDAS[s.partida] ? s.partida : 'inversor';
  return {
    grupo, pavimentos, altura,
    localReuniao: sim(ed.local_reuniao_publico),
    doisEstagios: ed.sistema === '2_estagios' || s.estagios === '2_estagios',
    jurisdicao: ed.jurisdicao === 'outra' ? 'outra' : 'DF',
    altitude: numero(ed.altitude_m) ?? 1100,
    temperatura: numero(ed.temperatura_c) ?? 30,
    dp: numero(s.pressao_projeto_pa) || T.PRESSAO.projeto_pa,
    dpMax: numero(s.pressao_max_pa) || T.PRESSAO.maxima_pa,
    vPorta: numero(s.velocidade_porta_ms) || T.VELOCIDADE.porta_aberta_ms,
    tipoDuto,
    vDuto: numero(s.velocidade_duto_ms) || T.VELOCIDADE_PROJETO[tipoDuto === 'metalico' ? 'metalico' : 'alvenaria'],
    vLimiteDuto: tipoDuto === 'metalico' ? T.VELOCIDADE.distribuicao_metalico_max_ms : T.VELOCIDADE.distribuicao_alvenaria_max_ms,
    larguraDuto: numero(s.largura_duto_m),
    alturaDuto: numero(s.altura_duto_m),
    comprimentoDuto: numero(s.comprimento_duto_m),
    curvas: numero(s.curvas) ?? 4,
    perdaTomada: numero(s.perda_tomada_ar_pa) ?? T.PERDAS_PADRAO.tomada_ar_pa,
    perdaGrelha: numero(s.perda_grelha_pa) ?? T.PERDAS_PADRAO.grelha_pa,
    perdaRegistro: numero(s.perda_registro_pa) ?? T.PERDAS_PADRAO.registro_pa,
    rendimento: numero(s.rendimento_ventilador) || T.RENDIMENTO_VENTILADOR,
    arranjo: T.ARRANJOS[s.arranjo] ? s.arranjo : 'auto',
    partida,
    alivio: T.ALIVIOS[s.alivio] ? s.alivio : (partida === 'inversor' ? 'inversor_e_gravidade' : 'damper_motorizado'),
    sensores: T.SENSORES[s.sensores] ? s.sensores : 'meio',
    tomadaAr: s.tomada_ar === 'cobertura' ? 'cobertura' : 'terreo',
    deteccaoExistente: s.deteccao_existente !== false,
    acionadoresRemotos: numero(s.acionadores_remotos) ?? 2,
    portasAbertasForcado: numero((dados.escada || {}).portas_abertas),
    limiteForca: numero(s.limite_forca_n) || T.FORCA.limite_n,
    fechador: numero(s.forca_fechador_n) ?? T.FORCA.fechador_n,
    tempoPartidaMax: numero(s.tempo_partida_max_s) || T.TEMPO_PARTIDA_MAX_S,
    tempoReversao: numero(s.tempo_reversao_s) || T.TEMPO_REVERSAO_S,
    eletrica: {
      vff: numero(al.tensao_ff) || 380, vfn: numero(al.tensao_fn) || 220, comprimento: numero(al.comprimento_m) || 30,
      metodo: al.metodo || 'B1', isolacao: al.isolacao === 'PVC' ? 'PVC' : 'EPR', temperatura: numero(al.temperatura) ?? 30,
      fonte: ['gerador', 'antes_chave_geral'].includes(al.fonte) ? al.fonte : 'auto',
    },
  };
}

// Portas: cada linha do formulário vira unidades individuais com fresta e vão
function lerPortas(escada, antecamara) {
  const unidades = [];
  (escada.portas || []).forEach((p, i) => {
    const tipo = T.PORTAS[p.tipo] ? p.tipo : 'simples';
    const sentido = p.sentido === 'saida' ? 'saida' : 'acesso';
    const base = T.PORTAS[tipo];
    const qtd = Math.max(0, Math.round(numero(p.quantidade) ?? 1));
    const largura = numero(p.largura_m) || 0.89;
    const altura = numero(p.altura_m) || 2.1;
    const fresta = numero(p.fresta_m2) || base.fechada[sentido];
    // vão de luz: informado, senão o da Tabela A2 (2,10 × 0,89 → 1,64 m² por folha)
    const vao = numero(p.vao_m2) || base.aberta_m2;
    // antecâmara não pressurizada: a porta da escada e a da antecâmara ficam em série
    const comAnte = antecamara && sentido === 'acesso';
    const frestaEfetiva = comAnte ? areaSerie([fresta, numero(p.fresta_antecamara_m2) || fresta]) : fresta;
    for (let k = 0; k < qtd; k++) {
      unidades.push({ linha: i, descricao: p.descricao || `Porta ${i + 1}`, tipo, sentido, folhas: base.folhas, largura, altura, fresta, frestaEfetiva, vao, comAnte });
    }
  });
  return unidades;
}

// Tabela B1 + 5.1.6.4 f + escolha das PCF abertas (5.1.6.4 g: duplas primeiro; a de saída entra)
function escolherAbertas(unidades, npa) {
  const ordem = [...unidades.keys()].sort((a, b) => {
    const ua = unidades[a];
    const ub = unidades[b];
    if (ua.folhas !== ub.folhas) return ub.folhas - ua.folhas;
    if (ua.sentido !== ub.sentido) return ua.sentido === 'saida' ? -1 : 1;
    return a - b;
  });
  return new Set(ordem.slice(0, Math.min(npa, unidades.length)));
}

// ── Vazões ─────────────────────────────────────────────────────────────────

function calcularVazoes(dados, c, avisos) {
  const esc = dados.escada || {};
  const antecamara = sim(esc.antecamara);
  const portas = lerPortas(esc, antecamara);
  if (!portas.length) throw new Error('Informe as portas corta-fogo da escada (quantidade, tipo e sentido).');
  const elevadores = (esc.elevadores || []).map(e => ({ descricao: e.descricao || 'Porta de elevador', qtd: Math.max(0, Math.round(numero(e.quantidade) ?? 1)), fresta: numero(e.fresta_m2) || T.FRESTA_ELEVADOR_M2 }));
  const janelas = (esc.janelas || []).map(j => ({
    descricao: j.descricao || 'Janela', qtd: Math.max(0, Math.round(numero(j.quantidade) ?? 1)), fresta: numero(j.fresta_m2) || 0,
    permanente: sim(j.permanente), areaAberta: numero(j.area_aberta_m2) || 0,
  }));

  // nº de PCF abertas (Tabela B1) + 1 por local de reunião em escritório até 21 m (5.1.6.4 f)
  const npaTabela = T.portasAbertasTabelaB1(c.grupo, c.altura);
  const reuniao = c.localReuniao && c.grupo === 'D' && c.altura <= 21 ? 1 : 0;
  const npa = c.portasAbertasForcado != null ? c.portasAbertasForcado : npaTabela + reuniao;

  // áreas com tudo fechado
  const aPortas = portas.reduce((s, p) => s + p.frestaEfetiva, 0);
  const aElev = elevadores.reduce((s, e) => s + e.qtd * e.fresta, 0);
  const aJan = janelas.filter(j => !j.permanente).reduce((s, j) => s + j.qtd * j.fresta, 0);
  const aPerm = janelas.filter(j => j.permanente).reduce((s, j) => s + j.qtd * j.areaAberta, 0);
  const qPerm = aPerm * T.VELOCIDADE.abertura_permanente_ms;
  const qFechadas = (dp) => vazaoFresta(aPortas + aElev, dp, T.N_PORTA) + vazaoFresta(aJan, dp, T.N_JANELA) + qPerm;
  const aN2 = aPortas + aElev;
  const qft = qFechadas(c.dp);

  // portas abertas
  const abertas = escolherAbertas(portas, npa);
  const aVao = portas.filter((p, i) => abertas.has(i)).reduce((s, p) => s + p.vao, 0);
  const aFrestasFechadas = portas.filter((p, i) => !abertas.has(i)).reduce((s, p) => s + p.frestaEfetiva, 0);
  const apa = aVao + aFrestasFechadas + aElev + aJan;
  const vpa = qft / apa;
  const qat = apa * c.vPorta + qPerm;
  const qt = Math.max(qft, qat);
  const fatorDuto = T.FATOR_DUTO[c.tipoDuto];
  const fatorTotal = 1 + fatorDuto + T.FATOR_NAO_IDENTIFICADO;
  const qts = qt * fatorTotal;

  // alívio (Anexo F, parte V)
  const qftd = qFechadas(c.dpMax);
  const qd = Math.max(0, qts - qftd);
  const areaDamper = qd > 0 ? qd / (T.COEF_VAZAO * Math.sqrt(c.dpMax)) : 0;
  const q1Estagio = c.doisEstagios ? qFechadas(T.PRESSAO.primeiro_estagio_pa) * fatorTotal : null;

  // força de abertura nas PCF de acesso (a porta abre contra a pressão da escada)
  const tiposAcesso = [...new Map(portas.filter(p => p.sentido === 'acesso').map(p => [`${p.tipo}-${p.largura}-${p.altura}`, p])).values()];
  const forcas = tiposAcesso.map(p => {
    const f50 = forcaPorta({ largura: p.largura, altura: p.altura, dp: c.dp, fechador: c.fechador });
    const f60 = forcaPorta({ largura: p.largura, altura: p.altura, dp: c.dpMax, fechador: c.fechador });
    return { descricao: `${T.PORTAS[p.tipo].rotulo.split(' (')[0]} ${fmt(p.largura)} × ${fmt(p.altura)} m (por folha)`, largura: p.largura, altura: p.altura, f50, f60, limite: c.limiteForca, atende: f60 <= c.limiteForca };
  });

  if (npa > portas.length) avisos.push(`A Tabela B1 pede ${npa} PCF abertas e a escada só tem ${portas.length} portas informadas. [CONFERIR]`);
  if (reuniao) avisos.push('Escritório até 21 m com local de reunião de público (≥ 50 pessoas) fora do piso de descarga: +1 PCF aberta no cálculo (NT 13 GO 5.1.6.4 f).');
  if (antecamara) avisos.push('Antecâmara não pressurizada: fresta da PCF da escada em série com a da antecâmara (Equação 3). Com antecâmara pressurizada por sistema independente, calcular cada espaço à parte (escada 50 Pa, antecâmara 45 Pa — NT 13 GO 5.1.6.7). [CONFERIR arranjo]');
  if (c.altura > T.ANTECAMARA_OBRIGATORIA_M && !antecamara) avisos.push(`Altura ${fmt(c.altura, 1)} m > ${T.ANTECAMARA_OBRIGATORIA_M} m: a NT 13 GO (5.1.6.7) exige antecâmara de segurança, além da escada pressurizada. [CONFERIR exigência do CBMDF]`);
  if (aPerm > 0) avisos.push(`Abertura permanente na caixa da escada (${fmt(aPerm)} m²): +${fmt(qPerm)} m³/s para 4 m/s médios na abertura (NT 13 GO 5.1.6.4 b).`);
  if (janelas.some(j => !j.permanente && !j.fresta)) avisos.push('Janela na escada sem área de fresta informada: não entrou no cálculo. Informe a fresta (m²) pelo fabricante. [CONFERIR]');
  forcas.filter(f => !f.atende).forEach(f => avisos.push(`Força de abertura da ${f.descricao} a ${fmt(c.dpMax, 0)} Pa: ${fmt(f.f60, 0)} N > ${fmt(f.limite, 0)} N. Reduzir a força do fechador, rever a pressão máxima do alívio ou a largura da folha. [CONFERIR limite na NBR 14880]`));

  return {
    portas, elevadores, janelas, antecamara, npa, npaTabela, reuniao, abertas: [...abertas],
    areas: { portas: aPortas, elevadores: aElev, janelas: aJan, permanentes: aPerm, n2: aN2, total: aPortas + aElev + aJan },
    qft, apa, aVao, aFrestasFechadas, vpa, qat, qt, qPerm, fatorDuto, fatorTotal, qts, qftd, qd, areaDamper, q1Estagio,
    criterio: qat > qft ? 'portas abertas (velocidade mínima de 1 m/s)' : 'portas fechadas (ΔP de projeto)',
    forcas,
  };
}

// ── Distribuição de ar e ventilador ────────────────────────────────────────

function distribuicao(v, c, avisos) {
  const q = v.qts;
  let largura = c.larguraDuto;
  let altura = c.alturaDuto;
  if (!(largura > 0 && altura > 0)) {
    const lado = Math.ceil(Math.sqrt(q / c.vDuto) / 0.05) * 0.05;
    largura = lado;
    altura = lado;
  }
  const comprimento = c.comprimentoDuto || c.altura + 10;
  const eps = T.RUGOSIDADE_M[c.tipoDuto];
  const at = perdaAtrito({ vazao: q, largura, altura, comprimento, eps });
  const perdaCurvas = c.curvas * T.PERDAS_PADRAO.k_curva * at.pv;
  const nGrelhas = numeroGrelhas(c.pavimentos);
  const qGrelha = q / nGrelhas;
  const areaGrelha = qGrelha / T.VELOCIDADE_PROJETO.grelha_face;
  const areaTomada = q / T.VELOCIDADE_PROJETO.captacao;
  const vTomadaLimite = q / T.VELOCIDADE.captacao_max_ms;
  const linhas = [
    ['Pressão na escada contra a qual o ventilador trabalha (máxima)', c.dpMax, 'limite de 60 Pa com as PCF fechadas'],
    [`Atrito no duto ${fmt(largura)} × ${fmt(altura)} m, ${fmt(comprimento, 0)} m (Darcy/Altshul-Tsal, ${T.ROTULO_DUTO[c.tipoDuto]})`, at.total, `${fmt(at.porMetro, 2)} Pa/m; V = ${fmt(at.v, 2)} m/s; f = ${fmt(at.f, 4)}`],
    [`${c.curvas} curva(s) de raio longo (K = ${fmt(T.PERDAS_PADRAO.k_curva)} × Pd)`, perdaCurvas, `Pd = ρV²/2 = ${fmt(at.pv, 1)} Pa`],
    ['Tomada de ar: veneziana + filtro metálico lavável (sujo)', c.perdaTomada, 'NBR 16401-3 [CONFERIR fabricante]'],
    ['Grelha de insuflação com registro (mais desfavorável)', c.perdaGrelha, '[CONFERIR fabricante]'],
    ['Registro de regulagem / retenção na descarga', c.perdaRegistro, '[CONFERIR fabricante]'],
  ];
  const subtotal = linhas.reduce((s, l) => s + l[1], 0);
  const efeito = subtotal * T.PERDAS_PADRAO.efeito_sistema;
  const pressao = subtotal + efeito;
  if (at.v > c.vLimiteDuto + 1e-9) avisos.push(`Velocidade no duto ${fmt(at.v, 1)} m/s acima do limite de ${c.vLimiteDuto} m/s para duto ${T.ROTULO_DUTO[c.tipoDuto]} (NT 13 GO 5.1.5.3 c): aumentar a seção.`);
  if (!c.comprimentoDuto) avisos.push(`Comprimento do duto não informado: adotada a altura + 10 m (${fmt(comprimento, 0)} m). [CONFERIR traçado]`);
  if (largura / altura > 4 || altura / largura > 4) avisos.push('Duto retangular com proporção acima de 1:4 — rever as dimensões.');
  if (c.tipoDuto !== 'metalico' && largura * altura < 0.5) avisos.push('Duto de alvenaria com seção menor que 0,5 m² deve ser evitado (NT 13 GO 5.3.6 d).');
  return {
    largura, altura, comprimento, area: at.area, v: at.v, dh: at.dh, re: at.re, f: at.f, pv: at.pv, porMetro: at.porMetro, atrito: at.total,
    perdaCurvas, linhas, subtotal, efeito, pressao, nGrelhas, qGrelha, areaGrelha, areaTomada, areaTomadaMin: vTomadaLimite,
  };
}

function arranjoVentiladores(c, avisos) {
  const lim = T.DF.ventilador_unico_ate_m[c.grupo];
  const podeUnico = c.jurisdicao === 'DF' && lim != null && c.altura <= lim;
  let arranjo = c.arranjo;
  if (arranjo === 'auto') {
    arranjo = podeUnico ? 'unico' : 'reserva_100';
    if (podeUnico) avisos.push(`CBMDF NT 10 (4.3.1.10.3 c) admite 1 só ventilador para ${T.OCUPACOES[c.grupo]} até ${lim} m; a H&M recomenda ventilador reserva com reversão automática.`);
  } else if (arranjo === 'unico' && !podeUnico) {
    avisos.push(`Ventilador único não é admitido para ${T.OCUPACOES[c.grupo]} com ${fmt(c.altura, 1)} m (${c.jurisdicao === 'DF' ? 'CBMDF NT 10, 4.3.1.10.3 c' : 'NT 13 GO 5.3.2 b — duplicata sempre'}): adotados 2 ventiladores de 100 %.`);
    arranjo = 'reserva_100';
  }
  const n = arranjo === 'unico' ? 1 : 2;
  return { arranjo, n, fracao: arranjo === 'paralelo_50' ? 0.5 : 1, podeUnico };
}

function ventilador(v, d, c, arr, avisos) {
  const qVent = v.qts * arr.fracao;
  const pAr = qVent * d.pressao; // W
  const pEixo = pAr / c.rendimento;
  const kwMin = (pEixo * T.FOLGA_MOTOR) / 1000;
  const cv = motorComercial(kwMin);
  if (!cv) throw new Error(`Potência de ${fmt(kwMin, 1)} kW acima da tabela de motores: dividir o sistema.`);
  const kw = cv * CV_KW;
  const { eta, fp } = T.rendimentoFpMotor(cv);
  const inMotor = EI.correnteNominalMotor(kw, c.eletrica.vff, eta, fp);
  if (c.partida !== 'inversor' && ['inversor', 'inversor_e_gravidade'].includes(c.alivio)) {
    avisos.push('Alívio pelo inversor exige partida por inversor: adotado damper de alívio motorizado. [CONFERIR]');
    c.alivio = 'damper_motorizado';
  }
  return {
    qVent, qVentM3h: qVent * 3600, pressao: d.pressao, pAr, pEixo, kwMin, cv, kw, eta, fp, in: inMotor,
    velocidadeMin: c.partida === 'inversor' ? Math.min(1, v.qftd / v.qts) : null,
  };
}

// ── Alimentação elétrica (NBR 5410, motor da skill de elétrica) ────────────

function alimentacao(vent, arr, c, avisos) {
  const el = c.eletrica;
  const ec = E.config({ instalacao: { tensao_fn: el.vfn, tensao_ff: el.vff, sistema: 'trifasico', isolacao: el.isolacao, metodo: el.metodo, temperatura: el.temperatura, agrupamento: 1, comprimento_medio_circuito_m: el.comprimento } });
  const ib = 1.25 * vent.in; // NBR 5410, 6.5.1 — circuito de motor: Ib ≥ 1,25 × In
  const circuitos = [];
  for (let i = 1; i <= arr.n; i++) {
    const d = E.dimensionarCircuito({ id: `V${i}`, descricao: `Ventilador V${i} ${fmt(vent.cv)} cv`, tipo: 'tue', ligacao: 'FFF', potencia_va: RAIZ3 * el.vff * ib, comprimento_m: el.comprimento, agrupamento: arr.n > 1 ? 2 : 1, metodo: el.metodo },
      ec, { minimo: ET.SECAO_MINIMA.tue, limiteQueda: ec.quedaTerminal });
    d.avisos.forEach(a => avisos.push(a));
    circuitos.push(d);
  }
  const u = { in: vent.in, ipIn: 7, partida: c.partida, limitePartida: c.partida === 'soft_starter' ? 3 : 1.5, protecao: 'auto', tensao: el.vff, placa: [], regime: 'S1', pKw: vent.kw, tensaoPlaca: '', fs: 1 };
  const partida = EI.dispositivosPartida(u);
  // fonte: gerador 4 h (CBMDF 4.3.1.10.2 o) salvo as isenções (p); fora do DF a NT 13 GO exige gerador sempre (5.3.8 b)
  const lim = T.DF.isencao_gerador_m[c.grupo];
  const isento = c.jurisdicao === 'DF' && lim != null && c.altura <= lim;
  const fonte = el.fonte === 'auto' ? (isento ? 'antes_chave_geral' : 'gerador') : el.fonte;
  if (fonte === 'antes_chave_geral' && !isento) avisos.push(`Sem grupo motogerador: só admitido para residencial ≤ 60 m, serviço profissional ≤ 21 m e escolar ≤ 30 m (CBMDF NT 10, 4.3.1.10.2 p). Esta edificação exige gerador com ${T.DF.gerador_autonomia_h} h de autonomia.`);
  return {
    ib, circuitos, partida, fonte, isentoGerador: isento,
    fonteTexto: fonte === 'gerador'
      ? `Grupo motogerador automatizado com autonomia mínima de ${T.DF.gerador_autonomia_h} h (CBMDF NT 10, 4.3.1.10.2 o), em compartimento próprio com TRRF 2 h e PCF P-90, separado da casa do ventilador`
      : 'Circuito ligado antes da chave geral da edificação, para não ser desligado com ela (CBMDF NT 10, 4.3.1.10.2 q)',
  };
}

// ── Automação: pontos de E/S, lógica, intertravamentos ─────────────────────

function automacao(c, arr, v, d, al) {
  const pontos = [];
  const add = (tag, tipo, descricao, origem) => pontos.push({ tag, tipo, descricao, origem });
  const inv = c.partida === 'inversor';
  const nSens = c.sensores === 'meio' ? 1 : c.sensores === 'topo_base' ? 2 : c.pavimentos;
  const motorizado = c.alivio === 'damper_motorizado';
  add('ED-01', 'ED', 'Alarme de incêndio — contato do módulo de comando da central (NBR 17240)', 'central de detecção e alarme');
  add('ED-02', 'ED', 'Chave seletora em AUTOMÁTICO', 'painel');
  add('ED-03', 'ED', 'Chave seletora em MANUAL', 'painel');
  add('ED-04', 'ED', 'Chave de TESTE (com chave) — operação semanal sem acionar o alarme', 'painel');
  add('ED-05', 'ED', 'Botoeira LIGA local', 'painel');
  add('ED-06', 'ED', 'Botoeira DESLIGA local (única parada em emergência)', 'painel');
  add('ED-07', 'ED', `Acionador manual remoto LIGA (${c.acionadoresRemotos} pontos: portaria/sala de controle)`, 'campo');
  add('ED-08', 'ED', 'Detector de fumaça da casa de máquinas (laço exclusivo) — inibe a partida automática', 'central (módulo de entrada) ou detector convencional');
  if (motorizado) {
    add('ED-09', 'ED', 'Damper de alívio — fim de curso ABERTO', 'campo');
    add('ED-10', 'ED', 'Damper de alívio — fim de curso FECHADO', 'campo');
  }
  if (al.fonte === 'gerador') add(`ED-${String(pontos.length + 1).padStart(2, '0')}`, 'ED', 'Alimentação pelo gerador (contato do QTA)', 'QTA');
  for (let i = 1; i <= arr.n; i++) {
    const n0 = pontos.length + 1;
    add(`ED-${String(n0).padStart(2, '0')}`, 'ED', `V${i}: pressostato diferencial de fluxo (prova de ar)`, 'duto/ventilador');
    add(`ED-${String(n0 + 1).padStart(2, '0')}`, 'ED', `V${i}: ${inv ? 'inversor' : 'soft-starter/partida'} em operação`, 'painel');
    add(`ED-${String(n0 + 2).padStart(2, '0')}`, 'ED', `V${i}: falha do ${inv ? 'inversor' : 'acionamento'} / disjuntor-motor desarmado`, 'painel');
  }
  for (let s = 1; s <= nSens; s++) add(`EA-${String(s).padStart(2, '0')}`, 'EA', `Transmissor de pressão diferencial ${nSens > 1 ? `${s} ` : ''}(escada × pavimento), 0–100 Pa, 4–20 mA`, 'escada');
  let nsd = 0;
  const sd = (descricao, origem = 'painel') => add(`SD-${String(++nsd).padStart(2, '0')}`, 'SD', descricao, origem);
  for (let i = 1; i <= arr.n; i++) sd(`V${i}: comando de partida (${inv ? 'habilita o inversor' : 'contator/soft-starter'})`);
  if (motorizado) sd('Damper de alívio motorizado: abrir (modulação por ΔP)', 'campo');
  sd('Retorno à central: SISTEMA EM OPERAÇÃO (módulo de entrada)', 'central');
  sd('Retorno à central: FALHA DA PRESSURIZAÇÃO (módulo de entrada)', 'central');
  sd('Sinaleiro EMERGÊNCIA ACIONADA (painel e acionadores remotos)');
  for (let i = 1; i <= arr.n; i++) { sd(`Sinaleiro V${i} EM OPERAÇÃO`); sd(`Sinaleiro V${i} FALHA`); }
  sd('Sinaleiro PRESSÃO FORA DA FAIXA (< 45 Pa ou > 60 Pa)');
  if (inv) for (let i = 1; i <= arr.n; i++) add(`SA-${String(i).padStart(2, '0')}`, 'SA', `V${i}: referência de velocidade do inversor (PID de ΔP), 0–10 V / 4–20 mA`, 'painel');
  const conta = (t) => pontos.filter(p => p.tipo === t).length;
  const totais = { ED: conta('ED'), SD: conta('SD'), EA: conta('EA'), SA: conta('SA') };
  const comReserva = Object.fromEntries(Object.entries(totais).map(([k, n]) => [k, Math.ceil(n * 1.2)]));

  const reserva = arr.n > 1 && arr.arranjo === 'reserva_100';
  const logica = [
    `Partida automática: o sinal de alarme da central (detector de fumaça ou acionador manual — NBR 17240) liga a pressurização na hora, sem esperar o alarme sonoro nem o reconhecimento na central (NT 13 GO 5.3.10 k; CBMDF NT 10, 4.3.1.10.5). Qualquer alarme ou defeito da central vale como alarme e não desliga o sistema.`,
    `Partida manual: botoeira LIGA no painel e acionadores remotos na portaria/sala de controle (CBMDF 4.3.1.10.5 f). A PARADA em emergência só pela botoeira DESLIGA do painel do ventilador (CBMDF 4.3.1.10.5 g); a central não desliga a pressurização.`,
    inv
      ? `Controle de pressão: PID no inversor (ou no controlador) com o transmissor de ΔP — setpoint ${fmt(c.dp, 0)} Pa, limite ${fmt(c.dpMax, 0)} Pa; com todas as PCF fechadas o inversor reduz a vazão até ~${fmt((v.qftd / v.qts) * 100, 0)} % (QFT a 60 Pa / QTS); com portas abertas acelera até 100 %. Rampa de aceleração ≤ 10 s.`
      : `Vazão fixa (${T.PARTIDAS_CURTO[c.partida]}): a sobrepressão acima de ${fmt(c.dpMax, 0)} Pa é aliviada pelo ${c.alivio === 'damper_motorizado' ? 'damper motorizado modulado pelo transmissor de ΔP' : 'registro de sobrepressão por gravidade'} (QD = ${fmt(v.qd, 2)} m³/s).`,
    `Tempo: pressão de projeto atingida em até ${fmt(c.tempoPartidaMax, 0)} s após o alarme [CONFERIR]; PCF com destravador eletromagnético fecham em até ${T.TEMPO_FECHAMENTO_PCF_S} s (NT 13 GO 5.3.10 q).`,
    ...(reserva ? [`Reversão automática: se o pressostato de fluxo de V1 não confirmar em ${fmt(c.tempoReversao, 0)} s (ou houver falha do acionamento), V1 é desligado e V2 parte (N+1 com reversão automática — NT 13 GO 5.3.2 d e 5.3.9 d). Alternância semanal do ventilador líder para igualar o desgaste.`] : []),
    ...(arr.arranjo === 'paralelo_50' ? ['Dois ventiladores de 50 % em paralelo partem juntos; registros de retenção impedem o refluxo pelo ventilador parado (CBMDF 4.3.1.10.3 d). Falha de um: alarme de falha, o outro continua.'] : []),
    'Detector de fumaça da casa de máquinas (laço exclusivo): inibe a partida AUTOMÁTICA para não insuflar fumaça na escada, mantendo o alarme da central; a partida manual continua possível (NT 13 GO 5.3.10 l e n).',
    'Modo TESTE (chave com segredo): roda os ventiladores para o teste semanal (NT 13 GO 5.3.12 b) sem acionar a central; e a central pode ser testada sem partir a pressurização (5.3.10 f).',
    'Supervisão: falha de acionamento, disjuntor desarmado, ausência de fluxo, ΔP fora da faixa e falta de tensão viram alarme de FALHA no painel e na central (módulo de entrada) e, se houver, no supervisório (BACnet/Modbus).',
    `Ar-condicionado e ventilação: a central desliga os sistemas de circulação de ar na emergência (NT 13 GO 5.2.3 b e d) — comando da central, não do painel da pressurização.`,
  ];
  const intertravamentos = [
    ...(reserva ? ['V1 e V2 nunca operam juntos (intertravamento elétrico por contatos auxiliares e na lógica).'] : []),
    'Seletora em 0 (desligado) só com a chave do responsável e sinalização de "SISTEMA DESLIGADO" na central (falha).',
    'Partida automática inibida com fumaça na casa de máquinas; manual liberada.',
    ...(motorizado ? ['Damper motorizado com posição de falha definida em projeto (normalmente aberto ao perder alimentação, para não sobrepressurizar). [CONFERIR]'] : []),
    'Retorno de falha de todos os acionamentos em série com o alarme de FALHA (contato NF — fio partido também alarma).',
  ];
  return { pontos, totais, comReserva, nSensores: nSens, logica, intertravamentos, motorizado, inversor: inv };
}

// Sequência do diagrama de comando (base para desenho; QElectroTech não obrigatório)
function diagramaComando(c, arr, al, aut) {
  const el = [];
  const add = (id, rotulo, ligacao) => el.push({ ordem: el.length + 1, id, rotulo, ligacao });
  add('FONTE', al.fonte === 'gerador' ? 'QGBT de emergência (gerador / QTA)' : 'QGBT — derivação antes da chave geral', 'força');
  for (let i = 1; i <= arr.n; i++) {
    const p = al.partida.dispositivos;
    add(`Q${i}`, `${p[0].especificacao}`, 'força');
    add(`K${i}`, `Contator de isolamento ${p[1]?.nominal_a || ''} A AC-3`, 'força');
    add(`T${i}`, c.partida === 'inversor' ? 'Inversor de frequência' : c.partida === 'soft_starter' ? 'Soft-starter' : 'Partida', 'força');
    add(`M${i}`, `Motor do ventilador V${i}`, 'força');
  }
  add('CLP', `Controlador programável (ED ${aut.comReserva.ED} / SD ${aut.comReserva.SD} / EA ${aut.comReserva.EA} / SA ${aut.comReserva.SA} com 20 % de reserva)`, 'comando');
  add('PT', `Transmissor(es) de ΔP (${aut.nSensores})`, 'comando');
  add('DPS', `Pressostatos de fluxo (${arr.n})`, 'comando');
  add('CENTRAL', 'Central de alarme (módulo de comando → ED-01; módulos de entrada ← operação/falha)', 'comando');
  add('REM', `Acionadores remotos LIGA (${c.acionadoresRemotos})`, 'comando');
  return el;
}

// ── Materiais ──────────────────────────────────────────────────────────────

function listaMateriais(x) {
  const { c, v, d, vent, arr, al, aut } = x;
  const itens = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => { if (quantidade > 0) itens.push({ codigo, descricao, unidade, quantidade: arred(quantidade, 2), referencia }); };
  const qtxt = `${fmt(vent.qVentM3h, 0)} m³/h a ${fmt(vent.pressao, 0)} Pa estáticos`;
  add('VENT', `Ventilador de pressurização ${qtxt}, motor ${fmt(vent.cv)} cv ${c.eletrica.vff} V IP55, base antivibratória e junta flexível [CONFERIR seleção no catálogo]`, 'un', arr.n, 'NT 13 GO 5.3.2; CBMDF NT 10 4.3.1.10.3');
  if (arr.n > 1) add('REG-RET', 'Registro de retenção (antirretorno) na descarga de cada ventilador', 'un', arr.n, 'CBMDF NT 10 4.3.1.10.3 d');
  if (c.tipoDuto === 'metalico') {
    const m2 = 2 * (d.largura + d.altura) * d.comprimento * 1.1;
    add('DUTO', `Duto de chapa de aço galvanizado ${fmt(d.largura)} × ${fmt(d.altura)} m, costuras seladas (SMACNA), com suportes — ${fmt(d.comprimento, 0)} m`, 'm²', Math.ceil(m2), 'NT 13 GO 5.3.6 b');
  } else {
    add('DUTO', `Duto de alvenaria rebocada internamente ${fmt(d.largura)} × ${fmt(d.altura)} m — ${fmt(d.comprimento, 0)} m (obra civil) [CONFERIR]`, 'vb', 1, 'NT 13 GO 5.3.6 d');
  }
  add('GRELHA', `Grelha de insuflação com registro de regulagem, área livre ≥ ${fmt(d.areaGrelha, 3)} m² (${fmt(d.qGrelha * 3600, 0)} m³/h cada)`, 'un', d.nGrelhas, 'NT 13 GO 5.3.7');
  add('TOMADA', `Veneziana de tomada de ar com tela e filtro metálico lavável, área livre ≥ ${fmt(d.areaTomada, 2)} m² (≤ 6 m/s)`, 'un', c.tomadaAr === 'cobertura' ? 2 : 1, 'NT 13 GO 5.3.3; NBR 16401-3');
  if (c.alivio !== 'inversor') add('DAMPER', `${c.alivio === 'damper_motorizado' ? 'Damper de alívio motorizado com atuador 24 V' : 'Registro de sobrepressão por gravidade/contrapeso'} — ${fmt(v.qd, 2)} m³/s a ${fmt(c.dpMax, 0)} Pa, área livre ≥ ${fmt(v.areaDamper, 3)} m²`, 'un', v.qd > 0 ? 1 : 0, 'NT 13 GO 5.3.9 a/b');
  // painel
  add('PAINEL', `Quadro de comando da pressurização (IP54) com barramento, borneiras, ventilação, porta com visor — ${arr.n} ventilador(es)`, 'un', 1, 'NBR IEC 61439');
  add('CLP', `Controlador programável com ${aut.comReserva.ED} ED, ${aut.comReserva.SD} SD, ${aut.comReserva.EA} EA, ${aut.comReserva.SA} SA (20 % de reserva) e comunicação BACnet/Modbus`, 'un', 1, 'Automação');
  const p = al.partida.dispositivos;
  const acion = p.find(x2 => ['inversor', 'soft_starter'].includes(x2.tipo));
  if (acion) add(c.partida === 'inversor' ? 'INV' : 'SOFT', acion.especificacao, 'un', arr.n, c.partida === 'inversor' ? 'IEC 61800' : 'NBR IEC 60947-4-2');
  const prot = p.find(x2 => ['disjuntor_motor', 'caixa_moldada', 'fusivel'].includes(x2.tipo));
  if (prot) add('PROT', prot.especificacao, prot.tipo === 'fusivel' ? 'cj' : 'un', arr.n, 'NBR 5410; IEC 60947');
  const k = p.find(x2 => x2.tipo === 'contator');
  if (k) add('K', `Contator tripolar ${k.nominal_a} A AC-3, bobina 24 Vcc`, 'un', p.filter(x2 => x2.tipo === 'contator').length * arr.n, 'NBR IEC 60947-4-1');
  const tempo = p.find(x2 => x2.tipo === 'temporizador');
  if (tempo) add('KT', tempo.especificacao, 'un', arr.n, 'NBR IEC 60947-5-1');
  add('SELETORA', 'Chave seletora 3 posições MANUAL–0–AUTOMÁTICO, 22 mm', 'un', 1, 'Painel');
  add('CH-TESTE', 'Chave de TESTE com segredo (2 posições), 22 mm', 'un', 1, 'NT 13 GO 5.3.12');
  add('BOT', 'Botoeira LIGA (verde) e DESLIGA (vermelha) 22 mm', 'cj', 1, 'CBMDF NT 10 4.3.1.10.5 g');
  add('SINAL', 'Sinaleiro LED 22 mm 24 Vcc', 'un', aut.pontos.filter(pt => /^Sinaleiro/.test(pt.descricao)).length, 'Painel');
  add('RELE', 'Relé de interface 24 Vcc 1 NA/NF com base', 'un', aut.totais.SD, 'Painel');
  add('FONTE24', 'Fonte 24 Vcc 5 A para comando e transmissores', 'un', 1, 'Painel');
  add('DPS-P', 'DPS classe II para o quadro de comando', 'un', 1, 'NBR 5410 6.3.5');
  // campo
  add('PT', 'Transmissor de pressão diferencial 0–100 Pa, saída 4–20 mA, com display, tomadas de pressão e mangueira', 'un', aut.nSensores, 'NT 13 GO 5.3.9 c');
  add('PDS', 'Pressostato diferencial de ar 20–300 Pa (prova de fluxo do ventilador)', 'un', arr.n, 'NT 13 GO 5.3.9 d');
  add('BOT-REM', 'Acionador remoto "LIGA PRESSURIZAÇÃO" com tampa de proteção, sinaleiro e placa', 'un', c.acionadoresRemotos, 'CBMDF NT 10 4.3.1.10.5 f');
  add('MOD-CMD', 'Módulo de comando endereçável (saída a relé) da central de alarme, compatível com a central existente', 'un', 1, 'NBR 17240');
  add('MOD-ENT', 'Módulo de entrada endereçável (monitoramento de operação e falha) da central de alarme', 'un', 2, 'NBR 17240');
  if (!c.deteccaoExistente) {
    // um detector por hall de acesso (cada PCF de acesso dá para um hall)
    const halls = x.v.portas.filter(pp => pp.sentido === 'acesso').length || c.pavimentos;
    add('DET', 'Detector óptico de fumaça endereçável com base (halls de acesso à escada, do lado de menor pressão)', 'un', halls, 'NT 13 GO 5.3.10 a/b; NBR 17240');
    add('DET-CM', 'Detector de fumaça da casa de máquinas (laço exclusivo)', 'un', 1 + (al.fonte === 'gerador' ? 1 : 0), 'NT 13 GO 5.3.10 l');
  }
  // cabos e infraestrutura
  const L = c.eletrica.comprimento * 1.1;
  al.circuitos.forEach((ci, i) => add(`CABO-F${i + 1}`, `Cabo multipolar 4 × ${String(ci.secao).replace('.', ',')} mm² (3F + PE) resistente ao fogo (integridade de circuito ≥ 2 h) — V${i + 1}`, 'm', Math.ceil(L), 'CBMDF NT 10 4.3.1.10.2 l [CONFERIR certificação]'));
  const lComando = Math.ceil((c.altura + 20) * (c.acionadoresRemotos + 1));
  add('CABO-C', 'Cabo de comando blindado 2 × 1,5 mm² resistente ao fogo (central e acionadores remotos)', 'm', lComando, 'NBR 17240; CBMDF 4.3.1.10.2 l');
  const lSinal = Math.ceil(aut.nSensores * (c.altura / 2 + 20) + arr.n * 15);
  add('CABO-S', 'Cabo de instrumentação blindado 2 × 0,75 mm² (transmissores e pressostatos)', 'm', lSinal, 'Automação');
  add('ELET', 'Eletroduto de aço galvanizado pesado 3/4"–1" com conexões e fixações (proteção mecânica e ao fogo)', 'm', Math.ceil((L * arr.n + lComando + lSinal) / 2), 'NBR 5410; NT 13 GO 5.3.8 f');
  const nAcesso = x.v.portas.filter(pp => pp.sentido === 'acesso').length;
  add('PLACA', 'Placa fotoluminescente "ESCADA PRESSURIZADA" para a face externa das PCF', 'un', nAcesso, 'NT 13 GO 5.2.1 i');
  return itens;
}

// ── Cálculo completo ───────────────────────────────────────────────────────

function calcular(dados) {
  const c = config(dados);
  const avisos = [];
  const v = calcularVazoes(dados, c, avisos);
  const d = distribuicao(v, c, avisos);
  const arr = arranjoVentiladores(c, avisos);
  const vent = ventilador(v, d, c, arr, avisos);
  const al = alimentacao(vent, arr, c, avisos);
  const aut = automacao(c, arr, v, d, al);
  const rho = densidadeLocal(c.altitude, c.temperatura);
  // ventilador existente (laudo)
  const ex = dados.existente || {};
  const existente = numero(ex.vazao_m3h) || numero(ex.pressao_pa) || numero(ex.potencia_cv) ? {
    vazao: numero(ex.vazao_m3h), pressao: numero(ex.pressao_pa), cv: numero(ex.potencia_cv), quantidade: numero(ex.quantidade) || 1,
    atendeVazao: numero(ex.vazao_m3h) == null ? null : numero(ex.vazao_m3h) >= vent.qVentM3h * 0.98,
    atendePressao: numero(ex.pressao_pa) == null ? null : numero(ex.pressao_pa) >= vent.pressao * 0.98,
    atendePotencia: numero(ex.potencia_cv) == null ? null : numero(ex.potencia_cv) >= vent.cv,
  } : null;
  if (existente) {
    if (existente.atendeVazao === false) avisos.push(`Ventilador existente (${fmt(existente.vazao, 0)} m³/h) abaixo da vazão requerida de ${fmt(vent.qVentM3h, 0)} m³/h.`);
    if (existente.atendePressao === false) avisos.push(`Pressão do ventilador existente (${fmt(existente.pressao, 0)} Pa) abaixo da estimada de ${fmt(vent.pressao, 0)} Pa. [CONFERIR curva do ventilador]`);
  }
  avisos.push(`Pressão estática do ventilador ESTIMADA (atrito pelo método de Altshul-Tsal e perdas localizadas típicas): conferir com o traçado real e as curvas dos fabricantes (NT 13 GO 5.1.5.3 b e 5.1.6.9). [CONFERIR]`);
  avisos.push(`Cálculo em ar padrão (1,204 kg/m³), como pede a NT. No local (${fmt(c.altitude, 0)} m, ${fmt(c.temperatura, 0)} °C) ρ ≈ ${fmt(rho, 3)} kg/m³: perdas e pressão do ventilador caem na mesma proporção; a vazão pelas frestas a 50 Pa sobe ~${fmt((Math.sqrt(T.DENSIDADE_PADRAO / rho) - 1) * 100, 0)} %. Ajustar no balanceamento.`);
  if (c.tomadaAr === 'cobertura') avisos.push('Tomada de ar na cobertura: no DF só para adequação de edificação existente, com aprovação do CBMDF, parede 1 m acima da tomada e afastada 5 m (ou 3 m com parede 2 m acima) — CBMDF NT 10, 4.3.1.10.2 f/g.');
  avisos.push('A NBR 14880:2014 não foi lida na íntegra (norma paga): os valores seguem a CBMGO NT 13/2025 (texto da IT 13 do CBPMESP) e a CBMDF NT 10/2015. [CONFERIR na NBR 14880]');
  const x = { c, v, d, arr, vent, al, aut, rho, existente };
  x.diagrama = diagramaComando(c, arr, al, aut);
  x.materiais = listaMateriais(x);
  x.avisos = avisos;
  return x;
}

module.exports = {
  calcular, config, vazaoFresta, areaSerie, densidadeLocal, forcaPorta, fatorAtrito, perdaAtrito, motorComercial, numeroGrelhas,
  lerPortas, escolherAbertas, calcularVazoes,
};
