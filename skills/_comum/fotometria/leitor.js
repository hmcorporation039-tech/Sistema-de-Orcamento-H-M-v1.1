// Fotometria de luminária (fase 5 do roteiro de 02/11/2026 — iluminação no 3D).
// Lê o arquivo do fabricante e devolve a distribuição de intensidade luminosa
// num formato único, que o cálculo ponto a ponto (./pontoAPonto.js) usa na skill
// de iluminação e no visualizador 3D (mapa de iluminância):
//   - IES LM-63 (1986, 1991, 1995, 2002, 2019), fotometria tipo C;
//   - LDT (EULUMDAT), simetrias 0 a 4;
//   - sem arquivo: distribuição SIMÉTRICA aproximada pelo fluxo e pelo ângulo de
//     facho do cadastro, I(γ) = I0 · cos^m γ (só para baixo), avisada.
// JS puro, sem disco nem rede. Nenhum arquivo de fabricante é versionado: os testes
// geram arquivos sintéticos (./teste-fotometria.js).
//
// Formato único ("fotometria compacta", vai inteira na cena 3D):
//   { fonte: 'ies' | 'ldt' | 'aproximada', nome, C: [0, 15, …, 360] ou [0] (simetria de
//     eixo), G: [0, 2.5, …, 180], I: [[cd por G] por plano C], fluxo_lm (integrado),
//     angulo_graus? (aproximada), avisos: [] }
// Convenção tipo C: γ = 0 aponta para baixo (nadir); C0 ao longo do comprimento da
// luminária, C crescendo no sentido anti-horário visto de cima.

const PASSO_C = 15;   // planos C da forma compacta (graus)
const PASSO_G = 2.5;  // ângulos γ da forma compacta (graus)
const ANGULO_PADRAO = 120; // facho (FWHM) adotado sem dado: distribuição lambertiana (cos¹) [CONFERIR]

const rad = (g) => (g * Math.PI) / 180;
const arred = (v, c = 1) => Math.round(v * 10 ** c) / 10 ** c;

// números de um trecho de texto (aceita vírgula entre números e vírgula decimal isolada)
function numeros(texto) {
  return String(texto).trim().split(/[\s,;]+/).filter(Boolean).map(Number);
}

// interpolação linear numa lista crescente xs; fora do intervalo → `fora`
function interp(xs, ys, x, fora = 0) {
  const n = xs.length;
  if (n === 1) return Math.abs(x - xs[0]) < 1e-9 ? ys[0] : fora;
  if (x < xs[0] - 1e-9 || x > xs[n - 1] + 1e-9) return fora;
  let i = 0;
  while (i < n - 2 && x > xs[i + 1]) i++;
  const t = xs[i + 1] === xs[i] ? 0 : (x - xs[i]) / (xs[i + 1] - xs[i]);
  return ys[i] + (ys[i + 1] - ys[i]) * Math.min(1, Math.max(0, t));
}

// ── Fonte genérica: planos C guardados + regra de simetria (fold) ───────────
// planos: [{ c (ângulo "desdobrado", crescente), I: [cd por G] }], G crescente,
// fold(C) leva qualquer C (0–360) para o intervalo dos planos guardados.
function avaliadorDaFonte({ planos, G, fold }) {
  const cs = planos.map(p => p.c);
  return (C, g) => {
    if (planos.length === 1) return interp(G, planos[0].I, g, 0);
    const c = fold(((C % 360) + 360) % 360);
    // planos vizinhos de c
    let i = 0;
    while (i < cs.length - 2 && c > cs[i + 1]) i++;
    const t = cs[i + 1] === cs[i] ? 0 : Math.min(1, Math.max(0, (c - cs[i]) / (cs[i + 1] - cs[i])));
    const a = interp(G, planos[i].I, g, 0);
    const b = interp(G, planos[i + 1].I, g, 0);
    return a + (b - a) * t;
  };
}

// Fluxo luminoso por integração numérica: Φ = ∫∫ I(C, γ) sen γ dγ dC
function integrarFluxo(avaliar, eixo = false) {
  const dg = 0.5, dc = eixo ? 360 : 5;
  let soma = 0;
  for (let c = dc / 2; c < 360; c += dc) {
    for (let g = dg / 2; g < 180; g += dg) soma += avaliar(c, g) * Math.sin(rad(g));
  }
  return soma * rad(dg) * rad(dc);
}

