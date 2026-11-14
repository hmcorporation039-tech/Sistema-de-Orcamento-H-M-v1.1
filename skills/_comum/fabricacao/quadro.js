// Configuração do quadro (conjunto de BT — NBR IEC 61439) e barramentos (corrente pela DIN 43671 com a
// correção de temperatura, curto térmico adiabático, esforço eletrodinâmico pela IEC 60865-1
// simplificada, neutro e PE pela Tabela 58 da NBR 5410). Moravam em skills/quadros/scripts/lib/calculo.js
// até a 2.40: o quadro lido do projeto no 3D (../instalacao/barramentosCalculados.js) usa o MESMO
// cálculo, e o _comum não pode depender de uma skill. A skill quadros importa daqui. Só no Node.
const T = require('./tabelasQuadro');
const ET = require('../eletrico/tabelas');

const SQ3 = Math.sqrt(3);
const num = (v, padrao = null) => (v == null || v === '' || !Number.isFinite(Number(v)) ? padrao : Number(v));
const arred = (v, c = 2) => (v == null ? null : Math.round(v * 10 ** c) / 10 ** c);
const fracao = (v, padrao) => { const x = num(v, padrao); return x != null && x > 1 ? x / 100 : x; };

const ICC_PADRAO_KA = 10; // mesma premissa das outras skills quando a Icc não é informada [CONFERIR]

// ── Configuração ────────────────────────────────────────────────────────────

const TIPOS_QUADRO = {
  distribuicao: 'Quadro de distribuição (QD/QGBT)',
  automacao: 'Quadro de automação (CLP)',
  ccm: 'Centro de controle de motores (CCM)',
  comando: 'Quadro de comando de máquina',
};

function config(dados) {
  const q = dados.quadro || {};
  const sistema = ['monofasico', 'bifasico', 'trifasico'].includes(q.sistema) ? q.sistema : 'trifasico';
  const vff = num(q.tensao_ff, 380);
  const vfn = num(q.tensao_fn, Math.round(vff / SQ3));
  const esquema = q.esquema || 'TN-S';
  const tipo = TIPOS_QUADRO[q.tipo] ? q.tipo : 'distribuicao';
  const iccInformada = num(q.icc_ka) != null;
  const icc = num(q.icc_ka, ICC_PADRAO_KA);
  const n = T.FATOR_N_IPK.find(f => icc <= f.ate);
  const montagem = T.INVOLUCROS[q.montagem] ? q.montagem : (tipo === 'ccm' ? 'autoportante' : 'sobrepor');
  const local = T.LOCAIS[q.local] ? q.local : 'interno_tecnico';
  return {
    tag: q.tag || 'QD-01', descricao: q.descricao || '', tipo, tipoRotulo: TIPOS_QUADRO[tipo],
    maquina: !!q.maquina || tipo === 'comando',
    sistema, nFases: { monofasico: 1, bifasico: 2, trifasico: 3 }[sistema], vff, vfn, esquema, frequencia: num(q.frequencia_hz, 60),
    icc, iccInformada, ipk: num(q.ipk_ka, arred(n.n * icc, 2)), ipkInformado: num(q.ipk_ka) != null, fatorN: n.n,
    tempoIcw: num(q.tempo_icw_s, 1),
    geralInformado: num(q.disjuntor_geral_a), geralFabricante: q.geral_fabricante || null, geralReferencia: q.geral_referencia || null, dpsFabricante: q.dps_fabricante || null, geralTipo: q.geral_tipo || 'auto', geralPolos: num(q.geral_polos), geralIcu: num(q.geral_icu_ka),
    drGeral: !!q.dr_geral, drGeralMa: num(q.dr_geral_ma, 300),
    spda: !!q.spda, dpsClasse: q.dps_classe || 'auto', pontoEntrada: q.ponto_entrada !== false,
    multimedidor: !!q.multimedidor,
    local, localInfo: T.LOCAIS[local], montagem, posicao: q.posicao || (montagem === 'autoportante' ? 'parede' : 'parede'),
    material: T.COEF_TRANSMISSAO[q.material] ? q.material : 'aco',
    temperatura: num(q.temperatura_ambiente, 35), temperaturaMax: num(q.temperatura_max_interna, 50), altitude: num(q.altitude_m, 0),
    forma: q.forma_separacao && q.forma_separacao !== 'auto' ? String(q.forma_separacao) : null,
    ip: q.ip && q.ip !== 'auto' ? q.ip : null, ik: q.ik && q.ik !== 'auto' ? q.ik : null,
    entradaCabos: q.entrada_cabos === 'superior' ? 'superior' : 'inferior',
    barramento: ['pente', 'barra'].includes(q.barramento) ? q.barramento : 'auto',
    barraPintada: !!q.barra_pintada, temperaturaBarra: num(q.temperatura_max_barra, 65),
    apoios: num(q.distancia_apoios_mm, 300), entreFases: num(q.distancia_fases_mm, 60),
    neutroReduzido: !!q.neutro_reduzido,
    bornesSaida: q.bornes_saida == null || q.bornes_saida === 'auto' ? tipo !== 'distribuicao' : (q.bornes_saida === true || q.bornes_saida === 'sim'),
    reservaPct: fracao(q.reserva_pct, 0.2), fatorDiversidade: num(q.fator_diversidade),
    fiacaoM: num(q.comprimento_fiacao_interna_m, 1.0),
    ventilacao: q.ventilacao || 'auto',
    uimpKv: num(q.uimp_kv, vff > 300 ? 6 : 4), ui: num(q.ui_v, vff > 400 ? 690 : 500),
    metodoSaida: q.metodo_saida || 'B1', isolacaoSaida: q.isolacao_saida || 'PVC', temperaturaCabos: num(q.temperatura_cabos, 30),
    residencial: !!q.residencial,
    // arranjo por zonas (09/11/2026): força em cima, partidas | comando lado a lado, bornes embaixo —
    // o arranjo padrão empilha cada zona numa fileira de largura total
    layoutZonas: q.layout === 'zonas',
  };
}

