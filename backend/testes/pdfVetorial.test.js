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

  // (29/10/2026) unifilar na mesma folha: o "disjuntor" vermelho igual ao símbolo da
  // tomada não é tomada — só a planta é contada; folha só de unifilar não é contada
  const unifilar = (x0, y0) => {
    const c = [reta(x0, y0, x0, y0 + 240, '0 0 0', 2.5)];
    for (let i = 0; i < 12; i++) {
      const y = y0 + 10 + i * 20;
      c.push(reta(x0, y, x0 + 100, y, '0 0 0', 0.5), quadrado(x0 + 40, y - 3, 6, '1 0 0'), texto(x0 + 105, y - 2, `C${i + 1} 2x2,5mm2 DISJ 20A`, 6));
    }
    c.push(texto(x0, y0 - 20, 'DIAGRAMA UNIFILAR - QDC', 10), texto(x0, y0 - 32, 'SEM ESCALA', 7));
    return c.join('\n');
  };
  await caso('folha mista: símbolo no unifilar não conta; folha só de unifilar fica de fora', async () => {
    // a planta ganha as paredes de fora (sem elas, a folha seria só símbolos soltos + o unifilar)
    const paredes = [[80, 80, 580, 80], [580, 80, 580, 640], [580, 640, 80, 640], [80, 640, 80, 80]].map(([a, b, c, d]) => reta(a, b, c, d, '0 0 0', 1.5)).join('\n');
    const mista = montarPdf([pranchaSintetica().toString('latin1').match(/stream\n([\s\S]*?)\nendstream/)[1], paredes, unifilar(700, 300)].join('\n'));
    const [m] = await lerPdfVetorial(mista);
    assert.ok(m.folha && /diagrama unifilar/.test(m.folha.resumo), JSON.stringify(m.folha));
    assert.strictEqual(m.itens.find(i => /TOMADA BAIXA/.test(i.descricao))?.quantidade, 8, JSON.stringify(m.itens));
    const [u] = await lerPdfVetorial(montarPdf(unifilar(100, 300)));
    assert.ok(u.folha?.semPlanta && /sem contagem/.test(u.ignorada), JSON.stringify(u));
    assert.strictEqual(u.itens.length, 0);
    // achado legível por folha
    const { achadosDasFolhas } = require('../src/utils/analiseProjetoAchados');
    const [a] = achadosDasFolhas([{ arquivo: 'ele.pdf' }], [[{ ...u, pagina: 3 }, { ...m, pagina: 1 }]]);
    assert.match(a.observacao, /folha 3: diagrama unifilar.* — ignorada no 3D/);
    assert.match(a.observacao, /folha 1: .*diagrama unifilar/);
    assert.deepStrictEqual(achadosDasFolhas([{ arquivo: 'p.pdf' }], [[{ pagina: 1, folha: { tipo: 'planta', resumo: 'planta baixa', temPlanta: true, semPlanta: false, misto: false } }]]), []);
  });

  // (29/10/2026, limite anotado no 069e6f3) folha mista: o "CAM2"/"R3" escrito no
  // unifilar ao lado não pode cair na sala mais próxima da planta
  await caso('pontos por ambiente na folha mista: só os códigos da planta', async () => {
    const { calcularPontosPorAmbiente } = require('../src/utils/pontosPorAmbiente');
    const paredes = [[80, 80, 580, 80], [580, 80, 580, 640], [580, 640, 80, 640], [80, 640, 80, 80]].map(([a, b, c, d]) => reta(a, b, c, d, '0 0 0', 1.5)).join('\n');
    const planta = [texto(200, 400, 'SALA'), texto(200, 388, 'A=25,00m2'), texto(250, 350, 'CAM1'), texto(260, 330, 'R1')].join('\n');
    const noUnifilar = [texto(810, 333, 'CAM2'), texto(810, 373, 'R3')].join('\n');
    const pdf = montarPdf([pranchaSintetica().toString('latin1').match(/stream\n([\s\S]*?)\nendstream/)[1], paredes, planta, unifilar(700, 300), noUnifilar].join('\n'));
    const [m] = await lerPdfVetorial(pdf);
    assert.ok(m.folha?.regioes?.some(r => r.tipo === 'diagrama'), JSON.stringify(m.folha));
    const tudo = await calcularPontosPorAmbiente(pdf);
    assert.deepStrictEqual(tudo, [{ ambiente: 'SALA', cftv: 2, rede: 2, antena: 0 }], 'sem as regiões, a página inteira conta (comportamento antigo)');
    const soPlanta = await calcularPontosPorAmbiente(pdf, { regioesPorPagina: new Map([[1, m.folha.regioes]]) });
    assert.deepStrictEqual(soPlanta, [{ ambiente: 'SALA', cftv: 1, rede: 1, antena: 0 }]);
  });

  // (revisão de 29/10/2026) código repetido: só é o mesmo ponto se estiver a menos
  // de ~1 m (pela escala da folha); longe, ou em outra folha, conta de novo
  const montarPdfPaginas = (conteudos, { caixa = '0 0 1191 842', rotacao = 0 } = {}) => {
    const n = conteudos.length;
    const fonte = 3 + 2 * n;
    const objs = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${conteudos.map((_, i) => `${3 + 2 * i} 0 R`).join(' ')}] /Count ${n} >>`];
    conteudos.forEach((c, i) => objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [${caixa}] /Rotate ${rotacao} /Contents ${4 + 2 * i} 0 R /Resources << /Font << /F1 ${fonte} 0 R >> >> >>`,
      `<< /Length ${Buffer.byteLength(c, 'latin1')} >>\nstream\n${c}\nendstream`,
    ));
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    let pdf = '%PDF-1.4\n';
    const pos = [];
    objs.forEach((o, i) => { pos.push(Buffer.byteLength(pdf, 'latin1')); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map(p => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}`;
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf, 'latin1');
  };
  await caso('pontos por código: repetição a menos de 1 m conta uma vez; distante ou em outra folha conta de novo', async () => {
    const { calcularPontosPorAmbiente, lerPontosDoPdf } = require('../src/utils/pontosPorAmbiente');
    // folha 1 em 1:50 (1 m = 56,7 pt): CAM1 duplicado colado (8 pt), CAM2 em dois
    // pontos a 300 pt (5,3 m); sala com área "A: 20,00 m" + "2" sobrescrito à parte
    const f1 = [
      texto(200, 400, 'SALA'), texto(200, 388, 'A: 20,00 m'), texto(240, 391, '2', 5),
      texto(150, 300, 'CAM1'), texto(156, 305, 'CAM1'), texto(150, 250, 'CAM2'), texto(450, 250, 'CAM2'),
      texto(1000, 60, 'ESC. 1:50'),
    ].join('\n');
    // folha 2 (outro pavimento, sem escala): R1 e R2 de novo, mais o R1 duplicado a 20 pt (< 28 pt)
    const f2 = [texto(200, 400, 'QUARTO'), texto(200, 388, 'ÁREA = 12,00 m²'), texto(150, 300, 'R1'), texto(170, 300, 'R1'), texto(300, 300, 'R2')].join('\n');
    const f1b = f1 + '\n' + [texto(150, 200, 'R1'), texto(300, 200, 'R2')].join('\n');
    const pdf = montarPdfPaginas([f1b, f2]);
    const { porAmbiente, codigos } = await lerPontosDoPdf(pdf);
    assert.deepStrictEqual(porAmbiente, [{ ambiente: 'SALA', cftv: 3, rede: 2, antena: 0 }, { ambiente: 'QUARTO', cftv: 0, rede: 2, antena: 0 }]);
    assert.deepStrictEqual(codigos.cftv, { ocorrencias: 4, total: 3, totalUnicos: 2, juntadas: 1, repetidasDistantes: [{ numero: 2, pontos: 2, paginas: [1] }] });
    assert.deepStrictEqual(codigos.rede, {
      ocorrencias: 5, total: 4, totalUnicos: 2, juntadas: 1,
      repetidasDistantes: [{ numero: 1, pontos: 2, paginas: [1, 2] }, { numero: 2, pontos: 2, paginas: [1, 2] }],
    });
    assert.deepStrictEqual(codigos.limiares, [{ pagina: 1, escala: 50, limiar_pt: 56.7 }, { pagina: 2, escala: null, limiar_pt: 28 }]);
    // escala informada pelo leitor vetorial vale mais que o texto: em 1:200, 1 m = 14 pt e o R1 a 20 pt da folha 2 já é outro ponto
    const r200 = await lerPontosDoPdf(pdf, { escalaPorPagina: new Map([[2, 200]]) });
    assert.strictEqual(r200.codigos.rede.total, 5);
    // formato de sempre (lista); a contagem por posição vai junto, sem aparecer na lista nem no JSON
    const lista = await calcularPontosPorAmbiente(pdf);
    assert.deepStrictEqual(lista, porAmbiente);
    assert.strictEqual(lista.codigos.cftv.total, 3);
    assert.ok(!JSON.stringify(lista).includes('codigos'));
    // de volta ao total do texto (projetoParser)
    const { comRepeticoesPorPosicao } = require('../src/utils/projetoParser');
    const cam = comRepeticoesPorPosicao({ ocorrencias: 4, total: 2, totalUnicos: 2, unicas: [1, 2], repetidas: [1, 2] }, lista.codigos.cftv);
    assert.deepStrictEqual([cam.total, cam.totalUnicos], [3, 2]);
  });

  await caso('pontos por ambiente em folha girada (/Rotate 270): nome da sala inteiro, "acima" como se vê', async () => {
    const { lerPontosDoPdf } = require('../src/utils/pontosPorAmbiente');
    // texto girado como o CAD exporta numa folha de pé girada; linhas centradas:
    // a mais comprida começa mais "à esquerda" na folha (y do PDF maior)
    const girado = (x, y, s) => `BT /F1 8 Tf 0 -1 1 0 ${x} ${y} Tm (${s}) Tj ET`;
    const f = [girado(500, 600, 'SALA DE'), girado(490, 620, 'HEMODIALISE 1'), girado(480, 605, 'A= 40,00m2'), girado(470, 600, 'CAM1')].join('\n');
    const { porAmbiente } = await lerPontosDoPdf(montarPdfPaginas([f], { caixa: '0 0 842 1191', rotacao: 270 }));
    assert.deepStrictEqual(porAmbiente, [{ ambiente: 'SALA DE HEMODIALISE 1', cftv: 1, rede: 0, antena: 0 }]);
  });

  await caso('PDF sem desenho (só texto) não quebra e não inventa itens', async () => {
    const [q] = await lerPdfVetorial(montarPdf(texto(100, 700, 'MEMORIAL DESCRITIVO')));
    assert.strictEqual(q.itens.length, 0);
  });

  console.log(`pdf vetorial: ${ok} casos ok`);
})();
