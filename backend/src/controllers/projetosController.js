const { gerarPdfDeHtml } = require('../services/pdfPuppeteer');
const pool = require('../config/database');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const { registrarAuditoria } = require('../services/auditoria');
const { analisarProjetoCompleto } = require('../services/compatibilizacaoAnalise');
const { gerarHtmlRelatorioCompatibilizacao } = require('../utils/relatorioCompatibilizacaoTemplate');
const { gerarFooterTemplate } = require('../utils/pdfTemplate');
const { normalizarDisciplinas } = require('../utils/disciplinasProjeto');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');
const { comTransacao } = require('../services/transacao');
const { hojeBrasilia } = require('../utils/dataHoje');
const { calcularTotais } = require('../utils/calculoProposta');
const { validarProposta } = require('../utils/validacaoProposta');
const { inserirSecoesEItens, proximoNumero, registrarEvento } = require('./propostasController');
const P = require('../services/pastasSistema');
const { tipoPorConteudo } = require('../utils/tipoArquivo');
const { versaoDoPedido, responderConflitoOuAusente } = require('../utils/versao');
const { sincronizarProjeto, pastaDoProjeto, seguro, excluirPastaDoItem, rotasDePasta } = require('../services/pastasRegistros');
const { lerObraId, conferirObra, sqlObraJson } = require('../utils/obras');
const { lerFinalidade } = require('../utils/projetoLaudo');
const { ehArquivoCad } = require('../services/analiseCad');
const Pacotes = require('../services/pacotesProjeto');

// DWG começa pela versão (AC10xx); DXF de texto, por "0 SECTION"
const ehConteudoCad = (buf) => /^AC10\d\d$/.test(buf.subarray(0, 6).toString('latin1')) || /^\s*0\s*\r?\n\s*SECTION/.test(buf.subarray(0, 200).toString('latin1'));
// o leitor do multipart entrega o nome em latin1 ("ElÃ©trica"); só converte se virar UTF-8 válido
const nomeUtf8 = (n) => { const u = Buffer.from(String(n), 'latin1').toString('utf8'); return u.includes('\uFFFD') ? n : u; };
const path = require('path');

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

// 2.3: obra/análise na pasta do cliente (pasta_base, relativa à raiz dos clientes no servidor)
const naRaizDosClientes = (...partes) => path.join(P.RAIZ_CLIENTES_SERVIDOR, ...partes.flatMap(p => String(p).split('/')).filter(Boolean));
function caminhoDaPasta(row) {
  if (!row.pasta) return null;
  if (row.pasta_obra_id) {
    if (!row.pasta_obra_dir) return null;
    return row.pasta_obra_base ? naRaizDosClientes(row.pasta_obra_base, row.pasta_obra_dir, row.pasta) : path.join(P.RAIZES.obra, row.pasta_obra_dir, row.pasta);
  }
  return row.pasta_base ? naRaizDosClientes(row.pasta_base, row.pasta) : P.caminhoDe('projeto', row.pasta);
}

