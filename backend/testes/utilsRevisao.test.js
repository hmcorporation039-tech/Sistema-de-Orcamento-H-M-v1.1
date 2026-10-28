// Correções da revisão de 27/10/2026 nos utilitários do backend e no MCP:
// preço de mercado em formato brasileiro, leitor universal de cotação com linha
// patológica, PDF fechado em pontosPorAmbiente, nome de arquivo/pasta com
// emoji, data de Brasília, teto de duração do cronograma, escape do relatório
// de compatibilização e regras de segurança do servidor MCP. Sem banco e sem IA.
// Rodar: node testes/utilsRevisao.test.js (pasta backend).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('pesquisa de mercado: "1.299" e "R$ 2.450" são milhar (antes 1,30 e 2,45)', () => {
  const { normalizarOfertas } = require('../src/utils/pesquisaMercadoService');
  const precos = (lista) => normalizarOfertas({ ofertas: lista.map((preco, i) => ({ fonte: `F${i}`, preco })) }).map(o => o.preco);
  assert.deepStrictEqual(precos(['1.299', 'R$ 2.450', '1.299,90', '12.50', '1,299.90', '1,299']), [1299, 2450, 1299.9, 12.5, 1299.9, 1299]);
  assert.deepStrictEqual(precos(['0.299', '12,5', 7.5, 'R$ 1.234.567,89', 'abc']), [0.3, 12.5, 7.5, 1234567.89]);
});

caso('leitor universal de cotação: linha enorme ou com centenas de números não trava', () => {
  const { extrairUniversal, MAX_NUMEROS_LINHA } = require('../src/utils/leitorCotacaoUniversal');
  let t = Date.now();
  extrairUniversal(Array.from({ length: 3000 }, (_, i) => `${i + 1},50`).join(' ')); // antes: cúbico (minutos)
  extrairUniversal(`${'a'.repeat(200000)}1:`); // antes: ehRotulo quadrático (~5 s com 60 mil)
  assert.ok(Date.now() - t < 2000, `${Date.now() - t} ms`);
  // linha normal continua lida, mesmo com muitos números antes do trio
  const ruido = Array.from({ length: MAX_NUMEROS_LINHA + 20 }, (_, i) => String(i + 1)).join(' ');
  t = Date.now();
  const r = extrairUniversal(`CABO UTP CAT6 AZUL ${ruido} 3 12,50 37,50`);
  const itens = r.itens || r;
  assert.ok(Array.isArray(itens) && itens.some(i => Math.abs(i.valor_unitario ?? i.preco ?? i.vu ?? 0) === 12.5), JSON.stringify(r).slice(0, 300));
});

caso('pontosPorAmbiente: documento sempre destruído e no máximo N páginas lidas', async () => {
  const { calcularPontosPorAmbiente } = require('../src/utils/pontosPorAmbiente');
  let destruido = 0, paginasLidas = 0, limpas = 0;
  const pagina = (n) => ({
    async getTextContent() {
      paginasLidas++;
      if (n === 2) throw new Error('página quebrada');
      return { items: [{ str: 'SALA', transform: [1, 0, 0, 1, 10, 10] }, { str: 'A= 12,5 m²', transform: [1, 0, 0, 1, 10, 5] }, { str: 'R1', transform: [1, 0, 0, 1, 12, 8] }] };
    },
    cleanup() { limpas++; },
  });
  const pdfjsFalso = { getDocument: () => ({ promise: Promise.resolve({ numPages: 500, getPage: async (n) => pagina(n), destroy: async () => { destruido++; } }) }) };
  const r = await calcularPontosPorAmbiente(Buffer.from('x'), { maxPaginas: 5, carregarPdfjs: async () => pdfjsFalso });
  assert.strictEqual(destruido, 1);
  assert.strictEqual(paginasLidas, 5);
  assert.strictEqual(limpas, 5);
  assert.deepStrictEqual(r, [{ ambiente: 'SALA', cftv: 0, rede: 4, antena: 0 }]); // 1 ponto por página lida (a 2ª falha e é pulada)
  // erro no meio da contagem também destrói o documento
  destruido = 0;
  const quebra = { getDocument: () => ({ promise: Promise.resolve({ get numPages() { throw new Error('boom'); }, destroy: async () => { destruido++; } }) }) };
  await assert.rejects(calcularPontosPorAmbiente(Buffer.from('x'), { carregarPdfjs: async () => quebra }), /boom/);
  assert.strictEqual(destruido, 1);
});

