// Leitor do .xls antigo (Excel 97-2003, BIFF8) sem dependência nova (versão 2.30). O arquivo de teste é montado AQUI,
// byte a byte (arquivo composto + registros BIFF8), com dados SINTÉTICOS: textos compartilhados (inclusive um que
// atravessa o registro CONTINUE), número, RK, MULRK, fórmula com resultado numérico e de texto, e aba oculta.
// Rodar: node testes/leitorXls.test.js
const assert = require('assert');
const { workbookDoXls, lerAbasXls, paraTestes } = require('../src/utils/leitorXls');
const { lerPlanilhaMateriais } = require('../src/utils/leitorPlanilhaMateriais');

// ── escritor mínimo de BIFF8 + CFB (só para o teste) ──
const reg = (tipo, dados) => { const h = Buffer.alloc(4); h.writeUInt16LE(tipo, 0); h.writeUInt16LE(dados.length, 2); return Buffer.concat([h, dados]); };
const u16 = (v) => { const b = Buffer.alloc(2); b.writeUInt16LE(v); return b; };
const u32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0); return b; };
const dbl = (v) => { const b = Buffer.alloc(8); b.writeDoubleLE(v); return b; };
const texto8 = (t) => Buffer.concat([u16(t.length), Buffer.from([0]), Buffer.from(t, 'latin1')]);
const bof = (dt) => reg(0x0809, Buffer.concat([u16(0x0600), u16(dt), u16(0x0dbb), u16(0x07cc), u32(0), u32(6)]));
const celula = (l, c) => Buffer.concat([u16(l), u16(c), u16(15)]);
const rkInt = (n) => u32((n << 2) | 2);
const rkCent = (v) => u32((Math.round(v * 100) << 2) | 2 | 1); // inteiro ×100 (ex.: 12,34)

function montarXls() {
  // SST: o 4º texto é longo e atravessa o CONTINUE (o pedaço seguinte repete o byte de flags)
  const longo = 'CABO FLEXIVEL 2,5MM 750V AZUL ROLO COM CEM METROS';
  const textos = ['Descrição', 'Unid', 'Preço unitário', longo, 'DISJUNTOR MONOPOLAR 20A CURVA C', 'pç', 'm', 'Qtde', 'Total'];
  const corpo = [];
  for (const t of textos.slice(0, 3)) corpo.push(texto8(t));
  const cabeca = Buffer.concat([u16(longo.length), Buffer.from([0]), Buffer.from(longo.slice(0, 20), 'latin1')]);
  corpo.push(cabeca);
  const sst = reg(0x00fc, Buffer.concat([u32(textos.length), u32(textos.length), ...corpo]));
  const resto = Buffer.concat([Buffer.from([0]), Buffer.from(longo.slice(20), 'latin1'), ...textos.slice(4).map(texto8)]);
  const cont = reg(0x003c, resto);

  const aba = (linhas) => Buffer.concat([bof(0x0010), ...linhas, reg(0x000a, Buffer.alloc(0))]);
  const s1 = aba([
    reg(0x00fd, Buffer.concat([celula(0, 0), u32(0)])), reg(0x00fd, Buffer.concat([celula(0, 1), u32(1)])),
    reg(0x00fd, Buffer.concat([celula(0, 2), u32(7)])), reg(0x00fd, Buffer.concat([celula(0, 3), u32(2)])), reg(0x00fd, Buffer.concat([celula(0, 4), u32(8)])),
    reg(0x00fd, Buffer.concat([celula(1, 0), u32(3)])), reg(0x00fd, Buffer.concat([celula(1, 1), u32(6)])),
    reg(0x027e, Buffer.concat([celula(1, 2), rkInt(300)])), reg(0x0203, Buffer.concat([celula(1, 3), dbl(4.79)])),
    // total = fórmula com resultado numérico guardado
    reg(0x0006, Buffer.concat([celula(1, 4), dbl(1437), u16(0), u32(0), u16(0)])),
    reg(0x00fd, Buffer.concat([celula(2, 0), u32(4)])), reg(0x00fd, Buffer.concat([celula(2, 1), u32(5)])),
    // MULRK: quantidade 12 e preço 18,90 (×100) na mesma linha
    reg(0x00bd, Buffer.concat([u16(2), u16(2), u16(15), rkInt(12), u16(15), rkCent(18.9), u16(3)])),
    // fórmula com resultado de texto (vem no registro STRING)
    reg(0x0006, Buffer.concat([celula(3, 0), Buffer.from([0, 0, 0, 0, 0, 0, 0xff, 0xff]), u16(0), u32(0), u16(0)])),
    reg(0x0207, Buffer.concat([u16(9), Buffer.from([0]), Buffer.from('SUBTOTAL1', 'latin1')])),
  ]);
  const s2 = aba([reg(0x0203, Buffer.concat([celula(0, 0), dbl(1)]))]);
  // globals: BOF, BOUNDSHEETs (posições preenchidas depois), SST + CONTINUE, enchimento (para o stream passar de 4 KB) e EOF
  const boundsheet = (pos, oculta, nome) => reg(0x0085, Buffer.concat([u32(pos), Buffer.from([oculta ? 1 : 0, 0]), Buffer.from([nome.length, 0]), Buffer.from(nome, 'latin1')]));
  const montarGlobais = (p1, p2) => Buffer.concat([bof(0x0005), boundsheet(p1, false, 'Orçamento'), boundsheet(p2, true, 'Rascunho'), sst, cont, reg(0x00e1, Buffer.alloc(5000)), reg(0x000a, Buffer.alloc(0))]);
  const g0 = montarGlobais(0, 0);
  const wbStream = Buffer.concat([montarGlobais(g0.length, g0.length + s1.length), s1, s2]);

  // CFB versão 3 (setor de 512): dados do Workbook, depois o diretório, depois a FAT
  const S = 512;
  const nDados = Math.ceil(wbStream.length / S);
  const dados = Buffer.alloc(nDados * S); wbStream.copy(dados);
  const setorDir = nDados, setorFat = nDados + 1;
  const fat = Buffer.alloc(S, 0xff);
  for (let i = 0; i < nDados; i++) fat.writeUInt32LE(i === nDados - 1 ? 0xfffffffe : i + 1, i * 4);
  fat.writeUInt32LE(0xfffffffe, setorDir * 4);
  fat.writeUInt32LE(0xfffffffd, setorFat * 4);
  const dir = Buffer.alloc(S);
  const entrada = (i, nome, tipo, inicio, tamanho, filho) => {
    const o = i * 128;
    dir.write(nome, o, 'utf16le'); dir.writeUInt16LE((nome.length + 1) * 2, o + 64); dir[o + 66] = tipo; dir[o + 67] = 1;
    dir.writeUInt32LE(0xffffffff, o + 68); dir.writeUInt32LE(0xffffffff, o + 72); dir.writeUInt32LE(filho, o + 76);
    dir.writeUInt32LE(inicio, o + 116); dir.writeUInt32LE(tamanho, o + 120);
  };
  entrada(0, 'Root Entry', 5, 0xfffffffe, 0, 1);
  entrada(1, 'Workbook', 2, 0, wbStream.length, 0xffffffff);
  for (let i = 2; i < 4; i++) { dir.writeUInt32LE(0xffffffff, i * 128 + 68); dir.writeUInt32LE(0xffffffff, i * 128 + 72); dir.writeUInt32LE(0xffffffff, i * 128 + 76); }
  const cab = Buffer.alloc(512, 0);
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).copy(cab);
  cab.writeUInt16LE(0x3e, 24); cab.writeUInt16LE(3, 26); cab.writeUInt16LE(0xfffe, 28); cab.writeUInt16LE(9, 30); cab.writeUInt16LE(6, 32);
  cab.writeUInt32LE(1, 44); cab.writeUInt32LE(setorDir, 48); cab.writeUInt32LE(4096, 56);
  cab.writeUInt32LE(0xfffffffe, 60); cab.writeUInt32LE(0, 64); cab.writeUInt32LE(0xfffffffe, 68); cab.writeUInt32LE(0, 72);
  for (let i = 0; i < 109; i++) cab.writeUInt32LE(i === 0 ? setorFat : 0xffffffff, 76 + i * 4);
  return Buffer.concat([cab, dados, dir, fat]);
}

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

