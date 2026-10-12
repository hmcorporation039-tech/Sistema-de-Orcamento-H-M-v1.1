const fs = require('fs');
const os = require('os');
const path = require('path');
const pool = require('../config/database');
const { listarDisciplinas, motorDaDisciplina } = require('../utils/disciplinasLaudo');
const { compararComCatalogo } = require('../utils/compatibilizacaoAnalise');
const { comTransacao } = require('../utils/transacao');
const { calcularTotais } = require('../utils/calculoProposta');
const { validarProposta } = require('../utils/validacaoProposta');
const { inserirSecoesEItens, proximoNumero, registrarEvento } = require('./propostasController');
const { classificarPendentesEmSegundoPlano } = require('../services/classificacaoMateriais');
const P = require('../utils/pastasSistema');
const { sincronizarLaudo, pastaDoLaudo, resumoPasta, pedidoLocal, seguro } = require('../services/pastasRegistros');

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
    let where = '';
    if (req.query.disciplina) {
      params.push(String(req.query.disciplina));
      where = 'WHERE l.disciplina = $1';
    }
    const { rows } = await pool.query(
      `SELECT l.id, l.disciplina, l.titulo, l.cliente_nome, l.propostas, l.gerar_orcamento, l.atualizado_em,
              l.dados->'meta'->>'revisao' AS revisao, u.nome AS usuario_nome,
              (SELECT count(*)::int FROM laudos_projetos_fotos f WHERE f.laudo_id = l.id) AS total_fotos
         FROM laudos_projetos l LEFT JOIN usuarios u ON u.id = l.usuario_id
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
    res.json({ ...laudo, fotos: fotos.rows, caminhoPasta: laudo.pasta ? P.caminhoDe('laudo', laudo.pasta) : null });
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
    const { rows } = await pool.query(
      `INSERT INTO laudos_projetos (disciplina, titulo, cliente_nome, dados, usuario_id, gerar_orcamento)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [disciplina, tituloDe(dados), dados.cliente?.nome || null, dados, req.usuario.id, gerarOrc]
    );
    await sincronizarLaudo(rows[0]); // cria Arquivos do Sistema\Laudos\<nome> com os dados
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    responderErro(res, err, 'criar');
  }
}

async function atualizar(req, res) {
  try {
    const { dados } = req.body;
    const erro = validarDados(dados);
    if (erro) return res.status(400).json({ erro });
    // gerar_orcamento: false = "só laudo" (sem orçamento de material); ausente mantém o atual
    const gerarOrc = typeof req.body.gerar_orcamento === 'boolean' ? req.body.gerar_orcamento : null;
    const { rows } = await pool.query(
      `UPDATE laudos_projetos SET dados = $1, titulo = $2, cliente_nome = $3, gerar_orcamento = COALESCE($5, gerar_orcamento), atualizado_em = NOW()
        WHERE id = $4 RETURNING *`,
      [dados, tituloDe(dados), dados.cliente?.nome || null, req.params.id, gerarOrc]
    );
    // pasta acompanha o nome do laudo (renomeia) e "Dados do laudo.json" é sobrescrito
    const pasta = rows[0] ? await sincronizarLaudo(rows[0]) : null;
    res.json({ ok: true, atualizado_em: new Date(), caminhoPasta: pasta, gerar_orcamento: rows[0]?.gerar_orcamento });
  } catch (err) {
    responderErro(res, err, 'atualizar');
  }
}

