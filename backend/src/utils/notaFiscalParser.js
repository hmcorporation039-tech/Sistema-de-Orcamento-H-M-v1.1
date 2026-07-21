const xml2js = require('xml2js');
const { PDFParse } = require('pdf-parse');

async function parseNFeXml(buffer) {
  const parsed = await xml2js.parseStringPromise(buffer.toString('utf8'), {
    explicitArray: false,
    tagNameProcessors: [xml2js.processors.stripPrefix],
  });

  const nfe = parsed.nfeProc?.NFe || parsed.NFe;
  const infNFe = nfe?.infNFe;
  if (!infNFe) {
    throw new Error('O arquivo XML não parece ser uma NF-e válida');
  }

  let dets = infNFe.det || [];
  if (!Array.isArray(dets)) dets = [dets];

  const itens = dets
    .map(d => {
      const p = d.prod || {};
      return {
        codigo: p.cProd || '',
        descricao: p.xProd || '',
        ncm: (p.NCM || '').replace(/\D/g, ''),
        unidade: p.uCom || '',
        preco: parseFloat(p.vUnCom) || 0,
        quantidade: parseFloat(p.qCom) || null,
      };
    })
    .filter(it => it.descricao);

  const idNota = infNFe.$?.Id || '';
  const chaveAcesso = idNota.replace(/^NFe/i, '').replace(/\D/g, '').slice(0, 44) || null;
  const numero = infNFe.ide?.nNF || null;

  return { itens, chaveAcesso, numero };
}

async function extrairDoXml(buffer) {
  const { itens } = await parseNFeXml(buffer);
  return itens;
}

function paraNumeroBR(s) {
  if (!s) return null;
  const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

// Linha completa no layout padrão do DANFE: código, descrição, NCM/SH, CST,
// CFOP, unidade, quantidade, valor unitário, valor total (nessa ordem).
const LINHA_COMPLETA = /^\s*(\S{1,20})\s+(.+?)\s+(\d{4}\.?\d{2}\.?\d{2})\s+(\d{2,3})\s+(\d{3,4})\s+([A-Za-zÀ-ÿ%]{1,6})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/;

// DANFE não guarda estrutura de tabela no texto extraído do PDF — cada
// fornecedor/emissor gera o layout de um jeito. Tentamos o padrão completo
// por linha e, se não bater, caímos para um modo só descrição + NCM. Por
// isso a tela de importação sempre pede revisão antes de gravar no catálogo.
function extrairDoPdfTexto(texto) {
  const inicioIdx = texto.search(/DESCRI[ÇC][ÃA]O DO PRODUTO/i);
  const fimIdx = texto.search(/C[ÁA]LCULO DO ISSQN|DADOS ADICIONAIS|DADOS DO TRANSPORTE/i);
  const bloco = inicioIdx >= 0
    ? texto.slice(inicioIdx, fimIdx > inicioIdx ? fimIdx : texto.length)
    : texto;

  const linhas = bloco.split('\n').map(l => l.trim()).filter(Boolean);
  const regexNcmSolto = /\b(\d{4}\.?\d{2}\.?\d{2})\b/;
  const itens = [];

  for (const linha of linhas) {
    if (/^C[ÓO]DIGO\b/i.test(linha) || /DESCRI[ÇC][ÃA]O DO PRODUTO/i.test(linha)) continue;

    const completa = linha.match(LINHA_COMPLETA);
    if (completa) {
      const [, codigo, descricao, ncm, , , unidade, quantidade, valorUnitario] = completa;
      itens.push({
        codigo,
        descricao: descricao.replace(/\s{2,}/g, ' ').trim(),
        ncm: ncm.replace(/\./g, ''),
        unidade,
        preco: paraNumeroBR(valorUnitario) || 0,
        quantidade: paraNumeroBR(quantidade),
      });
      continue;
    }

    const solto = linha.match(regexNcmSolto);
    if (!solto) continue;
    const antes = linha.slice(0, solto.index).trim().split(/\s+/).filter(Boolean);
    if (antes.length === 0) continue;
    const codigo = antes.length > 1 && antes[0].length <= 15 ? antes[0] : '';
    const descricao = (codigo ? antes.slice(1) : antes).join(' ').trim();
    if (descricao.length < 3) continue;

    itens.push({
      codigo,
      descricao,
      ncm: solto[1].replace(/\./g, ''),
      unidade: '',
      preco: 0,
      quantidade: null,
    });
  }

  return itens;
}

async function extrairDoPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const { text } = await parser.getText();
    return extrairDoPdfTexto(text);
  } finally {
    await parser.destroy();
  }
}

async function extrairNotaFiscal(buffer, nomeArquivo) {
  const ext = (nomeArquivo || '').toLowerCase().split('.').pop();

  if (ext === 'xml') {
    return { fonte: 'xml', itens: await extrairDoXml(buffer) };
  }
  if (ext === 'pdf') {
    return { fonte: 'pdf', itens: await extrairDoPdf(buffer) };
  }
  throw new Error('Formato de arquivo não suportado. Envie um PDF (DANFE) ou XML da NF-e.');
}

module.exports = { extrairNotaFiscal, extrairDoXml, extrairDoPdf, extrairDoPdfTexto, parseNFeXml };
