const fs = require('fs');
const os = require('os');
const path = require('path');
const pool = require('../config/database');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const { registrarAuditoria } = require('../utils/auditoria');
const { listarDisciplinas, motorDaDisciplina, cad, tiposDocumento, entrega } = require('../utils/disciplinasLaudo');
const { lerTipoRegistro, lerPedidoEntrega, ENTREGAS } = require('../utils/projetoLaudo');
const { gerarPdfDeHtml } = require('../utils/pdfPuppeteer');
const { gerarFooterTemplate } = require('../utils/pdfTemplate');
const { gerarHtmlFolhaEntrega } = require('../utils/folhaEntregaTemplate');
const { compararComCatalogo } = require('../utils/compatibilizacaoAnalise');
const { comTransacao } = require('../utils/transacao');
const { hojeBrasilia } = require('../utils/dataHoje');
const { calcularTotais } = require('../utils/calculoProposta');
const { validarProposta } = require('../utils/validacaoProposta');
const { inserirSecoesEItens, proximoNumero, registrarEvento } = require('./propostasController');
const { classificarPendentesEmSegundoPlano } = require('../services/classificacaoMateriais');
const P = require('../utils/pastasSistema');
const { tipoPorConteudo } = require('../utils/tipoArquivo');
const { versaoDoPedido, responderConflitoOuAusente } = require('../utils/versao');
const { dadosDaAnalise, tipoAmbiente } = require('../utils/ponteAnaliseSkill');
const { buscarPrecosReferencia, segmentoDoCliente } = require('../utils/precosMaoDeObraReferencia');
const { sincronizarLaudo, pastaDoLaudo, resumoPasta, pedidoLocal, seguro, caminhoRegistrado, excluirPastaDoItem } = require('../services/pastasRegistros');
const { lerObraId, conferirObra, sqlObraJson } = require('../utils/obras');
const { lerArquiteturaNoWorker, mensagemDaLeitura, resumoDaArquitetura, dxfParaGuardar, faltouEscala, gerarPlantaNoWorker } = require('../services/tarefasCad');

// Projetos e laudos por disciplina (hub Obras → "Projetos por disciplina" e
// "Laudos"). O cálculo e os documentos vêm da skill da disciplina
// (utils/disciplinasLaudo.js) — o mesmo motor que o Claude Code usa, então
// tela e skill sempre batem.
//
// Versão 2.1: cada registro de laudos_projetos é OU um projeto OU um laudo
// (coluna `tipo`). O projeto gera só os documentos de projeto, os desenhos, as
// entregas e o orçamento de execução; o laudo gera só os documentos de laudo e
// o orçamento de inspeção/correção (classificação em
// skills/_comum/tipos-documento.js). Laudo nunca nasce de análise de projeto:
// /laudos/de-analise cria um PROJETO.

const TAMANHO_MAX_DADOS = 2 * 1024 * 1024; // o formulário é texto; 2 MB é muita folga
const TIPOS_FOTO = { 'image/jpeg': 'jpg', 'image/png': 'png' };

function tituloDe(dados) {
  return (dados?.obra?.nome || dados?.meta?.titulo || dados?.cliente?.nome || 'Sem título').toString().slice(0, 200);
}

async function carregarLaudo(id) {
  const { rows } = await pool.query('SELECT * FROM laudos_projetos WHERE id = $1', [id]);
  return rows[0] || null;
}

// O documento/desenho/modo de orçamento serve a este registro (projeto ou laudo)?
// Senão, erro 400 com o caminho certo.
function conferirUso(laudo, uso, oque) {
  if (tiposDocumento().serve(uso, laudo.tipo)) return null;
  return laudo.tipo === 'laudo'
    ? `${oque} é de projeto — este registro é um LAUDO. Abra (ou crie) o projeto da disciplina na aba "Projetos por disciplina".`
    : `${oque} é de laudo — este registro é um PROJETO. Laudo é pedido quando necessário: crie em "Laudos" › "Novo laudo".`;
}
const nomeDoTipo = (laudo) => (laudo?.tipo === 'projeto' ? 'Projeto' : 'Laudo');

function processarComMotor(motor, dados) {
  try {
    return motor.processar(dados);
  } catch (e) {
    const err = new Error(`Dados incompletos ou inválidos: ${e.message}`);
    err.status = 400;
    throw err;
  }
}

// ── Disciplinas e modelos ───────────────────────────────────────────────────

async function disciplinas(req, res) {
  res.json(listarDisciplinas());
}

async function modelo(req, res) {
  const motor = motorDaDisciplina(req.params.disciplina);
  res.json({ modelo: motor.modeloVazio(), exemplo: motor.exemplo(), checklistBase: motor.checklistBase, formulario: motor.formulario || null });
}

// ── CRUD ────────────────────────────────────────────────────────────────────

const LIMITE_LISTA_LAUDOS = 300;
async function listar(req, res) {
  const params = [];
  const cond = [];
  if (req.query.disciplina) {
    params.push(String(req.query.disciplina));
    cond.push(`l.disciplina = $${params.length}`);
  }
  // ?tipo=projeto|laudo (2.1); ausente = todos
  if (req.query.tipo) {
    const tipo = lerTipoRegistro(req.query.tipo, null);
    if (!tipo) return res.status(400).json({ erro: 'Tipo inválido (projeto ou laudo).' });
    params.push(tipo);
    cond.push(`l.tipo = $${params.length}`);
  }
  // ?analise_id=ID: projetos elaborados a partir de uma análise
  if (req.query.analise_id) {
    const n = Number(req.query.analise_id);
    if (!Number.isInteger(n) || n < 1) return res.status(400).json({ erro: 'Análise inválida.' });
    params.push(n);
    cond.push(`l.analise_id = $${params.length}`);
  }
  // ?obra_id=ID (laudos da obra) ou ?obra_id=sem (sem obra)
  if (req.query.obra_id === 'sem') cond.push('l.obra_id IS NULL');
  else if (req.query.obra_id) {
    const n = Number(req.query.obra_id);
    if (!Number.isInteger(n) || n < 1) return res.status(400).json({ erro: 'Obra inválida.' });
    params.push(n);
    cond.push(`l.obra_id = $${params.length}`);
  }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT l.id, l.tipo, l.disciplina, l.titulo, l.cliente_nome, l.propostas, l.gerar_orcamento, l.atualizado_em,
            l.dados->'meta'->>'revisao' AS revisao, u.nome AS usuario_nome,
            (SELECT count(*)::int FROM laudos_projetos_fotos f WHERE f.laudo_id = l.id) AS total_fotos,
            l.obra_id, l.analise_id, ${sqlObraJson('ob')} AS obra
       FROM laudos_projetos l LEFT JOIN usuarios u ON u.id = l.usuario_id
       LEFT JOIN obras ob ON ob.id = l.obra_id
       ${where}
      ORDER BY l.atualizado_em DESC LIMIT ${LIMITE_LISTA_LAUDOS + 1}`,
    params
  );
  // Lista cortada: antes sumia em silêncio o que passasse de 300. A resposta
  // continua sendo a lista (a tela não muda), com o aviso nos cabeçalhos.
  if (rows.length > LIMITE_LISTA_LAUDOS) {
    rows.length = LIMITE_LISTA_LAUDOS;
    res.set({ 'X-Lista-Truncada': '1', 'X-Limite-Lista': String(LIMITE_LISTA_LAUDOS) });
  }
  res.json(rows);
}

async function buscarUm(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const fotos = await pool.query(
    'SELECT id, nome_arquivo, mime, octet_length(conteudo) AS tamanho FROM laudos_projetos_fotos WHERE laudo_id = $1 ORDER BY id',
    [laudo.id]
  );
  const obra = laudo.obra_id ? (await pool.query(`SELECT ${sqlObraJson('o')} AS obra FROM obras o WHERE o.id = $1`, [laudo.obra_id])).rows[0]?.obra || null : null;
  res.json({ ...laudo, obra, fotos: fotos.rows, caminhoPasta: await caminhoRegistrado('laudo', laudo) });
}

function validarDados(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return 'Envie o formulário (dados) como objeto.';
  if (JSON.stringify(dados).length > TAMANHO_MAX_DADOS) return 'Formulário acima do tamanho permitido (2 MB).';
  return null;
}

async function criar(req, res) {
  const { disciplina } = req.body;
  const motor = motorDaDisciplina(disciplina);
  const dados = req.body.dados || motor.modeloVazio();
  const erro = validarDados(dados);
  if (erro) return res.status(400).json({ erro });
  const gerarOrc = req.body.gerar_orcamento !== false;
  // tipo (2.1): 'projeto' ou 'laudo' — ausente = laudo (o "Novo laudo" de sempre)
  const tipo = lerTipoRegistro(req.body.tipo);
  if (!tipo) return res.status(400).json({ erro: 'Tipo inválido (projeto ou laudo).' });
  // obra (2.0): registro novo ligado à obra → pasta em Obras\<obra>\Laudos\<disciplina>
  // (laudo) ou Obras\<obra>\Projetos\<disciplina> (projeto)
  const leituraObra = lerObraId(req.body);
  const erroObra = await conferirObra(pool, leituraObra, { usuario: req.usuario });
  if (erroObra) return res.status(400).json({ erro: erroObra });
  const { rows } = await pool.query(
    `INSERT INTO laudos_projetos (disciplina, titulo, cliente_nome, dados, usuario_id, gerar_orcamento, obra_id, tipo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [disciplina, tituloDe(dados), dados.cliente?.nome || null, dados, req.usuario.id, gerarOrc, leituraObra.valor, tipo]
  );
  await sincronizarLaudo(rows[0]); // cria Arquivos do Sistema\Laudos|Projetos\<nome> (ou a pasta na obra) com os dados
  res.status(201).json({ id: rows[0].id, tipo });
}

