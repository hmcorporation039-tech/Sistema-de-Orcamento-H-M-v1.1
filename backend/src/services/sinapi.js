// SINAPI local: importa a planilha mensal da Caixa ("SINAPI_Referência_AAAA_MM.xlsx", dentro
// do zip SINAPI-AAAA-MM-formato-xlsx.zip de caixa.gov.br) para as tabelas sinapi_*, só do
// estado pedido (DF por padrão), nos dois regimes (sem e com desoneração). Consulta por
// texto e por código, com queda para o mês anterior quando o item não tem preço no mês.
const path = require('path');
const fsp = require('fs/promises');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const pool = require('../config/database');
const { hojeBrasilia } = require('../utils/dataHoje');

const UF_PADRAO = 'DF';
const REGIMES = { ISD: ['insumos', 'sem'], ICD: ['insumos', 'com'], CSD: ['composicoes', 'sem'], CCD: ['composicoes', 'com'] };
const LINHA_CABECALHO = { insumos: 10, composicoes: 10 };
const LOTE = 1000;
// os insumos da Caixa vêm sem acento e as composições com acento: a busca ignora o acento dos dois lados
const COM_ACENTO = 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç';
const SEM_ACENTO = 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc';

// Valor "simples" de uma célula do exceljs (fórmula, hiperlink e texto rico viram texto/número).
function valor(celula) {
  let v = celula && celula.value !== undefined ? celula.value : celula;
  if (v && typeof v === 'object') {
    if (v.result !== undefined) v = v.result;
    // composições: o código vem como HYPERLINK("#…", 104658) sem o valor em cache; o código é o último argumento
    else if (typeof v.formula === 'string') { const m = /,\s*(\d+)\s*\)\s*$/.exec(v.formula); v = m ? Number(m[1]) : null; }
    else if (v.richText) v = v.richText.map(t => t.text).join('');
    else if (v.text !== undefined) v = v.text;
    else if (v instanceof Date) return v;
    else v = null;
  }
  return v === undefined ? null : v;
}

const texto = (c) => { const v = valor(c); return v == null ? null : String(v).replace(/\s+/g, ' ').trim() || null; };
// "-" = custo zerado (item sem preço): vira NULL, nunca 0, para não passar por preço de graça
function numero(c) {
  const v = valor(c);
  if (typeof v === 'number') return v > 0 ? v : null;
  if (typeof v !== 'string') return null;
  const n = Number(v.trim().replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "09/2026" -> "2026-09"
function mesDaPlanilha(ws) {
  const v = texto(ws.getRow(3).getCell(2));
  const m = /^(\d{2})\/(\d{4})$/.exec(v || '');
  if (!m) throw new Error(`Mês de referência não encontrado na aba ${ws.name} (esperava "MM/AAAA" em B3).`);
  return `${m[2]}-${m[1]}`;
}

// Coluna do estado: a linha do cabeçalho tem a sigla (AC, AL, … DF …).
function colunaDaUf(ws, uf, linha) {
  const r = ws.getRow(linha);
  for (let c = 5; c <= r.cellCount; c++) if (texto(r.getCell(c)) === uf) return c;
  return null;
}

function lerInsumos(ws, uf) {
  const col = colunaDaUf(ws, uf, LINHA_CABECALHO.insumos);
  if (!col) throw new Error(`UF ${uf} não encontrada na aba ${ws.name}.`);
  const itens = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n <= LINHA_CABECALHO.insumos) return;
    const codigo = Number(valor(row.getCell(2)));
    const descricao = texto(row.getCell(3));
    if (!Number.isInteger(codigo) || codigo <= 0 || !descricao) return;
    itens.push({
      codigo, descricao, classificacao: texto(row.getCell(1)), unidade: texto(row.getCell(4)),
      origem: texto(row.getCell(5)), preco: numero(row.getCell(col)),
    });
  });
  return itens;
}

