// Análise de Projeto — as análises salvas: listar, abrir, analisar os arquivos
// enviados (PDF, DWG, DXF), salvar as edições da revisão, excluir, o relatório
// de compatibilização em PDF e a pasta da análise.
const { gerarPdfDeHtml } = require('../../services/pdfPuppeteer');
const pool = require('../../config/database');
const { contentDisposition } = require('../../utils/nomeArquivoDownload');
const { registrarAuditoria } = require('../../services/auditoria');
const { analisarProjetoCompleto } = require('../../services/compatibilizacaoAnalise');
const { gerarHtmlRelatorioCompatibilizacao } = require('../../utils/relatorioCompatibilizacaoTemplate');
const { gerarFooterTemplate } = require('../../utils/pdfTemplate');
const { normalizarDisciplinas } = require('../../utils/disciplinasProjeto');
const { parsePaginacao, montarResposta } = require('../../utils/paginacao');
const { comTransacao } = require('../../services/transacao');
const P = require('../../services/pastasSistema');
const { tipoPorConteudo } = require('../../utils/tipoArquivo');
const { versaoDoPedido, responderConflitoOuAusente } = require('../../utils/versao');
const { sincronizarProjeto, pastaDoProjeto, seguro, excluirPastaDoItem, rotasDePasta } = require('../../services/pastasRegistros');
const { lerObraId, conferirObra, sqlObraJson } = require('../../utils/obras');
const { lerFinalidade } = require('../../utils/projetoLaudo');
const { ehArquivoCad } = require('../../services/analiseCad');
const { ehConteudoCad, nomeUtf8, linhaParaAnalise } = require('./comum');

// Versão 2.1 — finalidade da análise (escolhida ao enviar, editável depois):
//   'orcamento'  — orçar a partir do projeto recebido (itens + "Gerar orçamento")
//   'elaboracao' — a H&M vai definir/entregar o projeto a partir do arquitetônico
//                  ("Elaborar projeto da disciplina" → projeto por disciplina)
// Nenhuma das duas cria laudo.

