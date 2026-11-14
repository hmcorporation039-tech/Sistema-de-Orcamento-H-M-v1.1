// Desenhos SVG gerados do MODELO do projeto pela especificação (nada desenhado à mão):
//   unifilar(projeto)  — FL01: alimentador, geral, barramento, saídas com proteção, cabo e carga
//   ladder(comando)    — FL02: escada de comando (série/paralelo) com contatos numerados e bobinas
//   layout(layout)     — FL05: vista frontal da porta e vista interna da placa, com cotas
// Coordenadas em "px" de um viewBox; o HTML da folha escala para o espaço do desenho.
// Todo texto passa por escapeHtml (regra do projeto).

const { escapeHtml: e } = require('../base/html');

const COR = { linha: '#1b1b1b', forca: '#1b1b1b', barra: '#a0521d', pe: '#2d6a2d', n: '#24548a', comando: '#1f4f9a', campo: '#7a4fb0', cinza: '#777', destaque: '#b8860b', fundo: '#f6f8fc' };
const t = (x, y, s, { tam = 10, cor = '#111', anc = 'start', peso = 'normal', rot = 0, it = false } = {}) =>
  `<text x="${x}" y="${y}" font-size="${tam}" fill="${cor}" text-anchor="${anc}" font-weight="${peso}"${it ? ' font-style="italic"' : ''}${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${e(s)}</text>`;
