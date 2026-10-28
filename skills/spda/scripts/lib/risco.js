// Análise de risco pela ABNT NBR 5419-2:2026 (perda L1, opcionalmente L3)
// e frequência de danos F × FT (Seção 7, novidade da edição de 2026).
//
// Entrada: o arquivo de dados da obra (ver referencia/esquema-dados.md).
// Saída: números de eventos, componentes por zona, fatores com a tabela de
// origem (vão para o relatório) e a varredura de cenários de proteção.

const T = require('./tabelas');
const { buscarNg } = require('./ng');

const FONTE = 'NBR 5419-2:2026';

function exigir(tabela, chave, nomeCampo) {
  if (!(chave in tabela)) {
    throw new Error(`Valor inválido em "${nomeCampo}": "${chave}". Opções: ${Object.keys(tabela).join(', ')}`);
  }
  return tabela[chave];
}

function produto(tabela, chaves, nomeCampo) {
  const lista = (chaves && chaves.length) ? chaves : ['nenhuma'];
  return lista.reduce((acc, k) => acc * exigir(tabela, k, nomeCampo), 1);
}

// Índice da coluna de UW a usar: a maior coluna tabelada que não passa do UW
// real (lado da segurança — UW menor dá probabilidade maior).
function colunaUw(colunas, uw) {
  let idx = 0;
  colunas.forEach((c, i) => { if (uw >= c) idx = i; });
  return idx;
}

function chaveNpSpda(spda) {
  if (!spda || !spda.np || spda.np === 'nenhum') return 'nenhum';
  if (spda.cobertura_metalica_natural && spda.descida_natural) return 'cobertura_metalica_natural';
  if (spda.np === 'I' && spda.descida_natural && spda.descidas_naturais_8_1_2_b) return 'I_descida_natural';
  return spda.np;
}

// ── Números de eventos perigosos (Anexo A) ──────────────────────────────────

function areaExposicao(est) {
  const { L, W, H } = est;
  const ad = L * W + 2 * (3 * H) * (L + W) + Math.PI * (3 * H) ** 2; // (A.1)
  const saliencias = (est.saliencias || []).map(s => Math.PI * (3 * s.hp) ** 2); // (A.2)
  return Math.max(ad, ...saliencias);
}

function eventos(dados) {
  const est = dados.estrutura;
  let ng = est.ng;
  let ngFonte = est.ng_fonte;
  if (ng == null) {
    const achado = buscarNg(est.municipio, est.uf);
    if (!achado) throw new Error(`NG não encontrado para ${est.municipio}/${est.uf} na Tabela F.1 — informe estrutura.ng`);
    ng = achado.ng;
    ngFonte = `${FONTE}, Tabela F.1 (${achado.municipio}/${achado.uf})`;
  }
  const AD = areaExposicao(est);
  const CD = exigir(T.CD, est.localizacao, 'estrutura.localizacao');
  const ND = ng * AD * CD * 1e-6; // (A.3)
  const AM = 2 * 500 * (est.L + est.W) + Math.PI * 500 ** 2; // (A.6)
  const NM = ng * AM * 1e-6; // (A.5)
  const CE = exigir(T.CE, est.ambiente, 'estrutura.ambiente');

  const linhas = (dados.linhas || []).map(l => {
    const CI = exigir(T.CI, l.instalacao, `linhas[${l.id}].instalacao`);
    const CTl = exigir(T.CT, l.ct, `linhas[${l.id}].ct`);
    const LL = l.LL_m || 1000; // A.4.1: comprimento desconhecido → 1 000 m
    const rho = l.resistividade_ohm_m;
    const AL = (l.instalacao !== 'aerea' && rho > 400) ? 0.6 * Math.sqrt(rho) * LL : 40 * LL; // (A.8) e nota 1 da Tab. A.2
    const AI = 4000 * LL; // (A.10)
    const NL = ng * AL * CI * CE * CTl * 1e-6; // (A.7)
    const NI = ng * AI * CI * CE * CTl * 1e-6; // (A.9)
    let NDJ = 0;
    if (l.adjacente) {
      const a = l.adjacente;
      const ADJ = a.L * a.W + 6 * a.H * (a.L + a.W) + Math.PI * (3 * a.H) ** 2;
      NDJ = ng * ADJ * exigir(T.CD, a.localizacao || 'isolada', 'adjacente.localizacao') * CTl * 1e-6; // (A.4)
    }
    return { ...l, CI, CT: CTl, CE, LL, AL, AI, NL, NI, NDJ };
  });

  return { ng, ngFonte, AD, CD, ND, AM, NM, CE, linhas };
}

