// Importa para o sistema o que a H&M tinha no SYSB1 (versão 2.4): o cadastro
// de clientes, os XML das NFS-e emitidas no ISSnet DF e a situação oficial de
// cada nota no portal do ISS (cancelamento, chave no Ambiente de Dados Nacional
// e o link da nota, que vai no QR Code do PDF). Pode rodar de novo: cliente
// existente só ganha os campos que estavam vazios e nota existente é atualizada.
//
// A pasta (fora do repositório — tem dados de clientes) é a do download feito
// no SYSB1, só leitura:
//   xml/*.xml               XML de cada nota (form_nfes_download_go)
//   sysb1-clientes.json     consulta de clientes (Cons_Cliente_G)
//   issdf-situacao.json     página de cada nota no ISS DF, por número
//
// Uso (pasta backend):  node scripts/importar-notas-sysb1.js "<pasta>"
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');
const migracaoNotas = require('../src/models/migracoes/2.0-22-notas-fiscais');
const { importarConteudos } = require('../src/controllers/notasFiscaisController');
const { registrarAuditoria } = require('../src/services/auditoria');

const digitos = (v) => String(v ?? '').replace(/\D/g, '');
const lerJson = (pasta, nome) => {
  const arq = path.join(pasta, nome);
  return fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : null;
};

// dd/mm/aaaa → aaaa-mm-ddT12:00:00-03:00
const dataBR = (t) => {
  const m = String(t || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}T12:00:00-03:00` : null;
};

async function importarClientes(lista, usuarioId) {
  const r = { criados: [], completados: [], ignorados: [] };
  for (const c of lista || []) {
    const doc = digitos(c.doc);
    if (!doc) { r.ignorados.push(c.nome); continue; }
    const contato = (c.contatos || []).find(k => k.nome || k.email || k.telefone || k.celular) || {};
    const codMun = digitos(String(c.ibge || '').split('-')[0]).slice(0, 7) || null;
    const { rows: [m] } = codMun ? await pool.query('SELECT nome, uf FROM municipios_ibge WHERE codigo = $1', [codMun]) : { rows: [] };
    const cep = digitos(c.cep).padStart(8, '0');
    const d = {
      nome: String(c.nome).trim().slice(0, 200),
      tipo: doc.length === 11 ? 'Pessoa Física' : 'Empresa',
      responsavel: contato.nome ? String(contato.nome).trim().slice(0, 100) : null,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato.email || '') ? contato.email.trim().slice(0, 100) : null,
      telefone: (contato.telefone || contato.celular || '').trim().slice(0, 20) || null,
      cep: c.cep && cep.length === 8 ? cep : null,
      logradouro: c.logr ? String(c.logr).trim().slice(0, 200) : null,
      bairro: c.bairro ? String(c.bairro).trim().slice(0, 100) : null,
      codigo_municipio: m ? codMun : null,
    };
    d.endereco = d.logradouro
      ? `${d.logradouro}${d.bairro ? ` – ${d.bairro}` : ''}${m ? `, ${m.nome}-${m.uf}` : ''}${d.cep ? `, CEP ${d.cep.slice(0, 5)}-${d.cep.slice(5)}` : ''}`
      : null;
    const { rows: [existente] } = await pool.query(
      "SELECT * FROM clientes WHERE ativo = true AND regexp_replace(COALESCE(documento, ''), '\\D', '', 'g') = $1 ORDER BY id LIMIT 1", [doc]);
    if (existente) {
      // só preenche o que está vazio: o cadastro daqui manda
      const vazio = (k) => existente[k] == null || String(existente[k]).trim() === '';
      const novos = ['responsavel', 'email', 'telefone', 'cep', 'logradouro', 'bairro', 'codigo_municipio', 'endereco']
        .filter(k => d[k] && vazio(k));
      if (d.email && vazio('email_nota')) { novos.push('email_nota'); d.email_nota = d.email; }
      if (novos.length) {
        await pool.query(
          `UPDATE clientes SET ${novos.map((k, i) => `${k} = $${i + 1}`).join(', ')}, atualizado_em = NOW() WHERE id = $${novos.length + 1}`,
          [...novos.map(k => d[k]), existente.id]);
        r.completados.push(`${d.nome} (${novos.join(', ')})`);
      }
      continue;
    }
    const { rows: [novo] } = await pool.query(
      `INSERT INTO clientes (nome, documento, tipo, responsavel, email, email_nota, telefone, endereco, cep, logradouro, bairro, codigo_municipio)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [d.nome, doc, d.tipo, d.responsavel, d.email, d.telefone, d.endereco, d.cep, d.logradouro, d.bairro, d.codigo_municipio]);
    await registrarAuditoria(pool, { entidade: 'clientes', entidadeId: novo.id, acao: 'criar', usuarioId, detalhes: { nome: d.nome, origem: 'importação do SYSB1' } });
    r.criados.push(d.nome);
  }
  return r;
}

