// Vencimentos de laudos: quando cada laudo entregue precisa ser renovado (tabela vencimentos_laudos,
// migração 2.0-31). A decisão (somar meses, em que etapa de aviso está, texto do e-mail) é função pura;
// o banco e o e-mail entram por parâmetro, para o teste rodar sem nenhum dos dois.
//
// Além dos laudos (tipo 'laudo'), há os documentos da própria empresa (tipo 'empresa': certidões, alvará, CREA,
// seguro, certificado digital). Esses têm data de vencimento escrita no documento, então se informa o "vence em"
// direto. O certificado A1 da NFS-e tem origem 'certificado_a1': a data vem do arquivo .pfx, não de digitação.
//
// A validade padrão (12 meses) é uma sugestão, não a norma: cada registro guarda a sua, e quem
// cadastra confere com a exigência do local (distribuidora, bombeiros, seguradora, NR-10).
const pool = require('../config/database');

const VALIDADE_PADRAO_MESES = 12;
const ETAPAS = { nenhuma: 0, sessenta: 1, trinta: 2, vencido: 3 };

const dataIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hojeIso = (agora = new Date()) => dataIso(agora);
const ehDataIso = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`)) && dataIso(new Date(`${s}T12:00:00`)) === s;

// Soma meses sem estourar o fim do mês (31/01 + 1 mês = 28/02, não 03/03).
function somarMeses(iso, meses) {
  const [a, m, d] = iso.split('-').map(Number);
  const alvo = new Date(a, m - 1 + meses, 1, 12);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0, 12).getDate();
  alvo.setDate(Math.min(d, ultimo));
  return dataIso(alvo);
}

// Dias de `hoje` até `vence` (negativo = já venceu).
function diasAte(venceIso, hoje = hojeIso()) {
  const t = (s) => Date.UTC(...s.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  return Math.round((t(venceIso) - t(hoje)) / 86400000);
}

// Em que etapa de aviso o vencimento está HOJE.
function etapaDevida(dias) {
  if (dias < 0) return ETAPAS.vencido;
  if (dias <= 30) return ETAPAS.trinta;
  if (dias <= 60) return ETAPAS.sessenta;
  return ETAPAS.nenhuma;
}

function situacao(venceIso, hoje = hojeIso()) {
  const dias = diasAte(venceIso, hoje);
  const etapa = etapaDevida(dias);
  const rotulo = etapa === ETAPAS.vencido ? `venceu há ${-dias} dia${dias === -1 ? '' : 's'}`
    : dias === 0 ? 'vence hoje' : `vence em ${dias} dia${dias === 1 ? '' : 's'}`;
  return { dias, etapa, rotulo, nivel: etapa === ETAPAS.vencido ? 'vencido' : etapa === ETAPAS.trinta ? 'urgente' : etapa === ETAPAS.sessenta ? 'atencao' : 'ok' };
}

function validarEntrada({ tipo, disciplina, descricao, emitido_em, vence_em, validade_meses }) {
  if (tipo === 'empresa') {
    if (!String(descricao || '').trim()) return 'Diga qual documento é (ex.: "Certidão negativa federal").';
    if (!ehDataIso(vence_em)) return 'Informe a data de vencimento do documento.';
    return null;
  }
  if (!String(disciplina || '').trim()) return 'Informe a disciplina (SPDA, incêndio, elétrica…).';
  if (!String(descricao || '').trim()) return 'Descreva o laudo (ex.: "SPDA — Edifício Aurora").';
  if (!ehDataIso(emitido_em)) return 'Informe a data de emissão do laudo.';
  const m = Number(validade_meses);
  if (!Number.isInteger(m) || m < 1 || m > 120) return 'A validade deve ser de 1 a 120 meses.';
  return null;
}

const COLUNAS = `v.id, v.disciplina, v.descricao, v.cliente_id, v.cliente_nome, v.obra_id, v.laudo_id, v.validade_meses,
  to_char(v.emitido_em, 'YYYY-MM-DD') AS emitido_em, to_char(v.vence_em, 'YYYY-MM-DD') AS vence_em,
  v.etapa_avisada, v.observacao, v.tipo, v.origem,
  (SELECT p.id FROM propostas p WHERE p.id = v.proposta_renovacao_id AND p.status = 'Ativa') AS proposta_renovacao_id,
  (SELECT p.numero FROM propostas p WHERE p.id = v.proposta_renovacao_id AND p.status = 'Ativa') AS proposta_renovacao_numero`;

// Documentos da empresa só aparecem para o administrador (incluirEmpresa), como o resto do que é fiscal/financeiro.
async function listar(db = pool, hoje = hojeIso(), { incluirEmpresa = true } = {}) {
  const { rows } = await db.query(`SELECT ${COLUNAS} FROM vencimentos_laudos v WHERE v.ativo${incluirEmpresa ? '' : " AND v.tipo = 'laudo'"} ORDER BY v.vence_em, v.id`);
  const itens = rows.map(r => ({ ...r, ...situacao(r.vence_em, hoje) }));
  const resumo = { total: itens.length, vencidos: 0, urgentes: 0, atencao: 0 };
  for (const i of itens) {
    if (i.nivel === 'vencido') resumo.vencidos++;
    else if (i.nivel === 'urgente') resumo.urgentes++;
    else if (i.nivel === 'atencao') resumo.atencao++;
  }
  return { itens, resumo, validadePadraoMeses: VALIDADE_PADRAO_MESES };
}

function mesesEntre(deIso, ateIso) {
  const [a1, m1] = deIso.split('-').map(Number);
  const [a2, m2] = ateIso.split('-').map(Number);
  return Math.min(120, Math.max(1, (a2 - a1) * 12 + (m2 - m1)));
}

async function criarEmpresa(db, dados, usuarioId, hoje) {
  const emissao = ehDataIso(dados.emitido_em) ? dados.emitido_em : hoje;
  const { rows } = await db.query(
    `INSERT INTO vencimentos_laudos (tipo, disciplina, descricao, emitido_em, validade_meses, vence_em, observacao, criado_por)
     VALUES ('empresa', 'empresa', $1, $2, $3, $4, $5, $6) RETURNING id`,
    [String(dados.descricao).trim().slice(0, 200), emissao, mesesEntre(emissao, dados.vence_em), dados.vence_em, String(dados.observacao || '').trim() || null, usuarioId]
  );
  return rows[0].id;
}

async function criar(db, dados, usuarioId = null, hoje = hojeIso()) {
  if (dados.tipo === 'empresa') {
    const e = validarEntrada(dados);
    if (e) throw Object.assign(new Error(e), { status: 400 });
    return criarEmpresa(db, dados, usuarioId, hoje);
  }
  const erro = validarEntrada({ ...dados, validade_meses: dados.validade_meses ?? VALIDADE_PADRAO_MESES });
  if (erro) throw Object.assign(new Error(erro), { status: 400 });
  const meses = Number(dados.validade_meses ?? VALIDADE_PADRAO_MESES);
  let nome = String(dados.cliente_nome || '').trim().slice(0, 200) || null;
  const clienteId = Number.isInteger(Number(dados.cliente_id)) && Number(dados.cliente_id) > 0 ? Number(dados.cliente_id) : null;
  if (clienteId && !nome) nome = (await db.query('SELECT nome FROM clientes WHERE id = $1', [clienteId])).rows[0]?.nome || null;
  const { rows } = await db.query(
    `INSERT INTO vencimentos_laudos (disciplina, descricao, cliente_id, cliente_nome, emitido_em, validade_meses, vence_em, observacao, criado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [String(dados.disciplina).trim().toLowerCase().slice(0, 30), String(dados.descricao).trim().slice(0, 200), clienteId, nome,
      dados.emitido_em, meses, somarMeses(dados.emitido_em, meses), String(dados.observacao || '').trim() || null, usuarioId]
  );
  return rows[0].id;
}

