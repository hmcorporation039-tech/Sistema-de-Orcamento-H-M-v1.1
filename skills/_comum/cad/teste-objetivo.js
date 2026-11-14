// Teste do ENTENDIMENTO DO PROJETO (./objetivoDoProjeto.js, ./componentesDoProjeto.js, ./perfisDisciplina.js) —
// revisão de 09/11/2026: o DWG de uma subestação com a planta de situação de outro projeto colada (layers PDF_*)
// virava "arquitetura" no 3D e luminárias/tomadas no orçamento. Desenhos SINTÉTICOS montados aqui (nenhum dado de
// cliente). Rodar: node _comum/cad/teste-objetivo.js
const assert = require('assert');
const { lerArquitetura } = require('./arquitetura');
const { entenderProjeto, naVistaPrincipal, papelDoPonto, paraTestes } = require('./objetivoDoProjeto');
const { lerLegendas, itensNumTexto, lerBaloes, especificacaoDe } = require('./componentesDoProjeto');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};

// ── DXF cru ───────────────────────────────────────────────────────────────────────────────────────────
const dxfR = (ents, { blocos = [] } = {}) => ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', 6, '0', 'ENDSEC',
  '0', 'SECTION', '2', 'BLOCKS', ...blocos.flat(), '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', ...ents.flat(), '0', 'ENDSEC', '0', 'EOF'].join('\n');
const L = (x1, y1, x2, y2, layer = '0') => ['0', 'LINE', '8', layer, '10', x1, '20', y1, '30', 0, '11', x2, '21', y2, '31', 0];
const T = (s, x, y, h = 0.1, layer = 'TEXTO') => ['0', 'TEXT', '8', layer, '10', x, '20', y, '30', 0, '40', h, '1', s];
const MT = (s, x, y, h = 0.1, layer = 'TEXTO') => ['0', 'MTEXT', '8', layer, '10', x, '20', y, '30', 0, '40', h, '71', 1, '1', s];
const CI = (x, y, r, layer = '0') => ['0', 'CIRCLE', '8', layer, '10', x, '20', y, '30', 0, '40', r];
const ARC = (x, y, r, a0, a1, layer = '0') => ['0', 'ARC', '8', layer, '10', x, '20', y, '30', 0, '40', r, '50', a0, '51', a1];
const RET = (x0, y0, x1, y1, layer = '0') => [L(x0, y0, x1, y0, layer), L(x1, y0, x1, y1, layer), L(x1, y1, x0, y1, layer), L(x0, y1, x0, y0, layer)];
const INS = (nome, x, y, layer = '0') => ['0', 'INSERT', '8', layer, '2', nome, '10', x, '20', y, '30', 0];
const BLOCO = (nome, ents) => ['0', 'BLOCK', '8', '0', '2', nome, '70', 0, '10', 0, '20', 0, '30', 0, '3', nome, '1', '', ...ents.flat(), '0', 'ENDBLK', '8', '0'];
// balão: círculo com o número dentro (o TEXT começa embaixo à esquerda)
const BALAO = (n, x, y) => [CI(x, y, 0.12, 'BALOES'), T(n, x - n.length * 0.1 * 0.45, y - 0.05, 0.1, 'BALOES')];

