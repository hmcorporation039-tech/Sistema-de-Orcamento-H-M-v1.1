import Hub from './Hub';
import Materiais from '../Materiais';
import PrecosMaoDeObra from '../PrecosMaoDeObra';

// Grupo "Base de preços": catálogo de materiais e a tabela de referência de
// preços de mão de obra (só admin — a API também exige admin).
//   /base-precos?aba=materiais | /base-precos?aba=mao-de-obra
const ABAS = [
  { chave: 'materiais', rotulo: 'Materiais', render: () => <Materiais /> },
  { chave: 'mao-de-obra', rotulo: 'Mão de obra', admin: true, render: () => <PrecosMaoDeObra /> },
];

export default function BasePrecosHub() {
  return <Hub grupo="Base de preços" base="/base-precos" abas={ABAS} />;
}
