// Regras puras das ORDENS DE SERVIÇO de campo (versão 2.0, Fase 4J) — sem
// banco, sem disco e sem rede; testadas em testes/campo.test.js. O contrato
// com o app de campo está em docs/CAMPO-API.md; o controller
// (controllers/campoController.js) só carrega/grava e chama estas funções.
//
// Estado da OS que as operações alteram (vem da linha de ordens_servico):
//   { status, iniciada_em, concluida_em, checklist: [item], historico: [evento],
//     observacao_final, observacao_em, assinatura: { nome, documento, arquivo, assinada_em } | null,
//     inicio_lat, inicio_lon, conclusao_lat, conclusao_lon }
//   item = { id, grupo, texto, resposta, observacao, respondido_em, respondido_por, extra? }
// As fotos NÃO ficam no checklist: moram em os_fotos (item_id) e entram no
// objeto da OS na hora de devolver (osParaApi).

const STATUS_OS = ['aberta', 'em_execucao', 'concluida', 'cancelada'];
const ROTULO_STATUS_OS = { aberta: 'Aberta', em_execucao: 'Em execução', concluida: 'Concluída', cancelada: 'Cancelada' };
const TIPOS_OS = ['instalacao', 'manutencao', 'vistoria', 'visita', 'outro'];
const ROTULO_TIPO_OS = { instalacao: 'Instalação', manutencao: 'Manutenção', vistoria: 'Vistoria (laudo)', visita: 'Visita técnica', outro: 'Outro' };
const RESPOSTAS = ['conforme', 'nao_conforme', 'na'];
const ROTULO_RESPOSTA = { conforme: 'Conforme', nao_conforme: 'Não conforme', na: 'Não se aplica' };
const TIPOS_OPERACAO = ['criar_os', 'iniciar', 'responder', 'item_extra', 'observacao', 'assinar', 'concluir'];

const LIMITES = {
  titulo: 200, descricao: 5000, observacao_item: 2000, observacao_final: 5000, texto_item: 500, grupo: 100,
  itens_checklist: 500, nome_assinatura: 150, documento_assinatura: 30, legenda: 300,
  assinatura_bytes: 300 * 1024, foto_bytes: 8 * 1024 * 1024, fotos_por_os: 300, operacoes_por_envio: 200, historico: 2000,
};
// fotos e assinatura ainda chegam numa OS concluída há até 7 dias (app que ficou sem rede)
const DIAS_TOLERANCIA_CONCLUIDA = 7;
// relógio do aparelho adiantado: acima disto, vale a hora do servidor
const TOLERANCIA_FUTURO_MS = 5 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID_ITEM_RE = /^[A-Za-z0-9._-]{1,80}$/;
const ID_EXTRA_RE = /^x-[A-Za-z0-9._-]{1,78}$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

const uuidValido = (s) => typeof s === 'string' && UUID_RE.test(s);
const normalizarUuid = (s) => String(s).toLowerCase();
const texto = (v, max) => (v == null ? '' : String(v).replace(/\u0000/g, '').trim().slice(0, max));
const clonar = (x) => JSON.parse(JSON.stringify(x));

// ── número da OS ────────────────────────────────────────────────────────
// OS-AAAA-NNNN, sequencial por ano (passa de 9999 sem quebrar: OS-2026-10000).
// Quem chama trava a numeração (advisory lock) e calcula DENTRO da transação
// do INSERT: transação desfeita não consome número — sem buraco.
function formatarNumeroOS(ano, n) {
  return `OS-${ano}-${String(n).padStart(4, '0')}`;
}
function proximoNumeroOS(numeros, ano) {
  let maior = 0;
  const re = new RegExp(`^OS-${ano}-(\\d+)$`);
  for (const s of numeros || []) {
    const m = re.exec(String(s || ''));
    if (m) maior = Math.max(maior, Number(m[1]));
  }
  return maior + 1;
}

