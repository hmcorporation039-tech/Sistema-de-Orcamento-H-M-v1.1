// VISTA INTERNA DO PAINEL de cada disciplina (pedido do usuário em 09/11/2026: "isso é apenas
// uma descrição de uma disciplina, mas deve ser replicada a todas sempre"). O "quadro" de cada
// disciplina é o painel, rack ou central dela; a vista interna é movida por DADOS:
//   painel = { tipo, tag, titulo, involucro: { L, A, P, rotulo, info },
//              pecas: [{ id, camada, x, y, z, l, a, p, cor, rotulo, dica, ficha: [{ campo, valor, fonte, conferir }],
//                        equipamento?, acendeEm?, corAceso? }],
//              conexoes: [{ id, funcao, camada, cor, d_mm, pts: [[x, y, z]], de, para, energia }],
//              equipamentos: [contrato `interacao` de ./interacao.js], camadas, numeros, avisos }
// e vira a cena do visualizador de quadro (../cad/visualizador3d/quadro.js: caixas + condutores).
// O quadro elétrico usa ./painelQuadro.js; aqui o RACK (cabeamento/CFTV) e a CENTRAL DE
// INCÊNDIO, a partir do que as skills já calculam (skills/cabeamento, skills/cftv,
// skills/incendio) ou, no 3D do projeto sem o cálculo da skill, da contagem dos pontos do
// projeto. Medidas de catálogo não estão no projeto: ilustrativas e marcadas [CONFERIR].
// JS puro, sem DOM (Node e bundle).
const { comPerfil } = require('./interacao');

const CONFERIR = '[CONFERIR] — não consta no projeto';
const U = 44.45; // 1U (EIA-310)
const LARGURA_19 = 482.6;
const lin = (campo, valor, fonte) => (valor != null && valor !== '' ? { campo, valor: String(valor), fonte: fonte || 'projeto', conferir: false } : { campo, valor: CONFERIR, fonte: '—', conferir: true });
const ilustr = (campo, valor) => ({ campo, valor: String(valor), fonte: 'medida típica de catálogo (ilustrativa) [CONFERIR]', conferir: true });

// painel genérico → cena do visualizador de quadro
function cenaDoPainel(p) {
  return {
    tipo: 'quadro', painel: p.tipo, titulo: p.titulo || p.tag, involucro: { espessura: 2, cor: '#2d3036', ...p.involucro },
    porta: { itens: p.porta || [], rotulo: 'Porta', info: [['Porta', p.tipo === 'rack' ? 'porta frontal com visor (ilustrativa)' : 'porta frontal (ilustrativa)']] },
    portaAberta: true,
    caixas: p.pecas.map(x => ({ ...x, info: x.info || [] })),
    condutores: p.conexoes || [],
    equipamentos: p.equipamentos || [], equipamentosPainel: p.equipamentosPainel || (p.equipamentos || []).filter(e => (e.interacao?.acoes || []).length).map(e => e.id),
    camadas: p.camadas || [], numeros: p.numeros || [], avisos: p.avisos || [],
  };
}

// ── RACK (cabeamento estruturado e CFTV) ────────────────────────────────────
// dadosDoRack({ cabeamento, cftv, contagem, tag, equipamentoSwitch }):
//   cabeamento: um pavimento do cálculo da skill (paineisPorFd, switchesPorFd, pontosPorFd, rackU)
//               + portasPainel/portasSwitch do cálculo (padrão da skill: 24 / 48);
//   cftv: o cálculo da skill cftv (switches, nCam, hds, canais, poeComMargem, rack: { alturaU, profundidade });
//   contagem: { pontosRede, aps, cameras } — pontos do projeto no 3D (sem o cálculo da skill).
function dadosDoRack({ cabeamento = null, cftv = null, contagem = null, tag = 'RACK', equipamentoSwitch = null, portasPainel = 24, portasSwitch = null } = {}) {
  const fonteCab = cabeamento ? 'cálculo da skill cabeamento (NBR 14565)' : null;
  const fonteCftv = cftv ? 'cálculo da skill cftv' : null;
  const pontosDados = cabeamento ? Number(cabeamento.pontosPorFd) || 0 : (contagem ? (Number(contagem.pontosRede) || 0) + (Number(contagem.aps) || 0) : 0);
  const cams = cftv ? Number(cftv.nCam) || 0 : contagem ? Number(contagem.cameras) || 0 : 0;
  const pp = Number(portasPainel) || 24;
  const ps = Number(portasSwitch) || (cabeamento ? 48 : 24);
  const fontePortas = cabeamento || cftv ? 'padrão da skill (portas por patch panel/switch)' : 'padrão da skill cabeamento/cftv (24 portas) [CONFERIR]';
  const nPP = cabeamento ? Number(cabeamento.paineisPorFd) || 0 : Math.ceil(pontosDados / pp);
  const nPPcam = cams ? Math.ceil(cams / pp) : 0;
  const nSW = cabeamento ? Number(cabeamento.switchesPorFd) || 0 : Math.ceil(pontosDados / ps);
  const nSWcam = cftv ? Number(cftv.switches) || 0 : cams ? Math.ceil((cams + 2) / 24) : 0;
  const alturaU = Number(cftv?.rack?.alturaU) || Number(cabeamento?.rackU) || null;
  return {
    tag, equipamentoSwitch, alturaU, alturaFonte: alturaU ? (fonteCftv && cftv?.rack?.alturaU ? fonteCftv : fonteCab) : null,
    profundidade: Number(cftv?.rack?.profundidade) || null,
    patchPanels: [
      ...Array.from({ length: nPP }, (_, i) => ({ id: `PP${i + 1}`, portas: pp, usadas: Math.max(0, Math.min(pp, pontosDados - i * pp)), uso: 'dados', fonte: fonteCab || 'contagem dos pontos de rede do projeto' })),
      ...Array.from({ length: nPPcam }, (_, i) => ({ id: `PP${nPP + i + 1}`, portas: pp, usadas: Math.max(0, Math.min(pp, cams - i * pp)), uso: 'cftv', fonte: fonteCftv || 'contagem das câmeras do projeto' })),
    ],
    switches: [
      ...Array.from({ length: nSW }, (_, i) => ({ id: `SW${i + 1}`, portas: ps, usadas: Math.max(0, Math.min(ps, pontosDados - i * ps)), poe: !!(cabeamento ? cabeamento.aps : contagem?.aps), uso: 'dados', fonte: fonteCab || 'contagem dos pontos de rede do projeto' })),
      ...Array.from({ length: nSWcam }, (_, i) => ({ id: `SW${nSW + i + 1}`, portas: 24, usadas: Math.max(0, Math.min(24, cams - i * 22)), poe: true, uso: 'cftv', fonte: fonteCftv || 'contagem das câmeras do projeto', poe_w: cftv?.poeComMargem ? Math.ceil(cftv.poeComMargem / Math.max(1, nSWcam)) : null })),
    ],
    nvr: cams ? { canais: Number(cftv?.canais) || null, hds: Number(cftv?.hds) || null, fonte: fonteCftv || null } : null,
    fontePortas,
  };
}

