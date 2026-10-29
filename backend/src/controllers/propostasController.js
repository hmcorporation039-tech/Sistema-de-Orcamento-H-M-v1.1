const { gerarPdfDeHtml } = require('../utils/pdfPuppeteer');
const pool = require('../config/database');
const { gerarHtmlProposta, gerarFooterTemplate } = require('../utils/pdfTemplate');
const { criarTransportador } = require('../utils/smtpClient');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');
const { comTransacao } = require('../utils/transacao');
const { calcularTotais, normalizarItem, ehMaoDeObra, bdiMateriaisDefinido, arredondar, itemPertenceASecao } = require('../utils/calculoProposta');
const { normalizarMemoriaBdi } = require('../utils/bdiTcu');

// BDI diferenciado de materiais (2.0, Fase 3F): vazio/null = mesmo BDI para tudo
const lerBdiMateriais = (v) => (bdiMateriaisDefinido(v) ? arredondar(Number(v)) : null);
const { validarProposta, validadeOuPadrao } = require('../utils/validacaoProposta');
const { garantirMaterialCadastrado, garantirMaoDeObraCadastrada } = require('../utils/catalogoAutoCadastro');
const { classificarPendentesEmSegundoPlano } = require('../services/classificacaoMateriais');
const { salvarPdfPropostaNasPastas } = require('../services/pastasRegistros');
const { versaoDoPedido, responderConflitoOuAusente } = require('../utils/versao');
const { registrarAuditoria } = require('../utils/auditoria');
const { gerarPlanilhaCliente } = require('../utils/planilhaOrcamentoCliente');
const { lerObraId, conferirObra, sqlObraJson } = require('../utils/obras');
const { sqlDecisaoCliente } = require('../utils/aprovacaoLink');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const { hojeBrasilia } = require('../utils/dataHoje');

// Assinatura padrão da empresa — entra sempre no final de todo e-mail
// enviado ao cliente (mensagem padrão ou digitada à mão), sem exceção.
const ASSINATURA_EMPRESA = `H&M Engenharia e Tecnologia LTDA
Engenharia • Tecnologia • Segurança Eletrônica

📞 WhatsApp: (61) 99185-9745
✉ E-mail: hemengetecnologia@gmail.com
🌐 Site: www.hemengetecnologia.com

📍 Quadra CNF 03 Lote 16 Loja 04
Taguatinga Norte – DF | CEP 72.125-535`;

