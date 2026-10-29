import Hub from './Hub';
import Materiais from '../Materiais';
import PrecosMaoDeObra from '../PrecosMaoDeObra';
import Composicoes from '../Composicoes';
import ComponentesQuadro from '../ComponentesQuadro';

// Grupo "Base de preços": catálogo de materiais, a tabela de referência de
// preços de mão de obra (só admin — a API também exige admin) e as
// composições/kits (versão 2.0, Fase 3H: todos veem; só o admin edita) e o
// catálogo de componentes de quadros com as medidas oficiais por fabricante
// (2.4: todos veem e buscam a medida pela IA; só o admin cadastra e aprova).
//   /base-precos?aba=materiais | mao-de-obra | composicoes | componentes-quadro
const ABAS = [
  { chave: 'materiais', rotulo: 'Materiais', render: () => <Materiais /> },
  { chave: 'mao-de-obra', rotulo: 'Mão de obra', admin: true, render: () => <PrecosMaoDeObra /> },
  { chave: 'composicoes', rotulo: 'Composições e kits', render: () => <Composicoes /> },
  { chave: 'componentes-quadro', rotulo: 'Componentes de quadros', render: () => <ComponentesQuadro /> },
];

export default function BasePrecosHub() {
  return <Hub grupo="Base de preços" base="/base-precos" abas={ABAS} />;
}