// Análise completa com o número da proposta e a obra (2.0): `obra` = { id,
// codigo, nome, status } e `pasta_obra_dir` = pasta da obra onde a pasta da
// análise mora (análise nova ligada à obra), para o caminhoPasta.
const SQL_ANALISE_COMPLETA = `
  SELECT ap.*, p.numero AS proposta_numero, ${sqlObraJson('ob')} AS obra, obp.pasta AS pasta_obra_dir, obp.pasta_base AS pasta_obra_base
    FROM analises_projeto ap
    LEFT JOIN propostas p ON p.id = ap.proposta_id
    LEFT JOIN obras ob ON ob.id = ap.obra_id
    LEFT JOIN obras obp ON obp.id = ap.pasta_obra_id
   WHERE ap.id = $1`;

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
    condicoes += ` AND (ap.cliente_nome ILIKE $${params.length} OR ap.nome_projeto ILIKE $${params.length} OR ob.nome ILIKE $${params.length} OR ap.id::text = $${params.length + 1})`;
    params.push(String(busca).replace(/^#/, '').trim());
  }
  // ?finalidade=orcamento|elaboracao (2.1)
  if (req.query.finalidade) {
    const finalidade = lerFinalidade(req.query.finalidade, null);
    if (!finalidade) return res.status(400).json({ erro: 'Finalidade inválida (orcamento ou elaboracao).' });
    params.push(finalidade);
    condicoes += ` AND ap.finalidade = $${params.length}`;
  }
  // ?obra_id=ID (análises da obra) ou ?obra_id=sem (sem obra)
  if (req.query.obra_id === 'sem') condicoes += ' AND ap.obra_id IS NULL';
  else if (req.query.obra_id) {
    const n = Number(req.query.obra_id);
    if (!Number.isInteger(n) || n < 1) return res.status(400).json({ erro: 'Obra inválida.' });
    params.push(n);
    condicoes += ` AND ap.obra_id = $${params.length}`;
  }

  const total = await pool.query(`SELECT count(*) FROM analises_projeto ap LEFT JOIN obras ob ON ob.id = ap.obra_id ${condicoes}`, params);
  const result = await pool.query(
    `SELECT ap.id, ap.cliente_id, ap.cliente_nome, ap.nome_projeto, ap.finalidade, ap.disciplinas, ap.arquivos_analisados,
            jsonb_array_length(ap.achados) AS total_achados,
            ap.criado_em, ap.atualizado_em, ap.obra_id, ${sqlObraJson('ob')} AS obra,
            ap.proposta_id, pr.numero AS proposta_numero
     FROM analises_projeto ap LEFT JOIN obras ob ON ob.id = ap.obra_id LEFT JOIN propostas pr ON pr.id = ap.proposta_id ${condicoes}
     ORDER BY ap.atualizado_em DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, porPagina, offset]
  );
  res.json(montarResposta(result.rows, parseInt(total.rows[0].count, 10), pagina, porPagina));
}

async function buscarUma(req, res) {
  const { id } = req.params;
  const result = await pool.query(SQL_ANALISE_COMPLETA, [id]);
  if (result.rows.length === 0) return res.status(404).json({ erro: 'Análise não encontrada' });
  // projetos por disciplina elaborados a partir desta análise (2.1)
  const projetos = await pool.query(
    `SELECT id, tipo, disciplina, titulo, propostas, atualizado_em FROM laudos_projetos WHERE analise_id = $1 ORDER BY disciplina, id`, [id]);
  res.json({ ...linhaParaAnalise(result.rows[0]), projetos: projetos.rows });
}

// Recebe um ou mais PDFs de projeto (plantas de CFTV, cabeamento, etc.) e a
// disciplina de CADA arquivo (não uma lista única pro lote inteiro — ver
// services/compatibilizacaoAnalise.js sobre por que isso evita um arquivo de uma
// disciplina contaminar a contagem de outra), roda a análise (ambientes,
// câmeras, cabos, achados de compatibilização e uma lista inicial de
// serviços/materiais) e PERSISTE o resultado — a partir daqui o frontend
// guarda o `id` retornado e usa ele pra autosave/relatório, em vez de manter
// tudo só em memória no navegador (que sumia ao trocar de tela).
async function analisar(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ erro: 'Envie ao menos um arquivo de projeto (PDF, DWG ou DXF)' });
  }
  // 2.3: além do PDF, o DWG/DXF do projeto (lido como desenho — services/analiseCad/index.js)
  const invalido = req.files.find(f => (ehArquivoCad(f.originalname) ? !ehConteudoCad(f.buffer) : tipoPorConteudo(f.buffer) !== 'application/pdf'));
  if (invalido) {
    return res.status(400).json({ erro: ehArquivoCad(invalido.originalname)
      ? `"${invalido.originalname}" não é um DWG nem um DXF válido`
      : `"${invalido.originalname}" não é um arquivo PDF válido (aceitos: PDF, DWG e DXF)` });
  }
  // o multer lê o nome em latin1: acentos do nome do arquivo voltam a UTF-8
  for (const f of req.files) f.originalname = nomeUtf8(f.originalname);

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
  return executarAnalise(req, res, arquivos, req.body);
}

// Conteúdo de cada arquivo confere com a extensão (PDF de verdade; DWG/DXF de verdade)
function arquivoInvalido(arquivos) {
  const ruim = arquivos.find(a => (ehArquivoCad(a.nomeArquivo) ? !ehConteudoCad(a.buffer) : tipoPorConteudo(a.buffer) !== 'application/pdf'));
  if (!ruim) return null;
  return ehArquivoCad(ruim.nomeArquivo) ? `"${ruim.nomeArquivo}" não é um DWG nem um DXF válido` : `"${ruim.nomeArquivo}" não é um arquivo PDF válido (aceitos: PDF, DWG e DXF)`;
}

// Parte comum do envio direto (multipart) e do pacote (2.3): obra, finalidade,
// análise, gravação. `corpo`: { finalidade, obra_id, nome_projeto }.
async function executarAnalise(req, res, arquivos, corpo) {
  // finalidade (2.1): campo multipart; ausente = 'orcamento' (o uso de sempre,
  // e o que o MCP manda quando não informa)
  const finalidade = lerFinalidade(corpo.finalidade);
  if (!finalidade) return res.status(400).json({ erro: 'Finalidade inválida: escolha "Orçamento" ou "Elaboração de projeto".' });

  // obra (2.0): campo multipart obra_id — a análise nasce ligada à obra e a
  // pasta dela fica em Obras\<obra>\Projeto
  const leituraObra = lerObraId(corpo);
  const erroObra = await conferirObra(pool, leituraObra, { usuario: req.usuario }).catch(() => 'Obra não encontrada.');
  if (erroObra) return res.status(400).json({ erro: erroObra });
  // falha do banco aqui (fora do try abaixo) deixava o pedido pendurado
  let obraDaAnalise = null;
  try {
    obraDaAnalise = leituraObra.valor
      ? (await pool.query('SELECT id, cliente_id, cliente_nome FROM obras WHERE id = $1', [leituraObra.valor])).rows[0]
      : null;
  } catch (err) {
    console.error('Erro ao ler a obra da análise:', err.message);
    return res.status(500).json({ erro: 'Erro ao ler a obra da análise' });
  }

  try {
    const resultado = await analisarProjetoCompleto(arquivos);

    // análise e arquitetura numa transação só: antes, uma falha no segundo
    // INSERT deixava a análise gravada sem a base do 3D/compatibilização
    // (e o usuário via erro, analisava de novo e ficava com duas)
    const insert = await comTransacao(async (client) => {
    const ins = await client.query(
      `INSERT INTO analises_projeto
        (cliente_nome, disciplinas, arquivos_analisados, ambientes, pontos_por_ambiente, cameras,
         pontos_rede_antena, tabela_cabos, achados, servicos, materiais, usuario_id, nome_projeto, dados_extraidos,
         obra_id, cliente_id, finalidade, conflitos, compatibilizacao, espacial)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        // sem cliente no carimbo do PDF, vale o cliente da obra
        resultado.cliente || obraDaAnalise?.cliente_nome || resultado.cliente,
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
        String(corpo.nome_projeto || '').trim().slice(0, 200) || null,
        JSON.stringify(resultado.dadosExtraidos || []),
        obraDaAnalise?.id || null,
        !resultado.cliente && obraDaAnalise ? obraDaAnalise.cliente_id : null,
        finalidade,
        JSON.stringify(resultado.conflitos || []),
        JSON.stringify(resultado.compatibilizacao || null),
        // 2.3: posições reais dos DWG/DXF (alinhadas à referência) para o 3D
        JSON.stringify(resultado.espacial || null),
      ]
    );

    // DWG/DXF com arquitetura: vira a base do modelo 3D desta análise (2.3)
    if (resultado.arquiteturaCad) {
      const a = resultado.arquiteturaCad;
      await client.query(
        `INSERT INTO analises_projeto_arquitetura (analise_id, nome_arquivo, conteudo, resumo, usuario_id) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (analise_id) DO NOTHING`,
        [ins.rows[0].id, String(a.nome_arquivo).slice(0, 200), Buffer.from(a.dxf, 'utf8'), a.resumo, req.usuario.id]);
    }
    return ins;
    });

    // Pasta do projeto (fora da transação): guarda os arquivos recebidos (antes eram lidos e descartados)
    await sincronizarProjeto(insert.rows[0], arquivos);
    const salvo = await pool.query(SQL_ANALISE_COMPLETA, [insert.rows[0].id]);
    res.json(linhaParaAnalise(salvo.rows[0]));
    return true;
  } catch (err) {
    console.error('Erro ao analisar projeto:', err);
    // erros do banco/sistema (têm `code`) não vão para a tela — só os da leitura do projeto
    res.status(422).json({ erro: (!err.code && err.message) || 'Erro ao analisar os arquivos do projeto' });
    return false;
  }
}

