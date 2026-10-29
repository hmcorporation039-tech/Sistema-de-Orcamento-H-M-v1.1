// Projeto luminotécnico e automação de iluminação.
// Requisitos por atividade (Em, UGR_L, Ra) da ABNT NBR ISO/CIE 8995-1:2013;
// quantidade de luminárias pelo método dos lúmens; grade nx × ny com
// espaçamento máximo; densidade de potência; comandos (interruptor, dimmer,
// sensor, DALI, 0-10 V, cenas); circuitos de iluminação dimensionados pelo
// MESMO motor da skill de elétrica (NBR 5410) — como fazem carregador e solar.

const E = require('../../../_comum/eletrico/calculo');
const T = require('../../../_comum/eletrico/tabelas');
const ATIV = require('../../dados/atividades_iso8995.json');
const FUT = require('../../dados/fator_utilizacao.json');

const ATIVIDADES = ATIV.atividades;
const ATIVIDADE = Object.fromEntries(ATIVIDADES.map(a => [a.id, a]));

// Fator de manutenção por estado de conservação do ambiente (premissa [CONFERIR]:
// a NBR ISO/CIE 8995-1 pede que o projetista declare o FM e o plano de manutenção)
const FM = { limpo: 0.8, normal: 0.7, sujo: 0.6 };
const ROTULO_CONSERVACAO = { limpo: 'Limpo (escritório, sala de aula, hospital)', normal: 'Normal (comércio, circulação, copa)', sujo: 'Sujo (indústria, garagem, depósito)' };
const CONTROLES = {
  interruptor: 'Interruptor (liga/desliga)',
  dimmer: 'Dimmer (corte de fase)',
  sensor: 'Sensor de presença (liga/desliga)',
  dali: 'DALI-2 (endereçável)',
  '010': '0-10 V (dimerização analógica)',
  cena: 'Cenas (DALI-2 com teclado de cenas)',
};
const TIPOS_LUMINARIA = { embutir: 'de embutir', sobrepor: 'de sobrepor', pendente: 'pendente', perfil: 'perfil LED linear' };
const DIMERIZAVEL = ['dimmer', 'dali', '010', 'cena'];
const DALI = ['dali', 'cena'];

const arred = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;
const num = (v, padrao) => (v === '' || v == null || Number.isNaN(Number(v)) ? padrao : Number(v));
const FOLGA = 1.1; // +10 % de cabo para sobras e emendas (mesma premissa da elétrica)

// ── Fórmulas ───────────────────────────────────────────────────────────────

// Índice do recinto k = C·L / (hm·(C + L)); para ambiente irregular usa a área real
function indiceRecinto(C, L, hm, area) {
  const A = area ?? C * L;
  return A / (hm * (C + L));
}

function interpolar(xs, ys, x) {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  const i = xs.findIndex((v, j) => x >= v && x <= xs[j + 1]);
  return ys[i] + (ys[i + 1] - ys[i]) * (x - xs[i]) / (xs[i + 1] - xs[i]);
}

// Vizinhos de v numa lista de valores: [a, b, t] com v = a + t·(b − a)
function vizinhos(lista, v) {
  const xs = [...lista].sort((a, b) => a - b);
  if (v <= xs[0]) return [xs[0], xs[0], 0];
  if (v >= xs[xs.length - 1]) return [xs[xs.length - 1], xs[xs.length - 1], 0];
  const i = xs.findIndex((x, j) => v >= x && v <= xs[j + 1]);
  return [xs[i], xs[i + 1], (v - xs[i]) / (xs[i + 1] - xs[i])];
}

// FU pela tabela simplificada (dados/fator_utilizacao.json): linear em k,
// bilinear nas refletâncias de teto e parede, correção pelo piso
function fatorUtilizacao(k, teto = 0.7, parede = 0.5, piso = 0.2) {
  const fuK = (t, p) => interpolar(FUT.k, FUT.fu[`${t}|${p}`], k);
  const [t0, t1, tt] = vizinhos(FUT.teto, teto);
  const [p0, p1, tp] = vizinhos(FUT.parede, parede);
  const a = fuK(t0, p0) + (fuK(t1, p0) - fuK(t0, p0)) * tt;
  const b = fuK(t0, p1) + (fuK(t1, p1) - fuK(t0, p1)) * tt;
  const pisos = Object.keys(FUT.piso).map(Number).sort((x, y) => x - y);
  const fPiso = interpolar(pisos, pisos.map(x => FUT.piso[String(x)]), piso);
  return (a + (b - a) * tp) * fPiso;
}

// Método dos lúmens: N = Em·A / (Φ·FU·FM)
function metodoLumens({ em, area, fluxo, fu, fm }) {
  return (em * area) / (fluxo * fu * fm);
}