async function remover(req, res) {
  try {
    const { rows } = await pool.query('DELETE FROM laudos_projetos WHERE id = $1 RETURNING pasta', [req.params.id]);
    // a pasta não é apagada: vai para Arquivos do Sistema\_Excluídos
    if (rows[0]) await seguro(`excluir laudo ${req.params.id}`, () => P.moverParaExcluidos('laudo', rows[0].pasta));
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
async function prepararFotos(laudoId, dados) {
  const fotos = dados?.inspecao?.fotos || [];
  const ids = fotos.map(f => /^foto:(\d+)$/.exec(f.arquivo || '')?.[1]).filter(Boolean).map(Number);
  if (!ids.length) return { dados, limpar: () => {} };
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
    return id ? { ...f, arquivo: caminhos[id] || '' } : f;
  });
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
    const ascii = gerado.nomeArquivo.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
    res.setHeader('Content-Type', gerado.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(gerado.nomeArquivo)}`);
    res.setHeader('X-Nome-Arquivo', encodeURIComponent(gerado.nomeArquivo));
    res.send(gerado.buffer);
  } catch (err) {
    responderErro(res, err, 'documento');
  }
}

// "Salvar documentos na pasta": gera TODOS os documentos do padrão da
// disciplina (Word e Excel) e grava na pasta do laudo, substituindo os anteriores.
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
    const invalida = arquivos.find(a => !TIPOS_FOTO[a.mimetype]);
    if (invalida) return res.status(400).json({ erro: `"${invalida.originalname}" não é JPG nem PNG.` });
    const inseridas = [];
    for (const a of arquivos) {
      const { rows } = await pool.query(
        `INSERT INTO laudos_projetos_fotos (laudo_id, nome_arquivo, mime, conteudo) VALUES ($1,$2,$3,$4)
         RETURNING id, nome_arquivo, mime, octet_length(conteudo) AS tamanho`,
        [req.params.id, String(a.originalname || 'foto').slice(0, 200), a.mimetype, a.buffer]
      );
      inseridas.push(rows[0]);
    }
    await pool.query('UPDATE laudos_projetos SET atualizado_em = NOW() WHERE id = $1', [req.params.id]);
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
//   `codigo`), sempre "a_cotar" — referência é sugestão, não preço fechado.
async function montarItensProposta(orcamento) {
  const catalogo = (await pool.query(
    'SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id'
  )).rows;
  const ref = {};
  (await pool.query('SELECT codigo, valor_referencia FROM precos_mao_de_obra_referencia WHERE valor_referencia IS NOT NULL'))
    .rows.forEach(r => { ref[r.codigo] = Number(r.valor_referencia); });

  const estatistica = { materiaisNoCatalogo: 0, materiaisNovos: 0, servicosComReferencia: 0, servicosSemReferencia: 0 };
  const itens = orcamento.itens.map(it => {
    const base = { secao_nome: it.secao, descricao: String(it.descricao).slice(0, 500), quantidade: Number(it.quantidade) || 0, unidade: it.unidade || null, subgrupo: it.subgrupo || null };
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

    const { itens, estatistica } = await montarItensProposta(orcamento);
    const nomesSecoes = [...new Set(itens.map(i => i.secao_nome))];
    // `id` distinto por seção: inserirSecoesEItens casa item→seção por sid OU nome
    const secoes = nomesSecoes.map((nome, i) => ({ id: i + 1, nome }));
    const dataHoje = new Date().toISOString().slice(0, 10);
    const erroValidacao = validarProposta({ data: dataHoje, cliente_nome: clienteNome, secoes, itens });
    if (erroValidacao) return res.status(400).json({ erro: erroValidacao });
    const totais = calcularTotais({ secoes, itens, bdi: 0, imposto_venda: 0, imposto_servico: 0 });

    const clienteEncontrado = await pool.query('SELECT id FROM clientes WHERE LOWER(nome) = LOWER($1) AND ativo = true LIMIT 1', [clienteNome]);
    const clienteId = clienteEncontrado.rows[0]?.id || null;
    const rotuloModo = motor.modosOrcamento.find(m => m.modo === modo).rotulo;
    const origem = `Laudos e projetos #${laudo.id} (${laudo.disciplina.toUpperCase()} — ${rotuloModo})`;
    const vinculada = (laudo.propostas || {})[modo];

    const { propostaId, numero, criada } = await comTransacao(async (client) => {
      if (vinculada) {
        const atual = await client.query('SELECT numero FROM propostas WHERE id = $1', [vinculada]);
        if (atual.rows.length) {
          await client.query(
            `UPDATE propostas SET data=$1, cliente_id=$2, cliente_nome=$3, responsavel=$4, escopo=$5, observacoes=$6,
              subtotal_materiais=$7, subtotal_mao_obra=$8, valor_bdi=$9, valor_imposto_venda=$10, valor_imposto_servico=$11,
              total=$12, atualizado_em=NOW() WHERE id=$13`,
            [dataHoje, clienteId, clienteNome, req.usuario.nome, orcamento.escopo, orcamento.observacoes,
             totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi, totais.valor_imposto_venda,
             totais.valor_imposto_servico, totais.total, vinculada]
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
          valor_imposto_venda, valor_imposto_servico, total, usuario_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
        [numeroGerado, seq, dataHoje, 5, clienteId, clienteNome, req.usuario.nome, orcamento.escopo, orcamento.observacoes,
         0, 0, 0, totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
         totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total, req.usuario.id]
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
        `${estatistica.materiaisNovos} a cotar, ${estatistica.servicosComReferencia} serviços com preço de referência.`,
    });
  } catch (err) {
    responderErro(res, err, 'gerar orçamento');
  }
}

module.exports = {
  disciplinas, modelo, listar, buscarUm, criar, atualizar, remover, calcular, documento,
  enviarFotos, verFoto, removerFoto, gerarOrcamento, salvarDocumentos, pasta, abrirPasta,
};
