// Diagrama UNIFILAR de SUBESTAÇÃO de média tensão (13,8 kV) em QElectroTech 0.100,
// a partir do resultado da skill media-tensao (processar(dados).calc.unifilar).
//
// Folha vertical, do ponto de entrega ao QGBT, na ordem de calc.unifilar.elementos:
//   rede aérea (Icc) → chave fusível -F1 / para-raios -FV1 em derivação para a malha →
//   cabo de MT -W1 → medição em MT (TC -T3, TP -T4, medidor -P1) → seccionadora -Q1 →
//   TC -T2 → disjuntor -Q2 com relé -K1 (linha tracejada TC → relé → disparo) ou
//   seccionadora com fusíveis HH / chave fusível → transformador -T1 (neutro à malha) →
//   [medição em BT] → cabos BT -W2 → disjuntor geral -Q3 → barramento do QGBT com as
//   saídas (saidas_qgbt). Mais de 8 saídas: o barramento continua na folha seguinte por
//   renvoi de folio (setas "vai"/"vem" vinculadas), como no unifilar de quadro.
// Símbolos da coleção oficial do QET (EN 60617 quando existe; ver SIMBOLOS).
//
// node unifilar-se.mjs [saida.qet] [--fusivel | --poste]
//   (sem opção: exemplo da skill, 500 kVA com disjuntor e relé, medição em MT;
//    --fusivel: 225 kVA abrigada com fusíveis HH e medição em BT;
//    --poste: 112,5 kVA em poste com chave fusível)
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ProjetoQet, elmtDaColecao, cartoucheHM } from './qet.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const EN = '10_electric/91_en_60617';

// símbolos oficiais (caminho dentro da coleção "elements" do QElectroTech; todos version="0.100.0")
export const SIMBOLOS = {
  rede: `${EN}/en_60617_11/en_60617_11_03/en_60617_11_03_03.elmt`,            // linha aérea
  caboMt: `${EN}/en_60617_11/en_60617_11_03/en_60617_11_03_01.elmt`,          // linha subterrânea
  chaveFusivel: `${EN}/en_60617_07/en_60617_07_21/en_60617_07_21_08.elmt`,    // fusível-seccionador
  seccFusivel: `${EN}/en_60617_07/en_60617_07_21/en_60617_07_21_09.elmt`,     // interruptor-seccionador com fusível
  paraRaios: `${EN}/en_60617_07/en_60617_07_22/en_60617_07_22_03.elmt`,
  seccionadora: `${EN}/en_60617_07/en_60617_07_13/en_60617_07_13_06.elmt`,
  disjuntor: `${EN}/en_60617_07/en_60617_07_13/en_60617_07_13_05.elmt`,
  rele: `${EN}/en_60617_07/en_60617_07_17/en_60617_07_17_04.elmt`,            // relé de sobrecorrente temporizado (I>)
  terra: `${EN}/en_60617_02/en_60617_02_15/en_60617_02_15_01.elmt`,
  trafo: '10_electric/11_singlepole/330_transformers_power_supplies/10_transformers/transformator_1f_1.elmt',
  tc: '10_electric/11_singlepole/330_transformers_power_supplies/20_current_tansformers/transformateur_courant1.elmt.elmt',
  medidor: '10_electric/10_allpole/390_sensors_instruments/70_meters_measuring_indicators/wattheuremetre_08-04-03_en60617.elmt',
  vem: '10_electric/10_allpole/100_folio_referencing/01coming_arrow.elmt',
  vai: '10_electric/10_allpole/100_folio_referencing/02going_arrow.elmt',
};

// rótulos (IEC 81346 / prática brasileira) por id da skill
export const ROTULOS = { CF1: '-F1', CF2: '-F2', PR1: '-FV1', CMT: '-W1', SC1: '-Q1', TC1: '-T2', DJ1: '-Q2', RL1: '-K1', TR1: '-T1', CBT: '-W2', DJG: '-Q3', MED_TC: '-T3', MED_TP: '-T4', MED: '-P1' };

