// Detecção e alarme de incêndio (ABNT NBR 17240:2010) e iluminação de
// emergência (ABNT NBR 10898:2023).

// NBR 17240: raio de cobertura de detectores pontuais. A norma declara a área
// máxima como quadrado inscrito no círculo: 81 m² = 9 × 9 m para fumaça (5.4.1.1,
// r ≈ 6,30 m) e 36 m² = 6 × 6 m para temperatura (Fig. 15, r ≈ 4,20 m). Usa-se o
// raio exato desses quadrados (lado/√2) para que 9 × 9 m dê 1 detector, como diz a norma.
const RAIO = { fumaca: 9 / Math.SQRT2, temperatura: 6 / Math.SQRT2 };
const ALTURA_MAX = { fumaca: 8 }; // 5.4.1.1: detector pontual de fumaça até 8 m
const CAMINHAMENTO_ACIONADOR = 30; // 5.5.3
// bateria pela autonomia, modelo comercial, série (12 V; ligar 2 em série para 24 V) e fator do Anexo B:
// os comuns (alarme, controle de acesso, telefonia) — _comum/bateria.js
const { capacidadeBateriaAh, comercial, SERIES_BATERIA, FATOR_ENVELHECIMENTO } = require('../../../_comum/bateria');
const BATERIAS_AH = SERIES_BATERIA.vrla12vIncendio;

// Queda de tensão nos laços e nos circuitos de avisadores (14/11/2026): antes o cabo era fixo em
// 2 × 1,5 mm². Agora a seção sai da queda em CC (quedaCC do _comum/eletrico — ΔV = 2·L·I·ρ/S, ida e
// volta) com a corrente de ALARME do circuito concentrada no fim (lado da segurança) e a tensão que
// sobra no último dispositivo ≥ a tensão mínima de operação dele. A NBR 17240:2010 e a NT 23/2022-CBMDF
// (Sistemas de detecção e alarme de incêndio) não foram conferidas quanto a um limite numérico de queda
// [CONFERIR]; os valores de tensão abaixo são de catálogo/típicos [CONFERIR na ficha da central e do avisador].
const { quedaCC } = require('../../../_comum/eletrico/calculo');
const TENSAO_NOMINAL_V = 24;          // central de 24 Vcc (2 baterias de 12 V em série)
const TENSAO_FIM_BATERIA_V = 21;      // 2 × 10,5 V — fim de descarga típico de bateria VRLA (1,75 V/elemento) [CONFERIR central]
const TENSAO_MIN_DISPOSITIVO_V = 18;  // tensão mínima de operação adotada para avisadores/dispositivos de 24 V [CONFERIR ficha]
const SECOES_CABO_ALARME = [1.5, 2.5, 4]; // cabo blindado 2 vias — seções comerciais; 1,5 mm² é a usual de partida [CONFERIR NBR 17240, 6.8]

// Consumos padrão (mA) — valores típicos de mercado, substituíveis pelos dados do fabricante no formulário [CONFERIR]
const CONSUMO_PADRAO = {
  central: { repouso: 150, alarme: 400 },
  detector: { repouso: 0.3, alarme: 0.5 },
  acionador: { repouso: 0.3, alarme: 0.5 },
  avisador: { repouso: 0.3, alarme: 30 },
  modulo: { repouso: 0.5, alarme: 3 },
};

// Redução de cobertura por vigas (5.4.1.5 e 5.4.1.6) — aplicada ao espaçamento
function fatorViga(alturaViga) {
  const h = Number(alturaViga) || 0;
  if (h > 0.6) return 0.5;
  if (h > 0.2) return 2 / 3;
  return 1;
}

// Menor grade nx × ny em que cada retângulo cabe no círculo de raio r
// (nenhum ponto do teto a mais de r de um detector — 5.4.1.4)
function gradeDetectores(L, W, r) {
  if (!(L > 0) || !(W > 0)) return { n: 0, nx: 0, ny: 0 };
  let melhor = null;
  const maxNx = Math.ceil(L / (r * 0.05)) + 1;
  for (let nx = 1; nx <= maxNx; nx++) {
    const meio = L / (2 * nx);
    if (meio >= r) continue;
    const cordaY = 2 * Math.sqrt(r * r - meio * meio);
    const ny = Math.max(1, Math.ceil(W / cordaY - 1e-9));
    const n = nx * ny;
    if (!melhor || n < melhor.n || (n === melhor.n && Math.abs(L / nx - W / ny) < Math.abs(melhor.dx - melhor.dy))) {
      melhor = { n, nx, ny, dx: L / nx, dy: W / ny };
    }
  }
  return melhor;
}

