import Hub from './Hub';
import Materiais from '../Materiais';
import PrecosMaoDeObra from '../PrecosMaoDeObra';
import Composicoes from '../Composicoes';

// Grupo "Base de preços": catálogo de materiais, a tabela de referência de
// preços de mão de obra (só admin — a API também exige admin) e as
// composições/kits (versão 2.0, Fase 3H: todos veem; só o admin edita).
//   /base-precos?aba=materiais | /base-precos?aba=mao-de-obra | /base-precos?aba=composicoes
const ABAS = [
  { chave: 'materiais', rotulo: 'Materiais', render: () => <Materiais /> },
  { chave: 'mao-de-obra', rotulo: 'Mão de obra', admin: true, render: () => <PrecosMaoDeObra /> },
  { chave: 'composicoes', rotulo: 'Composições e kits', render: () => <Composicoes /> },
];

export default function BasePrecosHub() {
  return <Hub grupo="Base de preços" base="/base-precos" abas={ABAS} />;
}
