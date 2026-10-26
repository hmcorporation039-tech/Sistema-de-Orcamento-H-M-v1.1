// Ordens de serviço de campo (versão 2.0, Fase 4J) — utils/campo.js e o HTML
// do PDF (utils/osPdfTemplate.js). Regras de transição, conflito por
// feita_em, idempotência de item extra, validação de imagem pelos bytes,
// número da OS e quem vê. Sem banco e sem rede. Rodar: npm test (pasta backend).
const assert = require('assert');
const C = require('../src/utils/campo');
const { gerarHtmlOS } = require('../src/utils/osPdfTemplate');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; } catch (e) { console.error(`FALHOU: ${nome}`); throw e; }
};

// PNG 1×1 válido e cabeçalhos mínimos de JPEG/WebP
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]), Buffer.from('JFIF\0'), Buffer.alloc(20)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(20)]);

const AGORA = new Date('2026-11-03T15:00:00Z');
const base = (extra = {}) => ({
  status: 'aberta', iniciada_em: null, concluida_em: null,
  checklist: C.checklistDoModelo(C.MODELO_GENERICO.itens), historico: [],
  observacao_final: '', observacao_em: null, assinatura: null,
  inicio_lat: null, inicio_lon: null, conclusao_lat: null, conclusao_lon: null, ...extra,
});
const op = (tipo, dados = {}, feita_em = '2026-11-03T14:00:00Z') => ({ tipo, dados, feita_em });
const aplicar = (estado, o) => C.aplicarOperacao(estado, o, { agora: AGORA, usuario_id: 5 });

caso('número da OS: OS-AAAA-NNNN sequencial por ano', () => {
  assert.strictEqual(C.formatarNumeroOS(2026, 7), 'OS-2026-0007');
  assert.strictEqual(C.formatarNumeroOS(2026, 10000), 'OS-2026-10000');
  assert.strictEqual(C.proximoNumeroOS([], 2026), 1);
  assert.strictEqual(C.proximoNumeroOS(['OS-2026-0001', 'OS-2026-0009', 'OS-2025-0050', 'lixo', null], 2026), 10);
  assert.strictEqual(C.proximoNumeroOS(['OS-2025-0050'], 2026), 1, 'cada ano recomeça');
  assert.strictEqual(C.proximoNumeroOS(['OS-2026-9999'], 2026), 10000);
});

