import { criarLojaMemoria } from './armazenamento';
import { criarDados } from './dados';
import { criarSincronizador, esperaParaTentativa } from './sincronizar';
import { aplicarOperacao } from './operacoes';
import { ErroRede, ErroRegra, ErroAutenticacao } from './apiCampo';

// Servidor de mentira que segue o contrato (docs/CAMPO-API.md): idempotente
// por op_uuid e pelo uuid da foto; pode "perder" a resposta depois de aplicar.
function servidorFalso() {
  const s = {
    os: new Map(), aplicadas: new Map(), fotos: new Map(), chamadas: [], perderProxima: false, cair: false,
    recusar: new Set(), seq: 100,
  };
  const modelo = { chave: 'generico', rotulo: 'Genérico', itens: [{ id: 'g1', grupo: 'Geral', texto: 'Local limpo' }] };
  s.os.set('os-1', {
    id: 1, uuid: 'os-1', numero: 'OS-1', status: 'aberta', titulo: 'A', versao: 1, atualizado_em: '2026-11-01T00:00:00Z',
    checklist: [{ id: 'c1', grupo: 'G', texto: 'T', resposta: null, observacao: '', fotos: [], respondido_em: null }], fotos: [], assinatura: null,
  });
  s.api = {
    async sincronizarOperacoes(operacoes) {
      s.chamadas.push(['sync', operacoes.map(o => o.op_uuid)]);
      if (s.cair) throw new ErroRede('Sem conexão com o servidor.');
      const resultados = [];
      const afetadas = new Set();
      for (const op of operacoes) {
        if (s.aplicadas.has(op.op_uuid)) { resultados.push(s.aplicadas.get(op.op_uuid)); afetadas.add(op.os_uuid); continue; }
        let r;
        if (s.recusar.has(op.tipo)) r = { op_uuid: op.op_uuid, ok: false, erro: `Não pode ${op.tipo}.` };
        else {
          const atual = s.os.get(op.os_uuid) || null;
          let novo = aplicarOperacao(atual, op, { modelos: [modelo], obras: [] });
          if (!novo) r = { op_uuid: op.op_uuid, ok: false, erro: 'OS não encontrada.' };
          else {
            if (!atual) novo = { ...novo, id: ++s.seq, numero: `OS-${s.seq}` };
            novo.versao = (novo.versao || 0) + 1;
            s.os.set(op.os_uuid, novo);
            r = { op_uuid: op.op_uuid, ok: true, os_id: novo.id };
          }
        }
        s.aplicadas.set(op.op_uuid, r);
        resultados.push(r);
        afetadas.add(op.os_uuid);
      }
      if (s.perderProxima) { s.perderProxima = false; throw new ErroRede('Resposta incompleta do servidor.'); }
      return { resultados, os: [...afetadas].map(u => s.os.get(u)).filter(Boolean) };
    },
    async enviarFoto(osUuid, foto) {
      s.chamadas.push(['foto', foto.uuid]);
      if (s.cair) throw new ErroRede('Sem conexão com o servidor.');
      if (!s.os.has(osUuid)) throw new ErroRegra('OS não encontrada.', 404);
      if (!s.fotos.has(foto.uuid)) {
        s.fotos.set(foto.uuid, { ...foto });
        const os = s.os.get(osUuid);
        os.fotos = [...os.fotos, { uuid: foto.uuid, item_id: foto.item_id, legenda: foto.legenda, enviada: true, url: `/api/campo/fotos/${foto.uuid}` }];
      }
      return { foto: s.fotos.get(foto.uuid) };
    },
    async listarOS() {
      s.chamadas.push(['listar']);
      if (s.cair) throw new ErroRede('Sem conexão com o servidor.');
      return { itens: [...s.os.values()], agora: '2026-11-03T12:00:00Z' };
    },
    async listarModelos() { return { itens: [modelo] }; },
    async listarObras() { return { itens: [{ id: 9, nome: 'Obra', codigo: 'OB-9' }] }; },
  };
  return s;
}