// Grade nx × ny (nx ao longo do comprimento C, ny ao longo da largura L) com
// pelo menos `nMin` luminárias, espaçamento ≤ smax nos dois sentidos e
// espaçamentos parecidos (maior/menor ≤ razaoMax); entre as grades válidas,
// a de menos luminárias e, no empate, a mais "quadrada".
function escolherGrade(nMin, C, L, smax, razaoMax = 1.5, exata = false) {
  const nxMin = Math.max(1, Math.ceil(C / smax - 1e-9));
  const nyMin = Math.max(1, Math.ceil(L / smax - 1e-9));
  const candidatos = [];
  const limite = Math.max(nMin, nxMin) + nxMin + 2;
  for (let nx = exata ? 1 : nxMin; nx <= limite; nx++) {
    const ny = exata ? nMin / nx : Math.max(nyMin, Math.ceil(nMin / nx));
    if (exata && !Number.isInteger(ny)) continue;
    const dx = C / nx;
    const dy = L / ny;
    // fila única: aceita quando a dimensão transversal não passa do passo da
    // fila (corredor); fila curta num ambiente largo é penalizada (pede 2 filas)
    let razao = 1;
    if (nx > 1 && ny > 1) razao = Math.max(dx, dy) / Math.min(dx, dy);
    else if (nx > 1 || ny > 1) {
      const passo = nx > 1 ? dx : dy;
      const cruz = nx > 1 ? L : C;
      razao = cruz <= passo ? 1 : cruz / passo;
    }
    candidatos.push({ nx, ny, n: nx * ny, dx, dy, razao, okEspacamento: dx <= smax + 1e-9 && dy <= smax + 1e-9 });
  }
  const validos = candidatos.filter(g => g.razao <= razaoMax + 1e-9 && g.okEspacamento);
  const lista = validos.length ? validos : candidatos;
  lista.sort((a, b) => (a.n - b.n) || (Number(b.okEspacamento) - Number(a.okEspacamento)) || (a.razao - b.razao));
  return lista[0];
}

// Malha de medição: p = 0,2·5^log10(d), d = maior dimensão (premissa da
// EN 12464-1 [CONFERIR com a NBR ISO/CIE 8995-1]); pontos no centro das células
function malhaMedicao(C, L) {
  const d = Math.max(C, L);
  const p = Math.min(10, 0.2 * 5 ** Math.log10(Math.max(d, 1)));
  const nx = Math.max(1, Math.ceil(C / p - 1e-9));
  const ny = Math.max(1, Math.ceil(L / p - 1e-9));
  return { p, nx, ny, pontos: nx * ny };
}

function posicoesGrade(nx, ny, C, L) {
  const dx = C / nx;
  const dy = L / ny;
  const pts = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) pts.push({ x: arred(dx * (i + 0.5), 3), y: arred(dy * (j + 0.5), 3) });
  return pts;
}

// ── Configuração ───────────────────────────────────────────────────────────

function configProjeto(dados) {
  const p = dados.projeto || {};
  return {
    fatorEspacamento: num(p.fator_espacamento, 1.5),
    razaoMax: num(p.razao_max_espacamento, 1.5),
    eficaciaMin: num(p.eficacia_minima_lm_w, 100),
    sensorDiametro: num(p.sensor_diametro_m, 8),
    dimmerW: num(p.dimmer_capacidade_w, 200),
    releSensorW: num(p.rele_sensor_w, 400),
    drivers010: num(p.drivers_por_controlador_010, 20),
    enderecosDali: num(p.enderecos_dali, 64),
    fpDriver: num(p.fp_driver, 0.92),
    fonteW: num(p.fonte_perfil_w, 100),
    potenciaMaxCircuitoVa: num(p.potencia_max_circuito_va, 0) > 0 ? num(p.potencia_max_circuito_va) : null,
    conservacao: FM[p.conservacao_padrao] ? p.conservacao_padrao : 'normal',
    ligacao: (dados.instalacao || {}).ligacao_iluminacao === 'FF' ? 'FF' : 'FN',
  };
}

function normalizarLuminaria(l, i) {
  const tipo = TIPOS_LUMINARIA[l.tipo] ? l.tipo : 'embutir';
  const lum = {
    ...l, codigo: String(l.codigo || `LUM${i + 1}`).trim(), tipo,
    potencia: num(l.potencia_w, 0), fluxo: num(l.fluxo_lm, 0),
    ra: num(l.ra, null), tcc: num(l.tcc_k, null), ugr: num(l.ugr, null), fu: num(l.fu, null),
    suspensao: num(l.suspensao_m, tipo === 'pendente' ? 0.8 : 0),
    comprimento: tipo === 'perfil' ? num(l.comprimento_m, 1) : null,
    driverExterno: tipo === 'perfil' || !!l.driver_externo,
  };
  if (!(lum.potencia > 0) || !(lum.fluxo > 0)) throw new Error(`Luminária ${lum.codigo}: informe potência (W) e fluxo luminoso (lm) maiores que zero.`);
  lum.eficacia = lum.fluxo / lum.potencia;
  return lum;
}