// Cria o PROJETO de uma disciplina a partir de uma Análise de Projeto (PDF já
// lido) — "Elaborar projeto da disciplina" / "Dimensionar pela norma": o
// formulário da skill nasce preenchido com o que o PDF tem (ambientes,
// câmeras, pontos, quadro de cargas, carimbo) e a lista do que foi estimado e
// precisa de conferência. Body: { analise_id, disciplina }.
// Versão 2.1: sempre tipo 'projeto' — análise nunca gera laudo. Se a análise
// já tem o projeto desta disciplina, devolve o existente (existente: true) em
// vez de criar outro.
async function criarDeAnalise(req, res) {
  const { disciplina } = req.body;
  const analiseId = Number(req.body.analise_id);
  if (!Number.isInteger(analiseId) || analiseId < 1) return res.status(400).json({ erro: 'Informe a análise de origem.' });
  const motor = motorDaDisciplina(disciplina);
  const { rows: [linha] } = await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [analiseId]);
  if (!linha) return res.status(404).json({ erro: 'Análise não encontrada.' });
  const { rows: [jaExiste] } = await pool.query(
    "SELECT id FROM laudos_projetos WHERE analise_id = $1 AND disciplina = $2 AND tipo = 'projeto' ORDER BY id LIMIT 1", [analiseId, disciplina]);
  if (jaExiste && req.body.novo !== true) return res.json({ id: jaExiste.id, tipo: 'projeto', existente: true, avisos: [] });
  // obra (2.0): herda a obra da análise de origem (obra_id no corpo tem prioridade)
  // e guarda de qual análise veio (analise_id)
  const leituraObra = lerObraId(req.body);
  const erroObra = await conferirObra(pool, leituraObra, { usuario: req.usuario });
  if (erroObra) return res.status(400).json({ erro: erroObra });
  let obraId = leituraObra.presente ? leituraObra.valor : (linha.obra_id || null);
  // herdada da análise: só se este usuário puder ligar itens àquela obra
  if (!leituraObra.presente && obraId
    && await conferirObra(pool, { presente: true, valor: obraId }, { usuario: req.usuario })) obraId = null;
  const obra = obraId ? (await pool.query('SELECT nome, local, cliente_nome FROM obras WHERE id = $1', [obraId])).rows[0] || null : null;
  const analise = {
    cliente: linha.cliente_nome, nomeProjeto: linha.nome_projeto, obra, ambientes: linha.ambientes,
    pontosPorAmbiente: linha.pontos_por_ambiente, cameras: linha.cameras, pontosRedeAntena: linha.pontos_rede_antena,
    dadosExtraidos: linha.dados_extraidos,
  };
  const { dados, avisos } = dadosDaAnalise(disciplina, motor, analise);
  const erro = validarDados(dados);
  if (erro) return res.status(400).json({ erro });
  // confere já que o cálculo roda com os dados mapeados (erro vira aviso, o formulário corrige)
  try { motor.processar(dados); } catch (e) { avisos.push(`O cálculo ainda não fecha com os dados lidos: ${e.message}`); }
  const { rows } = await pool.query(
    `INSERT INTO laudos_projetos (disciplina, titulo, cliente_nome, dados, usuario_id, gerar_orcamento, obra_id, analise_id, cliente_id, tipo)
     VALUES ($1,$2,$3,$4,$5,true,$6,$7,$8,'projeto') RETURNING *`,
    [disciplina, tituloDe(dados), dados.cliente?.nome || null, dados, req.usuario.id, obraId, linha.id, linha.cliente_id || null]
  );
  // arquitetura enviada na análise (2.3, para o 3D) vale para o projeto: planta e 3D já saem
  await pool.query(
    `INSERT INTO laudos_projetos_arquitetura (laudo_id, nome_arquivo, conteudo, resumo, usuario_id)
     SELECT $1, nome_arquivo, conteudo, resumo, $2 FROM analises_projeto_arquitetura WHERE analise_id = $3
     ON CONFLICT (laudo_id) DO NOTHING`, [rows[0].id, req.usuario.id, linha.id]);
  await sincronizarLaudo(rows[0]);
  res.status(201).json({ id: rows[0].id, tipo: 'projeto', avisos });
}

async function atualizar(req, res) {
  const { dados } = req.body;
  const erro = validarDados(dados);
  if (erro) return res.status(400).json({ erro });
  // gerar_orcamento: false = "só laudo" (sem orçamento de material); ausente mantém o atual
  const gerarOrc = typeof req.body.gerar_orcamento === 'boolean' ? req.body.gerar_orcamento : null;
  // obra (2.0): obra_id presente liga/desliga (null); ausente mantém
  const leituraObra = lerObraId(req.body);
  const erroObra = await conferirObra(pool, leituraObra, { usuario: req.usuario, tabela: 'laudos_projetos', id: req.params.id });
  if (erroObra) return res.status(400).json({ erro: erroObra });
  const { rows } = await pool.query(
    `UPDATE laudos_projetos SET dados = $1, titulo = $2, cliente_nome = $3, gerar_orcamento = COALESCE($5, gerar_orcamento),
            obra_id = CASE WHEN $7::boolean THEN $8::int ELSE obra_id END,
            atualizado_em = NOW(), versao = versao + 1
      WHERE id = $4 AND ($6::int IS NULL OR versao = $6) RETURNING *`,
    [dados, tituloDe(dados), dados.cliente?.nome || null, req.params.id, gerarOrc, versaoDoPedido(req.body), leituraObra.presente, leituraObra.valor]
  );
  if (!rows[0]) return responderConflitoOuAusente(pool, res, 'laudos_projetos', req.params.id);
  // pasta acompanha o nome do laudo (renomeia) e "Dados do laudo.json" é sobrescrito
  const pasta = await sincronizarLaudo(rows[0]);
  res.json({ ok: true, atualizado_em: new Date(), versao: rows[0].versao, caminhoPasta: pasta, gerar_orcamento: rows[0].gerar_orcamento });
}

