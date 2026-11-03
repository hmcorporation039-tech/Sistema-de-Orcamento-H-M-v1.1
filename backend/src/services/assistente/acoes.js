// Ações que o assistente NÃO executa sozinho (decisão do usuário, 27/10/2026):
// aprovar/mudar status, enviar e-mail, gerar link de aprovação, excluir,
// alterar proposta/projeto/análise que ele não criou nesta conversa e mudar
// preço do catálogo ou da base de serviços.
//
// O MCP do assistente só tem `propor_acao`: grava a ação PENDENTE com o tipo, o
// alvo e os dados. O servidor confere o tipo e os dados AQUI, lê o alvo no banco
// e monta o resumo que o usuário vê no cartão ("Mudar o status da proposta P254
// — Escola X, R$ 12.345,67 — de Ativa para Aprovada"): o texto do modelo vai
// como justificativa, mas o que será feito é descrito pelo servidor.
//
// "Aplicar" (clique do usuário) executa a ação pela MESMA rota HTTP que a tela
// usa, com o token do próprio usuário (Authorization do clique) — posse, admin,
// validação, limites e auditoria são os de sempre. O assistente não tem rota
// para aplicar (o token dele é recusado em /assistente/acoes/*).
const crypto = require('crypto');
const pool = require('../../config/database');
const { EMPRESA } = require('../../utils/pdfTemplate');
const { propostaParaPayload, aplicarOperacoes, payloadParaEnvio, mesclarDados, ErroRascunho, cortarTexto, citar } = require('../../utils/assistenteRascunho');
const { revisarProposta } = require('../revisaoPreEnvio');

class ErroAcao extends Error {
  constructor(msg, status = 400) { super(msg); this.status = status; }
}

