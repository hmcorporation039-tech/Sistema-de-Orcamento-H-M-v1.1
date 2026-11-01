// PDF vetorial da arquitetura → DXF em metros (services/pdfParaDxf.js), para o 3D
// e a planta por disciplina. Plantas SINTÉTICAS em 1:50 impressas em PDF pelo
// Chromium (o mesmo tipo de PDF vetorial que o AutoCAD exporta), sem banco.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const puppeteer = require('puppeteer');
const { pdfParaDxf, paraTestes: T } = require('../src/services/pdfParaDxf');
const { lerArquiteturaNoWorker, resumoDaArquitetura, faltouEscala } = require('../src/services/tarefasCad');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

// planta em metros → SVG em mm na escala 1:50 (1 m = 20 mm), y para baixo
const X = (x) => 20 + x * 20, Y = (y) => 250 - y * 20;
const ret = (x0, y0, x1, y1, w) => `<rect x="${X(x0)}" y="${Y(y1)}" width="${(x1 - x0) * 20}" height="${(y1 - y0) * 20}" fill="none" stroke="#000" stroke-width="${w}"/>`;
const porta = (cx, cy) => `<path d="M ${X(cx + 0.8)} ${Y(cy)} A 16 16 0 0 0 ${X(cx)} ${Y(cy + 0.8)}" fill="none" stroke="#000" stroke-width="0.13"/>
  <line x1="${X(cx)}" y1="${Y(cy)}" x2="${X(cx)}" y2="${Y(cy + 0.8)}" stroke="#000" stroke-width="0.13"/>`;
const texto = (x, y, s) => `<text x="${X(x)}" y="${Y(y)}" font-family="Arial" font-size="3.5">${s}</text>`;
function planta({ carimbo = true, mesmaEspessura = false, portas = true, eletrica = false } = {}) {
  const g = mesmaEspessura ? 0.13 : 0.6;
  return `<!doctype html><html><head><style>@page{size:420mm 297mm;margin:0}body{margin:0}</style></head><body>
  <svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297">
    ${ret(0, 0, 12.3, 4.3, g)}
    ${ret(0.15, 0.15, 5.15, 4.15, g)} ${ret(5.3, 0.15, 8.3, 4.15, g)} ${ret(8.45, 0.15, 12.15, 4.15, g)}
    ${ret(1, 3, 3, 3.8, 0.13)}
    ${portas ? `${porta(0.3, 0.3)} ${porta(5.45, 0.3)} ${porta(8.6, 0.3)}` : ''}
    <line x1="${X(0.15)}" y1="${Y(2)}" x2="${X(5.15)}" y2="${Y(2)}" stroke="#000" stroke-width="0.13" stroke-dasharray="2 1"/>
    ${texto(1.6, 2.2, 'SALA DE ESTAR')} ${texto(6.2, 2.2, 'COZINHA')} ${texto(9.6, 2.2, 'QUARTO')}
    ${eletrica ? `<line x1="${X(1)}" y1="${Y(3.5)}" x2="${X(11)}" y2="${Y(3.5)}" stroke="#ff7f00" stroke-width="0.13"/>
    <line x1="${X(1)}" y1="${Y(1)}" x2="${X(11)}" y2="${Y(1)}" stroke="#ff0000" stroke-width="0.13" stroke-dasharray="2 1"/>` : ''}
    ${carimbo ? `<text x="330" y="285" font-family="Arial" font-size="3">ESC. 1:50</text>` : ''}
  </svg></body></html>`;
}

