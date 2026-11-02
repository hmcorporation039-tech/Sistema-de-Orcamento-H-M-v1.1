// Notas fiscais de serviço (versão 2.4) — models/migracoes/2.0-22-notas-fiscais.js.
// Rascunho (cliente + serviço + valores), duplicar ("clonador": a cópia volta
// a rascunho para trocar cliente, valores, datas e descrição), PDF com o papel
// timbrado, XML, envio por e-mail ao tomador, registro de cancelamento e
// importação dos XML já emitidos (utils/nfseXml.js).
// Emissão direta na API nacional (certificado A1) = etapa 2; até lá a nota é
// emitida no nfse.gov.br e o XML importado aqui transforma o rascunho em nota.
const path = require('path');
const JSZip = require('jszip');
const QRCode = require('qrcode');
const pool = require('../config/database');
const { registrarAuditoria } = require('../services/auditoria');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const { gerarPdfDeHtml } = require('../services/pdfPuppeteer');
const { criarTransportador } = require('../services/email/smtp');
const { EMPRESA } = require('../utils/pdfTemplate');
const { gerarHtmlNfse } = require('../utils/nfsePdfTemplate');
const { lerXmlNfse } = require('../utils/nfseXml');
const nfseNacional = require('../services/nfseNacional');
const atestado = require('../services/atestadoCapacidade');
const { ASSINATURA_EMPRESA } = require('./propostaDocumentos');

const CNPJ_HM = EMPRESA.cnpj.replace(/\D/g, '');
const digitos = (v) => String(v ?? '').replace(/\D/g, '');
const tem = (body, c) => Object.prototype.hasOwnProperty.call(body || {}, c);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const centavos = (n) => Math.round(Number(n || 0) * 100) / 100;

const VALORES = [
  'valor_servicos', 'valor_deducoes', 'desconto_incondicionado', 'desconto_condicionado',
  'valor_pis', 'valor_cofins', 'valor_inss', 'valor_ir', 'valor_csll', 'outras_retencoes',
];
// campos que o rascunho grava (tomador e códigos do serviço vêm do cadastro)
const CAMPOS_RASCUNHO = [
  'cliente_id', 'tomador', 'servico_id', 'ctrib_nac', 'ctrib_mun', 'nbs', 'cnae', 'servico_descricao',
  'competencia', 'discriminacao', 'codigo_municipio_prestacao', ...VALORES,
  'aliquota_iss', 'valor_iss', 'iss_retido', 'valor_liquido', 'observacoes',
];

// ISS pela alíquota (sobre a base: serviço − deduções − desconto incondicionado)
// e líquido = serviço − descontos − retenções (o ISS só desconta se retido)
function calcularTotais(d) {
  const base = d.valor_servicos - d.valor_deducoes - d.desconto_incondicionado;
  d.valor_iss = d.aliquota_iss != null ? centavos(Math.max(0, base) * d.aliquota_iss / 100) : 0;
  const retFed = d.valor_pis + d.valor_cofins + d.valor_inss + d.valor_ir + d.valor_csll + d.outras_retencoes;
  d.valor_liquido = centavos(d.valor_servicos - d.desconto_incondicionado - d.desconto_condicionado - retFed - (d.iss_retido ? d.valor_iss : 0));
  return d;
}

// retrato do cliente para a nota (o cadastro pode mudar depois)
async function tomadorDoCliente(clienteId, db = pool) {
  const { rows: [c] } = await db.query(
    `SELECT c.*, m.nome AS municipio, m.uf FROM clientes c LEFT JOIN municipios_ibge m ON m.codigo = c.codigo_municipio
      WHERE c.id = $1 AND c.ativo = true`, [clienteId]);
  if (!c) return null;
  return {
    nome: c.nome,
    documento: digitos(c.documento) || null,
    inscricao_municipal: c.inscricao_municipal,
    email: c.email_nota || c.email,
    telefone: c.telefone,
    cep: c.cep, logradouro: c.logradouro, numero: c.numero, complemento: c.complemento, bairro: c.bairro,
    codigo_municipio: c.codigo_municipio, municipio: c.municipio, uf: c.uf,
    endereco: c.endereco,
    retem_iss: c.retem_iss,
  };
}

async function servicoDaEmpresa(id) {
  const { rows: [s] } = await pool.query(
    `SELECT e.*, f.descricao AS ctrib_nac_descricao FROM empresa_servicos_nfse e
       LEFT JOIN fiscal_servicos f ON f.codigo = e.ctrib_nac WHERE e.id = $1`, [id]);
  return s || null;
}

