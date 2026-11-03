// Motores elétricos e dispositivos de partida — motor COMUM (achado SK-08 da
// auditoria de 02/11/2026). Antes morava dentro da skill eletrica-industrial e
// era importado direto por quadros e pressurização; é também a base das bombas,
// ventiladores e chillers da climatização. Mesmo caso que levou a NBR 5410 para
// _comum/eletrico/calculo.js. A eletrica-industrial REEXPORTA daqui (calculo.js e
// tabelas.js), então quem importava de lá continua funcionando.
//
// Usado por: eletrica-industrial, quadros, pressurizacao e climatizacao — mudança
// aqui vale para todas (rode o npm test de skills; o teste da eletrica-industrial
// tem de continuar idêntico).
//
// Referências: ABNT NBR 5410:2004 (6.5.1 motores; 6.2.7 queda de tensão), ABNT NBR
// 17094-1 / IEC 60034-1 (dados de placa, fator de serviço, regimes), ABNT NBR IEC
// 60947-4-1 e 60947-4-2 (contatores, partidas, soft-starters — AC-3), IEC 61800
// (inversores). Faixas e correntes comerciais são as usuais de catálogo (WEG, Siemens,
// Schneider, ABB) — [CONFERIR] sempre com o catálogo do fabricante escolhido.

const E = require('./calculo');
const T = require('./tabelas');

const SQ3 = Math.sqrt(3);
const num = (v, padrao) => (v == null || v === '' || Number.isNaN(Number(v)) ? padrao : Number(v));
const arred = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;

// ── Tabelas (as mesmas que estavam em eletrica-industrial/scripts/lib/tabelas.js) ──

// 1 cv (cavalo-vapor métrico) = 735,5 W — NBR 17094-1 usa kW; cv mantido por uso corrente
const CV_KW = 0.7355;

// Tipos de partida e a norma de cada um
const PARTIDAS = {
  direta: { rotulo: 'Partida direta', norma: 'NBR IEC 60947-4-1 (AC-3)' },
  estrela_triangulo: { rotulo: 'Estrela-triângulo (Y-Δ)', norma: 'NBR IEC 60947-4-1 (AC-3)' },
  soft_starter: { rotulo: 'Soft-starter', norma: 'NBR IEC 60947-4-2' },
  inversor: { rotulo: 'Inversor de frequência', norma: 'IEC 61800-2 / IEC 61800-5-1' },
};
// Soft-starter: limitação de corrente típica 3 × In (ajuste 2 a 4 × In conforme o conjugado da carga) [CONFERIR]
const LIMITE_SOFT_PADRAO = 3.0;
// Inversor: corrente de aceleração limitada a ~1,5 × In (sobrecarga de 60 s) [CONFERIR]
const LIMITE_INVERSOR_PADRAO = 1.5;
// FP durante a partida (rotor bloqueado) — típico 0,3 a 0,4 [CONFERIR com o fabricante]
const FP_PARTIDA_PADRAO = 0.35;
// O inversor absorve da rede quase só potência ativa (retificador a diodos)
const FP_PARTIDA_INVERSOR = 0.95;

// Fator de utilização (carregamento médio do motor) por faixa de potência —
// valores típicos da literatura (Mamede Filho, Instalações Elétricas Industriais) [CONFERIR]
const FATOR_UTILIZACAO = [
  { ate_cv: 2.5, fator: 0.70 },
  { ate_cv: 15, fator: 0.83 },
  { ate_cv: 40, fator: 0.85 },
  { ate_cv: Infinity, fator: 0.87 },
];
function fatorUtilizacao(cv) {
  return FATOR_UTILIZACAO.find(f => cv <= f.ate_cv).fator;
}

// Contatores — corrente nominal de emprego AC-3 em 380/400 V (A) [CONFERIR em 440 V]
const CONTATORES_AC3 = [9, 12, 18, 25, 32, 40, 50, 65, 80, 95, 115, 150, 185, 225, 265, 330, 400, 500, 630, 800];