// Fotos da inspeção e arquitetura ficam SÓ no banco (laudos_projetos_fotos e
// laudos_projetos_arquitetura, apagadas em cascata com o registro). Antes de
// excluir, uma cópia vai para a pasta do registro — que depois vai inteira para
// _Excluídos. Sem a cópia, a exclusão apagava as fotos de vez (a auditoria só
// guardava o formulário). Devolve o que foi copiado (para a auditoria).
const EXT_FOTO = { 'image/jpeg': 'jpg', 'image/png': 'png' };
async function copiarAnexosParaPasta(laudo) {
  const { rows: fotos } = await pool.query('SELECT id, nome_arquivo, mime, conteudo FROM laudos_projetos_fotos WHERE laudo_id = $1 ORDER BY id', [laudo.id]);
  const { rows: [arq] } = await pool.query('SELECT nome_arquivo, conteudo, resumo FROM laudos_projetos_arquitetura WHERE laudo_id = $1', [laudo.id]);
  if (!fotos.length && !arq) return { fotos: [], arquitetura: null, pasta: null };
  const pasta = await pastaDoLaudo(laudo);
  if (!pasta) throw new Error('a pasta do registro não está disponível');
  const copiadas = [];
  for (const f of fotos) {
    const nome = `${f.id} - ${f.nome_arquivo || `foto.${EXT_FOTO[f.mime] || 'bin'}`}`;
    await P.gravarArquivo(path.join(pasta, 'Fotos (cópia ao excluir)'), nome, f.conteudo);
    copiadas.push({ id: f.id, nome_arquivo: f.nome_arquivo, mime: f.mime, bytes: f.conteudo.length });
  }
  let arquitetura = null;
  if (arq) {
    // DWG é guardado já convertido em DXF (texto): a cópia sai como .dxf
    const nome = String(arq.nome_arquivo || 'arquitetura').replace(/\.dwg$/i, '.dxf');
    await P.gravarArquivo(path.join(pasta, 'Arquitetura (cópia ao excluir)'), nome, arq.conteudo);
    arquitetura = { nome_arquivo: arq.nome_arquivo, bytes: arq.conteudo.length, resumo: arq.resumo };
  }
  return { fotos: copiadas, arquitetura, pasta };
}

async function remover(req, res) {
  const { rows: [atual] } = await pool.query('SELECT * FROM laudos_projetos WHERE id = $1', [req.params.id]);
  if (!atual) return res.json({ ok: true });
  let copia;
  try {
    copia = await copiarAnexosParaPasta(atual);
  } catch (e) {
    console.error(`Exclusão do laudo ${atual.id} recusada: cópia das fotos/arquitetura falhou:`, e.message);
    return res.status(409).json({ erro: 'Não foi possível guardar uma cópia das fotos e da arquitetura deste registro na pasta dele antes de excluir — nada foi excluído. Confira se a pasta está acessível (e não está aberta em outro programa) e tente de novo.' });
  }
  // DELETE e auditoria juntos: ou some com o registro na auditoria, ou não some
  const rows = await comTransacao(async (client) => {
    // trava o registro: foto enviada agora espera a exclusão terminar (e não fica sem cópia)
    await client.query('SELECT id FROM laudos_projetos WHERE id = $1 FOR UPDATE', [atual.id]);
    const { rows: novas } = await client.query('SELECT count(*)::int AS n FROM laudos_projetos_fotos WHERE laudo_id = $1 AND NOT (id = ANY($2::int[]))', [atual.id, copia.fotos.map(f => f.id)]);
    if (novas[0].n > 0) throw Object.assign(new Error('Chegaram fotos novas neste registro enquanto ele era excluído — nada foi excluído. Tente de novo.'), { status: 409 });
    const { rows: apagados } = await client.query('DELETE FROM laudos_projetos WHERE id = $1 RETURNING *', [atual.id]);
    // o formulário inteiro e a lista do que foi copiado para a pasta vão para a
    // auditoria (obrigatória: se ela falhar, nada é excluído)
    if (apagados[0]) {
      await registrarAuditoria(client, { entidade: 'laudos_projetos', entidadeId: apagados[0].id, acao: 'excluir', usuarioId: req.usuario.id,
        detalhes: { laudo: apagados[0], fotos_copiadas: copia.fotos, arquitetura_copiada: copia.arquitetura, copia_na_pasta: copia.pasta },
        obrigatoria: true });
    }
    return apagados;
  });
  // a pasta não é apagada: vai para Arquivos do Sistema\_Excluídos (com as cópias)
  if (rows[0]) await excluirPastaDoItem('laudo', rows[0]); // pasta antiga ou dentro da obra
  res.json({ ok: true });
}

// ── Cálculo e documentos ────────────────────────────────────────────────────

async function calcular(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const motor = motorDaDisciplina(laudo.disciplina);
  res.json(motor.resumir(processarComMotor(motor, laudo.dados)));
}

// Fotos referenciadas como "foto:<id>" viram arquivos temporários para o
// gerador de documentos; só fotos DESTE laudo são lidas (sem IDOR entre laudos).
// Qualquer outro valor em `arquivo` (caminho do disco "C:\...", de rede
// "\\servidor\...") é DESCARTADO: pela API, o gerador nunca lê arquivo que não
// tenha sido enviado ao laudo — senão um usuário embutiria no Word qualquer
// imagem do PC, ou forçaria o PC a se autenticar num servidor externo e
// entregar o hash NTLM (auditoria de 25/10/2026). Caminhos locais continuam
// valendo só no uso pelo Claude Code (skills/_comum/cli.js).
async function prepararFotos(laudoId, dados) {
  const fotos = dados?.inspecao?.fotos || [];
  const ids = fotos.map(f => /^foto:(\d+)$/.exec(f.arquivo || '')?.[1]).filter(Boolean).map(Number);
  if (!ids.length) {
    if (!fotos.length) return { dados, limpar: () => {} };
    const copia = JSON.parse(JSON.stringify(dados));
    copia.inspecao.fotos = copia.inspecao.fotos.map(f => ({ ...f, arquivo: '' }));
    if (copia.inspecao.pasta_fotos) copia.inspecao.pasta_fotos = '';
    return { dados: copia, limpar: () => {} };
  }
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), `hm-laudo-${laudoId}-`));
  const { rows } = await pool.query(
    'SELECT id, mime, conteudo FROM laudos_projetos_fotos WHERE laudo_id = $1 AND id = ANY($2::int[])',
    [laudoId, ids]
  );
  const caminhos = {};
  for (const r of rows) {
    const arq = path.join(pasta, `${r.id}.${TIPOS_FOTO[r.mime] || 'jpg'}`);
    fs.writeFileSync(arq, r.conteudo);
    caminhos[r.id] = arq;
  }
  const copia = JSON.parse(JSON.stringify(dados));
  copia.inspecao.fotos = copia.inspecao.fotos.map(f => {
    const id = /^foto:(\d+)$/.exec(f.arquivo || '')?.[1];
    return { ...f, arquivo: id ? (caminhos[id] || '') : '' }; // caminho livre: descartado
  });
  if (copia.inspecao.pasta_fotos) copia.inspecao.pasta_fotos = '';
  return { dados: copia, limpar: () => fs.rmSync(pasta, { recursive: true, force: true }) };
}