function cenaDoRack(d) {
  const pecas = [], conexoes = [];
  // ordem de cima para baixo: (patch panel + organizador) e (switch + organizador) alternados; NVR; régua
  const pares = [];
  const ppDados = d.patchPanels.filter(p => p.uso === 'dados'), ppCam = d.patchPanels.filter(p => p.uso === 'cftv');
  const swDados = d.switches.filter(s => s.uso === 'dados'), swCam = d.switches.filter(s => s.uso === 'cftv');
  const bloco = (pps, sws) => { for (const p of pps) pares.push({ tipo: 'pp', x: p }, { tipo: 'org' }); for (const s of sws) pares.push({ tipo: 'sw', x: s }, { tipo: 'org' }); };
  bloco(ppDados, swDados);
  bloco(ppCam, swCam);
  if (d.nvr) pares.push({ tipo: 'nvr' }, { tipo: 'vazio' });
  pares.push({ tipo: 'bandeja' }, { tipo: 'regua' });
  const usadoU = pares.reduce((s, p) => s + (p.tipo === 'nvr' ? 2 : p.tipo === 'bandeja' ? 2 : 1), 0);
  const alturaU = d.alturaU || Math.max(12, Math.ceil((usadoU + 4) / 2) * 2);
  const L = 600, P = d.profundidade || 600;
  const A = Math.round(alturaU * U + 160);
  const x0 = (L - LARGURA_19) / 2, zf = P - 60;
  let yTopo = A - 80;
  const equipamentos = [];
  const swEquip = (s) => (d.equipamentoSwitch && s.uso === 'cftv' ? d.equipamentoSwitch : `${d.tag}:${s.id}`);
  for (const s of d.switches) {
    const id = swEquip(s);
    if (!equipamentos.some(e => e.id === id)) equipamentos.push(comPerfil({ id, tipo: 'cftv_switch', rotulo: `Switch ${s.id}${s.poe ? ' PoE' : ''} (${s.portas} portas)` }, 'cftv_switch'));
  }
  const posPorta = new Map(); // `${id}:${i}` → [x, y, z]
  const portas = (dono, n, usadas, y, h, cor, equip) => {
    const passo = Math.min(14.5, (LARGURA_19 - 60) / Math.max(1, Math.ceil(n / (n > 24 ? 2 : 1))));
    const filas = n > 24 ? 2 : 1, porFila = Math.ceil(n / filas);
    for (let i = 0; i < n; i++) {
      const f = Math.floor(i / porFila), c = i % porFila;
      const x = x0 + 30 + c * passo, yy = y + h / 2 + (filas === 2 ? (f ? -9 : 9) : 0) - 5.5;
      const usada = i < usadas;
      pecas.push({ camada: 'portas', x, y: yy, z: zf + 2, l: 11.5, a: 11, p: 3, cor: usada ? cor : '#5b616b', semBorda: true, semEtiqueta: true, rotulo: `${dono.id}:${i + 1}`,
        dica: `${dono.id} porta ${i + 1} — ${usada ? 'usada no projeto' : 'livre (reserva)'}`, ...(equip && usada ? { equipamento: equip, acendeEm: ['energizado'], corAceso: '#2fbf5a' } : {}) });
      posPorta.set(`${dono.id}:${i}`, [x + 5.75, yy + 5.5, zf + 5]);
    }
  };
  for (const p of pares) {
    const nU = p.tipo === 'nvr' || p.tipo === 'bandeja' ? 2 : 1, h = nU * U;
    const y = yTopo - h;
    if (p.tipo === 'pp') {
      pecas.push({ camada: 'equipamentos', x: x0, y, z: zf - 25, l: LARGURA_19, a: h - 2, p: 27, cor: '#3b3f46', rotulo: p.x.id, dica: `${p.x.id} — patch panel ${p.x.portas} portas (${p.x.usadas} usadas)`,
        ficha: [lin('Patch panel', `${p.x.id} — ${p.x.uso === 'cftv' ? 'câmeras (CFTV)' : 'pontos de rede'}`, p.x.fonte), lin('Portas', `${p.x.portas}`, d.fontePortas), lin('Portas usadas', `${p.x.usadas}`, p.x.fonte), lin('Categoria / modelo', null), ilustr('Altura', '1U (44,45 mm)')] });
      portas(p.x, p.x.portas, p.x.usadas, y, h, '#3a7bd5', null);
    } else if (p.tipo === 'sw') {
      const eq = swEquip(p.x);
      pecas.push({ camada: 'equipamentos', x: x0, y, z: zf - 300, l: LARGURA_19, a: h - 2, p: 302, cor: '#23272e', rotulo: p.x.id, equipamento: eq, dica: `${p.x.id} — switch ${p.x.portas} portas${p.x.poe ? ' PoE' : ''}`,
        ficha: [lin('Switch', `${p.x.id}${p.x.poe ? ' — PoE' : ''}`, p.x.fonte), lin('Portas', `${p.x.portas}`, d.fontePortas), lin('Portas usadas', `${p.x.usadas}`, p.x.fonte),
          ...(p.x.poe_w ? [lin('Orçamento PoE', `≥ ${p.x.poe_w} W`, 'cálculo da skill cftv (+20 %)')] : []), lin('Modelo', null), ilustr('Altura', '1U')] });
      portas(p.x, p.x.portas, p.x.usadas, y, h, '#2a2e35', eq);
    } else if (p.tipo === 'org') {
      pecas.push({ camada: 'organizadores', x: x0, y: y + 4, z: zf - 10, l: LARGURA_19, a: h - 8, p: 40, cor: '#16181c', semEtiqueta: true, rotulo: 'Organizador horizontal 1U', dica: 'Organizador horizontal de cabos 1U', ficha: [lin('Organizador', 'horizontal 1U', 'regra da skill cabeamento (um por patch panel/switch)')] });
    } else if (p.tipo === 'nvr') {
      pecas.push({ camada: 'equipamentos', x: x0 + 20, y, z: zf - 330, l: LARGURA_19 - 40, a: h - 4, p: 330, cor: '#1c2128', rotulo: 'NVR', dica: 'NVR (gravador de vídeo em rede)',
        ficha: [lin('NVR', 'gravador de vídeo em rede', d.nvr.fonte || 'contagem das câmeras do projeto'), lin('Canais', d.nvr.canais, d.nvr.fonte), lin('Discos (HD)', d.nvr.hds, d.nvr.fonte), ilustr('Altura', '2U (bandeja)')] });
    } else if (p.tipo === 'bandeja') {
      pecas.push({ camada: 'organizadores', x: x0, y, z: zf - 400, l: LARGURA_19, a: 4, p: 400, cor: '#30343b', semEtiqueta: true, rotulo: 'Bandeja', dica: 'Bandeja fixa 19"', ficha: [lin('Bandeja', 'fixa 19"', 'skill cabeamento (régua/bandeja 2U)')] });
    } else if (p.tipo === 'regua') {
      pecas.push({ camada: 'energia', x: x0, y, z: zf - 60, l: LARGURA_19, a: h - 4, p: 60, cor: '#111316', rotulo: 'Régua de energia', dica: 'Régua de energia 19" 1U', ficha: [lin('Régua de energia', '19" 1U', 'skill cabeamento'), lin('Tomadas / circuito', null)] });
    }
    p.y = y; p.h = h;
    yTopo = y;
  }
  // cordões: porta usada do patch panel → porta do switch (U pela frente)
  const ligar = (pps, sws, cor, funcao) => {
    let iSw = 0, iPorta = 0;
    for (const pp of pps) {
      for (let i = 0; i < pp.usadas; i++) {
        const sw = sws[iSw];
        if (!sw) break;
        const a = posPorta.get(`${pp.id}:${i}`), b = posPorta.get(`${sw.id}:${iPorta}`);
        if (a && b) {
          const zfrente = zf + 22 + (i % 4) * 4;
          conexoes.push({ id: `${pp.id}.${i + 1}-${sw.id}.${iPorta + 1}`, funcao, camada: 'cordoes', cor, d_mm: 5.5, pts: [a, [a[0], a[1] - 8, zfrente], [b[0], b[1] + 8, zfrente], b],
            de: `${pp.id} porta ${i + 1}`, para: `${sw.id} porta ${iPorta + 1}`, energia: { tipo: 'equipamento', id: swEquip(sw) }, conferir: ['cor e comprimento do cordão não constam no projeto (ilustrativo)'] });
        }
        if (++iPorta >= sw.usadas || iPorta >= sw.portas) { iSw++; iPorta = 0; }
      }
    }
  };
  ligar(ppDados, swDados, '#4f8fe6', 'dados');
  ligar(ppCam, swCam, '#e8a33d', 'dados');
  const camadas = [
    { id: 'equipamentos', rotulo: 'Equipamentos (patch panel, switch, NVR)', cor: '#3b3f46' },
    { id: 'portas', rotulo: 'Portas (usadas em cor)', cor: '#3a7bd5' },
    { id: 'cordoes', rotulo: 'Cordões (patch cords)', cor: '#4f8fe6' },
    { id: 'organizadores', rotulo: 'Organizadores e bandeja', cor: '#16181c' },
    { id: 'energia', rotulo: 'Régua de energia', cor: '#111316' },
  ];
  return cenaDoPainel({
    tipo: 'rack', tag: d.tag, titulo: `${d.tag} — rack 19" ${alturaU}U`,
    involucro: { L, A, P, cor: '#2d3036', rotulo: `Rack ${alturaU}U`, info: [['Rack', `19" ${alturaU}U`], ['Altura útil', d.alturaU ? `${d.alturaU}U (${d.alturaFonte})` : `${alturaU}U — ${CONFERIR}`], ['Largura × profundidade', `${L} × ${P} mm (típicas) [CONFERIR]`]] },
    pecas, conexoes, equipamentos, camadas,
    numeros: [['patch panels', String(d.patchPanels.length)], ['switches', String(d.switches.length)], ['portas usadas', String(d.patchPanels.reduce((s, p) => s + p.usadas, 0))]],
    avisos: ['Rack montado com a quantidade do projeto/skill; modelos, cores dos cordões e medidas são ilustrativos [CONFERIR].'],
  });
}

