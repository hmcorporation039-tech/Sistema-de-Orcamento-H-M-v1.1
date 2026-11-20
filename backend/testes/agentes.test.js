// Agentes próprios (09/11/2026) — testes SEM banco e SEM IA, com dados SINTÉTICOS:
//   - registro em dados (entradas, passos, validação) e o MCP do assistente com as ferramentas novas;
//   - roteador de intenção: cada frase de exemplo do vocabulário cai na intenção certa (inclusive os dois pedidos
//     reais de quadro e de pesquisa de preço), pergunta aberta/negação/"use a IA" vão para a IA, falta de arquivo
//     vira resposta sem IA, encadeamento quadro → pesquisa de preços, regra aprendida só quando aprovada;
//   - planilha QF-CAG: colunas, origem do preço, preço em branco (nunca R$ 0,00), SOMASES, contingência 10 %;
//   - templates das respostas de quadro e de preços;
//   - passos dos agentes com ferramentas falsas (análise com objetivo, orçamento que não sobrescreve, preços);
//   - adaptador do quadro: aguardando módulo com a pasta real e funcionando com um módulo sintético.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ExcelJS = require('exceljs');

const REG = require('../src/services/agentes/registro');
const R = require('../src/services/agentes/roteador');
const V = require('../src/services/agentes/vocabulario');
const P = require('../src/services/agentes/planilhaPrecos');
const T = require('../src/services/agentes/respostas');
const PS = require('../src/services/agentes/passos');
const AQ = require('../src/services/agentes/adaptadorQuadros');
const F = require('../src/services/assistente/ferramentas');
const { textoDoResultado } = require('../src/services/agentes/textoDoResultado');
const { rotasPermitidas } = require('../src/middleware/escopoAssistente');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('registro em dados: 5 agentes, passos e ferramentas declarados, validação da entrada', () => {
  const chaves = REG.AGENTES.map(a => a.chave);
  assert.deepStrictEqual(chaves, ['analise_projeto', 'projeto_disciplina', 'orcamento', 'pesquisa_precos', 'quadro_especificacao']);
  for (const a of REG.AGENTES) {
    for (const campo of ['nome', 'resumo', 'recebe', 'exigeUm', 'passos', 'ferramentas', 'saidas', 'parada', 'pedirIa']) assert.ok(a[campo] && (typeof a[campo] === 'string' || a[campo].length), `${a.chave}.${campo}`);
    assert.ok(PS.EXECUTORES[a.chave], `sem executor: ${a.chave}`);
    for (const k of a.exigeUm) assert.ok(a.recebe.some(r => r.campo === k), `${a.chave}: exigeUm ${k} fora de recebe`);
  }
  const ag = REG.obterAgente('orcamento');
  assert.ok(!REG.validarEntrada(ag, {}).ok);
  assert.ok(!REG.validarEntrada(ag, { analise_id: 'x' }).ok);
  const v = REG.validarEntrada(ag, { analise_id: '12', pesquisar_mercado: 'true', lixo: 1 });
  assert.ok(v.ok);
  assert.deepStrictEqual(v.entrada, { analise_id: 12, pesquisar_mercado: true });
  assert.ok(!REG.validarEntrada(REG.obterAgente('analise_projeto'), { arquivo_id: 1, finalidade: 'laudo' }).ok);
  // nada de cota sem permissão
  assert.strictEqual(REG.obterAgente('orcamento').usaCota, 'so_com_permissao');
});

caso('roteador: cada frase de exemplo do vocabulário cai na intenção dela', () => {
  for (const it of V.INTENCOES) {
    for (const ex of it.exemplos) {
      const d = R.decidirPuro({ texto: ex, arquivos: [{ id: 1, tipo: 'pdf' }], contexto: { analise_id: 3 } });
      assert.strictEqual(d.intencao, it.chave, `"${ex}" → ${d.intencao} (${d.motivo})`);
      assert.notStrictEqual(d.decisao, 'ia', ex);
    }
  }
});