// folha vertical: 16 colunas × 60 px e 16 linhas × 80 px (área útil x 20..980, y 20..1300)
export const FOLHA_SE = { cols: 16, colsize: 60, rows: 16, rowsize: 80 };
const X = 340;           // espinha (caminho de potência)
const XT = 40;           // coluna de descrições (à esquerda da espinha)
const XN = 720;         // coluna de notas
const LH = 11;           // entrelinha dos textos de 8 pt
const POR_FOLHA = 8;     // saídas do QGBT por folha

const num = (v, c = 2) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));
const quebrar = (s, n) => {
  const linhas = []; let l = '';
  for (const p of String(s ?? '').split(/\s+/).filter(Boolean)) {
    if (l && (l + ' ' + p).length > n) { linhas.push(l); l = p; } else l = l ? `${l} ${p}` : p;
  }
  if (l) linhas.push(l);
  return linhas;
};
const dataQet = (d) => String(d || '').replace(/\D/g, '').slice(0, 8);

/**
 * Gera o projeto .qet do unifilar da subestação. `res` = resultado de processar(dados) da
 * skill media-tensao ({ calc: { unifilar }, dados }) ou o próprio calc. Devolve o ProjetoQet.
 * `projeto` = projeto existente para acrescentar as folhas (precisa da folha FOLHA_SE ou maior).
 */