// Forma compacta a partir de um avaliador I(C, γ)
function compactar(avaliar, { eixo = false, fonte, nome = '', avisos = [], extra = {} } = {}) {
  const G = [];
  for (let g = 0; g <= 180 + 1e-9; g += PASSO_G) G.push(arred(g, 2));
  const C = [];
  if (eixo) C.push(0); else for (let c = 0; c <= 360 + 1e-9; c += PASSO_C) C.push(c);
  const I = C.map(c => G.map(g => arred(Math.max(0, avaliar(c, g)), 1)));
  const f = { fonte, nome, C, G, I, avisos: [...avisos], ...extra };
  f.fluxo_lm = Math.round(integrarFluxo(avaliadorCompacto(f), eixo));
  return f;
}

// Avaliador da forma compacta (o mesmo que ./pontoAPonto.js usa; repetido aqui para o
// leitor não depender do cálculo)
function avaliadorCompacto(f) {
  const planos = f.C.map((c, k) => ({ c, I: f.I[k] }));
  return avaliadorDaFonte({ planos, G: f.G, fold: (c) => c });
}

// ── IES LM-63 ───────────────────────────────────────────────────────────────
function lerIes(texto, nome = '') {
  const linhas = String(texto).replace(/\r\n?/g, '\n').split('\n');
  let k = 0;
  const avisos = [];
  const palavras = {};
  // cabeçalho (IESNA:LM-63-…) e palavras-chave [TEST], [MANUFAC], [LUMCAT]…
  while (k < linhas.length && !/^\s*TILT\s*=/i.test(linhas[k])) {
    const m = linhas[k].match(/^\s*\[([^\]]+)\]\s*(.*)$/);
    if (m) palavras[m[1].toUpperCase()] = m[2].trim();
    k++;
  }
  if (k >= linhas.length) throw new Error('IES sem a linha TILT= (não é um arquivo LM-63).');
  const tilt = linhas[k].split('=')[1].trim().toUpperCase();
  let resto = linhas.slice(k + 1).join('\n');
  let nums = numeros(resto);
  let p = 0;
  if (tilt === 'INCLUDE') {
    // geometria lâmpada-luminária, nº de ângulos, ângulos e fatores de inclinação: ignorados
    p += 1;
    const n = nums[p++];
    p += 2 * n;
    avisos.push('IES com TILT=INCLUDE: fatores de inclinação da lâmpada ignorados (luminária na posição de medição).');
  } else if (tilt !== 'NONE') {
    avisos.push(`IES com TILT=${tilt} (arquivo externo): inclinação ignorada.`);
  }
  const [nLamp, lmLamp, mult, nV, nH, tipo, , , , ] = nums.slice(p, p + 10);
  p += 10;
  const [fatorReator, , watts] = nums.slice(p, p + 3);
  p += 3;
  if (![nV, nH].every(v => Number.isInteger(v) && v > 0)) throw new Error('IES com número de ângulos inválido.');
  if (tipo !== 1) throw new Error(`IES com fotometria tipo ${tipo === 2 ? 'B' : tipo === 3 ? 'A' : tipo} — só o tipo C (luminárias de interior) é aceito.`);
  const V = nums.slice(p, p + nV); p += nV;
  const H = nums.slice(p, p + nH); p += nH;
  const valores = nums.slice(p, p + nV * nH);
  if (valores.length < nV * nH || valores.some(v => !Number.isFinite(v))) throw new Error('IES incompleto: faltam valores de candela.');
  const f = (Number.isFinite(mult) ? mult : 1) * (Number.isFinite(fatorReator) && fatorReator > 0 ? fatorReator : 1);
  // planos e simetria pelos ângulos horizontais (LM-63, tipo C)
  const hMin = H[0], hMax = H[H.length - 1];
  let fold = (c) => c;
  let simetria = 'nenhuma';
  if (nH === 1) simetria = 'eixo';
  else if (hMin === 0 && hMax === 90) { simetria = 'quadrantes'; fold = (c) => { let x = c > 180 ? 360 - c : c; return x > 90 ? 180 - x : x; }; }
  else if (hMin === 0 && hMax === 180) { simetria = 'C0-C180'; fold = (c) => (c > 180 ? 360 - c : c); }
  else if (hMin === 90 && hMax === 270) { simetria = 'C90-C270'; fold = (c) => (c < 90 ? 180 - c : c > 270 ? 540 - c : c); }
  else if (hMin === 0 && hMax === 360) simetria = 'nenhuma';
  else if (hMin === 0 && hMax > 180) avisos.push(`IES com ângulos horizontais de 0 a ${hMax}° — planos acima de ${hMax}° tomados como o último.`);
  else throw new Error(`IES com ângulos horizontais de ${hMin} a ${hMax}° — simetria não reconhecida.`);
  const planos = H.map((c, j) => ({ c, I: V.map((_, i) => valores[j * nV + i] * f) }));
  const avaliar = avaliadorDaFonte({ planos, G: V, fold });
  const eixo = simetria === 'eixo';
  const descricao = [palavras.MANUFAC, palavras.LUMCAT, palavras.LUMINAIRE].filter(Boolean).join(' — ');
  const r = compactar(avaliar, { eixo, fonte: 'ies', nome: nome || descricao, avisos, extra: { simetria, descricao, potencia_w: Number.isFinite(watts) ? watts : null, absoluta: lmLamp === -1 } });
  r.fluxo_lampadas_lm = lmLamp > 0 && nLamp > 0 ? lmLamp * nLamp : null;
  return r;
}