// ── Ambiente ───────────────────────────────────────────────────────────────

function calcularAmbiente(a, idx, luminarias, p, avisos) {
  const nome = (a.nome || `Ambiente ${idx + 1}`).trim();
  const ativ = ATIVIDADE[a.atividade];
  if (!ativ && !(num(a.em_lx, 0) > 0)) throw new Error(`${nome}: escolha a atividade (tabela da NBR ISO/CIE 8995-1) ou informe a iluminância exigida.`);
  const at = ativ || { id: 'personalizada', grupo: '—', rotulo: 'Atividade informada', em: null, ugr: null, ra: null, uo: 0.7, plano_m: 0.75 };

  // dimensões
  let C = num(a.comprimento_m, 0);
  let L = num(a.largura_m, 0);
  let area = num(a.area_m2, 0);
  if (!(C > 0 && L > 0)) {
    if (!(area > 0)) throw new Error(`${nome}: informe comprimento × largura ou a área.`);
    C = Math.sqrt(area);
    L = C;
    avisos.push(`${nome}: só a área foi informada — grade calculada para um quadrado equivalente de ${arred(C, 2)} m. [CONFERIR]`);
  }
  if (!(area > 0)) area = C * L;
  if (C < L) [C, L] = [L, C]; // C = maior dimensão (eixo x da grade)

  // luminária
  const codigo = String(a.luminaria || '').trim();
  const lum = codigo ? luminarias.find(l => l.codigo === codigo) : luminarias[0];
  if (!lum) throw new Error(`${nome}: luminária "${codigo}" não está na tabela de luminárias do projeto.`);
  if (!codigo) avisos.push(`${nome}: sem luminária escolhida — usada a primeira da tabela (${lum.codigo}).`);

  // alturas
  const peDireito = num(a.pe_direito_m, 0) > 0 ? num(a.pe_direito_m) : 2.8;
  if (!(num(a.pe_direito_m, 0) > 0)) avisos.push(`${nome}: pé-direito não informado — adotado 2,8 m. [CONFERIR]`);
  const plano = num(a.plano_trabalho_m, at.plano_m ?? 0.75);
  const alturaMontagem = num(a.altura_montagem_m, 0) > 0 ? num(a.altura_montagem_m) : peDireito - lum.suspensao;
  const hm = alturaMontagem - plano;
  if (!(hm > 0)) throw new Error(`${nome}: altura útil hm = ${arred(hm, 2)} m (montagem ${arred(alturaMontagem, 2)} m − plano ${arred(plano, 2)} m) — revise pé-direito, suspensão e plano de trabalho.`);

  // fatores
  const refl = { teto: num(a.refl_teto, 0.7), parede: num(a.refl_parede, 0.5), piso: num(a.refl_piso, 0.2) };
  const k = indiceRecinto(C, L, hm, area);
  let fu;
  let fuFonte;
  if (num(a.fu, 0) > 0) { fu = num(a.fu); fuFonte = 'informado no ambiente'; } else if (lum.fu > 0) { fu = lum.fu; fuFonte = 'do fabricante (luminária)'; } else { fu = fatorUtilizacao(k, refl.teto, refl.parede, refl.piso); fuFonte = 'tabela simplificada [CONFERIR]'; }
  const conservacao = FM[a.conservacao] ? a.conservacao : p.conservacao;
  const fm = num(a.fm, 0) > 0 ? num(a.fm) : FM[conservacao];
  const emExigida = num(a.em_lx, 0) > 0 ? num(a.em_lx) : at.em;

  // método dos lúmens e grade
  const nCalc = metodoLumens({ em: emExigida, area, fluxo: lum.fluxo, fu, fm });
  const nMin = Math.max(1, Math.ceil(nCalc - 1e-9));
  const smax = p.fatorEspacamento * hm;
  const nInformado = num(a.quantidade, 0) > 0 ? Math.round(num(a.quantidade)) : null;
  const g = escolherGrade(nInformado || nMin, C, L, smax, p.razaoMax, !!nInformado);
  const n = g.n;
  if (!nInformado && n > nMin) {
    const motivo = Math.ceil(C / smax - 1e-9) * Math.ceil(L / smax - 1e-9) > nMin ? 'pelo espaçamento máximo' : 'para fechar a grade regular';
    avisos.push(`${nome}: ${nMin} luminárias pelo método dos lúmens → ${n} (${g.nx} × ${g.ny}) ${motivo}.`);
  }
  const emObtida = (n * lum.fluxo * fu * fm) / area;
  const potencia = n * lum.potencia;
  const dpi = potencia / area;
  const dpi100 = dpi / (emObtida / 100);
  const okEm = emObtida >= emExigida - 1e-6;
  if (!okEm) avisos.push(`${nome}: Em obtida ${Math.round(emObtida)} lx < exigida ${emExigida} lx com ${n} luminárias informadas.`);
  if (!g.okEspacamento) avisos.push(`${nome}: espaçamento ${arred(Math.max(g.dx, g.dy), 2)} m acima do máximo ${arred(smax, 2)} m (≈ ${p.fatorEspacamento} × hm) — uniformidade pode não ser atendida. [CONFERIR]`);
  const okRa = lum.ra != null && at.ra != null ? lum.ra >= at.ra : null;
  if (okRa === false) avisos.push(`${nome}: Ra ${lum.ra} da luminária ${lum.codigo} abaixo do mínimo ${at.ra} da atividade.`);
  const okUgr = lum.ugr != null && at.ugr != null ? lum.ugr <= at.ugr : null;
  if (okUgr === false) avisos.push(`${nome}: UGR ${lum.ugr} da luminária ${lum.codigo} acima do limite ${at.ugr}.`);
  // Requisito existe e a luminária não informa o dado: não verificado (nunca "atendido")
  if (okRa === null && at.ra != null) avisos.push(`${nome}: Ra da luminária ${lum.codigo} não informado — a atividade exige Ra ≥ ${at.ra}; requisito NÃO verificado até informar o dado da ficha técnica. [CONFERIR]`);
  if (okUgr === null && at.ugr != null) avisos.push(`${nome}: UGR da luminária ${lum.codigo} não informado — a atividade limita UGR_L ≤ ${at.ugr}; requisito NÃO verificado até informar o dado do fabricante. [CONFERIR]`);
  const okDpi = at.dpi_ref ? dpi <= at.dpi_ref : null;
  if (okDpi === false) avisos.push(`${nome}: densidade de potência ${arred(dpi, 1)} W/m² acima da referência ${at.dpi_ref} W/m² [CONFERIR com a INI-C].`);

  // comandos e automação
  const controle = CONTROLES[a.controle] ? a.controle : 'interruptor';
  const presenca = controle === 'sensor' || !!a.sensor_presenca;
  const portas = Math.max(1, Math.round(num(a.portas, 1)));
  const lado = p.sensorDiametro / Math.SQRT2; // quadrado inscrito no círculo de detecção
  const sNx = presenca ? Math.max(1, Math.ceil(C / lado - 1e-9)) : 0;
  const sNy = presenca ? Math.max(1, Math.ceil(L / lado - 1e-9)) : 0;
  const sensores = { n: sNx * sNy, nx: sNx, ny: sNy, tipo: DALI.includes(controle) ? 'dali' : controle === '010' ? '010' : 'rele', posicoes: presenca ? posicoesGrade(sNx, sNy, C, L) : [] };
  const fontes = lum.tipo === 'perfil' ? Math.ceil(potencia / (num(lum.fonte_w, p.fonteW) * 0.8) - 1e-9) : lum.driverExterno ? n : 0;
  const enderecos = DALI.includes(controle) ? (lum.driverExterno ? fontes : n) : 0;
  const comandos = {
    interruptores: controle === 'interruptor' ? portas : 0,
    dimmers: controle === 'dimmer' ? Math.max(1, Math.ceil(potencia / p.dimmerW - 1e-9)) : 0,
    botoeirasDali: controle === 'dali' ? portas : 0,
    tecladosCena: controle === 'cena' ? portas : 0,
    controladores010: controle === '010' ? Math.max(1, Math.ceil((lum.driverExterno ? fontes : n) / p.drivers010 - 1e-9)) : 0,
    releAuxiliar: presenca && !DALI.includes(controle) && controle !== '010' && potencia > p.releSensorW ? 1 : 0,
  };
  comandos.total = comandos.interruptores + comandos.dimmers + comandos.botoeirasDali + comandos.tecladosCena + comandos.controladores010;
  if (controle === 'dimmer' && comandos.dimmers > 1) avisos.push(`${nome}: ${Math.round(potencia)} W em ${comandos.dimmers} dimmers de ${p.dimmerW} W — dividir as luminárias em grupos. [CONFERIR compatibilidade dimmer × driver]`);

  // percurso dos cabos no ambiente (serpentina na grade + entrada + descida ao comando)
  const temComando = comandos.total > 0 || presenca;
  const percursoInterno = g.ny * (g.nx - 1) * g.dx + (g.ny - 1) * g.dy + g.dx / 2 + g.dy / 2 + (temComando ? Math.max(0, peDireito - 1.1) + 1 : 0);

  // NBR 5410, 9.5.2.1: em local de habitação, carga mínima de iluminação para os circuitos
  const instaladaVa = potencia / p.fpDriver;
  const minimoVa = at.residencial ? E.iluminacaoMinima(area) : null;
  const cargaVa = Math.max(instaladaVa, minimoVa || 0);
  if (at.residencial && minimoVa > instaladaVa) avisos.push(`${nome}: circuito dimensionado com a carga mínima da NBR 5410, 9.5.2.1.2 (${minimoVa} VA), maior que a potência instalada (${Math.round(instaladaVa)} VA).`);

  return {
    nome, atividade: at.id, atividadeRotulo: at.rotulo, grupo: at.grupo, conferirAtividade: !!at.conferir, notaAtividade: at.nota,
    comprimento: C, largura: L, area, peDireito, plano, alturaMontagem, hm, k, refl, fu, fuFonte, conservacao, fm,
    emExigida, ugrL: at.ugr, raMin: at.ra, uoMin: at.uo, dpiRef: at.dpi_ref || null, dr: !!at.dr, residencial: !!at.residencial,
    luminaria: lum, nCalc, nMin, nInformado, nx: g.nx, ny: g.ny, n, dx: g.dx, dy: g.dy, smax, razaoGrade: g.razao, okEspacamento: g.okEspacamento,
    posicoes: posicoesGrade(g.nx, g.ny, C, L),
    emObtida, folga: emObtida / emExigida - 1, potencia, dpi, dpi100, okEm, okRa, okUgr, okDpi,
    controle, presenca, portas, sensores, fontes, enderecos, comandos, percursoInterno,
    distanciaQuadro: num(a.distancia_quadro_m, 0) > 0 ? num(a.distancia_quadro_m) : null,
    circuitoInformado: String(a.circuito || '').trim() || null,
    instaladaVa, minimoVa, cargaVa, malha: malhaMedicao(C, L), circuitos: [],
  };
}

