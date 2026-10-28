// Alarme de intrusão monitorado — dimensionamento por ambiente (sensores
// magnéticos, IVP pela cobertura do detector, pet, dupla tecnologia), proteção
// perimetral externa (barreiras IVA / IVP externo), zonas e partições, central
// com expansores e receptor sem fio, repetidores, teclados, sirenes, bateria
// pela autonomia do grau de segurança, comunicação com a central de
// monitoramento e cabeamento.
//
// Não há NBR específica de sistemas de alarme de intrusão: adotam-se como
// referência a IEC 62642 / EN 50131 (graus de segurança, classes ambientais,
// fontes — EN 50131-6, detectores — EN 50131-2-x) e a EN 50136 (transmissão de
// alarme). Valores de consumo, alcance e capacidade de centrais são típicos de
// mercado e saem com [CONFERIR] — usar a ficha técnica do equipamento escolhido.

// EN 50131-1 / EN 50131-6: autonomia mínima da fonte de alimentação secundária
// (bateria recarregada pela própria fonte — tipo A) por grau: 12 h nos graus 1 e 2;
// 60 h nos graus 3 e 4, reduzidos a 30 h quando a falta de rede é notificada a uma
// central de monitoramento (ARC). Antes o grau 2 sem notificação saía com 24 h, valor
// que a norma não traz para o tipo A. [CONFERIR] na edição vigente da norma.
const AUTONOMIA_H = {
  1: { notificado: 12, sem: 12 },
  2: { notificado: 12, sem: 12 },
  3: { notificado: 30, sem: 60 },
  4: { notificado: 30, sem: 60 },
};
// EN 50131-6: recarga da bateria até 80 % da capacidade (h) por grau. [CONFERIR]
const RECARGA_H = { 1: 72, 2: 72, 3: 24, 4: 24 };
// EN 50131-1 / EN 50136-1: categoria mínima do sistema de transmissão (ATS) e
// tempo máximo de transmissão adotado para o ensaio. [CONFERIR] Tabelas 10/11 da EN 50131-1.
const ATS_POR_GRAU = {
  1: { categoria: 'SP1 (ou sem transmissão, só aviso local)', transmissaoS: 240 },
  2: { categoria: 'SP2 ou DP1', transmissaoS: 120 },
  3: { categoria: 'SP4 ou DP2', transmissaoS: 60 },
  4: { categoria: 'SP5 ou DP3', transmissaoS: 20 },
};
// EN 50131-1: combinações mínimas do código de usuário por grau (nº de dígitos). [CONFERIR]
const DIGITOS_SENHA = { 1: 3, 2: 4, 3: 5, 4: 6 };
// EN 50130-5 / EN 50131-1: classes ambientais
const CLASSES_AMBIENTAIS = {
  I: 'Classe I — interior (5 °C a 40 °C)',
  II: 'Classe II — interior geral (-10 °C a 40 °C)',
  III: 'Classe III — exterior abrigado (-25 °C a 50 °C)',
  IV: 'Classe IV — exterior geral (-25 °C a 60 °C)',
};
// EN 50131-1: tempo máximo de entrada adotado no ensaio (s). [CONFERIR]
const TEMPO_ENTRADA_MAX_S = 45;

// Centrais típicas de mercado: zonas na placa, máximo com expansão e partições. [CONFERIR]
const CENTRAIS = [
  { id: 'C16', zonasPlaca: 8, zonasMax: 16, particoes: 2 },
  { id: 'C64', zonasPlaca: 16, zonasMax: 64, particoes: 4 },
  { id: 'C128', zonasPlaca: 16, zonasMax: 128, particoes: 8 },
  { id: 'C256', zonasPlaca: 32, zonasMax: 256, particoes: 16 },
];
const ZONAS_POR_EXPANSOR = 8;
const DISPOSITIVOS_POR_RECEPTOR = 64; // [CONFERIR] capacidade do receptor sem fio
const BATERIAS_AH = [7, 12, 18, 26, 40, 65]; // 12 V seladas (VRLA)
const BATERIA_MAX_GABINETE_AH = 18; // [CONFERIR] maior bateria que cabe no gabinete típico
const FONTES_A = [1, 2, 3, 5, 10];
const FATOR_BATERIA = 1.25; // envelhecimento e fim de vida da bateria [CONFERIR]