// ── arquivos: tipo pelos bytes iniciais (nunca pelo nome/mimetype) ─────
function tipoImagem(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (ehPng(buf)) return 'image/png';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function ehPng(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 24 && buf.subarray(0, 8).equals(ASSINATURA_PNG)
    && buf.toString('latin1', 12, 16) === 'IHDR';
}
const EXTENSAO = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// "data:image/png;base64,AAAA" ou só "AAAA" → Buffer (ou erro legível)
function decodificarPngBase64(s) {
  if (typeof s !== 'string' || !s) return { erro: 'A assinatura veio vazia.' };
  const limpo = s.replace(/^data:image\/png;base64,/i, '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(limpo)) return { erro: 'A assinatura não é uma imagem PNG válida.' };
  if (limpo.length > Math.ceil(LIMITES.assinatura_bytes / 3) * 4 + 4) return { erro: 'A imagem da assinatura passa de 300 KB.' };
  const buf = Buffer.from(limpo, 'base64');
  if (buf.length > LIMITES.assinatura_bytes) return { erro: 'A imagem da assinatura passa de 300 KB.' };
  if (!ehPng(buf)) return { erro: 'A assinatura não é uma imagem PNG válida.' };
  return { buffer: buf };
}

// ── datas e coordenadas ─────────────────────────────────────────────────
// Instante informado pelo aparelho: ISO válido; inválido ou adiantado demais
// (relógio errado) → hora do servidor. Devolve ISO em UTC.
function instanteDoAparelho(feitaEm, agora = new Date()) {
  const ag = new Date(agora);
  const d = feitaEm ? new Date(feitaEm) : null;
  if (!d || Number.isNaN(d.getTime()) || d.getTime() < Date.UTC(2020, 0, 1)) return ag.toISOString();
  if (d.getTime() > ag.getTime() + TOLERANCIA_FUTURO_MS) return ag.toISOString();
  return d.toISOString();
}
function coordenada(v, limite) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= limite ? Math.round(n * 1e6) / 1e6 : null;
}
const latitude = (v) => coordenada(v, 90);
const longitude = (v) => coordenada(v, 180);
function dataOuNull(v) {
  if (v == null || v === '') return { valor: null };
  const s = String(v).slice(0, 10);
  if (!DATA_RE.test(s) || Number.isNaN(new Date(`${s}T12:00:00Z`).getTime())) return { erro: 'Data inválida (use AAAA-MM-DD).' };
  return { valor: s };
}
const instanteMs = (v) => (v ? new Date(v).getTime() : NaN);

// ── modelos de checklist ────────────────────────────────────────────────
const MODELO_GENERICO = {
  chave: 'generico',
  rotulo: 'Genérico (qualquer serviço)',
  disciplina: null,
  itens: [
    { id: 'g1', grupo: 'Chegada e segurança', texto: 'Chegada ao local registrada e acesso liberado pelo cliente' },
    { id: 'g2', grupo: 'Chegada e segurança', texto: 'EPI em uso e APR (análise preliminar de risco) feita' },
    { id: 'g3', grupo: 'Chegada e segurança', texto: 'Energia desligada e bloqueada (bloqueio e etiqueta) quando aplicável' },
    { id: 'g4', grupo: 'Execução', texto: 'Serviço executado conforme projeto e escopo da OS' },
    { id: 'g5', grupo: 'Execução', texto: 'Teste de funcionamento realizado' },
    { id: 'g6', grupo: 'Encerramento', texto: 'Local limpo e organizado, sobras e resíduos recolhidos' },
    { id: 'g7', grupo: 'Encerramento', texto: 'Cliente orientado sobre o serviço executado e o uso' },
  ],
};

// checklistBase das skills ({ cod, secao, item, requisito, ... }) ou já no
// formato { id, grupo, texto } → [{ id, grupo, texto }]; ids repetidos ou
// fora do padrão ganham um id seguro.
function normalizarChecklistBase(lista) {
  const saida = [];
  const usados = new Set();
  (Array.isArray(lista) ? lista : []).forEach((x, i) => {
    if (!x || typeof x !== 'object') return;
    const t = texto(x.texto ?? x.item ?? x.descricao, LIMITES.texto_item);
    if (!t) return;
    let id = String(x.id ?? x.cod ?? '').trim();
    if (!ID_ITEM_RE.test(id) || id.startsWith('x-') || usados.has(id)) id = `i${i + 1}`;
    while (usados.has(id)) id = `${id}_`;
    usados.add(id);
    saida.push({ id, grupo: texto(x.grupo ?? x.secao, LIMITES.grupo) || 'Geral', texto: t });
  });
  return saida.slice(0, LIMITES.itens_checklist);
}

// itens do modelo → checklist vazio da OS
function checklistDoModelo(itens) {
  return normalizarChecklistBase(itens).map(i => ({ ...i, resposta: null, observacao: '', respondido_em: null, respondido_por: null }));
}

// ── dados da OS (escritório e criar_os) ─────────────────────────────────
// Junta o pedido sobre a OS atual (campo ausente fica como está).
// `disciplinas`: chaves válidas (utils/disciplinasLaudo). Não confere o
// responsável no banco — quem chama confere.
function validarDadosOS(body, atual = {}, { disciplinas = [] } = {}) {
  const b = body || {};
  const tem = (k) => Object.prototype.hasOwnProperty.call(b, k);
  const d = {
    titulo: tem('titulo') ? texto(b.titulo, LIMITES.titulo) : atual.titulo,
    descricao: tem('descricao') ? (texto(b.descricao, LIMITES.descricao) || null) : (atual.descricao ?? null),
    tipo: tem('tipo') && b.tipo ? String(b.tipo) : (atual.tipo || 'outro'),
    disciplina: tem('disciplina') ? (b.disciplina ? String(b.disciplina) : null) : (atual.disciplina ?? null),
    responsavel_id: atual.responsavel_id ?? null,
    agendada_para: atual.agendada_para ?? null,
  };
  if (!d.titulo) return { erro: 'Informe o título da OS.' };
  if (!TIPOS_OS.includes(d.tipo)) return { erro: 'Tipo de OS inválido (use instalacao, manutencao, vistoria, visita ou outro).' };
  if (d.disciplina && !disciplinas.includes(d.disciplina)) return { erro: 'Disciplina inválida.' };
  if (tem('responsavel_id')) {
    const v = b.responsavel_id;
    if (v == null || v === '') d.responsavel_id = null;
    else {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 2147483647) return { erro: 'Responsável inválido.' };
      d.responsavel_id = n;
    }
  }
  if (tem('agendada_para')) {
    const r = dataOuNull(b.agendada_para);
    if (r.erro) return { erro: r.erro };
    d.agendada_para = r.valor;
  }
  return { dados: d };
}

