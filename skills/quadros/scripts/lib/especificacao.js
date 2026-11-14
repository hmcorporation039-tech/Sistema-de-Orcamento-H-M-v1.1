// MOTOR DA SOLUÇÃO DO QUADRO a partir da ESPECIFICAÇÃO do cliente (pedido do usuário de
// 09/11/2026: "um arquivo carregado para a confecção de um quadro de força para um chiller —
// o sistema deve fazer o diagrama unifilar, montar o quadro com os componentes, o 3D com as
// simulações do funcionamento, os detalhes de fabricação e a ficha técnica").
//
// requisitos lidos (../../../_comum/especificacao/leitor.js) → PROJETO (modelo único que as
// folhas FL01–FL06, a planilha de preços, a ficha técnica, o texto de entrega e o 3D consomem):
//   proteções por circuito com o critério, demanda e geral, condutores internos (IB ≤ In ≤ Iz),
//   barramento e N/PE pela skill (calculo.js), DPS e RFF, comando por BLOCOS (relés, contatos,
//   seletoras, sinaleiros) com a simulação dos cenários, réguas de bornes com reserva,
//   ventilação (V = 3,1·P/ΔT), invólucro e peso, layout da porta e da placa, materiais,
//   pendências, pontos a levantar com o cliente, exceções e as decisões com a justificativa.
//
// Determinístico. Regras de engenharia nos DADOS (dados/perfil-especificacao.json, regras e
// verificações; _comum/especificacao/blocos-comando.json); o aprendido (escolhas e decisões que
// o engenheiro aprovou) entra por opcoes.aprendido e vale sobre o perfil. O que não está na
// especificação nem em tabela fica [CONFERIR] e vai para as pendências — nada é inventado.

const path = require('path');
const ET = require('../../../_comum/eletrico/tabelas');
const EI = require('../../../eletrica-industrial/scripts/lib/calculo');
const LEI = require('../../../_comum/especificacao/leitor');
const CMD = require('../../../_comum/especificacao/comando');
const T = require('./tabelas');

const PERFIL = require('../../dados/perfil-especificacao.json');
const SQ3 = Math.sqrt(3);
const arred = (v, c = 1) => (v == null ? null : Math.round(v * 10 ** c) / 10 ** c);
const fmt = (v, c = 1) => (v == null ? '—' : String(arred(v, c)).replace('.', ','));
const pad2 = (n) => String(n).padStart(2, '0');
const clonar = (o) => JSON.parse(JSON.stringify(o));
const proximo = (serie, v) => serie.find(x => x >= v - 1e-9) ?? null;
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');

function mesclar(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object' ? mesclar(base[k], v) : v;
  }
  return out;
}

// condutor interno: menor seção com Iz (método, isolação, carregados, temperatura) ≥ In
function condutorPara(In, { metodo = 'B1', isolacao = 'PVC', carregados = 3, temperatura = 35, minimo = 2.5 } = {}) {
  const k = ET.fatorTemperatura(temperatura, isolacao, false);
  for (const s of ET.SECOES.filter(x => x >= minimo)) {
    let iz;
    try { iz = ET.capacidade(s, metodo, carregados, isolacao) * k; } catch { continue; }
    if (iz >= In - 1e-9) return { secao: s, iz: arred(iz, 1), k: arred(k, 2), metodo, isolacao, carregados, temperatura };
  }
  return { secao: null, iz: null, k, metodo, isolacao, carregados, temperatura };
}
const umAcima = (s, serie) => serie.find(x => x > s) ?? s;

// "In" de disjuntor-motor: faixas comerciais típicas (ajuste máximo) [CONFERIR com o fabricante]
const FAIXAS_DM = [1, 1.6, 2.5, 4, 6.3, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100];

// ── Contexto: o que a especificação diz, em forma de fatos ──────────────────

function lerContexto(lidos, R, PF = PERFIL) {
  const reqIds = new Set(lidos.requisitos.filter(r => r.valor !== false).map(r => r.id));
  const val = (id) => LEI.req(lidos, id)?.valor;
  const vocab = PF.vocabulario.equipamentos;
  const reqDisjPorEq = LEI.reqs(lidos, 'forca.disjuntor_por_equipamento').map(r => r.valor);
  const disjuntorPedido = (tipo) => reqDisjPorEq.find(v => {
    const termo = semAcento(v.equipamento || '').toLowerCase();
    return (vocab[tipo]?.termos || []).some(t => new RegExp(`^(?:${semAcento(t)})$`, 'i').test(termo));
  }) || null;
  return { reqIds, val, disjuntorPedido };
}

// ── Solução ─────────────────────────────────────────────────────────────────

