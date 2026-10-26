const path = require('path');
const pool = require('../config/database');
const P = require('../utils/pastasSistema');

// Liga cada análise de projeto e cada laudo à sua pasta no disco
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
// Falha de disco (pasta aberta, rede fora) NUNCA impede salvar no sistema: só
// gera aviso no log; a próxima gravação tenta de novo.

const nomeDoProjeto = (row) => row.nome_projeto || row.cliente_nome
  || (Array.isArray(row.arquivos_analisados) && row.arquivos_analisados[0] && String(row.arquivos_analisados[0].nomeArquivo || row.arquivos_analisados[0].arquivo || '').replace(/\.[^.]+$/, ''))
  || `Projeto ${row.id}`;

async function pastaDoProjeto(row, client = pool) {
  return P.sincronizarPasta(client, { tipo: 'projeto', tabela: 'analises_projeto', id: row.id, nome: nomeDoProjeto(row), pastaAtual: row.pasta });
}

async function pastaDoLaudo(row, client = pool) {
  return P.sincronizarPasta(client, { tipo: 'laudo', tabela: 'laudos_projetos', id: row.id, nome: row.titulo || `Laudo ${row.id}`, pastaAtual: row.pasta });
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

// Proposta gerada a partir de análise ou laudo: a cada PDF gerado, a cópia na
// pasta do projeto/laudo é substituída pela versão atual.
function salvarPdfPropostaNasPastas(proposta, pdf) {
  return seguro(`proposta ${proposta.id}`, async () => {
    const analises = (await pool.query('SELECT * FROM analises_projeto WHERE proposta_id = $1', [proposta.id])).rows;
    const laudos = (await pool.query(`SELECT * FROM laudos_projetos WHERE propostas IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_each_text(propostas) WHERE value = $1::text)`, [proposta.id])).rows;
    const nome = `Orçamento ${proposta.numero}.pdf`;
    for (const a of analises) await P.gravarArquivo(await pastaDoProjeto(a), nome, pdf);
    for (const l of laudos) await P.gravarArquivo(await pastaDoLaudo(l), nome, pdf);
    return analises.length + laudos.length;
  });
}

async function resumoPasta(pastaAbs) {
  return { caminho: pastaAbs, arquivos: pastaAbs ? await P.listarArquivos(pastaAbs) : [] };
}

// Só abre o Explorer quando o pedido vem deste PC (quem usa o sistema por
// outro computador não veria a janela abrir no servidor).
// Usa o endereço da conexão, nunca req.ip: com `trust proxy` ligado, req.ip
// vem do cabeçalho X-Forwarded-For, que qualquer um pode forjar.
function pedidoLocal(req) {
  const ip = String(req.socket?.remoteAddress || '');
  return /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ip);
}

module.exports = { pastaDoProjeto, pastaDoLaudo, sincronizarProjeto, sincronizarLaudo, salvarPdfPropostaNasPastas, resumoPasta, pedidoLocal, seguro };
