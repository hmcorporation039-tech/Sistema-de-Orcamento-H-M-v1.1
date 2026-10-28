// Pacote de arquivos de projeto (versão 2.3): o cliente/arquiteto manda uma
// pasta ou um ZIP com tudo (arquitetura, elétrica, rede, incêndio…). Em dois passos:
//   1) receber: guarda os arquivos numa pasta temporária (ZIP aberto aqui,
//      inclusive ZIP dentro de ZIP), descarta o que não é PDF/DWG/DXF e sugere
//      a disciplina de cada um (utils/classificarArquivoProjeto.js);
//   2) analisar: o usuário confere/ajusta as disciplinas na tela e a análise
//      roda com os arquivos já guardados (sem enviar de novo).
// O pacote vale 3 h e é de quem enviou; some depois da análise.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const { sugerirDisciplinas } = require('../utils/classificarArquivoProjeto');
const { extrairTexto } = require('../utils/projetoParser');

const RAIZ = path.join(os.tmpdir(), 'hm-pacotes-projeto');
const VALIDADE_MS = 3 * 60 * 60 * 1000;
const MAX_ARQUIVOS = 60;
const MAX_ARQUIVO_BYTES = 40 * 1024 * 1024;
const MAX_ZIP_DESCOMPACTADO = 600 * 1024 * 1024; // contra "zip bomb"
const RE_ACEITO = /\.(pdf|dwg|dxf)$/i;
// lixo de sistema e de backup do AutoCAD
const RE_LIXO = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)|\.(bak|dwl2?|sv\$|tmp)$/i;

const erro = (status, mensagem) => Object.assign(new Error(mensagem), { status });
const nomeSeguro = (s) => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').slice(0, 180);
const tokenValido = (t) => /^[0-9a-f]{40}$/.test(String(t));

function limparVencidos() {
  try {
    for (const d of fs.readdirSync(RAIZ)) {
      const p = path.join(RAIZ, d);
      const st = fs.statSync(p);
      if (Date.now() - st.mtimeMs > VALIDADE_MS) fs.rmSync(p, { recursive: true, force: true });
    }
  } catch { /* pasta ainda não existe */ }
}

// Conteúdo para a sugestão de disciplina: texto do PDF; DXF de texto direto; DWG só pelo nome
async function textoParaSugestao(buffer, nome) {
  try {
    if (/\.pdf$/i.test(nome)) return (await extrairTexto(buffer)).slice(0, 400000);
    if (/\.dxf$/i.test(nome)) return buffer.subarray(0, 3 * 1024 * 1024).toString('utf8');
  } catch { /* PDF ilegível: fica só o nome */ }
  return null;
}