caso('nome com emoji cortado no limite não quebra o download nem a pasta', () => {
  const { contentDisposition, limparNome, cortarTexto } = require('../src/utils/nomeArquivoDownload');
  const { nomeSeguro } = require('../src/utils/pastasSistema');
  for (let n = 160; n < 175; n++) {
    const nome = `Proposta ${'x'.repeat(n)}${'😀'.repeat(9)}.pdf`;
    const cd = contentDisposition(nome); // antes: URIError (500) quando o corte partia o emoji
    assert.ok(cd.startsWith('attachment; filename="'));
    assert.ok(!/\ufffd/.test(limparNome(nome)) && limparNome(nome).endsWith('.pdf'));
  }
  assert.match(contentDisposition('a\ud800b.pdf'), /a%EF%BF%BDb\.pdf/); // meio caractere já vindo no nome
  assert.strictEqual(cortarTexto('ab😀', 3), 'ab');
  assert.strictEqual(cortarTexto('ab😀', 4), 'ab😀');
  for (let n = 80; n < 92; n++) {
    const s = nomeSeguro(`${'y'.repeat(n)}😀😀😀`);
    assert.ok(!/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(s), `meio emoji com ${n}`);
    assert.ok(s.length <= 90);
  }
  // nomes comuns ficam iguais aos de antes (pasta existente não é renomeada)
  assert.strictEqual(nomeSeguro('Condomínio Solar: Bloco A?'), 'Condomínio Solar Bloco A');
  assert.strictEqual(nomeSeguro('x'.repeat(120)), 'x'.repeat(90));
  assert.ok(!/[. ]$/.test(nomeSeguro(`${'x'.repeat(89)}. abc`)), 'nome terminando em ponto (o Windows descarta)');
});

caso('"hoje" é a data de Brasília em todos os utilitários e no MCP (não o UTC)', () => {
  const pastas = [path.join(__dirname, '..', 'src', 'utils'), path.join(__dirname, '..', 'src', 'mcp')];
  const achados = [];
  for (const p of pastas) {
    for (const f of fs.readdirSync(p)) {
      if (!/\.(m?js)$/.test(f) || f === 'dataHoje.js') continue;
      const txt = fs.readFileSync(path.join(p, f), 'utf8');
      if (/new Date\(\)\.toISOString\(\)\.slice\(0, ?10\)/.test(txt)) achados.push(f);
    }
  }
  assert.deepStrictEqual(achados, []);
  const ponte = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'ponteAnaliseSkill.js'), 'utf8');
  assert.match(ponte, /hojeBrasilia/);
});

caso('cronograma: custo do homem-hora absurdo não gera milhões de dias (teto com aviso)', () => {
  const D = require('../src/utils/duracaoCronograma');
  const C = require('../src/utils/cronograma');
  assert.strictEqual(D.duracaoDiasUteis(5000000, 0.01, 1), D.MAX_DIAS_ETAPA);
  assert.strictEqual(D.duracaoDiasUteis(1040, 65, 2), 1); // normal continua igual
  const t = Date.now();
  const g = C.gerarCronograma({ proposta: { bdi: 0 }, secoes: [{ id: 1, nome: 'Mão de obra' }], itens: [{ secao_id: 1, sid: 1, quantidade: 1, valor_unitario: 5000000, descricao: 'x' }], dataInicio: '2026-11-02', custoHH: 0.01, equipe: 1 });
  assert.ok(Date.now() - t < 2000);
  assert.strictEqual(g.etapas[1].dias_uteis, D.MAX_DIAS_ETAPA);
  assert.ok(g.etapas[g.etapas.length - 1].fim < '2040-01-01', g.etapas[g.etapas.length - 1].fim);
  assert.strictEqual(g.avisos.length, 1);
  assert.match(g.avisos[0], /limite de 2\.000/);
  // sem exagero: sem aviso
  const g2 = C.gerarCronograma({ proposta: { bdi: 0 }, secoes: [{ id: 1, nome: 'Mão de obra' }], itens: [{ secao_id: 1, sid: 1, quantidade: 1, valor_unitario: 5000, descricao: 'x' }], dataInicio: '2026-11-02' });
  assert.deepStrictEqual(g2.avisos, []);
  // dias digitados também respeitam o teto
  assert.strictEqual(D.sequenciarDiasUteis([{ dias: 1e9 }], '2026-11-02')[0].dias, D.MAX_DIAS_ETAPA);
});

caso('relatório de compatibilização escapa os números e códigos vindos do JSON salvo', () => {
  const { gerarHtmlRelatorioCompatibilizacao } = require('../src/utils/relatorioCompatibilizacaoTemplate');
  const x = '<img src=x onerror=alert(1)>';
  const html = gerarHtmlRelatorioCompatibilizacao({
    cliente: 'C', disciplinas: ['cftv', 'rede'],
    arquivosAnalisados: [{ arquivo: 'a.pdf', disciplinas: [x] }],
    pontosPorAmbiente: [{ ambiente: 'Sala', rede: x, cftv: 1, total: x }],
    cameras: { total: 1, detalhePorArquivo: [{ arquivo: 'a.pdf', ocorrencias: x, total: x, unicas: [x], repetidas: [x], faltando: [x] }] },
    pontosRedeAntena: { rede: { total: 0, detalhePorArquivo: [] }, antena: { total: 0 } },
  });
  assert.ok(!html.includes('<img'), 'HTML injetado no relatório');
  assert.ok(html.includes('&lt;img'));
});