function solucionar(lidos, opcoes = {}) {
  const ap = opcoes.aprendido || {};
  const PF = opcoes.perfil || PERFIL;
  const R = mesclar(clonar(PF.regras), ap.escolhas || {});
  const decisoes = { ...(ap.decisoes || {}), ...(opcoes.decisoes || {}) };
  const ctxL = lerContexto(lidos, R, PF);
  const { reqIds, val } = ctxL;
  const tem = (id) => reqIds.has(id);
  const avisos = [];
  const premissas = [];
  const decisoesTexto = []; // { titulo, texto, criterio }
  const memoria = [];
  const decide = (titulo, texto, criterio = '') => decisoesTexto.push({ titulo, texto, criterio });

  // interpretação do pedido (o que foi pedido para gerar) — premissa registrada
  const pedido = String(opcoes.pedido || '').trim();
  const folhasPedidas = interpretarPedido(pedido);
  premissas.push(folhasPedidas.premissa);

  // ── Quadro ────────────────────────────────────────────────────────────────
  const tensao = val('alimentacao.tensao') || {};
  const esquema = val('alimentacao.esquema')?.esquema || 'TN-S';
  if (!tem('alimentacao.esquema')) premissas.push('Esquema de aterramento adotado TN-S (alimentação 3F+N+PE com N e PE separados). [CONFERIR]');
  const vff = tensao.ff || 380;
  const vfn = tensao.fn || Math.round(vff / SQ3);
  if (!tensao.ff) premissas.push(`Tensão não lida na especificação: adotados ${vff}/${vfn} V. [CONFERIR]`);
  const icc = val('alimentacao.icc_ka')?.icc_ka ?? null;
  const ventilado = tem('construcao.ventilacao');
  const tempInterna = ventilado ? R.ventilacao.termostato_c : 40;
  const dimRef = val('construcao.dimensao') || null;
  const quadro = {
    tag: opcoes.tag || lidos.meta?.tag || 'QF-01',
    descricao: (lidos.meta?.titulo || '').replace(/^[A-Z0-9-]+\s*[—–-]\s*/, '') || 'Quadro de força e comando',
    vff, vfn, esquema, frequencia: val('alimentacao.frequencia')?.hz || 60,
    condutores: val('alimentacao.condutores')?.texto?.replace(/\s+/g, '') || '3F+N+PE',
    origem: val('alimentacao.origem')?.origem || 'quadro a montante',
    icc_ka: icc,
    entrada: val('construcao.entrada_cabos')?.lado === 'cima' ? 'superior' : val('construcao.entrada_cabos')?.lado === 'baixo' ? 'inferior' : 'superior',
    saida: val('construcao.saida_cabos')?.lado || 'inferior',
    ip: val('construcao.ip')?.ip ? `IP${val('construcao.ip').ip}` : 'IP54',
    ik: val('construcao.ik')?.ik ? `IK${val('construcao.ik').ik}` : null,
    montagem: val('construcao.montagem')?.tipo || 'sobrepor',
    material: val('construcao.material')?.material || 'aço',
    dimensaoRef: dimRef, reservaPct: (val('construcao.reserva_pct')?.pct ?? 20) / 100,
    ventilacao: ventilado, separacao: tem('construcao.separacao'),
    tensaoComando: R.comando.tensao,
  };
  if (!val('construcao.ip')) premissas.push('Grau de proteção não informado: adotado IP54 (sala técnica). [CONFERIR]');

  // ── Cargas ────────────────────────────────────────────────────────────────
  const equipamentos = lidos.equipamentos;
  const acionadores = equipamentos.filter(e => e.categoria === 'acionamento');
  const cargas = [];
  const externos = [];
  const motores = [];
  for (const e of equipamentos) {
    const qtd = e.quantidade?.valor || 1;
    const regra = R.cargas[e.categoria];
    if (e.categoria === 'hvac_mca') {
      const mca = LEI.attr(e, 'mca_a'), mfa = LEI.attr(e, 'mfa_a'), rla = LEI.attr(e, 'rla_a');
      const pedido = ctxL.disjuntorPedido(e.tipo);
      for (let k = 1; k <= qtd; k++) {
        const tag = `${e.tag || 'EQ'}${pad2(k)}`;
        const ib = rla ?? mca ?? null;
        let In = pedido?.in_a ?? mfa ?? null;
        const notas = [];
        if (pedido?.in_a && mfa && pedido.in_a > mfa) { notas.push(`In pedido ${pedido.in_a} A > MFA ${mfa} A do fabricante — adotada a MFA.`); In = mfa; }
        if (In == null && ib) { In = proximo(T.DISJUNTORES_CM, ib * 1.25); notas.push('Sem MFA/disjuntor pedido: In = 1,25 × Ib na série comercial. [CONFERIR com o fabricante]'); }
        cargas.push({
          id: tag, tipo: e.tipo, categoria: e.categoria, rotulo: `${e.rotulo} ${pad2(k)}`, fabricante: LEI.attr(e, 'fabricante'), modelo: LEI.attr(e, 'modelo'),
          tensao: LEI.attr(e, 'tensao_v') || vff, ligacao: LEI.attr(e, 'ligacao') || '3F', mca, mfa, rla, ib, ibCriterio: rla ? 'RLA' : 'MCA', In,
          pedido: pedido?.in_a || null, alimentacaoEm: LEI.attr(e, 'alimentacao_em'), regra, notas, operando: true,
        });
        externos.push({ i: k, tag, rotulo: `${e.rotulo} ${pad2(k)}`, tipo: e.tipo, sinal: {} });
      }
    } else if (e.categoria === 'motor') {
      const acion = acionadores.find(a => a.aciona === e.tipo);
      const nOp = LEI.attr(e, 'operando');
      const pCv = LEI.attr(e, 'potencia_cv'), pKw0 = LEI.attr(e, 'potencia_kw');
      const pKw = pKw0 ?? (pCv != null ? EI.potenciaKw({ potencia: pCv, unidade: 'cv' }) : null);
      const inPlaca = LEI.attr(e, 'in_placa_a');
      const tensaoM = LEI.attr(e, 'tensao_v') || vff;
      const inCalc = pKw ? EI.correnteNominalMotor(pKw, tensaoM, T.MOTOR_PADRAO.eta, T.MOTOR_PADRAO.fp) : null;
      const pedidoAcion = acion ? ctxL.disjuntorPedido(acion.tipo) : null;
      for (let k = 1; k <= qtd; k++) {
        const tag = `${e.tag || 'M'}${k}`;
        const In = inPlaca ?? inCalc;
        const operando = nOp == null ? true : k <= nOp;
        const m = {
          id: tag, tipo: e.tipo, categoria: 'motor', rotulo: `${e.rotulo} ${tag}`, fabricante: LEI.attr(e, 'fabricante'), modelo: LEI.attr(e, 'modelo'),
          tensao: tensaoM, pCv, pKw, In, inCriterio: inPlaca ? 'placa' : `calculada (η ${T.MOTOR_PADRAO.eta}, FP ${T.MOTOR_PADRAO.fp}) [CONFERIR placa]`,
          operando, papel: nOp == null ? 'operando' : operando ? 'operando (titular)' : 'reserva', regra, notas: [],
        };
        if (acion) {
          const ia = LEI.attr(acion, 'corrente_a');
          m.acion = { tag: `U${k}`, tipo: acion.tipo, rotulo: acion.rotulo, fabricante: LEI.attr(acion, 'fabricante'), modelo: LEI.attr(acion, 'modelo'), corrente: ia,
            cliente: !!LEI.attr(acion, 'fornecido_cliente'), noQuadro: !!LEI.attr(acion, 'montado_no_quadro') || tem('forca.acionamentos_no_quadro') };
          m.partida = acion.tipo === 'soft' ? 'soft_starter' : 'inversor';
          // proteção de entrada do acionamento: a pedida, senão faixa ≥ I × fator [CONFERIR manual]
          const fator = R.cargas.motor.fator_entrada_inversor;
          const base = ia ?? In;
          m.protecao = { dispositivo: pedidoAcion && /motor/i.test(pedidoAcion.dispositivo || '') ? 'disjuntor_motor' : (R.cargas.motor.protecao_inversor || 'disjuntor_motor'),
            In: pedidoAcion?.in_a ?? proximo(FAIXAS_DM, base * fator), pedido: pedidoAcion?.in_a || null,
            criterio: pedidoAcion?.in_a ? `pedido na especificação (${pedidoAcion.in_a} A)${ia ? `; ≥ corrente do ${acion.rotulo.toLowerCase()} (${ia} A)` : ''}` : `${fmt(base)} A × ${String(fator).replace('.', ',')} (fusível/disjuntor recomendado pelo manual) [CONFERIR manual]` };
          if (ia && m.protecao.In < ia) m.notas.push(`Proteção de entrada (${m.protecao.In} A) abaixo da corrente do acionamento (${ia} A). [CONFERIR]`);
        } else {
          m.partida = 'direta';
          m.protecao = { dispositivo: 'disjuntor_motor', In: proximo(FAIXAS_DM, In || 1), criterio: 'faixa do disjuntor-motor contendo In (partida direta)' };
        }
        motores.push(m);
        cargas.push(m);
      }
    }
  }
  // sinais de campo dos equipamentos externos (pedido DO3, liberação DI1, operando UI6, válvula)
  for (const s of lidos.sinais) {
    for (const x of externos.filter(x => x.tipo === s.equipamento)) if (s.funcao) x.sinal[s.funcao] = s.borne || '[CONFERIR]';
  }
  const liberacaoBorne = LEI.req(lidos, 'comando.liberacao')?.valor?.borne;
  const operandoBorne = LEI.req(lidos, 'comando.contato_operando')?.valor?.borne;
  for (const x of externos) {
    if (liberacaoBorne && !x.sinal.liberacao) x.sinal.liberacao = liberacaoBorne;
    if (operandoBorne && !x.sinal.bomba_operando) x.sinal.bomba_operando = operandoBorne;
    for (const k of ['pedido', 'liberacao', 'bomba_operando', 'valvula']) if (!x.sinal[k]) x.sinal[k] = '[CONFERIR]';
  }
  // válvulas: uma por equipamento externo (a especificação diz "de cada chiller")
  const eqValv = equipamentos.find(e => e.categoria === 'atuador');
  const valvulas = [];
  if (eqValv && tem('valvulas.alimentacao')) {
    const n = eqValv.quantidade?.valor || externos.length;
    for (let k = 1; k <= n; k++) {
      const dono = externos[k - 1] || null;
      valvulas.push({ i: k, tag: `YV${k}`, rotulo: `válvula ${dono ? dono.tag : k}`, e: dono || {}, tensao: LEI.attr(eqValv, 'tensao_atuador_v') || 24, tipoTensao: LEI.attr(eqValv, 'tipo_tensao'), consumoVa: LEI.attr(eqValv, 'consumo_va'),
        retornoMola: !!LEI.attr(eqValv, 'retorno_mola'), acao: LEI.attr(eqValv, 'acao') });
    }
  }

  // ── Circuitos auxiliares e de serviço ─────────────────────────────────────
  const auxiliares = [];
  for (const c of lidos.circuitos) {
    for (let k = 0; k < (c.quantidade || 1); k++) {
      const regra = R.auxiliares[c.tipo] || R.auxiliares.tue;
      auxiliares.push({ tipo: c.tipo, rotulo: regra.rotulo || c.rotulo, polos: c.polos || '1P+N', In: c.in_a || 16, drMa: c.dr_ma || (regra.dr_obrigatorio ? regra.dr_ma : null), potencia: regra.potencia_w, fp: regra.fp || 0.92, regra });
    }
  }
  if (auxiliares.some(a => a.tipo !== 'reserva' && a.potencia)) premissas.push(R.auxiliares.nota_estimativa);

  // ── Tags e fases ─────────────────────────────────────────────────────────
  const protecoes = [];
  let nq = 1;
  const geralTag = 'Q1';
  const fases = { L1: 0, L2: 0, L3: 0 };
  const menosCarregada = () => Object.entries(fases).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0][0];
  const bornesForca = []; // X1
  const serieBorne = R.bornes.serie_mm2;
  const addBornes = (destino, sinais, secao) => sinais.forEach(s => bornesForca.push({ regua: 'X1', rotulo: `${destino} ${s}`, secao, grupo: destino }));

  // DPS e RFF logo após o geral
  const dpsR = R.dps;
  if (tem('forca.dps')) {
    protecoes.push({ tag: 'QDPS', funcao: 'Proteção do DPS', tipo: 'minidisjuntor', polos: '3P', In: dpsR.protecao_a, curva: dpsR.curva, fases: 'L1L2L3',
      alimenta: `DPS classe ${dpsR.classe}`, criterio: 'conforme o fabricante do DPS (NBR 5410, 6.3.5.2.5) [CONFERIR]', referencia: R.referencias.minidisjuntor, condutor: { secao: 6, criterio: 'ligação DPS ≤ 0,5 m; DPS–PE ≥ 4 mm² (NBR 5410, 6.3.5.2.9)' } });
  }
  if (tem('forca.rff')) {
    protecoes.push({ tag: 'QRF', funcao: 'Proteção do relé de falta de fase', tipo: 'minidisjuntor', polos: '3P', In: R.rff.protecao_a, curva: R.rff.curva, fases: 'L1L2L3', alimenta: 'RFF — relé de falta e sequência de fase', criterio: 'proteção da medição de tensão do relé', referencia: R.referencias.minidisjuntor, condutor: { secao: 1.5 } });
  }
  // cargas trifásicas (equipamentos externos e motores), na ordem da especificação
  for (const c of cargas.filter(x => x.categoria === 'hvac_mca')) {
    const tag = `Q${++nq}`;
    const cm = c.In > (c.regra.dispositivo_acima_a ?? 63);
    const cond = condutorPara(c.In, { ...c.regra.condutor, temperatura: tempInterna, minimo: 2.5 });
    c.circuito = tag;
    const bSec = c.regra.borne === 'um_acima' ? umAcima(cond.secao, serieBorne) : cond.secao;
    protecoes.push({ tag, funcao: c.rotulo, tipo: cm ? 'caixa_moldada' : 'minidisjuntor', polos: '3P', In: c.In, curva: cm ? null : 'C', fases: 'L1L2L3', carga: c.id,
      alimenta: `${c.rotulo}${c.fabricante ? ` — ${c.fabricante} ${c.modelo}` : ''}`, ib: c.ib,
      criterio: `${c.regra.nota_in}${c.pedido ? ` Pedido na especificação: ${c.pedido} A.` : ''}`, referencia: cm ? R.referencias.disjuntor_caixa_moldada : R.referencias.minidisjuntor,
      condutor: { ...cond, rotulo: c.regra.condutor.rotulo, criterio: `IB ${fmt(c.ib, 0)} A ≤ In ${c.In} A ≤ Iz ${fmt(cond.iz, 0)} A (${cond.secao} mm², ${cond.metodo}, ${cond.isolacao}, ${cond.carregados} carregados, ar a ${cond.temperatura} °C) — NBR 5410 5.3.4.1` },
      borne: { regua: 'X1', secao: bSec }, notas: [...c.notas, c.regra.nota_neutro] });
    addBornes(c.id, c.ligacao === '3F+N' ? ['L1', 'L2', 'L3', 'N', 'PE'] : ['L1', 'L2', 'L3', 'PE'], bSec);
    fases.L1 += c.ib || 0; fases.L2 += c.ib || 0; fases.L3 += c.ib || 0;
  }
  for (const m of motores) {
    const tag = `Q${++nq}`;
    m.circuito = tag;
    const cond = condutorPara(m.protecao.In, { metodo: 'B1', isolacao: 'PVC', carregados: 3, temperatura: tempInterna });
    const saida = condutorPara((m.In || m.acion?.corrente || 10) * 1.25, { metodo: 'B1', isolacao: 'PVC', carregados: 3, temperatura: tempInterna });
    const bSec = umAcima(saida.secao, serieBorne);
    protecoes.push({ tag, funcao: m.acion ? `Entrada do ${m.acion.rotulo.toLowerCase()} ${m.acion.tag} (${m.id})` : `Partida direta ${m.id}`, tipo: m.protecao.dispositivo, polos: '3P', In: m.protecao.In, fases: 'L1L2L3', carga: m.id,
      alimenta: m.acion ? `${m.acion.tag} ${m.acion.fabricante || ''} ${m.acion.modelo || ''}${m.acion.cliente ? ' (cliente)' : ''} → ${m.rotulo}` : m.rotulo, ib: m.In,
      criterio: `${m.protecao.criterio}. ${m.acion ? R.cargas.motor.nota_inversor : ''}`.trim(), referencia: R.referencias.disjuntor_motor,
      condutor: { ...cond, criterio: `In ${m.protecao.In} A ≤ Iz ${fmt(cond.iz, 0)} A (${cond.secao} mm², ${cond.metodo}, ${cond.isolacao}, ar a ${cond.temperatura} °C)` },
      saidaMotor: { secao: saida.secao, blindado: !!m.acion, criterio: `1,25 × In do motor (${fmt(m.In)} A) ≤ Iz ${fmt(saida.iz, 0)} A${m.acion ? '; cabo blindado, blindagem aterrada nas duas pontas' : ''}` },
      borne: { regua: 'X1', secao: bSec }, notas: m.notas });
    addBornes(m.id, m.acion ? ['U', 'V', 'W', 'PE', 'blindagem'] : ['U', 'V', 'W', 'PE'], bSec);
    if (m.operando) { fases.L1 += m.In || 0; fases.L2 += m.In || 0; fases.L3 += m.In || 0; }
  }
  // monofásicos: na fase menos carregada (balanceamento)
  const monofasicos = [];
  for (const a of auxiliares) {
    const ib = a.potencia ? a.potencia / (vfn * a.fp) : 0;
    const fase = menosCarregada();
    fases[fase] += ib;
    const cond = condutorPara(a.In, { metodo: 'B1', isolacao: 'PVC', carregados: 2, temperatura: tempInterna, minimo: 2.5 });
    const bSec = umAcima(cond.secao, serieBorne);
    let idr = null;
    if (a.drMa) {
      idr = { tag: 'IDR', polos: '2P', In: proximo(T.IDR_IN, a.In), idn: a.drMa, tipo: a.regra.dr_tipo || 'A', criterio: `DR ${a.drMa} mA obrigatório em tomadas (NBR 5410, 5.1.3.2.2); In do IDR (${proximo(T.IDR_IN, a.In)} A) ≥ In do disjuntor (${a.In} A); tipo ${a.regra.dr_tipo || 'A'} (correntes com componente contínua pulsante de cargas eletrônicas)`, referencia: R.referencias.idr };
    }
    const tag = `Q${++nq}`;
    monofasicos.push({ tag, a, fase, ib, cond, bSec, idr });
  }
  // comando (fonte + sinaleiro 220 V) e ventilação
  const precisaComando = tem('comando.logica_reles') || tem('comando.seletora_man_0_aut') || motores.length;
  const servico = [];
  if (precisaComando) servico.push({ tipo: 'comando', rotulo: 'Comando (fonte G1 24 Vcc e sinaleiro H1)', In: R.comando.protecao_a, ib: 1.5 });
  if (ventilado) servico.push({ tipo: 'ventilacao', rotulo: 'Ventilação do quadro (M1 + termostato BT)', In: 4, ib: 0.5 });
  for (const s of servico) {
    const fase = menosCarregada();
    fases[fase] += s.ib;
    monofasicos.push({ tag: `Q${++nq}`, a: { tipo: s.tipo, rotulo: s.rotulo, polos: '1P+N', In: s.In }, fase, ib: s.ib, cond: { secao: 2.5 }, servico: true });
  }
  for (const x of monofasicos) {
    if (x.idr) protecoes.push({ tag: x.idr.tag, funcao: `DR do circuito de ${x.a.rotulo.toLowerCase()}`, tipo: 'idr', polos: x.idr.polos, In: x.idr.In, idn: x.idr.idn, drTipo: x.idr.tipo, fases: x.fase, criterio: x.idr.criterio, referencia: x.idr.referencia, grupo: x.tag });
    protecoes.push({ tag: x.tag, funcao: x.a.rotulo, tipo: 'minidisjuntor', polos: x.a.polos, In: x.a.In, curva: 'C', fases: x.fase, ib: x.ib, servico: !!x.servico, auxiliar: x.a.tipo,
      alimenta: x.servico ? x.a.rotulo : `${x.a.rotulo}${x.a.tipo === 'reserva' ? ' (em bornes)' : ''}`, dr: x.idr ? x.idr.tag : null,
      criterio: x.servico ? (x.a.tipo === 'comando' ? 'protege a fonte G1 e o sinaleiro H1 (220 Vca)' : 'protege o ventilador e o termostato') : `pedido na especificação (${x.a.polos} ${x.a.In} A)${x.ib ? `; Ib estimada ${fmt(x.ib)} A` : ''}`,
      referencia: R.referencias.minidisjuntor, condutor: x.servico ? { secao: 2.5 } : { ...x.cond, criterio: `In ${x.a.In} A ≤ Iz ${fmt(x.cond.iz, 0)} A (${x.cond.secao} mm², B1, PVC, 2 carregados, ar a ${tempInterna} °C)` },
      borne: x.servico ? null : { regua: 'X1', secao: x.bSec } });
    if (!x.servico) addBornes(x.a.rotulo.toUpperCase().replace(/\s+/g, ' '), ['F', 'N', 'PE'], x.bSec);
  }

  // ── Demanda e geral ──────────────────────────────────────────────────────
  const linhasDemanda = [];
  for (const c of cargas.filter(x => x.categoria === 'hvac_mca')) linhasDemanda.push({ circuito: c.circuito, carga: `${c.rotulo}${c.fabricante ? ` ${c.fabricante} ${c.modelo}` : ''}`, tensao: `${c.tensao} V ${c.ligacao === '3F+N' ? '3N~' : '3~'}`, ib: c.ib, criterio: c.ibCriterio, fases: { L1: c.ib, L2: c.ib, L3: c.ib }, protecao: `${c.circuito} 3P ${c.In} A` });
  const grupoMot = {};
  for (const m of motores) { (grupoMot[m.tipo] ||= []).push(m); }
  for (const lista of Object.values(grupoMot)) {
    const op = lista.filter(m => m.operando);
    const iOp = op.reduce((s, m) => s + (m.In || 0), 0);
    linhasDemanda.push({ circuito: lista.map(m => m.circuito).join('/'), carga: `${lista[0].rotulo.replace(/\s+\S+$/, '')} ${fmt(lista[0].pCv, 0)} cv${lista[0].acion ? ` via ${lista[0].acion.rotulo.toLowerCase()}` : ''} (${op.length} op.${lista.length - op.length ? ` + ${lista.length - op.length} res.` : ''})`, tensao: `${lista[0].tensao} V 3~`, ib: lista[0].In, criterio: lista[0].inCriterio, fases: { L1: iOp, L2: iOp, L3: iOp }, protecao: lista.map(m => `${m.circuito} ${m.protecao.In} A`).join(' / '), nota: lista.length > op.length ? 'só os em operação entram na demanda' : '' });
  }
  for (const x of monofasicos) linhasDemanda.push({ circuito: x.tag, carga: x.a.rotulo, tensao: `${vfn} V (${x.fase})`, ib: x.ib, criterio: x.servico ? 'estimada' : x.a.tipo === 'reserva' ? '—' : 'estimada [CONFERIR]', fases: { [x.fase]: x.ib }, protecao: `${x.idr ? `IDR ${x.idr.idn} mA + ` : ''}${x.tag} ${x.a.In} A` });
  // motores: + 25 % da corrente do maior motor em operação (NBR 5410, 6.5.1 — circuito que alimenta vários motores)
  const maiorMotor = motores.filter(m => m.operando).reduce((a, m) => Math.max(a, m.In || 0), 0);
  if (maiorMotor) { const acr = 0.25 * maiorMotor; fases.L1 += acr; fases.L2 += acr; fases.L3 += acr; linhasDemanda.push({ circuito: '—', carga: '25 % do maior motor em operação (NBR 5410, 6.5.1)', tensao: '', ib: acr, criterio: `0,25 × ${fmt(maiorMotor)} A`, fases: { L1: acr, L2: acr, L3: acr }, protecao: '' }); }
  const porFase = { L1: arred(fases.L1, 1), L2: arred(fases.L2, 1), L3: arred(fases.L3, 1) };
  const faseMax = Object.entries(porFase).sort((a, b) => b[1] - a[1])[0];
  const iProj = faseMax[1];
  const geralPedido = val('forca.disjuntor_geral')?.in_a ?? null;
  // seletividade amperimétrica mínima: o geral acima da maior proteção de saída
  const maiorSaida = Math.max(0, ...protecoes.filter(q => q.carga).map(q => q.In || 0));
  let frame = proximo(T.DISJUNTORES_CM, iProj);
  if (frame <= maiorSaida) { const f2 = T.DISJUNTORES_CM.find(x => x > maiorSaida); if (f2) frame = f2; }
  let geralIn = frame, geralIr = null;
  const notasGeral = [];
  if (geralPedido && geralPedido >= iProj && geralPedido < frame) { geralIr = geralPedido; notasGeral.push(`Referência da especificação ${geralPedido} A ≥ demanda ${fmt(iProj, 0)} A: disjuntor de ${frame} A com térmico ajustável regulado em ${geralPedido} A.`); }
  else if (geralPedido && geralPedido >= iProj) { geralIn = proximo(T.DISJUNTORES_CM, geralPedido); notasGeral.push(`Referência da especificação ${geralPedido} A atende a demanda de ${fmt(iProj, 0)} A.`); }
  else if (geralPedido && geralPedido < iProj) notasGeral.push(`Referência da especificação (${geralPedido} A) abaixo da demanda calculada (${fmt(iProj, 0)} A): adotado ${frame} A — declarar como exceção.`);
  const usaMca = cargas.some(c => c.categoria === 'hvac_mca' && c.ibCriterio === 'MCA');
  const geral = { tag: geralTag, In: geralIn, Ir: geralIr, iProj, fase: faseMax[0], pedido: geralPedido, notas: notasGeral, tipo: geralIn > 125 ? 'caixa_moldada' : 'minidisjuntor', referencia: R.referencias.disjuntor_caixa_moldada,
    texto: `3P ${geralIn} A${geralIr ? ` (Ir regulado em ${geralIr} A)` : ''}${geralIn > 125 ? ', caixa moldada, térmico ajustável' : ''}` };
  protecoes.unshift({ tag: geralTag, funcao: 'Geral', tipo: geral.tipo, polos: '3P', In: geralIn, Ir: geralIr, fases: 'L1L2L3', alimenta: 'barramento', ib: iProj,
    criterio: `Fase mais carregada ${faseMax[0]} ≈ ${fmt(iProj, 0)} A${usaMca ? ' (com a MCA dos equipamentos de climatização — conservador; confirmar com o RLA do fabricante)' : ''}. ${notasGeral.join(' ')}`.trim(), referencia: geral.referencia });
  decide('Disjuntor geral', `Demanda ≈ ${fmt(iProj, 0)} A na fase mais carregada (${faseMax[0]})${usaMca ? ', somando a MCA dos equipamentos e a corrente das demais cargas' : ''}${maiorMotor ? ` (com 25 % do maior motor, NBR 5410 6.5.1)` : ''} → ${geral.texto}${frame > proximo(T.DISJUNTORES_CM, iProj) ? ` (acima da maior saída, ${maiorSaida} A, para seletividade)` : ''}.`, usaMca ? 'confirmar com o RLA do fabricante' : '');
  memoria.push({ titulo: 'Demanda e disjuntor geral', linhas: [
    ...linhasDemanda.map(l => `${l.circuito} ${l.carga}: Ib ${fmt(l.ib)} A (${l.criterio})${l.nota ? ` — ${l.nota}` : ''}`),
    `Por fase: L1 ${fmt(porFase.L1)} A · L2 ${fmt(porFase.L2)} A · L3 ${fmt(porFase.L3)} A → fase mais carregada ${faseMax[0]} = ${fmt(iProj)} A.`,
    `Geral: ${geral.texto}. ${notasGeral.join(' ')}`,
  ] });

  // ── Comando (blocos) ────────────────────────────────────────────────────
  const rotuloExt = PF.vocabulario.equipamentos[externos[0]?.tipo]?.rotulo?.toLowerCase() || 'equipamento';
  const pluralDe = (tipo, s) => PF.vocabulario.equipamentos[tipo]?.plural || plural(s);
  const rotuloMot = PF.vocabulario.equipamentos[motores[0]?.tipo]?.rotulo?.toLowerCase() || 'motor';
  const ctxCmd = {
    req: reqIds, decisoes, combinacao: val('comando.automatico_pedido')?.combinacao === 'todos' ? 'todos' : 'qualquer',
    motores: motores.map((m, k) => ({ i: k + 1, tag: m.id, rotulo: m.rotulo, acion: m.acion?.tag || null, acionRotulo: m.acion?.rotulo || '', acionCliente: !!m.acion?.cliente })),
    externos, valvulas, rotuloMotor: rotuloMot, rotuloMotores: pluralDe(motores[0]?.tipo, rotuloMot), rotuloExterno: rotuloExt, rotuloExternos: pluralDe(externos[0]?.tipo, rotuloExt),
    listas: { 'sinalizacao.porta': lidos.listas['sinalizacao.porta'] || [], 'automacao.contatos_livres': lidos.listas['automacao.contatos_livres'] || [] },
    tensaoComando: R.comando.tensao, contatosPorRele: R.comando.contatos_por_rele,
    variaveis: { ...(R.variaveis_comando || {}), ...variaveisDosRequisitos(lidos, PF) },
  };
  const usar = PF.blocos.usar.filter(id => !(id === 'emergencia_rele' && decisoes.sem_emergencia === 'SIM'));
  const comando = CMD.compilarComando(ctxCmd, { usar });
  avisos.push(...comando.avisos, ...(ctxCmd.avisosLista || []));
  const falhasSim = comando.verificacao.filter(v => !v.ok);
  if (falhasSim.length) avisos.push(`${falhasSim.length} cenário(s) da simulação do comando não atendidos: ${falhasSim.map(f => f.nome).join('; ')}. [CONFERIR]`);
  const sinaleiros = comando.sinaleiros;
  // fonte 24 Vcc: soma das bobinas, sinaleiros e atuadores; com carga sem consumo confirmado, um tamanho acima
  const rc = R.comando;
  const nReles = comando.reles.filter(r => !r.tipo || r.tipo === 'temporizador').length + comando.reles.filter(r => r.tipo === 'contator').length * 2;
  const n24 = sinaleiros.filter(s => !/220|Vca/i.test(s.tensao || '')).length;
  const cargas24 = [
    { item: `${nReles} relés × ${rc.consumo_rele_ma} mA (bobina 24 Vcc)`, ma: nReles * rc.consumo_rele_ma, estimado: false },
    { item: `${n24} sinaleiros LED × ${rc.consumo_sinaleiro_ma} mA`, ma: n24 * rc.consumo_sinaleiro_ma, estimado: false },
    ...valvulas.map(v => ({ item: `atuador ${v.tag} ${v.consumoVa ? `${v.consumoVa} VA` : `≈ ${rc.atuador_va_estimado} VA [CONFERIR]`}`, ma: Math.round(1000 * (v.consumoVa || rc.atuador_va_estimado) / 24), estimado: !v.consumoVa })),
  ];
  const totalMa = cargas24.reduce((s, x) => s + x.ma, 0);
  const iFonte = (totalMa / 1000) * (1 + rc.fonte_margem);
  let fonteA = proximo(rc.fonte_serie_a, iFonte) || 20;
  const temEstimada = cargas24.some(c => c.estimado);
  let notaFonte = '';
  if (temEstimada) { const acima = rc.fonte_serie_a.find(x => x > fonteA); if (acima) { notaFonte = `um tamanho acima (${fonteA} → ${acima} A) porque o consumo do atuador não foi confirmado`; fonteA = acima; } }
  const fonte = { tag: 'G1', A: fonteA, W: fonteA * 24, totalMa, iFonte: arred(iFonte, 2), cargas: cargas24, nota: notaFonte, referencia: rc.fonte };
  decide('Comando', `Lógica por relés em ${rc.tensao} (${nReles} relés de 4 contatos), fonte G1 de ${fonteA} A: soma das bobinas, sinaleiros e atuadores = ${fmt(totalMa / 1000, 2)} A × ${String(1 + rc.fonte_margem).replace('.', ',')} = ${fmt(iFonte, 2)} A${notaFonte ? `; ${notaFonte}` : ''}.`, tem('comando.clp') ? '' : 'CLP não pedido');
  memoria.push({ titulo: 'Fonte de comando 24 Vcc', linhas: [...cargas24.map(c => `${c.item}: ${c.ma} mA`), `Total ${totalMa} mA × (1 + ${rc.fonte_margem}) = ${fmt(iFonte, 2)} A → fonte de ${fonteA} A${notaFonte ? ` (${notaFonte})` : ''}.`, `F1 ${rc.fusivel_a} A no comando (L+)${valvulas.length ? `; F2 ${rc.fusivel_a} A no circuito das válvulas (LV+, independente da emergência)` : ''}.`] });
  if (valvulas.length && tem('valvulas.independente_emergencia')) decide('Válvulas', 'Circuito das válvulas com fusível próprio (F2), fora da cadeia de emergência; KMAN em paralelo com o contato do equipamento abre as válvulas com qualquer motor em MANUAL.');
  if (comando.reles.some(r => r.tag === 'KE')) decide('Emergência', `Botão de emergência${tem('forca.rff') ? ' e relé de falta de fase em série' : ''} derrubam o KE: param os acionamentos e retiram a liberação dos ${pluralDe(externos[0]?.tipo, rotuloExt)}.`);
  if (comando.reles.some(r => /^KR\d/.test(r.tag))) decide('Status dos motores', '"Motor operando" vem do status real do acionamento (saída "em funcionamento" do inversor), não só do comando.');

  // ── Quadro pela skill (invólucro, barramento, térmica, verificações) ─────
  const dadosQuadros = montarDadosQuadros({ quadro, protecoes, motores, cargas, geral, monofasicos, opcoes, comando: { ...comando, fonte }, sinaleiros, decisoes, R });
  let calc = null;
  try { calc = require('./calculo').calcular(dadosQuadros, { semComparacao: true }); } catch (e) { avisos.push(`Cálculo da skill quadros não rodou: ${e.message}. [CONFERIR]`); }
  const barr = calc?.barr;
  const barramento = barr && barr.fase
    ? { fase: `Cu ${barr.fase.l}×${barr.fase.e} mm`, neutro: barr.neutro ? `Cu ${barr.neutro.l}×${barr.neutro.e} mm` : null, pe: `Cu ${barr.pe.l}×${barr.pe.e} mm`, capacidade: arred(barr.capacidade, 0), icw: barr.icw, texto: `Cu ${barr.fase.l}×${barr.fase.e} mm (L1·L2·L3${barr.neutro ? '·N' : ''}) + barra PE ${barr.pe.l}×${barr.pe.e} mm — In ≥ ${geralIn} A (${arred(barr.capacidade, 0)} A corrigida) · Icw conforme Icc no ponto${icc ? ` (${icc} kA)` : '*'}`, comprimento: arred(barr.comprimentoFase, 2) }
    : { texto: `Barramento para ${geralIn} A [CONFERIR]` };
  if (barr && barr.fase) decide('Barramento', barramento.texto, 'DIN 43671 corrigida pela temperatura (skill quadros)');
  if (!icc) premissas.push(`Icc no ponto não informada: o cálculo do barramento e do Icu usou ${T.ICC_PADRAO_KA || 10} kA só como referência; definir pela Icc real. [CONFERIR]`);

  // ── Réguas de bornes ─────────────────────────────────────────────────────
  const reguas = montarReguas([...bornesForca, ...comando.conexoes.map(c => ({ ...c, secao: R.bornes.secao_comando_mm2 }))], quadro.reservaPct);

  // ── Ventilação ───────────────────────────────────────────────────────────
  const rv = R.ventilacao;
  const perdas = [];
  for (const m of motores.filter(x => x.acion && x.operando)) perdas.push({ item: `${m.acion.tag} ${m.acion.rotulo.toLowerCase()} (${m.id} em operação, ${fmt(m.pKw, 2)} kW × ${R.cargas.motor.perda_inversor_pct * 100} %)`, w: Math.round((m.pKw || 0) * 1000 * R.cargas.motor.perda_inversor_pct) });
  const nCm = protecoes.filter(p => p.tipo === 'caixa_moldada').length;
  const nDm = protecoes.filter(p => p.tipo === 'disjuntor_motor').length;
  const nMini = protecoes.filter(p => p.tipo === 'minidisjuntor').length;
  perdas.push({ item: `${nCm} disjuntores caixa moldada × ${rv.perdas_fixas_w.por_disjuntor_cm} W`, w: nCm * rv.perdas_fixas_w.por_disjuntor_cm });
  perdas.push({ item: `${nDm} disjuntores-motor × ${rv.perdas_fixas_w.por_disjuntor_motor} W`, w: nDm * rv.perdas_fixas_w.por_disjuntor_motor });
  perdas.push({ item: `${nMini} minidisjuntores × ${rv.perdas_fixas_w.por_mini} W`, w: nMini * rv.perdas_fixas_w.por_mini });
  perdas.push({ item: 'barramento e cabos internos', w: rv.perdas_fixas_w.barramento_e_cabos });
  perdas.push({ item: `comando (fonte, ${nReles} relés, sinaleiros)`, w: rv.perdas_fixas_w.comando });
  const P = perdas.reduce((s, p) => s + p.w, 0);
  const vazao = rv.fator * P / rv.deltaT_k;
  const livre = Math.ceil(vazao * rv.fator_filtro / 10) * 10;
  const ventilacao = ventilado ? { P, perdas, deltaT: rv.deltaT_k, vazao: arred(vazao, 0), livre, ventilador: proximo(rv.serie_m3h, livre), termostato: rv.termostato_c, filtro: tem('construcao.ventilacao_filtro'),
    texto: `P ≈ ${P} W → V = ${String(rv.fator).replace('.', ',')}·P/ΔT = ${String(rv.fator).replace('.', ',')}·${P}/${rv.deltaT_k} ≈ ${fmt(vazao, 0)} m³/h → ventilador com filtro ≥ ${livre} m³/h de vazão livre (perda nas grelhas e filtros), termostato NA ≈ ${rv.termostato_c} °C` } : null;
  if (ventilacao) {
    decide('Ventilação', `≈ ${P} W dissipados → ≈ ${fmt(vazao, 0)} m³/h; especificado ventilador ≥ ${livre} m³/h livres (folga pela perda das grelhas e do filtro), com termostato.`, 'V = 3,1·P/ΔT (ΔT 10 K) — fórmula prática de fabricantes de ventilação de painel (Rittal/Pfannenberg) [CONFERIR com o catálogo]');
    memoria.push({ titulo: 'Ventilação (dissipação)', linhas: [...perdas.map(p => `${p.item}: ${p.w} W`), ventilacao.texto] });
  }

  // ── Invólucro, peso e layout ────────────────────────────────────────────
  const env = calc?.layout?.involucro;
  const serie = R['invólucro'].serie_sobrepor;
  let dim = dimRef ? { a: dimRef.a, l: dimRef.l, p: dimRef.p } : env ? { a: env.altura, l: env.largura, p: env.profundidade } : { a: 1200, l: 800, p: 300 };
  const notasDim = [];
  if (env && dimRef && (env.altura > dimRef.a || env.largura > dimRef.l)) {
    notasDim.push(`O arranjo em fileiras DIN da skill (dimensões típicas, sem sobreposição de zonas) pede ${env.altura} × ${env.largura} × ${env.profundidade} mm (> referência ${dimRef.a} × ${dimRef.l} × ${dimRef.p}) — confirmar no layout de detalhamento com as medidas reais dos componentes; se não couber, declarar a dimensão final na proposta. [CONFERIR]`);
    avisos.push(notasDim[notasDim.length - 1]);
  } else if (env && dimRef) notasDim.push(`O arranjo calculado (fileiras DIN, canaletas e reserva) cabe no invólucro de referência (${env.altura} × ${env.largura} mm pela série comercial).`);
  if (!dimRef && !env) dim = { a: serie[4][0], l: serie[4][1], p: serie[4][2] };
  const peso = estimarPeso(dim, { protecoes, motores, comando, barramento, R });
  memoria.push({ titulo: 'Invólucro e peso', linhas: [`${quadro.montagem === 'sobrepor' ? 'Quadro de sobrepor' : `Quadro ${quadro.montagem}`} em ${quadro.material}, ${quadro.ip}, ${dim.a} × ${dim.l} × ${dim.p} mm (A × L × P)${dimRef ? ' — dimensão de referência da especificação' : ''}.`, ...notasDim, ...peso.linhas] });
  const layout = montarLayout({ dim, protecoes, motores, comando, quadro, sinaleiros, ventilacao, reguas, fonte, valvulas });

  // ── Fatos e verificações da especificação ───────────────────────────────
  const acionModelo = motores.find(m => m.acion)?.acion;
  const fatos = {
    titular: comando.blocos.some(b => b.id === 'titular_reserva'), titular_2pos: comando.blocos.some(b => b.id === 'titular_reserva') && decisoes.titular_automacao !== 'REMOTO',
    motores_reserva: motores.some(m => !m.operando), acionamento: motores.some(m => m.acion), acionamento_inversor: motores.some(m => m.partida === 'inversor'), acion_cliente: motores.some(m => m.acion?.cliente),
    icc_informado: icc != null, hvac_sem_rla: cargas.some(c => c.categoria === 'hvac_mca' && !c.rla), valvulas: valvulas.length > 0,
    valvula_borne_conferir: externos.some(x => x.sinal.valvula === '[CONFERIR]') && valvulas.length > 0,
    atuador_tipo_conferir: valvulas.some(v => !v.tipoTensao || !v.consumoVa), sinal_ui: externos.some(x => /^UI/i.test(x.sinal.bomba_operando || '')),
    tem_cargas: cargas.length > 0, geral: true,
  };
  const variaveis = {
    stit: comando.apelidos.STIT || 'S4', m1: motores[0]?.id || '', ultimo: motores[motores.length - 1]?.id || '', externos: pluralDe(externos[0]?.tipo, rotuloExt), externo: `${rotuloExt}${externos[0]?.sinal ? '' : ''}`,
    origem: quadro.origem, geral: `${geralIr || geralIn} A`, acionModelo: acionModelo ? `${acionModelo.rotulo}${acionModelo.fabricante ? ` ${acionModelo.fabricante} ${acionModelo.modelo}` : ''}` : '',
    sinal_ui: externos.find(x => /^UI/i.test(x.sinal.bomba_operando || ''))?.sinal.bomba_operando || '',
    tempo_reversao: ctxCmd.variaveis.tempo_reversao ?? 30,
  };
  const ver = avaliarVerificacoes(PF.verificacoes.regras, { fatos, req: reqIds, decisoes, variaveis, respostas: { ...(ap.respostas || {}), ...(opcoes.respostas || {}) } });
  if (decisoes.contator_emergencia === 'SIM') {
    for (const m of motores.filter(x => x.acion)) protecoes.push({ tag: `KM${m.id.replace(/\D/g, '')}`, funcao: `Contator de linha do ${m.acion.tag} (aberto pela emergência)`, tipo: 'contator', polos: '3P', In: proximo([9, 12, 18, 25, 32, 40, 50, 65, 80, 95], (m.In || 10) * 1.1), fases: 'L1L2L3', carga: m.id, criterio: 'decisão aprovada: contator de linha comandado por KE (L+E) — NBR IEC 60204-1, 10.7 [CONFERIR]', referencia: 'WEG CWB / Schneider TeSys D ou equivalente', aprovado: true });
  }

  // ── Pendências (texto + regras) ─────────────────────────────────────────
  const pendencias = [];
  const addP = (texto, origem, campo) => { if (!pendencias.some(p => p.texto === texto)) pendencias.push({ n: pendencias.length + 1, texto, origem, campo }); };
  for (const p of ver.pendencias) addP(p.texto, 'regra', p.id);
  for (const p of lidos.pendencias) {
    if (['alimentacao.icc_ka', 'chiller.rla_a', 'valvula.tipo_tensao', 'sinal.valvula'].includes(p.campo)) continue; // já cobertas pelas regras acima
    addP(p.texto, 'especificação', p.campo);
  }
  for (const m of motores) if (/CONFERIR placa/.test(m.inCriterio) && !pendencias.some(p => /Corrente nominal de placa/.test(p.texto))) addP(`Corrente nominal de placa dos motores (${motores.map(x => x.id).join(', ')}): calculada com η e FP típicos.`, 'regra', 'motor.in');

  // ── Exceções/observações a declarar ─────────────────────────────────────
  const excecoes = [...ver.excecoes];
  const letras = 'ABCDEFGHIJKLMNOP';
  excecoes.forEach((e, k) => { e.letra = letras[k]; });

  // ── Materiais ───────────────────────────────────────────────────────────
  const materiais = listaMateriais({ quadro, dim, protecoes, motores, comando, fonte, sinaleiros, ventilacao, reguas, barramento, valvulas, R, geral, peso, decisoes });

  const projeto = {
    perfil: PF.chave, versaoPerfil: PF.versao, disciplina: PF.disciplina, gerado_em: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    meta: { tag: quadro.tag, titulo: `${quadro.tag} — ${quadro.descricao}`, obra: [lidos.meta?.obra, lidos.meta?.local].filter(Boolean).join(' — ') || opcoes.obra || '', cliente: opcoes.cliente || '', referencia: `Espec. ${quadro.tag}${lidos.meta?.revisao ? ` Rev.${lidos.meta.revisao}` : ''}`, data: opcoes.data || null, revisao: opcoes.revisao || '0A' },
    quadro: { ...quadro, dimensao: dim, peso: peso.faixa },
    folhasPedidas: folhasPedidas.folhas,
    cargas: cargas.map(c => ({ ...c, regra: undefined })), motores: motores.map(m => ({ ...m, regra: undefined })), externos, valvulas, auxiliares,
    protecoes, geral, demanda: { linhas: linhasDemanda, porFase, faseMax: faseMax[0], iProj }, barramento,
    dps: tem('forca.dps') ? { ...R.dps, texto: `DPS classe ${R.dps.classe} ${R.dps.uc_v} V, In ${R.dps.in_ka} kA / Imax ${R.dps.imax_ka} kA — 3F-PE + N-PE (${esquema})` } : null,
    rff: tem('forca.rff') ? { ...R.rff } : null,
    comando: { ...comando, fonte, tensao: R.comando.tensao, fusiveis: [{ tag: 'F1', A: rc.fusivel_a, barra: 'L+', funcao: 'comando' }, ...(valvulas.length ? [{ tag: 'F2', A: rc.fusivel_a, barra: 'LV+', funcao: 'válvulas (independente da emergência)' }] : [])] },
    sinaleiros, reguas, ventilacao, layout, materiais,
    pendencias, pontos: ver.pontos, excecoes, decisoes: decisoesTexto, decisoesAplicadas: decisoes, premissas, memoria, avisos,
    funcional: comando.verificacao, interacao: comando.interacao,
    escopo: { excluido: (lidos.listas['escopo.excluido'] || []).map(i => i.texto), proposta: (lidos.listas['proposta.conteudo'] || []).map(i => i.texto), normas: [...new Set(LEI.reqs(lidos, 'normas').map(r => r.valor.norma))] },
    arranjo: calc ? arranjoDoCalc(calc, protecoes, motores) : null,
    dadosQuadros, calcResumo: calc ? { involucro: calc.layout.involucro, fileiras: calc.layout.fileiras.length, temperatura: arred(calc.term.tTopo, 1), barramento: barramento.texto, verificacoes: (calc.verificacoes || []).length } : null,
  };
  return projeto;
}