// Gera os documentos pedidos do padrão da disciplina e grava cada um na pasta
// do laudo com nome fixo (o rótulo do documento) — a versão nova SOBRESCREVE a
// anterior, sem acumular cópias. Devolve os gerados (buffer e nomes).
async function gerarDocumentosDoLaudo(laudo, tipos) {
  const motor = motorDaDisciplina(laudo.disciplina);
  const preparado = await prepararFotos(laudo.id, laudo.dados);
  try {
    const resultado = processarComMotor(motor, preparado.dados);
    const pasta = await seguro(`pasta laudo ${laudo.id}`, () => pastaDoLaudo(laudo));
    const gerados = [];
    for (const tipo of tipos) {
      const doc = motor.documentos.find(d => d.tipo === tipo);
      let gerado;
      try {
        gerado = await motor.gerarDocumento(resultado, tipo);
      } catch (e) {
        const err = new Error(e.message);
        err.status = 400;
        throw err;
      }
      const extensao = path.extname(gerado.nomeArquivo) || '';
      const nomeNaPasta = `${P.nomeSeguro(doc?.rotulo || tipo)}${extensao}`;
      const gravado = pasta ? await seguro(`documento ${tipo} laudo ${laudo.id}`, () => P.gravarArquivo(pasta, nomeNaPasta, gerado.buffer)) : null;
      gerados.push({ tipo, ...gerado, nomeNaPasta, gravadoNaPasta: !!gravado });
    }
    return { gerados, pasta };
  } finally {
    preparado.limpar();
  }
}

async function documento(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const motor = motorDaDisciplina(laudo.disciplina);
  const tipo = req.params.tipo;
  const doc = motor.documentos.find(d => d.tipo === tipo);
  if (!doc) return res.status(400).json({ erro: 'Tipo de documento inválido.' });
  const erroUso = conferirUso(laudo, tiposDocumento().usoDoDocumento(laudo.disciplina, tipo), `"${doc.rotulo}"`);
  if (erroUso) return res.status(400).json({ erro: erroUso });
  const { gerados: [gerado] } = await gerarDocumentosDoLaudo(laudo, [tipo]);
  res.setHeader('Content-Type', gerado.mime);
  res.setHeader('Content-Disposition', contentDisposition(gerado.nomeArquivo));
  res.setHeader('X-Nome-Arquivo', encodeURIComponent(gerado.nomeArquivo));
  res.send(gerado.buffer);
}

// "Salvar documentos na pasta": gera TODOS os documentos do padrão da
// disciplina (Word e Excel) e grava na pasta do laudo, substituindo os anteriores.
// ── Arquitetura (DWG/DXF) e planta gerada pela skill ─────────────────────
// A arquitetura recebida do cliente é a base da planta de projeto: ambientes
// (polilinha de área ou paredes + nome) com área e perímetro reais, e as portas.
// atividade da NBR ISO/CIE 8995-1 pelo nome do ambiente (o formulário permite trocar)
const ATIVIDADE_ILUMINACAO = [
  [/CIRCULA|CORREDOR|HALL/i, 'circulacao'], [/ESCADA/i, 'escadas'], [/BANH|WC|SANIT|VESTI/i, 'banheiro'], [/COPA|REFEIT/i, 'copa'],
  [/DEP[ÓO]SITO|ALMOX/i, 'deposito'], [/GARAGEM|ESTACION/i, 'garagem_vias'], [/REUNI/i, 'reuniao'], [/RECEP|ESPERA/i, 'recepcao'],
  [/SALA DE AULA|SALA \d{2,3}\b|AULA/i, 'sala_aula'], [/LABORAT/i, 'laboratorio_ensino'], [/BIBLIOT/i, 'biblioteca'],
  [/CIR[ÚU]RG/i, 'hosp_cirurgia'], [/ENFERMAR|LEITO|UTI/i, 'hosp_enfermaria'], [/CONSULT|EXAME/i, 'hosp_exames'],
  [/COZINHA/i, 'cozinha_comercial'], [/LOJA|VENDA/i, 'comercio_vendas'],
];
const atividadeDe = (nome) => (ATIVIDADE_ILUMINACAO.find(([re]) => re.test(nome)) || [null, 'escritorio'])[1];

const AMBIENTES_DA_ARQUITETURA = {
  iluminacao: (a, i, dados) => {
    const xs = a.poligono.map(p => p[0]), ys = a.poligono.map(p => p[1]);
    const lados = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].sort((p, q) => q - p);
    return {
      nome: a.nome, atividade: atividadeDe(a.nome), comprimento_m: Math.round(lados[0] * 100) / 100, largura_m: Math.round(lados[1] * 100) / 100,
      pe_direito_m: 3, plano_trabalho_m: 0.75, refl_teto: '0.7', refl_parede: '0.5', refl_piso: '0.2',
      luminaria: dados?.luminarias?.[0]?.codigo || '', controle: 'interruptor', sensor_presenca: false, conservacao: 'normal', fu: null, portas: 1, distancia_quadro_m: 15,
    };
  },
  alarme: (a, i) => {
    const xs = a.poligono.map(p => p[0]), ys = a.poligono.map(p => p[1]);
    return {
      nome: a.nome, particao: 1, area_m2: a.area_m2, maior_dimensao_m: Math.round(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 100) / 100,
      portas: 1, janelas: /BANH|WC|CIRCULA|CORREDOR|HALL|DEP[ÓO]SITO/i.test(a.nome) ? 0 : 1, janelas_acessiveis: true,
      pe_direito_m: 2.8, externo: false, animais: false, risco: 'normal', acesso_principal: i === 0,
    };
  },
  eletrica: (a) => ({ nome: a.nome, tipo: tipoAmbiente(a.nome), area_m2: a.area_m2, perimetro_m: a.perimetro_m, tugs_adicionais: 0, iluminacao_va: null }),
  incendio: (a) => {
    const xs = a.poligono.map(p => p[0]), ys = a.poligono.map(p => p[1]);
    return {
      nome: a.nome, pavimento: 'Térreo', comprimento_m: Math.round((Math.max(...xs) - Math.min(...xs)) * 100) / 100, largura_m: Math.round((Math.max(...ys) - Math.min(...ys)) * 100) / 100,
      pe_direito_m: 3, detector: /BANH|WC|SANIT|COZINHA|COPA|GARAGEM/i.test(a.nome) ? 'temperatura' : 'fumaca', altura_viga_m: null,
      rota_fuga: /CORREDOR|CIRCULA|HALL|ESCADA|RAMPA/i.test(a.nome), escada: /ESCADA/i.test(a.nome), saidas: 0, mudancas_direcao: 0, altura_luminaria_m: null,
    };
  },
};