caso('roteador: os dois pedidos reais do quadro (truncado e pesquisa de preço encadeada)', () => {
  const d1 = R.decidirPuro({ texto: 'De acordo com a descrição do cliente, sugira um projeto do quadro solicitado. Com projeto unifilar e 2…', arquivos: [{ id: 7, tipo: 'pdf' }] });
  assert.strictEqual(d1.decisao, 'agente');
  assert.strictEqual(d1.agente, 'quadro_especificacao');
  assert.deepStrictEqual(d1.entrada, { arquivo_id: 7 });
  assert.ok(T.pedidoTruncado('… Com projeto unifilar e 2…'));
  // pesquisa de preço depois do projeto do quadro: usa a lista de materiais do quadro (anteprojeto)
  const mats = [{ descricao: 'Disjuntor 3P 225 A 35 kA', quantidade: 1, unidade: 'un', modelo: 'DWB250' }];
  const d2 = R.decidirPuro({ texto: 'faça a pesquisa de preço do material necessario para a montagem do quadro', materiaisDoQuadro: { execucao_id: 33, materiais: mats } });
  assert.strictEqual(d2.agente, 'pesquisa_precos');
  assert.strictEqual(d2.entrada.anteprojeto, true);
  assert.deepStrictEqual(d2.entrada.itens, mats);
  // sem projeto do quadro na conversa: responde sem IA o que falta (não inventa lista)
  const d3 = R.decidirPuro({ texto: 'faça a pesquisa de preço do material necessario para a montagem do quadro' });
  assert.strictEqual(d3.decisao, 'resposta');
  assert.match(d3.resposta, /lista de materiais/);
});

caso('roteador: pergunta aberta, negação e "use a IA" vão para a IA; /agente força', () => {
  for (const t of ['como faço um orçamento de CFTV?', 'qual o preço do cabo 2,5?', 'bom dia', 'não gere o orçamento agora', 'use a IA para gerar o orçamento', '/ia gere o orçamento']) {
    assert.strictEqual(R.decidirPuro({ texto: t, contexto: { analise_id: 1 } }).decisao, 'ia', t);
  }
  assert.strictEqual(R.decidirPuro({ texto: 'gere o orçamento?', contexto: { analise_id: 1 } }).decisao, 'ia');
  assert.strictEqual(R.decidirPuro({ texto: '/agente gere o orçamento?', contexto: { analise_id: 1 } }).decisao, 'agente');
  // "o que é este projeto?" aceita pergunta
  assert.strictEqual(R.decidirPuro({ texto: 'o que é este projeto?', contexto: { analise_id: 9 } }).entrada.analise_id, 9);
  // pesquisa aprofundada → suporte Claude Max (consultor)
  const s = R.decidirPuro({ texto: 'faça uma pesquisa aprofundada sobre DPS classe I' });
  assert.strictEqual(s.decisao, 'suporte');
});

caso('roteador: entrada pelo anexo, pela tela e pela conversa; falta de dado responde sem IA', () => {
  const a = R.decidirPuro({ texto: 'gere o orçamento', contexto: { projeto_id: 4, analise_id: 2 } });
  assert.deepStrictEqual(a.entrada, { projeto_id: 4 });
  assert.strictEqual(R.decidirPuro({ texto: 'gere o orçamento e pesquise na web', contexto: { analise_id: 2 } }).entrada.pesquisar_mercado, true);
  assert.strictEqual(R.decidirPuro({ texto: 'gere o orçamento', contexto: { analise_id: 2 } }).entrada.pesquisar_mercado, undefined);
  const b = R.decidirPuro({ texto: 'analise este arquivo', arquivosConversa: [{ id: 30, tipo: 'xlsx' }, { id: 20, tipo: 'dwg' }] });
  assert.deepStrictEqual(b.entrada, { arquivo_id: 20 });
  const c = R.decidirPuro({ texto: 'analise este arquivo' });
  assert.strictEqual(c.decisao, 'resposta');
  const d = R.decidirPuro({ texto: 'faça o projeto de CFTV e de incêndio', contexto: { analise_id: 1 } });
  assert.strictEqual(d.decisao, 'resposta');
  assert.match(d.resposta, /um projeto por vez/);
  assert.deepStrictEqual(R.disciplinasDoTexto(' alarme de incendio e cftv '), ['incendio', 'cftv']);
});

caso('roteador: regra aprendida só vale aprovada (o carregamento só lê as aprovadas) e não passa por cima da padrão', () => {
  const regra = { id: 5, termos: ['levantamento', 'quantitativo'], agente: 'analise_projeto', intencao: 'analise' };
  const d = R.decidirPuro({ texto: 'quero o levantamento quantitativo deste desenho', regrasAprendidas: [regra], contexto: { analise_id: 8 } });
  assert.strictEqual(d.decisao, 'agente');
  assert.strictEqual(d.regra, 'aprendida:5');
  assert.strictEqual(R.decidirPuro({ texto: 'quero o levantamento quantitativo deste desenho', contexto: { analise_id: 8 } }).decisao, 'ia');
  const fonte = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'agentes', 'roteador.js'), 'utf8');
  assert.match(fonte, /tipo = 'vocabulario' AND situacao = 'aprovada'/);
});