caso('imagem pelos bytes: JPEG, PNG e WebP; o resto é recusado', () => {
  assert.strictEqual(C.tipoImagem(JPEG), 'image/jpeg');
  assert.strictEqual(C.tipoImagem(PNG), 'image/png');
  assert.strictEqual(C.tipoImagem(WEBP), 'image/webp');
  assert.strictEqual(C.tipoImagem(Buffer.from('GIF89a' + 'x'.repeat(20))), null);
  assert.strictEqual(C.tipoImagem(Buffer.from('<html><script>alert(1)</script></html>')), null);
  assert.strictEqual(C.tipoImagem(Buffer.from('%PDF-1.7 xxxxxxxxxxxx')), null);
  assert.strictEqual(C.tipoImagem(Buffer.from('RIFF\0\0\0\0WAVEfmt xxxxxxxx')), null, 'RIFF que não é WebP');
  assert.strictEqual(C.tipoImagem(Buffer.alloc(3)), null);
  assert.strictEqual(C.tipoImagem('não é buffer'), null);
  assert.ok(C.ehPng(PNG));
  assert.ok(!C.ehPng(Buffer.concat([PNG.subarray(0, 8), Buffer.alloc(20)])), 'assinatura PNG sem IHDR');
  assert.deepStrictEqual(C.EXTENSAO, { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' });
});

caso('assinatura em base64: PNG até 300 KB, com ou sem prefixo data:', () => {
  assert.ok(C.decodificarPngBase64(PNG.toString('base64')).buffer.equals(PNG));
  assert.ok(C.decodificarPngBase64(`data:image/png;base64,${PNG.toString('base64')}`).buffer.equals(PNG));
  assert.match(C.decodificarPngBase64(JPEG.toString('base64')).erro, /PNG/);
  assert.match(C.decodificarPngBase64('').erro, /vazia/);
  assert.match(C.decodificarPngBase64('@@@').erro, /PNG/);
  const grande = Buffer.concat([PNG, Buffer.alloc(301 * 1024)]);
  assert.match(C.decodificarPngBase64(grande.toString('base64')).erro, /300 KB/);
  const noLimite = Buffer.concat([PNG, Buffer.alloc(300 * 1024 - PNG.length)]);
  assert.ok(C.decodificarPngBase64(noLimite.toString('base64')).buffer, 'exatamente 300 KB passa');
});

caso('uuid: formato RFC 4122 (o do aparelho); lixo e injeção recusados', () => {
  assert.ok(C.uuidValido('8f0c2a9e-1b2c-4d3e-8f40-123456789abc'));
  assert.ok(C.uuidValido('8F0C2A9E-1B2C-4D3E-8F40-123456789ABC'));
  for (const ruim of ['', null, undefined, 42, '8f0c2a9e-1b2c-4d3e-8f40-123456789ab', "8f0c2a9e-1b2c-4d3e-8f40-123456789abc' OR 1=1", '../../x', '00000000-0000-0000-0000-000000000000']) {
    assert.ok(!C.uuidValido(ruim), String(ruim));
  }
});

caso('checklistBase das skills → { id, grupo, texto }; ids repetidos/inválidos ganham id seguro', () => {
  const n = C.normalizarChecklistBase([
    { cod: 'D1', secao: 'Documentação', item: 'Projeto as built', requisito: 'NBR' },
    { cod: 'D1', secao: 'Documentação', item: 'Repetido' },
    { cod: '../x', secao: '', item: 'Id ruim' },
    { cod: 'x-1', item: 'Prefixo reservado aos extras' },
    { id: 'c9', grupo: 'Câmeras', texto: 'Já no formato' },
    { cod: 'Z', item: '' }, null, 'lixo',
  ]);
  assert.deepStrictEqual(n.map(i => i.id), ['D1', 'i2', 'i3', 'i4', 'c9']);
  assert.deepStrictEqual(n[0], { id: 'D1', grupo: 'Documentação', texto: 'Projeto as built' });
  assert.strictEqual(n[2].grupo, 'Geral');
  assert.deepStrictEqual(C.normalizarChecklistBase(undefined), []);
  const ck = C.checklistDoModelo(C.MODELO_GENERICO.itens);
  assert.strictEqual(ck.length, 7);
  assert.deepStrictEqual(ck[0], { id: 'g1', grupo: 'Chegada e segurança', texto: C.MODELO_GENERICO.itens[0].texto, resposta: null, observacao: '', respondido_em: null, respondido_por: null });
  const textos = C.MODELO_GENERICO.itens.map(i => i.texto.toLowerCase()).join(' | ');
  for (const t of ['chegada', 'epi', 'apr', 'bloquead', 'conforme projeto', 'teste de funcionamento', 'limp', 'orientado']) assert.ok(textos.includes(t), t);
});

caso('chave do modelo: ausente → disciplina ou genérico; vazio → sem checklist', () => {
  assert.strictEqual(C.chaveModelo(undefined, 'cftv'), 'cftv');
  assert.strictEqual(C.chaveModelo(undefined, null), 'generico');
  assert.strictEqual(C.chaveModelo('', 'cftv'), null);
  assert.strictEqual(C.chaveModelo('nenhum', null), null);
  assert.strictEqual(C.chaveModelo('spda', null), 'spda');
});

caso('dados da OS: validação e edição parcial', () => {
  const disciplinas = ['cftv', 'spda'];
  assert.match(C.validarDadosOS({}, {}, { disciplinas }).erro, /título/);
  assert.match(C.validarDadosOS({ titulo: 'x', tipo: 'festa' }, {}, { disciplinas }).erro, /Tipo/);
  assert.match(C.validarDadosOS({ titulo: 'x', disciplina: 'nuclear' }, {}, { disciplinas }).erro, /Disciplina/);
  assert.match(C.validarDadosOS({ titulo: 'x', agendada_para: '03/11/2026' }, {}, { disciplinas }).erro, /Data/);
  assert.match(C.validarDadosOS({ titulo: 'x', responsavel_id: 'abc' }, {}, { disciplinas }).erro, /Responsável/);
  const { dados } = C.validarDadosOS({ titulo: '  Instalar câmeras  ', tipo: 'instalacao', disciplina: 'cftv', responsavel_id: '3', agendada_para: '2026-11-03' }, {}, { disciplinas });
  assert.deepStrictEqual(dados, { titulo: 'Instalar câmeras', descricao: null, tipo: 'instalacao', disciplina: 'cftv', responsavel_id: 3, agendada_para: '2026-11-03' });
  const atual = { titulo: 'Antigo', descricao: 'd', tipo: 'visita', disciplina: 'spda', responsavel_id: 4, agendada_para: '2026-12-01' };
  const p = C.validarDadosOS({ titulo: 'Novo', responsavel_id: null }, atual, { disciplinas }).dados;
  assert.deepStrictEqual(p, { ...atual, titulo: 'Novo', responsavel_id: null });
  assert.strictEqual(C.validarDadosOS({ titulo: 'x'.repeat(500) }, {}, { disciplinas }).dados.titulo.length, 200);
});

caso('quem vê e quem edita', () => {
  const admin = { id: 1, role: 'admin' };
  const tec = { id: 5, role: 'user' };
  const outro = { id: 9, role: 'user' };
  const os = { responsavel_id: 5 };
  assert.ok(C.podeVerOS(admin, { responsavel_id: 2 }, { usuario_id: 2 }));
  assert.ok(C.podeVerOS(tec, os, { usuario_id: 2 }), 'responsável vê');
  assert.ok(C.podeVerOS(outro, { responsavel_id: 5 }, { usuario_id: 9 }), 'dono da obra vê');
  assert.ok(!C.podeVerOS(outro, os, { usuario_id: 2 }), 'nem responsável nem dono: não vê');
  assert.ok(C.podeVerOS(outro, os, { usuario_id: null }), 'obra sem dono: livre (mesma posse das rotas de obra)');
  assert.ok(!C.podeVerOS(null, os, { usuario_id: null }));
  assert.ok(!C.podeEditarOS(tec, { usuario_id: 2 }), 'responsável opera pelo app, mas não edita pelo escritório');
  assert.ok(C.podeEditarOS(outro, { usuario_id: 9 }));
  assert.ok(C.podeEditarOS(admin, { usuario_id: 2 }));
});

caso('transições: iniciar só de aberta; concluir de em_execucao ou de aberta (inicia e conclui)', () => {
  const r1 = aplicar(base(), op('iniciar', { lat: -15.83, lon: -48.05 }, '2026-11-03T13:00:00Z'));
  assert.ok(r1.ok);
  assert.strictEqual(r1.estado.status, 'em_execucao');
  assert.strictEqual(r1.estado.iniciada_em, '2026-11-03T13:00:00.000Z');
  assert.strictEqual(r1.estado.inicio_lat, -15.83);
  const r2 = aplicar(r1.estado, op('iniciar'));
  assert.ok(!r2.ok);
  assert.match(r2.erro, /já foi iniciada/);
  const r3 = aplicar(r1.estado, op('concluir', { lat: 'x', lon: 999 }, '2026-11-03T14:30:00Z'));
  assert.ok(r3.ok);
  assert.strictEqual(r3.estado.status, 'concluida');
  assert.strictEqual(r3.estado.concluida_em, '2026-11-03T14:30:00.000Z');
  assert.strictEqual(r3.estado.conclusao_lat, null, 'coordenada inválida vira null');
  assert.strictEqual(r3.estado.conclusao_lon, null);
  const r4 = aplicar(base(), op('concluir', {}, '2026-11-03T14:00:00Z'));
  assert.ok(r4.ok);
  assert.strictEqual(r4.estado.status, 'concluida');
  assert.strictEqual(r4.estado.iniciada_em, r4.estado.concluida_em, 'concluída de aberta: inicia e conclui');
  // relógio de outro aparelho atrasado: conclusão não fica antes do início
  const r5 = aplicar(r1.estado, op('concluir', {}, '2026-11-03T12:00:00Z'));
  assert.strictEqual(r5.estado.concluida_em, r1.estado.iniciada_em);
});

caso('OS cancelada não muda; concluída só recebe assinatura (e fotos) por 7 dias', () => {
  const cancelada = base({ status: 'cancelada' });
  for (const t of ['iniciar', 'responder', 'item_extra', 'observacao', 'assinar', 'concluir']) {
    const r = aplicar(cancelada, op(t, { item_id: 'g1', resposta: 'conforme', texto: 'x', nome: 'Fulano', png_base64: PNG.toString('base64') }));
    assert.ok(!r.ok, t);
    assert.match(r.erro, /cancelada/);
  }
  assert.match(C.conferirFoto(cancelada, AGORA), /cancelada/);
  const concluida = base({ status: 'concluida', iniciada_em: '2026-11-01T10:00:00Z', concluida_em: '2026-11-01T12:00:00Z' });
  for (const t of ['iniciar', 'responder', 'item_extra', 'observacao', 'concluir']) {
    const r = aplicar(concluida, op(t, { item_id: 'g1', resposta: 'conforme', texto: 'x', lat: 1 }));
    assert.ok(!r.ok, t);
    assert.match(r.erro, /concluída/);
  }
  const assin = aplicar(concluida, op('assinar', { nome: 'Cliente', png_base64: PNG.toString('base64') }));
  assert.ok(assin.ok, 'assinatura atrasada em OS concluída há 2 dias');
  assert.strictEqual(C.conferirFoto(concluida, AGORA), null);
  const antiga = base({ status: 'concluida', iniciada_em: '2026-10-01T10:00:00Z', concluida_em: '2026-10-20T12:00:00Z' });
  assert.match(aplicar(antiga, op('assinar', { nome: 'Cliente', png_base64: PNG.toString('base64') })).erro, /7 dias/);
  assert.match(C.conferirFoto(antiga, AGORA), /7 dias/);
});

caso('responder: valida item e resposta; não altera o estado original', () => {
  const e = base();
  const copia = JSON.stringify(e);
  const r = aplicar(e, op('responder', { item_id: 'g4', resposta: 'nao_conforme', observacao: '  Falta eletroduto  ' }));
  assert.ok(r.ok);
  assert.strictEqual(JSON.stringify(e), copia, 'estado original intacto');
  const item = r.estado.checklist.find(i => i.id === 'g4');
  assert.deepStrictEqual([item.resposta, item.observacao, item.respondido_por], ['nao_conforme', 'Falta eletroduto', 5]);
  assert.strictEqual(r.estado.historico.length, 0, 'primeira resposta não gera histórico');
  assert.match(aplicar(e, op('responder', { item_id: 'nada', resposta: 'conforme' })).erro, /não encontrado/);
  assert.match(aplicar(e, op('responder', { item_id: 'g1', resposta: 'talvez' })).erro, /Resposta inválida/);
  const limpar = aplicar(r.estado, op('responder', { item_id: 'g4', resposta: null }, '2026-11-03T14:05:00Z'));
  assert.strictEqual(limpar.estado.checklist.find(i => i.id === 'g4').resposta, null, 'resposta null limpa');
});

caso('conflito: vale o feita_em mais recente; o outro vai para o histórico', () => {
  const r1 = aplicar(base(), op('responder', { item_id: 'g1', resposta: 'conforme', observacao: 'aparelho A' }, '2026-11-03T14:10:00Z'));
  // aparelho B respondeu ANTES (14:05) mas sincronizou depois: não sobrescreve
  const r2 = aplicar(r1.estado, op('responder', { item_id: 'g1', resposta: 'nao_conforme', observacao: 'aparelho B' }, '2026-11-03T14:05:00Z'));
  assert.ok(r2.ok);
  const g1 = r2.estado.checklist.find(i => i.id === 'g1');
  assert.deepStrictEqual([g1.resposta, g1.observacao], ['conforme', 'aparelho A']);
  assert.strictEqual(r2.estado.historico.length, 1);
  assert.deepStrictEqual([r2.estado.historico[0].resposta, r2.estado.historico[0].observacao, r2.estado.historico[0].motivo], ['nao_conforme', 'aparelho B', 'mais_antiga']);
  // resposta mais nova (14:20): substitui e a anterior vai para o histórico
  const r3 = aplicar(r2.estado, op('responder', { item_id: 'g1', resposta: 'na', observacao: 'revisto' }, '2026-11-03T14:20:00Z'));
  const g1b = r3.estado.checklist.find(i => i.id === 'g1');
  assert.deepStrictEqual([g1b.resposta, g1b.observacao], ['na', 'revisto']);
  assert.strictEqual(r3.estado.historico.length, 2);
  assert.deepStrictEqual([r3.estado.historico[1].resposta, r3.estado.historico[1].observacao, r3.estado.historico[1].motivo], ['conforme', 'aparelho A', 'nova_resposta']);
});

caso('feita_em: inválido ou adiantado demais → hora do servidor', () => {
  assert.strictEqual(C.instanteDoAparelho('lixo', AGORA), AGORA.toISOString());
  assert.strictEqual(C.instanteDoAparelho(null, AGORA), AGORA.toISOString());
  assert.strictEqual(C.instanteDoAparelho('2026-11-04T15:00:00Z', AGORA), AGORA.toISOString(), 'relógio um dia adiantado');
  assert.strictEqual(C.instanteDoAparelho('2026-11-03T15:03:00Z', AGORA), '2026-11-03T15:03:00.000Z', 'até 5 min adiantado vale');
  assert.strictEqual(C.instanteDoAparelho('2026-11-03T11:00:00-03:00', AGORA), '2026-11-03T14:00:00.000Z', 'fuso do aparelho');
  assert.strictEqual(C.instanteDoAparelho('1999-01-01T00:00:00Z', AGORA), AGORA.toISOString());
});

caso('item extra: id "x-…", idempotente com o mesmo texto, recusa id repetido com outro texto', () => {
  const r1 = aplicar(base(), op('item_extra', { item_id: 'x-8f0c2a9e', grupo: '', texto: 'Caixa de passagem extra' }));
  assert.ok(r1.ok);
  const item = r1.estado.checklist.at(-1);
  assert.deepStrictEqual([item.id, item.grupo, item.texto, item.extra, item.resposta], ['x-8f0c2a9e', 'Extras', 'Caixa de passagem extra', true, null]);
  const r2 = aplicar(r1.estado, op('item_extra', { item_id: 'x-8f0c2a9e', texto: 'Caixa de passagem extra' }));
  assert.ok(r2.ok);
  assert.strictEqual(r2.mudou, false);
  assert.strictEqual(r2.estado.checklist.length, r1.estado.checklist.length);
  assert.match(aplicar(r1.estado, op('item_extra', { item_id: 'x-8f0c2a9e', texto: 'Outro' })).erro, /Já existe/);
  assert.match(aplicar(base(), op('item_extra', { item_id: 'g1', texto: 'x' })).erro, /x-/);
  assert.match(aplicar(base(), op('item_extra', { item_id: 'x-ok', texto: '  ' })).erro, /texto/);
  const resp = aplicar(r1.estado, op('responder', { item_id: 'x-8f0c2a9e', resposta: 'conforme' }));
  assert.ok(resp.ok, 'item extra pode ser respondido');
});

caso('observação final e assinatura: a mais recente vale; a anterior fica no histórico', () => {
  const o1 = aplicar(base(), op('observacao', { texto: 'Tudo certo' }, '2026-11-03T14:10:00Z'));
  const o2 = aplicar(o1.estado, op('observacao', { texto: 'Versão velha' }, '2026-11-03T14:00:00Z'));
  assert.strictEqual(o2.estado.observacao_final, 'Tudo certo');
  assert.strictEqual(o2.estado.historico[0].texto, 'Versão velha');
  const o3 = aplicar(o2.estado, op('observacao', { texto: 'Final' }, '2026-11-03T14:20:00Z'));
  assert.strictEqual(o3.estado.observacao_final, 'Final');
  assert.strictEqual(o3.estado.historico.at(-1).texto, 'Tudo certo');

  const a1 = aplicar(base(), op('assinar', { nome: '  Maria Souza ', documento: '529.982.247-25', png_base64: PNG.toString('base64') }, '2026-11-03T14:30:00Z'));
  assert.ok(a1.ok);
  assert.deepStrictEqual([a1.estado.assinatura.nome, a1.estado.assinatura.documento, a1.estado.assinatura.assinada_em], ['Maria Souza', '529.982.247-25', '2026-11-03T14:30:00.000Z']);
  assert.ok(a1.efeitos.assinaturaPng.equals(PNG), 'PNG decodificado para quem grava');
  assert.match(aplicar(base(), op('assinar', { nome: '', png_base64: PNG.toString('base64') })).erro, /nome/);
  assert.match(aplicar(base(), op('assinar', { nome: 'X', png_base64: JPEG.toString('base64') })).erro, /PNG/);
  const a2 = aplicar({ ...a1.estado, assinatura: { ...a1.estado.assinatura, arquivo: 'Campo/OS-2026-0001/assinatura-a.png' } },
    op('assinar', { nome: 'João', png_base64: PNG.toString('base64') }, '2026-11-03T14:40:00Z'));
  assert.strictEqual(a2.estado.assinatura.nome, 'João');
  assert.strictEqual(a2.estado.historico.at(-1).arquivo, 'Campo/OS-2026-0001/assinatura-a.png', 'arquivo anterior registrado');
});

caso('tipo de operação desconhecido ou criar_os (é do controller) → recusa', () => {
  assert.match(aplicar(base(), op('apagar_tudo')).erro, /desconhecido/);
  assert.match(aplicar(base(), op('criar_os')).erro, /desconhecido/);
  assert.match(aplicar(base(), { tipo: 'responder', dados: 'lixo' }).erro, /não encontrado/);
});

caso('dados da foto (multipart)', () => {
  const u = '8f0c2a9e-1b2c-4d3e-8f40-123456789abc';
  assert.match(C.dadosDaFoto({}).erro, /uuid/);
  assert.match(C.dadosDaFoto({ uuid: u, item_id: '../../etc' }).erro, /Item/);
  const { dados } = C.dadosDaFoto({ uuid: u.toUpperCase(), item_id: 'g1', legenda: ' Quadro ', tirada_em: '2026-11-03T14:00:00Z', lat: '-15.8', lon: '-48' }, AGORA);
  assert.deepStrictEqual(dados, { uuid: u, item_id: 'g1', legenda: 'Quadro', tirada_em: '2026-11-03T14:00:00.000Z', lat: -15.8, lon: -48 });
  assert.strictEqual(C.dadosDaFoto({ uuid: u, item_id: 'null' }).dados.item_id, null);
});

caso('objeto da OS para a API (contrato docs/CAMPO-API.md)', () => {
  const row = {
    id: 12, uuid: 'u-os', numero: 'OS-2026-0007', obra_id: 9, obra_codigo: 'OB-2026-009', obra_nome: 'Hospital', obra_cliente_nome: 'Cliente', obra_local: 'Rua 1',
    titulo: 'Instalação', descricao: null, tipo: 'instalacao', disciplina: 'cftv', modelo_checklist: 'cftv', status: 'em_execucao',
    responsavel_id: 3, responsavel_nome: 'Técnico', agendada_para: new Date(2026, 10, 3), iniciada_em: new Date('2026-11-03T13:00:00Z'), concluida_em: null,
    checklist: [{ id: 'c1', grupo: 'Câmeras', texto: 'Fixa', resposta: 'nao_conforme', observacao: 'torta', respondido_em: '2026-11-03T14:02:00.000Z' }, { id: 'x-1', grupo: 'Extras', texto: 'E', resposta: null, extra: true }],
    historico: [{ tipo: 'resposta_substituida' }], observacao_final: null,
    assinatura_nome: 'Maria', assinatura_documento: null, assinada_em: new Date('2026-11-03T15:00:00Z'),
    inicio_lat: '-15.800000', inicio_lon: '-48.000000', conclusao_lat: null, conclusao_lon: null,
    versao: 4, atualizado_em: new Date('2026-11-03T15:00:00Z'), criado_em: new Date('2026-11-01T10:00:00Z'),
  };
  const fotos = [{ uuid: 'f1', item_id: 'c1', legenda: null, tirada_em: new Date('2026-11-03T14:01:00Z'), lat: null, lon: null, tamanho: 100 }, { uuid: 'f2', item_id: null, tirada_em: null, tamanho: 5 }];
  const os = C.osParaApi(row, fotos);
  assert.strictEqual(os.agendada_para, '2026-11-03');
  assert.deepStrictEqual(os.obra, { id: 9, codigo: 'OB-2026-009', nome: 'Hospital', cliente_nome: 'Cliente', endereco: 'Rua 1' });
  assert.deepStrictEqual(os.checklist[0].fotos, ['f1']);
  assert.deepStrictEqual(os.checklist[1].fotos, []);
  assert.strictEqual(os.checklist[1].extra, true);
  assert.deepStrictEqual(os.fotos[0], { uuid: 'f1', item_id: 'c1', legenda: '', tirada_em: '2026-11-03T14:01:00.000Z', lat: null, lon: null, tamanho: 100, enviada: true, url: '/api/campo/fotos/f1' });
  assert.deepStrictEqual(os.assinatura, { nome: 'Maria', documento: '', assinada_em: '2026-11-03T15:00:00.000Z', url: '/api/campo/os/12/assinatura' });
  assert.deepStrictEqual(os.inicio, { lat: -15.8, lon: -48 });
  assert.strictEqual(os.conclusao, null);
  assert.deepStrictEqual(os.resumo, { total: 2, respondidos: 1, conforme: 0, nao_conforme: 1, na: 0 });
  assert.strictEqual(os.historico, undefined, 'histórico só quando pedido');
  assert.strictEqual(C.osParaApi(row, fotos, { historico: true }).historico.length, 1);
  assert.strictEqual(C.osParaApi({ ...row, assinatura_nome: null }, []).assinatura, null);
  for (const k of ['id', 'uuid', 'numero', 'obra_id', 'titulo', 'descricao', 'tipo', 'disciplina', 'status', 'responsavel_id', 'responsavel_nome',
    'agendada_para', 'iniciada_em', 'concluida_em', 'checklist', 'fotos', 'assinatura', 'observacao_final', 'versao', 'atualizado_em']) {
    assert.ok(Object.prototype.hasOwnProperty.call(os, k), `campo do contrato: ${k}`);
  }
});

caso('PDF da OS: tudo escapado, NCs em destaque, foto grande só listada', () => {
  const xss = '<img src=x onerror=alert(1)>';
  const os = C.osParaApi({
    id: 1, uuid: 'u', numero: 'OS-2026-0001', obra_id: 1, obra_codigo: 'OB-1', obra_nome: xss, obra_cliente_nome: xss, obra_local: xss,
    titulo: xss, descricao: `linha1\n${xss}`, tipo: 'vistoria', disciplina: null, status: 'concluida', responsavel_nome: xss,
    checklist: [{ id: 'g1', grupo: xss, texto: xss, resposta: 'nao_conforme', observacao: xss }, { id: 'g2', grupo: 'G', texto: 'ok', resposta: 'conforme' }],
    observacao_final: xss, assinatura_nome: xss, assinatura_documento: xss, assinada_em: new Date(), versao: 1,
  }, [{ uuid: 'f1', item_id: 'g1', legenda: xss, tirada_em: new Date(), tamanho: 10 }, { uuid: 'f2', item_id: null, legenda: 'grande', tamanho: 9e6 }], { historico: true });
  const html = gerarHtmlOS({ os, imagens: new Map([['f1', `data:image/png;base64,${PNG.toString('base64')}`], ['f2', null]]), assinaturaUri: null, emitidoPor: xss });
  assert.ok(!html.includes('<img src=x'), 'nenhum HTML do usuário passa cru');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('Não conformidades (1)'));
  assert.ok(html.includes('grande demais'));
  assert.ok(html.includes(`data:image/png;base64,${PNG.toString('base64')}`));
  assert.ok(html.includes('linha1<br/>'));
});

console.log(`campo.test.js: ${ok} casos OK`);