// ── LDT (EULUMDAT) ──────────────────────────────────────────────────────────
function lerLdt(texto, nome = '') {
  const L = String(texto).replace(/\r\n?/g, '\n').split('\n');
  const n = (i) => { const v = Number(String(L[i] ?? '').trim().replace(',', '.')); if (!Number.isFinite(v)) throw new Error(`LDT: linha ${i + 1} deveria ser um número ("${String(L[i] ?? '').trim()}").`); return v; };
  const avisos = [];
  const isym = n(2), mc = n(3), ng = n(5);
  if (![0, 1, 2, 3, 4].includes(isym)) throw new Error(`LDT com simetria ${isym} desconhecida.`);
  if (!(mc > 0 && ng > 0)) throw new Error('LDT com número de planos C ou de ângulos γ inválido.');
  const fator = n(23) > 0 ? n(23) : 1;
  const conjuntos = Math.max(1, Math.round(Math.abs(n(25))));
  let i = 26;
  const lampadas = []; for (let k = 0; k < conjuntos; k++) lampadas.push(n(i + k));
  i += conjuntos; // nº de lâmpadas
  i += conjuntos; // tipo
  let fluxoLampadas = 0; for (let k = 0; k < conjuntos; k++) fluxoLampadas += n(i + k);
  i += conjuntos; // fluxo
  i += conjuntos; // temperatura de cor
  i += conjuntos; // IRC
  let watts = 0; for (let k = 0; k < conjuntos; k++) watts += n(i + k);
  i += conjuntos; // potência
  i += 10;        // razões diretas por índice do recinto
  const C = []; for (let k = 0; k < mc; k++) C.push(n(i + k));
  i += mc;
  const G = []; for (let k = 0; k < ng; k++) G.push(n(i + k));
  i += ng;
  // valores em cd/klm: o resto do arquivo (uma por linha, às vezes várias por linha)
  const vals = numeros(L.slice(i).join('\n').replace(/(\d),(\d)/g, '$1.$2'));
  const q = (k) => C[((k % mc) + mc) % mc];
  // planos guardados (índice no vetor C) por simetria — EULUMDAT: Mc1…Mc2
  let indices;
  let fold = (c) => c;
  if (isym === 0) indices = [...Array(mc).keys()];
  else if (isym === 1) indices = [0];
  else if (isym === 2) { indices = [...Array(mc / 2 + 1).keys()]; fold = (c) => (c > 180 ? 360 - c : c); }
  else if (isym === 3) { const ini = (3 * mc) / 4; indices = [...Array(mc / 2 + 1).keys()].map(k => ini + k); fold = (c) => { let x = c > 180 ? c - 360 : c; if (x > 90) x = 180 - x; else if (x < -90) x = -180 - x; return x; }; }
  else { indices = [...Array(mc / 4 + 1).keys()]; fold = (c) => { let x = c > 180 ? 360 - c : c; return x > 90 ? 180 - x : x; }; }
  if (indices.some(k => !Number.isInteger(k))) throw new Error(`LDT: número de planos C (${mc}) incompatível com a simetria ${isym}.`);
  if (vals.length < indices.length * ng) throw new Error('LDT incompleto: faltam intensidades.');
  const escala = (fluxoLampadas > 0 ? fluxoLampadas / 1000 : 1) * fator;
  if (!(fluxoLampadas > 0)) avisos.push('LDT sem o fluxo das lâmpadas: intensidades tomadas como cd para 1.000 lm. [CONFERIR]');
  const planos = indices.map((k, j) => {
    let c = q(k);
    if (isym === 3) c = c > 180 ? c - 360 : c; // C270…C360/C0…C90 → −90…90
    return { c, I: G.map((_, m) => vals[j * ng + m] * escala) };
  });
  if (isym === 0 && planos[planos.length - 1].c < 360) planos.push({ c: 360, I: planos[0].I }); // fecha o círculo
  const avaliar = avaliadorDaFonte({ planos, G, fold });
  const descricao = [L[0], L[8]].map(s => String(s || '').trim()).filter(Boolean).join(' — ');
  const r = compactar(avaliar, { eixo: isym === 1, fonte: 'ldt', nome: nome || descricao, avisos, extra: { simetria: ['nenhuma', 'eixo', 'C0-C180', 'C90-C270', 'quadrantes'][isym], descricao, potencia_w: watts || null } });
  r.fluxo_lampadas_lm = fluxoLampadas || null;
  r.lor_pct = Number(String(L[22] ?? '').replace(',', '.')) || null;
  return r;
}

