// Telefonia e interfonia — dimensionamento de ramais (com reserva), central de
// interfonia/portaria e placas de ramais pela capacidade, PABX IP (licenças SIP,
// gateways FXS/FXO), terminais, porteiros e terminais de portaria, cabos
// (CCI por unidade, CI de prumada por pavimento com reserva de pares), blocos
// IDC-110/BLI de 10 pares no DG e nas caixas de andar, DPS de linha,
// aterramento, nobreak (consumo × autonomia) e, quando IP, rede PoE com o
// limite de 90 m do cabo horizontal (NBR 14565).
//
// Referências: práticas Telebrás e ABNT de tubulação telefônica em edifícios
// (NBR 13726/13727/13822 [CONFERIR vigência]), ABNT NBR 14565:2019
// (cabeamento estruturado), ABNT NBR 14306 (proteção elétrica e
// compatibilidade eletromagnética em redes internas de telecomunicações
// [CONFERIR vigência]), ABNT NBR 5410 (6.3.5 DPS, 6.4 equipotencialização),
// ABNT NBR 5419-4 (DPS em linhas de sinal). Capacidades de centrais e placas,
// consumos e potências PoE são típicos de mercado e saem com [CONFERIR] —
// usar a ficha técnica do equipamento escolhido.

const TIPOS_SISTEMA = {
  analogica: 'Interfonia analógica (central de portaria)',
  ip: 'PABX IP (ramais SIP)',
  hibrido: 'Híbrido — PABX IP com gateway FXS para os ramais analógicos',
};
const TOPOLOGIAS = {
  prumada: 'Prumada: cabo CI do DG à caixa de cada andar + cabo CCI da caixa à unidade',
  direta: 'Direta: cabo CCI do DG até cada unidade (prédio pequeno / retrofit)',
};
const FECHADURAS = { nenhuma: 'Sem fechadura', existente: 'Fechadura existente (só ligação)', nova: 'Fechadura nova (fornecer)' };

// Centrais analógicas de interfonia/portaria (capacidade máxima de ramais e
// consumo típico em W) [CONFERIR modelo e capacidade com o fabricante]
const CENTRAIS = [
  { ramais: 16, modular: false, rotulo: 'Central de interfonia compacta até 16 ramais (tipo Intelbras Comunic 16)', w: 15 },
  { ramais: 48, modular: true, rotulo: 'Central de interfonia modular até 48 ramais (tipo Intelbras Comunic 48)', w: 25 },
  { ramais: 112, modular: true, rotulo: 'Central de portaria modular até 112 ramais (tipo Intelbras CP 112)', w: 30 },
  { ramais: 192, modular: true, rotulo: 'Central de portaria modular até 192 ramais (tipo Intelbras CP 192)', w: 40 },
];
// PABX IP (appliance/servidor) por capacidade de ramais SIP [CONFERIR]
const PABX_IP = [
  { ramais: 60, rotulo: 'PABX IP (appliance) até 60 ramais SIP', w: 30 },
  { ramais: 200, rotulo: 'PABX IP (appliance) até 200 ramais SIP', w: 40 },
  { ramais: 500, rotulo: 'PABX IP (appliance/servidor) até 500 ramais SIP', w: 60 },
  { ramais: 1000, rotulo: 'PABX IP (servidor) até 1.000 ramais SIP', w: 120 },
];
const GW_FXS = [8, 16, 24, 32]; // portas FXS por gateway [CONFERIR]
const GW_FXO = [2, 4, 8]; // portas FXO por gateway [CONFERIR]
const LINHAS_PLACA_TRONCO = 4; // linhas por placa de tronco da central analógica [CONFERIR]
const CI_PARES = [10, 20, 30, 50, 75, 100, 200]; // cabo CI-50 (pares)
const PARES_POR_RAMAL = 1; // ramal analógico de interfonia = 1 par
const PARES_BLOCO = 10; // bloco IDC-110 / BLI de 10 pares
const BLOCOS_POR_SUPORTE = 10; // suporte/bastidor para até 10 blocos [CONFERIR]
const PARES_PORTEIRO = 4; // porteiro: áudio + chamada + comando da fechadura (CCI 4 pares)
const FATOR_CABO = 1.15; // folgas, curvas e subidas
const FOLGA_CI = 2; // m por cabo de prumada (arremate no DG e na caixa do andar)
const DESCIDA_PADRAO = 3; // m — descida até o terminal em áreas comuns, portaria e portões
const JUMPER_M = 1.5; // m de fio jumper por cruzamento no DG [CONFERIR]
const LIMITE_UTP = 90; // m — cabo horizontal (NBR 14565)
const LIMITE_CCI = 500; // m — alcance prático do ramal analógico [CONFERIR com o fabricante]
const PORTAS_PATCH = 24;
const RACKS_U = [6, 8, 12, 16, 24, 32, 36, 40, 44];
// Consumo / PoE típicos (W) [CONFERIR]
const W_PLACA = 4;
const W_GATEWAY = 15;
const W_SWITCH = 20;
const W_TERMINAL_IP = 4;
const W_PORTARIA_IP = 6;
const W_PORTEIRO_IP = 8;
// Nobreak
const FP_NOBREAK = 0.7;
const MARGEM_NOBREAK = 1.25;
const EFICIENCIA = 0.85;
const TENSAO_BATERIA = 12;
const FATOR_BATERIA = 1.25; // envelhecimento/temperatura [CONFERIR]
const NOBREAKS_VA = [600, 1000, 1200, 1500, 2000, 3000];
const BATERIAS_AH = [7, 9, 18, 26, 40, 60, 100];

const br = (v, c = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const sim = (v) => v === true || v === 'true' || v === 'sim' || v === 1 || v === '1';
const nao = (v) => v === false || v === 'false' || v === 'nao' || v === 'não' || v === 0 || v === '0';
const numOu = (v, padrao) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? padrao : Number(v));
const pad2 = (n) => String(n).padStart(2, '0');

