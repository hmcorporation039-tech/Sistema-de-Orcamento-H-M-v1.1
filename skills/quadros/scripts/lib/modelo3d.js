// Modelo 3D do quadro (documento "modelo3d"): página HTML autossuficiente com o
// mesmo visualizador/three.js de skills/_comum/cad/visualizador3d (cena
// tipo 'quadro', em ./visualizador3d/quadro.js). A cena sai do MESMO arranjo
// do desenho DXF (calc.layout), com as medidas reais de cada dispositivo
// (catálogo do fabricante ou típicas) — invólucro, porta articulada com os
// dispositivos de porta, placa, trilhos, canaletas translúcidas, barramentos
// com isoladores ou pente, barras N/PE, bornes e a reserva "fantasma".
//
// Infraestrutura visível e identificada (31/10/2026): toda peça da lista do
// cálculo entra na cena com `tag` (o teste compara as TAGs da lista com as da
// cena), e a infraestrutura — canaletas, trilhos, barramentos/pente, barras
// N/PE, bornes um a um, placa, invólucro, porta, flange de entrada de cabos e
// ventilação — sai com tipo e medida no rótulo, na legenda e na ficha do clique.
const fs = require('fs');
const path = require('path');
const T = require('./tabelas');
const CAT = require('./catalogo');
const { posicoesPorta } = require('./porta');
const { ENTRADA_CABOS } = require('./layout');
const V = require('../../../_comum/cad/visualizador3d');
const { EMPRESA } = require('../../../_comum/empresa');

const Z_PLACA = 25;        // placa de montagem afastada do fundo (mm)
const ESP_PLACA = 3;
const ALTURA_TRILHO = 7.5; // TS35 × 7,5
const ALTURA_ISOLADOR = 40;

const CAMADAS = [
  { id: 'protecao', rotulo: 'Proteção (disjuntores, DR, DPS, medição)', cor: '#e9ecef' },
  { id: 'partidas', rotulo: 'Partidas (disjuntor-motor, contatores, soft/inversor)', cor: '#6c8fb3' },
  { id: 'automacao', rotulo: 'Comando e automação (fonte, CLP, relés)', cor: '#4f9d69' },
  { id: 'barramentos', rotulo: 'Barramentos, isoladores e barras N/PE', cor: '#c87533' },
  { id: 'bornes', rotulo: 'Réguas de bornes', cor: '#9aa3ad' },
  { id: 'canaletas', rotulo: 'Canaletas', cor: '#8d949c' },
  { id: 'trilhos', rotulo: 'Trilhos DIN', cor: '#b8bcc2' },
  { id: 'entrada', rotulo: 'Entrada de cabos (flange e prensa-cabos)', cor: '#4a5058' },
  { id: 'reserva', rotulo: 'Reserva', cor: '#c9a227' },
  { id: 'placa', rotulo: 'Placa de montagem', cor: '#e6e1d6' },
];
const NOME_FILHO = { disjuntor_motor: 'Disjuntor-motor', disjuntor_caixa_moldada: 'Disjuntor caixa moldada', contator: 'Contator', rele_sobrecarga: 'Relé de sobrecarga', rele_tempo: 'Relé de tempo', soft_starter: 'Soft-starter', inversor: 'Inversor de frequência' };
const ZONA_CANALETA = { topo: 'topo da placa', geral: 'disjuntor geral', entrada: 'entrada', distribuicao: 'circuitos de distribuição', placa: 'caixas moldadas', partidas: 'partidas', comando: 'comando 24 Vcc', clp: 'CLP', reles: 'relés', barras_np: 'barras N/PE', bornes: 'bornes' };
const COR = {
  disjuntor: '#f1f3f5', disjuntor_geral: '#f1f3f5', disjuntor_comando: '#f1f3f5', protecao_dps: '#eceff1', protecao_medicao: '#eceff1', protecao_24v: '#eceff1',
  idr: '#cfe3ff', ddr: '#d9ccff', dps: '#ffc56b', disjuntor_cm: '#56606b', medidor: '#efcf6b',
  fonte: '#8a7bd1', clp: '#3e8e5a', modulo_DI: '#5fae78', modulo_DO: '#5fae78', modulo_AI: '#78bf8c', modulo_AO: '#78bf8c', modulo_rs485: '#78bf8c',
  switch: '#3a4250', rele_interface: '#c9bfe8', rele_seguranca: '#e6c229',
  Q1: '#5d7fa3', K1: '#7f9fbf', K2: '#7f9fbf', K3: '#7f9fbf', F4: '#a9bcd0', KT1: '#cfd8e3', T1: '#2f5f9a',
};
const CAMADA_TIPO = (t) => (['fonte', 'clp', 'switch', 'rele_interface', 'rele_seguranca', 'disjuntor_comando', 'protecao_24v'].includes(t) || t.startsWith('modulo') ? 'automacao' : t === 'partida' ? 'partidas' : 'protecao');
const COR_PORTA = { emergencia: '#d62828', liga: '#f5f5f5', desliga: '#202225', reset: '#2f6fd6', seletor: '#2a2c30', sinaleiro_verde: '#3fb950', sinaleiro_amarelo: '#f2c94c', sinaleiro_vermelho: '#e5484d', sinaleiro_branco: '#f5f5f5', potenciometro: '#3a3d42' };
const n1 = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const mm = (...v) => `${v.map(n1).join(' × ')} mm`;
const curto = (s, n = 70) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Ficha (clique) de um dispositivo ou peça: TAG, descrição, L × A × P e a origem da medida
function infoMedida(tag, desc, m, l, a, p, extra = []) {
  const linhas = [...(tag ? [['TAG', tag]] : []), ['Dispositivo', desc], ...extra, ['Medidas L × A × P', mm(l, a, p)]];
  if (m && m.origem === 'catalogo') {
    linhas.push(['Fabricante', m.fabricante], ['Referência', m.referencia || '—']);
    if (m.linha) linhas.push(['Linha', m.linha]);
    linhas.push(['Origem da medida', m.verificado ? 'catálogo do fabricante (verificado)' : 'catálogo — NÃO verificado [CONFERIR]']);
    if (m.fonte_documento) linhas.push(['Documento', m.fonte_documento]);
    if (m.fonte_url) linhas.push(['Fonte', m.fonte_url]);
  } else {
    if (m && m.fabricante) linhas.push(['Fabricante', `${m.fabricante} (sem registro no catálogo)`]);
    linhas.push(['Origem da medida', 'típica de catálogo [CONFERIR]']);
    if (m && m.especificacao) linhas.push(['Buscar', m.especificacao]);
  }
  return linhas;
}