// Salva as edições feitas na revisão (cliente, serviços e materiais — o que
// o usuário pode alterar na tela). Chamado tanto pelo autosave (debounced,
// a cada mudança) quanto por uma ação explícita de salvar.
async function atualizar(req, res) {
  const { id } = req.params;
  const { cliente_nome, nome_projeto, servicos, materiais, funcionamento, pontos_por_disciplina } = req.body;

  // A tela e o relatório PDF iteram esses campos (.find/.filter/.map); um valor
  // fora do formato gravado aqui quebraria os dois para essa análise.
  if (funcionamento != null && typeof funcionamento !== 'string') {
    return res.status(400).json({ erro: 'funcionamento deve ser um texto' });
  }
  if (pontos_por_disciplina != null && (
    !Array.isArray(pontos_por_disciplina) ||
    pontos_por_disciplina.some(g => !g || typeof g.disciplina !== 'string' || !Array.isArray(g.itens))
  )) {
    return res.status(400).json({ erro: 'pontos_por_disciplina deve ser uma lista de { disciplina, itens: [] }' });
  }
  // serviços/materiais substituem a lista inteira: item sem descrição nem código
  // ou com quantidade negativa/não numérica era gravado e aparecia como
  // "(sem descrição) −5" (teste de 28/10/2026)
  for (const [nome, lista] of [['servicos', servicos], ['materiais', materiais]]) {
    if (lista == null) continue;
    if (!Array.isArray(lista) || lista.length > 2000) return res.status(400).json({ erro: `${nome} deve ser uma lista (até 2000 itens)` });
    const ruim = lista.find(x => !x || typeof x !== 'object' || !(String(x.descricao || '').trim() || String(x.codigo || '').trim())
      || (x.quantidade != null && x.quantidade !== '' && !(Number(x.quantidade) >= 0)));
    if (ruim) return res.status(400).json({ erro: `Item inválido em ${nome}: precisa de descrição (ou código) e quantidade zero ou positiva.` });
  }
  // finalidade (2.1): presente troca; ausente mantém
  const finalidade = req.body.finalidade == null ? null : lerFinalidade(req.body.finalidade, null);
  if (req.body.finalidade != null && !finalidade) {
    return res.status(400).json({ erro: 'Finalidade inválida: escolha "Orçamento" ou "Elaboração de projeto".' });
  }

  // obra (2.0): obra_id presente liga/desliga (null); ausente mantém
  const leituraObra = lerObraId(req.body);
  const erroObra = await conferirObra(pool, leituraObra, { usuario: req.usuario, tabela: 'analises_projeto', id });
  if (erroObra) return res.status(400).json({ erro: erroObra });
  const result = await pool.query(
    `UPDATE analises_projeto SET
      cliente_nome = COALESCE($1, cliente_nome),
      servicos = COALESCE($2::jsonb, servicos),
      materiais = COALESCE($3::jsonb, materiais),
      funcionamento = COALESCE($4, funcionamento),
      pontos_por_disciplina = COALESCE($5::jsonb, pontos_por_disciplina),
      nome_projeto = COALESCE($7, nome_projeto),
      obra_id = CASE WHEN $9::boolean THEN $10::int ELSE obra_id END,
      finalidade = COALESCE($11, finalidade),
      atualizado_em = NOW(), versao = versao + 1
     WHERE id = $6 AND ($8::int IS NULL OR versao = $8)
     RETURNING *`,
    [
      cliente_nome ?? null,
      servicos ? JSON.stringify(servicos) : null,
      materiais ? JSON.stringify(materiais) : null,
      funcionamento ?? null,
      pontos_por_disciplina ? JSON.stringify(pontos_por_disciplina) : null,
      id,
      nome_projeto != null ? String(nome_projeto).trim().slice(0, 200) : null,
      versaoDoPedido(req.body),
      leituraObra.presente, leituraObra.valor,
      finalidade,
    ]
  );
  if (result.rows.length === 0) return responderConflitoOuAusente(pool, res, 'analises_projeto', id);
  // pasta acompanha o nome (renomeia) e o JSON de dados é sobrescrito
  await sincronizarProjeto(result.rows[0]);
  const salvo = await pool.query(SQL_ANALISE_COMPLETA, [id]);
  res.json(linhaParaAnalise(salvo.rows[0]));
}