caso('MCP: analisar_projeto só lê PDF das pastas permitidas (caminho real)', () => {
  const { pastasPermitidasPdf, conferirPdfPermitido } = require('../src/utils/mcpRegras');
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-mcp-'));
  try {
    const permitida = path.join(raiz, 'permitida'), fora = path.join(raiz, 'fora');
    fs.mkdirSync(permitida); fs.mkdirSync(fora);
    fs.writeFileSync(path.join(permitida, 'projeto.pdf'), '%PDF-1.4');
    fs.writeFileSync(path.join(fora, 'segredo.pdf'), '%PDF-1.4');
    fs.writeFileSync(path.join(permitida, 'nota.txt'), 'x');
    const pastas = pastasPermitidasPdf({ MCP_PASTAS_PDF: ` ${permitida} ; ` });
    assert.deepStrictEqual(pastas, [path.resolve(permitida)]);
    const okPdf = conferirPdfPermitido(path.join(permitida, 'projeto.pdf'), pastas);
    assert.ok(okPdf.caminho && !okPdf.erro, JSON.stringify(okPdf));
    // maiúsculas diferentes no Windows continuam dentro
    if (process.platform === 'win32') assert.ok(conferirPdfPermitido(path.join(permitida.toUpperCase(), 'PROJETO.PDF'), pastas).caminho);
    assert.match(conferirPdfPermitido(path.join(fora, 'segredo.pdf'), pastas).erro, /só lê PDFs destas pastas/);
    assert.match(conferirPdfPermitido(path.join(permitida, '..', 'fora', 'segredo.pdf'), pastas).erro, /só lê PDFs destas pastas/); // ".." não escapa
    assert.match(conferirPdfPermitido(path.join(permitida, 'nota.txt'), pastas).erro, /\.pdf/);
    assert.match(conferirPdfPermitido('projeto.pdf', pastas).erro, /caminho COMPLETO/);
    assert.match(conferirPdfPermitido(path.join(permitida, 'nao-existe.pdf'), pastas).erro, /não encontrado/);
    assert.match(conferirPdfPermitido(`${permitida}-irma\\x.pdf`, pastas).erro, /não encontrado|só lê/); // pasta "vizinha" de nome parecido
    // padrão sem MCP_PASTAS_PDF: pastas de projetos recebidos, arquivos do sistema e Downloads
    const padrao = pastasPermitidasPdf({}, 'C:\\HM-Engenharia\\hm-eng');
    assert.ok(padrao.some(p => /projetos-recebidos$/.test(p)) && padrao.some(p => /Downloads$/.test(p)));
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

caso('MCP: pesquisa gravada de fora fica "não verificada" e fora do cache automático', async () => {
  const pool = require('../src/config/database');
  const chamadas = [];
  const original = pool.query;
  pool.query = async (sql, params) => { chamadas.push({ sql, params }); return { rows: [] }; };
  try {
    const svc = require('../src/utils/pesquisaMercadoService');
    const r = await svc.salvarPesquisaManual('Câmera dome', 'Loja X: R$ 100', 'gemini'); // tentativa de se passar por pesquisa automática
    assert.strictEqual(r.fonte, 'claude_desktop');
    assert.strictEqual(r.verificada, false);
    const ins = chamadas.find(c => /INSERT INTO pesquisas_mercado/.test(c.sql));
    assert.ok(ins.params[2].startsWith(svc.MARCA_NAO_VERIFICADA));
    assert.strictEqual(ins.params[3], 'claude_desktop');
    await assert.rejects(svc.salvarPesquisaManual('X', 'y'.repeat(20001)), /longo demais/);
    // o cache só aceita fonte de pesquisa automática
    assert.deepStrictEqual([...svc.FONTES_AUTOMATICAS].sort(), ['claude', 'claude_max', 'gemini']);
    const fonte = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'pesquisaMercadoService.js'), 'utf8');
    assert.match(fonte, /fonte = ANY\(\$2::text\[\]\)/);
  } finally {
    pool.query = original;
  }
});

caso('MCP: descrições e README atualizados (ordem da IA, histórico, não-admin)', () => {
  const mcp = fs.readFileSync(path.join(__dirname, '..', 'src', 'mcp', 'mcpServer.mjs'), 'utf8');
  assert.ok(!/Gemini com fallback pago no Claude/.test(mcp));
  assert.match(mcp, /Claude Max \(assinatura, sem custo por chamada\) → Claude pela API → Gemini/);
  assert.ok(!/o sistema ainda não guarda isso/.test(mcp));
  assert.match(mcp, /conferirPdfPermitido/);
  const readme = fs.readFileSync(path.join(__dirname, '..', 'src', 'mcp', 'README.md'), 'utf8');
  assert.ok(!/papel \*\*admin\*\*/.test(readme));
  assert.match(readme, /Não use administrador/);
  assert.match(readme, /MCP_PASTAS_PDF/);
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`utilitários (revisão 27/10): ${ok}/${casos.length} casos ok`);
  await require('../src/config/database').end().catch(() => {});
})();