// Infraestrutura e porta pelo catálogo: o cálculo dimensiona canaletas, trilho, ventilação e
// dispositivos de porta pela série típica; aqui só se procura o registro do fabricante
// escolhido (fabricantes.por_tipo / padrão) para mostrar fabricante e referência — sem mexer
// no arranjo nem na lista "sem medida" do cálculo.
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
function catalogoInfra(dados) {
  let lista = null;
  const doFab = (tipo) => {
    const fab = CAT.fabricanteDoTipo(dados, tipo);
    if (!fab) return { fab, regs: [] };
    lista = lista || CAT.carregarCatalogo(dados);
    return { fab, regs: lista.filter(r => r.tipo === tipo && norm(r.fabricante) === norm(fab)) };
  };
  const medida = (r) => ({ origem: 'catalogo', fabricante: r.fabricante, linha: r.linha || '', referencia: r.referencia || '', descricao: r.descricao || '', fonte_url: r.fonte_url || '', fonte_documento: r.fonte_documento || '', verificado: r.verificado === true, l: Number(r.largura_mm), a: Number(r.altura_mm), p: Number(r.profundidade_mm) || null });
  const tipica = (fab, esp) => ({ origem: 'tipica', fabricante: fab, especificacao: fab ? `${fab} ${esp}` : '' });
  const vazao = (r) => { const m = String(r.descricao || '').match(/(\d+)(?:\/(\d+))?\s*m³\/h/); return m ? Number(m[2] || m[1]) : 0; };
  return {
    // canaleta L × A do cálculo: o registro com as mesmas medidas; senão o comercial mais próximo que a contém
    canaleta(l, a) {
      const { fab, regs } = doFab('canaleta');
      const r = regs.find(x => Number(x.largura_mm) === l && Number(x.profundidade_mm) === a);
      if (r) return { m: medida(r) };
      const eq = regs.filter(x => Number(x.largura_mm) >= l && Number(x.profundidade_mm) >= a).sort((x, y) => x.largura_mm * x.profundidade_mm - y.largura_mm * y.profundidade_mm)[0];
      return { m: tipica(fab, `canaleta recortada ${l} × ${a} mm com tampa`), equivalente: eq ? `${eq.fabricante} ${eq.referencia} (${n1(Number(eq.largura_mm))} × ${n1(Number(eq.profundidade_mm))} mm) [CONFERIR]` : null };
    },
    trilho() {
      const { fab, regs } = doFab('trilho_din');
      const r = regs.find(x => Number(x.profundidade_mm) === 7.5 && /perf/i.test(x.referencia) && !/unperf/i.test(x.referencia)) || regs.find(x => Number(x.profundidade_mm) === 7.5);
      return r ? medida(r) : tipica(fab, 'trilho DIN 35 × 7,5 mm perfurado (EN 60715)');
    },
    // ventilador com filtro: a menor vazão ≥ a do cálculo (alimentação CA); filtro de saída do mesmo tamanho
    ventilacao(m3h) {
      const { fab, regs } = doFab('ventilador');
      const fan = regs.filter(x => /ventilador/i.test(x.descricao) && !/\bDC\b|Vcc/i.test(x.descricao) && vazao(x) >= m3h).sort((x, y) => vazao(x) - vazao(y))[0];
      const filtro = fan && regs.find(x => /filtro de sa[ií]da/i.test(x.descricao) && Number(x.largura_mm) === Number(fan.largura_mm));
      return { ventilador: fan ? medida(fan) : tipica(fab, `ventilador com filtro ${m3h} m³/h`), filtro: filtro ? medida(filtro) : tipica(fab, 'grelha de saída com filtro') };
    },
    // dispositivos de porta Ø 22 mm e IHM
    porta(tipo, pol) {
      const t = tipo === 'seletor' ? 'comutador' : /^sinaleiro/.test(tipo) ? 'sinaleiro' : tipo === 'ihm' ? 'ihm' : 'botao';
      const { fab, regs } = doFab(t);
      const r = t === 'ihm' ? regs.find(x => new RegExp(`(^|[^\\d,.])${String(pol).replace('.', '[,.]')}\\s*"`).test(x.descricao))
        : tipo === 'emergencia' ? regs.find(x => /emerg/i.test(x.descricao) && /40/.test(x.descricao)) || regs.find(x => /emerg/i.test(x.descricao))
          : t === 'botao' ? regs.find(x => /pulsador/i.test(x.descricao)) || regs.find(x => !/emerg/i.test(x.descricao))
            : regs[0];
      return r ? medida(r) : tipica(fab, t === 'ihm' ? `IHM ${pol}" 24 Vcc` : `${({ comutador: 'comutador', sinaleiro: 'sinaleiro', botao: 'botão' })[t]} Ø 22 mm`);
    },
  };
}

