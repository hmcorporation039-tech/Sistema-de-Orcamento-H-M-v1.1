const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/database');
const { extrairCotacaoPdf } = require('../utils/cotacaoFornecedorParser');
const { classificarPorDescricao } = require('../utils/classificadorMaterial');

// Pastas onde o usuário salva manualmente os orçamentos/cotações de fornecedor
// recebidos por WhatsApp (hoje só em PDF). A local fica ao lado de backend/ e
// frontend/; a de rede é compartilhada no servidor de arquivos da empresa.
const PASTA_FORNECEDORES_LOCAL = path.join(__dirname, '..', '..', '..', 'Orçamentos recebidos fornecedores');
const PASTA_FORNECEDORES_REDE = '\\\\MARCIO-SERVER\\Arquivos Gerais 2\\H&M\\Orçamentos Recebidos';
const PASTAS_FORNECEDORES = [PASTA_FORNECEDORES_LOCAL, PASTA_FORNECEDORES_REDE];

function normalizarDescricao(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function obterMargemPadrao(client) {
  const r = await client.query("SELECT valor FROM configuracoes WHERE chave = 'margem_padrao'");
  return parseFloat(r.rows[0]?.valor) || 0;
}

function hashArquivo(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Cria o material se a descrição for nova, ou atualiza o custo se já existir —
// mas, diferente da importação de nota fiscal (que sempre grava o valor mais
// recente), aqui mantém sempre o MENOR preço de custo já visto, já que a
// margem de venda é aplicada em cima e um fornecedor mais caro num dia
// específico não deveria puxar o preço de referência pra cima.
async function upsertMaterialMenorPreco(client, item, origem, margem) {
  const descricaoNorm = normalizarDescricao(item.descricao);
  if (!descricaoNorm) return null;

  const precoRecebido = Number(item.preco) || 0;
  if (precoRecebido <= 0) return null; // preço não identificado com confiança — não grava lixo no catálogo

  const existente = await client.query(
    `SELECT * FROM materiais WHERE LOWER(TRIM(descricao)) = $1 AND ativo = true LIMIT 1`,
    [descricaoNorm]
  );

  if (existente.rows.length > 0) {
    const mat = existente.rows[0];
    const compraAtual = mat.preco_compra != null ? Number(mat.preco_compra) : null;
    const menorCompra = compraAtual != null ? Math.min(compraAtual, precoRecebido) : precoRecebido;
    const mudou = compraAtual == null || menorCompra !== compraAtual;

    if (mat.preco_manual) {
      // preço de venda foi ajustado manualmente — preserva, só atualiza custo/código/marca/NCM de referência
      await client.query(
        `UPDATE materiais SET preco_compra=$1, codigo=COALESCE(NULLIF(codigo,''), $2), marca=COALESCE(NULLIF(marca,''), $3), ncm=COALESCE(NULLIF(ncm,''), $4), origem=$5, atualizado_em=NOW() WHERE id=$6`,
        [menorCompra, item.codigo || null, item.marca || null, item.ncm || null, origem, mat.id]
      );
    } else {
      const precoVenda = Math.round(menorCompra * (1 + margem / 100) * 100) / 100;
      await client.query(
        `UPDATE materiais SET preco_compra=$1, preco=$2, codigo=COALESCE(NULLIF(codigo,''), $3), marca=COALESCE(NULLIF(marca,''), $4), ncm=COALESCE(NULLIF(ncm,''), $5), origem=$6, atualizado_em=NOW() WHERE id=$7`,
        [menorCompra, precoVenda, item.codigo || null, item.marca || null, item.ncm || null, origem, mat.id]
      );
    }
    return { criado: false, mudou };
  }

  const categoria = classificarPorDescricao(item.descricao) || 'Não classificado';
  const precoVenda = Math.round(precoRecebido * (1 + margem / 100) * 100) / 100;
  await client.query(
    `INSERT INTO materiais (codigo, descricao, categoria, unidade, preco, preco_compra, marca, ncm, origem)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [item.codigo || null, item.descricao, categoria, item.unidade || 'un', precoVenda, precoRecebido, item.marca || '', item.ncm || null, origem]
  );
  return { criado: true, mudou: true };
}

// Lista os PDFs de uma pasta de cotações. Pastas de rede podem estar
// temporariamente indisponíveis (servidor desligado, sem VPN, etc.) — nesse
// caso só avisa e segue pras outras pastas, não derruba o job inteiro.
// Usa fs.promises: as versões síncronas (existsSync/readdirSync/readFileSync)
// BLOQUEIAM a thread única do Node. Sobre caminho de rede (\\MARCIO-SERVER\...)
// com o servidor desligado, cada chamada trava até o timeout SMB do Windows —
// segundos a ~45s — e nesse intervalo a API inteira congela: ninguém loga,
// nenhuma tela carrega, nenhum PDF sai. E isso rodava a cada 15 minutos.
async function listarPdfs(pasta, resumo, criarSeNaoExistir) {
  try {
    try {
      await fsp.access(pasta);
    } catch {
      if (criarSeNaoExistir) {
        await fsp.mkdir(pasta, { recursive: true });
      } else {
        resumo.avisos.push(`Pasta de fornecedores não encontrada (verifique a rede): ${pasta}`);
        return [];
      }
    }
    const nomes = await fsp.readdir(pasta);
    return nomes
      .filter(nome => /\.pdf$/i.test(nome))
      .map(nome => ({ pasta, nome }));
  } catch (err) {
    resumo.avisos.push(`Não foi possível acessar a pasta "${pasta}": ${err.message}`);
    return [];
  }
}

async function verificarPastaFornecedores() {
  const resumo = {
    arquivosEncontrados: 0, arquivosProcessados: 0,
    materiaisCriados: 0, materiaisAtualizados: 0, avisos: [],
  };

  const arquivos = [
    ...(await listarPdfs(PASTA_FORNECEDORES_LOCAL, resumo, true)),
    ...(await listarPdfs(PASTA_FORNECEDORES_REDE, resumo, false)),
  ];
  resumo.arquivosEncontrados = arquivos.length;

  const client = await pool.connect();
  try {
    const margem = await obterMargemPadrao(client);

    for (const { pasta, nome } of arquivos) {
      const caminho = path.join(pasta, nome);
      let buffer;
      try {
        buffer = await fsp.readFile(caminho);
      } catch (err) {
        resumo.avisos.push(`Não foi possível ler "${nome}": ${err.message}`);
        continue;
      }

      const hash = hashArquivo(buffer);
      const jaProcessado = await client.query(
        'SELECT id FROM arquivos_fornecedores_processados WHERE hash = $1',
        [hash]
      );
      if (jaProcessado.rows.length > 0) continue;

      await client.query('BEGIN');
      try {
        const itens = await extrairCotacaoPdf(buffer);
        if (itens.length === 0) {
          resumo.avisos.push(`Nenhum item reconhecido em "${nome}" — confira o layout do arquivo`);
          await client.query(
            `INSERT INTO arquivos_fornecedores_processados (arquivo, hash) VALUES ($1,$2) ON CONFLICT (hash) DO NOTHING`,
            [nome, hash]
          );
          await client.query('COMMIT');
          continue;
        }

        let criados = 0, atualizados = 0;
        for (const item of itens) {
          const r = await upsertMaterialMenorPreco(client, item, 'fornecedor_whatsapp', margem);
          if (!r) continue;
          if (r.criado) criados++;
          else if (r.mudou) atualizados++;
        }

        await client.query(
          `INSERT INTO arquivos_fornecedores_processados (arquivo, hash, itens_novos, itens_atualizados)
           VALUES ($1,$2,$3,$4) ON CONFLICT (hash) DO NOTHING`,
          [nome, hash, criados, atualizados]
        );
        await client.query('COMMIT');

        resumo.arquivosProcessados++;
        resumo.materiaisCriados += criados;
        resumo.materiaisAtualizados += atualizados;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        resumo.avisos.push(`Erro ao processar "${nome}": ${err.message}`);
        console.error(`Erro ao processar cotação "${nome}":`, err);

        // Marca o arquivo como visto mesmo tendo falhado. Antes o hash só era
        // gravado no caminho de sucesso, então um PDF protegido por senha, um
        // arquivo truncado ou um .jpg renomeado para .pdf era relido,
        // reparseado e refalhado a cada 15 minutos, para sempre — consumindo
        // CPU e enchendo o log. Fica registrado com a contagem zerada; se o
        // arquivo for corrigido, o conteúdo muda, o hash muda e ele volta a
        // ser processado normalmente.
        await client.query(
          `INSERT INTO arquivos_fornecedores_processados (arquivo, hash) VALUES ($1,$2)
           ON CONFLICT (hash) DO NOTHING`,
          [nome, hash]
        ).catch(e => console.error('Falha ao registrar arquivo com erro:', e.message));
      }
    }
  } finally {
    client.release();
  }

  return resumo;
}

module.exports = { verificarPastaFornecedores, PASTAS_FORNECEDORES };