const l = (x1, y1, x2, y2, { cor = COR.linha, w = 1.2, traco = '' } = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cor}" stroke-width="${w}"${traco ? ` stroke-dasharray="${traco}"` : ''}/>`;
const r = (x, y, w, h, { cor = COR.linha, fundo = 'none', lw = 1, traco = '', rx = 0 } = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fundo}" stroke="${cor}" stroke-width="${lw}"${traco ? ` stroke-dasharray="${traco}"` : ''}${rx ? ` rx="${rx}"` : ''}/>`;
const c = (x, y, raio, { cor = COR.linha, fundo = 'none', lw = 1.2 } = {}) => `<circle cx="${x}" cy="${y}" r="${raio}" fill="${fundo}" stroke="${cor}" stroke-width="${lw}"/>`;
const svg = (w, h, corpo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" font-family="Arial, Helvetica, sans-serif">${corpo}</svg>`;
const fmt = (v, d = 1) => (v == null ? '—' : String(Math.round(v * 10 ** d) / 10 ** d).replace('.', ','));
const quebrar = (s, n) => {
  const pal = String(s || '').split(/\s+/);
  const out = [];
  let lin = '';
  for (const p of pal) { if ((lin + ' ' + p).trim().length > n && lin) { out.push(lin); lin = p; } else lin = (lin + ' ' + p).trim(); }
  if (lin) out.push(lin);
  return out;
};

// símbolo de disjuntor (IEC): contato com "×" no fixo; tipo motor com o laço térmico
function simbDisjuntor(x, y, tipo) {
  let s = l(x, y, x, y + 10) + l(x, y + 10, x + 9, y + 26) + l(x, y + 30, x, y + 40);
  s += l(x - 4, y + 6, x + 4, y + 14, { w: 1 }) + l(x - 4, y + 14, x + 4, y + 6, { w: 1 });
  if (tipo === 'disjuntor_motor') s += r(x - 14, y + 30, 8, 6, { lw: 0.8 }) + t(x - 16, y + 36, '>', { tam: 8, anc: 'end' });
  if (tipo === 'idr') s += `<ellipse cx="${x}" cy="${y + 34}" rx="9" ry="4" fill="none" stroke="#1b1b1b" stroke-width="1"/>`;
  return s;
}

// ── FL01: unifilar de força ──────────────────────────────────────────────────
function unifilar(p) {
  const W = 1600, H = 980;
  const saidas = [];
  for (const q of p.protecoes) {
    if (q.tag === 'Q1' || q.tipo === 'contator') continue;
    if (q.grupo) continue; // IDR: desenhado com o seu disjuntor
    saidas.push(q);
  }
  const dx = Math.min(130, (W - 160) / Math.max(1, saidas.length));
  const x0 = 120;
  const yBarra = 250;
  let s = '';
  // alimentador e geral
  const xg = x0 + 20;
  s += t(xg + 30, 30, `ALIMENTADOR DO ${p.quadro.origem} (entrada ${p.quadro.entrada === 'superior' ? 'por cima' : 'por baixo'}) — ${p.quadro.condutores} · ${p.quadro.vff}/${p.quadro.vfn} V · ${p.quadro.frequencia} Hz · ${p.quadro.esquema}`, { tam: 13, peso: 'bold' });
  s += t(xg + 30, 46, 'cabo e proteção a montante: fora do fornecimento', { tam: 10, cor: COR.cinza, it: true });
  s += l(xg, 20, xg, 120, { w: 2.2 }) + `<polygon points="${xg - 6},112 ${xg + 6},112 ${xg},122" fill="#111"/>`;
  s += simbDisjuntor(xg, 122, 'caixa_moldada').replace(/stroke-width="1.2"/g, 'stroke-width="2"');
  const g = p.protecoes.find(q => q.tag === 'Q1');
  s += t(xg + 22, 140, `Q1 — GERAL`, { tam: 12, peso: 'bold' });
  s += t(xg + 22, 155, `3P ${g.In} A${g.Ir ? ` (Ir = ${g.Ir} A)` : ''} caixa moldada`, { tam: 10 });
  s += t(xg + 22, 169, `Icu ≥ Icc no ponto${p.quadro.icc_ka ? ` (${p.quadro.icc_ka} kA)` : '*'}`, { tam: 10 });
  s += t(xg + 22, 183, `Ib ≈ ${fmt(p.demanda.iProj, 0)} A (fase ${p.demanda.faseMax})`, { tam: 9, cor: COR.cinza });
  s += l(xg, 162, xg, yBarra, { w: 2.2 });
  // barramento
  const xFim = x0 + saidas.length * dx + 20;
  s += l(x0 - 30, yBarra, xFim, yBarra, { cor: COR.barra, w: 6 });
  s += l(x0 - 30, yBarra + 12, xFim, yBarra + 12, { cor: COR.n, w: 2 }) + t(xFim + 6, yBarra + 15, 'N', { tam: 10, cor: COR.n, peso: 'bold' });
  s += l(x0 - 30, yBarra + 22, xFim, yBarra + 22, { cor: COR.pe, w: 2, traco: '8 4' }) + t(xFim + 6, yBarra + 26, 'PE', { tam: 10, cor: COR.pe, peso: 'bold' });
  s += t(xg + 250, yBarra - 14, `BARRAMENTO ${p.barramento.texto || ''}`, { tam: 10, cor: COR.barra, peso: 'bold' });
  // saídas
  let yMaxDesenho = 0;
  saidas.forEach((q, k) => {
    const x = x0 + 40 + k * dx;
    const y = yBarra;
    const idr = p.protecoes.find(z => z.grupo === q.tag);
    let yy = y + 30;
    s += l(x, y, x, yy, { w: 1.6 }) + t(x + 4, y + 22, q.fases === 'L1L2L3' ? '3P' : q.fases, { tam: 8, cor: COR.cinza });
    if (idr) {
      s += simbDisjuntor(x, yy, 'idr');
      s += t(x + 14, yy + 18, `${idr.tag} ${idr.polos} ${idr.In} A`, { tam: 9, peso: 'bold' }) + t(x + 14, yy + 30, `${idr.idn} mA tipo ${idr.drTipo}`, { tam: 8 });
      yy += 46;
    }
    s += simbDisjuntor(x, yy, q.tipo);
    s += t(x + 14, yy + 16, q.tag, { tam: 11, peso: 'bold' });
    s += t(x + 14, yy + 28, `${q.polos} ${q.In} A${q.curva ? ` ${q.curva}` : ''}`, { tam: 9 });
    s += t(x + 14, yy + 39, q.tipo === 'caixa_moldada' ? 'caixa moldada' : q.tipo === 'disjuntor_motor' ? 'disj.-motor' : '', { tam: 8, cor: COR.cinza });
    yy += 46;
    s += l(x, yy, x, yy + 40, { w: 1.4 });
    if (q.condutor?.secao) s += t(x - 4, yy + 30, `${String(q.condutor.secao).replace('.', ',')} mm²`, { tam: 8, cor: COR.comando, anc: 'end', rot: 0 });
    yy += 40;
    // carga
    const carga = (p.cargas || []).find(z => z.id === q.carga);
    if (q.tag === 'QDPS') {
      s += r(x - 16, yy, 32, 40, { fundo: '#fff' }) + l(x - 6, yy + 8, x + 6, yy + 20) + l(x + 6, yy + 20, x - 4, yy + 26) + `<polygon points="${x - 7},${yy + 25} ${x - 1},${yy + 32} ${x - 1},${yy + 24}" fill="#111"/>`;
      s += t(x, yy + 54, 'DPS', { tam: 10, peso: 'bold', anc: 'middle' }) + t(x, yy + 66, `Classe ${p.dps?.classe || 'II'} ${p.dps?.uc_v || 275} V`, { tam: 8, anc: 'middle' }) + t(x, yy + 77, `${p.dps?.in_ka || ''}/${p.dps?.imax_ka || ''} kA · 3F-PE+N-PE`, { tam: 8, anc: 'middle' });
      s += l(x, yy + 40, x, yy + 86, { cor: COR.pe }) + t(x, yy + 96, '→ barra PE (≤ 0,5 m)', { tam: 8, cor: COR.pe, anc: 'middle' });
    } else if (q.tag === 'QRF') {
      s += r(x - 18, yy, 36, 34, { fundo: '#fff' }) + t(x, yy + 22, 'RFF', { tam: 11, peso: 'bold', anc: 'middle' });
      s += t(x, yy + 48, 'falta e sequência', { tam: 8, anc: 'middle' }) + t(x, yy + 58, 'de fase', { tam: 8, anc: 'middle' }) + t(x, yy + 70, '11-14 → KE (FL02)', { tam: 8, cor: COR.comando, anc: 'middle' });
    } else if (carga && carga.categoria === 'hvac_mca') {
      s += t(x + 6, yy - 6, 'X1', { tam: 8, cor: COR.cinza });
      s += r(x - 50, yy, 100, 74, { fundo: '#fff' });
      s += t(x, yy + 16, carga.rotulo.toUpperCase(), { tam: 10, peso: 'bold', anc: 'middle' });
      quebrar(`${carga.fabricante || ''} ${carga.modelo || ''}`, 18).slice(0, 2).forEach((ln, i) => { s += t(x, yy + 30 + i * 11, ln, { tam: 8.5, anc: 'middle' }); });
      s += t(x, yy + 54, `${carga.tensao} V ${carga.ligacao === '3F+N' ? '3N~' : '3~'}`, { tam: 8.5, anc: 'middle' });
      s += t(x, yy + 66, `MCA ${carga.mca ?? '—'} A · MFA ${carga.mfa ?? '—'} A`, { tam: 8.5, anc: 'middle' });
      s += t(x, yy + 88, `${carga.ligacao === '3F+N' ? '3F+N+PE' : '3F+PE'} · borne ${q.borne?.secao || ''} mm²`, { tam: 8, cor: COR.cinza, anc: 'middle' });
    } else if (carga && carga.categoria === 'motor') {
      if (carga.acion) {
        s += r(x - 22, yy, 44, 44, { fundo: '#fff' }) + l(x - 22, yy + 44, x + 22, yy) + t(x - 12, yy + 16, '~', { tam: 14 }) + t(x + 6, yy + 38, '~', { tam: 14 });
        s += t(x + 26, yy + 14, carga.acion.tag, { tam: 10, peso: 'bold' }) + t(x + 26, yy + 26, `${carga.acion.corrente || ''} A`, { tam: 8 }) + t(x + 26, yy + 37, carga.acion.cliente ? '(cliente)' : '', { tam: 8, cor: COR.destaque });
        yy += 44;
        s += l(x, yy, x, yy + 34, { w: 1.4, traco: '5 2' }) + t(x + 5, yy + 22, 'U·V·W+PE blindado', { tam: 7.5, cor: COR.cinza });
        yy += 34;
      }
      s += t(x + 6, yy - 4, 'X1', { tam: 8, cor: COR.cinza });
      s += c(x, yy + 20, 18, { fundo: '#fff' }) + t(x, yy + 19, 'M', { tam: 12, peso: 'bold', anc: 'middle' }) + t(x, yy + 31, '3~', { tam: 8, anc: 'middle' });
      s += t(x, yy + 52, carga.rotulo.toUpperCase(), { tam: 9, peso: 'bold', anc: 'middle' });
      s += t(x, yy + 63, `${carga.fabricante || ''} ${carga.modelo || ''}`.trim(), { tam: 7.5, anc: 'middle' });
      s += t(x, yy + 74, `${fmt(carga.pCv, 0)} cv · ${carga.tensao} V · ${carga.papel}`, { tam: 7.5, anc: 'middle' });
    } else {
      s += t(x + 6, yy - 4, q.servico ? '' : 'X1', { tam: 8, cor: COR.cinza });
      const rot = (q.alimenta || q.funcao || '').toUpperCase();
      if (q.auxiliar === 'iluminacao') s += c(x, yy + 14, 12) + l(x - 8, yy + 6, x + 8, yy + 22) + l(x - 8, yy + 22, x + 8, yy + 6);
      else if (q.auxiliar === 'tug') s += `<path d="M ${x - 12} ${yy + 22} L ${x} ${yy + 4} L ${x + 12} ${yy + 22} Z" fill="none" stroke="#111" stroke-width="1.2"/>`;
      else if (q.auxiliar === 'comando') s += r(x - 22, yy, 44, 34, { fundo: '#fff' }) + t(x, yy + 14, 'G1', { tam: 10, peso: 'bold', anc: 'middle' }) + t(x, yy + 27, `${p.comando.fonte.A} A`, { tam: 8, anc: 'middle' });
      else if (q.auxiliar === 'ventilacao') s += c(x, yy + 16, 14) + t(x, yy + 20, 'M1', { tam: 9, anc: 'middle', peso: 'bold' });
      else s += l(x - 8, yy + 4, x, yy + 16) + l(x + 8, yy + 4, x, yy + 16);
      quebrar(rot, 16).slice(0, 3).forEach((ln, i) => { s += t(x, yy + 48 + i * 11, ln, { tam: 8.5, anc: 'middle', peso: i === 0 ? 'bold' : 'normal' }); });
      if (q.auxiliar === 'comando') {
        const f = p.comando.fusiveis || [];
        s += t(x, yy + 84, `220 Vca / 24 Vcc ${p.comando.fonte.A} A`, { tam: 7.5, anc: 'middle' });
        s += t(x, yy + 95, f.map(z => `${z.tag} ${z.A} A ${z.barra}`).join(' · '), { tam: 7.5, anc: 'middle', cor: COR.comando });
        s += t(x, yy + 106, `H1 energizado ${p.sinaleiros.find(z => /220/.test(z.tensao || ''))?.tag ? '220 Vca' : ''}`, { tam: 7.5, anc: 'middle', cor: COR.cinza });
      }
      if (q.auxiliar === 'ventilacao' && p.ventilacao) s += t(x, yy + 84, `≥ ${p.ventilacao.livre} m³/h + BT ${p.ventilacao.termostato} °C`, { tam: 7.5, anc: 'middle' });
    }
    yMaxDesenho = Math.max(yMaxDesenho, yy + 110);
  });
  // notas
  const notas = notasUnifilar(p);
  let yN = Math.max(660, yMaxDesenho + 60);
  s += t(40, yN, 'NOTAS', { tam: 11, peso: 'bold' });
  for (const [i, n] of notas.entries()) {
    for (const [j, ln] of quebrar(`${i + 1}. ${n}`, 250).entries()) { yN += 13; s += t(40 + (j ? 14 : 0), yN, ln, { tam: 9.2 }); }
  }
  return svg(W, Math.max(yN + 20, 700), s);
}

function notasUnifilar(p) {
  const n = [];
  n.push(`Fornecimento: tudo dentro do quadro e até as réguas de bornes ${p.reguas.map(x => x.id).join('/')}. ${p.escopo.excluido.length ? `Fora do fornecimento: ${p.escopo.excluido.join('; ')}.` : 'Cabos de campo e eletrodutos: fora do fornecimento.'}`);
  n.push(`(*) Icu do Q1 e Icw do barramento conforme a Icc presumida no ${p.quadro.origem}${p.quadro.icc_ka ? ` (${p.quadro.icc_ka} kA)` : ' — a confirmar'}. Minidisjuntores em back-up com o Q1: exigir do fabricante a tabela de filiação. Seletividade Q1 × saídas: verificar as curvas.`);
  for (const q of p.protecoes.filter(z => z.carga && z.tipo === 'caixa_moldada')) { n.push(`${q.tag}: ${q.criterio} ${q.condutor?.criterio || ''}. Bornes X1 para ${q.borne?.secao} mm² (cabo de campo com agrupamento/temperatura).`); break; }
  const dm = p.protecoes.find(z => z.tipo === 'disjuntor_motor');
  if (dm) n.push(`${dm.tag}…: ${dm.criterio}`);
  n.push(`Demanda (FL06): ${p.decisoes.find(d => d.titulo === 'Disjuntor geral')?.texto || ''}`);
  if (p.dps) n.push(`${p.dps.texto}, com proteção própria (QDPS) conforme o fabricante do DPS. Condutores de ligação ≤ 0,5 m (NBR 5410, 6.3.5.2.9).`);
  if (p.rff) n.push('RFF (relé de falta/sequência de fase) abre a cadeia de emergência: desliga as partidas e retira a liberação (FL02).');
  const mono = p.protecoes.filter(z => z.polos === '1P+N');
  if (mono.length) n.push(`Distribuição monofásica: ${mono.map(z => `${z.tag}/${z.fases}`).join(', ')}. G1 alimenta somente o comando ${p.comando.tensao}${p.valvulas?.length ? ' e as válvulas' : ''}.`);
  return n;
}

// ── FL02: escada de comando ─────────────────────────────────────────────────
const U = 92; // largura de um contato
const V = 30; // altura de uma linha
function tamanho(ex) {
  if (!ex) return { w: 0, h: 1 };
  if (ex.s) { const k = ex.s.map(tamanho); return { w: k.reduce((a, b) => a + b.w, 0), h: Math.max(1, ...k.map(z => z.h)) }; }
  if (ex.p) { const k = ex.p.map(tamanho); return { w: Math.max(0, ...k.map(z => z.w)), h: Math.max(1, k.reduce((a, b) => a + b.h, 0)) }; }
  return { w: 1, h: 1 };
}
function contato(x, y, f, modelo) {
  const id = String(f.x).split('=')[0];
  const ent = (modelo.entradas || []).find(z => z.id === id);
  const campo = ent && ent.tipo === 'externo' || /\.(RUN|FALHA)$/.test(f.x);
  const cor = campo ? COR.campo : COR.comando;
  let s = l(x, y, x + 34, y, { cor }) + l(x + 58, y, x + U, y, { cor });
  s += l(x + 34, y - 9, x + 34, y + 9, { cor, w: 1.6 }) + l(x + 58, y - 9, x + 58, y + 9, { cor, w: 1.6 });
  if (f.neg) s += l(x + 30, y + 10, x + 62, y - 10, { cor, w: 1.2 });
  if (ent && ent.tipo === 'seletora') s += l(x + 40, y - 14, x + 52, y - 14, { cor, w: 1 }) + l(x + 46, y - 14, x + 46, y - 9, { cor, w: 1 });
  if (ent && ent.tipo === 'emergencia') s += `<path d="M ${x + 40} ${y - 16} q 6 -6 12 0" fill="none" stroke="${cor}" stroke-width="1.2"/>`;
  if (campo) s += r(x + 26, y - 14, 40, 28, { cor, traco: '3 2', lw: 0.8 });
  const rot1 = f.etiqueta || f.x;
  s += t(x + 46, y - 17, rot1.length > 20 ? rot1.slice(0, 20) : rot1, { tam: 7.8, anc: 'middle', cor });
  const extra = campo ? (f.rotulo || (ent && ent.rotulo) || '') : '';
  if (extra) s += t(x + 46, y + 20, extra.length > 34 ? `${extra.slice(0, 33)}…` : extra, { tam: 6.4, anc: 'middle', cor: COR.cinza });
  return s;
}
function desenharExpr(ex, x, y, wTot, modelo) {
  // devolve svg; ocupa wTot colunas (completa com linha)
  if (!ex) return l(x, y, x + wTot * U, y);
  if (ex.s) {
    let s = '';
    let xx = x;
    ex.s.forEach((z, i) => {
      const tz = tamanho(z);
      const w = i === ex.s.length - 1 ? wTot - (xx - x) / U : tz.w;
      s += desenharExpr(z, xx, y, w, modelo);
      xx += w * U;
    });
    return s;
  }
  if (ex.p) {
    let s = '';
    let yy = y;
    const ys = [];
    for (const z of ex.p) {
      s += desenharExpr(z, x, yy, wTot, modelo);
      ys.push(yy);
      yy += tamanho(z).h * V * 1.9;
    }
    if (ys.length > 1) s += l(x, ys[0], x, ys[ys.length - 1]) + l(x + wTot * U, ys[0], x + wTot * U, ys[ys.length - 1]);
    return s;
  }
  const s = contato(x, y, ex, modelo);
  return wTot > 1 ? s + l(x + U, y, x + wTot * U, y) : s;
}

const ROTULO_BARRA = { 'L+': 'L+ (+24 Vcc após F1)', 'L+E': 'L+E (após a emergência — KE)', 'LV+': 'LV+ (F2 — válvulas, fora da emergência)', FN: '220 Vca (Q do comando)' };
function ladder(projeto) {
  const cmd = projeto.comando;
  const modelo = cmd.modelo;
  const degraus = modelo.degraus;
  // colunas: divide os degraus em 2 colunas pela altura
  const alt = degraus.map(d => tamanho(d.expr).h * V * 1.9 + 22);
  const total = alt.reduce((a, b) => a + b, 0);
  const col = [[], []];
  let acc = 0;
  degraus.forEach((d, i) => { (acc < total / 2 ? col[0] : col[1]).push(i); acc += alt[i]; });
  const largCol = 760;
  const maxW = Math.max(...degraus.map(d => tamanho(d.expr).w));
  const wC = Math.min(maxW, 5);
  let s = '';
  let hMax = 0;
  col.forEach((lista, ci) => {
    const xL = 30 + ci * (largCol + 40);
    const xR = xL + largCol - 20;
    let y = 50;
    s += t(xL, 22, ci === 0 ? 'L+' : '', { tam: 12, peso: 'bold', cor: COR.comando }) + t(xR, 22, ci === 0 ? '0 V (M)' : '', { tam: 12, peso: 'bold', anc: 'end', cor: COR.comando });
    let barraAtual = null;
    for (const i of lista) {
      const d = degraus[i];
      if (d.barra !== barraAtual) {
        s += r(xL + 24, y - 16, xR - xL - 28, 16, { fundo: '#eef3fb', cor: '#c9d6ee', lw: 0.6 }) + t(xL + 30, y - 4, ROTULO_BARRA[d.barra] || d.barra, { tam: 9, peso: 'bold', cor: COR.comando });
        barraAtual = d.barra;
        y += 30;
      }
      const tz = tamanho(d.expr);
      const xE = xL + 40;
      s += t(xL, y + 4, d.id.replace('D', ''), { tam: 8, cor: COR.cinza });
      s += l(xL + 18, y, xE, y, { cor: COR.comando });
      s += desenharExpr(d.expr, xE, y, Math.max(wC, tz.w), modelo);
      const xFimExpr = xE + Math.max(wC, tz.w) * U;
      const xBob = xR - 120;
      s += l(xFimExpr, y, xBob - 14, y, { cor: COR.comando });
      const sin = d.tipo === 'sinaleiro';
      const carga = !sin && !/^K/.test(d.saida);
      if (sin) s += c(xBob, y, 11, { cor: COR.comando, fundo: '#fff' }) + l(xBob - 8, y - 8, xBob + 8, y + 8, { cor: COR.comando }) + l(xBob - 8, y + 8, xBob + 8, y - 8, { cor: COR.comando });
      else if (carga) s += r(xBob - 14, y - 10, 28, 20, { cor: COR.campo, fundo: '#fff' });
      else s += r(xBob - 14, y - 10, 28, 20, { cor: COR.comando, fundo: '#fff' });
      s += l(xBob + 14, y, xR, y, { cor: COR.comando });
      s += sin ? t(xBob + 14, y + 14, d.saida, { tam: 8.5, peso: 'bold' }) : t(xBob, y + 4, d.saida, { tam: 8.5, peso: 'bold', anc: 'middle' });
      const rot = (d.rotulo || '').length > 26 ? `${d.rotulo.slice(0, 25)}…` : d.rotulo || '';
      s += t(xBob + 20, y - 4, rot, { tam: 7.5, cor: '#333' });
      y += tz.h * V * 1.9 + 18;
    }
    s += l(xL + 18, 30, xL + 18, y - 10, { cor: COR.comando, w: 2 }) + l(xR, 30, xR, y - 10, { cor: COR.comando, w: 2 });
    hMax = Math.max(hMax, y);
  });
  s += t(30, hMax + 10, 'Contato tracejado = sinal de campo (borne X2/X3) · Contato com traço diagonal = NF · Numeração dos contatos conforme FL03 (tabela de relés).', { tam: 9, cor: COR.cinza, it: true });
  return svg(2 * largCol + 70, hMax + 20, s);
}

// ── FL05: layout 2D (porta e placa) ─────────────────────────────────────────
const CORES_SIN = { verde: '#2e9d4a', vermelho: '#d23b2f', amarelo: '#e2b71a', branco: '#f2f2f2', azul: '#2f6fd2' };
function layout(lay, quadro) {
  const { dim } = lay;
  const esc = 0.42; // px por mm
  const W = 2 * dim.l * esc + 260, H = dim.a * esc + 150;
  let s = '';
  // vista frontal da porta
  const x0 = 50, y0 = 60;
  s += t(x0, 30, 'VISTA FRONTAL — PORTA', { tam: 12, peso: 'bold' });
  s += r(x0, y0, dim.l * esc, dim.a * esc, { lw: 2, fundo: '#e9edf2' }) + r(x0 + 8, y0 + 8, dim.l * esc - 16, dim.a * esc - 16, { lw: 0.8, cor: '#888' });
  s += r(x0 + dim.l * esc / 2 - 90, y0 + 20, 180, 24, { fundo: '#111', cor: '#111' }) + t(x0 + dim.l * esc / 2, y0 + 36, `${quadro.tag} — ${quadro.descricao}`.slice(0, 38), { tam: 8.5, cor: '#fff', anc: 'middle', peso: 'bold' });
  for (const it of lay.porta) {
    const x = x0 + it.x * esc, y = y0 + it.y * esc;
    if (it.tipo === 'sinaleiro') { s += c(x, y, 9, { fundo: CORES_SIN[it.cor] || '#ccc', lw: 1 }) + t(x, y - 13, it.tag, { tam: 8, anc: 'middle', peso: 'bold' }); quebrar(it.rotulo.toUpperCase(), 12).slice(0, 2).forEach((ln, i) => { s += t(x, y + 20 + i * 9, ln, { tam: 6.5, anc: 'middle' }); }); }
    else if (it.tipo === 'seletora') { s += c(x, y, 12, { fundo: '#222' }) + l(x, y - 9, x, y + 9, { cor: '#fff', w: 3 }) + t(x, y - 17, it.tag, { tam: 8, anc: 'middle', peso: 'bold' }); quebrar(it.rotulo, 16).slice(0, 2).forEach((ln, i) => { s += t(x, y + 24 + i * 9, ln, { tam: 6.5, anc: 'middle' }); }); }
    else if (it.tipo === 'emergencia') { s += c(x, y, 22, { fundo: '#f2c200' }) + c(x, y, 14, { fundo: '#d21' }) + t(x, y + 36, `${it.tag} EMERGÊNCIA`, { tam: 8, anc: 'middle', peso: 'bold' }); }
    else if (it.tipo === 'ventilador') { s += r(x - it.l * esc / 2, y - it.h * esc / 2, it.l * esc, it.h * esc, { fundo: '#cfd6de' }); for (let k = 1; k < 6; k++) s += l(x - it.l * esc / 2 + 4, y - it.h * esc / 2 + k * it.h * esc / 6, x + it.l * esc / 2 - 4, y - it.h * esc / 2 + k * it.h * esc / 6, { w: 0.6, cor: '#888' }); s += t(x, y + it.h * esc / 2 + 12, it.rotulo, { tam: 7, anc: 'middle' }); }
  }
  s += r(x0 + dim.l * esc - 22, y0 + dim.a * esc / 2 - 25, 10, 50, { fundo: '#444' }) + t(x0 + dim.l * esc - 30, y0 + dim.a * esc / 2 + 40, 'fechadura', { tam: 7, anc: 'end' });
  s += cota(x0, y0 + dim.a * esc + 18, x0 + dim.l * esc, y0 + dim.a * esc + 18, `${dim.l}`) + cotaV(x0 - 18, y0, y0 + dim.a * esc, `${dim.a}`);
  // vista interna: placa
  const x1 = x0 + dim.l * esc + 140, y1 = y0;
  s += t(x1, 30, 'VISTA INTERNA — PLACA DE MONTAGEM (porta removida)', { tam: 12, peso: 'bold' });
  s += r(x1, y1, dim.l * esc, dim.a * esc, { lw: 2 });
  const px = x1 + 35 * esc, py = y1 + 35 * esc;
  s += r(px, py, lay.placa.l * esc, lay.placa.a * esc, { fundo: '#f4f1e8', cor: '#999' });
  const corZ = { entrada: '#fde9d9', geral: '#fbe3c4', saidas: '#fff3d6', acionamentos: '#e7f0fb', comando: '#e8f5e9', bornes: '#efe7f7' };
  for (const z of lay.zonas) {
    s += r(px + z.x * esc, py + z.y * esc, z.l * esc, z.a * esc, { fundo: corZ[z.id] || '#fff', cor: '#aaa', lw: 0.6 });
    s += t(px + z.x * esc + 4, py + z.y * esc + 11, z.rotulo, { tam: 7.2, peso: 'bold', cor: '#444' });
  }
  for (const it of lay.itens) {
    s += r(px + it.x * esc, py + it.y * esc, it.l * esc, it.a * esc, { fundo: '#fff', cor: COR.comando, lw: 0.8 });
    quebrar(it.rotulo, Math.max(8, Math.floor(it.l * esc / 4.6))).slice(0, 3).forEach((ln, i) => { s += t(px + (it.x + it.l / 2) * esc, py + it.y * esc + 10 + i * 8.5, ln, { tam: 6.8, anc: 'middle' }); });
  }
  s += l(px + lay.separacaoX * esc, py + 70 * esc, px + lay.separacaoX * esc, py + (lay.placa.a - 170) * esc, { cor: '#555', w: 3 }) + t(px + lay.separacaoX * esc + 4, py + (lay.placa.a - 180) * esc, 'chapa separadora', { tam: 7, rot: -90 });
  s += t(x1 + dim.l * esc + 8, y1 + 30, 'saída de ar →', { tam: 8 }) + t(x1 + dim.l * esc + 8, y1 + dim.a * esc - 20, '← entrada de ar (porta)', { tam: 8 });
  s += cota(x1, y1 + dim.a * esc + 18, x1 + dim.l * esc, y1 + dim.a * esc + 18, `${dim.l}`) + cotaV(x1 + dim.l * esc + 18, y1, y1 + dim.a * esc, `${dim.a}`);
  return svg(W + 40, H + 10, s);
}
const cota = (x1, y, x2, _y2, txt) => l(x1, y, x2, y, { cor: COR.comando, w: 0.8 }) + l(x1, y - 5, x1, y + 5, { cor: COR.comando, w: 0.8 }) + l(x2, y - 5, x2, y + 5, { cor: COR.comando, w: 0.8 }) + t((x1 + x2) / 2, y - 4, txt, { tam: 9, anc: 'middle', cor: COR.comando });
const cotaV = (x, y1, y2, txt) => l(x, y1, x, y2, { cor: COR.comando, w: 0.8 }) + l(x - 5, y1, x + 5, y1, { cor: COR.comando, w: 0.8 }) + l(x - 5, y2, x + 5, y2, { cor: COR.comando, w: 0.8 }) + t(x - 4, (y1 + y2) / 2, txt, { tam: 9, anc: 'middle', cor: COR.comando, rot: -90 });

module.exports = { unifilar, ladder, layout, tamanho, quebrar };

// ── Conferência automática: caixas de texto que se sobrepõem (teste das folhas) ──
// Estima a caixa de cada <text> pelo tamanho da fonte (largura ≈ 0,55 × corpo por caractere, Arial),
// a âncora e o deslocamento; textos girados ficam de fora. Devolve os pares que se sobrepõem
// (com uma folga de `tol` px para o antisserrilhado).
function caixasDeTexto(svgTexto) {
  const caixas = [];
  const r = /<text x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"[^>]*?text-anchor="(start|middle|end)"([^>]*)>([^<]*)<\/text>/g;
  let m;
  while ((m = r.exec(svgTexto))) {
    if (/rotate\(/.test(m[5])) continue;
    const x = Number(m[1]), y = Number(m[2]), f = Number(m[3]);
    const txt = m[6].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    if (!txt.trim()) continue;
    const w = txt.length * f * (/font-weight="bold"/.test(m[5]) ? 0.6 : 0.55);
    const x0 = m[4] === 'start' ? x : m[4] === 'middle' ? x - w / 2 : x - w;
    caixas.push({ x0, x1: x0 + w, y0: y - f * 0.8, y1: y + f * 0.2, txt });
  }
  return caixas;
}
function colisoesDeTexto(svgTexto, tol = 0.5) {
  const c = caixasDeTexto(svgTexto);
  const out = [];
  for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
    const a = c[i], b = c[j];
    if (a.x0 < b.x1 - tol && b.x0 < a.x1 - tol && a.y0 < b.y1 - tol && b.y0 < a.y1 - tol) out.push([a.txt, b.txt]);
  }
  return out;
}
module.exports.caixasDeTexto = caixasDeTexto;
module.exports.colisoesDeTexto = colisoesDeTexto;
