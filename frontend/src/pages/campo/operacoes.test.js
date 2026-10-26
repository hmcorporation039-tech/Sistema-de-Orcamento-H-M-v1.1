import {
  aplicarOperacao, montarVisao, conferirConclusao, temAvisosConclusao, classificarOS, agruparChecklist, isoLocal, diaLocal,
} from './operacoes';

const base = () => ({
  id: 1, uuid: 'os-1', numero: 'OS-2026-0001', status: 'aberta', titulo: 'Instalação', agendada_para: '2026-11-03',
  checklist: [
    { id: 'c1', grupo: 'Câmeras', texto: 'Câmera fixa', resposta: null, observacao: '', fotos: [], respondido_em: null },
    { id: 'c2', grupo: 'Câmeras', texto: 'Foco', resposta: null, observacao: '', fotos: [], respondido_em: null },
    { id: 'c3', grupo: 'Rede', texto: 'PoE', resposta: null, observacao: '', fotos: [], respondido_em: null },
  ],
  fotos: [], assinatura: null, observacao_final: '',
});
const op = (tipo, dados, feita_em = '2026-11-03T10:00:00-03:00', extra = {}) => ({ op_uuid: `${tipo}-${feita_em}`, tipo, os_uuid: 'os-1', dados, feita_em, estado: 'pendente', ...extra });

test('iniciar, responder e concluir seguem as regras do contrato', () => {
  let os = aplicarOperacao(base(), op('responder', { item_id: 'c1', resposta: 'conforme' }));
  expect(os.checklist[0].resposta).toBe('conforme'); // aplica mesmo aberta (o servidor decide); visão local
  os = aplicarOperacao(base(), op('iniciar', {}));
  expect(os.status).toBe('em_execucao');
  os = aplicarOperacao(os, op('concluir', {}, '2026-11-03T11:00:00-03:00'));
  expect(os.status).toBe('concluida');
  expect(os.concluida_em).toBe('2026-11-03T11:00:00-03:00');
  // concluída: só assinatura muda
  const depois = aplicarOperacao(os, op('responder', { item_id: 'c2', resposta: 'na' }));
  expect(depois.checklist[1].resposta).toBeNull();
  const assinada = aplicarOperacao(os, op('assinar', { nome: 'Fulano', documento: '1', png_base64: 'AAA' }));
  expect(assinada.assinatura.nome).toBe('Fulano');
  expect(assinada.assinatura.png_local).toBe('data:image/png;base64,AAA');
});

test('concluir direto de aberta inicia e conclui', () => {
  const os = aplicarOperacao(base(), op('concluir', {}, '2026-11-03T12:00:00-03:00'));
  expect(os.status).toBe('concluida');
  expect(os.iniciada_em).toBe('2026-11-03T12:00:00-03:00');
});

test('cancelada não muda', () => {
  const os = { ...base(), status: 'cancelada' };
  expect(aplicarOperacao(os, op('iniciar', {})).status).toBe('cancelada');
});

test('conflito: vale a resposta de feita_em mais recente', () => {
  const os = base();
  os.checklist[0].resposta = 'conforme';
  os.checklist[0].respondido_em = '2026-11-03T15:00:00-03:00';
  const antiga = aplicarOperacao(os, op('responder', { item_id: 'c1', resposta: 'nao_conforme' }, '2026-11-03T14:00:00-03:00'));
  expect(antiga.checklist[0].resposta).toBe('conforme');
  const nova = aplicarOperacao(os, op('responder', { item_id: 'c1', resposta: 'nao_conforme' }, '2026-11-03T16:00:00-03:00'));
  expect(nova.checklist[0].resposta).toBe('nao_conforme');
});

test('item extra entra uma vez só (reaplicar não duplica)', () => {
  const o = op('item_extra', { item_id: 'x-1', grupo: 'Extras', texto: 'Tampa' });
  const os = aplicarOperacao(aplicarOperacao(base(), o), o);
  expect(os.checklist.filter(i => i.id === 'x-1')).toHaveLength(1);
});

