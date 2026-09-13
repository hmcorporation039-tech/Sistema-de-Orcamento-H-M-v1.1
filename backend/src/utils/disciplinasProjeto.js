// Taxonomia fixa de disciplinas de um projeto de engenharia elétrica/baixa
// tensão — usada pra restringir a Análise de Projeto (Compatibilização) só
// ao que o usuário selecionou (ex.: um projeto que só tem CFTV não precisa
// vir com itens de Iluminação/Automação). Lista pequena e estável, por isso
// fixa em código (não é um cadastro livre como materiais.categoria) — o
// frontend replica a mesma lista de chaves/nomes.
const DISCIPLINAS = [
  { chave: 'eletrica', nome: 'Elétrica (infraestrutura)' },
  { chave: 'rede', nome: 'Redes de Computadores (dados)' },
  { chave: 'cabeamento', nome: 'Infraestrutura de Cabeamento Estruturado' },
  { chave: 'telefonia', nome: 'Telefonia' },
  { chave: 'cftv', nome: 'CFTV' },
  { chave: 'iluminacao', nome: 'Iluminação' },
  { chave: 'automacao', nome: 'Automação' },
  { chave: 'alarme', nome: 'Alarme' },
  { chave: 'antena', nome: 'Antena/TV' },
];

const CHAVES_VALIDAS = new Set(DISCIPLINAS.map(d => d.chave));

// Valida a lista de disciplinas vinda do frontend (form-data, chega como
// string JSON) — descarta silenciosamente chaves desconhecidas em vez de
// dar erro, pra não travar a análise por um valor inesperado.
function normalizarDisciplinas(valor) {
  let lista = valor;
  if (typeof valor === 'string') {
    try {
      lista = JSON.parse(valor);
    } catch {
      lista = [];
    }
  }
  if (!Array.isArray(lista)) return [];
  return [...new Set(lista.filter(c => CHAVES_VALIDAS.has(c)))];
}

function nomeDaDisciplina(chave) {
  return DISCIPLINAS.find(d => d.chave === chave)?.nome || chave;
}

module.exports = { DISCIPLINAS, normalizarDisciplinas, nomeDaDisciplina };
