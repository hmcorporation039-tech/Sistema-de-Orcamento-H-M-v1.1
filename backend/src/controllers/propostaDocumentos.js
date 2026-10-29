// Documentos da proposta para o cliente: o PDF (com os anexos opcionais curva
// ABC, memória do BDI e imagem do modelo 3D), a planilha Excel no modelo H&M e
// o envio do PDF por e-mail com a assinatura da empresa. Separado de
// propostasController.js (cadastro, status e numeração) — só gera e envia, não
// altera a proposta (o e-mail registra o envio no histórico dela).
// montarPdfBuffer também serve à aprovação por link (aprovacaoController).
const pool = require('../config/database');
const { gerarPdfDeHtml } = require('../services/pdfPuppeteer');
const { gerarHtmlProposta, gerarFooterTemplate, EMPRESA } = require('../utils/pdfTemplate');
const { criarTransportador } = require('../services/email/smtp');
const { comTransacao } = require('../services/transacao');
const { salvarPdfPropostaNasPastas } = require('../services/pastasRegistros');
const { gerarPlanilhaCliente } = require('../services/planilhaOrcamentoCliente');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const { registrarEvento } = require('./propostasController');

// Assinatura padrão da empresa — entra sempre no final de todo e-mail
// enviado ao cliente (mensagem padrão ou digitada à mão), sem exceção.
// Telefone, e-mail e endereço vêm de skills/_comum/empresa.js: antes eram
// escritos aqui à mão e divergiam do papel timbrado ((61) 99185-9745 e
// hemengetecnologia@ — o correto, confirmado pelo usuário em 29/10/2026, é o
// da proposta).
const ASSINATURA_EMPRESA = `${EMPRESA.razaoSocial}
Engenharia • Tecnologia • Segurança Eletrônica

📞 WhatsApp: ${EMPRESA.telefone}
✉ E-mail: ${EMPRESA.email}
🌐 Site: www.hemengetecnologia.com

📍 ${EMPRESA.endereco} | CEP ${EMPRESA.cep}`;

// Anexos opcionais do PDF (2.0, Fase 3F), todos desligados por padrão:
// ?curva_abc=1 (curva ABC dos itens) e ?composicao_bdi=1 (memória do BDI pela
// fórmula do TCU — exigida em proposta para órgão público). No e-mail, vêm em
// req.body.anexos = { curva_abc, composicao_bdi }.
const ligado = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'sim';
function lerAnexosPdf(fonte) {
  const f = fonte && typeof fonte === 'object' ? fonte : {};
  return { curvaAbc: ligado(f.curva_abc), composicaoBdi: ligado(f.composicao_bdi) };
}

async function montarPdfBuffer(id, anexos = {}) {
  // proposta, seções e itens do MESMO retrato (REPEATABLE READ): lidos em
  // comandos soltos, um PDF gerado durante uma edição podia sair com as seções
  // novas e os itens antigos (ou sem itens). Só as leituras ficam na transação;
  // o 3D e o Chromium vêm depois, sem segurar conexão do banco.
  const lido = await comTransacao(async (client) => {
    const proposta = await client.query('SELECT * FROM propostas WHERE id = $1', [id]);
    if (proposta.rows.length === 0) return null;
    const secoes = await client.query(
      'SELECT * FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem',
      [id]
    );
    const itens = await client.query(
      'SELECT * FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem',
      [id]
    );
    return { proposta, secoes, itens };
  }, { isolamento: 'REPEATABLE READ' });
  if (!lido) return null;
  const { proposta, secoes, itens } = lido;

  // modelo 3D ligado para o cliente (2.3): imagem como anexo. Falha na captura
  // (sem arquitetura, WebGL indisponível) não impede o PDF — sai sem o anexo.
  let modelo3d = null;
  if (proposta.rows[0].modelo_3d_cliente) {
    try {
      const imagem = await require('../services/modelo3d').imagemDoModelo('proposta', proposta.rows[0].id);
      if (imagem) modelo3d = { imagem, comLink: true };
    } catch (e) {
      console.warn(`PDF da proposta ${id} sem o modelo 3D: ${e.message}`);
    }
  }
  const html = gerarHtmlProposta({ ...proposta.rows[0], secoes: secoes.rows, itens: itens.rows }, { ...anexos, modelo3d });

  // puppeteer 25 devolve Uint8Array: sem Buffer.from, o res.send do Express 4
  // respondia JSON ({"0":37,"1":80,...}) no lugar do PDF (download e anexo)
  const pdf = Buffer.from(await gerarPdfDeHtml(html, {
    margin: { top: '12mm', bottom: '24mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: gerarFooterTemplate(),
  }));
  return { proposta: proposta.rows[0], pdf };
}

function nomeArquivoProposta(proposta) {
  const nomeCliente = String(proposta.cliente_nome || '').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
  return `${nomeCliente}_${proposta.numero}.pdf`;
}

async function gerarPdf(req, res) {
  const { id } = req.params;
  try {
    const resultado = await montarPdfBuffer(id, lerAnexosPdf(req.query));
    if (!resultado) return res.status(404).json({ erro: 'Proposta não encontrada' });
    // orçamento vindo de análise/laudo: a cópia na pasta deles vira esta versão
    await salvarPdfPropostaNasPastas(resultado.proposta, resultado.pdf);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDisposition(nomeArquivoProposta(resultado.proposta)),
    });
    res.send(resultado.pdf);
  } catch (err) {
    // fila de PDF cheia (services/pdfPuppeteer.js): passageiro, a mensagem diz o que fazer
    if (err.codigo === 'FILA_PDF_CHEIA') return res.status(503).json({ erro: err.message });
    console.error('Erro ao gerar PDF:', err);
    res.status(500).json({ erro: 'Erro ao gerar PDF da proposta' });
  }
}

