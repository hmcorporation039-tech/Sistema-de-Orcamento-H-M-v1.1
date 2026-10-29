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
// onde o multer grava o upload (routes/v2/pacotesProjeto.js): fica aqui para a
// limpeza por idade cuidar das duas pastas
const PASTA_UPLOAD = path.join(os.tmpdir(), 'hm-pacotes-upload');
const VALIDADE_MS = 3 * 60 * 60 * 1000;
const MAX_ARQUIVOS = 60;
const MAX_ARQUIVO_BYTES = 40 * 1024 * 1024;
// ZIP inteiro (arquivo em disco ou ZIP dentro de ZIP): acima disso nem é aberto
const MAX_ZIP_BYTES = 200 * 1024 * 1024;
const MAX_ZIP_DESCOMPACTADO = 600 * 1024 * 1024; // contra "zip bomb"
const RE_ACEITO = /\.(pdf|dwg|dxf)$/i;
const RE_ZIP = /\.zip$/i;
// lixo de sistema e de backup do AutoCAD
const RE_LIXO = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)|\.(bak|dwl2?|sv\$|tmp)$/i;

const erro = (status, mensagem) => Object.assign(new Error(mensagem), { status });
const nomeSeguro = (s) => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').slice(0, 180);
const tokenValido = (t) => /^[0-9a-f]{40}$/.test(String(t));
const mb = (n) => `${Math.round(n / (1024 * 1024))} MB`;

// Apaga o que passou da validade numa pasta temporária (pacote não analisado,
// upload de um pedido que caiu no meio). Sem isso o disco do servidor enche aos
// poucos: o pacote só some sozinho quando a análise termina.
function limparPastaPorIdade(raiz, idadeMs = VALIDADE_MS) {
  let removidos = 0;
  try {
    for (const d of fs.readdirSync(raiz)) {
      const p = path.join(raiz, d);
      try {
        if (Date.now() - fs.statSync(p).mtimeMs > idadeMs) { fs.rmSync(p, { recursive: true, force: true }); removidos++; }
      } catch { /* sumiu entre o readdir e o stat, ou está aberto: fica para a próxima */ }
    }
  } catch { /* pasta ainda não existe */ }
  return removidos;
}

function limparVencidos() { limparPastaPorIdade(RAIZ); }

// As duas pastas temporárias do pacote (pacotes guardados e uploads do multer)
function limparTemporarios() {
  return limparPastaPorIdade(RAIZ) + limparPastaPorIdade(PASTA_UPLOAD);
}

// Na partida do servidor e a cada 30 min (server.js). unref: o relógio não
// segura o processo vivo (testes e desligamento ordenado terminam normalmente).
let relogioLimpeza = null;
function agendarLimpezaTemporarios(intervaloMs = 30 * 60 * 1000) {
  limparTemporarios();
  if (relogioLimpeza) return relogioLimpeza;
  relogioLimpeza = setInterval(limparTemporarios, intervaloMs);
  relogioLimpeza.unref();
  return relogioLimpeza;
}

// Descompacta uma entrada do ZIP parando assim que passar do tamanho declarado:
// o índice do ZIP pode mentir (declara 1 KB e tem 2 GB), e o JSZip só confere o
// tamanho real DEPOIS de descompactar tudo na memória.
function descompactarAteODeclarado(ent, declarado) {
  return new Promise((ok, falha) => {
    const partes = [];
    let total = 0;
    let fim = false;
    const s = ent.internalStream('nodebuffer');
    s.on('data', (pedaco) => {
      if (fim) return;
      total += pedaco.length;
      if (total > declarado) { fim = true; s.pause(); falha(new Error('maior que o tamanho declarado no ZIP')); return; }
      partes.push(pedaco);
    });
    s.on('error', (e) => { if (!fim) { fim = true; falha(e); } });
    s.on('end', () => { if (!fim) { fim = true; ok(Buffer.concat(partes, total)); } });
    s.resume();
  });
}

