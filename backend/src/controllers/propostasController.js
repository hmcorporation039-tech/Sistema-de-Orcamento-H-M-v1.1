const { gerarPdfDeHtml } = require('../utils/pdfPuppeteer');
const pool = require('../config/database');
const { gerarHtmlProposta, gerarFooterTemplate } = require('../utils/pdfTemplate');
const { criarTransportador } = require('../utils/smtpClient');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');
const { comTransacao } = require('../utils/transacao');
const { calcularTotais, normalizarItem } = require('../utils/calculoProposta');
const { validarProposta, validadeOuPadrao } = require('../utils/validacaoProposta');

// Insere as seções e seus itens, com quantidade e valor_total recalculados no
// backend. Compartilhado por criar/atualizar para que as duas rotas não possam
// divergir (antes o mesmo bloco estava duplicado nas duas, com o mesmo bug).
async function inserirSecoesEItens(client, propostaId, secoes, itens) {
  if (!Array.isArray(secoes)) return;

  for (let i = 0; i < secoes.length; i++) {
    const sec = secoes[i];
    const secResult = await client.query(
      'INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1,$2,$3) RETURNING id',
      [propostaId, sec.nome, i]
    );
    const secId = secResult.rows[0].id;

    const itensDaSecao = (itens || []).filter(it => it.sid === sec.id || it.secao_nome === sec.nome);
    for (let j = 0; j < itensDaSecao.length; j++) {
      const item = normalizarItem(itensDaSecao[j], j);
      await client.query(
        `INSERT INTO proposta_itens
         (proposta_id, secao_id, material_id, descricao, quantidade, unidade, valor_unitario, valor_total, ncm, codigo, subgrupo, status, ordem)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [propostaId, secId, item.material_id, item.descricao, item.quantidade, item.unidade,
         item.valor_unitario, item.valor_total, item.ncm, item.codigo, item.subgrupo, item.status, item.ordem]
      );
    }
  }
}

// Registra um evento na trilha de auditoria da proposta (criação, edição, status, duplicação)
async function registrarEvento(client, propostaId, usuarioId, acao, detalhes) {
  await client.query(
    'INSERT INTO proposta_eventos (proposta_id, usuario_id, acao, detalhes) VALUES ($1,$2,$3,$4)',
    [propostaId, usuarioId, acao, detalhes || null]
  );
}

// Pega e incrementa o número sequencial
async function proximoNumero(client) {
  const result = await client.query(
    `UPDATE configuracoes SET valor = (valor::int + 1)::text, atualizado_em = NOW()
     WHERE chave = 'proximo_numero'
     RETURNING valor::int - 1 AS numero`
  );
  return result.rows[0].numero;
}

async function listar(req, res) {
  const { status, busca } = req.query;
  const { pagina, porPagina, offset } = parsePaginacao(req.query);

  let condicoes = 'WHERE 1=1';
  const params = [];

  if (status) {
    params.push(status);
    condicoes += ` AND p.status = $${params.length}`;
  }
  if (busca) {
    params.push(`%${busca}%`);
    condicoes += ` AND (p.numero ILIKE $${params.length} OR p.cliente_nome ILIKE $${params.length} OR p.local_obra ILIKE $${params.length})`;
  }

  try {
    const total = await pool.query(`SELECT count(*) FROM propostas p ${condicoes}`, params);
    const result = await pool.query(
      `SELECT p.*, c.nome as cliente_nome_cadastro
       FROM propostas p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       ${condicoes}
       ORDER BY p.sequencial DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, porPagina, offset]
    );
    res.json(montarResposta(result.rows, parseInt(total.rows[0].count, 10), pagina, porPagina));
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar propostas' });
  }
}