// ── Circuitos de iluminação (NBR 5410 pelo motor da elétrica) ──────────────

function montarCircuitos(ambientes, c, p, avisos) {
  const v = p.ligacao === 'FN' ? c.vfn : c.vff;
  const limiteVa = Math.min(c.limiteIluminacaoA * v, p.potenciaMaxCircuitoVa || Infinity);
  const pedacos = [];
  for (const a of ambientes) {
    if (a.circuitoInformado) { pedacos.push({ amb: a, va: a.cargaVa, lum: a.n, interno: a.percursoInterno, grupo: a.circuitoInformado }); continue; }
    const partes = Math.max(1, Math.ceil(a.cargaVa / limiteVa - 1e-9));
    if (partes > 1) avisos.push(`${a.nome}: ${Math.round(a.cargaVa)} VA > ${Math.round(limiteVa)} VA por circuito — dividido em ${partes} circuitos.`);
    for (let i = 0; i < partes; i++) {
      const lum = Math.floor(a.n / partes) + (i < a.n % partes ? 1 : 0);
      pedacos.push({ amb: a, va: a.cargaVa / partes, lum, interno: a.percursoInterno / partes });
    }
  }
  // agrupamento sequencial até o limite (como skills/eletrica, 9.5.3), com os
  // locais que exigem DR (5.1.3.2.2) em circuitos próprios — o DR não se
  // estende aos demais; circuitos informados no formulário ficam como estão
  const grupos = [];
  const manuais = {};
  const atual = { comDr: null, semDr: null };
  for (const pc of pedacos) {
    if (pc.grupo) {
      if (!manuais[pc.grupo]) { manuais[pc.grupo] = { id: pc.grupo, pedacos: [] }; grupos.push(manuais[pc.grupo]); }
      manuais[pc.grupo].pedacos.push(pc);
      continue;
    }
    const classe = pc.amb.dr ? 'comDr' : 'semDr';
    const soma = atual[classe] ? atual[classe].pedacos.reduce((s, x) => s + x.va, 0) : 0;
    if (!atual[classe] || soma + pc.va > limiteVa + 1e-6) { atual[classe] = { pedacos: [] }; grupos.push(atual[classe]); }
    atual[classe].pedacos.push(pc);
  }
  let seq = 0;
  return grupos.map(gr => {
    const id = gr.id || `IL${++seq}`;
    const ambs = [...new Set(gr.pedacos.map(x => x.amb.nome))];
    const va = gr.pedacos.reduce((s, x) => s + x.va, 0);
    const dist = Math.max(...gr.pedacos.map(x => x.amb.distanciaQuadro ?? c.comprimentoPadrao));
    // rota = cabo lançado (quadro → ambientes → luminárias); para a queda de tensão a
    // carga é distribuída no percurso interno: L equivalente = distância + metade do interno
    const interno = gr.pedacos.reduce((s, x) => s + x.interno, 0);
    const circ = { id, descricao: `Iluminação ${id} — ${ambs.join(', ')}`, tipo: 'iluminacao', ligacao: p.ligacao, potencia_va: Math.round(va), comprimento_m: arred(dist + interno / 2, 1) };
    const d = E.dimensionarCircuito(circ, c, { minimo: T.SECAO_MINIMA.iluminacao, limiteQueda: c.quedaTerminal });
    d.rota = arred(dist + interno, 1);
    d.dr = gr.pedacos.some(x => x.amb.dr);
    d.ambientes = ambs;
    d.luminarias = gr.pedacos.reduce((s, x) => s + x.lum, 0);
    d.potenciaW = gr.pedacos.reduce((s, x) => s + x.va * p.fpDriver, 0);
    if (gr.id && d.ib > limiteVa / v + 1e-6) avisos.push(`Circuito ${id} informado com ${arred(d.ib, 1)} A — acima do limite adotado de ${c.limiteIluminacaoA} A por circuito de iluminação.`);
    for (const x of gr.pedacos) if (!x.amb.circuitos.includes(id)) x.amb.circuitos.push(id);
    return d;
  });
}