(async () => {
  const xls = montarXls();
  await caso('arquivo composto + BIFF8: abas, textos (inclusive o que atravessa o CONTINUE), números, RK, MULRK e fórmulas', () => {
    const abas = lerAbasXls(xls);
    assert.deepStrictEqual(abas.map(a => [a.nome, a.oculta]), [['Orçamento', false], ['Rascunho', true]]);
    const c = abas[0].celulas;
    assert.strictEqual(c.get('0,0'), 'Descrição');
    assert.strictEqual(c.get('1,0'), 'CABO FLEXIVEL 2,5MM 750V AZUL ROLO COM CEM METROS');
    assert.strictEqual(c.get('2,0'), 'DISJUNTOR MONOPOLAR 20A CURVA C');
    assert.deepStrictEqual([c.get('1,2'), c.get('1,3'), c.get('1,4')], [300, 4.79, 1437]);
    assert.deepStrictEqual([c.get('2,2'), c.get('2,3')], [12, 18.9]);
    assert.strictEqual(c.get('3,0'), 'SUBTOTAL1');
    assert.strictEqual(paraTestes.rk((7 << 2) | 2), 7);
  });

  await caso('vira workbook do exceljs e o leitor de materiais de sempre acha os itens com o preço unitário', () => {
    const wb = workbookDoXls(xls);
    assert.deepStrictEqual(wb.worksheets.map(w => [w.name, w.state]), [['Orçamento', 'visible'], ['Rascunho', 'hidden']]);
    const abas = lerPlanilhaMateriais(wb);
    const itens = abas.flatMap(a => a.itens);
    const cabo = itens.find(i => /CABO FLEXIVEL/.test(i.descricao));
    const disj = itens.find(i => /DISJUNTOR/.test(i.descricao));
    assert.ok(cabo && disj, JSON.stringify(abas));
    assert.deepStrictEqual([cabo.unidade, cabo.quantidade, cabo.preco], ['m', 300, 4.79]);
    assert.deepStrictEqual([disj.unidade, disj.quantidade, disj.preco], ['pç', 12, 18.9]);
  });

  await caso('arquivo que não é .xls, e Excel 5/95, são recusados com mensagem clara', () => {
    assert.throws(() => lerAbasXls(Buffer.from('PK\u0003\u0004 isto é um xlsx')), /não é um arquivo do Excel 97-2003/);
    const velho = Buffer.from(xls);
    // troca a versão do BOF dos globais (0x0600 → 0x0500)
    const pos = velho.indexOf(Buffer.from([0x09, 0x08, 0x10, 0x00, 0x00, 0x06]));
    velho.writeUInt16LE(0x0500, pos + 4);
    assert.throws(() => lerAbasXls(velho), /Excel 5\/95/);
  });

  console.log(`leitorXls: ${ok} casos ok`);
})().catch(e => { console.error('FALHOU:', e); process.exit(1); });
