const path = require('path');
const pool = require('../config/database');
const P = require('../utils/pastasSistema');
const { DISCIPLINAS_LAUDO } = require('../utils/disciplinasLaudo');

// Liga cada análise de projeto, cada laudo e cada obra à sua pasta no disco
// (utils/pastasSistema.js). Conteúdo, sempre com nome fixo e sobrescrito a
// cada nova versão:
//   Projetos/<nome do projeto>/
//     Arquivos do projeto/<PDFs recebidos>
//     Relatório de compatibilização.pdf
//     Orçamento P123.pdf
//     Dados da análise.json
//   Laudos/<nome do laudo>/
//     <documentos do padrão da disciplina>.docx / .xlsx
//     Fotos/<id> - <nome>.jpg
//     Orçamento P123.pdf          (só quando o laudo tem orçamento)
//     Dados do laudo.json         (formulário completo — reimportável na tela)
// Versão 2.0 (Fase 2D) — pasta da obra:
//   Obras/<nome da obra>/
//     Projeto/                    (análise NOVA ligada à obra; a 2ª vira "Projeto (A15)")
//     Laudos/<disciplina>/        (laudo NOVO ligado à obra; ex.: Laudos\SPDA)
//     Propostas/Orçamento P123.pdf
//     Contratos/Contrato CT-2026-0001.pdf
// "Novo" = o item ainda não tinha pasta quando foi ligado à obra: a coluna
// pasta_obra_id grava de qual obra é a pasta. Itens antigos continuam nas
// pastas de sempre (a migração não move arquivos) — a obra só aponta para elas.
// Falha de disco (pasta aberta, rede fora) NUNCA impede salvar no sistema: só
// gera aviso no log; a próxima gravação tenta de novo.

const nomeDoProjeto = (row) => row.nome_projeto || row.cliente_nome
  || (Array.isArray(row.arquivos_analisados) && row.arquivos_analisados[0] && String(row.arquivos_analisados[0].nomeArquivo || row.arquivos_analisados[0].arquivo || '').replace(/\.[^.]+$/, ''))
  || `Projeto ${row.id}`;