function montar(servidor, opcoes = {}) {
  const loja = criarLojaMemoria();
  let n = 0;
  const dados = criarDados({ loja, usuario: { id: 3, nome: 'Téc' }, uuid: () => `u-${++n}`,
    agora: () => new Date('2026-11-03T13:00:00Z') });
  const timers = [];
  const sync = criarSincronizador({
    dados, api: servidor.api, agora: () => new Date('2026-11-03T13:00:00Z'), tamanhoLote: opcoes.lote || 25,
    relogio: { setTimeout: (f, t) => { timers.push(t); return timers.length; }, clearTimeout: () => {} },
  });
  return { loja, dados, sync, timers };
}

test('envia a fila na ordem, em lotes, e esvazia só com ok do servidor', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv, { lote: 2 });
  await sync.sincronizar(); // baixa a OS
  await dados.registrar('iniciar', 'os-1', {});
  await dados.registrar('responder', 'os-1', { item_id: 'c1', resposta: 'conforme', observacao: '' });
  await dados.registrar('observacao', 'os-1', { texto: 'fim' });
  await sync.sincronizar();
  const lotes = srv.chamadas.filter(c => c[0] === 'sync').map(c => c[1]);
  expect(lotes).toEqual([['u-1', 'u-2'], ['u-3']]);
  expect(await dados.fila()).toHaveLength(0);
  const v = await dados.visao('os-1');
  expect(v.status).toBe('em_execucao');
  expect(v.checklist[0].resposta).toBe('conforme');
  expect(v.observacao_final).toBe('fim');
});

test('resposta perdida no meio: reenvia e o servidor não duplica', async () => {
  const srv = servidorFalso();
  const { dados, sync, timers } = montar(srv);
  await sync.sincronizar();
  await dados.registrar('iniciar', 'os-1', {});
  await dados.registrar('item_extra', 'os-1', { item_id: 'x-1', grupo: 'Extras', texto: 'Tampa' });
  srv.perderProxima = true;
  const r1 = await sync.sincronizar();
  expect(r1.ok).toBe(false);
  expect(await dados.fila()).toHaveLength(2); // nada perdido no aparelho
  expect(timers.length).toBeGreaterThan(0); // agendou nova tentativa
  const v1 = await dados.visao('os-1');
  expect(v1.status).toBe('em_execucao'); // a tela continua mostrando o que foi feito
  const r2 = await sync.sincronizar();
  expect(r2.ok).toBe(true);
  expect(await dados.fila()).toHaveLength(0);
  expect(srv.aplicadas.size).toBe(2);
  expect(srv.os.get('os-1').checklist.filter(i => i.id === 'x-1')).toHaveLength(1);
  expect(srv.os.get('os-1').versao).toBe(3); // 1 + 2 aplicações, não 5
});

test('erro de regra marca recusada, não reenvia e mostra ao técnico', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  await sync.sincronizar();
  srv.recusar.add('concluir');
  await dados.registrar('iniciar', 'os-1', {});
  await dados.registrar('concluir', 'os-1', {});
  await sync.sincronizar();
  const fila = await dados.fila();
  expect(fila).toHaveLength(1);
  expect(fila[0]).toMatchObject({ tipo: 'concluir', estado: 'recusada', erro: 'Não pode concluir.' });
  const antes = srv.chamadas.filter(c => c[0] === 'sync').length;
  await sync.sincronizar();
  expect(srv.chamadas.filter(c => c[0] === 'sync').length).toBe(antes); // recusada não vai de novo
  const r = await dados.resumo();
  expect(r.recusadas).toHaveLength(1);
  expect((await dados.visao('os-1')).status).toBe('em_execucao'); // recusada não aparece aplicada
  await dados.tentarDeNovo(r.recusadas[0]);
  srv.recusar.clear();
  await sync.sincronizar();
  expect(await dados.fila()).toHaveLength(0);
  expect((await dados.visao('os-1')).status).toBe('concluida');
});