// Disjuntor-motor (IEC 60947-2 / 60947-4-1): faixas de ajuste térmico (A)
const DISJUNTOR_MOTOR = [
  [0.1, 0.16], [0.16, 0.25], [0.25, 0.4], [0.4, 0.63], [0.63, 1], [1, 1.6], [1.6, 2.5], [2.5, 4], [4, 6.3], [6, 10],
  [9, 14], [13, 18], [17, 23], [20, 25], [23, 28], [27, 32], [28, 40], [36, 45], [40, 50], [45, 63], [55, 75], [70, 90], [80, 100],
];
// Disparo magnético do disjuntor-motor ≈ 13 × limite superior da faixa [CONFERIR]
const MAGNETICO_DM = 13;

// Relé de sobrecarga (térmico/eletrônico) — faixas de ajuste (A)
const RELES = [
  [0.1, 0.16], [0.16, 0.25], [0.25, 0.4], [0.4, 0.63], [0.63, 1], [1, 1.6], [1.6, 2.5], [2.5, 4], [4, 6], [5.5, 8], [7, 10],
  [9, 13], [12, 18], [17, 25], [23, 32], [30, 40], [37, 50], [48, 65], [55, 70], [63, 80], [80, 104], [95, 120], [110, 150],
  [140, 200], [200, 320], [250, 400], [400, 630],
];

// Fusíveis NH/Diazed (A)
const FUSIVEIS = [2, 4, 6, 10, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160, 200, 224, 250, 315, 355, 400, 500, 630, 800];

// Disjuntores de caixa moldada / abertos (A) — proteção de motor grande, alimentadores e geral
const DISJUNTORES_GERAIS = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000];

// Cabo de cobre em serviço (queda de tensão na partida) e reatância típica de cabo BT
const RHO_QUENTE = 0.0225; // Ω·mm²/m — mesmo valor da skill de elétrica (queda de tensão / Icc mínimo)
const X_CABO = 0.08e-3;  // Ω/m — reatância típica de cabo BT [CONFERIR]

// Regimes de serviço (IEC 60034-1 / NBR 17094-1)
const REGIMES = {
  S1: 'S1 — contínuo', S2: 'S2 — tempo limitado', S3: 'S3 — intermitente periódico', S4: 'S4 — intermitente com partida',
  S5: 'S5 — intermitente com partida e frenagem', S6: 'S6 — contínuo com carga intermitente', S7: 'S7 — contínuo com partida e frenagem',
  S8: 'S8 — contínuo com mudança de velocidade', S9: 'S9 — variações não periódicas', S10: 'S10 — cargas discretas constantes',
};
const REGIMES_AC4 = ['S4', 'S5', 'S7', 'S8'];

// Potências comerciais de motor (cv) e η/FP típicos IR3 4 polos 380 V [CONFERIR placa]
// (eram da skill de pressurização; agora servem a ventiladores e bombas de qualquer skill)
const MOTORES_CV = [0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150];
function rendimentoFpMotor(cv) {
  if (cv <= 1.5) return { eta: 0.8, fp: 0.78 };
  if (cv <= 5) return { eta: 0.86, fp: 0.82 };
  if (cv <= 15) return { eta: 0.89, fp: 0.84 };
  if (cv <= 50) return { eta: 0.92, fp: 0.86 };
  return { eta: 0.94, fp: 0.87 };
}

const proximo = (lista, v) => lista.find(x => x >= v - 1e-9);
const faixa = (lista, v) => lista.find(([a, b]) => v >= a - 1e-9 && v <= b + 1e-9) || null;

// ── Fórmulas básicas ───────────────────────────────────────────────────────

function potenciaKw(m) {
  const p = num(m.potencia, 0);
  return String(m.unidade || 'cv').toLowerCase() === 'kw' ? p : p * CV_KW;
}

// In = P / (√3 · V · η · FP)  (P = potência mecânica no eixo, NBR 17094-1)
function correnteNominalMotor(pKw, v, eta, fp) {
  return (pKw * 1000) / (SQ3 * v * eta * fp);
}