// variáveis numéricas dos blocos lidas da especificação (ex.: tempo de reversão), pelo perfil:
// blocos.variaveis = { nome: { requisito, campo } }
function variaveisDosRequisitos(lidos, PF) {
  const out = {};
  for (const [nome, def] of Object.entries(PF.blocos?.variaveis || {})) {
    const r = LEI.req(lidos, def.requisito);
    if (r && r.valor && r.valor[def.campo] != null) out[nome] = r.valor[def.campo];
  }
  return out;
}
const plural = (s) => (/[aeiou]$/i.test(s) ? `${s}s` : /r$/i.test(s) ? `${s}es` : /l$/i.test(s) ? `${s.slice(0, -1)}is` : `${s}s`);

// ── Interpretação do pedido (o que o usuário pediu para gerar) ──────────────
const FOLHAS = { unifilar: 'FL01 — Diagrama unifilar de força', comando: 'FL02 — Comando', interfaces: 'FL03 — Interfaces e réguas de bornes', layout: 'FL04 — Layout 2D', cargas_materiais: 'FL05 — Quadro de cargas, materiais, pendências e exceções', memoria: 'FL06 — Memória de cálculo e verificação funcional' };
function interpretarPedido(pedido) {
  const todas = Object.keys(FOLHAS);
  if (!pedido) return { folhas: todas, premissa: 'Pedido: projeto do quadro a partir da especificação — geradas todas as folhas (unifilar, comando, interfaces, layout, cargas/materiais e memória).' };
  const t = semAcento(pedido).toLowerCase();
  const pedidas = new Set();
  if (/unifilar/.test(t)) pedidas.add('unifilar');
  if (/comando|ladder|logica|funcional/.test(t)) pedidas.add('comando');
  if (/layout|2d|arranjo|porta|placa/.test(t)) pedidas.add('layout');
  if (/borne|interface/.test(t)) pedidas.add('interfaces');
  if (/material|lista|cargas|preco/.test(t)) pedidas.add('cargas_materiais');
  const truncado = /(\be|\bcom|\b\d)\s*[.…]*$|…$/.test(t.trim());
  const folhas = todas;
  const lidas = [...pedidas].map(k => FOLHAS[k].split(' — ')[1].toLowerCase());
  const premissa = `Pedido "${pedido.slice(0, 120)}"${truncado ? ' (chegou incompleto)' : ''}: interpretado como ${lidas.length ? lidas.join(' + ') : 'projeto do quadro'}${truncado || pedidas.size < todas.length ? ', com o comando, as interfaces, o quadro de cargas/materiais e a memória incluídos (necessários para cotar e fabricar)' : ''}.`;
  return { folhas, premissa };
}