// ── CENTRAL DE INCÊNDIO (NBR 17240) ─────────────────────────────────────────
// dadosDaCentral({ calculo (skill incendio), contagem: { detectores, acionadores, avisadores }, equipamentoCentral })
const BATERIA_DIM = [{ ate: 7, l: 151, a: 100, p: 65 }, { ate: 12, l: 151, a: 101, p: 98 }, { ate: 18, l: 181, a: 167, p: 77 }, { ate: 26, l: 166, a: 125, p: 175 }, { ate: 1e9, l: 197, a: 170, p: 165 }];
function dadosDaCentral({ calculo = null, contagem = null, tag = 'CENTRAL', equipamentoCentral = null } = {}) {
  const c = calculo || {};
  const fonteCalc = calculo ? 'cálculo da skill incendio (NBR 17240)' : null;
  const nDet = calculo ? c.nDet : contagem?.detectores ?? null;
  const nAc = calculo ? c.nAc : contagem?.acionadores ?? null;
  const nAv = calculo ? c.nAv : contagem?.avisadores ?? null;
  const tipo = c.tipoSistema || null;
  const circuitos = tipo === 'enderecavel' ? Number(c.lacos) || null : tipo === 'convencional' ? Number(c.zonas) || null : null;
  return {
    tag, equipamentoCentral, tipo, circuitos, nomeCircuito: tipo === 'convencional' ? 'Zona' : 'Laço',
    fonte: fonteCalc || 'contagem dos dispositivos do projeto', nDet, nAc, nAv,
    bateriaAh: c.bateria?.bateriaEscolhida || null, fonteA: c.bateria?.fonteA || null,
  };
}
function cenaDaCentral(d) {
  const pecas = [], conexoes = [];
  const L = 420, A = 520, P = 140;
  const idC = d.equipamentoCentral || `${d.tag}:CENTRAL`;
  const equipamentos = d.equipamentoCentral ? [] : [comPerfil({ id: idC, tipo: 'inc_central', rotulo: `Central ${d.tag}` }, 'inc_central', { entradas: [] })];
  const fonte = d.fonte;
  // placa da central (CPU) e display
  pecas.push({ camada: 'central', x: 40, y: 280, z: 20, l: 340, a: 200, p: 8, cor: '#1f6b3a', rotulo: 'Placa da central', equipamento: idC, semTinta: true,
    ficha: [lin('Central', d.tipo ? (d.tipo === 'enderecavel' ? 'endereçável' : 'convencional') : null, fonte), lin(`${d.nomeCircuito}s`, d.circuitos, fonte),
      lin('Detectores', d.nDet, fonte), lin('Acionadores manuais', d.nAc, fonte), lin('Avisadores', d.nAv, fonte), lin('Fonte (A)', d.fonteA, fonte), lin('Modelo', null)] });
  pecas.push({ camada: 'central', x: 120, y: 410, z: 28, l: 180, a: 50, p: 4, cor: '#0e1a12', rotulo: 'Display', semEtiqueta: true, dica: 'Display da central', equipamento: idC });
  // LEDs: alarme (vermelho), normal (verde), silenciado (âmbar)
  [['ALARME', '#e5484d', ['alarme']], ['NORMAL', '#3fb950', ['normal', 'energizado']], ['SILENCIADO', '#f2c94c', ['alerta']]].forEach(([r, cor, quando], i) => {
    pecas.push({ camada: 'central', x: 120 + i * 65, y: 375, z: 28, l: 14, a: 14, p: 6, cor, rotulo: r, dica: `LED ${r}`, equipamento: idC, acendeEm: quando, corAceso: cor, semBorda: true });
  });
  // bornes dos laços/zonas e da saída de avisadores (régua na base da placa)
  const nCirc = d.circuitos || 1;
  const xb = 50;
  for (let i = 0; i < nCirc; i++) {
    const x = xb + i * 40;
    pecas.push({ camada: 'bornes', x, y: 290, z: 28, l: 34, a: 18, p: 14, cor: '#c9a227', rotulo: `${d.nomeCircuito} ${i + 1}`, dica: `${d.nomeCircuito} ${i + 1} — bornes + / −`,
      ficha: [lin(d.nomeCircuito, `${i + 1} de ${d.circuitos ?? '?'}`, d.circuitos ? fonte : '—'), lin('Dispositivos', d.circuitos && d.nDet != null ? `até o limite do ${d.nomeCircuito.toLowerCase()} (${(d.nDet || 0) + (d.nAc || 0)} no total)` : null, fonte), lin('Cabo', null)] });
    conexoes.push({ id: `L${i + 1}`, funcao: 'laco', camada: 'lacos', cor: '#d23a2a', d_mm: 6, pts: [[x + 17, 290, 35], [x + 17, 250, 60], [x + 17, 20, 60], [x + 17, 0, 60]], de: `${d.nomeCircuito} ${i + 1} (bornes)`, para: 'campo (detectores e acionadores)',
      energia: { tipo: 'equipamento', id: idC }, conferir: ['cabo blindado 2 × 1,5 mm² é a estimativa da skill incendio — a cor e o tipo do cabo não constam no projeto'] });
  }
  const xs = xb + nCirc * 40 + 10;
  pecas.push({ camada: 'bornes', x: xs, y: 290, z: 28, l: 40, a: 18, p: 14, cor: '#d23a2a', rotulo: 'Saída de avisadores', equipamento: idC, acendeEm: ['alarme'], corAceso: '#ff4b3e', dica: 'Saída dos avisadores (sirenes)' });
  conexoes.push({ id: 'SAV', funcao: 'avisadores', camada: 'lacos', cor: '#ff7a59', d_mm: 6, pts: [[xs + 20, 290, 35], [xs + 20, 240, 70], [xs + 20, 0, 70]], de: 'saída de avisadores', para: 'avisadores audiovisuais', energia: { tipo: 'equipamento', id: idC } });
  // fonte e baterias (2 × 12 V em série = 24 V)
  pecas.push({ camada: 'alimentacao', x: 250, y: 160, z: 20, l: 130, a: 90, p: 50, cor: '#9aa3ad', rotulo: 'Fonte 24 Vcc', ficha: [lin('Fonte', d.fonteA ? `${String(d.fonteA).replace('.', ',')} A` : null, fonte), lin('Tensão', '24 Vcc', 'NBR 17240 (centrais de 24 Vcc) — conferir com o fabricante')] });
  const dim = BATERIA_DIM.find(b => (d.bateriaAh || 7) <= b.ate);
  for (let i = 0; i < 2; i++) {
    const x = 40 + i * (dim.l + 15);
    pecas.push({ camada: 'alimentacao', x, y: 25, z: 20, l: dim.l, a: dim.a, p: Math.min(dim.p, P - 30), cor: '#2b2e33', rotulo: `Bateria ${i + 1} 12 V`,
      ficha: [lin('Bateria', d.bateriaAh ? `12 V ${d.bateriaAh} Ah (par em série = 24 V)` : null, d.bateriaAh ? fonte : null), ilustr('Medidas', `${dim.l} × ${dim.a} × ${dim.p} mm`)] });
  }
  const b1 = 40 + dim.l, b2 = 40 + dim.l + 15;
  conexoes.push({ id: 'BAT-S', funcao: 'bateria', camada: 'bateria', cor: '#202226', d_mm: 4, pts: [[b1 - 15, 25 + dim.a, 40], [b1 - 15, 25 + dim.a + 15, 40], [b2 + 15, 25 + dim.a + 15, 40], [b2 + 15, 25 + dim.a, 40]], de: 'bateria 1 (−)', para: 'bateria 2 (+) — série', energia: { tipo: 'terra' } });
  conexoes.push({ id: 'BAT+', funcao: 'bateria', camada: 'bateria', cor: '#d62828', d_mm: 4, pts: [[55, 25 + dim.a, 40], [55, 25 + dim.a + 40, 45], [260, 205, 45], [260, 290, 30]], de: 'bateria 1 (+)', para: 'placa da central (BAT +)', energia: { tipo: 'terra' } });
  return cenaDoPainel({
    tipo: 'central_incendio', tag: d.tag, titulo: `${d.tag} — central de detecção e alarme de incêndio`,
    involucro: { L, A, P, cor: '#b3261e', rotulo: `Central ${d.tag}`, info: [['Central', d.tag], ['Gabinete', `${L} × ${A} × ${P} mm (típico) [CONFERIR com o fabricante]`]] },
    pecas, conexoes, equipamentos, equipamentosPainel: [idC],
    camadas: [{ id: 'central', rotulo: 'Placa, display e LEDs', cor: '#1f6b3a' }, { id: 'bornes', rotulo: `Bornes dos ${d.nomeCircuito.toLowerCase()}s e saídas`, cor: '#c9a227' }, { id: 'lacos', rotulo: `Cabos dos ${d.nomeCircuito.toLowerCase()}s e avisadores`, cor: '#d23a2a' }, { id: 'alimentacao', rotulo: 'Fonte e baterias', cor: '#2b2e33' }, { id: 'bateria', rotulo: 'Cabos da bateria', cor: '#d62828' }],
    numeros: [[`${d.nomeCircuito.toLowerCase()}s`, d.circuitos != null ? String(d.circuitos) : '?'], ['detectores', d.nDet != null ? String(d.nDet) : '?'], ['bateria', d.bateriaAh ? `2 × ${d.bateriaAh} Ah` : '?']],
    avisos: ['Central montada com os dados do projeto/skill; gabinete, placa e posição dos bornes são ilustrativos [CONFERIR com o fabricante].'],
  });
}