// Folha da SUBESTAÇÃO: planta do abrigo DESENHADA AO DOBRO (cotas 250 × 525 cm sobre 5,0 × 10,5 unidades), com
// balões, relação de materiais, legenda do poste num MTEXT só, carimbo — e a planta de SITUAÇÃO de outro projeto
// colada ao lado, em layers PDF_* (salas, luminárias, tomadas)
function folhaSubestacao({ situacao = true } = {}) {
  const e = [];
  // abrigo: paredes de 15 cm (0,30 unidade), divisória (tela) entre a célula do trafo e o posto de manobra
  e.push(...RET(0, 0, 5, 10.5, 'SE-PAREDE'), ...RET(0.3, 0.3, 4.7, 10.2, 'SE-PAREDE'));
  e.push(L(0.3, 5.4, 4.7, 5.4, 'SE-TELA'), L(0.3, 5.5, 4.7, 5.5, 'SE-TELA'));
  // porta de duas folhas na parede da esquerda, abrindo para fora
  e.push(ARC(0, 2, 1.2, 90, 180, 'SE-PORTA'), ARC(0, 4.4, 1.2, 180, 270, 'SE-PORTA'));
  // transformador desenhado na layer com nome ENGANADO (500 kVA) e o tapete
  e.push(...RET(1.5, 7, 3.5, 9, 'TRANSFORMADOR A ÓLEO 500KVA'), ...RET(2.5, 1, 4.5, 3, 'TAPETE DE BORRACHA'));
  // cotas (em cm) com as linhas de cota
  e.push(L(0, 11.2, 5, 11.2, 'COTAS'), T('250', 2.3, 11.25, 0.14, 'COTAS'));
  e.push(L(0.3, 10.8, 4.7, 10.8, 'COTAS'), T('220', 2.3, 10.85, 0.14, 'COTAS'));
  e.push(L(5.8, 0, 5.8, 10.5, 'COTAS'), T('525', 5.85, 5.2, 0.14, 'COTAS'));
  e.push(L(5.4, 0.3, 5.4, 5.4, 'COTAS'), T('255', 5.45, 2.8, 0.14, 'COTAS'));
  // balões: 26 trafo, 28 tapete, 24 venezianas (2), 18 porta, 02 mufla
  e.push(...BALAO('26', 1.0, 8.5), ...BALAO('28', 3.0, 3.4), ...BALAO('24', 2.5, 10.0), ...BALAO('24', 2.5, 0.5), ...BALAO('18', -0.6, 3.2), ...BALAO('02', 4.2, 9.5));
  e.push(T('PLANTA BAIXA - SUBESTAÇÃO', 0.5, -1.0, 0.25, 'TITULOS'), T('ESC 1/50', 0.5, -1.3, 0.12, 'TITULOS'));
  // relação de materiais: número e descrição separados (09), descrição em duas linhas (18), itens faltando (03–08…)
  const R = (s, y, x = 12) => T(s, x, y, 0.1, 'RELACAO');
  e.push(T('RELAÇÃO DE MATERIAIS', 12.5, 10.2, 0.2, 'RELACAO'));
  e.push(R('01 ELETRODUTO DE FERRO GALVANIZADO Ø 100mm', 9.8), R('02 MUFLA TERMINAL UNIPOLAR, PARA 15 kV USO INTERNO', 9.4));
  e.push(R('09', 9.0), R('PLACA DE ADVERTÊNCIA "PERIGO DE MORTE"', 9.0, 11.5));
  e.push(R('18', 8.6), R('PORTA DE AÇO DE DUAS FOLHAS C/ FECHADURA', 8.66, 12.6), R('E FERROLHO H=2,10M L=1,20M', 8.5, 12.6));
  e.push(R('24 VENEZIANA TIPO CHICANA 500x1000mm', 8.2), R('26 TRANSFORMADOR TRIFASICO, ISOLAMENTO À ÓLEO, 150KVA, TENSÃO 13.800V - 380/220V', 7.8));
  e.push(R('28 TAPETE DE BORRACHA ISOLAMENTO 15kV', 7.4), R('29 CONDUTOR DE COBRE UNIPOLAR ISOLADO PARA 15 kV XLPE OU EPR #50mm²', 7.0));
  e.push(R('32 HASTE DE ATERRAMENTO COBREADA Ø5/8" 2,4m', 6.6));
  // notas e unifilar (texto)
  e.push(T('1 - O VALOR MAXIMO DA RESISTENCIA DE ATERRAMENTO DEVERÁ SER </= 10 OHMS.', 12, 5.0, 0.1, 'NOTAS'));
  e.push(T('DEMANDA: 146,95 kVA', 12, 4.4, 0.12, 'NOTAS'), T('MEDIÇÃO INDIRETA "CJTR-250A"', 12, 4.0, 0.12, 'NOTAS'));
  // legenda do poste de entrega: um MTEXT só, itens separados por \P (com código de formatação)
  e.push(T('LEGENDA POSTE DE ENTREGA', 22, 10.2, 0.16, 'POSTE'));
  e.push(MT('{\\C2;1 PERFIL U DE COMPRIMENTO 900 MM\\P2 ISOLADOR POLIMÉRICO DE ANCORAGEM 15 KV\\P3 PARA-RAIOS 12 KV, 10 KA\\P4 POSTE DE CONCRETO CIRCULAR 12m/1000dAN}', 22, 9.95, 0.09, 'POSTE'));
  e.push(...RET(21, 1, 25, 9, 'POSTE'), L(23, 1, 23, 9, 'POSTE'));
  // carimbo
  e.push(...RET(11, -4, 19, -1.5, 'CARIMBO-LINHAS'));
  e.push(T('SUBESTAÇÃO 150kVA - ABRIGADA', 11.2, -2.0, 0.15, 'FOLHA'), T('PROJETO ELÉTRICO', 11.2, -2.3, 0.12, 'FOLHA'));
  ['DATA', 'ESCALA', 'REVISÃO', 'DESENHO', 'PROPRIETÁRIO:'].forEach((s, i) => e.push(T(s, 11.2 + i * 1.5, -3.6, 0.1, 'FOLHA')));
  if (situacao) {
    // planta de situação da ARENA (outro projeto) em layers PDF_*: salas, luminárias, tomadas
    const X = -40;
    e.push(...RET(X, 0, X + 20, 14, 'PDF_ARQ-ALV-CRT'), ...RET(X, 0, X + 8, 6, 'PDF_ARQ-ALV-CRT'), ...RET(X + 8, 0, X + 20, 6, 'PDF_ARQ-ALV-CRT'));
    e.push(...RET(X, 6, X + 10, 14, 'PDF_ARQ-ALV-CRT'), ...RET(X + 10, 6, X + 20, 14, 'PDF_ARQ-ALV-CRT'));
    e.push(T('QUADRAS 1 E 2', X + 3, 3, 0.25, 'PDF_Text'), T('DEPÓSITO', X + 12, 3, 0.25, 'PDF_Text'), T('LANCHONETE', X + 3, 10, 0.25, 'PDF_Text'), T('VESTIÁRIO', X + 13, 10, 0.25, 'PDF_Text'));
    for (let i = 0; i < 6; i++) e.push(CI(X + 2 + i * 3, 12, 0.2, 'PDF_EL-Lâmpada'), ...RET(X + 1 + i * 3, 0.5, X + 1.3 + i * 3, 0.8, 'PDF_EL-Tomadas'));
    e.push(T('LUMINÁRIA LED 40W', X + 2, 12.5, 0.1, 'PDF_Text'), T('ACIONADOR MANUAL', X + 5, 7, 0.1, 'PDF_Text'));
    e.push(T('PLANTA BAIXA - TÉRREO (SITUAÇÃO E LOCAÇÃO)', X + 2, -1.0, 0.25, 'TITULOS'));
  }
  return dxfR(e);
}

