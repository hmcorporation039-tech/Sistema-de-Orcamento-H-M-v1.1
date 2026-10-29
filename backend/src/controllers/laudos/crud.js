// Projetos e laudos por disciplina — disciplinas e modelos de formulário e o
// cadastro do registro: listar, abrir, criar (em branco ou a partir de uma
// Análise de Projeto), salvar o formulário e excluir (com cópia das fotos e da
// arquitetura para a pasta antes).
const path = require('path');
const pool = require('../../config/database');
const { registrarAuditoria } = require('../../services/auditoria');
const { listarDisciplinas, motorDaDisciplina, tiposDocumento } = require('../../utils/disciplinasLaudo');
const { lerTipoRegistro } = require('../../utils/projetoLaudo');
const { comTransacao } = require('../../services/transacao');
const P = require('../../services/pastasSistema');
const { versaoDoPedido, responderConflitoOuAusente } = require('../../utils/versao');
const { dadosDaAnalise } = require('../../utils/ponteAnaliseSkill');
const { sincronizarLaudo, pastaDoLaudo, caminhoRegistrado, excluirPastaDoItem } = require('../../services/pastasRegistros');
const { lerObraId, conferirObra, sqlObraJson } = require('../../utils/obras');
const { carregarLaudo } = require('./comum');

const TAMANHO_MAX_DADOS = 2 * 1024 * 1024; // o formulário é texto; 2 MB é muita folga

function tituloDe(dados) {
  return (dados?.obra?.nome || dados?.meta?.titulo || dados?.cliente?.nome || 'Sem título').toString().slice(0, 200);
}

// ── Disciplinas e modelos ───────────────────────────────────────────────────

// ?tipo=projeto|laudo: só os documentos, desenhos e modos de orçamento que
// servem a esse registro. Sem ele vem tudo com o `uso` anotado (a tela filtra)
// — mas quem chamava a API direto via memorial/planilha num laudo, e o
// download respondia 400.
async function disciplinas(req, res) {
  const lista = listarDisciplinas();
  if (!req.query.tipo) return res.json(lista);
  const tipo = lerTipoRegistro(req.query.tipo, null);
  if (!tipo) return res.status(400).json({ erro: 'Tipo inválido (projeto ou laudo).' });
  const { serve, DESENHOS } = tiposDocumento();
  res.json(lista.map(d => (!d.disponivel ? d : {
    ...d,
    documentos: d.documentos.filter(x => serve(x.uso, tipo)),
    modosOrcamento: d.modosOrcamento.filter(m => serve(m.uso, tipo)),
    desenhos: Object.fromEntries(Object.entries(d.desenhos).map(([k, tem]) => [k, tem && serve(DESENHOS[k], tipo)])),
  })));
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
  // Lista cortada: antes sumia em silêncio o que passasse de 300. Desde a
  // revisão de 28/10/2026 a resposta é { itens } como nas outras listas (antes
  // era a lista solta com o aviso escondido nos cabeçalhos X-Lista-Truncada).
  const truncada = rows.length > LIMITE_LISTA_LAUDOS;
  if (truncada) rows.length = LIMITE_LISTA_LAUDOS;
  res.json({ itens: rows, truncada, limite: LIMITE_LISTA_LAUDOS });
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

module.exports = {
  disciplinas, modelo, listar, buscarUm, criar, criarDeAnalise, atualizar, remover,
};