test('lote inteiro recusado (4xx): manda uma a uma e recusa só a problemática', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  await sync.sincronizar();
  const original = srv.api.sincronizarOperacoes;
  srv.api.sincronizarOperacoes = async (ops) => {
    if (ops.some(o => o.tipo === 'assinar')) throw new ErroRegra('PNG inválido.', 400);
    return original(ops);
  };
  await dados.registrar('iniciar', 'os-1', {});
  await dados.registrar('assinar', 'os-1', { nome: 'X', png_base64: 'zzz' });
  await dados.registrar('observacao', 'os-1', { texto: 'a' });
  await sync.sincronizar();
  const fila = await dados.fila();
  expect(fila.map(o => [o.tipo, o.estado])).toEqual([['assinar', 'recusada']]);
  expect(srv.os.get('os-1').observacao_final).toBe('a');
});

test('sem rede: guarda tudo e tenta depois com espera crescente', async () => {
  const srv = servidorFalso();
  const { dados, sync, timers } = montar(srv);
  srv.cair = true;
  await dados.registrar('iniciar', 'os-1', {});
  await sync.sincronizar();
  await sync.sincronizar();
  await sync.sincronizar();
  expect(await dados.fila()).toHaveLength(1);
  expect(sync.tentativas()).toBe(3);
  expect(timers[1]).toBeGreaterThan(timers[0]);
  expect(timers[2]).toBeGreaterThan(timers[1]);
  expect(esperaParaTentativa(30, () => 0.5)).toBe(5 * 60 * 1000);
});

test('401 para a rodada e mantém a fila (vai ao login sem apagar nada)', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  srv.api.sincronizarOperacoes = async () => { throw new ErroAutenticacao(); };
  await dados.registrar('iniciar', 'os-1', {});
  const r = await sync.sincronizar();
  expect(r.ok).toBe(false);
  expect(sync.estado().precisaLogin).toBe(true);
  expect(await dados.fila()).toHaveLength(1);
});

test('OS criada offline + foto: cria primeiro, foto depois, uma vez só', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  await sync.sincronizar(); // baixa modelos
  const u = await dados.criarOS({ obra_id: 9, titulo: 'Visita', tipo: 'visita', disciplina: null, modelo_checklist: 'generico' });
  await dados.registrar('iniciar', u, {});
  await dados.guardarFoto({ os_uuid: u, item_id: 'g1', legenda: '', tipo_mime: 'image/jpeg', bytes: new Uint8Array([255, 216, 255]).buffer });
  const v0 = await dados.visao(u);
  expect(v0.nao_enviada).toBe(true);
  expect(v0.checklist[0].fotos).toHaveLength(1);
  expect(v0.pendencias.total).toBe(3);
  // a resposta das operações se perde; a foto ainda não foi
  srv.perderProxima = true;
  await sync.sincronizar();
  expect(srv.fotos.size).toBe(0);
  await sync.sincronizar();
  await sync.sincronizar();
  expect(srv.os.get(u).status).toBe('em_execucao');
  expect(srv.fotos.size).toBe(1);
  expect(srv.chamadas.filter(c => c[0] === 'foto')).toHaveLength(1);
  const v = await dados.visao(u);
  expect(v.nao_enviada).toBe(false);
  expect(v.numero).toMatch(/^OS-/);
  expect(v.pendencias.total).toBe(0);
  expect(v.fotos).toHaveLength(1);
});

test('foto recusada (4xx) fica marcada; erro de rede mantém pendente', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  await sync.sincronizar();
  await dados.guardarFoto({ os_uuid: 'nao-existe', tipo_mime: 'image/jpeg', bytes: new ArrayBuffer(3) });
  await dados.guardarFoto({ os_uuid: 'os-1', tipo_mime: 'image/jpeg', bytes: new ArrayBuffer(3) });
  srv.cair = true;
  await sync.sincronizar();
  expect((await dados.fotosMeta()).map(f => f.estado)).toEqual(['pendente', 'pendente']);
  srv.cair = false;
  await sync.sincronizar();
  const estados = Object.fromEntries((await dados.fotosMeta()).map(f => [f.os_uuid, f.estado]));
  expect(estados).toEqual({ 'nao-existe': 'recusada', 'os-1': 'enviada' });
});

