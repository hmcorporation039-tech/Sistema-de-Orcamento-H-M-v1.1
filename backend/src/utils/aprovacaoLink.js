// Versão 2.0 — Fase 3I: aprovação da proposta por link (regras puras, sem banco).
//
// O cliente recebe um link com um token aleatório, vê a proposta e aprova ou
// recusa informando nome e CPF/CNPJ. É um ACEITE ELETRÔNICO SIMPLES (registro de
// quem, quando, de onde e o que foi aprovado) — NÃO é assinatura digital
// ICP-Brasil. Usado por controllers/aprovacaoController.js e testes/aprovacao.test.js.
const crypto = require('crypto');
const { codigoParaCliente, EMPRESA } = require('./pdfTemplate');

// ── Token ────────────────────────────────────────────────────────────────
// 32 bytes aleatórios em base64url = 43 caracteres. Só o HASH (sha-256) vai
// para o banco: quem lê o banco (ou um backup) não consegue montar o link.
const TAMANHO_TOKEN_BYTES = 32;
const RE_TOKEN = /^[A-Za-z0-9_-]{43}$/;

function gerarToken() {
  return crypto.randomBytes(TAMANHO_TOKEN_BYTES).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');
}

// Formato errado nem chega ao banco (e recebe a mesma resposta de "inexistente")
function formatoTokenValido(token) {
  return typeof token === 'string' && RE_TOKEN.test(token);
}