function comercial(lista, necessario) {
  const v = lista.find(x => x >= necessario);
  if (v) return { qtd: 1, valor: v };
  const maior = lista[lista.length - 1];
  const qtd = Math.ceil(necessario / maior);
  return { qtd, valor: lista.find(x => x * qtd >= necessario) || maior };
}

function nobreakPara(local, cargaW, autonomiaH) {
  const vaNec = cargaW / FP_NOBREAK * MARGEM_NOBREAK;
  const nb = comercial(NOBREAKS_VA, vaNec);
  const whNec = cargaW * autonomiaH / EFICIENCIA;
  const ahNec = whNec / TENSAO_BATERIA * FATOR_BATERIA;
  const bat = autonomiaH > 0 ? comercial(BATERIAS_AH, ahNec) : { qtd: 0, valor: 0 };
  return { local, cargaW, vaNec, va: nb.valor, nNobreaks: nb.qtd, whNec, ahNec, bateriaAh: bat.valor, nBaterias: bat.qtd };
}

function calcular(dados) {
  const s = dados.sistema || {};
  const avisos = [];
  const ncsProjeto = [];
  const tipo = TIPOS_SISTEMA[s.tipo] ? s.tipo : 'analogica';
  const ip = tipo === 'ip';
  const hibrido = tipo === 'hibrido';
  const analogica = tipo === 'analogica';
  const topologia = TOPOLOGIAS[s.topologia] ? s.topologia : 'prumada';
  const f = numOu(s.fator_cabo, FATOR_CABO) || FATOR_CABO;
  const reserva = numOu(s.reserva_pct, 20) / 100;
  const reservaPares = numOu(s.reserva_pares_pct, 20) / 100;
  const rPadrao = Math.max(1, Math.round(numOu(s.ramais_por_unidade, 1)));
  const capPlaca = numOu(s.ramais_por_placa, 16) || 16;
  const paresCci = s.cabo_ramal === 'cci4' ? 4 : 2;
  const autonomiaH = numOu(s.autonomia_h, 4);
  const comNobreak = !nao(s.nobreak);
  const comDps = !nao(s.dps_linha);
  const infraExistente = sim(s.infra_existente);
  const portasSw = numOu(s.portas_switch, 24) || 24;
  const terminaisPortaria = Math.max(0, Math.round(numOu(s.terminais_portaria, 1)));
  const dPortaria = numOu(s.distancia_portaria_m, 10);
  const troncos = Math.max(0, Math.round(numOu(s.troncos, 0)));
  const tipoTronco = s.tipo_tronco === 'sip' ? 'sip' : 'analogico';
  const ambienteTerminal = s.ambiente_terminal || 'Cozinha';
  const localDg = s.local_dg || 'Sala técnica / DG';
  const localPortaria = s.local_portaria || 'Portaria';
  const cabo = ip ? 'U/UTP Cat 6' : `CCI-50 ${paresCci} pares`;

  const blocosIn = (dados.blocos || []).filter(b => b && Number(b.pavimentos) > 0 && Number(b.unidades_por_pavimento) > 0);
  if (!blocosIn.length) throw new Error('Cadastre ao menos um bloco/torre com pavimentos e unidades por pavimento.');
  const multiBloco = blocosIn.length > 1;
  const ambientes = [];
  const ramaisLista = [];

  // ── Blocos, pavimentos e unidades ──
  const blocos = blocosIn.map((b, ib) => {
    const nome = b.nome || `Bloco ${ib + 1}`;
    const nPav = Math.round(Number(b.pavimentos));
    const upp = Math.round(Number(b.unidades_por_pavimento));
    const h = numOu(b.pe_direito_m, 2.9) || 2.9;
    const dDg = numOu(b.distancia_dg_m, 20);
    const dUn = numOu(b.distancia_media_unidade_m, 15);
    const r = Math.max(1, Math.round(numOu(b.ramais_por_unidade, rPadrao)));
    const p0 = Math.round(numOu(b.primeiro_pavimento, 1));
    const rotaExterna = sim(b.rota_externa);
    // DG no térreo (pavimento 0): altura até o pavimento = |pav| × pé-direito (subsolo desce,
    // pavimento sobe). Antes o subsolo ficava com altura 0 (cabo CI sem a descida).
    const pTopo = p0 + nPav - 1;
    const alturaMax = Math.max(Math.abs(p0), Math.abs(pTopo)) * h;
    const alturaPrumada = (Math.max(0, pTopo) + Math.max(0, -p0)) * h; // trecho que sobe + trecho que desce
    // IP: switch no próprio bloco se o ponto mais distante passa de 90 m ou se o
    // bloco é outra edificação (interligação por fibra, sem cobre entre prédios)
    const maxCentral = (dDg + alturaMax + dUn) * f + h;
    const switchLocal = ip && (rotaExterna || maxCentral > LIMITE_UTP);
    if (switchLocal && (alturaMax + dUn) * f + h > LIMITE_UTP) avisos.push(`${nome}: mesmo com switch na base da prumada, o ponto mais alto fica a ${br((alturaMax + dUn) * f + h, 0)} m (> 90 m, NBR 14565) — prever switch por grupo de pavimentos. [CONFERIR]`);

    const pavimentos = [];
    for (let k = 0; k < nPav; k++) {
      const pav = p0 + k;
      const altura = Math.abs(pav) * h;
      // comprimento de cada cabo de ramal (um por ramal)
      let compRamal;
      if (ip) compRamal = ((switchLocal ? 0 : dDg) + altura + dUn) * f + h;
      else if (topologia === 'direta') compRamal = (dDg + altura + dUn) * f + h;
      else compRamal = dUn * f + h;
      if (!ip && compRamal > LIMITE_CCI) avisos.push(`${nome}, pav. ${pav}: ramal com ${br(compRamal, 0)} m de cabo CCI — acima do alcance prático de ${LIMITE_CCI} m do ramal analógico. [CONFERIR com o fabricante]`);
      // prumada (CI) por pavimento, com reserva de pares
      let paresNec = 0;
      let ci = null;
      let compCi = 0;
      let blocosIdc = 0;
      if (!ip && topologia === 'prumada') {
        paresNec = Math.ceil(upp * r * PARES_POR_RAMAL * (1 + reservaPares) - 1e-9);
        ci = comercial(CI_PARES, paresNec);
        compCi = (dDg + altura) * f + FOLGA_CI;
        blocosIdc = Math.max(Math.ceil(ci.qtd * ci.valor / PARES_BLOCO), Math.ceil(upp * r * paresCci / PARES_BLOCO));
      }
      const unidades = [];
      for (let j = 1; j <= upp; j++) {
        // subsolo n: unidade S{n}{jj} e ramal 9{n}{jj} (antes todos os subsolos e o térreo
        // repetiam T{jj} e o ramal 0{jj} — ramais duplicados na central)
        const rotulo = pav < 0 ? `S${-pav}${pad2(j)}` : pav === 0 ? `T${pad2(j)}` : `${pav}${pad2(j)}`;
        const base = `${multiBloco ? ib + 1 : ''}${pav < 0 ? `9${-pav}` : pav}${pad2(j)}`;
        const numeros = r > 1 ? Array.from({ length: r }, (_, x) => `${base}${x + 1}`) : [base];
        const nomeAmb = multiBloco ? `${nome} — ${rotulo}` : `Unidade ${rotulo}`;
        numeros.forEach(n => ramaisLista.push({ ramal: n, bloco: nome, pavimento: pav, local: `Unidade ${rotulo}`, tipo: 'Unidade', terminal: ip ? 'Telefone IP' : 'Terminal dedicado', cabo, comprimento_m: compRamal }));
        const amb = { nome: nomeAmb, tipo: 'unidade', bloco: nome, pavimento: pav, unidade: rotulo, ambiente_planta: ambienteTerminal, ramais: r, terminais: r, tomadas: r, ramal_numeros: numeros, cabo, comprimento_m: compRamal, externo: false, dps: false, simbolo: 'HM-TEL-PONTO' };
        unidades.push(amb);
        ambientes.push(amb);
      }
      pavimentos.push({ bloco: nome, pavimento: pav, altura, unidades: upp, ramais: upp * r, paresNec, ciPares: ci ? ci.valor : 0, ciCabos: ci ? ci.qtd : 0, compCi, ciM: ci ? compCi * ci.qtd : 0, blocosIdc, compRamal, caixa: 1, listaUnidades: unidades });
    }
    const unidades = nPav * upp;
    const ramais = unidades * r;
    const ciPorPares = {};
    for (const p of pavimentos) if (p.ciPares) ciPorPares[p.ciPares] = (ciPorPares[p.ciPares] || 0) + p.ciM;
    const ramalM = pavimentos.reduce((a, p) => a + p.compRamal * p.ramais, 0);
    const paresDg = ip ? 0 : (topologia === 'prumada' ? pavimentos.reduce((a, p) => a + p.ciPares * p.ciCabos, 0) : ramais * paresCci);
    // DPS de pares na interligação entre edificações (nas duas extremidades)
    const modulosDps = !ip && rotaExterna
      ? 2 * (topologia === 'prumada' ? pavimentos.reduce((a, p) => a + Math.ceil(p.ciPares * p.ciCabos / PARES_BLOCO), 0) : Math.ceil(paresDg / PARES_BLOCO))
      : 0;
    const prumadaInfraM = (dDg + alturaPrumada) * f;
    const ramalInfraM = unidades * (dUn * f + h);
    return {
      nome, nPav, upp, h, dDg, dUn, r, p0, rotaExterna, alturaMax, alturaPrumada, switchLocal, pavimentos, unidades, ramais, ciPorPares, ramalM, paresDg, modulosDps,
      blocosIdc: pavimentos.reduce((a, p) => a + p.blocosIdc, 0), pontosIp: ip ? ramais : 0, poeW: ip ? ramais * W_TERMINAL_IP : 0, prumadaInfraM, ramalInfraM,
      maxRamal: Math.max(...pavimentos.map(p => p.compRamal)),
    };
  });

  // ── Áreas comuns, portaria e portões ──
  let nArea = 0;
  const areas = (dados.areas_comuns || []).filter(a => a && a.nome && numOu(a.ramais, 1) > 0).map(a => {
    const ramais = Math.max(1, Math.round(numOu(a.ramais, 1)));
    const d = numOu(a.distancia_m, 20);
    const externo = sim(a.externo);
    const comprimento = d * f + DESCIDA_PADRAO;
    if (ip && comprimento > LIMITE_UTP) avisos.push(`${a.nome}: cabo UTP de ${br(comprimento, 0)} m excede 90 m (NBR 14565) — prever switch intermediário ou fibra.`);
    const numeros = Array.from({ length: ramais }, () => `8${pad2(++nArea)}`);
    numeros.forEach(n => ramaisLista.push({ ramal: n, bloco: '—', pavimento: '—', local: a.nome, tipo: 'Área comum', terminal: ip ? 'Telefone IP' : 'Terminal dedicado', cabo, comprimento_m: comprimento }));
    const amb = { nome: a.nome, tipo: 'area_comum', ambiente_planta: a.nome, ramais, terminais: ramais, tomadas: ramais, ramal_numeros: numeros, cabo, comprimento_m: comprimento, distancia: d, externo, dps: externo && comDps, simbolo: 'HM-TEL-PONTO' };
    ambientes.push(amb);
    return amb;
  });
  const portariaIp = !analogica;
  const caboPortaria = portariaIp ? 'U/UTP Cat 6' : `CCI-50 ${paresCci} pares`;
  const compPortaria = dPortaria * f + DESCIDA_PADRAO;
  const numerosPortaria = Array.from({ length: terminaisPortaria }, (_, i) => `9${pad2(i + 1)}`);
  numerosPortaria.forEach(n => ramaisLista.push({ ramal: n, bloco: '—', pavimento: '—', local: localPortaria, tipo: 'Portaria', terminal: portariaIp ? 'Telefone IP de portaria' : 'Terminal de portaria', cabo: caboPortaria, comprimento_m: compPortaria }));
  if (terminaisPortaria) ambientes.push({ nome: localPortaria, tipo: 'portaria', ambiente_planta: localPortaria, ramais: terminaisPortaria, terminais: terminaisPortaria, tomadas: terminaisPortaria, ramal_numeros: numerosPortaria, cabo: caboPortaria, comprimento_m: compPortaria, externo: false, dps: false, simbolo: 'HM-TEL-PONTO' });
  else avisos.push('Sem terminal de portaria: as chamadas dos porteiros e das unidades precisam de outro ponto de atendimento. [CONFERIR]');

  const porteiroIp = ip;
  const portoes = (dados.portoes || []).filter(p => p && (p.nome || p.local)).map((p, i) => {
    const nome = p.nome || p.local;
    const d = numOu(p.distancia_m, 30);
    const fechadura = FECHADURAS[p.fechadura] ? p.fechadura : 'existente';
    const comprimento = d * f + DESCIDA_PADRAO;
    if (porteiroIp && comprimento > LIMITE_UTP) avisos.push(`${nome}: cabo UTP do porteiro IP com ${br(comprimento, 0)} m excede 90 m (NBR 14565).`);
    const numero = `95${i + 1}`;
    const caboP = porteiroIp ? 'U/UTP Cat 6 (externo)' : `CCI-50 ${PARES_PORTEIRO} pares`;
    ramaisLista.push({ ramal: numero, bloco: '—', pavimento: '—', local: nome, tipo: 'Porteiro', terminal: porteiroIp ? 'Porteiro IP (SIP)' : 'Porteiro eletrônico', cabo: caboP, comprimento_m: comprimento });
    const amb = { nome, tipo: 'portao', ambiente_planta: nome, ramais: 1, terminais: 0, porteiro: 1, tomadas: 0, ramal_numeros: [numero], fechadura, rotuloFechadura: FECHADURAS[fechadura], cabo: caboP, comprimento_m: comprimento, distancia: d, externo: true, dps: comDps, simbolo: 'HM-TEL-PONTO' };
    ambientes.push(amb);
    return amb;
  });
  const nPorteiros = portoes.length;
  // Plano de numeração: nenhum número de ramal pode repetir na central
  const vistos = new Map();
  for (const x of ramaisLista) vistos.set(x.ramal, [...(vistos.get(x.ramal) || []), x.local]);
  const duplicados = [...vistos].filter(([, locais]) => locais.length > 1);
  if (duplicados.length) avisos.push(`Plano de numeração com ${duplicados.length} ramal(is) repetido(s) — ${duplicados.slice(0, 5).map(([n, l]) => `${n}: ${l.join(' / ')}`).join('; ')}${duplicados.length > 5 ? '; …' : ''}. Renumerar na programação da central. [CONFERIR]`);

  // ── Ramais ──
  const unidades = blocos.reduce((a, b) => a + b.unidades, 0);
  const ramaisUnidades = blocos.reduce((a, b) => a + b.ramais, 0);
  const ramaisAreas = areas.reduce((a, x) => a + x.ramais, 0);
  const ramaisUsados = ramaisUnidades + ramaisAreas + terminaisPortaria + nPorteiros;
  const ramaisNec = Math.ceil(ramaisUsados * (1 + reserva) - 1e-9);
  const ramaisAnalogicos = ip ? 0 : ramaisUnidades + ramaisAreas + nPorteiros + (analogica ? terminaisPortaria : 0);

  // ── Central / PABX ──
  let central = null;
  let nCentrais = 0;
  let placas = 0;
  let capacidadeInstalada = 0;
  let pabx = null;
  let licencas = 0;
  let fxsNec = 0;
  let gwFxs = null;
  if (analogica) {
    const maior = CENTRAIS[CENTRAIS.length - 1];
    central = CENTRAIS.find(c => c.ramais >= ramaisNec) || maior;
    nCentrais = Math.ceil(ramaisNec / central.ramais);
    if (nCentrais > 1) avisos.push(`${ramaisNec} ramais (com reserva) acima da maior central analógica de linha (${maior.ramais}) — previstas ${nCentrais} centrais interligadas; avaliar PABX IP ou híbrido. [CONFERIR]`);
    if (central.modular) {
      placas = Math.ceil(ramaisNec / capPlaca);
      capacidadeInstalada = placas * capPlaca;
      if (capacidadeInstalada > central.ramais * nCentrais) avisos.push(`${placas} placas de ${capPlaca} ramais (${capacidadeInstalada}) passam da capacidade da central (${central.ramais * nCentrais}) — conferir a placa do modelo. [CONFERIR]`);
    } else {
      capacidadeInstalada = central.ramais * nCentrais;
    }
  } else {
    pabx = PABX_IP.find(p => p.ramais >= ramaisNec) || PABX_IP[PABX_IP.length - 1];
    if (ramaisNec > pabx.ramais) avisos.push(`${ramaisNec} ramais acima do maior PABX IP de referência (${pabx.ramais}) — dimensionar servidor dedicado. [CONFERIR]`);
    licencas = ramaisNec;
    capacidadeInstalada = licencas;
    if (hibrido) {
      fxsNec = Math.ceil(ramaisAnalogicos * (1 + reserva) - 1e-9);
      gwFxs = fxsNec ? comercial(GW_FXS, fxsNec) : null;
    }
  }

  // ── Troncos externos ──
  let placasTronco = 0;
  let ataSip = 0;
  let gwFxo = null;
  let licencasTronco = 0;
  const troncosAnalogicos = tipoTronco === 'analogico' ? troncos : 0;
  if (troncos) {
    if (analogica) {
      placasTronco = Math.ceil(troncos / LINHAS_PLACA_TRONCO);
      if (tipoTronco === 'sip') {
        ataSip = Math.ceil(troncos / 2);
        avisos.push('Central analógica não recebe tronco SIP diretamente: previsto ATA/gateway (FXS) da operadora ligado à placa de tronco. [CONFERIR]');
      }
    } else if (tipoTronco === 'analogico') {
      gwFxo = comercial(GW_FXO, troncos);
    } else {
      licencasTronco = troncos;
    }
  }

  // ── DG, blocos IDC-110/BLI e suportes (parte analógica) ──
  const paresAreas = ip ? 0 : ramaisAreas * paresCci;
  const paresPortaria = analogica ? terminaisPortaria * paresCci : 0;
  const paresPorteiros = ip ? 0 : nPorteiros * PARES_PORTEIRO;
  const paresCabosDg = blocos.reduce((a, b) => a + b.paresDg, 0) + paresAreas + paresPortaria + paresPorteiros;
  const paresCentral = analogica ? capacidadeInstalada : (gwFxs ? gwFxs.qtd * gwFxs.valor : 0);
  const blocosDg = Math.ceil(paresCabosDg / PARES_BLOCO) + Math.ceil(paresCentral / PARES_BLOCO) + Math.ceil(troncosAnalogicos / PARES_BLOCO);
  const blocosAndares = blocos.reduce((a, b) => a + b.blocosIdc, 0);
  const suportes = Math.ceil(blocosDg / BLOCOS_POR_SUPORTE) + blocos.reduce((a, b) => a + b.pavimentos.reduce((x, p) => x + (p.blocosIdc ? Math.ceil(p.blocosIdc / BLOCOS_POR_SUPORTE) : 0), 0), 0);
  const jumperM = Math.ceil((ramaisAnalogicos + troncosAnalogicos) * JUMPER_M);

  // ── Cabos ──
  const ceil = Math.ceil;
  const ciPorPares = {};
  for (const b of blocos) for (const [p, m] of Object.entries(b.ciPorPares)) ciPorPares[p] = (ciPorPares[p] || 0) + m;
  Object.keys(ciPorPares).forEach(k => { ciPorPares[k] = ceil(ciPorPares[k] - 1e-9); });
  const ciM = Object.values(ciPorPares).reduce((a, b) => a + b, 0);
  const cciRamalM = ip ? 0 : ceil(blocos.reduce((a, b) => a + b.ramalM, 0) + areas.reduce((a, x) => a + x.comprimento_m * x.ramais, 0) + (analogica ? compPortaria * terminaisPortaria : 0) - 1e-9);
  const cci4M = ip ? 0 : ceil(portoes.reduce((a, p) => a + p.comprimento_m, 0) - 1e-9);
  const cciM = { 2: paresCci === 2 ? cciRamalM : 0, 4: (paresCci === 4 ? cciRamalM : 0) + cci4M };

  // ── Rede IP (PABX IP / híbrido) ──
  const locaisRede = [];
  let utpM = 0;
  if (!analogica) {
    const pontosDg = { local: localDg, pontos: 0, poeW: 0, utp: 0, equipamentos: 1 + (gwFxs ? gwFxs.qtd : 0) + (gwFxo ? gwFxo.qtd : 0) };
    if (portariaIp) { pontosDg.pontos += terminaisPortaria; pontosDg.poeW += terminaisPortaria * W_PORTARIA_IP; pontosDg.utp += terminaisPortaria * compPortaria; }
    if (ip) {
      for (const x of areas) { pontosDg.pontos += x.ramais; pontosDg.poeW += x.ramais * W_TERMINAL_IP; pontosDg.utp += x.ramais * x.comprimento_m; }
      for (const p of portoes) { pontosDg.pontos += 1; pontosDg.poeW += W_PORTEIRO_IP; pontosDg.utp += p.comprimento_m; }
    }
    const locaisBloco = [];
    for (const b of ip ? blocos : []) {
      if (b.switchLocal) {
        locaisBloco.push({ local: `${b.nome} (base da prumada)`, bloco: b.nome, pontos: b.pontosIp, poeW: b.poeW, utp: b.ramalM, equipamentos: 1 });
        pontosDg.equipamentos += 1; // uplink óptico do bloco
      } else {
        pontosDg.pontos += b.pontosIp; pontosDg.poeW += b.poeW; pontosDg.utp += b.ramalM;
      }
    }
    for (const l of [pontosDg, ...locaisBloco]) {
      const portas = l.pontos + l.equipamentos;
      const switches = portas ? ceil((portas + 2) / portasSw) : 0;
      const paineis = l.pontos ? ceil(l.pontos / PORTAS_PATCH) : 0;
      const uNec = ceil((paineis * 2 + switches + 2 + (l === pontosDg ? 1 + (gwFxs ? gwFxs.qtd : 0) + (gwFxo ? gwFxo.qtd : 0) : 0)) * 1.3);
      locaisRede.push({ ...l, portas, switches, paineis, rackU: RACKS_U.find(u => u >= uNec) || 44, uNec, utp: ceil(l.utp - 1e-9), dg: l === pontosDg });
    }
    utpM = locaisRede.reduce((a, l) => a + l.utp, 0);
  }
  const blocosFibra = blocos.filter(b => b.switchLocal);
  const fibraM = ceil(blocosFibra.reduce((a, b) => a + b.dDg * f + 10, 0) - 1e-9);
  const switches = locaisRede.reduce((a, l) => a + l.switches, 0);
  const pontosIp = locaisRede.reduce((a, l) => a + l.pontos, 0);
  const poeW = locaisRede.reduce((a, l) => a + l.poeW, 0);

  // ── Terminais ──
  const terminaisDedicados = ip ? 0 : ramaisUnidades + ramaisAreas;
  const telefonesIp = ip ? ramaisUnidades + ramaisAreas : 0;
  const tomadasRj11 = terminaisDedicados + (analogica ? terminaisPortaria : 0);
  const plugsRj11 = ceil(tomadasRj11 * 1.1);
  const tomadasRj45 = telefonesIp + (portariaIp ? terminaisPortaria : 0);
  const pontosConector = tomadasRj11 + tomadasRj45 + (porteiroIp ? nPorteiros : 0);
  const fechadurasNovas = portoes.filter(p => p.fechadura === 'nova');
  const ppFechaduraM = ceil(fechadurasNovas.reduce((a, p) => a + p.comprimento_m, 0) - 1e-9);

  // ── Nobreak (consumo × autonomia) ──
  const nobreaks = [];
  if (comNobreak) {
    let cargaDg;
    if (analogica) cargaDg = central.w * nCentrais + (placas + placasTronco) * W_PLACA;
    else {
      const lDg = locaisRede.find(l => l.dg);
      cargaDg = pabx.w + ((gwFxs ? gwFxs.qtd : 0) + (gwFxo ? gwFxo.qtd : 0)) * W_GATEWAY + (lDg ? lDg.switches * W_SWITCH + lDg.poeW : 0);
    }
    nobreaks.push(nobreakPara(localDg, cargaDg, autonomiaH));
    for (const l of locaisRede.filter(x => !x.dg)) nobreaks.push(nobreakPara(l.local, l.switches * W_SWITCH + l.poeW, autonomiaH));
  } else {
    avisos.push('Sem nobreak: a interfonia e os porteiros param na falta de energia. Recomenda-se nobreak com autonomia mínima de 2 h. [CONFERIR com o cliente]');
  }

  // ── Proteção (DPS de linha) e aterramento ──
  const ramaisExternos = areas.filter(a => a.externo).reduce((a, x) => a + x.ramais, 0);
  const blocosExternos = blocos.filter(b => b.rotaExterna);
  const temParesExternos = troncosAnalogicos > 0 || nPorteiros > 0 || ramaisExternos > 0 || (!ip && blocosExternos.length > 0);
  const dps = comDps ? {
    tronco: troncosAnalogicos,
    porteiro: ip ? 0 : nPorteiros,
    area: ip ? 0 : ramaisExternos,
    ethernet: ip ? nPorteiros + ramaisExternos : 0,
    modulos: blocos.reduce((a, b) => a + b.modulosDps, 0),
    ca: Math.max(1, nobreaks.length),
  } : { tronco: 0, porteiro: 0, area: 0, ethernet: 0, modulos: 0, ca: 0 };
  dps.total = dps.tronco + dps.porteiro + dps.area + dps.ethernet + dps.modulos + dps.ca;
  if (!comDps && temParesExternos) {
    ncsProjeto.push({ cod: 'T1', local: 'DG / portões / interligações', descricao: 'Pares que saem da edificação (troncos da operadora, porteiros, áreas externas ou interligação entre blocos) sem DPS de linha previsto', recomendacao: 'Instalar DPS de linha (centelhador a gás + supressor) no DG em cada par que sai da edificação e módulos de proteção de 10 pares nas duas extremidades das interligações entre blocos, aterrados no TAP ligado ao BEP (NBR 5410 6.3.5; NBR 5419-4; NBR 14306 [CONFERIR]).', prioridade: 'P2' });
  }
  const taps = 1 + blocos.filter(b => b.rotaExterna || b.switchLocal).length;
  const cabo16M = ceil(numOu(s.distancia_bep_m, 10) * f - 1e-9) * taps;

  // ── Infraestrutura (quando não existe) ──
  const caixasAndar = blocos.reduce((a, b) => a + b.pavimentos.length, 0);
  const prumadaInfraM = ceil(blocos.reduce((a, b) => a + b.prumadaInfraM, 0) - 1e-9);
  const ramalInfraM = ceil(blocos.reduce((a, b) => a + b.ramalInfraM, 0) + areas.reduce((a, x) => a + x.comprimento_m, 0) + (terminaisPortaria ? compPortaria : 0) + portoes.reduce((a, p) => a + p.comprimento_m, 0) - 1e-9);
  const infraM = infraExistente ? 0 : prumadaInfraM + ramalInfraM;

  // ── Avisos gerais ──
  if (reserva < 0.1) avisos.push(`Reserva de ramais de ${br(reserva * 100, 0)} % — recomenda-se ≥ 10 % para ampliações. [CONFERIR]`);
  if (ip) avisos.push('PABX IP: VLAN de voz com QoS, senhas fortes nos ramais SIP, acesso remoto restrito e bloqueio de rotas internacionais/premium (fraude em PABX). Telefones IP param sem PoE — switch no nobreak.');
  if (blocosFibra.length) avisos.push(`Interligação ${blocosFibra.map(b => b.nome).join(', ')} ↔ DG por fibra óptica (dielétrica — dispensa DPS de linha e evita diferença de potencial entre edificações).`);
  avisos.push('Capacidades de centrais/placas, consumos e potências PoE são típicos de mercado — conferir com a ficha técnica do modelo escolhido e a homologação Anatel dos equipamentos. [CONFERIR]');

  // ── Materiais ──
  const M = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => { if (quantidade > 0) M.push({ codigo, descricao, unidade, quantidade, referencia }); };
  if (analogica) {
    add('CEN', `${central.rotulo} [CONFERIR modelo]`, 'un', nCentrais, `${ramaisNec} ramais com reserva`);
    add('PLR', `Placa de ${capPlaca} ramais para a central`, 'un', placas, `⌈${ramaisNec} ÷ ${capPlaca}⌉`);
    add('PLT', `Placa/interface de troncos analógicos para a central (${troncos} linha(s)) [CONFERIR]`, 'un', placasTronco, 'Linhas externas');
    add('ATA', 'ATA/gateway SIP com portas FXS para entregar o tronco SIP à central analógica [CONFERIR]', 'un', ataSip, 'Tronco SIP');
  } else {
    add('PBX', `${pabx.rotulo} [CONFERIR modelo]`, 'un', 1, `${ramaisNec} ramais com reserva`);
    add('LIC', 'Licença de ramal SIP no PABX IP', 'un', licencas, `${ramaisUsados} ramais + ${br(reserva * 100, 0)} % de reserva`);
    add('LTS', 'Licença/canal de tronco SIP no PABX (contratação do tronco com a operadora à parte)', 'un', licencasTronco, 'Troncos SIP');
    if (gwFxs) add('GFX', `Gateway FXS ${gwFxs.valor} portas (ramais analógicos no PABX IP)`, 'un', gwFxs.qtd, `${fxsNec} portas com reserva`);
    if (gwFxo) add('GFO', `Gateway FXO ${gwFxo.valor} portas (troncos analógicos da operadora)`, 'un', gwFxo.qtd, `${troncos} tronco(s)`);
  }
  add('TER', 'Terminal dedicado de interfonia (monofone de parede) compatível com a central [CONFERIR modelo]', 'un', terminaisDedicados, 'Ramais das unidades e áreas comuns');
  add('TIP', 'Telefone IP SIP com PoE (IEEE 802.3af), 2 contas SIP, viva-voz', 'un', telefonesIp, 'Ramais das unidades e áreas comuns');
  add('TPO', analogica ? 'Terminal de portaria com display (identificação do ramal chamador) e teclado, compatível com a central [CONFERIR modelo]' : 'Telefone IP de portaria com display colorido, teclas BLF e PoE (atendimento da portaria)', 'un', terminaisPortaria, 'Portaria');
  add('POR', porteiroIp ? 'Porteiro/videoporteiro IP SIP externo com PoE e relé para fechadura, proteção IP do fabricante' : 'Porteiro eletrônico externo para central de portaria (módulo de rua, tecla de chamada da portaria, comando de fechadura) [CONFERIR modelo]', 'un', nPorteiros, 'Portões');
  add('FEC', 'Fecho/fechadura elétrica 12 V para portão (acionada pelo porteiro)', 'un', fechadurasNovas.length, 'Portões com fechadura nova');
  add('FON', 'Fonte 12 Vcc 2 A para fechadura do porteiro [CONFERIR consumo]', 'un', fechadurasNovas.length, 'Fabricante');
  add('PP', 'Cabo PP 2 × 1,5 mm² (alimentação/comando da fechadura)', 'm', ppFechaduraM, 'Distância × 1,15 + 3 m');
  Object.entries(ciPorPares).sort((a, b) => a[0] - b[0]).forEach(([p, m]) => add(`CI${p}`, `Cabo telefônico CI-50 ${p} pares (prumada DG → caixa de andar)`, 'm', m, `Pares do andar × (1 + ${br(reservaPares * 100, 0)} %)`));
  add('CCI2', 'Cabo telefônico CCI-50 2 pares (ramal até o terminal)', 'm', cciM[2], topologia === 'direta' ? '(DG → unidade) × 1,15 + descida' : '(caixa do andar → unidade) × 1,15 + descida');
  add('CCI4', 'Cabo telefônico CCI-50 4 pares (porteiros/ramais)', 'm', cciM[4], 'Distância × 1,15 + 3 m');
  add('JMP', 'Fio jumper (FDG) 2 condutores para cruzamento no DG', 'm', jumperM, `${JUMPER_M} m por ramal/tronco`);
  add('BLK', 'Bloco de engate rápido IDC-110 / BLI 10 pares', 'un', blocosDg + blocosAndares, `DG ${blocosDg} + caixas de andar ${blocosAndares}`);
  add('SUP', `Suporte/bastidor para blocos de 10 pares (até ${BLOCOS_POR_SUPORTE} blocos)`, 'un', suportes, 'DG e caixas de andar');
  if (blocosDg) add('DG', `Quadro de distribuição geral (DG) metálico com chave e placa de montagem para ${blocosDg} blocos de 10 pares [CONFERIR dimensões]`, 'un', 1, 'Práticas Telebrás / NBR 13726 [CONFERIR]');
  add('TOM', 'Tomada telefônica RJ-11 em caixa 4×2 com espelho', 'un', tomadasRj11, 'Um ponto por terminal');
  add('RJ11', 'Plug RJ-11 (6P4C) para terminação/cordões', 'un', plugsRj11, 'Terminais + 10 %');
  add('ETQ', 'Identificação de pares e cabos (etiquetas/anilhas) no DG, caixas de andar e tomadas', 'vb', 1, 'Mapa de pares');
  if (!analogica) {
    add('UTP', 'Cabo U/UTP Cat 6 (pontos de voz IP)', 'm', utpM, 'NBR 14565 (≤ 90 m)');
    add('RJ45', 'Tomada RJ-45 Cat 6 (keystone) com espelho 4×2', 'un', tomadasRj45, 'NBR 14565');
    add('RJM', 'Conector RJ-45 Cat 6 macho blindado (porteiros IP)', 'un', porteiroIp ? nPorteiros * 2 : 0, '—');
    add('PPN', `Patch panel Cat 6 ${PORTAS_PATCH} portas`, 'un', locaisRede.reduce((a, l) => a + l.paineis, 0), 'NBR 14565');
    add('PCD', 'Patch cord Cat 6 1,5 m (rack)', 'un', locaisRede.reduce((a, l) => a + l.portas, 0), '—');
    add('SW', `Switch Gigabit PoE ${portasSw} portas gerenciável (VLAN de voz/QoS)${poeW ? `, orçamento PoE ≥ ${ceil(poeW * 1.2 / Math.max(1, switches))} W por switch` : ''}`, 'un', switches, 'IEEE 802.3af/at');
    locaisRede.forEach(l => add('RCK', `Rack de parede ${l.rackU}U com organizadores e régua — ${l.local}`, 'un', 1, `${l.uNec}U com 30 % de reserva`));
  }
  add('FO', 'Cabo óptico multimodo OM3 4 fibras, dielétrico (interligação bloco ↔ DG)', 'm', fibraM, 'Distância × 1,15 + 10 m');
  add('DIO', 'Distribuidor interno óptico (DIO) 12 fibras com acessórios', 'un', blocosFibra.length * 2, 'Duas pontas');
  add('SFP', 'Módulo SFP 1 Gb/s multimodo (ou conversor de mídia)', 'un', blocosFibra.length * 2, 'Duas pontas');
  add('CDO', 'Cordão óptico duplex OM3 LC-LC 2 m', 'un', blocosFibra.length * 2, '—');
  Object.values(nobreaks.reduce((acc, n) => { const k = `${n.va}`; acc[k] = acc[k] || { va: n.va, q: 0 }; acc[k].q += n.nNobreaks; return acc; }, {}))
    .forEach(n => add('NBK', `Nobreak senoidal ${n.va} VA, bivolt, com entrada para bateria externa`, 'un', n.q, `Carga ÷ ${FP_NOBREAK} × ${MARGEM_NOBREAK}`));
  Object.values(nobreaks.reduce((acc, n) => { if (!n.nBaterias) return acc; const k = `${n.bateriaAh}`; acc[k] = acc[k] || { ah: n.bateriaAh, q: 0 }; acc[k].q += n.nBaterias; return acc; }, {}))
    .forEach(b => add('BAT', `Bateria estacionária 12 V ${b.ah} Ah (autonomia de ${br(autonomiaH, 0)} h)`, 'un', b.q, `Carga × ${br(autonomiaH, 0)} h ÷ (12 V × ${EFICIENCIA}) × ${FATOR_BATERIA}`));
  add('DPT', 'DPS de linha telefônica 1 par (centelhador a gás + supressor) — troncos da operadora, no DG', 'un', dps.tronco, 'NBR 5410 6.3.5 / NBR 5419-4');
  add('DPP', 'DPS de linha 2 pares para porteiro eletrônico, no DG', 'un', dps.porteiro, 'NBR 5410 6.3.5 / NBR 5419-4');
  add('DPA', 'DPS de linha 1 par para ramal de área externa', 'un', dps.area, 'NBR 5410 6.3.5 / NBR 5419-4');
  add('DPE', 'DPS para rede Ethernet PoE (porteiro IP / ponto externo)', 'un', dps.ethernet, 'NBR 5419-4');
  add('DPM', 'Módulo de proteção para bloco de 10 pares (centelhadores a gás) — interligação entre edificações, nas duas pontas', 'un', dps.modulos, 'NBR 5419-4 / NBR 14306 [CONFERIR]');
  add('DPC', 'DPS classe II 275 V 20 kA na alimentação CA da central/nobreak', 'un', dps.ca, 'NBR 5410 6.3.5');
  add('TAP', 'Barramento de aterramento de telecomunicações (TAP) no DG/rack, ligado ao BEP', 'un', taps, 'NBR 5410 6.4 / NBR 14306 [CONFERIR]');
  add('T16', 'Cabo de cobre 16 mm² verde-amarelo (TAP → BEP)', 'm', cabo16M, 'NBR 5410 6.4');
  if (!infraExistente) {
    add('PRU', 'Tubulação de prumada telefônica (eletroduto 1 1/2" ou eletrocalha) com acessórios [CONFERIR com o projeto de tubulação]', 'm', prumadaInfraM, 'Práticas Telebrás / NBR 13726 [CONFERIR]');
    add('CXA', 'Caixa de distribuição de andar com tampa e placa de madeira (tipo Telebrás nº 2) [CONFERIR tamanho]', 'un', caixasAndar, 'Uma por pavimento');
    add('ELD', 'Eletroduto 3/4" com acessórios (caixa do andar → terminal)', 'm', ramalInfraM, 'Separado da elétrica (NBR 5410)');
  }

  ambientes.push({ nome: localDg, tipo: 'dg', ambiente_planta: localDg, ramais: 0, terminais: 0, central: analogica ? nCentrais : 1, blocosIdc: blocosDg, rackU: locaisRede.find(l => l.dg)?.rackU || null, nobreak: nobreaks[0] ? `${nobreaks[0].va} VA` : null, externo: false, dps: comDps, simbolo: 'HM-TEL-PONTO' });

  return {
    tipo, rotuloTipo: TIPOS_SISTEMA[tipo], topologia, rotuloTopologia: TOPOLOGIAS[topologia], ip, hibrido, analogica, f, reserva, reservaPares, capPlaca, paresCci, autonomiaH, comNobreak, comDps, infraExistente,
    blocos, areas, portoes, ambientes, ramaisLista, ramaisDuplicados: duplicados.map(([n]) => n), localDg, localPortaria,
    unidades, ramaisUnidades, ramaisAreas, terminaisPortaria, nPorteiros, ramaisUsados, ramaisNec, ramaisAnalogicos,
    central, nCentrais, placas, capacidadeInstalada, pabx, licencas, fxsNec, gwFxs, troncos, tipoTronco, troncosAnalogicos, placasTronco, ataSip, gwFxo, licencasTronco,
    paresCabosDg, paresCentral, blocosDg, blocosAndares, suportes, jumperM,
    cabos: { ciPorPares, ciM, cciM, cciRamalM, utpM, fibraM, ppFechaduraM, cabo16M },
    locaisRede, switches, pontosIp, poeW, terminaisDedicados, telefonesIp, tomadasRj11, plugsRj11, tomadasRj45, pontosConector, fechadurasNovas: fechadurasNovas.length,
    nobreaks, dps, taps, temParesExternos, caixasAndar, prumadaInfraM, ramalInfraM, infraM,
    materiais: M, avisos, ncsProjeto,
  };
}

module.exports = {
  calcular, TIPOS_SISTEMA, TOPOLOGIAS, FECHADURAS, CENTRAIS, PABX_IP, GW_FXS, GW_FXO, CI_PARES, PARES_BLOCO, BLOCOS_POR_SUPORTE, PARES_PORTEIRO,
  FATOR_CABO, FOLGA_CI, DESCIDA_PADRAO, JUMPER_M, LIMITE_UTP, LIMITE_CCI, W_PLACA, W_GATEWAY, W_SWITCH, W_TERMINAL_IP, W_PORTARIA_IP, W_PORTEIRO_IP,
  FP_NOBREAK, MARGEM_NOBREAK, EFICIENCIA, FATOR_BATERIA, NOBREAKS_VA, BATERIAS_AH, LINHAS_PLACA_TRONCO, comercial, nobreakPara,
};