// ── folhas de QUADRO ELÉTRICO (29/10/2026): o 3D não pode montar "edificação" com elas ──
// diagrama unifilar (mm na folha): barramento grosso, saídas com disjuntor e texto do circuito
function unifilar(x0, y0, n = 12, qd = 'QDC') {
  let s = `<rect x="${x0 - 6}" y="${y0 - 6}" width="96" height="${n * 8 + 10}" fill="none" stroke="#000" stroke-width="0.7"/>
    <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + n * 8}" stroke="#000" stroke-width="1.2"/>`;
  for (let i = 0; i < n; i++) {
    const y = y0 + 4 + i * 8;
    s += `<line x1="${x0}" y1="${y}" x2="${x0 + 55}" y2="${y}" stroke="#000" stroke-width="0.25"/>
      <path d="M ${x0 + 18} ${y} A 2 2 0 0 1 ${x0 + 22} ${y}" fill="none" stroke="#000" stroke-width="0.25"/>
      <text x="${x0 + 56}" y="${y + 1}" font-family="Arial" font-size="2.2">C${i + 1} 2x2,5mm² 20A</text>`;
  }
  return `${s}<text x="${x0}" y="${y0 + n * 8 + 12}" font-family="Arial" font-size="4">DIAGRAMA UNIFILAR - ${qd}</text>
    <text x="${x0}" y="${y0 + n * 8 + 17}" font-family="Arial" font-size="2.5">SEM ESCALA</text>`;
}
// quadro de cargas: grade com cabeçalho e uma linha por circuito
function quadroDeCargas(x0, y0, n = 10) {
  const cols = [0, 20, 60, 80, 95, 110];
  let s = `<text x="${x0}" y="${y0 - 3}" font-family="Arial" font-size="3.5">QUADRO DE CARGAS - QDC</text>`;
  for (let i = 0; i <= n + 1; i++) s += `<line x1="${x0}" y1="${y0 + i * 5}" x2="${x0 + 110}" y2="${y0 + i * 5}" stroke="#000" stroke-width="0.2"/>`;
  for (const c of cols) s += `<line x1="${x0 + c}" y1="${y0}" x2="${x0 + c}" y2="${y0 + (n + 1) * 5}" stroke="#000" stroke-width="0.2"/>`;
  const cab = ['CIRCUITO', 'DESCRIÇÃO', 'POTÊNCIA', 'FASE', 'DISJUNTOR'];
  cab.forEach((t, k) => { s += `<text x="${x0 + cols[k] + 1}" y="${y0 + 3.6}" font-family="Arial" font-size="2">${t}</text>`; });
  for (let i = 1; i <= n; i++) {
    ['C' + i, i % 2 ? 'Tomadas sala' : 'Iluminação cozinha', String(600 + i * 100), 'A', '20A'].forEach((t, k) => { s += `<text x="${x0 + cols[k] + 1}" y="${y0 + i * 5 + 3.6}" font-family="Arial" font-size="2">${t}</text>`; });
  }
  return s;
}
const svg = (conteudo) => `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297" style="display:block;page-break-after:always">${conteudo}</svg>`;
const folhaQuadros = () => `${unifilar(20, 20)}${unifilar(130, 20, 14, 'QDL')}${unifilar(240, 20, 10, 'QGBT')}${quadroDeCargas(30, 170)}${quadroDeCargas(200, 170, 12)}`;
const html = (svgs) => `<!doctype html><html><head><style>@page{size:420mm 297mm;margin:0}body{margin:0}</style></head><body>${svgs}</body></html>`;
// planta da folha mista: a mesma de planta(), sem o carimbo (a escala vai à parte)
const plantaSoDesenho = () => planta().replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const pdfDe = async (html) => { const p = await browser.newPage(); await p.setContent(html); const b = await p.pdf({ width: '420mm', height: '297mm', printBackground: true }); await p.close(); return Buffer.from(b); };
  let comCarimbo, semCarimbo, semPortas, iguais, soTexto, soQuadros, duasPaginas, mista, comEletrica;
  try {
    [comEletrica, comCarimbo, semCarimbo, semPortas, iguais, soTexto, soQuadros, duasPaginas, mista] = await Promise.all([
      pdfDe(planta({ eletrica: true })),
      pdfDe(planta()), pdfDe(planta({ carimbo: false })), pdfDe(planta({ carimbo: false, portas: false })), pdfDe(planta({ mesmaEspessura: true })),
      pdfDe('<html><body><p>Memorial descritivo — só texto, sem desenho.</p></body></html>'),
      // (a) só unifilar e quadro de cargas
      pdfDe(html(svg(folhaQuadros()))),
      // (b) 1ª página com os quadros (mais traços), 2ª com a planta
      pdfDe(html(svg(folhaQuadros()) + svg(plantaSoDesenho() + '<text x="330" y="285" font-family="Arial" font-size="3">ESC. 1:50</text>'))),
      // (c) folha mista: planta à esquerda, unifilar e quadro de cargas à direita
      pdfDe(html(svg(`${plantaSoDesenho()}${unifilar(300, 20)}${quadroDeCargas(290, 160, 8)}<text x="20" y="280" font-family="Arial" font-size="3">ESC. 1:50</text>`))),
    ]);
  } finally { await browser.close(); }

  await caso('curva de 90° exportada como Bézier é reconhecida como arco (centro, raio, sentido)', async () => {
    const k = 0.5522847498; // controle do quarto de círculo
    const a = T.arcoDaCurva([1, 0], [1, k], [k, 1], [0, 1]);
    assert.ok(a && Math.abs(a.r - 1) < 1e-6 && Math.hypot(...a.centro) < 1e-6, JSON.stringify(a));
    assert.deepStrictEqual([Math.round(a.inicio), Math.round(a.fim)], [0, 90]);
    assert.strictEqual(T.arcoDaCurva([0, 0], [1, 0.2], [2, -0.2], [3, 0]), null); // curva em S não é arco
  });

  await caso('escala do carimbo (ESC. 1:50): salas com nome e área reais, paredes pela espessura do traço', async () => {
    const r = await pdfParaDxf(comCarimbo);
    assert.strictEqual(r.escala, 50);
    assert.strictEqual(r.origemEscala, 'carimbo');
    assert.ok(/PDF-PAREDE/.test(r.texto) && /\nARC\n/.test(r.texto), 'DXF com layer de parede e arcos de porta');
    const lida = await lerArquiteturaNoWorker(comCarimbo, 'planta.pdf');
    const amb = Object.fromEntries(resumoDaArquitetura(lida).ambientes.map(a => [a.nome, a.area_m2]));
    assert.ok(Math.abs(amb['SALA DE ESTAR'] - 20) < 0.4, JSON.stringify(amb)); // "SALA" + "DE" + "ESTAR" juntos
    assert.ok(Math.abs(amb.COZINHA - 12) < 0.3, JSON.stringify(amb));
    assert.ok(Math.abs(amb.QUARTO - 14.8) < 0.3, JSON.stringify(amb));
    assert.ok(lida.leitura.portas.length >= 3, `portas: ${lida.leitura.portas.length}`);
    assert.strictEqual(lida.origem, 'pdf');
    assert.strictEqual(lida.pdf.escala, 50);
  });

  await caso('sem escala no carimbo: deduz 1:50 pelo raio das portas e avisa', async () => {
    const r = await pdfParaDxf(semCarimbo);
    assert.strictEqual(r.escala, 50);
    assert.strictEqual(r.origemEscala, 'portas');
    assert.ok(r.avisos.some(a => /portas/.test(a)));
  });

  await caso('traço colorido vai para a layer da cor, nunca para parede nem PDF-LINHAS', async () => {
    const r = await pdfParaDxf(comEletrica);
    const layerDe = (tx) => tx.split(/\r?\n/).map(s => s.trim());
    const linhas = layerDe(r.texto);
    assert.ok(linhas.includes('PDF-COR-FF7F00'), 'sem a layer do eletroduto laranja');
    // (o tracejado vermelho do fixture o Chrome grava como preenchimento: só não pode virar parede)
    // as paredes continuam lidas: a cor não mexe na arquitetura
    const lida = await lerArquiteturaNoWorker(comEletrica, 'planta.pdf');
    assert.ok(resumoDaArquitetura(lida).ambientes.some(a => a.nome === 'COZINHA'));
  });

  await caso('escala informada pelo usuário vale mais que a do carimbo', async () => {
    const r = await pdfParaDxf(comCarimbo, { escala: 100 });
    assert.deepStrictEqual([r.escala, r.origemEscala], [100, 'informada']);
    const lida = await lerArquiteturaNoWorker(comCarimbo, 'planta.pdf', { escala: 100 });
    const sala = resumoDaArquitetura(lida).ambientes.find(a => a.nome === 'SALA DE ESTAR');
    assert.ok(Math.abs(sala.area_m2 - 80) < 1.6, `1:100 → área 4× maior: ${sala.area_m2}`);
  });

  await caso('linhas todas da mesma espessura: converte e avisa que móvel pode virar parede', async () => {
    const r = await pdfParaDxf(iguais);
    assert.ok(r.avisos.some(a => /mesma espessura/.test(a)));
    assert.ok(!/PDF-PAREDE\n/.test(r.texto.split('ENTITIES')[1] || ''), 'sem entidade na layer de parede');
  });

  await caso('PDF sem desenho (escaneado/texto): erro claro, sem travar', async () => {
    await assert.rejects(pdfParaDxf(soTexto), (e) => e.codigo === 'RASTER' && /não tem desenho vetorial/.test(e.message));
    await assert.rejects(lerArquiteturaNoWorker(soTexto, 'memorial.pdf'), (e) => /Não consegui converter o PDF/.test(e.message));
  });

  await caso('sem escala no carimbo e sem portas: pede a escala (a tela pergunta e reenvia)', async () => {
    assert.strictEqual(T.escalaPelasPortas([]), null);
    const e = await lerArquiteturaNoWorker(semPortas, 'salas.pdf').catch(x => x);
    assert.ok(faltouEscala(e), e.message);
    assert.ok(/Informe a escala/.test(e.message));
    const quebrado = await lerArquiteturaNoWorker(Buffer.from('%PDF-1.4 quebrado'), 'x.pdf').catch(x => x);
    assert.ok(quebrado instanceof Error && !faltouEscala(quebrado)); // PDF inválido não é "falta de escala"
  });

  await caso('página inexistente: mensagem com o total de páginas; sem página, usa a que tem desenho', async () => {
    await assert.rejects(pdfParaDxf(comCarimbo, { pagina: 9 }), /O PDF tem \d+ página\(s\); a página 9 não existe/);
    assert.strictEqual((await pdfParaDxf(comCarimbo)).pagina, 1); // o Chromium acrescenta uma página em branco
  });

  await caso('(a) PDF só com unifilar e quadro de cargas: nenhuma parede, mensagem clara até a tela', async () => {
    await assert.rejects(pdfParaDxf(soQuadros), (e) => e.codigo === 'SEM_PLANTA' && /diagramas\/quadros elétricos — não há planta baixa para montar o 3D/.test(e.message) && /folha 1: .*diagrama unifilar/.test(e.message));
    const e = await lerArquiteturaNoWorker(soQuadros, 'unifilar.pdf').catch(x => x);
    assert.ok(e instanceof Error && /"unifilar\.pdf": As páginas deste arquivo são diagramas\/quadros elétricos/.test(e.message), e.message);
    assert.ok(!/Não consegui converter/.test(e.message) && !faltouEscala(e));
    assert.strictEqual(e.codigo, 'SEM_PLANTA');
  });

  await caso('(b) PDF de 2 páginas (quadros com mais traços + planta): escolhe a planta e avisa', async () => {
    const r = await pdfParaDxf(duasPaginas);
    assert.strictEqual(r.pagina, 2);
    assert.strictEqual(r.folhas.find(f => f.pagina === 1).tipo !== 'planta', true, JSON.stringify(r.folhas));
    assert.ok(r.avisos.some(a => /Usada a folha 2/.test(a) && /Folha 1: .* — ignorada/.test(a)), r.avisos.join(' | '));
    const lida = await lerArquiteturaNoWorker(duasPaginas, 'projeto.pdf');
    const nomes = resumoDaArquitetura(lida).ambientes.map(a => a.nome).sort();
    assert.deepStrictEqual(nomes, ['COZINHA', 'QUARTO', 'SALA DE ESTAR']);
    // a página escolhida a dedo continua valendo; a do unifilar dá a mensagem
    await assert.rejects(pdfParaDxf(duasPaginas, { pagina: 1 }), (e) => e.codigo === 'SEM_PLANTA' && /A página 1 é .* não há planta baixa nela/.test(e.message));
  });

  await caso('(c) folha mista: só a planta vira DXF (unifilar e quadro de cargas ficam de fora)', async () => {
    const r = await pdfParaDxf(mista);
    assert.ok(!/DISJ|UNIFILAR|2x2,5mm|QUADRO DE CARGAS|Tomadas sala/.test(r.texto), 'texto do unifilar/quadro no DXF');
    assert.ok(r.avisos.some(a => /ficaram fora do 3D: .*diagrama unifilar/.test(a) && /quadro de cargas/.test(a)), r.avisos.join(' | '));
    const lida = await lerArquiteturaNoWorker(mista, 'mista.pdf');
    const amb = resumoDaArquitetura(lida).ambientes;
    assert.deepStrictEqual(amb.map(a => a.nome).sort(), ['COZINHA', 'QUARTO', 'SALA DE ESTAR']);
    assert.ok(Math.abs(amb.find(a => a.nome === 'SALA DE ESTAR').area_m2 - 20) < 0.4);
    // nada do lado direito da folha (a planta vai até 13,3 m; o quadro do unifilar começa em 294 mm → 14,7 m em 1:50)
    assert.ok(lida.leitura.extensao.max[0] < 14, `extensão ${JSON.stringify(lida.leitura.extensao)}`);
  });

  console.log(`pdfParaDxf: ${ok} casos ok`);
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
