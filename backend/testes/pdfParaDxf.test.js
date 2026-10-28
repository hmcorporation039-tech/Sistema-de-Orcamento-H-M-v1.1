// PDF vetorial da arquitetura → DXF em metros (utils/pdfParaDxf.js), para o 3D
// e a planta por disciplina. Plantas SINTÉTICAS em 1:50 impressas em PDF pelo
// Chromium (o mesmo tipo de PDF vetorial que o AutoCAD exporta), sem banco.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const puppeteer = require('puppeteer');
const { pdfParaDxf, paraTestes: T } = require('../src/utils/pdfParaDxf');
const { lerArquiteturaNoWorker, resumoDaArquitetura, faltouEscala } = require('../src/services/tarefasCad');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

// planta em metros → SVG em mm na escala 1:50 (1 m = 20 mm), y para baixo
const X = (x) => 20 + x * 20, Y = (y) => 250 - y * 20;
const ret = (x0, y0, x1, y1, w) => `<rect x="${X(x0)}" y="${Y(y1)}" width="${(x1 - x0) * 20}" height="${(y1 - y0) * 20}" fill="none" stroke="#000" stroke-width="${w}"/>`;
const porta = (cx, cy) => `<path d="M ${X(cx + 0.8)} ${Y(cy)} A 16 16 0 0 0 ${X(cx)} ${Y(cy + 0.8)}" fill="none" stroke="#000" stroke-width="0.13"/>
  <line x1="${X(cx)}" y1="${Y(cy)}" x2="${X(cx)}" y2="${Y(cy + 0.8)}" stroke="#000" stroke-width="0.13"/>`;
const texto = (x, y, s) => `<text x="${X(x)}" y="${Y(y)}" font-family="Arial" font-size="3.5">${s}</text>`;
function planta({ carimbo = true, mesmaEspessura = false, portas = true } = {}) {
  const g = mesmaEspessura ? 0.13 : 0.6;
  return `<!doctype html><html><head><style>@page{size:420mm 297mm;margin:0}body{margin:0}</style></head><body>
  <svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297">
    ${ret(0, 0, 12.3, 4.3, g)}
    ${ret(0.15, 0.15, 5.15, 4.15, g)} ${ret(5.3, 0.15, 8.3, 4.15, g)} ${ret(8.45, 0.15, 12.15, 4.15, g)}
    ${ret(1, 3, 3, 3.8, 0.13)}
    ${portas ? `${porta(0.3, 0.3)} ${porta(5.45, 0.3)} ${porta(8.6, 0.3)}` : ''}
    <line x1="${X(0.15)}" y1="${Y(2)}" x2="${X(5.15)}" y2="${Y(2)}" stroke="#000" stroke-width="0.13" stroke-dasharray="2 1"/>
    ${texto(1.6, 2.2, 'SALA DE ESTAR')} ${texto(6.2, 2.2, 'COZINHA')} ${texto(9.6, 2.2, 'QUARTO')}
    ${carimbo ? `<text x="330" y="285" font-family="Arial" font-size="3">ESC. 1:50</text>` : ''}
  </svg></body></html>`;
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const pdfDe = async (html) => { const p = await browser.newPage(); await p.setContent(html); const b = await p.pdf({ width: '420mm', height: '297mm', printBackground: true }); await p.close(); return Buffer.from(b); };
  let comCarimbo, semCarimbo, semPortas, iguais, soTexto;
  try {
    [comCarimbo, semCarimbo, semPortas, iguais, soTexto] = await Promise.all([
      pdfDe(planta()), pdfDe(planta({ carimbo: false })), pdfDe(planta({ carimbo: false, portas: false })), pdfDe(planta({ mesmaEspessura: true })),
      pdfDe('<html><body><p>Memorial descritivo — só texto, sem desenho.</p></body></html>'),
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

  console.log(`pdfParaDxf: ${ok} casos ok`);
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
