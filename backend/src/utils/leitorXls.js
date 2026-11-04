// Leitor da planilha antiga do Excel (.xls, Excel 97-2003 — formato BIFF8 dentro de um "arquivo composto" OLE/CFB),
// sem dependência nova (versão 2.30). O acervo dos clientes tem orçamentos antigos em .xls que o treino não lia (a
// biblioteca exceljs só lê .xlsx). Aqui sai um workbook do exceljs com os VALORES das células (texto, número e o
// resultado guardado das fórmulas), que o leitor de planilha de materiais (./leitorPlanilhaMateriais.js) já entende.
// Não lê formatação, mesclagem nem gráficos; Excel 5/95 (BIFF5) e arquivo protegido por senha são recusados com erro.
const ExcelJS = require('exceljs');

const ASSINATURA_CFB = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const FIM_DE_CADEIA = 0xfffffffe;
const LIVRE = 0xffffffff;
const MAX_CELULAS = 500000;

// ── arquivo composto (CFB): devolve o conteúdo de um stream pelo nome ──
function lerStream(buf, nomes) {
  if (buf.length < 512 || !buf.subarray(0, 8).equals(ASSINATURA_CFB)) throw new Error('não é um arquivo do Excel 97-2003 (.xls)');
  const tamSetor = 1 << buf.readUInt16LE(30);
  const tamMini = 1 << buf.readUInt16LE(32);
  const nSetoresFat = buf.readUInt32LE(44);
  const primeiroDir = buf.readUInt32LE(48);
  const corteMini = buf.readUInt32LE(56);
  const primeiroMiniFat = buf.readUInt32LE(60);
  let difatSetor = buf.readUInt32LE(68);
  const nDifat = buf.readUInt32LE(72);
  const setor = (n) => { const ini = 512 + n * tamSetor; return buf.subarray(ini, Math.min(ini + tamSetor, buf.length)); };
  // setores da FAT: 109 no cabeçalho e o resto na DIFAT encadeada
  const setoresFat = [];
  for (let i = 0; i < 109 && setoresFat.length < nSetoresFat; i++) { const s = buf.readUInt32LE(76 + i * 4); if (s !== LIVRE) setoresFat.push(s); }
  for (let k = 0; k < nDifat && difatSetor !== FIM_DE_CADEIA && difatSetor !== LIVRE; k++) {
    const d = setor(difatSetor);
    for (let i = 0; i < tamSetor / 4 - 1 && setoresFat.length < nSetoresFat; i++) { const s = d.readUInt32LE(i * 4); if (s !== LIVRE) setoresFat.push(s); }
    difatSetor = d.readUInt32LE(tamSetor - 4);
  }
  const fat = [];
  for (const s of setoresFat) { const d = setor(s); for (let i = 0; i + 4 <= d.length; i += 4) fat.push(d.readUInt32LE(i)); }
  const cadeia = (ini, tabela) => {
    const lista = [];
    const vistos = new Set();
    for (let s = ini; s !== FIM_DE_CADEIA && s !== LIVRE && s < tabela.length && !vistos.has(s); s = tabela[s]) { vistos.add(s); lista.push(s); }
    return lista;
  };
  const lerCadeia = (ini) => Buffer.concat(cadeia(ini, fat).map(setor));
  // diretório
  const dir = lerCadeia(primeiroDir);
  const entradas = [];
  for (let i = 0; i + 128 <= dir.length; i += 128) {
    const tamNome = dir.readUInt16LE(i + 64);
    entradas.push({ nome: dir.toString('utf16le', i, i + Math.max(0, tamNome - 2)), tipo: dir[i + 66], inicio: dir.readUInt32LE(i + 116), tamanho: dir.readUInt32LE(i + 120) });
  }
  const raiz = entradas.find(e => e.tipo === 5);
  const alvo = entradas.find(e => e.tipo === 2 && nomes.includes(e.nome));
  if (!alvo) return null;
  if (alvo.tamanho >= corteMini || !raiz) return lerCadeia(alvo.inicio).subarray(0, alvo.tamanho);
  // stream pequeno: fica no "mini stream" da raiz
  const miniStream = lerCadeia(raiz.inicio);
  const miniFatBuf = lerCadeia(primeiroMiniFat);
  const miniFat = [];
  for (let i = 0; i + 4 <= miniFatBuf.length; i += 4) miniFat.push(miniFatBuf.readUInt32LE(i));
  return Buffer.concat(cadeia(alvo.inicio, miniFat).map(n => miniStream.subarray(n * tamMini, (n + 1) * tamMini))).subarray(0, alvo.tamanho);
}