// Chave do modelo pedido: 'generico', uma disciplina, '' / 'nenhum' = sem
// checklist; ausente → o da disciplina (se houver) ou o genérico.
function chaveModelo(pedido, disciplina) {
  if (pedido === undefined || pedido === null) return disciplina || 'generico';
  const s = String(pedido).trim();
  if (s === '' || s === 'nenhum') return null;
  return s;
}

// ── quem vê / quem edita ────────────────────────────────────────────────
// Admin vê tudo; os demais: responsável pela OS ou dono da obra (obra sem
// dono = livre, como na posse das outras rotas de obra).
function podeVerOS(usuario, os, obra) {
  if (!usuario) return false;
  if (usuario.role === 'admin') return true;
  if (os && os.responsavel_id != null && os.responsavel_id === usuario.id) return true;
  return !!obra && (obra.usuario_id == null || obra.usuario_id === usuario.id);
}
// Editar pelo escritório (PUT) e criar pela obra: dono da obra ou admin.
function podeEditarOS(usuario, obra) {
  if (!usuario) return false;
  return usuario.role === 'admin' || (!!obra && (obra.usuario_id == null || obra.usuario_id === usuario.id));
}

// ── aplicar uma operação de campo sobre o estado ────────────────────────
function recusa(erro) { return { ok: false, erro }; }

function dentroDaTolerancia(estado, agora) {
  const fim = instanteMs(estado.concluida_em);
  return Number.isFinite(fim) && new Date(agora).getTime() - fim <= DIAS_TOLERANCIA_CONCLUIDA * 86400000;
}

// O que pode chegar numa OS em cada status (fotos usam a mesma regra, tipo 'foto').
function conferirStatus(estado, tipo, agora) {
  if (estado.status === 'cancelada') return 'Esta OS foi cancelada pelo escritório; nada mais pode ser registrado nela.';
  if (estado.status === 'concluida') {
    if (tipo === 'assinar' || tipo === 'foto') {
      return dentroDaTolerancia(estado, agora) ? null
        : `Esta OS foi concluída há mais de ${DIAS_TOLERANCIA_CONCLUIDA} dias; não recebe mais ${tipo === 'foto' ? 'fotos' : 'assinatura'}.`;
    }
    return 'Esta OS já foi concluída; não pode mais ser alterada.';
  }
  return null;
}