// ── Barramentos DALI (IEC 62386: até 64 endereços de driver por linha) ─────

function montarBarramentos(ambientes, p, avisos) {
  const barr = [];
  let atual = null;
  for (const a of ambientes.filter(x => x.enderecos > 0)) {
    let rest = a.enderecos;
    while (rest > 0) {
      if (!atual || atual.enderecos >= p.enderecosDali) { atual = { id: `DALI-${barr.length + 1}`, enderecos: 0, dispositivos: 0, ambientes: [], dist: 0 }; barr.push(atual); }
      const cabe = Math.min(rest, p.enderecosDali - atual.enderecos);
      atual.enderecos += cabe;
      rest -= cabe;
      if (!atual.ambientes.includes(a.nome)) atual.ambientes.push(a.nome);
      atual.dist = Math.max(atual.dist, a.distanciaQuadro || 0);
    }
    // dispositivos de controle (sensores e botoeiras/teclados) ficam no último barramento do ambiente
    atual.dispositivos += a.sensores.n + a.comandos.botoeirasDali + a.comandos.tecladosCena;
    a.barramentos = barr.filter(b => b.ambientes.includes(a.nome)).map(b => b.id);
  }
  for (const b of barr) if (b.dispositivos > 64) avisos.push(`${b.id}: ${b.dispositivos} dispositivos de controle — acima de 64 instâncias; dividir a linha. [CONFERIR]`);
  return barr;
}