// Valida e monta o rascunho; campo que não veio fica como está.
async function dadosDoRascunho(body, atual = {}) {
  const v = (c) => (tem(body, c) ? body[c] : atual[c]);
  const d = {};
  for (const c of VALORES) {
    const n = Number(String(v(c) ?? 0).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return { erro: `Valor inválido em ${c.replace(/_/g, ' ')}.` };
    d[c] = centavos(n);
  }
  if (!(d.valor_servicos > 0)) return { erro: 'Informe o valor dos serviços.' };
  const aliq = v('aliquota_iss');
  d.aliquota_iss = aliq === '' || aliq == null ? null : Number(String(aliq).replace(',', '.'));
  if (d.aliquota_iss != null && (!Number.isFinite(d.aliquota_iss) || d.aliquota_iss < 0 || d.aliquota_iss > 5)) return { erro: 'Alíquota do ISS: de 0 a 5%.' };
  d.iss_retido = v('iss_retido') === true || v('iss_retido') === 'true';
  d.discriminacao = String(v('discriminacao') ?? '').trim();
  if (!d.discriminacao) return { erro: 'Descreva o serviço prestado (discriminação).' };
  if (d.discriminacao.length > 2000) return { erro: 'A discriminação passa de 2.000 caracteres (limite da NFS-e).' };
  d.observacoes = String(v('observacoes') ?? '').trim() || null;
  if (d.observacoes && d.observacoes.length > 2000) return { erro: 'As informações complementares passam de 2.000 caracteres.' };
  const comp = String(v('competencia') ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(comp) || Number.isNaN(new Date(`${comp}T12:00:00Z`).getTime())) return { erro: 'Data de competência inválida.' };
  d.competencia = comp;

  d.cliente_id = Number(v('cliente_id')) || null;
  if (!d.cliente_id) return { erro: 'Escolha o cliente (tomador).' };
  const tomador = await tomadorDoCliente(d.cliente_id);
  if (!tomador) return { erro: 'Cliente não encontrado.' };
  d.tomador = JSON.stringify(tomador);

  d.servico_id = Number(v('servico_id')) || null;
  if (!d.servico_id) return { erro: 'Escolha o serviço (código de tributação).' };
  const s = await servicoDaEmpresa(d.servico_id);
  if (!s) return { erro: 'Serviço não encontrado no cadastro fiscal.' };
  Object.assign(d, { ctrib_nac: s.ctrib_nac, ctrib_mun: s.ctrib_mun, nbs: s.nbs, cnae: s.cnae, servico_descricao: s.ctrib_nac_descricao });

  const local = digitos(v('codigo_municipio_prestacao')) || null;
  if (local) {
    const { rows: [m] } = await pool.query('SELECT 1 FROM municipios_ibge WHERE codigo = $1', [local]);
    if (!m) return { erro: 'Município da prestação (código IBGE) não encontrado.' };
  }
  d.codigo_municipio_prestacao = local;
  return { d: calcularTotais(d) };
}

// ── Lista, detalhe ─────────────────────────────────────────────────────────

const ORDEM = "COALESCE(n.data_emissao, n.criado_em) DESC, n.id DESC";

async function listar(req, res) {
  const { busca, situacao, de, ate } = req.query;
  const { pagina, porPagina, offset } = parsePaginacao(req.query);
  const cond = [];
  const params = [];
  if (busca) {
    params.push(`%${String(busca).trim()}%`, digitos(busca) || '§');
    cond.push(`(n.tomador->>'nome' ILIKE $${params.length - 1} OR n.discriminacao ILIKE $${params.length - 1}
      OR n.tomador->>'documento' LIKE '%' || $${params.length} || '%' OR n.numero::text = $${params.length})`);
  }
  if (['rascunho', 'emitida', 'cancelada', 'substituida'].includes(situacao)) { params.push(situacao); cond.push(`n.situacao = $${params.length}`); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(de || '')) { params.push(de); cond.push(`n.competencia >= $${params.length}`); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(ate || '')) { params.push(ate); cond.push(`n.competencia <= $${params.length}`); }
  if (Number(req.query.cliente_id)) { params.push(Number(req.query.cliente_id)); cond.push(`n.cliente_id = $${params.length}`); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const [{ rows: [tot] }, { rows }] = await Promise.all([
    pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE situacao = 'emitida')::int AS emitidas,
              COALESCE(sum(valor_servicos) FILTER (WHERE situacao = 'emitida'), 0) AS valor_emitido,
              COALESCE(sum(valor_liquido) FILTER (WHERE situacao = 'emitida'), 0) AS liquido_emitido,
              count(*) FILTER (WHERE situacao = 'rascunho')::int AS rascunhos
         FROM notas_fiscais n ${where}`, params),
    pool.query(
      `SELECT n.id, n.situacao, n.origem, n.padrao, n.numero, n.chave_acesso, n.codigo_verificacao, n.data_emissao,
              n.competencia, n.cliente_id, n.tomador->>'nome' AS tomador_nome, n.tomador->>'documento' AS tomador_documento,
              n.tomador->>'email' AS tomador_email, n.ctrib_nac, n.item_lista, n.discriminacao, n.valor_servicos, n.valor_liquido,
              n.iss_retido, n.ultimo_envio_em, n.ultimo_envio_para, (n.xml IS NOT NULL) AS tem_xml,
              n.proposta_id, (SELECT pr.numero FROM propostas pr WHERE pr.id = n.proposta_id) AS proposta_numero,
              n.atestado_enviado_em, n.atestado_enviado_para,
              (SELECT COALESCE(sum(f.valor), 0) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido_valor,
              (SELECT max(f.data_hora) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido_em
         FROM notas_fiscais n ${where} ORDER BY ${ORDEM}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, porPagina, offset]),
  ]);
  res.json({ ...montarResposta(rows, tot.total, pagina, porPagina), totais: tot });
}

async function lerNota(id) {
  const { rows: [n] } = await pool.query(
    `SELECT n.*, (n.xml IS NOT NULL) AS tem_xml, s.nome AS servico_nome, o.numero AS origem_numero,
            mp.nome || '-' || mp.uf AS local_prestacao, pr.numero AS proposta_numero,
            (SELECT COALESCE(sum(f.valor), 0) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido_valor,
            (SELECT max(f.data_hora) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido_em
       FROM notas_fiscais n
       LEFT JOIN municipios_ibge mp ON mp.codigo = n.codigo_municipio_prestacao
       LEFT JOIN empresa_servicos_nfse s ON s.id = n.servico_id
       LEFT JOIN notas_fiscais o ON o.id = n.nota_origem_id
       LEFT JOIN propostas pr ON pr.id = n.proposta_id
      WHERE n.id = $1`, [id]);
  return n;
}

async function obter(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  delete n.xml;
  res.json(n);
}

// ── Rascunho: criar, editar, apagar, duplicar ─────────────────────────────

async function criar(req, res) {
  const { d, erro } = await dadosDoRascunho(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows: [n] } = await pool.query(
    `INSERT INTO notas_fiscais (${CAMPOS_RASCUNHO.join(', ')}, criado_por)
     VALUES (${CAMPOS_RASCUNHO.map((_, i) => `$${i + 1}`).join(', ')}, $${CAMPOS_RASCUNHO.length + 1}) RETURNING id`,
    [...CAMPOS_RASCUNHO.map(c => d[c]), req.usuario.id]);
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'criar', usuarioId: req.usuario.id, detalhes: { valor: d.valor_servicos } });
  res.status(201).json(await lerNota(n.id).then(x => { delete x.xml; return x; }));
}

async function atualizar(req, res) {
  const atual = await lerNota(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Nota não encontrada' });
  if (atual.situacao !== 'rascunho') return res.status(409).json({ erro: 'Só o rascunho pode ser editado. Para mudar uma nota emitida, duplique-a.' });
  const base = { ...atual, competencia: atual.competencia instanceof Date ? atual.competencia.toISOString().slice(0, 10) : atual.competencia };
  const { d, erro } = await dadosDoRascunho(req.body, base);
  if (erro) return res.status(400).json({ erro });
  await pool.query(
    `UPDATE notas_fiscais SET ${CAMPOS_RASCUNHO.map((c, i) => `${c} = $${i + 1}`).join(', ')}, atualizado_em = NOW()
      WHERE id = $${CAMPOS_RASCUNHO.length + 1} AND situacao = 'rascunho'`,
    [...CAMPOS_RASCUNHO.map(c => d[c]), atual.id]);
  const n = await lerNota(atual.id);
  delete n.xml;
  res.json(n);
}

async function remover(req, res) {
  const { rows: [n] } = await pool.query("DELETE FROM notas_fiscais WHERE id = $1 AND situacao = 'rascunho' RETURNING id", [req.params.id]);
  if (!n) return res.status(409).json({ erro: 'Só o rascunho pode ser apagado. Nota emitida se cancela.' });
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'excluir', usuarioId: req.usuario.id, detalhes: {} });
  res.json({ mensagem: 'Rascunho apagado' });
}