async function enviarArquitetura(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const arq = req.file;
  if (!arq) return res.status(400).json({ erro: 'Envie o arquivo da arquitetura (.dwg, .dxf ou PDF).' });
  // DWG/PDF: convertido para DXF (PDF: `escala` e `pagina` opcionais no formulário);
  // guarda-se o DXF convertido para a planta não converter de novo — o original vai para a pasta.
  // Conversão e leitura numa thread à parte (services/tarefasCad): na thread
  // principal, um desenho grande travava o sistema para todos por segundos.
  let lida;
  try { lida = await lerArquiteturaNoWorker(arq.buffer, arq.originalname, req.body); } catch (e) { return res.status(400).json({ erro: mensagemDaLeitura(e), faltaEscala: faltouEscala(e) }); }
  const { leitura } = lida;
  const resumo = resumoDaArquitetura(lida);
  await pool.query(
    `INSERT INTO laudos_projetos_arquitetura (laudo_id, nome_arquivo, conteudo, resumo, usuario_id) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (laudo_id) DO UPDATE SET nome_arquivo = EXCLUDED.nome_arquivo, conteudo = EXCLUDED.conteudo, resumo = EXCLUDED.resumo, usuario_id = EXCLUDED.usuario_id, criado_em = NOW()`,
    [laudo.id, String(arq.originalname).slice(0, 200), dxfParaGuardar(lida, arq.buffer), resumo, req.usuario.id]
  );
  // formulário sem ambientes: preenche com os da arquitetura (área e perímetro reais)
  let preenchidos = 0;
  const mapear = AMBIENTES_DA_ARQUITETURA[laudo.disciplina];
  if (mapear && !(laudo.dados?.ambientes || []).length && leitura.ambientes.length) {
    const dados = { ...laudo.dados, ambientes: leitura.ambientes.map((a, i) => mapear(a, i, laudo.dados)) };
    await pool.query('UPDATE laudos_projetos SET dados = $1, atualizado_em = NOW(), versao = versao + 1 WHERE id = $2', [dados, laudo.id]);
    preenchidos = dados.ambientes.length;
  }
  await seguro(`arquitetura laudo ${laudo.id}`, async () => {
    const pasta = path.join(await pastaDoLaudo(laudo), 'Arquitetura');
    await P.gravarArquivo(pasta, arq.originalname, arq.buffer);
  });
  res.status(201).json({ ...resumo, preenchidos });
}

async function verArquitetura(req, res) {
  const { rows: [a] } = await pool.query('SELECT nome_arquivo, resumo, criado_em FROM laudos_projetos_arquitetura WHERE laudo_id = $1', [req.params.id]);
  res.json(a || null);
}

const erro400 = (mensagem) => Object.assign(new Error(mensagem), { status: 400 });

// Planta DXF com os pontos da disciplina sobre a arquitetura enviada.
// asBuilt ({ data, revisao }): carimbo "AS BUILT — conforme executado".
async function montarPlanta(laudo, { asBuilt = null } = {}) {
  const C = cad();
  const gerador = C.PLANTAS[laudo.disciplina];
  if (!gerador) throw erro400('A planta automática ainda não existe para esta disciplina (disponível: elétrica predial e hospitalar, iluminação, incêndio, alarme, controle de acesso, CFTV, cabeamento, telefonia e antena).');
  const { rows: [arq] } = await pool.query('SELECT nome_arquivo, conteudo FROM laudos_projetos_arquitetura WHERE laudo_id = $1', [laudo.id]);
  if (!arq) throw erro400('Envie primeiro a arquitetura (.dwg, .dxf ou PDF) deste projeto.');
  const motor = motorDaDisciplina(laudo.disciplina);
  const d = laudo.dados || {};
  // leitura da arquitetura, cálculo da disciplina e desenho numa thread à parte
  // (services/tarefasCad); o carimbo é montado aqui
  let out;
  try {
    out = await gerarPlantaNoWorker({
      dxf: arq.conteudo.toString('utf8'), disciplina: laudo.disciplina, dados: laudo.dados,
      carimbo: {
        cliente: d.cliente?.nome, obra: d.obra?.nome || laudo.titulo,
        titulo: `${asBuilt ? 'AS BUILT — ' : ''}Projeto — ${motor.nome || laudo.disciplina} — planta baixa`,
        data: asBuilt ? entrega().dataBr(asBuilt.data) : new Date().toLocaleDateString('pt-BR'),
        revisao: asBuilt ? (asBuilt.revisao || d.meta?.revisao) : d.meta?.revisao,
        responsavel: d.responsavel?.nome, crea: d.responsavel?.crea,
        ...(asBuilt ? { fase: 'AS BUILT (conforme executado)', descricaoRevisao: entrega().textoAsBuilt(asBuilt) } : {}),
      },
    });
  } catch (e) {
    // mesma mensagem de processarComMotor (o cálculo agora roda no worker)
    if (e.etapa === 'dados') throw erro400(`Dados incompletos ou inválidos: ${e.message}`);
    throw e;
  }
  const nome = `${asBuilt ? 'AS BUILT - ' : ''}${nomeSeguroArquivo(laudo.titulo)} - Planta ${laudo.disciplina}.dxf`;
  return { nome, buffer: Buffer.from(out.dxf, 'utf8'), naoEncontrados: out.naoEncontrados };
}

// Diagrama unifilar do quadro para o QElectroTech (formato 0.100, abre na
// estável e nas mais novas), a partir do cálculo da elétrica predial (QD),
// industrial (QGBT + CCMs, com os motores) ou da subestação de MT.
function montarUnifilar(laudo, { asBuilt = null } = {}) {
  const gerar = cad().UNIFILARES[laudo.disciplina];
  if (!gerar) throw erro400('O unifilar automático está disponível para a elétrica predial, a industrial e a subestação de média tensão.');
  const motor = motorDaDisciplina(laudo.disciplina);
  let { xml } = gerar(processarComMotor(motor, laudo.dados), { quadro: 'QD-01' });
  if (asBuilt) xml = entrega().marcarAsBuiltQet(xml, asBuilt);
  const nome = `${asBuilt ? 'AS BUILT - ' : ''}${nomeSeguroArquivo(laudo.titulo)} - Unifilar.qet`;
  return { nome, buffer: Buffer.from(xml, 'utf8') };
}

async function gerarPlantaDxf(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const erroUso = conferirUso(laudo, tiposDocumento().usoDoDocumento(laudo.disciplina, 'planta'), 'A planta (DXF)');
  if (erroUso) return res.status(400).json({ erro: erroUso });
  const { nome, buffer, naoEncontrados } = await montarPlanta(laudo);
  await seguro(`planta laudo ${laudo.id}`, async () => P.gravarArquivo(await pastaDoLaudo(laudo), nome, buffer));
  res.set({ 'Content-Type': 'application/dxf', 'Content-Disposition': contentDisposition(nome), 'X-Nome-Arquivo': encodeURIComponent(nome), 'X-Ambientes-Nao-Encontrados': encodeURIComponent(naoEncontrados.join('; ')) });
  res.send(buffer);
}

async function gerarUnifilarQet(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const erroUso = conferirUso(laudo, tiposDocumento().usoDoDocumento(laudo.disciplina, 'unifilar'), 'O unifilar (QElectroTech)');
  if (erroUso) return res.status(400).json({ erro: erroUso });
  const { nome, buffer } = montarUnifilar(laudo);
  await seguro(`unifilar laudo ${laudo.id}`, async () => P.gravarArquivo(await pastaDoLaudo(laudo), nome, buffer));
  res.set({ 'Content-Type': 'application/xml', 'Content-Disposition': contentDisposition(nome), 'X-Nome-Arquivo': encodeURIComponent(nome) });
  res.send(buffer);
}

// ── Entregas do projeto (versão 2.1) ─────────────────────────────────────
// O projetista escolhe o que entregar (utils/projetoLaudo.js → ENTREGAS):
// definições técnicas (memorial e planilhas de projeto), as-built (a mesma
// documentação marcada AS BUILT), DXF (planta — DWG não é gerado), QElectroTech
// (unifilar) e PDF (folha de entrega com o resumo técnico). Os arquivos vão
// para <pasta do projeto>\Entrega (nomes fixos, sobrescritos a cada versão) e,
// pedido em ZIP, voltam num pacote só.

