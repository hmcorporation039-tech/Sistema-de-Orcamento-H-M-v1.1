import { criarEditorItem, criarEditorTexto, criarGravadorAdiado, descarregarTodos, quantosAtivos } from './gravacaoAdiada';

// relógio de mentira: dispara os timers na mão
function relogioFalso() {
  let n = 0;
  const timers = new Map();
  return {
    setTimeout: (f, t) => { timers.set(++n, { f, t }); return n; },
    clearTimeout: id => timers.delete(id),
    disparar() { const lista = [...timers.values()]; timers.clear(); lista.forEach(x => x.f()); },
    pendentes: () => timers.size,
    esperas: () => [...timers.values()].map(x => x.t),
  };
}

const esperar = () => new Promise(r => setTimeout(r, 0));

test('observação: grava uma vez só, 1,5 s depois de parar de digitar', async () => {
  const relogio = relogioFalso();
  const gravadas = [];
  const ed = criarEditorItem({ itemId: 'c1', resposta: 'conforme', registrar: async d => { gravadas.push(d); }, relogio });
  ed.digitar('c');
  ed.digitar('ca');
  ed.digitar('cabo');
  expect(relogio.pendentes()).toBe(1);
  expect(relogio.esperas()).toEqual([1500]);
  expect(gravadas).toHaveLength(0);
  relogio.disparar();
  await ed.ocioso();
  expect(gravadas).toEqual([{ item_id: 'c1', resposta: 'conforme', observacao: 'cabo' }]);
  // nada mudou: descarregar não grava de novo
  await ed.descarregar();
  expect(gravadas).toHaveLength(1);
  await ed.encerrar();
});

test('toque na resposta antes do debounce leva o texto junto (uma operação, resposta nova)', async () => {
  const relogio = relogioFalso();
  const gravadas = [];
  const ed = criarEditorItem({ itemId: 'c1', resposta: null, registrar: async d => { gravadas.push(d); }, relogio });
  ed.digitar('sem tampa');
  await ed.responder('nao_conforme');
  expect(relogio.pendentes()).toBe(0); // o debounce foi absorvido pelo toque
  expect(gravadas).toEqual([{ item_id: 'c1', resposta: 'nao_conforme', observacao: 'sem tampa' }]);
  await ed.encerrar();
});

test('corrida: observação gravando × toque na resposta — a resposta nova nunca é sobrescrita pela antiga', async () => {
  const relogio = relogioFalso();
  const gravadas = [];
  let liberar;
  // a 1ª gravação (a da observação) demora: o toque acontece no meio dela
  const registrar = d => {
    gravadas.push(d);
    if (gravadas.length === 1) return new Promise(r => { liberar = r; });
    return Promise.resolve();
  };
  const ed = criarEditorItem({ itemId: 'c1', resposta: 'conforme', registrar, relogio });
  ed.digitar('poste torto');
  relogio.disparar();            // começa a gravar a observação (resposta ainda 'conforme')
  await esperar();
  const toque = ed.responder('nao_conforme'); // toque enquanto grava
  ed.digitar('poste torto e sem base');       // continua digitando depois do toque
  liberar();
  await toque;
  relogio.disparar();
  await ed.ocioso();
  // o toque espera a gravação da observação terminar (ordem garantida) e leva
  // o texto mais novo; nenhuma gravação depois do toque volta para 'conforme'
  expect(gravadas.map(g => [g.resposta, g.observacao])).toEqual([
    ['conforme', 'poste torto'],
    ['nao_conforme', 'poste torto e sem base'],
  ]);
  // e se a pessoa digitar mais depois disso, a observação usa a resposta NOVA
  ed.digitar('poste torto e sem base; trocar');
  relogio.disparar();
  await ed.ocioso();
  expect(gravadas[2]).toEqual({ item_id: 'c1', resposta: 'nao_conforme', observacao: 'poste torto e sem base; trocar' });
  await ed.encerrar();
});

test('cópia de fora (sincronização) não apaga o texto em digitação', () => {
  const relogio = relogioFalso();
  const ed = criarEditorItem({ itemId: 'c1', resposta: null, observacao: '', registrar: async () => {}, relogio });
  ed.digitar('meio do texto');
  ed.atualizarDeFora({ resposta: 'conforme', observacao: '' }, true);
  expect(ed.estado()).toMatchObject({ observacao: 'meio do texto', resposta: null });
  ed.encerrar();
  const ed2 = criarEditorItem({ itemId: 'c2', resposta: null, observacao: '', registrar: async () => {}, relogio });
  ed2.atualizarDeFora({ resposta: 'na', observacao: 'do servidor' }, false);
  expect(ed2.estado()).toMatchObject({ observacao: 'do servidor', resposta: 'na', gravada: 'do servidor' });
  ed2.encerrar();
});

test('descarregarTodos grava o texto pendente na hora (app escondido / ir ao login)', async () => {
  const relogio = relogioFalso();
  const gravadas = [];
  const antes = quantosAtivos();
  const a = criarEditorTexto({ texto: '', registrar: async d => { gravadas.push(['final', d.texto]); }, relogio });
  const b = criarEditorItem({ itemId: 'c9', registrar: async d => { gravadas.push(['item', d.observacao]); }, relogio });
  expect(quantosAtivos()).toBe(antes + 2);
  a.digitar('Serviço concluído');
  b.digitar('obs');
  await descarregarTodos();
  expect(gravadas.sort()).toEqual([['final', 'Serviço concluído'], ['item', 'obs']]);
  expect(relogio.pendentes()).toBe(0);
  await a.encerrar();
  await b.encerrar();
  expect(quantosAtivos()).toBe(antes);
});

test('erro ao gravar não trava a fila do item', async () => {
  const relogio = relogioFalso();
  const erros = [];
  let falhar = true;
  const feitas = [];
  const g = criarGravadorAdiado({
    relogio, aoErro: e => erros.push(e.message),
    gravar: async () => { if (falhar) { falhar = false; throw new Error('disco cheio'); } feitas.push('ok'); },
  });
  g.agendar();
  await g.descarregar();
  g.agendar();
  await g.descarregar();
  expect(erros).toEqual(['disco cheio']);
  expect(feitas).toEqual(['ok']);
  await g.encerrar();
});