caso('subestação: disciplina, tipo, título do carimbo e dados escritos (150 kVA, não o 500 da layer)', () => {
  const o = entenderProjeto(lerArquitetura(folhaSubestacao()), { nomeArquivo: 'SE_150KVA_TESTE.dwg' });
  assert.strictEqual(o.disciplina, 'media_tensao');
  assert.strictEqual(o.tipo, 'subestacao_abrigada');
  assert.strictEqual(o.objeto, 'abrigo');
  assert.strictEqual(o.titulo, 'SUBESTAÇÃO 150kVA - ABRIGADA');
  assert.strictEqual(o.dados.potencia_kva, 150);
  assert.strictEqual(o.dados.tensao_primaria_kv, 13.8);
  assert.strictEqual(o.dados.tensao_secundaria_v, 380);
  assert.strictEqual(o.dados.tensao_secundaria_fn_v, 220);
  assert.strictEqual(o.dados.demanda_kva, 146.95);
  assert.strictEqual(o.dados.medicao, 'indireta CJTR-250A');
  assert.strictEqual(o.dados.resistencia_malha_max_ohm, 10);
  assert.ok(o.avisos.some(a => /500/.test(a) && /150/.test(a)), 'a layer de 500 kVA vira aviso');
});

caso('vistas: planta da SE = principal (caixa justa); situação colada = contexto; relação = apoio; carimbo = fora', () => {
  const o = entenderProjeto(lerArquitetura(folhaSubestacao()), { nomeArquivo: 'SE_150KVA_TESTE.dwg' });
  const principal = o.vistas.filter(v => v.papel === 'principal');
  assert.strictEqual(principal.length, 1, JSON.stringify(o.vistas.map(v => [v.papel, v.titulo, v.caixa])));
  const c = principal[0].caixa;
  assert.ok(c[0] >= -1.5 && c[2] <= 7 && c[1] >= -2 && c[3] <= 12, `caixa da principal ${c}`);
  assert.strictEqual(papelDoPonto(o, [-30, 7]), 'contexto', 'a planta de situação é contexto');
  assert.strictEqual(naVistaPrincipal(o, [-30, 7]), false);
  assert.strictEqual(naVistaPrincipal(o, [2.5, 5]), true);
  assert.notStrictEqual(papelDoPonto(o, [12.5, 8]), 'principal', 'a relação de materiais não é planta');
  assert.ok(o.camadasDeContexto.includes('PDF_EL-Lâmpada') && o.camadasDeContexto.includes('PDF_EL-Tomadas'), o.camadasDeContexto.join(', '));
  // escala da vista principal pelas cotas: desenhada ao dobro
  assert.deepStrictEqual({ fator: principal[0].escala.fator, fonte: principal[0].escala.fonte }, { fator: 0.5, fonte: 'cotas' });
});