test('download incremental usa o "agora" do servidor; completo poda OS que sumiram sem pendências', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  const chamadas = [];
  const listar = srv.api.listarOS;
  srv.api.listarOS = async (p) => { chamadas.push(p); return listar(p); };
  await sync.sincronizar();
  await sync.sincronizar();
  expect(chamadas[0].desde).toBeUndefined();
  expect(chamadas[1].desde).toBe('2026-11-03T12:00:00Z');
  srv.os.clear();
  await sync.sincronizar({ forcarCompleto: true });
  expect(await dados.visoes()).toHaveLength(0);
});

test('resposta de uma foto perdida: reenvia com o mesmo uuid e o servidor não duplica', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  await sync.sincronizar();
  const enviar = srv.api.enviarFoto;
  let perder = true;
  srv.api.enviarFoto = async (osUuid, foto, blob) => {
    const r = await enviar(osUuid, foto, blob);
    if (perder) { perder = false; throw new ErroRede('Resposta incompleta do servidor.'); }
    return r;
  };
  const u = await dados.guardarFoto({ os_uuid: 'os-1', tipo_mime: 'image/jpeg', bytes: new ArrayBuffer(3) });
  await sync.sincronizar();
  expect((await dados.fotosMeta())[0].estado).toBe('pendente'); // sem confirmação: continua no aparelho
  await sync.sincronizar();
  expect((await dados.fotosMeta())[0].estado).toBe('enviada');
  expect(srv.chamadas.filter(c => c[0] === 'foto' && c[1] === u)).toHaveLength(2);
  expect(srv.fotos.size).toBe(1);
  expect(srv.os.get('os-1').fotos).toHaveLength(1);
  expect((await dados.lerArquivo(u)).bytes.byteLength).toBe(3); // bytes ficam para a miniatura
});

test('401: pausa sem recusar nada; rodadas automáticas não chamam o servidor; token novo retoma', async () => {
  const srv = servidorFalso();
  let tokenAgora = 'velho';
  const loja = criarLojaMemoria();
  let n = 0;
  const dados = criarDados({ loja, usuario: { id: 3, nome: 'Téc' }, uuid: () => `u-${++n}`, agora: () => new Date('2026-11-03T13:00:00Z') });
  const timers = [];
  const sync = criarSincronizador({
    dados, api: srv.api, agora: () => new Date('2026-11-03T13:00:00Z'), tokenAtual: () => tokenAgora,
    relogio: { setTimeout: (f, t) => { timers.push(t); return timers.length; }, clearTimeout: () => {} },
  });
  await sync.sincronizar();
  const original = srv.api.sincronizarOperacoes;
  srv.api.sincronizarOperacoes = async (ops) => {
    if (tokenAgora === 'velho') throw new ErroAutenticacao();
    return original(ops);
  };
  await dados.registrar('iniciar', 'os-1', {});
  await dados.guardarFoto({ os_uuid: 'os-1', tipo_mime: 'image/jpeg', bytes: new ArrayBuffer(3) });
  const timersAntes = timers.length;
  const r = await sync.sincronizar();
  expect(r.ok).toBe(false);
  expect(sync.estado().precisaLogin).toBe(true);
  expect(timers.length).toBe(timersAntes); // não agenda nova tentativa
  expect((await dados.fila()).map(o => o.estado)).toEqual(['pendente']); // nada recusado
  expect((await dados.fotosMeta()).map(f => f.estado)).toEqual(['pendente']);
  expect((await dados.resumo()).recusadas).toHaveLength(0);
  // o técnico continua trabalhando: a rodada automática nem vai ao servidor
  await dados.registrar('responder', 'os-1', { item_id: 'c1', resposta: 'conforme', observacao: '' });
  const chamadasAntes = srv.chamadas.length;
  const r2 = await sync.sincronizar();
  expect(r2).toEqual({ ok: false, pausado: true });
  expect(srv.chamadas.length).toBe(chamadasAntes);
  expect(await sync.retomar()).toEqual({ ok: false, pausado: true }); // mesmo token: segue pausado
  // entrou de novo (nesta ou em outra aba): token novo, volta a enviar tudo
  tokenAgora = 'novo';
  const r3 = await sync.retomar();
  expect(r3.ok).toBe(true);
  expect(sync.estado().precisaLogin).toBe(false);
  expect(await dados.fila()).toHaveLength(0);
  expect((await dados.fotosMeta())[0].estado).toBe('enviada');
  expect(srv.os.get('os-1').checklist[0].resposta).toBe('conforme');
});