// situação de cada nota no portal do ISS DF: link (QR Code), chave nacional e
// cancelamento (o SYSB1 mostrava a nota 25 como autorizada, mas ela foi
// cancelada no ISS)
async function aplicarSituacaoIss(situacao) {
  const r = { atualizadas: 0, canceladas: [] };
  for (const [numero, s] of Object.entries(situacao || {})) {
    if (!s || s.erro) continue;
    const { rowCount } = await pool.query(
      `UPDATE notas_fiscais SET link_consulta = $3, chave_nacional = $4, atualizado_em = NOW()
        WHERE padrao = 'abrasf' AND numero = $1 AND (codigo_verificacao IS NULL OR codigo_verificacao = $2)`,
      [Number(numero), s.cv, s.url || null, digitos(s.chave).length === 50 ? digitos(s.chave) : null]);
    r.atualizadas += rowCount;
    if (s.canc) {
      const motivo = String(s.canc).split(/Data de cancelamento/i)[0].trim().slice(0, 255) || 'Cancelada no ISSnet';
      const { rowCount: c } = await pool.query(
        `UPDATE notas_fiscais SET situacao = 'cancelada', motivo_cancelamento = $2,
                cancelada_em = COALESCE(cancelada_em, $3::timestamptz), atualizado_em = NOW()
          WHERE padrao = 'abrasf' AND numero = $1`,
        [Number(numero), motivo, dataBR(String(s.canc).split(/Data de cancelamento/i)[1])]);
      if (c) r.canceladas.push(Number(numero));
    }
  }
  return r;
}

(async () => {
  const pasta = process.argv[2];
  if (!pasta || !fs.existsSync(pasta)) throw new Error('Informe a pasta com xml/, sysb1-clientes.json e issdf-situacao.json');
  const { rows: [banco] } = await pool.query('SELECT current_database() AS nome');
  const { rows: [admin] } = await pool.query("SELECT id FROM usuarios WHERE role = 'admin' ORDER BY id LIMIT 1");
  console.log(`Banco: ${banco.nome}`);

  const c = await pool.connect();
  try { await migracaoNotas(c); } finally { c.release(); }

  const clientes = await importarClientes(lerJson(pasta, 'sysb1-clientes.json'), admin.id);
  console.log(`Clientes: ${clientes.criados.length} criados, ${clientes.completados.length} completados, ${clientes.ignorados.length} sem CPF/CNPJ (ignorados)`);

  const pastaXml = path.join(pasta, 'xml');
  const arquivos = fs.existsSync(pastaXml)
    ? fs.readdirSync(pastaXml).filter(f => /\.xml$/i.test(f)).sort().map(f => ({ nome: f, buffer: fs.readFileSync(path.join(pastaXml, f)) }))
    : [];
  const notas = await importarConteudos(arquivos, admin.id);
  console.log(`Notas: ${arquivos.length} XML lidos, ${notas.importadas} importadas, ${notas.atualizadas} atualizadas (repetidas no SYSB1), ${notas.clientes_criados.length} clientes criados pela nota`);
  for (const erro of notas.erros) console.log(`  ! ${erro}`);

  // a consulta de clientes do SYSB1 não traz número, complemento nem inscrição
  // municipal; a nota mais recente de cada cliente traz (só preenche o vazio)
  const { rowCount: completadosPelaNota } = await pool.query(`
    UPDATE clientes c SET
           numero = COALESCE(NULLIF(c.numero, ''), NULLIF(u.tomador->>'numero', '')),
           complemento = COALESCE(NULLIF(c.complemento, ''), NULLIF(u.tomador->>'complemento', '')),
           inscricao_municipal = COALESCE(NULLIF(c.inscricao_municipal, ''), NULLIF(u.tomador->>'inscricao_municipal', '')),
           atualizado_em = NOW()
      FROM (SELECT DISTINCT ON (cliente_id) cliente_id, tomador FROM notas_fiscais
             WHERE cliente_id IS NOT NULL AND padrao = 'abrasf' ORDER BY cliente_id, data_emissao DESC) u
     WHERE c.id = u.cliente_id
       AND ((NULLIF(c.numero, '') IS NULL AND NULLIF(u.tomador->>'numero', '') IS NOT NULL)
         OR (NULLIF(c.complemento, '') IS NULL AND NULLIF(u.tomador->>'complemento', '') IS NOT NULL)
         OR (NULLIF(c.inscricao_municipal, '') IS NULL AND NULLIF(u.tomador->>'inscricao_municipal', '') IS NOT NULL))`);
  console.log(`Clientes completados com número/complemento/IM da última nota: ${completadosPelaNota}`);

  const iss = await aplicarSituacaoIss(lerJson(pasta, 'issdf-situacao.json'));
  console.log(`ISS DF: ${iss.atualizadas} notas com link e chave nacional; canceladas no ISS: ${iss.canceladas.join(', ') || 'nenhuma'}`);

  const { rows } = await pool.query(
    `SELECT situacao, COUNT(*)::int AS qtd, SUM(valor_servicos)::numeric(15,2) AS total FROM notas_fiscais WHERE padrao = 'abrasf' GROUP BY situacao ORDER BY situacao`);
  for (const l of rows) console.log(`  ${l.situacao}: ${l.qtd} nota(s), R$ ${Number(l.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  await pool.end();
})().catch(async (e) => { console.error(e.message); await pool.end().catch(() => {}); process.exit(1); });
