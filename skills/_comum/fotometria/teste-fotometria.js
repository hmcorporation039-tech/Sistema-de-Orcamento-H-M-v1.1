// Teste da fotometria e do cálculo ponto a ponto (fase 5 do roteiro — iluminação no 3D),
// sem navegador e SEM arquivo de fabricante: os IES (LM-63) e LDT (EULUMDAT) são gerados
// aqui a partir de distribuições conhecidas, com fluxo e intensidades conferidos à mão.
// Rodar: node skills/_comum/fotometria/teste-fotometria.js
const assert = require('assert');
const F = require('./leitor');
const P = require('./pontoAPonto');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};
const perto = (v, alvo, tol, rot) => assert.ok(Math.abs(v - alvo) <= tol, `${rot || ''} ${v} ≠ ${alvo} (± ${tol})`);
const rad = (g) => (g * Math.PI) / 180;
const passos = (a, b, p) => { const r = []; for (let x = a; x <= b + 1e-9; x += p) r.push(Math.round(x * 100) / 100); return r; };

// IES LM-63-2002 sintético: I(C, γ) dada por uma função
function ies({ V = passos(0, 90, 5), H = [0], fn, lumens = -1, mult = 1, fatorReator = 1, tilt = 'NONE', tipo = 1 }) {
  const cd = H.map(c => V.map(g => (fn(c, g)).toFixed(3)).join(' ')).join('\n');
  return ['IESNA:LM-63-2002', '[TEST] SINTETICO-H&M', '[MANUFAC] Teste', '[LUMCAT] PL-TESTE', `TILT=${tilt}`,
    ...(tilt === 'INCLUDE' ? ['1', '3', '0 45 90', '1 0.9 0.8'] : []),
    `1 ${lumens} ${mult} ${V.length} ${H.length} ${tipo} 2 0.6 0.6 0.05`, `${fatorReator} 1 36`, V.join(' '), H.join(' '), cd, ''].join('\r\n');
}

// LDT (EULUMDAT) sintético; fn em cd/klm; planos guardados conforme a simetria
function ldt({ isym, mc = 24, fluxo = 2000, fn, G = passos(0, 180, 5) }) {
  const C = passos(0, 360 - 360 / mc, 360 / mc);
  const idx = isym === 0 ? [...Array(mc).keys()] : isym === 1 ? [0] : isym === 2 ? [...Array(mc / 2 + 1).keys()] : isym === 3 ? [...Array(mc / 2 + 1).keys()].map(k => (3 * mc) / 4 + k) : [...Array(mc / 4 + 1).keys()];
  const vals = idx.flatMap(k => G.map(g => fn(C[k % mc], g).toFixed(4)));
  return ['H&M teste', '1', String(isym), String(mc), String(360 / mc), String(G.length), '5', 'REL-1', 'Luminaria sintetica', 'LS-1', 'sintetica.ldt', '02/11/2026',
    '600', '600', '50', '590', '590', '0', '0', '0', '0', '100', '100', '1.0', '0', '1', '1', 'LED', String(fluxo), '4000', '80', '36',
    ...Array(10).fill('0.5'), ...C.map(String), ...G.map(String), ...vals, ''].join('\r\n');
}

const lamb = (I0) => (c, g) => (g <= 90 ? I0 * Math.cos(rad(g)) : 0);

caso('IES simetria de eixo (lambertiana 1.000 cd): Φ = π·I0 e I(γ) = I0·cos γ', () => {
  const f = F.lerIes(ies({ fn: lamb(1000) }), 'teste.ies');
  assert.strictEqual(f.fonte, 'ies');
  assert.strictEqual(f.simetria, 'eixo');
  assert.deepStrictEqual(f.C, [0]);
  perto(f.fluxo_lm, Math.PI * 1000, 15, 'fluxo');
  const I = P.avaliador(f);
  perto(I(0, 0), 1000, 0.1); perto(I(123, 60), 500, 1); perto(I(0, 120), 0, 1e-9);
  assert.strictEqual(f.absoluta, true);
});

caso('IES em quadrantes (0–90°) com TILT=INCLUDE, multiplicador e fator de reator', () => {
  const fn = (c, g) => (g <= 90 ? 1000 * Math.cos(rad(g)) * (1 + 0.5 * Math.cos(rad(2 * c))) : 0);
  const f = F.lerIes(ies({ H: passos(0, 90, 15), fn, mult: 2, fatorReator: 0.9, tilt: 'INCLUDE' }));
  assert.strictEqual(f.simetria, 'quadrantes');
  assert.ok(f.avisos.some(a => /TILT=INCLUDE/.test(a)));
  const I = P.avaliador(f);
  const k = 1.8; // 2 × 0,9
  perto(I(0, 30), k * 1000 * Math.cos(rad(30)) * 1.5, 2, 'C0');
  perto(I(180, 30), I(0, 30), 1e-6, 'C180 = C0');
  perto(I(90, 30), k * 1000 * Math.cos(rad(30)) * 0.5, 2, 'C90');
  perto(I(270, 30), I(90, 30), 1e-6, 'C270 = C90');
  perto(I(135, 30), I(45, 30), 1e-6, 'C135 = C45');
  // Φ = k · 1000 · ∫cos γ sen γ dγ · ∫(1 + 0,5 cos 2C) dC = k · 1000 · ½ · 2π
  perto(f.fluxo_lm, k * 1000 * Math.PI, 0.01 * k * 1000 * Math.PI, 'fluxo');
});