test('401 numa foto também pausa (a foto não vira recusada)', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  await sync.sincronizar();
  srv.api.enviarFoto = async () => { throw new ErroAutenticacao(); };
  await dados.guardarFoto({ os_uuid: 'os-1', tipo_mime: 'image/jpeg', bytes: new ArrayBuffer(3) });
  await sync.sincronizar();
  expect(sync.estado().precisaLogin).toBe(true);
  expect((await dados.fotosMeta())[0].estado).toBe('pendente');
});

test('criar_os recusada: a OS fica na tela não aceita, o resto dela é retido; tentar de novo leva tudo junto', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  await sync.sincronizar(); // modelos
  srv.recusar.add('criar_os');
  const u = await dados.criarOS({ obra_id: 9, titulo: 'Visita', tipo: 'visita', disciplina: null, modelo_checklist: 'generico' });
  await dados.registrar('iniciar', u, {});
  await dados.registrar('responder', u, { item_id: 'g1', resposta: 'nao_conforme', observacao: 'sujo' });
  await dados.guardarFoto({ os_uuid: u, item_id: 'g1', legenda: '', tipo_mime: 'image/jpeg', bytes: new ArrayBuffer(3) });
  await sync.sincronizar();
  // só a criação foi recusada; as outras ficaram pendentes (retidas), a foto nem foi enviada
  const fila = await dados.fila();
  expect(fila.map(o => [o.tipo, o.estado])).toEqual([['criar_os', 'recusada'], ['iniciar', 'pendente'], ['responder', 'pendente']]);
  expect(srv.chamadas.filter(c => c[0] === 'foto')).toHaveLength(0);
  expect((await dados.fotosMeta())[0].estado).toBe('pendente');
  // a OS continua na lista, marcada
  const v = await dados.visao(u);
  expect(v).not.toBeNull();
  expect(v.status).toBe('em_execucao');
  expect(v.checklist[0].resposta).toBe('nao_conforme');
  expect(v.nao_aceita).toEqual({ erro: 'Não pode criar_os.', operacoes: 2, fotos: 1 });
  expect((await dados.visoes()).map(x => x.uuid)).toContain(u);
  // resumo: um item só (a OS), nada pendente de envio contado à toa
  const r = await dados.resumo();
  expect(r.operacoes).toBe(0);
  expect(r.fotos).toBe(0);
  expect(r.recusadas).toEqual([expect.objectContaining({ tipo: 'os', chave: u, titulo: 'Visita', operacoes: 2, fotos: 1 })]);
  // rodada seguinte não manda nada dessa OS
  const antes = srv.chamadas.filter(c => c[0] === 'sync').length;
  await sync.sincronizar();
  expect(srv.chamadas.filter(c => c[0] === 'sync').length).toBe(antes);
  // escritório corrigiu: tentar de novo leva criação + operações + foto
  srv.recusar.clear();
  await dados.tentarDeNovo(r.recusadas[0]);
  await sync.sincronizar();
  expect(await dados.fila()).toHaveLength(0);
  expect(srv.os.get(u).status).toBe('em_execucao');
  expect(srv.os.get(u).checklist[0].resposta).toBe('nao_conforme');
  expect(srv.fotos.size).toBe(1);
  expect((await dados.visao(u)).nao_aceita).toBeUndefined();
});

