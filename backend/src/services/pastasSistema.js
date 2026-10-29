const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');
const { RAIZ_REPOSITORIO } = require('../config/caminhos');
const { execFile } = require('child_process');
const { cortarTexto } = require('../utils/nomeArquivoDownload');
const { hojeBrasilia } = require('../utils/dataHoje');

// Pasta exclusiva do sistema, com uma subpasta por projeto analisado e por
// laudo (pedido do usuário, 11/10/2026):
//   <base>/Projetos/<nome do projeto>/   — arquivos recebidos, relatório, orçamento, dados
//   <base>/Laudos/<nome do laudo>/       — documentos (Word/Excel), fotos, orçamento, dados
// A base padrão é C:\HM-Engenharia\Arquivos do Sistema (local, sempre
// disponível para o backend); muda pelo .env em PASTA_ARQUIVOS_SISTEMA (ex.:
// uma pasta no \\MARCIO-SERVER). Cada arquivo tem nome fixo e é SOBRESCRITO a
// cada nova versão — nada de "_v2", "_R01" acumulando espaço. Quando o nome do
// projeto/laudo muda, a pasta é renomeada; quando o registro é excluído no
// sistema, a pasta vai para "_Excluídos" (não é apagada às cegas).
const BASE = process.env.PASTA_ARQUIVOS_SISTEMA || path.join(RAIZ_REPOSITORIO, '..', 'Arquivos do Sistema');
// Versão 2.0 (Fase 2D): cada obra tem a sua pasta em Obras\<nome da obra>;
// análise/laudo NOVO ligado a uma obra grava dentro dela (Projeto,
// Laudos\<disciplina>) — quem decide a raiz é services/pastasRegistros.js.
// Versão 2.1: 'projeto_disciplina' = projeto por disciplina (laudos_projetos com
// tipo 'projeto'); sem obra, mora em Projetos\<nome>, ao lado das análises.
const RAIZES = { projeto: path.join(BASE, 'Projetos'), laudo: path.join(BASE, 'Laudos'), obra: path.join(BASE, 'Obras'), projeto_disciplina: path.join(BASE, 'Projetos') };
const LETRA = { projeto: 'A', laudo: 'L', obra: 'O', projeto_disciplina: 'P', cliente: 'C' };
const PADRAO = { projeto: 'Projeto', laudo: 'Laudo', obra: 'Obra', projeto_disciplina: 'Projeto', cliente: 'Cliente' };
const EXCLUIDOS = path.join(BASE, '_Excluídos');
const RESERVADOS = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

