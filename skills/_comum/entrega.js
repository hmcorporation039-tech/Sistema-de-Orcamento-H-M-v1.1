// Entregas do projeto (versão 2.1): marcação AS BUILT nos arquivos gerados
// pelas skills e o pacote ZIP da entrega. Não muda o gerador de nenhuma
// skill: a marca é aplicada no arquivo pronto (Word, Excel, QElectroTech), e a
// planta DXF recebe a marca no carimbo (cad/planta.js).
//
// AS BUILT = "conforme executado": a MESMA documentação do projeto, com o
// título/carimbo "AS BUILT", a data e a revisão do as-built. O conteúdo
// reflete o executado quando o formulário do projeto foi atualizado com o que
// foi feito na obra — a marca não altera cálculo nem quantidades.
const JSZip = require('jszip');
const ExcelJS = require('exceljs');

const xml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function dataBr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
}

// "AS BUILT — conforme executado — Rev. R02 — 27/10/2026"
function textoAsBuilt({ revisao, data } = {}) {
  return ['AS BUILT — conforme executado', revisao ? `Rev. ${revisao}` : null, data ? dataBr(data) : null].filter(Boolean).join(' — ');
}

// Próxima revisão sugerida para o as-built: "R00 — emissão" → "R01 — As built"
function revisaoAsBuiltSugerida(revisaoAtual) {
  const m = /^R(\d+)/i.exec(String(revisaoAtual || '').trim());
  const n = m ? Number(m[1]) + 1 : 1;
  return `R${String(n).padStart(2, '0')} — As built`;
}

const paragrafoWord = (texto, { tamanho = 28, cor = 'C00000' } = {}) =>
  `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="${cor}"/><w:sz w:val="${tamanho}"/><w:szCs w:val="${tamanho}"/></w:rPr><w:t xml:space="preserve">${xml(texto)}</w:t></w:r></w:p>`;

// Word: faixa "AS BUILT" no início do corpo e no fim de cada cabeçalho
// (todas as páginas). Título do documento (propriedades) também ganha a marca.
async function marcarAsBuiltDocx(buffer, opcoes = {}) {
  const texto = textoAsBuilt(opcoes);
  const zip = await JSZip.loadAsync(buffer);
  const doc = zip.file('word/document.xml');
  if (!doc) throw new Error('arquivo Word inválido (sem word/document.xml)');
  let corpo = await doc.async('string');
  if (!corpo.includes('<w:body>')) throw new Error('arquivo Word inválido (sem <w:body>)');
  corpo = corpo.replace('<w:body>', `<w:body>${paragrafoWord(texto, { tamanho: 32 })}`);
  zip.file('word/document.xml', corpo);
  for (const nome of Object.keys(zip.files).filter(n => /^word\/header\d*\.xml$/.test(n))) {
    const h = await zip.file(nome).async('string');
    if (h.includes('</w:hdr>')) zip.file(nome, h.replace('</w:hdr>', `${paragrafoWord(texto, { tamanho: 18 })}</w:hdr>`));
  }
  const core = zip.file('docProps/core.xml');
  if (core) {
    const c = await core.async('string');
    zip.file('docProps/core.xml', /<dc:title>/.test(c)
      ? c.replace(/<dc:title>/, '<dc:title>AS BUILT — ')
      : c.replace('</cp:coreProperties>', `<dc:title>${xml(texto)}</dc:title></cp:coreProperties>`));
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Cabeçalho de impressão do Excel ("&Lesquerda&Ccentro&Rdireita"): troca só a
// seção central e mantém o que já havia à esquerda e à direita.
function cabecalhoComCentro(atual, centro) {
  const secoes = { L: '', C: '', R: '' };
  const partes = String(atual || '').split(/&([LCR])/);
  secoes.C = partes[0] || ''; // texto sem marcador vai para o centro (padrão do Excel)
  for (let i = 1; i < partes.length; i += 2) secoes[partes[i]] = partes[i + 1] || '';
  secoes.C = centro;
  return ['L', 'C', 'R'].filter(k => secoes[k]).map(k => `&${k}${secoes[k]}`).join('');
}

// Excel: cabeçalho de impressão "AS BUILT" em todas as abas e uma aba
// "AS BUILT" com a marca, a data e a revisão (não mexe em células nem
// fórmulas das abas de cálculo).
async function marcarAsBuiltXlsx(buffer, opcoes = {}) {
  const texto = textoAsBuilt(opcoes);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  wb.title = `AS BUILT — ${wb.title || ''}`.trim();
  wb.eachSheet((ws) => {
    const hf = ws.headerFooter || {};
    ws.headerFooter = { ...hf, oddHeader: cabecalhoComCentro(hf.oddHeader, `&"Arial,Bold"&12${texto.replace(/&/g, '&&')}`) };
  });
  const aba = wb.addWorksheet('AS BUILT');
  aba.headerFooter = { oddHeader: cabecalhoComCentro('', `&"Arial,Bold"&12${texto.replace(/&/g, '&&')}`) };
  aba.getColumn(1).width = 90;
  aba.getCell('A1').value = 'AS BUILT';
  aba.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FFC00000' } };
  aba.getCell('A2').value = texto;
  aba.getCell('A2').font = { bold: true, size: 12 };
  aba.getCell('A4').value = 'Documentação conforme executado. As planilhas deste arquivo refletem o formulário do projeto atualizado com o que foi executado na obra.';
  aba.getCell('A4').alignment = { wrapText: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// QElectroTech: título do projeto e das folhas com "AS BUILT"
function marcarAsBuiltQet(textoXml, opcoes = {}) {
  const prefixo = xml('AS BUILT — ');
  let saida = String(textoXml).replace(/(<project\b[^>]*\btitle=")/, `$1${prefixo}`);
  saida = saida.replace(/(<diagram\b[^>]*\btitle=")/g, `$1${prefixo}`);
  // cartouche: revisão curta ("R01 AS BUILT") e data do as-built (AAAAMMDD)
  const rev = `${String(opcoes.revisao || '').trim().split(/\s+/)[0] || ''} AS BUILT`.trim();
  saida = saida.replace(/(<(?:diagram|inset)\b[^>]*\bindexrev=")[^"]*"/g, `$1${xml(rev)}"`);
  const data = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(opcoes.data || ''));
  if (data) saida = saida.replace(/(<(?:diagram|inset)\b[^>]*\bdate=")\d*"/g, `$1${data[1]}${data[2]}${data[3]}"`);
  return saida;
}

// arquivos: [{ nome: 'pasta/arquivo.ext', buffer }] → ZIP (Buffer)
async function zipar(arquivos) {
  const zip = new JSZip();
  for (const a of arquivos) zip.file(a.nome, a.buffer, { date: new Date() });
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

module.exports = { cabecalhoComCentro, textoAsBuilt, revisaoAsBuiltSugerida, marcarAsBuiltDocx, marcarAsBuiltXlsx, marcarAsBuiltQet, zipar, dataBr };
