const fsp = require('fs/promises');
const path = require('path');
const { RAIZ_REPOSITORIO } = require('../config/caminhos');
const crypto = require('crypto');
const pool = require('../config/database');
const { lerDocumentoCotacao, encerrarOcr, VERSAO_LEITOR, EXTENSOES } = require('./leitorCotacao');
const { iaDisponivel } = require('./leitorCotacaoIA');
const { carregarIndice, registrarItemCotacao, obterMargemPadrao, encontrarExistente } = require('./catalogoMateriais');
const { classificarPendentes } = require('./classificacaoMateriais');
const { executarComTrava } = require('./travaJob');
const iaCache = require('./iaCache');
const cotacoes = require('./cotacoesFornecedor');

// Pastas onde o usuário salva os orçamentos/cotações de fornecedor recebidos
// (WhatsApp etc.): PDF com texto, PDF escaneado ou foto (PNG/JPG). A local
// fica ao lado de backend/ e frontend/; a de rede é compartilhada no servidor.
const PASTA_FORNECEDORES_LOCAL = path.join(RAIZ_REPOSITORIO, 'Orçamentos recebidos fornecedores');
const PASTA_FORNECEDORES_REDE = '\\\\MARCIO-SERVER\\Arquivos Gerais 2\\H&M\\Orçamentos Recebidos';
const PASTAS_FORNECEDORES = [PASTA_FORNECEDORES_LOCAL, PASTA_FORNECEDORES_REDE];
// Teto de leituras por IA numa varredura (só para arquivos que o leitor local
// não reconheceu) — evita custo alto se cair uma pasta cheia de arquivos estranhos.
const MAX_IA_POR_VARREDURA = Number(process.env.COTACAO_IA_MAX_POR_VARREDURA) || 15;
// Tempo máximo de IA numa varredura (revisão do uso de IA de 06/11/2026): 15 documentos × até ~14 min cada prendiam a
// varredura por horas. Passado o limite, o resto fica pendente para a próxima (o leitor local continua lendo tudo).
const TEMPO_IA_VARREDURA_MS = (Number(process.env.COTACAO_IA_MINUTOS_POR_VARREDURA) || 20) * 60 * 1000;
const podeUsarIA = (resumo) => resumo.leiturasPorIA < MAX_IA_POR_VARREDURA && Date.now() - (resumo.inicio || Date.now()) < TEMPO_IA_VARREDURA_MS;