// ── Verificações da especificação (regras em dados) ─────────────────────────
function avaliarVerificacoes(regras, { fatos, req, decisoes, variaveis, respostas }) {
  const ok = (c) => {
    const neg = c.startsWith('!');
    const s = neg ? c.slice(1) : c;
    let v;
    if (s.startsWith('f:')) v = !!fatos[s.slice(2)];
    else if (s.startsWith('req:')) v = req.has(s.slice(4));
    else if (s.startsWith('decisao:')) { const [k, x] = s.slice(8).split('='); v = String(decisoes[k] ?? '') === x; }
    else v = false;
    return neg ? !v : v;
  };
  const txt = (s) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => variaveis[k] ?? '');
  const pontos = [], pendencias = [], excecoes = [];
  for (const r of regras) {
    if (!(r.se || []).every(ok)) continue;
    if ((r.nao || []).some(ok)) continue;
    if (r.tipo === 'ponto') {
      const resp = respostas[r.id];
      if (resp === 'manter') { excecoes.push({ id: r.id, texto: txt(r.se_mantido || r.texto), origem: 'resposta do engenheiro: manter como pedido' }); continue; }
      pontos.push({ id: r.id, texto: txt(r.texto), sugestao: r.sugestao ? { ...r.sugestao, texto: txt(r.sugestao.texto) } : null });
      if (r.se_mantido) excecoes.push({ id: r.id, texto: txt(r.se_mantido), origem: 'ponto a levantar (até o cliente responder)' });
    } else if (r.tipo === 'pendencia') pendencias.push({ id: r.id, texto: txt(r.texto) });
    else if (r.tipo === 'excecao') excecoes.push({ id: r.id, texto: txt(r.texto) });
  }
  // decisões aprovadas aparecem como tal
  for (const r of regras.filter(x => x.sugestao && String(decisoes[x.sugestao.decisao] ?? '') === x.sugestao.valor)) {
    excecoes.push({ id: `${r.id}:aprovado`, texto: `Adotado (decisão aprovada): ${txt(r.sugestao.texto)}`, origem: 'decisão aprendida' });
  }
  return { pontos, pendencias, excecoes };
}