// ── Materiais ──────────────────────────────────────────────────────────────

function descricaoLuminaria(l, controle) {
  const drv = DALI.includes(controle) ? ' com driver DALI-2' : controle === '010' ? ' com driver 0-10 V' : controle === 'dimmer' ? ' dimerizável (corte de fase)' : '';
  const ext = l.driverExterno ? ' (driver/fonte à parte)' : drv;
  const base = l.tipo === 'perfil'
    ? `Perfil LED linear ${String(l.comprimento).replace('.', ',')} m, ${l.potencia} W, ${l.fluxo} lm`
    : `Luminária LED ${TIPOS_LUMINARIA[l.tipo]} ${l.potencia} W, ${l.fluxo} lm`;
  return `${base}${l.tcc ? `, ${l.tcc} K` : ''}${l.ra ? `, Ra ≥ ${l.ra}` : ''}${l.ugr ? `, UGR < ${l.ugr}` : ''}${ext} — ${l.codigo}${l.descricao ? ` ${l.descricao}` : ''}`;
}

function materiais(ambientes, circuitos, barramentos, p, avisos) {
  const itens = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => { if (quantidade > 0) itens.push({ codigo, descricao, unidade, quantidade: arred(quantidade, 1), referencia }); };
  const soma = (f) => ambientes.reduce((s, a) => s + f(a), 0);

  // luminárias por código e tipo de driver
  const lums = {};
  for (const a of ambientes) {
    const drv = DALI.includes(a.controle) ? 'dali' : a.controle === '010' ? '010' : a.controle === 'dimmer' ? 'dim' : 'on';
    const k = `${a.luminaria.codigo}|${a.luminaria.driverExterno ? 'ext' : drv}`;
    lums[k] = lums[k] || { lum: a.luminaria, controle: a.controle, qtd: 0 };
    lums[k].qtd += a.n;
  }
  Object.values(lums).forEach(x => add(x.lum.codigo, descricaoLuminaria(x.lum, x.controle), 'un', x.qtd, 'NBR ISO/CIE 8995-1; Inmetro'));

  // fontes/drivers externos
  const fontes = {};
  for (const a of ambientes.filter(x => x.fontes > 0)) {
    const dim = DALI.includes(a.controle) ? 'DALI-2' : a.controle === '010' ? '0-10 V' : a.controle === 'dimmer' ? 'dimerizável' : 'liga/desliga';
    const desc = a.luminaria.tipo === 'perfil'
      ? `Fonte/driver LED 24 V ${num(a.luminaria.fonte_w, p.fonteW)} W ${dim} para perfil LED (carga ≤ 80 %)`
      : `Driver LED ${dim} para luminária ${a.luminaria.codigo} (${a.luminaria.potencia} W)`;
    fontes[desc] = (fontes[desc] || 0) + a.fontes;
  }
  Object.entries(fontes).forEach(([d, q]) => add('DRV', d, 'un', q, 'Ficha técnica do fabricante'));

  // comandos e sensores
  const sens = { rele: 0, dali: 0, '010': 0 };
  ambientes.forEach(a => { sens[a.sensores.tipo] += a.sensores.n; });
  add('SEN', `Sensor de presença de teto 360° com relé, Ø ${String(p.sensorDiametro).replace('.', ',')} m de detecção [CONFERIR cobertura no fabricante]`, 'un', sens.rele, 'Projeto');
  add('SEN-DALI', 'Sensor multifunção DALI-2 (presença + luz natural) de teto, IEC 62386-303/304', 'un', sens.dali, 'IEC 62386');
  add('SEN-010', 'Sensor de presença com saída 0-10 V e relé (dimerização por luz natural)', 'un', sens['010'], 'Projeto');
  const int = { simples: 0, paralelo: 0, intermediario: 0 };
  ambientes.forEach(a => {
    const nInt = a.comandos.interruptores;
    if (nInt === 1) int.simples++;
    else if (nInt >= 2) { int.paralelo += 2; int.intermediario += nInt - 2; }
  });
  add('INT', 'Interruptor simples 10 A com placa', 'un', int.simples, 'NBR 5410, 9.5.2.1.1');
  add('INT-P', 'Interruptor paralelo (three-way) 10 A com placa', 'un', int.paralelo, 'NBR 5410');
  add('INT-I', 'Interruptor intermediário (four-way) 10 A com placa', 'un', int.intermediario, 'NBR 5410');
  add('DIM', `Dimmer para LED (corte de fase) até ${p.dimmerW} W, com placa`, 'un', soma(a => a.comandos.dimmers), 'Ficha técnica do fabricante');
  add('BOT-DALI', 'Interface de pulsadores DALI-2 com botoeira (liga/desliga e dimerização)', 'un', soma(a => a.comandos.botoeirasDali), 'IEC 62386-301');
  add('CENA', 'Teclado de cenas DALI-2 (4 cenas + liga/desliga) com placa', 'un', soma(a => a.comandos.tecladosCena), 'IEC 62386');
  add('CTL-010', `Controlador/dimmer 0-10 V com relé (até ${p.drivers010} drivers)`, 'un', soma(a => a.comandos.controladores010), 'IEC 60929 Anexo E');
  add('RELE', 'Relé auxiliar / minicontator para carga de iluminação comandada por sensor', 'un', soma(a => a.comandos.releAuxiliar), 'NBR 5410');
  add('CTL-DALI', `Controlador/gateway DALI-2 com fonte de barramento integrada (1 linha, até ${p.enderecosDali} endereços)`, 'un', barramentos.length, 'IEC 62386-101/103');

  // cabos, eletrodutos e proteção dos circuitos de iluminação
  const cabos = {};
  const addCabo = (s, m) => { cabos[s] = (cabos[s] || 0) + m; };
  for (const ci of circuitos) {
    const L = ci.rota * FOLGA;
    addCabo(ci.secao, L * (ci.ligacao === 'FF' ? 2 : 1));
    if (ci.secaoNeutro) addCabo(ci.secaoNeutro, L);
    addCabo(ci.secaoPE, L);
  }
  Object.keys(cabos).map(Number).sort((a, b) => a - b).forEach(s => add(`CAB-${String(s).replace('.', ',')}`, `Cabo de cobre flexível ${String(s).replace('.', ',')} mm² 450/750 V PVC — circuitos de iluminação (fase, neutro e PE)`, 'm', Math.ceil(cabos[s]), 'NBR 5410, 6.2'));
  const caboDali = soma(a => (a.enderecos > 0 ? a.percursoInterno : 0)) + barramentos.reduce((s, b) => s + (b.dist || 15), 0);
  add('CAB-DALI', 'Cabo PP 2 × 1,5 mm² 500 V para linha DALI', 'm', Math.ceil(caboDali * FOLGA), 'IEC 62386-101 (queda ≤ 2 V na linha)');
  add('CAB-010', 'Cabo de controle 2 × 1,0 mm² para sinal 0-10 V', 'm', Math.ceil(soma(a => (a.controle === '010' ? a.percursoInterno : 0)) * FOLGA), 'IEC 60929 Anexo E');
  add('ELE', 'Eletroduto corrugado/rígido PVC ou eletrocalha para circuitos de iluminação (estimativa pelo percurso — conferir no projeto)', 'm', Math.ceil(circuitos.reduce((s, x) => s + x.rota, 0)), 'NBR 5410, 6.2.11');
  add('CON', 'Conector de emenda tipo alavanca (jogo por ponto de luz)', 'un', soma(a => a.n), 'NBR 5410, 6.2.8');
  const disj = {};
  circuitos.forEach(ci => { const k = `${ci.polos}P ${ci.disjuntor} A`; disj[k] = (disj[k] || 0) + 1; });
  Object.entries(disj).forEach(([k, q]) => add('DISJ', `Disjuntor termomagnético ${k} curva C (NBR NM 60898) — circuitos de iluminação`, 'un', q, 'NBR 5410, 5.3.4 e 9.5.4'));
  const nDr = circuitos.filter(x => x.dr).length;
  add('DR', 'Interruptor diferencial residual (DR) 2P 25 A 30 mA — circuitos de iluminação de áreas molhadas/garagem', 'un', nDr, 'NBR 5410, 5.1.3.2.2');
  if (nDr) avisos.push('DR em circuito de iluminação de banheiro/copa/garagem (5.1.3.2.2) — conferir a exceção para pontos de iluminação a 2,5 m ou mais. [CONFERIR]');
  return itens;
}