// Por que um arquivo não entra no pacote, decidido só pelo nome e pelo tamanho
// (declarado no ZIP ou do arquivo em disco) — ANTES de descompactar ou ler.
// null = entra; 'lixo' = descarta calado; texto = vai para "ignorados".
function motivoParaIgnorar(nome, caminho, tamanho) {
  if (RE_LIXO.test(caminho || nome)) return 'lixo';
  if (RE_ZIP.test(nome)) return tamanho > MAX_ZIP_BYTES ? `ZIP acima de ${mb(MAX_ZIP_BYTES)}` : null;
  if (!RE_ACEITO.test(nome)) return 'não é PDF, DWG nem DXF';
  if (tamanho > MAX_ARQUIVO_BYTES) return 'acima de 40 MB';
  return null;
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
// opcoes.nomeSugerido: nome do projeto quando o usuário não der um (pacote da
// pasta da obra ou das novidades → o nome da obra, não o da subpasta)
async function receberPacote(arquivosRecebidos, usuario, { nomeSugerido = null } = {}) {
  limparVencidos();
  const token = crypto.randomBytes(20).toString('hex');
  const dir = path.join(RAIZ, token);
  fs.mkdirSync(dir, { recursive: true });
  const itens = [];
  const ignorados = [];
  let descompactado = 0;

  // lixo some calado; o resto aparece na tela como "ignorado" com o motivo
  const ignorar = (nome, caminho, motivo) => {
    if (motivo !== 'lixo') ignorados.push({ nome: caminho || nome, motivo });
  };
  const cheio = () => itens.length >= MAX_ARQUIVOS;
  const motivoCheio = `limite de ${MAX_ARQUIVOS} arquivos por pacote`;

  const aceitar = async (nome, caminho, buffer) => {
    const motivo = motivoParaIgnorar(nome, caminho, buffer.length);
    if (motivo) { ignorar(nome, caminho, motivo); return; }
    if (cheio()) { ignorar(nome, caminho, motivoCheio); return; }
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
      const ehZip = RE_ZIP.test(nome);
      if (ehZip && prof >= 2) { ignorar(nome, caminho, 'ZIP dentro de ZIP em mais de 2 níveis'); continue; }
      // ZIP-bomba: decide pelo tamanho DECLARADO no índice do ZIP, antes de
      // descompactar (descompactar primeiro já ocupava a memória toda)
      const declarado = Number(ent._data?.uncompressedSize);
      const tamanho = Number.isFinite(declarado) && declarado >= 0 ? declarado : 0;
      const motivo = motivoParaIgnorar(nome, caminho, tamanho);
      if (motivo) { ignorar(nome, caminho, motivo); continue; }
      if (!ehZip && cheio()) { ignorar(nome, caminho, motivoCheio); continue; }
      if (descompactado + tamanho > MAX_ZIP_DESCOMPACTADO) throw erro(400, 'O ZIP descompactado passa de 600 MB — envie em partes.');
      descompactado += tamanho;
      let dados;
      // tamanho real diferente do declarado (para no que passar; o menor o JSZip recusa no fim)
      try { dados = await descompactarAteODeclarado(ent, tamanho); } catch { ignorar(nome, caminho, 'arquivo corrompido dentro do ZIP'); continue; }
      descompactado += dados.length - tamanho;
      if (descompactado > MAX_ZIP_DESCOMPACTADO) throw erro(400, 'O ZIP descompactado passa de 600 MB — envie em partes.');
      if (ehZip) await abrirZip(dados, `${caminho}/`, prof + 1);
      else await aceitar(nome, caminho, dados);
    }
  };

  try {
    // um por vez, lido do disco na hora (o upload fica em arquivo temporário);
    // o tamanho em disco é conferido ANTES de ler, para não carregar à toa
    for (const f of arquivosRecebidos) {
      const tamanho = f.buffer ? f.buffer.length : fs.statSync(f.path).size;
      const motivo = motivoParaIgnorar(f.originalname, f.caminho, tamanho);
      if (motivo) { ignorar(f.originalname, f.caminho, motivo); continue; }
      const ehZip = RE_ZIP.test(f.originalname);
      if (!ehZip && cheio()) { ignorar(f.originalname, f.caminho, motivoCheio); continue; }
      const buffer = f.buffer || fs.readFileSync(f.path);
      if (ehZip) await abrirZip(buffer, `${f.caminho || f.originalname}/`, 0);
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
  fs.writeFileSync(path.join(dir, 'pacote.json'), JSON.stringify({ usuario_id: usuario.id, criado_em: new Date().toISOString(), nome_sugerido: nomeSugerido, itens }));
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
// Tudo é conferido ANTES de ler qualquer arquivo do disco: uma lista com o
// mesmo id repetido milhares de vezes carregava o mesmo DWG milhares de vezes
// na memória (e derrubava o servidor).
function arquivosDoPacote(token, usuario, escolhas) {
  const m = manifesto(token, usuario);
  const lista = Array.isArray(escolhas) ? escolhas : [];
  if (lista.length > m.itens.length || lista.length > MAX_ARQUIVOS) {
    throw erro(400, `Foram escolhidos ${lista.length} arquivos, mas o pacote tem ${m.itens.length} (máximo de ${MAX_ARQUIVOS}).`);
  }
  const porId = new Map(m.itens.map(i => [i.id, i]));
  const vistos = new Set();
  const validas = [];
  for (const e of lista) {
    const id = String(e?.id);
    const it = porId.get(id);
    if (!it) throw erro(400, `Arquivo ${e?.id} não está no pacote.`);
    if (vistos.has(id)) continue; // mesmo arquivo duas vezes: vale a primeira escolha
    vistos.add(id);
    validas.push({ e, it });
  }
  const out = [];
  for (const { e, it } of validas) {
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

module.exports = {
  receberPacote, arquivosDoPacote, descartarPacote, manifesto,
  PASTA_UPLOAD, limparPastaPorIdade, agendarLimpezaTemporarios,
};
