// Leitura vetorial (utils/pdfVetorial.js) com prancha PESADA: o índice de textos,
// a grade dos símbolos e a união-busca iterativa não podem mudar o resultado,
// só o tempo. Geometria sintética montada aqui — nenhum dado de cliente.
// Rodar: node testes/pdfVetorialDesempenho.test.js (pasta backend).
const assert = require('assert');
const { simbolos, analisarGeometria, lerPdfVetorial, paraTestes } = require('../src/utils/pdfVetorial');
const { textoAoLado, uniaoBusca } = paraTestes;

let ok = 0;
async function caso(nome, fn) {
  try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
}

// gerador determinístico (o teste dá sempre o mesmo resultado)
let semente = 20261027;
const rnd = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff; };
const traco = (caixa, extra = {}) => ({ cheio: false, traco: true, fill: '#000000', stroke: '#000000', lw: 0.25, dash: '', caixa, comp: caixa[2] - caixa[0], segs: 1, reto: true, ...extra });

// Busca LINEAR de referência (a implementação antes do índice), para comparar
const ehDescricao = (s) => s.length >= 5 && (s.match(/[A-Za-zÀ-ú]/g) || []).length >= 4 && !/^(LEGENDA|NOTAS?|OBS|SOBE|DESCE|SIMBOLOGIA|CONVEN[ÇC][ÕO]ES|TABELA DE)\b/i.test(s);
function textoAoLadoLinear(caixa, textos, distMax = 70) {
  const cy = (caixa[1] + caixa[3]) / 2, h = Math.max(caixa[3] - caixa[1], 3);
  let melhor = null;
  for (const t of textos) {
    if (!t.horizontal || !ehDescricao(t.s)) continue;
    const ty = t.y - t.h * 0.35;
    if (Math.abs(ty - cy) > Math.max(h * 0.7, t.h * 0.8)) continue;
    const dx = t.x - caixa[2];
    if (dx < -0.5 || dx > distMax) continue;
    if (!melhor || dx < melhor.dx) melhor = { ...t, dx };
  }
  if (!melhor) return null;
  const linha = textos.filter(t => t.horizontal && Math.abs(t.y - melhor.y) < melhor.h * 0.3 && t.x >= melhor.x - 0.5 && t.x < melhor.x + 400).sort((a, b) => a.x - b.x);
  let fimX = melhor.x - 1;
  const partes = [];
  for (const t of linha) { if (t.x - fimX > melhor.h * 2.5) break; partes.push(t.s); fimX = t.x + t.w; }
  return { texto: partes.join(' ').replace(/\s+/g, ' ').trim(), x: melhor.x, y: melhor.y, h: melhor.h };
}