export function gerarUnifilarSE(res, { colecao = path.join(aqui, 'elementos'), projeto } = {}) {
  const uni = res?.calc?.unifilar || res?.unifilar;
  if (!uni?.elementos?.length) throw new Error('resultado sem calc.unifilar.elementos (rode processar() da skill media-tensao)');
  const dados = res.dados || {};
  const def = Object.fromEntries(Object.entries(SIMBOLOS).map(([k, c]) => [k, elmtDaColecao(colecao, c)]));
  const porId = Object.fromEntries(uni.elementos.map((e) => [e.id, e]));
  const tr = uni.elementos.find((e) => e.tipo === 'transformador');
  const pe = uni.elementos.find((e) => e.tipo === 'ponto_entrega');
  const kv = num(pe?.dados?.tensao_kv ?? tr?.dados?.primario_kv ?? 13.8);
  const vSec = Number(tr?.dados?.secundario_v) || 380;
  const vFn = (tr?.rotulo.match(/\/\d+-(\d+) V/) || [])[1] || Math.round(vSec / Math.sqrt(3));
  const comDisjuntor = uni.elementos.some((e) => e.tipo === 'disjuntor_mt');
  const titulo = `Diagrama unifilar — Subestação ${kv} kV${tr ? ` — ${num(tr.dados.kva)} kVA` : ''}`;
  const obra = dados.obra?.nome || dados.meta?.titulo || 'Subestação';

  const p = projeto || new ProjetoQet({
    titulo: `${obra} — diagrama unifilar`,
    cartouche: { author: dados.responsavel?.nome || '', date: dataQet(dados.meta?.data), plant: obra, indexrev: dados.meta?.revisao || '', filename: `${dados.meta?.prefixo || 'SE'}_unifilar` },
    propriedades: { cliente: dados.cliente?.nome || '', responsavel: dados.responsavel?.nome || '', crea: dados.responsavel?.crea ? `CREA ${dados.responsavel.crea}` : '' },
    modeloCartouche: cartoucheHM(),
    folha: FOLHA_SE,
  });
  if (p.folha.cols * p.folha.colsize < FOLHA_SE.cols * FOLHA_SE.colsize || p.folha.rows * p.folha.rowsize < FOLHA_SE.rows * FOLHA_SE.rowsize) {
    throw new Error(`o unifilar da SE precisa de folha ≥ ${FOLHA_SE.cols * FOLHA_SE.colsize} × ${FOLHA_SE.rows * FOLHA_SE.rowsize} px (o projeto recebido tem folha menor)`);
  }
  const local = [dados.cliente?.cidade, dados.cliente?.uf].filter(Boolean).join('/');
  const saidas = uni.saidas_qgbt || [];
  const grupos = [];
  for (let i = 0; i < Math.max(saidas.length, 1); i += POR_FOLHA) grupos.push(saidas.slice(i, i + POR_FOLHA));
  const nFolhas = grupos.length;
  const f = p.folio({ titulo: nFolhas > 1 ? `${titulo} (1/${nFolhas})` : titulo, cartouche: { locmach: local } });

  // ---- auxiliares de desenho
  // textos presos ao elemento, dados em deslocamento NA CENA (dx, dy a partir do hotspot);
  // em elemento girado desfaz a rotação para o texto continuar horizontal
  const local2 = (dx, dy, q) => { let [a, b] = [dx, dy]; for (let i = 0; i < q; i++) [a, b] = [b, -a]; return [a, b]; };
  const por = (o, x, y) => {
    const q = o.orientacao || 0;
    const ts = (o.txt || []).map((t) => { const [a, b] = local2(t.dx, t.dy, q); return { ...t, x: a, y: b, rotacao: q ? -90 * q : 0 }; });
    if (o.lbl) { const [a, b] = local2(o.lbl[0], o.lbl[1], q); ts.unshift({ info: 'label', x: a, y: b, tam: 9, negrito: true, rotacao: q ? -90 * q : 0 }); }
    return f.elemento(o.def, { x, y, rotulo: o.rotulo || '', orientacao: q, posTextos: { label: null }, infos: o.infos, textos: ts });
  };
  // bloco de descrição na coluna da esquerda, centrado em yc (cena)
  const desc = (linhas, x, y, yc, o = {}) => {
    const y0 = yc - Math.round((linhas.length * LH) / 2);
    return linhas.map((t, i) => ({ texto: t, dx: (o.x ?? XT) - x, dy: y0 + i * LH - y, tam: o.tam || 8, negrito: o.negrito?.(i) ?? false }));
  };
  const tracejado = { style: 'line-style: dashed;' };
  const termRel = (d, q, nome) => {
    const t = d.terminais.find((tt) => 'nesw'[(tt.orientation + q) % 4] === nome);
    let [a, b] = [t.x, t.y]; for (let i = 0; i < q; i++) [a, b] = [-b, a];
    return [a, b];
  };

  // ---- cabeçalho
  f.texto(30, 24, `DIAGRAMA UNIFILAR — SUBESTAÇÃO ${kv} kV${tr ? ` — ${num(tr.dados.kva)} kVA` : ''}`, { tam: 12, negrito: true });
  f.texto(30, 44, obra, { tam: 8 });
  const tipo = res.calc?.se?.tipo || dados.fornecimento?.tipo_se;
  const tipoSe = { poste: 'SE aérea em poste', abrigada: 'SE abrigada', blindada: 'SE em cabine blindada', ao_tempo: 'SE ao tempo' }[tipo] || 'Subestação';
  f.texto(30, 57, `${tipoSe} — proteção geral por ${comDisjuntor ? 'disjuntor com relé secundário 50/51 – 50N/51N' : 'fusíveis'} — medição em ${porId.MED?.dados?.local || '—'}`, { tam: 8 });

  // ---- ponto de entrega: rede aérea chegando pela esquerda, desce para o 1º equipamento
  const Y_REDE = 110;
  const dPE = pe?.dados || {};
  const distrib = (pe?.rotulo || '').replace(/^Ponto de entrega\s*—\s*/, '').replace(/\s*[\d,.]+\s*kV\s*$/, '') || 'distribuidora';
  const rede = por({
    def: def.rede, rotulo: '', infos: { comment: pe?.rotulo || 'Ponto de entrega' },
    txt: [
      { texto: `Rede ${kv} kV — 60 Hz`, dx: -140, dy: -30, tam: 8, negrito: true },
      ...desc(['Ponto de entrega', distrib, `Icc 3φ = ${num(dPE.icc_3f_ka)} kA · φ-T = ${num(dPE.icc_ft_ka)} kA`, `Scc = ${num(dPE.scc_mva, 1)} MVA`], X, Y_REDE, Y_REDE, { x: XT, tam: 7, negrito: (i) => i === 0 }),
    ],
  }, X, Y_REDE);
  let cur = { b: rede.borne('e'), y: Y_REDE };
  let ultimoTc = null, ultimoDj = null, eTerra = null;

  // coloca um equipamento em série: topo (borne n) GAP abaixo do borne de saída anterior
  const emSerie = (d, o, gap = 30) => {
    const q = o.orientacao || 0;
    const [, yn] = termRel(d, q, 'n'), [, ys] = termRel(d, q, 's');
    const y = Math.ceil((cur.y + gap - yn) / 10) * 10; // hotspot sempre na grade de 10
    const e = por({ ...o, def: d, txt: [...(o.txt || []), ...(o.descr ? desc(o.descr, X, y, y + (yn + ys) / 2) : [])] }, X, y);
    f.ligar(cur.b, e.borne('n'), { pontos: [] });
    cur = { b: e.borne('s'), y: y + ys };
    return e;
  };

  for (const el of uni.elementos) {
    const d = el.dados || {};
    const rot = ROTULOS[el.id] || '';
    const infos = { comment: el.rotulo, description: el.id };
    switch (el.tipo) {
      case 'ponto_entrega': break;
      case 'chave_fusivel':
        emSerie(def.chaveFusivel, { rotulo: rot || '-F1', lbl: [14, -12], infos, descr: el.rotulo.split(' — ') });
        break;
      case 'para_raios': {
        // derivação do nó (borne de saída do último equipamento em série) para a malha
        const xp = X + 110, yTopo = cur.y + 30, y = yTopo + 20;
        const pr = por({ def: def.paraRaios, rotulo: rot || '-FV1', lbl: [14, -12], infos, txt: [`Para-raios ${num(d.ur_kv)} kV ${num(d.in_ka)} kA (${d.quantidade || 3}×)`, ...quebrar(`MCOV ${num(d.mcov_kv, 1)} kV — óxido metálico${d.local ? ' — ' + d.local : ''}`, 34)].map((t, i) => ({ texto: t, dx: 50, dy: -24 + i * LH, tam: 7, negrito: i === 0 })) }, xp, y);
        f.ligar(cur.b, pr.borne('n'), { pontos: [[X, cur.y + 16], [xp, cur.y + 16]] });
        eTerra = por({ def: def.terra, rotulo: '', infos: { comment: 'Malha de aterramento' } }, xp, y + 50);
        f.ligar(pr.borne('s'), eTerra.borne('n'), { pontos: [] });
        break;
      }
      case 'cabo_mt':
        emSerie(def.caboMt, {
          rotulo: rot || '-W1', orientacao: 1, lbl: [30, -80], infos,
          descr: [...el.rotulo.split(' — ').slice(0, 1), `${num(d.comprimento_m, 0)} m — ${String(d.metodo || '').replace(/_/g, ' ')}`, `${d.terminacoes || 6} terminações (muflas)`],
        });
        break;
      case 'medicao_mt': case 'medicao_bt': {
        const mt = el.tipo === 'medicao_mt';
        const yTop = cur.y;
        const tc = emSerie(def.tc, { rotulo: ROTULOS.MED_TC, lbl: [10, 6], infos: { comment: mt ? 'TC de medição (distribuidora)' : `TC de medição BT ${d.tc || ''}` }, descr: mt ? ['Medição indireta em MT', 'TPs e TCs da distribuidora', '(cubículo de medição lacrado)'] : ['Medição indireta em BT', `TCs ${d.tc || ''}`, '(padrão da distribuidora)'] });
        const [xtc, ytc] = tc.borne('e').ponto();
        const xm = X + 230, ym = ytc + 40;
        const med = por({ def: def.medidor, rotulo: ROTULOS.MED, lbl: [30, -30], infos: { comment: 'Medidor de energia da distribuidora' }, txt: [{ texto: 'kWh/kvarh', dx: 30, dy: -16, tam: 7 }] }, xm, ym);
        f.ligar(tc.borne('e'), med.borne('n'), { pontos: [[xtc + 40, ytc], [xtc + 40, ytc - 16], [xm, ytc - 16]], props: tracejado });
        let yFim;
        if (mt) {
          // TP em derivação logo abaixo do TC; secundário ao medidor
          const yv = ytc + 100, xv = X + 110;
          const tp = por({ def: def.trafo, rotulo: ROTULOS.MED_TP, orientacao: 3, lbl: [-14, -34], infos: { comment: 'TP de medição (distribuidora)' } }, xv, yv);
          f.ligar(tc.borne('s'), tp.borne('w'), { pontos: [[X, yv]] });
          f.ligar(tp.borne('e'), med.borne('s'), { pontos: [[xm, yv]], props: tracejado });
          yFim = yv + 35;
        } else {
          // em BT a tensão vem direto do barramento
          const [, ys] = tc.borne('s').ponto(), [, yms] = med.borne('s').ponto();
          f.ligar(tc.borne('s'), med.borne('s'), { pontos: [[X, yms + 16], [xm, yms + 16]], props: tracejado });
          yFim = Math.max(ys, yms) + 30;
        }
        f.retangulo(X - 40, yTop + 8, xm + 90, yFim, { estilo: 'DashDotLine' });
        f.texto(X + 46, yTop + 10, 'Medição — distribuidora', { tam: 7 });
        cur.y = Math.max(cur.y, yFim - 20);
        break;
      }
      case 'seccionadora':
        emSerie(def.seccionadora, { rotulo: rot || '-Q1', lbl: [14, -26], infos, descr: [el.rotulo] });
        break;
      case 'seccionadora_fusivel':
        emSerie(def.seccFusivel, { rotulo: rot || '-Q1', lbl: [14, -12], infos, descr: [el.rotulo.replace(/ com fusíveis/, ' tripolar com fusíveis'), 'limitadores (proteção geral)'] });
        break;
      case 'tc':
        ultimoTc = emSerie(def.tc, { rotulo: rot || '-T2', lbl: [10, 6], infos, descr: [el.rotulo, 'proteção (relé secundário)'] });
        break;
      case 'disjuntor_mt':
        ultimoDj = emSerie(def.disjuntor, { rotulo: rot || '-Q2', lbl: [14, -6], infos, descr: [`Disjuntor de MT ${num(d.un)} kV ${num(d.in)} A`, `Icn ${num(d.icn)} kA — NBI ${num(d.nbi)} kV`, 'abertura pelo relé de proteção'] });
        break;
      case 'rele': {
        // relé de sobrecorrente: entrada do TC (secundário) e disparo do disjuntor, tracejados
        const tcEl = ultimoTc || null, djEl = ultimoDj || null;
        const [, yTc] = tcEl ? tcEl.borne('e').ponto() : [0, cur.y - 80];
        const xr = X + 190, yr = yTc + 40; // hotspot no canto inferior direito da caixa 60 × 60
        const fx = (v) => num(v, 1);
        por({
          def: def.rele, rotulo: rot || '-K1', lbl: [6, -60], infos: { comment: el.rotulo, description: (d.funcoes || []).join('/') },
          txt: [
            { texto: (d.funcoes || ['50', '51', '50N', '51N']).join(' / '), dx: 6, dy: -47, tam: 8, negrito: true },
            { texto: `Curva ${d.curva || ''} — dial ${num(d.dial)}`, dx: 6, dy: -35, tam: 7 },
            { texto: `51: ${fx(d.i51_a)} A · 50: ${fx(d.i50_a)} A`, dx: 6, dy: -24, tam: 7 },
            { texto: `51N: ${fx(d.i51n_a)} A · 50N: ${fx(d.i50n_a)} A`, dx: 6, dy: -13, tam: 7 },
            { texto: '(primário; ajustes indicativos)', dx: 6, dy: -2, tam: 6 },
          ],
        }, xr, yr);
        if (tcEl) {
          const [xe, ye] = tcEl.borne('e').ponto();
          f.linha(xe, ye, xr - 60, ye, { estilo: 'DashLine' });
          f.texto(xe + 22, ye - 13, '5 A', { tam: 6 });
        }
        if (djEl) {
          const [, yn] = djEl.borne('n').ponto();
          const yd = yn + 26;
          f.linha(xr - 30, yr, xr - 30, yd, { estilo: 'DashLine' });
          f.linha(xr - 30, yd, X + 4, yd, { estilo: 'DashLine' });
          f.texto(X + 40, yd - 17, 'disparo (bobina de abertura)', { tam: 6 });
        }
        break;
      }
      case 'transformador': {
        const iso = { oleo: 'a óleo', seco: 'a seco' }[d.isolamento] || d.isolamento || '';
        const t = emSerie(def.trafo, {
          rotulo: rot || '-T1', lbl: [22, -34], infos,
          txt: [{ texto: 'Δ', dx: -4, dy: -22, tam: 8 }, { texto: 'Y', dx: -3, dy: 8, tam: 8 }],
          descr: [`Transformador ${num(d.kva)} kVA ${iso}`.trim(), `${num(d.primario_kv)} kV / ${vSec}-${vFn} V — ${d.ligacao || ''}`, `Z = ${num(d.z_pct)} % — 60 Hz`],
        }, 40);
        // neutro do secundário ligado à malha (o símbolo não tem borne de neutro: linha)
        const yh = t.y;
        const xn = X + 80, yN = yh + 12;
        f.linha(X + 15, yN, xn, yN);
        const en = por({ def: def.terra, rotulo: '', infos: { comment: 'Neutro do transformador ligado à malha' }, txt: [{ texto: 'N — neutro à malha', dx: 12, dy: -18, tam: 7 }] }, xn, yh + 40);
        f.linha(xn, yN, xn, en.borne('n').ponto()[1]);
        cur.y += 20; // folga para o símbolo de terra do neutro
        break;
      }
      case 'cabo_bt': {
        // trecho de cabos: só o condutor, com a identificação ao lado
        const yc = cur.y + 40;
        f.texto(X + 10, yc - 12, rot || '-W2', { tam: 9, negrito: true });
        const ls = el.rotulo.split(' — ');
        f.texto(XT, yc - Math.round((ls.length + 1) * LH / 2), ['Cabos BT (Cu, fase/N/PE):', ...ls].join('\n'), { tam: 8 });
        cur.y += 60; // abre espaço; o condutor sai do borne anterior direto ao próximo
        break;
      }
      case 'disjuntor_bt':
        emSerie(def.disjuntor, { rotulo: rot || '-Q3', lbl: [14, -6], infos, descr: [`Disjuntor geral BT ${num(d.in_a)} A`, `Icu ${num(d.icu_ka)} kA — ${d.tipo || ''}`.replace(/ — $/, '')] });
        break;
      case 'barramento_bt': break; // desenhado abaixo, com as saídas
      default:
        // equipamento sem símbolo próprio: só texto ao lado do condutor
        f.texto(X + 10, cur.y + 10, `${el.id}: ${el.rotulo}`, { tam: 7 });
        cur.y += 30;
    }
  }

  // ---- QGBT: barramento e saídas
  const qg = porId.QGBT;
  const desenharBarra = (fo, fonte, grupo, g) => {
    const n = Math.max(grupo.length, 1);
    const passo = Math.min(140, Math.max(80, Math.floor(600 / n / 10) * 10));
    const largura = (n - 1) * passo;
    let x0 = Math.round((X - largura / 2) / 10) * 10;
    x0 = Math.max(fonte.xMin ?? 90, Math.min(x0, (fonte.xMax ?? 640) - largura));
    const yb = fonte.yBarra, yq = yb + 70;
    fo.linha(fonte.xIni ?? Math.min(x0, X) - 30, yb, Math.max(x0 + largura, X) + 30 + (g < nFolhas - 1 ? 40 : 0), yb, { largura: 3 });
    grupo.forEach((s, i) => {
      const x = x0 + i * passo;
      const ib = s.demanda_kw && s.fp ? (s.demanda_kw * 1000) / (Math.sqrt(3) * vSec * s.fp) : null;
      const largChars = Math.max(12, Math.floor(passo / 6));
      const ls = [
        { t: s.id, n: true, tam: 8 },
        ...quebrar(s.descricao, largChars).slice(0, 2).map((t) => ({ t, tam: 7 })),
        { t: `${num(s.demanda_kw, 1)} kW — FP ${num(s.fp)}`, tam: 7 },
        ...(ib ? [{ t: `Ib ≈ ${num(ib, 0)} A`, tam: 7 }] : []),
      ];
      const q = fo.elemento(def.disjuntor, {
        x, y: yq, rotulo: `-Q${11 + g * POR_FOLHA + i}`, posTextos: { label: null }, infos: { comment: `Saída ${s.id} — ${s.descricao}` },
        textos: [{ info: 'label', x: 8, y: -36, tam: 8, negrito: true }, ...ls.map((l, k) => ({ texto: l.t, x: -passo / 2 + 8, y: 26 + k * 10, tam: l.tam, negrito: !!l.n }))],
      });
      fo.ligar(fonte.b, q.borne('n'), fonte.rota(x));
    });
    return { x0, xFim: x0 + largura, yb };
  };

  // fonte do barramento na 1ª folha: borne de saída do disjuntor geral
  const yBarra = Math.ceil((cur.y + 30) / 10) * 10;
  const caixaQ = { y1: yBarra - 110 };
  const r0 = desenharBarra(f, { b: cur.b, yBarra, rota: () => ({ via: { y: yBarra } }) }, grupos[0], 0);
  const textoQgbt = [
    `QGBT — ${vSec}/${vFn} V — TN-S`,
    ...(qg ? [`Barramento ${qg.dados.barra}`, `Icw ${num(qg.dados.icw_ka)} kA · Ipk ${num(qg.dados.ipk_ka)} kA`] : []),
  ];
  f.texto(X + 50, yBarra - 66, textoQgbt.join('\n'), { tam: 8 });
  const xVai = Math.round((r0.xFim + 60) / 10) * 10;
  f.retangulo(30, caixaQ.y1, nFolhas > 1 ? Math.max(XN - 20, xVai + 70) : XN - 20, yBarra + 160, { estilo: 'DashLine' });
  f.texto(36, caixaQ.y1 + 3, 'QGBT', { tam: 9, negrito: true });
  if (!saidas.length) f.texto(X + 10, yBarra + 10, 'Saídas conforme projeto de BT', { tam: 7 });

  // ---- aterramento e notas
  const at = uni.aterramento || {};
  if (eTerra) {
    const [xe, ye] = eTerra.borne('n').ponto();
    f.texto(xe + 50, ye + 12, ['Malha de aterramento (NBR 15751)', ...(at.malha ? [at.malha] : []), ...(at.resistencia_ohm != null ? [`Rg = ${num(at.resistencia_ohm)} Ω`] : [])].join('\n'), { tam: 7 });
  }
  const notas = [
    'Representação unifilar: equipamentos trifásicos (3×), 60 Hz; quantidades indicadas no memorial.',
    comDisjuntor ? 'Relé secundário 50/51 – 50N/51N alimentado pelos TCs de proteção, com fonte auxiliar (nobreak/capacitivo); ajustes indicativos: os definitivos saem do estudo de proteção e seletividade aprovado pela distribuidora.' : 'Proteção geral por fusíveis, dimensionados para o transformador (NBR 14039 e norma da distribuidora).',
    'Medição conforme o padrão da distribuidora (equipamentos e lacres da distribuidora).',
    `Aterramento: ${at.malha ? `malha ${at.malha}` : 'malha conforme memorial'}${at.resistencia_ohm != null ? `, Rg = ${num(at.resistencia_ohm)} Ω` : ''}; para-raios, carcaças e neutro do transformador ligados à malha — esquema TN-S a partir do QGBT.`,
    uni.elementos.some((e) => e.tipo === 'cabo_mt') ? 'Cabo de MT verificado ao curto-circuito pela integral de Joule (NBR 14039).' : null,
    'Saídas do QGBT: Ib pela demanda; disjuntores e cabos das saídas conforme o projeto de BT (NBR 5410).',
    'Normas: NBR 14039:2021, NBR 15751, NBR 5356, NBR 16050, REN ANEEL 1000/2021.',
    dados.meta?.dados_ilustrativos ? 'DADOS ILUSTRATIVOS — não usar como projeto executivo.' : null,
    'Gerado pelo sistema H&M a partir do memorial — revisar antes de emitir.',
  ].filter(Boolean);
  const linhasNotas = ['NOTAS'];
  notas.forEach((t, i) => quebrar(t, 48).forEach((l, k) => linhasNotas.push(`${k ? '    ' : `${i + 1}. `}${l}`)));
  f.texto(XN, 90, [...linhasNotas, '', 'LEGENDA', '- - -  comando / medição (secundário)', '— · —  limite de fornecimento da distribuidora', 'Rótulos IEC 81346: -F fusível, -FV para-raios,', '-W cabo, -Q manobra/disjuntor, -T transformador', '/TC/TP, -K relé, -P medidor'].join('\n'), { tam: 7 });

  // ---- folhas seguintes (mais de POR_FOLHA saídas): barramento continua por renvoi
  if (nFolhas > 1) {
    let vai = f.elemento(def.vai, { x: xVai, y: yBarra, rotulo: '' });
    f.ligar(cur.b, vai.borne('w'), { via: { y: yBarra }, props: { condsize: '2' } });
    for (let g = 1; g < nFolhas; g++) {
      const fo = p.folio({ titulo: `${titulo} (${g + 1}/${nFolhas})`, cartouche: { locmach: local } });
      fo.texto(30, 24, `DIAGRAMA UNIFILAR — QGBT (continuação ${g + 1}/${nFolhas})`, { tam: 12, negrito: true });
      fo.texto(30, 44, obra, { tam: 8 });
      const yb = 300;
      const vem = fo.elemento(def.vem, { x: 110, y: yb, rotulo: '', posTextos: { label: [-48, -11.5] } });
      vem.vincular(vai);
      const r = desenharBarra(fo, { b: vem.borne('e'), xIni: vem.borne('e').ponto()[0], xMin: 170, xMax: 760, yBarra: yb, rota: (x) => ({ pontos: [[x, yb]] }) }, grupos[g], g);
      fo.retangulo(30, yb - 60, Math.max(XN - 20, Math.round((r.xFim + 60) / 10) * 10 + 70), yb + 160, { estilo: 'DashLine' });
      fo.texto(36, yb - 57, 'QGBT (continuação)', { tam: 9, negrito: true });
      if (g < nFolhas - 1) {
        vai = fo.elemento(def.vai, { x: Math.round((r.xFim + 60) / 10) * 10, y: yb, rotulo: '' });
        fo.ligar(vem.borne('e'), vai.borne('w'), { props: { condsize: '2' } });
      }
    }
  }
  return p;
}

