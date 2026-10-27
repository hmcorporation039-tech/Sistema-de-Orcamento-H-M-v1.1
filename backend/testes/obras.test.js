// Regras puras da entidade Obra (utils/obras.js): normalização e agrupamento
// usados pela migração 2.0-04-obras.js e a regra de orçado × realizado.
// Sem banco. Rodar: npm test (pasta backend).
const assert = require('assert');
const O = require('../src/utils/obras');

let ok = 0;
const caso = (nome, fn) => { fn(); ok++; };

caso('normalizarTexto tira acento, caixa e pontuação', () => {
  assert.strictEqual(O.normalizarTexto('  Hospital Santa Lúcia - Sobradinho/DF '), 'hospital santa lucia sobradinho df');
  assert.strictEqual(O.normalizarTexto('CRH - CLÍNICA DO RIM'), O.normalizarTexto('crh – clinica do rim'));
  assert.strictEqual(O.normalizarTexto(null), '');
});

caso('código OB-AAAA-NNN sequencial por ano', () => {
  assert.strictEqual(O.formatarCodigo(2026, 7), 'OB-2026-007');
  assert.strictEqual(O.proximoSequencial(['OB-2026-001', 'OB-2026-012', 'OB-2025-099', 'lixo'], 2026), 13);
  assert.strictEqual(O.proximoSequencial(['OB-2025-099'], 2026), 1);
  assert.strictEqual(O.formatarCodigo(2026, 1000), 'OB-2026-1000');
});

caso('nome da obra criada a partir da análise', () => {
  assert.strictEqual(O.nomeObraDaAnalise({ id: 1, nome_projeto: 'Clínica X', cliente_nome: 'Y' }), 'Clínica X');
  assert.match(O.nomeObraDaAnalise({ id: 2, cliente_nome: 'CRH', criado_em: '2026-09-13T15:52:07Z' }), /^CRH — 13\/09\/2026$/);
  assert.strictEqual(O.nomeObraDaAnalise({ id: 3, pasta: 'TRANE-PA-BR' }), 'TRANE-PA-BR');
  assert.strictEqual(O.nomeObraDaAnalise({ id: 4, arquivos_analisados: [{ nomeArquivo: 'planta.pdf' }] }), 'planta');
  assert.strictEqual(O.nomeObraDaAnalise({ id: 5 }), 'Projeto 5');
});

caso('propostas soltas: mesmo local + mesmo cliente = mesma obra; sem local = uma por proposta', () => {
  const props = [
    { id: 79, numero: 'P209', cliente_id: 24, cliente_nome: 'Hospital Santa Lucia S/A', local_obra: 'Hospital Santa Lúcia Sul' },
    { id: 78, numero: 'P208', cliente_id: 24, cliente_nome: 'Hospital Santa Lucia S/A', local_obra: 'hospital santa lucia sul ' },
    { id: 90, numero: 'P220', cliente_id: 99, cliente_nome: 'Outro', local_obra: 'Hospital Santa Lúcia Sul' }, // outro cliente
    { id: 112, numero: 'P240', cliente_id: 71, cliente_nome: 'Principal', local_obra: '' },
    { id: 113, numero: 'P241', cliente_id: 71, cliente_nome: 'Principal', local_obra: null },
    { id: 120, numero: 'P250', cliente_id: null, cliente_nome: 'Avulso ', local_obra: 'Asa Sul' },
    { id: 121, numero: 'P251', cliente_id: null, cliente_nome: 'avulso', local_obra: 'Asa  Sul' },
  ];
  const grupos = O.agruparPropostasSoltas(props);
  assert.deepStrictEqual(grupos.map(g => g.propostas.map(p => p.id)), [[78, 79], [90], [112], [113], [120, 121]]);
  assert.strictEqual(O.chavePropostaSolta({ local_obra: '  ' }), null);
  assert.strictEqual(O.nomeObraDasPropostas(grupos[0]), 'Hospital Santa Lucia S/A — hospital santa lucia sul');
  assert.strictEqual(O.nomeObraDasPropostas(grupos[2]), 'Principal — P240');
  // local que já cita o cliente fica só com o local
  assert.strictEqual(O.nomeObraDasPropostas({ propostas: [{ id: 1, cliente_nome: 'Ingrid', local_obra: 'Casa da Ingrid - Águas Claras' }] }), 'Casa da Ingrid - Águas Claras');
});

