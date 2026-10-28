// Dados do app de campo sobre a loja do aparelho (armazenamento.js).
//
// Tudo que o técnico faz vira uma OPERAÇÃO na fila (com op_uuid e feita_em do
// aparelho) e aparece na tela na hora pela "visão" (operacoes.js). A cópia do
// servidor só é trocada quando ele confirma; a fila só perde uma operação
// quando o servidor responde que a aplicou (ou a recusou por regra — aí ela
// fica marcada como "recusada" até o técnico descartar).

import { novoUuid } from './uuid';
import { isoLocal, montarVisao, aplicarOperacao, diaLocal, criacoesRecusadas } from './operacoes';

const DIAS_GUARDAR_CONCLUIDAS = 7;

export function criarDados({ loja, usuario, agora = () => new Date(), uuid = novoUuid }) {
  const ouvintes = new Set();
  // motivo 'local' = o técnico mudou algo (a tela agenda uma sincronização);
  // 'sync' = a sincronização mudou algo (só atualiza a tela — sem laço).
  function emitir(motivo = 'sync') { for (const fn of ouvintes) { try { fn(motivo); } catch { /* tela */ } } }

  async function lista(chave) {
    const reg = await loja.get('listas', chave);
    return reg?.itens || [];
  }

  // a lista já veio do servidor alguma vez (vazia ≠ ainda não baixada)
  async function temLista(chave) {
    return !!(await loja.get('listas', chave));
  }

  async function contexto() {
    return { modelos: await lista('modelos'), obras: await lista('obras'), usuario };
  }

  async function fila() {
    return loja.all('fila'); // ordenada por seq
  }

  async function fotosMeta() {
    return loja.all('fotos');
  }

  // ── leitura: visões para a tela ───────────────────────────────────────
  async function visoes() {
    const [regs, ops, fotos, ctx] = [await loja.all('os'), await fila(), await fotosMeta(), await contexto()];
    const uuids = new Set(regs.map(r => r.uuid));
    for (const op of ops) if (op.tipo === 'criar_os') uuids.add(op.os_uuid);
    const porUuid = new Map(regs.map(r => [r.uuid, r]));
    const r = [];
    for (const u of uuids) {
      const v = montarVisao({
        servidor: porUuid.get(u)?.servidor || null,
        ops: ops.filter(o => o.os_uuid === u),
        fotos: fotos.filter(f => f.os_uuid === u),
        contexto: ctx,
      });
      if (v) r.push(v);
    }
    return r;
  }

  async function visao(osUuid) {
    const reg = await loja.get('os', osUuid);
    const ops = (await fila()).filter(o => o.os_uuid === osUuid);
    const fotos = (await fotosMeta()).filter(f => f.os_uuid === osUuid);
    return montarVisao({ servidor: reg?.servidor || null, ops, fotos, contexto: await contexto() });
  }

  // OS com a criação recusada entram como UM item ('os'), com o que está
  // retido dela (operações e fotos) — não como várias recusadas soltas.
  async function resumo() {
    const ops = await fila();
    const fotos = await fotosMeta();
    const retidas = criacoesRecusadas(ops);
    return {
      operacoes: ops.filter(o => o.estado !== 'recusada' && !retidas.has(o.os_uuid)).length,
      fotos: fotos.filter(f => f.estado === 'pendente' && !retidas.has(f.os_uuid)).length,
      recusadas: [
        ...[...retidas.values()].map(o => ({
          tipo: 'os', chave: o.os_uuid, os_uuid: o.os_uuid, descricao: 'criar_os', erro: o.erro,
          titulo: o.dados?.titulo || '',
          operacoes: ops.filter(x => x.os_uuid === o.os_uuid && x.seq !== o.seq).length,
          fotos: fotos.filter(f => f.os_uuid === o.os_uuid).length,
        })),
        ...ops.filter(o => o.estado === 'recusada' && !retidas.has(o.os_uuid)).map(o => ({ tipo: 'operacao', chave: o.seq, os_uuid: o.os_uuid, descricao: o.tipo, erro: o.erro })),
        ...fotos.filter(f => f.estado === 'recusada' && !retidas.has(f.os_uuid)).map(f => ({ tipo: 'foto', chave: f.uuid, os_uuid: f.os_uuid, descricao: 'foto', erro: f.erro })),
      ],
    };
  }

  // ── escrita pelo técnico ──────────────────────────────────────────────
  async function registrar(tipo, osUuid, dadosOp = {}) {
    const op = {
      op_uuid: uuid(), feita_em: isoLocal(agora()), tipo, os_uuid: osUuid,
      dados: dadosOp, estado: 'pendente',
    };
    op.seq = await loja.put('fila', op);
    emitir('local');
    return op;
  }

  async function criarOS(dadosOs) {
    const osUuid = uuid();
    await registrar('criar_os', osUuid, dadosOs);
    return osUuid;
  }

  // foto: { os_uuid, item_id, legenda, lat, lon, tipo_mime, bytes }
  async function guardarFoto(foto) {
    const u = uuid();
    // bytes primeiro: se faltar espaço, a foto não aparece como "pendente" sem arquivo
    await loja.put('arquivos', { uuid: u, tipo_mime: foto.tipo_mime, bytes: foto.bytes });
    await loja.put('fotos', {
      uuid: u, os_uuid: foto.os_uuid, item_id: foto.item_id || null, legenda: foto.legenda || '',
      tirada_em: isoLocal(agora()), lat: foto.lat ?? null, lon: foto.lon ?? null,
      tipo_mime: foto.tipo_mime, tamanho: foto.bytes?.byteLength ?? null, estado: 'pendente',
    });
    emitir('local');
    return u;
  }

  async function lerArquivo(fotoUuid) {
    return loja.get('arquivos', fotoUuid);
  }

  // Foto que ainda não foi enviada (pendente ou recusada): o técnico pode
  // excluir do aparelho. A já enviada não (o contrato não tem exclusão).
  async function excluirFotoLocal(fotoUuid) {
    const f = await loja.get('fotos', fotoUuid);
    if (!f || f.estado === 'enviada') return false;
    await loja.del('fotos', fotoUuid);
    await loja.del('arquivos', fotoUuid);
    emitir();
    return true;
  }

  async function descartarRecusada(item) {
    if (item.tipo === 'os') {
      // a OS que o servidor não aceitou sai inteira: criação, operações e fotos
      for (const op of (await fila()).filter(o => o.os_uuid === item.chave)) await loja.del('fila', op.seq);
      await removerOSLocal(item.chave);
    } else if (item.tipo === 'operacao') await loja.del('fila', item.chave);
    else { await loja.del('fotos', item.chave); await loja.del('arquivos', item.chave); }
    emitir();
  }

  async function tentarDeNovo(item) {
    if (item.tipo === 'os') {
      // tudo da OS volta para a fila junto, na ordem (seq) — a criação primeiro.
      // op_uuid novo em todas: o servidor guardou a recusa de cada op_uuid já enviado.
      for (const op of (await fila()).filter(o => o.os_uuid === item.chave)) {
        op.estado = 'pendente'; op.op_uuid = uuid(); delete op.erro;
        await loja.put('fila', op);
      }
      for (const f of (await fotosMeta()).filter(x => x.os_uuid === item.chave && x.estado === 'recusada')) {
        f.estado = 'pendente'; delete f.erro;
        await loja.put('fotos', f);
      }
    } else if (item.tipo === 'operacao') {
      const op = await loja.get('fila', item.chave);
      // op_uuid novo: o servidor guarda o resultado de cada op_uuid e devolveria
      // a mesma recusa. A recusada não foi aplicada, então não há o que duplicar.
      if (op) { op.estado = 'pendente'; op.op_uuid = uuid(); delete op.erro; await loja.put('fila', op); }
    } else {
      const f = await loja.get('fotos', item.chave);
      if (f) { f.estado = 'pendente'; delete f.erro; await loja.put('fotos', f); }
    }
    emitir('local');
  }

  // ── usado pela sincronização ──────────────────────────────────────────
  async function salvarDoServidor(listaOs) {
    for (const os of listaOs || []) {
      if (!os?.uuid) continue;
      await loja.put('os', { uuid: os.uuid, servidor: os, recebido_em: agora().toISOString() });
    }
    if (listaOs?.length) emitir();
  }

  // Operação confirmada sem a OS vir na resposta: aplica na cópia do servidor
  // guardada, para a tela não "desfazer" até o próximo download.
  async function confirmarOperacao(op) {
    const reg = await loja.get('os', op.os_uuid);
    if (reg?.servidor) {
      reg.servidor = aplicarOperacao(reg.servidor, op, await contexto());
      await loja.put('os', reg);
    } else if (op.tipo === 'criar_os') {
      const base = aplicarOperacao(null, op, await contexto());
      if (base) await loja.put('os', { uuid: op.os_uuid, servidor: base, recebido_em: null, provisoria: true });
    }
  }

  async function removerOperacao(seq) { await loja.del('fila', seq); }

  async function recusarOperacao(seq, erro) {
    const op = await loja.get('fila', seq);
    if (op) { op.estado = 'recusada'; op.erro = erro || 'Recusada pelo servidor.'; await loja.put('fila', op); }
  }

  async function marcarFoto(fotoUuid, estado, erro) {
    const f = await loja.get('fotos', fotoUuid);
    if (!f) return;
    f.estado = estado;
    if (erro) f.erro = erro; else delete f.erro;
    if (estado === 'enviada') f.enviada_em = agora().toISOString();
    await loja.put('fotos', f);
  }

  async function salvarLista(chave, itens) {
    await loja.put('listas', { chave, itens, salvo_em: agora().toISOString() });
    emitir();
  }

  async function meta(chave) { return (await loja.get('meta', chave))?.valor; }
  async function salvarMeta(chave, valor) { await loja.put('meta', { chave, valor }); }

  // Download completo: tira do aparelho as OS que o servidor não lista mais
  // (reatribuídas, concluídas há tempo), desde que não tenham nada a enviar.
  async function podarAusentes(uuidsNoServidor) {
    const presentes = new Set(uuidsNoServidor);
    const ops = await fila();
    const fotos = await fotosMeta();
    for (const reg of await loja.all('os')) {
      if (presentes.has(reg.uuid)) continue;
      const pend = ops.some(o => o.os_uuid === reg.uuid) || fotos.some(f => f.os_uuid === reg.uuid && f.estado !== 'enviada');
      if (pend) continue;
      await removerOSLocal(reg.uuid, fotos);
    }
    emitir();
  }

  async function removerOSLocal(osUuid, fotos) {
    for (const f of (fotos || await fotosMeta()).filter(x => x.os_uuid === osUuid)) {
      await loja.del('fotos', f.uuid);
      await loja.del('arquivos', f.uuid);
    }
    await loja.del('os', osUuid);
  }

  // Limpeza: OS concluídas/canceladas há mais de 7 dias, sem pendências.
  async function limparAntigas() {
    const limite = new Date(agora().getTime() - DIAS_GUARDAR_CONCLUIDAS * 86400000);
    const ops = await fila();
    const fotos = await fotosMeta();
    let mudou = false;
    for (const reg of await loja.all('os')) {
      const s = reg.servidor;
      if (!s || !['concluida', 'cancelada'].includes(s.status)) continue;
      const quando = Date.parse(s.concluida_em || s.atualizado_em || '');
      if (Number.isNaN(quando) || quando > limite.getTime()) continue;
      if (ops.some(o => o.os_uuid === reg.uuid) || fotos.some(f => f.os_uuid === reg.uuid && f.estado !== 'enviada')) continue;
      await removerOSLocal(reg.uuid, fotos);
      mudou = true;
    }
    if (mudou) emitir();
  }

  return {
    loja, usuario, emitir,
    assinar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },
    contexto, fila, fotosMeta, visoes, visao, resumo,
    registrar, criarOS, guardarFoto, lerArquivo, excluirFotoLocal, descartarRecusada, tentarDeNovo,
    salvarDoServidor, confirmarOperacao, removerOperacao, recusarOperacao, marcarFoto,
    salvarLista, lista, temLista, meta, salvarMeta, podarAusentes, limparAntigas,
    hoje: () => diaLocal(agora()),
  };
}
