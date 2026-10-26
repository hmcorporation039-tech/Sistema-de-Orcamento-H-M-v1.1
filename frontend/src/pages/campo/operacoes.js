// Regras puras do app de campo (sem IndexedDB, sem rede) — testadas em
// operacoes.test.js.
//
// O que a tela mostra de uma OS é a "visão": a última cópia confirmada pelo
// servidor + as operações ainda não confirmadas, reaplicadas na ordem + as
// fotos que só existem no aparelho. Assim uma sincronização que traz a cópia do
// servidor nunca apaga da tela o que o técnico fez e ainda não foi enviado.

export const TIPOS_OPERACAO = ['criar_os', 'iniciar', 'responder', 'item_extra', 'observacao', 'assinar', 'concluir'];
export const RESPOSTAS = ['conforme', 'nao_conforme', 'na'];

export const ROTULO_TIPO_OS = {
  instalacao: 'Instalação', manutencao: 'Manutenção', vistoria: 'Vistoria',
  visita: 'Visita técnica', outro: 'Outro',
};
export const ROTULO_STATUS = {
  aberta: 'Aberta', em_execucao: 'Em execução', concluida: 'Concluída', cancelada: 'Cancelada',
};

function clonar(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

// Data local AAAA-MM-DD (não UTC: às 22 h em Brasília o UTC já é o dia seguinte).
export function diaLocal(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  const p = n => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

// ISO com o fuso do aparelho (ex.: 2026-11-03T14:02:00-03:00), como no contrato.
export function isoLocal(d = new Date()) {
  const p = n => String(Math.abs(Math.trunc(n))).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sinal = off >= 0 ? '+' : '-';
  return `${diaLocal(d)}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    + `${sinal}${p(off / 60)}:${p(off % 60)}`;
}

function tempo(iso) {
  const t = Date.parse(iso || '');
  return Number.isNaN(t) ? 0 : t;
}

// Checklist inicial de uma OS criada no campo, a partir do modelo guardado.
export function checklistDoModelo(modelo) {
  return (modelo?.itens || []).map(it => ({
    id: String(it.id), grupo: it.grupo || 'Geral', texto: it.texto || '',
    resposta: null, observacao: '', fotos: [], respondido_em: null,
  }));
}

// Aplica uma operação sobre uma OS (devolve uma cópia; não muda a original).
// `contexto`: { modelos, obras, usuario } — só para criar_os.
export function aplicarOperacao(os, op, contexto = {}) {
  const d = op.dados || {};
  if (op.tipo === 'criar_os') {
    if (os) return os; // já existe (veio do servidor): nada a fazer
    const modelo = (contexto.modelos || []).find(m => m.chave === d.modelo_checklist);
    const obra = (contexto.obras || []).find(o => Number(o.id) === Number(d.obra_id));
    return {
      id: null, uuid: op.os_uuid, numero: null, obra_id: d.obra_id ?? null,
      obra: obra ? {
        id: obra.id, codigo: obra.codigo, nome: obra.nome,
        cliente_nome: obra.cliente_nome, endereco: obra.endereco || obra.local || '',
      } : null,
      titulo: d.titulo || 'Visita técnica', descricao: d.descricao || '',
      tipo: d.tipo || 'visita', disciplina: d.disciplina ?? null, status: 'aberta',
      responsavel_id: contexto.usuario?.id ?? null, responsavel_nome: contexto.usuario?.nome ?? null,
      agendada_para: diaLocal(new Date(tempo(op.feita_em) || Date.now())),
      iniciada_em: null, concluida_em: null,
      checklist: checklistDoModelo(modelo), fotos: [], assinatura: null,
      observacao_final: '', versao: 0, atualizado_em: op.feita_em, criada_no_campo: true,
    };
  }
  if (!os) return os; // operação de uma OS que este aparelho não conhece
  const r = clonar(os);
  r.checklist = r.checklist || [];
  r.fotos = r.fotos || [];
  // Regras do servidor (docs/CAMPO-API.md): nada altera OS cancelada; concluída
  // só aceita assinatura (e fotos atrasadas).
  if (r.status === 'cancelada') return r;
  if (r.status === 'concluida' && op.tipo !== 'assinar') return r;

  switch (op.tipo) {
    case 'iniciar':
      if (r.status === 'aberta') { r.status = 'em_execucao'; r.iniciada_em = op.feita_em; }
      break;
    case 'responder': {
      const item = r.checklist.find(i => i.id === d.item_id);
      if (!item) break;
      // Conflito: vale a resposta de feita_em mais recente.
      if (item.respondido_em && tempo(item.respondido_em) > tempo(op.feita_em)) break;
      item.resposta = d.resposta ?? null;
      item.observacao = d.observacao ?? '';
      item.respondido_em = op.feita_em;
      break;
    }
    case 'item_extra':
      if (!r.checklist.some(i => i.id === d.item_id)) {
        r.checklist.push({
          id: d.item_id, grupo: d.grupo || 'Extras', texto: d.texto || '',
          resposta: null, observacao: '', fotos: [], respondido_em: null, extra: true,
        });
      }
      break;
    case 'observacao':
      r.observacao_final = d.texto ?? '';
      break;
    case 'assinar':
      r.assinatura = {
        nome: d.nome || '', documento: d.documento || '', assinada_em: op.feita_em,
        url: null, png_local: d.png_base64 ? `data:image/png;base64,${d.png_base64}` : null,
      };
      break;
    case 'concluir':
      if (r.status === 'aberta') r.iniciada_em = op.feita_em;
      if (r.status === 'aberta' || r.status === 'em_execucao') {
        r.status = 'concluida'; r.concluida_em = op.feita_em;
      }
      break;
    default:
      break;
  }
  return r;
}

// Visão da OS para a tela.
//   servidor: última cópia confirmada (ou null se a OS nasceu no aparelho)
//   ops: operações da fila desta OS, em ordem (as recusadas não entram)
//   fotos: fotos guardadas no aparelho desta OS (sem os bytes)
export function montarVisao({ servidor, ops = [], fotos = [], contexto = {} }) {
  let v = servidor ? clonar(servidor) : null;
  const pendentes = ops.filter(o => o.estado !== 'recusada');
  for (const op of pendentes) v = aplicarOperacao(v, op, contexto);
  if (!v) return null;
  v.checklist = v.checklist || [];
  v.fotos = v.fotos || [];
  for (const f of fotos) {
    let reg = v.fotos.find(x => x.uuid === f.uuid);
    if (!reg) {
      reg = {
        uuid: f.uuid, item_id: f.item_id ?? null, legenda: f.legenda || '', tirada_em: f.tirada_em,
        lat: f.lat ?? null, lon: f.lon ?? null, enviada: f.estado === 'enviada', url: null,
      };
      v.fotos.push(reg);
    }
    reg.local = true;
    reg.estado_local = f.estado;
    reg.erro_local = f.erro || null;
    if (f.item_id) {
      const item = v.checklist.find(i => i.id === f.item_id);
      if (item) {
        item.fotos = item.fotos || [];
        if (!item.fotos.includes(f.uuid)) item.fotos.push(f.uuid);
      }
    }
  }
  const recusadas = ops.filter(o => o.estado === 'recusada');
  v.pendencias = {
    operacoes: pendentes.length,
    fotos: fotos.filter(f => f.estado === 'pendente').length,
    recusadas: recusadas.length + fotos.filter(f => f.estado === 'recusada').length,
  };
  v.pendencias.total = v.pendencias.operacoes + v.pendencias.fotos;
  v.nao_enviada = !servidor;
  return v;
}

// Agrupa o checklist por grupo, mantendo a ordem de aparição.
export function agruparChecklist(checklist = []) {
  const grupos = [];
  const porNome = new Map();
  for (const item of checklist) {
    const nome = item.grupo || 'Geral';
    if (!porNome.has(nome)) { const g = { nome, itens: [] }; porNome.set(nome, g); grupos.push(g); }
    porNome.get(nome).itens.push(item);
  }
  return grupos;
}

// O que falta antes de concluir (o técnico pode concluir mesmo assim, depois de avisado).
export function conferirConclusao(os) {
  const lista = os?.checklist || [];
  const fotosDoItem = item => (item.fotos || []).length
    + (os.fotos || []).filter(f => f.item_id === item.id && !(item.fotos || []).includes(f.uuid)).length;
  const nc = lista.filter(i => i.resposta === 'nao_conforme');
  return {
    semResposta: lista.filter(i => !i.resposta),
    ncSemObservacao: nc.filter(i => !String(i.observacao || '').trim()),
    ncSemFoto: nc.filter(i => fotosDoItem(i) === 0),
    semAssinatura: !os?.assinatura,
  };
}

export function temAvisosConclusao(c) {
  return c.semResposta.length + c.ncSemObservacao.length + c.ncSemFoto.length > 0 || c.semAssinatura;
}

// Lista "Minhas OS": hoje (em execução, agendadas para hoje ou atrasadas),
// próximas (futuras ou sem data) e concluídas (concluídas e canceladas).
export function classificarOS(lista, hoje = diaLocal()) {
  const r = { hoje: [], proximas: [], concluidas: [] };
  for (const os of lista) {
    if (os.status === 'concluida' || os.status === 'cancelada') r.concluidas.push(os);
    else if (os.status === 'em_execucao' || (os.agendada_para && os.agendada_para <= hoje)) r.hoje.push(os);
    else r.proximas.push(os);
  }
  const porData = (a, b) => String(a.agendada_para || '9999').localeCompare(String(b.agendada_para || '9999'))
    || String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt-BR');
  r.hoje.sort((a, b) => (a.status === 'em_execucao' ? 0 : 1) - (b.status === 'em_execucao' ? 0 : 1) || porData(a, b));
  r.proximas.sort(porData);
  r.concluidas.sort((a, b) => tempo(b.concluida_em || b.atualizado_em) - tempo(a.concluida_em || a.atualizado_em));
  return r;
}

export function atrasada(os, hoje = diaLocal()) {
  return os.status === 'aberta' && !!os.agendada_para && os.agendada_para < hoje;
}

// Progresso do checklist: respondidos / total.
export function progresso(os) {
  const lista = os?.checklist || [];
  return { feitos: lista.filter(i => i.resposta).length, total: lista.length };
}