// arquivosRecebidos: [{ originalname, buffer ou path (arquivo temporário do upload), caminho (pasta relativa, se veio de pasta) }]
async function receberPacote(arquivosRecebidos, usuario) {
  limparVencidos();
  const token = crypto.randomBytes(20).toString('hex');
  const dir = path.join(RAIZ, token);
  fs.mkdirSync(dir, { recursive: true });
  const itens = [];
  const ignorados = [];
  let descompactado = 0;

  const aceitar = async (nome, caminho, buffer) => {
    if (RE_LIXO.test(caminho || nome)) return;
    if (!RE_ACEITO.test(nome)) { ignorados.push({ nome: caminho || nome, motivo: 'não é PDF, DWG nem DXF' }); return; }
    if (buffer.length > MAX_ARQUIVO_BYTES) { ignorados.push({ nome: caminho || nome, motivo: 'acima de 40 MB' }); return; }
    if (itens.length >= MAX_ARQUIVOS) { ignorados.push({ nome: caminho || nome, motivo: `limite de ${MAX_ARQUIVOS} arquivos por pacote` }); return; }
    const id = String(itens.length + 1);
    fs.writeFileSync(path.join(dir, `${id}.bin`), buffer);
    const sugestao = sugerirDisciplinas(`${caminho || ''} ${nome}`, await textoParaSugestao(buffer, nome));
    itens.push({ id, nome, caminho: caminho || nome, tipo: nome.split('.').pop().toLowerCase(), tamanho: buffer.length, sugestao });
  };

  const abrirZip = async (buffer, prefixo, prof) => {
    let zip;
    try { zip = await JSZip.loadAsync(buffer); } catch { ignorados.push({ nome: prefixo || 'ZIP', motivo: 'ZIP corrompido ou protegido por senha' }); return; }
    for (const ent of Object.values(zip.files)) {
      if (ent.dir) continue;
      const caminho = `${prefixo}${ent.name}`;
      const nome = path.posix.basename(ent.name);
      if (RE_LIXO.test(caminho)) continue;
      const dados = await ent.async('nodebuffer');
      descompactado += dados.length;
      if (descompactado > MAX_ZIP_DESCOMPACTADO) throw erro(400, 'O ZIP descompactado passa de 600 MB — envie em partes.');
      if (/\.zip$/i.test(nome) && prof < 2) await abrirZip(dados, `${caminho}/`, prof + 1);
      else await aceitar(nome, caminho, dados);
    }
  };

  try {
    // um por vez, lido do disco na hora (o upload fica em arquivo temporário)
    for (const f of arquivosRecebidos) {
      const buffer = f.buffer || fs.readFileSync(f.path);
      if (/\.zip$/i.test(f.originalname)) await abrirZip(buffer, `${f.caminho || f.originalname}/`, 0);
      else await aceitar(f.originalname, f.caminho, buffer);
    }
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  }
  if (!itens.length) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw erro(400, `Nenhum PDF, DWG ou DXF no que foi enviado${ignorados.length ? ` (${ignorados.length} arquivo(s) ignorado(s))` : ''}.`);
  }
  fs.writeFileSync(path.join(dir, 'pacote.json'), JSON.stringify({ usuario_id: usuario.id, criado_em: new Date().toISOString(), itens }));
  return { token, arquivos: itens, ignorados, validade_horas: VALIDADE_MS / 3600000 };
}

function manifesto(token, usuario) {
  if (!tokenValido(token)) throw erro(404, 'Pacote não encontrado ou vencido. Envie os arquivos de novo.');
  const dir = path.join(RAIZ, token);
  let m;
  try { m = JSON.parse(fs.readFileSync(path.join(dir, 'pacote.json'), 'utf8')); } catch { throw erro(404, 'Pacote não encontrado ou vencido. Envie os arquivos de novo.'); }
  if (m.usuario_id !== usuario.id && usuario.role !== 'admin') throw erro(403, 'Este pacote foi enviado por outro usuário.');
  return { dir, ...m };
}

// escolhas: [{ id, disciplinas, referencia, tipoReferencia }] — só os escolhidos entram
function arquivosDoPacote(token, usuario, escolhas) {
  const m = manifesto(token, usuario);
  const porId = new Map(m.itens.map(i => [i.id, i]));
  const out = [];
  for (const e of escolhas || []) {
    const it = porId.get(String(e.id));
    if (!it) throw erro(400, `Arquivo ${e.id} não está no pacote.`);
    out.push({
      buffer: fs.readFileSync(path.join(m.dir, `${it.id}.bin`)),
      nomeArquivo: nomeSeguro(it.nome),
      caminho: it.caminho,
      disciplinas: Array.isArray(e.disciplinas) ? e.disciplinas : [],
      referencia: e.referencia === true,
      tipoReferencia: e.referencia === true ? (e.tipoReferencia || it.sugestao?.tipoReferencia || null) : null,
    });
  }
  return out;
}

function descartarPacote(token, usuario) {
  try { const m = manifesto(token, usuario); fs.rmSync(m.dir, { recursive: true, force: true }); } catch { /* já não existe */ }
}

module.exports = { receberPacote, arquivosDoPacote, descartarPacote, manifesto, MAX_ARQUIVOS };
