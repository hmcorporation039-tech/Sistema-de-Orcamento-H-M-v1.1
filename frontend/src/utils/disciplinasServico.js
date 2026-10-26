// Nomes das disciplinas da base única de serviços de mão de obra (backend:
// utils/precosMaoDeObraReferencia.js e utils/servicosBase.js). Só exibição —
// a chave que vale é o código de cada serviço. Usado pela tela Preços de Mão
// de Obra e pela lista suspensa de serviços do Orçamento.
export const NOMES_DISCIPLINA = {
  eletrica: 'Elétrica (infraestrutura)',
  rede: 'Redes de Computadores (dados)',
  cabeamento: 'Infra. de Cabeamento Estruturado',
  telefonia: 'Telefonia e interfonia',
  cftv: 'CFTV',
  iluminacao: 'Iluminação',
  automacao: 'Automação',
  alarme: 'Alarme',
  antena: 'Antena coletiva / TV',
  spda: 'SPDA (para-raios) — Laudos e projetos',
  carregador: 'Recarga de veículo elétrico — Laudos e projetos',
  incendio: 'Incêndio (detecção, alarme e iluminação de emergência)',
  solar: 'Usina solar fotovoltaica',
  controle_acesso: 'Controle de acesso',
  eletrica_hospitalar: 'Elétrica hospitalar',
  eletrica_industrial: 'Elétrica industrial',
  media_tensao: 'Média tensão / subestação',
  outros: 'Outros serviços',
};

export const nomeDisciplina = (d) => NOMES_DISCIPLINA[d || 'outros'] || d;

// Rótulos dos dois segmentos de referência de mercado
export const ROTULO_SEGMENTO = { publico: 'oficial / governo', privado: 'particular' };
