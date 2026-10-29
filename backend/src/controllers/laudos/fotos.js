// Projetos e laudos por disciplina — fotos da inspeção: envio, visualização e
// exclusão (no banco, com cópia na pasta do registro) e a preparação das fotos
// para o gerador de documentos da skill (só fotos deste registro).
const fs = require('fs');
const os = require('os');
const path = require('path');
const pool = require('../../config/database');
const { comTransacao } = require('../../services/transacao');
const P = require('../../services/pastasSistema');
const { tipoPorConteudo } = require('../../utils/tipoArquivo');
const { pastaDoLaudo, seguro } = require('../../services/pastasRegistros');
const { carregarLaudo } = require('./comum');

const TIPOS_FOTO = { 'image/jpeg': 'jpg', 'image/png': 'png' };

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

module.exports = { enviarFotos, verFoto, removerFoto, prepararFotos };
