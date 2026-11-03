// Categorias padrão de material, num lugar só: o cadastro de Materiais (sugestões do campo) e as seções de
// Materiais do orçamento (campo "Categoria", coligado ao catálogo) usam esta lista. São as mesmas que o
// classificador automático usa (backend/src/utils/classificadorMaterial.js); além delas, qualquer categoria já
// usada em algum material também vira sugestão, e dá para digitar uma nova. Antes havia uma cópia em cada tela.
// 'Não classificado' fica de fora: só aparece se algum material ainda aguarda a classificação automática.
export const CATEGORIAS_PADRAO_MATERIAIS = [
  'Alarme', 'Antena coletiva', 'Automação', 'CFTV', 'Controle de acesso', 'Elétrica', 'EPI', 'Ferragens', 'Ferramentas',
  'Informatica', 'Infraestrutura', 'Interfonia', 'Nobreaks', 'Redes / Cabeamento Estruturado', 'Sonorização',
];

// Padrão + as já usadas no catálogo, sem repetir, em ordem alfabética
export function categoriasComUsadas(usadas = []) {
  return Array.from(new Set([...CATEGORIAS_PADRAO_MATERIAIS, ...usadas.filter(Boolean)])).sort((x, y) => x.localeCompare(y, 'pt-BR'));
}
