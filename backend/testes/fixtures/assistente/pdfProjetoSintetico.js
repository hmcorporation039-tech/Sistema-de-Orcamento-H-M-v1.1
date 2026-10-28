// PDF SINTÉTICO de um projeto de CFTV (nenhum dado de cliente real) para os
// testes do assistente e para a conversa de validação: carimbo com cliente
// fictício, ambientes com área ("A= 20,00m²") e câmeras por código (CAM1…CAM6),
// como o texto que o CAD exporta. Uso: node pdfProjetoSintetico.js <saida.pdf>
function montarPdf(linhas) {
  const esc = (s) => String(s).replace(/[\\()]/g, (c) => `\\${c}`);
  const conteudo = linhas.map(([x, y, t, tam = 9]) => `BT /F1 ${tam} Tf ${x} ${y} Td (${esc(t)}) Tj ET`).join('\n');
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

function pdfCftvSintetico() {
  const l = [];
  // ambientes: nome numa linha, área na seguinte
  const amb = [['RECEPCAO', 120, 700, '32,50'], ['SALA 01', 320, 700, '20,00'], ['SALA 02', 520, 700, '20,00'],
    ['CORREDOR', 120, 500, '45,00'], ['ESTACIONAMENTO', 320, 500, '180,00'], ['DEPOSITO', 520, 500, '12,00']];
  for (const [nome, x, y, area] of amb) { l.push([x, y, nome]); l.push([x, y - 12, `A= ${area}m²`]); }
  // câmeras por código, perto dos ambientes
  [[140, 660], [340, 660], [540, 660], [140, 460], [340, 460], [380, 440]].forEach(([x, y], i) => l.push([x, y, `CAM${i + 1}`, 7]));
  // legenda e carimbo
  l.push([900, 780, 'LEGENDA']);
  l.push([900, 760, 'CAM CAMERA IP BULLET 4MP INFRAVERMELHO 30M']);
  l.push([900, 160, 'CLIENTE: ESCOLA MODELO TESTE ASSISTENTE']);
  l.push([900, 145, 'PROJETO: SISTEMA DE CFTV - PLANTA BAIXA TERREO']);
  l.push([900, 130, 'ESCALA 1:100']);
  l.push([900, 115, 'REVISAO R00 - DATA 27/10/2026']);
  return montarPdf(l);
}

module.exports = { pdfCftvSintetico, montarPdf };

if (require.main === module) {
  const saida = process.argv[2];
  if (!saida) { console.error('Uso: node pdfProjetoSintetico.js <saida.pdf>'); process.exit(2); }
  require('fs').writeFileSync(saida, pdfCftvSintetico());
  console.log(`PDF sintético gravado em ${saida}`);
}