function registrarHistorico(estado, evento) {
  estado.historico = Array.isArray(estado.historico) ? estado.historico : [];
  estado.historico.push(evento);
  if (estado.historico.length > LIMITES.historico) estado.historico = estado.historico.slice(-LIMITES.historico);
}

/**
 * Aplica `op` ({ tipo, feita_em, dados }) ao `estado` (não altera o original).
 * ctx: { agora, usuario_id, usuario_nome }.
 * → { ok: true, estado, mudou, efeitos: { assinaturaPng? } } | { ok: false, erro }
 */
function aplicarOperacao(estadoAtual, op, ctx = {}) {
  const agora = ctx.agora ? new Date(ctx.agora) : new Date();
  const tipo = op?.tipo;
  if (!TIPOS_OPERACAO.includes(tipo) || tipo === 'criar_os') return recusa('Tipo de operação desconhecido.');
  const dados = (op.dados && typeof op.dados === 'object' && !Array.isArray(op.dados)) ? op.dados : {};
  const quando = instanteDoAparelho(op.feita_em, agora);
  const erroStatus = conferirStatus(estadoAtual, tipo, agora);
  if (erroStatus) return recusa(erroStatus);

  const e = clonar(estadoAtual);
  e.checklist = Array.isArray(e.checklist) ? e.checklist : [];
  const quem = ctx.usuario_id ?? null;
  const efeitos = {};

  switch (tipo) {
    case 'iniciar': {
      if (e.status !== 'aberta') return recusa('A OS já foi iniciada.');
      e.status = 'em_execucao';
      e.iniciada_em = quando;
      e.inicio_lat = latitude(dados.lat);
      e.inicio_lon = longitude(dados.lon);
      break;
    }
    case 'concluir': {
      if (e.status === 'aberta') { // concluída sem ter sido iniciada no aparelho: inicia e conclui
        e.iniciada_em = quando;
        e.inicio_lat = latitude(dados.lat);
        e.inicio_lon = longitude(dados.lon);
      }
      e.status = 'concluida';
      // conclusão não pode ficar antes do início (relógios diferentes entre aparelhos)
      e.concluida_em = instanteMs(quando) < instanteMs(e.iniciada_em) ? e.iniciada_em : quando;
      e.conclusao_lat = latitude(dados.lat);
      e.conclusao_lon = longitude(dados.lon);
      break;
    }
    case 'responder': {
      const item = e.checklist.find(i => i.id === dados.item_id);
      if (!item) return recusa('Item do checklist não encontrado nesta OS.');
      const resposta = dados.resposta == null || dados.resposta === '' ? null : String(dados.resposta);
      if (resposta !== null && !RESPOSTAS.includes(resposta)) return recusa('Resposta inválida (use conforme, nao_conforme ou na).');
      const nova = { resposta, observacao: texto(dados.observacao, LIMITES.observacao_item), respondido_em: quando, respondido_por: quem };
      const atualEm = instanteMs(item.respondido_em);
      if (Number.isFinite(atualEm) && instanteMs(quando) < atualEm) {
        // chegou atrasada uma resposta MAIS ANTIGA que a gravada: vale a gravada; a antiga vai para o histórico
        registrarHistorico(e, { tipo: 'resposta_substituida', item_id: item.id, ...nova, substituida_em: agora.toISOString(), motivo: 'mais_antiga' });
        return { ok: true, estado: e, mudou: true, efeitos };
      }
      if (item.respondido_em || item.resposta != null || item.observacao) {
        registrarHistorico(e, {
          tipo: 'resposta_substituida', item_id: item.id, resposta: item.resposta ?? null, observacao: item.observacao || '',
          respondido_em: item.respondido_em ?? null, respondido_por: item.respondido_por ?? null,
          substituida_em: agora.toISOString(), motivo: 'nova_resposta',
        });
      }
      Object.assign(item, nova);
      break;
    }
    case 'item_extra': {
      const id = String(dados.item_id || '');
      if (!ID_EXTRA_RE.test(id)) return recusa('Identificador do item extra inválido (deve começar com "x-").');
      const t = texto(dados.texto, LIMITES.texto_item);
      if (!t) return recusa('Informe o texto do item extra.');
      const existente = e.checklist.find(i => i.id === id);
      if (existente) {
        if (existente.texto === t) return { ok: true, estado: e, mudou: false, efeitos };
        return recusa('Já existe outro item com este identificador nesta OS.');
      }
      if (e.checklist.length >= LIMITES.itens_checklist) return recusa(`O checklist chegou ao limite de ${LIMITES.itens_checklist} itens.`);
      e.checklist.push({
        id, grupo: texto(dados.grupo, LIMITES.grupo) || 'Extras', texto: t,
        resposta: null, observacao: '', respondido_em: null, respondido_por: null, extra: true, criado_em: quando, criado_por: quem,
      });
      break;
    }
    case 'observacao': {
      const t = texto(dados.texto, LIMITES.observacao_final);
      const atualEm = instanteMs(e.observacao_em);
      if (Number.isFinite(atualEm) && instanteMs(quando) < atualEm) {
        registrarHistorico(e, { tipo: 'observacao_substituida', texto: t, feita_em: quando, por: quem, substituida_em: agora.toISOString(), motivo: 'mais_antiga' });
        return { ok: true, estado: e, mudou: true, efeitos };
      }
      if (e.observacao_final) {
        registrarHistorico(e, { tipo: 'observacao_substituida', texto: e.observacao_final, feita_em: e.observacao_em ?? null, substituida_em: agora.toISOString(), motivo: 'nova_observacao' });
      }
      e.observacao_final = t;
      e.observacao_em = quando;
      break;
    }
    case 'assinar': {
      const nome = texto(dados.nome, LIMITES.nome_assinatura);
      if (!nome) return recusa('Informe o nome de quem assinou.');
      const documento = texto(dados.documento, LIMITES.documento_assinatura) || null;
      const png = decodificarPngBase64(dados.png_base64);
      if (png.erro) return recusa(png.erro);
      if (e.assinatura) {
        const atualEm = instanteMs(e.assinatura.assinada_em);
        if (Number.isFinite(atualEm) && instanteMs(quando) < atualEm) {
          registrarHistorico(e, { tipo: 'assinatura_substituida', nome, documento, assinada_em: quando, substituida_em: agora.toISOString(), motivo: 'mais_antiga' });
          return { ok: true, estado: e, mudou: true, efeitos };
        }
        registrarHistorico(e, { tipo: 'assinatura_substituida', ...e.assinatura, substituida_em: agora.toISOString(), motivo: 'nova_assinatura' });
      }
      // `arquivo` é preenchido por quem grava o PNG no disco
      e.assinatura = { nome, documento, arquivo: null, assinada_em: quando, por: quem };
      efeitos.assinaturaPng = png.buffer;
      break;
    }
    default:
      return recusa('Tipo de operação desconhecido.');
  }
  return { ok: true, estado: e, mudou: true, efeitos };
}