// ── Réguas de bornes (numeração e ≥ reserva) ───────────────────────────────
const TITULOS_REGUA = { X1: 'FORÇA', X2: 'CAMPO', X3: 'AUTOMAÇÃO', X4: 'RS-485' };
function montarReguas(conexoes, reservaPct) {
  const porRegua = new Map();
  for (const c of conexoes) {
    if (!porRegua.has(c.regua)) porRegua.set(c.regua, []);
    porRegua.get(c.regua).push(c);
  }
  return [...porRegua.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true })).map(([id, lista]) => {
    const bornes = lista.map((c, k) => ({ n: k + 1, rotulo: c.rotulo, secao: c.secao, grupo: c.grupo }));
    const reserva = Math.ceil(bornes.length * reservaPct - 1e-9);
    const porSecao = {};
    bornes.forEach(b => { porSecao[b.secao] = (porSecao[b.secao] || 0) + 1; });
    return { id, titulo: TITULOS_REGUA[id] || id, bornes, reserva, total: bornes.length + reserva, porSecao, reservaPct };
  });
}

// ── Peso estimado (chapa + placa + componentes típicos) ─────────────────────
function estimarPeso(dim, { protecoes, motores, comando, barramento, R }) {
  const ri = R['invólucro'];
  const pt = R.pesos_tipicos_kg;
  const a = dim.a / 1000, l = dim.l / 1000, p = dim.p / 1000;
  const chapa = 2 * (a * l + a * p + l * p) * ri.chapa_kg_m2;
  const placa = (a - 0.07) * (l - 0.07) * ri.placa_kg_m2;
  let comp = 0;
  for (const q of protecoes) {
    if (q.tipo === 'caixa_moldada') comp += q.In > 160 ? pt.disjuntor_cm_250 : pt.disjuntor_cm_125;
    else if (q.tipo === 'disjuntor_motor') comp += pt.disjuntor_motor;
    else comp += pt.mini_por_polo * (/3P/.test(q.polos) ? 3 : 2);
  }
  comp += motores.filter(m => m.acion?.noQuadro).length * pt.inversor_17a;
  comp += comando.reles.length * pt.rele + pt.fonte + (comando.porta.length + comando.sinaleiros.length) * pt.botao;
  comp += (barramento.comprimento ? barramento.comprimento * 4 : 3) * pt.barra_cu_kg_m;
  comp += pt.fiacao_e_bornes + pt.ventilador + pt.canaletas_trilhos;
  const total = chapa + placa + comp;
  const faixa = { min: Math.round(total * (1 - ri.fator_faixa) / 5) * 5, max: Math.round(total * (1 + ri.fator_faixa) / 5) * 5 };
  return { total, faixa, linhas: [`Peso estimado: chapa ${fmt(chapa, 0)} kg + placa ${fmt(placa, 0)} kg + componentes ${fmt(comp, 0)} kg ≈ ${fmt(total, 0)} kg → ${faixa.min}–${faixa.max} kg (pesos típicos de catálogo [CONFERIR com o fabricante]).`] };
}

