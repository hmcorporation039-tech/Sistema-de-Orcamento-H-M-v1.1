// Identificador provisório de linha/seção ainda não salva ('tmp_<hora>_<n>'):
// o servidor troca pelo id definitivo ao gravar. Um contador só para o editor
// de orçamento, a análise de projeto e a inserção de composições (antes cada um
// tinha a sua cópia). `prefixo` marca a origem — 'tmp_kit' nos itens que vieram
// de uma composição (InserirComposicao) —; sem prefixo, 'tmp'.
let contador = 0;
export const gerarId = (prefixo = 'tmp') => `${prefixo}_${Date.now()}_${contador++}`;
