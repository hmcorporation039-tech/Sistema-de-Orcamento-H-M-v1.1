// Blocos de montagem dos documentos Word no padrão visual da H&M (preto e
// dourado, mesmo do PDF de proposta do sistema): cabeçalho com o banner na
// primeira página e logo nas demais, rodapé com os dados da empresa (o mesmo
// papel timbrado da proposta, de skills/_comum/empresa.js) e nº do documento e página,
// tabelas com cabeçalho escuro e realce dos trechos [CONFERIR].

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, PageNumber, AlignmentType, WidthType, ShadingType, BorderStyle,
  HeadingLevel, TableLayoutType, VerticalAlign, PageBreak,
} = require('docx');
const { EMPRESA, linhasRodape } = require('./empresa');

const COR = { preto: '1A1A1A', dourado: 'C9A227', cinza: 'F2F2F2', borda: 'D9D9D9', vermelho: 'C00000', texto: '1A1A1A', suave: '595959' };
const LARGURA_UTIL = 9638; // A4 (11 906 twips) menos margens de 2 cm
// Banner e logo da H&M (skills/_comum/assets)
const ASSETS = [path.join(__dirname, 'assets')]
  .find(p => fs.existsSync(path.join(p, 'logo.png'))) || path.join(__dirname, 'assets');

// ── Formatação pt-BR ───────────────────────────────────────────────────────

// Número em pt-BR com até `casas` decimais (sem zeros à direita). Vazio, nulo
// ou valor que não vira número finito ('abc', NaN, Infinity) sai como '—',
// nunca "NaN"/"∞" no documento. Usado também como `num` pelas skills.
function fmtNum(v, casas = 2) {
  if (v == null || v === '' || !Number.isFinite(Number(v))) return '—';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
}
// mesmo guarda do fmtNum: um texto que chegasse aqui quebrava em v.toExponential
function fmtExp(v) {
  const n = Number(v);
  if (v == null || v === '' || !Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  return n.toExponential(2).replace('.', ',').replace(/e([+-])(\d)$/, 'e$10$2');
}
function fmtData(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
}
function somarAnos(iso, anos) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + anos);
  return d.toISOString().slice(0, 10);
}

// ── Texto ──────────────────────────────────────────────────────────────────

// Quebra o texto em trechos, destacando [CONFERIR …] em vermelho e negrito.
function runs(texto, opts = {}) {
  const partes = String(texto ?? '').split(/(\[CONFERIR[^\]]*\])/g).filter(Boolean);
  return partes.map(parte => parte.startsWith('[CONFERIR')
    ? new TextRun({ text: parte, bold: true, color: COR.vermelho, size: opts.size })
    : new TextRun({ text: parte, bold: opts.bold, italics: opts.italics, color: opts.color, size: opts.size }));
}

function p(texto, opts = {}) {
  return new Paragraph({
    children: runs(texto, opts),
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 100, before: opts.before ?? 0 },
    keepNext: opts.keepNext,
  });
}

function titulo(texto, nivel = 1) {
  return new Paragraph({
    heading: nivel === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    children: [new TextRun({ text: texto })],
    keepNext: true,
  });
}

function nota(texto) {
  return p(texto, { italics: true, color: COR.suave, size: 17 });
}

function marcador(texto) {
  return new Paragraph({ children: runs(texto), bullet: { level: 0 }, spacing: { after: 60 } });
}

function quebraPagina() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ── Tabelas ────────────────────────────────────────────────────────────────

function celula(conteudo, { largura, cabecalho = false, fundo, negrito, tamanho = 18, align } = {}) {
  const paragrafos = (Array.isArray(conteudo) ? conteudo : [conteudo]).map(c =>
    (c instanceof Paragraph) ? c : new Paragraph({
      children: runs(c, { bold: cabecalho || negrito, color: cabecalho ? COR.dourado : undefined, size: cabecalho ? 16 : tamanho }),
      alignment: align || AlignmentType.LEFT,
      spacing: { after: 0 },
    }));
  return new TableCell({
    children: paragrafos,
    width: largura ? { size: largura, type: WidthType.DXA } : undefined,
    shading: (cabecalho || fundo) ? { fill: cabecalho ? COR.preto : fundo, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    verticalAlign: VerticalAlign.CENTER,
  });
}

const BORDAS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: COR.borda },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COR.borda },
  left: { style: BorderStyle.SINGLE, size: 4, color: COR.borda },
  right: { style: BorderStyle.SINGLE, size: 4, color: COR.borda },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COR.borda },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: COR.borda },
};

function larguras(proporcoes) {
  const soma = proporcoes.reduce((a, b) => a + b, 0);
  return proporcoes.map(x => Math.floor(LARGURA_UTIL * x / soma));
}

// Tabela com linha de cabeçalho escura (repete em cada página)
function tabela(cabecalhos, linhas, proporcoes, { tamanho = 17, destacarColuna } = {}) {
  const ws = larguras(proporcoes || cabecalhos.map(() => 1));
  const rows = [
    new TableRow({ tableHeader: true, children: cabecalhos.map((c, i) => celula(c, { largura: ws[i], cabecalho: true })) }),
    ...linhas.map(l => new TableRow({
      cantSplit: true,
      children: l.map((c, i) => celula(c ?? '', {
        largura: ws[i], tamanho,
        fundo: destacarColuna && destacarColuna(l, i),
      })),
    })),
  ];
  return new Table({ rows, columnWidths: ws, width: { size: LARGURA_UTIL, type: WidthType.DXA }, layout: TableLayoutType.FIXED, borders: BORDAS });
}