// ── Barramentos ─────────────────────────────────────────────────────────────

function kAdiabatico(thetaI, thetaF = T.THETA_FINAL_BARRA) {
  return T.K_ADIABATICO_COBRE * Math.sqrt(Math.log((T.BETA_COBRE + thetaF) / (T.BETA_COBRE + thetaI)));
}

// correção de temperatura (k2) e escolha da barra DIN 43671: as funções comuns (a média tensão usa as mesmas)
const { k2Temperatura, escolherBarra } = ET;

// Automático: pente até 125 A em quadro só de disjuntores modulares; barras acima disso, com
// disjuntores de caixa moldada ou com partidas de motores (derivações para as partidas)
function barramento(c, geral, circuitos, dem, motores = []) {
  const tipo = c.barramento !== 'auto' ? c.barramento : (geral.In <= 125 && circuitos.every(x => !x.caixaMoldada) && !motores.length ? 'pente' : 'barra');
  const thetaAr = c.temperaturaMax; // ar em volta da barra no topo do quadro
  const k2 = k2Temperatura(c.temperaturaBarra, thetaAr);
  const In = geral.In;
  const kCurto = kAdiabatico(c.temperaturaBarra);
  const sCurto = (c.icc * 1000 * Math.sqrt(c.tempoIcw)) / kCurto;
  const icw = T.proximo(T.ICW_KA, c.icc) || c.icc;
  const r = { tipo, k2, thetaAr, kCurto, sCurtoMin: sCurto, icw, In };
  if (tipo === 'pente') {
    const pente = T.PENTES.find(p => p.a >= In - 1e-9) || T.PENTES[T.PENTES.length - 1];
    r.pente = pente;
    r.penteOk = pente.a >= In - 1e-9;
    // pente: a verificação ao curto é do fabricante (ensaio com o disjuntor a montante)
    r.curtoOk = null;
    r.fase = null;
    r.secaoFase = pente.s;
  } else {
    let barra = escolherBarra(In, k2, c.barraPintada);
    // seção ≥ curto térmico
    if (barra && barra.l * barra.e < sCurto) barra = [...T.BARRAS_DIN43671].sort((a, b) => a.l * a.e - b.l * b.e).find(b => b.l * b.e >= sCurto && b[c.barraPintada ? 'pintada' : 'nua'] * k2 >= In) || barra;
    r.fase = barra;
    r.secaoFase = barra ? barra.l * barra.e : null;
    r.capacidade = barra ? barra[c.barraPintada ? 'pintada' : 'nua'] * k2 : null;
    r.correnteOk = !!barra && r.capacidade >= In - 1e-9;
    r.curtoOk = !!barra && r.secaoFase >= sCurto - 1e-9;
    // esforço eletrodinâmico (estimativa, IEC 60865-1 simplificado)
    if (barra) {
      const F = 0.2 * (SQ3 / 2) * c.ipk ** 2 * (c.apoios / c.entreFases);
      const Z = barra.l * barra.e ** 2 / 6; // barras de face: força perpendicular à face larga
      const sigma = T.BETA_VIGA * F * c.apoios / (8 * Z);
      const adm = T.Q_RETANGULAR * T.RP02_COBRE;
      const lMax = Math.sqrt((8 * Z * adm * c.entreFases) / (T.BETA_VIGA * 0.2 * (SQ3 / 2) * c.ipk ** 2));
      r.dinamico = { F, Z, sigma, adm, ok: sigma <= adm, forcaApoio: T.ALFA_APOIO * F, lMax };
    }
  }
  // neutro e PE (NBR 5410, Tabela 58; NBR IEC 61439-1 tem tabela equivalente para o PE do conjunto)
  const sF = r.secaoFase || 10;
  r.secaoNeutro = c.neutroReduzido && sF > 25 ? sF / 2 : sF;
  // Tabela 58 da NBR 5410 aplicada à barra: S ≤ 16 → S; 16 < S ≤ 35 → 16; S > 35 → S/2
  r.secaoPeMin = sF <= 16 ? sF : sF <= 35 ? 16 : sF / 2;
  // PE ao curto fase-massa (adiabático, t = 0,2 s; θi 30 °C, θf 200 °C) [CONFERIR tempo de atuação]
  r.secaoPeCurto = (c.icc * 1000 * Math.sqrt(0.2)) / kAdiabatico(30);
  const sPe = Math.max(r.secaoPeMin, r.secaoPeCurto);
  r.pe = [...T.BARRAS_DIN43671].sort((a, b) => a.l * a.e - b.l * b.e).find(b => b.l * b.e >= sPe - 1e-9) || T.BARRAS_DIN43671[0];
  r.neutro = tipo === 'barra' ? ([...T.BARRAS_DIN43671].sort((a, b) => a.l * a.e - b.l * b.e).find(b => b.l * b.e >= r.secaoNeutro - 1e-9) || r.fase) : null;
  r.nBarras = c.nFases + (c.esquema === 'TN-C' ? 0 : 1); // fases + N (PE à parte)
  return r;
}

module.exports = { ICC_PADRAO_KA, TIPOS_QUADRO, config, kAdiabatico, k2Temperatura, escolherBarra, barramento };
