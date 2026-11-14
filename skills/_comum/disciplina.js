// Molde de disciplina: monta o contrato usado pelo sistema (ver
// skills/spda/scripts/lib/index.js) a partir da configuração de cada skill.
//
// cfg = {
//   chave, nome, modelo, exemplo, checklistBase, formulario,
//   processar(dados) → res,                  // cálculos + inspeção
//   resumir(res) → { indicadores[], tabelas[], textos[], documentos[] },
//   documentos: [{ tipo, rotulo, formato: 'Word'|'Excel'|'PDF'|'DXF'|'HTML'|'Markdown'|'Texto', nome,
//                  ext?, mime?, gerar: async (res) → Buffer, exige?(res) → bool, motivo? }],
//   modosOrcamento: [{ modo, rotulo, descricao }],
//   montarOrcamento(res, modo) → { cliente_nome, escopo, observacoes, itens[] },
// }
// Extensão e tipo MIME saem do formato (ou de ext/mime do documento). Antes o molde só conhecia Word e
// Excel, e sete skills remendavam gerarDocumento para o caderno de fabricação em PDF (e os quadros para
// DXF, HTML, PDF e Markdown) — 14/11/2026: o molde gera todos.

const { MIME_DOCX, MIME_XLSX, nomeArquivo } = require('./documentos');

const clonar = (o) => JSON.parse(JSON.stringify(o));

// ── Projeto pela especificação nas skills (14/11/2026) ──────────────────────
// Um laudo gerado pela especificação do cliente por um perfil de SKILL (incêndio, média tensão, automação,
// quadro predial — skills/_comum/especificacao/solucaoSkill.js) guarda os requisitos lidos em
// dados.especificacao. Todas as skills ganham, então, a pesquisa de preços no formato da H&M e o texto de
// entrega, refeitos do que está gravado (sem IA). Carregados só quando usados.
function perfilSkillDe(res) {
  const esp = res && res.dados && res.dados.especificacao;
  if (!esp || !esp.lidos || !esp.perfil) return null;
  try {
    const PF = require('./especificacao/perfis').perfilDe(esp.perfil);
    return PF.tipo_solucao === 'skill' ? PF : null;
  } catch (e) { return null; }
}
function projetoDaEspecificacaoSkill(res) {
  const P = require('./especificacao/perfis');
  return require('./especificacao/solucaoSkill').projetoDoRegistro(res, P.perfilDe);
}
async function precosDaEspecificacao(res) {
  const PL = require('./especificacao/planilhaPrecos');
  const esp = res.dados.especificacao;
  return PL.gerarPlanilhaPrecos(projetoDaEspecificacaoSkill(res), esp.precos || {}, { contingencia: esp.contingencia ?? 0.1 });
}
const DOCS_ESPECIFICACAO = [
  { tipo: 'precos_especificacao', rotulo: 'Pesquisa de preços do material (projeto pela especificação)', formato: 'Excel', nome: 'Pesquisa de Precos do Material',
    exige: (res) => !!perfilSkillDe(res), motivo: 'Este projeto não foi gerado de uma especificação.', gerar: async (res) => (await precosDaEspecificacao(res)).buffer },
  { tipo: 'entrega_especificacao', rotulo: 'Texto de entrega (projeto pela especificação)', formato: 'Texto', ext: 'md', nome: 'Texto de Entrega',
    exige: (res) => !!perfilSkillDe(res), motivo: 'Este projeto não foi gerado de uma especificação.',
    gerar: async (res) => {
      const pr = await precosDaEspecificacao(res);
      return Buffer.from(require('./especificacao/documentos').textoEntregaSkill(projetoDaEspecificacaoSkill(res), pr.resumo), 'utf8');
    } },
];
const MIME_MD = 'text/markdown; charset=utf-8';
// formato do documento → extensão; extensão → tipo MIME
const EXT_DO_FORMATO = { Word: 'docx', Excel: 'xlsx', PDF: 'pdf', DXF: 'dxf', HTML: 'html', Markdown: 'md' };
const MIME_DA_EXT = { docx: MIME_DOCX, xlsx: MIME_XLSX, md: MIME_MD, pdf: 'application/pdf', dxf: 'application/dxf', html: 'text/html; charset=utf-8' };

function criarDisciplina(cfg) {
  cfg = { ...cfg, documentos: [...cfg.documentos, ...DOCS_ESPECIFICACAO.filter(d => !cfg.documentos.some(x => x.tipo === d.tipo))] };
  const documentos = cfg.documentos.map(({ tipo, rotulo, formato }) => ({ tipo, rotulo, formato }));

  function tiposDisponiveis(res) {
    return cfg.documentos.filter(d => !d.exige || d.exige(res)).map(d => d.tipo);
  }

  async function gerarDocumento(res, tipo) {
    const d = cfg.documentos.find(x => x.tipo === tipo);
    if (!d) throw new Error(`Documento desconhecido: ${tipo}`);
    if (d.exige && !d.exige(res)) throw new Error(d.motivo || 'Preencha os dados necessários para gerar este documento.');
    const buffer = await d.gerar(res);
    const ext = d.ext || EXT_DO_FORMATO[d.formato] || 'docx';
    const mime = d.mime || MIME_DA_EXT[ext] || MIME_DOCX;
    return { buffer, nomeArquivo: nomeArquivo(res.dados, d.nome, ext, d.formato !== 'Excel'), mime };
  }

  function resumir(res) {
    return { ...cfg.resumir(res), documentos: tiposDisponiveis(res) };
  }

  return {
    chave: cfg.chave,
    nome: cfg.nome,
    documentos,
    modosOrcamento: cfg.modosOrcamento,
    formulario: cfg.formulario,
    modeloVazio: () => clonar(cfg.modelo),
    exemplo: () => clonar(cfg.exemplo),
    checklistBase: cfg.checklistBase,
    processar: cfg.processar,
    resumir,
    tiposDisponiveis,
    gerarDocumento,
    montarOrcamento: cfg.montarOrcamento,
  };
}

module.exports = { criarDisciplina };