// Só ação explícita do usuário (nunca automática) — a lista de análises
// salvas confirma antes de chamar isso.
async function remover(req, res) {
  const { id } = req.params;
  // DELETE e auditoria na mesma transação (auditoria obrigatória): antes, uma
  // falha entre os dois apagava a análise sem deixar o registro dela na auditoria
  const result = await comTransacao(async (client) => {
    const r = await client.query('DELETE FROM analises_projeto WHERE id = $1 RETURNING *', [id]);
    if (r.rows[0]) await registrarAuditoria(client, { entidade: 'analises_projeto', entidadeId: r.rows[0].id, acao: 'excluir', usuarioId: req.usuario.id, detalhes: { analise: r.rows[0] }, obrigatoria: true });
    return r;
  });
  if (result.rows.length === 0) return res.status(404).json({ erro: 'Análise não encontrada' });
  // a pasta não é apagada: vai para "Arquivos do Sistema/_Excluídos"
  await excluirPastaDoItem('projeto', result.rows[0]); // pasta antiga ou dentro da obra
  res.json({ mensagem: 'Análise removida (a pasta foi movida para _Excluídos)' });
}

// Gera o relatório de compatibilização em PDF a partir do que está salvo no
// banco (não do que o navegador tem em memória) — sempre reflete a última
// versão persistida, inclusive edições feitas antes de navegar pra outra tela.
async function gerarRelatorio(req, res, next) {
  const { id } = req.params;
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

  // cópia na pasta do projeto (sobrescreve a versão anterior)
  await seguro(`relatório análise ${id}`, async () => P.gravarArquivo(await pastaDoProjeto(result.rows[0]), 'Relatório de compatibilização.pdf', pdf));

  const nomeCliente = String(analise.nomeProjeto || analise.cliente || 'projeto').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': contentDisposition(`Compatibilização_${nomeCliente}.pdf`),
  });
  res.send(pdf);
}

// Pasta do projeto: caminho e arquivos (cria/renomeia se preciso).
// pasta da análise e "abrir no Explorer": as mesmas rotas de pasta de todo registro (pastasRegistros.rotasDePasta)
const { pasta, abrirPasta } = rotasDePasta({
  carregar: async (id) => (await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [id])).rows[0] || null,
  pastaDe: pastaDoProjeto,
  naoEncontrado: 'Análise não encontrada',
});

module.exports = {
  listar, buscarUma, analisar, atualizar, remover, gerarRelatorio, pasta, abrirPasta, arquivoInvalido, executarAnalise,
};