// Tabela de pares rótulo → valor (rótulo em cinza)
function tabelaKV(pares, proporcoes = [1, 2.4]) {
  const ws = larguras(proporcoes);
  const rows = pares.map(([k, v]) => new TableRow({
    cantSplit: true,
    children: [celula(k, { largura: ws[0], fundo: COR.cinza, negrito: true }), celula(v ?? '', { largura: ws[1] })],
  }));
  return new Table({ rows, columnWidths: ws, width: { size: LARGURA_UTIL, type: WidthType.DXA }, layout: TableLayoutType.FIXED, borders: BORDAS });
}

function espaco(after = 120) {
  return new Paragraph({ children: [], spacing: { after } });
}

// ── Imagens ────────────────────────────────────────────────────────────────

function dimensoesImagem(buf) {
  if (buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
    return { tipo: 'png', largura: buf.readUInt32BE(16), altura: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marcador = buf[i + 1];
      const tamanho = buf.readUInt16BE(i + 2);
      if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
        return { tipo: 'jpg', altura: buf.readUInt16BE(i + 5), largura: buf.readUInt16BE(i + 7) };
      }
      i += 2 + tamanho;
    }
  }
  return null;
}

const PX_POR_CM = 37.795;

function imagem(arquivo, larguraCm, { alturaMaxCm = 20 } = {}) {
  if (!arquivo || !fs.existsSync(arquivo)) return null;
  const buf = fs.readFileSync(arquivo);
  const dim = dimensoesImagem(buf);
  if (!dim) return null;
  let w = larguraCm * PX_POR_CM;
  let h = w * dim.altura / dim.largura;
  if (h > alturaMaxCm * PX_POR_CM) { h = alturaMaxCm * PX_POR_CM; w = h * dim.largura / dim.altura; }
  return new ImageRun({ type: dim.tipo, data: buf, transformation: { width: Math.round(w), height: Math.round(h) } });
}

// ── Documento ──────────────────────────────────────────────────────────────

function cabecalhos(tituloCurto) {
  const banner = imagem(path.join(ASSETS, 'cabecalho.png'), 17, { alturaMaxCm: 4.5 });
  const logo = imagem(path.join(ASSETS, 'logo.png'), 1.3);
  const primeira = new Header({ children: [new Paragraph({ children: banner ? [banner] : runs(EMPRESA.razaoSocial), alignment: AlignmentType.CENTER })] });
  const demais = new Header({
    children: [new Paragraph({
      children: [
        ...(logo ? [logo, new TextRun({ text: '   ' })] : []),
        new TextRun({ text: EMPRESA.razaoSocial, bold: true, color: COR.dourado, size: 18 }),
        new TextRun({ text: `   |   ${tituloCurto}`, color: COR.suave, size: 16 }),
      ],
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COR.dourado, space: 4 } },
    })],
  });
  return { first: primeira, default: demais };
}

// Rodapé = papel timbrado da proposta: linha fina e, centralizados, os dados
// da empresa (razão social e CNPJ / endereço / telefone e e-mail); por último a
// identificação do documento e "Página X de Y".
function rodape(identificacao) {
  const cinza = '888888';
  const linha = (children, extra = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 228 }, children, ...extra });
  const conteudo = () => [
    ...linhasRodape({ cnpj: true }).map((t, i) => linha([new TextRun({ text: t, size: 14, color: cinza })],
      i === 0 ? { border: { top: { style: BorderStyle.SINGLE, size: 4, color: COR.borda, space: 4 } } } : {})),
    linha([
      new TextRun({ text: `${identificacao}   —   Página `, size: 14, color: COR.suave }),
      new TextRun({ children: [PageNumber.CURRENT], size: 14, color: COR.suave }),
      new TextRun({ text: ' de ', size: 14, color: COR.suave }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: COR.suave }),
    ], { spacing: { before: 40, after: 0, line: 228 } }),
  ];
  return { first: new Footer({ children: conteudo() }), default: new Footer({ children: conteudo() }) };
}

function capa(tituloDoc, subtitulo) {
  return [
    new Paragraph({ children: [new TextRun({ text: tituloDoc, bold: true, size: 30, color: COR.preto })], alignment: AlignmentType.CENTER, spacing: { before: 120, after: 80 } }),
    ...(subtitulo ? [new Paragraph({ children: runs(subtitulo, { color: COR.suave, size: 19 }), alignment: AlignmentType.CENTER, spacing: { after: 220 } })] : []),
  ];
}

function criarDocumento({ tituloCurto, identificacao, filhos }) {
  return new Document({
    creator: EMPRESA.razaoSocial,
    title: tituloCurto,
    styles: {
      default: { document: { run: { font: 'Calibri', size: 20, color: COR.texto } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { bold: true, size: 24, color: COR.preto },
          paragraph: { spacing: { before: 280, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COR.dourado, space: 2 } } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { bold: true, size: 21, color: '7F6000' },
          paragraph: { spacing: { before: 200, after: 80 } } },
      ],
    },
    sections: [{
      properties: {
        titlePage: true,
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1134, left: 1134, right: 1134, header: 425, footer: 425 } },
      },
      headers: cabecalhos(tituloCurto),
      footers: rodape(identificacao),
      children: filhos,
    }],
  });
}

async function salvar(doc, caminho) {
  fs.mkdirSync(path.dirname(caminho), { recursive: true });
  fs.writeFileSync(caminho, await Packer.toBuffer(doc));
  return caminho;
}

module.exports = {
  COR, fmtNum, fmtExp, fmtData, somarAnos, runs, p, titulo, nota, marcador, quebraPagina,
  celula, tabela, tabelaKV, espaco, imagem, capa, criarDocumento, salvar, AlignmentType, Paragraph, TextRun,
};