async function catalogoEntregas(req, res) {
  res.json(ENTREGAS);
}

async function montarEntrega(laudo, pedido, usuarioNome) {
  const motor = motorDaDisciplina(laudo.disciplina);
  const E = entrega();
  const T = tiposDocumento();
  const { asBuilt } = pedido;
  const prefixo = asBuilt ? 'AS BUILT - ' : '';
  const arquivos = []; // { nome, buffer, descricao }
  const notas = [];
  // dados "as built": revisão e data do as-built nos documentos (identificação)
  const laudoDoc = asBuilt
    ? { ...laudo, dados: { ...laudo.dados, meta: { ...(laudo.dados?.meta || {}), ...(asBuilt.revisao ? { revisao: asBuilt.revisao } : {}), data: asBuilt.data } } }
    : laudo;

  if (pedido.itens.includes('definicoes')) {
    const resultado = processarComMotor(motor, laudoDoc.dados);
    const disponiveis = motor.tiposDisponiveis ? motor.tiposDisponiveis(resultado) : motor.documentos.map(d => d.tipo);
    // documentos SÓ de projeto (os 'ambos', como a análise de risco do SPDA, também entram)
    const tipos = disponiveis.filter(t => T.serve(T.usoDoDocumento(laudo.disciplina, t), 'projeto'));
    for (const tipo of tipos) {
      const doc = motor.documentos.find(d => d.tipo === tipo);
      let gerado;
      try { gerado = await motor.gerarDocumento(resultado, tipo); } catch (e) { throw erro400(`${doc?.rotulo || tipo}: ${e.message}`); }
      const ext = path.extname(gerado.nomeArquivo) || (doc?.formato === 'Excel' ? '.xlsx' : '.docx');
      let buffer = gerado.buffer;
      if (asBuilt) buffer = ext === '.xlsx' ? await E.marcarAsBuiltXlsx(buffer, asBuilt) : await E.marcarAsBuiltDocx(buffer, asBuilt);
      arquivos.push({ nome: `${prefixo}${P.nomeSeguro(doc?.rotulo || tipo)}${ext}`, buffer, descricao: `${doc?.rotulo || tipo} (${doc?.formato || ext.slice(1)})` });
    }
    notas.push('O memorial em PDF é gerado pelo Word (Arquivo › Salvar como › PDF) — o sistema não converte Word em PDF.');
  }
  if (pedido.itens.includes('dxf')) {
    const p = await montarPlanta(laudoDoc, { asBuilt });
    arquivos.push({ nome: p.nome, buffer: p.buffer, descricao: 'Planta baixa com os pontos, legenda e carimbo — DXF (abre no AutoCAD; DWG não é gerado)' });
    if (p.naoEncontrados.length) notas.push(`Ambientes do formulário que não estão na arquitetura (sem pontos na planta): ${p.naoEncontrados.join('; ')}.`);
  }
  if (pedido.itens.includes('qet')) {
    const u = montarUnifilar(laudoDoc, { asBuilt });
    arquivos.push({ nome: u.nome, buffer: u.buffer, descricao: 'Diagrama unifilar — QElectroTech (.qet)' });
  }
  if (pedido.itens.includes('pdf')) {
    let resumo = null;
    try { resumo = motor.resumir(processarComMotor(motor, laudoDoc.dados)); } catch { /* sem resumo: a folha avisa */ }
    const nomeDisc = (listarDisciplinas().find(d => d.chave === laudo.disciplina)?.nome || laudo.disciplina);
    const nomePdf = `${prefixo}Folha de entrega.pdf`;
    const html = gerarHtmlFolhaEntrega({
      disciplina: nomeDisc, titulo: laudo.titulo, dados: laudoDoc.dados, resumo, asBuilt, emitidoPor: usuarioNome,
      arquivos: [...arquivos.map(a => ({ nome: a.nome, descricao: a.descricao })), { nome: nomePdf, descricao: 'Esta folha de entrega (PDF)' }],
      notas,
    });
    const pdf = await gerarPdfDeHtml(html, {
      margin: { top: '10mm', bottom: '22mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: gerarFooterTemplate(),
    });
    arquivos.push({ nome: nomePdf, buffer: pdf, descricao: 'Folha de entrega com a lista dos arquivos e o resumo técnico (PDF)' });
  }
  return arquivos;
}

// POST /laudos/:id/entrega?destino=zip|pasta
// body: { itens: ['definicoes','asbuilt','dxf','qet','pdf'], as_built: { data, revisao } }
async function gerarEntrega(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  if (laudo.tipo !== 'projeto') return res.status(400).json({ erro: 'As entregas (definições técnicas, as-built, DXF, QElectroTech, PDF) são do PROJETO; este registro é um laudo.' });
  const C = cad();
  const pedido = lerPedidoEntrega(req.body, { temPlanta: !!C.PLANTAS[laudo.disciplina], temUnifilar: !!C.UNIFILARES[laudo.disciplina] });
  if (pedido.erro) return res.status(400).json({ erro: pedido.erro });
  const arquivos = await montarEntrega(laudo, pedido, req.usuario.nome);
  // lembra a escolha (a tela abre com as mesmas entregas marcadas)
  await pool.query('UPDATE laudos_projetos SET entregas = $1 WHERE id = $2', [{ itens: pedido.escolhidos, as_built: pedido.asBuilt, gerado_em: new Date().toISOString() }, laudo.id]);
  // cópia na pasta do projeto: <pasta>\Entrega\<arquivo> (nome fixo, sobrescreve)
  let gravados = 0;
  const pasta = await seguro(`entrega ${laudo.id}`, () => pastaDoLaudo(laudo));
  if (pasta) {
    for (const a of arquivos) if (await seguro(`entrega ${laudo.id} ${a.nome}`, () => P.gravarArquivo(path.join(pasta, 'Entrega'), a.nome, a.buffer))) gravados++;
  }
  if (req.query.destino === 'pasta') {
    if (!pasta) return res.status(500).json({ erro: 'Não foi possível acessar a pasta do projeto (veja se ela está aberta em outro programa).' });
    return res.json({ caminhoPasta: path.join(pasta, 'Entrega'), arquivos: arquivos.map(a => a.nome), gravados });
  }
  const zip = await entrega().zipar(arquivos);
  const nomeZip = `${pedido.asBuilt ? 'AS BUILT - ' : ''}Entrega - ${nomeSeguroArquivo(laudo.titulo)} - ${laudo.disciplina}.zip`;
  res.set({
    'Content-Type': 'application/zip', 'Content-Disposition': contentDisposition(nomeZip), 'X-Nome-Arquivo': encodeURIComponent(nomeZip),
    'X-Arquivos': encodeURIComponent(arquivos.map(a => a.nome).join('; ')), 'X-Gravados-Na-Pasta': String(gravados),
  });
  res.send(zip);
}

// nome de arquivo válido no Windows (nomes reservados, ponto no fim, controle): a regra das pastas
const nomeSeguroArquivo = (s) => P.nomeSeguro(s, 'Projeto');

async function salvarDocumentos(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const motor = motorDaDisciplina(laudo.disciplina);
  // só os documentos do tipo do registro (projeto ou laudo)
  const T = tiposDocumento();
  const tipos = (motor.tiposDisponiveis ? motor.tiposDisponiveis(processarComMotor(motor, laudo.dados)) : motor.documentos.map(d => d.tipo))
    .filter(t => T.serve(T.usoDoDocumento(laudo.disciplina, t), laudo.tipo));
  const { gerados, pasta } = await gerarDocumentosDoLaudo(laudo, tipos);
  if (!pasta) return res.status(500).json({ erro: 'Não foi possível acessar a pasta do laudo (veja se ela está aberta em outro programa).' });
  res.json({ caminhoPasta: pasta, documentos: gerados.map(g => ({ tipo: g.tipo, arquivo: g.nomeNaPasta, gravado: g.gravadoNaPasta })) });
}

async function pasta(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  res.json({ ...(await resumoPasta(await pastaDoLaudo(laudo))), podeAbrir: pedidoLocal(req) });
}

async function abrirPasta(req, res) {
  if (!pedidoLocal(req)) return res.status(400).json({ erro: 'A pasta só pode ser aberta no PC onde o sistema roda.' });
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  P.abrirNoExplorer(await pastaDoLaudo(laudo));
  res.json({ ok: true });
}

// ── Fotos ───────────────────────────────────────────────────────────────────

async function enviarFotos(req, res) {
  const arquivos = req.files || [];
  if (!arquivos.length) return res.status(400).json({ erro: 'Nenhuma foto enviada.' });
  // o tipo vem do conteúdo, não do que o navegador declarou
  const invalida = arquivos.find(a => !TIPOS_FOTO[tipoPorConteudo(a.buffer)]);
  if (invalida) return res.status(400).json({ erro: `"${invalida.originalname}" não é JPG nem PNG.` });
  // tudo ou nada: uma falha no meio não deixa metade das fotos gravadas
  const inseridas = await comTransacao(async (client) => {
    const lista = [];
    for (const a of arquivos) {
      const { rows } = await client.query(
        `INSERT INTO laudos_projetos_fotos (laudo_id, nome_arquivo, mime, conteudo) VALUES ($1,$2,$3,$4)
         RETURNING id, nome_arquivo, mime, octet_length(conteudo) AS tamanho`,
        [req.params.id, String(a.originalname || 'foto').slice(0, 200), tipoPorConteudo(a.buffer), a.buffer]
      );
      lista.push(rows[0]);
    }
    await client.query('UPDATE laudos_projetos SET atualizado_em = NOW() WHERE id = $1', [req.params.id]);
    return lista;
  });
  // cópia das fotos em <pasta do laudo>\Fotos (o banco continua sendo a fonte, entra no backup)
  await seguro(`fotos laudo ${req.params.id}`, async () => {
    const pasta = path.join(await pastaDoLaudo(await carregarLaudo(req.params.id)), 'Fotos');
    for (let i = 0; i < arquivos.length; i++) await P.gravarArquivo(pasta, `${inseridas[i].id} - ${inseridas[i].nome_arquivo}`, arquivos[i].buffer);
  });
  res.status(201).json(inseridas);
}

function idFotoValido(valor) {
  return /^\d+$/.test(String(valor)) && Number(valor) >= 1 && Number(valor) <= 2147483647;
}

async function verFoto(req, res) {
  if (!idFotoValido(req.params.fotoId)) return res.status(400).json({ erro: 'Identificador inválido.' });
  const { rows } = await pool.query(
    'SELECT mime, conteudo FROM laudos_projetos_fotos WHERE id = $1 AND laudo_id = $2',
    [req.params.fotoId, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ erro: 'Foto não encontrada.' });
  res.setHeader('Content-Type', rows[0].mime);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(rows[0].conteudo);
}

async function removerFoto(req, res) {
  if (!idFotoValido(req.params.fotoId)) return res.status(400).json({ erro: 'Identificador inválido.' });
  const { rows } = await pool.query('DELETE FROM laudos_projetos_fotos WHERE id = $1 AND laudo_id = $2 RETURNING id, nome_arquivo', [req.params.fotoId, req.params.id]);
  if (rows[0]) {
    await seguro(`remover foto laudo ${req.params.id}`, async () => P.removerArquivo(path.join(await pastaDoLaudo(await carregarLaudo(req.params.id)), 'Fotos'), `${rows[0].id} - ${rows[0].nome_arquivo}`));
  }
  res.json({ ok: true });
}

// ── Orçamento ───────────────────────────────────────────────────────────────

// Monta os itens da proposta integrando com o catálogo:
// - material: procurado no catálogo (mesma comparação da Análise de Projeto);
//   achou com preço → entra com o preço e "confirmado"; senão "a_cotar" e o
//   próprio salvamento da proposta cadastra o material novo no catálogo;
// - serviço: valor da tabela de preços de referência de mão de obra (pelo
//   `codigo`) — o adotado pela H&M ou, sem ele, a referência de mercado do
//   segmento do cliente (órgão público → oficial; demais → particular) —,
//   sempre "a_cotar": referência é sugestão, não preço fechado.
async function montarItensProposta(orcamento, segmento = 'privado') {
  const catalogo = (await pool.query(
    'SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id'
  )).rows;
  const ref = await buscarPrecosReferencia(segmento);

  const estatistica = { materiaisNoCatalogo: 0, materiaisNovos: 0, servicosComReferencia: 0, servicosSemReferencia: 0, segmento };
  const itens = orcamento.itens.map(it => {
    // `codigo` vai para proposta_itens: liga o serviço à tabela de preços de referência
    const base = { secao_nome: it.secao, codigo: it.codigo || null, descricao: String(it.descricao).slice(0, 500), quantidade: Number(it.quantidade) || 0, unidade: it.unidade || null, subgrupo: it.subgrupo || null };
    if (it.secao === 'Materiais e Equipamentos') {
      const achado = compararComCatalogo(it.descricao, catalogo);
      if (achado && achado.preco_catalogo > 0) {
        estatistica.materiaisNoCatalogo++;
        return { ...base, material_id: achado.material_id, valor_unitario: achado.preco_catalogo, status: base.quantidade > 0 ? 'confirmado' : 'a_cotar' };
      }
      estatistica.materiaisNovos++;
      return { ...base, material_id: achado?.material_id || null, valor_unitario: 0, status: 'a_cotar' };
    }
    const valor = it.codigo && ref[it.codigo] ? ref[it.codigo] : 0;
    estatistica[valor ? 'servicosComReferencia' : 'servicosSemReferencia']++;
    return { ...base, valor_unitario: valor, status: 'a_cotar' };
  });
  return { itens, estatistica };
}

async function gerarOrcamento(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  if (laudo.gerar_orcamento === false) return res.status(409).json({ erro: `Este ${nomeDoTipo(laudo).toLowerCase()} está marcado como "sem orçamento". Ative a opção de orçamento para gerar.` });
  const motor = motorDaDisciplina(laudo.disciplina);
  const modo = req.body?.modo;
  const modoInfo = motor.modosOrcamento.find(m => m.modo === modo);
  if (!modoInfo) return res.status(400).json({ erro: 'Escolha o tipo de orçamento.' });
  // 2.1: projeto → orçamento de execução; laudo → orçamento de inspeção/correção.
  // Proposta que já estava ligada no outro modo (antes da 2.1) continua atualizável.
  if (!(laudo.propostas || {})[modo]) {
    const erroUso = conferirUso(laudo, tiposDocumento().usoDoModo(laudo.disciplina, modo), `O orçamento "${modoInfo.rotulo}"`);
    if (erroUso) return res.status(400).json({ erro: erroUso });
  }

  const resultado = processarComMotor(motor, laudo.dados);
  let orcamento;
  try {
    orcamento = motor.montarOrcamento(resultado, modo);
  } catch (e) {
    return res.status(400).json({ erro: e.message });
  }
  // cliente do orçamento: o da OBRA ligada (cadastro do sistema) > o do registro >
  // o digitado no formulário. Antes valia só o do formulário: o orçamento de um
  // laudo da obra do cliente X saía para "CLIENTE EXEMPLO" (teste de 28/10/2026).
  let cli = null;
  if (laudo.obra_id) {
    const { rows: [o] } = await pool.query(
      'SELECT c.id, c.nome, c.tipo, o.cliente_nome FROM obras o LEFT JOIN clientes c ON c.id = o.cliente_id AND c.ativo WHERE o.id = $1', [laudo.obra_id]);
    if (o?.id) cli = { id: o.id, nome: o.nome, tipo: o.tipo };
    else if (o?.cliente_nome) cli = { id: null, nome: o.cliente_nome, tipo: null };
  }
  if (!cli && laudo.cliente_id) cli = (await pool.query('SELECT id, nome, tipo FROM clientes WHERE id = $1 AND ativo', [laudo.cliente_id])).rows[0] || null;
  const clienteNome = (cli?.nome || orcamento.cliente_nome || '').trim();
  if (!clienteNome) return res.status(400).json({ erro: 'Preencha o nome do cliente no formulário antes de gerar o orçamento.' });

  if (!cli?.id) cli = (await pool.query('SELECT id, tipo FROM clientes WHERE LOWER(nome) = LOWER($1) AND ativo = true LIMIT 1', [clienteNome])).rows[0] || cli;
  const clienteId = cli?.id || null;
  const { itens, estatistica } = await montarItensProposta(orcamento, segmentoDoCliente(cli?.tipo, clienteNome));
  const nomesSecoes = [...new Set(itens.map(i => i.secao_nome))];
  // `id` distinto por seção: inserirSecoesEItens casa item→seção por sid OU nome
  const secoes = nomesSecoes.map((nome, i) => ({ id: i + 1, nome }));
  const dataHoje = hojeBrasilia(); // toISOString daria amanhã depois das 21h
  const erroValidacao = validarProposta({ data: dataHoje, cliente_nome: clienteNome, secoes, itens });
  if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

  const rotuloModo = motor.modosOrcamento.find(m => m.modo === modo).rotulo;
  const origem = `Laudos e projetos #${laudo.id} (${laudo.disciplina.toUpperCase()} — ${rotuloModo})`;

  const resultadoTx = await comTransacao(async (client) => {
    // Trava o registro e relê o vínculo DENTRO da transação: com o vínculo
    // lido antes (fora dela), dois cliques em "Gerar orçamento" criavam duas
    // propostas. Agora o segundo espera o primeiro terminar e atualiza a
    // proposta que ele criou (revisão de 27/10/2026).
    const trava = await client.query('SELECT propostas FROM laudos_projetos WHERE id = $1 FOR UPDATE', [laudo.id]);
    if (!trava.rows.length) return null;
    // Proposta vinculada: só é atualizada enquanto estiver "Ativa" (aprovada ou
    // recusada fica intacta e nasce uma nova), mantendo BDI e impostos dela.
    const vinculadaId = (trava.rows[0].propostas || {})[modo] || null;
    const vinculadaInfo = vinculadaId
      ? (await client.query('SELECT numero, status, bdi, bdi_materiais, imposto_venda, imposto_servico FROM propostas WHERE id = $1 FOR UPDATE', [vinculadaId])).rows[0]
      : null;
    const vinculada = vinculadaInfo && vinculadaInfo.status === 'Ativa' ? vinculadaId : null;
    const totais = calcularTotais({ secoes, itens,
      bdi: vinculada ? Number(vinculadaInfo.bdi) || 0 : 0,
      bdi_materiais: vinculada ? vinculadaInfo.bdi_materiais : null, // BDI diferenciado (2.0, Fase 3F) também é mantido
      imposto_venda: vinculada ? Number(vinculadaInfo.imposto_venda) || 0 : 0,
      imposto_servico: vinculada ? Number(vinculadaInfo.imposto_servico) || 0 : 0 });

    if (vinculada) { // linha já travada acima
      await client.query(
        `UPDATE propostas SET data=$1, cliente_id=$2, cliente_nome=$3, responsavel=$4, escopo=$5, observacoes=$6,
          subtotal_materiais=$7, subtotal_mao_obra=$8, valor_bdi=$9, valor_imposto_venda=$10, valor_imposto_servico=$11,
          total=$12, atualizado_em=NOW(), versao=versao+1, obra_id=COALESCE(obra_id, $14) WHERE id=$13`,
        [dataHoje, clienteId, clienteNome, req.usuario.nome, orcamento.escopo, orcamento.observacoes,
         totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi, totais.valor_imposto_venda,
         totais.valor_imposto_servico, totais.total, vinculada, laudo.obra_id || null]
      );
      await client.query('DELETE FROM proposta_secoes WHERE proposta_id = $1', [vinculada]);
      await inserirSecoesEItens(client, vinculada, secoes, itens);
      await registrarEvento(client, vinculada, req.usuario.id, 'editada', `Atualizada a partir de ${origem}`);
      return { propostaId: vinculada, numero: vinculadaInfo.numero, criada: false };
    }
    const seq = await proximoNumero(client);
    const numeroGerado = 'P' + String(seq).padStart(3, '0');
    const { rows } = await client.query(
      `INSERT INTO propostas (numero, sequencial, data, validade, cliente_id, cliente_nome, responsavel, escopo, observacoes,
        bdi, imposto_venda, imposto_servico, subtotal_materiais, subtotal_mao_obra, valor_bdi,
        valor_imposto_venda, valor_imposto_servico, total, usuario_id, obra_id, origem_tipo, origem_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'laudo',$21) RETURNING id`,
      [numeroGerado, seq, dataHoje, 5, clienteId, clienteNome, req.usuario.nome, orcamento.escopo, orcamento.observacoes,
       0, 0, 0, totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
       totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total, req.usuario.id,
       laudo.obra_id || null, laudo.id] // a proposta herda a obra do laudo e guarda a origem
    );
    const novaId = rows[0].id;
    await inserirSecoesEItens(client, novaId, secoes, itens);
    await registrarEvento(client, novaId, req.usuario.id, 'criada', `Proposta ${numeroGerado} criada a partir de ${origem}`);
    await client.query(
      `UPDATE laudos_projetos SET propostas = propostas || jsonb_build_object($1::text, $2::int) WHERE id = $3`,
      [modo, novaId, laudo.id]
    );
    return { propostaId: novaId, numero: numeroGerado, criada: true };
  });
  if (!resultadoTx) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const { propostaId, numero, criada } = resultadoTx;

  classificarPendentesEmSegundoPlano(); // materiais novos do orçamento sem categoria → IA
  res.json({
    propostaId, numero, criada, estatistica,
    mensagem: `Orçamento ${numero} ${criada ? 'criado' : 'atualizado'} (${rotuloModo}): ${estatistica.materiaisNoCatalogo} materiais com preço do catálogo, ` +
      `${estatistica.materiaisNovos} a cotar, ${estatistica.servicosComReferencia} serviços com preço de referência (${estatistica.segmento === 'publico' ? 'referência oficial — cliente órgão público' : 'mercado particular'}).`,
  });
}

module.exports = {
  paraTestes: { prepararFotos }, // testes/seguranca.test.js
  disciplinas, modelo, listar, buscarUm, criar, criarDeAnalise, atualizar, remover, calcular, documento,
  enviarArquitetura, verArquitetura, gerarPlantaDxf, gerarUnifilarQet,
  enviarFotos, verFoto, removerFoto, gerarOrcamento, salvarDocumentos, pasta, abrirPasta,
  catalogoEntregas, gerarEntrega,
};