caso('IES C0–C180 e C90–C270 (bilateral) e 0–360° (sem simetria)', () => {
  const fn = (c, g) => (g <= 90 ? 800 * Math.cos(rad(g)) * (1 + 0.5 * Math.cos(rad(c))) : 0);
  const f = F.lerIes(ies({ H: passos(0, 180, 15), fn }));
  assert.strictEqual(f.simetria, 'C0-C180');
  const I = P.avaliador(f);
  perto(I(300, 40), I(60, 40), 1e-6); perto(I(0, 40), 800 * Math.cos(rad(40)) * 1.5, 1);
  const fs = (c, g) => (g <= 90 ? 800 * Math.cos(rad(g)) * (1 + 0.5 * Math.sin(rad(c))) : 0);
  const f2 = F.lerIes(ies({ H: passos(90, 270, 15), fn: fs }));
  assert.strictEqual(f2.simetria, 'C90-C270');
  const I2 = P.avaliador(f2);
  perto(I2(30, 40), I2(150, 40), 1e-6); perto(I2(90, 40), 800 * Math.cos(rad(40)) * 1.5, 1); perto(I2(270, 40), 800 * Math.cos(rad(40)) * 0.5, 1);
  const f3 = F.lerIes(ies({ H: passos(0, 360, 15), fn: fs }));
  assert.strictEqual(f3.simetria, 'nenhuma');
  perto(P.avaliador(f3)(210, 40), fs(210, 40), 1);
});

caso('IES tipo B recusado; arquivo inválido cai na distribuição aproximada com aviso', () => {
  assert.throws(() => F.lerIes(ies({ fn: lamb(100), tipo: 2 })), /tipo B/);
  assert.throws(() => F.lerFotometria('qualquer coisa'), /não reconhecido/);
  const f = F.fotometriaDaLuminaria({ arquivo: { nome: 'x.ies', conteudo: 'IESNA:LM-63-2002\nsem tilt' }, fluxo: 3000, angulo: 120 });
  assert.strictEqual(f.fonte, 'aproximada');
  assert.match(f.avisos[0], /x\.ies não lido/);
});

caso('LDT simetria 1 (eixo), em cd/klm × fluxo das lâmpadas', () => {
  const f = F.lerLdt(ldt({ isym: 1, fn: lamb(1000 / Math.PI), fluxo: 2000 }), 'a.ldt');
  assert.deepStrictEqual([f.fonte, f.simetria], ['ldt', 'eixo']);
  perto(f.fluxo_lm, 2000, 20, 'fluxo');
  perto(P.avaliador(f)(77, 0), 2000 / Math.PI, 0.5, 'I0');
  assert.strictEqual(f.fluxo_lampadas_lm, 2000);
  assert.strictEqual(F.lerFotometria(ldt({ isym: 1, fn: lamb(318) }), 'b.ldt').fonte, 'ldt');
});

caso('LDT simetrias 0, 2, 3 e 4: os planos guardados e os espelhados batem com a função', () => {
  const casos = [
    [0, (c, g) => (g <= 90 ? 300 * Math.cos(rad(g)) * (1 + 0.4 * Math.cos(rad(c)) + 0.2 * Math.sin(rad(c))) : 0)],
    [2, (c, g) => (g <= 90 ? 300 * Math.cos(rad(g)) * (1 + 0.5 * Math.cos(rad(c))) : 0)],
    [3, (c, g) => (g <= 90 ? 300 * Math.cos(rad(g)) * (1 + 0.5 * Math.sin(rad(c))) : 0)],
    [4, (c, g) => (g <= 90 ? 300 * Math.cos(rad(g)) * (1 + 0.5 * Math.cos(rad(2 * c))) : 0)],
  ];
  for (const [isym, fn] of casos) {
    const f = F.lerLdt(ldt({ isym, fn, fluxo: 1000 }));
    const I = P.avaliador(f);
    for (const c of [0, 45, 90, 135, 180, 210, 270, 330]) perto(I(c, 30), fn(c, 30), 0.03 * 300 + 1, `isym ${isym} C${c}`);
    // Φ = 300 · ½ · 2π (os termos em cos/sen de C somam zero na volta)
    perto(f.fluxo_lm, 300 * Math.PI, 0.02 * 300 * Math.PI, `isym ${isym} fluxo`);
  }
});