// Arquivo IES ou LDT pelo conteúdo (nome só ajuda quando o conteúdo é ambíguo)
function lerFotometria(texto, nome = '') {
  const t = String(texto || '');
  if (!t.trim()) throw new Error('Arquivo de fotometria vazio.');
  if (/^\s*IESNA/i.test(t) || /^\s*TILT\s*=/im.test(t) || /\.ies$/i.test(nome)) return lerIes(t, nome);
  if (/\.ldt$/i.test(nome) || /^[^\n]*\n\s*[0-3]\s*\n\s*[0-4]\s*\n/.test(t.replace(/\r/g, ''))) return lerLdt(t, nome);
  throw new Error('Formato de fotometria não reconhecido (esperado IES LM-63 ou LDT/EULUMDAT).');
}

// Sem arquivo: I(γ) = I0 · cos^m γ para γ < 90° (nada para cima). O facho (abertura a
// 50 % da intensidade máxima) dá m = ln 0,5 / ln cos(facho/2); o fluxo dá
// I0 = Φ (m + 1) / 2π. Facho de 120° → m = 1 (lambertiana).
function distribuicaoAproximada(fluxo, anguloGraus) {
  const avisos = [];
  let ang = Number(anguloGraus);
  if (!(ang > 0)) { ang = ANGULO_PADRAO; avisos.push(`ângulo de facho não informado — adotado ${ANGULO_PADRAO}° (lambertiana). [CONFERIR]`); }
  ang = Math.min(170, Math.max(10, ang));
  const m = Math.log(0.5) / Math.log(Math.cos(rad(ang / 2)));
  const i0 = (fluxo * (m + 1)) / (2 * Math.PI);
  const avaliar = (c, g) => (g < 90 ? i0 * Math.cos(rad(g)) ** m : 0);
  return compactar(avaliar, { eixo: true, fonte: 'aproximada', nome: `simétrica aproximada (${ang}°)`, avisos, extra: { angulo_graus: ang, expoente: arred(m, 3), simetria: 'eixo' } });
}

// Fotometria de uma luminária do cadastro da skill: arquivo (texto ou { nome, conteudo })
// quando houver; senão a aproximada pelo fluxo e pelo ângulo. Erro de leitura do arquivo
// não derruba o cálculo: volta a aproximada com o aviso.
function fotometriaDaLuminaria({ arquivo, fluxo, angulo }) {
  const conteudo = arquivo && typeof arquivo === 'object' ? arquivo.conteudo : arquivo;
  const nome = arquivo && typeof arquivo === 'object' ? arquivo.nome || '' : '';
  if (conteudo && String(conteudo).trim()) {
    try {
      return lerFotometria(conteudo, nome);
    } catch (e) {
      const f = distribuicaoAproximada(fluxo, angulo);
      f.avisos.unshift(`arquivo de fotometria${nome ? ` ${nome}` : ''} não lido (${e.message}) — usada a distribuição aproximada.`);
      return f;
    }
  }
  return distribuicaoAproximada(fluxo, angulo);
}

module.exports = { lerIes, lerLdt, lerFotometria, distribuicaoAproximada, fotometriaDaLuminaria, integrarFluxo, avaliadorCompacto, compactar, ANGULO_PADRAO, PASSO_C, PASSO_G };
