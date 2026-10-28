// Arquivos anexados às conversas do assistente.
//
// Gravados em <PASTA_ARQUIVOS_SISTEMA>\Assistente\Conversa <id>\ com nome
// "<id do arquivo> - <nome original limpo>". O modelo NUNCA recebe caminho do
// disco: as ferramentas pedem pelo ID, e o servidor só entrega arquivo da
// conversa do token (routes/v2/assistente.js).
//
// O tipo vale pelo CONTEÚDO (bytes iniciais), não pela extensão: PDF, DWG, DXF,
// imagem (PNG, JPEG, WEBP), planilha (XLSX, CSV) e Word (DOCX). O resto é
// recusado com a lista do que é aceito.
//
// A leitura ("o que é este arquivo") usa os leitores que o sistema já tem — o
// texto e as tabelas do PDF (leitoresTabelaProjeto: carimbo, disciplinas,
// quadro de cargas, lista de materiais), a arquitetura do DWG/DXF (skills/_comum/cad),
// OCR local para imagem — e devolve o RESULTADO, marcado como conteúdo de
// terceiros (dado, nunca instrução).
const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');
const P = require('../../utils/pastasSistema');

const TIPOS_ACEITOS = 'PDF, DWG, DXF, imagens (PNG, JPG, WEBP), planilhas (XLSX, CSV) e Word (DOCX)';
const MIME = {
  pdf: 'application/pdf', dwg: 'image/vnd.dwg', dxf: 'image/vnd.dxf', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const LIMITE_TEXTO = 6000;

function pastaDaConversa(conversaId) {
  return path.join(P.BASE, 'Assistente', `Conversa ${Number(conversaId)}`);
}

const ext = (nome) => (String(nome || '').toLowerCase().match(/\.([a-z0-9]{1,5})$/) || [])[1] || '';
const ehTextoSemBinario = (buf) => !buf.subarray(0, 8192).includes(0);

// Tipo pelo conteúdo. Devolve 'pdf' | 'dwg' | 'dxf' | 'png' | 'jpg' | 'webp' |
// 'xlsx' | 'docx' | 'csv' ou null (recusado). ZIP (xlsx/docx) é aberto para
// conferir que é mesmo planilha/documento do Office.
async function detectarTipo(buffer, nomeOriginal) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;
  const e = ext(nomeOriginal);
  const ini = buffer.subarray(0, 16);
  if (buffer.subarray(0, 1024).includes('%PDF')) return 'pdf';
  if (ini[0] === 0xff && ini[1] === 0xd8 && ini[2] === 0xff) return 'jpg';
  if (ini.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (ini.subarray(0, 4).toString('latin1') === 'RIFF' && ini.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (/^AC10\d\d/.test(ini.subarray(0, 6).toString('latin1'))) return 'dwg';
  if (ini.subarray(0, 18).toString('latin1').startsWith('AutoCAD Binary DXF')) return 'dxf';
  if (ini[0] === 0x50 && ini[1] === 0x4b && ini[2] === 0x03 && ini[3] === 0x04) {
    try {
      const JSZip = require('jszip');
      const zip = await JSZip.loadAsync(buffer);
      if (zip.file('xl/workbook.xml')) return 'xlsx';
      if (zip.file('word/document.xml')) return 'docx';
    } catch { /* ZIP inválido */ }
    return null;
  }
  if (ehTextoSemBinario(buffer)) {
    const cabeca = buffer.subarray(0, 4096).toString('latin1');
    if (/^\s*0\s*\r?\n\s*(SECTION|\$ACADVER)/.test(cabeca) || (e === 'dxf' && /\bSECTION\b/.test(cabeca))) return 'dxf';
    if (e === 'csv' || e === 'txt') return 'csv';
  }
  return null;
}

// Grava o arquivo da conversa e devolve o registro (sem o conteúdo)
async function salvarArquivo(pool, { conversaId, usuarioId, nomeOriginal, buffer, tipo }) {
  const nomeLimpo = P.nomeSeguro(String(nomeOriginal || 'arquivo').slice(0, 200), 'arquivo');
  const sha = crypto.createHash('sha256').update(buffer).digest('hex');
  const { rows: [reg] } = await pool.query(
    `INSERT INTO assistente_arquivos (conversa_id, usuario_id, nome_original, nome_arquivo, tipo, mime, tamanho, sha256)
     VALUES ($1,$2,$3,'',$4,$5,$6,$7) RETURNING *`,
    [conversaId, usuarioId, String(nomeOriginal || 'arquivo').slice(0, 255), tipo, MIME[tipo] || null, buffer.length, sha]
  );
  const nomeArquivo = `${reg.id} - ${nomeLimpo}`;
  try {
    await P.gravarArquivo(pastaDaConversa(conversaId), nomeArquivo, buffer);
  } catch (e) {
    await pool.query('DELETE FROM assistente_arquivos WHERE id = $1', [reg.id]);
    throw e;
  }
  const { rows: [salvo] } = await pool.query('UPDATE assistente_arquivos SET nome_arquivo = $1 WHERE id = $2 RETURNING *', [P.nomeSeguro(nomeArquivo, 'arquivo'), reg.id]);
  return publico(salvo);
}

const publico = (a) => ({ id: a.id, conversa_id: a.conversa_id, nome: a.nome_original, tipo: a.tipo, tamanho: a.tamanho, criado_em: a.criado_em });

async function lerConteudo(registro) {
  return fsp.readFile(path.join(pastaDaConversa(registro.conversa_id), registro.nome_arquivo));
}

const cortar = (t, n = LIMITE_TEXTO) => {
  const s = String(t || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return s.length > n ? `${s.slice(0, n)}\n[… texto cortado: ${s.length - n} caracteres a mais]` : s;
};

// ── Leitura por tipo ─────────────────────────────────────────────────────
async function lerPdf(buffer) {
  const { extrairTexto } = require('../../utils/projetoParser');
  const L = require('../../utils/leitoresTabelaProjeto');
  const texto = await extrairTexto(buffer);
  if (!String(texto).replace(/\s/g, '').length) {
    return { tipo: 'pdf', semTexto: true, observacao: 'PDF sem texto (escaneado ou só desenho vetorial sem rótulos). A análise de projeto (analisar_arquivo) ainda conta símbolos pela legenda do desenho, se houver.' };
  }
  const quadro = L.quadroDeCargas(texto);
  const materiais = L.listaMateriais(texto);
  return {
    tipo: 'pdf',
    caracteres: texto.length,
    carimbo: L.carimbo(texto),
    disciplinasDetectadas: L.detectarDisciplinas(texto),
    quadroDeCargas: quadro?.length ? { circuitos: quadro.length, totais: L.totaisQuadro(texto), primeiros: quadro.slice(0, 8) } : null,
    listaDeMateriais: materiais?.length ? { itens: materiais.length, primeiros: materiais.slice(0, 25) } : null,
    trechoDoTexto: cortar(texto, 3500),
  };
}

async function lerCad(buffer, nome) {
  const { cad } = require('../../utils/disciplinasLaudo');
  const { texto, origem } = await cad().textoDxfDoArquivo(buffer, nome);
  const leitura = cad().lerArquitetura(texto);
  return {
    tipo: origem === 'dwg' ? 'dwg' : 'dxf',
    ambientes: leitura.ambientes.slice(0, 80).map(a => ({ nome: a.nome, area_m2: a.area_m2, perimetro_m: a.perimetro_m })),
    totalAmbientes: leitura.ambientes.length,
    portas: leitura.portas.length,
    layers: leitura.layers.length,
    fatorUnidade: leitura.fatorUnidade,
    observacao: 'Arquitetura lida pela base de CAD do sistema. Para usar num projeto: criar_projeto_disciplina e depois enviar_arquitetura com este arquivo.',
  };
}

async function lerImagem(buffer, tipo) {
  let textoOcr = '';
  if (tipo !== 'webp') {
    try { textoOcr = await require('../../utils/leitorCotacao').ocr([buffer]); } catch (e) { textoOcr = ''; }
  }
  return {
    tipo, bytes: buffer.length,
    textoOcr: cortar(textoOcr, 3000) || null,
    observacao: 'Nesta versão o assistente não vê a imagem: recebe só o texto reconhecido por OCR (quando houver). Peça ao usuário para descrever o que importa.',
  };
}

async function lerXlsx(buffer) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const abas = [];
  wb.eachSheet((ws) => {
    if (abas.length >= 5) return;
    const linhas = [];
    ws.eachRow({ includeEmpty: false }, (row, n) => {
      if (linhas.length >= 60) return;
      const valores = (row.values || []).slice(1).map(v => {
        if (v == null) return '';
        if (typeof v === 'object') return v.result ?? v.text ?? (v.richText ? v.richText.map(r => r.text).join('') : '');
        return v;
      });
      linhas.push(`${n}: ${valores.map(v => String(v).replace(/\s+/g, ' ').slice(0, 80)).join(' | ')}`);
    });
    abas.push({ nome: ws.name, linhas: ws.actualRowCount, conteudo: cortar(linhas.join('\n'), 3500) });
  });
  return { tipo: 'xlsx', abas };
}

async function lerDocx(buffer) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml').async('string');
  const texto = xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  return { tipo: 'docx', caracteres: texto.length, texto: cortar(texto) };
}

function lerCsv(buffer) {
  const texto = buffer.toString('utf8');
  const linhas = texto.split(/\r?\n/);
  return { tipo: 'csv', linhas: linhas.length, conteudo: cortar(linhas.slice(0, 80).join('\n'), 4000) };
}

// Resumo do arquivo (calculado uma vez e guardado em assistente_arquivos.resumo)
async function resumirArquivo(pool, registro) {
  if (registro.resumo) return registro.resumo;
  const buffer = await lerConteudo(registro);
  let resumo;
  try {
    if (registro.tipo === 'pdf') resumo = await lerPdf(buffer);
    else if (registro.tipo === 'dwg' || registro.tipo === 'dxf') resumo = await lerCad(buffer, registro.nome_original);
    else if (['png', 'jpg', 'webp'].includes(registro.tipo)) resumo = await lerImagem(buffer, registro.tipo);
    else if (registro.tipo === 'xlsx') resumo = await lerXlsx(buffer);
    else if (registro.tipo === 'docx') resumo = await lerDocx(buffer);
    else if (registro.tipo === 'csv') resumo = lerCsv(buffer);
    else resumo = { tipo: registro.tipo, observacao: 'Tipo sem leitor.' };
  } catch (e) {
    // erro de leitura não é guardado: pode ser passageiro (arquivo aberto, conversão de DWG)
    return { tipo: registro.tipo, erro: `Não consegui ler o arquivo: ${String(e.message || e).slice(0, 300)}` };
  }
  await pool.query('UPDATE assistente_arquivos SET resumo = $1 WHERE id = $2', [resumo, registro.id]);
  return resumo;
}

module.exports = { detectarTipo, salvarArquivo, lerConteudo, resumirArquivo, pastaDaConversa, publico, TIPOS_ACEITOS, MIME };
