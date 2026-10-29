const path = require('path');
const { textoDoPdf, paginasComoImagem: paginasDoPdf } = require('../utils/leitorPdf');
const { extrairLayoutsConhecidos } = require('../utils/cotacaoFornecedorParser');
const { extrairUniversal, conferirTotal } = require('../utils/leitorCotacaoUniversal');
const { extrairComIA, iaDisponivel } = require('./leitorCotacaoIA');

// Leitura de orçamento/cotação de fornecedor em QUALQUER layout, vindo da pasta
// ou do e-mail (PDF com texto, PDF escaneado ou foto). Ordem, da mais barata e
// confiável para a mais cara:
//   1. texto do PDF → layout conhecido (ADM, Dispel, BAND, ECO…);
//   2. texto do PDF → leitor universal (quantidade × unitário = total por linha);
//   3. sem texto (escaneado/foto) → OCR local (tesseract.js) → 1 e 2;
//   4. nada reconhecido → Claude (se configurado), com a mesma conferência.
// Todo item aceito tem quantidade × unitário = total conferido; a soma ainda é
// comparada com o total impresso no documento ("confere").
//
// VERSAO_LEITOR sobe quando a leitura melhora: arquivos e e-mails que antes
// saíram com 0 itens voltam a ser lidos automaticamente na próxima varredura.
const VERSAO_LEITOR = 2;
const MAX_PAGINAS_OCR = 6;
const EXTENSOES = /\.(pdf|png|jpe?g)$/i;

function tipoDoArquivo(buffer, nome = '') {
  const cab = buffer.subarray(0, 8);
  if (cab.subarray(0, 4).toString() === '%PDF') return 'pdf';
  if (cab[0] === 0x89 && cab.subarray(1, 4).toString() === 'PNG') return 'png';
  if (cab[0] === 0xff && cab[1] === 0xd8) return 'jpg';
  const ext = path.extname(nome).toLowerCase();
  return ext === '.pdf' ? 'pdf' : ext === '.png' ? 'png' : /\.jpe?g$/.test(ext) ? 'jpg' : null;
}

const letras = (t) => (String(t || '').match(/[A-Za-zÀ-ÿ]/g) || []).length;

// Proposta da própria H&M (ex.: cliente respondendo o e-mail com o nosso PDF
// anexado) não é cotação de fornecedor — os preços são de venda, não de custo.
function ehDocumentoDaHM(texto) {
  return /Subtotal m[ãa]o de obra/i.test(texto) && /\bBDI\b/.test(texto) && /Dados Banc[áa]rios/i.test(texto);
}

// Orçamento de fornecedor é endereçado à H&M (cliente: H&M, CNPJ, e-mail).
// No e-mail isso separa cotação de fornecedor de carta-convite, planilha
// orçamentária de licitação e RFQ de cliente — que também têm qtd × unitário =
// total, mas são preços de referência/venda, não custo de compra.
function mencionaHM(texto) {
  return /H\s*&\s*M\s+ENGENHARIA|HEM\s+ENGENHARIA|04\.?003\.?376|hm\s?engetecnologia|hemengetecnologia|MARCIO\s+HENRIQUE/i.test(String(texto || ''));
}

// Worker de OCR compartilhado pelas leituras (pasta e e-mail). Antes, a
// leitura que terminava primeiro encerrava o worker no meio do trabalho da
// outra. Agora encerrarOcr só agenda o desligamento para depois de 1 minuto
// sem uso, e nunca enquanto houver reconhecimento em andamento.
let ocrWorker = null; // Promise do worker
let ocrEmUso = 0;
let ocrTimer = null;
async function ocr(imagens) {
  const Tesseract = require('tesseract.js');
  const dadosPor = require('@tesseract.js-data/por');
  clearTimeout(ocrTimer);
  ocrEmUso++;
  try {
    if (!ocrWorker) ocrWorker = Tesseract.createWorker('por', 1, { langPath: dadosPor.langPath, gzip: dadosPor.gzip, cacheMethod: 'none' });
    const worker = await ocrWorker;
    const partes = [];
    for (const img of imagens) partes.push((await worker.recognize(img)).data.text);
    return partes.join('\n');
  } catch (e) {
    ocrWorker = null; // worker quebrado: o próximo uso cria outro
    throw e;
  } finally {
    ocrEmUso--;
  }
}
function encerrarOcr() {
  clearTimeout(ocrTimer);
  ocrTimer = setTimeout(async () => {
    if (ocrEmUso > 0 || !ocrWorker) return;
    const w = ocrWorker;
    ocrWorker = null;
    const worker = await w.catch(() => null);
    if (worker) await worker.terminate().catch(() => {});
  }, 60000);
  if (ocrTimer.unref) ocrTimer.unref();
  return Promise.resolve();
}