// Comparação em tempo constante do hash calculado com o gravado
function hashesIguais(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

// ── CPF / CNPJ ───────────────────────────────────────────────────────────
// CNPJ aceita também o formato alfanumérico da Receita (IN RFB 2.229/2024, em
// vigor desde 07/2026): 12 posições [A-Z0-9] + 2 dígitos verificadores; cada
// caractere vale (código ASCII − 48), com os mesmos pesos do módulo 11.
function limparDocumento(v) {
  return String(v || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function cpfValido(v) {
  const cpf = limparDocumento(v);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(cpf.slice(0, 9));
  const d2 = dv(cpf.slice(0, 9) + d1);
  return cpf === cpf.slice(0, 9) + d1 + d2;
}

function cnpjValido(v) {
  const cnpj = limparDocumento(v);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const valor = (c) => c.charCodeAt(0) - 48;
  const dv = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base.split('').reduce((s, c, i) => s + valor(c) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const doze = cnpj.slice(0, 12);
  const d1 = dv(doze);
  const d2 = dv(doze + d1);
  return cnpj === `${doze}${d1}${d2}`;
}

// { tipo: 'CPF'|'CNPJ', numero (só dígitos/letras), formatado } ou null se inválido
function analisarDocumento(v) {
  const d = limparDocumento(v);
  if (d.length === 11 && cpfValido(d)) {
    return { tipo: 'CPF', numero: d, formatado: `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` };
  }
  if (d.length === 14 && cnpjValido(d)) {
    return { tipo: 'CNPJ', numero: d, formatado: `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` };
  }
  return null;
}

function formatarDocumento(numero, tipo) {
  const d = limparDocumento(numero);
  if (tipo === 'CPF' && d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (tipo === 'CNPJ' && d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return d;
}

// ── Datas (horário de Brasília, sem horário de verão desde 2019) ────────────
const FUSO = 'America/Sao_Paulo';
const DIA_MS = 24 * 60 * 60 * 1000;

// "hoje" em Brasília: fonte única em utils/dataHoje.js (esta cópia era igual)
const { hojeBrasilia } = require('./dataHoje');

function somarDias(iso, dias) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Último dia de validade da proposta (data + validade em dias), AAAA-MM-DD.
// `dataIso` vem do banco já como texto (to_char) para não depender de fuso.
function vencimentoProposta(dataIso, validade) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dataIso || ''))) return null;
  const v = Number(validade);
  if (validade === null || validade === undefined || validade === '' || !Number.isFinite(v) || v < 0) return null;
  return somarDias(dataIso, Math.floor(v));
}

function propostaVencida(dataIso, validade, agora = new Date()) {
  const venc = vencimentoProposta(dataIso, validade);
  return venc !== null && hojeBrasilia(agora) > venc;
}

const DIAS_PADRAO_LINK = 30;
const DIAS_MAX_LINK = 90;

// Validade do link: `dias` informado (1–90) ou, por padrão, até o fim do último
// dia de validade da proposta (23:59:59 de Brasília); proposta sem validade →
// 30 dias. Devolve um Date, ou { erro } quando `dias` é inválido.
function calcularExpiracao({ dataIso, validade, dias, agora = new Date() }) {
  if (dias !== undefined && dias !== null && dias !== '') {
    const n = Number(dias);
    if (!Number.isInteger(n) || n < 1 || n > DIAS_MAX_LINK) return { erro: `A validade do link deve ser de 1 a ${DIAS_MAX_LINK} dias.` };
    return new Date(agora.getTime() + n * DIA_MS);
  }
  const venc = vencimentoProposta(dataIso, validade);
  if (venc) return new Date(`${venc}T23:59:59-03:00`);
  return new Date(agora.getTime() + DIAS_PADRAO_LINK * DIA_MS);
}

// ── Estado do link e regras da decisão ─────────────────────────────────────
// 'revogado' | 'expirado' | 'ativo' (independe de já ter decisão)
function estadoLink(link, agora = new Date()) {
  if (!link) return 'inexistente';
  if (link.revogado_em) return 'revogado';
  if (!link.expira_em || new Date(link.expira_em).getTime() <= agora.getTime()) return 'expirado';
  return 'ativo';
}

const MSG_LINK_INVALIDO = 'Este link de aprovação não é válido ou já expirou. Peça um novo link à H&M Engenharia.';

const MSG_STATUS = {
  Aprovada: 'Esta proposta já foi aprovada.',
  Recusada: 'Esta proposta foi recusada.',
  Cancelada: 'Esta proposta foi cancelada pela H&M Engenharia.',
};

// Pode registrar decisão? { ok: true } ou { ok: false, http, erro, codigo }.
// Ordem: link (mesma resposta para inexistente/expirado/revogado) → decisão já
// registrada → status da proposta → validade da proposta.
function avaliarDecisao({ link, proposta, decisaoExistente, agora = new Date() }) {
  if (estadoLink(link, agora) !== 'ativo' || !proposta) return { ok: false, http: 404, codigo: 'LINK_INVALIDO', erro: MSG_LINK_INVALIDO };
  if (decisaoExistente) return { ok: false, http: 409, codigo: 'JA_DECIDIDA', erro: 'Já existe uma decisão registrada por este link. Cada link aceita uma única decisão.' };
  return avaliarProposta(proposta, agora);
}

// A proposta ainda aceita decisão? (status Ativa e dentro da validade)
function avaliarProposta(proposta, agora = new Date()) {
  if (proposta.status !== 'Ativa') {
    return { ok: false, http: 409, codigo: 'PROPOSTA_INDISPONIVEL', erro: `${MSG_STATUS[proposta.status] || 'Esta proposta não está disponível para aprovação.'} Fale com a H&M Engenharia se precisar de algo.` };
  }
  if (propostaVencida(proposta.data_iso, proposta.validade, agora)) {
    const venc = vencimentoProposta(proposta.data_iso, proposta.validade);
    return { ok: false, http: 409, codigo: 'PROPOSTA_VENCIDA', erro: `O prazo de validade desta proposta terminou em ${dataBR(venc)}. Fale com a H&M Engenharia para receber uma proposta atualizada.` };
  }
  return { ok: true };
}

function dataBR(iso) {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

function dataHoraBR(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Validação do formulário público ────────────────────────────────────────
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texto = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

// { erro } ou { dados: { decisao, nome, documento: {tipo, numero, formatado}, cargo, email, observacao, aceite, hash_conteudo } }
function validarDecisao(body = {}) {
  const decisao = body.decisao;
  if (decisao !== 'aprovada' && decisao !== 'recusada') return { erro: 'Escolha aprovar ou recusar a proposta.' };
  const nome = texto(body.nome);
  if (nome.length < 3) return { erro: 'Informe o nome completo de quem está decidindo.' };
  if (nome.length > 150) return { erro: 'O nome pode ter no máximo 150 caracteres.' };
  const documento = analisarDocumento(body.documento);
  if (!documento) return { erro: 'CPF ou CNPJ inválido. Confira os números digitados.' };
  const cargo = texto(body.cargo);
  if (cargo.length > 100) return { erro: 'O cargo pode ter no máximo 100 caracteres.' };
  const email = texto(body.email).toLowerCase();
  if (email && (email.length > 254 || !RE_EMAIL.test(email))) return { erro: 'E-mail inválido.' };
  const observacao = typeof body.observacao === 'string' ? body.observacao.trim() : '';
  if (observacao.length > 2000) return { erro: 'A observação pode ter no máximo 2.000 caracteres.' };
  const aceite = body.aceite === true;
  if (decisao === 'aprovada' && !aceite) return { erro: 'Para aprovar, marque "Li e concordo com os termos da proposta".' };
  // hash do conteúdo que a página mostrou: a decisão só vale para aquela versão
  const hash = typeof body.hash_conteudo === 'string' ? body.hash_conteudo : '';
  if (!/^[0-9a-f]{64}$/.test(hash)) return { erro: 'Não foi possível confirmar a versão da proposta exibida. Recarregue a página.' };
  return { dados: { decisao, nome, documento, cargo: cargo || null, email: email || null, observacao: observacao || null, aceite, hash_conteudo: hash } };
}

// ── O que o cliente vê ───────────────────────────────────────────────────
// Lista FECHADA de campos (nada de spread da linha do banco): as mesmas
// informações do PDF do cliente (utils/pdfTemplate.js gerarHtmlProposta).
// Fica de fora: status interno do item (confirmado/a cotar), código interno de
// serviço (codigoParaCliente), material_id, ncm, usuário, obra, ids internos,
// composição do BDI e qualquer coluna nova que alguém acrescente à proposta.
const n2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const n3 = (v) => Math.round((Number(v) || 0) * 1000) / 1000;

// O PDF de hoje mostra a linha do BDI; se a proposta ganhar uma opção de
// esconder o BDI do cliente, ela vale aqui também.
function mostrarBdi(p) {
  return !(p.mostrar_bdi === false || p.exibir_bdi === false || p.bdi_visivel_cliente === false);
}

function montarPropostaPublica(proposta, secoes = [], itens = []) {
  const p = proposta || {};
  const blocos = (secoes || []).map(sec => ({
    nome: String(sec.nome || ''),
    itens: (itens || []).filter(it => it.secao_id === sec.id).map(it => ({
      descricao: String(it.descricao || ''),
      subgrupo: (it.subgrupo || '').trim() || null,
      codigo: codigoParaCliente(it.codigo) || null,
      quantidade: n3(it.quantidade),
      unidade: it.unidade || null,
      valor_unitario: n2(it.valor_unitario),
      valor_total: n2(it.valor_total),
    })),
  })).filter(s => s.itens.length > 0);

  const bdiVisivel = mostrarBdi(p);
  const totais = {
    subtotal_materiais: n2(p.subtotal_materiais),
    subtotal_mao_obra: n2(p.subtotal_mao_obra),
    imposto_venda_pct: Number(p.imposto_venda) > 0 ? n2(p.imposto_venda) : null,
    valor_imposto_venda: Number(p.imposto_venda) > 0 ? n2(p.valor_imposto_venda) : null,
    imposto_servico_pct: Number(p.imposto_servico) > 0 ? n2(p.imposto_servico) : null,
    valor_imposto_servico: Number(p.imposto_servico) > 0 ? n2(p.valor_imposto_servico) : null,
    bdi_pct: bdiVisivel ? n2(p.bdi) : null,
    valor_bdi: bdiVisivel ? n2(p.valor_bdi) : null,
    desconto_materiais_pct: Number(p.desconto_materiais_pct) < 0 ? n2(Math.abs(p.desconto_materiais_pct)) : null,
    desconto_mao_obra_pct: Number(p.desconto_mao_obra_pct) < 0 ? n2(Math.abs(p.desconto_mao_obra_pct)) : null,
    total: n2(p.total),
  };
  // BDI escondido: sem a linha, os subtotais não fechariam com o total — o
  // valor aparece como "Despesas indiretas" sem o percentual.
  if (!bdiVisivel && n2(p.valor_bdi) > 0) totais.valor_indiretos = n2(p.valor_bdi);
  // BDI diferenciado de materiais (Fase 3F): duas linhas, como no PDF
  const bdiMat = p.bdi_materiais;
  if (bdiVisivel && bdiMat !== undefined && bdiMat !== null && bdiMat !== '' && Number.isFinite(Number(bdiMat))) {
    const mat = n2(Number(p.subtotal_materiais) * (Number(bdiMat) / 100));
    totais.bdi_pct = null;
    totais.bdi_materiais_pct = n2(bdiMat);
    totais.valor_bdi_materiais = mat;
    totais.bdi_mao_obra_pct = n2(p.bdi);
    totais.valor_bdi_mao_obra = n2(n2(p.valor_bdi) - mat); // fecha com o valor_bdi gravado
  }

  return {
    numero: String(p.numero || ''),
    data: p.data_iso || null,
    validade_dias: p.validade === null || p.validade === undefined ? null : Number(p.validade),
    vence_em: vencimentoProposta(p.data_iso, p.validade),
    cliente_nome: p.cliente_nome || '',
    local_obra: p.local_obra || null,
    tipo: p.tipo || null,
    porte: p.porte || null,
    responsavel: p.responsavel || null,
    escopo: p.escopo || null,
    pagamento: p.pagamento || null,
    observacoes: p.observacoes || null,
    secoes: blocos,
    totais,
  };
}

// Hash do conteúdo aprovado: total + itens + condições, num texto canônico
// (ordem fixa, números com casas fixas). Prova depois o que estava na tela no
// momento da decisão — se a proposta for editada, o hash muda.
function textoCanonico(pub) {
  const linhas = [];
  for (const s of pub.secoes || []) {
    for (const it of s.itens) {
      linhas.push([s.nome, it.subgrupo || '', it.descricao, it.codigo || '', n3(it.quantidade).toFixed(3), it.unidade || '', n2(it.valor_unitario).toFixed(2), n2(it.valor_total).toFixed(2)]);
    }
  }
  const t = pub.totais || {};
  return JSON.stringify({
    v: 1,
    numero: pub.numero,
    data: pub.data,
    validade_dias: pub.validade_dias,
    cliente: pub.cliente_nome,
    escopo: pub.escopo || '',
    pagamento: pub.pagamento || '',
    observacoes: pub.observacoes || '',
    itens: linhas,
    totais: ['subtotal_materiais', 'subtotal_mao_obra', 'valor_imposto_venda', 'valor_imposto_servico', 'valor_bdi', 'valor_indiretos', 'total']
      .map(k => [k, t[k] === null || t[k] === undefined ? null : n2(t[k]).toFixed(2)]),
  });
}

function hashConteudo(pub) {
  return crypto.createHash('sha256').update(textoCanonico(pub), 'utf8').digest('hex');
}

const AVISO_JURIDICO = 'Aceite eletrônico simples: ficam registrados nome, CPF/CNPJ, data e hora, endereço IP, navegador e o conteúdo da proposta (código de verificação SHA-256). Não é assinatura digital com certificado ICP-Brasil.';

function textoDeclaracao(decisao, pub) {
  const total = (Number(pub.totais?.total) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return decisao === 'aprovada'
    ? `Declaro que li e concordo com os termos da proposta ${pub.numero} da ${EMPRESA.razaoSocial}, no valor total de ${total}, e que tenho poderes para aprová-la em nome do contratante. ${AVISO_JURIDICO}`
    : `Declaro que recuso a proposta ${pub.numero} da ${EMPRESA.razaoSocial}, no valor total de ${total}. ${AVISO_JURIDICO}`;
}

// Código do comprovante mostrado ao cliente e na tela interna
function codigoComprovante(decisaoId, hash) {
  return `AP-${String(decisaoId).padStart(6, '0')}-${String(hash || '').slice(0, 8).toUpperCase()}`;
}

// IP do pedido (express: req.ip respeita TRUST_PROXY); tira o prefixo IPv4-mapeado
function ipDoPedido(req) {
  return String(req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '').slice(0, 64) || null;
}

// Última decisão do cliente pelo link, para as LISTAS de propostas (uma só
// consulta: LATERAL pelo índice idx_decisoes_aprovacao_proposta, sem uma ida ao
// banco por linha). `alias` é o apelido da tabela propostas na consulta; as
// colunas do LATERAL têm prefixo dc_ para não ficarem ambíguas com as da proposta.
// coluna → decisao_cliente: { decisao: 'aprovada'|'recusada', nome, data } ou null.
function sqlDecisaoCliente(alias = 'p') {
  if (!/^[a-z_][a-z0-9_]*$/i.test(alias)) throw new Error('alias inválido');
  return {
    coluna: `CASE WHEN dc_ap.dc_decisao IS NULL THEN NULL
      ELSE json_build_object('decisao', dc_ap.dc_decisao, 'nome', dc_ap.dc_nome, 'data', dc_ap.dc_data) END AS decisao_cliente`,
    join: `LEFT JOIN LATERAL (
      SELECT d.decisao AS dc_decisao, d.nome AS dc_nome, d.decidido_em AS dc_data
        FROM proposta_decisoes_aprovacao d
       WHERE d.proposta_id = ${alias}.id
       ORDER BY d.decidido_em DESC, d.id DESC LIMIT 1
    ) dc_ap ON TRUE`,
  };
}

module.exports = {
  sqlDecisaoCliente,
  gerarToken, hashToken, formatoTokenValido, hashesIguais,
  cpfValido, cnpjValido, analisarDocumento, formatarDocumento,
  hojeBrasilia, vencimentoProposta, propostaVencida, calcularExpiracao,
  estadoLink, avaliarDecisao, avaliarProposta, MSG_LINK_INVALIDO,
  validarDecisao, montarPropostaPublica, hashConteudo,
  AVISO_JURIDICO, textoDeclaracao, codigoComprovante, ipDoPedido, dataBR, dataHoraBR,
};