caso('planilha QF-CAG: colunas, origens, preço em branco, SOMASES e contingência editável', async () => {
  const cot = { ofertas: [{ fonte: 'Cotação — Fornecedor Sintético', produto: 'Disjuntor X', preco: 100, mesmo_item: true }, { fonte: 'Catálogo H&M', produto: 'Disjuntor X', preco: 120, mesmo_item: true }] };
  const est = { ofertas: [{ fonte: 'Vendido pela H&M', produto: 'Canaleta', preco: 30, mesmo_item: true }, { fonte: 'SINAPI DF 10/2026', produto: 'canaleta', preco: 25, mesmo_item: false }] };
  const l1 = { grupo: 'Proteção', descricao: 'Disjuntor 3P 125 A', quantidade: 2, unidade: 'un', ...P.classificarPreco({}, cot) };
  const l2 = { grupo: 'Consumíveis', descricao: 'Canaleta 50x50', quantidade: 10, unidade: 'm', ...P.classificarPreco({}, est) };
  const l3 = { grupo: 'Consumíveis', descricao: 'Item sem referência', quantidade: 3, unidade: 'un', ...P.classificarPreco({}, null) };
  const l4 = { grupo: 'Proteção', descricao: 'Inversor do cliente', quantidade: 1, unidade: 'un', ...P.classificarPreco({ preco_cliente: 500 }, null) };
  assert.strictEqual(l1.origem, 'Pesquisado'); assert.strictEqual(l1.preco, 100); assert.match(l1.faixa, /100,00 a R\$ 120,00/);
  assert.strictEqual(l2.origem, 'Estimativa H&M'); assert.match(l2.observacao, /SINAPI indicativa/);
  assert.strictEqual(l3.origem, 'A cotar'); assert.strictEqual(l3.preco, null); assert.match(l3.observacao, /\[CONFERIR\]/);
  assert.strictEqual(l4.origem, 'Cliente');
  const linhas = [l1, l2, l3, l4];
  const r = P.resumirPorOrigem(linhas, 10);
  assert.strictEqual(r.subtotal, 1000); // 200 + 300 + 500
  assert.strictEqual(r.total, 1100);
  const buf = await P.gerarPlanilhaPrecos({ titulo: 'Teste', dataBase: '2026-11-09', contingenciaPct: 10, grupos: [{ nome: 'Proteção', itens: [l1, l4] }, { nome: 'Consumíveis', itens: [l2, l3] }] });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  assert.deepStrictEqual(ws.getRow(5).values.slice(1), ['Item', 'Tag', 'Descrição', 'Referência pesquisada', 'Qtd', 'Un', 'Preço unit.', 'Total', 'Origem do preço', 'Faixa encontrada', 'Fonte', 'Observação']);
  const celulas = [];
  ws.eachRow(row => row.eachCell(c => celulas.push(c)));
  const linhaSemPreco = celulas.find(c => c.value === 'Item sem referência').row;
  assert.strictEqual(ws.getRow(linhaSemPreco).getCell(7).value, null, 'preço sem referência tem de ficar em branco, nunca 0');
  assert.ok(celulas.some(c => c.formula && /^SUMIFS\(H\$6:H\$\d+,I\$6:I\$\d+,"Pesquisado"\)$/.test(c.formula)), 'SOMASES por origem');
  assert.ok(celulas.some(c => c.formula && /^COUNTIFS\(I\$6:I\$\d+,"A cotar"\)$/.test(c.formula)));
  const pct = celulas.find(c => c.value === 0.1 && c.numFmt === '0.0%');
  assert.ok(pct, 'contingência de 10 % editável');
  assert.ok(celulas.some(c => c.value === 'TOTAL MATERIAL (sem BDI e sem mão de obra)'));
  assert.ok(celulas.some(c => typeof c.value === 'string' && /^Data-base: 09\/11\/2026/.test(c.value)));
  assert.ok(celulas.some(c => typeof c.value === 'string' && /^Não inclui: mão de obra/.test(c.value)));
  assert.ok(!celulas.some(c => c.col === 7 && c.value === 0), 'nenhum preço R$ 0,00');
});