function montarCena(calc, dados = {}) {
  const { c, layout, barr: b, aut } = calc;
  const env = layout.involucro;
  const W = env.largura, H = env.altura, D = env.profundidade;
  const ESP = 2; // chapa do invólucro e da porta (quadro.js)
  const placa = layout.placa;
  const x0 = (W - placa.largura) / 2, yB = (H - placa.altura) / 2;
  const Yw = (yDown) => yB + placa.altura - yDown; // y "da placa para baixo" → y do mundo (para cima)
  const zFrente = Z_PLACA + ESP_PLACA;
  const IC = catalogoInfra(dados);
  const pctf = (v) => `${Math.round(v * 100)} %`;
  const caixas = [];
  const add = (o) => { caixas.push(o); return o; };
  const dica = (tag, desc, l, a, p) => `${curto(`${tag} — ${desc}`)} · ${mm(l, a, p)}`;
  add({ camada: 'placa', x: x0, y: yB, z: Z_PLACA, l: placa.largura, a: placa.altura, p: ESP_PLACA, cor: '#e6e1d6', rotulo: `Placa de montagem ${placa.altura} × ${placa.largura} mm`, semEtiqueta: true,
    info: [['Peça', 'Placa de montagem do invólucro'], ['Medidas A × L × E', mm(placa.altura, placa.largura, ESP_PLACA)], ['Afastamento do fundo', `${Z_PLACA} mm`], ['Área ocupada por dispositivos', pctf(calc.espaco.ocupacaoPlaca)], ['Área ocupada por canaletas', pctf(calc.espaco.ocupacaoCanaletas)]] });

  // canaletas (translúcidas): seção L × A do cálculo e o registro do fabricante, quando houver
  const xU = x0 + layout.x0;
  const vE = layout.verticais.esquerda, vD = layout.verticais.direita;
  const comando = aut.ativo || calc.motores.length;
  const canaleta = (o, d, onde) => {
    const k = IC.canaleta(d.largura, d.altura);
    const compr = Math.max(o.l, o.a);
    add({ camada: 'canaletas', ...o, z: zFrente, p: d.altura, cor: '#8d949c', opacidade: 0.35, rotulo: `Canaleta ${d.largura} × ${d.altura} mm`, semEtiqueta: o.a > o.l,
      dica: `Canaleta ${d.largura} × ${d.altura} mm — ${onde} · ${Math.round(compr)} mm`,
      info: infoMedida('', `Canaleta de fiação recortada com tampa — ${onde}`, k.m, compr, d.largura, d.altura,
        [['Seção L × A', `${d.largura} × ${d.altura} mm`], ['Comprimento', `${Math.round(compr)} mm`], ['Ocupação pelos cabos', d.ocupacao ? `${pctf(d.ocupacao)} (máx. ${T.OCUPACAO_CANALETA * 100} %)` : '—'],
          ...(k.equivalente ? [['Equivalente no catálogo', k.equivalente]] : [])]) });
  };
  const xH0 = x0 + T.MARGEM_UTIL + vE.largura, xH1 = x0 + placa.largura - T.MARGEM_UTIL - vD.largura;
  for (const h of layout.horizontais) canaleta({ x: xH0, y: Yw(h.y + h.largura), l: xH1 - xH0, a: h.largura }, h, `horizontal, ${ZONA_CANALETA[h.zona] || h.zona}`);
  const yV0 = T.MARGEM_UTIL, yV1 = placa.altura - T.MARGEM_UTIL;
  canaleta({ x: x0 + T.MARGEM_UTIL, y: Yw(yV1), l: vE.largura, a: yV1 - yV0 }, vE, 'vertical esquerda (potência)');
  canaleta({ x: x0 + placa.largura - T.MARGEM_UTIL - vD.largura, y: Yw(yV1), l: vD.largura, a: yV1 - yV0 }, vD, `vertical direita (${comando ? 'comando e sinais' : 'potência'})`);

  // réguas de bornes: cada borne com a largura real (catálogo ou típica), PE verde-amarelo, reserva e postes
  const partesBornes = {};
  layout.fileiras.forEach(f => f.itens.forEach(k => { if (k.tipo === 'bornes') partesBornes[k.ref] = (partesBornes[k.ref] || 0) + 1; }));
  const seqBornes = {};
  const sequencia = (g) => {
    const els = [{ poste: true, w: T.BORNE_POSTE_MM }];
    for (const it of g.itens) {
      for (let q = 0; q < it.quantidade; q++) els.push({ w: it.largura, secao: it.secao, circuito: it.circuito });
      for (let q = 0; q < (it.pe || 0); q++) els.push({ w: it.largura, secao: it.secao, circuito: it.circuito, pe: true });
    }
    const n = els.length - 1;
    const media = els.slice(1).reduce((s, e) => s + e.w, 0) / Math.max(1, n);
    for (let q = 0; q < g.reserva; q++) els.push({ w: media, reserva: true });
    els.push({ poste: true, w: T.BORNE_POSTE_MM });
    let pos = 0, num = 0;
    els.forEach(e => { e.pos = pos; pos += e.w; if (!e.poste) e.n = ++num; });
    return { els, ini: 0, parte: 0, total: num };
  };
  const medBorne = (g, s) => (g.medidas || []).find(x => Number(x.secao) === Number(s));
  const txtBorne = (md) => (!md ? '' : md.origem === 'catalogo' ? `${md.fabricante} ${md.referencia}, ${n1(md.largura_mm)} mm` : `${n1(md.largura_mm)} mm (típica [CONFERIR])`);
  const infoRegua = (g) => {
    const porSecao = {};
    g.itens.forEach(i => { porSecao[i.secao] = (porSecao[i.secao] || 0) + i.quantidade; });
    const nPe = g.itens.reduce((s, i) => s + (i.pe || 0), 0);
    return [['TAG', g.id], ['Régua', g.funcao], ['Bornes', `${g.total} + ${g.reserva} de reserva = ${g.total + g.reserva}`],
      ...Object.entries(porSecao).sort((x, y) => Number(x[0]) - Number(y[0])).map(([s, q]) => [`Borne ${String(s).replace('.', ',')} mm²`, `${q} un — ${txtBorne(medBorne(g, s))}`]),
      ...(nPe ? [['Borne terra (PE)', `${nPe} un verde-amarelo`]] : []),
      ['Medidas da régua L × A × P', mm(g.comprimento, g.altura || T.BORNE_ALTURA, g.prof || 50)], ['Postes/batentes', `2 × ${T.BORNE_POSTE_MM} mm`]];
  };

  const mTrilho = IC.trilho();
  layout.fileiras.forEach((f, iF) => {
    const yc = f.y + f.altura / 2;
    if (f.trilho) {
      add({ camada: 'trilhos', x: xU, y: Yw(yc + 17.5), z: zFrente, l: layout.larguraUtil, a: 35, p: ALTURA_TRILHO, cor: '#b8bcc2', metal: true, rotulo: `Trilho DIN 35 × 7,5 mm — ${Math.round(layout.larguraUtil)} mm`, semEtiqueta: true,
        info: infoMedida('', 'Trilho DIN TS35 × 7,5 mm perfurado (EN 60715)', mTrilho, layout.larguraUtil, 35, ALTURA_TRILHO, [['Fileira', `${iF + 1} — ${f.zonas.map(z => layout.rotuloZona[z] || z).join(' / ')}`], ['Comprimento', `${Math.round(layout.larguraUtil)} mm`]]) });
    }
    const zBase = zFrente + (f.trilho ? ALTURA_TRILHO : 0);
    for (const k of f.itens) {
      const h = k.altura || T.DIN_ALTURA;
      const yTop = f.y + (f.altura - h) / 2;
      const x = xU + k.x;
      if (k.tipo === 'reserva') {
        add({ camada: 'reserva', tag: 'RES', x, y: Yw(yTop + h), z: zBase, l: k.largura, a: h, p: 60, cor: '#c9a227', opacidade: 0.16, rotulo: k.largura >= 40 ? 'RESERVA' : 'Reserva', semEtiqueta: k.largura < 40,
          info: [['Reserva', k.descricao], ['Espaço', `${n1(k.largura)} mm (${k.modulos || Math.round(k.largura / T.MODULO_MM)} módulos)`]] });
        continue;
      }
      if (k.tipo === 'barramento') {
        const nb = b.nBarras;
        const rot = ['L1', 'L2', 'L3'].slice(0, c.nFases).concat(nb > c.nFases ? ['N'] : []);
        const nAp = Math.max(2, b.apoiosQtd || 2);
        const conjunto = b.fase ? `${c.nFases} × ${b.fase.l} × ${b.fase.e} mm Cu${nb > c.nFases ? ` + N ${(b.neutro || b.fase).l} × ${(b.neutro || b.fase).e} mm` : ''}` : '—';
        for (let i = 0; i < nb; i++) {
          const bi = rot[i] === 'N' ? (b.neutro || b.fase) : b.fase;
          const larg = bi ? bi.l : 20, esp = bi ? bi.e : 5;
          const ycb = yTop + 10 + i * c.entreFases + c.entreFases / 2;
          add({ camada: 'barramentos', tag: 'BARR', x, y: Yw(ycb + larg / 2), z: zFrente + ALTURA_ISOLADOR, l: k.largura, a: larg, p: esp, cor: rot[i] === 'N' ? '#3a6ed8' : '#c87533', metal: true, rotulo: `${rot[i]} ${larg}×${esp}`,
            dica: `Barramento ${rot[i]} — barra de cobre ${larg} × ${esp} mm · ${Math.round(k.largura)} mm`,
            info: [['TAG', 'BARR'], ['Barramento', `${rot[i]} — barra de cobre eletrolítico ${larg} × ${esp} mm (${larg * esp} mm²)`], ['Conjunto', conjunto], ['Medidas L × A × P', mm(k.largura, larg, esp)],
              ['Capacidade corrigida', b.capacidade ? `${Math.round(b.capacidade)} A (k2 = ${String(Math.round(b.k2 * 1000) / 1000).replace('.', ',')})` : '—'], ['Suportabilidade', `Icw ${b.icw} kA / ${c.tempoIcw} s`],
              ['Apoios', `${nAp} isoladores por barra, a cada ${c.apoios} mm`], ['Entre fases', `${c.entreFases} mm`], ['Norma', 'DIN 43671 (capacidade); NBR IEC 61439-1']] });
          for (let a = 0; a < nAp; a++) {
            const xa = x + (k.largura - 30) * a / (nAp - 1);
            add({ camada: 'barramentos', x: xa, y: Yw(ycb + 15), z: zFrente, l: 30, a: 30, p: ALTURA_ISOLADOR, cor: '#7a2f2a', forma: 'cilindro', semBorda: true, rotulo: 'Isolador de barramento', semEtiqueta: true,
              info: [['Peça', 'Isolador suporte de barramento (epóxi/poliéster) M8'], ['Medidas Ø × h', mm(30, ALTURA_ISOLADOR)], ['Esforço por apoio', b.dinamico ? `≥ ${Math.round(b.dinamico.forcaApoio)} N (estimativa)` : '—']] });
          }
        }
        continue;
      }
      if (k.tipo === 'barra_neutro' || k.tipo === 'barra_pe') {
        const pe = k.tipo === 'barra_pe';
        const nCirc = calc.circuitos.length + calc.motores.length;
        const nN = calc.circuitos.filter(x => x.neutro).length;
        const secao = pe ? `Cu ${b.pe.l} × ${b.pe.e} mm (${b.pe.l * b.pe.e} mm²)` : (b.neutro ? `Cu ${b.neutro.l} × ${b.neutro.e} mm` : `≥ ${n1(b.secaoNeutro)} mm² (seção do neutro)`);
        add({ camada: 'barramentos', tag: k.ref, x, y: Yw(yTop + h * 0.75), z: zFrente + 30, l: k.largura, a: h * 0.5, p: 6, cor: pe ? '#4caf50' : '#3a6ed8', metal: true,
          rotulo: k.parte > 1 ? `${pe ? 'PE' : 'N'} (cont.)` : (pe ? `PE ${b.pe.l}×${b.pe.e}` : 'N'),
          dica: `${k.ref} — barra de ${pe ? 'terra (PE)' : 'neutro (N)'} ${secao} · ${Math.round(k.largura)} mm`,
          info: [['TAG', k.ref], ['Barra', pe ? 'Terra (PE), verde-amarelo' : 'Neutro (N) isolado, azul'], ['Seção', secao],
            ['Terminais', String(pe ? nCirc + Math.ceil(nCirc * c.reservaPct) + 4 : nN + Math.ceil(nN * c.reservaPct) + 2)], ['Medidas L × A × P', mm(k.largura, h * 0.5, 6)], ['Norma', pe ? 'NBR 5410, Tabela 58; 6.1.5.3.2' : 'NBR 5410, 6.1.5.3.1']] });
        [x + 5, x + k.largura - 25].forEach(xa => add({ camada: 'barramentos', x: xa, y: Yw(yTop + h * 0.75), z: zFrente, l: 20, a: h * 0.5, p: 30, cor: '#7a2f2a', semBorda: true, rotulo: 'Isolador da barra', semEtiqueta: true }));
        continue;
      }
      if (k.tipo === 'bornes') {
        const g = k.grupoBornes;
        const sq = seqBornes[g.id] || (seqBornes[g.id] = sequencia(g));
        const ultima = ++sq.parte >= (partesBornes[g.id] || 1);
        const hB = g.altura || h, pB = g.prof || 47;
        // faixa de identificação da régua (porta-etiquetas) acima dos bornes
        add({ camada: 'bornes', tag: g.id, x, y: Yw(yTop - 3), z: zFrente, l: k.largura, a: 8, p: 2, cor: '#d8c27a', rotulo: `${g.id}${k.parte > 1 ? ' (cont.)' : ` · ${g.total}+${g.reserva} bornes`}`,
          dica: `${g.id} — ${g.funcao}`, info: infoRegua(g) });
        for (const e of sq.els) {
          if (e.pos < sq.ini - 1e-6 || (!ultima && e.pos >= sq.ini + k.largura - 1e-6)) continue;
          const md = e.secao != null ? medBorne(g, e.secao) : null;
          const nome = e.poste ? 'Poste/batente de fim de régua' : e.reserva ? 'Borne de reserva' : e.pe ? `Borne terra (PE) ${String(e.secao).replace('.', ',')} mm²` : `Borne de passagem ${String(e.secao).replace('.', ',')} mm²`;
          const desc = `${nome}${e.circuito ? ` — circ. ${e.circuito}` : ''}`;
          add({ camada: 'bornes', tag: g.id, x: x + e.pos - sq.ini, y: Yw(yTop + hB), z: zBase, l: e.w * 0.94, a: e.poste ? hB * 0.8 : hB, p: e.poste ? pB * 0.75 : pB, semBorda: true,
            cor: e.poste ? '#3c4148' : e.pe ? '#57b35a' : e.reserva ? '#c8cdd3' : (e.n % 2 ? '#a7afb8' : '#98a1ab'),
            rotulo: e.poste ? `${g.id} — poste` : `${g.id}:${e.n}`, semEtiqueta: true, dica: `${e.poste ? g.id : `${g.id}:${e.n}`} — ${desc} · ${n1(e.w)} mm`,
            info: [['Régua', `${g.id} — ${g.funcao}`], ...(e.poste ? [] : [['Borne', `${e.n} de ${sq.total}`]]), ['Peça', desc], ['Largura', `${n1(e.w)} mm`], ...(md ? [['Modelo', txtBorne(md)]] : []), ['Medidas da régua L × A × P', mm(g.comprimento, hB, pB)]] });
        }
        sq.ini += k.largura;
        continue;
      }
      const camada = CAMADA_TIPO(k.tipo);
      if (k.filhos) {
        const mot = calc.motores.find(m => m.tag === k.motor);
        // faixa de identificação do conjunto de partida (TAG do motor) acima dos dispositivos
        add({ camada, tag: k.ref, x, y: Yw(yTop - 3), z: zFrente, l: k.largura, a: 8, p: 2, cor: '#d8c27a', rotulo: k.ref, dica: dica(k.ref, k.descricao, k.largura, h, k.prof || T.DIN_PROF),
          info: [['TAG', k.ref], ['Conjunto', k.descricao], ['Dispositivos', k.filhos.map(fh => `${k.ref}/${fh.ref}`).join(', ')], ['Medidas do conjunto L × A × P', mm(k.largura, h, k.prof || T.DIN_PROF)],
            ['Origem das medidas', k.medida && k.medida.origem === 'catalogo' ? 'catálogo do fabricante' : k.medida && k.medida.origem === 'parcial' ? 'parte do catálogo, parte típica [CONFERIR]' : 'típicas [CONFERIR]']] });
        for (const fh of k.filhos) {
          const disp = mot && mot.partidaInfo.dispositivos.find(d => d.ref === fh.ref);
          const nome = NOME_FILHO[fh.tipoCatalogo] || fh.ref;
          const desc = `${nome} — partida ${k.motor}${disp && disp.especificacao ? `: ${disp.especificacao}` : disp && disp.nominal_a ? `: ${disp.nominal_a} A ${disp.categoria || ''}`.trimEnd() : ''}`;
          const tag = `${k.ref}/${fh.ref}`;
          add({ camada, tag, x: x + fh.x, y: Yw(yTop + fh.y + fh.h), z: zBase, l: fh.l, a: fh.h, p: fh.p || T.DIN_PROF, cor: COR[fh.ref] || '#7f9fbf', rotulo: tag, dica: dica(tag, nome, fh.l, fh.h, fh.p || T.DIN_PROF),
            info: infoMedida(tag, desc, fh.medida, fh.l, fh.h, fh.p || T.DIN_PROF) });
        }
        continue;
      }
      add({ camada, tag: k.ref, x, y: Yw(yTop + h), z: zBase, l: k.largura, a: h, p: k.prof || T.DIN_PROF, cor: COR[k.tipo] || '#e9ecef', rotulo: k.ref, dica: dica(k.ref, k.descricao, k.largura, h, k.prof || T.DIN_PROF),
        info: infoMedida(k.ref, k.descricao, k.medida, k.largura, h, k.prof || T.DIN_PROF) });
      // pente logo acima dos bornes superiores (antes ficava DENTRO do corpo do disjuntor e não aparecia)
      if (b.tipo === 'pente' && (k.tipo === 'disjuntor' || k.tipo === 'ddr') && f.zonas.includes('distribuicao')) {
        add({ camada: 'barramentos', tag: 'PENTE', x, y: Yw(yTop - 1), z: zBase + 25, l: k.largura, a: 7, p: 12, cor: '#c87533', metal: true, semBorda: true, rotulo: `Pente ${c.nFases}P ${b.pente.a} A`, semEtiqueta: true,
          info: [['Peça', `Barramento tipo pente ${c.nFases}P ${b.pente.a} A (${b.pente.s} mm²)`], ['Fileiras com pente', String(Math.max(1, b.fileirasPente || 1))], ['Suportabilidade ao curto', 'pelo fabricante, com o disjuntor a montante']] });
      }
    }
  });

  // entrada de cabos: flange removível com prensa-cabos na face do arranjo (faixa livre na placa)
  const sup = c.entradaCabos === 'superior';
  const fl = { l: Math.max(160, Math.min(W - 120, W * 0.6)), p: Math.max(60, Math.min(D - 40, D * 0.6)) };
  const xf = (W - fl.l) / 2, zf = (D - fl.p) / 2;
  const nCabos = 1 + calc.circuitos.length + calc.motores.length + (aut.ativo ? 2 : 0);
  add({ camada: 'entrada', tag: 'FLANGE', x: xf, y: sup ? H - 4 : -1, z: zf, l: fl.l, a: 5, p: fl.p, cor: '#4a5058', rotulo: `Flange de entrada de cabos (${c.entradaCabos})`, semEtiqueta: true,
    info: [['Peça', `Flange removível de entrada de cabos — ${c.entradaCabos}`], ['Medidas L × P', mm(fl.l, fl.p)], ['Prensa-cabos', `${nCabos} (entrada + saídas) com vedação ${calc.inv.ip} — quantidade ilustrativa, diâmetros pelos cabos [CONFERIR]`], ['Faixa livre na placa', `${ENTRADA_CABOS} mm para a chegada dos cabos`]] });
  const porFila = Math.max(1, Math.floor((fl.l - 20) / 34));
  const filas = Math.min(2, Math.ceil(nCabos / porFila));
  for (let i = 0; i < Math.min(nCabos, porFila * filas); i++) {
    const d = i === 0 ? 30 : 20;
    const col = i % porFila, lin = Math.floor(i / porFila);
    add({ camada: 'entrada', x: xf + 10 + col * 34 + (34 - d) / 2, y: sup ? H - 4 - 16 : 4, z: zf + fl.p * (filas === 1 ? 0.5 : lin ? 0.7 : 0.3) - d / 2, l: d, a: 16, p: d, cor: '#23262b', semBorda: true,
      rotulo: i === 0 ? 'Prensa-cabos da entrada (alimentador)' : 'Prensa-cabos de saída', semEtiqueta: true });
  }

  // porta
  const PT = posicoesPorta(calc);
  const porta = [
    { x: PT.placa.x, y: PT.placa.y, l: PT.placa.l, a: PT.placa.a, p: 2, cor: '#f4f1e8', rotulo: c.tag, info: [['Placa de identificação', c.tag], ['Conjunto', `${c.vff}/${c.vfn} V, In ${calc.geral.In} A, Icc ${c.icc} kA, ${calc.inv.ip}`], ['Norma', 'NBR IEC 61439-1, 6.1']] },
    { x: PT.aviso.x, y: PT.aviso.y, l: PT.aviso.l, a: PT.aviso.a, p: 1.5, cor: '#f2c94c', rotulo: 'Advertência NR-10', semEtiqueta: true, info: [['Advertência', 'PERIGO — risco de choque elétrico (NR-10)']] },
    { x: PT.fecho.x, y: PT.fecho.y, l: PT.fecho.l, a: PT.fecho.a, p: 18, cor: '#2b2d31', semBorda: true, rotulo: 'Fecho da porta', semEtiqueta: true, info: [['Peça', 'Fecho/manopla da porta (modelo do invólucro)'], ['Medidas L × A', mm(PT.fecho.l, PT.fecho.a)]] },
  ];
  // corpo do dispositivo por dentro da porta (blocos de contato, IHM, ventilador)
  const porDentro = (cx, cy, l, a, p, cor = '#2b2e33') => porta.push({ x: cx - l / 2, y: cy - a / 2, z: -(ESP + p), l, a, p, cor, semBorda: true });
  if (PT.ihm) {
    const mI = IC.porta('ihm', aut.ihm);
    const cat = mI.origem === 'catalogo';
    const l = cat ? mI.l : PT.ihm.l, a = cat ? mI.a : PT.ihm.a, p = cat && mI.p ? mI.p : 40;
    const cx = PT.ihm.x + PT.ihm.l / 2, cy = PT.ihm.y + PT.ihm.a / 2;
    porta.push({ tag: 'IHM', x: cx - l / 2, y: cy - a / 2, l, a, p: 8, cor: '#111214', rotulo: PT.ihm.rotulo, dica: dica('IHM', `IHM touch ${aut.ihm}" 24 Vcc`, l, a, p),
      info: infoMedida('IHM', `IHM touch ${aut.ihm}" 24 Vcc, Ethernet — recorte na porta`, mI, l, a, p) },
    { x: cx - l / 2 + l * 0.07, y: cy - a / 2 + a * 0.1, l: l * 0.86, a: a * 0.8, p: 9, cor: '#1f4f7a', semBorda: true });
    porDentro(cx, cy, l * 0.9, a * 0.9, p);
  }
  PT.botoes.forEach((bt, i) => {
    const mB = IC.porta(bt.tipo);
    const pB = mB.origem === 'catalogo' && mB.p ? mB.p : 50;
    const tag = `${bt.tipo}:${i + 1}`;
    if (bt.tipo === 'emergencia') porta.push({ x: bt.cx - 32, y: bt.cy - 32, l: 64, a: 64, p: 2, cor: '#f2c94c', semBorda: true });
    porta.push({ x: bt.cx - (bt.d + 10) / 2, y: bt.cy - (bt.d + 10) / 2, l: bt.d + 10, a: bt.d + 10, p: 6, cor: '#b0b4ba', forma: 'cilindro', semBorda: true });
    porta.push({ tag, x: bt.cx - bt.d / 2, y: bt.cy - bt.d / 2, l: bt.d, a: bt.d, p: bt.tipo === 'emergencia' ? 26 : 14, cor: COR_PORTA[bt.tipo] || '#999', forma: 'cilindro', rotulo: bt.rotulo, dica: `${bt.rotulo} — ${curto(bt.descricao, 50)}`,
      info: infoMedida('', bt.descricao, mB, mB.origem === 'catalogo' ? mB.l : bt.d, mB.origem === 'catalogo' ? mB.a : bt.d, pB,
        [['Função', bt.rotulo], ['Cor', bt.cor || '—'], ['Furação', 'Ø 22,3 mm'], ['Norma', 'NBR IEC 60204-1 (10.2, 10.3, 10.7) [CONFERIR]']]) });
    porDentro(bt.cx, bt.cy, 30, 30, pB - 10);
  });
  if (calc.term.ventilacao) {
    const tv = calc.term.ventilacao;
    const mV = IC.ventilacao(tv.ventilador);
    for (const g of PT.grelhas) {
      const fan = /VENTILADOR/i.test(g.rotulo);
      const m = fan ? mV.ventilador : mV.filtro;
      const cat = m.origem === 'catalogo';
      const l = cat ? m.l : g.l, a = cat ? m.a : g.a, p = cat && m.p ? m.p : fan ? 55 : 15;
      const cx = g.x + g.l / 2, cy = g.y + g.a / 2;
      const tag = fan ? 'VENTILADOR' : 'FILTRO';
      porta.push({ tag, x: cx - l / 2, y: cy - a / 2, l, a, p: 12, cor: '#5b6068', rotulo: g.rotulo.split(' (')[0], dica: dica(tag, g.rotulo, l, a, p),
        info: infoMedida(tag, fan ? `Ventilador com filtro ${tv.ventilador} m³/h (vazão livre), ${c.vfn} Vca` : 'Grelha de saída com filtro (sem motor)', m, l, a, p,
          [['Ventilação', g.rotulo], ['Vazão necessária', `${n1(tv.vazao)} m³/h (com filtro: ${tv.ventilador} × ${T.EFICIENCIA_FILTRO})`], ['Comando', 'termostato de painel (NA) 0–60 °C — na lista de materiais']]) });
      porDentro(cx, cy, l * 0.85, a * 0.85, p, '#3a3f46');
    }
  }

  const qtd = {};
  caixas.forEach(x => { if (x.info) qtd[x.camada] = (qtd[x.camada] || 0) + 1; });
  const e = calc.espaco;
  const meds = [...calc.comps.lista.flatMap(k => (k.filhos ? k.filhos.map(f => f.medida) : [k.medida])), ...calc.born.flatMap(g => g.medidas || [])];
  const nCat = meds.filter(m => m && m.origem === 'catalogo').length;
  // legenda com o tipo e a medida da infraestrutura
  const secoesCan = [...new Set([...layout.horizontais, vE, vD].map(d => `${d.largura} × ${d.altura}`))];
  const mCan = Object.values(layout.canaletasMetros).reduce((s, v) => s + v, 0);
  const mTri = layout.fileiras.filter(f => f.trilho).length * layout.larguraUtil / 1000;
  const txtBarr = b.tipo === 'barra' ? !b.fase ? 'barras sem seção que atenda [CONFERIR]' : `${c.nFases} × ${b.fase.l} × ${b.fase.e} mm Cu${b.nBarras > c.nFases ? ` + N ${(b.neutro || b.fase).l} × ${(b.neutro || b.fase).e}` : ''}, PE ${b.pe.l} × ${b.pe.e} mm`
    : `pente ${c.nFases}P ${b.pente.a} A (${b.pente.s} mm²), PE ${b.pe.l} × ${b.pe.e} mm`;
  const rotCamada = {
    barramentos: `Barramentos — ${txtBarr}`,
    bornes: calc.born.length ? `Réguas de bornes — ${calc.born.map(g => `${g.id} (${g.total}+${g.reserva})`).join(', ')}` : 'Réguas de bornes (nenhuma neste quadro)',
    canaletas: `Canaletas — ${secoesCan.join(', ')} mm`,
    trilhos: `Trilhos DIN 35 × 7,5 mm — ${layout.fileiras.filter(f => f.trilho).length} × ${Math.round(layout.larguraUtil)} mm`,
    entrada: `Entrada de cabos (${c.entradaCabos}) — flange e prensa-cabos`,
    placa: `Placa de montagem ${placa.altura} × ${placa.largura} mm`,
  };
  return {
    tipo: 'quadro', titulo: `${c.tag} — ${c.tipoRotulo}`, cliente: dados.cliente?.nome || '', obra: dados.obra?.nome || '',
    data: dados.meta?.data ? String(dados.meta.data).split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR'),
    involucro: { L: W, A: H, P: D, espessura: ESP, cor: '#d4d2cc', rotulo: `Invólucro ${H} × ${W} × ${D} mm`,
      info: [['Invólucro', `${({ sobrepor: 'De sobrepor', embutir: 'De embutir', autoportante: 'Autoportante' })[c.montagem] || c.montagem} — ${({ aco: 'chapa de aço pintada', inox: 'aço inox', aluminio: 'alumínio', poliester: 'poliéster' })[c.material] || c.material}`],
        ['Medidas A × L × P', mm(H, W, D)], ['Grau de proteção', `${calc.inv.ip} / ${calc.inv.ik}`], ['Forma de separação', calc.inv.formaTexto || calc.inv.forma], ['Norma', 'NBR IEC 61439-1/-2; NBR IEC 60529; NBR IEC 62262']] },
    porta: { itens: porta, rotulo: 'Porta frontal', info: [['Porta', 'Frontal, articulada à esquerda, com fecho'], ['Medidas A × L', mm(H, W)], ['Dispositivos na porta', String(PT.botoes.length + (PT.ihm ? 1 : 0) + PT.grelhas.length)]] },
    portaAberta: true, caixas,
    camadas: CAMADAS.map(cm => ({ ...cm, rotulo: rotCamada[cm.id] || cm.rotulo, qtd: qtd[cm.id] != null ? qtd[cm.id] : null })),
    numeros: [
      ['invólucro A × L × P (mm)', `${H} × ${W} × ${D}`], ['placa de montagem (mm)', `${placa.altura} × ${placa.largura}`],
      ['área da placa com dispositivos', pctf(e.ocupacaoPlaca)], ['trilho ocupado', pctf(e.ocupacaoTrilho)],
      ['reserva (módulos)', String(e.reservaModulos)], ['ar no topo (cálculo)', `${n1(calc.term.tTopo)} °C`],
      ['medidas de fabricante', `${nCat} de ${meds.length} dispositivos`], ['fileiras', String(layout.fileiras.length)],
      // valores curtos: a grade de números tem duas colunas estreitas (o texto completo vai na legenda)
      b.tipo !== 'barra' ? ['barramento', `pente ${b.pente.a} A`] : ['barra de fase Cu (mm)', b.fase ? `${b.fase.l} × ${b.fase.e}` : '—'],
      ['canaletas / trilho DIN (m)', `${n1(mCan)} / ${n1(mTri)}`],
    ],
    avisos: [
      'Medidas dos dispositivos: catálogo do fabricante quando há registro; senão típicas [CONFERIR].',
      'Barramentos, canaletas e fiação em posição esquemática; a fiação não é desenhada.',
      'Prensa-cabos em quantidade ilustrativa (um por cabo de entrada/saída); diâmetros pelos cabos [CONFERIR].',
    ],
  };
}