// Converte uma linha de analises_projeto (colunas snake_case, JSONB já
// parseado pelo driver do pg) para o mesmo formato camelCase que o restante
// do pipeline (analisarProjetoCompleto, o template do relatório e o
// frontend) já usa.
function linhaParaAnalise(row) {
  return {
    id: row.id,
    cliente: row.cliente_nome,
    // Nome do projeto = nome da pasta em "Arquivos do Sistema/Projetos" (editável na tela)
    nomeProjeto: row.nome_projeto,
    finalidade: row.finalidade || 'orcamento',
    caminhoPasta: caminhoDaPasta(row),
    // Obra (2.0): obraId + obra { id, codigo, nome, status } quando a consulta faz o JOIN
    obraId: row.obra_id ?? null,
    obra: row.obra ?? null,
    clienteId: row.cliente_id,
    disciplinas: row.disciplinas,
    arquivosAnalisados: row.arquivos_analisados,
    ambientes: row.ambientes,
    pontosPorAmbiente: row.pontos_por_ambiente,
    // Enriquecimento do Claude Desktop (visão do PDF) — só das disciplinas escolhidas.
    funcionamento: row.funcionamento,
    pontosPorDisciplina: row.pontos_por_disciplina,
    cameras: row.cameras,
    pontosRedeAntena: row.pontos_rede_antena,
    tabelaCabos: row.tabela_cabos,
    achados: row.achados,
    servicos: row.servicos,
    materiais: row.materiais,
    // Por arquivo: carimbo, quadros de carga, listas de materiais, disciplinas detectadas
    dadosExtraidos: row.dados_extraidos,
    // 2.3: compatibilização por posição entre os DWG/DXF (utils/compatibilidadeEspacial.js)
    conflitos: row.conflitos || [],
    compatibilizacao: row.compatibilizacao || null,
    // Proposta gerada a partir desta análise (botão "Gerar Orçamento"), se
    // já existir — o número só vem quando a consulta faz o LEFT JOIN com
    // propostas (buscarUma); nas demais fica undefined, sem problema.
    propostaId: row.proposta_id,
    propostaNumero: row.proposta_numero,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    versao: row.versao,
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

// ── Pacote de arquivos (2.3) — services/pacotesProjeto.js ──────────────────
// POST /projetos/pacotes: arquivos soltos, de uma pasta (o nome vem com a pasta
// relativa) ou ZIP → { token, arquivos com a disciplina sugerida, ignorados }
async function receberPacote(req, res) {
  if (!req.files?.length) return res.status(400).json({ erro: 'Envie os arquivos, a pasta ou o ZIP do projeto (PDF, DWG, DXF ou ZIP).' });
  const recebidos = req.files.map((f) => {
    const caminho = nomeUtf8(f.originalname).replace(/\\/g, '/').replace(/^\/+|(^|\/)\.\.(\/|$)/g, '').slice(-400);
    return { originalname: caminho.split('/').pop(), buffer: f.buffer, path: f.path, caminho: caminho.includes('/') ? caminho : null };
  });
  res.status(201).json(await Pacotes.receberPacote(recebidos, req.usuario));
}

// POST /projetos/pacotes/:token/analisar { arquivos: [{ id, disciplinas, referencia, tipoReferencia }], finalidade, obra_id, nome_projeto }
async function analisarPacote(req, res) {
  const escolhas = Array.isArray(req.body?.arquivos) ? req.body.arquivos : [];
  if (!escolhas.length) return res.status(400).json({ erro: 'Escolha os arquivos do pacote a analisar.' });
  const normalizadas = escolhas.map(e => ({ ...e, referencia: e.referencia === true, disciplinas: e.referencia === true ? [] : normalizarDisciplinas(e.disciplinas) }));
  if (normalizadas.some(e => !e.referencia && !e.disciplinas.length)) {
    return res.status(400).json({ erro: 'Cada arquivo precisa de ao menos uma disciplina, ou ser marcado como referência (arquitetura, estrutura, hidráulica, climatização).' });
  }
  if (!normalizadas.some(e => !e.referencia)) return res.status(400).json({ erro: 'Marque a disciplina de ao menos um arquivo: só arquivos de referência não geram análise.' });
  let arquivos;
  try {
    arquivos = Pacotes.arquivosDoPacote(req.params.token, req.usuario, normalizadas);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ erro: err.message });
    throw err;
  }
  const invalido = arquivoInvalido(arquivos);
  if (invalido) return res.status(400).json({ erro: invalido });
  // nomes repetidos em pastas diferentes do pacote: o nome leva a pasta (a pasta do projeto guarda todos)
  const vistos = new Map();
  for (const a of arquivos) vistos.set(a.nomeArquivo, (vistos.get(a.nomeArquivo) || 0) + 1);
  for (const a of arquivos) if (vistos.get(a.nomeArquivo) > 1 && a.caminho) a.nomeArquivo = a.caminho.replace(/[\\/]+/g, ' - ').replace(/[:*?"<>|]+/g, '_').slice(-180);
  // sem nome de projeto: vale o nome da pasta/ZIP enviado (todos os arquivos vieram dele)
  const corpo = { ...(req.body || {}) };
  const emPasta = arquivos.every(a => String(a.caminho || '').includes('/'));
  const raizes = [...new Set(arquivos.map(a => String(a.caminho || '').split('/')[0]))];
  if (!String(corpo.nome_projeto || '').trim()) {
    let sugerido = null;
    try { sugerido = Pacotes.manifesto(req.params.token, req.usuario).nome_sugerido; } catch { /* sem manifesto: usa a pasta */ }
    if (sugerido) corpo.nome_projeto = String(sugerido).slice(0, 200);
    else if (emPasta && raizes.length === 1) corpo.nome_projeto = raizes[0].replace(/\.zip$/i, '').trim().slice(0, 200);
  }
  const ok = await executarAnalise(req, res, arquivos, corpo);
  if (ok) Pacotes.descartarPacote(req.params.token, req.usuario);
}

// DELETE /projetos/pacotes/:token
async function descartarPacote(req, res) {
  Pacotes.descartarPacote(req.params.token, req.usuario);
  res.status(204).end();
}

// GET /projetos/analises/:id/compatibilizacao-dxf — arquitetura de referência + conflitos marcados
async function compatibilizacaoDxf(req, res) {
  const { rows: [an] } = await pool.query('SELECT id, nome_projeto, cliente_nome, conflitos FROM analises_projeto WHERE id = $1', [req.params.id]);
  if (!an) return res.status(404).json({ erro: 'Análise não encontrada.' });
  const { rows: [arq] } = await pool.query('SELECT conteudo FROM analises_projeto_arquitetura WHERE analise_id = $1', [an.id]);
  if (!arq) return res.status(400).json({ erro: 'Esta análise não tem desenho DWG/DXF de referência: a compatibilização por posição precisa dos DWG/DXF do projeto.' });
  // em thread à parte: ler a arquitetura de referência inteira levava segundos de CPU
  const { dxfCompatibilizacaoNoWorker } = require('../services/tarefasCad');
  const nomeProj = String(an.nome_projeto || an.cliente_nome || 'Projeto').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80);
  const dxf = await dxfCompatibilizacaoNoWorker({ dxfReferencia: arq.conteudo.toString('utf8'), conflitos: an.conflitos || [], titulo: `COMPATIBILIZAÇÃO — ${nomeProj.toUpperCase()}` });
  const nome = `Compatibilização - ${nomeProj}.dxf`;
  res.set({ 'Content-Type': 'application/dxf', 'Content-Disposition': contentDisposition(nome), 'X-Nome-Arquivo': encodeURIComponent(nome) });
  res.send(Buffer.from(dxf, 'utf8'));
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

// Gera (ou atualiza, se já existir) uma proposta rascunho na aba Orçamentos a
// partir do que está salvo na análise — é daqui que o orçamento é concluído
// (BDI, impostos, itens "a cotar" revisados, etc.), a análise só entrega o
// ponto de partida. Botão explícito na tela ("Gerar Orçamento"), nunca
// automático — analisar de novo/editar não cria propostas sozinho.
async function gerarOrcamento(req, res, next) {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [id]);
  if (result.rows.length === 0) return res.status(404).json({ erro: 'Análise não encontrada' });
  const analise = linhaParaAnalise(result.rows[0]);

  if (!analise.cliente || !analise.cliente.trim()) {
    return res.status(400).json({ erro: 'Preencha o nome do cliente na análise antes de gerar o orçamento' });
  }

  // Itens marcados como "já pronto" não fazem parte do escopo orçado —
  // mesmo critério que já vale pro relatório de compatibilização.
  // Itens com quantidade 0 (modelo da disciplina ainda não conferido na
  // planta) também ficam de fora: entravam como "a cotar" com quantidade 0 e
  // poluíam o orçamento. A resposta diz quantos ficaram de fora.
  const temQtd = (x) => Number(x.quantidade) > 0;
  const servicosParaOrcar = (analise.servicos || []).filter(s => !s.pronto && temQtd(s));
  const materiaisParaOrcar = (analise.materiais || []).filter(m => !m.pronto && temQtd(m));
  const semQuantidade = [...(analise.servicos || []), ...(analise.materiais || [])].filter(x => !x.pronto && !temQtd(x)).length;
  if (servicosParaOrcar.length === 0 && materiaisParaOrcar.length === 0) {
    return res.status(400).json({ erro: 'Não há serviços nem materiais a orçar (itens marcados como "já pronto" ou com quantidade 0)' });
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
      codigo: s.codigo || null,
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
      // preço adotado da pesquisa de mercado (botão "Usar") tem prioridade sobre o catálogo
      valor_unitario: Number(m.preco_unitario) > 0 ? Number(m.preco_unitario) : (m.preco_catalogo || 0),
      subgrupo: m.subgrupo || null,
      // preço 0 no catálogo (padrão da coluna) não é preço: antes saía "confirmado" a R$ 0
      status: (Number(m.quantidade) > 0 && (Number(m.preco_unitario) > 0 || Number(m.preco_catalogo) > 0)) ? 'confirmado' : 'a_cotar',
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

  const montarEscopo = (temVinculo) => `Gerado automaticamente a partir da Análise de Projeto #${analise.id}` +
    (temVinculo ? ' (atualizado — itens substituídos pela versão mais recente da análise).' : '.') +
    ' Revise quantidades, preços e os itens marcados "A cotar" antes de enviar ao cliente.';
  const dataHoje = hojeBrasilia(); // toISOString daria amanhã depois das 21h

  const erroValidacao = validarProposta({ data: dataHoje, cliente_nome: analise.cliente.trim(), secoes, itens });
  if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

  const resultadoTx = await comTransacao(async (client) => {
    // Trava a análise e relê o vínculo DENTRO da transação: com o vínculo
    // lido antes (fora dela), dois cliques em "Gerar orçamento" criavam duas
    // propostas. Agora o segundo espera o primeiro terminar e atualiza a
    // proposta que ele criou (revisão de 27/10/2026).
    const trava = await client.query('SELECT proposta_id FROM analises_projeto WHERE id = $1 FOR UPDATE', [analise.id]);
    if (!trava.rows.length) return null;
    const vinculadaId = trava.rows[0].proposta_id || null;
    const escopo = montarEscopo(!!vinculadaId);
    // Proposta vinculada: só é atualizada enquanto estiver "Ativa" — aprovada ou
    // recusada fica intacta e uma proposta NOVA é criada (antes a aprovada era
    // sobrescrita). Ao atualizar, mantém BDI e impostos que já estavam nela
    // (antes o total era recalculado com BDI/impostos zerados).
    const vinculadaInfo = vinculadaId
      ? (await client.query('SELECT numero, status, bdi, bdi_materiais, imposto_venda, imposto_servico FROM propostas WHERE id = $1 FOR UPDATE', [vinculadaId])).rows[0]
      : null;
    const atualizarVinculada = !!vinculadaInfo && vinculadaInfo.status === 'Ativa';
    const totais = calcularTotais({ secoes, itens,
      bdi: atualizarVinculada ? Number(vinculadaInfo.bdi) || 0 : 0,
      bdi_materiais: atualizarVinculada ? vinculadaInfo.bdi_materiais : null, // BDI diferenciado (2.0, Fase 3F) também é mantido
      imposto_venda: atualizarVinculada ? Number(vinculadaInfo.imposto_venda) || 0 : 0,
      imposto_servico: atualizarVinculada ? Number(vinculadaInfo.imposto_servico) || 0 : 0 });

    if (atualizarVinculada) {
      await client.query(
        `UPDATE propostas SET
          data=$1, cliente_id=$2, cliente_nome=$3, responsavel=$4, escopo=$5,
          subtotal_materiais=$6, subtotal_mao_obra=$7, valor_bdi=$8,
          valor_imposto_venda=$9, valor_imposto_servico=$10, total=$11, atualizado_em=NOW(), versao=versao+1,
          obra_id=COALESCE(obra_id, $13)
         WHERE id=$12`,
        [dataHoje, clienteId, analise.cliente.trim(), req.usuario.nome, escopo,
         totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
         totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total, vinculadaId, analise.obraId]
      );
      await client.query('DELETE FROM proposta_secoes WHERE proposta_id = $1', [vinculadaId]);
      await inserirSecoesEItens(client, vinculadaId, secoes, itens);
      await registrarEvento(client, vinculadaId, req.usuario.id, 'editada', `Atualizada a partir da Análise de Projeto #${analise.id}`);
      return { propostaId: vinculadaId, numero: vinculadaInfo.numero, criada: false };
    }
    // sem vínculo, ou a proposta vinculada foi excluída/aprovada/recusada: cria uma nova

    const seq = await proximoNumero(client);
    const numeroGerado = 'P' + String(seq).padStart(3, '0');
    const propResult = await client.query(
      `INSERT INTO propostas (
        numero, sequencial, data, validade, cliente_id, cliente_nome, responsavel, escopo,
        bdi, imposto_venda, imposto_servico, subtotal_materiais, subtotal_mao_obra, valor_bdi,
        valor_imposto_venda, valor_imposto_servico, total, usuario_id, obra_id, origem_tipo, origem_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'analise',$20)
      RETURNING id`,
      [numeroGerado, seq, dataHoje, 5, clienteId, analise.cliente.trim(), req.usuario.nome, escopo,
       0, 0, 0, totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
       totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total, req.usuario.id,
       analise.obraId, analise.id] // a proposta herda a obra da análise e guarda a origem
    );
    const novaPropostaId = propResult.rows[0].id;
    await inserirSecoesEItens(client, novaPropostaId, secoes, itens);
    await registrarEvento(client, novaPropostaId, req.usuario.id, 'criada', `Proposta ${numeroGerado} criada a partir da Análise de Projeto #${analise.id}`);
    await client.query('UPDATE analises_projeto SET proposta_id = $1 WHERE id = $2', [novaPropostaId, analise.id]);
    return { propostaId: novaPropostaId, numero: numeroGerado, criada: true };
  });
  if (!resultadoTx) return res.status(404).json({ erro: 'Análise não encontrada' });
  const { propostaId, numero, criada } = resultadoTx;

  const aviso = semQuantidade ? ` (${semQuantidade} item(ns) com quantidade 0 ficaram de fora — preencha na análise se fizerem parte)` : '';
  res.json({
    propostaId, numero, criada, semQuantidade,
    mensagem: (criada ? `Orçamento ${numero} criado a partir desta análise` : `Orçamento ${numero} atualizado com os itens desta análise`) + aviso,
  });
}

module.exports = {
  listar, buscarUma, analisar, atualizar, remover, gerarRelatorio, gerarOrcamento, pasta, abrirPasta,
  receberPacote, analisarPacote, descartarPacote, compatibilizacaoDxf, linhaParaAnalise,
};