caso('templates: resposta do agente de preços e do agente de quadro', () => {
  const linhas = [
    { grupo: 'Proteção', descricao: 'Disjuntor geral 3P 250 A 35 kA', quantidade: 1, preco: 1200, faixaMin: 1000, origem: 'Pesquisado', fonte: 'Loja sintética', referencia: 'DWB250N', modelo: 'DWB250' },
    { grupo: 'Comando', descricao: 'Relé de interface 24 Vcc', quantidade: 11, preco: 100, faixaMin: 100, origem: 'Estimativa H&M', fonte: 'Vendido pela H&M', referencia: 'Finder 55.34', modelo: '40.52' },
  ];
  const { secoes } = T.respostaPrecos({ linhas, contingenciaPct: 10, fornecidosCliente: ['Inversor 17 A'], anteprojeto: true });
  const txt = secoes.map(s => `## ${s.titulo}\n${s.linhas.join('\n')}`).join('\n');
  for (const esperado of ['Total do material', 'com 10 % de contingência', 'Não inclui mão de obra, BDI nem itens fornecidos pelo cliente', 'Por grupo', 'Itens que mais pesam',
    'Pesquisado × estimativa', 'tratar como teto', 'Onde economizar', 'Mudanças em relação ao anteprojeto', 'Itens que dependem da Icc']) assert.ok(txt.includes(esperado), esperado);
  assert.match(txt, /especificado 40\.52 → pesquisado Finder 55\.34/);
  assert.match(txt, /Disjuntor geral/);
  const q = T.respostaQuadro({ truncado: true, aguardando: true, situacaoModulo: { pastas: ['skills/_comum/especificacao'] } }).map(s => `## ${s.titulo}\n${s.linhas.join('\n')}`).join('\n');
  for (const esperado of ['Como entendi o pedido', 'pacote padrão', 'FL01', 'FL02', 'FL04', 'Pontos a levantar com o cliente', 'Seletora', 'Troca automática', 'Emergência', 'Falta confirmar', 'Icc', 'ou equivalente', 'exige conferência e ART']) assert.ok(q.includes(esperado), esperado);
  assert.ok(!q.includes('FL03'), 'pedido truncado: pacote padrão sem FL03');
  const comProjeto = T.respostaQuadro({ projeto: { decisoes: ['Comando em 24 Vcc'], pontosALevantar: ['Ponto sintético'], faltaConfirmar: ['Dado sintético'] } }).map(s => s.linhas.join('\n')).join('\n');
  assert.ok(comProjeto.includes('Comando em 24 Vcc') && comProjeto.includes('Ponto sintético') && comProjeto.includes('FL03'));
});

// ── passos com ferramentas FALSAS ──
function ctxFalso(entrada, f, texto = '') {
  const r = { secoes: [], links: [], arquivos: [], pendencias: [], dados: {}, passos: [], pulados: [], ia: null };
  return {
    r,
    ctx: {
      entrada, texto, f, cancelado: () => false, log: () => {},
      async passo(chave, fn) { const resumo = await fn(); r.passos.push([chave, resumo]); return resumo; },
      pular(chave) { r.pulados.push(chave); }, secao(titulo, linhas) { r.secoes.push({ titulo, linhas }); }, pendencia(t) { r.pendencias.push(t); },
      link(rotulo, link) { r.links.push({ rotulo, link }); }, arquivo(a) { r.arquivos.push(a); }, dado(k, v) { r.dados[k] = v; }, precisaIa(m) { r.ia = m; },
    },
  };
}