// Consumos típicos a 12 V (mA): [repouso, alarme]. Dispositivos sem fio usam pilha própria. [CONFERIR]
const CONSUMO_PADRAO = {
  central: { repouso: 80, alarme: 150 },
  teclado: { repouso: 40, alarme: 60 },
  ivp: { repouso: 12, alarme: 15 },
  ivp_pet: { repouso: 12, alarme: 15 },
  ivp_dupla: { repouso: 25, alarme: 30 },
  ivp_externo: { repouso: 30, alarme: 35 },
  barreira: { repouso: 70, alarme: 70 },
  expansor: { repouso: 25, alarme: 25 },
  receptor: { repouso: 30, alarme: 30 },
  com_ethernet: { repouso: 70, alarme: 90 },
  com_gprs: { repouso: 40, alarme: 250 },
  com_linha: { repouso: 10, alarme: 50 },
  sirene_interna: { repouso: 0, alarme: 250 },
  sirene_externa: { repouso: 0, alarme: 500 },
  sirene_autoalimentada: { repouso: 25, alarme: 25 },
};
const ROTULO_EQUIP = {
  central: 'Central (placa)', teclado: 'Teclado', ivp: 'IVP', ivp_pet: 'IVP pet', ivp_dupla: 'IVP + micro-ondas (dupla tecnologia)',
  ivp_externo: 'IVP externo', barreira: 'Barreira IVA (par TX + RX)', expansor: 'Expansor de zonas', receptor: 'Receptor sem fio',
  com_ethernet: 'Comunicador Ethernet (IP)', com_gprs: 'Comunicador GPRS/4G', com_linha: 'Comunicador por linha telefônica',
  sirene_interna: 'Sirene interna', sirene_externa: 'Sirene externa', sirene_autoalimentada: 'Sirene externa autoalimentada (carga)',
};
const ROTULO_DETECTOR = { ivp: 'IVP', ivp_pet: 'IVP pet', ivp_dupla: 'IVP + MW (dupla tecnologia)', ivp_externo: 'IVP externo' };
const ROTULO_TECNOLOGIA = { com_fio: 'Com fio', sem_fio: 'Sem fio', hibrido: 'Híbrido (janelas sem fio)' };