function tensoesPlaca(texto) {
  return String(texto || '').split(/[^0-9.,]+/).map(s => Number(s.replace(',', '.'))).filter(v => v > 50);
}

function zCabo(secao, paralelos, comprimento, rho) {
  const np = Math.max(1, paralelos || 1);
  return { r: (rho * comprimento) / (secao * np), x: (X_CABO * comprimento) / np };
}

// Menor motor comercial (cv) com potência ≥ kwMin
function motorComercial(kwMin) {
  return MOTORES_CV.find(cv => cv * CV_KW >= kwMin - 1e-9) || null;
}

// Potência no eixo (kW) de ventilador: P = Q (m³/s) · Δp (Pa) / η
const potenciaEixoVentilador = (vazaoM3s, pressaoPa, rendimento) => (vazaoM3s * pressaoPa) / rendimento / 1000;
// Potência no eixo (kW) de bomba: P = ρ·g·Q·H / η, água a ~10 °C (ρ ≈ 1000 kg/m³)
const potenciaEixoBomba = (vazaoM3h, alturaM, rendimento) => (1000 * 9.81 * (vazaoM3h / 3600) * alturaM) / rendimento / 1000;

// Motor de uma carga (ventilador, bomba, compressor) a partir da potência no eixo:
// motor comercial com folga, η/FP típicos (ou de placa), In e dispositivos de partida.
// → { kwEixo, kwMin, cv, kw, eta, fp, in, partida }
function motorDaCarga({ kwEixo, folga = 1.15, tensao = 380, partida = 'direta', eta = null, fp = null, ipIn = 7 }) {
  const kwMin = kwEixo * folga;
  const cv = motorComercial(kwMin);
  if (!cv) throw new Error(`Potência de ${arred(kwMin, 1)} kW acima da tabela de motores (${MOTORES_CV[MOTORES_CV.length - 1]} cv): dividir a carga.`);
  const kw = cv * CV_KW;
  const tip = rendimentoFpMotor(cv);
  const e = eta || tip.eta;
  const f = fp || tip.fp;
  const In = correnteNominalMotor(kw, tensao, e, f);
  const tipo = PARTIDAS[partida] ? partida : 'direta';
  const u = { in: In, ipIn, partida: tipo, limitePartida: tipo === 'soft_starter' ? LIMITE_SOFT_PADRAO : LIMITE_INVERSOR_PADRAO, protecao: 'auto', tensao, placa: [], regime: 'S1', pKw: kw, tensaoPlaca: '', fs: 1 };
  return { kwEixo, kwMin, cv, kw, eta: e, fp: f, in: In, partida: dispositivosPartida(u) };
}

// ── Dispositivos de partida (NBR IEC 60947-4-1 / -4-2) ──────────────────────

function protecaoCurto(u, iLinha, semicondutor) {
  let tipo = u.protecao;
  if (!tipo || tipo === 'auto') tipo = faixa(DISJUNTOR_MOTOR, iLinha) ? 'disjuntor_motor' : 'caixa_moldada';
  if (tipo === 'disjuntor_motor' && !faixa(DISJUNTOR_MOTOR, iLinha)) tipo = 'caixa_moldada';
  if (tipo === 'disjuntor_motor') {
    const f = faixa(DISJUNTOR_MOTOR, iLinha);
    return { ref: 'Q1', tipo, funcao: 'curto-circuito e sobrecarga', faixa: f, ajuste_a: arred(iLinha, 1), magnetico_a: MAGNETICO_DM * f[1], termico: true,
      especificacao: `Disjuntor-motor tripolar faixa ${f[0]}–${f[1]} A, ajuste ${arred(iLinha, 1)} A (IEC 60947-2/-4-1)` };
  }
  if (tipo === 'fusivel') {
    const inF = proximo(FUSIVEIS, semicondutor ? 1.25 * iLinha : iLinha);
    return { ref: 'F1-F3', tipo, funcao: 'curto-circuito', nominal_a: inF, termico: false, quantidade: 3,
      especificacao: semicondutor ? `Fusível ultrarrápido aR ${inF} A (3 un) com base — coordenação tipo 2 pelo manual do equipamento [CONFERIR]` : `Fusível NH/Diazed aM ${inF} A (3 un) com base — coordenação tipo 2 [CONFERIR tabela do fabricante]` };
  }
  const inD = proximo(DISJUNTORES_GERAIS, iLinha);
  return { ref: 'Q1', tipo: 'caixa_moldada', funcao: 'curto-circuito', nominal_a: inD, termico: false,
    especificacao: `Disjuntor de caixa moldada tripolar ${inD} A para proteção de motor, magnético ajustável ≥ 2 × Ip [CONFERIR] (IEC 60947-2)` };
}

