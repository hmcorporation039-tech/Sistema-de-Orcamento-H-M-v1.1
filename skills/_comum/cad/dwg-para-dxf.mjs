// Processo filho de ./dwg.js: lê um DWG pela entrada padrão e escreve um DXF
// (texto) na saída padrão. Roda separado porque o LibreDWG (WASM, GPL-3.0) pode
// abortar o processo em arquivos corrompidos ou de versões mal suportadas —
// assim o backend não cai junto. Uso interno: node dwg-para-dxf.mjs < a.dwg > a.dxf
//
// O DXF é montado aqui a partir do banco lido pelo LibreDWG (convertEx), só com
// a geometria que a leitura de arquitetura usa (linhas, polilinhas, arcos,
// círculos, textos, blocos e atributos): a escrita DXF do próprio LibreDWG
// (dwg_write_dxf) descarta blocos com POLYLINE2D — portas "Door (2D)" e blocos
// dinâmicos sumiam. Hachuras, cotas, sólidos 3D e imagens ficam de fora.
import path from 'node:path';
import { createRequire } from 'node:module';
import { LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web';

const require = createRequire(import.meta.url);
const wasmDir = path.join(path.dirname(path.dirname(require.resolve('@mlightcad/libredwg-web'))), 'wasm') + path.sep;

const partes = [];
for await (const c of process.stdin) partes.push(c);
const buf = Buffer.concat(partes);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const lib = await LibreDwg.create(wasmDir);
const ptr = lib.dwg_read_data(ab, Dwg_File_Type.DWG);
if (!ptr) { process.stderr.write('DWG não pôde ser lido (arquivo corrompido ou versão não suportada).\n'); process.exit(3); }
const { database: db } = lib.convertEx(ptr);
lib.dwg_free(ptr);

const out = [];
const g = (codigo, valor) => out.push(String(codigo), String(valor));
const num = (v) => (Number.isFinite(v) ? Number(v.toFixed(6)) : 0);
const graus = (r) => num((r * 180) / Math.PI);
// texto numa linha só (o DXF não aceita quebra; o MTEXT usa \P)
const txt = (s) => String(s ?? '').replace(/\r?\n/g, '\\P').replace(/[\u0000-\u0008\u000B-\u001F]/g, '');
const extrusao = (e) => { if ((e.extrusionDirection?.z ?? 1) < 0) { g(210, 0); g(220, 0); g(230, -1); } };
const comum = (tipo, e) => { g(0, tipo); g(8, txt(e.layer || '0')); };

function entidade(e) {
  switch (e.type) {
    case 'LINE':
      comum('LINE', e);
      g(10, num(e.startPoint.x)); g(20, num(e.startPoint.y)); g(11, num(e.endPoint.x)); g(21, num(e.endPoint.y));
      break;
    case 'LWPOLYLINE':
    case 'POLYLINE2D': {
      const v = e.vertices || [];
      if (v.length < 2) break;
      const fechada = e.type === 'LWPOLYLINE' ? (e.flag & 512) : (e.flag & 1);
      comum('LWPOLYLINE', e);
      g(90, v.length); g(70, fechada ? 1 : 0);
      for (const p of v) { g(10, num(p.x)); g(20, num(p.y)); if (p.bulge) g(42, num(p.bulge)); }
      extrusao(e);
      break;
    }
    case 'ARC':
      comum('ARC', e);
      g(10, num(e.center.x)); g(20, num(e.center.y)); g(40, num(e.radius)); g(50, graus(e.startAngle)); g(51, graus(e.endAngle));
      extrusao(e);
      break;
    case 'CIRCLE':
      comum('CIRCLE', e);
      g(10, num(e.center.x)); g(20, num(e.center.y)); g(40, num(e.radius));
      extrusao(e);
      break;
    case 'TEXT': {
      // alinhado (centro/direita): a posição real é o ponto de alinhamento
      const p = (e.halign || e.valign) && e.endPoint && (e.endPoint.x || e.endPoint.y) ? e.endPoint : e.startPoint;
      comum('TEXT', e);
      g(10, num(p.x)); g(20, num(p.y)); g(40, num(e.textHeight) || 1); g(1, txt(e.text)); if (e.rotation) g(50, graus(e.rotation));
      break;
    }
    case 'MTEXT':
      comum('MTEXT', e);
      g(10, num(e.insertionPoint.x)); g(20, num(e.insertionPoint.y)); g(40, num(e.textHeight) || 1); g(1, txt(e.text));
      break;
    case 'ATTRIB': {
      // atributo vira texto na mesma posição (nome do ambiente em etiqueta de bloco)
      const t = e.text || {};
      if (!t.startPoint || !String(t.text ?? '').trim()) break;
      comum('TEXT', e);
      g(10, num(t.startPoint.x)); g(20, num(t.startPoint.y)); g(40, num(t.textHeight) || 1); g(1, txt(t.text));
      break;
    }
    case 'INSERT':
      if (!blocosValidos.has(e.name)) break;
      comum('INSERT', e);
      g(2, txt(e.name)); g(10, num(e.insertionPoint.x)); g(20, num(e.insertionPoint.y));
      g(41, num(e.xScale ?? 1) || 1); g(42, num(e.yScale ?? 1) || 1); g(43, num(e.zScale ?? 1) || 1);
      if (e.rotation) g(50, graus(e.rotation));
      if (e.columnCount > 1 || e.rowCount > 1) { g(70, e.columnCount || 1); g(71, e.rowCount || 1); g(44, num(e.columnSpacing)); g(45, num(e.rowSpacing)); }
      extrusao(e);
      for (const a of e.attribs || []) entidade(a);
      break;
    default:
      break; // hachura, cota, 3D, imagem, ponto: não usados na leitura
  }
}

if (!db?.entities?.length && !(db?.tables?.BLOCK_RECORD?.entries || []).some(b => b.entities?.length)) {
  process.stderr.write('DWG sem entidades legíveis (arquivo corrompido ou versão não suportada).\n');
  process.exit(4);
}
const registros = db.tables?.BLOCK_RECORD?.entries || [];
const modelo = registros.find(b => /^\*Model_Space$/i.test(b.name));
// blocos de cota (*D) e espaços de papel ficam de fora; dinâmicos (*U) entram
const blocos = registros.filter(b => b !== modelo && !/^\*(Paper_Space|D\d)/i.test(b.name));
const blocosValidos = new Set(blocos.map(b => b.name));

g(0, 'SECTION'); g(2, 'HEADER');
g(9, '$ACADVER'); g(1, 'AC1015');
g(9, '$INSUNITS'); g(70, db.header?.INSUNITS ?? 0);
g(0, 'ENDSEC');
g(0, 'SECTION'); g(2, 'BLOCKS');
for (const b of blocos) {
  g(0, 'BLOCK'); g(8, '0'); g(2, txt(b.name)); g(70, 0); g(10, num(b.basePoint?.x)); g(20, num(b.basePoint?.y)); g(3, txt(b.name));
  for (const e of b.entities || []) entidade(e);
  g(0, 'ENDBLK'); g(8, '0');
}
g(0, 'ENDSEC');
g(0, 'SECTION'); g(2, 'ENTITIES');
// só o espaço do modelo (o espaço de papel tem carimbo e viewports)
const doModelo = modelo?.entities?.length ? modelo.entities : db.entities.filter(e => !modelo || e.ownerBlockRecordSoftId === modelo.handle);
for (const e of doModelo) entidade(e);
g(0, 'ENDSEC');
g(0, 'EOF');
process.stdout.write(out.join('\n') + '\n');