// ── Peças comuns dos painéis de comando (pressurização, automação) ──────────
const Z_PLACA = 25;
const COR_PECA = { disjuntor: '#e9e9e6', rele: '#d9dde3', temporizador: '#cfd8e6', fonte: '#7b68b5', inversor: '#2f5d8a', soft: '#3e6f8f', borne: '#a7afb8', canaleta: '#8d949c', placa: '#e4e1d8', clp: '#3b4a5a', modulo: '#55606d', switch: '#2b2e33' };
// canaletas: verticais nas laterais e horizontais nas cotas pedidas (y = base da canaleta)
function canaletas(L, A, ys, larg = 30) {
  const out = [
    { camada: 'canaletas', x: 25, y: 40, z: Z_PLACA, l: larg, a: A - 80, p: 60, cor: COR_PECA.canaleta, rotulo: `Canaleta ${larg} × 60 mm`, semEtiqueta: true },
    { camada: 'canaletas', x: L - 25 - larg, y: 40, z: Z_PLACA, l: larg, a: A - 80, p: 60, cor: COR_PECA.canaleta, rotulo: `Canaleta ${larg} × 60 mm`, semEtiqueta: true },
  ];
  for (const y of ys) out.push({ camada: 'canaletas', x: 25 + larg, y, z: Z_PLACA, l: L - 50 - 2 * larg, a: larg, p: 60, cor: COR_PECA.canaleta, rotulo: `Canaleta ${larg} × 60 mm`, semEtiqueta: true });
  return out;
}
// régua de bornes: barra do rótulo + uma peça de 5 mm por borne (a ordem das peças = a ordem da régua)
function regua(tag, x, y, bornes, titulo) {
  const pecas = [{ camada: 'bornes', tag, x, y: y + 64, z: Z_PLACA + 3, l: Math.max(20, bornes.length * 5.4 + 10), a: 8, p: 6, cor: '#f4f1e8', rotulo: `${tag} — ${titulo}`, ficha: [lin('Régua', `${tag} — ${titulo}`, 'painel'), lin('Bornes', `${bornes.length}`, 'painel')] }];
  bornes.forEach((b, i) => pecas.push({ camada: 'bornes', tag, x: x + 5 + i * 5.4, y, z: Z_PLACA + 3, l: 5, a: 60, p: 40, cor: b.cor || COR_PECA.borne, rotulo: `${tag}:${i + 1}`, semEtiqueta: true, dica: `${tag}:${i + 1} — ${b.rotulo}`,
    ficha: [lin('Borne', `${tag}:${i + 1}`, 'painel'), lin('Ligação', b.rotulo, b.fonte || 'painel'), lin('Seção', b.secao ? `${String(b.secao).replace('.', ',')} mm²` : null, b.secao ? 'painel' : null)] }));
  return pecas;
}
// condutor reto por pontos (força e sinais que não passam pela escada)
const cond = (id, funcao, camada, cor, d_mm, pts, de, para, energia, extra = {}) => ({ id, funcao, camada, cor, d_mm, pts: pts.map(p => p.map(v => Math.round(v * 10) / 10)), de, para, energia, ...extra });
// terminal de peça (cima/baixo, coluna col de n)
const termP = (b, col, n, lado, dy = 0) => ({ x: b.x + b.l * (col + 0.5) / Math.max(1, n), y: lado === 'cima' ? b.y + b.a - 9 - dy : b.y + 9 + dy, z: b.z + b.p - 14, lado });

// ── PAINEL DE PRESSURIZAÇÃO DE ESCADAS (NBR 14880; CBMDF NT 10; IT 13 / CBMGO NT 13) ──
// A lógica é a do PERFIL de especificação da skill pressurização (skills/pressurizacao/dados/
// perfil-especificacao.json): os mesmos blocos de função compilados pela mesma escada
// (../especificacao/comando.js) — partida pelo alarme da central, MAN-0-AUT por ventilador,
// reversão para o reserva por falta de fluxo/falha do acionamento, modo TESTE com chave,
// inibição pela fumaça na casa de máquinas e operação/falha para a central. A vista interna abre
// com a simulação da escada (seletoras e sinaleiros na porta, relés na placa) e a fiação de força e
// de comando desenhada (./fiacaoComando.js).
const PERFIL_PRZ = require('../../pressurizacao/dados/perfil-especificacao.json');
const CMD = require('../especificacao/comando');
const FC = require('./fiacaoComando');

// dadosDoPainelPressurizacao({ calculo (skill pressurizacao: arr, al.partida, vent), tag })
function dadosDoPainelPressurizacao({ calculo = null, tag = 'QPE', tempoReversao = null } = {}) {
  const c = calculo || {};
  const fonte = calculo ? 'cálculo da skill pressurização (NBR 14880)' : null;
  const n = Number(c.arr?.n) || null;
  const partida = c.al?.partida?.tipo || c.c?.partida || null;
  return {
    tag, fonte, nVentiladores: n, nUsado: n && n >= 1 ? Math.min(2, n) : 2, partida, partidaUsada: partida || 'inversor',
    cv: c.vent?.cv || null, inA: c.vent?.in ? Math.round(c.vent.in * 10) / 10 : null,
    tempoReversao: tempoReversao ?? PERFIL_PRZ.regras?.variaveis_comando?.tempo_reversao ?? 15,
  };
}

const SINALIZACAO_PRZ = ['painel energizado', 'alarme de incêndio', 'ventilador V1 operando', 'ventilador V2 operando', 'falha V1', 'falha V2', 'modo manual'];
function comandoDaPressurizacao(d) {
  const n = d.nUsado;
  const motores = Array.from({ length: n }, (_, k) => ({ i: k + 1, tag: `V${k + 1}`, rotulo: `Ventilador V${k + 1}`, acion: d.partidaUsada === 'direta' ? null : `U${k + 1}`, acionRotulo: d.partidaUsada === 'soft' ? 'Soft-starter' : 'Inversor de frequência' }));
  const req = ['comando.partida_alarme', 'comando.pressostato_fluxo', 'comando.modo_teste', 'comando.inibicao_fumaca', 'automacao.status_central', 'comando.seletora_man_0_aut', ...(n === 2 ? ['comando.reversao'] : [])];
  const listas = { 'sinalizacao.porta': SINALIZACAO_PRZ.filter(t => n === 2 || !/V2/.test(t)).map(texto => ({ texto })), 'automacao.contatos_livres': [] };
  return CMD.compilarComando({ req: new Set(req), decisoes: {}, combinacao: 'qualquer', motores, externos: [], valvulas: [], rotuloMotor: 'ventilador', rotuloMotores: 'ventiladores', listas, tensaoComando: '24 Vcc', contatosPorRele: 4, variaveis: { tempo_reversao: d.tempoReversao } },
    { usar: (PERFIL_PRZ.blocos?.usar || []).filter(id => id !== 'emergencia_rele') });
}

