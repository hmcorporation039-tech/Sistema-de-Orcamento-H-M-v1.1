// Itens e escopo do orçamento de SPDA — usados pelo comando scripts/orcamento.js
// (Claude Code / MCP) e pela tela Laudos de SPDA do sistema (backend).
// Os itens saem sem preço ("a_cotar"): preço vem do catálogo ou de pesquisa.

const SECAO_MATERIAIS = 'Materiais e Equipamentos';
const SECAO_SERVICOS = 'Serviços (Mão de Obra)';

function itensExecucao(res) {
  const { dim } = res;
  if (!dim) throw new Error('Para orçar a execução, informe o nível de proteção do SPDA (I a IV).');
  const itens = dim.materiais
    .filter(m => m.quantidade > 0)
    .map(m => ({ secao: SECAO_MATERIAIS, subgrupo: 'SPDA', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade }));
  // `codigo` = chave na tabela de preços de referência de mão de obra do sistema
  const s = (codigo, descricao, quantidade, unidade) => ({ secao: SECAO_SERVICOS, subgrupo: 'SPDA', codigo, descricao, quantidade, unidade });
  itens.push(
    s('spda_malha', 'Instalação da malha de captação (condutor, suportes e conexões)', Math.round(dim.captacao.comprimento_m), 'm'),
    dim.descidas.naturais
      ? s('spda_descida_natural', 'Conexão da captação às armaduras dos pilares (descidas naturais) e terminal de ensaio', dim.descidas.quantidade, 'un')
      : s('spda_descida', 'Instalação de descidas não naturais com fixadores e terminal de ensaio', Math.round(dim.descidas.comprimento_m), 'm'),
    s('spda_anel', 'Execução do anel de aterramento (abertura e fechamento de vala, lançamento e conexões)', Math.round(dim.aterramento.anel_m), 'm'),
    s('spda_hastes_caixas', 'Cravação de hastes e instalação de caixas de inspeção', dim.aterramento.hastes, 'un'),
    s('spda_bep', 'Instalação do BEP e ligações equipotenciais (instalações metálicas, linhas que entram)', 1, 'vb'),
  );
  const dps = dim.materiais.filter(m => m.codigo.startsWith('DPS')).length;
  if (dps) itens.push(s('spda_dps', 'Instalação de DPS (classe I nas entradas e coordenados nos quadros)', dps, 'un'));
  itens.push(
    s('spda_projeto', 'Projeto executivo de SPDA (NBR 5419:2026) com análise de risco e ART', 1, 'vb'),
    s('spda_inspecao_pos', 'Inspeção pós-instalação com ensaios de continuidade (Anexo F) e laudo com ART', 1, 'vb'),
  );
  return itens;
}

function itensInspecao(res) {
  const s = (codigo, descricao, quantidade = 1, unidade = 'vb', subgrupo = 'Laudo SPDA') => ({ secao: SECAO_SERVICOS, subgrupo, codigo, descricao, quantidade, unidade });
  const itens = [
    s('spda_inspecao', 'Inspeção do SPDA (NBR 5419-3:2026, Seção 7) — documental, visual e dimensional'),
    s('spda_ensaio_continuidade', `Ensaios de continuidade elétrica (Anexo F) — ${res.ensaios.length || 'conforme plano de ensaios'} pontos`, res.ensaios.length || 1, res.ensaios.length ? 'pt' : 'vb'),
  ];
  if (res.risco) itens.push(s('spda_analise_risco', 'Análise de risco (NBR 5419-2:2026) com relatório'));
  itens.push(s('spda_laudo', 'Laudo técnico de inspeção com registro fotográfico e ART'));
  for (const nc of res.ncs) {
    itens.push({ secao: SECAO_SERVICOS, subgrupo: 'Correção de não conformidades', descricao: `${nc.id} (${nc.item}) — ${nc.recomendacao}`, quantidade: 1, unidade: 'vb' });
  }
  return itens;
}

function textoEscopo(res, modo) {
  const { dados, dim, risco } = res;
  const obra = dados.obra?.nome || dados.cliente?.nome || 'a estrutura';
  const est = dados.estrutura || {};
  const m = (v) => Number(v).toLocaleString('pt-BR');
  if (modo === 'execucao') {
    return `Fornecimento e instalação do Sistema de Proteção contra Descargas Atmosféricas (SPDA) de ${obra}, ` +
      `nível de proteção ${dim.np} conforme ABNT NBR 5419:2026: captação em malha (módulos ${dim.captacao.modulo_m.map(v => v.toFixed(1).replace('.', ',')).join(' × ')} m), ` +
      `${dim.descidas.quantidade} descidas ${dim.descidas.naturais ? 'naturais pelas armaduras' : 'não naturais'}, anel de aterramento de ${Math.round(dim.aterramento.anel_m)} m, ` +
      'equipotencialização e DPS, com projeto executivo, ART e laudo de inspeção pós-instalação com ensaios de continuidade.';
  }
  return `Inspeção do SPDA de ${obra} (${m(est.L)} × ${m(est.W)} × ${m(est.H)} m) conforme a Seção 7 da ABNT NBR 5419-3:2026, ` +
    `com ensaios de continuidade elétrica (Anexo F)${risco ? ', análise de risco pela NBR 5419-2:2026' : ''} e emissão de laudo técnico com registro fotográfico e ART.` +
    (res.ncs.length ? ` Inclui a correção das ${res.ncs.length} não conformidades apontadas (itens a cotar).` : '');
}

function montarOrcamento(res, modo) {
  if (!['execucao', 'inspecao'].includes(modo)) throw new Error('Modo de orçamento deve ser "execucao" ou "inspecao".');
  return {
    cliente_nome: res.dados.cliente?.nome || '',
    escopo: textoEscopo(res, modo),
    observacoes: 'Rascunho gerado pela skill de SPDA — conferir quantidades e preços antes de enviar ao cliente.',
    itens: modo === 'execucao' ? itensExecucao(res) : itensInspecao(res),
  };
}

module.exports = { montarOrcamento, SECAO_MATERIAIS, SECAO_SERVICOS };
