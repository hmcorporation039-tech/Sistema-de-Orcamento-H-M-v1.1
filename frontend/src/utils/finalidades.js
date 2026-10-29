// Finalidade da análise de projeto (2.1) — um lugar só (antes: FINALIDADES no
// envio, rotuloFinalidade na tela de análise e FINALIDADE na obra).
// Ordem de exibição dos cartões do envio; listas suspensas (Select.js) ordenam A–Z sozinhas.
export const FINALIDADES = [
  { valor: 'orcamento', rotulo: 'Orçamento', descricao: 'Orçar a partir do projeto recebido: itens extraídos dos arquivos e "Gerar orçamento e abrir no editor".' },
  { valor: 'elaboracao', rotulo: 'Elaboração de projeto', descricao: 'A H&M vai DEFINIR e ENTREGAR o projeto a partir do arquitetônico recebido: projeto por disciplina com definições técnicas, as-built, DXF, QElectroTech e PDF.' },
];

export const rotuloFinalidade = (valor) => FINALIDADES.find(f => f.valor === valor)?.rotulo || 'Orçamento';
export const corFinalidade = (valor) => (valor === 'elaboracao' ? '#8ab4f8' : '#c9a227');
