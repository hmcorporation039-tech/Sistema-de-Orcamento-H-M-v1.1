// Pacote comum (Fase 7 do roteiro; auditoria 02/11/2026, OP-09 e OP-11): formatação, texto, dinheiro,
// escape de HTML/XML e timbrado ficam em skills/_comum/base, usados pelo backend e pelas skills.
// O frontend não consegue importar de lá (o build do React só compila frontend/src), então tem a sua
// cópia em frontend/src/utils/format.js e dinheiro.js: este teste roda as duas e confere que dão o
// mesmo resultado — trocou uma regra, troque nas duas. Confere também que o backend usa o pacote (sem
// cópia própria) e que os valores de sempre continuam iguais.
// Sem banco e sem IA. Rodar: npm test (pasta backend).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { COMUM } = require('../src/config/caminhos');

const base = require(path.join(COMUM, 'base'));
const FRONT = path.join(__dirname, '../../frontend/src/utils');

let ok = 0;
async function caso(nome, fn) {
  try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
}

// o arquivo do frontend é ESM sem imports: uma cópia .mjs numa pasta temporária é importada pelo Node
async function importarDoFrontend(nome) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-comum-'));
  const arq = path.join(pasta, `${nome}.mjs`);
  fs.copyFileSync(path.join(FRONT, `${nome}.js`), arq);
  try { return await import(pathToFileURL(arq).href); } finally { fs.rmSync(pasta, { recursive: true, force: true }); }
}

const VALORES = [0, 1, -1, 0.005, 1.005, 2.675, 1234.5, 1e6, 999999.995, -0.015, '12,5', '1.234,56', '12.50', 'abc', '', null, undefined, NaN, Infinity];
const QUANTIDADES = [0, 1, 1.0005, 1.0004, -1.0005, 2.5, '3', 1e-7, 123456.7895, null, 'x'];
const TEXTOS_NUMERO = ['1.234,56', '1.150', '1.150.000', '12.5', '12.50', ' 3 ', '-1.234', '', null, undefined, 'abc', 7, '1,5'];