// "Clonador": copia serviço, descrição, valores e retenções para um rascunho
// novo. Opcional no corpo: cliente_ids (uma cópia para cada cliente) — os
// códigos do serviço e os dados do tomador são relidos do cadastro de hoje.
async function duplicar(req, res) {
  const origem = await lerNota(req.params.id);
  if (!origem) return res.status(404).json({ erro: 'Nota não encontrada' });
  const pedidos = Array.isArray(req.body?.cliente_ids) && req.body.cliente_ids.length
    ? [...new Set(req.body.cliente_ids.map(Number).filter(Boolean))].slice(0, 50)
    : [origem.cliente_id];
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const criados = [];
  for (const clienteId of pedidos) {
    const tomador = clienteId ? await tomadorDoCliente(clienteId) : null;
    const s = origem.servico_id ? await servicoDaEmpresa(origem.servico_id) : null;
    const d = { ...origem };
    for (const c of VALORES) d[c] = Number(origem[c] || 0);
    d.aliquota_iss = origem.aliquota_iss == null ? null : Number(origem.aliquota_iss);
    Object.assign(d, {
      cliente_id: tomador ? clienteId : null,
      tomador: JSON.stringify(tomador || {}),
      competencia: hoje,
      iss_retido: tomador ? !!tomador.retem_iss || origem.iss_retido : origem.iss_retido,
      ...(s ? { ctrib_nac: s.ctrib_nac, ctrib_mun: s.ctrib_mun, nbs: s.nbs, cnae: s.cnae, servico_descricao: s.ctrib_nac_descricao } : {}),
    });
    calcularTotais(d);
    const { rows: [n] } = await pool.query(
      `INSERT INTO notas_fiscais (${CAMPOS_RASCUNHO.join(', ')}, nota_origem_id, criado_por)
       VALUES (${CAMPOS_RASCUNHO.map((_, i) => `$${i + 1}`).join(', ')}, $${CAMPOS_RASCUNHO.length + 1}, $${CAMPOS_RASCUNHO.length + 2}) RETURNING id`,
      [...CAMPOS_RASCUNHO.map(c => d[c]), origem.id, req.usuario.id]);
    criados.push(n.id);
  }
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: origem.id, acao: 'duplicar', usuarioId: req.usuario.id, detalhes: { novas: criados } });
  res.status(201).json({ ids: criados, mensagem: criados.length === 1 ? 'Cópia criada como rascunho' : `${criados.length} rascunhos criados` });
}

// Estado do cancelamento direto, para a tela saber o que oferecer (sem segredos).
async function configCancelamento(req, res) {
  const ambiente = nfseNacional.ambienteConfigurado();
  const r = { direto: nfseNacional.cancelamentoDiretoLigado(), ambiente, certificado: { ok: false } };
  if (r.direto) {
    try {
      const c = nfseNacional.carregarCertificado();
      r.certificado = { ok: c.validoAte > new Date(), cnpj: c.cnpj, valido_ate: c.validoAte };
    } catch (err) { r.certificado = { ok: false, erro: err.message }; }
  }
  res.json(r);
}

// Cancela uma nota emitida. Dois caminhos:
//  - direto: true  → envia o evento 101101 à SEFIN Nacional (certificado A1) e só
//    marca "cancelada" se a Receita aceitar. Em homologação é só um teste: a
//    nota do banco nunca muda.
//  - direto: false → só registra um cancelamento já feito no portal (ISSnet/Emissor).
async function cancelar(req, res) {
  const motivo = String(req.body?.motivo ?? '').trim();
  if (motivo.length < 15) return res.status(400).json({ erro: 'Escreva o motivo do cancelamento (pelo menos 15 caracteres, como pede a NFS-e).' });
  if (motivo.length > 255) return res.status(400).json({ erro: 'O motivo passa de 255 caracteres.' });
  const codigo = Number(req.body?.codigo_motivo ?? 9);
  if (![1, 2, 9].includes(codigo)) return res.status(400).json({ erro: 'Código do motivo inválido (1 erro na emissão, 2 serviço não prestado, 9 outros).' });
  const direto = req.body?.direto === true;

  const { rows: [nota] } = await pool.query('SELECT id, numero, situacao, padrao, chave_acesso FROM notas_fiscais WHERE id = $1', [req.params.id]);
  if (!nota) return res.status(404).json({ erro: 'Nota não encontrada' });
  if (nota.situacao !== 'emitida') return res.status(409).json({ erro: 'Só nota emitida pode ser cancelada (rascunho se apaga).' });

  let via = 'manual';
  let protocolo = null;
  let xmlEvento = null;
  if (direto) {
    if (!nfseNacional.cancelamentoDiretoLigado()) return res.status(409).json({ erro: 'O cancelamento direto está desligado neste sistema. Cancele no portal e registre aqui.' });
    if (nota.padrao !== 'nacional' || !/^\d{50}$/.test(String(nota.chave_acesso || ''))) {
      return res.status(409).json({ erro: 'Só nota do Emissor Nacional (com chave de acesso) cancela direto. Esta precisa ser cancelada no portal.' });
    }
    if (String(req.body?.confirmar_numero ?? '').trim() !== String(nota.numero)) {
      return res.status(400).json({ erro: `Para confirmar, digite o número da nota (${nota.numero}).` });
    }
    const ambiente = nfseNacional.ambienteConfigurado();
    let resp;
    try {
      resp = await nfseNacional.cancelarNfse({ chave: nota.chave_acesso, codigoMotivo: codigo, motivo, ambiente });
    } catch (err) {
      console.error('Cancelamento direto NFS-e:', err.message);
      return res.status(502).json({ erro: `Não consegui falar com a Receita: ${err.message}` });
    }
    await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: nota.id, acao: 'cancelar_receita', usuarioId: req.usuario.id,
      detalhes: { numero: nota.numero, ambiente, codigo, aceito: resp.ok, erro: resp.ok ? undefined : resp.erro } });
    if (!resp.ok) return res.status(422).json({ erro: `A Receita não aceitou o cancelamento: ${resp.erro}`, codigo: resp.codigo });
    if (ambiente !== 'producao') {
      return res.json({ teste: true, mensagem: 'TESTE em homologação: a Receita aceitou o pedido, mas a nota no sistema não foi alterada.', protocolo: resp.protocolo });
    }
    via = 'receita'; protocolo = resp.protocolo; xmlEvento = resp.xmlEvento;
  }

  const { rows: [n] } = await pool.query(
    `UPDATE notas_fiscais SET situacao = 'cancelada', cancelada_em = NOW(), motivo_cancelamento = $2, atualizado_em = NOW(),
            cancelamento_via = $3, cancelamento_codigo = $4, cancelamento_protocolo = $5, cancelamento_xml = $6
      WHERE id = $1 AND situacao = 'emitida' RETURNING id, numero`, [nota.id, motivo, via, codigo, protocolo, xmlEvento]);
  if (!n) return res.status(409).json({ erro: 'A nota já foi cancelada por outra ação.' });
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'cancelar', usuarioId: req.usuario.id, detalhes: { numero: n.numero, motivo, via, codigo, protocolo } });
  res.json({ mensagem: via === 'receita' ? `Nota ${n.numero} cancelada na Receita${protocolo ? ` (protocolo ${protocolo})` : ''}` : `Cancelamento da nota ${n.numero} registrado`, via, protocolo });
}

