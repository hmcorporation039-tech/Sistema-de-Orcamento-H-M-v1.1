// Notas fiscais de serviço — importação dos XML já emitidos (soltos ou em .zip): a nota nova entra, a
// já importada é atualizada, o rascunho daqui que virou nota no portal é casado, o tomador sem cadastro
// vira cliente e os eventos de cancelamento/substituição são aplicados.
const path = require('path');
const JSZip = require('jszip');
const pool = require('../../config/database');
const { registrarAuditoria } = require('../../services/auditoria');
const { lerXmlNfse } = require('../../utils/nfseXml');
const { CNPJ_HM, digitos, EMAIL, centavos, VALORES } = require('./comum');

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
  // cliente e valor vira a nota (fica com o vínculo de origem dele).
  // Só quando há UM rascunho assim (revisão de 11/2026): com dois do mesmo
  // cliente e valor (duas propostas iguais, por exemplo) o "mais novo" podia
  // ser o errado — a nota ia para a proposta errada. Aí a nota entra como
  // nova e o aviso pede para o usuário apagar o rascunho que ela substituiu.
  if (n.padrao === 'nacional' && clienteId) {
    const { rows: rascunhos } = await pool.query(
      `SELECT id FROM notas_fiscais WHERE situacao = 'rascunho' AND cliente_id = $1 AND valor_servicos = $2 ORDER BY id DESC LIMIT 2`,
      [clienteId, n.valor_servicos]);
    const rasc = rascunhos.length === 1 ? rascunhos[0] : null;
    if (rascunhos.length > 1) {
      resumo.erros.push(`Nota ${n.numero || '?'}: há mais de um rascunho do mesmo cliente com o mesmo valor — importada como nota nova. Ligue a proposta certa à nota e apague o rascunho que ela substituiu.`);
    }
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
        // nota já "substituída" (por outra nota) não vira "cancelada" com um
        // evento de cancelamento depois: o vínculo com a substituta se perdia
        `UPDATE notas_fiscais SET situacao = $4, cancelada_em = $2, motivo_cancelamento = $3, atualizado_em = NOW()
          WHERE chave_acesso = $1 AND situacao <> 'rascunho' AND NOT (situacao = 'substituida' AND $4 = 'cancelada')`,
        [c.chave, c.data, c.motivo, c.substituida ? 'substituida' : 'cancelada']);
      if (rowCount) { resumo.canceladas++; continue; }
      const { rows: [jaSubstituida] } = await pool.query(
        "SELECT 1 FROM notas_fiscais WHERE chave_acesso = $1 AND situacao = 'substituida'", [c.chave]);
      if (!jaSubstituida) resumo.erros.push(`${a.nome}: cancelamento de uma nota que ainda não está no sistema (importe a nota primeiro).`);
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

module.exports = { importar, importarConteudos };