// ── Layout (porta e placa, em mm, para a FL04 e o 3D) ───────────────────────
function montarLayout({ dim, protecoes, motores, comando, quadro, sinaleiros, ventilacao }) {
  const porta = [];
  const nS = sinaleiros.length;
  const passo = Math.min(90, (dim.l - 160) / Math.max(1, nS - 1 || 1));
  sinaleiros.forEach((s, k) => porta.push({ tag: s.tag, tipo: 'sinaleiro', cor: s.cor, rotulo: s.rotulo, x: 80 + k * passo, y: 230 }));
  const sel = comando.porta.filter(p => p.tipo === 'seletora');
  const passoS = Math.min(150, (dim.l - 200) / Math.max(1, sel.length));
  sel.forEach((s, k) => porta.push({ tag: s.id, tipo: 'seletora', rotulo: s.rotulo, posicoes: s.posicoes, x: 100 + k * passoS, y: 400 }));
  const em = comando.porta.find(p => p.tipo === 'emergencia');
  if (em) porta.push({ tag: em.id, tipo: 'emergencia', rotulo: em.rotulo, x: dim.l / 2, y: 560 });
  if (ventilacao) porta.push({ tag: 'M1', tipo: 'ventilador', rotulo: 'VENTILADOR c/ FILTRO (entrada de ar)', x: dim.l / 2, y: dim.a - 200, l: 200, h: 200 });
  // placa: zonas (força em cima/esquerda, comando à direita separado por chapa, bornes embaixo)
  const placa = { l: dim.l - 70, a: dim.a - 70 };
  const xSep = Math.round(placa.l * 0.62);
  const zonas = [
    { id: 'entrada', rotulo: `ALIMENTADOR — ENTRADA ${quadro.entrada === 'superior' ? 'POR CIMA' : 'POR BAIXO'}`, x: 0, y: 0, l: placa.l, a: 60 },
    { id: 'geral', rotulo: 'GERAL + BARRAMENTO (barreira de policarbonato)', x: 0, y: 70, l: xSep - 10, a: 220 },
    { id: 'saidas', rotulo: 'SAÍDAS DE FORÇA', x: 0, y: 300, l: xSep - 10, a: 200 },
    { id: 'acionamentos', rotulo: motores.some(m => m.acion?.noQuadro) ? 'ACIONAMENTOS (no fluxo de ar)' : 'PARTIDAS', x: 0, y: 510, l: xSep - 10, a: placa.a - 510 - 170 },
    { id: 'comando', rotulo: 'ZONA DE COMANDO (fonte, relés, minis, termostato)', x: xSep + 10, y: 70, l: placa.l - xSep - 10, a: placa.a - 70 - 170 },
    { id: 'bornes', rotulo: 'RÉGUAS DE BORNES X1…Xn', x: 0, y: placa.a - 160, l: placa.l, a: 160 },
  ];
  const itens = [];
  const porZona = { geral: [], saidas: [], acionamentos: [], comando: [] };
  for (const q of protecoes) {
    if (q.tag === 'Q1') porZona.geral.push({ tag: q.tag, rotulo: `${q.tag} ${q.Ir || q.In} A` });
    else if (['caixa_moldada', 'disjuntor_motor', 'contator'].includes(q.tipo) || q.tag === 'QDPS' || q.tag === 'QRF') porZona.saidas.push({ tag: q.tag, rotulo: `${q.tag} ${q.In} A` });
    else porZona.comando.push({ tag: q.tag, rotulo: `${q.tag}${q.idn ? ` ${q.idn}mA` : ''} ${q.In}A` });
  }
  if (protecoes.some(q => q.tag === 'QDPS')) porZona.saidas.push({ tag: 'DPS', rotulo: 'DPS' });
  if (protecoes.some(q => q.tag === 'QRF')) porZona.saidas.push({ tag: 'RFF', rotulo: 'RFF' });
  for (const m of motores.filter(x => x.acion?.noQuadro)) porZona.acionamentos.push({ tag: m.acion.tag, rotulo: `${m.acion.tag} ${m.acion.rotulo.split(' ')[0].toUpperCase()} ${m.acion.corrente || ''} A${m.acion.cliente ? ' (cliente)' : ''}` });
  porZona.comando.push({ tag: 'G1', rotulo: 'G1 24 Vcc' }, ...(comando.reles.length ? [{ tag: 'F1', rotulo: 'F1/F2 fusíveis' }] : []), ...comando.reles.map(r => ({ tag: r.tag, rotulo: r.tag, rele: true })));
  for (const [z, lista] of Object.entries(porZona)) {
    const zona = zonas.find(x => x.id === z);
    const n = lista.length || 1;
    const cols = z === 'comando' ? 3 : Math.min(n, 5);
    const w = zona.l / cols;
    const passoY = z === 'comando' ? 46 : 60;
    lista.forEach((it, k) => itens.push({ ...it, zona: z, x: zona.x + (k % cols) * w + 6, y: zona.y + 28 + Math.floor(k / cols) * passoY, l: w - 12, a: z === 'comando' ? 38 : 48 }));
  }
  // réguas de bornes na zona de baixo
  const zb = zonas.find(x => x.id === 'bornes');
  const reg = arguments[0].reguas || [];
  const totB = reg.reduce((s, r) => s + r.total, 0) || 1;
  let xb = zb.x + 6;
  for (const r of reg) {
    const w = Math.max(60, (zb.l - 12 - 8 * reg.length) * r.total / totB);
    itens.push({ tag: r.id, rotulo: `${r.id} ${r.titulo} (${r.total})`, zona: 'bornes', x: xb, y: zb.y + 30, l: w, a: 60 });
    xb += w + 8;
  }
  const criterios = [
    'Força no alto, à esquerda; comando à direita, separado por chapa (separação física força/comando).',
    motores.some(m => m.acion?.noQuadro) ? 'Acionamentos na zona de fluxo de ar: entrada baixa (porta, com filtro), saída alta (lateral, com filtro); afastamento ≥ 100 mm acima/abaixo ou conforme o manual.' : null,
    `Reserva ≥ ${Math.round(quadro.reservaPct * 100)} % na placa e nas réguas de bornes.`,
    'Barreira de policarbonato no barramento (proteção contra contato direto — NBR IEC 61439-1 / NR-10).',
    `Saída dos cabos de campo pelas ${quadro.saida}.`,
  ].filter(Boolean);
  return { dim, porta, placa, zonas, itens, separacaoX: xSep, criterios };
}

// ── Arranjo físico pela skill (FL05 em escala): as peças com as tags do projeto ─────────
function arranjoDoCalc(calc, protecoes, motores) {
  const L = calc.layout;
  const nome = (ref) => {
    if (ref === 'Q0') return 'Q1';
    if (/^FS\d+$/.test(ref)) return 'DPS';
    if (ref === 'FDPS') return 'QDPS';
    if (ref === 'QC1') return protecoes.find(q => q.auxiliar === 'comando')?.tag || ref;
    const mq = /^(.+)-Q1$/.exec(ref);
    if (mq) return motores.find(m => m.id === mq[1])?.circuito || ref;
    const m = motores.find(x => x.id === ref);
    if (m) return m.acion ? m.acion.tag : `KM${String(m.id).replace(/\D/g, '')}`;
    return ref;
  };
  const { posicoesPorta } = require('./porta');
  const PT = posicoesPorta(calc);
  return {
    involucro: L.involucro, placa: L.placa, larguraUtil: L.larguraUtil, x0: L.x0, modo: L.modo || 'fileiras', cabe: L.cabe,
    alturaNecessaria: Math.round(L.alturaNecessaria), separadores: L.separadores || [],
    verticais: { esquerda: L.verticais.esquerda.largura, direita: L.verticais.direita.largura },
    horizontais: L.horizontais.map(h => ({ y: h.y, largura: h.largura, altura: h.altura })),
    fileiras: L.fileiras.map(f => ({ y: f.y, altura: f.altura, zona: f.zona, trilhoX: f.trilhoX ?? 0, trilhoL: f.trilhoL ?? L.larguraUtil, trilho: !!f.trilho,
      itens: f.itens.map(k => ({ ref: k.ref, nome: nome(k.ref), tipo: k.tipo, x: k.x, largura: k.largura, altura: k.altura || 90, modulos: k.modulos })) })),
    barras: calc.barr && calc.barr.tipo === 'barra' ? { n: calc.barr.nBarras, entreFases: calc.c.entreFases } : null,
    porta: { botoes: PT.botoes.map(b => ({ cx: b.cx, cy: b.cy, d: b.d, tipo: b.tipo, id: String(b.funcao || '').split(/\s+/)[0], cor: b.cor })), grelhas: PT.grelhas, placa: PT.placa, fecho: PT.fecho },
  };
}