// "Renovei": nova emissão (hoje, se não vier data), mesma validade, avisos recomeçam.
async function renovar(db, id, { emitido_em, validade_meses, vence_em } = {}, hoje = hojeIso()) {
  const atual = (await db.query('SELECT validade_meses, tipo, origem FROM vencimentos_laudos WHERE id = $1 AND ativo', [id])).rows[0];
  if (!atual) throw Object.assign(new Error('Vencimento não encontrado.'), { status: 404 });
  if (atual.origem) throw Object.assign(new Error('Esta data é lida do arquivo do certificado: troque o arquivo e ela se atualiza sozinha.'), { status: 400 });
  if (atual.tipo === 'empresa') {
    // Cada renovação de documento traz a data nova escrita nele (a certidão de hoje vale até outra data).
    if (!ehDataIso(vence_em)) throw Object.assign(new Error('Informe a nova data de vencimento do documento.'), { status: 400 });
    if (vence_em <= hoje) throw Object.assign(new Error('A nova data de vencimento precisa ser futura.'), { status: 400 });
    await db.query(
      `UPDATE vencimentos_laudos SET emitido_em = $2, validade_meses = $3, vence_em = $4, etapa_avisada = 0, avisado_em = NULL WHERE id = $1`,
      [id, hoje, mesesEntre(hoje, vence_em), vence_em]
    );
    return;
  }
  const emissao = emitido_em || hoje;
  if (!ehDataIso(emissao)) throw Object.assign(new Error('Data de emissão inválida.'), { status: 400 });
  const meses = Number(validade_meses || atual.validade_meses);
  if (!Number.isInteger(meses) || meses < 1 || meses > 120) throw Object.assign(new Error('A validade deve ser de 1 a 120 meses.'), { status: 400 });
  await db.query(
    `UPDATE vencimentos_laudos SET emitido_em = $2, validade_meses = $3, vence_em = $4, etapa_avisada = 0, avisado_em = NULL WHERE id = $1`,
    [id, emissao, meses, somarMeses(emissao, meses)]
  );
}

