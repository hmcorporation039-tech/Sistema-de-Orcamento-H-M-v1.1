// Análise de Projeto — mapa do CAD (item 3 do plano): o engenheiro vê o que o sistema entendeu de cada
// layer do DWG/DXF (tipo do ponto, quantidade, altura e de onde veio), corrige, e a correção
//   1) fica guardada na análise,
//   2) vira aprendizado do sistema (services/mapaCad.js → cad_simbolos_aprendidos, origem 'usuario'),
//   3) entra no orçamento quando a análise é reprocessada com o mapa confirmado (sem apagar a análise antiga).
const fsp = require('fs/promises');
const path = require('path');
const pool = require('../../config/database');
const { registrarAuditoria } = require('../../services/auditoria');
const { comTransacao } = require('../../services/transacao');
const P = require('../../services/pastasSistema');
const { pastaDoProjeto } = require('../../services/pastasRegistros');
const { ehArquivoCad } = require('../../services/analiseCad');
const mapaCad = require('../../services/mapaCad');
const edicoesDoMapa = require('../../services/edicoesDoMapa');
const { componentes } = require('../../services/bibliotecaComponentes');
const simbolosAprendidos = require('../../services/simbolosAprendidos');
const notasAprendidas = require('../../services/notasAprendidas');
const blocosAprendidos = require('../../services/blocosAprendidos');
const { DISCIPLINAS } = require('../../utils/disciplinasProjeto');
const { executarAnalise } = require('./analises');

const SUBPASTA_ARQUIVOS = 'Arquivos do projeto';
const RE_ARQUIVO_DE_PROJETO = /\.(pdf|dwg|dxf)$/i;

