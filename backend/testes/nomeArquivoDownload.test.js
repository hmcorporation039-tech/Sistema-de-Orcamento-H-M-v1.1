// Content-Disposition com nome acentuado (utils/nomeArquivoDownload.js):
// filename ASCII de reserva + filename* UTF-8 (RFC 5987/6266). Sem banco e sem
// rede. Rodar: npm test (pasta backend).
const assert = require('assert');
const { contentDisposition, nomeAscii, limparNome, codificarRfc5987 } = require('../src/utils/nomeArquivoDownload');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; } catch (e) { console.error(`FALHOU: ${nome}`); throw e; }
};

// lê o cabeçalho como o navegador: filename* tem preferência
function lerCabecalho(h) {
  const estrela = h.match(/filename\*=UTF-8''([^;\s]+)/);
  const simples = h.match(/filename="([^"]*)"/);
  return { estrela: estrela && decodeURIComponent(estrela[1]), simples: simples && simples[1] };
}

caso('nome acentuado: ASCII sem acento na reserva e UTF-8 exato no filename*', () => {
  const h = contentDisposition('PARÓQUIA_SÃO_JOSÉ_P0312.pdf');
  assert.strictEqual(h, `attachment; filename="PAROQUIA_SAO_JOSE_P0312.pdf"; filename*=UTF-8''PAR%C3%93QUIA_S%C3%83O_JOS%C3%89_P0312.pdf`);
  const l = lerCabecalho(h);
  assert.strictEqual(l.estrela, 'PARÓQUIA_SÃO_JOSÉ_P0312.pdf');
  assert.strictEqual(l.simples, 'PAROQUIA_SAO_JOSE_P0312.pdf');
});

caso('cabeçalho só com ASCII (Node recusa caractere fora de latin1 no header)', () => {
  for (const n of ['Orçamento – obra “nova” 😀.xlsx', 'Relatório OS-2026-0007.pdf', 'Contrato_João_Ç.pdf']) {
    const h = contentDisposition(n);
    assert.ok(/^[\x20-\x7e]+$/.test(h), h);
    assert.strictEqual(lerCabecalho(h).estrela, n);
  }
});

caso('aspas, barra invertida, quebra de linha e barra não quebram o cabeçalho', () => {
  const h = contentDisposition('a"b\\c\r\nd/e.pdf');
  assert.ok(!/[\r\n]/.test(h));
  const l = lerCabecalho(h);
  assert.strictEqual(l.simples, 'a_b_cd_e.pdf');
  assert.strictEqual(l.estrela, 'a"b_cd_e.pdf');
  assert.ok(!h.includes('filename="a"'), 'aspas não fecham o filename');
});

caso("' ( ) * codificados no filename* (attr-char da RFC 5987)", () => {
  assert.strictEqual(codificarRfc5987("d'água (1)*.pdf"), 'd%27%C3%A1gua%20%281%29%2A.pdf');
});

caso('inline, nome vazio e nome comprido', () => {
  assert.ok(contentDisposition('Proposta.pdf', 'inline').startsWith('inline; filename="Proposta.pdf"'));
  assert.ok(contentDisposition('x.pdf', 'qualquer').startsWith('attachment;'), 'tipo desconhecido = attachment');
  assert.strictEqual(lerCabecalho(contentDisposition('')).simples, 'arquivo');
  assert.strictEqual(lerCabecalho(contentDisposition(null, 'attachment', 'proposta.pdf')).estrela, 'proposta.pdf');
  const longo = limparNome(`${'Ç'.repeat(300)}.pdf`);
  assert.strictEqual(longo.length, 180);
  assert.ok(longo.endsWith('.pdf'), 'mantém a extensão');
  assert.strictEqual(nomeAscii('Ação'), 'Acao');
});

caso('NFD do macOS vira NFC (mesmo nome, mesmos bytes)', () => {
  const nfd = 'José.pdf';
  assert.strictEqual(lerCabecalho(contentDisposition(nfd)).estrela, 'José.pdf');
});

console.log(`nomeArquivoDownload.test.js: ${ok} casos OK`);
