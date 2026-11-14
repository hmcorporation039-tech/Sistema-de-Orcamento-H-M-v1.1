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

module.exports = { cenaDoPainel, dadosDoRack, cenaDoRack, dadosDaCentral, cenaDaCentral, U, CONFERIR };