test('visão = servidor + operações pendentes + fotos do aparelho; recusada não entra', () => {
  const v = montarVisao({
    servidor: base(),
    ops: [op('iniciar', {}), op('responder', { item_id: 'c3', resposta: 'nao_conforme', observacao: 'sem PoE' }),
      op('observacao', { texto: 'ok' }, '2026-11-03T10:05:00-03:00', { estado: 'recusada', erro: 'x' })],
    fotos: [{ uuid: 'f1', os_uuid: 'os-1', item_id: 'c3', estado: 'pendente', tirada_em: 't' },
      { uuid: 'f2', os_uuid: 'os-1', item_id: null, estado: 'enviada', tirada_em: 't' }],
  });
  expect(v.status).toBe('em_execucao');
  expect(v.checklist[2].fotos).toEqual(['f1']);
  expect(v.observacao_final).toBe('');
  expect(v.pendencias).toEqual({ operacoes: 2, fotos: 1, recusadas: 1, total: 3 });
  expect(v.fotos.map(f => f.uuid)).toEqual(['f1', 'f2']);
});

test('OS criada no campo usa o modelo guardado', () => {
  const v = montarVisao({
    servidor: null,
    ops: [{ op_uuid: 'a', tipo: 'criar_os', os_uuid: 'novo', feita_em: '2026-11-03T09:00:00-03:00',
      dados: { obra_id: 9, titulo: 'Visita', tipo: 'visita', modelo_checklist: 'generico' } }],
    contexto: {
      modelos: [{ chave: 'generico', rotulo: 'Genérico', itens: [{ id: 'g1', grupo: 'Geral', texto: 'Local limpo' }] }],
      obras: [{ id: 9, codigo: 'OB-1', nome: 'Paróquia', cliente_nome: 'Mitra', local: 'Rua A' }],
      usuario: { id: 3, nome: 'Téc' },
    },
  });
  expect(v.uuid).toBe('novo');
  expect(v.nao_enviada).toBe(true);
  expect(v.obra.nome).toBe('Paróquia');
  expect(v.checklist).toHaveLength(1);
  expect(v.agendada_para).toBe('2026-11-03');
});

test('conferir conclusão aponta sem resposta, NC sem observação/foto e assinatura', () => {
  const os = base();
  os.checklist[0].resposta = 'conforme';
  os.checklist[1].resposta = 'nao_conforme';
  os.checklist[2].resposta = 'nao_conforme'; os.checklist[2].observacao = 'x'; os.checklist[2].fotos = ['f'];
  const c = conferirConclusao(os);
  expect(c.semResposta).toHaveLength(0);
  expect(c.ncSemObservacao.map(i => i.id)).toEqual(['c2']);
  expect(c.ncSemFoto.map(i => i.id)).toEqual(['c2']);
  expect(c.semAssinatura).toBe(true);
  expect(temAvisosConclusao(c)).toBe(true);
});

test('lista: hoje / próximas / concluídas', () => {
  const l = [
    { uuid: 'a', status: 'aberta', agendada_para: '2026-11-03' },
    { uuid: 'b', status: 'aberta', agendada_para: '2026-11-01' },
    { uuid: 'c', status: 'aberta', agendada_para: '2026-11-10' },
    { uuid: 'd', status: 'aberta', agendada_para: null },
    { uuid: 'e', status: 'em_execucao', agendada_para: '2026-11-10' },
    { uuid: 'f', status: 'concluida', concluida_em: '2026-11-02T10:00:00Z' },
  ];
  const r = classificarOS(l, '2026-11-03');
  expect(r.hoje.map(o => o.uuid)).toEqual(['e', 'b', 'a']);
  expect(r.proximas.map(o => o.uuid)).toEqual(['c', 'd']);
  expect(r.concluidas.map(o => o.uuid)).toEqual(['f']);
});

test('agrupa checklist na ordem e formata datas locais', () => {
  expect(agruparChecklist(base().checklist).map(g => [g.nome, g.itens.length])).toEqual([['Câmeras', 2], ['Rede', 1]]);
  const d = new Date(2026, 10, 3, 22, 30, 5);
  expect(diaLocal(d)).toBe('2026-11-03');
  expect(isoLocal(d)).toMatch(/^2026-11-03T22:30:05[+-]\d{2}:\d{2}$/);
  expect(Date.parse(isoLocal(d))).toBe(d.getTime());
});