// NBR 10898: distância máxima entre luminárias de aclaramento = 4h (2h de cada lado — Fig. A.3)
function luminariasEmergencia(L, W, h) {
  const passo = 4 * (Number(h) || 2.5);
  return Math.max(1, Math.ceil(L / passo)) * Math.max(1, Math.ceil(W / passo));
}

// NBR 10898:2023, 4.9: autonomia mínima de 2 h da iluminação de emergência (a edição
// de 2013 pedia 1 h) ou a maior exigida pela autoridade local (IT/NT do Corpo de
// Bombeiros — CBMDF [CONFERIR]). Valor informado menor que 2 h não é aceito.
const AUTONOMIA_EMERG_MIN_H = 2;

function calcular(dados) {
  const sis = dados.sistema || {};
  const autInf = Number(String(sis.autonomia_iluminacao_h ?? '').replace(',', '.'));
  const autonomiaEmergH = Number.isFinite(autInf) && autInf > AUTONOMIA_EMERG_MIN_H ? autInf : AUTONOMIA_EMERG_MIN_H;
  const tipoSistema = sis.tipo || 'enderecavel';
  const consumo = { ...CONSUMO_PADRAO };
  for (const k of Object.keys(CONSUMO_PADRAO)) {
    const c = (sis.consumos || {})[k];
    if (c && (c.repouso != null || c.alarme != null)) consumo[k] = { repouso: Number(c.repouso ?? CONSUMO_PADRAO[k].repouso), alarme: Number(c.alarme ?? CONSUMO_PADRAO[k].alarme) };
  }
  const avisos = [];
  if (Number.isFinite(autInf) && sis.autonomia_iluminacao_h !== '' && sis.autonomia_iluminacao_h != null && autInf < AUTONOMIA_EMERG_MIN_H) avisos.push(`Autonomia da iluminação de emergência informada (${String(autInf).replace('.', ',')} h) abaixo do mínimo de 2 h da NBR 10898:2023 (4.9) — adotadas 2 h.`);
  const ambientes = (dados.ambientes || []).filter(a => Number(a.comprimento_m) > 0 && Number(a.largura_m) > 0).map(a => {
    const tipo = a.detector || 'fumaca';
    const L = Number(a.comprimento_m);
    const W = Number(a.largura_m);
    const pe = Number(a.pe_direito_m) || 3;
    if (tipo === 'nenhum') return { ...a, L, W, pe, detectores: 0, grade: null, raio: null };
    const r = RAIO[tipo] * fatorViga(a.altura_viga_m);
    const grade = gradeDetectores(L, W, r);
    if (ALTURA_MAX[tipo] && pe > ALTURA_MAX[tipo]) avisos.push(`${a.nome}: pé-direito de ${pe} m acima de 8 m — detector pontual de fumaça não é adequado (5.4.1.1); avaliar detector linear ou por amostragem de ar. [CONFERIR]`);
    return { ...a, L, W, pe, tipo, raio: r, grade, detectores: grade.n };
  });

  const ambIlum = ambientes.filter(a => a.rota_fuga);
  const iluminacao = ambIlum.map(a => {
    const h = Number(a.altura_luminaria_m) || Math.min(a.pe, 2.5);
    const aclaramento = luminariasEmergencia(a.L, a.W, h);
    const balizamento = (Number(a.saidas) || 0) + (Number(a.mudancas_direcao) || 0) + Math.max(0, Math.ceil(Math.max(a.L, a.W) / 15) - 1);
    return { nome: a.nome, pavimento: a.pavimento, h, aclaramento, balizamento, nivelLux: a.escada ? 5 : 3, escada: !!a.escada };
  });

  const pavimentos = (dados.pavimentos || []).map(p => {
    const comp = Number(p.maior_caminhamento_m) || 0;
    const acionadores = Math.max(1, Math.ceil(comp / (2 * CAMINHAMENTO_ACIONADOR)), Number(p.saidas_emergencia) || 0);
    const area = Number(p.area_m2) || 0;
    const avisadores = Math.max(acionadores, Math.ceil(area / (Number(sis.area_por_avisador_m2) || 400)));
    return { ...p, comp, acionadores, avisadores, area };
  });
  // Quantidades INFORMADAS (14/11/2026 — projeto pela especificação do cliente: a especificação da central
  // traz a contagem de dispositivos, não os ambientes). Valem sobre o que sairia dos ambientes/pavimentos.
  const qi = sis.quantidades_informadas || {};
  const informado = (k) => Number.isFinite(Number(qi[k])) && qi[k] !== null && qi[k] !== '' && Number(qi[k]) >= 0;
  const temInformadas = ['detectores_fumaca', 'detectores_temperatura', 'acionadores', 'avisadores'].some(informado);
  if (!pavimentos.length && !temInformadas) avisos.push('Cadastre os pavimentos (área e maior caminhamento) para dimensionar acionadores e avisadores. [CONFERIR]');
  if (!temInformadas || !informado('avisadores')) avisos.push('Quantidade de avisadores estimada pela área — confirmar a audibilidade em todos os pontos (5.6.1). [CONFERIR]');
  else avisos.push('Quantidades de detectores, acionadores e avisadores informadas pela especificação do cliente — confirmar a cobertura (5.4) e a audibilidade (5.6.1) na planta. [CONFERIR]');

  const detF = informado('detectores_fumaca') ? Number(qi.detectores_fumaca) : ambientes.filter(a => a.tipo === 'fumaca').reduce((s, a) => s + a.detectores, 0);
  const detT = informado('detectores_temperatura') ? Number(qi.detectores_temperatura) : ambientes.filter(a => a.tipo === 'temperatura').reduce((s, a) => s + a.detectores, 0);
  const nDet = temInformadas ? detF + detT : ambientes.reduce((s, a) => s + a.detectores, 0);
  const nAc = informado('acionadores') ? Number(qi.acionadores) : pavimentos.reduce((s, p) => s + p.acionadores, 0);
  const nAv = informado('avisadores') ? Number(qi.avisadores) : pavimentos.reduce((s, p) => s + p.avisadores, 0);
  const nMod = Number(sis.modulos_comando) || 0;
  const dispositivos = nDet + nAc + nAv + nMod;
  const limiteLaco = Number(sis.dispositivos_por_laco) || 125;
  // reserva por laço pedida (ex.: "laços com 20 % de reserva"): os dispositivos com a reserva cabem no limite
  const reservaLaco = Number(sis.reserva_laco_pct) > 0 ? Number(sis.reserva_laco_pct) / 100 : 0;
  const lacos = tipoSistema === 'enderecavel' ? Math.max(1, Math.ceil(dispositivos * (1 + reservaLaco) / limiteLaco)) : null;
  const zonas = tipoSistema === 'convencional' ? Math.max(1, pavimentos.length || 1, Math.ceil((nDet + nAc) / (Number(sis.dispositivos_por_zona) || 20))) : null;

  // Anexo B: fonte e bateria (24 h em repouso + 5 min em alarme, fator 1,2)
  const linhas = [
    { equipamento: 'Central', qtd: 1, ...consumo.central },
    { equipamento: 'Detectores', qtd: nDet, ...consumo.detector },
    { equipamento: 'Acionadores manuais', qtd: nAc, ...consumo.acionador },
    { equipamento: 'Avisadores audiovisuais', qtd: nAv, ...consumo.avisador },
    ...(nMod ? [{ equipamento: 'Módulos de comando', qtd: nMod, ...consumo.modulo }] : []),
  ].map(l => ({ ...l, totalRepouso: l.qtd * l.repouso, totalAlarme: l.qtd * l.alarme }));
  const iRepouso = linhas.reduce((s, l) => s + l.totalRepouso, 0);
  const iAlarme = linhas.reduce((s, l) => s + l.totalAlarme, 0);
  const tRepouso = Number(sis.tempo_repouso_h) || 24;
  // alarme na bateria: 5 min (15 min com avisador de mensagem de voz) — roteiro da NBR 17240:2010; várias NT/IT de
  // corpo de bombeiros pedem 15 min em qualquer caso (ex.: CBMGO NT 19/2022). Revisão de normas de 04/11/2026.
  const tAlarme = Number(sis.tempo_alarme_min) || (sis.avisador_voz ? 15 : 5);
  if (!Number(sis.tempo_alarme_min)) avisos.push(`Bateria da central com ${tRepouso} h em repouso + ${tAlarme} min em alarme${sis.avisador_voz ? ' (avisador por voz)' : ''}: a IT/NT do corpo de bombeiros local pode exigir 15 min de alarme. [CONFERIR IT/NT local]`);
  const fonteA = 1.2 * iAlarme / 1000;
  // Anexo B pela função comum (_comum/bateria.js), correntes em A. Modelo comercial pela regra comum:
  // acima de 100 Ah, pares de 24 V em paralelo (antes saía uma "bateria" de ⌈Ah⌉, fora da série)
  const bateriaAh = capacidadeBateriaAh({ iRepouso: iRepouso / 1000, tRepouso, iAlarme: iAlarme / 1000, tAlarme: tAlarme / 60, fator: FATOR_ENVELHECIMENTO.nbr17240 });
  const { valor: bateriaEscolhida, qtd: nConjuntos } = comercial(BATERIAS_AH, bateriaAh);

  // cabo dos laços: perímetros dos ambientes + caminhamentos × 1,3 (estimativa de traçado) [CONFERIR]
  const caboEstimado = Math.ceil((ambientes.reduce((s, a) => s + a.L + a.W, 0) + pavimentos.reduce((s, p) => s + p.comp, 0)) * 1.3);
  const caboLaco = informado('cabo_m') && Number(qi.cabo_m) > 0 ? Math.ceil(Number(qi.cabo_m)) : caboEstimado;
  if (temInformadas && !caboLaco) avisos.push('Comprimento dos laços não informado: cabo blindado e eletroduto do sistema a levantar na planta. [CONFERIR]');
  // ── Queda de tensão nos circuitos (laço/zona e avisadores) ──────────────
  const vFonte = Number(sis.tensao_fonte_min_v) > 0 ? Number(sis.tensao_fonte_min_v) : TENSAO_FIM_BATERIA_V;
  const vMin = Number(sis.tensao_minima_dispositivo_v) > 0 ? Number(sis.tensao_minima_dispositivo_v) : TENSAO_MIN_DISPOSITIVO_V;
  const quedaAdmissivel = Math.max(0, vFonte - vMin);
  const tensoesTipicas = !(Number(sis.tensao_fonte_min_v) > 0) || !(Number(sis.tensao_minima_dispositivo_v) > 0);
  const avisadoresNoLaco = sis.avisadores_no_laco != null ? !!sis.avisadores_no_laco : tipoSistema === 'enderecavel';
  const nCircLaco = Math.max(1, lacos || zonas || 1);
  const escolherSecao = (L, iA) => {
    for (const s of SECOES_CABO_ALARME) {
      const q = quedaCC({ comprimento: L, corrente: iA, secao: s, tensao: vFonte });
      if (q.v <= quedaAdmissivel + 1e-9) return { secao: s, queda: q.v, quedaPct: q.pct, atende: true };
    }
    const s = SECOES_CABO_ALARME[SECOES_CABO_ALARME.length - 1];
    const q = quedaCC({ comprimento: L, corrente: iA, secao: s, tensao: vFonte });
    return { secao: s, queda: q.v, quedaPct: q.pct, atende: false };
  };
  const circuitosQueda = [];
  const iLacoTotal = nDet * consumo.detector.alarme + nAc * consumo.acionador.alarme + nMod * consumo.modulo.alarme + (avisadoresNoLaco ? nAv * consumo.avisador.alarme : 0);
  const compLaco = Number(sis.comprimento_laco_m) > 0 ? Number(sis.comprimento_laco_m) : (caboLaco ? caboLaco / nCircLaco : 0);
  if (compLaco > 0) {
    const iA = iLacoTotal / nCircLaco / 1000;
    circuitosQueda.push({ circuito: tipoSistema === 'enderecavel' ? 'Laço' : 'Zona', quantidade: nCircLaco, comprimento: compLaco, correnteA: iA, avisadores: avisadoresNoLaco ? Math.ceil(nAv / nCircLaco) : 0, ...escolherSecao(compLaco, iA) });
  }
  if (!avisadoresNoLaco && nAv) {
    const nCircAv = Math.max(1, Number(sis.circuitos_avisadores) || nCircLaco);
    const compAv = Number(sis.comprimento_circuito_avisadores_m) > 0 ? Number(sis.comprimento_circuito_avisadores_m) : (caboLaco ? caboLaco / nCircAv : 0);
    if (compAv > 0) {
      const avPorCirc = Math.ceil(nAv / nCircAv);
      const iA = avPorCirc * consumo.avisador.alarme / 1000;
      circuitosQueda.push({ circuito: 'Avisadores', quantidade: nCircAv, comprimento: compAv, correnteA: iA, avisadores: avPorCirc, ...escolherSecao(compAv, iA) });
    }
  }
  for (const c of circuitosQueda.filter(x => !x.atende)) avisos.push(`${c.circuito}: ${String(Math.round(c.comprimento))} m com ${c.correnteA.toFixed(2).replace('.', ',')} A em alarme — queda de ${c.queda.toFixed(1).replace('.', ',')} V mesmo com 2 × ${String(c.secao).replace('.', ',')} mm² (admissível ${quedaAdmissivel.toFixed(1).replace('.', ',')} V): dividir em mais circuitos ou usar fonte auxiliar supervisionada. [CONFERIR]`);
  if (tensoesTipicas && circuitosQueda.length) avisos.push(`Queda de tensão dos circuitos verificada com ${String(vFonte).replace('.', ',')} V na saída da central (fim da bateria) e ${String(vMin).replace('.', ',')} V mínimos no último dispositivo — valores típicos; informe os da ficha da central e do avisador. [CONFERIR]`);
  const secaoCabo = circuitosQueda.length ? Math.max(...circuitosQueda.map(c => c.secao)) : SECOES_CABO_ALARME[0];
  const quedaTensao = { vFonte, vMin, quedaAdmissivel, avisadoresNoLaco, circuitos: circuitosQueda, secao: secaoCabo };

  const nAclar = iluminacao.reduce((s, x) => s + x.aclaramento, 0);
  const nBaliz = iluminacao.reduce((s, x) => s + x.balizamento, 0);
  const materiais = [
    ...(detF ? [{ codigo: 'DET-F', descricao: `Detector pontual de fumaça óptico ${tipoSistema === 'enderecavel' ? 'endereçável' : 'convencional'} com base`, unidade: 'un', quantidade: detF, referencia: 'NBR 17240, 5.4.1' }] : []),
    ...(detT ? [{ codigo: 'DET-T', descricao: `Detector pontual de temperatura (termovelocimétrico) ${tipoSistema === 'enderecavel' ? 'endereçável' : 'convencional'} com base`, unidade: 'un', quantidade: detT, referencia: 'NBR 17240, 5.4.2' }] : []),
    { codigo: 'ACM', descricao: `Acionador manual tipo quebra-vidro/rearmável ${tipoSistema === 'enderecavel' ? 'endereçável' : 'convencional'}, vermelho`, unidade: 'un', quantidade: nAc, referencia: 'NBR 17240, 5.5' },
    { codigo: 'AV', descricao: 'Avisador audiovisual (sirene com strobo)', unidade: 'un', quantidade: nAv, referencia: 'NBR 17240, 5.6' },
    { codigo: 'CEN', descricao: tipoSistema === 'enderecavel' ? `Central de alarme endereçável com ${lacos} laço(s)` : `Central de alarme convencional com ${zonas} zona(s)`, unidade: 'un', quantidade: 1, referencia: 'NBR 17240, 5.3 e 6.1' },
    { codigo: 'BAT', descricao: `Bateria selada 12 V ${bateriaEscolhida} Ah (par em série para 24 V${nConjuntos > 1 ? `; ${nConjuntos} pares em paralelo` : ''})`, unidade: 'un', quantidade: 2 * nConjuntos, referencia: 'NBR 17240, Anexo B' },
    ...(nMod ? [{ codigo: 'MOD', descricao: 'Módulo de comando/monitoramento (interfaces: portas, HVAC)', unidade: 'un', quantidade: nMod, referencia: 'NBR 17240, 5.7' }] : []),
    { codigo: 'CAB', descricao: `Cabo blindado 2 × ${String(secaoCabo).replace('.', ',')} mm² para laço de detecção e alarme (seção pela queda de tensão; comprimento estimado)`, unidade: 'm', quantidade: caboLaco, referencia: 'NBR 17240, 6.8; queda em CC (ΔV = 2·L·I·ρ/S)' },
    { codigo: 'ELE', descricao: 'Eletroduto exclusivo do sistema de alarme (estimativa)', unidade: 'm', quantidade: caboLaco, referencia: 'NBR 17240, 6.7' },
    ...(nAclar ? [{ codigo: 'LE', descricao: `Luminária de emergência bloco autônomo LED ≥ 300 lm, autonomia ≥ ${String(autonomiaEmergH).replace('.', ',')} h`, unidade: 'un', quantidade: nAclar, referencia: 'NBR 10898, 4.9 e 6.1.2.4' }] : []),
    ...(nBaliz ? [{ codigo: 'SIN', descricao: 'Sinalização de saída/rota de fuga iluminada (balizamento ≥ 30 lm)', unidade: 'un', quantidade: nBaliz, referencia: 'NBR 10898, 5.2 e 14.18' }] : []),
  ].filter(m => m.quantidade > 0);

  return {
    tipoSistema, ambientes, pavimentos, iluminacao, nDet, nAc, nAv, nMod, dispositivos, lacos, zonas, limiteLaco,
    bateria: { linhas, iRepouso, iAlarme, tRepouso, tAlarme, fonteA, bateriaAh, bateriaEscolhida, nConjuntos }, quedaTensao,
    nAclar, nBaliz, autonomiaEmergH, materiais, avisos,
  };
}

module.exports = { calcular, AUTONOMIA_EMERG_MIN_H, gradeDetectores, fatorViga, luminariasEmergencia, RAIO, CONSUMO_PADRAO };
