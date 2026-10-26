const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');

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
const BASE = process.env.PASTA_ARQUIVOS_SISTEMA || path.join(__dirname, '..', '..', '..', '..', 'Arquivos do Sistema');
const RAIZES = { projeto: path.join(BASE, 'Projetos'), laudo: path.join(BASE, 'Laudos') };
const EXCLUIDOS = path.join(BASE, '_Excluídos');
const RESERVADOS = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

// Nome válido de pasta/arquivo no Windows.
function nomeSeguro(nome, padrao = 'Sem nome') {
  let s = String(nome || '').replace(/[<>:"/\\|?*\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/[. ]+$/, '').slice(0, 90).trim();
  if (!s || RESERVADOS.test(s)) s = padrao;
  return s;
}

const caminhoDe = (tipo, pasta) => path.join(RAIZES[tipo], pasta);
async function existe(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

// Garante a pasta do registro com o nome atual. `tabela`/`id` identificam o
// registro; a coluna `pasta` guarda o nome em uso (para renomear depois).
// Nome repetido em outro registro ganha o sufixo " (A14)" / " (L3)".
async function sincronizarPasta(client, { tipo, tabela, id, nome, pastaAtual }) {
  const sufixo = ` (${tipo === 'projeto' ? 'A' : 'L'}${id})`;
  const base = nomeSeguro(nome, `${tipo === 'projeto' ? 'Projeto' : 'Laudo'} ${id}`);
  let desejada = base;
  const ocupada = await client.query(`SELECT 1 FROM ${tabela} WHERE LOWER(pasta) = LOWER($1) AND id <> $2 LIMIT 1`, [desejada, id]);
  if (ocupada.rows.length || (desejada !== pastaAtual && await existe(caminhoDe(tipo, desejada)) && !(pastaAtual && desejada.toLowerCase() === pastaAtual.toLowerCase()))) {
    desejada = nomeSeguro(base.slice(0, 80) + sufixo);
  }
  await fsp.mkdir(RAIZES[tipo], { recursive: true });
  if (pastaAtual && pastaAtual !== desejada && await existe(caminhoDe(tipo, pastaAtual))) {
    try {
      await fsp.rename(caminhoDe(tipo, pastaAtual), caminhoDe(tipo, desejada));
    } catch (e) {
      // pasta aberta no Explorer/Word (EPERM/EBUSY): mantém o nome antigo e tenta na próxima gravação
      console.warn(`Não foi possível renomear a pasta "${pastaAtual}" → "${desejada}": ${e.message}`);
      return caminhoDe(tipo, pastaAtual);
    }
  }
  await fsp.mkdir(caminhoDe(tipo, desejada), { recursive: true });
  if (desejada !== pastaAtual) await client.query(`UPDATE ${tabela} SET pasta = $1 WHERE id = $2`, [desejada, id]);
  return caminhoDe(tipo, desejada);
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
  return destino;
}

async function removerArquivo(pasta, nomeArquivo) {
  await fsp.rm(path.join(pasta, nomeSeguro(nomeArquivo, 'arquivo')), { force: true });
}

// Exclusão no sistema: a pasta vai para _Excluídos com a data (o usuário
// apaga de vez quando quiser), em vez de sumir com arquivos que podem ter sido
// colocados lá à mão.
async function moverParaExcluidos(tipo, pasta) {
  if (!pasta || !(await existe(caminhoDe(tipo, pasta)))) return null;
  await fsp.mkdir(EXCLUIDOS, { recursive: true });
  const data = new Date().toISOString().slice(0, 10);
  const destino = path.join(EXCLUIDOS, nomeSeguro(`${tipo === 'projeto' ? 'Projeto' : 'Laudo'} - ${pasta} - ${data}`));
  await fsp.rename(caminhoDe(tipo, pasta), (await existe(destino)) ? `${destino} ${Date.now()}` : destino);
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

module.exports = { BASE, RAIZES, nomeSeguro, sincronizarPasta, gravarArquivo, removerArquivo, moverParaExcluidos, listarArquivos, abrirNoExplorer, caminhoDe };
