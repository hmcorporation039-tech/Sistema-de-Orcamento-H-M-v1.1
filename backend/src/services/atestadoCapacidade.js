const JSZip = require('jszip');
const { EMPRESA } = require('../utils/pdfTemplate');

// Atestado de capacidade técnica (item 9 do plano): o corpo do texto que o CLIENTE cola no papel
// timbrado dele e assina. Por isso não tem logo, cabeçalho nem assinatura da H&M. O sistema só
// propõe o texto a partir da nota fiscal emitida; quem atesta é o cliente. Nada é inventado:
// quantitativos, local, período, responsável técnico e signatário só entram se o engenheiro
// informar; sem o dado, a linha some (ou fica um espaço em branco para o cliente preencher).
const LIMITE_QUANTITATIVOS = 20;
const LIMITE_LINHA = 200;
const LIMITE_OBJETO = 700;

const limpar = (v, max = LIMITE_LINHA) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const digitos = (v) => String(v ?? '').replace(/\D/g, '');
const dinheiro = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function dataBR(v) {
  if (!v) return null;
  const s = v instanceof Date ? v.toISOString() : String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

function documentoFormatado(doc) {
  const d = digitos(doc);
  if (d.length === 14) return { rotulo: 'CNPJ', valor: d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') };
  if (d.length === 11) return { rotulo: 'CPF', valor: d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') };
  return null;
}

function enderecoDoTomador(t) {
  const partes = [
    [t.logradouro, t.numero].filter(Boolean).join(', ') || t.endereco,
    t.bairro,
    [t.municipio, t.uf].filter(Boolean).join('/'),
  ].map(x => limpar(x)).filter(Boolean);
  return partes.join(', ');
}

// Só nota EMITIDA gera atestado (o atestado vem depois da nota); rascunho, cancelada e
// substituída não têm serviço fechado para declarar.
function validarNota(nota) {
  if (!nota) return 'Nota fiscal não encontrada.';
  if (nota.situacao !== 'emitida') return 'O atestado só é gerado para nota fiscal emitida.';
  return null;
}

// `opcoes`: { local, inicio, fim, quantitativos[], responsavel_tecnico, crea, art, signatario, cargo,
//             mostrar_valor }
// Devolve { titulo, paragrafos: [{ texto, negrito?, centro?, apos? }], texto, avisos[] }.
function montarAtestado(nota, opcoes = {}) {
  const erro = validarNota(nota);
  if (erro) throw Object.assign(new Error(erro), { status: 400 });

  const tomador = (typeof nota.tomador === 'string' ? JSON.parse(nota.tomador || '{}') : nota.tomador) || {};
  const nomeCliente = limpar(tomador.nome) || '[nome do cliente]';
  const doc = documentoFormatado(tomador.documento);
  const endereco = enderecoDoTomador(tomador);
  const objeto = limpar(nota.discriminacao || nota.servico_descricao, LIMITE_OBJETO) || '[descrição do serviço]';
  const emissao = dataBR(nota.data_emissao);
  const competencia = dataBR(nota.competencia);
  const inicio = dataBR(opcoes.inicio);
  const fim = dataBR(opcoes.fim);
  const local = limpar(opcoes.local);
  const quantitativos = (Array.isArray(opcoes.quantitativos) ? opcoes.quantitativos : String(opcoes.quantitativos || '').split('\n'))
    .map(q => limpar(q)).filter(Boolean).slice(0, LIMITE_QUANTITATIVOS);
  const responsavel = limpar(opcoes.responsavel_tecnico);
  const crea = limpar(opcoes.crea, 40);
  const art = limpar(opcoes.art, 40);
  const signatario = limpar(opcoes.signatario);
  const cargo = limpar(opcoes.cargo);

  const qualificacao = [
    nomeCliente,
    doc ? `inscrito(a) no ${doc.rotulo} nº ${doc.valor}` : null,
    endereco ? `com endereço em ${endereco}` : null,
  ].filter(Boolean).join(', ');

  const nota_ref = [
    nota.numero ? `Nota Fiscal de Serviço Eletrônica (NFS-e) nº ${nota.numero}` : 'Nota Fiscal de Serviço Eletrônica (NFS-e)',
    emissao ? `emitida em ${emissao}` : null,
    competencia ? `competência ${competencia.slice(3)}` : null,
  ].filter(Boolean).join(', ');

  const valor = opcoes.mostrar_valor ? `, no valor de ${dinheiro(nota.valor_servicos)}` : '';

  const paragrafos = [
    { texto: 'ATESTADO DE CAPACIDADE TÉCNICA', negrito: true, centro: true, apos: 360 },
    {
      texto: `${qualificacao}, ATESTA, para os devidos fins, que a empresa ${EMPRESA.razaoSocial}, inscrita no CNPJ nº ${EMPRESA.cnpj}, `
        + `com sede em ${EMPRESA.endereco}, executou para esta empresa o serviço de: ${objeto}, objeto da ${nota_ref}${valor}.`,
      apos: 200,
    },
  ];
  if (local) paragrafos.push({ texto: `Local de execução: ${local}.`, apos: 120 });
  if (inicio && fim) paragrafos.push({ texto: `Período de execução: de ${inicio} a ${fim}.`, apos: 120 });
  else if (inicio) paragrafos.push({ texto: `Início da execução: ${inicio}.`, apos: 120 });
  else if (fim) paragrafos.push({ texto: `Conclusão da execução: ${fim}.`, apos: 120 });
  if (quantitativos.length) {
    paragrafos.push({ texto: 'Principais quantitativos executados:', apos: 60 });
    for (const q of quantitativos) paragrafos.push({ texto: `– ${q}`, apos: 40 });
  }
  if (responsavel) {
    const registro = [crea ? `CREA/CAU nº ${crea}` : null, art ? `ART/RRT nº ${art}` : null].filter(Boolean).join(', ');
    paragrafos.push({ texto: `Responsável técnico pela execução: ${responsavel}${registro ? `, ${registro}` : ''}.`, apos: 120 });
  }
  paragrafos.push({
    texto: 'Os serviços foram executados dentro dos padrões técnicos aplicáveis e dos prazos acordados, nada constando que desabone a empresa contratada.',
    apos: 360,
  });
  paragrafos.push({ texto: '______________, ____ de ______________ de ______.', apos: 600 });
  paragrafos.push({ texto: '____________________________________________', centro: true, apos: 0 });
  paragrafos.push({ texto: signatario || '[nome do signatário]', centro: true, negrito: true, apos: 0 });
  paragrafos.push({ texto: cargo || '[cargo]', centro: true, apos: 0 });
  paragrafos.push({ texto: nomeCliente, centro: true, apos: 0 });

  const avisos = ['Texto proposto pela H&M: quem atesta é o cliente, que confere, ajusta e assina no papel timbrado dele.'];
  if (!quantitativos.length) avisos.push('Sem quantitativos: o atestado de capacidade técnica costuma citar o que foi executado (pontos, metros, potência). Informe os números reais, se houver.');
  if (!responsavel) avisos.push('Sem responsável técnico/ART: informe se o cliente exigir.');
  if (!signatario) avisos.push('Signatário em branco: o cliente preenche o nome e o cargo de quem assina.');
  if (objeto.length >= LIMITE_OBJETO) avisos.push('A descrição da nota foi cortada; confira o texto.');

  return {
    titulo: 'Atestado de capacidade técnica',
    paragrafos,
    texto: paragrafos.map(p => p.texto).join('\n\n'),
    avisos,
  };
}

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// .docx mínimo (zip com 3 arquivos): abre no Word, no LibreOffice e no Google Docs, e o cliente
// copia o texto para o papel timbrado dele. Sem imagem, sem cabeçalho, sem rodapé.
async function gerarDocx(paragrafos) {
  const corpo = paragrafos.map(p => {
    const pPr = `<w:pPr><w:spacing w:after="${Number(p.apos) || 0}" w:line="300" w:lineRule="auto"/><w:jc w:val="${p.centro ? 'center' : 'both'}"/></w:pPr>`;
    const rPr = p.negrito ? '<w:rPr><w:b/></w:rPr>' : '';
    return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${xml(p.texto)}</w:t></w:r></w:p>`;
  }).join('');
  const documento = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    + corpo
    + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>'
    + '</w:body></w:document>';
  const estilos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>'
    + '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
    + '</Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    + '</Relationships>');
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + '</Relationships>');
  zip.file('word/document.xml', documento);
  zip.file('word/styles.xml', estilos);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { montarAtestado, gerarDocx, validarNota, LIMITE_QUANTITATIVOS };