function dispositivosPartida(u) {
  const In = u.in;
  const ipDireta = u.ipIn * In;
  const ac3 = (i) => proximo(CONTATORES_AC3, i);
  const disp = [];
  const obs = [];
  let ipLinha;
  let conjugado;
  let sobrecarga;
  if (u.partida === 'direta' || u.partida === 'estrela_triangulo') {
    const yd = u.partida === 'estrela_triangulo';
    const p = protecaoCurto(u, In, false);
    disp.push(p);
    if (yd) {
      ipLinha = ipDireta / 3; conjugado = 100 / 3;
      const iF = In / SQ3;
      disp.push({ ref: 'K1', tipo: 'contator', funcao: 'rede (linha)', corrente_a: arred(iF, 1), nominal_a: ac3(iF), categoria: 'AC-3' });
      disp.push({ ref: 'K2', tipo: 'contator', funcao: 'triângulo', corrente_a: arred(iF, 1), nominal_a: ac3(iF), categoria: 'AC-3' });
      disp.push({ ref: 'K3', tipo: 'contator', funcao: 'estrela', corrente_a: arred(In / 3, 1), nominal_a: ac3(In / 3), categoria: 'AC-3' });
      disp.push({ ref: 'KT1', tipo: 'temporizador', funcao: 'comutação Y-Δ', especificacao: 'Relé temporizador estrela-triângulo (pausa ≈ 50–100 ms)' });
      if (p.termico) sobrecarga = { ajuste_a: arred(In, 1), local: 'disjuntor-motor Q1 (corrente de linha)' };
      else {
        const f = faixa(RELES, iF);
        disp.push({ ref: 'F4', tipo: 'rele_sobrecarga', funcao: 'sobrecarga (corrente de fase, após K1)', ajuste_a: arred(iF, 1), faixa: f });
        sobrecarga = { ajuste_a: arred(iF, 1), local: 'relé F4 no ramo de K1 (In/√3)' };
      }
      const placa = u.placa;
      const possivel = !placa.length || placa.some(vd => Math.abs(vd - u.tensao) / u.tensao <= 0.05 && placa.some(vy => Math.abs(vy - vd * SQ3) / (vd * SQ3) <= 0.05));
      if (!placa.length) obs.push('Y-Δ exige motor com 6 terminais e tensão em triângulo igual à da rede (ex.: 380/660 V em rede de 380 V). [CONFERIR placa]');
      else if (!possivel) obs.push(`Placa ${u.tensaoPlaca} V não permite Y-Δ em ${u.tensao} V (o triângulo precisa ser a tensão da rede) — trocar o motor ou o tipo de partida.`);
      obs.push('Conjugado de partida reduzido a 1/3: verificar se o conjugado resistente da carga permite a partida (partida em vazio ou com carga leve).');
    } else {
      ipLinha = ipDireta; conjugado = 100;
      disp.push({ ref: 'K1', tipo: 'contator', funcao: 'linha', corrente_a: arred(In, 1), nominal_a: ac3(In), categoria: 'AC-3' });
      if (p.termico) sobrecarga = { ajuste_a: arred(In, 1), local: 'disjuntor-motor Q1' };
      else {
        const f = faixa(RELES, In);
        disp.push({ ref: 'F4', tipo: 'rele_sobrecarga', funcao: 'sobrecarga', ajuste_a: arred(In, 1), faixa: f });
        sobrecarga = { ajuste_a: arred(In, 1), local: 'relé F4' };
      }
    }
    if (REGIMES_AC4.includes(u.regime)) obs.push(`Regime ${u.regime}: manobras de impulso/frenagem — escolher o contator pela tabela AC-4 do fabricante. [CONFERIR]`);
  } else {
    const soft = u.partida === 'soft_starter';
    const lim = u.limitePartida;
    ipLinha = lim * In;
    conjugado = soft ? Math.min(100, (lim / u.ipIn) ** 2 * 100) : null;
    disp.push(protecaoCurto(u, In, true));
    disp.push({ ref: 'K1', tipo: 'contator', funcao: 'isolamento / parada de emergência (NR-12)', corrente_a: arred(In, 1), nominal_a: ac3(In), categoria: 'AC-3' });
    disp.push(soft
      ? { ref: 'T1', tipo: 'soft_starter', funcao: 'partida suave', corrente_a: arred(In, 1), especificacao: `Soft-starter ≥ ${arred(In, 1)} A em ${u.tensao} V, by-pass incorporado e proteção eletrônica de sobrecarga classe 10, limitação ${String(lim).replace('.', ',')} × In (NBR IEC 60947-4-2) [CONFERIR partidas/hora]` }
      : { ref: 'T1', tipo: 'inversor', funcao: 'acionamento com velocidade variável', corrente_a: arred(In, 1), especificacao: `Inversor de frequência ≥ ${arred(In, 1)} A (${arred(u.pKw, 1)} kW) em ${u.tensao} V, uso normal; para conjugado constante escolher pela corrente em uso pesado (IEC 61800) [CONFERIR]` });
    sobrecarga = { ajuste_a: arred(In, 1), local: soft ? 'proteção eletrônica do soft-starter' : 'parâmetro de corrente do inversor' };
    if (soft) obs.push(`Corrente de partida limitada a ${String(lim).replace('.', ',')} × In; conjugado ≈ (${String(lim).replace('.', ',')}/${String(u.ipIn).replace('.', ',')})² ≈ ${Math.round(conjugado)} % do conjugado de partida direta.`);
    else obs.push('Cabo motor–inversor blindado (EMC, IEC 61800-3) e verificação de reatância de rede/filtro conforme o manual. Inversor não contribui para o curto-circuito e gera harmônicos (ver banco de capacitores).');
  }
  return { tipo: u.partida, rotulo: PARTIDAS[u.partida].rotulo, ipDireta, ipLinha, conjugado, dispositivos: disp, sobrecarga, observacoes: obs };
}