// Composições: cada UF ocupa duas colunas (Custo e %AS); a sigla fica na linha 4 sobre o Custo.
function lerComposicoes(ws, uf) {
  const col = colunaDaUf(ws, uf, 4);
  if (!col) throw new Error(`UF ${uf} não encontrada na aba ${ws.name}.`);
  const itens = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n <= LINHA_CABECALHO.composicoes) return;
    const codigo = Number(valor(row.getCell(2)));
    const descricao = texto(row.getCell(3));
    if (!Number.isInteger(codigo) || codigo <= 0 || !descricao) return;
    const as = valor(row.getCell(col + 1));
    itens.push({
      codigo, descricao, grupo: texto(row.getCell(1)), unidade: texto(row.getCell(4)),
      custo: numero(row.getCell(col)), pct_as: typeof as === 'number' ? as : null,
    });
  });
  return itens;
}

// Lê o workbook (já carregado) e devolve { mes, uf, itens: [{ tipo, regime, itens }] }.
function lerPlanilha(wb, uf = UF_PADRAO) {
  const blocos = [];
  let mes = null;
  for (const [aba, [tipo, regime]] of Object.entries(REGIMES)) {
    const ws = wb.getWorksheet(aba);
    if (!ws) throw new Error(`A planilha não tem a aba ${aba}; confira se é a "SINAPI_Referência".`);
    const m = mesDaPlanilha(ws);
    if (mes && m !== mes) throw new Error(`As abas estão em meses diferentes (${mes} e ${m}).`);
    mes = m;
    blocos.push({ tipo, regime, itens: tipo === 'insumos' ? lerInsumos(ws, uf) : lerComposicoes(ws, uf) });
  }
  return { mes, uf, blocos };
}

async function lerArquivo(caminho, uf = UF_PADRAO) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(caminho);
  return lerPlanilha(wb, uf);
}

async function gravar(client, { mes, uf, blocos }, arquivo) {
  // substitui o mês/UF inteiro: reimportar a retificação da Caixa não deixa item velho para trás
  await client.query('DELETE FROM sinapi_insumos WHERE mes = $1 AND uf = $2', [mes, uf]);
  await client.query('DELETE FROM sinapi_composicoes WHERE mes = $1 AND uf = $2', [mes, uf]);
  let insumos = 0, composicoes = 0;
  for (const { tipo, regime, itens } of blocos) {
    for (let i = 0; i < itens.length; i += LOTE) {
      const l = itens.slice(i, i + LOTE);
      if (tipo === 'insumos') {
        await client.query(
          `INSERT INTO sinapi_insumos (mes, uf, regime, codigo, descricao, unidade, classificacao, origem, preco)
           SELECT $1, $2, $3, * FROM UNNEST($4::int[], $5::text[], $6::text[], $7::text[], $8::text[], $9::numeric[])
           ON CONFLICT DO NOTHING`,
          [mes, uf, regime, l.map(x => x.codigo), l.map(x => x.descricao.slice(0, 400)), l.map(x => x.unidade),
            l.map(x => x.classificacao), l.map(x => x.origem), l.map(x => x.preco)]);
        insumos += l.length;
      } else {
        await client.query(
          `INSERT INTO sinapi_composicoes (mes, uf, regime, codigo, grupo, descricao, unidade, custo, pct_as)
           SELECT $1, $2, $3, * FROM UNNEST($4::int[], $5::text[], $6::text[], $7::text[], $8::numeric[], $9::numeric[])
           ON CONFLICT DO NOTHING`,
          [mes, uf, regime, l.map(x => x.codigo), l.map(x => x.grupo), l.map(x => x.descricao.slice(0, 600)),
            l.map(x => x.unidade), l.map(x => x.custo), l.map(x => x.pct_as)]);
        composicoes += l.length;
      }
    }
  }
  await client.query(
    `INSERT INTO sinapi_importacoes (mes, uf, arquivo, insumos, composicoes) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (mes, uf) DO UPDATE SET arquivo = $3, insumos = $4, composicoes = $5, importado_em = NOW()`,
    [mes, uf, arquivo || null, insumos, composicoes]);
  return { mes, uf, insumos, composicoes };
}

