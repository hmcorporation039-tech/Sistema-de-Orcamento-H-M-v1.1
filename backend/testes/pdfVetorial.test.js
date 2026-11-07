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

  // (29/10/2026) legenda em TABELA "Símbolo | Fornecedor | Descrição | QTDE": o
  // texto logo à direita do símbolo é a marca. Antes a descrição virava a marca e
  // luminárias diferentes da mesma marca viravam um item só.
  const circuloCheio = (cx, cy, r, cor) => `${cor} rg ${cx - r} ${cy - r} ${2 * r} ${2 * r} re f`;
  const tabelaLegenda = ({ reguas = true } = {}) => {
    const c = [texto(700, 700, 'SIMBOLO'), texto(760, 700, 'FORNECEDOR'), texto(860, 700, 'DESCRICAO'), texto(1080, 700, 'QTDE')];
    if (reguas) {
      for (const x of [690, 750, 850, 1070, 1110]) c.push(reta(x, 583, x, 715, '0.6 0.6 0.6', 0.5));
      for (const y of [715, 693, 671, 649, 627, 605, 583]) c.push(reta(690, y, 1110, y, '0.6 0.6 0.6', 0.5));
    }
    // linha 1: círculo vazado sozinho, duas linhas de descrição
    c.push(circulo(720, 682, 3, '1 0 0'), texto(760, 679, 'MARCA X'), texto(860, 684, 'LUMINARIA EMBUTIR AR70'), texto(860, 675, 'LAMPADA 5W 2700K'), texto(1085, 679, '4'));
    // linha 2: o MESMO círculo com miolo cheio — outra luminária, mesma marca
    c.push(circulo(720, 660, 3, '1 0 0'), circuloCheio(720, 660, 1, '1 0 0'), texto(760, 657, 'MARCA X'), texto(860, 657, 'LUMINARIA EMBUTIR AR111'), texto(1085, 657, '2'));
    // linha 3: símbolo que não aparece na planta
    c.push(quadrado(717, 635, 6, '0 0 1'), texto(760, 635, 'MARCA Y'), texto(860, 635, 'SPOT SOBREPOR 5W'), texto(1085, 635, '7'));
    // linha 4: perfil (traço) — medido em metros
    c.push(reta(705, 616, 735, 616, '1 0 1', 1.5), texto(760, 613, 'MARCA Z'), texto(860, 613, 'PERFIL LED SOBREPOR'), texto(1085, 613, '3'));
    // linha 5: o mesmo círculo da linha 1 e a mesma descrição (legenda repetida): uma entrada só, QTDE somada
    c.push(circulo(720, 594, 3, '1 0 0'), texto(760, 591, 'MARCA X'), texto(860, 594, 'LUMINARIA EMBUTIR AR70'), texto(860, 586, 'LAMPADA 5W 2700K'), texto(1085, 591, '1'));
    // planta: 3 círculos sozinhos, 2 com miolo, 100 pt de perfil
    [[100, 100], [200, 100], [300, 100]].forEach(([x, y]) => c.push(circulo(x, y, 3, '1 0 0')));
    [[100, 300], [200, 300]].forEach(([x, y]) => c.push(circulo(x, y, 3, '1 0 0'), circuloCheio(x, y, 1, '1 0 0')));
    c.push(reta(100, 400, 160, 400, '1 0 1', 1.5), reta(160, 400, 200, 400, '1 0 1', 1.5));
    // paredes da planta (sem elas a folha seria só a tabela, e folha sem planta não é contada)
    c.push(...[[60, 60, 560, 60], [560, 60, 560, 500], [560, 500, 60, 500], [60, 500, 60, 60]].map(([a, b, d, e]) => reta(a, b, d, e, '0 0 0', 1.5)));
    c.push(texto(1000, 60, 'ESC. 1:50'));
    return montarPdf(c.join('\n'));
  };
  for (const reguas of [true, false]) {
    await caso(`legenda em tabela ${reguas ? 'com' : 'sem'} réguas: descrição e QTDE pelas colunas, marca à parte`, async () => {
      const [p] = await lerPdfVetorial(tabelaLegenda({ reguas }));
      assert.deepStrictEqual(p.tabelasLegenda?.[0]?.colunas, ['SIMBOLO', 'FORNECEDOR', 'DESCRICAO', 'QTDE'], JSON.stringify(p.tabelasLegenda));
      const ar70 = p.itens.find(i => /AR70/.test(i.descricao)), ar111 = p.itens.find(i => /AR111/.test(i.descricao));
      assert.ok(!p.itens.some(i => /^MARCA/.test(i.descricao)), 'a marca virou descrição');
      assert.strictEqual(ar70?.descricao, 'LUMINARIA EMBUTIR AR70 LAMPADA 5W 2700K');
      assert.strictEqual(ar70.fornecedor, 'MARCA X');
      // mesmo círculo: o miolo separa as duas (antes, as duas ficavam com 5 e ambíguas)
      assert.strictEqual(ar70.quantidade, 3, JSON.stringify(ar70));
      assert.strictEqual(ar111?.quantidade, 2, JSON.stringify(ar111));
      assert.ok(!ar70.ambiguo && !ar111.ambiguo);
      // a quantidade do projetista fica no item (linhas 1 e 5: mesma assinatura e texto → uma entrada, 4 + 1)
      assert.strictEqual(ar70.qtde_projeto, 5);
      assert.strictEqual(ar111.qtde_projeto, 2);
      const perfil = p.itens.find(i => i.tipo === 'linha' && /PERFIL/.test(i.descricao));
      assert.strictEqual(perfil?.comprimento_pt, 100, JSON.stringify(perfil));
      assert.strictEqual(perfil.qtde_projeto, 3);
      // o que a tabela quantifica e a planta não tem fica à vista
      assert.deepStrictEqual(p.naoContados, [{ descricao: 'SPOT SOBREPOR 5W', qtde_projeto: 7, motivo: 'símbolo não encontrado na planta' }]);
    });
  }

  await caso('título SIMBOLOGIA / CONVENÇÕES / TABELA DE … também abre a legenda', async () => {
    for (const titulo of ['SIMBOLOGIA', 'CONVEN\\307\\325ES', 'TABELA DE TOMADAS']) {
      const pdf = pranchaSintetica().toString('latin1').replace('(LEGENDA)', `(${titulo})`);
      const [p] = await lerPdfVetorial(Buffer.from(pdf, 'latin1'));
      assert.ok(p.legenda, `${titulo}: sem legenda`);
      assert.strictEqual(p.itens.find(i => /TOMADA BAIXA/.test(i.descricao))?.quantidade, 8, titulo);
    }
    // tabela que não é legenda não abre legenda
    const pdf = pranchaSintetica().toString('latin1').replace('(LEGENDA)', '(TABELA DE CARGAS)');
    const [q] = await lerPdfVetorial(Buffer.from(pdf, 'latin1'));
    assert.strictEqual(q.legenda, null);
  });

  // (29/10/2026) folha com vistas em escalas diferentes: cada trecho na escala da sua vista
  await caso('escala por vista: planta 1:50 + ampliação 1:25; vista sem escala identificada bloqueia os metros', () => {
    const { analisarGeometria } = require('../src/utils/pdfVetorial');
    const t = (s, x, y, h = 8) => ({ s, x, y, h, w: s.length * h * 0.5, horizontal: true });
    const linha = (x0, y0, x1, y1) => ({ cheio: false, traco: true, fill: '#000000', stroke: '#0000ff', lw: 1, dash: '', caixa: [x0, y0, x1, y1], comp: Math.hypot(x1 - x0, y1 - y0), segs: 1, reto: true });
    const base = {
      largura: 1191, altura: 842,
      textos: [t('LEGENDA', 950, 100), t('ELETRODUTO PVC 25 MM', 975, 125), t('PLANTA BAIXA ESC. 1:50', 100, 420, 10), t('AMPLIACAO ESC. 1:25', 650, 320, 10), t('ESCALA: 1:50', 1000, 800)],
      caminhos: [linha(950, 122, 970, 122), linha(50, 50, 150, 50), linha(50, 80, 150, 80), linha(650, 100, 750, 100)],
    };
    const regioesFolha = [{ tipo: 'planta', caixa: [0, 0, 500, 400] }, { tipo: 'detalhe', caixa: [600, 0, 900, 300] }, { tipo: 'carimbo', caixa: [950, 700, 1190, 840] }];
    const r = analisarGeometria(base, { regioesFolha });
    const el = r.itens.find(i => i.tipo === 'linha');
    // 200 pt a 1:50 + 100 pt a 1:25 = 3,53 + 0,88 m (antes: 300 pt todos a 1:50 = 5,3 m)
    assert.strictEqual(el.metros, 4.4, JSON.stringify(el));
    assert.deepStrictEqual(el.escalas_pt, { '1:25': 100, '1:50': 200 });
    assert.deepStrictEqual(r.escalas.distintas, [25, 50]);
    assert.ok(!r.avisoEscala);
    // trecho fora das vistas, com duas escalas na folha: não chuta — metros null e aviso
    const r2 = analisarGeometria({ ...base, caminhos: [...base.caminhos, linha(520, 600, 600, 600)] }, { regioesFolha });
    const el2 = r2.itens.find(i => i.tipo === 'linha');
    assert.strictEqual(el2.metros, null);
    assert.strictEqual(el2.escala_indefinida_pt, 80);
    assert.match(r2.avisoEscala, /mais de uma escala \(1:25, 1:50\)/);
    // folha de escala única: como antes, tudo na escala do carimbo
    const r3 = analisarGeometria({ ...base, textos: base.textos.filter(x => !/AMPLIACAO/.test(x.s)) }, { regioesFolha });
    assert.strictEqual(r3.itens.find(i => i.tipo === 'linha').metros, 5.3);
    assert.strictEqual(r3.escalas, undefined);
    // vista com "SEM ESCALA": o trecho dela não vira metro
    const r4 = analisarGeometria({ ...base, textos: base.textos.map(x => (/AMPLIACAO/.test(x.s) ? t('DETALHE 1 - SEM ESCALA', 650, 320, 10) : x)) }, { regioesFolha });
    const el4 = r4.itens.find(i => i.tipo === 'linha');
    assert.strictEqual(el4.metros, 3.5);
    assert.strictEqual(el4.sem_escala_pt, 100);
  });

  await caso('detalhe fica fora da contagem só quando a folha tem planta', () => {
    const { resumoDaFolha } = require('../src/utils/pdfVetorial').paraTestes;
    const det = { tipo: 'detalhe', caixa: [600, 0, 900, 300] };
    const comPlanta = resumoDaFolha({ tipo: 'planta', resumo: 'planta', regioes: [{ tipo: 'planta', caixa: [0, 0, 500, 400] }, det] });
    assert.deepStrictEqual(comPlanta.regioesFora, [det.caixa]);
    const soDetalhe = resumoDaFolha({ tipo: 'detalhe', resumo: 'detalhe', regioes: [det] });
    assert.deepStrictEqual(soDetalhe.regioesFora, []);
  });

  // (fase 3, CAD-09) escala automática: informada → carimbo → nome do arquivo → portas → cotas; o resultado diz a origem
  await caso('escala: do carimbo, informada, pelo nome do arquivo e nenhuma (sem chutar)', async () => {
    assert.strictEqual(p.origemEscala, 'carimbo');
    const semCarimbo = montarPdf(pranchaSintetica().toString('latin1').match(/stream\n([\s\S]*?)\nendstream/)[1].replace(/BT[^\n]*\(ESC\. 1:50\) Tj ET/, ''));
    const [n] = await lerPdfVetorial(semCarimbo, { nomeArquivo: 'Planta Terreo - A1 1_50.pdf' });
    assert.deepStrictEqual([n.escala, n.origemEscala], [50, 'nome_arquivo']);
    assert.ok(Math.abs(n.itens.find(i => i.tipo === 'linha').metros - 6.2) < 0.06);
    const [i] = await lerPdfVetorial(semCarimbo, { nomeArquivo: 'Planta 1_50.pdf', escala: 100 });
    assert.deepStrictEqual([i.escala, i.origemEscala], [100, 'informada']);
    const [s] = await lerPdfVetorial(semCarimbo, { nomeArquivo: 'Planta Terreo 01-07.pdf' });
    assert.deepStrictEqual([s.escala, s.origemEscala], [null, null]);
    assert.strictEqual(s.itens.find(x => x.tipo === 'linha').metros, null);
    // o achado diz de onde veio a escala deduzida e pede para conferir
    const { achadosDoDesenho } = require('../src/utils/analiseProjetoAchados');
    const ach = achadosDoDesenho([{ arquivo: 'p.pdf', disciplinas: ['eletrica'] }], [[{ ...n, pagina: 1 }]], { maxPaginas: 15 });
    const esc = ach.find(a => a.tema === 'Escala da planta');
    assert.match(esc?.observacao || '', /1:50 do nome do arquivo \[CONFERIR\]/, JSON.stringify(ach.map(a => a.tema)));
  });

  await caso('título sublinhado da legenda ("DETALHES…") não vira tipo de linha', async () => {
    const c = pranchaSintetica().toString('latin1').match(/stream\n([\s\S]*?)\nendstream/)[1];
    const [q] = await lerPdfVetorial(montarPdf([c, reta(945, 700, 965, 700, '0.5 0 0.5', 1), texto(970, 697, 'DETALHES EM MARCENARIA, MARMORES, ETC.'), reta(100, 500, 400, 500, '0.5 0 0.5', 1)].join('\n')));
    assert.ok(!q.itens.some(i => /DETALHES/.test(i.descricao)), JSON.stringify(q.itens.map(i => i.descricao)));
    assert.ok(q.itens.some(i => i.tipo === 'linha' && /ELETRODUTO/.test(i.descricao)));
  });

  await caso('pontos por ambiente: câmera "CAM-01" / "CAM_02" / "CAM 3" também conta (antes só "CAM01")', async () => {
    const { lerPontosDoPdf } = require('../src/utils/pontosPorAmbiente');
    const f = [texto(200, 400, 'SALA'), texto(200, 388, 'A= 20,00m2'), texto(150, 300, 'CAM-01'), texto(400, 300, 'CAM_02'), texto(300, 200, 'CAM 3'), texto(500, 200, 'R-1')].join('\n');
    const { porAmbiente, codigos } = await lerPontosDoPdf(montarPdfPaginas([f]));
    assert.deepStrictEqual(porAmbiente, [{ ambiente: 'SALA', cftv: 3, rede: 0, antena: 0 }]); // "R-1" (revisão/corte) continua fora
    assert.strictEqual(codigos.cftv.totalUnicos, 3);
  });

  // ── revisão de 06/11/2026: escala da planta × detalhe, empate, "SEM ESCALA", giro e empate de símbolos ──
  const { analisarGeometria: ag } = require('../src/utils/pdfVetorial');
  const esc = require('../src/utils/pdfVetorial/escala');
  const tx = (s, x, y, h = 6) => ({ s, x, y, h, w: s.length * h * 0.5, horizontal: true });
  const traco = (x0, y0, x1, y1) => ({ cheio: false, traco: true, fill: '#000000', stroke: '#ff0000', lw: 0.5, dash: '', caixa: [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)], comp: Math.hypot(x1 - x0, y1 - y0), segs: 1, curvas: 0, reto: true });
  // amostra da legenda + 500 pt de eletroduto na planta (500 pt a 1:50 = 8,8 m)
  const folha = (textos) => ({ largura: 1200, altura: 800, caminhos: [traco(900, 103, 930, 103), traco(100, 400, 600, 400)], textos: [tx('LEGENDA', 900, 90), tx('ELETRODUTO PVC 25MM EMBUTIDO', 935, 105), ...textos] });
  const regioes = [{ tipo: 'planta', caixa: [50, 50, 650, 550] }, { tipo: 'detalhe', caixa: [680, 560, 850, 700] }, { tipo: 'carimbo', caixa: [950, 700, 1190, 790] }];
  const metros = (r) => r.itens.find(i => i.tipo === 'linha')?.metros;

  await caso('escala: "DETALHE ESC. 1:25" perto da planta não vira a escala dela — vale a do carimbo', () => {
    const r = ag(folha([tx('ESC. 1:50', 1000, 760), tx('DETALHE 1 - ESC. 1:25', 700, 600)]), { regioesFolha: regioes });
    assert.deepStrictEqual([r.escala, r.origemEscala, metros(r)], [50, 'carimbo', 8.8], JSON.stringify(r.itens));
    // detalhe longe (antes: metragem null com o carimbo dizendo 1:50)
    const longe = ag(folha([tx('ESC. 1:50', 1000, 760), tx('DETALHE 1 - ESC. 1:25', 900, 600)]), { regioesFolha: [...regioes.slice(0, 1), { tipo: 'detalhe', caixa: [880, 560, 1000, 700] }, regioes[2]] });
    assert.deepStrictEqual([longe.escala, metros(longe), longe.avisoEscala], [50, 8.8, undefined]);
    // título do detalhe numa linha e a escala na de baixo (o CAD separa os textos)
    const separado = ag(folha([tx('ESC. 1:50', 1000, 760), tx('DETALHE 1', 700, 592), tx('ESC. 1:25', 700, 602)]), { regioesFolha: regioes });
    assert.deepStrictEqual([separado.escala, metros(separado)], [50, 8.8]);
    // o trecho DENTRO do detalhe continua na escala dele
    const noDetalhe = ag({ ...folha([tx('ESC. 1:50', 1000, 760), tx('DETALHE 1 - ESC. 1:25', 700, 600)]), caminhos: [traco(900, 103, 930, 103), traco(100, 400, 600, 400), traco(690, 620, 790, 620)] }, { regioesFolha: regioes });
    assert.deepStrictEqual(noDetalhe.itens.find(i => i.tipo === 'linha').escalas_pt, { '1:25': 100, '1:50': 500 });
  });

  await caso('escala: empate 1:50 × 1:25 desempata pelo carimbo; sem desempate usa a maior e avisa (achado)', () => {
    const t2 = [tx('ESC. 1:50', 100, 700), tx('ESC. 1:25', 500, 700)];
    assert.deepStrictEqual(esc.escalaDoCarimboDetalhada(t2), { escala: 50, ambigua: [25, 50] }); // antes: 25 (o 3D na metade)
    // o rótulo dentro da região "carimbo" decide
    assert.deepStrictEqual(esc.escalaDoCarimboDetalhada([tx('ESC. 1:100', 100, 700), tx('ESC. 1:50', 1000, 760)], [regioes[2]]), { escala: 50, ambigua: null });
    // a mais frequente
    assert.strictEqual(esc.escalaDoCarimbo([...t2, tx('ESCALA 1:25', 300, 300)]), 25);
    const r = ag(folha(t2));
    assert.deepStrictEqual([r.escala, r.escalaAmbigua], [50, [25, 50]]);
    const { achadosDoDesenho } = require('../src/utils/analiseProjetoAchados');
    const a = achadosDoDesenho([{ arquivo: 'p.pdf', disciplinas: ['eletrica'] }], [[{ ...r, pagina: 1 }]]).find(x => x.tema === 'Escala da planta');
    assert.match(a?.observacao || '', /escalas 1:25 e 1:50 .* usada 1:50 \[CONFERIR\]/);
  });

  await caso('escala: "ESCALA - 1:50", "PLANTA BAIXA 1:50" e "ESCALA 1/50" são lidas', () => {
    for (const s of ['ESCALA - 1:50', 'ESCALA – 1:50', 'PLANTA BAIXA 1:50', 'ESCALA 1/50', 'ESC: 1:50']) assert.strictEqual(esc.escalaDoCarimbo([tx(s, 0, 0)]), 50, s);
    assert.strictEqual(esc.escalaDoCarimbo([tx('DIAGRAMA UNIFILAR - SEM ESCALA', 0, 0)]), null);
  });

  await caso('"SEM ESCALA" de um detalhe não anula a escala da folha; o achado diz onde a escala foi procurada', async () => {
    // direto: com a reserva (nome do arquivo), a planta fica com ela e o detalhe sem escala
    const r = ag(folha([tx('DETALHE 1 - SEM ESCALA', 700, 600)]), { regioesFolha: regioes, escalaReserva: { escala: 50, origem: 'nome_arquivo' } });
    assert.deepStrictEqual([r.escala, r.origemEscala, metros(r)], [50, 'nome_arquivo', 8.8]);
    assert.strictEqual(esc.escalaEscrita([tx('DETALHE 1 - SEM ESCALA', 700, 600)], regioes), false);
    // ponta a ponta: a prancha sem carimbo com um "SEM ESCALA" de detalhe ainda tira a escala do nome do arquivo
    const corpo = pranchaSintetica().toString('latin1').match(/stream\n([\s\S]*?)\nendstream/)[1].replace(/BT[^\n]*\(ESC\. 1:50\) Tj ET/, '');
    const pdf = montarPdf([corpo, texto(700, 300, 'DETALHE 1 - SEM ESCALA')].join('\n'));
    const [n] = await lerPdfVetorial(pdf, { nomeArquivo: 'Planta - A1 1_50.pdf' });
    assert.deepStrictEqual([n.escala, n.origemEscala], [50, 'nome_arquivo'], JSON.stringify([n.escala, n.origemEscala, n.escalaProcurada]));
    // sem escala nenhuma: o achado lista só o que foi tentado (antes dizia portas e cotas mesmo sem tentar)
    const [s] = await lerPdfVetorial(pdf, { nomeArquivo: 'Planta.pdf' });
    assert.strictEqual(s.escala, null);
    assert.ok(s.escalaProcurada.includes('nome_arquivo'), JSON.stringify(s.escalaProcurada));
    const { achadosDoDesenho } = require('../src/utils/analiseProjetoAchados');
    const a = achadosDoDesenho([{ arquivo: 'p.pdf', disciplinas: ['eletrica'] }], [[{ ...s, pagina: 1 }]]).find(x => x.tema === 'Escala da planta');
    const tentou = s.escalaProcurada.includes('portas');
    assert.match(a.observacao, tentou ? /não achada no carimbo, no nome do arquivo, nas portas nem nas cotas/ : /não achada no carimbo nem no nome do arquivo; portas e cotas não medidas/, a.observacao);
    const sem = achadosDoDesenho([{ arquivo: 'p.pdf', disciplinas: ['eletrica'] }], [[{ ...s, pagina: 1, escalaProcurada: ['carimbo'] }]]).find(x => x.tema === 'Escala da planta');
    assert.match(sem.observacao, /nome do arquivo, portas e cotas não tentados/);
  });

  // símbolo quadrado 6 × 6 (cheio, azul) e o mesmo girado num ângulo qualquer
  const quadradoGirado = (cx, cy, ang, lado = 6, cor = '#0000ff') => {
    const m = lado / 2;
    const p = [[-m, -m], [m, -m], [m, m], [-m, m]].map(([x, y]) => [cx + x * Math.cos(ang) - y * Math.sin(ang), cy + x * Math.sin(ang) + y * Math.cos(ang)]);
    const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
    return { cheio: true, traco: false, fill: cor, stroke: '#000000', lw: 0.5, dash: '', caixa: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], comp: 4 * lado, segs: 4, curvas: 0, reto: false };
  };
  await caso('símbolo girado fora de 0°/90° casa com a legenda (comprimento, trechos e curvas não mudam com o giro)', () => {
    const geo = {
      largura: 1200, altura: 800, textos: [tx('LEGENDA', 900, 90), tx('TOMADA BAIXA 2P+T 10A', 915, 105)],
      caminhos: [quadradoGirado(905, 103, 0), quadradoGirado(100, 100, 0), quadradoGirado(200, 100, Math.PI / 4), quadradoGirado(300, 100, Math.PI / 6), quadradoGirado(400, 100, Math.PI / 2),
        // círculo de mesmo perímetro e mesma cor não é o quadrado girado (4 curvas × 4 retas)
        { ...quadradoGirado(500, 100, Math.PI / 5), curvas: 4, segs: 4 }],
    };
    const tom = ag(geo, { escala: 50 }).itens.find(i => /TOMADA/.test(i.descricao));
    assert.strictEqual(tom?.quantidade, 4, JSON.stringify(tom)); // 0°, 45°, 30° e 90° (antes: 2)
  });

  await caso('empate de assinatura: cada símbolo conta num item só (o mais parecido); empate de verdade fica ambíguo', () => {
    // legenda com dois quadrados quase do mesmo tamanho (6 e 6,3 pt): os dois "parecem" o da planta
    const base = {
      largura: 1200, altura: 800,
      textos: [tx('LEGENDA', 900, 90), tx('TOMADA BAIXA 2P+T 10A', 915, 105), tx('TOMADA MEDIA 2P+T 10A', 915, 135)],
      caminhos: [quadradoGirado(905, 103, 0, 6), quadradoGirado(905, 133, 0, 6.3), ...[100, 200, 300].map(x => quadradoGirado(x, 100, 0, 6)), quadradoGirado(400, 100, 0, 6.3)],
    };
    const it = ag(base, { escala: 50 }).itens.filter(i => i.tipo === 'simbolo');
    const baixa = it.find(i => /BAIXA/.test(i.descricao)), media = it.find(i => /MEDIA/.test(i.descricao));
    // antes: 4 e 4 (os mesmos símbolos nos dois itens)
    assert.deepStrictEqual([baixa?.quantidade, media?.quantidade], [3, 1], JSON.stringify(it));
    assert.strictEqual(it.reduce((s, i) => s + i.quantidade, 0), 4);
    // mesma assinatura com duas descrições: o símbolo conta uma vez e os dois itens ficam ambíguos (conferir)
    const igual = ag({ ...base, caminhos: [quadradoGirado(905, 103, 0, 6), quadradoGirado(905, 133, 0, 6), ...[100, 200].map(x => quadradoGirado(x, 100, 0, 6))] }, { escala: 50 }).itens.filter(i => i.tipo === 'simbolo');
    assert.strictEqual(igual.length, 2, JSON.stringify(igual));
    assert.strictEqual(igual.reduce((s, i) => s + i.quantidade, 0), 2);
    assert.ok(igual.every(i => i.ambiguo && i.empates === 2), JSON.stringify(igual));
  });

  await caso('PDF sem desenho (só texto) não quebra e não inventa itens', async () => {
    const [q] = await lerPdfVetorial(montarPdf(texto(100, 700, 'MEMORIAL DESCRITIVO')));
    assert.strictEqual(q.itens.length, 0);
  });

  console.log(`pdf vetorial: ${ok} casos ok`);
})();