// Nome válido de pasta/arquivo no Windows. O corte em 90 não parte emoji ao
// meio (antes ficava meio caractere, gravado como "\uFFFD" no nome da pasta).
function nomeSeguro(nome, padrao = 'Sem nome') {
  let s = cortarTexto(String(nome || '').replace(/[<>:"/\\|?*\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/[. ]+$/, ''), 90).replace(/[. ]+$/, ''); // de novo: o corte pode terminar em ponto (o Windows o descartaria)
  if (!s || RESERVADOS.test(s)) s = padrao;
  return s;
}

const caminhoDe = (tipo, pasta) => path.join(RAIZES[tipo], pasta);
async function existe(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

// Garante a pasta do registro com o nome atual. `tabela`/`id` identificam o
// registro; a coluna `pasta` guarda o nome em uso (para renomear depois).
// Nome repetido em outro registro ganha o sufixo " (A14)" / " (L3)" / " (O2)".
// `raiz` troca a pasta-mãe (padrão RAIZES[tipo]) — ex.: Obras\<obra> para a
// pasta "Projeto" de uma análise da obra; `escopo` ({ coluna, valor }) limita
// a checagem de nome repetido aos registros da mesma pasta-mãe (valor null =
// coluna IS NULL); pode ser uma lista dessas condições. `coluna` é sempre um
// literal escolhido no código.
async function sincronizarPasta(client, { tipo, tabela, id, nome, pastaAtual, raiz = RAIZES[tipo], escopo = null }) {
  const sufixo = ` (${LETRA[tipo]}${id})`;
  const base = nomeSeguro(nome, `${PADRAO[tipo]} ${id}`);
  const caminho = (p) => path.join(raiz, p);
  let desejada = base;
  const params = [desejada, id];
  let filtro = '';
  for (const e of [].concat(escopo || [])) {
    if (e.valor == null) filtro += ` AND ${e.coluna} IS NULL`;
    else { params.push(e.valor); filtro += ` AND ${e.coluna} = $${params.length}`; }
  }
  const ocupada = await client.query(`SELECT 1 FROM ${tabela} WHERE LOWER(pasta) = LOWER($1) AND id <> $2${filtro} LIMIT 1`, params);
  if (ocupada.rows.length || (desejada !== pastaAtual && await existe(caminho(desejada)) && !(pastaAtual && desejada.toLowerCase() === pastaAtual.toLowerCase()))) {
    desejada = nomeSeguro(cortarTexto(base, 80) + sufixo);
  }
  await fsp.mkdir(raiz, { recursive: true });
  if (pastaAtual && pastaAtual !== desejada && await existe(caminho(pastaAtual))) {
    try {
      await fsp.rename(caminho(pastaAtual), caminho(desejada));
    } catch (e) {
      // pasta aberta no Explorer/Word (EPERM/EBUSY): mantém o nome antigo e tenta na próxima gravação
      console.warn(`Não foi possível renomear a pasta "${pastaAtual}" → "${desejada}": ${e.message}`);
      return caminho(pastaAtual);
    }
  }
  await fsp.mkdir(caminho(desejada), { recursive: true });
  if (desejada !== pastaAtual) await client.query(`UPDATE ${tabela} SET pasta = $1 WHERE id = $2`, [desejada, id]);
  return caminho(desejada);
}

// Grava sobrescrevendo de forma segura: escreve num temporário e troca — se
// faltar luz no meio, a versão anterior continua inteira.
async function gravarArquivo(pasta, nomeArquivo, conteudo) {
  const destino = path.join(pasta, nomeSeguro(nomeArquivo, 'arquivo'));
  await fsp.mkdir(path.dirname(destino), { recursive: true });
  // nome aleatório: duas gravações simultâneas do mesmo arquivo (autosave +
  // clique) no mesmo processo usavam o mesmo temporário e se atropelavam.
  // 'wx' = falha se já existir, nunca escreve por cima de outro arquivo.
  const tmp = `${destino}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  await fsp.writeFile(tmp, conteudo, { flag: 'wx' });
  try {
    await fsp.rename(tmp, destino);
  } catch (e) {
    await fsp.rm(tmp, { force: true });
    throw new Error(`não foi possível gravar "${path.basename(destino)}" (está aberto em outro programa?): ${e.message}`);
  }
  aoGravar.forEach(fn => fn(destino));
  return destino;
}

async function removerArquivo(pasta, nomeArquivo) {
  await fsp.rm(path.join(pasta, nomeSeguro(nomeArquivo, 'arquivo')), { force: true });
}

// Exclusão no sistema: a pasta vai para _Excluídos com a data (o usuário
// apaga de vez quando quiser), em vez de sumir com arquivos que podem ter sido
// colocados lá à mão.
// `raiz`: pasta-mãe quando não é a padrão (item dentro da pasta de uma obra);
// `rotulo`: entra no nome em _Excluídos (ex.: o nome da obra).
// `excluidos`: pasta _Excluídos de destino (a da pasta dos clientes, para não
// levar arquivos do servidor para este PC).
async function moverParaExcluidos(tipo, pasta, { raiz = RAIZES[tipo], rotulo = null, excluidos = EXCLUIDOS } = {}) {
  const origem = pasta ? path.join(raiz, pasta) : null;
  if (!origem || !(await existe(origem))) return null;
  await fsp.mkdir(excluidos, { recursive: true });
  const data = hojeBrasilia(); // data de Brasília (em UTC, depois das 21h já era amanhã)
  const destino = path.join(excluidos, nomeSeguro(`${PADRAO[tipo]} - ${rotulo ? `${rotulo} - ` : ''}${pasta} - ${data}`));
  await moverPasta(origem, (await existe(destino)) ? `${destino} ${Date.now()}` : destino);
  return destino;
}

async function listarArquivos(pasta) {
  const lista = [];
  async function andar(dir, rel) {
    let entradas = [];
    try { entradas = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      if (e.name.endsWith('.tmp')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await andar(p, path.join(rel, e.name));
      else {
        const st = await fsp.stat(p);
        lista.push({ arquivo: path.join(rel, e.name), tamanho: st.size, alterado_em: st.mtime });
      }
    }
  }
  await andar(pasta, '');
  return lista.sort((a, b) => a.arquivo.localeCompare(b.arquivo, 'pt-BR'));
}

// Abre a pasta no Explorer do PC onde o backend roda (só faz sentido para quem
// está usando o sistema neste PC — quem chama confere se a requisição é local).
function abrirNoExplorer(pasta) {
  if (process.platform !== 'win32') return;
  execFile('explorer.exe', [pasta], { windowsHide: false }, () => {}); // explorer devolve código 1 mesmo quando abre
}

// ── Pasta dos clientes (versão 2.3) ────────────────────────────────────────
// Tudo de um cliente mora em Clientes\<cliente> — no servidor, pelo .env
// PASTA_CLIENTES (ex.: \\MARCIO-SERVER\...\Clientes); sem ele, em
// <base>\Clientes. Servidor fora do ar NÃO para o sistema: a gravação vai para
// <base>\_Aguardando servidor\Clientes (mesmo caminho relativo) e
// enviarPendentesAoServidor() leva tudo quando ele volta.
const RAIZ_CLIENTES_SERVIDOR = process.env.PASTA_CLIENTES || path.join(BASE, 'Clientes');
const RAIZ_CLIENTES_PENDENTE = path.join(BASE, '_Aguardando servidor', 'Clientes');
const SEM_CLIENTE = '_Sem cliente';
let disponibilidade = { ok: true, conferidoEm: 0 };

// Pasta de rede inacessível costuma TRAVAR a chamada por 20 s ou mais: confere
// com tempo-limite e guarda o resultado por 30 s.
async function servidorDisponivel({ forcar = false } = {}) {
  if (!forcar && Date.now() - disponibilidade.conferidoEm < 30000) return disponibilidade.ok;
  const teste = fsp.mkdir(RAIZ_CLIENTES_SERVIDOR, { recursive: true }).then(() => fsp.access(RAIZ_CLIENTES_SERVIDOR)).then(() => true, () => false);
  const ok = await Promise.race([teste, new Promise(r => setTimeout(() => r(false), 4000).unref?.())]);
  if (ok !== disponibilidade.ok) console.warn(`Pasta dos clientes ${ok ? 'voltou' : 'INDISPONÍVEL'}: ${RAIZ_CLIENTES_SERVIDOR}`);
  disponibilidade = { ok, conferidoEm: Date.now() };
  return ok;
}
// raiz onde gravar agora: o servidor, ou a reserva local se ele estiver fora
async function raizClientes() {
  return (await servidorDisponivel()) ? RAIZ_CLIENTES_SERVIDOR : RAIZ_CLIENTES_PENDENTE;
}

// Move uma pasta, inclusive entre discos/rede (rename falha com EXDEV: copia e apaga)
async function moverPasta(origem, destino) {
  await fsp.mkdir(path.dirname(destino), { recursive: true });
  try {
    await fsp.rename(origem, destino);
  } catch (e) {
    if (e.code !== 'EXDEV' && e.code !== 'EPERM') throw e;
    await fsp.cp(origem, destino, { recursive: true, errorOnExist: false, force: false });
    await fsp.rm(origem, { recursive: true, force: true });
  }
  return destino;
}

// Leva o que ficou na reserva local para o servidor (arquivo a arquivo; o da
// reserva é mais novo e substitui). Devolve quantos arquivos foram.
async function enviarPendentesAoServidor() {
  if (!(await existe(RAIZ_CLIENTES_PENDENTE)) || !(await servidorDisponivel({ forcar: true }))) return 0;
  const lista = await listarArquivos(RAIZ_CLIENTES_PENDENTE);
  let n = 0;
  for (const a of lista) {
    const de = path.join(RAIZ_CLIENTES_PENDENTE, a.arquivo);
    const para = path.join(RAIZ_CLIENTES_SERVIDOR, a.arquivo);
    try {
      await fsp.mkdir(path.dirname(para), { recursive: true });
      await fsp.copyFile(de, para);
      await fsp.rm(de, { force: true });
      n++;
      aoGravar.forEach(fn => fn(para));
    } catch (e) {
      console.warn(`Não foi possível enviar "${a.arquivo}" ao servidor: ${e.message}`);
    }
  }
  // pastas vazias que sobraram na reserva
  if (n === lista.length) await fsp.rm(RAIZ_CLIENTES_PENDENTE, { recursive: true, force: true }).catch(() => {});
  return n;
}

// Avisos de gravação: o monitor das pastas dos clientes registra o que o
// PRÓPRIO sistema gravou, para não avisar como "arquivo novo do cliente".
const aoGravar = [];
const registrarAoGravar = (fn) => { aoGravar.push(fn); };

module.exports = {
  BASE, RAIZES, nomeSeguro, sincronizarPasta, gravarArquivo, removerArquivo, moverParaExcluidos, listarArquivos, abrirNoExplorer, caminhoDe,
  RAIZ_CLIENTES_SERVIDOR, RAIZ_CLIENTES_PENDENTE, SEM_CLIENTE, servidorDisponivel, raizClientes, moverPasta, enviarPendentesAoServidor, registrarAoGravar, existe,
};