// ── registros BIFF8 ──
// texto Unicode do BIFF8 (XLUnicodeString): [tamanho (1 ou 2 bytes)] [flags] [rich/ext opcionais] [caracteres]
function lerTexto(b, pos, tamanhoEm2Bytes = true) {
  const n = tamanhoEm2Bytes ? b.readUInt16LE(pos) : b[pos];
  pos += tamanhoEm2Bytes ? 2 : 1;
  const flags = b[pos++];
  const largo = flags & 1;
  let rich = 0, ext = 0;
  if (flags & 8) { rich = b.readUInt16LE(pos); pos += 2; }
  if (flags & 4) { ext = b.readInt32LE(pos); pos += 4; }
  const bytes = n * (largo ? 2 : 1);
  const t = largo ? b.toString('utf16le', pos, pos + bytes) : b.toString('latin1', pos, pos + bytes);
  return { t, fim: pos + bytes + rich * 4 + ext };
}

// RK: número compacto (inteiro ou os 30 bits altos de um double, ×100 opcional)
function rk(v) {
  let n;
  if (v & 2) n = v >> 2;
  else { const b = Buffer.alloc(8); b.writeInt32LE(v & 0xfffffffc, 4); n = b.readDoubleLE(0); }
  return v & 1 ? n / 100 : n;
}

// Tabela de textos compartilhados (SST): os textos podem atravessar registros CONTINUE, e na quebra o byte de flags
// se repete (o pedaço seguinte pode estar em 1 ou 2 bytes por caractere)
function lerSst(partes) {
  const textos = [];
  let p = 0, pos = 8; // pula total e únicos
  const total = partes[0].readUInt32LE(4);
  const garantir = () => { while (p < partes.length && pos >= partes[p].length) { p++; pos = 0; } return p < partes.length; };
  while (textos.length < total && garantir()) {
    let b = partes[p];
    const n = b.readUInt16LE(pos); pos += 2;
    let flags = b[pos++];
    let rich = 0, ext = 0;
    if (flags & 8) { rich = b.readUInt16LE(pos); pos += 2; }
    if (flags & 4) { ext = b.readInt32LE(pos); pos += 4; }
    let faltam = n, t = '';
    while (faltam > 0) {
      if (pos >= b.length) { p++; if (p >= partes.length) break; b = partes[p]; flags = b[0]; pos = 1; }
      const largo = flags & 1;
      const cabem = Math.min(faltam, Math.floor((b.length - pos) / (largo ? 2 : 1)));
      t += largo ? b.toString('utf16le', pos, pos + cabem * 2) : b.toString('latin1', pos, pos + cabem);
      pos += cabem * (largo ? 2 : 1);
      faltam -= cabem;
    }
    // formatação rica e dados estendidos também podem atravessar o CONTINUE
    let pular = rich * 4 + ext;
    while (pular > 0 && garantir()) { const k = Math.min(pular, partes[p].length - pos); pos += k; pular -= k; }
    textos.push(t);
  }
  return textos;
}

function registros(wb) {
  const lista = [];
  for (let pos = 0; pos + 4 <= wb.length;) {
    const tipo = wb.readUInt16LE(pos), tam = wb.readUInt16LE(pos + 2);
    lista.push({ tipo, inicio: pos, dados: wb.subarray(pos + 4, pos + 4 + tam) });
    pos += 4 + tam;
  }
  return lista;
}