(async () => {
  await caso('20 mil traços encadeados não estouram a pilha (união-busca iterativa)', () => {
    const cadeia = [];
    for (let i = 0; i < 20000; i++) cadeia.push(traco([i, 0, i + 1.2, 1.2]));
    const blobs = simbolos(cadeia); // antes: RangeError (Maximum call stack size exceeded)
    // a cadeia inteira vira um bloco só, grande demais para símbolo: nenhum símbolo
    assert.strictEqual(blobs.length, 0);
    const { raiz, unir } = uniaoBusca(100000);
    for (let i = 1; i < 100000; i++) unir(i - 1, i);
    assert.strictEqual(raiz(0), raiz(99999));
  });

  await caso('muitos traços na mesma coluna: rápido e com os mesmos grupos', () => {
    const col = [];
    for (let i = 0; i < 20000; i++) col.push(traco([0, i * 3, 30, i * 3 + 0.5], { stroke: '#ff0000' }));
    // quadrados 2×2 a 0,4 pt um do outro (tolerância 0,6) → pares
    for (let i = 0; i < 2000; i++) col.push(traco([100, i * 10, 102, i * 10 + 2], { stroke: '#00ff00' }), traco([102.4, i * 10, 104.4, i * 10 + 2], { stroke: '#00ff00' }));
    const t0 = Date.now();
    const blobs = simbolos(col);
    const ms = Date.now() - t0;
    assert.ok(ms < 1500, `${ms} ms`);
    // vermelhos: 0,5 pt de altura, não viram símbolo (e não se juntam: vão de 2,5 pt); verdes: 2000 pares de 4,4 × 2
    assert.strictEqual(blobs.length, 2000);
    assert.ok(blobs.every(b => b.n === 2 && Math.abs(b.w - 4.4) < 1e-9 && b.h === 2));
  });

  await caso('índice de textos dá o mesmo texto da busca linear (500 consultas aleatórias)', () => {
    const textos = [];
    const palavras = ['TOMADA BAIXA 2P+T', 'DETECTOR DE FUMACA', 'ELETRODUTO PVC 25', 'SALA', 'QD-1', 'LUMINARIA LED'];
    for (let i = 0; i < 3000; i++) textos.push({ s: palavras[i % palavras.length], x: rnd() * 1000, y: rnd() * 800, h: [3, 5, 8][i % 3], w: 30, horizontal: rnd() < 0.9 });
    // empates de dx e pedaços da mesma linha (o desempate tem de ser o mesmo)
    for (let i = 0; i < 50; i++) textos.push({ s: 'INTERRUPTOR SIMPLES', x: 500, y: 400, h: 5, w: 40, horizontal: true }, { s: 'COMPLEMENTO', x: 520, y: 400.5, h: 5, w: 40, horizontal: true });
    let iguais = 0, achados = 0;
    for (let q = 0; q < 500; q++) {
      const x = q % 10 === 0 ? 490 : rnd() * 1000, y = q % 10 === 0 ? 395 : rnd() * 800, w = rnd() * 30, h = rnd() * 10, d = [2, 40, 70][q % 3];
      const a = textoAoLadoLinear([x, y, x + w, y + h], textos, d), b = textoAoLado([x, y, x + w, y + h], textos, d);
      assert.deepStrictEqual(b, a, `consulta ${q}`);
      iguais++; if (a) achados++;
    }
    assert.ok(achados > 50, `só ${achados} consultas acharam texto — teste fraco`);
  });

  await caso('30 mil caminhos × 8 mil textos: segundos, não minutos', () => {
    const cam = [], tex = [];
    for (let i = 0; i < 30000; i++) { const x = (i % 300) * 10, y = Math.floor(i / 300) * 10; cam.push(traco([x, y, x + 20, y + 0.1], { stroke: '#00ff00', lw: 0.5, comp: 20 })); }
    for (let i = 0; i < 8000; i++) tex.push({ s: 'Tomada baixa 2P+T', x: (i % 100) * 30, y: Math.floor(i / 100) * 12, h: 3, w: 25, horizontal: true });
    const t0 = Date.now();
    analisarGeometria({ caminhos: cam, textos: tex, largura: 3000, altura: 3000 }); // antes: ~70 s
    const ms = Date.now() - t0;
    assert.ok(ms < 10000, `${ms} ms`);
  });

  await caso('página acima do limite de traços é pulada com aviso (não some calada)', async () => {
    // PDF mínimo com 5 traços; limite 3 → aviso
    const conteudo = Array.from({ length: 5 }, (_, i) => `0 0 1 RG 1 w ${100 + i * 50} 100 m ${140 + i * 50} 100 l S`).join('\n');
    const objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Contents 4 0 R >>',
      `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    ];
    let pdf = '%PDF-1.4\n';
    const pos = [];
    objs.forEach((o, i) => { pos.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map(p => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const [p] = await lerPdfVetorial(Buffer.from(pdf, 'latin1'), { maxCaminhos: 3 });
    assert.strictEqual(p.caminhos, 5);
    assert.deepStrictEqual(p.itens, []);
    assert.match(p.aviso, /limite 3/);
    const [q] = await lerPdfVetorial(Buffer.from(pdf, 'latin1'));
    assert.strictEqual(q.aviso, undefined);
    assert.strictEqual(p.pulada?.motivo, 'tracos');
  });

  // (29/10/2026) a grade de 41 pt ficava quadrática com hachura/texto explodido em
  // traços: 4,5 mil traços numa célula, 47 s numa prancha real. Grade fina: o mesmo
  // resultado de uma comparação par a par, em pouco tempo.
  await caso('símbolos: grade fina dá os mesmos grupos da comparação par a par', () => {
    const cam = [];
    for (let i = 0; i < 1500; i++) { const x = rnd() * 400, y = rnd() * 300, w = rnd() * 12, h = rnd() * 12; cam.push(traco([x, y, x + w, y + h], { stroke: ['#ff0000', '#00ff00'][i % 2] })); }
    for (let i = 0; i < 1500; i++) { const x = 500 + rnd() * 30, y = rnd() * 30, w = rnd() * 2, h = rnd() * 2; cam.push(traco([x, y, x + w, y + h], { stroke: '#0000ff' })); }
    // referência: todos os pares, mesmo teste de "tocar"
    const ref = (lista) => {
      const grupos = new Map();
      lista.forEach(c => { const [x0, y0, x1, y1] = c.caixa; if (x1 - x0 > 40 || y1 - y0 > 40) return; const k = `S${c.stroke}|${c.lw}`; (grupos.get(k) || grupos.set(k, []).get(k)).push(c); });
      const saida = [];
      for (const [chave, l] of grupos) {
        const { raiz, unir } = uniaoBusca(l.length);
        for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
          const [A, B] = l[j].caixa[0] < l[i].caixa[0] ? [l[j].caixa, l[i].caixa] : [l[i].caixa, l[j].caixa];
          if (B[0] <= A[2] + 0.6 && B[1] <= A[3] + 0.6 && B[3] >= A[1] - 0.6) unir(i, j);
        }
        const por = new Map();
        l.forEach((c, i) => { const r = raiz(i); const b = por.get(r) || { chave, caixa: [Infinity, Infinity, -Infinity, -Infinity], n: 0 }; b.caixa = [Math.min(b.caixa[0], c.caixa[0]), Math.min(b.caixa[1], c.caixa[1]), Math.max(b.caixa[2], c.caixa[2]), Math.max(b.caixa[3], c.caixa[3])]; b.n++; por.set(r, b); });
        for (const b of por.values()) { const w = b.caixa[2] - b.caixa[0], h = b.caixa[3] - b.caixa[1]; if (w > 60 || h > 60 || Math.max(w, h) < 1.5 || Math.min(w, h) < 1) continue; saida.push(b); }
      }
      return saida;
    };
    const chave = (l) => l.map(b => `${b.chave}|${b.caixa.map(v => v.toFixed(6)).join(',')}|${b.n}`).sort();
    assert.deepStrictEqual(chave(simbolos(cam)), chave(ref(cam)));
  });

  await caso('hachura densa (30 mil traços num quadrado de 40 pt): segundo, não minuto', () => {
    const cam = [];
    for (let i = 0; i < 30000; i++) { const x = rnd() * 38, y = rnd() * 38; cam.push(traco([x, y, x + 0.4, y + 0.4], { stroke: '#808080' })); }
    const t0 = Date.now();
    simbolos(cam);
    const ms = Date.now() - t0;
    assert.ok(ms < 3000, `${ms} ms`); // antes: ~450 milhões de pares
  });

  // PDF de várias páginas, cada uma com `n` traços curtos
  const pdfPaginas = (paginas, n) => {
    const objs = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${paginas.map((_, i) => `${3 + 2 * i} 0 R`).join(' ')}] /Count ${paginas.length} >>`];
    paginas.forEach((_, i) => {
      const conteudo = Array.from({ length: n }, (__, k) => `0 0 1 RG 1 w ${10 + (k % 500)} ${10 + Math.floor(k / 500) * 3} m ${11 + (k % 500)} ${10 + Math.floor(k / 500) * 3} l S`).join('\n');
      objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Contents ${4 + 2 * i} 0 R >>`, `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`);
    });
    let pdf = '%PDF-1.4\n';
    const pos = [];
    objs.forEach((o, i) => { pos.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map(p => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf, 'latin1');
  };

  // (29/10/2026) o limite agora é de TEMPO (por página e do arquivo), não de traços
  await caso('página que passa do tempo-limite volta com aviso e motivo, sem contagem pela metade', async () => {
    const pdf = pdfPaginas([1], 8000);
    const [p] = await lerPdfVetorial(pdf, { tempoPaginaMs: 1 });
    assert.strictEqual(p.pulada?.motivo, 'tempo', JSON.stringify(p));
    assert.deepStrictEqual(p.itens, []);
    assert.match(p.aviso, /tempo-limite/);
    const [q] = await lerPdfVetorial(pdf, { tempoLimiteMs: -1 });
    assert.strictEqual(q.pulada?.motivo, 'tempo_total');
    const [r] = await lerPdfVetorial(pdf);
    assert.strictEqual(r.pulada, undefined);
    assert.strictEqual(r.caminhos, 8000);
  });

  await caso('páginas além de maxPaginas não somem caladas', async () => {
    const v = await lerPdfVetorial(pdfPaginas([1, 2, 3, 4], 5), { maxPaginas: 2 });
    assert.deepStrictEqual(v.map(p => p.pagina), [1, 2, null]);
    assert.strictEqual(v[2].pulada.motivo, 'limite_paginas');
    assert.deepStrictEqual(v[2].pulada.paginas, [3, 4]);
    assert.match(v[2].aviso, /páginas 3 a 4 não lidas \(limite de 2 páginas/);
  });

  await caso('na thread à parte, o mesmo resultado que no processo', async () => {
    const pdf = pdfPaginas([1, 2], 300);
    const semMs = (l) => l.map(({ ms, ...p }) => p);
    assert.deepStrictEqual(semMs(await lerPdfVetorial(pdf)), semMs(await lerPdfVetorial(pdf, { emThread: false })));
  });

  console.log(`pdf vetorial (desempenho): ${ok} casos ok`);
})();
