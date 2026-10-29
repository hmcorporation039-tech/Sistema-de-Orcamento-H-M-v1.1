// Modelo 3D do quadro (documento "modelo3d"): página HTML autossuficiente com o
// mesmo visualizador/three.js de skills/_comum/cad/visualizador3d (cena
// tipo 'quadro', em ./visualizador3d/quadro.js). A cena sai do MESMO arranjo
// do desenho DXF (calc.layout), com as medidas reais de cada dispositivo
// (catálogo do fabricante ou típicas) — invólucro, porta articulada com os
// dispositivos de porta, placa, trilhos, canaletas translúcidas, barramentos
// com isoladores ou pente, barras N/PE, bornes e a reserva "fantasma".
const fs = require('fs');
const path = require('path');
const T = require('./tabelas');
const { posicoesPorta } = require('./porta');
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
  { id: 'reserva', rotulo: 'Reserva', cor: '#c9a227' },
  { id: 'placa', rotulo: 'Placa de montagem', cor: '#e6e1d6' },
];
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

function infoMedida(tag, desc, m, l, a, p) {
  const linhas = [['TAG', tag], ['Dispositivo', desc], ['Medidas L × A × P', `${n1(l)} × ${n1(a)} × ${n1(p)} mm`]];
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

function montarCena(calc, dados = {}) {
  const { c, layout } = calc;
  const env = layout.involucro;
  const W = env.largura, H = env.altura, D = env.profundidade;
  const placa = layout.placa;
  const x0 = (W - placa.largura) / 2, yB = (H - placa.altura) / 2;
  const Yw = (yDown) => yB + placa.altura - yDown; // y "da placa para baixo" → y do mundo (para cima)
  const zFrente = Z_PLACA + ESP_PLACA;
  const caixas = [];
  const add = (o) => { caixas.push(o); return o; };
  add({ camada: 'placa', x: x0, y: yB, z: Z_PLACA, l: placa.largura, a: placa.altura, p: ESP_PLACA, cor: '#e6e1d6' });
  const xU = x0 + layout.x0;
  const vE = layout.verticais.esquerda, vD = layout.verticais.direita;
  // canaletas (translúcidas)
  const xH0 = x0 + T.MARGEM_UTIL + vE.largura, xH1 = x0 + placa.largura - T.MARGEM_UTIL - vD.largura;
  for (const h of layout.horizontais) add({ camada: 'canaletas', x: xH0, y: Yw(h.y + h.largura), z: zFrente, l: xH1 - xH0, a: h.largura, p: h.altura, cor: '#8d949c', opacidade: 0.35 });
  const yV0 = T.MARGEM_UTIL, yV1 = placa.altura - T.MARGEM_UTIL;
  add({ camada: 'canaletas', x: x0 + T.MARGEM_UTIL, y: Yw(yV1), z: zFrente, l: vE.largura, a: yV1 - yV0, p: vE.altura, cor: '#8d949c', opacidade: 0.35 });
  add({ camada: 'canaletas', x: x0 + placa.largura - T.MARGEM_UTIL - vD.largura, y: Yw(yV1), z: zFrente, l: vD.largura, a: yV1 - yV0, p: vD.altura, cor: '#8d949c', opacidade: 0.35 });

  for (const f of layout.fileiras) {
    const yc = f.y + f.altura / 2;
    if (f.trilho) add({ camada: 'trilhos', x: xU, y: Yw(yc + 17.5), z: zFrente, l: layout.larguraUtil, a: 35, p: ALTURA_TRILHO, cor: '#b8bcc2', metal: true });
    const zBase = zFrente + (f.trilho ? ALTURA_TRILHO : 0);
    for (const k of f.itens) {
      const h = k.altura || T.DIN_ALTURA;
      const yTop = f.y + (f.altura - h) / 2;
      const x = xU + k.x;
      if (k.tipo === 'reserva') {
        add({ camada: 'reserva', x, y: Yw(yTop + h), z: zBase, l: k.largura, a: h, p: 60, cor: '#c9a227', opacidade: 0.16, rotulo: k.largura >= 40 ? 'RESERVA' : '',
          info: [['Reserva', k.descricao], ['Espaço', `${n1(k.largura)} mm (${k.modulos || Math.round(k.largura / T.MODULO_MM)} módulos)`]] });
        continue;
      }
      if (k.tipo === 'barramento') {
        const b = calc.barr;
        const nb = b.nBarras;
        const rot = ['L1', 'L2', 'L3'].slice(0, c.nFases).concat(nb > c.nFases ? ['N'] : []);
        const larg = b.fase ? b.fase.l : 20, esp = b.fase ? b.fase.e : 5;
        const nAp = Math.max(2, b.apoiosQtd || 2);
        for (let i = 0; i < nb; i++) {
          const ycb = yTop + 10 + i * c.entreFases + c.entreFases / 2;
          add({ camada: 'barramentos', x, y: Yw(ycb + larg / 2), z: zFrente + ALTURA_ISOLADOR, l: k.largura, a: larg, p: esp, cor: rot[i] === 'N' ? '#3a6ed8' : '#c87533', metal: true, rotulo: rot[i],
            info: [['Barramento', rot[i]], ['Barra', b.fase ? `Cu ${b.fase.l} × ${b.fase.e} mm (${b.secaoFase} mm²)` : '—'], ['Capacidade corrigida', b.capacidade ? `${Math.round(b.capacidade)} A` : '—'], ['Apoios', `a cada ${c.apoios} mm`]] });
          for (let a = 0; a < nAp; a++) {
            const xa = x + (k.largura - 30) * a / (nAp - 1);
            add({ camada: 'barramentos', x: xa, y: Yw(ycb + 15), z: zFrente, l: 30, a: 30, p: ALTURA_ISOLADOR, cor: '#7a2f2a', forma: 'cilindro', semBorda: true });
          }
        }
        continue;
      }
      if (k.tipo === 'barra_neutro' || k.tipo === 'barra_pe') {
        const pe = k.tipo === 'barra_pe';
        add({ camada: 'barramentos', x, y: Yw(yTop + h * 0.75), z: zFrente + 30, l: k.largura, a: h * 0.5, p: 6, cor: pe ? '#4caf50' : '#3a6ed8', metal: true, rotulo: k.parte > 1 ? '' : (pe ? 'PE' : 'N'),
          info: [['Barra', pe ? 'Terra (PE)' : 'Neutro (N)'], ['Seção', pe ? `${calc.barr.pe.l} × ${calc.barr.pe.e} mm` : 'conforme o memorial'], ['Comprimento', `${Math.round(k.largura)} mm`]] });
        [x + 5, x + k.largura - 25].forEach(xa => add({ camada: 'barramentos', x: xa, y: Yw(yTop + h * 0.75), z: zFrente, l: 20, a: h * 0.5, p: 30, cor: '#7a2f2a', semBorda: true }));
        continue;
      }
      if (k.tipo === 'bornes') {
        const g = k.grupoBornes;
        const lm = Math.max(4, (g.comprimento - 2 * T.BORNE_POSTE_MM) / Math.max(1, g.total + g.reserva));
        const nT = Math.floor(k.largura / lm);
        const pPe = (g.itens || []).reduce((s, i) => s + (i.pe || 0), 0);
        for (let i = 0; i < nT; i++) {
          const global = (k.parte > 1 ? 1000 : 0) + i;
          add({ camada: 'bornes', x: x + i * lm, y: Yw(yTop + h), z: zBase, l: lm * 0.92, a: h, p: g.prof || 47, cor: i < pPe && k.parte <= 1 && i % 4 === 3 ? '#57b35a' : (global % 2 ? '#a7afb8' : '#98a1ab'), semBorda: true,
            ...(i === 0 ? { rotulo: `${g.id}${k.parte > 1 ? ' (cont.)' : ''}`, info: [['Régua', g.id], ['Função', g.funcao], ['Bornes', `${g.total} + ${g.reserva} reserva`], ...(g.medidas || []).map(md => [`Borne ${String(md.secao).replace('.', ',')} mm²`, md.origem === 'catalogo' ? `${md.fabricante} ${md.referencia} — ${n1(md.largura_mm)} mm` : `${n1(md.largura_mm)} mm (típica [CONFERIR])`])] } : {}) });
        }
        continue;
      }
      const camada = CAMADA_TIPO(k.tipo);
      if (k.filhos) {
        for (const fh of k.filhos) {
          add({ camada, x: x + fh.x, y: Yw(yTop + fh.y + fh.h), z: zBase, l: fh.l, a: fh.h, p: fh.p || T.DIN_PROF, cor: COR[fh.ref] || '#7f9fbf', rotulo: `${k.ref}/${fh.ref}`,
            info: infoMedida(`${k.ref}/${fh.ref}`, `${k.descricao} — ${fh.ref}`, fh.medida, fh.l, fh.h, fh.p || T.DIN_PROF) });
        }
        continue;
      }
      add({ camada, x, y: Yw(yTop + h), z: zBase, l: k.largura, a: h, p: k.prof || T.DIN_PROF, cor: COR[k.tipo] || '#e9ecef', rotulo: k.ref,
        info: infoMedida(k.ref, k.descricao, k.medida, k.largura, h, k.prof || T.DIN_PROF) });
      if (calc.barr.tipo === 'pente' && (k.tipo === 'disjuntor' || k.tipo === 'ddr') && f.zonas.includes('distribuicao')) {
        add({ camada: 'barramentos', x, y: Yw(yTop + 10), z: zBase + 45, l: k.largura, a: 6, p: 10, cor: '#c87533', metal: true, semBorda: true });
      }
    }
  }
  // porta
  const PT = posicoesPorta(calc);
  const porta = [
    { x: PT.placa.x, y: PT.placa.y, l: PT.placa.l, a: PT.placa.a, p: 2, cor: '#f4f1e8', rotulo: c.tag, info: [['Placa de identificação', c.tag], ['Conjunto', `${c.vff}/${c.vfn} V, In ${calc.geral.In} A, Icc ${c.icc} kA, ${calc.inv.ip}`]] },
    { x: PT.aviso.x, y: PT.aviso.y, l: PT.aviso.l, a: PT.aviso.a, p: 1.5, cor: '#f2c94c', info: [['Advertência', 'PERIGO — risco de choque elétrico (NR-10)']] },
    { x: PT.fecho.x, y: PT.fecho.y, l: PT.fecho.l, a: PT.fecho.a, p: 18, cor: '#2b2d31', semBorda: true },
  ];
  if (PT.ihm) porta.push({ x: PT.ihm.x, y: PT.ihm.y, l: PT.ihm.l, a: PT.ihm.a, p: 8, cor: '#111214', rotulo: PT.ihm.rotulo, info: [['Dispositivo', PT.ihm.rotulo], ['Montagem', 'recorte na porta']] },
    { x: PT.ihm.x + 10, y: PT.ihm.y + 15, l: PT.ihm.l - 20, a: PT.ihm.a - 25, p: 9, cor: '#1f4f7a', semBorda: true });
  for (const b of PT.botoes) {
    if (b.tipo === 'emergencia') porta.push({ x: b.cx - 32, y: b.cy - 32, l: 64, a: 64, p: 2, cor: '#f2c94c', semBorda: true });
    porta.push({ x: b.cx - (b.d + 10) / 2, y: b.cy - (b.d + 10) / 2, l: b.d + 10, a: b.d + 10, p: 6, cor: '#b0b4ba', forma: 'cilindro', semBorda: true });
    porta.push({ x: b.cx - b.d / 2, y: b.cy - b.d / 2, l: b.d, a: b.d, p: b.tipo === 'emergencia' ? 26 : 14, cor: COR_PORTA[b.tipo] || '#999', forma: 'cilindro', rotulo: b.rotulo,
      info: [['Dispositivo', b.descricao], ['Função', b.rotulo], ['Cor', b.cor || '—'], ['Norma', 'NBR IEC 60204-1 (10.2, 10.3, 10.7) [CONFERIR]']] });
  }
  for (const g of PT.grelhas) porta.push({ x: g.x, y: g.y, l: g.l, a: g.a, p: 12, cor: '#5b6068', rotulo: g.rotulo.split(' (')[0], info: [['Ventilação', g.rotulo], ['Ventilador', `${calc.term.ventilacao.ventilador} m³/h com filtro`]] });

  const qtd = {};
  caixas.forEach(b => { if (b.info) qtd[b.camada] = (qtd[b.camada] || 0) + 1; });
  const e = calc.espaco;
  const meds = [...calc.comps.lista.flatMap(k => (k.filhos ? k.filhos.map(f => f.medida) : [k.medida])), ...calc.born.flatMap(g => g.medidas || [])];
  const nCat = meds.filter(m => m && m.origem === 'catalogo').length;
  const pctf = (v) => `${Math.round(v * 100)} %`;
  return {
    tipo: 'quadro', titulo: `${c.tag} — ${c.tipoRotulo}`, cliente: dados.cliente?.nome || '', obra: dados.obra?.nome || '',
    data: dados.meta?.data ? String(dados.meta.data).split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR'),
    involucro: { L: W, A: H, P: D, espessura: 2, cor: '#d4d2cc' }, porta: { itens: porta }, portaAberta: true, caixas,
    camadas: CAMADAS.map(cm => ({ ...cm, qtd: qtd[cm.id] != null ? qtd[cm.id] : null })),
    numeros: [
      ['invólucro A × L × P (mm)', `${H} × ${W} × ${D}`], ['placa de montagem (mm)', `${placa.altura} × ${placa.largura}`],
      ['área da placa com dispositivos', pctf(e.ocupacaoPlaca)], ['trilho ocupado', pctf(e.ocupacaoTrilho)],
      ['reserva (módulos)', String(e.reservaModulos)], ['ar no topo (cálculo)', `${n1(calc.term.tTopo)} °C`],
      ['medidas de fabricante', `${nCat} de ${meds.length} dispositivos`], ['fileiras', String(layout.fileiras.length)],
    ],
    avisos: [
      'Medidas dos dispositivos: catálogo do fabricante quando há registro; senão típicas [CONFERIR].',
      'Barramentos, canaletas e fiação em posição esquemática; a fiação não é desenhada.',
    ],
  };
}

const CSS_QUADRO = `
#etiquetas{position:fixed;inset:0;pointer-events:none;z-index:2;overflow:hidden}
.etq-q{position:absolute;left:0;top:0;padding:1px 5px;border-radius:4px;background:rgba(12,13,16,.78);border:1px solid rgba(201,162,39,.55);color:#fff;font-size:10.5px;white-space:nowrap}
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