caso('agente de análise: objetivo do projeto, achados, pendências e 3D', async () => {
  const analise = {
    id: 40, disciplinas: ['media_tensao'], ambientes: [], achados: [{ tema: 'Escala', observacao: 'duas escalas na folha' }],
    servicos: [{ descricao: 'Montagem', quantidade: 1 }], materiais: [{ descricao: 'Transformador 75 kVA', quantidade: 1, preco_catalogo: null }],
    dadosExtraidos: [{ aviso: 'leitura ok; [CONFERIR] legenda incompleta', objetivo: { disciplina: 'media_tensao', tipo: 'subestacao_abrigada', tipoRotulo: 'subestação abrigada', titulo: 'SE 75 kVA', confianca: 0.9,
      vistas: [{ papel: 'principal' }, { papel: 'contexto' }, { papel: 'apoio' }], dados: { potencia_kva: 75 }, abrigo: { largura_m: 3, comprimento_m: 4 },
      componentes: [{ tipo: 'trafo', descricao: 'Transformador', fonte: 'relacao_materiais', conferir: false }, { tipo: 'pr', descricao: 'Para-raios', fonte: 'legenda', conferir: true, motivo: 'quantidade não escrita' }],
      legendas: [{ titulo: 'RELAÇÃO DE MATERIAIS', itens: [{}, {}] }] } }],
  };
  analise.dadosExtraidos[0].desenho = [{ origem: 'cad', pagina: 'DWG', itens: [{ tipo: 'simbolo', descricao: 'Transformador 75 kVA', quantidade: 1, disciplina: 'media_tensao' }] }];
  const salvos = [];
  const f = { verAnalise: async () => analise, situacao3d: async () => ({ disponivel: true, arquivo: 'SE.dwg', disciplinas: ['media_tensao'] }),
    salvarArquivo: async (nome, buffer, tipo) => { salvos.push({ nome, tipo, bytes: buffer.length }); return { id: 77, nome, tipo }; } };
  const { ctx, r } = ctxFalso({ analise_id: 40, mostrar_3d: true }, f);
  await PS.EXECUTORES.analise_projeto(ctx);
  // 20/11/2026: a contagem de pontos aparece na resposta e a planilha de levantamento (padrão H&M) é entregue
  const contagem = r.secoes.find(s => s.titulo === 'Contagem de pontos');
  assert.ok(contagem && contagem.linhas.some(l => /Transformador 75 kVA \| 1 \| un/.test(l)), JSON.stringify(contagem));
  assert.strictEqual(salvos.length, 1);
  assert.match(salvos[0].nome, /^Levantamento de quantitativos - Analise 40 - .*\.xlsx$/);
  assert.ok(salvos[0].bytes > 5000);
  assert.deepStrictEqual(r.arquivos, [{ id: 77, nome: salvos[0].nome, tipo: 'xlsx' }]);
  const txt = r.secoes.map(s => s.linhas.join('\n')).join('\n');
  assert.match(txt, /subestação abrigada/);
  assert.match(txt, /1 principal .*1 de contexto .*1 de apoio/);
  assert.match(txt, /75 kVA/);
  assert.match(txt, /abrigo 3 × 4 m/);
  assert.match(txt, /F\/N\/PE/);
  assert.ok(r.pendencias.some(p => /Para-raios/.test(p)));
  assert.ok(r.pendencias.some(p => /legenda incompleta/.test(p)));
  assert.deepStrictEqual(r.links[0], { rotulo: 'Análise de projeto #40', link: '/obras/analise/40' });
});

caso('agente de análise: sem disciplina deduzível para e marca o suporte (não chuta)', async () => {
  const f = { arquivoDaConversa: async () => ({ nome_original: 'desenho 01.dwg', tipo: 'dwg' }) };
  const { ctx } = ctxFalso({ arquivo_id: 3 }, f);
  await assert.rejects(PS.EXECUTORES.analise_projeto(ctx), (e) => e.parada && e.suporte?.tipo === 'dado_faltando' && /disciplina/i.test(e.pergunta));
  // pelo nome do arquivo, sim
  let enviadas = null;
  const f2 = { arquivoDaConversa: async () => ({ nome_original: 'ELE-01 Planta.dwg', tipo: 'dwg' }), analisarArquivo: async (a) => { enviadas = a.disciplinas; return { id: 9, dadosExtraidos: [], materiais: [], servicos: [], achados: [], ambientes: [] }; },
    salvarArquivo: async (nome) => ({ id: 1, nome }) };
  const { ctx: c2 } = ctxFalso({ arquivo_id: 3 }, f2);
  await PS.EXECUTORES.analise_projeto(c2);
  assert.deepStrictEqual(enviadas, ['eletrica']);
});