caso('relação de materiais + balões → componentes com contagem; nada da arena (luminária, tomada, acionador)', () => {
  const o = entenderProjeto(lerArquitetura(folhaSubestacao()), { nomeArquivo: 'SE_150KVA_TESTE.dwg' });
  const por = (t) => o.componentes.filter(c => c.tipo === t);
  const trafo = por('transformador');
  assert.strictEqual(trafo.length, 1);
  assert.strictEqual(trafo[0].quantidade, 1);
  assert.strictEqual(trafo[0].especificacao.kva, 150, 'a relação vence a layer "500KVA"');
  assert.strictEqual(trafo[0].item, '26');
  assert.ok(trafo[0].fontes.some(f => /layer: "TRANSFORMADOR A ÓLEO 500KVA"/.test(f)));
  assert.strictEqual(por('veneziana')[0].quantidade, 2, '2 balões "24"');
  assert.strictEqual(por('tapete')[0].quantidade, 1);
  const porta = por('porta')[0];
  assert.strictEqual(porta.descricao, 'PORTA DE AÇO DE DUAS FOLHAS C/ FECHADURA E FERROLHO H=2,10M L=1,20M', 'linha de continuação junta');
  assert.deepStrictEqual([porta.especificacao.largura_m, porta.especificacao.altura_m], [1.2, 2.1]);
  assert.strictEqual(por('placa_advertencia')[0].item, '09', 'número e descrição separados na mesma linha');
  assert.strictEqual(por('mufla_interna')[0].quantidade, 3, 'mufla unipolar: 1 balão no conjunto → 3');
  assert.strictEqual(por('mufla_interna')[0].conferir, true);
  assert.strictEqual(por('cabo_mt')[0].quantidade, null, 'comprimento não escrito');
  assert.ok(!o.componentes.some(c => /luminaria|iluminacao|tomada|acionador/.test(c.tipo)), o.componentes.map(c => c.tipo).join(', '));
  assert.ok(o.avisos.some(a => /03–08/.test(a)), 'os itens que faltam na relação viram aviso');
  // poste de entrega (MTEXT de parágrafos)
  assert.deepStrictEqual(['isolador', 'para_raios', 'poste_entrada'].map(t => por(t).length), [1, 1, 1]);
  assert.strictEqual(por('poste_entrada')[0].especificacao.comprimento_m, 12);
  assert.ok(o.legendas.some(l => l.tipo === 'legenda' && l.titulo === 'LEGENDA POSTE DE ENTREGA' && l.itens.length === 4));
});

caso('abrigo desenhado ao dobro: 2,50 × 5,25 m pelas cotas, dois compartimentos e a porta de 1,20 m da relação', () => {
  const o = entenderProjeto(lerArquitetura(folhaSubestacao()), { nomeArquivo: 'SE_150KVA_TESTE.dwg' });
  const a = o.abrigo;
  assert.ok(a, 'abrigo lido');
  assert.deepStrictEqual([a.largura_m, a.comprimento_m, a.escala.fator], [2.5, 5.25, 0.5]);
  assert.deepStrictEqual(a.contorno_m, [[0, 0], [2.5, 0], [2.5, 5.25], [0, 5.25]]);
  assert.deepStrictEqual(a.cotasConfirmam, { largura: true, comprimento: true });
  assert.strictEqual(a.compartimentos.length, 2);
  assert.deepStrictEqual(a.compartimentos.map(c => c.nome).sort(), ['célula de transformação', 'posto de manobra/proteção']);
  assert.strictEqual(a.portas.length, 1);
  assert.deepStrictEqual([a.portas[0].largura_m, a.portas[0].altura_m, a.portas[0].folhas], [1.2, 2.1, 2]);
  // posição do trafo em metros reais na origem do abrigo
  const trafo = o.componentes.find(c => c.tipo === 'transformador');
  assert.ok(trafo.posicao && trafo.posicao.local_m[0] >= 0 && trafo.posicao.local_m[1] <= 5.25, JSON.stringify(trafo.posicao));
});

