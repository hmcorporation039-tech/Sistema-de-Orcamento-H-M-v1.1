// Molde de disciplina: monta o contrato usado pelo sistema (ver
// skills/spda/scripts/lib/index.js) a partir da configuração de cada skill.
//
// cfg = {
//   chave, nome, modelo, exemplo, checklistBase, formulario,
//   processar(dados) → res,                  // cálculos + inspeção
//   resumir(res) → { indicadores[], tabelas[], textos[], documentos[] },
//   documentos: [{ tipo, rotulo, formato: 'Word'|'Excel', nome, gerar: async (res) → Buffer, exige?(res) → bool }],
//   modosOrcamento: [{ modo, rotulo, descricao }],
//   montarOrcamento(res, modo) → { cliente_nome, escopo, observacoes, itens[] },
// }

const { MIME_DOCX, MIME_XLSX, nomeArquivo } = require('./documentos');

const clonar = (o) => JSON.parse(JSON.stringify(o));

function criarDisciplina(cfg) {
  const documentos = cfg.documentos.map(({ tipo, rotulo, formato }) => ({ tipo, rotulo, formato }));

  function tiposDisponiveis(res) {
    return cfg.documentos.filter(d => !d.exige || d.exige(res)).map(d => d.tipo);
  }

  async function gerarDocumento(res, tipo) {
    const d = cfg.documentos.find(x => x.tipo === tipo);
    if (!d) throw new Error(`Documento desconhecido: ${tipo}`);
    if (d.exige && !d.exige(res)) throw new Error(d.motivo || 'Preencha os dados necessários para gerar este documento.');
    const buffer = await d.gerar(res);
    const ext = d.formato === 'Excel' ? 'xlsx' : 'docx';
    return { buffer, nomeArquivo: nomeArquivo(res.dados, d.nome, ext, d.formato !== 'Excel'), mime: ext === 'xlsx' ? MIME_XLSX : MIME_DOCX };
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