caso('agente de análise: pedido sem disciplina inclui as do desenho; informada só avisa; dúvidas pedem conferência visual', async () => {
  // desenho "elétrica" pelo nome, com 20 luminárias (iluminação) aguardando o mapa do CAD
  const desenho = (disc) => [{ origem: 'cad', pagina: 'DWG', itens: [
    { tipo: 'simbolo', descricao: 'Tomada baixa', quantidade: 12, disciplina: 'eletrica', ambiguo: true },
    { tipo: 'simbolo', descricao: 'Luminária', quantidade: 20, disciplina: 'iluminacao', ambiguo: true },
    { tipo: 'simbolo', descricao: 'Detector', quantidade: 1, disciplina: 'incendio' }, // 1 ponto só: não puxa disciplina
  ] }].map(p => ({ ...p, disc }));
  const analise = (id, disciplinas) => ({ id, disciplinas, dadosExtraidos: [{ arquivo: 'ELE.dwg', desenho: desenho() }], materiais: [], servicos: [], achados: [], ambientes: [] });
  const chamadas = [];
  const f = { arquivoDaConversa: async () => ({ nome_original: 'ELE-01 Planta.dwg', tipo: 'dwg' }),
    analisarArquivo: async (x) => { chamadas.push(x.disciplinas); return analise(10 + chamadas.length, x.disciplinas); },
    salvarArquivo: async (nome) => ({ id: 1, nome }) };
  const { ctx, r } = ctxFalso({ arquivo_id: 3 }, f);
  await PS.EXECUTORES.analise_projeto(ctx);
  assert.deepStrictEqual(chamadas, [['eletrica'], ['eletrica', 'iluminacao']]);
  assert.strictEqual(r.dados.analise_id, 12);
  assert.ok(r.passos.some(([k, t]) => k === 'disciplinas' && /Ilumina/i.test(t) && /#12/.test(t)), JSON.stringify(r.passos));
  assert.match(r.ia || '', /Conferência visual/);
  assert.match(r.ia || '', /32 ponto\(s\) de símbolo explodido/);
  // disciplina informada no pedido: não refaz, só avisa
  chamadas.length = 0;
  const { ctx: c2, r: r2 } = ctxFalso({ arquivo_id: 3, disciplinas: ['eletrica'] }, f);
  await PS.EXECUTORES.analise_projeto(c2);
  assert.deepStrictEqual(chamadas, [['eletrica']]);
  assert.ok(r2.pulados.includes('disciplinas'));
  assert.ok(r2.pendencias.some(p => /disciplina não marcada/.test(p)));
  // disciplina marcada sem nenhum ponto lido
  const f3 = { verAnalise: async () => ({ ...analise(50, ['eletrica', 'cftv']) }), salvarArquivo: async (nome) => ({ id: 1, nome }) };
  const { ctx: c3, r: r3 } = ctxFalso({ analise_id: 50 }, f3);
  await PS.EXECUTORES.analise_projeto(c3);
  assert.ok(r3.pendencias.some(p => /sem nenhum ponto lido: CFTV/i.test(p)), JSON.stringify(r3.pendencias));
});

caso('agente de orçamento: não sobrescreve proposta de outra conversa (403 → pendência)', async () => {
  const erro = Object.assign(new Error('Gerar o orçamento daqui ATUALIZARIA uma proposta'), { status: 403 });
  const f = { gerarOrcamentoDaAnalise: async () => { throw erro; } };
  const { ctx } = ctxFalso({ analise_id: 5 }, f);
  await assert.rejects(PS.EXECUTORES.orcamento(ctx), (e) => e.parada && e.status === 'pendente' && /não sobrescrevo/.test(e.pergunta));
});

caso('agente de orçamento: rascunho + referências + planilha QF-CAG, web só com permissão', async () => {
  let pesquisouWeb = 0;
  const proposta = {
    id: 77, numero: 'P900', total: 1000, subtotal_materiais: 600, subtotal_mao_obra: 400,
    secoes: [{ id: 1, nome: 'Materiais e Equipamentos' }, { id: 2, nome: 'Serviços (Mão de Obra)' }],
    itens: [
      { id: 11, secao_id: 1, descricao: 'Câmera IP 4 MP sintética', quantidade: 4, unidade: 'un', valor_unitario: 150, status: 'confirmado' },
      { id: 12, secao_id: 1, descricao: 'Cabo sintético sem preço', quantidade: 100, unidade: 'm', valor_unitario: 0, status: 'a_cotar' },
      { id: 13, secao_id: 2, descricao: 'Instalação de câmera', quantidade: 4, unidade: 'un', valor_unitario: 100, status: 'confirmado' },
    ],
  };
  let salvo = null;
  const f = {
    gerarOrcamentoDaAnalise: async () => ({ propostaId: 77, numero: 'P900', criada: true, mensagem: 'ok' }), verProposta: async () => proposta,
    referenciasDePreco: async (d) => (/Câmera/.test(d) ? { ofertas: [{ fonte: 'Cotação — Distribuidor', produto: 'Câmera', preco: 140, mesmo_item: true }] } : null),
    pesquisarMercado: async () => { pesquisouWeb++; return { ofertas: [] }; },
    salvarArquivo: async (nome, buf) => { salvo = { nome, tamanho: buf.length }; return { id: 99, nome, tipo: 'xlsx' }; },
  };
  const { ctx, r } = ctxFalso({ analise_id: 5 }, f);
  await PS.EXECUTORES.orcamento(ctx);
  assert.strictEqual(pesquisouWeb, 0, 'sem permissão não pesquisa na web');
  assert.ok(r.pulados.includes('mercado'));
  assert.ok(salvo && /\.xlsx$/.test(salvo.nome));
  assert.strictEqual(r.arquivos[0].id, 99);
  assert.ok(r.links.some(l => l.link === '/propostas/editar/77'));
  assert.ok(r.pendencias.some(p => /Cabo sintético sem preço/.test(p)), 'o sem referência fica a cotar [CONFERIR]');
  assert.ok(!r.secoes.some(s => /Instalação de câmera/.test(s.linhas.join(' '))), 'mão de obra fora da planilha de material');
  const { ctx: c2 } = ctxFalso({ analise_id: 5, pesquisar_mercado: true }, f);
  await PS.EXECUTORES.orcamento(c2);
  assert.strictEqual(pesquisouWeb, 1, 'com permissão pesquisa só o item sem referência');
});

caso('agente de pesquisa de preços: lista do Excel (fornecido pelo cliente fica fora do total)', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Lista');
  ws.addRow(['Lista de materiais sintética']);
  ws.addRow(['Item', 'Descrição', 'Qtd', 'Un', 'Modelo', 'Fornecido pelo cliente']);
  ws.addRow(['', 'PROTEÇÃO']);
  ws.addRow([1, 'Disjuntor 3P 125 A', 2, 'un', 'DWB160', '']);
  ws.addRow([2, 'Inversor 17 A', 2, 'un', 'INV-17A', 'sim']);
  const itens = await PS.lerListaDoArquivo(Buffer.from(await wb.xlsx.writeBuffer()), 'xlsx');
  assert.strictEqual(itens.length, 2);
  assert.strictEqual(itens[0].grupo, 'PROTEÇÃO');
  assert.strictEqual(itens[0].modelo, 'DWB160');
  assert.strictEqual(itens[1].fornecido_cliente, true);
  const f = {
    bytesDoArquivo: async () => ({ registro: { nome: 'lista.xlsx', tipo: 'xlsx' }, buffer: Buffer.from(await wb.xlsx.writeBuffer()) }),
    referenciasDePreco: async () => ({ ofertas: [{ fonte: 'Catálogo H&M', produto: 'Disjuntor DWB160 125 A', preco: 600, mesmo_item: true }] }),
    salvarArquivo: async (nome) => ({ id: 1, nome, tipo: 'xlsx' }),
  };
  const { ctx, r } = ctxFalso({ arquivo_id: 1 }, f);
  await PS.EXECUTORES.pesquisa_precos(ctx);
  assert.strictEqual(r.dados.totais.subtotal, 1200);
  assert.strictEqual(r.dados.totais.total, 1320);
  const txt = r.secoes.map(s => s.linhas.join('\n')).join('\n');
  assert.match(txt, /Inversor 17 A/, 'fornecido pelo cliente aparece no "não inclui"');
});

caso('adaptador do quadro: aguardando módulo hoje; com um módulo sintético, roda e devolve o template', async () => {
  const situacao = AQ.situacao();
  if (situacao.disponivel) console.log('     (o módulo do quadro já existe: o caso "aguardando" não se aplica)');
  else {
    const { ctx, r } = ctxFalso({ texto: 'quadro 380 V com 2 bombas' }, {}, 'sugira um projeto do quadro. Com projeto unifilar e 2…');
    await assert.rejects(PS.EXECUTORES.quadro_especificacao(ctx), (e) => e.parada && e.status === 'aguardando_modulo');
    const txt = r.secoes.map(s => `${s.titulo}\n${s.linhas.join('\n')}`).join('\n');
    assert.match(txt, /aguardando módulo/);
    assert.match(txt, /pacote padrão/);
  }
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-quadro-falso-'));
  fs.writeFileSync(path.join(pasta, 'projetoSintetico.js'), `module.exports = { projetarPelaEspecificacao: (esp) => ({ folhas: [{ folha: 'FL01', titulo: 'Unifilar', conteudo: 'sintético' }], decisoes: ['decisão sintética'], pendencias: ['[CONFERIR] Icc sintética'], materiais: [{ descricao: 'Disjuntor sintético', quantidade: 1 }], recebido: esp }) };`);
  try {
    AQ.usarPasta(pasta);
    assert.ok(AQ.moduloDisponivel());
    const { ctx, r } = ctxFalso({ texto: 'especificação sintética' }, { salvarArquivo: async () => null }, 'monte o quadro desta especificação');
    await PS.EXECUTORES.quadro_especificacao(ctx);
    assert.ok(r.secoes.some(s => s.titulo === 'Principais decisões' && s.linhas.join(' ').includes('decisão sintética')));
    assert.deepStrictEqual(r.dados.materiais, [{ descricao: 'Disjuntor sintético', quantidade: 1 }]);
    assert.ok(r.pendencias.some(p => /Icc sintética/.test(p)));
  } finally { AQ.usarPasta(null); fs.rmSync(pasta, { recursive: true, force: true }); }
});

caso('assistente: ferramentas novas, lista de leitura sem nada que grave, rotas liberadas existem', async () => {
  const mcp = await import(require('url').pathToFileURL(path.join(__dirname, '..', 'src', 'mcp', 'assistenteFerramentas.mjs')).href);
  const nomes = mcp.definirFerramentas({ api: async () => ({}), contexto: {} }).map(f => f.nome);
  for (const n of ['executar_agente', 'ver_execucao', 'objetivo_do_projeto', 'consultar_conhecimento']) assert.ok(nomes.includes(n), n);
  const leitura = mcp.definirFerramentas({ api: async () => ({}), somenteLeitura: true }).map(f => f.nome).sort();
  assert.deepStrictEqual(leitura, F.FERRAMENTAS_LEITURA.slice().sort());
  for (const n of ['propor_acao', 'gerar_orcamento', 'editar_rascunho', 'analisar_arquivo', 'executar_agente', 'pesquisar_preco_mercado', 'atualizar_dados_projeto', 'inserir_kit', 'criar_projeto_disciplina', 'enviar_arquitetura']) {
    assert.ok(!leitura.includes(n), `${n} não pode estar no suporte`);
  }
  const rotas = rotasPermitidas();
  for (const r of ['GET /agentes', 'POST /agentes/execucoes', 'GET /agentes/execucoes/:id', 'GET /agentes/conhecimento']) assert.ok(rotas.includes(r), r);
  for (const proibida of ['PUT /agentes/sugestoes/:id', 'POST /agentes/pedidos/:id/avaliacao', 'POST /assistente/mensagens/:id/conhecimento', 'POST /agentes/execucoes/:id/cancelar']) {
    assert.ok(!rotas.includes(proibida), `token do assistente não aprova/avalia: ${proibida}`);
  }
  const { textoDeSistema } = require('../src/services/assistente/prompt');
  const t = textoDeSistema({ hoje: '2026-11-09' });
  for (const termo of ['executar_agente', 'objetivo_do_projeto', 'QF-CAG', 'F/N/PE', 'FL01', 'consultar_conhecimento', 'ART']) assert.ok(t.includes(termo), termo);
});

caso('texto do resultado: links, arquivos, pendências e suporte marcado como sugestão', () => {
  const t = textoDoResultado({
    id: 3, agente: 'orcamento', status: 'pendente', iniciado_em: '2026-11-09T10:00:00Z', terminado_em: '2026-11-09T10:00:05Z',
    resultado: { secoes: [{ titulo: 'Rascunho', linhas: ['- ok'] }], links: [{ rotulo: 'Proposta P1', link: '/propostas/editar/1' }], arquivos: [{ id: 2, nome: 'p.xlsx' }], pergunta: 'Escolha', suporte: { texto: 'faça X', modo: 'suporte', sugestao_id: 8 } },
    pendencias: ['[CONFERIR] y'], precisa_ia: true, motivo_ia: 'm',
  });
  for (const e of ['parou com pendência em 5 s', '### Rascunho', '[Proposta P1](/propostas/editar/1)', 'p.xlsx', '[CONFERIR] y', 'Para seguir:** Escolha', 'Suporte Claude Max', 'sugestão #8']) assert.ok(t.includes(e), e);
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`agentes: ${ok}/${casos.length} casos ok`);
})();