caso('legendas: número e descrição em textos separados, continuação, MTEXT numerado, peças de detalhe', () => {
  const t = (s, x, y, h = 0.1) => ({ s, x, y, h, layer: 'X' });
  const ls = lerLegendas([
    t('LISTA DE MATERIAIS', 0, 10, 0.2),
    t('1', 0, 9.6), t('CABO 2,5 mm² 750 V', 0.4, 9.6),
    t('2', 0, 9.2), t('ELETRODUTO PVC Ø 25 mm', 0.4, 9.25), t('RÍGIDO ROSCÁVEL', 0.4, 9.1),
    t('4 QUADRO DE DISTRIBUIÇÃO 12 POSIÇÕES', 0, 8.8),
    // detalhe com peças em duas colunas
    t('CAIXA DE INSPEÇÃO', 20, 5, 0.15), t('1 TAMPÃO FF', 20, 4.7), t('2 REBOCO', 24, 4.7), t('3 HASTE Ø5/8" 2,4m', 20, 4.4), t('4 CONECTOR', 24, 4.4),
  ]);
  const lista = ls.find(l => l.tipo === 'relacao_materiais');
  assert.deepStrictEqual(lista.itens.map(i => [i.numero, i.descricao]), [[1, 'CABO 2,5 mm² 750 V'], [2, 'ELETRODUTO PVC Ø 25 mm RÍGIDO ROSCÁVEL'], [4, 'QUADRO DE DISTRIBUIÇÃO 12 POSIÇÕES']]);
  assert.deepStrictEqual(lista.faltando, [3]);
  const det = ls.find(l => l.tipo === 'legenda_detalhe');
  assert.strictEqual(det.titulo, 'CAIXA DE INSPEÇÃO');
  assert.deepStrictEqual(det.itens.map(i => i.numero), [1, 2, 3, 4]);
  assert.deepStrictEqual(itensNumTexto('1 PERFIL U 900 MM 2 ISOLADOR 15 KV 3 PARA-RAIOS 12 KV, 10 KA 4 TERMINAL USO EXTERNO 5 MÃO FRANCESA').map(i => i.n), [1, 2, 3, 4, 5]);
  assert.deepStrictEqual(especificacaoDe('TRANSFORMADOR TRIFASICO, ISOLAMENTO À ÓLEO, 150KVA, TENSÃO 13.800V - 380/220V'), { kva: 150, tensao_kv: 13.8, tensao_secundaria_v: '380/220', isolamento: 'óleo', polos: 3 });
});