caso('status inicial: aprovada → contratada, senão orçamento', () => {
  assert.strictEqual(O.deduzirStatus(['Ativa', 'Aprovada']), 'contratada');
  assert.strictEqual(O.deduzirStatus(['Ativa', 'Recusada']), 'orcamento');
  assert.strictEqual(O.deduzirStatus([]), 'orcamento');
});

caso('contrato → obra pelo local (igual, contido, empate decide pela contratada, ambíguo fica sem)', () => {
  const obras = [
    { id: 1, nome: 'Hospital Santa Lucia Sobradinho — Sobradinho - DF', local: 'Sobradinho - DF', status: 'contratada' },
    { id: 2, nome: 'Hospital Santa Lucia S/A — Hospital Santa Lúcia Sobradinho - DF', local: 'Hospital Santa Lúcia Sobradinho - DF', status: 'orcamento' },
    { id: 3, nome: 'Rebeca — Lago Sul QI 29', local: 'Lago Sul QI 29 conjunto 06 casa 20', status: 'contratada' },
    { id: 4, nome: 'Galpão Norte', local: 'Galpão Norte', status: 'orcamento' },
    { id: 5, nome: 'Galpão Norte Anexo', local: null, status: 'orcamento' },
  ];
  assert.strictEqual(O.escolherObraParaContrato('Santa Lúcia Sobradinho', obras), 1); // as duas contêm; vale a contratada
  assert.strictEqual(O.escolherObraParaContrato('Hospital Santa Lucia Sobradinho', obras), 1);
  assert.strictEqual(O.escolherObraParaContrato('lago sul qi 29 conjunto 06 casa 20', obras), 3); // igual ao local
  assert.strictEqual(O.escolherObraParaContrato('Galpão Norte', obras), 4); // igual vence contido
  assert.strictEqual(O.escolherObraParaContrato('Hospital Santa Lucia Sobrdinho', obras), null); // erro de digitação: sem obra
  assert.strictEqual(O.escolherObraParaContrato('DF', obras), null); // curto demais para "contido"
  assert.strictEqual(O.escolherObraParaContrato('', obras), null);
  // empate sem nenhuma contratada → ambíguo, fica sem obra
  assert.strictEqual(O.escolherObraParaContrato('Casa Azul', [{ id: 8, nome: 'Casa Azul Bloco A', status: 'orcamento' }, { id: 9, nome: 'Casa Azul Bloco B', status: 'orcamento' }]), null);
});

caso('laudo antigo → análise de origem por título + cliente, a mais recente anterior ao laudo', () => {
  const analises = [
    { id: 11, nome_projeto: null, cliente_nome: 'CRH - CLINICA', criado_em: '2026-09-13T10:00:00Z', obra_id: 100 },
    { id: 14, nome_projeto: null, cliente_nome: 'CRH - Clínica', criado_em: '2026-09-13T19:00:00Z', obra_id: 101 },
    { id: 20, nome_projeto: 'Prédio B', cliente_nome: 'ACME', criado_em: '2026-10-01T10:00:00Z', obra_id: 102 },
  ];
  assert.strictEqual(O.analiseDeOrigemDoLaudo({ titulo: 'CRH - CLÍNICA', cliente_nome: 'crh clinica', criado_em: '2026-09-20T00:00:00Z' }, analises).id, 14);
  assert.strictEqual(O.analiseDeOrigemDoLaudo({ titulo: 'Prédio B', cliente_nome: 'ACME', criado_em: '2026-10-02T00:00:00Z' }, analises).id, 20);
  assert.strictEqual(O.analiseDeOrigemDoLaudo({ titulo: 'Prédio B', cliente_nome: 'Outro', criado_em: '2026-10-02T00:00:00Z' }, analises), null); // cliente diferente
  assert.strictEqual(O.analiseDeOrigemDoLaudo({ titulo: 'Prédio B', cliente_nome: 'ACME', criado_em: '2026-09-01T00:00:00Z' }, analises), null); // laudo antes da análise
  assert.strictEqual(O.analiseDeOrigemDoLaudo({ titulo: 'Hospital Exemplo', cliente_nome: 'X' }, analises), null);
});