// "SPDA — para-raios (NBR 5419:2026)" → "SPDA"; "Elétrica predial (NBR 5410)" → "Elétrica predial"
function nomeCurtoDisciplina(chave) {
  const d = DISCIPLINAS_LAUDO.find(x => x.chave === chave);
  return (d ? d.nome.split(/ — | \(/)[0].trim() : String(chave || 'Laudo').toUpperCase()) || 'Laudo';
}

async function pastaDaObra(obra, client = pool) {
  return P.sincronizarPasta(client, { tipo: 'obra', tabela: 'obras', id: obra.id, nome: obra.nome || `Obra ${obra.id}`, pastaAtual: obra.pasta });
}

async function pastaDaObraPorId(obraId, client = pool) {
  const { rows: [obra] } = await client.query('SELECT id, nome, pasta FROM obras WHERE id = $1', [obraId]);
  return obra ? pastaDaObra(obra, client) : null;
}

// Pasta-mãe de um item (análise/laudo) que mora na pasta de uma obra, ou null
// (pasta antiga em Projetos\ / Laudos\). Item que ainda não tem pasta e já está
// ligado a uma obra passa a morar nela.
async function obraDoItem(row, tabela, client) {
  let obraId = row.pasta_obra_id;
  if (!obraId && !row.pasta && row.obra_id) {
    await client.query(`UPDATE ${tabela} SET pasta_obra_id = $1 WHERE id = $2 AND pasta IS NULL AND pasta_obra_id IS NULL`, [row.obra_id, row.id]);
    const { rows: [atual] } = await client.query(`SELECT pasta, pasta_obra_id FROM ${tabela} WHERE id = $1`, [row.id]);
    if (atual) { row.pasta = atual.pasta; row.pasta_obra_id = atual.pasta_obra_id; }
    obraId = row.pasta_obra_id;
  }
  if (!obraId) return null;
  const { rows: [obra] } = await client.query('SELECT id, nome, pasta FROM obras WHERE id = $1', [obraId]);
  return obra || null;
}

async function pastaDoProjeto(row, client = pool) {
  const obra = await obraDoItem(row, 'analises_projeto', client);
  if (obra) {
    return P.sincronizarPasta(client, { tipo: 'projeto', tabela: 'analises_projeto', id: row.id, nome: 'Projeto', pastaAtual: row.pasta,
      raiz: await pastaDaObra(obra, client), escopo: { coluna: 'pasta_obra_id', valor: obra.id } });
  }
  return P.sincronizarPasta(client, { tipo: 'projeto', tabela: 'analises_projeto', id: row.id, nome: nomeDoProjeto(row), pastaAtual: row.pasta,
    escopo: { coluna: 'pasta_obra_id', valor: null } });
}

async function pastaDoLaudo(row, client = pool) {
  const obra = await obraDoItem(row, 'laudos_projetos', client);
  if (obra) {
    return P.sincronizarPasta(client, { tipo: 'laudo', tabela: 'laudos_projetos', id: row.id, nome: nomeCurtoDisciplina(row.disciplina), pastaAtual: row.pasta,
      raiz: path.join(await pastaDaObra(obra, client), 'Laudos'), escopo: { coluna: 'pasta_obra_id', valor: obra.id } });
  }
  return P.sincronizarPasta(client, { tipo: 'laudo', tabela: 'laudos_projetos', id: row.id, nome: row.titulo || `Laudo ${row.id}`, pastaAtual: row.pasta,
    escopo: { coluna: 'pasta_obra_id', valor: null } });
}

// Caminho já registrado da pasta (sem criar nada). `row.pasta_obra_dir` = pasta
// da obra (obras.pasta), quando a consulta fez o JOIN; senão consulta.
async function caminhoRegistrado(tipo, row, client = pool) {
  if (!row?.pasta) return null;
  if (!row.pasta_obra_id) return P.caminhoDe(tipo, row.pasta);
  let dirObra = row.pasta_obra_dir;
  if (dirObra === undefined) dirObra = (await client.query('SELECT pasta FROM obras WHERE id = $1', [row.pasta_obra_id])).rows[0]?.pasta;
  if (!dirObra) return null;
  return path.join(P.RAIZES.obra, dirObra, ...(tipo === 'laudo' ? ['Laudos'] : []), row.pasta);
}

// Exclusão de análise/laudo: a pasta vai para _Excluídos (mesmo dentro de uma obra).
async function excluirPastaDoItem(tipo, row) {
  return seguro(`excluir ${tipo} ${row.id}`, async () => {
    if (!row.pasta) return null;
    if (!row.pasta_obra_id) return P.moverParaExcluidos(tipo, row.pasta);
    const { rows: [obra] } = await pool.query('SELECT nome, pasta FROM obras WHERE id = $1', [row.pasta_obra_id]);
    if (!obra?.pasta) return null;
    const raiz = path.join(P.RAIZES.obra, obra.pasta, ...(tipo === 'laudo' ? ['Laudos'] : []));
    return P.moverParaExcluidos(tipo, row.pasta, { raiz, rotulo: obra.nome });
  });
}

async function seguro(rotulo, fn) {
  try { return await fn(); } catch (e) { console.warn(`Pasta do sistema (${rotulo}): ${e.message}`); return null; }
}

// Análise salva → pasta com o nome atual + "Dados da análise.json"
function sincronizarProjeto(row, arquivosRecebidos = []) {
  return seguro(`análise ${row.id}`, async () => {
    const pasta = await pastaDoProjeto(row);
    for (const a of arquivosRecebidos) await P.gravarArquivo(path.join(pasta, 'Arquivos do projeto'), a.nomeArquivo, a.buffer);
    const { pasta: _p, ...dados } = row;
    await P.gravarArquivo(pasta, 'Dados da análise.json', JSON.stringify(dados, null, 1));
    return pasta;
  });
}

function sincronizarLaudo(row) {
  return seguro(`laudo ${row.id}`, async () => {
    const pasta = await pastaDoLaudo(row);
    await P.gravarArquivo(pasta, 'Dados do laudo.json', JSON.stringify(row.dados || {}, null, 1));
    return pasta;
  });
}

// Obra salva → pasta com o nome atual (renomeia quando o nome muda)
function sincronizarObra(obra) {
  return seguro(`obra ${obra.id}`, () => pastaDaObra(obra));
}

// Proposta gerada a partir de análise ou laudo: a cada PDF gerado, a cópia na
// pasta do projeto/laudo é substituída pela versão atual. Proposta ligada a
// uma obra: também em Obras\<obra>\Propostas.
function salvarPdfPropostaNasPastas(proposta, pdf) {
  return seguro(`proposta ${proposta.id}`, async () => {
    const analises = (await pool.query('SELECT * FROM analises_projeto WHERE proposta_id = $1', [proposta.id])).rows;
    const laudos = (await pool.query(`SELECT * FROM laudos_projetos WHERE propostas IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_each_text(propostas) WHERE value = $1::text)`, [proposta.id])).rows;
    const nome = `Orçamento ${proposta.numero}.pdf`;
    for (const a of analises) await P.gravarArquivo(await pastaDoProjeto(a), nome, pdf);
    for (const l of laudos) await P.gravarArquivo(await pastaDoLaudo(l), nome, pdf);
    let naObra = 0;
    if (proposta.obra_id) {
      const dir = await pastaDaObraPorId(proposta.obra_id);
      if (dir) { await P.gravarArquivo(path.join(dir, 'Propostas'), nome, pdf); naObra = 1; }
    }
    return analises.length + laudos.length + naObra;
  });
}

// Contrato ligado a uma obra: cópia do PDF em Obras\<obra>\Contratos.
function salvarPdfContratoNaObra(contrato, pdf) {
  if (!contrato?.obra_id) return Promise.resolve(null);
  return seguro(`contrato ${contrato.id}`, async () => {
    const dir = await pastaDaObraPorId(contrato.obra_id);
    if (!dir) return null;
    return P.gravarArquivo(path.join(dir, 'Contratos'), `Contrato ${contrato.codigo_registro || contrato.id}.pdf`, pdf);
  });
}

async function resumoPasta(pastaAbs) {
  return { caminho: pastaAbs, arquivos: pastaAbs ? await P.listarArquivos(pastaAbs) : [] };
}

// Só abre o Explorer quando o pedido vem deste PC (quem usa o sistema por
// outro computador não veria a janela abrir no servidor).
// Usa o endereço da conexão, nunca req.ip: com `trust proxy` ligado, req.ip
// vem do cabeçalho X-Forwarded-For, que qualquer um pode forjar.
// Pedido que passou por um proxy/túnel no próprio PC (para o link de aprovação
// na internet) chega de 127.0.0.1 mas não é local: o cabeçalho de
// encaminhamento denuncia — nesse caso não conta como local.
function pedidoLocal(req) {
  const ip = String(req.socket?.remoteAddress || '');
  if (req.headers?.['x-forwarded-for'] || req.headers?.forwarded || req.headers?.['x-real-ip']) return false;
  return /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ip);
}

module.exports = {
  pastaDoProjeto, pastaDoLaudo, pastaDaObra, pastaDaObraPorId, caminhoRegistrado, excluirPastaDoItem, nomeCurtoDisciplina,
  sincronizarProjeto, sincronizarLaudo, sincronizarObra, salvarPdfPropostaNasPastas, salvarPdfContratoNaObra,
  resumoPasta, pedidoLocal, seguro,
};
