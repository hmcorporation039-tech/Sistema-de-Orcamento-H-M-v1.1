import Hub from './Hub';
import Historico from '../Historico';
import Orcamento from '../Orcamento';

// Grupo "Propostas": a lista (antigo Histórico, já com o resumo/exportação do
// antigo Relatórios) e o formulário de orçamento.
//
// Rotas:
//   /propostas  ou  /propostas?aba=lista   → lista de propostas
//   /propostas?aba=editar                  → nova proposta
//   /propostas/editar/:id                  → editar a proposta :id
// O Orcamento lê o id com useParams, por isso a edição usa o caminho e não o
// ?aba= (a rota passa abaFixa="editar").
const ABAS = [
  { chave: 'lista', rotulo: 'Propostas', render: () => <Historico /> },
  { chave: 'editar', rotulo: 'Nova / editar', render: () => <Orcamento /> },
];

export default function PropostasHub({ abaFixa }) {
  return <Hub grupo="Propostas" base="/propostas" abas={ABAS} abaFixa={abaFixa} />;
}