// variantes do exemplo da skill (≤ 300 kVA: proteção por fusível e medição em BT)
export function variante(ex, tipo) {
  const v = JSON.parse(JSON.stringify(ex));
  const kva = tipo === 'poste' ? 112.5 : 225;
  v.meta = { ...v.meta, prefixo: `${v.meta?.prefixo || 'SE'}_${tipo}`, titulo: `Subestação ${tipo === 'poste' ? 'em poste' : 'abrigada'} 13,8 kV — ${String(kva).replace('.', ',')} kVA (exemplo)` };
  v.obra = { ...v.obra, nome: `${v.obra?.nome || 'Obra'} — variante ${tipo === 'poste' ? 'em poste' : 'com fusível'}` };
  v.transformador.potencia_kva = kva;
  v.fornecimento.tipo_se = tipo === 'poste' ? 'auto' : 'abrigada';
  v.cargas.carga_instalada_kw = Math.round(kva * 0.9);
  v.cargas.quadros = [
    { id: 'QGL', descricao: 'Iluminação e tomadas', demanda_kw: Math.round(kva * 0.3), fp: 0.92 },
    { id: 'QAC', descricao: 'Climatização', demanda_kw: Math.round(kva * 0.35), fp: 0.88 },
  ];
  return v;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const require = createRequire(import.meta.url);
  const skill = require('../../../media-tensao/scripts/lib/index.js');
  const ex = require('../../../media-tensao/exemplos/exemplo-subestacao.json');
  const tipo = process.argv.includes('--poste') ? 'poste' : process.argv.includes('--fusivel') ? 'fusivel' : null;
  const res = skill.processar(tipo ? variante(ex, tipo) : ex);
  const saida = process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(aqui, '..', 'saida', 'subestacao', `unifilar-se${tipo ? '-' + tipo : ''}.qet`);
  const p = gerarUnifilarSE(res);
  p.salvar(saida);
  console.log('Gerado:', saida, `(${p.folios.length} folha(s); proteção ${res.calc.prot.modo}; medição ${res.calc.med.local})`);
}