const COR_PORTA = { seletora: '#202226', seletora_chave: '#202226', botao: '#2f9e44', emergencia: '#d62828', branco: '#f1f1f1', vermelho: '#e5484d', verde: '#3fb950', amarelo: '#f2c94c', azul: '#4c8dff' };
function cenaDoPainelPressurizacao(d) {
  const cmd = comandoDaPressurizacao(d);
  const n = d.nUsado;
  const L = 800, A = 1000, P = 300;
  const fonte = d.fonte || 'perfil de pressurização da H&M (arranjo típico — sem o cálculo da skill) [CONFERIR]';
  const pecas = [{ camada: 'placa', x: 20, y: 20, z: Z_PLACA - 3, l: L - 40, a: A - 40, p: 3, cor: COR_PECA.placa, rotulo: 'Placa de montagem', semEtiqueta: true }];
  pecas.push(...canaletas(L, A, [880, 650, 465, 165]));
  // linha A: geral, comando, fonte, fusível, disjuntores-motor
  const acion = d.partidaUsada === 'soft' ? 'soft' : d.partidaUsada === 'direta' ? 'direta' : 'inversor';
  const Q0 = { camada: 'protecao', tag: 'Q0', x: 80, y: 735, z: Z_PLACA + 8, l: 54, a: 90, p: 75, cor: COR_PECA.disjuntor, rotulo: 'Q0', dica: 'Q0 — disjuntor geral 3P',
    ficha: [lin('Função', 'Disjuntor geral do painel (alimentação exclusiva, antes da chave geral do prédio — NT/IT do CBM)', 'perfil de pressurização'), lin('Polos', '3P', 'perfil de pressurização'), lin('In', null), lin('Icu', null)] };
  const QC1 = { camada: 'protecao', tag: 'QC1', x: 140, y: 735, z: Z_PLACA + 8, l: 36, a: 90, p: 75, cor: COR_PECA.disjuntor, rotulo: 'QC1', dica: 'QC1 — disjuntor do comando 220 Vca', ficha: [lin('Função', 'Proteção do circuito de comando 220 Vca (fonte e sinaleiro de painel energizado)', 'perfil de pressurização'), lin('In', '6 A (padrão do perfil de comando)', 'perfil da especificação')] };
  const G1 = { camada: 'automacao', tag: 'G1', x: 182, y: 735, z: Z_PLACA + 8, l: 54, a: 90, p: 60, cor: COR_PECA.fonte, rotulo: 'G1', dica: 'G1 — fonte 220 Vca / 24 Vcc', ficha: [lin('Função', 'Fonte do comando 24 Vcc (relés, sinaleiros, entradas de campo)', 'perfil da especificação'), lin('Corrente', null), lin('Modelo', null)] };
  const F1 = { camada: 'automacao', tag: 'F1', x: 242, y: 735, z: Z_PLACA + 8, l: 18, a: 90, p: 60, cor: '#e7e2d3', rotulo: 'F1', dica: 'F1 — fusível do comando 24 Vcc', ficha: [lin('Função', 'Fusível do comando (L+)', 'perfil da especificação'), lin('Corrente', '2 A (padrão do perfil de comando)', 'perfil da especificação')] };
  pecas.push(Q0, QC1, G1, F1);
  const dm = [];
  for (let k = 0; k < n; k++) {
    const b = { camada: 'protecao', tag: `V${k + 1}-Q1`, x: 290 + k * 52, y: 735, z: Z_PLACA + 8, l: 45, a: 90, p: 80, cor: COR_PECA.disjuntor, rotulo: `V${k + 1}-Q1`, dica: `V${k + 1}-Q1 — disjuntor-motor do ventilador V${k + 1}`,
      ficha: [lin('Função', `Proteção do ${acion === 'direta' ? 'motor' : acion === 'soft' ? 'soft-starter' : 'inversor'} do ventilador V${k + 1} (curto-circuito)`, fonte), lin('Motor', d.cv ? `${String(d.cv).replace('.', ',')} cv${d.inA ? `, In ≈ ${String(d.inA).replace('.', ',')} A` : ''}` : null, fonte), lin('Faixa', null)] };
    dm.push(b); pecas.push(b);
  }
  // linha B: relés e temporizadores da escada
  let xr = 80;
  const timers = new Set((cmd.modelo.temporizadores || []).map(t => t.tag));
  const rel = new Map();
  for (const r of cmd.reles) {
    const tim = timers.has(r.tag);
    const b = { camada: 'protecao', tag: r.tag, x: xr, y: 525, z: Z_PLACA + 8, l: tim ? 18 : 27, a: tim ? 90 : 80, p: 70, cor: tim ? COR_PECA.temporizador : COR_PECA.rele, rotulo: r.tag, dica: `${r.tag} — ${r.rotulo || ''}`,
      ficha: [lin('Função', r.rotulo, 'escada de relés do perfil de pressurização'), lin('Tipo', tim ? 'temporizador (retardo na energização)' : 'relé auxiliar 4 contatos reversíveis 24 Vcc', 'perfil da especificação'), lin('Contatos usados', (r.usos || []).map(c => `${c.contato} ${c.tipo} → ${c.uso}`).join('; ') || null, 'escada de relés')] };
    rel.set(r.tag, b); pecas.push(b);
    xr += b.l + 4;
  }
  // linha C: acionamentos
  const acs = [];
  for (let k = 0; k < n; k++) {
    if (acion === 'direta') break;
    const inv = acion === 'inversor';
    const b = { camada: 'partidas', tag: `V${k + 1}/T1`, x: 90 + k * 130, y: 205, z: Z_PLACA + 8, l: inv ? 100 : 60, a: inv ? 240 : 150, p: inv ? 170 : 120, cor: inv ? COR_PECA.inversor : COR_PECA.soft, rotulo: `U${k + 1}`, dica: `U${k + 1} — ${inv ? 'inversor de frequência' : 'soft-starter'} do ventilador V${k + 1}`,
      ficha: [lin('Acionamento', inv ? 'Inversor de frequência (PID pela pressão diferencial, relé de falha e saída em funcionamento)' : 'Soft-starter', d.partida ? fonte : 'perfil de pressurização (típico) [CONFERIR]'), lin('Referência', PERFIL_PRZ.regras?.referencias?.[inv ? 'inversor' : 'soft'] || null, 'perfil de pressurização'), lin('Motor', d.cv ? `${String(d.cv).replace('.', ',')} cv` : null, fonte)] };
    acs.push(b); pecas.push(b);
  }
  // linha D: réguas X1 (força dos ventiladores) e X2 (campo — a ordem das conexões da escada)
  const x1 = [];
  for (let k = 0; k < n; k++) for (const f of ['U', 'V', 'W', 'PE']) x1.push({ rotulo: `V${k + 1} ${f}`, cor: f === 'PE' ? '#57b35a' : undefined });
  pecas.push(...regua('X1', 80, 70, x1, 'força dos ventiladores'));
  const x2 = cmd.conexoes.filter(c => c.regua === 'X2').map(c => ({ rotulo: c.rotulo, secao: 1.5 }));
  pecas.push(...regua('X2', 80 + x1.length * 5.4 + 40, 70, x2, 'campo (central, detector, pressostatos)'));
  // força: Q0 → disjuntores-motor → acionamento → X1 (preto, uma linha por fase)
  const conexoes = [];
  const xBorne1 = (i) => 80 + 5 + i * 5.4 + 2.5;
  dm.forEach((b, k) => {
    for (let f = 0; f < 3; f++) {
      const a0 = termP(Q0, f, 3, 'baixo'), b0 = termP(b, f, 3, 'cima');
      conexoes.push(cond(`F:Q0-${b.tag}-${f}`, 'F', 'forca', '#202226', 3.6, [[a0.x, a0.y, a0.z], [a0.x, 712 - f * 4 - k * 12, a0.z + 6], [b0.x, 712 - f * 4 - k * 12, a0.z + 6], [b0.x, b0.y + 30, b0.z]], 'Q0', b.tag, { tipo: 'comando', sinal: 'FN' }));
      const ac = acs[k];
      const dst = ac ? termP(ac, f, 3, 'cima') : { x: xBorne1(k * 4 + f), y: 130, z: Z_PLACA + 40 };
      const a1 = termP(b, f, 3, 'baixo');
      conexoes.push(cond(`F:${b.tag}-${f}`, 'F', 'forca', '#202226', 3.6, [[a1.x, a1.y, a1.z], [a1.x, 690 - f * 4, a1.z + 6], [55 + f * 4 + k * 12, 690 - f * 4, a1.z + 6], [55 + f * 4 + k * 12, dst.y + (ac ? 20 : 0), a1.z + 6], [dst.x, dst.y + (ac ? 20 : 0), dst.z]], b.tag, ac ? `U${k + 1}` : `X1 V${k + 1}`, { tipo: 'comando', sinal: 'FN' }));
      if (ac) {
        const s = termP(ac, f, 3, 'baixo');
        const xb = xBorne1(k * 4 + f);
        conexoes.push(cond(`F:U${k + 1}-X1-${f}`, 'F', 'forca', '#202226', 3.6, [[s.x, s.y, s.z], [s.x, 180 - f * 3, s.z], [xb, 180 - f * 3, s.z], [xb, 130, Z_PLACA + 40]], `U${k + 1} (saída)`, `X1 V${k + 1} ${'UVW'[f]}`, { tipo: 'comando', sinal: `U${k + 1}.RUN` }));
      }
    }
  });
  // porta: seletoras (escada) e sinaleiros
  const porta = [];
  const mapaPorta = [];
  const ctrlPorta = (cmd.porta || []).filter(e => e.porta !== false);
  const porDentro = (cx, cy) => porta.push({ x: cx - 15, y: cy - 15, z: -(2 + 40), l: 30, a: 30, p: 40, cor: '#2b2e33', semBorda: true });
  ctrlPorta.forEach((e, i) => {
    const cx = 110 + i * 110, cy = A - 170;
    const tag = `${e.tipo}:${i + 1}`;
    porta.push({ x: cx - 21, y: cy - 21, l: 42, a: 42, p: 6, cor: '#b0b4ba', forma: 'cilindro', semBorda: true });
    porta.push({ tag, x: cx - 16, y: cy - 16, l: 32, a: 32, p: e.tipo === 'emergencia' ? 26 : 14, cor: COR_PORTA[e.material] || COR_PORTA[e.tipo] || '#202226', forma: 'cilindro', rotulo: e.id, dica: `${e.id} — ${e.rotulo}`,
      info: [['Função', e.rotulo], ['Posições', (e.posicoes || []).join(' · ') || '—'], ['Descrição', e.descricao || '—'], ['Furação', 'Ø 22,3 mm']] });
    porDentro(cx, cy);
    mapaPorta.push({ meshTag: tag, id: e.id });
  });
  cmd.sinaleiros.forEach((s, i) => {
    const cx = 110 + (i % 6) * 100, cy = A - 270 - Math.floor(i / 6) * 80;
    const tag = `sinaleiro_${s.cor}:${i + 1}`;
    porta.push({ x: cx - 17, y: cy - 17, l: 34, a: 34, p: 6, cor: '#b0b4ba', forma: 'cilindro', semBorda: true });
    porta.push({ tag, x: cx - 12, y: cy - 12, l: 24, a: 24, p: 12, cor: COR_PORTA[s.cor] || '#ccc', forma: 'cilindro', rotulo: s.tag, dica: `${s.tag} — ${s.rotulo}`, info: [['Sinaleiro', `${s.tag} — ${s.rotulo}`], ['Cor', s.cor], ['Tensão', s.tensao || '24 Vcc']] });
    porDentro(cx, cy);
    mapaPorta.push({ meshTag: tag, id: s.tag });
  });
  porta.push({ x: 40, y: A - 90, l: 200, a: 50, p: 2, cor: '#f4f1e8', rotulo: d.tag, info: [['Painel', `${d.tag} — comando da pressurização de escada`], ['Norma', 'NBR 14880; NBR IEC 61439-1/-2; CBMDF NT 10 / IT 13 [CONFERIR com o corpo de bombeiros local]']] });
  // o modelo da escada para o visualizador (comandoReles)
  const placa = {};
  for (const r of cmd.reles) placa[r.tag] = r.tag;
  acs.forEach((b, k) => { placa[b.tag] = `U${k + 1}.RUN`; });
  const res = new Map((cmd.verificacao || []).map(v => [v.nome, v]));
  const CR = { modelo: cmd.modelo, interacao: cmd.interacao, cenarios: (cmd.cenarios || []).map(c => ({ nome: c.nome, entradas: c.entradas || {}, passos: c.passos || null, espera: c.espera || {}, ok: res.get(c.nome) ? res.get(c.nome).ok : true, falhas: res.get(c.nome) ? res.get(c.nome).falhas : [] })), porta: mapaPorta, placa };
  const cena = cenaDoPainel({
    tipo: 'pressurizacao', tag: d.tag, titulo: `${d.tag} — painel de comando da pressurização de escada`,
    involucro: { L, A, P, cor: '#d4d2cc', rotulo: `Painel ${d.tag}`, info: [['Painel', d.tag], ['Invólucro', `${A} × ${L} × ${P} mm (A × L × P — típico) [CONFERIR com o arranjo de fabricação]`], ['Lógica', `${cmd.blocos.length} blocos de função, ${cmd.reles.length} relés, ${(cmd.verificacao || []).filter(v => v.ok).length}/${(cmd.verificacao || []).length} cenários simulados`]] },
    porta, pecas, conexoes,
    camadas: [{ id: 'protecao', rotulo: 'Disjuntores, relés e temporizadores', cor: COR_PECA.rele }, { id: 'partidas', rotulo: acion === 'soft' ? 'Soft-starters' : 'Inversores', cor: COR_PECA.inversor }, { id: 'automacao', rotulo: 'Fonte 24 Vcc e fusível', cor: COR_PECA.fonte },
      { id: 'bornes', rotulo: 'Réguas X1 (força) e X2 (campo)', cor: COR_PECA.borne }, { id: 'canaletas', rotulo: 'Canaletas', cor: COR_PECA.canaleta }, { id: 'placa', rotulo: 'Placa de montagem', cor: COR_PECA.placa }, { id: 'forca', rotulo: 'Fiação de força (preto, anilha L1/L2/L3)', cor: '#202226' }],
    numeros: [['ventiladores', String(n)], ['acionamento', acion === 'soft' ? 'soft-starter' : acion === 'direta' ? 'direta' : 'inversor'], ['relés', String(cmd.reles.length)], ['cenários', `${(cmd.verificacao || []).filter(v => v.ok).length}/${(cmd.verificacao || []).length}`], ['reversão', n === 2 ? `${d.tempoReversao} s` : '—']],
    avisos: [
      `Lógica pelo perfil de pressurização da H&M (${cmd.blocos.map(b => b.id || b).join(', ')}): a mesma do projeto pela especificação. ${d.fonte ? '' : 'Sem o cálculo da skill: 2 ventiladores (principal + reserva) com inversor, arranjo típico [CONFERIR].'}`.trim(),
      'Parada só no painel: nenhum botão de emergência desliga os ventiladores durante o alarme (sistema de segurança contra incêndio).',
      'Invólucro, posições e medidas ilustrativos [CONFERIR com o arranjo de fabricação da skill quadros].',
    ],
  });
  cena.comandoReles = CR;
  FC.completarCenaComComando(cena, { motores: Array.from({ length: n }, (_, k) => ({ id: `V${k + 1}`, acion: acion === 'direta' ? null : { tag: `U${k + 1}` } })), comando: { conexoes: cmd.conexoes } });
  return cena;
}