// Importa uma planilha já lida; tudo ou nada (transação).
async function importar(caminho, { uf = UF_PADRAO, db = pool } = {}) {
  return importarLido(await lerArquivo(caminho, uf), String(caminho).split(/[\\/]/).pop(), db);
}

// Planilha que vem em memória (a de dentro do zip da Caixa)
async function importarBuffer(buffer, nome, { uf = UF_PADRAO, db = pool } = {}) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return importarLido(lerPlanilha(wb, uf), nome, db);
}

async function importarLido(lido, arquivo, db = pool) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const r = await gravar(client, lido, arquivo);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* conexão já caiu */ }
    throw e;
  } finally {
    client.release();
  }
}

async function configuracao(db = pool) {
  const r = await db.query("SELECT chave, valor FROM configuracoes WHERE chave IN ('sinapi_uf', 'sinapi_regime')");
  const c = Object.fromEntries(r.rows.map(x => [x.chave, x.valor]));
  return { uf: c.sinapi_uf || UF_PADRAO, regime: c.sinapi_regime === 'com' ? 'com' : 'sem' };
}

// Termos não consecutivos (a Caixa escreve sem acento, então o termo perde o acento): "cabo flexivel 2,5" acha "CABO DE COBRE FLEXIVEL ... 2,5 MM2".
async function buscar(termo, { tipo = 'insumos', limite = 30, db = pool } = {}) {
  const { uf, regime } = await configuracao(db);
  const tabela = tipo === 'composicoes' ? 'sinapi_composicoes' : 'sinapi_insumos';
  const col = tipo === 'composicoes' ? 'custo' : 'preco';
  const termos = String(termo || '').normalize('NFD').replace(/\p{M}/gu, '').trim().split(/\s+/).filter(t => t.length > 1).slice(0, 8);
  if (!termos.length) return [];
  const mes = await db.query(`SELECT MAX(mes) AS mes FROM ${tabela} WHERE uf = $1 AND regime = $2`, [uf, regime]);
  if (!mes.rows[0].mes) return [];
  const filtros = termos.map((_, i) => `translate(descricao, '${COM_ACENTO}', '${SEM_ACENTO}') ILIKE $${i + 4}`).join(' AND ');
  const r = await db.query(
    `SELECT codigo, descricao, unidade, ${col} AS valor, mes FROM ${tabela}
      WHERE uf = $1 AND regime = $2 AND mes = $3 AND ${col} IS NOT NULL AND ${filtros}
      ORDER BY length(descricao) LIMIT ${Number(limite) || 30}`,
    [uf, regime, mes.rows[0].mes, ...termos.map(t => `%${t}%`)]);
  return r.rows.map(x => ({ ...x, valor: Number(x.valor), uf, regime }));
}

// Preço do código no mês mais recente em que ele tem preço; avisa quando não é o último mês importado.
async function precoPorCodigo(codigo, { tipo = 'insumos', db = pool } = {}) {
  const { uf, regime } = await configuracao(db);
  const tabela = tipo === 'composicoes' ? 'sinapi_composicoes' : 'sinapi_insumos';
  const col = tipo === 'composicoes' ? 'custo' : 'preco';
  const r = await db.query(
    `SELECT codigo, descricao, unidade, ${col} AS valor, mes, (SELECT MAX(mes) FROM ${tabela} WHERE uf = $2 AND regime = $3) AS mes_atual
       FROM ${tabela} WHERE uf = $2 AND regime = $3 AND codigo = $1 AND ${col} IS NOT NULL ORDER BY mes DESC LIMIT 1`,
    [codigo, uf, regime]);
  if (!r.rows[0]) return null;
  const x = r.rows[0];
  return { codigo: x.codigo, descricao: x.descricao, unidade: x.unidade, valor: Number(x.valor), mes: x.mes.trim(), uf, regime,
    aviso: x.mes !== x.mes_atual ? `Sem preço em ${x.mes_atual}; usado o de ${x.mes}.` : null };
}