(async () => {
  await caso('frontend (format.js) × pacote comum: dinheiro e data dão o mesmo texto', async () => {
    const f = await importarDoFrontend('format');
    for (const v of VALORES) {
      assert.strictEqual(f.formatarMoeda(v), base.formatarMoeda(v), `formatarMoeda(${String(v)})`);
      assert.strictEqual(f.formatarMoeda(v, { vazio: '—' }), base.formatarMoeda(v, { vazio: '—' }), `formatarMoeda(${String(v)}, vazio)`);
    }
    // data ISO → DD/MM/AAAA (a dataBr do frontend só corta o texto; vazio → '')
    for (const v of ['2026-01-15', '2026-12-31T23:59:00Z', '1999-02-03', '', null, undefined]) {
      assert.strictEqual(f.dataBr(v), base.dataIsoBr(v), `dataBr(${String(v)})`);
    }
  });

  await caso('frontend (dinheiro.js) × pacote comum: centavos, quantidade e número digitado', async () => {
    const d = await importarDoFrontend('dinheiro');
    for (const v of VALORES) assert.strictEqual(d.arred2(v), base.arredondar(v), `arred2(${String(v)})`);
    for (const q of QUANTIDADES) assert.strictEqual(d.arredQtd(q), base.arredondarQuantidade(q), `arredQtd(${String(q)})`);
    for (const t of TEXTOS_NUMERO) assert.strictEqual(d.paraNumeroBR(t), base.paraNumeroBR(t), `paraNumeroBR(${String(t)})`);
    assert.strictEqual(d.totalDaLinha(1.0004, 1000), base.arredondar(base.arredondarQuantidade(1.0004) * base.arredondar(1000)));
  });

  await caso('o backend usa o pacote comum (sem cópia própria)', () => {
    const htmlPdf = require('../src/utils/htmlPdf');
    for (const nome of ['escapeHtml', 'formatarMoeda', 'formatarData', 'formatarDataDeHoje']) assert.strictEqual(htmlPdf[nome], base[nome], `htmlPdf.${nome}`);
    const texto = require('../src/utils/texto');
    for (const nome of ['semAcento', 'chaveNome']) assert.strictEqual(texto[nome], base[nome], `texto.${nome}`);
    assert.strictEqual(require('../src/utils/numeroBR').paraNumeroBR, base.paraNumeroBR);
    const calc = require('../src/utils/calculoProposta');
    for (const nome of ['numeroSeguro', 'arredondar', 'arredondarQuantidade']) assert.strictEqual(calc[nome], base[nome], `calculoProposta.${nome}`);
  });

  await caso('as skills usam o pacote comum (docx-base, entrega, fabricação)', () => {
    const docx = require(path.join(COMUM, 'docx-base'));
    assert.strictEqual(docx.fmtNum, base.numeroBr);
    assert.strictEqual(docx.fmtData, base.dataIsoBr);
    assert.strictEqual(require(path.join(COMUM, 'entrega')).dataBr, base.dataIsoBr);
    assert.strictEqual(require(path.join(COMUM, 'fabricacao', 'svg')).escapeHtml, base.escapeHtml);
  });

  await caso('valores de sempre (a saída dos documentos não muda)', () => {
    const NBSP = ' '; // o toLocaleString de moeda separa "R$" com espaço que não quebra
    assert.strictEqual(base.formatarMoeda(1234.5), `R$${NBSP}1.234,50`);
    assert.strictEqual(base.formatarMoeda(null), `R$${NBSP}0,00`);
    assert.strictEqual(base.formatarMoeda('', { vazio: '—' }), '—');
    assert.strictEqual(base.formatarData('2026-01-15'), '15/01/2026');
    assert.strictEqual(base.formatarData(new Date('2026-01-15T00:00:00Z')), '15/01/2026');
    assert.strictEqual(base.formatarData('a definir'), 'a definir');
    assert.strictEqual(base.formatarData(null), '—');
    assert.strictEqual(base.formatarDataDeHoje(new Date('2026-01-16T01:30:00Z')), '15/01/2026'); // 22h30 em Brasília
    assert.strictEqual(base.dataIsoBr('2026-10-27T10:00'), '27/10/2026');
    assert.strictEqual(base.dataIsoBr('sem data'), 'sem data');
    assert.strictEqual(base.numeroBr(1234.567), '1.234,57');
    assert.strictEqual(base.numeroBr(2.5, 0), '3');
    assert.strictEqual(base.numeroBr('abc'), '—');
    assert.strictEqual(base.escapeHtml(`<a href="x">O'Neil & Cia</a>`), '&lt;a href=&quot;x&quot;&gt;O&#39;Neil &amp; Cia&lt;/a&gt;');
    assert.strictEqual(base.escapeHtml(null), '');
    assert.strictEqual(base.escXml('a < b & "c"'), 'a &lt; b &amp; &quot;c&quot;');
    assert.strictEqual(base.escXml(undefined), '');
    // o esc do backend mantém o String(s) de sempre (o XML da NFS-e não muda)
    assert.strictEqual(require('../src/utils/xml').esc(undefined), 'undefined');
    assert.strictEqual(base.chaveNome('Clínica São José-2'), 'CLINICA SAO JOSE 2');
    assert.strictEqual(base.arredondar(1.005), 1.01);
    assert.strictEqual(base.arredondarQuantidade('1.0005'), 1.001);
    assert.strictEqual(base.paraNumeroBR('12.50'), 12.5);
  });

  await caso('timbrado único: dados da empresa e imagens de skills/_comum', () => {
    assert.strictEqual(base.EMPRESA, require(path.join(COMUM, 'empresa')).EMPRESA);
    assert.strictEqual(base.PASTA_ASSETS, require('../src/config/caminhos').ASSETS_COMUM);
    for (const arq of [base.LOGO, base.CABECALHO]) assert.ok(fs.existsSync(arq), `falta ${arq}`);
    assert.ok(base.EMPRESA.cnpj && base.linhasRodape().length === 3);
  });

  console.log(`comum: ${ok} caso(s) ok`);
})();