const n0 = (v) => Math.max(0, Math.round(Number(v) || 0));
const br = (v, c = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const naLista = (lista, v) => lista.find(x => x >= v - 1e-9);

function autonomiaDoGrau(grau, notificado) {
  const t = AUTONOMIA_H[grau] || AUTONOMIA_H[2];
  return notificado ? t.notificado : t.sem;
}

function escolherCentral(zonas, particoes) {
  return CENTRAIS.find(c => c.zonasMax >= zonas && c.particoes >= particoes) || null;
}

// Área coberta por um IVP: setor circular de raio = alcance e ângulo = abertura
function areaCobertaIvp(alcance, abertura) {
  return Math.PI * alcance * alcance * abertura / 360;
}

// Nº de IVP do ambiente: pela área coberta e pela maior dimensão (o alcance
// precisa vencer o comprimento). Risco alto: sobreposição de campos (área
// coberta × 0,5) e no mínimo 2 detectores com campos cruzados. [CONFERIR]
function ivpsDoAmbiente(area, maiorDim, alcance, abertura, riscoAlto) {
  if (!(area > 0)) return 0;
  const cob = areaCobertaIvp(alcance, abertura) * (riscoAlto ? 0.5 : 1);
  const n = Math.max(1, Math.ceil(area / cob - 1e-9), Math.ceil((maiorDim || 0) / alcance - 1e-9));
  return riscoAlto ? Math.max(2, n) : n;
}

// Pares de barreira (ou IVP externos) para um trecho de perímetro: cada trecho
// reto exige ao menos um par; o comprimento total é dividido pelo alcance útil.
function paresPerimetro(comprimento, lados, alcance) {
  if (!(comprimento > 0)) return 0;
  return Math.max(Math.max(1, n0(lados) || 1), Math.ceil(comprimento / alcance - 1e-9));
}

function calcular(dados) {
  const s = dados.sistema || {};
  const avisos = [];
  const grau = Math.min(4, Math.max(1, n0(s.grau) || 2));
  const classeAmbiental = CLASSES_AMBIENTAIS[s.classe_ambiental] ? s.classe_ambiental : 'II';
  const tecnologia = ROTULO_TECNOLOGIA[s.tecnologia] ? s.tecnologia : 'com_fio';
  const monitorado = s.monitorado !== false;
  const meios = [s.com_ethernet && 'ethernet', s.com_gprs && 'gprs', s.com_linha && 'linha'].filter(Boolean);
  const notificado = monitorado && meios.length > 0;
  const alcance = Number(s.ivp_alcance_m) || 12;
  const abertura = Number(s.ivp_abertura_graus) || 90;
  const alcanceExt = Number(s.ivp_externo_alcance_m) || 12;
  // reserva de zonas: vazio → 20 %; texto/negativo → 20 % com aviso (antes virava NaN em todo o documento)
  const reservaInf = s.reserva_zonas_pct == null || s.reserva_zonas_pct === '' ? 20 : Number(String(s.reserva_zonas_pct).replace(',', '.'));
  const reservaOk = Number.isFinite(reservaInf) && reservaInf >= 0;
  const reserva = (reservaOk ? reservaInf : 20) / 100;
  if (!reservaOk) avisos.push(`Reserva de zonas "${s.reserva_zonas_pct}" não é um percentual válido — adotados 20 %.`);
  const agrupar = s.agrupar_magneticos !== false && tecnologia !== 'sem_fio';
  const modoJanelas = s.magneticos_janelas || 'acessiveis';
  const porPorta = s.magnetico_por_porta == null || s.magnetico_por_porta === '' ? 1 : n0(s.magnetico_por_porta);
  const porJanela = s.magnetico_por_janela == null || s.magnetico_por_janela === '' ? 1 : n0(s.magnetico_por_janela);
  const distMedia = Number(s.distancia_media_m) || 15;
  const fatorCabo = Number(s.fator_cabo) || 1.3;
  const sobra = 2;
  const areaRadio = Number(s.area_radio_m2) || 300;
  const peMaxIvp = Number(s.ivp_altura_max_m) || 3.6;
  const autoalimentada = grau >= 3 || !!s.sirene_autoalimentada;
  const consumo = { ...CONSUMO_PADRAO };
  for (const k of Object.keys(CONSUMO_PADRAO)) {
    const c = (s.consumos || {})[k];
    if (c && ((c.repouso != null && c.repouso !== '') || (c.alarme != null && c.alarme !== ''))) {
      consumo[k] = { repouso: Number(c.repouso ?? CONSUMO_PADRAO[k].repouso), alarme: Number(c.alarme ?? CONSUMO_PADRAO[k].alarme) };
    }
  }
  const semFio = (tipo) => tecnologia === 'sem_fio' || (tecnologia === 'hibrido' && tipo === 'janela');
  const corrida = (d = distMedia, extra = 0) => d * fatorCabo + sobra + extra;

  const zonas = [];
  const novaZona = (z) => zonas.push({ ...z, id: `Z${String(zonas.length + 1).padStart(2, '0')}` });

  // ── Ambientes ──
  const ambientes = (dados.ambientes || []).filter(a => a && a.nome && Number(a.area_m2) > 0).map(a => {
    const area = Number(a.area_m2);
    const maiorDim = Number(a.maior_dimensao_m) || Math.sqrt(area);
    if (!(Number(a.maior_dimensao_m) > 0)) avisos.push(`${a.nome}: maior dimensão não informada — adotado √área = ${br(maiorDim)} m. [CONFERIR]`);
    const pe = Number(a.pe_direito_m) || 2.8;
    const externo = !!a.externo;
    const riscoAlto = a.risco === 'alto';
    const particao = Math.max(1, n0(a.particao) || 1);
    const tipoIvp = externo ? 'ivp_externo' : riscoAlto ? 'ivp_dupla' : a.animais ? 'ivp_pet' : 'ivp';
    const manual = a.ivp_manual != null && a.ivp_manual !== '' ? n0(a.ivp_manual) : null;
    const ivps = a.protecao_volumetrica === false ? 0 : manual != null ? manual : ivpsDoAmbiente(area, maiorDim, externo ? alcanceExt : alcance, abertura, riscoAlto);
    if (!externo && ivps && pe > peMaxIvp) avisos.push(`${a.nome}: pé-direito de ${br(pe)} m acima de ${br(peMaxIvp)} m — IVP de parede perde cobertura; usar IVP de teto ou de longo alcance e conferir com o fabricante. [CONFERIR]`);
    if (riscoAlto && grau >= 3) avisos.push(`${a.nome}: risco alto em grau ${grau} — detectores com antimascaramento (EN 50131-2-4).`);
    if (a.animais && riscoAlto) avisos.push(`${a.nome}: risco alto com animais — dupla tecnologia pet ou exclusão do animal do ambiente quando armado. [CONFERIR]`);
    const portas = n0(a.portas);
    const janelas = n0(a.janelas);
    const janelasProtegidas = modoJanelas === 'nenhuma' ? 0 : modoJanelas === 'todas' || a.janelas_acessiveis !== false ? janelas : 0;
    const magPortas = portas * porPorta;
    const magJanelas = janelasProtegidas * porJanela;

    // zonas do ambiente
    const inicio = zonas.length;
    const tipoPorta = a.acesso_principal ? 'temporizada' : 'instantânea';
    for (const [qtd, tipo, rot, zTipo] of [[magPortas, 'porta', 'porta', tipoPorta], [magJanelas, 'janela', 'janela', 'instantânea']]) {
      if (!qtd) continue;
      const sf = semFio(tipo);
      if (agrupar && !sf) {
        novaZona({ ambiente: a.nome, particao, dispositivo: `Magnético ${rot}${qtd > 1 ? ` (${qtd} em série)` : ''}`, equipamento: 'magnetico', sensores: qtd, semFio: false, tipo: zTipo, cabo: corrida(distMedia, (qtd - 1) * 3) });
      } else {
        for (let k = 0; k < qtd; k++) novaZona({ ambiente: a.nome, particao, dispositivo: `Magnético ${rot} ${k + 1}`, equipamento: 'magnetico', sensores: 1, semFio: sf, tipo: zTipo, cabo: sf ? 0 : corrida() });
      }
    }
    for (let k = 0; k < ivps; k++) {
      const sf = semFio('ivp') && !externo;
      novaZona({ ambiente: a.nome, particao, dispositivo: `${ROTULO_DETECTOR[tipoIvp]}${ivps > 1 ? ` ${k + 1}` : ''}`, equipamento: tipoIvp, sensores: 1, semFio: sf, tipo: a.acesso_principal ? 'seguidora' : 'instantânea', cabo: sf ? 0 : corrida() });
    }
    return { ...a, area, maiorDim, pe, externo, riscoAlto, particao, tipoIvp, ivps, portas, janelas, janelasProtegidas, magPortas, magJanelas, magneticos: magPortas + magJanelas, zonas: zonas.length - inicio };
  });
  if (!ambientes.length) throw new Error('Cadastre ao menos um ambiente com área.');

  // ── Áreas externas (perímetro) ──
  const externas = (dados.areas_externas || []).filter(e => e && Number(e.comprimento_m) > 0).map(e => {
    const tipo = e.tipo === 'ivp_externo' ? 'ivp_externo' : 'barreira';
    const alc = Number(e.alcance_m) || (tipo === 'barreira' ? 30 : alcanceExt);
    const qtd = paresPerimetro(Number(e.comprimento_m), e.lados, alc);
    const particao = Math.max(1, n0(e.particao) || 1);
    const dist = Number(e.distancia_central_m) || distMedia;
    for (let k = 0; k < qtd; k++) {
      novaZona({ ambiente: e.nome, particao, dispositivo: tipo === 'barreira' ? `Barreira IVA par ${k + 1}` : `IVP externo ${k + 1}`, equipamento: tipo, sensores: 1, semFio: false, tipo: 'instantânea', cabo: corrida(dist) * (tipo === 'barreira' ? 2 : 1) });
    }
    if (tipo === 'barreira' && alc > 60) avisos.push(`${e.nome}: alcance útil de ${alc} m por par — em área externa usar no máximo a metade do alcance nominal do fabricante (neblina, chuva). [CONFERIR]`);
    return { ...e, tipo, alcance: alc, qtd, particao, dist, comprimento: Number(e.comprimento_m) };
  });
  if (externas.length && classeAmbiental !== 'IV') avisos.push('Há proteção perimetral externa: detectores externos devem ser classe ambiental IV (EN 50131-1), independentemente da classe dos internos.');

  // ── Pânico / coação ──
  const panico = n0(s.botoes_panico);
  for (let k = 0; k < panico; k++) novaZona({ ambiente: 'Botão de pânico', particao: 1, dispositivo: `Botão de pânico ${k + 1}`, equipamento: 'panico', sensores: 1, semFio: tecnologia === 'sem_fio', tipo: '24 h (silenciosa)', cabo: tecnologia === 'sem_fio' ? 0 : corrida() });

  // ── Partições, zonas e central ──
  const particoesUsadas = Math.max(1, ...ambientes.map(a => a.particao), ...externas.map(e => e.particao));
  const particoes = Math.max(n0(s.particoes) || 1, particoesUsadas);
  const nZonas = zonas.length;
  const zonasComReserva = Math.ceil(nZonas * (1 + reserva) - 1e-9);
  const zonasFio = zonas.filter(z => !z.semFio).length;
  const zonasFioReserva = Math.ceil(zonasFio * (1 + reserva) - 1e-9);
  const dispSemFio = zonas.filter(z => z.semFio).length + n0(s.controles_remotos);
  let central = escolherCentral(zonasComReserva, particoes);
  if (!central) {
    central = CENTRAIS[CENTRAIS.length - 1];
    avisos.push(`${zonasComReserva} zonas (com reserva) ou ${particoes} partições acima da maior central típica (${central.zonasMax} zonas) — dividir em mais de uma central ou usar central de grande porte endereçável. [CONFERIR]`);
  }
  const expansores = Math.max(0, Math.ceil((zonasFioReserva - central.zonasPlaca) / ZONAS_POR_EXPANSOR));
  const receptores = dispSemFio ? Math.ceil(dispSemFio * (1 + reserva) / DISPOSITIVOS_POR_RECEPTOR) : 0;
  const areaSemFio = ambientes.filter(a => zonas.some(z => z.semFio && z.ambiente === a.nome)).reduce((t, a) => t + a.area, 0);
  const repetidores = dispSemFio && areaSemFio ? Math.max(0, Math.ceil(areaSemFio / areaRadio - 1e-9) - 1) + n0(s.repetidores_extra) : 0;
  if (dispSemFio && grau >= 3) avisos.push(`Dispositivos sem fio em grau ${grau}: exigem supervisão de presença e detecção de interferência (jamming) da EN 50131-5-3 — conferir a certificação do equipamento.`);

  // ── Comando e aviso ──
  const acessos = ambientes.filter(a => a.acesso_principal).length;
  const teclados = Math.max(particoes, acessos, 1) + n0(s.teclados_extra);
  const sirenesInternas = Math.max(1, particoes) + n0(s.sirenes_internas_extra);
  const sirenesExternas = s.sirenes_externas == null || s.sirenes_externas === '' ? 1 : n0(s.sirenes_externas);
  if (!sirenesExternas && grau >= 2 && !notificado) avisos.push('Sem sirene externa e sem transmissão a central de monitoramento — os graus 2 a 4 exigem aviso remoto e/ou dispositivos de aviso conforme as opções de notificação da EN 50131-1. [CONFERIR]');

  // ── Comunicação ──
  const ats = ATS_POR_GRAU[grau];
  if (monitorado && !meios.length) avisos.push('Sistema marcado como monitorado, mas sem meio de comunicação (Ethernet, GPRS/4G ou linha) — escolha ao menos um.');
  if (monitorado && meios.length === 1 && grau >= 3) avisos.push(`Grau ${grau} com um único meio de comunicação: a categoria ${ats.categoria} (EN 50136-1) normalmente exige dupla via (ex.: Ethernet + 4G) para atingir o intervalo de supervisão. [CONFERIR]`);
  if (meios.length === 1 && meios[0] === 'linha') avisos.push('Comunicação só por linha telefônica fixa: via sujeita a corte e em descontinuação em muitas localidades — preferir IP + 4G. [CONFERIR]');

  // ── Alimentação: bateria pela autonomia do grau ──
  const autonomiaH = Number(s.autonomia_h) > 0 ? Number(s.autonomia_h) : autonomiaDoGrau(grau, notificado);
  const tAlarmeMin = Number(s.tempo_alarme_min) > 0 ? Number(s.tempo_alarme_min) : 15;
  const cont = { central: 1, teclado: teclados };
  zonas.filter(z => !z.semFio && CONSUMO_PADRAO[z.equipamento]).forEach(z => { cont[z.equipamento] = (cont[z.equipamento] || 0) + 1; });
  if (expansores) cont.expansor = expansores;
  if (receptores) cont.receptor = receptores;
  meios.forEach(m => { cont[`com_${m}`] = 1; });
  cont.sirene_interna = sirenesInternas;
  if (sirenesExternas) cont[autoalimentada ? 'sirene_autoalimentada' : 'sirene_externa'] = sirenesExternas;
  const linhasBateria = Object.entries(cont).filter(([, q]) => q > 0).map(([k, qtd]) => ({
    equipamento: ROTULO_EQUIP[k], chave: k, qtd, repouso: consumo[k].repouso, alarme: consumo[k].alarme,
    totalRepouso: qtd * consumo[k].repouso, totalAlarme: qtd * consumo[k].alarme,
  }));
  const iRepouso = linhasBateria.reduce((t, l) => t + l.totalRepouso, 0);
  const iAlarme = linhasBateria.reduce((t, l) => t + l.totalAlarme, 0);
  // C (Ah) = fator × (I_repouso × T_autonomia + I_alarme × t_alarme) / 1000
  const bateriaAh = FATOR_BATERIA * (iRepouso * autonomiaH + iAlarme * tAlarmeMin / 60) / 1000;
  const maior = BATERIAS_AH[BATERIAS_AH.length - 1];
  const bateriaEscolhida = naLista(BATERIAS_AH, bateriaAh) || maior;
  const nBaterias = bateriaAh > maior ? Math.ceil(bateriaAh / maior) : 1;
  const recargaH = RECARGA_H[grau];
  // fonte (regime contínuo): alimenta o repouso e recarrega 80 % da bateria no prazo do grau
  // (EN 50131-6). Em alarme (sirenes), a bateria complementa a fonte durante o tempo de alarme.
  const iRecarga = 0.8 * bateriaEscolhida * nBaterias / recargaH;
  const fonteA = iRepouso / 1000 + iRecarga;
  const fonteEscolhida = naLista(FONTES_A, fonteA) || Math.ceil(fonteA);
  const fonteCentral = Number(s.fonte_central_a) || 1.5;
  const fonteAux = fonteA > fonteCentral ? naLista(FONTES_A, fonteA - fonteCentral) || Math.ceil(fonteA - fonteCentral) : 0;
  if (bateriaEscolhida * nBaterias > BATERIA_MAX_GABINETE_AH) avisos.push(`Bateria de ${bateriaEscolhida * nBaterias} Ah não cabe no gabinete típico da central (até ${BATERIA_MAX_GABINETE_AH} Ah) — dividir a carga com fonte auxiliar supervisionada com bateria própria (EN 50131-6). [CONFERIR]`);
  if (fonteAux) avisos.push(`Fonte necessária de ${br(fonteA, 2)} A acima da fonte da central (${br(fonteCentral, 1)} A adotados) — prever fonte auxiliar supervisionada de ${fonteAux} A para barreiras e detectores externos. [CONFERIR]`);
  if (autoalimentada && sirenesExternas) avisos.push(`Sirene externa autoalimentada (bateria própria e tamper) — exigida nos graus 3 e 4 (EN 50131-4)${grau < 3 ? ', adotada por escolha do projeto' : ''}.`);

  // ── Cabeamento e infraestrutura ──
  const corridaTeclado = corrida();
  const cabo4 = Math.ceil(zonas.reduce((t, z) => t + (z.cabo || 0), 0) + teclados * corridaTeclado);
  const cabo2 = Math.ceil((sirenesInternas + sirenesExternas) * corrida());
  const infra = Math.ceil((cabo4 + cabo2) * (Number(s.fator_infra) || 0.5));
  // queda de tensão no ramal da sirene externa (pior caso de corrente): 2 · L · I · ρ / S
  const quedaSireneV = sirenesExternas && !autoalimentada ? 2 * corrida() * (consumo.sirene_externa.alarme / 1000) * 0.0175 / 0.75 : 0;
  if (quedaSireneV > 1.2) avisos.push(`Queda de tensão de ${br(quedaSireneV, 2)} V no ramal da sirene externa (cabo 0,75 mm²) — aumentar a seção. [CONFERIR]`);

  // ── Materiais ──
  const contaEquip = (eq, sf) => zonas.filter(z => z.equipamento === eq && z.semFio === sf).reduce((t, z) => t + z.sensores, 0);
  const sufixo = (sf) => (sf ? 'sem fio, com bateria de lítio,' : 'com fio');
  const mat = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => { if (quantidade > 0) mat.push({ codigo, descricao, unidade, quantidade, referencia }); };
  const descCentral = `Central de alarme monitorável ${central.zonasMax} zonas, ${central.particoes} partições (${central.zonasPlaca} zonas na placa)${s.central_modelo ? ` — ${s.central_modelo}` : ''}, grau ${grau}`;
  add('CENTRAL', descCentral, 'un', 1, `EN 50131-3 · ${zonasComReserva} zonas com reserva`);
  add('EXP', `Expansor de ${ZONAS_POR_EXPANSOR} zonas com fio para central de alarme`, 'un', expansores, `${zonasFioReserva} zonas com fio`);
  add('RX', `Receptor/módulo sem fio para central de alarme (até ${DISPOSITIVOS_POR_RECEPTOR} dispositivos)`, 'un', receptores, 'EN 50131-5-3');
  add('REP', 'Repetidor de sinal sem fio para alarme (com fonte e bateria)', 'un', repetidores, `${br(areaSemFio, 0)} m² com dispositivos sem fio`);
  add('TEC', 'Teclado LCD para central de alarme', 'un', teclados, `${particoes} partição(ões) · ${acessos} acesso(s)`);
  for (const sf of [false, true]) {
    add('MAG', `Sensor magnético de abertura ${sufixo(sf)} (porta/janela)`, 'un', contaEquip('magnetico', sf), 'EN 50131-2-6');
    add('IVP', `Sensor infravermelho passivo (IVP) ${sufixo(sf)}, ${alcance} m / ${abertura}°`, 'un', contaEquip('ivp', sf), 'EN 50131-2-2');
    add('IVP-PET', `Sensor infravermelho passivo (IVP) pet ${sufixo(sf)}, imune a animais até 20 kg [CONFERIR]`, 'un', contaEquip('ivp_pet', sf), 'EN 50131-2-2');
    add('IVP-DT', `Sensor de dupla tecnologia (IVP + micro-ondas) ${sufixo(sf)}${grau >= 3 ? ' com antimascaramento' : ''}`, 'un', contaEquip('ivp_dupla', sf), 'EN 50131-2-4');
    add('PANICO', `Botão de pânico ${sufixo(sf)}`, 'un', contaEquip('panico', sf), 'Zona 24 h');
  }
  add('IVP-EXT', `Sensor infravermelho passivo externo (IP65, classe ambiental IV), ${alcanceExt} m`, 'un', contaEquip('ivp_externo', false), 'EN 50131-2-2 · classe IV');
  for (const e of externas.filter(x => x.tipo === 'barreira')) add('IVA', `Barreira infravermelha ativa (IVA) externa ${e.feixes || 4} feixes, alcance nominal ≥ ${Math.ceil(e.alcance * 2)} m (par TX + RX) — ${e.nome}`, 'par', e.qtd, `${e.comprimento} m · ${e.alcance} m úteis por par`);
  add('SIR-INT', 'Sirene piezoelétrica interna 12 V 110 dB', 'un', sirenesInternas, 'EN 50131-4');
  add('SIR-EXT', autoalimentada ? 'Sirene externa autoalimentada com bateria e tamper 12 V 120 dB' : 'Sirene externa 12 V 120 dB com proteção contra intempérie', 'un', sirenesExternas, 'EN 50131-4');
  add('CTRL', 'Controle remoto para central de alarme', 'un', n0(s.controles_remotos), '—');
  if (meios.includes('ethernet')) add('COM-IP', 'Módulo de comunicação Ethernet (IP) para central de alarme — Contact ID / SIA DC-09', 'un', 1, 'EN 50136-1 · SIA DC-09');
  if (meios.includes('gprs')) add('COM-4G', 'Módulo comunicador GPRS/4G para central de alarme (com chip M2M)', 'un', 1, 'EN 50136-1');
  if (meios.includes('linha')) add('COM-LT', 'Comunicador/discadora por linha telefônica (Contact ID)', 'un', 1, 'SIA DC-05 (Contact ID)');
  add('BAT', `Bateria selada 12 V ${bateriaEscolhida} Ah (VRLA)`, 'un', nBaterias, `${br(bateriaAh, 1)} Ah para ${autonomiaH} h (EN 50131-6)`);
  if (fonteAux) add('FONTE', `Fonte auxiliar supervisionada 13,8 V ${fonteAux} A com gabinete para bateria`, 'un', 1, 'EN 50131-6');
  add('CABO4', 'Cabo para alarme 4 vias 24 AWG (4 × 0,20 mm²) [CONFERIR bitola nos ramais longos]', 'm', cabo4, `${br(distMedia, 0)} m médios × ${br(fatorCabo, 2)}`);
  add('CABO2', 'Cabo paralelo 2 × 0,75 mm² para sirenes', 'm', cabo2, '—');
  add('INFRA', 'Eletroduto flexível/canaleta 3/4" com acessórios para cabos de alarme', 'm', infra, `≈ ${Math.round((Number(s.fator_infra) || 0.5) * 100)} % do cabo [CONFERIR]`);
  add('CX', 'Caixa 4×2 para teclado', 'un', teclados, '—');
  add('DPS-AC', 'DPS classe II 275 V para a alimentação da central (circuito exclusivo)', 'un', 1, 'NBR 5410 · NBR 5419-4');
  if (meios.includes('ethernet') || meios.includes('linha')) add('DPS-SIN', `DPS de sinal para ${meios.includes('ethernet') ? 'rede RJ-45' : 'linha telefônica'} do comunicador`, 'un', 1, 'NBR 5419-4');
  add('PLACA', 'Placa/adesivo de advertência "imóvel protegido por alarme monitorado"', 'un', Math.max(1, sirenesExternas), 'Dissuasão');

  avisos.push('Consumos, alcances e capacidades de central típicos de mercado — conferir com a ficha técnica dos equipamentos escolhidos. [CONFERIR]');
  const nSensores = zonas.filter(z => z.equipamento !== 'panico').reduce((t, z) => t + z.sensores, 0);
  return {
    grau, classeAmbiental, tecnologia, monitorado, meios, notificado, ats, digitosSenha: DIGITOS_SENHA[grau],
    alcance, abertura, areaCoberta: areaCobertaIvp(alcance, abertura), agrupar,
    ambientes, externas, zonas, nZonas, zonasComReserva, zonasFio, zonasFioReserva, reserva, particoes, central, expansores, receptores,
    dispSemFio, areaSemFio, repetidores, teclados, acessos, sirenesInternas, sirenesExternas, autoalimentada, panico,
    nIvp: ambientes.reduce((t, a) => t + a.ivps, 0), nMag: ambientes.reduce((t, a) => t + a.magneticos, 0), nSensores,
    nBarreiras: externas.filter(e => e.tipo === 'barreira').reduce((t, e) => t + e.qtd, 0), nIvpExt: externas.filter(e => e.tipo === 'ivp_externo').reduce((t, e) => t + e.qtd, 0),
    bateria: { autonomiaH, tAlarmeMin, linhas: linhasBateria, iRepouso, iAlarme, bateriaAh, bateriaEscolhida, nBaterias, recargaH, iRecarga, fonteA, fonteEscolhida, fonteCentral, fonteAux, fator: FATOR_BATERIA },
    cabo4, cabo2, infra, quedaSireneV, materiais: mat, avisos,
  };
}

module.exports = {
  calcular, autonomiaDoGrau, escolherCentral, areaCobertaIvp, ivpsDoAmbiente, paresPerimetro,
  AUTONOMIA_H, ATS_POR_GRAU, DIGITOS_SENHA, CLASSES_AMBIENTAIS, CENTRAIS, TEMPO_ENTRADA_MAX_S, RECARGA_H, ROTULO_DETECTOR, ROTULO_TECNOLOGIA, CONSUMO_PADRAO,
};