// buffer do .xls → [{ nome, oculta, celulas: Map("l,c" → valor) }]
function lerAbasXls(buffer) {
  const wb = lerStream(buffer, ['Workbook', 'Book']);
  if (!wb) throw new Error('o .xls não tem a pasta de trabalho (stream "Workbook")');
  const regs = registros(wb);
  const bof = regs[0];
  if (!bof || bof.tipo !== 0x0809) throw new Error('o .xls não começa com o registro BOF');
  if (bof.dados.readUInt16LE(0) !== 0x0600) throw new Error('planilha do Excel 5/95 (BIFF5): salve como .xlsx para o sistema ler');
  if (regs.some(r => r.tipo === 0x002f)) throw new Error('planilha protegida por senha (FILEPASS)');
  const abas = [];
  let sst = [];
  for (let i = 0; i < regs.length; i++) {
    const r = regs[i];
    if (r.tipo === 0x0085) { // BOUNDSHEET: posição do BOF da aba, visibilidade, tipo (0 = planilha) e nome
      if (r.dados[5] !== 0) continue;
      abas.push({ inicio: r.dados.readUInt32LE(0), oculta: r.dados[4] !== 0, nome: lerTexto(r.dados, 6, false).t, celulas: new Map() });
    } else if (r.tipo === 0x00fc) {
      const partes = [r.dados];
      for (let k = i + 1; k < regs.length && regs[k].tipo === 0x003c; k++) partes.push(regs[k].dados);
      sst = lerSst(partes);
    } else if (r.tipo === 0x000a) break; // fim do globals
  }
  const porInicio = new Map(regs.map((r, i) => [r.inicio, i]));
  let celulas = 0;
  for (const aba of abas) {
    const i0 = porInicio.get(aba.inicio);
    if (i0 == null) continue;
    let formulaPendente = null;
    const guardar = (l, c, v) => { if (v !== '' && v != null && celulas < MAX_CELULAS) { aba.celulas.set(`${l},${c}`, v); celulas++; } };
    for (let i = i0 + 1; i < regs.length; i++) {
      const { tipo, dados: d } = regs[i];
      if (tipo === 0x000a) break;
      if (d.length < 6 && tipo !== 0x0207) continue;
      if (tipo === 0x00fd) guardar(d.readUInt16LE(0), d.readUInt16LE(2), sst[d.readUInt32LE(6)]); // LABELSST
      else if (tipo === 0x0203) guardar(d.readUInt16LE(0), d.readUInt16LE(2), d.readDoubleLE(6)); // NUMBER
      else if (tipo === 0x027e) guardar(d.readUInt16LE(0), d.readUInt16LE(2), rk(d.readInt32LE(6))); // RK
      else if (tipo === 0x00bd) { // MULRK: vários RK seguidos na mesma linha
        const l = d.readUInt16LE(0), c0 = d.readUInt16LE(2);
        for (let k = 0; 4 + k * 6 + 6 <= d.length - 2; k++) guardar(l, c0 + k, rk(d.readInt32LE(4 + k * 6 + 2)));
      } else if (tipo === 0x0204) guardar(d.readUInt16LE(0), d.readUInt16LE(2), lerTexto(d, 6).t); // LABEL
      else if (tipo === 0x0006) { // FORMULA: o resultado guardado
        const l = d.readUInt16LE(0), c = d.readUInt16LE(2);
        if (d.readUInt16LE(12) === 0xffff) {
          if (d[6] === 0) formulaPendente = [l, c]; // texto: vem no registro STRING seguinte
          else if (d[6] === 1) guardar(l, c, d[8] !== 0);
        } else guardar(l, c, d.readDoubleLE(6));
      } else if (tipo === 0x0207 && formulaPendente) { guardar(formulaPendente[0], formulaPendente[1], lerTexto(d, 0).t); formulaPendente = null; }
    }
  }
  return abas;
}

// buffer do .xls → workbook do exceljs (só valores), para os leitores de planilha de sempre
function workbookDoXls(buffer) {
  const wb = new ExcelJS.Workbook();
  const nomes = new Set();
  for (const aba of lerAbasXls(buffer)) {
    let nome = String(aba.nome || 'Planilha').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Planilha';
    for (let k = 2; nomes.has(nome.toLowerCase()); k++) nome = `${nome.slice(0, 27)} (${k})`;
    nomes.add(nome.toLowerCase());
    const ws = wb.addWorksheet(nome, { state: aba.oculta ? 'hidden' : 'visible' });
    for (const [k, v] of aba.celulas) { const [l, c] = k.split(',').map(Number); ws.getCell(l + 1, c + 1).value = v; }
  }
  return wb;
}

module.exports = { workbookDoXls, lerAbasXls, paraTestes: { lerStream, lerSst, rk } };
