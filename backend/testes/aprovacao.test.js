// Aprovação da proposta por link (versão 2.0, Fase 3I) — utils/aprovacaoLink.js.
// Token (hash), CPF/CNPJ, expiração, uma decisão por link e campos públicos
// sem dados internos. Sem banco e sem rede. Rodar: npm test (pasta backend).
const assert = require('assert');
const A = require('../src/utils/aprovacaoLink');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; } catch (e) { console.error(`FALHOU: ${nome}`); throw e; }
};

caso('token: 32 bytes aleatórios em base64url; no banco só o hash sha-256', () => {
  const vistos = new Set();
  for (let i = 0; i < 200; i++) {
    const t = A.gerarToken();
    assert.strictEqual(t.length, 43);
    assert.match(t, /^[A-Za-z0-9_-]{43}$/);
    assert.strictEqual(Buffer.from(t, 'base64url').length, 32);
    assert.ok(!vistos.has(t), 'token repetido');
    vistos.add(t);
  }
  const t = A.gerarToken();
  const h = A.hashToken(t);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.strictEqual(h, A.hashToken(t), 'hash não é determinístico');
  assert.notStrictEqual(h, A.hashToken(`${t.slice(0, -1)}${t.endsWith('A') ? 'B' : 'A'}`));
  assert.ok(!h.includes(t));
  // vetor conhecido do sha-256
  assert.strictEqual(A.hashToken('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.ok(A.hashesIguais(h, A.hashToken(t)));
  assert.ok(!A.hashesIguais(h, A.hashToken('outro')));
  assert.ok(!A.hashesIguais('', ''));
});

caso('formato do token: lixo nem chega ao banco', () => {
  for (const ruim of [undefined, null, '', 'abc', 'x'.repeat(42), 'x'.repeat(44), `${'a'.repeat(42)}/`, `${'a'.repeat(42)}=`, "' OR 1=1 --", { t: 1 }]) {
    assert.strictEqual(A.formatoTokenValido(ruim), false, String(ruim));
  }
  assert.ok(A.formatoTokenValido(A.gerarToken()));
});

caso('CPF: dígitos verificadores', () => {
  for (const bom of ['529.982.247-25', '52998224725', '111.444.777-35']) assert.ok(A.cpfValido(bom), bom);
  for (const ruim of ['529.982.247-24', '111.111.111-11', '000.000.000-00', '1234567890', '123456789012', '', null]) assert.ok(!A.cpfValido(ruim), String(ruim));
  assert.deepStrictEqual(A.analisarDocumento(' 529.982.247-25 '), { tipo: 'CPF', numero: '52998224725', formatado: '529.982.247-25' });
});

caso('CNPJ: dígitos verificadores (numérico e alfanumérico da Receita)', () => {
  for (const bom of ['11.222.333/0001-81', '04.003.376/0001-00', '11222333000181', '12.ABC.345/01DE-35', '12abc34501de35']) assert.ok(A.cnpjValido(bom), bom);
  for (const ruim of ['11.222.333/0001-80', '00.000.000/0000-00', '11.111.111/1111-11', '12.ABC.345/01DE-34', '12ABC34501DEAB', '1122233300018']) assert.ok(!A.cnpjValido(ruim), ruim);
  assert.deepStrictEqual(A.analisarDocumento('11222333000181'), { tipo: 'CNPJ', numero: '11222333000181', formatado: '11.222.333/0001-81' });
  assert.strictEqual(A.analisarDocumento('123'), null);
  assert.strictEqual(A.formatarDocumento('12ABC34501DE35', 'CNPJ'), '12.ABC.345/01DE-35');
});

caso('validade da proposta e expiração do link', () => {
  assert.strictEqual(A.vencimentoProposta('2026-10-20', 10), '2026-10-30');
  assert.strictEqual(A.vencimentoProposta('2026-12-25', 10), '2027-01-04');
  assert.strictEqual(A.vencimentoProposta('2026-10-20', null), null);
  // 23h50 de Brasília do dia 30 ainda vale; 00h10 do dia 31 já venceu
  assert.ok(!A.propostaVencida('2026-10-20', 10, new Date('2026-10-31T02:50:00Z')));
  assert.ok(A.propostaVencida('2026-10-20', 10, new Date('2026-10-31T03:10:00Z')));
  assert.ok(!A.propostaVencida('2026-10-20', null, new Date('2030-01-01T00:00:00Z')), 'sem validade não vence');

  const agora = new Date('2026-10-25T15:00:00Z');
  // padrão: até 23:59:59 (Brasília) do último dia de validade
  assert.strictEqual(A.calcularExpiracao({ dataIso: '2026-10-20', validade: 10, agora }).toISOString(), '2026-10-31T02:59:59.000Z');
  // sem validade: 30 dias
  assert.strictEqual(A.calcularExpiracao({ dataIso: '2026-10-20', validade: null, agora }).toISOString(), '2026-11-24T15:00:00.000Z');
  // dias informados (1–90) mandam
  assert.strictEqual(A.calcularExpiracao({ dataIso: '2026-10-20', validade: 10, dias: 7, agora }).toISOString(), '2026-11-01T15:00:00.000Z');
  for (const ruim of [0, 91, 2.5, 'abc', -1]) assert.ok(A.calcularExpiracao({ dataIso: '2026-10-20', validade: 10, dias: ruim, agora }).erro, String(ruim));
});

caso('estado do link: revogado, expirado, ativo', () => {
  const agora = new Date('2026-10-25T12:00:00Z');
  assert.strictEqual(A.estadoLink(null, agora), 'inexistente');
  assert.strictEqual(A.estadoLink({ expira_em: '2026-10-26T00:00:00Z', revogado_em: '2026-10-24T00:00:00Z' }, agora), 'revogado');
  assert.strictEqual(A.estadoLink({ expira_em: '2026-10-25T12:00:00Z' }, agora), 'expirado');
  assert.strictEqual(A.estadoLink({ expira_em: '2026-10-25T12:00:01Z' }, agora), 'ativo');
});

caso('decisão: link inválido = mesma resposta; uma só por link; só proposta Ativa e na validade', () => {
  const agora = new Date('2026-10-25T12:00:00Z');
  const ativo = { expira_em: '2026-11-01T00:00:00Z' };
  const prop = { status: 'Ativa', data_iso: '2026-10-20', validade: 10 };

  const inexistente = A.avaliarDecisao({ link: null, proposta: prop, agora });
  const expirado = A.avaliarDecisao({ link: { expira_em: '2026-10-01T00:00:00Z' }, proposta: prop, agora });
  const revogado = A.avaliarDecisao({ link: { ...ativo, revogado_em: '2026-10-24T00:00:00Z' }, proposta: prop, agora });
  // não vaza se o link existe: status, código e texto idênticos
  assert.deepStrictEqual(expirado, inexistente);
  assert.deepStrictEqual(revogado, inexistente);
  assert.strictEqual(inexistente.http, 404);
  assert.strictEqual(inexistente.erro, A.MSG_LINK_INVALIDO);

  const dupla = A.avaliarDecisao({ link: ativo, proposta: prop, decisaoExistente: { id: 1 }, agora });
  assert.strictEqual(dupla.ok, false);
  assert.strictEqual(dupla.codigo, 'JA_DECIDIDA');
  // decisão já registrada tem prioridade sobre "proposta já aprovada"
  assert.strictEqual(A.avaliarDecisao({ link: ativo, proposta: { ...prop, status: 'Aprovada' }, decisaoExistente: { id: 1 }, agora }).codigo, 'JA_DECIDIDA');

  for (const status of ['Aprovada', 'Recusada', 'Cancelada', 'Rascunho']) {
    const r = A.avaliarDecisao({ link: ativo, proposta: { ...prop, status }, agora });
    assert.strictEqual(r.codigo, 'PROPOSTA_INDISPONIVEL', status);
    assert.strictEqual(r.http, 409);
  }
  const vencida = A.avaliarDecisao({ link: ativo, proposta: { ...prop, validade: 3 }, agora });
  assert.strictEqual(vencida.codigo, 'PROPOSTA_VENCIDA');
  assert.match(vencida.erro, /23\/10\/2026/);
  assert.deepStrictEqual(A.avaliarDecisao({ link: ativo, proposta: prop, agora }), { ok: true });
});

caso('formulário público: aprovar exige aceite; CPF/CNPJ com dígito; limites', () => {
  const hash = 'a'.repeat(64);
  const base = { decisao: 'aprovada', nome: '  Maria   da Silva ', documento: '529.982.247-25', aceite: true, hash_conteudo: hash };
  const { dados } = A.validarDecisao(base);
  assert.strictEqual(dados.nome, 'Maria da Silva');
  assert.strictEqual(dados.documento.tipo, 'CPF');
  assert.strictEqual(dados.aceite, true);
  assert.match(A.validarDecisao({ ...base, aceite: false }).erro, /Li e concordo/);
  assert.match(A.validarDecisao({ ...base, aceite: 'true' }).erro, /Li e concordo/, 'aceite precisa ser booleano true');
  assert.ok(A.validarDecisao({ ...base, decisao: 'recusada', aceite: false }).dados, 'recusar não exige aceite');
  assert.match(A.validarDecisao({ ...base, documento: '529.982.247-24' }).erro, /CPF ou CNPJ/);
  assert.match(A.validarDecisao({ ...base, decisao: 'talvez' }).erro, /aprovar ou recusar/);
  assert.ok(A.validarDecisao({ ...base, nome: 'AB' }).erro);
  assert.ok(A.validarDecisao({ ...base, nome: 'x'.repeat(151) }).erro);
  assert.ok(A.validarDecisao({ ...base, email: 'nao-e-email' }).erro);
  assert.ok(A.validarDecisao({ ...base, observacao: 'x'.repeat(2001) }).erro);
  assert.ok(A.validarDecisao({ ...base, hash_conteudo: undefined }).erro, 'sem a versão exibida não decide');
  assert.ok(A.validarDecisao({ ...base, hash_conteudo: 'Z'.repeat(64) }).erro);
  assert.ok(A.validarDecisao({ ...base, documento: '11.222.333/0001-81', email: 'Compras@Cliente.com.br' }).dados.email === 'compras@cliente.com.br');
});

// Linha do banco com tudo o que existe na proposta, inclusive o que é interno
const propostaBanco = {
  id: 77, numero: 'P300', sequencial: 300, data: new Date('2026-10-20T03:00:00Z'), data_iso: '2026-10-20', validade: 10,
  tipo: 'Elétrica', porte: 'Médio', cliente_id: 9, cliente_nome: 'Cliente Teste', responsavel: 'Eng. Fulano',
  local_obra: 'Asa Sul', pagamento: '50% + 50%', observacoes: 'Obs', escopo: 'Escopo',
  bdi: '20.00', imposto_venda: '0', imposto_servico: '5.00', subtotal_materiais: '1000.00', subtotal_mao_obra: '500.00',
  valor_bdi: '300.00', valor_imposto_venda: '0', valor_imposto_servico: '25.00', total: '1825.00',
  status: 'Ativa', usuario_id: 3, obra_id: 12, versao: 4, criado_em: new Date(), atualizado_em: new Date(),
  desconto_materiais_pct: '-5.00', desconto_mao_obra_pct: null, margem_interna: '35', bdi_composicao: { ac: 4 },
};
const secoesBanco = [{ id: 1, nome: 'Materiais', ordem: 0 }, { id: 2, nome: 'Mão de Obra', ordem: 1 }, { id: 3, nome: 'Vazia', ordem: 2 }];
const itensBanco = [
  { id: 10, secao_id: 1, material_id: 55, descricao: 'Cabo 2,5 mm²', codigo: 'SIL-25', quantidade: '100.000', unidade: 'm', valor_unitario: '5.00', valor_total: '500.00', ncm: '85444900', subgrupo: null, status: 'a_cotar', ordem: 0 },
  { id: 11, secao_id: 1, material_id: 56, descricao: 'Disjuntor 20 A', codigo: null, quantidade: '10', unidade: 'un', valor_unitario: '50.00', valor_total: '500.00', ncm: null, subgrupo: 'Quadro', status: 'confirmado', ordem: 1 },
  { id: 12, secao_id: 2, material_id: null, descricao: 'Instalação do QDG', codigo: 'ele_qdg', quantidade: '1', unidade: 'vb', valor_unitario: '500.00', valor_total: '500.00', ncm: null, subgrupo: null, status: 'a_cotar', ordem: 0 },
];

function todasAsChaves(obj, acc = new Set()) {
  if (Array.isArray(obj)) obj.forEach(o => todasAsChaves(o, acc));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) { acc.add(k); todasAsChaves(v, acc); }
  return acc;
}

caso('campos públicos: só o que o PDF do cliente mostra, nada interno', () => {
  const pub = A.montarPropostaPublica(propostaBanco, secoesBanco, itensBanco);
  const permitidas = new Set([
    'numero', 'data', 'validade_dias', 'vence_em', 'cliente_nome', 'local_obra', 'tipo', 'porte', 'responsavel', 'escopo',
    'pagamento', 'observacoes', 'secoes', 'nome', 'itens', 'descricao', 'subgrupo', 'codigo', 'quantidade', 'unidade',
    'valor_unitario', 'valor_total', 'totais', 'subtotal_materiais', 'subtotal_mao_obra', 'imposto_venda_pct',
    'valor_imposto_venda', 'imposto_servico_pct', 'valor_imposto_servico', 'bdi_pct', 'valor_bdi',
    'desconto_materiais_pct', 'desconto_mao_obra_pct', 'total', 'valor_indiretos',
    'bdi_materiais_pct', 'valor_bdi_materiais', 'bdi_mao_obra_pct', 'valor_bdi_mao_obra',
  ]);
  for (const k of todasAsChaves(pub)) assert.ok(permitidas.has(k), `campo não previsto na parte pública: ${k}`);
  const json = JSON.stringify(pub);
  for (const proibido of ['usuario_id', 'obra_id', 'material_id', 'ncm', 'status', 'a_cotar', 'confirmado', 'ele_qdg', 'margem_interna', 'bdi_composicao', 'sequencial', 'versao', '85444900', 'cliente_id']) {
    assert.ok(!json.includes(proibido), `vazou: ${proibido}`);
  }
  assert.strictEqual(pub.secoes.length, 2, 'seção vazia não aparece');
  assert.strictEqual(pub.secoes[0].itens[0].codigo, 'SIL-25', 'código de material continua (como no PDF)');
  assert.strictEqual(pub.secoes[1].itens[0].codigo, null, 'código interno de serviço some (como no PDF)');
  assert.strictEqual(pub.secoes[0].itens[0].quantidade, 100);
  assert.strictEqual(pub.totais.total, 1825);
  assert.strictEqual(pub.totais.bdi_pct, 20);
  assert.strictEqual(pub.totais.valor_imposto_venda, null, 'imposto zerado não aparece');
  assert.strictEqual(pub.totais.desconto_materiais_pct, 5);
  assert.strictEqual(pub.vence_em, '2026-10-30');

  // se a proposta esconder o BDI do cliente, o % some e o valor fecha a conta
  const semBdi = A.montarPropostaPublica({ ...propostaBanco, mostrar_bdi: false }, secoesBanco, itensBanco);
  assert.strictEqual(semBdi.totais.bdi_pct, null);
  assert.strictEqual(semBdi.totais.valor_bdi, null);
  assert.strictEqual(semBdi.totais.valor_indiretos, 300);

  // BDI diferenciado de materiais (Fase 3F): duas linhas que fecham com o valor gravado
  const dif = A.montarPropostaPublica({ ...propostaBanco, bdi_materiais: '10.00', valor_bdi: '200.00', bdi_memoria: { ac: 3 } }, secoesBanco, itensBanco);
  assert.strictEqual(dif.totais.bdi_pct, null);
  assert.strictEqual(dif.totais.valor_bdi_materiais, 100);
  assert.strictEqual(dif.totais.valor_bdi_mao_obra, 100);
  assert.strictEqual(dif.totais.valor_bdi, 200);
  assert.ok(!JSON.stringify(dif).includes('bdi_memoria'), 'memória do cálculo do BDI é interna');
});

caso('hash do conteúdo: prova o que foi aprovado (total + itens)', () => {
  const pub = A.montarPropostaPublica(propostaBanco, secoesBanco, itensBanco);
  const h = A.hashConteudo(pub);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.strictEqual(h, A.hashConteudo(A.montarPropostaPublica(propostaBanco, secoesBanco, itensBanco)));
  // "10" e "10.000" são o mesmo número: mesmo hash
  const itensMesmo = itensBanco.map(it => ({ ...it, quantidade: Number(it.quantidade) }));
  assert.strictEqual(h, A.hashConteudo(A.montarPropostaPublica(propostaBanco, secoesBanco, itensMesmo)));
  // muda o valor de um item, o total, a quantidade ou o pagamento → muda o hash
  const outro = (p, it) => A.hashConteudo(A.montarPropostaPublica(p || propostaBanco, secoesBanco, it || itensBanco));
  assert.notStrictEqual(h, outro(null, itensBanco.map((it, i) => (i === 1 ? { ...it, valor_unitario: '50.01' } : it))));
  assert.notStrictEqual(h, outro(null, itensBanco.map((it, i) => (i === 0 ? { ...it, quantidade: '101' } : it))));
  assert.notStrictEqual(h, outro({ ...propostaBanco, total: '1825.01' }));
  assert.notStrictEqual(h, outro({ ...propostaBanco, pagamento: 'À vista' }));
  // campo interno não muda o hash (não faz parte do que o cliente vê)
  assert.strictEqual(h, outro({ ...propostaBanco, usuario_id: 99, obra_id: null }, itensBanco.map(it => ({ ...it, status: 'confirmado' }))));
});

caso('declaração e comprovante deixam claro: aceite simples, não ICP-Brasil', () => {
  const pub = A.montarPropostaPublica(propostaBanco, secoesBanco, itensBanco);
  const t = A.textoDeclaracao('aprovada', pub);
  assert.match(t, /P300/);
  assert.match(t, /R\$\s?1\.825,00/);
  assert.match(t, /não é assinatura digital com certificado ICP-Brasil/i);
  assert.match(A.textoDeclaracao('recusada', pub), /recuso/);
  assert.strictEqual(A.codigoComprovante(42, 'abcdef0123'), 'AP-000042-ABCDEF01');
  assert.strictEqual(A.ipDoPedido({ ip: '::ffff:192.168.0.10' }), '192.168.0.10');
});

console.log(`aprovacao: ${ok} casos ok`);