// ── Dados para a skill quadros (o projeto vira um "projeto" normal da skill) ─
function montarDadosQuadros({ quadro, protecoes, motores, cargas, geral, monofasicos, opcoes, comando = null, sinaleiros = [], decisoes = {}, R = {} }) {
  const circuitos = [];
  for (const p of protecoes.filter(x => x.tag !== 'Q1' && x.carga && x.tipo !== 'disjuntor_motor' && x.tipo !== 'contator')) {
    const c = cargas.find(k => k.id === p.carga);
    circuitos.push({ n: p.tag.replace(/^Q/, ''), descricao: p.alimenta, tipo: 'ar_condicionado', ligacao: c && c.ligacao === '3F+N' ? 'FFFN' : 'FFF', fases: 'ABC', ib_a: p.ib, disjuntor_a: p.In, curva: 'C', dr: '', secao_mm2: p.condutor?.secao || null, dispositivo: p.tipo === 'caixa_moldada' ? 'caixa_moldada' : undefined, local_dr: false });
  }
  for (const x of monofasicos) {
    if (x.servico && x.a.tipo === 'comando') continue; // é o QC1 + G1 da skill (comando 24 Vcc)
    circuitos.push({ n: x.tag.replace(/^Q/, ''), descricao: x.a.rotulo, tipo: x.servico ? 'automacao' : x.a.tipo === 'reserva' ? 'reserva' : x.a.tipo === 'tug' ? 'tug' : x.a.tipo === 'iluminacao' ? 'iluminacao' : 'tue', ligacao: 'FN', fases: x.fase.replace('L1', 'A').replace('L2', 'B').replace('L3', 'C'), ib_a: x.ib || null, disjuntor_a: x.a.In, curva: 'C', dr: x.idr ? 'idr' : '', dr_grupo: x.idr ? 'IDR' : '', dr_ma: x.idr?.idn || 30, secao_mm2: x.cond?.secao || 2.5, local_dr: !!x.idr });
  }
  return {
    meta: { schema: '1.0', titulo: `${quadro.tag} — ${quadro.descricao}`, prefixo: `${quadro.tag}_especificacao`, data: opcoes.data || '', revisao: opcoes.revisao || '0A', gerado_da_especificacao: true },
    responsavel: { empresa: 'H&M Engenharia e Tecnologia LTDA', titulo: 'Engenheiro Eletricista', nome: '', crea: '', art: '' },
    cliente: { nome: opcoes.cliente || '' }, obra: { nome: opcoes.obra || '' },
    quadro: { tag: quadro.tag, descricao: quadro.descricao, tipo: 'ccm', sistema: 'trifasico', tensao_ff: quadro.vff, tensao_fn: quadro.vfn, esquema: quadro.esquema, frequencia_hz: quadro.frequencia,
      icc_ka: quadro.icc_ka, disjuntor_geral_a: geral.In, geral_tipo: geral.In > 125 ? 'caixa_moldada' : 'auto', dps_classe: 'auto', spda: false, multimedidor: false,
      layout: 'zonas', distancia_fases_mm: R['invólucro']?.distancia_fases_mm || 60, local: 'interno_tecnico', montagem: quadro.montagem === 'autoportante' ? 'autoportante' : 'sobrepor', material: 'aco', ip: quadro.ip, entrada_cabos: quadro.entrada,
      temperatura_ambiente: 35, temperatura_max_interna: 50, reserva_pct: Math.round(quadro.reservaPct * 100), ventilacao: quadro.ventilacao ? 'auto' : 'nao', bornes_saida: 'sim', barramento: 'barra' },
    circuitos: [...circuitos, ...(protecoes.some(x => x.tag === 'QRF') ? [{ n: 'RF', descricao: 'Proteção do relé de falta de fase', tipo: 'automacao', ligacao: 'FFF', fases: 'ABC', ib_a: 0.1, disjuntor_a: protecoes.find(x => x.tag === 'QRF').In, curva: 'C', dr: '', secao_mm2: 1.5, local_dr: false }] : [])], drs: [],
    motores: motores.map(m => ({ tag: m.id, descricao: m.rotulo, potencia: m.pCv ?? m.pKw, unidade: m.pCv != null ? 'cv' : 'kW', in_placa_a: m.In ? arred(m.In, 1) : null, partida: m.partida || 'direta', quantidade: 1, tensao_placa: `${m.tensao}`,
      operando: m.operando !== false, sem_contator: decisoes.contator_emergencia !== 'SIM' })),
    // comando por relés: os relés auxiliares, contatores e temporizadores e os dispositivos da porta entram no arranjo, nas perdas e no 3D
    automacao: { ativo: false, clp: false, fonte_a: comando?.fonte?.A || null,
      cargas_24v: (comando?.fonte?.cargas || []).filter(k => /atuador/.test(k.item)).map(k => ({ descricao: k.item, quantidade: 1, corrente_ma: k.ma })),
      reles_auxiliares: [...(protecoes.some(x => x.tag === 'QRF') ? [{ tag: 'RFF', tipo: 'rele', rotulo: 'relé de falta e sequência de fase' }] : []),
        ...(comando?.reles || []).map(r => ({ tag: r.tag, tipo: r.tipo === 'temporizador' ? 'temporizador' : r.tipo === 'contator' ? 'contator' : 'rele', rotulo: r.rotulo }))],
      porta: [
        ...(comando?.seletoras || []).filter(x => x.tipo === 'seletora').map(x => ({ tipo: 'seletor', funcao: `${x.tag} ${x.rotulo || ''}`.trim(), quantidade: 1 })),
        ...(comando?.seletoras || []).filter(x => x.tipo === 'emergencia').map(x => ({ tipo: 'emergencia', funcao: `${x.tag} ${x.rotulo || ''}`.trim(), quantidade: 1 })),
        ...sinaleiros.map(h => ({ tipo: { verde: 'sinaleiro_verde', vermelho: 'sinaleiro_vermelho', amarelo: 'sinaleiro_amarelo' }[h.cor] || 'sinaleiro_branco', funcao: `${h.tag} ${h.rotulo}`, quantidade: 1 })),
      ] },
    inspecao: { tipo: 'fabricacao' },
  };
}