async function encerrar(db, id) {
  const r = await db.query('UPDATE vencimentos_laudos SET ativo = FALSE WHERE id = $1 AND ativo', [id]);
  if (!r.rowCount) throw Object.assign(new Error('Vencimento não encontrado.'), { status: 404 });
}

// Laudos do sistema (tipo 'laudo', com data no cabeçalho) que ainda não têm vencimento entram sozinhos.
// Laudo de exemplo (dados_ilustrativos) não entra. Um laudo mais novo da mesma obra e disciplina
// encerra o vencimento do antigo: renovar é emitir outro laudo.
async function sincronizarLaudos(db = pool) {
  const { rows } = await db.query(
    `SELECT l.id, l.disciplina, l.titulo, l.cliente_id, l.cliente_nome, l.obra_id, l.dados->'meta'->>'data' AS data
       FROM laudos_projetos l
      WHERE l.tipo = 'laudo'
        AND COALESCE((l.dados->'meta'->>'dados_ilustrativos')::boolean, FALSE) = FALSE
        AND NOT EXISTS (SELECT 1 FROM vencimentos_laudos v WHERE v.laudo_id = l.id)
      ORDER BY l.id`
  );
  let novos = 0;
  for (const l of rows) {
    if (!ehDataIso(l.data)) continue;
    await db.query(
      `INSERT INTO vencimentos_laudos (disciplina, descricao, cliente_id, cliente_nome, obra_id, laudo_id, emitido_em, validade_meses, vence_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
      [String(l.disciplina).toLowerCase(), String(l.titulo || `Laudo ${l.disciplina}`).slice(0, 200), l.cliente_id, l.cliente_nome,
        l.obra_id, l.id, l.data, VALIDADE_PADRAO_MESES, somarMeses(l.data, VALIDADE_PADRAO_MESES)]
    );
    novos++;
    if (l.obra_id) {
      await db.query(
        `UPDATE vencimentos_laudos SET ativo = FALSE
          WHERE ativo AND obra_id = $1 AND disciplina = $2 AND laudo_id IS DISTINCT FROM $3 AND emitido_em < $4`,
        [l.obra_id, String(l.disciplina).toLowerCase(), l.id, l.data]
      );
    }
  }
  return novos;
}

// Certificado digital A1 (o mesmo arquivo que assina a NFS-e): a validade vem do próprio .pfx.
// `carregar` entra por parâmetro (nfseNacional.carregarCertificado) para o teste não abrir certificado de verdade.
// Sem certificado ou sem senha configurados não é erro: só não há o que acompanhar.
async function sincronizarCertificado(db = pool, { carregar } = {}) {
  let cert;
  try {
    cert = (carregar || require('./nfseNacional').carregarCertificado)();
  } catch (e) {
    return { atualizado: false, aviso: `Certificado digital não lido: ${e.message}` };
  }
  if (!cert?.validoAte) return { atualizado: false, aviso: 'Certificado digital sem data de validade.' };
  const vence = dataIso(new Date(cert.validoAte));
  const emissao = cert.validoDe ? dataIso(new Date(cert.validoDe)) : vence;
  const descricao = `Certificado digital A1 (NFS-e)${cert.nome ? ` — ${String(cert.nome).split(':')[0].slice(0, 120)}` : ''}`;
  // Data nova e maior = certificado trocado: os avisos recomeçam. Data igual: nada muda.
  await db.query(
    `INSERT INTO vencimentos_laudos (tipo, origem, disciplina, descricao, emitido_em, validade_meses, vence_em)
     VALUES ('empresa', 'certificado_a1', 'empresa', $1, $2, $3, $4)
     ON CONFLICT (origem) WHERE origem IS NOT NULL DO UPDATE
       SET descricao = EXCLUDED.descricao, emitido_em = EXCLUDED.emitido_em, validade_meses = EXCLUDED.validade_meses,
           etapa_avisada = CASE WHEN EXCLUDED.vence_em > vencimentos_laudos.vence_em THEN 0 ELSE vencimentos_laudos.etapa_avisada END,
           avisado_em = CASE WHEN EXCLUDED.vence_em > vencimentos_laudos.vence_em THEN NULL ELSE vencimentos_laudos.avisado_em END,
           ativo = CASE WHEN EXCLUDED.vence_em > vencimentos_laudos.vence_em THEN TRUE ELSE vencimentos_laudos.ativo END,
           vence_em = EXCLUDED.vence_em`,
    [descricao, emissao, mesesEntre(emissao, vence), vence]
  );
  return { atualizado: true, vence_em: vence };
}

function mensagem(itens, hoje = hojeIso()) {
  const linhas = itens.map(i => {
    const s = situacao(i.vence_em, hoje);
    const [a, m, d] = i.vence_em.split('-');
    return `- ${i.descricao}${i.cliente_nome ? ` (${i.cliente_nome})` : ''}: ${s.rotulo} — vence em ${d}/${m}/${a}`;
  });
  const vencidos = itens.filter(i => etapaDevida(diasAte(i.vence_em, hoje)) === ETAPAS.vencido).length;
  return {
    assunto: `Vencimentos a renovar: ${itens.length}${vencidos ? ` (${vencidos} vencido${vencidos > 1 ? 's' : ''})` : ''}`,
    texto: `Laudos e documentos da empresa que entraram numa etapa de aviso (60 dias, 30 dias ou vencido):\n\n${linhas.join('\n')}\n\nAbra o painel inicial do sistema para renovar ou encerrar cada um. Nos laudos, boa hora também para oferecer ao cliente a proposta de renovação.`,
  };
}

// Avisa o que passou de etapa desde o último aviso. Só marca como avisado se o e-mail saiu.
async function avisarVencimentos({ db = pool, enviar, destino, hoje = hojeIso() } = {}) {
  const { rows } = await db.query(`SELECT ${COLUNAS} FROM vencimentos_laudos v WHERE v.ativo ORDER BY v.vence_em, v.id`);
  const devidos = rows.filter(r => etapaDevida(diasAte(r.vence_em, hoje)) > r.etapa_avisada);
  if (!devidos.length) return { avisados: 0, avisos: [] };
  if (!destino) return { avisados: 0, avisos: ['Há vencimentos a renovar, mas não há e-mail para avisar (defina ALERTA_EMAIL ou EMAIL_IMAP_USER no .env).'] };
  try {
    const m = mensagem(devidos, hoje);
    await enviar({ to: destino, subject: m.assunto, text: m.texto });
  } catch (e) {
    return { avisados: 0, avisos: [`Não consegui enviar o aviso de vencimentos a renovar: ${e.message}`] };
  }
  for (const r of devidos) {
    await db.query('UPDATE vencimentos_laudos SET etapa_avisada = $2, avisado_em = NOW() WHERE id = $1', [r.id, etapaDevida(diasAte(r.vence_em, hoje))]);
  }
  return { avisados: devidos.length, avisos: [] };
}

// Rotina agendada (rotinas.js, 06:00 e 18:00).
async function executarRotina({ db = pool, enviar, hoje = hojeIso(), carregarCertificado } = {}) {
  const novos = await sincronizarLaudos(db);
  await sincronizarCertificado(db, { carregar: carregarCertificado });   // sem certificado configurado, só segue
  const envio = enviar || ((m) => require('./email/smtp').criarTransportador().sendMail({ from: process.env.EMAIL_IMAP_USER, ...m }));
  const destino = process.env.ALERTA_EMAIL || process.env.EMAIL_IMAP_USER;
  const r = await avisarVencimentos({ db, enviar: envio, destino, hoje });
  const { resumo } = await listar(db, hoje);
  return { novos, avisados: r.avisados, vencidos: resumo.vencidos, urgentes: resumo.urgentes, atencao: resumo.atencao, total: resumo.total, avisos: r.avisos };
}

module.exports = {
  VALIDADE_PADRAO_MESES, ETAPAS, somarMeses, diasAte, etapaDevida, situacao, ehDataIso, hojeIso, validarEntrada, mesesEntre,
  listar, criar, renovar, encerrar, sincronizarLaudos, sincronizarCertificado, mensagem, avisarVencimentos, executarRotina,
};