async function buscarUma(req, res) {
  const { id } = req.params;
  try {
    const proposta = await pool.query(
      `SELECT p.*, c.email AS cliente_email
       FROM propostas p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    if (proposta.rows.length === 0) return res.status(404).json({ erro: 'Proposta não encontrada' });

    const secoes = await pool.query(
      'SELECT * FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem',
      [id]
    );
    const itens = await pool.query(
      'SELECT * FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem',
      [id]
    );
    const eventos = await pool.query(
      `SELECT pe.acao, pe.detalhes, pe.criado_em, u.nome AS usuario_nome
       FROM proposta_eventos pe
       LEFT JOIN usuarios u ON pe.usuario_id = u.id
       WHERE pe.proposta_id = $1
       ORDER BY pe.criado_em DESC`,
      [id]
    );

    res.json({
      ...proposta.rows[0],
      secoes: secoes.rows,
      itens: itens.rows,
      eventos: eventos.rows
    });
  } catch (err) {
    console.error('Erro ao buscar proposta:', err);
    res.status(500).json({ erro: 'Erro ao buscar proposta' });
  }
}

async function criar(req, res, next) {
  const {
    data, validade, tipo, porte,
    cliente_id, cliente_nome, responsavel, local_obra,
    pagamento, observacoes, bdi, imposto_venda, imposto_servico,
    desconto_materiais_pct, desconto_mao_obra_pct,
    secoes, itens
  } = req.body;

  const erroValidacao = validarProposta(req.body);
  if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

  // Totais recalculados aqui — os valores enviados pelo cliente são ignorados.
  const totais = calcularTotais({ secoes, itens, bdi, imposto_venda, imposto_servico });

  try {
    const { proposta, numero } = await comTransacao(async (client) => {
    const seq = await proximoNumero(client);
    const numero = 'P' + String(seq).padStart(3, '0');

    const propResult = await client.query(
      `INSERT INTO propostas (
        numero, sequencial, data, validade, tipo, porte,
        cliente_id, cliente_nome, responsavel, local_obra,
        pagamento, observacoes, bdi, imposto_venda, imposto_servico,
        desconto_materiais_pct, desconto_mao_obra_pct,
        subtotal_materiais, subtotal_mao_obra, valor_bdi,
        valor_imposto_venda, valor_imposto_servico, total,
        usuario_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING *`,
      [
        numero, seq, data, validadeOuPadrao(validade), tipo, porte,
        cliente_id || null, cliente_nome, responsavel, local_obra,
        pagamento, observacoes, bdi || 0, imposto_venda || 0, imposto_servico || 0,
        desconto_materiais_pct ?? null, desconto_mao_obra_pct ?? null,
        totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
        totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total,
        req.usuario.id
      ]
    );

    const proposta = propResult.rows[0];

    await inserirSecoesEItens(client, proposta.id, secoes, itens);

    await registrarEvento(client, proposta.id, req.usuario.id, 'criada', `Proposta ${numero} criada`);

      return { proposta, numero };
    });

    res.status(201).json({ ...proposta, mensagem: `Proposta ${numero} salva com sucesso!` });
  } catch (err) {
    console.error('Erro ao criar proposta:', err);
    next(err);
  }
}

async function atualizar(req, res, next) {
  const { id } = req.params;
  const {
    data, validade, tipo, porte,
    cliente_id, cliente_nome, responsavel, local_obra,
    pagamento, observacoes, bdi, imposto_venda, imposto_servico,
    desconto_materiais_pct, desconto_mao_obra_pct,
    secoes, itens
  } = req.body;

  const erroValidacao = validarProposta(req.body);
  if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

  const totais = calcularTotais({ secoes, itens, bdi, imposto_venda, imposto_servico });

  try {
    const proposta = await comTransacao(async (client) => {
    const propResult = await client.query(
      `UPDATE propostas SET
        data=$1, validade=$2, tipo=$3, porte=$4,
        cliente_id=$5, cliente_nome=$6, responsavel=$7, local_obra=$8,
        pagamento=$9, observacoes=$10, bdi=$11, imposto_venda=$12, imposto_servico=$13,
        desconto_materiais_pct=$14, desconto_mao_obra_pct=$15,
        subtotal_materiais=$16, subtotal_mao_obra=$17, valor_bdi=$18,
        valor_imposto_venda=$19, valor_imposto_servico=$20, total=$21,
        atualizado_em=NOW()
       WHERE id=$22
       RETURNING *`,
      [
        data, validadeOuPadrao(validade), tipo, porte,
        cliente_id || null, cliente_nome, responsavel, local_obra,
        pagamento, observacoes, bdi || 0, imposto_venda || 0, imposto_servico || 0,
        desconto_materiais_pct ?? null, desconto_mao_obra_pct ?? null,
        totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
        totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total,
        id
      ]
    );

    if (propResult.rows.length === 0) return null;

    const proposta = propResult.rows[0];

    // Substitui seções e itens antigos pelos novos (numero/sequencial da proposta não mudam)
    await client.query('DELETE FROM proposta_secoes WHERE proposta_id = $1', [proposta.id]);
    await inserirSecoesEItens(client, proposta.id, secoes, itens);

    await registrarEvento(client, proposta.id, req.usuario.id, 'editada', 'Dados e itens da proposta foram editados');

      return proposta;
    });

    if (!proposta) return res.status(404).json({ erro: 'Proposta não encontrada' });
    res.json({ ...proposta, mensagem: `Proposta ${proposta.numero} atualizada com sucesso!` });
  } catch (err) {
    console.error('Erro ao atualizar proposta:', err);
    next(err);
  }
}

async function duplicar(req, res, next) {
  const { id } = req.params;
  try {
    const resultado = await comTransacao(async (client) => {
    // As três leituras agora acontecem DENTRO da transação. Antes rodavam em
    // autocommit, cada uma num snapshot diferente: se alguém editasse a
    // proposta entre a leitura das seções e a dos itens (o `atualizar` apaga e
    // recria as seções com novos ids), a cópia saía com as seções mas sem
    // nenhum item — e ainda assim respondia "duplicada com sucesso".
    const original = await client.query('SELECT * FROM propostas WHERE id = $1', [id]);
    if (original.rows.length === 0) return null;
    const p = original.rows[0];

    const secoesOriginais = await client.query(
      'SELECT * FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem',
      [id]
    );
    const itensOriginais = await client.query(
      'SELECT * FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem',
      [id]
    );

    const seq = await proximoNumero(client);
    const numero = 'P' + String(seq).padStart(3, '0');
    const hoje = new Date().toISOString().slice(0, 10);

    const novaResult = await client.query(
      `INSERT INTO propostas (
        numero, sequencial, data, validade, tipo, porte,
        cliente_id, cliente_nome, responsavel, local_obra,
        pagamento, observacoes, bdi, imposto_venda, imposto_servico,
        desconto_materiais_pct, desconto_mao_obra_pct,
        subtotal_materiais, subtotal_mao_obra, valor_bdi,
        valor_imposto_venda, valor_imposto_servico, total,
        status, usuario_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,'Ativa',$24)
      RETURNING *`,
      [
        numero, seq, hoje, p.validade, p.tipo, p.porte,
        p.cliente_id, p.cliente_nome, p.responsavel, p.local_obra,
        p.pagamento, p.observacoes, p.bdi, p.imposto_venda, p.imposto_servico,
        p.desconto_materiais_pct, p.desconto_mao_obra_pct,
        p.subtotal_materiais, p.subtotal_mao_obra, p.valor_bdi,
        p.valor_imposto_venda, p.valor_imposto_servico, p.total,
        req.usuario.id
      ]
    );
    const nova = novaResult.rows[0];

    for (const sec of secoesOriginais.rows) {
      const secResult = await client.query(
        'INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1,$2,$3) RETURNING id',
        [nova.id, sec.nome, sec.ordem]
      );
      const novoSecId = secResult.rows[0].id;

      const itensDaSecao = itensOriginais.rows.filter(it => it.secao_id === sec.id);
      for (const it of itensDaSecao) {
        await client.query(
          `INSERT INTO proposta_itens
           (proposta_id, secao_id, material_id, descricao, quantidade, unidade, valor_unitario, valor_total, ncm, codigo, subgrupo, status, ordem)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [nova.id, novoSecId, it.material_id, it.descricao, it.quantidade, it.unidade, it.valor_unitario, it.valor_total, it.ncm, it.codigo, it.subgrupo, it.status, it.ordem]
        );
      }
    }

    await registrarEvento(client, nova.id, req.usuario.id, 'duplicada', `Duplicada a partir da proposta ${p.numero}`);

      return { nova, numero };
    });

    if (!resultado) return res.status(404).json({ erro: 'Proposta não encontrada' });
    res.status(201).json({ ...resultado.nova, mensagem: `Proposta duplicada como ${resultado.numero}` });
  } catch (err) {
    console.error('Erro ao duplicar proposta:', err);
    next(err);
  }
}