function hashArquivo(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Lista os arquivos de uma pasta de cotações. Pastas de rede podem estar
// temporariamente indisponíveis (servidor desligado, sem VPN, etc.) — nesse
// caso só avisa e segue pras outras pastas, não derruba o job inteiro.
// Usa fs.promises: as versões síncronas BLOQUEIAM a thread única do Node, e
// sobre caminho de rede com o servidor desligado cada chamada trava até o
// timeout SMB do Windows — nesse intervalo a API inteira congela.
// Pasta de rede: às 06:00 o servidor de arquivos pode ainda estar acordando
// (ou a rede do PC ainda subindo). Tenta de novo por até ~1 minuto antes de
// desistir da rodada — senão os orçamentos só seriam lidos 12 h depois.
async function pastaAcessivel(pasta, tentativas = 4, intervaloMs = 20000) {
  for (let i = 1; ; i++) {
    try {
      await fsp.access(pasta);
      return true;
    } catch {
      if (i >= tentativas) return false;
      await new Promise(r => setTimeout(r, intervaloMs));
    }
  }
}

async function listarArquivos(pasta, resumo, criarSeNaoExistir) {
  try {
    if (!(await pastaAcessivel(pasta, criarSeNaoExistir ? 1 : 4))) {
      if (criarSeNaoExistir) {
        await fsp.mkdir(pasta, { recursive: true });
      } else {
        resumo.avisos.push(`Pasta de fornecedores não encontrada (verifique a rede): ${pasta}`);
        return [];
      }
    }
    const nomes = await fsp.readdir(pasta);
    return nomes.filter(nome => EXTENSOES.test(nome)).map(nome => ({ pasta, nome }));
  } catch (err) {
    resumo.avisos.push(`Não foi possível acessar a pasta "${pasta}": ${err.message}`);
    return [];
  }
}

// Já lido de vez: teve itens, ou foi lido com 0 itens pela versão atual do
// leitor. Arquivo com 0 itens de uma versão antiga é lido de novo. Arquivo que só a IA leria, lido com ela
// desligada (aguardando_ia), volta a ser lido quando ela estiver ligada — e não antes (era relido com OCR toda vez).
async function jaProcessado(client, hash) {
  const r = await client.query('SELECT itens_lidos, itens_novos, itens_atualizados, leitor_versao, aguardando_ia FROM arquivos_fornecedores_processados WHERE hash = $1', [hash]);
  if (!r.rows.length) return false;
  const x = r.rows[0];
  if (x.aguardando_ia && (x.leitor_versao || 1) >= VERSAO_LEITOR) return !iaDisponivel();
  return (x.itens_lidos || 0) > 0 || (x.itens_novos || 0) > 0 || (x.itens_atualizados || 0) > 0 || (x.leitor_versao || 1) >= VERSAO_LEITOR;
}

async function registrarArquivo(client, nome, hash, dados) {
  await client.query(
    `INSERT INTO arquivos_fornecedores_processados (arquivo, hash, itens_novos, itens_atualizados, itens_lidos, metodo, confere_total, leitor_versao, aguardando_ia)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (hash) DO UPDATE SET arquivo=EXCLUDED.arquivo, itens_novos=EXCLUDED.itens_novos, itens_atualizados=EXCLUDED.itens_atualizados,
       itens_lidos=EXCLUDED.itens_lidos, metodo=EXCLUDED.metodo, confere_total=EXCLUDED.confere_total, leitor_versao=EXCLUDED.leitor_versao,
       aguardando_ia=EXCLUDED.aguardando_ia, processado_em=NOW()`,
    // pendente (precisava de IA e ela estava fora do ar/sem vez): versão anterior, para ser relido;
    // aguardaIA (só a IA leria e ela está desligada): relido quando ela for ligada (jaProcessado)
    [nome, hash, dados.criados || 0, dados.atualizados || 0, dados.lidos || 0, dados.metodo || null, dados.confere ?? null, dados.pendente ? VERSAO_LEITOR - 1 : VERSAO_LEITOR, !!dados.aguardaIA && !dados.pendente]
  );
}

// Grava no catálogo os itens de UM documento já lido (pasta ou e-mail):
// material novo é cadastrado, existente mantém o menor custo.
// contexto = { documento, data }: com ele, o preço cotado também vai para o comparativo de fornecedores
// (cotacoes_itens), se o documento trouxe o CNPJ do fornecedor.
async function importarItens(client, indice, leitura, origemBase, margem, contexto = null) {
  // "IA (…)" e também "OCR + IA (…) concordantes": o preço passou pela IA (fica marcado: projetos/orcamento.js)
  const origem = /\bIA\b/.test(leitura.metodo || '') ? `${origemBase}_ia` : leitura.viaOcr ? `${origemBase}_ocr` : origemBase;
  let criados = 0, atualizados = 0, existentes = 0;
  for (const item of leitura.itens) {
    const r = await registrarItemCotacao(client, indice, item, origem, margem);
    if (!r) continue;
    if (contexto?.documento && leitura.fornecedor && r.materialId) {
      await cotacoes.registrarItem(client, { materialId: r.materialId, fornecedor: leitura.fornecedor, item, origem, documento: contexto.documento, data: contexto.data });
    }
    if (r.criado) criados++;
    else { existentes++; if (r.mudou) atualizados++; }
  }
  return { criados, atualizados, existentes };
}

// Cotações lidas ANTES do comparativo existir (arquivo já marcado como processado) não têm o fornecedor
// guardado. Esta releitura só acrescenta o preço cotado ao comparativo: não cadastra material, não muda
// preço nem categoria e nunca chama a IA. A data da cotação é a do arquivo. Usado por scripts/reler-cotacoes.js.
async function guardarCotacoesDoArquivo(client, { pasta, nome }, { indice, ler = lerDocumentoCotacao, lerArquivo = fsp.readFile, dataDoArquivo = async (p) => (await fsp.stat(p)).mtime }) {
  const caminho = path.join(pasta, nome);
  const buffer = await lerArquivo(caminho);
  const leitura = await ler(buffer, nome, { permitirIA: false });
  if (!leitura.fornecedor || !leitura.itens.length) return { itens: leitura.itens.length, guardados: 0, semFornecedor: !leitura.fornecedor && leitura.itens.length > 0 };
  const d = await dataDoArquivo(caminho);
  const data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const origem = /\bIA\b/.test(leitura.metodo || '') ? 'fornecedor_whatsapp_ia' : leitura.viaOcr ? 'fornecedor_whatsapp_ocr' : 'fornecedor_whatsapp';
  const documento = `arq:${hashArquivo(buffer)}`;
  let guardados = 0;
  await client.query('BEGIN');
  try {
    for (const item of leitura.itens) {
      const achado = await encontrarExistente(client, indice, item.descricao);
      if (achado && await cotacoes.registrarItem(client, { materialId: achado.material.id, fornecedor: leitura.fornecedor, item, origem, documento, data })) guardados++;
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  }
  return { itens: leitura.itens.length, guardados, semFornecedor: false };
}

// A varredura roda sozinha às 06:00 e às 18:00 e também pelo botão "Verificar agora".
// Duas execuções simultâneas leriam o mesmo arquivo como "não processado" antes de
// qualquer uma gravar o hash e criariam o mesmo material duas vezes. Quem
// chegar enquanto uma varredura está em andamento recebe o resultado dela.
let varreduraEmAndamento = null;

function verificarPastaFornecedores() {
  if (!varreduraEmAndamento) {
    // também trava entre instâncias do sistema (advisory lock do PostgreSQL)
    varreduraEmAndamento = executarComTrava('pasta-fornecedores', executarVarredura).finally(() => { varreduraEmAndamento = null; });
  }
  return varreduraEmAndamento;
}

// Um arquivo da pasta: lê (fora da transação), grava itens e o registro do
// arquivo numa transação. Separado da varredura para os testes (leitor e
// arquivo falsos, sem abrir as pastas reais).
async function processarArquivo(client, { pasta, nome }, { resumo, margem, indice, ler = lerDocumentoCotacao, lerArquivo = fsp.readFile }) {
  let buffer;
  try {
    buffer = await lerArquivo(path.join(pasta, nome));
  } catch (err) {
    resumo.avisos.push(`Não foi possível ler "${nome}": ${err.message}`);
    return;
  }
  const hash = hashArquivo(buffer);
  if (await jaProcessado(client, hash)) return;

  let leitura;
  try {
    leitura = await ler(buffer, nome, { permitirIA: podeUsarIA(resumo) });
  } catch (err) {
    leitura = { itens: [], metodo: null, avisos: [`erro na leitura: ${err.message}`] };
  }
  if (leitura.usouIA && !leitura.iaDeCache) resumo.leiturasPorIA++; // a resposta guardada do mesmo arquivo não gasta IA
  await iaCache.contarLeituraCotacao(leitura);

  await client.query('BEGIN');
  try {
    const r = leitura.itens.length ? await importarItens(client, indice, leitura, 'fornecedor_whatsapp', margem, { documento: `arq:${hash}` }) : { criados: 0, atualizados: 0, existentes: 0 };
    await registrarArquivo(client, nome, hash, { ...r, lidos: leitura.itens.length, metodo: leitura.metodo || (leitura.pendente || leitura.aguardaIA ? 'aguardando IA' : null), confere: leitura.conferencia?.confere, pendente: leitura.pendente, aguardaIA: leitura.aguardaIA });
    await client.query('COMMIT');
    resumo.arquivosProcessados++;
    resumo.materiaisCriados += r.criados;
    resumo.materiaisAtualizados += r.atualizados;
    resumo.materiaisJaCadastrados += r.existentes;
    resumo.arquivos.push({ arquivo: nome, metodo: leitura.metodo, itensLidos: leitura.itens.length, novos: r.criados, atualizados: r.atualizados, jaCadastrados: r.existentes, confereTotal: leitura.conferencia?.confere ?? null });
    if (leitura.pendente) resumo.pendentes = (resumo.pendentes || 0) + 1;
    if (!leitura.itens.length && !leitura.daHM) resumo.avisos.push(`Nenhum item reconhecido em "${nome}"${leitura.avisos?.length ? ` (${leitura.avisos.join('; ')})` : ''}`);
    else for (const a of leitura.avisos || []) resumo.avisos.push(`"${nome}": ${a}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    resumo.avisos.push(`Erro ao gravar "${nome}" no banco: ${err.message} — tenta de novo na próxima verificação`);
    console.error(`Erro ao processar cotação "${nome}":`, err);
    // NÃO marca como processado: aqui o arquivo foi LIDO e o que falhou foi
    // a gravação (banco fora, trava, conexão). Antes ele ficava registrado
    // com 0 itens e nunca mais era lido (revisão de 27/10/2026). Erro de
    // LEITURA continua registrado (acima: leitura com 0 itens), para não
    // reler à toa um arquivo que o leitor não entende.
  }
}

async function executarVarredura() {
  const resumo = {
    arquivosEncontrados: 0, arquivosProcessados: 0,
    materiaisCriados: 0, materiaisAtualizados: 0, materiaisJaCadastrados: 0,
    leiturasPorIA: 0, arquivos: [], avisos: [], inicio: Date.now(),
  };

  const arquivos = [
    ...(await listarArquivos(PASTA_FORNECEDORES_LOCAL, resumo, true)),
    ...(await listarArquivos(PASTA_FORNECEDORES_REDE, resumo, false)),
  ];
  resumo.arquivosEncontrados = arquivos.length;

  const client = await pool.connect();
  try {
    const margem = await obterMargemPadrao(client);
    const indice = await carregarIndice(client);

    for (const arquivo of arquivos) await processarArquivo(client, arquivo, { resumo, margem, indice });
  } finally {
    client.release();
    await encerrarOcr();
  }

  // material que ficou sem categoria (nem NCM, nem parecido, nem palavra-chave) → IA
  if (resumo.materiaisCriados) resumo.classificacao = await classificarPendentes().catch(e => ({ erro: e.message }));
  return resumo;
}

module.exports = { verificarPastaFornecedores, importarItens, guardarCotacoesDoArquivo, listarArquivos, PASTAS_FORNECEDORES, podeUsarIA, _interno: { processarArquivo, jaProcessado } };