test('criar_os recusada no mesmo lote das outras: as outras não viram recusadas uma a uma', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  await sync.sincronizar();
  // como o servidor real: sem a OS, as operações seguintes voltam ok:false
  srv.recusar.add('criar_os');
  const u = await dados.criarOS({ obra_id: 9, titulo: 'Visita', tipo: 'visita', modelo_checklist: 'generico' });
  await dados.registrar('iniciar', u, {});
  await dados.registrar('observacao', u, { texto: 'x' });
  await sync.sincronizar();
  const fila = await dados.fila();
  expect(fila.filter(o => o.estado === 'recusada').map(o => o.tipo)).toEqual(['criar_os']);
  expect((await dados.resumo()).recusadas).toHaveLength(1);
});

test('descartar a OS não aceita apaga criação, operações e fotos juntas', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  await sync.sincronizar();
  srv.recusar.add('criar_os');
  const u = await dados.criarOS({ obra_id: 9, titulo: 'Visita', tipo: 'visita', modelo_checklist: 'generico' });
  await dados.registrar('iniciar', u, {});
  const f = await dados.guardarFoto({ os_uuid: u, tipo_mime: 'image/jpeg', bytes: new ArrayBuffer(3) });
  await dados.registrar('iniciar', 'os-1', {}); // de outra OS: fica
  await sync.sincronizar();
  const [item] = (await dados.resumo()).recusadas;
  await dados.descartarRecusada(item);
  expect((await dados.fila()).filter(o => o.os_uuid === u)).toHaveLength(0);
  expect(await dados.fotosMeta()).toHaveLength(0);
  expect(await dados.lerArquivo(f)).toBeUndefined();
  expect(await dados.visao(u)).toBeNull();
  expect(srv.os.get('os-1').status).toBe('em_execucao');
});

test('foto ainda não enviada pode ser excluída do aparelho; a enviada não', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  await sync.sincronizar();
  const a = await dados.guardarFoto({ os_uuid: 'os-1', tipo_mime: 'image/jpeg', bytes: new ArrayBuffer(3) });
  await sync.sincronizar();
  const b = await dados.guardarFoto({ os_uuid: 'os-1', tipo_mime: 'image/jpeg', bytes: new ArrayBuffer(3) });
  expect(await dados.excluirFotoLocal(a)).toBe(false);
  expect(await dados.excluirFotoLocal(b)).toBe(true);
  expect((await dados.fotosMeta()).map(x => x.uuid)).toEqual([a]);
});

test('lista cortada pelo servidor (incompleto): completa não poda; incremental pede o resto', async () => {
  const srv = servidorFalso();
  const { dados, sync } = montar(srv);
  await sync.sincronizar(); // lista completa: guarda os-1 (e marca a última completa)
  expect(await dados.visao('os-1')).toBeTruthy();
  // próxima lista completa vem cortada SEM a os-1: não pode apagá-la do aparelho
  await dados.salvarMeta('ultima_completa', null);
  srv.api.listarOS = async () => ({ itens: [], agora: '2026-11-03T12:30:00Z', incompleto: true });
  await sync.sincronizar();
  expect(await dados.visao('os-1')).toBeTruthy();
  // incremental cortado: chama de novo a partir do `agora` devolvido até completar
  await dados.salvarMeta('ultima_completa', '2026-11-03T12:59:00Z');
  await dados.salvarMeta('desde', '2026-11-03T12:00:00Z');
  const pedidos = [];
  srv.api.listarOS = async ({ desde }) => {
    pedidos.push(desde);
    return pedidos.length === 1
      ? { itens: [], agora: '2026-11-03T12:10:00Z', incompleto: true }
      : { itens: [], agora: '2026-11-03T12:58:00Z', incompleto: false };
  };
  await sync.sincronizar();
  expect(pedidos).toEqual(['2026-11-03T12:00:00Z', '2026-11-03T12:10:00Z']);
  expect(await dados.meta('desde')).toBe('2026-11-03T12:58:00Z');
});