async function atualizarStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;
  const statusValidos = ['Ativa', 'Aprovada', 'Recusada', 'Cancelada'];

  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido' });
  }

  try {
    // As duas escritas precisam ser atômicas: antes o UPDATE usava o `pool`
    // (conexão qualquer, sem transação) e o registro do evento vinha depois.
    // Se o evento falhasse, o status já estava gravado de forma irreversível,
    // mas o usuário recebia erro 500 e a tela não atualizava — o banco dizia
    // "Aprovada" e a tela dizia que não deu certo.
    const proposta = await comTransacao(async (client) => {
      const result = await client.query(
        'UPDATE propostas SET status=$1, atualizado_em=NOW() WHERE id=$2 RETURNING *',
        [status, id]
      );
      if (result.rows.length === 0) return null;
      await registrarEvento(client, id, req.usuario.id, 'status', `Status alterado para ${status}`);
      return result.rows[0];
    });

    if (!proposta) return res.status(404).json({ erro: 'Proposta não encontrada' });
    res.json(proposta);
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    next(err);
  }
}

async function remover(req, res, next) {
  const { id } = req.params;
  try {
    // Checa rowCount: antes respondia "Proposta removida" mesmo para id
    // inexistente, o que mascarava erro de id errado vindo da tela.
    const result = await pool.query('DELETE FROM propostas WHERE id=$1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ erro: 'Proposta não encontrada' });
    res.json({ mensagem: 'Proposta removida' });
  } catch (err) {
    console.error('Erro ao remover proposta:', err);
    next(err);
  }
}

async function proximoNum(req, res) {
  try {
    const result = await pool.query(
      "SELECT valor FROM configuracoes WHERE chave = 'proximo_numero'"
    );
    res.json({ proximo: parseInt(result.rows[0].valor) });
  } catch (err) {
    console.error('Erro ao buscar número:', err);
    res.status(500).json({ erro: 'Erro ao buscar número' });
  }
}

async function montarPdfBuffer(id) {
  const proposta = await pool.query('SELECT * FROM propostas WHERE id = $1', [id]);
  if (proposta.rows.length === 0) return null;

  const secoes = await pool.query(
    'SELECT * FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem',
    [id]
  );
  const itens = await pool.query(
    'SELECT * FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem',
    [id]
  );

  const html = gerarHtmlProposta({ ...proposta.rows[0], secoes: secoes.rows, itens: itens.rows });

  const pdf = await gerarPdfDeHtml(html, {
    margin: { top: '12mm', bottom: '24mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: gerarFooterTemplate(),
  });
  return { proposta: proposta.rows[0], pdf };
}

function nomeArquivoProposta(proposta) {
  const nomeCliente = String(proposta.cliente_nome || '').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
  return `${nomeCliente}_${proposta.numero}.pdf`;
}

async function gerarPdf(req, res) {
  const { id } = req.params;
  try {
    const resultado = await montarPdfBuffer(id);
    if (!resultado) return res.status(404).json({ erro: 'Proposta não encontrada' });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomeArquivoProposta(resultado.proposta)}"`,
    });
    res.send(resultado.pdf);
  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    res.status(500).json({ erro: 'Erro ao gerar PDF da proposta' });
  }
}

