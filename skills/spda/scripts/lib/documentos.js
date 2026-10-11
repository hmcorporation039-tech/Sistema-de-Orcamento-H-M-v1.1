// Gera um documento da skill em memória — usado pelo comando
// scripts/gerar-documentos.js e pela tela Laudos de SPDA do sistema.

const { Packer } = require('docx');
const { gerarLaudo } = require('./doc-laudo');
const { gerarMemorial } = require('./doc-memorial');
const { gerarRelatorioRisco } = require('./doc-risco');
const { gerarChecklistCampo } = require('./doc-checklist');
const { gerarPlanilhaMedicoes, gerarPlanilhaMateriaisRisco } = require('./planilhas');

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const TIPOS = {
  laudo: { nome: 'Laudo_SPDA', ext: 'docx', gerar: gerarLaudo },
  memorial: { nome: 'Memorial_SPDA', ext: 'docx', gerar: gerarMemorial, exige: 'dim' },
  risco: { nome: 'Relatorio_Risco_NBR5419-2', ext: 'docx', gerar: gerarRelatorioRisco, exige: 'risco' },
  checklist: { nome: 'Checklist_Campo_SPDA', ext: 'docx', gerar: gerarChecklistCampo },
  medicoes: { nome: 'Medicoes_SPDA', ext: 'xlsx', planilha: gerarPlanilhaMedicoes, semRevisao: true },
  materiais: { nome: 'Materiais_e_Risco', ext: 'xlsx', planilha: gerarPlanilhaMateriaisRisco, semRevisao: true },
};

function prefixoArquivo(dados) {
  const base = dados.meta?.prefixo || dados.obra?.nome || dados.cliente?.nome || 'Obra';
  return base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40).replace(/^_+|_+$/g, '') || 'Obra';
}

function nomeArquivo(dados, tipo) {
  const t = TIPOS[tipo];
  const rev = String(dados.meta?.revisao || 'R00').split(' ')[0].replace(/[^A-Za-z0-9]/g, '') || 'R00';
  return `${prefixoArquivo(dados)}_${t.nome}${t.semRevisao ? '' : `_${rev}`}.${t.ext}`;
}

// Documentos que fazem sentido para estes dados (o memorial exige o NP do
// SPDA; o relatório de risco exige zonas de estudo).
function tiposDisponiveis(res) {
  return Object.keys(TIPOS).filter(tipo => {
    const t = TIPOS[tipo];
    if (t.exige === 'dim') return !!res.dim;
    if (t.exige === 'risco') return !!res.risco;
    if (tipo === 'materiais') return !!(res.dim || res.risco);
    return true;
  });
}

async function gerarDocumento(res, tipo) {
  const t = TIPOS[tipo];
  if (!t) throw new Error(`Documento desconhecido: ${tipo}`);
  if (!tiposDisponiveis(res).includes(tipo)) {
    throw new Error(t.exige === 'risco' ? 'Cadastre as zonas de estudo para gerar o relatório de risco.' : 'Informe o nível de proteção do SPDA (I a IV) para gerar este documento.');
  }
  const buffer = t.planilha ? await t.planilha(res, null) : await Packer.toBuffer(t.gerar(res));
  return { buffer, nomeArquivo: nomeArquivo(res.dados, tipo), mime: t.ext === 'docx' ? MIME_DOCX : MIME_XLSX };
}

module.exports = { gerarDocumento, tiposDisponiveis, nomeArquivo, prefixoArquivo, TIPOS };
