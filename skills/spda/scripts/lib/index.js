// Ponto de entrada da skill para o Sistema de Orçamentos (aba Análise de
// Projeto → Laudos e projetos). TODA disciplina expõe este mesmo contrato:
//
//   chave, nome, documentos[], modosOrcamento[], modeloVazio(), exemplo(),
//   checklistBase, processar(dados), resumir(res), tiposDisponiveis(res),
//   gerarDocumento(res, tipo) → { buffer, nomeArquivo, mime },
//   montarOrcamento(res, modo) → { cliente_nome, escopo, observacoes, itens[] }
//
// Os itens de orçamento usam `secao` "Materiais e Equipamentos" ou
// "Serviços (Mão de Obra)"; serviços podem trazer `codigo` da tabela de preços
// de referência de mão de obra do sistema.

const { processar } = require('./processar');
const { gerarDocumento, tiposDisponiveis } = require('./documentos');
const { montarOrcamento } = require('./orcamento');
const { rotuloNp } = require('./dimensionamento');
const { ROTULO_NP_SPDA } = require('./doc-risco');
const CHECKLIST_BASE = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-hospital.json');

const clonar = (o) => JSON.parse(JSON.stringify(o));

const DOCUMENTOS = [
  { tipo: 'laudo', rotulo: 'Laudo de inspeção', formato: 'Word' },
  { tipo: 'memorial', rotulo: 'Memorial descritivo e de cálculo', formato: 'Word' },
  { tipo: 'risco', rotulo: 'Relatório de análise de risco', formato: 'Word' },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word' },
  { tipo: 'medicoes', rotulo: 'Planilha de medições', formato: 'Excel' },
  { tipo: 'materiais', rotulo: 'Planilha de materiais e risco', formato: 'Excel' },
];

const MODOS_ORCAMENTO = [
  { modo: 'inspecao', rotulo: 'Inspeção e laudo', descricao: 'Serviços de inspeção, ensaios, análise de risco, laudo e correção das não conformidades' },
  { modo: 'execucao', rotulo: 'Execução do SPDA', descricao: 'Materiais do dimensionamento (com preço do catálogo) e mão de obra de instalação' },
];

// Resumo enxuto para a tela (sem os objetos internos do cálculo)
function resumir(res) {
  const r = res.risco;
  const d = res.dim;
  return {
    risco: r && {
      ng: r.atual.eventos.ng,
      ngFonte: r.atual.eventos.ngFonte,
      ND: r.atual.eventos.ND,
      NM: r.atual.eventos.NM,
      R1: r.atual.R1,
      RT: r.atual.RT.R1,
      atendeR1: r.atual.atendeR1,
      atendeF: r.atual.atendeF,
      piorF: r.atual.piorF,
      semProtecao: r.semProtecao.R1,
      zonas: r.atual.zonas.map(z => ({ nome: z.zona.nome, R1: z.R1, F: z.FT == null ? null : z.F, FT: z.FT, comp: z.comp })),
      menorQueAtende: r.menorQueAtende && {
        ...r.menorQueAtende,
        rotulo: `${ROTULO_NP_SPDA[r.menorQueAtende.np_spda] || r.menorQueAtende.np_spda} + DPS ${rotuloNp(r.menorQueAtende.dps_np)}${r.menorQueAtende.fibra ? ' + fibra óptica' : ''}`,
      },
      cenariosQueAtendem: r.cenarios.filter(c => c.atende).length,
    },
    dimensionamento: d && {
      np: d.np,
      perimetro: d.perimetro,
      malha: { divisoes: d.captacao.divisoes, modulo: d.captacao.modulo_m, comprimento: d.captacao.comprimento_m },
      captores: d.captacao.captores_verticais.map(c => ({ id: c.id, raios: c.raio_por_plano })),
      descidas: { quantidade: d.descidas.quantidade, espacamento: d.descidas.espacamento_medio_m, naturais: d.descidas.naturais },
      aterramento: { anel: d.aterramento.anel_m, re: d.aterramento.re_m, l1: d.aterramento.l1_m, atende: d.aterramento.atende_re_l1 },
      distanciaSeguranca: d.distanciaSeguranca.s_ar_m,
      materiais: d.materiais,
    },
    inspecao: {
      parecer: res.parecer,
      ncs: res.ncs.map(n => ({ id: n.id, item: n.item, descricao: n.descricao, prioridade: n.prioridade, prazo: n.prazo })),
      ensaios: res.ensaios.map(e => ({ ponto: e.ponto, tipo: e.tipo_ensaio, resultado: e.resultado, criterio: e.criterio })),
      intervaloAnos: res.intervalo,
    },
    documentos: tiposDisponiveis(res),
  };
}

module.exports = {
  chave: 'spda',
  nome: 'SPDA — para-raios (NBR 5419:2026)',
  documentos: DOCUMENTOS,
  modosOrcamento: MODOS_ORCAMENTO,
  modeloVazio: () => clonar(MODELO),
  exemplo: () => clonar(EXEMPLO),
  checklistBase: CHECKLIST_BASE,
  processar,
  resumir,
  tiposDisponiveis,
  gerarDocumento,
  montarOrcamento,
};