caso('sem arquivo: distribuição simétrica aproximada pelo fluxo e pelo ângulo (cos^m), avisada sem ângulo', () => {
  const f = F.distribuicaoAproximada(3000, 120);
  assert.strictEqual(f.fonte, 'aproximada');
  perto(f.expoente, 1, 1e-3, 'm');
  perto(f.fluxo_lm, 3000, 30, 'fluxo');
  perto(P.avaliador(f)(0, 0), 3000 / Math.PI, 0.5, 'I0 = Φ(m+1)/2π');
  const e = F.distribuicaoAproximada(1000, 60);
  const I = P.avaliador(e);
  perto(I(0, 30) / I(0, 0), 0.5, 0.01, 'meia intensidade na borda do facho');
  perto(e.fluxo_lm, 1000, 15, 'fluxo 60°');
  const sem = F.fotometriaDaLuminaria({ fluxo: 2000 });
  assert.strictEqual(sem.angulo_graus, F.ANGULO_PADRAO);
  assert.match(sem.avisos.join(' '), /não informado.*CONFERIR/);
});

caso('ponto a ponto: E = I·cos γ / d² conferido à mão (luminária lambertiana)', () => {
  const f = F.distribuicaoAproximada(Math.PI * 1000, 120); // I0 = 1.000 cd
  const I = P.avaliador(f);
  const lum = [{ x: 0, y: 0, z: 2.75, I, fator: 1 }];
  // h = 2,0 m: sob a luminária E = I0 / h² = 250 lx
  perto(P.iluminanciaNoPonto(0, 0, 0.75, lum), 250, 0.5, 'nadir');
  // a 2 m de lado: d² = 8, cos γ = 0,707, I = 707 cd → E = 707 · 0,707 / 8 = 62,5 lx (= I0·h²/d⁴)
  perto(P.iluminanciaNoPonto(2, 0, 0.75, lum), 1000 * 4 / 64, 0.5, 'a 2 m');
  // nível 50 % e FM 0,8 multiplicam
  perto(P.iluminanciaNoPonto(0, 0, 0.75, [{ ...lum[0], fator: 0.5 * 0.8 }]), 100, 0.3, 'nível × FM');
  // luminária abaixo do plano não ilumina
  assert.strictEqual(P.iluminanciaNoPonto(0, 0, 3, lum), 0);
});

caso('grade no ambiente: Em, Emín, U0; sala em L só conta os pontos dentro', () => {
  const f = F.distribuicaoAproximada(4000, 120);
  const pol = [[0, 0], [4, 0], [4, 4], [0, 4]];
  const luminarias = [[1, 1], [3, 1], [1, 3], [3, 3]].map(([x, y]) => ({ x, y, z: 2.8, fotometria: f }));
  const r = P.calcularAmbiente({ poligono: pol, plano: 0.8, luminarias, fm: 0.8, nx: 4, ny: 4 });
  assert.strictEqual(r.valores.length, 16);
  // simetria: os 4 cantos iguais, os 4 centrais iguais
  perto(r.valores[0], r.valores[15], 1e-9); perto(r.valores[5], r.valores[10], 1e-9);
  perto(r.u0, r.emin / r.em, 1e-12);
  assert.ok(r.emin < r.em && r.em < r.emax);
  // centro da célula (0,5; 0,5): conta à mão as 4 luminárias
  const I0 = 4000 / Math.PI, h = 2;
  const e = [[0.5, 0.5], [2.5, 0.5], [0.5, 2.5], [2.5, 2.5]].reduce((s, [dx, dy]) => { const d2 = dx * dx + dy * dy + h * h; return s + I0 * h * h / (d2 * d2); }, 0) * 0.8;
  perto(r.valores[0], e, 0.01 * e, 'canto à mão');
  const L = [[0, 0], [6, 0], [6, 3], [3, 3], [3, 6], [0, 6]];
  const g = P.gradeNoPoligono(L, { nx: 6, ny: 6 });
  assert.strictEqual(g.centros.length, 27, 'L de 27 m² em células de 1 m²');
  const passo = P.gradeNoPoligono(pol, { passo: 0.001, maxCelulas: 400 });
  assert.ok(passo.centros.length <= 400, 'teto de células (celular)');
});

caso('falsa-cor e escala da legenda', () => {
  assert.deepStrictEqual(P.corFalsa(0).map(v => Math.round(v * 100)), [12, 10, 45]);
  assert.deepStrictEqual(P.corFalsa(1).map(v => Math.round(v * 100)), [90, 15, 10]);
  assert.deepStrictEqual(P.corFalsa(2), P.corFalsa(1));
  assert.deepStrictEqual(P.escala(437), { max: 500, marcas: [0, 100, 200, 300, 400, 500] });
  assert.strictEqual(P.escala(1210).max, 1500);
});

console.log(`fotometria e ponto a ponto (fase 5): ${ok} casos ok`);