// ── Componentes por zona ────────────────────────────────────────────────────

function linhaAtendeZona(linha, zona) {
  const zs = linha.zonas || ['todas'];
  return zs.includes('todas') || zs.includes(zona.nome);
}

function analisarZona(zona, ctx) {
  const { dados, ev, nt, npSpda, sobrescrever } = ctx;
  const est = dados.estrutura;
  const spda = dados.spda || {};
  const fatores = [];
  const reg = (fator, valor, tabela, nota = '') => fatores.push({ fator, valor, fonte: `${FONTE}, ${tabela}`, nota });

  const fator = (zona.nz / nt) * (zona.tz / 8760);
  reg('nz/nt × tz/8760', fator, 'Tabela C.1', `nz=${zona.nz}, nt=${nt}, tz=${zona.tz} h/ano`);
  const rs = exigir(T.RS, est.tipo_construcao, 'estrutura.tipo_construcao');
  reg('rs', rs, 'Tabela C.7', est.tipo_construcao);
  const rt = exigir(T.RT_PISO, zona.piso, `zonas[${zona.nome}].piso`);
  const PB = T.PB[npSpda];
  const comp = { RA: 0, RB: 0, RC: 0, RM: 0, RU: 0, RV: 0, RW: 0, RZ: 0 };
  const freq = { FB: 0, FC: 0, FM: 0, FV: 0, FW: 0, FZ: 0 };
  const r3 = { RB3: 0, RV3: 0 };

  if (zona.tipo === 'externa') {
    // Zona externa (até 3 m da estrutura): só choque por toque/passo (RA).
    reg('LT', T.LT, 'Tabela C.2');
    reg('rt', rt, 'Tabela C.3', zona.piso);
    const medidas = [...(zona.medidas_pta || [])];
    // A descida natural reduz PTA, mas só vale com SPDA ou estrutura que atue como descida (nota 1 de B.2.2)
    if (spda.descida_natural && npSpda !== 'nenhum' && !medidas.includes('descida_natural')) medidas.push('descida_natural');
    const PTA = (npSpda === 'nenhum') ? 1 : produto(T.PTA, medidas, `zonas[${zona.nome}].medidas_pta`);
    reg('PB', PB, 'Tabela B.2', npSpda === 'nenhum' ? 'sem SPDA' : `SPDA NP ${spda.np}`);
    reg('PTA', PTA, 'Tabela B.1', medidas.join(', ') || 'nenhuma');
    const LA = rt * T.LT * fator * rs; // (C.1)
    comp.RA = ev.ND * PTA * PB * LA;   // (4) com PA = PTA × PB (B.1)
    return { zona, fator, fatores, comp, freq, r3, R1: comp.RA, F: 0, FT: null, incluiD3: false };
  }

  const oc = exigir(T.OCUPACAO, zona.ocupacao, `zonas[${zona.nome}].ocupacao`);
  const rp = exigir(T.RP, zona.protecao_incendio || 'nenhuma', `zonas[${zona.nome}].protecao_incendio`);
  const rf = exigir(T.RF, zona.carga_incendio || 'incendio_normal', `zonas[${zona.nome}].carga_incendio`);
  const hz = exigir(T.HZ, zona.perigo_especial || 'nenhum', `zonas[${zona.nome}].perigo_especial`);
  reg('LT', T.LT, 'Tabela C.2');
  reg('LF', oc.LF, 'Tabela C.2', zona.ocupacao);
  reg('LO', oc.LO, 'Tabela C.2', zona.ocupacao);
  reg('rt', rt, 'Tabela C.3', zona.piso);
  reg('rp', rp, 'Tabela C.4', zona.protecao_incendio || 'nenhuma');
  reg('rf', rf, 'Tabela C.5', zona.carga_incendio || 'incendio_normal');
  reg('hz', hz, 'Tabela C.6', zona.perigo_especial || 'nenhum');
  reg('PB', PB, 'Tabela B.2', npSpda === 'nenhum' ? 'sem SPDA' : `SPDA NP ${spda.np}${npSpda !== spda.np ? ` (${npSpda})` : ''}`);
  const PTU = produto(T.PTU, zona.medidas_ptu, `zonas[${zona.nome}].medidas_ptu`);
  reg('PTU', PTU, 'Tabela B.6', (zona.medidas_ptu || []).join(', ') || 'nenhuma');

  const LU = rt * T.LT * fator * rs;               // (C.2)
  const LB = rp * rf * hz * oc.LF * fator * rs;    // (C.3) — LB = LV
  const LC = oc.LO * fator * rs;                   // (C.4) — LC = LM = LW = LZ

  // RA também nas zonas internas: choque por toque/passo DENTRO da estrutura
  // (definição de RA na NBR 5419-2 / IEC 62305-2; a Tabela C.3 traz rt de pisos
  // internos — linóleo, madeira, carpete). Antes só a zona externa tinha RA, e
  // uma estrutura sem SPDA com piso de concreto subestimava R1 (RA ≈ 1,3e-5 > RT).
  // [CONFERIR na NBR 5419-2:2026 se a edição nova mantém RA nas zonas internas]
  const medidasA = [...(zona.medidas_pta || [])];
  if (spda.descida_natural && npSpda !== 'nenhum' && !medidasA.includes('descida_natural')) medidasA.push('descida_natural');
  const PTAi = (npSpda === 'nenhum') ? 1 : produto(T.PTA, medidasA, `zonas[${zona.nome}].medidas_pta`);
  reg('PTA', PTAi, 'Tabela B.1', `${medidasA.join(', ') || 'nenhuma'} (RA na zona interna)`);
  comp.RA = ev.ND * PTAi * PB * LU; // (4); LA = rt·LT·(nz/nt)·(tz/8760)·rs, igual a LU (C.1)

  // Sistemas internos da zona: PC e PM combinados pelas Eq. 12 e 13
  const sistemas = (zona.sistemas || []).map(sOriginal => {
    // "Sem qualquer proteção": tira também as MPS de roteamento e a malha equipotencial
    const s = sobrescrever.sem_mps
      ? { ...sOriginal, ks3: 'sem_preocupacao', rede_equipotencial_malha: false, blindado: false }
      : sOriginal;
    const dpsNp = sobrescrever.dps_np || s.dps_np || 'nenhum';
    const PSPD = exigir(T.PSPD, dpsNp, `sistema ${s.nome}.dps_np`);
    const linha = ev.linhas.find(l => l.id === s.linha);
    // B.4.4: CLD da Tabela B.4 só vale para sistema interno blindado; não blindado → CLD = 1
    const cldLinha = linha ? T.CLD_CLI[ctx.cldCli(linha)].cld : 0;
    const CLDint = s.blindado ? cldLinha : (linha ? 1 : 0);
    const PCi = PSPD * CLDint; // (B.2)
    let PMi;
    if (s.pm_igual_1) {
      PMi = 1; // B.4.10: equipamento sem suportabilidade de impulso normalizada
    } else if (s.interface_optica) {
      PMi = 0; // B.4.11: interface isolante (fibra/acoplamento óptico/trafo com blindagem)
    } else {
      const wm1 = s.wm1_m ?? (npSpda === 'nenhum' ? null : spda.wm_m);
      let KS1 = wm1 == null ? 1 : Math.min(1, 0.12 * wm1); // (B.5)
      let KS2 = zona.wm2_m == null ? 1 : Math.min(1, 0.12 * zona.wm2_m); // (B.6)
      if (s.rede_equipotencial_malha) { KS1 /= 2; KS2 /= 2; } // nota de B.4.12
      const KS3 = exigir(T.KS3, s.ks3 || 'sem_preocupacao', `sistema ${s.nome}.ks3`);
      const KS4 = Math.min(1, 1 / s.uw_kv); // (B.7)
      const PMS = (KS1 * KS2 * KS3 * KS4) ** 2; // (B.4)
      PMi = PSPD < 1 ? PSPD * PMS : PMS; // (B.3) / B.4.8
    }
    return { ...s, dpsNp, PSPD, PCi, PMi };
  });
  const PC = 1 - sistemas.reduce((acc, s) => acc * (1 - s.PCi), 1); // (12)
  const PM = 1 - sistemas.reduce((acc, s) => acc * (1 - s.PMi), 1); // (13)
  reg('PC', PC, 'Eq. B.2 / Tabela B.3', 'combinação por Eq. 12');
  reg('PM', PM, 'B.4.5 a B.4.15', 'combinação por Eq. 13');

  comp.RB = ev.ND * PB * LB; // (5)
  comp.RC = ev.ND * PC * LC; // (6)
  comp.RM = ev.NM * PM * LC; // (7)
  freq.FC = ev.ND * PC;
  freq.FM = ev.NM * PM;
  if (zona.equipamento_zpr0a) freq.FB = ev.ND * PB; // 7.1.5

  // Linhas que entram na zona (S3 e S4)
  for (const linha of ev.linhas) {
    if (!linhaAtendeZona(linha, zona)) continue;
    const sistLinha = sistemas.filter(s => s.linha === linha.id);
    const uw = sistLinha.length ? Math.min(...sistLinha.map(s => s.uw_kv)) : (linha.uw_kv || 2.5); // B.4.15: menor UW
    const PSPD = sistLinha.length ? Math.max(...sistLinha.map(s => s.PSPD)) : 1; // sistema mais exposto
    const pebNp = sobrescrever.dps_np || linha.peb_np || 'nenhum';
    const PEB = exigir(T.PEB, pebNp, `linhas[${linha.id}].peb_np`);
    const chaveCld = ctx.cldCli(linha);
    const { cld: CLD, cli: CLI } = T.CLD_CLI[chaveCld];
    const PLD = exigir(T.PLD, linha.blindagem_rs || 'nao_blindada', `linhas[${linha.id}].blindagem_rs`)[colunaUw(T.PLD_UW, uw)];
    const tipoPli = linha.tipo === 'sinal' ? 'sinal' : 'energia';
    const PLI = T.PLI[tipoPli][colunaUw(T.PLI_UW, uw)];
    const PU = PTU * PEB * PLD * CLD; // (B.8)
    const PV = PEB * PLD * CLD;       // (B.9)
    const PW = PSPD * PLD * CLD;      // (B.10)
    const PZ = PSPD * PLI * CLI;      // (B.11)
    const N = linha.NL + linha.NDJ;
    comp.RU += N * PU * LU;  // (8)
    comp.RV += N * PV * LB;  // (9)
    comp.RW += N * PW * LC;  // (10)
    comp.RZ += linha.NI * PZ * LC; // (11)
    freq.FV += N * PEB;
    freq.FW += N * PW;
    freq.FZ += linha.NI * PZ;
    reg(`PU/PV/PW/PZ [${linha.id}]`, PU + PV + PW + PZ, 'Eq. B.8 a B.11; Tabelas B.4, B.8, B.9',
      `PU=${num(PU)} PV=${num(PV)} PW=${num(PW)} PZ=${num(PZ)}; UW=${uw} kV; PLD=${PLD}; PLI=${PLI}; CLD=${CLD}; CLI=${CLI}${chaveCld !== linha.cld_cli ? ` (${chaveCld})` : ''}`);

    if (zona.cz && dados.estrutura.ct_valor) {
      const LB3 = rp * rf * T.LF_L3 * zona.cz / dados.estrutura.ct_valor; // (C.7)
      r3.RV3 += N * PV * LB3;
    }
  }
  if (zona.cz && dados.estrutura.ct_valor) {
    const LB3 = rp * rf * T.LF_L3 * zona.cz / dados.estrutura.ct_valor;
    r3.RB3 = ev.ND * PB * LB3;
  }

  // RC, RM, RW e RZ entram em R1 só onde a falha de sistemas internos põe vida
  // em risco (nota da Eq. 1) — na Tabela C.2 isso é LO > 0 (explosão, hospital).
  const incluiD3 = oc.LO > 0;
  const R1 = comp.RA + comp.RB + comp.RU + comp.RV + (incluiD3 ? comp.RC + comp.RM + comp.RW + comp.RZ : 0);
  const F = Object.values(freq).reduce((a, b) => a + b, 0); // (14)
  // FT (Seção 7): 0,1/ano para sistemas críticos — não pode ser alterado — e
  // 1/ano para os demais (referencia/metodo.md). zona.ft só vale se for MAIS
  // restritivo que o da norma; valor maior é ignorado e registrado em ftIgnorado.
  const ftNorma = est.sistemas_criticos ? T.FT.critico : T.FT.nao_critico;
  const ftInformado = (zona.ft == null || zona.ft === '') ? null : Number(zona.ft);
  const ftAceito = ftInformado != null && Number.isFinite(ftInformado) && ftInformado > 0 && ftInformado <= ftNorma;
  const FT = ftAceito ? ftInformado : ftNorma;
  const ftIgnorado = (ftInformado != null && !ftAceito) ? zona.ft : null;
  return { zona, fator, fatores, comp, freq, r3, sistemas, PC, PM, R1, F, FT, ftNorma, ftIgnorado, incluiD3 };
}