// A Caixa publica a referência do mês anterior por volta do dia 10 (a de 09/2026 saiu em 09/10): até o dia 11 o esperado é
// o de dois meses atrás, depois dele o do mês passado. Devolve "AAAA-MM".
function mesEsperado(hoje = new Date()) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - (hoje.getDate() >= 12 ? 1 : 2), 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Pasta onde o administrador solta o zip (ou o xlsx) baixado da Caixa; a rotina "sinapi-pasta" importa sozinha.
function pastaDeEntrada() {
  return path.join(require('./pastasSistema').BASE, 'SINAPI');
}

const RE_PLANILHA_DO_ZIP = /SINAPI.{0,3}Refer.{1,3}ncia.*\.xlsx$/i;

// Importa o que estiver na pasta de entrada (SINAPI-AAAA-MM-formato-xlsx.zip ou a planilha "SINAPI_Referência" solta), do estado
// configurado, e move cada arquivo para "processados" (ou "com-erro", sem apagar nada). Um arquivo que falha não impede os outros.
async function importarPastaDeEntrada({ pasta = pastaDeEntrada(), db = pool } = {}) {
  const resumo = { arquivosEncontrados: 0, arquivosProcessados: 0, insumos: 0, composicoes: 0, avisos: [], meses: [] };
  await fsp.mkdir(pasta, { recursive: true });
  const nomes = (await fsp.readdir(pasta, { withFileTypes: true }))
    .filter(e => e.isFile() && /\.(zip|xlsx)$/i.test(e.name) && !/^[~.]/.test(e.name) && /sinapi/i.test(e.name))
    .map(e => e.name).sort();
  resumo.arquivosEncontrados = nomes.length;
  const { uf } = await configuracao(db);
  const mover = async (nome, subpasta) => {
    await fsp.mkdir(path.join(pasta, subpasta), { recursive: true });
    const destino = path.join(pasta, subpasta, `${hojeBrasilia()}_${nome}`);
    await fsp.rename(path.join(pasta, nome), destino);
  };
  for (const nome of nomes) {
    try {
      const buffer = await fsp.readFile(path.join(pasta, nome));
      let planilha = buffer; let nomePlanilha = nome;
      if (/\.zip$/i.test(nome)) {
        const zip = await JSZip.loadAsync(buffer);
        const entrada = Object.keys(zip.files).find(n => !zip.files[n].dir && RE_PLANILHA_DO_ZIP.test(n));
        if (!entrada) throw new Error('o zip não tem a planilha "SINAPI_Referência_AAAA_MM.xlsx"');
        planilha = await zip.files[entrada].async('nodebuffer');
        nomePlanilha = entrada.split(/[\\/]/).pop();
      }
      const r = await importarBuffer(planilha, nomePlanilha, { uf, db });
      resumo.arquivosProcessados++;
      resumo.insumos += r.insumos; resumo.composicoes += r.composicoes; resumo.meses.push(r.mes);
      await mover(nome, 'processados');
    } catch (e) {
      resumo.avisos.push(`${nome}: ${e.message}`);
      await mover(nome, 'com-erro').catch(() => {});
    }
  }
  return resumo;
}

async function situacao(db = pool) {
  const cfg = await configuracao(db);
  const r = await db.query('SELECT mes, uf, arquivo, insumos, composicoes, importado_em FROM sinapi_importacoes ORDER BY mes DESC, uf');
  const ultimo = r.rows.find(x => x.uf === cfg.uf)?.mes?.trim() || null;
  const esperado = mesEsperado();
  return { ...cfg, importacoes: r.rows, mes_esperado: esperado, atrasado: !ultimo || ultimo < esperado, pasta_entrada: pastaDeEntrada() };
}

module.exports = {
  lerPlanilha, lerArquivo, importar, importarBuffer, gravar, buscar, precoPorCodigo, configuracao, situacao, mesEsperado, pastaDeEntrada, importarPastaDeEntrada, UF_PADRAO,
};