// Planilha Excel do orçamento para o cliente (modelo H&M: parâmetros,
// orçamento, resumo, quantitativos, pesquisa de preços, fornecedores e
// cronograma — ver services/planilhaOrcamentoCliente.js)
async function gerarPlanilha(req, res) {
  const r = await gerarPlanilhaCliente(req.params.id);
  if (!r) return res.status(404).json({ erro: 'Proposta não encontrada' });
  const nome = nomeArquivoProposta(r.proposta).replace(/\.pdf$/i, '.xlsx');
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': contentDisposition(nome),
  });
  res.send(Buffer.from(r.buffer));
}

async function enviarEmail(req, res) {
  const { id } = req.params;
  const { destinatario, mensagem } = req.body;

  if (!destinatario || typeof destinatario !== 'string' || destinatario.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
    return res.status(400).json({ erro: 'Informe um e-mail de destino válido' });
  }
  if (mensagem != null && (typeof mensagem !== 'string' || mensagem.length > 10000)) {
    return res.status(400).json({ erro: 'A mensagem deve ser um texto de até 10.000 caracteres' });
  }

  const resultado = await montarPdfBuffer(id, lerAnexosPdf(req.body.anexos));
  if (!resultado) return res.status(404).json({ erro: 'Proposta não encontrada' });
  const { proposta, pdf } = resultado;
  await salvarPdfPropostaNasPastas(proposta, pdf);

  // A assinatura padrão sempre vai no final — tanto na mensagem padrão
  // quanto numa digitada pelo usuário, sem exceção (não dá pra mandar sem
  // ela por esquecimento ou por apagar sem querer).
  const corpoMensagem = (mensagem && mensagem.trim())
    || `Olá,\n\nSegue em anexo a proposta ${proposta.numero}.`;
  const textoCompleto = `${corpoMensagem}\n\n${ASSINATURA_EMPRESA}`;

  const transportador = criarTransportador();
  await transportador.sendMail({
    from: `"H&M Engenharia" <${process.env.EMAIL_IMAP_USER}>`,
    to: destinatario,
    subject: `Proposta ${proposta.numero} — ${EMPRESA.nomeFantasia}`,
    text: textoCompleto,
    attachments: [
      { filename: nomeArquivoProposta(proposta), content: pdf, contentType: 'application/pdf' },
    ],
  });

  // fica no histórico da proposta quem enviou e para onde (sai da caixa da empresa)
  await registrarEvento(pool, proposta.id, req.usuario.id, 'email', `Enviada por e-mail para ${destinatario}`)
    .catch(e => console.warn('Evento de envio por e-mail não registrado:', e.message));
  res.json({ mensagem: `Proposta ${proposta.numero} enviada para ${destinatario}` });
}

module.exports = {
  gerarPdf, gerarPlanilha, enviarEmail,
  // PDF da proposta sem resposta HTTP (aprovação por link, cópia na pasta do projeto/laudo)
  montarPdfBuffer,
};