function num(v) {
  if (v === 0) return '0';
  return Math.abs(v) >= 0.001 ? String(+v.toPrecision(4)) : v.toExponential(2);
}

// ── Análise completa ───────────────────────────────────────────────────────

function calcularCenario(dados, sobrescrever = {}) {
  const spda = { ...(dados.spda || {}) };
  if (sobrescrever.np_spda) spda.np = sobrescrever.np_spda;
  const dadosCenario = { ...dados, spda };
  const npSpda = sobrescrever.chave_pb || chaveNpSpda(spda);
  const ev = eventos(dadosCenario);
  const zonas = dados.zonas || [];
  const nt = dados.estrutura.nt || zonas.reduce((a, z) => a + (z.nz || 0), 0);
  if (!nt) throw new Error('Informe nz das zonas (número de pessoas) ou estrutura.nt');
  const cldCli = (linha) => (sobrescrever.fibra_sinal && linha.tipo === 'sinal') ? 'fibra_optica' : (linha.cld_cli || 'enterrada_nao_blindada');
  const ctx = { dados: dadosCenario, ev, nt, npSpda, sobrescrever, cldCli };
  const resultadosZonas = zonas.map(z => analisarZona(z, ctx));
  const R1 = resultadosZonas.reduce((a, z) => a + z.R1, 0);
  const R3 = resultadosZonas.reduce((a, z) => a + z.r3.RB3 + z.r3.RV3, 0);
  const zonasComF = resultadosZonas.filter(z => z.FT != null);
  const atendeF = zonasComF.every(z => z.F <= z.FT);
  const piorF = zonasComF.reduce((p, z) => (!p || z.F / z.FT > p.F / p.FT) ? z : p, null);
  return {
    eventos: ev,
    zonas: resultadosZonas,
    nt,
    npSpda,
    R1,
    R3,
    RT: T.RT_TOLERAVEL,
    atendeR1: R1 <= T.RT_TOLERAVEL.R1,
    atendeR3: R3 <= T.RT_TOLERAVEL.R3,
    atendeF,
    piorF: piorF ? { zona: piorF.zona.nome, F: piorF.F, FT: piorF.FT } : null,
  };
}