// ── Circuito terminal de motor (NBR 5410, 6.5.1) ─────────────────────────────
// Ib = max(1,25; FS) × In.
// Y-Δ: 6 condutores entre o CCM e o motor, cada um com a corrente de fase
// (In/√3); queda de tensão no enrolamento em Δ = 2·ρ·L·If/(S·V) — 2/√3 vezes
// a fórmula trifásica do motor da elétrica, por isso o limite é corrigido.
// Motores grandes: condutores em paralelo quando a seção passa do limite prático
// (secaoMaxParalelo, padrão 240 mm²) — cada conjunto conta como um circuito no FCA.
// c = { vff, quedaTerminal, secaoMaxParalelo }; ec = E.config(...) do motor da elétrica.
function circuitoMotor(u, c, ec, secaoMinima = 0) {
  const yd = u.partida === 'estrela_triangulo';
  const fatorIb = Math.max(1.25, u.fs);
  const ibLinha = fatorIb * u.in;
  const ibCond = yd ? ibLinha / SQ3 : ibLinha;
  const kQueda = yd ? 2 / SQ3 : 1;
  let ultimoErro = null;
  for (let np = 1; np <= 8; np++) {
    let d;
    try {
      d = E.dimensionarCircuito({
        id: u.tag, descricao: `${u.tag} — ${u.descricao}`, tipo: 'tue', ligacao: 'FFF', potencia_va: SQ3 * c.vff * ibCond / np,
        comprimento_m: u.distancia, agrupamento: u.agrupamento + (yd ? 1 : 0) + np - 1, metodo: u.metodo, secao_minima: Math.max(secaoMinima, u.secaoMinima),
      }, ec, { minimo: T.SECAO_MINIMA.tue, limiteQueda: c.quedaTerminal / kQueda });
    } catch (e) { ultimoErro = e; continue; }
    if (d.secao > c.secaoMaxParalelo && np < 8) continue;
    return {
      secao: d.secao, secaoPE: d.secaoPE, iz: d.iz, izTotal: d.iz * np, izRef: d.izRef, fct: d.fct, fca: d.fca, metodo: d.metodo, agrupamento: u.agrupamento + (yd ? 1 : 0) + np - 1,
      paralelos: np, ibLinha, ibCond, fatorIb, condutores: yd ? 6 : 3, comprimento: d.comprimento, queda: d.queda * kQueda,
      criterio: np > 1 ? `${d.criterio} · ${np} cabos em paralelo por fase (seção ≤ ${c.secaoMaxParalelo} mm²)` : d.criterio,
    };
  }
  throw new Error(`${u.tag}: nenhuma combinação de até 8 cabos em paralelo atende (${Math.round(ibLinha)} A, ${u.distancia} m)${ultimoErro ? ` — ${ultimoErro.message}` : ''}.`);
}

