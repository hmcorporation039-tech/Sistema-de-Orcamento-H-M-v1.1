// Identificador provisório de linha/seção ainda não salva ('tmp_<hora>_<n>'):
// o servidor troca pelo id definitivo ao gravar. Um contador só para o editor
// de orçamento e a análise de projeto (antes cada um tinha a sua cópia).
let contador = 0;
export const gerarId = () => `tmp_${Date.now()}_${contador++}`;