const ORDEM_NP = ['IV', 'III', 'II', 'I', 'I_descida_natural', 'cobertura_metalica_natural'];
const ORDEM_DPS = ['III-IV', 'II', 'I', 'melhor_I', 'melhor_I_max'];

// Varre combinações de NP do SPDA, NP dos DPS (PSPD e PEB) e fibra óptica nas
// linhas de sinal, da menor para a maior exigência (5.6 da NBR 5419-2).
function varrerCenarios(dados) {
  const spda = dados.spda || {};
  const nps = ORDEM_NP.filter(np => {
    if (np === 'I_descida_natural') return spda.descida_natural && spda.descidas_naturais_8_1_2_b;
    if (np === 'cobertura_metalica_natural') return spda.descida_natural && spda.cobertura_metalica_natural;
    return true;
  });
  const temSinalMetalico = (dados.linhas || []).some(l => l.tipo === 'sinal' && !['fibra_optica', 'interface_isolante'].includes(l.cld_cli));
  const fibras = temSinalMetalico ? [false, true] : [false];
  const cenarios = [];
  nps.forEach((np, iNp) => ORDEM_DPS.forEach((dps, iDps) => fibras.forEach(fibra => {
    const npBase = np.startsWith('I_') ? 'I' : (np === 'cobertura_metalica_natural' ? (spda.np || 'I') : np);
    const r = calcularCenario(dados, { np_spda: npBase, chave_pb: np, dps_np: dps, fibra_sinal: fibra });
    cenarios.push({
      np_spda: np, dps_np: dps, fibra, R1: r.R1, F: r.piorF ? r.piorF.F : 0, FT: r.piorF ? r.piorF.FT : null,
      atende: r.atendeR1 && r.atendeF, exigencia: iNp * 10 + iDps + (fibra ? 0.5 : 0),
    });
  })));
  cenarios.sort((a, b) => a.exigencia - b.exigencia);
  return cenarios;
}

function analisarRisco(dados) {
  const atual = calcularCenario(dados);
  const semProtecao = calcularCenario(dados, { np_spda: 'nenhum', chave_pb: 'nenhum', dps_np: 'nenhum', sem_mps: true });
  const cenarios = varrerCenarios(dados);
  const atendem = cenarios.filter(c => c.atende);
  return { atual, semProtecao, cenarios, menorQueAtende: atendem[0] || null };
}

module.exports = { analisarRisco, calcularCenario, varrerCenarios, eventos, areaExposicao, chaveNpSpda };
