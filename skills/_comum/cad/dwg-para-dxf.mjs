// Processo filho de ./dwg.js: lê um DWG pela entrada padrão e escreve um DXF
// (texto) na saída padrão. Roda separado porque o LibreDWG (WASM, GPL-3.0) pode
// abortar o processo em arquivos corrompidos ou de versões mal suportadas —
// assim o backend não cai junto. Uso interno: node dwg-para-dxf.mjs < a.dwg > a.dxf
//
// O DXF é montado a partir do banco lido pelo LibreDWG (convertEx) por
// ./dxfDoDwg.js (o que vai e o que fica de fora está lá): a escrita DXF do
// próprio LibreDWG (dwg_write_dxf) descarta blocos com POLYLINE2D — portas
// "Door (2D)" e blocos dinâmicos sumiam.
import path from 'node:path';
import { createRequire } from 'node:module';
import { LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web';

const require = createRequire(import.meta.url);
const { montarDxf } = require('./dxfDoDwg.js');
const wasmDir = path.join(path.dirname(path.dirname(require.resolve('@mlightcad/libredwg-web'))), 'wasm') + path.sep;

const partes = [];
for await (const c of process.stdin) partes.push(c);
const buf = Buffer.concat(partes);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const lib = await LibreDwg.create(wasmDir);
const ptr = lib.dwg_read_data(ab, Dwg_File_Type.DWG);
if (!ptr) { process.stderr.write('DWG não pôde ser lido (arquivo corrompido ou versão não suportada).\n'); process.exit(3); }
const { database: db } = lib.convertEx(ptr);

// Bloco dinâmico com parâmetro alterado (tomada com visibilidade "alta", luminária esticada): o
// AutoCAD grava a inserção como bloco anônimo "*U…". O nome verdadeiro está no objeto
// BLOCKREPRESENTATION ("AcDbRepData"), no dicionário de extensão da inserção:
// INSERT → dicionário → "AcDbBlockRepresentation" → "AcDbRepData" → bloco dinâmico.
// O convertEx não entrega esse objeto: lido direto do LibreDWG, antes de liberar o arquivo.
// Falhou: segue sem os nomes (o "*U" continua aberto como contêiner, como antes).
const DWG_TYPE_BLOCKREPRESENTATION = 601;
function nomesDinamicos() {
  const nomes = new Map();
  try {
    const w = lib.wasmInstance;
    const registros = db.tables?.BLOCK_RECORD?.entries || [];
    const blocoPorHandle = new Map(registros.map(b => [b.handle, b.name]));
    const alvoDaRep = new Map(); // handle do AcDbRepData → handle do bloco dinâmico
    for (let i = 0, n = w.dwg_get_num_objects(ptr); i < n; i++) {
      const obj = w.dwg_get_object(ptr, i);
      if (!obj || w.dwg_object_get_fixedtype(obj) !== DWG_TYPE_BLOCKREPRESENTATION) continue;
      const ref = lib.dwg_dynapi_entity_data(w.dwg_object_to_object_tio(obj), 'block');
      const alvo = ref ? lib.dwg_ref_get_id(ref) : null;
      const h = lib.dwg_obj_get_handle_value(obj);
      if (alvo && h != null) alvoDaRep.set(h.toString(16).toUpperCase(), alvo);
    }
    if (!alvoDaRep.size) return nomes;
    const dicionarios = new Map((db.objects?.DICTIONARY || []).map(d => [d.handle, d]));
    const verdadeiroDe = (dono) => {
      const rep = dicionarios.get(dicionarios.get(dono)?.entries?.AcDbBlockRepresentation)?.entries?.AcDbRepData;
      const v = blocoPorHandle.get(alvoDaRep.get(rep));
      return v && !v.startsWith('*') ? v : null;
    };
    const visitar = (ents) => {
      for (const e of ents || []) {
        if (e.type !== 'INSERT' || !/^\*U/i.test(e.name || '') || nomes.has(e.name)) continue;
        const v = verdadeiroDe(e.ownerDictionaryHardId);
        if (v) nomes.set(e.name, v);
      }
    };
    visitar(db.entities);
    for (const b of registros) visitar(b.entities);
  } catch (e) {
    process.stderr.write(`aviso: nomes dos blocos dinâmicos não lidos (${e.message})\n`);
  }
  return nomes;
}
const dinamicos = nomesDinamicos();
lib.dwg_free(ptr);

if (!db?.entities?.length && !(db?.tables?.BLOCK_RECORD?.entries || []).some(b => b.entities?.length)) {
  process.stderr.write('DWG sem entidades legíveis (arquivo corrompido ou versão não suportada).\n');
  process.exit(4);
}
process.stdout.write(montarDxf(db, { nomesDinamicos: dinamicos }));
