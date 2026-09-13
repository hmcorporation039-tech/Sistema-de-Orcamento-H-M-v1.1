const { gerarPdfDeHtml } = require('../utils/pdfPuppeteer');
const pool = require('../config/database');
const { analisarProjetoCompleto } = require('../utils/compatibilizacaoAnalise');
const { gerarHtmlRelatorioCompatibilizacao } = require('../utils/relatorioCompatibilizacaoTemplate');
const { gerarFooterTemplate } = require('../utils/pdfTemplate');
const { normalizarDisciplinas } = require('../utils/disciplinasProjeto');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');
const { comTransacao } = require('../utils/transacao');
const { calcularTotais } = require('../utils/calculoProposta');
const { validarProposta } = require('../utils/validacaoProposta');
const { inserirSecoesEItens, proximoNumero, registrarEvento } = require('./propostasController');

// Converte uma linha de analises_projeto (colunas snake_case, JSONB já
// parseado pelo driver do pg) para o mesmo formato camelCase que o restante
// do pipeline (analisarProjetoCompleto, o template do relatório e o
// frontend) já usa.
function linhaParaAnalise(row) {
  return {
    id: row.id,
    cliente: row.cliente_nome,
    clienteId: row.cliente_id,
    disciplinas: row.disciplinas,
    arquivosAnalisados: row.arquivos_analisados,
    ambientes: row.ambientes,
    pontosPorAmbiente: row.pontos_por_ambiente,
    cameras: row.cameras,
    pontosRedeAntena: row.pontos_rede_antena,
    tabelaCabos: row.tabela_cabos,
    achados: row.achados,
    servicos: row.servicos,
    materiais: row.materiais,
    // Proposta gerada a partir desta análise (botão "Gerar Orçamento"), se
    // já existir — o número só vem quando a consulta faz o LEFT JOIN com
    // propostas (buscarUma); nas demais fica undefined, sem problema.
    propostaId: row.proposta_id,
    propostaNumero: row.proposta_numero,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

// Lista as análises salvas (mais recentes primeiro) para a tela de
// "Análises salvas" — só os campos necessários pra montar a lista, não o
// conteúdo inteiro (ambientes/servicos/materiais só vêm no buscarUma).
async function listar(req, res) {
  const { busca } = req.query;
  const { pagina, porPagina, offset } = parsePaginacao(req.query);

  let condicoes = 'WHERE 1=1';
  const params = [];
  if (busca) {
    params.push(`%${busca}%`);
    condicoes += ` AND cliente_nome ILIKE $${params.length}`;
  }

  try {
    const total = await pool.query(`SELECT count(*) FROM analises_projeto ${condicoes}`, params);
    const result = await pool.query(
      `SELECT id, cliente_id, cliente_nome, disciplinas, arquivos_analisados,
              jsonb_array_length(achados) AS total_achados,
              criado_em, atualizado_em
       FROM analises_projeto ${condicoes}
       ORDER BY atualizado_em DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, porPagina, offset]
    );
    res.json(montarResposta(result.rows, parseInt(total.rows[0].count, 10), pagina, porPagina));
  } catch (err) {
    console.error('Erro ao listar análises de projeto:', err);
    res.status(500).json({ erro: 'Erro ao listar análises de projeto' });
  }
}

async function buscarUma(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT ap.*, p.numero AS proposta_numero
       FROM analises_projeto ap
       LEFT JOIN propostas p ON p.id = ap.proposta_id
       WHERE ap.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Análise não encontrada' });
    res.json(linhaParaAnalise(result.rows[0]));
  } catch (err) {
    console.error('Erro ao buscar análise de projeto:', err);
    res.status(500).json({ erro: 'Erro ao buscar análise de projeto' });
  }
}

// Recebe um ou mais PDFs de projeto (plantas de CFTV, cabeamento, etc.) e a
// disciplina de CADA arquivo (não uma lista única pro lote inteiro — ver
// utils/compatibilizacaoAnalise.js sobre por que isso evita um arquivo de uma
// disciplina contaminar a contagem de outra), roda a análise (ambientes,
// câmeras, cabos, achados de compatibilização e uma lista inicial de
// serviços/materiais) e PERSISTE o resultado — a partir daqui o frontend
// guarda o `id` retornado e usa ele pra autosave/relatório, em vez de manter
// tudo só em memória no navegador (que sumia ao trocar de tela).
async function analisar(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ erro: 'Envie ao menos um arquivo PDF de projeto' });
  }

  let disciplinasPorArquivo;
  try {
    disciplinasPorArquivo = JSON.parse(req.body.disciplinasPorArquivo || '[]');
  } catch {
    return res.status(400).json({ erro: 'Formato inválido de disciplinas por arquivo' });
  }
  if (!Array.isArray(disciplinasPorArquivo) || disciplinasPorArquivo.length !== req.files.length) {
    return res.status(400).json({ erro: 'Cada arquivo enviado precisa ter sua lista de disciplinas correspondente' });
  }

  const arquivos = req.files.map((f, i) => ({
    buffer: f.buffer,
    nomeArquivo: f.originalname,
    disciplinas: normalizarDisciplinas(disciplinasPorArquivo[i]),
  }));
  if (arquivos.some(a => a.disciplinas.length === 0)) {
    return res.status(400).json({ erro: 'Selecione ao menos uma disciplina para cada arquivo enviado' });
  }

  try {
    const resultado = await analisarProjetoCompleto(arquivos);

    const insert = await pool.query(
      `INSERT INTO analises_projeto
        (cliente_nome, disciplinas, arquivos_analisados, ambientes, pontos_por_ambiente, cameras,
         pontos_rede_antena, tabela_cabos, achados, servicos, materiais, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        resultado.cliente,
        JSON.stringify(resultado.disciplinas),
        JSON.stringify(resultado.arquivosAnalisados),
        JSON.stringify(resultado.ambientes),
        JSON.stringify(resultado.pontosPorAmbiente),
        JSON.stringify(resultado.cameras),
        JSON.stringify(resultado.pontosRedeAntena),
        JSON.stringify(resultado.tabelaCabos),
        JSON.stringify(resultado.achados),
        JSON.stringify(resultado.servicos),
        JSON.stringify(resultado.materiais),
        req.usuario.id,
      ]
    );

    res.json(linhaParaAnalise(insert.rows[0]));
  } catch (err) {
    console.error('Erro ao analisar projeto:', err);
    res.status(422).json({ erro: err.message || 'Erro ao analisar os arquivos do projeto' });
  }
}

// Salva as edições feitas na revisão (cliente, serviços e materiais — o que
// o usuário pode alterar na tela). Chamado tanto pelo autosave (debounced,
// a cada mudança) quanto por uma ação explícita de salvar.
async function atualizar(req, res) {
  const { id } = req.params;
  const { cliente_nome, servicos, materiais } = req.body;

  try {
    const result = await pool.query(
      `UPDATE analises_projeto SET
        cliente_nome = COALESCE($1, cliente_nome),
        servicos = COALESCE($2::jsonb, servicos),
        materiais = COALESCE($3::jsonb, materiais),
        atualizado_em = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        cliente_nome ?? null,
        servicos ? JSON.stringify(servicos) : null,
        materiais ? JSON.stringify(materiais) : null,
        id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Análise não encontrada' });
    res.json(linhaParaAnalise(result.rows[0]));
  } catch (err) {
    console.error('Erro ao atualizar análise de projeto:', err);
    res.status(500).json({ erro: 'Erro ao atualizar análise de projeto' });
  }
}

// Só ação explícita do usuário (nunca automática) — a lista de análises
// salvas confirma antes de chamar isso.
async function remover(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM analises_projeto WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Análise não encontrada' });
    res.json({ mensagem: 'Análise removida' });
  } catch (err) {
    console.error('Erro ao remover análise de projeto:', err);
    res.status(500).json({ erro: 'Erro ao remover análise de projeto' });
  }
}

// Gera o relatório de compatibilização em PDF a partir do que está salvo no
// banco (não do que o navegador tem em memória) — sempre reflete a última
// versão persistida, inclusive edições feitas antes de navegar pra outra tela.
async function gerarRelatorio(req, res, next) {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Análise não encontrada' });
    const analise = linhaParaAnalise(result.rows[0]);

    const html = gerarHtmlRelatorioCompatibilizacao(analise);
    // O PDF fica pronto (e o navegador é fechado) ANTES de qualquer resposta —
    // assim não existe mais o caso de um erro acontecer depois do res.send.
    const pdf = await gerarPdfDeHtml(html, {
      margin: { top: '12mm', bottom: '20mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: gerarFooterTemplate(),
    });

    const nomeCliente = String(analise.cliente || 'projeto').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Compatibilizacao_${nomeCliente}.pdf"`,
    });
    res.send(pdf);
  } catch (err) {
    console.error('Erro ao gerar relatório de compatibilização:', err);
    next(err);
  }
}

// Gera (ou atualiza, se já existir) uma proposta rascunho na aba Orçamentos a
// partir do que está salvo na análise — é daqui que o orçamento é concluído
// (BDI, impostos, itens "a cotar" revisados, etc.), a análise só entrega o
// ponto de partida. Botão explícito na tela ("Gerar Orçamento"), nunca
// automático — analisar de novo/editar não cria propostas sozinho.
async function gerarOrcamento(req, res, next) {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Análise não encontrada' });
    const analise = linhaParaAnalise(result.rows[0]);

    if (!analise.cliente || !analise.cliente.trim()) {
      return res.status(400).json({ erro: 'Preencha o nome do cliente na análise antes de gerar o orçamento' });
    }

    // Itens marcados como "já pronto" não fazem parte do escopo orçado —
    // mesmo critério que já vale pro relatório de compatibilização.
    const servicosParaOrcar = (analise.servicos || []).filter(s => !s.pronto);
    const materiaisParaOrcar = (analise.materiais || []).filter(m => !m.pronto);
    if (servicosParaOrcar.length === 0 && materiaisParaOrcar.length === 0) {
      return res.status(400).json({ erro: 'Não há serviços nem materiais a orçar (tudo marcado como "já pronto")' });
    }

    // Tenta casar com um cliente já cadastrado pelo nome — se não achar, a
    // proposta fica só com o nome (igual uma proposta manual com cliente avulso).
    const clienteEncontrado = await pool.query(
      'SELECT id FROM clientes WHERE LOWER(nome) = LOWER($1) AND ativo = true LIMIT 1',
      [analise.cliente.trim()]
    );
    const clienteId = clienteEncontrado.rows[0]?.id || null;

    const NOME_SECAO_SERVICOS = 'Serviços (Mão de Obra)';
    const NOME_SECAO_MATERIAIS = 'Materiais e Equipamentos';

    // Item "confirmado" só quando tem quantidade real E preço real — senão
    // "a_cotar" (mesmo status que a tela de Orçamento já usa pra sinalizar
    // preço estimado/pendente), pra não passar pro cliente como fechado algo
    // que ainda depende de conferência manual.
    const itens = [
      ...servicosParaOrcar.map(s => ({
        secao_nome: NOME_SECAO_SERVICOS,
        descricao: s.descricao,
        quantidade: s.quantidade,
        unidade: s.unidade,
        valor_unitario: s.valor_unitario || 0,
        subgrupo: s.subgrupo || null,
        status: (Number(s.quantidade) > 0 && Number(s.valor_unitario) > 0) ? 'confirmado' : 'a_cotar',
      })),
      ...materiaisParaOrcar.map(m => ({
        secao_nome: NOME_SECAO_MATERIAIS,
        material_id: m.material_id || null,
        descricao: m.descricao,
        quantidade: m.quantidade,
        unidade: m.unidade,
        valor_unitario: m.preco_catalogo || 0,
        subgrupo: m.subgrupo || null,
        status: (Number(m.quantidade) > 0 && m.preco_catalogo != null) ? 'confirmado' : 'a_cotar',
      })),
    ];
    // `id` aqui não é opcional: inserirSecoesEItens casa item->seção por
    // `it.sid === sec.id || it.secao_nome === sec.nome` — com as duas seções
    // sem id, a primeira condição virava `undefined === undefined` (true) e
    // TODO item entrava em TODAS as seções (confirmado testando a tela: as
    // duas seções saíam com a lista inteira duplicada). Qualquer valor
    // distinto de undefined já resolve, já que os itens não usam `sid`.
    const secoes = [
      ...(servicosParaOrcar.length > 0 ? [{ id: 1, nome: NOME_SECAO_SERVICOS }] : []),
      ...(materiaisParaOrcar.length > 0 ? [{ id: 2, nome: NOME_SECAO_MATERIAIS }] : []),
    ];

    const observacoes = `Gerado automaticamente a partir da Análise de Projeto #${analise.id}` +
      (analise.propostaId ? ' (atualizado — itens substituídos pela versão mais recente da análise).' : '.') +
      ' Revise quantidades, preços e os itens marcados "A cotar" antes de enviar ao cliente.';
    const dataHoje = new Date().toISOString().slice(0, 10);

    const erroValidacao = validarProposta({ data: dataHoje, cliente_nome: analise.cliente.trim(), secoes, itens });
    if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

    const totais = calcularTotais({ secoes, itens, bdi: 0, imposto_venda: 0, imposto_servico: 0 });

    const { propostaId, numero, criada } = await comTransacao(async (client) => {
      if (analise.propostaId) {
        const propostaAtual = await client.query('SELECT numero FROM propostas WHERE id = $1', [analise.propostaId]);
        if (propostaAtual.rows.length > 0) {
          await client.query(
            `UPDATE propostas SET
              data=$1, cliente_id=$2, cliente_nome=$3, responsavel=$4, observacoes=$5,
              subtotal_materiais=$6, subtotal_mao_obra=$7, valor_bdi=$8,
              valor_imposto_venda=$9, valor_imposto_servico=$10, total=$11, atualizado_em=NOW()
             WHERE id=$12`,
            [dataHoje, clienteId, analise.cliente.trim(), req.usuario.nome, observacoes,
             totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
             totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total, analise.propostaId]
          );
          await client.query('DELETE FROM proposta_secoes WHERE proposta_id = $1', [analise.propostaId]);
          await inserirSecoesEItens(client, analise.propostaId, secoes, itens);
          await registrarEvento(client, analise.propostaId, req.usuario.id, 'editada', `Atualizada a partir da Análise de Projeto #${analise.id}`);
          return { propostaId: analise.propostaId, numero: propostaAtual.rows[0].numero, criada: false };
        }
        // a proposta vinculada foi excluída — cai no fluxo de criar uma nova abaixo
      }

      const seq = await proximoNumero(client);
      const numeroGerado = 'P' + String(seq).padStart(3, '0');
      const propResult = await client.query(
        `INSERT INTO propostas (
          numero, sequencial, data, validade, cliente_id, cliente_nome, responsavel, observacoes,
          bdi, imposto_venda, imposto_servico, subtotal_materiais, subtotal_mao_obra, valor_bdi,
          valor_imposto_venda, valor_imposto_servico, total, usuario_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING id`,
        [numeroGerado, seq, dataHoje, 5, clienteId, analise.cliente.trim(), req.usuario.nome, observacoes,
         0, 0, 0, totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
         totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total, req.usuario.id]
      );
      const novaPropostaId = propResult.rows[0].id;
      await inserirSecoesEItens(client, novaPropostaId, secoes, itens);
      await registrarEvento(client, novaPropostaId, req.usuario.id, 'criada', `Proposta ${numeroGerado} criada a partir da Análise de Projeto #${analise.id}`);
      await client.query('UPDATE analises_projeto SET proposta_id = $1 WHERE id = $2', [novaPropostaId, analise.id]);
      return { propostaId: novaPropostaId, numero: numeroGerado, criada: true };
    });

    res.json({
      propostaId, numero, criada,
      mensagem: criada ? `Orçamento ${numero} criado a partir desta análise` : `Orçamento ${numero} atualizado com os itens desta análise`,
    });
  } catch (err) {
    console.error('Erro ao gerar orçamento a partir da análise:', err);
    next(err);
  }
}

module.exports = { listar, buscarUma, analisar, atualizar, remover, gerarRelatorio, gerarOrcamento };