// ── PDF, XML, e-mail ───────────────────────────────────────────────────────

const nomeArquivo = (n, ext) => {
  const cliente = String(n.tomador?.nome || 'cliente').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_').slice(0, 60);
  return `NFS-e_${n.numero || `rascunho_${n.id}`}_${cliente}.${ext}`;
};

async function montarPdf(n) {
  const { rows: [empresa] } = await pool.query('SELECT * FROM empresa_fiscal WHERE id = 1');
  const codigos = [n.tomador?.codigo_municipio, n.codigo_municipio_prestacao, n.municipio_incidencia].filter(Boolean);
  const { rows: mun } = codigos.length
    ? await pool.query('SELECT codigo, nome, uf FROM municipios_ibge WHERE codigo = ANY($1)', [codigos])
    : { rows: [] };
  // QR Code: a página da nota no portal do ISS DF (link guardado na importação)
  // ou a consulta pública nacional pela chave; rascunho não tem
  const destinoQr = n.situacao === 'rascunho' ? null
    : n.link_consulta || (n.chave_acesso ? `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${n.chave_acesso}` : null);
  const qrcode = destinoQr ? await QRCode.toDataURL(destinoQr, { margin: 0, width: 300, errorCorrectionLevel: 'M' }) : null;
  const html = gerarHtmlNfse(n, { empresa: empresa || {}, municipios: Object.fromEntries(mun.map(m => [m.codigo, m])), qrcode });
  // sem o rodapé do papel timbrado: a nota segue o layout do ISS, que não tem
  return Buffer.from(await gerarPdfDeHtml(html, { margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' } }));
}

async function pdf(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  try {
    const arquivo = await montarPdf(n);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': contentDisposition(nomeArquivo(n, 'pdf')) });
    res.send(arquivo);
  } catch (err) {
    if (err.codigo === 'FILA_PDF_CHEIA') return res.status(503).json({ erro: err.message });
    throw err;
  }
}

// Retorna o HTML da nota sem passar pelo Puppeteer — para pré-visualização no browser.
async function previewHtml(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const { rows: emp } = await pool.query('SELECT * FROM empresa_fiscal LIMIT 1');
  const empresa = emp[0] || {};
  const codigos = [n.tomador?.codigo_municipio, n.codigo_municipio_prestacao, n.municipio_incidencia].filter(Boolean);
  const { rows: mun } = codigos.length
    ? await pool.query('SELECT codigo, nome, uf FROM municipios_ibge WHERE codigo = ANY($1)', [codigos])
    : { rows: [] };
  const destinoQr = n.situacao === 'rascunho' ? null
    : n.link_consulta || (n.chave_acesso ? `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${n.chave_acesso}` : null);
  const qrcode = destinoQr ? await QRCode.toDataURL(destinoQr, { margin: 0, width: 300, errorCorrectionLevel: 'M' }) : null;
  const html = gerarHtmlNfse(n, { empresa, municipios: Object.fromEntries(mun.map(m => [m.codigo, m])), qrcode });
  res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.send(html);
}

async function xml(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  if (!n.xml) return res.status(404).json({ erro: 'Esta nota não tem XML (rascunho ou nota sem arquivo importado).' });
  res.set({ 'Content-Type': 'application/xml; charset=utf-8', 'Content-Disposition': contentDisposition(nomeArquivo(n, 'xml')) });
  res.send(n.xml);
}

async function enviarEmail(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  if (n.situacao === 'rascunho') return res.status(409).json({ erro: 'Rascunho não se envia ao cliente: emita a nota primeiro.' });
  const destinatarios = String(req.body?.destinatario ?? '').split(/[;,\s]+/).map(s => s.trim()).filter(Boolean);
  if (!destinatarios.length || destinatarios.length > 5 || destinatarios.some(d => d.length > 254 || !EMAIL.test(d))) {
    return res.status(400).json({ erro: 'Informe de 1 a 5 e-mails válidos (separados por vírgula).' });
  }
  const mensagem = req.body?.mensagem;
  if (mensagem != null && (typeof mensagem !== 'string' || mensagem.length > 10000)) return res.status(400).json({ erro: 'Mensagem de até 10.000 caracteres.' });
  const arquivo = await montarPdf(n);
  const valor = Number(n.valor_servicos).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const corpo = (mensagem && mensagem.trim())
    || `Olá,\n\nSegue em anexo a nota fiscal de serviço nº ${n.numero}, no valor de ${valor}.${n.situacao === 'cancelada' ? '\n\nAtenção: esta nota foi CANCELADA.' : ''}`;
  const anexos = [{ filename: nomeArquivo(n, 'pdf'), content: arquivo, contentType: 'application/pdf' }];
  if (n.xml) anexos.push({ filename: nomeArquivo(n, 'xml'), content: Buffer.from(n.xml, 'utf8'), contentType: 'application/xml' });
  await criarTransportador().sendMail({
    from: `"H&M Engenharia" <${process.env.EMAIL_IMAP_USER}>`,
    to: destinatarios.join(', '),
    subject: `NFS-e nº ${n.numero} — ${EMPRESA.nomeFantasia}`,
    text: `${corpo}\n\n${ASSINATURA_EMPRESA}`,
    attachments: anexos,
  });
  const para = destinatarios.join(', ').slice(0, 254);
  await pool.query('UPDATE notas_fiscais SET ultimo_envio_em = NOW(), ultimo_envio_para = $2 WHERE id = $1', [n.id, para]);
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'email', usuarioId: req.usuario.id, detalhes: { para } });
  res.json({ mensagem: `Nota ${n.numero} enviada para ${para}` });
}

// ── Importação dos XML já emitidos ─────────────────────────────────────────

// arquivos .xml soltos ou dentro de .zip
async function arquivosXml(files) {
  const lista = [];
  for (const f of files || []) {
    if (/\.zip$/i.test(f.originalname) || f.buffer.slice(0, 2).toString() === 'PK') {
      const zip = await JSZip.loadAsync(f.buffer);
      for (const ent of Object.values(zip.files)) {
        if (!ent.dir && /\.xml$/i.test(ent.name)) lista.push({ nome: `${f.originalname} › ${path.basename(ent.name)}`, buffer: await ent.async('nodebuffer') });
      }
    } else {
      lista.push({ nome: f.originalname, buffer: f.buffer });
    }
  }
  return lista;
}

// cliente pelo CPF/CNPJ; sem cadastro, cria com os dados do tomador da nota
async function clienteDaNota(t, usuarioId, resumo) {
  if (!t.documento) return null;
  const { rows: [c] } = await pool.query(
    "SELECT id FROM clientes WHERE ativo = true AND regexp_replace(COALESCE(documento, ''), '\\D', '', 'g') = $1 ORDER BY id LIMIT 1", [t.documento]);
  if (c) return c.id;
  if (!t.nome) return null;
  const cod = t.codigo_municipio && t.codigo_municipio.length === 7 ? t.codigo_municipio : null;
  const { rows: [m] } = cod ? await pool.query('SELECT nome, uf FROM municipios_ibge WHERE codigo = $1', [cod]) : { rows: [] };
  const rua = [t.logradouro, t.numero, t.complemento].filter(Boolean).join(', ');
  const endereco = rua ? `${rua}${t.bairro ? ` – ${t.bairro}` : ''}${m ? `, ${m.nome}-${m.uf}` : ''}${t.cep ? `, CEP ${t.cep.slice(0, 5)}-${t.cep.slice(5)}` : ''}` : null;
  const { rows: [novo] } = await pool.query(
    `INSERT INTO clientes (nome, documento, tipo, email, email_nota, telefone, endereco, cep, logradouro, numero, complemento, bairro, codigo_municipio, inscricao_municipal)
     VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    [t.nome.slice(0, 200), t.documento, t.documento.length === 11 ? 'Pessoa Física' : 'Empresa', t.email && EMAIL.test(t.email) ? t.email.slice(0, 100) : null,
      t.telefone ? t.telefone.slice(0, 20) : null, endereco, t.cep && t.cep.length === 8 ? t.cep : null, t.logradouro?.slice(0, 200) || null,
      t.numero?.slice(0, 20) || null, t.complemento?.slice(0, 100) || null, t.bairro?.slice(0, 100) || null, m ? cod : null,
      t.inscricao_municipal?.slice(0, 20) || null]);
  await registrarAuditoria(pool, { entidade: 'clientes', entidadeId: novo.id, acao: 'criar', usuarioId, detalhes: { nome: t.nome, origem: 'importação de NFS-e' } });
  resumo.clientes_criados.push(t.nome);
  return novo.id;
}

// serviço do cadastro fiscal: pelo código nacional; na nota ABRASF, pelo
// item da LC 116 (7.02 → o serviço 07.02.xx)
async function servicoDaNota(n) {
  let prefixo = n.ctrib_nac;
  if (!prefixo && n.item_lista) {
    const [i, s = ''] = String(n.item_lista).split(/[.]/);
    const item = digitos(i).padStart(2, '0');
    const sub = digitos(s).padStart(2, '0');
    prefixo = digitos(n.item_lista).length >= 3 && !s ? digitos(n.item_lista).padStart(4, '0') : `${item}${sub}`;
  }
  if (!prefixo) return null;
  const { rows: [s] } = await pool.query(
    `SELECT id FROM empresa_servicos_nfse WHERE ativo AND ctrib_nac LIKE $1 || '%' ORDER BY (ctrib_nac = $2) DESC, padrao DESC, id LIMIT 1`,
    [prefixo.slice(0, 4), n.ctrib_nac || '']);
  return s?.id || null;
}

const CAMPOS_IMPORTADOS = [
  'situacao', 'padrao', 'numero', 'serie_dps', 'numero_dps', 'chave_acesso', 'codigo_verificacao', 'data_emissao', 'competencia',
  'tomador', 'ctrib_nac', 'ctrib_mun', 'item_lista', 'nbs', 'cnae', 'servico_descricao', 'discriminacao', 'codigo_municipio_prestacao',
  ...VALORES, 'aliquota_iss', 'valor_iss', 'iss_retido', 'valor_liquido', 'observacoes', 'xml', 'cancelada_em', 'motivo_cancelamento',
  'outras_informacoes', 'exigibilidade_iss', 'responsavel_retencao', 'municipio_incidencia',
];

async function gravarImportada(n, usuarioId, resumo) {
  if (n.prestador_documento && n.prestador_documento !== CNPJ_HM) {
    resumo.erros.push(`Nota ${n.numero || '?'}: o prestador não é a H&M (CNPJ ${n.prestador_documento}).`);
    return;
  }
  if (!n.numero) { resumo.erros.push('Nota sem número — ignorada.'); return; }
  if (!n.valor_liquido) n.valor_liquido = centavos(n.valor_servicos - n.desconto_incondicionado - n.desconto_condicionado
    - n.valor_pis - n.valor_cofins - n.valor_inss - n.valor_ir - n.valor_csll - n.outras_retencoes - (n.iss_retido ? n.valor_iss : 0));
  const dados = { ...n, tomador: JSON.stringify(n.tomador || {}) };
  const { rows: [existente] } = await pool.query(
    'SELECT id, situacao FROM notas_fiscais WHERE (chave_acesso IS NOT NULL AND chave_acesso = $1) OR (padrao = $2 AND numero = $3) LIMIT 1',
    [n.chave_acesso, n.padrao, n.numero]);
  const clienteId = await clienteDaNota(n.tomador || {}, usuarioId, resumo);
  const servicoId = await servicoDaNota(n);
  if (existente) {
    // reimportar: atualiza (ex.: a nota foi cancelada depois); cancelada não volta a emitida
    if (existente.situacao === 'cancelada' && n.situacao === 'emitida') { dados.situacao = 'cancelada'; delete dados.cancelada_em; delete dados.motivo_cancelamento; }
    const campos = CAMPOS_IMPORTADOS.filter(c => c in dados);
    await pool.query(
      `UPDATE notas_fiscais SET ${campos.map((c, i) => `${c} = $${i + 1}`).join(', ')},
              cliente_id = COALESCE(cliente_id, $${campos.length + 1}), servico_id = COALESCE(servico_id, $${campos.length + 2}), atualizado_em = NOW()
        WHERE id = $${campos.length + 3}`,
      [...campos.map(c => dados[c]), clienteId, servicoId, existente.id]);
    resumo.atualizadas++;
    return;
  }
  // a nota emitida no portal a partir de um rascunho daqui: o rascunho do mesmo
  // cliente e valor vira a nota (fica com o vínculo de origem dele)
  if (n.padrao === 'nacional' && clienteId) {
    const { rows: [rasc] } = await pool.query(
      `SELECT id FROM notas_fiscais WHERE situacao = 'rascunho' AND cliente_id = $1 AND valor_servicos = $2 ORDER BY id DESC LIMIT 1`,
      [clienteId, n.valor_servicos]);
    if (rasc) {
      await pool.query(
        `UPDATE notas_fiscais SET ${CAMPOS_IMPORTADOS.map((c, i) => `${c} = $${i + 1}`).join(', ')}, origem = 'importada', atualizado_em = NOW()
          WHERE id = $${CAMPOS_IMPORTADOS.length + 1}`,
        [...CAMPOS_IMPORTADOS.map(c => dados[c] ?? null), rasc.id]);
      resumo.rascunhos_emitidos++;
      return;
    }
  }
  await pool.query(
    `INSERT INTO notas_fiscais (${CAMPOS_IMPORTADOS.join(', ')}, origem, cliente_id, servico_id, criado_por)
     VALUES (${CAMPOS_IMPORTADOS.map((_, i) => `$${i + 1}`).join(', ')}, 'importada', $${CAMPOS_IMPORTADOS.length + 1},
             $${CAMPOS_IMPORTADOS.length + 2}, $${CAMPOS_IMPORTADOS.length + 3})`,
    [...CAMPOS_IMPORTADOS.map(c => dados[c] ?? null), clienteId, servicoId, usuarioId]);
  resumo.importadas++;
}

async function importarConteudos(arquivos, usuarioId) {
  const resumo = { arquivos: arquivos.length, importadas: 0, atualizadas: 0, rascunhos_emitidos: 0, canceladas: 0, clientes_criados: [], erros: [] };
  for (const a of arquivos) {
    let lido;
    try {
      lido = await lerXmlNfse(a.buffer);
    } catch (e) {
      resumo.erros.push(`${a.nome}: ${e.message}`);
      continue;
    }
    if (!lido.notas.length && !lido.cancelamentos.length) { resumo.erros.push(`${a.nome}: nenhuma NFS-e encontrada no arquivo.`); continue; }
    for (const n of lido.notas) {
      try {
        await gravarImportada(n, usuarioId, resumo);
      } catch (e) {
        resumo.erros.push(`${a.nome} (nota ${n.numero || '?'}): ${e.message}`);
      }
    }
    for (const c of lido.cancelamentos) {
      const { rowCount } = await pool.query(
        `UPDATE notas_fiscais SET situacao = $4, cancelada_em = $2, motivo_cancelamento = $3, atualizado_em = NOW()
          WHERE chave_acesso = $1 AND situacao <> 'rascunho'`,
        [c.chave, c.data, c.motivo, c.substituida ? 'substituida' : 'cancelada']);
      if (rowCount) resumo.canceladas++;
      else resumo.erros.push(`${a.nome}: cancelamento de uma nota que ainda não está no sistema (importe a nota primeiro).`);
    }
  }
  return resumo;
}

async function importar(req, res) {
  const arquivos = await arquivosXml(req.files);
  if (!arquivos.length) return res.status(400).json({ erro: 'Envie os arquivos XML das notas (ou um .zip com eles).' });
  if (arquivos.length > 2000) return res.status(400).json({ erro: 'No máximo 2.000 XML por vez.' });
  const resumo = await importarConteudos(arquivos, req.usuario.id);
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: null, acao: 'importar', usuarioId: req.usuario.id,
    detalhes: { importadas: resumo.importadas, atualizadas: resumo.atualizadas, erros: resumo.erros.length } });
  res.json(resumo);
}


// Proposta ligada à nota: de lá vêm o local, os itens e quantidades reais e o número da proposta
// que o atestado usa. O vínculo é opcional e feito pelo administrador (nada é adivinhado).
// `idsOutras`: outras notas emitidas do mesmo cliente que entram no mesmo atestado (até 10)
async function contextoAtestado(nota, idsOutras = []) {
  const outrasNotas = [];
  const ids = Array.isArray(idsOutras) ? idsOutras : [];
  for (const id of [...new Set(ids.map(Number).filter(i => Number.isInteger(i) && i > 0 && i !== nota.id))].slice(0, 10)) {
    const o = await lerNota(id);
    if (!o) throw Object.assign(new Error(`Nota ${id} não encontrada.`), { status: 404 });
    delete o.xml;
    outrasNotas.push(o);
  }
  if (!nota.proposta_id) return { outrasNotas };
  const { rows: [proposta] } = await pool.query(
    'SELECT id, numero, total, local_obra, status, cliente_id, obra_id FROM propostas WHERE id = $1', [nota.proposta_id]);
  if (!proposta) return { outrasNotas };
  const [{ rows: [obra] }, { rows: itens }] = await Promise.all([
    proposta.obra_id ? pool.query('SELECT nome, local FROM obras WHERE id = $1', [proposta.obra_id]) : { rows: [] },
    pool.query(
      `SELECT i.descricao, i.quantidade, i.unidade, s.nome AS secao
         FROM proposta_itens i LEFT JOIN proposta_secoes s ON s.id = i.secao_id
        WHERE i.proposta_id = $1 AND COALESCE(i.status, 'confirmado') = 'confirmado'
        ORDER BY s.ordem NULLS LAST, i.ordem, i.id`, [proposta.id]),
  ]);
  return { proposta, obra, itens, outrasNotas };
}

// Atestado de capacidade técnica (item 9): só o corpo do texto, para o cliente colar no papel
// timbrado dele. `previa` devolve o texto para conferir; `atestadoDocx` baixa o Word. Nunca marca
// nada como emitido: quem atesta é o cliente.
async function previaAtestado(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  try {
    const { titulo, texto, avisos, sugestao } = atestado.montarAtestado(n, req.body || {}, await contextoAtestado(n, req.body?.notas_ids));
    res.json({ titulo, texto, avisos, sugestao, proposta_id: n.proposta_id, proposta_numero: n.proposta_numero });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ erro: err.message });
    throw err;
  }
}

async function atestadoDocx(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  try {
    const { blocos } = atestado.montarAtestado(n, req.body || {}, await contextoAtestado(n, req.body?.notas_ids));
    const arquivo = await atestado.gerarDocx(blocos);
    await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'atestado_gerado', usuarioId: req.usuario.id, detalhes: { nota: n.numero, proposta_id: n.proposta_id, notas_ids: req.body?.notas_ids || [] } });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': contentDisposition(`Atestado_NFS-e_${n.numero || n.id}.docx`),
    });
    res.send(arquivo);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ erro: err.message });
    throw err;
  }
}

// Propostas do mesmo cliente da nota que podem ser ligadas a ela (não canceladas nem recusadas)
async function propostasCandidatas(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  if (!n.cliente_id) return res.json([]);
  const { rows } = await pool.query(
    `SELECT id, numero, to_char(data, 'YYYY-MM-DD') AS data, total, status, local_obra
       FROM propostas WHERE cliente_id = $1 AND status IN ('Aprovada', 'Ativa')
      ORDER BY (status = 'Aprovada') DESC, data DESC, id DESC LIMIT 100`, [n.cliente_id]);
  res.json(rows);
}

// Liga (ou desliga, com null) a nota a uma proposta. Não mexe em nada fiscal da nota, por isso vale
// também para nota já emitida. A proposta precisa ser do mesmo cliente da nota.
async function vincularProposta(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const bruto = req.body?.proposta_id;
  const propostaId = bruto == null || bruto === '' ? null : Number(bruto);
  if (propostaId !== null && (!Number.isInteger(propostaId) || propostaId <= 0)) return res.status(400).json({ erro: 'Proposta inválida.' });
  if (propostaId !== null) {
    const { rows: [p] } = await pool.query('SELECT id, cliente_id, status FROM propostas WHERE id = $1', [propostaId]);
    if (!p) return res.status(404).json({ erro: 'Proposta não encontrada.' });
    if (['Cancelada', 'Recusada'].includes(p.status)) return res.status(400).json({ erro: `A proposta está ${p.status.toLowerCase()}.` });
    if (n.cliente_id && p.cliente_id && n.cliente_id !== p.cliente_id) return res.status(400).json({ erro: 'A proposta é de outro cliente.' });
  }
  await pool.query('UPDATE notas_fiscais SET proposta_id = $1 WHERE id = $2', [propostaId, n.id]);
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'vincular_proposta', usuarioId: req.usuario.id, detalhes: { de: n.proposta_id, para: propostaId } });
  const nova = await lerNota(n.id);
  res.json({ proposta_id: nova.proposta_id, proposta_numero: nova.proposta_numero });
}

// Outras notas EMITIDAS do mesmo cliente que podem entrar no mesmo atestado (contrato com várias notas)
async function notasCandidatas(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const doc = digitos(n.tomador?.documento);
  const { rows } = await pool.query(
    `SELECT id, numero, to_char(data_emissao, 'YYYY-MM-DD') AS data_emissao, valor_servicos, left(discriminacao, 120) AS resumo
       FROM notas_fiscais
      WHERE situacao = 'emitida' AND id <> $1
        AND (($2::int IS NOT NULL AND cliente_id = $2) OR ($3 <> '' AND regexp_replace(tomador->>'documento', '\\D', '', 'g') = $3))
      ORDER BY data_emissao DESC NULLS LAST, id DESC LIMIT 100`, [n.id, n.cliente_id, doc]);
  res.json(rows);
}

// Manda o atestado (Word) ao cliente por e-mail e registra o envio. Corpo: { destinatario, mensagem, notas_ids, ...opcoes do atestado }.
// O e-mail diz que o texto é uma proposta para o cliente conferir e colar no papel timbrado dele.
async function enviarAtestado(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const { destinatario, mensagem, ...opcoes } = req.body || {};
  const destinatarios = String(destinatario ?? '').split(/[;,\s]+/).map(x => x.trim()).filter(Boolean);
  if (!destinatarios.length || destinatarios.length > 5 || destinatarios.some(d => d.length > 254 || !EMAIL.test(d))) {
    return res.status(400).json({ erro: 'Informe de 1 a 5 e-mails válidos (separados por vírgula).' });
  }
  if (mensagem != null && (typeof mensagem !== 'string' || mensagem.length > 10000)) return res.status(400).json({ erro: 'Mensagem de até 10.000 caracteres.' });
  try {
    const contexto = await contextoAtestado(n, opcoes.notas_ids);
    const { blocos } = atestado.montarAtestado(n, opcoes, contexto);
    const arquivo = await atestado.gerarDocx(blocos);
    const numeros = [n, ...contexto.outrasNotas].map(x => x.numero).join(', ');
    const corpo = (mensagem && mensagem.trim())
      || `Olá,\n\nSegue em anexo a proposta de texto do atestado de capacidade técnica referente à NFS-e nº ${numeros}. O arquivo traz só o corpo do texto, sem papel timbrado: cole-o no papel timbrado de vocês, confira os dados, ajuste o que for preciso e assine.`;
    await criarTransportador().sendMail({
      from: `"H&M Engenharia" <${process.env.EMAIL_IMAP_USER}>`,
      to: destinatarios.join(', '),
      subject: `Atestado de capacidade técnica — NFS-e nº ${numeros} — ${EMPRESA.nomeFantasia}`,
      text: `${corpo}\n\n${ASSINATURA_EMPRESA}`,
      attachments: [{ filename: `Atestado_NFS-e_${n.numero || n.id}.docx`, content: arquivo, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
    });
    const para = destinatarios.join(', ').slice(0, 254);
    await pool.query('UPDATE notas_fiscais SET atestado_enviado_em = NOW(), atestado_enviado_para = $2 WHERE id = $1', [n.id, para]);
    await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'atestado_enviado', usuarioId: req.usuario.id, detalhes: { para, notas: numeros } });
    res.json({ mensagem: `Atestado enviado para ${para}`, atestado_enviado_em: new Date(), atestado_enviado_para: para });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ erro: err.message });
    throw err;
  }
}

// Rascunho de nota a partir de uma proposta (cliente, valor total e local vêm dela). O serviço fiscal (código de tributação,
// alíquota, município) é o da última nota do cliente — ou da última nota registrada, se o cliente é novo. Só cria RASCUNHO: o
// administrador confere e emite como sempre. Uma proposta que já tem nota ativa pede confirmação (`confirmar: true`).
async function criarDeProposta(req, res) {
  const propostaId = Number(req.body?.proposta_id);
  if (!Number.isInteger(propostaId) || propostaId <= 0) return res.status(400).json({ erro: 'Escolha a proposta.' });
  const { rows: [p] } = await pool.query('SELECT id, numero, total, cliente_id, local_obra, status FROM propostas WHERE id = $1', [propostaId]);
  if (!p) return res.status(404).json({ erro: 'Proposta não encontrada.' });
  if (['Cancelada', 'Recusada'].includes(p.status)) return res.status(400).json({ erro: `A proposta está ${p.status.toLowerCase()}.` });
  if (!p.cliente_id) return res.status(400).json({ erro: 'A proposta não tem cliente cadastrado: cadastre o cliente antes de gerar a nota.' });
  if (!(Number(p.total) > 0)) return res.status(400).json({ erro: 'A proposta não tem valor total.' });
  const { rows: ativas } = await pool.query(
    "SELECT id, numero, situacao FROM notas_fiscais WHERE proposta_id = $1 AND situacao IN ('rascunho', 'emitida') ORDER BY id", [p.id]);
  if (ativas.length && req.body?.confirmar !== true) {
    return res.status(409).json({ erro: `Esta proposta já tem ${ativas.length > 1 ? 'notas' : 'nota'} (${ativas.map(a => (a.numero ? `nº ${a.numero}` : 'rascunho')).join(', ')}). Confirme para criar mais um rascunho (nota parcial, por exemplo).`, ja_tem_nota: true });
  }
  const { rows: [base] } = await pool.query(
    `SELECT servico_id, aliquota_iss, codigo_municipio_prestacao FROM notas_fiscais
      WHERE servico_id IS NOT NULL AND situacao IN ('emitida', 'rascunho')
      ORDER BY (cliente_id = $1) DESC, (situacao = 'emitida') DESC, id DESC LIMIT 1`, [p.cliente_id]);
  if (!base) return res.status(409).json({ erro: 'Ainda não há nota anterior para copiar o serviço fiscal. Crie o primeiro rascunho à mão (Nova nota).' });
  const tomador = await tomadorDoCliente(p.cliente_id);
  if (!tomador) return res.status(400).json({ erro: 'O cliente da proposta está inativo ou foi removido.' });
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const { d, erro } = await dadosDoRascunho({
    cliente_id: p.cliente_id, servico_id: base.servico_id, valor_servicos: Number(p.total), competencia: hoje,
    discriminacao: `Prestação de serviços conforme proposta comercial nº ${p.numero}${p.local_obra ? ` — ${String(p.local_obra).trim()}` : ''}.`.slice(0, 2000),
    aliquota_iss: base.aliquota_iss, iss_retido: !!tomador.retem_iss, codigo_municipio_prestacao: base.codigo_municipio_prestacao,
  });
  if (erro) return res.status(400).json({ erro });
  const { rows: [n] } = await pool.query(
    `INSERT INTO notas_fiscais (${CAMPOS_RASCUNHO.join(', ')}, criado_por, proposta_id)
     VALUES (${CAMPOS_RASCUNHO.map((_, i) => `$${i + 1}`).join(', ')}, $${CAMPOS_RASCUNHO.length + 1}, $${CAMPOS_RASCUNHO.length + 2}) RETURNING id`,
    [...CAMPOS_RASCUNHO.map(c => d[c]), req.usuario.id, p.id]);
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'criar_de_proposta', usuarioId: req.usuario.id, detalhes: { proposta_id: p.id, valor: d.valor_servicos } });
  res.status(201).json({ id: n.id, mensagem: `Rascunho criado a partir da proposta ${p.numero}: confira o texto, o valor e o serviço antes de emitir.` });
}

// Pix recebidos que podem ter quitado a nota (mesmo valor líquido ou bruto, a partir da emissão) e os já ligados a ela
async function recebimentosCandidatos(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const [{ rows: ligados }, { rows: candidatos }] = await Promise.all([
    pool.query('SELECT id, nome, valor, data_hora FROM financeiro_movimentos WHERE nota_id = $1 ORDER BY data_hora', [n.id]),
    n.situacao !== 'emitida' ? { rows: [] } : pool.query(
      `SELECT id, nome, valor, data_hora FROM financeiro_movimentos
        WHERE tipo = 'recebido' AND nota_id IS NULL
          AND (abs(valor - $1) < 0.01 OR abs(valor - $2) < 0.01)
          AND data_hora >= COALESCE($3::timestamp, '2000-01-01') - interval '1 day'
        ORDER BY data_hora DESC LIMIT 30`, [Number(n.valor_liquido), Number(n.valor_servicos), n.data_emissao]),
  ]);
  res.json({ ligados, candidatos, valor_liquido: Number(n.valor_liquido), valor_servicos: Number(n.valor_servicos) });
}

// Liga (ou desliga, com `ligar: false`) um Pix recebido à nota. Uma nota pode ter mais de um (pagamento parcelado).
async function ligarRecebimento(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const movimentoId = Number(req.body?.movimento_id);
  if (!Number.isInteger(movimentoId) || movimentoId <= 0) return res.status(400).json({ erro: 'Movimento inválido.' });
  const ligar = req.body?.ligar !== false;
  if (ligar) {
    if (n.situacao !== 'emitida') return res.status(409).json({ erro: 'Só nota emitida recebe pagamento.' });
    const { rows } = await pool.query("UPDATE financeiro_movimentos SET nota_id = $1 WHERE id = $2 AND tipo = 'recebido' AND (nota_id IS NULL OR nota_id = $1) RETURNING id", [n.id, movimentoId]);
    if (!rows.length) return res.status(409).json({ erro: 'Esse movimento não é um recebimento livre (já está ligado a outra nota?).' });
  } else {
    await pool.query('UPDATE financeiro_movimentos SET nota_id = NULL WHERE id = $1 AND nota_id = $2', [movimentoId, n.id]);
  }
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: ligar ? 'ligar_recebimento' : 'desligar_recebimento', usuarioId: req.usuario.id, detalhes: { movimento_id: movimentoId } });
  const nova = await lerNota(n.id);
  res.json({ recebido_valor: nova.recebido_valor, recebido_em: nova.recebido_em });
}

module.exports = {
  notasCandidatas, enviarAtestado, criarDeProposta, recebimentosCandidatos, ligarRecebimento,
  listar, obter, criar, atualizar, remover, duplicar, cancelar, configCancelamento, pdf, previewHtml, xml, enviarEmail, importar,
  previaAtestado, atestadoDocx, propostasCandidatas, vincularProposta,
  // testes e scripts
  importarConteudos, calcularTotais,
};
