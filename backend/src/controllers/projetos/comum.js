// Análise de Projeto — o que as rotas de controllers/projetos/ usam em comum:
// conferir se o arquivo é mesmo DWG/DXF, o nome do arquivo em UTF-8 e a
// conversão da linha de analises_projeto para o formato da tela/relatório.
const P = require('../../services/pastasSistema');
const path = require('path');

// DWG começa pela versão (AC10xx); DXF de texto, por "0 SECTION"
const ehConteudoCad = (buf) => /^AC10\d\d$/.test(buf.subarray(0, 6).toString('latin1')) || /^\s*0\s*\r?\n\s*SECTION/.test(buf.subarray(0, 200).toString('latin1'));
// o leitor do multipart entrega o nome em latin1 ("ElÃ©trica"); só converte se virar UTF-8 válido
const nomeUtf8 = (n) => { const u = Buffer.from(String(n), 'latin1').toString('utf8'); return u.includes('\uFFFD') ? n : u; };

// 2.3: obra/análise na pasta do cliente (pasta_base, relativa à raiz dos clientes no servidor)
const naRaizDosClientes = (...partes) => path.join(P.RAIZ_CLIENTES_SERVIDOR, ...partes.flatMap(p => String(p).split('/')).filter(Boolean));
function caminhoDaPasta(row) {
  if (!row.pasta) return null;
  if (row.pasta_obra_id) {
    if (!row.pasta_obra_dir) return null;
    return row.pasta_obra_base ? naRaizDosClientes(row.pasta_obra_base, row.pasta_obra_dir, row.pasta) : path.join(P.RAIZES.obra, row.pasta_obra_dir, row.pasta);
  }
  return row.pasta_base ? naRaizDosClientes(row.pasta_base, row.pasta) : P.caminhoDe('projeto', row.pasta);
}

// Converte uma linha de analises_projeto (colunas snake_case, JSONB já
// parseado pelo driver do pg) para o mesmo formato camelCase que o restante
// do pipeline (analisarProjetoCompleto, o template do relatório e o
// frontend) já usa.
function linhaParaAnalise(row) {
  return {
    id: row.id,
    cliente: row.cliente_nome,
    // Nome do projeto = nome da pasta em "Arquivos do Sistema/Projetos" (editável na tela)
    nomeProjeto: row.nome_projeto,
    finalidade: row.finalidade || 'orcamento',
    caminhoPasta: caminhoDaPasta(row),
    // Obra (2.0): obraId + obra { id, codigo, nome, status } quando a consulta faz o JOIN
    obraId: row.obra_id ?? null,
    obra: row.obra ?? null,
    clienteId: row.cliente_id,
    disciplinas: row.disciplinas,
    arquivosAnalisados: row.arquivos_analisados,
    ambientes: row.ambientes,
    pontosPorAmbiente: row.pontos_por_ambiente,
    // Enriquecimento do Claude Desktop (visão do PDF) — só das disciplinas escolhidas.
    funcionamento: row.funcionamento,
    pontosPorDisciplina: row.pontos_por_disciplina,
    cameras: row.cameras,
    pontosRedeAntena: row.pontos_rede_antena,
    tabelaCabos: row.tabela_cabos,
    achados: row.achados,
    servicos: row.servicos,
    materiais: row.materiais,
    // Por arquivo: carimbo, quadros de carga, listas de materiais, disciplinas detectadas
    dadosExtraidos: row.dados_extraidos,
    // 2.3: compatibilização por posição entre os DWG/DXF (utils/compatibilidadeEspacial.js)
    conflitos: row.conflitos || [],
    compatibilizacao: row.compatibilizacao || null,
    // Proposta gerada a partir desta análise (botão "Gerar Orçamento"), se
    // já existir — o número só vem quando a consulta faz o LEFT JOIN com
    // propostas (buscarUma); nas demais fica undefined, sem problema.
    propostaId: row.proposta_id,
    propostaNumero: row.proposta_numero,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    versao: row.versao,
  };
}

module.exports = { ehConteudoCad, nomeUtf8, linhaParaAnalise };
