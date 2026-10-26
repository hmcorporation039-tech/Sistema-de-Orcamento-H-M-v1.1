// Leitura vetorial de prancha (utils/pdfVetorial.js): PDF SINTÉTICO montado aqui
// mesmo, com legenda (símbolo + descrição, traço + descrição), símbolos e
// eletrodutos na planta e escala no carimbo — nenhum dado de cliente.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const { lerPdfVetorial } = require('../src/utils/pdfVetorial');

// PDF mínimo (1 página A3 paisagem, Helvetica padrão). y do PDF cresce para cima.
function montarPdf(conteudo) {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1191 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const pos = [];
  objs.forEach((o, i) => { pos.push(Buffer.byteLength(pdf, 'latin1')); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map(p => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const texto = (x, y, s, t = 8) => `BT /F1 ${t} Tf ${x} ${y} Td (${s}) Tj ET`;
const quadrado = (x, y, l, cor) => `${cor} rg ${x} ${y} ${l} ${l} re f`;           // símbolo cheio
const circulo = (cx, cy, r, cor) => {                                              // símbolo vazado (4 curvas)
  const k = 0.5523 * r;
  return `${cor} RG 1 w ${cx + r} ${cy} m ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} c ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} c `
    + `${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} c ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} c S`;
};
const reta = (x1, y1, x2, y2, cor, w) => `${cor} RG ${w} w ${x1} ${y1} m ${x2} ${y2} l S`;

function pranchaSintetica() {
  const c = [];
  // legenda no canto direito
  c.push(texto(950, 780, 'LEGENDA'));
  c.push(quadrado(950, 755, 6, '1 0 0'), texto(970, 756, 'TOMADA BAIXA 2P+T 10A'));
  c.push(circulo(953, 738, 4, '0 0.6 0'), texto(970, 735, 'DETECTOR DE FUMACA PONTUAL'));
  c.push(reta(945, 718, 965, 718, '0 0 1', 2), texto(970, 715, 'ELETRODUTO PVC 25 MM'));
  // planta: 7 tomadas (2 delas giradas não fazem diferença num quadrado), 3 detectores
  [[100, 100], [160, 100], [220, 100], [100, 300], [300, 300], [400, 420], [520, 420]].forEach(([x, y]) => c.push(quadrado(x, y, 6, '1 0 0')));
  [[200, 200], [350, 200], [500, 200]].forEach(([x, y]) => c.push(circulo(x, y, 4, '0 0.6 0')));
  // eletrodutos: 3 trechos de 100 pt + 1 de 50 pt = 350 pt; uma parede preta grossa (não conta)
  c.push(reta(100, 120, 200, 120, '0 0 1', 2), reta(200, 120, 300, 120, '0 0 1', 2), reta(300, 120, 300, 220, '0 0 1', 2), reta(300, 220, 350, 220, '0 0 1', 2));
  c.push(reta(50, 50, 700, 50, '0 0 0', 5));
  // nome de sala com símbolo ao lado, fora da legenda: não vira item
  c.push(quadrado(600, 600, 6, '1 0 0'), texto(615, 601, 'SALA DE REUNIOES'));
  c.push(texto(1000, 60, 'ESC. 1:50'));
  return montarPdf(c.join('\n'));
}

let ok = 0;
async function caso(nome, fn) {
  try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
}

(async () => {
  const [p] = await lerPdfVetorial(pranchaSintetica());

  await caso('legenda achada abaixo do título e escala do carimbo', () => {
    assert.ok(p.legenda, 'sem região de legenda');
    assert.strictEqual(p.escala, 50);
  });

  await caso('símbolos contados pela assinatura da legenda (sem a amostra da própria legenda)', () => {
    const tom = p.itens.find(i => /TOMADA BAIXA/.test(i.descricao));
    const det = p.itens.find(i => /DETECTOR/.test(i.descricao));
    // 7 na planta + 1 ao lado de "SALA DE REUNIOES" (mesmo símbolo, fora da legenda) = 8
    assert.strictEqual(tom?.quantidade, 8, JSON.stringify(tom));
    assert.strictEqual(det?.quantidade, 3, JSON.stringify(det));
    assert.ok(!p.itens.some(i => /SALA DE REUNIOES/.test(i.descricao)), 'texto da planta virou item de legenda');
  });

  await caso('eletroduto medido pelo estilo do traço da legenda, convertido pela escala', () => {
    const el = p.itens.find(i => i.tipo === 'linha' && /ELETRODUTO/.test(i.descricao));
    assert.strictEqual(el?.comprimento_pt, 350, JSON.stringify(el));
    // 350 pt × 25,4/72 mm × 50 = 6,17 m
    assert.ok(Math.abs(el.metros - 6.2) < 0.06, `metros ${el.metros}`);
    assert.ok(!p.itens.some(i => i.tipo === 'linha' && i.estilo.cor === '#000000'), 'parede contada como linha de legenda');
  });

  await caso('PDF sem desenho (só texto) não quebra e não inventa itens', async () => {
    const [q] = await lerPdfVetorial(montarPdf(texto(100, 700, 'MEMORIAL DESCRITIVO')));
    assert.strictEqual(q.itens.length, 0);
  });

  console.log(`pdf vetorial: ${ok} casos ok`);
})();