const CSS_QUADRO = `
#etiquetas{position:fixed;inset:0;pointer-events:none;z-index:2;overflow:hidden}
.etq-q{position:absolute;left:0;top:0;padding:1px 5px;border-radius:4px;background:rgba(12,13,16,.78);border:1px solid rgba(201,162,39,.55);color:#fff;font-size:10.5px;white-space:nowrap}
.etq-dica{position:fixed;z-index:7;pointer-events:none;border-color:var(--ouro);font-size:12px}
#camadas .leg{padding:5px 2px}
#info table{width:100%;border-collapse:collapse;font-size:12px}#info th{color:var(--suave);font-weight:500;text-align:left;vertical-align:top;padding:3px 6px 3px 0;width:38%}
#info td{padding:3px 0;word-break:break-word}#info a{color:var(--ouro2)}#info .tag{display:block;font-size:16px;color:var(--ouro2);margin-bottom:6px}#info small{color:var(--suave)}
`;

function gerarHtml(calc, dados = {}) {
  const cena = montarCena(calc, dados);
  const esc = V.escapeHtml;
  const logo = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '..', '..', '..', '_comum', 'assets', 'logo-pequeno.png')).toString('base64')}`;
  const meta = [[cena.cliente && `Cliente: <b>${esc(cena.cliente)}</b>`, cena.obra && `Obra: <b>${esc(cena.obra)}</b>`].filter(Boolean).join(' · '), `gerado em ${esc(cena.data)}`].filter(Boolean).join('<br>');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(cena.titulo)} — modelo 3D — H&amp;M Engenharia</title>
<style>${V.CSS}${CSS_QUADRO}</style>
</head>
<body>
<canvas id="tela"></canvas>
<div id="etiquetas"></div>
<header>
  <img src="${logo}" alt="H&amp;M">
  <div><div class="marca">${esc(EMPRESA.nomeFantasia)}</div><h1>${esc(cena.titulo)} — modelo 3D</h1></div>
  <div class="meta">${meta}</div>
</header>
<nav id="barra">
  <button id="b-3d" title="Perspectiva">Vista 3D</button>
  <button id="b-frente" title="Vista de frente">Vista frontal</button>
  <button id="b-porta" title="Abrir ou fechar a porta">Porta aberta</button>
  <button id="b-sem-porta" title="Esconder a porta">Ocultar porta</button>
  <button id="b-involucro" title="Esconder a caixa do quadro">Ocultar invólucro</button>
  <button id="b-placa" title="Só a placa de montagem, de frente">Só a placa</button>
  <button id="b-etiquetas">Etiquetas</button>
  <button id="b-tela">Tela cheia</button>
</nav>
<aside>
  <section><h2>Números do quadro</h2><div id="numeros"></div></section>
  <section><h2>Camadas</h2><div id="camadas"></div></section>
  <section><h2>Dispositivo</h2><div id="info"><small>Clique num dispositivo para ver TAG, fabricante, referência e medidas.</small></div></section>
</aside>
<footer>
  <span class="aviso">Ilustração — não substitui o desenho de fabricação.</span>
  <details><summary>Premissas do modelo</summary><ul>${cena.avisos.map(p => `<li>${esc(p)}</li>`).join('')}</ul></details>
  <span class="comandos">arraste para girar · roda para zoom · botão direito para mover · clique num dispositivo para ver os dados</span>
</footer>
<div id="semwebgl"><div><h2>Seu navegador não abriu o 3D (WebGL desligado).</h2><p>Abra este arquivo no Chrome, Edge ou Firefox atualizados.</p></div></div>
<script>window.CENA=${V.jsonSeguro(cena)};document.querySelectorAll('aside h2').forEach(function(h){h.onclick=function(){h.parentNode.classList.toggle('fechada')}});
if(innerWidth<=900)document.querySelectorAll('aside section').forEach(function(s){s.classList.add('fechada')});
function hmLayout(){var h=document.querySelector('header'),n=document.querySelector('#barra'),a=document.querySelector('aside');n.style.top=(h.offsetHeight+6)+'px';if(innerWidth>900)a.style.top=(n.offsetTop+n.offsetHeight+8)+'px'}addEventListener('resize',hmLayout);addEventListener('load',hmLayout);hmLayout();</script>
<script>${V.lerBundle()}</script>
</body>
</html>
`;
}

module.exports = { montarCena, gerarHtml, CAMADAS };