// ── Lista de materiais (grupos da pesquisa de preços) ───────────────────────
function listaMateriais({ quadro, dim, protecoes, motores, comando, fonte, sinaleiros, ventilacao, reguas, barramento, valvulas, R, geral, peso, decisoes }) {
  const itens = [];
  const add = (grupo, tag, descricao, qtd, un, referencia, extra = {}) => { if (qtd > 0) itens.push({ grupo, tag, descricao, quantidade: qtd, unidade: un, referencia, ...extra }); };
  const Rf = R.referencias;
  add('Invólucro', '—', `Quadro de comando ${quadro.montagem === 'sobrepor' ? 'de sobrepor' : quadro.montagem} em ${quadro.material} ${quadro.ip} ${dim.a}×${dim.l}×${dim.p} mm, porta com fechadura, placa de montagem, pintura epóxi`, 1, 'pç', Rf.involucro, { chave: `quadro ${quadro.montagem} ${quadro.material} ${quadro.ip} ${dim.a}x${dim.l}x${dim.p}`, obs: `${quadro.ip} mantido com a ventilação por filtro` });
  // proteções (agrupadas por especificação igual)
  const grupos = new Map();
  for (const q of protecoes) {
    let desc, ref, icuObs = '';
    if (q.tipo === 'caixa_moldada') { desc = `Disjuntor caixa moldada 3P ${q.In} A${q.Ir ? ` ajustável (ajustar em ${q.Ir} A)` : ''}`; ref = Rf.disjuntor_caixa_moldada; icuObs = 'Icu ≥ Icc no ponto [CONFERIR]'; }
    else if (q.tipo === 'disjuntor_motor') { desc = `Disjuntor-motor 3P faixa até ${q.In} A`; ref = Rf.disjuntor_motor; icuObs = 'back-up com o geral'; }
    else if (q.tipo === 'idr') { desc = `Interruptor DR ${q.polos} ${q.In} A ${q.idn} mA tipo ${q.drTipo}`; ref = Rf.idr; }
    else if (q.tipo === 'contator') { desc = `Contator tripolar ${q.In} A AC-3, bobina 24 Vcc`; ref = q.referencia; }
    else { desc = `Minidisjuntor ${q.polos === '1P+N' ? '1P+N' : q.polos} curva ${q.curva || 'C'}`; ref = Rf.minidisjuntor; icuObs = 'Icn/Icu ≥ Icc ou filiação com o geral [CONFERIR]'; }
    const grupoProt = q.tipo === 'contator' ? 'Proteção de força' : 'Proteção de força';
    const chaveG = q.tipo === 'minidisjuntor' ? `${desc}|${q.polos}` : `${desc}|${q.In}`;
    if (!grupos.has(chaveG)) grupos.set(chaveG, { grupo: grupoProt, tags: [], desc, ref, icuObs, ins: [], tipo: q.tipo, polos: q.polos });
    const g = grupos.get(chaveG);
    g.tags.push(q.tag); g.ins.push(q.In);
  }
  for (const g of grupos.values()) {
    const descricao = g.tipo === 'minidisjuntor' ? `${g.desc} — ${[...new Set(g.ins)].join(', ')} A` : g.desc;
    add('Proteção de força', tagsTexto(g.tags), descricao, g.tags.length, 'pç', g.ref, { chave: g.tipo === 'minidisjuntor' ? `minidisjuntor ${g.polos} curva c` : descricao.toLowerCase(), icu: g.icuObs, dependeIcc: ['caixa_moldada', 'minidisjuntor'].includes(g.tipo) });
  }
  if (protecoes.some(p => p.tag === 'QDPS')) add('Proteção de força', 'DPS', `DPS classe ${R.dps.classe} ${R.dps.uc_v} V, In ${R.dps.in_ka} kA / Imax ${R.dps.imax_ka} kA (L1, L2, L3, N)`, 4, 'pç', R.dps.referencia, { chave: `dps classe ii ${R.dps.uc_v}v ${R.dps.in_ka}ka` });
  if (protecoes.some(p => p.tag === 'QRF')) add('Proteção de força', 'RFF', `Relé de falta e sequência de fase ${quadro.vff} V, 1 NA/NF`, 1, 'pç', R.rff.referencia, { chave: 'rele falta sequencia de fase' });
  // comando e sinalização
  add('Comando e sinalização', fonte.tag, `Fonte chaveada 24 Vcc ${fonte.A} A (${fonte.W} W) trilho DIN`, 1, 'pç', R.comando.fonte, { chave: `fonte 24vcc ${fonte.A}a` });
  const fus = comando.reles.length ? (valvulas.length ? 2 : 1) : 0;
  add('Comando e sinalização', fus === 2 ? 'F1, F2' : 'F1', `Borne porta-fusível seccionável 5×20 + fusível ${R.comando.fusivel_a} A`, fus, 'pç', Rf.porta_fusivel, { chave: 'borne porta fusivel 5x20' });
  const kms = comando.reles.filter(r => r.tipo === 'contator');
  for (const km of kms) { const mt = motores.find(m => km.tag === `KM${m.id.replace(/\D/g, '')}`) || motores[0]; add('Proteção de força', km.tag, `Contator tripolar ${proximo([9, 12, 18, 25, 32, 40, 50, 65, 80, 95], (mt?.In || 9) * 1.15)} A AC-3, bobina 24 Vcc, 1 NA + 1 NF auxiliar`, 1, 'pç', 'WEG CWB / Schneider TeSys D / Siemens 3RT ou equivalente', { chave: 'contator tripolar ac3 24vcc' }); }
  if (kms.length) add('Proteção de força', '—', 'Bloco de contato auxiliar do disjuntor-motor (sinal de disparo)', kms.length, 'pç', R.referencias.disjuntor_motor, { chave: 'contato auxiliar disjuntor motor' });
  const temps = comando.reles.filter(r => r.tipo === 'temporizador');
  for (const tm of temps) add('Comando e sinalização', tm.tag, `Relé temporizador ao trabalho 24 Vcc, ajuste até ${Math.max(30, tm.preset_s * 2)} s (${tm.rotulo})`, 1, 'pç', 'Finder 80.01 / WEG RTW ou equivalente', { chave: 'rele temporizador 24vcc' });
  const k = comando.reles.filter(r => !r.tipo).map(r => r.tag);
  add('Comando e sinalização', k.length > 2 ? `K1–K${k.length}` : k.join(', '), R.comando.rele, k.length, 'pç', 'Finder 55.34 + 94.04 + 99.02 ou equivalente', { chave: 'rele 4 reversiveis 24vcc base', obs: k.join(' ') });
  for (const s of comando.seletoras.filter(x => x.tipo === 'seletora')) {
    // agrupado depois
    s._desc = `Seletora 22 mm ${s.posicoes.length} posições fixas ${s.blocos.length}NA (${s.posicoes.join('–')})`;
  }
  const porDesc = new Map();
  for (const s of comando.seletoras.filter(x => x.tipo === 'seletora')) {
    const d = s.posicoes.length === 3 && s.posicoes.includes('MAN') ? `Seletora 22 mm 3 posições fixas (MAN–0–AUT), ${s.blocos.length} blocos NA` : `Seletora 22 mm ${s.posicoes.length} posições fixas (${s.posicoes.join(' · ')})`;
    if (!porDesc.has(d)) porDesc.set(d, []);
    porDesc.get(d).push(s.tag);
  }
  for (const [d, tags] of porDesc) add('Comando e sinalização', tags.join(', '), d, tags.length, 'pç', Rf.seletora, { chave: `seletora 22mm ${/3 posi/.test(d) ? '3' : '2'} posicoes` });
  const em = comando.seletoras.find(x => x.tipo === 'emergencia');
  if (em) add('Comando e sinalização', em.tag, 'Botão de emergência cogumelo Ø 40 mm, girar para soltar, 1 NF, com anel amarelo', 1, 'pç', Rf.emergencia, { chave: 'botao emergencia cogumelo 40mm' });
  const s24 = sinaleiros.filter(s => !/220|Vca/.test(s.tensao || ''));
  const s220 = sinaleiros.filter(s => /220|Vca/.test(s.tensao || ''));
  if (s24.length) add('Comando e sinalização', tagsTexto(s24.map(s => s.tag)), `Sinaleiro LED 22 mm 24 Vcc (${[...new Set(s24.map(s => s.cor))].join(', ')})`, s24.length, 'pç', Rf.sinaleiro, { chave: 'sinaleiro led 22mm 24v' });
  if (s220.length) add('Comando e sinalização', tagsTexto(s220.map(s => s.tag)), `Sinaleiro LED 22 mm 220 Vca (${[...new Set(s220.map(s => s.cor))].join(', ')})`, s220.length, 'pç', Rf.sinaleiro, { chave: 'sinaleiro led 22mm 220v' });
  // ventilação
  if (ventilacao) {
    add('Ventilação', 'M1', `Ventilador de painel com filtro 220 V, vazão livre ≥ ${ventilacao.livre} m³/h`, 1, 'pç', Rf.ventilador, { chave: `ventilador painel filtro ${ventilacao.ventilador}m3h` });
    add('Ventilação', '—', 'Grelha de saída com filtro (mesmo tamanho do ventilador)', 1, 'pç', Rf.ventilador, { chave: 'grelha saida filtro painel' });
    add('Ventilação', 'BT', `Termostato de painel NA 0–60 °C trilho DIN (ajuste ≈ ${ventilacao.termostato} °C)`, 1, 'pç', Rf.termostato, { chave: 'termostato painel na' });
  }
  // barramento e bornes
  if (barramento.fase) {
    add('Barramento e bornes', '—', `Barra de cobre eletrolítico ${barramento.fase.replace('Cu ', '')} (L1, L2, L3, N) e PE ${barramento.pe.replace('Cu ', '')}`, arred(Math.max(1, (barramento.comprimento || 0.7) * 4 + 0.7), 1), 'm', 'DIN 43671', { chave: `barra cobre ${barramento.fase.replace('Cu ', '').replace(/\s/g, '')}` });
    add('Barramento e bornes', '—', 'Isoladores de barramento + parafusaria', 10, 'pç', '—', { chave: 'isolador barramento' });
    add('Barramento e bornes', '—', 'Barreira de proteção em policarbonato do barramento', 1, 'cj', '—', { chave: 'barreira policarbonato barramento' });
  }
  for (const r of reguas) {
    for (const [sec, n] of Object.entries(r.porSecao)) {
      const qtd = n + Math.ceil(n * r.reservaPct - 1e-9);
      add('Barramento e bornes', r.id, `Borne ${String(sec).replace('.', ',')} mm² — régua ${r.id} (${r.titulo.toLowerCase()}) + ${Math.round(r.reservaPct * 100)} % reserva`, qtd, 'pç', Rf.borne, { chave: `borne ${sec}mm2` });
    }
  }
  // consumíveis (estimativa de montagem)
  const secs = {};
  for (const q of protecoes) if (q.condutor?.secao) secs[q.condutor.secao] = (secs[q.condutor.secao] || 0) + (q.condutor.secao >= 25 ? 5 : 3);
  for (const [s, m] of Object.entries(secs).sort((a, b) => Number(b[0]) - Number(a[0]))) add('Consumíveis', '—', `Cabo flexível ${String(s).replace('.', ',')} mm² (${Number(s) >= 25 ? '0,6/1 kV 90 °C' : '750 V'}, fiação interna)`, Number(s) >= 25 ? m * 2 : Math.max(10, m * 2), 'm', '—', { chave: `cabo flexivel ${s}mm2`, estimativa: true });
  add('Consumíveis', '—', 'Cabo flexível 0,75–1,0 mm² (comando, várias cores)', 2, 'rolo 100 m', '—', { chave: 'cabo flexivel 1mm2 rolo', estimativa: true });
  add('Consumíveis', '—', 'Terminais tubulares/olhal, anilhas, abraçadeiras, fusíveis 5×20', 1, 'cj', '—', { chave: 'terminais anilhas abracadeiras', estimativa: true });
  add('Consumíveis', '—', 'Canaletas 80×80 e 60×60 + trilhos DIN', 1, 'cj', '—', { chave: 'canaletas trilhos din', estimativa: true });
  add('Consumíveis', '—', 'Plaquetas acrílicas, adesivos de advertência NR-10, porta-documentos', 1, 'cj', '—', { chave: 'plaquetas advertencia porta documentos', estimativa: true });
  add('Consumíveis', '—', `Prensa-cabos/vedação para manter ${quadro.ip}`, Math.max(10, reguas.reduce((s, r) => s + Math.ceil(r.bornes.length / 4), 0)), 'pç', '—', { chave: 'prensa cabos', estimativa: true });
  if (quadro.separacao) add('Consumíveis', '—', 'Chapa separadora força/comando (fabricação)', 1, 'pç', '—', { chave: 'chapa separadora', estimativa: true });
  // fornecido pelo cliente
  for (const m of motores.filter(x => x.acion?.cliente)) void m;
  const proprios = motores.filter(x => x.acion && !x.acion.cliente);
  if (proprios.length) {
    const a = proprios[0].acion;
    const kw = Math.max(...proprios.map(m => m.pKw || 0));
    add('Acionamentos', proprios.map(m => m.acion.tag).join(', '), `${a.rotulo} ${quadro.vff} V para motor de ${String(Math.round(kw * 100) / 100).replace('.', ',')} kW (In ≥ ${String(Math.round(Math.max(...proprios.map(m => m.In || 0)) * 10) / 10).replace('.', ',')} A), relé de falha e saída "em funcionamento"${a.tipo === 'inversor' ? ', função PID' : ''}`, proprios.length, 'pç', R.referencias[a.tipo] || 'ou equivalente', { chave: `${a.tipo} ${Math.round(kw * 10) / 10} kw` });
  }
  const cli = motores.filter(x => x.acion?.cliente);
  if (cli.length) add('Fornecido pelo cliente', cli.map(m => m.acion.tag).join(', '), `${cli[0].acion.rotulo} ${cli[0].acion.fabricante || ''} ${cli[0].acion.modelo || ''}`.trim(), cli.length, 'pç', 'fornecidos pelo cliente', { chave: null, cliente: true, obs: 'Somente montagem e ligação' });
  void geral; void peso; void decisoes;
  return itens.map((it, k) => ({ item: k + 1, ...it }));
}

function tagsTexto(tags) {
  if (tags.length <= 2) return tags.join(', ');
  const nums = tags.map(t => /^([A-Z]+)(\d+)$/.exec(t));
  if (nums.every(Boolean) && nums.every(m => m[1] === nums[0][1])) {
    const ns = nums.map(m => Number(m[2]));
    if (ns.every((v, k) => k === 0 || v === ns[k - 1] + 1)) return `${nums[0][1]}${ns[0]}–${nums[0][1]}${ns[ns.length - 1]}`;
  }
  return tags.join(', ');
}

// ── Atalho: arquivo → requisitos → projeto ──────────────────────────────────
async function projetoDoArquivo(buffer, nome, opcoes = {}) {
  const { blocosDoArquivo } = require('../../../_comum/especificacao/texto');
  const { blocos, avisos } = await blocosDoArquivo(buffer, nome);
  const lidos = LEI.lerRequisitos(blocos, opcoes.perfil || PERFIL, { aprendido: opcoes.aprendido });
  const projeto = solucionar(lidos, opcoes);
  projeto.avisos.unshift(...avisos);
  return { blocos, lidos, projeto };
}

module.exports = { solucionar, projetoDoArquivo, lerContexto, montarReguas, avaliarVerificacoes, interpretarPedido, condutorPara, PERFIL, FOLHAS, plural };
module.exports.caminhoPerfil = path.join(__dirname, '..', '..', 'dados', 'perfil-especificacao.json');