// Foto chegando: a OS ainda aceita? (mesma regra de status das operações)
function conferirFoto(estado, agora = new Date()) {
  return conferirStatus(estado, 'foto', agora);
}

// Campos de uma foto vindos do multipart (texto) → valores gravados.
function dadosDaFoto(body = {}, agora = new Date()) {
  const uuid = body.uuid;
  if (!uuidValido(uuid)) return { erro: 'Identificador (uuid) da foto inválido.' };
  const itemId = body.item_id == null || body.item_id === '' || body.item_id === 'null' ? null : String(body.item_id);
  if (itemId !== null && !ID_ITEM_RE.test(itemId)) return { erro: 'Item do checklist inválido.' };
  return {
    dados: {
      uuid: normalizarUuid(uuid), item_id: itemId, legenda: texto(body.legenda, LIMITES.legenda) || null,
      tirada_em: instanteDoAparelho(body.tirada_em, agora), lat: latitude(body.lat), lon: longitude(body.lon),
    },
  };
}

// ── objeto da OS devolvido pela API (docs/CAMPO-API.md) ────────────────
const iso = (v) => (v ? new Date(v).toISOString() : null);
const dataCurta = (v) => {
  if (!v) return null;
  if (!(v instanceof Date)) return String(v).slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
};

function fotoParaApi(f) {
  return {
    uuid: f.uuid, item_id: f.item_id ?? null, legenda: f.legenda || '', tirada_em: iso(f.tirada_em),
    lat: f.lat == null ? null : Number(f.lat), lon: f.lon == null ? null : Number(f.lon),
    tamanho: f.tamanho ?? null, enviada: true, url: `/api/campo/fotos/${f.uuid}`,
  };
}