// leitura do PDF: utils/leitorPdf.js (a mesma da análise de projeto e da nota fiscal)
const paginasComoImagem = (buffer) => paginasDoPdf(buffer, { escala: 2.5, maxPaginas: MAX_PAGINAS_OCR });

function lerTexto(texto) {
  const conhecido = extrairLayoutsConhecidos(texto);
  const universal = extrairUniversal(texto);
  // layout conhecido traz marca/NCM/IPI certinhos; fica com ele salvo se o
  // universal achou mais itens (layout mudou e o leitor específico perdeu linhas)
  if (conhecido.itens.length && conhecido.itens.length >= universal.itens.length) {
    return { itens: conhecido.itens, metodo: `layout ${conhecido.modelo}`, conferencia: conferirTotal(conhecido.itens.map(i => ({ ...i, total: i.preco * i.quantidade })), texto) };
  }
  return { itens: universal.itens, metodo: 'leitor universal', conferencia: universal.conferencia };
}

// Resultado da IA → itens no formato do catálogo, só com linhas que fecham a conta.
function itensDaIA(r, texto) {
  const itens = [];
  for (const i of r.itens) {
    if (!(i.quantidade > 0) || !(i.precoImpresso > 0) || i.descricao.length < 4) continue;
    if (i.total != null && Math.abs(i.quantidade * i.precoImpresso - i.total) > Math.max(0.02, i.quantidade * 0.0051, i.total * 0.001)) continue;
    itens.push({ descricao: i.descricao, codigo: i.codigo, marca: i.marca, unidade: i.unidade, quantidade: i.quantidade,
      preco: Math.round(i.precoImpresso * (1 + i.ipi / 100) * 100) / 100, total: i.total ?? i.quantidade * i.precoImpresso, ncm: i.ncm });
  }
  const somaImpressa = itens.reduce((a, i) => a + i.total, 0);
  let conferencia = conferirTotal(itens, texto);
  if (!conferencia.confere && r.totalDocumento) {
    conferencia = { soma: Math.round(somaImpressa * 100) / 100, totalDocumento: r.totalDocumento, confere: Math.abs(somaImpressa - r.totalDocumento) <= Math.max(0.1, r.totalDocumento * 0.002) };
  }
  return { itens, conferencia };
}