async function enviarEmail(req, res) {
  const { id } = req.params;
  const { destinatario, mensagem } = req.body;

  if (!destinatario || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
    return res.status(400).json({ erro: 'Informe um e-mail de destino válido' });
  }

  try {
    const resultado = await montarPdfBuffer(id);
    if (!resultado) return res.status(404).json({ erro: 'Proposta não encontrada' });
    const { proposta, pdf } = resultado;

    const transportador = criarTransportador();
    await transportador.sendMail({
      from: `"H&M Engenharia" <${process.env.EMAIL_IMAP_USER}>`,
      to: destinatario,
      subject: `Proposta ${proposta.numero} — H&M Engenharia e Tecnologia`,
      text: mensagem || `Olá,\n\nSegue em anexo a proposta ${proposta.numero}.\n\nAtenciosamente,\nH&M Engenharia e Tecnologia`,
      attachments: [
        { filename: nomeArquivoProposta(proposta), content: pdf, contentType: 'application/pdf' },
      ],
    });

    res.json({ mensagem: `Proposta ${proposta.numero} enviada para ${destinatario}` });
  } catch (err) {
    console.error('Erro ao enviar proposta por e-mail:', err);
    res.status(500).json({ erro: err.message || 'Erro ao enviar proposta por e-mail' });
  }
}

module.exports = {
  listar, buscarUma, criar, atualizar, duplicar, atualizarStatus, remover, proximoNum, gerarPdf, enviarEmail,
  // Reaproveitados por projetosController.gerarOrcamento (Análise de Projeto -> Orçamentos),
  // pra criar/atualizar uma proposta sem duplicar a regra de numeração e inserção de itens.
  inserirSecoesEItens, proximoNumero, registrarEvento,
};
