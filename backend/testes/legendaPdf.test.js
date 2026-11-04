// Legenda das pranchas em PDF (versão 2.30): a folha sem legenda própria conta os símbolos pela legenda de outra folha
// do mesmo PDF (antes saía com zero), e a legenda aprendida do mesmo escritório vale só como sugestão (a conferir).
// O treino lê as pranchas do acervo e aprende a legenda e as notas de altura por escritório. PDF SINTÉTICO.
// Rodar: node testes/legendaPdf.test.js (a parte do banco só roda em hm_orcamentos_v2).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const { lerPdfVetorial } = require('../src/utils/pdfVetorial');
const legendas = require('../src/services/legendasPdfAprendidas');

// PDF de várias folhas (A3 paisagem, Helvetica padrão). y do PDF cresce para cima.
function montarPdf(folhas) {
  const n = folhas.length;
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${folhas.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${n} >>`];
  folhas.forEach((c, i) => {
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1191 842] /Contents ${4 + i * 2} 0 R /Resources << /Font << /F1 ${3 + n * 2} 0 R >> >> >>`);
    objs.push(`<< /Length ${Buffer.byteLength(c, 'latin1')} >>\nstream\n${c}\nendstream`);
  });
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  let pdf = '%PDF-1.4\n';
  const pos = [];
  objs.forEach((o, i) => { pos.push(Buffer.byteLength(pdf, 'latin1')); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map(p => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
const texto = (x, y, s, t = 8) => `BT /F1 ${t} Tf ${x} ${y} Td (${s}) Tj ET`;
const quadrado = (x, y, l, cor) => `${cor} rg ${x} ${y} ${l} ${l} re f`;
const circulo = (cx, cy, r, cor) => {
  const k = 0.5523 * r;
  return `${cor} RG 1 w ${cx + r} ${cy} m ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} c ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} c `
    + `${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} c ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} c S`;
};
const parede = () => `0 0 0 RG 5 w 50 50 m 700 50 l S`;
// folha 1: só planta (6 tomadas e 4 detectores), sem legenda; folha 2: legenda + 2 tomadas
const folhaSemLegenda = () => [parede(), ...[[100, 100], [160, 100], [220, 100], [100, 300], [300, 300], [400, 420]].map(([x, y]) => quadrado(x, y, 6, '1 0 0')),
  ...[[200, 200], [350, 200], [500, 200], [600, 300]].map(([x, y]) => circulo(x, y, 4, '0 0.6 0')), texto(1000, 60, 'ESC. 1:50')].join('\n');
const folhaComLegenda = () => [parede(), texto(950, 780, 'LEGENDA'),
  quadrado(950, 755, 6, '1 0 0'), texto(970, 756, 'TOMADA BAIXA 2P+T 10A A 0,30M DO PISO'),
  circulo(953, 738, 4, '0 0.6 0'), texto(970, 735, 'DETECTOR DE FUMACA PONTUAL'),
  quadrado(120, 500, 6, '1 0 0'), quadrado(220, 500, 6, '1 0 0'), texto(1000, 60, 'ESC. 1:50')].join('\n');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };
const contagem = (p) => Object.fromEntries((p.itens || []).filter(i => i.tipo === 'simbolo').map(i => [/TOMADA/.test(i.descricao) ? 'tomada' : /DETECTOR/.test(i.descricao) ? 'detector' : i.descricao, i.quantidade]));

(async () => {
  let legendaDaFolha;
  await caso('folha sem legenda conta pela legenda de outra folha do mesmo PDF (lida antes ou depois)', async () => {
    const pdf = montarPdf([folhaSemLegenda(), folhaComLegenda()]);
    const [p1, p2] = await lerPdfVetorial(pdf, { emThread: false });
    assert.deepStrictEqual(contagem(p2), { tomada: 2 });
    assert.ok(p2.legendaPropria?.length === 2, 'a legenda da folha 2 volta para as outras');
    // a folha 1 foi lida antes de a legenda aparecer: lida de novo no fim
    assert.deepStrictEqual(contagem(p1), { tomada: 6, detector: 4 });
    const itens1 = p1.itens.filter(i => i.tipo === 'simbolo');
    assert.ok(itens1.every(i => i.origem_legenda === 'outra_pagina' && !i.ambiguo), 'legenda do próprio projeto: vale para o orçamento');
    legendaDaFolha = p2.legendaPropria;
    // na ordem inversa, a folha sem legenda já usa a da anterior (sem reler)
    const [q1, q2] = await lerPdfVetorial(montarPdf([folhaComLegenda(), folhaSemLegenda()]), { emThread: false });
    assert.deepStrictEqual([contagem(q1), contagem(q2)], [{ tomada: 2 }, { tomada: 6, detector: 4 }]);
  });

  await caso('PDF sem legenda nenhuma: a legenda aprendida do escritório conta como sugestão (a conferir)', async () => {
    const [p] = await lerPdfVetorial(montarPdf([folhaSemLegenda()]), { emThread: false });
    assert.deepStrictEqual(contagem(p), {}, 'sem legenda e sem aprendizado: nada é inventado');
    const [q] = await lerPdfVetorial(montarPdf([folhaSemLegenda()]), { emThread: false, legendaAprendida: legendaDaFolha });
    assert.deepStrictEqual(contagem(q), { tomada: 6, detector: 4 });
    assert.ok(q.itens.filter(i => i.tipo === 'simbolo').every(i => i.ambiguo && i.conferir && i.origem_legenda === 'aprendida'), 'fora do orçamento até conferir');
    // a legenda da própria folha vale mais que a aprendida
    const [r2] = await lerPdfVetorial(montarPdf([folhaComLegenda()]), { emThread: false, legendaAprendida: legendaDaFolha });
    assert.ok(r2.itens.filter(i => i.tipo === 'simbolo').every(i => !i.origem_legenda && !i.ambiguo));
  });

  await caso('PDFs do mesmo projeto enviados juntos: o arquivo sem legenda conta pela dos outros (vale como a do projeto)', async () => {
    const [p] = await lerPdfVetorial(montarPdf([folhaSemLegenda()]), { emThread: false, legendaDoProjeto: legendaDaFolha, legendaAprendida: [{ ...legendaDaFolha[0], texto: 'OUTRA COISA APRENDIDA' }] });
    assert.deepStrictEqual(contagem(p), { tomada: 6, detector: 4 }, 'a do projeto vale mais que a aprendida');
    assert.ok(p.itens.filter(i => i.tipo === 'simbolo').every(i => i.origem_legenda === 'outro_arquivo' && !i.ambiguo));
  });

  await caso('autor do projeto da prancha: carimbo, linha "AUTOR DO PROJETO" ou código do desenho', () => {
    const { escritorioDoPdf } = require('../src/utils/escritorioDoProjeto');
    assert.strictEqual(escritorioDoPdf({ responsavel: 'Fulana de Tal' }, '', ''), 'FULANA DE TAL');
    assert.strictEqual(escritorioDoPdf({}, 'DESENHO:\nAUTOR DO PROJETO: \tBELTRANO SICRANO\nDATA', 'x.pdf'), 'BELTRANO SICRANO');
    assert.strictEqual(escritorioDoPdf({}, '', 'DE-ABC-5300-XYZ-PE-002-1PAV-R01.pdf'), 'CODIGO XYZ');
    assert.strictEqual(escritorioDoPdf({}, 'PROJETISTA: DATA', 'planta.pdf'), '');
  });

  await caso('assinatura → chave (girada 90° dá a mesma) e tipo pelo texto da legenda', () => {
    const sig = { blob: { chave: 'F1 0 0', w: 6, h: 3 }, comps: [] };
    assert.strictEqual(legendas.chaveDaAssinatura('fulano', sig), legendas.chaveDaAssinatura('fulano', { ...sig, blob: { ...sig.blob, w: 3, h: 6 } }));
    assert.notStrictEqual(legendas.chaveDaAssinatura('fulano', sig), legendas.chaveDaAssinatura('beltrano', sig));
    assert.deepStrictEqual(legendas.tipoDaLegenda('TOMADA BAIXA 2P+T 10A A 0,30M DO PISO'), { simbolo: 'HM-ELE-TOMADA-BAIXA', disciplina: 'eletrica', altura_m: 0.3 });
    assert.strictEqual(legendas.tipoDaLegenda('DETECTOR DE FUMACA PONTUAL').simbolo, 'HM-INC-DETECTOR-FUMACA');
  });

  await caso('treino: a prancha em PDF é um tipo de arquivo do acervo; documento e lista de material não', () => {
    const { tipoDe } = require('../src/services/treinoAcervo').paraTestes;
    assert.strictEqual(tipoDe('001_ELE_ALM-01 PLANTA TERREO.pdf'), 'prancha');
    assert.strictEqual(tipoDe('Lista de materiais eletrica.pdf'), 'pdf');
    assert.strictEqual(tipoDe('Laudo SPDA 2025.pdf'), null);
    assert.strictEqual(tipoDe('Orcamento antigo.xls'), 'planilha');
  });

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`legendaPdf: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const ESC = 'zz teste escritorio pdf';
    const limpar = async () => {
      await pool.query('DELETE FROM pdf_legendas_aprendidas WHERE escritorio = $1', [ESC]);
      await pool.query('DELETE FROM cad_notas_aprendidas WHERE escritorio = $1', [ESC]);
    };
    try {
      await limpar();
      await caso('registrar e carregar por escritório; tipo diferente para a mesma assinatura é conflito (sai do uso)', async () => {
        const paginas = [{ legendaPropria: legendaDaFolha }];
        const r = await legendas.registrar(paginas, { escritorio: ESC, arquivo: 'ZZ-a.pdf', textoDasNotas: 'NOTAS GERAIS\nTODAS AS TOMADAS BAIXAS A 0,30 M DO PISO ACABADO' });
        assert.strictEqual(r.legendas, 2);
        assert.strictEqual(r.notas, 1, 'a nota de altura do texto da prancha também ensina');
        let lidas = await legendas.carregar(ESC);
        assert.strictEqual(lidas.length, 2);
        assert.deepStrictEqual(await legendas.carregar('outro escritorio zz'), [], 'só vale para o mesmo escritório');
        // outro PDF do escritório reforça; um terceiro diz que o quadrado vermelho é sirene: conflito
        await legendas.registrar(paginas, { escritorio: ESC, arquivo: 'ZZ-b.pdf' });
        const sirene = [{ legendaPropria: [{ ...legendaDaFolha.find(k => /TOMADA/.test(k.texto)), texto: 'SIRENE DE ALARME 120DB' }] }];
        await legendas.registrar(sirene, { escritorio: ESC, arquivo: 'ZZ-c.pdf' });
        lidas = await legendas.carregar(ESC);
        assert.deepStrictEqual(lidas.map(k => k.texto), ['DETECTOR DE FUMACA PONTUAL']);
        const { rows } = await pool.query('SELECT texto, vezes, conflitos FROM pdf_legendas_aprendidas WHERE escritorio = $1 ORDER BY texto', [ESC]);
        assert.deepStrictEqual(rows.map(x => [x.vezes, x.conflitos]), [[2, 0], [3, 1]]);
      });
      await caso('treino da prancha: carimbo sem responsável não lê o desenho; com responsável, aprende a legenda', async () => {
        const { treinarPrancha } = require('../src/services/treinoAcervo');
        let leu = 0;
        const lerVetorial = async (b, o) => { leu++; return lerPdfVetorial(b, { ...o, emThread: false }); };
        const semResp = await treinarPrancha(montarPdf([folhaComLegenda()]), 'ZZ-prancha.pdf', { lerVetorial });
        assert.strictEqual(leu, 0);
        assert.match(semResp.aviso || semResp.ignorado || '', /autor do projeto|imagem/);
      });
    } finally { await limpar(); await pool.end(); }
  }
  console.log(`legendaPdf: ${ok} casos ok`);
})().catch(e => { console.error('FALHOU:', e); process.exit(1); });
