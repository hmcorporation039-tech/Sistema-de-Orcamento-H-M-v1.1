const puppeteer = require('puppeteer');
const pool = require('../config/database');
const { gerarHtmlProposta, gerarFooterTemplate } = require('../utils/pdfTemplate');
const { criarTransportador } = require('../utils/smtpClient');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');

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
    res.status(500).json({ erro: 'Erro ao buscar proposta' });
  }
}

async function criar(req, res) {
  const {
    data, validade, tipo, porte,
    cliente_id, cliente_nome, responsavel, local_obra,
    pagamento, observacoes, bdi, imposto_venda, imposto_servico,
    subtotal_materiais, subtotal_mao_obra, valor_bdi,
    valor_imposto_venda, valor_imposto_servico, total,
    secoes, itens
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const seq = await proximoNumero(client);
    const numero = 'P' + String(seq).padStart(3, '0');

    const propResult = await client.query(
      `INSERT INTO propostas (
        numero, sequencial, data, validade, tipo, porte,
        cliente_id, cliente_nome, responsavel, local_obra,
        pagamento, observacoes, bdi, imposto_venda, imposto_servico,
        subtotal_materiais, subtotal_mao_obra, valor_bdi,
        valor_imposto_venda, valor_imposto_servico, total,
        usuario_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [
        numero, seq, data, validade || 5, tipo, porte,
        cliente_id || null, cliente_nome, responsavel, local_obra,
        pagamento, observacoes, bdi || 0, imposto_venda || 0, imposto_servico || 0,
        subtotal_materiais || 0, subtotal_mao_obra || 0, valor_bdi || 0,
        valor_imposto_venda || 0, valor_imposto_servico || 0, total || 0,
        req.usuario.id
      ]
    );

    const proposta = propResult.rows[0];

    // Inserir seções e itens
    if (Array.isArray(secoes)) {
      for (let i = 0; i < secoes.length; i++) {
        const sec = secoes[i];
        const secResult = await client.query(
          'INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1,$2,$3) RETURNING id',
          [proposta.id, sec.nome, i]
        );
        const secId = secResult.rows[0].id;

        const secItens = (itens || []).filter(it => it.sid === sec.id || it.secao_nome === sec.nome);
        for (let j = 0; j < secItens.length; j++) {
          const it = secItens[j];
          await client.query(
            `INSERT INTO proposta_itens
             (proposta_id, secao_id, material_id, descricao, quantidade, unidade, valor_unitario, valor_total, ncm, codigo, ordem)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [proposta.id, secId, it.material_id || null, it.desc || it.descricao, it.qtd || it.quantidade || 1,
             it.un || it.unidade, it.vu || it.valor_unitario || 0,
             (it.qtd || 1) * (it.vu || 0), it.ncm || null, it.codigo || null, j]
          );
        }
      }
    }

    await registrarEvento(client, proposta.id, req.usuario.id, 'criada', `Proposta ${numero} criada`);

    await client.query('COMMIT');
    res.status(201).json({ ...proposta, mensagem: `Proposta ${numero} salva com sucesso!` });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar proposta:', err);
    res.status(500).json({ erro: 'Erro ao criar proposta' });
  } finally {
    client.release();
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const {
    data, validade, tipo, porte,
    cliente_id, cliente_nome, responsavel, local_obra,
    pagamento, observacoes, bdi, imposto_venda, imposto_servico,
    subtotal_materiais, subtotal_mao_obra, valor_bdi,
    valor_imposto_venda, valor_imposto_servico, total,
    secoes, itens
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const propResult = await client.query(
      `UPDATE propostas SET
        data=$1, validade=$2, tipo=$3, porte=$4,
        cliente_id=$5, cliente_nome=$6, responsavel=$7, local_obra=$8,
        pagamento=$9, observacoes=$10, bdi=$11, imposto_venda=$12, imposto_servico=$13,
        subtotal_materiais=$14, subtotal_mao_obra=$15, valor_bdi=$16,
        valor_imposto_venda=$17, valor_imposto_servico=$18, total=$19,
        atualizado_em=NOW()
       WHERE id=$20
       RETURNING *`,
      [
        data, validade || 5, tipo, porte,
        cliente_id || null, cliente_nome, responsavel, local_obra,
        pagamento, observacoes, bdi || 0, imposto_venda || 0, imposto_servico || 0,
        subtotal_materiais || 0, subtotal_mao_obra || 0, valor_bdi || 0,
        valor_imposto_venda || 0, valor_imposto_servico || 0, total || 0,
        id
      ]
    );

    if (propResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Proposta não encontrada' });
    }

    const proposta = propResult.rows[0];

    // Substitui seções e itens antigos pelos novos (numero/sequencial da proposta não mudam)
    await client.query('DELETE FROM proposta_secoes WHERE proposta_id = $1', [proposta.id]);

    if (Array.isArray(secoes)) {
      for (let i = 0; i < secoes.length; i++) {
        const sec = secoes[i];
        const secResult = await client.query(
          'INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1,$2,$3) RETURNING id',
          [proposta.id, sec.nome, i]
        );
        const secId = secResult.rows[0].id;

        const secItens = (itens || []).filter(it => it.sid === sec.id || it.secao_nome === sec.nome);
        for (let j = 0; j < secItens.length; j++) {
          const it = secItens[j];
          await client.query(
            `INSERT INTO proposta_itens
             (proposta_id, secao_id, material_id, descricao, quantidade, unidade, valor_unitario, valor_total, ncm, codigo, ordem)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [proposta.id, secId, it.material_id || null, it.desc || it.descricao, it.qtd || it.quantidade || 1,
             it.un || it.unidade, it.vu || it.valor_unitario || 0,
             (it.qtd || 1) * (it.vu || 0), it.ncm || null, it.codigo || null, j]
          );
        }
      }
    }

    await registrarEvento(client, proposta.id, req.usuario.id, 'editada', 'Dados e itens da proposta foram editados');

    await client.query('COMMIT');
    res.json({ ...proposta, mensagem: `Proposta ${proposta.numero} atualizada com sucesso!` });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar proposta:', err);
    res.status(500).json({ erro: 'Erro ao atualizar proposta' });
  } finally {
    client.release();
  }
}

async function duplicar(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const original = await client.query('SELECT * FROM propostas WHERE id = $1', [id]);
    if (original.rows.length === 0) return res.status(404).json({ erro: 'Proposta não encontrada' });
    const p = original.rows[0];

    const secoesOriginais = await client.query(
      'SELECT * FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem',
      [id]
    );
    const itensOriginais = await client.query(
      'SELECT * FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem',
      [id]
    );

    await client.query('BEGIN');

    const seq = await proximoNumero(client);
    const numero = 'P' + String(seq).padStart(3, '0');
    const hoje = new Date().toISOString().slice(0, 10);

    const novaResult = await client.query(
      `INSERT INTO propostas (
        numero, sequencial, data, validade, tipo, porte,
        cliente_id, cliente_nome, responsavel, local_obra,
        pagamento, observacoes, bdi, imposto_venda, imposto_servico,
        subtotal_materiais, subtotal_mao_obra, valor_bdi,
        valor_imposto_venda, valor_imposto_servico, total,
        status, usuario_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'Ativa',$22)
      RETURNING *`,
      [
        numero, seq, hoje, p.validade, p.tipo, p.porte,
        p.cliente_id, p.cliente_nome, p.responsavel, p.local_obra,
        p.pagamento, p.observacoes, p.bdi, p.imposto_venda, p.imposto_servico,
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
           (proposta_id, secao_id, material_id, descricao, quantidade, unidade, valor_unitario, valor_total, ncm, codigo, ordem)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [nova.id, novoSecId, it.material_id, it.descricao, it.quantidade, it.unidade, it.valor_unitario, it.valor_total, it.ncm, it.codigo, it.ordem]
        );
      }
    }

    await registrarEvento(client, nova.id, req.usuario.id, 'duplicada', `Duplicada a partir da proposta ${p.numero}`);

    await client.query('COMMIT');
    res.status(201).json({ ...nova, mensagem: `Proposta duplicada como ${numero}` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao duplicar proposta:', err);
    res.status(500).json({ erro: 'Erro ao duplicar proposta' });
  } finally {
    client.release();
  }
}

async function atualizarStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const statusValidos = ['Ativa', 'Aprovada', 'Recusada', 'Cancelada'];

  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido' });
  }

  try {
    const result = await pool.query(
      'UPDATE propostas SET status=$1, atualizado_em=NOW() WHERE id=$2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Proposta não encontrada' });
    await registrarEvento(pool, id, req.usuario.id, 'status', `Status alterado para ${status}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
}

async function remover(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM propostas WHERE id=$1', [id]);
    res.json({ mensagem: 'Proposta removida' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover proposta' });
  }
}

async function proximoNum(req, res) {
  try {
    const result = await pool.query(
      "SELECT valor FROM configuracoes WHERE chave = 'proximo_numero'"
    );
    res.json({ proximo: parseInt(result.rows[0].valor) });
  } catch (err) {
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

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4', printBackground: true,
      margin: { top: '12mm', bottom: '24mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: gerarFooterTemplate(),
    });
    return { proposta: proposta.rows[0], pdf };
  } finally {
    await browser.close();
  }
}

async function gerarPdf(req, res) {
  const { id } = req.params;
  try {
    const resultado = await montarPdfBuffer(id);
    if (!resultado) return res.status(404).json({ erro: 'Proposta não encontrada' });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Proposta_${resultado.proposta.numero}.pdf"`,
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
        { filename: `Proposta_${proposta.numero}.pdf`, content: pdf, contentType: 'application/pdf' },
      ],
    });

    res.json({ mensagem: `Proposta ${proposta.numero} enviada para ${destinatario}` });
  } catch (err) {
    console.error('Erro ao enviar proposta por e-mail:', err);
    res.status(500).json({ erro: err.message || 'Erro ao enviar proposta por e-mail' });
  }
}

module.exports = { listar, buscarUma, criar, atualizar, duplicar, atualizarStatus, remover, proximoNum, gerarPdf, enviarEmail };
