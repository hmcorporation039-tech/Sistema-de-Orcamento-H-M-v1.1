// Versão 2.1 — análise ≠ laudo: finalidade da análise, tipo projeto × laudo
// dos registros por disciplina (regra da migração 2.0-13), pedido de entrega
// do projeto e folha de entrega (HTML escapado). Sem banco.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const PL = require('../src/utils/projetoLaudo');
const { gerarHtmlFolhaEntrega } = require('../src/utils/folhaEntregaTemplate');
const { listarDisciplinas } = require('../src/utils/disciplinasLaudo');

let ok = 0;
const caso = (nome, fn) => { fn(); ok++; };

caso('finalidade da análise: padrão orçamento, inválida = null', () => {
  assert.strictEqual(PL.lerFinalidade(undefined), 'orcamento');
  assert.strictEqual(PL.lerFinalidade(''), 'orcamento');
  assert.strictEqual(PL.lerFinalidade('ELABORACAO'), 'elaboracao');
  assert.strictEqual(PL.lerFinalidade('laudo'), null);
  assert.strictEqual(PL.lerFinalidade(undefined, null), null);
});

caso('tipo do registro: padrão laudo (o "Novo laudo" de sempre)', () => {
  assert.strictEqual(PL.lerTipoRegistro(undefined), 'laudo');
  assert.strictEqual(PL.lerTipoRegistro('projeto'), 'projeto');
  assert.strictEqual(PL.lerTipoRegistro('orcamento'), null);
});

caso('dado de inspeção preenchido', () => {
  assert.strictEqual(PL.temDadosDeInspecao({}), false);
  assert.strictEqual(PL.temDadosDeInspecao({ inspecao: { tipo: 'periodica', checklist: [], ncs: [], fotos: [], documento_n: '' } }), false);
  assert.strictEqual(PL.temDadosDeInspecao({ inspecao: { checklist: [{ cod: 'A1', situacao: 'NV' }] } }), false, 'checklist só NV não conta');
  assert.strictEqual(PL.temDadosDeInspecao({ inspecao: { checklist: [{ cod: 'A1', situacao: 'NC' }] } }), true);
  assert.strictEqual(PL.temDadosDeInspecao({ inspecao: { continuidade: [{ ponto: 'D1' }] } }), true);
  assert.strictEqual(PL.temDadosDeInspecao({ inspecao: { documento_n: 'HM-SPDA-2026-01' } }), true);
});

caso('classificação dos registros existentes (migração 2.0-13)', () => {
  // o SPDA da produção: sem análise, checklist com 7 itens verificados, 5 NCs e 16 medições → laudo
  const spdaProducao = { disciplina: 'spda', analise_id: null, propostas: {},
    dados: { inspecao: { checklist: [{ cod: '1', situacao: 'C' }], ncs: [{}, {}, {}, {}, {}], continuidade: new Array(16).fill({}), documento_n: 'HM-SPDA-2026-EXEMPLO-01' } } };
  assert.strictEqual(PL.classificarExistente(spdaProducao), 'laudo');
  // nasceu de "Calcular pela norma" sem nada de inspeção → projeto
  assert.strictEqual(PL.classificarExistente({ disciplina: 'cabeamento', analise_id: 14, propostas: {}, dados: { inspecao: { checklist: [] } } }), 'projeto');
  // nasceu de análise mas virou inspeção (checklist preenchido) → laudo
  assert.strictEqual(PL.classificarExistente({ disciplina: 'cftv', analise_id: 3, dados: { inspecao: { checklist: [{ situacao: 'C' }] } } }), 'laudo');
  // foto enviada → laudo
  assert.strictEqual(PL.classificarExistente({ disciplina: 'cftv', analise_id: 3, dados: {} }, 2), 'laudo');
  // sem análise, só orçamento de execução → projeto; com orçamento de inspeção → laudo
  assert.strictEqual(PL.classificarExistente({ disciplina: 'solar', propostas: { execucao: 10 }, dados: {} }), 'projeto');
  assert.strictEqual(PL.classificarExistente({ disciplina: 'pressurizacao', propostas: { execucao: 1, automacao: 2 }, dados: {} }), 'projeto');
  assert.strictEqual(PL.classificarExistente({ disciplina: 'solar', propostas: { execucao: 10, inspecao: 11 }, dados: {} }), 'laudo');
  // sem sinal nenhum → laudo (o nome da aba até a 2.0)
  assert.strictEqual(PL.classificarExistente({ disciplina: 'eletrica', propostas: {}, dados: {} }), 'laudo');
});

caso('pedido de entrega: validação, as-built e DXF/QET só onde existem', () => {
  assert.match(PL.lerPedidoEntrega({ itens: [] }).erro, /pelo menos uma/);
  assert.match(PL.lerPedidoEntrega({ itens: ['dwg'] }).erro, /desconhecida/);
  assert.match(PL.lerPedidoEntrega({ itens: ['dxf'] }, { temPlanta: false }).erro, /planta/);
  assert.match(PL.lerPedidoEntrega({ itens: ['qet'] }, { temUnifilar: false }).erro, /unifilar/);
  const p = PL.lerPedidoEntrega({ itens: ['definicoes', 'asbuilt', 'dxf', 'qet', 'pdf'], as_built: { data: '2026-10-27', revisao: 'R02 — As built' } }, { temPlanta: true, temUnifilar: true });
  assert.deepStrictEqual(p.itens, ['definicoes', 'dxf', 'qet', 'pdf']);
  assert.deepStrictEqual(p.asBuilt, { data: '2026-10-27', revisao: 'R02 — As built' });
  // as-built sozinho = definições técnicas marcadas AS BUILT
  const so = PL.lerPedidoEntrega({ itens: ['asbuilt'], as_built: { data: '2026-10-27' } });
  assert.deepStrictEqual(so.itens, ['definicoes']);
  assert.match(PL.lerPedidoEntrega({ itens: ['asbuilt'], as_built: { data: '27/10/2026' } }).erro, /Data do as-built/);
  // o rótulo do DXF diz que não é DWG
  assert.strictEqual(PL.ENTREGAS.find(e => e.chave === 'dxf').rotulo, 'DXF (abre no AutoCAD; DWG não é gerado)');
});

caso('folha de entrega escapa o que vem do formulário', () => {
  const html = gerarHtmlFolhaEntrega({
    disciplina: 'CFTV', titulo: 'Obra <script>', dados: { cliente: { nome: '<img src=x onerror=alert(1)>' } },
    arquivos: [{ nome: 'Memorial.docx', descricao: 'a & b' }], resumo: { indicadores: [{ rotulo: 'Câmeras', valor: '12' }, { rotulo: 'Parecer da inspeção', valor: 'NC' }] },
    asBuilt: { data: '2026-10-27', revisao: 'R01' },
  });
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x'));
  assert.ok(html.includes('AS BUILT'));
  assert.ok(html.includes('Câmeras') && !html.includes('Parecer da inspeção'), 'indicador da inspeção fica fora da entrega do projeto');
});

caso('lista de disciplinas: todo documento e modo de orçamento com uso', () => {
  for (const d of listarDisciplinas().filter(x => x.disponivel)) {
    for (const doc of d.documentos) assert.ok(['projeto', 'laudo', 'ambos'].includes(doc.uso), `${d.chave}/${doc.tipo}`);
    for (const m of d.modosOrcamento) assert.ok(['projeto', 'laudo', 'ambos'].includes(m.uso), `${d.chave}/${m.modo}`);
    assert.strictEqual(typeof d.desenhos.planta, 'boolean');
  }
});

console.log(`projetoLaudo.test.js: ${ok} casos OK`);