caso('legenda de símbolos: o bloco à esquerda da descrição dá o nome ao bloco da planta (CFTV)', () => {
  const cam = BLOCO('SIMB-01', [CI(0, 0, 0.15), L(-0.15, 0, 0.15, 0)]);
  const e = [];
  // planta com paredes, nomes de sala e 3 câmeras (bloco SIMB-01 — o nome não diz nada)
  e.push(...RET(0, 0, 10, 8, 'ARQ-PAREDE'), ...RET(0.15, 0.15, 9.85, 7.85, 'ARQ-PAREDE'), L(5, 0.15, 5, 7.85, 'ARQ-PAREDE'), L(5.15, 0.15, 5.15, 7.85, 'ARQ-PAREDE'));
  e.push(T('RECEPÇÃO', 2, 4, 0.25, 'ARQ-TEXTO'), T('ESCRITÓRIO', 7, 4, 0.25, 'ARQ-TEXTO'));
  e.push(INS('SIMB-01', 1, 7, 'CFTV-CAMERAS'), INS('SIMB-01', 9, 7, 'CFTV-CAMERAS'), INS('SIMB-01', 9, 1, 'CFTV-CAMERAS'));
  e.push(T('PLANTA BAIXA - CFTV', 3, -1, 0.3, 'TITULOS'));
  // legenda de símbolos ao lado
  e.push(T('LEGENDA:', 14, 8, 0.2, 'LEGENDA-TXT'), INS('SIMB-01', 14.3, 7.55, 'LEGENDA-SIMB'), T('CÂMERA DOME IP 4MP', 14.8, 7.5, 0.12, 'LEGENDA-TXT'));
  e.push(T('NVR 16 CANAIS', 14.8, 7.1, 0.12, 'LEGENDA-TXT'), T('RACK 12U', 14.8, 6.7, 0.12, 'LEGENDA-TXT'));
  const arq = lerArquitetura(dxfR(e, { blocos: [cam] }));
  const o = entenderProjeto(arq, { disciplinas: ['cftv'] });
  assert.strictEqual(o.disciplina, 'cftv');
  const leg = o.legendas.find(l => l.tipo === 'legenda_simbolos');
  assert.ok(leg && leg.itens.some(i => i.bloco === 'SIMB-01' && i.descricao === 'CÂMERA DOME IP 4MP'), JSON.stringify(o.legendas));
  const cams = o.componentes.filter(c => c.fonte === 'legenda_simbolos');
  assert.strictEqual(cams.length, 1);
  assert.deepStrictEqual([cams[0].descricao, cams[0].quantidade, cams[0].posicoes.length], ['CÂMERA DOME IP 4MP', 3, 3]);
});

caso('predial com uma planta só: principal = a planta, arquitetura inteira (sem regressão)', () => {
  const e = [...RET(0, 0, 10, 8, 'ARQ-PAREDE'), ...RET(0.15, 0.15, 9.85, 7.85, 'ARQ-PAREDE'), L(5, 0.15, 5, 7.85, 'ARQ-PAREDE'), L(5.15, 0.15, 5.15, 7.85, 'ARQ-PAREDE')];
  e.push(T('SALA DE ESTAR', 1.5, 4, 0.25, 'ARQ-TEXTO'), T('COZINHA', 6.5, 4, 0.25, 'ARQ-TEXTO'));
  for (let i = 0; i < 4; i++) e.push(...RET(1 + i * 2, 0.2, 1.3 + i * 2, 0.35, 'ELE-TOMADAS'));
  const arq = lerArquitetura(dxfR(e));
  const antes = JSON.stringify(arq.ambientes.map(a => [a.nome, a.area_m2]));
  const o = entenderProjeto(arq, { disciplinas: ['eletrica'] });
  assert.strictEqual(o.disciplina, 'eletrica');
  assert.strictEqual(o.objeto, 'arquitetura');
  assert.strictEqual(o.abrigo, null);
  assert.ok(o.vistas.some(v => v.papel === 'principal'));
  assert.deepStrictEqual(o.vistas.filter(v => v.papel === 'contexto'), []);
  for (const a of arq.ambientes) assert.ok(naVistaPrincipal(o, a.centro), `ambiente ${a.nome} fora da principal`);
  assert.ok(naVistaPrincipal(o, [1.1, 0.3]), 'a tomada da planta vale');
  assert.strictEqual(JSON.stringify(arq.ambientes.map(a => [a.nome, a.area_m2])), antes, 'a leitura da arquitetura não muda');
  // sem vistas (leitura antiga): tudo vale
  assert.strictEqual(naVistaPrincipal({ vistas: [] }, [99, 99]), true);
});

caso('escala da vista: proporção redonda pelas cotas e unidade da cota mais perto de 1', () => {
  const { fatorDaUnidade } = paraTestes;
  assert.deepStrictEqual(fatorDaUnidade(50.4), { fator: 0.5, unidade: 'cm' });
  assert.deepStrictEqual(fatorDaUnidade(1000), { fator: 1, unidade: 'mm' });
  assert.deepStrictEqual(fatorDaUnidade(100.8), { fator: 1, unidade: 'cm' });
  assert.strictEqual(lerBaloes([{ s: '07', x: 0.91, y: 0.95, h: 0.1 }], [{ centro: [1, 1], r: 0.12 }])[0].n, 7);
});

console.log(`teste-objetivo: ${ok} casos ok${process.exitCode ? ' (com falhas)' : ''}`);
