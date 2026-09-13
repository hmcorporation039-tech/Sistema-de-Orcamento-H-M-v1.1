const { gerarPdfDeHtml } = require('../utils/pdfPuppeteer');
const pool = require('../config/database');
const { analisarProjetoCompleto } = require('../utils/compatibilizacaoAnalise');
const { gerarHtmlRelatorioCompatibilizacao } = require('../utils/relatorioCompatibilizacaoTemplate');
const { gerarFooterTemplate } = require('../utils/pdfTemplate');
const { normalizarDisciplinas } = require('../utils/disciplinasProjeto');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');

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
    cameras: row.cameras,
    pontosRedeAntena: row.pontos_rede_antena,
    tabelaCabos: row.tabela_cabos,
    achados: row.achados,
    servicos: row.servicos,
    materiais: row.materiais,
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
    const result = await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [id]);
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
        (cliente_nome, disciplinas, arquivos_analisados, ambientes, cameras,
         pontos_rede_antena, tabela_cabos, achados, servicos, materiais, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        resultado.cliente,
        JSON.stringify(resultado.disciplinas),
        JSON.stringify(resultado.arquivosAnalisados),
        JSON.stringify(resultado.ambientes),
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

module.exports = { listar, buscarUma, analisar, atualizar, remover, gerarRelatorio };