const arquivosComMapa = (dados) => (Array.isArray(dados) ? dados : []).filter(d => d?.mapa_cad?.simbolos);
const respostaDoMapa = (dados) => ({
  disponivel: arquivosComMapa(dados).length > 0,
  arquivos: arquivosComMapa(dados).map(d => ({
    ...d.mapa_cad, arquivo: d.mapa_cad.arquivo || d.arquivo, resumo: mapaCad.resumoDoMapa(d.mapa_cad),
    disciplinasMarcadas: d.disciplinas || [], disciplinasAIncluir: mapaCad.disciplinasAIncluir(d.mapa_cad, d.disciplinas),
  })),
  tipos: mapaCad.tiposDisponiveis(),
  // biblioteca de componentes por disciplina, com o símbolo de planta em SVG (inserir na planta e no 3D)
  componentes: componentes(),
  // disciplinas para "confirmar bloco" (o bloco aprendido vale dentro da disciplina dele)
  disciplinas: DISCIPLINAS.map(d => ({ chave: d.chave, nome: d.nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
});
// Quem ensina, no aprendizado (services/votosAprendizado.js): a OBRA da análise (o reprocessamento grava outra análise da
// mesma obra — confirmar de novo nela não soma) ou, sem obra, a análise. Confirmar/desfazer duas vezes não muda nada.
const fonteDaAnalise = (a, id) => (a?.obra_id ? `obra:${a.obra_id}` : `analise:${id}`);
// análise com DWG/DXF e sem mapa nenhum: feita antes do mapa do CAD existir. Os pontos explodidos dela ficaram
// fora do orçamento e não havia onde conferi-los (caso real de 03/11/2026: 566 pontos lidos, orçamento zerado)
const semMapaComCad = (a) => !arquivosComMapa(a.dados_extraidos).length
  && (Array.isArray(a.arquivos_analisados) ? a.arquivos_analisados : []).some(q => ehArquivoCad(q?.arquivo));
// mapa guardado antes do desenho de fundo (services/analiseCad/fundoDoMapa.js): a planta da tela fica só com os pontos
const mapaSemFundo = (a) => arquivosComMapa(a.dados_extraidos).some(d => !d.mapa_cad.planta?.fundo);

// GET /projetos/analises/:id/mapa — semMapa / semFundo: dá para ler o DWG de novo (reprocessar sem confirmar nada)
async function ler(req, res) {
  const { rows: [a] } = await pool.query('SELECT dados_extraidos, arquivos_analisados FROM analises_projeto WHERE id = $1', [req.params.id]);
  if (!a) return res.status(404).json({ erro: 'Análise não encontrada' });
  res.json({ ...respostaDoMapa(a.dados_extraidos), semMapa: semMapaComCad(a), semFundo: mapaSemFundo(a) });
}

// PUT /projetos/analises/:id/mapa { arquivo, linhas: [{ idx, simbolo, altura_m, confirmado }] }
// confirmado: false desfaz a confirmação da linha (volta ao proposto e esquece o que ela ensinou)
async function salvar(req, res) {
  const { id } = req.params;
  const { arquivo, linhas } = req.body || {};
  let resultado;
  try {
    resultado = await comTransacao(async (client) => {
      const { rows: [a] } = await client.query('SELECT dados_extraidos, obra_id FROM analises_projeto WHERE id = $1 FOR UPDATE', [id]);
      if (!a) throw Object.assign(new Error('Análise não encontrada'), { status: 404 });
      const dados = Array.isArray(a.dados_extraidos) ? a.dados_extraidos : [];
      const i = dados.findIndex(d => d?.mapa_cad?.simbolos && (d.mapa_cad.arquivo || d.arquivo) === arquivo);
      if (i < 0) throw Object.assign(new Error('Esta análise não tem mapa do CAD para esse arquivo (análise feita antes do mapa, ou arquivo que não é DWG/DXF).'), { status: 404 });
      const erro = mapaCad.validarLinhas(linhas, dados[i].mapa_cad);
      if (erro) throw Object.assign(new Error(erro), { status: 400 });
      const { mapa, alteradas } = mapaCad.aplicarNoMapa(dados[i].mapa_cad, linhas);
      dados[i] = { ...dados[i], mapa_cad: mapa };
      await client.query('UPDATE analises_projeto SET dados_extraidos = $1 WHERE id = $2', [JSON.stringify(dados), id]);
      await registrarAuditoria(client, {
        entidade: 'analises_projeto', entidadeId: Number(id), acao: 'mapa_cad', usuarioId: req.usuario.id,
        detalhes: { arquivo, linhas: alteradas.map(x => ({ layer: x.depois.layer, de: x.antes.simbolo, para: x.depois.simbolo, altura_m: x.depois.altura_m ?? null, desfeita: x.desfeita })) },
      });
      return { dados, alteradas, escritorio: dados[i].mapa_cad.escritorio || '', fonte: fonteDaAnalise(a, id), disciplinas: dados[i].disciplinas || [], mapa };
    });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
  // aprendizado fora da transação: se falhar, a correção da análise já está salva
  // (biblioteca de blocos: a medida real e o escritório do carimbo vão na chave — CAD-08). Cada confirmação é o voto
  // deste projeto (obra/análise); "não é ponto" também se aprende, pelas disciplinas marcadas no arquivo.
  const { fonte, disciplinas, escritorio } = resultado;
  const aprendidas = await mapaCad.aprender(resultado.alteradas, arquivo, undefined, escritorio, { fonte, disciplinas });
  const esquecidas = await mapaCad.esquecer(resultado.alteradas, undefined, escritorio, { fonte, disciplinas, arquivo });
  // a altura confirmada para um TIPO de ponto vira sugestão para os próximos desenhos do mesmo escritório — ou, sem
  // escritório no carimbo, da mesma disciplina (item 8)
  const alturasAprendidas = await notasAprendidas.aprenderConfirmadas(resultado.alteradas, escritorio, arquivo, undefined, { fonte });
  await notasAprendidas.esquecer(resultado.alteradas, escritorio, undefined, { fonte, arquivo, mapa: resultado.mapa });
  res.json({ ...respostaDoMapa(resultado.dados), aprendidas, esquecidas, alturasAprendidas });
}

// Pedido vindo do 3D (sistema: '3d'): as posições estão nas coordenadas da REFERÊNCIA (utils/compatibilidadeEspacial — o
// 3D é montado com cada arquivo deslocado de dx/dy). Cada posição vai para o arquivo do grupo cuja planta a contém, já
// nas coordenadas dele. Devolve { [arquivo]: { adicionar, remover } } ou texto de erro.
function pedidosDo3d(corpo, an) {
  const dados = Array.isArray(an.dados_extraidos) ? an.dados_extraidos : [];
  const comMapa = dados.filter(d => d?.mapa_cad?.simbolos);
  if (!comMapa.length) return 'Esta análise não tem planta do CAD para gravar as edições do 3D.';
  const membros = an.compatibilizacao?.grupos?.[0]?.membros || [];
  const referencia = an.espacial?.referencia || an.compatibilizacao?.referencia || null;
  const candidatos = comMapa.map(d => {
    const nome = d.mapa_cad.arquivo || d.arquivo;
    const m = membros.find(x => x.arquivo === nome);
    return { nome, dx: m?.dx || 0, dy: m?.dy || 0, noGrupo: !!m || nome === referencia || !membros.length, ext: d.mapa_cad.planta?.extensao || null };
  }).filter(c => c.noGrupo);
  if (!candidatos.length) return 'Os arquivos com planta do CAD não estão alinhados ao 3D: edite pela planta do Mapa do CAD.';
  const contem = (c, x, y) => Array.isArray(c.ext) && x - c.dx >= c.ext[0] - 2 && x - c.dx <= c.ext[2] + 2 && y - c.dy >= c.ext[1] - 2 && y - c.dy <= c.ext[3] + 2;
  const porArquivo = {};
  const incluir = (lista, item) => {
    const x = Number(item?.x), y = Number(item?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const c = candidatos.find(k => contem(k, x, y)) || candidatos.find(k => k.nome === referencia) || candidatos[0];
    const p = porArquivo[c.nome] || (porArquivo[c.nome] = { adicionar: [], remover: [] });
    p[lista].push({ ...item, x: Math.round((x - c.dx) * 1000) / 1000, y: Math.round((y - c.dy) * 1000) / 1000 });
  };
  for (const a of Array.isArray(corpo?.adicionar) ? corpo.adicionar.slice(0, 500) : []) incluir('adicionar', a);
  for (const r of Array.isArray(corpo?.remover) ? corpo.remover.slice(0, 500) : []) incluir('remover', r);
  if (!Object.keys(porArquivo).length) return 'Nada para alterar.';
  return porArquivo;
}

// PUT /projetos/analises/:id/mapa/edicoes { arquivo, adicionar: [{ simbolo, x, y, altura_m?, rotulo? }], remover: [{ x, y, simbolo?, linha? }],
// desfazer: [id] } — componentes inseridos e retirados pelo engenheiro (services/edicoesDoMapa.js). O 3D mostra na hora;
// o orçamento muda no reprocessamento (a mesma regra do tipo confirmado no mapa).
// { sistema: '3d', adicionar, remover } (sem arquivo): pedido do modo de edição do 3D, nas coordenadas do 3D.
async function editar(req, res) {
  const { id } = req.params;
  const corpo = req.body || {};
  let resultado;
  try {
    resultado = await comTransacao(async (client) => {
      const { rows: [a] } = await client.query('SELECT dados_extraidos, compatibilizacao, espacial FROM analises_projeto WHERE id = $1 FOR UPDATE', [id]);
      if (!a) throw Object.assign(new Error('Análise não encontrada'), { status: 404 });
      const dados = Array.isArray(a.dados_extraidos) ? a.dados_extraidos : [];
      let pedidos;
      if (corpo.sistema === '3d') {
        pedidos = pedidosDo3d(corpo, a);
        if (typeof pedidos === 'string') throw Object.assign(new Error(pedidos), { status: 400 });
      } else {
        pedidos = { [corpo.arquivo]: { adicionar: corpo.adicionar, remover: corpo.remover, desfazer: corpo.desfazer } };
      }
      const resumo = { adicionados: 0, removidos: 0, desfeitos: 0 };
      for (const [arquivo, pedido] of Object.entries(pedidos)) {
        const i = dados.findIndex(d => d?.mapa_cad?.simbolos && (d.mapa_cad.arquivo || d.arquivo) === arquivo);
        if (i < 0) throw Object.assign(new Error('Esta análise não tem planta do CAD para esse arquivo (análise feita antes do mapa, ou arquivo que não é DWG/DXF).'), { status: 404 });
        const erro = edicoesDoMapa.validarPedido(pedido, dados[i].mapa_cad);
        if (erro) throw Object.assign(new Error(erro), { status: 400 });
        const r = edicoesDoMapa.aplicarPedido(dados[i].mapa_cad.edicoes, pedido, req.usuario.id);
        dados[i] = { ...dados[i], mapa_cad: { ...dados[i].mapa_cad, edicoes: r.edicoes, edicoesNoOrcamento: false } };
        for (const k of Object.keys(resumo)) resumo[k] += r.resumo[k];
      }
      await client.query('UPDATE analises_projeto SET dados_extraidos = $1 WHERE id = $2', [JSON.stringify(dados), id]);
      await registrarAuditoria(client, {
        entidade: 'analises_projeto', entidadeId: Number(id), acao: 'mapa_cad_componentes', usuarioId: req.usuario.id,
        detalhes: { arquivos: Object.keys(pedidos), origem: corpo.sistema === '3d' ? '3d' : 'planta', ...resumo,
          inseridos: Object.values(pedidos).flatMap(p => (p.adicionar || []).map(x => x.simbolo)).slice(0, 50) },
      });
      return { dados, resumo };
    });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
  res.json({ ...respostaDoMapa(resultado.dados), resumo: resultado.resumo });
}

// POST /projetos/analises/:id/mapa/reprocessar { incluirDisciplinas } — lê de novo os arquivos guardados na pasta do
// projeto, com os tipos conferidos, e grava uma análise NOVA (a antiga fica como está). As edições da antiga (quantidade,
// valor, itens retirados ou acrescentados) vão junto (services/edicoesDaAnalise.js). Disciplina com ponto conferido que não
// tinha sido marcada no envio entra na análise nova, salvo `incluirDisciplinas: false`.
// Análise feita antes do mapa (semMapaComCad) ou do desenho de fundo (mapaSemFundo): reprocessa sem confirmação — a
// análise nova vem com o mapa completo para conferir.
async function reprocessar(req, res) {
  const { rows: [a] } = await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [req.params.id]);
  if (!a) return res.status(404).json({ erro: 'Análise não encontrada' });
  const semMapa = semMapaComCad(a) || mapaSemFundo(a);
  const mapas = arquivosComMapa(a.dados_extraidos);
  const mapasConfirmados = {};
  const mapasEditados = {}; // arquivo → componentes inseridos/retirados (services/edicoesDoMapa.js)
  const disciplinasExtras = {}; // arquivo → disciplinas conferidas que faltavam na marcação do envio
  for (const d of mapas) {
    const confirmadas = mapaCad.confirmadasDoMapa(d.mapa_cad);
    const nome = d.mapa_cad.arquivo || d.arquivo;
    if (confirmadas.length) mapasConfirmados[nome] = confirmadas;
    if (edicoesDoMapa.temEdicoes(d.mapa_cad.edicoes)) mapasEditados[nome] = d.mapa_cad.edicoes;
    if (req.body?.incluirDisciplinas !== false) disciplinasExtras[nome] = mapaCad.disciplinasAIncluir(d.mapa_cad, d.disciplinas).map(x => x.chave);
  }
  const comEdicao = Object.keys(mapasConfirmados).length + Object.keys(mapasEditados).length > 0;
  if (!semMapa && !comEdicao) return res.status(400).json({ erro: 'Confirme o tipo de ao menos uma layer, ou insira/retire um componente na planta, antes de reprocessar.' });

  // os arquivos originais ficam na pasta do projeto; os que não estão na lista da análise eram referência (arquitetura etc.)
  let pasta;
  try { pasta = path.join(await pastaDoProjeto(a), SUBPASTA_ARQUIVOS); } catch (e) { return res.status(409).json({ erro: `Não consegui abrir a pasta do projeto: ${e.message}` }); }
  const analisados = Array.isArray(a.arquivos_analisados) ? a.arquivos_analisados : [];
  let noDisco;
  try { noDisco = (await fsp.readdir(pasta)).filter(n => RE_ARQUIVO_DE_PROJETO.test(n)); } catch { noDisco = []; }
  const arquivos = [];
  const faltando = [];
  for (const q of analisados) {
    const nome = P.nomeSeguro(q.arquivo, 'arquivo');
    if (!noDisco.includes(nome)) { faltando.push(q.arquivo); continue; }
    arquivos.push({ buffer: await fsp.readFile(path.join(pasta, nome)), nomeArquivo: q.arquivo, disciplinas: [...new Set([...(q.disciplinas || []), ...(disciplinasExtras[q.arquivo] || [])])], ...(q.escala ? { escala: q.escala } : {}) });
  }
  if (faltando.length) return res.status(409).json({ erro: `Os arquivos originais não estão mais na pasta do projeto (${faltando.slice(0, 3).join(', ')}). Envie o projeto de novo para analisar.` });
  const nomesAnalisados = new Set(analisados.map(q => P.nomeSeguro(q.arquivo, 'arquivo')));
  for (const nome of noDisco) {
    if (nomesAnalisados.has(nome) || !ehArquivoCad(nome)) continue;
    arquivos.push({ buffer: await fsp.readFile(path.join(pasta, nome)), nomeArquivo: nome, disciplinas: [], referencia: true });
  }
  if (!arquivos.length) return res.status(409).json({ erro: 'Não há arquivos do projeto para reprocessar.' });

  const base = String(a.nome_projeto || a.cliente_nome || 'Projeto').replace(/\s*\((mapa confirmado|lida de novo)\)$/, '');
  const corpo = { finalidade: a.finalidade || 'orcamento', obra_id: a.obra_id, nome_projeto: `${base} (${comEdicao ? 'mapa confirmado' : 'lida de novo'})`.slice(0, 200) };
  await executarAnalise(req, res, arquivos, corpo, { mapasConfirmados, mapasEditados, analiseAnterior: a });
}

// PUT /projetos/analises/:id/mapa/blocos { arquivo, bloco, descricao, disciplina } — o engenheiro diz o que é um bloco
// nomeado (não identificado, ou reconhecido só pelo que outra prancha ensinou): vira aprendizado CONFIRMADO
// (services/blocosAprendidos.confirmar, origem 'usuario') para o escritório do carimbo — ou, sem carimbo, para a
// disciplina. Entra no orçamento desta análise ao reprocessar (a releitura já reconhece o bloco).
async function confirmarBloco(req, res) {
  const { id } = req.params;
  const { arquivo, bloco, descricao, disciplina } = req.body || {};
  if (!DISCIPLINAS.some(d => d.chave === disciplina)) return res.status(400).json({ erro: 'Escolha a disciplina do bloco.' });
  let resultado;
  try {
    resultado = await comTransacao(async (client) => {
      const { rows: [a] } = await client.query('SELECT dados_extraidos, obra_id FROM analises_projeto WHERE id = $1 FOR UPDATE', [id]);
      if (!a) throw Object.assign(new Error('Análise não encontrada'), { status: 404 });
      const dados = Array.isArray(a.dados_extraidos) ? a.dados_extraidos : [];
      const i = dados.findIndex(x => x?.mapa_cad && (x.mapa_cad.arquivo || x.arquivo) === arquivo);
      if (i < 0) throw Object.assign(new Error('Esta análise não tem mapa do CAD para esse arquivo.'), { status: 404 });
      const blocos = dados[i].mapa_cad.blocos || [];
      if (!blocos.some(b => b.bloco === bloco)) throw Object.assign(new Error('Bloco não encontrado neste arquivo: atualize a tela.'), { status: 400 });
      const linha = await blocosAprendidos.confirmar({ nome: bloco, escritorio: dados[i].mapa_cad.escritorio || '', descricao, disciplina, fonte: fonteDaAnalise(a, id), arquivo }, client);
      // fica guardado na análise: o reprocessamento conta o bloco como conferido (mapaCad.confirmadasDoMapa)
      dados[i] = { ...dados[i], mapa_cad: { ...dados[i].mapa_cad, blocos: blocos.map(b => (b.bloco === bloco ? { ...b, situacao: 'confirmado', descricao: linha.descricao, disciplina } : b)) } };
      await client.query('UPDATE analises_projeto SET dados_extraidos = $1 WHERE id = $2', [JSON.stringify(dados), id]);
      await registrarAuditoria(client, {
        entidade: 'analises_projeto', entidadeId: Number(id), acao: 'mapa_cad_bloco', usuarioId: req.usuario.id,
        detalhes: { arquivo, bloco, descricao: linha.descricao, disciplina },
      });
      return { dados, linha };
    });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
  res.json({ ...respostaDoMapa(resultado.dados), bloco: resultado.linha });
}

// ── Biblioteca de blocos (fase 3, CAD-08): o que o sistema aprendeu, em JSON, para levar a outra instalação ──
// GET /projetos/biblioteca-blocos → o arquivo (services/simbolosAprendidos.exportar)
async function exportarBiblioteca(req, res) {
  const json = await simbolosAprendidos.exportar();
  res.setHeader('Content-Disposition', `attachment; filename="biblioteca-blocos-hm-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(json);
}

// POST /projetos/biblioteca-blocos (só administrador) { formato: 'hm-biblioteca-blocos', linhas: [...] }
// O que esta instalação já tem conferido pelo usuário não é trocado por linha de legenda importada.
async function importarBiblioteca(req, res) {
  const { linhas, erros } = simbolosAprendidos.validarBiblioteca(req.body, new Set(mapaCad.tiposDisponiveis().map(t => t.simbolo)));
  if (!linhas.length) return res.status(400).json({ erro: erros[0] || 'A biblioteca não tem linhas.', erros: erros.slice(0, 20) });
  const r = await simbolosAprendidos.importar(linhas, `biblioteca importada por ${req.usuario.nome || req.usuario.email || req.usuario.id}`);
  await registrarAuditoria(pool, {
    entidade: 'cad_simbolos_aprendidos', entidadeId: null, acao: 'importar_biblioteca', usuarioId: req.usuario.id,
    detalhes: { linhas: linhas.length, gravadas: r.gravadas, mantidas: r.mantidas, recusadas: erros.length },
  });
  res.json({ ...r, recusadas: erros.length, erros: erros.slice(0, 20) });
}

module.exports = { ler, salvar, editar, reprocessar, confirmarBloco, exportarBiblioteca, importarBiblioteca };