// opcoes.permitirIA: false para nunca chamar a IA (ex.: limite por varredura)
async function lerDocumentoCotacao(buffer, nome, opcoes = {}) {
  const avisos = [];
  const tipo = tipoDoArquivo(buffer, nome);
  if (!tipo) return { itens: [], metodo: null, conferencia: null, avisos: ['formato não suportado (use PDF, PNG ou JPG)'], usouIA: false };

  let texto = '';
  let viaOcr = false;
  let falhaOcr = false;
  if (tipo === 'pdf') {
    try { texto = await textoDoPdf(buffer); } catch (e) { avisos.push(`PDF ilegível: ${e.message}`); }
  }
  if (ehDocumentoDaHM(texto)) return { itens: [], metodo: 'proposta da própria H&M (ignorada)', conferencia: null, avisos, usouIA: false, daHM: true };

  let resultado = letras(texto) >= 40 ? lerTexto(texto) : { itens: [], metodo: null, conferencia: null };
  if (!resultado.itens.length && letras(texto) < 40) {
    // PDF escaneado ou foto: OCR local e as mesmas leituras sobre o texto reconhecido
    try {
      const imagens = tipo === 'pdf' ? await paginasComoImagem(buffer) : [buffer];
      texto = await ocr(imagens);
      viaOcr = true;
      if (ehDocumentoDaHM(texto)) return { itens: [], metodo: 'proposta da própria H&M (ignorada)', conferencia: null, avisos, usouIA: false, daHM: true };
      resultado = lerTexto(texto);
      resultado.metodo = `OCR + ${resultado.metodo}`;
    } catch (e) {
      avisos.push(`OCR falhou: ${e.message}`);
      falhaOcr = true; // falha passageira: o arquivo fica pendente e é relido na próxima varredura
    }
  }
  // leitura que precisa conferir com o total do documento para entrar: OCR e leitor universal
  // (layout conhecido já é específico do fornecedor)
  const exigeConferencia = viaOcr || /leitor universal/.test(resultado.metodo || '');

  // opcoes.exigirClienteHM (e-mail): documento que não cita a H&M não é cotação para nós
  if (opcoes.exigirClienteHM && letras(texto) >= 40 && !mencionaHM(texto)) {
    return { itens: [], metodo: 'não endereçado à H&M (ignorado)', conferencia: null, avisos: [], viaOcr, usouIA: false, ignorado: true };
  }

  let usouIA = false;
  let pendente = false; // IA necessária mas indisponível agora — tentar de novo depois
  // IA só para documento com cara de lista de preços (3+ linhas com valor em
  // reais): proposta de preço global, logotipo de assinatura, boleto ou
  // contrato não gastam a cota do Claude Max.
  const linhasComValor = String(texto || '').split('\n').filter(l => /\d,\d{2}(?!\d)/.test(l)).length;
  const precisaIA = linhasComValor >= 3 && (!resultado.itens.length || (exigeConferencia && !resultado.conferencia?.confere));
  if (precisaIA && opcoes.permitirIA === false && iaDisponivel()) pendente = true;
  if (precisaIA && opcoes.permitirIA !== false && iaDisponivel()) {
    try {
      usouIA = true;
      const r = await extrairComIA(buffer, tipo);
      if (!r.ehOrcamento) {
        avisos.push(`a IA (${r.fonte}) indicou que o documento não é orçamento de fornecedor`);
      } else {
        const ia = itensDaIA(r, texto);
        // Da IA só entra leitura conferida: a soma bate com um total do
        // documento, ou duas leituras independentes (OCR local e IA) chegam
        // aos mesmos itens e à mesma soma (ex.: foto sem a página do total).
        const concordam = exigeConferencia && resultado.itens.length === ia.itens.length
          && Math.abs(resultado.conferencia.soma - ia.conferencia.soma) <= Math.max(0.1, ia.conferencia.soma * 0.002);
        if (ia.itens.length && (ia.conferencia.confere || concordam)) {
          resultado = { itens: ia.itens, metodo: concordam && !ia.conferencia.confere ? `OCR + IA (${r.fonte}) concordantes` : `IA (${r.fonte})`,
            conferencia: concordam && !ia.conferencia.confere ? { ...ia.conferencia, confere: true, criterio: 'duas leituras concordantes' } : ia.conferencia };
          viaOcr = false;
        } else if (ia.itens.length) {
          avisos.push(`a IA (${r.fonte}) leu ${ia.itens.length} itens, mas a soma não confere com o total do documento — não importados`);
        }
      }
    } catch (e) {
      if (e.indisponivel) pendente = true;
      avisos.push(`leitura por IA indisponível agora (${e.message.slice(0, 160)}) — será tentada de novo na próxima varredura`);
    }
  }

  // OCR ou leitor universal sem conferência não entram: a conta de cada linha
  // fecha, mas não há como saber se faltou linha (e, no OCR, a descrição pode vir
  // com ruído). Fica como aviso para revisão manual (relido se o leitor melhorar).
  if (exigeConferencia && !/^IA/.test(resultado.metodo || '') && resultado.itens.length && !resultado.conferencia?.confere) {
    avisos.push(`${viaOcr ? 'OCR' : 'Leitor universal'} leu ${resultado.itens.length} itens, mas a soma não confere com o total do documento — não importados; revise o arquivo`);
    return { itens: [], metodo: `${viaOcr ? 'OCR' : 'leitor universal'} sem conferência`, conferencia: resultado.conferencia, viaOcr, usouIA, pendente: pendente || falhaOcr || !usouIA, avisos };
  }
  if (resultado.itens.length && resultado.conferencia && !resultado.conferencia.confere) {
    avisos.push(`soma dos itens (R$ ${resultado.conferencia.soma.toFixed(2)}) não bate com nenhum total do documento — pode faltar item ou o total incluir impostos/frete`);
  }
  return { ...resultado, viaOcr, usouIA, pendente: (pendente || falhaOcr) && !resultado.itens.length, avisos };
}

module.exports = { lerDocumentoCotacao, encerrarOcr, ehDocumentoDaHM, mencionaHM, tipoDoArquivo, VERSAO_LEITOR, EXTENSOES,
  ocr, // OCR local de imagem (também usado pelo leitor de arquivos do assistente)
};