caso('orçado: soma das aprovadas; sem aprovada, a última ativa; recusada/cancelada nunca', () => {
  const r1 = O.calcularOrcado([
    { id: 1, status: 'Aprovada', total: '1000.10', data: '2026-01-01' },
    { id: 2, status: 'Aprovada', total: 500, data: '2026-02-01' },
    { id: 3, status: 'Ativa', total: 99999, data: '2026-03-01' },
    { id: 4, status: 'Recusada', total: 7777, data: '2026-03-01' },
  ]);
  assert.deepStrictEqual(r1, { valor: 1500.1, base: 'aprovadas', propostas: [1, 2] });
  const r2 = O.calcularOrcado([
    { id: 5, status: 'Ativa', total: 300, data: '2026-01-10' },
    { id: 6, status: 'Ativa', total: 200, data: '2026-02-10' }, // mais recente
    { id: 7, status: 'Cancelada', total: 900, data: '2026-03-10' },
  ]);
  assert.deepStrictEqual(r2, { valor: 200, base: 'ultima_ativa', propostas: [6] });
  // mesma data: maior id
  assert.strictEqual(O.calcularOrcado([{ id: 8, status: 'Ativa', total: 1, data: '2026-01-01' }, { id: 9, status: 'Ativa', total: 2, data: '2026-01-01' }]).valor, 2);
  assert.deepStrictEqual(O.calcularOrcado([{ id: 10, status: 'Recusada', total: 5 }]), { valor: 0, base: 'nenhuma', propostas: [] });
});

caso('resumo: realizado = despesas (realizado), recebido = entradas, margem sobre o orçado', () => {
  const r = O.resumoFinanceiro({
    propostas: [{ id: 1, status: 'Aprovada', total: 10000 }],
    movimentos: [{ tipo: 'realizado', valor: '2500.50' }, { tipo: 'realizado', valor: 1499.5 }, { tipo: 'recebido', valor: 6000 }],
    contratos: [{ valor: '3000' }, { valor: 500 }],
  });
  assert.strictEqual(r.orcado, 10000);
  assert.strictEqual(r.realizado, 4000);
  assert.strictEqual(r.recebido, 6000);
  assert.strictEqual(r.contratado, 3500);
  assert.strictEqual(r.margem, 6000);
  assert.strictEqual(r.margem_pct, 60);
  assert.strictEqual(r.a_receber, 4000);
  const vazio = O.resumoFinanceiro({});
  assert.strictEqual(vazio.margem_pct, null);
  assert.strictEqual(vazio.orcado_base, 'nenhuma');
});

caso('obra_id no pedido: ausente mantém, null desliga, inteiro liga, lixo é erro', () => {
  assert.deepStrictEqual(O.lerObraId({}), { presente: false, valor: null });
  assert.deepStrictEqual(O.lerObraId({ obra_id: null }), { presente: true, valor: null });
  assert.deepStrictEqual(O.lerObraId({ obra_id: '' }), { presente: true, valor: null });
  assert.deepStrictEqual(O.lerObraId({ obra_id: '12' }), { presente: true, valor: 12 });
  assert.deepStrictEqual(O.lerObraId({ obraId: 7 }), { presente: true, valor: 7 });
  assert.ok(O.lerObraId({ obra_id: 'abc' }).erro);
  assert.ok(O.lerObraId({ obra_id: -1 }).erro);
  assert.ok(O.lerObraId({ obra_id: 1.5 }).erro);
});

console.log(`obras.test.js: ${ok} casos ok`);