// Insere as seções e seus itens, com quantidade e valor_total recalculados no
// backend. Compartilhado por criar/atualizar para que as duas rotas não possam
// divergir (antes o mesmo bloco estava duplicado nas duas, com o mesmo bug).
async function inserirSecoesEItens(client, propostaId, secoes, itens) {
  if (!Array.isArray(secoes)) return;

  for (let i = 0; i < secoes.length; i++) {
    const sec = secoes[i];
    const maoDeObra = ehMaoDeObra(sec.nome);
    const secResult = await client.query(
      'INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1,$2,$3) RETURNING id',
      [propostaId, sec.nome, i]
    );
    const secId = secResult.rows[0].id;

    const itensDaSecao = (itens || []).filter(it => itemPertenceASecao(it, sec));
    for (let j = 0; j < itensDaSecao.length; j++) {
      const item = normalizarItem(itensDaSecao[j], j);

      // Padroniza o catálogo: um item digitado à mão (não veio do "+
      // catálogo", então material_id chega nulo) é comparado com o que já
      // existe — só vira material novo se não existir nada parecido. Item de
      // mão de obra não tem uma FK própria em proposta_itens, mas a
      // descrição entra (ou já está) na base única de serviços (versão 2.0,
      // utils/servicosBase.js) pra virar sugestão da próxima vez, em qualquer
      // proposta de qualquer cliente. O código do item não é reescrito: um
      // serviço fundido depois não muda propostas já gravadas.
      let materialId = item.material_id;
      if (maoDeObra) {
        await garantirMaoDeObraCadastrada(client, {
          descricao: item.descricao, unidade: item.unidade, valor_unitario: item.valor_unitario,
          codigo: item.codigo, subgrupo: item.subgrupo
        });
      } else if (!materialId) {
        materialId = await garantirMaterialCadastrado(client, {
          descricao: item.descricao, unidade: item.unidade, ncm: item.ncm, valor_unitario: item.valor_unitario
        });
      }

      await client.query(
        `INSERT INTO proposta_itens
         (proposta_id, secao_id, material_id, descricao, quantidade, unidade, valor_unitario, valor_total, ncm, codigo, subgrupo, status, ordem)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [propostaId, secId, materialId, item.descricao, item.quantidade, item.unidade,
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
  // ?obra_id=ID (propostas da obra) ou ?obra_id=sem (sem obra)
  if (req.query.obra_id === 'sem') condicoes += ' AND p.obra_id IS NULL';
  else if (req.query.obra_id) {
    const n = Number(req.query.obra_id);
    if (!Number.isInteger(n) || n < 1) return res.status(400).json({ erro: 'Obra inválida.' });
    params.push(n);
    condicoes += ` AND p.obra_id = $${params.length}`;
  }

  try {
    const total = await pool.query(`SELECT count(*) FROM propostas p ${condicoes}`, params);
    // decisao_cliente: a última decisão do cliente pelo link de aprovação
    // ({ decisao: 'aprovada'|'recusada', nome, data }) ou null, na mesma consulta
    const dc = sqlDecisaoCliente('p');
    const result = await pool.query(
      `SELECT p.*, c.nome as cliente_nome_cadastro, ${sqlObraJson('ob')} AS obra, ${dc.coluna}
       FROM propostas p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN obras ob ON ob.id = p.obra_id
       ${dc.join}
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
      `SELECT p.*, c.email AS cliente_email, ${sqlObraJson('ob')} AS obra
       FROM propostas p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN obras ob ON ob.id = p.obra_id
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
    escopo, pagamento, observacoes, bdi, imposto_venda, imposto_servico,
    desconto_materiais_pct, desconto_mao_obra_pct,
    secoes, itens
  } = req.body;

  const erroValidacao = validarProposta(req.body);
  if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

  // BDI diferenciado de materiais e memória do calculador do TCU (2.0, Fase 3F)
  const bdiMateriais = lerBdiMateriais(req.body.bdi_materiais);
  const memoriaBdi = normalizarMemoriaBdi(req.body.bdi_memoria);

  // Totais recalculados aqui — os valores enviados pelo cliente são ignorados.
  const totais = calcularTotais({ secoes, itens, bdi, bdi_materiais: bdiMateriais, imposto_venda, imposto_servico });

  try {
    // obra (2.0): proposta nova já nasce ligada à obra aberta (obra_id opcional)
    const obra = lerObraId(req.body);
    const erroObra = await conferirObra(pool, obra, { usuario: req.usuario });
    if (erroObra) return res.status(400).json({ erro: erroObra });

    const { proposta, numero } = await comTransacao(async (client) => {
    const seq = await proximoNumero(client);
    const numero = 'P' + String(seq).padStart(3, '0');

    const propResult = await client.query(
      `INSERT INTO propostas (
        numero, sequencial, data, validade, tipo, porte,
        cliente_id, cliente_nome, responsavel, local_obra,
        escopo, pagamento, observacoes, bdi, imposto_venda, imposto_servico,
        desconto_materiais_pct, desconto_mao_obra_pct,
        subtotal_materiais, subtotal_mao_obra, valor_bdi,
        valor_imposto_venda, valor_imposto_servico, total,
        usuario_id, obra_id, bdi_materiais, bdi_memoria
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
      RETURNING *`,
      [
        numero, seq, data, validadeOuPadrao(validade), tipo, porte,
        cliente_id || null, cliente_nome, responsavel, local_obra,
        escopo, pagamento, observacoes, bdi || 0, imposto_venda || 0, imposto_servico || 0,
        desconto_materiais_pct ?? null, desconto_mao_obra_pct ?? null,
        totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
        totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total,
        req.usuario.id, obra.valor, bdiMateriais, memoriaBdi
      ]
    );

    const proposta = propResult.rows[0];

    await inserirSecoesEItens(client, proposta.id, secoes, itens);

    await registrarEvento(client, proposta.id, req.usuario.id, 'criada', `Proposta ${numero} criada`);

      return { proposta, numero };
    });

    res.status(201).json({ ...proposta, mensagem: `Proposta ${numero} salva com sucesso!` });
    classificarPendentesEmSegundoPlano(); // material novo cadastrado sem categoria → IA, sem travar a resposta
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
    escopo, pagamento, observacoes, bdi, imposto_venda, imposto_servico,
    desconto_materiais_pct, desconto_mao_obra_pct,
    secoes, itens
  } = req.body;

  const erroValidacao = validarProposta(req.body);
  if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

  try {
    // Aprovada pelo cliente no link (2.0, Fase 3I): o aceite guarda o hash do
    // que ele viu; editar depois deixaria o sistema diferente do aceito sem
    // aviso. Só o administrador altera (para corrigir); o normal é duplicar.
    if (req.usuario?.role !== 'admin') {
      const { rows: [aceite] } = await pool.query(
        `SELECT 1 FROM propostas p
          WHERE p.id = $1 AND p.status = 'Aprovada'
            AND EXISTS (SELECT 1 FROM proposta_decisoes_aprovacao d WHERE d.proposta_id = p.id AND d.decisao = 'aprovada')`,
        [id]
      );
      if (aceite) {
        return res.status(409).json({ erro: 'Esta proposta foi aprovada pelo cliente pelo link e não pode mais ser alterada. Use "Duplicar" para fazer uma nova versão (ou peça a um administrador).' });
      }
    }

    // BDI diferenciado e memória do BDI (2.0, Fase 3F): ausentes no corpo
    // (cliente antigo, MCP) mantêm o que a proposta já tem — e o total é
    // recalculado com o BDI de materiais gravado, para não mudar sozinho
    const temBdiMateriais = Object.prototype.hasOwnProperty.call(req.body, 'bdi_materiais');
    const temMemoriaBdi = Object.prototype.hasOwnProperty.call(req.body, 'bdi_memoria');
    let bdiMateriais = lerBdiMateriais(req.body.bdi_materiais);
    if (!temBdiMateriais) {
      const { rows: [atual] } = await pool.query('SELECT bdi_materiais FROM propostas WHERE id = $1', [id]);
      bdiMateriais = atual ? lerBdiMateriais(atual.bdi_materiais) : null;
    }
    const memoriaBdi = normalizarMemoriaBdi(req.body.bdi_memoria);
    const totais = calcularTotais({ secoes, itens, bdi, bdi_materiais: bdiMateriais, imposto_venda, imposto_servico });

    // obra (2.0): obra_id no corpo liga/desliga (null); ausente mantém a atual
    const obra = lerObraId(req.body);
    const erroObra = await conferirObra(pool, obra, { usuario: req.usuario, tabela: 'propostas', id });
    if (erroObra) return res.status(400).json({ erro: erroObra });

    const proposta = await comTransacao(async (client) => {
    const propResult = await client.query(
      `UPDATE propostas SET
        data=$1, validade=$2, tipo=$3, porte=$4,
        cliente_id=$5, cliente_nome=$6, responsavel=$7, local_obra=$8,
        escopo=$9, pagamento=$10, observacoes=$11, bdi=$12, imposto_venda=$13, imposto_servico=$14,
        desconto_materiais_pct=$15, desconto_mao_obra_pct=$16,
        subtotal_materiais=$17, subtotal_mao_obra=$18, valor_bdi=$19,
        valor_imposto_venda=$20, valor_imposto_servico=$21, total=$22,
        obra_id = CASE WHEN $25::boolean THEN $26::int ELSE obra_id END,
        bdi_materiais = $27,
        bdi_memoria = CASE WHEN $28::boolean THEN $29::jsonb ELSE bdi_memoria END,
        atualizado_em=NOW(), versao=versao+1
       WHERE id=$23 AND ($24::int IS NULL OR versao = $24)
       RETURNING *`,
      [
        data, validadeOuPadrao(validade), tipo, porte,
        cliente_id || null, cliente_nome, responsavel, local_obra,
        escopo, pagamento, observacoes, bdi || 0, imposto_venda || 0, imposto_servico || 0,
        desconto_materiais_pct ?? null, desconto_mao_obra_pct ?? null,
        totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
        totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total,
        id, versaoDoPedido(req.body), obra.presente, obra.valor,
        bdiMateriais, temMemoriaBdi, memoriaBdi
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

    if (!proposta) return responderConflitoOuAusente(pool, res, 'propostas', id);
    res.json({ ...proposta, mensagem: `Proposta ${proposta.numero} atualizada com sucesso!` });
    classificarPendentesEmSegundoPlano();
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
    // Só a transação não bastava: em READ COMMITTED cada SELECT ainda vê o seu
    // próprio instante. Em REPEATABLE READ as três leituras são do mesmo retrato
    // (o número novo, se colidir com outra gravação, refaz a transação).
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
    const hoje = hojeBrasilia(); // toISOString daria amanhã depois das 21h

    const novaResult = await client.query(
      `INSERT INTO propostas (
        numero, sequencial, data, validade, tipo, porte,
        cliente_id, cliente_nome, responsavel, local_obra,
        escopo, pagamento, observacoes, bdi, imposto_venda, imposto_servico,
        desconto_materiais_pct, desconto_mao_obra_pct,
        subtotal_materiais, subtotal_mao_obra, valor_bdi,
        valor_imposto_venda, valor_imposto_servico, total,
        status, usuario_id, obra_id, bdi_materiais, bdi_memoria
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,'Ativa',$25,$26,$27,$28)
      RETURNING *`,
      [
        numero, seq, hoje, p.validade, p.tipo, p.porte,
        p.cliente_id, p.cliente_nome, p.responsavel, p.local_obra,
        p.escopo, p.pagamento, p.observacoes, p.bdi, p.imposto_venda, p.imposto_servico,
        p.desconto_materiais_pct, p.desconto_mao_obra_pct,
        p.subtotal_materiais, p.subtotal_mao_obra, p.valor_bdi,
        p.valor_imposto_venda, p.valor_imposto_servico, p.total,
        req.usuario.id, p.obra_id, // a cópia fica na mesma obra
        p.bdi_materiais, p.bdi_memoria // e com o mesmo BDI (diferenciado e memória do cálculo)
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
    }, { isolamento: 'REPEATABLE READ' });

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
    const proposta = await comTransacao(client => aplicarStatusProposta(client, id, status, req.usuario.id, null, { admin: req.usuario?.role === 'admin' }));

    if (!proposta) return res.status(404).json({ erro: 'Proposta não encontrada' });
    res.json(proposta);
  } catch (err) {
    if (err instanceof ErroStatusProposta) return res.status(err.status).json({ erro: err.message, codigo: err.codigo });
    console.error('Erro ao atualizar status:', err);
    next(err);
  }
}

class ErroStatusProposta extends Error {
  constructor(mensagem, codigo, status = 409) { super(mensagem); this.codigo = codigo; this.status = status; }
}

// Aprovada pelo cliente no link (2.0, Fase 3I): o comprovante guarda o hash do
// que ele aceitou. Tirar do status "Aprovada" (para Ativa, Recusada ou
// Cancelada) deixaria o sistema contradizendo o aceite registrado — o mesmo
// motivo que já bloqueia editar os itens. Só o administrador desfaz (revisão de
// 27/10/2026: a troca de status não tinha essa trava).
async function conferirSaidaDeAprovada(client, id, novoStatus, { admin = false } = {}) {
  if (admin || novoStatus === 'Aprovada') return;
  const { rows: [atual] } = await client.query(
    `SELECT p.status,
            EXISTS (SELECT 1 FROM proposta_decisoes_aprovacao d WHERE d.proposta_id = p.id AND d.decisao = 'aprovada') AS aceite_link
       FROM propostas p WHERE p.id = $1 FOR UPDATE`,
    [id]
  );
  if (atual && atual.status === 'Aprovada' && atual.aceite_link) {
    throw new ErroStatusProposta(
      'Esta proposta foi aprovada pelo cliente pelo link de aprovação e o status não pode mais ser alterado. Peça a um administrador se for mesmo preciso (o comprovante do cliente continua registrado).',
      'APROVADA_PELO_CLIENTE'
    );
  }
}

// Troca o status dentro da transação do chamador: grava, registra o evento e,
// se aprovada, leva a obra para "contratada". Único caminho para mudar status —
// a tela (atualizarStatus) e a aprovação por link (aprovacaoController, sem
// usuário: usuarioId null) passam por aqui.
async function aplicarStatusProposta(client, id, status, usuarioId, detalhes, opcoes = {}) {
  await conferirSaidaDeAprovada(client, id, status, opcoes);
  const result = await client.query(
    'UPDATE propostas SET status=$1, atualizado_em=NOW(), versao=versao+1 WHERE id=$2 RETURNING *',
    [status, id]
  );
  if (result.rows.length === 0) return null;
  await registrarEvento(client, id, usuarioId, 'status', detalhes || `Status alterado para ${status}`);
  // obra (2.0): proposta aprovada leva a obra em prospecção/orçamento para "contratada"
  if (status === 'Aprovada' && result.rows[0].obra_id) {
    await client.query(
      "UPDATE obras SET status = 'contratada', atualizado_em = NOW(), versao = versao + 1 WHERE id = $1 AND status IN ('prospeccao', 'orcamento')",
      [result.rows[0].obra_id]
    );
  }
  return result.rows[0];
}

async function remover(req, res, next) {
  const { id } = req.params;
  try {
    // Checa rowCount: antes respondia "Proposta removida" mesmo para id
    // inexistente, o que mascarava erro de id errado vindo da tela.
    // A exclusão apaga seções, itens e histórico em cascata: guarda uma cópia
    // completa na auditoria (dá para reconstruir a proposta se foi engano).
    const removida = await comTransacao(async (client) => {
      const secoes = await client.query(
        `SELECT s.nome, s.ordem, COALESCE(json_agg(i.* ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS itens
           FROM proposta_secoes s LEFT JOIN proposta_itens i ON i.secao_id = s.id
          WHERE s.proposta_id = $1 GROUP BY s.id ORDER BY s.ordem`, [id]);
      const result = await client.query('DELETE FROM propostas WHERE id=$1 RETURNING *', [id]);
      if (result.rowCount === 0) return null;
      await registrarAuditoria(client, {
        entidade: 'propostas', entidadeId: Number(id), acao: 'excluir', usuarioId: req.usuario.id,
        detalhes: { proposta: result.rows[0], secoes: secoes.rows },
      });
      return result.rows[0];
    });
    if (!removida) return res.status(404).json({ erro: 'Proposta não encontrada' });
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

// Anexos opcionais do PDF (2.0, Fase 3F), todos desligados por padrão:
// ?curva_abc=1 (curva ABC dos itens) e ?composicao_bdi=1 (memória do BDI pela
// fórmula do TCU — exigida em proposta para órgão público). No e-mail, vêm em
// req.body.anexos = { curva_abc, composicao_bdi }.
const ligado = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'sim';
function lerAnexosPdf(fonte) {
  const f = fonte && typeof fonte === 'object' ? fonte : {};
  return { curvaAbc: ligado(f.curva_abc), composicaoBdi: ligado(f.composicao_bdi) };
}

async function montarPdfBuffer(id, anexos = {}) {
  // proposta, seções e itens do MESMO retrato (REPEATABLE READ): lidos em
  // comandos soltos, um PDF gerado durante uma edição podia sair com as seções
  // novas e os itens antigos (ou sem itens). Só as leituras ficam na transação;
  // o 3D e o Chromium vêm depois, sem segurar conexão do banco.
  const lido = await comTransacao(async (client) => {
    const proposta = await client.query('SELECT * FROM propostas WHERE id = $1', [id]);
    if (proposta.rows.length === 0) return null;
    const secoes = await client.query(
      'SELECT * FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem',
      [id]
    );
    const itens = await client.query(
      'SELECT * FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem',
      [id]
    );
    return { proposta, secoes, itens };
  }, { isolamento: 'REPEATABLE READ' });
  if (!lido) return null;
  const { proposta, secoes, itens } = lido;

  // modelo 3D ligado para o cliente (2.3): imagem como anexo. Falha na captura
  // (sem arquitetura, WebGL indisponível) não impede o PDF — sai sem o anexo.
  let modelo3d = null;
  if (proposta.rows[0].modelo_3d_cliente) {
    try {
      const imagem = await require('../services/modelo3d').imagemDoModelo('proposta', proposta.rows[0].id);
      if (imagem) modelo3d = { imagem, comLink: true };
    } catch (e) {
      console.warn(`PDF da proposta ${id} sem o modelo 3D: ${e.message}`);
    }
  }
  const html = gerarHtmlProposta({ ...proposta.rows[0], secoes: secoes.rows, itens: itens.rows }, { ...anexos, modelo3d });

  // puppeteer 25 devolve Uint8Array: sem Buffer.from, o res.send do Express 4
  // respondia JSON ({"0":37,"1":80,...}) no lugar do PDF (download e anexo)
  const pdf = Buffer.from(await gerarPdfDeHtml(html, {
    margin: { top: '12mm', bottom: '24mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: gerarFooterTemplate(),
  }));
  return { proposta: proposta.rows[0], pdf };
}

function nomeArquivoProposta(proposta) {
  const nomeCliente = String(proposta.cliente_nome || '').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
  return `${nomeCliente}_${proposta.numero}.pdf`;
}

async function gerarPdf(req, res) {
  const { id } = req.params;
  try {
    const resultado = await montarPdfBuffer(id, lerAnexosPdf(req.query));
    if (!resultado) return res.status(404).json({ erro: 'Proposta não encontrada' });
    // orçamento vindo de análise/laudo: a cópia na pasta deles vira esta versão
    await salvarPdfPropostaNasPastas(resultado.proposta, resultado.pdf);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDisposition(nomeArquivoProposta(resultado.proposta)),
    });
    res.send(resultado.pdf);
  } catch (err) {
    // fila de PDF cheia (utils/pdfPuppeteer.js): passageiro, a mensagem diz o que fazer
    if (err.codigo === 'FILA_PDF_CHEIA') return res.status(503).json({ erro: err.message });
    console.error('Erro ao gerar PDF:', err);
    res.status(500).json({ erro: 'Erro ao gerar PDF da proposta' });
  }
}

// Planilha Excel do orçamento para o cliente (modelo H&M: parâmetros,
// orçamento, resumo, quantitativos, pesquisa de preços, fornecedores e
// cronograma — ver utils/planilhaOrcamentoCliente.js)
async function gerarPlanilha(req, res) {
  try {
    const r = await gerarPlanilhaCliente(req.params.id);
    if (!r) return res.status(404).json({ erro: 'Proposta não encontrada' });
    const nome = nomeArquivoProposta(r.proposta).replace(/\.pdf$/i, '.xlsx');
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': contentDisposition(nome),
    });
    res.send(Buffer.from(r.buffer));
  } catch (err) {
    console.error('Erro ao gerar planilha da proposta:', err);
    res.status(500).json({ erro: 'Erro ao gerar a planilha da proposta' });
  }
}

async function enviarEmail(req, res) {
  const { id } = req.params;
  const { destinatario, mensagem } = req.body;

  if (!destinatario || typeof destinatario !== 'string' || destinatario.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
    return res.status(400).json({ erro: 'Informe um e-mail de destino válido' });
  }
  if (mensagem != null && (typeof mensagem !== 'string' || mensagem.length > 10000)) {
    return res.status(400).json({ erro: 'A mensagem deve ser um texto de até 10.000 caracteres' });
  }

  try {
    const resultado = await montarPdfBuffer(id, lerAnexosPdf(req.body.anexos));
    if (!resultado) return res.status(404).json({ erro: 'Proposta não encontrada' });
    const { proposta, pdf } = resultado;
    await salvarPdfPropostaNasPastas(proposta, pdf);

    // A assinatura padrão sempre vai no final — tanto na mensagem padrão
    // quanto numa digitada pelo usuário, sem exceção (não dá pra mandar sem
    // ela por esquecimento ou por apagar sem querer).
    const corpoMensagem = (mensagem && mensagem.trim())
      || `Olá,\n\nSegue em anexo a proposta ${proposta.numero}.`;
    const textoCompleto = `${corpoMensagem}\n\n${ASSINATURA_EMPRESA}`;

    const transportador = criarTransportador();
    await transportador.sendMail({
      from: `"H&M Engenharia" <${process.env.EMAIL_IMAP_USER}>`,
      to: destinatario,
      subject: `Proposta ${proposta.numero} — H&M Engenharia e Tecnologia`,
      text: textoCompleto,
      attachments: [
        { filename: nomeArquivoProposta(proposta), content: pdf, contentType: 'application/pdf' },
      ],
    });

    // fica no histórico da proposta quem enviou e para onde (sai da caixa da empresa)
    await registrarEvento(pool, proposta.id, req.usuario.id, 'email', `Enviada por e-mail para ${destinatario}`)
      .catch(e => console.warn('Evento de envio por e-mail não registrado:', e.message));
    res.json({ mensagem: `Proposta ${proposta.numero} enviada para ${destinatario}` });
  } catch (err) {
    // detalhes do SMTP (servidor, conta, resposta) só no log
    console.error('Erro ao enviar proposta por e-mail:', err);
    res.status(500).json({ erro: 'Não foi possível enviar a proposta por e-mail. Tente de novo; se persistir, avise o administrador.' });
  }
}

module.exports = {
  listar, buscarUma, criar, atualizar, duplicar, atualizarStatus, remover, proximoNum, gerarPdf, gerarPlanilha, enviarEmail,
  // Reaproveitados por projetosController.gerarOrcamento (Análise de Projeto -> Orçamentos),
  // pra criar/atualizar uma proposta sem duplicar a regra de numeração e inserção de itens.
  inserirSecoesEItens, proximoNumero, registrarEvento,
  // PDF da proposta sem resposta HTTP (cópia na pasta do projeto/laudo)
  montarPdfBuffer,
  // mudança de status numa transação já aberta (aprovação por link, 2.0)
  aplicarStatusProposta, ErroStatusProposta,
  // regra item → seção (testes/revisao-b1.test.js)
  itemPertenceASecao,
};
