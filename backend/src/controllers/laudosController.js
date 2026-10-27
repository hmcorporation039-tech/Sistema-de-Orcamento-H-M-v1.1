const fs = require('fs');
const os = require('os');
const path = require('path');
const pool = require('../config/database');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const { registrarAuditoria } = require('../utils/auditoria');
const { listarDisciplinas, motorDaDisciplina, cad } = require('../utils/disciplinasLaudo');
const { compararComCatalogo } = require('../utils/compatibilizacaoAnalise');
const { comTransacao } = require('../utils/transacao');
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

// Laudos e projetos por disciplina (aba Análise de Projeto). O cálculo e os
// documentos vêm da skill da disciplina (utils/disciplinasLaudo.js) — o mesmo
// motor que o Claude Code usa, então tela e skill sempre batem.

const TAMANHO_MAX_DADOS = 2 * 1024 * 1024; // o formulário é texto; 2 MB é muita folga
const TIPOS_FOTO = { 'image/jpeg': 'jpg', 'image/png': 'png' };

// Erros de dados do formulário (opção inválida, campo faltando) vêm da skill
// como Error comum: viram 400 com a mensagem, para o usuário corrigir.
function responderErro(res, err, contexto) {
  if (err.status) return res.status(err.status).json({ erro: err.message });
  console.error(`Erro em laudos (${contexto}):`, err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

function tituloDe(dados) {
  return (dados?.obra?.nome || dados?.meta?.titulo || dados?.cliente?.nome || 'Sem título').toString().slice(0, 200);
}

async function carregarLaudo(id) {
  const { rows } = await pool.query('SELECT * FROM laudos_projetos WHERE id = $1', [id]);
  return rows[0] || null;
}

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
  try {
    const motor = motorDaDisciplina(req.params.disciplina);
    res.json({ modelo: motor.modeloVazio(), exemplo: motor.exemplo(), checklistBase: motor.checklistBase, formulario: motor.formulario || null });
  } catch (err) {
    responderErro(res, err, 'modelo');
  }
}

// ── CRUD ────────────────────────────────────────────────────────────────────

async function listar(req, res) {
  try {
    const params = [];
    const cond = [];
    if (req.query.disciplina) {
      params.push(String(req.query.disciplina));
      cond.push(`l.disciplina = $${params.length}`);
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
      `SELECT l.id, l.disciplina, l.titulo, l.cliente_nome, l.propostas, l.gerar_orcamento, l.atualizado_em,
              l.dados->'meta'->>'revisao' AS revisao, u.nome AS usuario_nome,
              (SELECT count(*)::int FROM laudos_projetos_fotos f WHERE f.laudo_id = l.id) AS total_fotos,
              l.obra_id, l.analise_id, ${sqlObraJson('ob')} AS obra
         FROM laudos_projetos l LEFT JOIN usuarios u ON u.id = l.usuario_id
         LEFT JOIN obras ob ON ob.id = l.obra_id
         ${where}
        ORDER BY l.atualizado_em DESC LIMIT 300`,
      params
    );
    res.json(rows);
  } catch (err) {
    responderErro(res, err, 'listar');
  }
}

async function buscarUm(req, res) {
  try {
    const laudo = await carregarLaudo(req.params.id);
    if (!laudo) return res.status(404).json({ erro: 'Laudo não encontrado.' });
    const fotos = await pool.query(
      'SELECT id, nome_arquivo, mime, octet_length(conteudo) AS tamanho FROM laudos_projetos_fotos WHERE laudo_id = $1 ORDER BY id',
      [laudo.id]
    );
    const obra = laudo.obra_id ? (await pool.query(`SELECT ${sqlObraJson('o')} AS obra FROM obras o WHERE o.id = $1`, [laudo.obra_id])).rows[0]?.obra || null : null;
    res.json({ ...laudo, obra, fotos: fotos.rows, caminhoPasta: await caminhoRegistrado('laudo', laudo) });
  } catch (err) {
    responderErro(res, err, 'buscar');
  }
}

function validarDados(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return 'Envie o formulário (dados) como objeto.';
  if (JSON.stringify(dados).length > TAMANHO_MAX_DADOS) return 'Formulário acima do tamanho permitido (2 MB).';
  return null;
}

async function criar(req, res) {
  try {
    const { disciplina } = req.body;
    const motor = motorDaDisciplina(disciplina);
    const dados = req.body.dados || motor.modeloVazio();
    const erro = validarDados(dados);
    if (erro) return res.status(400).json({ erro });
    const gerarOrc = req.body.gerar_orcamento !== false;
    // obra (2.0): laudo novo ligado à obra → pasta em Obras\<obra>\Laudos\<disciplina>
    const leituraObra = lerObraId(req.body);
    const erroObra = await conferirObra(pool, leituraObra, { usuario: req.usuario });
    if (erroObra) return res.status(400).json({ erro: erroObra });
    const { rows } = await pool.query(
      `INSERT INTO laudos_projetos (disciplina, titulo, cliente_nome, dados, usuario_id, gerar_orcamento, obra_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [disciplina, tituloDe(dados), dados.cliente?.nome || null, dados, req.usuario.id, gerarOrc, leituraObra.valor]
    );
    await sincronizarLaudo(rows[0]); // cria Arquivos do Sistema\Laudos\<nome> (ou a pasta na obra) com os dados
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    responderErro(res, err, 'criar');
  }
}

// Cria o laudo/projeto de uma disciplina a partir de uma Análise de Projeto
// (PDF já lido): o formulário da skill nasce preenchido com o que o PDF tem
// (ambientes, câmeras, pontos, quadro de cargas, carimbo) e a lista do que foi
// estimado e precisa de conferência. Body: { analise_id, disciplina }.
async function criarDeAnalise(req, res) {
  try {
    const { disciplina } = req.body;
    const analiseId = Number(req.body.analise_id);
    if (!Number.isInteger(analiseId) || analiseId < 1) return res.status(400).json({ erro: 'Informe a análise de origem.' });
    const motor = motorDaDisciplina(disciplina);
    const { rows: [linha] } = await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [analiseId]);
    if (!linha) return res.status(404).json({ erro: 'Análise não encontrada.' });
    const analise = {
      cliente: linha.cliente_nome, nomeProjeto: linha.nome_projeto, ambientes: linha.ambientes,
      pontosPorAmbiente: linha.pontos_por_ambiente, cameras: linha.cameras, pontosRedeAntena: linha.pontos_rede_antena,
      dadosExtraidos: linha.dados_extraidos,
    };
    const { dados, avisos } = dadosDaAnalise(disciplina, motor, analise);
    const erro = validarDados(dados);
    if (erro) return res.status(400).json({ erro });
    // confere já que o cálculo roda com os dados mapeados (erro vira aviso, o formulário corrige)
    try { motor.processar(dados); } catch (e) { avisos.push(`O cálculo ainda não fecha com os dados lidos: ${e.message}`); }
    // obra (2.0): herda a obra da análise de origem (obra_id no corpo tem prioridade)
    // e guarda de qual análise veio (analise_id)
    const leituraObra = lerObraId(req.body);
    const erroObra = await conferirObra(pool, leituraObra, { usuario: req.usuario });
    if (erroObra) return res.status(400).json({ erro: erroObra });
    let obraId = leituraObra.presente ? leituraObra.valor : (linha.obra_id || null);
    // herdada da análise: só se este usuário puder ligar itens àquela obra
    if (!leituraObra.presente && obraId
      && await conferirObra(pool, { presente: true, valor: obraId }, { usuario: req.usuario })) obraId = null;
    const { rows } = await pool.query(
      `INSERT INTO laudos_projetos (disciplina, titulo, cliente_nome, dados, usuario_id, gerar_orcamento, obra_id, analise_id, cliente_id)
       VALUES ($1,$2,$3,$4,$5,true,$6,$7,$8) RETURNING *`,
      [disciplina, tituloDe(dados), dados.cliente?.nome || null, dados, req.usuario.id, obraId, linha.id, linha.cliente_id || null]
    );
    await sincronizarLaudo(rows[0]);
    res.status(201).json({ id: rows[0].id, avisos });
  } catch (err) {
    responderErro(res, err, 'criar a partir da análise');
  }
}

async function atualizar(req, res) {
  try {
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
  } catch (err) {
    responderErro(res, err, 'atualizar');
  }
}

async function remover(req, res) {
  try {
    const { rows } = await pool.query('DELETE FROM laudos_projetos WHERE id = $1 RETURNING *', [req.params.id]);
    // o formulário inteiro vai para a auditoria (as fotos ficam na pasta, que vai para _Excluídos)
    if (rows[0]) await registrarAuditoria(pool, { entidade: 'laudos_projetos', entidadeId: rows[0].id, acao: 'excluir', usuarioId: req.usuario.id, detalhes: { laudo: rows[0] } });
    // a pasta não é apagada: vai para Arquivos do Sistema\_Excluídos
    if (rows[0]) await excluirPastaDoItem('laudo', rows[0]); // pasta antiga ou dentro da obra
    res.json({ ok: true });
  } catch (err) {
    responderErro(res, err, 'remover');
  }
}

// ── Cálculo e documentos ────────────────────────────────────────────────────

async function calcular(req, res) {
  try {
    const laudo = await carregarLaudo(req.params.id);
    if (!laudo) return res.status(404).json({ erro: 'Laudo não encontrado.' });
    const motor = motorDaDisciplina(laudo.disciplina);
    res.json(motor.resumir(processarComMotor(motor, laudo.dados)));
  } catch (err) {
    responderErro(res, err, 'calcular');
  }
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
  try {
    const laudo = await carregarLaudo(req.params.id);
    if (!laudo) return res.status(404).json({ erro: 'Laudo não encontrado.' });
    const motor = motorDaDisciplina(laudo.disciplina);
    const tipo = req.params.tipo;
    if (!motor.documentos.some(d => d.tipo === tipo)) return res.status(400).json({ erro: 'Tipo de documento inválido.' });
    const { gerados: [gerado] } = await gerarDocumentosDoLaudo(laudo, [tipo]);
    res.setHeader('Content-Type', gerado.mime);
    res.setHeader('Content-Disposition', contentDisposition(gerado.nomeArquivo));
    res.setHeader('X-Nome-Arquivo', encodeURIComponent(gerado.nomeArquivo));
    res.send(gerado.buffer);
  } catch (err) {
    responderErro(res, err, 'documento');
  }
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
  try {
    const laudo = await carregarLaudo(req.params.id);
    if (!laudo) return res.status(404).json({ erro: 'Laudo não encontrado.' });
    const arq = req.file;
    if (!arq) return res.status(400).json({ erro: 'Envie o arquivo da arquitetura (.dwg ou .dxf).' });
    // DWG: convertido para DXF num processo à parte (com tempo limite); guarda-se o
    // DXF convertido para a planta não converter de novo — o original vai para a pasta
    let texto, origem;
    try { ({ texto, origem } = await cad().textoDxfDoArquivo(arq.buffer, arq.originalname)); } catch (e) { return res.status(400).json({ erro: e.message }); }
    let leitura;
    try { leitura = cad().lerArquitetura(texto); } catch (e) { return res.status(400).json({ erro: `Não consegui ler a arquitetura: ${e.message}` }); }
    const resumo = {
      ambientes: leitura.ambientes.map(a => ({ nome: a.nome, area_m2: a.area_m2, perimetro_m: a.perimetro_m, origem: a.origem })),
      portas: leitura.portas.length,
      layers: leitura.layers.length, fatorUnidade: leitura.fatorUnidade, origem,
    };
    await pool.query(
      `INSERT INTO laudos_projetos_arquitetura (laudo_id, nome_arquivo, conteudo, resumo, usuario_id) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (laudo_id) DO UPDATE SET nome_arquivo = EXCLUDED.nome_arquivo, conteudo = EXCLUDED.conteudo, resumo = EXCLUDED.resumo, usuario_id = EXCLUDED.usuario_id, criado_em = NOW()`,
      [laudo.id, String(arq.originalname).slice(0, 200), origem === 'dwg' ? Buffer.from(texto, 'utf8') : arq.buffer, resumo, req.usuario.id]
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
  } catch (err) {
    responderErro(res, err, 'enviar a arquitetura');
  }
}

async function verArquitetura(req, res) {
  const { rows: [a] } = await pool.query('SELECT nome_arquivo, resumo, criado_em FROM laudos_projetos_arquitetura WHERE laudo_id = $1', [req.params.id]);
  res.json(a || null);
}

async function gerarPlantaDxf(req, res) {
  try {
    const laudo = await carregarLaudo(req.params.id);
    if (!laudo) return res.status(404).json({ erro: 'Laudo não encontrado.' });
    const C = cad();
    const gerador = C.PLANTAS[laudo.disciplina];
    if (!gerador) return res.status(400).json({ erro: 'A planta automática ainda não existe para esta disciplina (disponível: elétrica predial e hospitalar, iluminação, incêndio, alarme, controle de acesso, CFTV, cabeamento, telefonia e antena).' });
    const { rows: [arq] } = await pool.query('SELECT nome_arquivo, conteudo FROM laudos_projetos_arquitetura WHERE laudo_id = $1', [laudo.id]);
    if (!arq) return res.status(400).json({ erro: 'Envie primeiro a arquitetura (.dwg ou .dxf) deste projeto.' });
    const arquitetura = C.lerArquitetura(arq.conteudo.toString('utf8'));
    const motor = motorDaDisciplina(laudo.disciplina);
    const resultado = processarComMotor(motor, laudo.dados);
    const { pontos, notas } = gerador(resultado, arquitetura);
    const d = laudo.dados || {};
    const out = C.gerarPlanta({
      arquitetura, pontos, notas,
      carimbo: {
        cliente: d.cliente?.nome, obra: d.obra?.nome || laudo.titulo, titulo: `Projeto — ${motor.nome || laudo.disciplina} — planta baixa`,
        data: new Date().toLocaleDateString('pt-BR'), revisao: d.meta?.revisao, responsavel: d.responsavel?.nome, crea: d.responsavel?.crea,
      },
    });
    const nome = `${nomeSeguroArquivo(laudo.titulo)} - Planta ${laudo.disciplina}.dxf`;
    await seguro(`planta laudo ${laudo.id}`, async () => P.gravarArquivo(await pastaDoLaudo(laudo), nome, Buffer.from(out.dxf, 'utf8')));
    res.set({ 'Content-Type': 'application/dxf', 'Content-Disposition': contentDisposition(nome), 'X-Nome-Arquivo': encodeURIComponent(nome), 'X-Ambientes-Nao-Encontrados': encodeURIComponent(out.naoEncontrados.join('; ')) });
    res.send(Buffer.from(out.dxf, 'utf8'));
  } catch (err) {
    responderErro(res, err, 'gerar a planta');
  }
}

// Diagrama unifilar do quadro para o QElectroTech (formato 0.100, abre na
// estável e nas mais novas), a partir do cálculo da elétrica predial (QD) ou
// industrial (QGBT + CCMs, com os motores)
async function gerarUnifilarQet(req, res) {
  try {
    const laudo = await carregarLaudo(req.params.id);
    if (!laudo) return res.status(404).json({ erro: 'Laudo não encontrado.' });
    const gerar = cad().UNIFILARES[laudo.disciplina];
    if (!gerar) return res.status(400).json({ erro: 'O unifilar automático está disponível para a elétrica predial, a industrial e a subestação de média tensão.' });
    const motor = motorDaDisciplina(laudo.disciplina);
    const { xml } = gerar(processarComMotor(motor, laudo.dados), { quadro: 'QD-01' });
    const nome = `${nomeSeguroArquivo(laudo.titulo)} - Unifilar.qet`;
    await seguro(`unifilar laudo ${laudo.id}`, async () => P.gravarArquivo(await pastaDoLaudo(laudo), nome, Buffer.from(xml, 'utf8')));
    res.set({ 'Content-Type': 'application/xml', 'Content-Disposition': contentDisposition(nome), 'X-Nome-Arquivo': encodeURIComponent(nome) });
    res.send(Buffer.from(xml, 'utf8'));
  } catch (err) {
    responderErro(res, err, 'gerar o unifilar');
  }
}

const nomeSeguroArquivo = (s) => String(s || 'Projeto').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

async function salvarDocumentos(req, res) {
  try {
    const laudo = await carregarLaudo(req.params.id);
    if (!laudo) return res.status(404).json({ erro: 'Laudo não encontrado.' });
    const motor = motorDaDisciplina(laudo.disciplina);
    const tipos = (motor.tiposDisponiveis ? motor.tiposDisponiveis(processarComMotor(motor, laudo.dados)) : motor.documentos.map(d => d.tipo));
    const { gerados, pasta } = await gerarDocumentosDoLaudo(laudo, tipos);
    if (!pasta) return res.status(500).json({ erro: 'Não foi possível acessar a pasta do laudo (veja se ela está aberta em outro programa).' });
    res.json({ caminhoPasta: pasta, documentos: gerados.map(g => ({ tipo: g.tipo, arquivo: g.nomeNaPasta, gravado: g.gravadoNaPasta })) });
  } catch (err) {
    responderErro(res, err, 'salvar documentos');
  }
}

async function pasta(req, res) {
  try {
    const laudo = await carregarLaudo(req.params.id);
    if (!laudo) return res.status(404).json({ erro: 'Laudo não encontrado.' });
    res.json({ ...(await resumoPasta(await pastaDoLaudo(laudo))), podeAbrir: pedidoLocal(req) });
  } catch (err) {
    responderErro(res, err, 'pasta');
  }
}

async function abrirPasta(req, res) {
  if (!pedidoLocal(req)) return res.status(400).json({ erro: 'A pasta só pode ser aberta no PC onde o sistema roda.' });
  try {
    const laudo = await carregarLaudo(req.params.id);
    if (!laudo) return res.status(404).json({ erro: 'Laudo não encontrado.' });
    P.abrirNoExplorer(await pastaDoLaudo(laudo));
    res.json({ ok: true });
  } catch (err) {
    responderErro(res, err, 'abrir pasta');
  }
}

// ── Fotos ───────────────────────────────────────────────────────────────────

async function enviarFotos(req, res) {
  try {
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
  } catch (err) {
    responderErro(res, err, 'enviar fotos');
  }
}

function idFotoValido(valor) {
  return /^\d+$/.test(String(valor)) && Number(valor) >= 1 && Number(valor) <= 2147483647;
}

async function verFoto(req, res) {
  try {
    if (!idFotoValido(req.params.fotoId)) return res.status(400).json({ erro: 'Identificador inválido.' });
    const { rows } = await pool.query(
      'SELECT mime, conteudo FROM laudos_projetos_fotos WHERE id = $1 AND laudo_id = $2',
      [req.params.fotoId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Foto não encontrada.' });
    res.setHeader('Content-Type', rows[0].mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(rows[0].conteudo);
  } catch (err) {
    responderErro(res, err, 'ver foto');
  }
}

async function removerFoto(req, res) {
  try {
    if (!idFotoValido(req.params.fotoId)) return res.status(400).json({ erro: 'Identificador inválido.' });
    const { rows } = await pool.query('DELETE FROM laudos_projetos_fotos WHERE id = $1 AND laudo_id = $2 RETURNING id, nome_arquivo', [req.params.fotoId, req.params.id]);
    if (rows[0]) {
      await seguro(`remover foto laudo ${req.params.id}`, async () => P.removerArquivo(path.join(await pastaDoLaudo(await carregarLaudo(req.params.id)), 'Fotos'), `${rows[0].id} - ${rows[0].nome_arquivo}`));
    }
    res.json({ ok: true });
  } catch (err) {
    responderErro(res, err, 'remover foto');
  }
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
  try {
    const laudo = await carregarLaudo(req.params.id);
    if (!laudo) return res.status(404).json({ erro: 'Laudo não encontrado.' });
    if (laudo.gerar_orcamento === false) return res.status(409).json({ erro: 'Este laudo está marcado como "só laudo" (sem orçamento). Ative a opção de orçamento para gerar.' });
    const motor = motorDaDisciplina(laudo.disciplina);
    const modo = req.body?.modo;
    if (!motor.modosOrcamento.some(m => m.modo === modo)) return res.status(400).json({ erro: 'Escolha o tipo de orçamento.' });

    const resultado = processarComMotor(motor, laudo.dados);
    let orcamento;
    try {
      orcamento = motor.montarOrcamento(resultado, modo);
    } catch (e) {
      return res.status(400).json({ erro: e.message });
    }
    const clienteNome = (orcamento.cliente_nome || '').trim();
    if (!clienteNome) return res.status(400).json({ erro: 'Preencha o nome do cliente no formulário antes de gerar o orçamento.' });

    const clienteEncontrado = await pool.query('SELECT id, tipo FROM clientes WHERE LOWER(nome) = LOWER($1) AND ativo = true LIMIT 1', [clienteNome]);
    const clienteId = clienteEncontrado.rows[0]?.id || null;
    const { itens, estatistica } = await montarItensProposta(orcamento, segmentoDoCliente(clienteEncontrado.rows[0]?.tipo, clienteNome));
    const nomesSecoes = [...new Set(itens.map(i => i.secao_nome))];
    // `id` distinto por seção: inserirSecoesEItens casa item→seção por sid OU nome
    const secoes = nomesSecoes.map((nome, i) => ({ id: i + 1, nome }));
    const dataHoje = new Date().toISOString().slice(0, 10);
    const erroValidacao = validarProposta({ data: dataHoje, cliente_nome: clienteNome, secoes, itens });
    if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

    const rotuloModo = motor.modosOrcamento.find(m => m.modo === modo).rotulo;
    const origem = `Laudos e projetos #${laudo.id} (${laudo.disciplina.toUpperCase()} — ${rotuloModo})`;
    // Proposta vinculada: só é atualizada enquanto estiver "Ativa" (aprovada ou
    // recusada fica intacta e nasce uma nova), mantendo BDI e impostos dela.
    const vinculadaId = (laudo.propostas || {})[modo];
    const vinculadaInfo = vinculadaId
      ? (await pool.query('SELECT status, bdi, bdi_materiais, imposto_venda, imposto_servico FROM propostas WHERE id = $1', [vinculadaId])).rows[0]
      : null;
    const vinculada = vinculadaInfo && vinculadaInfo.status === 'Ativa' ? vinculadaId : null;
    const totais = calcularTotais({ secoes, itens,
      bdi: vinculada ? Number(vinculadaInfo.bdi) || 0 : 0,
      bdi_materiais: vinculada ? vinculadaInfo.bdi_materiais : null, // BDI diferenciado (2.0, Fase 3F) também é mantido
      imposto_venda: vinculada ? Number(vinculadaInfo.imposto_venda) || 0 : 0,
      imposto_servico: vinculada ? Number(vinculadaInfo.imposto_servico) || 0 : 0 });

    const { propostaId, numero, criada } = await comTransacao(async (client) => {
      if (vinculada) {
        const atual = await client.query("SELECT numero FROM propostas WHERE id = $1 AND status = 'Ativa' FOR UPDATE", [vinculada]);
        if (atual.rows.length) {
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
          return { propostaId: vinculada, numero: atual.rows[0].numero, criada: false };
        }
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

    classificarPendentesEmSegundoPlano(); // materiais novos do orçamento sem categoria → IA
    res.json({
      propostaId, numero, criada, estatistica,
      mensagem: `Orçamento ${numero} ${criada ? 'criado' : 'atualizado'} (${rotuloModo}): ${estatistica.materiaisNoCatalogo} materiais com preço do catálogo, ` +
        `${estatistica.materiaisNovos} a cotar, ${estatistica.servicosComReferencia} serviços com preço de referência (${estatistica.segmento === 'publico' ? 'referência oficial — cliente órgão público' : 'mercado particular'}).`,
    });
  } catch (err) {
    responderErro(res, err, 'gerar orçamento');
  }
}

module.exports = {
  paraTestes: { prepararFotos }, // testes/seguranca.test.js
  disciplinas, modelo, listar, buscarUm, criar, criarDeAnalise, atualizar, remover, calcular, documento,
  enviarArquitetura, verArquitetura, gerarPlantaDxf, gerarUnifilarQet,
  enviarFotos, verFoto, removerFoto, gerarOrcamento, salvarDocumentos, pasta, abrirPasta,
};
