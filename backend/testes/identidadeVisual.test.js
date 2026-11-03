// Identidade visual da H&M num lugar só (auditoria 02/11/2026, OP-11): logo.png e cabecalho.png ficam em
// skills/_comum/assets, que o backend (PDFs da proposta, contrato, relatórios e NFS-e) e as skills leem.
// O frontend/public/logo.png continua sendo uma cópia (o build do React só publica o que está em public),
// então este teste confere que ela é igual à fonte e que o backend não voltou a ter cópia própria.
// Sem banco e sem IA. Rodar: npm test (pasta backend).
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ASSETS_COMUM } = require('../src/config/caminhos');
const { cabecalhoDataUri, htmlBanner } = require('../src/utils/pdfTemplate');
const { gerarHtmlNfse } = require('../src/utils/nfsePdfTemplate');

let ok = 0;
function caso(nome, fn) {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
}
const hash = (arq) => crypto.createHash('sha256').update(fs.readFileSync(arq)).digest('hex');
const base64 = (arq) => fs.readFileSync(arq).toString('base64');

caso('a fonte única tem logo.png e cabecalho.png', () => {
  for (const nome of ['logo.png', 'cabecalho.png']) assert.ok(fs.existsSync(path.join(ASSETS_COMUM, nome)), `falta ${nome} em ${ASSETS_COMUM}`);
});

caso('frontend/public/logo.png é igual à de skills/_comum/assets', () => {
  assert.strictEqual(hash(path.join(__dirname, '../../frontend/public/logo.png')), hash(path.join(ASSETS_COMUM, 'logo.png')),
    'trocou a logo? copie skills/_comum/assets/logo.png para frontend/public/logo.png');
});

caso('o backend não tem cópia própria da logo nem do cabeçalho', () => {
  for (const nome of ['logo.png', 'cabecalho.png']) {
    assert.ok(!fs.existsSync(path.join(__dirname, '../src/assets', nome)), `backend/src/assets/${nome} voltou: use config/caminhos.js (ASSETS_COMUM)`);
  }
});

caso('PDFs usam as imagens da fonte única (banner do timbrado e logo da NFS-e)', () => {
  assert.strictEqual(cabecalhoDataUri, `data:image/png;base64,${base64(path.join(ASSETS_COMUM, 'cabecalho.png'))}`);
  assert.ok(htmlBanner().includes(cabecalhoDataUri), 'banner do timbrado');
  const html = gerarHtmlNfse({ situacao: 'emitida', numero: 1, valor_servicos: 1, discriminacao: 'x' }, { empresa: {} });
  assert.ok(html.includes(`data:image/png;base64,${base64(path.join(ASSETS_COMUM, 'logo.png'))}`), 'logo do prestador na NFS-e');
});

console.log(`identidadeVisual: ${ok} caso(s) ok`);