// ── QUADRO DE AUTOMAÇÃO (CLP / controlador DDC) ──────────────────────────────
// dadosDoClp({ calculo (skill automacao: tot { di, do, ai, ao }, reserva, protocolo, controladores),
//              contagem: { sensores, controladores }, tag, equipamentoClp })
// Os pontos vêm do cálculo da skill (lista de pontos com reserva) ou, no 3D sem a skill, da contagem
// dos sensores do projeto (cada sensor = 1 entrada analógica, estimativa [CONFERIR]). Capacidade dos
// módulos (16 DI, 16 DO, 8 AI, 4 AO) é típica de catálogo — ilustrativa [CONFERIR].
const CAP_MODULO = { di: 16, do: 16, ai: 8, ao: 4 };
const NOME_MODULO = { di: 'entradas digitais (DI)', do: 'saídas digitais a relé (DO)', ai: 'entradas analógicas (AI)', ao: 'saídas analógicas (AO)' };
function dadosDoClp({ calculo = null, contagem = null, tag = 'QA', equipamentoClp = null } = {}) {
  const c = calculo || {};
  const nCtrl = Math.max(1, Number(c.controladores) || Number(contagem?.controladores) || 1);
  let pontos = null, fonte = null;
  if (calculo && c.tot) {
    pontos = Object.fromEntries(['di', 'do', 'ai', 'ao'].map(k => [k, Math.ceil((Number(c.tot[k]) || 0) / nCtrl)]));
    fonte = `cálculo da skill automação (lista de pontos${nCtrl > 1 ? `, ÷ ${nCtrl} controladores` : ''})`;
  } else if (contagem && Number(contagem.sensores) > 0) {
    pontos = { di: 0, do: 0, ai: Math.ceil(Number(contagem.sensores) / nCtrl), ao: 0 };
    fonte = 'contagem dos sensores do projeto (1 sensor = 1 entrada analógica — estimativa) [CONFERIR com a lista de pontos]';
  }
  const reserva = c.reserva != null ? Number(c.reserva) : 0.2;
  return { tag, equipamentoClp, pontos, fonte, reserva, protocolo: c.protocolo || null, controladores: nCtrl };
}
function cenaDoClp(d) {
  const pts = d.pontos || { di: 0, do: 0, ai: 0, ao: 0 };
  const res = d.reserva;
  const mods = [];
  for (const k of ['di', 'do', 'ai', 'ao']) {
    const precisa = Math.ceil(pts[k] * (1 + res));
    const nM = precisa ? Math.ceil(precisa / CAP_MODULO[k]) : 0;
    for (let i = 0; i < nM; i++) mods.push({ k, i, usados: Math.max(0, Math.min(CAP_MODULO[k], pts[k] - i * CAP_MODULO[k])), cap: CAP_MODULO[k] });
  }
  const nDo = Math.min(48, pts.do);
  const largMods = 90 + mods.length * 42 + 20;
  const L = Math.max(600, Math.min(1200, Math.ceil((largMods + 160) / 100) * 100));
  const A = 800, P = 250;
  const idC = d.equipamentoClp || `${d.tag}:CLP`;
  const equipamentos = d.equipamentoClp ? [] : [comPerfil({ id: idC, tipo: 'aut_clp', rotulo: `CLP ${d.tag}` }, 'aut_clp', { entradas: [] })];
  const fonte = d.fonte;
  const pecas = [{ camada: 'placa', x: 20, y: 20, z: Z_PLACA - 3, l: L - 40, a: A - 40, p: 3, cor: COR_PECA.placa, rotulo: 'Placa de montagem', semEtiqueta: true }];
  pecas.push(...canaletas(L, A, [720, 560, 360, 175]));
  // linha A: entrada, DPS, fonte, fusível, switch
  const QF1 = { camada: 'alimentacao', tag: 'QF1', x: 80, y: 610, z: Z_PLACA + 8, l: 36, a: 90, p: 75, cor: COR_PECA.disjuntor, rotulo: 'QF1', ficha: [lin('Função', 'Disjuntor de entrada 220 Vca do quadro de automação', 'prática H&M'), lin('In', null)] };
  const DPS = { camada: 'alimentacao', tag: 'FDPS', x: 122, y: 610, z: Z_PLACA + 8, l: 36, a: 90, p: 70, cor: '#e7e2d3', rotulo: 'DPS', ficha: [lin('Função', 'DPS classe II na entrada 220 Vca (NBR 5410, 6.3.5)', 'prática H&M'), lin('Uc / In', null)] };
  const G1 = { camada: 'alimentacao', tag: 'G1', x: 164, y: 610, z: Z_PLACA + 8, l: 54, a: 90, p: 60, cor: COR_PECA.fonte, rotulo: 'G1', ficha: [lin('Função', 'Fonte 24 Vcc do CLP, módulos e campo', 'prática H&M'), lin('Corrente', null), lin('Modelo', null)] };
  const F1 = { camada: 'alimentacao', tag: 'F1', x: 224, y: 610, z: Z_PLACA + 8, l: 18, a: 90, p: 60, cor: '#e7e2d3', rotulo: 'F1', ficha: [lin('Função', 'Fusível do 24 Vcc de campo', 'prática H&M')] };
  const SW = { camada: 'rede', tag: 'SW', x: 260, y: 615, z: Z_PLACA + 8, l: 80, a: 80, p: 50, cor: COR_PECA.switch, rotulo: 'SW', equipamento: idC, ficha: [lin('Função', `Switch industrial (rede do supervisório${d.protocolo ? ` — ${String(d.protocolo).toUpperCase()}` : ''})`, d.protocolo ? fonte : 'prática H&M'), lin('Portas', null)] };
  pecas.push(QF1, DPS, G1, F1, SW);
  // linha B: CPU + módulos
  const CPU = { camada: 'clp', tag: 'CPU', x: 80, y: 400, z: Z_PLACA + 8, l: 90, a: 125, p: 80, cor: COR_PECA.clp, rotulo: 'CPU', equipamento: idC, semTinta: true,
    ficha: [lin('Controlador', `CLP/DDC ${d.tag}${d.controladores > 1 ? ` (1 de ${d.controladores})` : ''}`, fonte || null), lin('Protocolo', d.protocolo ? String(d.protocolo).toUpperCase() : null, fonte), lin('Modelo', null)] };
  pecas.push(CPU);
  pecas.push({ camada: 'clp', x: 92, y: 500, z: Z_PLACA + 88, l: 10, a: 8, p: 3, cor: '#3fb950', rotulo: 'RUN', dica: 'LED RUN', semEtiqueta: true, equipamento: idC, acendeEm: ['energizado'], corAceso: '#3fb950', semBorda: true });
  pecas.push({ camada: 'clp', x: 108, y: 500, z: Z_PLACA + 88, l: 10, a: 8, p: 3, cor: '#e5484d', rotulo: 'ERR', dica: 'LED ERRO/STOP', semEtiqueta: true, equipamento: idC, acendeEm: ['falha', 'aberto'], corAceso: '#e5484d', semBorda: true });
  const pm = [];
  mods.forEach((m, j) => {
    const b = { camada: 'clp', tag: `${m.k.toUpperCase()}${m.i + 1}`, x: 176 + j * 42, y: 400, z: Z_PLACA + 8, l: 40, a: 125, p: 75, cor: COR_PECA.modulo, rotulo: `${m.k.toUpperCase()}${m.i + 1}`, equipamento: idC, semTinta: true,
      ficha: [lin('Módulo', `${m.cap} ${NOME_MODULO[m.k]} (capacidade típica) [CONFERIR com o catálogo]`, 'catálogo típico'), lin('Pontos usados', `${m.usados} de ${m.cap}`, fonte), lin('Reserva', `${m.cap - m.usados} (≥ ${Math.round(res * 100)} % do total pedido pela skill)`, fonte)] };
    pm.push({ ...m, b }); pecas.push(b);
    pecas.push({ camada: 'clp', x: b.x + 14, y: 505, z: Z_PLACA + 83, l: 12, a: 6, p: 3, cor: '#3fb950', semEtiqueta: true, rotulo: `${b.tag} OK`, equipamento: idC, acendeEm: ['energizado'], corAceso: '#3fb950', semBorda: true });
  });
  // linha C: relés de interface das saídas digitais (uma fileira; o que não cabe fica no aviso)
  const rels = [];
  const cabemRel = Math.floor((L - 160) / 18);
  for (let i = 0; i < Math.min(nDo, cabemRel); i++) {
    const b = { camada: 'interface', tag: `KI${i + 1}`, x: 80 + i * 18, y: 230, z: Z_PLACA + 8, l: 16, a: 75, p: 65, cor: COR_PECA.rele, rotulo: i === 0 || i === Math.min(nDo, cabemRel) - 1 ? `KI${i + 1}` : undefined, semEtiqueta: !(i === 0 || i === Math.min(nDo, cabemRel) - 1), dica: `KI${i + 1} — relé de interface da DO${Math.floor(i / 16) + 1}.${(i % 16) + 1}`,
      equipamento: idC, acendeEm: ['energizado'], corAceso: '#9fe0ae', ficha: [lin('Função', `Relé de interface da saída DO${Math.floor(i / 16) + 1}.${(i % 16) + 1} (contato seco para o campo)`, fonte), lin('Bobina', '24 Vcc', 'prática H&M')] };
    rels.push(b); pecas.push(b);
  }
  // linha D: réguas X1 (alimentação) e X2 (E/S de campo)
  pecas.push(...regua('X1', 80, 70, [{ rotulo: 'L (220 Vca)' }, { rotulo: 'N' }, { rotulo: 'PE', cor: '#57b35a' }, { rotulo: '+24 Vcc campo' }, { rotulo: '0 V campo' }], 'alimentação'));
  const x2 = [];
  for (const k of ['di', 'do', 'ai', 'ao']) for (let i = 0; i < pts[k]; i++) x2.push({ rotulo: `${k.toUpperCase()} ${i + 1}`, k, cor: k === 'ai' || k === 'ao' ? '#8f97a3' : undefined });
  const x2v = x2.slice(0, Math.floor((L - 230) / 5.4));
  pecas.push(...regua('X2', 130, 70, x2v, `entradas e saídas de campo (${x2.length} pontos${x2v.length < x2.length ? `, ${x2v.length} desenhados` : ''})`));
  // fiação: alimentação, 24 Vcc, rede, E/S → bornes
  const conexoes = [];
  const t = (b, c, nn, lado) => termP(b, c, nn, lado);
  const via = (a, b, y, z, id, f, cam, cor, dmm, de, para, en) => conexoes.push(cond(id, f, cam, cor, dmm, [[a.x, a.y, a.z], [a.x, y, z], [b.x, y, z], [b.x, b.y, b.z]], de, para, en));
  via(t(QF1, 0, 2, 'baixo'), t(G1, 0, 2, 'cima'), 590, Z_PLACA + 50, 'A:QF1-G1', 'F', 'alimentacao-fios', '#d0342c', 2.6, 'QF1', 'G1 (L)', { tipo: 'terra' });
  via(t(G1, 0, 2, 'baixo'), t(F1, 0, 1, 'cima'), 588, Z_PLACA + 52, 'A:G1-F1', 'cc', 'alimentacao-fios', '#1f5fd1', 2.4, 'G1 +24 V', 'F1', { tipo: 'terra' });
  [CPU, ...pm.map(m => m.b)].forEach((b, j) => {
    via(t(G1, 1, 2, 'baixo'), t(b, 0, 2, 'cima'), 545 - (j % 4) * 3, Z_PLACA + 54, `A:G1-${b.tag}`, 'cc', 'alimentacao-fios', '#1f5fd1', 2.4, 'G1 +24 V / 0 V', `${b.tag} (alimentação)`, { tipo: 'terra' });
  });
  via(t(CPU, 1, 2, 'cima'), t(SW, 0, 2, 'baixo'), 548, Z_PLACA + 58, 'R:CPU-SW', 'rede', 'rede-fios', '#2fae5a', 5, 'CPU (Ethernet)', 'SW', { tipo: 'equipamento', id: idC });
  // borne de campo do ponto g (0…) do tipo k: X2 em ordem DI, DO, AI, AO
  const inicio = {};
  ['di', 'do', 'ai', 'ao'].reduce((s, k) => { inicio[k] = s; return s + pts[k]; }, 0);
  const xBorne = (k, g) => { const n = inicio[k] + g; return n < x2v.length ? 130 + 5 + n * 5.4 + 2.5 : null; };
  for (const m of pm) {
    for (let p = 0; p < m.usados; p++) {
      const g = m.i * m.cap + p;
      const a0 = t(m.b, p % 2, 2, 'baixo');
      const yv = 190 - (p % 5) * 2;
      if (m.k === 'do') {
        const r = rels[g];
        if (!r) continue;
        // DO → bobina do relé de interface; contato do relé → borne de campo
        via(a0, t(r, 0, 1, 'cima'), 345 + (p % 6) * 2, Z_PLACA + 50, `IO:${m.b.tag}-${r.tag}`, 'cc', 'io-fios', '#1f5fd1', 2.2, `${m.b.tag}.${p + 1}`, `${r.tag} (bobina)`, { tipo: 'equipamento', id: idC });
        const xb = xBorne('do', g);
        if (xb == null) continue;
        const c0 = t(r, 0, 1, 'baixo');
        conexoes.push(cond(`IO:${r.tag}-X2`, 'sinal', 'io-fios', '#f08a24', 2.2, [[c0.x, c0.y, c0.z], [c0.x, 186 - (p % 5) * 2, c0.z], [xb, 186 - (p % 5) * 2, c0.z], [xb, 130, Z_PLACA + 40]], `${r.tag} (contato)`, `X2:${inicio.do + g + 1} — DO ${g + 1}`, { tipo: 'equipamento', id: idC }));
        continue;
      }
      const xb = xBorne(m.k, g);
      if (xb == null) continue;
      const an = m.k === 'ai' || m.k === 'ao';
      conexoes.push(cond(`IO:${m.b.tag}-${p + 1}`, 'sinal', 'io-fios', an ? '#8f97a3' : '#f08a24', an ? 3.2 : 2.2,
        [[a0.x, a0.y, a0.z], [a0.x, yv, a0.z], [xb, yv, a0.z], [xb, 130, Z_PLACA + 40]], `${m.b.tag}.${p + 1}`, `X2:${inicio[m.k] + g + 1} — ${m.k.toUpperCase()} ${g + 1}`, { tipo: 'equipamento', id: idC }));
    }
  }
  const totalPts = pts.di + pts.do + pts.ai + pts.ao;
  return cenaDoPainel({
    tipo: 'automacao', tag: d.tag, titulo: `${d.tag} — quadro de automação (CLP/DDC)`,
    involucro: { L, A, P, cor: '#d4d2cc', rotulo: `Quadro ${d.tag}`, info: [['Quadro', d.tag], ['Invólucro', `${A} × ${L} × ${P} mm (A × L × P — típico) [CONFERIR]`], ['Pontos', d.pontos ? `DI ${pts.di} · DO ${pts.do} · AI ${pts.ai} · AO ${pts.ao}` : CONFERIR]] },
    porta: [{ x: 40, y: A - 90, l: 200, a: 50, p: 2, cor: '#f4f1e8', rotulo: d.tag, info: [['Quadro', `${d.tag} — automação`]] }],
    pecas, conexoes, equipamentos, equipamentosPainel: [idC],
    camadas: [{ id: 'clp', rotulo: 'CPU e módulos de E/S', cor: COR_PECA.clp }, { id: 'interface', rotulo: `Relés de interface (${rels.length})`, cor: COR_PECA.rele }, { id: 'alimentacao', rotulo: 'Entrada, DPS, fonte 24 Vcc', cor: COR_PECA.fonte }, { id: 'rede', rotulo: 'Switch de rede', cor: COR_PECA.switch },
      { id: 'bornes', rotulo: 'Réguas X1 (alimentação) e X2 (E/S de campo)', cor: COR_PECA.borne }, { id: 'canaletas', rotulo: 'Canaletas', cor: COR_PECA.canaleta }, { id: 'placa', rotulo: 'Placa de montagem', cor: COR_PECA.placa },
      { id: 'alimentacao-fios', rotulo: 'Fios de alimentação (220 Vca vermelho, 24 Vcc azul)', cor: '#1f5fd1' }, { id: 'io-fios', rotulo: 'Fios de E/S (digital laranja, analógico cinza blindado)', cor: '#f08a24' }, { id: 'rede-fios', rotulo: 'Cabo de rede (Ethernet)', cor: '#2fae5a' }],
    numeros: [['pontos de E/S', d.pontos ? String(totalPts) : '?'], ['módulos', String(mods.length)], ['reserva', `${Math.round(res * 100)} %`], ['relés de interface', String(rels.length)]],
    avisos: [
      d.pontos ? `Pontos: ${fonte}. Módulos com a reserva de ${Math.round(res * 100)} % (lista de pontos da skill automação).` : 'Sem a lista de pontos (nem sensores no projeto): CPU sem módulos — informe os pontos na skill automação. [CONFERIR]',
      'Capacidade dos módulos, invólucro e medidas típicos de catálogo — ilustrativos [CONFERIR com o fabricante do CLP/DDC].',
      'Clique na CPU para colocar em RUN/STOP ou simular a falha da fonte: os LEDs e as saídas acompanham.',
    ],
  });
}

module.exports = { cenaDoPainel, dadosDoRack, cenaDoRack, dadosDaCentral, cenaDaCentral, dadosDoPainelPressurizacao, cenaDoPainelPressurizacao, comandoDaPressurizacao, dadosDoClp, cenaDoClp, U, CONFERIR };