// ── Queda de tensão na partida (NBR 5410, 6.5.1 e 6.2.7) ─────────────────────
// ΔV% = ΔV em regime até o quadro + 100·√3·Ip·(R·cosφp + X·senφp)/V em cada trecho.
// Y-Δ (estágio estrela): cada enrolamento tem 2 condutores em série → fator 2 no circuito.
function quedaPartida(u, zAteQuadro, quedaRegimeQuadro, secao, c) {
  const Ip = u.partidaInfo.ipLinha;
  const cos = u.fpPartida;
  const sen = Math.sqrt(1 - cos * cos);
  const dvFonte = (100 * SQ3 * Ip * (zAteQuadro.r * cos + zAteQuadro.x * sen)) / c.vff;
  const zc = zCabo(secao, u.circuito.paralelos || 1, u.circuito.comprimento, RHO_QUENTE);
  const kCirc = u.partida === 'estrela_triangulo' ? 2 : 1;
  const dvCirc = (100 * kCirc * SQ3 * Ip * (zc.r * cos + zc.x * sen)) / c.vff;
  const dispositivo = quedaRegimeQuadro + dvFonte;
  return { ip: Ip, cos, dvFonte, regime: quedaRegimeQuadro, dispositivo, circuito: dvCirc, motor: dispositivo + dvCirc };
}

module.exports = {
  // tabelas
  CV_KW, PARTIDAS, LIMITE_SOFT_PADRAO, LIMITE_INVERSOR_PADRAO, FP_PARTIDA_PADRAO, FP_PARTIDA_INVERSOR, FATOR_UTILIZACAO, fatorUtilizacao,
  CONTATORES_AC3, DISJUNTOR_MOTOR, MAGNETICO_DM, RELES, FUSIVEIS, DISJUNTORES_GERAIS, RHO_QUENTE, X_CABO, REGIMES, REGIMES_AC4,
  MOTORES_CV, rendimentoFpMotor, proximo, faixa,
  // cálculo
  potenciaKw, correnteNominalMotor, tensoesPlaca, zCabo, motorComercial, potenciaEixoVentilador, potenciaEixoBomba, motorDaCarga,
  protecaoCurto, dispositivosPartida, circuitoMotor, quedaPartida,
};
