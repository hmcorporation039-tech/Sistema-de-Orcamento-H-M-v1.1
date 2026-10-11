// Automação predial — BMS (lista de pontos, controladores, rede, licença),
// automação de climatização (zonas, ar externo pela NBR 16401-3 e controle por
// CO₂), classe de eficiência da automação (ISO 52120-1 / EN 15232) e automação
// residencial (Zigbee, Wi-Fi ou KNX).

const T = require('./tabelas');

const FOLGA = 1.1;
const n = (v, padrao) => (v == null || v === '' || Number.isNaN(Number(v)) ? padrao : Number(v));
const br = (v, c = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

// ── BMS ──────────────────────────────────────────────────────────────────
function listaDePontos(dados, s, avisos) {
  const linhas = (dados.equipamentos || []).filter(e => n(e.quantidade, 0) > 0 && T.EQUIPAMENTOS[e.tipo || 'outro']).map((e, i) => {
    const base = T.EQUIPAMENTOS[e.tipo || 'outro'];
    const qtd = n(e.quantidade, 1);
    const p = {};
    for (const k of ['di', 'do', 'ai', 'ao', 'rede']) p[k] = n(e[k], base[k]);
    // VRF: um gateway por sistema (linha); split, medidor etc.: um dispositivo por unidade
    const dispositivos = e.tipo === 'vrf' ? 1 : base.dispositivoRede || (p.rede > 0 && e.tipo === 'outro') ? qtd : 0;
    return { id: e.id || `EQ${i + 1}`, tipo: e.tipo, rotulo: base.rotulo, descricao: e.descricao || base.rotulo, local: e.local || '', qtd, ...p,
      fisicos: (p.di + p.do + p.ai + p.ao) * qtd, totalRede: p.rede * qtd, dispositivos };
  });

  // Sensores das zonas de climatização entram como pontos do BMS
  const zonasBms = s.zonas_no_bms !== false;
  const sensores = { termostato: { ai: 0, rede: 3, disp: 1 }, sensor_t: { ai: 1, rede: 0, disp: 0 }, sensor_tur: { ai: 2, rede: 0, disp: 0 }, co2: { ai: 3, rede: 0, disp: 0 } };
  const zonas = zonasBms ? (dados.zonas || []).filter(z => z.nome && sensores[z.controle]) : [];
  for (const z of zonas) {
    const sx = sensores[z.controle];
    linhas.push({ id: z.id || `Z-${z.nome}`, tipo: 'zona', rotulo: 'Sensor/termostato de zona', descricao: `${z.nome} — ${z.controle === 'co2' ? 'T + UR + CO₂' : z.controle === 'sensor_tur' ? 'T + UR' : z.controle === 'termostato' ? 'termostato comunicante' : 'temperatura'}`,
      local: z.nome, qtd: 1, di: 0, do: 0, ai: sx.ai, ao: 0, rede: sx.rede, fisicos: sx.ai, totalRede: sx.rede, dispositivos: sx.disp });
  }
  if (!linhas.length) return null;

  const soma = (k) => linhas.reduce((a, l) => a + l[k] * (['di', 'do', 'ai', 'ao'].includes(k) ? l.qtd : 1), 0);
  const tot = { di: soma('di'), do: soma('do'), ai: soma('ai'), ao: soma('ao') };
  const fisicos = tot.di + tot.do + tot.ai + tot.ao;
  const rede = linhas.reduce((a, l) => a + l.totalRede, 0);
  const dispositivosRede = linhas.reduce((a, l) => a + l.dispositivos, 0);
  const reserva = n(s.reserva_pct, 20) / 100;
  const fisicosComReserva = Math.ceil(fisicos * (1 + reserva));
  const pontosPorControlador = n(s.pontos_por_controlador, 32);
  const controladores = fisicos ? Math.ceil(fisicosComReserva / pontosPorControlador) : 0;
  const quadros = controladores ? Math.ceil(controladores / n(s.controladores_por_quadro, 2)) : 0;
  const porSegmento = n(s.dispositivos_por_segmento, 32); // RS-485: 32 cargas unitárias por segmento
  const segmentos = dispositivosRede ? Math.ceil(dispositivosRede / porSegmento) : 0;
  const distMedia = n(s.distancia_media_ponto_m, 25);
  const barramentoM = segmentos ? Math.min(1200, Math.ceil(dispositivosRede / segmentos) * distMedia) : 0;
  if (segmentos && Math.ceil(dispositivosRede / segmentos) * distMedia > 1200) avisos.push(`Barramento RS-485 estimado acima de 1 200 m por segmento: dividir em mais segmentos ou usar repetidor.`);
  const pontosTotais = fisicosComReserva + rede;
  const licenca = T.LICENCAS_PONTOS.find(l => l >= pontosTotais) || Math.ceil(pontosTotais / 1000) * 1000;
  const caboSinalM = Math.ceil(fisicos * distMedia * FOLGA);
  const caboRedeM = Math.ceil(segmentos * barramentoM * FOLGA);
  return { linhas, tot, fisicos, rede, dispositivosRede, reserva, fisicosComReserva, pontosPorControlador, controladores, quadros, segmentos, barramentoM, pontosTotais, licenca, caboSinalM, caboRedeM, protocolo: s.protocolo || 'bacnet' };
}

// ── Climatização: ar externo (NBR 16401-3) e controle por CO₂ ───────────────
function zonasClimatizacao(dados, s) {
  const ocup = n(s.ocupacao_media_pct, 60) / 100;
  const co2Max = n(s.co2_max_ppm, 1100); // teto prático do setpoint de CO₂
  return (dados.zonas || []).filter(z => z.nome && n(z.area_m2, 0) > 0).map(z => {
    const ref = T.AR_EXTERNO[z.uso] || T.AR_EXTERNO.outro;
    const fp = n(z.fp, ref.fp);
    const fa = n(z.fa, ref.fa);
    const area = n(z.area_m2, 0);
    const pessoas = n(z.pessoas, 0) || Math.max(1, Math.ceil(area * ref.densidade / 100));
    const vbz = fp * pessoas + fa * area; // L/s — Ez = 1 (insuflamento e retorno pelo teto, resfriamento)
    const porPessoa = vbz / pessoas;
    // CO₂ em regime com a vazão de projeto: Cint = Cext + G / (vazão por pessoa)
    const co2Regime = Math.round((T.CO2_EXTERNO_PPM + T.CO2_PESSOA_LS / porPessoa * 1e6) / 10) * 10;
    const setpointCo2 = Math.min(co2Regime, co2Max);
    const dcv = z.controle === 'co2';
    const vMin = fa * area;
    const vMedia = fa * area + fp * pessoas * ocup;
    const reducao = dcv ? 1 - vMedia / vbz : 0;
    return { ...z, uso: z.uso || 'outro', rotuloUso: ref.rotulo, fp, fa, area, pessoas, vbz, m3h: vbz * 3.6, co2Regime, setpointCo2, dcv, vMin, reducao, setpoint: n(z.setpoint, 24) };
  });
}

// ── Classe de eficiência da automação (ISO 52120-1 / EN 15232) ──────────────
function classeDe(funcoes = {}) {
  let pior = 'A';
  const detalhes = [];
  for (const f of T.FUNCOES_BAC) {
    const nivel = f.niveis.find(x => x[0] === funcoes[f.cod]);
    if (!nivel) continue;
    detalhes.push({ cod: f.cod, grupo: f.grupo, rotulo: f.rotulo, nivel: nivel[1], classe: nivel[2] });
    if (T.ORDEM_CLASSE.indexOf(nivel[2]) < T.ORDEM_CLASSE.indexOf(pior)) pior = nivel[2];
  }
  return detalhes.length ? { classe: pior, detalhes } : null;
}

function eficiencia(dados, s) {
  const f = dados.funcoes || {};
  const atual = classeDe(f.atual);
  const proposta = classeDe(f.proposta);
  if (!atual || !proposta) return null;
  const uso = T.FATORES_BAC[s.uso] ? s.uso : 'escritorio';
  const fat = T.FATORES_BAC[uso];
  const econTh = 1 - fat.th[proposta.classe] / fat.th[atual.classe];
  const econEl = 1 - fat.el[proposta.classe] / fat.el[atual.classe];
  const kwhClima = n(s.consumo_climatizacao_kwh_mes, 0);
  const kwhOutros = n(s.consumo_outros_kwh_mes, 0);
  const economiaKwh = kwhClima * econTh + kwhOutros * econEl;
  const tarifa = n(s.tarifa_kwh, 0);
  const limitantes = proposta.detalhes.filter(d => d.classe === proposta.classe && proposta.classe !== 'A').map(d => d.rotulo);
  return { uso, atual, proposta, fatores: fat, econTh, econEl, kwhClima, kwhOutros, economiaKwh, economiaRs: tarifa ? economiaKwh * tarifa : null, tarifa, limitantes };
}

// ── Residencial ────────────────────────────────────────────────────────────
function residencial(dados, avisos) {
  const r = dados.residencial || {};
  const amb = (r.ambientes || []).filter(a => a.nome);
  if (!amb.length) return null;
  const tec = T.RESID[r.tecnologia] ? r.tecnologia : 'zigbee';
  const soma = (k) => amb.reduce((a, x) => a + n(x[k], 0), 0);
  const t = { onoff: soma('ilum_onoff'), dimer: soma('ilum_dimer'), cortinas: soma('cortinas'), ar: soma('ar_condicionado'), tomadas: soma('tomadas'), sensores: soma('sensores') };
  const ambCena = amb.filter(a => n(a.cenas, 0) > 0).length;
  const ambAr = amb.filter(a => n(a.ar_condicionado, 0) > 0).length;
  const distMedia = n(r.distancia_media_m, 12);
  const itens = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => quantidade > 0 && itens.push({ codigo, descricao, unidade, quantidade: Math.ceil(quantidade), referencia });
  let dispositivos = 0;
  let rede = {};
  if (tec === 'knx') {
    const atChave = Math.ceil((t.onoff + t.tomadas) / 8);
    const atDimer = Math.ceil(t.dimer / 4);
    const atPersiana = Math.ceil(t.cortinas / 4);
    const botoeiras = amb.length + ambCena;
    dispositivos = atChave + atDimer + atPersiana + botoeiras + t.sensores + t.ar + 1;
    const linhas = Math.ceil(dispositivos / T.RESID.knx.dispositivosPorLinha);
    const consumoMa = Math.ceil(dispositivos / linhas) * T.RESID.knx.maPorDispositivo;
    const caboM = Math.ceil((amb.length * distMedia + dispositivos * 2) * 1.2);
    if (caboM / linhas > 1000) avisos.push('Cabo KNX acima de 1 000 m por linha: dividir em mais linhas.');
    rede = { linhas, consumoMa, caboM };
    add('KNX-CH', 'Atuador KNX de chaveamento 8 canais 16 A (trilho DIN)', 'un', atChave, 'KNX / ISO/IEC 14543-3');
    add('KNX-DIM', 'Atuador KNX dimmer universal 4 canais', 'un', atDimer, 'KNX');
    add('KNX-PER', 'Atuador KNX de persiana/cortina 4 canais', 'un', atPersiana, 'KNX');
    add('KNX-BOT', 'Botoeira/teclado KNX 4 teclas com acoplador de barramento', 'un', botoeiras, 'KNX');
    add('KNX-SEN', 'Sensor KNX de presença/luminosidade', 'un', t.sensores, 'KNX');
    add('KNX-AC', 'Gateway KNX para ar-condicionado (IR ou protocolo do fabricante)', 'un', t.ar, 'Fabricante');
    add('KNX-PS', `Fonte KNX 640 mA com bobina (uma por linha; consumo estimado ${consumoMa} mA)`, 'un', linhas, 'KNX');
    add('KNX-IP', 'Interface/roteador KNX-IP (programação e app)', 'un', 1, 'KNX');
    if (linhas > 1) add('KNX-LC', 'Acoplador de linha KNX', 'un', linhas, 'KNX');
    add('KNX-CB', 'Cabo KNX/EIB 2×2×0,8 mm (verde)', 'm', caboM, 'KNX');
  } else {
    const modRele = Math.ceil((t.onoff + t.tomadas) / 2);
    const cenas = ambCena;
    dispositivos = modRele + t.dimer + t.cortinas + ambAr + t.sensores + cenas;
    const wifi = tec === 'wifi';
    add('MOD-RL', `Módulo relé ${wifi ? 'Wi-Fi' : 'Zigbee'} 2 canais (atrás do interruptor, com neutro)`, 'un', modRele, '—');
    add('MOD-DIM', `Módulo dimmer ${wifi ? 'Wi-Fi' : 'Zigbee'}`, 'un', t.dimer, '—');
    add('MOD-COR', `Módulo de cortina/persiana ${wifi ? 'Wi-Fi' : 'Zigbee'}`, 'un', t.cortinas, '—');
    add('IR', `Controle IR universal ${wifi ? 'Wi-Fi' : 'Zigbee'} para ar-condicionado`, 'un', ambAr, '—');
    add('SEN', `Sensor de presença/abertura ${wifi ? 'Wi-Fi' : 'Zigbee'}`, 'un', t.sensores, '—');
    add('CENA', `Interruptor de cenas ${wifi ? 'Wi-Fi' : 'Zigbee'}`, 'un', cenas, '—');
    if (wifi) {
      const aps = Math.ceil(dispositivos / T.RESID.wifi.dispositivosPorAp);
      rede = { aps };
      if (aps > 1) avisos.push(`${dispositivos} dispositivos Wi-Fi: prever ${aps} pontos de acesso (≈ ${T.RESID.wifi.dispositivosPorAp} dispositivos por AP) e rede 2,4 GHz dedicada. [CONFERIR]`);
      add('AP', 'Ponto de acesso Wi-Fi (rede 2,4 GHz para automação)', 'un', aps, '—');
    } else {
      const hubs = Math.ceil(dispositivos / T.RESID.zigbee.dispositivosPorHub);
      rede = { hubs };
      add('HUB', 'Central/hub Zigbee 3.0 (com app e integração com assistente de voz)', 'un', hubs, '—');
    }
    avisos.push('Módulos instalados em caixa 4×2 precisam de neutro na caixa e de espaço (caixa 4×4 ou prolongador) — conferir na visita. [CONFERIR]');
  }
  add('VOZ', 'Assistente de voz / tela de controle', 'un', n(r.assistente_voz, 0), '—');
  return { tecnologia: tec, rotulo: T.RESID[tec].rotulo, ambientes: amb, totais: t, dispositivos, rede, itens };
}

// ── Materiais ──────────────────────────────────────────────────────────────
function materiaisBms(b, zonas, s) {
  const itens = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => quantidade > 0 && itens.push({ codigo, descricao, unidade, quantidade: Math.ceil(quantidade), referencia });
  if (!b) return itens;
  const prot = b.protocolo === 'modbus' ? 'Modbus' : 'BACnet';
  add('DDC', `Controlador programável ${prot}/IP com ${b.pontosPorControlador} pontos de E/S (ou base + expansões)`, 'un', b.controladores, 'ISO 16484');
  add('QA', 'Quadro de automação com trilho, fonte 24 V, disjuntor, bornes e identificação', 'un', b.quadros, 'NBR 5410');
  add('GW', `Gateway/porta RS-485 ${prot} MS/TP-RTU para integração (um por segmento)`, 'un', b.segmentos, 'RS-485 / ISO 16484-5');
  add('SUP', `Software supervisório (licença ${b.licenca} pontos) com servidor/estação`, 'un', 1, 'ISO 16484');
  add('SW', 'Switch gerenciável para a rede de automação', 'un', Math.max(1, Math.ceil((b.controladores + b.segmentos + 2) / 16)), 'NBR 14565');
  add('NB', 'Nobreak para servidor e quadros de automação', 'un', 1, '—');
  add('CB-S', 'Cabo de instrumentação blindado 1 par 0,75 mm² (sinais de campo)', 'm', b.caboSinalM, 'Boas práticas');
  if (b.caboRedeM) add('CB-R', 'Cabo par trançado blindado 120 Ω para RS-485 (barramento)', 'm', b.caboRedeM, 'RS-485');
  const zz = zonas.filter(z => z.controle);
  const cont = (c) => zz.filter(z => z.controle === c).length;
  add('TS', 'Sensor de temperatura ambiente (parede)', 'un', cont('sensor_t'), '—');
  add('TUR', 'Sensor de temperatura e umidade ambiente (parede)', 'un', cont('sensor_tur'), '—');
  add('CO2', 'Sensor de CO₂ + temperatura + umidade ambiente', 'un', cont('co2'), 'NBR 16401-3');
  add('TERM', 'Termostato digital comunicante (BACnet/Modbus)', 'un', cont('termostato'), '—');
  const ao = b.tot.ao;
  if (ao) add('ATU', 'Atuadores (válvula/damper) e transdutores — conforme lista de pontos [CONFERIR com o projeto de ar-condicionado]', 'un', ao, '—');
  return itens;
}

function calcular(dados) {
  const s = dados.sistema || {};
  const avisos = [];
  const zonas = zonasClimatizacao(dados, s);
  const bms = listaDePontos(dados, s, avisos);
  const efic = eficiencia(dados, s);
  const resid = residencial(dados, avisos);
  if (!bms && !resid && !zonas.length) throw new Error('Cadastre equipamentos (BMS), zonas de climatização ou ambientes residenciais.');
  if (zonas.length) avisos.push('Ar externo pela NBR 16401-3, Tabela 1, nível 1 (Fp e Fa) — conferir o uso de cada zona na norma. [CONFERIR]');
  if (zonas.some(z => z.uso === 'outro')) avisos.push('Zonas com uso "outro": informar Fp e Fa da NBR 16401-3 (ou da NBR 7256 em estabelecimentos de saúde).');
  if (efic) avisos.push(`Economia estimada pelo método dos fatores BAC (EN 15232:2012, uso "${efic.uso}"), substituída pela ISO 52120-1:2022 — estimativa, não substitui medição. [CONFERIR]`);
  if (bms) avisos.push('Pontos por equipamento são típicos de mercado — ajustar à lista de pontos do projeto de ar-condicionado e dos fabricantes. [CONFERIR]');
  const materiais = [...materiaisBms(bms, (dados.zonas || []).filter(z => z.nome), s), ...(resid ? resid.itens : [])];
  return { bms, zonas, efic, resid, materiais, avisos };
}

module.exports = { calcular, classeDe, zonasClimatizacao, br };
