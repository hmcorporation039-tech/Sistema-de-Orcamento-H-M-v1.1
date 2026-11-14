// Teste do motor genérico do projeto pela especificação (texto → blocos → requisitos → comando por
// blocos → simulação → planilha). Dados SINTÉTICOS. Rodar: node skills/_comum/especificacao/teste-especificacao.js
const assert = require('assert');
const ExcelJS = require('exceljs');
const { blocosDoTexto, celulasDaLinha, blocosDasLinhas } = require('./texto');
const LEI = require('./leitor');
const L = require('./logica');
const { compilarComando } = require('./comando');
const { perfilDe, listarPerfis } = require('./perfis');
const PL = require('./planilhaPrecos');
const E = require('./entrada');

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

(async () => {
  // ── texto → blocos ─────────────────────────────────────────────────────
  const b = blocosDoTexto('1. DADOS\nAlimentação | 380/220 V\n- item um\n  continuação\n2.1 Comando\nParágrafo solto.');
  eq(b.map(x => x.tipo), ['titulo', 'linha_tabela', 'item', 'titulo', 'paragrafo'], 'tipos dos blocos do TXT');
  eq(b[2].texto, 'item um continuação', 'continuação do item');
  eq(b[4].secao, '2.1 Comando', 'seção do bloco');
  // PDF por posição: rótulo e valor na mesma linha, continuação na 2ª coluna, item com marcador
  const linhas = [
    { pagina: 1, y: 700, h: 11, segs: [{ s: '2. DADOS DE ENTRADA', x: 57, w: 120 }] },
    { pagina: 1, y: 680, h: 9, segs: [{ s: 'Bombas (2 un.)', x: 62, w: 60 }, { s: 'Genérica 5 cv,', x: 192, w: 60 }] },
    { pagina: 1, y: 670, h: 9, segs: [{ s: '1 operando + 1 reserva', x: 192, w: 90 }] },
    { pagina: 1, y: 650, h: 10, segs: [{ s: '•', x: 63, w: 4 }, { s: 'Primeiro item', x: 75, w: 80 }] },
    { pagina: 1, y: 639, h: 10, segs: [{ s: 'que continua.', x: 75, w: 60 }] },
  ].map(l => ({ ...l, celulas: celulasDaLinha(l) }));
  const bp = blocosDasLinhas(linhas);
  eq(bp[1].celulas, ['Bombas (2 un.)', 'Genérica 5 cv, 1 operando + 1 reserva'], 'linha de tabela remontada pela posição');
  eq(bp[2].texto, 'Primeiro item que continua.', 'item com continuação');

  // ── perfis (herança) ───────────────────────────────────────────────────
  const chaves = listarPerfis().map(p => p.chave);
  ok(chaves.includes('quadro_forca_comando') && chaves.includes('painel_pressurizacao'), 'perfis registrados');
  const pp = perfilDe('painel_pressurizacao');
  ok(pp.vocabulario.requisitos.some(r => r.id === 'alimentacao.tensao') && pp.vocabulario.requisitos.some(r => r.id === 'comando.reversao'), 'herda o vocabulário do pai e acrescenta o seu');
  ok(!pp.verificacoes.regras.some(r => r.id === 'exc_valvulas'), 'o filho remove verificação do pai');

  // ── leitor ─────────────────────────────────────────────────────────────
  const perfil = perfilDe('quadro_forca_comando');
  const espec = blocosDoTexto([
    'QF-T1 — QUADRO DE TESTE',
    'Alimentação | 380/220 V · 3F + N + PE · 60 Hz, vinda do QGBT',
    'Resfriadores de líquido (2 un.) | Genérico RX20 · 380 V 3N~ · MCA 50 A / MFA 63 A cada',
    '- Uma seletora por bomba: MANUAL – 0 – AUTOMÁTICO.',
    '- Sem multimedidor.',
    '- Lógica por relés; CLP não é necessário.',
    '- Frase que nenhum padrão conhece sobre o revezamento das bombas.',
  ].join('\n'));
  const lidos = LEI.lerRequisitos(espec, perfil);
  const ch = lidos.equipamentos.find(e => e.tipo === 'chiller');
  eq([ch.quantidade.valor, LEI.attr(ch, 'mca_a'), LEI.attr(ch, 'mfa_a'), LEI.attr(ch, 'ligacao')], [2, 50, 63, '3F+N'], 'equipamento e dados de placa');
  eq(LEI.req(lidos, 'alimentacao.tensao').valor, { ff: 380, fn: 220 }, 'tensão');
  ok(LEI.negadoReq(lidos, 'forca.multimedidor') && LEI.negadoReq(lidos, 'comando.clp'), 'negações ("Sem multimedidor", "CLP não é necessário")');
  ok(LEI.req(lidos, 'alimentacao.tensao').origem.frase.includes('380/220'), 'frase de origem');
  ok(lidos.pendencias.some(p => p.campo === 'alimentacao.icc_ka'), 'Icc vira pendência');
  ok(lidos.naoLidos.some(x => /revezamento/.test(x.texto)), 'frase desconhecida fica como não lida');
  // aprendizado de vocabulário: a frase ensinada passa a ser lida
  const ap = [{ alvo: 'requisito', id: 'comando.troca_automatica', padrao: LEI.padraoDaFrase('nenhum padrão conhece sobre o revezamento das bombas') }];
  const lidos2 = LEI.lerRequisitos(espec, perfil, { aprendido: { vocabulario: ap } });
  ok(lidos2.requisitos.some(r => r.id === 'comando.troca_automatica' && r.fonte === 'aprendido'), 'vocabulário aprendido');
  eq(lidos2.estatistica.aprendidos, 1, 'estatística do aprendido');
  eq(LEI.fabricanteModelo('Genérica GX-9 (380 V, 8 A)'), { fabricante: 'Genérica', modelo: 'GX-9', idx: 0 }, 'fabricante e modelo');

  // ── avaliador (escada) ─────────────────────────────────────────────────
  const modelo = {
    entradas: [{ id: 'energia', tipo: 'energia' }, { id: 'S1', tipo: 'seletora', posicoes: ['0', 'LIGA'], padrao: '0' }, { id: 'B0', tipo: 'botao' }],
    barras: [{ tag: 'L+', expr: { x: 'energia' } }],
    degraus: [
      { barra: 'L+', expr: { s: [{ p: [{ x: 'S1=LIGA' }, { x: 'K1' }] }, { x: 'B0', neg: true }] }, saida: 'K1' }, // selo
      { barra: 'L+', expr: { x: 'K1' }, saida: 'T1' },
      { barra: 'L+', expr: { x: 'T1' }, saida: 'H1' }],
    temporizadores: [{ tag: 'T1', preset_s: 10 }],
  };
  let st = L.avaliar(modelo, { S1: 'LIGA' });
  ok(st.saidas.K1 && !st.saidas.H1 && st.estavel, 'liga e o temporizador ainda não venceu');
  st = L.avaliar(modelo, { S1: '0' }, st, 0);
  ok(st.saidas.K1, 'selo mantém K1');
  st = L.avaliar(modelo, { S1: '0' }, st, 11);
  st = L.avaliar(modelo, { S1: '0' }, st, 0);
  ok(st.saidas.H1, 'temporizador venceu');
  st = L.avaliar(modelo, { S1: '0', B0: true }, st, 0);
  ok(!st.saidas.K1 && !st.saidas.H1, 'botão desliga e zera o temporizador');
  const osc = L.avaliar({ entradas: [{ id: 'energia', tipo: 'energia' }], barras: [{ tag: 'L+', expr: { x: 'energia' } }], degraus: [{ barra: 'L+', expr: { x: 'KX', neg: true }, saida: 'KX' }] }, {});
  ok(!osc.estavel, 'oscilação detectada');
  const it = L.paraInteracao(modelo);
  ok(it.controles.find(c => c.id === 'S1').acoes.length === 2 && it.indicadores.some(i => i.id === 'H1'), 'formato de interação');
  eq(L.entradasDaInteracao(modelo, { S1: 'LIGA', B0: 'pressionado' }), { S1: 'LIGA', B0: true }, 'estados da interação → entradas');

  // ── compilador de blocos ──────────────────────────────────────────────
  const req = ['comando.emergencia', 'comando.liberacao', 'comando.automatico_pedido', 'comando.seletora_man_0_aut', 'comando.titular_reserva', 'valvulas.alimentacao', 'valvulas.abre_em_manual', 'valvulas.contato_externo'];
  const ext = [1, 2].map(i => ({ i, tag: `EQ0${i}`, rotulo: `Equip. 0${i}`, sinal: { pedido: 'DO1', liberacao: 'DI1', bomba_operando: 'DI2', valvula: 'DO2' } }));
  const ctx = { req, combinacao: 'qualquer', motores: [1, 2].map(i => ({ i, tag: `B${i}`, rotulo: `Bomba B${i}`, acion: `U${i}`, acionRotulo: 'Inversor' })), externos: ext,
    valvulas: ext.map(e => ({ i: e.i, tag: `YV${e.i}`, rotulo: `válvula ${e.tag}`, e })), listas: { 'sinalizacao.porta': [{ texto: 'falha B1' }, { texto: 'modo manual' }] } };
  const cmd = compilarComando(ctx);
  ok(['KE', 'KL', 'KP', 'KT', 'KB1', 'KB2', 'KMAN', 'KR1', 'KF1', 'KR2', 'KF2'].every(t => cmd.reles.some(r => r.tag === t)), 'relés dos blocos');
  ok(cmd.verificacao.length >= 20 && cmd.verificacao.every(v => v.ok), `cenários: ${cmd.verificacao.filter(v => !v.ok).map(v => v.nome).join('; ')}`);
  ok(cmd.reles.find(r => r.tag === 'KT').usos.some(u => u.tipo === 'NF'), 'KT NF para a titular B1');
  ok(cmd.seletoras.find(s => s.tag === 'S1').blocos.length === 3, 'seletora MAN-0-AUT com 3 blocos (MAN, AUT, MAN para o KMAN)');
  const cmdR = compilarComando({ ...ctx, decisoes: { titular_automacao: 'REMOTO' }, req: [...req, 'automacao.entrada_selecao_titular'] });
  ok(cmdR.seletoras.some(s => (s.posicoes || []).includes('REM')) && cmdR.verificacao.every(v => v.ok), 'variante aprendida (seletora com REM)');

  // ── 3D: modo comando por relés (visualizador3d/comandoReles.js, sem DOM: peças e painel falsos) ──
  const { iniciarComandoReles } = await import('../cad/visualizador3d/comandoReles.js');
  const pintadas = new Map();
  const malha = (tag) => ({ userData: { tag } });
  const pecas = [malha('seletor:1'), malha('emergencia:2'), malha('sinaleiro_vermelho:3'), malha('KB1')];
  const CR = { modelo: cmd.modelo, interacao: cmd.interacao, cenarios: cmd.cenarios.map(c => ({ ...c, ok: true })),
    porta: [{ meshTag: 'seletor:1', id: 'S1' }, { meshTag: 'emergencia:2', id: 'S0' }, { meshTag: 'sinaleiro_vermelho:3', id: 'H1' }], placa: { KB1: 'KB1' } };
  const cr = iniciarComandoReles({ CR, comTag: pecas, painel: null, pintar: (m, on) => pintadas.set(m.userData.tag, on), relogio: false });
  eq(cr.pecas.length, 4, '3D: peças da porta e da placa ligadas ao modelo');
  cr.cliqueMesh(pecas[0]); // S1: 0 → AUT (ordem MAN, 0, AUT)
  cr.cliqueMesh(pecas[0]); // AUT → MAN
  ok(cr.estado().estados.S1 === 'MAN' && cr.estado().saidas.KB1 && pintadas.get('KB1') === true, '3D: clique na seletora gira e o relé acende');
  cr.cliqueMesh(pecas[1]);
  ok(cr.estado().estados.S0 === 'acionado' && !cr.estado().saidas.KB1 && pintadas.get('KB1') === false, '3D: emergência pela porta derruba a partida');
  ok(/atendido/.test(cr.aplicarCenario(0)), '3D: cenário reproduzido no visualizador');

  // ── planilha de preços (formato H&M, fórmulas vivas, nunca R$ 0,00) ─────
  const projeto = {
    meta: { titulo: 'QF-T1', revisao: '0A', cliente: 'Cliente Fictício', obra: 'Obra Fictícia' }, quadro: { tag: 'QF-T1', origem: 'QGBT' },
    materiais: [
      { item: 1, grupo: 'Invólucro', tag: '—', descricao: 'Quadro de sobrepor IP54 1000×800×300 mm', quantidade: 1, unidade: 'pç', referencia: 'genérico', chave: 'quadro sobrepor ip54 1000x800x300' },
      { item: 2, grupo: 'Proteção de força', tag: 'Q1', descricao: 'Disjuntor caixa moldada 3P 160 A', quantidade: 1, unidade: 'pç', referencia: 'genérico', chave: 'disjuntor caixa moldada 3p 160 a', dependeIcc: true },
      { item: 3, grupo: 'Comando e sinalização', tag: 'S1', descricao: 'Seletora 22 mm 3 posições', quantidade: 2, unidade: 'pç', referencia: 'genérico', chave: 'seletora 22mm 3 posicoes' },
      { item: 4, grupo: 'Fornecido pelo cliente', tag: 'U1', descricao: 'Inversor genérico', quantidade: 1, unidade: 'pç', referencia: 'cliente', cliente: true },
    ],
  };
  const fontes = { aprendidos: [
    { chave: 'disjuntor caixa moldada 3p 160 a', descricao: 'Disjuntor caixa moldada 3P 160 A', preco: 500, faixa: [450, 600], fonte: 'loja fictícia', data: '2026-11-01', origem: 'pesquisado', equivale: 'marca A → marca B' },
    { chave: 'seletora 22mm 3 posicoes', descricao: 'Seletora 22 mm 3 posições', preco: 100, fonte: 'loja fictícia', data: '2026-11-01', origem: 'estimativa', alternativa: { referencia: 'linha econômica', preco: 20 } },
  ] };
  const r = await PL.gerarPlanilhaPrecos(projeto, fontes, { contingencia: 0.1 });
  eq(r.itens.map(i => i.origem), ['A cotar', 'Pesquisado', 'Estimativa H&M', 'Cliente'], 'origem de cada preço');
  ok(r.itens[0].preco == null, 'sem preço fica em branco (nunca R$ 0,00)');
  eq([r.resumo.subtotal, r.resumo.pesquisado, r.resumo.estimado, Math.round(r.resumo.total * 100) / 100], [700, 500, 200, 770], 'subtotais e contingência');
  eq(r.resumo.economia.total, 160, 'onde economizar');
  ok(r.resumo.mudancas.length === 1 && r.resumo.dependeIcc.includes('Q1'), 'mudanças e itens dependentes da Icc');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(r.buffer);
  const ws = wb.getWorksheet('Materiais');
  eq(ws.getCell('A4').value, 'Item', 'cabeçalho');
  const formulas = [];
  ws.eachRow(row => row.eachCell(c => { if (c.value && c.value.formula) formulas.push(c.value.formula); }));
  ok(formulas.some(f => /^SUMIFS\(H5:H\d+,I5:I\d+,"Pesquisado"\)$/.test(f)) && formulas.some(f => /"Estimativa H&M"/.test(f)), 'SUMIFS por origem');
  ok(formulas.some(f => /^E\d+\*G\d+$/.test(f)) && formulas.some(f => /\*L\d+$/.test(f)), 'total = qtd × preço e contingência editável');
  ok(wb.getWorksheet('Resumo') && formulas.length > 8, 'aba Resumo');

  // preço por metro a partir do rolo e proporcional à seção (mesmo material), sempre "Estimativa H&M"
  const conv = PL.resolverPrecos([
    { item: 1, grupo: 'Consumíveis', tag: '—', descricao: 'Cabo flexível 2,5 mm² (750 V, fiação interna)', quantidade: 30, unidade: 'm', chave: 'cabo flexivel 2.5mm2' },
    { item: 2, grupo: 'Consumíveis', tag: '—', descricao: 'Cabo flexível 4 mm² (750 V, fiação interna)', quantidade: 10, unidade: 'm', chave: 'cabo flexivel 4mm2' },
    { item: 3, grupo: 'Barramento e bornes', tag: '—', descricao: 'Barra de cobre eletrolítico 40×5 mm (fases)', quantidade: 4, unidade: 'm', chave: 'barra cobre 40x5' },
  ], { aprendidos: [
    { chave: 'Cabo flexível 2,5 mm² (rolo)', descricao: 'Cabo flexível 2,5 mm² (rolo)', unidade: 'rolo 100 m', preco: 300, fonte: 'loja fictícia', origem: 'pesquisado' },
    { chave: 'Barra de cobre eletrolítico 30×5 mm', descricao: 'Barra de cobre eletrolítico 30×5 mm', unidade: 'm', preco: 150, fonte: 'loja fictícia', origem: 'pesquisado' },
  ] });
  eq(conv.map(i => i.preco), [3, 4.8, 200], 'rolo → metro e proporcional à seção (4 mm² e 40×5)');
  ok(conv.every(i => i.origem === 'Estimativa H&M') && /convertido/.test(conv[0].obs) && /proporcional à seção/.test(conv[2].obs), 'regra escrita na observação');

  // ── ponto de entrada (agente do assistente) ────────────────────────────
  const pj = await E.projetarPelaEspecificacao(espec.map(x => x.texto).join('\n'), {});
  ok(pj.folhas.length === 7 && Array.isArray(pj.decisoes) && Array.isArray(pj.faltaConfirmar) && Array.isArray(pj.materiais), 'contrato do agente');
  ok(Buffer.isBuffer(await E.gerarPlanilhaPesquisaPrecos(pj, {})), 'planilha em Buffer');

  console.log(`_comum/especificacao/teste-especificacao.js: ${n}/${n} verificações OK`);
})().catch(e => { console.error(e); process.exit(1); });