const STATUS_PROPOSTA = ['Ativa', 'Aprovada', 'Recusada', 'Cancelada'];
// dinheiro em reais: a formatação única do pacote comum (utils/htmlPdf.js → skills/_comum/base)
const { formatarMoeda: brl } = require('../../utils/htmlPdf');
const emailValido = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const idValido = (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 2147483647;

async function proposta(id) {
  const { rows: [p] } = await pool.query('SELECT id, numero, cliente_nome, total, status FROM propostas WHERE id = $1', [id]);
  if (!p) throw new ErroAcao(`Proposta #${id} não encontrada.`, 404);
  return p;
}
// Valor de um campo no resumo do cartão (texto cortado em ~600 caracteres)
const valorNoResumo = (v) => {
  if (v == null || v === '') return '(vazio)';
  if (typeof v === 'string') return citar(v);
  if (typeof v === 'object') return cortarTexto(JSON.stringify(v));
  return String(v);
};
const rotuloProposta = (p) => `${p.numero} — ${p.cliente_nome || 'sem cliente'}, ${brl(p.total)} (${p.status})`;

// Conferência antes do envio (services/revisaoPreEnvio.js, a mesma do ModalEnviarEmail
// da tela) para o e-mail e o link de aprovação pedidos pelo assistente. Bloqueio
// (sem itens, total zerado, total que não bate com os itens) recusa a ação, salvo
// `confirmar_bloqueio: true` no payload — o usuário pediu para enviar mesmo assim;
// avisos (a cotar, BDI 0 %, validade vencida...) vão no resumo do cartão.
const CAMPO_CONFIRMACAO = 'confirmar_bloqueio';
async function conferirEnvio(id, confirmado, { noClique = false } = {}) {
  const revisao = await revisarProposta(id, pool);
  const achados = revisao?.achados || [];
  const bloqueios = achados.filter(a => a.nivel === 'bloqueio');
  if (bloqueios.length && !confirmado) {
    throw new ErroAcao(`Conferência antes do envio: ${bloqueios.map(b => b.mensagem).join(' ')} `
      + (noClique
        ? 'A proposta mudou depois que o cartão foi preparado. Corrija a proposta e peça a ação de novo.'
        : `Corrija a proposta antes, ou, se o usuário pedir explicitamente para enviar assim mesmo, proponha de novo com dados.${CAMPO_CONFIRMACAO}: true.`));
  }
  const linhas = achados.filter(a => a.nivel !== 'info').map(a => `${a.nivel === 'bloqueio' ? 'BLOQUEIO (enviar mesmo assim, a pedido do usuário)' : 'Atenção'}: ${a.mensagem}`);
  return { bloqueios: bloqueios.length, texto: linhas.length ? `\nConferência antes do envio:\n${linhas.join('\n')}` : '' };
}
const confirmouBloqueio = (dados) => dados?.[CAMPO_CONFIRMACAO] === true;
const semConfirmacao = ({ [CAMPO_CONFIRMACAO]: _c, ...resto }) => resto;

async function analise(id) {
  const { rows: [a] } = await pool.query('SELECT id, cliente_nome, nome_projeto, finalidade, funcionamento, obra_id FROM analises_projeto WHERE id = $1', [id]);
  if (!a) throw new ErroAcao(`Análise #${id} não encontrada.`, 404);
  return a;
}
async function projeto(id) {
  const { rows: [l] } = await pool.query('SELECT id, tipo, disciplina, titulo, dados, entregas FROM laudos_projetos WHERE id = $1', [id]);
  if (!l) throw new ErroAcao(`Projeto/laudo #${id} não encontrado.`, 404);
  return l;
}

// Cada tipo: alvo, rótulo, `preparar(alvoId, payload)` → { payload limpo, resumo }
// e `executar(alvoId, payload, api)` → resultado (api = chamada HTTP com o token do usuário)
const TIPOS = {
  mudar_status_proposta: {
    alvo: 'proposta', rotulo: 'Mudar o status da proposta',
    async preparar(id, dados) {
      if (!STATUS_PROPOSTA.includes(dados.status)) throw new ErroAcao(`Status inválido. Use: ${STATUS_PROPOSTA.join(', ')}.`);
      const p = await proposta(id);
      if (p.status === dados.status) throw new ErroAcao(`A proposta ${p.numero} já está ${p.status}.`);
      return { payload: { status: dados.status }, resumo: `Mudar o status da proposta ${rotuloProposta(p)} para ${dados.status}.` };
    },
    executar: (id, d, api) => api('PATCH', `/api/propostas/${id}/status`, { status: d.status }),
  },
  enviar_email_proposta: {
    alvo: 'proposta', rotulo: 'Enviar a proposta por e-mail',
    async preparar(id, dados) {
      if (!emailValido(dados.destinatario)) throw new ErroAcao('Informe um e-mail de destino válido.');
      if (dados.mensagem != null && (typeof dados.mensagem !== 'string' || dados.mensagem.length > 10000)) throw new ErroAcao('Mensagem do e-mail inválida (até 10.000 caracteres).');
      const p = await proposta(id);
      const conferencia = await conferirEnvio(id, confirmouBloqueio(dados));
      // o cartão mostra o e-mail INTEIRO que vai sair (mesmo assunto e corpo de
      // propostaDocumentos.enviarEmail): antes dizia só "com a mensagem
      // proposta" e o usuário aprovava sem ler o texto que o assistente escreveu
      const corpo = (dados.mensagem && dados.mensagem.trim()) || `Olá,\nSegue em anexo a proposta ${p.numero}.`;
      return {
        payload: {
          destinatario: dados.destinatario, ...(dados.mensagem ? { mensagem: dados.mensagem } : {}),
          ...(conferencia.bloqueios ? { [CAMPO_CONFIRMACAO]: true } : {}),
        },
        resumo: `Enviar a proposta ${rotuloProposta(p)} por e-mail.\n`
          + `Para: ${dados.destinatario}\n`
          + `Assunto: Proposta ${p.numero} — ${EMPRESA.nomeFantasia}\n`
          + `Texto: ${citar(corpo)} (+ assinatura padrão da empresa)\n`
          + `Anexo: PDF da proposta ${p.numero}`
          + conferencia.texto,
      };
    },
    // confere de novo no clique: a proposta pode ter mudado depois do cartão
    async executar(id, d, api) {
      await conferirEnvio(id, confirmouBloqueio(d), { noClique: true });
      return api('POST', `/api/propostas/${id}/enviar-email`, semConfirmacao(d));
    },
  },
  gerar_link_aprovacao: {
    alvo: 'proposta', rotulo: 'Gerar link de aprovação',
    async preparar(id, dados) {
      const dias = dados.dias == null ? null : Number(dados.dias);
      if (dias != null && (!Number.isInteger(dias) || dias < 1 || dias > 90)) throw new ErroAcao('Validade do link inválida (1 a 90 dias).');
      const p = await proposta(id);
      const conferencia = await conferirEnvio(id, confirmouBloqueio(dados));
      return {
        payload: { ...(dias ? { dias } : {}), ...(conferencia.bloqueios ? { [CAMPO_CONFIRMACAO]: true } : {}) },
        resumo: `Gerar um link de aprovação para o cliente da proposta ${rotuloProposta(p)}${dias ? `, válido por ${dias} dias` : ''}.${conferencia.texto}`,
      };
    },
    async executar(id, d, api) {
      await conferirEnvio(id, confirmouBloqueio(d), { noClique: true });
      return api('POST', `/api/propostas/${id}/link-aprovacao`, semConfirmacao(d));
    },
  },
  // Fase 6: o pacote de entrega do PROJETO (ZIP com as entregas escolhidas) por e-mail, pela rota
  // POST /laudos/:id/enviar-email (routes/v2/canalEnvioProjeto.js — posse, limite de envio, auditoria).
  enviar_email_projeto: {
    alvo: 'projeto', rotulo: 'Enviar o projeto por e-mail',
    async preparar(id, dados) {
      if (!emailValido(dados.destinatario)) throw new ErroAcao('Informe um e-mail de destino válido.');
      if (dados.mensagem != null && (typeof dados.mensagem !== 'string' || dados.mensagem.length > 10000)) throw new ErroAcao('Mensagem do e-mail inválida (até 10.000 caracteres).');
      const l = await projeto(id);
      if (l.tipo !== 'projeto') throw new ErroAcao(`O registro #${l.id} é um laudo: só o projeto tem pacote de entrega para enviar. O laudo sai pela tela.`);
      const itens = itensDaEntrega(dados.itens, l);
      if (itens.erro) throw new ErroAcao(itens.erro);
      const revisao = l.dados?.meta?.revisao;
      const corpo = (dados.mensagem && dados.mensagem.trim()) || textoPadraoProjeto(l);
      const avisos = [];
      if (!revisao) avisos.push('Atenção: o projeto está sem número de revisão.');
      if (!l.dados || !Object.keys(l.dados).length) avisos.push('Atenção: o formulário do projeto está vazio.');
      return {
        payload: { destinatario: dados.destinatario, itens: itens.lista, ...(dados.mensagem ? { mensagem: dados.mensagem } : {}) },
        resumo: `Enviar por e-mail o pacote de entrega (ZIP) do projeto #${l.id} de ${l.disciplina} (${l.titulo || 'sem título'})${revisao ? `, revisão ${revisao}` : ''}.\n`
          + `Para: ${dados.destinatario}\n`
          + `Assunto: Projeto ${l.titulo || `#${l.id}`} — ${EMPRESA.nomeFantasia}\n`
          + `Texto: ${citar(corpo)} (+ assinatura padrão da empresa)\n`
          + `Anexo: ${itens.rotulos.join(', ')}`
          + (avisos.length ? `\n${avisos.join('\n')}` : ''),
      };
    },
    executar: (id, d, api) => api('POST', `/api/laudos/${id}/enviar-email`, d),
  },
  excluir_proposta: {
    alvo: 'proposta', rotulo: 'Excluir a proposta',
    async preparar(id) { const p = await proposta(id); return { payload: {}, resumo: `EXCLUIR a proposta ${rotuloProposta(p)} (fica uma cópia na auditoria).` }; },
    executar: (id, d, api) => api('DELETE', `/api/propostas/${id}`),
  },
  excluir_analise: {
    alvo: 'analise', rotulo: 'Excluir a análise de projeto',
    async preparar(id) { const a = await analise(id); return { payload: {}, resumo: `EXCLUIR a análise de projeto #${a.id} (${a.nome_projeto || a.cliente_nome || 'sem nome'}); a pasta vai para _Excluídos.` }; },
    executar: (id, d, api) => api('DELETE', `/api/projetos/analises/${id}`),
  },
  excluir_projeto: {
    alvo: 'projeto', rotulo: 'Excluir o projeto/laudo',
    async preparar(id) { const l = await projeto(id); return { payload: {}, resumo: `EXCLUIR o ${l.tipo} #${l.id} de ${l.disciplina} (${l.titulo || 'sem título'}); a pasta vai para _Excluídos.` }; },
    executar: (id, d, api) => api('DELETE', `/api/laudos/${id}`),
  },
  editar_proposta: {
    alvo: 'proposta', rotulo: 'Alterar a proposta',
    async preparar(id, dados) {
      const p = await proposta(id);
      const completa = await lerPropostaCompleta(id);
      let resumo;
      try { ({ resumo } = aplicarOperacoes(propostaParaPayload(completa), dados.operacoes || {})); } catch (e) {
        if (e instanceof ErroRascunho) throw new ErroAcao(e.message);
        throw e;
      }
      return { payload: { operacoes: dados.operacoes }, resumo: `Alterar a proposta ${rotuloProposta(p)}: ${resumo.join('; ')}.` };
    },
    async executar(id, d, api) {
      const atual = await api('GET', `/api/propostas/${id}`);
      const { payload } = aplicarOperacoes(propostaParaPayload(atual), d.operacoes || {});
      return api('PUT', `/api/propostas/${id}`, payloadParaEnvio(payload));
    },
  },
  atualizar_projeto: {
    alvo: 'projeto', rotulo: 'Alterar os dados do projeto',
    async preparar(id, dados) {
      const l = await projeto(id);
      if (!dados.dados || typeof dados.dados !== 'object' || Array.isArray(dados.dados)) throw new ErroAcao('Informe "dados" (objeto com os campos a alterar).');
      if (JSON.stringify(dados.dados).length > 200000) throw new ErroAcao('Dados grandes demais para uma ação.');
      // antes → depois de cada campo (depois = como fica mesclado, igual ao executar)
      let final;
      try { final = mesclarDados(l.dados || {}, dados.dados); } catch (e) {
        if (e instanceof ErroRascunho) throw new ErroAcao(e.message);
        throw e;
      }
      const chaves = Object.keys(dados.dados);
      const mudancas = chaves.slice(0, 12).map(k => `${k}: ${valorNoResumo((l.dados || {})[k])} → ${valorNoResumo(final[k])}`);
      if (chaves.length > 12) mudancas.push(`(+${chaves.length - 12} campos)`);
      return { payload: { dados: dados.dados }, resumo: `Alterar o ${l.tipo} #${l.id} de ${l.disciplina} (${l.titulo || 'sem título'}):\n${mudancas.join('\n')}` };
    },
    async executar(id, d, api) {
      const atual = await api('GET', `/api/laudos/${id}`);
      return api('PUT', `/api/laudos/${id}`, { dados: mesclarDados(atual.dados || {}, d.dados), versao: atual.versao });
    },
  },
  atualizar_analise: {
    alvo: 'analise', rotulo: 'Alterar a análise de projeto',
    async preparar(id, dados) {
      const a = await analise(id);
      const permitidos = ['cliente_nome', 'nome_projeto', 'finalidade', 'funcionamento', 'obra_id'];
      const payload = Object.fromEntries(Object.entries(dados || {}).filter(([k]) => permitidos.includes(k)));
      if (!Object.keys(payload).length) throw new ErroAcao(`Informe ao menos um destes campos: ${permitidos.join(', ')}.`);
      if (payload.finalidade != null && !['orcamento', 'elaboracao'].includes(payload.finalidade)) throw new ErroAcao('Finalidade inválida (orcamento ou elaboracao).');
      const mudancas = Object.entries(payload).map(([k, v]) => `${k}: ${valorNoResumo(a[k])} → ${valorNoResumo(v)}`);
      return { payload, resumo: `Alterar a análise #${a.id} (${a.nome_projeto || a.cliente_nome || 'sem nome'}):\n${mudancas.join('\n')}` };
    },
    executar: (id, d, api) => api('PUT', `/api/projetos/analises/${id}`, d),
  },
  alterar_preco_material: {
    alvo: 'material', rotulo: 'Mudar o preço no catálogo',
    async preparar(id, dados) {
      const preco = Number(dados.preco);
      if (!Number.isFinite(preco) || preco < 0) throw new ErroAcao('Preço inválido.');
      const { rows: [m] } = await pool.query('SELECT id, descricao, preco, unidade FROM materiais WHERE id = $1 AND ativo = true', [id]);
      if (!m) throw new ErroAcao(`Material #${id} não encontrado no catálogo.`, 404);
      const pc = dados.preco_compra == null ? undefined : Number(dados.preco_compra);
      if (pc !== undefined && (!Number.isFinite(pc) || pc < 0)) throw new ErroAcao('Preço de compra inválido.');
      return {
        payload: { preco, ...(pc !== undefined ? { preco_compra: pc } : {}) },
        resumo: `Mudar o preço de venda no catálogo de "${m.descricao}" (${m.unidade || 'un'}) de ${brl(m.preco)} para ${brl(preco)}${pc !== undefined ? ` e o de compra para ${brl(pc)}` : ''}.`,
      };
    },
    async executar(id, d, api) {
      // a rota do catálogo grava o cadastro inteiro: os outros campos vão como estão
      const { rows: [m] } = await pool.query('SELECT codigo, descricao, categoria, unidade, preco, preco_compra, marca, ncm FROM materiais WHERE id = $1 AND ativo = true', [id]);
      if (!m) throw new ErroAcao('Material não encontrado no catálogo.', 404);
      return api('PUT', `/api/materiais/${id}`, { ...m, preco: d.preco, preco_compra: d.preco_compra !== undefined ? d.preco_compra : m.preco_compra });
    },
  },
  alterar_preco_servico: {
    alvo: 'servico', rotulo: 'Mudar o preço da base de serviços',
    async preparar(id, dados) {
      const codigo = String(dados.codigo || '').trim();
      const valor = Number(dados.valor_referencia);
      if (!codigo) throw new ErroAcao('Informe o código do serviço.');
      if (!Number.isFinite(valor) || valor < 0) throw new ErroAcao('Valor inválido.');
      const { rows: [s] } = await pool.query('SELECT codigo, descricao, unidade, valor_referencia FROM precos_mao_de_obra_referencia WHERE codigo = $1', [codigo]);
      if (!s) throw new ErroAcao(`Serviço ${codigo} não encontrado na base.`, 404);
      return {
        payload: { codigo, valor_referencia: valor },
        resumo: `Mudar o valor H&M adotado do serviço ${s.codigo} "${s.descricao}" (${s.unidade || 'un'}) de ${s.valor_referencia != null ? brl(s.valor_referencia) : '(vazio)'} para ${brl(valor)}.`,
      };
    },
    executar: (id, d, api) => api('PUT', '/api/precos-mao-de-obra', { itens: [{ codigo: d.codigo, valor_referencia: d.valor_referencia }] }),
  },
};

// Entregas do pacote: as pedidas ou, sem pedido, as que o projetista escolheu da última vez
// (laudos_projetos.entregas), ou definições técnicas + PDF. A rota confere de novo (planta/unifilar).
function itensDaEntrega(pedidos, l) {
  const { ENTREGAS } = require('../../utils/projetoLaudo');
  const chaves = ENTREGAS.map(e => e.chave);
  const base = Array.isArray(pedidos) && pedidos.length ? pedidos : (l.entregas?.itens?.length ? l.entregas.itens : ['definicoes', 'pdf']);
  const lista = [...new Set(base.map(String))];
  const invalido = lista.find(i => !chaves.includes(i));
  if (invalido) return { erro: `Entrega desconhecida: ${invalido}. Use: ${chaves.join(', ')}.` };
  return { lista, rotulos: lista.map(i => ENTREGAS.find(e => e.chave === i).rotulo) };
}
// texto padrão do e-mail do projeto (o mesmo da rota, controllers/canalEnvioProjeto.js)
const textoPadraoProjeto = (l) => `Olá,\nSegue em anexo o projeto ${l.titulo || `#${l.id}`} (${l.disciplina}).`;

async function lerPropostaCompleta(id) {
  const { rows: [p] } = await pool.query('SELECT * FROM propostas WHERE id = $1', [id]);
  const { rows: secoes } = await pool.query('SELECT * FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem', [id]);
  const { rows: itens } = await pool.query('SELECT * FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem', [id]);
  return { ...p, secoes, itens };
}

// Confere a ação proposta pelo assistente e devolve o que será gravado.
async function prepararAcao({ tipo, alvo_id, payload, descricao }) {
  const def = TIPOS[tipo];
  if (!def) throw new ErroAcao(`Tipo de ação desconhecido: ${tipo}. Tipos: ${Object.keys(TIPOS).join(', ')}.`);
  const alvoId = def.alvo === 'servico' ? null : Number(alvo_id);
  if (def.alvo !== 'servico' && !idValido(alvoId)) throw new ErroAcao('Informe o id do registro alvo (alvo_id).');
  const dados = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  if (JSON.stringify(dados).length > 250000) throw new ErroAcao('Dados da ação grandes demais.');
  const { payload: limpo, resumo } = await def.preparar(alvoId, dados);
  const justificativa = String(descricao || '').trim().slice(0, 1000);
  const impressao = await calcularImpressao({ tipo, alvo_tipo: def.alvo, alvo_id: alvoId, resumo });
  return { tipo, alvo_tipo: def.alvo, alvo_id: alvoId, payload: limpo, descricao: justificativa ? `${resumo}\n\nMotivo informado pelo assistente: ${justificativa}` : resumo, resumo, impressao };
}

// ── Prazo e nova conferência ao aplicar (INT-08) ─────────────────────────
// O cartão (ou a mensagem do canal) mostra o estado do momento em que a ação foi preparada. Antes o
// "Aplicar" de dias depois executava sobre o estado atual: um e-mail podia sair com o PDF de um total
// diferente do que o usuário leu. Agora a ação guarda a IMPRESSÃO do alvo (hash do resumo que o
// usuário viu + a versão do registro) e, ao aplicar, o resumo é montado de novo com o estado atual
// (passa de novo pela conferência de envio, INT-03): se a impressão mudou, nada é executado.
async function versaoDoAlvo(alvoTipo, alvoId) {
  const consultas = {
    proposta: 'SELECT versao::text AS v FROM propostas WHERE id = $1',
    analise: 'SELECT versao::text AS v FROM analises_projeto WHERE id = $1',
    projeto: 'SELECT versao::text AS v FROM laudos_projetos WHERE id = $1',
    material: 'SELECT atualizado_em::text AS v FROM materiais WHERE id = $1',
  };
  if (!consultas[alvoTipo] || alvoId == null) return null;
  const { rows: [r] } = await pool.query(consultas[alvoTipo], [alvoId]);
  return r ? r.v : null;
}

async function calcularImpressao({ tipo, alvo_tipo, alvo_id, resumo }) {
  const versao = await versaoDoAlvo(alvo_tipo, alvo_id);
  return crypto.createHash('sha256').update(JSON.stringify([tipo, alvo_id ?? null, resumo, versao])).digest('hex');
}

// Impressão do alvo AGORA, com o mesmo payload gravado. Erro de preparo (proposta que passou a ter
// bloqueio, status que já mudou, registro apagado) volta como ErroAcao.
async function impressaoAtual(acao) {
  const def = TIPOS[acao.tipo];
  if (!def) throw new ErroAcao('Tipo de ação desconhecido.');
  const { resumo } = await def.preparar(acao.alvo_id, acao.payload || {});
  return calcularImpressao({ tipo: acao.tipo, alvo_tipo: def.alvo, alvo_id: acao.alvo_id, resumo });
}

const MSG_MUDOU = 'O registro mudou depois que a ação foi preparada (total, status ou conteúdo). Nada foi feito: peça a ação de novo para ver o resumo atualizado.';
const MSG_EXPIROU = 'O prazo para confirmar esta ação acabou. Nada foi feito: peça a ação de novo.';

// { ok: true } ou { ok: false, motivo: 'expirou' | 'mudou', mensagem }
async function reconferirAcao(acao, { agora = new Date() } = {}) {
  if (acao.expira_em && new Date(acao.expira_em).getTime() <= agora.getTime()) return { ok: false, motivo: 'expirou', mensagem: MSG_EXPIROU };
  // ação gravada antes desta conferência existir: não há impressão para comparar
  if (!acao.impressao) return { ok: true };
  let atual;
  try {
    atual = await impressaoAtual(acao);
  } catch (e) {
    if (e instanceof ErroAcao) return { ok: false, motivo: 'mudou', mensagem: `${MSG_MUDOU} (${e.message})` };
    throw e;
  }
  return atual === String(acao.impressao).trim() ? { ok: true } : { ok: false, motivo: 'mudou', mensagem: MSG_MUDOU };
}

// Chamada HTTP à própria API com o token do usuário que clicou "Aplicar"
function criarChamadaApi(baseUrl, authorization) {
  return async (metodo, caminho, corpo) => {
    const resp = await fetch(`${baseUrl}${caminho}`, {
      method: metodo,
      headers: { Authorization: authorization, ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new ErroAcao(dados.erro || `Erro ${resp.status}`, resp.status);
    return dados;
  };
}

async function executarAcao(acao, api) {
  const def = TIPOS[acao.tipo];
  if (!def) throw new ErroAcao('Tipo de ação desconhecido.');
  return def.executar(acao.alvo_id, acao.payload || {}, api);
}

const tiposDeAcao = () => Object.entries(TIPOS).map(([tipo, d]) => ({ tipo, alvo: d.alvo, rotulo: d.rotulo }));

module.exports = { prepararAcao, executarAcao, criarChamadaApi, tiposDeAcao, ErroAcao, TIPOS, reconferirAcao, calcularImpressao, impressaoAtual, textoPadraoProjeto };
