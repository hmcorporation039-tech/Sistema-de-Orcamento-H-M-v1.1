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
const { executarAnalise } = require('./analises');

const SUBPASTA_ARQUIVOS = 'Arquivos do projeto';
const RE_ARQUIVO_DE_PROJETO = /\.(pdf|dwg|dxf)$/i;

const arquivosComMapa = (dados) => (Array.isArray(dados) ? dados : []).filter(d => d?.mapa_cad?.simbolos);
const respostaDoMapa = (dados) => ({
  disponivel: arquivosComMapa(dados).length > 0,
  arquivos: arquivosComMapa(dados).map(d => ({ ...d.mapa_cad, arquivo: d.mapa_cad.arquivo || d.arquivo, resumo: mapaCad.resumoDoMapa(d.mapa_cad) })),
  tipos: mapaCad.tiposDisponiveis(),
});

// GET /projetos/analises/:id/mapa
async function ler(req, res) {
  const { rows: [a] } = await pool.query('SELECT dados_extraidos FROM analises_projeto WHERE id = $1', [req.params.id]);
  if (!a) return res.status(404).json({ erro: 'Análise não encontrada' });
  res.json(respostaDoMapa(a.dados_extraidos));
}

// PUT /projetos/analises/:id/mapa { arquivo, linhas: [{ idx, simbolo, altura_m, confirmado }] }
// confirmado: false desfaz a confirmação da linha (volta ao proposto e esquece o que ela ensinou)
async function salvar(req, res) {
  const { id } = req.params;
  const { arquivo, linhas } = req.body || {};
  let resultado;
  try {
    resultado = await comTransacao(async (client) => {
      const { rows: [a] } = await client.query('SELECT dados_extraidos FROM analises_projeto WHERE id = $1 FOR UPDATE', [id]);
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
      return { dados, alteradas };
    });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
  // aprendizado fora da transação: se falhar, a correção da análise já está salva
  const aprendidas = await mapaCad.aprender(resultado.alteradas, arquivo);
  const esquecidas = await mapaCad.esquecer(resultado.alteradas);
  res.json({ ...respostaDoMapa(resultado.dados), aprendidas, esquecidas });
}

// POST /projetos/analises/:id/mapa/reprocessar — lê de novo os arquivos guardados na pasta do projeto, com os
// tipos conferidos, e grava uma análise NOVA (a antiga e as edições dela ficam como estão)
async function reprocessar(req, res) {
  const { rows: [a] } = await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [req.params.id]);
  if (!a) return res.status(404).json({ erro: 'Análise não encontrada' });
  const mapas = arquivosComMapa(a.dados_extraidos);
  const mapasConfirmados = {};
  for (const d of mapas) {
    const confirmadas = mapaCad.confirmadasDoMapa(d.mapa_cad);
    if (confirmadas.length) mapasConfirmados[d.mapa_cad.arquivo || d.arquivo] = confirmadas;
  }
  if (!Object.keys(mapasConfirmados).length) return res.status(400).json({ erro: 'Confirme o tipo de ao menos uma layer no mapa antes de reprocessar.' });

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
    arquivos.push({ buffer: await fsp.readFile(path.join(pasta, nome)), nomeArquivo: q.arquivo, disciplinas: q.disciplinas || [] });
  }
  if (faltando.length) return res.status(409).json({ erro: `Os arquivos originais não estão mais na pasta do projeto (${faltando.slice(0, 3).join(', ')}). Envie o projeto de novo para analisar.` });
  const nomesAnalisados = new Set(analisados.map(q => P.nomeSeguro(q.arquivo, 'arquivo')));
  for (const nome of noDisco) {
    if (nomesAnalisados.has(nome) || !ehArquivoCad(nome)) continue;
    arquivos.push({ buffer: await fsp.readFile(path.join(pasta, nome)), nomeArquivo: nome, disciplinas: [], referencia: true });
  }
  if (!arquivos.length) return res.status(409).json({ erro: 'Não há arquivos do projeto para reprocessar.' });

  const base = String(a.nome_projeto || a.cliente_nome || 'Projeto').replace(/\s*\(mapa confirmado\)$/, '');
  const corpo = { finalidade: a.finalidade || 'orcamento', obra_id: a.obra_id, nome_projeto: `${base} (mapa confirmado)`.slice(0, 200) };
  await executarAnalise(req, res, arquivos, corpo, { mapasConfirmados });
}

module.exports = { ler, salvar, reprocessar };