// ── Cálculo completo ───────────────────────────────────────────────────────

function calcular(dados) {
  const p = configProjeto(dados);
  const c = E.config({ instalacao: { ...(dados.instalacao || {}) } });
  const avisos = [];
  const luminarias = (dados.luminarias || []).filter(l => l && (l.codigo || l.potencia_w || l.fluxo_lm)).map(normalizarLuminaria);
  if (!luminarias.length) throw new Error('Cadastre ao menos uma luminária (código, potência e fluxo luminoso).');
  const repetidos = luminarias.map(l => l.codigo).filter((x, i, arr) => arr.indexOf(x) !== i);
  if (repetidos.length) throw new Error(`Código de luminária repetido: ${[...new Set(repetidos)].join(', ')}.`);
  luminarias.filter(l => l.eficacia < p.eficaciaMin).forEach(l => avisos.push(`Luminária ${l.codigo}: eficácia ${Math.round(l.eficacia)} lm/W abaixo do mínimo adotado de ${p.eficaciaMin} lm/W. [CONFERIR com o Inmetro/Procel]`));

  const lista = (dados.ambientes || []).filter(a => a && (a.nome || a.area_m2 || a.comprimento_m));
  if (!lista.length) throw new Error('Cadastre ao menos um ambiente (nome, atividade, dimensões e luminária).');
  const ambientes = lista.map((a, i) => calcularAmbiente(a, i, luminarias, p, avisos));
  const circuitos = montarCircuitos(ambientes, c, p, avisos);
  const barramentos = montarBarramentos(ambientes, p, avisos);
  const mats = materiais(ambientes, circuitos, barramentos, p, avisos);

  const soma = (f) => ambientes.reduce((s, a) => s + f(a), 0);
  const area = soma(a => a.area);
  const potencia = soma(a => a.potencia);
  const tot = {
    ambientes: ambientes.length, area, potencia, luminarias: soma(a => a.n), dpi: potencia / area,
    sensores: soma(a => a.sensores.n), enderecosDali: soma(a => a.enderecos), barramentos: barramentos.length,
    comandos: soma(a => a.comandos.total), metrosPerfil: soma(a => (a.luminaria.tipo === 'perfil' ? a.n * a.luminaria.comprimento : 0)),
    porTipo: Object.fromEntries(Object.keys(TIPOS_LUMINARIA).map(t => [t, soma(a => (a.luminaria.tipo === t ? a.n : 0))])),
    fontes: soma(a => a.fontes), circuitos: circuitos.length,
  };
  if (ambientes.some(a => a.conferirAtividade)) avisos.push('Há ambientes com atividade de saúde ou residencial — valores da tabela a conferir com a norma. [CONFERIR]');
  if (ambientes.some(a => a.fuFonte.startsWith('tabela'))) avisos.push('FU pela tabela simplificada para luminária de distribuição direta — substituir pelo FU do fabricante no projeto executivo. [CONFERIR]');
  avisos.push('Conferir o número máximo de drivers por disjuntor (corrente de partida — tabela do fabricante do driver). [CONFERIR]');
  return { config: c, projeto: p, luminarias, ambientes, circuitos, barramentos, materiais: mats, totais: tot, avisos };
}

module.exports = {
  calcular, calcularAmbiente, indiceRecinto, fatorUtilizacao, metodoLumens, escolherGrade, malhaMedicao, posicoesGrade,
  ATIVIDADES, ATIVIDADE, FM, ROTULO_CONSERVACAO, CONTROLES, TIPOS_LUMINARIA, DIMERIZAVEL, DALI,
};