/**
 * row: linha de ordens_servico (+ obra_codigo, obra_nome, obra_cliente_nome,
 * obra_local, responsavel_nome, criado_por_nome); fotos: linhas de os_fotos.
 * opcoes.historico: inclui o histórico de respostas substituídas.
 */
function osParaApi(row, fotos = [], opcoes = {}) {
  const lista = (fotos || []).map(fotoParaApi);
  const porItem = new Map();
  for (const f of lista) if (f.item_id) porItem.set(f.item_id, [...(porItem.get(f.item_id) || []), f.uuid]);
  const checklist = (Array.isArray(row.checklist) ? row.checklist : []).map(i => ({
    id: i.id, grupo: i.grupo, texto: i.texto, resposta: i.resposta ?? null, observacao: i.observacao || '',
    fotos: porItem.get(i.id) || [], respondido_em: i.respondido_em ?? null, ...(i.extra ? { extra: true } : {}),
  }));
  const a = row.assinatura_nome ? {
    nome: row.assinatura_nome, documento: row.assinatura_documento || '', assinada_em: iso(row.assinada_em),
    url: `/api/campo/os/${row.id}/assinatura`,
  } : null;
  const saida = {
    id: row.id, uuid: row.uuid, numero: row.numero, obra_id: row.obra_id,
    obra: { id: row.obra_id, codigo: row.obra_codigo ?? null, nome: row.obra_nome ?? null, cliente_nome: row.obra_cliente_nome ?? null, endereco: row.obra_local ?? null },
    titulo: row.titulo, descricao: row.descricao || '', tipo: row.tipo, disciplina: row.disciplina ?? null,
    modelo_checklist: row.modelo_checklist ?? null, status: row.status,
    responsavel_id: row.responsavel_id ?? null, responsavel_nome: row.responsavel_nome ?? null,
    agendada_para: dataCurta(row.agendada_para), iniciada_em: iso(row.iniciada_em), concluida_em: iso(row.concluida_em),
    cancelada_em: iso(row.cancelada_em),
    checklist, fotos: lista, assinatura: a, observacao_final: row.observacao_final || '',
    inicio: row.inicio_lat == null ? null : { lat: Number(row.inicio_lat), lon: Number(row.inicio_lon) },
    conclusao: row.conclusao_lat == null ? null : { lat: Number(row.conclusao_lat), lon: Number(row.conclusao_lon) },
    resumo: resumoChecklist(checklist),
    versao: row.versao, criado_por: row.criado_por ?? null, criado_por_nome: row.criado_por_nome ?? null,
    criado_em: iso(row.criado_em), atualizado_em: iso(row.atualizado_em),
  };
  if (opcoes.historico) saida.historico = Array.isArray(row.historico) ? row.historico : [];
  return saida;
}

function resumoChecklist(checklist) {
  const r = { total: 0, respondidos: 0, conforme: 0, nao_conforme: 0, na: 0 };
  for (const i of checklist || []) {
    r.total++;
    if (i.resposta) { r.respondidos++; r[i.resposta]++; }
  }
  return r;
}

// "abertas" na lista do técnico: aberta + em execução + concluídas nos últimos 7 dias
function filtroAbertas(agora = new Date()) {
  return { status: ['aberta', 'em_execucao'], concluidasDesde: new Date(new Date(agora).getTime() - DIAS_TOLERANCIA_CONCLUIDA * 86400000).toISOString() };
}

module.exports = {
  STATUS_OS, ROTULO_STATUS_OS, TIPOS_OS, ROTULO_TIPO_OS, RESPOSTAS, ROTULO_RESPOSTA, TIPOS_OPERACAO, LIMITES,
  DIAS_TOLERANCIA_CONCLUIDA, MODELO_GENERICO, EXTENSAO,
  uuidValido, normalizarUuid, formatarNumeroOS, proximoNumeroOS, tipoImagem, ehPng, decodificarPngBase64,
  instanteDoAparelho, latitude, longitude, dataOuNull, normalizarChecklistBase, checklistDoModelo,
  validarDadosOS, chaveModelo, podeVerOS, podeEditarOS, aplicarOperacao, conferirFoto, dadosDaFoto,
  osParaApi, fotoParaApi, resumoChecklist, filtroAbertas,
};
